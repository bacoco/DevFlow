import { UserJourney, UserPersona } from './UsabilityTester';

// User Personas
export const userPersonas: UserPersona[] = [
  {
    id: 'novice-developer',
    name: 'Alex - Junior Developer',
    role: 'Junior Software Developer',
    experience: 'novice',
    goals: [
      'Understand team productivity patterns',
      'Learn from senior developers',
      'Track personal improvement'
    ],
    painPoints: [
      'Overwhelmed by complex interfaces',
      'Needs clear guidance and help',
      'Struggles with advanced features'
    ]
  },
  {
    id: 'experienced-developer',
    name: 'Jordan - Senior Developer',
    role: 'Senior Software Developer',
    experience: 'expert',
    goals: [
      'Quickly access key metrics',
      'Identify team bottlenecks',
      'Optimize development workflows'
    ],
    painPoints: [
      'Wants efficient, keyboard-driven workflows',
      'Dislikes unnecessary clicks',
      'Needs customizable dashboards'
    ]
  },
  {
    id: 'team-lead',
    name: 'Sam - Team Lead',
    role: 'Engineering Team Lead',
    experience: 'intermediate',
    goals: [
      'Monitor team performance',
      'Identify areas for improvement',
      'Generate reports for stakeholders'
    ],
    painPoints: [
      'Limited time for complex analysis',
      'Needs clear, actionable insights',
      'Requires collaboration features'
    ]
  }
];

