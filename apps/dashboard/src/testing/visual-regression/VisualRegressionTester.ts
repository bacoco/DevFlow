import { Page, Browser, chromium, firefox, webkit } from 'playwright';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export interface VisualTestConfig {
  name: string;
  url: string;
  selector?: string;
  viewport?: { width: number; height: number };
  waitFor?: string | number;
  mask?: string[];
  threshold?: number;
  browsers?: ('chromium' | 'firefox' | 'webkit')[];
}

export interface VisualTestResult {
  testName: string;
  browser: string;
  passed: boolean;
  diffPixels?: number;
  diffPercentage?: number;
  screenshotPath: string;
  baselinePath?: string;
  diffPath?: string;
  error?: string;
}

export class VisualRegressionTester {
  private baselineDir: string;
  private outputDir: string;
  private diffDir: string;

  constructor(
    baselineDir = 'tests/visual-regression/baselines',
    outputDir = 'tests/visual-regression/output',
    diffDir = 'tests/visual-regression/diffs'
  ) {
    this.baselineDir = baselineDir;
    this.outputDir = outputDir;
    this.diffDir = diffDir;
  }

  async runVisualTests(configs: VisualTestConfig[]): Promise<VisualTestResult[]> {
    const results: VisualTestResult[] = [];
    
    // Ensure directories exist
    await this.ensureDirectories();

    for (const config of configs) {
      const browsers = config.browsers || ['chromium'];
      
      for (const browserName of browsers) {
        const result = await this.runSingleTest(config, browserName);
        results.push(result);
      }
    }

    return results;
  }

  private async runSingleTest(config: VisualTestConfig, browserName: string): Promise<VisualTestResult> {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      // Launch browser
      browser = await this.launchBrowser(browserName);
      page = await browser.newPage();

      // Set viewport
      if (config.viewport) {
        await page.setViewportSize(config.viewport);
      }

      // Navigate to page
      await page.goto(config.url);

      // Wait for content
      if (config.waitFor) {
        if (typeof config.waitFor === 'string') {
          await page.waitForSelector(config.waitFor);
        } else {
          await page.waitForTimeout(config.waitFor);
        }
      }

      // Apply masks
      if (config.mask) {
        await this.applyMasks(page, config.mask);
      }

      // Take screenshot
      const screenshotBuffer = await this.takeScreenshot(page, config.selector);
      
      // Generate file paths
      const testId = this.generateTestId(config.name, browserName);
      const screenshotPath = path.join(this.outputDir, `${testId}.png`);
      const baselinePath = path.join(this.baselineDir, `${testId}.png`);
      const diffPath = path.join(this.diffDir, `${testId}.png`);

      // Save current screenshot
      await fs.writeFile(screenshotPath, screenshotBuffer);

      // Compare with baseline
      const comparisonResult = await this.compareScreenshots(
        baselinePath,
        screenshotPath,
        diffPath,
        config.threshold || 0.1
      );

      return {
        testName: config.name,
        browser: browserName,
        passed: comparisonResult.passed,
        diffPixels: comparisonResult.diffPixels,
        diffPercentage: comparisonResult.diffPercentage,
        screenshotPath,
        baselinePath: comparisonResult.baselineExists ? baselinePath : undefined,
        diffPath: comparisonResult.diffCreated ? diffPath : undefined
      };

    } catch (error) {
      return {
        testName: config.name,
        browser: browserName,
        passed: false,
        screenshotPath: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }
  }

  private async launchBrowser(browserName: string): Promise<Browser> {
    const options = {
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    };

    switch (browserName) {
      case 'firefox':
        return await firefox.launch(options);
      case 'webkit':
        return await webkit.launch(options);
      default:
        return await chromium.launch(options);
    }
  }

  private async applyMasks(page: Page, selectors: string[]): Promise<void> {
    for (const selector of selectors) {
      await page.evaluate((sel) => {
        const elements = document.querySelectorAll(sel);
        elements.forEach(el => {
          (el as HTMLElement).style.visibility = 'hidden';
        });
      }, selector);
    }
  }

  private async takeScreenshot(page: Page, selector?: string): Promise<Buffer> {
    if (selector) {
      const element = await page.locator(selector);
      return await element.screenshot();
    } else {
      return await page.screenshot({ fullPage: true });
    }
  }

  private async compareScreenshots(
    baselinePath: string,
    currentPath: string,
    diffPath: string,
    threshold: number
  ): Promise<{
    passed: boolean;
    diffPixels: number;
    diffPercentage: number;
    baselineExists: boolean;
    diffCreated: boolean;
  }> {
    try {
      // Check if baseline exists
      const baselineExists = await fs.access(baselinePath).then(() => true).catch(() => false);
      
      if (!baselineExists) {
        // Copy current as baseline for first run
        await fs.copyFile(currentPath, baselinePath);
        return {
          passed: true,
          diffPixels: 0,
          diffPercentage: 0,
          baselineExists: false,
          diffCreated: false
        };
      }

      // Load images
      const baselineBuffer = await fs.readFile(baselinePath);
      const currentBuffer = await fs.readFile(currentPath);

      const baselineImg = PNG.sync.read(baselineBuffer);
      const currentImg = PNG.sync.read(currentBuffer);

      // Ensure images have same dimensions
      if (baselineImg.width !== currentImg.width || baselineImg.height !== currentImg.height) {
        throw new Error('Image dimensions do not match');
      }

      // Compare images
      const diffImg = new PNG({ width: baselineImg.width, height: baselineImg.height });
      const diffPixels = pixelmatch(
        baselineImg.data,
        currentImg.data,
        diffImg.data,
        baselineImg.width,
        baselineImg.height,
        { threshold: 0.1 }
      );

      const totalPixels = baselineImg.width * baselineImg.height;
      const diffPercentage = (diffPixels / totalPixels) * 100;
      const passed = diffPercentage <= threshold;

      // Save diff image if there are differences
      let diffCreated = false;
      if (diffPixels > 0) {
        await fs.writeFile(diffPath, PNG.sync.write(diffImg));
        diffCreated = true;
      }

      return {
        passed,
        diffPixels,
        diffPercentage,
        baselineExists: true,
        diffCreated
      };

    } catch (error) {
      throw new Error(`Screenshot comparison failed: ${error}`);
    }
  }

  private generateTestId(testName: string, browser: string): string {
    const hash = createHash('md5').update(`${testName}-${browser}`).digest('hex').substring(0, 8);
    return `${testName.replace(/[^a-zA-Z0-9]/g, '-')}-${browser}-${hash}`;
  }

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.baselineDir, { recursive: true });
    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.mkdir(this.diffDir, { recursive: true });
  }

  async generateReport(results: VisualTestResult[]): Promise<string> {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    
    const report = {
      summary: {
        total: results.length,
        passed,
        failed,
        passRate: (passed / results.length) * 100
      },
      results: results.map(r => ({
        testName: r.testName,
        browser: r.browser,
        passed: r.passed,
        diffPercentage: r.diffPercentage,
        error: r.error
      }))
    };

    const reportPath = path.join(this.outputDir, 'visual-regression-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    return reportPath;
  }
}