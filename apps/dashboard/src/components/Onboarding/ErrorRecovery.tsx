import React, { useState, useEffect, useCallback } from 'react';
import { ErrorRecoveryAction } from './types';

interface ErrorRecoveryProps {
  error: Error | null;
  onRecover?: () => void;
  onDismiss?: () => void;
  className?: string;
}

interface ErrorContext {
  component?: string;
  action?: string;
  userAgent?: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

interface ErrorRecoveryState {
  currentError: Error | null;
  context: ErrorContext | null;
  recoveryActions: ErrorRecoveryAction[];
  isRecovering: boolean;
  recoveryAttempts: number;
  maxRetries: number;
}

// Predefined recovery actions for common errors
const errorRecoveryActions: Record<string, ErrorRecoveryAction> = {
  'NetworkError': {
    id: 'network-error',
    errorType: 'NetworkError',
    title: 'Connection Problem',
    description: 'We\'re having trouble connecting to our servers. This might be due to a network issue or temporary server problem.',
    actions: [
      {
        label: 'Retry Connection',
        handler: async () => {
          // Attempt to reconnect
          try {
            const response = await fetch('/api/health');
            if (response.ok) {
              window.location.reload();
            } else {
              throw new Error('Server not responding');
            }
          } catch (error) {
            console.error('Retry failed:', error);
            throw error;
          }
        },
        type: 'primary'
      },
      {
        label: 'Work Offline',
        handler: async () => {
          // Enable offline mode
          localStorage.setItem('offline_mode', 'true');
          window.location.reload();
        },
        type: 'secondary'
      }
    ],
    preventionTips: [
      'Check your internet connection',
      'Try refreshing the page',
      'Disable VPN if you\'re using one',
      'Clear browser cache and cookies'
    ],
    relatedHelp: ['troubleshooting', 'network-issues']
  },

  'ChunkLoadError': {
    id: 'chunk-load-error',
    errorType: 'ChunkLoadError',
    title: 'Loading Problem',
    description: 'Some parts of the application failed to load. This usually happens after an update or due to caching issues.',
    actions: [
      {
        label: 'Refresh Page',
        handler: async () => {
          window.location.reload();
        },
        type: 'primary'
      },
      {
        label: 'Clear Cache',
        handler: async () => {
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
              cacheNames.map(cacheName => caches.delete(cacheName))
            );
          }
          localStorage.clear();
          sessionStorage.clear();
          window.location.reload();
        },
        type: 'secondary'
      }
    ],
    preventionTips: [
      'Keep your browser updated',
      'Clear cache regularly',
      'Avoid closing the browser during updates'
    ],
    relatedHelp: ['browser-compatibility', 'cache-issues']
  },

  'TypeError': {
    id: 'type-error',
    errorType: 'TypeError',
    title: 'Application Error',
    description: 'Something went wrong in the application. This might be due to corrupted data or a temporary glitch.',
    actions: [
      {
        label: 'Restart Application',
        handler: async () => {
          window.location.reload();
        },
        type: 'primary'
      },
      {
        label: 'Reset Settings',
        handler: async () => {
          const keysToKeep = ['auth_token', 'user_preferences'];
          const storage = { ...localStorage };
          localStorage.clear();
          
          keysToKeep.forEach(key => {
            if (storage[key]) {
              localStorage.setItem(key, storage[key]);
            }
          });
          
          window.location.reload();
        },
        type: 'secondary'
      }
    ],
    preventionTips: [
      'Save your work frequently',
      'Avoid rapid clicking on buttons',
      'Report persistent issues to support'
    ],
    relatedHelp: ['troubleshooting', 'data-recovery']
  },

  'QuotaExceededError': {
    id: 'quota-exceeded',
    errorType: 'QuotaExceededError',
    title: 'Storage Full',
    description: 'Your browser\'s storage is full. We need to clear some space to continue working properly.',
    actions: [
      {
        label: 'Clear Old Data',
        handler: async () => {
          // Clear old cached data but keep essential items
          const essentialKeys = ['auth_token', 'user_id', 'current_session'];
          const allKeys = Object.keys(localStorage);
          
          allKeys.forEach(key => {
            if (!essentialKeys.includes(key)) {
              localStorage.removeItem(key);
            }
          });
          
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            // Keep only the most recent cache
            const sortedCaches = cacheNames.sort().reverse();
            for (let i = 1; i < sortedCaches.length; i++) {
              await caches.delete(sortedCaches[i]);
            }
          }
          
          window.location.reload();
        },
        type: 'primary'
      },
      {
        label: 'Download Backup',
        handler: async () => {
          // Create a backup of important data
          const importantData = {
            preferences: localStorage.getItem('user_preferences'),
            customizations: localStorage.getItem('dashboard_customizations'),
            timestamp: new Date().toISOString()
          };
          
          const blob = new Blob([JSON.stringify(importantData, null, 2)], {
            type: 'application/json'
          });
          
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `devflow-backup-${Date.now()}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        },
        type: 'secondary'
      }
    ],
    preventionTips: [
      'Regularly clear browser data',
      'Use cloud sync for important settings',
      'Monitor storage usage in browser settings'
    ],
    relatedHelp: ['storage-management', 'data-backup']
  }
};

function getErrorRecoveryAction(error: Error): ErrorRecoveryAction | null {
  const errorName = error.name;
  const errorMessage = error.message.toLowerCase();

  // Direct match by error name
  if (errorRecoveryActions[errorName]) {
    return errorRecoveryActions[errorName];
  }

  // Match by error message patterns
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return errorRecoveryActions['NetworkError'];
  }

  if (errorMessage.includes('chunk') || errorMessage.includes('loading')) {
    return errorRecoveryActions['ChunkLoadError'];
  }

  if (errorMessage.includes('quota') || errorMessage.includes('storage')) {
    return errorRecoveryActions['QuotaExceededError'];
  }

  // Generic fallback
  return {
    id: 'generic-error',
    errorType: 'Error',
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. We\'re sorry for the inconvenience.',
    actions: [
      {
        label: 'Refresh Page',
        handler: async () => {
          window.location.reload();
        },
        type: 'primary'
      },
      {
        label: 'Report Issue',
        handler: async () => {
          // Open support form or email
          const subject = encodeURIComponent(`Error Report: ${error.name}`);
          const body = encodeURIComponent(`
Error: ${error.name}
Message: ${error.message}
Stack: ${error.stack}
User Agent: ${navigator.userAgent}
Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
          `);
          window.open(`mailto:support@devflow.com?subject=${subject}&body=${body}`);
        },
        type: 'secondary'
      }
    ],
    preventionTips: [
      'Keep your browser updated',
      'Report issues to help us improve',
      'Try using a different browser if problems persist'
    ],
    relatedHelp: ['troubleshooting', 'support']
  };
}

export function ErrorRecovery({ error, onRecover, onDismiss, className }: ErrorRecoveryProps) {
  const [state, setState] = useState<ErrorRecoveryState>({
    currentError: null,
    context: null,
    recoveryActions: [],
    isRecovering: false,
    recoveryAttempts: 0,
    maxRetries: 3
  });

  const [showDetails, setShowDetails] = useState(false);
  const [userFeedback, setUserFeedback] = useState('');

  // Update state when error changes
  useEffect(() => {
    if (error && error !== state.currentError) {
      const recoveryAction = getErrorRecoveryAction(error);
      const context: ErrorContext = {
        component: 'Unknown',
        action: 'Unknown',
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        sessionId: sessionStorage.getItem('session_id') || undefined
      };

      setState(prev => ({
        ...prev,
        currentError: error,
        context,
        recoveryActions: recoveryAction ? [recoveryAction] : [],
        recoveryAttempts: 0
      }));
    }
  }, [error, state.currentError]);

  const handleRecoveryAction = useCallback(async (action: ErrorRecoveryAction['actions'][0]) => {
    setState(prev => ({ ...prev, isRecovering: true }));

    try {
      await action.handler();
      
      // If we get here, recovery was successful
      setState(prev => ({ 
        ...prev, 
        isRecovering: false,
        currentError: null,
        recoveryActions: []
      }));
      
      onRecover?.();
    } catch (recoveryError) {
      console.error('Recovery action failed:', recoveryError);
      
      setState(prev => ({ 
        ...prev, 
        isRecovering: false,
        recoveryAttempts: prev.recoveryAttempts + 1
      }));

      // If we've exceeded max retries, show a different message
      if (state.recoveryAttempts >= state.maxRetries) {
        setState(prev => ({
          ...prev,
          recoveryActions: [{
            ...prev.recoveryActions[0],
            title: 'Recovery Failed',
            description: 'We\'ve tried multiple recovery attempts but the issue persists. Please contact support for assistance.',
            actions: [
              {
                label: 'Contact Support',
                handler: async () => {
                  const subject = encodeURIComponent('Multiple Recovery Failures');
                  const body = encodeURIComponent(`
Original Error: ${error?.name} - ${error?.message}
Recovery Attempts: ${state.recoveryAttempts}
User Feedback: ${userFeedback}
Timestamp: ${new Date().toISOString()}
                  `);
                  window.open(`mailto:support@devflow.com?subject=${subject}&body=${body}`);
                },
                type: 'primary'
              }
            ]
          }]
        }));
      }
    }
  }, [error, onRecover, state.recoveryAttempts, state.maxRetries, userFeedback]);

  const handleDismiss = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentError: null,
      recoveryActions: [],
      recoveryAttempts: 0
    }));
    onDismiss?.();
  }, [onDismiss]);

  const handleFeedbackSubmit = useCallback(() => {
    if (userFeedback.trim()) {
      // Log feedback for analysis
      console.log('User feedback for error:', {
        error: error?.name,
        message: error?.message,
        feedback: userFeedback,
        timestamp: new Date().toISOString()
      });

      // In a real app, this would send to an analytics service
      // analytics.track('error_feedback', { ... });
    }
    
    setUserFeedback('');
  }, [error, userFeedback]);

  if (!state.currentError || state.recoveryActions.length === 0) {
    return null;
  }

  const recoveryAction = state.recoveryActions[0];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ${className || ''}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              {recoveryAction.title}
            </h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss error"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-600 mb-4">
            {recoveryAction.description}
          </p>

          {/* Recovery Actions */}
          <div className="space-y-2 mb-4">
            {recoveryAction.actions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleRecoveryAction(action)}
                disabled={state.isRecovering}
                className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  action.type === 'primary'
                    ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400'
                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300 disabled:bg-gray-100'
                } disabled:cursor-not-allowed`}
              >
                {state.isRecovering ? (
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Working...</span>
                  </div>
                ) : (
                  action.label
                )}
              </button>
            ))}
          </div>

          {/* Prevention Tips */}
          {recoveryAction.preventionTips && recoveryAction.preventionTips.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Prevention Tips:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {recoveryAction.preventionTips.map((tip, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* User Feedback */}
          <div className="mb-4">
            <label htmlFor="error-feedback" className="block text-sm font-medium text-gray-700 mb-2">
              Help us improve (optional):
            </label>
            <textarea
              id="error-feedback"
              value={userFeedback}
              onChange={(e) => setUserFeedback(e.target.value)}
              placeholder="What were you trying to do when this error occurred?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
            {userFeedback.trim() && (
              <button
                onClick={handleFeedbackSubmit}
                className="mt-2 px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
              >
                Submit Feedback
              </button>
            )}
          </div>

          {/* Error Details Toggle */}
          <div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              {showDetails ? 'Hide' : 'Show'} technical details
            </button>
            
            {showDetails && (
              <div className="mt-2 p-3 bg-gray-100 rounded-md text-xs font-mono text-gray-800 overflow-auto max-h-32">
                <div><strong>Error:</strong> {state.currentError.name}</div>
                <div><strong>Message:</strong> {state.currentError.message}</div>
                <div><strong>Time:</strong> {state.context?.timestamp.toISOString()}</div>
                {state.currentError.stack && (
                  <div className="mt-2">
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap text-xs mt-1">
                      {state.currentError.stack}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for error recovery
export function useErrorRecovery() {
  const [error, setError] = useState<Error | null>(null);

  const reportError = useCallback((error: Error, context?: Partial<ErrorContext>) => {
    console.error('Error reported to recovery system:', error);
    setError(error);
    
    // In a real app, this would also send to error tracking service
    // errorTracking.captureException(error, context);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    reportError,
    clearError
  };
}