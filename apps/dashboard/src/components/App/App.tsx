/**
 * Main Application Component
 * Integrates all components with proper data flow and state management
 * Provides smooth page transitions and loading states throughout the application
 * 
 * Features:
 * - Complete component integration with proper data flow
 * - Smooth page transitions with Framer Motion
 * - Comprehensive error handling and recovery
 * - Real-time WebSocket integration
 * - Accessibility compliance (WCAG 2.1 AA)
 * - Performance optimizations with lazy loading
 * - Responsive design with theme support
 */

import React, { useEffect, useState, Suspense, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ErrorBoundary } from 'react-error-boundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Layout Components
import { AppShell } from '../Layout/AppShell';
import { Header } from '../Layout/Header';
import { Sidebar } from '../Layout/Sidebar';

// Context Providers
import { AuthProvider } from '../../contexts/AuthContext';
import { WebSocketProvider } from '../../contexts/WebSocketContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { AccessibilityProvider } from '../../contexts/AccessibilityContext';

// Store Hooks
import { useUIStore } from '../../stores/uiStore';
import { useDataStore } from '../../stores/dataStore';
import { useUserStore } from '../../stores/userStore';

// Components
import { LoadingScreen } from '../ui/LoadingScreen';
import { ErrorFallback } from '../ErrorBoundary/ErrorFallback';
import { NotificationCenter } from '../ui/NotificationCenter';
import { SkipLinks } from '../ui/SkipLinks';
import { ConnectionStatus } from '../ui/ConnectionStatus';
import { PageTransition } from './PageTransition';

// Pages (Lazy loaded)
import { LazyRoutes, preloadRoutes } from '../Layout/LazyRoutes';

// Types
import { BreadcrumbItem } from '../Layout/Breadcrumb';
import { User } from '../../types/dashboard';

// Utilities
import { cn } from '../../utils/cn';
import { useProductionIntegration } from '../../utils/production-integration';
import { getProductionMonitor } from '../../utils/monitoring';

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

interface AppProps {
  initialUser?: User;
  initialTheme?: 'light' | 'dark' | 'auto';
  queryClient?: QueryClient;
}

