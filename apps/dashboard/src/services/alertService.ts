/**
 * Real-time Alert Service
 * Handles critical alerts with multiple delivery channels, escalation, and user preferences
 */

import { notificationService, EnhancedNotification } from './notificationService';
import { websocketService } from './websocketService';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertChannel = 'in-app' | 'email' | 'sms' | 'push' | 'webhook';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'snoozed' | 'escalated';

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  category: string;
  source: string;
  timestamp: Date;
  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  snoozedUntil?: Date;
  escalationLevel: number;
  escalatedAt?: Date;
  metadata: Record<string, any>;
  channels: AlertChannel[];
  deliveryAttempts: AlertDeliveryAttempt[];
  tags: string[];
}

export interface AlertDeliveryAttempt {
  id: string;
  channel: AlertChannel;
  timestamp: Date;
  success: boolean;
  error?: string;
  retryCount: number;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: AlertCondition[];
  actions: AlertAction[];
  escalationRules: EscalationRule[];
  cooldownPeriod: number; // minutes
  lastTriggered?: Date;
}

export interface AlertCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'regex';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface AlertAction {
  type: 'notification' | 'webhook' | 'email' | 'sms' | 'escalate';
  config: Record<string, any>;
  delay?: number; // seconds
}

export interface EscalationRule {
  level: number;
  delay: number; // minutes
  channels: AlertChannel[];
  recipients: string[];
  condition?: 'not_acknowledged' | 'not_resolved';
}

export interface UserAlertPreferences {
  userId: string;
  channels: {
    [K in AlertChannel]: {
      enabled: boolean;
      severityThreshold: AlertSeverity;
      quietHours?: {
        start: string; // HH:mm format
        end: string;
        timezone: string;
      };
      frequency: 'immediate' | 'batched' | 'digest';
      batchInterval?: number; // minutes
    };
  };
  categories: {
    [category: string]: {
      enabled: boolean;
      channels: AlertChannel[];
    };
  };
  escalationSettings: {
    autoEscalate: boolean;
    escalationDelay: number; // minutes
    maxEscalationLevel: number;
  };
  snoozeSettings: {
    defaultDuration: number; // minutes
    maxDuration: number; // minutes
    allowedSeverities: AlertSeverity[];
  };
}

export interface AlertServiceConfig {
  maxActiveAlerts: number;
  retryAttempts: number;
  retryDelay: number; // seconds
  escalationEnabled: boolean;
  defaultEscalationDelay: number; // minutes
  webhookTimeout: number; // seconds
  batchSize: number;
  cleanupInterval: number; // hours
}

class AlertService {
  private config: AlertServiceConfig = {
    maxActiveAlerts: 1000,
    retryAttempts: 3,
    retryDelay: 30,
    escalationEnabled: true,
    defaultEscalationDelay: 15,
    webhookTimeout: 10,
    batchSize: 50,
    cleanupInterval: 24,
  };

  private alerts: Map<string, Alert> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private userPreferences: Map<string, UserAlertPreferences> = new Map();
  private listeners: Set<(alerts: Alert[]) => void> = new Set();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();
  private snoozeTimers: Map<string, NodeJS.Timeout> = new Map();
  private deliveryQueue: Alert[] = [];
  private isProcessingQueue = false;

  constructor(config?: Partial<AlertServiceConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.initializeWebSocketHandlers();
    this.startCleanupTimer();
    this.startQueueProcessor();
  }

