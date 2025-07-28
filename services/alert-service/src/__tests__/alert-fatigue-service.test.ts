import { 
  AlertFatigueService, 
  AlertFatigueConfig, 
  AlertFatigueRepository,
  FatigueMetrics,
  MaintenanceWindow,
  FeedbackAnalysis
} from '../services/alert-fatigue-service';
import { 
  Alert, 
  AlertFeedback, 
  AlertType, 
  AlertSeverity, 
  AlertStatus 
} from '../types/alert-types';

// Mock repository implementation
class MockAlertFatigueRepository implements AlertFatigueRepository {
  private fatigueMetrics = new Map<string, FatigueMetrics>();
  private maintenanceWindows = new Map<string, MaintenanceWindow>();
  private feedbackAnalysis = new Map<string, FeedbackAnalysis>();

  async saveFatigueMetrics(metrics: FatigueMetrics): Promise<void> {
    this.fatigueMetrics.set(metrics.userId, metrics);
  }

  async getFatigueMetrics(userId: string): Promise<FatigueMetrics | null> {
    return this.fatigueMetrics.get(userId) || null;
  }

  async updateFatigueMetrics(userId: string, updates: Partial<FatigueMetrics>): Promise<void> {
    const existing = this.fatigueMetrics.get(userId);
    if (existing) {
      Object.assign(existing, updates);
    }
  }

  async saveMaintenanceWindow(window: MaintenanceWindow): Promise<void> {
    this.maintenanceWindows.set(window.id, window);
  }

  async getActiveMaintenanceWindows(): Promise<MaintenanceWindow[]> {
    const now = new Date();
    return Array.from(this.maintenanceWindows.values()).filter(window => {
      if (window.recurring) {
        return true; // Simplified - assume all recurring windows are potentially active
      }
      return now >= window.startTime && now <= window.endTime;
    });
  }

  async getMaintenanceWindow(windowId: string): Promise<MaintenanceWindow | null> {
    return this.maintenanceWindows.get(windowId) || null;
  }

  async updateMaintenanceWindow(windowId: string, updates: Partial<MaintenanceWindow>): Promise<void> {
    const existing = this.maintenanceWindows.get(windowId);
    if (existing) {
      Object.assign(existing, updates);
    }
  }

  async deleteMaintenanceWindow(windowId: string): Promise<void> {
    this.maintenanceWindows.delete(windowId);
  }

  async saveFeedbackAnalysis(analysis: FeedbackAnalysis): Promise<void> {
    const key = `${analysis.userId}:${analysis.alertType}`;
    this.feedbackAnalysis.set(key, analysis);
  }

  async getFeedbackAnalysis(userId: string, alertType: AlertType): Promise<FeedbackAnalysis | null> {
    const key = `${userId}:${alertType}`;
    return this.feedbackAnalysis.get(key) || null;
  }

  async updateFeedbackAnalysis(userId: string, alertType: AlertType, updates: Partial<FeedbackAnalysis>): Promise<void> {
    const key = `${userId}:${alertType}`;
    const existing = this.feedbackAnalysis.get(key);
    if (existing) {
      Object.assign(existing, updates);
    }
  }

  // Test helpers
  clear() {
    this.fatigueMetrics.clear();
    this.maintenanceWindows.clear();
    this.feedbackAnalysis.clear();
  }
}

