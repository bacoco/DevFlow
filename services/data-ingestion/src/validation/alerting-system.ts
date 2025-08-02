import winston from 'winston';
import { errorMetricsCollector } from './error-metrics';
import { RetryStorage } from './retry-storage';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldownMinutes: number;
  actions: AlertAction[];
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  threshold: number;
  timeWindowMinutes: number;
  labels?: Record<string, string>;
}

export interface AlertAction {
  type: 'log' | 'webhook' | 'email' | 'slack';
  config: Record<string, any>;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: string;
  message: string;
  details: any;
  triggeredAt: Date;
  resolvedAt?: Date;
  status: 'active' | 'resolved' | 'suppressed';
}

export interface AlertingStats {
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  suppressedAlerts: number;
  alertsByRule: Record<string, number>;
  alertsBySeverity: Record<string, number>;
}

export class AlertingSystem {
  private logger: winston.Logger;
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private lastAlertTimes: Map<string, number> = new Map();
  private evaluationInterval: NodeJS.Timeout | null = null;
  private retryStorage: RetryStorage | null = null;

  constructor(retryStorage?: RetryStorage) {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/alerting-system.log' })
      ]
    });

    this.retryStorage = retryStorage || null;
    this.initializeDefaultRules();
    this.startEvaluation();
  }

  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        description: 'Error rate exceeds threshold',
        condition: {
          metric: 'error_rate_per_minute',
          operator: 'gt',
          threshold: 10,
          timeWindowMinutes: 5
        },
        severity: 'high',
        enabled: true,
        cooldownMinutes: 10,
        actions: [
          { type: 'log', config: { level: 'error' } },
          { type: 'webhook', config: { url: process.env.ALERT_WEBHOOK_URL || '' } }
        ]
      },
      {
        id: 'retry-queue-overflow',
        name: 'Retry Queue Overflow',
        description: 'Retry queue size is too large',
        condition: {
          metric: 'retry_queue_size',
          operator: 'gt',
          threshold: 1000,
          timeWindowMinutes: 1
        },
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 5,
        actions: [
          { type: 'log', config: { level: 'error' } },
          { type: 'webhook', config: { url: process.env.CRITICAL_ALERT_WEBHOOK_URL || '' } }
        ]
      },
      {
        id: 'dead-letter-accumulation',
        name: 'Dead Letter Queue Accumulation',
        description: 'Dead letter queue is accumulating jobs',
        condition: {
          metric: 'dead_letter_queue_size',
          operator: 'gt',
          threshold: 100,
          timeWindowMinutes: 15
        },
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 30,
        actions: [
          { type: 'log', config: { level: 'warn' } }
        ]
      },
      {
        id: 'kafka-connection-errors',
        name: 'Kafka Connection Errors',
        description: 'High rate of Kafka connection errors',
        condition: {
          metric: 'kafka_errors_total',
          operator: 'gt',
          threshold: 5,
          timeWindowMinutes: 5,
          labels: { error_type: 'connection' }
        },
        severity: 'high',
        enabled: true,
        cooldownMinutes: 15,
        actions: [
          { type: 'log', config: { level: 'error' } }
        ]
      },
      {
        id: 'validation-error-spike',
        name: 'Validation Error Spike',
        description: 'Unusual spike in validation errors',
        condition: {
          metric: 'validation_errors_total',
          operator: 'gt',
          threshold: 50,
          timeWindowMinutes: 10
        },
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 20,
        actions: [
          { type: 'log', config: { level: 'warn' } }
        ]
      }
    ];

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });

    this.logger.info('Default alert rules initialized', {
      rulesCount: defaultRules.length,
      rules: defaultRules.map(r => ({ id: r.id, name: r.name, severity: r.severity }))
    });
  }

  private startEvaluation(): void {
    // Evaluate rules every 30 seconds
    this.evaluationInterval = setInterval(() => {
      this.evaluateRules();
    }, 30000);

    this.logger.info('Alert rule evaluation started');
  }

  private async evaluateRules(): Promise<void> {
    try {
      for (const [ruleId, rule] of this.rules.entries()) {
        if (!rule.enabled) {
          continue;
        }

        // Check cooldown
        const lastAlertTime = this.lastAlertTimes.get(ruleId) || 0;
        const cooldownMs = rule.cooldownMinutes * 60 * 1000;
        if (Date.now() - lastAlertTime < cooldownMs) {
          continue;
        }

        const shouldAlert = await this.evaluateRule(rule);
        if (shouldAlert) {
          await this.triggerAlert(rule);
        }
      }

      // Update queue size metrics
      if (this.retryStorage) {
        const stats = await this.retryStorage.getStats();
        errorMetricsCollector.updateRetryQueueSize(stats.pendingJobs);
        errorMetricsCollector.updateDeadLetterQueueSize(stats.deadLetterJobs);
      }
    } catch (error) {
      this.logger.error('Error evaluating alert rules:', error);
    }
  }

  private async evaluateRule(rule: AlertRule): Promise<boolean> {
    try {
      const metricValue = await this.getMetricValue(rule.condition);
      
      if (metricValue === null) {
        this.logger.debug('Metric value not available for rule', {
          ruleId: rule.id,
          metric: rule.condition.metric
        });
        return false;
      }

      const threshold = rule.condition.threshold;
      let conditionMet = false;

      switch (rule.condition.operator) {
        case 'gt':
          conditionMet = metricValue > threshold;
          break;
        case 'gte':
          conditionMet = metricValue >= threshold;
          break;
        case 'lt':
          conditionMet = metricValue < threshold;
          break;
        case 'lte':
          conditionMet = metricValue <= threshold;
          break;
        case 'eq':
          conditionMet = metricValue === threshold;
          break;
        case 'neq':
          conditionMet = metricValue !== threshold;
          break;
      }

      this.logger.debug('Rule evaluation result', {
        ruleId: rule.id,
        metric: rule.condition.metric,
        metricValue,
        threshold,
        operator: rule.condition.operator,
        conditionMet
      });

      return conditionMet;
    } catch (error) {
      this.logger.error('Error evaluating rule condition:', error);
      return false;
    }
  }

  private async getMetricValue(condition: AlertCondition): Promise<number | null> {
    try {
      // This is a simplified implementation
      // In a real system, you'd query Prometheus or your metrics store
      const metricsSummary = await errorMetricsCollector.getMetricsSummary();
      
      switch (condition.metric) {
        case 'error_rate_per_minute':
          return metricsSummary.metrics?.totalErrors || 0;
        case 'retry_queue_size':
          return metricsSummary.metrics?.currentRetryQueueSize || 0;
        case 'dead_letter_queue_size':
          return metricsSummary.metrics?.currentDeadLetterQueueSize || 0;
        case 'kafka_errors_total':
          return metricsSummary.metrics?.totalKafkaErrors || 0;
        case 'validation_errors_total':
          return metricsSummary.metrics?.totalValidationErrors || 0;
        default:
          this.logger.warn('Unknown metric in alert condition', {
            metric: condition.metric
          });
          return null;
      }
    } catch (error) {
      this.logger.error('Error getting metric value:', error);
      return null;
    }
  }

  private async triggerAlert(rule: AlertRule): Promise<void> {
    const alertId = `${rule.id}_${Date.now()}`;
    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: `Alert: ${rule.name} - ${rule.description}`,
      details: {
        condition: rule.condition,
        triggeredAt: new Date().toISOString()
      },
      triggeredAt: new Date(),
      status: 'active'
    };

    // Store alert
    this.activeAlerts.set(alertId, alert);
    this.alertHistory.push(alert);
    this.lastAlertTimes.set(rule.id, Date.now());

    // Execute alert actions
    for (const action of rule.actions) {
      await this.executeAlertAction(alert, action);
    }

    // Update metrics
    errorMetricsCollector.recordError(
      'alert_triggered',
      rule.id,
      'alerting_system',
      'data-ingestion',
      rule.severity as any
    );

    this.logger.warn('Alert triggered', {
      alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: alert.message
    });
  }

  private async executeAlertAction(alert: Alert, action: AlertAction): Promise<void> {
    try {
      switch (action.type) {
        case 'log':
          const level = action.config.level || 'info';
          this.logger.log(level, `ALERT: ${alert.message}`, {
            alertId: alert.id,
            severity: alert.severity,
            details: alert.details
          });
          break;

        case 'webhook':
          if (action.config.url) {
            await this.sendWebhookAlert(alert, action.config);
          }
          break;

        case 'email':
          // Email implementation would go here
          this.logger.info('Email alert action not implemented', { alertId: alert.id });
          break;

        case 'slack':
          // Slack implementation would go here
          this.logger.info('Slack alert action not implemented', { alertId: alert.id });
          break;

        default:
          this.logger.warn('Unknown alert action type', {
            actionType: action.type,
            alertId: alert.id
          });
      }
    } catch (error) {
      this.logger.error('Error executing alert action:', error);
    }
  }

  private async sendWebhookAlert(alert: Alert, config: any): Promise<void> {
    try {
      const axios = require('axios');
      
      const payload = {
        alertId: alert.id,
        ruleName: alert.ruleName,
        severity: alert.severity,
        message: alert.message,
        triggeredAt: alert.triggeredAt.toISOString(),
        details: alert.details
      };

      await axios.post(config.url, payload, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'DevFlow-AlertingSystem/1.0'
        }
      });

      this.logger.info('Webhook alert sent successfully', {
        alertId: alert.id,
        webhookUrl: config.url
      });
    } catch (error) {
      this.logger.error('Failed to send webhook alert:', error);
    }
  }

  public addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    this.logger.info('Alert rule added', {
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity
    });
  }

  public removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      this.logger.info('Alert rule removed', { ruleId });
    }
    return removed;
  }

  public updateRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return false;
    }

    const updatedRule = { ...rule, ...updates };
    this.rules.set(ruleId, updatedRule);
    
    this.logger.info('Alert rule updated', {
      ruleId,
      updates: Object.keys(updates)
    });
    
    return true;
  }

  public getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  public getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    this.activeAlerts.delete(alertId);

    this.logger.info('Alert resolved', {
      alertId,
      resolvedAt: alert.resolvedAt.toISOString()
    });

    return true;
  }

  public getAlertingStats(): AlertingStats {
    const activeAlerts = this.getActiveAlerts();
    const alertsByRule: Record<string, number> = {};
    const alertsBySeverity: Record<string, number> = {};

    this.alertHistory.forEach(alert => {
      alertsByRule[alert.ruleId] = (alertsByRule[alert.ruleId] || 0) + 1;
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
    });

    return {
      totalAlerts: this.alertHistory.length,
      activeAlerts: activeAlerts.length,
      resolvedAlerts: this.alertHistory.filter(a => a.status === 'resolved').length,
      suppressedAlerts: this.alertHistory.filter(a => a.status === 'suppressed').length,
      alertsByRule,
      alertsBySeverity
    };
  }

  public stop(): void {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = null;
    }
    this.logger.info('Alerting system stopped');
  }
}

// Singleton instance
export const alertingSystem = new AlertingSystem();