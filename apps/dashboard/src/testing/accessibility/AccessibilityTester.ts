import { Page, Browser, chromium } from 'playwright';
import { AxeResults, Result as AxeResult, ImpactValue } from 'axe-core';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

export interface AccessibilityTestConfig {
  name: string;
  url: string;
  selector?: string;
  waitFor?: string | number;
  rules?: {
    [ruleId: string]: { enabled: boolean };
  };
  tags?: string[];
  skipFailures?: boolean;
}

export interface AccessibilityTestResult {
  testName: string;
  url: string;
  passed: boolean;
  violations: AccessibilityViolation[];
  passes: number;
  incomplete: number;
  inapplicable: number;
  wcagLevel: 'AA' | 'AAA';
  score: number;
  error?: string;
}

export interface AccessibilityViolation {
  id: string;
  impact: ImpactValue;
  description: string;
  help: string;
  helpUrl: string;
  nodes: {
    html: string;
    target: string[];
    failureSummary: string;
  }[];
}

export interface ManualTestProtocol {
  category: string;
  tests: ManualTest[];
}

export interface ManualTest {
  id: string;
  description: string;
  steps: string[];
  expectedResult: string;
  assistiveTechnology?: string[];
  wcagCriteria: string[];
}

export class AccessibilityTester {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async runAccessibilityTests(configs: AccessibilityTestConfig[]): Promise<AccessibilityTestResult[]> {
    const results: AccessibilityTestResult[] = [];

    try {
      this.browser = await chromium.launch({ headless: true });
      
      for (const config of configs) {
        const result = await this.runSingleTest(config);
        results.push(result);
      }
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }

    return results;
  }

