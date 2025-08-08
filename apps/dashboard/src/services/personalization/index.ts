/**
 * Personalization engine exports
 */

export { PersonalizationEngine } from './PersonalizationEngine';
export { BehaviorTracker } from './BehaviorTracker';
export { PreferenceManager } from './PreferenceManager';
export { LayoutRecommendationEngine } from './LayoutRecommendationEngine';
export { AdaptiveWidgetEngine } from './AdaptiveWidgetEngine';
export { SmartDefaultsEngine } from './SmartDefaultsEngine';

export * from './types';

// Re-export commonly used types
export type {
  UserPreferences,
  UserInteractionEvent,
  LayoutConfiguration,
  WidgetSuggestion,
  PersonalizationInsights,
  SmartDefault,
  UserRole,
  DeviceType,
  InteractionType,
  InteractionContext
} from './types';