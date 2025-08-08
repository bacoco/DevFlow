import {
  Notification,
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  DismissalPattern,
  NotificationAnalytics,
  UserAvailability,
  NotificationPreferences
} from './types';

export class ContextualNotificationEngine {
  private dismissalPatterns: Map<string, DismissalPattern[]> = new Map();
  private userAvailability: Map<string, UserAvailability> = new Map();
  private learningThreshold = 10; // Minimum interactions needed for learning

  constructor(
    private analyticsService: NotificationAnalyticsService,
    private preferencesService: NotificationPreferencesService
  ) {
    // Initialize learning patterns asynchronously
    this.initializeLearning().catch(error => {
      console.warn('Failed to initialize contextual notification engine:', error);
    });
  }

  /**
   * Determines if a notification should be shown based on user patterns and context
   */
  async shouldShowNotification(
    notification: Notification,
    userId: string
  ): Promise<boolean> {
    const userPatterns = await this.getUserDismissalPatterns(userId);
    const availability = await this.getUserAvailability(userId);
    const preferences = await this.preferencesService.getPreferences(userId);

    // Check if user is in quiet hours
    if (this.isInQuietHours(preferences, notification.priority)) {
      return false;
    }

    // Check user availability for non-urgent notifications
    if (notification.priority !== 'urgent' && !this.isUserAvailable(availability)) {
      return false;
    }

    // Apply machine learning-based filtering
    const relevanceScore = this.calculateRelevanceScore(
      notification,
      userPatterns,
      availability
    );

    // Dynamic threshold based on notification priority
    const threshold = this.getRelevanceThreshold(notification.priority);
    
    return relevanceScore >= threshold;
  }

  /**
   * Learns from user dismissal patterns to improve future recommendations
   */
  async learnFromUserInteraction(
    userId: string,
    notification: Notification,
    action: 'viewed' | 'clicked' | 'dismissed' | 'snoozed'
  ): Promise<void> {
    const analytics: NotificationAnalytics = {
      userId,
      notificationId: notification.id,
      event: action,
      timestamp: new Date(),
      context: await this.getCurrentContext(userId)
    };

    await this.analyticsService.recordEvent(analytics);
    await this.updateDismissalPatterns(userId, notification, action);
  }

  /**
   * Gets personalized notification timing based on user patterns
   */
  async getOptimalDeliveryTime(
    notification: Notification,
    userId: string
  ): Promise<Date> {
    const patterns = await this.getUserDismissalPatterns(userId);
    const availability = await this.getUserAvailability(userId);
    const preferences = await this.preferencesService.getPreferences(userId);

    // Find optimal time based on historical engagement
    const optimalHour = this.findOptimalHour(patterns, notification.category);
    
    // Respect user's working hours and quiet hours
    const deliveryTime = this.adjustForUserSchedule(
      optimalHour,
      preferences,
      availability
    );

    return deliveryTime;
  }

  /**
   * Suggests notification content optimization based on user engagement
   */
  async suggestContentOptimization(
    notification: Notification,
    userId: string
  ): Promise<Partial<Notification>> {
    const patterns = await this.getUserDismissalPatterns(userId);
    const categoryPattern = patterns.find(p => p.category === notification.category);

    if (!categoryPattern || categoryPattern.dismissalRate < this.learningThreshold) {
      return {}; // Not enough data for optimization
    }

    const suggestions: Partial<Notification> = {};

    // Suggest priority adjustment based on user engagement
    if (categoryPattern.dismissalRate > 0.8) {
      suggestions.priority = this.lowerPriority(notification.priority);
    } else if (categoryPattern.dismissalRate < 0.2) {
      suggestions.priority = this.raisePriority(notification.priority);
    }

    // Suggest preferred actions based on user behavior
    if (categoryPattern.preferredActions.length > 0) {
      suggestions.actions = this.generatePreferredActions(
        categoryPattern.preferredActions,
        notification
      );
    }

    return suggestions;
  }

  private async initializeLearning(): Promise<void> {
    try {
      // Load existing dismissal patterns from storage
      const patterns = await this.analyticsService.getDismissalPatterns();
      if (patterns && Array.isArray(patterns)) {
        patterns.forEach(pattern => {
          const userPatterns = this.dismissalPatterns.get(pattern.userId) || [];
          userPatterns.push(pattern);
          this.dismissalPatterns.set(pattern.userId, userPatterns);
        });
      }
    } catch (error) {
      console.warn('Failed to initialize learning patterns:', error);
    }
  }

  private async getUserDismissalPatterns(userId: string): Promise<DismissalPattern[]> {
    if (!this.dismissalPatterns.has(userId)) {
      const patterns = await this.analyticsService.getUserDismissalPatterns(userId);
      this.dismissalPatterns.set(userId, patterns);
    }
    return this.dismissalPatterns.get(userId) || [];
  }

  private async getUserAvailability(userId: string): Promise<UserAvailability> {
    if (!this.userAvailability.has(userId)) {
      const availability = await this.analyticsService.getUserAvailability(userId);
      this.userAvailability.set(userId, availability);
    }
    return this.userAvailability.get(userId)!;
  }

