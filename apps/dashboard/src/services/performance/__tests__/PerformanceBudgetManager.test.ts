/**
 * Performance Budget Manager Tests
 * Tests for performance budget management and CI/CD integration
 */

import { PerformanceBudgetManager } from '../PerformanceBudgetManager';
import { PerformanceBudget, PerformanceAlert } from '../types';

describe('PerformanceBudgetManager', () => {
  let manager: PerformanceBudgetManager;
  let mockAlertCallback: jest.Mock;

  beforeEach(() => {
    manager = new PerformanceBudgetManager();
    mockAlertCallback = jest.fn();
    manager.onBudgetViolation(mockAlertCallback);
    
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default budgets', () => {
      const budgets = manager.getAllBudgets();
      
      expect(budgets.length).toBeGreaterThan(0);
      expect(budgets.some(b => b.metric === 'lcp')).toBe(true);
      expect(budgets.some(b => b.metric === 'fid')).toBe(true);
      expect(budgets.some(b => b.metric === 'cls')).toBe(true);
    });

    it('should set correct default budget values', () => {
      const lcpBudget = manager.getBudget('lcp');
      
      expect(lcpBudget).toEqual({
        metric: 'lcp',
        budget: 2500,
        warning: 2000,
        error: 4000
      });
    });
  });

  describe('Budget Management', () => {
    it('should set custom budget', () => {
      const customBudget: PerformanceBudget = {
        metric: 'custom_metric',
        budget: 1000,
        warning: 800,
        error: 1500
      };

      manager.setBudget(customBudget);
      const retrieved = manager.getBudget('custom_metric');

      expect(retrieved).toEqual(customBudget);
    });

    it('should update existing budget', () => {
      const updatedBudget: PerformanceBudget = {
        metric: 'lcp',
        budget: 2000,
        warning: 1500,
        error: 3000
      };

      manager.setBudget(updatedBudget);
      const retrieved = manager.getBudget('lcp');

      expect(retrieved).toEqual(updatedBudget);
    });

    it('should return undefined for non-existent budget', () => {
      const budget = manager.getBudget('non_existent');
      expect(budget).toBeUndefined();
    });
  });

  describe('Budget Checking', () => {
    it('should pass when value is within budget', () => {
      const result = manager.checkBudget('lcp', 2000);
      
      expect(result.status).toBe('pass');
      expect(result.violation).toBeUndefined();
    });

    it('should warn when value exceeds warning threshold', () => {
      const result = manager.checkBudget('lcp', 2200);
      
      expect(result.status).toBe('warning');
      expect(result.violation).toBeDefined();
      expect(result.violation?.severity).toBe('medium');
    });

    it('should fail when value exceeds budget', () => {
      const result = manager.checkBudget('lcp', 3000);
      
      expect(result.status).toBe('fail');
      expect(result.violation).toBeDefined();
      expect(result.violation?.severity).toBe('high');
    });

    it('should fail critically when value exceeds error threshold', () => {
      const result = manager.checkBudget('lcp', 5000);
      
      expect(result.status).toBe('fail');
      expect(result.violation).toBeDefined();
      expect(result.violation?.severity).toBe('critical');
    });

    it('should trigger alert callback on violation', () => {
      manager.checkBudget('lcp', 3000);
      
      expect(mockAlertCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'budget_exceeded',
          metric: 'lcp',
          currentValue: 3000,
          severity: 'high'
        })
      );
    });

    it('should handle non-existent budget gracefully', () => {
      const result = manager.checkBudget('non_existent', 1000);
      
      expect(result.status).toBe('pass');
      expect(result.budget).toBeUndefined();
      expect(result.violation).toBeUndefined();
    });
  });

  describe('Multiple Metrics Checking', () => {
    it('should check multiple metrics correctly', () => {
      const metrics = {
        lcp: 2000,  // pass
        fid: 150,   // warning
        cls: 0.3    // fail
      };

      const result = manager.checkMultipleMetrics(metrics);

      expect(result.passed).toBe(1);
      expect(result.warnings).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results).toHaveLength(3);
    });

    it('should provide detailed results for each metric', () => {
      const metrics = {
        lcp: 3000,
        fid: 50
      };

      const result = manager.checkMultipleMetrics(metrics);

      expect(result.results[0]).toEqual({
        metric: 'lcp',
        value: 3000,
        status: 'fail',
        budget: expect.objectContaining({ metric: 'lcp' })
      });

      expect(result.results[1]).toEqual({
        metric: 'fid',
        value: 50,
        status: 'pass',
        budget: expect.objectContaining({ metric: 'fid' })
      });
    });
  });

  describe('CI/CD Integration', () => {
    it('should generate CI report for passing metrics', () => {
      const metrics = {
        lcp: 2000,
        fid: 80,
        cls: 0.05
      };

      const report = manager.generateCIReport(metrics);

      expect(report.success).toBe(true);
      expect(report.exitCode).toBe(0);
      expect(report.summary).toContain('3/3 passed');
      expect(report.details).toContain('✅ Passed: 3');
      expect(report.details).toContain('🎉 All performance budgets passed!');
    });

    it('should generate CI report for failing metrics', () => {
      const metrics = {
        lcp: 5000,
        fid: 400
      };

      const report = manager.generateCIReport(metrics);

      expect(report.success).toBe(false);
      expect(report.exitCode).toBe(1);
      expect(report.summary).toContain('failed');
      expect(report.details).toContain('❌ Failed:');
      expect(report.details).toContain('Build failed due to performance budget violations!');
    });

    it('should generate CI report with warnings', () => {
      const metrics = {
        lcp: 2200, // warning
        fid: 50    // pass
      };

      const report = manager.generateCIReport(metrics);

      expect(report.success).toBe(true);
      expect(report.exitCode).toBe(0);
      expect(report.summary).toContain('1 warnings');
      expect(report.details).toContain('⚠️  Warnings: 1');
      expect(report.details).toContain('Build passed with warnings');
    });

    it('should export budgets for CI configuration', () => {
      const configJson = manager.exportBudgetsForCI();
      const config = JSON.parse(configJson);

      expect(config).toHaveProperty('budgets');
      expect(config).toHaveProperty('timestamp');
      expect(config).toHaveProperty('version');
      expect(Array.isArray(config.budgets)).toBe(true);
      expect(config.budgets.length).toBeGreaterThan(0);
    });

    it('should import budgets from CI configuration', () => {
      const customBudgets = [
        {
          metric: 'custom_lcp',
          budget: 3000,
          warning: 2500,
          error: 4500
        }
      ];

      const config = {
        budgets: customBudgets,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };

      manager.importBudgetsFromCI(JSON.stringify(config));
      const imported = manager.getBudget('custom_lcp');

      expect(imported).toEqual(customBudgets[0]);
    });

    it('should handle invalid CI configuration gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      manager.importBudgetsFromCI('invalid json');
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to import performance budgets:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('External Tool Integration', () => {
    it('should generate Lighthouse configuration', () => {
      const config = manager.generateLighthouseConfig();

      expect(config).toHaveProperty('extends');
      expect(config).toHaveProperty('settings');
      expect(config.extends).toBe('lighthouse:default');
    });

    it('should generate Webpack Bundle Analyzer configuration', () => {
      const config = manager.generateWebpackBundleAnalyzerConfig();

      expect(config).toHaveProperty('analyzerMode');
      expect(config).toHaveProperty('reportFilename');
      expect(config).toHaveProperty('generateStatsFile');
      expect(config.analyzerMode).toBe('static');
    });
  });

  describe('Violation Management', () => {
    it('should track violations', () => {
      manager.checkBudget('lcp', 3000);
      manager.checkBudget('fid', 400);

      const violations = manager.getViolations();
      expect(violations).toHaveLength(2);
    });

    it('should clear violations', () => {
      manager.checkBudget('lcp', 3000);
      manager.clearViolations();

      const violations = manager.getViolations();
      expect(violations).toHaveLength(0);
    });
  });

  describe('Budget Status', () => {
    it('should provide budget status overview', () => {
      const status = manager.getBudgetStatus();

      expect(status).toHaveProperty('totalBudgets');
      expect(status).toHaveProperty('activeBudgets');
      expect(status).toHaveProperty('recentViolations');
      expect(status).toHaveProperty('overallHealth');
      expect(status.totalBudgets).toBeGreaterThan(0);
      expect(status.overallHealth).toBe('good');
    });

    it('should reflect health based on recent violations', () => {
      // Create multiple violations
      for (let i = 0; i < 6; i++) {
        manager.checkBudget('lcp', 3000);
      }

      const status = manager.getBudgetStatus();
      expect(status.overallHealth).toBe('critical');
    });
  });

  describe('Alert Generation', () => {
    it('should generate correct violation alert', () => {
      manager.checkBudget('lcp', 3000);

      expect(mockAlertCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringMatching(/^budget-/),
          type: 'budget_exceeded',
          metric: 'lcp',
          currentValue: 3000,
          threshold: 2500,
          severity: 'high',
          timestamp: expect.any(Date),
          url: expect.any(String),
          description: expect.stringContaining('lcp (3000) exceeded budget of 2500')
        })
      );
    });

    it('should handle alert callback errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      manager.onBudgetViolation(errorCallback);
      manager.checkBudget('lcp', 3000);

      expect(consoleSpy).toHaveBeenCalled(); // Should log callback errors
      consoleSpy.mockRestore();
    });
  });
});