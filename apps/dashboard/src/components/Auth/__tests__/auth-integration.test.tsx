/**
 * @jest-environment node
 */

import { authService } from '../../../services/authService';

// Mock fetch for testing
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock window object for node environment
global.window = {
  localStorage: mockLocalStorage,
} as any;

describe('Authentication Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('AuthService Integration', () => {
    it('should handle login flow', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'developer',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser, token: 'test-token' }),
      } as Response);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBe('test-token');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        })
      );
    });

    it('should handle registration flow', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'developer',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser, token: 'test-token' }),
      } as Response);

      const result = await authService.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'developer' as any,
      });

      expect(result.user.name).toBe('Test User');
      expect(result.token).toBe('test-token');
    });

    it('should handle token validation', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'developer',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true, user: mockUser }),
      } as Response);

      const result = await authService.validateToken('test-token');

      expect(result).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/validate'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    it('should handle token refresh', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'developer',
      };

      mockLocalStorage.getItem.mockReturnValue('refresh-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser, token: 'new-token' }),
      } as Response);

      const result = await authService.refreshToken('old-token');

      expect(result.token).toBe('new-token');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/refresh'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer old-token',
          }),
        })
      );
    });

    it('should handle logout', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      await authService.logout('test-token');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/logout'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('devflow_auth_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('devflow_refresh_token');
    });
  });

  describe('Token Management', () => {
    it('should store and retrieve tokens', () => {
      authService.storeToken('test-token', 'refresh-token');

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('devflow_auth_token', 'test-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('devflow_refresh_token', 'refresh-token');

      mockLocalStorage.getItem.mockReturnValue('test-token');
      const token = authService.getStoredToken();
      expect(token).toBe('test-token');
    });

    it('should clear tokens', () => {
      authService.clearStoredToken();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('devflow_auth_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('devflow_refresh_token');
    });

    it('should detect expired tokens', () => {
      // Create an expired token
      const expiredPayload = {
        userId: '123',
        email: 'test@example.com',
        role: 'developer',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      };
      const expiredToken = `header.${btoa(JSON.stringify(expiredPayload))}.signature`;

      expect(authService.isTokenExpired(expiredToken)).toBe(true);
    });

    it('should detect valid tokens', () => {
      // Create a valid token
      const validPayload = {
        userId: '123',
        email: 'test@example.com',
        role: 'developer',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };
      const validToken = `header.${btoa(JSON.stringify(validPayload))}.signature`;

      expect(authService.isTokenExpired(validToken)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle login errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Invalid credentials' }),
      } as Response);

      await expect(authService.login({
        email: 'test@example.com',
        password: 'wrong-password',
      })).rejects.toThrow('Invalid credentials');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(authService.login({
        email: 'test@example.com',
        password: 'password123',
      })).rejects.toThrow('Network error');
    });

    it('should handle invalid token validation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);

      const result = await authService.validateToken('invalid-token');
      expect(result).toBeNull();
    });
  });
});