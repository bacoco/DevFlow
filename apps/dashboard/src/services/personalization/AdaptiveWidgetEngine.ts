/**
 * Adaptive widget suggestion engine based on user role and usage patterns
 * Suggests widgets and configurations based on user behavior and context
 */

import { 
  WidgetSuggestion, 
  UserRole, 
  DeviceType, 
  UserInteractionEvent,
  WidgetPreference,
  PersonalizationInsights
} from './types';

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  category: WidgetCategory;
  defaultSize: { width: number; height: number };
  minSize: { width: number; height: number };
  maxSize: { width: number; height: number };
  supportedRoles: UserRole[];
  deviceCompatibility: DeviceType[];
  dependencies: string[];
  configuration: WidgetConfigSchema;
}

export type WidgetCategory = 
  | 'productivity'
  | 'analytics'
  | 'collaboration'
  | 'monitoring'
  | 'development'
  | 'management';

export interface WidgetConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
    default: any;
    options?: any[];
    required?: boolean;
    description?: string;
  };
}

export interface SuggestionContext {
  userRole: UserRole;
  deviceType: DeviceType;
  currentWidgets: string[];
  availableSpace: { width: number; height: number };
  timeOfDay: number;
  recentActivity: UserInteractionEvent[];
  teamContext?: TeamContext;
}

export interface TeamContext {
  teamSize: number;
  teamRole: 'individual' | 'lead' | 'manager';
  projectPhase: 'planning' | 'development' | 'testing' | 'deployment';
  teamPreferences: Record<string, any>;
}

export class AdaptiveWidgetEngine {
  private widgetRegistry: Map<string, WidgetDefinition> = new Map();
  private usagePatterns: Map<string, WidgetUsagePattern> = new Map();
  private roleProfiles: Map<UserRole, RoleProfile> = new Map();

  constructor() {
    this.initializeWidgetRegistry();
    this.initializeRoleProfiles();
  }

  /**
   * Get widget suggestions based on context and usage patterns
   */
  async getSuggestions(
    userId: string,
    context: SuggestionContext,
    insights?: PersonalizationInsights
  ): Promise<WidgetSuggestion[]> {
    const suggestions: WidgetSuggestion[] = [];

    // Get role-based suggestions
    const roleSuggestions = this.getRoleBasedSuggestions(context);
    suggestions.push(...roleSuggestions);

    // Get usage pattern-based suggestions
    if (insights) {
      const patternSuggestions = this.getPatternBasedSuggestions(context, insights);
      suggestions.push(...patternSuggestions);
    }

    // Get contextual suggestions
    const contextualSuggestions = this.getContextualSuggestions(context);
    suggestions.push(...contextualSuggestions);

    // Get collaborative suggestions
    if (context.teamContext) {
      const teamSuggestions = this.getTeamBasedSuggestions(context);
      suggestions.push(...teamSuggestions);
    }

    // Filter, deduplicate, and rank suggestions
    return this.rankAndFilterSuggestions(suggestions, context);
  }

  /**
   * Get optimal widget configuration based on usage patterns
   */
  getOptimalConfiguration(
    widgetId: string,
    userId: string,
    context: SuggestionContext,
    usageHistory?: UserInteractionEvent[]
  ): Record<string, any> {
    const widget = this.widgetRegistry.get(widgetId);
    if (!widget) {
      return {};
    }

    const baseConfig = this.getDefaultConfiguration(widget);
    const usageConfig = this.getUsageBasedConfiguration(widgetId, usageHistory || []);
    const contextConfig = this.getContextBasedConfiguration(widget, context);

    return {
      ...baseConfig,
      ...contextConfig,
      ...usageConfig
    };
  }

  /**
   * Update widget usage patterns for learning
   */
  updateUsagePattern(
    widgetId: string,
    userId: string,
    interaction: UserInteractionEvent,
    satisfaction?: number
  ): void {
    const key = `${userId}_${widgetId}`;
    let pattern = this.usagePatterns.get(key);

    if (!pattern) {
      pattern = {
        widgetId,
        userId,
        totalInteractions: 0,
        averageSessionDuration: 0,
        preferredTimeSlots: new Array(24).fill(0),
        deviceUsage: { desktop: 0, tablet: 0, mobile: 0 },
        configurationPreferences: {},
        satisfactionScore: 0.5,
        lastUpdated: new Date()
      };
    }

    // Update pattern
    pattern.totalInteractions++;
    pattern.preferredTimeSlots[interaction.context.timeOfDay]++;
    pattern.deviceUsage[interaction.context.deviceType]++;
    
    if (interaction.duration) {
      pattern.averageSessionDuration = 
        (pattern.averageSessionDuration + interaction.duration) / 2;
    }

    if (satisfaction !== undefined) {
      pattern.satisfactionScore = 
        (pattern.satisfactionScore + satisfaction) / 2;
    }

    pattern.lastUpdated = new Date();
    this.usagePatterns.set(key, pattern);
  }

