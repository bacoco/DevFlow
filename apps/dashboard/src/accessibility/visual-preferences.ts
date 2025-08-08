/**
 * Visual Preferences System
 * Handles high contrast mode, reduced motion, and other visual accessibility preferences
 */

export interface VisualPreferences {
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: FontScale;
  colorBlindnessFilter: ColorBlindnessType | null;
  focusIndicatorStyle: FocusIndicatorStyle;
  customColors?: CustomColorConfig;
}

export type FontScale = 'small' | 'medium' | 'large' | 'extra-large';
export type ColorBlindnessType = 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';
export type FocusIndicatorStyle = 'default' | 'thick' | 'high-contrast' | 'custom';

export interface CustomColorConfig {
  background: string;
  foreground: string;
  accent: string;
  border: string;
}

export class VisualPreferencesManager {
  private static instance: VisualPreferencesManager;
  private preferences: VisualPreferences;
  private mediaQueries: Map<string, MediaQueryList> = new Map();
  private styleElement: HTMLStyleElement;

  static getInstance(): VisualPreferencesManager {
    if (!VisualPreferencesManager.instance) {
      VisualPreferencesManager.instance = new VisualPreferencesManager();
    }
    return VisualPreferencesManager.instance;
  }

  constructor() {
    this.preferences = this.getDefaultPreferences();
    this.styleElement = this.createStyleElement();
    this.initialize();
  }

  private initialize(): void {
    this.loadPreferences();
    this.setupMediaQueryListeners();
    this.applyPreferences();
  }

  /**
   * Gets default visual preferences
   */
  private getDefaultPreferences(): VisualPreferences {
    return {
      highContrast: false,
      reducedMotion: false,
      fontSize: 'medium',
      colorBlindnessFilter: null,
      focusIndicatorStyle: 'default'
    };
  }

  /**
   * Creates a style element for dynamic CSS
   */
  private createStyleElement(): HTMLStyleElement {
    const style = document.createElement('style');
    style.id = 'visual-preferences-styles';
    document.head.appendChild(style);
    return style;
  }

  /**
   * Sets up media query listeners for system preferences
   */
  private setupMediaQueryListeners(): void {
    // High contrast preference
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    this.mediaQueries.set('high-contrast', highContrastQuery);
    highContrastQuery.addEventListener('change', (e) => {
      if (!this.hasUserPreference('highContrast')) {
        this.updatePreference('highContrast', e.matches);
      }
    });

    // Reduced motion preference
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.mediaQueries.set('reduced-motion', reducedMotionQuery);
    reducedMotionQuery.addEventListener('change', (e) => {
      if (!this.hasUserPreference('reducedMotion')) {
        this.updatePreference('reducedMotion', e.matches);
      }
    });

    // Color scheme preference
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQueries.set('dark-mode', darkModeQuery);
    darkModeQuery.addEventListener('change', () => {
      this.applyPreferences();
    });
  }

  /**
   * Checks if user has explicitly set a preference
   */
  private hasUserPreference(key: keyof VisualPreferences): boolean {
    const stored = localStorage.getItem('visual-preferences');
    if (!stored) return false;
    
    try {
      const preferences = JSON.parse(stored);
      return preferences.hasOwnProperty(key);
    } catch {
      return false;
    }
  }

  /**
   * Loads preferences from localStorage
   */
  private loadPreferences(): void {
    try {
      const stored = localStorage.getItem('visual-preferences');
      if (stored) {
        const savedPreferences = JSON.parse(stored);
        this.preferences = { ...this.preferences, ...savedPreferences };
      } else {
        // Apply system preferences if no user preferences exist
        this.applySystemPreferences();
      }
    } catch (error) {
      console.warn('Failed to load visual preferences:', error);
    }
  }

  /**
   * Applies system preferences when no user preferences exist
   */
  private applySystemPreferences(): void {
    const highContrastQuery = this.mediaQueries.get('high-contrast');
    const reducedMotionQuery = this.mediaQueries.get('reduced-motion');

    if (highContrastQuery?.matches) {
      this.preferences.highContrast = true;
    }

    if (reducedMotionQuery?.matches) {
      this.preferences.reducedMotion = true;
    }
  }

