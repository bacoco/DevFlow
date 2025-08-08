/**
 * Design System Typography Tokens
 * Provides consistent typography scale and font definitions
 */

// Font families
export const fontFamilies = {
  sans: [
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Oxygen',
    'Ubuntu',
    'Cantarell',
    'sans-serif',
  ],
  mono: [
    'JetBrains Mono',
    'Fira Code',
    'Monaco',
    'Consolas',
    'Liberation Mono',
    'Courier New',
    'monospace',
  ],
} as const;

// Font weights
export const fontWeights = {
  thin: 100,
  extralight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
} as const;

// Font sizes with responsive scaling
export const fontSizes = {
  xs: {
    fontSize: '0.75rem', // 12px
    lineHeight: '1rem', // 16px
  },
  sm: {
    fontSize: '0.875rem', // 14px
    lineHeight: '1.25rem', // 20px
  },
  base: {
    fontSize: '1rem', // 16px
    lineHeight: '1.5rem', // 24px
  },
  lg: {
    fontSize: '1.125rem', // 18px
    lineHeight: '1.75rem', // 28px
  },
  xl: {
    fontSize: '1.25rem', // 20px
    lineHeight: '1.75rem', // 28px
  },
  '2xl': {
    fontSize: '1.5rem', // 24px
    lineHeight: '2rem', // 32px
  },
  '3xl': {
    fontSize: '1.875rem', // 30px
    lineHeight: '2.25rem', // 36px
  },
  '4xl': {
    fontSize: '2.25rem', // 36px
    lineHeight: '2.5rem', // 40px
  },
  '5xl': {
    fontSize: '3rem', // 48px
    lineHeight: '1',
  },
  '6xl': {
    fontSize: '3.75rem', // 60px
    lineHeight: '1',
  },
  '7xl': {
    fontSize: '4.5rem', // 72px
    lineHeight: '1',
  },
  '8xl': {
    fontSize: '6rem', // 96px
    lineHeight: '1',
  },
  '9xl': {
    fontSize: '8rem', // 128px
    lineHeight: '1',
  },
} as const;

// Letter spacing
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0em',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const;

// Typography variants for semantic use
export const typographyVariants = {
  // Display text
  display: {
    '2xl': {
      ...fontSizes['7xl'],
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacing.tight,
      fontFamily: fontFamilies.sans.join(', '),
    },
    xl: {
      ...fontSizes['6xl'],
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacing.tight,
      fontFamily: fontFamilies.sans.join(', '),
    },
    lg: {
      ...fontSizes['5xl'],
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacing.tight,
      fontFamily: fontFamilies.sans.join(', '),
    },
    md: {
      ...fontSizes['4xl'],
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacing.tight,
      fontFamily: fontFamilies.sans.join(', '),
    },
    sm: {
      ...fontSizes['3xl'],
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacing.tight,
      fontFamily: fontFamilies.sans.join(', '),
    },
  },

  // Headings
  heading: {
    h1: {
      ...fontSizes['3xl'],
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacing.tight,
      fontFamily: fontFamilies.sans.join(', '),
    },
    h2: {
      ...fontSizes['2xl'],
      fontWeight: fontWeights.semibold,
      letterSpacing: letterSpacing.tight,
      fontFamily: fontFamilies.sans.join(', '),
    },
    h3: {
      ...fontSizes.xl,
      fontWeight: fontWeights.semibold,
      letterSpacing: letterSpacing.normal,
      fontFamily: fontFamilies.sans.join(', '),
    },
    h4: {
      ...fontSizes.lg,
      fontWeight: fontWeights.semibold,
      letterSpacing: letterSpacing.normal,
      fontFamily: fontFamilies.sans.join(', '),
    },
    h5: {
      ...fontSizes.base,
      fontWeight: fontWeights.semibold,
      letterSpacing: letterSpacing.normal,
      fontFamily: fontFamilies.sans.join(', '),
    },
    h6: {
      ...fontSizes.sm,
      fontWeight: fontWeights.semibold,
      letterSpacing: letterSpacing.wide,
      fontFamily: fontFamilies.sans.join(', '),
    },
  },

  // Body text
  body: {
    lg: {
      ...fontSizes.lg,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacing.normal,
      fontFamily: fontFamilies.sans.join(', '),
    },
    md: {
      ...fontSizes.base,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacing.normal,
      fontFamily: fontFamilies.sans.join(', '),
    },
    sm: {
      ...fontSizes.sm,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacing.normal,
      fontFamily: fontFamilies.sans.join(', '),
    },
    xs: {
      ...fontSizes.xs,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacing.wide,
      fontFamily: fontFamilies.sans.join(', '),
    },
  },

  // Labels and captions
  label: {
    lg: {
      ...fontSizes.sm,
      fontWeight: fontWeights.medium,
      letterSpacing: letterSpacing.normal,
      fontFamily: fontFamilies.sans.join(', '),
    },
    md: {
      ...fontSizes.xs,
      fontWeight: fontWeights.medium,
      letterSpacing: letterSpacing.wide,
      fontFamily: fontFamilies.sans.join(', '),
    },
    sm: {
      ...fontSizes.xs,
      fontWeight: fontWeights.medium,
      letterSpacing: letterSpacing.wider,
      fontFamily: fontFamilies.sans.join(', '),
    },
  },

  // Code and monospace
  code: {
    lg: {
      ...fontSizes.base,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacing.normal,
      fontFamily: fontFamilies.mono.join(', '),
    },
    md: {
      ...fontSizes.sm,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacing.normal,
      fontFamily: fontFamilies.mono.join(', '),
    },
    sm: {
      ...fontSizes.xs,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacing.normal,
      fontFamily: fontFamilies.mono.join(', '),
    },
  },
} as const;