  /**
   * Get widget recommendations for empty dashboard
   */
  getStarterWidgets(userRole: UserRole, deviceType: DeviceType): WidgetSuggestion[] {
    const roleProfile = this.roleProfiles.get(userRole);
    if (!roleProfile) {
      return [];
    }

    return roleProfile.essentialWidgets
      .filter(widgetId => {
        const widget = this.widgetRegistry.get(widgetId);
        return widget?.deviceCompatibility.includes(deviceType);
      })
      .map((widgetId, index) => ({
        widgetId,
        confidence: 0.9 - (index * 0.1),
        reason: 'Essential widget for your role',
        position: this.calculateStarterPosition(index, deviceType),
        size: this.getDefaultSize(widgetId, deviceType),
        configuration: this.getDefaultConfiguration(this.widgetRegistry.get(widgetId)!)
      }));
  }

  /**
   * Suggest widget replacements for underperforming widgets
   */
  suggestReplacements(
    currentWidget: string,
    context: SuggestionContext,
    performanceMetrics: WidgetPerformanceMetrics
  ): WidgetSuggestion[] {
    if (performanceMetrics.engagementScore > 0.7) {
      return []; // Widget is performing well
    }

    const currentWidgetDef = this.widgetRegistry.get(currentWidget);
    if (!currentWidgetDef) {
      return [];
    }

    // Find similar widgets in the same category
    const alternatives = Array.from(this.widgetRegistry.values())
      .filter(widget => 
        widget.category === currentWidgetDef.category &&
        widget.id !== currentWidget &&
        widget.supportedRoles.includes(context.userRole) &&
        widget.deviceCompatibility.includes(context.deviceType)
      );

    return alternatives.map(widget => ({
      widgetId: widget.id,
      confidence: 0.8,
      reason: `Alternative to underperforming ${currentWidgetDef.name}`,
      position: { x: 0, y: 0 }, // Will be positioned where current widget is
      size: widget.defaultSize,
      configuration: this.getDefaultConfiguration(widget)
    }));
  }

  /**
   * Register a new widget type
   */
  registerWidget(widget: WidgetDefinition): void {
    this.widgetRegistry.set(widget.id, widget);
  }

  /**
   * Get all available widgets for a role and device
   */
  getAvailableWidgets(userRole: UserRole, deviceType: DeviceType): WidgetDefinition[] {
    return Array.from(this.widgetRegistry.values())
      .filter(widget => 
        widget.supportedRoles.includes(userRole) &&
        widget.deviceCompatibility.includes(deviceType)
      );
  }

  private getRoleBasedSuggestions(context: SuggestionContext): WidgetSuggestion[] {
    const roleProfile = this.roleProfiles.get(context.userRole);
    if (!roleProfile) {
      return [];
    }

    const availableWidgets = roleProfile.recommendedWidgets
      .filter(widgetId => !context.currentWidgets.includes(widgetId))
      .slice(0, 5);

    return availableWidgets.map((widgetId, index) => ({
      widgetId,
      confidence: 0.8 - (index * 0.1),
      reason: `Recommended for ${context.userRole}s`,
      position: this.suggestPosition(context.availableSpace, index),
      size: this.getDefaultSize(widgetId, context.deviceType),
      configuration: this.getDefaultConfiguration(this.widgetRegistry.get(widgetId)!)
    }));
  }

  private getPatternBasedSuggestions(
    context: SuggestionContext,
    insights: PersonalizationInsights
  ): WidgetSuggestion[] {
    const suggestions: WidgetSuggestion[] = [];

    // Analyze most used features
    insights.mostUsedFeatures.forEach(feature => {
      const widgetId = this.mapFeatureToWidget(feature.feature);
      if (widgetId && !context.currentWidgets.includes(widgetId)) {
        suggestions.push({
          widgetId,
          confidence: Math.min(0.95, feature.usageCount / 100),
          reason: `You frequently use ${feature.feature}`,
          position: this.suggestPosition(context.availableSpace, suggestions.length),
          size: this.getDefaultSize(widgetId, context.deviceType),
          configuration: this.getUsageBasedConfiguration(widgetId, context.recentActivity)
        });
      }
    });

    // Analyze workflow patterns
    insights.workflowPatterns.forEach(pattern => {
      const supportingWidgets = this.getWorkflowSupportWidgets(pattern.name);
      supportingWidgets.forEach(widgetId => {
        if (!context.currentWidgets.includes(widgetId)) {
          suggestions.push({
            widgetId,
            confidence: Math.min(0.9, pattern.frequency / 10),
            reason: `Supports your ${pattern.name} workflow`,
            position: this.suggestPosition(context.availableSpace, suggestions.length),
            size: this.getDefaultSize(widgetId, context.deviceType),
            configuration: {}
          });
        }
      });
    });

    return suggestions;
  }

