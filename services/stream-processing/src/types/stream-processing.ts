import { GitEvent, IDETelemetry, ProductivityMetric, MetricType, TimePeriod } from '@devflow/shared-types';

// Stream Processing Types
export interface StreamEvent {
  id: string;
  type: 'git' | 'ide' | 'communication';
  timestamp: Date;
  userId: string;
  data: GitEvent | IDETelemetry | any;
  metadata?: Record<string, any>;
}

export interface ProcessedEvent {
  id: string;
  originalEventId: string;
  type: string;
  timestamp: Date;
  userId: string;
  metrics: ProductivityMetric[];
  aggregations?: Record<string, number>;
}

export interface WindowConfig {
  type: 'tumbling' | 'sliding' | 'session';
  size: number; // in milliseconds
  slide?: number; // for sliding windows
  sessionTimeout?: number; // for session windows
}

export interface StreamProcessor {
  process(event: StreamEvent): Promise<ProcessedEvent[]>;
  getMetrics(): Promise<Record<string, number>>;
}

export interface EventRouter {
  route(event: StreamEvent): string[];
}

export interface WindowFunction<T, R> {
  apply(window: T[], windowStart: Date, windowEnd: Date): R[];
}

export interface AggregationFunction<T> {
  aggregate(events: T[]): Record<string, number>;
}

// Time-based aggregation windows
export interface TimeWindow {
  start: Date;
  end: Date;
  events: StreamEvent[];
}

// Metrics computation interfaces
export interface MetricsCalculator {
  calculateTimeInFlow(events: StreamEvent[]): ProductivityMetric[];
  calculateCodeQuality(events: StreamEvent[]): ProductivityMetric[];
  calculateCollaboration(events: StreamEvent[]): ProductivityMetric[];
}

// Stream job configuration
export interface StreamJobConfig {
  name: string;
  inputTopics: string[];
  outputTopics: string[];
  windowConfig: WindowConfig;
  parallelism: number;
  checkpointInterval: number;
}

export interface StreamJob {
  config: StreamJobConfig;
  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): 'running' | 'stopped' | 'failed';
}