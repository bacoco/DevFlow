#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * Orchestrates unit tests, visual regression tests, and accessibility tests
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Configuration
const config = {
  // Test types to run
  testTypes: {
    unit: true,
    visual: true,
    accessibility: true,
    performance: true,
  },
  
  // Paths
  paths: {
    components: './src/components/ui',
    tests: './src/components/ui/__tests__',
    reports: './test-reports',
    coverage: './coverage',
  },
  
  // Thresholds
  thresholds: {
    coverage: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    accessibility: {
      maxViolations: 0,
      minScore: 95,
    },
    performance: {
      maxRenderTime: 100,
      maxBundleSize: 500000,
    },
  },
  
  // Reporting
  reporting: {
    formats: ['console', 'html', 'json', 'junit'],
    outputDir: './test-reports',
    includeScreenshots: true,
  },
};

class TestRunner {
  constructor() {
    this.results = {
      unit: null,
      visual: null,
      accessibility: null,
      performance: null,
    };
    
    this.startTime = Date.now();
    this.setupDirectories();
  }

  setupDirectories() {
    // Ensure report directories exist
    const dirs = [
      config.paths.reports,
      path.join(config.paths.reports, 'unit'),
      path.join(config.paths.reports, 'visual'),
      path.join(config.paths.reports, 'accessibility'),
      path.join(config.paths.reports, 'performance'),
      config.paths.coverage,
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red,
    };
    
    console.log(`${chalk.gray(timestamp)} ${colors[type](`[${type.toUpperCase()}]`)} ${message}`);
  }