describe('AlertFatigueService', () => {
  let fatigueService: AlertFatigueService;
  let mockRepository: MockAlertFatigueRepository;
  let config: AlertFatigueConfig;
  let testAlert: Alert;

  beforeEach(() => {
    config = {
      fatigueThreshold: 5,
      timeWindowMinutes: 60,
      adaptiveThresholdEnabled: true,
      feedbackWeightingEnabled: true,
      maintenanceWindowEnabled: true,
      learningRateDecay: 0.1
    };

    mockRepository = new MockAlertFatigueRepository();
    fatigueService = new AlertFatigueService(config, mockRepository);

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
      recommendations: [],
      triggeredAt: new Date(),
      escalationLevel: 0
    };
  });

  afterEach(() => {
    mockRepository.clear();
    fatigueService.destroy();
  });

  describe('shouldSuppressAlert', () => {
    it('should not suppress alert for new user', async () => {
      const shouldSuppress = await fatigueService.shouldSuppressAlert(testAlert);
      expect(shouldSuppress).toBe(false);
    });

    it('should suppress alert when user is fatigued', async () => {
      // Create fatigued user metrics
      const fatigueMetrics: FatigueMetrics = {
        userId: 'user1',
        alertCount: 10, // Above threshold
        timeWindow: 60,
        fatigueScore: 1.0,
        lastAlertTime: new Date(),
        suppressionActive: false,
        adaptiveThreshold: 5
      };

      await mockRepository.saveFatigueMetrics(fatigueMetrics);

      const shouldSuppress = await fatigueService.shouldSuppressAlert(testAlert);
      expect(shouldSuppress).toBe(true);
    });

    it('should suppress alert during maintenance window', async () => {
      const maintenanceWindow: MaintenanceWindow = {
        id: 'window1',
        name: 'Scheduled Maintenance',
        startTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        endTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
        recurring: false,
        affectedRules: ['rule1'],
        createdBy: 'admin'
      };

      await mockRepository.saveMaintenanceWindow(maintenanceWindow);

      const shouldSuppress = await fatigueService.shouldSuppressAlert(testAlert);
      expect(shouldSuppress).toBe(true);
    });

    it('should not suppress alert during maintenance window for unaffected rules', async () => {
      const maintenanceWindow: MaintenanceWindow = {
        id: 'window1',
        name: 'Scheduled Maintenance',
        startTime: new Date(Date.now() - 30 * 60 * 1000),
        endTime: new Date(Date.now() + 30 * 60 * 1000),
        recurring: false,
        affectedRules: ['rule2'], // Different rule
        createdBy: 'admin'
      };

      await mockRepository.saveMaintenanceWindow(maintenanceWindow);

      const shouldSuppress = await fatigueService.shouldSuppressAlert(testAlert);
      expect(shouldSuppress).toBe(false);
    });

    it('should emit suppression events', async () => {
      const events: string[] = [];
      fatigueService.on('alertSuppressed', (alert, reason) => {
        events.push(reason);
      });

      // Create maintenance window
      const maintenanceWindow: MaintenanceWindow = {
        id: 'window1',
        name: 'Test Window',
        startTime: new Date(Date.now() - 30 * 60 * 1000),
        endTime: new Date(Date.now() + 30 * 60 * 1000),
        recurring: false,
        affectedRules: ['rule1'],
        createdBy: 'admin'
      };

      await mockRepository.saveMaintenanceWindow(maintenanceWindow);
      await fatigueService.shouldSuppressAlert(testAlert);

      expect(events).toContain('maintenance_window');
    });
  });

  describe('recordAlertFeedback', () => {
    it('should record and process feedback', async () => {
      const feedback: AlertFeedback = {
        alertId: 'alert1',
        userId: 'user1',
        relevance: 'relevant',
        actionTaken: true,
        comments: 'This was helpful',
        timestamp: new Date()
      };

      let feedbackProcessed = false;
      fatigueService.on('feedbackProcessed', () => {
        feedbackProcessed = true;
      });

      await fatigueService.recordAlertFeedback(feedback);

      expect(feedbackProcessed).toBe(true);

      // Check that feedback analysis was created
      const analysis = await fatigueService.getFeedbackAnalysis('user1', AlertType.PRODUCTIVITY_ANOMALY);
      expect(analysis).not.toBeNull();
      expect(analysis!.relevanceScore).toBe(0.75); // 'relevant' maps to 0.75
      expect(analysis!.actionTakenRate).toBe(1);
    });

    it('should adjust adaptive thresholds based on feedback', async () => {
      const feedback: AlertFeedback = {
        alertId: 'alert1',
        userId: 'user1',
        relevance: 'not_relevant',
        actionTaken: false,
        timestamp: new Date()
      };

      await fatigueService.recordAlertFeedback(feedback);

      const analysis = await fatigueService.getFeedbackAnalysis('user1', AlertType.PRODUCTIVITY_ANOMALY);
      expect(analysis!.falsePositiveRate).toBe(1);
      expect(analysis!.recommendedThresholdAdjustment).toBeGreaterThan(0); // Should increase threshold
    });

    it('should update running averages for multiple feedback entries', async () => {
      // First feedback - not relevant
      const feedback1: AlertFeedback = {
        alertId: 'alert1',
        userId: 'user1',
        relevance: 'not_relevant',
        actionTaken: false,
        timestamp: new Date()
      };

      await fatigueService.recordAlertFeedback(feedback1);

      // Second feedback - very relevant
      const feedback2: AlertFeedback = {
        alertId: 'alert2',
        userId: 'user1',
        relevance: 'very_relevant',
        actionTaken: true,
        timestamp: new Date()
      };

      await fatigueService.recordAlertFeedback(feedback2);

      const analysis = await fatigueService.getFeedbackAnalysis('user1', AlertType.PRODUCTIVITY_ANOMALY);
      expect(analysis!.relevanceScore).toBe(0.5); // Average of 0 and 1
      expect(analysis!.actionTakenRate).toBe(0.5); // Average of 0 and 1
      expect(analysis!.falsePositiveRate).toBe(0.5); // Average of 1 and 0
    });
  });

  describe('maintenance window management', () => {
    it('should create maintenance window', async () => {
      const windowData = {
        name: 'Weekly Maintenance',
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
        recurring: true,
        recurrencePattern: {
          type: 'weekly' as const,
          interval: 1,
          daysOfWeek: [0] // Sunday
        },
        affectedRules: ['rule1', 'rule2'],
        createdBy: 'admin'
      };

      let windowCreated = false;
      fatigueService.on('maintenanceWindowCreated', () => {
        windowCreated = true;
      });

      const window = await fatigueService.createMaintenanceWindow(windowData);

      expect(window.id).toBeDefined();
      expect(window.name).toBe(windowData.name);
      expect(windowCreated).toBe(true);
    });

    it('should update maintenance window', async () => {
      const window: MaintenanceWindow = {
        id: 'window1',
        name: 'Original Window',
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        recurring: false,
        affectedRules: ['rule1'],
        createdBy: 'admin'
      };

      await mockRepository.saveMaintenanceWindow(window);

      const updates = {
        name: 'Updated Window',
        affectedRules: ['rule1', 'rule2']
      };

      const updatedWindow = await fatigueService.updateMaintenanceWindow('window1', updates);

      expect(updatedWindow).not.toBeNull();
      expect(updatedWindow!.name).toBe('Updated Window');
      expect(updatedWindow!.affectedRules).toEqual(['rule1', 'rule2']);
    });

    it('should delete maintenance window', async () => {
      const window: MaintenanceWindow = {
        id: 'window1',
        name: 'Test Window',
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        recurring: false,
        affectedRules: [],
        createdBy: 'admin'
      };

      await mockRepository.saveMaintenanceWindow(window);

      const deleted = await fatigueService.deleteMaintenanceWindow('window1');
      expect(deleted).toBe(true);

      const retrievedWindow = await mockRepository.getMaintenanceWindow('window1');
      expect(retrievedWindow).toBeNull();
    });

    it('should get active maintenance windows', async () => {
      const activeWindow: MaintenanceWindow = {
        id: 'active1',
        name: 'Active Window',
        startTime: new Date(Date.now() - 30 * 60 * 1000),
        endTime: new Date(Date.now() + 30 * 60 * 1000),
        recurring: false,
        affectedRules: [],
        createdBy: 'admin'
      };

      const inactiveWindow: MaintenanceWindow = {
        id: 'inactive1',
        name: 'Inactive Window',
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 60 * 60 * 1000),
        recurring: false,
        affectedRules: [],
        createdBy: 'admin'
      };

      await mockRepository.saveMaintenanceWindow(activeWindow);
      await mockRepository.saveMaintenanceWindow(inactiveWindow);

      const activeWindows = await fatigueService.getActiveMaintenanceWindows();
      expect(activeWindows).toHaveLength(1);
      expect(activeWindows[0].id).toBe('active1');
    });
  });

  describe('fatigue metrics calculation', () => {
    it('should calculate fatigue score correctly', async () => {
      const metrics: FatigueMetrics = {
        userId: 'user1',
        alertCount: 3,
        timeWindow: 60,
        fatigueScore: 0,
        lastAlertTime: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        suppressionActive: false,
        adaptiveThreshold: 5
      };

      await mockRepository.saveFatigueMetrics(metrics);

      const fatigueScore = await fatigueService.calculateFatigueScore('user1');
      expect(fatigueScore).toBeGreaterThan(0);
      expect(fatigueScore).toBeLessThan(1);
    });

    it('should return 0 fatigue score for non-existent user', async () => {
      const fatigueScore = await fatigueService.calculateFatigueScore('non-existent');
      expect(fatigueScore).toBe(0);
    });

    it('should get adaptive threshold', async () => {
      const analysis: FeedbackAnalysis = {
        userId: 'user1',
        alertType: AlertType.PRODUCTIVITY_ANOMALY,
        relevanceScore: 0.8,
        actionTakenRate: 0.9,
        falsePositiveRate: 0.1,
        recommendedThresholdAdjustment: -1 // Decrease threshold
      };

      await mockRepository.saveFeedbackAnalysis(analysis);

      const threshold = await fatigueService.getAdaptiveThreshold('user1', AlertType.PRODUCTIVITY_ANOMALY);
      expect(threshold).toBe(4); // 5 - 1 = 4
    });

    it('should return default threshold for new user', async () => {
      const threshold = await fatigueService.getAdaptiveThreshold('new-user', AlertType.PRODUCTIVITY_ANOMALY);
      expect(threshold).toBe(config.fatigueThreshold);
    });
  });

  describe('alert count tracking', () => {
    it('should track alert counts within time window', async () => {
      // Send multiple alerts
      for (let i = 0; i < 3; i++) {
        const alert = { ...testAlert, id: `alert${i}` };
        await fatigueService.shouldSuppressAlert(alert);
      }

      const metrics = await fatigueService.getFatigueMetrics('user1');
      expect(metrics).not.toBeNull();
      expect(metrics!.alertCount).toBe(3);
    });

    it('should reset alert count after time window expires', async () => {
      // Create old metrics
      const oldMetrics: FatigueMetrics = {
        userId: 'user1',
        alertCount: 5,
        timeWindow: 60,
        fatigueScore: 0,
        lastAlertTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        suppressionActive: false,
        adaptiveThreshold: 5
      };

      await mockRepository.saveFatigueMetrics(oldMetrics);

      // Send new alert
      await fatigueService.shouldSuppressAlert(testAlert);

      const metrics = await fatigueService.getFatigueMetrics('user1');
      expect(metrics!.alertCount).toBe(1); // Should reset to 1
    });
  });

  describe('event emission', () => {
    it('should emit maintenance window events', async () => {
      const events: string[] = [];

      fatigueService.on('maintenanceWindowCreated', () => events.push('created'));
      fatigueService.on('maintenanceWindowUpdated', () => events.push('updated'));
      fatigueService.on('maintenanceWindowDeleted', () => events.push('deleted'));

      const windowData = {
        name: 'Test Window',
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        recurring: false,
        affectedRules: [],
        createdBy: 'admin'
      };

      const window = await fatigueService.createMaintenanceWindow(windowData);
      await fatigueService.updateMaintenanceWindow(window.id, { name: 'Updated' });
      await fatigueService.deleteMaintenanceWindow(window.id);

      expect(events).toEqual(['created', 'updated', 'deleted']);
    });

    it('should emit feedback processed event', async () => {
      let feedbackProcessed = false;
      fatigueService.on('feedbackProcessed', () => {
        feedbackProcessed = true;
      });

      const feedback: AlertFeedback = {
        alertId: 'alert1',
        userId: 'user1',
        relevance: 'relevant',
        actionTaken: true,
        timestamp: new Date()
      };

      await fatigueService.recordAlertFeedback(feedback);
      expect(feedbackProcessed).toBe(true);
    });
  });
});