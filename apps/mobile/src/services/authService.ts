import AsyncStorage from '@react-native-async-storage/async-storage';
import {apiClient} from './apiClient';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  token: string;
}

class AuthService {
  private readonly TOKEN_KEY = 'auth_token';

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      const {user, token} = response.data;
      
      await AsyncStorage.setItem(this.TOKEN_KEY, token);
      apiClient.setAuthToken(token);
      
      return {user, token};
    } catch (error) {
      throw new Error('Login failed. Please check your credentials.');
    }
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/register', userData);
      const {user, token} = response.data;
      
      await AsyncStorage.setItem(this.TOKEN_KEY, token);
      apiClient.setAuthToken(token);
      
      return {user, token};
    } catch (error) {
      throw new Error('Registration failed. Please try again.');
    }
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      await AsyncStorage.removeItem(this.TOKEN_KEY);
      apiClient.clearAuthToken();
    }
  }

  async getStoredToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get stored token:', error);
      return null;
    }
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      apiClient.setAuthToken(token);
      const response = await apiClient.get('/auth/validate');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async refreshToken(): Promise<string | null> {
    try {
      const response = await apiClient.post('/auth/refresh');
      const {token} = response.data;
      
      await AsyncStorage.setItem(this.TOKEN_KEY, token);
      apiClient.setAuthToken(token);
      
      return token;
    } catch (error) {
      await this.logout();
      return null;
    }
  }
}

export const authService = new AuthService();