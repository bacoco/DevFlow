import {
  EmergencyResponse,
  EmergencySeverity
} from '@devflow/shared-types';
import {
  EmergencyHandler as IEmergencyHandler,
  EmergencyIndicator,
  EmergencyAssessment,
  EmergencySituation,
  TriggerValidation,
  ProtocolExecution,
  EmergencyServiceResponse,
  SupportNotificationResult,
  EscalationResult,
  NotificationResult,
  EmergencyContact,
  EmergencyError
} from '../types';
import { Logger } from 'winston';
import moment from 'moment';

export class EmergencyHandler implements IEmergencyHandler {
  private logger: Logger;
  private emergencyProtocols: Map<EmergencySeverity, EmergencyProtocol> = new Map();
  private emergencyContacts: Map<string, EmergencyContact[]> = new Map();
  private activeEmergencies: Map<string, ActiveEmergency> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
    this.initializeEmergencyProtocols();
  }

  private initializeEmergencyProtocols(): void {
    // Define emergency protocols for different severity levels
    this.emergencyProtocols.set('LOW', {
      severity: 'LOW',
      responseTime: 5, // 5 minutes
      actions: [
        { action: 'Send wellness check notification', priority: 1, timeframe: 'immediate' },
        { action: 'Suggest break or stress reduction', priority: 2, timeframe: '5 minutes' },
        { action: 'Monitor for escalation', priority: 3, timeframe: 'ongoing' }
      ],
      escalationThreshold: 15, // minutes
      requiresHumanIntervention: false
    });

    this.emergencyProtocols.set('MEDIUM', {
      severity: 'MEDIUM',
      responseTime: 2, // 2 minutes
      actions: [
        { action: 'Immediate stress reduction intervention', priority: 1, timeframe: 'immediate' },
        { action: 'Notify team lead or manager', priority: 2, timeframe: '2 minutes' },
        { action: 'Suggest immediate break', priority: 3, timeframe: 'immediate' },
        { action: 'Monitor biometric indicators', priority: 4, timeframe: 'ongoing' }
      ],
      escalationThreshold: 10, // minutes
      requiresHumanIntervention: true
    });

    this.emergencyProtocols.set('HIGH', {
      severity: 'HIGH',
      responseTime: 1, // 1 minute
      actions: [
        { action: 'Immediate emergency intervention', priority: 1, timeframe: 'immediate' },
        { action: 'Notify emergency contacts', priority: 2, timeframe: '1 minute' },
        { action: 'Alert management and HR', priority: 3, timeframe: '2 minutes' },
        { action: 'Prepare for potential escalation', priority: 4, timeframe: '5 minutes' }
      ],
      escalationThreshold: 5, // minutes
      requiresHumanIntervention: true
    });

    this.emergencyProtocols.set('CRITICAL', {
      severity: 'CRITICAL',
      responseTime: 0, // Immediate
      actions: [
        { action: 'Contact emergency services', priority: 1, timeframe: 'immediate' },
        { action: 'Notify all emergency contacts', priority: 2, timeframe: 'immediate' },
        { action: 'Alert security/facilities', priority: 3, timeframe: '1 minute' },
        { action: 'Document incident', priority: 4, timeframe: '5 minutes' }
      ],
      escalationThreshold: 0, // No threshold - already critical
      requiresHumanIntervention: true
    });

    this.logger.info('Emergency protocols initialized');
  }

  async detectEmergencySituation(
    userId: string,
    indicators: EmergencyIndicator[]
  ): Promise<EmergencyAssessment> {
    try {
      this.logger.info(`Detecting emergency situation`, { userId, indicatorCount: indicators.length });

      // Analyze indicators to determine if this constitutes an emergency
      const assessment = this.analyzeEmergencyIndicators(indicators);
      
      // Calculate overall severity
      const severity = this.calculateEmergencySeverity(indicators);
      
      // Determine confidence based on indicator quality and quantity
      const confidence = this.calculateEmergencyConfidence(indicators);

      // Generate recommended actions
      const recommendedActions = this.generateEmergencyActions(severity, indicators);

      // Calculate time to action
      const timeToAction = this.calculateTimeToAction(severity);

      const emergencyAssessment: EmergencyAssessment = {
        isEmergency: assessment.isEmergency,
        severity,
        confidence,
        indicators,
        recommendedActions,
        timeToAction
      };

      this.logger.info(`Emergency situation assessment completed`, { 
        userId, 
        isEmergency: assessment.isEmergency,
        severity,
        confidence 
      });

      return emergencyAssessment;
    } catch (error) {
      this.logger.error(`Error detecting emergency situation`, { userId, error: error.message });
      throw error;
    }
  }

  async classifyEmergencySeverity(situation: EmergencySituation): Promise<EmergencySeverity> {
    try {
      this.logger.info(`Classifying emergency severity`, { 
        userId: situation.userId, 
        situationType: situation.situationType 
      });

      let severity: EmergencySeverity = 'LOW';

      // Analyze situation type
      if (situation.situationType === 'medical') {
        severity = 'HIGH'; // Medical situations are inherently serious
      } else if (situation.situationType === 'psychological') {
        severity = 'MEDIUM'; // Mental health situations need attention
      } else if (situation.situationType === 'safety') {
        severity = 'HIGH'; // Safety situations are critical
      }

      // Adjust based on indicators
      const highSeverityIndicators = situation.indicators.filter(i => i.severity > 0.8);
      const criticalIndicators = situation.indicators.filter(i => i.severity > 0.95);

      if (criticalIndicators.length > 0) {
        severity = 'CRITICAL';
      } else if (highSeverityIndicators.length >= 2) {
        severity = 'HIGH';
      } else if (situation.indicators.some(i => i.severity > 0.6)) {
        severity = 'MEDIUM';
      }

      this.logger.info(`Emergency severity classified`, { 
        userId: situation.userId, 
        severity,
        criticalIndicators: criticalIndicators.length,
        highSeverityIndicators: highSeverityIndicators.length
      });

      return severity;
    } catch (error) {
      this.logger.error(`Error classifying emergency severity`, { 
        userId: situation.userId, 
        error: error.message 
      });
      throw error;
    }
  }

  async validateEmergencyTriggers(userId: string): Promise<TriggerValidation> {
    try {
      this.logger.info(`Validating emergency triggers`, { userId });

      // In a real implementation, this would validate:
      // - Biometric thresholds
      // - Behavioral pattern triggers
      // - Self-reported emergency indicators
      // - External system alerts

      const triggers = [
        {
          id: 'heart_rate_spike',
          type: 'biometric',
          threshold: 150, // BPM
          enabled: true,
          lastTriggered: null
        },
        {
          id: 'stress_level_critical',
          type: 'biometric',
          threshold: 95, // Percentage
          enabled: true,
          lastTriggered: null
        },
        {
          id: 'panic_button',
          type: 'self_reported',
          threshold: 1, // Any activation
          enabled: true,
          lastTriggered: null
        }
      ];

      const validationResults = triggers.map(trigger => ({
        triggerId: trigger.id,
        isValid: true,
        lastValidated: new Date(),
        issues: []
      }));

      const validation: TriggerValidation = {
        userId,
        triggers,
        validationResults,
        recommendedUpdates: [],
        lastValidated: new Date()
      };

      this.logger.info(`Emergency trigger validation completed`, { 
        userId, 
        triggerCount: triggers.length 
      });

      return validation;
    } catch (error) {
      this.logger.error(`Error validating emergency triggers`, { userId, error: error.message });
      throw error;
    }
  }

  async executeEmergencyProtocol(
    userId: string,
    severity: EmergencySeverity
  ): Promise<ProtocolExecution> {
    try {
      this.logger.warn(`Executing emergency protocol`, { userId, severity });

      const protocol = this.emergencyProtocols.get(severity);
      if (!protocol) {
        throw new EmergencyError(`No protocol found for severity: ${severity}`, userId);
      }

      const protocolId = `protocol_${userId}_${severity}_${Date.now()}`;
      const executionSteps = protocol.actions.map(action => ({
        stepId: `step_${action.priority}`,
        action: action.action,
        priority: action.priority,
        timeframe: action.timeframe,
        status: 'pending' as const,
        startTime: null,
        endTime: null
      }));

      const execution: ProtocolExecution = {
        protocolId,
        userId,
        executionSteps,
        completedSteps: [],
        failedSteps: [],
        executionTime: new Date(),
        status: 'in_progress'
      };

      // Create active emergency record
      const activeEmergency: ActiveEmergency = {
        emergencyId: protocolId,
        userId,
        severity,
        startTime: new Date(),
        status: 'active',
        protocolExecution: execution
      };

      this.activeEmergencies.set(protocolId, activeEmergency);

      // Execute protocol steps
      await this.executeProtocolSteps(execution, protocol);

      this.logger.warn(`Emergency protocol execution initiated`, { 
        userId, 
        severity, 
        protocolId 
      });

      return execution;
    } catch (error) {
      this.logger.error(`Error executing emergency protocol`, { userId, severity, error: error.message });
      throw error;
    }
  }

  async contactEmergencyServices(
    userId: string,
    situation: EmergencySituation
  ): Promise<EmergencyServiceResponse> {
    try {
      this.logger.warn(`Contacting emergency services`, { 
        userId, 
        situationType: situation.situationType,
        severity: situation.severity
      });

      // Determine appropriate emergency service
      let serviceType: 'medical' | 'police' | 'fire' | 'mental_health' = 'medical';
      
      if (situation.situationType === 'medical') {
        serviceType = 'medical';
      } else if (situation.situationType === 'psychological') {
        serviceType = 'mental_health';
      } else if (situation.situationType === 'safety') {
        serviceType = 'police';
      }

      // In a real implementation, this would:
      // - Integrate with emergency service APIs
      // - Make actual emergency calls
      // - Provide location information
      // - Send situation details

      const response: EmergencyServiceResponse = {
        serviceType,
        contacted: true,
        responseTime: new Date(),
        referenceNumber: `EMG_${Date.now()}`,
        estimatedArrival: moment().add(15, 'minutes').toDate(),
        instructions: [
          'Stay calm and remain in current location',
          'Keep communication lines open',
          'Provide assistance as needed',
          'Document the situation'
        ]
      };

      this.logger.warn(`Emergency services contacted`, { 
        userId, 
        serviceType, 
        referenceNumber: response.referenceNumber 
      });

      return response;
    } catch (error) {
      this.logger.error(`Error contacting emergency services`, { userId, error: error.message });
      throw error;
    }
  }

  async notifySupport(
    userId: string,
    situation: EmergencySituation
  ): Promise<SupportNotificationResult> {
    try {
      this.logger.warn(`Notifying support`, { userId, situationType: situation.situationType });

      // Determine support contacts based on situation
      const supportContacts = this.determineSupportContacts(situation);

      // Send notifications
      const notifications = await Promise.all(
        supportContacts.map(contact => this.sendSupportNotification(contact, situation))
      );

      const result: SupportNotificationResult = {
        supportType: 'internal',
        contactsNotified: supportContacts,
        notificationTime: new Date(),
        acknowledgments: notifications.filter(n => n.acknowledged).map(n => ({
          contactId: n.contactId,
          acknowledgedAt: n.acknowledgedAt,
          response: n.response
        })),
        followUpScheduled: situation.severity === 'HIGH' || situation.severity === 'CRITICAL'
      };

      this.logger.warn(`Support notifications sent`, { 
        userId, 
        contactsNotified: result.contactsNotified.length 
      });

      return result;
    } catch (error) {
      this.logger.error(`Error notifying support`, { userId, error: error.message });
      throw error;
    }
  }

  // Methods called by InterventionEngine
  async handleEmergency(userId: string, severity: EmergencySeverity): Promise<EmergencyResponse> {
    try {
      this.logger.warn(`Handling emergency`, { userId, severity });

      // Execute emergency protocol
      const protocolExecution = await this.executeEmergencyProtocol(userId, severity);

      // Create emergency situation
      const situation: EmergencySituation = {
        userId,
        situationType: 'medical', // Default - would be determined by context
        severity,
        description: `Emergency situation detected with severity: ${severity}`,
        indicators: [],
        timestamp: new Date()
      };

      // Notify appropriate parties based on severity
      let emergencyServiceResponse: EmergencyServiceResponse | undefined;
      let supportNotificationResult: SupportNotificationResult | undefined;

      if (severity === 'CRITICAL') {
        emergencyServiceResponse = await this.contactEmergencyServices(userId, situation);
      }

      if (severity === 'HIGH' || severity === 'CRITICAL') {
        supportNotificationResult = await this.notifySupport(userId, situation);
      }

      const response: EmergencyResponse = {
        emergencyId: protocolExecution.protocolId,
        severity,
        responseTime: new Date(),
        actionsInitiated: protocolExecution.executionSteps.map(step => step.action),
        emergencyServicesContacted: !!emergencyServiceResponse,
        supportNotified: !!supportNotificationResult,
        followUpRequired: severity === 'HIGH' || severity === 'CRITICAL',
        estimatedResolutionTime: this.calculateEstimatedResolutionTime(severity)
      };

      this.logger.warn(`Emergency handled`, { 
        userId, 
        severity, 
        emergencyId: response.emergencyId 
      });

      return response;
    } catch (error) {
      this.logger.error(`Error handling emergency`, { userId, severity, error: error.message });
      throw error;
    }
  }

  async escalateIntervention(
    userId: string,
    interventionId: string,
    reason: string
  ): Promise<EscalationResult> {
    try {
      this.logger.warn(`Escalating intervention`, { userId, interventionId, reason });

      // Determine escalation level based on reason and user context
      const escalationLevel = this.determineEscalationLevel(reason);

      // Get contacts for escalation
      const contacts = await this.getEscalationContacts(userId, escalationLevel);

      // Send escalation notifications
      const notifications = await Promise.all(
        contacts.map(contact => this.sendEscalationNotification(contact, interventionId, reason))
      );

      const result: EscalationResult = {
        success: true,
        escalationLevel,
        notifiedParties: contacts.map(c => c.id),
        escalationTime: new Date(),
        followUpRequired: escalationLevel === 'emergency_services'
      };

      this.logger.warn(`Intervention escalated`, { 
        userId, 
        interventionId, 
        escalationLevel 
      });

      return result;
    } catch (error) {
      this.logger.error(`Error escalating intervention`, { userId, interventionId, error: error.message });
      throw error;
    }
  }

  async notifyEmergencyContacts(
    userId: string,
    situation: EmergencySituation
  ): Promise<NotificationResult> {
    try {
      this.logger.warn(`Notifying emergency contacts`, { userId, situationType: situation.situationType });

      // Get emergency contacts for user
      const contacts = this.emergencyContacts.get(userId) || [];

      if (contacts.length === 0) {
        this.logger.warn(`No emergency contacts found for user`, { userId });
        return {
          success: false,
          contactsNotified: [],
          notificationMethods: [],
          deliveryTime: new Date(),
          acknowledgments: []
        };
      }

      // Send notifications to all emergency contacts
      const notifications = await Promise.all(
        contacts.map(contact => this.sendEmergencyContactNotification(contact, situation))
      );

      const result: NotificationResult = {
        success: notifications.some(n => n.success),
        contactsNotified: contacts,
        notificationMethods: notifications.map(n => n.method),
        deliveryTime: new Date(),
        acknowledgments: notifications
          .filter(n => n.acknowledged)
          .map(n => ({
            contactId: n.contactId,
            acknowledgedAt: n.acknowledgedAt,
            method: n.method
          }))
      };

      this.logger.warn(`Emergency contacts notified`, { 
        userId, 
        contactsNotified: result.contactsNotified.length,
        acknowledged: result.acknowledgments.length
      });

      return result;
    } catch (error) {
      this.logger.error(`Error notifying emergency contacts`, { userId, error: error.message });
      throw error;
    }
  }

  // Private helper methods
  private analyzeEmergencyIndicators(indicators: EmergencyIndicator[]): { isEmergency: boolean } {
    // Simple analysis - in production would use ML models
    const highSeverityCount = indicators.filter(i => i.severity > 0.8).length;
    const criticalCount = indicators.filter(i => i.severity > 0.95).length;
    
    return {
      isEmergency: criticalCount > 0 || highSeverityCount >= 2
    };
  }

  private calculateEmergencySeverity(indicators: EmergencyIndicator[]): EmergencySeverity {
    const maxSeverity = Math.max(...indicators.map(i => i.severity));
    
    if (maxSeverity > 0.95) return 'CRITICAL';
    if (maxSeverity > 0.8) return 'HIGH';
    if (maxSeverity > 0.6) return 'MEDIUM';
    return 'LOW';
  }

  private calculateEmergencyConfidence(indicators: EmergencyIndicator[]): number {
    // Confidence based on number and quality of indicators
    const indicatorCount = indicators.length;
    const avgSeverity = indicators.reduce((sum, i) => sum + i.severity, 0) / indicatorCount;
    
    const countConfidence = Math.min(1, indicatorCount / 3); // Full confidence at 3+ indicators
    const severityConfidence = avgSeverity;
    
    return (countConfidence + severityConfidence) / 2;
  }

  private generateEmergencyActions(severity: EmergencySeverity, indicators: EmergencyIndicator[]): any[] {
    const protocol = this.emergencyProtocols.get(severity);
    return protocol ? protocol.actions : [];
  }

  private calculateTimeToAction(severity: EmergencySeverity): number {
    const protocol = this.emergencyProtocols.get(severity);
    return protocol ? protocol.responseTime : 5;
  }

  private async executeProtocolSteps(execution: ProtocolExecution, protocol: EmergencyProtocol): Promise<void> {
    // Execute steps in priority order
    for (const step of execution.executionSteps.sort((a, b) => a.priority - b.priority)) {
      try {
        step.status = 'in_progress';
        step.startTime = new Date();
        
        // Execute the step (simplified - would have actual implementations)
        await this.executeProtocolStep(step, execution.userId);
        
        step.status = 'completed';
        step.endTime = new Date();
        execution.completedSteps.push(step.stepId);
      } catch (error) {
        step.status = 'failed';
        step.endTime = new Date();
        execution.failedSteps.push({
          stepId: step.stepId,
          error: error.message,
          failedAt: new Date()
        });
      }
    }
    
    execution.status = execution.failedSteps.length === 0 ? 'completed' : 'failed';
  }

  private async executeProtocolStep(step: any, userId: string): Promise<void> {
    this.logger.info(`Executing protocol step`, { userId, action: step.action });
    
    // Simulate step execution
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In a real implementation, this would execute actual emergency actions
  }

  private determineSupportContacts(situation: EmergencySituation): any[] {
    // Return appropriate support contacts based on situation
    return [
      {
        id: 'support_1',
        name: 'Emergency Support Team',
        type: 'internal',
        contactMethod: 'email'
      }
    ];
  }

  private async sendSupportNotification(contact: any, situation: EmergencySituation): Promise<any> {
    // Send notification to support contact
    return {
      contactId: contact.id,
      acknowledged: true,
      acknowledgedAt: new Date(),
      response: 'Support team notified'
    };
  }

  private determineEscalationLevel(reason: string): 'team_lead' | 'manager' | 'hr' | 'emergency_services' {
    if (reason.includes('critical') || reason.includes('emergency')) {
      return 'emergency_services';
    }
    if (reason.includes('health') || reason.includes('safety')) {
      return 'hr';
    }
    if (reason.includes('performance') || reason.includes('stress')) {
      return 'manager';
    }
    return 'team_lead';
  }

  private async getEscalationContacts(userId: string, level: string): Promise<any[]> {
    // Return contacts for escalation level
    return [
      {
        id: `${level}_contact`,
        name: `${level} Contact`,
        level
      }
    ];
  }

  private async sendEscalationNotification(contact: any, interventionId: string, reason: string): Promise<any> {
    // Send escalation notification
    return {
      contactId: contact.id,
      success: true,
      sentAt: new Date()
    };
  }

  private async sendEmergencyContactNotification(contact: EmergencyContact, situation: EmergencySituation): Promise<any> {
    // Send notification to emergency contact
    return {
      contactId: contact.name,
      success: true,
      method: 'phone',
      acknowledged: true,
      acknowledgedAt: new Date()
    };
  }

  private calculateEstimatedResolutionTime(severity: EmergencySeverity): Date {
    const minutes = {
      'LOW': 30,
      'MEDIUM': 60,
      'HIGH': 120,
      'CRITICAL': 240
    };
    
    return moment().add(minutes[severity], 'minutes').toDate();
  }
}

// Supporting interfaces
interface EmergencyProtocol {
  severity: EmergencySeverity;
  responseTime: number; // minutes
  actions: EmergencyAction[];
  escalationThreshold: number; // minutes
  requiresHumanIntervention: boolean;
}

interface EmergencyAction {
  action: string;
  priority: number;
  timeframe: string;
}

interface ActiveEmergency {
  emergencyId: string;
  userId: string;
  severity: EmergencySeverity;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'resolved' | 'escalated';
  protocolExecution: ProtocolExecution;
}