const AppContent: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [pageHistory, setPageHistory] = useState<string[]>(['dashboard']);
  const [initializationProgress, setInitializationProgress] = useState(0);

  // Production integration
  const { isReady: productionReady, config: productionConfig } = useProductionIntegration();

  // Store hooks with performance optimizations
  const { 
    theme, 
    sidebarCollapsed, 
    activeModal, 
    notifications,
    loading,
    errors,
    addNotification,
    setGlobalLoading,
    setGlobalError,
    clearErrors,
    layout
  } = useUIStore();

  const {
    connectionStatus,
    setConnectionStatus,
    updateLastSync,
    refreshData,
    dashboard,
    tasks,
    analytics
  } = useDataStore();

  const {
    auth,
    preferences,
    updateActivity,
    startSession,
    session,
    permissions
  } = useUserStore();

  // Performance monitoring
  const performanceMetrics = useMemo(() => ({
    startTime: performance.now(),
    renderCount: 0,
  }), []);

  // Memoized handlers for better performance
  const handlePageChange = useCallback((page: string, newBreadcrumbs: BreadcrumbItem[] = []) => {
    performance.mark('page-change-start');
    
    setCurrentPage(page);
    setBreadcrumbs(newBreadcrumbs);
    setPageHistory(prev => [...prev.slice(-9), page]); // Keep last 10 pages
    
    // Update activity
    if (auth.isAuthenticated) {
      updateActivity();
    }

    // Preload related routes
    if (preloadRoutes[page as keyof typeof preloadRoutes]) {
      preloadRoutes[page as keyof typeof preloadRoutes]().catch(console.warn);
    }

    performance.mark('page-change-end');
    performance.measure('page-change', 'page-change-start', 'page-change-end');
  }, [auth.isAuthenticated, updateActivity]);

  const handleSearch = useCallback((query: string) => {
    console.log('Search query:', query);
    addNotification({
      type: 'info',
      title: 'Search',
      message: `Searching for "${query}"...`,
      duration: 3000,
    });
    
    // Navigate to search results page
    handlePageChange('search', [
      { label: 'Dashboard', href: '/' },
      { label: 'Search Results', href: `/search?q=${encodeURIComponent(query)}` },
    ]);
  }, [addNotification, handlePageChange]);

  const handleNotificationClick = useCallback((notification: any) => {
    console.log('Notification clicked:', notification);
    
    // Handle different notification types
    switch (notification.type) {
      case 'task_update':
        handlePageChange('tasks', [
          { label: 'Dashboard', href: '/' },
          { label: 'Tasks', href: '/tasks' },
        ]);
        break;
      case 'system_alert':
        handlePageChange('settings', [
          { label: 'Dashboard', href: '/' },
          { label: 'Settings', href: '/settings' },
        ]);
        break;
      case 'analytics_ready':
        handlePageChange('analytics', [
          { label: 'Dashboard', href: '/' },
          { label: 'Analytics', href: '/analytics' },
        ]);
        break;
      default:
        // Default action
        break;
    }
  }, [handlePageChange]);

  const handleConnectionChange = useCallback((isConnected: boolean) => {
    const newStatus = isConnected ? 'connected' : 'disconnected';
    setConnectionStatus(newStatus);
    
    if (isConnected) {
      updateLastSync();
      addNotification({
        type: 'success',
        title: 'Connected',
        message: 'Real-time updates are now available.',
        duration: 3000,
      });
    } else {
      addNotification({
        type: 'warning',
        title: 'Connection Lost',
        message: 'Real-time updates are temporarily unavailable.',
        persistent: true,
      });
    }
  }, [setConnectionStatus, updateLastSync, addNotification]);

  const handleUserProfileClick = useCallback(() => {
    handlePageChange('profile', [
      { label: 'Dashboard', href: '/' },
      { label: 'Profile', href: '/profile' },
    ]);
  }, [handlePageChange]);

  const handleLogout = useCallback(() => {
    // This will be handled by the auth context
    console.log('Logout requested');
    addNotification({
      type: 'info',
      title: 'Logging out...',
      message: 'Please wait while we log you out.',
      duration: 2000,
    });
  }, [addNotification]);

  // Initialize application with progress tracking
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setGlobalLoading(true);
        clearErrors();
        setInitializationProgress(10);

        performance.mark('app-init-start');

        // Step 1: Start user session
        if (auth.isAuthenticated) {
          startSession();
          setInitializationProgress(25);
        }

        // Step 2: Initialize stores
        setInitializationProgress(40);

        // Step 3: Load initial data
        await refreshData();
        setInitializationProgress(60);

        // Step 4: Set up real-time connections
        setInitializationProgress(75);

        // Step 5: Set up activity tracking
        const activityInterval = setInterval(() => {
          if (auth.isAuthenticated) {
            updateActivity();
          }
        }, 30000); // Update every 30 seconds

        // Step 6: Preload critical routes
        const preloadPromises = [
          preloadRoutes.dashboard?.(),
          preloadRoutes.tasks?.(),
        ].filter(Boolean);

        await Promise.allSettled(preloadPromises);
        setInitializationProgress(90);

        // Step 7: Complete initialization
        setIsInitialized(true);
        setInitializationProgress(100);

        performance.mark('app-init-end');
        performance.measure('app-initialization', 'app-init-start', 'app-init-end');

        // Log performance metrics
        const initTime = performance.getEntriesByName('app-initialization')[0]?.duration;
        if (initTime) {
          console.log(`App initialized in ${initTime.toFixed(2)}ms`);
        }

        return () => {
          clearInterval(activityInterval);
        };
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setGlobalError(error as Error);
        addNotification({
          type: 'error',
          title: 'Initialization Error',
          message: 'Failed to initialize the application. Please refresh the page.',
          persistent: true,
          actions: [
            {
              label: 'Retry',
              onClick: () => window.location.reload(),
            },
            {
              label: 'Report Issue',
              onClick: () => {
                // Open issue reporting
                console.log('Report issue clicked');
              },
            },
          ],
        });
      } finally {
        setGlobalLoading(false);
      }
    };

    initializeApp();
  }, [auth.isAuthenticated, startSession, refreshData, updateActivity, clearErrors, setGlobalLoading, setGlobalError, addNotification]);

  // Keyboard navigation handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Global keyboard shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'k':
            event.preventDefault();
            // Open command palette or search
            handleSearch('');
            break;
          case 'b':
            event.preventDefault();
            // Toggle sidebar
            useUIStore.getState().toggleSidebar();
            break;
          case '/':
            event.preventDefault();
            // Focus search
            const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
            searchInput?.focus();
            break;
        }
      }

      // Escape key handling
      if (event.key === 'Escape') {
        if (activeModal) {
          useUIStore.getState().closeModal();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, handleSearch]);

  // Auto-save user preferences
  useEffect(() => {
    const savePreferences = () => {
      if (auth.isAuthenticated && preferences) {
        // Auto-save preferences periodically
        console.log('Auto-saving user preferences');
      }
    };

    const interval = setInterval(savePreferences, 60000); // Every minute
    return () => clearInterval(interval);
  }, [auth.isAuthenticated, preferences]);

  // Performance monitoring
  useEffect(() => {
    performanceMetrics.renderCount++;
    
    if (performanceMetrics.renderCount > 1) {
      const renderTime = performance.now() - performanceMetrics.startTime;
      if (renderTime > 100) {
        console.warn(`Slow render detected: ${renderTime.toFixed(2)}ms`);
      }
    }
  });

  // Page transition variants
  const pageVariants = {
    initial: { 
      opacity: 0, 
      y: 20,
      scale: 0.98
    },
    animate: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
      },
    },
    exit: { 
      opacity: 0, 
      y: -20,
      scale: 1.02,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  // Show loading screen during initialization
  if (!isInitialized || loading.global) {
    return (
      <LoadingScreen 
        message="Initializing DevFlow Intelligence Dashboard..."
        progress={initializationProgress}
        details={
          initializationProgress < 25 ? 'Starting session...' :
          initializationProgress < 40 ? 'Loading user data...' :
          initializationProgress < 60 ? 'Fetching dashboard data...' :
          initializationProgress < 75 ? 'Establishing connections...' :
          initializationProgress < 90 ? 'Preloading resources...' :
          'Finalizing setup...'
        }
      />
    );
  }

  // Show error state if there's a global error
  if (errors.global) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ErrorFallback 
          error={errors.global}
          resetError={clearErrors}
        />
      </div>
    );
  }

  return (
    <AccessibilityProvider>
      <div className={cn(
        'min-h-screen',
        'transition-colors duration-300',
        theme === 'dark' ? 'dark' : '',
        'font-sans antialiased'
      )}>
        {/* Skip Links for Accessibility */}
        <SkipLinks />

        {/* WebSocket Provider for Real-time Updates */}
        <WebSocketProvider
          autoConnect={auth.isAuthenticated}
          onConnectionChange={handleConnectionChange}
          enableDashboardSync={true}
          enableTaskSync={true}
          enableMetricSync={true}
          syncFilters={{
            userId: auth.user?.id,
            teamIds: auth.user?.teamIds,
            permissions: permissions,
          }}
        >
          {/* Main App Shell */}
          <AppShell
            theme={theme}
            layout={layout}
            headerProps={{
              breadcrumbs,
              onSearchSubmit: handleSearch,
              onNotificationClick: handleNotificationClick,
              currentPage,
              pageHistory,
            }}
            sidebarProps={{
              onUserProfileClick: handleUserProfileClick,
              onLogout: handleLogout,
              currentPage,
              collapsed: sidebarCollapsed,
            }}
            onSidebarToggle={() => {
              useUIStore.getState().toggleSidebar();
            }}
          >
            {/* Main Content Area */}
            <main 
              id="main-content"
              className="flex-1 relative focus:outline-none"
              tabIndex={-1}
            >
              {/* Page Content with Enhanced Transitions */}
              <PageTransition
                pageKey={currentPage}
                direction="vertical"
                className="h-full"
              >
                <ErrorBoundary
                  FallbackComponent={ErrorFallback}
                  onError={(error, errorInfo) => {
                    console.error('Page error:', error, errorInfo);
                    
                    // Report error to production monitoring
                    const monitor = getProductionMonitor();
                    monitor.trackError(error, {
                      context: 'page_error_boundary',
                      page: currentPage,
                      user: auth.user,
                      errorInfo,
                    });

                    addNotification({
                      type: 'error',
                      title: 'Page Error',
                      message: 'An error occurred while loading this page.',
                      persistent: true,
                      actions: [
                        {
                          label: 'Retry',
                          onClick: () => window.location.reload(),
                        },
                        {
                          label: 'Go to Dashboard',
                          onClick: () => handlePageChange('dashboard'),
                        },
                      ],
                    });
                  }}
                  onReset={() => {
                    // Reset to dashboard
                    handlePageChange('dashboard');
                  }}
                >
                  <Suspense fallback={
                    <div className="flex items-center justify-center h-64">
                      <LoadingScreen 
                        message={`Loading ${currentPage}...`}
                        size="sm"
                      />
                    </div>
                  }>
                    <LazyRoutes 
                      currentPage={currentPage}
                      onPageChange={handlePageChange}
                      breadcrumbs={breadcrumbs}
                      pageHistory={pageHistory}
                    />
                  </Suspense>
                </ErrorBoundary>
              </PageTransition>

              {/* Connection Status Component */}
              <ConnectionStatus 
                status={connectionStatus}
                lastSync={useDataStore.getState().lastSync}
                onRetry={() => {
                  // Trigger reconnection
                  refreshData();
                }}
              />

              {/* Performance Monitor (Development Only) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="fixed bottom-4 left-4 z-50 bg-black/80 text-white text-xs p-2 rounded font-mono">
                  <div>Renders: {performanceMetrics.renderCount}</div>
                  <div>Page: {currentPage}</div>
                  <div>Connection: {connectionStatus}</div>
                  <div>Tasks: {tasks.tasks.length}</div>
                  <div>Widgets: {dashboard.activeDashboard?.widgets?.length || 0}</div>
                </div>
              )}
            </main>
          </AppShell>

          {/* Notification Center */}
          <NotificationCenter 
            position="top-right"
            maxNotifications={5}
            groupSimilar={true}
          />

          {/* Enhanced Modal System */}
          <AnimatePresence>
            {activeModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => {
                  useUIStore.getState().closeModal();
                }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal content will be rendered here based on activeModal */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 
                        id="modal-title"
                        className="text-xl font-semibold text-gray-900 dark:text-gray-100"
                      >
                        {activeModal}
                      </h2>
                      <button
                        onClick={() => useUIStore.getState().closeModal()}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        aria-label="Close modal"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                      Modal content for {activeModal}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </WebSocketProvider>
      </div>
    </AccessibilityProvider>
  );
};

