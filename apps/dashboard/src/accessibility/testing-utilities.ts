/**
 * Accessibility Testing Utilities
 * Provides automated accessibility checks and testing helpers
 */

export interface AccessibilityIssue {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  element: HTMLElement;
  tags: string[];
}

export interface AccessibilityReport {
  violations: AccessibilityIssue[];
  passes: AccessibilityIssue[];
  incomplete: AccessibilityIssue[];
  timestamp: Date;
  url: string;
  title: string;
}

export interface ColorContrastResult {
  ratio: number;
  AA: boolean;
  AAA: boolean;
  foreground: string;
  background: string;
}

export class AccessibilityTester {
  private static instance: AccessibilityTester;
  private axeCore: any = null;

  static getInstance(): AccessibilityTester {
    if (!AccessibilityTester.instance) {
      AccessibilityTester.instance = new AccessibilityTester();
    }
    return AccessibilityTester.instance;
  }

  /**
   * Initializes axe-core for automated testing
   */
  async initialize(): Promise<void> {
    if (this.axeCore) return;

    try {
      // In a real implementation, you would import axe-core
      // For now, we'll create a mock implementation
      this.axeCore = await this.loadAxeCore();
    } catch (error) {
      console.warn('Failed to load axe-core:', error);
      this.axeCore = this.createMockAxe();
    }
  }

  /**
   * Loads axe-core library
   */
  private async loadAxeCore(): Promise<any> {
    // This would typically load the actual axe-core library
    // For demonstration, we'll return a mock
    return this.createMockAxe();
  }

  /**
   * Creates a mock axe implementation for testing
   */
  private createMockAxe(): any {
    return {
      run: async (context?: any, options?: any) => {
        return this.performBasicAccessibilityChecks(context);
      },
      configure: (config: any) => {},
      reset: () => {}
    };
  }

  /**
   * Runs comprehensive accessibility audit
   */
  async runAccessibilityAudit(
    context: HTMLElement | Document = document,
    options: any = {}
  ): Promise<AccessibilityReport> {
    await this.initialize();

    const results = await this.axeCore.run(context, {
      tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'],
      ...options
    });

    return {
      violations: results.violations.map(this.formatIssue),
      passes: results.passes.map(this.formatIssue),
      incomplete: results.incomplete.map(this.formatIssue),
      timestamp: new Date(),
      url: window.location.href,
      title: document.title
    };
  }

