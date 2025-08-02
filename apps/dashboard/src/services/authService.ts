import { User, UserRole } from '@devflow/shared-types';
import { LoginCredentials, RegisterData } from '../contexts/AuthContext';

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

export interface TokenValidationResponse {
  valid: boolean;
  user?: User;
  error?: string;
}

class AuthService {
  private readonly API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  private readonly TOKEN_KEY = 'devflow_auth_token';
  private readonly REFRESH_TOKEN_KEY = 'devflow_refresh_token';
  private tokenRefreshPromise: Promise<AuthResponse> | null = null;

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${this.API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data: AuthResponse = await response.json();
    return data;
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await fetch(`${this.API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const result: AuthResponse = await response.json();
    return result;
  }

  /**
   * Validate token and get user info
   */
  async validateToken(token: string): Promise<User | null> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/auth/validate`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data: TokenValidationResponse = await response.json();
      return data.valid ? data.user || null : null;
    } catch (error) {
      console.error('Token validation failed:', error);
      return null;
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(currentToken: string): Promise<AuthResponse> {
    // Prevent multiple simultaneous refresh requests
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    this.tokenRefreshPromise = this.performTokenRefresh(currentToken);
    
    try {
      const result = await this.tokenRefreshPromise;
      return result;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  private async performTokenRefresh(currentToken: string): Promise<AuthResponse> {
    const refreshToken = this.getStoredRefreshToken();
    
    const response = await fetch(`${this.API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Token refresh failed');
    }

    const data: AuthResponse = await response.json();
    return data;
  }

  /**
   * Logout user
   */
  async logout(token?: string): Promise<void> {
    try {
      if (token) {
        await fetch(`${this.API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout request failed:', error);
      // Continue with local cleanup even if server request fails
    }
    
    this.clearStoredToken();
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(token: string): Promise<User> {
    const response = await fetch(`${this.API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get user profile');
    }

    const user: User = await response.json();
    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(token: string, updates: Partial<User>): Promise<User> {
    const response = await fetch(`${this.API_BASE_URL}/api/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update profile');
    }

    const user: User = await response.json();
    return user;
  }

  /**
   * Change password
   */
  async changePassword(token: string, currentPassword: string, newPassword: string): Promise<void> {
    const response = await fetch(`${this.API_BASE_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to change password');
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const response = await fetch(`${this.API_BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to request password reset');
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const response = await fetch(`${this.API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to reset password');
    }
  }

  // Token Storage Methods
  storeToken(token: string, refreshToken?: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, token);
      if (refreshToken) {
        localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
      }
    }
  }

  getStoredToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  getStoredRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }
    return null;
  }

  clearStoredToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    }
  }

  /**
   * Check if token is expired (client-side check)
   */
  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      return true; // If we can't parse the token, consider it expired
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): Date | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return new Date(payload.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  /**
   * Setup automatic token refresh
   */
  setupTokenRefresh(token: string, onRefresh: (newToken: string) => void): () => void {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return () => {};

    // Refresh token 5 minutes before expiration
    const refreshTime = expiration.getTime() - Date.now() - (5 * 60 * 1000);
    
    if (refreshTime <= 0) {
      // Token is already expired or will expire very soon
      return () => {};
    }

    const timeoutId = setTimeout(async () => {
      try {
        const { token: newToken } = await this.refreshToken(token);
        onRefresh(newToken);
      } catch (error) {
        console.error('Automatic token refresh failed:', error);
      }
    }, refreshTime);

    return () => clearTimeout(timeoutId);
  }
}

export const authService = new AuthService();