import { 
  Alert, 
  AlertRule, 
  AlertFeedback, 
  AlertMetrics, 
  AlertStatus,
  AlertSeverity,
  AlertType,
  EscalationPolicy,
  NotificationChannel,
  MLAnomalyResult
} from '../types/alert-types';
import { AlertRuleEngine, MetricData } from '../engines/alert-rule-engine';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface AlertServiceConfig {
  maxActiveAlerts: number;
  defaultCooldownPeriod: number;
  escalationTimeout: number;
  feedbackRetentionDays: number;
}

export interface AlertRepository {
  saveAlert(alert: Alert): Promise<void>;
  updateAlert(alertId: string, updates: Partial<Alert>): Promise<void>;
  getAlert(alertId: string): Promise<Alert | null>;
  getActiveAlerts(filters?: AlertFilters): Promise<Alert[]>;
  getAlertHistory(filters?: AlertFilters): Promise<Alert[]>;
  deleteAlert(alertId: string): Promise<void>;
}

export interface AlertRuleRepository {
  saveRule(rule: AlertRule): Promise<void>;
  updateRule(ruleId: string, updates: Partial<AlertRule>): Promise<void>;
  getRule(ruleId: string): Promise<AlertRule | null>;
  getRules(filters?: RuleFilters): Promise<AlertRule[]>;
  deleteRule(ruleId: string): Promise<void>;
}

export interface AlertFilters {
  userId?: string;
  teamId?: string;
  projectId?: string;
  severity?: AlertSeverity[];
  type?: AlertType[];
  status?: AlertStatus[];
  startDate?: Date;
  endDate?: Date;
}

export interface RuleFilters {
  enabled?: boolean;
  type?: AlertType[];
  createdBy?: string;
}

export class AlertService extends EventEmitter {
  private readonly config: AlertServiceConfig;
  private readonly ruleEngine: AlertRuleEngine;
  private readonly alertRepository: AlertRepository;
  private readonly ruleRepository: AlertRuleRepository;
  private readonly activeAlerts = new Map<string, Alert>();
  private readonly ruleCooldowns = new Map<string, Date>();

  constructor(
    config: AlertServiceConfig,
    ruleEngine: AlertRuleEngine,
    alertRepository: AlertRepository,
    ruleRepository: AlertRuleRepository
  ) {
    super();
    this.config = config;
    this.ruleEngine = ruleEngine;
    this.alertRepository = alertRepository;
    this.ruleRepository = ruleRepository;
  }

  async evaluateMetrics(metrics: MetricData[]): Promise<Alert[]> {
    const rules = await this.ruleRepository.getRules({ enabled: true });
    const availableRules = this.filterRulesInCooldown(rules);
    
    const newAlerts = await this.ruleEngine.evaluateRules(metrics, availableRules);
    const processedAlerts: Alert[] = [];

    for (const alert of newAlerts) {
      if (await this.shouldCreateAlert(alert)) {
        await this.createAlert(alert);
        processedAlerts.push(alert);
        this.setCooldown(alert.ruleId);
      }
    }

    return processedAlerts;
  }

  async evaluateMLAnomaly(anomalyResult: MLAnomalyResult, context: any): Promise<Alert | null> {
    if (!anomalyResult.isAnomaly) {
      return null;
    }

    const alert = this.ruleEngine.generateMLAnomalyAlert(anomalyResult, context);
    
    if (await this.shouldCreateAlert(alert)) {
      await this.createAlert(alert);
      return alert;
    }

    return null;
  }

