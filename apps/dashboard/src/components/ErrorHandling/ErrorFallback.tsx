/**
 * Error Fallback Component
 * User-friendly error display with recovery actions
 */

import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, Bug, Home, ChevronDown, ChevronUp } from 'lucide-react';

interface ErrorFallbackProps {
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorId?: string;
  retryCount: number;
  onRetry: () => void;
  onReset: () => void;
  onReport: () => Promise<void>;
  level?: 'page' | 'section' | 'component';
  componentName?: string;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  errorId,
  retryCount,
  onRetry,
  onReset,
  onReport,
  level = 'component',
  componentName
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  const handleReport = async () => {
    setIsReporting(true);
    try {
      await onReport();
      setReportSent(true);
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    } finally {
      setIsReporting(false);
    }
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReload = () => {
    window.location.reload();
  };

  // Determine error severity and messaging based on level
  const getErrorConfig = () => {
    switch (level) {
      case 'page':
        return {
          title: 'Page Error',
          message: 'This page encountered an error and cannot be displayed properly.',
          icon: <AlertTriangle className="w-8 h-8 text-red-500" />,
          showHomeButton: true
        };
      case 'section':
        return {
          title: 'Section Error',
          message: 'This section of the page encountered an error.',
          icon: <AlertTriangle className="w-6 h-6 text-orange-500" />,
          showHomeButton: false
        };
      default:
        return {
          title: 'Component Error',
          message: 'A component on this page encountered an error.',
          icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
          showHomeButton: false
        };
    }
  };

  const config = getErrorConfig();
  const canRetry = retryCount < 3;

  return (
    <div className={`error-fallback ${level === 'page' ? 'min-h-screen' : ''} flex items-center justify-center p-4`}>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 max-w-2xl w-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {config.icon}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{config.title}</h2>
              <p className="text-gray-600 mt-1">{config.message}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            {/* User-friendly explanation */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">What happened?</h3>
              <p className="text-blue-800 text-sm">
                Something unexpected occurred while loading this {level}. 
                {canRetry ? ' You can try again, and we\'ll attempt to fix the issue automatically.' : ' The error has occurred multiple times, so manual intervention may be needed.'}
              </p>
            </div>

            {/* Error ID for support */}
            {errorId && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Error ID:</span> 
                  <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-xs font-mono">{errorId}</code>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Reference this ID when contacting support
                </p>
              </div>
            )}

            {/* Retry information */}
            {retryCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <span className="font-medium">Retry attempts:</span> {retryCount}/3
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <div className="flex flex-wrap gap-3">
            {/* Primary actions */}
            {canRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </button>
            )}

            {level === 'page' && (
              <button
                onClick={handleReload}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Page
              </button>
            )}

            {config.showHomeButton && (
              <button
                onClick={handleGoHome}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </button>
            )}

            {/* Secondary actions */}
            <button
              onClick={onReset}
              className="inline-flex items-center px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Reset
            </button>

            {/* Report error */}
            {!reportSent ? (
              <button
                onClick={handleReport}
                disabled={isReporting}
                className="inline-flex items-center px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Bug className="w-4 h-4 mr-2" />
                {isReporting ? 'Reporting...' : 'Report Issue'}
              </button>
            ) : (
              <span className="inline-flex items-center px-4 py-2 text-green-700 text-sm font-medium">
                ✓ Report sent
              </span>
            )}
          </div>
        </div>

        {/* Technical details (collapsible) */}
        {(error || errorInfo) && (
          <div className="border-t border-gray-200">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full px-6 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors flex items-center justify-between"
            >
              <span>Technical Details</span>
              {showDetails ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            
            {showDetails && (
              <div className="px-6 pb-6 space-y-4">
                {error && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Error Details</h4>
                    <div className="bg-gray-100 rounded-lg p-3 overflow-auto">
                      <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                        <strong>Name:</strong> {error.name}
                        {'\n'}
                        <strong>Message:</strong> {error.message}
                        {error.stack && (
                          <>
                            {'\n\n'}
                            <strong>Stack Trace:</strong>
                            {'\n'}
                            {error.stack}
                          </>
                        )}
                      </pre>
                    </div>
                  </div>
                )}

                {errorInfo?.componentStack && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Component Stack</h4>
                    <div className="bg-gray-100 rounded-lg p-3 overflow-auto">
                      <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  </div>
                )}

                {componentName && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Component Information</h4>
                    <div className="bg-gray-100 rounded-lg p-3">
                      <p className="text-xs text-gray-800">
                        <strong>Component:</strong> {componentName}
                        <br />
                        <strong>Level:</strong> {level}
                        <br />
                        <strong>Retry Count:</strong> {retryCount}
                      </p>
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  <p>
                    This information can help developers identify and fix the issue. 
                    It does not contain any personal data.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Minimal error fallback for critical failures
 */
export const MinimalErrorFallback: React.FC<{ message?: string }> = ({ 
  message = "Something went wrong" 
}) => (
  <div className="flex items-center justify-center min-h-32 p-4">
    <div className="text-center">
      <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
      <p className="text-gray-600">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
      >
        Reload Page
      </button>
    </div>
  </div>
);

/**
 * Loading error fallback
 */
export const LoadingErrorFallback: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <div className="flex items-center justify-center min-h-32 p-4">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
      <p className="text-gray-600 mb-3">Loading failed</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  </div>
);