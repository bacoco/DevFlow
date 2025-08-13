import { Logger } from 'winston';
import {
  BiometricReading,
  BiometricDataType,
  HeartRateReading,
  StressReading,
  ActivityReading,
  SleepReading
} from '@devflow/shared-types';
import {
  DataValidationEngine,
  ValidationResult,
  OutlierDetectionResult,
  DataQualityAssessment,
  DataValidationError
} from '../types';
import { createLogger } from '../utils/logger';

export class DataValidationEngineImpl implements DataValidationEngine {
  private logger: Logger;
  
  // Validation thresholds and rules
  private readonly VALIDATION_RULES = {
    heartRate: {
      min: 30,
      max: 220,
      restingMin: 40,
      restingMax: 120,
      maxVariability: 100
    },
    stress: {
      min: 0,
      max: 100,
      confidenceMin: 0.3
    },
    activity: {
      stepsMax: 50000,
      caloriesMax: 5000,
      distanceMax: 100, // km
      activeMinutesMax: 1440, // 24 hours
      intensityMax: 1.0
    },
    sleep: {
      durationMin: 60, // 1 hour
      durationMax: 1440, // 24 hours
      qualityMin: 0,
      qualityMax: 100,
      efficiencyMax: 100
    }
  };

  constructor() {
    this.logger = createLogger('DataValidationEngine');
  }

  // ============================================================================
  // MAIN VALIDATION METHODS
  // ============================================================================

