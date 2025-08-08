/**
 * Navigation System Exports
 * Central export file for all navigation components and utilities
 */

// Core navigation components
export { AdaptiveNavigation } from './AdaptiveNavigation';
export { EnhancedBreadcrumb } from './EnhancedBreadcrumb';
export { GlobalSearch } from './GlobalSearch';
export { CommandPalette } from './CommandPalette';

// Navigation controller and state management
export { 
  useNavigationStore,
  useCurrentRoute,
  useBreadcrumbs,
  useNavigationHistory,
  useSearchState,
  useCommandPalette,
  useNavigationPreferences,
  useNavigationContext,
} from './NavigationController';

// URL synchronization
export { 
  useURLSynchronization,
  useNavigationWithURLSync,
  URLUtils,
} from './URLSynchronization';

// Types
export type {
  NavigationContext,
  UserRole,
  NavigationAction,
  BreadcrumbItem,
  NavigationHistoryItem,
  NavigationPreferences,
  AdaptiveNavigationItem,
  NavigationCondition,
  SearchProvider,
  SearchResult,
  SearchSuggestion,
  SearchResultAction,
  SearchResultType,
  Command,
  CommandCategory,
  CommandPaletteState,
  NavigationState,
  SearchState,
  URLSyncConfig,
  URLState,
  NavigationEvent,
  NavigationEventType,
  KeyboardShortcut,
  KeyboardModifier,
  NavigationAnalytics,
  NavigationJourney,
  NavigationJourneyStep,
  NavigationPerformanceMetrics,
} from './types';

// Re-export existing navigation components for compatibility
export { Navigation } from '../Layout/Navigation';
export { Breadcrumb } from '../Layout/Breadcrumb';

// Navigation utilities
export const NavigationUtils = {
  // Generate breadcrumbs from route
  generateBreadcrumbsFromRoute: (route: string): BreadcrumbItem[] => {
    const segments = route.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];
    
    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      breadcrumbs.push({
        id: `breadcrumb-${index}`,
        label: segment.charAt(0).toUpperCase() + segment.slice(1),
        href: currentPath,
        clickable: index < segments.length - 1,
      });
    });
    
    return breadcrumbs;
  },

  // Check if route matches pattern
  matchRoute: (route: string, pattern: string): boolean => {
    const routeSegments = route.split('/').filter(Boolean);
    const patternSegments = pattern.split('/').filter(Boolean);
    
    if (routeSegments.length !== patternSegments.length) {
      return false;
    }
    
    return patternSegments.every((segment, index) => {
      if (segment.startsWith(':')) {
        return true; // Parameter segment matches anything
      }
      return segment === routeSegments[index];
    });
  },

  // Extract parameters from route
  extractRouteParams: (route: string, pattern: string): Record<string, string> => {
    const routeSegments = route.split('/').filter(Boolean);
    const patternSegments = pattern.split('/').filter(Boolean);
    const params: Record<string, string> = {};
    
    patternSegments.forEach((segment, index) => {
      if (segment.startsWith(':')) {
        const paramName = segment.slice(1);
        params[paramName] = routeSegments[index] || '';
      }
    });
    
    return params;
  },

  // Normalize route path
  normalizePath: (path: string): string => {
    return path
      .split('/')
      .filter(Boolean)
      .join('/')
      .replace(/\/+/g, '/');
  },

  // Check if user has permission for route
  hasRoutePermission: (route: string, userPermissions: string[]): boolean => {
    // Simple permission check - in a real app, this would be more sophisticated
    const routePermissions: Record<string, string[]> = {
      '/admin': ['admin.access'],
      '/team': ['team.view'],
      '/analytics': ['analytics.view'],
      '/settings': ['settings.manage'],
    };
    
    const requiredPermissions = routePermissions[route] || [];
    return requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );
  },
};