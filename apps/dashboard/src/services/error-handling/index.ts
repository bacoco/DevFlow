/**
 * Error Handling System
 * Main entry point for comprehensive error handling and recovery
 */

export { ErrorHandler } from './ErrorHandler';
export { CircuitBreaker } from './CircuitBreaker';
export { ErrorReporter } from './ErrorReporter';
export { ErrorAnalytics } from './ErrorAnalytics';

export { ErrorBoundary, withErrorBoundary, useErrorHandler } from '../components/ErrorHandling/ErrorBoundary';
export { ErrorFallback, MinimalErrorFallback, LoadingErrorFallback } from '../components/ErrorHandling/ErrorFallback';
export { ErrorAnalyticsDashboard } from '../components/ErrorHandling/ErrorAnalyticsDashboard';

export * from './types';

// Default configuration
export const DEFAULT_ERROR_HANDLER_CONFIG = {
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
    network: { type: 'component' as const, content: null },
    ui: { type: 'component' as const, content: null },
    data: { type: 'component' as const, content: null },
    auth: { type: 'redirect' as const, redirect: '/auth' },
    performance: { type: 'component' as const, content: null },
    accessibility: { type: 'component' as const, content: null },
    unknown: { type: 'component' as const, content: null }
  }
};

/**
 * Initialize error handling system with configuration
 */
export function initializeErrorHandling(config = DEFAULT_ERROR_HANDLER_CONFIG) {
  return ErrorHandler.getInstance(config);
}

/**
 * Global error handler for unhandled errors
 */
export function setupGlobalErrorHandling() {
  const errorHandler = ErrorHandler.getInstance();

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const context = {
      sessionId: sessionStorage.getItem('error_session_id') || 'unknown',
      component: 'Global',
      action: 'unhandledrejection',
      timestamp: new Date(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metadata: {
        reason: event.reason,
        promise: event.promise
      }
    };

    errorHandler.handleUIError(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      context
    );

    // Prevent default browser error handling
    event.preventDefault();
  });

  // Handle global JavaScript errors
  window.addEventListener('error', (event) => {
    const context = {
      sessionId: sessionStorage.getItem('error_session_id') || 'unknown',
      component: 'Global',
      action: 'error',
      timestamp: new Date(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      }
    };

    errorHandler.handleUIError(
      event.error || new Error(event.message),
      context
    );
  });

  // Handle resource loading errors
  window.addEventListener('error', (event) => {
    if (event.target !== window) {
      const target = event.target as HTMLElement;
      const context = {
        sessionId: sessionStorage.getItem('error_session_id') || 'unknown',
        component: 'Resource',
        action: 'load',
        timestamp: new Date(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        metadata: {
          tagName: target.tagName,
          src: (target as any).src || (target as any).href,
          id: target.id,
          className: target.className
        }
      };

      errorHandler.handleUIError(
        new Error(`Failed to load resource: ${target.tagName}`),
        context
      );
    }
  }, true);
}

/**
 * Performance monitoring integration
 */
