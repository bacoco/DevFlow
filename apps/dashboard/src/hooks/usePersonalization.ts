/**
 * React hooks for personalization engine integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  PersonalizationEngine, 
  PersonalizationState,
  UserPreferences,
  WidgetSuggestion,
  PersonalizationInsights,
  SmartDefault,
  UserRole,
  DeviceType,
  InteractionType,
  InteractionContext,
  LayoutConfiguration
} from '../services/personalization';

let globalPersonalizationEngine: PersonalizationEngine | null = null;

/**
 * Initialize the global personalization engine
 */
export function initializePersonalization(userId: string, options?: {
  deviceId?: string;
  enableTracking?: boolean;
  enableLearning?: boolean;
}): PersonalizationEngine {
  if (globalPersonalizationEngine) {
    globalPersonalizationEngine.destroy();
  }

  globalPersonalizationEngine = new PersonalizationEngine({
    userId,
    deviceId: options?.deviceId,
    enableTracking: options?.enableTracking,
    enableLearning: options?.enableLearning
  });

  return globalPersonalizationEngine;
}

/**
 * Get the global personalization engine instance
 */
export function getPersonalizationEngine(): PersonalizationEngine | null {
  return globalPersonalizationEngine;
}

/**
 * Main personalization hook
 */
export function usePersonalization() {
  const [state, setState] = useState<PersonalizationState>({
    isInitialized: false,
    trackingEnabled: true,
    learningEnabled: true
  });
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [insights, setInsights] = useState<PersonalizationInsights | null>(null);

  const engine = getPersonalizationEngine();

  useEffect(() => {
    if (!engine) return;

    // Get initial state and preferences
    setState(engine.getState());
    setPreferences(engine.getPreferences());
    setInsights(engine.getInsights());

    // Listen for state changes
    const unsubscribe = engine.addStateListener((newState) => {
      setState(newState);
      setPreferences(engine.getPreferences());
      setInsights(engine.getInsights());
    });

    return unsubscribe;
  }, [engine]);

  const trackInteraction = useCallback((
    type: InteractionType,
    element: string,
    context?: Partial<InteractionContext>,
    metadata?: Record<string, any>,
    duration?: number
  ) => {
    engine?.trackInteraction(type, element, context, metadata, duration);
  }, [engine]);

  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    if (engine) {
      await engine.updatePreferences(updates);
    }
  }, [engine]);

  const generateInsights = useCallback(async () => {
    if (engine) {
      const newInsights = await engine.generateInsights();
      setInsights(newInsights);
      return newInsights;
    }
    return null;
  }, [engine]);

  const resetPersonalization = useCallback(async () => {
    if (engine) {
      await engine.resetPersonalization();
    }
  }, [engine]);

  return {
    // State
    state,
    preferences,
    insights,
    isInitialized: state.isInitialized,
    
    // Actions
    trackInteraction,
    updatePreferences,
    generateInsights,
    resetPersonalization,
    
    // Engine reference for advanced usage
    engine
  };
}

/**
 * Hook for tracking user interactions
 */
export function useInteractionTracker() {
  const engine = getPersonalizationEngine();

  const trackClick = useCallback((element: string, context?: Partial<InteractionContext>, metadata?: Record<string, any>) => {
    engine?.trackInteraction('click', element, context, metadata);
  }, [engine]);

  const trackHover = useCallback((element: string, duration: number, context?: Partial<InteractionContext>) => {
    engine?.trackInteraction('hover', element, context, { duration }, duration);
  }, [engine]);

  const trackNavigation = useCallback((fromPage: string, toPage: string, context?: Partial<InteractionContext>) => {
    engine?.trackInteraction('navigation', `${fromPage} -> ${toPage}`, context, { fromPage, toPage });
  }, [engine]);

  const trackWidgetInteraction = useCallback((
    widgetId: string,
    action: string,
    context?: Partial<InteractionContext>,
    metadata?: Record<string, any>
  ) => {
    engine?.trackInteraction('widget_interaction', widgetId, context, { action, ...metadata });
  }, [engine]);

  const trackSearch = useCallback((query: string, resultsCount: number, context?: Partial<InteractionContext>) => {
    engine?.trackInteraction('search', 'global_search', context, {
      queryLength: query.length,
      resultsCount
    });
  }, [engine]);

  return {
    trackClick,
    trackHover,
    trackNavigation,
    trackWidgetInteraction,
    trackSearch
  };
}

/**
 * Hook for getting widget suggestions
 */
export function useWidgetSuggestions(
  userRole: UserRole,
  deviceType: DeviceType,
  currentWidgets: string[],
  availableSpace: { width: number; height: number }
) {
  const [suggestions, setSuggestions] = useState<WidgetSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const engine = getPersonalizationEngine();

  const refreshSuggestions = useCallback(async () => {
    if (!engine) return;

    setLoading(true);
    try {
      const newSuggestions = await engine.getWidgetSuggestions({
        userRole,
        deviceType,
        currentWidgets,
        availableSpace
      });
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Failed to get widget suggestions:', error);
    } finally {
      setLoading(false);
    }
  }, [engine, userRole, deviceType, currentWidgets, availableSpace]);

  useEffect(() => {
    refreshSuggestions();
  }, [refreshSuggestions]);

  return {
    suggestions,
    loading,
    refreshSuggestions
  };
}

