import {
  InterventionPlan,
  InterventionTiming,
  UserContext,
  TimeRange,
  EmergencySeverity
} from '@devflow/shared-types';
import {
  InterventionScheduler as IInterventionScheduler,
  OptimalTiming,
  ConflictResolution,
  ScheduleAdaptation,
  AvailabilityAnalysis,
  ReceptivityPrediction,
  FrequencyOptimization,
  SchedulingConflict,
  TimeWindow,
  InterventionFrequency,
  SchedulingError
} from '../types';
import { Logger } from 'winston';
import * as cron from 'node-cron';
import moment from 'moment';

export class InterventionScheduler implements IInterventionScheduler {
  private logger: Logger;
  private scheduledInterventions: Map<string, NodeJS.Timeout> = new Map();
  private userAvailabilityCache: Map<string, AvailabilityAnalysis> = new Map();
  private receptivityCache: Map<string, Map<string, ReceptivityPrediction>> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
    this.initializeScheduler();
  }

  private initializeScheduler(): void {
    // Clean up expired cache entries every hour
    cron.schedule('0 * * * *', () => {
      this.cleanupExpiredCache();
    });

    this.logger.info('InterventionScheduler initialized');
  }

  async findOptimalInterventionTime(
    userId: string,
    intervention: InterventionPlan
  ): Promise<OptimalTiming> {
    try {
      this.logger.info(`Finding optimal time for intervention`, { userId, interventionType: intervention.type });

      // Get user availability analysis
      const availability = await this.analyzeUserAvailability(userId);
      
      // Get current user context (would integrate with context engine)
      const userContext = await this.getUserContext(userId);
      
      // Find available time windows
      const availableWindows = this.findAvailableTimeWindows(availability, intervention);
      
      if (availableWindows.length === 0) {
        throw new SchedulingError('No available time windows found', userId);
      }

      // Score each window based on receptivity prediction
      const scoredWindows = await Promise.all(
        availableWindows.map(async (window) => {
          const receptivity = await this.predictInterventionReceptivity(userId, window.start);
          return {
            window,
            score: this.calculateOptimalityScore(window, receptivity, intervention, userContext),
            receptivity
          };
        })
      );

      // Select the best window
      const bestWindow = scoredWindows.reduce((best, current) => 
        current.score > best.score ? current : best
      );

      const optimalTiming: OptimalTiming = {
        recommendedTime: bestWindow.window.start,
        confidence: bestWindow.score,
        reasoning: this.generateTimingReasoning(bestWindow, intervention),
        alternativeTimes: scoredWindows
          .filter(w => w !== bestWindow)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map(w => w.window.start),
        contextFactors: this.extractContextFactors(userContext, bestWindow.receptivity)
      };

      this.logger.info(`Optimal timing found`, { 
        userId, 
        recommendedTime: optimalTiming.recommendedTime,
        confidence: optimalTiming.confidence 
      });

      return optimalTiming;
    } catch (error) {
      this.logger.error(`Error finding optimal intervention time`, { userId, error: error.message });
      throw error;
    }
  }

  async resolveSchedulingConflicts(
    userId: string,
    interventions: InterventionPlan[]
  ): Promise<ConflictResolution> {
    try {
      this.logger.info(`Resolving scheduling conflicts`, { userId, interventionCount: interventions.length });

      // Detect conflicts
      const conflicts = this.detectSchedulingConflicts(interventions);
      
      if (conflicts.length === 0) {
        return {
          conflicts: [],
          resolutions: [],
          finalSchedule: interventions.map(intervention => ({
            interventionId: this.generateInterventionId(),
            intervention,
            scheduledTime: intervention.timing.preferredTime || new Date(),
            priority: this.calculateInterventionPriority(intervention)
          })),
          compromises: []
        };
      }

      // Generate resolution strategies
      const resolutions = await this.generateConflictResolutions(userId, conflicts, interventions);
      
      // Apply resolutions and create final schedule
      const finalSchedule = await this.applyConflictResolutions(userId, interventions, resolutions);
      
      // Identify compromises made
      const compromises = this.identifyScheduleCompromises(interventions, finalSchedule);

      const resolution: ConflictResolution = {
        conflicts,
        resolutions,
        finalSchedule,
        compromises
      };

      this.logger.info(`Scheduling conflicts resolved`, { 
        userId, 
        conflictCount: conflicts.length,
        resolutionCount: resolutions.length 
      });

      return resolution;
    } catch (error) {
      this.logger.error(`Error resolving scheduling conflicts`, { userId, error: error.message });
      throw error;
    }
  }

  async adaptScheduleBasedOnContext(
    userId: string,
    context: UserContext
  ): Promise<ScheduleAdaptation> {
    try {
      this.logger.info(`Adapting schedule based on context`, { userId, context: context.currentActivity });

      const adaptations: ScheduleAdaptation[] = [];

      // Adapt based on current activity
      if (context.currentActivity === 'meeting') {
        adaptations.push({
          adaptationType: 'timing',
          originalValue: 'immediate',
          adaptedValue: 'after_meeting',
          reason: 'User is currently in a meeting',
          confidence: 0.9
        });
      }

      // Adapt based on stress level
      if (context.currentStress && context.currentStress > 80) {
        adaptations.push({
          adaptationType: 'frequency',
          originalValue: 'normal',
          adaptedValue: 'increased',
          reason: 'High stress level detected',
          confidence: 0.85
        });
      }

      // Adapt based on focus level
      if (context.currentFocus && context.currentFocus > 90) {
        adaptations.push({
          adaptationType: 'delivery_method',
          originalValue: 'visual',
          adaptedValue: 'haptic',
          reason: 'High focus state - minimize visual disruption',
          confidence: 0.8
        });
      }

      // Adapt based on time of day
      const hour = new Date().getHours();
      if (hour < 9 || hour > 18) {
        adaptations.push({
          adaptationType: 'content',
          originalValue: 'work_focused',
          adaptedValue: 'personal_wellness',
          reason: 'Outside work hours',
          confidence: 0.75
        });
      }

      // Return the most significant adaptation
      const primaryAdaptation = adaptations.reduce((primary, current) => 
        current.confidence > primary.confidence ? current : primary
      ) || {
        adaptationType: 'timing',
        originalValue: 'default',
        adaptedValue: 'default',
        reason: 'No adaptation needed',
        confidence: 1.0
      };

      this.logger.info(`Schedule adaptation completed`, { 
        userId, 
        adaptationType: primaryAdaptation.adaptationType,
        confidence: primaryAdaptation.confidence 
      });

      return primaryAdaptation;
    } catch (error) {
      this.logger.error(`Error adapting schedule based on context`, { userId, error: error.message });
      throw error;
    }
  }

  async analyzeUserAvailability(userId: string): Promise<AvailabilityAnalysis> {
    try {
      // Check cache first
      const cached = this.userAvailabilityCache.get(userId);
      if (cached && moment().diff(cached.lastUpdated, 'minutes') < 30) {
        return cached;
      }

      this.logger.info(`Analyzing user availability`, { userId });

      // In a real implementation, this would integrate with:
      // - Calendar systems (Google Calendar, Outlook)
      // - Activity tracking from biometric service
      // - Historical intervention response patterns
      // - Current productivity metrics

      const now = moment();
      const analysis: AvailabilityAnalysis = {
        userId,
        availabilityWindows: this.generateAvailabilityWindows(now),
        busyPeriods: this.generateBusyPeriods(now),
        preferredInterventionTimes: this.generatePreferredTimes(userId),
        contextualFactors: [
          {
            factor: 'work_schedule',
            impact: 0.8,
            description: 'Standard work hours 9-5'
          },
          {
            factor: 'meeting_patterns',
            impact: 0.6,
            description: 'Frequent meetings 10-11am and 2-3pm'
          },
          {
            factor: 'focus_periods',
            impact: 0.9,
            description: 'Deep focus typically 9-11am'
          }
        ],
        lastUpdated: now.toDate()
      };

      // Cache the analysis
      this.userAvailabilityCache.set(userId, analysis);

      this.logger.info(`User availability analysis completed`, { 
        userId, 
        availableWindows: analysis.availabilityWindows.length 
      });

      return analysis;
    } catch (error) {
      this.logger.error(`Error analyzing user availability`, { userId, error: error.message });
      throw error;
    }
  }

  async predictInterventionReceptivity(
    userId: string,
    time: Date
  ): Promise<ReceptivityPrediction> {
    try {
      const timeKey = moment(time).format('YYYY-MM-DD-HH');
      
      // Check cache
      if (!this.receptivityCache.has(userId)) {
        this.receptivityCache.set(userId, new Map());
      }
      
      const userCache = this.receptivityCache.get(userId)!;
      const cached = userCache.get(timeKey);
      if (cached) {
        return cached;
      }

      this.logger.info(`Predicting intervention receptivity`, { userId, time });

      // In a real implementation, this would use ML models trained on:
      // - Historical intervention response rates
      // - Biometric data patterns
      // - Productivity metrics
      // - User feedback scores
      // - Contextual factors

      const hour = moment(time).hour();
      const dayOfWeek = moment(time).day();
      
      // Simple heuristic-based prediction (would be replaced with ML model)
      let baseReceptivity = 0.5;
      
      // Time of day factors
      if (hour >= 9 && hour <= 11) baseReceptivity += 0.2; // Morning focus
      if (hour >= 14 && hour <= 16) baseReceptivity += 0.1; // Afternoon productivity
      if (hour >= 12 && hour <= 13) baseReceptivity -= 0.1; // Lunch time
      if (hour >= 17) baseReceptivity -= 0.2; // End of day fatigue
      
      // Day of week factors
      if (dayOfWeek === 1) baseReceptivity -= 0.1; // Monday blues
      if (dayOfWeek === 5) baseReceptivity -= 0.1; // Friday wind-down
      if (dayOfWeek === 0 || dayOfWeek === 6) baseReceptivity -= 0.3; // Weekends

      const receptivityScore = Math.max(0, Math.min(1, baseReceptivity));
      
      const prediction: ReceptivityPrediction = {
        time,
        receptivityScore,
        confidence: 0.7, // Would be higher with real ML model
        influencingFactors: [
          {
            factor: 'time_of_day',
            impact: this.getTimeOfDayImpact(hour),
            description: `${hour}:00 - ${this.getTimeOfDayDescription(hour)}`
          },
          {
            factor: 'day_of_week',
            impact: this.getDayOfWeekImpact(dayOfWeek),
            description: moment(time).format('dddd')
          }
        ],
        recommendations: this.generateTimingRecommendations(receptivityScore, time)
      };

      // Cache the prediction
      userCache.set(timeKey, prediction);

      this.logger.info(`Receptivity prediction completed`, { 
        userId, 
        time, 
        receptivityScore: prediction.receptivityScore 
      });

      return prediction;
    } catch (error) {
      this.logger.error(`Error predicting intervention receptivity`, { userId, time, error: error.message });
      throw error;
    }
  }

  async optimizeInterventionFrequency(userId: string): Promise<FrequencyOptimization> {
    try {
      this.logger.info(`Optimizing intervention frequency`, { userId });

      // In a real implementation, this would analyze:
      // - Current intervention frequency and effectiveness
      // - User stress patterns and wellness trends
      // - Intervention fatigue indicators
      // - User preferences and feedback

      const currentFrequency: InterventionFrequency = {
        daily: 8,
        weekly: 56,
        monthly: 240,
        perHour: 0.33
      };

      // Simple optimization logic (would use ML in production)
      const recommendedFrequency: InterventionFrequency = {
        daily: Math.max(4, Math.min(12, currentFrequency.daily)),
        weekly: Math.max(28, Math.min(84, currentFrequency.weekly)),
        monthly: Math.max(120, Math.min(360, currentFrequency.monthly)),
        perHour: Math.max(0.1, Math.min(0.5, currentFrequency.perHour))
      };

      const optimization: FrequencyOptimization = {
        userId,
        currentFrequency,
        recommendedFrequency,
        reasoning: [
          'Current frequency shows good engagement',
          'Stress patterns suggest maintaining current level',
          'User feedback indicates satisfaction with timing'
        ],
        expectedImpact: 0.15, // 15% improvement expected
        trialPeriod: 14 // 2 weeks
      };

      this.logger.info(`Frequency optimization completed`, { 
        userId, 
        expectedImpact: optimization.expectedImpact 
      });

      return optimization;
    } catch (error) {
      this.logger.error(`Error optimizing intervention frequency`, { userId, error: error.message });
      throw error;
    }
  }

  // Emergency intervention scheduling
  async scheduleEmergencyIntervention(
    userId: string,
    severity: EmergencySeverity,
    intervention: InterventionPlan
  ): Promise<OptimalTiming> {
    try {
      this.logger.warn(`Scheduling emergency intervention`, { userId, severity });

      // Emergency interventions bypass normal scheduling logic
      const emergencyTiming: OptimalTiming = {
        recommendedTime: new Date(), // Immediate
        confidence: 1.0,
        reasoning: [
          `Emergency situation detected with severity: ${severity}`,
          'Immediate intervention required',
          'Bypassing normal scheduling constraints'
        ],
        alternativeTimes: [], // No alternatives for emergencies
        contextFactors: [
          {
            factor: 'emergency_severity',
            impact: 1.0,
            description: `Emergency level: ${severity}`
          }
        ]
      };

      // Clear any conflicting scheduled interventions
      await this.clearConflictingInterventions(userId);

      this.logger.warn(`Emergency intervention scheduled`, { 
        userId, 
        severity, 
        scheduledTime: emergencyTiming.recommendedTime 
      });

      return emergencyTiming;
    } catch (error) {
      this.logger.error(`Error scheduling emergency intervention`, { userId, severity, error: error.message });
      throw error;
    }
  }

  // Private helper methods
  private async getUserContext(userId: string): Promise<UserContext> {
    // In a real implementation, this would fetch from context engine
    return {
      currentActivity: 'coding',
      currentStress: 65,
      currentEnergy: 75,
      currentFocus: 80,
      currentMood: 70,
      lastInterventionTime: moment().subtract(2, 'hours').toDate()
    };
  }

  private findAvailableTimeWindows(
    availability: AvailabilityAnalysis,
    intervention: InterventionPlan
  ): TimeWindow[] {
    const windows: TimeWindow[] = [];
    const now = moment();
    const endOfDay = moment().endOf('day');

    // Filter availability windows that can accommodate the intervention
    for (const window of availability.availabilityWindows) {
      const windowStart = moment(window.start);
      const windowEnd = moment(window.end);
      const duration = intervention.duration || 5; // Default 5 minutes

      if (windowStart.isAfter(now) && windowEnd.diff(windowStart, 'minutes') >= duration) {
        windows.push({
          start: windowStart.toDate(),
          end: windowStart.add(duration, 'minutes').toDate(),
          confidence: window.confidence
        });
      }
    }

    return windows;
  }

  private calculateOptimalityScore(
    window: TimeWindow,
    receptivity: ReceptivityPrediction,
    intervention: InterventionPlan,
    context: UserContext
  ): number {
    let score = 0;

    // Base score from receptivity
    score += receptivity.receptivityScore * 0.4;

    // Window confidence
    score += window.confidence * 0.2;

    // Time preference alignment
    if (intervention.timing.preferredTime) {
      const timeDiff = Math.abs(moment(window.start).diff(intervention.timing.preferredTime, 'minutes'));
      score += Math.max(0, (60 - timeDiff) / 60) * 0.2;
    }

    // Context alignment
    if (intervention.type === 'STRESS_REDUCTION' && context.currentStress && context.currentStress > 70) {
      score += 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  private generateTimingReasoning(
    bestWindow: any,
    intervention: InterventionPlan
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(`High receptivity predicted (${(bestWindow.receptivity.receptivityScore * 100).toFixed(0)}%)`);
    reasoning.push(`Available time window with ${(bestWindow.window.confidence * 100).toFixed(0)}% confidence`);
    
    if (intervention.type === 'BREAK_REMINDER') {
      reasoning.push('Optimal timing for productivity break');
    } else if (intervention.type === 'STRESS_REDUCTION') {
      reasoning.push('Stress levels indicate intervention would be beneficial');
    }

    return reasoning;
  }

  private extractContextFactors(context: UserContext, receptivity: ReceptivityPrediction): any[] {
    return [
      {
        factor: 'current_activity',
        impact: 0.7,
        description: `Currently ${context.currentActivity}`
      },
      {
        factor: 'stress_level',
        impact: 0.8,
        description: `Stress level: ${context.currentStress}%`
      },
      ...receptivity.influencingFactors
    ];
  }

  private detectSchedulingConflicts(interventions: InterventionPlan[]): SchedulingConflict[] {
    const conflicts: SchedulingConflict[] = [];
    
    // Simple time overlap detection
    for (let i = 0; i < interventions.length; i++) {
      for (let j = i + 1; j < interventions.length; j++) {
        const intervention1 = interventions[i];
        const intervention2 = interventions[j];
        
        if (this.interventionsOverlap(intervention1, intervention2)) {
          conflicts.push({
            conflictType: 'time_overlap',
            description: `Interventions ${i} and ${j} have overlapping time windows`,
            severity: 'medium',
            affectedInterventions: [i.toString(), j.toString()]
          });
        }
      }
    }

    return conflicts;
  }

  private interventionsOverlap(intervention1: InterventionPlan, intervention2: InterventionPlan): boolean {
    if (!intervention1.timing.preferredTime || !intervention2.timing.preferredTime) {
      return false;
    }

    const start1 = moment(intervention1.timing.preferredTime);
    const end1 = start1.clone().add(intervention1.duration || 5, 'minutes');
    const start2 = moment(intervention2.timing.preferredTime);
    const end2 = start2.clone().add(intervention2.duration || 5, 'minutes');

    return start1.isBefore(end2) && start2.isBefore(end1);
  }

  private async generateConflictResolutions(
    userId: string,
    conflicts: SchedulingConflict[],
    interventions: InterventionPlan[]
  ): Promise<any[]> {
    // Simple resolution: stagger conflicting interventions
    return conflicts.map(conflict => ({
      conflictId: conflict.affectedInterventions.join('-'),
      strategy: 'stagger',
      description: 'Stagger interventions by 10 minutes',
      impact: 'low'
    }));
  }

  private async applyConflictResolutions(
    userId: string,
    interventions: InterventionPlan[],
    resolutions: any[]
  ): Promise<any[]> {
    return interventions.map((intervention, index) => ({
      interventionId: this.generateInterventionId(),
      intervention,
      scheduledTime: intervention.timing.preferredTime || new Date(),
      priority: this.calculateInterventionPriority(intervention)
    }));
  }

  private identifyScheduleCompromises(interventions: InterventionPlan[], finalSchedule: any[]): any[] {
    return []; // Simplified - would identify actual compromises made
  }

  private generateInterventionId(): string {
    return `intervention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateInterventionPriority(intervention: InterventionPlan): number {
    // Priority based on intervention type
    const priorityMap = {
      'STRESS_REDUCTION': 0.9,
      'BREAK_REMINDER': 0.7,
      'MOVEMENT_PROMPT': 0.6,
      'HYDRATION_REMINDER': 0.5
    };

    return priorityMap[intervention.type] || 0.5;
  }

  private generateAvailabilityWindows(now: moment.Moment): TimeWindow[] {
    const windows: TimeWindow[] = [];
    
    // Generate typical work day availability windows
    const workStart = now.clone().hour(9).minute(0);
    const workEnd = now.clone().hour(17).minute(0);
    
    // Morning window (9-11 AM)
    windows.push({
      start: workStart.toDate(),
      end: workStart.clone().add(2, 'hours').toDate(),
      confidence: 0.8
    });
    
    // Afternoon window (2-4 PM)
    windows.push({
      start: workStart.clone().hour(14).toDate(),
      end: workStart.clone().hour(16).toDate(),
      confidence: 0.7
    });

    return windows;
  }

  private generateBusyPeriods(now: moment.Moment): TimeWindow[] {
    // Typical busy periods (meetings, lunch, etc.)
    return [
      {
        start: now.clone().hour(12).minute(0).toDate(),
        end: now.clone().hour(13).minute(0).toDate(),
        confidence: 0.9
      }
    ];
  }

  private generatePreferredTimes(userId: string): TimeWindow[] {
    // User-specific preferred intervention times
    const now = moment();
    return [
      {
        start: now.clone().hour(10).minute(30).toDate(),
        end: now.clone().hour(10).minute(35).toDate(),
        confidence: 0.85
      },
      {
        start: now.clone().hour(15).minute(0).toDate(),
        end: now.clone().hour(15).minute(5).toDate(),
        confidence: 0.8
      }
    ];
  }

  private getTimeOfDayImpact(hour: number): number {
    if (hour >= 9 && hour <= 11) return 0.8;
    if (hour >= 14 && hour <= 16) return 0.6;
    if (hour >= 12 && hour <= 13) return -0.3;
    if (hour >= 17) return -0.5;
    return 0;
  }

  private getTimeOfDayDescription(hour: number): string {
    if (hour >= 6 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 21) return 'Evening';
    return 'Night';
  }

  private getDayOfWeekImpact(dayOfWeek: number): number {
    const impacts = [0.3, 0.8, 0.9, 0.9, 0.7, 0.5, 0.4]; // Sun-Sat
    return impacts[dayOfWeek] || 0.5;
  }

  private generateTimingRecommendations(receptivityScore: number, time: Date): any[] {
    const recommendations = [];
    
    if (receptivityScore < 0.3) {
      recommendations.push({
        type: 'reschedule',
        description: 'Consider rescheduling to a time with higher receptivity'
      });
    }
    
    if (receptivityScore > 0.8) {
      recommendations.push({
        type: 'proceed',
        description: 'Excellent timing for intervention delivery'
      });
    }

    return recommendations;
  }

  private async clearConflictingInterventions(userId: string): Promise<void> {
    // Clear any scheduled interventions that might conflict with emergency
    for (const [interventionId, timeout] of this.scheduledInterventions.entries()) {
      if (interventionId.includes(userId)) {
        clearTimeout(timeout);
        this.scheduledInterventions.delete(interventionId);
      }
    }
  }

  private cleanupExpiredCache(): void {
    const now = moment();
    
    // Clean availability cache
    for (const [userId, analysis] of this.userAvailabilityCache.entries()) {
      if (now.diff(analysis.lastUpdated, 'hours') > 2) {
        this.userAvailabilityCache.delete(userId);
      }
    }

    // Clean receptivity cache
    for (const [userId, userCache] of this.receptivityCache.entries()) {
      for (const [timeKey, prediction] of userCache.entries()) {
        const predictionTime = moment(prediction.time);
        if (now.diff(predictionTime, 'hours') > 24) {
          userCache.delete(timeKey);
        }
      }
      
      if (userCache.size === 0) {
        this.receptivityCache.delete(userId);
      }
    }

    this.logger.info('Cache cleanup completed');
  }
}