  async validateBiometricReading(reading: BiometricReading): Promise<ValidationResult> {
    try {
      this.logger.debug(`Validating biometric reading`, { 
        readingId: reading.id, 
        userId: reading.userId 
      });

      const errors: string[] = [];
      const warnings: string[] = [];
      let correctedReading: BiometricReading | undefined;
      let confidence = 1.0;

      // Validate basic structure
      const structureValidation = this.validateReadingStructure(reading);
      if (!structureValidation.isValid) {
        errors.push(...structureValidation.errors);
        confidence *= 0.5;
      }

      // Validate timestamp
      const timestampValidation = this.validateTimestamp(reading.timestamp);
      if (!timestampValidation.isValid) {
        errors.push(...timestampValidation.errors);
        warnings.push(...timestampValidation.warnings);
        confidence *= 0.9;
      }

      // Validate heart rate data
      if (reading.heartRate) {
        const hrValidation = await this.validateHeartRateReading(reading.heartRate);
        if (!hrValidation.isValid) {
          errors.push(...hrValidation.errors);
          warnings.push(...hrValidation.warnings);
          confidence *= hrValidation.confidence;
        }
        
        if (hrValidation.correctedData) {
          correctedReading = { ...reading, heartRate: hrValidation.correctedData };
        }
      }

      // Validate stress data
      if (reading.stress) {
        const stressValidation = await this.validateStressReading(reading.stress);
        if (!stressValidation.isValid) {
          errors.push(...stressValidation.errors);
          warnings.push(...stressValidation.warnings);
          confidence *= stressValidation.confidence;
        }
        
        if (stressValidation.correctedData) {
          correctedReading = correctedReading || { ...reading };
          correctedReading.stress = stressValidation.correctedData;
        }
      }

      // Validate activity data
      if (reading.activity) {
        const activityValidation = await this.validateActivityReading(reading.activity);
        if (!activityValidation.isValid) {
          errors.push(...activityValidation.errors);
          warnings.push(...activityValidation.warnings);
          confidence *= activityValidation.confidence;
        }
        
        if (activityValidation.correctedData) {
          correctedReading = correctedReading || { ...reading };
          correctedReading.activity = activityValidation.correctedData;
        }
      }

      // Validate sleep data
      if (reading.sleep) {
        const sleepValidation = await this.validateSleepReading(reading.sleep);
        if (!sleepValidation.isValid) {
          errors.push(...sleepValidation.errors);
          warnings.push(...sleepValidation.warnings);
          confidence *= sleepValidation.confidence;
        }
        
        if (sleepValidation.correctedData) {
          correctedReading = correctedReading || { ...reading };
          correctedReading.sleep = sleepValidation.correctedData;
        }
      }

      // Cross-validate data consistency
      const consistencyValidation = await this.validateDataConsistency(reading);
      if (!consistencyValidation.isValid) {
        warnings.push(...consistencyValidation.errors);
        confidence *= 0.95;
      }

      const isValid = errors.length === 0;
      
      this.logger.debug(`Validation completed`, { 
        readingId: reading.id, 
        isValid, 
        errorsCount: errors.length,
        warningsCount: warnings.length,
        confidence 
      });

      return {
        isValid,
        errors,
        warnings,
        confidence: Math.max(0, Math.min(1, confidence)),
        correctedReading
      };
    } catch (error) {
      this.logger.error('Error during biometric reading validation', { 
        readingId: reading.id, 
        error 
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      throw new DataValidationError(
        `Validation failed: ${errorMessage}`,
        reading.userId
      );
    }
  }

  async detectOutliers(readings: BiometricReading[]): Promise<OutlierDetectionResult> {
    try {
      this.logger.info(`Detecting outliers in ${readings.length} readings`);

      if (readings.length < 3) {
        return {
          outliers: [],
          method: 'insufficient_data',
          threshold: 0,
          confidence: 0
        };
      }

      const outliers: BiometricReading[] = [];
      const method = 'interquartile_range';
      let confidence = 0.8;

      // Detect heart rate outliers
      const heartRateOutliers = await this.detectHeartRateOutliers(readings);
      outliers.push(...heartRateOutliers);

      // Detect stress level outliers
      const stressOutliers = await this.detectStressOutliers(readings);
      outliers.push(...stressOutliers);

      // Detect activity outliers
      const activityOutliers = await this.detectActivityOutliers(readings);
      outliers.push(...activityOutliers);

      // Remove duplicates
      const uniqueOutliers = outliers.filter((reading, index, self) => 
        self.findIndex(r => r.id === reading.id) === index
      );

      this.logger.info(`Detected ${uniqueOutliers.length} outliers`, { 
        method, 
        totalReadings: readings.length 
      });

      return {
        outliers: uniqueOutliers,
        method,
        threshold: 2.5, // IQR multiplier
        confidence
      };
    } catch (error) {
      this.logger.error('Error detecting outliers', { error });
      const errorMessage = error instanceof Error ? error.message : 'Unknown outlier detection error';
      throw new DataValidationError(`Outlier detection failed: ${errorMessage}`);
    }
  }

  async assessDataQuality(readings: BiometricReading[]): Promise<DataQualityAssessment> {
    try {
      this.logger.info(`Assessing data quality for ${readings.length} readings`);

      if (readings.length === 0) {
        return {
          accuracy: 0,
          completeness: 0,
          consistency: 0,
          timeliness: 0,
          overallQuality: 0,
          issues: ['No data available']
        };
      }

      // Calculate accuracy based on validation results
      let validReadings = 0;
      let totalConfidence = 0;
      
      for (const reading of readings) {
        const validation = await this.validateBiometricReading(reading);
        if (validation.isValid) {
          validReadings++;
        }
        totalConfidence += validation.confidence;
      }

      const accuracy = validReadings / readings.length;
      const avgConfidence = totalConfidence / readings.length;

      // Calculate completeness
      const completeness = this.calculateCompleteness(readings);

      // Calculate consistency
      const consistency = await this.calculateConsistency(readings);

      // Calculate timeliness
      const timeliness = this.calculateTimeliness(readings);

      // Calculate overall quality
      const overallQuality = (accuracy + completeness + consistency + timeliness) / 4;

      // Identify issues
      const issues: string[] = [];
      if (accuracy < 0.8) issues.push('Low data accuracy');
      if (completeness < 0.7) issues.push('Incomplete data');
      if (consistency < 0.8) issues.push('Inconsistent readings');
      if (timeliness < 0.9) issues.push('Outdated readings');

      this.logger.info(`Data quality assessment completed`, { 
        accuracy, 
        completeness, 
        consistency, 
        timeliness, 
        overallQuality,
        issuesCount: issues.length
      });

      return {
        accuracy,
        completeness,
        consistency,
        timeliness,
        overallQuality,
        issues
      };
    } catch (error) {
      this.logger.error('Error assessing data quality', { error });
      const errorMessage = error instanceof Error ? error.message : 'Unknown data quality error';
      throw new DataValidationError(`Data quality assessment failed: ${errorMessage}`);
    }
  }

  async interpolateMissingData(readings: BiometricReading[]): Promise<BiometricReading[]> {
    try {
      this.logger.info(`Interpolating missing data for ${readings.length} readings`);

      if (readings.length < 2) {
        return readings; // Cannot interpolate with less than 2 data points
      }

      // Sort readings by timestamp
      const sortedReadings = [...readings].sort((a, b) => 
        a.timestamp.getTime() - b.timestamp.getTime()
      );

      const interpolatedReadings: BiometricReading[] = [];

      for (let i = 0; i < sortedReadings.length; i++) {
        const currentReading = sortedReadings[i];
        interpolatedReadings.push(currentReading);

        // Check if we need to interpolate between current and next reading
        if (i < sortedReadings.length - 1) {
          const nextReading = sortedReadings[i + 1];
          const timeDiff = nextReading.timestamp.getTime() - currentReading.timestamp.getTime();
          const maxGap = 15 * 60 * 1000; // 15 minutes

          if (timeDiff > maxGap) {
            // Interpolate missing readings
            const interpolated = await this.createInterpolatedReadings(
              currentReading, 
              nextReading, 
              maxGap
            );
            interpolatedReadings.push(...interpolated);
          }
        }
      }

      this.logger.info(`Interpolation completed`, { 
        originalCount: readings.length,
        interpolatedCount: interpolatedReadings.length
      });

      return interpolatedReadings;
    } catch (error) {
      this.logger.error('Error interpolating missing data', { error });
      const errorMessage = error instanceof Error ? error.message : 'Unknown interpolation error';
      throw new DataValidationError(`Data interpolation failed: ${errorMessage}`);
    }
  }

  // ============================================================================
  // PRIVATE VALIDATION METHODS
  // ============================================================================

  private validateReadingStructure(reading: BiometricReading): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!reading.id) errors.push('Missing reading ID');
    if (!reading.userId) errors.push('Missing user ID');
    if (!reading.deviceId) errors.push('Missing device ID');
    if (!reading.timestamp) errors.push('Missing timestamp');
    if (!reading.quality) errors.push('Missing quality information');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateTimestamp(timestamp: Date): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const now = new Date();
    const timeDiff = now.getTime() - timestamp.getTime();

    // Check if timestamp is in the future
    if (timeDiff < 0) {
      errors.push('Timestamp is in the future');
    }

    // Check if timestamp is too old (more than 7 days)
    if (timeDiff > 7 * 24 * 60 * 60 * 1000) {
      warnings.push('Timestamp is more than 7 days old');
    }

    // Check if timestamp is very recent (less than 1 minute)
    if (timeDiff < 60 * 1000 && timeDiff >= 0) {
      warnings.push('Very recent timestamp - ensure clock synchronization');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async validateHeartRateReading(heartRate: HeartRateReading): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    confidence: number;
    correctedData?: HeartRateReading;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let confidence = 1.0;
    let correctedData: HeartRateReading | undefined;

    const { min, max, maxVariability } = this.VALIDATION_RULES.heartRate;

    // Validate BPM range
    if (heartRate.bpm < min || heartRate.bpm > max) {
      errors.push(`Heart rate ${heartRate.bpm} is outside valid range (${min}-${max} BPM)`);
      confidence *= 0.3;
    } else if (heartRate.bpm < 50 || heartRate.bpm > 180) {
      warnings.push(`Heart rate ${heartRate.bpm} is unusual but within valid range`);
      confidence *= 0.8;
    }

    // Validate variability
    if (heartRate.variability !== undefined) {
      if (heartRate.variability < 0 || heartRate.variability > maxVariability) {
        warnings.push(`Heart rate variability ${heartRate.variability} is outside typical range`);
        confidence *= 0.9;
        
        // Correct variability if possible
        correctedData = {
          ...heartRate,
          variability: Math.max(0, Math.min(maxVariability, heartRate.variability))
        };
      }
    }

    // Validate confidence
    if (heartRate.confidence < 0.5) {
      warnings.push('Low confidence in heart rate reading');
      confidence *= heartRate.confidence;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence,
      correctedData
    };
  }

  private async validateStressReading(stress: StressReading): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    confidence: number;
    correctedData?: StressReading;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let confidence = 1.0;
    let correctedData: StressReading | undefined;

    const { min, max, confidenceMin } = this.VALIDATION_RULES.stress;

    // Validate stress level range
    if (stress.level < min || stress.level > max) {
      errors.push(`Stress level ${stress.level} is outside valid range (${min}-${max})`);
      confidence *= 0.3;
      
      // Correct stress level
      correctedData = {
        ...stress,
        level: Math.max(min, Math.min(max, stress.level))
      };
    }

    // Validate confidence
    if (stress.confidence < confidenceMin) {
      warnings.push('Low confidence in stress reading');
      confidence *= stress.confidence;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence,
      correctedData
    };
  }

