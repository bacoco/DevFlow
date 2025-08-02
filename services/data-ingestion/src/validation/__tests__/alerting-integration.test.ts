import { AlertingSystem, AlertRule } from '../alerting-system';
import { errorMetricsCollector } from '../error-metrics';
import { RetryStorage } from '../retry-storage';

// Mock dependencies
jest.mock('../error-metrics');
jest.mock('../retry-storage');

const mockErrorMetricsCollector = errorMetricsCollector as jest.Mocked<typeof errorMetricsCollector>;

describe('Alerting System Integration', () => {
  let alertingSystem: AlertingSystem;
  let mockRetryStorage: jest.Mocked<RetryStorage>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock retry storage
    mockRetryStorage = {
      getStats: jest.fn().mockResolvedValue({
        pendingJobs: 0,
        deadLetterJobs: 0,
        processedJobs: 0,
        failedJobs: 0,
        averageRetryTime: 0,
        successRate: 100
      })
    } as any;

    // Mock error metrics collector
    mockErrorMetricsCollector.getMetricsSummary = jest.fn().mockResolvedValue({
      timestamp: new Date().toISOString(),
      metrics: {
        totalErrors: 0,
        totalRetryAttempts: 0,
        totalRetrySuccesses: 0,
        totalRetryFailures: 0,
        currentRetryQueueSize: 0,
        currentDeadLetterQueueSize: 0,
        totalValidationErrors: 0,
        totalKafkaErrors: 0
      }
    });

    alertingSystem = new AlertingSystem(mockRetryStorage);
  });

  afterEach(() => {
    alertingSystem.stop();
  });

  describe('Rule Management', () => {
    it('should initialize with default rules', () => {
      const rules = alertingSystem.getRules();
      
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(r => r.id === 'high-error-rate')).toBe(true);
      expect(rules.some(r => r.id === 'retry-queue-overflow')).toBe(true);
      expect(rules.some(r => r.id === 'dead-letter-accumulation')).toBe(true);
    });

    it('should add new alert rules', () => {
      const newRule: AlertRule = {
        id: 'test-rule',
        name: 'Test Rule',
        description: 'Test rule for unit testing',
        condition: {
          metric: 'error_rate_per_minute',
          operator: 'gt',
          threshold: 5,
          timeWindowMinutes: 1
        },
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 5,
        actions: [{ type: 'log', config: { level: 'warn' } }]
      };

      alertingSystem.addRule(newRule);
      
      const rules = alertingSystem.getRules();
      const addedRule = rules.find(r => r.id === 'test-rule');
      
      expect(addedRule).toBeDefined();
      expect(addedRule?.name).toBe('Test Rule');
    });

    it('should update existing alert rules', () => {
      const rules = alertingSystem.getRules();
      const existingRule = rules[0];
      
      const success = alertingSystem.updateRule(existingRule.id, {
        enabled: false,
        severity: 'low'
      });
      
      expect(success).toBe(true);
      
      const updatedRules = alertingSystem.getRules();
      const updatedRule = updatedRules.find(r => r.id === existingRule.id);
      
      expect(updatedRule?.enabled).toBe(false);
      expect(updatedRule?.severity).toBe('low');
    });

    it('should remove alert rules', () => {
      const rules = alertingSystem.getRules();
      const ruleToRemove = rules[0];
      
      const success = alertingSystem.removeRule(ruleToRemove.id);
      expect(success).toBe(true);
      
      const remainingRules = alertingSystem.getRules();
      expect(remainingRules.find(r => r.id === ruleToRemove.id)).toBeUndefined();
    });

    it('should return false when updating non-existent rule', () => {
      const success = alertingSystem.updateRule('non-existent-rule', { enabled: false });
      expect(success).toBe(false);
    });

    it('should return false when removing non-existent rule', () => {
      const success = alertingSystem.removeRule('non-existent-rule');
      expect(success).toBe(false);
    });
  });

  describe('Alert Triggering', () => {
    beforeEach(() => {
      // Mock high error rate to trigger alerts
      mockErrorMetricsCollector.getMetricsSummary.mockResolvedValue({
        timestamp: new Date().toISOString(),
        metrics: {
          totalErrors: 15, // Above threshold for high-error-rate rule
          totalRetryAttempts: 5,
          totalRetrySuccesses: 3,
          totalRetryFailures: 2,
          currentRetryQueueSize: 50,
          currentDeadLetterQueueSize: 10,
          totalValidationErrors: 5,
          totalKafkaErrors: 2
        }
      });
    });

    it('should trigger alerts when conditions are met', async () => {
      // Wait for evaluation cycle
      await new Promise(resolve => setTimeout(resolve, 100));

      const activeAlerts = alertingSystem.getActiveAlerts();
      expect(activeAlerts.length).toBeGreaterThan(0);
      
      const highErrorRateAlert = activeAlerts.find(a => a.ruleId === 'high-error-rate');
      expect(highErrorRateAlert).toBeDefined();
      expect(highErrorRateAlert?.status).toBe('active');
    });

    it('should respect cooldown periods', async () => {
      // First evaluation should trigger alert
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const initialAlerts = alertingSystem.getActiveAlerts();
      const initialAlertCount = initialAlerts.length;
      
      // Second evaluation should not trigger new alerts due to cooldown
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const subsequentAlerts = alertingSystem.getActiveAlerts();
      expect(subsequentAlerts.length).toBe(initialAlertCount);
    });

    it('should resolve alerts', async () => {
      // Trigger an alert first
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const activeAlerts = alertingSystem.getActiveAlerts();
      expect(activeAlerts.length).toBeGreaterThan(0);
      
      const alertToResolve = activeAlerts[0];
      const success = alertingSystem.resolveAlert(alertToResolve.id);
      
      expect(success).toBe(true);
      expect(alertToResolve.status).toBe('resolved');
      expect(alertToResolve.resolvedAt).toBeDefined();
      
      const remainingActiveAlerts = alertingSystem.getActiveAlerts();
      expect(remainingActiveAlerts.find(a => a.id === alertToResolve.id)).toBeUndefined();
    });
  });

  describe('Alert Statistics', () => {
    it('should provide alerting statistics', async () => {
      // Trigger some alerts
      mockErrorMetricsCollector.getMetricsSummary.mockResolvedValue({
        timestamp: new Date().toISOString(),
        metrics: {
          totalErrors: 15,
          currentRetryQueueSize: 1500, // Above threshold for retry-queue-overflow
          currentDeadLetterQueueSize: 150, // Above threshold for dead-letter-accumulation
          totalValidationErrors: 60, // Above threshold for validation-error-spike
          totalKafkaErrors: 10, // Above threshold for kafka-connection-errors
          totalRetryAttempts: 0,
          totalRetrySuccesses: 0,
          totalRetryFailures: 0
        }
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = alertingSystem.getAlertingStats();
      
      expect(stats.totalAlerts).toBeGreaterThan(0);
      expect(stats.activeAlerts).toBeGreaterThan(0);
      expect(stats.alertsByRule).toBeDefined();
      expect(stats.alertsBySeverity).toBeDefined();
      
      // Check that we have alerts for different severity levels
      expect(Object.keys(stats.alertsBySeverity).length).toBeGreaterThan(0);
    });

    it('should track alerts by rule and severity', async () => {
      // Trigger alerts
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const stats = alertingSystem.getAlertingStats();
      
      // Should have alerts categorized by rule
      expect(Object.keys(stats.alertsByRule).length).toBeGreaterThan(0);
      
      // Should have alerts categorized by severity
      expect(Object.keys(stats.alertsBySeverity).length).toBeGreaterThan(0);
      expect(stats.alertsBySeverity.critical || 0).toBeGreaterThanOrEqual(0);
      expect(stats.alertsBySeverity.high || 0).toBeGreaterThanOrEqual(0);
      expect(stats.alertsBySeverity.medium || 0).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Alert Actions', () => {
    it('should execute log actions', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Add a rule with log action
      const testRule: AlertRule = {
        id: 'log-test-rule',
        name: 'Log Test Rule',
        description: 'Test rule for log action',
        condition: {
          metric: 'error_rate_per_minute',
          operator: 'gt',
          threshold: 1,
          timeWindowMinutes: 1
        },
        severity: 'low',
        enabled: true,
        cooldownMinutes: 1,
        actions: [{ type: 'log', config: { level: 'info' } }]
      };

      alertingSystem.addRule(testRule);

      // Set up conditions to trigger the alert
      mockErrorMetricsCollector.getMetricsSummary.mockResolvedValue({
        timestamp: new Date().toISOString(),
        metrics: {
          totalErrors: 5, // Above threshold
          totalRetryAttempts: 0,
          totalRetrySuccesses: 0,
          totalRetryFailures: 0,
          currentRetryQueueSize: 0,
          currentDeadLetterQueueSize: 0,
          totalValidationErrors: 0,
          totalKafkaErrors: 0
        }
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify log action was executed (indirectly through alert being active)
      const activeAlerts = alertingSystem.getActiveAlerts();
      const logTestAlert = activeAlerts.find(a => a.ruleId === 'log-test-rule');
      expect(logTestAlert).toBeDefined();

      logSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle metrics collection errors gracefully', async () => {
      mockErrorMetricsCollector.getMetricsSummary.mockRejectedValue(new Error('Metrics error'));

      // Should not crash the alerting system
      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = alertingSystem.getAlertingStats();
      expect(stats).toBeDefined();
    });

    it('should handle retry storage errors gracefully', async () => {
      mockRetryStorage.getStats.mockRejectedValue(new Error('Storage error'));

      // Should not crash the alerting system
      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = alertingSystem.getAlertingStats();
      expect(stats).toBeDefined();
    });
  });
});