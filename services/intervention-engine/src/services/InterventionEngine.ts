import {
  InterventionPlan,
  InterventionOutcome,
  DeliveryResult,
  EmergencyResponse,
  InterventionTiming,
  EmergencySeverity
} from '@devflow/shared-types';
import {
  InterventionEngine as IInterventionEngine,
  ScheduleResult,
  CancellationResult,
  InterventionHistory,
  InterventionPatternAnalysis,
  EscalationResult,
  NotificationResult,
  EmergencySituation,
  TimeRange,
  InterventionEngineError,
  SchedulingError,
  EmergencyError
} from '../types';
import { InterventionScheduler } from './InterventionScheduler';
import { EmergencyHandler } from './EmergencyHandler';
import { DeliveryManager } from './DeliveryManager';
import { EffectivenessTracker } from './EffectivenessTracker';
import { Logger } from 'winston';
import { EventEmitter } from 'events';
import * as cron from 'node-cron';
import moment from 'moment';

export class InterventionEngine extends EventEmitter implements IInterventionEngine {
  private logger: Logger;
  private scheduler: InterventionScheduler;
  private emergencyHandler: EmergencyHandler;
  private deliveryManager: DeliveryManager;
  private effectivenessTracker: EffectivenessTracker;
  private scheduledInterventions: Map<string, ScheduledIntervention> = new Map();
  private interventionHistory: Map<string, InterventionHistory[]> = new Map();
  private activeInterventions: Map<string, ActiveIntervention> = new Map();

  constructor(logger: Logger) {
    super();
    this.logger = logger;
    this.scheduler = new InterventionScheduler(logger);
    this.emergencyHandler = new EmergencyHandler(logger);
    this.deliveryManager = new DeliveryManager(logger);
    this.effectivenessTracker = new EffectivenessTracker(logger);
    this.initializeEngine();
  }

  private initializeEngine(): void {
    // Process scheduled interventions every minute
    cron.schedule('* * * * *', () => {
      this.processScheduledInterventions();
    });

    // Clean up completed interventions every hour
    cron.schedule('0 * * * *', () => {
      this.cleanupCompletedInterventions();
    });

    // Monitor for emergency situations every 30 seconds
    cron.schedule('*/30 * * * * *', () => {
      this.monitorEmergencySituations();
    });

    this.logger.info('InterventionEngine initialized');
  }

  async scheduleIntervention(
    userId: string,
    intervention: InterventionPlan
  ): Promise<ScheduleResult> {
    try {
      this.logger.info(`Scheduling intervention`, { userId, type: intervention.type });

      // Validate intervention plan
      this.validateInterventionPlan(intervention);

      // Find optimal timing
      const optimalTiming = await this.scheduler.findOptimalInterventionTime(userId, intervention);

      // Generate intervention ID
      const interventionId = this.generateInterventionId(userId, intervention.type);

      // Check for conflicts with existing interventions
      const conflicts = await this.checkForConflicts(userId, optimalTiming.recommendedTime, intervention);

      // Create scheduled intervention
      const scheduledIntervention: ScheduledIntervention = {
        interventionId,
        userId,
        intervention,
        scheduledTime: optimalTiming.recommendedTime,
        status: 'scheduled',
        createdAt: new Date(),
        attempts: 0,
        maxAttempts: 3
      };

      // Store the scheduled intervention
      this.scheduledInterventions.set(interventionId, scheduledIntervention);

      // Set up timer for delivery
      this.scheduleInterventionDelivery(scheduledIntervention);

      // Record in history
      await this.recordInterventionHistory(userId, {
        interventionId,
        userId,
        type: intervention.type,
        scheduledTime: optimalTiming.recommendedTime,
        status: 'scheduled'
      });

      const result: ScheduleResult = {
        success: true,
        interventionId,
        scheduledTime: optimalTiming.recommendedTime,
        estimatedDuration: intervention.duration || 5,
        conflicts,
        adaptations: []
      };

      this.logger.info(`Intervention scheduled successfully`, { 
        userId, 
        interventionId, 
        scheduledTime: result.scheduledTime 
      });

      // Emit event
      this.emit('interventionScheduled', { userId, interventionId, result });

      return result;
    } catch (error) {
      this.logger.error(`Error scheduling intervention`, { userId, error: error.message });
      throw new SchedulingError(`Failed to schedule intervention: ${error.message}`, userId);
    }
  }

