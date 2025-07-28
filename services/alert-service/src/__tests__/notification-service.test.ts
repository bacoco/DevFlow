import { NotificationService, NotificationServiceConfig, NotificationRepository, TemplateRepository } from '../services/notification-service';
import { EmailNotificationProvider } from '../providers/email-provider';
import { SlackNotificationProvider } from '../providers/slack-provider';
import { TeamsNotificationProvider } from '../providers/teams-provider';
import { InAppNotificationProvider } from '../providers/in-app-provider';
import { 
  Alert, 
  AlertType, 
  AlertSeverity, 
  AlertStatus, 
  NotificationChannel, 
  NotificationTemplate, 
  NotificationDelivery 
} from '../types/alert-types';

// Mock implementations
class MockNotificationRepository implements NotificationRepository {
  private deliveries = new Map<string, NotificationDelivery>();

  async saveDelivery(delivery: NotificationDelivery): Promise<void> {
    this.deliveries.set(delivery.id, delivery);
  }

  async updateDelivery(deliveryId: string, updates: Partial<NotificationDelivery>): Promise<void> {
    const delivery = this.deliveries.get(deliveryId);
    if (delivery) {
      Object.assign(delivery, updates);
    }
  }

  async getDelivery(deliveryId: string): Promise<NotificationDelivery | null> {
    return this.deliveries.get(deliveryId) || null;
  }

  async getDeliveries(alertId: string): Promise<NotificationDelivery[]> {
    return Array.from(this.deliveries.values()).filter(d => d.alertId === alertId);
  }

  async getFailedDeliveries(maxRetries: number): Promise<NotificationDelivery[]> {
    return Array.from(this.deliveries.values()).filter(
      d => d.status === 'failed' && d.retryCount < maxRetries
    );
  }

  clear() {
    this.deliveries.clear();
  }
}

class MockTemplateRepository implements TemplateRepository {
  private templates = new Map<string, NotificationTemplate>();

  async getTemplate(channel: NotificationChannel, alertType: string): Promise<NotificationTemplate | null> {
    const key = `${channel}:${alertType}`;
    return this.templates.get(key) || null;
  }

  async saveTemplate(template: NotificationTemplate): Promise<void> {
    const key = `${template.channel}:${template.alertType}`;
    this.templates.set(key, template);
  }

  async updateTemplate(templateId: string, updates: Partial<NotificationTemplate>): Promise<void> {
    for (const [key, template] of this.templates) {
      if (template.id === templateId) {
        Object.assign(template, updates);
        break;
      }
    }
  }

  async deleteTemplate(templateId: string): Promise<void> {
    for (const [key, template] of this.templates) {
      if (template.id === templateId) {
        this.templates.delete(key);
        break;
      }
    }
  }

  clear() {
    this.templates.clear();
  }
}

class MockNotificationProvider {
  private shouldSucceed = true;
  private delay = 0;
  private channel: NotificationChannel;

  constructor(channel: NotificationChannel) {
    this.channel = channel;
  }

  async send(alert: Alert, recipient: string, template: NotificationTemplate) {
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }

