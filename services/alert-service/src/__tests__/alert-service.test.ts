import { AlertService, AlertServiceConfig, AlertRepository, AlertRuleRepository } from '../services/alert-service';
import { DefaultAlertRuleEngine, MetricData } from '../engines/alert-rule-engine';
import { 
  Alert, 
  AlertRule, 
  AlertType, 
  AlertSeverity, 
  AlertStatus,
  AlertFeedback,
  MLAnomalyResult 
} from '../types/alert-types';

// Mock implementations
class MockAlertRepository implements AlertRepository {
  private alerts = new Map<string, Alert>();

  async saveAlert(alert: Alert): Promise<void> {
    this.alerts.set(alert.id, alert);
  }

  async updateAlert(alertId: string, updates: Partial<Alert>): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (alert) {
      Object.assign(alert, updates);
    }
  }

  async getAlert(alertId: string): Promise<Alert | null> {
    return this.alerts.get(alertId) || null;
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(alert => alert.status === AlertStatus.ACTIVE);
  }

  async getAlertHistory(): Promise<Alert[]> {
    return Array.from(this.alerts.values());
  }

  async deleteAlert(alertId: string): Promise<void> {
    this.alerts.delete(alertId);
  }

  // Test helper
  clear() {
    this.alerts.clear();
  }
}

class MockAlertRuleRepository implements AlertRuleRepository {
  private rules = new Map<string, AlertRule>();

  async saveRule(rule: AlertRule): Promise<void> {
    this.rules.set(rule.id, rule);
  }

  async updateRule(ruleId: string, updates: Partial<AlertRule>): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
    }
  }

  async getRule(ruleId: string): Promise<AlertRule | null> {
    return this.rules.get(ruleId) || null;
  }

  async getRules(filters?: any): Promise<AlertRule[]> {
    let rules = Array.from(this.rules.values());
    if (filters?.enabled !== undefined) {
      rules = rules.filter(rule => rule.enabled === filters.enabled);
    }
    return rules;
  }

  async deleteRule(ruleId: string): Promise<void> {
    this.rules.delete(ruleId);
  }

  // Test helper
  clear() {
    this.rules.clear();
  }
}

