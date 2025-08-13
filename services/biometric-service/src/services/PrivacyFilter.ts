import { Logger } from 'winston';
import {
  BiometricReading,
  BiometricDataType,
  BiometricPrivacySettings,
  createDefaultBiometricPrivacySettings
} from '@devflow/shared-types';
import {
  PrivacyFilter,
  AnonymizedBiometricData,
  ConsentSettings,
  PrivacyViolationError
} from '../types';
import { createLogger } from '../utils/logger';

export class PrivacyFilterImpl implements PrivacyFilter {
  private logger: Logger;
  
  // In-memory storage for demo purposes - in production, use proper database
  private userPrivacySettings: Map<string, BiometricPrivacySettings> = new Map();
  private userConsentSettings: Map<string, ConsentSettings> = new Map();
  private auditLog: Array<{
    userId: string;
    action: string;
    dataType: BiometricDataType;
    timestamp: Date;
    approved: boolean;
  }> = [];

  constructor() {
    this.logger = createLogger('PrivacyFilter');
  }

  // ============================================================================
  // MAIN PRIVACY FILTERING METHODS
  // ============================================================================

  async applyPrivacySettings(userId: string, data: BiometricReading[]): Promise<BiometricReading[]> {
    try {
      this.logger.debug(`Applying privacy settings for user ${userId}`, { 
        dataCount: data.length 
      });

      // Get user's privacy settings
      const privacySettings = await this.getUserPrivacySettings(userId);
      
      // Get user's consent settings
      const consentSettings = await this.getUserConsentSettings(userId);

      const filteredData: BiometricReading[] = [];

      for (const reading of data) {
        try {
          // Check consent for each data type in the reading
          const consentChecks = await this.performConsentChecks(userId, reading, consentSettings);
          
          if (!consentChecks.hasValidConsent) {
            this.logger.warn(`Consent violation detected for user ${userId}`, {
              readingId: reading.id,
              violatedDataTypes: consentChecks.violatedDataTypes
            });
            
            // Log privacy violation
            await this.logPrivacyViolation(userId, reading, consentChecks.violatedDataTypes);
            continue; // Skip this reading
          }

          // Apply privacy filters based on settings
          const filteredReading = await this.applyPrivacyFiltersToReading(
            reading, 
            privacySettings, 
            consentSettings
          );

          if (filteredReading) {
            filteredData.push(filteredReading);
            
            // Log successful data access
            await this.logDataAccess(userId, reading, 'filtered_access');
          }
        } catch (error) {
          this.logger.error(`Error filtering reading ${reading.id}`, { userId, error });
          // Continue with other readings
        }
      }

      this.logger.info(`Privacy filtering completed`, { 
        userId, 
        originalCount: data.length, 
        filteredCount: filteredData.length 
      });

      return filteredData;
    } catch (error) {
      this.logger.error('Error applying privacy settings', { userId, error });
      const errorMessage = error instanceof Error ? error.message : 'Unknown privacy filtering error';
      throw new PrivacyViolationError(
        `Privacy filtering failed: ${errorMessage}`,
        userId
      );
    }
  }

  async anonymizeForTeamReporting(teamId: string, data: BiometricReading[]): Promise<AnonymizedBiometricData[]> {
    try {
      this.logger.info(`Anonymizing data for team reporting`, { 
        teamId, 
        dataCount: data.length 
      });

      if (data.length === 0) {
        return [];
      }

      // Group data by time intervals (e.g., hourly)
      const timeIntervals = this.groupDataByTimeIntervals(data, 60 * 60 * 1000); // 1 hour intervals
      const anonymizedData: AnonymizedBiometricData[] = [];

      for (const [timestamp, readings] of timeIntervals) {
        // Check if we have enough participants for anonymization
        const uniqueUsers = new Set(readings.map(r => r.userId));
        const participantCount = uniqueUsers.size;

        // Require minimum 3 participants for anonymization
        if (participantCount < 3) {
          this.logger.debug(`Skipping interval due to insufficient participants`, {
            timestamp,
            participantCount
          });
          continue;
        }

        // Calculate aggregated metrics
        const aggregatedMetrics = this.calculateAggregatedMetrics(readings);
        
        // Calculate confidence intervals
        const confidenceInterval = this.calculateConfidenceInterval(readings);

        const anonymizedReading: AnonymizedBiometricData = {
          timestamp: new Date(timestamp),
          aggregatedMetrics,
          participantCount,
          confidenceInterval
        };

        anonymizedData.push(anonymizedReading);

        // Log anonymization
        await this.logAnonymization(teamId, readings.length, participantCount);
      }

      this.logger.info(`Team data anonymization completed`, { 
        teamId, 
        originalReadings: data.length,
        anonymizedIntervals: anonymizedData.length
      });

      return anonymizedData;
    } catch (error) {
      this.logger.error('Error anonymizing team data', { teamId, error });
      const errorMessage = error instanceof Error ? error.message : 'Unknown anonymization error';
      throw new PrivacyViolationError(
        `Team data anonymization failed: ${errorMessage}`,
        'team-' + teamId
      );
    }
  }

