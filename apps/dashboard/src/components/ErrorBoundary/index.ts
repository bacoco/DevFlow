/**
 * Error Boundary System Exports
 * Centralized exports for all error boundary components and utilities
 */

// Core error boundary components
export {
  ErrorBoundary,
  PageErrorBoundary,
  ComponentErrorBoundary,
  WidgetErrorBoundary,
  type ErrorBoundaryProps,
  type ErrorFallbackProps,
} from './ErrorBoundary';

// Specialized error fallback components
export {
  WidgetErrorFallback,
  ChartErrorFallback,
  NetworkErrorFallback,
  PageErrorFallback,
  ConfigErrorFallback,
  InlineErrorFallback,
} from './ErrorFallbacks';

// Higher-order component and utilities
export {
  withErrorBoundary,
  withWidgetErrorBoundary,
  withPageErrorBoundary,
  withComponentErrorBoundary,
  useErrorBoundary,
  ErrorBoundaryProvider,
  useErrorBoundaryContext,
  type WithErrorBoundaryOptions,
} from './withErrorBoundary';

// Error reporting utilities
export {
  errorReporting,
  reportNetworkError,
  reportServiceError,
  reportValidationError,
  useErrorReporting,
  type ErrorReport,
  type ErrorReportingConfig,
} from '../../utils/errorReporting';

// Error recovery service
export {
  errorRecovery,
  attemptErrorRecovery,
  type RecoveryStrategy,
  type RecoveryContext,
} from '../../services/errorRecoveryService';