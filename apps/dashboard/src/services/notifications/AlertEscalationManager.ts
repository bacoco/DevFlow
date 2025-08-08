import {
  Notification,
  NotificationPriority,
  NotificationChannelPreferences,
  EscalationRule,
  EscalationCondition,
  UserAvailability,
  NotificationPreferences
} from './types';

export class AlertEscalationManager {
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();
  private escalationHistory: Map<string, EscalationAttempt[]> = new Map();
  private availabilityMonitor: UserAvailabilityMonitor;

  constructor(
    private preferencesService: NotificationPreferencesService,
    private deliveryService: NotificationDeliveryService,
    private analyticsService: NotificationAnalyticsService
  ) {
    this.availabilityMonitor = new UserAvailabilityMonitor();
    this.initializeEscalationRules().catch(error => {
      console.warn('Failed to initialize escalation rules:', error);
    });
  }

  /**
   * Initiates escalation process for a notification
   */
  async initiateEscalation(
    notification: Notification,
    userId: string
  ): Promise<void> {
    const preferences = await this.preferencesService.getPreferences(userId);
    
    if (!preferences.escalation.enabled) {
      return;
    }

    const escalationRules = await this.getEscalationRules(notification, preferences);
    
    if (escalationRules.length === 0) {
      return;
    }

    // Initialize escalation history
    this.escalationHistory.set(notification.id, []);

    // Schedule first escalation
    await this.scheduleNextEscalation(notification, userId, escalationRules, 0);
  }

  /**
   * Cancels escalation for a notification (e.g., when user interacts)
   */
  async cancelEscalation(notificationId: string): Promise<void> {
    const timer = this.escalationTimers.get(notificationId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(notificationId);
    }

    // Record cancellation in history
    const history = this.escalationHistory.get(notificationId) || [];
    history.push({
      timestamp: new Date(),
      level: history.length,
      channel: 'cancelled',
      success: true,
      reason: 'user_interaction'
    });
    this.escalationHistory.set(notificationId, history);
  }

  /**
   * Checks if escalation should proceed based on user availability
   */
  async shouldEscalate(
    notification: Notification,
    userId: string,
    escalationLevel: number
  ): Promise<EscalationDecision> {
    const availability = await this.availabilityMonitor.getUserAvailability(userId);
    const preferences = await this.preferencesService.getPreferences(userId);
    const history = this.escalationHistory.get(notification.id) || [];

    // Check if max escalations reached
    if (history.length >= preferences.escalation.maxEscalations) {
      return {
        shouldEscalate: false,
        reason: 'max_escalations_reached',
        nextAttemptDelay: null
      };
    }

    // Check user availability
    const availabilityCheck = this.checkUserAvailability(
      availability,
      notification.priority,
      escalationLevel
    );

    if (!availabilityCheck.available) {
      return {
        shouldEscalate: false,
        reason: 'user_unavailable',
        nextAttemptDelay: availabilityCheck.retryAfter
      };
    }

    // Check escalation conditions
    const conditionsMet = await this.checkEscalationConditions(
      notification,
      userId,
      escalationLevel
    );

    return {
      shouldEscalate: conditionsMet,
      reason: conditionsMet ? 'conditions_met' : 'conditions_not_met',
      nextAttemptDelay: conditionsMet ? null : 5 * 60 * 1000 // 5 minutes
    };
  }

