/**
 * Error Handling Demo Component
 * Comprehensive demonstration of error handling and recovery features
 */

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Bug, 
  Zap, 
  Shield, 
  BarChart3, 
  RefreshCw,
  Network,
  Eye,
  Clock,
  Users
} from 'lucide-react';
import { ErrorBoundary, useErrorHandler } from './ErrorBoundary';
import { ErrorAnalyticsDashboard } from './ErrorAnalyticsDashboard';
import { 
  initializeErrorHandling, 
  setupGlobalErrorHandling, 
  setupPerformanceMonitoring,
  setupAccessibilityMonitoring 
} from '../../services/error-handling';

// Demo components that can throw different types of errors
const NetworkErrorComponent: React.FC<{ shouldFail: boolean }> = ({ shouldFail }) => {
  React.useEffect(() => {
    if (shouldFail) {
      // Simulate network error
      fetch('/api/nonexistent-endpoint')
        .catch(() => {
          throw new Error('Network request failed');
        });
    }
  }, [shouldFail]);

  return <div>Network component loaded successfully</div>;
};

const UIErrorComponent: React.FC<{ shouldFail: boolean }> = ({ shouldFail }) => {
  if (shouldFail) {
    throw new Error('UI component render failed');
  }
  return <div>UI component rendered successfully</div>;
};

const PerformanceErrorComponent: React.FC<{ shouldFail: boolean }> = ({ shouldFail }) => {
  React.useEffect(() => {
    if (shouldFail) {
      // Simulate performance issue
      const start = Date.now();
      while (Date.now() - start < 3000) {
        // Block main thread
      }
    }
  }, [shouldFail]);

  return <div>Performance component loaded</div>;
};

const AccessibilityErrorComponent: React.FC<{ shouldFail: boolean }> = ({ shouldFail }) => {
  return (
    <div>
      {shouldFail ? (
        <>
          <img src="/placeholder.jpg" /> {/* Missing alt text */}
          <button></button> {/* Button without accessible name */}
        </>
      ) : (
        <>
          <img src="/placeholder.jpg" alt="Placeholder image" />
          <button aria-label="Accessible button">Click me</button>
        </>
      )}
      Accessibility component rendered
    </div>
  );
};