  private async validateActivityReading(activity: ActivityReading): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    confidence: number;
    correctedData?: ActivityReading;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let confidence = 1.0;
    let correctedData: ActivityReading | undefined;

    const { stepsMax, caloriesMax, distanceMax, activeMinutesMax, intensityMax } = this.VALIDATION_RULES.activity;

    // Validate steps
    if (activity.steps !== undefined) {
      if (activity.steps < 0 || activity.steps > stepsMax) {
        errors.push(`Steps ${activity.steps} is outside valid range (0-${stepsMax})`);
        confidence *= 0.5;
      }
    }

    // Validate calories
    if (activity.calories !== undefined) {
      if (activity.calories < 0 || activity.calories > caloriesMax) {
        errors.push(`Calories ${activity.calories} is outside valid range (0-${caloriesMax})`);
        confidence *= 0.5;
      }
    }

    // Validate distance
    if (activity.distance !== undefined) {
      if (activity.distance < 0 || activity.distance > distanceMax) {
        warnings.push(`Distance ${activity.distance} km seems unusual`);
        confidence *= 0.8;
      }
    }

    // Validate active minutes
    if (activity.activeMinutes !== undefined) {
      if (activity.activeMinutes < 0 || activity.activeMinutes > activeMinutesMax) {
        errors.push(`Active minutes ${activity.activeMinutes} is outside valid range (0-${activeMinutesMax})`);
        confidence *= 0.5;
      }
    }

