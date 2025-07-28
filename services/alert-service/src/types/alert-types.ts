export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum AlertType {
  PRODUCTIVITY_ANOMALY = 'productivity_anomaly',
  QUALITY_THRESHOLD = 'quality_threshold',
  FLOW_INTERRUPTION = 'flow_interruption',
  DELIVERY_RISK = 'delivery_risk',
  TEAM_PERFORMANCE = 'team_performance',
  SECURITY_CONCERN = 'security_concern'
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  SUPPRESSED = 'suppressed'
}

export enum NotificationChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  TEAMS = 'teams',
  IN_APP = 'in_app',
  WEBHOOK = 'webhook'
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  type: AlertType;
  severity: AlertSeverity;
  enabled: boolean;
  conditions: AlertCondition[];
  actions: AlertAction[];
  cooldownPeriod: number; // minutes
  escalationPolicy?: EscalationPolicy;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertCondition {
  id: string;
  metricType: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'ne';
  threshold: number;
  timeWindow: number; // minutes
  aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count';
}

export interface AlertAction {
  id: string;
  type: 'notification' | 'webhook' | 'escalation';
  config: Record<string, any>;
  delay?: number; // minutes
}

export interface Alert {
  id: string;
  ruleId: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  context: AlertContext;
  recommendations: Recommendation[];
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  resolvedBy?: string;
  escalationLevel: number;
  suppressedUntil?: Date;
}

export interface AlertContext {
  userId?: string;
  teamId?: string;
  projectId?: string;
  metricValues: Record<string, number>;
  timeRange: {
    start: Date;
    end: Date;
  };
  additionalData?: Record<string, any>;
}

export interface Recommendation {
  id: string;
  type: 'action' | 'insight' | 'resource';
  title: string;
  description: string;
  priority: number;
  actionUrl?: string;
  estimatedImpact?: string;
}

export interface EscalationPolicy {
  id: string;
  name: string;
  levels: EscalationLevel[];
}

export interface EscalationLevel {
  level: number;
  delay: number; // minutes
  channels: NotificationChannel[];
  recipients: string[];
  conditions?: EscalationCondition[];
}

export interface EscalationCondition {
  type: 'time_elapsed' | 'severity_increase' | 'manual_trigger';
  value?: number;
}

export interface AlertFeedback {
  alertId: string;
  userId: string;
  relevance: 'very_relevant' | 'relevant' | 'somewhat_relevant' | 'not_relevant';
  actionTaken: boolean;
  comments?: string;
  timestamp: Date;
}

export interface NotificationTemplate {
  id: string;
  channel: NotificationChannel;
  alertType: AlertType;
  subject: string;
  body: string;
  variables: string[];
}

export interface NotificationDelivery {
  id: string;
  alertId: string;
  channel: NotificationChannel;
  recipient: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  error?: string;
  retryCount: number;
}

export interface AlertMetrics {
  totalAlerts: number;
  alertsByType: Record<AlertType, number>;
  alertsBySeverity: Record<AlertSeverity, number>;
  averageResolutionTime: number;
  falsePositiveRate: number;
  escalationRate: number;
}

export interface MLAnomalyResult {
  isAnomaly: boolean;
  confidence: number;
  anomalyScore: number;
  expectedValue: number;
  actualValue: number;
  contributingFactors: string[];
}