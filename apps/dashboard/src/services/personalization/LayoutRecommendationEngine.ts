/**
 * Machine learning-based layout recommendation engine
 * Uses user interaction patterns to suggest optimal layouts
 */

import { 
  UserInteractionEvent, 
  LayoutConfiguration, 
  WidgetSuggestion, 
  PersonalizationInsights,
  FeatureUsage,
  WorkflowPattern,
  UserRole,
  DeviceType
} from './types';

export interface MLModel {
  predict(features: number[]): number[];
  train(data: TrainingData[]): void;
  getFeatureImportance(): Record<string, number>;
}

export interface TrainingData {
  features: number[];
  target: number[];
  weight?: number;
}

export interface LayoutScore {
  layoutId: string;
  score: number;
  confidence: number;
  reasons: string[];
}

export interface RecommendationContext {
  userRole: UserRole;
  deviceType: DeviceType;
  timeOfDay: number;
  dayOfWeek: number;
  sessionDuration: number;
  recentInteractions: UserInteractionEvent[];
}

export class LayoutRecommendationEngine {
  private model: MLModel;
  private trainingData: TrainingData[] = [];
  private featureExtractor: FeatureExtractor;
  private readonly MIN_TRAINING_SAMPLES = 50;
  private readonly CONFIDENCE_THRESHOLD = 0.7;

  constructor() {
    this.model = new SimpleMLModel();
    this.featureExtractor = new FeatureExtractor();
  }

