import {notificationService} from '../../services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';

// Mock react-native-push-notification
jest.mock('react-native-push-notification', () => ({
  configure: jest.fn(),
  localNotification: jest.fn(),
  localNotificationSchedule: jest.fn(),
  cancelLocalNotification: jest.fn(),
  cancelAllLocalNotifications: jest.fn(),
  setApplicationIconBadgeNumber: jest.fn(),
  createChannel: jest.fn(),
}));

// Mock PermissionsAndroid
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    Version: 33,
  },
  PermissionsAndroid: {
    PERMISSIONS: {
      POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
    },
    request: jest.fn().mockResolvedValue('granted'),
  },
}));

const mockPushNotification = require('react-native-push-notification');

describe('NotificationService Integration', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully with permissions', async () => {
      const result = await notificationService.initialize();
      
      expect(result).toBe(true);
      expect(mockPushNotification.configure).toHaveBeenCalled();
      
      if (Platform.OS === 'android') {
        expect(mockPushNotification.createChannel).toHaveBeenCalledTimes(3); // alerts, insights, reminders
      }
    });

    it('should handle permission denial gracefully', async () => {
      const {PermissionsAndroid} = require('react-native');
      PermissionsAndroid.request.mockResolvedValueOnce('denied');

      const result = await notificationService.initialize();
      
      expect(result).toBe(false);
    });

    it('should create notification channels on Android', async () => {
      await notificationService.initialize();

      expect(mockPushNotification.createChannel).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: 'alerts',
          channelName: 'Alerts',
        }),
        expect.any(Function)
      );

      expect(mockPushNotification.createChannel).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: 'insights',
          channelName: 'Insights',
        }),
        expect.any(Function)
      );

      expect(mockPushNotification.createChannel).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: 'reminders',
          channelName: 'Reminders',
        }),
        expect.any(Function)
      );
    });
  });

  describe('Local Notifications', () => {
    beforeEach(async () => {
      await notificationService.initialize();
    });

    it('should show local notification', async () => {
      const notification = {
        id: 'test-1',
        title: 'Test Notification',
        message: 'This is a test message',
        priority: 'high' as const,
        category: 'alert',
      };

      await notificationService.showLocalNotification(notification);

      expect(mockPushNotification.localNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-1',
          title: 'Test Notification',
          message: 'This is a test message',
          channelId: 'alerts',
          priority: 'high',
        })
      );
    });

    it('should schedule notification', async () => {
      const notification = {
        id: 'scheduled-1',
        title: 'Scheduled Notification',
        message: 'This is scheduled',
        category: 'reminder',
      };

      const scheduleDate = new Date(Date.now() + 60000); // 1 minute from now

      await notificationService.scheduleNotification(notification, scheduleDate);

      expect(mockPushNotification.localNotificationSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'scheduled-1',
          title: 'Scheduled Notification',
          message: 'This is scheduled',
          date: scheduleDate,
          channelId: 'reminders',
        })
      );
    });

    it('should cancel notification', () => {
      notificationService.cancelNotification('test-1');
      
      expect(mockPushNotification.cancelLocalNotification).toHaveBeenCalledWith('test-1');
    });

    it('should cancel all notifications', () => {
      notificationService.cancelAllNotifications();
      
      expect(mockPushNotification.cancelAllLocalNotifications).toHaveBeenCalled();
    });

    it('should set badge number', async () => {
      await notificationService.setBadgeNumber(5);
      
      expect(mockPushNotification.setApplicationIconBadgeNumber).toHaveBeenCalledWith(5);
    });
  });

  describe('Channel Selection', () => {
    beforeEach(async () => {
      await notificationService.initialize();
    });

    it('should use correct channel for alert notifications', async () => {
      const notification = {
        id: 'alert-1',
        title: 'Alert',
        message: 'Critical alert',
        category: 'alert',
      };

      await notificationService.showLocalNotification(notification);

      expect(mockPushNotification.localNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: 'alerts',
        })
      );
    });

    it('should use correct channel for insight notifications', async () => {
      const notification = {
        id: 'insight-1',
        title: 'Insight',
        message: 'Productivity insight',
        category: 'insight',
      };

      await notificationService.showLocalNotification(notification);

      expect(mockPushNotification.localNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: 'insights',
        })
      );
    });

    it('should use correct channel for reminder notifications', async () => {
      const notification = {
        id: 'reminder-1',
        title: 'Reminder',
        message: 'Task reminder',
        category: 'reminder',
      };

      await notificationService.showLocalNotification(notification);

      expect(mockPushNotification.localNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: 'reminders',
        })
      );
    });

    it('should default to alerts channel for unknown category', async () => {
      const notification = {
        id: 'unknown-1',
        title: 'Unknown',
        message: 'Unknown category',
        category: 'unknown',
      };

      await notificationService.showLocalNotification(notification);

      expect(mockPushNotification.localNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: 'alerts',
        })
      );
    });
  });

  describe('Permission Management', () => {
    it('should store permission status', async () => {
      await notificationService.initialize();
      
      const hasPermission = await notificationService.getPermissionStatus();
      expect(hasPermission).toBe(true);
    });

    it('should handle permission storage errors', async () => {
      // Mock AsyncStorage to throw error
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValue(new Error('Storage error'));

      const hasPermission = await notificationService.getPermissionStatus();
      expect(hasPermission).toBe(false);

      // Restore original method
      AsyncStorage.getItem = originalGetItem;
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      mockPushNotification.configure.mockImplementationOnce(() => {
        throw new Error('Configuration failed');
      });

      const result = await notificationService.initialize();
      expect(result).toBe(false);
    });

    it('should handle notification errors gracefully', async () => {
      await notificationService.initialize();
      
      mockPushNotification.localNotification.mockImplementationOnce(() => {
        throw new Error('Notification failed');
      });

      // Should not throw error
      await expect(
        notificationService.showLocalNotification({
          id: 'error-test',
          title: 'Error Test',
          message: 'This should handle errors',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await notificationService.initialize();
    });

    it('should handle multiple notifications efficiently', async () => {
      const notifications = Array.from({length: 50}, (_, i) => ({
        id: `perf-test-${i}`,
        title: `Notification ${i}`,
        message: `Message ${i}`,
        category: i % 2 === 0 ? 'alert' : 'insight',
      }));

      const startTime = Date.now();
      
      await Promise.all(
        notifications.map(notification => 
          notificationService.showLocalNotification(notification)
        )
      );

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(mockPushNotification.localNotification).toHaveBeenCalledTimes(50);
    });

    it('should handle rapid scheduling and cancellation', async () => {
      const notificationIds = Array.from({length: 20}, (_, i) => `rapid-${i}`);
      
      // Schedule notifications
      const schedulePromises = notificationIds.map(id => 
        notificationService.scheduleNotification(
          {
            id,
            title: 'Rapid Test',
            message: 'Rapid scheduling test',
          },
          new Date(Date.now() + 60000)
        )
      );

      await Promise.all(schedulePromises);

      // Cancel all notifications
      notificationIds.forEach(id => {
        notificationService.cancelNotification(id);
      });

      expect(mockPushNotification.localNotificationSchedule).toHaveBeenCalledTimes(20);
      expect(mockPushNotification.cancelLocalNotification).toHaveBeenCalledTimes(20);
    });
  });
});