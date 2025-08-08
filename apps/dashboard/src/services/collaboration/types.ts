/**
 * Collaboration and Social Features Types
 * Defines interfaces for sharing, annotations, team insights, achievements, and social learning
 */

// Core User and Team Types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  teamId: string;
  preferences: UserPreferences;
}

export interface Team {
  id: string;
  name: string;
  members: User[];
  settings: TeamSettings;
  privacy: PrivacyLevel;
}

export type UserRole = 'developer' | 'team_lead' | 'manager' | 'admin';
export type PrivacyLevel = 'public' | 'team' | 'private';

// Content Sharing Types
export interface ShareableContent {
  id: string;
  type: ContentType;
  title: string;
  description?: string;
  data: any;
  createdBy: string;
  createdAt: Date;
  metadata: ContentMetadata;
}

export type ContentType = 'dashboard' | 'chart' | 'insight' | 'annotation' | 'report';

export interface ContentMetadata {
  tags: string[];
  category: string;
  version: number;
  size: number;
  format: string;
}

export interface ShareRequest {
  contentId: string;
  recipients: ShareRecipient[];
  permissions: SharePermission[];
  message?: string;
  expiresAt?: Date;
  notifyRecipients: boolean;
}

export interface ShareRecipient {
  type: 'user' | 'team' | 'role';
  id: string;
  name: string;
}

export interface SharePermission {
  action: ShareAction;
  granted: boolean;
  conditions?: PermissionCondition[];
}

export type ShareAction = 'view' | 'comment' | 'edit' | 'share' | 'download' | 'delete';

export interface PermissionCondition {
  type: 'time_limit' | 'ip_restriction' | 'device_limit';
  value: any;
}

export interface SharedContent {
  id: string;
  contentId: string;
  sharedBy: string;
  sharedWith: ShareRecipient[];
  permissions: SharePermission[];
  shareUrl: string;
  accessCount: number;
  lastAccessed?: Date;
  expiresAt?: Date;
  createdAt: Date;
  isActive: boolean;
}

// Annotation System Types
export interface Annotation {
  id: string;
  authorId: string;
  targetType: AnnotationTarget;
  targetId: string;
  position: AnnotationPosition;
  content: string;
  type: AnnotationType;
  visibility: VisibilityScope;
  replies: AnnotationReply[];
  reactions: AnnotationReaction[];
  createdAt: Date;
  updatedAt: Date;
  isResolved: boolean;
}

export type AnnotationTarget = 'chart' | 'widget' | 'dashboard' | 'insight';
export type AnnotationType = 'comment' | 'question' | 'suggestion' | 'issue' | 'highlight';
export type VisibilityScope = 'public' | 'team' | 'private' | 'mentioned_users';

export interface AnnotationPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
  elementId?: string;
  context?: string;
}

export interface AnnotationReply {
  id: string;
  authorId: string;
  content: string;
  createdAt: Date;
  reactions: AnnotationReaction[];
}

export interface AnnotationReaction {
  userId: string;
  type: ReactionType;
  createdAt: Date;
}

export type ReactionType = 'like' | 'helpful' | 'agree' | 'disagree' | 'question';

// Team Insights Types
export interface TeamInsights {
  teamId: string;
  period: TimePeriod;
  metrics: TeamMetric[];
  trends: TeamTrend[];
  comparisons: TeamComparison[];
  privacy: InsightsPrivacy;
  generatedAt: Date;
}

export interface TeamMetric {
  name: string;
  value: number;
  unit: string;
  change: number;
  changeDirection: 'up' | 'down' | 'stable';
  benchmark?: number;
  category: MetricCategory;
}

export type MetricCategory = 'productivity' | 'collaboration' | 'quality' | 'engagement';

export interface TeamTrend {
  metric: string;
  dataPoints: TrendDataPoint[];
  direction: TrendDirection;
  confidence: number;
  insights: string[];
}

export interface TrendDataPoint {
  timestamp: Date;
  value: number;
  anonymizedContributors: number;
}

export type TrendDirection = 'increasing' | 'decreasing' | 'stable' | 'volatile';

export interface TeamComparison {
  metric: string;
  teamValue: number;
  benchmarkValue: number;
  percentile: number;
  category: string;
}

export interface InsightsPrivacy {
  anonymizeIndividuals: boolean;
  aggregationLevel: AggregationLevel;
  excludeMetrics: string[];
  retentionDays: number;
}

export type AggregationLevel = 'individual' | 'team' | 'department' | 'organization';

// Achievement and Gamification Types
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  difficulty: AchievementDifficulty;
  points: number;
  criteria: AchievementCriteria;
  rewards: AchievementReward[];
  isSecret: boolean;
  isRepeatable: boolean;
}

