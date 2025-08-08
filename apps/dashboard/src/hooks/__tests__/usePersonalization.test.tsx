/**
 * Tests for personalization hooks
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  usePersonalization,
  useInteractionTracker,
  useWidgetSuggestions,
  useLayoutRecommendations,
  useSmartDefaults,
  usePreferences,
  initializePersonalization,
  getPersonalizationEngine
} from '../usePersonalization';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock window.innerWidth for device detection
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

describe('Personalization Hooks', () => {
  const userId = 'test-user';

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Initialize personalization engine
    initializePersonalization(userId, {
      enableTracking: true,
      enableLearning: true
    });
  });

  afterEach(() => {
    const engine = getPersonalizationEngine();
    if (engine) {
      engine.destroy();
    }
  });

  describe('usePersonalization', () => {
    it('should return initial state and preferences', () => {
      const { result } = renderHook(() => usePersonalization());
      
      expect(result.current.state).toBeDefined();
      expect(result.current.preferences).toBeDefined();
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.engine).toBeDefined();
    });

    it('should track interactions', () => {
      const { result } = renderHook(() => usePersonalization());
      
      act(() => {
        result.current.trackInteraction('click', 'test-button', { page: 'dashboard' });
      });
      
      const engine = getPersonalizationEngine();
      const summary = engine?.getSessionSummary();
      expect(summary?.eventCount).toBe(1);
    });

    it('should update preferences', async () => {
      const { result } = renderHook(() => usePersonalization());
      
      await act(async () => {
        await result.current.updatePreferences({
          theme: { mode: 'dark', colorScheme: 'default', density: 'comfortable' }
        });
      });
      
      expect(result.current.preferences?.theme.mode).toBe('dark');
    });

    it('should generate insights', async () => {
      const { result } = renderHook(() => usePersonalization());
      
      let insights;
      await act(async () => {
        insights = await result.current.generateInsights();
      });
      
      expect(insights).toBeDefined();
      expect(insights?.userId).toBe(userId);
      expect(result.current.insights).toBeDefined();
    });

    it('should reset personalization', async () => {
      const { result } = renderHook(() => usePersonalization());
      
      // First modify preferences
      await act(async () => {
        await result.current.updatePreferences({
          theme: { mode: 'dark', colorScheme: 'default', density: 'comfortable' }
        });
      });
      
      expect(result.current.preferences?.theme.mode).toBe('dark');
      
      // Then reset
      await act(async () => {
        await result.current.resetPersonalization();
      });
      
      expect(result.current.preferences?.theme.mode).toBe('auto');
    });

    it('should handle engine not being initialized', () => {
      // Destroy the engine to simulate uninitialized state
      const engine = getPersonalizationEngine();
      engine?.destroy();
      
      const { result } = renderHook(() => usePersonalization());
      
      expect(result.current.state.isInitialized).toBe(false);
      expect(result.current.preferences).toBeNull();
      expect(result.current.engine).toBeNull();
    });
  });

  describe('useInteractionTracker', () => {
    it('should provide interaction tracking methods', () => {
      const { result } = renderHook(() => useInteractionTracker());
      
      expect(result.current.trackClick).toBeDefined();
      expect(result.current.trackHover).toBeDefined();
      expect(result.current.trackNavigation).toBeDefined();
      expect(result.current.trackWidgetInteraction).toBeDefined();
      expect(result.current.trackSearch).toBeDefined();
    });

    it('should track click interactions', () => {
      const { result } = renderHook(() => useInteractionTracker());
      
      act(() => {
        result.current.trackClick('test-button', { page: 'dashboard' });
      });
      
      const engine = getPersonalizationEngine();
      const summary = engine?.getSessionSummary();
      expect(summary?.eventCount).toBe(1);
    });

    it('should track hover interactions', () => {
      const { result } = renderHook(() => useInteractionTracker());
      
      act(() => {
        result.current.trackHover('test-widget', 5000, { section: 'main' });
      });
      
      const engine = getPersonalizationEngine();
      const summary = engine?.getSessionSummary();
      expect(summary?.eventCount).toBe(1);
    });

    it('should track navigation', () => {
      const { result } = renderHook(() => useInteractionTracker());
      
      act(() => {
        result.current.trackNavigation('/dashboard', '/analytics');
      });
      
      const engine = getPersonalizationEngine();
      const summary = engine?.getSessionSummary();
      expect(summary?.eventCount).toBe(1);
    });

    it('should track widget interactions', () => {
      const { result } = renderHook(() => useInteractionTracker());
      
      act(() => {
        result.current.trackWidgetInteraction('code-quality-widget', 'expand', {}, { size: 'large' });
      });
      
      const engine = getPersonalizationEngine();
      const summary = engine?.getSessionSummary();
      expect(summary?.eventCount).toBe(1);
    });

    it('should track search queries', () => {
      const { result } = renderHook(() => useInteractionTracker());
      
      act(() => {
        result.current.trackSearch('performance metrics', 10);
      });
      
      const engine = getPersonalizationEngine();
      const summary = engine?.getSessionSummary();
      expect(summary?.eventCount).toBe(1);
    });
  });

  describe('useWidgetSuggestions', () => {
    it('should return widget suggestions', async () => {
      const { result } = renderHook(() =>
        useWidgetSuggestions(
          'developer',
          'desktop',
          [],
          { width: 6, height: 4 }
        )
      );
      
      // Wait for async suggestions to load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.suggestions).toBeDefined();
      expect(Array.isArray(result.current.suggestions)).toBe(true);
    });

    it('should refresh suggestions', async () => {
      const { result } = renderHook(() =>
        useWidgetSuggestions(
          'developer',
          'desktop',
          [],
          { width: 6, height: 4 }
        )
      );
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      act(() => {
        result.current.refreshSuggestions();
      });
      
      expect(result.current.loading).toBe(true);
    });

    it('should update suggestions when parameters change', async () => {
      let userRole: 'developer' | 'team_lead' = 'developer';
      
      const { result, rerender } = renderHook(() =>
        useWidgetSuggestions(
          userRole,
          'desktop',
          [],
          { width: 6, height: 4 }
        )
      );
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      // Change user role
      userRole = 'team_lead';
      rerender();
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      // Suggestions might be different for different roles
      expect(result.current.suggestions).toBeDefined();
    });
  });

  describe('useLayoutRecommendations', () => {
    it('should return layout recommendations', async () => {
      const { result } = renderHook(() =>
        useLayoutRecommendations('developer', 'desktop')
      );
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.recommendations).toBeDefined();
      expect(Array.isArray(result.current.recommendations)).toBe(true);
    });

    it('should refresh recommendations', async () => {
      const { result } = renderHook(() =>
        useLayoutRecommendations('developer', 'desktop')
      );
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      act(() => {
        result.current.refreshRecommendations();
      });
      
      expect(result.current.loading).toBe(true);
    });
  });

  describe('useSmartDefaults', () => {
    it('should provide smart default methods', () => {
      const { result } = renderHook(() => useSmartDefaults());
      
      expect(result.current.getSmartDefault).toBeDefined();
      expect(result.current.getAllSmartDefaults).toBeDefined();
    });

    it('should get smart default value', () => {
      const { result } = renderHook(() => useSmartDefaults());
      
      const defaultValue = result.current.getSmartDefault('theme.mode', 'light');
      
      expect(defaultValue).toBeDefined();
      expect(defaultValue?.key).toBe('theme.mode');
      expect(defaultValue?.value).toBeDefined();
    });

    it('should get all smart defaults', () => {
      const { result } = renderHook(() => useSmartDefaults());
      
      const allDefaults = result.current.getAllSmartDefaults();
      
      expect(allDefaults).toBeDefined();
      expect(typeof allDefaults).toBe('object');
    });

    it('should return null when engine is not available', () => {
      // Destroy the engine
      const engine = getPersonalizationEngine();
      engine?.destroy();
      
      const { result } = renderHook(() => useSmartDefaults());
      
      const defaultValue = result.current.getSmartDefault('theme.mode', 'light');
      expect(defaultValue).toBeNull();
      
      const allDefaults = result.current.getAllSmartDefaults();
      expect(allDefaults).toEqual({});
    });
  });

  describe('usePreferences', () => {
    it('should provide preference update methods', () => {
      const { result } = renderHook(() => usePreferences());
      
      expect(result.current.updateTheme).toBeDefined();
      expect(result.current.updateLayout).toBeDefined();
      expect(result.current.updateAccessibility).toBeDefined();
      expect(result.current.updatePrivacy).toBeDefined();
      expect(result.current.updatePreferences).toBeDefined();
    });

    it('should update theme preferences', async () => {
      const { result } = renderHook(() => usePreferences());
      
      await act(async () => {
        await result.current.updateTheme({ mode: 'dark' });
      });
      
      expect(result.current.preferences?.theme.mode).toBe('dark');
    });

    it('should update layout preferences', async () => {
      const { result } = renderHook(() => usePreferences());
      
      await act(async () => {
        await result.current.updateLayout({ columnCount: 4 });
      });
      
      expect(result.current.preferences?.layout.columnCount).toBe(4);
    });

    it('should update accessibility preferences', async () => {
      const { result } = renderHook(() => usePreferences());
      
      await act(async () => {
        await result.current.updateAccessibility({ highContrast: true });
      });
      
      expect(result.current.preferences?.accessibility.highContrast).toBe(true);
    });

    it('should update privacy preferences', async () => {
      const { result } = renderHook(() => usePreferences());
      
      await act(async () => {
        await result.current.updatePrivacy({ trackingEnabled: false });
      });
      
      expect(result.current.preferences?.privacy.trackingEnabled).toBe(false);
    });

    it('should handle missing preferences gracefully', async () => {
      // Destroy engine to simulate missing preferences
      const engine = getPersonalizationEngine();
      engine?.destroy();
      
      const { result } = renderHook(() => usePreferences());
      
      // Should not throw errors
      await act(async () => {
        await result.current.updateTheme({ mode: 'dark' });
      });
      
      expect(result.current.preferences).toBeNull();
    });
  });

  describe('Engine Initialization', () => {
    it('should initialize personalization engine', () => {
      const engine = initializePersonalization('new-user', {
        enableTracking: false,
        enableLearning: true
      });
      
      expect(engine).toBeDefined();
      expect(getPersonalizationEngine()).toBe(engine);
      
      const state = engine.getState();
      expect(state.trackingEnabled).toBe(false);
      expect(state.learningEnabled).toBe(true);
      
      engine.destroy();
    });

    it('should replace existing engine when initializing', () => {
      const firstEngine = initializePersonalization('user1');
      const secondEngine = initializePersonalization('user2');
      
      expect(getPersonalizationEngine()).toBe(secondEngine);
      expect(getPersonalizationEngine()).not.toBe(firstEngine);
      
      secondEngine.destroy();
    });

    it('should return null when no engine is initialized', () => {
      const engine = getPersonalizationEngine();
      engine?.destroy();
      
      expect(getPersonalizationEngine()).toBeNull();
    });
  });
});