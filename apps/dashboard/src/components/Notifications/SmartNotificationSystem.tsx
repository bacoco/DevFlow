import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Notification, 
  NotificationGroup, 
  NotificationPreferences,
  NotificationCategory,
  NotificationPriority 
} from '../../services/notifications/types';
import { ContextualNotificationEngine } from '../../services/notifications/ContextualNotificationEngine';
import { NotificationGroupingManager } from '../../services/notifications/NotificationGroupingManager';
import { NotificationPreferencesManager } from '../../services/notifications/NotificationPreferencesManager';
import { AlertEscalationManager } from '../../services/notifications/AlertEscalationManager';
import { NotificationAnalyticsService } from '../../services/notifications/NotificationAnalyticsService';

interface SmartNotificationSystemProps {
  userId: string;
  className?: string;
  maxVisible?: number;
  autoHide?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const SmartNotificationSystem: React.FC<SmartNotificationSystemProps> = ({
  userId,
  className = '',
  maxVisible = 5,
  autoHide = true,
  position = 'top-right'
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [groups, setGroups] = useState<NotificationGroup[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPreferences, setShowPreferences] = useState(false);

  // Initialize services
  const services = useMemo(() => ({
    contextualEngine: new ContextualNotificationEngine(
      {} as any, // Analytics service
      {} as any  // Preferences service
    ),
    groupingManager: new NotificationGroupingManager(
      {} as any, // Preferences service
      {} as any  // Scheduler service
    ),
    preferencesManager: new NotificationPreferencesManager(
      {} as any, // Storage service
      {} as any  // Validation service
    ),
    escalationManager: new AlertEscalationManager(
      {} as any, // Preferences service
      {} as any, // Delivery service
      {} as any  // Analytics service
    ),
    analyticsService: new NotificationAnalyticsService(
      {} as any, // Storage service
      {} as any  // Privacy service
    )
  }), []);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        
        // Load user preferences
        const userPreferences = await services.preferencesManager.getPreferences(userId);
        setPreferences(userPreferences);

        // Load existing notifications (would come from API)
        const existingNotifications = await loadNotifications(userId);
        
        // Filter notifications based on user patterns
        const filteredNotifications = await Promise.all(
          existingNotifications.map(async (notification) => {
            const shouldShow = await services.contextualEngine.shouldShowNotification(
              notification,
              userId
            );
            return shouldShow ? notification : null;
          })
        );

        const validNotifications = filteredNotifications.filter(Boolean) as Notification[];
        setNotifications(validNotifications);

        // Group notifications
        const notificationGroups = await services.groupingManager.groupNotifications(
          validNotifications,
          userId
        );
        setGroups(notificationGroups);

      } catch (error) {
        console.error('Failed to load notification data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [userId, services]);

  // Handle new notifications
  const handleNewNotification = useCallback(async (notification: Notification) => {
    // Check if notification should be shown
    const shouldShow = await services.contextualEngine.shouldShowNotification(
      notification,
      userId
    );

    if (!shouldShow) {
      return;
    }

    // Get optimal delivery time
    const optimalTime = await services.contextualEngine.getOptimalDeliveryTime(
      notification,
      userId
    );

    // If optimal time is in the future, schedule for later
    if (optimalTime > new Date()) {
      scheduleNotification(notification, optimalTime);
      return;
    }

    // Add to current notifications
    setNotifications(prev => {
      const updated = [notification, ...prev];
      
      // Limit visible notifications
      if (updated.length > maxVisible) {
        return updated.slice(0, maxVisible);
      }
      
      return updated;
    });

    // Initiate escalation if needed
    if (notification.priority === 'urgent' || notification.priority === 'high') {
      await services.escalationManager.initiateEscalation(notification, userId);
    }

    // Record analytics
    await services.analyticsService.recordEvent({
      userId,
      notificationId: notification.id,
      event: 'delivered',
      timestamp: new Date(),
      context: {
        channel: 'inApp',
        deviceType: 'desktop',
        location: window.location.pathname,
        userActivity: 'active'
      }
    });

  }, [userId, services, maxVisible]);

  // Handle notification interaction
  const handleNotificationAction = useCallback(async (
    notificationId: string,
    action: 'view' | 'click' | 'dismiss' | 'snooze'
  ) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;

    // Update notification state
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId 
          ? { 
              ...n, 
              read: action === 'view' || action === 'click' || n.read,
              dismissed: action === 'dismiss'
            }
          : n
      )
    );

    // Cancel escalation if user interacted
    if (action === 'view' || action === 'click') {
      await services.escalationManager.cancelEscalation(notificationId);
    }

    // Learn from user interaction
    await services.contextualEngine.learnFromUserInteraction(
      userId,
      notification,
      action === 'view' ? 'viewed' : 
      action === 'click' ? 'clicked' : 
      action === 'dismiss' ? 'dismissed' : 'snoozed'
    );

    // Record analytics
    await services.analyticsService.recordEvent({
      userId,
      notificationId,
      event: action === 'view' ? 'viewed' : 
             action === 'click' ? 'clicked' : 
             action === 'dismiss' ? 'dismissed' : 'snoozed',
      timestamp: new Date(),
      context: {
        channel: 'inApp',
        deviceType: 'desktop',
        location: window.location.pathname,
        userActivity: 'active'
      }
    });

    // Auto-hide if configured
    if (autoHide && (action === 'click' || action === 'dismiss')) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }, 300);
    }

  }, [notifications, userId, services, autoHide]);

  // Handle batch operations
  const handleBatchOperation = useCallback(async (
    groupId: string,
    operation: 'mark_read' | 'dismiss' | 'snooze'
  ) => {
    const result = await services.groupingManager.performBatchOperation(
      operation,
      groupId,
      userId
    );

    if (result.successCount > 0) {
      // Update local state based on operation
      setNotifications(prev => 
        prev.map(notification => {
          const group = groups.find(g => g.id === groupId);
          const isInGroup = group?.notifications.some(n => n.id === notification.id);
          
          if (isInGroup) {
            return {
              ...notification,
              read: operation === 'mark_read' || notification.read,
              dismissed: operation === 'dismiss'
            };
          }
          
          return notification;
        })
      );

      // Remove dismissed notifications from groups
      if (operation === 'dismiss') {
        setGroups(prev => 
          prev.map(group => 
            group.id === groupId 
              ? { ...group, notifications: group.notifications.filter(n => !n.dismissed) }
              : group
          ).filter(group => group.notifications.length > 0)
        );
      }
    }

  }, [groups, userId, services]);

  // Handle preference updates
  const handlePreferenceUpdate = useCallback(async (
    updates: Partial<NotificationPreferences>
  ) => {
    try {
      const updatedPreferences = await services.preferencesManager.updatePreferences(
        userId,
        updates
      );
      setPreferences(updatedPreferences);
      
      // Re-evaluate existing notifications with new preferences
      const filteredNotifications = await Promise.all(
        notifications.map(async (notification) => {
          const shouldShow = await services.contextualEngine.shouldShowNotification(
            notification,
            userId
          );
          return shouldShow ? notification : null;
        })
      );

      const validNotifications = filteredNotifications.filter(Boolean) as Notification[];
      setNotifications(validNotifications);

    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  }, [userId, notifications, services]);

  // Get visible notifications (respecting groups and limits)
  const visibleNotifications = useMemo(() => {
    const ungrouped = notifications.filter(n => !groups.some(g => 
      g.notifications.some(gn => gn.id === n.id)
    ));
    
    const groupedNotifications = groups.flatMap(group => 
      group.collapsed ? [group.notifications[0]] : group.notifications
    );

    return [...ungrouped, ...groupedNotifications]
      .filter(n => !n.dismissed)
      .slice(0, maxVisible);
  }, [notifications, groups, maxVisible]);

  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  if (isLoading) {
    return (
      <div className={`fixed ${positionClasses[position]} z-50`}>
        <div className="bg-white rounded-lg shadow-lg p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Notification Container */}
      <div className={`fixed ${positionClasses[position]} z-50 space-y-2 ${className}`}>
        {visibleNotifications.map((notification, index) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            index={index}
            onAction={handleNotificationAction}
            onView={() => handleNotificationAction(notification.id, 'view')}
          />
        ))}
        
        {/* Notification Groups */}
        {groups.map(group => (
          <NotificationGroupCard
            key={group.id}
            group={group}
            onBatchAction={handleBatchOperation}
            onToggleCollapse={() => {
              setGroups(prev => 
                prev.map(g => 
                  g.id === group.id 
                    ? { ...g, collapsed: !g.collapsed }
                    : g
                )
              );
            }}
          />
        ))}

        {/* Settings Button */}
        {visibleNotifications.length > 0 && (
          <button
            onClick={() => setShowPreferences(true)}
            className="bg-gray-100 hover:bg-gray-200 rounded-full p-2 shadow-sm transition-colors"
            title="Notification Settings"
          >
            <SettingsIcon className="w-4 h-4 text-gray-600" />
          </button>
        )}
      </div>

      {/* Preferences Modal */}
      {showPreferences && preferences && (
        <NotificationPreferencesModal
          preferences={preferences}
          onUpdate={handlePreferenceUpdate}
          onClose={() => setShowPreferences(false)}
        />
      )}
    </>
  );
};

