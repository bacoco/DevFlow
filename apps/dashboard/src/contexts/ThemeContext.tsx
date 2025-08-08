/**
 * Theme Context Provider
 * Manages theme state and provides theme switching functionality
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeContextValue, ThemeProviderProps, ThemeMode } from '../types/design-system';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ 
  children, 
  defaultTheme = 'dark', 
  storageKey = 'devflow-theme' 
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeMode>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(storageKey) as ThemeMode;
      if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
        setTheme(savedTheme);
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error);
    }
    setMounted(true);
  }, [storageKey]);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    // Add current theme class
    root.classList.add(isDark ? 'dark' : 'light');
    
    // Save to localStorage
    try {
      localStorage.setItem(storageKey, theme);
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error);
    }
  }, [theme, mounted, storageKey]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (theme !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(mediaQuery.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const isDark = theme === 'dark' || (theme === 'auto' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toggleTheme = () => {
    setTheme(current => current === 'dark' ? 'light' : 'dark');
  };

  const value: ThemeContextValue = {
    theme,
    setTheme,
    isDark,
    toggleTheme
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Theme hook for components
export function useThemeMode() {
  const { theme, isDark } = useTheme();
  return { theme, isDark };
}

// CSS class helper for theme-aware styling
export function useThemeClasses() {
  const { isDark } = useTheme();
  
  return {
    background: isDark ? 'bg-dark-900' : 'bg-gray-50',
    surface: isDark ? 'bg-dark-800' : 'bg-white',
    border: isDark ? 'border-dark-700' : 'border-gray-200',
    text: {
      primary: isDark ? 'text-gray-100' : 'text-gray-900',
      secondary: isDark ? 'text-gray-400' : 'text-gray-600',
      muted: isDark ? 'text-gray-500' : 'text-gray-500'
    },
    hover: {
      background: isDark ? 'hover:bg-dark-700' : 'hover:bg-gray-100',
      surface: isDark ? 'hover:bg-dark-700' : 'hover:bg-gray-50'
    }
  };
}