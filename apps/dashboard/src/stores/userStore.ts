/**
 * User State Store
 * Manages user preferences, authentication, and permissions using Zustand
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { 
  User, 
  UserPreferences, 
  PrivacySettings, 
  Permission,
  NotificationSettings,
  DashboardPreferences,
  TimePeriod
} from '../types/dashboard';
import { ThemeMode } from '../types/design-system';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
  loginAttempts: number;
  lastLoginAttempt: Date | null;
}

interface UserState {
  // Authentication state
  auth: AuthState;
  
  // User preferences
  preferences: UserPreferences;
  
  // Privacy settings
  privacy: PrivacySettings | null;
  
  // Permissions
  permissions: Permission[];
  
  // Session data
  session: {
    startTime: Date | null;
    lastActivity: Date | null;
    idleTime: number;
    isIdle: boolean;
  };
  
  // Onboarding state
  onboarding: {
    completed: boolean;
    currentStep: number;
    skippedSteps: number[];
    completedSteps: number[];
  };
  
  // Feature flags
  features: Record<string, boolean>;
  
  // Authentication actions
  login: (user: User, token: string, refreshToken?: string, expiresAt?: Date) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  refreshAuth: (token: string, expiresAt?: Date) => void;
  incrementLoginAttempts: () => void;
  resetLoginAttempts: () => void;
  
  // Preferences actions
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  setTheme: (theme: ThemeMode) => void;
  setTimezone: (timezone: string) => void;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  updateDashboardPreferences: (preferences: Partial<DashboardPreferences>) => void;
  
  // Privacy actions
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => void;
  
  // Permission actions
  setPermissions: (permissions: Permission[]) => void;
  hasPermission: (action: string, resource: string) => boolean;
  
  // Session actions
  startSession: () => void;
  endSession: () => void;
  updateActivity: () => void;
  setIdle: (isIdle: boolean) => void;
  
  // Onboarding actions
  completeOnboardingStep: (step: number) => void;
  skipOnboardingStep: (step: number) => void;
  resetOnboarding: () => void;
  
  // Feature flag actions
  setFeatureFlag: (feature: string, enabled: boolean) => void;
  isFeatureEnabled: (feature: string) => boolean;
  
  // Utility actions
  clearUserData: () => void;
}

const initialAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  expiresAt: null,
  loginAttempts: 0,
  lastLoginAttempt: null,
};

const initialPreferences: UserPreferences = {
  theme: 'dark',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  notifications: {
    email: true,
    inApp: true,
    slack: false,
    frequency: 'immediate',
  },
  dashboard: {
    defaultTimeRange: 'week',
    autoRefresh: true,
    refreshInterval: 30,
    compactMode: false,
  },
};

const initialSession = {
  startTime: null,
  lastActivity: null,
  idleTime: 0,
  isIdle: false,
};

const initialOnboarding = {
  completed: false,
  currentStep: 0,
  skippedSteps: [],
  completedSteps: [],
};

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        auth: initialAuthState,
        preferences: initialPreferences,
        privacy: null,
        permissions: [],
        session: initialSession,
        onboarding: initialOnboarding,
        features: {},

        // Authentication actions
        login: (user, token, refreshToken, expiresAt) => set((state) => ({
          auth: {
            ...state.auth,
            isAuthenticated: true,
            user,
            token,
            refreshToken: refreshToken || null,
            expiresAt: expiresAt || null,
            loginAttempts: 0,
            lastLoginAttempt: null,
          },
          session: {
            ...state.session,
            startTime: new Date(),
            lastActivity: new Date(),
          },
        })),

        logout: () => set((state) => ({
          auth: initialAuthState,
          session: initialSession,
          // Keep preferences and onboarding state
        })),

        updateUser: (updates) => set((state) => ({
          auth: {
            ...state.auth,
            user: state.auth.user ? { ...state.auth.user, ...updates } : null,
          },
        })),

        refreshAuth: (token, expiresAt) => set((state) => ({
          auth: {
            ...state.auth,
            token,
            expiresAt: expiresAt || null,
          },
        })),

        incrementLoginAttempts: () => set((state) => ({
          auth: {
            ...state.auth,
            loginAttempts: state.auth.loginAttempts + 1,
            lastLoginAttempt: new Date(),
          },
        })),

        resetLoginAttempts: () => set((state) => ({
          auth: {
            ...state.auth,
            loginAttempts: 0,
            lastLoginAttempt: null,
          },
        })),

        // Preferences actions
        updatePreferences: (updates) => set((state) => ({
          preferences: { ...state.preferences, ...updates },
        })),

        setTheme: (theme) => set((state) => ({
          preferences: { ...state.preferences, theme },
        })),

        setTimezone: (timezone) => set((state) => ({
          preferences: { ...state.preferences, timezone },
        })),

        updateNotificationSettings: (settings) => set((state) => ({
          preferences: {
            ...state.preferences,
            notifications: { ...state.preferences.notifications, ...settings },
          },
        })),

        updateDashboardPreferences: (preferences) => set((state) => ({
          preferences: {
            ...state.preferences,
            dashboard: { ...state.preferences.dashboard, ...preferences },
          },
        })),

        // Privacy actions
        updatePrivacySettings: (settings) => set((state) => ({
          privacy: state.privacy 
            ? { ...state.privacy, ...settings }
            : settings as PrivacySettings,
        })),

        // Permission actions
        setPermissions: (permissions) => set({ permissions }),

        hasPermission: (action, resource) => {
          const state = get();
          return state.permissions.some(permission => 
            permission.action === action && 
            permission.resource === resource
          );
        },

        // Session actions
        startSession: () => set((state) => ({
          session: {
            ...state.session,
            startTime: new Date(),
            lastActivity: new Date(),
            isIdle: false,
          },
        })),

        endSession: () => set((state) => ({
          session: {
            ...state.session,
            startTime: null,
            lastActivity: null,
            idleTime: 0,
            isIdle: false,
          },
        })),

        updateActivity: () => set((state) => ({
          session: {
            ...state.session,
            lastActivity: new Date(),
            isIdle: false,
          },
        })),

        setIdle: (isIdle) => set((state) => ({
          session: { ...state.session, isIdle },
        })),

        // Onboarding actions
        completeOnboardingStep: (step) => set((state) => {
          const completedSteps = [...state.onboarding.completedSteps, step];
          const isCompleted = completedSteps.length >= 5; // Assuming 5 total steps

          return {
            onboarding: {
              ...state.onboarding,
              completedSteps,
              currentStep: isCompleted ? step : step + 1,
              completed: isCompleted,
            },
          };
        }),

        skipOnboardingStep: (step) => set((state) => ({
          onboarding: {
            ...state.onboarding,
            skippedSteps: [...state.onboarding.skippedSteps, step],
            currentStep: step + 1,
          },
        })),

        resetOnboarding: () => set((state) => ({
          onboarding: initialOnboarding,
        })),

        // Feature flag actions
        setFeatureFlag: (feature, enabled) => set((state) => ({
          features: { ...state.features, [feature]: enabled },
        })),

        isFeatureEnabled: (feature) => {
          const state = get();
          return state.features[feature] ?? false;
        },

        // Utility actions
        clearUserData: () => set({
          auth: initialAuthState,
          preferences: initialPreferences,
          privacy: null,
          permissions: [],
          session: initialSession,
          onboarding: initialOnboarding,
          features: {},
        }),
      }),
      {
        name: 'devflow-user-store',
        // Only persist certain parts of the state
        partialize: (state) => ({
          preferences: state.preferences,
          onboarding: state.onboarding,
          features: state.features,
          // Don't persist sensitive auth data or session data
        }),
      }
    ),
    {
      name: 'user-store',
    }
  )
);

// Selector hooks for better performance
export const useAuth = () => useUserStore((state) => state.auth);
export const useAuthActions = () => useUserStore((state) => ({
  login: state.login,
  logout: state.logout,
  updateUser: state.updateUser,
  refreshAuth: state.refreshAuth,
  incrementLoginAttempts: state.incrementLoginAttempts,
  resetLoginAttempts: state.resetLoginAttempts,
}));

export const useUserPreferences = () => useUserStore((state) => ({
  preferences: state.preferences,
  updatePreferences: state.updatePreferences,
  setTheme: state.setTheme,
  setTimezone: state.setTimezone,
  updateNotificationSettings: state.updateNotificationSettings,
  updateDashboardPreferences: state.updateDashboardPreferences,
}));

export const usePrivacySettings = () => useUserStore((state) => ({
  privacy: state.privacy,
  updatePrivacySettings: state.updatePrivacySettings,
}));

export const usePermissions = () => useUserStore((state) => ({
  permissions: state.permissions,
  setPermissions: state.setPermissions,
  hasPermission: state.hasPermission,
}));

export const useSession = () => useUserStore((state) => ({
  session: state.session,
  startSession: state.startSession,
  endSession: state.endSession,
  updateActivity: state.updateActivity,
  setIdle: state.setIdle,
}));

export const useOnboarding = () => useUserStore((state) => ({
  onboarding: state.onboarding,
  completeOnboardingStep: state.completeOnboardingStep,
  skipOnboardingStep: state.skipOnboardingStep,
  resetOnboarding: state.resetOnboarding,
}));

export const useFeatureFlags = () => useUserStore((state) => ({
  features: state.features,
  setFeatureFlag: state.setFeatureFlag,
  isFeatureEnabled: state.isFeatureEnabled,
}));