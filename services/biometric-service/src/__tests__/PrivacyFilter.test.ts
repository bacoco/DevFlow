import { PrivacyFilterImpl } from '../services/PrivacyFilter';
import { BiometricReading, BiometricDataType } from '@devflow/shared-types';
import { ConsentSettings, PrivacyViolationError } from '../types';

describe('PrivacyFilter', () => {
  let privacyFilter: PrivacyFilterImpl;
  const testUserId = 'test-user-123';
  const testTeamId = 'test-team-456';

  beforeEach(() => {
    privacyFilter = new PrivacyFilterImpl();
  });

  const createTestBiometricReading = (overrides: Partial<BiometricReading> = {}): BiometricReading => ({
    id: 'test-reading-123',
    userId: testUserId,
    deviceId: 'test-device-123',
    timestamp: new Date(),
    heartRate: {
      bpm: 75,
      variability: 25,
      confidence: 0.9
    },
    stress: {
      level: 30,
      confidence: 0.8
    },
    activity: {
      steps: 1000,
      calories: 50,
      distance: 0.8,
      activeMinutes: 15,
      intensity: 0.6
    },
    sleep: {
      duration: 480,
      quality: 80,
      deepSleepMinutes: 120,
      remSleepMinutes: 90,
      efficiency: 85
    },
    quality: {
      accuracy: 0.9,
      completeness: 1.0,
      reliability: 0.95,
      outlierDetected: false
    },
    ...overrides
  });

  const createTestConsentSettings = (overrides: Partial<ConsentSettings> = {}): ConsentSettings => ({
    dataTypes: {
      [BiometricDataType.HEART_RATE]: true,
      [BiometricDataType.STRESS_LEVEL]: true,
      [BiometricDataType.ACTIVITY_LEVEL]: true,
      [BiometricDataType.SLEEP_QUALITY]: true,
      [BiometricDataType.BLOOD_PRESSURE]: false,
      [BiometricDataType.BODY_TEMPERATURE]: false
    },
    sharingLevel: 'team',
    retentionPeriod: 90,
    allowResearch: false,
    emergencyOverride: false,
    ...overrides
  });

  describe('Consent Management', () => {
    describe('checkConsentStatus', () => {
      it('should return false for data types without consent by default', async () => {
        const hasConsent = await privacyFilter.checkConsentStatus(testUserId, BiometricDataType.HEART_RATE);
        expect(hasConsent).toBe(false);
      });

      it('should return true for data types with explicit consent', async () => {
        const consentSettings = createTestConsentSettings();
        await privacyFilter.updateConsentSettings(testUserId, consentSettings);

        const hasConsent = await privacyFilter.checkConsentStatus(testUserId, BiometricDataType.HEART_RATE);
        expect(hasConsent).toBe(true);
      });

      it('should return false for data types with explicit denial', async () => {
        const consentSettings = createTestConsentSettings({
          dataTypes: {
            ...createTestConsentSettings().dataTypes,
            [BiometricDataType.HEART_RATE]: false
          }
        });
        await privacyFilter.updateConsentSettings(testUserId, consentSettings);

        const hasConsent = await privacyFilter.checkConsentStatus(testUserId, BiometricDataType.HEART_RATE);
        expect(hasConsent).toBe(false);
      });
    });

    describe('updateConsentSettings', () => {
      it('should successfully update valid consent settings', async () => {
        const consentSettings = createTestConsentSettings();
        
        await expect(
          privacyFilter.updateConsentSettings(testUserId, consentSettings)
        ).resolves.not.toThrow();
      });

      it('should reject invalid consent settings', async () => {
        const invalidSettings = {
          dataTypes: null,
          sharingLevel: 'invalid',
          retentionPeriod: -1
        } as any;

        await expect(
          privacyFilter.updateConsentSettings(testUserId, invalidSettings)
        ).rejects.toThrow(PrivacyViolationError);
      });

      it('should reject retention period outside valid range', async () => {
        const invalidSettings = createTestConsentSettings({
          retentionPeriod: 3000 // Too long
        });

        await expect(
          privacyFilter.updateConsentSettings(testUserId, invalidSettings)
        ).rejects.toThrow(PrivacyViolationError);
      });

      it('should handle emergency override settings', async () => {
        const consentSettings = createTestConsentSettings({
          emergencyOverride: true
        });

        await privacyFilter.updateConsentSettings(testUserId, consentSettings);
        
        // Verify emergency override is stored
        const updatedSettings = await privacyFilter.getUserConsentSettings(testUserId);
        expect(updatedSettings.emergencyOverride).toBe(true);
      });
    });
  });

  describe('Privacy Filtering', () => {
    describe('applyPrivacySettings', () => {
      it('should return empty array when no consent is given', async () => {
        const readings = [createTestBiometricReading()];
        
        const filteredData = await privacyFilter.applyPrivacySettings(testUserId, readings);
        
        expect(filteredData).toHaveLength(0);
      });

      it('should return filtered data when consent is given', async () => {
        const consentSettings = createTestConsentSettings();
        await privacyFilter.updateConsentSettings(testUserId, consentSettings);

        const readings = [createTestBiometricReading()];
        
        const filteredData = await privacyFilter.applyPrivacySettings(testUserId, readings);
        
        expect(filteredData.length).toBeGreaterThan(0);
        expect(filteredData[0].userId).toBe(testUserId);
      });

      it('should remove data types without consent', async () => {
        const consentSettings = createTestConsentSettings({
          dataTypes: {
            ...createTestConsentSettings().dataTypes,
            [BiometricDataType.HEART_RATE]: false // No consent for heart rate
          }
        });
        await privacyFilter.updateConsentSettings(testUserId, consentSettings);

        const readings = [createTestBiometricReading()];
        
        const filteredData = await privacyFilter.applyPrivacySettings(testUserId, readings);
        
        // Should have filtered out heart rate data
        expect(filteredData.length).toBeGreaterThan(0);
        filteredData.forEach(reading => {
          expect(reading.heartRate).toBeUndefined();
        });
      });

      it('should apply anonymization based on sharing level', async () => {
        const consentSettings = createTestConsentSettings({
          sharingLevel: 'organization'
        });
        await privacyFilter.updateConsentSettings(testUserId, consentSettings);

        // Update privacy settings to disable sharing
        await privacyFilter.updateUserPrivacySettings(testUserId, {
          shareHeartRate: false,
          anonymizeInReports: true
        });

        const readings = [createTestBiometricReading()];
        
        const filteredData = await privacyFilter.applyPrivacySettings(testUserId, readings);
        
        expect(filteredData.length).toBeGreaterThan(0);
        // Heart rate should be anonymized or removed based on privacy settings
      });

      it('should handle emergency override scenarios', async () => {
        const consentSettings = createTestConsentSettings({
          dataTypes: {
            ...createTestConsentSettings().dataTypes,
            [BiometricDataType.HEART_RATE]: false // No consent normally
          },
          emergencyOverride: true
        });
        await privacyFilter.updateConsentSettings(testUserId, consentSettings);

        // Create reading with emergency-level heart rate
        const emergencyReading = createTestBiometricReading({
          heartRate: {
            bpm: 200, // Emergency level
            confidence: 0.9
          }
        });

        const filteredData = await privacyFilter.applyPrivacySettings(testUserId, [emergencyReading]);
        
        // Should allow data due to emergency override
        expect(filteredData.length).toBeGreaterThan(0);
      });

      it('should log privacy violations', async () => {
        const readings = [createTestBiometricReading()];
        
        // No consent given, should log violations
        const filteredData = await privacyFilter.applyPrivacySettings(testUserId, readings);
        
        expect(filteredData).toHaveLength(0);
        
        // Check audit log
        const auditLog = await privacyFilter.getAuditLog(testUserId);
        const violations = auditLog.filter(entry => entry.action === 'privacy_violation');
        expect(violations.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Team Data Anonymization', () => {
    describe('anonymizeForTeamReporting', () => {
      it('should return empty array for no data', async () => {
        const result = await privacyFilter.anonymizeForTeamReporting(testTeamId, []);
        expect(result).toHaveLength(0);
      });

      it('should skip intervals with insufficient participants', async () => {
        const readings = [
          createTestBiometricReading({ userId: 'user1' }),
          createTestBiometricReading({ userId: 'user2' }) // Only 2 users, need 3 minimum
        ];

        const result = await privacyFilter.anonymizeForTeamReporting(testTeamId, readings);
        expect(result).toHaveLength(0);
      });

      it('should anonymize data with sufficient participants', async () => {
        const readings = [
          createTestBiometricReading({ 
            userId: 'user1',
            heartRate: { bpm: 70, confidence: 0.9 }
          }),
          createTestBiometricReading({ 
            userId: 'user2',
            heartRate: { bpm: 75, confidence: 0.9 }
          }),
          createTestBiometricReading({ 
            userId: 'user3',
            heartRate: { bpm: 80, confidence: 0.9 }
          })
        ];

        const result = await privacyFilter.anonymizeForTeamReporting(testTeamId, readings);
        
        expect(result.length).toBeGreaterThan(0);
        result.forEach(anonymizedData => {
          expect(anonymizedData.participantCount).toBeGreaterThanOrEqual(3);
          expect(anonymizedData.aggregatedMetrics).toBeDefined();
          expect(anonymizedData.confidenceInterval).toBeDefined();
        });
      });

      it('should calculate correct aggregated metrics', async () => {
        const readings = [
          createTestBiometricReading({ 
            userId: 'user1',
            heartRate: { bpm: 60, confidence: 0.9 }
          }),
          createTestBiometricReading({ 
            userId: 'user2',
            heartRate: { bpm: 70, confidence: 0.9 }
          }),
          createTestBiometricReading({ 
            userId: 'user3',
            heartRate: { bpm: 80, confidence: 0.9 }
          })
        ];

        const result = await privacyFilter.anonymizeForTeamReporting(testTeamId, readings);
        
        expect(result.length).toBeGreaterThan(0);
        const aggregated = result[0].aggregatedMetrics;
        expect(aggregated.averageHeartRate).toBe(70); // (60 + 70 + 80) / 3
      });

      it('should group data by time intervals', async () => {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

        const readings = [
          // First interval
          createTestBiometricReading({ userId: 'user1', timestamp: twoHoursAgo }),
          createTestBiometricReading({ userId: 'user2', timestamp: twoHoursAgo }),
          createTestBiometricReading({ userId: 'user3', timestamp: twoHoursAgo }),
          // Second interval
          createTestBiometricReading({ userId: 'user1', timestamp: oneHourAgo }),
          createTestBiometricReading({ userId: 'user2', timestamp: oneHourAgo }),
          createTestBiometricReading({ userId: 'user3', timestamp: oneHourAgo }),
          // Third interval
          createTestBiometricReading({ userId: 'user1', timestamp: now }),
          createTestBiometricReading({ userId: 'user2', timestamp: now }),
          createTestBiometricReading({ userId: 'user3', timestamp: now })
        ];

        const result = await privacyFilter.anonymizeForTeamReporting(testTeamId, readings);
        
        // Should have multiple time intervals
        expect(result.length).toBeGreaterThan(1);
        
        // Timestamps should be different
        const timestamps = result.map(r => r.timestamp.getTime());
        const uniqueTimestamps = [...new Set(timestamps)];
        expect(uniqueTimestamps.length).toBe(timestamps.length);
      });
    });
  });

  describe('Privacy Settings Management', () => {
    describe('getUserPrivacySettings', () => {
      it('should return default privacy settings for new user', async () => {
        const settings = await privacyFilter.getUserPrivacySettings('new-user');
        
        expect(settings).toBeDefined();
        expect(settings.shareHeartRate).toBe(false);
        expect(settings.shareStressLevel).toBe(false);
        expect(settings.shareActivityData).toBe(true);
        expect(settings.shareSleepData).toBe(false);
        expect(settings.allowTeamAggregation).toBe(true);
        expect(settings.anonymizeInReports).toBe(true);
      });
    });

    describe('updateUserPrivacySettings', () => {
      it('should update privacy settings successfully', async () => {
        const newSettings = {
          shareHeartRate: true,
          shareStressLevel: true
        };

        await privacyFilter.updateUserPrivacySettings(testUserId, newSettings);
        
        const updatedSettings = await privacyFilter.getUserPrivacySettings(testUserId);
        expect(updatedSettings.shareHeartRate).toBe(true);
        expect(updatedSettings.shareStressLevel).toBe(true);
      });
    });

    describe('getUserConsentSettings', () => {
      it('should return default consent settings for new user', async () => {
        const settings = await privacyFilter.getUserConsentSettings('new-user');
        
        expect(settings).toBeDefined();
        expect(settings.sharingLevel).toBe('none');
        expect(settings.retentionPeriod).toBe(30);
        expect(settings.allowResearch).toBe(false);
        expect(settings.emergencyOverride).toBe(false);
        
        // All data types should be false by default
        Object.values(settings.dataTypes).forEach(consent => {
          expect(consent).toBe(false);
        });
      });
    });
  });

  describe('Audit and Compliance', () => {
    describe('getAuditLog', () => {
      it('should return empty log for new user', async () => {
        const auditLog = await privacyFilter.getAuditLog('new-user');
        expect(auditLog).toHaveLength(0);
      });

      it('should filter audit log by user', async () => {
        // Generate some audit entries
        await privacyFilter.checkConsentStatus(testUserId, BiometricDataType.HEART_RATE);
        await privacyFilter.checkConsentStatus('other-user', BiometricDataType.HEART_RATE);

        const userLog = await privacyFilter.getAuditLog(testUserId);
        const otherUserLog = await privacyFilter.getAuditLog('other-user');

        expect(userLog.length).toBeGreaterThan(0);
        expect(otherUserLog.length).toBeGreaterThan(0);
        
        userLog.forEach(entry => {
          expect(entry.userId).toBe(testUserId);
        });
      });

      it('should filter audit log by date range', async () => {
        const startDate = new Date();
        
        // Generate audit entry
        await privacyFilter.checkConsentStatus(testUserId, BiometricDataType.HEART_RATE);
        
        const endDate = new Date();
        
        const filteredLog = await privacyFilter.getAuditLog(testUserId, startDate, endDate);
        
        filteredLog.forEach(entry => {
          expect(entry.timestamp.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
          expect(entry.timestamp.getTime()).toBeLessThanOrEqual(endDate.getTime());
        });
      });
    });

    describe('generateComplianceReport', () => {
      it('should generate compliance report with correct metrics', async () => {
        // Set up test data
        const consentSettings1 = createTestConsentSettings();
        const consentSettings2 = createTestConsentSettings({
          dataTypes: {
            ...createTestConsentSettings().dataTypes,
            [BiometricDataType.HEART_RATE]: false
          }
        });

        await privacyFilter.updateConsentSettings('user1', consentSettings1);
        await privacyFilter.updateConsentSettings('user2', consentSettings2);

        const report = await privacyFilter.generateComplianceReport(testTeamId);

        expect(report.totalUsers).toBe(2);
        expect(report.consentedUsers).toBe(2); // Both have some consent
        expect(report.dataTypesConsented[BiometricDataType.HEART_RATE]).toBe(1); // Only user1
        expect(report.dataTypesConsented[BiometricDataType.STRESS_LEVEL]).toBe(2); // Both users
        expect(report.privacyViolations).toBeGreaterThanOrEqual(0);
        expect(report.lastAuditDate).toBeInstanceOf(Date);
      });

      it('should count privacy violations correctly', async () => {
        // Generate privacy violations
        const readings = [createTestBiometricReading()];
        await privacyFilter.applyPrivacySettings(testUserId, readings); // Should create violations

        const report = await privacyFilter.generateComplianceReport(testTeamId);
        expect(report.privacyViolations).toBeGreaterThan(0);
      });
    });
  });

  describe('Data Anonymization Methods', () => {
    it('should anonymize heart rate to nearest 10', async () => {
      const privacyFilterInstance = privacyFilter as any;
      
      expect(privacyFilterInstance.anonymizeHeartRate(73)).toBe(70);
      expect(privacyFilterInstance.anonymizeHeartRate(77)).toBe(80);
      expect(privacyFilterInstance.anonymizeHeartRate(75)).toBe(80);
    });

    it('should anonymize stress level to ranges', async () => {
      const privacyFilterInstance = privacyFilter as any;
      
      expect(privacyFilterInstance.anonymizeStressLevel(15)).toBe(20);
      expect(privacyFilterInstance.anonymizeStressLevel(35)).toBe(40);
      expect(privacyFilterInstance.anonymizeStressLevel(85)).toBe(80);
    });

    it('should anonymize steps to nearest 100', async () => {
      const privacyFilterInstance = privacyFilter as any;
      
      expect(privacyFilterInstance.anonymizeSteps(1234)).toBe(1200);
      expect(privacyFilterInstance.anonymizeSteps(1567)).toBe(1600);
    });

    it('should anonymize sleep duration to nearest 30 minutes', async () => {
      const privacyFilterInstance = privacyFilter as any;
      
      expect(privacyFilterInstance.anonymizeSleepDuration(445)).toBe(450); // 7.5 hours
      expect(privacyFilterInstance.anonymizeSleepDuration(485)).toBe(480); // 8 hours
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid user IDs gracefully', async () => {
      await expect(
        privacyFilter.applyPrivacySettings('', [])
      ).rejects.toThrow(PrivacyViolationError);
    });

    it('should handle corrupted consent settings', async () => {
      const corruptedSettings = {
        dataTypes: 'invalid',
        sharingLevel: null
      } as any;

      await expect(
        privacyFilter.updateConsentSettings(testUserId, corruptedSettings)
      ).rejects.toThrow(PrivacyViolationError);
    });

    it('should handle anonymization errors gracefully', async () => {
      const corruptedReadings = [
        {
          userId: 'user1',
          heartRate: null,
          timestamp: 'invalid-date'
        } as any
      ];

      await expect(
        privacyFilter.anonymizeForTeamReporting(testTeamId, corruptedReadings)
      ).rejects.toThrow(PrivacyViolationError);
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const consentSettings = createTestConsentSettings();
      await privacyFilter.updateConsentSettings(testUserId, consentSettings);

      const readings = Array.from({ length: 1000 }, (_, i) =>
        createTestBiometricReading({
          id: `reading-${i}`,
          timestamp: new Date(Date.now() - i * 60 * 1000)
        })
      );

      const startTime = Date.now();
      const filteredData = await privacyFilter.applyPrivacySettings(testUserId, readings);
      const endTime = Date.now();

      expect(filteredData.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle team anonymization for large datasets efficiently', async () => {
      const readings = Array.from({ length: 1000 }, (_, i) =>
        createTestBiometricReading({
          id: `reading-${i}`,
          userId: `user-${i % 10}`, // 10 different users
          timestamp: new Date(Date.now() - i * 60 * 1000)
        })
      );

      const startTime = Date.now();
      const anonymizedData = await privacyFilter.anonymizeForTeamReporting(testTeamId, readings);
      const endTime = Date.now();

      expect(anonymizedData.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
    });
  });
});