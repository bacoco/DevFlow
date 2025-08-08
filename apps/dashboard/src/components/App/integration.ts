/**
 * Component Integration Utilities
 * Provides utilities for integrating all components with proper data flow
 */

import { QueryClient } from '@tanstack/react-query';
import { useUIStore } from '../../stores/uiStore';
import { useDataStore } from '../../stores/dataStore';
import { useUserStore } from '../../stores/userStore';

// Integration configuration
export interface IntegrationConfig {
  enableRealTime: boolean;
  enableAnalytics: boolean;
  enableErrorReporting: boolean;
  enablePerformanceMonitoring: boolean;
  preloadRoutes: string[];
  cacheStrategy: 'aggressive' | 'conservative' | 'minimal';
}

export const defaultIntegrationConfig: IntegrationConfig = {
  enableRealTime: true,
  enableAnalytics: true,
  enableErrorReporting: true,
  enablePerformanceMonitoring: process.env.NODE_ENV === 'development',
  preloadRoutes: ['dashboard', 'tasks'],
  cacheStrategy: 'conservative',
};

// Query client factory with integration-specific configuration
export const createIntegratedQueryClient = (config: Partial<IntegrationConfig> = {}) => {
  const finalConfig = { ...defaultIntegrationConfig, ...config };
  
  const cacheTime = {
    aggressive: 30 * 60 * 1000, // 30 minutes
    conservative: 10 * 60 * 1000, // 10 minutes
    minimal: 5 * 60 * 1000, // 5 minutes
  }[finalConfig.cacheStrategy];

  const staleTime = {
    aggressive: 10 * 60 * 1000, // 10 minutes
    conservative: 5 * 60 * 1000, // 5 minutes
    minimal: 2 * 60 * 1000, // 2 minutes
  }[finalConfig.cacheStrategy];

  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime,
        cacheTime,
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          return failureCount < 3;
        },
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 1,
        onError: (error) => {
          if (finalConfig.enableErrorReporting) {
            console.error('Mutation error:', error);
            // Report to error monitoring service
            if (typeof window !== 'undefined' && window.Sentry) {
              window.Sentry.captureException(error);
            }
          }
        },
      },
    },
  });
};

// Store integration utilities
export const integrateStores = () => {
  const uiStore = useUIStore.getState();
  const dataStore = useDataStore.getState();
  const userStore = useUserStore.getState();

  // Cross-store subscriptions for data flow
  const subscriptions: (() => void)[] = [];

  // Subscribe to theme changes and update user preferences
  subscriptions.push(
    useUIStore.subscribe(
      (state) => state.theme,
      (theme) => {
        const currentUserStore = useUserStore.getState();
        if (currentUserStore.auth.isAuthenticated) {
          currentUserStore.updatePreferences({ theme });
        }
      }
    )
  );

  // Subscribe to connection status and update UI
  subscriptions.push(
    useDataStore.subscribe(
      (state) => state.connectionStatus,
      (status) => {
        const currentUIStore = useUIStore.getState();
        if (status === 'disconnected') {
          currentUIStore.addNotification({
            type: 'warning',
            title: 'Connection Lost',
            message: 'You are now in offline mode.',
            persistent: true,
          });
        } else if (status === 'connected') {
          currentUIStore.addNotification({
            type: 'success',
            title: 'Connected',
            message: 'Real-time updates are now available.',
            duration: 3000,
          });
        }
      }
    )
  );

  // Subscribe to task updates and show notifications
  subscriptions.push(
    useDataStore.subscribe(
      (state) => state.tasks.tasks,
      (tasks, previousTasks) => {
        if (previousTasks && tasks.length > previousTasks.length) {
          const newTasks = tasks.filter(
            task => !previousTasks.some(prev => prev.id === task.id)
          );
          
          const currentUIStore = useUIStore.getState();
          newTasks.forEach(task => {
            currentUIStore.addNotification({
              type: 'info',
              title: 'New Task',
              message: `"${task.title}" has been added.`,
              duration: 5000,
            });
          });
        }
      }
    )
  );

  // Return cleanup function
  return () => {
    subscriptions.forEach(unsubscribe => unsubscribe());
  };
};

