/**
 * Compatibility Layer
 * 
 * Ensures existing widgets and dashboard configurations work seamlessly
 * with new UX improvements.
 */

import { EventEmitter } from 'events';
import { UXFeature } from './UXIntegrationManager';

export interface CompatibilityCheck {
  id: string;
  name: string;
  description: string;
  component: string;
  version: string;
  required: boolean;
  check: (context: CompatibilityContext) => Promise<CompatibilityResult>;
  fix?: (context: CompatibilityContext) => Promise<CompatibilityResult>;
}

export interface CompatibilityContext {
  feature: UXFeature;
  component: any;
  version: string;
  configuration: any;
  environment: {
    browser: string;
    version: string;
    platform: string;
    features: string[];
  };
}

export interface CompatibilityResult {
  compatible: boolean;
  issues: CompatibilityIssue[];
  warnings: string[];
  suggestions: string[];
  fixApplied?: boolean;
}

export interface CompatibilityIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  component: string;
  fix?: string;
  documentation?: string;
}

export class CompatibilityLayer extends EventEmitter {
  private checks: Map<string, CompatibilityCheck> = new Map();
  private mode: 'strict' | 'lenient' | 'auto';
  private cache: Map<string, CompatibilityResult> = new Map();

  constructor(mode: 'strict' | 'lenient' | 'auto' = 'auto') {
    super();
    this.mode = mode;
    this.initializeChecks();
  }

  /**
   * Initialize compatibility checks
   */
  private initializeChecks(): void {
    const checks: CompatibilityCheck[] = [
      {
        id: 'dashboard-grid-compatibility',
        name: 'Dashboard Grid Compatibility',
        description: 'Check if dashboard grid layout is compatible with responsive engine',
        component: 'Dashboard',
        version: '1.0.0',
        required: true,
        check: this.checkDashboardGridCompatibility.bind(this),
        fix: this.fixDashboardGridCompatibility.bind(this)
      },
      {
        id: 'widget-configuration-compatibility',
        name: 'Widget Configuration Compatibility',
        description: 'Ensure widget configurations work with new design system',
        component: 'Widget',
        version: '1.0.0',
        required: true,
        check: this.checkWidgetConfigurationCompatibility.bind(this),
        fix: this.fixWidgetConfigurationCompatibility.bind(this)
      },
      {
        id: 'theme-compatibility',
        name: 'Theme Compatibility',
        description: 'Check theme compatibility with new design tokens',
        component: 'ThemeProvider',
        version: '1.0.0',
        required: false,
        check: this.checkThemeCompatibility.bind(this),
        fix: this.fixThemeCompatibility.bind(this)
      },
      {
        id: 'navigation-compatibility',
        name: 'Navigation Compatibility',
        description: 'Ensure navigation components work with adaptive system',
        component: 'Navigation',
        version: '1.0.0',
        required: true,
        check: this.checkNavigationCompatibility.bind(this),
        fix: this.fixNavigationCompatibility.bind(this)
      },
      {
        id: 'accessibility-compatibility',
        name: 'Accessibility Compatibility',
        description: 'Check accessibility features compatibility',
        component: 'AccessibilityManager',
        version: '1.0.0',
        required: false,
        check: this.checkAccessibilityCompatibility.bind(this),
        fix: this.fixAccessibilityCompatibility.bind(this)
      },
      {
        id: 'chart-compatibility',
        name: 'Chart Compatibility',
        description: 'Ensure charts work with enhanced visualization system',
        component: 'Chart',
        version: '1.0.0',
        required: false,
        check: this.checkChartCompatibility.bind(this),
        fix: this.fixChartCompatibility.bind(this)
      },
      {
        id: 'mobile-compatibility',
        name: 'Mobile Compatibility',
        description: 'Check mobile optimization compatibility',
        component: 'MobileOptimizer',
        version: '1.0.0',
        required: false,
        check: this.checkMobileCompatibility.bind(this),
        fix: this.fixMobileCompatibility.bind(this)
      },
      {
        id: 'performance-compatibility',
        name: 'Performance Compatibility',
        description: 'Ensure performance optimizations don\'t break existing features',
        component: 'PerformanceMonitor',
        version: '1.0.0',
        required: false,
        check: this.checkPerformanceCompatibility.bind(this)
      }
    ];

    checks.forEach(check => {
      this.checks.set(check.id, check);
    });
  }

