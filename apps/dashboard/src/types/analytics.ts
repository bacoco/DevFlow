/**
 * Analytics types for task analytics and reporting features
 */

export interface TaskAnalytics {
  id: string;
  userId?: string;
  teamId?: string;
  timeRange: TimeRange;
  generatedAt: string;
  metrics: TaskMetrics;
  trends: TaskTrends;
  insights: TaskInsight[];
}

export interface TaskMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  overdueTasks: number;
  completionRate: number;
  averageCompletionTime: number; // in hours
  velocity: number; // tasks per day
  burndownRate: number; // percentage
  cycleTime: number; // average time from start to completion
  leadTime: number; // average time from creation to completion
}

export interface TaskTrends {
  completion: TrendData[];
  velocity: TrendData[];
  burndown: TrendData[];
  cycleTime: TrendData[];
  workload: TrendData[];
}

export interface TrendData {
  date: string;
  value: number;
  target?: number;
  label?: string;
}

export interface TaskInsight {
  id: string;
  type: 'pattern' | 'recommendation' | 'achievement' | 'warning' | 'bottleneck';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number; // 0-100
  actionable: boolean;
  actions?: InsightAction[];
  metadata?: Record<string, any>;
}

export interface InsightAction {
  id: string;
  title: string;
  description: string;
  type: 'process' | 'tool' | 'training' | 'resource';
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}

export interface TeamPerformanceMetrics {
  teamId: string;
  teamName: string;
  timeRange: TimeRange;
  members: TeamMemberMetrics[];
  aggregatedMetrics: TaskMetrics;
  comparisons: {
    previousPeriod: TaskMetrics;
    teamAverage: TaskMetrics;
    organizationAverage?: TaskMetrics;
  };
  rankings: {
    velocity: TeamMemberRanking[];
    quality: TeamMemberRanking[];
    efficiency: TeamMemberRanking[];
  };
}

export interface TeamMemberMetrics {
  userId: string;
  name: string;
  email: string;
  role?: string;
  metrics: TaskMetrics;
  trends: TaskTrends;
  productivityScore: number;
  focusScore: number;
  collaborationScore: number;
  qualityScore: number;
}

export interface TeamMemberRanking {
  userId: string;
  name: string;
  score: number;
  rank: number;
  change: number; // change from previous period
}

export interface ProductivityReport {
  id: string;
  title: string;
  description?: string;
  type: ReportType;
  scope: ReportScope;
  timeRange: TimeRange;
  filters: ReportFilters;
  data: TaskAnalytics | TeamPerformanceMetrics;
  charts: ReportChart[];
  insights: TaskInsight[];
  recommendations: string[];
  createdAt: string;
  createdBy: string;
  format: ExportFormat[];
}

export interface ReportChart {
  id: string;
  title: string;
  type: ChartType;
  data: any;
  config: ChartConfig;
  description?: string;
}

export interface ChartConfig {
  xAxis?: string;
  yAxis?: string;
  groupBy?: string;
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
  colors?: string[];
  showTrend?: boolean;
  showTarget?: boolean;
}

export interface ReportFilters {
  userIds?: string[];
  teamIds?: string[];
  projectIds?: string[];
  taskStatuses?: string[];
  taskPriorities?: string[];
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export type TimeRange = 
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'last90days'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'lastQuarter'
  | 'thisYear'
  | 'lastYear'
  | 'custom';

export type ReportType = 
  | 'individual'
  | 'team'
  | 'project'
  | 'organization'
  | 'comparative'
  | 'trend'
  | 'burndown'
  | 'velocity'
  | 'quality';

export type ReportScope = 
  | 'user'
  | 'team'
  | 'project'
  | 'organization';

export type ChartType = 
  | 'line'
  | 'bar'
  | 'pie'
  | 'area'
  | 'scatter'
  | 'burndown'
  | 'velocity'
  | 'heatmap'
  | 'gauge'
  | 'funnel';

export type ExportFormat = 
  | 'pdf'
  | 'csv'
  | 'json'
  | 'xlsx'
  | 'png'
  | 'svg';

export interface AnalyticsFilters {
  timeRange?: TimeRange;
  startDate?: string;
  endDate?: string;
  userIds?: string[];
  teamIds?: string[];
  projectIds?: string[];
  taskStatuses?: string[];
  taskPriorities?: string[];
  tags?: string[];
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'user' | 'team' | 'project';
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
}

export interface BurndownData {
  date: string;
  ideal: number;
  actual: number;
  remaining: number;
  completed: number;
  scope?: number; // for scope changes
}

export interface VelocityData {
  period: string;
  planned: number;
  completed: number;
  velocity: number;
  capacity: number;
  efficiency: number; // completed / planned
}

export interface CycleTimeData {
  taskId: string;
  title: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  leadTime: number; // creation to completion
  cycleTime: number; // start to completion
  stages: CycleTimeStage[];
}

export interface CycleTimeStage {
  stage: string;
  enteredAt: string;
  exitedAt?: string;
  duration: number; // in hours
}

export interface QualityMetrics {
  defectRate: number; // percentage of tasks with issues
  reworkRate: number; // percentage of tasks requiring rework
  firstTimeRight: number; // percentage completed without rework
  customerSatisfaction?: number; // if available
  codeQuality?: {
    coverage: number;
    complexity: number;
    maintainability: number;
  };
}