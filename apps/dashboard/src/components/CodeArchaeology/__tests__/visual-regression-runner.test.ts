/**
 * Visual Regression Test Runner
 * Orchestrates all visual regression tests and provides comprehensive reporting
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Test suite configuration
interface TestSuiteConfig {
  name: string;
  testFile: string;
  timeout: number;
  retries: number;
  parallel: boolean;
  tags: string[];
}

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: string[];
  screenshots: string[];
}

interface VisualRegressionReport {
  timestamp: Date;
  totalSuites: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalDuration: number;
  results: TestResult[];
  summary: {
    screenshotComparisons: number;
    animationTests: number;
    crossBrowserTests: number;
    accessibilityTests: number;
    performanceTests: number;
  };
}

const testSuites: TestSuiteConfig[] = [
  {
    name: 'Visual Regression Core',
    testFile: 'visual-regression.test.ts',
    timeout: 30000,
    retries: 2,
    parallel: false,
    tags: ['visual', 'screenshot', 'core'],
  },
  {
    name: 'Animation Accuracy',
    testFile: 'animation-accuracy.test.ts',
    timeout: 45000,
    retries: 1,
    parallel: false,
    tags: ['animation', 'temporal', 'accuracy'],
  },
  {
    name: 'Cross-Browser WebGL',
    testFile: 'cross-browser-webgl.test.ts',
    timeout: 60000,
    retries: 3,
    parallel: true,
    tags: ['webgl', 'browser', 'compatibility'],
  },
  {
    name: 'Accessibility 3D',
    testFile: 'accessibility-3d.test.ts',
    timeout: 40000,
    retries: 1,
    parallel: false,
    tags: ['accessibility', 'a11y', 'wcag'],
  },
];

class VisualRegressionRunner {
  private reportDir: string;
  private screenshotDir: string;
  private results: TestResult[] = [];

  constructor() {
    this.reportDir = join(process.cwd(), 'test-reports', 'visual-regression');
    this.screenshotDir = join(this.reportDir, 'screenshots');
    
    // Ensure directories exist
    if (!existsSync(this.reportDir)) {
      mkdirSync(this.reportDir, { recursive: true });
    }
    if (!existsSync(this.screenshotDir)) {
      mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  async runAllSuites(): Promise<VisualRegressionReport> {
    console.log('🚀 Starting Visual Regression Test Suite');
    console.log(`📁 Reports will be saved to: ${this.reportDir}`);
    
    const startTime = Date.now();
    
    // Run test suites
    for (const suite of testSuites) {
      console.log(`\n🧪 Running ${suite.name}...`);
      const result = await this.runTestSuite(suite);
      this.results.push(result);
      
      if (result.failed > 0) {
        console.log(`❌ ${suite.name} failed with ${result.failed} failures`);
      } else {
        console.log(`✅ ${suite.name} passed (${result.passed} tests)`);
      }
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Generate comprehensive report
    const report = this.generateReport(totalDuration);
    await this.saveReport(report);
    
    console.log('\n📊 Visual Regression Test Summary:');
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Passed: ${report.passedTests}`);
    console.log(`Failed: ${report.failedTests}`);
    console.log(`Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    
    return report;
  }

  private async runTestSuite(suite: TestSuiteConfig): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Construct Jest command
      const jestCommand = [
        'npx jest',
        `--testPathPattern=${suite.testFile}`,
        `--timeout=${suite.timeout}`,
        '--verbose',
        '--no-cache',
        '--forceExit',
        suite.parallel ? '--maxWorkers=4' : '--maxWorkers=1',
        '--json',
        '--outputFile=' + join(this.reportDir, `${suite.name.replace(/\s+/g, '-').toLowerCase()}-results.json`),
      ].join(' ');

      // Run tests with retries
      let lastError: Error | null = null;
      let attempt = 0;
      
      while (attempt <= suite.retries) {
        try {
          const output = execSync(jestCommand, {
            cwd: process.cwd(),
            encoding: 'utf8',
            stdio: 'pipe',
          });
          
          // Parse Jest output
          return this.parseJestOutput(suite, output, Date.now() - startTime);
          
        } catch (error) {
          lastError = error as Error;
          attempt++;
          
          if (attempt <= suite.retries) {
            console.log(`⚠️  Attempt ${attempt} failed, retrying...`);
            await this.delay(1000 * attempt); // Exponential backoff
          }
        }
      }
      
      // All retries failed
      return {
        suite: suite.name,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: Date.now() - startTime,
        errors: [lastError?.message || 'Unknown error'],
        screenshots: [],
      };
      
    } catch (error) {
      return {
        suite: suite.name,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        screenshots: [],
      };
    }
  }

  private parseJestOutput(suite: TestSuiteConfig, output: string, duration: number): TestResult {
    try {
      // Try to parse JSON output
      const lines = output.split('\n');
      const jsonLine = lines.find(line => line.trim().startsWith('{'));
      
      if (jsonLine) {
        const jestResult = JSON.parse(jsonLine);
        
        return {
          suite: suite.name,
          passed: jestResult.numPassedTests || 0,
          failed: jestResult.numFailedTests || 0,
          skipped: jestResult.numPendingTests || 0,
          duration,
          errors: jestResult.testResults?.flatMap((tr: any) => 
            tr.message ? [tr.message] : []
          ) || [],
          screenshots: this.extractScreenshotPaths(output),
        };
      }
    } catch (parseError) {
      // Fallback to text parsing
      console.warn('Failed to parse Jest JSON output, falling back to text parsing');
    }

    // Fallback text parsing
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    const skippedMatch = output.match(/(\d+) skipped/);

    return {
      suite: suite.name,
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
      duration,
      errors: this.extractErrors(output),
      screenshots: this.extractScreenshotPaths(output),
    };
  }

  private extractErrors(output: string): string[] {
    const errors: string[] = [];
    const lines = output.split('\n');
    
    let inError = false;
    let currentError = '';
    
    for (const line of lines) {
      if (line.includes('FAIL') || line.includes('Error:')) {
        inError = true;
        currentError = line;
      } else if (inError && line.trim() === '') {
        if (currentError) {
          errors.push(currentError);
          currentError = '';
        }
        inError = false;
      } else if (inError) {
        currentError += '\n' + line;
      }
    }
    
    if (currentError) {
      errors.push(currentError);
    }
    
    return errors;
  }

  private extractScreenshotPaths(output: string): string[] {
    const screenshots: string[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('screenshot') && line.includes('.png')) {
        const match = line.match(/([^\s]+\.png)/);
        if (match) {
          screenshots.push(match[1]);
        }
      }
    }
    
    return screenshots;
  }

  private generateReport(totalDuration: number): VisualRegressionReport {
    const totalTests = this.results.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0);
    const passedTests = this.results.reduce((sum, r) => sum + r.passed, 0);
    const failedTests = this.results.reduce((sum, r) => sum + r.failed, 0);
    const skippedTests = this.results.reduce((sum, r) => sum + r.skipped, 0);

    // Calculate test type summary
    const summary = {
      screenshotComparisons: this.countTestsByTag(['visual', 'screenshot']),
      animationTests: this.countTestsByTag(['animation', 'temporal']),
      crossBrowserTests: this.countTestsByTag(['browser', 'compatibility']),
      accessibilityTests: this.countTestsByTag(['accessibility', 'a11y']),
      performanceTests: this.countTestsByTag(['performance']),
    };

    return {
      timestamp: new Date(),
      totalSuites: testSuites.length,
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      totalDuration,
      results: this.results,
      summary,
    };
  }

  private countTestsByTag(tags: string[]): number {
    return testSuites
      .filter(suite => tags.some(tag => suite.tags.includes(tag)))
      .reduce((sum, suite) => {
        const result = this.results.find(r => r.suite === suite.name);
        return sum + (result ? result.passed + result.failed : 0);
      }, 0);
  }

  private async saveReport(report: VisualRegressionReport): Promise<void> {
    // Save JSON report
    const jsonPath = join(this.reportDir, 'visual-regression-report.json');
    writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlPath = join(this.reportDir, 'visual-regression-report.html');
    writeFileSync(htmlPath, htmlReport);

    // Generate markdown summary
    const markdownReport = this.generateMarkdownReport(report);
    const markdownPath = join(this.reportDir, 'visual-regression-summary.md');
    writeFileSync(markdownPath, markdownReport);

    console.log(`📄 Reports saved:`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   HTML: ${htmlPath}`);
    console.log(`   Markdown: ${markdownPath}`);
  }

  private generateHTMLReport(report: VisualRegressionReport): string {
    const passRate = ((report.passedTests / report.totalTests) * 100).toFixed(1);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visual Regression Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .header h1 { color: #333; margin-bottom: 10px; }
        .header .timestamp { color: #666; font-size: 14px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; color: #495057; font-size: 14px; text-transform: uppercase; }
        .summary-card .value { font-size: 32px; font-weight: bold; margin-bottom: 5px; }
        .summary-card.passed .value { color: #28a745; }
        .summary-card.failed .value { color: #dc3545; }
        .summary-card.skipped .value { color: #ffc107; }
        .summary-card.duration .value { color: #17a2b8; }
        .test-types { margin-bottom: 40px; }
        .test-types h2 { color: #333; margin-bottom: 20px; }
        .test-type-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
        .test-type { background: #e9ecef; padding: 15px; border-radius: 6px; }
        .test-type h4 { margin: 0 0 10px 0; color: #495057; }
        .test-type .count { font-size: 24px; font-weight: bold; color: #007bff; }
        .results { margin-bottom: 40px; }
        .results h2 { color: #333; margin-bottom: 20px; }
        .result-item { background: #f8f9fa; margin-bottom: 15px; padding: 20px; border-radius: 6px; border-left: 4px solid #dee2e6; }
        .result-item.passed { border-left-color: #28a745; }
        .result-item.failed { border-left-color: #dc3545; }
        .result-item h3 { margin: 0 0 10px 0; color: #333; }
        .result-stats { display: flex; gap: 20px; margin-bottom: 10px; }
        .result-stat { font-size: 14px; }
        .result-stat.passed { color: #28a745; }
        .result-stat.failed { color: #dc3545; }
        .result-stat.skipped { color: #ffc107; }
        .errors { margin-top: 15px; }
        .errors h4 { color: #dc3545; margin: 0 0 10px 0; font-size: 14px; }
        .error { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; margin-bottom: 5px; }
        .screenshots { margin-top: 15px; }
        .screenshots h4 { color: #007bff; margin: 0 0 10px 0; font-size: 14px; }
        .screenshot-list { display: flex; flex-wrap: wrap; gap: 10px; }
        .screenshot { background: #d1ecf1; color: #0c5460; padding: 5px 10px; border-radius: 4px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Visual Regression Test Report</h1>
            <div class="timestamp">Generated on ${report.timestamp.toLocaleString()}</div>
        </div>

        <div class="summary">
            <div class="summary-card passed">
                <h3>Passed Tests</h3>
                <div class="value">${report.passedTests}</div>
                <div>${passRate}% pass rate</div>
            </div>
            <div class="summary-card failed">
                <h3>Failed Tests</h3>
                <div class="value">${report.failedTests}</div>
            </div>
            <div class="summary-card skipped">
                <h3>Skipped Tests</h3>
                <div class="value">${report.skippedTests}</div>
            </div>
            <div class="summary-card duration">
                <h3>Total Duration</h3>
                <div class="value">${(report.totalDuration / 1000).toFixed(1)}s</div>
            </div>
        </div>

        <div class="test-types">
            <h2>Test Categories</h2>
            <div class="test-type-grid">
                <div class="test-type">
                    <h4>Screenshot Comparisons</h4>
                    <div class="count">${report.summary.screenshotComparisons}</div>
                </div>
                <div class="test-type">
                    <h4>Animation Tests</h4>
                    <div class="count">${report.summary.animationTests}</div>
                </div>
                <div class="test-type">
                    <h4>Cross-Browser Tests</h4>
                    <div class="count">${report.summary.crossBrowserTests}</div>
                </div>
                <div class="test-type">
                    <h4>Accessibility Tests</h4>
                    <div class="count">${report.summary.accessibilityTests}</div>
                </div>
            </div>
        </div>

        <div class="results">
            <h2>Test Suite Results</h2>
            ${report.results.map(result => `
                <div class="result-item ${result.failed > 0 ? 'failed' : 'passed'}">
                    <h3>${result.suite}</h3>
                    <div class="result-stats">
                        <span class="result-stat passed">✅ ${result.passed} passed</span>
                        <span class="result-stat failed">❌ ${result.failed} failed</span>
                        <span class="result-stat skipped">⏭️ ${result.skipped} skipped</span>
                        <span class="result-stat">⏱️ ${(result.duration / 1000).toFixed(2)}s</span>
                    </div>
                    ${result.errors.length > 0 ? `
                        <div class="errors">
                            <h4>Errors:</h4>
                            ${result.errors.map(error => `<div class="error">${error}</div>`).join('')}
                        </div>
                    ` : ''}
                    ${result.screenshots.length > 0 ? `
                        <div class="screenshots">
                            <h4>Screenshots:</h4>
                            <div class="screenshot-list">
                                ${result.screenshots.map(screenshot => `<span class="screenshot">${screenshot}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
  }

  private generateMarkdownReport(report: VisualRegressionReport): string {
    const passRate = ((report.passedTests / report.totalTests) * 100).toFixed(1);
    
    return `# Visual Regression Test Report

**Generated:** ${report.timestamp.toLocaleString()}

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${report.totalTests} |
| Passed | ${report.passedTests} (${passRate}%) |
| Failed | ${report.failedTests} |
| Skipped | ${report.skippedTests} |
| Duration | ${(report.totalDuration / 1000).toFixed(2)}s |

## Test Categories

| Category | Count |
|----------|-------|
| Screenshot Comparisons | ${report.summary.screenshotComparisons} |
| Animation Tests | ${report.summary.animationTests} |
| Cross-Browser Tests | ${report.summary.crossBrowserTests} |
| Accessibility Tests | ${report.summary.accessibilityTests} |

## Test Suite Results

${report.results.map(result => `
### ${result.suite}

- ✅ **Passed:** ${result.passed}
- ❌ **Failed:** ${result.failed}
- ⏭️ **Skipped:** ${result.skipped}
- ⏱️ **Duration:** ${(result.duration / 1000).toFixed(2)}s

${result.errors.length > 0 ? `
**Errors:**
${result.errors.map(error => `\`\`\`\n${error}\n\`\`\``).join('\n')}
` : ''}

${result.screenshots.length > 0 ? `
**Screenshots:** ${result.screenshots.join(', ')}
` : ''}
`).join('')}

## Recommendations

${report.failedTests > 0 ? `
⚠️ **${report.failedTests} tests failed.** Review the errors above and:
- Check for visual regressions in screenshot comparisons
- Verify animation timing and accuracy
- Test cross-browser compatibility issues
- Address accessibility violations
` : '✅ All tests passed! The 3D visualization system is working correctly.'}

${report.passedTests / report.totalTests < 0.95 ? `
📊 **Pass rate is below 95%.** Consider:
- Increasing test stability
- Reviewing flaky tests
- Improving error handling
` : ''}
`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main test runner
describe('Visual Regression Test Runner', () => {
  let runner: VisualRegressionRunner;

  beforeAll(() => {
    runner = new VisualRegressionRunner();
  });

  it('should run all visual regression test suites', async () => {
    const report = await runner.runAllSuites();
    
    expect(report).toBeDefined();
    expect(report.totalSuites).toBe(testSuites.length);
    expect(report.totalTests).toBeGreaterThan(0);
    expect(report.results).toHaveLength(testSuites.length);
    
    // Log summary for CI/CD
    console.log('\n=== VISUAL REGRESSION TEST SUMMARY ===');
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Passed: ${report.passedTests}`);
    console.log(`Failed: ${report.failedTests}`);
    console.log(`Pass Rate: ${((report.passedTests / report.totalTests) * 100).toFixed(1)}%`);
    console.log(`Duration: ${(report.totalDuration / 1000).toFixed(2)}s`);
    console.log('=====================================\n');
    
    // Fail the test if any visual regression tests failed
    if (report.failedTests > 0) {
      throw new Error(`${report.failedTests} visual regression tests failed. Check the report for details.`);
    }
  }, 300000); // 5 minute timeout for all tests

  it('should generate comprehensive reports', async () => {
    const report = await runner.runAllSuites();
    
    // Verify report structure
    expect(report.timestamp).toBeInstanceOf(Date);
    expect(report.summary).toBeDefined();
    expect(report.summary.screenshotComparisons).toBeGreaterThanOrEqual(0);
    expect(report.summary.animationTests).toBeGreaterThanOrEqual(0);
    expect(report.summary.crossBrowserTests).toBeGreaterThanOrEqual(0);
    expect(report.summary.accessibilityTests).toBeGreaterThanOrEqual(0);
    
    // Verify all test suites were executed
    const suiteNames = report.results.map(r => r.suite);
    testSuites.forEach(suite => {
      expect(suiteNames).toContain(suite.name);
    });
  });

  it('should handle test failures gracefully', async () => {
    // This test ensures the runner doesn't crash on test failures
    const report = await runner.runAllSuites();
    
    expect(report).toBeDefined();
    expect(report.results).toHaveLength(testSuites.length);
    
    // Even if some tests fail, we should get a complete report
    report.results.forEach(result => {
      expect(result.suite).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
      expect(typeof result.passed).toBe('number');
      expect(typeof result.failed).toBe('number');
      expect(typeof result.skipped).toBe('number');
    });
  });
});

// Export for use in CI/CD
export { VisualRegressionRunner, type VisualRegressionReport };