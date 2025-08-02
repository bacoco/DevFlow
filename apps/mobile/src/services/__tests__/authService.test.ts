import AsyncStorage from '@react-native-async-storage/async-storage';
import {authService} from '../authService';
import {apiClient} from '../apiClient';

// Mock the apiClient
jest.mock('../apiClient', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
    setAuthToken: jest.fn(),
    clearAuthToken: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  describe('login', () => {
    it('should login successfully and store token', async () => {
      const mockResponse = {
        data: {
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            role: 'developer',
          },
          token: 'test-token',
        },
        status: 200,
        statusText: 'OK',
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockApiClient.setAuthToken).toHaveBeenCalledWith('test-token');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_token', 'test-token');
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error on login failure', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrong-password',
        })
      ).rejects.toThrow('Login failed. Please check your credentials.');
    });
  });

  describe('register', () => {
    it('should register successfully and store token', async () => {
      const mockResponse = {
        data: {
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            role: 'developer',
          },
          token: 'test-token',
        },
        status: 201,
        statusText: 'Created',
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await authService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/register', {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(mockApiClient.setAuthToken).toHaveBeenCalledWith('test-token');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_token', 'test-token');
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error on registration failure', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Email already exists'));

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        })
      ).rejects.toThrow('Registration failed. Please try again.');
    });
  });

  describe('logout', () => {
    it('should logout successfully and clear token', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        data: {},
        status: 200,
        statusText: 'OK',
      });

      await authService.logout();

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/logout');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(mockApiClient.clearAuthToken).toHaveBeenCalled();
    });

    it('should clear token even if API call fails', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Network error'));

      await authService.logout();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(mockApiClient.clearAuthToken).toHaveBeenCalled();
    });
  });

  describe('getStoredToken', () => {
    it('should return stored token', async () => {
      AsyncStorage.setItem('auth_token', 'stored-token');

      const token = await authService.getStoredToken();

      expect(token).toBe('stored-token');
    });

    it('should return null if no token stored', async () => {
      const token = await authService.getStoredToken();

      expect(token).toBeNull();
    });

    it('should return null on storage error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      const token = await authService.getStoredToken();

      expect(token).toBeNull();
    });
  });

  describe('validateToken', () => {
    it('should return true for valid token', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        data: {},
        status: 200,
        statusText: 'OK',
      });

      const isValid = await authService.validateToken('valid-token');

      expect(mockApiClient.setAuthToken).toHaveBeenCalledWith('valid-token');
      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/validate');
      expect(isValid).toBe(true);
    });

    it('should return false for invalid token', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Unauthorized'));

      const isValid = await authService.validateToken('invalid-token');

      expect(isValid).toBe(false);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockResponse = {
        data: {token: 'new-token'},
        status: 200,
        statusText: 'OK',
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const newToken = await authService.refreshToken();

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/refresh');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_token', 'new-token');
      expect(mockApiClient.setAuthToken).toHaveBeenCalledWith('new-token');
      expect(newToken).toBe('new-token');
    });

    it('should logout on refresh failure', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Refresh failed'));

      const newToken = await authService.refreshToken();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(mockApiClient.clearAuthToken).toHaveBeenCalled();
      expect(newToken).toBeNull();
    });
  });
});