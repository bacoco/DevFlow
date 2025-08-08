/**
 * Comprehensive Error Boundary System
 * Provides error isolation, reporting, and recovery mechanisms
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean;
  level?: 'page' | 'component' | 'widget';
  name?: string;
}

export interface ErrorFallbackProps {
  error: Error;
  errorInfo?: ErrorInfo;
  retry: () => void;
  goHome?: () => void;
  reportError?: () => void;
  level?: 'page' | 'component' | 'widget';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log error details
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error Info:', errorInfo);

    // Report error to external service
    this.reportError(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      level: this.props.level || 'component',
      boundaryName: this.props.name,
    };

    // Send to error reporting service (e.g., Sentry, LogRocket, etc.)
    try {
      // In a real app, you'd send this to your error reporting service
      console.warn('Error Report:', errorReport);
      
      // Store in localStorage for debugging
      const existingErrors = JSON.parse(localStorage.getItem('error_reports') || '[]');
      existingErrors.push(errorReport);
      localStorage.setItem('error_reports', JSON.stringify(existingErrors.slice(-50))); // Keep last 50 errors
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private handleRetry = () => {
    // Clear any existing timeout
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportError = () => {
    if (this.state.error && this.state.errorInfo) {
      this.reportError(this.state.error, this.state.errorInfo);
      
      // Show success notification
      alert('Error report sent successfully. Thank you for helping us improve!');
    }
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error!}
          errorInfo={this.state.errorInfo}
          retry={this.handleRetry}
          goHome={this.handleGoHome}
          reportError={this.handleReportError}
          level={this.props.level}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  retry,
  goHome,
  reportError,
  level = 'component',
}) => {
  const isPageLevel = level === 'page';
  const isWidgetLevel = level === 'widget';

  return (
    <div className={`
      flex items-center justify-center p-6
      ${isPageLevel ? 'min-h-screen bg-gray-50 dark:bg-gray-900' : ''}
      ${isWidgetLevel ? 'min-h-[200px]' : 'min-h-[300px]'}
    `}>
      <Card className="max-w-md w-full">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isPageLevel ? 'Page Error' : isWidgetLevel ? 'Widget Error' : 'Something went wrong'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {isPageLevel 
                ? 'The page encountered an error and cannot be displayed.'
                : isWidgetLevel
                ? 'This widget encountered an error and cannot be displayed.'
                : 'This component encountered an error and cannot be displayed.'
              }
            </p>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <div className="text-left bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
              <p className="text-xs font-mono text-red-600 dark:text-red-400">
                {error.message}
              </p>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                    Stack trace
                  </summary>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={retry}
              variant="primary"
              size="sm"
              icon={<RefreshCw className="h-4 w-4" />}
              className="flex-1"
            >
              Try Again
            </Button>
            
            {isPageLevel && goHome && (
              <Button
                onClick={goHome}
                variant="secondary"
                size="sm"
                icon={<Home className="h-4 w-4" />}
                className="flex-1"
              >
                Go Home
              </Button>
            )}
            
            {reportError && (
              <Button
                onClick={reportError}
                variant="ghost"
                size="sm"
                icon={<Bug className="h-4 w-4" />}
                className="flex-1"
              >
                Report
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

// Specialized error boundaries for different contexts
export const PageErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'level'>> = (props) => (
  <ErrorBoundary {...props} level="page" />
);

export const ComponentErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'level'>> = (props) => (
  <ErrorBoundary {...props} level="component" />
);

export const WidgetErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'level'>> = (props) => (
  <ErrorBoundary {...props} level="widget" />
);