  async checkConsentStatus(userId: string, dataType: BiometricDataType): Promise<boolean> {
    try {
      this.logger.debug(`Checking consent status`, { userId, dataType });

      const consentSettings = await this.getUserConsentSettings(userId);
      const hasConsent = consentSettings.dataTypes[dataType] === true;

      // Log consent check
      this.auditLog.push({
        userId,
        action: 'consent_check',
        dataType,
        timestamp: new Date(),
        approved: hasConsent
      });

      return hasConsent;
    } catch (error) {
      this.logger.error('Error checking consent status', { userId, dataType, error });
      return false; // Fail safe - deny access if error
    }
  }

  async updateConsentSettings(userId: string, settings: ConsentSettings): Promise<void> {
    try {
      this.logger.info(`Updating consent settings for user ${userId}`);

      // Validate consent settings
      const validationResult = this.validateConsentSettings(settings);
      if (!validationResult.isValid) {
        throw new PrivacyViolationError(
          `Invalid consent settings: ${validationResult.errors.join(', ')}`,
          userId
        );
      }

      // Store updated consent settings
      this.userConsentSettings.set(userId, {
        ...settings,
        // Ensure emergency override is properly handled
        emergencyOverride: settings.emergencyOverride || false
      });

      // Log consent update
      this.auditLog.push({
        userId,
        action: 'consent_update',
        dataType: BiometricDataType.HEART_RATE, // Generic log entry
        timestamp: new Date(),
        approved: true
      });

      this.logger.info(`Consent settings updated successfully`, { userId });
    } catch (error) {
      this.logger.error('Error updating consent settings', { userId, error });
      throw error;
    }
  }

  // ============================================================================
  // PRIVACY SETTINGS MANAGEMENT
  // ============================================================================

  async getUserPrivacySettings(userId: string): Promise<BiometricPrivacySettings> {
    let settings = this.userPrivacySettings.get(userId);
    
    if (!settings) {
      // Create default privacy settings
      settings = createDefaultBiometricPrivacySettings();
      this.userPrivacySettings.set(userId, settings);
      
      this.logger.info(`Created default privacy settings for user ${userId}`);
    }

    return settings;
  }

  async updateUserPrivacySettings(userId: string, settings: Partial<BiometricPrivacySettings>): Promise<void> {
    try {
      const currentSettings = await this.getUserPrivacySettings(userId);
      const updatedSettings: BiometricPrivacySettings = {
        ...currentSettings,
        ...settings
      };

      this.userPrivacySettings.set(userId, updatedSettings);
      
      this.logger.info(`Privacy settings updated for user ${userId}`, { settings });
    } catch (error) {
      this.logger.error('Error updating privacy settings', { userId, error });
      const errorMessage = error instanceof Error ? error.message : 'Unknown privacy settings error';
      throw new PrivacyViolationError(
        `Failed to update privacy settings: ${errorMessage}`,
        userId
      );
    }
  }

