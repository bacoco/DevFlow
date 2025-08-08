/**
 * Performance Budget Manager
 * Manages performance budgets and automated CI/CD checks
 */

import { PerformanceBudget, PerformanceAlert, PerformanceMetric } from './types';

export class PerformanceBudgetManager {
  private budgets: Map<string, PerformanceBudget> = new Map();
  private violations: PerformanceAlert[] = [];
  private alertCallbacks: Array<(alert: PerformanceAlert) => void> = [];

  constructor() {
    this.initializeDefaultBudgets();
  }

  private initializeDefaultBudgets(): void {
    const defaultBudgets: PerformanceBudget[] = [
      {
        metric: 'lcp',
        budget: 2500,
        warning: 2000,
        error: 4000
      },
      {
        metric: 'fid',
        budget: 100,
        warning: 80,
        error: 300
      },
      {
        metric: 'cls',
        budget: 0.1,
        warning: 0.08,
        error: 0.25
      },
      {
        metric: 'fcp',
        budget: 1800,
        warning: 1500,
        error: 3000
      },
      {
        metric: 'ttfb',
        budget: 800,
        warning: 600,
        error: 1800
      },
      {
        metric: 'bundle_size',
        budget: 250000, // 250KB
        warning: 200000, // 200KB
        error: 500000   // 500KB
      },
      {
        metric: 'page_load_time',
        budget: 3000,
        warning: 2500,
        error: 5000
      },
      {
        metric: 'time_to_interactive',
        budget: 5000,
        warning: 4000,
        error: 8000
      }
    ];

    defaultBudgets.forEach(budget => {
      this.budgets.set(budget.metric, budget);
    });
  }

  public setBudget(budget: PerformanceBudget): void {
    this.budgets.set(budget.metric, budget);
  }

  public getBudget(metric: string): PerformanceBudget | undefined {
    return this.budgets.get(metric);
  }

  public getAllBudgets(): PerformanceBudget[] {
    return Array.from(this.budgets.values());
  }

  public checkBudget(metric: string, value: number): {
    status: 'pass' | 'warning' | 'fail';
    budget: PerformanceBudget | undefined;
    violation?: PerformanceAlert;
  } {
    const budget = this.budgets.get(metric);
    if (!budget) {
      return { status: 'pass', budget: undefined };
    }

    let status: 'pass' | 'warning' | 'fail' = 'pass';
    let violation: PerformanceAlert | undefined;

    if (value > budget.error) {
      status = 'fail';
      violation = this.createViolationAlert(metric, value, budget, 'critical');
    } else if (value > budget.budget) {
      status = 'fail';
      violation = this.createViolationAlert(metric, value, budget, 'high');
    } else if (value > budget.warning) {
      status = 'warning';
      violation = this.createViolationAlert(metric, value, budget, 'medium');
    }

    if (violation) {
      this.violations.push(violation);
      this.triggerAlert(violation);
    }

    return { status, budget, violation };
  }

  private createViolationAlert(
    metric: string, 
    value: number, 
    budget: PerformanceBudget, 
    severity: PerformanceAlert['severity']
  ): PerformanceAlert {
    return {
      id: this.generateId(),
      type: 'budget_exceeded',
      metric,
      currentValue: value,
      threshold: budget.budget,
      severity,
      timestamp: new Date(),
      url: window.location.href,
      description: `${metric} (${value}) exceeded budget of ${budget.budget}`
    };
  }

  public checkMultipleMetrics(metrics: Record<string, number>): {
    passed: number;
    warnings: number;
    failed: number;
    results: Array<{
      metric: string;
      value: number;
      status: 'pass' | 'warning' | 'fail';
      budget?: PerformanceBudget;
    }>;
  } {
    let passed = 0;
    let warnings = 0;
    let failed = 0;
    const results: Array<{
      metric: string;
      value: number;
      status: 'pass' | 'warning' | 'fail';
      budget?: PerformanceBudget;
    }> = [];

    Object.entries(metrics).forEach(([metric, value]) => {
      const result = this.checkBudget(metric, value);
      
      results.push({
        metric,
        value,
        status: result.status,
        budget: result.budget
      });

      switch (result.status) {
        case 'pass':
          passed++;
          break;
        case 'warning':
          warnings++;
          break;
        case 'fail':
          failed++;
          break;
      }
    });

    return { passed, warnings, failed, results };
  }

