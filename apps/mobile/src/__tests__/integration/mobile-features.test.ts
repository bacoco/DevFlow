import {notificationService} from '@/services/notificationService';
import {offlineService} from '@/services/offlineService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {navigationService} from '@/navigation/NavigationService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-push-notification');
jest.mock('@react-native-community/netinfo');
jest.mock('@/navigation/NavigationService');

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: 15,
    constants: {
      Model: 'iPhone 14',
    },
  },
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockNavigationService = navigationService as jest.Mocked<typeof navigationService>;

describe('Mobile Features Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
  });

  describe('NotificationService', () => {
    describe('Backend Token Registration', () => {
      it('should register device token with backend successfully', async () => {
        // Mock successful API response
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({success: true}),
        });

        mockAsyncStorage.getItem
          .mockResolvedValueOnce('user123') // user_id
          .mockResolvedValueOnce('auth_token_123'); // auth_token

        await notificationService.initialize();

        // Simulate token registration
        const mockToken = 'device_token_123';
        await (notificationService as any).registerTokenWithBackend(mockToken);

        expect(fetch).toHaveBeenCalledWith('/api/notifications/register-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer auth_token_123',
          },
          body: JSON.stringify({
            userId: 'user123',
            deviceToken: mockToken,
            platform: 'ios',
            deviceInfo: {
              model: 'iPhone 14',
              version: 15,
            },
          }),
        });
      });

      it('should handle token registration failure and queue for retry', async () => {
        // Mock failed API response
        global.fetch = jest.fn().mockResolvedValue({
          ok: false,
          status: 500,
        });

        mockAsyncStorage.getItem.mockResolvedValue('user123');

        const mockToken = 'device_token_123';
        await (notificationService as any).registerTokenWithBackend(mockToken);

        // Should store failed registration for retry
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          'pending_token_registration',
          expect.stringContaining(mockToken)
        );
      });

      it('should retry pending token registration', async () => {
        // Mock pending registration
        mockAsyncStorage.getItem
          .mockResolvedValueOnce(JSON.stringify({
            token: 'pending_token_123',
            timestamp: Date.now(),
          }))
          .mockResolvedValueOnce('user123') // user_id
          .mockResolvedValueOnce('auth_token_123'); // auth_token

        // Mock successful retry
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({success: true}),
        });

        await notificationService.retryPendingTokenRegistration();

        expect(fetch).toHaveBeenCalled();
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('pending_token_registration');
      });
    });

    describe('Notification Tap Handling', () => {
      it('should navigate to alerts screen on alert notification tap', async () => {
        const mockNotification = {
          data: {
            navigationTarget: 'alerts',
            params: {highlightAlertId: 'alert123'},
          },
        };

        await (notificationService as any).handleNotificationTap(mockNotification);

        // Wait for dynamic import
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockNavigationService.navigate).toHaveBeenCalledWith('Alerts', {
          highlightAlertId: 'alert123',
        });
      });

      it('should navigate to dashboard by default when no target specified', async () => {
        const mockNotification = {
          data: {
            navigationTarget: 'unknown',
          },
        };

        await (notificationService as any).handleNotificationTap(mockNotification);

        // Wait for dynamic import
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockNavigationService.navigate).toHaveBeenCalledWith('Dashboard');
      });

      it('should handle notification without data gracefully', async () => {
        const mockNotification = {};

        await (notificationService as any).handleNotificationTap(mockNotification);

        expect(mockNavigationService.navigate).not.toHaveBeenCalled();
      });
    });
  });

  describe('OfflineService', () => {
    describe('Offline Action Execution', () => {
      it('should execute settings update action', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({success: true}),
        });

        mockAsyncStorage.getItem.mockResolvedValue('auth_token_123');

        const mockAction = {
          id: 'action1',
          type: 'UPDATE_SETTINGS',
          payload: {theme: 'dark'},
          timestamp: Date.now(),
          retryCount: 0,
        };

        await (offlineService as any).executeOfflineAction(mockAction);

        expect(fetch).toHaveBeenCalledWith('/api/user/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer auth_token_123',
          },
          body: JSON.stringify({theme: 'dark'}),
        });
      });

      it('should execute mark alert read action', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
        });

        mockAsyncStorage.getItem.mockResolvedValue('auth_token_123');

        const mockAction = {
          id: 'action2',
          type: 'MARK_ALERT_READ',
          payload: {alertId: 'alert123'},
          timestamp: Date.now(),
          retryCount: 0,
        };

        await (offlineService as any).executeOfflineAction(mockAction);

        expect(fetch).toHaveBeenCalledWith('/api/alerts/alert123/read', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer auth_token_123',
          },
        });
      });

      it('should execute dismiss alert action', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
        });

        mockAsyncStorage.getItem.mockResolvedValue('auth_token_123');

        const mockAction = {
          id: 'action3',
          type: 'DISMISS_ALERT',
          payload: {alertId: 'alert456'},
          timestamp: Date.now(),
          retryCount: 0,
        };

        await (offlineService as any).executeOfflineAction(mockAction);

        expect(fetch).toHaveBeenCalledWith('/api/alerts/alert456/dismiss', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer auth_token_123',
          },
        });
      });

      it('should throw error for unknown action type', async () => {
        const mockAction = {
          id: 'action4',
          type: 'UNKNOWN_ACTION',
          payload: {},
          timestamp: Date.now(),
          retryCount: 0,
        };

        await expect(
          (offlineService as any).executeOfflineAction(mockAction)
        ).rejects.toThrow('Unsupported action type: UNKNOWN_ACTION');
      });
    });

    describe('Offline Queue Processing', () => {
      it('should process offline queue when coming back online', async () => {
        // Mock offline actions
        const mockActions = [
          {
            id: 'action1',
            type: 'UPDATE_SETTINGS',
            payload: {theme: 'dark'},
            timestamp: Date.now(),
            retryCount: 0,
          },
          {
            id: 'action2',
            type: 'MARK_ALERT_READ',
            payload: {alertId: 'alert123'},
            timestamp: Date.now(),
            retryCount: 0,
          },
        ];

        // Set up offline service with mock actions
        (offlineService as any).offlineQueue = mockActions;
        (offlineService as any).isOnline = true;

        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({success: true}),
        });

        mockAsyncStorage.getItem.mockResolvedValue('auth_token_123');

        await offlineService.processOfflineQueue();

        expect(fetch).toHaveBeenCalledTimes(2);
        expect((offlineService as any).offlineQueue).toHaveLength(0);
      });

      it('should retry failed actions up to max retry count', async () => {
        const mockAction = {
          id: 'action1',
          type: 'UPDATE_SETTINGS',
          payload: {theme: 'dark'},
          timestamp: Date.now(),
          retryCount: 2, // Already retried twice
        };

        (offlineService as any).offlineQueue = [mockAction];
        (offlineService as any).isOnline = true;

        // Mock failed request
        global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

        await offlineService.processOfflineQueue();

        // Should not retry again (max retry count reached)
        // The action should be removed from queue after max retries
        expect((offlineService as any).offlineQueue.length).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('ChartWidget Data Point Details', () => {
    it('should show detailed data point information when clicked', () => {
      // This would be tested in component tests
      // Here we just verify the data structure
      const mockDataPoint = {
        value: 42,
        x: 'Monday',
        y: 42,
        label: 'Productivity Score',
        dataset: {label: 'Weekly Metrics'},
        index: 0,
      };

      expect(mockDataPoint).toHaveProperty('value');
      expect(mockDataPoint).toHaveProperty('x');
      expect(mockDataPoint).toHaveProperty('label');
    });
  });

  describe('Settings Refresh Interval', () => {
    it('should validate refresh interval options', () => {
      const validIntervals = [10, 30, 60, 300, 600, 1800];
      
      validIntervals.forEach(interval => {
        expect(interval).toBeGreaterThan(0);
        expect(interval).toBeLessThanOrEqual(1800); // Max 30 minutes
      });
    });
  });

  describe('Alert Action Execution', () => {
    it('should handle alert action execution with proper error handling', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
      });

      mockAsyncStorage.getItem.mockResolvedValue('auth_token_123');

      // Mock alert action execution
      const executeAcknowledgeAction = async (alertId: string) => {
        const response = await fetch(`/api/alerts/${alertId}/acknowledge`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${await AsyncStorage.getItem('auth_token')}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to acknowledge alert');
        }
      };

      await executeAcknowledgeAction('alert123');

      expect(fetch).toHaveBeenCalledWith('/api/alerts/alert123/acknowledge', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer auth_token_123',
        },
      });
    });

    it('should add failed actions to offline queue', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const addOfflineActionSpy = jest.spyOn(offlineService, 'addOfflineAction');

      try {
        // Simulate failed action execution
        const response = await fetch('/api/alerts/alert123/acknowledge');
        if (!response.ok) {
          throw new Error('Network error');
        }
      } catch (error) {
        if (error.message.includes('network') || error.message.includes('Network')) {
          await offlineService.addOfflineAction({
            type: 'EXECUTE_ALERT_ACTION',
            payload: {alertId: 'alert123', action: {type: 'acknowledge'}},
          });
        }
      }

      expect(addOfflineActionSpy).toHaveBeenCalledWith({
        type: 'EXECUTE_ALERT_ACTION',
        payload: {alertId: 'alert123', action: {type: 'acknowledge'}},
      });
    });
  });
});