import { EmergencyHandler } from '../services/EmergencyHandler';
import { EmergencySeverity } from '@devflow/shared-types';
import {
  EmergencyIndicator,
  EmergencySituation,
  EmergencyError
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

describe('EmergencyHandler', () => {
  let emergencyHandler: EmergencyHandler;

  beforeEach(() => {
    emergencyHandler = new EmergencyHandler(mockLogger);
    jest.clearAllMocks();
  });

  describe('detectEmergencySituation', () => {
    it('should detect emergency with critical indicators', async () => {
      const userId = 'user123';
      const indicators: EmergencyIndicator[] = [
        {
          type: 'biometric',
          severity: 0.98,
          description: 'Critical heart rate spike detected',
          timestamp: new Date(),
          source: 'biometric-service'
        },
        {
          type: 'behavioral',
          severity: 0.85,
          description: 'Erratic typing patterns detected',
          timestamp: new Date(),
          source: 'context-engine'
        }
      ];

      const assessment = await emergencyHandler.detectEmergencySituation(userId, indicators);

      expect(assessment).toBeDefined();
      expect(assessment.isEmergency).toBe(true);
      expect(assessment.severity).toBe('CRITICAL');
      expect(assessment.confidence).toBeGreaterThan(0.8);
      expect(assessment.indicators).toEqual(indicators);
      expect(assessment.recommendedActions).toBeInstanceOf(Array);
      expect(assessment.timeToAction).toBe(0); // Immediate for critical
    });

    it('should detect high severity emergency', async () => {
      const userId = 'user456';
      const indicators: EmergencyIndicator[] = [
        {
          type: 'biometric',
          severity: 0.85,
          description: 'Elevated stress levels sustained',
          timestamp: new Date(),
          source: 'biometric-service'
        },
        {
          type: 'biometric',
          severity: 0.82,
          description: 'Heart rate variability concerning',
          timestamp: new Date(),
          source: 'biometric-service'
        }
      ];

      const assessment = await emergencyHandler.detectEmergencySituation(userId, indicators);

      expect(assessment.isEmergency).toBe(true);
      expect(assessment.severity).toBe('HIGH');
      expect(assessment.timeToAction).toBe(1); // 1 minute for high
    });

    it('should not detect emergency with low severity indicators', async () => {
      const userId = 'user789';
      const indicators: EmergencyIndicator[] = [
        {
          type: 'behavioral',
          severity: 0.3,
          description: 'Slightly elevated typing speed',
          timestamp: new Date(),
          source: 'context-engine'
        }
      ];

      const assessment = await emergencyHandler.detectEmergencySituation(userId, indicators);

      expect(assessment.isEmergency).toBe(false);
      expect(assessment.severity).toBe('LOW');
      expect(assessment.timeToAction).toBe(5); // 5 minutes for low
    });

    it('should handle medium severity situation', async () => {
      const userId = 'user101';
      const indicators: EmergencyIndicator[] = [
        {
          type: 'self_reported',
          severity: 0.7,
          description: 'User reported feeling overwhelmed',
          timestamp: new Date(),
          source: 'user-interface'
        }
      ];

      const assessment = await emergencyHandler.detectEmergencySituation(userId, indicators);

      expect(assessment.severity).toBe('MEDIUM');
      expect(assessment.timeToAction).toBe(2); // 2 minutes for medium
    });
  });

  describe('classifyEmergencySeverity', () => {
    it('should classify medical situation as high severity', async () => {
      const situation: EmergencySituation = {
        userId: 'user123',
        situationType: 'medical',
        severity: 'MEDIUM', // Will be overridden
        description: 'Medical emergency detected',
        indicators: [
          {
            type: 'biometric',
            severity: 0.7,
            description: 'Abnormal heart rate pattern',
            timestamp: new Date(),
            source: 'biometric-service'
          }
        ],
        timestamp: new Date()
      };

      const severity = await emergencyHandler.classifyEmergencySeverity(situation);

      expect(severity).toBe('HIGH');
    });

    it('should classify psychological situation as medium severity', async () => {
      const situation: EmergencySituation = {
        userId: 'user456',
        situationType: 'psychological',
        severity: 'LOW',
        description: 'Mental health concern detected',
        indicators: [
          {
            type: 'behavioral',
            severity: 0.6,
            description: 'Stress indicators elevated',
            timestamp: new Date(),
            source: 'wellness-intelligence'
          }
        ],
        timestamp: new Date()
      };

      const severity = await emergencyHandler.classifyEmergencySeverity(situation);

      expect(severity).toBe('MEDIUM');
    });

    it('should escalate to critical with multiple high severity indicators', async () => {
      const situation: EmergencySituation = {
        userId: 'user789',
        situationType: 'safety',
        severity: 'LOW',
        description: 'Safety concern detected',
        indicators: [
          {
            type: 'external',
            severity: 0.97,
            description: 'Critical safety alert',
            timestamp: new Date(),
            source: 'safety-system'
          }
        ],
        timestamp: new Date()
      };

      const severity = await emergencyHandler.classifyEmergencySeverity(situation);

      expect(severity).toBe('CRITICAL');
    });
  });

  describe('validateEmergencyTriggers', () => {
    it('should validate emergency triggers for user', async () => {
      const userId = 'user123';

      const validation = await emergencyHandler.validateEmergencyTriggers(userId);

      expect(validation).toBeDefined();
      expect(validation.userId).toBe(userId);
      expect(validation.triggers).toBeInstanceOf(Array);
      expect(validation.triggers.length).toBeGreaterThan(0);
      expect(validation.validationResults).toBeInstanceOf(Array);
      expect(validation.recommendedUpdates).toBeInstanceOf(Array);
      expect(validation.lastValidated).toBeInstanceOf(Date);

      // Check that common triggers are present
      const triggerTypes = validation.triggers.map(t => t.id);
      expect(triggerTypes).toContain('heart_rate_spike');
      expect(triggerTypes).toContain('stress_level_critical');
      expect(triggerTypes).toContain('panic_button');
    });

    it('should validate all triggers as valid by default', async () => {
      const userId = 'user456';

      const validation = await emergencyHandler.validateEmergencyTriggers(userId);

      validation.validationResults.forEach(result => {
        expect(result.isValid).toBe(true);
        expect(result.lastValidated).toBeInstanceOf(Date);
        expect(result.issues).toBeInstanceOf(Array);
      });
    });
  });

  describe('executeEmergencyProtocol', () => {
    it('should execute critical emergency protocol', async () => {
      const userId = 'user123';
      const severity: EmergencySeverity = 'CRITICAL';

      const execution = await emergencyHandler.executeEmergencyProtocol(userId, severity);

      expect(execution).toBeDefined();
      expect(execution.protocolId).toBeDefined();
      expect(execution.userId).toBe(userId);
      expect(execution.executionSteps).toBeInstanceOf(Array);
      expect(execution.executionSteps.length).toBeGreaterThan(0);
      expect(execution.completedSteps).toBeInstanceOf(Array);
      expect(execution.failedSteps).toBeInstanceOf(Array);
      expect(execution.executionTime).toBeInstanceOf(Date);
      expect(execution.status).toBe('in_progress');

      // Check that critical protocol steps are present
      const actions = execution.executionSteps.map(step => step.action);
      expect(actions).toContain('Contact emergency services');
      expect(actions).toContain('Notify all emergency contacts');
    });

    it('should execute high severity protocol', async () => {
      const userId = 'user456';
      const severity: EmergencySeverity = 'HIGH';

      const execution = await emergencyHandler.executeEmergencyProtocol(userId, severity);

      expect(execution.status).toBe('in_progress');
      
      const actions = execution.executionSteps.map(step => step.action);
      expect(actions).toContain('Immediate emergency intervention');
      expect(actions).toContain('Notify emergency contacts');
      expect(actions).not.toContain('Contact emergency services'); // Only for critical
    });

    it('should execute medium severity protocol', async () => {
      const userId = 'user789';
      const severity: EmergencySeverity = 'MEDIUM';

      const execution = await emergencyHandler.executeEmergencyProtocol(userId, severity);

      const actions = execution.executionSteps.map(step => step.action);
      expect(actions).toContain('Immediate stress reduction intervention');
      expect(actions).toContain('Notify team lead or manager');
    });

    it('should execute low severity protocol', async () => {
      const userId = 'user101';
      const severity: EmergencySeverity = 'LOW';

      const execution = await emergencyHandler.executeEmergencyProtocol(userId, severity);

      const actions = execution.executionSteps.map(step => step.action);
      expect(actions).toContain('Send wellness check notification');
      expect(actions).toContain('Suggest break or stress reduction');
    });

    it('should throw error for unknown severity', async () => {
      const userId = 'user123';
      const invalidSeverity = 'UNKNOWN' as EmergencySeverity;

      await expect(emergencyHandler.executeEmergencyProtocol(userId, invalidSeverity))
        .rejects.toThrow(EmergencyError);
    });
  });

  describe('contactEmergencyServices', () => {
    it('should contact medical services for medical emergency', async () => {
      const userId = 'user123';
      const situation: EmergencySituation = {
        userId,
        situationType: 'medical',
        severity: 'CRITICAL',
        description: 'Medical emergency requiring immediate attention',
        indicators: [],
        timestamp: new Date()
      };

      const response = await emergencyHandler.contactEmergencyServices(userId, situation);

      expect(response).toBeDefined();
      expect(response.serviceType).toBe('medical');
      expect(response.contacted).toBe(true);
      expect(response.responseTime).toBeInstanceOf(Date);
      expect(response.referenceNumber).toBeDefined();
      expect(response.estimatedArrival).toBeInstanceOf(Date);
      expect(response.instructions).toBeInstanceOf(Array);
      expect(response.instructions.length).toBeGreaterThan(0);
    });

    it('should contact mental health services for psychological emergency', async () => {
      const userId = 'user456';
      const situation: EmergencySituation = {
        userId,
        situationType: 'psychological',
        severity: 'HIGH',
        description: 'Mental health crisis detected',
        indicators: [],
        timestamp: new Date()
      };

      const response = await emergencyHandler.contactEmergencyServices(userId, situation);

      expect(response.serviceType).toBe('mental_health');
      expect(response.contacted).toBe(true);
    });

    it('should contact police for safety emergency', async () => {
      const userId = 'user789';
      const situation: EmergencySituation = {
        userId,
        situationType: 'safety',
        severity: 'HIGH',
        description: 'Safety threat detected',
        indicators: [],
        timestamp: new Date()
      };

      const response = await emergencyHandler.contactEmergencyServices(userId, situation);

      expect(response.serviceType).toBe('police');
      expect(response.contacted).toBe(true);
    });

    it('should provide reasonable estimated arrival time', async () => {
      const userId = 'user101';
      const situation: EmergencySituation = {
        userId,
        situationType: 'medical',
        severity: 'CRITICAL',
        description: 'Emergency situation',
        indicators: [],
        timestamp: new Date()
      };

      const response = await emergencyHandler.contactEmergencyServices(userId, situation);

      const arrivalTime = moment(response.estimatedArrival);
      const now = moment();
      const diffMinutes = arrivalTime.diff(now, 'minutes');

      expect(diffMinutes).toBeGreaterThan(0);
      expect(diffMinutes).toBeLessThan(60); // Should be within an hour
    });
  });

  describe('notifySupport', () => {
    it('should notify support for emergency situation', async () => {
      const userId = 'user123';
      const situation: EmergencySituation = {
        userId,
        situationType: 'medical',
        severity: 'HIGH',
        description: 'Medical emergency requiring support',
        indicators: [],
        timestamp: new Date()
      };

      const result = await emergencyHandler.notifySupport(userId, situation);

      expect(result).toBeDefined();
      expect(result.supportType).toBe('internal');
      expect(result.contactsNotified).toBeInstanceOf(Array);
      expect(result.notificationTime).toBeInstanceOf(Date);
      expect(result.acknowledgments).toBeInstanceOf(Array);
      expect(result.followUpScheduled).toBe(true); // High severity should schedule follow-up
    });

    it('should schedule follow-up for critical situations', async () => {
      const userId = 'user456';
      const situation: EmergencySituation = {
        userId,
        situationType: 'safety',
        severity: 'CRITICAL',
        description: 'Critical safety emergency',
        indicators: [],
        timestamp: new Date()
      };

      const result = await emergencyHandler.notifySupport(userId, situation);

      expect(result.followUpScheduled).toBe(true);
    });

    it('should not schedule follow-up for low severity situations', async () => {
      const userId = 'user789';
      const situation: EmergencySituation = {
        userId,
        situationType: 'other',
        severity: 'LOW',
        description: 'Minor concern',
        indicators: [],
        timestamp: new Date()
      };

      const result = await emergencyHandler.notifySupport(userId, situation);

      expect(result.followUpScheduled).toBe(false);
    });
  });

  describe('handleEmergency', () => {
    it('should handle critical emergency with full response', async () => {
      const userId = 'user123';
      const severity: EmergencySeverity = 'CRITICAL';

      const response = await emergencyHandler.handleEmergency(userId, severity);

      expect(response).toBeDefined();
      expect(response.emergencyId).toBeDefined();
      expect(response.severity).toBe('CRITICAL');
      expect(response.responseTime).toBeInstanceOf(Date);
      expect(response.actionsInitiated).toBeInstanceOf(Array);
      expect(response.emergencyServicesContacted).toBe(true);
      expect(response.supportNotified).toBe(true);
      expect(response.followUpRequired).toBe(true);
      expect(response.estimatedResolutionTime).toBeInstanceOf(Date);
    });

    it('should handle high emergency with appropriate response', async () => {
      const userId = 'user456';
      const severity: EmergencySeverity = 'HIGH';

      const response = await emergencyHandler.handleEmergency(userId, severity);

      expect(response.severity).toBe('HIGH');
      expect(response.emergencyServicesContacted).toBe(false); // Only for critical
      expect(response.supportNotified).toBe(true);
      expect(response.followUpRequired).toBe(true);
    });

    it('should handle medium emergency with limited response', async () => {
      const userId = 'user789';
      const severity: EmergencySeverity = 'MEDIUM';

      const response = await emergencyHandler.handleEmergency(userId, severity);

      expect(response.severity).toBe('MEDIUM');
      expect(response.emergencyServicesContacted).toBe(false);
      expect(response.supportNotified).toBe(false);
      expect(response.followUpRequired).toBe(false);
    });

    it('should provide reasonable resolution time estimates', async () => {
      const userId = 'user101';
      const severities: EmergencySeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

      for (const severity of severities) {
        const response = await emergencyHandler.handleEmergency(userId, severity);
        
        const resolutionTime = moment(response.estimatedResolutionTime);
        const now = moment();
        const diffHours = resolutionTime.diff(now, 'hours');

        expect(diffHours).toBeGreaterThan(0);
        expect(diffHours).toBeLessThan(24); // Should be within 24 hours
      }
    });
  });

  describe('escalateIntervention', () => {
    it('should escalate to emergency services for critical reasons', async () => {
      const userId = 'user123';
      const interventionId = 'intervention_123';
      const reason = 'Critical health emergency detected';

      const result = await emergencyHandler.escalateIntervention(userId, interventionId, reason);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.escalationLevel).toBe('emergency_services');
      expect(result.notifiedParties).toBeInstanceOf(Array);
      expect(result.escalationTime).toBeInstanceOf(Date);
      expect(result.followUpRequired).toBe(true);
    });

    it('should escalate to HR for health-related reasons', async () => {
      const userId = 'user456';
      const interventionId = 'intervention_456';
      const reason = 'Health and safety concern requires attention';

      const result = await emergencyHandler.escalateIntervention(userId, interventionId, reason);

      expect(result.escalationLevel).toBe('hr');
      expect(result.followUpRequired).toBe(false);
    });

    it('should escalate to manager for performance reasons', async () => {
      const userId = 'user789';
      const interventionId = 'intervention_789';
      const reason = 'Performance issues related to stress levels';

      const result = await emergencyHandler.escalateIntervention(userId, interventionId, reason);

      expect(result.escalationLevel).toBe('manager');
    });

    it('should escalate to team lead by default', async () => {
      const userId = 'user101';
      const interventionId = 'intervention_101';
      const reason = 'General concern requiring attention';

      const result = await emergencyHandler.escalateIntervention(userId, interventionId, reason);

      expect(result.escalationLevel).toBe('team_lead');
    });
  });

  describe('notifyEmergencyContacts', () => {
    it('should handle user with no emergency contacts', async () => {
      const userId = 'user_no_contacts';
      const situation: EmergencySituation = {
        userId,
        situationType: 'medical',
        severity: 'HIGH',
        description: 'Emergency situation',
        indicators: [],
        timestamp: new Date()
      };

      const result = await emergencyHandler.notifyEmergencyContacts(userId, situation);

      expect(result.success).toBe(false);
      expect(result.contactsNotified).toHaveLength(0);
      expect(result.acknowledgments).toHaveLength(0);
    });

    it('should notify emergency contacts successfully', async () => {
      const userId = 'user123';
      const situation: EmergencySituation = {
        userId,
        situationType: 'medical',
        severity: 'CRITICAL',
        description: 'Critical medical emergency',
        indicators: [],
        timestamp: new Date()
      };

      // Mock emergency contacts
      const mockContacts = [
        {
          name: 'Emergency Contact 1',
          relationship: 'spouse',
          phone: '+1234567890',
          priority: 1
        }
      ];
      
      (emergencyHandler as any).emergencyContacts.set(userId, mockContacts);

      const result = await emergencyHandler.notifyEmergencyContacts(userId, situation);

      expect(result.success).toBe(true);
      expect(result.contactsNotified).toHaveLength(1);
      expect(result.notificationMethods).toContain('phone');
      expect(result.acknowledgments).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('should handle errors in detectEmergencySituation', async () => {
      const userId = 'user123';
      const indicators: EmergencyIndicator[] = [];

      // Mock internal method to throw error
      const originalMethod = emergencyHandler['analyzeEmergencyIndicators'];
      emergencyHandler['analyzeEmergencyIndicators'] = jest.fn().mockImplementation(() => {
        throw new Error('Analysis failed');
      });

      await expect(emergencyHandler.detectEmergencySituation(userId, indicators))
        .rejects.toThrow('Analysis failed');

      // Restore original method
      emergencyHandler['analyzeEmergencyIndicators'] = originalMethod;
    });

    it('should handle errors in executeEmergencyProtocol', async () => {
      const userId = 'user456';
      const severity: EmergencySeverity = 'HIGH';

      // Mock internal method to throw error
      const originalMethod = emergencyHandler['executeProtocolSteps'];
      emergencyHandler['executeProtocolSteps'] = jest.fn().mockRejectedValue(new Error('Protocol execution failed'));

      await expect(emergencyHandler.executeEmergencyProtocol(userId, severity))
        .rejects.toThrow('Protocol execution failed');

      // Restore original method
      emergencyHandler['executeProtocolSteps'] = originalMethod;
    });
  });

  describe('logging', () => {
    it('should log emergency detection', async () => {
      const userId = 'user123';
      const indicators: EmergencyIndicator[] = [
        {
          type: 'biometric',
          severity: 0.9,
          description: 'High severity indicator',
          timestamp: new Date(),
          source: 'test'
        }
      ];

      await emergencyHandler.detectEmergencySituation(userId, indicators);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Emergency situation assessment completed',
        expect.objectContaining({
          userId,
          isEmergency: true,
          severity: 'HIGH'
        })
      );
    });

    it('should log emergency protocol execution', async () => {
      const userId = 'user456';
      const severity: EmergencySeverity = 'MEDIUM';

      await emergencyHandler.executeEmergencyProtocol(userId, severity);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Emergency protocol execution initiated',
        expect.objectContaining({
          userId,
          severity
        })
      );
    });

    it('should log emergency service contact', async () => {
      const userId = 'user789';
      const situation: EmergencySituation = {
        userId,
        situationType: 'medical',
        severity: 'CRITICAL',
        description: 'Test emergency',
        indicators: [],
        timestamp: new Date()
      };

      await emergencyHandler.contactEmergencyServices(userId, situation);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Emergency services contacted',
        expect.objectContaining({
          userId,
          serviceType: 'medical'
        })
      );
    });
  });
});