  public generateCIReport(metrics: Record<string, number>): {
    success: boolean;
    summary: string;
    details: string;
    exitCode: number;
  } {
    const check = this.checkMultipleMetrics(metrics);
    const total = check.passed + check.warnings + check.failed;
    
    const success = check.failed === 0;
    const exitCode = success ? 0 : 1;

    const summary = `Performance Budget Check: ${check.passed}/${total} passed, ${check.warnings} warnings, ${check.failed} failed`;
    
    let details = `\n📊 Performance Budget Report\n`;
    details += `${'='.repeat(40)}\n`;
    details += `✅ Passed: ${check.passed}\n`;
    details += `⚠️  Warnings: ${check.warnings}\n`;
    details += `❌ Failed: ${check.failed}\n\n`;

    check.results.forEach(result => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      const budget = result.budget;
      
      details += `${icon} ${result.metric}: ${result.value}`;
      if (budget) {
        details += ` (budget: ${budget.budget}, warning: ${budget.warning})`;
      }
      details += '\n';
    });

    if (check.failed > 0) {
      details += `\n❌ Build failed due to performance budget violations!\n`;
    } else if (check.warnings > 0) {
      details += `\n⚠️  Build passed with warnings. Consider optimizing performance.\n`;
    } else {
      details += `\n🎉 All performance budgets passed!\n`;
    }

    return { success, summary, details, exitCode };
  }

  public exportBudgetsForCI(): string {
    const config = {
      budgets: Array.from(this.budgets.values()),
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };

    return JSON.stringify(config, null, 2);
  }

  public importBudgetsFromCI(configJson: string): void {
    try {
      const config = JSON.parse(configJson);
      if (config.budgets && Array.isArray(config.budgets)) {
        config.budgets.forEach((budget: PerformanceBudget) => {
          this.setBudget(budget);
        });
      }
    } catch (error) {
      console.error('Failed to import performance budgets:', error);
    }
  }

  public getViolations(): PerformanceAlert[] {
    return [...this.violations];
  }

  public clearViolations(): void {
    this.violations = [];
  }

  public onBudgetViolation(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  private triggerAlert(alert: PerformanceAlert): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in budget violation callback:', error);
      }
    });
  }

  public generateLighthouseConfig(): object {
    const budgets = Array.from(this.budgets.values()).map(budget => {
      const resourceBudgets = [];
      const timingBudgets = [];

      if (budget.metric === 'bundle_size') {
        resourceBudgets.push({
          resourceType: 'script',
          budget: Math.floor(budget.budget / 1000) // Convert to KB
        });
      } else if (['lcp', 'fcp', 'ttfb', 'page_load_time', 'time_to_interactive'].includes(budget.metric)) {
        timingBudgets.push({
          metric: budget.metric,
          budget: budget.budget
        });
      }

      return { resourceBudgets, timingBudgets };
    });

    return {
      extends: 'lighthouse:default',
      settings: {
        budgets: budgets.filter(b => b.resourceBudgets.length > 0 || b.timingBudgets.length > 0)
      }
    };
  }

  public generateWebpackBundleAnalyzerConfig(): object {
    const bundleBudget = this.budgets.get('bundle_size');
    
    return {
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html',
      defaultSizes: 'gzip',
      generateStatsFile: true,
      statsFilename: 'bundle-stats.json',
      logLevel: 'warn',
      ...(bundleBudget && {
        maxBundleGzipSize: bundleBudget.budget,
        maxChunkGzipSize: bundleBudget.budget / 4
      })
    };
  }

  private generateId(): string {
    return `budget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public getBudgetStatus(): {
    totalBudgets: number;
    activeBudgets: number;
    recentViolations: number;
    overallHealth: 'good' | 'warning' | 'critical';
  } {
    const totalBudgets = this.budgets.size;
    const activeBudgets = totalBudgets; // All budgets are active by default
    
    const recentViolations = this.violations.filter(
      v => Date.now() - v.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    ).length;

    let overallHealth: 'good' | 'warning' | 'critical' = 'good';
    if (recentViolations > 5) {
      overallHealth = 'critical';
    } else if (recentViolations > 0) {
      overallHealth = 'warning';
    }

    return {
      totalBudgets,
      activeBudgets,
      recentViolations,
      overallHealth
    };
  }
}

// Singleton instance
export const performanceBudgetManager = new PerformanceBudgetManager();