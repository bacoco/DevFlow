import { NotificationProvider, NotificationResult, TeamsConfig } from '../services/notification-service';
import { Alert, NotificationChannel, NotificationTemplate, AlertSeverity } from '../types/alert-types';
import axios from 'axios';

interface TeamsMessage {
  '@type': string;
  '@context': string;
  summary: string;
  themeColor: string;
  sections: TeamsSection[];
  potentialAction?: TeamsAction[];
}

interface TeamsSection {
  activityTitle: string;
  activitySubtitle?: string;
  activityImage?: string;
  facts: TeamsFact[];
  markdown?: boolean;
}

interface TeamsFact {
  name: string;
  value: string;
}

interface TeamsAction {
  '@type': string;
  name: string;
  targets: Array<{
    os: string;
    uri: string;
  }>;
}

export class TeamsNotificationProvider implements NotificationProvider {
  private readonly config: TeamsConfig;

  constructor(config: TeamsConfig) {
    this.config = config;
  }

  async send(alert: Alert, recipient: string, template: NotificationTemplate): Promise<NotificationResult> {
    try {
      // For Teams, recipient is typically the webhook URL or channel identifier
      const webhookUrl = recipient.startsWith('http') ? recipient : this.config.webhookUrl;
      
      const message = this.buildTeamsMessage(alert, template);
      
      const response = await axios.post(webhookUrl, message, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        return {
          success: true,
          messageId: response.headers['x-ms-request-id'] || 'unknown',
          deliveredAt: new Date()
        };
      } else {
        return {
          success: false,
          error: `Teams API returned status ${response.status}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Teams error'
      };
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Send a test message to validate the webhook
      const testMessage: TeamsMessage = {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        summary: 'DevFlow Intelligence Configuration Test',
        themeColor: '0076D7',
        sections: [{
          activityTitle: 'Configuration Test',
          facts: [{
            name: 'Status',
            value: 'Testing webhook configuration'
          }]
        }]
      };

      const response = await axios.post(this.config.webhookUrl, testMessage, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.status === 200;
    } catch (error) {
      console.error('Teams configuration validation failed:', error);
      return false;
    }
  }

  getChannelType(): NotificationChannel {
    return NotificationChannel.TEAMS;
  }

  private buildTeamsMessage(alert: Alert, template: NotificationTemplate): TeamsMessage {
    const themeColor = this.getSeverityColor(alert.severity);
    
    const facts: TeamsFact[] = [
      {
        name: 'Severity',
        value: alert.severity.toUpperCase()
      },
      {
        name: 'Type',
        value: alert.type.replace('_', ' ').toUpperCase()
      },
      {
        name: 'Status',
        value: alert.status.toUpperCase()
      },
      {
        name: 'Triggered',
        value: alert.triggeredAt.toLocaleString()
      }
    ];

    // Add context information
    if (alert.context.userId) {
      facts.push({
        name: 'User',
        value: alert.context.userId
      });
    }

    if (alert.context.teamId) {
      facts.push({
        name: 'Team',
        value: alert.context.teamId
      });
    }

    if (alert.context.projectId) {
      facts.push({
        name: 'Project',
        value: alert.context.projectId
      });
    }

    // Add metric values
    if (Object.keys(alert.context.metricValues).length > 0) {
      const metricText = Object.entries(alert.context.metricValues)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      
      facts.push({
        name: 'Metrics',
        value: metricText
      });
    }

    const sections: TeamsSection[] = [
      {
        activityTitle: alert.title,
        activitySubtitle: alert.message,
        facts,
        markdown: true
      }
    ];

    // Add recommendations section if available
    if (alert.recommendations.length > 0) {
      const recommendationText = alert.recommendations
        .map(r => `• **${r.title}**: ${r.description}`)
        .join('\n\n');
      
      sections.push({
        activityTitle: 'Recommendations',
        facts: [{
          name: 'Actions',
          value: recommendationText
        }],
        markdown: true
      });
    }

    const message: TeamsMessage = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      summary: `DevFlow Alert: ${alert.title}`,
      themeColor,
      sections
    };

    return message;
  }

  private getSeverityColor(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return 'FF0000'; // Red
      case AlertSeverity.HIGH:
        return 'FF8C00'; // Orange
      case AlertSeverity.MEDIUM:
        return 'FFD700'; // Yellow
      case AlertSeverity.LOW:
        return '32CD32'; // Green
      default:
        return '808080'; // Gray
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

// Default Teams templates
export const DEFAULT_TEAMS_TEMPLATES = {
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