import { VisualRegressionTester, VisualTestResult } from '../visual-regression/VisualRegressionTester';
import { AccessibilityTester, AccessibilityTestResult } from '../accessibility/AccessibilityTester';
import { UsabilityTester, UsabilityTestResult } from '../usability/UsabilityTester';
import { ABTestingFramework, ABTestAnalysis } from '../ab-testing/ABTestingFramework';
import { UserBehaviorAnalytics, BehaviorInsight } from '../analytics/UserBehaviorAnalytics';

import { visualTestConfigs } from '../visual-regression/visual-regression.config';
import { accessibilityTestConfigs } from '../accessibility/accessibility-test.config';
import { userJourneys } from '../usability/user-journeys.config';
import { abTestConfigs } from '../ab-testing/ab-tests.config';
import { analyticsConfig } from '../analytics/analytics.config';

export interface UXTestSuiteConfig {
  runVisualRegression: boolean;
  runAccessibilityTests: boolean;
  runUsabilityTests: boolean;
  runABTests: boolean;
  runAnalytics: boolean;
  parallel: boolean;
  reportFormat: 'json' | 'html' | 'both';
  outputDir: string;
}

export interface UXTestSuiteResult {
  summary: TestSummary;
  visualRegression?: VisualTestResult[];
  accessibility?: AccessibilityTestResult[];
  usability?: UsabilityTestResult[];
  abTesting?: ABTestAnalysis[];
  analytics?: BehaviorInsight[];
  recommendations: UXRecommendation[];
  timestamp: Date;
  duration: number;
}

export interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  passRate: number;
  criticalIssues: number;
  warnings: number;
}

export interface UXRecommendation {
  category: 'visual' | 'accessibility' | 'usability' | 'performance' | 'engagement';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  actionItems: string[];
  relatedTests: string[];
}

export class UXTestSuite {
  private visualTester: VisualRegressionTester;
  private accessibilityTester: AccessibilityTester;
  private usabilityTester: UsabilityTester;
  private abTestFramework: ABTestingFramework;
  private analytics: UserBehaviorAnalytics;

  constructor() {
    this.visualTester = new VisualRegressionTester();
    this.accessibilityTester = new AccessibilityTester();
    this.usabilityTester = new UsabilityTester();
    this.abTestFramework = new ABTestingFramework();
    this.analytics = new UserBehaviorAnalytics(analyticsConfig);
  }

  async runFullSuite(config: UXTestSuiteConfig): Promise<UXTestSuiteResult> {
    const startTime = Date.now();
    const results: Partial<UXTestSuiteResult> = {
      timestamp: new Date(),
      recommendations: []
    };

    console.log('🚀 Starting UX Test Suite...');

    try {
      if (config.parallel) {
        // Run tests in parallel for faster execution
        const promises: Promise<any>[] = [];

        if (config.runVisualRegression) {
          promises.push(this.runVisualRegressionTests());
        }
        if (config.runAccessibilityTests) {
          promises.push(this.runAccessibilityTests());
        }
        if (config.runUsabilityTests) {
          promises.push(this.runUsabilityTests());
        }
        if (config.runABTests) {
          promises.push(this.runABTests());
        }
        if (config.runAnalytics) {
          promises.push(this.runAnalyticsTests());
        }

        const parallelResults = await Promise.allSettled(promises);
        
        // Process parallel results
        let index = 0;
        if (config.runVisualRegression) {
          const result = parallelResults[index++];
          if (result.status === 'fulfilled') {
            results.visualRegression = result.value;
          }
        }
        if (config.runAccessibilityTests) {
          const result = parallelResults[index++];
          if (result.status === 'fulfilled') {
            results.accessibility = result.value;
          }
        }
        if (config.runUsabilityTests) {
          const result = parallelResults[index++];
          if (result.status === 'fulfilled') {
            results.usability = result.value;
          }
        }
        if (config.runABTests) {
          const result = parallelResults[index++];
          if (result.status === 'fulfilled') {
            results.abTesting = result.value;
          }
        }
        if (config.runAnalytics) {
          const result = parallelResults[index++];
          if (result.status === 'fulfilled') {
            results.analytics = result.value;
          }
        }
      } else {
        // Run tests sequentially
        if (config.runVisualRegression) {
          console.log('📸 Running visual regression tests...');
          results.visualRegression = await this.runVisualRegressionTests();
        }

        if (config.runAccessibilityTests) {
          console.log('♿ Running accessibility tests...');
          results.accessibility = await this.runAccessibilityTests();
        }

        if (config.runUsabilityTests) {
          console.log('👤 Running usability tests...');
          results.usability = await this.runUsabilityTests();
        }

        if (config.runABTests) {
          console.log('🧪 Running A/B tests analysis...');
          results.abTesting = await this.runABTests();
        }

        if (config.runAnalytics) {
          console.log('📊 Running analytics tests...');
          results.analytics = await this.runAnalyticsTests();
        }
      }

      // Generate summary and recommendations
      results.summary = this.generateSummary(results);
      results.recommendations = this.generateRecommendations(results);
      results.duration = Date.now() - startTime;

      // Generate reports
      await this.generateReports(results as UXTestSuiteResult, config);

      console.log('✅ UX Test Suite completed successfully!');
      console.log(`📊 Summary: ${results.summary.passedTests}/${results.summary.totalTests} tests passed`);
      console.log(`⚠️  Critical issues: ${results.summary.criticalIssues}`);

      return results as UXTestSuiteResult;

    } catch (error) {
      console.error('❌ UX Test Suite failed:', error);
      throw error;
    }
  }

