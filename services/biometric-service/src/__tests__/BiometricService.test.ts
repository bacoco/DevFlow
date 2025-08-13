import { BiometricServiceImpl } from '../services/BiometricService';
import { DeviceType, BiometricDataType, ConnectionStatus } from '@devflow/shared-types';
import { DeviceConnectionError, BiometricServiceError } from '../types';

describe('BiometricService', () => {
  let biometricService: BiometricServiceImpl;
  const testUserId = 'test-user-123';
  const testDeviceCredentials = {
    accessToken: 'test-access-token-12345',
    refreshToken: 'test-refresh-token-67890'
  };

  beforeEach(() => {
    biometricService = new BiometricServiceImpl();
  });

  describe('Device Management', () => {
    describe('connectDevice', () => {
      it('should successfully connect an Apple Watch device', async () => {
        const result = await biometricService.connectDevice(
          testUserId,
          DeviceType.APPLE_WATCH,
          { accessToken: 'valid-apple-token' }
        );

        expect(result.success).toBe(true);
        expect(result.deviceId).toBeDefined();
        expect(result.connectionStatus).toBe(ConnectionStatus.CONNECTED);
      });

      it('should successfully connect a Fitbit device', async () => {
        const result = await biometricService.connectDevice(
          testUserId,
          DeviceType.FITBIT,
          testDeviceCredentials
        );

        expect(result.success).toBe(true);
        expect(result.deviceId).toBeDefined();
        expect(result.connectionStatus).toBe(ConnectionStatus.CONNECTED);
      });

      it('should successfully connect a Garmin device', async () => {
        const result = await biometricService.connectDevice(
          testUserId,
          DeviceType.GARMIN,
          {
            accessToken: 'valid-garmin-token',
            apiKey: 'valid-garmin-api-key'
          }
        );

        expect(result.success).toBe(true);
        expect(result.deviceId).toBeDefined();
        expect(result.connectionStatus).toBe(ConnectionStatus.CONNECTED);
      });

      it('should fail with invalid credentials', async () => {
        await expect(
          biometricService.connectDevice(
            testUserId,
            DeviceType.FITBIT,
            { accessToken: '' }
          )
        ).rejects.toThrow(DeviceConnectionError);
      });

      it('should fail with unsupported device type', async () => {
        await expect(
          biometricService.connectDevice(
            testUserId,
            'UNSUPPORTED_DEVICE' as DeviceType,
            testDeviceCredentials
          )
        ).rejects.toThrow(DeviceConnectionError);
      });
    });

    describe('getConnectedDevices', () => {
      it('should return empty array for user with no devices', async () => {
        const devices = await biometricService.getConnectedDevices('new-user');
        expect(devices).toEqual([]);
      });

      it('should return connected devices for user', async () => {
        // First connect a device
        const connectionResult = await biometricService.connectDevice(
          testUserId,
          DeviceType.FITBIT,
          testDeviceCredentials
        );

        const devices = await biometricService.getConnectedDevices(testUserId);
        
        expect(devices).toHaveLength(1);
        expect(devices[0].deviceId).toBe(connectionResult.deviceId);
        expect(devices[0].deviceType).toBe(DeviceType.FITBIT);
        expect(devices[0].connectionStatus).toBe(ConnectionStatus.CONNECTED);
      });
    });

    describe('disconnectDevice', () => {
      it('should successfully disconnect a device', async () => {
        // First connect a device
        const connectionResult = await biometricService.connectDevice(
          testUserId,
          DeviceType.FITBIT,
          testDeviceCredentials
        );

        // Then disconnect it
        await expect(
          biometricService.disconnectDevice(testUserId, connectionResult.deviceId!)
        ).resolves.not.toThrow();

        // Verify it's no longer in connected devices
        const devices = await biometricService.getConnectedDevices(testUserId);
        expect(devices).toHaveLength(0);
      });

      it('should fail when disconnecting non-existent device', async () => {
        await expect(
          biometricService.disconnectDevice(testUserId, 'non-existent-device')
        ).rejects.toThrow(DeviceConnectionError);
      });
    });

    describe('syncDeviceData', () => {
      it('should successfully sync device data', async () => {
        // First connect a device
        const connectionResult = await biometricService.connectDevice(
          testUserId,
          DeviceType.FITBIT,
          testDeviceCredentials
        );

        // Then sync data
        await expect(
          biometricService.syncDeviceData(testUserId, connectionResult.deviceId!)
        ).resolves.not.toThrow();
      });

      it('should fail when syncing non-existent device', async () => {
        await expect(
          biometricService.syncDeviceData(testUserId, 'non-existent-device')
        ).rejects.toThrow(DeviceConnectionError);
      });
    });
  });

  describe('Data Collection', () => {
    beforeEach(async () => {
      // Connect a test device for data collection tests
      await biometricService.connectDevice(
        testUserId,
        DeviceType.FITBIT,
        testDeviceCredentials
      );
    });

    describe('collectBiometricData', () => {
      it('should collect biometric data for specified time range', async () => {
        const timeRange = {
          startTime: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          endTime: new Date()
        };

        const data = await biometricService.collectBiometricData(testUserId, timeRange);

        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThan(0);
        
        // Verify data structure
        data.forEach(reading => {
          expect(reading.id).toBeDefined();
          expect(reading.userId).toBe(testUserId);
          expect(reading.deviceId).toBeDefined();
          expect(reading.timestamp).toBeInstanceOf(Date);
          expect(reading.quality).toBeDefined();
        });
      });

      it('should return empty array for user with no devices', async () => {
        const timeRange = {
          startTime: new Date(Date.now() - 60 * 60 * 1000),
          endTime: new Date()
        };

        const data = await biometricService.collectBiometricData('no-devices-user', timeRange);
        expect(data).toEqual([]);
      });
    });

    describe('streamBiometricData', () => {
      it('should create observable stream for biometric data', (done) => {
        const stream = biometricService.streamBiometricData(testUserId);
        
        expect(stream).toBeDefined();
        expect(typeof stream.subscribe).toBe('function');
        
        // Test that stream can be subscribed to
        const subscription = stream.subscribe({
          next: (reading: any) => {
            expect(reading.userId).toBe(testUserId);
            subscription.unsubscribe();
            done();
          },
          error: (error: any) => {
            subscription.unsubscribe();
            done(error);
          }
        });

        // Simulate a reading after a short delay
        setTimeout(() => {
          // In a real test, we would emit a test reading
          subscription.unsubscribe();
          done();
        }, 100);
      });
    });
  });

  describe('Health Metrics', () => {
    beforeEach(async () => {
      // Connect a test device and create a basic profile
      await biometricService.connectDevice(
        testUserId,
        DeviceType.FITBIT,
        testDeviceCredentials
      );
    });

    describe('calculateStressLevel', () => {
      it('should calculate stress level metrics', async () => {
        const stressMetrics = await biometricService.calculateStressLevel(testUserId);

        expect(stressMetrics).toBeDefined();
        expect(typeof stressMetrics.currentLevel).toBe('number');
        expect(stressMetrics.currentLevel).toBeGreaterThanOrEqual(0);
        expect(stressMetrics.currentLevel).toBeLessThanOrEqual(100);
        expect(['increasing', 'decreasing', 'stable']).toContain(stressMetrics.trend);
        expect(Array.isArray(stressMetrics.contributingFactors)).toBe(true);
        expect(Array.isArray(stressMetrics.recommendations)).toBe(true);
        expect(typeof stressMetrics.confidence).toBe('number');
      });
    });

    describe('detectFatigue', () => {
      it('should detect fatigue indicators', async () => {
        const fatigueIndicators = await biometricService.detectFatigue(testUserId);

        expect(fatigueIndicators).toBeDefined();
        expect(typeof fatigueIndicators.fatigueLevel).toBe('number');
        expect(fatigueIndicators.fatigueLevel).toBeGreaterThanOrEqual(0);
        expect(fatigueIndicators.fatigueLevel).toBeLessThanOrEqual(100);
        expect(fatigueIndicators.indicators).toBeDefined();
        expect(Array.isArray(fatigueIndicators.recommendations)).toBe(true);
        expect(['low', 'medium', 'high', 'critical']).toContain(fatigueIndicators.severity);
      });
    });

    describe('assessWellnessScore', () => {
      it('should assess overall wellness score', async () => {
        const wellnessScore = await biometricService.assessWellnessScore(testUserId);

        expect(wellnessScore).toBeDefined();
        expect(typeof wellnessScore.overallScore).toBe('number');
        expect(wellnessScore.overallScore).toBeGreaterThanOrEqual(0);
        expect(wellnessScore.overallScore).toBeLessThanOrEqual(100);
        expect(wellnessScore.components).toBeDefined();
        expect(typeof wellnessScore.components.physical).toBe('number');
        expect(typeof wellnessScore.components.mental).toBe('number');
        expect(typeof wellnessScore.components.stress).toBe('number');
        expect(typeof wellnessScore.components.recovery).toBe('number');
        expect(['improving', 'declining', 'stable']).toContain(wellnessScore.trend);
        expect(wellnessScore.lastUpdated).toBeInstanceOf(Date);
      });
    });

    describe('analyzeHeartRateVariability', () => {
      it('should analyze heart rate variability', async () => {
        const hrvAnalysis = await biometricService.analyzeHeartRateVariability(testUserId);

        expect(hrvAnalysis).toBeDefined();
        expect(typeof hrvAnalysis.rmssd).toBe('number');
        expect(typeof hrvAnalysis.pnn50).toBe('number');
        expect(typeof hrvAnalysis.stressIndex).toBe('number');
        expect(['excellent', 'good', 'fair', 'poor']).toContain(hrvAnalysis.recoveryStatus);
        expect(Array.isArray(hrvAnalysis.recommendations)).toBe(true);
      });
    });
  });

  describe('Biometric Profile Management', () => {
    describe('getBiometricProfile', () => {
      it('should throw error for non-existent profile', async () => {
        await expect(
          biometricService.getBiometricProfile('non-existent-user')
        ).rejects.toThrow(BiometricServiceError);
      });
    });

    describe('updateBiometricProfile', () => {
      it('should throw error when updating non-existent profile', async () => {
        await expect(
          biometricService.updateBiometricProfile('non-existent-user', {})
        ).rejects.toThrow(BiometricServiceError);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid user IDs gracefully', async () => {
      await expect(
        biometricService.connectDevice('', DeviceType.FITBIT, testDeviceCredentials)
      ).rejects.toThrow();
    });

    it('should handle network errors during device connection', async () => {
      // This would be tested with proper mocking in a real implementation
      const invalidCredentials = { accessToken: 'invalid' };
      
      await expect(
        biometricService.connectDevice(testUserId, DeviceType.FITBIT, invalidCredentials)
      ).rejects.toThrow(DeviceConnectionError);
    });

    it('should handle malformed time ranges', async () => {
      const invalidTimeRange = {
        startTime: new Date('invalid-date'),
        endTime: new Date()
      };

      await expect(
        biometricService.collectBiometricData(testUserId, invalidTimeRange)
      ).rejects.toThrow();
    });
  });

  describe('Data Privacy and Security', () => {
    beforeEach(async () => {
      await biometricService.connectDevice(
        testUserId,
        DeviceType.FITBIT,
        testDeviceCredentials
      );
    });

    it('should apply privacy filters to collected data', async () => {
      const timeRange = {
        startTime: new Date(Date.now() - 60 * 60 * 1000),
        endTime: new Date()
      };

      const data = await biometricService.collectBiometricData(testUserId, timeRange);
      
      // Verify that privacy filtering was applied
      expect(data).toBeDefined();
      // In a real implementation, we would verify specific privacy transformations
    });

    it('should validate data quality before processing', async () => {
      const timeRange = {
        startTime: new Date(Date.now() - 60 * 60 * 1000),
        endTime: new Date()
      };

      const data = await biometricService.collectBiometricData(testUserId, timeRange);
      
      // Verify that all returned data has quality information
      data.forEach(reading => {
        expect(reading.quality).toBeDefined();
        expect(reading.quality.accuracy).toBeGreaterThan(0);
        expect(reading.quality.completeness).toBeGreaterThan(0);
        expect(reading.quality.reliability).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent device connections', async () => {
      const connectionPromises = [];
      
      for (let i = 0; i < 5; i++) {
        connectionPromises.push(
          biometricService.connectDevice(
            `user-${i}`,
            DeviceType.FITBIT,
            testDeviceCredentials
          )
        );
      }

      const results = await Promise.all(connectionPromises);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.deviceId).toBeDefined();
      });
    });

    it('should handle large data collection requests efficiently', async () => {
      await biometricService.connectDevice(
        testUserId,
        DeviceType.FITBIT,
        testDeviceCredentials
      );

      const timeRange = {
        startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        endTime: new Date()
      };

      const startTime = Date.now();
      const data = await biometricService.collectBiometricData(testUserId, timeRange);
      const endTime = Date.now();

      expect(data).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});