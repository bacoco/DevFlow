export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  category: NotificationCategory;
  timestamp: Date;
  expiresAt?: Date;
  actions?: NotificationAction[];
  metadata?: Record<string, any>;
  userId: string;
  read: boolean;
  dismissed: boolean;
  groupId?: string;
}

export type NotificationType = 
  | 'productivity_alert'
  | 'system_update'
  | 'team_insight'
  | 'achievement'
  | 'reminder'
  | 'error'
  | 'warning'
  | 'info';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type NotificationCategory = 
  | 'performance'
  | 'collaboration'
  | 'system'
  | 'personal'
  | 'team'
  | 'security';

export interface NotificationAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'destructive';
  handler: () => void | Promise<void>;
}

export interface NotificationGroup {
  id: string;
  title: string;
  notifications: Notification[];
  category: NotificationCategory;
  priority: NotificationPriority;
  createdAt: Date;
  collapsed: boolean;
}

export interface NotificationPreferences {
  userId: string;
  channels: NotificationChannelPreferences;
  frequency: NotificationFrequencyPreferences;
  categories: NotificationCategoryPreferences;
  quietHours: QuietHoursConfig;
  escalation: EscalationPreferences;
}

export interface NotificationChannelPreferences {
  inApp: boolean;
  email: boolean;
  push: boolean;
  desktop: boolean;
  mobile: boolean;
}

export interface NotificationFrequencyPreferences {
  immediate: NotificationCategory[];
  batched: NotificationCategory[];
  daily: NotificationCategory[];
  weekly: NotificationCategory[];
  disabled: NotificationCategory[];
}

export interface NotificationCategoryPreferences {
  [key in NotificationCategory]: {
    enabled: boolean;
    priority: NotificationPriority;
    channels: (keyof NotificationChannelPreferences)[];
  };
}

export interface QuietHoursConfig {
  enabled: boolean;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  timezone: string;
  allowUrgent: boolean;
}

export interface EscalationPreferences {
  enabled: boolean;
  urgentDelay: number; // minutes
  highDelay: number; // minutes
  maxEscalations: number;
  escalationChannels: (keyof NotificationChannelPreferences)[];
}

export interface UserAvailability {
  userId: string;
  status: 'available' | 'busy' | 'away' | 'do_not_disturb';
  lastActivity: Date;
  timezone: string;
  workingHours?: WorkingHoursConfig;
}

export interface WorkingHoursConfig {
  monday: TimeRange;
  tuesday: TimeRange;
  wednesday: TimeRange;
  thursday: TimeRange;
  friday: TimeRange;
  saturday: TimeRange;
  sunday: TimeRange;
}

export interface TimeRange {
  start: string; // HH:mm format
  end: string; // HH:mm format
  enabled: boolean;
}

export interface NotificationAnalytics {
  userId: string;
  notificationId: string;
  event: NotificationEvent;
  timestamp: Date;
  context: NotificationContext;
}

export type NotificationEvent = 
  | 'delivered'
  | 'viewed'
  | 'clicked'
  | 'dismissed'
  | 'snoozed'
  | 'escalated'
  | 'expired';

export interface NotificationContext {
  channel: keyof NotificationChannelPreferences;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  location: string; // page/route where notification was shown
  userActivity: 'active' | 'idle' | 'away';
}

export interface DismissalPattern {
  userId: string;
  category: NotificationCategory;
  type: NotificationType;
  dismissalRate: number;
  averageTimeToAction: number;
  preferredActions: string[];
  lastUpdated: Date;
}

export interface NotificationBatch {
  id: string;
  userId: string;
  notifications: Notification[];
  scheduledFor: Date;
  delivered: boolean;
  category: NotificationCategory;
}

export interface EscalationRule {
  id: string;
  userId: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  delay: number; // minutes
  targetChannel: keyof NotificationChannelPreferences;
  condition: EscalationCondition;
}

export interface EscalationCondition {
  type: 'time_based' | 'availability_based' | 'interaction_based';
  parameters: Record<string, any>;
}