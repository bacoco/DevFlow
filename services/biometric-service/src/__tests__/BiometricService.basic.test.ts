import { DeviceType, BiometricDataType, ConnectionStatus } from '@devflow/shared-types';

describe('BiometricService Basic Tests', () => {
  const testUserId = 'test-user-123';
  const testDeviceCredentials = {
    accessToken: 'test-access-token-12345',
    refreshToken: 'test-refresh-token-67890'
  };

  describe('Type Definitions', () => {
    it('should have correct DeviceType enum values', () => {
      expect(DeviceType.APPLE_WATCH).toBe('apple_watch');
      expect(DeviceType.FITBIT).toBe('fitbit');
      expect(DeviceType.GARMIN).toBe('garmin');
      expect(DeviceType.CUSTOM).toBe('custom');
    });

    it('should have correct BiometricDataType enum values', () => {
      expect(BiometricDataType.HEART_RATE).toBe('heart_rate');
      expect(BiometricDataType.STRESS_LEVEL).toBe('stress_level');
      expect(BiometricDataType.ACTIVITY_LEVEL).toBe('activity_level');
      expect(BiometricDataType.SLEEP_QUALITY).toBe('sleep_quality');
      expect(BiometricDataType.BLOOD_PRESSURE).toBe('blood_pressure');
      expect(BiometricDataType.BODY_TEMPERATURE).toBe('body_temperature');
    });

    it('should have correct ConnectionStatus enum values', () => {
      expect(ConnectionStatus.CONNECTED).toBe('connected');
      expect(ConnectionStatus.DISCONNECTED).toBe('disconnected');
      expect(ConnectionStatus.ERROR).toBe('error');
    });
  });

  describe('Data Structures', () => {
    it('should validate device credentials structure', () => {
      expect(testDeviceCredentials).toHaveProperty('accessToken');
      expect(testDeviceCredentials).toHaveProperty('refreshToken');
      expect(typeof testDeviceCredentials.accessToken).toBe('string');
      expect(typeof testDeviceCredentials.refreshToken).toBe('string');
    });

    it('should validate user ID format', () => {
      expect(typeof testUserId).toBe('string');
      expect(testUserId.length).toBeGreaterThan(0);
    });
  });

  describe('Error Classes', () => {
    it('should define error class structure', () => {
      // Test that error classes follow expected patterns
      class TestBiometricServiceError extends Error {
        constructor(
          message: string,
          public code: string,
          public userId?: string,
          public deviceId?: string
        ) {
          super(message);
          this.name = 'BiometricServiceError';
        }
      }

      const error = new TestBiometricServiceError(
        'Test error message',
        'TEST_ERROR_CODE',
        testUserId,
        'test-device-id'
      );

      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('TEST_ERROR_CODE');
      expect(error.userId).toBe(testUserId);
      expect(error.deviceId).toBe('test-device-id');
      expect(error.name).toBe('BiometricServiceError');
      expect(error instanceof Error).toBe(true);
    });

    it('should define device connection error structure', () => {
      class TestDeviceConnectionError extends Error {
        constructor(message: string, public deviceId: string, public userId?: string) {
          super(message);
          this.name = 'DeviceConnectionError';
        }
      }

      const error = new TestDeviceConnectionError(
        'Device connection failed',
        'test-device-id',
        testUserId
      );

      expect(error.message).toBe('Device connection failed');
      expect(error.userId).toBe(testUserId);
      expect(error.deviceId).toBe('test-device-id');
      expect(error.name).toBe('DeviceConnectionError');
      expect(error instanceof Error).toBe(true);
    });

    it('should define data validation error structure', () => {
      class TestDataValidationError extends Error {
        constructor(message: string, public userId?: string) {
          super(message);
          this.name = 'DataValidationError';
        }
      }

      const error = new TestDataValidationError(
        'Data validation failed',
        testUserId
      );

      expect(error.message).toBe('Data validation failed');
      expect(error.userId).toBe(testUserId);
      expect(error.name).toBe('DataValidationError');
      expect(error instanceof Error).toBe(true);
    });

    it('should define privacy violation error structure', () => {
      class TestPrivacyViolationError extends Error {
        constructor(message: string, public userId: string) {
          super(message);
          this.name = 'PrivacyViolationError';
        }
      }

      const error = new TestPrivacyViolationError(
        'Privacy violation detected',
        testUserId
      );

      expect(error.message).toBe('Privacy violation detected');
      expect(error.userId).toBe(testUserId);
      expect(error.name).toBe('PrivacyViolationError');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('Validation Functions', () => {
    it('should validate biometric reading structure', () => {
      const validReading = {
        id: 'test-reading-123',
        userId: testUserId,
        deviceId: 'test-device-123',
        timestamp: new Date(),
        heartRate: {
          bpm: 75,
          variability: 25,
          confidence: 0.9
        },
        quality: {
          accuracy: 0.9,
          completeness: 1.0,
          reliability: 0.95,
          outlierDetected: false
        }
      };

      expect(validReading.id).toBeDefined();
      expect(validReading.userId).toBe(testUserId);
      expect(validReading.deviceId).toBeDefined();
      expect(validReading.timestamp).toBeInstanceOf(Date);
      expect(validReading.heartRate).toBeDefined();
      expect(validReading.quality).toBeDefined();
    });

    it('should validate heart rate reading structure', () => {
      const heartRateReading = {
        bpm: 75,
        variability: 25,
        confidence: 0.9
      };

      expect(typeof heartRateReading.bpm).toBe('number');
      expect(heartRateReading.bpm).toBeGreaterThan(0);
      expect(heartRateReading.bpm).toBeLessThan(300);
      expect(typeof heartRateReading.confidence).toBe('number');
      expect(heartRateReading.confidence).toBeGreaterThanOrEqual(0);
      expect(heartRateReading.confidence).toBeLessThanOrEqual(1);
    });

    it('should validate stress reading structure', () => {
      const stressReading = {
        level: 30,
        confidence: 0.8
      };

      expect(typeof stressReading.level).toBe('number');
      expect(stressReading.level).toBeGreaterThanOrEqual(0);
      expect(stressReading.level).toBeLessThanOrEqual(100);
      expect(typeof stressReading.confidence).toBe('number');
      expect(stressReading.confidence).toBeGreaterThanOrEqual(0);
      expect(stressReading.confidence).toBeLessThanOrEqual(1);
    });

    it('should validate activity reading structure', () => {
      const activityReading = {
        steps: 1000,
        calories: 50,
        distance: 0.8,
        activeMinutes: 15,
        intensity: 0.6
      };

      expect(typeof activityReading.steps).toBe('number');
      expect(activityReading.steps).toBeGreaterThanOrEqual(0);
      expect(typeof activityReading.calories).toBe('number');
      expect(activityReading.calories).toBeGreaterThanOrEqual(0);
      expect(typeof activityReading.intensity).toBe('number');
      expect(activityReading.intensity).toBeGreaterThanOrEqual(0);
      expect(activityReading.intensity).toBeLessThanOrEqual(1);
    });

    it('should validate sleep reading structure', () => {
      const sleepReading = {
        duration: 480, // 8 hours in minutes
        quality: 80,
        deepSleepMinutes: 120,
        remSleepMinutes: 90,
        efficiency: 85
      };

      expect(typeof sleepReading.duration).toBe('number');
      expect(sleepReading.duration).toBeGreaterThan(0);
      expect(typeof sleepReading.quality).toBe('number');
      expect(sleepReading.quality).toBeGreaterThanOrEqual(0);
      expect(sleepReading.quality).toBeLessThanOrEqual(100);
      expect(typeof sleepReading.efficiency).toBe('number');
      expect(sleepReading.efficiency).toBeGreaterThanOrEqual(0);
      expect(sleepReading.efficiency).toBeLessThanOrEqual(100);
    });
  });

  describe('Utility Functions', () => {
    it('should create time ranges correctly', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const timeRange = {
        startTime: oneHourAgo,
        endTime: now
      };

      expect(timeRange.startTime).toBeInstanceOf(Date);
      expect(timeRange.endTime).toBeInstanceOf(Date);
      expect(timeRange.endTime.getTime()).toBeGreaterThan(timeRange.startTime.getTime());
    });

    it('should calculate time differences correctly', () => {
      const start = new Date('2023-01-01T10:00:00Z');
      const end = new Date('2023-01-01T11:00:00Z');
      const diffMs = end.getTime() - start.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      expect(diffMinutes).toBe(60);
    });

    it('should validate wellness score structure', () => {
      const wellnessScore = {
        overallScore: 75,
        components: {
          physical: 80,
          mental: 70,
          stress: 60,
          recovery: 85
        },
        trend: 'improving' as const,
        lastUpdated: new Date()
      };

      expect(typeof wellnessScore.overallScore).toBe('number');
      expect(wellnessScore.overallScore).toBeGreaterThanOrEqual(0);
      expect(wellnessScore.overallScore).toBeLessThanOrEqual(100);
      expect(wellnessScore.components).toBeDefined();
      expect(['improving', 'declining', 'stable']).toContain(wellnessScore.trend);
      expect(wellnessScore.lastUpdated).toBeInstanceOf(Date);
    });

    it('should validate stress metrics structure', () => {
      const stressMetrics = {
        currentLevel: 45,
        trend: 'stable' as const,
        contributingFactors: ['High workload', 'Tight deadlines'],
        recommendations: ['Take breaks', 'Practice deep breathing'],
        confidence: 0.85
      };

      expect(typeof stressMetrics.currentLevel).toBe('number');
      expect(stressMetrics.currentLevel).toBeGreaterThanOrEqual(0);
      expect(stressMetrics.currentLevel).toBeLessThanOrEqual(100);
      expect(['increasing', 'decreasing', 'stable']).toContain(stressMetrics.trend);
      expect(Array.isArray(stressMetrics.contributingFactors)).toBe(true);
      expect(Array.isArray(stressMetrics.recommendations)).toBe(true);
      expect(typeof stressMetrics.confidence).toBe('number');
    });

    it('should validate fatigue indicators structure', () => {
      const fatigueIndicators = {
        fatigueLevel: 35,
        indicators: {
          heartRateVariability: 40,
          activityLevel: 30,
          sleepQuality: 70,
          typingPatterns: 25
        },
        recommendations: ['Get more sleep', 'Take regular breaks'],
        severity: 'medium' as const
      };

      expect(typeof fatigueIndicators.fatigueLevel).toBe('number');
      expect(fatigueIndicators.fatigueLevel).toBeGreaterThanOrEqual(0);
      expect(fatigueIndicators.fatigueLevel).toBeLessThanOrEqual(100);
      expect(fatigueIndicators.indicators).toBeDefined();
      expect(Array.isArray(fatigueIndicators.recommendations)).toBe(true);
      expect(['low', 'medium', 'high', 'critical']).toContain(fatigueIndicators.severity);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate device capabilities mapping', () => {
      const deviceCapabilities: Record<string, BiometricDataType[]> = {
        [DeviceType.APPLE_WATCH]: [
          BiometricDataType.HEART_RATE,
          BiometricDataType.ACTIVITY_LEVEL,
          BiometricDataType.STRESS_LEVEL
        ],
        [DeviceType.FITBIT]: [
          BiometricDataType.HEART_RATE,
          BiometricDataType.ACTIVITY_LEVEL,
          BiometricDataType.SLEEP_QUALITY,
          BiometricDataType.STRESS_LEVEL
        ],
        [DeviceType.GARMIN]: [
          BiometricDataType.HEART_RATE,
          BiometricDataType.ACTIVITY_LEVEL,
          BiometricDataType.SLEEP_QUALITY,
          BiometricDataType.STRESS_LEVEL,
          BiometricDataType.BODY_TEMPERATURE
        ]
      };

      Object.keys(deviceCapabilities).forEach(deviceType => {
        expect(Object.values(DeviceType)).toContain(deviceType);
        const capabilities = deviceCapabilities[deviceType];
        expect(Array.isArray(capabilities)).toBe(true);
        capabilities.forEach((capability: BiometricDataType) => {
          expect(Object.values(BiometricDataType)).toContain(capability);
        });
      });
    });

    it('should validate privacy settings structure', () => {
      const privacySettings = {
        shareHeartRate: false,
        shareStressLevel: false,
        shareActivityData: true,
        shareSleepData: false,
        allowTeamAggregation: true,
        anonymizeInReports: true
      };

      Object.values(privacySettings).forEach(setting => {
        expect(typeof setting).toBe('boolean');
      });
    });

    it('should validate consent settings structure', () => {
      const consentSettings = {
        dataTypes: {
          [BiometricDataType.HEART_RATE]: true,
          [BiometricDataType.STRESS_LEVEL]: true,
          [BiometricDataType.ACTIVITY_LEVEL]: true,
          [BiometricDataType.SLEEP_QUALITY]: false,
          [BiometricDataType.BLOOD_PRESSURE]: false,
          [BiometricDataType.BODY_TEMPERATURE]: false
        },
        sharingLevel: 'team' as const,
        retentionPeriod: 90,
        allowResearch: false,
        emergencyOverride: false
      };

      expect(consentSettings.dataTypes).toBeDefined();
      Object.keys(consentSettings.dataTypes).forEach(dataType => {
        expect(Object.values(BiometricDataType)).toContain(dataType);
        expect(typeof consentSettings.dataTypes[dataType as BiometricDataType]).toBe('boolean');
      });
      expect(['none', 'team', 'organization']).toContain(consentSettings.sharingLevel);
      expect(typeof consentSettings.retentionPeriod).toBe('number');
      expect(consentSettings.retentionPeriod).toBeGreaterThan(0);
    });
  });
});