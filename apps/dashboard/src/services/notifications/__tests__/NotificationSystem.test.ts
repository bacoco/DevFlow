import { ContextualNotificationEngine } from '../ContextualNotificationEngine';
import { NotificationGroupingManager } from '../NotificationGroupingManager';
import { NotificationPreferencesManager } from '../NotificationPreferencesManager';
import { AlertEscalationManager } from '../AlertEscalationManager';
import { NotificationAnalyticsService } from '../NotificationAnalyticsService';
import {
  Notification,
  NotificationPreferences,
  NotificationCategory,
  NotificationPriority,
  DismissalPattern
} from '../types';

// Mock services
const mockAnalyticsService = {
  recordEvent: jest.fn(),
  getDismissalPatterns: jest.fn(),
  getUserDismissalPatterns: jest.fn(),
  getUserAvailability: jest.fn(),
  updateDismissalPattern: jest.fn(),
  hasUserInteracted: jest.fn(),
  getRecentEscalations: jest.fn()
};

const mockPreferencesService = {
  getPreferences: jest.fn(),
  updatePreferences: jest.fn()
};

const mockStorageService = {
  getPreferences: jest.fn(),
  savePreferences: jest.fn(),
  getAllPreferences: jest.fn()
};

const mockValidationService = {
  validate: jest.fn()
};

const mockSchedulerService = {
  scheduleBatch: jest.fn()
};

const mockDeliveryService = {
  deliver: jest.fn()
};

const mockPrivacyService = {
  sanitizeAnalytics: jest.fn()
};

describe('ContextualNotificationEngine', () => {
  let engine: ContextualNotificationEngine;
  let mockNotification: Notification;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new ContextualNotificationEngine(
      mockAnalyticsService as any,
      mockPreferencesService as any
    );

    mockNotification = {
      id: 'test-notification-1',
      type: 'productivity_alert',
      title: 'Test Notification',
      message: 'This is a test notification',
      priority: 'medium',
      category: 'performance',
      timestamp: new Date(),
      userId: 'user-123',
      read: false,
      dismissed: false
    };
  });

  describe('shouldShowNotification', () => {
    it('should show notification when user patterns indicate relevance', async () => {
      // Mock user patterns with low dismissal rate
      mockAnalyticsService.getUserDismissalPatterns.mockResolvedValue([
        {
          userId: 'user-123',
          category: 'performance',
          type: 'productivity_alert',
          dismissalRate: 0.2,
          averageTimeToAction: 15000,
          preferredActions: ['view'],
          lastUpdated: new Date()
        }
      ]);

      // Mock user availability
      mockAnalyticsService.getUserAvailability.mockResolvedValue({
        userId: 'user-123',
        status: 'available',
        lastActivity: new Date(),
        timezone: 'UTC'
      });

      // Mock preferences
      mockPreferencesService.getPreferences.mockResolvedValue({
        quietHours: { enabled: false },
        escalation: { enabled: true }
      });

      const shouldShow = await engine.shouldShowNotification(mockNotification, 'user-123');
      expect(shouldShow).toBe(true);
    });

    it('should not show notification during quiet hours', async () => {
      // Set quiet hours to cover current time
      mockPreferencesService.getPreferences.mockResolvedValue({
        quietHours: {
          enabled: true,
          startTime: '00:00',
          endTime: '23:59',
          timezone: 'UTC',
          allowUrgent: false
        }
      });

      mockAnalyticsService.getUserDismissalPatterns.mockResolvedValue([]);
      mockAnalyticsService.getUserAvailability.mockResolvedValue({
        userId: 'user-123',
        status: 'available',
        lastActivity: new Date(),
        timezone: 'UTC'
      });

      const shouldShow = await engine.shouldShowNotification(mockNotification, 'user-123');
      expect(shouldShow).toBe(false);
    });

    it('should show urgent notifications even during quiet hours when allowed', async () => {
      const urgentNotification = { ...mockNotification, priority: 'urgent' as NotificationPriority };

      mockPreferencesService.getPreferences.mockResolvedValue({
        quietHours: {
          enabled: true,
          startTime: '00:00',
          endTime: '23:59',
          timezone: 'UTC',
          allowUrgent: true
        }
      });

      mockAnalyticsService.getUserDismissalPatterns.mockResolvedValue([]);
      mockAnalyticsService.getUserAvailability.mockResolvedValue({
        userId: 'user-123',
        status: 'available',
        lastActivity: new Date(),
        timezone: 'UTC'
      });

      const shouldShow = await engine.shouldShowNotification(urgentNotification, 'user-123');
      expect(shouldShow).toBe(true);
    });
  });

  describe('learnFromUserInteraction', () => {
    it('should record analytics and update dismissal patterns', async () => {
      mockAnalyticsService.getUserDismissalPatterns.mockResolvedValue([]);
      
      await engine.learnFromUserInteraction('user-123', mockNotification, 'dismissed');

      expect(mockAnalyticsService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          notificationId: mockNotification.id,
          event: 'dismissed'
        })
      );
    });
  });
});

