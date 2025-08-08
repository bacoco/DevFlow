/**
 * Core Integration Tests
 * Tests the essential integration features without external dependencies
 */

import { renderHook, act } from '@testing-library/react';
import { useUIStore } from '../../../stores/uiStore';
import { useDataStore } from '../../../stores/dataStore';
import { useUserStore } from '../../../stores/userStore';
import { integration } from '../integration';

describe('Core Integration', () => {
  beforeEach(() => {
    // Reset all stores
    useUIStore.getState().clearErrors();
    useDataStore.getState().clearAllData();
    useUserStore.getState().clearUserData();
  });

  describe('Store Integration', () => {
    it('creates query client with proper configuration', () => {
      const queryClient = integration.createQueryClient();
      
      expect(queryClient).toBeDefined();
      
      const defaultOptions = queryClient.getDefaultOptions();
      expect(defaultOptions.queries?.staleTime).toBe(5 * 60 * 1000);
      expect(defaultOptions.queries?.cacheTime).toBe(10 * 60 * 1000);
    });

    it('handles different cache strategies', () => {
      const aggressiveClient = integration.createQueryClient({
        cacheStrategy: 'aggressive',
      });
      
      const conservativeClient = integration.createQueryClient({
        cacheStrategy: 'conservative',
      });
      
      const minimalClient = integration.createQueryClient({
        cacheStrategy: 'minimal',
      });
      
      const aggressiveOptions = aggressiveClient.getDefaultOptions();
      const conservativeOptions = conservativeClient.getDefaultOptions();
      const minimalOptions = minimalClient.getDefaultOptions();
      
      expect(aggressiveOptions.queries?.cacheTime).toBeGreaterThan(
        conservativeOptions.queries?.cacheTime || 0
      );
      expect(conservativeOptions.queries?.cacheTime).toBeGreaterThan(
        minimalOptions.queries?.cacheTime || 0
      );
    });
  });

  describe('Data Flow Management', () => {
    it('syncs user preferences correctly', () => {
      // Set up authenticated user
      act(() => {
        useUserStore.getState().login(
          {
            id: 'test-user',
            email: 'test@example.com',
            name: 'Test User',
            role: 'developer',
            teamIds: ['team-1'],
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
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          'test-token'
        );
      });

      // Change theme in UI store
      act(() => {
        useUIStore.getState().setTheme('light');
      });

      // Sync preferences
      integration.dataFlowManager.syncUserPreferences();
      
      // Should update user preferences
      expect(useUserStore.getState().preferences.theme).toBe('light');
    });

    it('syncs dashboard layout', () => {
      const testLayout = {
        columns: 3,
        gap: 16,
        widgets: [],
      };
      
      // Set up dashboard and layout
      act(() => {
        useUIStore.getState().updateLayout(testLayout);
        useDataStore.getState().setActiveDashboard({
          id: 'dashboard-1',
          name: 'Test Dashboard',
          layout: { columns: 2, gap: 12, widgets: [] },
          widgets: [],
          filters: {},
          permissions: [],
          theme: {},
        });
      });

      // Sync layout
      integration.dataFlowManager.syncDashboardLayout();
      
      // Should update dashboard layout
      const dashboard = useDataStore.getState().dashboard.activeDashboard;
      expect(dashboard?.layout.columns).toBe(testLayout.columns);
      expect(dashboard?.layout.gap).toBe(testLayout.gap);
      expect(dashboard?.layout.widgets).toEqual(testLayout.widgets);
    });

    it('syncs task filters', () => {
      // Set up user preferences
      act(() => {
        useUserStore.getState().updatePreferences({
          dashboard: {
            defaultTimeRange: 'month',
            autoRefresh: true,
            refreshInterval: 30,
            compactMode: false,
          },
        });
      });

      // Sync filters
      integration.dataFlowManager.syncTaskFilters();
      
      // Should update task filters
      const filters = useDataStore.getState().tasks.filters;
      expect(filters.timeRange).toBe('month');
    });
  });

  describe('Health Check', () => {
    it('reports healthy state when no issues', () => {
      // Set connection to connected for healthy state
      act(() => {
        useDataStore.getState().setConnectionStatus('connected');
      });
      
      const health = integration.healthCheck.checkStores();
      
      expect(health.healthy).toBe(true);
      expect(health.issues).toHaveLength(0);
    });

    it('detects UI store issues', () => {
      act(() => {
        useUIStore.getState().setGlobalError(new Error('Test error'));
      });

      const health = integration.healthCheck.checkStores();
      
      expect(health.healthy).toBe(false);
      expect(health.issues).toContain('Global UI error detected');
    });

    it('detects connection issues', () => {
      act(() => {
        useDataStore.getState().setConnectionStatus('disconnected');
      });

      const health = integration.healthCheck.checkStores();
      
      expect(health.healthy).toBe(false);
      expect(health.issues).toContain('Data connection is offline');
    });

    it('detects authentication inconsistencies', () => {
      act(() => {
        // Set token but not authenticated state (inconsistent)
        const userStore = useUserStore.getState();
        userStore.auth.token = 'test-token';
        userStore.auth.isAuthenticated = false;
      });

      const health = integration.healthCheck.checkStores();
      
      expect(health.healthy).toBe(false);
      expect(health.issues).toContain('Authentication state inconsistency');
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      // Mock performance API
      Object.defineProperty(window, 'performance', {
        writable: true,
        value: {
          now: jest.fn(() => Date.now()),
          mark: jest.fn(),
          measure: jest.fn(),
          getEntriesByName: jest.fn(() => [{ duration: 100 }]),
        },
      });
    });

    it('tracks timing correctly', () => {
      const mockPerformance = window.performance as jest.Mocked<Performance>;
      
      integration.performanceMonitor.startTiming('test-operation');
      integration.performanceMonitor.endTiming('test-operation');
      
      expect(mockPerformance.mark).toHaveBeenCalledWith('test-operation-start');
      expect(mockPerformance.mark).toHaveBeenCalledWith('test-operation-end');
      expect(mockPerformance.measure).toHaveBeenCalledWith(
        'test-operation',
        'test-operation-start',
        'test-operation-end'
      );
    });

    it('warns about slow operations', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const mockPerformance = window.performance as jest.Mocked<Performance>;
      
      mockPerformance.getEntriesByName.mockReturnValue([{ duration: 1500 } as any]);
      
      integration.performanceMonitor.startTiming('slow-operation');
      integration.performanceMonitor.endTiming('slow-operation');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow operation detected')
      );
      
      consoleSpy.mockRestore();
    });

    it('measures render performance', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      integration.performanceMonitor.measureRender('TestComponent', 15);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('High render count')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error Reporting', () => {
    beforeEach(() => {
      // Mock Sentry
      Object.defineProperty(window, 'Sentry', {
        writable: true,
        value: {
          captureException: jest.fn(),
          captureMessage: jest.fn(),
        },
      });
    });

    it('reports errors with context', () => {
      const mockSentry = window.Sentry as jest.Mocked<typeof window.Sentry>;
      const testError = new Error('Test error');
      const context = { component: 'TestComponent' };
      
      integration.errorReporter.reportError(testError, context);
      
      expect(mockSentry.captureException).toHaveBeenCalledWith(testError, {
        contexts: context,
      });
      
      // Should add notification
      const notifications = useUIStore.getState().notifications;
      expect(notifications.some(n => n.title === 'Something went wrong')).toBe(true);
    });

    it('reports warnings', () => {
      const mockSentry = window.Sentry as jest.Mocked<typeof window.Sentry>;
      const message = 'Test warning';
      
      integration.errorReporter.reportWarning(message);
      
      expect(mockSentry.captureMessage).toHaveBeenCalledWith(message, 'warning');
    });
  });
});

