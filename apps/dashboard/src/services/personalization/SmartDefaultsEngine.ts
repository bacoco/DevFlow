/**
 * Smart defaults system that learns from user behavior
 * Provides intelligent default values based on user patterns and context
 */

import { 
  SmartDefault, 
  DefaultContext, 
  UserRole, 
  DeviceType, 
  UserInteractionEvent,
  UserPreferences
} from './types';

export interface DefaultRule {
  id: string;
  key: string;
  condition: DefaultCondition;
  value: any;
  confidence: number;
  source: 'user_behavior' | 'role_based' | 'team_pattern' | 'global_pattern';
  priority: number;
  createdAt: Date;
  lastUsed: Date;
  usageCount: number;
}

export interface DefaultCondition {
  userRole?: UserRole[];
  deviceType?: DeviceType[];
  timeOfDay?: { start: number; end: number };
  dayOfWeek?: number[];
  teamSize?: { min: number; max: number };
  experienceLevel?: ('beginner' | 'intermediate' | 'advanced')[];
  customConditions?: Record<string, any>;
}

export interface LearningContext {
  userId: string;
  userRole: UserRole;
  deviceType: DeviceType;
  teamSize?: number;
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  industry?: string;
  currentTime: Date;
  sessionContext: SessionContext;
}

export interface SessionContext {
  sessionDuration: number;
  interactionCount: number;
  errorCount: number;
  completedTasks: number;
  preferenceChanges: number;
}

export class SmartDefaultsEngine {
  private rules: Map<string, DefaultRule[]> = new Map();
  private userPatterns: Map<string, UserPattern> = new Map();
  private globalPatterns: Map<string, GlobalPattern> = new Map();
  private learningEnabled = true;

  constructor() {
    this.initializeBaseRules();
  }

  /**
   * Get smart default value for a given key and context
   */
  getSmartDefault(
    key: string,
    context: LearningContext,
    fallbackValue?: any
  ): SmartDefault {
    const applicableRules = this.getApplicableRules(key, context);
    
    if (applicableRules.length === 0) {
      return {
        key,
        value: fallbackValue,
        context: this.createDefaultContext(context),
        confidence: 0.1,
        source: 'global_pattern'
      };
    }

    // Select best rule based on confidence and priority
    const bestRule = this.selectBestRule(applicableRules, context);
    
    return {
      key,
      value: bestRule.value,
      context: this.createDefaultContext(context),
      confidence: bestRule.confidence,
      source: bestRule.source
    };
  }

  /**
   * Learn from user behavior and update defaults
   */
  learnFromBehavior(
    userId: string,
    interactions: UserInteractionEvent[],
    preferences: UserPreferences,
    context: LearningContext
  ): void {
    if (!this.learningEnabled) return;

    // Analyze preference changes
    this.analyzePreferencePatterns(userId, preferences, context);

    // Analyze interaction patterns
    this.analyzeInteractionPatterns(userId, interactions, context);

    // Update user patterns
    this.updateUserPatterns(userId, context);

    // Update global patterns
    this.updateGlobalPatterns(context);
  }

  /**
   * Get all smart defaults for a user context
   */
  getAllSmartDefaults(context: LearningContext): Record<string, SmartDefault> {
    const defaults: Record<string, SmartDefault> = {};
    const allKeys = this.getAllDefaultKeys();

    allKeys.forEach(key => {
      defaults[key] = this.getSmartDefault(key, context);
    });

    return defaults;
  }

  /**
   * Add a custom default rule
   */
  addCustomRule(rule: Omit<DefaultRule, 'id' | 'createdAt' | 'lastUsed' | 'usageCount'>): void {
    const fullRule: DefaultRule = {
      ...rule,
      id: this.generateRuleId(),
      createdAt: new Date(),
      lastUsed: new Date(),
      usageCount: 0
    };

    const keyRules = this.rules.get(rule.key) || [];
    keyRules.push(fullRule);
    this.rules.set(rule.key, keyRules);
  }

  /**
   * Get learning insights for a user
   */
  getLearningInsights(userId: string): {
    learnedPatterns: number;
    confidenceScore: number;
    topRecommendations: Array<{ key: string; value: any; reason: string }>;
    adaptationRate: number;
  } {
    const userPattern = this.userPatterns.get(userId);
    
    if (!userPattern) {
      return {
        learnedPatterns: 0,
        confidenceScore: 0.1,
        topRecommendations: [],
        adaptationRate: 0
      };
    }

    const learnedPatterns = Object.keys(userPattern.preferences).length;
    const confidenceScore = this.calculateUserConfidence(userPattern);
    const topRecommendations = this.getTopRecommendations(userPattern);
    const adaptationRate = this.calculateAdaptationRate(userPattern);

    return {
      learnedPatterns,
      confidenceScore,
      topRecommendations,
      adaptationRate
    };
  }

