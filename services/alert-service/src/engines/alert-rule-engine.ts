import { 
  Alert, 
  AlertRule, 
  AlertCondition, 
  AlertContext, 
  AlertSeverity, 
  AlertStatus, 
  AlertType,
  MLAnomalyResult,
  Recommendation 
} from '../types/alert-types';
import { v4 as uuidv4 } from 'uuid';

export interface MetricData {
  type: string;
  value: number;
  timestamp: Date;
  userId?: string;
  teamId?: string;
  projectId?: string;
  metadata?: Record<string, any>;
}

export interface AlertRuleEngine {
  evaluateRules(metrics: MetricData[], rules: AlertRule[]): Promise<Alert[]>;
  evaluateRule(rule: AlertRule, metrics: MetricData[]): Promise<Alert | null>;
  evaluateCondition(condition: AlertCondition, metrics: MetricData[]): boolean;
  generateMLAnomalyAlert(anomalyResult: MLAnomalyResult, context: AlertContext): Alert;
  classifySeverity(rule: AlertRule, metricValue: number, threshold: number): AlertSeverity;
  generateRecommendations(rule: AlertRule, context: AlertContext): Recommendation[];
}

export class DefaultAlertRuleEngine implements AlertRuleEngine {
  private readonly anomalyThresholds = {
    low: 0.3,
    medium: 0.5,
    high: 0.7,
    critical: 0.9
  };

