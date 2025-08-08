import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@devflow/shared-types';
import { authService } from '../services/authService';
import { websocketService } from '../services/websocketService';

// Auth State Types
export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

// Auth Actions
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: User };

// Auth Context
interface AuthContextType {
  state: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      // Update websocket token when authentication succeeds
      if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'development') {
        websocketService.updateToken(action.payload.token);
      }
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        error: action.payload,
      };
    case 'LOGOUT':
      // Clear websocket token when logging out
      if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'development') {
        websocketService.updateToken(undefined);
      }
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
};

// Initial State
const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

// Auth Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      // Development mode: Check for demo user in localStorage
      if (process.env.NODE_ENV === 'development') {
        const demoUser = localStorage.getItem('devflow_demo_user');
        if (demoUser) {
          const user = JSON.parse(demoUser);
          const token = 'demo-token-' + Date.now();
          dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } });
          return;
        }
      }

      try {
        const token = authService.getStoredToken();
        if (token) {
          const user = await authService.validateToken(token);
          if (user) {
            dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } });
            return;
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        authService.clearStoredToken();
      }
      
      dispatch({ type: 'AUTH_FAILURE', payload: '' });
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (credentials: LoginCredentials): Promise<void> => {
    dispatch({ type: 'AUTH_START' });
    
    try {
      // Development mode: Use demo credentials
      if (process.env.NODE_ENV === 'development') {
        // Demo credentials
        const demoCredentials = [
          { email: 'loic@loic.fr', password: 'loic', role: 'ADMIN' },
          { email: 'admin@loic.fr', password: 'loic', role: 'ADMIN' },
          { email: 'manager@loic.fr', password: 'loic', role: 'MANAGER' },
          { email: 'lead@loic.fr', password: 'loic', role: 'TEAM_LEAD' },
          { email: 'dev@loic.fr', password: 'loic', role: 'DEVELOPER' },
        ];

        const matchedUser = demoCredentials.find(
          cred => cred.email === credentials.email && cred.password === credentials.password
        );

        if (matchedUser) {
          const user: User = {
            id: 'loic-user-' + matchedUser.role.toLowerCase(),
            email: matchedUser.email,
            name: 'Loic (' + matchedUser.role.charAt(0) + matchedUser.role.slice(1).toLowerCase() + ')',
            role: matchedUser.role as UserRole,
            teamIds: ['team-1', 'team-2'],
            preferences: {
              theme: 'dark',
              notifications: {
                email: true,
                push: true,
                inApp: true,
              },
              dashboard: {
                defaultView: 'overview',
                refreshInterval: 30,
              },
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const token = 'demo-token-' + Date.now();
          
          // Store demo user for persistence
          localStorage.setItem('devflow_demo_user', JSON.stringify(user));
          authService.storeToken(token);
          
          dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } });
          return;
        } else {
          throw new Error('Invalid credentials. Try: loic@loic.fr / loic');
        }
      }

      // Production mode: Use real API
      const { user, token } = await authService.login(credentials);
      authService.storeToken(token);
      dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  // Register function
  const register = async (data: RegisterData): Promise<void> => {
    dispatch({ type: 'AUTH_START' });
    
    try {
      const { user, token } = await authService.register(data);
      authService.storeToken(token);
      dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  // Logout function
  const logout = (): void => {
    authService.clearStoredToken();
    // Clear demo user in development mode
    if (process.env.NODE_ENV === 'development') {
      localStorage.removeItem('devflow_demo_user');
    }
    dispatch({ type: 'LOGOUT' });
  };

  // Refresh token function
  const refreshToken = async (): Promise<void> => {
    try {
      const currentToken = state.token || authService.getStoredToken();
      if (!currentToken) {
        throw new Error('No token available for refresh');
      }

      const { user, token } = await authService.refreshToken(currentToken);
      authService.storeToken(token);
      dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } });
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      throw error;
    }
  };

  // Clear error function
  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Update user function
  const updateUser = (user: User): void => {
    dispatch({ type: 'UPDATE_USER', payload: user });
  };

  const contextValue: AuthContextType = {
    state,
    login,
    register,
    logout,
    refreshToken,
    clearError,
    updateUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper hook for checking permissions
export const usePermissions = () => {
  const { state } = useAuth();
  
  const hasRole = (requiredRole: UserRole): boolean => {
    if (!state.user) return false;
    
    const roleHierarchy = {
      [UserRole.DEVELOPER]: 0,
      [UserRole.TEAM_LEAD]: 1,
      [UserRole.MANAGER]: 2,
      [UserRole.ADMIN]: 3,
    };
    
    return roleHierarchy[state.user.role] >= roleHierarchy[requiredRole];
  };

  const canAccessTeam = (teamId: string): boolean => {
    if (!state.user) return false;
    return state.user.teamIds.includes(teamId) || hasRole(UserRole.MANAGER);
  };

  return {
    hasRole,
    canAccessTeam,
    isAdmin: hasRole(UserRole.ADMIN),
    isManager: hasRole(UserRole.MANAGER),
    isTeamLead: hasRole(UserRole.TEAM_LEAD),
    isDeveloper: state.user?.role === UserRole.DEVELOPER,
  };
};