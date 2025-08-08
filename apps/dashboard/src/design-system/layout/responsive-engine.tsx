/**
 * Responsive Layout Engine
 * Provides React hooks and utilities for responsive behavior
 */

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  breakpointValues, 
  responsiveUtils, 
  type Breakpoint, 
  type BreakpointContext, 
  type DeviceType,
  type ResponsiveValue 
} from '../tokens/breakpoints';

// Responsive context
const ResponsiveContext = createContext<BreakpointContext | undefined>(undefined);

// Debounce utility for resize events
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Get device type based on breakpoint
function getDeviceType(breakpoint: Breakpoint): DeviceType {
  if (breakpoint === 'xs' || breakpoint === 'sm') return 'mobile';
  if (breakpoint === 'md') return 'tablet';
  return 'desktop';
}

// Responsive provider component
export interface ResponsiveProviderProps {
  children: ReactNode;
  debounceMs?: number;
}

export function ResponsiveProvider({ children, debounceMs = 150 }: ResponsiveProviderProps) {
  // Initialize with default dimensions for SSR and tests
  const getInitialDimensions = () => {
    if (typeof window === 'undefined') {
      return { width: 1024, height: 768 }; // SSR default
    }
    return {
      width: window.innerWidth || 1024,
      height: window.innerHeight || 768,
    };
  };

  const [dimensions, setDimensions] = useState(getInitialDimensions);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(() => {
    const initial = getInitialDimensions();
    return initial.height > initial.width ? 'portrait' : 'landscape';
  });
  const [isTouch, setIsTouch] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  // Debounce dimensions to avoid excessive re-renders
  const debouncedDimensions = useDebounce(dimensions, debounceMs);

  // Calculate current breakpoint and device info
  const current = responsiveUtils.getCurrentBreakpoint(debouncedDimensions.width);
  const device = getDeviceType(current);

  // Initialize dimensions and media queries
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateDimensions = () => {
      const width = window.innerWidth || 1024; // Default for tests
      const height = window.innerHeight || 768; // Default for tests
      setDimensions({ width, height });
      setOrientation(height > width ? 'portrait' : 'landscape');
    };

    const updateMediaQueries = () => {
      setIsTouch(window.matchMedia('(hover: none) and (pointer: coarse)').matches);
      setPrefersReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      setPrefersHighContrast(window.matchMedia('(prefers-contrast: high)').matches);
    };

    // Initial setup
    updateDimensions();
    updateMediaQueries();

    // Event listeners
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);

    // Media query listeners
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    const touchQuery = window.matchMedia('(hover: none) and (pointer: coarse)');

    const handleReducedMotionChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    const handleHighContrastChange = (e: MediaQueryListEvent) => setPrefersHighContrast(e.matches);
    const handleTouchChange = (e: MediaQueryListEvent) => setIsTouch(e.matches);

    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    highContrastQuery.addEventListener('change', handleHighContrastChange);
    touchQuery.addEventListener('change', handleTouchChange);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
      touchQuery.removeEventListener('change', handleTouchChange);
    };
  }, []);

  const contextValue: BreakpointContext = {
    current,
    width: debouncedDimensions.width,
    height: debouncedDimensions.height,
    device,
    orientation,
    isTouch,
    prefersReducedMotion,
    prefersHighContrast,
  };

  return (
    <ResponsiveContext.Provider value={contextValue}>
      {children}
    </ResponsiveContext.Provider>
  );
}

// Hook to use responsive context
export function useResponsive(): BreakpointContext {
  const context = useContext(ResponsiveContext);
  if (context === undefined) {
    throw new Error('useResponsive must be used within a ResponsiveProvider');
  }
  return context;
}

// Hook to get current breakpoint
export function useBreakpoint(): Breakpoint {
  const { current } = useResponsive();
  return current;
}

// Hook to check if current breakpoint matches or exceeds given breakpoint
export function useBreakpointUp(breakpoint: Breakpoint): boolean {
  const { width } = useResponsive();
  return responsiveUtils.matchesBreakpoint(width, breakpoint);
}

// Hook to check if current breakpoint is below given breakpoint
export function useBreakpointDown(breakpoint: Breakpoint): boolean {
  const { width } = useResponsive();
  return width < breakpointValues[breakpoint];
}

