import { ABTest } from './ABTestingFramework';

export const abTestConfigs: Omit<ABTest, 'status'>[] = [
  {
    id: 'dashboard-layout-test',
    name: 'Dashboard Layout Optimization',
    description: 'Test different dashboard layouts for improved user engagement',
    variants: [
      {
        id: 'control',
        name: 'Current Layout',
        description: 'Existing dashboard layout',
        weight: 50,
        isControl: true,
        config: {
          layout: 'current',
          widgetSpacing: 'normal',
          sidebarPosition: 'left'
        }
      },
      {
        id: 'compact',
        name: 'Compact Layout',
        description: 'More compact layout with reduced spacing',
        weight: 50,
        isControl: false,
        config: {
          layout: 'compact',
          widgetSpacing: 'tight',
          sidebarPosition: 'left'
        }
      }
    ],
    trafficAllocation: {
      percentage: 20, // 20% of users
      method: 'deterministic',
      seed: 'dashboard-layout-2024'
    },
    targetingRules: [
      {
        id: 'active-users',
        type: 'user_property',
        property: 'loginCount',
        operator: 'greater_than',
        value: 5
      }
    ],
    metrics: [
      {
        id: 'engagement-rate',
        name: 'Dashboard Engagement Rate',
        type: 'conversion',
        eventName: 'dashboard_interaction',
        isPrimary: true
      },
      {
        id: 'time-on-dashboard',
        name: 'Time Spent on Dashboard',
        type: 'duration',
        eventName: 'dashboard_session',
        aggregation: 'average',
        isPrimary: false
      },
      {
        id: 'widget-clicks',
        name: 'Widget Click Rate',
        type: 'count',
        eventName: 'widget_click',
        aggregation: 'sum',
        isPrimary: false
      }
    ],
    startDate: new Date(),
    sampleSize: 1000,
    confidenceLevel: 95
  },
  {
    id: 'onboarding-flow-test',
    name: 'Onboarding Flow Optimization',
    description: 'Test different onboarding approaches for new users',
    variants: [
      {
        id: 'control',
        name: 'Standard Tour',
        description: 'Current product tour approach',
        weight: 33.33,
        isControl: true,
        config: {
          tourType: 'standard',
          stepCount: 8,
          skipOption: true
        }
      },
      {
        id: 'interactive',
        name: 'Interactive Tutorial',
        description: 'Hands-on interactive tutorial',
        weight: 33.33,
        isControl: false,
        config: {
          tourType: 'interactive',
          stepCount: 5,
          skipOption: false
        }
      },
      {
        id: 'progressive',
        name: 'Progressive Disclosure',
        description: 'Gradual feature introduction over time',
        weight: 33.34,
        isControl: false,
        config: {
          tourType: 'progressive',
          stepCount: 12,
          skipOption: true,
          triggerDelay: 24 // hours
        }
      }
    ],
    trafficAllocation: {
      percentage: 100, // All new users
      method: 'random'
    },
    targetingRules: [
      {
        id: 'new-users',
        type: 'user_property',
        property: 'isNewUser',
        operator: 'equals',
        value: true
      }
    ],
    metrics: [
      {
        id: 'onboarding-completion',
        name: 'Onboarding Completion Rate',
        type: 'conversion',
        eventName: 'onboarding_completed',
        isPrimary: true
      },
      {
        id: 'feature-adoption',
        name: 'Feature Adoption Rate',
        type: 'conversion',
        eventName: 'feature_first_use',
        isPrimary: false
      },
      {
        id: 'user-retention',
        name: '7-Day User Retention',
        type: 'conversion',
        eventName: 'user_return_7d',
        isPrimary: false
      }
    ],
    startDate: new Date(),
    sampleSize: 500,
    confidenceLevel: 95
  },
  {
    id: 'chart-interaction-test',
    name: 'Chart Interaction Methods',
    description: 'Test different ways users can interact with charts',
    variants: [
      {
        id: 'control',
        name: 'Hover Tooltips',
        description: 'Traditional hover-based tooltips',
        weight: 50,
        isControl: true,
        config: {
          interactionType: 'hover',
          tooltipDelay: 300,
          clickToPin: false
        }
      },
      {
        id: 'click-tooltips',
        name: 'Click-based Tooltips',
        description: 'Click to show/hide tooltips',
        weight: 50,
        isControl: false,
        config: {
          interactionType: 'click',
          tooltipDelay: 0,
          clickToPin: true
        }
      }
    ],
    trafficAllocation: {
      percentage: 30,
      method: 'deterministic',
      seed: 'chart-interaction-2024'
    },
    targetingRules: [
      {
        id: 'chart-users',
        type: 'session_property',
        property: 'hasViewedCharts',
        operator: 'equals',
        value: true
      }
    ],
    metrics: [
      {
        id: 'chart-engagement',
        name: 'Chart Engagement Rate',
        type: 'conversion',
        eventName: 'chart_tooltip_viewed',
        isPrimary: true
      },
      {
        id: 'chart-exploration',
        name: 'Chart Data Points Explored',
        type: 'count',
        eventName: 'chart_datapoint_interaction',
        aggregation: 'average',
        isPrimary: false
      }
    ],
    startDate: new Date(),
    sampleSize: 800,
    confidenceLevel: 90
  },
  {
    id: 'notification-frequency-test',
    name: 'Notification Frequency Optimization',
    description: 'Test optimal notification frequency to maximize engagement without fatigue',
    variants: [
      {
        id: 'control',
        name: 'Current Frequency',
        description: 'Current notification settings',
        weight: 25,
        isControl: true,
        config: {
          dailyLimit: 5,
          batchingEnabled: false,
          quietHours: { start: 22, end: 8 }
        }
      },
      {
        id: 'reduced',
        name: 'Reduced Frequency',
        description: 'Fewer but more important notifications',
        weight: 25,
        isControl: false,
        config: {
          dailyLimit: 3,
          batchingEnabled: true,
          quietHours: { start: 20, end: 9 }
        }
      },
      {
        id: 'intelligent',
        name: 'Intelligent Timing',
        description: 'AI-optimized notification timing',
        weight: 25,
        isControl: false,
        config: {
          dailyLimit: 4,
          batchingEnabled: true,
          intelligentTiming: true,
          quietHours: { start: 22, end: 8 }
        }
      },
      {
        id: 'user-controlled',
        name: 'User-Controlled',
        description: 'Enhanced user control over notifications',
        weight: 25,
        isControl: false,
        config: {
          dailyLimit: 10,
          batchingEnabled: true,
          granularControls: true,
          quietHours: { start: 22, end: 8 }
        }
      }
    ],
    trafficAllocation: {
      percentage: 40,
      method: 'random'
    },
    targetingRules: [
      {
        id: 'notification-users',
        type: 'user_property',
        property: 'notificationsEnabled',
        operator: 'equals',
        value: true
      }
    ],
    metrics: [
      {
        id: 'notification-engagement',
        name: 'Notification Click Rate',
        type: 'conversion',
        eventName: 'notification_clicked',
        isPrimary: true
      },
      {
        id: 'notification-dismissal',
        name: 'Notification Dismissal Rate',
        type: 'conversion',
        eventName: 'notification_dismissed',
        isPrimary: false
      },
      {
        id: 'user-satisfaction',
        name: 'User Satisfaction Score',
        type: 'numeric',
        eventName: 'satisfaction_survey',
        aggregation: 'average',
        isPrimary: false
      }
    ],
    startDate: new Date(),
    sampleSize: 1200,
    confidenceLevel: 95
  },
  {
    id: 'mobile-navigation-test',
    name: 'Mobile Navigation Pattern',
    description: 'Test different mobile navigation patterns for better usability',
    variants: [
      {
        id: 'control',
        name: 'Bottom Tab Bar',
        description: 'Current bottom tab navigation',
        weight: 50,
        isControl: true,
        config: {
          navigationType: 'bottom-tabs',
          tabCount: 5,
          hamburgerMenu: false
        }
      },
      {
        id: 'hamburger',
        name: 'Hamburger Menu',
        description: 'Collapsible hamburger menu',
        weight: 50,
        isControl: false,
        config: {
          navigationType: 'hamburger',
          tabCount: 0,
          hamburgerMenu: true,
          swipeGestures: true
        }
      }
    ],
    trafficAllocation: {
      percentage: 60,
      method: 'deterministic',
      seed: 'mobile-nav-2024'
    },
    targetingRules: [
      {
        id: 'mobile-users',
        type: 'session_property',
        property: 'deviceType',
        operator: 'equals',
        value: 'mobile'
      }
    ],
    metrics: [
      {
        id: 'navigation-success',
        name: 'Navigation Success Rate',
        type: 'conversion',
        eventName: 'navigation_completed',
        isPrimary: true
      },
      {
        id: 'navigation-time',
        name: 'Time to Navigate',
        type: 'duration',
        eventName: 'navigation_duration',
        aggregation: 'average',
        isPrimary: false
      },
      {
        id: 'menu-discovery',
        name: 'Menu Item Discovery Rate',
        type: 'conversion',
        eventName: 'menu_item_found',
        isPrimary: false
      }
    ],
    startDate: new Date(),
    sampleSize: 600,
    confidenceLevel: 90
  }
];

export const criticalABTests = abTestConfigs.filter(test =>
  ['onboarding-flow-test', 'dashboard-layout-test'].includes(test.id)
);

export const designVariationTests = abTestConfigs.filter(test =>
  ['dashboard-layout-test', 'chart-interaction-test', 'mobile-navigation-test'].includes(test.id)
);