/**
 * Specialized Error Fallback Components
 * Different fallback UIs for various error contexts
 */

import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Wifi, Database, Settings } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ErrorFallbackProps } from './ErrorBoundary';

// Widget-specific error fallback
export const WidgetErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  retry,
  reportError,
}) => (
  <div className="flex items-center justify-center p-4 min-h-[200px] bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
    <div className="text-center space-y-3">
      <div className="flex justify-center">
        <AlertTriangle className="h-6 w-6 text-amber-500" />
      </div>
      <div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
          Widget Error
        </h4>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          This widget couldn't load properly
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={retry}
          variant="secondary"
          size="sm"
          icon={<RefreshCw className="h-3 w-3" />}
        >
          Retry
        </Button>
        {reportError && (
          <Button
            onClick={reportError}
            variant="ghost"
            size="sm"
            icon={<Bug className="h-3 w-3" />}
          >
            Report
          </Button>
        )}
      </div>
    </div>
  </div>
);

// Chart-specific error fallback
export const ChartErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  retry,
  reportError,
}) => (
  <div className="flex items-center justify-center p-6 min-h-[300px] bg-gray-50 dark:bg-gray-800/50 rounded-lg">
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
          <Database className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Chart Error
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Unable to render chart data. This might be due to invalid data format or a rendering issue.
        </p>
      </div>
      <div className="flex justify-center gap-2">
        <Button
          onClick={retry}
          variant="primary"
          size="sm"
          icon={<RefreshCw className="h-4 w-4" />}
        >
          Reload Chart
        </Button>
        {reportError && (
          <Button
            onClick={reportError}
            variant="ghost"
            size="sm"
            icon={<Bug className="h-4 w-4" />}
          >
            Report Issue
          </Button>
        )}
      </div>
    </div>
  </div>
);

// Network error fallback
export const NetworkErrorFallback: React.FC<ErrorFallbackProps & { isOffline?: boolean }> = ({
  error,
  retry,
  reportError,
  isOffline = false,
}) => (
  <div className="flex items-center justify-center p-6 min-h-[200px]">
    <Card className="max-w-sm w-full">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
            <Wifi className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isOffline ? 'You\'re Offline' : 'Connection Error'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {isOffline 
              ? 'Check your internet connection and try again.'
              : 'Unable to connect to the server. Please try again.'
            }
          </p>
        </div>
        <div className="flex justify-center gap-2">
          <Button
            onClick={retry}
            variant="primary"
            size="sm"
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Try Again
          </Button>
          {!isOffline && reportError && (
            <Button
              onClick={reportError}
              variant="ghost"
              size="sm"
              icon={<Bug className="h-4 w-4" />}
            >
              Report
            </Button>
          )}
        </div>
      </div>
    </Card>
  </div>
);

// Page-level error fallback with more options
export const PageErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  retry,
  goHome,
  reportError,
}) => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
    <Card className="max-w-lg w-full">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
            <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
        </div>
        
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Oops! Something went wrong
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-3">
            We encountered an unexpected error. Don't worry, our team has been notified and is working on a fix.
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="text-left bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Error Details (Development)
            </h4>
            <p className="text-sm font-mono text-red-600 dark:text-red-400 break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={retry}
            variant="primary"
            size="md"
            icon={<RefreshCw className="h-4 w-4" />}
            className="flex-1"
          >
            Try Again
          </Button>
          
          {goHome && (
            <Button
              onClick={goHome}
              variant="secondary"
              size="md"
              icon={<Home className="h-4 w-4" />}
              className="flex-1"
            >
              Go Home
            </Button>
          )}
        </div>

        {reportError && (
          <Button
            onClick={reportError}
            variant="ghost"
            size="sm"
            icon={<Bug className="h-4 w-4" />}
            className="w-full"
          >
            Report this issue
          </Button>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400">
          Error ID: {Math.random().toString(36).substr(2, 9)}
        </div>
      </div>
    </Card>
  </div>
);

// Configuration error fallback
export const ConfigErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  retry,
  reportError,
}) => (
  <div className="flex items-center justify-center p-6 min-h-[300px]">
    <Card className="max-w-md w-full">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
            <Settings className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Configuration Error
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            There's an issue with the component configuration. Please check your settings.
          </p>
        </div>
        <div className="flex justify-center gap-2">
          <Button
            onClick={retry}
            variant="primary"
            size="sm"
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Retry
          </Button>
          {reportError && (
            <Button
              onClick={reportError}
              variant="ghost"
              size="sm"
              icon={<Bug className="h-4 w-4" />}
            >
              Report
            </Button>
          )}
        </div>
      </div>
    </Card>
  </div>
);

// Minimal error fallback for inline components
export const InlineErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  retry,
}) => (
  <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md text-sm">
    <AlertTriangle className="h-4 w-4" />
    <span>Error loading component</span>
    <button
      onClick={retry}
      className="ml-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
    >
      <RefreshCw className="h-3 w-3" />
    </button>
  </div>
);