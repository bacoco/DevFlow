import { Logger } from 'winston';
import axios, { AxiosResponse } from 'axios';
import {
  DeviceCredentials,
  ConnectionResult,
  DeviceType,
  BiometricDataType,
  ConnectionStatus,
  BiometricReading,
  HeartRateReading,
  StressReading,
  ActivityReading,
  SleepReading
} from '@devflow/shared-types';
import {
  DeviceIntegrationManager,
  DeviceConnectionError,
  TimeRange
} from '../types';
import { createLogger } from '../utils/logger';

interface DeviceConnection {
  deviceType: DeviceType;
  connected: boolean;
  metadata?: {
    userId: string;
    accessToken?: string;
    refreshToken?: string;
    apiKey?: string;
    connectedAt: Date;
    lastDataSync: Date | null;
    userProfile?: any;
    devices?: any[];
    capabilities: BiometricDataType[];
    dataAccessVerified?: boolean;
  };
}

export class DeviceIntegrationManagerImpl implements DeviceIntegrationManager {
  private logger: Logger;
  
  // Enhanced device connections with metadata
  private mockConnections: Map<string, DeviceConnection> = new Map();

  constructor() {
    this.logger = createLogger('DeviceIntegrationManager');
  }

  // ============================================================================
  // DEVICE-SPECIFIC INTEGRATIONS
  // ============================================================================