// Responsive typography utilities with fluid scaling
export const responsiveTypography = {
  // Mobile-first responsive scaling
  mobile: {
    display: {
      '2xl': {
        ...typographyVariants.display['2xl'],
        fontSize: 'clamp(2.25rem, 4vw, 3rem)', // 36px to 48px
        lineHeight: '1.1',
      },
      xl: {
        ...typographyVariants.display.xl,
        fontSize: 'clamp(2rem, 3.5vw, 2.5rem)', // 32px to 40px
        lineHeight: '1.1',
      },
      lg: {
        ...typographyVariants.display.lg,
        fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', // 28px to 36px
        lineHeight: '1.2',
      },
      md: {
        ...typographyVariants.display.md,
        fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', // 24px to 32px
        lineHeight: '1.2',
      },
      sm: {
        ...typographyVariants.display.sm,
        fontSize: 'clamp(1.25rem, 2vw, 1.75rem)', // 20px to 28px
        lineHeight: '1.3',
      },
    },
    heading: {
      h1: {
        ...typographyVariants.heading.h1,
        fontSize: 'clamp(1.5rem, 2.5vw, 1.875rem)', // 24px to 30px
        lineHeight: '1.2',
      },
      h2: {
        ...typographyVariants.heading.h2,
        fontSize: 'clamp(1.25rem, 2vw, 1.5rem)', // 20px to 24px
        lineHeight: '1.3',
      },
      h3: {
        ...typographyVariants.heading.h3,
        fontSize: 'clamp(1.125rem, 1.5vw, 1.25rem)', // 18px to 20px
        lineHeight: '1.4',
      },
      h4: {
        ...typographyVariants.heading.h4,
        fontSize: 'clamp(1rem, 1.25vw, 1.125rem)', // 16px to 18px
        lineHeight: '1.4',
      },
      h5: {
        ...typographyVariants.heading.h5,
        fontSize: 'clamp(0.875rem, 1vw, 1rem)', // 14px to 16px
        lineHeight: '1.5',
      },
      h6: {
        ...typographyVariants.heading.h6,
        fontSize: 'clamp(0.75rem, 0.875vw, 0.875rem)', // 12px to 14px
        lineHeight: '1.5',
      },
    },
    body: {
      lg: {
        ...typographyVariants.body.lg,
        fontSize: 'clamp(1rem, 1.125vw, 1.125rem)', // 16px to 18px
        lineHeight: '1.6',
      },
      md: {
        ...typographyVariants.body.md,
        fontSize: 'clamp(0.875rem, 1vw, 1rem)', // 14px to 16px
        lineHeight: '1.6',
      },
      sm: {
        ...typographyVariants.body.sm,
        fontSize: 'clamp(0.75rem, 0.875vw, 0.875rem)', // 12px to 14px
        lineHeight: '1.5',
      },
      xs: {
        ...typographyVariants.body.xs,
        fontSize: 'clamp(0.625rem, 0.75vw, 0.75rem)', // 10px to 12px
        lineHeight: '1.4',
      },
    },
  },
  
  tablet: {
    display: {
      '2xl': {
        ...typographyVariants.display['2xl'],
        fontSize: 'clamp(3rem, 5vw, 4.5rem)', // 48px to 72px
        lineHeight: '1.1',
      },
      xl: {
        ...typographyVariants.display.xl,
        fontSize: 'clamp(2.5rem, 4vw, 3.75rem)', // 40px to 60px
        lineHeight: '1.1',
      },
      lg: {
        ...typographyVariants.display.lg,
        fontSize: 'clamp(2.25rem, 3.5vw, 3rem)', // 36px to 48px
        lineHeight: '1.1',
      },
      md: {
        ...typographyVariants.display.md,
        fontSize: 'clamp(2rem, 3vw, 2.25rem)', // 32px to 36px
        lineHeight: '1.2',
      },
      sm: {
        ...typographyVariants.display.sm,
        fontSize: 'clamp(1.75rem, 2.5vw, 1.875rem)', // 28px to 30px
        lineHeight: '1.2',
      },
    },
    heading: {
      h1: {
        ...typographyVariants.heading.h1,
        fontSize: 'clamp(1.875rem, 3vw, 2.25rem)', // 30px to 36px
        lineHeight: '1.2',
      },
      h2: {
        ...typographyVariants.heading.h2,
        fontSize: 'clamp(1.5rem, 2.5vw, 1.875rem)', // 24px to 30px
        lineHeight: '1.3',
      },
    },
  },
  
  desktop: {
    display: {
      '2xl': typographyVariants.display['2xl'],
      xl: typographyVariants.display.xl,
      lg: typographyVariants.display.lg,
      md: typographyVariants.display.md,
      sm: typographyVariants.display.sm,
    },
    heading: typographyVariants.heading,
    body: typographyVariants.body,
  },
} as const;