  /**
   * Performs escalation to the next level/channel
   */
  async performEscalation(
    notification: Notification,
    userId: string,
    escalationLevel: number,
    targetChannel: keyof NotificationChannelPreferences
  ): Promise<EscalationResult> {
    const startTime = new Date();
    
    try {
      // Create escalated notification
      const escalatedNotification = this.createEscalatedNotification(
        notification,
        escalationLevel,
        targetChannel
      );

      // Deliver via target channel
      const deliveryResult = await this.deliveryService.deliver(
        escalatedNotification,
        userId,
        targetChannel
      );

      // Record successful escalation
      const attempt: EscalationAttempt = {
        timestamp: startTime,
        level: escalationLevel,
        channel: targetChannel,
        success: deliveryResult.success,
        reason: deliveryResult.success ? 'delivered' : deliveryResult.error || 'unknown_error',
        deliveryTime: new Date().getTime() - startTime.getTime()
      };

      const history = this.escalationHistory.get(notification.id) || [];
      history.push(attempt);
      this.escalationHistory.set(notification.id, history);

      // Record analytics
      await this.analyticsService.recordEscalation({
        notificationId: notification.id,
        userId,
        escalationLevel,
        channel: targetChannel,
        success: deliveryResult.success,
        timestamp: startTime
      });

      return {
        success: deliveryResult.success,
        escalationLevel,
        channel: targetChannel,
        deliveryTime: attempt.deliveryTime,
        error: deliveryResult.error
      };

    } catch (error) {
      const attempt: EscalationAttempt = {
        timestamp: startTime,
        level: escalationLevel,
        channel: targetChannel,
        success: false,
        reason: error instanceof Error ? error.message : 'unknown_error',
        deliveryTime: new Date().getTime() - startTime.getTime()
      };

      const history = this.escalationHistory.get(notification.id) || [];
      history.push(attempt);
      this.escalationHistory.set(notification.id, history);

      return {
        success: false,
        escalationLevel,
        channel: targetChannel,
        deliveryTime: attempt.deliveryTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Gets escalation analytics for optimization
   */
  async getEscalationAnalytics(userId: string): Promise<EscalationAnalytics> {
    const userHistory = Array.from(this.escalationHistory.values())
      .flat()
      .filter(attempt => attempt.timestamp > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // Last 30 days

    const totalEscalations = userHistory.length;
    const successfulEscalations = userHistory.filter(a => a.success).length;
    const averageDeliveryTime = userHistory.reduce((sum, a) => sum + a.deliveryTime, 0) / totalEscalations;

    const channelEffectiveness = this.calculateChannelEffectiveness(userHistory);
    const optimalEscalationTiming = this.calculateOptimalTiming(userHistory);

    return {
      totalEscalations,
      successRate: totalEscalations > 0 ? successfulEscalations / totalEscalations : 0,
      averageDeliveryTime,
      channelEffectiveness,
      optimalEscalationTiming,
      recommendations: this.generateEscalationRecommendations(userHistory)
    };
  }

  /**
   * Optimizes escalation rules based on user behavior
   */
  async optimizeEscalationRules(userId: string): Promise<EscalationRule[]> {
    const analytics = await this.getEscalationAnalytics(userId);
    const preferences = await this.preferencesService.getPreferences(userId);
    const currentRules = await this.getEscalationRules(
      { priority: 'high' } as Notification, 
      preferences
    );

    const optimizedRules: EscalationRule[] = [];

    // Optimize delays based on successful escalation timing
    for (const rule of currentRules) {
      const optimizedRule = { ...rule };
      
      if (analytics.optimalEscalationTiming[rule.priority]) {
        optimizedRule.delay = analytics.optimalEscalationTiming[rule.priority];
      }

      // Optimize target channel based on effectiveness
      const mostEffectiveChannel = Object.entries(analytics.channelEffectiveness)
        .sort(([,a], [,b]) => b - a)[0];
      
      if (mostEffectiveChannel) {
        optimizedRule.targetChannel = mostEffectiveChannel[0] as keyof NotificationChannelPreferences;
      }

      optimizedRules.push(optimizedRule);
    }

    return optimizedRules;
  }

  private async initializeEscalationRules(): Promise<void> {
    // Initialize default escalation rules
    // In a real implementation, this would load from configuration
  }

  private async getEscalationRules(
    notification: Notification,
    preferences: NotificationPreferences
  ): Promise<EscalationRule[]> {
    const rules: EscalationRule[] = [];

    if (!preferences.escalation.enabled) {
      return rules;
    }

    // Create escalation rules based on priority
    const delays = {
      urgent: preferences.escalation.urgentDelay,
      high: preferences.escalation.highDelay,
      medium: preferences.escalation.highDelay * 2,
      low: preferences.escalation.highDelay * 4
    };

    const delay = delays[notification.priority];
    
    preferences.escalation.escalationChannels.forEach((channel, index) => {
      rules.push({
        id: `${notification.id}_${index}`,
        userId: preferences.userId,
        category: notification.category,
        priority: notification.priority,
        delay: delay * (index + 1),
        targetChannel: channel,
        condition: {
          type: 'time_based',
          parameters: { delay }
        }
      });
    });

    return rules;
  }

  private async scheduleNextEscalation(
    notification: Notification,
    userId: string,
    rules: EscalationRule[],
    currentLevel: number
  ): Promise<void> {
    if (currentLevel >= rules.length) {
      return; // No more escalation levels
    }

    const rule = rules[currentLevel];
    const timer = setTimeout(async () => {
      const decision = await this.shouldEscalate(notification, userId, currentLevel);
      
      if (decision.shouldEscalate) {
        const result = await this.performEscalation(
          notification,
          userId,
          currentLevel,
          rule.targetChannel
        );

        if (result.success) {
          // Schedule next escalation level
          await this.scheduleNextEscalation(notification, userId, rules, currentLevel + 1);
        } else {
          // Retry current level after delay
          setTimeout(() => {
            this.scheduleNextEscalation(notification, userId, rules, currentLevel);
          }, 5 * 60 * 1000); // 5 minutes
        }
      } else if (decision.nextAttemptDelay) {
        // Retry later
        setTimeout(() => {
          this.scheduleNextEscalation(notification, userId, rules, currentLevel);
        }, decision.nextAttemptDelay);
      }
    }, rule.delay * 60 * 1000); // Convert minutes to milliseconds

    this.escalationTimers.set(notification.id, timer);
  }

  private checkUserAvailability(
    availability: UserAvailability,
    priority: NotificationPriority,
    escalationLevel: number
  ): { available: boolean; retryAfter?: number } {
    // Always escalate urgent notifications
    if (priority === 'urgent') {
      return { available: true };
    }

    // Check user status
    switch (availability.status) {
      case 'available':
        return { available: true };
      case 'busy':
        // Allow escalation for high priority after level 1
        return { 
          available: priority === 'high' && escalationLevel > 0,
          retryAfter: escalationLevel === 0 ? 15 * 60 * 1000 : undefined // 15 minutes
        };
      case 'away':
        return { 
          available: false,
          retryAfter: 30 * 60 * 1000 // 30 minutes
        };
      case 'do_not_disturb':
        return { 
          available: priority === 'urgent',
          retryAfter: priority !== 'urgent' ? 60 * 60 * 1000 : undefined // 1 hour
        };
      default:
        return { available: false };
    }
  }

  private async checkEscalationConditions(
    notification: Notification,
    userId: string,
    escalationLevel: number
  ): Promise<boolean> {
    // Check if user has interacted with the notification
    const hasInteracted = await this.analyticsService.hasUserInteracted(
      notification.id,
      userId
    );

    if (hasInteracted) {
      return false; // Don't escalate if user has already seen/interacted
    }

    // Check if similar notifications were recently escalated
    const recentEscalations = await this.analyticsService.getRecentEscalations(
      userId,
      notification.category,
      60 * 60 * 1000 // 1 hour
    );

    if (recentEscalations.length > 2) {
      return false; // Avoid escalation fatigue
    }

    return true;
  }

  private createEscalatedNotification(
    original: Notification,
    escalationLevel: number,
    targetChannel: keyof NotificationChannelPreferences
  ): Notification {
    const escalationSuffix = escalationLevel > 0 ? ` (Escalation ${escalationLevel + 1})` : '';
    
    return {
      ...original,
      id: `${original.id}_escalation_${escalationLevel}`,
      title: `${original.title}${escalationSuffix}`,
      message: `${original.message}\n\nThis is an escalated notification due to no response.`,
      priority: this.escalatePriority(original.priority),
      metadata: {
        ...original.metadata,
        escalationLevel,
        originalNotificationId: original.id,
        targetChannel
      }
    };
  }

  private escalatePriority(priority: NotificationPriority): NotificationPriority {
    const escalationMap: Record<NotificationPriority, NotificationPriority> = {
      low: 'medium',
      medium: 'high',
      high: 'urgent',
      urgent: 'urgent'
    };
    return escalationMap[priority];
  }

  private calculateChannelEffectiveness(
    history: EscalationAttempt[]
  ): Record<string, number> {
    const channelStats: Record<string, { total: number; successful: number }> = {};

    history.forEach(attempt => {
      if (!channelStats[attempt.channel]) {
        channelStats[attempt.channel] = { total: 0, successful: 0 };
      }
      channelStats[attempt.channel].total++;
      if (attempt.success) {
        channelStats[attempt.channel].successful++;
      }
    });

    const effectiveness: Record<string, number> = {};
    Object.entries(channelStats).forEach(([channel, stats]) => {
      effectiveness[channel] = stats.total > 0 ? stats.successful / stats.total : 0;
    });

    return effectiveness;
  }

  private calculateOptimalTiming(
    history: EscalationAttempt[]
  ): Record<NotificationPriority, number> {
    // Simplified implementation - would analyze successful escalation timing
    return {
      urgent: 2, // 2 minutes
      high: 10, // 10 minutes
      medium: 30, // 30 minutes
      low: 60 // 60 minutes
    };
  }

  private generateEscalationRecommendations(
    history: EscalationAttempt[]
  ): EscalationRecommendation[] {
    const recommendations: EscalationRecommendation[] = [];

    // Analyze failure patterns
    const failedAttempts = history.filter(a => !a.success);
    if (failedAttempts.length > history.length * 0.3) {
      recommendations.push({
        type: 'reduce_escalation_frequency',
        description: 'Consider reducing escalation frequency due to high failure rate',
        impact: 'medium'
      });
    }

    // Analyze channel effectiveness
    const channelEffectiveness = this.calculateChannelEffectiveness(history);
    const leastEffective = Object.entries(channelEffectiveness)
      .sort(([,a], [,b]) => a - b)[0];

    if (leastEffective && leastEffective[1] < 0.3) {
      recommendations.push({
        type: 'disable_ineffective_channel',
        description: `Consider disabling ${leastEffective[0]} channel due to low effectiveness`,
        impact: 'low'
      });
    }

    return recommendations;
  }
}

// Supporting classes and interfaces
class UserAvailabilityMonitor {
  async getUserAvailability(userId: string): Promise<UserAvailability> {
    // Implementation would monitor user activity, calendar, etc.
    return {
      userId,
      status: 'available',
      lastActivity: new Date(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }
}

interface EscalationAttempt {
  timestamp: Date;
  level: number;
  channel: string;
  success: boolean;
  reason: string;
  deliveryTime?: number;
}

interface EscalationDecision {
  shouldEscalate: boolean;
  reason: string;
  nextAttemptDelay: number | null;
}

interface EscalationResult {
  success: boolean;
  escalationLevel: number;
  channel: keyof NotificationChannelPreferences;
  deliveryTime: number;
  error?: string;
}

interface EscalationAnalytics {
  totalEscalations: number;
  successRate: number;
  averageDeliveryTime: number;
  channelEffectiveness: Record<string, number>;
  optimalEscalationTiming: Record<NotificationPriority, number>;
  recommendations: EscalationRecommendation[];
}

interface EscalationRecommendation {
  type: 'reduce_escalation_frequency' | 'disable_ineffective_channel' | 'optimize_timing';
  description: string;
  impact: 'low' | 'medium' | 'high';
}

interface NotificationPreferencesService {
  getPreferences(userId: string): Promise<NotificationPreferences>;
}

interface NotificationDeliveryService {
  deliver(
    notification: Notification,
    userId: string,
    channel: keyof NotificationChannelPreferences
  ): Promise<{ success: boolean; error?: string }>;
}

interface NotificationAnalyticsService {
  recordEscalation(data: any): Promise<void>;
  hasUserInteracted(notificationId: string, userId: string): Promise<boolean>;
  getRecentEscalations(userId: string, category: any, timeWindow: number): Promise<any[]>;
}