  /**
   * Get layout recommendations based on user behavior
   */
  async getLayoutRecommendations(
    userId: string,
    interactions: UserInteractionEvent[],
    context: RecommendationContext,
    currentLayout?: LayoutConfiguration
  ): Promise<LayoutScore[]> {
    if (interactions.length < 10) {
      // Not enough data, return role-based recommendations
      return this.getRoleBasedRecommendations(context.userRole, context.deviceType);
    }

    const features = this.featureExtractor.extractFeatures(interactions, context);
    const predictions = this.model.predict(features);
    
    const recommendations = this.convertPredictionsToLayouts(predictions, context);
    
    // Filter by confidence threshold
    return recommendations
      .filter(rec => rec.confidence >= this.CONFIDENCE_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  /**
   * Get widget suggestions based on usage patterns
   */
  async getWidgetSuggestions(
    userId: string,
    interactions: UserInteractionEvent[],
    context: RecommendationContext,
    currentWidgets: string[]
  ): Promise<WidgetSuggestion[]> {
    const insights = this.analyzeUserBehavior(interactions);
    const suggestions: WidgetSuggestion[] = [];

    // Analyze feature usage patterns
    insights.mostUsedFeatures.forEach(feature => {
      const widgetSuggestion = this.mapFeatureToWidget(feature, context, currentWidgets);
      if (widgetSuggestion) {
        suggestions.push(widgetSuggestion);
      }
    });

    // Analyze workflow patterns
    insights.workflowPatterns.forEach(pattern => {
      const workflowSuggestions = this.mapWorkflowToWidgets(pattern, context, currentWidgets);
      suggestions.push(...workflowSuggestions);
    });

    // Remove duplicates and sort by confidence
    const uniqueSuggestions = this.deduplicateSuggestions(suggestions);
    return uniqueSuggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8);
  }

  /**
   * Train the model with user feedback
   */
  async trainModel(
    interactions: UserInteractionEvent[],
    layoutChoices: Array<{ layout: LayoutConfiguration; satisfaction: number }>,
    context: RecommendationContext
  ): Promise<void> {
    const newTrainingData = this.prepareTrainingData(interactions, layoutChoices, context);
    this.trainingData.push(...newTrainingData);

    // Retrain if we have enough data
    if (this.trainingData.length >= this.MIN_TRAINING_SAMPLES) {
      this.model.train(this.trainingData);
      
      // Keep only recent training data to prevent model drift
      const maxSamples = 1000;
      if (this.trainingData.length > maxSamples) {
        this.trainingData = this.trainingData.slice(-maxSamples);
      }
    }
  }

  /**
   * Analyze user behavior patterns
   */
  analyzeUserBehavior(interactions: UserInteractionEvent[]): PersonalizationInsights {
    const insights: PersonalizationInsights = {
      userId: interactions[0]?.userId || '',
      mostUsedFeatures: this.extractFeatureUsage(interactions),
      preferredTimeOfDay: this.extractTimePreferences(interactions),
      deviceUsagePattern: this.extractDeviceUsage(interactions),
      workflowPatterns: this.extractWorkflowPatterns(interactions),
      recommendations: [],
      generatedAt: new Date()
    };

    insights.recommendations = this.generateRecommendations(insights);
    return insights;
  }

  /**
   * Get model performance metrics
   */
  getModelMetrics(): {
    trainingDataSize: number;
    featureImportance: Record<string, number>;
    lastTrainingTime?: Date;
    accuracy?: number;
  } {
    return {
      trainingDataSize: this.trainingData.length,
      featureImportance: this.model.getFeatureImportance(),
      lastTrainingTime: new Date(), // Would track actual training time
      accuracy: this.calculateModelAccuracy()
    };
  }

  private getRoleBasedRecommendations(userRole: UserRole, deviceType: DeviceType): LayoutScore[] {
    const roleLayouts: Record<UserRole, LayoutScore[]> = {
      developer: [
        {
          layoutId: 'developer_focused',
          score: 0.9,
          confidence: 0.8,
          reasons: ['Optimized for code metrics', 'Performance monitoring focus']
        },
        {
          layoutId: 'productivity_dashboard',
          score: 0.85,
          confidence: 0.75,
          reasons: ['Task tracking emphasis', 'Time management tools']
        }
      ],
      team_lead: [
        {
          layoutId: 'team_overview',
          score: 0.95,
          confidence: 0.85,
          reasons: ['Team performance metrics', 'Resource allocation views']
        },
        {
          layoutId: 'management_dashboard',
          score: 0.8,
          confidence: 0.7,
          reasons: ['High-level insights', 'Trend analysis']
        }
      ],
      manager: [
        {
          layoutId: 'executive_summary',
          score: 0.9,
          confidence: 0.8,
          reasons: ['Strategic metrics focus', 'Simplified visualizations']
        }
      ],
      admin: [
        {
          layoutId: 'system_admin',
          score: 0.85,
          confidence: 0.75,
          reasons: ['System health monitoring', 'User management tools']
        }
      ]
    };

    return roleLayouts[userRole] || roleLayouts.developer;
  }

  private convertPredictionsToLayouts(
    predictions: number[],
    context: RecommendationContext
  ): LayoutScore[] {
    // Convert ML predictions to layout recommendations
    const layoutTypes = [
      'grid_3x3',
      'grid_2x4',
      'sidebar_main',
      'dashboard_cards',
      'analytics_focused',
      'mobile_optimized'
    ];

    return predictions.map((score, index) => ({
      layoutId: layoutTypes[index] || `layout_${index}`,
      score: Math.max(0, Math.min(1, score)),
      confidence: this.calculateConfidence(score, context),
      reasons: this.generateReasons(layoutTypes[index], score, context)
    }));
  }

  private mapFeatureToWidget(
    feature: FeatureUsage,
    context: RecommendationContext,
    currentWidgets: string[]
  ): WidgetSuggestion | null {
    const featureWidgetMap: Record<string, string> = {
      'code_metrics': 'code_quality_widget',
      'performance_monitoring': 'performance_dashboard',
      'task_tracking': 'task_manager_widget',
      'team_collaboration': 'team_activity_widget',
      'analytics_viewing': 'analytics_summary_widget',
      'search_usage': 'quick_search_widget'
    };

    const widgetId = featureWidgetMap[feature.feature];
    if (!widgetId || currentWidgets.includes(widgetId)) {
      return null;
    }

    return {
      widgetId,
      confidence: Math.min(0.95, feature.usageCount / 100),
      reason: `Frequently used feature: ${feature.feature}`,
      position: this.suggestOptimalPosition(widgetId, context),
      size: this.suggestOptimalSize(widgetId, context),
      configuration: this.suggestWidgetConfiguration(widgetId, feature)
    };
  }

  private mapWorkflowToWidgets(
    pattern: WorkflowPattern,
    context: RecommendationContext,
    currentWidgets: string[]
  ): WidgetSuggestion[] {
    const workflowWidgets: Record<string, string[]> = {
      'daily_standup': ['team_activity_widget', 'task_progress_widget'],
      'code_review': ['code_quality_widget', 'review_queue_widget'],
      'performance_analysis': ['performance_dashboard', 'metrics_comparison_widget'],
      'project_planning': ['milestone_tracker_widget', 'resource_allocation_widget']
    };

    const suggestedWidgets = workflowWidgets[pattern.name] || [];
    
    return suggestedWidgets
      .filter(widgetId => !currentWidgets.includes(widgetId))
      .map(widgetId => ({
        widgetId,
        confidence: Math.min(0.9, pattern.frequency / 10),
        reason: `Supports workflow: ${pattern.name}`,
        position: this.suggestOptimalPosition(widgetId, context),
        size: this.suggestOptimalSize(widgetId, context),
        configuration: {}
      }));
  }

  private extractFeatureUsage(interactions: UserInteractionEvent[]): FeatureUsage[] {
    const featureMap = new Map<string, FeatureUsage>();

    interactions.forEach(interaction => {
      const feature = this.categorizeInteraction(interaction);
      if (!featureMap.has(feature)) {
        featureMap.set(feature, {
          feature,
          usageCount: 0,
          averageDuration: 0,
          lastUsed: interaction.timestamp
        });
      }

      const usage = featureMap.get(feature)!;
      usage.usageCount++;
      usage.lastUsed = new Date(Math.max(usage.lastUsed.getTime(), interaction.timestamp.getTime()));
      
      if (interaction.duration) {
        usage.averageDuration = (usage.averageDuration + interaction.duration) / 2;
      }
    });

    return Array.from(featureMap.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);
  }

  private extractTimePreferences(interactions: UserInteractionEvent[]): number[] {
    const hourCounts = new Array(24).fill(0);
    
    interactions.forEach(interaction => {
      const hour = interaction.context.timeOfDay;
      hourCounts[hour]++;
    });

    return hourCounts;
  }

  private extractDeviceUsage(interactions: UserInteractionEvent[]): { desktop: number; tablet: number; mobile: number } {
    const deviceCounts = { desktop: 0, tablet: 0, mobile: 0 };
    
    interactions.forEach(interaction => {
      deviceCounts[interaction.context.deviceType]++;
    });

    const total = Object.values(deviceCounts).reduce((sum, count) => sum + count, 0);
    
    return {
      desktop: deviceCounts.desktop / total,
      tablet: deviceCounts.tablet / total,
      mobile: deviceCounts.mobile / total
    };
  }

  private extractWorkflowPatterns(interactions: UserInteractionEvent[]): WorkflowPattern[] {
    // Simplified workflow pattern detection
    const patterns: WorkflowPattern[] = [];
    
    // Group interactions by session/time windows
    const sessionGroups = this.groupInteractionsBySession(interactions);
    
    sessionGroups.forEach(session => {
      const pattern = this.identifyWorkflowPattern(session);
      if (pattern) {
        patterns.push(pattern);
      }
    });

    // Aggregate similar patterns
    return this.aggregatePatterns(patterns);
  }

  private categorizeInteraction(interaction: UserInteractionEvent): string {
    const elementCategories: Record<string, string> = {
      'code_quality': 'code_metrics',
      'performance': 'performance_monitoring',
      'task': 'task_tracking',
      'team': 'team_collaboration',
      'chart': 'analytics_viewing',
      'search': 'search_usage'
    };

    for (const [key, category] of Object.entries(elementCategories)) {
      if (interaction.element.toLowerCase().includes(key)) {
        return category;
      }
    }

    return 'general_usage';
  }

  private suggestOptimalPosition(widgetId: string, context: RecommendationContext): { x: number; y: number } {
    // Simple position suggestion based on widget type and context
    const positionMap: Record<string, { x: number; y: number }> = {
      'code_quality_widget': { x: 0, y: 0 },
      'performance_dashboard': { x: 1, y: 0 },
      'task_manager_widget': { x: 2, y: 0 },
      'team_activity_widget': { x: 0, y: 1 },
      'analytics_summary_widget': { x: 1, y: 1 }
    };

    return positionMap[widgetId] || { x: 0, y: 0 };
  }

  private suggestOptimalSize(widgetId: string, context: RecommendationContext): { width: number; height: number } {
    const sizeMap: Record<string, { width: number; height: number }> = {
      'code_quality_widget': { width: 2, height: 2 },
      'performance_dashboard': { width: 3, height: 2 },
      'task_manager_widget': { width: 2, height: 3 },
      'team_activity_widget': { width: 2, height: 2 },
      'analytics_summary_widget': { width: 3, height: 2 }
    };

    const baseSize = sizeMap[widgetId] || { width: 2, height: 2 };
    
    // Adjust for mobile
    if (context.deviceType === 'mobile') {
      return { width: Math.min(baseSize.width, 2), height: baseSize.height };
    }

    return baseSize;
  }

  private suggestWidgetConfiguration(widgetId: string, feature: FeatureUsage): Record<string, any> {
    // Suggest configuration based on usage patterns
    return {
      refreshInterval: feature.usageCount > 50 ? 30000 : 60000, // More frequent updates for heavy users
      showDetails: feature.averageDuration > 30000, // Show more details for users who spend time
      compactMode: feature.usageCount > 100 // Compact mode for power users
    };
  }

  private deduplicateSuggestions(suggestions: WidgetSuggestion[]): WidgetSuggestion[] {
    const seen = new Set<string>();
    return suggestions.filter(suggestion => {
      if (seen.has(suggestion.widgetId)) {
        return false;
      }
      seen.add(suggestion.widgetId);
      return true;
    });
  }

  private prepareTrainingData(
    interactions: UserInteractionEvent[],
    layoutChoices: Array<{ layout: LayoutConfiguration; satisfaction: number }>,
    context: RecommendationContext
  ): TrainingData[] {
    return layoutChoices.map(choice => {
      const features = this.featureExtractor.extractFeatures(interactions, context);
      const target = this.encodeLayoutAsTarget(choice.layout);
      
      return {
        features,
        target,
        weight: choice.satisfaction // Use satisfaction as training weight
      };
    });
  }

  private encodeLayoutAsTarget(layout: LayoutConfiguration): number[] {
    // Encode layout configuration as numerical target for ML
    return [
      layout.widgets.length,
      layout.widgets.filter(w => w.size.width > 2).length,
      layout.widgets.filter(w => w.size.height > 2).length,
      layout.customizations.length,
      layout.confidence
    ];
  }

  private calculateConfidence(score: number, context: RecommendationContext): number {
    let confidence = score;
    
    // Adjust confidence based on context
    if (context.recentInteractions.length < 20) {
      confidence *= 0.8; // Lower confidence with less data
    }
    
    if (context.sessionDuration < 300000) { // Less than 5 minutes
      confidence *= 0.9; // Lower confidence for short sessions
    }

    return Math.max(0.1, Math.min(0.95, confidence));
  }

  private generateReasons(layoutId: string, score: number, context: RecommendationContext): string[] {
    const reasons: string[] = [];
    
    if (score > 0.8) {
      reasons.push('High compatibility with your usage patterns');
    }
    
    if (context.deviceType === 'mobile' && layoutId.includes('mobile')) {
      reasons.push('Optimized for mobile devices');
    }
    
    if (context.userRole === 'team_lead' && layoutId.includes('team')) {
      reasons.push('Designed for team management');
    }

    return reasons;
  }

  private generateRecommendations(insights: PersonalizationInsights): any[] {
    // Generate actionable recommendations based on insights
    return []; // Simplified for now
  }

  private groupInteractionsBySession(interactions: UserInteractionEvent[]): UserInteractionEvent[][] {
    // Group interactions into sessions based on time gaps
    const sessions: UserInteractionEvent[][] = [];
    let currentSession: UserInteractionEvent[] = [];
    const SESSION_GAP = 30 * 60 * 1000; // 30 minutes

    interactions.forEach((interaction, index) => {
      if (index === 0) {
        currentSession.push(interaction);
        return;
      }

      const timeDiff = interaction.timestamp.getTime() - interactions[index - 1].timestamp.getTime();
      
      if (timeDiff > SESSION_GAP) {
        if (currentSession.length > 0) {
          sessions.push(currentSession);
        }
        currentSession = [interaction];
      } else {
        currentSession.push(interaction);
      }
    });

    if (currentSession.length > 0) {
      sessions.push(currentSession);
    }

    return sessions;
  }

  private identifyWorkflowPattern(session: UserInteractionEvent[]): WorkflowPattern | null {
    if (session.length < 3) return null;

    const elements = session.map(i => i.element);
    const duration = session[session.length - 1].timestamp.getTime() - session[0].timestamp.getTime();

    // Simple pattern recognition
    if (elements.some(e => e.includes('code')) && elements.some(e => e.includes('review'))) {
      return {
        name: 'code_review',
        steps: elements,
        frequency: 1,
        averageDuration: duration
      };
    }

    return null;
  }

  private aggregatePatterns(patterns: WorkflowPattern[]): WorkflowPattern[] {
    const patternMap = new Map<string, WorkflowPattern>();

    patterns.forEach(pattern => {
      if (patternMap.has(pattern.name)) {
        const existing = patternMap.get(pattern.name)!;
        existing.frequency++;
        existing.averageDuration = (existing.averageDuration + pattern.averageDuration) / 2;
      } else {
        patternMap.set(pattern.name, { ...pattern });
      }
    });

    return Array.from(patternMap.values());
  }

  private calculateModelAccuracy(): number {
    // Simplified accuracy calculation
    return 0.75; // Would calculate based on actual predictions vs outcomes
  }
}

/**
 * Feature extraction for ML model
 */
class FeatureExtractor {
  extractFeatures(interactions: UserInteractionEvent[], context: RecommendationContext): number[] {
    const features: number[] = [];

    // Time-based features
    features.push(context.timeOfDay / 24);
    features.push(context.dayOfWeek / 7);
    features.push(context.sessionDuration / (60 * 60 * 1000)); // Hours

    // Interaction features
    features.push(interactions.length);
    features.push(this.getAverageInteractionDuration(interactions));
    features.push(this.getUniqueElementCount(interactions));

    // Device and role features
    features.push(context.deviceType === 'desktop' ? 1 : 0);
    features.push(context.deviceType === 'mobile' ? 1 : 0);
    features.push(context.userRole === 'developer' ? 1 : 0);
    features.push(context.userRole === 'team_lead' ? 1 : 0);

    // Interaction type distribution
    const typeDistribution = this.getInteractionTypeDistribution(interactions);
    features.push(...Object.values(typeDistribution));

    return features;
  }

