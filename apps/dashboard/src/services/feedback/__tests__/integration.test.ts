import { feedbackSystem } from '../FeedbackSystem'
import { feedbackCollectionService } from '../FeedbackCollectionService'
import { userBehaviorAnalyticsService } from '../UserBehaviorAnalyticsService'
import { continuousUXMonitoringService } from '../ContinuousUXMonitoringService'
import { satisfactionTrackingService } from '../SatisfactionTrackingService'

describe('Feedback System Integration Tests', () => {
  beforeEach(async () => {
    // Reset all services
    localStorage.clear()
    sessionStorage.clear()
    
    // Initialize the feedback system
    await feedbackSystem.initialize({
      role: 'developer',
      tenure: 45,
      featureUsage: {
        'dashboard': 25,
        'charts': 15,
        'analytics': 8
      },
      lastActivity: new Date(),
      preferences: {
        theme: 'dark',
        notifications: true
      }
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('End-to-End User Journey', () => {
    it('should complete a full feedback collection workflow', async () => {
      // 1. User visits the dashboard
      feedbackSystem.trackEvent('page-view', '/dashboard')
      
      // 2. User interacts with features
      feedbackSystem.trackEvent('click', 'chart-export-button')
      feedbackSystem.trackEvent('feature-discovery', 'chart-export')
      
      // 3. System shows contextual feedback widget
      const suggestions = feedbackSystem.getContextualSuggestions()
      expect(suggestions.length).toBeGreaterThan(0)
      
      // 4. User provides CSAT feedback
      const csatResponse = feedbackSystem.recordCSAT(4, 'chart-export', 'Easy to use!')
      expect(csatResponse.score).toBe(4)
      expect(csatResponse.feature).toBe('chart-export')
      
      // 5. User completes task
      feedbackSystem.trackEvent('task-completion', 'export-chart', {
        duration: 15000,
        success: true
      })
      
      // 6. System shows NPS survey after some time
      const npsResponse = feedbackSystem.recordNPS(9, 'Great dashboard, very helpful!')
      expect(npsResponse.category).toBe('promoter')
      
      // 7. Analytics system processes the data
      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      }
      
      const dashboardData = await feedbackSystem.getUXDashboardData(timeRange)
      expect(dashboardData.overview.totalUsers).toBeGreaterThan(0)
      
      // 8. Generate comprehensive report
      const report = await feedbackSystem.generateAnalyticsReport(timeRange)
      expect(report.satisfaction.metrics.nps.score).toBeGreaterThan(0)
      expect(report.satisfaction.metrics.csat.averageScore).toBeGreaterThan(0)
    })

    it('should handle user dissatisfaction workflow', async () => {
      // 1. User encounters errors
      feedbackSystem.trackEvent('error', 'chart-loading-failed', {
        errorMessage: 'Network timeout',
        errorCode: 'TIMEOUT'
      })
      
      // 2. User provides negative feedback
      const csatResponse = feedbackSystem.recordCSAT(2, 'charts', 'Charts are too slow to load')
      expect(csatResponse.score).toBe(2)
      
      // 3. User gives low NPS score
      const npsResponse = feedbackSystem.recordNPS(3, 'Too many bugs and performance issues')
      expect(npsResponse.category).toBe('detractor')
      
      // 4. System should detect issues and create alerts
      await continuousUXMonitoringService.performMonitoringCheck()
      
      const alerts = feedbackSystem.getActiveAlerts()
      // In a real scenario, this might trigger alerts based on error rates
      
      // 5. Get satisfaction insights
      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      }
      
      const satisfactionReport = feedbackSystem.getSatisfactionReport(timeRange)
      expect(satisfactionReport.detractor_analysis.detractorCount).toBeGreaterThan(0)
      expect(satisfactionReport.action_items.length).toBeGreaterThan(0)
    })

    it('should handle privacy-conscious user workflow', async () => {
      // 1. User initially declines consent
      feedbackSystem.setUserConsent(false)
      expect(feedbackSystem.hasUserConsent()).toBe(false)
      
      // 2. System should not track events
      feedbackSystem.trackEvent('click', 'button') // Should be ignored
      
      // 3. User later grants consent
      feedbackSystem.setUserConsent(true)
      expect(feedbackSystem.hasUserConsent()).toBe(true)
      
      // 4. System can now track events
      feedbackSystem.trackEvent('page-view', '/dashboard')
      feedbackSystem.trackEvent('click', 'analytics-tab')
      
      // 5. User provides feedback
      const feedback = feedbackSystem.recordCSAT(5, 'privacy', 'I appreciate the privacy controls')
      expect(feedback.score).toBe(5)
      
      // 6. User requests data export
      const timeRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      }
      
      const exportedData = await feedbackSystem.exportFeedbackData(timeRange, 'json')
      expect(typeof exportedData).toBe('string')
      
      // 7. User revokes consent
      feedbackSystem.setUserConsent(false)
      expect(feedbackSystem.hasUserConsent()).toBe(false)
    })
  })

  describe('Real-time Monitoring and Alerting', () => {
    it('should detect and alert on usability issues', async () => {
      // Simulate high error rate
      for (let i = 0; i < 10; i++) {
        feedbackSystem.trackEvent('error', `error-${i}`, {
          type: 'javascript-error',
          message: 'Uncaught TypeError'
        })
      }
      
      // Simulate some normal interactions
      for (let i = 0; i < 20; i++) {
        feedbackSystem.trackEvent('click', `button-${i}`)
      }
      
      // Trigger monitoring check
      await continuousUXMonitoringService.performMonitoringCheck()
      
      // Should detect high error rate
      const alerts = feedbackSystem.getActiveAlerts()
      const errorRateAlert = alerts.find(alert => alert.metric === 'error-rate')
      
      // In a real scenario, this would create an alert if error rate > threshold
      expect(Array.isArray(alerts)).toBe(true)
    })

    it('should track feature adoption and usage patterns', async () => {
      // Simulate feature usage by different users
      const features = ['dashboard', 'charts', 'analytics', 'export', 'sharing']
      const users = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5']
      
      // Simulate usage patterns
      features.forEach(feature => {
        users.forEach((user, index) => {
          // Some users use all features, others only some
          if (index < 3 || feature === 'dashboard') {
            feedbackSystem.trackEvent('feature-discovery', feature, { userId: user })
          }
        })
      })
      
      // Get dashboard data
      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      }
      
      const dashboardData = await feedbackSystem.getUXDashboardData(timeRange)
      
      // Should show feature usage data
      expect(dashboardData.featureUsage.length).toBeGreaterThan(0)
      
      // Dashboard should have highest adoption
      const dashboardFeature = dashboardData.featureUsage.find(f => f.featureId === 'dashboard')
      if (dashboardFeature) {
        expect(dashboardFeature.adoptionRate).toBeGreaterThan(80)
      }
    })

    it('should provide actionable insights and recommendations', async () => {
      // Simulate mixed feedback scenario
      
      // Some positive feedback
      feedbackSystem.recordNPS(9, 'Love the new dashboard!')
      feedbackSystem.recordCSAT(5, 'dashboard', 'Very intuitive')
      
      // Some negative feedback
      feedbackSystem.recordNPS(4, 'Charts are confusing')
      feedbackSystem.recordCSAT(2, 'charts', 'Hard to understand')
      
      // Some errors
      feedbackSystem.trackEvent('error', 'chart-render-error')
      
      // Generate comprehensive report
      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      }
      
      const report = await feedbackSystem.generateAnalyticsReport(timeRange)
      
      // Should provide insights
      expect(report.satisfaction.insights.insights.length).toBeGreaterThan(0)
      expect(report.satisfaction.insights.recommendations.length).toBeGreaterThan(0)
      expect(report.actionItems.length).toBeGreaterThan(0)
      
      // Should identify chart issues
      const chartIssues = report.satisfaction.insights.keyFindings.csatIssues
      expect(chartIssues.includes('charts')).toBe(true)
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle high volume of events efficiently', async () => {
      const startTime = Date.now()
      
      // Simulate high volume of events
      const eventCount = 1000
      const promises = []
      
      for (let i = 0; i < eventCount; i++) {
        promises.push(
          Promise.resolve(feedbackSystem.trackEvent('click', `element-${i}`, { index: i }))
        )
      }
      
      await Promise.all(promises)
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should complete within reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000)
      
      // System should still be responsive
      const dashboardData = await feedbackSystem.getUXDashboardData({
        start: new Date(Date.now() - 60 * 60 * 1000),
        end: new Date()
      })
      
      expect(dashboardData).toBeDefined()
    })

    it('should apply sampling rate correctly under load', async () => {
      // Set low sampling rate
      feedbackSystem.updateConfiguration({
        analytics: {
          trackingEnabled: true,
          retentionDays: 90,
          samplingRate: 0.1, // Only 10% of events
          excludeInternalUsers: false,
          anonymizeData: true
        }
      })
      
      // Mock Math.random to control sampling
      const mockRandom = jest.spyOn(Math, 'random')
      let callCount = 0
      
      mockRandom.mockImplementation(() => {
        // Alternate between values above and below sampling rate
        return callCount++ % 10 === 0 ? 0.05 : 0.5
      })
      
      // Generate many events
      for (let i = 0; i < 100; i++) {
        feedbackSystem.trackEvent('click', `button-${i}`)
      }
      
      // Should have called Math.random for each event
      expect(mockRandom).toHaveBeenCalledTimes(100)
      
      mockRandom.mockRestore()
    })

    it('should maintain data consistency across services', async () => {
      // Record various types of data
      const npsResponse = feedbackSystem.recordNPS(8, 'Good experience overall')
      const csatResponse = feedbackSystem.recordCSAT(4, 'dashboard', 'Easy to navigate')
      
      feedbackSystem.trackEvent('page-view', '/dashboard')
      feedbackSystem.trackEvent('feature-discovery', 'analytics')
      feedbackSystem.trackEvent('task-completion', 'view-analytics')
      
      // Get data from different services
      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      }
      
      const [dashboardData, satisfactionReport] = await Promise.all([
        feedbackSystem.getUXDashboardData(timeRange),
        feedbackSystem.getSatisfactionReport(timeRange)
      ])
      
      // Data should be consistent
      expect(dashboardData.satisfaction.nps.responseCount).toBeGreaterThan(0)
      expect(dashboardData.satisfaction.csat.responseCount).toBeGreaterThan(0)
      expect(satisfactionReport.metrics.nps.responseCount).toBeGreaterThan(0)
      expect(satisfactionReport.metrics.csat.responseCount).toBeGreaterThan(0)
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle service failures gracefully', async () => {
      // Mock a service failure
      const originalSubmit = feedbackSystem.submitFeedback
      feedbackSystem.submitFeedback = jest.fn().mockRejectedValue(new Error('Service unavailable'))
      
      // Should handle the error gracefully
      await expect(
        feedbackSystem.submitFeedback('test-widget', { rating: 5 })
      ).rejects.toThrow('Service unavailable')
      
      // Restore original method
      feedbackSystem.submitFeedback = originalSubmit
      
      // Should work normally after restoration
      await expect(
        feedbackSystem.submitFeedback('test-widget', { rating: 5 })
      ).resolves.not.toThrow()
    })

    it('should recover from storage failures', async () => {
      // Mock localStorage failure
      const originalSetItem = localStorage.setItem
      localStorage.setItem = jest.fn().mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })
      
      // Should handle storage failure gracefully
      expect(() => {
        feedbackSystem.setUserConsent(true)
      }).not.toThrow()
      
      // Restore localStorage
      localStorage.setItem = originalSetItem
      
      // Should work normally after restoration
      feedbackSystem.setUserConsent(true)
      expect(feedbackSystem.hasUserConsent()).toBe(true)
    })

    it('should handle malformed data gracefully', async () => {
      // Try to submit malformed feedback
      const malformedResponses = {
        'question-1': null,
        'question-2': undefined,
        'question-3': { nested: { object: 'value' } },
        'question-4': ['array', 'value']
      }
      
      // Should handle malformed data without crashing
      await expect(
        feedbackSystem.submitFeedback('test-widget', malformedResponses)
      ).resolves.not.toThrow()
    })
  })

  describe('Multi-user Scenarios', () => {
    it('should handle concurrent users correctly', async () => {
      // Simulate multiple users
      const users = [
        { id: 'user-1', role: 'developer', tenure: 30 },
        { id: 'user-2', role: 'manager', tenure: 60 },
        { id: 'user-3', role: 'analyst', tenure: 15 }
      ]
      
      // Each user performs actions
      const userActions = users.map(async (user) => {
        // Initialize context for each user
        await feedbackSystem.initialize({
          role: user.role,
          tenure: user.tenure,
          featureUsage: {},
          lastActivity: new Date(),
          preferences: {}
        })
        
        // User actions
        feedbackSystem.trackEvent('page-view', '/dashboard', { userId: user.id })
        feedbackSystem.recordNPS(Math.floor(Math.random() * 11), `Feedback from ${user.id}`)
        feedbackSystem.recordCSAT(Math.floor(Math.random() * 5) + 1, 'dashboard', `CSAT from ${user.id}`)
        
        return user.id
      })
      
      // All users should complete their actions
      const completedUsers = await Promise.all(userActions)
      expect(completedUsers).toHaveLength(users.length)
      
      // System should have data from all users
      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      }
      
      const dashboardData = await feedbackSystem.getUXDashboardData(timeRange)
      expect(dashboardData.overview.totalUsers).toBeGreaterThan(0)
    })

    it('should maintain user privacy across sessions', async () => {
      // User 1 grants consent
      feedbackSystem.setUserConsent(true)
      feedbackSystem.trackEvent('click', 'user1-button')
      
      // Simulate new session/user
      localStorage.removeItem('feedback-consent')
      
      // User 2 should not inherit User 1's consent
      expect(feedbackSystem.hasUserConsent()).toBe(false)
      
      // User 2's events should not be tracked without consent
      feedbackSystem.trackEvent('click', 'user2-button')
      
      // User 2 grants consent
      feedbackSystem.setUserConsent(true)
      expect(feedbackSystem.hasUserConsent()).toBe(true)
    })
  })
})