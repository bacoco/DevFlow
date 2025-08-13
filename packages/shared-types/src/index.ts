import { z } from 'zod';

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export enum UserRole {
  DEVELOPER = 'developer',
  TEAM_LEAD = 'team_lead',
  MANAGER = 'manager',
  ADMIN = 'admin'
}

export enum MetricType {
  TIME_IN_FLOW = 'time_in_flow',
  CODE_CHURN = 'code_churn',
  REVIEW_LAG = 'review_lag',
  FOCUS_TIME = 'focus_time',
  COMPLEXITY_TREND = 'complexity_trend',
  COLLABORATION_SCORE = 'collaboration_score'
}

export enum PrivacyLevel {
  PUBLIC = 'public',
  TEAM = 'team',
  PRIVATE = 'private'
}

export enum TimePeriod {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month'
}

export enum AnonymizationLevel {
  NONE = 'none',
  PARTIAL = 'partial',
  FULL = 'full'
}

export enum GitEventType {
  COMMIT = 'commit',
  PUSH = 'push',
  PULL_REQUEST = 'pull_request',
  MERGE = 'merge',
  BRANCH_CREATE = 'branch_create',
  BRANCH_DELETE = 'branch_delete'
}

export enum IDEEventType {
  KEYSTROKE = 'keystroke',
  FILE_CHANGE = 'file_change',
  DEBUG = 'debug',
  FOCUS = 'focus',
  BUILD = 'build',
  TEST_RUN = 'test_run'
}

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

// Privacy and Settings Schemas
export const DataCollectionSettingsSchema = z.object({
  ideTelemtry: z.boolean(),
  gitActivity: z.boolean(),
  communicationData: z.boolean(),
  granularControls: z.record(z.string(), z.boolean())
});

export const SharingSettingsSchema = z.object({
  shareWithTeam: z.boolean(),
  shareWithManager: z.boolean(),
  shareAggregatedMetrics: z.boolean(),
  allowComparisons: z.boolean()
});

export const RetentionSettingsSchema = z.object({
  personalDataRetentionDays: z.number().min(1).max(730), // Max 2 years
  aggregatedDataRetentionDays: z.number().min(30).max(2555), // Max 7 years
  autoDeleteAfterInactivity: z.boolean()
});

export const PrivacySettingsSchema = z.object({
  userId: z.string().uuid(),
  dataCollection: DataCollectionSettingsSchema,
  sharing: SharingSettingsSchema,
  retention: RetentionSettingsSchema,
  anonymization: z.nativeEnum(AnonymizationLevel)
});

export const NotificationSettingsSchema = z.object({
  email: z.boolean(),
  inApp: z.boolean(),
  slack: z.boolean(),
  frequency: z.enum(['immediate', 'hourly', 'daily', 'weekly']),
  quietHours: z.object({
    enabled: z.boolean(),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  })
});

export const DashboardSettingsSchema = z.object({
  defaultTimeRange: z.nativeEnum(TimePeriod),
  autoRefresh: z.boolean(),
  refreshInterval: z.number().min(30).max(3600), // 30 seconds to 1 hour
  widgetLayout: z.array(z.object({
    id: z.string(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number()
  }))
});

export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']),
  notifications: NotificationSettingsSchema,
  dashboard: DashboardSettingsSchema,
  timezone: z.string(),
  language: z.string().length(2)
});

export const AlertSettingsSchema = z.object({
  productivityThreshold: z.number().min(0).max(100),
  qualityThreshold: z.number().min(0).max(100),
  escalationEnabled: z.boolean(),
  escalationDelayMinutes: z.number().min(5).max(1440)
});

export const TeamSettingsSchema = z.object({
  privacyLevel: z.nativeEnum(PrivacyLevel),
  dataRetention: z.number().min(30).max(730),
  alertSettings: AlertSettingsSchema,
  workingHours: z.object({
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    timezone: z.string(),
    workingDays: z.array(z.number().min(0).max(6))
  })
});

// Core Entity Schemas
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.nativeEnum(UserRole),
  teamIds: z.array(z.string().uuid()),
  privacySettings: PrivacySettingsSchema,
  preferences: UserPreferencesSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  lastActiveAt: z.date().optional(),
  isActive: z.boolean().default(true)
});

export const TeamSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  memberIds: z.array(z.string().uuid()),
  projectIds: z.array(z.string().uuid()),
  settings: TeamSettingsSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  isActive: z.boolean().default(true)
});

// Git Event Schemas
export const GitEventMetadataSchema = z.object({
  commitHash: z.string().optional(),
  branch: z.string().optional(),
  pullRequestId: z.string().optional(),
  linesAdded: z.number().min(0).optional(),
  linesDeleted: z.number().min(0).optional(),
  filesChanged: z.array(z.string()).optional(),
  reviewers: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
  isMerge: z.boolean().optional(),
  parentCommits: z.array(z.string()).optional()
});

export const GitEventSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(GitEventType),
  repository: z.string().min(1),
  author: z.string().min(1),
  timestamp: z.date(),
  metadata: GitEventMetadataSchema,
  privacyLevel: z.nativeEnum(PrivacyLevel).default(PrivacyLevel.TEAM)
});

// IDE Telemetry Schemas
export const TelemetryDataSchema = z.object({
  fileName: z.string().optional(),
  fileExtension: z.string().optional(),
  projectPath: z.string().optional(),
  keystrokeCount: z.number().min(0).optional(),
  focusDurationMs: z.number().min(0).optional(),
  interruptionCount: z.number().min(0).optional(),
  debugSessionId: z.string().optional(),
  buildResult: z.enum(['success', 'failure', 'cancelled']).optional(),
  testResults: z.object({
    passed: z.number().min(0),
    failed: z.number().min(0),
    skipped: z.number().min(0)
  }).optional(),
  errorCount: z.number().min(0).optional(),
  warningCount: z.number().min(0).optional()
});