  async deliverIntervention(
    userId: string,
    interventionId: string
  ): Promise<DeliveryResult> {
    try {
      this.logger.info(`Delivering intervention`, { userId, interventionId });

      // Get scheduled intervention
      const scheduledIntervention = this.scheduledInterventions.get(interventionId);
      if (!scheduledIntervention) {
        throw new InterventionEngineError(`Intervention not found: ${interventionId}`, 'NOT_FOUND', userId, interventionId);
      }

      // Check if intervention is ready for delivery
      if (scheduledIntervention.status !== 'scheduled' && scheduledIntervention.status !== 'retry') {
        throw new InterventionEngineError(`Intervention not ready for delivery: ${scheduledIntervention.status}`, 'INVALID_STATUS', userId, interventionId);
      }

      // Update status
      scheduledIntervention.status = 'delivering';
      scheduledIntervention.attempts++;

      // Create active intervention
      const activeIntervention: ActiveIntervention = {
        interventionId,
        userId,
        intervention: scheduledIntervention.intervention,
        startTime: new Date(),
        status: 'active'
      };

      this.activeInterventions.set(interventionId, activeIntervention);

      // Deliver the intervention using DeliveryManager
      const deliveryResult = await this.executeInterventionDelivery(activeIntervention);

      // Update intervention status based on delivery result
      if (deliveryResult.success) {
        scheduledIntervention.status = 'delivered';
        activeIntervention.status = 'completed';
        activeIntervention.endTime = new Date();
      } else {
        scheduledIntervention.status = 'failed';
        activeIntervention.status = 'failed';
        activeIntervention.endTime = new Date();
        activeIntervention.failureReason = deliveryResult.error;
      }

      // Update history
      await this.updateInterventionHistory(userId, interventionId, {
        deliveredTime: new Date(),
        status: deliveryResult.success ? 'delivered' : 'failed'
      });

      this.logger.info(`Intervention delivery completed`, { 
        userId, 
        interventionId, 
        success: deliveryResult.success 
      });

      // Emit event
      this.emit('interventionDelivered', { userId, interventionId, result: deliveryResult });

      return deliveryResult;
    } catch (error) {
      this.logger.error(`Error delivering intervention`, { userId, interventionId, error: error.message });
      throw error;
    }
  }

  async cancelIntervention(
    userId: string,
    interventionId: string
  ): Promise<CancellationResult> {
    try {
      this.logger.info(`Cancelling intervention`, { userId, interventionId });

      const scheduledIntervention = this.scheduledInterventions.get(interventionId);
      if (!scheduledIntervention) {
        throw new InterventionEngineError(`Intervention not found: ${interventionId}`, 'NOT_FOUND', userId, interventionId);
      }

      // Cancel the intervention
      scheduledIntervention.status = 'cancelled';
      scheduledIntervention.cancelledAt = new Date();

      // Remove from active interventions if present
      this.activeInterventions.delete(interventionId);

      // Update history
      await this.updateInterventionHistory(userId, interventionId, {
        status: 'cancelled'
      });

      const result: CancellationResult = {
        success: true,
        interventionId,
        cancelledAt: new Date(),
        reason: 'User requested cancellation',
        rescheduled: false
      };

      this.logger.info(`Intervention cancelled successfully`, { userId, interventionId });

      // Emit event
      this.emit('interventionCancelled', { userId, interventionId, result });

      return result;
    } catch (error) {
      this.logger.error(`Error cancelling intervention`, { userId, interventionId, error: error.message });
      throw error;
    }
  }

  async rescheduleIntervention(
    userId: string,
    interventionId: string,
    newTiming: InterventionTiming
  ): Promise<ScheduleResult> {
    try {
      this.logger.info(`Rescheduling intervention`, { userId, interventionId });

      // Cancel existing intervention
      await this.cancelIntervention(userId, interventionId);

      // Get original intervention plan
      const originalIntervention = this.scheduledInterventions.get(interventionId);
      if (!originalIntervention) {
        throw new InterventionEngineError(`Original intervention not found: ${interventionId}`, 'NOT_FOUND', userId, interventionId);
      }

      // Create new intervention plan with updated timing
      const newInterventionPlan: InterventionPlan = {
        ...originalIntervention.intervention,
        timing: newTiming
      };

      // Schedule new intervention
      const newScheduleResult = await this.scheduleIntervention(userId, newInterventionPlan);

      // Update cancellation result to indicate rescheduling
      const cancellationResult = await this.updateCancellationForReschedule(interventionId, newScheduleResult.interventionId);

      this.logger.info(`Intervention rescheduled successfully`, { 
        userId, 
        originalId: interventionId, 
        newId: newScheduleResult.interventionId 
      });

      return newScheduleResult;
    } catch (error) {
      this.logger.error(`Error rescheduling intervention`, { userId, interventionId, error: error.message });
      throw error;
    }
  }