describe('Integration Configuration', () => {
  it('uses default configuration correctly', () => {
    const queryClient = integration.createQueryClient();
    const defaultOptions = queryClient.getDefaultOptions();
    
    // Should use conservative cache strategy by default
    expect(defaultOptions.queries?.staleTime).toBe(5 * 60 * 1000);
    expect(defaultOptions.queries?.cacheTime).toBe(10 * 60 * 1000);
  });

  it('allows configuration overrides', () => {
    const customConfig = {
      enableRealTime: false,
      cacheStrategy: 'aggressive' as const,
      enableErrorReporting: false,
    };

    const queryClient = integration.createQueryClient(customConfig);
    const defaultOptions = queryClient.getDefaultOptions();
    
    // Should use aggressive cache strategy
    expect(defaultOptions.queries?.cacheTime).toBe(30 * 60 * 1000);
    expect(defaultOptions.queries?.staleTime).toBe(10 * 60 * 1000);
  });

  it('handles retry logic correctly', () => {
    const queryClient = integration.createQueryClient();
    const defaultOptions = queryClient.getDefaultOptions();
    const retryFn = defaultOptions.queries?.retry as Function;
    
    // Should not retry on 4xx errors
    expect(retryFn(1, { status: 404 })).toBe(false);
    expect(retryFn(1, { status: 400 })).toBe(false);
    
    // Should retry on 5xx errors up to 3 times
    expect(retryFn(1, { status: 500 })).toBe(true);
    expect(retryFn(2, { status: 500 })).toBe(true);
    expect(retryFn(3, { status: 500 })).toBe(false);
    
    // Should retry on network errors
    expect(retryFn(1, { status: undefined })).toBe(true);
    expect(retryFn(2, { status: undefined })).toBe(true);
    expect(retryFn(3, { status: undefined })).toBe(false);
  });
});