  /**
   * Reset learning data for a user
   */
  resetUserLearning(userId: string): void {
    this.userPatterns.delete(userId);
  }

  /**
   * Export learned patterns for backup
   */
  exportLearningData(): string {
    return JSON.stringify({
      userPatterns: Array.from(this.userPatterns.entries()),
      globalPatterns: Array.from(this.globalPatterns.entries()),
      rules: Array.from(this.rules.entries())
    });
  }

  /**
   * Import learned patterns from backup
   */
  importLearningData(data: string): void {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.userPatterns) {
        this.userPatterns = new Map(parsed.userPatterns);
      }
      
      if (parsed.globalPatterns) {
        this.globalPatterns = new Map(parsed.globalPatterns);
      }
      
      if (parsed.rules) {
        this.rules = new Map(parsed.rules);
      }
    } catch (error) {
      console.error('Failed to import learning data:', error);
    }
  }

  /**
   * Enable or disable learning
   */
  setLearningEnabled(enabled: boolean): void {
    this.learningEnabled = enabled;
  }

  private getApplicableRules(key: string, context: LearningContext): DefaultRule[] {
    const keyRules = this.rules.get(key) || [];
    
    return keyRules.filter(rule => this.ruleMatches(rule, context));
  }

  private ruleMatches(rule: DefaultRule, context: LearningContext): boolean {
    const condition = rule.condition;

    // Check user role
    if (condition.userRole && !condition.userRole.includes(context.userRole)) {
      return false;
    }

    // Check device type
    if (condition.deviceType && !condition.deviceType.includes(context.deviceType)) {
      return false;
    }

    // Check time of day
    if (condition.timeOfDay) {
      const hour = context.currentTime.getHours();
      if (hour < condition.timeOfDay.start || hour > condition.timeOfDay.end) {
        return false;
      }
    }

    // Check day of week
    if (condition.dayOfWeek) {
      const dayOfWeek = context.currentTime.getDay();
      if (!condition.dayOfWeek.includes(dayOfWeek)) {
        return false;
      }
    }

    // Check team size
    if (condition.teamSize && context.teamSize) {
      if (context.teamSize < condition.teamSize.min || context.teamSize > condition.teamSize.max) {
        return false;
      }
    }

    // Check experience level
    if (condition.experienceLevel && context.experienceLevel) {
      if (!condition.experienceLevel.includes(context.experienceLevel)) {
        return false;
      }
    }

    return true;
  }

  private selectBestRule(rules: DefaultRule[], context: LearningContext): DefaultRule {
    // Sort by priority and confidence
    const sortedRules = rules.sort((a, b) => {
      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });

    const bestRule = sortedRules[0];
    
    // Update usage statistics
    bestRule.lastUsed = new Date();
    bestRule.usageCount++;

    return bestRule;
  }

  private analyzePreferencePatterns(
    userId: string,
    preferences: UserPreferences,
    context: LearningContext
  ): void {
    const userPattern = this.getUserPattern(userId);

    // Analyze theme preferences
    this.analyzeThemePattern(userPattern, preferences.theme, context);

    // Analyze layout preferences
    this.analyzeLayoutPattern(userPattern, preferences.layout, context);

    // Analyze widget preferences
    this.analyzeWidgetPattern(userPattern, preferences.widgets, context);

    // Analyze accessibility preferences
    this.analyzeAccessibilityPattern(userPattern, preferences.accessibility, context);

    userPattern.lastUpdated = new Date();
    this.userPatterns.set(userId, userPattern);
  }

  private analyzeInteractionPatterns(
    userId: string,
    interactions: UserInteractionEvent[],
    context: LearningContext
  ): void {
    const userPattern = this.getUserPattern(userId);

    // Analyze time-based patterns
    interactions.forEach(interaction => {
      const hour = interaction.timestamp.getHours();
      userPattern.timePreferences[hour]++;
    });

    // Analyze feature usage patterns
    const featureUsage = this.extractFeatureUsage(interactions);
    Object.entries(featureUsage).forEach(([feature, count]) => {
      userPattern.featurePreferences[feature] = 
        (userPattern.featurePreferences[feature] || 0) + count;
    });

    // Analyze device usage patterns
    interactions.forEach(interaction => {
      userPattern.devicePreferences[interaction.context.deviceType]++;
    });
  }

  private analyzeThemePattern(
    userPattern: UserPattern,
    theme: UserPreferences['theme'],
    context: LearningContext
  ): void {
    const key = 'theme.mode';
    const currentHour = context.currentTime.getHours();

    // Learn time-based theme preferences
    if (theme.mode === 'dark' && (currentHour < 8 || currentHour > 18)) {
      this.updatePatternConfidence(userPattern, key, 'dark', 0.1);
    } else if (theme.mode === 'light' && currentHour >= 8 && currentHour <= 18) {
      this.updatePatternConfidence(userPattern, key, 'light', 0.1);
    }

    // Learn density preferences by role
    const densityKey = 'theme.density';
    if (context.userRole === 'developer' && theme.density === 'compact') {
      this.updatePatternConfidence(userPattern, densityKey, 'compact', 0.05);
    }
  }

  private analyzeLayoutPattern(
    userPattern: UserPattern,
    layout: UserPreferences['layout'],
    context: LearningContext
  ): void {
    // Learn column count preferences by device
    const columnKey = 'layout.columnCount';
    if (context.deviceType === 'desktop' && layout.columnCount >= 3) {
      this.updatePatternConfidence(userPattern, columnKey, layout.columnCount, 0.05);
    } else if (context.deviceType === 'mobile' && layout.columnCount <= 2) {
      this.updatePatternConfidence(userPattern, columnKey, layout.columnCount, 0.05);
    }

    // Learn sidebar preferences
    const sidebarKey = 'layout.showSidebar';
    this.updatePatternConfidence(userPattern, sidebarKey, layout.showSidebar, 0.02);
  }

  private analyzeWidgetPattern(
    userPattern: UserPattern,
    widgets: UserPreferences['widgets'],
    context: LearningContext
  ): void {
    // Learn widget count preferences
    const countKey = 'widgets.count';
    this.updatePatternConfidence(userPattern, countKey, widgets.length, 0.02);

    // Learn widget size preferences by role
    const avgSize = widgets.reduce((sum, w) => sum + w.size.width * w.size.height, 0) / widgets.length;
    const sizeKey = 'widgets.averageSize';
    this.updatePatternConfidence(userPattern, sizeKey, Math.round(avgSize), 0.02);
  }

  private analyzeAccessibilityPattern(
    userPattern: UserPattern,
    accessibility: UserPreferences['accessibility'],
    context: LearningContext
  ): void {
    // Learn accessibility preferences
    Object.entries(accessibility).forEach(([key, value]) => {
      const fullKey = `accessibility.${key}`;
      this.updatePatternConfidence(userPattern, fullKey, value, 0.01);
    });
  }

  private updatePatternConfidence(
    userPattern: UserPattern,
    key: string,
    value: any,
    increment: number
  ): void {
    if (!userPattern.preferences[key]) {
      userPattern.preferences[key] = { value, confidence: 0 };
    }

    if (userPattern.preferences[key].value === value) {
      userPattern.preferences[key].confidence = Math.min(1, 
        userPattern.preferences[key].confidence + increment
      );
    } else {
      // Different value, reduce confidence slightly
      userPattern.preferences[key].confidence = Math.max(0,
        userPattern.preferences[key].confidence - increment * 0.5
      );
    }
  }

  private getUserPattern(userId: string): UserPattern {
    let pattern = this.userPatterns.get(userId);
    
    if (!pattern) {
      pattern = {
        userId,
        preferences: {},
        timePreferences: new Array(24).fill(0),
        featurePreferences: {},
        devicePreferences: { desktop: 0, tablet: 0, mobile: 0 },
        adaptationRate: 0.1,
        lastUpdated: new Date()
      };
    }

    return pattern;
  }

  private updateUserPatterns(userId: string, context: LearningContext): void {
    const userPattern = this.getUserPattern(userId);
    
    // Update adaptation rate based on session context
    if (context.sessionContext.preferenceChanges > 0) {
      userPattern.adaptationRate = Math.min(1, userPattern.adaptationRate + 0.01);
    } else {
      userPattern.adaptationRate = Math.max(0.01, userPattern.adaptationRate - 0.001);
    }

    this.userPatterns.set(userId, userPattern);
  }

  private updateGlobalPatterns(context: LearningContext): void {
    const key = `${context.userRole}_${context.deviceType}`;
    let globalPattern = this.globalPatterns.get(key);

    if (!globalPattern) {
      globalPattern = {
        key,
        sampleCount: 0,
        patterns: {},
        lastUpdated: new Date()
      };
    }

    globalPattern.sampleCount++;
    globalPattern.lastUpdated = new Date();
    
    this.globalPatterns.set(key, globalPattern);
  }

  private extractFeatureUsage(interactions: UserInteractionEvent[]): Record<string, number> {
    const usage: Record<string, number> = {};

    interactions.forEach(interaction => {
      const feature = this.categorizeInteraction(interaction);
      usage[feature] = (usage[feature] || 0) + 1;
    });

    return usage;
  }

  private categorizeInteraction(interaction: UserInteractionEvent): string {
    // Simple categorization based on element
    if (interaction.element.includes('widget')) return 'widget_usage';
    if (interaction.element.includes('chart')) return 'chart_interaction';
    if (interaction.element.includes('filter')) return 'filtering';
    if (interaction.element.includes('search')) return 'search';
    if (interaction.element.includes('export')) return 'export';
    return 'general';
  }

  private calculateUserConfidence(userPattern: UserPattern): number {
    const confidences = Object.values(userPattern.preferences).map(p => p.confidence);
    return confidences.length > 0 
      ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length 
      : 0;
  }

  private getTopRecommendations(userPattern: UserPattern): Array<{ key: string; value: any; reason: string }> {
    return Object.entries(userPattern.preferences)
      .filter(([, data]) => data.confidence > 0.5)
      .sort(([, a], [, b]) => b.confidence - a.confidence)
      .slice(0, 5)
      .map(([key, data]) => ({
        key,
        value: data.value,
        reason: `High confidence (${(data.confidence * 100).toFixed(0)}%) based on your usage patterns`
      }));
  }

  private calculateAdaptationRate(userPattern: UserPattern): number {
    return userPattern.adaptationRate;
  }

  private createDefaultContext(context: LearningContext): DefaultContext {
    return {
      userRole: context.userRole,
      teamSize: context.teamSize,
      industry: context.industry,
      experienceLevel: context.experienceLevel
    };
  }

  private getAllDefaultKeys(): string[] {
    const keys = new Set<string>();
    
    this.rules.forEach((rules, key) => {
      keys.add(key);
    });

    return Array.from(keys);
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeBaseRules(): void {
    const baseRules: Omit<DefaultRule, 'id' | 'createdAt' | 'lastUsed' | 'usageCount'>[] = [
      // Theme defaults
      {
        key: 'theme.mode',
        condition: { timeOfDay: { start: 18, end: 8 } },
        value: 'dark',
        confidence: 0.7,
        source: 'global_pattern',
        priority: 1
      },
      {
        key: 'theme.mode',
        condition: { timeOfDay: { start: 8, end: 18 } },
        value: 'light',
        confidence: 0.7,
        source: 'global_pattern',
        priority: 1
      },
      {
        key: 'theme.density',
        condition: { userRole: ['developer'] },
        value: 'compact',
        confidence: 0.6,
        source: 'role_based',
        priority: 2
      },
      {
        key: 'theme.density',
        condition: { userRole: ['manager'] },
        value: 'comfortable',
        confidence: 0.6,
        source: 'role_based',
        priority: 2
      },

      // Layout defaults
      {
        key: 'layout.columnCount',
        condition: { deviceType: ['desktop'] },
        value: 3,
        confidence: 0.8,
        source: 'global_pattern',
        priority: 1
      },
      {
        key: 'layout.columnCount',
        condition: { deviceType: ['tablet'] },
        value: 2,
        confidence: 0.8,
        source: 'global_pattern',
        priority: 1
      },
      {
        key: 'layout.columnCount',
        condition: { deviceType: ['mobile'] },
        value: 1,
        confidence: 0.9,
        source: 'global_pattern',
        priority: 1
      },

      // Widget defaults
      {
        key: 'widgets.refreshInterval',
        condition: { userRole: ['developer'] },
        value: 30000,
        confidence: 0.6,
        source: 'role_based',
        priority: 2
      },
      {
        key: 'widgets.refreshInterval',
        condition: { userRole: ['manager'] },
        value: 300000,
        confidence: 0.6,
        source: 'role_based',
        priority: 2
      },

      // Notification defaults
      {
        key: 'notifications.frequency',
        condition: { userRole: ['developer'] },
        value: 'immediate',
        confidence: 0.5,
        source: 'role_based',
        priority: 2
      },
      {
        key: 'notifications.frequency',
        condition: { userRole: ['manager'] },
        value: 'daily',
        confidence: 0.5,
        source: 'role_based',
        priority: 2
      }
    ];

    baseRules.forEach(rule => {
      this.addCustomRule(rule);
    });
  }
}

interface UserPattern {
  userId: string;
  preferences: Record<string, { value: any; confidence: number }>;
  timePreferences: number[];
  featurePreferences: Record<string, number>;
  devicePreferences: { desktop: number; tablet: number; mobile: number };
  adaptationRate: number;
  lastUpdated: Date;
}

interface GlobalPattern {
  key: string;
  sampleCount: number;
  patterns: Record<string, any>;
  lastUpdated: Date;
}