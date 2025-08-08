/**
 * Enhanced Error Boundary Component
 * Graceful error handling with fallback content and retry mechanisms
 */

import React, { Component, ReactNode } from 'react';
import { ErrorBoundaryState, UIError, ErrorContext } from '../../services/error-handling/types';
import { ErrorHandler } from '../../services/error-handling/ErrorHandler';
import { ErrorFallback } from './ErrorFallback';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  isolate?: boolean; // Whether to isolate this boundary from parent boundaries
  level?: 'page' | 'section' | 'component'; // Error boundary level for different recovery strategies
  componentName?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorHandler: ErrorHandler;
  private retryTimeoutId?: NodeJS.Timeout;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      retryCount: 0
    };

    // Initialize error handler with default config
    this.errorHandler = ErrorHandler.getInstance({
      enableReporting: true,
      enableAnalytics: true,
      maxRetries: 3,
      retryDelay: 1000,
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 30000,
        monitoringPeriod: 60000,
        halfOpenMaxCalls: 3
      },
      fallbackStrategies: {
        network: { type: 'component', content: null },
        ui: { type: 'component', content: null },
        data: { type: 'component', content: null },
        auth: { type: 'redirect', redirect: '/auth' },
        performance: { type: 'component', content: null },
        accessibility: { type: 'component', content: null },
        unknown: { type: 'component', content: null }
      }
    });
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `boundary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
      errorId: this.state.errorId || `boundary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    // Create error context
    const context: ErrorContext = {
      sessionId: this.getSessionId(),
      component: this.props.componentName || 'ErrorBoundary',
      action: 'render',
      timestamp: new Date(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metadata: {
        componentStack: errorInfo.componentStack,
        level: this.props.level || 'component',
        retryCount: this.state.retryCount,
        isolate: this.props.isolate
      }
    };

    // Handle error through error handler
    this.errorHandler.handleUIError(error, context).then(response => {
      // Update state based on error response
      if (response.autoRetry && this.state.retryCount < 3) {
        this.scheduleRetry(response.retryDelay || 1000);
      }
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error for debugging
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  /**
   * Retry rendering the component
   */
  retry = () => {
    if (this.state.retryCount >= 3) {
      return; // Max retries reached
    }

    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1
    }));
  };

  /**
   * Schedule automatic retry
   */
  private scheduleRetry(delay: number) {
    this.retryTimeoutId = setTimeout(() => {
      this.retry();
    }, delay);
  }

  /**
   * Reset error boundary state
   */
  reset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0
    });
  };

  /**
   * Report error to error handler
   */
  reportError = async () => {
    if (this.state.error && this.state.errorId) {
      const context: ErrorContext = {
        sessionId: this.getSessionId(),
        component: this.props.componentName || 'ErrorBoundary',
        action: 'report',
        timestamp: new Date(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        metadata: {
          errorId: this.state.errorId,
          retryCount: this.state.retryCount
        }
      };

      await this.errorHandler.handleUIError(this.state.error, context);
    }
  };

  /**
   * Get session ID for error tracking
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('error_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('error_session_id', sessionId);
    }
    return sessionId;
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Use ErrorFallback component with error details
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          retryCount={this.state.retryCount}
          onRetry={this.retry}
          onReset={this.reset}
          onReport={this.reportError}
          level={this.props.level}
          componentName={this.props.componentName}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook for accessing error boundary context
 */
export function useErrorHandler() {
  const errorHandler = ErrorHandler.getInstance();

  const handleError = React.useCallback(async (error: Error, context: Partial<ErrorContext> = {}) => {
    const fullContext: ErrorContext = {
      sessionId: sessionStorage.getItem('error_session_id') || 'unknown',
      component: 'useErrorHandler',
      action: 'manual',
      timestamp: new Date(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metadata: {},
      ...context
    };

    return await errorHandler.handleUIError(error, fullContext);
  }, [errorHandler]);

  const reportError = React.useCallback(async (error: Error, userConsent: boolean = false) => {
    const context: ErrorContext = {
      sessionId: sessionStorage.getItem('error_session_id') || 'unknown',
      component: 'useErrorHandler',
      action: 'report',
      timestamp: new Date(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metadata: {}
    };

    const uiError: UIError = {
      ...error,
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: 'unknown',
      severity: 'medium',
      context,
      recoverable: true,
      userMessage: 'An error was reported manually',
      technicalMessage: error.message,
      retryCount: 0,
      maxRetries: 3
    };

    await errorHandler.reportError(uiError, userConsent);
  }, [errorHandler]);

  return {
    handleError,
    reportError,
    errorHandler
  };
}