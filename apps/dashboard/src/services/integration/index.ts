/**
 * Integration Service
 * 
 * Main entry point for UX integration functionality.
 * Provides a unified interface for managing UX improvements integration.
 */

import { UXIntegrationManager, UXFeature, IntegrationConfig } from './UXIntegrationManager';
import { FeatureFlagManager, FeatureFlagContext } from './FeatureFlagManager';
import { MigrationManager, MigrationSettings } from './MigrationManager';
import { CompatibilityLayer } from './CompatibilityLayer';
import { IntegrationValidator, ValidationReport } from './IntegrationValidator';

// Re-export types for convenience
export type {
  UXFeature,
  IntegrationConfig,
  FeatureFlagContext,
  MigrationSettings,
  ValidationReport
};

export {
  UXIntegrationManager,
  FeatureFlagManager,
  MigrationManager,
  CompatibilityLayer,
  IntegrationValidator
};

/**
 * Integration Service Class
 * 
 * Provides a high-level interface for managing UX integration
 */
export class IntegrationService {
  private static instance: IntegrationService;
  private integrationManager: UXIntegrationManager;
  private initialized = false;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): IntegrationService {
    if (!IntegrationService.instance) {
      IntegrationService.instance = new IntegrationService();
    }
    return IntegrationService.instance;
  }

  /**
   * Initialize the integration service
   */
  async initialize(config?: Partial<IntegrationConfig>): Promise<void> {
    if (this.initialized) {
      return;
    }

    const defaultConfig: IntegrationConfig = {
      enabledFeatures: ['accessibility-enhancements', 'performance-optimizations'],
      migrationSettings: {
        batchSize: 10,
        retryAttempts: 3,
        rollbackOnError: true
      },
      compatibilityMode: 'auto',
      telemetryEnabled: true
    };

    const finalConfig = { ...defaultConfig, ...config };
    this.integrationManager = new UXIntegrationManager(finalConfig);

    // Set up event listeners
    this.setupEventListeners();

    this.initialized = true;
  }

  /**
   * Set up event listeners for integration events
   */
  private setupEventListeners(): void {
    this.integrationManager.on('integration_event', (event) => {
      console.log('Integration event:', event);
      
      // Emit custom events for different types
      switch (event.type) {
        case 'feature_enabled':
          this.emitCustomEvent('ux-feature-enabled', event);
          break;
        case 'feature_disabled':
          this.emitCustomEvent('ux-feature-disabled', event);
          break;
        case 'migration_started':
          this.emitCustomEvent('ux-migration-started', event);
          break;
        case 'migration_completed':
          this.emitCustomEvent('ux-migration-completed', event);
          break;
        case 'compatibility_issue':
          this.emitCustomEvent('ux-compatibility-issue', event);
          break;
      }
    });
  }

  /**
   * Emit custom DOM events
   */
  private emitCustomEvent(eventName: string, detail: any): void {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent(eventName, { detail });
      window.dispatchEvent(event);
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Enable a UX feature
   */
  async enableFeature(featureId: string, userId?: string): Promise<boolean> {
    this.ensureInitialized();
    return this.integrationManager.enableFeature(featureId, userId);
  }

  /**
   * Disable a UX feature
   */
  async disableFeature(featureId: string, userId?: string): Promise<boolean> {
    this.ensureInitialized();
    return this.integrationManager.disableFeature(featureId, userId);
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(featureId: string): boolean {
    this.ensureInitialized();
    return this.integrationManager.isFeatureEnabled(featureId);
  }

  /**
   * Get all available features
   */
  getAvailableFeatures(): UXFeature[] {
    this.ensureInitialized();
    return this.integrationManager.getAvailableFeatures();
  }

  /**
   * Get enabled features
   */
  getEnabledFeatures(): UXFeature[] {
    this.ensureInitialized();
    return this.integrationManager.getEnabledFeatures();
  }

  /**
   * Get feature configuration
   */
  getFeatureConfig(featureId: string): UXFeature | undefined {
    this.ensureInitialized();
    return this.integrationManager.getFeatureConfig(featureId);
  }

  /**
   * Get integration status
   */
  getIntegrationStatus(): { [featureId: string]: any } {
    this.ensureInitialized();
    return this.integrationManager.getIntegrationStatus();
  }

  /**
   * Validate integration
   */
  async validateIntegration(): Promise<ValidationReport> {
    this.ensureInitialized();
    return this.integrationManager.validateIntegration();
  }

  /**
   * Get feature flag context from current environment
   */
  getFeatureFlagContext(userId?: string): FeatureFlagContext {
    const context: FeatureFlagContext = {
      userId,
      timestamp: new Date()
    };

    // Add device type detection
    if (typeof window !== 'undefined') {
      context.deviceType = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
      context.browser = this.detectBrowser();
    }

    // Add user attributes if available
    if (userId) {
      const userAttributes = this.getUserAttributes(userId);
      if (userAttributes) {
        context.userAttributes = userAttributes;
      }
    }

    return context;
  }

  /**
   * Detect browser type
   */
  private detectBrowser(): string {
    if (typeof window === 'undefined') return 'unknown';
    
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'unknown';
  }

  /**
   * Get user attributes (mock implementation)
   */
  private getUserAttributes(userId: string): Record<string, any> | null {
    try {
      const stored = localStorage.getItem(`devflow_user_attributes_${userId}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * Enable multiple features with dependency resolution
   */
  async enableFeatures(featureIds: string[], userId?: string): Promise<{ [featureId: string]: boolean }> {
    this.ensureInitialized();
    
    const results: { [featureId: string]: boolean } = {};
    const features = this.integrationManager.getAvailableFeatures();
    
    // Sort features by dependency order
    const sortedFeatureIds = this.sortByDependencies(featureIds, features);
    
    for (const featureId of sortedFeatureIds) {
      try {
        results[featureId] = await this.integrationManager.enableFeature(featureId, userId);
      } catch (error) {
        console.error(`Failed to enable feature ${featureId}:`, error);
        results[featureId] = false;
      }
    }
    
    return results;
  }

  /**
   * Sort feature IDs by dependency order
   */
  private sortByDependencies(featureIds: string[], features: UXFeature[]): string[] {
    const featureMap = new Map(features.map(f => [f.id, f]));
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (featureId: string) => {
      if (visited.has(featureId) || !featureIds.includes(featureId)) {
        return;
      }

      visited.add(featureId);
      const feature = featureMap.get(featureId);
      
      if (feature) {
        // Visit dependencies first
        for (const depId of feature.dependencies) {
          visit(depId);
        }
      }

      result.push(featureId);
    };

    for (const featureId of featureIds) {
      visit(featureId);
    }

    return result;
  }

  /**
   * Get feature recommendations based on current state
   */
  getFeatureRecommendations(userId?: string): {
    recommended: UXFeature[];
    reasons: { [featureId: string]: string[] };
  } {
    this.ensureInitialized();
    
    const availableFeatures = this.integrationManager.getAvailableFeatures();
    const enabledFeatures = this.integrationManager.getEnabledFeatures();
    const enabledIds = new Set(enabledFeatures.map(f => f.id));
    
    const recommended: UXFeature[] = [];
    const reasons: { [featureId: string]: string[] } = {};

    for (const feature of availableFeatures) {
      if (enabledIds.has(feature.id)) {
        continue;
      }

      const featureReasons: string[] = [];

      // Check if dependencies are met
      const dependenciesMet = feature.dependencies.every(depId => enabledIds.has(depId));
      if (!dependenciesMet) {
        continue;
      }

      // Recommend based on enabled features
      if (enabledIds.has('accessibility-enhancements') && feature.id === 'adaptive-navigation') {
        featureReasons.push('Complements accessibility enhancements');
      }

      if (enabledIds.has('design-system-v2') && feature.id === 'responsive-layout-engine') {
        featureReasons.push('Works well with the new design system');
      }

      if (enabledIds.has('personalization-engine') && feature.id === 'collaboration-features') {
        featureReasons.push('Enhances personalized collaboration experience');
      }

      // Recommend based on user context
      const context = this.getFeatureFlagContext(userId);
      if (context.deviceType === 'mobile' && feature.id === 'mobile-optimizations') {
        featureReasons.push('Optimized for mobile devices');
      }

      if (featureReasons.length > 0) {
        recommended.push(feature);
        reasons[feature.id] = featureReasons;
      }
    }

    return { recommended, reasons };
  }

  /**
   * Get integration health status
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    issues: string[];
    warnings: string[];
    recommendations: string[];
  }> {
    this.ensureInitialized();
    
    const validation = await this.integrationManager.validateIntegration();
    const status = this.integrationManager.getIntegrationStatus();
    
    const issues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check validation results
    if (!validation.valid) {
      issues.push(...validation.issues);
    }
    warnings.push(...validation.issues);

    // Check feature compatibility
    for (const [featureId, featureStatus] of Object.entries(status)) {
      if (featureStatus.feature.enabled && !featureStatus.compatible) {
        issues.push(`Feature ${featureId} is enabled but not compatible`);
      }

      if (featureStatus.feature.enabled && !featureStatus.dependenciesMet) {
        issues.push(`Feature ${featureId} has unmet dependencies`);
      }
    }

    // Add recommendations
    const featureRecommendations = this.getFeatureRecommendations();
    if (featureRecommendations.recommended.length > 0) {
      recommendations.push(`Consider enabling: ${featureRecommendations.recommended.map(f => f.name).join(', ')}`);
    }

    return {
      healthy: issues.length === 0,
      issues,
      warnings,
      recommendations
    };
  }

  /**
   * Export integration configuration
   */
  exportConfiguration(): string {
    this.ensureInitialized();
    
    const config = {
      features: this.integrationManager.getAvailableFeatures(),
      enabledFeatures: this.integrationManager.getEnabledFeatures().map(f => f.id),
      integrationStatus: this.integrationManager.getIntegrationStatus(),
      timestamp: new Date().toISOString()
    };

    return JSON.stringify(config, null, 2);
  }

  /**
   * Reset integration to default state
   */
  async reset(): Promise<void> {
    this.ensureInitialized();
    
    // Disable all features
    const enabledFeatures = this.integrationManager.getEnabledFeatures();
    for (const feature of enabledFeatures) {
      try {
        await this.integrationManager.disableFeature(feature.id);
      } catch (error) {
        console.warn(`Failed to disable feature ${feature.id}:`, error);
      }
    }

    // Clear local storage
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('devflow_')) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('IntegrationService must be initialized before use');
    }
  }

  /**
   * Dispose of the service
   */
  dispose(): void {
    if (this.integrationManager) {
      this.integrationManager.dispose();
    }
    this.initialized = false;
  }
}

// Create and export singleton instance
export const integrationService = IntegrationService.getInstance();

// Export convenience functions
export const enableUXFeature = (featureId: string, userId?: string) => 
  integrationService.enableFeature(featureId, userId);

export const disableUXFeature = (featureId: string, userId?: string) => 
  integrationService.disableFeature(featureId, userId);

export const isUXFeatureEnabled = (featureId: string) => 
  integrationService.isFeatureEnabled(featureId);

export const getUXFeatures = () => 
  integrationService.getAvailableFeatures();

export const getEnabledUXFeatures = () => 
  integrationService.getEnabledFeatures();

export const validateUXIntegration = () => 
  integrationService.validateIntegration();

export const getUXIntegrationStatus = () => 
  integrationService.getIntegrationStatus();

export const getUXFeatureRecommendations = (userId?: string) => 
  integrationService.getFeatureRecommendations(userId);

export const getUXIntegrationHealth = () => 
  integrationService.getHealthStatus();

// Initialize with default configuration on import
if (typeof window !== 'undefined') {
  integrationService.initialize().catch(console.error);
}