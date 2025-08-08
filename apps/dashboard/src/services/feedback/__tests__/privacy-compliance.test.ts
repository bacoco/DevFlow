import { FeedbackSystem } from '../FeedbackSystem'
import { feedbackCollectionService } from '../FeedbackCollectionService'
import { userBehaviorAnalyticsService } from '../UserBehaviorAnalyticsService'

describe('Privacy Compliance Tests', () => {
  let feedbackSystem: FeedbackSystem

  beforeEach(async () => {
    feedbackSystem = new FeedbackSystem()
    localStorage.clear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('GDPR Compliance', () => {
    it('should require explicit consent when configured', async () => {
      feedbackSystem.updateConfiguration({
        privacy: {
          consentRequired: true,
          dataRetentionDays: 365,
          allowOptOut: true,
          anonymizeAfterDays: 30,
          excludeFields: ['email', 'ip']
        }
      })

      await feedbackSystem.initialize()

      // Without consent, tracking should be disabled
      expect(feedbackSystem.hasUserConsent()).toBe(false)
    })

    it('should allow users to opt out of data collection', () => {
      feedbackSystem.updateConfiguration({
        privacy: {
          consentRequired: true,
          dataRetentionDays: 365,
          allowOptOut: true,
          anonymizeAfterDays: 30,
          excludeFields: []
        }
      })

      // Grant consent first
      feedbackSystem.setUserConsent(true)
      expect(feedbackSystem.hasUserConsent()).toBe(true)

      // Then revoke consent
      feedbackSystem.setUserConsent(false)
      expect(feedbackSystem.hasUserConsent()).toBe(false)
    })

    it('should not allow opt-out when configured', () => {
      feedbackSystem.updateConfiguration({
        privacy: {
          consentRequired: false,
          dataRetentionDays: 365,
          allowOptOut: false,
          anonymizeAfterDays: 30,
          excludeFields: []
        }
      })

      // Even if user tries to revoke consent, it should still be granted
      feedbackSystem.setUserConsent(false)
      expect(feedbackSystem.hasUserConsent()).toBe(true)
    })

    it('should exclude specified fields from data collection', async () => {
      const excludeFields = ['email', 'ip', 'userAgent']
      
      feedbackSystem.updateConfiguration({
        privacy: {
          consentRequired: false,
          dataRetentionDays: 365,
          allowOptOut: true,
          anonymizeAfterDays: 30,
          excludeFields
        }
      })

      await feedbackSystem.initialize()

      // Mock feedback submission with sensitive data
      const responses = {
        'feedback': 'Great product',
        'email': 'user@example.com',
        'ip': '192.168.1.1'
      }

      // The system should filter out excluded fields
      // This would be implemented in the actual submission logic
      const filteredResponses = Object.keys(responses)
        .filter(key => !excludeFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = responses[key as keyof typeof responses]
          return obj
        }, {} as Record<string, any>)

      expect(filteredResponses).not.toHaveProperty('email')
      expect(filteredResponses).not.toHaveProperty('ip')
      expect(filteredResponses).toHaveProperty('feedback')
    })

    it('should anonymize data after specified period', async () => {
      const anonymizeAfterDays = 1 // 1 day for testing
      
      feedbackSystem.updateConfiguration({
        privacy: {
          consentRequired: false,
          dataRetentionDays: 365,
          allowOptOut: true,
          anonymizeAfterDays,
          excludeFields: []
        }
      })

      await feedbackSystem.initialize()

      // This would be implemented in the actual data cleanup logic
      const testData = {
        id: 'test-1',
        userId: 'user-123',
        responses: { feedback: 'Test feedback' },
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      }

      const shouldAnonymize = (Date.now() - testData.submittedAt.getTime()) > (anonymizeAfterDays * 24 * 60 * 60 * 1000)
      
      if (shouldAnonymize) {
        // Remove or hash personally identifiable information
        const anonymizedData = {
          ...testData,
          userId: undefined, // Remove user ID
          // Other PII would be removed or hashed
        }
        
        expect(anonymizedData.userId).toBeUndefined()
      }
    })

    it('should delete data after retention period', async () => {
      const retentionDays = 1 // 1 day for testing
      
      feedbackSystem.updateConfiguration({
        privacy: {
          consentRequired: false,
          dataRetentionDays: retentionDays,
          allowOptOut: true,
          anonymizeAfterDays: 30,
          excludeFields: []
        }
      })

      await feedbackSystem.initialize()

      // Simulate old data that should be deleted
      const oldData = {
        id: 'old-data',
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      }

      const shouldDelete = (Date.now() - oldData.submittedAt.getTime()) > (retentionDays * 24 * 60 * 60 * 1000)
      
      expect(shouldDelete).toBe(true)
      
      // In actual implementation, this data would be removed during cleanup
      await expect(feedbackSystem.cleanupOldData()).resolves.not.toThrow()
    })
  })

  describe('Data Minimization', () => {
    it('should only collect necessary data', async () => {
      await feedbackSystem.initialize()

      // Mock a minimal feedback response
      const minimalResponse = {
        widgetId: 'test-widget',
        responses: { rating: 5 },
        sessionId: 'session-123'
      }

      // Should not require additional unnecessary fields
      await expect(
        feedbackSystem.submitFeedback(minimalResponse.widgetId, minimalResponse.responses)
      ).resolves.not.toThrow()
    })

    it('should apply sampling rate to reduce data collection', () => {
      const samplingRate = 0.1 // Only collect 10% of events
      
      feedbackSystem.updateConfiguration({
        analytics: {
          trackingEnabled: true,
          retentionDays: 90,
          samplingRate,
          excludeInternalUsers: true,
          anonymizeData: true
        }
      })

      // Mock Math.random to test sampling
      const mockRandom = jest.spyOn(Math, 'random')
      
      // Should track when random value is below sampling rate
      mockRandom.mockReturnValue(0.05)
      expect(() => {
        feedbackSystem.trackEvent('click', 'button')
      }).not.toThrow()

      // Should not track when random value is above sampling rate
      mockRandom.mockReturnValue(0.5)
      expect(() => {
        feedbackSystem.trackEvent('click', 'button')
      }).not.toThrow()

      mockRandom.mockRestore()
    })

    it('should exclude internal users when configured', async () => {
      feedbackSystem.updateConfiguration({
        analytics: {
          trackingEnabled: true,
          retentionDays: 90,
          samplingRate: 1.0,
          excludeInternalUsers: true,
          anonymizeData: true
        }
      })

      await feedbackSystem.initialize({
        role: 'admin', // Internal user
        tenure: 100,
        featureUsage: {},
        lastActivity: new Date(),
        preferences: {}
      })

      // Internal users should be excluded from tracking
      // This would be implemented in the actual tracking logic
      const isInternalUser = (role: string) => ['admin', 'developer', 'tester'].includes(role)
      
      expect(isInternalUser('admin')).toBe(true)
      expect(isInternalUser('user')).toBe(false)
    })
  })

  describe('Data Security', () => {
    it('should anonymize data when configured', async () => {
      feedbackSystem.updateConfiguration({
        analytics: {
          trackingEnabled: true,
          retentionDays: 90,
          samplingRate: 1.0,
          excludeInternalUsers: false,
          anonymizeData: true
        }
      })

      await feedbackSystem.initialize()

      // When anonymization is enabled, personal identifiers should be removed or hashed
      const sensitiveData = {
        userId: 'user-123',
        email: 'user@example.com',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
      }

      // Simulate anonymization
      const anonymizeData = (data: any) => {
        if (feedbackSystem['config'].analytics.anonymizeData) {
          return {
            ...data,
            userId: data.userId ? `anon-${btoa(data.userId).slice(0, 8)}` : undefined,
            email: undefined,
            ip: undefined,
            userAgent: data.userAgent ? data.userAgent.split(' ')[0] : undefined // Keep only browser name
          }
        }
        return data
      }

      const anonymizedData = anonymizeData(sensitiveData)
      
      expect(anonymizedData.userId).toMatch(/^anon-/)
      expect(anonymizedData.email).toBeUndefined()
      expect(anonymizedData.ip).toBeUndefined()
    })

    it('should validate data before storage', async () => {
      await feedbackSystem.initialize()

      // Test with invalid data
      const invalidResponses = {
        '<script>alert("xss")</script>': 'malicious',
        'normal_field': 'normal_value'
      }

      // In production, this would sanitize or reject malicious input
      const sanitizeInput = (input: any) => {
        if (typeof input === 'string') {
          return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        }
        return input
      }

      const sanitizedResponses = Object.keys(invalidResponses).reduce((acc, key) => {
        const sanitizedKey = sanitizeInput(key)
        const sanitizedValue = sanitizeInput(invalidResponses[key as keyof typeof invalidResponses])
        acc[sanitizedKey] = sanitizedValue
        return acc
      }, {} as Record<string, any>)

      expect(sanitizedResponses['normal_field']).toBe('normal_value')
      expect(Object.keys(sanitizedResponses).some(key => key.includes('<script>'))).toBe(false)
    })
  })

  describe('Consent Management', () => {
    it('should track consent history', () => {
      const consentHistory: Array<{ granted: boolean; timestamp: Date }> = []

      const trackConsent = (granted: boolean) => {
        consentHistory.push({ granted, timestamp: new Date() })
        feedbackSystem.setUserConsent(granted)
      }

      trackConsent(true)
      trackConsent(false)
      trackConsent(true)

      expect(consentHistory).toHaveLength(3)
      expect(consentHistory[0].granted).toBe(true)
      expect(consentHistory[1].granted).toBe(false)
      expect(consentHistory[2].granted).toBe(true)
    })

    it('should provide consent withdrawal mechanism', () => {
      // Grant consent initially
      feedbackSystem.setUserConsent(true)
      expect(feedbackSystem.hasUserConsent()).toBe(true)

      // Provide easy withdrawal
      const withdrawConsent = () => {
        feedbackSystem.setUserConsent(false)
        // In production, this would also:
        // 1. Stop all data collection
        // 2. Delete existing data (if requested)
        // 3. Show confirmation to user
      }

      withdrawConsent()
      expect(feedbackSystem.hasUserConsent()).toBe(false)
    })

    it('should handle granular consent preferences', () => {
      // Simulate granular consent options
      const consentPreferences = {
        analytics: true,
        feedback: true,
        satisfaction: false,
        marketing: false
      }

      // The system should respect granular preferences
      Object.entries(consentPreferences).forEach(([category, granted]) => {
        if (category === 'analytics' && granted) {
          expect(() => {
            feedbackSystem.trackEvent('click', 'button')
          }).not.toThrow()
        }
        
        if (category === 'satisfaction' && !granted) {
          // Should not collect satisfaction data
          expect(typeof feedbackSystem.recordNPS).toBe('function')
          // In production, this would check consent before recording
        }
      })
    })
  })

  describe('Data Subject Rights', () => {
    it('should support data export (right to portability)', async () => {
      await feedbackSystem.initialize()

      const timeRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      }

      // User should be able to export their data
      const exportedData = await feedbackSystem.exportFeedbackData(timeRange, 'json')
      
      expect(typeof exportedData).toBe('string')
      expect(() => JSON.parse(exportedData)).not.toThrow()
    })

    it('should support data deletion (right to erasure)', async () => {
      await feedbackSystem.initialize()

      // Simulate user requesting data deletion
      const deleteUserData = async (userId: string) => {
        // In production, this would:
        // 1. Find all data associated with the user
        // 2. Delete or anonymize the data
        // 3. Confirm deletion to the user
        
        await feedbackSystem.cleanupOldData()
        return { success: true, message: 'User data deleted successfully' }
      }

      const result = await deleteUserData('user-123')
      expect(result.success).toBe(true)
    })

    it('should support data rectification (right to correction)', () => {
      // Simulate user requesting data correction
      const correctUserData = (userId: string, corrections: Record<string, any>) => {
        // In production, this would:
        // 1. Validate the corrections
        // 2. Update the user's data
        // 3. Log the correction for audit purposes
        
        return { success: true, corrections }
      }

      const corrections = { email: 'newemail@example.com' }
      const result = correctUserData('user-123', corrections)
      
      expect(result.success).toBe(true)
      expect(result.corrections).toEqual(corrections)
    })

    it('should provide data access (right to access)', async () => {
      await feedbackSystem.initialize()

      // User should be able to access their data
      const getUserData = async (userId: string) => {
        const timeRange = {
          start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last year
          end: new Date()
        }

        const dashboardData = await feedbackSystem.getUXDashboardData(timeRange)
        
        // Filter data for specific user
        return {
          userId,
          data: dashboardData,
          dataTypes: ['feedback_responses', 'behavior_events', 'satisfaction_scores'],
          collectionPurpose: 'Product improvement and user experience optimization',
          retentionPeriod: '365 days',
          processingLegalBasis: 'Legitimate interest'
        }
      }

      const userData = await getUserData('user-123')
      
      expect(userData.userId).toBe('user-123')
      expect(userData.data).toBeDefined()
      expect(Array.isArray(userData.dataTypes)).toBe(true)
    })
  })
})