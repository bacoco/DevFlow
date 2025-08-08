/**
 * Accessibility Infrastructure
 * Comprehensive accessibility support for the DevFlow Intelligence dashboard
 */

// Main accessibility manager
export {
  AccessibilityManager,
  useAccessibility,
  type AccessibilityConfig
} from './accessibility-manager';

// Focus management
export {
  FocusManager,
  useFocusManagement,
  type FocusOptions,
  type FocusTrap
} from './focus-management';

// Screen reader support
export {
  ScreenReaderManager,
  useScreenReader,
  type Priority,
  type LiveRegionType,
  type AriaAttributes
} from './screen-reader';

// Keyboard navigation
export {
  KeyboardNavigationManager,
  useKeyboardNavigation,
  type KeyboardShortcut,
  type NavigationContext
} from './keyboard-navigation';

// Visual preferences
export {
  VisualPreferencesManager,
  useVisualPreferences,
  type VisualPreferences,
  type FontScale,
  type ColorBlindnessType,
  type FocusIndicatorStyle,
  type CustomColorConfig
} from './visual-preferences';

// Testing utilities
export {
  AccessibilityTester,
  useAccessibilityTesting,
  type AccessibilityIssue,
  type AccessibilityReport,
  type ColorContrastResult
} from './testing-utilities';

// Demo component
export { AccessibilityDemo } from './AccessibilityDemo';

// Utility functions for common accessibility patterns
export const AccessibilityUtils = {
  /**
   * Creates a unique ID for accessibility purposes
   */
  createId: (prefix: string = 'a11y'): string => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Checks if an element is focusable
   */
  isFocusable: (element: HTMLElement): boolean => {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ];

    return focusableSelectors.some(selector => element.matches(selector)) &&
           element.offsetWidth > 0 &&
           element.offsetHeight > 0 &&
           window.getComputedStyle(element).visibility !== 'hidden';
  },

  /**
   * Gets the accessible name of an element
   */
  getAccessibleName: (element: HTMLElement): string => {
    // Check aria-label first
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();

    // Check aria-labelledby
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelElements = labelledBy.split(' ')
        .map(id => document.getElementById(id))
        .filter(Boolean);
      
      if (labelElements.length > 0) {
        return labelElements.map(el => el!.textContent).join(' ').trim();
      }
    }

    // Check associated label
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label && label.textContent) {
        return label.textContent.trim();
      }
    }

    // Check if wrapped in label
    const parentLabel = element.closest('label');
    if (parentLabel && parentLabel.textContent) {
      return parentLabel.textContent.trim();
    }

    // Check title attribute
    const title = element.getAttribute('title');
    if (title) return title.trim();

    // Fall back to text content for certain elements
    if (['button', 'a', 'summary'].includes(element.tagName.toLowerCase())) {
      return element.textContent?.trim() || '';
    }

    return '';
  },

  /**
   * Checks if an element has sufficient color contrast
   */
  hasGoodContrast: (foreground: string, background: string): boolean => {
    try {
      const tester = AccessibilityTester.getInstance();
      const result = tester.checkColorContrast(foreground, background);
      return result.AA;
    } catch {
      return false;
    }
  },

  /**
   * Creates a skip link element
   */
  createSkipLink: (text: string, target: string): HTMLAnchorElement => {
    const skipLink = document.createElement('a');
    skipLink.href = target;
    skipLink.textContent = text;
    skipLink.className = 'skip-link';
    skipLink.setAttribute('data-skip-link', '');
    
    // Add styles for skip link
    skipLink.style.cssText = `
      position: absolute;
      left: -10000px;
      top: auto;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;

    skipLink.addEventListener('focus', () => {
      skipLink.style.cssText = `
        position: static;
        width: auto;
        height: auto;
        padding: 8px;
        background: #000;
        color: #fff;
        text-decoration: none;
        border-radius: 4px;
        z-index: 1000;
      `;
    });

    skipLink.addEventListener('blur', () => {
      skipLink.style.cssText = `
        position: absolute;
        left: -10000px;
        top: auto;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `;
    });

    return skipLink;
  },

  /**
   * Announces a message to screen readers
   */
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite'): void => {
    const screenReader = ScreenReaderManager.getInstance();
    screenReader.announceToScreenReader(message, priority);
  },

  /**
   * Sets up basic accessibility for a form
   */
  enhanceForm: (form: HTMLFormElement): void => {
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      const htmlInput = input as HTMLElement;
      
      // Ensure all inputs have labels
      if (!AccessibilityUtils.getAccessibleName(htmlInput)) {
        console.warn('Form input without accessible name:', input);
      }

      // Add required indicator to ARIA
      if (htmlInput.hasAttribute('required')) {
        htmlInput.setAttribute('aria-required', 'true');
      }

      // Set up error handling
      htmlInput.addEventListener('invalid', (event) => {
        const target = event.target as HTMLInputElement;
        target.setAttribute('aria-invalid', 'true');
        
        const errorMessage = target.validationMessage;
        if (errorMessage) {
          const screenReader = ScreenReaderManager.getInstance();
          const fieldName = AccessibilityUtils.getAccessibleName(target) || 'Field';
          screenReader.announceFormError(fieldName, errorMessage);
        }
      });

      htmlInput.addEventListener('input', () => {
        if (htmlInput.getAttribute('aria-invalid') === 'true') {
          htmlInput.removeAttribute('aria-invalid');
        }
      });
    });
  },

  /**
   * Sets up accessibility for a data table
   */
  enhanceTable: (table: HTMLTableElement): void => {
    // Ensure table has a caption or aria-label
    if (!table.caption && !table.getAttribute('aria-label') && !table.getAttribute('aria-labelledby')) {
      console.warn('Table without accessible name:', table);
    }

    // Ensure headers have scope attributes
    const headers = table.querySelectorAll('th');
    headers.forEach(header => {
      if (!header.hasAttribute('scope')) {
        // Try to determine scope automatically
        const row = header.closest('tr');
        const isInThead = header.closest('thead');
        
        if (isInThead) {
          header.setAttribute('scope', 'col');
        } else if (row && header === row.firstElementChild) {
          header.setAttribute('scope', 'row');
        }
      }
    });

    // Add keyboard navigation for table cells
    const cells = table.querySelectorAll('td, th');
    cells.forEach(cell => {
      cell.setAttribute('tabindex', '0');
      
      cell.addEventListener('focus', () => {
        const cellElement = cell as HTMLElement;
        const row = cellElement.closest('tr');
        const rowIndex = row ? Array.from(row.parentElement!.children).indexOf(row) : 0;
        const colIndex = Array.from(row!.children).indexOf(cellElement);
        const totalRows = table.rows.length;
        const totalCols = row!.children.length;
        
        const screenReader = ScreenReaderManager.getInstance();
        screenReader.announceTableNavigation(cellElement, rowIndex, colIndex, totalRows, totalCols);
      });
    });
  }
};

// Initialize accessibility on module load
let accessibilityManager: AccessibilityManager | null = null;

export const initializeAccessibility = (config?: AccessibilityConfig): AccessibilityManager => {
  if (!accessibilityManager) {
    accessibilityManager = AccessibilityManager.getInstance(config);
  }
  return accessibilityManager;
};

// Auto-initialize with default configuration
if (typeof window !== 'undefined') {
  initializeAccessibility();
}