  /**
   * Saves preferences to localStorage
   */
  private savePreferences(): void {
    try {
      localStorage.setItem('visual-preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.warn('Failed to save visual preferences:', error);
    }
  }

  /**
   * Updates a specific preference
   */
  updatePreference<K extends keyof VisualPreferences>(
    key: K, 
    value: VisualPreferences[K]
  ): void {
    this.preferences[key] = value;
    this.savePreferences();
    this.applyPreferences();
    this.notifyPreferenceChange(key, value);
  }

  /**
   * Gets current preferences
   */
  getPreferences(): VisualPreferences {
    return { ...this.preferences };
  }

  /**
   * Applies all visual preferences
   */
  private applyPreferences(): void {
    this.applyHighContrast();
    this.applyReducedMotion();
    this.applyFontSize();
    this.applyColorBlindnessFilter();
    this.applyFocusIndicatorStyle();
    this.applyCustomColors();
  }

  /**
   * Applies high contrast mode
   */
  private applyHighContrast(): void {
    const root = document.documentElement;
    
    if (this.preferences.highContrast) {
      root.classList.add('high-contrast');
      root.style.setProperty('--contrast-mode', 'high');
    } else {
      root.classList.remove('high-contrast');
      root.style.removeProperty('--contrast-mode');
    }
  }

  /**
   * Applies reduced motion preferences
   */
  private applyReducedMotion(): void {
    const root = document.documentElement;
    
    if (this.preferences.reducedMotion) {
      root.classList.add('reduced-motion');
      root.style.setProperty('--animation-duration', '0.01ms');
      root.style.setProperty('--transition-duration', '0.01ms');
    } else {
      root.classList.remove('reduced-motion');
      root.style.removeProperty('--animation-duration');
      root.style.removeProperty('--transition-duration');
    }
  }

  /**
   * Applies font size scaling
   */
  private applyFontSize(): void {
    const root = document.documentElement;
    const scaleMap: Record<FontScale, string> = {
      'small': '0.875',
      'medium': '1',
      'large': '1.125',
      'extra-large': '1.25'
    };

    const scale = scaleMap[this.preferences.fontSize];
    root.style.setProperty('--font-scale', scale);
  }

  /**
   * Applies color blindness filters
   */
  private applyColorBlindnessFilter(): void {
    const root = document.documentElement;
    
    if (this.preferences.colorBlindnessFilter) {
      const filterMap: Record<ColorBlindnessType, string> = {
        'protanopia': 'url(#protanopia-filter)',
        'deuteranopia': 'url(#deuteranopia-filter)',
        'tritanopia': 'url(#tritanopia-filter)',
        'achromatopsia': 'grayscale(100%)'
      };

      const filter = filterMap[this.preferences.colorBlindnessFilter];
      root.style.setProperty('--color-filter', filter);
      
      // Create SVG filters for color blindness simulation
      this.createColorBlindnessFilters();
    } else {
      root.style.removeProperty('--color-filter');
    }
  }

  /**
   * Creates SVG filters for color blindness simulation
   */
  private createColorBlindnessFilters(): void {
    let svg = document.getElementById('color-blindness-filters') as SVGElement;
    
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'color-blindness-filters';
      svg.style.position = 'absolute';
      svg.style.width = '0';
      svg.style.height = '0';
      document.body.appendChild(svg);

      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svg.appendChild(defs);

      // Protanopia filter
      const protanopiaFilter = this.createColorMatrix('protanopia-filter', [
        0.567, 0.433, 0, 0, 0,
        0.558, 0.442, 0, 0, 0,
        0, 0.242, 0.758, 0, 0,
        0, 0, 0, 1, 0
      ]);
      defs.appendChild(protanopiaFilter);

      // Deuteranopia filter
      const deuteranopiaFilter = this.createColorMatrix('deuteranopia-filter', [
        0.625, 0.375, 0, 0, 0,
        0.7, 0.3, 0, 0, 0,
        0, 0.3, 0.7, 0, 0,
        0, 0, 0, 1, 0
      ]);
      defs.appendChild(deuteranopiaFilter);

      // Tritanopia filter
      const tritanopiaFilter = this.createColorMatrix('tritanopia-filter', [
        0.95, 0.05, 0, 0, 0,
        0, 0.433, 0.567, 0, 0,
        0, 0.475, 0.525, 0, 0,
        0, 0, 0, 1, 0
      ]);
      defs.appendChild(tritanopiaFilter);
    }
  }

