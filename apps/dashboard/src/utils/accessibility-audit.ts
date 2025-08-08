// Accessibility audit utilities for production monitoring

import { axe, AxeResults } from 'axe-core';

export interface AccessibilityIssue {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    html: string;
    target: string[];
    failureSummary?: string;
  }>;
  timestamp: number;
}

export interface AccessibilityReport {
  url: string;
  timestamp: number;
  violations: AccessibilityIssue[];
  passes: number;
  incomplete: number;
  inapplicable: number;
  score: number; // 0-100 accessibility score
}

class AccessibilityAuditor {
  private reports: AccessibilityReport[] = [];
  private isRunning = false;

  async runAudit(element?: Element): Promise<AccessibilityReport> {
    if (this.isRunning) {
      throw new Error('Audit already in progress');
    }

    this.isRunning = true;

    try {
      const results = await axe.run(element || document, {
        rules: {
          // Enable all WCAG 2.1 AA rules
          'color-contrast': { enabled: true },
          'keyboard-navigation': { enabled: true },
          'focus-management': { enabled: true },
          'aria-labels': { enabled: true },
          'semantic-markup': { enabled: true },
        },
        tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
      });

      const report = this.processResults(results);
      this.reports.push(report);

      // Send to monitoring if enabled
      if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true') {
        this.sendToMonitoring(report);
      }

      return report;
    } finally {
      this.isRunning = false;
    }
  }

  private processResults(results: AxeResults): AccessibilityReport {
    const violations: AccessibilityIssue[] = results.violations.map(violation => ({
      id: violation.id,
      impact: violation.impact as AccessibilityIssue['impact'],
      description: violation.description,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.map(node => ({
        html: node.html,
        target: node.target,
        failureSummary: node.failureSummary,
      })),
      timestamp: Date.now(),
    }));

    // Calculate accessibility score (0-100)
    const totalChecks = results.passes.length + results.violations.length + results.incomplete.length;
    const passedChecks = results.passes.length;
    const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

    return {
      url: typeof window !== 'undefined' ? window.location.href : '',
      timestamp: Date.now(),
      violations,
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      inapplicable: results.inapplicable.length,
      score,
    };
  }

  private sendToMonitoring(report: AccessibilityReport) {
    // Send to analytics
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', 'accessibility_audit', {
        score: report.score,
        violations: report.violations.length,
        critical_issues: report.violations.filter(v => v.impact === 'critical').length,
        serious_issues: report.violations.filter(v => v.impact === 'serious').length,
      });
    }

    // Send to Sentry
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.addBreadcrumb({
        category: 'accessibility',
        message: `Accessibility audit completed: ${report.score}/100`,
        level: report.violations.length > 0 ? 'warning' : 'info',
        data: {
          violations: report.violations.length,
          score: report.score,
        },
      });

      // Report critical accessibility issues as errors
      const criticalIssues = report.violations.filter(v => v.impact === 'critical');
      if (criticalIssues.length > 0) {
        window.Sentry.captureException(new Error('Critical accessibility issues detected'), {
          tags: {
            category: 'accessibility',
          },
          extra: {
            issues: criticalIssues,
            url: report.url,
          },
        });
      }
    }
  }

  getReports(): AccessibilityReport[] {
    return [...this.reports];
  }

  getLatestReport(): AccessibilityReport | null {
    return this.reports.length > 0 ? this.reports[this.reports.length - 1] : null;
  }

  getAverageScore(): number {
    if (this.reports.length === 0) return 0;
    
    const totalScore = this.reports.reduce((acc, report) => acc + report.score, 0);
    return Math.round(totalScore / this.reports.length);
  }

  getCriticalIssues(): AccessibilityIssue[] {
    return this.reports
      .flatMap(report => report.violations)
      .filter(violation => violation.impact === 'critical');
  }

  // Continuous monitoring
  startContinuousMonitoring(intervalMs = 60000) {
    if (typeof window === 'undefined') return;

    const monitor = () => {
      // Only run audit if page is visible and not during user interaction
      if (document.visibilityState === 'visible' && !this.isRunning) {
        this.runAudit().catch(error => {
          console.warn('Accessibility audit failed:', error);
        });
      }
    };

    // Initial audit
    setTimeout(monitor, 5000); // Wait 5 seconds after page load

    // Periodic audits
    const interval = setInterval(monitor, intervalMs);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      clearInterval(interval);
    });

    return () => clearInterval(interval);
  }
}