// Responsive font size utilities
export const responsiveFontSizes = {
  // Fluid typography using clamp()
  fluid: {
    'display-2xl': 'clamp(3rem, 8vw, 8rem)', // 48px to 128px
    'display-xl': 'clamp(2.5rem, 6vw, 6rem)', // 40px to 96px
    'display-lg': 'clamp(2.25rem, 5vw, 4.5rem)', // 36px to 72px
    'display-md': 'clamp(2rem, 4vw, 3.75rem)', // 32px to 60px
    'display-sm': 'clamp(1.75rem, 3vw, 3rem)', // 28px to 48px
    
    'heading-1': 'clamp(1.5rem, 3vw, 1.875rem)', // 24px to 30px
    'heading-2': 'clamp(1.25rem, 2.5vw, 1.5rem)', // 20px to 24px
    'heading-3': 'clamp(1.125rem, 2vw, 1.25rem)', // 18px to 20px
    'heading-4': 'clamp(1rem, 1.5vw, 1.125rem)', // 16px to 18px
    'heading-5': 'clamp(0.875rem, 1.25vw, 1rem)', // 14px to 16px
    'heading-6': 'clamp(0.75rem, 1vw, 0.875rem)', // 12px to 14px
    
    'body-lg': 'clamp(1rem, 1.25vw, 1.125rem)', // 16px to 18px
    'body-md': 'clamp(0.875rem, 1vw, 1rem)', // 14px to 16px
    'body-sm': 'clamp(0.75rem, 0.875vw, 0.875rem)', // 12px to 14px
    'body-xs': 'clamp(0.625rem, 0.75vw, 0.75rem)', // 10px to 12px
  },
  
  // Breakpoint-specific sizes
  breakpoint: {
    xs: {
      'display-2xl': fontSizes['4xl'].fontSize,
      'display-xl': fontSizes['3xl'].fontSize,
      'display-lg': fontSizes['2xl'].fontSize,
      'display-md': fontSizes.xl.fontSize,
      'display-sm': fontSizes.lg.fontSize,
      'heading-1': fontSizes.xl.fontSize,
      'heading-2': fontSizes.lg.fontSize,
      'heading-3': fontSizes.base.fontSize,
      'heading-4': fontSizes.sm.fontSize,
      'heading-5': fontSizes.sm.fontSize,
      'heading-6': fontSizes.xs.fontSize,
    },
    sm: {
      'display-2xl': fontSizes['5xl'].fontSize,
      'display-xl': fontSizes['4xl'].fontSize,
      'display-lg': fontSizes['3xl'].fontSize,
      'display-md': fontSizes['2xl'].fontSize,
      'display-sm': fontSizes.xl.fontSize,
      'heading-1': fontSizes['2xl'].fontSize,
      'heading-2': fontSizes.xl.fontSize,
      'heading-3': fontSizes.lg.fontSize,
      'heading-4': fontSizes.base.fontSize,
      'heading-5': fontSizes.base.fontSize,
      'heading-6': fontSizes.sm.fontSize,
    },
    md: {
      'display-2xl': fontSizes['6xl'].fontSize,
      'display-xl': fontSizes['5xl'].fontSize,
      'display-lg': fontSizes['4xl'].fontSize,
      'display-md': fontSizes['3xl'].fontSize,
      'display-sm': fontSizes['2xl'].fontSize,
      'heading-1': fontSizes['3xl'].fontSize,
      'heading-2': fontSizes['2xl'].fontSize,
      'heading-3': fontSizes.xl.fontSize,
      'heading-4': fontSizes.lg.fontSize,
      'heading-5': fontSizes.base.fontSize,
      'heading-6': fontSizes.sm.fontSize,
    },
    lg: {
      'display-2xl': fontSizes['7xl'].fontSize,
      'display-xl': fontSizes['6xl'].fontSize,
      'display-lg': fontSizes['5xl'].fontSize,
      'display-md': fontSizes['4xl'].fontSize,
      'display-sm': fontSizes['3xl'].fontSize,
      'heading-1': fontSizes['3xl'].fontSize,
      'heading-2': fontSizes['2xl'].fontSize,
      'heading-3': fontSizes.xl.fontSize,
      'heading-4': fontSizes.lg.fontSize,
      'heading-5': fontSizes.base.fontSize,
      'heading-6': fontSizes.sm.fontSize,
    },
    xl: {
      'display-2xl': fontSizes['8xl'].fontSize,
      'display-xl': fontSizes['7xl'].fontSize,
      'display-lg': fontSizes['6xl'].fontSize,
      'display-md': fontSizes['5xl'].fontSize,
      'display-sm': fontSizes['4xl'].fontSize,
      'heading-1': fontSizes['4xl'].fontSize,
      'heading-2': fontSizes['3xl'].fontSize,
      'heading-3': fontSizes['2xl'].fontSize,
      'heading-4': fontSizes.xl.fontSize,
      'heading-5': fontSizes.lg.fontSize,
      'heading-6': fontSizes.base.fontSize,
    },
    '2xl': {
      'display-2xl': fontSizes['9xl'].fontSize,
      'display-xl': fontSizes['8xl'].fontSize,
      'display-lg': fontSizes['7xl'].fontSize,
      'display-md': fontSizes['6xl'].fontSize,
      'display-sm': fontSizes['5xl'].fontSize,
      'heading-1': fontSizes['5xl'].fontSize,
      'heading-2': fontSizes['4xl'].fontSize,
      'heading-3': fontSizes['3xl'].fontSize,
      'heading-4': fontSizes['2xl'].fontSize,
      'heading-5': fontSizes.xl.fontSize,
      'heading-6': fontSizes.lg.fontSize,
    },
  },
} as const;

// Type definitions
export type FontFamily = keyof typeof fontFamilies;
export type FontWeight = keyof typeof fontWeights;
export type FontSize = keyof typeof fontSizes;
export type LetterSpacing = keyof typeof letterSpacing;
export type TypographyVariant = keyof typeof typographyVariants;
export type TypographySize = keyof typeof typographyVariants.body;