/**
 * Alert Service Tests
 * Comprehensive tests for the real-time alert system
 */

import { alertService, createAlert, createCriticalAlert } from '../alertService';
import { websocketService } from '../websocketService';
import { notificationService } from '../notificationService';

// Mock dependencies
jest.mock('../websocketService');
jest.mock('../notificationService');

const mockWebsocketService = websocketService as jest.Mocked<typeof websocketService>;
const mockNotificationService = notificationService as jest.Mocked<typeof notificationService>;

describe('AlertService', () => {
  beforeEach(() => {
    // Clear all alerts and reset state
    alertService.clearAll();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Alert Creation', () => {
    it('should create a new alert with correct properties', async () => {
      const alertData = {
        title: 'Test Alert',
        message: 'This is a test alert',
        severity: 'high' as const,
        category: 'test',
        source: 'unit-test',
        channels: ['in-app' as const],
        tags: ['test'],
        metadata: { testKey: 'testValue' },
      };

      const alertId = await alertService.createAlert(alertData);

      expect(alertId).toBeDefined();
      expect(typeof alertId).toBe('string');

      const alerts = alertService.getActiveAlerts();
      expect(alerts).toHaveLength(1);
      
      const alert = alerts[0];
      expect(alert.id).toBe(alertId);
      expect(alert.title).toBe(alertData.title);
      expect(alert.message).toBe(alertData.message);
      expect(alert.severity).toBe(alertData.severity);
      expect(alert.status).toBe('active');
      expect(alert.escalationLevel).toBe(0);
      expect(alert.deliveryAttempts).toEqual([]);
    });

    it('should add alert to history immediately', async () => {
      const alertData = {
        title: 'Test Alert',
        message: 'Test message',
        severity: 'medium' as const,
        category: 'test',
        source: 'unit-test',
        channels: ['in-app' as const],
        tags: [],
        metadata: {},
      };

      await alertService.createAlert(alertData);

      const history = alertService.getAlertHistory();
      expect(history).toHaveLength(1);
      expect(history[0].title).toBe(alertData.title);
    });

    it('should schedule escalation for new alerts', async () => {
      const alertData = {
        title: 'Test Alert',
        message: 'Test message',
        severity: 'critical' as const,
        category: 'test',
        source: 'unit-test',
        channels: ['in-app' as const],
        tags: [],
        metadata: {},
      };

      const alertId = await alertService.createAlert(alertData);

      // Fast-forward time to trigger escalation
      jest.advanceTimersByTime(15 * 60 * 1000); // 15 minutes

      const alerts = alertService.getActiveAlerts();
      const alert = alerts.find(a => a.id === alertId);
      expect(alert?.escalationLevel).toBe(1);
      expect(alert?.status).toBe('escalated');
    });
  });

  describe('Alert Acknowledgment', () => {
    it('should acknowledge an active alert', async () => {
      const alertId = await alertService.createAlert({
        title: 'Test Alert',
        message: 'Test message',
        severity: 'high' as const,
        category: 'test',
        source: 'unit-test',
        channels: ['in-app' as const],
        tags: [],
        metadata: {},
      });

      const result = await alertService.acknowledgeAlert(alertId, 'test-user');

      expect(result).toBe(true);

      const alerts = alertService.getActiveAlerts();
      const alert = alerts.find(a => a.id === alertId);
      expect(alert?.status).toBe('acknowledged');
      expect(alert?.acknowledgedBy).toBe('test-user');
      expect(alert?.acknowledgedAt).toBeInstanceOf(Date);
    });

    it('should not acknowledge non-active alerts', async () => {
      const alertId = await alertService.createAlert({
        title: 'Test Alert',
        message: 'Test message',
        severity: 'medium' as const,
        category: 'test',
        source: 'unit-test',
        channels: ['in-app' as const],
        tags: [],
        metadata: {},
      });

      // First acknowledge the alert
      await alertService.acknowledgeAlert(alertId, 'test-user');

      // Try to acknowledge again
      const result = await alertService.acknowledgeAlert(alertId, 'another-user');

      expect(result).toBe(false);
    });

    it('should cancel escalation timer when acknowledged', async () => {
      const alertId = await alertService.createAlert({
        title: 'Test Alert',
        message: 'Test message',
        severity: 'critical' as const,
        category: 'test',
        source: 'unit-test',
        channels: ['in-app' as const],
        tags: [],
        metadata: {},
      });

      await alertService.acknowledgeAlert(alertId, 'test-user');

      // Fast-forward time - escalation should not occur
      jest.advanceTimersByTime(20 * 60 * 1000); // 20 minutes

      const alerts = alertService.getActiveAlerts();
      const alert = alerts.find(a => a.id === alertId);
      expect(alert?.escalationLevel).toBe(0);
      expect(alert?.status).toBe('acknowledged');
    });
  });

  describe('Alert Resolution', () => {
    it('should resolve an active alert', async () => {
      const alertId = await alertService.createAlert({
        title: 'Test Alert',
        message: 'Test message',
        severity: 'high' as const,
        category: 'test',
        source: 'unit-test',
        channels: ['in-app' as const],
        tags: [],
        metadata: {},
      });

      const result = await alertService.resolveAlert(alertId, 'test-user');

      expect(result).toBe(true);

      const activeAlerts = alertService.getActiveAlerts();
      expect(activeAlerts.find(a => a.id === alertId)).toBeUndefined();

      const history = alertService.getAlertHistory();
      const alert = history.find(a => a.id === alertId);
      expect(alert?.status).toBe('resolved');
      expect(alert?.resolvedBy).toBe('test-user');
      expect(alert?.resolvedAt).toBeInstanceOf(Date);
    });

    it('should resolve an acknowledged alert', async () => {
      const alertId = await alertService.createAlert({
        title: 'Test Alert',
        message: 'Test message',
        severity: 'medium' as const,
        category: 'test',
        source: 'unit-test',
        channels: ['in-app' as const],
        tags: [],
        metadata: {},
      });

      await alertService.acknowledgeAlert(alertId, 'test-user');
      const result = await alertService.resolveAlert(alertId, 'test-user');

      expect(result).toBe(true);

      const history = alertService.getAlertHistory();
      const alert = history.find(a => a.id === alertId);
      expect(alert?.status).toBe('resolved');
    });
  });

  describe('Alert Snoozing', () => {
    it('should snooze an active alert', async () => {
      const alertId = await alertService.createAlert({
        title: 'Test Alert',
        message: 'Test message',
        severity: 'medium' as const,
        category: 'test',
        source: 'unit-test',
        channels: ['in-app' as const],
        tags: [],
        metadata: {},
      });

      const result = await alertService.snoozeAlert(alertId, 30, 'test-user');

      expect(result).toBe(true);

      const alerts = alertService.getActiveAlerts();
      const alert = alerts.find(a => a.id === alertId);
      expect(alert?.status).toBe('snoozed');
      expect(alert?.snoozedUntil).toBeInstanceOf(Date);
    });

    it('should reactivate alert after snooze period', async () => {
      const alertId = await alertService.createAlert({
        title: 'Test Alert',
        message: 'Test message',
        severity: 'low' as const,
        category: 'test',
        source: 'unit-test',
        channels: ['in-app' as const],
        tags: [],
        metadata: {},
      });

      await alertService.snoozeAlert(alertId, 30, 'test-user');

      // Fast-forward past snooze period
      jest.advanceTimersByTime(31 * 60 * 1000); // 31 minutes

      const alerts = alertService.getActiveAlerts();
      const alert = alerts.find(a => a.id === alertId);
      expect(alert?.status).toBe('active');
      expect(alert?.snoozedUntil).toBeUndefined();
    });

    it('should not allow snoozing critical alerts by default', async () => {
      const alertId = await alertService.createAlert({
        title: 'Critical Alert',
        message: 'Critical message',
        severity: 'critical' as const,
        category: 'test',
        source: 'unit-test',
        channels: ['in-app' as const],
        tags: [],
        metadata: {},
      });

      await expect(
        alertService.snoozeAlert(alertId, 30, 'test-user')
      ).rejects.toThrow('Snoozing not allowed for critical severity alerts');
    });
  });

  describe('Alert Escalation', () => {
    it('should escalate an alert', async () => {
      const alertId = await alertService.createAlert({
        title: 'Test Alert',
        message: 'Test message',
        severity: 'high' as const,
        category: 'test',
        source: 'unit-test',
        channels: ['in-app' as const],
        tags: [],
        metadata: {},
      });

      const result = await alertService.escalateAlert(alertId);

      expect(result).toBe(true);

      const alerts = alertService.getActiveAlerts();
      const alert = alerts.find(a => a.id === alertId);
      expect(alert?.escalationLevel).toBe(1);
      expect(alert?.status).toBe('escalated');
      expect(alert?.escalatedAt).toBeInstanceOf(Date);
    });

    it('should not escalate non-active alerts', async () => {
      const alertId = await alertService.createAlert({
        title: 'Test Alert',
        message: 'Test message',
        severity: 'medium' as const,
        category: 'test',
        source: 'unit-test',
        channels: ['in-app' as const],
        tags: [],
        metadata: {},
      });

      await alertService.resolveAlert(alertId, 'test-user');
      const result = await alertService.escalateAlert(alertId);

      expect(result).toBe(false);
    });
  });

  describe('User Preferences', () => {
    it('should return default preferences for new users', () => {
      const preferences = alertService.getUserPreferences('new-user');

      expect(preferences.userId).toBe('new-user');
      expect(preferences.channels['in-app'].enabled).toBe(true);
      expect(preferences.channels.email.enabled).toBe(true);
      expect(preferences.escalationSettings.autoEscalate).toBe(true);
    });

    it('should update user preferences', () => {
      const userId = 'test-user';
      const updates = {
        channels: {
          ...alertService.getUserPreferences(userId).channels,
          email: {
            ...alertService.getUserPreferences(userId).channels.email,
            enabled: false,
          },
        },
      };

      alertService.updateUserPreferences(userId, updates);

      const preferences = alertService.getUserPreferences(userId);
      expect(preferences.channels.email.enabled).toBe(false);
    });
  });

  describe('Alert Statistics', () => {
    it('should return correct statistics', async () => {
      // Create alerts with different severities and statuses
      const alert1 = await alertService.createAlert({
        title: 'Critical Alert',
        message: 'Critical',
        severity: 'critical' as const,
        category: 'system',
        source: 'test',
        channels: ['in-app' as const],
        tags: [],
        metadata: {},
      });

      const alert2 = await alertService.createAlert({
        title: 'High Alert',
        message: 'High',
        severity: 'high' as const,
        category: 'security',
        source: 'test',
        channels: ['in-app' as const],
        tags: [],
        metadata: {},
      });

      await alertService.acknowledgeAlert(alert2, 'test-user');

      const stats = alertService.getAlertStatistics();

      expect(stats.total).toBe(2);
      expect(stats.active).toBe(1);
      expect(stats.acknowledged).toBe(1);
      expect(stats.bySeverity.critical).toBe(1);
      expect(stats.bySeverity.high).toBe(1);
      expect(stats.byCategory.system).toBe(1);
      expect(stats.byCategory.security).toBe(1);
    });
  });

  describe('Alert Filtering', () => {
    beforeEach(async () => {
      // Create test alerts
      await alertService.createAlert({
        title: 'System Alert',
        message: 'System issue',
        severity: 'critical' as const,
        category: 'system',
        source: 'monitoring',
        channels: ['in-app' as const],
        tags: ['urgent'],
        metadata: {},
      });

      await alertService.createAlert({
        title: 'Security Alert',
        message: 'Security breach',
        severity: 'high' as const,
        category: 'security',
        source: 'security-scanner',
        channels: ['in-app' as const],
        tags: ['security'],
        metadata: {},
      });

      await alertService.createAlert({
        title: 'Performance Alert',
        message: 'Slow response',
        severity: 'medium' as const,
        category: 'performance',
        source: 'apm',
        channels: ['in-app' as const],
        tags: ['performance'],
        metadata: {},
      });
    });

    it('should filter alerts by category', () => {
      const systemAlerts = alertService.getAlertsByCategory('system');
      expect(systemAlerts).toHaveLength(1);
      expect(systemAlerts[0].category).toBe('system');
    });

    it('should return alerts sorted by severity and timestamp', () => {
      const alerts = alertService.getActiveAlerts();
      expect(alerts).toHaveLength(3);
      
      // Should be sorted by severity (critical first) then by timestamp
      expect(alerts[0].severity).toBe('critical');
      expect(alerts[1].severity).toBe('high');
      expect(alerts[2].severity).toBe('medium');
    });
  });

  describe('WebSocket Integration', () => {
    it('should handle remote alert creation', async () => {
      const remoteAlertData = {
        id: 'remote-alert-1',
        title: 'Remote Alert',
        message: 'Alert from remote source',
        severity: 'high',
        category: 'remote',
        source: 'remote-system',
        channels: ['in-app'],
        tags: [],
        metadata: {},
      };

      // Simulate WebSocket event
      const onHandler = mockWebsocketService.on.mock.calls.find(
        call => call[0] === 'alert:created'
      )?.[1];

      if (onHandler) {
        await onHandler(remoteAlertData);
      }

      const alerts = alertService.getActiveAlerts();
      expect(alerts.some(alert => alert.title === 'Remote Alert')).toBe(true);
    });

    it('should handle remote acknowledgment', async () => {
      const alertId = await alertService.createAlert({
        title: 'Test Alert',
        message: 'Test',
        severity: 'medium' as const,
        category: 'test',
        source: 'test',
        channels: ['in-app' as const],
        tags: [],
        metadata: {},
      });

      // Simulate remote acknowledgment
      const onHandler = mockWebsocketService.on.mock.calls.find(
        call => call[0] === 'alert:acknowledged'
      )?.[1];

      if (onHandler) {
        onHandler({
          alertId,
          userId: 'remote-user',
          timestamp: new Date().toISOString(),
        });
      }

      const alerts = alertService.getActiveAlerts();
      const alert = alerts.find(a => a.id === alertId);
      expect(alert?.status).toBe('acknowledged');
      expect(alert?.acknowledgedBy).toBe('remote-user');
    });
  });

  describe('Delivery System', () => {
    it('should deliver in-app notifications', async () => {
      const alertId = await alertService.createAlert({
        title: 'Test Alert',
        message: 'Test message',
        severity: 'high' as const,
        category: 'test',
        source: 'unit-test',
        channels: ['in-app' as const],
        tags: [],
        metadata: {},
      });

      // Allow delivery queue to process
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockNotificationService.addNotification).toHaveBeenCalled();
      
      const call = mockNotificationService.addNotification.mock.calls[0][0];
      expect(call.title).toBe('Test Alert');
      expect(call.message).toBe('Test message');
      expect(call.type).toBe('warning'); // high severity maps to warning
    });
  });
});

describe('Convenience Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create alert with createAlert function', async () => {
    const alertId = await createAlert(
      'Test Alert',
      'Test message',
      'medium',
      'test'
    );

    expect(alertId).toBeDefined();
    expect(typeof alertId).toBe('string');
  });

  it('should create critical alert with createCriticalAlert function', async () => {
    const alertId = await createCriticalAlert(
      'Critical Alert',
      'Critical message',
      'system'
    );

    expect(alertId).toBeDefined();
    
    const alerts = alertService.getActiveAlerts();
    const alert = alerts.find(a => a.id === alertId);
    expect(alert?.severity).toBe('critical');
    expect(alert?.channels).toContain('in-app');
    expect(alert?.channels).toContain('email');
    expect(alert?.channels).toContain('push');
  });
});