// User Journeys
export const userJourneys: UserJourney[] = [
  {
    id: 'first-time-user-onboarding',
    name: 'First-time User Onboarding',
    description: 'New user discovers and learns the dashboard',
    persona: userPersonas[0], // Novice developer
    expectedDuration: 180, // 3 minutes
    successCriteria: {
      taskCompletionRate: 90,
      maxTaskTime: 300,
      maxErrors: 2,
      minSatisfactionScore: 4
    },
    steps: [
      {
        id: 'landing',
        description: 'Navigate to dashboard homepage',
        action: { type: 'navigate', target: 'http://localhost:3000' },
        expectedOutcome: 'Dashboard loads with welcome message'
      },
      {
        id: 'start-tour',
        description: 'Start the product tour',
        action: { type: 'click', target: '[data-testid="start-tour-button"]' },
        expectedOutcome: 'Product tour begins with first step highlighted'
      },
      {
        id: 'tour-navigation',
        description: 'Navigate through tour steps',
        action: { type: 'click', target: '[data-testid="tour-next-button"]' },
        expectedOutcome: 'Tour progresses to next step'
      },
      {
        id: 'tour-completion',
        description: 'Complete the product tour',
        action: { type: 'click', target: '[data-testid="tour-finish-button"]' },
        expectedOutcome: 'Tour completes and dashboard is fully visible'
      },
      {
        id: 'explore-widget',
        description: 'Click on a dashboard widget',
        action: { type: 'click', target: '[data-testid="productivity-widget"]' },
        expectedOutcome: 'Widget expands or shows detailed view'
      },
      {
        id: 'access-help',
        description: 'Access help documentation',
        action: { type: 'click', target: '[data-testid="help-button"]' },
        expectedOutcome: 'Help panel or documentation opens'
      }
    ]
  },
  {
    id: 'daily-productivity-check',
    name: 'Daily Productivity Check',
    description: 'Experienced user quickly reviews daily metrics',
    persona: userPersonas[1], // Experienced developer
    expectedDuration: 60, // 1 minute
    successCriteria: {
      taskCompletionRate: 95,
      maxTaskTime: 90,
      maxErrors: 1,
      minSatisfactionScore: 4.5
    },
    steps: [
      {
        id: 'quick-login',
        description: 'Navigate to dashboard',
        action: { type: 'navigate', target: 'http://localhost:3000' },
        expectedOutcome: 'Dashboard loads quickly'
      },
      {
        id: 'keyboard-shortcut',
        description: 'Use keyboard shortcut to open command palette',
        action: { type: 'click', target: 'body' },
        expectedOutcome: 'Command palette opens'
      },
      {
        id: 'search-metrics',
        description: 'Search for today\'s metrics',
        action: { type: 'type', target: '[data-testid="command-input"]', value: 'today metrics' },
        expectedOutcome: 'Relevant metrics appear in search results'
      },
      {
        id: 'view-metrics',
        description: 'Select metrics from search',
        action: { type: 'click', target: '[data-testid="metrics-result"]' },
        expectedOutcome: 'Today\'s metrics are displayed'
      },
      {
        id: 'customize-view',
        description: 'Customize the metrics view',
        action: { type: 'click', target: '[data-testid="customize-button"]' },
        expectedOutcome: 'Customization options appear'
      }
    ]
  },
  {
    id: 'team-performance-analysis',
    name: 'Team Performance Analysis',
    description: 'Team lead analyzes team performance and generates report',
    persona: userPersonas[2], // Team lead
    expectedDuration: 300, // 5 minutes
    successCriteria: {
      taskCompletionRate: 85,
      maxTaskTime: 420,
      maxErrors: 3,
      minSatisfactionScore: 4
    },
    steps: [
      {
        id: 'navigate-analytics',
        description: 'Navigate to analytics page',
        action: { type: 'navigate', target: 'http://localhost:3000/analytics' },
        expectedOutcome: 'Analytics page loads with team data'
      },
      {
        id: 'select-time-range',
        description: 'Select last 30 days time range',
        action: { type: 'click', target: '[data-testid="time-range-selector"]' },
        expectedOutcome: 'Time range dropdown opens'
      },
      {
        id: 'apply-time-range',
        description: 'Apply 30-day time range',
        action: { type: 'click', target: '[data-testid="30-days-option"]' },
        expectedOutcome: 'Data updates to show last 30 days'
      },
      {
        id: 'filter-team',
        description: 'Filter by specific team',
        action: { type: 'click', target: '[data-testid="team-filter"]' },
        expectedOutcome: 'Team filter options appear'
      },
      {
        id: 'select-team',
        description: 'Select development team',
        action: { type: 'click', target: '[data-testid="dev-team-option"]' },
        expectedOutcome: 'Data filters to show only dev team metrics'
      },
      {
        id: 'analyze-trends',
        description: 'Click on productivity trend chart',
        action: { type: 'click', target: '[data-testid="trend-chart"]' },
        expectedOutcome: 'Detailed trend analysis appears'
      },
      {
        id: 'export-report',
        description: 'Export report for stakeholders',
        action: { type: 'click', target: '[data-testid="export-button"]' },
        expectedOutcome: 'Export options appear'
      },
      {
        id: 'generate-pdf',
        description: 'Generate PDF report',
        action: { type: 'click', target: '[data-testid="pdf-export"]' },
        expectedOutcome: 'PDF report is generated and downloaded'
      }
    ]
  },
  {
    id: 'mobile-quick-check',
    name: 'Mobile Quick Check',
    description: 'User checks key metrics on mobile device',
    persona: userPersonas[1], // Experienced developer
    expectedDuration: 45, // 45 seconds
    successCriteria: {
      taskCompletionRate: 90,
      maxTaskTime: 75,
      maxErrors: 1,
      minSatisfactionScore: 4
    },
    steps: [
      {
        id: 'mobile-navigate',
        description: 'Navigate to mobile dashboard',
        action: { type: 'navigate', target: 'http://localhost:3000?viewport=mobile' },
        expectedOutcome: 'Mobile-optimized dashboard loads'
      },
      {
        id: 'swipe-widgets',
        description: 'Swipe through widget carousel',
        action: { type: 'click', target: '[data-testid="widget-carousel-next"]' },
        expectedOutcome: 'Next widget slides into view'
      },
      {
        id: 'tap-notification',
        description: 'Tap on notification badge',
        action: { type: 'click', target: '[data-testid="notification-badge"]' },
        expectedOutcome: 'Notification panel opens'
      },
      {
        id: 'dismiss-notification',
        description: 'Dismiss notification',
        action: { type: 'click', target: '[data-testid="dismiss-notification"]' },
        expectedOutcome: 'Notification is dismissed'
      }
    ]
  },
  {
    id: 'accessibility-navigation',
    name: 'Keyboard-only Navigation',
    description: 'User navigates entire dashboard using only keyboard',
    persona: userPersonas[0], // Novice developer (representing accessibility needs)
    expectedDuration: 240, // 4 minutes
    successCriteria: {
      taskCompletionRate: 95,
      maxTaskTime: 360,
      maxErrors: 2,
      minSatisfactionScore: 4
    },
    steps: [
      {
        id: 'keyboard-landing',
        description: 'Navigate to dashboard',
        action: { type: 'navigate', target: 'http://localhost:3000' },
        expectedOutcome: 'Dashboard loads with focus on skip link'
      },
      {
        id: 'tab-navigation',
        description: 'Tab through main navigation',
        action: { type: 'click', target: 'body' }, // Simulate tab key
        expectedOutcome: 'Focus moves through navigation items'
      },
      {
        id: 'activate-menu',
        description: 'Activate menu item with Enter',
        action: { type: 'click', target: '[data-testid="analytics-nav"]' },
        expectedOutcome: 'Analytics page loads'
      },
      {
        id: 'skip-to-content',
        description: 'Use skip to content link',
        action: { type: 'click', target: '[data-testid="skip-to-content"]' },
        expectedOutcome: 'Focus moves to main content area'
      },
      {
        id: 'keyboard-chart-interaction',
        description: 'Interact with chart using keyboard',
        action: { type: 'click', target: '[data-testid="chart-container"]' },
        expectedOutcome: 'Chart becomes keyboard accessible'
      }
    ]
  },
  {
    id: 'error-recovery',
    name: 'Error Recovery Journey',
    description: 'User encounters and recovers from various error states',
    persona: userPersonas[2], // Team lead
    expectedDuration: 120, // 2 minutes
    successCriteria: {
      taskCompletionRate: 80,
      maxTaskTime: 180,
      maxErrors: 5, // Errors are expected in this journey
      minSatisfactionScore: 3.5
    },
    steps: [
      {
        id: 'trigger-network-error',
        description: 'Navigate to page that triggers network error',
        action: { type: 'navigate', target: 'http://localhost:3000/demo?error=network' },
        expectedOutcome: 'Network error message appears'
      },
      {
        id: 'retry-action',
        description: 'Click retry button',
        action: { type: 'click', target: '[data-testid="retry-button"]' },
        expectedOutcome: 'System attempts to retry the failed action'
      },
      {
        id: 'form-validation-error',
        description: 'Submit form with invalid data',
        action: { type: 'navigate', target: 'http://localhost:3000/demo/forms?invalid=true' },
        expectedOutcome: 'Form validation errors appear'
      },
      {
        id: 'fix-validation-error',
        description: 'Correct the form data',
        action: { type: 'type', target: '[data-testid="email-input"]', value: 'valid@email.com' },
        expectedOutcome: 'Validation error clears'
      },
      {
        id: 'successful-submission',
        description: 'Submit corrected form',
        action: { type: 'click', target: '[data-testid="submit-button"]' },
        expectedOutcome: 'Form submits successfully'
      }
    ]
  }
];

export const criticalUserJourneys = userJourneys.filter(journey =>
  ['first-time-user-onboarding', 'daily-productivity-check'].includes(journey.id)
);