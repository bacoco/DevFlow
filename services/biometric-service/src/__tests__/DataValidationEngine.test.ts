import { DataValidationEngineImpl } from '../services/DataValidationEngine';
import { BiometricReading, BiometricDataType } from '@devflow/shared-types';
import { DataValidationError } from '../types';

describe('DataValidationEngine', () => {
  let validationEngine: DataValidationEngineImpl;

  beforeEach(() => {
    validationEngine = new DataValidationEngineImpl();
  });

  const createValidBiometricReading = (overrides: Partial<BiometricReading> = {}): BiometricReading => ({
    id: 'test-reading-123',
    userId: 'test-user-123',
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
      duration: 480, // 8 hours
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

  describe('validateBiometricReading', () => {
    it('should validate a correct biometric reading', async () => {
      const reading = createValidBiometricReading();
      const result = await validationEngine.validateBiometricReading(reading);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect missing required fields', async () => {
      const reading = createValidBiometricReading({
        id: '',
        userId: ''
      });

      const result = await validationEngine.validateBiometricReading(reading);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing reading ID');
      expect(result.errors).toContain('Missing user ID');
    });

    it('should detect invalid heart rate values', async () => {
      const reading = createValidBiometricReading({
        heartRate: {
          bpm: 250, // Invalid - too high
          confidence: 0.9
        }
      });

      const result = await validationEngine.validateBiometricReading(reading);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Heart rate'))).toBe(true);
    });

    it('should detect invalid stress levels', async () => {
      const reading = createValidBiometricReading({
        stress: {
          level: 150, // Invalid - above 100
          confidence: 0.8
        }
      });

      const result = await validationEngine.validateBiometricReading(reading);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Stress level'))).toBe(true);
    });

    it('should detect invalid activity values', async () => {
      const reading = createValidBiometricReading({
        activity: {
          steps: -100, // Invalid - negative
          intensity: 1.5 // Invalid - above 1.0
        }
      });

      const result = await validationEngine.validateBiometricReading(reading);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Steps'))).toBe(true);
      expect(result.errors.some(error => error.includes('intensity'))).toBe(true);
    });

    it('should detect invalid sleep values', async () => {
      const reading = createValidBiometricReading({
        sleep: {
          duration: 30, // Invalid - too short
          quality: 150 // Invalid - above 100
        }
      });

      const result = await validationEngine.validateBiometricReading(reading);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Sleep duration'))).toBe(true);
      expect(result.errors.some(error => error.includes('Sleep quality'))).toBe(true);
    });

    it('should provide corrected data for fixable issues', async () => {
      const reading = createValidBiometricReading({
        stress: {
          level: 105, // Slightly above valid range
          confidence: 0.8
        }
      });

      const result = await validationEngine.validateBiometricReading(reading);

      expect(result.correctedReading).toBeDefined();
      expect(result.correctedReading!.stress!.level).toBe(100);
    });

    it('should detect future timestamps', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour in future
      const reading = createValidBiometricReading({
        timestamp: futureDate
      });

      const result = await validationEngine.validateBiometricReading(reading);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('future'))).toBe(true);
    });

    it('should warn about old timestamps', async () => {
      const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      const reading = createValidBiometricReading({
        timestamp: oldDate
      });

      const result = await validationEngine.validateBiometricReading(reading);

      expect(result.warnings.some(warning => warning.includes('7 days old'))).toBe(true);
    });

    it('should validate data consistency between metrics', async () => {
      const reading = createValidBiometricReading({
        heartRate: {
          bpm: 60, // Very low heart rate
          confidence: 0.9
        },
        stress: {
          level: 95, // Very high stress - inconsistent with low HR
          confidence: 0.8
        }
      });

      const result = await validationEngine.validateBiometricReading(reading);

      // Should have warnings about inconsistency
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('detectOutliers', () => {
    it('should detect no outliers with insufficient data', async () => {
      const readings = [createValidBiometricReading()];
      const result = await validationEngine.detectOutliers(readings);

      expect(result.outliers).toHaveLength(0);
      expect(result.method).toBe('insufficient_data');
    });

    it('should detect heart rate outliers', async () => {
      const readings = [
        createValidBiometricReading({ heartRate: { bpm: 70, confidence: 0.9 } }),
        createValidBiometricReading({ heartRate: { bpm: 72, confidence: 0.9 } }),
        createValidBiometricReading({ heartRate: { bpm: 75, confidence: 0.9 } }),
        createValidBiometricReading({ heartRate: { bpm: 180, confidence: 0.9 } }), // Outlier
        createValidBiometricReading({ heartRate: { bpm: 73, confidence: 0.9 } })
      ];

      const result = await validationEngine.detectOutliers(readings);

      expect(result.outliers.length).toBeGreaterThan(0);
      expect(result.method).toBe('interquartile_range');
    });

    it('should detect stress level outliers', async () => {
      const readings = [
        createValidBiometricReading({ stress: { level: 20, confidence: 0.8 } }),
        createValidBiometricReading({ stress: { level: 25, confidence: 0.8 } }),
        createValidBiometricReading({ stress: { level: 30, confidence: 0.8 } }),
        createValidBiometricReading({ stress: { level: 95, confidence: 0.8 } }), // Outlier
        createValidBiometricReading({ stress: { level: 22, confidence: 0.8 } })
      ];

      const result = await validationEngine.detectOutliers(readings);

      expect(result.outliers.length).toBeGreaterThan(0);
    });

    it('should remove duplicate outliers', async () => {
      const outlierReading = createValidBiometricReading({
        heartRate: { bpm: 200, confidence: 0.9 },
        stress: { level: 95, confidence: 0.8 }
      });

      const readings = [
        createValidBiometricReading({ heartRate: { bpm: 70, confidence: 0.9 } }),
        createValidBiometricReading({ heartRate: { bpm: 72, confidence: 0.9 } }),
        outlierReading, // This reading is an outlier for both HR and stress
        createValidBiometricReading({ heartRate: { bpm: 75, confidence: 0.9 } }),
        createValidBiometricReading({ heartRate: { bpm: 73, confidence: 0.9 } })
      ];

      const result = await validationEngine.detectOutliers(readings);

      // Should not have duplicate entries for the same reading
      const outlierIds = result.outliers.map(r => r.id);
      const uniqueIds = [...new Set(outlierIds)];
      expect(outlierIds.length).toBe(uniqueIds.length);
    });
  });

  describe('assessDataQuality', () => {
    it('should return zero quality for empty data', async () => {
      const result = await validationEngine.assessDataQuality([]);

      expect(result.accuracy).toBe(0);
      expect(result.completeness).toBe(0);
      expect(result.consistency).toBe(0);
      expect(result.timeliness).toBe(0);
      expect(result.overallQuality).toBe(0);
      expect(result.issues).toContain('No data available');
    });

    it('should assess quality of valid data', async () => {
      const readings = [
        createValidBiometricReading(),
        createValidBiometricReading({
          id: 'reading-2',
          timestamp: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
        }),
        createValidBiometricReading({
          id: 'reading-3',
          timestamp: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
        })
      ];

      const result = await validationEngine.assessDataQuality(readings);

      expect(result.accuracy).toBeGreaterThan(0.8);
      expect(result.completeness).toBeGreaterThan(0.7);
      expect(result.consistency).toBeGreaterThan(0.8);
      expect(result.timeliness).toBeGreaterThan(0.9);
      expect(result.overallQuality).toBeGreaterThan(0.8);
      expect(result.issues.length).toBe(0);
    });

    it('should identify quality issues', async () => {
      const readings = [
        createValidBiometricReading({
          heartRate: { bpm: 250, confidence: 0.9 } // Invalid data
        }),
        createValidBiometricReading({
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // Old data
        })
      ];

      const result = await validationEngine.assessDataQuality(readings);

      expect(result.accuracy).toBeLessThan(0.8);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should calculate completeness based on available fields', async () => {
      const incompleteReadings = [
        createValidBiometricReading({
          heartRate: undefined,
          stress: undefined,
          sleep: undefined
          // Only activity data present
        })
      ];

      const result = await validationEngine.assessDataQuality(incompleteReadings);

      expect(result.completeness).toBeLessThan(0.7);
      expect(result.issues).toContain('Incomplete data');
    });
  });

  describe('interpolateMissingData', () => {
    it('should return original data if less than 2 readings', async () => {
      const readings = [createValidBiometricReading()];
      const result = await validationEngine.interpolateMissingData(readings);

      expect(result).toEqual(readings);
    });

    it('should not interpolate if gap is small', async () => {
      const readings = [
        createValidBiometricReading({
          timestamp: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
        }),
        createValidBiometricReading({
          timestamp: new Date() // Now
        })
      ];

      const result = await validationEngine.interpolateMissingData(readings);

      expect(result.length).toBe(2); // No interpolation
    });

    it('should interpolate missing data for large gaps', async () => {
      const readings = [
        createValidBiometricReading({
          id: 'reading-1',
          timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          heartRate: { bpm: 70, confidence: 0.9 }
        }),
        createValidBiometricReading({
          id: 'reading-2',
          timestamp: new Date(), // Now
          heartRate: { bpm: 80, confidence: 0.9 }
        })
      ];

      const result = await validationEngine.interpolateMissingData(readings);

      expect(result.length).toBeGreaterThan(2); // Should have interpolated readings
      
      // Check that interpolated readings have correct structure
      const interpolatedReadings = result.filter(r => r.id.includes('interpolated'));
      interpolatedReadings.forEach(reading => {
        expect(reading.id).toContain('interpolated');
        expect(reading.quality.accuracy).toBeLessThan(0.8); // Lower accuracy for interpolated
      });
    });

    it('should sort readings by timestamp before interpolation', async () => {
      const readings = [
        createValidBiometricReading({
          id: 'reading-2',
          timestamp: new Date() // Later timestamp
        }),
        createValidBiometricReading({
          id: 'reading-1',
          timestamp: new Date(Date.now() - 30 * 60 * 1000) // Earlier timestamp
        })
      ];

      const result = await validationEngine.interpolateMissingData(readings);

      // Should be sorted by timestamp
      for (let i = 1; i < result.length; i++) {
        expect(result[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          result[i - 1].timestamp.getTime()
        );
      }
    });

    it('should interpolate heart rate values correctly', async () => {
      const readings = [
        createValidBiometricReading({
          id: 'reading-1',
          timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          heartRate: { bpm: 60, confidence: 0.9 }
        }),
        createValidBiometricReading({
          id: 'reading-2',
          timestamp: new Date(), // Now
          heartRate: { bpm: 80, confidence: 0.9 }
        })
      ];

      const result = await validationEngine.interpolateMissingData(readings);

      const interpolatedReadings = result.filter(r => r.id.includes('interpolated'));
      
      if (interpolatedReadings.length > 0) {
        interpolatedReadings.forEach(reading => {
          expect(reading.heartRate).toBeDefined();
          expect(reading.heartRate!.bpm).toBeGreaterThan(60);
          expect(reading.heartRate!.bpm).toBeLessThan(80);
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      const invalidReading = {
        // Missing required fields
      } as BiometricReading;

      await expect(
        validationEngine.validateBiometricReading(invalidReading)
      ).rejects.toThrow(DataValidationError);
    });

    it('should handle outlier detection errors gracefully', async () => {
      const readings = [
        createValidBiometricReading({
          heartRate: undefined // No heart rate data
        })
      ];

      const result = await validationEngine.detectOutliers(readings);

      expect(result.outliers).toHaveLength(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle data quality assessment errors gracefully', async () => {
      const corruptedReadings = [
        {
          id: 'corrupt-reading',
          // Missing most required fields
        } as BiometricReading
      ];

      await expect(
        validationEngine.assessDataQuality(corruptedReadings)
      ).resolves.toBeDefined();
    });

    it('should handle interpolation errors gracefully', async () => {
      const problematicReadings = [
        createValidBiometricReading({
          timestamp: new Date('invalid-date')
        }),
        createValidBiometricReading()
      ];

      await expect(
        validationEngine.interpolateMissingData(problematicReadings)
      ).rejects.toThrow(DataValidationError);
    });
  });

  describe('Performance', () => {
    it('should validate large datasets efficiently', async () => {
      const readings = Array.from({ length: 1000 }, (_, i) =>
        createValidBiometricReading({
          id: `reading-${i}`,
          timestamp: new Date(Date.now() - i * 60 * 1000)
        })
      );

      const startTime = Date.now();
      
      for (const reading of readings.slice(0, 100)) { // Test first 100
        await validationEngine.validateBiometricReading(reading);
      }
      
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should detect outliers in large datasets efficiently', async () => {
      const readings = Array.from({ length: 1000 }, (_, i) =>
        createValidBiometricReading({
          id: `reading-${i}`,
          heartRate: { bpm: 70 + Math.random() * 20, confidence: 0.9 }
        })
      );

      // Add some outliers
      readings.push(createValidBiometricReading({
        id: 'outlier-1',
        heartRate: { bpm: 200, confidence: 0.9 }
      }));

      const startTime = Date.now();
      const result = await validationEngine.detectOutliers(readings);
      const endTime = Date.now();

      expect(result.outliers.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
    });
  });
});