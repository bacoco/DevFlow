/**
 * Main personalization engine that orchestrates all personalization components
 * Provides a unified interface for personalization features
 */

import { BehaviorTracker } from './BehaviorTracker';
import { PreferenceManager } from './PreferenceManager';
import { LayoutRecommendationEngine } from './LayoutRecommendationEngine';
import { AdaptiveWidgetEngine } from './AdaptiveWidgetEngine';
import { SmartDefaultsEngine } from './SmartDefaultsEngine';
import {
  UserPreferences,
  UserInteractionEvent,
  LayoutConfiguration,
  WidgetSuggestion,
  PersonalizationInsights,
  SmartDefault,
  UserRole,
  DeviceType,
  InteractionType,
  InteractionContext
} from './types';

export interface PersonalizationConfig {
  userId: string;
  deviceId?: string;
  enableTracking?: boolean;
  enableLearning?: boolean;
  syncInterval?: number;
}

export interface PersonalizationState {
  isInitialized: boolean;
  trackingEnabled: boolean;
  learningEnabled: boolean;
  lastSyncTime?: Date;
  insights?: PersonalizationInsights;
}

export class PersonalizationEngine {
  private behaviorTracker: BehaviorTracker;
  private preferenceManager: PreferenceManager;
  private layoutEngine: LayoutRecommendationEngine;
  private widgetEngine: AdaptiveWidgetEngine;
  private smartDefaults: SmartDefaultsEngine;
  
  private userId: string;
  private deviceId: string;
  private state: PersonalizationState;
  private updateListeners: Array<(state: PersonalizationState) => void> = [];

  constructor(config: PersonalizationConfig) {
    this.userId = config.userId;
    this.deviceId = config.deviceId || this.generateDeviceId();
    
    // Initialize state
    this.state = {
      isInitialized: false,
      trackingEnabled: config.enableTracking ?? true,
      learningEnabled: config.enableLearning ?? true
    };

    // Initialize components
    this.preferenceManager = new PreferenceManager(this.userId, this.deviceId);
    this.layoutEngine = new LayoutRecommendationEngine();
    this.widgetEngine = new AdaptiveWidgetEngine();
    this.smartDefaults = new SmartDefaultsEngine();

    // Initialize behavior tracker with privacy preferences
    const preferences = this.preferenceManager.getPreferences();
    this.behaviorTracker = new BehaviorTracker(this.userId, preferences.privacy);

    this.initialize();
  }

  /**
   * Initialize the personalization engine
   */
  private async initialize(): Promise<void> {
    try {
      // Sync preferences
      await this.preferenceManager.syncPreferences();
      
      // Generate initial insights
      await this.generateInsights();
      
      // Set up preference change listener
      this.preferenceManager.addChangeListener((preferences) => {
        this.behaviorTracker.updatePrivacyPreferences(preferences.privacy);
        this.notifyStateChange();
      });

      this.state.isInitialized = true;
      this.state.lastSyncTime = new Date();
      this.notifyStateChange();
    } catch (error) {
      console.error('Failed to initialize personalization engine:', error);
    }
  }

  /**
   * Track a user interaction
   */
  trackInteraction(
    type: InteractionType,
    element: string,
    context?: Partial<InteractionContext>,
    metadata?: Record<string, any>,
    duration?: number
  ): void {
    if (!this.state.trackingEnabled) return;

    this.behaviorTracker.trackInteraction(type, element, context, metadata, duration);
    
    // Update widget usage patterns if it's a widget interaction
    if (type === 'widget_interaction' && metadata?.satisfaction !== undefined) {
      const event: UserInteractionEvent = {
        id: `event_${Date.now()}`,
        userId: this.userId,
        sessionId: 'current',
        type,
        element,
        timestamp: new Date(),
        duration,
        context: this.behaviorTracker['enrichContext'](context || {}),
        metadata: metadata || {}
      };
      
      this.widgetEngine.updateUsagePattern(
        element,
        this.userId,
        event,
        metadata.satisfaction
      );
    }
  }

  /**
   * Get user preferences
   */
  getPreferences(): UserPreferences {
    return this.preferenceManager.getPreferences();
  }

