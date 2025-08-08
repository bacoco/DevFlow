/**
 * Integration Validation Tests
 * Comprehensive tests for all integration features and data flow
 */

import { renderHook, act } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { 
  integration,
  defaultIntegrationConfig,
  performanceMonitor,
  errorReporter,
  dataFlowManager,
  healthCheck
} from '../integration';
import { useUIStore } from '../../../stores/uiStore';
import { useDataStore } from '../../../stores/dataStore';
import { useUserStore } from '../../../stores/userStore';

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => [{ duration: 100 }]),
  getEntriesByType: jest.fn(() => [
    {
      loadEventEnd: 2000,
      loadEventStart: 1000,
      domContentLoadedEventEnd: 1500,
      domContentLoadedEventStart: 1200,
    }
  ]),
};

Object.defineProperty(window, 'performance', {
  writable: true,
  value: mockPerformance,
});

// Mock Sentry
const mockSentry = {
  captureException: jest.fn(),
  captureMessage: jest.fn(),
};

Object.defineProperty(window, 'Sentry', {
  writable: true,
  value: mockSentry,
});

describe('Integration Utilities', () => {
  beforeEach(() => {
    // Reset all stores
    useUIStore.getState().clearErrors();
    useDataStore.getState().clearAllData();
    useUserStore.getState().clearUserData();
    
    // Clear mocks
    jest.clearAllMocks();
  });

  describe('Query Client Integration', () => {
    it('creates query client with default configuration', () => {
      const queryClient = integration.createQueryClient();
      
      expect(queryClient).toBeInstanceOf(QueryClient);
      
      const defaultOptions = queryClient.getDefaultOptions();
      expect(defaultOptions.queries?.staleTime).toBe(5 * 60 * 1000); // 5 minutes
      expect(defaultOptions.queries?.cacheTime).toBe(10 * 60 * 1000); // 10 minutes
    });

    it('creates query client with custom configuration', () => {
      const queryClient = integration.createQueryClient({
        cacheStrategy: 'aggressive',
        enableErrorReporting: false,
      });
      
      const defaultOptions = queryClient.getDefaultOptions();
      expect(defaultOptions.queries?.staleTime).toBe(10 * 60 * 1000); // 10 minutes
      expect(defaultOptions.queries?.cacheTime).toBe(30 * 60 * 1000); // 30 minutes
    });

    it('handles query retry logic correctly', () => {
      const queryClient = integration.createQueryClient();
      const defaultOptions = queryClient.getDefaultOptions();
      const retryFn = defaultOptions.queries?.retry as Function;
      
      // Should not retry on 4xx errors
      expect(retryFn(1, { status: 404 })).toBe(false);
      expect(retryFn(1, { status: 400 })).toBe(false);
      
      // Should retry on 5xx errors
      expect(retryFn(1, { status: 500 })).toBe(true);
      expect(retryFn(2, { status: 500 })).toBe(true);
      expect(retryFn(3, { status: 500 })).toBe(false); // Max retries reached
    });
  });

  describe('Store Integration', () => {
    it('integrates stores with cross-store subscriptions', () => {
      const cleanup = integration.integrateStores();
      
      expect(typeof cleanup).toBe('function');
      
      // Test theme synchronization
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

      act(() => {
        useUIStore.getState().setTheme('light');
      });

      // Should update user preferences
      expect(useUserStore.getState().preferences.theme).toBe('light');
      
      cleanup();
    });

    it('handles connection status changes', () => {
      const cleanup = integration.integrateStores();
      
      act(() => {
        useDataStore.getState().setConnectionStatus('disconnected');
      });
      
      // Should add offline notification
      const notifications = useUIStore.getState().notifications;
      expect(notifications.some(n => n.title === 'Connection Lost')).toBe(true);
      
      act(() => {
        useDataStore.getState().setConnectionStatus('connected');
      });
      
      // Should add connected notification
      const updatedNotifications = useUIStore.getState().notifications;
      expect(updatedNotifications.some(n => n.title === 'Connected')).toBe(true);
      
      cleanup();
    });

    it('handles task updates with notifications', () => {
      const cleanup = integration.integrateStores();
      
      const newTask = {
        id: 'task-1',
        title: 'New Task',
        description: 'Test task',
        status: 'todo' as const,
        priority: 'medium' as const,
        assignee: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
        },
        tags: ['test'],
        dueDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      act(() => {
        useDataStore.getState().addTask(newTask);
      });
      
      // Should add new task notification
      const notifications = useUIStore.getState().notifications;
      expect(notifications.some(n => n.title === 'New Task')).toBe(true);
      
      cleanup();
    });
  });

  describe('Performance Monitoring', () => {
    it('tracks timing correctly', () => {
      performanceMonitor.startTiming('test-operation');
      performanceMonitor.endTiming('test-operation');
      
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
      
      mockPerformance.getEntriesByName.mockReturnValue([{ duration: 1500 }]);
      
      performanceMonitor.startTiming('slow-operation');
      performanceMonitor.endTiming('slow-operation');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow operation detected')
      );
      
      consoleSpy.mockRestore();
    });

    it('measures render performance', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      performanceMonitor.measureRender('TestComponent', 15);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('High render count')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error Reporting', () => {
    it('reports errors correctly', () => {
      const testError = new Error('Test error');
      const context = { component: 'TestComponent' };
      
      errorReporter.reportError(testError, context);
      
      expect(mockSentry.captureException).toHaveBeenCalledWith(testError, {
        contexts: context,
      });
      
      // Should add notification
      const notifications = useUIStore.getState().notifications;
      expect(notifications.some(n => n.title === 'Something went wrong')).toBe(true);
    });

    it('reports warnings correctly', () => {
      const message = 'Test warning';
      const context = { component: 'TestComponent' };
      
      errorReporter.reportWarning(message, context);
      
      expect(mockSentry.captureMessage).toHaveBeenCalledWith(message, 'warning');
    });
  });

  describe('Data Flow Management', () => {
    it('syncs user preferences', () => {
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

      act(() => {
        useUIStore.getState().setTheme('light');
      });

      dataFlowManager.syncUserPreferences();
      
      expect(useUserStore.getState().preferences.theme).toBe('light');
    });

    it('syncs dashboard layout', () => {
      const testLayout = {
        columns: 3,
        gap: 16,
        widgets: [],
      };
      
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

      dataFlowManager.syncDashboardLayout();
      
      const dashboard = useDataStore.getState().dashboard.activeDashboard;
      expect(dashboard?.layout).toEqual(testLayout);
    });

    it('syncs task filters', () => {
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

      dataFlowManager.syncTaskFilters();
      
      const filters = useDataStore.getState().tasks.filters;
      expect(filters.timeRange).toBe('month');
    });
  });

  describe('Health Check', () => {
    it('checks store health correctly', () => {
      const health = healthCheck.checkStores();
      
      expect(health.healthy).toBe(true);
      expect(health.issues).toHaveLength(0);
    });

    it('detects store issues', () => {
      act(() => {
        useUIStore.getState().setGlobalError(new Error('Test error'));
        useDataStore.getState().setConnectionStatus('disconnected');
      });

      const health = healthCheck.checkStores();
      
      expect(health.healthy).toBe(false);
      expect(health.issues).toContain('Global UI error detected');
      expect(health.issues).toContain('Data connection is offline');
    });

    it('checks performance health', () => {
      const health = healthCheck.checkPerformance();
      
      expect(health.healthy).toBe(true);
      expect(health.metrics).toHaveProperty('loadTime');
      expect(health.metrics).toHaveProperty('domContentLoaded');
    });

    it('detects performance issues', () => {
      mockPerformance.getEntriesByType.mockReturnValue([
        {
          loadEventEnd: 5000,
          loadEventStart: 1000,
          domContentLoadedEventEnd: 4000,
          domContentLoadedEventStart: 1000,
        }
      ]);

      const health = healthCheck.checkPerformance();
      
      expect(health.healthy).toBe(false);
      expect(health.issues).toContain('Slow page load time');
      expect(health.issues).toContain('Slow DOM content loaded');
    });
  });
});

describe('Integration Configuration', () => {
  it('has correct default configuration', () => {
    expect(defaultIntegrationConfig).toEqual({
      enableRealTime: true,
      enableAnalytics: true,
      enableErrorReporting: true,
      enablePerformanceMonitoring: process.env.NODE_ENV === 'development',
      preloadRoutes: ['dashboard', 'tasks'],
      cacheStrategy: 'conservative',
    });
  });

  it('allows configuration overrides', () => {
    const customConfig = {
      enableRealTime: false,
      cacheStrategy: 'aggressive' as const,
    };

    const queryClient = integration.createQueryClient(customConfig);
    const defaultOptions = queryClient.getDefaultOptions();
    
    // Should use aggressive cache strategy
    expect(defaultOptions.queries?.cacheTime).toBe(30 * 60 * 1000);
  });
});