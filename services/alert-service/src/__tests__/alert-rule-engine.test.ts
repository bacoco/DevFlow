import { DefaultAlertRuleEngine, MetricData } from '../engines/alert-rule-engine';
import { 
  AlertRule, 
  AlertCondition, 
  AlertType, 
  AlertSeverity, 
  AlertStatus,
  MLAnomalyResult,
  AlertContext 
} from '../types/alert-types';

describe('DefaultAlertRuleEngine', () => {
  let engine: DefaultAlertRuleEngine;
  let mockMetrics: MetricData[];
  let mockRule: AlertRule;

  beforeEach(() => {
    engine = new DefaultAlertRuleEngine();
    
    mockMetrics = [
      {
        type: 'productivity_score',
        value: 0.3,
        timestamp: new Date(),
        userId: 'user1',
        teamId: 'team1',
        metadata: { source: 'ide_telemetry' }
      },
      {
        type: 'code_quality_score',
        value: 0.7,
        timestamp: new Date(),
        userId: 'user1',
        teamId: 'team1',
        metadata: { source: 'git_analysis' }
      }
    ];

    mockRule = {
      id: 'rule1',
      name: 'Low Productivity Alert',
      description: 'Alert when productivity drops below threshold',
      type: AlertType.PRODUCTIVITY_ANOMALY,
      severity: AlertSeverity.MEDIUM,
      enabled: true,
      conditions: [
        {
          id: 'condition1',
          metricType: 'productivity_score',
          operator: 'lt',
          threshold: 0.5,
          timeWindow: 30,
          aggregation: 'avg'
        }
      ],
      actions: [],
      cooldownPeriod: 60,
      createdBy: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  describe('evaluateCondition', () => {
    it('should return true when condition is met', () => {
      const condition: AlertCondition = {
        id: 'test',
        metricType: 'productivity_score',
        operator: 'lt',
        threshold: 0.5,
        timeWindow: 30,
        aggregation: 'avg'
      };

      const result = engine.evaluateCondition(condition, mockMetrics);
      expect(result).toBe(true);
    });

    it('should return false when condition is not met', () => {
      const condition: AlertCondition = {
        id: 'test',
        metricType: 'productivity_score',
        operator: 'gt',
        threshold: 0.5,
        timeWindow: 30,
        aggregation: 'avg'
      };

      const result = engine.evaluateCondition(condition, mockMetrics);
      expect(result).toBe(false);
    });

    it('should handle different aggregation types', () => {
      const metrics = [
        { type: 'test_metric', value: 10, timestamp: new Date() },
        { type: 'test_metric', value: 20, timestamp: new Date() },
        { type: 'test_metric', value: 30, timestamp: new Date() }
      ];

      // Test average aggregation
      const avgCondition: AlertCondition = {
        id: 'test',
        metricType: 'test_metric',
        operator: 'eq',
        threshold: 20,
        timeWindow: 30,
        aggregation: 'avg'
      };
      expect(engine.evaluateCondition(avgCondition, metrics)).toBe(true);

      // Test sum aggregation
      const sumCondition: AlertCondition = {
        id: 'test',
        metricType: 'test_metric',
        operator: 'eq',
        threshold: 60,
        timeWindow: 30,
        aggregation: 'sum'
      };
      expect(engine.evaluateCondition(sumCondition, metrics)).toBe(true);

      // Test max aggregation
      const maxCondition: AlertCondition = {
        id: 'test',
        metricType: 'test_metric',
        operator: 'eq',
        threshold: 30,
        timeWindow: 30,
        aggregation: 'max'
      };
      expect(engine.evaluateCondition(maxCondition, metrics)).toBe(true);

      // Test min aggregation
      const minCondition: AlertCondition = {
        id: 'test',
        metricType: 'test_metric',
        operator: 'eq',
        threshold: 10,
        timeWindow: 30,
        aggregation: 'min'
      };
      expect(engine.evaluateCondition(minCondition, metrics)).toBe(true);

      // Test count aggregation
      const countCondition: AlertCondition = {
        id: 'test',
        metricType: 'test_metric',
        operator: 'eq',
        threshold: 3,
        timeWindow: 30,
        aggregation: 'count'
      };
      expect(engine.evaluateCondition(countCondition, metrics)).toBe(true);
    });

    it('should handle different operators', () => {
      const condition: AlertCondition = {
        id: 'test',
        metricType: 'productivity_score',
        operator: 'gte',
        threshold: 0.3,
        timeWindow: 30,
        aggregation: 'avg'
      };

      expect(engine.evaluateCondition(condition, mockMetrics)).toBe(true);

      condition.operator = 'lte';
      condition.threshold = 0.3;
      expect(engine.evaluateCondition(condition, mockMetrics)).toBe(true);

      condition.operator = 'ne';
      condition.threshold = 0.5;
      expect(engine.evaluateCondition(condition, mockMetrics)).toBe(true);
    });

    it('should return false for non-existent metric types', () => {
      const condition: AlertCondition = {
        id: 'test',
        metricType: 'non_existent_metric',
        operator: 'gt',
        threshold: 0.5,
        timeWindow: 30,
        aggregation: 'avg'
      };

      const result = engine.evaluateCondition(condition, mockMetrics);
      expect(result).toBe(false);
    });

    it('should filter metrics by time window', () => {
      const oldMetric = {
        type: 'productivity_score',
        value: 0.8,
        timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        userId: 'user1'
      };

      const recentMetric = {
        type: 'productivity_score',
        value: 0.2,
        timestamp: new Date(),
        userId: 'user1'
      };

      const condition: AlertCondition = {
        id: 'test',
        metricType: 'productivity_score',
        operator: 'lt',
        threshold: 0.5,
        timeWindow: 30, // 30 minutes
        aggregation: 'avg'
      };

      // Should only consider recent metric
      const result = engine.evaluateCondition(condition, [oldMetric, recentMetric]);
      expect(result).toBe(true);
    });
  });

  describe('evaluateRule', () => {
    it('should create alert when all conditions are met', async () => {
      const alert = await engine.evaluateRule(mockRule, mockMetrics);
      
      expect(alert).not.toBeNull();
      expect(alert!.ruleId).toBe(mockRule.id);
      expect(alert!.type).toBe(mockRule.type);
      expect(alert!.severity).toBe(mockRule.severity);
      expect(alert!.status).toBe(AlertStatus.ACTIVE);
      expect(alert!.recommendations).toHaveLength(1);
    });

    it('should return null when conditions are not met', async () => {
      mockRule.conditions[0].operator = 'gt'; // Change to greater than
      
      const alert = await engine.evaluateRule(mockRule, mockMetrics);
      expect(alert).toBeNull();
    });

    it('should return null when rule is disabled', async () => {
      mockRule.enabled = false;
      
      const alert = await engine.evaluateRule(mockRule, mockMetrics);
      expect(alert).toBeNull();
    });

    it('should handle multiple conditions with AND logic', async () => {
      mockRule.conditions.push({
        id: 'condition2',
        metricType: 'code_quality_score',
        operator: 'gt',
        threshold: 0.5,
        timeWindow: 30,
        aggregation: 'avg'
      });

      const alert = await engine.evaluateRule(mockRule, mockMetrics);
      expect(alert).not.toBeNull();
    });

    it('should return null when one condition fails in multi-condition rule', async () => {
      mockRule.conditions.push({
        id: 'condition2',
        metricType: 'code_quality_score',
        operator: 'lt', // This will fail
        threshold: 0.5,
        timeWindow: 30,
        aggregation: 'avg'
      });

      const alert = await engine.evaluateRule(mockRule, mockMetrics);
      expect(alert).toBeNull();
    });

    it('should include relevant metrics in alert context', async () => {
      const alert = await engine.evaluateRule(mockRule, mockMetrics);
      
      expect(alert!.context.metricValues).toHaveProperty('productivity_score', 0.3);
      expect(alert!.context.userId).toBe('user1');
      expect(alert!.context.teamId).toBe('team1');
    });
  });

  describe('evaluateRules', () => {
    it('should evaluate multiple rules and return all triggered alerts', async () => {
      const rule2: AlertRule = {
        ...mockRule,
        id: 'rule2',
        name: 'High Quality Alert',
        type: AlertType.QUALITY_THRESHOLD,
        conditions: [{
          id: 'condition2',
          metricType: 'code_quality_score',
          operator: 'gt',
          threshold: 0.6,
          timeWindow: 30,
          aggregation: 'avg'
        }]
      };

      const alerts = await engine.evaluateRules(mockMetrics, [mockRule, rule2]);
      expect(alerts).toHaveLength(2);
      expect(alerts[0].ruleId).toBe('rule1');
      expect(alerts[1].ruleId).toBe('rule2');
    });

    it('should skip disabled rules', async () => {
      mockRule.enabled = false;
      
      const alerts = await engine.evaluateRules(mockMetrics, [mockRule]);
      expect(alerts).toHaveLength(0);
    });

    it('should handle rule evaluation errors gracefully', async () => {
      const invalidRule: AlertRule = {
        ...mockRule,
        conditions: [{
          id: 'invalid',
          metricType: 'productivity_score',
          operator: 'invalid_operator' as any,
          threshold: 0.5,
          timeWindow: 30,
          aggregation: 'avg'
        }]
      };

      const alerts = await engine.evaluateRules(mockMetrics, [invalidRule]);
      expect(alerts).toHaveLength(0);
    });
  });

  describe('generateMLAnomalyAlert', () => {
    it('should create anomaly alert with correct properties', () => {
      const anomalyResult: MLAnomalyResult = {
        isAnomaly: true,
        confidence: 0.85,
        anomalyScore: 2.5,
        expectedValue: 0.7,
        actualValue: 0.3,
        contributingFactors: ['low_focus_time', 'high_interruptions']
      };

      const context: AlertContext = {
        userId: 'user1',
        teamId: 'team1',
        metricValues: { productivity_score: 0.3 },
        timeRange: { start: new Date(), end: new Date() }
      };

      const alert = engine.generateMLAnomalyAlert(anomalyResult, context);

      expect(alert.type).toBe(AlertType.PRODUCTIVITY_ANOMALY);
      expect(alert.severity).toBe(AlertSeverity.HIGH);
      expect(alert.status).toBe(AlertStatus.ACTIVE);
      expect(alert.title).toBe('Productivity Anomaly Detected');
      expect(alert.message).toContain('85.0% confidence');
      expect(alert.message).toContain('Expected: 0.70');
      expect(alert.message).toContain('Actual: 0.30');
      expect(alert.recommendations).toHaveLength(2);
    });

    it('should classify severity based on confidence', () => {
      const testCases = [
        { confidence: 0.95, expectedSeverity: AlertSeverity.CRITICAL },
        { confidence: 0.75, expectedSeverity: AlertSeverity.HIGH },
        { confidence: 0.55, expectedSeverity: AlertSeverity.MEDIUM },
        { confidence: 0.25, expectedSeverity: AlertSeverity.LOW }
      ];

      testCases.forEach(({ confidence, expectedSeverity }) => {
        const anomalyResult: MLAnomalyResult = {
          isAnomaly: true,
          confidence,
          anomalyScore: 1.0,
          expectedValue: 0.5,
          actualValue: 0.3,
          contributingFactors: ['test']
        };

        const context: AlertContext = {
          metricValues: {},
          timeRange: { start: new Date(), end: new Date() }
        };

        const alert = engine.generateMLAnomalyAlert(anomalyResult, context);
        expect(alert.severity).toBe(expectedSeverity);
      });
    });
  });

  describe('classifySeverity', () => {
    it('should classify severity based on deviation from threshold', () => {
      const testCases = [
        { value: 1.0, threshold: 0.5, expected: AlertSeverity.CRITICAL }, // 100% deviation
        { value: 0.8, threshold: 0.5, expected: AlertSeverity.CRITICAL }, // 60% deviation
        { value: 0.65, threshold: 0.5, expected: AlertSeverity.HIGH },    // 30% deviation
        { value: 0.6, threshold: 0.5, expected: AlertSeverity.MEDIUM },   // 20% deviation
        { value: 0.55, threshold: 0.5, expected: AlertSeverity.MEDIUM },  // 10% deviation
        { value: 0.52, threshold: 0.5, expected: AlertSeverity.LOW }      // 4% deviation
      ];

      testCases.forEach(({ value, threshold, expected }) => {
        const severity = engine.classifySeverity(mockRule, value, threshold);
        expect(severity).toBe(expected);
      });
    });
  });

  describe('generateRecommendations', () => {
    it('should generate appropriate recommendations for different alert types', () => {
      const testCases = [
        {
          type: AlertType.PRODUCTIVITY_ANOMALY,
          expectedTitle: 'Review Recent Changes'
        },
        {
          type: AlertType.QUALITY_THRESHOLD,
          expectedTitle: 'Code Review Focus'
        },
        {
          type: AlertType.FLOW_INTERRUPTION,
          expectedTitle: 'Minimize Interruptions'
        }
      ];

      testCases.forEach(({ type, expectedTitle }) => {
        const rule = { ...mockRule, type };
        const context: AlertContext = {
          metricValues: {},
          timeRange: { start: new Date(), end: new Date() }
        };

        const recommendations = engine.generateRecommendations(rule, context);
        expect(recommendations).toHaveLength(1);
        expect(recommendations[0].title).toBe(expectedTitle);
      });
    });

    it('should generate default recommendation for unknown alert types', () => {
      const rule = { ...mockRule, type: 'unknown_type' as AlertType };
      const context: AlertContext = {
        metricValues: {},
        timeRange: { start: new Date(), end: new Date() }
      };

      const recommendations = engine.generateRecommendations(rule, context);
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].title).toBe('Monitor Trends');
    });
  });
});