/**
 * Design System Spacing Tokens
 * Provides consistent spacing scale for margins, padding, and layout
 */

// Base spacing scale (in rem units)
export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem',     // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem',    // 12px
  3.5: '0.875rem', // 14px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  7: '1.75rem',    // 28px
  8: '2rem',       // 32px
  9: '2.25rem',    // 36px
  10: '2.5rem',    // 40px
  11: '2.75rem',   // 44px
  12: '3rem',      // 48px
  14: '3.5rem',    // 56px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
  28: '7rem',      // 112px
  32: '8rem',      // 128px
  36: '9rem',      // 144px
  40: '10rem',     // 160px
  44: '11rem',     // 176px
  48: '12rem',     // 192px
  52: '13rem',     // 208px
  56: '14rem',     // 224px
  60: '15rem',     // 240px
  64: '16rem',     // 256px
  72: '18rem',     // 288px
  80: '20rem',     // 320px
  96: '24rem',     // 384px
} as const;

// Semantic spacing for common use cases
export const semanticSpacing = {
  // Component internal spacing
  component: {
    xs: spacing[1],    // 4px - tight spacing within components
    sm: spacing[2],    // 8px - small internal spacing
    md: spacing[4],    // 16px - default internal spacing
    lg: spacing[6],    // 24px - loose internal spacing
    xl: spacing[8],    // 32px - extra loose internal spacing
  },

  // Layout spacing between components
  layout: {
    xs: spacing[2],    // 8px - tight layout spacing
    sm: spacing[4],    // 16px - small layout spacing
    md: spacing[6],    // 24px - default layout spacing
    lg: spacing[8],    // 32px - loose layout spacing
    xl: spacing[12],   // 48px - extra loose layout spacing
    '2xl': spacing[16], // 64px - section spacing
    '3xl': spacing[20], // 80px - major section spacing
  },

  // Container spacing
  container: {
    xs: spacing[4],    // 16px - mobile container padding
    sm: spacing[6],    // 24px - small container padding
    md: spacing[8],    // 32px - default container padding
    lg: spacing[12],   // 48px - large container padding
    xl: spacing[16],   // 64px - extra large container padding
  },

  // Interactive element spacing
  interactive: {
    xs: spacing[1],    // 4px - tight interactive spacing
    sm: spacing[2],    // 8px - small interactive spacing
    md: spacing[3],    // 12px - default interactive spacing
    lg: spacing[4],    // 16px - loose interactive spacing
    xl: spacing[6],    // 24px - extra loose interactive spacing
  },
} as const;

// Grid and layout spacing
export const gridSpacing = {
  // Grid gaps
  gap: {
    xs: spacing[1],    // 4px
    sm: spacing[2],    // 8px
    md: spacing[4],    // 16px
    lg: spacing[6],    // 24px
    xl: spacing[8],    // 32px
  },

  // Column spacing
  column: {
    xs: spacing[2],    // 8px
    sm: spacing[4],    // 16px
    md: spacing[6],    // 24px
    lg: spacing[8],    // 32px
    xl: spacing[12],   // 48px
  },

  // Row spacing
  row: {
    xs: spacing[2],    // 8px
    sm: spacing[4],    // 16px
    md: spacing[6],    // 24px
    lg: spacing[8],    // 32px
    xl: spacing[12],   // 48px
  },
} as const;

// Responsive spacing utilities
export const responsiveSpacing = {
  // Mobile spacing (smaller values)
  mobile: {
    container: semanticSpacing.container.xs,
    layout: semanticSpacing.layout.sm,
    component: semanticSpacing.component.sm,
  },

  // Tablet spacing (medium values)
  tablet: {
    container: semanticSpacing.container.sm,
    layout: semanticSpacing.layout.md,
    component: semanticSpacing.component.md,
  },

  // Desktop spacing (larger values)
  desktop: {
    container: semanticSpacing.container.md,
    layout: semanticSpacing.layout.lg,
    component: semanticSpacing.component.lg,
  },

  // Large desktop spacing (largest values)
  largeDesktop: {
    container: semanticSpacing.container.lg,
    layout: semanticSpacing.layout.xl,
    component: semanticSpacing.component.xl,
  },
} as const;

// Border radius values
export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',   // Fully rounded
} as const;

// Shadow spacing (for consistent shadow offsets)
export const shadowSpacing = {
  xs: {
    x: '0',
    y: spacing[1],    // 4px
    blur: spacing[2], // 8px
  },
  sm: {
    x: '0',
    y: spacing[1],    // 4px
    blur: spacing[3], // 12px
  },
  md: {
    x: '0',
    y: spacing[2],    // 8px
    blur: spacing[4], // 16px
  },
  lg: {
    x: '0',
    y: spacing[4],    // 16px
    blur: spacing[6], // 24px
  },
  xl: {
    x: '0',
    y: spacing[6],    // 24px
    blur: spacing[8], // 32px
  },
} as const;

// Type definitions
export type Spacing = keyof typeof spacing;
export type SemanticSpacing = keyof typeof semanticSpacing;
export type GridSpacing = keyof typeof gridSpacing;
export type BorderRadius = keyof typeof borderRadius;
export type ShadowSpacing = keyof typeof shadowSpacing;