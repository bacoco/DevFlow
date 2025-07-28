import { 
  Alert, 
  AlertType,
  NotificationChannel, 
  NotificationTemplate, 
  NotificationDelivery 
} from '../types/alert-types';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface NotificationServiceConfig {
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  templateCacheSize: number;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface SlackConfig {
  botToken: string;
  signingSecret: string;
  defaultChannel: string;
}

export interface TeamsConfig {
  webhookUrl: string;
  tenantId: string;
}

export interface NotificationProvider {
  send(alert: Alert, recipient: string, template: NotificationTemplate): Promise<NotificationResult>;
  validateConfig(): Promise<boolean>;
  getChannelType(): NotificationChannel;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveredAt?: Date;
}

export interface NotificationRepository {
  saveDelivery(delivery: NotificationDelivery): Promise<void>;
  updateDelivery(deliveryId: string, updates: Partial<NotificationDelivery>): Promise<void>;
  getDelivery(deliveryId: string): Promise<NotificationDelivery | null>;
  getDeliveries(alertId: string): Promise<NotificationDelivery[]>;
  getFailedDeliveries(maxRetries: number): Promise<NotificationDelivery[]>;
}

export interface TemplateRepository {
  getTemplate(channel: NotificationChannel, alertType: string): Promise<NotificationTemplate | null>;
  saveTemplate(template: NotificationTemplate): Promise<void>;
  updateTemplate(templateId: string, updates: Partial<NotificationTemplate>): Promise<void>;
  deleteTemplate(templateId: string): Promise<void>;
}

export class NotificationService extends EventEmitter {
  private readonly config: NotificationServiceConfig;
  private readonly providers = new Map<NotificationChannel, NotificationProvider>();
  private readonly notificationRepository: NotificationRepository;
  private readonly templateRepository: TemplateRepository;
  private readonly templateCache = new Map<string, NotificationTemplate>();
  private retryTimer?: NodeJS.Timeout;

  constructor(
    config: NotificationServiceConfig,
    notificationRepository: NotificationRepository,
    templateRepository: TemplateRepository
  ) {
    super();
    this.config = config;
    this.notificationRepository = notificationRepository;
    this.templateRepository = templateRepository;
    this.startRetryProcessor();
  }

  registerProvider(provider: NotificationProvider): void {
    this.providers.set(provider.getChannelType(), provider);
  }

  async sendNotification(
    alert: Alert, 
    channels: NotificationChannel[], 
    recipients: Partial<Record<NotificationChannel, string[]>>
  ): Promise<NotificationDelivery[]> {
    const deliveries: NotificationDelivery[] = [];

    for (const channel of channels) {
      const provider = this.providers.get(channel);
      if (!provider) {
        console.warn(`No provider registered for channel: ${channel}`);
        continue;
      }

      const channelRecipients = recipients[channel] || [];
      for (const recipient of channelRecipients) {
        const delivery = await this.sendToRecipient(alert, channel, recipient, provider);
        deliveries.push(delivery);
      }
    }

    return deliveries;
  }

  async sendBulkNotifications(
    notifications: Array<{
      alert: Alert;
      channels: NotificationChannel[];
      recipients: Partial<Record<NotificationChannel, string[]>>;
    }>
  ): Promise<NotificationDelivery[]> {
    const allDeliveries: NotificationDelivery[] = [];
    
    // Process in batches to avoid overwhelming providers
    for (let i = 0; i < notifications.length; i += this.config.batchSize) {
      const batch = notifications.slice(i, i + this.config.batchSize);
      const batchPromises = batch.map(notification => 
        this.sendNotification(notification.alert, notification.channels, notification.recipients)
      );
      
      const batchResults = await Promise.all(batchPromises);
      allDeliveries.push(...batchResults.flat());
    }

    return allDeliveries;
  }

  async retryFailedDeliveries(): Promise<void> {
    const failedDeliveries = await this.notificationRepository.getFailedDeliveries(this.config.maxRetries);
    
    for (const delivery of failedDeliveries) {
      if (delivery.retryCount >= this.config.maxRetries) {
        continue;
      }

      const provider = this.providers.get(delivery.channel);
      if (!provider) {
        continue;
      }

      try {
        // Get the original alert (this would typically come from alert repository)
        const alert = await this.getAlertForDelivery(delivery);
        if (!alert) {
          continue;
        }

        const template = await this.getTemplate(delivery.channel, alert.type);
        if (!template) {
          continue;
        }

        const result = await provider.send(alert, delivery.recipient, template);
        
        if (result.success) {
          await this.notificationRepository.updateDelivery(delivery.id, {
            status: 'delivered',
            deliveredAt: result.deliveredAt || new Date(),
            retryCount: delivery.retryCount + 1,
            error: undefined
          });
          
          this.emit('deliveryRetrySuccess', delivery);
        } else {
          await this.notificationRepository.updateDelivery(delivery.id, {
            retryCount: delivery.retryCount + 1,
            error: result.error
          });
          
          this.emit('deliveryRetryFailed', delivery, result.error);
        }
      } catch (error) {
        await this.notificationRepository.updateDelivery(delivery.id, {
          retryCount: delivery.retryCount + 1,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  async createTemplate(template: Omit<NotificationTemplate, 'id'>): Promise<NotificationTemplate> {
    const newTemplate: NotificationTemplate = {
      ...template,
      id: uuidv4()
    };

    await this.templateRepository.saveTemplate(newTemplate);
    this.invalidateTemplateCache(template.channel, template.alertType);
    
    return newTemplate;
  }

  async updateTemplate(templateId: string, updates: Partial<NotificationTemplate>): Promise<NotificationTemplate | null> {
    // Find existing template by ID
    let existingTemplate: NotificationTemplate | null = null;
    
    // This is a simplified approach - in a real implementation, you'd have a proper findById method
    for (const channel of Object.values(NotificationChannel)) {
      for (const alertType of Object.values(AlertType)) {
        const template = await this.templateRepository.getTemplate(channel, alertType);
        if (template && template.id === templateId) {
          existingTemplate = template;
          break;
        }
      }
      if (existingTemplate) break;
    }
    
    if (!existingTemplate) {
      return null;
    }

    await this.templateRepository.updateTemplate(templateId, updates);
    this.invalidateTemplateCache(existingTemplate.channel, existingTemplate.alertType);
    
    return { ...existingTemplate, ...updates };
  }

  async getDeliveryStatus(alertId: string): Promise<NotificationDelivery[]> {
    return this.notificationRepository.getDeliveries(alertId);
  }

  async validateProviders(): Promise<Record<NotificationChannel, boolean>> {
    const results: Record<NotificationChannel, boolean> = {} as any;
    
    for (const [channel, provider] of this.providers) {
      try {
        results[channel] = await provider.validateConfig();
      } catch (error) {
        results[channel] = false;
        console.error(`Provider validation failed for ${channel}:`, error);
      }
    }
    
    return results;
  }

  private async sendToRecipient(
    alert: Alert,
    channel: NotificationChannel,
    recipient: string,
    provider: NotificationProvider
  ): Promise<NotificationDelivery> {
    const delivery: NotificationDelivery = {
      id: uuidv4(),
      alertId: alert.id,
      channel,
      recipient,
      status: 'pending',
      retryCount: 0
    };

    await this.notificationRepository.saveDelivery(delivery);

    try {
      const template = await this.getTemplate(channel, alert.type);
      if (!template) {
        throw new Error(`No template found for channel ${channel} and alert type ${alert.type}`);
      }

      const result = await provider.send(alert, recipient, template);
      
      if (result.success) {
        await this.notificationRepository.updateDelivery(delivery.id, {
          status: 'delivered',
          sentAt: new Date(),
          deliveredAt: result.deliveredAt || new Date()
        });
        
        this.emit('deliverySuccess', delivery);
      } else {
        await this.notificationRepository.updateDelivery(delivery.id, {
          status: 'failed',
          sentAt: new Date(),
          error: result.error
        });
        
        this.emit('deliveryFailed', delivery, result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.notificationRepository.updateDelivery(delivery.id, {
        status: 'failed',
        error: errorMessage
      });
      
      this.emit('deliveryFailed', delivery, errorMessage);
    }

    return delivery;
  }

  private async getTemplate(channel: NotificationChannel, alertType: string): Promise<NotificationTemplate | null> {
    const cacheKey = `${channel}:${alertType}`;
    
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey)!;
    }

    const template = await this.templateRepository.getTemplate(channel, alertType);
    
    if (template && this.templateCache.size < this.config.templateCacheSize) {
      this.templateCache.set(cacheKey, template);
    }
    
    return template;
  }

  private invalidateTemplateCache(channel: NotificationChannel, alertType: string): void {
    const cacheKey = `${channel}:${alertType}`;
    this.templateCache.delete(cacheKey);
  }

  private async getAlertForDelivery(delivery: NotificationDelivery): Promise<Alert | null> {
    // This would typically fetch from an alert repository
    // For testing purposes, create a mock alert
    return {
      id: delivery.alertId,
      ruleId: 'test-rule',
      type: AlertType.PRODUCTIVITY_ANOMALY,
      severity: 'medium' as any,
      status: 'active' as any,
      title: 'Test Alert',
      message: 'Test message',
      context: {
        metricValues: {},
        timeRange: { start: new Date(), end: new Date() }
      },
      recommendations: [],
      triggeredAt: new Date(),
      escalationLevel: 0
    };
  }

  private startRetryProcessor(): void {
    this.retryTimer = setInterval(async () => {
      try {
        await this.retryFailedDeliveries();
      } catch (error) {
        console.error('Error in retry processor:', error);
      }
    }, this.config.retryDelay);
  }

  destroy(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
    }
    this.removeAllListeners();
  }
}