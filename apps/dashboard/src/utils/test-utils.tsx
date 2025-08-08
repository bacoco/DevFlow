/**
 * Test Utilities
 * Common utilities and providers for testing components
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AccessibilityProvider } from '../contexts/AccessibilityContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { QueryClient, QueryProvider } from '@tanstack/react-query';

// Create a custom render function that includes providers
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryProvider client={queryClient}>
      <ThemeProvider>
        <AccessibilityProvider>
          {children}
        </AccessibilityProvider>
      </ThemeProvider>
    </QueryProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// Accessibility testing utilities
export const axeConfig = {
  rules: {
    // Disable color contrast checking for now (can be enabled later)
    'color-contrast': { enabled: false },
    // Ensure all interactive elements are keyboard accessible
    'keyboard': { enabled: true },
    // Ensure proper heading structure
    'heading-order': { enabled: true },
    // Ensure proper landmark usage
    'landmark-one-main': { enabled: true },
    'landmark-complementary-is-top-level': { enabled: true },
    // Ensure proper form labeling
    'label': { enabled: true },
    'label-title-only': { enabled: true },
    // Ensure proper button implementation
    'button-name': { enabled: true },
    // Ensure proper link implementation
    'link-name': { enabled: true },
    // Ensure proper image alt text
    'image-alt': { enabled: true },
    // Ensure proper ARIA usage
    'aria-valid-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'aria-required-attr': { enabled: true },
  },
};

// Mock data generators
export const createMockUser = (overrides = {}) => ({
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  avatar: 'https://example.com/avatar.jpg',
  role: 'developer',
  ...overrides,
});

export const createMockTask = (overrides = {}) => ({
  id: '1',
  title: 'Test Task',
  description: 'This is a test task',
  status: 'todo',
  priority: 'medium',
  assignee: createMockUser(),
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  ...overrides,
});

export const createMockNotification = (overrides = {}) => ({
  id: '1',
  title: 'Test Notification',
  message: 'This is a test notification',
  type: 'info' as const,
  timestamp: new Date('2023-01-01'),
  read: false,
  actions: [],
  ...overrides,
});

// Custom matchers for better testing
export const customMatchers = {
  toBeAccessible: async (received: HTMLElement) => {
    const { axe } = await import('jest-axe');
    const results = await axe(received, axeConfig);
    
    if (results.violations.length === 0) {
      return {
        message: () => `Expected element to have accessibility violations, but none were found`,
        pass: true,
      };
    }

    const violationMessages = results.violations.map(violation => 
      `${violation.id}: ${violation.description}\n${violation.nodes.map(node => `  - ${node.target}`).join('\n')}`
    ).join('\n\n');

    return {
      message: () => `Expected element to be accessible, but found violations:\n\n${violationMessages}`,
      pass: false,
    };
  },

  toHaveProperFocus: (received: HTMLElement) => {
    const focusableElements = received.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const hasTabIndex = Array.from(focusableElements).every(el => {
      const tabIndex = el.getAttribute('tabindex');
      return tabIndex === null || parseInt(tabIndex) >= 0;
    });

    if (hasTabIndex) {
      return {
        message: () => `Expected element to have improper focus management`,
        pass: true,
      };
    }

    return {
      message: () => `Expected element to have proper focus management, but some focusable elements have negative tabindex`,
      pass: false,
    };
  },

  toHaveProperARIA: (received: HTMLElement) => {
    const interactiveElements = received.querySelectorAll(
      'button, [role="button"], [role="link"], input, select, textarea'
    );

    const hasProperARIA = Array.from(interactiveElements).every(el => {
      const hasLabel = el.getAttribute('aria-label') || 
                     el.getAttribute('aria-labelledby') || 
                     el.textContent?.trim();
      return hasLabel;
    });

    if (hasProperARIA) {
      return {
        message: () => `Expected element to have improper ARIA labels`,
        pass: true,
      };
    }

    return {
      message: () => `Expected element to have proper ARIA labels, but some interactive elements lack accessible names`,
      pass: false,
    };
  },
};

// Performance testing utilities
export const measureRenderTime = (renderFn: () => void): number => {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  return end - start;
};

export const expectRenderTimeUnder = (renderFn: () => void, maxTime: number) => {
  const renderTime = measureRenderTime(renderFn);
  expect(renderTime).toBeLessThan(maxTime);
};

// Mock implementations for common dependencies
export const mockIntersectionObserver = () => {
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
};

export const mockResizeObserver = () => {
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
};

export const mockMatchMedia = (matches = false) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

// Setup function for common test environment
export const setupTestEnvironment = () => {
  mockIntersectionObserver();
  mockResizeObserver();
  mockMatchMedia();
  
  // Mock console methods to reduce noise in tests
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  
  // Mock window.scrollTo
  Object.defineProperty(window, 'scrollTo', {
    value: jest.fn(),
    writable: true,
  });
};

// Cleanup function
export const cleanupTestEnvironment = () => {
  jest.restoreAllMocks();
};