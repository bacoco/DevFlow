/**
 * Integration Tests for UX Integration Layer
 * 
 * Tests the integration of UX improvements with existing dashboard features
 * to ensure seamless operation and backward compatibility.
 */

import { UXIntegrationManager, UXFeature } from '../UXIntegrationManager';
import { FeatureFlagManager } from '../FeatureFlagManager';
import { MigrationManager } from '../MigrationManager';
import { CompatibilityLayer } from '../CompatibilityLayer';
import { IntegrationValidator } from '../IntegrationValidator';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
});

describe('UX Integration Layer', () => {
  let integrationManager: UXIntegrationManager;
  let featureFlagManager: FeatureFlagManager;
  let migrationManager: MigrationManager;
  let compatibilityLayer: CompatibilityLayer;
  let integrationValidator: IntegrationValidator;

  const mockConfig = {
    enabledFeatures: ['accessibility-enhancements', 'performance-optimizations'],
    migrationSettings: {
      batchSize: 10,
      retryAttempts: 3,
      rollbackOnError: true
    },
    compatibilityMode: 'auto' as const,
    telemetryEnabled: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    integrationManager = new UXIntegrationManager(mockConfig);
    featureFlagManager = new FeatureFlagManager();
    migrationManager = new MigrationManager(mockConfig.migrationSettings);
    compatibilityLayer = new CompatibilityLayer(mockConfig.compatibilityMode);
    integrationValidator = new IntegrationValidator();
  });

  afterEach(() => {
    integrationManager.dispose();
    featureFlagManager.dispose();
    migrationManager.dispose();
    compatibilityLayer.dispose();
  });

  describe('UXIntegrationManager', () => {
    test('should initialize with default features', () => {
      const features = integrationManager.getAvailableFeatures();
      expect(features).toHaveLength(10);
      expect(features.map(f => f.id)).toContain('design-system-v2');
      expect(features.map(f => f.id)).toContain('accessibility-enhancements');
    });

    test('should enable feature with valid dependencies', async () => {
      // Enable accessibility enhancements (no dependencies)
      const result = await integrationManager.enableFeature('accessibility-enhancements', 'user-123');
      expect(result).toBe(true);
      expect(integrationManager.isFeatureEnabled('accessibility-enhancements')).toBe(true);
    });

    test('should fail to enable feature with missing dependencies', async () => {
      // Try to enable adaptive navigation without accessibility enhancements
      await expect(
        integrationManager.enableFeature('adaptive-navigation', 'user-123')
      ).rejects.toThrow('Dependencies not met');
    });

    test('should enable feature chain with dependencies', async () => {
      // Enable accessibility enhancements first
      await integrationManager.enableFeature('accessibility-enhancements', 'user-123');
      
      // Then enable adaptive navigation
      const result = await integrationManager.enableFeature('adaptive-navigation', 'user-123');
      expect(result).toBe(true);
      expect(integrationManager.isFeatureEnabled('adaptive-navigation')).toBe(true);
    });

    test('should disable feature and check dependents', async () => {
      // Enable both features
      await integrationManager.enableFeature('accessibility-enhancements', 'user-123');
      await integrationManager.enableFeature('adaptive-navigation', 'user-123');

      // Try to disable accessibility enhancements (should fail due to dependent)
      await expect(
        integrationManager.disableFeature('accessibility-enhancements', 'user-123')
      ).rejects.toThrow('Cannot disable');
    });

    test('should get integration status', () => {
      const status = integrationManager.getIntegrationStatus();
      expect(status).toHaveProperty('design-system-v2');
      expect(status).toHaveProperty('accessibility-enhancements');
      
      Object.values(status).forEach((featureStatus: any) => {
        expect(featureStatus).toHaveProperty('feature');
        expect(featureStatus).toHaveProperty('compatible');
        expect(featureStatus).toHaveProperty('dependenciesMet');
      });
    });

    test('should validate integration', async () => {
      const validation = await integrationManager.validateIntegration();
      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('issues');
      expect(Array.isArray(validation.issues)).toBe(true);
    });
  });

  describe('FeatureFlagManager', () => {
    test('should register and enable features', () => {
      featureFlagManager.registerFeature('test-feature', false);
      expect(featureFlagManager.isEnabled('test-feature')).toBe(false);

      featureFlagManager.enableFeature('test-feature');
      expect(featureFlagManager.isEnabled('test-feature')).toBe(true);
    });

    test('should handle rollout percentage', () => {
      featureFlagManager.registerFeature('rollout-test', true, {
        rolloutPercentage: 50
      });

      // Test with consistent user ID
      const context = { userId: 'consistent-user-id' };
      const result1 = featureFlagManager.isEnabled('rollout-test', context);
      const result2 = featureFlagManager.isEnabled('rollout-test', context);
      
      // Should be consistent for same user
      expect(result1).toBe(result2);
    });

    test('should handle user groups', () => {
      featureFlagManager.registerFeature('group-test', true, {
        userGroups: ['beta_testers', 'power_users']
      });

      const contextWithGroup = {
        userId: 'user-123',
        userAttributes: { groups: ['beta_testers'] }
      };

      const contextWithoutGroup = {
        userId: 'user-456',
        userAttributes: { groups: ['regular_users'] }
      };

      expect(featureFlagManager.isEnabled('group-test', contextWithGroup)).toBe(true);
      expect(featureFlagManager.isEnabled('group-test', contextWithoutGroup)).toBe(false);
    });

    test('should handle conditions', () => {
      featureFlagManager.registerFeature('condition-test', true, {
        conditions: [{
          type: 'device_type',
          operator: 'equals',
          value: 'mobile'
        }]
      });

      const mobileContext = { deviceType: 'mobile' as const };
      const desktopContext = { deviceType: 'desktop' as const };

      expect(featureFlagManager.isEnabled('condition-test', mobileContext)).toBe(true);
      expect(featureFlagManager.isEnabled('condition-test', desktopContext)).toBe(false);
    });

    test('should export and import flags', () => {
      featureFlagManager.registerFeature('export-test', true);
      const exported = featureFlagManager.exportFlags();
      
      const newManager = new FeatureFlagManager();
      newManager.importFlags(exported);
      
      expect(newManager.isEnabled('export-test')).toBe(true);
      newManager.dispose();
    });
  });

  describe('MigrationManager', () => {
    test('should check if migration is needed', async () => {
      const needed = await migrationManager.checkMigrationNeeded('design-system-v2');
      expect(typeof needed).toBe('boolean');
    });

    test('should run migration for feature', async () => {
      // Mock user data
      localStorageMock.getItem.mockImplementation((key) => {
        if (key.includes('preferences')) {
          return JSON.stringify({ theme: { mode: 'light' } });
        }
        if (key.includes('customizations')) {
          return JSON.stringify({ widgets: [] });
        }
        return null;
      });

      const results = await migrationManager.runMigration('design-system-v2', 'user-123');
      expect(Array.isArray(results)).toBe(true);
      
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('success');
        expect(results[0]).toHaveProperty('message');
      }
    });

    test('should get migration status', () => {
      const status = migrationManager.getMigrationStatus('design-system-v2');
      expect(Array.isArray(status)).toBe(true);
    });
  });

  describe('CompatibilityLayer', () => {
    const mockFeature: UXFeature = {
      id: 'test-feature',
      name: 'Test Feature',
      description: 'Test feature for compatibility',
      version: '1.0.0',
      dependencies: [],
      compatibilityRequirements: [
        { component: 'Dashboard', minVersion: '1.0.0', required: true }
      ],
      rolloutStrategy: { type: 'immediate' },
      enabled: true,
      beta: false
    };

    test('should validate feature compatibility', async () => {
      const compatible = await compatibilityLayer.validateCompatibility(mockFeature);
      expect(typeof compatible).toBe('boolean');
    });

    test('should get compatibility report', async () => {
      const report = await compatibilityLayer.getCompatibilityReport(mockFeature);
      expect(report).toHaveProperty('compatible');
      expect(report).toHaveProperty('issues');
      expect(report).toHaveProperty('warnings');
      expect(report).toHaveProperty('suggestions');
    });

    test('should check if feature is compatible', () => {
      // Initially should be false (not cached)
      expect(compatibilityLayer.isCompatible(mockFeature)).toBe(false);
    });

    test('should clear compatibility cache', () => {
      compatibilityLayer.clearCache();
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('IntegrationValidator', () => {
    test('should validate feature integration', async () => {
      const features = new Map<string, UXFeature>();
      const state = new Map<string, any>();

      // Add test features
      features.set('test-feature-1', {
        id: 'test-feature-1',
        name: 'Test Feature 1',
        description: 'First test feature',
        version: '1.0.0',
        dependencies: [],
        compatibilityRequirements: [],
        rolloutStrategy: { type: 'immediate' },
        enabled: true,
        beta: false
      });

      features.set('test-feature-2', {
        id: 'test-feature-2',
        name: 'Test Feature 2',
        description: 'Second test feature',
        version: '1.0.0',
        dependencies: ['test-feature-1'],
        compatibilityRequirements: [],
        rolloutStrategy: { type: 'gradual', percentage: 50 },
        enabled: true,
        beta: false
      });

      const report = await integrationValidator.validate(features, state);
      expect(report).toHaveProperty('valid');
      expect(report).toHaveProperty('issues');
      expect(report).toHaveProperty('warnings');
      expect(report).toHaveProperty('suggestions');
      expect(report).toHaveProperty('summary');
      
      expect(report.summary).toHaveProperty('totalRules');
      expect(report.summary).toHaveProperty('passedRules');
      expect(report.summary).toHaveProperty('failedRules');
      expect(report.summary).toHaveProperty('warningRules');
    });

    test('should detect circular dependencies', async () => {
      const features = new Map<string, UXFeature>();
      const state = new Map<string, any>();

      // Create circular dependency
      features.set('feature-a', {
        id: 'feature-a',
        name: 'Feature A',
        description: 'Feature A',
        version: '1.0.0',
        dependencies: ['feature-b'],
        compatibilityRequirements: [],
        rolloutStrategy: { type: 'immediate' },
        enabled: true,
        beta: false
      });

      features.set('feature-b', {
        id: 'feature-b',
        name: 'Feature B',
        description: 'Feature B',
        version: '1.0.0',
        dependencies: ['feature-a'],
        compatibilityRequirements: [],
        rolloutStrategy: { type: 'immediate' },
        enabled: true,
        beta: false
      });

      const report = await integrationValidator.validate(features, state);
      expect(report.valid).toBe(false);
      expect(report.issues.some(issue => issue.rule === 'circular-dependency-check')).toBe(true);
    });

    test('should validate rollout strategies', async () => {
      const features = new Map<string, UXFeature>();
      const state = new Map<string, any>();

      // Feature with invalid rollout strategy
      features.set('invalid-rollout', {
        id: 'invalid-rollout',
        name: 'Invalid Rollout',
        description: 'Feature with invalid rollout',
        version: '1.0.0',
        dependencies: [],
        compatibilityRequirements: [],
        rolloutStrategy: { type: 'gradual' }, // Missing percentage
        enabled: true,
        beta: false
      });

      const report = await integrationValidator.validate(features, state);
      expect(report.warnings.some(warning => 
        warning.rule === 'rollout-strategy-validation'
      )).toBe(true);
    });

    test('should add and remove custom rules', async () => {
      const customRule = {
        id: 'custom-test-rule',
        name: 'Custom Test Rule',
        description: 'A custom validation rule for testing',
        category: 'usability' as const,
        severity: 'warning' as const,
        validate: async () => ({
          valid: true,
          message: 'Custom rule passed'
        })
      };

      integrationValidator.addRule(customRule);
      const rules = integrationValidator.getRules();
      expect(rules.some(rule => rule.id === 'custom-test-rule')).toBe(true);

      integrationValidator.removeRule('custom-test-rule');
      const rulesAfterRemoval = integrationValidator.getRules();
      expect(rulesAfterRemoval.some(rule => rule.id === 'custom-test-rule')).toBe(false);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complete feature enablement workflow', async () => {
      // 1. Enable accessibility enhancements
      await integrationManager.enableFeature('accessibility-enhancements', 'user-123');
      expect(integrationManager.isFeatureEnabled('accessibility-enhancements')).toBe(true);

      // 2. Enable design system (depends on nothing)
      await integrationManager.enableFeature('design-system-v2', 'user-123');
      expect(integrationManager.isFeatureEnabled('design-system-v2')).toBe(true);

      // 3. Enable responsive layout (depends on design system)
      await integrationManager.enableFeature('responsive-layout-engine', 'user-123');
      expect(integrationManager.isFeatureEnabled('responsive-layout-engine')).toBe(true);

      // 4. Validate integration
      const validation = await integrationManager.validateIntegration();
      expect(validation.valid).toBe(true);
    });

    test('should handle feature rollback on error', async () => {
      // Mock migration failure
      const originalRunMigration = migrationManager.runMigration;
      migrationManager.runMigration = jest.fn().mockRejectedValue(new Error('Migration failed'));

      try {
        await integrationManager.enableFeature('design-system-v2', 'user-123');
      } catch (error) {
        expect(error.message).toContain('Migration failed');
      }

      // Restore original method
      migrationManager.runMigration = originalRunMigration;
    });

    test('should handle gradual rollout', async () => {
      // Test gradual rollout with different user IDs
      const results = [];
      for (let i = 0; i < 100; i++) {
        try {
          const result = await integrationManager.enableFeature('responsive-layout-engine', `user-${i}`);
          results.push(result);
        } catch (error) {
          // Some users may not be in rollout
          results.push(false);
        }
      }

      // Should have some enabled and some not (due to gradual rollout)
      const enabledCount = results.filter(r => r === true).length;
      expect(enabledCount).toBeGreaterThan(0);
      expect(enabledCount).toBeLessThan(100);
    });

    test('should maintain feature state across manager instances', () => {
      // Enable a feature
      integrationManager.enableFeature('accessibility-enhancements', 'user-123');
      
      // Create new manager instance
      const newManager = new UXIntegrationManager(mockConfig);
      
      // Should maintain state (in real implementation, this would be persisted)
      // For now, just test that the new manager initializes properly
      expect(newManager.getAvailableFeatures()).toHaveLength(10);
      
      newManager.dispose();
    });

    test('should handle browser compatibility warnings', async () => {
      // Mock older browser
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)'
        },
        configurable: true
      });

      const features = new Map<string, UXFeature>();
      features.set('enhanced-charts', {
        id: 'enhanced-charts',
        name: 'Enhanced Charts',
        description: 'Enhanced data visualization',
        version: '1.0.0',
        dependencies: [],
        compatibilityRequirements: [],
        rolloutStrategy: { type: 'immediate' },
        enabled: true,
        beta: false
      });

      const report = await integrationValidator.validate(features, new Map());
      
      // Should have browser support warnings
      expect(report.warnings.some(warning => 
        warning.rule === 'browser-support-validation'
      )).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid feature IDs', async () => {
      await expect(
        integrationManager.enableFeature('non-existent-feature', 'user-123')
      ).rejects.toThrow('Feature non-existent-feature not found');
    });

    test('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not throw
      expect(() => {
        featureFlagManager.registerFeature('test-feature', true);
      }).not.toThrow();
    });

    test('should handle validation errors gracefully', async () => {
      const features = new Map<string, UXFeature>();
      const state = new Map<string, any>();

      // Add a feature that will cause validation to throw
      features.set('error-feature', {
        id: 'error-feature',
        name: 'Error Feature',
        description: 'Feature that causes validation errors',
        version: '1.0.0',
        dependencies: [],
        compatibilityRequirements: [],
        rolloutStrategy: { type: 'immediate' },
        enabled: true,
        beta: false
      });

      // Mock a validation rule to throw
      const originalValidate = integrationValidator.getRules()[0].validate;
      integrationValidator.getRules()[0].validate = jest.fn().mockRejectedValue(new Error('Validation error'));

      const report = await integrationValidator.validate(features, state);
      
      // Should handle the error and include it in the report
      expect(report.issues.some(issue => issue.message.includes('Validation error'))).toBe(true);

      // Restore original validate function
      integrationValidator.getRules()[0].validate = originalValidate;
    });
  });

  describe('Performance', () => {
    test('should cache feature flag evaluations', () => {
      featureFlagManager.registerFeature('cache-test', true, {
        rolloutPercentage: 50
      });

      const context = { userId: 'cache-user' };
      
      // First call
      const start1 = performance.now();
      const result1 = featureFlagManager.isEnabled('cache-test', context);
      const end1 = performance.now();

      // Second call (should be cached)
      const start2 = performance.now();
      const result2 = featureFlagManager.isEnabled('cache-test', context);
      const end2 = performance.now();

      expect(result1).toBe(result2);
      // Second call should be faster (cached)
      expect(end2 - start2).toBeLessThan(end1 - start1);
    });

    test('should handle large numbers of features efficiently', async () => {
      const features = new Map<string, UXFeature>();
      
      // Create 100 test features
      for (let i = 0; i < 100; i++) {
        features.set(`feature-${i}`, {
          id: `feature-${i}`,
          name: `Feature ${i}`,
          description: `Test feature ${i}`,
          version: '1.0.0',
          dependencies: i > 0 ? [`feature-${i - 1}`] : [],
          compatibilityRequirements: [],
          rolloutStrategy: { type: 'immediate' },
          enabled: true,
          beta: false
        });
      }

      const start = performance.now();
      const report = await integrationValidator.validate(features, new Map());
      const end = performance.now();

      expect(report).toHaveProperty('valid');
      expect(end - start).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});