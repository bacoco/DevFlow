// Temporary shared types for ML pipeline until workspace dependencies are resolved

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

export interface GitEventMetadata {
  commitHash?: string;
  branch?: string;
  pullRequestId?: string;
  linesAdded?: number;
  linesDeleted?: number;
  filesChanged?: string[];
  reviewers?: string[];
  labels?: string[];
  isMerge?: boolean;
  parentCommits?: string[];
}

export interface GitEvent {
  id: string;
  type: GitEventType;
  repository: string;
  author: string;
  timestamp: Date;
  metadata: GitEventMetadata;
  privacyLevel: PrivacyLevel;
}

export interface TelemetryData {
  fileName?: string;
  fileExtension?: string;
  projectPath?: string;
  keystrokeCount?: number;
  focusDurationMs?: number;
  interruptionCount?: number;
  debugSessionId?: string;
  buildResult?: 'success' | 'failure' | 'cancelled';
  testResults?: {
    passed: number;
    failed: number;
    skipped: number;
  };
  errorCount?: number;
  warningCount?: number;
}

export interface IDETelemetry {
  id: string;
  userId: string;
  sessionId: string;
  eventType: IDEEventType;
  timestamp: Date;
  data: TelemetryData;
  privacyLevel: PrivacyLevel;
}

export interface MetricContext {
  projectId?: string;
  teamId?: string;
  repository?: string;
  branch?: string;
  environment?: 'development' | 'staging' | 'production';
  tags?: Record<string, string>;
}

export interface ProductivityMetric {
  id: string;
  userId: string;
  metricType: MetricType;
  value: number;
  timestamp: Date;
  aggregationPeriod: TimePeriod;
  context: MetricContext;
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface Activity {
  type: 'coding' | 'debugging' | 'testing' | 'reviewing' | 'meeting';
  startTime: Date;
  endTime: Date;
  intensity: number;
  interruptions: number;
}

export interface FlowState {
  userId: string;
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  interruptionCount: number;
  focusScore: number;
  activities: Activity[];
  totalFocusTimeMs: number;
  deepWorkPercentage: number;
}