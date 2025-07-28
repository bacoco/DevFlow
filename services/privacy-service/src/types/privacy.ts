export interface PrivacySettings {
  userId: string;
  dataCollection: DataCollectionSettings;
  sharing: SharingSettings;
  retention: RetentionSettings;
  anonymization: AnonymizationLevel;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataCollectionSettings {
  ideTelemtry: boolean;
  gitActivity: boolean;
  communicationData: boolean;
  granularControls: Record<string, boolean>;
}

export interface SharingSettings {
  teamMetrics: boolean;
  individualMetrics: boolean;
  aggregatedInsights: boolean;
  externalIntegrations: boolean;
}

export interface RetentionSettings {
  personalData: number; // days
  aggregatedData: number; // days
  auditLogs: number; // days
  autoDelete: boolean;
}

export enum AnonymizationLevel {
  NONE = 'none',
  BASIC = 'basic',
  ENHANCED = 'enhanced',
  FULL = 'full'
}

export enum PrivacyLevel {
  PUBLIC = 'public',
  TEAM = 'team',
  PRIVATE = 'private',
  RESTRICTED = 'restricted'
}

export interface PrivacyRule {
  id: string;
  userId: string;
  dataType: string;
  condition: PrivacyCondition;
  action: PrivacyAction;
  priority: number;
  isActive: boolean;
}

export interface PrivacyCondition {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
  value: any;
}

export enum PrivacyAction {
  ALLOW = 'allow',
  DENY = 'deny',
  ANONYMIZE = 'anonymize',
  REDACT = 'redact'
}

export interface AnonymizationResult {
  originalData: any;
  anonymizedData: any;
  method: string;
  level: AnonymizationLevel;
}

export interface PrivacyViolation {
  id: string;
  userId: string;
  violationType: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  resolved: boolean;
}