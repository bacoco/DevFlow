/**
 * Error Fallback Component
 * Displays user-friendly error messages with recovery options
 */

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  className?: string;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  className,
}) => {
  const handleReportError = () => {
    // In a real app, this would send error reports to a service
    console.error('Error reported:', error);
    
    // Create a simple error report
    const errorReport = {
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace available',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
    
    // For demo purposes, just log it
    console.log('Error report:', errorReport);
    
    // Show success message
    alert('Error report sent successfully. Thank you for helping us improve!');
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className={cn(
      'flex flex-col items-center justify-center min-h-screen p-6',
      'bg-gray-50 dark:bg-gray-900',
      'transition-colors duration-300',
      className
    )}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        {/* Error Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="mb-6"
        >
          <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
        </motion.div>

        {/* Error Title */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4"
        >
          Oops! Something went wrong
        </motion.h1>

        {/* Error Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="text-gray-600 dark:text-gray-400 mb-6"
        >
          We encountered an unexpected error. This might be a temporary issue that can be resolved by refreshing the page.
        </motion.p>

        {/* Error Details (in development) */}
        {process.env.NODE_ENV === 'development' && error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-left"
          >
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Error Details (Development)
            </h3>
            <p className="text-xs text-red-600 dark:text-red-400 font-mono break-all">
              {error.message}
            </p>
            {error.stack && (
              <details className="mt-2">
                <summary className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                  Stack Trace
                </summary>
                <pre className="text-xs text-gray-600 dark:text-gray-400 mt-2 whitespace-pre-wrap">
                  {error.stack}
                </pre>
              </details>
            )}
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.3 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          {/* Try Again Button */}
          {resetError && (
            <button
              onClick={resetError}
              className={cn(
                'flex items-center justify-center px-6 py-3 rounded-lg',
                'bg-blue-600 hover:bg-blue-700 text-white',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                'transition-colors duration-200',
                'font-medium'
              )}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
          )}

          {/* Reload Page Button */}
          <button
            onClick={handleReload}
            className={cn(
              'flex items-center justify-center px-6 py-3 rounded-lg',
              'bg-gray-600 hover:bg-gray-700 text-white',
              'focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
              'transition-colors duration-200',
              'font-medium'
            )}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload Page
          </button>

          {/* Go Home Button */}
          <button
            onClick={handleGoHome}
            className={cn(
              'flex items-center justify-center px-6 py-3 rounded-lg',
              'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600',
              'text-gray-900 dark:text-gray-100',
              'focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
              'transition-colors duration-200',
              'font-medium'
            )}
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </button>
        </motion.div>

        {/* Report Error Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.3 }}
          className="mt-6"
        >
          <button
            onClick={handleReportError}
            className={cn(
              'flex items-center justify-center mx-auto px-4 py-2 rounded-lg',
              'text-sm text-gray-600 dark:text-gray-400',
              'hover:text-gray-900 dark:hover:text-gray-100',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
              'transition-colors duration-200'
            )}
          >
            <Bug className="w-4 h-4 mr-2" />
            Report this error
          </button>
        </motion.div>

        {/* Help Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.3 }}
          className="text-xs text-gray-500 dark:text-gray-500 mt-6"
        >
          If this problem persists, please contact support or try again later.
        </motion.p>
      </motion.div>
    </div>
  );
};

export default ErrorFallback;