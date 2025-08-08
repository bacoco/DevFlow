import { useEffect, useRef, useCallback } from 'react';

// ARIA live region manager
export class AriaLiveRegionManager {
  private static instance: AriaLiveRegionManager;
  private politeRegion: HTMLElement | null = null;
  private assertiveRegion: HTMLElement | null = null;

  static getInstance(): AriaLiveRegionManager {
    if (!AriaLiveRegionManager.instance) {
      AriaLiveRegionManager.instance = new AriaLiveRegionManager();
    }
    return AriaLiveRegionManager.instance;
  }

  private constructor() {
    this.createLiveRegions();
  }

  private createLiveRegions() {
    // Only create live regions on client side
    if (typeof window === 'undefined') return;
    
    // Create polite live region
    this.politeRegion = document.createElement('div');
    this.politeRegion.setAttribute('aria-live', 'polite');
    this.politeRegion.setAttribute('aria-atomic', 'true');
    this.politeRegion.className = 'sr-only';
    this.politeRegion.id = 'aria-live-polite';
    document.body.appendChild(this.politeRegion);

    // Create assertive live region
    this.assertiveRegion = document.createElement('div');
    this.assertiveRegion.setAttribute('aria-live', 'assertive');
    this.assertiveRegion.setAttribute('aria-atomic', 'true');
    this.assertiveRegion.className = 'sr-only';
    this.assertiveRegion.id = 'aria-live-assertive';
    document.body.appendChild(this.assertiveRegion);
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    // Only announce on client side
    if (typeof window === 'undefined') return;
    
    const region = priority === 'assertive' ? this.assertiveRegion : this.politeRegion;
    if (region) {
      // Clear previous message
      region.textContent = '';
      // Add new message after a brief delay to ensure screen readers pick it up
      setTimeout(() => {
        region.textContent = message;
      }, 100);
      // Clear message after announcement
      setTimeout(() => {
        region.textContent = '';
      }, 1000);
    }
  }
}

// Focus management utilities
export class FocusManager {
  private static focusStack: HTMLElement[] = [];

  static pushFocus(element: HTMLElement) {
    const currentFocus = document.activeElement as HTMLElement;
    if (currentFocus && currentFocus !== document.body) {
      this.focusStack.push(currentFocus);
    }
    element.focus();
  }

  static popFocus() {
    const previousFocus = this.focusStack.pop();
    if (previousFocus) {
      previousFocus.focus();
    }
  }

  static trapFocus(container: HTMLElement) {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }

  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])',
      '[role="link"]',
      '[role="menuitem"]',
      '[role="tab"]',
      '[contenteditable="true"]',
    ];

    const elements = container.querySelectorAll(focusableSelectors.join(', '));
    return Array.from(elements).filter((element) => {
      const htmlElement = element as HTMLElement;
      return (
        htmlElement.offsetWidth > 0 &&
        htmlElement.offsetHeight > 0 &&
        !htmlElement.hasAttribute('disabled') &&
        htmlElement.tabIndex !== -1
      );
    }) as HTMLElement[];
  }
}

// Color contrast utilities
export const ColorContrastUtils = {
  // Calculate relative luminance
  getRelativeLuminance(color: string): number {
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;

    const [r, g, b] = rgb.map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  },

  // Calculate contrast ratio between two colors
  getContrastRatio(color1: string, color2: string): number {
    const lum1 = this.getRelativeLuminance(color1);
    const lum2 = this.getRelativeLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  },

  // Check if contrast ratio meets WCAG standards
  meetsWCAGStandards(color1: string, color2: string, level: 'AA' | 'AAA' = 'AA'): boolean {
    const ratio = this.getContrastRatio(color1, color2);
    return level === 'AA' ? ratio >= 4.5 : ratio >= 7;
  },

  // Convert hex to RGB
  hexToRgb(hex: string): [number, number, number] | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : null;
  },

  // Get accessible color pair
  getAccessibleColorPair(backgroundColor: string): { text: string; border: string } {
    const bgLuminance = this.getRelativeLuminance(backgroundColor);
    const whiteContrast = this.getContrastRatio(backgroundColor, '#ffffff');
    const blackContrast = this.getContrastRatio(backgroundColor, '#000000');

    const textColor = whiteContrast > blackContrast ? '#ffffff' : '#000000';
    const borderColor = bgLuminance > 0.5 ? '#000000' : '#ffffff';

    return { text: textColor, border: borderColor };
  }
};

