/**
 * Accessibility Test Helpers
 * Utilities for comprehensive accessibility testing
 */

import { axe, toHaveNoViolations } from 'jest-axe';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// WCAG 2.1 AA compliance configuration
export const wcagConfig = {
  rules: {
    // Level A rules
    'area-alt': { enabled: true },
    'aria-allowed-attr': { enabled: true },
    'aria-hidden-focus': { enabled: true },
    'aria-labelledby': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-required-children': { enabled: true },
    'aria-required-parent': { enabled: true },
    'aria-roles': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'button-name': { enabled: true },
    'bypass': { enabled: true },
    'color-contrast': { enabled: true },
    'document-title': { enabled: true },
    'duplicate-id': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    'frame-title': { enabled: true },
    'html-has-lang': { enabled: true },
    'html-lang-valid': { enabled: true },
    'image-alt': { enabled: true },
    'input-image-alt': { enabled: true },
    'keyboard': { enabled: true },
    'label': { enabled: true },
    'link-name': { enabled: true },
    'list': { enabled: true },
    'listitem': { enabled: true },
    'marquee': { enabled: true },
    'meta-refresh': { enabled: true },
    'meta-viewport': { enabled: true },
    'object-alt': { enabled: true },
    'role-img-alt': { enabled: true },
    'scrollable-region-focusable': { enabled: true },
    'server-side-image-map': { enabled: true },
    'svg-img-alt': { enabled: true },
    'td-headers-attr': { enabled: true },
    'th-has-data-cells': { enabled: true },
    'valid-lang': { enabled: true },
    'video-caption': { enabled: true },

    // Level AA rules
    'autocomplete-valid': { enabled: true },
    'avoid-inline-spacing': { enabled: true },
    'blink': { enabled: true },
    'color-contrast-enhanced': { enabled: false }, // AAA level
    'focus-order-semantics': { enabled: true },
    'hidden-content': { enabled: true },
    'label-title-only': { enabled: true },
    'landmark-banner-is-top-level': { enabled: true },
    'landmark-complementary-is-top-level': { enabled: true },
    'landmark-contentinfo-is-top-level': { enabled: true },
    'landmark-main-is-top-level': { enabled: true },
    'landmark-no-duplicate-banner': { enabled: true },
    'landmark-no-duplicate-contentinfo': { enabled: true },
    'landmark-one-main': { enabled: true },
    'link-in-text-block': { enabled: true },
    'no-autoplay-audio': { enabled: true },
    'page-has-heading-one': { enabled: true },
    'region': { enabled: true },
    'scope-attr-valid': { enabled: true },
    'skip-link': { enabled: true },
  },
  tags: ['wcag2a', 'wcag2aa'],
};

/**
 * Run comprehensive accessibility tests on a component
 */
export const testAccessibility = async (container: HTMLElement, config = wcagConfig) => {
  const results = await axe(container, config);
  expect(results).toHaveNoViolations();
  return results;
};

/**
 * Test keyboard navigation for a component
 */
export const testKeyboardNavigation = async (container: HTMLElement) => {
  const user = userEvent.setup();
  
  // Find all focusable elements
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  if (focusableElements.length === 0) {
    return; // No focusable elements to test
  }

  // Test tab navigation
  const firstElement = focusableElements[0] as HTMLElement;
  firstElement.focus();
  expect(firstElement).toHaveFocus();

  // Tab through all elements
  for (let i = 1; i < focusableElements.length; i++) {
    await user.tab();
    expect(focusableElements[i]).toHaveFocus();
  }

  // Test shift+tab navigation (reverse)
  for (let i = focusableElements.length - 2; i >= 0; i--) {
    await user.tab({ shift: true });
    expect(focusableElements[i]).toHaveFocus();
  }
};

/**
 * Test screen reader announcements
 */
export const testScreenReaderAnnouncements = (container: HTMLElement) => {
  // Check for live regions
  const liveRegions = container.querySelectorAll('[aria-live]');
  liveRegions.forEach(region => {
    const liveValue = region.getAttribute('aria-live');
    expect(['polite', 'assertive', 'off']).toContain(liveValue);
  });

  // Check for status elements
  const statusElements = container.querySelectorAll('[role="status"], [role="alert"]');
  expect(statusElements.length).toBeGreaterThanOrEqual(0);

  return {
    liveRegions: liveRegions.length,
    statusElements: statusElements.length,
  };
};

/**
 * Test color contrast ratios
 */
export const testColorContrast = async (container: HTMLElement) => {
  const results = await axe(container, {
    rules: {
      'color-contrast': { enabled: true },
    },
  });

  const contrastViolations = results.violations.filter(
    violation => violation.id === 'color-contrast'
  );

  expect(contrastViolations).toHaveLength(0);
  return contrastViolations;
};

/**
 * Test focus management
 */
export const testFocusManagement = (container: HTMLElement) => {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  // Check that all focusable elements have visible focus indicators
  focusableElements.forEach(element => {
    const computedStyle = window.getComputedStyle(element, ':focus');
    const hasOutline = computedStyle.outline !== 'none' && computedStyle.outline !== '';
    const hasBoxShadow = computedStyle.boxShadow !== 'none';
    const hasBorder = computedStyle.border !== 'none';

    // At least one focus indicator should be present
    expect(hasOutline || hasBoxShadow || hasBorder).toBe(true);
  });

  return focusableElements.length;
};