  async evaluateRules(metrics: MetricData[], rules: AlertRule[]): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    for (const rule of rules.filter(r => r.enabled)) {
      try {
        const alert = await this.evaluateRule(rule, metrics);
        if (alert) {
          alerts.push(alert);
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id}:`, error);
      }
    }
    
    return alerts;
  }

  async evaluateRule(rule: AlertRule, metrics: MetricData[]): Promise<Alert | null> {
    // Check if rule is enabled
    if (!rule.enabled) {
      return null;
    }

    // Check if all conditions are met
    const conditionResults = rule.conditions.map(condition => 
      this.evaluateCondition(condition, metrics)
    );
    
    if (!conditionResults.every(result => result)) {
      return null;
    }

    // Find the relevant metrics for context
    const relevantMetrics = metrics.filter(m => 
      rule.conditions.some(c => c.metricType === m.type)
    );

    if (relevantMetrics.length === 0) {
      return null;
    }

    // Create alert context
    const context: AlertContext = {
      userId: relevantMetrics[0]?.userId,
      teamId: relevantMetrics[0]?.teamId,
      projectId: relevantMetrics[0]?.projectId,
      metricValues: this.extractMetricValues(relevantMetrics),
      timeRange: {
        start: new Date(Math.min(...relevantMetrics.map(m => m.timestamp.getTime()))),
        end: new Date(Math.max(...relevantMetrics.map(m => m.timestamp.getTime())))
      },
      additionalData: this.extractAdditionalData(relevantMetrics)
    };

    // Generate alert
    const alert: Alert = {
      id: uuidv4(),
      ruleId: rule.id,
      type: rule.type,
      severity: rule.severity,
      status: AlertStatus.ACTIVE,
      title: this.generateAlertTitle(rule, context),
      message: this.generateAlertMessage(rule, context),
      context,
      recommendations: this.generateRecommendations(rule, context),
      triggeredAt: new Date(),
      escalationLevel: 0
    };

    return alert;
  }

  evaluateCondition(condition: AlertCondition, metrics: MetricData[]): boolean {
    const relevantMetrics = metrics.filter(m => m.type === condition.metricType);
    
    if (relevantMetrics.length === 0) {
      return false;
    }

    // Filter metrics within time window
    const now = new Date();
    const windowStart = new Date(now.getTime() - condition.timeWindow * 60 * 1000);
    const windowMetrics = relevantMetrics.filter(m => m.timestamp >= windowStart);

    if (windowMetrics.length === 0) {
      return false;
    }

    // Calculate aggregated value
    const aggregatedValue = this.calculateAggregation(
      windowMetrics.map(m => m.value),
      condition.aggregation
    );

    // Evaluate condition
    return this.evaluateOperator(aggregatedValue, condition.operator, condition.threshold);
  }

  generateMLAnomalyAlert(anomalyResult: MLAnomalyResult, context: AlertContext): Alert {
    const severity = this.classifyAnomalySeverity(anomalyResult.confidence);
    
    return {
      id: uuidv4(),
      ruleId: 'ml-anomaly-detector',
      type: AlertType.PRODUCTIVITY_ANOMALY,
      severity,
      status: AlertStatus.ACTIVE,
      title: 'Productivity Anomaly Detected',
      message: this.generateAnomalyMessage(anomalyResult),
      context,
      recommendations: this.generateAnomalyRecommendations(anomalyResult),
      triggeredAt: new Date(),
      escalationLevel: 0
    };
  }

  classifySeverity(rule: AlertRule, metricValue: number, threshold: number): AlertSeverity {
    const deviation = Math.abs(metricValue - threshold) / threshold;
    
    if (deviation >= 0.5) return AlertSeverity.CRITICAL;
    if (deviation >= 0.3) return AlertSeverity.HIGH;
    if (deviation >= 0.1) return AlertSeverity.MEDIUM;
    return AlertSeverity.LOW;
  }

  generateRecommendations(rule: AlertRule, context: AlertContext): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    switch (rule.type) {
      case AlertType.PRODUCTIVITY_ANOMALY:
        recommendations.push({
          id: uuidv4(),
          type: 'action',
          title: 'Review Recent Changes',
          description: 'Check for recent changes in workflow or environment that might affect productivity',
          priority: 1
        });
        break;
        
      case AlertType.QUALITY_THRESHOLD:
        recommendations.push({
          id: uuidv4(),
          type: 'action',
          title: 'Code Review Focus',
          description: 'Increase code review thoroughness and consider pair programming',
          priority: 1
        });
        break;
        
      case AlertType.FLOW_INTERRUPTION:
        recommendations.push({
          id: uuidv4(),
          type: 'insight',
          title: 'Minimize Interruptions',
          description: 'Consider setting focus hours or using do-not-disturb modes',
          priority: 2
        });
        break;
        
      default:
        recommendations.push({
          id: uuidv4(),
          type: 'insight',
          title: 'Monitor Trends',
          description: 'Continue monitoring this metric for patterns',
          priority: 3
        });
    }
    
    return recommendations;
  }

  private calculateAggregation(values: number[], aggregation: string): number {
    switch (aggregation) {
      case 'avg':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      default:
        return values[values.length - 1]; // latest value
    }
  }

  private evaluateOperator(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      case 'ne': return value !== threshold;
      default: return false;
    }
  }

  private extractMetricValues(metrics: MetricData[]): Record<string, number> {
    const values: Record<string, number> = {};
    metrics.forEach(metric => {
      values[metric.type] = metric.value;
    });
    return values;
  }

  private extractAdditionalData(metrics: MetricData[]): Record<string, any> {
    const data: Record<string, any> = {};
    metrics.forEach(metric => {
      if (metric.metadata) {
        Object.assign(data, metric.metadata);
      }
    });
    return data;
  }

  private generateAlertTitle(rule: AlertRule, context: AlertContext): string {
    const metricTypes = Object.keys(context.metricValues);
    return `${rule.name} - ${metricTypes.join(', ')} Alert`;
  }

  private generateAlertMessage(rule: AlertRule, context: AlertContext): string {
    const metricValues = Object.entries(context.metricValues)
      .map(([type, value]) => `${type}: ${value}`)
      .join(', ');
    
    return `Alert triggered for rule "${rule.name}". Current values: ${metricValues}`;
  }

  private classifyAnomalySeverity(confidence: number): AlertSeverity {
    if (confidence >= this.anomalyThresholds.critical) return AlertSeverity.CRITICAL;
    if (confidence >= this.anomalyThresholds.high) return AlertSeverity.HIGH;
    if (confidence >= this.anomalyThresholds.medium) return AlertSeverity.MEDIUM;
    return AlertSeverity.LOW;
  }

  private generateAnomalyMessage(result: MLAnomalyResult): string {
    return `Anomaly detected with ${(result.confidence * 100).toFixed(1)}% confidence. ` +
           `Expected: ${result.expectedValue.toFixed(2)}, Actual: ${result.actualValue.toFixed(2)}. ` +
           `Contributing factors: ${result.contributingFactors.join(', ')}`;
  }

  private generateAnomalyRecommendations(result: MLAnomalyResult): Recommendation[] {
    const recommendations: Recommendation[] = [
      {
        id: uuidv4(),
        type: 'insight',
        title: 'Investigate Root Cause',
        description: `Focus on: ${result.contributingFactors.slice(0, 3).join(', ')}`,
        priority: 1
      }
    ];

    if (result.confidence > 0.8) {
      recommendations.push({
        id: uuidv4(),
        type: 'action',
        title: 'Immediate Attention Required',
        description: 'High confidence anomaly detected - consider immediate intervention',
        priority: 1
      });
    }

    return recommendations;
  }
}