  /**
   * Update user preferences
   */
  async updatePreferences(updates: Partial<UserPreferences>): Promise<void> {
    // Track preference changes
    Object.entries(updates).forEach(([key, value]) => {
      this.trackInteraction('preference_change', key, {}, { newValue: value });
    });

    // Update preferences
    if (updates.theme) {
      await this.preferenceManager.updateThemePreference(updates.theme);
    }
    if (updates.layout) {
      await this.preferenceManager.updateLayoutPreference(updates.layout);
    }
    if (updates.widgets) {
      await this.preferenceManager.updateWidgetPreferences(updates.widgets);
    }
    if (updates.accessibility) {
      await this.preferenceManager.updateAccessibilityPreferences(updates.accessibility);
    }
    if (updates.privacy) {
      await this.preferenceManager.updatePrivacyPreferences(updates.privacy);
    }

    // Regenerate insights after preference changes
    await this.generateInsights();
  }

  /**
   * Get layout recommendations
   */
  async getLayoutRecommendations(
    context: {
      userRole: UserRole;
      deviceType: DeviceType;
      timeOfDay?: number;
      dayOfWeek?: number;
      sessionDuration?: number;
    },
    currentLayout?: LayoutConfiguration
  ): Promise<Array<{ layoutId: string; score: number; confidence: number; reasons: string[] }>> {
    const recentEvents = this.behaviorTracker.getRecentEvents(100);
    
    const recommendationContext = {
      userRole: context.userRole,
      deviceType: context.deviceType,
      timeOfDay: context.timeOfDay || new Date().getHours(),
      dayOfWeek: context.dayOfWeek || new Date().getDay(),
      sessionDuration: context.sessionDuration || 0,
      recentInteractions: recentEvents
    };

    return this.layoutEngine.getLayoutRecommendations(
      this.userId,
      recentEvents,
      recommendationContext,
      currentLayout
    );
  }

  /**
   * Get widget suggestions
   */
  async getWidgetSuggestions(
    context: {
      userRole: UserRole;
      deviceType: DeviceType;
      currentWidgets: string[];
      availableSpace: { width: number; height: number };
      timeOfDay?: number;
    }
  ): Promise<WidgetSuggestion[]> {
    const recentEvents = this.behaviorTracker.getRecentEvents(50);
    
    const suggestionContext = {
      userRole: context.userRole,
      deviceType: context.deviceType,
      currentWidgets: context.currentWidgets,
      availableSpace: context.availableSpace,
      timeOfDay: context.timeOfDay || new Date().getHours(),
      recentActivity: recentEvents
    };

    return this.widgetEngine.getSuggestions(
      this.userId,
      suggestionContext,
      this.state.insights
    );
  }

  /**
   * Get smart default value
   */
  getSmartDefault(key: string, fallbackValue?: any): SmartDefault {
    const preferences = this.preferenceManager.getPreferences();
    const context = {
      userId: this.userId,
      userRole: 'developer' as UserRole, // Would be determined from user data
      deviceType: this.detectDeviceType(),
      currentTime: new Date(),
      sessionContext: {
        sessionDuration: 0,
        interactionCount: this.behaviorTracker.getRecentEvents().length,
        errorCount: 0,
        completedTasks: 0,
        preferenceChanges: 0
      }
    };

    return this.smartDefaults.getSmartDefault(key, context, fallbackValue);
  }

  /**
   * Get all smart defaults for current context
   */
  getAllSmartDefaults(): Record<string, SmartDefault> {
    const context = {
      userId: this.userId,
      userRole: 'developer' as UserRole,
      deviceType: this.detectDeviceType(),
      currentTime: new Date(),
      sessionContext: {
        sessionDuration: 0,
        interactionCount: this.behaviorTracker.getRecentEvents().length,
        errorCount: 0,
        completedTasks: 0,
        preferenceChanges: 0
      }
    };

    return this.smartDefaults.getAllSmartDefaults(context);
  }

  /**
   * Get personalization insights
   */
  getInsights(): PersonalizationInsights | null {
    return this.state.insights || null;
  }

  /**
   * Generate fresh insights from current data
   */
  async generateInsights(): Promise<PersonalizationInsights> {
    const recentEvents = this.behaviorTracker.getRecentEvents(500);
    const insights = this.layoutEngine.analyzeUserBehavior(recentEvents);
    
    // Ensure userId is set correctly
    insights.userId = this.userId;
    
    this.state.insights = insights;
    this.notifyStateChange();
    
    return insights;
  }