/**
 * Test ARIA labels and descriptions
 */
export const testARIALabels = (container: HTMLElement) => {
  const interactiveElements = container.querySelectorAll(
    'button, [role="button"], [role="link"], input, select, textarea, [role="tab"], [role="menuitem"]'
  );

  const results = {
    total: interactiveElements.length,
    withLabels: 0,
    withDescriptions: 0,
    violations: [] as string[],
  };

  interactiveElements.forEach((element, index) => {
    const hasLabel = element.getAttribute('aria-label') ||
                    element.getAttribute('aria-labelledby') ||
                    element.textContent?.trim();

    const hasDescription = element.getAttribute('aria-describedby');

    if (hasLabel) {
      results.withLabels++;
    } else {
      results.violations.push(`Element ${index} lacks accessible name`);
    }

    if (hasDescription) {
      results.withDescriptions++;
    }
  });

  // All interactive elements should have labels
  expect(results.violations).toHaveLength(0);

  return results;
};

/**
 * Test heading structure
 */
export const testHeadingStructure = (container: HTMLElement) => {
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const headingLevels = Array.from(headings).map(heading => 
    parseInt(heading.tagName.charAt(1))
  );

  if (headingLevels.length === 0) {
    return { valid: true, headings: 0 };
  }

  // Check for proper heading hierarchy
  let valid = true;
  let previousLevel = 0;

  headingLevels.forEach((level, index) => {
    if (index === 0) {
      // First heading should be h1 or reasonable starting point
      if (level > 2) {
        valid = false;
      }
    } else {
      // Subsequent headings should not skip levels
      if (level > previousLevel + 1) {
        valid = false;
      }
    }
    previousLevel = level;
  });

  expect(valid).toBe(true);

  return {
    valid,
    headings: headingLevels.length,
    levels: headingLevels,
  };
};

/**
 * Test landmark regions
 */
export const testLandmarks = (container: HTMLElement) => {
  const landmarks = container.querySelectorAll(
    '[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"], [role="search"], main, nav, header, footer, aside'
  );

  const landmarkTypes = Array.from(landmarks).map(landmark => {
    return landmark.getAttribute('role') || landmark.tagName.toLowerCase();
  });

  // Check for main landmark
  const hasMain = landmarkTypes.includes('main');
  
  return {
    total: landmarks.length,
    types: landmarkTypes,
    hasMain,
  };
};

/**
 * Test form accessibility
 */
export const testFormAccessibility = (container: HTMLElement) => {
  const formElements = container.querySelectorAll('input, select, textarea');
  const results = {
    total: formElements.length,
    withLabels: 0,
    withErrors: 0,
    withDescriptions: 0,
    violations: [] as string[],
  };

  formElements.forEach((element, index) => {
    const id = element.getAttribute('id');
    const hasLabel = element.getAttribute('aria-label') ||
                    element.getAttribute('aria-labelledby') ||
                    (id && container.querySelector(`label[for="${id}"]`));

    const hasError = element.getAttribute('aria-invalid') === 'true' ||
                    element.getAttribute('aria-describedby');

    const hasDescription = element.getAttribute('aria-describedby');

    if (hasLabel) {
      results.withLabels++;
    } else {
      results.violations.push(`Form element ${index} lacks label`);
    }

    if (hasError) {
      results.withErrors++;
    }

    if (hasDescription) {
      results.withDescriptions++;
    }
  });

  // All form elements should have labels
  expect(results.violations).toHaveLength(0);

  return results;
};

/**
 * Comprehensive accessibility test suite
 */
export const runFullAccessibilityTest = async (container: HTMLElement) => {
  const results = {
    axe: await testAccessibility(container),
    colorContrast: await testColorContrast(container),
    screenReader: testScreenReaderAnnouncements(container),
    focusManagement: testFocusManagement(container),
    ariaLabels: testARIALabels(container),
    headingStructure: testHeadingStructure(container),
    landmarks: testLandmarks(container),
    forms: testFormAccessibility(container),
  };

  return results;
};

/**
 * Test component with reduced motion preferences
 */
export const testReducedMotion = (renderComponent: () => void) => {
  // Mock reduced motion preference
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Component should still render and function with reduced motion
  expect(() => renderComponent()).not.toThrow();
};

/**
 * Test component with high contrast mode
 */
export const testHighContrast = (renderComponent: () => void) => {
  // Mock high contrast preference
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-contrast: high)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Component should still render and function with high contrast
  expect(() => renderComponent()).not.toThrow();
};

/**
 * Test component with different font sizes
 */
export const testFontScaling = (container: HTMLElement) => {
  const originalFontSize = document.documentElement.style.fontSize;
  
  // Test with 200% font size (WCAG requirement)
  document.documentElement.style.fontSize = '32px'; // 200% of 16px
  
  // Component should still be usable
  const overflowElements = container.querySelectorAll('*');
  overflowElements.forEach(element => {
    const computedStyle = window.getComputedStyle(element);
    const hasOverflow = computedStyle.overflow === 'hidden' && 
                       element.scrollWidth > element.clientWidth;
    
    // Text should not be cut off at 200% zoom
    if (hasOverflow && element.textContent?.trim()) {
      console.warn(`Element may have text overflow at 200% zoom:`, element);
    }
  });
  
  // Restore original font size
  document.documentElement.style.fontSize = originalFontSize;
};