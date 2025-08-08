/**
 * Integration Validator
 * 
 * Validates the overall integration of UX improvements with existing features.
 * Ensures system integrity and identifies potential issues.
 */

import { UXFeature } from './UXIntegrationManager';

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: 'dependency' | 'compatibility' | 'performance' | 'security' | 'usability';
  severity: 'error' | 'warning' | 'info';
  validate: (features: Map<string, UXFeature>, state: Map<string, any>) => Promise<ValidationResult>;
}

export interface ValidationResult {
  valid: boolean;
  message: string;
  details?: string;
  suggestions?: string[];
  affectedFeatures?: string[];
}

export interface ValidationReport {
  valid: boolean;
  issues: ValidationIssue[];
  warnings: ValidationIssue[];
  suggestions: string[];
  summary: {
    totalRules: number;
    passedRules: number;
    failedRules: number;
    warningRules: number;
  };
}

export interface ValidationIssue {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  details?: string;
  suggestions?: string[];
  affectedFeatures?: string[];
}

export class IntegrationValidator {
  private rules: Map<string, ValidationRule> = new Map();

  constructor() {
    this.initializeRules();
  }

  /**
   * Initialize validation rules
   */
  private initializeRules(): void {
    const rules: ValidationRule[] = [
      {
        id: 'dependency-chain-validation',
        name: 'Dependency Chain Validation',
        description: 'Ensure all feature dependencies are properly resolved',
        category: 'dependency',
        severity: 'error',
        validate: this.validateDependencyChain.bind(this)
      },
      {
        id: 'circular-dependency-check',
        name: 'Circular Dependency Check',
        description: 'Check for circular dependencies between features',
        category: 'dependency',
        severity: 'error',
        validate: this.validateCircularDependencies.bind(this)
      },
      {
        id: 'version-compatibility-check',
        name: 'Version Compatibility Check',
        description: 'Ensure feature versions are compatible',
        category: 'compatibility',
        severity: 'warning',
        validate: this.validateVersionCompatibility.bind(this)
      },
      {
        id: 'performance-impact-assessment',
        name: 'Performance Impact Assessment',
        description: 'Assess potential performance impact of enabled features',
        category: 'performance',
        severity: 'warning',
        validate: this.validatePerformanceImpact.bind(this)
      },
      {
        id: 'feature-conflict-detection',
        name: 'Feature Conflict Detection',
        description: 'Detect conflicts between enabled features',
        category: 'compatibility',
        severity: 'error',
        validate: this.validateFeatureConflicts.bind(this)
      },
      {
        id: 'rollout-strategy-validation',
        name: 'Rollout Strategy Validation',
        description: 'Validate rollout strategies are properly configured',
        category: 'usability',
        severity: 'warning',
        validate: this.validateRolloutStrategies.bind(this)
      },
      {
        id: 'accessibility-compliance-check',
        name: 'Accessibility Compliance Check',
        description: 'Ensure accessibility features don\'t conflict',
        category: 'usability',
        severity: 'warning',
        validate: this.validateAccessibilityCompliance.bind(this)
      },
      {
        id: 'data-migration-validation',
        name: 'Data Migration Validation',
        description: 'Validate data migration requirements',
        category: 'compatibility',
        severity: 'error',
        validate: this.validateDataMigration.bind(this)
      },
      {
        id: 'browser-support-validation',
        name: 'Browser Support Validation',
        description: 'Check browser support for enabled features',
        category: 'compatibility',
        severity: 'warning',
        validate: this.validateBrowserSupport.bind(this)
      },
      {
        id: 'resource-usage-validation',
        name: 'Resource Usage Validation',
        description: 'Validate resource usage of enabled features',
        category: 'performance',
        severity: 'info',
        validate: this.validateResourceUsage.bind(this)
      }
    ];

    rules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });
  }

  /**
   * Validate the integration
   */
  async validate(features: Map<string, UXFeature>, state: Map<string, any>): Promise<ValidationReport> {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const suggestions: string[] = [];
    let passedRules = 0;
    let failedRules = 0;
    let warningRules = 0;

    for (const [ruleId, rule] of this.rules) {
      try {
        const result = await rule.validate(features, state);
        
        if (result.valid) {
          passedRules++;
        } else {
          if (rule.severity === 'error') {
            failedRules++;
            issues.push({
              rule: ruleId,
              severity: rule.severity,
              message: result.message,
              details: result.details,
              suggestions: result.suggestions,
              affectedFeatures: result.affectedFeatures
            });
          } else if (rule.severity === 'warning') {
            warningRules++;
            warnings.push({
              rule: ruleId,
              severity: rule.severity,
              message: result.message,
              details: result.details,
              suggestions: result.suggestions,
              affectedFeatures: result.affectedFeatures
            });
          }
        }

        if (result.suggestions) {
          suggestions.push(...result.suggestions);
        }
      } catch (error) {
        failedRules++;
        issues.push({
          rule: ruleId,
          severity: 'error',
          message: `Validation rule ${ruleId} failed: ${error.message}`,
          details: error.stack
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      suggestions: [...new Set(suggestions)], // Remove duplicates
      summary: {
        totalRules: this.rules.size,
        passedRules,
        failedRules,
        warningRules
      }
    };
  }

  /**
   * Validation rule implementations
   */
  private async validateDependencyChain(
    features: Map<string, UXFeature>, 
    state: Map<string, any>
  ): Promise<ValidationResult> {
    const enabledFeatures = Array.from(features.values()).filter(f => f.enabled);
    const issues: string[] = [];
    const affectedFeatures: string[] = [];

    for (const feature of enabledFeatures) {
      for (const depId of feature.dependencies) {
        const dependency = features.get(depId);
        
        if (!dependency) {
          issues.push(`Feature ${feature.id} depends on ${depId} which is not registered`);
          affectedFeatures.push(feature.id);
        } else if (!dependency.enabled) {
          issues.push(`Feature ${feature.id} depends on ${depId} which is not enabled`);
          affectedFeatures.push(feature.id);
        }
      }
    }

    return {
      valid: issues.length === 0,
      message: issues.length > 0 ? 'Dependency chain validation failed' : 'All dependencies are properly resolved',
      details: issues.join('; '),
      suggestions: issues.length > 0 ? ['Enable required dependencies or disable dependent features'] : [],
      affectedFeatures
    };
  }

  private async validateCircularDependencies(
    features: Map<string, UXFeature>, 
    state: Map<string, any>
  ): Promise<ValidationResult> {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const detectCycle = (featureId: string, path: string[]): void => {
      if (recursionStack.has(featureId)) {
        const cycleStart = path.indexOf(featureId);
        cycles.push(path.slice(cycleStart).concat(featureId));
        return;
      }

      if (visited.has(featureId)) {
        return;
      }

      visited.add(featureId);
      recursionStack.add(featureId);

      const feature = features.get(featureId);
      if (feature) {
        for (const depId of feature.dependencies) {
          detectCycle(depId, [...path, featureId]);
        }
      }

      recursionStack.delete(featureId);
    };

    for (const featureId of features.keys()) {
      if (!visited.has(featureId)) {
        detectCycle(featureId, []);
      }
    }

    return {
      valid: cycles.length === 0,
      message: cycles.length > 0 ? 'Circular dependencies detected' : 'No circular dependencies found',
      details: cycles.length > 0 ? `Cycles: ${cycles.map(c => c.join(' -> ')).join('; ')}` : undefined,
      suggestions: cycles.length > 0 ? ['Remove circular dependencies by restructuring feature dependencies'] : [],
      affectedFeatures: cycles.flat()
    };
  }

  private async validateVersionCompatibility(
    features: Map<string, UXFeature>, 
    state: Map<string, any>
  ): Promise<ValidationResult> {
    const enabledFeatures = Array.from(features.values()).filter(f => f.enabled);
    const versionIssues: string[] = [];
    const affectedFeatures: string[] = [];

    // Check for version compatibility between features
    for (const feature of enabledFeatures) {
      for (const requirement of feature.compatibilityRequirements) {
        const targetFeature = Array.from(features.values()).find(f => 
          f.id.includes(requirement.component.toLowerCase()) || 
          f.name.includes(requirement.component)
        );

        if (targetFeature && targetFeature.enabled) {
          const compatible = this.isVersionCompatible(
            targetFeature.version, 
            requirement.minVersion, 
            requirement.maxVersion
          );

          if (!compatible) {
            versionIssues.push(
              `Feature ${feature.id} requires ${requirement.component} version ${requirement.minVersion}${
                requirement.maxVersion ? `-${requirement.maxVersion}` : '+'
              } but found ${targetFeature.version}`
            );
            affectedFeatures.push(feature.id, targetFeature.id);
          }
        }
      }
    }

    return {
      valid: versionIssues.length === 0,
      message: versionIssues.length > 0 ? 'Version compatibility issues found' : 'All versions are compatible',
      details: versionIssues.join('; '),
      suggestions: versionIssues.length > 0 ? ['Update features to compatible versions'] : [],
      affectedFeatures: [...new Set(affectedFeatures)]
    };
  }

  private async validatePerformanceImpact(
    features: Map<string, UXFeature>, 
    state: Map<string, any>
  ): Promise<ValidationResult> {
    const enabledFeatures = Array.from(features.values()).filter(f => f.enabled);
    const performanceImpacts = {
      'design-system-v2': { cpu: 'low', memory: 'medium', network: 'low' },
      'responsive-layout-engine': { cpu: 'medium', memory: 'medium', network: 'low' },
      'accessibility-enhancements': { cpu: 'low', memory: 'low', network: 'low' },
      'adaptive-navigation': { cpu: 'medium', memory: 'low', network: 'medium' },
      'performance-optimizations': { cpu: 'low', memory: 'low', network: 'low' },
      'personalization-engine': { cpu: 'high', memory: 'high', network: 'medium' },
      'enhanced-charts': { cpu: 'high', memory: 'medium', network: 'low' },
      'mobile-optimizations': { cpu: 'medium', memory: 'medium', network: 'low' },
      'collaboration-features': { cpu: 'medium', memory: 'medium', network: 'high' },
      'power-user-features': { cpu: 'medium', memory: 'low', network: 'low' }
    };

    let totalCpuImpact = 0;
    let totalMemoryImpact = 0;
    let totalNetworkImpact = 0;

    const impactValues = { low: 1, medium: 2, high: 3 };

    for (const feature of enabledFeatures) {
      const impact = performanceImpacts[feature.id as keyof typeof performanceImpacts];
      if (impact) {
        totalCpuImpact += impactValues[impact.cpu as keyof typeof impactValues];
        totalMemoryImpact += impactValues[impact.memory as keyof typeof impactValues];
        totalNetworkImpact += impactValues[impact.network as keyof typeof impactValues];
      }
    }

    const warnings: string[] = [];
    if (totalCpuImpact > 8) warnings.push('High CPU impact detected');
    if (totalMemoryImpact > 8) warnings.push('High memory impact detected');
    if (totalNetworkImpact > 6) warnings.push('High network impact detected');

    return {
      valid: warnings.length === 0,
      message: warnings.length > 0 ? 'Performance impact concerns detected' : 'Performance impact is acceptable',
      details: `CPU: ${totalCpuImpact}, Memory: ${totalMemoryImpact}, Network: ${totalNetworkImpact}`,
      suggestions: warnings.length > 0 ? [
        'Consider enabling features gradually',
        'Monitor performance metrics after deployment',
        'Consider disabling less critical features on lower-end devices'
      ] : [],
      affectedFeatures: enabledFeatures.map(f => f.id)
    };
  }

  private async validateFeatureConflicts(
    features: Map<string, UXFeature>, 
    state: Map<string, any>
  ): Promise<ValidationResult> {
    const enabledFeatures = Array.from(features.values()).filter(f => f.enabled);
    const conflicts: string[] = [];
    const affectedFeatures: string[] = [];

    // Define known conflicts
    const knownConflicts = [
      {
        features: ['personalization-engine', 'power-user-features'],
        reason: 'Both features modify user interface behavior'
      }
    ];

    for (const conflict of knownConflicts) {
      const conflictingFeatures = enabledFeatures.filter(f => 
        conflict.features.includes(f.id)
      );

      if (conflictingFeatures.length > 1) {
        conflicts.push(`Conflict between ${conflictingFeatures.map(f => f.id).join(' and ')}: ${conflict.reason}`);
        affectedFeatures.push(...conflictingFeatures.map(f => f.id));
      }
    }

    return {
      valid: conflicts.length === 0,
      message: conflicts.length > 0 ? 'Feature conflicts detected' : 'No feature conflicts found',
      details: conflicts.join('; '),
      suggestions: conflicts.length > 0 ? ['Resolve conflicts by disabling conflicting features or implementing compatibility layers'] : [],
      affectedFeatures: [...new Set(affectedFeatures)]
    };
  }

  private async validateRolloutStrategies(
    features: Map<string, UXFeature>, 
    state: Map<string, any>
  ): Promise<ValidationResult> {
    const features_array = Array.from(features.values());
    const issues: string[] = [];
    const affectedFeatures: string[] = [];

    for (const feature of features_array) {
      const { rolloutStrategy } = feature;

      // Validate rollout strategy configuration
      if (rolloutStrategy.type === 'gradual' && !rolloutStrategy.percentage) {
        issues.push(`Feature ${feature.id} has gradual rollout but no percentage specified`);
        affectedFeatures.push(feature.id);
      }

      if (rolloutStrategy.type === 'beta' && !rolloutStrategy.userGroups) {
        issues.push(`Feature ${feature.id} has beta rollout but no user groups specified`);
        affectedFeatures.push(feature.id);
      }

      if (rolloutStrategy.percentage && (rolloutStrategy.percentage < 0 || rolloutStrategy.percentage > 100)) {
        issues.push(`Feature ${feature.id} has invalid rollout percentage: ${rolloutStrategy.percentage}`);
        affectedFeatures.push(feature.id);
      }
    }

    return {
      valid: issues.length === 0,
      message: issues.length > 0 ? 'Rollout strategy validation failed' : 'All rollout strategies are properly configured',
      details: issues.join('; '),
      suggestions: issues.length > 0 ? ['Fix rollout strategy configurations'] : [],
      affectedFeatures
    };
  }

  private async validateAccessibilityCompliance(
    features: Map<string, UXFeature>, 
    state: Map<string, any>
  ): Promise<ValidationResult> {
    const enabledFeatures = Array.from(features.values()).filter(f => f.enabled);
    const accessibilityFeatures = enabledFeatures.filter(f => 
      f.id.includes('accessibility') || 
      f.compatibilityRequirements.some(req => req.component.includes('Accessibility'))
    );

    // Accessibility features generally don't conflict
    return {
      valid: true,
      message: 'Accessibility features are compatible',
      suggestions: accessibilityFeatures.length > 0 ? ['Ensure accessibility testing is performed'] : []
    };
  }

  private async validateDataMigration(
    features: Map<string, UXFeature>, 
    state: Map<string, any>
  ): Promise<ValidationResult> {
    const enabledFeatures = Array.from(features.values()).filter(f => f.enabled);
    const migrationRequiredFeatures = [
      'design-system-v2',
      'responsive-layout-engine',
      'personalization-engine'
    ];

    const requiresMigration = enabledFeatures.filter(f => 
      migrationRequiredFeatures.includes(f.id)
    );

    const issues: string[] = [];
    for (const feature of requiresMigration) {
      const migrationState = state.get(`migration-${feature.id}`);
      if (!migrationState || migrationState.status !== 'completed') {
        issues.push(`Feature ${feature.id} requires data migration but migration is not completed`);
      }
    }

    return {
      valid: issues.length === 0,
      message: issues.length > 0 ? 'Data migration validation failed' : 'All required migrations are completed',
      details: issues.join('; '),
      suggestions: issues.length > 0 ? ['Complete required data migrations before enabling features'] : [],
      affectedFeatures: requiresMigration.map(f => f.id)
    };
  }

  private async validateBrowserSupport(
    features: Map<string, UXFeature>, 
    state: Map<string, any>
  ): Promise<ValidationResult> {
    const enabledFeatures = Array.from(features.values()).filter(f => f.enabled);
    const browserRequirements = {
      'enhanced-charts': ['Chrome 80+', 'Firefox 75+', 'Safari 13+'],
      'mobile-optimizations': ['Chrome 70+', 'Safari 12+', 'Firefox 70+'],
      'performance-optimizations': ['Chrome 75+', 'Firefox 70+', 'Safari 12+']
    };

    const warnings: string[] = [];
    const currentBrowser = this.detectBrowser();

    for (const feature of enabledFeatures) {
      const requirements = browserRequirements[feature.id as keyof typeof browserRequirements];
      if (requirements && !this.isBrowserSupported(currentBrowser, requirements)) {
        warnings.push(`Feature ${feature.id} may not be fully supported in current browser`);
      }
    }

    return {
      valid: true, // Browser support is a warning, not an error
      message: warnings.length > 0 ? 'Browser support warnings detected' : 'All features are supported in current browser',
      details: warnings.join('; '),
      suggestions: warnings.length > 0 ? ['Consider providing fallbacks for unsupported browsers'] : [],
      affectedFeatures: enabledFeatures.map(f => f.id)
    };
  }

  private async validateResourceUsage(
    features: Map<string, UXFeature>, 
    state: Map<string, any>
  ): Promise<ValidationResult> {
    const enabledFeatures = Array.from(features.values()).filter(f => f.enabled);
    
    return {
      valid: true,
      message: `${enabledFeatures.length} features enabled`,
      details: `Features: ${enabledFeatures.map(f => f.id).join(', ')}`,
      suggestions: ['Monitor resource usage in production']
    };
  }

  /**
   * Helper methods
   */
  private isVersionCompatible(version: string, minVersion: string, maxVersion?: string): boolean {
    const parseVersion = (v: string) => v.split('.').map(Number);
    const compare = (a: number[], b: number[]) => {
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const av = a[i] || 0;
        const bv = b[i] || 0;
        if (av !== bv) return av - bv;
      }
      return 0;
    };

    const versionParts = parseVersion(version);
    const minVersionParts = parseVersion(minVersion);
    
    if (compare(versionParts, minVersionParts) < 0) {
      return false;
    }

    if (maxVersion) {
      const maxVersionParts = parseVersion(maxVersion);
      if (compare(versionParts, maxVersionParts) > 0) {
        return false;
      }
    }

    return true;
  }

  private detectBrowser(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    return 'Unknown';
  }

  private isBrowserSupported(browser: string, requirements: string[]): boolean {
    // Simplified browser support check
    return requirements.some(req => req.includes(browser));
  }

  /**
   * Add custom validation rule
   */
  addRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove validation rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Get all validation rules
   */
  getRules(): ValidationRule[] {
    return Array.from(this.rules.values());
  }
}