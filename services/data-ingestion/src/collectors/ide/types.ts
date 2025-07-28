import { IDETelemetry, IDEEventType, TelemetryData, PrivacyLevel } from '@devflow/shared-types';

// VS Code extension telemetry interfaces
export interface VSCodeTelemetryEvent {
  type: IDEEventType;
  timestamp: Date;
  data: TelemetryData;
  sessionId: string;
  userId?: string;
}

// Privacy consent management
export interface PrivacyConsent {
  userId: string;
  consentGiven: boolean;
  consentTimestamp: Date;
  dataTypes: {
    keystrokes: boolean;
    fileChanges: boolean;
    debugging: boolean;
    focusTime: boolean;
    buildEvents: boolean;
    testEvents: boolean;
  };
  retentionPeriodDays: number;
}

// Telemetry batch for efficient transmission
export interface TelemetryBatch {
  batchId: string;
  userId: string;
  sessionId: string;
  events: VSCodeTelemetryEvent[];
  timestamp: Date;
  compressed: boolean;
  privacyLevel: PrivacyLevel;
}

// Configuration for telemetry collection
export interface TelemetryConfig {
  enabled: boolean;
  batchSize: number;
  batchIntervalMs: number;
  compressionEnabled: boolean;
  privacyLevel: PrivacyLevel;
  endpoint: string;
  apiKey?: string;
  retryAttempts: number;
  retryDelayMs: number;
}

// Collection result for telemetry events
export interface TelemetryCollectionResult {
  success: boolean;
  eventsCollected: number;
  errors: string[];
  metadata: {
    sessionId: string;
    collectionTimestamp: Date;
    privacyLevel: PrivacyLevel;
  };
}