    if (this.shouldSucceed) {
      return {
        success: true,
        messageId: `mock-${Date.now()}`,
        deliveredAt: new Date()
      };
    } else {
      return {
        success: false,
        error: 'Mock provider failure'
      };
    }
  }

  async validateConfig(): Promise<boolean> {
    return this.shouldSucceed;
  }

  getChannelType(): NotificationChannel {
    return this.channel;
  }

  setShouldSucceed(succeed: boolean) {
    this.shouldSucceed = succeed;
  }

  setDelay(delay: number) {
    this.delay = delay;
  }
}

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockNotificationRepository: MockNotificationRepository;
  let mockTemplateRepository: MockTemplateRepository;
  let mockEmailProvider: MockNotificationProvider;
  let mockSlackProvider: MockNotificationProvider;
  let config: NotificationServiceConfig;
  let testAlert: Alert;
  let testTemplate: NotificationTemplate;

  beforeEach(() => {
    config = {
      maxRetries: 3,
      retryDelay: 1000,
      batchSize: 10,
      templateCacheSize: 100
    };

    mockNotificationRepository = new MockNotificationRepository();
    mockTemplateRepository = new MockTemplateRepository();
    
    notificationService = new NotificationService(
      config,
      mockNotificationRepository,
      mockTemplateRepository
    );

    mockEmailProvider = new MockNotificationProvider(NotificationChannel.EMAIL);
    mockSlackProvider = new MockNotificationProvider(NotificationChannel.SLACK);

    notificationService.registerProvider(mockEmailProvider as any);
    notificationService.registerProvider(mockSlackProvider as any);

    testAlert = {
      id: 'alert1',
      ruleId: 'rule1',
      type: AlertType.PRODUCTIVITY_ANOMALY,
      severity: AlertSeverity.MEDIUM,
      status: AlertStatus.ACTIVE,
      title: 'Test Alert',
      message: 'Test alert message',
      context: {
        userId: 'user1',
        teamId: 'team1',
        metricValues: { productivity_score: 0.3 },
        timeRange: { start: new Date(), end: new Date() }
      },
      recommendations: [{
        id: 'rec1',
        type: 'action',
        title: 'Test Recommendation',
        description: 'Test recommendation description',
        priority: 1
      }],
      triggeredAt: new Date(),
      escalationLevel: 0
    };

    testTemplate = {
      id: 'template1',
      channel: NotificationChannel.EMAIL,
      alertType: AlertType.PRODUCTIVITY_ANOMALY,
      subject: 'Alert: {{alertTitle}}',
      body: 'Alert message: {{alertMessage}}',
      variables: ['alertTitle', 'alertMessage']
    };
  });

  afterEach(() => {
    mockNotificationRepository.clear();
    mockTemplateRepository.clear();
    notificationService.destroy();
  });

  describe('sendNotification', () => {
    beforeEach(async () => {
      await mockTemplateRepository.saveTemplate(testTemplate);
    });

    it('should send notification to single channel and recipient', async () => {
      const channels = [NotificationChannel.EMAIL];
      const recipients = {
        [NotificationChannel.EMAIL]: ['user@example.com']
      };

      const deliveries = await notificationService.sendNotification(testAlert, channels, recipients);

      expect(deliveries).toHaveLength(1);
      expect(deliveries[0].channel).toBe(NotificationChannel.EMAIL);
      expect(deliveries[0].recipient).toBe('user@example.com');
      expect(deliveries[0].status).toBe('delivered');
    });

    it('should send notification to multiple channels and recipients', async () => {
      const slackTemplate = {
        ...testTemplate,
        id: 'template2',
        channel: NotificationChannel.SLACK
      };
      await mockTemplateRepository.saveTemplate(slackTemplate);

      const channels = [NotificationChannel.EMAIL, NotificationChannel.SLACK];
      const recipients = {
        [NotificationChannel.EMAIL]: ['user1@example.com', 'user2@example.com'],
        [NotificationChannel.SLACK]: ['#general', '@user1']
      };

      const deliveries = await notificationService.sendNotification(testAlert, channels, recipients);

      expect(deliveries).toHaveLength(4);
      expect(deliveries.filter(d => d.channel === NotificationChannel.EMAIL)).toHaveLength(2);
      expect(deliveries.filter(d => d.channel === NotificationChannel.SLACK)).toHaveLength(2);
    });

    it('should handle provider failures gracefully', async () => {
      mockEmailProvider.setShouldSucceed(false);

      const channels = [NotificationChannel.EMAIL];
      const recipients = {
        [NotificationChannel.EMAIL]: ['user@example.com']
      };

      const deliveries = await notificationService.sendNotification(testAlert, channels, recipients);

      expect(deliveries).toHaveLength(1);
      expect(deliveries[0].status).toBe('failed');
      expect(deliveries[0].error).toBe('Mock provider failure');
    });

    it('should skip channels without registered providers', async () => {
      const channels = [NotificationChannel.TEAMS]; // No provider registered
      const recipients = {
        [NotificationChannel.TEAMS]: ['webhook-url']
      };

      const deliveries = await notificationService.sendNotification(testAlert, channels, recipients);

      expect(deliveries).toHaveLength(0);
    });

    it('should handle missing templates', async () => {
      const channels = [NotificationChannel.SLACK]; // No template for Slack
      const recipients = {
        [NotificationChannel.SLACK]: ['#general']
      };

      const deliveries = await notificationService.sendNotification(testAlert, channels, recipients);

      expect(deliveries).toHaveLength(1);
      expect(deliveries[0].status).toBe('failed');
      expect(deliveries[0].error).toContain('No template found');
    });
  });

  describe('sendBulkNotifications', () => {
    beforeEach(async () => {
      await mockTemplateRepository.saveTemplate(testTemplate);
    });

    it('should send bulk notifications in batches', async () => {
      const notifications = Array.from({ length: 25 }, (_, i) => ({
        alert: { ...testAlert, id: `alert${i}` },
        channels: [NotificationChannel.EMAIL],
        recipients: {
          [NotificationChannel.EMAIL]: [`user${i}@example.com`]
        }
      }));

      const deliveries = await notificationService.sendBulkNotifications(notifications);

      expect(deliveries).toHaveLength(25);
      expect(deliveries.every(d => d.status === 'delivered')).toBe(true);
    });

    it('should handle mixed success and failure in bulk operations', async () => {
      // Set provider to fail every other request
      let callCount = 0;
      const originalSend = mockEmailProvider.send;
      mockEmailProvider.send = async (...args) => {
        callCount++;
        if (callCount % 2 === 0) {
          return { success: false, error: 'Intermittent failure' };
        }
        return originalSend.call(mockEmailProvider, ...args);
      };

      const notifications = Array.from({ length: 4 }, (_, i) => ({
        alert: { ...testAlert, id: `alert${i}` },
        channels: [NotificationChannel.EMAIL],
        recipients: {
          [NotificationChannel.EMAIL]: [`user${i}@example.com`]
        }
      }));

      const deliveries = await notificationService.sendBulkNotifications(notifications);

      expect(deliveries).toHaveLength(4);
      expect(deliveries.filter(d => d.status === 'delivered')).toHaveLength(2);
      expect(deliveries.filter(d => d.status === 'failed')).toHaveLength(2);
    });
  });

  describe('template management', () => {
    it('should create new template', async () => {
      const templateData = {
        channel: NotificationChannel.SLACK,
        alertType: AlertType.QUALITY_THRESHOLD,
        subject: 'Quality Alert: {{alertTitle}}',
        body: 'Quality issue: {{alertMessage}}',
        variables: ['alertTitle', 'alertMessage']
      };

      const template = await notificationService.createTemplate(templateData);

      expect(template.id).toBeDefined();
      expect(template.channel).toBe(templateData.channel);
      expect(template.alertType).toBe(templateData.alertType);

      // Verify it was saved
      const savedTemplate = await mockTemplateRepository.getTemplate(
        templateData.channel,
        templateData.alertType
      );
      expect(savedTemplate).toEqual(template);
    });

    it('should update existing template', async () => {
      await mockTemplateRepository.saveTemplate(testTemplate);

      const updates = {
        subject: 'Updated: {{alertTitle}}',
        body: 'Updated message: {{alertMessage}}'
      };

      const updatedTemplate = await notificationService.updateTemplate(testTemplate.id, updates);

      expect(updatedTemplate).not.toBeNull();
      expect(updatedTemplate!.subject).toBe(updates.subject);
      expect(updatedTemplate!.body).toBe(updates.body);
    });
  });

  describe('delivery status and retry', () => {
    beforeEach(async () => {
      await mockTemplateRepository.saveTemplate(testTemplate);
    });

    it('should get delivery status for alert', async () => {
      const channels = [NotificationChannel.EMAIL];
      const recipients = {
        [NotificationChannel.EMAIL]: ['user@example.com']
      };

      await notificationService.sendNotification(testAlert, channels, recipients);

      const deliveries = await notificationService.getDeliveryStatus(testAlert.id);

      expect(deliveries).toHaveLength(1);
      expect(deliveries[0].alertId).toBe(testAlert.id);
    });

    it('should retry failed deliveries', async () => {
      // First, create a failed delivery
      mockEmailProvider.setShouldSucceed(false);

      const channels = [NotificationChannel.EMAIL];
      const recipients = {
        [NotificationChannel.EMAIL]: ['user@example.com']
      };

      await notificationService.sendNotification(testAlert, channels, recipients);

      // Verify it failed initially
      let deliveries = await notificationService.getDeliveryStatus(testAlert.id);
      expect(deliveries[0].status).toBe('failed');
      expect(deliveries[0].retryCount).toBe(0);

      // Now make provider succeed and retry
      mockEmailProvider.setShouldSucceed(true);
      await notificationService.retryFailedDeliveries();

      // Check that it was retried successfully
      deliveries = await notificationService.getDeliveryStatus(testAlert.id);
      expect(deliveries[0].status).toBe('delivered');
      expect(deliveries[0].retryCount).toBe(1);
    });

    it('should not retry deliveries that exceeded max retries', async () => {
      // Create a delivery with max retries exceeded
      const failedDelivery: NotificationDelivery = {
        id: 'delivery1',
        alertId: testAlert.id,
        channel: NotificationChannel.EMAIL,
        recipient: 'user@example.com',
        status: 'failed',
        retryCount: config.maxRetries,
        error: 'Max retries exceeded'
      };

      await mockNotificationRepository.saveDelivery(failedDelivery);

      let retryAttempted = false;
      const originalSend = mockEmailProvider.send;
      mockEmailProvider.send = async (...args) => {
        retryAttempted = true;
        return originalSend.call(mockEmailProvider, ...args);
      };

      await notificationService.retryFailedDeliveries();

      expect(retryAttempted).toBe(false);
    });
  });

  describe('provider validation', () => {
    it('should validate all registered providers', async () => {
      const results = await notificationService.validateProviders();

      expect(results[NotificationChannel.EMAIL]).toBe(true);
      expect(results[NotificationChannel.SLACK]).toBe(true);
    });

    it('should report failed provider validation', async () => {
      mockEmailProvider.setShouldSucceed(false);

      const results = await notificationService.validateProviders();

      expect(results[NotificationChannel.EMAIL]).toBe(false);
      expect(results[NotificationChannel.SLACK]).toBe(true);
    });
  });

  describe('event emission', () => {
    beforeEach(async () => {
      await mockTemplateRepository.saveTemplate(testTemplate);
    });

    it('should emit events for successful deliveries', async () => {
      const events: string[] = [];

      notificationService.on('deliverySuccess', () => events.push('success'));
      notificationService.on('deliveryFailed', () => events.push('failed'));

      const channels = [NotificationChannel.EMAIL];
      const recipients = {
        [NotificationChannel.EMAIL]: ['user@example.com']
      };

      await notificationService.sendNotification(testAlert, channels, recipients);

      expect(events).toContain('success');
      expect(events).not.toContain('failed');
    });

    it('should emit events for failed deliveries', async () => {
      const events: string[] = [];

      notificationService.on('deliverySuccess', () => events.push('success'));
      notificationService.on('deliveryFailed', () => events.push('failed'));

      mockEmailProvider.setShouldSucceed(false);

      const channels = [NotificationChannel.EMAIL];
      const recipients = {
        [NotificationChannel.EMAIL]: ['user@example.com']
      };

      await notificationService.sendNotification(testAlert, channels, recipients);

      expect(events).toContain('failed');
      expect(events).not.toContain('success');
    });

    it('should emit events for retry operations', async () => {
      const events: string[] = [];

      notificationService.on('deliveryRetrySuccess', () => events.push('retrySuccess'));
      notificationService.on('deliveryRetryFailed', () => events.push('retryFailed'));

      // Create failed delivery first
      mockEmailProvider.setShouldSucceed(false);
      const channels = [NotificationChannel.EMAIL];
      const recipients = {
        [NotificationChannel.EMAIL]: ['user@example.com']
      };

      await notificationService.sendNotification(testAlert, channels, recipients);

      // Now retry with success
      mockEmailProvider.setShouldSucceed(true);
      await notificationService.retryFailedDeliveries();

      expect(events).toContain('retrySuccess');
    });
  });
});