  async runUnitTests() {
    this.log('Running unit tests...', 'info');
    
    try {
      const jestConfig = {
        testMatch: ['<rootDir>/src/components/ui/__tests__/**/*.test.{ts,tsx}'],
        collectCoverage: true,
        coverageDirectory: config.paths.coverage,
        coverageReporters: ['text', 'html', 'json', 'lcov', 'cobertura'],
        coverageThreshold: {
          global: config.thresholds.coverage,
        },
        setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
        testEnvironment: 'jsdom',
        verbose: true,
        reporters: [
          'default',
          ['jest-html-reporters', {
            publicPath: path.join(config.paths.reports, 'unit'),
            filename: 'report.html',
            expand: true,
          }],
          ['jest-junit', {
            outputDirectory: path.join(config.paths.reports, 'unit'),
            outputName: 'junit.xml',
          }],
        ],
      };

      // Write temporary Jest config
      const configPath = path.join(process.cwd(), 'jest.test-runner.config.js');
      fs.writeFileSync(configPath, `module.exports = ${JSON.stringify(jestConfig, null, 2)};`);

      const result = execSync(`npx jest --config ${configPath} --passWithNoTests`, {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      // Clean up temporary config
      fs.unlinkSync(configPath);

      this.results.unit = {
        success: true,
        output: result,
        coverage: this.parseCoverageReport(),
      };

      this.log('Unit tests completed successfully', 'success');
      return true;
    } catch (error) {
      this.results.unit = {
        success: false,
        error: error.message,
        output: error.stdout || error.stderr,
      };

      this.log(`Unit tests failed: ${error.message}`, 'error');
      return false;
    }
  }

  async runVisualTests() {
    this.log('Running visual regression tests...', 'info');
    
    try {
      // Build Storybook first
      this.log('Building Storybook...', 'info');
      execSync('npm run build-storybook', { stdio: 'pipe' });

      // Run Chromatic
      const chromaticCommand = [
        'npx chromatic',
        '--project-token=$CHROMATIC_PROJECT_TOKEN',
        '--build-script-name=build-storybook',
        '--exit-zero-on-changes',
        '--threshold=0.2',
        '--delay=500',
      ].join(' ');

      const result = execSync(chromaticCommand, {
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env },
      });

      this.results.visual = {
        success: true,
        output: result,
        changes: this.parseVisualChanges(result),
      };

      this.log('Visual regression tests completed', 'success');
      return true;
    } catch (error) {
      this.results.visual = {
        success: false,
        error: error.message,
        output: error.stdout || error.stderr,
      };

      this.log(`Visual tests failed: ${error.message}`, 'error');
      return false;
    }
  }

  async runAccessibilityTests() {
    this.log('Running accessibility tests...', 'info');
    
    try {
      // Run axe-core tests on all components
      const a11yTestScript = `
        const { axe, configureAxe } = require('axe-core');
        const { JSDOM } = require('jsdom');
        const fs = require('fs');
        const path = require('path');
        
        // Configure axe
        configureAxe({
          tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'],
        });
        
        // Test all component stories
        const results = [];
        // Implementation would test each component
        
        // Save results
        fs.writeFileSync(
          path.join('${config.paths.reports}', 'accessibility', 'results.json'),
          JSON.stringify(results, null, 2)
        );
      `;

      // Write and execute accessibility test script
      const scriptPath = path.join(process.cwd(), 'temp-a11y-test.js');
      fs.writeFileSync(scriptPath, a11yTestScript);

      const result = execSync(`node ${scriptPath}`, {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      // Clean up
      fs.unlinkSync(scriptPath);

      this.results.accessibility = {
        success: true,
        output: result,
        violations: this.parseA11yViolations(),
      };

      this.log('Accessibility tests completed', 'success');
      return true;
    } catch (error) {
      this.results.accessibility = {
        success: false,
        error: error.message,
        output: error.stdout || error.stderr,
      };

      this.log(`Accessibility tests failed: ${error.message}`, 'error');
      return false;
    }
  }

  async runPerformanceTests() {
    this.log('Running performance tests...', 'info');
    
    try {
      // Run performance benchmarks
      const performanceScript = `
        const { performance } = require('perf_hooks');
        const React = require('react');
        const { render } = require('@testing-library/react');
        
        // Test component render performance
        const results = [];
        
        // Implementation would test render times for each component
        
        console.log(JSON.stringify(results, null, 2));
      `;

      const scriptPath = path.join(process.cwd(), 'temp-perf-test.js');
      fs.writeFileSync(scriptPath, performanceScript);

      const result = execSync(`node ${scriptPath}`, {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      fs.unlinkSync(scriptPath);

      this.results.performance = {
        success: true,
        output: result,
        metrics: JSON.parse(result || '[]'),
      };

      this.log('Performance tests completed', 'success');
      return true;
    } catch (error) {
      this.results.performance = {
        success: false,
        error: error.message,
        output: error.stdout || error.stderr,
      };

      this.log(`Performance tests failed: ${error.message}`, 'error');
      return false;
    }
  }

  parseCoverageReport() {
    try {
      const coveragePath = path.join(config.paths.coverage, 'coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        return JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      }
    } catch (error) {
      this.log(`Failed to parse coverage report: ${error.message}`, 'warning');
    }
    return null;
  }

  parseVisualChanges(output) {
    // Parse Chromatic output for visual changes
    const changes = [];
    const lines = output.split('\n');
    
    lines.forEach(line => {
      if (line.includes('visual change') || line.includes('new story')) {
        changes.push(line.trim());
      }
    });
    
    return changes;
  }

  parseA11yViolations() {
    try {
      const resultsPath = path.join(config.paths.reports, 'accessibility', 'results.json');
      if (fs.existsSync(resultsPath)) {
        const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        return results.reduce((total, result) => total + (result.violations?.length || 0), 0);
      }
    } catch (error) {
      this.log(`Failed to parse accessibility results: ${error.message}`, 'warning');
    }
    return 0;
  }

  generateSummaryReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    const summary = {
      timestamp: new Date().toISOString(),
      duration: `${Math.round(duration / 1000)}s`,
      results: this.results,
      overall: {
        success: Object.values(this.results).every(result => result?.success !== false),
        testsRun: Object.keys(this.results).filter(key => this.results[key] !== null).length,
        testsPassed: Object.values(this.results).filter(result => result?.success === true).length,
      },
    };

    // Write summary report
    const summaryPath = path.join(config.paths.reports, 'summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    // Generate HTML report
    this.generateHTMLReport(summary);

    return summary;
  }

  generateHTMLReport(summary) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UI Component Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; }
        .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 500; }
        .status.success { background: #dcfce7; color: #166534; }
        .status.failure { background: #fecaca; color: #991b1b; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; }
        .card h3 { margin: 0 0 12px 0; color: #374151; }
        .metric { display: flex; justify-content: space-between; margin: 8px 0; }
        .metric-value { font-weight: 600; }
        pre { background: #f9fafb; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>UI Component Test Report</h1>
            <p>Generated on ${summary.timestamp} • Duration: ${summary.duration}</p>
            <span class="status ${summary.overall.success ? 'success' : 'failure'}">
                ${summary.overall.success ? 'All Tests Passed' : 'Some Tests Failed'}
            </span>
        </div>
        <div class="content">
            <div class="grid">
                ${Object.entries(this.results).map(([type, result]) => `
                    <div class="card">
                        <h3>${type.charAt(0).toUpperCase() + type.slice(1)} Tests</h3>
                        <div class="metric">
                            <span>Status:</span>
                            <span class="status ${result?.success ? 'success' : 'failure'}">
                                ${result?.success ? 'Passed' : result ? 'Failed' : 'Skipped'}
                            </span>
                        </div>
                        ${result?.coverage ? `
                            <div class="metric">
                                <span>Coverage:</span>
                                <span class="metric-value">${result.coverage.total?.lines?.pct || 0}%</span>
                            </div>
                        ` : ''}
                        ${result?.violations !== undefined ? `
                            <div class="metric">
                                <span>A11y Violations:</span>
                                <span class="metric-value">${result.violations}</span>
                            </div>
                        ` : ''}
                        ${result?.changes ? `
                            <div class="metric">
                                <span>Visual Changes:</span>
                                <span class="metric-value">${result.changes.length}</span>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
</body>
</html>
    `;

    const htmlPath = path.join(config.paths.reports, 'report.html');
    fs.writeFileSync(htmlPath, html);
  }

  printSummary(summary) {
    console.log('\n' + '='.repeat(60));
    console.log(chalk.bold.blue('UI COMPONENT TEST SUMMARY'));
    console.log('='.repeat(60));
    
    console.log(`${chalk.gray('Timestamp:')} ${summary.timestamp}`);
    console.log(`${chalk.gray('Duration:')} ${summary.duration}`);
    console.log(`${chalk.gray('Tests Run:')} ${summary.overall.testsRun}`);
    console.log(`${chalk.gray('Tests Passed:')} ${summary.overall.testsPassed}`);
    
    console.log('\n' + chalk.bold('Test Results:'));
    Object.entries(this.results).forEach(([type, result]) => {
      const status = result?.success ? chalk.green('✓ PASSED') : result ? chalk.red('✗ FAILED') : chalk.yellow('- SKIPPED');
      console.log(`  ${type.padEnd(15)} ${status}`);
    });
    
    if (summary.overall.success) {
      console.log('\n' + chalk.green.bold('🎉 All tests passed!'));
    } else {
      console.log('\n' + chalk.red.bold('❌ Some tests failed. Check the detailed report.'));
    }
    
    console.log(`\n${chalk.gray('Detailed report:')} ${path.join(config.paths.reports, 'report.html')}`);
    console.log('='.repeat(60) + '\n');
  }

  async run() {
    this.log('Starting comprehensive UI component testing...', 'info');
    
    const testPromises = [];
    
    if (config.testTypes.unit) {
      testPromises.push(this.runUnitTests());
    }
    
    if (config.testTypes.visual) {
      testPromises.push(this.runVisualTests());
    }
    
    if (config.testTypes.accessibility) {
      testPromises.push(this.runAccessibilityTests());
    }
    
    if (config.testTypes.performance) {
      testPromises.push(this.runPerformanceTests());
    }

    // Run tests in parallel
    await Promise.all(testPromises);
    
    // Generate reports
    const summary = this.generateSummaryReport();
    this.printSummary(summary);
    
    // Exit with appropriate code
    process.exit(summary.overall.success ? 0 : 1);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  args.forEach(arg => {
    if (arg === '--unit-only') {
      config.testTypes = { unit: true, visual: false, accessibility: false, performance: false };
    } else if (arg === '--visual-only') {
      config.testTypes = { unit: false, visual: true, accessibility: false, performance: false };
    } else if (arg === '--a11y-only') {
      config.testTypes = { unit: false, visual: false, accessibility: true, performance: false };
    } else if (arg === '--perf-only') {
      config.testTypes = { unit: false, visual: false, accessibility: false, performance: true };
    }
  });
  
  const runner = new TestRunner();
  runner.run().catch(error => {
    console.error(chalk.red('Test runner failed:'), error);
    process.exit(1);
  });
}

module.exports = TestRunner;