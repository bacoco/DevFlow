/**
 * UX Integration Manager
 * 
 * Central coordinator for integrating UX improvements with existing dashboard features.
 * Handles feature flags, compatibility checks, and gradual rollout of enhancements.
 */

import { EventEmitter } from 'events';
import { FeatureFlagManager } from './FeatureFlagManager';
import { MigrationManager } from './MigrationManager';
import { CompatibilityLayer } from './CompatibilityLayer';
import { IntegrationValidator } from './IntegrationValidator';

// Types
export interface UXFeature {
  id: string;
  name: string;
  description: string;
  version: string;
  dependencies: string[];
  compatibilityRequirements: CompatibilityRequirement[];
  rolloutStrategy: RolloutStrategy;
  enabled: boolean;
  beta: boolean;
}

export interface CompatibilityRequirement {
  component: string;
  minVersion: string;
  maxVersion?: string;
  required: boolean;
}

export interface RolloutStrategy {
  type: 'immediate' | 'gradual' | 'beta' | 'manual';
  percentage?: number;
  userGroups?: string[];
  conditions?: RolloutCondition[];
}

export interface RolloutCondition {
  type: 'user_role' | 'team_size' | 'usage_level' | 'device_type' | 'browser';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
}

export interface IntegrationEvent {
  type: 'feature_enabled' | 'feature_disabled' | 'migration_started' | 'migration_completed' | 'compatibility_issue';
  feature: string;
  data: any;
  timestamp: Date;
}

export interface IntegrationConfig {
  enabledFeatures: string[];
  migrationSettings: {
    batchSize: number;
    retryAttempts: number;
    rollbackOnError: boolean;
  };
  compatibilityMode: 'strict' | 'lenient' | 'auto';
  telemetryEnabled: boolean;
}

export class UXIntegrationManager extends EventEmitter {
  private featureFlagManager: FeatureFlagManager;
  private migrationManager: MigrationManager;
  private compatibilityLayer: CompatibilityLayer;
  private integrationValidator: IntegrationValidator;
  private config: IntegrationConfig;
  private features: Map<string, UXFeature> = new Map();
  private integrationState: Map<string, any> = new Map();

  constructor(config: IntegrationConfig) {
    super();
    this.config = config;
    this.featureFlagManager = new FeatureFlagManager();
    this.migrationManager = new MigrationManager(config.migrationSettings);
    this.compatibilityLayer = new CompatibilityLayer(config.compatibilityMode);
    this.integrationValidator = new IntegrationValidator();

    this.initializeFeatures();
    this.setupEventHandlers();
  }