  async getUserConsentSettings(userId: string): Promise<ConsentSettings> {
    let settings = this.userConsentSettings.get(userId);
    
    if (!settings) {
      // Create default consent settings - all disabled by default
      settings = {
        dataTypes: {
          [BiometricDataType.HEART_RATE]: false,
          [BiometricDataType.STRESS_LEVEL]: false,
          [BiometricDataType.ACTIVITY_LEVEL]: false,
          [BiometricDataType.SLEEP_QUALITY]: false,
          [BiometricDataType.BLOOD_PRESSURE]: false,
          [BiometricDataType.BODY_TEMPERATURE]: false
        },
        sharingLevel: 'none',
        retentionPeriod: 30, // 30 days default
        allowResearch: false,
        emergencyOverride: false
      };
      
      this.userConsentSettings.set(userId, settings);
      this.logger.info(`Created default consent settings for user ${userId}`);
    }

    return settings;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async performConsentChecks(
    userId: string, 
    reading: BiometricReading, 
    consentSettings: ConsentSettings
  ): Promise<{ hasValidConsent: boolean; violatedDataTypes: BiometricDataType[] }> {
    const violatedDataTypes: BiometricDataType[] = [];

    // Check consent for each data type present in the reading
    if (reading.heartRate && !consentSettings.dataTypes[BiometricDataType.HEART_RATE]) {
      violatedDataTypes.push(BiometricDataType.HEART_RATE);
    }

    if (reading.stress && !consentSettings.dataTypes[BiometricDataType.STRESS_LEVEL]) {
      violatedDataTypes.push(BiometricDataType.STRESS_LEVEL);
    }

    if (reading.activity && !consentSettings.dataTypes[BiometricDataType.ACTIVITY_LEVEL]) {
      violatedDataTypes.push(BiometricDataType.ACTIVITY_LEVEL);
    }

    if (reading.sleep && !consentSettings.dataTypes[BiometricDataType.SLEEP_QUALITY]) {
      violatedDataTypes.push(BiometricDataType.SLEEP_QUALITY);
    }

    // Check if emergency override applies
    const hasEmergencyOverride = consentSettings.emergencyOverride && 
      await this.isEmergencyScenario(userId, reading);

    const hasValidConsent = violatedDataTypes.length === 0 || hasEmergencyOverride;

    return { hasValidConsent, violatedDataTypes };
  }

  private async applyPrivacyFiltersToReading(
    reading: BiometricReading,
    privacySettings: BiometricPrivacySettings,
    consentSettings: ConsentSettings
  ): Promise<BiometricReading | null> {
    const filteredReading: BiometricReading = {
      ...reading
    };

    // Apply heart rate privacy filters
    if (reading.heartRate && !privacySettings.shareHeartRate) {
      // Remove or anonymize heart rate data
      if (consentSettings.sharingLevel === 'none') {
        delete filteredReading.heartRate;
      } else {
        // Anonymize by rounding to ranges
        filteredReading.heartRate = {
          ...reading.heartRate,
          bpm: this.anonymizeHeartRate(reading.heartRate.bpm),
          variability: undefined // Remove detailed variability data
        };
      }
    }

    // Apply stress level privacy filters
    if (reading.stress && !privacySettings.shareStressLevel) {
      if (consentSettings.sharingLevel === 'none') {
        delete filteredReading.stress;
      } else {
        // Anonymize stress level to ranges
        filteredReading.stress = {
          ...reading.stress,
          level: this.anonymizeStressLevel(reading.stress.level),
          indicators: undefined // Remove detailed indicators
        };
      }
    }

    // Apply activity data privacy filters
    if (reading.activity && !privacySettings.shareActivityData) {
      if (consentSettings.sharingLevel === 'none') {
        delete filteredReading.activity;
      } else {
        // Anonymize activity data
        filteredReading.activity = {
          ...reading.activity,
          steps: reading.activity.steps ? 
            this.anonymizeSteps(reading.activity.steps) : undefined,
          calories: reading.activity.calories ? 
            this.anonymizeCalories(reading.activity.calories) : undefined,
          distance: undefined // Remove precise distance
        };
      }
    }

    // Apply sleep data privacy filters
    if (reading.sleep && !privacySettings.shareSleepData) {
      if (consentSettings.sharingLevel === 'none') {
        delete filteredReading.sleep;
      } else {
        // Anonymize sleep data
        filteredReading.sleep = {
          ...reading.sleep,
          duration: this.anonymizeSleepDuration(reading.sleep.duration),
          quality: this.anonymizeSleepQuality(reading.sleep.quality),
          deepSleepMinutes: undefined, // Remove detailed sleep stages
          remSleepMinutes: undefined
        };
      }
    }

    // Check if any data remains after filtering
    const hasData = !!(
      filteredReading.heartRate || 
      filteredReading.stress || 
      filteredReading.activity || 
      filteredReading.sleep
    );

    return hasData ? filteredReading : null;
  }

  private groupDataByTimeIntervals(
    data: BiometricReading[], 
    intervalMs: number
  ): Map<number, BiometricReading[]> {
    const intervals = new Map<number, BiometricReading[]>();

    data.forEach(reading => {
      const intervalStart = Math.floor(reading.timestamp.getTime() / intervalMs) * intervalMs;
      
      if (!intervals.has(intervalStart)) {
        intervals.set(intervalStart, []);
      }
      
      intervals.get(intervalStart)!.push(reading);
    });

    return intervals;
  }

  private calculateAggregatedMetrics(readings: BiometricReading[]): {
    averageHeartRate?: number;
    averageStressLevel?: number;
    averageActivityLevel?: number;
  } {
    const heartRates = readings
      .filter(r => r.heartRate)
      .map(r => r.heartRate!.bpm);
    
    const stressLevels = readings
      .filter(r => r.stress)
      .map(r => r.stress!.level);
    
    const activityLevels = readings
      .filter(r => r.activity)
      .map(r => r.activity!.intensity);

    return {
      averageHeartRate: heartRates.length > 0 ? 
        heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length : undefined,
      averageStressLevel: stressLevels.length > 0 ? 
        stressLevels.reduce((sum, sl) => sum + sl, 0) / stressLevels.length : undefined,
      averageActivityLevel: activityLevels.length > 0 ? 
        activityLevels.reduce((sum, al) => sum + al, 0) / activityLevels.length : undefined
    };
  }

  private calculateConfidenceInterval(readings: BiometricReading[]): { lower: number; upper: number } {
    // Simple confidence interval calculation
    // In a real implementation, this would be more sophisticated
    const sampleSize = readings.length;
    const confidenceLevel = 0.95;
    
    // Calculate margin of error based on sample size
    const marginOfError = 1.96 / Math.sqrt(sampleSize); // 95% confidence interval
    
    return {
      lower: Math.max(0, 1 - marginOfError),
      upper: Math.min(1, 1 + marginOfError)
    };
  }

  // ============================================================================
  // ANONYMIZATION METHODS
  // ============================================================================

  private anonymizeHeartRate(bpm: number): number {
    // Round to nearest 10 for anonymization
    return Math.round(bpm / 10) * 10;
  }

  private anonymizeStressLevel(level: number): number {
    // Round to nearest 20 for anonymization (0-20, 21-40, 41-60, 61-80, 81-100)
    return Math.round(level / 20) * 20;
  }

  private anonymizeSteps(steps: number): number {
    // Round to nearest 100 for anonymization
    return Math.round(steps / 100) * 100;
  }

  private anonymizeCalories(calories: number): number {
    // Round to nearest 50 for anonymization
    return Math.round(calories / 50) * 50;
  }

  private anonymizeSleepDuration(duration: number): number {
    // Round to nearest 30 minutes for anonymization
    return Math.round(duration / 30) * 30;
  }

  private anonymizeSleepQuality(quality: number): number {
    // Round to nearest 25 for anonymization (0-25, 26-50, 51-75, 76-100)
    return Math.round(quality / 25) * 25;
  }

  // ============================================================================
  // VALIDATION AND LOGGING METHODS
  // ============================================================================

  private validateConsentSettings(settings: ConsentSettings): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate data types
    if (!settings.dataTypes || typeof settings.dataTypes !== 'object') {
      errors.push('Invalid dataTypes configuration');
    }

    // Validate sharing level
    if (!['none', 'team', 'organization'].includes(settings.sharingLevel)) {
      errors.push('Invalid sharing level');
    }

    // Validate retention period
    if (settings.retentionPeriod < 1 || settings.retentionPeriod > 2555) {
      errors.push('Retention period must be between 1 and 2555 days');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async isEmergencyScenario(userId: string, reading: BiometricReading): Promise<boolean> {
    // Check for emergency conditions that might override privacy settings
    // This is a simplified implementation
    
    if (reading.heartRate) {
      // Extremely high or low heart rate
      if (reading.heartRate.bpm > 180 || reading.heartRate.bpm < 40) {
        this.logger.warn(`Emergency heart rate detected for user ${userId}`, {
          heartRate: reading.heartRate.bpm
        });
        return true;
      }
    }

    if (reading.stress) {
      // Extremely high stress level
      if (reading.stress.level > 90) {
        this.logger.warn(`Emergency stress level detected for user ${userId}`, {
          stressLevel: reading.stress.level
        });
        return true;
      }
    }

    return false;
  }

  private async logPrivacyViolation(
    userId: string, 
    reading: BiometricReading, 
    violatedDataTypes: BiometricDataType[]
  ): Promise<void> {
    violatedDataTypes.forEach(dataType => {
      this.auditLog.push({
        userId,
        action: 'privacy_violation',
        dataType,
        timestamp: new Date(),
        approved: false
      });
    });

    this.logger.warn(`Privacy violation logged`, { 
      userId, 
      readingId: reading.id, 
      violatedDataTypes 
    });
  }

  private async logDataAccess(
    userId: string, 
    reading: BiometricReading, 
    action: string
  ): Promise<void> {
    // Log successful data access for audit purposes
    this.auditLog.push({
      userId,
      action,
      dataType: BiometricDataType.HEART_RATE, // Generic entry
      timestamp: new Date(),
      approved: true
    });
  }

  private async logAnonymization(
    teamId: string, 
    originalCount: number, 
    participantCount: number
  ): Promise<void> {
    this.logger.info(`Team data anonymized`, {
      teamId,
      originalReadings: originalCount,
      participants: participantCount,
      timestamp: new Date()
    });
  }

  // ============================================================================
  // AUDIT AND COMPLIANCE METHODS
  // ============================================================================

  async getAuditLog(userId?: string, startDate?: Date, endDate?: Date): Promise<typeof this.auditLog> {
    let filteredLog = [...this.auditLog];

    if (userId) {
      filteredLog = filteredLog.filter(entry => entry.userId === userId);
    }

    if (startDate) {
      filteredLog = filteredLog.filter(entry => entry.timestamp >= startDate);
    }

    if (endDate) {
      filteredLog = filteredLog.filter(entry => entry.timestamp <= endDate);
    }

    return filteredLog;
  }

  async generateComplianceReport(teamId: string): Promise<{
    totalUsers: number;
    consentedUsers: number;
    dataTypesConsented: Record<BiometricDataType, number>;
    privacyViolations: number;
    lastAuditDate: Date;
  }> {
    const totalUsers = this.userConsentSettings.size;
    let consentedUsers = 0;
    const dataTypesConsented: Record<BiometricDataType, number> = {
      [BiometricDataType.HEART_RATE]: 0,
      [BiometricDataType.STRESS_LEVEL]: 0,
      [BiometricDataType.ACTIVITY_LEVEL]: 0,
      [BiometricDataType.SLEEP_QUALITY]: 0,
      [BiometricDataType.BLOOD_PRESSURE]: 0,
      [BiometricDataType.BODY_TEMPERATURE]: 0
    };

    // Count consented users and data types
    this.userConsentSettings.forEach(settings => {
      const hasAnyConsent = Object.values(settings.dataTypes).some(consent => consent);
      if (hasAnyConsent) {
        consentedUsers++;
      }

      Object.entries(settings.dataTypes).forEach(([dataType, consented]) => {
        if (consented) {
          dataTypesConsented[dataType as BiometricDataType]++;
        }
      });
    });

    // Count privacy violations
    const privacyViolations = this.auditLog.filter(
      entry => entry.action === 'privacy_violation'
    ).length;

    return {
      totalUsers,
      consentedUsers,
      dataTypesConsented,
      privacyViolations,
      lastAuditDate: new Date()
    };
  }
}