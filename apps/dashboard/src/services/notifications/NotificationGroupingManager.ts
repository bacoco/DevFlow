import {
  Notification,
  NotificationGroup,
  NotificationCategory,
  NotificationPriority,
  NotificationBatch,
  NotificationPreferences
} from './types';

export class NotificationGroupingManager {
  private groups: Map<string, NotificationGroup> = new Map();
  private batches: Map<string, NotificationBatch> = new Map();
  private groupingRules: GroupingRule[] = [];

  constructor(
    private preferencesService: NotificationPreferencesService,
    private schedulerService: NotificationSchedulerService
  ) {
    this.initializeGroupingRules();
  }

  /**
   * Groups notifications based on category, time, and content similarity
   */
  async groupNotifications(
    notifications: Notification[],
    userId: string
  ): Promise<NotificationGroup[]> {
    const preferences = await this.preferencesService.getPreferences(userId);
    const groups: Map<string, NotificationGroup> = new Map();

    for (const notification of notifications) {
      const groupKey = this.generateGroupKey(notification, preferences);
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          id: groupKey,
          title: this.generateGroupTitle(notification),
          notifications: [],
          category: notification.category,
          priority: notification.priority,
          createdAt: new Date(),
          collapsed: this.shouldCollapseGroup(notification.category, preferences)
        });
      }

      const group = groups.get(groupKey)!;
      group.notifications.push(notification);
      
      // Update group priority to highest priority notification
      if (this.getPriorityWeight(notification.priority) > this.getPriorityWeight(group.priority)) {
        group.priority = notification.priority;
      }
    }

    // Sort groups by priority and recency
    return Array.from(groups.values()).sort((a, b) => {
      const priorityDiff = this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority);
      if (priorityDiff !== 0) return priorityDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  /**
   * Creates batches for notifications based on user preferences
   */
  async createNotificationBatches(
    notifications: Notification[],
    userId: string
  ): Promise<NotificationBatch[]> {
    const preferences = await this.preferencesService.getPreferences(userId);
    const batches: Map<string, NotificationBatch> = new Map();

    for (const notification of notifications) {
      const batchKey = this.getBatchKey(notification, preferences);
      const scheduledTime = this.calculateBatchDeliveryTime(notification, preferences);

      if (!batches.has(batchKey)) {
        batches.set(batchKey, {
          id: batchKey,
          userId,
          notifications: [],
          scheduledFor: scheduledTime,
          delivered: false,
          category: notification.category
        });
      }

      batches.get(batchKey)!.notifications.push(notification);
    }

    // Schedule batch deliveries
    for (const batch of batches.values()) {
      await this.schedulerService.scheduleBatch(batch);
    }

    return Array.from(batches.values());
  }

  /**
   * Manages batch operations like mark all as read, dismiss all, etc.
   */
  async performBatchOperation(
    operation: BatchOperation,
    groupId: string,
    userId: string
  ): Promise<BatchOperationResult> {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    const results: NotificationOperationResult[] = [];

    for (const notification of group.notifications) {
      try {
        const result = await this.performSingleOperation(operation, notification, userId);
        results.push(result);
      } catch (error) {
        results.push({
          notificationId: notification.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Update group state based on operation
    await this.updateGroupAfterBatchOperation(group, operation, results);

    return {
      groupId,
      operation,
      results,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length
    };
  }

  /**
   * Intelligently merges similar notifications to reduce noise
   */
  async mergeNotifications(
    notifications: Notification[],
    userId: string
  ): Promise<Notification[]> {
    const preferences = await this.preferencesService.getPreferences(userId);
    const merged: Notification[] = [];
    const processed = new Set<string>();

    for (const notification of notifications) {
      if (processed.has(notification.id)) continue;

      const similar = this.findSimilarNotifications(notification, notifications);
      
      if (similar.length > 1) {
        const mergedNotification = this.createMergedNotification(similar, preferences);
        merged.push(mergedNotification);
        similar.forEach(n => processed.add(n.id));
      } else {
        merged.push(notification);
        processed.add(notification.id);
      }
    }

    return merged;
  }

  /**
   * Provides smart suggestions for notification management
   */
  async getSuggestions(
    notifications: Notification[],
    userId: string
  ): Promise<NotificationSuggestion[]> {
    const suggestions: NotificationSuggestion[] = [];
    const preferences = await this.preferencesService.getPreferences(userId);

    // Suggest grouping for similar notifications
    const ungrouped = notifications.filter(n => !n.groupId);
    if (ungrouped.length > 5) {
      suggestions.push({
        type: 'group_similar',
        title: 'Group Similar Notifications',
        description: `You have ${ungrouped.length} ungrouped notifications that could be organized`,
        action: () => this.groupNotifications(ungrouped, userId),
        priority: 'medium'
      });
    }

    // Suggest batch dismissal for old notifications
    const oldNotifications = notifications.filter(n => 
      Date.now() - n.timestamp.getTime() > 24 * 60 * 60 * 1000 // 24 hours
    );
    if (oldNotifications.length > 10) {
      suggestions.push({
        type: 'batch_dismiss',
        title: 'Clear Old Notifications',
        description: `Dismiss ${oldNotifications.length} notifications older than 24 hours`,
        action: () => this.performBatchOperation('dismiss', 'old', userId),
        priority: 'low'
      });
    }

    // Suggest preference adjustments based on dismissal patterns
    const highDismissalCategories = await this.getHighDismissalCategories(userId);
    if (highDismissalCategories.length > 0) {
      suggestions.push({
        type: 'adjust_preferences',
        title: 'Reduce Notification Frequency',
        description: `Consider reducing notifications for ${highDismissalCategories.join(', ')}`,
        action: () => this.suggestPreferenceAdjustments(highDismissalCategories, userId),
        priority: 'medium'
      });
    }

    return suggestions;
  }

  private initializeGroupingRules(): void {
    this.groupingRules = [
      {
        name: 'category_time',
        condition: (n1, n2) => 
          n1.category === n2.category && 
          Math.abs(n1.timestamp.getTime() - n2.timestamp.getTime()) < 60 * 60 * 1000, // 1 hour
        priority: 1
      },
      {
        name: 'same_type',
        condition: (n1, n2) => n1.type === n2.type,
        priority: 2
      },
      {
        name: 'content_similarity',
        condition: (n1, n2) => this.calculateContentSimilarity(n1, n2) > 0.7,
        priority: 3
      }
    ];
  }

  private generateGroupKey(
    notification: Notification,
    preferences: NotificationPreferences
  ): string {
    // Generate a key for grouping based on category and time window
    const timeWindow = this.getTimeWindow(notification.timestamp, preferences);
    return `${notification.category}_${timeWindow}`;
  }

  private generateGroupTitle(notification: Notification): string {
    const categoryTitles: Record<NotificationCategory, string> = {
      performance: 'Performance Updates',
      collaboration: 'Team Activity',
      system: 'System Notifications',
      personal: 'Personal Insights',
      team: 'Team Insights',
      security: 'Security Alerts'
    };

    return categoryTitles[notification.category] || 'Notifications';
  }

  private shouldCollapseGroup(
    category: NotificationCategory,
    preferences: NotificationPreferences
  ): boolean {
    // Collapse groups for categories with lower priority in user preferences
    const categoryPref = preferences.categories[category];
    return categoryPref?.priority === 'low';
  }

  private getPriorityWeight(priority: NotificationPriority): number {
    const weights = { low: 1, medium: 2, high: 3, urgent: 4 };
    return weights[priority];
  }

  private getBatchKey(
    notification: Notification,
    preferences: NotificationPreferences
  ): string {
    const frequency = this.getNotificationFrequency(notification.category, preferences);
    const timeKey = this.getBatchTimeKey(frequency);
    return `${notification.category}_${frequency}_${timeKey}`;
  }

  private calculateBatchDeliveryTime(
    notification: Notification,
    preferences: NotificationPreferences
  ): Date {
    const frequency = this.getNotificationFrequency(notification.category, preferences);
    const now = new Date();

    switch (frequency) {
      case 'immediate':
        return now;
      case 'batched':
        // Next hour boundary
        const nextHour = new Date(now);
        nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
        return nextHour;
      case 'daily':
        // Next 9 AM
        const nextDay = new Date(now);
        nextDay.setDate(nextDay.getDate() + 1);
        nextDay.setHours(9, 0, 0, 0);
        return nextDay;
      case 'weekly':
        // Next Monday 9 AM
        const nextWeek = new Date(now);
        const daysUntilMonday = (8 - nextWeek.getDay()) % 7 || 7;
        nextWeek.setDate(nextWeek.getDate() + daysUntilMonday);
        nextWeek.setHours(9, 0, 0, 0);
        return nextWeek;
      default:
        return now;
    }
  }

  private async performSingleOperation(
    operation: BatchOperation,
    notification: Notification,
    userId: string
  ): Promise<NotificationOperationResult> {
    switch (operation) {
      case 'mark_read':
        notification.read = true;
        break;
      case 'dismiss':
        notification.dismissed = true;
        break;
      case 'snooze':
        // Snooze for 1 hour
        notification.expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return {
      notificationId: notification.id,
      success: true
    };
  }

  private async updateGroupAfterBatchOperation(
    group: NotificationGroup,
    operation: BatchOperation,
    results: NotificationOperationResult[]
  ): Promise<void> {
    if (operation === 'dismiss') {
      // Remove dismissed notifications from group
      group.notifications = group.notifications.filter(n => !n.dismissed);
    }

    // Update group if empty
    if (group.notifications.length === 0) {
      this.groups.delete(group.id);
    }
  }

  private findSimilarNotifications(
    target: Notification,
    notifications: Notification[]
  ): Notification[] {
    return notifications.filter(n => 
      n.id !== target.id &&
      n.category === target.category &&
      this.calculateContentSimilarity(target, n) > 0.6
    );
  }

  private createMergedNotification(
    notifications: Notification[],
    preferences: NotificationPreferences
  ): Notification {
    const first = notifications[0];
    const count = notifications.length;

    return {
      ...first,
      id: `merged_${first.id}`,
      title: `${first.title} and ${count - 1} more`,
      message: `${count} similar notifications`,
      metadata: {
        ...first.metadata,
        mergedNotifications: notifications.map(n => n.id),
        mergedCount: count
      }
    };
  }

  private calculateContentSimilarity(n1: Notification, n2: Notification): number {
    // Simplified similarity calculation
    const titleSimilarity = this.stringSimilarity(n1.title, n2.title);
    const messageSimilarity = this.stringSimilarity(n1.message, n2.message);
    return (titleSimilarity + messageSimilarity) / 2;
  }

  private stringSimilarity(str1: string, str2: string): number {
    // Simple Jaccard similarity
    const set1 = new Set(str1.toLowerCase().split(' '));
    const set2 = new Set(str2.toLowerCase().split(' '));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }

  private getTimeWindow(timestamp: Date, preferences: NotificationPreferences): string {
    // Group notifications within 1-hour windows
    const hour = Math.floor(timestamp.getTime() / (60 * 60 * 1000));
    return hour.toString();
  }

  private getNotificationFrequency(
    category: NotificationCategory,
    preferences: NotificationPreferences
  ): keyof NotificationFrequencyPreferences {
    const { frequency } = preferences;
    
    if (frequency.immediate.includes(category)) return 'immediate';
    if (frequency.batched.includes(category)) return 'batched';
    if (frequency.daily.includes(category)) return 'daily';
    if (frequency.weekly.includes(category)) return 'weekly';
    
    return 'batched'; // default
  }

  private getBatchTimeKey(frequency: string): string {
    const now = new Date();
    
    switch (frequency) {
      case 'batched':
        return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
      case 'daily':
        return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      case 'weekly':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
      default:
        return 'immediate';
    }
  }

  private async getHighDismissalCategories(userId: string): Promise<NotificationCategory[]> {
    // This would analyze user's dismissal patterns
    // Simplified implementation
    return [];
  }

  private async suggestPreferenceAdjustments(
    categories: NotificationCategory[],
    userId: string
  ): Promise<void> {
    // This would suggest specific preference changes
    // Implementation would depend on UI framework
  }
}

// Supporting types and interfaces
interface GroupingRule {
  name: string;
  condition: (n1: Notification, n2: Notification) => boolean;
  priority: number;
}

type BatchOperation = 'mark_read' | 'dismiss' | 'snooze';

interface BatchOperationResult {
  groupId: string;
  operation: BatchOperation;
  results: NotificationOperationResult[];
  successCount: number;
  failureCount: number;
}

interface NotificationOperationResult {
  notificationId: string;
  success: boolean;
  error?: string;
}

interface NotificationSuggestion {
  type: 'group_similar' | 'batch_dismiss' | 'adjust_preferences';
  title: string;
  description: string;
  action: () => Promise<any>;
  priority: NotificationPriority;
}

interface NotificationPreferencesService {
  getPreferences(userId: string): Promise<NotificationPreferences>;
}

interface NotificationSchedulerService {
  scheduleBatch(batch: NotificationBatch): Promise<void>;
}