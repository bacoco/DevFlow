import { 
  Alert, 
  AlertFeedback, 
  AlertRule, 
  AlertSeverity, 
  AlertType,
  AlertStatus 
} from '../types/alert-types';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface AlertFatigueConfig {
  fatigueThreshold: number; // Number of alerts in time window to trigger fatigue
  timeWindowMinutes: number; // Time window for fatigue detection
  adaptiveThresholdEnabled: boolean;
  feedbackWeightingEnabled: boolean;
  maintenanceWindowEnabled: boolean;
  learningRateDecay: number; // For ML-based threshold adjustment
}

export interface FatigueMetrics {
  userId: string;
  alertCount: number;
  timeWindow: number;
  fatigueScore: number;
  lastAlertTime: Date;
  suppressionActive: boolean;
  adaptiveThreshold: number;
}

export interface MaintenanceWindow {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  recurring: boolean;
  recurrencePattern?: RecurrencePattern;
  affectedRules: string[];
  createdBy: string;
}

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly';
  interval: number; // Every N days/weeks/months
  daysOfWeek?: number[]; // For weekly (0=Sunday, 6=Saturday)
  dayOfMonth?: number; // For monthly
}

export interface FeedbackAnalysis {
  userId: string;
  alertType: AlertType;
  relevanceScore: number; // 0-1 based on feedback
  actionTakenRate: number; // Percentage of alerts where action was taken
  falsePositiveRate: number;
  recommendedThresholdAdjustment: number;
}

export interface AlertFatigueRepository {
  saveFatigueMetrics(metrics: FatigueMetrics): Promise<void>;
  getFatigueMetrics(userId: string): Promise<FatigueMetrics | null>;
  updateFatigueMetrics(userId: string, updates: Partial<FatigueMetrics>): Promise<void>;
  
  saveMaintenanceWindow(window: MaintenanceWindow): Promise<void>;
  getActiveMaintenanceWindows(): Promise<MaintenanceWindow[]>;
  getMaintenanceWindow(windowId: string): Promise<MaintenanceWindow | null>;
  updateMaintenanceWindow(windowId: string, updates: Partial<MaintenanceWindow>): Promise<void>;
  deleteMaintenanceWindow(windowId: string): Promise<void>;
  
  saveFeedbackAnalysis(analysis: FeedbackAnalysis): Promise<void>;
  getFeedbackAnalysis(userId: string, alertType: AlertType): Promise<FeedbackAnalysis | null>;
  updateFeedbackAnalysis(userId: string, alertType: AlertType, updates: Partial<FeedbackAnalysis>): Promise<void>;
}

export class AlertFatigueService extends EventEmitter {
  private readonly config: AlertFatigueConfig;
  private readonly repository: AlertFatigueRepository;
  private readonly userAlertCounts = new Map<string, number>();
  private readonly adaptiveThresholds = new Map<string, number>();
  private maintenanceWindowTimer?: NodeJS.Timeout;

  constructor(config: AlertFatigueConfig, repository: AlertFatigueRepository) {
    super();
    this.config = config;
    this.repository = repository;
    this.startMaintenanceWindowMonitoring();
  }

  async shouldSuppressAlert(alert: Alert): Promise<boolean> {
    const userId = alert.context.userId;
    if (!userId) {
      return false;
    }

    // Check maintenance windows
    if (await this.isInMaintenanceWindow(alert)) {
      this.emit('alertSuppressed', alert, 'maintenance_window');
      return true;
    }

    // Check alert fatigue
    if (await this.isUserFatigued(userId)) {
      this.emit('alertSuppressed', alert, 'user_fatigue');
      return true;
    }

    // Update user alert count
    await this.updateUserAlertCount(userId, alert);

    return false;
  }

  async recordAlertFeedback(feedback: AlertFeedback): Promise<void> {
    // Update feedback analysis
    await this.updateFeedbackAnalysis(feedback);

    // Adjust adaptive thresholds if enabled
    if (this.config.adaptiveThresholdEnabled) {
      await this.adjustAdaptiveThresholds(feedback);
    }

    this.emit('feedbackProcessed', feedback);
  }

  async createMaintenanceWindow(window: Omit<MaintenanceWindow, 'id'>): Promise<MaintenanceWindow> {
    const newWindow: MaintenanceWindow = {
      ...window,
      id: uuidv4()
    };

    await this.repository.saveMaintenanceWindow(newWindow);
    this.emit('maintenanceWindowCreated', newWindow);
    
    return newWindow;
  }

  async updateMaintenanceWindow(windowId: string, updates: Partial<MaintenanceWindow>): Promise<MaintenanceWindow | null> {
    const existingWindow = await this.repository.getMaintenanceWindow(windowId);
    if (!existingWindow) {
      return null;
    }

    await this.repository.updateMaintenanceWindow(windowId, updates);
    const updatedWindow = { ...existingWindow, ...updates };
    
    this.emit('maintenanceWindowUpdated', updatedWindow);
    return updatedWindow;
  }