  async createRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AlertRule> {
    const newRule: AlertRule = {
      ...rule,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.ruleRepository.saveRule(newRule);
    this.emit('ruleCreated', newRule);
    
    return newRule;
  }

  async updateRule(ruleId: string, updates: Partial<AlertRule>): Promise<AlertRule | null> {
    const existingRule = await this.ruleRepository.getRule(ruleId);
    if (!existingRule) {
      return null;
    }

    const updatedRule = {
      ...existingRule,
      ...updates,
      updatedAt: new Date()
    };

    await this.ruleRepository.updateRule(ruleId, updatedRule);
    this.emit('ruleUpdated', updatedRule);
    
    return updatedRule;
  }

  async deleteRule(ruleId: string): Promise<boolean> {
    const rule = await this.ruleRepository.getRule(ruleId);
    if (!rule) {
      return false;
    }

    await this.ruleRepository.deleteRule(ruleId);
    this.emit('ruleDeleted', rule);
    
    return true;
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
    const alert = await this.alertRepository.getAlert(alertId);
    if (!alert || alert.status !== AlertStatus.ACTIVE) {
      return false;
    }

    const updates = {
      status: AlertStatus.ACKNOWLEDGED,
      acknowledgedAt: new Date(),
      acknowledgedBy: userId
    };

    await this.alertRepository.updateAlert(alertId, updates);
    this.activeAlerts.delete(alertId);
    this.emit('alertAcknowledged', { ...alert, ...updates });
    
    return true;
  }

  async resolveAlert(alertId: string, userId: string): Promise<boolean> {
    const alert = await this.alertRepository.getAlert(alertId);
    if (!alert || alert.status === AlertStatus.RESOLVED) {
      return false;
    }

    const updates = {
      status: AlertStatus.RESOLVED,
      resolvedAt: new Date(),
      resolvedBy: userId
    };

    await this.alertRepository.updateAlert(alertId, updates);
    this.activeAlerts.delete(alertId);
    this.emit('alertResolved', { ...alert, ...updates });
    
    return true;
  }

  async suppressAlert(alertId: string, suppressUntil: Date): Promise<boolean> {
    const alert = await this.alertRepository.getAlert(alertId);
    if (!alert) {
      return false;
    }

    const updates = {
      status: AlertStatus.SUPPRESSED,
      suppressedUntil: suppressUntil
    };

    await this.alertRepository.updateAlert(alertId, updates);
    this.activeAlerts.delete(alertId);
    this.emit('alertSuppressed', { ...alert, ...updates });
    
    return true;
  }

  async recordFeedback(feedback: AlertFeedback): Promise<void> {
    // Store feedback for learning and improvement
    this.emit('feedbackReceived', feedback);
    
    // Use feedback to adjust alert thresholds if needed
    await this.processFeedbackForLearning(feedback);
  }

  async getAlertMetrics(filters?: AlertFilters): Promise<AlertMetrics> {
    const alerts = await this.alertRepository.getAlertHistory(filters);
    
    const totalAlerts = alerts.length;
    const alertsByType = this.groupAlertsByType(alerts);
    const alertsBySeverity = this.groupAlertsBySeverity(alerts);
    const averageResolutionTime = this.calculateAverageResolutionTime(alerts);
    const falsePositiveRate = await this.calculateFalsePositiveRate(alerts);
    const escalationRate = this.calculateEscalationRate(alerts);

    return {
      totalAlerts,
      alertsByType,
      alertsBySeverity,
      averageResolutionTime,
      falsePositiveRate,
      escalationRate
    };
  }

  async getActiveAlerts(filters?: AlertFilters): Promise<Alert[]> {
    return this.alertRepository.getActiveAlerts(filters);
  }

  async getRules(filters?: RuleFilters): Promise<AlertRule[]> {
    return this.ruleRepository.getRules(filters);
  }

  private async createAlert(alert: Alert): Promise<void> {
    await this.alertRepository.saveAlert(alert);
    this.activeAlerts.set(alert.id, alert);
    this.emit('alertCreated', alert);
  }

  private async shouldCreateAlert(alert: Alert): Promise<boolean> {
    // Check if we've exceeded max active alerts
    if (this.activeAlerts.size >= this.config.maxActiveAlerts) {
      return false;
    }

    // Check for duplicate alerts
    const existingAlert = Array.from(this.activeAlerts.values()).find(
      existing => existing.ruleId === alert.ruleId && 
                 existing.context.userId === alert.context.userId &&
                 existing.status === AlertStatus.ACTIVE
    );

    return !existingAlert;
  }

  private filterRulesInCooldown(rules: AlertRule[]): AlertRule[] {
    const now = new Date();
    return rules.filter(rule => {
      const cooldownEnd = this.ruleCooldowns.get(rule.id);
      return !cooldownEnd || now > cooldownEnd;
    });
  }

  private setCooldown(ruleId: string): void {
    const now = new Date();
    const cooldownEnd = new Date(now.getTime() + this.config.defaultCooldownPeriod * 60 * 1000);
    this.ruleCooldowns.set(ruleId, cooldownEnd);
  }

  private groupAlertsByType(alerts: Alert[]): Record<AlertType, number> {
    const grouped = {} as Record<AlertType, number>;
    Object.values(AlertType).forEach(type => {
      grouped[type] = alerts.filter(alert => alert.type === type).length;
    });
    return grouped;
  }

  private groupAlertsBySeverity(alerts: Alert[]): Record<AlertSeverity, number> {
    const grouped = {} as Record<AlertSeverity, number>;
    Object.values(AlertSeverity).forEach(severity => {
      grouped[severity] = alerts.filter(alert => alert.severity === severity).length;
    });
    return grouped;
  }

  private calculateAverageResolutionTime(alerts: Alert[]): number {
    const resolvedAlerts = alerts.filter(alert => 
      alert.status === AlertStatus.RESOLVED && alert.resolvedAt
    );

    if (resolvedAlerts.length === 0) {
      return 0;
    }

    const totalResolutionTime = resolvedAlerts.reduce((sum, alert) => {
      const resolutionTime = alert.resolvedAt!.getTime() - alert.triggeredAt.getTime();
      return sum + resolutionTime;
    }, 0);

    return totalResolutionTime / resolvedAlerts.length / (1000 * 60); // Convert to minutes
  }

  private async calculateFalsePositiveRate(alerts: Alert[]): Promise<number> {
    // This would typically involve analyzing feedback data
    // For now, return a placeholder calculation
    const totalAlerts = alerts.length;
    if (totalAlerts === 0) return 0;

    // Placeholder: assume 10% false positive rate
    return 0.1;
  }

  private calculateEscalationRate(alerts: Alert[]): number {
    const escalatedAlerts = alerts.filter(alert => alert.escalationLevel > 0);
    return alerts.length > 0 ? escalatedAlerts.length / alerts.length : 0;
  }

  private async processFeedbackForLearning(feedback: AlertFeedback): Promise<void> {
    // Implement machine learning feedback processing
    // This could adjust alert thresholds, improve ML models, etc.
    console.log(`Processing feedback for alert ${feedback.alertId}: ${feedback.relevance}`);
  }
}