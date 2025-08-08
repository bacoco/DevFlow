import { feedbackCollectionService } from './FeedbackCollectionService'
import { userBehaviorAnalyticsService } from './UserBehaviorAnalyticsService'
import { continuousUXMonitoringService } from './ContinuousUXMonitoringService'
import { satisfactionTrackingService } from './SatisfactionTrackingService'
import {
  FeedbackWidget,
  FeedbackSystemConfig,
  UXDashboardData,
  UserContext,
  BehaviorEventType,
  NPSResponse,
  CSATResponse
} from './types'

/**
 * Main feedback system that coordinates all feedback and analytics services
 */
export class FeedbackSystem {
  private config: FeedbackSystemConfig
  private initialized = false

  constructor() {
    this.config = {
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
            type: 'email',
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
        frequency: 'hourly'
      },
      privacy: {
        consentRequired: true,
        dataRetentionDays: 365,
        allowOptOut: true,
        anonymizeAfterDays: 30,
        excludeFields: ['email', 'ip']
      }
    }
  }

  /**
   * Initialize the feedback system
   */
  async initialize(userContext?: UserContext): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      // Set user context if provided
      if (userContext) {
        feedbackCollectionService.setUserContext(userContext)
      }

      // Load configuration
      await this.loadConfiguration()

      // Initialize default widgets if none exist
      if (this.config.widgets.length === 0) {
        this.setupDefaultWidgets()
      }

      // Register widgets
      this.config.widgets.forEach(widget => {
        feedbackCollectionService.registerWidget(widget)
      })

      // Configure monitoring
      continuousUXMonitoringService.updateAlertConfig(this.config.alerts)

      // Start tracking
      this.startTracking()

      this.initialized = true
      console.log('Feedback system initialized successfully')
    } catch (error) {
      console.error('Failed to initialize feedback system:', error)
      throw error
    }
  }

  /**
   * Update system configuration
   */
  updateConfiguration(config: Partial<FeedbackSystemConfig>): void {
    this.config = { ...this.config, ...config }
    
    // Update monitoring configuration
    if (config.alerts) {
      continuousUXMonitoringService.updateAlertConfig(config.alerts)
    }

    // Update widgets
    if (config.widgets) {
      // Remove old widgets
      config.widgets.forEach(widget => {
        feedbackCollectionService.unregisterWidget(widget.id)
      })
      
      // Register new widgets
      config.widgets.forEach(widget => {
        feedbackCollectionService.registerWidget(widget)
      })
    }

    this.saveConfiguration()
  }

  /**
   * Track user behavior event
   */
  trackEvent(type: BehaviorEventType, element: string, metadata: Record<string, any> = {}): void {
    if (!this.config.enabled || !this.config.analytics.trackingEnabled) {
      return
    }

    // Apply sampling rate
    if (Math.random() > this.config.analytics.samplingRate) {
      return
    }

    feedbackCollectionService.trackBehaviorEvent(type, element, metadata)
  }

  /**
   * Show a specific feedback widget
   */
  showFeedbackWidget(widgetId: string): void {
    if (!this.config.enabled) {
      return
    }

    feedbackCollectionService.showWidget(widgetId)
  }

  /**
   * Submit feedback response
   */
  async submitFeedback(widgetId: string, responses: Record<string, any>): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Feedback system is disabled')
    }

    await feedbackCollectionService.submitFeedback(widgetId, responses)
  }

  /**
   * Record NPS response
   */
  recordNPS(score: number, comment?: string, context: string = 'general'): NPSResponse {
    return satisfactionTrackingService.recordNPSResponse({
      score,
      comment,
      context
    })
  }

  /**
   * Record CSAT response
   */
  recordCSAT(score: number, feature: string, comment?: string): CSATResponse {
    return satisfactionTrackingService.recordCSATResponse({
      score,
      feature,
      comment
    })
  }

  /**
   * Get comprehensive UX dashboard data
   */
  async getUXDashboardData(timeRange?: { start: Date; end: Date }): Promise<UXDashboardData> {
    const range = timeRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end: new Date()
    }

    return await userBehaviorAnalyticsService.getDashboardData(range)
  }

  /**
   * Get satisfaction metrics and insights
   */
  getSatisfactionReport(timeRange?: { start: Date; end: Date }) {
    const range = timeRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end: new Date()
    }

    return satisfactionTrackingService.generateSatisfactionReport(range)
  }

  /**
   * Get active UX alerts
   */
  getActiveAlerts() {
    return continuousUXMonitoringService.getActiveAlerts()
  }

  /**
   * Get monitoring health status
   */
  getMonitoringHealth() {
    return continuousUXMonitoringService.getMonitoringHealth()
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): void {
    continuousUXMonitoringService.acknowledgeAlert(alertId, acknowledgedBy)
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, resolvedBy: string, resolution: string): void {
    continuousUXMonitoringService.resolveAlert(alertId, resolvedBy, resolution)
  }

  /**
   * Get contextual feedback suggestions
   */
  getContextualSuggestions(): FeedbackWidget[] {
    return feedbackCollectionService.getContextualSuggestions()
  }

  /**
   * Generate comprehensive analytics report
   */
  async generateAnalyticsReport(timeRange: { start: Date; end: Date }) {
    const [dashboardData, satisfactionReport, monitoringReport] = await Promise.all([
      this.getUXDashboardData(timeRange),
      this.getSatisfactionReport(timeRange),
      continuousUXMonitoringService.generateMonitoringReport(timeRange)
    ])

    return {
      period: timeRange,
      overview: dashboardData.overview,
      satisfaction: satisfactionReport,
      usability: {
        metrics: dashboardData.usabilityMetrics,
        alerts: monitoringReport.summary,
        recommendations: monitoringReport.recommendations
      },
      features: {
        usage: dashboardData.featureUsage,
        adoption: this.calculateFeatureAdoption(dashboardData.featureUsage)
      },
      trends: dashboardData.trends,
      actionItems: this.generateActionItems(dashboardData, satisfactionReport, monitoringReport)
    }
  }

  /**
   * Export feedback data for analysis
   */
  async exportFeedbackData(timeRange: { start: Date; end: Date }, format: 'json' | 'csv' = 'json') {
    const data = await this.getUXDashboardData(timeRange)
    
    if (format === 'csv') {
      return this.convertToCSV(data)
    }
    
    return JSON.stringify(data, null, 2)
  }

  /**
   * Check user consent for data collection
   */
  hasUserConsent(): boolean {
    if (!this.config.privacy.consentRequired) {
      return true
    }

    return localStorage.getItem('feedback-consent') === 'granted'
  }

  /**
   * Set user consent for data collection
   */
  setUserConsent(granted: boolean): void {
    localStorage.setItem('feedback-consent', granted ? 'granted' : 'denied')
    
    if (!granted && this.config.privacy.allowOptOut) {
      this.config.enabled = false
      this.stopTracking()
    }
  }

  /**
   * Clean up old data based on retention policy
   */
  async cleanupOldData(): Promise<void> {
    const retentionDate = new Date(Date.now() - this.config.privacy.dataRetentionDays * 24 * 60 * 60 * 1000)
    
    // This would clean up stored data older than retention period
    console.log(`Cleaning up data older than ${retentionDate.toISOString()}`)
    
    // Implementation would depend on storage mechanism
    // For now, just log the action
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const stored = localStorage.getItem('feedback-system-config')
      if (stored) {
        const storedConfig = JSON.parse(stored)
        this.config = { ...this.config, ...storedConfig }
      }
    } catch (error) {
      console.error('Error loading feedback system configuration:', error)
    }
  }

  private saveConfiguration(): void {
    try {
      localStorage.setItem('feedback-system-config', JSON.stringify(this.config))
    } catch (error) {
      console.error('Error saving feedback system configuration:', error)
    }
  }

  private setupDefaultWidgets(): void {
    const defaultWidgets: FeedbackWidget[] = [
      {
        id: 'nps-survey',
        type: 'nps',
        position: 'bottom-right',
        trigger: {
          type: 'time-based',
          conditions: [],
          frequency: 'monthly',
          delay: 30000
        },
        content: {
          title: 'How likely are you to recommend our dashboard?',
          description: 'Help us improve by sharing your experience',
          questions: [
            {
              id: 'nps-score',
              type: 'nps',
              question: 'On a scale of 0-10, how likely are you to recommend this dashboard to a colleague?',
              required: true,
              scale: { min: 0, max: 10 }
            },
            {
              id: 'nps-comment',
              type: 'text',
              question: 'What is the primary reason for your score?',
              required: false
            }
          ],
          thankYouMessage: 'Thank you for your feedback!',
          customization: {
            theme: 'auto',
            primaryColor: '#007bff',
            borderRadius: 8,
            animation: true,
            showBranding: false
          }
        },
        targeting: {
          userSegments: ['experienced-user'],
          pages: [],
          features: [],
          excludeUsers: [],
          percentage: 20
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'feature-csat',
        type: 'csat',
        position: 'modal',
        trigger: {
          type: 'action-based',
          conditions: [
            {
              type: 'feature-usage',
              value: 'chart-export',
              operator: 'equals'
            }
          ],
          frequency: 'weekly'
        },
        content: {
          title: 'How was your experience?',
          description: 'Rate your experience with this feature',
          questions: [
            {
              id: 'csat-score',
              type: 'csat',
              question: 'How satisfied are you with this feature?',
              required: true,
              scale: { min: 1, max: 5, labels: { 1: 'Very Dissatisfied', 5: 'Very Satisfied' } }
            },
            {
              id: 'csat-comment',
              type: 'text',
              question: 'Any suggestions for improvement?',
              required: false
            }
          ],
          thankYouMessage: 'Thanks for helping us improve!',
          customization: {
            theme: 'auto',
            primaryColor: '#28a745',
            borderRadius: 8,
            animation: true,
            showBranding: false
          }
        },
        targeting: {
          userSegments: [],
          pages: [],
          features: ['chart-export'],
          excludeUsers: [],
          percentage: 50
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    this.config.widgets = defaultWidgets
  }

  private startTracking(): void {
    if (!this.hasUserConsent()) {
      console.log('User consent not granted, tracking disabled')
      return
    }

    // Track page views automatically
    this.trackEvent('page-view', window.location.pathname)

    // Set up automatic event tracking
    this.setupAutomaticTracking()
  }

  private stopTracking(): void {
    // Remove event listeners and stop tracking
    console.log('Feedback tracking stopped')
  }

  private setupAutomaticTracking(): void {
    // Track feature usage
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      const featureId = target.getAttribute('data-feature-id')
      
      if (featureId) {
        this.trackEvent('feature-discovery', featureId)
      }
    })

    // Track errors
    window.addEventListener('error', (event) => {
      this.trackEvent('error', 'javascript-error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno
      })
    })

    // Track task completions
    document.addEventListener('task-completed', (event: any) => {
      this.trackEvent('task-completion', event.detail.taskId, {
        duration: event.detail.duration,
        success: event.detail.success
      })
    })
  }

  private calculateFeatureAdoption(featureUsage: any[]) {
    return featureUsage.map(feature => ({
      ...feature,
      adoptionTrend: feature.adoptionRate > 50 ? 'high' : feature.adoptionRate > 20 ? 'medium' : 'low'
    }))
  }

  private generateActionItems(dashboardData: any, satisfactionReport: any, monitoringReport: any): string[] {
    const actionItems: string[] = []

    // Add satisfaction-based actions
    actionItems.push(...satisfactionReport.action_items)

    // Add monitoring-based actions
    actionItems.push(...monitoringReport.recommendations)

    // Add feature usage actions
    const lowAdoptionFeatures = dashboardData.featureUsage
      .filter((f: any) => f.adoptionRate < 20)
      .slice(0, 3)
    
    lowAdoptionFeatures.forEach((feature: any) => {
      actionItems.push(`Improve discoverability and onboarding for ${feature.featureName}`)
    })

    return actionItems.slice(0, 15) // Limit to top 15 action items
  }

  private convertToCSV(data: any): string {
    // Simplified CSV conversion - would be more comprehensive in production
    const headers = ['Metric', 'Value', 'Status', 'Timestamp']
    const rows = data.usabilityMetrics.map((metric: any) => [
      metric.type,
      metric.value,
      metric.status,
      metric.timestamp
    ])

    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }
}

// Singleton instance
export const feedbackSystem = new FeedbackSystem()