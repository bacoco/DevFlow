import { Logger } from '../utils/logger';

export interface Alert {
  id?: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
  resolved?: boolean;
}

export interface AlertChannel {
  type: 'webhook' | 'slack' | 'email';
  config: any;
}

export class AlertManager {
  private logger: Logger;
  private channels: AlertChannel[];
  private activeAlerts: Map<string, Alert> = new Map();

  constructor(logger: Logger, channels: AlertChannel[] = []) {
    this.logger = logger;
    this.channels = channels;
  }

  async sendAlert(alert: Alert): Promise<void> {
    alert.id = alert.id || this.generateAlertId();
    alert.timestamp = alert.timestamp || new Date();
    alert.resolved = false;

    this.activeAlerts.set(alert.id, alert);

    this.logger.info(`Sending alert: ${alert.title}`, { alert });

    // Send to all configured channels
    for (const channel of this.channels) {
      try {
        await this.sendToChannel(alert, channel);
      } catch (error) {
        this.logger.error(`Failed to send alert to ${channel.type}`, { error, alert });
      }
    }
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.logger.info(`Alert resolved: ${alert.title}`, { alertId });
    }
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  private async sendToChannel(alert: Alert, channel: AlertChannel): Promise<void> {
    switch (channel.type) {
      case 'webhook':
        await this.sendWebhook(alert, channel.config);
        break;
      case 'slack':
        await this.sendSlack(alert, channel.config);
        break;
      case 'email':
        await this.sendEmail(alert, channel.config);
        break;
      default:
        throw new Error(`Unknown alert channel type: ${channel.type}`);
    }
  }

  private async sendWebhook(alert: Alert, config: any): Promise<void> {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      },
      body: JSON.stringify({
        alert,
        timestamp: alert.timestamp?.toISOString(),
        service: 'devflow-intelligence'
      })
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
    }
  }

  private async sendSlack(alert: Alert, config: any): Promise<void> {
    const color = this.getSeverityColor(alert.severity);
    const payload = {
      channel: config.channel,
      username: 'DevFlow Intelligence',
      icon_emoji: ':warning:',
      attachments: [{
        color,
        title: alert.title,
        text: alert.message,
        fields: [
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Timestamp',
            value: alert.timestamp?.toISOString(),
            short: true
          }
        ],
        footer: 'DevFlow Intelligence',
        ts: Math.floor((alert.timestamp?.getTime() || Date.now()) / 1000)
      }]
    };

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack webhook request failed: ${response.status} ${response.statusText}`);
    }
  }

  private async sendEmail(alert: Alert, config: any): Promise<void> {
    // This would integrate with an email service like SendGrid, SES, etc.
    // For now, we'll just log the email that would be sent
    this.logger.info('Email alert would be sent', {
      to: config.recipients,
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      body: alert.message,
      alert
    });
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'info': return 'good';
      case 'warning': return 'warning';
      case 'critical': return 'danger';
      default: return 'warning';
    }
  }

  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}