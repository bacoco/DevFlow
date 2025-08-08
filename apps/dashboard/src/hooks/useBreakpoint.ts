/**
 * Breakpoint Hook
 * React hook for responsive breakpoint detection and container queries
 */

import { useState, useEffect } from 'react';
import { designTokens } from '../styles/design-tokens';

export type Breakpoint = keyof typeof designTokens.screens;

export interface BreakpointState {
  current: Breakpoint;
  isXs: boolean;
  isSm: boolean;
  isMd: boolean;
  isLg: boolean;
  isXl: boolean;
  is2Xl: boolean;
  isAbove: (breakpoint: Breakpoint) => boolean;
  isBelow: (breakpoint: Breakpoint) => boolean;
}

const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];

const getBreakpointValue = (breakpoint: Breakpoint): number => {
  return parseInt(designTokens.screens[breakpoint].replace('px', ''));
};

const getCurrentBreakpoint = (width: number): Breakpoint => {
  // Check from largest to smallest
  const breakpoints = [...breakpointOrder].reverse();
  
  for (const breakpoint of breakpoints) {
    if (width >= getBreakpointValue(breakpoint)) {
      return breakpoint;
    }
  }
  
  return 'xs';
};

export const useBreakpoint = (): BreakpointState => {
  const [windowWidth, setWindowWidth] = useState<number>(() => {
    // Check if we're in browser environment
    if (typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return 0;
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    // Set initial width if not already set
    if (windowWidth === 0 && typeof window !== 'undefined') {
      setWindowWidth(window.innerWidth);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [windowWidth]);

  const current = getCurrentBreakpoint(windowWidth);

  const isAbove = (breakpoint: Breakpoint): boolean => {
    const currentIndex = breakpointOrder.indexOf(current);
    const targetIndex = breakpointOrder.indexOf(breakpoint);
    return currentIndex > targetIndex;
  };

  const isBelow = (breakpoint: Breakpoint): boolean => {
    const currentIndex = breakpointOrder.indexOf(current);
    const targetIndex = breakpointOrder.indexOf(breakpoint);
    return currentIndex < targetIndex;
  };

  return {
    current,
    isXs: current === 'xs',
    isSm: current === 'sm',
    isMd: current === 'md',
    isLg: current === 'lg',
    isXl: current === 'xl',
    is2Xl: current === '2xl',
    isAbove,
    isBelow,
  };
};

/**
 * Hook for container-based breakpoints
 * Uses ResizeObserver to detect container size changes
 */
export const useContainerBreakpoint = (
  containerRef: React.RefObject<HTMLElement>,
  breakpoints: Record<string, number> = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  }
) => {
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('xs');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setContainerWidth(width);

        // Determine current breakpoint
        const breakpointEntries = Object.entries(breakpoints).sort(
          ([, a], [, b]) => b - a
        );

        let newBreakpoint = 'xs';
        for (const [name, value] of breakpointEntries) {
          if (width >= value) {
            newBreakpoint = name;
            break;
          }
        }

        setCurrentBreakpoint(newBreakpoint);
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef, breakpoints]);

  const isAbove = (breakpoint: string): boolean => {
    const currentValue = breakpoints[currentBreakpoint] || 0;
    const targetValue = breakpoints[breakpoint] || 0;
    return currentValue > targetValue;
  };

  const isBelow = (breakpoint: string): boolean => {
    const currentValue = breakpoints[currentBreakpoint] || 0;
    const targetValue = breakpoints[breakpoint] || 0;
    return currentValue < targetValue;
  };

  return {
    containerWidth,
    current: currentBreakpoint,
    isAbove,
    isBelow,
  };
};