  private calculateRelevanceScore(
    notification: Notification,
    patterns: DismissalPattern[],
    availability: UserAvailability
  ): number {
    let score = 0.5; // Base score

    // Factor in dismissal patterns
    const categoryPattern = patterns.find(p => p.category === notification.category);
    if (categoryPattern) {
      // Lower score for frequently dismissed categories
      score *= (1 - categoryPattern.dismissalRate * 0.5);
      
      // Adjust for average time to action (faster action = higher relevance)
      if (categoryPattern.averageTimeToAction < 30000) { // 30 seconds
        score += 0.2;
      }
    }

    // Factor in user availability
    if (availability.status === 'available') {
      score += 0.1;
    } else if (availability.status === 'do_not_disturb') {
      score -= 0.3;
    }

    // Factor in notification priority
    const priorityBonus = {
      low: 0,
      medium: 0.1,
      high: 0.2,
      urgent: 0.3
    };
    score += priorityBonus[notification.priority];

    // Factor in recency of similar notifications
    const recentSimilar = this.countRecentSimilarNotifications(
      notification,
      patterns
    );
    if (recentSimilar > 2) {
      score -= 0.2; // Reduce score for notification fatigue
    }

    return Math.max(0, Math.min(1, score));
  }

  private getRelevanceThreshold(priority: NotificationPriority): number {
    const thresholds = {
      low: 0.7,
      medium: 0.5,
      high: 0.3,
      urgent: 0.1
    };
    return thresholds[priority];
  }

  private isInQuietHours(
    preferences: NotificationPreferences,
    priority: NotificationPriority
  ): boolean {
    if (!preferences.quietHours.enabled) {
      return false;
    }

    if (priority === 'urgent' && preferences.quietHours.allowUrgent) {
      return false;
    }

    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: preferences.quietHours.timezone
    });

    const startTime = preferences.quietHours.startTime;
    const endTime = preferences.quietHours.endTime;

    // Handle overnight quiet hours (e.g., 22:00 to 06:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    }

    return currentTime >= startTime && currentTime <= endTime;
  }

  private isUserAvailable(availability: UserAvailability): boolean {
    return availability.status === 'available' || availability.status === 'busy';
  }

  private async updateDismissalPatterns(
    userId: string,
    notification: Notification,
    action: string
  ): Promise<void> {
    const patterns = await this.getUserDismissalPatterns(userId);
    let pattern = patterns.find(p => 
      p.category === notification.category && p.type === notification.type
    );

    if (!pattern) {
      pattern = {
        userId,
        category: notification.category,
        type: notification.type,
        dismissalRate: 0,
        averageTimeToAction: 0,
        preferredActions: [],
        lastUpdated: new Date()
      };
      patterns.push(pattern);
    }

    // Update dismissal rate
    if (action === 'dismissed') {
      pattern.dismissalRate = Math.min(1, pattern.dismissalRate + 0.1);
    } else if (action === 'clicked') {
      pattern.dismissalRate = Math.max(0, pattern.dismissalRate - 0.05);
    }

    // Update preferred actions
    if (action === 'clicked' && notification.actions) {
      const actionId = notification.actions[0]?.id; // Simplified for demo
      if (actionId && !pattern.preferredActions.includes(actionId)) {
        pattern.preferredActions.push(actionId);
      }
    }

    pattern.lastUpdated = new Date();
    this.dismissalPatterns.set(userId, patterns);

    // Persist to storage
    await this.analyticsService.updateDismissalPattern(pattern);
  }

  private findOptimalHour(
    patterns: DismissalPattern[],
    category: NotificationCategory
  ): number {
    // Simplified: return 9 AM as default optimal time
    // In a real implementation, this would analyze historical engagement data
    return 9;
  }

  private adjustForUserSchedule(
    optimalHour: number,
    preferences: NotificationPreferences,
    availability: UserAvailability
  ): Date {
    const now = new Date();
    const deliveryTime = new Date(now);
    deliveryTime.setHours(optimalHour, 0, 0, 0);

    // If optimal time has passed today, schedule for tomorrow
    if (deliveryTime <= now) {
      deliveryTime.setDate(deliveryTime.getDate() + 1);
    }

    return deliveryTime;
  }

  private lowerPriority(priority: NotificationPriority): NotificationPriority {
    const priorities: NotificationPriority[] = ['low', 'medium', 'high', 'urgent'];
    const currentIndex = priorities.indexOf(priority);
    return priorities[Math.max(0, currentIndex - 1)];
  }

  private raisePriority(priority: NotificationPriority): NotificationPriority {
    const priorities: NotificationPriority[] = ['low', 'medium', 'high', 'urgent'];
    const currentIndex = priorities.indexOf(priority);
    return priorities[Math.min(priorities.length - 1, currentIndex + 1)];
  }

  private generatePreferredActions(
    preferredActionIds: string[],
    notification: Notification
  ): any[] {
    // Simplified implementation - would generate actions based on preferences
    return notification.actions || [];
  }

  private countRecentSimilarNotifications(
    notification: Notification,
    patterns: DismissalPattern[]
  ): number {
    // Simplified implementation - would count recent notifications of same category
    return 0;
  }

  private async getCurrentContext(userId: string): Promise<any> {
    // Get current user context (page, activity, etc.)
    return {
      channel: 'inApp',
      deviceType: 'desktop',
      location: window.location.pathname,
      userActivity: 'active'
    };
  }
}

// Supporting service interfaces
interface NotificationAnalyticsService {
  recordEvent(analytics: NotificationAnalytics): Promise<void>;
  getDismissalPatterns(): Promise<DismissalPattern[]>;
  getUserDismissalPatterns(userId: string): Promise<DismissalPattern[]>;
  getUserAvailability(userId: string): Promise<UserAvailability>;
  updateDismissalPattern(pattern: DismissalPattern): Promise<void>;
}

interface NotificationPreferencesService {
  getPreferences(userId: string): Promise<NotificationPreferences>;
  updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void>;
}