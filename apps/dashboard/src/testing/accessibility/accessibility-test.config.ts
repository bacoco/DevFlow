import { AccessibilityTestConfig } from './AccessibilityTester';

export const accessibilityTestConfigs: AccessibilityTestConfig[] = [
  // Core Dashboard Pages
  {
    name: 'dashboard-main-a11y',
    url: 'http://localhost:3000',
    waitFor: '[data-testid="dashboard-loaded"]',
    tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
    rules: {
      'color-contrast': { enabled: true },
      'keyboard-navigation': { enabled: true },
      'focus-management': { enabled: true }
    }
  },
  {
    name: 'tasks-page-a11y',
    url: 'http://localhost:3000/tasks',
    waitFor: '[data-testid="tasks-loaded"]',
    tags: ['wcag2a', 'wcag2aa']
  },
  {
    name: 'analytics-page-a11y',
    url: 'http://localhost:3000/analytics',
    waitFor: '[data-testid="analytics-loaded"]',
    tags: ['wcag2a', 'wcag2aa']
  },

  // Navigation Components
  {
    name: 'main-navigation-a11y',
    url: 'http://localhost:3000',
    selector: '[data-testid="main-navigation"]',
    tags: ['wcag2a', 'wcag2aa'],
    rules: {
      'aria-roles': { enabled: true },
      'keyboard-navigation': { enabled: true }
    }
  },
  {
    name: 'breadcrumb-navigation-a11y',
    url: 'http://localhost:3000/tasks/detail/123',
    selector: '[data-testid="breadcrumb"]',
    tags: ['wcag2a', 'wcag2aa']
  },

  // Interactive Components
  {
    name: 'modal-dialog-a11y',
    url: 'http://localhost:3000/demo?modal=settings',
    waitFor: '[data-testid="modal-content"]',
    tags: ['wcag2a', 'wcag2aa'],
    rules: {
      'focus-trap': { enabled: true },
      'aria-modal': { enabled: true }
    }
  },
  {
    name: 'dropdown-menu-a11y',
    url: 'http://localhost:3000/demo?dropdown=user-menu',
    waitFor: '[data-testid="dropdown-menu"]',
    tags: ['wcag2a', 'wcag2aa']
  },
  {
    name: 'form-controls-a11y',
    url: 'http://localhost:3000/demo/forms',
    waitFor: '[data-testid="form-loaded"]',
    tags: ['wcag2a', 'wcag2aa'],
    rules: {
      'form-labels': { enabled: true },
      'form-validation': { enabled: true }
    }
  },

  // Chart Components
  {
    name: 'line-chart-a11y',
    url: 'http://localhost:3000/charts/demo',
    selector: '[data-testid="line-chart"]',
    waitFor: '[data-testid="chart-rendered"]',
    tags: ['wcag2a', 'wcag2aa'],
    rules: {
      'alt-text': { enabled: true },
      'data-tables': { enabled: true }
    }
  },
  {
    name: 'bar-chart-a11y',
    url: 'http://localhost:3000/charts/demo',
    selector: '[data-testid="bar-chart"]',
    waitFor: '[data-testid="chart-rendered"]',
    tags: ['wcag2a', 'wcag2aa']
  },

  // Mobile Views
  {
    name: 'mobile-dashboard-a11y',
    url: 'http://localhost:3000?viewport=mobile',
    waitFor: '[data-testid="mobile-layout"]',
    tags: ['wcag2a', 'wcag2aa'],
    rules: {
      'touch-targets': { enabled: true },
      'mobile-navigation': { enabled: true }
    }
  },

  // Accessibility Features
  {
    name: 'high-contrast-a11y',
    url: 'http://localhost:3000?theme=high-contrast',
    waitFor: '[data-testid="dashboard-loaded"]',
    tags: ['wcag2a', 'wcag2aa', 'wcag2aaa'],
    rules: {
      'color-contrast-enhanced': { enabled: true }
    }
  },
  {
    name: 'reduced-motion-a11y',
    url: 'http://localhost:3000?motion=reduced',
    waitFor: '[data-testid="dashboard-loaded"]',
    tags: ['wcag2a', 'wcag2aa']
  },

  // Error States
  {
    name: 'error-boundary-a11y',
    url: 'http://localhost:3000/demo?error=true',
    waitFor: '[data-testid="error-fallback"]',
    tags: ['wcag2a', 'wcag2aa'],
    rules: {
      'error-messages': { enabled: true }
    }
  },
  {
    name: 'form-validation-errors-a11y',
    url: 'http://localhost:3000/demo/forms?errors=true',
    waitFor: '[data-testid="validation-errors"]',
    tags: ['wcag2a', 'wcag2aa'],
    rules: {
      'error-identification': { enabled: true },
      'error-suggestion': { enabled: true }
    }
  },

  // Loading States
  {
    name: 'loading-skeleton-a11y',
    url: 'http://localhost:3000/demo?loading=true',
    waitFor: '[data-testid="skeleton-loader"]',
    tags: ['wcag2a', 'wcag2aa'],
    rules: {
      'loading-indicators': { enabled: true }
    }
  }
];

export const criticalA11yTests = accessibilityTestConfigs.filter(config =>
  ['dashboard-main-a11y', 'main-navigation-a11y', 'modal-dialog-a11y'].includes(config.name)
);

export const wcagAATests = accessibilityTestConfigs.filter(config =>
  config.tags?.includes('wcag2aa')
);

export const wcagAAATests = accessibilityTestConfigs.filter(config =>
  config.tags?.includes('wcag2aaa')
);