  private async runVisualRegressionTests(): Promise<VisualTestResult[]> {
    return await this.visualTester.runVisualTests(visualTestConfigs);
  }

  private async runAccessibilityTests(): Promise<AccessibilityTestResult[]> {
    return await this.accessibilityTester.runAccessibilityTests(accessibilityTestConfigs);
  }

  private async runUsabilityTests(): Promise<UsabilityTestResult[]> {
    return await this.usabilityTester.runUsabilityTests(userJourneys);
  }

  private async runABTests(): Promise<ABTestAnalysis[]> {
    // Set up A/B tests
    const analyses: ABTestAnalysis[] = [];
    
    for (const testConfig of abTestConfigs) {
      const test = this.abTestFramework.createTest(testConfig);
      this.abTestFramework.startTest(test.id);
      
      // Simulate some test data for analysis
      // In real implementation, this would analyze actual test data
      const analysis = this.abTestFramework.analyzeTest(test.id);
      analyses.push(analysis);
    }

    return analyses;
  }

  private async runAnalyticsTests(): Promise<BehaviorInsight[]> {
    // Generate behavior insights from collected data
    const timeRange = {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      end: new Date()
    };

    return this.analytics.generateBehaviorInsights(timeRange);
  }

  private generateSummary(results: Partial<UXTestSuiteResult>): TestSummary {
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let criticalIssues = 0;
    let warnings = 0;

    // Visual regression results
    if (results.visualRegression) {
      totalTests += results.visualRegression.length;
      passedTests += results.visualRegression.filter(r => r.passed).length;
      failedTests += results.visualRegression.filter(r => !r.passed).length;
    }

    // Accessibility results
    if (results.accessibility) {
      totalTests += results.accessibility.length;
      passedTests += results.accessibility.filter(r => r.passed).length;
      failedTests += results.accessibility.filter(r => !r.passed).length;
      
      criticalIssues += results.accessibility.reduce((sum, r) => 
        sum + r.violations.filter(v => v.impact === 'critical').length, 0
      );
      warnings += results.accessibility.reduce((sum, r) => 
        sum + r.violations.filter(v => v.impact === 'moderate' || v.impact === 'minor').length, 0
      );
    }

    // Usability results
    if (results.usability) {
      totalTests += results.usability.length;
      passedTests += results.usability.filter(r => r.completed).length;
      failedTests += results.usability.filter(r => !r.completed).length;
      
      criticalIssues += results.usability.reduce((sum, r) => 
        sum + r.errors.filter(e => e.severity === 'critical').length, 0
      );
    }

    // A/B testing results
    if (results.abTesting) {
      totalTests += results.abTesting.length;
      passedTests += results.abTesting.filter(r => r.statisticalSignificance).length;
    }

    return {
      totalTests,
      passedTests,
      failedTests,
      skippedTests: 0,
      passRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
      criticalIssues,
      warnings
    };
  }