// Keyboard navigation utilities
export const KeyboardNavigationUtils = {
  // Check if element is focusable
  isFocusable(element: HTMLElement): boolean {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])',
      '[role="link"]',
      '[role="menuitem"]',
      '[role="tab"]',
    ];

    return focusableSelectors.some(selector => element.matches(selector)) &&
           element.offsetWidth > 0 &&
           element.offsetHeight > 0 &&
           !element.hasAttribute('disabled') &&
           element.tabIndex !== -1;
  },

  // Get next focusable element
  getNextFocusableElement(current: HTMLElement, container?: HTMLElement): HTMLElement | null {
    const root = container || document.body;
    const focusableElements = FocusManager.getFocusableElements(root);
    const currentIndex = focusableElements.indexOf(current);
    
    if (currentIndex === -1) return null;
    
    const nextIndex = (currentIndex + 1) % focusableElements.length;
    return focusableElements[nextIndex];
  },

  // Get previous focusable element
  getPreviousFocusableElement(current: HTMLElement, container?: HTMLElement): HTMLElement | null {
    const root = container || document.body;
    const focusableElements = FocusManager.getFocusableElements(root);
    const currentIndex = focusableElements.indexOf(current);
    
    if (currentIndex === -1) return null;
    
    const prevIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
    return focusableElements[prevIndex];
  }
};

// Screen reader utilities
export const ScreenReaderUtils = {
  // Create accessible description for complex UI elements
  createAccessibleDescription(element: {
    type: string;
    label: string;
    value?: string | number;
    state?: string;
    position?: { current: number; total: number };
    instructions?: string[];
  }): string {
    const parts = [element.label];
    
    if (element.value !== undefined) {
      parts.push(`value ${element.value}`);
    }
    
    if (element.state) {
      parts.push(element.state);
    }
    
    if (element.position) {
      parts.push(`${element.position.current} of ${element.position.total}`);
    }
    
    parts.push(element.type);
    
    if (element.instructions && element.instructions.length > 0) {
      parts.push(`Instructions: ${element.instructions.join(', ')}`);
    }
    
    return parts.join(', ');
  },

  // Generate table description for charts
  generateChartTableDescription(data: Array<{ label: string; value: number; [key: string]: any }>): string {
    const headers = Object.keys(data[0] || {});
    const rows = data.map(item => 
      headers.map(header => `${header}: ${item[header]}`).join(', ')
    );
    
    return `Chart data table with ${data.length} rows. ${rows.join('. ')}`;
  },

  // Create accessible loading message
  createLoadingMessage(context: string, progress?: number): string {
    const base = `Loading ${context}`;
    return progress !== undefined ? `${base}, ${Math.round(progress)}% complete` : base;
  }
};

// Accessibility testing utilities
export const AccessibilityTestUtils = {
  // Check for missing alt text on images
  checkImageAltText(): string[] {
    const images = document.querySelectorAll('img');
    const issues: string[] = [];
    
    images.forEach((img, index) => {
      if (!img.alt && !img.getAttribute('aria-label') && !img.getAttribute('aria-labelledby')) {
        issues.push(`Image ${index + 1} is missing alt text`);
      }
    });
    
    return issues;
  },

  // Check for proper heading hierarchy
  checkHeadingHierarchy(): string[] {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const issues: string[] = [];
    let previousLevel = 0;
    
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      
      if (index === 0 && level !== 1) {
        issues.push('Page should start with h1');
      }
      
      if (level > previousLevel + 1) {
        issues.push(`Heading level jumps from h${previousLevel} to h${level}`);
      }
      
      previousLevel = level;
    });
    
    return issues;
  },

  // Check for keyboard accessibility
  checkKeyboardAccessibility(): string[] {
    const interactiveElements = document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [role="link"], [tabindex]'
    );
    const issues: string[] = [];
    
    interactiveElements.forEach((element, index) => {
      const htmlElement = element as HTMLElement;
      
      if (htmlElement.tabIndex === -1 && !htmlElement.hasAttribute('aria-hidden')) {
        issues.push(`Interactive element ${index + 1} is not keyboard accessible`);
      }
      
      if (!htmlElement.getAttribute('aria-label') && 
          !htmlElement.getAttribute('aria-labelledby') && 
          !htmlElement.textContent?.trim()) {
        issues.push(`Interactive element ${index + 1} has no accessible name`);
      }
    });
    
    return issues;
  },

  // Run all accessibility checks
  runAllChecks(): { category: string; issues: string[] }[] {
    return [
      { category: 'Images', issues: this.checkImageAltText() },
      { category: 'Headings', issues: this.checkHeadingHierarchy() },
      { category: 'Keyboard', issues: this.checkKeyboardAccessibility() },
    ];
  }
};

// React hooks for accessibility
export const useAnnouncement = () => {
  const liveRegionManager = AriaLiveRegionManager.getInstance();
  
  return useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    liveRegionManager.announce(message, priority);
  }, [liveRegionManager]);
};

export const useFocusManagement = () => {
  return {
    pushFocus: FocusManager.pushFocus,
    popFocus: FocusManager.popFocus,
    trapFocus: FocusManager.trapFocus,
    getFocusableElements: FocusManager.getFocusableElements,
  };
};

export const useAccessibilityTesting = () => {
  const runTests = useCallback(() => {
    return AccessibilityTestUtils.runAllChecks();
  }, []);

  return { runTests };
};

// Skip link component utility
export const createSkipLink = (targetId: string, label: string) => {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.className = 'skip-link';
  skipLink.textContent = label;
  skipLink.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
  
  return skipLink;
};