/**
 * Visual Regression Testing Configuration
 * Configuration for Chromatic and visual testing setup
 */

module.exports = {
  // Chromatic configuration
  chromatic: {
    // Project token (should be set via environment variable)
    projectToken: process.env.CHROMATIC_PROJECT_TOKEN,
    
    // Build configuration
    buildScriptName: 'build-storybook',
    storybookBuildDir: 'storybook-static',
    
    // Visual testing options
    threshold: 0.2, // 0.2% threshold for visual changes
    delay: 500, // Wait 500ms before capturing
    diffThreshold: 0.1, // Threshold for pixel differences
    
    // Browser configuration
    browsers: [
      'chrome',
      'firefox', 
      'safari',
      'edge',
    ],
    
    // Viewport configuration
    viewports: [
      { width: 320, height: 568, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1024, height: 768, name: 'desktop' },
      { width: 1440, height: 900, name: 'large-desktop' },
      { width: 1920, height: 1080, name: 'xl-desktop' },
    ],
    
    // Accessibility testing
    a11y: {
      enabled: true,
      rules: {
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
        'focus-management': { enabled: true },
        'aria-labels': { enabled: true },
      },
    },
    
    // Performance testing
    performance: {
      enabled: true,
      budgets: {
        'first-contentful-paint': 1500,
        'largest-contentful-paint': 2500,
        'cumulative-layout-shift': 0.1,
      },
    },
    
    // Animation testing
    animations: {
      // Disable animations for consistent screenshots
      disable: true,
      
      // Or test specific animation states
      captureStates: [
        'initial',
        'hover',
        'focus',
        'active',
        'loading',
        'error',
      ],
    },
    
    // Ignore patterns
    ignorePatterns: [
      '**/node_modules/**',
      '**/*.test.*',
      '**/*.spec.*',
      '**/coverage/**',
    ],
    
    // Exit codes
    exitZeroOnChanges: false, // Fail CI on visual changes
    exitOnceUploaded: true,
    
    // Parallel execution
    parallel: true,
    maxWorkers: 4,
  },

  // Custom visual testing setup
  customVisualTests: {
    // Component states to test
    componentStates: [
      'default',
      'hover',
      'focus',
      'active',
      'disabled',
      'loading',
      'error',
      'success',
    ],
    
    // Theme variations
    themes: [
      'light',
      'dark',
      'high-contrast',
    ],
    
    // Responsive breakpoints
    breakpoints: [
      { name: 'mobile', width: 375 },
      { name: 'tablet', width: 768 },
      { name: 'desktop', width: 1024 },
      { name: 'wide', width: 1440 },
    ],
    
    // Interaction testing
    interactions: [
      {
        name: 'button-click',
        steps: [
          { action: 'hover', selector: 'button' },
          { action: 'click', selector: 'button' },
          { action: 'wait', duration: 300 },
        ],
      },
      {
        name: 'form-interaction',
        steps: [
          { action: 'focus', selector: 'input' },
          { action: 'type', selector: 'input', text: 'test input' },
          { action: 'blur', selector: 'input' },
        ],
      },
      {
        name: 'modal-open',
        steps: [
          { action: 'click', selector: '[data-testid="open-modal"]' },
          { action: 'wait', duration: 500 },
          { action: 'screenshot', name: 'modal-open' },
        ],
      },
    ],
    
    // Accessibility testing
    a11yTests: [
      {
        name: 'keyboard-navigation',
        steps: [
          { action: 'tab', count: 3 },
          { action: 'screenshot', name: 'keyboard-focus' },
        ],
      },
      {
        name: 'screen-reader',
        options: {
          announcements: true,
          ariaLabels: true,
          roleValidation: true,
        },
      },
    ],
  },

  // Storybook configuration for visual testing
  storybook: {
    // Global decorators for consistent testing
    globalDecorators: [
      // Theme provider
      (Story) => (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
          <Story />
        </div>
      ),
      
      // Accessibility provider
      (Story) => (
        <AccessibilityProvider>
          <Story />
        </AccessibilityProvider>
      ),
    ],
    
    // Global parameters
    globalParameters: {
      // Viewport configuration
      viewport: {
        viewports: {
          mobile: { name: 'Mobile', styles: { width: '375px', height: '667px' } },
          tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
          desktop: { name: 'Desktop', styles: { width: '1024px', height: '768px' } },
        },
      },
      
      // Background configuration
      backgrounds: {
        default: 'light',
        values: [
          { name: 'light', value: '#ffffff' },
          { name: 'dark', value: '#1f2937' },
          { name: 'gray', value: '#f3f4f6' },
        ],
      },
      
      // Actions configuration
      actions: {
        argTypesRegex: '^on[A-Z].*',
      },
      
      // Controls configuration
      controls: {
        matchers: {
          color: /(background|color)$/i,
          date: /Date$/,
        },
      },
    },
    
    // Story naming conventions
    storyNaming: {
      // Organize stories by component hierarchy
      hierarchy: 'UI Components',
      
      // Story naming pattern
      pattern: '{ComponentName}/{VariantName}',
      
      // Required stories for each component
      requiredStories: [
        'Default',
        'All Variants',
        'Interactive States',
        'Accessibility',
        'Error States',
      ],
    },
  },

  // CI/CD integration
  cicd: {
    // GitHub Actions integration
    github: {
      // Comment on PRs with visual changes
      commentOnPR: true,
      
      // Require approval for visual changes
      requireApproval: true,
      
      // Auto-approve minor changes
      autoApproveThreshold: 0.1,
    },
    
    // Quality gates
    qualityGates: {
      // Maximum allowed visual changes
      maxVisualChanges: 5,
      
      // Accessibility score threshold
      minA11yScore: 95,
      
      // Performance budget
      performanceBudget: {
        'bundle-size': '500kb',
        'render-time': '100ms',
      },
    },
    
    // Notifications
    notifications: {
      slack: {
        webhook: process.env.SLACK_WEBHOOK_URL,
        channel: '#ui-testing',
        onFailure: true,
        onSuccess: false,
      },
      
      email: {
        recipients: ['ui-team@company.com'],
        onFailure: true,
        onSuccess: false,
      },
    },
  },

  // Local development
  development: {
    // Watch mode configuration
    watch: {
      enabled: true,
      patterns: [
        'src/components/ui/**/*.tsx',
        'src/components/ui/**/*.stories.tsx',
      ],
      ignored: [
        '**/__tests__/**',
        '**/node_modules/**',
      ],
    },
    
    // Hot reload
    hotReload: {
      enabled: true,
      port: 6006,
    },
    
    // Debug mode
    debug: {
      enabled: process.env.NODE_ENV === 'development',
      verbose: true,
      saveFailedTests: true,
    },
  },
};