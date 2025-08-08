import React, { createContext, useContext, useState, useEffect } from 'react';
import { AriaLiveRegionManager, FocusManager, AccessibilityTestUtils } from '../utils/accessibility';

interface AccessibilitySettings {
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  reducedMotion: boolean;
  screenReaderMode: boolean;
  keyboardNavigation: boolean;
  focusIndicators: boolean;
  skipLinks: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  focusElement: (elementId: string) => void;
  pushFocus: (element: HTMLElement) => void;
  popFocus: () => void;
  trapFocus: (container: HTMLElement) => (() => void) | undefined;
  runAccessibilityTests: () => { category: string; issues: string[] }[];
}

const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  fontSize: 'medium',
  reducedMotion: false,
  screenReaderMode: false,
  keyboardNavigation: true,
  focusIndicators: true,
  skipLinks: true,
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [liveRegionManager, setLiveRegionManager] = useState<AriaLiveRegionManager | null>(null);

  useEffect(() => {
    // Initialize live region manager on client side only
    if (typeof window !== 'undefined') {
      setLiveRegionManager(AriaLiveRegionManager.getInstance());
    }

    // Load settings from localStorage
    const savedSettings = typeof window !== 'undefined' ? localStorage.getItem('devflow_accessibility_settings') : null;
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Failed to parse accessibility settings:', error);
      }
    }

    // Detect system preferences (client-side only)
    if (typeof window === 'undefined') return;
    
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    const prefersColorScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (prefersReducedMotion || prefersHighContrast) {
      setSettings(prev => ({
        ...prev,
        reducedMotion: prefersReducedMotion,
        highContrast: prefersHighContrast,
      }));
    }

    // Listen for system preference changes
    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastMediaQuery = window.matchMedia('(prefers-contrast: high)');

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setSettings(prev => ({ ...prev, reducedMotion: e.matches }));
    };

    const handleContrastChange = (e: MediaQueryListEvent) => {
      setSettings(prev => ({ ...prev, highContrast: e.matches }));
    };

    motionMediaQuery.addEventListener('change', handleMotionChange);
    contrastMediaQuery.addEventListener('change', handleContrastChange);

    return () => {
      motionMediaQuery.removeEventListener('change', handleMotionChange);
      contrastMediaQuery.removeEventListener('change', handleContrastChange);
    };
  }, []);

  useEffect(() => {
    // Apply settings to document (client-side only)
    if (typeof window === 'undefined') return;
    
    const root = document.documentElement;
    
    // High contrast mode
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Font size
    root.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large');
    root.classList.add(`font-${settings.fontSize}`);

    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // Screen reader mode
    if (settings.screenReaderMode) {
      root.classList.add('screen-reader-mode');
    } else {
      root.classList.remove('screen-reader-mode');
    }

    // Focus indicators
    if (settings.focusIndicators) {
      root.classList.add('focus-indicators-enabled');
    } else {
      root.classList.remove('focus-indicators-enabled');
    }

    // Keyboard navigation
    if (settings.keyboardNavigation) {
      root.classList.add('keyboard-navigation-enabled');
    } else {
      root.classList.remove('keyboard-navigation-enabled');
    }

    // Skip links
    if (settings.skipLinks) {
      root.classList.add('skip-links-enabled');
    } else {
      root.classList.remove('skip-links-enabled');
    }

    // Save settings to localStorage (client-side only)
    if (typeof window !== 'undefined') {
      localStorage.setItem('devflow_accessibility_settings', JSON.stringify(settings));
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    
    // Announce setting changes
    const changedSettings = Object.keys(newSettings);
    if (changedSettings.length > 0 && liveRegionManager) {
      const settingNames = changedSettings.join(', ');
      liveRegionManager.announce(`Accessibility settings updated: ${settingNames}`, 'polite');
    }
  };

  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (liveRegionManager) {
      liveRegionManager.announce(message, priority);
    }
  };

  const focusElement = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.focus();
      // Announce focus change for screen readers
      const label = element.getAttribute('aria-label') || 
                   element.getAttribute('title') ||
                   element.textContent?.trim() || 
                   'Element';
      announceToScreenReader(`Focused on ${label}`, 'polite');
    }
  };

  const pushFocus = (element: HTMLElement) => {
    FocusManager.pushFocus(element);
  };

  const popFocus = () => {
    FocusManager.popFocus();
  };

  const trapFocus = (container: HTMLElement) => {
    return FocusManager.trapFocus(container);
  };

  const runAccessibilityTests = () => {
    return AccessibilityTestUtils.runAllChecks();
  };

  const value: AccessibilityContextType = {
    settings,
    updateSettings,
    announceToScreenReader,
    focusElement,
    pushFocus,
    popFocus,
    trapFocus,
    runAccessibilityTests,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export default AccessibilityProvider;