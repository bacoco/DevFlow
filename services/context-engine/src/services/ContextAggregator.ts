import { WorkContext, ContextAggregatorInput, ProjectInfo, EnvironmentData, ContextEvent } from '../types';
import { Logger } from '../utils/Logger';

export class ContextAggregator {
  private logger: Logger;
  private contextHistory: Map<string, ContextEvent[]> = new Map();
  private aggregationWeights: Record<string, number> = {
    ideActivity: 0.4,
    gitEvents: 0.2,
    calendarData: 0.3,
    biometricData: 0.1,
    environmentData: 0.05
  };

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    this.logger.info('ContextAggregator initialized successfully');
  }

  async aggregateContext(
    userId: string,
    inputs: ContextAggregatorInput,
    currentContext?: WorkContext
  ): Promise<WorkContext> {
    try {
      // Get user's historical context for better aggregation
      const userHistory = this.contextHistory.get(userId) || [];
      
      // Perform weighted aggregation
      const aggregatedContext: WorkContext = {
        activityType: await this.determineActivityTypeWeighted(inputs, currentContext, userHistory),
        projectContext: this.aggregateProjectContext(inputs, currentContext),
        focusLevel: this.calculateFocusLevelAdvanced(inputs, currentContext, userHistory),
        collaborationState: this.aggregateCollaborationState(inputs, currentContext),
        environmentFactors: this.aggregateEnvironmentFactors(inputs, currentContext),
        timestamp: new Date(),
        confidence: this.calculateOverallConfidence(inputs, currentContext, userHistory)
      };

      // Store in history for future aggregations
      this.updateContextHistory(userId, aggregatedContext);

      return aggregatedContext;
    } catch (error) {
      this.logger.error('Failed to aggregate context:', error);
      throw error;
    }
  }

  private async determineActivityTypeWeighted(
    inputs: ContextAggregatorInput,
    currentContext?: WorkContext,
    userHistory?: ContextEvent[]
  ): Promise<WorkContext['activityType']> {
    const candidates: Array<{ activity: WorkContext['activityType'], confidence: number, source: string }> = [];

    // Calendar data (highest priority for meetings)
    if (inputs.calendarData?.inMeeting) {
      candidates.push({
        activity: 'meeting',
        confidence: 0.95 * this.aggregationWeights.calendarData,
        source: 'calendar'
      });
    }

    // IDE activity analysis
    if (inputs.ideActivity) {
      const ideActivity = this.analyzeIDEActivity(inputs.ideActivity);
      candidates.push({
        activity: ideActivity.activity,
        confidence: ideActivity.confidence * this.aggregationWeights.ideActivity,
        source: 'ide'
      });
    }

    // Git events analysis
    if (inputs.gitEvents?.length) {
      const gitActivity = this.analyzeGitActivity(inputs.gitEvents);
      candidates.push({
        activity: gitActivity.activity,
        confidence: gitActivity.confidence * this.aggregationWeights.gitEvents,
        source: 'git'
      });
    }

    // Historical pattern analysis
    if (userHistory && userHistory.length > 0) {
      const historicalActivity = this.predictFromHistory(userHistory);
      candidates.push({
        activity: historicalActivity.activity,
        confidence: historicalActivity.confidence * 0.3, // Lower weight for historical
        source: 'history'
      });
    }

    // Current context continuity
    if (currentContext) {
      candidates.push({
        activity: currentContext.activityType,
        confidence: 0.2, // Inertia factor
        source: 'continuity'
      });
    }

    // Select activity with highest weighted confidence
    if (candidates.length === 0) {
      return 'coding'; // Default fallback
    }

    const bestCandidate = candidates.reduce((best, candidate) => 
      candidate.confidence > best.confidence ? candidate : best
    );

    this.logger.debug(`Selected activity: ${bestCandidate.activity} (confidence: ${bestCandidate.confidence.toFixed(3)}, source: ${bestCandidate.source})`);
    
    return bestCandidate.activity;
  }

  private analyzeIDEActivity(ideActivity: any): { activity: WorkContext['activityType'], confidence: number } {
    const { actionType, fileType, keywords, numberOfEdits, timeSpentInFile } = ideActivity;
    
    // Debugging detection
    if (keywords?.includes('debug') || keywords?.includes('console.log') || actionType === 'debugging') {
      return { activity: 'debugging', confidence: 0.85 };
    }
    
    // Code review detection
    if (actionType === 'reviewing' || fileType === 'diff' || keywords?.includes('review')) {
      return { activity: 'reviewing', confidence: 0.8 };
    }
    
    // Planning detection
    if (fileType === 'markdown' && keywords?.some((k: string) => 
      ['plan', 'todo', 'spec', 'requirement', 'design'].includes(k.toLowerCase())
    )) {
      return { activity: 'planning', confidence: 0.75 };
    }
    
    // Active coding detection
    if (actionType === 'editing' && numberOfEdits > 5 && this.isCodeFile(fileType)) {
      const confidenceBoost = Math.min(0.2, numberOfEdits / 50); // More edits = higher confidence
      return { activity: 'coding', confidence: 0.7 + confidenceBoost };
    }
    
    // Passive viewing
    if (actionType === 'viewing' && timeSpentInFile > 300) { // 5+ minutes viewing
      return { activity: 'reviewing', confidence: 0.6 };
    }
    
    // Default to coding with lower confidence
    return { activity: 'coding', confidence: 0.5 };
  }

  private analyzeGitActivity(gitEvents: any[]): { activity: WorkContext['activityType'], confidence: number } {
    const latestEvent = gitEvents[0];
    
    if (latestEvent.message?.toLowerCase().includes('review') || 
        latestEvent.message?.toLowerCase().includes('feedback')) {
      return { activity: 'reviewing', confidence: 0.7 };
    }
    
    if (latestEvent.message?.toLowerCase().includes('fix') || 
        latestEvent.message?.toLowerCase().includes('debug')) {
      return { activity: 'debugging', confidence: 0.75 };
    }
    
    if (latestEvent.message?.toLowerCase().includes('plan') || 
        latestEvent.message?.toLowerCase().includes('design')) {
      return { activity: 'planning', confidence: 0.7 };
    }
    
    // Regular commit suggests coding
    return { activity: 'coding', confidence: 0.6 };
  }

  private predictFromHistory(userHistory: ContextEvent[]): { activity: WorkContext['activityType'], confidence: number } {
    // Analyze recent patterns
    const recentEvents = userHistory.slice(-10);
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    
    // Find similar time patterns
    const similarTimeEvents = recentEvents.filter(event => {
      const eventHour = new Date(event.timestamp).getHours();
      const eventDay = new Date(event.timestamp).getDay();
      return Math.abs(eventHour - currentHour) <= 1 && eventDay === currentDay;
    });
    
    if (similarTimeEvents.length > 0) {
      // Find most common activity at this time
      const activityCounts = similarTimeEvents.reduce((counts, event) => {
        const activity = event.context.activityType;
        counts[activity] = (counts[activity] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);
      
      const mostCommon = Object.entries(activityCounts)
        .sort(([,a], [,b]) => b - a)[0];
      
      if (mostCommon) {
        const confidence = mostCommon[1] / similarTimeEvents.length;
        return { 
          activity: mostCommon[0] as WorkContext['activityType'], 
          confidence: confidence * 0.8 
        };
      }
    }
    
    // Fallback to overall most common activity
    const allActivities = userHistory.reduce((counts, event) => {
      const activity = event.context.activityType;
      counts[activity] = (counts[activity] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    const mostCommonOverall = Object.entries(allActivities)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (mostCommonOverall) {
      return { 
        activity: mostCommonOverall[0] as WorkContext['activityType'], 
        confidence: 0.4 
      };
    }
    
    return { activity: 'coding', confidence: 0.3 };
  }

  private calculateFocusLevelAdvanced(
    inputs: ContextAggregatorInput,
    currentContext?: WorkContext,
    userHistory?: ContextEvent[]
  ): number {
    let focusLevel = currentContext?.focusLevel || 50;
    const adjustments: Array<{ value: number, weight: number, source: string }> = [];

    // Biometric data (highest priority)
    if (inputs.biometricData) {
      const biometricFocus = this.calculateBiometricFocus(inputs.biometricData);
      adjustments.push({
        value: biometricFocus,
        weight: this.aggregationWeights.biometricData * 10, // Amplify weight for focus calculation
        source: 'biometric'
      });
    }

    // IDE activity patterns
    if (inputs.ideActivity) {
      const ideFocus = this.calculateIDEFocus(inputs.ideActivity);
      adjustments.push({
        value: ideFocus,
        weight: this.aggregationWeights.ideActivity * 5,
        source: 'ide'
      });
    }

    // Environmental factors
    if (inputs.environmentData) {
      const envFocus = this.calculateEnvironmentalFocus(inputs.environmentData);
      adjustments.push({
        value: envFocus,
        weight: this.aggregationWeights.environmentData * 8,
        source: 'environment'
      });
    }

    // Historical focus patterns
    if (userHistory && userHistory.length > 0) {
      const historicalFocus = this.predictFocusFromHistory(userHistory);
      adjustments.push({
        value: historicalFocus,
        weight: 0.2,
        source: 'history'
      });
    }

    // Apply weighted adjustments
    if (adjustments.length > 0) {
      const totalWeight = adjustments.reduce((sum, adj) => sum + adj.weight, 0);
      const weightedAdjustment = adjustments.reduce((sum, adj) => 
        sum + (adj.value * adj.weight), 0
      ) / totalWeight;
      
      focusLevel = weightedAdjustment;
    }

    return Math.max(0, Math.min(100, focusLevel));
  }

  private calculateBiometricFocus(biometricData: any): number {
    const { heartRate, stressLevel, concentration, heartRateVariability } = biometricData;
    
    if (concentration !== undefined) {
      return concentration;
    }
    
    let focus = 50; // Base level
    
    // Heart rate variability (higher HRV often indicates better focus)
    if (heartRateVariability !== undefined) {
      focus += (heartRateVariability - 50) * 0.5;
    }
    
    // Stress level (lower stress = better focus)
    if (stressLevel !== undefined) {
      focus += (50 - stressLevel) * 0.6;
    }
    
    // Heart rate (moderate increase can indicate engagement)
    if (heartRate !== undefined) {
      const optimalHR = 80;
      const hrDeviation = Math.abs(heartRate - optimalHR);
      focus += Math.max(0, (20 - hrDeviation) * 0.5);
    }
    
    return Math.max(0, Math.min(100, focus));
  }

  private calculateIDEFocus(ideActivity: any): number {
    const { continuousEditingTime, interruptionCount, keystrokePattern, numberOfEdits, timeSpentInFile } = ideActivity;
    
    let focus = 50;
    
    // Continuous editing time (longer = better focus)
    if (continuousEditingTime > 0) {
      focus += Math.min(30, continuousEditingTime / 60); // Max 30 points for 30+ minutes
    }
    
    // Interruption count (fewer = better focus)
    if (interruptionCount !== undefined) {
      focus -= Math.min(25, interruptionCount * 3); // Penalty for interruptions
    }
    
    // Keystroke pattern
    if (keystrokePattern === 'steady') {
      focus += 15;
    } else if (keystrokePattern === 'irregular') {
      focus -= 10;
    }
    
    // Edit frequency (consistent editing indicates focus)
    if (numberOfEdits > 0 && timeSpentInFile > 0) {
      const editRate = numberOfEdits / (timeSpentInFile / 60); // Edits per minute
      if (editRate > 2 && editRate < 20) { // Sweet spot for focused editing
        focus += 10;
      }
    }
    
    return Math.max(0, Math.min(100, focus));
  }

  private calculateEnvironmentalFocus(environmentData: EnvironmentData): number {
    let focus = 50;
    
    // Working hours (better focus during work hours)
    if (environmentData.workingHours) {
      focus += 10;
    } else {
      focus -= 5;
    }
    
    // Location impact
    if (environmentData.location === 'office') {
      focus += 5;
    } else if (environmentData.location === 'home') {
      focus -= 3; // Potential distractions at home
    }
    
    // Network quality (poor network can be distracting)
    if (environmentData.networkQuality === 'poor') {
      focus -= 10;
    } else if (environmentData.networkQuality === 'excellent') {
      focus += 5;
    }
    
    // Device type (desktop generally better for focus)
    if (environmentData.deviceType === 'desktop') {
      focus += 5;
    } else if (environmentData.deviceType === 'mobile') {
      focus -= 10;
    }
    
    return Math.max(0, Math.min(100, focus));
  }

  private predictFocusFromHistory(userHistory: ContextEvent[]): number {
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    
    // Find similar time periods
    const similarEvents = userHistory.filter(event => {
      const eventHour = new Date(event.timestamp).getHours();
      const eventDay = new Date(event.timestamp).getDay();
      return Math.abs(eventHour - currentHour) <= 1 && eventDay === currentDay;
    });
    
    if (similarEvents.length > 0) {
      const avgFocus = similarEvents.reduce((sum, event) => 
        sum + event.context.focusLevel, 0
      ) / similarEvents.length;
      return avgFocus;
    }
    
    // Fallback to overall average
    const overallAvg = userHistory.reduce((sum, event) => 
      sum + event.context.focusLevel, 0
    ) / userHistory.length;
    
    return overallAvg || 50;
  }

  private updateContextHistory(userId: string, context: WorkContext): void {
    let history = this.contextHistory.get(userId) || [];
    
    // Add new context event
    const contextEvent: ContextEvent = {
      id: `${userId}-${Date.now()}`,
      userId,
      eventType: 'activity_change',
      context,
      timestamp: new Date(),
      source: 'context-aggregator'
    };
    
    history.push(contextEvent);
    
    // Keep only recent history (last 100 events)
    if (history.length > 100) {
      history = history.slice(-100);
    }
    
    this.contextHistory.set(userId, history);
  }

  private calculateOverallConfidence(
    inputs: ContextAggregatorInput,
    currentContext?: WorkContext,
    userHistory?: ContextEvent[]
  ): number {
    let confidence = 0.3; // Base confidence
    let factors = 1;

    // Weight confidence based on available data sources
    Object.entries(this.aggregationWeights).forEach(([source, weight]) => {
      if (inputs[source as keyof ContextAggregatorInput]) {
        confidence += weight;
        factors++;
      }
    });

    // Boost confidence if we have historical data
    if (userHistory && userHistory.length > 10) {
      confidence += 0.1;
    }

    // Boost confidence if current context is consistent
    if (currentContext && this.isContextConsistent(inputs, currentContext)) {
      confidence += 0.1;
    }

    // Average and normalize
    confidence = confidence / factors;
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private isContextConsistent(inputs: ContextAggregatorInput, currentContext: WorkContext): boolean {
    // Check if new inputs are consistent with current context
    if (inputs.ideActivity) {
      const ideActivity = this.analyzeIDEActivity(inputs.ideActivity);
      if (ideActivity.activity === currentContext.activityType && ideActivity.confidence > 0.7) {
        return true;
      }
    }
    
    return false;
  }

  private determineActivityType(
    inputs: ContextAggregatorInput,
    currentContext?: WorkContext
  ): WorkContext['activityType'] {
    // Priority order: calendar > IDE activity > git events > current context
    
    if (inputs.calendarData?.inMeeting) {
      return 'meeting';
    }

    if (inputs.ideActivity) {
      const { actionType, fileType, keywords } = inputs.ideActivity;
      
      if (actionType === 'reviewing' || fileType === 'diff') {
        return 'reviewing';
      }
      
      if (keywords?.includes('debug') || keywords?.includes('console.log')) {
        return 'debugging';
      }
      
      if (fileType === 'markdown' && keywords?.some((k: string) => 
        ['plan', 'todo', 'spec', 'requirement'].includes(k.toLowerCase())
      )) {
        return 'planning';
      }
      
      if (actionType === 'editing' && this.isCodeFile(fileType)) {
        return 'coding';
      }
    }

    if (inputs.gitEvents?.length) {
      const latestEvent = inputs.gitEvents[0];
      if (latestEvent.message.toLowerCase().includes('review') || 
          latestEvent.message.toLowerCase().includes('fix')) {
        return 'reviewing';
      }
    }

    return currentContext?.activityType || 'coding';
  }

  private aggregateProjectContext(
    inputs: ContextAggregatorInput,
    currentContext?: WorkContext
  ): ProjectInfo {
    const baseProject = currentContext?.projectContext || {
      projectId: 'unknown',
      name: 'Unknown Project',
      activeFiles: [],
      recentCommits: []
    };

    let updatedProject = { ...baseProject };

    // Update from IDE activity
    if (inputs.ideActivity) {
      const { projectId, projectName, activeFile, repository, branch } = inputs.ideActivity;
      
      if (projectId) updatedProject.projectId = projectId;
      if (projectName) updatedProject.name = projectName;
      if (repository) updatedProject.repository = repository;
      if (branch) updatedProject.currentBranch = branch;
      
      if (activeFile && !updatedProject.activeFiles.includes(activeFile)) {
        updatedProject.activeFiles = [activeFile, ...updatedProject.activeFiles.slice(0, 9)];
      }
    }

    // Update from git events
    if (inputs.gitEvents?.length) {
      const newCommits = inputs.gitEvents.filter(commit => 
        !updatedProject.recentCommits.some(existing => existing.hash === commit.hash)
      );
      
      updatedProject.recentCommits = [
        ...newCommits,
        ...updatedProject.recentCommits
      ].slice(0, 10);
    }

    return updatedProject;
  }

  private calculateFocusLevel(
    inputs: ContextAggregatorInput,
    currentContext?: WorkContext
  ): number {
    let focusLevel = currentContext?.focusLevel || 50;

    // Adjust based on biometric data
    if (inputs.biometricData) {
      const { heartRate, stressLevel, concentration } = inputs.biometricData;
      
      if (concentration !== undefined) {
        focusLevel = concentration;
      } else {
        // Calculate from other biometric indicators
        const heartRateScore = this.normalizeHeartRate(heartRate);
        const stressScore = 100 - (stressLevel || 50);
        focusLevel = (heartRateScore + stressScore) / 2;
      }
    }

    // Adjust based on IDE activity patterns
    if (inputs.ideActivity) {
      const { continuousEditingTime, interruptionCount, keystrokePattern } = inputs.ideActivity;
      
      if (continuousEditingTime > 30) { // 30+ minutes of continuous editing
        focusLevel = Math.min(100, focusLevel + 10);
      }
      
      if (interruptionCount > 5) { // High interruption count
        focusLevel = Math.max(0, focusLevel - 15);
      }
      
      if (keystrokePattern === 'steady') {
        focusLevel = Math.min(100, focusLevel + 5);
      }
    }

    // Adjust based on environment
    if (inputs.environmentData) {
      const { workingHours, location } = inputs.environmentData;
      
      if (!workingHours) {
        focusLevel = Math.max(0, focusLevel - 10);
      }
      
      if (location === 'home') {
        focusLevel = Math.max(0, focusLevel - 5);
      }
    }

    return Math.max(0, Math.min(100, focusLevel));
  }

  private aggregateCollaborationState(
    inputs: ContextAggregatorInput,
    currentContext?: WorkContext
  ) {
    const baseCollaboration = currentContext?.collaborationState || {
      activeCollaborators: [],
      sharedArtifacts: [],
      communicationChannels: [],
      meetingStatus: 'available' as const
    };

    let updatedCollaboration = { ...baseCollaboration };

    // Update from calendar data
    if (inputs.calendarData) {
      const { inMeeting, meetingParticipants, meetingType } = inputs.calendarData;
      
      if (inMeeting) {
        updatedCollaboration.meetingStatus = 'in-meeting';
        if (meetingParticipants) {
          updatedCollaboration.activeCollaborators = meetingParticipants;
        }
      } else {
        updatedCollaboration.meetingStatus = 'available';
      }
    }

    // Update from IDE activity (pair programming, code sharing)
    if (inputs.ideActivity?.collaborators) {
      updatedCollaboration.activeCollaborators = [
        ...new Set([
          ...updatedCollaboration.activeCollaborators,
          ...inputs.ideActivity.collaborators
        ])
      ];
    }

    return updatedCollaboration;
  }

  private aggregateEnvironmentFactors(
    inputs: ContextAggregatorInput,
    currentContext?: WorkContext
  ): EnvironmentData {
    const now = new Date();
    const baseEnvironment = currentContext?.environmentFactors || {
      timeOfDay: now.toTimeString(),
      dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
      workingHours: this.isWorkingHours(now),
      deviceType: 'desktop' as const,
      networkQuality: 'good' as const
    };

    let updatedEnvironment = { ...baseEnvironment };

    // Update from provided environment data
    if (inputs.environmentData) {
      updatedEnvironment = {
        ...updatedEnvironment,
        ...inputs.environmentData
      };
    }

    // Always update time-based factors
    updatedEnvironment.timeOfDay = now.toTimeString();
    updatedEnvironment.dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    updatedEnvironment.workingHours = this.isWorkingHours(now);

    return updatedEnvironment;
  }

  private calculateOverallConfidence(
    inputs: ContextAggregatorInput,
    currentContext?: WorkContext
  ): number {
    let confidence = 0.5; // Base confidence
    let factors = 1;

    // Increase confidence based on available data sources
    if (inputs.ideActivity) {
      confidence += 0.3;
      factors++;
    }

    if (inputs.gitEvents?.length) {
      confidence += 0.2;
      factors++;
    }

    if (inputs.calendarData) {
      confidence += 0.2;
      factors++;
    }

    if (inputs.biometricData) {
      confidence += 0.1;
      factors++;
    }

    if (inputs.environmentData) {
      confidence += 0.1;
      factors++;
    }

    // Average the confidence
    confidence = confidence / factors;

    // Boost confidence if we have historical context
    if (currentContext) {
      confidence = Math.min(1.0, confidence + 0.1);
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private isCodeFile(fileType: string): boolean {
    const codeExtensions = [
      'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php',
      'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'clj', 'hs', 'ml'
    ];
    return codeExtensions.includes(fileType?.toLowerCase() || '');
  }

  private normalizeHeartRate(heartRate?: number): number {
    if (!heartRate) return 50;
    
    // Normalize heart rate to 0-100 scale
    // Assuming resting HR: 60-100, focused work: 70-90
    const minHR = 60;
    const maxHR = 100;
    const optimalHR = 80;
    
    if (heartRate < minHR) return 30;
    if (heartRate > maxHR) return 30;
    
    // Higher score for heart rates closer to optimal
    const distance = Math.abs(heartRate - optimalHR);
    return Math.max(0, 100 - (distance * 5));
  }

  private isWorkingHours(date: Date): boolean {
    const hour = date.getHours();
    const day = date.getDay();
    
    // Monday to Friday, 9 AM to 5 PM
    return day >= 1 && day <= 5 && hour >= 9 && hour <= 17;
  }
}