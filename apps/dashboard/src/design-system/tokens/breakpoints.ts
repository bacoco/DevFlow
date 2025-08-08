/**
 * Design System Breakpoint Tokens
 * Mobile-first responsive breakpoint system with device-specific optimizations
 */

// Base breakpoint values (in pixels)
export const breakpointValues = {
  xs: 0,      // Extra small devices (phones)
  sm: 640,    // Small devices (large phones)
  md: 768,    // Medium devices (tablets)
  lg: 1024,   // Large devices (laptops)
  xl: 1280,   // Extra large devices (desktops)
  '2xl': 1536, // 2X large devices (large desktops)
} as const;

// Breakpoint ranges for specific targeting
export const breakpointRanges = {
  'xs-only': { min: breakpointValues.xs, max: breakpointValues.sm - 1 },
  'sm-only': { min: breakpointValues.sm, max: breakpointValues.md - 1 },
  'md-only': { min: breakpointValues.md, max: breakpointValues.lg - 1 },
  'lg-only': { min: breakpointValues.lg, max: breakpointValues.xl - 1 },
  'xl-only': { min: breakpointValues.xl, max: breakpointValues['2xl'] - 1 },
  '2xl-only': { min: breakpointValues['2xl'], max: Infinity },
  
  // Range combinations
  'xs-sm': { min: breakpointValues.xs, max: breakpointValues.md - 1 },
  'sm-md': { min: breakpointValues.sm, max: breakpointValues.lg - 1 },
  'md-lg': { min: breakpointValues.md, max: breakpointValues.xl - 1 },
  'lg-xl': { min: breakpointValues.lg, max: breakpointValues['2xl'] - 1 },
  'xl-2xl': { min: breakpointValues.xl, max: Infinity },
} as const;

// Device-specific breakpoints
export const deviceBreakpoints = {
  mobile: {
    portrait: { min: 0, max: 479 },
    landscape: { min: 480, max: 767 },
  },
  tablet: {
    portrait: { min: 768, max: 1023 },
    landscape: { min: 1024, max: 1279 },
  },
  desktop: {
    small: { min: 1280, max: 1439 },
    medium: { min: 1440, max: 1919 },
    large: { min: 1920, max: Infinity },
  },
} as const;

// Grid system configuration per breakpoint
export const gridSystem = {
  xs: {
    columns: 4,
    gutters: 16,
    margins: 16,
    maxWidth: null,
  },
  sm: {
    columns: 8,
    gutters: 20,
    margins: 24,
    maxWidth: null,
  },
  md: {
    columns: 12,
    gutters: 24,
    margins: 32,
    maxWidth: null,
  },
  lg: {
    columns: 12,
    gutters: 32,
    margins: 40,
    maxWidth: 1200,
  },
  xl: {
    columns: 12,
    gutters: 32,
    margins: 48,
    maxWidth: 1400,
  },
  '2xl': {
    columns: 12,
    gutters: 40,
    margins: 64,
    maxWidth: 1600,
  },
} as const;