  private getContextualSuggestions(context: SuggestionContext): WidgetSuggestion[] {
    const suggestions: WidgetSuggestion[] = [];

    // Time-based suggestions
    if (context.timeOfDay >= 9 && context.timeOfDay <= 17) {
      // Work hours - suggest productivity widgets
      const productivityWidgets = this.getWidgetsByCategory('productivity')
        .filter(w => !context.currentWidgets.includes(w.id));
      
      if (productivityWidgets.length > 0) {
        suggestions.push({
          widgetId: productivityWidgets[0].id,
          confidence: 0.7,
          reason: 'Productivity focus during work hours',
          position: this.suggestPosition(context.availableSpace, 0),
          size: this.getDefaultSize(productivityWidgets[0].id, context.deviceType),
          configuration: {}
        });
      }
    }

    // Device-specific suggestions
    if (context.deviceType === 'mobile') {
      const mobileOptimizedWidgets = Array.from(this.widgetRegistry.values())
        .filter(w => 
          w.deviceCompatibility.includes('mobile') &&
          w.defaultSize.width <= 2 &&
          !context.currentWidgets.includes(w.id)
        );

      mobileOptimizedWidgets.slice(0, 2).forEach((widget, index) => {
        suggestions.push({
          widgetId: widget.id,
          confidence: 0.75,
          reason: 'Optimized for mobile viewing',
          position: { x: 0, y: index },
          size: { width: 2, height: 2 },
          configuration: { compactMode: true }
        });
      });
    }

    return suggestions;
  }

  private getTeamBasedSuggestions(context: SuggestionContext): WidgetSuggestion[] {
    if (!context.teamContext) {
      return [];
    }

    const suggestions: WidgetSuggestion[] = [];
    const { teamRole, projectPhase, teamSize } = context.teamContext;

    // Team lead specific widgets
    if (teamRole === 'lead' || teamRole === 'manager') {
      const managementWidgets = ['team_performance_widget', 'resource_allocation_widget'];
      managementWidgets.forEach((widgetId, index) => {
        if (!context.currentWidgets.includes(widgetId)) {
          suggestions.push({
            widgetId,
            confidence: 0.85,
            reason: 'Essential for team management',
            position: this.suggestPosition(context.availableSpace, index),
            size: this.getDefaultSize(widgetId, context.deviceType),
            configuration: { teamSize }
          });
        }
      });
    }

    // Project phase specific widgets
    const phaseWidgets = this.getPhaseSpecificWidgets(projectPhase);
    phaseWidgets.forEach((widgetId, index) => {
      if (!context.currentWidgets.includes(widgetId)) {
        suggestions.push({
          widgetId,
          confidence: 0.8,
          reason: `Relevant for ${projectPhase} phase`,
          position: this.suggestPosition(context.availableSpace, suggestions.length + index),
          size: this.getDefaultSize(widgetId, context.deviceType),
          configuration: {}
        });
      }
    });

    return suggestions;
  }

  private rankAndFilterSuggestions(
    suggestions: WidgetSuggestion[],
    context: SuggestionContext
  ): WidgetSuggestion[] {
    // Remove duplicates
    const uniqueSuggestions = suggestions.filter((suggestion, index, array) =>
      array.findIndex(s => s.widgetId === suggestion.widgetId) === index
    );

    // Filter by available space
    const spaceFittingSuggestions = uniqueSuggestions.filter(suggestion =>
      suggestion.size.width <= context.availableSpace.width &&
      suggestion.size.height <= context.availableSpace.height
    );

    // Sort by confidence
    const sortedSuggestions = spaceFittingSuggestions.sort((a, b) => b.confidence - a.confidence);

    // Return top suggestions
    return sortedSuggestions.slice(0, 8);
  }

