import { InterventionScheduler } from '../services/InterventionScheduler';
import { InterventionPlan, InterventionTiming, UserContext, EmergencySeverity } from '@devflow/shared-types';
import winston from 'winston';
import moment from 'moment';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
} as unknown as winston.Logger;

describe('InterventionScheduler', () => {
  let scheduler: InterventionScheduler;

  beforeEach(() => {
    scheduler = new InterventionScheduler(mockLogger);
    jest.clearAllMocks();
  });

  describe('findOptimalInterventionTime', () => {
    it('should find optimal timing for stress reduction intervention', async () => {
      const userId = 'user123';
      const intervention: InterventionPlan = {
        type: 'STRESS_REDUCTION',
        deliveryMethod: 'VISUAL',
        timing: {
          preferredTime: moment().add(1, 'hour').toDate(),
          flexibility: 30,
          recurring: false
        },
        personalization: {
          urgency: 'medium',
          adaptToContext: true,
          userPreferences: {}
        },
        duration: 5,
        priority: 0.8
      };

      const result = await scheduler.findOptimalInterventionTime(userId, intervention);

      expect(result).toBeDefined();
      expect(result.recommendedTime).toBeInstanceOf(Date);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.reasoning).toBeInstanceOf(Array);
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.alternativeTimes).toBeInstanceOf(Array);
      expect(result.contextFactors).toBeInstanceOf(Array);
    });

    it('should handle break reminder intervention', async () => {
      const userId = 'user456';
      const intervention: InterventionPlan = {
        type: 'BREAK_REMINDER',
        deliveryMethod: 'AUDIO',
        timing: {
          preferredTime: moment().add(30, 'minutes').toDate(),
          flexibility: 15,
          recurring: true
        },
        personalization: {
          urgency: 'low',
          adaptToContext: true,
          userPreferences: {}
        },
        duration: 3,
        priority: 0.6
      };

      const result = await scheduler.findOptimalInterventionTime(userId, intervention);

      expect(result).toBeDefined();
      expect(result.recommendedTime).toBeInstanceOf(Date);
      expect(result.reasoning).toContain('Optimal timing for productivity break');
    });

    it('should throw error when no available time windows found', async () => {
      const userId = 'user789';
      const intervention: InterventionPlan = {
        type: 'MOVEMENT_PROMPT',
        deliveryMethod: 'HAPTIC',
        timing: {
          preferredTime: moment().subtract(1, 'hour').toDate(), // Past time
          flexibility: 0,
          recurring: false
        },
        personalization: {
          urgency: 'low',
          adaptToContext: false,
          userPreferences: {}
        },
        duration: 2,
        priority: 0.4
      };

      // Mock the availability analysis to return no windows
      jest.spyOn(scheduler, 'analyzeUserAvailability').mockResolvedValue({
        userId,
        availabilityWindows: [],
        busyPeriods: [],
        preferredInterventionTimes: [],
        contextualFactors: [],
        lastUpdated: new Date()
      });

      await expect(scheduler.findOptimalInterventionTime(userId, intervention))
        .rejects.toThrow('No available time windows found');
    });
  });

  describe('resolveSchedulingConflicts', () => {
    it('should resolve conflicts between overlapping interventions', async () => {
      const userId = 'user123';
      const baseTime = moment().add(1, 'hour');
      
      const interventions: InterventionPlan[] = [
        {
          type: 'STRESS_REDUCTION',
          deliveryMethod: 'VISUAL',
          timing: {
            preferredTime: baseTime.toDate(),
            flexibility: 10,
            recurring: false
          },
          personalization: {
            urgency: 'high',
            adaptToContext: true,
            userPreferences: {}
          },
          duration: 10,
          priority: 0.9
        },
        {
          type: 'BREAK_REMINDER',
          deliveryMethod: 'AUDIO',
          timing: {
            preferredTime: baseTime.clone().add(5, 'minutes').toDate(), // Overlapping
            flexibility: 5,
            recurring: false
          },
          personalization: {
            urgency: 'medium',
            adaptToContext: true,
            userPreferences: {}
          },
          duration: 5,
          priority: 0.7
        }
      ];

      const result = await scheduler.resolveSchedulingConflicts(userId, interventions);

      expect(result).toBeDefined();
      expect(result.conflicts).toBeInstanceOf(Array);
      expect(result.resolutions).toBeInstanceOf(Array);
      expect(result.finalSchedule).toBeInstanceOf(Array);
      expect(result.finalSchedule).toHaveLength(2);
      expect(result.compromises).toBeInstanceOf(Array);
    });

    it('should handle no conflicts scenario', async () => {
      const userId = 'user456';
      const baseTime = moment().add(1, 'hour');
      
      const interventions: InterventionPlan[] = [
        {
          type: 'HYDRATION_REMINDER',
          deliveryMethod: 'VISUAL',
          timing: {
            preferredTime: baseTime.toDate(),
            flexibility: 10,
            recurring: false
          },
          personalization: {
            urgency: 'low',
            adaptToContext: true,
            userPreferences: {}
          },
          duration: 2,
          priority: 0.5
        },
        {
          type: 'MOVEMENT_PROMPT',
          deliveryMethod: 'HAPTIC',
          timing: {
            preferredTime: baseTime.clone().add(30, 'minutes').toDate(), // No overlap
            flexibility: 15,
            recurring: false
          },
          personalization: {
            urgency: 'medium',
            adaptToContext: true,
            userPreferences: {}
          },
          duration: 3,
          priority: 0.6
        }
      ];

      const result = await scheduler.resolveSchedulingConflicts(userId, interventions);

      expect(result.conflicts).toHaveLength(0);
      expect(result.finalSchedule).toHaveLength(2);
    });
  });

  describe('adaptScheduleBasedOnContext', () => {
    it('should adapt timing when user is in meeting', async () => {
      const userId = 'user123';
      const context: UserContext = {
        currentActivity: 'meeting',
        currentStress: 60,
        currentEnergy: 70,
        currentFocus: 80,
        currentMood: 65
      };

      const result = await scheduler.adaptScheduleBasedOnContext(userId, context);

      expect(result).toBeDefined();
      expect(result.adaptationType).toBe('timing');
      expect(result.reason).toContain('meeting');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should adapt frequency for high stress', async () => {
      const userId = 'user456';
      const context: UserContext = {
        currentActivity: 'coding',
        currentStress: 85, // High stress
        currentEnergy: 60,
        currentFocus: 70,
        currentMood: 50
      };

      const result = await scheduler.adaptScheduleBasedOnContext(userId, context);

      expect(result).toBeDefined();
      expect(result.adaptationType).toBe('frequency');
      expect(result.reason).toContain('High stress level detected');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should adapt delivery method for high focus', async () => {
      const userId = 'user789';
      const context: UserContext = {
        currentActivity: 'coding',
        currentStress: 40,
        currentEnergy: 90,
        currentFocus: 95, // Very high focus
        currentMood: 80
      };

      const result = await scheduler.adaptScheduleBasedOnContext(userId, context);

      expect(result).toBeDefined();
      expect(result.adaptationType).toBe('delivery_method');
      expect(result.reason).toContain('High focus state');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should adapt content for outside work hours', async () => {
      const userId = 'user101';
      const context: UserContext = {
        currentActivity: 'idle',
        currentStress: 30,
        currentEnergy: 60,
        currentFocus: 40,
        currentMood: 70
      };

      // Mock current time to be outside work hours
      const originalDate = Date;
      const mockDate = new Date('2023-01-01T20:00:00Z'); // 8 PM
      global.Date = jest.fn(() => mockDate) as any;
      global.Date.now = jest.fn(() => mockDate.getTime());

      const result = await scheduler.adaptScheduleBasedOnContext(userId, context);

      expect(result).toBeDefined();
      expect(result.adaptationType).toBe('content');
      expect(result.reason).toContain('Outside work hours');

      // Restore original Date
      global.Date = originalDate;
    });
  });

  describe('analyzeUserAvailability', () => {
    it('should analyze user availability and return windows', async () => {
      const userId = 'user123';

      const result = await scheduler.analyzeUserAvailability(userId);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.availabilityWindows).toBeInstanceOf(Array);
      expect(result.busyPeriods).toBeInstanceOf(Array);
      expect(result.preferredInterventionTimes).toBeInstanceOf(Array);
      expect(result.contextualFactors).toBeInstanceOf(Array);
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should use cached availability if recent', async () => {
      const userId = 'user456';

      // First call
      const result1 = await scheduler.analyzeUserAvailability(userId);
      
      // Second call should use cache
      const result2 = await scheduler.analyzeUserAvailability(userId);

      expect(result1).toEqual(result2);
    });
  });

  describe('predictInterventionReceptivity', () => {
    it('should predict high receptivity for morning hours', async () => {
      const userId = 'user123';
      const morningTime = moment().hour(10).minute(0).toDate(); // 10 AM

      const result = await scheduler.predictInterventionReceptivity(userId, morningTime);

      expect(result).toBeDefined();
      expect(result.time).toEqual(morningTime);
      expect(result.receptivityScore).toBeGreaterThan(0.6); // Should be high in morning
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.influencingFactors).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should predict lower receptivity for late evening', async () => {
      const userId = 'user456';
      const eveningTime = moment().hour(19).minute(0).toDate(); // 7 PM

      const result = await scheduler.predictInterventionReceptivity(userId, eveningTime);

      expect(result).toBeDefined();
      expect(result.receptivityScore).toBeLessThan(0.5); // Should be lower in evening
    });

    it('should use cached predictions', async () => {
      const userId = 'user789';
      const testTime = moment().hour(14).minute(0).toDate();

      // First call
      const result1 = await scheduler.predictInterventionReceptivity(userId, testTime);
      
      // Second call should use cache
      const result2 = await scheduler.predictInterventionReceptivity(userId, testTime);

      expect(result1).toEqual(result2);
    });
  });

  describe('optimizeInterventionFrequency', () => {
    it('should optimize intervention frequency', async () => {
      const userId = 'user123';

      const result = await scheduler.optimizeInterventionFrequency(userId);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.currentFrequency).toBeDefined();
      expect(result.recommendedFrequency).toBeDefined();
      expect(result.reasoning).toBeInstanceOf(Array);
      expect(result.expectedImpact).toBeGreaterThan(0);
      expect(result.trialPeriod).toBeGreaterThan(0);
    });

    it('should provide reasonable frequency recommendations', async () => {
      const userId = 'user456';

      const result = await scheduler.optimizeInterventionFrequency(userId);

      expect(result.recommendedFrequency.daily).toBeGreaterThanOrEqual(4);
      expect(result.recommendedFrequency.daily).toBeLessThanOrEqual(12);
      expect(result.recommendedFrequency.perHour).toBeGreaterThanOrEqual(0.1);
      expect(result.recommendedFrequency.perHour).toBeLessThanOrEqual(0.5);
    });
  });

  describe('scheduleEmergencyIntervention', () => {
    it('should schedule immediate intervention for critical emergency', async () => {
      const userId = 'user123';
      const severity: EmergencySeverity = 'CRITICAL';
      const intervention: InterventionPlan = {
        type: 'STRESS_REDUCTION',
        deliveryMethod: 'MULTI_MODAL',
        timing: {
          preferredTime: new Date(),
          flexibility: 0,
          recurring: false
        },
        personalization: {
          urgency: 'high',
          adaptToContext: true,
          userPreferences: {}
        },
        duration: 10,
        priority: 1.0
      };

      const result = await scheduler.scheduleEmergencyIntervention(userId, severity, intervention);

      expect(result).toBeDefined();
      expect(result.confidence).toBe(1.0);
      expect(result.reasoning).toContain('Emergency situation detected');
      expect(result.alternativeTimes).toHaveLength(0);
      expect(moment(result.recommendedTime).diff(moment(), 'seconds')).toBeLessThan(5);
    });

    it('should handle high severity emergency', async () => {
      const userId = 'user456';
      const severity: EmergencySeverity = 'HIGH';
      const intervention: InterventionPlan = {
        type: 'STRESS_REDUCTION',
        deliveryMethod: 'VISUAL',
        timing: {
          preferredTime: new Date(),
          flexibility: 0,
          recurring: false
        },
        personalization: {
          urgency: 'high',
          adaptToContext: true,
          userPreferences: {}
        },
        duration: 5,
        priority: 0.9
      };

      const result = await scheduler.scheduleEmergencyIntervention(userId, severity, intervention);

      expect(result).toBeDefined();
      expect(result.confidence).toBe(1.0);
      expect(result.reasoning).toContain(`Emergency level: ${severity}`);
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully in findOptimalInterventionTime', async () => {
      const userId = 'user123';
      const intervention: InterventionPlan = {
        type: 'STRESS_REDUCTION',
        deliveryMethod: 'VISUAL',
        timing: {
          preferredTime: new Date(),
          flexibility: 10,
          recurring: false
        },
        personalization: {
          urgency: 'medium',
          adaptToContext: true,
          userPreferences: {}
        },
        duration: 5,
        priority: 0.8
      };

      // Mock analyzeUserAvailability to throw error
      jest.spyOn(scheduler, 'analyzeUserAvailability').mockRejectedValue(new Error('Service unavailable'));

      await expect(scheduler.findOptimalInterventionTime(userId, intervention))
        .rejects.toThrow('Service unavailable');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error finding optimal intervention time',
        expect.objectContaining({
          userId,
          error: 'Service unavailable'
        })
      );
    });

    it('should handle errors in resolveSchedulingConflicts', async () => {
      const userId = 'user456';
      const interventions: InterventionPlan[] = [];

      // Mock internal method to throw error
      const originalMethod = scheduler['detectSchedulingConflicts'];
      scheduler['detectSchedulingConflicts'] = jest.fn().mockImplementation(() => {
        throw new Error('Conflict detection failed');
      });

      await expect(scheduler.resolveSchedulingConflicts(userId, interventions))
        .rejects.toThrow('Conflict detection failed');

      // Restore original method
      scheduler['detectSchedulingConflicts'] = originalMethod;
    });
  });

  describe('cache management', () => {
    it('should clean up expired cache entries', async () => {
      const userId = 'user123';

      // Add some data to cache
      await scheduler.analyzeUserAvailability(userId);
      await scheduler.predictInterventionReceptivity(userId, new Date());

      // Verify cache has data
      expect(scheduler['userAvailabilityCache'].has(userId)).toBe(true);
      expect(scheduler['receptivityCache'].has(userId)).toBe(true);

      // Trigger cleanup (this would normally be called by cron job)
      scheduler['cleanupExpiredCache']();

      // Cache should still have recent data
      expect(scheduler['userAvailabilityCache'].has(userId)).toBe(true);
      expect(scheduler['receptivityCache'].has(userId)).toBe(true);
    });
  });
});