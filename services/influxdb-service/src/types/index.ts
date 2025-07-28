export interface TimeSeriesPoint {
  measurement: string;
  tags: Record<string, string>;
  fields: Record<string, number | string | boolean>;
  timestamp?: Date;
}

export interface QueryOptions {
  start?: string | Date;
  stop?: string | Date;
  bucket?: string;
  measurement?: string;
  tags?: Record<string, string>;
  fields?: string[];
  aggregateWindow?: {
    every: string;
    fn: 'mean' | 'sum' | 'count' | 'max' | 'min';
  };
  limit?: number;
}

export interface RetentionPolicy {
  name: string;
  duration: string;
  shardGroupDuration?: string;
  replicationFactor?: number;
  default?: boolean;
}

export interface BucketConfig {
  name: string;
  orgID: string;
  retentionRules: Array<{
    type: 'expire';
    everySeconds: number;
  }>;
  description?: string;
}

export interface BatchWriteOptions {
  batchSize: number;
  flushInterval: number;
  maxRetries: number;
  retryInterval: number;
}

export interface MetricData {
  userId?: string;
  teamId?: string;
  projectId?: string;
  metricType: string;
  value: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface FlowMetric extends MetricData {
  sessionId: string;
  focusScore: number;
  interruptionCount: number;
  flowDuration: number;
}

export interface CodeQualityMetric extends MetricData {
  repository: string;
  branch: string;
  churnRate: number;
  complexity: number;
  reviewLagTime?: number;
}