export const IDETelemetrySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  eventType: z.nativeEnum(IDEEventType),
  timestamp: z.date(),
  data: TelemetryDataSchema,
  privacyLevel: z.nativeEnum(PrivacyLevel).default(PrivacyLevel.PRIVATE)
});

// Metrics Schemas
export const MetricContextSchema = z.object({
  projectId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  repository: z.string().optional(),
  branch: z.string().optional(),
  environment: z.enum(['development', 'staging', 'production']).optional(),
  tags: z.record(z.string(), z.string()).optional()
});

export const ProductivityMetricSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  metricType: z.nativeEnum(MetricType),
  value: z.number(),
  timestamp: z.date(),
  aggregationPeriod: z.nativeEnum(TimePeriod),
  context: MetricContextSchema,
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

// Flow State Schema
export const ActivitySchema = z.object({
  type: z.enum(['coding', 'debugging', 'testing', 'reviewing', 'meeting']),
  startTime: z.date(),
  endTime: z.date(),
  intensity: z.number().min(0).max(1),
  interruptions: z.number().min(0)
});

export const FlowStateSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  startTime: z.date(),
  endTime: z.date().optional(),
  interruptionCount: z.number().min(0),
  focusScore: z.number().min(0).max(1),
  activities: z.array(ActivitySchema),
  totalFocusTimeMs: z.number().min(0),
  deepWorkPercentage: z.number().min(0).max(1)
});

// ============================================================================
// TYPESCRIPT INTERFACES (derived from Zod schemas)
// ============================================================================

export type DataCollectionSettings = z.infer<typeof DataCollectionSettingsSchema>;
export type SharingSettings = z.infer<typeof SharingSettingsSchema>;
export type RetentionSettings = z.infer<typeof RetentionSettingsSchema>;
export type PrivacySettings = z.infer<typeof PrivacySettingsSchema>;
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;
export type DashboardSettings = z.infer<typeof DashboardSettingsSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type AlertSettings = z.infer<typeof AlertSettingsSchema>;
export type TeamSettings = z.infer<typeof TeamSettingsSchema>;

export type User = z.infer<typeof UserSchema>;
export type Team = z.infer<typeof TeamSchema>;
export type GitEventMetadata = z.infer<typeof GitEventMetadataSchema>;
export type GitEvent = z.infer<typeof GitEventSchema>;
export type TelemetryData = z.infer<typeof TelemetryDataSchema>;
export type IDETelemetry = z.infer<typeof IDETelemetrySchema>;
export type MetricContext = z.infer<typeof MetricContextSchema>;
export type ProductivityMetric = z.infer<typeof ProductivityMetricSchema>;
export type Activity = z.infer<typeof ActivitySchema>;
export type FlowState = z.infer<typeof FlowStateSchema>;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export const validateUser = (data: unknown): User => UserSchema.parse(data);
export const validateTeam = (data: unknown): Team => TeamSchema.parse(data);
export const validateGitEvent = (data: unknown): GitEvent => GitEventSchema.parse(data);
export const validateIDETelemetry = (data: unknown): IDETelemetry => IDETelemetrySchema.parse(data);
export const validateProductivityMetric = (data: unknown): ProductivityMetric => ProductivityMetricSchema.parse(data);
export const validateFlowState = (data: unknown): FlowState => FlowStateSchema.parse(data);

// Safe validation functions that return results instead of throwing
export const safeValidateUser = (data: unknown) => UserSchema.safeParse(data);
export const safeValidateTeam = (data: unknown) => TeamSchema.safeParse(data);
export const safeValidateGitEvent = (data: unknown) => GitEventSchema.safeParse(data);
export const safeValidateIDETelemetry = (data: unknown) => IDETelemetrySchema.safeParse(data);
export const safeValidateProductivityMetric = (data: unknown) => ProductivityMetricSchema.safeParse(data);
export const safeValidateFlowState = (data: unknown) => FlowStateSchema.safeParse(data);

// ============================================================================
// UTILITY TYPES AND FUNCTIONS
// ============================================================================

export type CreateUserInput = Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'lastActiveAt'>;
export type UpdateUserInput = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;
export type CreateTeamInput = Omit<Team, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateTeamInput = Partial<Omit<Team, 'id' | 'createdAt' | 'updatedAt'>>;

// Helper function to create default privacy settings
export const createDefaultPrivacySettings = (userId: string): PrivacySettings => ({
  userId,
  dataCollection: {
    ideTelemtry: true,
    gitActivity: true,
    communicationData: false,
    granularControls: {}
  },
  sharing: {
    shareWithTeam: true,
    shareWithManager: true,
    shareAggregatedMetrics: true,
    allowComparisons: false
  },
  retention: {
    personalDataRetentionDays: 365,
    aggregatedDataRetentionDays: 1095,
    autoDeleteAfterInactivity: true
  },
  anonymization: AnonymizationLevel.PARTIAL
});

// Helper function to create default user preferences
export const createDefaultUserPreferences = (): UserPreferences => ({
  theme: 'auto',
  notifications: {
    email: true,
    inApp: true,
    slack: false,
    frequency: 'daily',
    quietHours: {
      enabled: true,
      startTime: '18:00',
      endTime: '09:00'
    }
  },
  dashboard: {
    defaultTimeRange: TimePeriod.WEEK,
    autoRefresh: true,
    refreshInterval: 300,
    widgetLayout: []
  },
  timezone: 'UTC',
  language: 'en'
});

// ============================================================================
// WELLNESS TYPES AND FUNCTIONS
// ============================================================================

export * from './wellness';