// Singleton instance
let accessibilityAuditor: AccessibilityAuditor | null = null;

export function getAccessibilityAuditor(): AccessibilityAuditor {
  if (!accessibilityAuditor) {
    accessibilityAuditor = new AccessibilityAuditor();
  }
  return accessibilityAuditor;
}

// React hook for component-level accessibility monitoring
import { useEffect, useRef } from 'react';

export function useAccessibilityMonitor(componentName: string, enabled = true) {
  const elementRef = useRef<HTMLElement>(null);
  const auditor = getAccessibilityAuditor();

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const runComponentAudit = async () => {
      if (elementRef.current) {
        try {
          const report = await auditor.runAudit(elementRef.current);
          
          // Log component-specific issues
          const componentIssues = report.violations.filter(violation =>
            violation.nodes.some(node => 
              elementRef.current?.contains(document.querySelector(node.target[0]) as Element)
            )
          );

          if (componentIssues.length > 0) {
            console.warn(`Accessibility issues in ${componentName}:`, componentIssues);
          }
        } catch (error) {
          console.warn(`Accessibility audit failed for ${componentName}:`, error);
        }
      }
    };

    // Run audit after component mounts and stabilizes
    const timeout = setTimeout(runComponentAudit, 1000);

    return () => clearTimeout(timeout);
  }, [componentName, enabled, auditor]);

  return elementRef;
}

// Keyboard navigation testing
export function testKeyboardNavigation(element: Element): Promise<boolean> {
  return new Promise((resolve) => {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) {
      resolve(true); // No focusable elements, so keyboard navigation is not applicable
      return;
    }

    let currentIndex = 0;
    let allElementsFocusable = true;

    const testNextElement = () => {
      if (currentIndex >= focusableElements.length) {
        resolve(allElementsFocusable);
        return;
      }

      const element = focusableElements[currentIndex] as HTMLElement;
      
      try {
        element.focus();
        
        // Check if element actually received focus
        if (document.activeElement !== element) {
          console.warn('Element not focusable:', element);
          allElementsFocusable = false;
        }
        
        currentIndex++;
        setTimeout(testNextElement, 10);
      } catch (error) {
        console.warn('Error focusing element:', element, error);
        allElementsFocusable = false;
        currentIndex++;
        setTimeout(testNextElement, 10);
      }
    };

    testNextElement();
  });
}

// Color contrast testing
export function testColorContrast(element: Element): Array<{ element: Element; ratio: number; passes: boolean }> {
  const results: Array<{ element: Element; ratio: number; passes: boolean }> = [];
  
  const textElements = element.querySelectorAll('*');
  
  textElements.forEach(el => {
    const computedStyle = window.getComputedStyle(el);
    const color = computedStyle.color;
    const backgroundColor = computedStyle.backgroundColor;
    
    if (color && backgroundColor && color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
      const ratio = calculateContrastRatio(color, backgroundColor);
      const fontSize = parseFloat(computedStyle.fontSize);
      const fontWeight = computedStyle.fontWeight;
      
      // WCAG AA requirements
      const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
      const requiredRatio = isLargeText ? 3 : 4.5;
      
      results.push({
        element: el,
        ratio,
        passes: ratio >= requiredRatio,
      });
    }
  });
  
  return results;
}

// Helper function to calculate contrast ratio
function calculateContrastRatio(color1: string, color2: string): number {
  // This is a simplified implementation
  // In a real scenario, you'd want to use a proper color contrast library
  const rgb1 = parseRGB(color1);
  const rgb2 = parseRGB(color2);
  
  if (!rgb1 || !rgb2) return 1;
  
  const l1 = getRelativeLuminance(rgb1);
  const l2 = getRelativeLuminance(rgb2);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

function parseRGB(color: string): [number, number, number] | null {
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  }
  return null;
}

function getRelativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}