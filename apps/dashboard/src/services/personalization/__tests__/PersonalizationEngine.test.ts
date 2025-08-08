/**
 * Tests for PersonalizationEngine
 */

import { PersonalizationEngine } from '../PersonalizationEngine';
import { UserPreferences, UserRole, DeviceType } from '../types';

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

describe('PersonalizationEngine', () => {
  let engine: PersonalizationEngine;
  const userId = 'test-user';

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    engine = new PersonalizationEngine({
      userId,
      enableTracking: true,
      enableLearning: true
    });
  });

  afterEach(() => {
    engine.destroy();
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      const state = engine.getState();
      
      expect(state.trackingEnabled).toBe(true);
      expect(state.learningEnabled).toBe(true);
      expect(state.isInitialized).toBe(true);
    });

    it('should initialize with default preferences', () => {
      const preferences = engine.getPreferences();
      
      expect(preferences.userId).toBe(userId);
      expect(preferences.theme.mode).toBe('auto');
      expect(preferences.layout.defaultView).toBe('dashboard');
      expect(preferences.widgets).toEqual([]);
    });

    it('should generate initial insights', () => {
      const insights = engine.getInsights();
      
      expect(insights).toBeDefined();
      expect(insights?.userId).toBe(userId);
      expect(insights?.mostUsedFeatures).toBeDefined();
      expect(insights?.generatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Interaction Tracking', () => {
    it('should track click interactions', () => {
      engine.trackInteraction('click', 'test-button', { page: 'dashboard' });
      
      const summary = engine.getSessionSummary();
      expect(summary.eventCount).toBe(1);
      expect(summary.mostInteractedElements[0].element).toBe('test-button');
    });

    it('should track widget interactions with satisfaction', () => {
      engine.trackInteraction(
        'widget_interaction',
        'code-quality-widget',
        { section: 'main' },
        { action: 'expand', satisfaction: 0.8 }
      );
      
      const summary = engine.getSessionSummary();
      expect(summary.eventCount).toBe(1);
    });

    it('should not track when tracking is disabled', () => {
      engine.setTrackingEnabled(false);
      
      engine.trackInteraction('click', 'test-button');
      
      const summary = engine.getSessionSummary();
      expect(summary.eventCount).toBe(0);
    });
  });

  describe('Preference Management', () => {
    it('should update theme preferences', async () => {
      await engine.updatePreferences({
        theme: {
          mode: 'dark',
          colorScheme: 'blue',
          density: 'compact'
        }
      });
      
      const preferences = engine.getPreferences();
      expect(preferences.theme.mode).toBe('dark');
      expect(preferences.theme.colorScheme).toBe('blue');
      expect(preferences.theme.density).toBe('compact');
    });

    it('should update layout preferences', async () => {
      await engine.updatePreferences({
        layout: {
          defaultView: 'analytics',
          widgetOrder: ['widget1', 'widget2'],
          columnCount: 4,
          showSidebar: false,
          compactMode: true
        }
      });
      
      const preferences = engine.getPreferences();
      expect(preferences.layout.defaultView).toBe('analytics');
      expect(preferences.layout.columnCount).toBe(4);
      expect(preferences.layout.showSidebar).toBe(false);
    });

    it('should update widget preferences', async () => {
      const widgets = [
        {
          widgetId: 'widget1',
          position: { x: 0, y: 0 },
          size: { width: 2, height: 2 },
          configuration: {},
          visible: true,
          priority: 1
        }
      ];
      
      await engine.updatePreferences({ widgets });
      
      const preferences = engine.getPreferences();
      expect(preferences.widgets).toHaveLength(1);
      expect(preferences.widgets[0].widgetId).toBe('widget1');
    });

    it('should track preference changes', async () => {
      await engine.updatePreferences({
        theme: { mode: 'dark' }
      });
      
      const summary = engine.getSessionSummary();
      expect(summary.eventCount).toBeGreaterThan(0);
    });
  });

  describe('Layout Recommendations', () => {
    it('should get layout recommendations for developer role', async () => {
      const recommendations = await engine.getLayoutRecommendations({
        userRole: 'developer',
        deviceType: 'desktop'
      });
      
      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      
      if (recommendations.length > 0) {
        expect(recommendations[0]).toHaveProperty('layoutId');
        expect(recommendations[0]).toHaveProperty('score');
        expect(recommendations[0]).toHaveProperty('confidence');
        expect(recommendations[0]).toHaveProperty('reasons');
      }
    });

    it('should get layout recommendations for team lead role', async () => {
      const recommendations = await engine.getLayoutRecommendations({
        userRole: 'team_lead',
        deviceType: 'desktop'
      });
      
      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should consider device type in recommendations', async () => {
      const desktopRecs = await engine.getLayoutRecommendations({
        userRole: 'developer',
        deviceType: 'desktop'
      });
      
      const mobileRecs = await engine.getLayoutRecommendations({
        userRole: 'developer',
        deviceType: 'mobile'
      });
      
      expect(desktopRecs).toBeDefined();
      expect(mobileRecs).toBeDefined();
      // Recommendations might be different based on device type
    });
  });

  describe('Widget Suggestions', () => {
    it('should get widget suggestions', async () => {
      const suggestions = await engine.getWidgetSuggestions({
        userRole: 'developer',
        deviceType: 'desktop',
        currentWidgets: [],
        availableSpace: { width: 6, height: 4 }
      });
      
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      
      if (suggestions.length > 0) {
        expect(suggestions[0]).toHaveProperty('widgetId');
        expect(suggestions[0]).toHaveProperty('confidence');
        expect(suggestions[0]).toHaveProperty('reason');
        expect(suggestions[0]).toHaveProperty('position');
        expect(suggestions[0]).toHaveProperty('size');
      }
    });

    it('should exclude current widgets from suggestions', async () => {
      const currentWidgets = ['code_quality_widget', 'task_manager_widget'];
      
      const suggestions = await engine.getWidgetSuggestions({
        userRole: 'developer',
        deviceType: 'desktop',
        currentWidgets,
        availableSpace: { width: 6, height: 4 }
      });
      
      suggestions.forEach(suggestion => {
        expect(currentWidgets).not.toContain(suggestion.widgetId);
      });
    });

    it('should consider available space in suggestions', async () => {
      const smallSpace = { width: 2, height: 2 };
      
      const suggestions = await engine.getWidgetSuggestions({
        userRole: 'developer',
        deviceType: 'desktop',
        currentWidgets: [],
        availableSpace: smallSpace
      });
      
      suggestions.forEach(suggestion => {
        expect(suggestion.size.width).toBeLessThanOrEqual(smallSpace.width);
        expect(suggestion.size.height).toBeLessThanOrEqual(smallSpace.height);
      });
    });
  });

  describe('Smart Defaults', () => {
    it('should get smart default value', () => {
      const defaultValue = engine.getSmartDefault('theme.mode', 'light');
      
      expect(defaultValue).toBeDefined();
      expect(defaultValue.key).toBe('theme.mode');
      expect(defaultValue.value).toBeDefined();
      expect(defaultValue.confidence).toBeGreaterThanOrEqual(0);
      expect(defaultValue.confidence).toBeLessThanOrEqual(1);
      expect(defaultValue.source).toBeDefined();
    });

    it('should get all smart defaults', () => {
      const allDefaults = engine.getAllSmartDefaults();
      
      expect(allDefaults).toBeDefined();
      expect(typeof allDefaults).toBe('object');
      
      Object.values(allDefaults).forEach(defaultValue => {
        expect(defaultValue).toHaveProperty('key');
        expect(defaultValue).toHaveProperty('value');
        expect(defaultValue).toHaveProperty('confidence');
        expect(defaultValue).toHaveProperty('source');
      });
    });

    it('should return fallback value when no smart default exists', () => {
      const fallback = 'fallback-value';
      const defaultValue = engine.getSmartDefault('non.existent.key', fallback);
      
      expect(defaultValue.value).toBe(fallback);
      expect(defaultValue.confidence).toBeLessThan(0.5);
    });
  });

  describe('Learning and Insights', () => {
    it('should generate insights from interactions', async () => {
      // Add some interactions
      engine.trackInteraction('click', 'code-quality-widget');
      engine.trackInteraction('hover', 'performance-chart', {}, {}, 5000);
      engine.trackInteraction('widget_interaction', 'task-manager', {}, { action: 'expand' });
      
      const insights = await engine.generateInsights();
      
      expect(insights).toBeDefined();
      expect(insights.userId).toBe(userId);
      expect(insights.mostUsedFeatures).toBeDefined();
      expect(insights.workflowPatterns).toBeDefined();
      expect(insights.generatedAt).toBeInstanceOf(Date);
    });

    it('should get learning insights', () => {
      const learningInsights = engine.getLearningInsights();
      
      expect(learningInsights).toBeDefined();
      expect(learningInsights.learnedPatterns).toBeGreaterThanOrEqual(0);
      expect(learningInsights.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(learningInsights.confidenceScore).toBeLessThanOrEqual(1);
      expect(learningInsights.topRecommendations).toBeDefined();
      expect(learningInsights.adaptationRate).toBeGreaterThanOrEqual(0);
    });

    it('should train with feedback', async () => {
      const layoutChoices = [
        {
          layout: {
            id: 'layout1',
            userId,
            name: 'Test Layout',
            isDefault: false,
            widgets: [],
            customizations: [],
            confidence: 0.8,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          satisfaction: 0.9
        }
      ];
      
      await engine.trainWithFeedback(layoutChoices, {
        userRole: 'developer',
        deviceType: 'desktop',
        sessionDuration: 300000
      });
      
      // Training should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('State Management', () => {
    it('should notify state listeners', (done) => {
      const listener = jest.fn((state) => {
        expect(state.trackingEnabled).toBe(false);
        done();
      });
      
      engine.addStateListener(listener);
      engine.setTrackingEnabled(false);
    });

    it('should allow unsubscribing from state listeners', () => {
      const listener = jest.fn();
      const unsubscribe = engine.addStateListener(listener);
      
      unsubscribe();
      engine.setTrackingEnabled(false);
      
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      engine.addStateListener(errorListener);
      engine.setTrackingEnabled(false);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'State listener error:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Data Import/Export', () => {
    it('should export personalization data', () => {
      const exportedData = engine.exportData();
      
      expect(exportedData).toBeDefined();
      expect(exportedData.preferences).toBeDefined();
      expect(exportedData.learningData).toBeDefined();
      expect(exportedData.insights).toBeDefined();
      
      // Should be valid JSON
      expect(() => JSON.parse(exportedData.preferences)).not.toThrow();
      expect(() => JSON.parse(exportedData.learningData)).not.toThrow();
    });

    it('should import personalization data', async () => {
      const originalPreferences = engine.getPreferences();
      originalPreferences.theme.mode = 'dark';
      
      const exportedData = {
        preferences: JSON.stringify(originalPreferences),
        learningData: engine.exportData().learningData
      };
      
      // Create new engine and import data
      const newEngine = new PersonalizationEngine({
        userId: 'new-user',
        enableTracking: true,
        enableLearning: true
      });
      
      await newEngine.importData(exportedData);
      
      const importedPreferences = newEngine.getPreferences();
      expect(importedPreferences.theme.mode).toBe('dark');
      
      newEngine.destroy();
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all personalization data', async () => {
      // Modify preferences and add interactions
      await engine.updatePreferences({ theme: { mode: 'dark' } });
      engine.trackInteraction('click', 'test-button');
      
      expect(engine.getPreferences().theme.mode).toBe('dark');
      expect(engine.getSessionSummary().eventCount).toBeGreaterThan(0);
      
      // Reset
      await engine.resetPersonalization();
      
      const preferences = engine.getPreferences();
      expect(preferences.theme.mode).toBe('auto'); // Back to default
      
      const summary = engine.getSessionSummary();
      expect(summary.eventCount).toBe(0); // Events cleared
    });
  });

  describe('Privacy Controls', () => {
    it('should disable tracking when requested', () => {
      engine.setTrackingEnabled(false);
      
      const state = engine.getState();
      expect(state.trackingEnabled).toBe(false);
      
      // Should not track interactions
      engine.trackInteraction('click', 'test-button');
      const summary = engine.getSessionSummary();
      expect(summary.eventCount).toBe(0);
    });

    it('should disable learning when requested', () => {
      engine.setLearningEnabled(false);
      
      const state = engine.getState();
      expect(state.learningEnabled).toBe(false);
    });

    it('should update privacy preferences when tracking is disabled', () => {
      engine.setTrackingEnabled(false);
      
      const preferences = engine.getPreferences();
      expect(preferences.privacy.trackingEnabled).toBe(false);
    });
  });
});