  /**
   * Creates a color matrix filter element
   */
  private createColorMatrix(id: string, values: number[]): SVGFilterElement {
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.id = id;

    const colorMatrix = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
    colorMatrix.setAttribute('type', 'matrix');
    colorMatrix.setAttribute('values', values.join(' '));

    filter.appendChild(colorMatrix);
    return filter;
  }

  /**
   * Applies focus indicator styling
   */
  private applyFocusIndicatorStyle(): void {
    const styles = this.getFocusIndicatorStyles();
    this.updateDynamicStyles(styles);
  }

  /**
   * Gets focus indicator styles based on preference
   */
  private getFocusIndicatorStyles(): string {
    const style = this.preferences.focusIndicatorStyle;
    
    switch (style) {
      case 'thick':
        return `
          *:focus {
            outline: 4px solid var(--focus-color, #005fcc) !important;
            outline-offset: 2px !important;
          }
        `;
      case 'high-contrast':
        return `
          *:focus {
            outline: 3px solid #000 !important;
            outline-offset: 1px !important;
            box-shadow: 0 0 0 5px #fff, 0 0 0 8px #000 !important;
          }
        `;
      case 'custom':
        return this.preferences.customColors ? `
          *:focus {
            outline: 2px solid ${this.preferences.customColors.accent} !important;
            outline-offset: 2px !important;
          }
        ` : '';
      default:
        return `
          *:focus {
            outline: 2px solid var(--focus-color, #005fcc) !important;
            outline-offset: 1px !important;
          }
        `;
    }
  }

  /**
   * Applies custom colors if configured
   */
  private applyCustomColors(): void {
    if (this.preferences.customColors) {
      const root = document.documentElement;
      const colors = this.preferences.customColors;
      
      root.style.setProperty('--custom-bg', colors.background);
      root.style.setProperty('--custom-fg', colors.foreground);
      root.style.setProperty('--custom-accent', colors.accent);
      root.style.setProperty('--custom-border', colors.border);
      
      root.classList.add('custom-colors');
    } else {
      document.documentElement.classList.remove('custom-colors');
    }
  }

  /**
   * Updates dynamic styles
   */
  private updateDynamicStyles(styles: string): void {
    this.styleElement.textContent = styles;
  }

  /**
   * Notifies about preference changes
   */
  private notifyPreferenceChange<K extends keyof VisualPreferences>(
    key: K, 
    value: VisualPreferences[K]
  ): void {
    const event = new CustomEvent('visual-preference-change', {
      detail: { key, value, preferences: this.preferences }
    });
    document.dispatchEvent(event);
  }

  /**
   * Resets all preferences to defaults
   */
  resetPreferences(): void {
    this.preferences = this.getDefaultPreferences();
    this.savePreferences();
    this.applyPreferences();
  }

  /**
   * Cleanup method
   */
  cleanup(): void {
    this.mediaQueries.forEach(query => {
      query.removeEventListener('change', () => {});
    });
    this.mediaQueries.clear();
    
    if (this.styleElement.parentNode) {
      this.styleElement.parentNode.removeChild(this.styleElement);
    }
  }
}

// React hook for visual preferences
export function useVisualPreferences() {
  const manager = VisualPreferencesManager.getInstance();

  return {
    preferences: manager.getPreferences(),
    updatePreference: manager.updatePreference.bind(manager),
    resetPreferences: manager.resetPreferences.bind(manager)
  };
}