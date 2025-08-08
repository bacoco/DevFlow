// Core notification services
export { ContextualNotificationEngine } from './ContextualNotificationEngine';
export { NotificationGroupingManager } from './NotificationGroupingManager';
export { NotificationPreferencesManager } from './NotificationPreferencesManager';
export { AlertEscalationManager } from './AlertEscalationManager';
export { NotificationAnalyticsService } from './NotificationAnalyticsService';

// Types and interfaces
export * from './types';

// Main notification system component
export { SmartNotificationSystem } from '../../components/Notifications/SmartNotificationSystem';

// Utility functions for notification management
export const createNotification = (
  type: import('./types').NotificationType,
  title: string,
  message: string,
  options: Partial<import('./types').Notification> = {}
): import('./types').Notification => {
  return {
    id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    title,
    message,
    priority: options.priority || 'medium',
    category: options.category || 'system',
    timestamp: new Date(),
    userId: options.userId || '',
    read: false,
    dismissed: false,
    ...options
  };
};

export const createProductivityAlert = (
  title: string,
  message: string,
  userId: string,
  metadata?: Record<string, any>
): import('./types').Notification => {
  return createNotification('productivity_alert', title, message, {
    userId,
    category: 'performance',
    priority: 'medium',
    metadata
  });
};

export const createTeamInsight = (
  title: string,
  message: string,
  userId: string,
  metadata?: Record<string, any>
): import('./types').Notification => {
  return createNotification('team_insight', title, message, {
    userId,
    category: 'team',
    priority: 'low',
    metadata
  });
};

export const createSecurityAlert = (
  title: string,
  message: string,
  userId: string,
  metadata?: Record<string, any>
): import('./types').Notification => {
  return createNotification('error', title, message, {
    userId,
    category: 'security',
    priority: 'urgent',
    metadata
  });
};

export const createAchievementNotification = (
  title: string,
  message: string,
  userId: string,
  metadata?: Record<string, any>
): import('./types').Notification => {
  return createNotification('achievement', title, message, {
    userId,
    category: 'personal',
    priority: 'low',
    metadata
  });
};

// Notification system configuration
export interface NotificationSystemConfig {
  maxVisible: number;
  autoHide: boolean;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  enableAnalytics: boolean;
  enableEscalation: boolean;
  enableGrouping: boolean;
  batchSize: number;
  flushInterval: number;
}

export const defaultNotificationConfig: NotificationSystemConfig = {
  maxVisible: 5,
  autoHide: true,
  position: 'top-right',
  enableAnalytics: true,
  enableEscalation: true,
  enableGrouping: true,
  batchSize: 50,
  flushInterval: 30000
};

// Hook for using the notification system
export const useNotificationSystem = (userId: string, config?: Partial<NotificationSystemConfig>) => {
  const finalConfig = { ...defaultNotificationConfig, ...config };
  
  // This would be implemented as a proper React hook
  // For now, returning the config and some utility functions
  return {
    config: finalConfig,
    createNotification,
    createProductivityAlert,
    createTeamInsight,
    createSecurityAlert,
    createAchievementNotification
  };
};