  async deleteMaintenanceWindow(windowId: string): Promise<boolean> {
    const window = await this.repository.getMaintenanceWindow(windowId);
    if (!window) {
      return false;
    }

    await this.repository.deleteMaintenanceWindow(windowId);
    this.emit('maintenanceWindowDeleted', window);
    
    return true;
  }

  async getActiveMaintenanceWindows(): Promise<MaintenanceWindow[]> {
    return this.repository.getActiveMaintenanceWindows();
  }

  async getFatigueMetrics(userId: string): Promise<FatigueMetrics | null> {
    return this.repository.getFatigueMetrics(userId);
  }

  async getFeedbackAnalysis(userId: string, alertType: AlertType): Promise<FeedbackAnalysis | null> {
    return this.repository.getFeedbackAnalysis(userId, alertType);
  }

  async calculateFatigueScore(userId: string): Promise<number> {
    const metrics = await this.repository.getFatigueMetrics(userId);
    if (!metrics) {
      return 0;
    }

    const timeWindow = this.config.timeWindowMinutes * 60 * 1000; // Convert to milliseconds
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindow);

    // Simple fatigue score calculation
    const timeSinceLastAlert = now.getTime() - metrics.lastAlertTime.getTime();
    const timeDecay = Math.max(0, 1 - (timeSinceLastAlert / timeWindow));
    
    const alertDensity = metrics.alertCount / this.config.fatigueThreshold;
    const fatigueScore = alertDensity * timeDecay;