// Media query generators
export const mediaQueries = {
  // Min-width queries (mobile-first)
  up: (breakpoint: keyof typeof breakpointValues) => 
    `@media (min-width: ${breakpointValues[breakpoint]}px)`,
  
  // Max-width queries
  down: (breakpoint: keyof typeof breakpointValues) => 
    `@media (max-width: ${breakpointValues[breakpoint] - 1}px)`,
  
  // Between two breakpoints
  between: (min: keyof typeof breakpointValues, max: keyof typeof breakpointValues) => 
    `@media (min-width: ${breakpointValues[min]}px) and (max-width: ${breakpointValues[max] - 1}px)`,
  
  // Only specific breakpoint
  only: (breakpoint: keyof typeof breakpointRanges) => {
    const range = breakpointRanges[breakpoint];
    return range.max === Infinity 
      ? `@media (min-width: ${range.min}px)`
      : `@media (min-width: ${range.min}px) and (max-width: ${range.max}px)`;
  },
  
  // Device-specific queries
  mobile: {
    portrait: `@media (min-width: ${deviceBreakpoints.mobile.portrait.min}px) and (max-width: ${deviceBreakpoints.mobile.portrait.max}px) and (orientation: portrait)`,
    landscape: `@media (min-width: ${deviceBreakpoints.mobile.landscape.min}px) and (max-width: ${deviceBreakpoints.mobile.landscape.max}px) and (orientation: landscape)`,
    any: `@media (max-width: ${deviceBreakpoints.mobile.landscape.max}px)`,
  },
  tablet: {
    portrait: `@media (min-width: ${deviceBreakpoints.tablet.portrait.min}px) and (max-width: ${deviceBreakpoints.tablet.portrait.max}px) and (orientation: portrait)`,
    landscape: `@media (min-width: ${deviceBreakpoints.tablet.landscape.min}px) and (max-width: ${deviceBreakpoints.tablet.landscape.max}px) and (orientation: landscape)`,
    any: `@media (min-width: ${deviceBreakpoints.tablet.portrait.min}px) and (max-width: ${deviceBreakpoints.tablet.landscape.max}px)`,
  },
  desktop: {
    small: `@media (min-width: ${deviceBreakpoints.desktop.small.min}px) and (max-width: ${deviceBreakpoints.desktop.small.max}px)`,
    medium: `@media (min-width: ${deviceBreakpoints.desktop.medium.min}px) and (max-width: ${deviceBreakpoints.desktop.medium.max}px)`,
    large: `@media (min-width: ${deviceBreakpoints.desktop.large.min}px)`,
    any: `@media (min-width: ${deviceBreakpoints.desktop.small.min}px)`,
  },
  
  // Accessibility and preference queries
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
  highContrast: '@media (prefers-contrast: high)',
  darkMode: '@media (prefers-color-scheme: dark)',
  lightMode: '@media (prefers-color-scheme: light)',
  
  // Touch and interaction queries
  touch: '@media (hover: none) and (pointer: coarse)',
  hover: '@media (hover: hover) and (pointer: fine)',
  anyHover: '@media (any-hover: hover)',
  anyPointer: '@media (any-pointer: fine)',
} as const;

// Container queries (for component-level responsiveness)
export const containerQueries = {
  xs: '@container (min-width: 320px)',
  sm: '@container (min-width: 480px)',
  md: '@container (min-width: 640px)',
  lg: '@container (min-width: 768px)',
  xl: '@container (min-width: 1024px)',
  '2xl': '@container (min-width: 1280px)',
} as const;

// Responsive utilities
export const responsiveUtils = {
  // Get current breakpoint based on window width
  getCurrentBreakpoint: (width: number): keyof typeof breakpointValues => {
    if (width >= breakpointValues['2xl']) return '2xl';
    if (width >= breakpointValues.xl) return 'xl';
    if (width >= breakpointValues.lg) return 'lg';
    if (width >= breakpointValues.md) return 'md';
    if (width >= breakpointValues.sm) return 'sm';
    return 'xs';
  },
  
  // Check if current width matches breakpoint
  matchesBreakpoint: (width: number, breakpoint: keyof typeof breakpointValues): boolean => {
    return width >= breakpointValues[breakpoint];
  },
  
  // Get grid configuration for breakpoint
  getGridConfig: (breakpoint: keyof typeof breakpointValues) => {
    return gridSystem[breakpoint];
  },
  
  // Calculate responsive value based on breakpoint
  getResponsiveValue: <T>(
    values: Partial<Record<keyof typeof breakpointValues, T>>,
    currentBreakpoint: keyof typeof breakpointValues
  ): T | undefined => {
    // Find the largest breakpoint that has a value and is <= current breakpoint
    const breakpointOrder: (keyof typeof breakpointValues)[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
    const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
    
    for (let i = currentIndex; i >= 0; i--) {
      const bp = breakpointOrder[i];
      if (values[bp] !== undefined) {
        return values[bp];
      }
    }
    
    return undefined;
  },
} as const;

// Type definitions
export type Breakpoint = keyof typeof breakpointValues;
export type BreakpointRange = keyof typeof breakpointRanges;
export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type GridConfig = typeof gridSystem[Breakpoint];

// Responsive value type for component props
export type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>;

// Breakpoint context for React components
export interface BreakpointContext {
  current: Breakpoint;
  width: number;
  height: number;
  device: DeviceType;
  orientation: 'portrait' | 'landscape';
  isTouch: boolean;
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
}