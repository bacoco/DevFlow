/**
 * Lazy Routes Component
 * Handles lazy loading of page components with proper error boundaries
 */

import React, { lazy, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { LoadingScreen } from '../ui/LoadingScreen';
import { ErrorFallback } from '../ErrorBoundary/ErrorFallback';
import { BreadcrumbItem } from './Breadcrumb';

// Lazy load page components
const DashboardPage = lazy(() => import('../../pages/index'));
const TasksPage = lazy(() => import('../../pages/tasks'));
const AuthPage = lazy(() => import('../../pages/auth'));
const DemoPage = lazy(() => import('../../pages/demo'));

// Placeholder components for pages that don't exist yet
const AnalyticsPage = lazy(() => Promise.resolve({ 
  default: () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Analytics</h1>
      <p className="text-gray-600 dark:text-gray-400">Analytics page coming soon...</p>
    </div>
  )
}));

const TeamPage = lazy(() => Promise.resolve({ 
  default: () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Team</h1>
      <p className="text-gray-600 dark:text-gray-400">Team page coming soon...</p>
    </div>
  )
}));

const SettingsPage = lazy(() => Promise.resolve({ 
  default: () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Settings</h1>
      <p className="text-gray-600 dark:text-gray-400">Settings page coming soon...</p>
    </div>
  )
}));

const ProfilePage = lazy(() => Promise.resolve({ 
  default: () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Profile</h1>
      <p className="text-gray-600 dark:text-gray-400">Profile page coming soon...</p>
    </div>
  )
}));

const SearchPage = lazy(() => Promise.resolve({ 
  default: () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Search Results</h1>
      <p className="text-gray-600 dark:text-gray-400">Search functionality coming soon...</p>
    </div>
  )
}));

interface LazyRoutesProps {
  currentPage: string;
  onPageChange: (page: string, breadcrumbs?: BreadcrumbItem[]) => void;
}

export const LazyRoutes: React.FC<LazyRoutesProps> = ({ 
  currentPage, 
  onPageChange 
}) => {
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <ErrorBoundary
            FallbackComponent={ErrorFallback}
            onReset={() => onPageChange('dashboard')}
          >
            <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
              <DashboardPage />
            </Suspense>
          </ErrorBoundary>
        );

      case 'tasks':
        return (
          <ErrorBoundary
            FallbackComponent={ErrorFallback}
            onReset={() => onPageChange('dashboard')}
          >
            <Suspense fallback={<LoadingScreen message="Loading tasks..." />}>
              <TasksPage />
            </Suspense>
          </ErrorBoundary>
        );

      case 'analytics':
        return (
          <ErrorBoundary
            FallbackComponent={ErrorFallback}
            onReset={() => onPageChange('dashboard')}
          >
            <Suspense fallback={<LoadingScreen message="Loading analytics..." />}>
              <AnalyticsPage />
            </Suspense>
          </ErrorBoundary>
        );

      case 'team':
        return (
          <ErrorBoundary
            FallbackComponent={ErrorFallback}
            onReset={() => onPageChange('dashboard')}
          >
            <Suspense fallback={<LoadingScreen message="Loading team view..." />}>
              <TeamPage />
            </Suspense>
          </ErrorBoundary>
        );

      case 'settings':
        return (
          <ErrorBoundary
            FallbackComponent={ErrorFallback}
            onReset={() => onPageChange('dashboard')}
          >
            <Suspense fallback={<LoadingScreen message="Loading settings..." />}>
              <SettingsPage />
            </Suspense>
          </ErrorBoundary>
        );

      case 'profile':
        return (
          <ErrorBoundary
            FallbackComponent={ErrorFallback}
            onReset={() => onPageChange('dashboard')}
          >
            <Suspense fallback={<LoadingScreen message="Loading profile..." />}>
              <ProfilePage />
            </Suspense>
          </ErrorBoundary>
        );

      case 'search':
        return (
          <ErrorBoundary
            FallbackComponent={ErrorFallback}
            onReset={() => onPageChange('dashboard')}
          >
            <Suspense fallback={<LoadingScreen message="Loading search results..." />}>
              <SearchPage />
            </Suspense>
          </ErrorBoundary>
        );

      case 'auth':
        return (
          <ErrorBoundary
            FallbackComponent={ErrorFallback}
            onReset={() => onPageChange('dashboard')}
          >
            <Suspense fallback={<LoadingScreen message="Loading authentication..." />}>
              <AuthPage />
            </Suspense>
          </ErrorBoundary>
        );

      case 'demo':
        return (
          <ErrorBoundary
            FallbackComponent={ErrorFallback}
            onReset={() => onPageChange('dashboard')}
          >
            <Suspense fallback={<LoadingScreen message="Loading demo..." />}>
              <DemoPage />
            </Suspense>
          </ErrorBoundary>
        );

      default:
        return (
          <ErrorBoundary
            FallbackComponent={ErrorFallback}
            onReset={() => onPageChange('dashboard')}
          >
            <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
              <DashboardPage />
            </Suspense>
          </ErrorBoundary>
        );
    }
  };

  return (
    <div className="h-full">
      {renderPage()}
    </div>
  );
};

// Route preloading utility
export const preloadRoutes = {
  dashboard: () => import('../../pages/index'),
  tasks: () => import('../../pages/tasks'),
  auth: () => import('../../pages/auth'),
  demo: () => import('../../pages/demo'),
};

// Hook for route preloading on hover/focus
export const useRoutePreloader = () => {
  const preloadRoute = (routeName: keyof typeof preloadRoutes) => {
    if (preloadRoutes[routeName]) {
      preloadRoutes[routeName]().catch(error => {
        console.warn(`Failed to preload route ${routeName}:`, error);
      });
    }
  };

  return { preloadRoute };
};

// Component for preloading routes on user interaction
export const RoutePreloader: React.FC<{
  route: keyof typeof preloadRoutes;
  children: React.ReactElement;
  trigger?: 'hover' | 'focus' | 'both';
}> = ({ route, children, trigger = 'both' }) => {
  const { preloadRoute } = useRoutePreloader();

  const handlePreload = () => {
    preloadRoute(route);
  };

  const props: any = {};
  
  if (trigger === 'hover' || trigger === 'both') {
    props.onMouseEnter = handlePreload;
  }
  
  if (trigger === 'focus' || trigger === 'both') {
    props.onFocus = handlePreload;
  }

  return React.cloneElement(children, props);
};

export default LazyRoutes;