  async trackInterventionEffectiveness(
    userId: string,
    interventionId: string,
    outcome: InterventionOutcome
  ): Promise<void> {
    try {
      this.logger.info(`Tracking intervention effectiveness`, { userId, interventionId });

      // Update intervention history with outcome
      await this.updateInterventionHistory(userId, interventionId, {
        effectiveness: outcome.effectivenessScore,
        userFeedback: outcome.userFeedback,
        biometricImpact: outcome.biometricImpact,
        completedTime: new Date(),
        status: 'completed'
      });

      // Update effectiveness learning using EffectivenessTracker
      await this.updateEffectivenessLearning(userId, interventionId, outcome);

      this.logger.info(`Intervention effectiveness tracked`, { 
        userId, 
        interventionId, 
        effectiveness: outcome.effectivenessScore 
      });

      // Emit event
      this.emit('effectivenessTracked', { userId, interventionId, outcome });
    } catch (error) {
      this.logger.error(`Error tracking intervention effectiveness`, { userId, interventionId, error: error.message });
      throw error;
    }
  }

  async getInterventionHistory(
    userId: string,
    timeRange?: TimeRange
  ): Promise<InterventionHistory[]> {
    try {
      this.logger.info(`Getting intervention history`, { userId, timeRange });

      let history = this.interventionHistory.get(userId) || [];

      // Filter by time range if provided
      if (timeRange) {
        history = history.filter(intervention => {
          const interventionTime = intervention.scheduledTime;
          return interventionTime >= timeRange.startTime && interventionTime <= timeRange.endTime;
        });
      }

      // Sort by scheduled time (most recent first)
      history.sort((a, b) => b.scheduledTime.getTime() - a.scheduledTime.getTime());

      this.logger.info(`Retrieved intervention history`, { userId, count: history.length });

      return history;
    } catch (error) {
      this.logger.error(`Error getting intervention history`, { userId, error: error.message });
      throw error;
    }
  }

  async analyzeInterventionPatterns(userId: string): Promise<InterventionPatternAnalysis> {
    try {
      this.logger.info(`Analyzing intervention patterns`, { userId });

      const history = await this.getInterventionHistory(userId);
      
      if (history.length === 0) {
        throw new InterventionEngineError(`No intervention history found for user`, 'NO_DATA', userId);
      }

      // Analyze patterns
      const analysis: InterventionPatternAnalysis = {
        userId,
        patterns: {
          mostEffectiveTypes: this.analyzeMostEffectiveTypes(history),
          optimalTiming: this.analyzeOptimalTiming(history),
          preferredDeliveryMethods: this.analyzePreferredDeliveryMethods(history),
          responsePatterns: this.analyzeResponsePatterns(history)
        },
        insights: this.generatePatternInsights(history),
        recommendations: this.generatePatternRecommendations(history),
        confidence: this.calculateAnalysisConfidence(history),
        analysisDate: new Date()
      };

      this.logger.info(`Intervention pattern analysis completed`, { 
        userId, 
        confidence: analysis.confidence 
      });

      return analysis;
    } catch (error) {
      this.logger.error(`Error analyzing intervention patterns`, { userId, error: error.message });
      throw error;
    }
  }