  async connectAppleHealthKit(userId: string, credentials: DeviceCredentials): Promise<ConnectionResult> {
    try {
      this.logger.info(`Connecting Apple HealthKit for user ${userId}`);

      // Validate Apple HealthKit credentials
      if (!credentials.accessToken) {
        return {
          success: false,
          error: 'Apple HealthKit access token required',
          connectionStatus: ConnectionStatus.ERROR
        };
      }

      // Apple HealthKit integration
      // Note: Apple HealthKit is primarily iOS-based and requires native app integration
      // For web-based integration, we would typically use Apple's Health Records API
      // or integrate through a mobile app that syncs data to our backend
      
      const deviceId = `apple-healthkit-${userId}-${Date.now()}`;
      
      try {
        // Validate the access token by making a test request
        const isValid = await this.validateAppleHealthKitToken(credentials.accessToken);
        
        if (!isValid) {
          return {
            success: false,
            error: 'Invalid Apple HealthKit access token',
            connectionStatus: ConnectionStatus.ERROR
          };
        }

        // Store connection with enhanced metadata
        this.mockConnections.set(deviceId, {
          deviceType: DeviceType.APPLE_WATCH,
          connected: true,
          metadata: {
            userId,
            accessToken: credentials.accessToken,
            connectedAt: new Date(),
            lastDataSync: null,
            capabilities: await this.getDeviceCapabilities(DeviceType.APPLE_WATCH)
          }
        });

        // Initialize data collection for this device
        await this.initializeAppleHealthKitDataCollection(deviceId, credentials.accessToken);

        this.logger.info(`Apple HealthKit connected successfully`, { userId, deviceId });

        return {
          success: true,
          deviceId,
          connectionStatus: ConnectionStatus.CONNECTED,
          metadata: {
            deviceName: 'Apple HealthKit',
            capabilities: await this.getDeviceCapabilities(DeviceType.APPLE_WATCH),
            lastSync: new Date()
          }
        };
      } catch (apiError) {
        this.logger.error('Apple HealthKit API error', { userId, error: apiError });
        return {
          success: false,
          error: `Apple HealthKit API error: ${apiError instanceof Error ? apiError.message : 'Unknown API error'}`,
          connectionStatus: ConnectionStatus.ERROR
        };
      }
    } catch (error) {
      this.logger.error('Failed to connect Apple HealthKit', { userId, error });
      return {
        success: false,
        error: `Apple HealthKit connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        connectionStatus: ConnectionStatus.ERROR
      };
    }
  }

  async connectFitbit(userId: string, credentials: DeviceCredentials): Promise<ConnectionResult> {
    try {
      this.logger.info(`Connecting Fitbit for user ${userId}`);

      // Validate Fitbit OAuth credentials
      if (!credentials.accessToken || !credentials.refreshToken) {
        return {
          success: false,
          error: 'Fitbit OAuth tokens required (accessToken and refreshToken)',
          connectionStatus: ConnectionStatus.ERROR
        };
      }

      const deviceId = `fitbit-${userId}-${Date.now()}`;
      
      try {
        // Validate OAuth token with Fitbit API
        const userProfile = await this.validateFitbitTokenWithAPI(credentials.accessToken);
        
        if (!userProfile) {
          // Try to refresh the token
          const refreshResult = await this.refreshFitbitToken(credentials.refreshToken);
          
          if (!refreshResult.success) {
            return {
              success: false,
              error: 'Invalid or expired Fitbit tokens. Please re-authorize.',
              connectionStatus: ConnectionStatus.ERROR
            };
          }
          
          // Update credentials with new tokens
          credentials.accessToken = refreshResult.accessToken!;
          credentials.refreshToken = refreshResult.refreshToken!;
        }

        // Get user's Fitbit devices
        const devices = await this.getFitbitDevices(credentials.accessToken);
        
        // Store connection with enhanced metadata
        this.mockConnections.set(deviceId, {
          deviceType: DeviceType.FITBIT,
          connected: true,
          metadata: {
            userId,
            accessToken: credentials.accessToken,
            refreshToken: credentials.refreshToken,
            connectedAt: new Date(),
            lastDataSync: null,
            userProfile,
            devices,
            capabilities: await this.getDeviceCapabilities(DeviceType.FITBIT)
          }
        });

        // Set up webhook subscription for real-time data
        await this.setupFitbitWebhook(userId, credentials.accessToken);

        this.logger.info(`Fitbit connected successfully`, { 
          userId, 
          deviceId, 
          userProfile: userProfile?.displayName,
          deviceCount: devices?.length || 0
        });

        return {
          success: true,
          deviceId,
          connectionStatus: ConnectionStatus.CONNECTED,
          metadata: {
            deviceName: 'Fitbit',
            userProfile: userProfile?.displayName,
            devices: devices?.map(d => d.deviceVersion) || [],
            capabilities: await this.getDeviceCapabilities(DeviceType.FITBIT),
            lastSync: new Date()
          }
        };
      } catch (apiError) {
        this.logger.error('Fitbit API error', { userId, error: apiError });
        return {
          success: false,
          error: `Fitbit API error: ${apiError instanceof Error ? apiError.message : 'Unknown API error'}`,
          connectionStatus: ConnectionStatus.ERROR
        };
      }
    } catch (error) {
      this.logger.error('Failed to connect Fitbit', { userId, error });
      return {
        success: false,
        error: `Fitbit connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        connectionStatus: ConnectionStatus.ERROR
      };
    }
  }

