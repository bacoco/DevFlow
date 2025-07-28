export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  teamIds: string[];
  privacySettings: PrivacySettings;
  preferences: UserPreferences;
}

export interface Team {
  id: string;
  name: string;
  memberIds: string[];
  projectIds: string[];
  settings: TeamSettings;
}

export interface ProductivityMetric {
  id: string;
  userId: string;
  metricType: MetricType;
  value: number;
  timestamp: Date;
  aggregationPeriod: TimePeriod;
  context: MetricContext;
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  config: WidgetConfig;
  data: WidgetData;
  permissions: Permission[];
  position: WidgetPosition;
}

export interface Dashboard {
  id: string;
  userId: string;
  name: string;
  widgets: Widget[];
  layout: DashboardLayout;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

export type UserRole = 'developer' | 'team_lead' | 'manager' | 'admin';

export type MetricType = 
  | 'time_in_flow'
  | 'code_churn'
  | 'review_lag'
  | 'commit_frequency'
  | 'bug_rate'
  | 'productivity_score';

export type WidgetType = 
  | 'line_chart'
  | 'bar_chart'
  | 'pie_chart'
  | 'metric_card'
  | 'activity_feed'
  | 'team_overview'
  | 'code_quality'
  | 'flow_state';

export type TimePeriod = 'hour' | 'day' | 'week' | 'month' | 'quarter';

export interface WidgetConfig {
  title?: string;
  timeRange: TimePeriod;
  metrics: MetricType[];
  filters: Record<string, any>;
  chartOptions: ChartOptions;
}

export interface WidgetData {
  metrics: ProductivityMetric[];
  chartData: ChartData;
  summary: MetricSummary;
  lastUpdated: Date;
}

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardLayout {
  columns: number;
  rowHeight: number;
  margin: [number, number];
  containerPadding: [number, number];
}

export interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  scales?: any;
  plugins?: any;
}

export interface MetricSummary {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface MetricContext {
  teamId?: string;
  projectId?: string;
  repository?: string;
  branch?: string;
}

export interface PrivacySettings {
  userId: string;
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
  anonymizedSharing: boolean;
}

export interface RetentionSettings {
  period: number; // in days
  autoDelete: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  timezone: string;
  notifications: NotificationSettings;
  dashboard: DashboardPreferences;
}

export interface NotificationSettings {
  email: boolean;
  inApp: boolean;
  slack: boolean;
  frequency: 'immediate' | 'hourly' | 'daily';
}

export interface DashboardPreferences {
  defaultTimeRange: TimePeriod;
  autoRefresh: boolean;
  refreshInterval: number; // in seconds
  compactMode: boolean;
}

export interface TeamSettings {
  privacyLevel: 'open' | 'restricted' | 'private';
  metricsSharing: boolean;
  alertSettings: AlertSettings;
}

export interface AlertSettings {
  enabled: boolean;
  thresholds: Record<MetricType, number>;
  channels: string[];
}

export interface Permission {
  action: 'read' | 'write' | 'delete';
  resource: string;
  conditions?: Record<string, any>;
}

export type AnonymizationLevel = 'none' | 'partial' | 'full';