// Performance monitoring utilities
export const performanceMonitor = {
  startTiming: (label: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(`${label}-start`);
    }
  },

  endTiming: (label: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(`${label}-end`);
      window.performance.measure(label, `${label}-start`, `${label}-end`);
      
      const entries = window.performance.getEntriesByName(label);
      if (entries.length > 0) {
        const duration = entries[entries.length - 1].duration;
        console.log(`${label}: ${duration.toFixed(2)}ms`);
        
        // Report slow operations
        if (duration > 1000) {
          console.warn(`Slow operation detected: ${label} took ${duration.toFixed(2)}ms`);
        }
      }
    }
  },

  measureRender: (componentName: string, renderCount: number) => {
    if (renderCount > 10) {
      console.warn(`High render count for ${componentName}: ${renderCount}`);
    }
  },
};

// Error reporting utilities
export const errorReporter = {
  reportError: (error: Error, context: Record<string, any> = {}) => {
    console.error('Application error:', error, context);
    
    // Report to error monitoring service
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: context,
      });
    }
    
    // Add user-friendly notification
    useUIStore.getState().addNotification({
      type: 'error',
      title: 'Something went wrong',
      message: 'An error occurred. The development team has been notified.',
      persistent: true,
      actions: [
        {
          label: 'Retry',
          onClick: () => window.location.reload(),
        },
      ],
    });
  },

  reportWarning: (message: string, context: Record<string, any> = {}) => {
    console.warn('Application warning:', message, context);
    
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureMessage(message, 'warning');
    }
  },
};

// Data flow utilities
export const dataFlowManager = {
  syncUserPreferences: () => {
    const { auth, preferences, updatePreferences } = useUserStore.getState();
    const { theme } = useUIStore.getState();
    
    if (auth.isAuthenticated && preferences.theme !== theme) {
      updatePreferences({ theme });
    }
  },

  syncDashboardLayout: () => {
    const { layout } = useUIStore.getState();
    const { dashboard, setActiveDashboard } = useDataStore.getState();
    
    if (dashboard.activeDashboard && layout !== dashboard.activeDashboard.layout) {
      // Update the active dashboard with new layout
      setActiveDashboard({
        ...dashboard.activeDashboard,
        layout,
      });
    }
  },

  syncTaskFilters: () => {
    const { tasks, setTaskFilters } = useDataStore.getState();
    const { preferences } = useUserStore.getState();
    
    // Sync task filters with user preferences
    if (preferences.dashboard.defaultTimeRange !== tasks.filters.timeRange) {
      setTaskFilters({
        ...tasks.filters,
        timeRange: preferences.dashboard.defaultTimeRange,
      });
    }
  },
};

// Integration health check
export const healthCheck = {
  checkStores: () => {
    const uiStore = useUIStore.getState();
    const dataStore = useDataStore.getState();
    const userStore = useUserStore.getState();
    
    const issues: string[] = [];
    
    // Check UI store
    if (uiStore.errors.global) {
      issues.push('Global UI error detected');
    }
    
    // Check data store
    if (dataStore.connectionStatus === 'disconnected') {
      issues.push('Data connection is offline');
    }
    
    // Check user store
    if (!userStore.auth.isAuthenticated && userStore.auth.token) {
      issues.push('Authentication state inconsistency');
    }
    
    return {
      healthy: issues.length === 0,
      issues,
    };
  },

  checkPerformance: () => {
    if (typeof window === 'undefined' || !window.performance) {
      return { healthy: true, metrics: {} };
    }
    
    const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const metrics = {
      loadTime: navigation.loadEventEnd - navigation.loadEventStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      firstPaint: window.performance.getEntriesByName('first-paint')[0]?.startTime || 0,
    };
    
    const issues: string[] = [];
    
    if (metrics.loadTime > 3000) {
      issues.push('Slow page load time');
    }
    
    if (metrics.domContentLoaded > 2000) {
      issues.push('Slow DOM content loaded');
    }
    
    return {
      healthy: issues.length === 0,
      issues,
      metrics,
    };
  },
};

// Export all utilities
export const integration = {
  createQueryClient: createIntegratedQueryClient,
  integrateStores,
  performanceMonitor,
  errorReporter,
  dataFlowManager,
  healthCheck,
};

export default integration;