  async triggerEmergencyIntervention(
    userId: string,
    severity: EmergencySeverity
  ): Promise<EmergencyResponse> {
    try {
      this.logger.warn(`Triggering emergency intervention`, { userId, severity });

      // Delegate to emergency handler
      const emergencyResponse = await this.emergencyHandler.handleEmergency(userId, severity);

      // Create emergency intervention plan
      const emergencyIntervention: InterventionPlan = {
        type: 'STRESS_REDUCTION', // Emergency stress reduction
        deliveryMethod: 'MULTI_MODAL',
        timing: {
          preferredTime: new Date(),
          flexibility: 0, // No flexibility for emergencies
          recurring: false
        },
        personalization: {
          urgency: 'high',
          adaptToContext: true,
          userPreferences: {}
        },
        duration: 10, // 10 minutes for emergency intervention
        priority: 1.0 // Highest priority
      };

      // Schedule emergency intervention immediately
      const scheduleResult = await this.scheduleIntervention(userId, emergencyIntervention);

      // Deliver immediately
      await this.deliverIntervention(userId, scheduleResult.interventionId);

      this.logger.warn(`Emergency intervention triggered`, { 
        userId, 
        severity, 
        interventionId: scheduleResult.interventionId 
      });

      // Emit emergency event
      this.emit('emergencyInterventionTriggered', { userId, severity, response: emergencyResponse });

      return emergencyResponse;
    } catch (error) {
      this.logger.error(`Error triggering emergency intervention`, { userId, severity, error: error.message });
      throw new EmergencyError(`Failed to trigger emergency intervention: ${error.message}`, userId);
    }
  }

  async escalateIntervention(
    interventionId: string,
    reason: string
  ): Promise<EscalationResult> {
    try {
      this.logger.warn(`Escalating intervention`, { interventionId, reason });

      const scheduledIntervention = this.scheduledInterventions.get(interventionId);
      if (!scheduledIntervention) {
        throw new InterventionEngineError(`Intervention not found: ${interventionId}`, 'NOT_FOUND', undefined, interventionId);
      }

      // Delegate to emergency handler for escalation
      const escalationResult = await this.emergencyHandler.escalateIntervention(
        scheduledIntervention.userId,
        interventionId,
        reason
      );

      this.logger.warn(`Intervention escalated`, { 
        interventionId, 
        escalationLevel: escalationResult.escalationLevel 
      });

      // Emit escalation event
      this.emit('interventionEscalated', { interventionId, reason, result: escalationResult });

      return escalationResult;
    } catch (error) {
      this.logger.error(`Error escalating intervention`, { interventionId, reason, error: error.message });
      throw error;
    }
  }

  async notifyEmergencyContacts(
    userId: string,
    situation: EmergencySituation
  ): Promise<NotificationResult> {
    try {
      this.logger.warn(`Notifying emergency contacts`, { userId, situationType: situation.situationType });

      // Delegate to emergency handler
      const notificationResult = await this.emergencyHandler.notifyEmergencyContacts(userId, situation);

      this.logger.warn(`Emergency contacts notified`, { 
        userId, 
        contactsNotified: notificationResult.contactsNotified.length 
      });

      // Emit notification event
      this.emit('emergencyContactsNotified', { userId, situation, result: notificationResult });

      return notificationResult;
    } catch (error) {
      this.logger.error(`Error notifying emergency contacts`, { userId, error: error.message });
      throw error;
    }
  }

  // Private helper methods
  private validateInterventionPlan(intervention: InterventionPlan): void {
    if (!intervention.type) {
      throw new InterventionEngineError('Intervention type is required', 'VALIDATION_ERROR');
    }

    if (!intervention.deliveryMethod) {
      throw new InterventionEngineError('Delivery method is required', 'VALIDATION_ERROR');
    }

    if (intervention.duration && intervention.duration <= 0) {
      throw new InterventionEngineError('Duration must be positive', 'VALIDATION_ERROR');
    }
  }

