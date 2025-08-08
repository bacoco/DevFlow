/**
 * Error Handler Tests
 * Comprehensive test suite for error handling and recovery
 */

import { ErrorHandler } from '../ErrorHandler';
import { CircuitBreaker } from '../CircuitBreaker';
import { ErrorReporter } from '../ErrorReporter';
import { ErrorAnalytics } from '../ErrorAnalytics';
import { UIError, ErrorContext, ErrorHandlerConfig } from '../types';

// Mock dependencies
jest.mock('../CircuitBreaker');
jest.mock('../ErrorReporter');
jest.mock('../ErrorAnalytics');

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let mockConfig: ErrorHandlerConfig;
  let mockContext: ErrorContext;

  beforeEach(() => {
    mockConfig = {
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
    };

    mockContext = {
      sessionId: 'test-session',
      component: 'TestComponent',
      action: 'render',
      timestamp: new Date(),
      url: 'http://localhost:3000/test',
      userAgent: 'test-agent',
      metadata: {}
    };

    // Reset singleton instance
    (ErrorHandler as any).instance = undefined;
    errorHandler = ErrorHandler.getInstance(mockConfig);

    // Clear mocks
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should create singleton instance with config', () => {
      const instance1 = ErrorHandler.getInstance(mockConfig);
      const instance2 = ErrorHandler.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should throw error if no config provided on first call', () => {
      (ErrorHandler as any).instance = undefined;
      
      expect(() => ErrorHandler.getInstance()).toThrow('ErrorHandler must be initialized with config');
    });
  });

  describe('handleUIError', () => {
    it('should handle network errors correctly', async () => {
      const error = new Error('Network request failed');
      const response = await errorHandler.handleUIError(error, mockContext);

      expect(response.message).toContain('Connection issue detected');
      expect(response.severity).toBe('high');
      expect(response.retryable).toBe(true);
    });

    it('should handle auth errors correctly', async () => {
      const error = new Error('Unauthorized access');
      const response = await errorHandler.handleUIError(error, mockContext);

      expect(response.message).toContain('Authentication required');
      expect(response.severity).toBe('critical');
    });

    it('should handle UI errors correctly', async () => {
      const error = new Error('Component render failed');
      error.name = 'TypeError';
      const response = await errorHandler.handleUIError(error, mockContext);

      expect(response.message).toContain('Something went wrong with the interface');
      expect(response.severity).toBe('medium');
    });

    it('should respect circuit breaker state', async () => {
      const mockCircuitBreaker = {
        isOpen: jest.fn().mockReturnValue(true),
        recordSuccess: jest.fn(),
        recordFailure: jest.fn()
      };
      
      (CircuitBreaker as jest.Mock).mockImplementation(() => mockCircuitBreaker);
      
      const error = new Error('Test error');
      const response = await errorHandler.handleUIError(error, mockContext);

      expect(response.fallbackContent).toBeDefined();
      expect(response.retryable).toBe(false);
    });

    it('should record analytics for all errors', async () => {
      const mockAnalytics = {
        recordError: jest.fn()
      };
      
      (ErrorAnalytics as jest.Mock).mockImplementation(() => mockAnalytics);
      
      const error = new Error('Test error');
      await errorHandler.handleUIError(error, mockContext);

      expect(mockAnalytics.recordError).toHaveBeenCalled();
    });
  });

  describe('handlePerformanceError', () => {
    it('should handle loading performance errors', () => {
      const performanceError = {
        ...new Error('Loading timeout'),
        id: 'perf-1',
        category: 'performance' as const,
        severity: 'high' as const,
        context: mockContext,
        recoverable: true,
        userMessage: 'Loading is slow',
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

    it('should handle memory performance errors', () => {
      const performanceError = {
        ...new Error('Memory exceeded'),
        id: 'perf-2',
        category: 'performance' as const,
        severity: 'critical' as const,
        context: mockContext,
        recoverable: false,
        userMessage: 'Memory issue',
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

    it('should handle network performance errors', () => {
      const performanceError = {
        ...new Error('Network slow'),
        id: 'perf-3',
        category: 'performance' as const,
        severity: 'medium' as const,
        context: mockContext,
        recoverable: true,
        userMessage: 'Network is slow',
        technicalMessage: 'Network slow',
        retryCount: 0,
        maxRetries: 3,
        metric: 'network' as const,
        threshold: 1000,
        actualValue: 3000,
        impact: 'user' as const
      };

      const recovery = errorHandler.handlePerformanceError(performanceError);

      expect(recovery.type).toBe('fallback');
      expect(recovery.fallbackStrategy?.type).toBe('offline');
    });
  });

  describe('handleAccessibilityError', () => {
    it('should auto-fix missing alt text', () => {
      const a11yError = {
        ...new Error('Missing alt text'),
        id: 'a11y-1',
        category: 'accessibility' as const,
        severity: 'medium' as const,
        context: mockContext,
        recoverable: true,
        userMessage: 'Accessibility issue',
        technicalMessage: 'Missing alt text',
        retryCount: 0,
        maxRetries: 3,
        rule: 'missing-alt-text',
        element: 'img#test',
        wcagLevel: 'AA' as const,
        impact: 'moderate' as const
      };

      const autoFixSpy = jest.spyOn(errorHandler as any, 'autoFixAltText');
      errorHandler.handleAccessibilityError(a11yError);

      expect(autoFixSpy).toHaveBeenCalledWith('img#test');
    });

    it('should auto-fix missing aria labels', () => {
      const a11yError = {
        ...new Error('Missing aria label'),
        id: 'a11y-2',
        category: 'accessibility' as const,
        severity: 'medium' as const,
        context: mockContext,
        recoverable: true,
        userMessage: 'Accessibility issue',
        technicalMessage: 'Missing aria label',
        retryCount: 0,
        maxRetries: 3,
        rule: 'missing-aria-label',
        element: 'button#test',
        wcagLevel: 'AA' as const,
        impact: 'moderate' as const
      };

      const autoFixSpy = jest.spyOn(errorHandler as any, 'autoFixAriaLabel');
      errorHandler.handleAccessibilityError(a11yError);

      expect(autoFixSpy).toHaveBeenCalledWith('button#test');
    });

    it('should report critical accessibility errors', () => {
      const mockReporter = {
        reportError: jest.fn()
      };
      
      (ErrorReporter as jest.Mock).mockImplementation(() => mockReporter);

      const a11yError = {
        ...new Error('Critical a11y error'),
        id: 'a11y-3',
        category: 'accessibility' as const,
        severity: 'high' as const,
        context: mockContext,
        recoverable: false,
        userMessage: 'Critical accessibility issue',
        technicalMessage: 'Critical a11y error',
        retryCount: 0,
        maxRetries: 3,
        rule: 'keyboard-trap',
        element: 'div#modal',
        wcagLevel: 'AAA' as const,
        impact: 'critical' as const
      };

      errorHandler.handleAccessibilityError(a11yError);

      expect(mockReporter.reportError).toHaveBeenCalledWith({
        id: a11yError.id,
        error: a11yError,
        userConsent: true,
        reportedAt: expect.any(Date),
        resolved: false
      });
    });
  });

  describe('reportError', () => {
    it('should report error when reporting is enabled', async () => {
      const mockReporter = {
        reportError: jest.fn()
      };
      
      (ErrorReporter as jest.Mock).mockImplementation(() => mockReporter);

      const uiError: UIError = {
        ...new Error('Test error'),
        id: 'test-1',
        category: 'ui',
        severity: 'medium',
        context: mockContext,
        recoverable: true,
        userMessage: 'Test error occurred',
        technicalMessage: 'Test error',
        retryCount: 0,
        maxRetries: 3
      };

      await errorHandler.reportError(uiError, true);

      expect(mockReporter.reportError).toHaveBeenCalledWith({
        id: uiError.id,
        error: uiError,
        userConsent: true,
        reportedAt: expect.any(Date),
        resolved: false
      });
    });

    it('should not report when reporting is disabled', async () => {
      const disabledConfig = { ...mockConfig, enableReporting: false };
      (ErrorHandler as any).instance = undefined;
      const disabledHandler = ErrorHandler.getInstance(disabledConfig);

      const mockReporter = {
        reportError: jest.fn()
      };
      
      (ErrorReporter as jest.Mock).mockImplementation(() => mockReporter);

      const uiError: UIError = {
        ...new Error('Test error'),
        id: 'test-1',
        category: 'ui',
        severity: 'medium',
        context: mockContext,
        recoverable: true,
        userMessage: 'Test error occurred',
        technicalMessage: 'Test error',
        retryCount: 0,
        maxRetries: 3
      };

      await disabledHandler.reportError(uiError, true);

      expect(mockReporter.reportError).not.toHaveBeenCalled();
    });
  });

  describe('error categorization', () => {
    it('should categorize network errors correctly', () => {
      const networkError = new Error('fetch failed');
      const category = (errorHandler as any).categorizeError(networkError);
      expect(category).toBe('network');
    });

    it('should categorize auth errors correctly', () => {
      const authError = new Error('unauthorized access');
      const category = (errorHandler as any).categorizeError(authError);
      expect(category).toBe('auth');
    });

    it('should categorize performance errors correctly', () => {
      const perfError = new Error('timeout occurred');
      const category = (errorHandler as any).categorizeError(perfError);
      expect(category).toBe('performance');
    });

    it('should categorize accessibility errors correctly', () => {
      const a11yError = new Error('accessibility violation');
      const category = (errorHandler as any).categorizeError(a11yError);
      expect(category).toBe('accessibility');
    });

    it('should categorize UI errors correctly', () => {
      const uiError = new Error('render failed');
      uiError.name = 'ChunkLoadError';
      const category = (errorHandler as any).categorizeError(uiError);
      expect(category).toBe('ui');
    });

    it('should default to unknown for unrecognized errors', () => {
      const unknownError = new Error('mysterious error');
      const category = (errorHandler as any).categorizeError(unknownError);
      expect(category).toBe('unknown');
    });
  });

  describe('severity determination', () => {
    it('should assign critical severity to auth errors', () => {
      const severity = (errorHandler as any).determineSeverity(new Error('test'), 'auth');
      expect(severity).toBe('critical');
    });

    it('should assign critical severity to data errors', () => {
      const severity = (errorHandler as any).determineSeverity(new Error('test'), 'data');
      expect(severity).toBe('critical');
    });

    it('should assign high severity to network errors', () => {
      const severity = (errorHandler as any).determineSeverity(new Error('test'), 'network');
      expect(severity).toBe('high');
    });

    it('should assign high severity to performance errors', () => {
      const severity = (errorHandler as any).determineSeverity(new Error('test'), 'performance');
      expect(severity).toBe('high');
    });

    it('should assign medium severity to UI errors', () => {
      const severity = (errorHandler as any).determineSeverity(new Error('test'), 'ui');
      expect(severity).toBe('medium');
    });

    it('should assign low severity to unknown errors', () => {
      const severity = (errorHandler as any).determineSeverity(new Error('test'), 'unknown');
      expect(severity).toBe('low');
    });
  });

  describe('recovery strategies', () => {
    it('should use fallback for non-recoverable errors', () => {
      const error: UIError = {
        ...new Error('Test error'),
        id: 'test-1',
        category: 'ui',
        severity: 'medium',
        context: mockContext,
        recoverable: false,
        userMessage: 'Test error occurred',
        technicalMessage: 'Test error',
        retryCount: 0,
        maxRetries: 3
      };

      const strategy = (errorHandler as any).determineRecoveryStrategy(error);
      expect(strategy.type).toBe('fallback');
    });

    it('should use retry for recoverable errors within retry limit', () => {
      const error: UIError = {
        ...new Error('Test error'),
        id: 'test-1',
        category: 'ui',
        severity: 'medium',
        context: mockContext,
        recoverable: true,
        userMessage: 'Test error occurred',
        technicalMessage: 'Test error',
        retryCount: 1,
        maxRetries: 3
      };

      const strategy = (errorHandler as any).determineRecoveryStrategy(error);
      expect(strategy.type).toBe('retry');
      expect(strategy.maxAttempts).toBe(2);
    });

    it('should use fallback when retry limit exceeded', () => {
      const error: UIError = {
        ...new Error('Test error'),
        id: 'test-1',
        category: 'ui',
        severity: 'medium',
        context: mockContext,
        recoverable: true,
        userMessage: 'Test error occurred',
        technicalMessage: 'Test error',
        retryCount: 3,
        maxRetries: 3
      };

      const strategy = (errorHandler as any).determineRecoveryStrategy(error);
      expect(strategy.type).toBe('fallback');
    });
  });

  describe('retry delay calculation', () => {
    it('should calculate exponential backoff correctly', () => {
      const delay0 = (errorHandler as any).calculateRetryDelay(0);
      const delay1 = (errorHandler as any).calculateRetryDelay(1);
      const delay2 = (errorHandler as any).calculateRetryDelay(2);

      expect(delay0).toBe(1000);
      expect(delay1).toBe(2000);
      expect(delay2).toBe(4000);
    });

    it('should cap retry delay at maximum', () => {
      const delay10 = (errorHandler as any).calculateRetryDelay(10);
      expect(delay10).toBe(10000); // Max 10 seconds
    });
  });
});