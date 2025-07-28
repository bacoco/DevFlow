import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
  id?: string;
  email: string;
  name: string;
  role: UserRole;
  teamIds: string[];
  privacySettings: PrivacySettings;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

export interface Team {
  _id?: ObjectId;
  id?: string;
  name: string;
  description?: string;
  memberIds: string[];
  projectIds: string[];
  settings: TeamSettings;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface Project {
  _id?: ObjectId;
  id?: string;
  name: string;
  description?: string;
  teamId: string;
  repositoryUrl?: string;
  settings: ProjectSettings;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface Dashboard {
  _id?: ObjectId;
  id?: string;
  userId: string;
  name: string;
  layout: DashboardLayout;
  widgets: Widget[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Alert {
  _id?: ObjectId;
  id?: string;
  userId: string;
  teamId?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  context: AlertContext;
  status: AlertStatus;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  acknowledgedAt?: Date;
}

export interface AuditLog {
  _id?: ObjectId;
  id?: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

// Enums and supporting types
export enum UserRole {
  DEVELOPER = 'developer',
  TEAM_LEAD = 'team_lead',
  MANAGER = 'manager',
  ADMIN = 'admin'
}

export enum AlertType {
  PRODUCTIVITY_ANOMALY = 'productivity_anomaly',
  QUALITY_THRESHOLD = 'quality_threshold',
  ACHIEVEMENT = 'achievement',
  SYSTEM = 'system'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed'
}

export interface PrivacySettings {
  dataCollection: DataCollectionSettings;
  sharing: SharingSettings;
  retention: RetentionSettings;
  anonymization: AnonymizationLevel;
}

export interface DataCollectionSettings {
  ideTelemetry: boolean;
  gitActivity: boolean;
  communicationData: boolean;
  granularControls: Record<string, boolean>;
}

export interface SharingSettings {
  teamMetrics: boolean;
  individualMetrics: boolean;
  anonymousAggregation: boolean;
}

export interface RetentionSettings {
  personalData: number; // days
  aggregatedData: number; // days
  auditLogs: number; // days
}

export enum AnonymizationLevel {
  NONE = 'none',
  PARTIAL = 'partial',
  FULL = 'full'
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  timezone: string;
  language: string;
  notifications: NotificationPreferences;
  dashboard: DashboardPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  slack: boolean;
  teams: boolean;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
}

export interface DashboardPreferences {
  defaultView: string;
  refreshInterval: number;
  showTutorials: boolean;
  compactMode: boolean;
}

export interface TeamSettings {
  workingHours: WorkingHours;
  timezone: string;
  sprintDuration: number;
  codeReviewSettings: CodeReviewSettings;
  privacyLevel: 'open' | 'restricted' | 'private';
}

export interface WorkingHours {
  monday: TimeRange;
  tuesday: TimeRange;
  wednesday: TimeRange;
  thursday: TimeRange;
  friday: TimeRange;
  saturday?: TimeRange;
  sunday?: TimeRange;
}

export interface TimeRange {
  start: string; // HH:mm format
  end: string; // HH:mm format
}

export interface CodeReviewSettings {
  requiredReviewers: number;
  autoAssignment: boolean;
  maxReviewTime: number; // hours
}

export interface ProjectSettings {
  trackingEnabled: boolean;
  metricsConfig: MetricsConfig;
  integrations: ProjectIntegrations;
}

export interface MetricsConfig {
  flowMetrics: boolean;
  codeQuality: boolean;
  collaboration: boolean;
  customMetrics: Record<string, boolean>;
}

export interface ProjectIntegrations {
  git: GitIntegration;
  ci: CIIntegration;
  communication: CommunicationIntegration;
}

export interface GitIntegration {
  provider: 'github' | 'gitlab' | 'bitbucket';
  repositoryUrl: string;
  webhookUrl?: string;
  accessToken?: string;
}

export interface CIIntegration {
  provider: 'jenkins' | 'github_actions' | 'gitlab_ci';
  webhookUrl?: string;
  accessToken?: string;
}

export interface CommunicationIntegration {
  slack?: SlackIntegration;
  teams?: TeamsIntegration;
}

export interface SlackIntegration {
  workspaceId: string;
  channelId: string;
  botToken?: string;
}

export interface TeamsIntegration {
  tenantId: string;
  channelId: string;
  webhookUrl?: string;
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  widgets: WidgetPosition[];
}

export interface WidgetPosition {
  widgetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  config: WidgetConfig;
  permissions: WidgetPermissions;
}

export enum WidgetType {
  FLOW_METRICS = 'flow_metrics',
  CODE_QUALITY = 'code_quality',
  TEAM_VELOCITY = 'team_velocity',
  ALERTS = 'alerts',
  ACHIEVEMENTS = 'achievements',
  CUSTOM = 'custom'
}

export interface WidgetConfig {
  timeRange: string;
  filters: Record<string, any>;
  visualization: VisualizationConfig;
  refreshInterval: number;
}

export interface VisualizationConfig {
  chartType: 'line' | 'bar' | 'pie' | 'gauge' | 'table';
  colors: string[];
  showLegend: boolean;
  showGrid: boolean;
}

export interface WidgetPermissions {
  view: string[];
  edit: string[];
}

export interface AlertContext {
  metricType: string;
  threshold: number;
  actualValue: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  affectedUsers?: string[];
  recommendations?: string[];
}

// Database query interfaces
export interface QueryOptions {
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
  projection?: Record<string, 1 | 0>;
}

export interface FilterOptions {
  userId?: string;
  teamId?: string;
  projectId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  isActive?: boolean;
}

export interface BackupConfig {
  schedule: string; // cron expression
  retention: number; // days
  destination: string; // S3 bucket or file path
  compression: boolean;
  encryption: boolean;
}