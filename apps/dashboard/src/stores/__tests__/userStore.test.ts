/**
 * User Store Tests
 */

import { renderHook, act } from '@testing-library/react';
import { 
  useUserStore, 
  useAuth, 
  useUserPreferences, 
  usePrivacySettings, 
  usePermissions,
  useSession,
  useOnboarding,
  useFeatureFlags
} from '../userStore';
import { User, Permission } from '../../types/dashboard';

// Mock zustand middleware
jest.mock('zustand/middleware', () => ({
  devtools: (fn: any) => fn,
  persist: (fn: any) => fn,
}));

describe('User Store', () => {
  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'developer',
    teamIds: ['team-1'],
    privacySettings: {
      userId: 'user-1',
      dataCollection: {
        ideTelemetry: true,
        gitActivity: true,
        communicationData: false,
        granularControls: {},
      },
      sharing: {
        teamMetrics: true,
        individualMetrics: false,
        anonymizedSharing: true,
      },
      retention: {
        period: 90,
        autoDelete: true,
      },
      anonymization: 'partial',
    },
    preferences: {
      theme: 'dark',
      timezone: 'UTC',
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
    },
  };

  const mockPermissions: Permission[] = [
    { action: 'read', resource: 'dashboard' },
    { action: 'write', resource: 'tasks' },
    { action: 'delete', resource: 'tasks' },
  ];

  beforeEach(() => {
    // Reset store state before each test
    useUserStore.setState({
      auth: {
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
        expiresAt: null,
        loginAttempts: 0,
        lastLoginAttempt: null,
      },
      preferences: {
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
      },
      privacy: null,
      permissions: [],
      session: {
        startTime: null,
        lastActivity: null,
        idleTime: 0,
        isIdle: false,
      },
      onboarding: {
        completed: false,
        currentStep: 0,
        skippedSteps: [],
        completedSteps: [],
      },
      features: {},
    });
  });

  describe('Authentication Management', () => {
    it('should login user correctly', () => {
      const { result } = renderHook(() => useUserStore());
      const token = 'test-token';
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

      act(() => {
        result.current.login(mockUser, token, 'refresh-token', expiresAt);
      });

      expect(result.current.auth.isAuthenticated).toBe(true);
      expect(result.current.auth.user).toEqual(mockUser);
      expect(result.current.auth.token).toBe(token);
      expect(result.current.auth.refreshToken).toBe('refresh-token');
      expect(result.current.auth.expiresAt).toEqual(expiresAt);
      expect(result.current.auth.loginAttempts).toBe(0);
      expect(result.current.session.startTime).toBeInstanceOf(Date);
    });

    it('should logout user correctly', () => {
      const { result } = renderHook(() => useUserStore());

      // Login first
      act(() => {
        result.current.login(mockUser, 'token');
      });

      expect(result.current.auth.isAuthenticated).toBe(true);

      // Then logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.auth.isAuthenticated).toBe(false);
      expect(result.current.auth.user).toBeNull();
      expect(result.current.auth.token).toBeNull();
      expect(result.current.session.startTime).toBeNull();
    });

    it('should update user correctly', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.login(mockUser, 'token');
        result.current.updateUser({ name: 'Updated Name' });
      });

      expect(result.current.auth.user?.name).toBe('Updated Name');
      expect(result.current.auth.user?.email).toBe(mockUser.email); // Should remain unchanged
    });

    it('should refresh auth token', () => {
      const { result } = renderHook(() => useUserStore());
      const newToken = 'new-token';
      const newExpiresAt = new Date(Date.now() + 7200000); // 2 hours from now

      act(() => {
        result.current.login(mockUser, 'old-token');
        result.current.refreshAuth(newToken, newExpiresAt);
      });

      expect(result.current.auth.token).toBe(newToken);
      expect(result.current.auth.expiresAt).toEqual(newExpiresAt);
    });

    it('should manage login attempts', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.incrementLoginAttempts();
        result.current.incrementLoginAttempts();
      });

      expect(result.current.auth.loginAttempts).toBe(2);
      expect(result.current.auth.lastLoginAttempt).toBeInstanceOf(Date);

      act(() => {
        result.current.resetLoginAttempts();
      });

      expect(result.current.auth.loginAttempts).toBe(0);
      expect(result.current.auth.lastLoginAttempt).toBeNull();
    });

    it('should provide auth selector hook', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.logout).toBe('function');
    });
  });

  describe('Preferences Management', () => {
    it('should update preferences correctly', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.updatePreferences({
          theme: 'light',
          timezone: 'America/New_York',
        });
      });

      expect(result.current.preferences.theme).toBe('light');
      expect(result.current.preferences.timezone).toBe('America/New_York');
    });

    it('should set theme correctly', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setTheme('auto');
      });

      expect(result.current.preferences.theme).toBe('auto');
    });

    it('should set timezone correctly', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setTimezone('Europe/London');
      });

      expect(result.current.preferences.timezone).toBe('Europe/London');
    });

    it('should update notification settings', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.updateNotificationSettings({
          email: false,
          slack: true,
          frequency: 'daily',
        });
      });

      expect(result.current.preferences.notifications.email).toBe(false);
      expect(result.current.preferences.notifications.slack).toBe(true);
      expect(result.current.preferences.notifications.frequency).toBe('daily');
      expect(result.current.preferences.notifications.inApp).toBe(true); // Should remain unchanged
    });

    it('should update dashboard preferences', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.updateDashboardPreferences({
          defaultTimeRange: 'month',
          compactMode: true,
        });
      });

      expect(result.current.preferences.dashboard.defaultTimeRange).toBe('month');
      expect(result.current.preferences.dashboard.compactMode).toBe(true);
      expect(result.current.preferences.dashboard.autoRefresh).toBe(true); // Should remain unchanged
    });

    it('should provide preferences selector hook', () => {
      const { result } = renderHook(() => useUserPreferences());

      expect(result.current.preferences.theme).toBe('dark');
      expect(typeof result.current.updatePreferences).toBe('function');
      expect(typeof result.current.setTheme).toBe('function');
    });
  });

  describe('Privacy Settings Management', () => {
    it('should update privacy settings correctly', () => {
      const { result } = renderHook(() => useUserStore());
      const privacySettings = {
        userId: 'user-1',
        dataCollection: {
          ideTelemetry: false,
          gitActivity: true,
          communicationData: false,
          granularControls: {},
        },
        sharing: {
          teamMetrics: false,
          individualMetrics: false,
          anonymizedSharing: true,
        },
        retention: {
          period: 30,
          autoDelete: true,
        },
        anonymization: 'full' as const,
      };

      act(() => {
        result.current.updatePrivacySettings(privacySettings);
      });

      expect(result.current.privacy).toEqual(privacySettings);
    });

    it('should provide privacy settings selector hook', () => {
      const { result } = renderHook(() => usePrivacySettings());

      expect(result.current.privacy).toBeNull();
      expect(typeof result.current.updatePrivacySettings).toBe('function');
    });
  });

  describe('Permissions Management', () => {
    it('should set permissions correctly', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setPermissions(mockPermissions);
      });

      expect(result.current.permissions).toEqual(mockPermissions);
    });

    it('should check permissions correctly', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setPermissions(mockPermissions);
      });

      expect(result.current.hasPermission('read', 'dashboard')).toBe(true);
      expect(result.current.hasPermission('write', 'tasks')).toBe(true);
      expect(result.current.hasPermission('delete', 'dashboard')).toBe(false);
    });

    it('should provide permissions selector hook', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.permissions).toEqual([]);
      expect(typeof result.current.setPermissions).toBe('function');
      expect(typeof result.current.hasPermission).toBe('function');
    });
  });

  describe('Session Management', () => {
    it('should start session correctly', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.startSession();
      });

      expect(result.current.session.startTime).toBeInstanceOf(Date);
      expect(result.current.session.lastActivity).toBeInstanceOf(Date);
      expect(result.current.session.isIdle).toBe(false);
    });

    it('should end session correctly', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.startSession();
        result.current.endSession();
      });

      expect(result.current.session.startTime).toBeNull();
      expect(result.current.session.lastActivity).toBeNull();
      expect(result.current.session.idleTime).toBe(0);
      expect(result.current.session.isIdle).toBe(false);
    });

    it('should update activity correctly', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.startSession();
        result.current.setIdle(true);
        result.current.updateActivity();
      });

      expect(result.current.session.lastActivity).toBeInstanceOf(Date);
      expect(result.current.session.isIdle).toBe(false);
    });

    it('should set idle state correctly', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setIdle(true);
      });

      expect(result.current.session.isIdle).toBe(true);
    });

    it('should provide session selector hook', () => {
      const { result } = renderHook(() => useSession());

      expect(result.current.session.startTime).toBeNull();
      expect(typeof result.current.startSession).toBe('function');
      expect(typeof result.current.endSession).toBe('function');
    });
  });

  describe('Onboarding Management', () => {
    it('should complete onboarding steps correctly', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.completeOnboardingStep(0);
        result.current.completeOnboardingStep(1);
      });

      expect(result.current.onboarding.completedSteps).toEqual([0, 1]);
      expect(result.current.onboarding.currentStep).toBe(2);
      expect(result.current.onboarding.completed).toBe(false);
    });

    it('should mark onboarding as completed when all steps are done', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        // Complete 5 steps (assuming 5 total steps)
        for (let i = 0; i < 5; i++) {
          result.current.completeOnboardingStep(i);
        }
      });

      expect(result.current.onboarding.completed).toBe(true);
    });

    it('should skip onboarding steps correctly', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.skipOnboardingStep(0);
        result.current.skipOnboardingStep(2);
      });

      expect(result.current.onboarding.skippedSteps).toEqual([0, 2]);
      expect(result.current.onboarding.currentStep).toBe(3);
    });

    it('should reset onboarding correctly', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.completeOnboardingStep(0);
        result.current.skipOnboardingStep(1);
        result.current.resetOnboarding();
      });

      expect(result.current.onboarding.completed).toBe(false);
      expect(result.current.onboarding.currentStep).toBe(0);
      expect(result.current.onboarding.completedSteps).toEqual([]);
      expect(result.current.onboarding.skippedSteps).toEqual([]);
    });

    it('should provide onboarding selector hook', () => {
      const { result } = renderHook(() => useOnboarding());

      expect(result.current.onboarding.completed).toBe(false);
      expect(typeof result.current.completeOnboardingStep).toBe('function');
      expect(typeof result.current.skipOnboardingStep).toBe('function');
    });
  });

  describe('Feature Flags Management', () => {
    it('should set feature flags correctly', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setFeatureFlag('newDashboard', true);
        result.current.setFeatureFlag('betaFeatures', false);
      });

      expect(result.current.features.newDashboard).toBe(true);
      expect(result.current.features.betaFeatures).toBe(false);
    });

    it('should check feature flags correctly', () => {
      const { result } = renderHook(() => useUserStore());

      act(() => {
        result.current.setFeatureFlag('testFeature', true);
      });

      expect(result.current.isFeatureEnabled('testFeature')).toBe(true);
      expect(result.current.isFeatureEnabled('nonExistentFeature')).toBe(false);
    });

    it('should provide feature flags selector hook', () => {
      const { result } = renderHook(() => useFeatureFlags());

      expect(result.current.features).toEqual({});
      expect(typeof result.current.setFeatureFlag).toBe('function');
      expect(typeof result.current.isFeatureEnabled).toBe('function');
    });
  });

  describe('Utility Actions', () => {
    it('should clear user data correctly', () => {
      const { result } = renderHook(() => useUserStore());

      // Set some data first
      act(() => {
        result.current.login(mockUser, 'token');
        result.current.setPermissions(mockPermissions);
        result.current.setFeatureFlag('test', true);
      });

      // Clear all data
      act(() => {
        result.current.clearUserData();
      });

      expect(result.current.auth.isAuthenticated).toBe(false);
      expect(result.current.auth.user).toBeNull();
      expect(result.current.permissions).toEqual([]);
      expect(result.current.features).toEqual({});
    });
  });
});