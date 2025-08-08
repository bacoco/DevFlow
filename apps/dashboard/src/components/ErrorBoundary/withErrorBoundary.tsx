/**
 * Higher-Order Component for Error Boundary Wrapping
 * Provides easy error boundary integration for any component
 */

import React, { ComponentType } from 'react';
import { ErrorBoundary, ErrorBoundaryProps, ErrorFallbackProps } from './ErrorBoundary';
import { errorReporting } from '../../utils/errorReporting';

export interface WithErrorBoundaryOptions {
  fallback?: React.ComponentType<ErrorFallbackProps>;
  level?: 'page' | 'component' | 'widget';
  isolate?: boolean;
  name?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * HOC that wraps a component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
) {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => {
    const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
      // Report error to error reporting service
      errorReporting.reportError({
        error,
        errorInfo,
        level: options.level || 'component',
        boundaryName: options.name || Component.displayName || Component.name,
      });

      // Call custom error handler if provided
      if (options.onError) {
        options.onError(error, errorInfo);
      }
    };

    return (
      <ErrorBoundary
        fallback={options.fallback}
        level={options.level}
        isolate={options.isolate}
        name={options.name || Component.displayName || Component.name}
        onError={handleError}
      >
        <Component {...props} ref={ref} />
      </ErrorBoundary>
    );
  });

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Decorator for class components
 */
export function ErrorBoundaryDecorator(options: WithErrorBoundaryOptions = {}) {
  return function <P extends object>(Component: ComponentType<P>) {
    return withErrorBoundary(Component, options);
  };
}

/**
 * Hook for functional components to wrap themselves with error boundary
 */
export function useErrorBoundary(options: WithErrorBoundaryOptions = {}) {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    // Report error
    errorReporting.reportError({
      error,
      level: options.level || 'component',
      boundaryName: options.name,
    });

    setError(error);
  }, [options.level, options.name]);

  // Throw error to be caught by parent error boundary
  if (error) {
    throw error;
  }

  return {
    captureError,
    resetError,
  };
}

/**
 * Utility to create error boundary wrapped components
 */
export const createErrorBoundaryWrapper = (options: WithErrorBoundaryOptions = {}) => {
  return function <P extends object>(Component: ComponentType<P>) {
    return withErrorBoundary(Component, options);
  };
};

/**
 * Pre-configured error boundary wrappers for common use cases
 */

// Widget error boundary wrapper
export const withWidgetErrorBoundary = <P extends object>(Component: ComponentType<P>) =>
  withErrorBoundary(Component, {
    level: 'widget',
    isolate: true,
  });

// Page error boundary wrapper
export const withPageErrorBoundary = <P extends object>(Component: ComponentType<P>) =>
  withErrorBoundary(Component, {
    level: 'page',
    isolate: false,
  });

// Component error boundary wrapper
export const withComponentErrorBoundary = <P extends object>(Component: ComponentType<P>) =>
  withErrorBoundary(Component, {
    level: 'component',
    isolate: true,
  });

/**
 * Error boundary provider for context-based error handling
 */
interface ErrorBoundaryContextValue {
  reportError: (error: Error, metadata?: Record<string, any>) => void;
  clearErrors: () => void;
  hasError: boolean;
}

const ErrorBoundaryContext = React.createContext<ErrorBoundaryContextValue | null>(null);

export const ErrorBoundaryProvider: React.FC<{
  children: React.ReactNode;
  onError?: (error: Error) => void;
}> = ({ children, onError }) => {
  const [hasError, setHasError] = React.useState(false);

  const reportError = React.useCallback((error: Error, metadata?: Record<string, any>) => {
    errorReporting.reportError({
      error,
      level: 'component',
      metadata,
    });

    setHasError(true);

    if (onError) {
      onError(error);
    }
  }, [onError]);

  const clearErrors = React.useCallback(() => {
    setHasError(false);
  }, []);

  const value: ErrorBoundaryContextValue = {
    reportError,
    clearErrors,
    hasError,
  };

  return (
    <ErrorBoundaryContext.Provider value={value}>
      {children}
    </ErrorBoundaryContext.Provider>
  );
};

export const useErrorBoundaryContext = () => {
  const context = React.useContext(ErrorBoundaryContext);
  if (!context) {
    throw new Error('useErrorBoundaryContext must be used within an ErrorBoundaryProvider');
  }
  return context;
};