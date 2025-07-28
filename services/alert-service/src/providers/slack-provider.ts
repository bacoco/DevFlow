import { NotificationProvider, NotificationResult, SlackConfig } from '../services/notification-service';
import { Alert, NotificationChannel, NotificationTemplate, AlertSeverity } from '../types/alert-types';
import axios from 'axios';

interface SlackMessage {
  channel: string;
  text: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
}

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
  accessory?: any;
}

interface SlackAttachment {
  color: string;
  fields: Array<{
    title: string;
    value: string;
    short: boolean;
  }>;
  footer?: string;
  ts?: number;
}

export class SlackNotificationProvider implements NotificationProvider {
  private readonly config: SlackConfig;
  private readonly baseUrl = 'https://slack.com/api';

  constructor(config: SlackConfig) {
    this.config = config;
  }

  async send(alert: Alert, recipient: string, template: NotificationTemplate): Promise<NotificationResult> {
    try {
      const message = this.buildSlackMessage(alert, recipient, template);
      
      const response = await axios.post(`${this.baseUrl}/chat.postMessage`, message, {
        headers: {
          'Authorization': `Bearer ${this.config.botToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.ok) {
        return {
          success: true,
          messageId: response.data.ts,
          deliveredAt: new Date()
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Unknown Slack API error'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Slack error'
      };
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      const response = await axios.post(`${this.baseUrl}/auth.test`, {}, {
        headers: {
          'Authorization': `Bearer ${this.config.botToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.ok;
    } catch (error) {
      console.error('Slack configuration validation failed:', error);
      return false;
    }
  }

  getChannelType(): NotificationChannel {
    return NotificationChannel.SLACK;
  }

  private buildSlackMessage(alert: Alert, recipient: string, template: NotificationTemplate): SlackMessage {
    const channel = recipient.startsWith('#') || recipient.startsWith('@') ? recipient : `#${recipient}`;
    
    const renderedText = this.renderTemplate(template.body, alert);
    const color = this.getSeverityColor(alert.severity);
    
    const message: SlackMessage = {
      channel,
      text: `Alert: ${alert.title}`,
      attachments: [{
        color,
        fields: [
          {
            title: 'Alert',
            value: alert.title,
            short: true
          },
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Type',
            value: alert.type.replace('_', ' ').toUpperCase(),
            short: true
          },
          {
            title: 'Status',
            value: alert.status.toUpperCase(),
            short: true
          },
          {
            title: 'Message',
            value: alert.message,
            short: false
          }
        ],
        footer: 'DevFlow Intelligence',
        ts: Math.floor(alert.triggeredAt.getTime() / 1000)
      }]
    };

    // Add context information
    if (alert.context.userId || alert.context.teamId || alert.context.projectId) {
      const contextFields = [];
      
      if (alert.context.userId) {
        contextFields.push({
          title: 'User',
          value: alert.context.userId,
          short: true
        });
      }
      
      if (alert.context.teamId) {
        contextFields.push({
          title: 'Team',
          value: alert.context.teamId,
          short: true
        });
      }
      
      if (alert.context.projectId) {
        contextFields.push({
          title: 'Project',
          value: alert.context.projectId,
          short: true
        });
      }

      message.attachments![0].fields.push(...contextFields);
    }

    // Add metric values
    if (Object.keys(alert.context.metricValues).length > 0) {
      const metricText = Object.entries(alert.context.metricValues)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
      
      message.attachments![0].fields.push({
        title: 'Metrics',
        value: metricText,
        short: false
      });
    }

    // Add recommendations
    if (alert.recommendations.length > 0) {
      const recommendationText = alert.recommendations
        .map(r => `• ${r.title}: ${r.description}`)
        .join('\n');
      
      message.attachments![0].fields.push({
        title: 'Recommendations',
        value: recommendationText,
        short: false
      });
    }

    return message;
  }

  private getSeverityColor(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return '#FF0000'; // Red
      case AlertSeverity.HIGH:
        return '#FF8C00'; // Orange
      case AlertSeverity.MEDIUM:
        return '#FFD700'; // Yellow
      case AlertSeverity.LOW:
        return '#32CD32'; // Green
      default:
        return '#808080'; // Gray
    }
  }

  private renderTemplate(template: string, alert: Alert): string {
    const variables = {
      alertId: alert.id,
      alertTitle: alert.title,
      alertMessage: alert.message,
      alertSeverity: alert.severity,
      alertType: alert.type,
      alertStatus: alert.status,
      triggeredAt: alert.triggeredAt.toISOString(),
      userId: alert.context.userId || 'Unknown',
      teamId: alert.context.teamId || 'Unknown',
      projectId: alert.context.projectId || 'Unknown'
    };

    let rendered = template;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return rendered;
  }
}

// Default Slack templates
export const DEFAULT_SLACK_TEMPLATES = {
  productivity_anomaly: {
    subject: 'Productivity Alert',
    body: 'Productivity anomaly detected for {{userId}} in team {{teamId}}'
  },
  quality_threshold: {
    subject: 'Code Quality Alert',
    body: 'Code quality threshold exceeded in project {{projectId}}'
  },
  flow_interruption: {
    subject: 'Flow Interruption Alert',
    body: 'Developer flow interruption detected for {{userId}}'
  }
};