export type AchievementCategory = 'productivity' | 'collaboration' | 'learning' | 'quality' | 'innovation';
export type AchievementDifficulty = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface AchievementCriteria {
  type: CriteriaType;
  conditions: CriteriaCondition[];
  timeframe?: TimeFrame;
}

export type CriteriaType = 'single_action' | 'cumulative' | 'streak' | 'milestone';

export interface CriteriaCondition {
  metric: string;
  operator: ComparisonOperator;
  value: number;
  context?: string;
}

export type ComparisonOperator = 'equals' | 'greater_than' | 'less_than' | 'between';
export type TimeFrame = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface AchievementReward {
  type: RewardType;
  value: any;
  description: string;
}

export type RewardType = 'badge' | 'points' | 'feature_unlock' | 'customization' | 'recognition';

export interface UserAchievement {
  userId: string;
  achievementId: string;
  unlockedAt: Date;
  progress: number;
  isCompleted: boolean;
  currentStreak?: number;
  bestStreak?: number;
  metadata: Record<string, any>;
}

// Social Learning Types
export interface BestPractice {
  id: string;
  title: string;
  description: string;
  category: BestPracticeCategory;
  difficulty: LearningDifficulty;
  tags: string[];
  content: LearningContent;
  author: string;
  votes: number;
  usage: BestPracticeUsage;
  createdAt: Date;
  updatedAt: Date;
}

export type BestPracticeCategory = 'workflow' | 'code_quality' | 'collaboration' | 'productivity' | 'tools';
export type LearningDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface LearningContent {
  steps: LearningStep[];
  examples: CodeExample[];
  resources: LearningResource[];
  tips: string[];
}

export interface LearningStep {
  title: string;
  description: string;
  action?: string;
  expectedOutcome?: string;
}

export interface CodeExample {
  language: string;
  code: string;
  explanation: string;
  before?: string;
  after?: string;
}

export interface LearningResource {
  type: ResourceType;
  title: string;
  url: string;
  description?: string;
}

export type ResourceType = 'documentation' | 'video' | 'article' | 'tool' | 'template';

export interface BestPracticeUsage {
  views: number;
  implementations: number;
  ratings: BestPracticeRating[];
  feedback: BestPracticeFeedback[];
}

export interface BestPracticeRating {
  userId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

export interface BestPracticeFeedback {
  userId: string;
  type: FeedbackType;
  content: string;
  isHelpful: boolean;
  createdAt: Date;
}

export type FeedbackType = 'improvement' | 'question' | 'success_story' | 'issue';

export interface LearningRecommendation {
  userId: string;
  bestPracticeId: string;
  reason: RecommendationReason;
  confidence: number;
  context: RecommendationContext;
  createdAt: Date;
}

export interface RecommendationReason {
  type: ReasonType;
  explanation: string;
  relatedMetrics: string[];
}

export type ReasonType = 'skill_gap' | 'team_trend' | 'performance_improvement' | 'role_based' | 'peer_success';

export interface RecommendationContext {
  currentSkillLevel: LearningDifficulty;
  teamContext: string[];
  recentActivity: string[];
  goals: string[];
}

// Common Types
export interface TimePeriod {
  start: Date;
  end: Date;
  granularity: TimeGranularity;
}

export type TimeGranularity = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface UserPreferences {
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
  collaboration: CollaborationPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  push: boolean;
  frequency: NotificationFrequency;
  types: NotificationType[];
}

export type NotificationFrequency = 'immediate' | 'hourly' | 'daily' | 'weekly';
export type NotificationType = 'share' | 'comment' | 'achievement' | 'recommendation' | 'mention';

export interface PrivacyPreferences {
  profileVisibility: VisibilityScope;
  activityVisibility: VisibilityScope;
  metricsVisibility: VisibilityScope;
  allowDataCollection: boolean;
}

export interface CollaborationPreferences {
  autoShare: boolean;
  allowAnnotations: boolean;
  mentionNotifications: boolean;
  teamInsightsParticipation: boolean;
}

export interface TeamSettings {
  allowExternalSharing: boolean;
  defaultSharePermissions: SharePermission[];
  annotationPolicy: AnnotationPolicy;
  insightsRetention: number;
  gamificationEnabled: boolean;
}

export interface AnnotationPolicy {
  allowAnonymous: boolean;
  requireApproval: boolean;
  allowedTypes: AnnotationType[];
  moderators: string[];
}

// API Response Types
export interface CollaborationResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: ResponseMetadata;
}

export interface ResponseMetadata {
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
}

// Event Types
export interface CollaborationEvent {
  type: CollaborationEventType;
  userId: string;
  targetId: string;
  targetType: string;
  data: any;
  timestamp: Date;
}

export type CollaborationEventType = 
  | 'content_shared'
  | 'annotation_created'
  | 'annotation_replied'
  | 'achievement_unlocked'
  | 'best_practice_viewed'
  | 'team_insights_generated';