  /**
   * Create a new alert
   */
  async createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'status' | 'escalationLevel' | 'deliveryAttempts'>): Promise<string> {
    const id = this.generateId();
    const alert: Alert = {
      ...alertData,
      id,
      timestamp: new Date(),
      status: 'active',
      escalationLevel: 0,
      deliveryAttempts: [],
    };

    this.alerts.set(id, alert);
    
    // Add to delivery queue
    this.deliveryQueue.push(alert);
    
    // Set up escalation timer if enabled
    if (this.config.escalationEnabled) {
      this.scheduleEscalation(alert);
    }

    // Notify listeners
    this.notifyListeners();

    // Process delivery queue
    this.processDeliveryQueue();

    return id;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== 'active') {
      return false;
    }

    alert.status = 'acknowledged';
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();

    // Cancel escalation timer
    this.cancelEscalation(alertId);

    // Send acknowledgment notification
    await this.sendAcknowledgmentNotification(alert, userId);

    this.notifyListeners();
    return true;
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, userId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert || (alert.status !== 'active' && alert.status !== 'acknowledged')) {
      return false;
    }

    alert.status = 'resolved';
    alert.resolvedBy = userId;
    alert.resolvedAt = new Date();

    // Cancel escalation timer
    this.cancelEscalation(alertId);

    // Cancel snooze timer if exists
    this.cancelSnooze(alertId);

    // Send resolution notification
    await this.sendResolutionNotification(alert, userId);

    this.notifyListeners();
    return true;
  }

  /**
   * Snooze an alert
   */
  async snoozeAlert(alertId: string, duration: number, userId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== 'active') {
      return false;
    }

    // Check user preferences
    const preferences = this.getUserPreferences(userId);
    if (!preferences.snoozeSettings.allowedSeverities.includes(alert.severity)) {
      throw new Error(`Snoozing not allowed for ${alert.severity} severity alerts`);
    }

    if (duration > preferences.snoozeSettings.maxDuration) {
      throw new Error(`Snooze duration exceeds maximum allowed (${preferences.snoozeSettings.maxDuration} minutes)`);
    }

    alert.status = 'snoozed';
    alert.snoozedUntil = new Date(Date.now() + duration * 60 * 1000);

    // Cancel escalation timer
    this.cancelEscalation(alertId);

    // Set snooze timer
    this.scheduleSnoozeEnd(alert, duration);

    // Send snooze notification
    await this.sendSnoozeNotification(alert, userId, duration);

    this.notifyListeners();
    return true;
  }

  /**
   * Escalate an alert
   */
  async escalateAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== 'active') {
      return false;
    }

    alert.escalationLevel++;
    alert.escalatedAt = new Date();
    alert.status = 'escalated';

    // Find applicable escalation rules
    const escalationRules = this.getEscalationRules(alert);
    const currentRule = escalationRules.find(rule => rule.level === alert.escalationLevel);

    if (currentRule) {
      // Send escalated alert through specified channels
      await this.deliverEscalatedAlert(alert, currentRule);
      
      // Schedule next escalation if there are more levels
      const nextRule = escalationRules.find(rule => rule.level === alert.escalationLevel + 1);
      if (nextRule) {
        this.scheduleEscalation(alert, nextRule.delay);
      }
    }

    this.notifyListeners();
    return true;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .filter(alert => ['active', 'escalated'].includes(alert.status))
      .sort((a, b) => {
        // Sort by severity first, then by timestamp
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit?: number): Alert[] {
    const alerts = Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return limit ? alerts.slice(0, limit) : alerts;
  }

  /**
   * Get alerts by category
   */
  getAlertsByCategory(category: string): Alert[] {
    return Array.from(this.alerts.values())
      .filter(alert => alert.category === category)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get user alert preferences
   */
  getUserPreferences(userId: string): UserAlertPreferences {
    return this.userPreferences.get(userId) || this.getDefaultPreferences(userId);
  }

  /**
   * Update user alert preferences
   */
  updateUserPreferences(userId: string, preferences: Partial<UserAlertPreferences>): void {
    const current = this.getUserPreferences(userId);
    const updated = { ...current, ...preferences };
    this.userPreferences.set(userId, updated);
    
    // Persist to storage
    this.persistUserPreferences(userId, updated);
  }

  /**
   * Subscribe to alert changes
   */
  subscribe(listener: (alerts: Alert[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Add alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(): {
    total: number;
    active: number;
    acknowledged: number;
    resolved: number;
    snoozed: number;
    escalated: number;
    bySeverity: Record<AlertSeverity, number>;
    byCategory: Record<string, number>;
  } {
    const alerts = Array.from(this.alerts.values());
    
    const stats = {
      total: alerts.length,
      active: 0,
      acknowledged: 0,
      resolved: 0,
      snoozed: 0,
      escalated: 0,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 } as Record<AlertSeverity, number>,
      byCategory: {} as Record<string, number>,
    };

    alerts.forEach(alert => {
      stats[alert.status as keyof typeof stats]++;
      stats.bySeverity[alert.severity]++;
      stats.byCategory[alert.category] = (stats.byCategory[alert.category] || 0) + 1;
    });

    return stats;
  }

  private initializeWebSocketHandlers(): void {
    websocketService.on('alert:created', (data: any) => {
      this.handleRemoteAlert(data);
    });

    websocketService.on('alert:acknowledged', (data: any) => {
      this.handleRemoteAcknowledgment(data);
    });

    websocketService.on('alert:resolved', (data: any) => {
      this.handleRemoteResolution(data);
    });
  }

  private async handleRemoteAlert(data: any): Promise<void> {
    // Handle alerts received from other sources via WebSocket
    if (!this.alerts.has(data.id)) {
      await this.createAlert(data);
    }
  }

  private handleRemoteAcknowledgment(data: any): void {
    const alert = this.alerts.get(data.alertId);
    if (alert && alert.status === 'active') {
      alert.status = 'acknowledged';
      alert.acknowledgedBy = data.userId;
      alert.acknowledgedAt = new Date(data.timestamp);
      this.cancelEscalation(data.alertId);
      this.notifyListeners();
    }
  }

  private handleRemoteResolution(data: any): void {
    const alert = this.alerts.get(data.alertId);
    if (alert && ['active', 'acknowledged'].includes(alert.status)) {
      alert.status = 'resolved';
      alert.resolvedBy = data.userId;
      alert.resolvedAt = new Date(data.timestamp);
      this.cancelEscalation(data.alertId);
      this.cancelSnooze(data.alertId);
      this.notifyListeners();
    }
  }

  private scheduleEscalation(alert: Alert, delay?: number): void {
    const escalationDelay = delay || this.config.defaultEscalationDelay;
    
    const timer = setTimeout(() => {
      this.escalateAlert(alert.id);
    }, escalationDelay * 60 * 1000);

    this.escalationTimers.set(alert.id, timer);
  }

  private cancelEscalation(alertId: string): void {
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }
  }

  private scheduleSnoozeEnd(alert: Alert, duration: number): void {
    const timer = setTimeout(() => {
      alert.status = 'active';
      alert.snoozedUntil = undefined;
      this.snoozeTimers.delete(alert.id);
      
      // Restart escalation if enabled
      if (this.config.escalationEnabled) {
        this.scheduleEscalation(alert);
      }
      
      this.notifyListeners();
    }, duration * 60 * 1000);

    this.snoozeTimers.set(alert.id, timer);
  }

  private cancelSnooze(alertId: string): void {
    const timer = this.snoozeTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.snoozeTimers.delete(alertId);
    }
  }

  private async processDeliveryQueue(): Promise<void> {
    if (this.isProcessingQueue || this.deliveryQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const batch = this.deliveryQueue.splice(0, this.config.batchSize);
      
      await Promise.all(
        batch.map(alert => this.deliverAlert(alert))
      );
    } catch (error) {
      console.error('Error processing delivery queue:', error);
    } finally {
      this.isProcessingQueue = false;
      
      // Process remaining items if any
      if (this.deliveryQueue.length > 0) {
        setTimeout(() => this.processDeliveryQueue(), 1000);
      }
    }
  }

  private async deliverAlert(alert: Alert): Promise<void> {
    // Get all users who should receive this alert
    const recipients = this.getAlertRecipients(alert);

    for (const userId of recipients) {
      const preferences = this.getUserPreferences(userId);
      const enabledChannels = this.getEnabledChannels(alert, preferences);

      for (const channel of enabledChannels) {
        await this.deliverToChannel(alert, channel, userId);
      }
    }
  }

  private async deliverToChannel(alert: Alert, channel: AlertChannel, userId: string): Promise<void> {
    const attemptId = this.generateId();
    const attempt: AlertDeliveryAttempt = {
      id: attemptId,
      channel,
      timestamp: new Date(),
      success: false,
      retryCount: 0,
    };

    try {
      switch (channel) {
        case 'in-app':
          await this.deliverInApp(alert, userId);
          break;
        case 'email':
          await this.deliverEmail(alert, userId);
          break;
        case 'sms':
          await this.deliverSMS(alert, userId);
          break;
        case 'push':
          await this.deliverPush(alert, userId);
          break;
        case 'webhook':
          await this.deliverWebhook(alert, userId);
          break;
      }

      attempt.success = true;
    } catch (error) {
      attempt.success = false;
      attempt.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Retry if configured
      if (attempt.retryCount < this.config.retryAttempts) {
        setTimeout(() => {
          attempt.retryCount++;
          this.deliverToChannel(alert, channel, userId);
        }, this.config.retryDelay * 1000);
      }
    }

    alert.deliveryAttempts.push(attempt);
  }

  private async deliverInApp(alert: Alert, userId: string): Promise<void> {
    const notification: Omit<EnhancedNotification, 'id' | 'timestamp'> = {
      type: this.mapSeverityToNotificationType(alert.severity),
      title: alert.title,
      message: alert.message,
      priority: this.mapSeverityToPriority(alert.severity),
      category: alert.category,
      source: alert.source,
      persistent: alert.severity === 'critical',
      metadata: {
        alertId: alert.id,
        userId,
        ...alert.metadata,
      },
      actions: [
        {
          label: 'Acknowledge',
          action: () => this.acknowledgeAlert(alert.id, userId),
          variant: 'primary',
        },
        {
          label: 'Snooze',
          action: () => this.showSnoozeOptions(alert.id, userId),
          variant: 'secondary',
        },
      ],
    };

    notificationService.addNotification(notification);
  }

  private async deliverEmail(alert: Alert, userId: string): Promise<void> {
    // Implementation would integrate with email service
    console.log(`Delivering email alert ${alert.id} to user ${userId}`);
  }

  private async deliverSMS(alert: Alert, userId: string): Promise<void> {
    // Implementation would integrate with SMS service
    console.log(`Delivering SMS alert ${alert.id} to user ${userId}`);
  }

  private async deliverPush(alert: Alert, userId: string): Promise<void> {
    // Implementation would integrate with push notification service
    console.log(`Delivering push alert ${alert.id} to user ${userId}`);
  }

  private async deliverWebhook(alert: Alert, userId: string): Promise<void> {
    // Implementation would send webhook
    console.log(`Delivering webhook alert ${alert.id} to user ${userId}`);
  }

  private async deliverEscalatedAlert(alert: Alert, rule: EscalationRule): Promise<void> {
    for (const recipient of rule.recipients) {
      for (const channel of rule.channels) {
        await this.deliverToChannel(alert, channel, recipient);
      }
    }
  }

  private async sendAcknowledgmentNotification(alert: Alert, userId: string): Promise<void> {
    notificationService.addNotification({
      type: 'success',
      title: 'Alert Acknowledged',
      message: `Alert "${alert.title}" has been acknowledged`,
      priority: 'low',
      category: 'alert-management',
    });
  }

  private async sendResolutionNotification(alert: Alert, userId: string): Promise<void> {
    notificationService.addNotification({
      type: 'success',
      title: 'Alert Resolved',
      message: `Alert "${alert.title}" has been resolved`,
      priority: 'low',
      category: 'alert-management',
    });
  }

  private async sendSnoozeNotification(alert: Alert, userId: string, duration: number): Promise<void> {
    notificationService.addNotification({
      type: 'info',
      title: 'Alert Snoozed',
      message: `Alert "${alert.title}" has been snoozed for ${duration} minutes`,
      priority: 'low',
      category: 'alert-management',
    });
  }

  private showSnoozeOptions(alertId: string, userId: string): void {
    // This would open a modal or dropdown with snooze duration options
    const preferences = this.getUserPreferences(userId);
    const defaultDuration = preferences.snoozeSettings.defaultDuration;
    
    // For now, use default duration
    this.snoozeAlert(alertId, defaultDuration, userId);
  }

  private getAlertRecipients(alert: Alert): string[] {
    // Implementation would determine who should receive this alert
    // based on alert rules, user roles, etc.
    return ['current-user']; // Placeholder
  }

  private getEnabledChannels(alert: Alert, preferences: UserAlertPreferences): AlertChannel[] {
    const channels: AlertChannel[] = [];
    
    Object.entries(preferences.channels).forEach(([channel, config]) => {
      if (config.enabled && this.meetsSeverityThreshold(alert.severity, config.severityThreshold)) {
        channels.push(channel as AlertChannel);
      }
    });

    return channels;
  }

  private meetsSeverityThreshold(alertSeverity: AlertSeverity, threshold: AlertSeverity): boolean {
    const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
    return severityOrder[alertSeverity] >= severityOrder[threshold];
  }

  private getEscalationRules(alert: Alert): EscalationRule[] {
    // Implementation would find applicable escalation rules
    return []; // Placeholder
  }

  private mapSeverityToNotificationType(severity: AlertSeverity): 'info' | 'success' | 'warning' | 'error' {
    switch (severity) {
      case 'low': return 'info';
      case 'medium': return 'warning';
      case 'high': return 'warning';
      case 'critical': return 'error';
    }
  }

  private mapSeverityToPriority(severity: AlertSeverity): 'low' | 'normal' | 'high' | 'critical' {
    switch (severity) {
      case 'low': return 'low';
      case 'medium': return 'normal';
      case 'high': return 'high';
      case 'critical': return 'critical';
    }
  }

  private getDefaultPreferences(userId: string): UserAlertPreferences {
    return {
      userId,
      channels: {
        'in-app': {
          enabled: true,
          severityThreshold: 'low',
          frequency: 'immediate',
        },
        email: {
          enabled: true,
          severityThreshold: 'medium',
          frequency: 'batched',
          batchInterval: 30,
        },
        sms: {
          enabled: false,
          severityThreshold: 'high',
          frequency: 'immediate',
        },
        push: {
          enabled: true,
          severityThreshold: 'medium',
          frequency: 'immediate',
        },
        webhook: {
          enabled: false,
          severityThreshold: 'critical',
          frequency: 'immediate',
        },
      },
      categories: {},
      escalationSettings: {
        autoEscalate: true,
        escalationDelay: 15,
        maxEscalationLevel: 3,
      },
      snoozeSettings: {
        defaultDuration: 30,
        maxDuration: 480, // 8 hours
        allowedSeverities: ['low', 'medium', 'high'],
      },
    };
  }

  private persistUserPreferences(userId: string, preferences: UserAlertPreferences): void {
    // Implementation would persist to database or local storage
    localStorage.setItem(`alert-preferences-${userId}`, JSON.stringify(preferences));
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupOldAlerts();
    }, this.config.cleanupInterval * 60 * 60 * 1000);
  }

  private cleanupOldAlerts(): void {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.status === 'resolved' && alert.resolvedAt && alert.resolvedAt < cutoffDate) {
        this.alerts.delete(id);
      }
    }
  }

  private startQueueProcessor(): void {
    setInterval(() => {
      this.processDeliveryQueue();
    }, 5000); // Process queue every 5 seconds
  }

  private notifyListeners(): void {
    const alerts = this.getActiveAlerts();
    this.listeners.forEach(listener => listener(alerts));
  }

  private generateId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Clear all alerts (for testing)
   */
  clearAll(): void {
    this.alerts.clear();
    this.deliveryQueue = [];
    this.escalationTimers.forEach(timer => clearTimeout(timer));
    this.escalationTimers.clear();
    this.snoozeTimers.forEach(timer => clearTimeout(timer));
    this.snoozeTimers.clear();
    this.notifyListeners();
  }
}

// Create singleton instance
export const alertService = new AlertService();

// Convenience functions
export const createAlert = (
  title: string,
  message: string,
  severity: AlertSeverity,
  category: string,
  options?: Partial<Alert>
): Promise<string> => {
  return alertService.createAlert({
    title,
    message,
    severity,
    category,
    source: 'application',
    channels: ['in-app'],
    tags: [],
    metadata: {},
    ...options,
  });
};

export const createCriticalAlert = (
  title: string,
  message: string,
  category: string,
  options?: Partial<Alert>
): Promise<string> => {
  return createAlert(title, message, 'critical', category, {
    channels: ['in-app', 'email', 'push'],
    ...options,
  });
};

export default alertService;