  private getDefaultConfiguration(widget: WidgetDefinition): Record<string, any> {
    const config: Record<string, any> = {};
    
    if (widget && widget.configuration) {
      Object.entries(widget.configuration).forEach(([key, schema]) => {
        config[key] = schema.default;
      });
    }

    return config;
  }

  private getUsageBasedConfiguration(
    widgetId: string,
    usageHistory: UserInteractionEvent[]
  ): Record<string, any> {
    const config: Record<string, any> = {};

    // Analyze usage patterns to suggest configuration
    const avgSessionDuration = this.calculateAverageSessionDuration(usageHistory);
    
    if (avgSessionDuration > 300000) { // 5 minutes
      config.showDetailedView = true;
      config.refreshInterval = 30000; // 30 seconds
    } else {
      config.showDetailedView = false;
      config.refreshInterval = 60000; // 1 minute
    }

    // Analyze interaction frequency
    const interactionCount = usageHistory.filter(h => h.element.includes(widgetId)).length;
    if (interactionCount > 50) {
      config.enableAdvancedFeatures = true;
    }

    return config;
  }

  private getContextBasedConfiguration(
    widget: WidgetDefinition,
    context: SuggestionContext
  ): Record<string, any> {
    const config: Record<string, any> = {};

    // Device-specific configuration
    if (context.deviceType === 'mobile') {
      config.compactMode = true;
      config.showLabels = false;
    }

    // Time-based configuration
    if (context.timeOfDay < 9 || context.timeOfDay > 17) {
      config.theme = 'dark';
    }

    // Role-based configuration
    if (context.userRole === 'manager') {
      config.showSummaryOnly = true;
      config.hideDetailedMetrics = true;
    }

    return config;
  }

  private mapFeatureToWidget(feature: string): string | null {
    const featureWidgetMap: Record<string, string> = {
      'code_metrics': 'code_quality_widget',
      'performance_monitoring': 'performance_dashboard_widget',
      'task_tracking': 'task_manager_widget',
      'team_collaboration': 'team_activity_widget',
      'analytics_viewing': 'analytics_summary_widget',
      'search_usage': 'quick_search_widget',
      'deployment_tracking': 'deployment_status_widget',
      'error_monitoring': 'error_tracking_widget'
    };

    return featureWidgetMap[feature] || null;
  }

  private getWorkflowSupportWidgets(workflowName: string): string[] {
    const workflowWidgets: Record<string, string[]> = {
      'daily_standup': ['team_activity_widget', 'task_progress_widget'],
      'code_review': ['code_quality_widget', 'review_queue_widget'],
      'performance_analysis': ['performance_dashboard_widget', 'metrics_comparison_widget'],
      'project_planning': ['milestone_tracker_widget', 'resource_allocation_widget'],
      'deployment': ['deployment_status_widget', 'environment_health_widget'],
      'debugging': ['error_tracking_widget', 'log_analysis_widget']
    };

    return workflowWidgets[workflowName] || [];
  }

  private getWidgetsByCategory(category: WidgetCategory): WidgetDefinition[] {
    return Array.from(this.widgetRegistry.values())
      .filter(widget => widget.category === category);
  }

  private getPhaseSpecificWidgets(phase: string): string[] {
    const phaseWidgets: Record<string, string[]> = {
      'planning': ['milestone_tracker_widget', 'resource_allocation_widget'],
      'development': ['code_quality_widget', 'task_manager_widget'],
      'testing': ['test_coverage_widget', 'bug_tracker_widget'],
      'deployment': ['deployment_status_widget', 'environment_health_widget']
    };

    return phaseWidgets[phase] || [];
  }

  private suggestPosition(availableSpace: { width: number; height: number }, index: number): { x: number; y: number } {
    const cols = Math.floor(availableSpace.width / 2);
    return {
      x: index % cols,
      y: Math.floor(index / cols)
    };
  }

  private calculateStarterPosition(index: number, deviceType: DeviceType): { x: number; y: number } {
    const cols = deviceType === 'mobile' ? 1 : deviceType === 'tablet' ? 2 : 3;
    return {
      x: index % cols,
      y: Math.floor(index / cols)
    };
  }

  private getDefaultSize(widgetId: string, deviceType: DeviceType): { width: number; height: number } {
    const widget = this.widgetRegistry.get(widgetId);
    if (!widget) {
      return { width: 2, height: 2 };
    }

    let size = { ...widget.defaultSize };

    // Adjust for device type
    if (deviceType === 'mobile') {
      size.width = Math.min(size.width, 2);
    }

    return size;
  }

