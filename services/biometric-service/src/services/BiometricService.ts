import { Observable, Subject, BehaviorSubject, interval, merge } from 'rxjs';
import { map, filter, catchError, retry, switchMap } from 'rxjs/operators';
import { Logger } from 'winston';
import {
  BiometricReading,
  BiometricProfile,
  ConnectedDevice,
  DeviceCredentials,
  ConnectionResult,
  DeviceType,
  BiometricDataType,
  TimeRange,
  StressMetrics,
  FatigueIndicators,
  WellnessScore,
  HRVAnalysis,
  BaselineMetrics,
  ConnectionStatus
} from '@devflow/shared-types';
import {
  BiometricService as IBiometricService,
  DeviceIntegrationManager,
  DataValidationEngine,
  PrivacyFilter,
  RealTimeProcessor,
  BiometricServiceError,
  DeviceConnectionError,
  WellnessAlert
} from '../types';
import { DeviceIntegrationManagerImpl } from './DeviceIntegrationManager';
import { DataValidationEngineImpl } from './DataValidationEngine';
import { PrivacyFilterImpl } from './PrivacyFilter';
import { RealTimeProcessorImpl } from './RealTimeProcessor';
import { createLogger } from '../utils/logger';

export class BiometricServiceImpl implements IBiometricService {
  private logger: Logger;
  private deviceManager: DeviceIntegrationManager;
  private validationEngine: DataValidationEngine;
  private privacyFilter: PrivacyFilter;
  private realTimeProcessor: RealTimeProcessor;
  
  // In-memory storage for demo purposes - in production, use proper database
  private biometricProfiles: Map<string, BiometricProfile> = new Map();
  private connectedDevices: Map<string, ConnectedDevice[]> = new Map();
  private biometricStreams: Map<string, Subject<BiometricReading>> = new Map();
  private wellnessAlerts: Map<string, BehaviorSubject<WellnessAlert[]>> = new Map();

  constructor() {
    this.logger = createLogger('BiometricService');
    this.deviceManager = new DeviceIntegrationManagerImpl();
    this.validationEngine = new DataValidationEngineImpl();
    this.privacyFilter = new PrivacyFilterImpl();
    this.realTimeProcessor = new RealTimeProcessorImpl();
    
    this.logger.info('BiometricService initialized');
  }

  // ============================================================================
  // DEVICE MANAGEMENT
  // ============================================================================

