/**
 * URL Synchronization Service
 * Manages URL state synchronization with navigation state
 */

import { useEffect, useCallback } from 'react';
import { useNavigationStore } from './NavigationController';
import { URLState, URLSyncConfig, BreadcrumbItem } from './types';

interface URLSynchronizationProps {
  config?: Partial<URLSyncConfig>;
  onURLChange?: (urlState: URLState) => void;
}

const defaultConfig: URLSyncConfig = {
  syncBreadcrumbs: true,
  syncSearchQuery: true,
  syncFilters: false,
  syncViewState: false,
  debounceMs: 300,
};

export const useURLSynchronization = ({
  config = {},
  onURLChange,
}: URLSynchronizationProps = {}) => {
  const finalConfig = { ...defaultConfig, ...config };
  const { 
    currentRoute, 
    breadcrumbs, 
    searchState, 
    syncWithURL, 
    getURLState,
    navigateTo,
    updateBreadcrumbs,
  } = useNavigationStore();

  // Parse URL parameters
  const parseURL = useCallback((url: string): URLState => {
    try {
      const urlObj = new URL(url, window.location.origin);
      const params: Record<string, string> = {};
      const query: Record<string, string> = {};
      
      // Extract path parameters (for routes like /user/:id)
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
      pathSegments.forEach((segment, index) => {
        if (segment.startsWith(':')) {
          params[segment.slice(1)] = pathSegments[index] || '';
        }
      });
      
      // Extract query parameters
      urlObj.searchParams.forEach((value, key) => {
        query[key] = value;
      });
      
      return {
        route: urlObj.pathname,
        params,
        query,
        hash: urlObj.hash ? urlObj.hash.slice(1) : undefined,
        state: history.state,
      };
    } catch (error) {
      console.warn('Failed to parse URL:', error);
      return {
        route: '/',
        params: {},
        query: {},
      };
    }
  }, []);

  // Build URL from state
  const buildURL = useCallback((urlState: URLState): string => {
    const url = new URL(urlState.route, window.location.origin);
    
    // Add query parameters
    Object.entries(urlState.query).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });
    
    // Add hash
    if (urlState.hash) {
      url.hash = urlState.hash;
    }
    
    return url.toString();
  }, []);

  // Sync navigation state to URL
  const syncStateToURL = useCallback(() => {
    const currentURLState = getURLState();
    const newQuery = { ...currentURLState.query };
    
    // Sync search query
    if (finalConfig.syncSearchQuery && searchState.query) {
      newQuery.search = searchState.query;
    } else if (finalConfig.syncSearchQuery && !searchState.query) {
      delete newQuery.search;
    }
    
    // Sync breadcrumbs (as a path parameter)
    if (finalConfig.syncBreadcrumbs && breadcrumbs.length > 0) {
      const breadcrumbPath = breadcrumbs
        .filter(b => b.href)
        .map(b => encodeURIComponent(b.label))
        .join('/');
      if (breadcrumbPath) {
        newQuery.breadcrumbs = breadcrumbPath;
      }
    }
    
    const newURLState: URLState = {
      ...currentURLState,
      query: newQuery,
    };
    
    const newURL = buildURL(newURLState);
    const currentURL = window.location.href;
    
    if (newURL !== currentURL) {
      window.history.replaceState(newURLState.state, '', newURL);
      onURLChange?.(newURLState);
    }
  }, [
    finalConfig,
    searchState.query,
    breadcrumbs,
    getURLState,
    buildURL,
    onURLChange,
  ]);

  // Sync URL to navigation state
  const syncURLToState = useCallback((url?: string) => {
    const urlToSync = url || window.location.href;
    const urlState = parseURL(urlToSync);
    
    // Sync route
    if (urlState.route !== currentRoute) {
      syncWithURL(urlState);
    }
    
    // Sync search query
    if (finalConfig.syncSearchQuery && urlState.query.search) {
      // This would trigger search in the navigation store
      // For now, we'll just log it
      console.log('Sync search query from URL:', urlState.query.search);
    }
    
    // Sync breadcrumbs
    if (finalConfig.syncBreadcrumbs && urlState.query.breadcrumbs) {
      try {
        const breadcrumbLabels = urlState.query.breadcrumbs
          .split('/')
          .map(label => decodeURIComponent(label));
        
        const reconstructedBreadcrumbs: BreadcrumbItem[] = breadcrumbLabels.map((label, index) => ({
          id: `breadcrumb-${index}`,
          label,
          href: index === breadcrumbLabels.length - 1 ? undefined : `/${breadcrumbLabels.slice(0, index + 1).join('/')}`,
          clickable: index < breadcrumbLabels.length - 1,
        }));
        
        updateBreadcrumbs(reconstructedBreadcrumbs);
      } catch (error) {
        console.warn('Failed to sync breadcrumbs from URL:', error);
      }
    }
    
    onURLChange?.(urlState);
  }, [
    finalConfig,
    currentRoute,
    parseURL,
    syncWithURL,
    updateBreadcrumbs,
    onURLChange,
  ]);

  // Handle browser navigation (back/forward)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      syncURLToState();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [syncURLToState]);

  // Debounced sync state to URL
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      syncStateToURL();
    }, finalConfig.debounceMs);

    return () => clearTimeout(timeoutId);
  }, [syncStateToURL, finalConfig.debounceMs]);

  // Initial sync on mount
  useEffect(() => {
    syncURLToState();
  }, []);

  return {
    syncStateToURL,
    syncURLToState,
    parseURL,
    buildURL,
    getCurrentURLState: () => parseURL(window.location.href),
  };
};