  private generateRecommendations(results: Partial<UXTestSuiteResult>): UXRecommendation[] {
    const recommendations: UXRecommendation[] = [];

    // Visual regression recommendations
    if (results.visualRegression) {
      const failedVisualTests = results.visualRegression.filter(r => !r.passed);
      if (failedVisualTests.length > 0) {
        recommendations.push({
          category: 'visual',
          priority: 'high',
          title: 'Visual Regression Issues Detected',
          description: `${failedVisualTests.length} visual regression tests failed`,
          impact: 'Visual inconsistencies may confuse users and damage brand perception',
          effort: 'medium',
          actionItems: [
            'Review failed visual tests and update baselines if changes are intentional',
            'Fix unintended visual changes in components',
            'Implement stricter visual review process'
          ],
          relatedTests: failedVisualTests.map(t => t.testName)
        });
      }
    }

    // Accessibility recommendations
    if (results.accessibility) {
      const criticalA11yIssues = results.accessibility.flatMap(r => 
        r.violations.filter(v => v.impact === 'critical')
      );
      
      if (criticalA11yIssues.length > 0) {
        recommendations.push({
          category: 'accessibility',
          priority: 'critical',
          title: 'Critical Accessibility Issues',
          description: `${criticalA11yIssues.length} critical accessibility violations found`,
          impact: 'Prevents users with disabilities from using the application',
          effort: 'high',
          actionItems: [
            'Fix critical accessibility violations immediately',
            'Implement accessibility testing in CI/CD pipeline',
            'Conduct manual testing with assistive technologies',
            'Provide accessibility training for development team'
          ],
          relatedTests: results.accessibility.filter(r => 
            r.violations.some(v => v.impact === 'critical')
          ).map(r => r.testName)
        });
      }
    }

    // Usability recommendations
    if (results.usability) {
      const lowCompletionRate = results.usability.filter(r => !r.completed).length / 
                               results.usability.length > 0.2;
      
      if (lowCompletionRate) {
        recommendations.push({
          category: 'usability',
          priority: 'high',
          title: 'Low Task Completion Rate',
          description: 'Users are struggling to complete common tasks',
          impact: 'Poor user experience leads to user frustration and abandonment',
          effort: 'high',
          actionItems: [
            'Simplify complex user workflows',
            'Improve navigation and information architecture',
            'Add contextual help and guidance',
            'Conduct user interviews to understand pain points'
          ],
          relatedTests: results.usability.filter(r => !r.completed).map(r => r.journeyName)
        });
      }
    }

    // Performance recommendations
    const performanceIssues = this.detectPerformanceIssues(results);
    if (performanceIssues.length > 0) {
      recommendations.push({
        category: 'performance',
        priority: 'medium',
        title: 'Performance Optimization Needed',
        description: 'Slow loading times detected in user journeys',
        impact: 'Slow performance frustrates users and reduces engagement',
        effort: 'medium',
        actionItems: [
          'Optimize critical rendering path',
          'Implement lazy loading for non-critical resources',
          'Reduce bundle size and eliminate unused code',
          'Optimize images and other assets'
        ],
        relatedTests: performanceIssues
      });
    }

    // Sort recommendations by priority
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return recommendations.sort((a, b) => 
      priorityOrder[b.priority] - priorityOrder[a.priority]
    );
  }

  private detectPerformanceIssues(results: Partial<UXTestSuiteResult>): string[] {
    const issues: string[] = [];
    
    if (results.usability) {
      results.usability.forEach(result => {
        if (result.metrics.timeToFirstInteraction > 3) { // 3 seconds
          issues.push(result.journeyName);
        }
      });
    }

    return issues;
  }

  private async generateReports(
    results: UXTestSuiteResult, 
    config: UXTestSuiteConfig
  ): Promise<void> {
    const { promises: fs } = await import('fs');
    const path = await import('path');

    // Ensure output directory exists
    await fs.mkdir(config.outputDir, { recursive: true });

    if (config.reportFormat === 'json' || config.reportFormat === 'both') {
      const jsonReport = JSON.stringify(results, null, 2);
      await fs.writeFile(
        path.join(config.outputDir, 'ux-test-report.json'),
        jsonReport
      );
    }

    if (config.reportFormat === 'html' || config.reportFormat === 'both') {
      const htmlReport = this.generateHTMLReport(results);
      await fs.writeFile(
        path.join(config.outputDir, 'ux-test-report.html'),
        htmlReport
      );
    }

    // Generate individual test reports
    if (results.visualRegression) {
      await this.visualTester.generateReport(results.visualRegression);
    }

    if (results.accessibility) {
      const a11yReport = await this.accessibilityTester.generateAccessibilityReport(results.accessibility);
      await fs.writeFile(
        path.join(config.outputDir, 'accessibility-report.json'),
        a11yReport
      );
    }
  }