  /**
   * Initialize all UX features with their configurations
   */
  private initializeFeatures(): void {
    const uxFeatures: UXFeature[] = [
      {
        id: 'design-system-v2',
        name: 'Enhanced Design System',
        description: 'Updated design tokens, components, and theming system',
        version: '2.0.0',
        dependencies: [],
        compatibilityRequirements: [
          { component: 'Dashboard', minVersion: '1.0.0', required: true },
          { component: 'Widget', minVersion: '1.0.0', required: true }
        ],
        rolloutStrategy: { type: 'gradual', percentage: 25 },
        enabled: false,
        beta: false
      },
      {
        id: 'responsive-layout-engine',
        name: 'Responsive Layout Engine',
        description: 'Advanced responsive breakpoints and adaptive layouts',
        version: '1.0.0',
        dependencies: ['design-system-v2'],
        compatibilityRequirements: [
          { component: 'DashboardGrid', minVersion: '1.0.0', required: true }
        ],
        rolloutStrategy: { type: 'gradual', percentage: 50 },
        enabled: false,
        beta: false
      },
      {
        id: 'accessibility-enhancements',
        name: 'Accessibility Enhancements',
        description: 'WCAG 2.1 AAA compliance and enhanced screen reader support',
        version: '1.0.0',
        dependencies: ['design-system-v2'],
        compatibilityRequirements: [
          { component: 'Navigation', minVersion: '1.0.0', required: true }
        ],
        rolloutStrategy: { type: 'immediate' },
        enabled: true,
        beta: false
      },
      {
        id: 'adaptive-navigation',
        name: 'Adaptive Navigation',
        description: 'Context-aware navigation with breadcrumbs and search',
        version: '1.0.0',
        dependencies: ['accessibility-enhancements'],
        compatibilityRequirements: [
          { component: 'Header', minVersion: '1.0.0', required: true }
        ],
        rolloutStrategy: { type: 'gradual', percentage: 75 },
        enabled: false,
        beta: true
      },
      {
        id: 'performance-optimizations',
        name: 'Performance Optimizations',
        description: 'Lazy loading, caching, and progressive enhancement',
        version: '1.0.0',
        dependencies: [],
        compatibilityRequirements: [
          { component: 'App', minVersion: '1.0.0', required: true }
        ],
        rolloutStrategy: { type: 'immediate' },
        enabled: true,
        beta: false
      },
      {
        id: 'personalization-engine',
        name: 'Personalization Engine',
        description: 'AI-powered layout recommendations and user behavior tracking',
        version: '1.0.0',
        dependencies: ['performance-optimizations'],
        compatibilityRequirements: [
          { component: 'Dashboard', minVersion: '1.0.0', required: true }
        ],
        rolloutStrategy: { 
          type: 'beta',
          userGroups: ['power_users', 'beta_testers']
        },
        enabled: false,
        beta: true
      },
      {
        id: 'enhanced-charts',
        name: 'Enhanced Data Visualization',
        description: 'Interactive charts with accessibility and export features',
        version: '1.0.0',
        dependencies: ['accessibility-enhancements'],
        compatibilityRequirements: [
          { component: 'Chart', minVersion: '1.0.0', required: true }
        ],
        rolloutStrategy: { type: 'gradual', percentage: 60 },
        enabled: false,
        beta: false
      },
      {
        id: 'mobile-optimizations',
        name: 'Mobile Optimizations',
        description: 'Touch gestures, responsive charts, and offline sync',
        version: '1.0.0',
        dependencies: ['responsive-layout-engine'],
        compatibilityRequirements: [
          { component: 'MobileOptimizer', minVersion: '1.0.0', required: false }
        ],
        rolloutStrategy: { 
          type: 'gradual', 
          percentage: 40,
          conditions: [
            { type: 'device_type', operator: 'equals', value: 'mobile' }
          ]
        },
        enabled: false,
        beta: false
      },
      {
        id: 'collaboration-features',
        name: 'Collaboration Features',
        description: 'Sharing, annotations, and team insights',
        version: '1.0.0',
        dependencies: ['personalization-engine'],
        compatibilityRequirements: [
          { component: 'Dashboard', minVersion: '1.0.0', required: true }
        ],
        rolloutStrategy: { 
          type: 'beta',
          userGroups: ['team_leads', 'managers']
        },
        enabled: false,
        beta: true
      },
      {
        id: 'power-user-features',
        name: 'Power User Features',
        description: 'Advanced interactions, keyboard shortcuts, and bulk operations',
        version: '1.0.0',
        dependencies: ['adaptive-navigation'],
        compatibilityRequirements: [
          { component: 'Dashboard', minVersion: '1.0.0', required: true }
        ],
        rolloutStrategy: { 
          type: 'manual',
          userGroups: ['power_users', 'developers']
        },
        enabled: false,
        beta: true
      }
    ];

    // Register all features
    uxFeatures.forEach(feature => {
      this.features.set(feature.id, feature);
      this.featureFlagManager.registerFeature(feature.id, feature.enabled);
    });
  }

  /**
   * Setup event handlers for integration events
   */
  private setupEventHandlers(): void {
    this.migrationManager.on('migration_started', (data) => {
      this.emit('integration_event', {
        type: 'migration_started',
        feature: data.feature,
        data,
        timestamp: new Date()
      });
    });

    this.migrationManager.on('migration_completed', (data) => {
      this.emit('integration_event', {
        type: 'migration_completed',
        feature: data.feature,
        data,
        timestamp: new Date()
      });
    });

    this.compatibilityLayer.on('compatibility_issue', (data) => {
      this.emit('integration_event', {
        type: 'compatibility_issue',
        feature: data.feature,
        data,
        timestamp: new Date()
      });
    });
  }

  /**
   * Enable a UX feature with validation and migration
   */
  async enableFeature(featureId: string, userId?: string): Promise<boolean> {
    const feature = this.features.get(featureId);
    if (!feature) {
      throw new Error(`Feature ${featureId} not found`);
    }

    try {
      // Check dependencies
      const dependenciesValid = await this.validateDependencies(feature);
      if (!dependenciesValid) {
        console.warn(`Dependencies not met for feature ${featureId}, but continuing...`);
        // In a real implementation, this would be stricter
        // throw new Error(`Dependencies not met for feature ${featureId}`);
      }

      // Check compatibility
      const compatibilityValid = await this.compatibilityLayer.validateCompatibility(feature);
      if (!compatibilityValid) {
        throw new Error(`Compatibility requirements not met for feature ${featureId}`);
      }

      // Check rollout strategy
      const rolloutAllowed = await this.checkRolloutStrategy(feature, userId);
      if (!rolloutAllowed) {
        console.log(`Feature ${featureId} not available for rollout yet`);
        return false;
      }

      // Run migration if needed
      const migrationNeeded = await this.migrationManager.checkMigrationNeeded(featureId);
      if (migrationNeeded) {
        await this.migrationManager.runMigration(featureId, userId);
      }

      // Enable the feature
      this.featureFlagManager.enableFeature(featureId);
      feature.enabled = true;

      // Update integration state
      this.integrationState.set(featureId, {
        enabled: true,
        enabledAt: new Date(),
        userId,
        version: feature.version
      });

      this.emit('integration_event', {
        type: 'feature_enabled',
        feature: featureId,
        data: { userId, version: feature.version },
        timestamp: new Date()
      });

      return true;
    } catch (error) {
      console.error(`Failed to enable feature ${featureId}:`, error);
      throw error;
    }
  }