  async connectDevice(
    userId: string, 
    deviceType: DeviceType, 
    credentials: DeviceCredentials
  ): Promise<ConnectionResult> {
    try {
      this.logger.info(`Connecting device for user ${userId}`, { deviceType });

      // Validate credentials
      const isValid = await this.deviceManager.validateDeviceCredentials(deviceType, credentials);
      if (!isValid) {
        throw new DeviceConnectionError('Invalid device credentials', 'unknown', userId);
      }

      // Attempt connection based on device type
      let connectionResult: ConnectionResult;
      switch (deviceType) {
        case DeviceType.APPLE_WATCH:
          connectionResult = await this.deviceManager.connectAppleHealthKit(userId, credentials);
          break;
        case DeviceType.FITBIT:
          connectionResult = await this.deviceManager.connectFitbit(userId, credentials);
          break;
        case DeviceType.GARMIN:
          connectionResult = await this.deviceManager.connectGarmin(userId, credentials);
          break;
        default:
          throw new DeviceConnectionError(`Unsupported device type: ${deviceType}`, 'unknown', userId);
      }

      if (connectionResult.success && connectionResult.deviceId) {
        // Create connected device record
        const connectedDevice: ConnectedDevice = {
          deviceId: connectionResult.deviceId,
          deviceType,
          connectionStatus: ConnectionStatus.CONNECTED,
          lastSync: new Date(),
          dataTypes: await this.deviceManager.getDeviceCapabilities(deviceType),
          batteryLevel: undefined, // Will be updated during sync
          firmwareVersion: undefined,
          model: undefined
        };

        // Store device connection
        const userDevices = this.connectedDevices.get(userId) || [];
        userDevices.push(connectedDevice);
        this.connectedDevices.set(userId, userDevices);

        // Initialize biometric stream for this user if not exists
        if (!this.biometricStreams.has(userId)) {
          this.biometricStreams.set(userId, new Subject<BiometricReading>());
        }

        // Initialize wellness alerts stream
        if (!this.wellnessAlerts.has(userId)) {
          this.wellnessAlerts.set(userId, new BehaviorSubject<WellnessAlert[]>([]));
        }

        // Start data synchronization
        this.startDeviceDataSync(userId, connectedDevice);

        this.logger.info(`Device connected successfully`, { 
          userId, 
          deviceType, 
          deviceId: connectionResult.deviceId 
        });
      }

      return connectionResult;
    } catch (error) {
      this.logger.error('Failed to connect device', { userId, deviceType, error });
      if (error instanceof DeviceConnectionError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      throw new BiometricServiceError(
        `Failed to connect ${deviceType} device: ${errorMessage}`,
        'DEVICE_CONNECTION_FAILED',
        userId
      );
    }
  }

  async disconnectDevice(userId: string, deviceId: string): Promise<void> {
    try {
      this.logger.info(`Disconnecting device ${deviceId} for user ${userId}`);

      const userDevices = this.connectedDevices.get(userId) || [];
      const deviceIndex = userDevices.findIndex(d => d.deviceId === deviceId);
      
      if (deviceIndex === -1) {
        throw new DeviceConnectionError('Device not found', deviceId, userId);
      }

      // Update device status
      userDevices[deviceIndex].connectionStatus = ConnectionStatus.DISCONNECTED;
      this.connectedDevices.set(userId, userDevices);

      // Stop data synchronization for this device
      this.stopDeviceDataSync(userId, deviceId);

      this.logger.info(`Device disconnected successfully`, { userId, deviceId });
    } catch (error) {
      this.logger.error('Failed to disconnect device', { userId, deviceId, error });
      const errorMessage = error instanceof Error ? error.message : 'Unknown disconnection error';
      throw new BiometricServiceError(
        `Failed to disconnect device: ${errorMessage}`,
        'DEVICE_DISCONNECTION_FAILED',
        userId,
        deviceId
      );
    }
  }

  async getConnectedDevices(userId: string): Promise<ConnectedDevice[]> {
    try {
      const devices = this.connectedDevices.get(userId) || [];
      return devices.filter(d => d.connectionStatus === ConnectionStatus.CONNECTED);
    } catch (error) {
      this.logger.error('Failed to get connected devices', { userId, error });
      const errorMessage = error instanceof Error ? error.message : 'Unknown get devices error';
      throw new BiometricServiceError(
        `Failed to get connected devices: ${errorMessage}`,
        'GET_DEVICES_FAILED',
        userId
      );
    }
  }

  async syncDeviceData(userId: string, deviceId: string): Promise<void> {
    try {
      this.logger.info(`Syncing data for device ${deviceId}`);

      const userDevices = this.connectedDevices.get(userId) || [];
      const device = userDevices.find(d => d.deviceId === deviceId);
      
      if (!device) {
        throw new DeviceConnectionError('Device not found', deviceId, userId);
      }

      // Refresh device connection
      const refreshResult = await this.deviceManager.refreshDeviceConnection(deviceId);
      if (!refreshResult.success) {
        device.connectionStatus = ConnectionStatus.ERROR;
        throw new DeviceConnectionError('Failed to refresh device connection', deviceId, userId);
      }

      // Update last sync time
      device.lastSync = new Date();
      device.connectionStatus = ConnectionStatus.CONNECTED;

      this.logger.info(`Device data synced successfully`, { userId, deviceId });
    } catch (error) {
      this.logger.error('Failed to sync device data', { userId, deviceId, error });
      throw error;
    }
  }

  // ============================================================================
  // DATA COLLECTION
  // ============================================================================

  async collectBiometricData(userId: string, timeRange: TimeRange): Promise<BiometricReading[]> {
    try {
      this.logger.info(`Collecting biometric data for user ${userId}`, { timeRange });

      // In a real implementation, this would query the database
      // For now, we'll generate sample data based on connected devices
      const devices = await this.getConnectedDevices(userId);
      const readings: BiometricReading[] = [];

      for (const device of devices) {
        // Generate sample readings for each device
        const deviceReadings = await this.generateSampleReadings(userId, device, timeRange);
        readings.push(...deviceReadings);
      }

      // Apply privacy filters
      const filteredReadings = await this.privacyFilter.applyPrivacySettings(userId, readings);

      // Validate readings
      const validatedReadings: BiometricReading[] = [];
      for (const reading of filteredReadings) {
        const validation = await this.validationEngine.validateBiometricReading(reading);
        if (validation.isValid) {
          validatedReadings.push(validation.correctedReading || reading);
        }
      }

      this.logger.info(`Collected ${validatedReadings.length} biometric readings`, { userId });
      return validatedReadings;
    } catch (error) {
      this.logger.error('Failed to collect biometric data', { userId, error });
      const errorMessage = error instanceof Error ? error.message : 'Unknown data collection error';
      throw new BiometricServiceError(
        `Failed to collect biometric data: ${errorMessage}`,
        'DATA_COLLECTION_FAILED',
        userId
      );
    }
  }

  streamBiometricData(userId: string): Observable<BiometricReading> {
    try {
      // Get or create stream for user
      let stream = this.biometricStreams.get(userId);
      if (!stream) {
        stream = new Subject<BiometricReading>();
        this.biometricStreams.set(userId, stream);
      }

      return stream.asObservable().pipe(
        // Apply real-time processing
        switchMap((reading: BiometricReading) => this.realTimeProcessor.processRealTimeStream(userId, new BehaviorSubject(reading))),
        map((processed: any) => processed.original),
        catchError((error: any) => {
          this.logger.error('Error in biometric data stream', { userId, error });
          throw new BiometricServiceError(
            `Stream error: ${error.message}`,
            'STREAM_ERROR',
            userId
          );
        }),
        retry(3)
      );
    } catch (error) {
      this.logger.error('Failed to create biometric data stream', { userId, error });
      throw new BiometricServiceError(
        `Failed to create data stream: ${error instanceof Error ? error.message : 'Unknown stream error'}`,
        'STREAM_CREATION_FAILED',
        userId
      );
    }
  }

  async getBiometricProfile(userId: string): Promise<BiometricProfile> {
    try {
      const profile = this.biometricProfiles.get(userId);
      if (!profile) {
        throw new BiometricServiceError('Biometric profile not found', 'PROFILE_NOT_FOUND', userId);
      }
      return profile;
    } catch (error) {
      this.logger.error('Failed to get biometric profile', { userId, error });
      throw error;
    }
  }

  async updateBiometricProfile(userId: string, profileUpdate: Partial<BiometricProfile>): Promise<BiometricProfile> {
    try {
      const existingProfile = this.biometricProfiles.get(userId);
      if (!existingProfile) {
        throw new BiometricServiceError('Biometric profile not found', 'PROFILE_NOT_FOUND', userId);
      }

      const updatedProfile: BiometricProfile = {
        ...existingProfile,
        ...profileUpdate,
        userId, // Ensure userId cannot be changed
        updatedAt: new Date()
      };

      this.biometricProfiles.set(userId, updatedProfile);
      this.logger.info(`Biometric profile updated`, { userId });
      
      return updatedProfile;
    } catch (error) {
      this.logger.error('Failed to update biometric profile', { userId, error });
      throw error;
    }
  }

  // ============================================================================
  // HEALTH METRICS
  // ============================================================================

  async calculateStressLevel(userId: string): Promise<StressMetrics> {
    try {
      // Get recent biometric data
      const timeRange: TimeRange = {
        startTime: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        endTime: new Date()
      };
      
      const readings = await this.collectBiometricData(userId, timeRange);
      const profile = await this.getBiometricProfile(userId);

      // Calculate stress based on heart rate variability and other factors
      const heartRateReadings = readings
        .filter(r => r.heartRate)
        .map(r => r.heartRate!);

      if (heartRateReadings.length === 0) {
        return {
          currentLevel: 0,
          trend: 'stable',
          contributingFactors: ['No recent heart rate data'],
          recommendations: ['Connect a heart rate monitor for better stress tracking'],
          confidence: 0
        };
      }

      // Simple stress calculation based on heart rate deviation from baseline
      const avgHeartRate = heartRateReadings.reduce((sum, hr) => sum + hr.bpm, 0) / heartRateReadings.length;
      const baselineHR = profile.baselineMetrics.restingHeartRate;
      const stressLevel = Math.min(100, Math.max(0, ((avgHeartRate - baselineHR) / baselineHR) * 100));

      // Determine trend
      const recentReadings = heartRateReadings.slice(-5);
      const olderReadings = heartRateReadings.slice(0, -5);
      const recentAvg = recentReadings.reduce((sum, hr) => sum + hr.bpm, 0) / recentReadings.length;
      const olderAvg = olderReadings.reduce((sum, hr) => sum + hr.bpm, 0) / olderReadings.length;
      
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (recentAvg > olderAvg + 5) trend = 'increasing';
      else if (recentAvg < olderAvg - 5) trend = 'decreasing';

      const contributingFactors: string[] = [];
      const recommendations: string[] = [];

      if (stressLevel > 70) {
        contributingFactors.push('Elevated heart rate');
        recommendations.push('Take a short break', 'Practice deep breathing');
      }

      return {
        currentLevel: stressLevel,
        trend,
        contributingFactors,
        recommendations,
        confidence: 0.8
      };
    } catch (error) {
      this.logger.error('Failed to calculate stress level', { userId, error });
      throw new BiometricServiceError(
        `Failed to calculate stress level: ${error instanceof Error ? error.message : 'Unknown stress calculation error'}`,
        'STRESS_CALCULATION_FAILED',
        userId
      );
    }
  }

  async detectFatigue(userId: string): Promise<FatigueIndicators> {
    try {
      // Implementation would analyze multiple biometric indicators
      // For now, return a basic implementation
      const stressMetrics = await this.calculateStressLevel(userId);
      
      const fatigueLevel = Math.min(100, stressMetrics.currentLevel * 0.8);
      
      return {
        fatigueLevel,
        indicators: {
          heartRateVariability: 50, // Placeholder
          activityLevel: 30,
          sleepQuality: 70,
          typingPatterns: 40
        },
        recommendations: [
          'Consider taking a longer break',
          'Ensure adequate hydration',
          'Check your posture'
        ],
        severity: fatigueLevel > 70 ? 'high' : fatigueLevel > 40 ? 'medium' : 'low'
      };
    } catch (error) {
      this.logger.error('Failed to detect fatigue', { userId, error });
      throw new BiometricServiceError(
        `Failed to detect fatigue: ${error instanceof Error ? error.message : 'Unknown fatigue detection error'}`,
        'FATIGUE_DETECTION_FAILED',
        userId
      );
    }
  }

  async assessWellnessScore(userId: string): Promise<WellnessScore> {
    try {
      const stressMetrics = await this.calculateStressLevel(userId);
      const fatigueIndicators = await this.detectFatigue(userId);
      
      // Calculate overall wellness score
      const physicalScore = Math.max(0, 100 - fatigueIndicators.fatigueLevel);
      const mentalScore = Math.max(0, 100 - stressMetrics.currentLevel);
      const stressScore = Math.max(0, 100 - stressMetrics.currentLevel);
      const recoveryScore = 70; // Placeholder - would be based on sleep and recovery data
      
      const overallScore = (physicalScore + mentalScore + stressScore + recoveryScore) / 4;
      
      return {
        overallScore,
        components: {
          physical: physicalScore,
          mental: mentalScore,
          stress: stressScore,
          recovery: recoveryScore
        },
        trend: stressMetrics.trend === 'increasing' ? 'declining' : 
               stressMetrics.trend === 'decreasing' ? 'improving' : 'stable',
        lastUpdated: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to assess wellness score', { userId, error });
      throw new BiometricServiceError(
        `Failed to assess wellness score: ${error instanceof Error ? error.message : 'Unknown wellness assessment error'}`,
        'WELLNESS_ASSESSMENT_FAILED',
        userId
      );
    }
  }

  async analyzeHeartRateVariability(userId: string): Promise<HRVAnalysis> {
    try {
      // Placeholder implementation - would analyze actual HRV data
      return {
        rmssd: 45, // milliseconds
        pnn50: 25, // percentage
        stressIndex: 30,
        recoveryStatus: 'good',
        recommendations: [
          'Maintain current activity level',
          'Ensure adequate sleep',
          'Consider meditation or relaxation techniques'
        ]
      };
    } catch (error) {
      this.logger.error('Failed to analyze HRV', { userId, error });
      throw new BiometricServiceError(
        `Failed to analyze HRV: ${error instanceof Error ? error.message : 'Unknown HRV analysis error'}`,
        'HRV_ANALYSIS_FAILED',
        userId
      );
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async generateSampleReadings(
    userId: string, 
    device: ConnectedDevice, 
    timeRange: TimeRange
  ): Promise<BiometricReading[]> {
    const readings: BiometricReading[] = [];
    const intervalMs = 5 * 60 * 1000; // 5 minutes
    
    for (let time = timeRange.startTime.getTime(); time <= timeRange.endTime.getTime(); time += intervalMs) {
      const reading: BiometricReading = {
        id: `${userId}-${device.deviceId}-${time}`,
        userId,
        deviceId: device.deviceId,
        timestamp: new Date(time),
        quality: {
          accuracy: 0.9,
          completeness: 1.0,
          reliability: 0.95,
          outlierDetected: false
        }
      };

      // Add data based on device capabilities
      if (device.dataTypes.includes(BiometricDataType.HEART_RATE)) {
        reading.heartRate = {
          bpm: 70 + Math.random() * 30, // 70-100 bpm
          variability: Math.random() * 50,
          confidence: 0.9
        };
      }

      if (device.dataTypes.includes(BiometricDataType.STRESS_LEVEL)) {
        reading.stress = {
          level: Math.random() * 100,
          confidence: 0.8
        };
      }

      if (device.dataTypes.includes(BiometricDataType.ACTIVITY_LEVEL)) {
        reading.activity = {
          steps: Math.floor(Math.random() * 100),
          calories: Math.floor(Math.random() * 50),
          intensity: Math.random()
        };
      }

      readings.push(reading);
    }

    return readings;
  }

  private startDeviceDataSync(userId: string, device: ConnectedDevice): void {
    // Start periodic data synchronization
    const syncInterval = interval(60000); // Every minute
    
    syncInterval.subscribe(async () => {
      try {
        await this.syncDeviceData(userId, device.deviceId);
        
        // Generate and emit new reading
        const reading = await this.generateSampleReadings(
          userId, 
          device, 
          { startTime: new Date(Date.now() - 60000), endTime: new Date() }
        );
        
        if (reading.length > 0) {
          const stream = this.biometricStreams.get(userId);
          if (stream) {
            stream.next(reading[0]);
          }
        }
      } catch (error) {
        this.logger.error('Error during device sync', { userId, deviceId: device.deviceId, error });
      }
    });
  }

  private stopDeviceDataSync(userId: string, deviceId: string): void {
    // In a real implementation, we would stop the specific sync interval
    this.logger.info(`Stopped data sync for device ${deviceId}`);
  }
}