/**
 * Theme Provider
 * Provides theme context and manages theme switching with persistence
 */

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { lightThemeColors, darkThemeColors } from '../tokens/colors';

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeConfig {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  colors: typeof lightThemeColors | typeof darkThemeColors;
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: number; // Scale factor (1 = 100%, 1.2 = 120%, etc.)
}

export interface ThemeContextValue {
  theme: ThemeConfig;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setReducedMotion: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  setFontSize: (scale: number) => void;
  resetTheme: () => void;
}

// Default theme configuration
const defaultTheme: ThemeConfig = {
  mode: 'system',
  resolvedTheme: 'light',
  colors: lightThemeColors,
  reducedMotion: false,
  highContrast: false,
  fontSize: 1,
};

// Theme context
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Local storage keys
const THEME_STORAGE_KEY = 'devflow-theme';
const THEME_PREFERENCES_KEY = 'devflow-theme-preferences';

// Theme provider props
export interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeMode;
  storageKey?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme: defaultThemeProp = 'system',
  storageKey = THEME_STORAGE_KEY,
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeConfig>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  // Get system theme preference
  const getSystemTheme = (): ResolvedTheme => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  // Get reduced motion preference
  const getSystemReducedMotion = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  // Get high contrast preference
  const getSystemHighContrast = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-contrast: high)').matches;
  };

  // Resolve theme mode to actual theme
  const resolveTheme = (mode: ThemeMode): ResolvedTheme => {
    if (mode === 'system') {
      return getSystemTheme();
    }
    return mode;
  };

  // Get theme colors based on resolved theme
  const getThemeColors = (resolvedTheme: ResolvedTheme) => {
    return resolvedTheme === 'dark' ? darkThemeColors : lightThemeColors;
  };

  // Load theme from storage
  const loadTheme = (): ThemeConfig => {
    try {
      if (typeof window === 'undefined') return defaultTheme;

      const storedMode = localStorage.getItem(storageKey) as ThemeMode;
      const storedPreferences = localStorage.getItem(THEME_PREFERENCES_KEY);
      
      let preferences = {
        reducedMotion: getSystemReducedMotion(),
        highContrast: getSystemHighContrast(),
        fontSize: 1,
      };

      if (storedPreferences) {
        try {
          const parsed = JSON.parse(storedPreferences);
          preferences = { ...preferences, ...parsed };
        } catch (error) {
          console.warn('Failed to parse theme preferences:', error);
        }
      }

      const mode = storedMode || defaultThemeProp;
      const resolvedTheme = resolveTheme(mode);
      const colors = getThemeColors(resolvedTheme);

      return {
        mode,
        resolvedTheme,
        colors,
        ...preferences,
      };
    } catch (error) {
      console.warn('Failed to load theme from storage:', error);
      return defaultTheme;
    }
  };

  // Save theme to storage
  const saveTheme = (newTheme: ThemeConfig) => {
    try {
      if (typeof window === 'undefined') return;

      localStorage.setItem(storageKey, newTheme.mode);
      localStorage.setItem(THEME_PREFERENCES_KEY, JSON.stringify({
        reducedMotion: newTheme.reducedMotion,
        highContrast: newTheme.highContrast,
        fontSize: newTheme.fontSize,
      }));
    } catch (error) {
      console.warn('Failed to save theme to storage:', error);
    }
  };

  // Update theme
  const updateTheme = (updates: Partial<ThemeConfig>) => {
    const newTheme = { ...theme, ...updates };
    
    // Resolve theme if mode changed
    if (updates.mode !== undefined) {
      newTheme.resolvedTheme = resolveTheme(updates.mode);
      newTheme.colors = getThemeColors(newTheme.resolvedTheme);
    }

    setThemeState(newTheme);
    saveTheme(newTheme);
    applyThemeToDOM(newTheme);
  };

  // Apply theme to DOM
  const applyThemeToDOM = (themeConfig: ThemeConfig) => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    
    // Apply theme class
    root.classList.remove('light', 'dark');
    root.classList.add(themeConfig.resolvedTheme);

    // Apply accessibility preferences
    root.classList.toggle('reduce-motion', themeConfig.reducedMotion);
    root.classList.toggle('high-contrast', themeConfig.highContrast);

    // Apply font size scale
    root.style.fontSize = `${themeConfig.fontSize * 100}%`;

    // Apply color custom properties
    const colors = themeConfig.colors;
    Object.entries(colors).forEach(([category, categoryColors]) => {
      Object.entries(categoryColors).forEach(([key, value]) => {
        root.style.setProperty(`--color-${category}-${key}`, value);
      });
    });

    // Disable transitions temporarily if requested
    if (disableTransitionOnChange) {
      root.classList.add('disable-transitions');
      setTimeout(() => {
        root.classList.remove('disable-transitions');
      }, 0);
    }
  };

  // Theme context methods
  const setTheme = (mode: ThemeMode) => {
    updateTheme({ mode });
  };

  const toggleTheme = () => {
    const newMode = theme.resolvedTheme === 'light' ? 'dark' : 'light';
    updateTheme({ mode: newMode });
  };

  const setReducedMotion = (enabled: boolean) => {
    updateTheme({ reducedMotion: enabled });
  };

  const setHighContrast = (enabled: boolean) => {
    updateTheme({ highContrast: enabled });
  };

  const setFontSize = (scale: number) => {
    updateTheme({ fontSize: Math.max(0.8, Math.min(1.5, scale)) });
  };

  const resetTheme = () => {
    const resetTheme = {
      ...defaultTheme,
      resolvedTheme: resolveTheme(defaultTheme.mode),
      colors: getThemeColors(resolveTheme(defaultTheme.mode)),
      reducedMotion: getSystemReducedMotion(),
      highContrast: getSystemHighContrast(),
    };
    setThemeState(resetTheme);
    saveTheme(resetTheme);
    applyThemeToDOM(resetTheme);
  };

  // Initialize theme on mount
  useEffect(() => {
    const initialTheme = loadTheme();
    setThemeState(initialTheme);
    applyThemeToDOM(initialTheme);
    setMounted(true);
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (!enableSystem || theme.mode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme.mode === 'system') {
        const resolvedTheme = getSystemTheme();
        updateTheme({ resolvedTheme, colors: getThemeColors(resolvedTheme) });
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme.mode, enableSystem]);

  // Listen for system accessibility preference changes
  useEffect(() => {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');

    const handleReducedMotionChange = () => {
      setReducedMotion(getSystemReducedMotion());
    };

    const handleHighContrastChange = () => {
      setHighContrast(getSystemHighContrast());
    };

    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    highContrastQuery.addEventListener('change', handleHighContrastChange);

    return () => {
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
    };
  }, []);

  // Context value
  const contextValue: ThemeContextValue = {
    theme,
    setTheme,
    toggleTheme,
    setReducedMotion,
    setHighContrast,
    setFontSize,
    resetTheme,
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook to use theme context
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Hook to get current theme colors
export function useThemeColors() {
  const { theme } = useTheme();
  return theme.colors;
}

// Hook to check if dark mode is active
export function useIsDarkMode(): boolean {
  const { theme } = useTheme();
  return theme.resolvedTheme === 'dark';
}