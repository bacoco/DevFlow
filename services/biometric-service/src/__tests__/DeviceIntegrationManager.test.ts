import { DeviceIntegrationManagerImpl } from '../services/DeviceIntegrationManager';
import {
  DeviceType,
  DeviceCredentials,
  ConnectionStatus,
  BiometricDataType
} from '@devflow/shared-types';
import axios from 'axios';

// Mock axios for API calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger
jest.mock('../utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}));

describe('DeviceIntegrationManager', () => {
  let deviceManager: DeviceIntegrationManagerImpl;

  beforeEach(() => {
    deviceManager = new DeviceIntegrationManagerImpl();
    jest.clearAllMocks();
  });

  describe('Apple HealthKit Integration', () => {
    const validCredentials: DeviceCredentials = {
      accessToken: 'valid-apple-healthkit-token-12345'
    };

    const invalidCredentials: DeviceCredentials = {
      accessToken: 'short'
    };

    it('should successfully connect Apple HealthKit with valid credentials', async () => {
      const result = await deviceManager.connectAppleHealthKit('user123', validCredentials);

      expect(result.success).toBe(true);
      expect(result.deviceId).toMatch(/^apple-healthkit-user123-\d+$/);
      expect(result.connectionStatus).toBe(ConnectionStatus.CONNECTED);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.deviceName).toBe('Apple HealthKit');
    });

    it('should fail to connect Apple HealthKit with invalid credentials', async () => {
      const result = await deviceManager.connectAppleHealthKit('user123', invalidCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid Apple HealthKit access token');
      expect(result.connectionStatus).toBe(ConnectionStatus.ERROR);
    });

    it('should fail to connect Apple HealthKit without access token', async () => {
      const result = await deviceManager.connectAppleHealthKit('user123', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Apple HealthKit access token required');
      expect(result.connectionStatus).toBe(ConnectionStatus.ERROR);
    });

    it('should return correct capabilities for Apple Watch', async () => {
      const capabilities = await deviceManager.getDeviceCapabilities(DeviceType.APPLE_WATCH);

      expect(capabilities).toEqual([
        BiometricDataType.HEART_RATE,
        BiometricDataType.ACTIVITY_LEVEL,
        BiometricDataType.STRESS_LEVEL
      ]);
    });
  });

  describe('Fitbit Integration', () => {
    const validCredentials: DeviceCredentials = {
      accessToken: 'valid-fitbit-access-token-12345',
      refreshToken: 'valid-fitbit-refresh-token-12345'
    };

    const invalidCredentials: DeviceCredentials = {
      accessToken: 'invalid-token'
    };

    beforeEach(() => {
      // Mock environment variables
      process.env.FITBIT_CLIENT_ID = 'test-client-id';
      process.env.FITBIT_CLIENT_SECRET = 'test-client-secret';
    });

    it('should successfully connect Fitbit with valid credentials', async () => {
      // Mock successful API responses
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          user: {
            displayName: 'Test User',
            encodedId: 'ABC123'
          }
        }
      });

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: [
          {
            deviceVersion: 'Fitbit Charge 5',
            id: 'device123'
          }
        ]
      });

      const result = await deviceManager.connectFitbit('user123', validCredentials);

      expect(result.success).toBe(true);
      expect(result.deviceId).toMatch(/^fitbit-user123-\d+$/);
      expect(result.connectionStatus).toBe(ConnectionStatus.CONNECTED);
      expect(result.metadata?.deviceName).toBe('Fitbit');
      expect(result.metadata?.userProfile).toBe('Test User');
    });

    it('should refresh token when access token is invalid', async () => {
      // Mock failed profile request (invalid token)
      mockedAxios.get.mockRejectedValueOnce(new Error('Unauthorized'));

      // Mock successful token refresh
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token'
        }
      });

      // Mock successful profile request with new token
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          user: {
            displayName: 'Test User',
            encodedId: 'ABC123'
          }
        }
      });

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: []
      });

      const result = await deviceManager.connectFitbit('user123', validCredentials);

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.fitbit.com/oauth2/token',
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Basic'),
            'Content-Type': 'application/x-www-form-urlencoded'
          })
        })
      );
    });

    it('should fail to connect Fitbit without required credentials', async () => {
      const result = await deviceManager.connectFitbit('user123', invalidCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Fitbit OAuth tokens required (accessToken and refreshToken)');
      expect(result.connectionStatus).toBe(ConnectionStatus.ERROR);
    });

    it('should return correct capabilities for Fitbit', async () => {
      const capabilities = await deviceManager.getDeviceCapabilities(DeviceType.FITBIT);

      expect(capabilities).toEqual([
        BiometricDataType.HEART_RATE,
        BiometricDataType.ACTIVITY_LEVEL,
        BiometricDataType.SLEEP_QUALITY,
        BiometricDataType.STRESS_LEVEL
      ]);
    });
  });

  describe('Garmin Integration', () => {
    const validCredentials: DeviceCredentials = {
      accessToken: 'valid-garmin-access-token-12345',
      apiKey: 'valid-garmin-api-key-12345'
    };

    const invalidCredentials: DeviceCredentials = {
      accessToken: 'invalid-token'
    };

    it('should successfully connect Garmin with valid credentials', async () => {
      // Mock successful API responses
      mockedAxios.get
        .mockResolvedValueOnce({
          status: 200,
          data: {
            displayName: 'Test Garmin User',
            userProfileId: 'garmin123'
          }
        })
        .mockResolvedValueOnce({
          status: 200,
          data: [
            {
              productDisplayName: 'Garmin Forerunner 945',
              deviceId: 'garmin-device-123'
            }
          ]
        })
        .mockResolvedValueOnce({
          status: 200,
          data: [
            {
              activityId: 'activity123',
              activityName: 'Running'
            }
          ]
        });

      const result = await deviceManager.connectGarmin('user123', validCredentials);

      expect(result.success).toBe(true);
      expect(result.deviceId).toMatch(/^garmin-user123-\d+$/);
      expect(result.connectionStatus).toBe(ConnectionStatus.CONNECTED);
      expect(result.metadata?.deviceName).toBe('Garmin Connect');
      expect(result.metadata?.userProfile).toBe('Test Garmin User');
      expect(result.metadata?.dataAccessVerified).toBe(true);
    });

    it('should fail to connect Garmin with invalid credentials', async () => {
      // Mock failed API response
      mockedAxios.get.mockRejectedValueOnce(new Error('Unauthorized'));

      const result = await deviceManager.connectGarmin('user123', validCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Garmin API error');
      expect(result.connectionStatus).toBe(ConnectionStatus.ERROR);
    });

    it('should fail to connect Garmin without required credentials', async () => {
      const result = await deviceManager.connectGarmin('user123', invalidCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Garmin Connect API key and access token required');
      expect(result.connectionStatus).toBe(ConnectionStatus.ERROR);
    });

    it('should return correct capabilities for Garmin', async () => {
      const capabilities = await deviceManager.getDeviceCapabilities(DeviceType.GARMIN);

      expect(capabilities).toEqual([
        BiometricDataType.HEART_RATE,
        BiometricDataType.ACTIVITY_LEVEL,
        BiometricDataType.SLEEP_QUALITY,
        BiometricDataType.STRESS_LEVEL,
        BiometricDataType.BODY_TEMPERATURE
      ]);
    });
  });

  describe('Generic Device Management', () => {
    it('should validate device credentials correctly', async () => {
      const appleCredentials: DeviceCredentials = {
        accessToken: 'valid-apple-token-12345'
      };

      const fitbitCredentials: DeviceCredentials = {
        accessToken: 'valid-fitbit-token-12345',
        refreshToken: 'valid-fitbit-refresh-12345'
      };

      const garminCredentials: DeviceCredentials = {
        accessToken: 'valid-garmin-token-12345',
        apiKey: 'valid-garmin-key-12345'
      };

      const appleValid = await deviceManager.validateDeviceCredentials(DeviceType.APPLE_WATCH, appleCredentials);
      const fitbitValid = await deviceManager.validateDeviceCredentials(DeviceType.FITBIT, fitbitCredentials);
      const garminValid = await deviceManager.validateDeviceCredentials(DeviceType.GARMIN, garminCredentials);

      expect(appleValid).toBe(true);
      expect(fitbitValid).toBe(true);
      expect(garminValid).toBe(true);
    });

    it('should refresh device connection successfully', async () => {
      // First connect a device
      const credentials: DeviceCredentials = {
        accessToken: 'valid-apple-token-12345'
      };

      const connectResult = await deviceManager.connectAppleHealthKit('user123', credentials);
      expect(connectResult.success).toBe(true);

      // Then refresh the connection
      const refreshResult = await deviceManager.refreshDeviceConnection(connectResult.deviceId!);
      
      expect(refreshResult.success).toBe(true);
      expect(refreshResult.connectionStatus).toBe(ConnectionStatus.CONNECTED);
    });

    it('should fail to refresh non-existent device connection', async () => {
      const refreshResult = await deviceManager.refreshDeviceConnection('non-existent-device');
      
      expect(refreshResult.success).toBe(false);
      expect(refreshResult.error).toBe('Device connection not found');
      expect(refreshResult.connectionStatus).toBe(ConnectionStatus.ERROR);
    });
  });

  describe('Data Collection', () => {
    it('should collect device data successfully', async () => {
      // Connect a device first
      const credentials: DeviceCredentials = {
        accessToken: 'valid-fitbit-token-12345',
        refreshToken: 'valid-fitbit-refresh-12345'
      };

      // Mock successful connection
      mockedAxios.get
        .mockResolvedValueOnce({
          status: 200,
          data: {
            user: { displayName: 'Test User', encodedId: 'ABC123' }
          }
        })
        .mockResolvedValueOnce({
          status: 200,
          data: []
        });

      const connectResult = await deviceManager.connectFitbit('user123', credentials);
      expect(connectResult.success).toBe(true);

      // Collect data
      const timeRange = {
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        endTime: new Date()
      };

      const readings = await deviceManager.collectDeviceData(
        connectResult.deviceId!,
        [BiometricDataType.HEART_RATE, BiometricDataType.ACTIVITY_LEVEL],
        timeRange
      );

      expect(readings).toBeDefined();
      expect(Array.isArray(readings)).toBe(true);
    });

    it('should fail to collect data from disconnected device', async () => {
      const timeRange = {
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endTime: new Date()
      };

      await expect(
        deviceManager.collectDeviceData(
          'non-existent-device',
          [BiometricDataType.HEART_RATE],
          timeRange
        )
      ).rejects.toThrow('Device not connected');
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      // Mock network timeout
      mockedAxios.get.mockRejectedValueOnce(new Error('timeout of 10000ms exceeded'));

      const credentials: DeviceCredentials = {
        accessToken: 'valid-fitbit-token-12345',
        refreshToken: 'valid-fitbit-refresh-12345'
      };

      const result = await deviceManager.connectFitbit('user123', credentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Fitbit API error');
      expect(result.connectionStatus).toBe(ConnectionStatus.ERROR);
    });

    it('should handle API rate limiting', async () => {
      // Mock rate limit response
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 429,
          data: { message: 'Rate limit exceeded' }
        }
      });

      const credentials: DeviceCredentials = {
        accessToken: 'valid-garmin-token-12345',
        apiKey: 'valid-garmin-key-12345'
      };

      const result = await deviceManager.connectGarmin('user123', credentials);

      expect(result.success).toBe(false);
      expect(result.connectionStatus).toBe(ConnectionStatus.ERROR);
    });
  });
});