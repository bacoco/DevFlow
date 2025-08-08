/**
 * Accessibility Manager
 * Coordinates all accessibility systems and provides a unified interface
 */

import { FocusManager, useFocusManagement } from './focus-management';
import { ScreenReaderManager, useScreenReader } from './screen-reader';
import { KeyboardNavigationManager, useKeyboardNavigation } from './keyboard-navigation';
import { VisualPreferencesManager, useVisualPreferences } from './visual-preferences';
import { AccessibilityTester, useAccessibilityTesting } from './testing-utilities';

export interface AccessibilityConfig {
  enableFocusManagement: boolean;
  enableScreenReaderSupport: boolean;
  enableKeyboardNavigation: boolean;
  enableVisualPreferences: boolean;
  enableAutomaticTesting: boolean;
  testingInterval?: number;
}

export class AccessibilityManager {
  private static instance: AccessibilityManager;
  private config: AccessibilityConfig;
  private focusManager: FocusManager;
  private screenReaderManager: ScreenReaderManager;
  private keyboardManager: KeyboardNavigationManager;
  private visualPreferencesManager: VisualPreferencesManager;
  private accessibilityTester: AccessibilityTester;
  private testingInterval?: number;

  static getInstance(config?: AccessibilityConfig): AccessibilityManager {
    if (!AccessibilityManager.instance) {
      AccessibilityManager.instance = new AccessibilityManager(config);
    }
    return AccessibilityManager.instance;
  }

  constructor(config?: AccessibilityConfig) {
    this.config = {
      enableFocusManagement: true,
      enableScreenReaderSupport: true,
      enableKeyboardNavigation: true,
      enableVisualPreferences: true,
      enableAutomaticTesting: false,
      testingInterval: 30000, // 30 seconds
      ...config
    };

    this.initialize();
  }

  private initialize(): void {
    // Initialize managers based on configuration
    if (this.config.enableFocusManagement) {
      this.focusManager = FocusManager.getInstance();
    }

    if (this.config.enableScreenReaderSupport) {
      this.screenReaderManager = ScreenReaderManager.getInstance();
    }

    if (this.config.enableKeyboardNavigation) {
      this.keyboardManager = KeyboardNavigationManager.getInstance();
    }

    if (this.config.enableVisualPreferences) {
      this.visualPreferencesManager = VisualPreferencesManager.getInstance();
    }

    if (this.config.enableAutomaticTesting) {
      this.accessibilityTester = AccessibilityTester.getInstance();
      this.startAutomaticTesting();
    }

    // Set up global accessibility event listeners
    this.setupGlobalEventListeners();
    
    // Announce that accessibility features are ready
    if (this.screenReaderManager) {
      setTimeout(() => {
        this.screenReaderManager.announceToScreenReader(
          'Accessibility features are now active',
          'polite'
        );
      }, 1000);
    }
  }

  /**
   * Sets up global event listeners for accessibility
   */
  private setupGlobalEventListeners(): void {
    // Listen for route changes to announce page changes
    window.addEventListener('popstate', () => {
      this.announcePageChange();
    });

    // Listen for dynamic content changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          this.handleDynamicContentChange(mutation);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Listen for focus events to provide context
    document.addEventListener('focusin', (event) => {
      this.handleFocusChange(event);
    });

    // Listen for error events to announce them
    window.addEventListener('error', (event) => {
      this.handleError(event);
    });
  }

  /**
   * Announces page changes to screen readers
   */
  private announcePageChange(): void {
    if (this.screenReaderManager) {
      const title = document.title;
      const announcement = `Navigated to ${title}`;
      this.screenReaderManager.announceToScreenReader(announcement, 'polite');
    }
  }