  private generateInterventionId(userId: string, type: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${userId}_${type}_${timestamp}_${random}`;
  }

  private async checkForConflicts(
    userId: string,
    scheduledTime: Date,
    intervention: InterventionPlan
  ): Promise<any[]> {
    const conflicts = [];
    
    // Check for overlapping interventions
    for (const [id, scheduled] of this.scheduledInterventions.entries()) {
      if (scheduled.userId === userId && scheduled.status === 'scheduled') {
        const timeDiff = Math.abs(scheduledTime.getTime() - scheduled.scheduledTime.getTime());
        const minInterval = (intervention.duration || 5) * 60 * 1000; // Convert to milliseconds
        
        if (timeDiff < minInterval) {
          conflicts.push({
            type: 'time_overlap',
            conflictingInterventionId: id,
            timeDifference: timeDiff
          });
        }
      }
    }

    return conflicts;
  }

  private scheduleInterventionDelivery(scheduledIntervention: ScheduledIntervention): void {
    const delay = scheduledIntervention.scheduledTime.getTime() - Date.now();
    
    if (delay > 0) {
      setTimeout(async () => {
        try {
          await this.deliverIntervention(scheduledIntervention.userId, scheduledIntervention.interventionId);
        } catch (error) {
          this.logger.error(`Scheduled intervention delivery failed`, { 
            interventionId: scheduledIntervention.interventionId, 
            error: error.message 
          });
        }
      }, delay);
    }
  }

  private async executeInterventionDelivery(activeIntervention: ActiveIntervention): Promise<DeliveryResult> {
    try {
      // Use DeliveryManager to deliver the intervention
      const intervention = activeIntervention.intervention;
      
      // Select optimal delivery method if not specified
      let deliveryMethod = intervention.deliveryMethod;
      if (!deliveryMethod) {
        const context = await this.getDeliveryContext(activeIntervention.userId);
        deliveryMethod = await this.deliveryManager.selectOptimalDeliveryMethod(activeIntervention.userId, context);
      }

      // Deliver based on intervention type and method
      let deliveryResult: DeliveryResult;
      
      if (intervention.type === 'STRESS_REDUCTION') {
        deliveryResult = await this.deliveryManager.deliverStressReductionIntervention(
          activeIntervention.userId,
          intervention.type,
          deliveryMethod
        );
      } else if (intervention.type === 'BREATHING_EXERCISE') {
        deliveryResult = await this.deliveryManager.deliverBreathingExercise(
          activeIntervention.userId,
          'box_breathing', // Default breathing exercise
          deliveryMethod
        );
      } else if (intervention.type === 'MOVEMENT_PROMPT') {
        deliveryResult = await this.deliveryManager.deliverMovementReminder(
          activeIntervention.userId,
          'stretch', // Default movement type
          deliveryMethod
        );
      } else if (intervention.type === 'HYDRATION_REMINDER') {
        deliveryResult = await this.deliveryManager.deliverHydrationReminder(
          activeIntervention.userId,
          'gentle', // Default reminder type
          deliveryMethod
        );
      } else {
        // Generic delivery for other intervention types
        deliveryResult = await this.deliverGenericIntervention(activeIntervention, deliveryMethod);
      }

      return deliveryResult;
    } catch (error) {
      this.logger.error(`Error executing intervention delivery`, { 
        interventionId: activeIntervention.interventionId, 
        error: error.message 
      });
      
      return {
        success: false,
        deliveredAt: new Date(),
        deliveryMethod: activeIntervention.intervention.deliveryMethod,
        error: error.message
      };
    }
  }

  private async deliverGenericIntervention(
    activeIntervention: ActiveIntervention,
    deliveryMethod: any
  ): Promise<DeliveryResult> {
    // Generic delivery for intervention types not specifically handled
    const content = {
      type: 'notification',
      title: `${activeIntervention.intervention.type} Reminder`,
      message: 'Time for a wellness intervention',
      duration: activeIntervention.intervention.duration || 30,
      styling: {}
    };

    switch (deliveryMethod) {
      case 'VISUAL':
        return await this.deliveryManager.deliverVisualIntervention(activeIntervention.userId, content);
      case 'AUDIO':
        const audioContent = {
          type: 'notification',
          textToSpeech: content.message,
          duration: content.duration,
          volume: 0.7,
          fadeIn: false,
          fadeOut: true
        };
        return await this.deliveryManager.deliverAudioIntervention(activeIntervention.userId, audioContent);
      case 'HAPTIC':
        const hapticContent = {
          type: 'vibration',
          pattern: [{ intensity: 0.3, duration: 500 }],
          intensity: 0.3,
          duration: 500,
          repeatCount: 1
        };
        return await this.deliveryManager.deliverHapticIntervention(activeIntervention.userId, hapticContent);
      default:
        return await this.deliveryManager.deliverVisualIntervention(activeIntervention.userId, content);
    }
  }

  private async getDeliveryContext(userId: string): Promise<any> {
    // Get current delivery context for the user
    // This would integrate with context engine in a real implementation
    return {
      userLocation: 'office',
      currentActivity: 'coding',
      deviceType: 'desktop',
      environmentalFactors: {
        noiseLevel: 40,
        lightLevel: 70
      },
      userState: {
        stressLevel: 65,
        energyLevel: 60,
        focusLevel: 75
      },
      timeOfDay: new Date().toTimeString()
    };
  }

  private async recordInterventionHistory(userId: string, historyEntry: Partial<InterventionHistory>): Promise<void> {
    if (!this.interventionHistory.has(userId)) {
      this.interventionHistory.set(userId, []);
    }

    const history = this.interventionHistory.get(userId)!;
    const fullEntry: InterventionHistory = {
      interventionId: historyEntry.interventionId!,
      userId: historyEntry.userId!,
      type: historyEntry.type!,
      scheduledTime: historyEntry.scheduledTime!,
      status: historyEntry.status!,
      effectiveness: historyEntry.effectiveness || 0,
      ...historyEntry
    };

    history.push(fullEntry);

    // Keep only last 1000 entries per user
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
  }

  private async updateInterventionHistory(
    userId: string,
    interventionId: string,
    updates: Partial<InterventionHistory>
  ): Promise<void> {
    const history = this.interventionHistory.get(userId);
    if (!history) return;

    const entry = history.find(h => h.interventionId === interventionId);
    if (entry) {
      Object.assign(entry, updates);
    }
  }

  private async updateCancellationForReschedule(
    originalId: string,
    newId: string
  ): Promise<void> {
    const scheduledIntervention = this.scheduledInterventions.get(originalId);
    if (scheduledIntervention) {
      scheduledIntervention.rescheduledTo = newId;
    }
  }

  private async updateEffectivenessLearning(
    userId: string,
    interventionId: string,
    outcome: InterventionOutcome
  ): Promise<void> {
    try {
      // Get intervention details
      const scheduledIntervention = this.scheduledInterventions.get(interventionId);
      if (scheduledIntervention) {
        // Update intervention effectiveness using EffectivenessTracker
        await this.effectivenessTracker.updateInterventionEffectiveness(
          scheduledIntervention.intervention.type,
          outcome
        );

        // Measure intervention impact if we have wellness state data
        const preState = await this.getPreInterventionWellnessState(userId, interventionId);
        const postState = await this.getPostInterventionWellnessState(userId, interventionId);
        
        if (preState && postState) {
          await this.effectivenessTracker.measureInterventionImpact(interventionId, preState, postState);
        }

        // Track biometric changes if available
        try {
          await this.effectivenessTracker.trackBiometricChanges(userId, interventionId);
        } catch (error) {
          this.logger.warn(`Could not track biometric changes`, { userId, interventionId, error: error.message });
        }

        // Assess user satisfaction
        try {
          await this.effectivenessTracker.assessUserSatisfaction(userId, interventionId);
        } catch (error) {
          this.logger.warn(`Could not assess user satisfaction`, { userId, interventionId, error: error.message });
        }
      }

      this.logger.info(`Effectiveness learning updated`, { 
        userId, 
        interventionId, 
        effectiveness: outcome.effectiveness 
      });
    } catch (error) {
      this.logger.error(`Error updating effectiveness learning`, { 
        userId, 
        interventionId, 
        error: error.message 
      });
    }
  }

  private async getPreInterventionWellnessState(userId: string, interventionId: string): Promise<any> {
    // Get wellness state before intervention
    // This would integrate with wellness intelligence service
    return {
      stressLevel: 70,
      energyLevel: 60,
      focusLevel: 65,
      moodLevel: 55,
      timestamp: moment().subtract(10, 'minutes').toDate()
    };
  }

  private async getPostInterventionWellnessState(userId: string, interventionId: string): Promise<any> {
    // Get wellness state after intervention
    // This would integrate with wellness intelligence service
    return {
      stressLevel: 55,
      energyLevel: 70,
      focusLevel: 75,
      moodLevel: 70,
      timestamp: new Date()
    };
  }

  private analyzeMostEffectiveTypes(history: InterventionHistory[]): any[] {
    const typeEffectiveness = new Map();
    
    history.forEach(intervention => {
      if (intervention.effectiveness !== undefined) {
        if (!typeEffectiveness.has(intervention.type)) {
          typeEffectiveness.set(intervention.type, { total: 0, count: 0 });
        }
        const stats = typeEffectiveness.get(intervention.type);
        stats.total += intervention.effectiveness;
        stats.count += 1;
      }
    });

    return Array.from(typeEffectiveness.entries())
      .map(([type, stats]) => ({
        type,
        averageEffectiveness: stats.total / stats.count,
        sampleSize: stats.count
      }))
      .sort((a, b) => b.averageEffectiveness - a.averageEffectiveness);
  }

  private analyzeOptimalTiming(history: InterventionHistory[]): any[] {
    // Analyze timing patterns based on effectiveness
    const hourlyEffectiveness = new Map();
    
    history.forEach(intervention => {
      if (intervention.effectiveness !== undefined && intervention.deliveredTime) {
        const hour = intervention.deliveredTime.getHours();
        if (!hourlyEffectiveness.has(hour)) {
          hourlyEffectiveness.set(hour, { total: 0, count: 0 });
        }
        const stats = hourlyEffectiveness.get(hour);
        stats.total += intervention.effectiveness;
        stats.count += 1;
      }
    });

    return Array.from(hourlyEffectiveness.entries())
      .map(([hour, stats]) => ({
        hour,
        averageEffectiveness: stats.total / stats.count,
        sampleSize: stats.count
      }))
      .sort((a, b) => b.averageEffectiveness - a.averageEffectiveness);
  }

  private analyzePreferredDeliveryMethods(history: InterventionHistory[]): any[] {
    // This would analyze delivery method preferences
    return [];
  }

  private analyzeResponsePatterns(history: InterventionHistory[]): any[] {
    // This would analyze user response patterns
    return [];
  }

  private generatePatternInsights(history: InterventionHistory[]): any[] {
    return [
      {
        type: 'effectiveness_trend',
        description: 'Intervention effectiveness has improved over time',
        confidence: 0.8
      }
    ];
  }

  private generatePatternRecommendations(history: InterventionHistory[]): any[] {
    return [
      {
        type: 'timing_optimization',
        description: 'Schedule more interventions during high-effectiveness hours',
        priority: 'high'
      }
    ];
  }

  private calculateAnalysisConfidence(history: InterventionHistory[]): number {
    // Base confidence on sample size and data quality
    const sampleSize = history.length;
    const completedInterventions = history.filter(h => h.status === 'completed').length;
    
    if (sampleSize === 0) return 0;
    
    const completionRate = completedInterventions / sampleSize;
    const sampleConfidence = Math.min(1, sampleSize / 50); // Full confidence at 50+ samples
    
    return completionRate * sampleConfidence;
  }

  private async processScheduledInterventions(): Promise<void> {
    const now = new Date();
    
    for (const [interventionId, scheduled] of this.scheduledInterventions.entries()) {
      if (scheduled.status === 'scheduled' && scheduled.scheduledTime <= now) {
        try {
          await this.deliverIntervention(scheduled.userId, interventionId);
        } catch (error) {
          this.logger.error(`Failed to deliver scheduled intervention`, { 
            interventionId, 
            error: error.message 
          });
          
          // Retry logic
          if (scheduled.attempts < scheduled.maxAttempts) {
            scheduled.status = 'retry';
            scheduled.scheduledTime = new Date(now.getTime() + 5 * 60 * 1000); // Retry in 5 minutes
          } else {
            scheduled.status = 'failed';
          }
        }
      }
    }
  }

  private cleanupCompletedInterventions(): void {
    const cutoffTime = moment().subtract(24, 'hours').toDate();
    
    for (const [interventionId, scheduled] of this.scheduledInterventions.entries()) {
      if ((scheduled.status === 'completed' || scheduled.status === 'failed' || scheduled.status === 'cancelled') &&
          scheduled.createdAt < cutoffTime) {
        this.scheduledInterventions.delete(interventionId);
      }
    }

    for (const [interventionId, active] of this.activeInterventions.entries()) {
      if (active.status === 'completed' || active.status === 'failed') {
        if (active.endTime && active.endTime < cutoffTime) {
          this.activeInterventions.delete(interventionId);
        }
      }
    }
  }

  private async monitorEmergencySituations(): Promise<void> {
    // This would integrate with biometric service and wellness intelligence
    // to monitor for emergency situations
    try {
      // Check for emergency indicators across all active users
      // This is a placeholder - real implementation would check biometric data
      
      this.logger.debug('Monitoring emergency situations');
    } catch (error) {
      this.logger.error('Error monitoring emergency situations', { error: error.message });
    }
  }
}

// Supporting interfaces
interface ScheduledIntervention {
  interventionId: string;
  userId: string;
  intervention: InterventionPlan;
  scheduledTime: Date;
  status: 'scheduled' | 'delivering' | 'delivered' | 'failed' | 'cancelled' | 'retry';
  createdAt: Date;
  cancelledAt?: Date;
  rescheduledTo?: string;
  attempts: number;
  maxAttempts: number;
}

interface ActiveIntervention {
  interventionId: string;
  userId: string;
  intervention: InterventionPlan;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'failed';
  failureReason?: string;
}