import { VisualTestConfig } from './VisualRegressionTester';

export const visualTestConfigs: VisualTestConfig[] = [
  // Dashboard Components
  {
    name: 'dashboard-main',
    url: 'http://localhost:3000',
    waitFor: '[data-testid="dashboard-loaded"]',
    viewport: { width: 1920, height: 1080 },
    mask: ['[data-testid="timestamp"]', '[data-testid="dynamic-content"]'],
    threshold: 0.1,
    browsers: ['chromium', 'firefox']
  },
  {
    name: 'dashboard-mobile',
    url: 'http://localhost:3000',
    waitFor: '[data-testid="dashboard-loaded"]',
    viewport: { width: 375, height: 667 },
    mask: ['[data-testid="timestamp"]'],
    threshold: 0.1
  },

  // Navigation Components
  {
    name: 'navigation-desktop',
    url: 'http://localhost:3000',
    selector: '[data-testid="main-navigation"]',
    viewport: { width: 1920, height: 1080 },
    threshold: 0.05
  },
  {
    name: 'navigation-mobile',
    url: 'http://localhost:3000',
    selector: '[data-testid="mobile-navigation"]',
    viewport: { width: 375, height: 667 },
    threshold: 0.05
  },

  // Chart Components
  {
    name: 'chart-line',
    url: 'http://localhost:3000/charts/demo',
    selector: '[data-testid="line-chart"]',
    waitFor: '[data-testid="chart-rendered"]',
    threshold: 0.2 // Charts may have slight rendering differences
  },
  {
    name: 'chart-bar',
    url: 'http://localhost:3000/charts/demo',
    selector: '[data-testid="bar-chart"]',
    waitFor: '[data-testid="chart-rendered"]',
    threshold: 0.2
  },
  {
    name: 'chart-heatmap',
    url: 'http://localhost:3000/charts/demo',
    selector: '[data-testid="heatmap-chart"]',
    waitFor: '[data-testid="chart-rendered"]',
    threshold: 0.2
  },

  // Accessibility States
  {
    name: 'high-contrast-mode',
    url: 'http://localhost:3000?theme=high-contrast',
    waitFor: '[data-testid="dashboard-loaded"]',
    viewport: { width: 1920, height: 1080 },
    threshold: 0.1
  },
  {
    name: 'dark-mode',
    url: 'http://localhost:3000?theme=dark',
    waitFor: '[data-testid="dashboard-loaded"]',
    viewport: { width: 1920, height: 1080 },
    threshold: 0.1
  },

  // Interactive States
  {
    name: 'modal-open',
    url: 'http://localhost:3000/demo?modal=settings',
    waitFor: '[data-testid="modal-content"]',
    threshold: 0.05
  },
  {
    name: 'dropdown-expanded',
    url: 'http://localhost:3000/demo?dropdown=user-menu',
    waitFor: '[data-testid="dropdown-menu"]',
    threshold: 0.05
  },

  // Error States
  {
    name: 'error-boundary',
    url: 'http://localhost:3000/demo?error=true',
    waitFor: '[data-testid="error-fallback"]',
    threshold: 0.05
  },
  {
    name: 'loading-state',
    url: 'http://localhost:3000/demo?loading=true',
    waitFor: '[data-testid="skeleton-loader"]',
    threshold: 0.1
  },

  // Responsive Breakpoints
  {
    name: 'tablet-landscape',
    url: 'http://localhost:3000',
    waitFor: '[data-testid="dashboard-loaded"]',
    viewport: { width: 1024, height: 768 },
    threshold: 0.1
  },
  {
    name: 'tablet-portrait',
    url: 'http://localhost:3000',
    waitFor: '[data-testid="dashboard-loaded"]',
    viewport: { width: 768, height: 1024 },
    threshold: 0.1
  },

  // Component Library
  {
    name: 'design-system-buttons',
    url: 'http://localhost:6006/iframe.html?id=button--all-variants',
    waitFor: 1000, // Wait for Storybook to load
    threshold: 0.05
  },
  {
    name: 'design-system-cards',
    url: 'http://localhost:6006/iframe.html?id=card--all-variants',
    waitFor: 1000,
    threshold: 0.05
  }
];

export const criticalTestConfigs = visualTestConfigs.filter(config => 
  ['dashboard-main', 'navigation-desktop', 'chart-line'].includes(config.name)
);