export const ErrorHandlingDemo: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<string>('overview');
  const [errorStates, setErrorStates] = useState({
    network: false,
    ui: false,
    performance: false,
    accessibility: false
  });
  const [systemInitialized, setSystemInitialized] = useState(false);

  const { handleError, reportError } = useErrorHandler();

  // Initialize error handling system
  const initializeSystem = () => {
    try {
      initializeErrorHandling();
      setupGlobalErrorHandling();
      setupPerformanceMonitoring();
      setupAccessibilityMonitoring();
      setSystemInitialized(true);
    } catch (error) {
      console.error('Failed to initialize error handling system:', error);
    }
  };

  const triggerManualError = async (type: string) => {
    const errors = {
      network: new Error('Manual network error triggered'),
      ui: new Error('Manual UI error triggered'),
      performance: new Error('Manual performance error triggered'),
      accessibility: new Error('Manual accessibility error triggered'),
      unknown: new Error('Manual unknown error triggered')
    };

    const error = errors[type as keyof typeof errors] || errors.unknown;
    
    try {
      await handleError(error, {
        component: 'ErrorHandlingDemo',
        action: 'manual-trigger',
        metadata: { errorType: type }
      });
    } catch (handlingError) {
      console.error('Error handling failed:', handlingError);
    }
  };

  const triggerErrorReport = async () => {
    const error = new Error('User-reported issue');
    await reportError(error, true);
  };

  const toggleErrorState = (type: keyof typeof errorStates) => {
    setErrorStates(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const demoSections = [
    {
      id: 'overview',
      title: 'System Overview',
      icon: <Shield className="w-5 h-5" />,
      description: 'Overview of the comprehensive error handling system'
    },
    {
      id: 'boundaries',
      title: 'Error Boundaries',
      icon: <AlertTriangle className="w-5 h-5" />,
      description: 'React error boundaries with graceful fallbacks'
    },
    {
      id: 'recovery',
      title: 'Recovery Mechanisms',
      icon: <RefreshCw className="w-5 h-5" />,
      description: 'Automatic retry and circuit breaker patterns'
    },
    {
      id: 'reporting',
      title: 'Error Reporting',
      icon: <Bug className="w-5 h-5" />,
      description: 'Privacy-conscious error reporting with user consent'
    },
    {
      id: 'analytics',
      title: 'Error Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      description: 'Real-time error monitoring and trend analysis'
    },
    {
      id: 'performance',
      title: 'Performance Monitoring',
      icon: <Zap className="w-5 h-5" />,
      description: 'Core Web Vitals and performance error detection'
    },
    {
      id: 'accessibility',
      title: 'Accessibility Monitoring',
      icon: <Eye className="w-5 h-5" />,
      description: 'Automated accessibility issue detection and fixes'
    }
  ];

  return (
    <div className="error-handling-demo max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Comprehensive Error Handling System
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          A complete error handling and recovery system with graceful fallbacks, 
          automatic retry mechanisms, privacy-conscious reporting, and real-time analytics.
        </p>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">System Status</h2>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            systemInitialized 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {systemInitialized ? 'Initialized' : 'Not Initialized'}
          </div>
        </div>
        
        {!systemInitialized && (
          <div className="mb-4">
            <button
              onClick={initializeSystem}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <Shield className="w-4 h-4 mr-2" />
              Initialize Error Handling System
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">Error Boundaries</div>
            <div className="text-xs text-gray-500">Active</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <RefreshCw className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">Circuit Breakers</div>
            <div className="text-xs text-gray-500">Monitoring</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Bug className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">Error Reporting</div>
            <div className="text-xs text-gray-500">Ready</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <BarChart3 className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">Analytics</div>
            <div className="text-xs text-gray-500">Collecting</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          {demoSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveDemo(section.id)}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeDemo === section.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {section.icon}
              <span className="ml-2">{section.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Demo Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeDemo === 'overview' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">System Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Key Features</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <AlertTriangle className="w-4 h-4 text-orange-500 mr-2" />
                    Graceful error boundaries with fallback content
                  </li>
                  <li className="flex items-center">
                    <RefreshCw className="w-4 h-4 text-blue-500 mr-2" />
                    Automatic retry with exponential backoff
                  </li>
                  <li className="flex items-center">
                    <Shield className="w-4 h-4 text-green-500 mr-2" />
                    Circuit breaker pattern for cascading failure prevention
                  </li>
                  <li className="flex items-center">
                    <Bug className="w-4 h-4 text-purple-500 mr-2" />
                    Privacy-conscious error reporting
                  </li>
                  <li className="flex items-center">
                    <BarChart3 className="w-4 h-4 text-indigo-500 mr-2" />
                    Real-time error analytics and monitoring
                  </li>
                  <li className="flex items-center">
                    <Zap className="w-4 h-4 text-yellow-500 mr-2" />
                    Performance monitoring and optimization
                  </li>
                  <li className="flex items-center">
                    <Eye className="w-4 h-4 text-pink-500 mr-2" />
                    Accessibility issue detection and auto-fixes
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Manual Error Triggers</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => triggerManualError('network')}
                    className="w-full text-left px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 hover:bg-red-100 transition-colors"
                  >
                    <Network className="w-4 h-4 inline mr-2" />
                    Trigger Network Error
                  </button>
                  <button
                    onClick={() => triggerManualError('ui')}
                    className="w-full text-left px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700 hover:bg-orange-100 transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4 inline mr-2" />
                    Trigger UI Error
                  </button>
                  <button
                    onClick={() => triggerManualError('performance')}
                    className="w-full text-left px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700 hover:bg-yellow-100 transition-colors"
                  >
                    <Zap className="w-4 h-4 inline mr-2" />
                    Trigger Performance Error
                  </button>
                  <button
                    onClick={() => triggerManualError('accessibility')}
                    className="w-full text-left px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    <Eye className="w-4 h-4 inline mr-2" />
                    Trigger Accessibility Error
                  </button>
                  <button
                    onClick={triggerErrorReport}
                    className="w-full text-left px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700 hover:bg-purple-100 transition-colors"
                  >
                    <Bug className="w-4 h-4 inline mr-2" />
                    Report Manual Issue
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeDemo === 'boundaries' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Error Boundaries Demo</h3>
            <p className="text-gray-600">
              Test different types of component errors and see how error boundaries handle them gracefully.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Error Controls</h4>
                <div className="space-y-2">
                  {Object.entries(errorStates).map(([type, isActive]) => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => toggleErrorState(type as keyof typeof errorStates)}
                        className="mr-2"
                      />
                      <span className="text-sm capitalize">{type} Error</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Component Tests</h4>
                <div className="space-y-4">
                  <ErrorBoundary level="component" componentName="NetworkComponent">
                    <div className="p-3 bg-gray-50 rounded border">
                      <NetworkErrorComponent shouldFail={errorStates.network} />
                    </div>
                  </ErrorBoundary>
                  
                  <ErrorBoundary level="component" componentName="UIComponent">
                    <div className="p-3 bg-gray-50 rounded border">
                      <UIErrorComponent shouldFail={errorStates.ui} />
                    </div>
                  </ErrorBoundary>
                  
                  <ErrorBoundary level="component" componentName="PerformanceComponent">
                    <div className="p-3 bg-gray-50 rounded border">
                      <PerformanceErrorComponent shouldFail={errorStates.performance} />
                    </div>
                  </ErrorBoundary>
                  
                  <ErrorBoundary level="component" componentName="AccessibilityComponent">
                    <div className="p-3 bg-gray-50 rounded border">
                      <AccessibilityErrorComponent shouldFail={errorStates.accessibility} />
                    </div>
                  </ErrorBoundary>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeDemo === 'analytics' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Error Analytics Dashboard</h3>
            <ErrorAnalyticsDashboard />
          </div>
        )}

        {activeDemo === 'recovery' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Recovery Mechanisms</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <RefreshCw className="w-5 h-5 text-blue-600 mr-2" />
                  <h4 className="font-medium text-blue-900">Automatic Retry</h4>
                </div>
                <p className="text-sm text-blue-800 mb-3">
                  Exponential backoff retry mechanism with configurable limits.
                </p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Max 3 retry attempts</li>
                  <li>• Exponential backoff (1s, 2s, 4s)</li>
                  <li>• Automatic for recoverable errors</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Shield className="w-5 h-5 text-green-600 mr-2" />
                  <h4 className="font-medium text-green-900">Circuit Breaker</h4>
                </div>
                <p className="text-sm text-green-800 mb-3">
                  Prevents cascading failures by temporarily blocking failing operations.
                </p>
                <ul className="text-xs text-green-700 space-y-1">
                  <li>• Opens after 5 failures</li>
                  <li>• 30s reset timeout</li>
                  <li>• Half-open state testing</li>
                </ul>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <AlertTriangle className="w-5 h-5 text-purple-600 mr-2" />
                  <h4 className="font-medium text-purple-900">Graceful Fallback</h4>
                </div>
                <p className="text-sm text-purple-800 mb-3">
                  Fallback content and alternative flows when recovery fails.
                </p>
                <ul className="text-xs text-purple-700 space-y-1">
                  <li>• Component-level fallbacks</li>
                  <li>• Page-level error pages</li>
                  <li>• Offline mode support</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeDemo === 'reporting' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Error Reporting</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Privacy Features</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <Users className="w-4 h-4 text-blue-500 mr-2" />
                    User consent required for reporting
                  </li>
                  <li className="flex items-center">
                    <Shield className="w-4 h-4 text-green-500 mr-2" />
                    Automatic PII sanitization
                  </li>
                  <li className="flex items-center">
                    <Eye className="w-4 h-4 text-purple-500 mr-2" />
                    Transparent data collection
                  </li>
                  <li className="flex items-center">
                    <Clock className="w-4 h-4 text-orange-500 mr-2" />
                    Offline queuing and sync
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Reporting Process</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">1</div>
                    <div>Error occurs and is caught by boundary</div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">2</div>
                    <div>User consent modal appears (if enabled)</div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">3</div>
                    <div>Error data is sanitized for privacy</div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">4</div>
                    <div>Report sent to server or queued offline</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeDemo === 'performance' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Performance Monitoring</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2">Core Web Vitals</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Largest Contentful Paint (LCP)</li>
                  <li>• First Input Delay (FID)</li>
                  <li>• Cumulative Layout Shift (CLS)</li>
                </ul>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-900 mb-2">Memory Monitoring</h4>
                <ul className="text-sm text-red-800 space-y-1">
                  <li>• Heap size tracking</li>
                  <li>• Memory leak detection</li>
                  <li>• Automatic cleanup triggers</li>
                </ul>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Network Performance</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Request timing analysis</li>
                  <li>• Timeout detection</li>
                  <li>• Offline fallback triggers</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeDemo === 'accessibility' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Accessibility Monitoring</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Automated Checks</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <Eye className="w-4 h-4 text-blue-500 mr-2" />
                    Missing alt text detection
                  </li>
                  <li className="flex items-center">
                    <Users className="w-4 h-4 text-green-500 mr-2" />
                    Accessible name validation
                  </li>
                  <li className="flex items-center">
                    <Shield className="w-4 h-4 text-purple-500 mr-2" />
                    Color contrast checking
                  </li>
                  <li className="flex items-center">
                    <RefreshCw className="w-4 h-4 text-orange-500 mr-2" />
                    Keyboard navigation testing
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Auto-fixes</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Automatic alt text generation</li>
                  <li>• ARIA label insertion</li>
                  <li>• Focus management correction</li>
                  <li>• Screen reader announcements</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};