// Hook to check if current breakpoint is between two breakpoints
export function useBreakpointBetween(min: Breakpoint, max: Breakpoint): boolean {
  const { width } = useResponsive();
  return width >= breakpointValues[min] && width < breakpointValues[max];
}

// Hook to get responsive value based on current breakpoint
export function useResponsiveValue<T>(values: ResponsiveValue<T>): T {
  const { current } = useResponsive();
  
  if (typeof values !== 'object' || values === null) {
    return values as T;
  }
  
  const responsiveValues = values as Partial<Record<Breakpoint, T>>;
  const resolvedValue = responsiveUtils.getResponsiveValue(responsiveValues, current);
  
  if (resolvedValue !== undefined) {
    return resolvedValue;
  }
  
  // Fallback to first available value
  const firstValue = Object.values(responsiveValues)[0];
  return firstValue as T;
}

// Hook to check device type
export function useDeviceType(): DeviceType {
  const { device } = useResponsive();
  return device;
}

// Hook to check if mobile device
export function useIsMobile(): boolean {
  const device = useDeviceType();
  return device === 'mobile';
}

// Hook to check if tablet device
export function useIsTablet(): boolean {
  const device = useDeviceType();
  return device === 'tablet';
}

// Hook to check if desktop device
export function useIsDesktop(): boolean {
  const device = useDeviceType();
  return device === 'desktop';
}

// Hook to get screen orientation
export function useOrientation(): 'portrait' | 'landscape' {
  const { orientation } = useResponsive();
  return orientation;
}

// Hook to check if touch device
export function useIsTouch(): boolean {
  const { isTouch } = useResponsive();
  return isTouch;
}

// Hook to check accessibility preferences
export function useAccessibilityPreferences() {
  const { prefersReducedMotion, prefersHighContrast } = useResponsive();
  return { prefersReducedMotion, prefersHighContrast };
}

// Hook for media query matching
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}

// Hook for container queries (requires container query support)
export function useContainerQuery(containerRef: React.RefObject<HTMLElement>, query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    // Fallback to ResizeObserver if container queries aren't supported
    if (!('container' in document.documentElement.style)) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width } = entry.contentRect;
          // Simple width-based matching for fallback
          const minWidth = parseInt(query.match(/min-width:\s*(\d+)px/)?.[1] || '0');
          setMatches(width >= minWidth);
        }
      });

      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }

    // Use container queries if supported
    const element = containerRef.current;
    element.style.containerType = 'inline-size';

    const checkQuery = () => {
      if (element && window.getComputedStyle) {
        // This is a simplified check - in practice, you'd use a proper container query polyfill
        const computedStyle = window.getComputedStyle(element);
        setMatches(computedStyle.containerType === 'inline-size');
      }
    };

    checkQuery();
    window.addEventListener('resize', checkQuery);
    return () => window.removeEventListener('resize', checkQuery);
  }, [containerRef, query]);

  return matches;
}

// Utility function to resolve responsive values outside of React
export function resolveResponsiveValue<T>(
  values: ResponsiveValue<T>,
  breakpoint: Breakpoint
): T {
  if (typeof values !== 'object' || values === null) {
    return values as T;
  }
  
  const responsiveValues = values as Partial<Record<Breakpoint, T>>;
  const resolvedValue = responsiveUtils.getResponsiveValue(responsiveValues, breakpoint);
  
  if (resolvedValue !== undefined) {
    return resolvedValue;
  }
  
  // Fallback to first available value
  const firstValue = Object.values(responsiveValues)[0];
  return firstValue as T;
}

// Server-side rendering utilities
export const ssrUtils = {
  // Default breakpoint for SSR
  defaultBreakpoint: 'lg' as Breakpoint,
  
  // Default context for SSR
  defaultContext: {
    current: 'lg' as Breakpoint,
    width: 1024,
    height: 768,
    device: 'desktop' as DeviceType,
    orientation: 'landscape' as const,
    isTouch: false,
    prefersReducedMotion: false,
    prefersHighContrast: false,
  } as BreakpointContext,
  
  // Resolve responsive value for SSR
  resolveForSSR: <T>(values: ResponsiveValue<T>): T => {
    return resolveResponsiveValue(values, ssrUtils.defaultBreakpoint);
  },
};