// Hook for programmatic navigation with URL sync
export const useNavigationWithURLSync = () => {
  const { navigateTo: baseNavigateTo } = useNavigationStore();
  const { syncStateToURL } = useURLSynchronization();

  const navigateTo = useCallback((
    route: string, 
    options?: { 
      replace?: boolean; 
      state?: any; 
      query?: Record<string, string>;
      hash?: string;
    }
  ) => {
    // Build full URL with query and hash
    const url = new URL(route, window.location.origin);
    
    if (options?.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        if (value) {
          url.searchParams.set(key, value);
        }
      });
    }
    
    if (options?.hash) {
      url.hash = options.hash;
    }
    
    // Navigate using base navigation
    baseNavigateTo(url.pathname + url.search + url.hash, {
      replace: options?.replace,
      trackEvent: true,
    });
    
    // Update browser history
    const method = options?.replace ? 'replaceState' : 'pushState';
    window.history[method](options?.state || {}, '', url.toString());
    
    // Sync state to URL
    setTimeout(syncStateToURL, 0);
  }, [baseNavigateTo, syncStateToURL]);

  return { navigateTo };
};

// Utility functions for URL manipulation
export const URLUtils = {
  // Add query parameter to current URL
  addQueryParam: (key: string, value: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set(key, value);
    window.history.replaceState({}, '', url.toString());
  },

  // Remove query parameter from current URL
  removeQueryParam: (key: string) => {
    const url = new URL(window.location.href);
    url.searchParams.delete(key);
    window.history.replaceState({}, '', url.toString());
  },

  // Get query parameter value
  getQueryParam: (key: string): string | null => {
    const url = new URL(window.location.href);
    return url.searchParams.get(key);
  },

  // Update hash without triggering navigation
  updateHash: (hash: string) => {
    const url = new URL(window.location.href);
    url.hash = hash;
    window.history.replaceState({}, '', url.toString());
  },

  // Clear all query parameters
  clearQueryParams: () => {
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState({}, '', url.toString());
  },

  // Build URL with parameters
  buildURL: (
    path: string, 
    query?: Record<string, string>, 
    hash?: string
  ): string => {
    const url = new URL(path, window.location.origin);
    
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value) {
          url.searchParams.set(key, value);
        }
      });
    }
    
    if (hash) {
      url.hash = hash;
    }
    
    return url.toString();
  },
};