  private generateHTMLReport(results: UXTestSuiteResult): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UX Test Suite Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .recommendations { margin-top: 30px; }
        .recommendation { background: white; padding: 20px; margin-bottom: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .priority-critical { border-left: 4px solid #dc3545; }
        .priority-high { border-left: 4px solid #fd7e14; }
        .priority-medium { border-left: 4px solid #ffc107; }
        .priority-low { border-left: 4px solid #28a745; }
        .test-results { margin-top: 30px; }
        .test-section { margin-bottom: 30px; }
        .test-item { background: #f8f9fa; padding: 15px; margin-bottom: 10px; border-radius: 4px; }
        .passed { border-left: 4px solid #28a745; }
        .failed { border-left: 4px solid #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>UX Test Suite Report</h1>
        <p>Generated on ${results.timestamp.toLocaleString()}</p>
        <p>Duration: ${(results.duration / 1000).toFixed(2)} seconds</p>
    </div>

    <div class="summary">
        <div class="metric">
            <div class="metric-value">${results.summary.passRate.toFixed(1)}%</div>
            <div>Pass Rate</div>
        </div>
        <div class="metric">
            <div class="metric-value">${results.summary.totalTests}</div>
            <div>Total Tests</div>
        </div>
        <div class="metric">
            <div class="metric-value">${results.summary.criticalIssues}</div>
            <div>Critical Issues</div>
        </div>
        <div class="metric">
            <div class="metric-value">${results.summary.warnings}</div>
            <div>Warnings</div>
        </div>
    </div>

    <div class="recommendations">
        <h2>Recommendations</h2>
        ${results.recommendations.map(rec => `
            <div class="recommendation priority-${rec.priority}">
                <h3>${rec.title}</h3>
                <p><strong>Priority:</strong> ${rec.priority.toUpperCase()}</p>
                <p><strong>Impact:</strong> ${rec.impact}</p>
                <p><strong>Effort:</strong> ${rec.effort}</p>
                <p>${rec.description}</p>
                <h4>Action Items:</h4>
                <ul>
                    ${rec.actionItems.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
        `).join('')}
    </div>

    <div class="test-results">
        <h2>Test Results</h2>
        
        ${results.visualRegression ? `
            <div class="test-section">
                <h3>Visual Regression Tests</h3>
                ${results.visualRegression.map(test => `
                    <div class="test-item ${test.passed ? 'passed' : 'failed'}">
                        <strong>${test.testName}</strong> (${test.browser})
                        ${test.passed ? '✅ Passed' : '❌ Failed'}
                        ${test.diffPercentage ? ` - ${test.diffPercentage.toFixed(2)}% difference` : ''}
                    </div>
                `).join('')}
            </div>
        ` : ''}

        ${results.accessibility ? `
            <div class="test-section">
                <h3>Accessibility Tests</h3>
                ${results.accessibility.map(test => `
                    <div class="test-item ${test.passed ? 'passed' : 'failed'}">
                        <strong>${test.testName}</strong>
                        ${test.passed ? '✅ Passed' : '❌ Failed'}
                        - Score: ${test.score}/100
                        - Violations: ${test.violations.length}
                    </div>
                `).join('')}
            </div>
        ` : ''}

        ${results.usability ? `
            <div class="test-section">
                <h3>Usability Tests</h3>
                ${results.usability.map(test => `
                    <div class="test-item ${test.completed ? 'passed' : 'failed'}">
                        <strong>${test.journeyName}</strong> (${test.persona})
                        ${test.completed ? '✅ Completed' : '❌ Failed'}
                        - Time: ${test.completionTime.toFixed(1)}s
                        - Errors: ${test.errors.length}
                    </div>
                `).join('')}
            </div>
        ` : ''}
    </div>
</body>
</html>
    `;
  }
}