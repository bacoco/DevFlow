import { InterventionEngine } from '../services/InterventionEngine';
import { InterventionScheduler } from '../services/InterventionScheduler';
import { EmergencyHandler } from '../services/EmergencyHandler';
import {
  InterventionPlan,
  InterventionOutcome,
  InterventionTiming,
  EmergencySeverity
} from '@devflow/shared-types';
import {
  TimeRange,
  InterventionEngineError,
  SchedulingError,
  EmergencyError,
  EmergencySituation
} from '../types';
import winston from 'winston';
import moment from 'moment';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
} as unknown as winston.Logger;

// Mock the scheduler and emergency handler
jest.mock('../services/InterventionScheduler');
jest.mock('../services/EmergencyHandler');

const MockInterventionScheduler = InterventionScheduler as jest.MockedClass<typeof InterventionScheduler>;
const MockEmergencyHandler = EmergencyHandler as jest.MockedClass<typeof EmergencyHandler>;

describe('InterventionEngine', () => {
  let interventionEngine: InterventionEngine;
  let mockScheduler: jest.Mocked<InterventionScheduler>;
  let mockEmergencyHandler: jest.Mocked<EmergencyHandler>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mocked instances
    mockScheduler = new MockInterventionScheduler(mockLogger) as jest.Mocked<InterventionScheduler>;
    mockEmergencyHandler = new MockEmergencyHandler(mockLogger) as jest.Mocked<EmergencyHandler>;
    
    interventionEngine = new InterventionEngine(mockLogger);
    
    // Replace the internal instances with mocks
    (interventionEngine as any).scheduler = mockScheduler;
    (interventionEngine as any).emergencyHandler = mockEmergencyHandler;
  });

  describe('scheduleIntervention', () => {
    it('should successfully schedule a stress reduction intervention', async () => {
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

      // Mock scheduler response
      mockScheduler.findOptimalInterventionTime.mockResolvedValue({
        recommendedTime: moment().add(1, 'hour').toDate(),
        confidence: 0.85,
        reasoning: ['High receptivity predicted', 'Available time window'],
        alternativeTimes: [],
        contextFactors: []
      });

      const result = await interventionEngine.scheduleIntervention(userId, intervention);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.interventionId).toBeDefined();
      expect(result.scheduledTime).toBeInstanceOf(Date);
      expect(result.estimatedDuration).toBe(5);
      expect(result.conflicts).toBeInstanceOf(Array);
      expect(result.adaptations).toBeInstanceOf(Array);

      expect(mockScheduler.findOptimalInterventionTime).toHaveBeenCalledWith(userId, intervention);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Intervention scheduled successfully',
        expect.objectContaining({
          userId,
          interventionId: result.interventionId
        })
      );
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

      mockScheduler.findOptimalInterventionTime.mockResolvedValue({
        recommendedTime: moment().add(30, 'minutes').toDate(),
        confidence: 0.75,
        reasoning: ['Optimal timing for productivity break'],
        alternativeTimes: [],
        contextFactors: []
      });

      const result = await interventionEngine.scheduleIntervention(userId, intervention);

      expect(result.success).toBe(true);
      expect(result.estimatedDuration).toBe(3);
    });

    it('should throw SchedulingError for invalid intervention plan', async () => {
      const userId = 'user789';
      const invalidIntervention = {
        // Missing required fields
        deliveryMethod: 'VISUAL',
        timing: {
          preferredTime: new Date(),
          flexibility: 10,
          recurring: false
        }
      } as InterventionPlan;

      await expect(interventionEngine.scheduleIntervention(userId, invalidIntervention))
        .rejects.toThrow(SchedulingError);
    });

    it('should handle scheduler errors', async () => {
      const userId = 'user101';
      const intervention: InterventionPlan = {
        type: 'MOVEMENT_PROMPT',
        deliveryMethod: 'HAPTIC',
        timing: {
          preferredTime: new Date(),
          flexibility: 5,
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

      mockScheduler.findOptimalInterventionTime.mockRejectedValue(new Error('No available time slots'));

      await expect(interventionEngine.scheduleIntervention(userId, intervention))
        .rejects.toThrow(SchedulingError);
    });
  });

  describe('deliverIntervention', () => {
    it('should successfully deliver a scheduled intervention', async () => {
      const userId = 'user123';
      const interventionId = 'intervention_123';

      // First schedule an intervention
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

      mockScheduler.findOptimalInterventionTime.mockResolvedValue({
        recommendedTime: new Date(),
        confidence: 0.8,
        reasoning: [],
        alternativeTimes: [],
        contextFactors: []
      });

      const scheduleResult = await interventionEngine.scheduleIntervention(userId, intervention);
      
      // Now deliver the intervention
      const deliveryResult = await interventionEngine.deliverIntervention(userId, scheduleResult.interventionId);

      expect(deliveryResult).toBeDefined();
      expect(deliveryResult.success).toBe(true);
      expect(deliveryResult.deliveryId).toBeDefined();
      expect(deliveryResult.deliveredAt).toBeInstanceOf(Date);
      expect(deliveryResult.method).toBe('VISUAL');
    });

    it('should throw error for non-existent intervention', async () => {
      const userId = 'user456';
      const nonExistentId = 'non_existent_intervention';

      await expect(interventionEngine.deliverIntervention(userId, nonExistentId))
        .rejects.toThrow(InterventionEngineError);
    });

    it('should handle intervention in wrong status', async () => {
      const userId = 'user789';
      
      // Schedule and then cancel an intervention
      const intervention: InterventionPlan = {
        type: 'BREAK_REMINDER',
        deliveryMethod: 'AUDIO',
        timing: {
          preferredTime: new Date(),
          flexibility: 5,
          recurring: false
        },
        personalization: {
          urgency: 'low',
          adaptToContext: true,
          userPreferences: {}
        },
        duration: 3,
        priority: 0.6
      };

      mockScheduler.findOptimalInterventionTime.mockResolvedValue({
        recommendedTime: new Date(),
        confidence: 0.7,
        reasoning: [],
        alternativeTimes: [],
        contextFactors: []
      });

      const scheduleResult = await interventionEngine.scheduleIntervention(userId, intervention);
      await interventionEngine.cancelIntervention(userId, scheduleResult.interventionId);

      // Try to deliver cancelled intervention
      await expect(interventionEngine.deliverIntervention(userId, scheduleResult.interventionId))
        .rejects.toThrow(InterventionEngineError);
    });
  });

  describe('cancelIntervention', () => {
    it('should successfully cancel a scheduled intervention', async () => {
      const userId = 'user123';
      const intervention: InterventionPlan = {
        type: 'HYDRATION_REMINDER',
        deliveryMethod: 'VISUAL',
        timing: {
          preferredTime: moment().add(1, 'hour').toDate(),
          flexibility: 20,
          recurring: false
        },
        personalization: {
          urgency: 'low',
          adaptToContext: true,
          userPreferences: {}
        },
        duration: 2,
        priority: 0.5
      };

      mockScheduler.findOptimalInterventionTime.mockResolvedValue({
        recommendedTime: moment().add(1, 'hour').toDate(),
        confidence: 0.6,
        reasoning: [],
        alternativeTimes: [],
        contextFactors: []
      });

      const scheduleResult = await interventionEngine.scheduleIntervention(userId, intervention);
      const cancelResult = await interventionEngine.cancelIntervention(userId, scheduleResult.interventionId);

      expect(cancelResult).toBeDefined();
      expect(cancelResult.success).toBe(true);
      expect(cancelResult.interventionId).toBe(scheduleResult.interventionId);
      expect(cancelResult.cancelledAt).toBeInstanceOf(Date);
      expect(cancelResult.reason).toBe('User requested cancellation');
      expect(cancelResult.rescheduled).toBe(false);
    });

    it('should throw error for non-existent intervention', async () => {
      const userId = 'user456';
      const nonExistentId = 'non_existent_intervention';

      await expect(interventionEngine.cancelIntervention(userId, nonExistentId))
        .rejects.toThrow(InterventionEngineError);
    });
  });

  describe('rescheduleIntervention', () => {
    it('should successfully reschedule an intervention', async () => {
      const userId = 'user123';
      const intervention: InterventionPlan = {
        type: 'MOVEMENT_PROMPT',
        deliveryMethod: 'HAPTIC',
        timing: {
          preferredTime: moment().add(1, 'hour').toDate(),
          flexibility: 15,
          recurring: false
        },
        personalization: {
          urgency: 'medium',
          adaptToContext: true,
          userPreferences: {}
        },
        duration: 3,
        priority: 0.7
      };

      const newTiming: InterventionTiming = {
        preferredTime: moment().add(2, 'hours').toDate(),
        flexibility: 10,
        recurring: false
      };

      mockScheduler.findOptimalInterventionTime.mockResolvedValueOnce({
        recommendedTime: moment().add(1, 'hour').toDate(),
        confidence: 0.7,
        reasoning: [],
        alternativeTimes: [],
        contextFactors: []
      }).mockResolvedValueOnce({
        recommendedTime: moment().add(2, 'hours').toDate(),
        confidence: 0.8,
        reasoning: [],
        alternativeTimes: [],
        contextFactors: []
      });

      const originalSchedule = await interventionEngine.scheduleIntervention(userId, intervention);
      const rescheduleResult = await interventionEngine.rescheduleIntervention(
        userId,
        originalSchedule.interventionId,
        newTiming
      );

      expect(rescheduleResult).toBeDefined();
      expect(rescheduleResult.success).toBe(true);
      expect(rescheduleResult.interventionId).not.toBe(originalSchedule.interventionId);
      expect(rescheduleResult.scheduledTime).toEqual(newTiming.preferredTime);
    });
  });

  describe('trackInterventionEffectiveness', () => {
    it('should track intervention effectiveness', async () => {
      const userId = 'user123';
      const interventionId = 'intervention_123';
      const outcome: InterventionOutcome = {
        effectivenessScore: 4.2,
        userFeedback: 'Very helpful for stress reduction',
        biometricImpact: {
          stressReduction: 0.3,
          energyIncrease: 0.1,
          focusImprovement: 0.2,
          moodImprovement: 0.4
        },
        completedAt: new Date(),
        userSatisfaction: 4.5
      };

      await expect(interventionEngine.trackInterventionEffectiveness(userId, interventionId, outcome))
        .resolves.not.toThrow();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Intervention effectiveness tracked',
        expect.objectContaining({
          userId,
          interventionId,
          effectiveness: outcome.effectivenessScore
        })
      );
    });
  });

  describe('getInterventionHistory', () => {
    it('should return intervention history for user', async () => {
      const userId = 'user123';

      const history = await interventionEngine.getInterventionHistory(userId);

      expect(history).toBeInstanceOf(Array);
    });

    it('should filter history by time range', async () => {
      const userId = 'user456';
      const timeRange: TimeRange = {
        startTime: moment().subtract(1, 'week').toDate(),
        endTime: new Date()
      };

      const history = await interventionEngine.getInterventionHistory(userId, timeRange);

      expect(history).toBeInstanceOf(Array);
    });
  });

  describe('analyzeInterventionPatterns', () => {
    it('should analyze intervention patterns for user with history', async () => {
      const userId = 'user123';

      // First create some intervention history
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

      mockScheduler.findOptimalInterventionTime.mockResolvedValue({
        recommendedTime: new Date(),
        confidence: 0.8,
        reasoning: [],
        alternativeTimes: [],
        contextFactors: []
      });

      await interventionEngine.scheduleIntervention(userId, intervention);

      const patterns = await interventionEngine.analyzeInterventionPatterns(userId);

      expect(patterns).toBeDefined();
      expect(patterns.userId).toBe(userId);
      expect(patterns.patterns).toBeDefined();
      expect(patterns.insights).toBeInstanceOf(Array);
      expect(patterns.recommendations).toBeInstanceOf(Array);
      expect(patterns.confidence).toBeGreaterThanOrEqual(0);
      expect(patterns.analysisDate).toBeInstanceOf(Date);
    });

    it('should throw error for user with no history', async () => {
      const userId = 'user_no_history';

      await expect(interventionEngine.analyzeInterventionPatterns(userId))
        .rejects.toThrow(InterventionEngineError);
    });
  });

  describe('triggerEmergencyIntervention', () => {
    it('should trigger emergency intervention for critical severity', async () => {
      const userId = 'user123';
      const severity: EmergencySeverity = 'CRITICAL';

      // Mock emergency handler response
      mockEmergencyHandler.handleEmergency.mockResolvedValue({
        emergencyId: 'emergency_123',
        severity: 'CRITICAL',
        responseTime: new Date(),
        actionsInitiated: ['Contact emergency services', 'Notify emergency contacts'],
        emergencyServicesContacted: true,
        supportNotified: true,
        followUpRequired: true,
        estimatedResolutionTime: moment().add(4, 'hours').toDate()
      });

      mockScheduler.findOptimalInterventionTime.mockResolvedValue({
        recommendedTime: new Date(),
        confidence: 1.0,
        reasoning: ['Emergency intervention'],
        alternativeTimes: [],
        contextFactors: []
      });

      const response = await interventionEngine.triggerEmergencyIntervention(userId, severity);

      expect(response).toBeDefined();
      expect(response.severity).toBe('CRITICAL');
      expect(response.emergencyServicesContacted).toBe(true);
      expect(response.supportNotified).toBe(true);
      expect(response.followUpRequired).toBe(true);

      expect(mockEmergencyHandler.handleEmergency).toHaveBeenCalledWith(userId, severity);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Emergency intervention triggered',
        expect.objectContaining({
          userId,
          severity
        })
      );
    });

    it('should handle medium severity emergency', async () => {
      const userId = 'user456';
      const severity: EmergencySeverity = 'MEDIUM';

      mockEmergencyHandler.handleEmergency.mockResolvedValue({
        emergencyId: 'emergency_456',
        severity: 'MEDIUM',
        responseTime: new Date(),
        actionsInitiated: ['Notify team lead', 'Suggest break'],
        emergencyServicesContacted: false,
        supportNotified: true,
        followUpRequired: false,
        estimatedResolutionTime: moment().add(1, 'hour').toDate()
      });

      mockScheduler.findOptimalInterventionTime.mockResolvedValue({
        recommendedTime: new Date(),
        confidence: 1.0,
        reasoning: ['Emergency intervention'],
        alternativeTimes: [],
        contextFactors: []
      });

      const response = await interventionEngine.triggerEmergencyIntervention(userId, severity);

      expect(response.severity).toBe('MEDIUM');
      expect(response.emergencyServicesContacted).toBe(false);
      expect(response.supportNotified).toBe(true);
    });

    it('should handle emergency handler errors', async () => {
      const userId = 'user789';
      const severity: EmergencySeverity = 'HIGH';

      mockEmergencyHandler.handleEmergency.mockRejectedValue(new Error('Emergency system unavailable'));

      await expect(interventionEngine.triggerEmergencyIntervention(userId, severity))
        .rejects.toThrow(EmergencyError);
    });
  });

  describe('escalateIntervention', () => {
    it('should escalate intervention successfully', async () => {
      const interventionId = 'intervention_123';
      const reason = 'User not responding to critical wellness alerts';

      mockEmergencyHandler.escalateIntervention.mockResolvedValue({
        success: true,
        escalationLevel: 'manager',
        notifiedParties: ['manager_123'],
        escalationTime: new Date(),
        followUpRequired: true
      });

      // First schedule an intervention to escalate
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
          urgency: 'high',
          adaptToContext: true,
          userPreferences: {}
        },
        duration: 5,
        priority: 0.9
      };

      mockScheduler.findOptimalInterventionTime.mockResolvedValue({
        recommendedTime: new Date(),
        confidence: 0.8,
        reasoning: [],
        alternativeTimes: [],
        contextFactors: []
      });

      const scheduleResult = await interventionEngine.scheduleIntervention(userId, intervention);
      const escalationResult = await interventionEngine.escalateIntervention(scheduleResult.interventionId, reason);

      expect(escalationResult).toBeDefined();
      expect(escalationResult.success).toBe(true);
      expect(escalationResult.escalationLevel).toBe('manager');
      expect(escalationResult.followUpRequired).toBe(true);

      expect(mockEmergencyHandler.escalateIntervention).toHaveBeenCalledWith(
        userId,
        scheduleResult.interventionId,
        reason
      );
    });

    it('should throw error for non-existent intervention', async () => {
      const nonExistentId = 'non_existent_intervention';
      const reason = 'Test escalation';

      await expect(interventionEngine.escalateIntervention(nonExistentId, reason))
        .rejects.toThrow(InterventionEngineError);
    });
  });

  describe('notifyEmergencyContacts', () => {
    it('should notify emergency contacts successfully', async () => {
      const userId = 'user123';
      const situation: EmergencySituation = {
        userId,
        situationType: 'medical',
        severity: 'HIGH',
        description: 'High stress levels detected with concerning biometric readings',
        indicators: [
          {
            type: 'biometric',
            severity: 0.9,
            description: 'Heart rate spike detected',
            timestamp: new Date(),
            source: 'biometric-service'
          }
        ],
        timestamp: new Date()
      };

      mockEmergencyHandler.notifyEmergencyContacts.mockResolvedValue({
        success: true,
        contactsNotified: [
          {
            name: 'Emergency Contact 1',
            relationship: 'spouse',
            phone: '+1234567890',
            priority: 1
          }
        ],
        notificationMethods: ['phone', 'email'],
        deliveryTime: new Date(),
        acknowledgments: [
          {
            contactId: 'contact_1',
            acknowledgedAt: new Date(),
            method: 'phone'
          }
        ]
      });

      const result = await interventionEngine.notifyEmergencyContacts(userId, situation);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.contactsNotified).toHaveLength(1);
      expect(result.acknowledgments).toHaveLength(1);

      expect(mockEmergencyHandler.notifyEmergencyContacts).toHaveBeenCalledWith(userId, situation);
    });
  });

  describe('event emission', () => {
    it('should emit events for intervention lifecycle', async () => {
      const userId = 'user123';
      const intervention: InterventionPlan = {
        type: 'BREAK_REMINDER',
        deliveryMethod: 'AUDIO',
        timing: {
          preferredTime: new Date(),
          flexibility: 5,
          recurring: false
        },
        personalization: {
          urgency: 'low',
          adaptToContext: true,
          userPreferences: {}
        },
        duration: 3,
        priority: 0.6
      };

      mockScheduler.findOptimalInterventionTime.mockResolvedValue({
        recommendedTime: new Date(),
        confidence: 0.7,
        reasoning: [],
        alternativeTimes: [],
        contextFactors: []
      });

      const scheduledSpy = jest.fn();
      const deliveredSpy = jest.fn();
      const cancelledSpy = jest.fn();

      interventionEngine.on('interventionScheduled', scheduledSpy);
      interventionEngine.on('interventionDelivered', deliveredSpy);
      interventionEngine.on('interventionCancelled', cancelledSpy);

      // Schedule intervention
      const scheduleResult = await interventionEngine.scheduleIntervention(userId, intervention);
      expect(scheduledSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          interventionId: scheduleResult.interventionId
        })
      );

      // Deliver intervention
      await interventionEngine.deliverIntervention(userId, scheduleResult.interventionId);
      expect(deliveredSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          interventionId: scheduleResult.interventionId
        })
      );

      // Cancel intervention (create a new one to cancel)
      const newScheduleResult = await interventionEngine.scheduleIntervention(userId, intervention);
      await interventionEngine.cancelIntervention(userId, newScheduleResult.interventionId);
      expect(cancelledSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          interventionId: newScheduleResult.interventionId
        })
      );
    });
  });
});