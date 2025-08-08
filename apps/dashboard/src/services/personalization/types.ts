/**
 * Types for the personalization engine and adaptive UI system
 */

export interface UserInteractionEvent {
  id: string;
  userId: string;
  sessionId: string;
  type: InteractionType;
  element: string;
  timestamp: Date;
  duration?: number;
  context: InteractionContext;
  metadata: Record<string, any>;
}

export type InteractionType = 
  | 'click'
  | 'hover'
  | 'scroll'
  | 'focus'
  | 'resize'
  | 'navigation'
  | 'widget_interaction'
  | 'preference_change'
  | 'search'
  | 'filter'
  | 'export'
  | 'share';

export interface InteractionContext {
  page: string;
  section: string;
  userRole: UserRole;
  deviceType: DeviceType;
  timeOfDay: number;
  dayOfWeek: number;
}

export type UserRole = 'developer' | 'team_lead' | 'manager' | 'admin';
export type DeviceType = 'desktop' | 'tablet' | 'mobile';

export interface UserPreferences {
  id: string;
  userId: string;
  theme: ThemePreference;
  layout: LayoutPreference;
  widgets: WidgetPreference[];
  notifications: NotificationPreference;
  accessibility: AccessibilityPreferences;
  privacy: PrivacyPreferences;
  lastUpdated: Date;
  syncedAt?: Date;
}

export interface ThemePreference {
  mode: 'light' | 'dark' | 'auto';
  colorScheme: string;
  density: 'compact' | 'comfortable' | 'spacious';
  customColors?: Record<string, string>;
}

export interface LayoutPreference {
  defaultView: string;
  widgetOrder: string[];
  columnCount: number;
  showSidebar: boolean;
  compactMode: boolean;
}

export interface WidgetPreference {
  widgetId: string;
  position: GridPosition;
  size: WidgetSize;
  configuration: Record<string, any>;
  visible: boolean;
  priority: number;
}

export interface GridPosition {
  x: number;
  y: number;
}

export interface WidgetSize {
  width: number;
  height: number;
}

export interface NotificationPreference {
  enabled: boolean;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  channels: NotificationChannel[];
  quietHours: QuietHours;
}

export type NotificationChannel = 'in_app' | 'email' | 'push' | 'desktop';

export interface QuietHours {
  enabled: boolean;
  startTime: string;
  endTime: string;
  timezone: string;
}

export interface AccessibilityPreferences {
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: FontScale;
  screenReaderOptimized: boolean;
  keyboardNavigation: boolean;
  colorBlindnessFilter?: ColorBlindnessType;
}

export type FontScale = 'small' | 'medium' | 'large' | 'extra-large';
export type ColorBlindnessType = 'protanopia' | 'deuteranopia' | 'tritanopia';

export interface PrivacyPreferences {
  trackingEnabled: boolean;
  analyticsEnabled: boolean;
  personalizationEnabled: boolean;
  dataRetentionDays: number;
  shareUsageData: boolean;
}

export interface LayoutConfiguration {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  widgets: WidgetPlacement[];
  customizations: LayoutCustomization[];
  confidence: number; // ML confidence score
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetPlacement {
  widgetId: string;
  position: GridPosition;
  size: WidgetSize;
  configuration: Record<string, any>;
  visibility: VisibilityRule[];
}

export interface VisibilityRule {
  condition: string;
  value: any;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
}

export interface LayoutCustomization {
  type: 'color' | 'spacing' | 'typography' | 'animation';
  property: string;
  value: any;
}

export interface WidgetSuggestion {
  widgetId: string;
  confidence: number;
  reason: string;
  position: GridPosition;
  size: WidgetSize;
  configuration: Record<string, any>;
}

export interface PersonalizationInsights {
  userId: string;
  mostUsedFeatures: FeatureUsage[];
  preferredTimeOfDay: number[];
  deviceUsagePattern: DeviceUsagePattern;
  workflowPatterns: WorkflowPattern[];
  recommendations: Recommendation[];
  generatedAt: Date;
}

export interface FeatureUsage {
  feature: string;
  usageCount: number;
  averageDuration: number;
  lastUsed: Date;
}

export interface DeviceUsagePattern {
  desktop: number;
  tablet: number;
  mobile: number;
}

export interface WorkflowPattern {
  name: string;
  steps: string[];
  frequency: number;
  averageDuration: number;
}

export interface Recommendation {
  type: 'widget' | 'layout' | 'feature' | 'workflow';
  title: string;
  description: string;
  confidence: number;
  action: RecommendationAction;
}

export interface RecommendationAction {
  type: 'add_widget' | 'change_layout' | 'enable_feature' | 'suggest_workflow';
  payload: Record<string, any>;
}

export interface SmartDefault {
  key: string;
  value: any;
  context: DefaultContext;
  confidence: number;
  source: 'user_behavior' | 'role_based' | 'team_pattern' | 'global_pattern';
}

export interface DefaultContext {
  userRole: UserRole;
  teamSize?: number;
  industry?: string;
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
}