  private getAverageInteractionDuration(interactions: UserInteractionEvent[]): number {
    const durationsWithValue = interactions.filter(i => i.duration).map(i => i.duration!);
    return durationsWithValue.length > 0 
      ? durationsWithValue.reduce((sum, d) => sum + d, 0) / durationsWithValue.length 
      : 0;
  }

  private getUniqueElementCount(interactions: UserInteractionEvent[]): number {
    return new Set(interactions.map(i => i.element)).size;
  }

  private getInteractionTypeDistribution(interactions: UserInteractionEvent[]): Record<string, number> {
    const distribution: Record<string, number> = {
      click: 0,
      hover: 0,
      navigation: 0,
      widget_interaction: 0,
      search: 0
    };

    interactions.forEach(interaction => {
      if (distribution.hasOwnProperty(interaction.type)) {
        distribution[interaction.type]++;
      }
    });

    const total = interactions.length;
    Object.keys(distribution).forEach(key => {
      distribution[key] = total > 0 ? distribution[key] / total : 0;
    });

    return distribution;
  }
}

/**
 * Simple ML model implementation
 */
class SimpleMLModel implements MLModel {
  private weights: number[] = [];
  private featureImportance: Record<string, number> = {};

  predict(features: number[]): number[] {
    if (this.weights.length === 0) {
      // Return random predictions if not trained
      return Array(6).fill(0).map(() => Math.random());
    }

    // Simple linear model prediction
    const prediction = features.reduce((sum, feature, index) => {
      return sum + feature * (this.weights[index] || 0);
    }, 0);

    // Convert to multiple outputs (simplified)
    return Array(6).fill(0).map((_, i) => {
      return Math.max(0, Math.min(1, prediction + (Math.random() - 0.5) * 0.2));
    });
  }

  train(data: TrainingData[]): void {
    if (data.length === 0) return;

    const featureCount = data[0].features.length;
    this.weights = new Array(featureCount).fill(0);

    // Simple gradient descent (very simplified)
    const learningRate = 0.01;
    const epochs = 100;

    for (let epoch = 0; epoch < epochs; epoch++) {
      data.forEach(sample => {
        const prediction = this.predict(sample.features)[0]; // Use first output
        const error = sample.target[0] - prediction;
        const weight = sample.weight || 1;

        // Update weights
        sample.features.forEach((feature, index) => {
          this.weights[index] += learningRate * error * feature * weight;
        });
      });
    }

    // Calculate feature importance (simplified)
    this.featureImportance = {};
    this.weights.forEach((weight, index) => {
      this.featureImportance[`feature_${index}`] = Math.abs(weight);
    });
  }

  getFeatureImportance(): Record<string, number> {
    return { ...this.featureImportance };
  }
}