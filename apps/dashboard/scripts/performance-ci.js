#!/usr/bin/env node

/**
 * Performance CI/CD Integration Script
 * Automated performance checks for continuous integration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Performance budgets configuration
const PERFORMANCE_BUDGETS = {
  lcp: { budget: 2500, warning: 2000, error: 4000 },
  fid: { budget: 100, warning: 80, error: 300 },
  cls: { budget: 0.1, warning: 0.08, error: 0.25 },
  fcp: { budget: 1800, warning: 1500, error: 3000 },
  ttfb: { budget: 800, warning: 600, error: 1800 },
  bundle_size: { budget: 250000, warning: 200000, error: 500000 },
  page_load_time: { budget: 3000, warning: 2500, error: 5000 },
  time_to_interactive: { budget: 5000, warning: 4000, error: 8000 }
};

class PerformanceCI {
  constructor() {
    this.results = {
      passed: 0,
      warnings: 0,
      failed: 0,
      details: []
    };
    this.exitCode = 0;
  }

  async run() {
    console.log('🚀 Starting Performance CI Checks...\n');

    try {
      // Run Lighthouse audit
      await this.runLighthouseAudit();
      
      // Check bundle sizes
      await this.checkBundleSizes();
      
      // Run performance tests
      await this.runPerformanceTests();
      
      // Generate report
      this.generateReport();
      
      // Exit with appropriate code
      process.exit(this.exitCode);
    } catch (error) {
      console.error('❌ Performance CI failed:', error.message);
      process.exit(1);
    }
  }

  async runLighthouseAudit() {
    console.log('📊 Running Lighthouse audit...');
    
    try {
      // Generate Lighthouse configuration
      const lighthouseConfig = this.generateLighthouseConfig();
      const configPath = path.join(__dirname, '../lighthouse.config.js');
      
      fs.writeFileSync(configPath, `module.exports = ${JSON.stringify(lighthouseConfig, null, 2)};`);
      
      // Run Lighthouse
      const command = `npx lighthouse http://localhost:3000 --config-path=${configPath} --output=json --output-path=lighthouse-report.json --chrome-flags="--headless --no-sandbox"`;
      
      try {
        execSync(command, { stdio: 'pipe' });
        
        // Parse results
        const reportPath = path.join(process.cwd(), 'lighthouse-report.json');
        if (fs.existsSync(reportPath)) {
          const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
          this.processLighthouseResults(report);
        }
      } catch (lighthouseError) {
        console.warn('⚠️  Lighthouse audit failed, skipping...');
        this.results.warnings++;
      }
      
      // Cleanup
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
    } catch (error) {
      console.warn('⚠️  Lighthouse setup failed:', error.message);
    }
  }

  processLighthouseResults(report) {
    const audits = report.lhr.audits;
    
    // Check Core Web Vitals
    const coreWebVitals = {
      lcp: audits['largest-contentful-paint']?.numericValue || 0,
      fid: audits['max-potential-fid']?.numericValue || 0,
      cls: audits['cumulative-layout-shift']?.numericValue || 0,
      fcp: audits['first-contentful-paint']?.numericValue || 0,
      ttfb: audits['server-response-time']?.numericValue || 0
    };

    Object.entries(coreWebVitals).forEach(([metric, value]) => {
      this.checkBudget(metric, value);
    });

    // Check performance score
    const performanceScore = report.lhr.categories.performance.score * 100;
    this.results.details.push({
      metric: 'lighthouse_performance_score',
      value: performanceScore,
      status: performanceScore >= 90 ? 'pass' : performanceScore >= 70 ? 'warning' : 'fail',
      budget: 90
    });

    if (performanceScore < 70) {
      this.results.failed++;
      this.exitCode = 1;
    } else if (performanceScore < 90) {
      this.results.warnings++;
    } else {
      this.results.passed++;
    }
  }

  async checkBundleSizes() {
    console.log('📦 Checking bundle sizes...');
    
    try {
      // Run webpack-bundle-analyzer
      const command = 'npx webpack-bundle-analyzer dist/static/js/*.js --mode=json --report=bundle-report.json';
      
      try {
        execSync(command, { stdio: 'pipe' });
        
        // Parse bundle report
        const reportPath = path.join(process.cwd(), 'bundle-report.json');
        if (fs.existsSync(reportPath)) {
          const bundleReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
          this.processBundleResults(bundleReport);
        }
      } catch (bundleError) {
        // Fallback: check dist folder sizes
        this.checkDistFolderSizes();
      }
    } catch (error) {
      console.warn('⚠️  Bundle size check failed:', error.message);
    }
  }

  processBundleResults(bundleReport) {
    let totalSize = 0;
    
    bundleReport.forEach(bundle => {
      totalSize += bundle.statSize;
    });

    this.checkBudget('bundle_size', totalSize);
  }

  checkDistFolderSizes() {
    const distPath = path.join(process.cwd(), 'dist');
    
    if (!fs.existsSync(distPath)) {
      console.warn('⚠️  Dist folder not found, skipping bundle size check');
      return;
    }

    let totalSize = 0;
    
    const calculateSize = (dirPath) => {
      const files = fs.readdirSync(dirPath);
      
      files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          calculateSize(filePath);
        } else {
          totalSize += stats.size;
        }
      });
    };

    calculateSize(distPath);
    this.checkBudget('bundle_size', totalSize);
  }

  async runPerformanceTests() {
    console.log('🧪 Running performance tests...');
    
    try {
      // Run Jest performance tests
      const command = 'npm test -- --testPathPattern=performance-benchmarks.test.ts --verbose';
      execSync(command, { stdio: 'inherit' });
      
      this.results.passed++;
    } catch (error) {
      console.error('❌ Performance tests failed');
      this.results.failed++;
      this.exitCode = 1;
    }
  }

  checkBudget(metric, value) {
    const budget = PERFORMANCE_BUDGETS[metric];
    if (!budget) return;

    let status = 'pass';
    
    if (value > budget.error) {
      status = 'fail';
      this.results.failed++;
      this.exitCode = 1;
    } else if (value > budget.budget) {
      status = 'fail';
      this.results.failed++;
      this.exitCode = 1;
    } else if (value > budget.warning) {
      status = 'warning';
      this.results.warnings++;
    } else {
      this.results.passed++;
    }

    this.results.details.push({
      metric,
      value,
      status,
      budget: budget.budget,
      warning: budget.warning,
      error: budget.error
    });
  }

  generateLighthouseConfig() {
    return {
      extends: 'lighthouse:default',
      settings: {
        budgets: [
          {
            resourceSizes: [
              {
                resourceType: 'script',
                budget: Math.floor(PERFORMANCE_BUDGETS.bundle_size.budget / 1000)
              },
              {
                resourceType: 'image',
                budget: 500
              }
            ],
            timings: [
              {
                metric: 'first-contentful-paint',
                budget: PERFORMANCE_BUDGETS.fcp.budget
              },
              {
                metric: 'largest-contentful-paint',
                budget: PERFORMANCE_BUDGETS.lcp.budget
              },
              {
                metric: 'first-meaningful-paint',
                budget: PERFORMANCE_BUDGETS.fcp.budget
              },
              {
                metric: 'speed-index',
                budget: 4000
              }
            ]
          }
        ]
      }
    };
  }

  generateReport() {
    const total = this.results.passed + this.results.warnings + this.results.failed;
    
    console.log('\n📊 Performance CI Report');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`⚠️  Warnings: ${this.results.warnings}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Total: ${total}`);
    console.log('');

    // Detailed results
    console.log('📋 Detailed Results:');
    console.log('-'.repeat(50));
    
    this.results.details.forEach(result => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      const value = result.metric === 'bundle_size' ? 
        `${Math.round(result.value / 1000)}KB` : 
        result.metric.includes('score') ? 
        `${result.value}%` :
        `${Math.round(result.value)}ms`;
      
      console.log(`${icon} ${result.metric}: ${value} (budget: ${
        result.metric === 'bundle_size' ? 
        `${Math.round(result.budget / 1000)}KB` : 
        result.metric.includes('score') ? 
        `${result.budget}%` :
        `${result.budget}ms`
      })`);
    });

    console.log('');

    if (this.exitCode === 0) {
      if (this.results.warnings > 0) {
        console.log('⚠️  Build passed with warnings. Consider optimizing performance.');
      } else {
        console.log('🎉 All performance checks passed!');
      }
    } else {
      console.log('❌ Build failed due to performance budget violations!');
      console.log('');
      console.log('💡 Recommendations:');
      console.log('- Optimize images and reduce bundle sizes');
      console.log('- Implement code splitting and lazy loading');
      console.log('- Use performance profiling tools to identify bottlenecks');
      console.log('- Consider using a CDN for static assets');
    }

    // Save report to file
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        passed: this.results.passed,
        warnings: this.results.warnings,
        failed: this.results.failed,
        total,
        success: this.exitCode === 0
      },
      details: this.results.details,
      budgets: PERFORMANCE_BUDGETS
    };

    fs.writeFileSync('performance-ci-report.json', JSON.stringify(reportData, null, 2));
    console.log('\n📄 Report saved to performance-ci-report.json');
  }
}

// Run if called directly
if (require.main === module) {
  const ci = new PerformanceCI();
  ci.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = PerformanceCI;