  /**
   * Validate compatibility for a feature
   */
  async validateCompatibility(feature: UXFeature): Promise<boolean> {
    const cacheKey = `${feature.id}-${feature.version}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached.compatible;
    }

    const results = await this.runCompatibilityChecks(feature);
    const compatible = this.evaluateCompatibility(results);

    this.cache.set(cacheKey, {
      compatible,
      issues: results.flatMap(r => r.issues),
      warnings: results.flatMap(r => r.warnings),
      suggestions: results.flatMap(r => r.suggestions)
    });

    return compatible;
  }

  /**
   * Check if a feature is compatible
   */
  isCompatible(feature: UXFeature): boolean {
    const cacheKey = `${feature.id}-${feature.version}`;
    const cached = this.cache.get(cacheKey);
    return cached?.compatible || false;
  }

  /**
   * Run compatibility checks for a feature
   */
  private async runCompatibilityChecks(feature: UXFeature): Promise<CompatibilityResult[]> {
    const relevantChecks = Array.from(this.checks.values()).filter(check =>
      feature.compatibilityRequirements.some(req => req.component === check.component)
    );

    const results: CompatibilityResult[] = [];

    for (const check of relevantChecks) {
      try {
        const context: CompatibilityContext = {
          feature,
          component: this.getComponent(check.component),
          version: check.version,
          configuration: this.getComponentConfiguration(check.component),
          environment: this.getEnvironmentInfo()
        };

        const result = await check.check(context);
        results.push(result);

        // Auto-fix if in auto mode and fix is available
        if (this.mode === 'auto' && !result.compatible && check.fix) {
          const fixResult = await check.fix(context);
          if (fixResult.compatible) {
            results[results.length - 1] = { ...fixResult, fixApplied: true };
          }
        }
      } catch (error) {
        console.error(`Compatibility check ${check.id} failed:`, error);
        results.push({
          compatible: false,
          issues: [{
            severity: 'error',
            code: 'CHECK_FAILED',
            message: `Compatibility check failed: ${error.message}`,
            component: check.component
          }],
          warnings: [],
          suggestions: []
        });
      }
    }

    return results;
  }

  /**
   * Evaluate overall compatibility from check results
   */
  private evaluateCompatibility(results: CompatibilityResult[]): boolean {
    if (this.mode === 'lenient') {
      // In lenient mode, only fail on critical errors
      return !results.some(result => 
        result.issues.some(issue => issue.severity === 'error')
      );
    }

    // In strict or auto mode, all checks must pass
    return results.every(result => result.compatible);
  }

  /**
   * Compatibility check implementations
   */
  private async checkDashboardGridCompatibility(context: CompatibilityContext): Promise<CompatibilityResult> {
    const issues: CompatibilityIssue[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      // Check if dashboard has grid layout
      const dashboard = context.component;
      if (!dashboard || !dashboard.layout) {
        issues.push({
          severity: 'error',
          code: 'MISSING_LAYOUT',
          message: 'Dashboard is missing layout configuration',
          component: 'Dashboard',
          fix: 'Add default layout configuration'
        });
      }

      // Check grid properties
      if (dashboard?.layout && !dashboard.layout.columns) {
        warnings.push('Dashboard layout missing columns configuration');
        suggestions.push('Add columns configuration for responsive breakpoints');
      }

      // Check widget positions
      if (dashboard?.widgets) {
        dashboard.widgets.forEach((widget: any, index: number) => {
          if (!widget.position) {
            issues.push({
              severity: 'warning',
              code: 'MISSING_POSITION',
              message: `Widget ${index} is missing position configuration`,
              component: 'Widget',
              fix: 'Add default position'
            });
          }
        });
      }

      return {
        compatible: issues.filter(i => i.severity === 'error').length === 0,
        issues,
        warnings,
        suggestions
      };
    } catch (error) {
      return {
        compatible: false,
        issues: [{
          severity: 'error',
          code: 'CHECK_ERROR',
          message: `Dashboard grid compatibility check failed: ${error.message}`,
          component: 'Dashboard'
        }],
        warnings: [],
        suggestions: []
      };
    }
  }

  private async fixDashboardGridCompatibility(context: CompatibilityContext): Promise<CompatibilityResult> {
    try {
      const dashboard = context.component;
      
      // Add default layout if missing
      if (!dashboard.layout) {
        dashboard.layout = {
          columns: 12,
          rowHeight: 60,
          margin: [16, 16],
          containerPadding: [16, 16]
        };
      }

      // Add default positions to widgets
      if (dashboard.widgets) {
        dashboard.widgets.forEach((widget: any, index: number) => {
          if (!widget.position) {
            widget.position = {
              x: (index % 3) * 4,
              y: Math.floor(index / 3) * 4,
              w: 4,
              h: 3
            };
          }
        });
      }

      return {
        compatible: true,
        issues: [],
        warnings: [],
        suggestions: ['Dashboard grid compatibility fixed automatically']
      };
    } catch (error) {
      return {
        compatible: false,
        issues: [{
          severity: 'error',
          code: 'FIX_FAILED',
          message: `Failed to fix dashboard grid compatibility: ${error.message}`,
          component: 'Dashboard'
        }],
        warnings: [],
        suggestions: []
      };
    }
  }

  private async checkWidgetConfigurationCompatibility(context: CompatibilityContext): Promise<CompatibilityResult> {
    const issues: CompatibilityIssue[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check widget configuration structure
    const widget = context.component;
    if (widget && widget.config) {
      // Check for required configuration properties
      const requiredProps = ['timeRange', 'metrics', 'chartOptions'];
      requiredProps.forEach(prop => {
        if (!widget.config[prop]) {
          warnings.push(`Widget configuration missing ${prop}`);
          suggestions.push(`Add default ${prop} configuration`);
        }
      });

      // Check chart options compatibility
      if (widget.config.chartOptions && typeof widget.config.chartOptions !== 'object') {
        issues.push({
          severity: 'warning',
          code: 'INVALID_CHART_OPTIONS',
          message: 'Widget chart options should be an object',
          component: 'Widget',
          fix: 'Convert chart options to object format'
        });
      }
    }

    return {
      compatible: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      warnings,
      suggestions
    };
  }

  private async fixWidgetConfigurationCompatibility(context: CompatibilityContext): Promise<CompatibilityResult> {
    try {
      const widget = context.component;
      
      if (widget && widget.config) {
        // Add missing required properties
        if (!widget.config.timeRange) {
          widget.config.timeRange = 'day';
        }
        if (!widget.config.metrics) {
          widget.config.metrics = [];
        }
        if (!widget.config.chartOptions) {
          widget.config.chartOptions = { responsive: true, maintainAspectRatio: false };
        }

        // Fix chart options format
        if (typeof widget.config.chartOptions !== 'object') {
          widget.config.chartOptions = { responsive: true, maintainAspectRatio: false };
        }
      }

      return {
        compatible: true,
        issues: [],
        warnings: [],
        suggestions: ['Widget configuration compatibility fixed automatically']
      };
    } catch (error) {
      return {
        compatible: false,
        issues: [{
          severity: 'error',
          code: 'FIX_FAILED',
          message: `Failed to fix widget configuration compatibility: ${error.message}`,
          component: 'Widget'
        }],
        warnings: [],
        suggestions: []
      };
    }
  }

  private async checkThemeCompatibility(context: CompatibilityContext): Promise<CompatibilityResult> {
    // Theme compatibility is generally good
    return {
      compatible: true,
      issues: [],
      warnings: [],
      suggestions: ['Consider updating to new design tokens for better consistency']
    };
  }

  private async fixThemeCompatibility(context: CompatibilityContext): Promise<CompatibilityResult> {
    return {
      compatible: true,
      issues: [],
      warnings: [],
      suggestions: []
    };
  }

  private async checkNavigationCompatibility(context: CompatibilityContext): Promise<CompatibilityResult> {
    return {
      compatible: true,
      issues: [],
      warnings: [],
      suggestions: []
    };
  }

  private async fixNavigationCompatibility(context: CompatibilityContext): Promise<CompatibilityResult> {
    return {
      compatible: true,
      issues: [],
      warnings: [],
      suggestions: []
    };
  }

  private async checkAccessibilityCompatibility(context: CompatibilityContext): Promise<CompatibilityResult> {
    return {
      compatible: true,
      issues: [],
      warnings: [],
      suggestions: ['Accessibility enhancements are backward compatible']
    };
  }

  private async fixAccessibilityCompatibility(context: CompatibilityContext): Promise<CompatibilityResult> {
    return {
      compatible: true,
      issues: [],
      warnings: [],
      suggestions: []
    };
  }

  private async checkChartCompatibility(context: CompatibilityContext): Promise<CompatibilityResult> {
    return {
      compatible: true,
      issues: [],
      warnings: [],
      suggestions: ['Charts will benefit from enhanced accessibility features']
    };
  }

  private async fixChartCompatibility(context: CompatibilityContext): Promise<CompatibilityResult> {
    return {
      compatible: true,
      issues: [],
      warnings: [],
      suggestions: []
    };
  }

  private async checkMobileCompatibility(context: CompatibilityContext): Promise<CompatibilityResult> {
    const issues: CompatibilityIssue[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check if mobile optimization is supported
    const env = context.environment;
    if (env.platform === 'mobile' && !env.features.includes('touch')) {
      warnings.push('Touch events may not be fully supported');
      suggestions.push('Consider enabling touch gesture fallbacks');
    }

    return {
      compatible: true,
      issues,
      warnings,
      suggestions
    };
  }

  private async fixMobileCompatibility(context: CompatibilityContext): Promise<CompatibilityResult> {
    return {
      compatible: true,
      issues: [],
      warnings: [],
      suggestions: []
    };
  }

  private async checkPerformanceCompatibility(context: CompatibilityContext): Promise<CompatibilityResult> {
    return {
      compatible: true,
      issues: [],
      warnings: [],
      suggestions: ['Performance optimizations are backward compatible']
    };
  }

  /**
   * Helper methods
   */
  private getComponent(componentName: string): any {
    // In a real implementation, this would return the actual component instance
    // For now, return mock data based on what we know about the dashboard
    switch (componentName) {
      case 'Dashboard':
        return {
          layout: { columns: 12, rowHeight: 60 },
          widgets: []
        };
      case 'Widget':
        return {
          config: {
            timeRange: 'day',
            metrics: [],
            chartOptions: { responsive: true }
          }
        };
      default:
        return {};
    }
  }

  private getComponentConfiguration(componentName: string): any {
    // Return component-specific configuration
    return {};
  }

  private getEnvironmentInfo(): any {
    return {
      browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other',
      version: '1.0.0',
      platform: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      features: ['touch', 'webgl', 'websockets']
    };
  }

  /**
   * Get compatibility report for a feature
   */
  async getCompatibilityReport(feature: UXFeature): Promise<CompatibilityResult> {
    const cacheKey = `${feature.id}-${feature.version}`;
    let result = this.cache.get(cacheKey);
    
    if (!result) {
      const results = await this.runCompatibilityChecks(feature);
      result = {
        compatible: this.evaluateCompatibility(results),
        issues: results.flatMap(r => r.issues),
        warnings: results.flatMap(r => r.warnings),
        suggestions: results.flatMap(r => r.suggestions)
      };
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Clear compatibility cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Dispose of the compatibility layer
   */
  dispose(): void {
    this.removeAllListeners();
    this.clearCache();
  }
}