  private async runSingleTest(config: AccessibilityTestConfig): Promise<AccessibilityTestResult> {
    try {
      this.page = await this.browser!.newPage();
      
      // Navigate to page
      await this.page.goto(config.url);
      
      // Wait for content
      if (config.waitFor) {
        if (typeof config.waitFor === 'string') {
          await this.page.waitForSelector(config.waitFor);
        } else {
          await this.page.waitForTimeout(config.waitFor);
        }
      }

      // Inject axe-core
      await injectAxe(this.page);

      // Configure axe options
      const axeOptions = {
        rules: config.rules || {},
        tags: config.tags || ['wcag2a', 'wcag2aa', 'wcag21aa'],
        ...(config.selector && { include: [config.selector] })
      };

      // Run accessibility check
      const results = await this.page.evaluate((options) => {
        return new Promise((resolve) => {
          // @ts-ignore - axe is injected globally
          window.axe.run(options, (err: any, results: AxeResults) => {
            if (err) throw err;
            resolve(results);
          });
        });
      }, axeOptions) as AxeResults;

      // Process results
      const violations = this.processViolations(results.violations);
      const wcagLevel = this.determineWCAGLevel(violations);
      const score = this.calculateAccessibilityScore(results);
      const passed = violations.filter(v => v.impact === 'critical' || v.impact === 'serious').length === 0;

      return {
        testName: config.name,
        url: config.url,
        passed: config.skipFailures ? true : passed,
        violations,
        passes: results.passes.length,
        incomplete: results.incomplete.length,
        inapplicable: results.inapplicable.length,
        wcagLevel,
        score
      };

    } catch (error) {
      return {
        testName: config.name,
        url: config.url,
        passed: false,
        violations: [],
        passes: 0,
        incomplete: 0,
        inapplicable: 0,
        wcagLevel: 'AA',
        score: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      if (this.page) {
        await this.page.close();
      }
    }
  }

  private processViolations(violations: AxeResult[]): AccessibilityViolation[] {
    return violations.map(violation => ({
      id: violation.id,
      impact: violation.impact!,
      description: violation.description,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.map(node => ({
        html: node.html,
        target: node.target,
        failureSummary: node.failureSummary || ''
      }))
    }));
  }

  private determineWCAGLevel(violations: AccessibilityViolation[]): 'AA' | 'AAA' {
    const hasAAViolations = violations.some(v => 
      v.impact === 'critical' || v.impact === 'serious'
    );
    return hasAAViolations ? 'AA' : 'AAA';
  }

  private calculateAccessibilityScore(results: AxeResults): number {
    const total = results.violations.length + results.passes.length;
    if (total === 0) return 100;
    
    const weightedScore = results.violations.reduce((score, violation) => {
      const weight = this.getViolationWeight(violation.impact!);
      return score - (weight * violation.nodes.length);
    }, 100);

    return Math.max(0, Math.min(100, weightedScore));
  }

  private getViolationWeight(impact: ImpactValue): number {
    switch (impact) {
      case 'critical': return 25;
      case 'serious': return 15;
      case 'moderate': return 5;
      case 'minor': return 1;
      default: return 1;
    }
  }

  generateManualTestProtocols(): ManualTestProtocol[] {
    return [
      {
        category: 'Keyboard Navigation',
        tests: [
          {
            id: 'keyboard-nav-001',
            description: 'All interactive elements are keyboard accessible',
            steps: [
              'Navigate through the page using only the Tab key',
              'Verify all buttons, links, and form controls receive focus',
              'Check that focus indicators are clearly visible'
            ],
            expectedResult: 'All interactive elements can be reached and activated using keyboard only',
            assistiveTechnology: ['keyboard'],
            wcagCriteria: ['2.1.1', '2.4.7']
          },
          {
            id: 'keyboard-nav-002',
            description: 'Logical tab order is maintained',
            steps: [
              'Tab through the page from top to bottom',
              'Verify focus moves in a logical sequence',
              'Check that focus doesn\'t jump unexpectedly'
            ],
            expectedResult: 'Tab order follows visual layout and logical flow',
            assistiveTechnology: ['keyboard'],
            wcagCriteria: ['2.4.3']
          }
        ]
      },
      {
        category: 'Screen Reader',
        tests: [
          {
            id: 'screen-reader-001',
            description: 'All content is announced by screen reader',
            steps: [
              'Navigate the page using NVDA/JAWS/VoiceOver',
              'Verify all text content is announced',
              'Check that images have appropriate alt text'
            ],
            expectedResult: 'All meaningful content is accessible to screen readers',
            assistiveTechnology: ['NVDA', 'JAWS', 'VoiceOver'],
            wcagCriteria: ['1.1.1', '1.3.1']
          },
          {
            id: 'screen-reader-002',
            description: 'Interactive elements have proper labels',
            steps: [
              'Navigate to form controls using screen reader',
              'Verify each control has a descriptive label',
              'Check that button purposes are clear'
            ],
            expectedResult: 'All interactive elements have clear, descriptive labels',
            assistiveTechnology: ['NVDA', 'JAWS', 'VoiceOver'],
            wcagCriteria: ['1.3.1', '2.4.6', '3.3.2']
          }
        ]
      },
      {
        category: 'Visual Accessibility',
        tests: [
          {
            id: 'visual-001',
            description: 'Color contrast meets WCAG standards',
            steps: [
              'Use color contrast analyzer on all text',
              'Check contrast ratios for normal and large text',
              'Verify interactive elements meet contrast requirements'
            ],
            expectedResult: 'All text has minimum 4.5:1 contrast ratio (3:1 for large text)',
            wcagCriteria: ['1.4.3', '1.4.6']
          },
          {
            id: 'visual-002',
            description: 'Content is usable at 200% zoom',
            steps: [
              'Zoom browser to 200%',
              'Verify all content remains visible and usable',
              'Check that horizontal scrolling is not required'
            ],
            expectedResult: 'All functionality remains available at 200% zoom',
            wcagCriteria: ['1.4.4', '1.4.10']
          }
        ]
      }
    ];
  }

  async generateAccessibilityReport(results: AccessibilityTestResult[]): Promise<string> {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / totalTests;
    
    const criticalViolations = results.flatMap(r => 
      r.violations.filter(v => v.impact === 'critical')
    );
    
    const seriousViolations = results.flatMap(r => 
      r.violations.filter(v => v.impact === 'serious')
    );

    const report = {
      summary: {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        passRate: (passedTests / totalTests) * 100,
        averageScore: Math.round(averageScore),
        criticalViolations: criticalViolations.length,
        seriousViolations: seriousViolations.length
      },
      results: results.map(r => ({
        testName: r.testName,
        url: r.url,
        passed: r.passed,
        score: r.score,
        wcagLevel: r.wcagLevel,
        violationCount: r.violations.length,
        criticalViolations: r.violations.filter(v => v.impact === 'critical').length,
        seriousViolations: r.violations.filter(v => v.impact === 'serious').length
      })),
      violations: {
        critical: criticalViolations.map(v => ({
          id: v.id,
          description: v.description,
          help: v.help,
          helpUrl: v.helpUrl,
          occurrences: v.nodes.length
        })),
        serious: seriousViolations.map(v => ({
          id: v.id,
          description: v.description,
          help: v.help,
          helpUrl: v.helpUrl,
          occurrences: v.nodes.length
        }))
      },
      manualTestProtocols: this.generateManualTestProtocols()
    };

    return JSON.stringify(report, null, 2);
  }
}