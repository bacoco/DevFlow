/**
 * Error Handling Types
 * Comprehensive type definitions for error handling and recovery system
 */

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'network' | 'ui' | 'data' | 'auth' | 'performance' | 'accessibility' | 'unknown';
export type RecoveryStrategy = 'retry' | 'fallback' | 'reload' | 'redirect' | 'ignore';

export interface ErrorContext {
  userId?: string;
  sessionId: string;
  component: string;
  action: string;
  timestamp: Date;
  url: string;
  userAgent: string;
  metadata: Record<string, any>;
}

export interface UIError extends Error {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: ErrorContext;
  recoverable: boolean;
  userMessage: string;
  technicalMessage: string;
  retryCount: number;
  maxRetries: number;
}

export interface ErrorAction {
  type: 'retry' | 'dismiss' | 'report' | 'navigate' | 'reload';
  label: string;
  handler: () => void | Promise<void>;
  primary?: boolean;
}

export interface ErrorResponse {
  message: string;
  severity: ErrorSeverity;
  actions: ErrorAction[];
  fallbackContent?: React.ReactNode;
  retryable: boolean;
  autoRetry?: boolean;
  retryDelay?: number;
}

export interface RecoveryAction {
  type: RecoveryStrategy;
  delay?: number;
  maxAttempts?: number;
  fallbackStrategy?: FallbackStrategy;
  condition?: () => boolean;
}

export interface FallbackStrategy {
  type: 'component' | 'page' | 'data' | 'offline';
  content?: React.ReactNode;
  data?: any;
  redirect?: string;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxCalls: number;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
}

export interface ErrorReport {
  id: string;
  error: UIError;
  userConsent: boolean;
  reportedAt: Date;
  resolved: boolean;
  resolution?: string;
}

export interface ErrorAnalytics {
  errorId: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  component: string;
  count: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  affectedUsers: number;
  resolutionRate: number;
  averageRecoveryTime: number;
}

export interface PerformanceError extends UIError {
  metric: 'loading' | 'interaction' | 'memory' | 'network';
  threshold: number;
  actualValue: number;
  impact: 'user' | 'system' | 'both';
}

export interface A11yError extends UIError {
  rule: string;
  element: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorId?: string;
  retryCount: number;
}

export interface ErrorHandlerConfig {
  enableReporting: boolean;
  enableAnalytics: boolean;
  maxRetries: number;
  retryDelay: number;
  circuitBreaker: CircuitBreakerConfig;
  fallbackStrategies: Record<ErrorCategory, FallbackStrategy>;
}