export const App: React.FC<AppProps> = ({ 
  initialUser, 
  initialTheme = 'dark',
  queryClient: customQueryClient 
}) => {
  const appQueryClient = customQueryClient || queryClient;

  // Global error handler
  const handleGlobalError = useCallback((error: Error, errorInfo: any) => {
    console.error('App-level error:', error, errorInfo);
    
    // Report to production monitoring
    const monitor = getProductionMonitor();
    monitor.trackError(error, {
      context: 'app_error_boundary',
      user: initialUser,
      theme: initialTheme,
      errorInfo,
    });

    // Show user-friendly error notification
    useUIStore.getState().addNotification({
      type: 'error',
      title: 'Application Error',
      message: 'An unexpected error occurred. The development team has been notified.',
      persistent: true,
      actions: [
        {
          label: 'Reload App',
          onClick: () => window.location.reload(),
        },
        {
          label: 'Report Issue',
          onClick: () => {
            // Open issue reporting
            window.open('https://github.com/your-repo/issues/new', '_blank');
          },
        },
      ],
    });
  }, [initialUser, initialTheme]);

  return (
    <QueryClientProvider client={appQueryClient}>
      <ThemeProvider defaultTheme={initialTheme}>
        <AuthProvider initialUser={initialUser}>
          <ErrorBoundary
            FallbackComponent={ErrorFallback}
            onError={handleGlobalError}
            onReset={() => {
              // Clear all stores and reset to initial state
              useUIStore.getState().clearErrors();
              useDataStore.getState().clearAllData();
              window.location.reload();
            }}
          >
            <AppContent />
          </ErrorBoundary>
        </AuthProvider>
      </ThemeProvider>
      
      {/* Development Tools */}
      {process.env.NODE_ENV === 'development' && (
        <>
          <ReactQueryDevtools initialIsOpen={false} />
          {/* Add other development tools here */}
        </>
      )}
    </QueryClientProvider>
  );
};

export default App;