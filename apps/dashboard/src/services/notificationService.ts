/**
 * Notification Service
 * Advanced notification management with queuing, grouping, and priority handling
 */

import { Notification, NotificationType } from '../types/design-system';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export interface EnhancedNotification extends Notification {
  priority: NotificationPriority;
  category?: string;
  groupId?: string;
  read?: boolean;
  dismissed?: boolean;
  source?: string;
  metadata?: Record<string, any>;
}

export interface NotificationGroup {
  id: string;
  category: string;
  count: number;
  latestNotification: EnhancedNotification;
  notifications: EnhancedNotification[];
  collapsed: boolean;
}

export interface NotificationQueue {
  high: EnhancedNotification[];
  normal: EnhancedNotification[];
  low: EnhancedNotification[];
}

export interface NotificationServiceConfig {
  maxQueueSize: number;
  maxDisplayed: number;
  groupingEnabled: boolean;
  groupingThreshold: number;
  priorityDelays: Record<NotificationPriority, number>;
  autoDismissDelays: Record<NotificationPriority, number>;
}

class NotificationService {
  private config: NotificationServiceConfig = {
    maxQueueSize: 100,
    maxDisplayed: 5,
    groupingEnabled: true,
    groupingThreshold: 3,
    priorityDelays: {
      critical: 0,
      high: 100,
      normal: 300,
      low: 500,
    },
    autoDismissDelays: {
      critical: 0, // Never auto-dismiss
      high: 10000,
      normal: 5000,
      low: 3000,
    },
  };

  private queue: NotificationQueue = {
    high: [],
    normal: [],
    low: [],
  };

  private displayed: EnhancedNotification[] = [];
  private history: EnhancedNotification[] = [];
  private groups: Map<string, NotificationGroup> = new Map();
  private listeners: Set<(notifications: EnhancedNotification[]) => void> = new Set();
  private historyListeners: Set<(history: EnhancedNotification[]) => void> = new Set();
  private groupListeners: Set<(groups: NotificationGroup[]) => void> = new Set();

