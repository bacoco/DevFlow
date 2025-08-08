/**
 * Responsive Design Utilities
 * Helper functions for responsive design and breakpoint management
 */

import { designTokens } from '../styles/design-tokens';
import { Breakpoint, ResponsiveValue } from '../types/design-system';

// Breakpoint values in pixels
export const breakpoints = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// Media query helpers
export const mediaQueries = {
  xs: `(min-width: ${breakpoints.xs}px)`,
  sm: `(min-width: ${breakpoints.sm}px)`,
  md: `(min-width: ${breakpoints.md}px)`,
  lg: `(min-width: ${breakpoints.lg}px)`,
  xl: `(min-width: ${breakpoints.xl}px)`,
  '2xl': `(min-width: ${breakpoints['2xl']}px)`,
  
  // Max width queries
  'max-xs': `(max-width: ${breakpoints.xs - 1}px)`,
  'max-sm': `(max-width: ${breakpoints.sm - 1}px)`,
  'max-md': `(max-width: ${breakpoints.md - 1}px)`,
  'max-lg': `(max-width: ${breakpoints.lg - 1}px)`,
  'max-xl': `(max-width: ${breakpoints.xl - 1}px)`,
  'max-2xl': `(max-width: ${breakpoints['2xl'] - 1}px)`,
  
  // Range queries
  'sm-md': `(min-width: ${breakpoints.sm}px) and (max-width: ${breakpoints.md - 1}px)`,
  'md-lg': `(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  'lg-xl': `(min-width: ${breakpoints.lg}px) and (max-width: ${breakpoints.xl - 1}px)`,
  'xl-2xl': `(min-width: ${breakpoints.xl}px) and (max-width: ${breakpoints['2xl'] - 1}px)`,
} as const;

// Hook for checking if a media query matches
export function useMediaQuery(query: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const mediaQuery = window.matchMedia(query);
  return mediaQuery.matches;
}

// Hook for getting current breakpoint
export function useBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'md';
  
  const width = window.innerWidth;
  
  if (width >= breakpoints['2xl']) return '2xl';
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  if (width >= breakpoints.sm) return 'sm';
  return 'xs';
}

// Check if current viewport is mobile
export function isMobile(): boolean {
  return useMediaQuery(mediaQueries['max-md']);
}

// Check if current viewport is tablet
export function isTablet(): boolean {
  return useMediaQuery(mediaQueries['md-lg']);
}

// Check if current viewport is desktop
export function isDesktop(): boolean {
  return useMediaQuery(mediaQueries.lg);
}

// Resolve responsive value based on current breakpoint
export function resolveResponsiveValue<T>(
  value: ResponsiveValue<T> | T,
  currentBreakpoint?: Breakpoint
): T {
  if (typeof value !== 'object' || value === null) {
    return value as T;
  }
  
  const bp = currentBreakpoint || useBreakpoint();
  const responsiveValue = value as ResponsiveValue<T>;
  
  // Priority order: current breakpoint -> smaller breakpoints -> default
  const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = breakpointOrder.indexOf(bp);
  
  // Check current and smaller breakpoints
  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const breakpoint = breakpointOrder[i];
    if (responsiveValue[breakpoint] !== undefined) {
      return responsiveValue[breakpoint]!;
    }
  }
  
  // Fallback to the smallest available value
  for (const breakpoint of breakpointOrder.reverse()) {
    if (responsiveValue[breakpoint] !== undefined) {
      return responsiveValue[breakpoint]!;
    }
  }
  
  // This should never happen, but return undefined as fallback
  return undefined as T;
}

// Generate responsive CSS classes
export function generateResponsiveClasses(
  baseClass: string,
  value: ResponsiveValue<string> | string
): string {
  if (typeof value === 'string') {
    return `${baseClass}-${value}`;
  }
  
  const classes: string[] = [];
  
  Object.entries(value).forEach(([breakpoint, val]) => {
    if (val !== undefined) {
      const prefix = breakpoint === 'xs' ? '' : `${breakpoint}:`;
      classes.push(`${prefix}${baseClass}-${val}`);
    }
  });
  
  return classes.join(' ');
}

// Container width utilities
export const containerWidths = {
  xs: '100%',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Grid utilities
export const gridCols = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  7: 'grid-cols-7',
  8: 'grid-cols-8',
  9: 'grid-cols-9',
  10: 'grid-cols-10',
  11: 'grid-cols-11',
  12: 'grid-cols-12',
} as const;

// Responsive grid helper
export function getResponsiveGridCols(cols: ResponsiveValue<keyof typeof gridCols>): string {
  return generateResponsiveClasses('grid-cols', cols);
}

// Spacing utilities
export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  32: '8rem',
} as const;

// Responsive spacing helper
export function getResponsiveSpacing(
  property: 'p' | 'm' | 'px' | 'py' | 'pt' | 'pb' | 'pl' | 'pr' | 'mx' | 'my' | 'mt' | 'mb' | 'ml' | 'mr',
  value: ResponsiveValue<keyof typeof spacing>
): string {
  return generateResponsiveClasses(property, value);
}

// Typography utilities
export const textSizes = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
  '5xl': 'text-5xl',
  '6xl': 'text-6xl',
} as const;

// Responsive text size helper
export function getResponsiveTextSize(size: ResponsiveValue<keyof typeof textSizes>): string {
  return generateResponsiveClasses('text', size);
}

// Flexbox utilities
export const flexDirections = {
  row: 'flex-row',
  'row-reverse': 'flex-row-reverse',
  col: 'flex-col',
  'col-reverse': 'flex-col-reverse',
} as const;

export const justifyContent = {
  start: 'justify-start',
  end: 'justify-end',
  center: 'justify-center',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
} as const;

export const alignItems = {
  start: 'items-start',
  end: 'items-end',
  center: 'items-center',
  baseline: 'items-baseline',
  stretch: 'items-stretch',
} as const;

// Device detection utilities
export const deviceTypes = {
  mobile: 'max-md',
  tablet: 'md:max-lg',
  desktop: 'lg',
} as const;

// Responsive visibility utilities
export function hideOn(breakpoint: Breakpoint): string {
  return `${breakpoint}:hidden`;
}

export function showOn(breakpoint: Breakpoint): string {
  return `hidden ${breakpoint}:block`;
}

// Safe area utilities for mobile devices
export const safeAreaClasses = {
  top: 'safe-top',
  bottom: 'safe-bottom',
  left: 'safe-left',
  right: 'safe-right',
  x: 'safe-left safe-right',
  y: 'safe-top safe-bottom',
  all: 'safe-top safe-bottom safe-left safe-right',
} as const;

// Aspect ratio utilities
export const aspectRatios = {
  square: 'aspect-square',
  video: 'aspect-video',
  '4/3': 'aspect-[4/3]',
  '3/2': 'aspect-[3/2]',
  '16/9': 'aspect-[16/9]',
  '21/9': 'aspect-[21/9]',
} as const;

// Export all utilities
export {
  designTokens,
  type Breakpoint,
  type ResponsiveValue,
};