describe('NotificationGroupingManager', () => {
  let groupingManager: NotificationGroupingManager;
  let mockNotifications: Notification[];

  beforeEach(() => {
    jest.clearAllMocks();
    groupingManager = new NotificationGroupingManager(
      mockPreferencesService as any,
      mockSchedulerService as any
    );

    mockNotifications = [
      {
        id: 'notification-1',
        type: 'productivity_alert',
        title: 'Performance Alert 1',
        message: 'Your productivity has decreased',
        priority: 'medium',
        category: 'performance',
        timestamp: new Date(),
        userId: 'user-123',
        read: false,
        dismissed: false
      },
      {
        id: 'notification-2',
        type: 'productivity_alert',
        title: 'Performance Alert 2',
        message: 'Your productivity has improved',
        priority: 'medium',
        category: 'performance',
        timestamp: new Date(Date.now() + 1000),
        userId: 'user-123',
        read: false,
        dismissed: false
      }
    ];
  });

  describe('groupNotifications', () => {
    it('should group similar notifications by category and time', async () => {
      mockPreferencesService.getPreferences.mockResolvedValue({
        categories: {
          performance: { priority: 'medium' }
        }
      });

      const groups = await groupingManager.groupNotifications(mockNotifications, 'user-123');
      
      expect(groups).toHaveLength(1);
      expect(groups[0].notifications).toHaveLength(2);
      expect(groups[0].category).toBe('performance');
    });
  });
});

describe('NotificationPreferencesManager', () => {
  let preferencesManager: NotificationPreferencesManager;

  beforeEach(() => {
    jest.clearAllMocks();
    preferencesManager = new NotificationPreferencesManager(
      mockStorageService as any,
      mockValidationService as any
    );

    mockValidationService.validate.mockResolvedValue({ isValid: true, errors: [] });
  });

  describe('getPreferences', () => {
    it('should return user preferences with defaults', async () => {
      mockStorageService.getPreferences.mockResolvedValue(null);
      mockStorageService.savePreferences.mockResolvedValue(undefined);

      const preferences = await preferencesManager.getPreferences('user-123');
      
      expect(preferences).toBeDefined();
      expect(preferences.userId).toBe('user-123');
      expect(preferences.channels).toBeDefined();
      expect(preferences.frequency).toBeDefined();
    });
  });

  describe('updatePreferences', () => {
    it('should validate and update preferences', async () => {
      const currentPreferences: NotificationPreferences = {
        userId: 'user-123',
        channels: { inApp: true, email: false, push: true, desktop: false, mobile: true },
        frequency: { immediate: [], batched: [], daily: [], weekly: [], disabled: [] },
        categories: {} as any,
        quietHours: { enabled: false, startTime: '22:00', endTime: '08:00', timezone: 'UTC', allowUrgent: true },
        escalation: { enabled: false, urgentDelay: 5, highDelay: 15, maxEscalations: 3, escalationChannels: [] }
      };

      mockStorageService.getPreferences.mockResolvedValue(currentPreferences);
      mockStorageService.savePreferences.mockResolvedValue(undefined);

      const updates = { channels: { ...currentPreferences.channels, email: true } };
      const updatedPreferences = await preferencesManager.updatePreferences('user-123', updates);
      
      expect(updatedPreferences.channels.email).toBe(true);
      expect(mockStorageService.savePreferences).toHaveBeenCalled();
    });
  });
});

describe('AlertEscalationManager', () => {
  let escalationManager: AlertEscalationManager;

  beforeEach(() => {
    jest.clearAllMocks();
    escalationManager = new AlertEscalationManager(
      mockPreferencesService as any,
      mockDeliveryService as any,
      mockAnalyticsService as any
    );
  });

  describe('initiateEscalation', () => {
    it('should initiate escalation for urgent notifications', async () => {
      const urgentNotification = { ...mockNotification, priority: 'urgent' as NotificationPriority };
      
      mockPreferencesService.getPreferences.mockResolvedValue({
        escalation: {
          enabled: true,
          urgentDelay: 2,
          highDelay: 10,
          maxEscalations: 3,
          escalationChannels: ['email', 'push']
        }
      });

      await escalationManager.initiateEscalation(urgentNotification, 'user-123');
      
      expect(mockPreferencesService.getPreferences).toHaveBeenCalledWith('user-123');
    });
  });
});

describe('NotificationAnalyticsService', () => {
  let analyticsService: NotificationAnalyticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    analyticsService = new NotificationAnalyticsService(
      mockStorageService as any,
      mockPrivacyService as any
    );

    mockPrivacyService.sanitizeAnalytics.mockImplementation((analytics) => analytics);
  });

  describe('recordEvent', () => {
    it('should sanitize and buffer analytics events', async () => {
      const analyticsEvent = {
        userId: 'user-123',
        notificationId: 'notification-1',
        event: 'viewed' as const,
        timestamp: new Date(),
        context: {
          channel: 'inApp' as const,
          deviceType: 'desktop' as const,
          location: '/dashboard',
          userActivity: 'active' as const
        }
      };

      await analyticsService.recordEvent(analyticsEvent);
      
      expect(mockPrivacyService.sanitizeAnalytics).toHaveBeenCalledWith(analyticsEvent);
    });
  });
});

// Mock notification for tests
const mockNotification: Notification = {
  id: 'test-notification-1',
  type: 'productivity_alert',
  title: 'Test Notification',
  message: 'This is a test notification',
  priority: 'medium',
  category: 'performance',
  timestamp: new Date(),
  userId: 'user-123',
  read: false,
  dismissed: false
};