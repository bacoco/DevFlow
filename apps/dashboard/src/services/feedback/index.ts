/**
 * User Feedback and Continuous Improvement System
 * 
 * This module provides comprehensive user feedback collection, behavior analytics,
 * continuous UX monitoring, and satisfaction tracking capabilities.
 */

// Main system
export { feedbackSystem, FeedbackSystem } from './FeedbackSystem'

// Core services
export { feedbackCollectionService, FeedbackCollectionService } from './FeedbackCollectionService'
export { userBehaviorAnalyticsService, UserBehaviorAnalyticsService } from './UserBehaviorAnalyticsService'
export { continuousUXMonitoringService, ContinuousUXMonitoringService } from './ContinuousUXMonitoringService'
export { satisfactionTrackingService, SatisfactionTrackingService } from './SatisfactionTrackingService'

// Types
export * from './types'

// React components
export { FeedbackWidget } from '../../components/Feedback/FeedbackWidget'
export { FeedbackWidgetManager } from '../../components/Feedback/FeedbackWidgetManager'
export { UXDashboard } from '../../components/Feedback/UXDashboard'

/**
 * Quick start guide:
 * 
 * 1. Initialize the feedback system:
 *    ```typescript
 *    import { feedbackSystem } from './services/feedback'
 *    
 *    await feedbackSystem.initialize({
 *      role: 'developer',
 *      tenure: 30,
 *      featureUsage: { dashboard: 10 },
 *      lastActivity: new Date(),
 *      preferences: {}
 *    })
 *    ```
 * 
 * 2. Track user behavior:
 *    ```typescript
 *    feedbackSystem.trackEvent('click', 'export-button')
 *    feedbackSystem.trackEvent('feature-discovery', 'charts')
 *    ```
 * 
 * 3. Collect satisfaction data:
 *    ```typescript
 *    feedbackSystem.recordNPS(9, 'Great product!')
 *    feedbackSystem.recordCSAT(4, 'dashboard', 'Easy to use')
 *    ```
 * 
 * 4. Get analytics data:
 *    ```typescript
 *    const dashboardData = await feedbackSystem.getUXDashboardData(timeRange)
 *    const satisfactionReport = feedbackSystem.getSatisfactionReport(timeRange)
 *    ```
 * 
 * 5. Add feedback widgets to your React app:
 *    ```tsx
 *    import { FeedbackWidgetManager } from './services/feedback'
 *    
 *    function App() {
 *      return (
 *        <div>
 *          <YourAppContent />
 *          <FeedbackWidgetManager />
 *        </div>
 *      )
 *    }
 *    ```
 * 
 * 6. Display UX dashboard:
 *    ```tsx
 *    import { UXDashboard } from './services/feedback'
 *    
 *    function AnalyticsPage() {
 *      return <UXDashboard />
 *    }
 *    ```
 */

// Default configuration for easy setup
export const defaultFeedbackConfig = {
  enabled: true,
  widgets: [],
  analytics: {
    trackingEnabled: true,
    retentionDays: 90,
    samplingRate: 1.0,
    excludeInternalUsers: true,
    anonymizeData: true
  },
  alerts: {
    enabled: true,
    channels: [
      {
        type: 'email' as const,
        config: { recipients: ['ux-team@company.com'] },
        enabled: true
      }
    ],
    thresholds: {
      'task-completion-rate': 85,
      'error-rate': 5,
      'bounce-rate': 70,
      'user-satisfaction': 3.5
    },
    frequency: 'hourly' as const
  },
  privacy: {
    consentRequired: true,
    dataRetentionDays: 365,
    allowOptOut: true,
    anonymizeAfterDays: 30,
    excludeFields: ['email', 'ip']
  }
}