  async connectGarmin(userId: string, credentials: DeviceCredentials): Promise<ConnectionResult> {
    try {
      this.logger.info(`Connecting Garmin for user ${userId}`);

      // Validate Garmin Connect credentials
      if (!credentials.accessToken || !credentials.apiKey) {
        return {
          success: false,
          error: 'Garmin Connect API key and access token required',
          connectionStatus: ConnectionStatus.ERROR
        };
      }

      const deviceId = `garmin-${userId}-${Date.now()}`;
      
      try {
        // Validate API credentials with Garmin Connect API
        const userProfile = await this.validateGarminCredentialsWithAPI(
          credentials.apiKey!, 
          credentials.accessToken
        );
        
        if (!userProfile) {
          return {
            success: false,
            error: 'Invalid Garmin Connect API credentials',
            connectionStatus: ConnectionStatus.ERROR
          };
        }

        // Get user's Garmin devices
        const devices = await this.getGarminDevices(credentials.apiKey!, credentials.accessToken);
        
        // Get user's activity data to verify data access
        const recentActivities = await this.getGarminRecentActivities(
          credentials.apiKey!, 
          credentials.accessToken,
          1 // Get last activity to verify access
        );

        // Store connection with enhanced metadata
        this.mockConnections.set(deviceId, {
          deviceType: DeviceType.GARMIN,
          connected: true,
          metadata: {
            userId,
            apiKey: credentials.apiKey,
            accessToken: credentials.accessToken,
            connectedAt: new Date(),
            lastDataSync: null,
            userProfile,
            devices,
            capabilities: await this.getDeviceCapabilities(DeviceType.GARMIN),
            dataAccessVerified: recentActivities.length > 0
          }
        });

        // Set up data synchronization schedule
        await this.setupGarminDataSync(deviceId, credentials.apiKey!, credentials.accessToken);

        this.logger.info(`Garmin connected successfully`, { 
          userId, 
          deviceId, 
          userProfile: userProfile?.displayName,
          deviceCount: devices?.length || 0,
          dataAccess: recentActivities.length > 0
        });

        return {
          success: true,
          deviceId,
          connectionStatus: ConnectionStatus.CONNECTED,
          metadata: {
            deviceName: 'Garmin Connect',
            userProfile: userProfile?.displayName,
            devices: devices?.map(d => d.productDisplayName) || [],
            capabilities: await this.getDeviceCapabilities(DeviceType.GARMIN),
            lastSync: new Date(),
            dataAccessVerified: recentActivities.length > 0
          }
        };
      } catch (apiError) {
        this.logger.error('Garmin API error', { userId, error: apiError });
        return {
          success: false,
          error: `Garmin API error: ${apiError instanceof Error ? apiError.message : 'Unknown API error'}`,
          connectionStatus: ConnectionStatus.ERROR
        };
      }
    } catch (error) {
      this.logger.error('Failed to connect Garmin', { userId, error });
      return {
        success: false,
        error: `Garmin connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        connectionStatus: ConnectionStatus.ERROR
      };
    }
  }

  // ============================================================================
  // GENERIC DEVICE MANAGEMENT
  // ============================================================================

  async validateDeviceCredentials(deviceType: DeviceType, credentials: DeviceCredentials): Promise<boolean> {
    try {
      this.logger.info(`Validating credentials for device type ${deviceType}`);

      switch (deviceType) {
        case DeviceType.APPLE_WATCH:
          return this.validateAppleHealthKitCredentials(credentials);
        
        case DeviceType.FITBIT:
          return this.validateFitbitCredentials(credentials);
        
        case DeviceType.GARMIN:
          return this.validateGarminCredentials(credentials.apiKey, credentials.accessToken);
        
        case DeviceType.CUSTOM:
          return this.validateCustomDeviceCredentials(credentials);
        
        default:
          this.logger.warn(`Unknown device type: ${deviceType}`);
          return false;
      }
    } catch (error) {
      this.logger.error('Error validating device credentials', { deviceType, error });
      return false;
    }
  }

  async refreshDeviceConnection(deviceId: string): Promise<ConnectionResult> {
    try {
      this.logger.info(`Refreshing connection for device ${deviceId}`);

      const connection = this.mockConnections.get(deviceId);
      if (!connection) {
        return {
          success: false,
          error: 'Device connection not found',
          connectionStatus: ConnectionStatus.ERROR
        };
      }

      // Simulate connection refresh
      await this.simulateConnectionDelay(500);

      // Mock refresh logic - in real implementation, this would refresh OAuth tokens, etc.
      const refreshSuccess = Math.random() > 0.1; // 90% success rate
      
      if (refreshSuccess) {
        connection.connected = true;
        this.logger.info(`Device connection refreshed successfully`, { deviceId });
        
        return {
          success: true,
          deviceId,
          connectionStatus: ConnectionStatus.CONNECTED
        };
      } else {
        connection.connected = false;
        this.logger.warn(`Failed to refresh device connection`, { deviceId });
        
        return {
          success: false,
          error: 'Connection refresh failed',
          connectionStatus: ConnectionStatus.ERROR
        };
      }
    } catch (error) {
      this.logger.error('Error refreshing device connection', { deviceId, error });
      return {
        success: false,
        error: `Connection refresh error: ${error.message}`,
        connectionStatus: ConnectionStatus.ERROR
      };
    }
  }

  async getDeviceCapabilities(deviceType: DeviceType): Promise<BiometricDataType[]> {
    try {
      this.logger.info(`Getting capabilities for device type ${deviceType}`);

      switch (deviceType) {
        case DeviceType.APPLE_WATCH:
          return [
            BiometricDataType.HEART_RATE,
            BiometricDataType.ACTIVITY_LEVEL,
            BiometricDataType.STRESS_LEVEL
          ];
        
        case DeviceType.FITBIT:
          return [
            BiometricDataType.HEART_RATE,
            BiometricDataType.ACTIVITY_LEVEL,
            BiometricDataType.SLEEP_QUALITY,
            BiometricDataType.STRESS_LEVEL
          ];
        
        case DeviceType.GARMIN:
          return [
            BiometricDataType.HEART_RATE,
            BiometricDataType.ACTIVITY_LEVEL,
            BiometricDataType.SLEEP_QUALITY,
            BiometricDataType.STRESS_LEVEL,
            BiometricDataType.BODY_TEMPERATURE
          ];
        
        case DeviceType.CUSTOM:
          return [BiometricDataType.HEART_RATE]; // Basic capability
        
        default:
          this.logger.warn(`Unknown device type: ${deviceType}`);
          return [];
      }
    } catch (error) {
      this.logger.error('Error getting device capabilities', { deviceType, error });
      return [];
    }
  }

  // ============================================================================
  // PRIVATE VALIDATION METHODS
  // ============================================================================

  private validateAppleHealthKitCredentials(credentials: DeviceCredentials): boolean {
    // Mock validation for Apple HealthKit
    // In real implementation, this would validate the access token with Apple's servers
    return !!(credentials.accessToken && credentials.accessToken.length > 10);
  }

  private validateFitbitCredentials(credentials: DeviceCredentials): boolean {
    // Mock validation for Fitbit OAuth
    // In real implementation, this would validate OAuth tokens with Fitbit API
    return !!(
      credentials.accessToken && 
      credentials.refreshToken && 
      credentials.accessToken.length > 10 &&
      credentials.refreshToken.length > 10
    );
  }

  private async validateGarminCredentials(apiKey?: string, accessToken?: string): Promise<boolean> {
    // Mock validation for Garmin Connect API
    // In real implementation, this would make a test API call to Garmin
    if (!apiKey || !accessToken) {
      return false;
    }

    // Simulate API validation call
    await this.simulateConnectionDelay(200);
    
    return apiKey.length > 10 && accessToken.length > 10;
  }

  private validateCustomDeviceCredentials(credentials: DeviceCredentials): boolean {
    // Basic validation for custom devices
    return !!(credentials.deviceId || credentials.apiKey);
  }

  private async validateFitbitToken(accessToken: string): Promise<boolean> {
    // Mock Fitbit token validation
    // In real implementation, this would make a test API call to Fitbit
    await this.simulateConnectionDelay(300);
    
    // Simulate token validation (90% success rate for demo)
    return Math.random() > 0.1 && accessToken.length > 10;
  }

  private async simulateConnectionDelay(ms: number = 1000): Promise<void> {
    // Simulate network delay for realistic behavior
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // DEVICE-SPECIFIC DATA COLLECTION METHODS
  // ============================================================================

  async collectAppleHealthKitData(deviceId: string, dataTypes: BiometricDataType[]): Promise<any> {
    // Mock Apple HealthKit data collection
    // In real implementation, this would use HealthKit APIs
    this.logger.info(`Collecting Apple HealthKit data`, { deviceId, dataTypes });
    
    await this.simulateConnectionDelay(500);
    
    return {
      heartRate: dataTypes.includes(BiometricDataType.HEART_RATE) ? {
        bpm: 70 + Math.random() * 30,
        timestamp: new Date()
      } : null,
      activity: dataTypes.includes(BiometricDataType.ACTIVITY_LEVEL) ? {
        steps: Math.floor(Math.random() * 1000),
        calories: Math.floor(Math.random() * 100),
        timestamp: new Date()
      } : null
    };
  }

  async collectFitbitData(deviceId: string, dataTypes: BiometricDataType[]): Promise<any> {
    // Mock Fitbit data collection
    // In real implementation, this would use Fitbit Web API
    this.logger.info(`Collecting Fitbit data`, { deviceId, dataTypes });
    
    await this.simulateConnectionDelay(700);
    
    return {
      heartRate: dataTypes.includes(BiometricDataType.HEART_RATE) ? {
        bpm: 65 + Math.random() * 35,
        timestamp: new Date()
      } : null,
      sleep: dataTypes.includes(BiometricDataType.SLEEP_QUALITY) ? {
        duration: 420 + Math.random() * 120, // 7-9 hours
        quality: 60 + Math.random() * 40,
        timestamp: new Date()
      } : null
    };
  }

  async collectGarminData(deviceId: string, dataTypes: BiometricDataType[]): Promise<any> {
    // Mock Garmin data collection
    // In real implementation, this would use Garmin Connect IQ API
    this.logger.info(`Collecting Garmin data`, { deviceId, dataTypes });
    
    await this.simulateConnectionDelay(600);
    
    return {
      heartRate: dataTypes.includes(BiometricDataType.HEART_RATE) ? {
        bpm: 68 + Math.random() * 32,
        variability: Math.random() * 50,
        timestamp: new Date()
      } : null,
      stress: dataTypes.includes(BiometricDataType.STRESS_LEVEL) ? {
        level: Math.random() * 100,
        timestamp: new Date()
      } : null,
      bodyTemperature: dataTypes.includes(BiometricDataType.BODY_TEMPERATURE) ? {
        celsius: 36.5 + Math.random() * 1.5,
        timestamp: new Date()
      } : null
    };
  }

  // ============================================================================
  // REAL API INTEGRATION METHODS
  // ============================================================================

  // Apple HealthKit Integration Methods
  private async validateAppleHealthKitToken(accessToken: string): Promise<boolean> {
    try {
      // Apple HealthKit validation
      // Note: Apple HealthKit is primarily iOS-based, so this would typically
      // validate through Apple's Health Records API or a mobile app backend
      
      // For demo purposes, we'll validate token format and make a mock request
      if (!accessToken || accessToken.length < 20) {
        return false;
      }

      // In a real implementation, this would make a request to Apple's Health API
      // For now, we'll simulate validation
      await this.simulateConnectionDelay(300);
      
      // Simulate 95% success rate for valid-looking tokens
      return Math.random() > 0.05;
    } catch (error) {
      this.logger.error('Apple HealthKit token validation error', { error });
      return false;
    }
  }

  private async initializeAppleHealthKitDataCollection(deviceId: string, accessToken: string): Promise<void> {
    try {
      this.logger.info('Initializing Apple HealthKit data collection', { deviceId });
      
      // In a real implementation, this would:
      // 1. Set up HealthKit data type permissions
      // 2. Configure background data collection
      // 3. Set up data sync schedules
      
      // For now, we'll just log the initialization
      await this.simulateConnectionDelay(200);
      
      this.logger.info('Apple HealthKit data collection initialized', { deviceId });
    } catch (error) {
      this.logger.error('Failed to initialize Apple HealthKit data collection', { deviceId, error });
      throw error;
    }
  }

  // Fitbit Integration Methods
  private async validateFitbitTokenWithAPI(accessToken: string): Promise<any> {
    try {
      // Make a request to Fitbit API to validate token and get user profile
      const response: AxiosResponse = await axios.get('https://api.fitbit.com/1/user/-/profile.json', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      if (response.status === 200 && response.data.user) {
        return response.data.user;
      }
      
      return null;
    } catch (error) {
      this.logger.error('Fitbit token validation failed', { error });
      return null;
    }
  }

  private async refreshFitbitToken(refreshToken: string): Promise<{ success: boolean; accessToken?: string; refreshToken?: string }> {
    try {
      // Fitbit OAuth token refresh
      const clientId = process.env.FITBIT_CLIENT_ID;
      const clientSecret = process.env.FITBIT_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        this.logger.error('Fitbit OAuth credentials not configured');
        return { success: false };
      }

      const response: AxiosResponse = await axios.post('https://api.fitbit.com/oauth2/token', 
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        }), {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      if (response.status === 200 && response.data.access_token) {
        return {
          success: true,
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token || refreshToken
        };
      }
      
      return { success: false };
    } catch (error) {
      this.logger.error('Fitbit token refresh failed', { error });
      return { success: false };
    }
  }

  private async getFitbitDevices(accessToken: string): Promise<any[]> {
    try {
      const response: AxiosResponse = await axios.get('https://api.fitbit.com/1/user/-/devices.json', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      return response.data || [];
    } catch (error) {
      this.logger.error('Failed to get Fitbit devices', { error });
      return [];
    }
  }

  private async setupFitbitWebhook(userId: string, accessToken: string): Promise<void> {
    try {
      // Set up Fitbit webhook subscription for real-time data
      // This requires a verified webhook endpoint
      
      const webhookUrl = process.env.FITBIT_WEBHOOK_URL;
      if (!webhookUrl) {
        this.logger.warn('Fitbit webhook URL not configured, skipping webhook setup');
        return;
      }

      // In a real implementation, this would set up webhook subscriptions
      // for activities, sleep, body, and foods data
      this.logger.info('Fitbit webhook setup initiated', { userId });
      
      // For now, we'll just log the setup
      await this.simulateConnectionDelay(100);
    } catch (error) {
      this.logger.error('Failed to setup Fitbit webhook', { userId, error });
      // Don't throw error as webhook is optional
    }
  }

  private async getFitbitBiometricData(accessToken: string, dataTypes: BiometricDataType[], timeRange: TimeRange): Promise<BiometricReading[]> {
    try {
      const readings: BiometricReading[] = [];
      const dateStr = timeRange.endTime.toISOString().split('T')[0]; // YYYY-MM-DD format

      // Collect heart rate data
      if (dataTypes.includes(BiometricDataType.HEART_RATE)) {
        try {
          const heartRateResponse = await axios.get(
            `https://api.fitbit.com/1/user/-/activities/heart/date/${dateStr}/1d/1min.json`,
            {
              headers: { 'Authorization': `Bearer ${accessToken}` },
              timeout: 10000
            }
          );

          if (heartRateResponse.data['activities-heart-intraday']?.dataset) {
            const heartRateData = heartRateResponse.data['activities-heart-intraday'].dataset;
            // Process heart rate data into BiometricReading format
            // This is a simplified version - real implementation would be more comprehensive
          }
        } catch (error) {
          this.logger.error('Failed to fetch Fitbit heart rate data', { error });
        }
      }