  constructor(config?: Partial<NotificationServiceConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Add a notification to the system
   */
  addNotification(
    notification: Omit<EnhancedNotification, 'id' | 'timestamp' | 'priority'> & {
      priority?: NotificationPriority;
    }
  ): string {
    const id = this.generateId();
    const enhancedNotification: EnhancedNotification = {
      ...notification,
      id,
      timestamp: new Date(),
      priority: notification.priority || 'normal',
      read: false,
      dismissed: false,
    };

    // Add to history immediately
    this.addToHistory(enhancedNotification);

    // Handle grouping
    if (this.config.groupingEnabled && notification.category) {
      this.handleGrouping(enhancedNotification);
    } else {
      this.queueNotification(enhancedNotification);
    }

    this.processQueue();
    return id;
  }

  /**
   * Remove a notification
   */
  removeNotification(id: string): void {
    // Remove from displayed
    this.displayed = this.displayed.filter(n => n.id !== id);
    
    // Remove from queue
    Object.keys(this.queue).forEach(priority => {
      this.queue[priority as keyof NotificationQueue] = 
        this.queue[priority as keyof NotificationQueue].filter(n => n.id !== id);
    });

    // Mark as dismissed in history
    const historyItem = this.history.find(n => n.id === id);
    if (historyItem) {
      historyItem.dismissed = true;
    }

    this.notifyListeners();
    this.processQueue();
  }

  /**
   * Mark notification as read
   */
  markAsRead(id: string): void {
    const notification = this.history.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.notifyHistoryListeners();
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    this.history.forEach(n => n.read = true);
    this.notifyHistoryListeners();
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.displayed = [];
    this.queue = { high: [], normal: [], low: [] };
    this.groups.clear();
    this.notifyListeners();
    this.notifyGroupListeners();
  }

  /**
   * Clear notification history
   */
  clearHistory(): void {
    this.history = [];
    this.notifyHistoryListeners();
  }

  /**
   * Get displayed notifications
   */
  getDisplayed(): EnhancedNotification[] {
    return [...this.displayed];
  }

  /**
   * Get notification history
   */
  getHistory(): EnhancedNotification[] {
    return [...this.history].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get notification groups
   */
  getGroups(): NotificationGroup[] {
    return Array.from(this.groups.values());
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.history.filter(n => !n.read && !n.dismissed).length;
  }

  /**
   * Subscribe to displayed notifications changes
   */
  subscribe(listener: (notifications: EnhancedNotification[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Subscribe to history changes
   */
  subscribeToHistory(listener: (history: EnhancedNotification[]) => void): () => void {
    this.historyListeners.add(listener);
    return () => this.historyListeners.delete(listener);
  }

  /**
   * Subscribe to group changes
   */
  subscribeToGroups(listener: (groups: NotificationGroup[]) => void): () => void {
    this.groupListeners.add(listener);
    return () => this.groupListeners.delete(listener);
  }

  /**
   * Toggle group collapse state
   */
  toggleGroup(groupId: string): void {
    const group = this.groups.get(groupId);
    if (group) {
      group.collapsed = !group.collapsed;
      this.notifyGroupListeners();
    }
  }

  /**
   * Dismiss group
   */
  dismissGroup(groupId: string): void {
    const group = this.groups.get(groupId);
    if (group) {
      group.notifications.forEach(n => {
        this.removeNotification(n.id);
      });
      this.groups.delete(groupId);
      this.notifyGroupListeners();
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NotificationServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private queueNotification(notification: EnhancedNotification): void {
    const priority = notification.priority;
    
    // Add to appropriate queue
    if (priority === 'critical' || priority === 'high') {
      this.queue.high.push(notification);
    } else if (priority === 'normal') {
      this.queue.normal.push(notification);
    } else {
      this.queue.low.push(notification);
    }

    // Limit queue size
    this.limitQueueSize();
  }

  private processQueue(): void {
    if (this.displayed.length >= this.config.maxDisplayed) {
      return;
    }

    // Process in priority order
    const queues = [this.queue.high, this.queue.normal, this.queue.low];
    
    for (const queue of queues) {
      while (queue.length > 0 && this.displayed.length < this.config.maxDisplayed) {
        const notification = queue.shift()!;
        this.displayNotification(notification);
      }
    }
  }

  private displayNotification(notification: EnhancedNotification): void {
    this.displayed.push(notification);
    
    // Set up auto-dismiss
    const autoDismissDelay = this.config.autoDismissDelays[notification.priority];
    if (autoDismissDelay > 0 && !notification.persistent) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, autoDismissDelay);
    }

    this.notifyListeners();
  }

  private handleGrouping(notification: EnhancedNotification): void {
    const { category } = notification;
    if (!category) {
      this.queueNotification(notification);
      return;
    }

    const existingGroup = this.groups.get(category);
    
    if (existingGroup) {
      existingGroup.notifications.push(notification);
      existingGroup.count = existingGroup.notifications.length;
      existingGroup.latestNotification = notification;
      
      // If group reaches threshold, display as group
      if (existingGroup.count >= this.config.groupingThreshold) {
        this.displayGroupNotification(existingGroup);
      } else {
        this.queueNotification(notification);
      }
    } else {
      // Create new group
      const group: NotificationGroup = {
        id: category,
        category,
        count: 1,
        latestNotification: notification,
        notifications: [notification],
        collapsed: false,
      };
      
      this.groups.set(category, group);
      this.queueNotification(notification);
    }

    this.notifyGroupListeners();
  }

  private displayGroupNotification(group: NotificationGroup): void {
    // Create a summary notification for the group
    const groupNotification: EnhancedNotification = {
      id: `group_${group.id}`,
      type: group.latestNotification.type,
      title: `${group.count} ${group.category} notifications`,
      message: group.latestNotification.message,
      priority: group.latestNotification.priority,
      category: group.category,
      groupId: group.id,
      timestamp: group.latestNotification.timestamp,
      persistent: true,
      read: false,
      dismissed: false,
      actions: [
        {
          label: 'View All',
          action: () => this.toggleGroup(group.id),
          variant: 'secondary',
        },
        {
          label: 'Dismiss All',
          action: () => this.dismissGroup(group.id),
          variant: 'ghost',
        },
      ],
    };

    // Remove individual notifications from display
    group.notifications.forEach(n => {
      this.displayed = this.displayed.filter(d => d.id !== n.id);
    });

    this.displayNotification(groupNotification);
  }

  private addToHistory(notification: EnhancedNotification): void {
    this.history.unshift(notification);
    
    // Limit history size
    if (this.history.length > 1000) {
      this.history = this.history.slice(0, 1000);
    }

    this.notifyHistoryListeners();
  }

  private limitQueueSize(): void {
    const totalQueueSize = this.queue.high.length + this.queue.normal.length + this.queue.low.length;
    
    if (totalQueueSize > this.config.maxQueueSize) {
      // Remove oldest low priority notifications first
      const excess = totalQueueSize - this.config.maxQueueSize;
      let removed = 0;
      
      while (removed < excess && this.queue.low.length > 0) {
        this.queue.low.shift();
        removed++;
      }
      
      while (removed < excess && this.queue.normal.length > 0) {
        this.queue.normal.shift();
        removed++;
      }
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.displayed));
  }

  private notifyHistoryListeners(): void {
    this.historyListeners.forEach(listener => listener(this.getHistory()));
  }

  private notifyGroupListeners(): void {
    this.groupListeners.forEach(listener => listener(this.getGroups()));
  }
}

// Create singleton instance
export const notificationService = new NotificationService();

// Convenience functions
export const showNotification = (
  type: NotificationType,
  title: string,
  message?: string,
  options?: Partial<EnhancedNotification>
): string => {
  return notificationService.addNotification({
    type,
    title,
    message,
    ...options,
  });
};

export const showSuccess = (title: string, message?: string, options?: Partial<EnhancedNotification>): string => {
  return showNotification('success', title, message, { priority: 'normal', ...options });
};

export const showError = (title: string, message?: string, options?: Partial<EnhancedNotification>): string => {
  return showNotification('error', title, message, { priority: 'high', ...options });
};

export const showWarning = (title: string, message?: string, options?: Partial<EnhancedNotification>): string => {
  return showNotification('warning', title, message, { priority: 'normal', ...options });
};

export const showInfo = (title: string, message?: string, options?: Partial<EnhancedNotification>): string => {
  return showNotification('info', title, message, { priority: 'low', ...options });
};

export const showCritical = (title: string, message?: string, options?: Partial<EnhancedNotification>): string => {
  return showNotification('error', title, message, { priority: 'critical', persistent: true, ...options });
};

export default notificationService;