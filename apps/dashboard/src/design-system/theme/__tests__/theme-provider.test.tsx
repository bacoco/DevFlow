/**
 * Theme Provider Tests
 * Tests for the design system theme provider
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '../theme-provider';

// Get the existing localStorage mock
const localStorageMock = window.localStorage;

// Mock matchMedia
const matchMediaMock = jest.fn().mockImplementation((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));
Object.defineProperty(window, 'matchMedia', {
  value: matchMediaMock,
});

// Test component that uses the theme
const TestComponent = () => {
  const { theme, setTheme, toggleTheme, setReducedMotion, setHighContrast, setFontSize, resetTheme } = useTheme();
  
  return (
    <div>
      <div data-testid="theme-mode">{theme.mode}</div>
      <div data-testid="resolved-theme">{theme.resolvedTheme}</div>
      <div data-testid="reduced-motion">{theme.reducedMotion.toString()}</div>
      <div data-testid="high-contrast">{theme.highContrast.toString()}</div>
      <div data-testid="font-size">{theme.fontSize}</div>
      
      <button onClick={() => setTheme('dark')} data-testid="set-dark">
        Set Dark
      </button>
      <button onClick={() => setTheme('light')} data-testid="set-light">
        Set Light
      </button>
      <button onClick={() => setTheme('system')} data-testid="set-system">
        Set System
      </button>
      <button onClick={toggleTheme} data-testid="toggle-theme">
        Toggle Theme
      </button>
      <button onClick={() => setReducedMotion(true)} data-testid="set-reduced-motion">
        Set Reduced Motion
      </button>
      <button onClick={() => setHighContrast(true)} data-testid="set-high-contrast">
        Set High Contrast
      </button>
      <button onClick={() => setFontSize(1.2)} data-testid="set-font-size">
        Set Font Size
      </button>
      <button onClick={resetTheme} data-testid="reset-theme">
        Reset Theme
      </button>
    </div>
  );
};

describe('ThemeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });
  });

  it('provides default theme values', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('system');
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
      expect(screen.getByTestId('reduced-motion')).toHaveTextContent('false');
      expect(screen.getByTestId('high-contrast')).toHaveTextContent('false');
      expect(screen.getByTestId('font-size')).toHaveTextContent('1');
    });
  });

  it('allows setting theme mode', async () => {
    const user = userEvent.setup();
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('system');
    });

    await user.click(screen.getByTestId('set-dark'));

    await waitFor(() => {
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
    });

    await user.click(screen.getByTestId('set-light'));

    await waitFor(() => {
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
    });
  });

  it('toggles between light and dark themes', async () => {
    const user = userEvent.setup();
    
    render(
      <ThemeProvider defaultTheme="light">
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
    });

    await user.click(screen.getByTestId('toggle-theme'));

    await waitFor(() => {
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
    });

    await user.click(screen.getByTestId('toggle-theme'));

    await waitFor(() => {
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
    });
  });

  it('handles system theme preference', async () => {
    // Mock system preference for dark mode
    matchMediaMock.mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    const user = userEvent.setup();
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await user.click(screen.getByTestId('set-system'));

    await waitFor(() => {
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('system');
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
    });
  });

  it('sets reduced motion preference', async () => {
    const user = userEvent.setup();
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('reduced-motion')).toHaveTextContent('false');
    });

    await user.click(screen.getByTestId('set-reduced-motion'));

    await waitFor(() => {
      expect(screen.getByTestId('reduced-motion')).toHaveTextContent('true');
    });
  });

  it('sets high contrast preference', async () => {
    const user = userEvent.setup();
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('high-contrast')).toHaveTextContent('false');
    });

    await user.click(screen.getByTestId('set-high-contrast'));

    await waitFor(() => {
      expect(screen.getByTestId('high-contrast')).toHaveTextContent('true');
    });
  });

  it('sets font size with bounds checking', async () => {
    const user = userEvent.setup();
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('font-size')).toHaveTextContent('1');
    });

    await user.click(screen.getByTestId('set-font-size'));

    await waitFor(() => {
      expect(screen.getByTestId('font-size')).toHaveTextContent('1.2');
    });
  });

  it('resets theme to defaults', async () => {
    const user = userEvent.setup();
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    // Change some settings
    await user.click(screen.getByTestId('set-dark'));
    await user.click(screen.getByTestId('set-reduced-motion'));
    await user.click(screen.getByTestId('set-high-contrast'));
    await user.click(screen.getByTestId('set-font-size'));

    await waitFor(() => {
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
      expect(screen.getByTestId('reduced-motion')).toHaveTextContent('true');
      expect(screen.getByTestId('high-contrast')).toHaveTextContent('true');
      expect(screen.getByTestId('font-size')).toHaveTextContent('1.2');
    });

    // Reset theme
    await user.click(screen.getByTestId('reset-theme'));

    await waitFor(() => {
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('system');
      expect(screen.getByTestId('reduced-motion')).toHaveTextContent('false');
      expect(screen.getByTestId('high-contrast')).toHaveTextContent('false');
      expect(screen.getByTestId('font-size')).toHaveTextContent('1');
    });
  });

  it('persists theme to localStorage', async () => {
    const user = userEvent.setup();
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await user.click(screen.getByTestId('set-dark'));

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('devflow-theme', 'dark');
    });
  });

  it('loads theme from localStorage', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'devflow-theme') return 'dark';
      if (key === 'devflow-theme-preferences') {
        return JSON.stringify({
          reducedMotion: true,
          highContrast: false,
          fontSize: 1.1,
        });
      }
      return null;
    });

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
      expect(screen.getByTestId('reduced-motion')).toHaveTextContent('true');
      expect(screen.getByTestId('font-size')).toHaveTextContent('1.1');
    });
  });

  it('handles localStorage errors gracefully', async () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('system');
    });

    expect(consoleSpy).toHaveBeenCalledWith('Failed to load theme from storage:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('throws error when used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useTheme must be used within a ThemeProvider');

    consoleSpy.mockRestore();
  });

  it('applies custom storage key', async () => {
    const user = userEvent.setup();
    
    render(
      <ThemeProvider storageKey="custom-theme-key">
        <TestComponent />
      </ThemeProvider>
    );

    await user.click(screen.getByTestId('set-dark'));

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('custom-theme-key', 'dark');
    });
  });

  it('disables system theme when enableSystem is false', async () => {
    matchMediaMock.mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    render(
      <ThemeProvider enableSystem={false} defaultTheme="system">
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
    });
  });
});