// Supporting Components
interface NotificationCardProps {
  notification: Notification;
  index: number;
  onAction: (id: string, action: 'view' | 'click' | 'dismiss' | 'snooze') => void;
  onView: () => void;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  index,
  onAction,
  onView
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  useEffect(() => {
    // Auto-mark as viewed when visible
    const timer = setTimeout(() => onView(), 1000);
    return () => clearTimeout(timer);
  }, [onView]);

  const priorityColors = {
    low: 'border-l-blue-400 bg-blue-50',
    medium: 'border-l-yellow-400 bg-yellow-50',
    high: 'border-l-orange-400 bg-orange-50',
    urgent: 'border-l-red-400 bg-red-50'
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        bg-white rounded-lg shadow-lg border-l-4 ${priorityColors[notification.priority]}
        p-4 max-w-sm cursor-pointer hover:shadow-xl
      `}
      onClick={() => onAction(notification.id, 'click')}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-gray-900 text-sm">
          {notification.title}
        </h4>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction(notification.id, 'dismiss');
          }}
          className="text-gray-400 hover:text-gray-600 ml-2"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>
      
      <p className="text-gray-700 text-sm mb-3">
        {notification.message}
      </p>
      
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">
          {formatTimeAgo(notification.timestamp)}
        </span>
        
        {notification.actions && notification.actions.length > 0 && (
          <div className="flex space-x-2">
            {notification.actions.slice(0, 2).map(action => (
              <button
                key={action.id}
                onClick={(e) => {
                  e.stopPropagation();
                  action.handler();
                  onAction(notification.id, 'click');
                }}
                className={`
                  px-2 py-1 text-xs rounded transition-colors
                  ${action.type === 'primary' 
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }
                `}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface NotificationGroupCardProps {
  group: NotificationGroup;
  onBatchAction: (groupId: string, action: 'mark_read' | 'dismiss' | 'snooze') => void;
  onToggleCollapse: () => void;
}

const NotificationGroupCard: React.FC<NotificationGroupCardProps> = ({
  group,
  onBatchAction,
  onToggleCollapse
}) => {
  const unreadCount = group.notifications.filter(n => !n.read).length;

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-gray-900 text-sm">
          {group.title}
        </h4>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
          <button
            onClick={onToggleCollapse}
            className="text-gray-400 hover:text-gray-600"
          >
            {group.collapsed ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronUpIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!group.collapsed && (
        <div className="space-y-2 mb-3">
          {group.notifications.slice(0, 3).map(notification => (
            <div key={notification.id} className="text-sm text-gray-600 truncate">
              {notification.message}
            </div>
          ))}
          {group.notifications.length > 3 && (
            <div className="text-xs text-gray-500">
              +{group.notifications.length - 3} more
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">
          {group.notifications.length} notifications
        </span>
        
        <div className="flex space-x-2">
          <button
            onClick={() => onBatchAction(group.id, 'mark_read')}
            className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            Mark Read
          </button>
          <button
            onClick={() => onBatchAction(group.id, 'dismiss')}
            className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            Dismiss All
          </button>
        </div>
      </div>
    </div>
  );
};

interface NotificationPreferencesModalProps {
  preferences: NotificationPreferences;
  onUpdate: (updates: Partial<NotificationPreferences>) => void;
  onClose: () => void;
}

const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  preferences,
  onUpdate,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Notification Preferences</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        
        {/* Simplified preferences UI */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notification Channels
            </label>
            <div className="space-y-2">
              {Object.entries(preferences.channels).map(([channel, enabled]) => (
                <label key={channel} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => onUpdate({
                      channels: { ...preferences.channels, [channel]: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  <span className="text-sm capitalize">{channel.replace(/([A-Z])/g, ' $1')}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.quietHours.enabled}
                onChange={(e) => onUpdate({
                  quietHours: { ...preferences.quietHours, enabled: e.target.checked }
                })}
                className="mr-2"
              />
              <span className="text-sm">Enable Quiet Hours</span>
            </label>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Utility functions
const loadNotifications = async (userId: string): Promise<Notification[]> => {
  // Mock implementation - would load from API
  return [];
};

const scheduleNotification = (notification: Notification, time: Date): void => {
  // Implementation would schedule notification for later delivery
  console.log(`Scheduling notification ${notification.id} for ${time}`);
};

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

// Icon components (simplified)
const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronUpIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);