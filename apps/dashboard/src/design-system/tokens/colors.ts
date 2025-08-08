/**
 * Design System Color Tokens
 * Provides semantic color definitions for light and dark themes
 */

export const colorTokens = {
  // Base colors - neutral palette
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },

  // Primary brand colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },

  // Secondary colors
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },

  // Success colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },

  // Warning colors
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },

  // Error colors
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },

  // Info colors
  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
  },
} as const;

// Semantic color mappings for light theme
export const lightThemeColors = {
  // Background colors
  background: {
    primary: colorTokens.neutral[50],
    secondary: colorTokens.neutral[100],
    tertiary: colorTokens.neutral[200],
    elevated: '#ffffff',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // Text colors
  text: {
    primary: colorTokens.neutral[900],
    secondary: colorTokens.neutral[700],
    tertiary: colorTokens.neutral[500],
    inverse: '#ffffff',
    disabled: colorTokens.neutral[400],
  },

  // Border colors
  border: {
    primary: colorTokens.neutral[200],
    secondary: colorTokens.neutral[300],
    focus: colorTokens.primary[500],
    error: colorTokens.error[500],
  },

  // Interactive colors
  interactive: {
    primary: colorTokens.primary[600],
    primaryHover: colorTokens.primary[700],
    primaryActive: colorTokens.primary[800],
    secondary: colorTokens.secondary[100],
    secondaryHover: colorTokens.secondary[200],
    secondaryActive: colorTokens.secondary[300],
  },

  // Status colors
  status: {
    success: colorTokens.success[600],
    successBackground: colorTokens.success[50],
    warning: colorTokens.warning[600],
    warningBackground: colorTokens.warning[50],
    error: colorTokens.error[600],
    errorBackground: colorTokens.error[50],
    info: colorTokens.info[600],
    infoBackground: colorTokens.info[50],
  },
} as const;

// Semantic color mappings for dark theme
export const darkThemeColors = {
  // Background colors
  background: {
    primary: colorTokens.neutral[950],
    secondary: colorTokens.neutral[900],
    tertiary: colorTokens.neutral[800],
    elevated: colorTokens.neutral[900],
    overlay: 'rgba(0, 0, 0, 0.7)',
  },

  // Text colors
  text: {
    primary: colorTokens.neutral[50],
    secondary: colorTokens.neutral[300],
    tertiary: colorTokens.neutral[500],
    inverse: colorTokens.neutral[900],
    disabled: colorTokens.neutral[600],
  },

  // Border colors
  border: {
    primary: colorTokens.neutral[800],
    secondary: colorTokens.neutral[700],
    focus: colorTokens.primary[400],
    error: colorTokens.error[400],
  },

  // Interactive colors
  interactive: {
    primary: colorTokens.primary[500],
    primaryHover: colorTokens.primary[400],
    primaryActive: colorTokens.primary[300],
    secondary: colorTokens.secondary[800],
    secondaryHover: colorTokens.secondary[700],
    secondaryActive: colorTokens.secondary[600],
  },

  // Status colors
  status: {
    success: colorTokens.success[400],
    successBackground: colorTokens.success[950],
    warning: colorTokens.warning[400],
    warningBackground: colorTokens.warning[950],
    error: colorTokens.error[400],
    errorBackground: colorTokens.error[950],
    info: colorTokens.info[400],
    infoBackground: colorTokens.info[950],
  },
} as const;

// Type definitions
export type ColorToken = keyof typeof colorTokens;
export type ColorShade = keyof typeof colorTokens.neutral;
export type SemanticColor = keyof typeof lightThemeColors;
export type ThemeColors = typeof lightThemeColors | typeof darkThemeColors;