  /**
   * Get session summary
   */
  getSessionSummary(): {
    sessionId: string;
    startTime: Date;
    duration: number;
    eventCount: number;
    uniqueElements: number;
    mostInteractedElements: Array<{ element: string; count: number }>;
  } {
    return this.behaviorTracker.getSessionSummary();
  }

  /**
   * Get learning insights
   */
  getLearningInsights(): {
    learnedPatterns: number;
    confidenceScore: number;
    topRecommendations: Array<{ key: string; value: any; reason: string }>;
    adaptationRate: number;
  } {
    return this.smartDefaults.getLearningInsights(this.userId);
  }

  /**
   * Train the recommendation models with feedback
   */
  async trainWithFeedback(
    layoutChoices: Array<{ layout: LayoutConfiguration; satisfaction: number }>,
    context: {
      userRole: UserRole;
      deviceType: DeviceType;
      sessionDuration: number;
    }
  ): Promise<void> {
    const recentEvents = this.behaviorTracker.getRecentEvents(100);
    
    const trainingContext = {
      userRole: context.userRole,
      deviceType: context.deviceType,
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      sessionDuration: context.sessionDuration,
      recentInteractions: recentEvents
    };

    await this.layoutEngine.trainModel(recentEvents, layoutChoices, trainingContext);
  }

  /**
   * Export personalization data
   */
  exportData(): {
    preferences: string;
    learningData: string;
    insights: PersonalizationInsights | null;
  } {
    return {
      preferences: this.preferenceManager.exportPreferences(),
      learningData: this.smartDefaults.exportLearningData(),
      insights: this.state.insights
    };
  }

  /**
   * Import personalization data
   */
  async importData(data: {
    preferences?: string;
    learningData?: string;
  }): Promise<void> {
    if (data.preferences) {
      await this.preferenceManager.importPreferences(data.preferences);
    }
    
    if (data.learningData) {
      this.smartDefaults.importLearningData(data.learningData);
    }

    await this.generateInsights();
  }

  /**
   * Reset all personalization data
   */
  async resetPersonalization(): Promise<void> {
    await this.preferenceManager.resetToDefaults();
    this.behaviorTracker.clearData();
    this.smartDefaults.resetUserLearning(this.userId);
    
    this.state.insights = undefined;
    this.notifyStateChange();
  }

  /**
   * Get current personalization state
   */
  getState(): PersonalizationState {
    return { ...this.state };
  }

  /**
   * Add state change listener
   */
  addStateListener(listener: (state: PersonalizationState) => void): () => void {
    this.updateListeners.push(listener);
    
    return () => {
      const index = this.updateListeners.indexOf(listener);
      if (index > -1) {
        this.updateListeners.splice(index, 1);
      }
    };
  }

  /**
   * Enable or disable tracking
   */
  setTrackingEnabled(enabled: boolean): void {
    this.state.trackingEnabled = enabled;
    
    // Update privacy preferences
    const preferences = this.preferenceManager.getPreferences();
    this.preferenceManager.updatePrivacyPreferences({
      ...preferences.privacy,
      trackingEnabled: enabled
    });
    
    this.notifyStateChange();
  }

  /**
   * Enable or disable learning
   */
  setLearningEnabled(enabled: boolean): void {
    this.state.learningEnabled = enabled;
    this.smartDefaults.setLearningEnabled(enabled);
    this.notifyStateChange();
  }

  /**
   * Sync preferences across devices
   */
  async syncPreferences(): Promise<void> {
    const result = await this.preferenceManager.syncPreferences();
    this.state.lastSyncTime = result.lastSyncTime;
    this.notifyStateChange();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.behaviorTracker.destroy();
    this.preferenceManager.destroy();
    this.updateListeners = [];
  }

  private detectDeviceType(): DeviceType {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private generateDeviceId(): string {
    let deviceId = localStorage.getItem('personalization_device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('personalization_device_id', deviceId);
    }
    return deviceId;
  }

  private notifyStateChange(): void {
    this.updateListeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('State listener error:', error);
      }
    });
  }
}