    return Math.min(1, fatigueScore);
  }

  async getAdaptiveThreshold(userId: string, alertType: AlertType): Promise<number> {
    const cacheKey = `${userId}:${alertType}`;
    
    if (this.adaptiveThresholds.has(cacheKey)) {
      return this.adaptiveThresholds.get(cacheKey)!;
    }

    const analysis = await this.repository.getFeedbackAnalysis(userId, alertType);
    if (!analysis) {
      return this.config.fatigueThreshold; // Default threshold
    }

    // Calculate adaptive threshold based on feedback
    const baseThreshold = this.config.fatigueThreshold;
    const adjustment = analysis.recommendedThresholdAdjustment;
    const adaptiveThreshold = Math.max(1, baseThreshold + adjustment);

    this.adaptiveThresholds.set(cacheKey, adaptiveThreshold);
    return adaptiveThreshold;
  }

  private async isUserFatigued(userId: string): Promise<boolean> {
    const metrics = await this.repository.getFatigueMetrics(userId);
    if (!metrics) {
      return false;
    }

    const fatigueScore = await this.calculateFatigueScore(userId);
    const threshold = this.config.adaptiveThresholdEnabled 
      ? metrics.adaptiveThreshold 
      : this.config.fatigueThreshold;

    return fatigueScore >= (threshold / this.config.fatigueThreshold);
  }

  private async updateUserAlertCount(userId: string, alert: Alert): Promise<void> {
    const now = new Date();
    const timeWindow = this.config.timeWindowMinutes * 60 * 1000;
    const windowStart = new Date(now.getTime() - timeWindow);

    let metrics = await this.repository.getFatigueMetrics(userId);
    
    if (!metrics) {
      metrics = {
        userId,
        alertCount: 1,
        timeWindow: this.config.timeWindowMinutes,
        fatigueScore: 0,
        lastAlertTime: now,
        suppressionActive: false,
        adaptiveThreshold: this.config.fatigueThreshold
      };
    } else {
      // Reset count if outside time window
      if (metrics.lastAlertTime < windowStart) {
        metrics.alertCount = 1;
      } else {
        metrics.alertCount += 1;
      }
      metrics.lastAlertTime = now;
    }

    metrics.fatigueScore = await this.calculateFatigueScore(userId);
    
    // Update adaptive threshold if enabled
    if (this.config.adaptiveThresholdEnabled) {
      metrics.adaptiveThreshold = await this.getAdaptiveThreshold(userId, alert.type);
    }

    await this.repository.saveFatigueMetrics(metrics);
  }

  private async isInMaintenanceWindow(alert: Alert): Promise<boolean> {
    if (!this.config.maintenanceWindowEnabled) {
      return false;
    }

    const activeWindows = await this.repository.getActiveMaintenanceWindows();
    const now = new Date();

    for (const window of activeWindows) {
      if (this.isTimeInWindow(now, window) && this.isRuleAffected(alert.ruleId, window)) {
        return true;
      }
    }

    return false;
  }

  private isTimeInWindow(time: Date, window: MaintenanceWindow): boolean {
    if (!window.recurring) {
      return time >= window.startTime && time <= window.endTime;
    }

    // Handle recurring windows
    switch (window.recurrencePattern?.type) {
      case 'daily':
        return this.isTimeInDailyWindow(time, window);
      case 'weekly':
        return this.isTimeInWeeklyWindow(time, window);
      case 'monthly':
        return this.isTimeInMonthlyWindow(time, window);
      default:
        return false;
    }
  }

  private isTimeInDailyWindow(time: Date, window: MaintenanceWindow): boolean {
    const startHour = window.startTime.getHours();
    const startMinute = window.startTime.getMinutes();
    const endHour = window.endTime.getHours();
    const endMinute = window.endTime.getMinutes();

    const currentHour = time.getHours();
    const currentMinute = time.getMinutes();

    const currentTime = currentHour * 60 + currentMinute;
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (endTime > startTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Crosses midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private isTimeInWeeklyWindow(time: Date, window: MaintenanceWindow): boolean {
    const dayOfWeek = time.getDay();
    const daysOfWeek = window.recurrencePattern?.daysOfWeek || [];
    
    if (!daysOfWeek.includes(dayOfWeek)) {
      return false;
    }

    return this.isTimeInDailyWindow(time, window);
  }

  private isTimeInMonthlyWindow(time: Date, window: MaintenanceWindow): boolean {
    const dayOfMonth = time.getDate();
    const targetDay = window.recurrencePattern?.dayOfMonth;
    
    if (targetDay && dayOfMonth !== targetDay) {
      return false;
    }

    return this.isTimeInDailyWindow(time, window);
  }

  private isRuleAffected(ruleId: string, window: MaintenanceWindow): boolean {
    return window.affectedRules.length === 0 || window.affectedRules.includes(ruleId);
  }

  private async updateFeedbackAnalysis(feedback: AlertFeedback): Promise<void> {
    // Get the alert to determine type and user
    const userId = feedback.userId;
    
    // For this implementation, we'll assume we can get alert type from feedback
    // In a real implementation, you'd fetch the alert details
    const alertType = AlertType.PRODUCTIVITY_ANOMALY; // Placeholder
    
    let analysis = await this.repository.getFeedbackAnalysis(userId, alertType);
    
    if (!analysis) {
      analysis = {
        userId,
        alertType,
        relevanceScore: this.calculateRelevanceScore(feedback.relevance),
        actionTakenRate: feedback.actionTaken ? 1 : 0,
        falsePositiveRate: feedback.relevance === 'not_relevant' ? 1 : 0,
        recommendedThresholdAdjustment: 0
      };
    } else {
      // Update running averages (simplified approach)
      const newRelevanceScore = this.calculateRelevanceScore(feedback.relevance);
      analysis.relevanceScore = (analysis.relevanceScore + newRelevanceScore) / 2;
      
      const actionTaken = feedback.actionTaken ? 1 : 0;
      analysis.actionTakenRate = (analysis.actionTakenRate + actionTaken) / 2;
      
      const falsePositive = feedback.relevance === 'not_relevant' ? 1 : 0;
      analysis.falsePositiveRate = (analysis.falsePositiveRate + falsePositive) / 2;
    }

    // Calculate threshold adjustment based on feedback
    analysis.recommendedThresholdAdjustment = this.calculateThresholdAdjustment(analysis);

    await this.repository.saveFeedbackAnalysis(analysis);
  }

  private calculateRelevanceScore(relevance: string): number {
    switch (relevance) {
      case 'very_relevant': return 1.0;
      case 'relevant': return 0.75;
      case 'somewhat_relevant': return 0.5;
      case 'not_relevant': return 0.0;
      default: return 0.5;
    }
  }

  private calculateThresholdAdjustment(analysis: FeedbackAnalysis): number {
    // If false positive rate is high, increase threshold (reduce sensitivity)
    // If relevance is high and action taken rate is high, decrease threshold (increase sensitivity)
    
    const falsePositivePenalty = analysis.falsePositiveRate * 2; // Increase threshold
    const relevanceBonus = analysis.relevanceScore * analysis.actionTakenRate * -1; // Decrease threshold
    
    return Math.max(-5, Math.min(5, falsePositivePenalty + relevanceBonus));
  }

  private async adjustAdaptiveThresholds(feedback: AlertFeedback): Promise<void> {
    const userId = feedback.userId;
    const alertType = AlertType.PRODUCTIVITY_ANOMALY; // Placeholder
    const cacheKey = `${userId}:${alertType}`;
    
    const analysis = await this.repository.getFeedbackAnalysis(userId, alertType);
    if (!analysis) {
      return;
    }

    const newThreshold = this.config.fatigueThreshold + analysis.recommendedThresholdAdjustment;
    this.adaptiveThresholds.set(cacheKey, Math.max(1, newThreshold));
    
    // Update stored metrics
    const metrics = await this.repository.getFatigueMetrics(userId);
    if (metrics) {
      await this.repository.updateFatigueMetrics(userId, {
        adaptiveThreshold: newThreshold
      });
    }
  }

  private startMaintenanceWindowMonitoring(): void {
    // Check for maintenance window changes every minute
    this.maintenanceWindowTimer = setInterval(async () => {
      try {
        const activeWindows = await this.repository.getActiveMaintenanceWindows();
        this.emit('maintenanceWindowsUpdated', activeWindows);
      } catch (error) {
        console.error('Error monitoring maintenance windows:', error);
      }
    }, 60 * 1000); // 1 minute
  }

  destroy(): void {
    if (this.maintenanceWindowTimer) {
      clearInterval(this.maintenanceWindowTimer);
    }
    this.removeAllListeners();
  }
}