/**
 * Hook for getting layout recommendations
 */
export function useLayoutRecommendations(
  userRole: UserRole,
  deviceType: DeviceType,
  currentLayout?: LayoutConfiguration
) {
  const [recommendations, setRecommendations] = useState<Array<{
    layoutId: string;
    score: number;
    confidence: number;
    reasons: string[];
  }>>([]);
  const [loading, setLoading] = useState(false);
  const engine = getPersonalizationEngine();

  const refreshRecommendations = useCallback(async () => {
    if (!engine) return;

    setLoading(true);
    try {
      const newRecommendations = await engine.getLayoutRecommendations({
        userRole,
        deviceType
      }, currentLayout);
      setRecommendations(newRecommendations);
    } catch (error) {
      console.error('Failed to get layout recommendations:', error);
    } finally {
      setLoading(false);
    }
  }, [engine, userRole, deviceType, currentLayout]);

  useEffect(() => {
    refreshRecommendations();
  }, [refreshRecommendations]);

  return {
    recommendations,
    loading,
    refreshRecommendations
  };
}

/**
 * Hook for smart defaults
 */
export function useSmartDefaults() {
  const engine = getPersonalizationEngine();

  const getSmartDefault = useCallback((key: string, fallbackValue?: any): SmartDefault | null => {
    return engine?.getSmartDefault(key, fallbackValue) || null;
  }, [engine]);

  const getAllSmartDefaults = useCallback((): Record<string, SmartDefault> => {
    return engine?.getAllSmartDefaults() || {};
  }, [engine]);

  return {
    getSmartDefault,
    getAllSmartDefaults
  };
}

/**
 * Hook for preference management
 */
export function usePreferences() {
  const { preferences, updatePreferences } = usePersonalization();

  const updateTheme = useCallback(async (theme: Partial<UserPreferences['theme']>) => {
    if (preferences) {
      await updatePreferences({ theme: { ...preferences.theme, ...theme } });
    }
  }, [preferences, updatePreferences]);

  const updateLayout = useCallback(async (layout: Partial<UserPreferences['layout']>) => {
    if (preferences) {
      await updatePreferences({ layout: { ...preferences.layout, ...layout } });
    }
  }, [preferences, updatePreferences]);

  const updateAccessibility = useCallback(async (accessibility: Partial<UserPreferences['accessibility']>) => {
    if (preferences) {
      await updatePreferences({ accessibility: { ...preferences.accessibility, ...accessibility } });
    }
  }, [preferences, updatePreferences]);

  const updatePrivacy = useCallback(async (privacy: Partial<UserPreferences['privacy']>) => {
    if (preferences) {
      await updatePreferences({ privacy: { ...preferences.privacy, ...privacy } });
    }
  }, [preferences, updatePreferences]);

  return {
    preferences,
    updateTheme,
    updateLayout,
    updateAccessibility,
    updatePrivacy,
    updatePreferences
  };
}

/**
 * Hook for session analytics
 */
export function useSessionAnalytics() {
  const [sessionSummary, setSessionSummary] = useState<{
    sessionId: string;
    startTime: Date;
    duration: number;
    eventCount: number;
    uniqueElements: number;
    mostInteractedElements: Array<{ element: string; count: number }>;
  } | null>(null);

  const engine = getPersonalizationEngine();

  const refreshSessionSummary = useCallback(() => {
    if (engine) {
      const summary = engine.getSessionSummary();
      setSessionSummary(summary);
    }
  }, [engine]);

  useEffect(() => {
    // Refresh session summary periodically
    const interval = setInterval(refreshSessionSummary, 30000); // Every 30 seconds
    refreshSessionSummary(); // Initial load

    return () => clearInterval(interval);
  }, [refreshSessionSummary]);

  return {
    sessionSummary,
    refreshSessionSummary
  };
}

/**
 * Hook for learning insights
 */
export function useLearningInsights() {
  const [learningInsights, setLearningInsights] = useState<{
    learnedPatterns: number;
    confidenceScore: number;
    topRecommendations: Array<{ key: string; value: any; reason: string }>;
    adaptationRate: number;
  } | null>(null);

  const engine = getPersonalizationEngine();

  const refreshLearningInsights = useCallback(() => {
    if (engine) {
      const insights = engine.getLearningInsights();
      setLearningInsights(insights);
    }
  }, [engine]);

  useEffect(() => {
    refreshLearningInsights();
    
    // Refresh when insights change
    const interval = setInterval(refreshLearningInsights, 60000); // Every minute
    return () => clearInterval(interval);
  }, [refreshLearningInsights]);

  return {
    learningInsights,
    refreshLearningInsights
  };
}