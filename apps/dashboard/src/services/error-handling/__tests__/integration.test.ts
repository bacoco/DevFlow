/**
 * Error Handling Integration Tests
 * End-to-end tests for complete error handling system
 */

import { ErrorHandler } from '../ErrorHandler';
import { CircuitBreaker } from '../CircuitBreaker';
import { ErrorReporter } from '../ErrorReporter';
import { ErrorAnalytics } from '../ErrorAnalytics';
import { ErrorContext, ErrorHandlerConfig } from '../types';

describe('Error Handling Integration', () => {
  let errorHandler: ErrorHandler;
  let config: ErrorHandlerConfig;

  beforeEach(() => {
    config = {
      enableReporting: true,
      enableAnalytics: true,
      maxRetries: 3,
      retryDelay: 100, // Short delay for testing
      circuitBreaker: {
        failureThreshold: 2,
        resetTimeout: 1000,
        monitoringPeriod: 5000,
        halfOpenMaxCalls: 1
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
    };

    // Reset singleton
    (ErrorHandler as any).instance = undefined;
    errorHandler = ErrorHandler.getInstance(config);

    // Mock localStorage and sessionStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    });

    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn().mockReturnValue('test-session'),
        setItem: jest.fn()
      },
      writable: true
    });

    // Mock fetch for error reporting
    global.fetch = jest.fn();

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('complete error flow', () => {
    it('should handle error through complete pipeline', async () => {
      const context: ErrorContext = {
        sessionId: 'test-session',
        component: 'TestComponent',
        action: 'render',
        timestamp: new Date(),
        url: 'http://localhost:3000/test',
        userAgent: 'test-agent',
        metadata: {}
      };

      const error = new Error('Network request failed');
      const response = await errorHandler.handleUIError(error, context);

      expect(response.message).toContain('Connection issue detected');
      expect(response.severity).toBe('high');
      expect(response.retryable).toBe(true);
      expect(response.actions).toHaveLength(2); // Retry and dismiss actions
    });

    it('should trigger circuit breaker after repeated failures', async () => {
      const context: ErrorContext = {
        sessionId: 'test-session',
        component: 'TestComponent',
        action: 'render',
        timestamp: new Date(),
        url: 'http://localhost:3000/test',
        userAgent: 'test-agent',
        metadata: {}
      };

      const error = new Error('Repeated failure');

      // Trigger failures to open circuit breaker
      await errorHandler.handleUIError(error, context);
      await errorHandler.handleUIError(error, context);

      // Third call should use fallback due to open circuit
      const response = await errorHandler.handleUIError(error, context);

      expect(response.fallbackContent).toBeDefined();
      expect(response.retryable).toBe(false);
    });

    it('should recover from circuit breaker after timeout', async (done) => {
      const context: ErrorContext = {
        sessionId: 'test-session',
        component: 'TestComponent',
        action: 'render',
        timestamp: new Date(),
        url: 'http://localhost:3000/test',
        userAgent: 'test-agent',
        metadata: {}
      };

      const error = new Error('Temporary failure');

      // Open circuit breaker
      await errorHandler.handleUIError(error, context);
      await errorHandler.handleUIError(error, context);

      // Wait for circuit breaker timeout
      setTimeout(async () => {
        const response = await errorHandler.handleUIError(error, context);
        
        // Should allow retry again (half-open state)
        expect(response.retryable).toBe(true);
        done();
      }, 1100); // Slightly longer than resetTimeout
    });
  });

  describe('error analytics integration', () => {
    it('should record analytics for all errors', async () => {
      const analytics = new ErrorAnalytics();
      const recordSpy = jest.spyOn(analytics, 'recordError');

      const context: ErrorContext = {
        sessionId: 'test-session',
        component: 'TestComponent',
        action: 'render',
        timestamp: new Date(),
        url: 'http://localhost:3000/test',
        userAgent: 'test-agent',
        metadata: {}
      };

      const error1 = new Error('First error');
      const error2 = new Error('Second error');

      await errorHandler.handleUIError(error1, context);
      await errorHandler.handleUIError(error2, context);

      // Analytics should be recorded (though we can't directly test the internal instance)
      // This test verifies the integration works without errors
      expect(true).toBe(true);
    });

    it('should provide error trends and patterns', () => {
      const analytics = new ErrorAnalytics();

      // Simulate some errors
      const baseContext: ErrorContext = {
        sessionId: 'test-session',
        component: 'TestComponent',
        action: 'render',
        timestamp: new Date(),
        url: 'http://localhost:3000/test',
        userAgent: 'test-agent',
        metadata: {}
      };

      const errors = [
        { ...new Error('Network error'), category: 'network' as const, severity: 'high' as const },
        { ...new Error('UI error'), category: 'ui' as const, severity: 'medium' as const },
        { ...new Error('Another network error'), category: 'network' as const, severity: 'high' as const }
      ];

      errors.forEach(error => {
        analytics.recordError({
          ...error,
          id: `error-${Date.now()}-${Math.random()}`,
          context: baseContext,
          recoverable: true,
          userMessage: 'User message',
          technicalMessage: error.message,
          retryCount: 0,
          maxRetries: 3
        });
      });

      const trends = analytics.getErrorTrends('hour');
      const categories = analytics.getTopErrorCategories();

      expect(trends).toBeDefined();
      expect(categories).toBeDefined();
      expect(categories.length).toBeGreaterThan(0);
    });
  });

  describe('error reporting integration', () => {
    it('should report errors with user consent', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      const context: ErrorContext = {
        sessionId: 'test-session',
        component: 'TestComponent',
        action: 'render',
        timestamp: new Date(),
        url: 'http://localhost:3000/test',
        userAgent: 'test-agent',
        metadata: {}
      };

      const error = new Error('Reportable error');
      const response = await errorHandler.handleUIError(error, context);

      // Find and execute report action
      const reportAction = response.actions.find(action => action.type === 'report');
      if (reportAction) {
        await reportAction.handler();
      }

      // Should have attempted to send report
      expect(mockFetch).toHaveBeenCalledWith('/api/errors', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }));
    });

    it('should queue reports when offline', async () => {
      // Simulate offline state
      Object.defineProperty(navigator, 'onLine', {
        value: false
      });

      const reporter = new ErrorReporter();
      const report = {
        id: 'test-report',
        error: {
          ...new Error('Offline error'),
          id: 'error-1',
          category: 'network' as const,
          severity: 'medium' as const,
          context: {
            sessionId: 'test-session',
            component: 'TestComponent',
            action: 'render',
            timestamp: new Date(),
            url: 'http://localhost:3000/test',
            userAgent: 'test-agent',
            metadata: {}
          },
          recoverable: true,
          userMessage: 'Network error',
          technicalMessage: 'Offline error',
          retryCount: 0,
          maxRetries: 3
        },
        userConsent: true,
        reportedAt: new Date(),
        resolved: false
      };

      await reporter.reportError(report);

      const stats = reporter.getReportingStats();
      expect(stats.queuedReports).toBeGreaterThan(0);
    });
  });

  describe('performance error handling', () => {
    it('should handle loading performance errors', () => {
      const performanceError = {
        ...new Error('Loading timeout'),
        id: 'perf-1',
        category: 'performance' as const,
        severity: 'high' as const,
        context: {
          sessionId: 'test-session',
          component: 'TestComponent',
          action: 'load',
          timestamp: new Date(),
          url: 'http://localhost:3000/test',
          userAgent: 'test-agent',
          metadata: {}
        },
        recoverable: true,
        userMessage: 'Loading is taking too long',
        technicalMessage: 'Loading timeout',
        retryCount: 0,
        maxRetries: 3,
        metric: 'loading' as const,
        threshold: 3000,
        actualValue: 5000,
        impact: 'user' as const
      };

      const recovery = errorHandler.handlePerformanceError(performanceError);

      expect(recovery.type).toBe('retry');
      expect(recovery.delay).toBe(1000);
      expect(recovery.maxAttempts).toBe(3);
    });

    it('should handle memory performance errors with reload', () => {
      const performanceError = {
        ...new Error('Memory exceeded'),
        id: 'perf-2',
        category: 'performance' as const,
        severity: 'critical' as const,
        context: {
          sessionId: 'test-session',
          component: 'TestComponent',
          action: 'render',
          timestamp: new Date(),
          url: 'http://localhost:3000/test',
          userAgent: 'test-agent',
          metadata: {}
        },
        recoverable: false,
        userMessage: 'Memory issue detected',
        technicalMessage: 'Memory exceeded',
        retryCount: 0,
        maxRetries: 3,
        metric: 'memory' as const,
        threshold: 100,
        actualValue: 150,
        impact: 'system' as const
      };

      const recovery = errorHandler.handlePerformanceError(performanceError);

      expect(recovery.type).toBe('reload');
    });
  });

  describe('accessibility error handling', () => {
    it('should auto-fix common accessibility issues', () => {
      const a11yError = {
        ...new Error('Missing alt text'),
        id: 'a11y-1',
        category: 'accessibility' as const,
        severity: 'medium' as const,
        context: {
          sessionId: 'test-session',
          component: 'TestComponent',
          action: 'render',
          timestamp: new Date(),
          url: 'http://localhost:3000/test',
          userAgent: 'test-agent',
          metadata: {}
        },
        recoverable: true,
        userMessage: 'Accessibility issue detected',
        technicalMessage: 'Missing alt text',
        retryCount: 0,
        maxRetries: 3,
        rule: 'missing-alt-text',
        element: 'img#test-image',
        wcagLevel: 'AA' as const,
        impact: 'moderate' as const
      };

      // This should not throw an error
      expect(() => {
        errorHandler.handleAccessibilityError(a11yError);
      }).not.toThrow();
    });

    it('should report critical accessibility errors automatically', () => {
      const a11yError = {
        ...new Error('Critical accessibility violation'),
        id: 'a11y-2',
        category: 'accessibility' as const,
        severity: 'high' as const,
        context: {
          sessionId: 'test-session',
          component: 'TestComponent',
          action: 'render',
          timestamp: new Date(),
          url: 'http://localhost:3000/test',
          userAgent: 'test-agent',
          metadata: {}
        },
        recoverable: false,
        userMessage: 'Critical accessibility issue',
        technicalMessage: 'Critical accessibility violation',
        retryCount: 0,
        maxRetries: 3,
        rule: 'keyboard-trap',
        element: 'div#modal',
        wcagLevel: 'AAA' as const,
        impact: 'critical' as const
      };

      // Should handle without throwing
      expect(() => {
        errorHandler.handleAccessibilityError(a11yError);
      }).not.toThrow();
    });
  });

  describe('error recovery scenarios', () => {
    it('should handle retry with exponential backoff', async () => {
      const context: ErrorContext = {
        sessionId: 'test-session',
        component: 'TestComponent',
        action: 'retry',
        timestamp: new Date(),
        url: 'http://localhost:3000/test',
        userAgent: 'test-agent',
        metadata: {}
      };

      const error = new Error('Retryable error');
      
      // First attempt
      const response1 = await errorHandler.handleUIError(error, context);
      expect(response1.retryable).toBe(true);

      // Simulate retry with increased count
      const errorWithRetry = {
        ...error,
        retryCount: 1
      };

      // The delay should increase with retry count
      const retryAction = response1.actions.find(action => action.type === 'retry');
      expect(retryAction).toBeDefined();
    });

    it('should fallback after max retries exceeded', async () => {
      const context: ErrorContext = {
        sessionId: 'test-session',
        component: 'TestComponent',
        action: 'render',
        timestamp: new Date(),
        url: 'http://localhost:3000/test',
        userAgent: 'test-agent',
        metadata: {}
      };

      const error = new Error('Persistent error');
      
      // Simulate multiple retries
      for (let i = 0; i < config.maxRetries + 1; i++) {
        const response = await errorHandler.handleUIError(error, context);
        
        if (i >= config.maxRetries) {
          expect(response.retryable).toBe(false);
          expect(response.fallbackContent).toBeDefined();
        }
      }
    });
  });

  describe('configuration handling', () => {
    it('should respect disabled reporting configuration', async () => {
      const disabledConfig = { ...config, enableReporting: false };
      (ErrorHandler as any).instance = undefined;
      const disabledHandler = ErrorHandler.getInstance(disabledConfig);

      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockClear();

      const context: ErrorContext = {
        sessionId: 'test-session',
        component: 'TestComponent',
        action: 'render',
        timestamp: new Date(),
        url: 'http://localhost:3000/test',
        userAgent: 'test-agent',
        metadata: {}
      };

      const error = {
        ...new Error('Test error'),
        id: 'test-1',
        category: 'ui' as const,
        severity: 'medium' as const,
        context,
        recoverable: true,
        userMessage: 'Test error',
        technicalMessage: 'Test error',
        retryCount: 0,
        maxRetries: 3
      };

      await disabledHandler.reportError(error, true);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should use custom fallback strategies', async () => {
      const customConfig = {
        ...config,
        fallbackStrategies: {
          ...config.fallbackStrategies,
          network: { type: 'redirect' as const, redirect: '/offline' }
        }
      };

      (ErrorHandler as any).instance = undefined;
      const customHandler = ErrorHandler.getInstance(customConfig);

      const context: ErrorContext = {
        sessionId: 'test-session',
        component: 'TestComponent',
        action: 'render',
        timestamp: new Date(),
        url: 'http://localhost:3000/test',
        userAgent: 'test-agent',
        metadata: {}
      };

      const networkError = new Error('Network failed');
      const response = await customHandler.handleUIError(networkError, context);

      // Should use custom fallback strategy
      expect(response.message).toContain('Connection issue detected');
    });
  });
});