  private calculateAverageSessionDuration(interactions: UserInteractionEvent[]): number {
    const durationsWithValue = interactions.filter(i => i.duration).map(i => i.duration!);
    return durationsWithValue.length > 0 
      ? durationsWithValue.reduce((sum, d) => sum + d, 0) / durationsWithValue.length 
      : 0;
  }

  private initializeWidgetRegistry(): void {
    const widgets: WidgetDefinition[] = [
      {
        id: 'code_quality_widget',
        name: 'Code Quality Dashboard',
        description: 'Shows code quality metrics and trends',
        category: 'development',
        defaultSize: { width: 2, height: 2 },
        minSize: { width: 2, height: 2 },
        maxSize: { width: 4, height: 3 },
        supportedRoles: ['developer', 'team_lead'],
        deviceCompatibility: ['desktop', 'tablet'],
        dependencies: [],
        configuration: {
          showTrends: { type: 'boolean', default: true },
          timeRange: { type: 'select', default: '7d', options: ['1d', '7d', '30d'] },
          metrics: { type: 'multiselect', default: ['complexity', 'coverage'], options: ['complexity', 'coverage', 'duplication'] }
        }
      },
      {
        id: 'task_manager_widget',
        name: 'Task Manager',
        description: 'Track and manage development tasks',
        category: 'productivity',
        defaultSize: { width: 2, height: 3 },
        minSize: { width: 2, height: 2 },
        maxSize: { width: 3, height: 4 },
        supportedRoles: ['developer', 'team_lead', 'manager'],
        deviceCompatibility: ['desktop', 'tablet', 'mobile'],
        dependencies: [],
        configuration: {
          showCompleted: { type: 'boolean', default: false },
          groupBy: { type: 'select', default: 'priority', options: ['priority', 'assignee', 'status'] },
          compactMode: { type: 'boolean', default: false }
        }
      },
      {
        id: 'team_activity_widget',
        name: 'Team Activity',
        description: 'Overview of team member activities',
        category: 'collaboration',
        defaultSize: { width: 3, height: 2 },
        minSize: { width: 2, height: 2 },
        maxSize: { width: 4, height: 3 },
        supportedRoles: ['team_lead', 'manager'],
        deviceCompatibility: ['desktop', 'tablet'],
        dependencies: [],
        configuration: {
          showAvatars: { type: 'boolean', default: true },
          timeRange: { type: 'select', default: '24h', options: ['1h', '24h', '7d'] },
          activityTypes: { type: 'multiselect', default: ['commits', 'reviews'], options: ['commits', 'reviews', 'deployments'] }
        }
      }
      // Add more widget definitions...
    ];

    widgets.forEach(widget => {
      this.widgetRegistry.set(widget.id, widget);
    });
  }

  private initializeRoleProfiles(): void {
    this.roleProfiles.set('developer', {
      essentialWidgets: ['code_quality_widget', 'task_manager_widget'],
      recommendedWidgets: ['performance_dashboard_widget', 'error_tracking_widget', 'test_coverage_widget'],
      preferredCategories: ['development', 'productivity', 'monitoring']
    });

    this.roleProfiles.set('team_lead', {
      essentialWidgets: ['team_activity_widget', 'task_manager_widget'],
      recommendedWidgets: ['code_quality_widget', 'milestone_tracker_widget', 'resource_allocation_widget'],
      preferredCategories: ['collaboration', 'management', 'productivity']
    });

    this.roleProfiles.set('manager', {
      essentialWidgets: ['team_performance_widget', 'milestone_tracker_widget'],
      recommendedWidgets: ['resource_allocation_widget', 'analytics_summary_widget'],
      preferredCategories: ['management', 'analytics']
    });

    this.roleProfiles.set('admin', {
      essentialWidgets: ['system_health_widget', 'user_management_widget'],
      recommendedWidgets: ['security_dashboard_widget', 'audit_log_widget'],
      preferredCategories: ['monitoring', 'management']
    });
  }
}

interface WidgetUsagePattern {
  widgetId: string;
  userId: string;
  totalInteractions: number;
  averageSessionDuration: number;
  preferredTimeSlots: number[];
  deviceUsage: { desktop: number; tablet: number; mobile: number };
  configurationPreferences: Record<string, any>;
  satisfactionScore: number;
  lastUpdated: Date;
}

interface RoleProfile {
  essentialWidgets: string[];
  recommendedWidgets: string[];
  preferredCategories: WidgetCategory[];
}

interface WidgetPerformanceMetrics {
  engagementScore: number;
  averageViewTime: number;
  interactionRate: number;
  userSatisfaction: number;
}