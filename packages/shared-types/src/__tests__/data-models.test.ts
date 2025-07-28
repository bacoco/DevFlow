import {
  // Schemas
  UserSchema,
  TeamSchema,
  GitEventSchema,
  IDETelemetrySchema,
  ProductivityMetricSchema,
  FlowStateSchema,
  
  // Validation functions
  validateUser,
  validateTeam,
  validateGitEvent,
  validateIDETelemetry,
  validateProductivityMetric,
  validateFlowState,
  safeValidateUser,
  safeValidateTeam,
  safeValidateGitEvent,
  safeValidateIDETelemetry,
  safeValidateProductivityMetric,
  safeValidateFlowState,
  
  // Enums
  UserRole,
  MetricType,
  PrivacyLevel,
  TimePeriod,
  AnonymizationLevel,
  GitEventType,
  IDEEventType,
  
  // Helper functions
  createDefaultPrivacySettings,
  createDefaultUserPreferences,
  
  // Types
  User,
  Team,
  GitEvent,
  IDETelemetry,
  ProductivityMetric,
  FlowState
} from '../index';

describe('Data Model Validation', () => {
  
  describe('User Model', () => {
    const validUser: User = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      name: 'Test User',
      role: UserRole.DEVELOPER,
      teamIds: ['123e4567-e89b-12d3-a456-426614174001'],
      privacySettings: createDefaultPrivacySettings('123e4567-e89b-12d3-a456-426614174000'),
      preferences: createDefaultUserPreferences(),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActiveAt: new Date(),
      isActive: true
    };

    it('should validate a valid user', () => {
      expect(() => validateUser(validUser)).not.toThrow();
      const result = safeValidateUser(validUser);
      expect(result.success).toBe(true);
    });

    it('should reject user with invalid email', () => {
      const invalidUser = { ...validUser, email: 'invalid-email' };
      expect(() => validateUser(invalidUser)).toThrow();
      const result = safeValidateUser(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should reject user with invalid UUID', () => {
      const invalidUser = { ...validUser, id: 'invalid-uuid' };
      expect(() => validateUser(invalidUser)).toThrow();
      const result = safeValidateUser(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should reject user with invalid role', () => {
      const invalidUser = { ...validUser, role: 'invalid-role' as UserRole };
      expect(() => validateUser(invalidUser)).toThrow();
      const result = safeValidateUser(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should reject user with empty name', () => {
      const invalidUser = { ...validUser, name: '' };
      expect(() => validateUser(invalidUser)).toThrow();
      const result = safeValidateUser(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should reject user with name too long', () => {
      const invalidUser = { ...validUser, name: 'a'.repeat(101) };
      expect(() => validateUser(invalidUser)).toThrow();
      const result = safeValidateUser(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should accept user without lastActiveAt', () => {
      const userWithoutLastActive = { ...validUser };
      delete userWithoutLastActive.lastActiveAt;
      expect(() => validateUser(userWithoutLastActive)).not.toThrow();
    });
  });

  describe('Team Model', () => {
    const validTeam: Team = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Team',
      description: 'A test team',
      memberIds: ['123e4567-e89b-12d3-a456-426614174001'],
      projectIds: ['123e4567-e89b-12d3-a456-426614174002'],
      settings: {
        privacyLevel: PrivacyLevel.TEAM,
        dataRetention: 365,
        alertSettings: {
          productivityThreshold: 70,
          qualityThreshold: 80,
          escalationEnabled: true,
          escalationDelayMinutes: 30
        },
        workingHours: {
          startTime: '09:00',
          endTime: '17:00',
          timezone: 'UTC',
          workingDays: [1, 2, 3, 4, 5]
        }
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };

    it('should validate a valid team', () => {
      expect(() => validateTeam(validTeam)).not.toThrow();
      const result = safeValidateTeam(validTeam);
      expect(result.success).toBe(true);
    });

    it('should reject team with invalid UUID', () => {
      const invalidTeam = { ...validTeam, id: 'invalid-uuid' };
      expect(() => validateTeam(invalidTeam)).toThrow();
      const result = safeValidateTeam(invalidTeam);
      expect(result.success).toBe(false);
    });

    it('should reject team with empty name', () => {
      const invalidTeam = { ...validTeam, name: '' };
      expect(() => validateTeam(invalidTeam)).toThrow();
      const result = safeValidateTeam(invalidTeam);
      expect(result.success).toBe(false);
    });

    it('should reject team with description too long', () => {
      const invalidTeam = { ...validTeam, description: 'a'.repeat(501) };
      expect(() => validateTeam(invalidTeam)).toThrow();
      const result = safeValidateTeam(invalidTeam);
      expect(result.success).toBe(false);
    });

    it('should accept team without description', () => {
      const teamWithoutDescription = { ...validTeam };
      delete teamWithoutDescription.description;
      expect(() => validateTeam(teamWithoutDescription)).not.toThrow();
    });

    it('should reject team with invalid working hours', () => {
      const invalidTeam = {
        ...validTeam,
        settings: {
          ...validTeam.settings,
          workingHours: {
            ...validTeam.settings.workingHours,
            startTime: '25:00' // Invalid time
          }
        }
      };
      expect(() => validateTeam(invalidTeam)).toThrow();
      const result = safeValidateTeam(invalidTeam);
      expect(result.success).toBe(false);
    });
  });

  describe('GitEvent Model', () => {
    const validGitEvent: GitEvent = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: GitEventType.COMMIT,
      repository: 'test/repo',
      author: 'test-author',
      timestamp: new Date(),
      metadata: {
        commitHash: 'abc123def456',
        branch: 'main',
        linesAdded: 10,
        linesDeleted: 5,
        filesChanged: ['src/index.ts', 'README.md']
      },
      privacyLevel: PrivacyLevel.TEAM
    };

    it('should validate a valid git event', () => {
      expect(() => validateGitEvent(validGitEvent)).not.toThrow();
      const result = safeValidateGitEvent(validGitEvent);
      expect(result.success).toBe(true);
    });

    it('should reject git event with invalid type', () => {
      const invalidEvent = { ...validGitEvent, type: 'invalid-type' as GitEventType };
      expect(() => validateGitEvent(invalidEvent)).toThrow();
      const result = safeValidateGitEvent(invalidEvent);
      expect(result.success).toBe(false);
    });

    it('should reject git event with empty repository', () => {
      const invalidEvent = { ...validGitEvent, repository: '' };
      expect(() => validateGitEvent(invalidEvent)).toThrow();
      const result = safeValidateGitEvent(invalidEvent);
      expect(result.success).toBe(false);
    });

    it('should reject git event with negative lines added', () => {
      const invalidEvent = {
        ...validGitEvent,
        metadata: { ...validGitEvent.metadata, linesAdded: -1 }
      };
      expect(() => validateGitEvent(invalidEvent)).toThrow();
      const result = safeValidateGitEvent(invalidEvent);
      expect(result.success).toBe(false);
    });

    it('should accept git event with minimal metadata', () => {
      const minimalEvent = { ...validGitEvent, metadata: {} };
      expect(() => validateGitEvent(minimalEvent)).not.toThrow();
    });
  });

  describe('IDETelemetry Model', () => {
    const validTelemetry: IDETelemetry = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      sessionId: '123e4567-e89b-12d3-a456-426614174002',
      eventType: IDEEventType.KEYSTROKE,
      timestamp: new Date(),
      data: {
        fileName: 'index.ts',
        fileExtension: 'ts',
        keystrokeCount: 150,
        focusDurationMs: 30000
      },
      privacyLevel: PrivacyLevel.PRIVATE
    };

    it('should validate a valid IDE telemetry event', () => {
      expect(() => validateIDETelemetry(validTelemetry)).not.toThrow();
      const result = safeValidateIDETelemetry(validTelemetry);
      expect(result.success).toBe(true);
    });

    it('should reject telemetry with invalid event type', () => {
      const invalidTelemetry = { ...validTelemetry, eventType: 'invalid-type' as IDEEventType };
      expect(() => validateIDETelemetry(invalidTelemetry)).toThrow();
      const result = safeValidateIDETelemetry(invalidTelemetry);
      expect(result.success).toBe(false);
    });

    it('should reject telemetry with invalid user ID', () => {
      const invalidTelemetry = { ...validTelemetry, userId: 'invalid-uuid' };
      expect(() => validateIDETelemetry(invalidTelemetry)).toThrow();
      const result = safeValidateIDETelemetry(invalidTelemetry);
      expect(result.success).toBe(false);
    });

    it('should reject telemetry with negative keystroke count', () => {
      const invalidTelemetry = {
        ...validTelemetry,
        data: { ...validTelemetry.data, keystrokeCount: -1 }
      };
      expect(() => validateIDETelemetry(invalidTelemetry)).toThrow();
      const result = safeValidateIDETelemetry(invalidTelemetry);
      expect(result.success).toBe(false);
    });

    it('should accept telemetry with test results', () => {
      const telemetryWithTests = {
        ...validTelemetry,
        eventType: IDEEventType.TEST_RUN,
        data: {
          ...validTelemetry.data,
          testResults: {
            passed: 10,
            failed: 2,
            skipped: 1
          }
        }
      };
      expect(() => validateIDETelemetry(telemetryWithTests)).not.toThrow();
    });
  });

  describe('ProductivityMetric Model', () => {
    const validMetric: ProductivityMetric = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      metricType: MetricType.TIME_IN_FLOW,
      value: 0.75,
      timestamp: new Date(),
      aggregationPeriod: TimePeriod.DAY,
      context: {
        projectId: '123e4567-e89b-12d3-a456-426614174002',
        teamId: '123e4567-e89b-12d3-a456-426614174003',
        repository: 'test/repo',
        branch: 'main'
      },
      confidence: 0.9
    };

    it('should validate a valid productivity metric', () => {
      expect(() => validateProductivityMetric(validMetric)).not.toThrow();
      const result = safeValidateProductivityMetric(validMetric);
      expect(result.success).toBe(true);
    });

    it('should reject metric with invalid metric type', () => {
      const invalidMetric = { ...validMetric, metricType: 'invalid-type' as MetricType };
      expect(() => validateProductivityMetric(invalidMetric)).toThrow();
      const result = safeValidateProductivityMetric(invalidMetric);
      expect(result.success).toBe(false);
    });

    it('should reject metric with confidence out of range', () => {
      const invalidMetric = { ...validMetric, confidence: 1.5 };
      expect(() => validateProductivityMetric(invalidMetric)).toThrow();
      const result = safeValidateProductivityMetric(invalidMetric);
      expect(result.success).toBe(false);
    });

    it('should accept metric without confidence', () => {
      const metricWithoutConfidence = { ...validMetric };
      delete metricWithoutConfidence.confidence;
      expect(() => validateProductivityMetric(metricWithoutConfidence)).not.toThrow();
    });

    it('should accept metric with minimal context', () => {
      const metricWithMinimalContext = { ...validMetric, context: {} };
      expect(() => validateProductivityMetric(metricWithMinimalContext)).not.toThrow();
    });
  });

  describe('FlowState Model', () => {
    const validFlowState: FlowState = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      sessionId: '123e4567-e89b-12d3-a456-426614174001',
      startTime: new Date('2023-01-01T09:00:00Z'),
      endTime: new Date('2023-01-01T17:00:00Z'),
      interruptionCount: 3,
      focusScore: 0.8,
      activities: [
        {
          type: 'coding',
          startTime: new Date('2023-01-01T09:00:00Z'),
          endTime: new Date('2023-01-01T11:00:00Z'),
          intensity: 0.9,
          interruptions: 1
        },
        {
          type: 'debugging',
          startTime: new Date('2023-01-01T11:00:00Z'),
          endTime: new Date('2023-01-01T12:00:00Z'),
          intensity: 0.7,
          interruptions: 0
        }
      ],
      totalFocusTimeMs: 7200000, // 2 hours
      deepWorkPercentage: 0.75
    };

    it('should validate a valid flow state', () => {
      expect(() => validateFlowState(validFlowState)).not.toThrow();
      const result = safeValidateFlowState(validFlowState);
      expect(result.success).toBe(true);
    });

    it('should reject flow state with negative interruption count', () => {
      const invalidFlowState = { ...validFlowState, interruptionCount: -1 };
      expect(() => validateFlowState(invalidFlowState)).toThrow();
      const result = safeValidateFlowState(invalidFlowState);
      expect(result.success).toBe(false);
    });

    it('should reject flow state with focus score out of range', () => {
      const invalidFlowState = { ...validFlowState, focusScore: 1.5 };
      expect(() => validateFlowState(invalidFlowState)).toThrow();
      const result = safeValidateFlowState(invalidFlowState);
      expect(result.success).toBe(false);
    });

    it('should reject flow state with negative total focus time', () => {
      const invalidFlowState = { ...validFlowState, totalFocusTimeMs: -1 };
      expect(() => validateFlowState(invalidFlowState)).toThrow();
      const result = safeValidateFlowState(invalidFlowState);
      expect(result.success).toBe(false);
    });

    it('should reject flow state with deep work percentage out of range', () => {
      const invalidFlowState = { ...validFlowState, deepWorkPercentage: 1.5 };
      expect(() => validateFlowState(invalidFlowState)).toThrow();
      const result = safeValidateFlowState(invalidFlowState);
      expect(result.success).toBe(false);
    });

    it('should accept flow state without end time (ongoing session)', () => {
      const ongoingFlowState = { ...validFlowState };
      delete ongoingFlowState.endTime;
      expect(() => validateFlowState(ongoingFlowState)).not.toThrow();
    });

    it('should reject activity with invalid type', () => {
      const invalidFlowState = {
        ...validFlowState,
        activities: [
          {
            type: 'invalid-type' as any,
            startTime: new Date(),
            endTime: new Date(),
            intensity: 0.5,
            interruptions: 0
          }
        ]
      };
      expect(() => validateFlowState(invalidFlowState)).toThrow();
      const result = safeValidateFlowState(invalidFlowState);
      expect(result.success).toBe(false);
    });
  });

  describe('Helper Functions', () => {
    describe('createDefaultPrivacySettings', () => {
      it('should create valid default privacy settings', () => {
        const userId = '123e4567-e89b-12d3-a456-426614174000';
        const privacySettings = createDefaultPrivacySettings(userId);
        
        expect(privacySettings.userId).toBe(userId);
        expect(privacySettings.dataCollection.ideTelemtry).toBe(true);
        expect(privacySettings.dataCollection.gitActivity).toBe(true);
        expect(privacySettings.dataCollection.communicationData).toBe(false);
        expect(privacySettings.anonymization).toBe(AnonymizationLevel.PARTIAL);
        
        // Should pass validation
        expect(() => UserSchema.shape.privacySettings.parse(privacySettings)).not.toThrow();
      });
    });

    describe('createDefaultUserPreferences', () => {
      it('should create valid default user preferences', () => {
        const preferences = createDefaultUserPreferences();
        
        expect(preferences.theme).toBe('auto');
        expect(preferences.notifications.frequency).toBe('daily');
        expect(preferences.dashboard.defaultTimeRange).toBe(TimePeriod.WEEK);
        expect(preferences.language).toBe('en');
        
        // Should pass validation
        expect(() => UserSchema.shape.preferences.parse(preferences)).not.toThrow();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(() => validateUser(null)).toThrow();
      expect(() => validateUser(undefined)).toThrow();
      
      const nullResult = safeValidateUser(null);
      const undefinedResult = safeValidateUser(undefined);
      
      expect(nullResult.success).toBe(false);
      expect(undefinedResult.success).toBe(false);
    });

    it('should handle empty objects', () => {
      expect(() => validateUser({})).toThrow();
      const result = safeValidateUser({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('should provide detailed error messages', () => {
      const invalidUser = {
        id: 'invalid-uuid',
        email: 'invalid-email',
        name: '',
        role: 'invalid-role'
      };
      
      const result = safeValidateUser(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues;
        expect(issues.some(issue => issue.path.includes('id'))).toBe(true);
        expect(issues.some(issue => issue.path.includes('email'))).toBe(true);
        expect(issues.some(issue => issue.path.includes('name'))).toBe(true);
        expect(issues.some(issue => issue.path.includes('role'))).toBe(true);
      }
    });
  });
});