// Utility functions for common use cases
export const feedbackUtils = {
  /**
   * Initialize feedback system with default configuration
   */
  async quickStart(userContext?: any) {
    await feedbackSystem.initialize(userContext)
    return feedbackSystem
  },

  /**
   * Create a simple NPS widget
   */
  createNPSWidget(options: {
    trigger?: 'time' | 'page' | 'feature'
    delay?: number
    pages?: string[]
    userSegments?: string[]
  } = {}) {
    return {
      id: 'nps-widget-' + Date.now(),
      type: 'nps' as const,
      position: 'bottom-right' as const,
      trigger: {
        type: options.trigger === 'time' ? 'time-based' : 
              options.trigger === 'page' ? 'page-based' : 'action-based',
        conditions: options.pages ? options.pages.map(page => ({
          type: 'page-visit' as const,
          value: page,
          operator: 'equals' as const
        })) : [],
        frequency: 'monthly' as const,
        delay: options.delay || 30000
      },
      content: {
        title: 'How likely are you to recommend our dashboard?',
        description: 'Help us improve by sharing your experience',
        questions: [
          {
            id: 'nps-score',
            type: 'nps' as const,
            question: 'On a scale of 0-10, how likely are you to recommend this dashboard?',
            required: true,
            scale: { min: 0, max: 10 }
          },
          {
            id: 'nps-comment',
            type: 'text' as const,
            question: 'What is the primary reason for your score?',
            required: false
          }
        ],
        thankYouMessage: 'Thank you for your feedback!',
        customization: {
          theme: 'auto' as const,
          primaryColor: '#007bff',
          borderRadius: 8,
          animation: true,
          showBranding: false
        }
      },
      targeting: {
        userSegments: options.userSegments || [],
        pages: options.pages || [],
        features: [],
        excludeUsers: [],
        percentage: 20
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  },

  /**
   * Create a simple CSAT widget
   */
  createCSATWidget(feature: string, options: {
    trigger?: 'feature' | 'page' | 'time'
    delay?: number
  } = {}) {
    return {
      id: 'csat-widget-' + Date.now(),
      type: 'csat' as const,
      position: 'modal' as const,
      trigger: {
        type: options.trigger === 'feature' ? 'action-based' : 
              options.trigger === 'page' ? 'page-based' : 'time-based',
        conditions: options.trigger === 'feature' ? [{
          type: 'feature-usage' as const,
          value: feature,
          operator: 'equals' as const
        }] : [],
        frequency: 'weekly' as const,
        delay: options.delay || 5000
      },
      content: {
        title: 'How was your experience?',
        description: `Rate your experience with ${feature}`,
        questions: [
          {
            id: 'csat-score',
            type: 'csat' as const,
            question: 'How satisfied are you with this feature?',
            required: true,
            scale: { min: 1, max: 5 }
          },
          {
            id: 'csat-comment',
            type: 'text' as const,
            question: 'Any suggestions for improvement?',
            required: false
          }
        ],
        thankYouMessage: 'Thanks for helping us improve!',
        customization: {
          theme: 'auto' as const,
          primaryColor: '#28a745',
          borderRadius: 8,
          animation: true,
          showBranding: false
        }
      },
      targeting: {
        userSegments: [],
        pages: [],
        features: [feature],
        excludeUsers: [],
        percentage: 50
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  },

  /**
   * Get quick insights from recent data
   */
  async getQuickInsights(days: number = 7) {
    const timeRange = {
      start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      end: new Date()
    }

    const [dashboardData, satisfactionReport] = await Promise.all([
      feedbackSystem.getUXDashboardData(timeRange),
      feedbackSystem.getSatisfactionReport(timeRange)
    ])

    return {
      summary: {
        totalUsers: dashboardData.overview.totalUsers,
        satisfactionScore: dashboardData.overview.satisfactionScore,
        npsScore: satisfactionReport.metrics.nps.score,
        csatScore: satisfactionReport.metrics.csat.averageScore,
        errorRate: dashboardData.overview.errorRate,
        activeAlerts: dashboardData.alerts.length
      },
      topIssues: satisfactionReport.insights.keyFindings.csatIssues.slice(0, 3),
      recommendations: satisfactionReport.insights.recommendations.slice(0, 5),
      trends: dashboardData.trends.slice(0, 5)
    }
  }
}