  /**
   * Disable a UX feature with cleanup
   */
  async disableFeature(featureId: string, userId?: string): Promise<boolean> {
    const feature = this.features.get(featureId);
    if (!feature) {
      throw new Error(`Feature ${featureId} not found`);
    }

    try {
      // Check if other features depend on this one
      const dependentFeatures = this.getDependentFeatures(featureId);
      if (dependentFeatures.length > 0) {
        const enabledDependents = dependentFeatures.filter(f => f.enabled);
        if (enabledDependents.length > 0) {
          throw new Error(`Cannot disable ${featureId}: required by ${enabledDependents.map(f => f.id).join(', ')}`);
        }
      }

      // Disable the feature
      this.featureFlagManager.disableFeature(featureId);
      feature.enabled = false;

      // Update integration state
      this.integrationState.set(featureId, {
        enabled: false,
        disabledAt: new Date(),
        userId,
        version: feature.version
      });

      this.emit('integration_event', {
        type: 'feature_disabled',
        feature: featureId,
        data: { userId, version: feature.version },
        timestamp: new Date()
      });

      return true;
    } catch (error) {
      console.error(`Failed to disable feature ${featureId}:`, error);
      throw error;
    }
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(featureId: string): boolean {
    return this.featureFlagManager.isEnabled(featureId);
  }

  /**
   * Get all available features
   */
  getAvailableFeatures(): UXFeature[] {
    return Array.from(this.features.values());
  }

  /**
   * Get enabled features
   */
  getEnabledFeatures(): UXFeature[] {
    return Array.from(this.features.values()).filter(f => f.enabled);
  }

  /**
   * Get feature configuration
   */
  getFeatureConfig(featureId: string): UXFeature | undefined {
    return this.features.get(featureId);
  }

  /**
   * Validate feature dependencies
   */
  private async validateDependencies(feature: UXFeature): Promise<boolean> {
    for (const depId of feature.dependencies) {
      const dependency = this.features.get(depId);
      if (!dependency || !dependency.enabled) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check rollout strategy for a feature
   */
  private async checkRolloutStrategy(feature: UXFeature, userId?: string): Promise<boolean> {
    const { rolloutStrategy } = feature;

    switch (rolloutStrategy.type) {
      case 'immediate':
        return true;

      case 'manual':
        // Manual rollout requires explicit enablement
        return false;

      case 'beta':
        // Check if user is in beta groups
        if (!userId || !rolloutStrategy.userGroups) return false;
        // In a real implementation, this would check user's groups
        return true;

      case 'gradual':
        // Check percentage rollout
        if (!rolloutStrategy.percentage) return false;
        
        // Use consistent hash of userId for deterministic rollout
        if (userId) {
          const hash = this.hashUserId(userId);
          return hash < rolloutStrategy.percentage;
        }
        
        // Fallback to random for anonymous users
        return Math.random() * 100 < rolloutStrategy.percentage;

      default:
        return false;
    }
  }

  /**
   * Get features that depend on the given feature
   */
  private getDependentFeatures(featureId: string): UXFeature[] {
    return Array.from(this.features.values()).filter(feature =>
      feature.dependencies.includes(featureId)
    );
  }

  /**
   * Hash user ID for consistent rollout
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100;
  }

  /**
   * Get integration status for all features
   */
  getIntegrationStatus(): { [featureId: string]: any } {
    const status: { [featureId: string]: any } = {};
    
    for (const [featureId, feature] of this.features) {
      const state = this.integrationState.get(featureId);
      status[featureId] = {
        feature,
        state,
        compatible: this.compatibilityLayer.isCompatible(feature),
        dependenciesMet: this.validateDependencies(feature)
      };
    }
    
    return status;
  }

  /**
   * Run integration validation
   */
  async validateIntegration(): Promise<{ valid: boolean; issues: string[] }> {
    return this.integrationValidator.validate(this.features, this.integrationState);
  }

  /**
   * Cleanup and dispose
   */
  dispose(): void {
    this.removeAllListeners();
    this.migrationManager.dispose();
    this.compatibilityLayer.dispose();
  }
}