describe('AlertService', () => {
  let alertService: AlertService;
  let mockAlertRepository: MockAlertRepository;
  let mockRuleRepository: MockAlertRuleRepository;
  let ruleEngine: DefaultAlertRuleEngine;
  let config: AlertServiceConfig;

  beforeEach(() => {
    config = {
      maxActiveAlerts: 100,
      defaultCooldownPeriod: 60,
      escalationTimeout: 300,
      feedbackRetentionDays: 30
    };

    mockAlertRepository = new MockAlertRepository();
    mockRuleRepository = new MockAlertRuleRepository();
    ruleEngine = new DefaultAlertRuleEngine();
    
    alertService = new AlertService(
      config,
      ruleEngine,
      mockAlertRepository,
      mockRuleRepository
    );
  });

  afterEach(() => {
    mockAlertRepository.clear();
    mockRuleRepository.clear();
  });

  describe('evaluateMetrics', () => {
    it('should create alerts when rules are triggered', async () => {
      // Setup rule
      const rule: AlertRule = {
        id: 'rule1',
        name: 'Test Rule',
        description: 'Test rule description',
        type: AlertType.PRODUCTIVITY_ANOMALY,
        severity: AlertSeverity.MEDIUM,
        enabled: true,
        conditions: [{
          id: 'condition1',
          metricType: 'productivity_score',
          operator: 'lt',
          threshold: 0.5,
          timeWindow: 30,
          aggregation: 'avg'
        }],
        actions: [],
        cooldownPeriod: 60,
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await mockRuleRepository.saveRule(rule);

      // Setup metrics that trigger the rule
      const metrics: MetricData[] = [{
        type: 'productivity_score',
        value: 0.3,
        timestamp: new Date(),
        userId: 'user1',
        teamId: 'team1'
      }];

      const alerts = await alertService.evaluateMetrics(metrics);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].ruleId).toBe('rule1');
      expect(alerts[0].status).toBe(AlertStatus.ACTIVE);
    });

    it('should not create duplicate alerts for same rule and user', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'Test Rule',
        description: 'Test rule description',
        type: AlertType.PRODUCTIVITY_ANOMALY,
        severity: AlertSeverity.MEDIUM,
        enabled: true,
        conditions: [{
          id: 'condition1',
          metricType: 'productivity_score',
          operator: 'lt',
          threshold: 0.5,
          timeWindow: 30,
          aggregation: 'avg'
        }],
        actions: [],
        cooldownPeriod: 60,
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await mockRuleRepository.saveRule(rule);

      const metrics: MetricData[] = [{
        type: 'productivity_score',
        value: 0.3,
        timestamp: new Date(),
        userId: 'user1',
        teamId: 'team1'
      }];

      // First evaluation should create alert
      const firstAlerts = await alertService.evaluateMetrics(metrics);
      expect(firstAlerts).toHaveLength(1);

      // Second evaluation should not create duplicate
      const secondAlerts = await alertService.evaluateMetrics(metrics);
      expect(secondAlerts).toHaveLength(0);
    });

    it('should respect rule cooldown periods', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'Test Rule',
        description: 'Test rule description',
        type: AlertType.PRODUCTIVITY_ANOMALY,
        severity: AlertSeverity.MEDIUM,
        enabled: true,
        conditions: [{
          id: 'condition1',
          metricType: 'productivity_score',
          operator: 'lt',
          threshold: 0.5,
          timeWindow: 30,
          aggregation: 'avg'
        }],
        actions: [],
        cooldownPeriod: 60,
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await mockRuleRepository.saveRule(rule);

      const metrics: MetricData[] = [{
        type: 'productivity_score',
        value: 0.3,
        timestamp: new Date(),
        userId: 'user1',
        teamId: 'team1'
      }];

      // First evaluation creates alert and sets cooldown
      const firstAlerts = await alertService.evaluateMetrics(metrics);
      expect(firstAlerts).toHaveLength(1);

      // Acknowledge the alert to allow new ones
      await alertService.acknowledgeAlert(firstAlerts[0].id, 'user1');

      // Second evaluation during cooldown should not create alert
      const secondAlerts = await alertService.evaluateMetrics(metrics);
      expect(secondAlerts).toHaveLength(0);
    });

    it('should skip disabled rules', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'Test Rule',
        description: 'Test rule description',
        type: AlertType.PRODUCTIVITY_ANOMALY,
        severity: AlertSeverity.MEDIUM,
        enabled: false, // Disabled
        conditions: [{
          id: 'condition1',
          metricType: 'productivity_score',
          operator: 'lt',
          threshold: 0.5,
          timeWindow: 30,
          aggregation: 'avg'
        }],
        actions: [],
        cooldownPeriod: 60,
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await mockRuleRepository.saveRule(rule);

      const metrics: MetricData[] = [{
        type: 'productivity_score',
        value: 0.3,
        timestamp: new Date(),
        userId: 'user1',
        teamId: 'team1'
      }];

      const alerts = await alertService.evaluateMetrics(metrics);
      expect(alerts).toHaveLength(0);
    });
  });

  describe('evaluateMLAnomaly', () => {
    it('should create alert for ML anomaly', async () => {
      const anomalyResult: MLAnomalyResult = {
        isAnomaly: true,
        confidence: 0.85,
        anomalyScore: 2.5,
        expectedValue: 0.7,
        actualValue: 0.3,
        contributingFactors: ['low_focus_time']
      };

      const context = {
        userId: 'user1',
        teamId: 'team1',
        metricValues: { productivity_score: 0.3 },
        timeRange: { start: new Date(), end: new Date() }
      };

      const alert = await alertService.evaluateMLAnomaly(anomalyResult, context);

      expect(alert).not.toBeNull();
      expect(alert!.type).toBe(AlertType.PRODUCTIVITY_ANOMALY);
      expect(alert!.severity).toBe(AlertSeverity.HIGH);
    });

    it('should return null for non-anomaly results', async () => {
      const anomalyResult: MLAnomalyResult = {
        isAnomaly: false,
        confidence: 0.2,
        anomalyScore: 0.5,
        expectedValue: 0.7,
        actualValue: 0.65,
        contributingFactors: []
      };

      const context = {
        userId: 'user1',
        metricValues: {},
        timeRange: { start: new Date(), end: new Date() }
      };

      const alert = await alertService.evaluateMLAnomaly(anomalyResult, context);
      expect(alert).toBeNull();
    });
  });

  describe('rule management', () => {
    it('should create new rule', async () => {
      const ruleData = {
        name: 'New Rule',
        description: 'New rule description',
        type: AlertType.QUALITY_THRESHOLD,
        severity: AlertSeverity.HIGH,
        enabled: true,
        conditions: [{
          id: 'condition1',
          metricType: 'code_quality',
          operator: 'lt' as const,
          threshold: 0.6,
          timeWindow: 60,
          aggregation: 'avg' as const
        }],
        actions: [],
        cooldownPeriod: 120,
        createdBy: 'admin'
      };

      const rule = await alertService.createRule(ruleData);

      expect(rule.id).toBeDefined();
      expect(rule.name).toBe(ruleData.name);
      expect(rule.createdAt).toBeDefined();
      expect(rule.updatedAt).toBeDefined();

      // Verify it was saved
      const savedRule = await mockRuleRepository.getRule(rule.id);
      expect(savedRule).toEqual(rule);
    });

    it('should update existing rule', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'Original Rule',
        description: 'Original description',
        type: AlertType.PRODUCTIVITY_ANOMALY,
        severity: AlertSeverity.MEDIUM,
        enabled: true,
        conditions: [],
        actions: [],
        cooldownPeriod: 60,
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await mockRuleRepository.saveRule(rule);

      // Add small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const updates = {
        name: 'Updated Rule',
        severity: AlertSeverity.HIGH
      };

      const updatedRule = await alertService.updateRule('rule1', updates);

      expect(updatedRule).not.toBeNull();
      expect(updatedRule!.name).toBe('Updated Rule');
      expect(updatedRule!.severity).toBe(AlertSeverity.HIGH);
      expect(updatedRule!.updatedAt.getTime()).toBeGreaterThanOrEqual(rule.updatedAt.getTime());
    });

    it('should delete rule', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'Test Rule',
        description: 'Test description',
        type: AlertType.PRODUCTIVITY_ANOMALY,
        severity: AlertSeverity.MEDIUM,
        enabled: true,
        conditions: [],
        actions: [],
        cooldownPeriod: 60,
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await mockRuleRepository.saveRule(rule);

      const deleted = await alertService.deleteRule('rule1');
      expect(deleted).toBe(true);

      const retrievedRule = await mockRuleRepository.getRule('rule1');
      expect(retrievedRule).toBeNull();
    });
  });

  describe('alert management', () => {
    let testAlert: Alert;

    beforeEach(async () => {
      testAlert = {
        id: 'alert1',
        ruleId: 'rule1',
        type: AlertType.PRODUCTIVITY_ANOMALY,
        severity: AlertSeverity.MEDIUM,
        status: AlertStatus.ACTIVE,
        title: 'Test Alert',
        message: 'Test alert message',
        context: {
          userId: 'user1',
          metricValues: { productivity_score: 0.3 },
          timeRange: { start: new Date(), end: new Date() }
        },
        recommendations: [],
        triggeredAt: new Date(),
        escalationLevel: 0
      };

      await mockAlertRepository.saveAlert(testAlert);
    });

    it('should acknowledge alert', async () => {
      const acknowledged = await alertService.acknowledgeAlert('alert1', 'user1');
      expect(acknowledged).toBe(true);

      const alert = await mockAlertRepository.getAlert('alert1');
      expect(alert!.status).toBe(AlertStatus.ACKNOWLEDGED);
      expect(alert!.acknowledgedBy).toBe('user1');
      expect(alert!.acknowledgedAt).toBeDefined();
    });

    it('should resolve alert', async () => {
      const resolved = await alertService.resolveAlert('alert1', 'user1');
      expect(resolved).toBe(true);

      const alert = await mockAlertRepository.getAlert('alert1');
      expect(alert!.status).toBe(AlertStatus.RESOLVED);
      expect(alert!.resolvedBy).toBe('user1');
      expect(alert!.resolvedAt).toBeDefined();
    });

    it('should suppress alert', async () => {
      const suppressUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      const suppressed = await alertService.suppressAlert('alert1', suppressUntil);
      expect(suppressed).toBe(true);

      const alert = await mockAlertRepository.getAlert('alert1');
      expect(alert!.status).toBe(AlertStatus.SUPPRESSED);
      expect(alert!.suppressedUntil).toEqual(suppressUntil);
    });

    it('should not acknowledge non-active alert', async () => {
      // First resolve the alert
      await alertService.resolveAlert('alert1', 'user1');

      // Try to acknowledge resolved alert
      const acknowledged = await alertService.acknowledgeAlert('alert1', 'user2');
      expect(acknowledged).toBe(false);
    });
  });

  describe('feedback handling', () => {
    it('should record alert feedback', async () => {
      const feedback: AlertFeedback = {
        alertId: 'alert1',
        userId: 'user1',
        relevance: 'relevant',
        actionTaken: true,
        comments: 'This alert was helpful',
        timestamp: new Date()
      };

      let feedbackReceived = false;
      alertService.on('feedbackReceived', (receivedFeedback) => {
        expect(receivedFeedback).toEqual(feedback);
        feedbackReceived = true;
      });

      await alertService.recordFeedback(feedback);
      expect(feedbackReceived).toBe(true);
    });
  });

  describe('metrics and reporting', () => {
    beforeEach(async () => {
      // Create test alerts with different types and severities
      const alerts: Alert[] = [
        {
          id: 'alert1',
          ruleId: 'rule1',
          type: AlertType.PRODUCTIVITY_ANOMALY,
          severity: AlertSeverity.HIGH,
          status: AlertStatus.RESOLVED,
          title: 'Alert 1',
          message: 'Message 1',
          context: { metricValues: {}, timeRange: { start: new Date(), end: new Date() } },
          recommendations: [],
          triggeredAt: new Date(Date.now() - 60 * 60 * 1000),
          resolvedAt: new Date(Date.now() - 30 * 60 * 1000),
          escalationLevel: 0
        },
        {
          id: 'alert2',
          ruleId: 'rule2',
          type: AlertType.QUALITY_THRESHOLD,
          severity: AlertSeverity.MEDIUM,
          status: AlertStatus.ACTIVE,
          title: 'Alert 2',
          message: 'Message 2',
          context: { metricValues: {}, timeRange: { start: new Date(), end: new Date() } },
          recommendations: [],
          triggeredAt: new Date(),
          escalationLevel: 1
        }
      ];

      for (const alert of alerts) {
        await mockAlertRepository.saveAlert(alert);
      }
    });

    it('should calculate alert metrics', async () => {
      const metrics = await alertService.getAlertMetrics();

      expect(metrics.totalAlerts).toBe(2);
      expect(metrics.alertsByType[AlertType.PRODUCTIVITY_ANOMALY]).toBe(1);
      expect(metrics.alertsByType[AlertType.QUALITY_THRESHOLD]).toBe(1);
      expect(metrics.alertsBySeverity[AlertSeverity.HIGH]).toBe(1);
      expect(metrics.alertsBySeverity[AlertSeverity.MEDIUM]).toBe(1);
      expect(metrics.averageResolutionTime).toBe(30); // 30 minutes
      expect(metrics.escalationRate).toBe(0.5); // 1 out of 2 alerts escalated
    });

    it('should get active alerts', async () => {
      const activeAlerts = await alertService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].status).toBe(AlertStatus.ACTIVE);
    });

    it('should get rules', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'Test Rule',
        description: 'Test description',
        type: AlertType.PRODUCTIVITY_ANOMALY,
        severity: AlertSeverity.MEDIUM,
        enabled: true,
        conditions: [],
        actions: [],
        cooldownPeriod: 60,
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await mockRuleRepository.saveRule(rule);

      const rules = await alertService.getRules();
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('rule1');
    });
  });

  describe('event emission', () => {
    it('should emit events for alert lifecycle', async () => {
      const events: string[] = [];

      alertService.on('alertCreated', () => events.push('created'));
      alertService.on('alertAcknowledged', () => events.push('acknowledged'));
      alertService.on('alertResolved', () => events.push('resolved'));
      alertService.on('alertSuppressed', () => events.push('suppressed'));

      // Create rule and trigger alert
      const rule: AlertRule = {
        id: 'rule1',
        name: 'Test Rule',
        description: 'Test rule description',
        type: AlertType.PRODUCTIVITY_ANOMALY,
        severity: AlertSeverity.MEDIUM,
        enabled: true,
        conditions: [{
          id: 'condition1',
          metricType: 'productivity_score',
          operator: 'lt',
          threshold: 0.5,
          timeWindow: 30,
          aggregation: 'avg'
        }],
        actions: [],
        cooldownPeriod: 60,
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await mockRuleRepository.saveRule(rule);

      const metrics: MetricData[] = [{
        type: 'productivity_score',
        value: 0.3,
        timestamp: new Date(),
        userId: 'user1'
      }];

      const alerts = await alertService.evaluateMetrics(metrics);
      const alertId = alerts[0].id;

      await alertService.acknowledgeAlert(alertId, 'user1');
      await alertService.resolveAlert(alertId, 'user1');

      expect(events).toEqual(['created', 'acknowledged', 'resolved']);
    });
  });
});