/**
 * Design System Motion Tokens
 * Provides consistent animation durations, easing functions, and motion patterns
 */

// Animation durations (in milliseconds)
export const duration = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 350,
  slower: 500,
  slowest: 750,
} as const;

// Easing functions for different types of animations
export const easing = {
  // Standard easing curves
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',

  // Custom cubic-bezier curves for more sophisticated animations
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',      // Material Design standard
  snappy: 'cubic-bezier(0.4, 0, 0.6, 1)',      // Slightly more aggressive
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Bounce effect
  elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Elastic effect
  
  // Entrance animations
  fadeIn: 'cubic-bezier(0, 0, 0.2, 1)',
  slideIn: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  scaleIn: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  
  // Exit animations
  fadeOut: 'cubic-bezier(0.4, 0, 1, 1)',
  slideOut: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  scaleOut: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
} as const;

// Animation presets for common UI patterns
export const animations = {
  // Fade animations
  fadeIn: {
    duration: duration.normal,
    easing: easing.fadeIn,
    keyframes: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
  },
  
  fadeOut: {
    duration: duration.fast,
    easing: easing.fadeOut,
    keyframes: {
      from: { opacity: 1 },
      to: { opacity: 0 },
    },
  },

  // Slide animations
  slideInUp: {
    duration: duration.normal,
    easing: easing.slideIn,
    keyframes: {
      from: { 
        opacity: 0,
        transform: 'translateY(20px)',
      },
      to: { 
        opacity: 1,
        transform: 'translateY(0)',
      },
    },
  },

  slideInDown: {
    duration: duration.normal,
    easing: easing.slideIn,
    keyframes: {
      from: { 
        opacity: 0,
        transform: 'translateY(-20px)',
      },
      to: { 
        opacity: 1,
        transform: 'translateY(0)',
      },
    },
  },

  slideInLeft: {
    duration: duration.normal,
    easing: easing.slideIn,
    keyframes: {
      from: { 
        opacity: 0,
        transform: 'translateX(-20px)',
      },
      to: { 
        opacity: 1,
        transform: 'translateX(0)',
      },
    },
  },

  slideInRight: {
    duration: duration.normal,
    easing: easing.slideIn,
    keyframes: {
      from: { 
        opacity: 0,
        transform: 'translateX(20px)',
      },
      to: { 
        opacity: 1,
        transform: 'translateX(0)',
      },
    },
  },

  // Scale animations
  scaleIn: {
    duration: duration.normal,
    easing: easing.scaleIn,
    keyframes: {
      from: { 
        opacity: 0,
        transform: 'scale(0.95)',
      },
      to: { 
        opacity: 1,
        transform: 'scale(1)',
      },
    },
  },

  scaleOut: {
    duration: duration.fast,
    easing: easing.scaleOut,
    keyframes: {
      from: { 
        opacity: 1,
        transform: 'scale(1)',
      },
      to: { 
        opacity: 0,
        transform: 'scale(0.95)',
      },
    },
  },

  // Bounce animation
  bounce: {
    duration: duration.slower,
    easing: easing.bounce,
    keyframes: {
      from: { 
        opacity: 0,
        transform: 'scale(0.3)',
      },
      '50%': {
        opacity: 1,
        transform: 'scale(1.05)',
      },
      to: { 
        opacity: 1,
        transform: 'scale(1)',
      },
    },
  },

  // Pulse animation for loading states
  pulse: {
    duration: duration.slower,
    easing: easing.easeInOut,
    iterationCount: 'infinite',
    keyframes: {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.5 },
    },
  },

  // Spin animation for loading spinners
  spin: {
    duration: duration.slower,
    easing: easing.linear,
    iterationCount: 'infinite',
    keyframes: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    },
  },

  // Shake animation for error states
  shake: {
    duration: duration.slow,
    easing: easing.easeInOut,
    keyframes: {
      '0%, 100%': { transform: 'translateX(0)' },
      '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
      '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
    },
  },
} as const;

// Transition presets for interactive elements
export const transitions = {
  // Button transitions
  button: {
    duration: duration.fast,
    easing: easing.smooth,
    properties: ['background-color', 'border-color', 'color', 'box-shadow', 'transform'],
  },

  // Input transitions
  input: {
    duration: duration.fast,
    easing: easing.smooth,
    properties: ['border-color', 'box-shadow'],
  },

  // Modal/overlay transitions
  modal: {
    duration: duration.normal,
    easing: easing.smooth,
    properties: ['opacity', 'transform'],
  },

  // Tooltip transitions
  tooltip: {
    duration: duration.fast,
    easing: easing.smooth,
    properties: ['opacity', 'transform'],
  },

  // Dropdown transitions
  dropdown: {
    duration: duration.normal,
    easing: easing.smooth,
    properties: ['opacity', 'transform', 'max-height'],
  },

  // Tab transitions
  tab: {
    duration: duration.normal,
    easing: easing.smooth,
    properties: ['opacity', 'transform'],
  },

  // Accordion transitions
  accordion: {
    duration: duration.normal,
    easing: easing.smooth,
    properties: ['max-height', 'opacity'],
  },

  // Color transitions
  color: {
    duration: duration.fast,
    easing: easing.smooth,
    properties: ['color', 'background-color', 'border-color'],
  },

  // Transform transitions
  transform: {
    duration: duration.fast,
    easing: easing.smooth,
    properties: ['transform'],
  },

  // All properties (use sparingly)
  all: {
    duration: duration.fast,
    easing: easing.smooth,
    properties: ['all'],
  },
} as const;

// Reduced motion preferences
export const reducedMotion = {
  // Simplified animations for users who prefer reduced motion
  fadeIn: {
    duration: duration.instant,
    easing: easing.linear,
    keyframes: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
  },

  fadeOut: {
    duration: duration.instant,
    easing: easing.linear,
    keyframes: {
      from: { opacity: 1 },
      to: { opacity: 0 },
    },
  },

  // Disable complex animations
  noAnimation: {
    duration: duration.instant,
    easing: easing.linear,
  },
} as const;

// Stagger animations for lists and grids
export const stagger = {
  // Stagger delays for animating multiple elements
  fast: 50,    // 50ms between elements
  normal: 100, // 100ms between elements
  slow: 150,   // 150ms between elements
} as const;

// Type definitions
export type Duration = keyof typeof duration;
export type Easing = keyof typeof easing;
export type Animation = keyof typeof animations;
export type Transition = keyof typeof transitions;
export type StaggerDelay = keyof typeof stagger;