export function setupPerformanceMonitoring() {
  const errorHandler = ErrorHandler.getInstance();

  // Monitor Core Web Vitals
  if ('PerformanceObserver' in window) {
    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      if (lastEntry.startTime > 2500) { // LCP threshold
        const performanceError = {
          ...new Error('Poor LCP performance'),
          id: `perf_lcp_${Date.now()}`,
          category: 'performance' as const,
          severity: 'medium' as const,
          context: {
            sessionId: sessionStorage.getItem('error_session_id') || 'unknown',
            component: 'Performance',
            action: 'lcp',
            timestamp: new Date(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            metadata: { value: lastEntry.startTime }
          },
          recoverable: true,
          userMessage: 'Page loading is slower than expected',
          technicalMessage: `LCP: ${lastEntry.startTime}ms`,
          retryCount: 0,
          maxRetries: 0,
          metric: 'loading' as const,
          threshold: 2500,
          actualValue: lastEntry.startTime,
          impact: 'user' as const
        };

        errorHandler.handlePerformanceError(performanceError);
      }
    });

    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.processingStart - entry.startTime > 100) { // FID threshold
          const performanceError = {
            ...new Error('Poor FID performance'),
            id: `perf_fid_${Date.now()}`,
            category: 'performance' as const,
            severity: 'medium' as const,
            context: {
              sessionId: sessionStorage.getItem('error_session_id') || 'unknown',
              component: 'Performance',
              action: 'fid',
              timestamp: new Date(),
              url: window.location.href,
              userAgent: navigator.userAgent,
              metadata: { value: entry.processingStart - entry.startTime }
            },
            recoverable: true,
            userMessage: 'Interface responsiveness is slower than expected',
            technicalMessage: `FID: ${entry.processingStart - entry.startTime}ms`,
            retryCount: 0,
            maxRetries: 0,
            metric: 'interaction' as const,
            threshold: 100,
            actualValue: entry.processingStart - entry.startTime,
            impact: 'user' as const
          };

          errorHandler.handlePerformanceError(performanceError);
        }
      });
    });

    fidObserver.observe({ entryTypes: ['first-input'] });
  }

  // Monitor memory usage
  if ('memory' in performance) {
    setInterval(() => {
      const memory = (performance as any).memory;
      const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      
      if (usageRatio > 0.9) { // 90% memory usage
        const performanceError = {
          ...new Error('High memory usage'),
          id: `perf_memory_${Date.now()}`,
          category: 'performance' as const,
          severity: 'high' as const,
          context: {
            sessionId: sessionStorage.getItem('error_session_id') || 'unknown',
            component: 'Performance',
            action: 'memory',
            timestamp: new Date(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            metadata: { 
              usedJSHeapSize: memory.usedJSHeapSize,
              jsHeapSizeLimit: memory.jsHeapSizeLimit,
              usageRatio
            }
          },
          recoverable: false,
          userMessage: 'The application is using too much memory',
          technicalMessage: `Memory usage: ${(usageRatio * 100).toFixed(1)}%`,
          retryCount: 0,
          maxRetries: 0,
          metric: 'memory' as const,
          threshold: 0.9,
          actualValue: usageRatio,
          impact: 'system' as const
        };

        errorHandler.handlePerformanceError(performanceError);
      }
    }, 30000); // Check every 30 seconds
  }
}

/**
 * Accessibility monitoring integration
 */
export function setupAccessibilityMonitoring() {
  const errorHandler = ErrorHandler.getInstance();

  // Monitor for common accessibility issues
  const checkAccessibility = () => {
    // Check for images without alt text
    const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
    imagesWithoutAlt.forEach((img, index) => {
      const a11yError = {
        ...new Error('Missing alt text'),
        id: `a11y_alt_${Date.now()}_${index}`,
        category: 'accessibility' as const,
        severity: 'medium' as const,
        context: {
          sessionId: sessionStorage.getItem('error_session_id') || 'unknown',
          component: 'Accessibility',
          action: 'audit',
          timestamp: new Date(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          metadata: { 
            element: img.tagName,
            src: (img as HTMLImageElement).src,
            id: img.id,
            className: img.className
          }
        },
        recoverable: true,
        userMessage: 'Image accessibility issue detected',
        technicalMessage: 'Missing alt text on image',
        retryCount: 0,
        maxRetries: 0,
        rule: 'missing-alt-text',
        element: `img${img.id ? '#' + img.id : ''}${img.className ? '.' + img.className.split(' ').join('.') : ''}`,
        wcagLevel: 'AA' as const,
        impact: 'moderate' as const
      };

      errorHandler.handleAccessibilityError(a11yError);
    });

    // Check for buttons without accessible names
    const buttonsWithoutNames = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
    buttonsWithoutNames.forEach((button, index) => {
      if (!button.textContent?.trim()) {
        const a11yError = {
          ...new Error('Missing accessible name'),
          id: `a11y_button_${Date.now()}_${index}`,
          category: 'accessibility' as const,
          severity: 'medium' as const,
          context: {
            sessionId: sessionStorage.getItem('error_session_id') || 'unknown',
            component: 'Accessibility',
            action: 'audit',
            timestamp: new Date(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            metadata: { 
              element: button.tagName,
              id: button.id,
              className: button.className
            }
          },
          recoverable: true,
          userMessage: 'Button accessibility issue detected',
          technicalMessage: 'Button missing accessible name',
          retryCount: 0,
          maxRetries: 0,
          rule: 'missing-accessible-name',
          element: `button${button.id ? '#' + button.id : ''}${button.className ? '.' + button.className.split(' ').join('.') : ''}`,
          wcagLevel: 'AA' as const,
          impact: 'moderate' as const
        };

        errorHandler.handleAccessibilityError(a11yError);
      }
    });
  };

  // Run accessibility check on DOM changes
  if ('MutationObserver' in window) {
    const observer = new MutationObserver(() => {
      // Debounce the accessibility check
      clearTimeout((observer as any).timeoutId);
      (observer as any).timeoutId = setTimeout(checkAccessibility, 1000);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Initial accessibility check
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAccessibility);
  } else {
    checkAccessibility();
  }
}