      // Collect sleep data
      if (dataTypes.includes(BiometricDataType.SLEEP_QUALITY)) {
        try {
          const sleepResponse = await axios.get(
            `https://api.fitbit.com/1.2/user/-/sleep/date/${dateStr}.json`,
            {
              headers: { 'Authorization': `Bearer ${accessToken}` },
              timeout: 10000
            }
          );

          if (sleepResponse.data.sleep) {
            // Process sleep data into BiometricReading format
          }
        } catch (error) {
          this.logger.error('Failed to fetch Fitbit sleep data', { error });
        }
      }

      // Collect activity data
      if (dataTypes.includes(BiometricDataType.ACTIVITY_LEVEL)) {
        try {
          const activityResponse = await axios.get(
            `https://api.fitbit.com/1/user/-/activities/date/${dateStr}.json`,
            {
              headers: { 'Authorization': `Bearer ${accessToken}` },
              timeout: 10000
            }
          );

          if (activityResponse.data.summary) {
            // Process activity data into BiometricReading format
          }
        } catch (error) {
          this.logger.error('Failed to fetch Fitbit activity data', { error });
        }
      }

      return readings;
    } catch (error) {
      this.logger.error('Failed to collect Fitbit biometric data', { error });
      return [];
    }
  }

  // Garmin Integration Methods
  private async validateGarminCredentialsWithAPI(apiKey: string, accessToken: string): Promise<any> {
    try {
      // Validate Garmin Connect API credentials
      const response: AxiosResponse = await axios.get('https://connect.garmin.com/modern/proxy/userprofile-service/userprofile', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-API-Key': apiKey,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      if (response.status === 200 && response.data) {
        return response.data;
      }
      
      return null;
    } catch (error) {
      this.logger.error('Garmin credentials validation failed', { error });
      return null;
    }
  }

  private async getGarminDevices(apiKey: string, accessToken: string): Promise<any[]> {
    try {
      const response: AxiosResponse = await axios.get('https://connect.garmin.com/modern/proxy/device-service/deviceregistration/devices', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-API-Key': apiKey,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      return response.data || [];
    } catch (error) {
      this.logger.error('Failed to get Garmin devices', { error });
      return [];
    }
  }

  private async getGarminRecentActivities(apiKey: string, accessToken: string, limit: number = 10): Promise<any[]> {
    try {
      const response: AxiosResponse = await axios.get(`https://connect.garmin.com/modern/proxy/activitylist-service/activities/search/activities?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-API-Key': apiKey,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      return response.data || [];
    } catch (error) {
      this.logger.error('Failed to get Garmin recent activities', { error });
      return [];
    }
  }

  private async setupGarminDataSync(deviceId: string, apiKey: string, accessToken: string): Promise<void> {
    try {
      this.logger.info('Setting up Garmin data synchronization', { deviceId });
      
      // In a real implementation, this would:
      // 1. Set up periodic data collection schedules
      // 2. Configure webhook endpoints if available
      // 3. Set up data type subscriptions
      
      await this.simulateConnectionDelay(200);
      
      this.logger.info('Garmin data synchronization setup completed', { deviceId });
    } catch (error) {
      this.logger.error('Failed to setup Garmin data sync', { deviceId, error });
      throw error;
    }
  }

  private async getGarminBiometricData(apiKey: string, accessToken: string, dataTypes: BiometricDataType[], timeRange: TimeRange): Promise<BiometricReading[]> {
    try {
      const readings: BiometricReading[] = [];
      const startDate = timeRange.startTime.toISOString().split('T')[0];
      const endDate = timeRange.endTime.toISOString().split('T')[0];

      // Collect heart rate data
      if (dataTypes.includes(BiometricDataType.HEART_RATE)) {
        try {
          const heartRateResponse = await axios.get(
            `https://connect.garmin.com/modern/proxy/wellness-service/wellness/dailyHeartRate/${startDate}/${endDate}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-API-Key': apiKey
              },
              timeout: 10000
            }
          );

          if (heartRateResponse.data) {
            // Process heart rate data into BiometricReading format
          }
        } catch (error) {
          this.logger.error('Failed to fetch Garmin heart rate data', { error });
        }
      }

      // Collect stress data
      if (dataTypes.includes(BiometricDataType.STRESS_LEVEL)) {
        try {
          const stressResponse = await axios.get(
            `https://connect.garmin.com/modern/proxy/wellness-service/wellness/dailyStress/${startDate}/${endDate}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-API-Key': apiKey
              },
              timeout: 10000
            }
          );

          if (stressResponse.data) {
            // Process stress data into BiometricReading format
          }
        } catch (error) {
          this.logger.error('Failed to fetch Garmin stress data', { error });
        }
      }

      // Collect sleep data
      if (dataTypes.includes(BiometricDataType.SLEEP_QUALITY)) {
        try {
          const sleepResponse = await axios.get(
            `https://connect.garmin.com/modern/proxy/wellness-service/wellness/dailySleep/${startDate}/${endDate}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-API-Key': apiKey
              },
              timeout: 10000
            }
          );

          if (sleepResponse.data) {
            // Process sleep data into BiometricReading format
          }
        } catch (error) {
          this.logger.error('Failed to fetch Garmin sleep data', { error });
        }
      }

      return readings;
    } catch (error) {
      this.logger.error('Failed to collect Garmin biometric data', { error });
      return [];
    }
  }

  // ============================================================================
  // ENHANCED DATA COLLECTION METHODS
  // ============================================================================

  async collectDeviceData(deviceId: string, dataTypes: BiometricDataType[], timeRange: TimeRange): Promise<BiometricReading[]> {
    try {
      const connection = this.mockConnections.get(deviceId);
      if (!connection || !connection.connected) {
        throw new DeviceConnectionError('Device not connected', deviceId);
      }

      this.logger.info('Collecting device data', { deviceId, dataTypes, timeRange });

      let readings: BiometricReading[] = [];

      switch (connection.deviceType) {
        case DeviceType.APPLE_WATCH:
          if (connection.metadata?.accessToken) {
            // In a real implementation, collect actual Apple HealthKit data
            readings = await this.generateSampleReadingsForDevice(deviceId, connection.deviceType, dataTypes, timeRange);
          }
          break;

        case DeviceType.FITBIT:
          if (connection.metadata?.accessToken) {
            readings = await this.getFitbitBiometricData(
              connection.metadata.accessToken,
              dataTypes,
              timeRange
            );
          }
          break;

        case DeviceType.GARMIN:
          if (connection.metadata?.apiKey && connection.metadata?.accessToken) {
            readings = await this.getGarminBiometricData(
              connection.metadata.apiKey,
              connection.metadata.accessToken,
              dataTypes,
              timeRange
            );
          }
          break;

        default:
          this.logger.warn('Unknown device type for data collection', { deviceId, deviceType: connection.deviceType });
      }

      // Update last sync time
      if (connection.metadata) {
        connection.metadata.lastDataSync = new Date();
      }

      this.logger.info(`Collected ${readings.length} readings from device`, { deviceId });
      return readings;
    } catch (error) {
      this.logger.error('Failed to collect device data', { deviceId, error });
      throw error;
    }
  }

  private async generateSampleReadingsForDevice(
    deviceId: string,
    deviceType: DeviceType,
    dataTypes: BiometricDataType[],
    timeRange: TimeRange
  ): Promise<BiometricReading[]> {
    const readings: BiometricReading[] = [];
    const intervalMs = 5 * 60 * 1000; // 5 minutes
    
    for (let time = timeRange.startTime.getTime(); time <= timeRange.endTime.getTime(); time += intervalMs) {
      const reading: BiometricReading = {
        id: `${deviceId}-${time}`,
        userId: deviceId.split('-')[1] || 'unknown', // Extract userId from deviceId
        deviceId,
        timestamp: new Date(time),
        quality: {
          accuracy: 0.9 + Math.random() * 0.1,
          completeness: 1.0,
          reliability: 0.95 + Math.random() * 0.05,
          outlierDetected: false
        }
      };

      // Add device-specific data based on capabilities
      if (dataTypes.includes(BiometricDataType.HEART_RATE)) {
        const baseHR = deviceType === DeviceType.FITBIT ? 65 : deviceType === DeviceType.GARMIN ? 68 : 70;
        reading.heartRate = {
          bpm: baseHR + Math.random() * 30,
          variability: Math.random() * 50,
          confidence: 0.9 + Math.random() * 0.1
        };
      }

      if (dataTypes.includes(BiometricDataType.STRESS_LEVEL)) {
        reading.stress = {
          level: Math.random() * 100,
          confidence: 0.8 + Math.random() * 0.2
        };
      }

      if (dataTypes.includes(BiometricDataType.ACTIVITY_LEVEL)) {
        reading.activity = {
          steps: Math.floor(Math.random() * 100),
          calories: Math.floor(Math.random() * 50),
          intensity: Math.random()
        };
      }

      if (dataTypes.includes(BiometricDataType.SLEEP_QUALITY) && deviceType !== DeviceType.APPLE_WATCH) {
        reading.sleep = {
          duration: 420 + Math.random() * 120, // 7-9 hours in minutes
          quality: 60 + Math.random() * 40,
          stages: {
            deep: Math.random() * 120,
            light: Math.random() * 200,
            rem: Math.random() * 100,
            awake: Math.random() * 30
          }
        };
      }

      readings.push(reading);
    }

    return readings;
  }
}