  /**
   * Handles dynamic content changes
   */
  private handleDynamicContentChange(mutation: MutationRecord): void {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        
        // Check if the new content needs accessibility enhancements
        this.enhanceNewContent(element);
        
        // Announce significant content changes
        if (this.isSignificantContent(element)) {
          this.announceContentChange(element);
        }
      }
    });
  }

  /**
   * Enhances new content with accessibility features
   */
  private enhanceNewContent(element: HTMLElement): void {
    // Add focus management to interactive elements
    const interactiveElements = element.querySelectorAll(
      'button, input, select, textarea, a[href], [role="button"], [tabindex]'
    );

    interactiveElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      
      // Ensure proper ARIA attributes
      if (!htmlEl.hasAttribute('aria-label') && !htmlEl.hasAttribute('aria-labelledby')) {
        const text = htmlEl.textContent?.trim();
        if (text) {
          htmlEl.setAttribute('aria-label', text);
        }
      }

      // Set up keyboard navigation if needed
      if (this.keyboardManager && htmlEl.closest('[data-keyboard-nav]')) {
        // Element is within a keyboard navigation context
        this.keyboardManager.setupNavigationContext(htmlEl.parentElement!, {
          container: htmlEl.parentElement!
        });
      }
    });

    // Check for images without alt text
    const images = element.querySelectorAll('img:not([alt])');
    images.forEach((img) => {
      console.warn('Image without alt text detected:', img);
      if (this.screenReaderManager) {
        this.screenReaderManager.announceToScreenReader(
          'Image without description detected',
          'polite'
        );
      }
    });
  }

  /**
   * Checks if content is significant enough to announce
   */
  private isSignificantContent(element: HTMLElement): boolean {
    // Check for specific roles or data attributes that indicate important content
    const significantRoles = ['alert', 'status', 'main', 'region'];
    const role = element.getAttribute('role');
    
    if (role && significantRoles.includes(role)) {
      return true;
    }

    // Check for data attributes indicating important content
    if (element.hasAttribute('data-announce') || 
        element.hasAttribute('data-live-region')) {
      return true;
    }

    // Check for error messages or notifications
    if (element.classList.contains('error') || 
        element.classList.contains('notification') ||
        element.classList.contains('alert')) {
      return true;
    }

    return false;
  }

  /**
   * Announces content changes
   */
  private announceContentChange(element: HTMLElement): void {
    if (!this.screenReaderManager) return;

    const role = element.getAttribute('role');
    const announcement = element.getAttribute('data-announce');
    
    if (announcement) {
      this.screenReaderManager.announceToScreenReader(announcement, 'polite');
    } else if (role === 'alert') {
      const text = element.textContent?.trim();
      if (text) {
        this.screenReaderManager.announceToScreenReader(text, 'assertive');
      }
    } else {
      const text = element.textContent?.trim();
      if (text && text.length < 200) { // Don't announce very long content
        this.screenReaderManager.announceToScreenReader(
          `New content: ${text}`,
          'polite'
        );
      }
    }
  }

  /**
   * Handles focus changes
   */
  private handleFocusChange(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    
    if (this.screenReaderManager && target) {
      // Provide context for complex UI elements
      const context = this.getFocusContext(target);
      if (context) {
        this.screenReaderManager.announceFocusChange(target, context);
      }
    }
  }

  /**
   * Gets context information for focused elements
   */
  private getFocusContext(element: HTMLElement): string | undefined {
    // Check if element is within a specific context
    const modal = element.closest('[role="dialog"]');
    if (modal) {
      return 'in dialog';
    }

    const menu = element.closest('[role="menu"]');
    if (menu) {
      return 'in menu';
    }

    const toolbar = element.closest('[role="toolbar"]');
    if (toolbar) {
      return 'in toolbar';
    }

    const table = element.closest('table');
    if (table) {
      return 'in table';
    }

    return undefined;
  }

  /**
   * Handles errors and announces them
   */
  private handleError(event: ErrorEvent): void {
    if (this.screenReaderManager) {
      this.screenReaderManager.announceToScreenReader(
        'An error occurred. Please check the page for error messages.',
        'assertive'
      );
    }
  }

  /**
   * Starts automatic accessibility testing
   */
  private startAutomaticTesting(): void {
    if (!this.accessibilityTester || !this.config.testingInterval) return;

    this.testingInterval = window.setInterval(async () => {
      try {
        const report = await this.accessibilityTester.runAccessibilityAudit();
        
        if (report.violations.length > 0) {
          console.warn('Accessibility violations detected:', report.violations);
          
          // Optionally announce critical violations
          const criticalViolations = report.violations.filter(v => v.impact === 'critical');
          if (criticalViolations.length > 0 && this.screenReaderManager) {
            this.screenReaderManager.announceToScreenReader(
              `${criticalViolations.length} critical accessibility issues detected`,
              'assertive'
            );
          }
        }
      } catch (error) {
        console.error('Automatic accessibility testing failed:', error);
      }
    }, this.config.testingInterval);
  }

  /**
   * Stops automatic testing
   */
  stopAutomaticTesting(): void {
    if (this.testingInterval) {
      clearInterval(this.testingInterval);
      this.testingInterval = undefined;
    }
  }

  /**
   * Updates configuration
   */
  updateConfig(newConfig: Partial<AccessibilityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart automatic testing if interval changed
    if (newConfig.testingInterval !== undefined) {
      this.stopAutomaticTesting();
      if (this.config.enableAutomaticTesting) {
        this.startAutomaticTesting();
      }
    }
  }

  /**
   * Gets current accessibility status
   */
  getStatus(): {
    focusManagement: boolean;
    screenReaderSupport: boolean;
    keyboardNavigation: boolean;
    visualPreferences: boolean;
    automaticTesting: boolean;
  } {
    return {
      focusManagement: !!this.focusManager,
      screenReaderSupport: !!this.screenReaderManager,
      keyboardNavigation: !!this.keyboardManager,
      visualPreferences: !!this.visualPreferencesManager,
      automaticTesting: !!this.testingInterval
    };
  }

  /**
   * Runs a comprehensive accessibility check
   */
  async runAccessibilityCheck(): Promise<{
    audit: any;
    keyboardTest: any;
    colorContrast: any[];
  }> {
    if (!this.accessibilityTester) {
      throw new Error('Accessibility testing is not enabled');
    }

    const audit = await this.accessibilityTester.runAccessibilityAudit();
    const keyboardTest = await this.accessibilityTester.testKeyboardNavigation(document.body);
    
    // Check color contrast for common color combinations
    const colorContrast = [
      this.accessibilityTester.checkColorContrast('#000000', '#ffffff'),
      this.accessibilityTester.checkColorContrast('#0066cc', '#ffffff'),
      this.accessibilityTester.checkColorContrast('#666666', '#ffffff')
    ];

    return {
      audit,
      keyboardTest,
      colorContrast
    };
  }

  /**
   * Cleanup method
   */
  cleanup(): void {
    this.stopAutomaticTesting();
    
    if (this.focusManager) {
      // Focus manager cleanup would go here
    }
    
    if (this.screenReaderManager) {
      this.screenReaderManager.cleanup();
    }
    
    if (this.keyboardManager) {
      this.keyboardManager.cleanup();
    }
    
    if (this.visualPreferencesManager) {
      this.visualPreferencesManager.cleanup();
    }
  }
}

// React hook for comprehensive accessibility management
export function useAccessibility(config?: AccessibilityConfig) {
  const manager = AccessibilityManager.getInstance(config);
  const focusManagement = useFocusManagement();
  const screenReader = useScreenReader();
  const keyboardNavigation = useKeyboardNavigation();
  const visualPreferences = useVisualPreferences();
  const accessibilityTesting = useAccessibilityTesting();

  return {
    manager,
    focusManagement,
    screenReader,
    keyboardNavigation,
    visualPreferences,
    accessibilityTesting,
    status: manager.getStatus(),
    runCheck: manager.runAccessibilityCheck.bind(manager),
    updateConfig: manager.updateConfig.bind(manager)
  };
}

// Export all accessibility utilities
export {
  FocusManager,
  ScreenReaderManager,
  KeyboardNavigationManager,
  VisualPreferencesManager,
  AccessibilityTester,
  useFocusManagement,
  useScreenReader,
  useKeyboardNavigation,
  useVisualPreferences,
  useAccessibilityTesting
};