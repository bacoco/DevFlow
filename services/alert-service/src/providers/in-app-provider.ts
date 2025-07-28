import { NotificationProvider, NotificationResult } from '../services/notification-service';
import { Alert, NotificationChannel, NotificationTemplate } from '../types/alert-types';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface InAppNotification {
  id: string;
  userId: string;
  alertId: string;
  title: string;
  message: string;
  severity: string;
  type: string;
  read: boolean;
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface InAppNotificationRepository {
  saveNotification(notification: InAppNotification): Promise<void>;
  markAsRead(notificationId: string, userId: string): Promise<boolean>;
  markAllAsRead(userId: string): Promise<number>;
  getNotifications(userId: string, filters?: NotificationFilters): Promise<InAppNotification[]>;
  getUnreadCount(userId: string): Promise<number>;
  deleteNotification(notificationId: string, userId: string): Promise<boolean>;
  deleteExpiredNotifications(): Promise<number>;
}

export interface NotificationFilters {
  read?: boolean;
  type?: string;
  severity?: string;
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface InAppProviderConfig {
  defaultExpirationDays: number;
  maxNotificationsPerUser: number;
  enableRealTimeUpdates: boolean;
}

export class InAppNotificationProvider extends EventEmitter implements NotificationProvider {
  private readonly config: InAppProviderConfig;
  private readonly repository: InAppNotificationRepository;
  private readonly userConnections = new Map<string, Set<any>>(); // WebSocket connections

  constructor(config: InAppProviderConfig, repository: InAppNotificationRepository) {
    super();
    this.config = config;
    this.repository = repository;
    this.startCleanupTimer();
  }

  async send(alert: Alert, recipient: string, template: NotificationTemplate): Promise<NotificationResult> {
    try {
      const userId = recipient;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.config.defaultExpirationDays);

      const notification: InAppNotification = {
        id: uuidv4(),
        userId,
        alertId: alert.id,
        title: this.renderTemplate(template.subject, alert),
        message: this.renderTemplate(template.body, alert),
        severity: alert.severity,
        type: alert.type,
        read: false,
        createdAt: new Date(),
        expiresAt,
        metadata: {
          context: alert.context,
          recommendations: alert.recommendations
        }
      };

      await this.repository.saveNotification(notification);

      // Send real-time update if enabled
      if (this.config.enableRealTimeUpdates) {
        this.sendRealTimeUpdate(userId, 'notification_created', notification);
      }

      this.emit('notificationCreated', notification);

      return {
        success: true,
        messageId: notification.id,
        deliveredAt: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown in-app notification error'
      };
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Test repository connection
      await this.repository.getUnreadCount('test-user');
      return true;
    } catch (error) {
      console.error('In-app notification configuration validation failed:', error);
      return false;
    }
  }

  getChannelType(): NotificationChannel {
    return NotificationChannel.IN_APP;
  }

  // Additional methods for in-app notification management
  async getNotifications(userId: string, filters?: NotificationFilters): Promise<InAppNotification[]> {
    return this.repository.getNotifications(userId, filters);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.repository.getUnreadCount(userId);
  }

  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const success = await this.repository.markAsRead(notificationId, userId);
    
    if (success && this.config.enableRealTimeUpdates) {
      this.sendRealTimeUpdate(userId, 'notification_read', { notificationId });
    }
    
    return success;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const count = await this.repository.markAllAsRead(userId);
    
    if (count > 0 && this.config.enableRealTimeUpdates) {
      this.sendRealTimeUpdate(userId, 'all_notifications_read', { count });
    }
    
    return count;
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const success = await this.repository.deleteNotification(notificationId, userId);
    
    if (success && this.config.enableRealTimeUpdates) {
      this.sendRealTimeUpdate(userId, 'notification_deleted', { notificationId });
    }
    
    return success;
  }

  // WebSocket connection management for real-time updates
  addUserConnection(userId: string, connection: any): void {
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(connection);
  }

  removeUserConnection(userId: string, connection: any): void {
    const connections = this.userConnections.get(userId);
    if (connections) {
      connections.delete(connection);
      if (connections.size === 0) {
        this.userConnections.delete(userId);
      }
    }
  }

  private sendRealTimeUpdate(userId: string, event: string, data: any): void {
    const connections = this.userConnections.get(userId);
    if (connections) {
      const message = JSON.stringify({ event, data, timestamp: new Date() });
      connections.forEach(connection => {
        try {
          if (connection.readyState === 1) { // WebSocket.OPEN
            connection.send(message);
          }
        } catch (error) {
          console.error('Error sending real-time update:', error);
          this.removeUserConnection(userId, connection);
        }
      });
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
      projectId: alert.context.projectId || 'Unknown',
      recommendations: alert.recommendations.map(r => `${r.title}: ${r.description}`).join('; '),
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

  private startCleanupTimer(): void {
    // Clean up expired notifications every hour
    setInterval(async () => {
      try {
        const deletedCount = await this.repository.deleteExpiredNotifications();
        if (deletedCount > 0) {
          console.log(`Cleaned up ${deletedCount} expired in-app notifications`);
        }
      } catch (error) {
        console.error('Error cleaning up expired notifications:', error);
      }
    }, 60 * 60 * 1000); // 1 hour
  }
}

// Default in-app templates
export const DEFAULT_IN_APP_TEMPLATES = {
  productivity_anomaly: {
    subject: 'Productivity Alert',
    body: 'Productivity anomaly detected. {{alertMessage}}'
  },
  quality_threshold: {
    subject: 'Code Quality Alert',
    body: 'Code quality threshold exceeded. {{alertMessage}}'
  },
  flow_interruption: {
    subject: 'Flow Interruption',
    body: 'Developer flow interruption detected. {{alertMessage}}'
  },
  delivery_risk: {
    subject: 'Delivery Risk Alert',
    body: 'Delivery risk identified. {{alertMessage}}'
  },
  team_performance: {
    subject: 'Team Performance Alert',
    body: 'Team performance issue detected. {{alertMessage}}'
  },
  security_concern: {
    subject: 'Security Alert',
    body: 'Security concern identified. {{alertMessage}}'
  }
};