  /**
   * Performs basic accessibility checks without axe-core
   */
  private async performBasicAccessibilityChecks(context: HTMLElement | Document = document): Promise<any> {
    const violations: any[] = [];
    const passes: any[] = [];
    const incomplete: any[] = [];

    // Check for missing alt text on images
    const images = context.querySelectorAll('img');
    images.forEach(img => {
      if (!img.hasAttribute('alt')) {
        violations.push({
          id: 'image-alt',
          impact: 'serious',
          description: 'Images must have alternate text',
          help: 'Add alt attribute to image',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/image-alt',
          nodes: [{ target: [img] }],
          tags: ['cat.text-alternatives', 'wcag2a']
        });
      } else {
        passes.push({
          id: 'image-alt',
          description: 'Images have alternate text',
          nodes: [{ target: [img] }]
        });
      }
    });

    // Check for form labels
    const inputs = context.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const hasLabel = this.hasAssociatedLabel(input as HTMLElement);
      if (!hasLabel) {
        violations.push({
          id: 'label',
          impact: 'critical',
          description: 'Form elements must have labels',
          help: 'Add label element or aria-label attribute',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/label',
          nodes: [{ target: [input] }],
          tags: ['cat.forms', 'wcag2a']
        });
      } else {
        passes.push({
          id: 'label',
          description: 'Form elements have labels',
          nodes: [{ target: [input] }]
        });
      }
    });

    // Check for heading hierarchy
    const headings = Array.from(context.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const headingLevels = headings.map(h => parseInt(h.tagName.charAt(1)));
    
    for (let i = 1; i < headingLevels.length; i++) {
      const current = headingLevels[i];
      const previous = headingLevels[i - 1];
      
      if (current > previous + 1) {
        violations.push({
          id: 'heading-order',
          impact: 'moderate',
          description: 'Heading levels should only increase by one',
          help: 'Ensure heading hierarchy is logical',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/heading-order',
          nodes: [{ target: [headings[i]] }],
          tags: ['cat.semantics', 'best-practice']
        });
      }
    }

    return { violations, passes, incomplete };
  }

  /**
   * Checks if a form element has an associated label
   */
  private hasAssociatedLabel(element: HTMLElement): boolean {
    // Check for aria-label
    if (element.hasAttribute('aria-label')) return true;
    
    // Check for aria-labelledby
    if (element.hasAttribute('aria-labelledby')) return true;
    
    // Check for associated label element
    const id = element.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) return true;
    }
    
    // Check if wrapped in label
    const parentLabel = element.closest('label');
    if (parentLabel) return true;
    
    return false;
  }

  /**
   * Formats axe result into standardized issue format
   */
  private formatIssue = (result: any): AccessibilityIssue => ({
    id: result.id,
    impact: result.impact || 'moderate',
    description: result.description,
    help: result.help,
    helpUrl: result.helpUrl,
    element: result.nodes?.[0]?.target?.[0] || document.body,
    tags: result.tags || []
  });

  /**
   * Checks color contrast ratio
   */
  checkColorContrast(
    foregroundColor: string, 
    backgroundColor: string
  ): ColorContrastResult {
    const fgRgb = this.hexToRgb(foregroundColor);
    const bgRgb = this.hexToRgb(backgroundColor);
    
    if (!fgRgb || !bgRgb) {
      throw new Error('Invalid color format');
    }

    const fgLuminance = this.getLuminance(fgRgb);
    const bgLuminance = this.getLuminance(bgRgb);
    
    const ratio = (Math.max(fgLuminance, bgLuminance) + 0.05) / 
                  (Math.min(fgLuminance, bgLuminance) + 0.05);

    return {
      ratio: Math.round(ratio * 100) / 100,
      AA: ratio >= 4.5,
      AAA: ratio >= 7,
      foreground: foregroundColor,
      background: backgroundColor
    };
  }

  /**
   * Converts hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Calculates relative luminance
   */
  private getLuminance(rgb: { r: number; g: number; b: number }): number {
    const { r, g, b } = rgb;
    
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /**
   * Tests keyboard navigation
   */
  testKeyboardNavigation(container: HTMLElement): Promise<{
    focusableElements: HTMLElement[];
    tabOrder: number[];
    issues: string[];
  }> {
    return new Promise((resolve) => {
      const focusableElements = this.getFocusableElements(container);
      const tabOrder: number[] = [];
      const issues: string[] = [];

      // Check if all interactive elements are focusable
      const interactiveElements = container.querySelectorAll(
        'button, input, select, textarea, a, [onclick], [role="button"]'
      );

      interactiveElements.forEach(element => {
        const htmlElement = element as HTMLElement;
        if (htmlElement.tabIndex === -1 && !htmlElement.hasAttribute('aria-hidden')) {
          issues.push(`Interactive element is not focusable: ${element.tagName}`);
        }
      });

      // Test tab order
      focusableElements.forEach((element, index) => {
        tabOrder.push(element.tabIndex || 0);
      });

      // Check for logical tab order
      const hasLogicalOrder = tabOrder.every((current, index) => {
        if (index === 0) return true;
        const previous = tabOrder[index - 1];
        return current >= previous;
      });

      if (!hasLogicalOrder) {
        issues.push('Tab order is not logical');
      }

      resolve({
        focusableElements,
        tabOrder,
        issues
      });
    });
  }

  /**
   * Gets all focusable elements in a container
   */
  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(selectors))
      .filter(el => this.isVisible(el as HTMLElement)) as HTMLElement[];
  }

  /**
   * Checks if an element is visible
   */
  private isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 && 
           element.offsetHeight > 0;
  }

  /**
   * Tests screen reader compatibility
   */
  testScreenReaderCompatibility(element: HTMLElement): {
    hasAccessibleName: boolean;
    hasRole: boolean;
    hasDescription: boolean;
    ariaAttributes: string[];
    issues: string[];
  } {
    const issues: string[] = [];
    const ariaAttributes: string[] = [];

    // Collect all ARIA attributes
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('aria-') || attr.name === 'role') {
        ariaAttributes.push(`${attr.name}="${attr.value}"`);
      }
    });

    // Check for accessible name
    const hasAccessibleName = !!(
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      element.textContent?.trim() ||
      element.getAttribute('title')
    );

    if (!hasAccessibleName) {
      issues.push('Element lacks accessible name');
    }

    // Check for role
    const hasRole = !!(
      element.getAttribute('role') ||
      ['button', 'input', 'select', 'textarea', 'a'].includes(element.tagName.toLowerCase())
    );

    if (!hasRole) {
      issues.push('Element lacks semantic role');
    }

    // Check for description
    const hasDescription = !!(
      element.getAttribute('aria-describedby') ||
      element.getAttribute('title')
    );

    return {
      hasAccessibleName,
      hasRole,
      hasDescription,
      ariaAttributes,
      issues
    };
  }

  /**
   * Generates accessibility report
   */
  async generateReport(container: HTMLElement = document.body): Promise<string> {
    const audit = await this.runAccessibilityAudit(container);
    const keyboardTest = await this.testKeyboardNavigation(container);

    let report = `# Accessibility Report\n\n`;
    report += `Generated: ${audit.timestamp.toISOString()}\n`;
    report += `URL: ${audit.url}\n`;
    report += `Title: ${audit.title}\n\n`;

    report += `## Summary\n`;
    report += `- Violations: ${audit.violations.length}\n`;
    report += `- Passes: ${audit.passes.length}\n`;
    report += `- Incomplete: ${audit.incomplete.length}\n`;
    report += `- Keyboard Issues: ${keyboardTest.issues.length}\n\n`;

    if (audit.violations.length > 0) {
      report += `## Violations\n\n`;
      audit.violations.forEach(violation => {
        report += `### ${violation.description}\n`;
        report += `- **Impact**: ${violation.impact}\n`;
        report += `- **Help**: ${violation.help}\n`;
        report += `- **Tags**: ${violation.tags.join(', ')}\n`;
        report += `- **Help URL**: ${violation.helpUrl}\n\n`;
      });
    }

    if (keyboardTest.issues.length > 0) {
      report += `## Keyboard Navigation Issues\n\n`;
      keyboardTest.issues.forEach(issue => {
        report += `- ${issue}\n`;
      });
      report += '\n';
    }

    return report;
  }
}

// React hook for accessibility testing
export function useAccessibilityTesting() {
  const tester = AccessibilityTester.getInstance();

  return {
    runAudit: tester.runAccessibilityAudit.bind(tester),
    checkColorContrast: tester.checkColorContrast.bind(tester),
    testKeyboardNavigation: tester.testKeyboardNavigation.bind(tester),
    testScreenReaderCompatibility: tester.testScreenReaderCompatibility.bind(tester),
    generateReport: tester.generateReport.bind(tester)
  };
}