/**
 * Performance Monitoring Types
 * Defines interfaces for performance tracking, Core Web Vitals, and optimization
 */

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  timestamp: Date;
  url: string;
  userId?: string;
  sessionId: string;
  deviceInfo: DeviceInfo;
  networkInfo: NetworkInfo;
}

export interface CoreWebVitals {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
  inp?: number; // Interaction to Next Paint (new metric)
}

export interface DeviceInfo {
  type: 'desktop' | 'tablet' | 'mobile';
  memory?: number;
  cores?: number;
  connection?: string;
  platform: string;
  userAgent: string;
}

export interface NetworkInfo {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export interface PerformanceBudget {
  metric: string;
  budget: number;
  warning: number;
  error: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'regression' | 'budget_exceeded' | 'threshold_breach';
  metric: string;
  currentValue: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  url: string;
  description: string;
}

export interface PerformanceRecommendation {
  id: string;
  type: 'optimization' | 'configuration' | 'resource';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  implementation: string;
  basedOnPattern: string;
}

export interface AdaptiveStrategy {
  condition: string;
  strategy: string;
  parameters: Record<string, any>;
  enabled: boolean;
}

export interface PerformanceSession {
  id: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  pageViews: number;
  interactions: number;
  errors: number;
  averageResponseTime: number;
  deviceInfo: DeviceInfo;
  networkInfo: NetworkInfo;
}

export interface PerformanceBenchmark {
  name: string;
  target: number;
  current: number;
  trend: 'improving' | 'stable' | 'degrading';
  history: Array<{ timestamp: Date; value: number }>;
}

export interface RUMData {
  pageLoadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
  totalBlockingTime: number;
}

export interface PerformanceConfig {
  enableRUM: boolean;
  enableCoreWebVitals: boolean;
  enableBudgetChecks: boolean;
  enableAdaptiveStrategies: boolean;
  samplingRate: number;
  alertThresholds: Record<string, number>;
  budgets: PerformanceBudget[];
  adaptiveStrategies: AdaptiveStrategy[];
}