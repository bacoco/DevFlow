/**
 * Playwright Global Teardown
 * Cleanup tasks that run after all tests
 */

import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for E2E tests...');

  try {
    // Cleanup test data
    await cleanupTestData();

    // Cleanup test artifacts
    await cleanupTestArtifacts();

    // Generate test summary
    await generateTestSummary();

    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error to avoid masking test failures
  }
}

async function cleanupTestData() {
  console.log('🗑️ Cleaning up test data...');
  
  // Example: Delete test users, tasks, etc.
  // This would typically make API calls to clean up test data
  
  console.log('✅ Test data cleanup completed');
}

async function cleanupTestArtifacts() {
  console.log('🗂️ Cleaning up old test artifacts...');
  
  const artifactsDir = 'test-reports/e2e/artifacts';
  const screenshotsDir = 'test-reports/e2e/screenshots';
  
  // Keep only the last 5 test runs
  const maxRuns = 5;
  
  [artifactsDir, screenshotsDir].forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir)
        .map(file => ({
          name: file,
          path: path.join(dir, file),
          time: fs.statSync(path.join(dir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);
      
      // Delete old files
      files.slice(maxRuns).forEach(file => {
        try {
          if (fs.statSync(file.path).isDirectory()) {
            fs.rmSync(file.path, { recursive: true });
          } else {
            fs.unlinkSync(file.path);
          }
        } catch (error) {
          console.warn(`Failed to delete ${file.path}:`, error);
        }
      });
    }
  });
  
  console.log('✅ Test artifacts cleanup completed');
}

async function generateTestSummary() {
  console.log('📊 Generating test summary...');
  
  const resultsPath = 'test-reports/e2e/results.json';
  
  if (fs.existsSync(resultsPath)) {
    try {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      
      const summary = {
        timestamp: new Date().toISOString(),
        total: results.stats?.total || 0,
        passed: results.stats?.passed || 0,
        failed: results.stats?.failed || 0,
        skipped: results.stats?.skipped || 0,
        duration: results.stats?.duration || 0,
        browsers: results.config?.projects?.map((p: any) => p.name) || [],
        failedTests: results.suites?.flatMap((suite: any) => 
          suite.specs?.filter((spec: any) => 
            spec.tests?.some((test: any) => test.results?.some((result: any) => result.status === 'failed'))
          ).map((spec: any) => ({
            title: spec.title,
            file: spec.file,
            errors: spec.tests?.flatMap((test: any) => 
              test.results?.filter((result: any) => result.status === 'failed')
                .map((result: any) => result.error?.message)
            ).filter(Boolean)
          }))
        ).filter(Boolean) || [],
      };
      
      // Write summary
      const summaryPath = 'test-reports/e2e/summary.json';
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
      
      // Write markdown summary
      const markdownSummary = generateMarkdownSummary(summary);
      fs.writeFileSync('test-reports/e2e/summary.md', markdownSummary);
      
      console.log('📈 Test Summary:');
      console.log(`  Total: ${summary.total}`);
      console.log(`  Passed: ${summary.passed}`);
      console.log(`  Failed: ${summary.failed}`);
      console.log(`  Skipped: ${summary.skipped}`);
      console.log(`  Duration: ${Math.round(summary.duration / 1000)}s`);
      
    } catch (error) {
      console.warn('Failed to generate test summary:', error);
    }
  }
  
  console.log('✅ Test summary generation completed');
}

function generateMarkdownSummary(summary: any): string {
  return `
# E2E Test Summary

**Generated:** ${summary.timestamp}

## Overview

| Metric | Value |
|--------|-------|
| Total Tests | ${summary.total} |
| Passed | ${summary.passed} |
| Failed | ${summary.failed} |
| Skipped | ${summary.skipped} |
| Duration | ${Math.round(summary.duration / 1000)}s |

## Browsers Tested

${summary.browsers.map((browser: string) => `- ${browser}`).join('\n')}

## Failed Tests

${summary.failedTests.length === 0 ? 'No failed tests! 🎉' : 
  summary.failedTests.map((test: any) => `
### ${test.title}

**File:** ${test.file}

**Errors:**
${test.errors.map((error: string) => `- ${error}`).join('\n')}
  `).join('\n')
}

## Status

${summary.failed === 0 ? '✅ All tests passed!' : `❌ ${summary.failed} test(s) failed`}
`;
}

export default globalTeardown;