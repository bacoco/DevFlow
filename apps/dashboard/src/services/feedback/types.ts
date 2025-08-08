/**
 * Types for user feedback and continuous improvement system
 */

export interface FeedbackWidget {
  id: string
  type: 'survey' | 'rating' | 'nps' | 'csat' | 'quick-feedback'
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'modal' | 'inline'
  trigger: FeedbackTrigger
  content: FeedbackContent
  targeting: FeedbackTargeting
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface FeedbackTrigger {
  type: 'time-based' | 'action-based' | 'page-based' | 'manual'
  conditions: TriggerCondition[]
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'always'
  delay?: number // milliseconds
}

export interface TriggerCondition {
  type: 'page-visit' | 'feature-usage' | 'time-spent' | 'error-encountered' | 'task-completed'
  value: string | number
  operator: 'equals' | 'greater-than' | 'less-than' | 'contains'
}

export interface FeedbackContent {
  title: string
  description?: string
  questions: FeedbackQuestion[]
  thankYouMessage: string
  customization: FeedbackCustomization
}

export interface FeedbackQuestion {
  id: string
  type: 'text' | 'rating' | 'scale' | 'multiple-choice' | 'yes-no' | 'nps' | 'csat'
  question: string
  required: boolean
  options?: string[]
  scale?: {
    min: number
    max: number
    labels?: { [key: number]: string }
  }
}

export interface FeedbackCustomization {
  theme: 'light' | 'dark' | 'auto'
  primaryColor: string
  borderRadius: number
  animation: boolean
  showBranding: boolean
}

export interface FeedbackTargeting {
  userSegments: string[]
  pages: string[]
  features: string[]
  excludeUsers: string[]
  percentage: number // 0-100, percentage of users to show to
}

export interface FeedbackResponse {
  id: string
  widgetId: string
  userId?: string
  sessionId: string
  responses: { [questionId: string]: any }
  metadata: FeedbackMetadata
  submittedAt: Date
}

export interface FeedbackMetadata {
  userAgent: string
  viewport: { width: number; height: number }
  page: string
  referrer: string
  timeOnPage: number
  deviceType: 'desktop' | 'tablet' | 'mobile'
  userContext: UserContext
}

export interface UserContext {
  role: string
  tenure: number // days since first login
  featureUsage: { [feature: string]: number }
  lastActivity: Date
  preferences: Record<string, any>
}

// Analytics Types
export interface UserBehaviorEvent {
  id: string
  userId?: string
  sessionId: string
  type: BehaviorEventType
  element: string
  page: string
  timestamp: Date
  duration?: number
  metadata: Record<string, any>
}

export type BehaviorEventType = 
  | 'page-view'
  | 'click'
  | 'scroll'
  | 'hover'
  | 'focus'
  | 'form-submit'
  | 'search'
  | 'filter'
  | 'export'
  | 'share'
  | 'error'
  | 'feature-discovery'
  | 'task-completion'
  | 'abandonment';

export interface UsabilityMetric {
  id: string
  type: UsabilityMetricType
  value: number
  threshold: number
  status: 'good' | 'warning' | 'critical'
  timestamp: Date
  context: MetricContext
}

export type UsabilityMetricType =
  | 'task-completion-rate'
  | 'task-completion-time'
  | 'error-rate'
  | 'bounce-rate'
  | 'feature-adoption-rate'
  | 'user-satisfaction'
  | 'nps-score'
  | 'csat-score'
  | 'page-load-time'
  | 'interaction-response-time';

export interface MetricContext {
  page?: string
  feature?: string
  userSegment?: string
  timeRange: { start: Date; end: Date }
  sampleSize: number
}

export interface UsabilityAlert {
  id: string
  type: 'threshold-breach' | 'trend-change' | 'anomaly-detected'
  severity: 'low' | 'medium' | 'high' | 'critical'
  metric: UsabilityMetricType
  message: string
  details: AlertDetails
  createdAt: Date
  acknowledgedAt?: Date
  resolvedAt?: Date
}

export interface AlertDetails {
  currentValue: number
  threshold: number
  previousValue?: number
  trend: 'improving' | 'declining' | 'stable'
  affectedUsers: number
  suggestedActions: string[]
}

// Feature Usage Analytics
export interface FeatureUsageData {
  featureId: string
  featureName: string
  category: string
  usageCount: number
  uniqueUsers: number
  averageSessionsPerUser: number
  retentionRate: number
  adoptionRate: number
  timeToFirstUse: number
  lastUsed: Date
  trends: UsageTrend[]
}

export interface UsageTrend {
  period: 'daily' | 'weekly' | 'monthly'
  data: { date: Date; value: number }[]
  changePercent: number
  direction: 'up' | 'down' | 'stable'
}

// NPS and CSAT Types
export interface NPSResponse {
  id: string
  userId?: string
  score: number // 0-10
  category: 'detractor' | 'passive' | 'promoter'
  comment?: string
  context: string
  submittedAt: Date
}

export interface CSATResponse {
  id: string
  userId?: string
  score: number // 1-5
  feature: string
  comment?: string
  submittedAt: Date
}

export interface SatisfactionMetrics {
  nps: {
    score: number
    responseCount: number
    distribution: { detractors: number; passives: number; promoters: number }
    trend: number // change from previous period
  }
  csat: {
    averageScore: number
    responseCount: number
    distribution: { [score: number]: number }
    byFeature: { [feature: string]: number }
  }
  period: { start: Date; end: Date }
}

// Dashboard and Reporting Types
export interface UXDashboardData {
  overview: UXOverview
  usabilityMetrics: UsabilityMetric[]
  featureUsage: FeatureUsageData[]
  satisfaction: SatisfactionMetrics
  recentFeedback: FeedbackResponse[]
  alerts: UsabilityAlert[]
  trends: UXTrend[]
}

export interface UXOverview {
  totalUsers: number
  activeUsers: number
  newUsers: number
  retentionRate: number
  averageSessionDuration: number
  bounceRate: number
  errorRate: number
  satisfactionScore: number
}

export interface UXTrend {
  metric: string
  current: number
  previous: number
  change: number
  changePercent: number
  direction: 'up' | 'down' | 'stable'
  isGood: boolean
}

// Configuration Types
export interface FeedbackSystemConfig {
  enabled: boolean
  widgets: FeedbackWidget[]
  analytics: AnalyticsConfig
  alerts: AlertConfig
  privacy: PrivacyConfig
}

export interface AnalyticsConfig {
  trackingEnabled: boolean
  retentionDays: number
  samplingRate: number
  excludeInternalUsers: boolean
  anonymizeData: boolean
}

export interface AlertConfig {
  enabled: boolean
  channels: AlertChannel[]
  thresholds: { [metric: string]: number }
  frequency: 'immediate' | 'hourly' | 'daily'
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook'
  config: Record<string, any>
  enabled: boolean
}

export interface PrivacyConfig {
  consentRequired: boolean
  dataRetentionDays: number
  allowOptOut: boolean
  anonymizeAfterDays: number
  excludeFields: string[]
}