    // Validate intensity
    if (activity.intensity < 0 || activity.intensity > intensityMax) {
      errors.push(`Activity intensity ${activity.intensity} is outside valid range (0-${intensityMax})`);
      confidence *= 0.5;
      
      // Correct intensity
      correctedData = {
        ...activity,
        intensity: Math.max(0, Math.min(intensityMax, activity.intensity))
      };
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence,
      correctedData
    };
  }

  private async validateSleepReading(sleep: SleepReading): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    confidence: number;
    correctedData?: SleepReading;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let confidence = 1.0;
    let correctedData: SleepReading | undefined;

    const { durationMin, durationMax, qualityMin, qualityMax, efficiencyMax } = this.VALIDATION_RULES.sleep;

    // Validate duration
    if (sleep.duration < durationMin || sleep.duration > durationMax) {
      errors.push(`Sleep duration ${sleep.duration} minutes is outside valid range (${durationMin}-${durationMax})`);
      confidence *= 0.3;
    }

    // Validate quality
    if (sleep.quality < qualityMin || sleep.quality > qualityMax) {
      errors.push(`Sleep quality ${sleep.quality} is outside valid range (${qualityMin}-${qualityMax})`);
      confidence *= 0.5;
      
      // Correct quality
      correctedData = {
        ...sleep,
        quality: Math.max(qualityMin, Math.min(qualityMax, sleep.quality))
      };
    }

    // Validate efficiency
    if (sleep.efficiency !== undefined) {
      if (sleep.efficiency < 0 || sleep.efficiency > efficiencyMax) {
        warnings.push(`Sleep efficiency ${sleep.efficiency}% seems unusual`);
        confidence *= 0.9;
      }
    }

    // Validate deep sleep and REM sleep don't exceed total duration
    const totalSpecialSleep = (sleep.deepSleepMinutes || 0) + (sleep.remSleepMinutes || 0);
    if (totalSpecialSleep > sleep.duration) {
      warnings.push('Deep sleep + REM sleep exceeds total sleep duration');
      confidence *= 0.7;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence,
      correctedData
    };
  }

  private async validateDataConsistency(reading: BiometricReading): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check consistency between heart rate and stress
    if (reading.heartRate && reading.stress) {
      const hrStressConsistency = this.checkHeartRateStressConsistency(
        reading.heartRate.bpm, 
        reading.stress.level
      );
      if (!hrStressConsistency) {
        errors.push('Inconsistency between heart rate and stress level');
      }
    }

    // Check consistency between activity and heart rate
    if (reading.activity && reading.heartRate) {
      const activityHrConsistency = this.checkActivityHeartRateConsistency(
        reading.activity.intensity,
        reading.heartRate.bpm
      );
      if (!activityHrConsistency) {
        errors.push('Inconsistency between activity intensity and heart rate');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private checkHeartRateStressConsistency(heartRate: number, stressLevel: number): boolean {
    // Simple consistency check - high stress should correlate with higher heart rate
    // This is a simplified model; real implementation would be more sophisticated
    const expectedMinHR = 60 + (stressLevel * 0.3);
    const expectedMaxHR = 80 + (stressLevel * 0.8);
    
    return heartRate >= expectedMinHR - 20 && heartRate <= expectedMaxHR + 20;
  }

  private checkActivityHeartRateConsistency(activityIntensity: number, heartRate: number): boolean {
    // Simple consistency check - higher activity should correlate with higher heart rate
    const expectedMinHR = 60 + (activityIntensity * 40);
    const expectedMaxHR = 80 + (activityIntensity * 80);
    
    return heartRate >= expectedMinHR - 15 && heartRate <= expectedMaxHR + 15;
  }

  // ============================================================================
  // OUTLIER DETECTION METHODS
  // ============================================================================

  private async detectHeartRateOutliers(readings: BiometricReading[]): Promise<BiometricReading[]> {
    const heartRateReadings = readings.filter(r => r.heartRate);
    if (heartRateReadings.length < 3) return [];

    const heartRates = heartRateReadings.map(r => r.heartRate!.bpm);
    const outlierIndices = this.detectOutliersUsingIQR(heartRates);
    
    return outlierIndices.map(index => heartRateReadings[index]);
  }

  private async detectStressOutliers(readings: BiometricReading[]): Promise<BiometricReading[]> {
    const stressReadings = readings.filter(r => r.stress);
    if (stressReadings.length < 3) return [];

    const stressLevels = stressReadings.map(r => r.stress!.level);
    const outlierIndices = this.detectOutliersUsingIQR(stressLevels);
    
    return outlierIndices.map(index => stressReadings[index]);
  }

  private async detectActivityOutliers(readings: BiometricReading[]): Promise<BiometricReading[]> {
    const activityReadings = readings.filter(r => r.activity);
    if (activityReadings.length < 3) return [];

    const intensities = activityReadings.map(r => r.activity!.intensity);
    const outlierIndices = this.detectOutliersUsingIQR(intensities);
    
    return outlierIndices.map(index => activityReadings[index]);
  }

  private detectOutliersUsingIQR(values: number[]): number[] {
    if (values.length < 3) return [];

    const sorted = [...values].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    const outlierIndices: number[] = [];
    values.forEach((value, index) => {
      if (value < lowerBound || value > upperBound) {
        outlierIndices.push(index);
      }
    });
    
    return outlierIndices;
  }

  // ============================================================================
  // DATA QUALITY CALCULATION METHODS
  // ============================================================================

  private calculateCompleteness(readings: BiometricReading[]): number {
    if (readings.length === 0) return 0;

    let totalFields = 0;
    let completedFields = 0;

    readings.forEach(reading => {
      // Count expected fields based on reading structure
      totalFields += 4; // id, userId, deviceId, timestamp are always expected
      completedFields += 4; // These are always present if reading exists

      // Count biometric data fields
      if (reading.heartRate) {
        totalFields += 3; // bpm, variability, confidence
        completedFields += 1; // bpm is required
        if (reading.heartRate.variability !== undefined) completedFields += 1;
        if (reading.heartRate.confidence !== undefined) completedFields += 1;
      }

      if (reading.stress) {
        totalFields += 2; // level, confidence
        completedFields += 2; // Both are typically present
      }

      if (reading.activity) {
        totalFields += 5; // steps, calories, distance, activeMinutes, intensity
        completedFields += 1; // intensity is required
        if (reading.activity.steps !== undefined) completedFields += 1;
        if (reading.activity.calories !== undefined) completedFields += 1;
        if (reading.activity.distance !== undefined) completedFields += 1;
        if (reading.activity.activeMinutes !== undefined) completedFields += 1;
      }

      if (reading.sleep) {
        totalFields += 5; // duration, quality, deepSleep, remSleep, efficiency
        completedFields += 2; // duration and quality are required
        if (reading.sleep.deepSleepMinutes !== undefined) completedFields += 1;
        if (reading.sleep.remSleepMinutes !== undefined) completedFields += 1;
        if (reading.sleep.efficiency !== undefined) completedFields += 1;
      }
    });

    return totalFields > 0 ? completedFields / totalFields : 0;
  }

  private async calculateConsistency(readings: BiometricReading[]): Promise<number> {
    if (readings.length < 2) return 1.0;

    let consistentReadings = 0;
    
    for (const reading of readings) {
      const validation = await this.validateDataConsistency(reading);
      if (validation.isValid) {
        consistentReadings++;
      }
    }

    return consistentReadings / readings.length;
  }

  private calculateTimeliness(readings: BiometricReading[]): number {
    if (readings.length === 0) return 0;

    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let timelyReadings = 0;

    readings.forEach(reading => {
      const age = now.getTime() - reading.timestamp.getTime();
      if (age <= maxAge) {
        timelyReadings++;
      }
    });

    return timelyReadings / readings.length;
  }

  // ============================================================================
  // DATA INTERPOLATION METHODS
  // ============================================================================

  private async createInterpolatedReadings(
    reading1: BiometricReading,
    reading2: BiometricReading,
    maxGap: number
  ): Promise<BiometricReading[]> {
    const interpolatedReadings: BiometricReading[] = [];
    const timeDiff = reading2.timestamp.getTime() - reading1.timestamp.getTime();
    const numInterpolations = Math.floor(timeDiff / maxGap) - 1;

    if (numInterpolations <= 0) return [];

    for (let i = 1; i <= numInterpolations; i++) {
      const ratio = i / (numInterpolations + 1);
      const interpolatedTime = new Date(
        reading1.timestamp.getTime() + (timeDiff * ratio)
      );

      const interpolatedReading: BiometricReading = {
        id: `interpolated-${reading1.userId}-${interpolatedTime.getTime()}`,
        userId: reading1.userId,
        deviceId: reading1.deviceId,
        timestamp: interpolatedTime,
        quality: {
          accuracy: 0.7, // Lower accuracy for interpolated data
          completeness: 0.8,
          reliability: 0.6,
          outlierDetected: false
        }
      };

      // Interpolate heart rate
      if (reading1.heartRate && reading2.heartRate) {
        interpolatedReading.heartRate = {
          bpm: this.interpolateValue(reading1.heartRate.bpm, reading2.heartRate.bpm, ratio),
          variability: reading1.heartRate.variability && reading2.heartRate.variability ?
            this.interpolateValue(reading1.heartRate.variability, reading2.heartRate.variability, ratio) :
            undefined,
          confidence: 0.6 // Lower confidence for interpolated data
        };
      }

      // Interpolate stress
      if (reading1.stress && reading2.stress) {
        interpolatedReading.stress = {
          level: this.interpolateValue(reading1.stress.level, reading2.stress.level, ratio),
          confidence: 0.6
        };
      }

      // Interpolate activity (using simple linear interpolation)
      if (reading1.activity && reading2.activity) {
        interpolatedReading.activity = {
          steps: reading1.activity.steps && reading2.activity.steps ?
            Math.round(this.interpolateValue(reading1.activity.steps, reading2.activity.steps, ratio)) :
            undefined,
          calories: reading1.activity.calories && reading2.activity.calories ?
            Math.round(this.interpolateValue(reading1.activity.calories, reading2.activity.calories, ratio)) :
            undefined,
          distance: reading1.activity.distance && reading2.activity.distance ?
            this.interpolateValue(reading1.activity.distance, reading2.activity.distance, ratio) :
            undefined,
          activeMinutes: reading1.activity.activeMinutes && reading2.activity.activeMinutes ?
            Math.round(this.interpolateValue(reading1.activity.activeMinutes, reading2.activity.activeMinutes, ratio)) :
            undefined,
          intensity: this.interpolateValue(reading1.activity.intensity, reading2.activity.intensity, ratio)
        };
      }

      interpolatedReadings.push(interpolatedReading);
    }

    return interpolatedReadings;
  }

  private interpolateValue(value1: number, value2: number, ratio: number): number {
    return value1 + (value2 - value1) * ratio;
  }
}