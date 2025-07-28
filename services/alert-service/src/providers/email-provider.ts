import { NotificationProvider, NotificationResult, EmailConfig } from '../services/notification-service';
import { Alert, NotificationChannel, NotificationTemplate } from '../types/alert-types';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export class EmailNotificationProvider implements NotificationProvider {
  private transporter: Transporter;
  private readonly config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    this.transporter = nodemailer.createTransporter({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth
    });
  }

  async send(alert: Alert, recipient: string, template: NotificationTemplate): Promise<NotificationResult> {
    try {
      const renderedSubject = this.renderTemplate(template.subject, alert);
      const renderedBody = this.renderTemplate(template.body, alert);

      const mailOptions = {
        from: this.config.from,
        to: recipient,
        subject: renderedSubject,
        html: renderedBody,
        text: this.htmlToText(renderedBody)
      };

      const info = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId,
        deliveredAt: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email error'
      };
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email configuration validation failed:', error);
      return false;
    }
  }

  getChannelType(): NotificationChannel {
    return NotificationChannel.EMAIL;
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
      projectId: alert.context.projectId || 'Unknown',
      recommendations: alert.recommendations.map(r => `• ${r.title}: ${r.description}`).join('\n'),
      metricValues: Object.entries(alert.context.metricValues)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')
    };

    let rendered = template;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return rendered;
  }

  private htmlToText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }
}

// Default email templates
export const DEFAULT_EMAIL_TEMPLATES = {
  productivity_anomaly: {
    subject: 'Productivity Alert: {{alertTitle}}',
    body: `
      <h2>Productivity Anomaly Detected</h2>
      <p><strong>Alert:</strong> {{alertTitle}}</p>
      <p><strong>Severity:</strong> {{alertSeverity}}</p>
      <p><strong>Message:</strong> {{alertMessage}}</p>
      <p><strong>Triggered:</strong> {{triggeredAt}}</p>
      
      <h3>Context</h3>
      <p><strong>User:</strong> {{userId}}</p>
      <p><strong>Team:</strong> {{teamId}}</p>
      <p><strong>Metrics:</strong> {{metricValues}}</p>
      
      <h3>Recommendations</h3>
      <pre>{{recommendations}}</pre>
      
      <p><em>This is an automated alert from DevFlow Intelligence.</em></p>
    `
  },
  quality_threshold: {
    subject: 'Code Quality Alert: {{alertTitle}}',
    body: `
      <h2>Code Quality Threshold Exceeded</h2>
      <p><strong>Alert:</strong> {{alertTitle}}</p>
      <p><strong>Severity:</strong> {{alertSeverity}}</p>
      <p><strong>Message:</strong> {{alertMessage}}</p>
      <p><strong>Triggered:</strong> {{triggeredAt}}</p>
      
      <h3>Context</h3>
      <p><strong>Project:</strong> {{projectId}}</p>
      <p><strong>Team:</strong> {{teamId}}</p>
      <p><strong>Metrics:</strong> {{metricValues}}</p>
      
      <h3>Recommendations</h3>
      <pre>{{recommendations}}</pre>
      
      <p><em>This is an automated alert from DevFlow Intelligence.</em></p>
    `
  },
  flow_interruption: {
    subject: 'Flow Interruption Alert: {{alertTitle}}',
    body: `
      <h2>Developer Flow Interruption</h2>
      <p><strong>Alert:</strong> {{alertTitle}}</p>
      <p><strong>Severity:</strong> {{alertSeverity}}</p>
      <p><strong>Message:</strong> {{alertMessage}}</p>
      <p><strong>Triggered:</strong> {{triggeredAt}}</p>
      
      <h3>Context</h3>
      <p><strong>User:</strong> {{userId}}</p>
      <p><strong>Team:</strong> {{teamId}}</p>
      <p><strong>Metrics:</strong> {{metricValues}}</p>
      
      <h3>Recommendations</h3>
      <pre>{{recommendations}}</pre>
      
      <p><em>This is an automated alert from DevFlow Intelligence.</em></p>
    `
  }
};