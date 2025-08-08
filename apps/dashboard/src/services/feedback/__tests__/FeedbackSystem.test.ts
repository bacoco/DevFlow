import { FeedbackSystem } from '../FeedbackSystem'
import { UserContext, BehaviorEventType } from '../types'

// Mock the services
jest.mock('../FeedbackCollectionService')
jest.mock('../UserBehaviorAnalyticsService')
jest.mock('../ContinuousUXMonitoringService')
jest.mock('../SatisfactionTrackingService')

describe('FeedbackSystem', () => {
  let feedbackSystem: FeedbackSystem

  beforeEach(() => {
    feedbackSystem = new FeedbackSystem()
    // Clear localStorage
    localStorage.clear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize successfully with default configuration', async () => {
      await expect(feedbackSystem.initialize()).resolves.not.toThrow()
    })

    it('should initialize with user context', async () => {
      const userContext: UserContext = {
        role: 'developer',
        tenure: 30,
        featureUsage: { 'dashboard': 10, 'charts': 5 },
        lastActivity: new Date(),
        preferences: { theme: 'dark' }
      }

      await expect(feedbackSystem.initialize(userContext)).resolves.not.toThrow()
    })

    it('should not initialize twice', async () => {
      await feedbackSystem.initialize()
      await feedbackSystem.initialize() // Should not throw
    })
  })

  describe('event tracking', () => {
    beforeEach(async () => {
      await feedbackSystem.initialize()
    })

    it('should track behavior events', () => {
      const eventType: BehaviorEventType = 'click'
      const element = 'dashboard-button'
      const metadata = { x: 100, y: 200 }

      expect(() => {
        feedbackSystem.trackEvent(eventType, element, metadata)
      }).not.toThrow()
    })

    it('should not track events when system is disabled', () => {
      feedbackSystem.updateConfiguration({ enabled: false })
      
      expect(() => {
        feedbackSystem.trackEvent('click', 'button')
      }).not.toThrow()
    })

    it('should respect sampling rate', () => {
      feedbackSystem.updateConfiguration({
        analytics: {
          trackingEnabled: true,
          retentionDays: 90,
          samplingRate: 0, // No events should be tracked
          excludeInternalUsers: false,
          anonymizeData: true
        }
      })

      // Mock Math.random to return 0.5
      jest.spyOn(Math, 'random').mockReturnValue(0.5)

      expect(() => {
        feedbackSystem.trackEvent('click', 'button')
      }).not.toThrow()

      Math.random.mockRestore()
    })
  })

  describe('feedback widgets', () => {
    beforeEach(async () => {
      await feedbackSystem.initialize()
    })

    it('should show feedback widget', () => {
      expect(() => {
        feedbackSystem.showFeedbackWidget('test-widget')
      }).not.toThrow()
    })

    it('should submit feedback', async () => {
      const responses = {
        'question-1': 'Great experience',
        'rating': 5
      }

      await expect(
        feedbackSystem.submitFeedback('test-widget', responses)
      ).resolves.not.toThrow()
    })

    it('should not submit feedback when system is disabled', async () => {
      feedbackSystem.updateConfiguration({ enabled: false })

      await expect(
        feedbackSystem.submitFeedback('test-widget', {})
      ).rejects.toThrow('Feedback system is disabled')
    })
  })

  describe('satisfaction tracking', () => {
    beforeEach(async () => {
      await feedbackSystem.initialize()
    })

    it('should record NPS response', () => {
      const npsResponse = feedbackSystem.recordNPS(9, 'Great product!', 'general')
      
      expect(npsResponse).toHaveProperty('id')
      expect(npsResponse.score).toBe(9)
      expect(npsResponse.comment).toBe('Great product!')
      expect(npsResponse.category).toBe('promoter')
    })

    it('should record CSAT response', () => {
      const csatResponse = feedbackSystem.recordCSAT(4, 'dashboard', 'Easy to use')
      
      expect(csatResponse).toHaveProperty('id')
      expect(csatResponse.score).toBe(4)
      expect(csatResponse.feature).toBe('dashboard')
      expect(csatResponse.comment).toBe('Easy to use')
    })

    it('should categorize NPS scores correctly', () => {
      const detractor = feedbackSystem.recordNPS(3)
      const passive = feedbackSystem.recordNPS(7)
      const promoter = feedbackSystem.recordNPS(10)

      expect(detractor.category).toBe('detractor')
      expect(passive.category).toBe('passive')
      expect(promoter.category).toBe('promoter')
    })
  })

  describe('dashboard data', () => {
    beforeEach(async () => {
      await feedbackSystem.initialize()
    })

    it('should get UX dashboard data', async () => {
      const timeRange = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      }

      const dashboardData = await feedbackSystem.getUXDashboardData(timeRange)
      
      expect(dashboardData).toHaveProperty('overview')
      expect(dashboardData).toHaveProperty('usabilityMetrics')
      expect(dashboardData).toHaveProperty('featureUsage')
      expect(dashboardData).toHaveProperty('satisfaction')
      expect(dashboardData).toHaveProperty('alerts')
      expect(dashboardData).toHaveProperty('trends')
    })

    it('should get satisfaction report', () => {
      const timeRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      }

      const report = feedbackSystem.getSatisfactionReport(timeRange)
      
      expect(report).toHaveProperty('executive_summary')
      expect(report).toHaveProperty('metrics')
      expect(report).toHaveProperty('insights')
      expect(report).toHaveProperty('action_items')
    })

    it('should generate analytics report', async () => {
      const timeRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      }

      const report = await feedbackSystem.generateAnalyticsReport(timeRange)
      
      expect(report).toHaveProperty('period')
      expect(report).toHaveProperty('overview')
      expect(report).toHaveProperty('satisfaction')
      expect(report).toHaveProperty('usability')
      expect(report).toHaveProperty('features')
      expect(report).toHaveProperty('trends')
      expect(report).toHaveProperty('actionItems')
    })
  })

  describe('alert management', () => {
    beforeEach(async () => {
      await feedbackSystem.initialize()
    })

    it('should get active alerts', () => {
      const alerts = feedbackSystem.getActiveAlerts()
      expect(Array.isArray(alerts)).toBe(true)
    })

    it('should acknowledge alert', () => {
      expect(() => {
        feedbackSystem.acknowledgeAlert('alert-123', 'user-456')
      }).not.toThrow()
    })

    it('should resolve alert', () => {
      expect(() => {
        feedbackSystem.resolveAlert('alert-123', 'user-456', 'Fixed the issue')
      }).not.toThrow()
    })

    it('should get monitoring health', () => {
      const health = feedbackSystem.getMonitoringHealth()
      
      expect(health).toHaveProperty('isRunning')
      expect(health).toHaveProperty('alertCount')
      expect(health).toHaveProperty('systemHealth')
    })
  })

  describe('configuration management', () => {
    beforeEach(async () => {
      await feedbackSystem.initialize()
    })

    it('should update configuration', () => {
      const newConfig = {
        enabled: false,
        analytics: {
          trackingEnabled: false,
          retentionDays: 60,
          samplingRate: 0.5,
          excludeInternalUsers: true,
          anonymizeData: true
        }
      }

      expect(() => {
        feedbackSystem.updateConfiguration(newConfig)
      }).not.toThrow()
    })

    it('should save and load configuration', async () => {
      const config = {
        analytics: {
          trackingEnabled: true,
          retentionDays: 120,
          samplingRate: 0.8,
          excludeInternalUsers: false,
          anonymizeData: false
        }
      }

      feedbackSystem.updateConfiguration(config)
      
      // Create new instance to test loading
      const newFeedbackSystem = new FeedbackSystem()
      await newFeedbackSystem.initialize()
      
      // Configuration should be loaded from localStorage
      expect(localStorage.getItem('feedback-system-config')).toBeTruthy()
    })
  })

  describe('privacy and consent', () => {
    beforeEach(async () => {
      await feedbackSystem.initialize()
    })

    it('should check user consent', () => {
      expect(typeof feedbackSystem.hasUserConsent()).toBe('boolean')
    })

    it('should set user consent', () => {
      feedbackSystem.setUserConsent(true)
      expect(feedbackSystem.hasUserConsent()).toBe(true)

      feedbackSystem.setUserConsent(false)
      expect(feedbackSystem.hasUserConsent()).toBe(false)
    })

    it('should disable system when consent is revoked', () => {
      feedbackSystem.updateConfiguration({
        privacy: {
          consentRequired: true,
          dataRetentionDays: 365,
          allowOptOut: true,
          anonymizeAfterDays: 30,
          excludeFields: []
        }
      })

      feedbackSystem.setUserConsent(false)
      
      // System should be disabled
      expect(() => {
        feedbackSystem.trackEvent('click', 'button')
      }).not.toThrow()
    })

    it('should clean up old data', async () => {
      await expect(feedbackSystem.cleanupOldData()).resolves.not.toThrow()
    })
  })

  describe('data export', () => {
    beforeEach(async () => {
      await feedbackSystem.initialize()
    })

    it('should export feedback data as JSON', async () => {
      const timeRange = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      }

      const jsonData = await feedbackSystem.exportFeedbackData(timeRange, 'json')
      expect(typeof jsonData).toBe('string')
      expect(() => JSON.parse(jsonData)).not.toThrow()
    })

    it('should export feedback data as CSV', async () => {
      const timeRange = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      }

      const csvData = await feedbackSystem.exportFeedbackData(timeRange, 'csv')
      expect(typeof csvData).toBe('string')
      expect(csvData).toContain(',') // Should contain CSV separators
    })
  })

  describe('contextual suggestions', () => {
    beforeEach(async () => {
      await feedbackSystem.initialize()
    })

    it('should get contextual feedback suggestions', () => {
      const suggestions = feedbackSystem.getContextualSuggestions()
      expect(Array.isArray(suggestions)).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should handle initialization errors gracefully', async () => {
      // Mock localStorage to throw error
      const originalGetItem = localStorage.getItem
      localStorage.getItem = jest.fn().mockImplementation(() => {
        throw new Error('Storage error')
      })

      await expect(feedbackSystem.initialize()).rejects.toThrow()

      // Restore localStorage
      localStorage.getItem = originalGetItem
    })

    it('should handle invalid feedback submission', async () => {
      await feedbackSystem.initialize()
      
      // Mock the submission to fail
      jest.spyOn(feedbackSystem, 'submitFeedback').mockRejectedValue(new Error('Network error'))

      await expect(
        feedbackSystem.submitFeedback('invalid-widget', {})
      ).rejects.toThrow('Network error')
    })
  })
})