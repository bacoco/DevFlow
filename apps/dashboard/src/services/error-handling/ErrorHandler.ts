/**
 * Core Error Handler
 * Central error handling service with recovery mechanisms
 */

import { 
  UIError, 
  ErrorContext, 
  ErrorResponse, 
  ErrorAction, 
  ErrorCategory, 
  ErrorSeverity,
  RecoveryAction,
  ErrorHandlerConfig,
  PerformanceError,
  A11yError
} from './types';
import { CircuitBreaker } from './CircuitBreaker';
import { ErrorReporter } from './ErrorReporter';
import { ErrorAnalytics } from './ErrorAnalytics';

export class ErrorHandler {
  private static instance: ErrorHandler;
  private config: ErrorHandlerConfig;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private errorReporter: ErrorReporter;
  private errorAnalytics: ErrorAnalytics;

  private constructor(config: ErrorHandlerConfig) {
    this.config = config;
    this.errorReporter = new ErrorReporter();
    this.errorAnalytics = new ErrorAnalytics();
  }

  static getInstance(config?: ErrorHandlerConfig): ErrorHandler {
    if (!ErrorHandler.instance) {
      if (!config) {
        throw new Error('ErrorHandler must be initialized with config');
      }
      ErrorHandler.instance = new ErrorHandler(config);
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle UI errors with appropriate recovery strategies
   */
  async handleUIError(error: Error, context: ErrorContext): Promise<ErrorResponse> {
    const uiError = this.createUIError(error, context);
    
    // Log error for analytics
    this.errorAnalytics.recordError(uiError);

    // Check circuit breaker
    const circuitBreaker = this.getCircuitBreaker(context.component);
    if (circuitBreaker.isOpen()) {
      return this.createFallbackResponse(uiError);
    }

    // Determine recovery strategy
    const recoveryAction = this.determineRecoveryStrategy(uiError);
    
    try {
      const response = await this.executeRecovery(uiError, recoveryAction);
      circuitBreaker.recordSuccess();
      return response;
    } catch (recoveryError) {
      circuitBreaker.recordFailure();
      return this.createFallbackResponse(uiError);
    }
  }

  /**
   * Handle performance-related errors
   */
  handlePerformanceError(error: PerformanceError): RecoveryAction {
    this.errorAnalytics.recordError(error);

    switch (error.metric) {
      case 'loading':
        return {
          type: 'retry',
          delay: 1000,
          maxAttempts: 3,
          fallbackStrategy: {
            type: 'component',
            content: this.createSkeletonFallback()
          }
        };
      
      case 'memory':
        return {
          type: 'reload',
          fallbackStrategy: {
            type: 'page',
            redirect: '/error?type=memory'
          }
        };
      
      case 'network':
        return {
          type: 'fallback',
          fallbackStrategy: {
            type: 'offline',
            content: this.createOfflineFallback()
          }
        };
      
      default:
        return {
          type: 'retry',
          delay: 500,
          maxAttempts: 2
        };
    }
  }

  /**
   * Handle accessibility errors
   */
  handleAccessibilityError(error: A11yError): void {
    this.errorAnalytics.recordError(error);

    // Auto-fix common accessibility issues
    if (error.rule === 'missing-alt-text') {
      this.autoFixAltText(error.element);
    } else if (error.rule === 'missing-aria-label') {
      this.autoFixAriaLabel(error.element);
    }

    // Report for manual review if critical
    if (error.impact === 'critical') {
      this.errorReporter.reportError({
        id: error.id,
        error,
        userConsent: true, // A11y errors are always reported
        reportedAt: new Date(),
        resolved: false
      });
    }
  }

  /**
   * Report error with user consent
   */
  async reportError(error: UIError, userConsent: boolean): Promise<void> {
    if (!this.config.enableReporting) return;

    await this.errorReporter.reportError({
      id: error.id,
      error,
      userConsent,
      reportedAt: new Date(),
      resolved: false
    });
  }

  /**
   * Create UI error from generic error
   */
  private createUIError(error: Error, context: ErrorContext): UIError {
    const category = this.categorizeError(error);
    const severity = this.determineSeverity(error, category);
    
    return {
      ...error,
      id: this.generateErrorId(),
      category,
      severity,
      context,
      recoverable: this.isRecoverable(error, category),
      userMessage: this.createUserMessage(error, category),
      technicalMessage: error.message,
      retryCount: 0,
      maxRetries: this.config.maxRetries
    };
  }

  /**
   * Categorize error type
   */
  private categorizeError(error: Error): ErrorCategory {
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return 'network';
    }
    if (error.message.includes('auth') || error.message.includes('unauthorized')) {
      return 'auth';
    }
    if (error.message.includes('performance') || error.message.includes('timeout')) {
      return 'performance';
    }
    if (error.message.includes('accessibility') || error.message.includes('a11y')) {
      return 'accessibility';
    }
    if (error.name === 'ChunkLoadError' || error.name === 'TypeError') {
      return 'ui';
    }
    return 'unknown';
  }

  /**
   * Determine error severity
   */
  private determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    if (category === 'auth' || category === 'data') return 'critical';
    if (category === 'network' || category === 'performance') return 'high';
    if (category === 'ui') return 'medium';
    return 'low';
  }

  /**
   * Check if error is recoverable
   */
  private isRecoverable(error: Error, category: ErrorCategory): boolean {
    const nonRecoverableErrors = ['ChunkLoadError', 'SecurityError'];
    return !nonRecoverableErrors.includes(error.name) && category !== 'auth';
  }

  /**
   * Create user-friendly error message
   */
  private createUserMessage(error: Error, category: ErrorCategory): string {
    const messages = {
      network: 'Connection issue detected. Please check your internet connection and try again.',
      ui: 'Something went wrong with the interface. We\'re working to fix this.',
      data: 'Unable to load data. Please refresh the page or try again later.',
      auth: 'Authentication required. Please log in to continue.',
      performance: 'The page is loading slowly. Please wait or try refreshing.',
      accessibility: 'Accessibility issue detected. The page may not work properly with assistive technologies.',
      unknown: 'An unexpected error occurred. Please try again or contact support if the problem persists.'
    };
    
    return messages[category] || messages.unknown;
  }

  /**
   * Determine recovery strategy based on error
   */
  private determineRecoveryStrategy(error: UIError): RecoveryAction {
    const strategy = this.config.fallbackStrategies[error.category];
    
    if (!error.recoverable) {
      return {
        type: 'fallback',
        fallbackStrategy: strategy
      };
    }

    if (error.retryCount < error.maxRetries) {
      return {
        type: 'retry',
        delay: this.calculateRetryDelay(error.retryCount),
        maxAttempts: error.maxRetries - error.retryCount
      };
    }

    return {
      type: 'fallback',
      fallbackStrategy: strategy
    };
  }

  /**
   * Execute recovery action
   */
  private async executeRecovery(error: UIError, action: RecoveryAction): Promise<ErrorResponse> {
    switch (action.type) {
      case 'retry':
        return this.createRetryResponse(error, action);
      
      case 'fallback':
        return this.createFallbackResponse(error, action.fallbackStrategy);
      
      case 'reload':
        window.location.reload();
        return this.createReloadResponse(error);
      
      case 'redirect':
        if (action.fallbackStrategy?.redirect) {
          window.location.href = action.fallbackStrategy.redirect;
        }
        return this.createRedirectResponse(error);
      
      default:
        return this.createFallbackResponse(error);
    }
  }

  /**
   * Create retry response
   */
  private createRetryResponse(error: UIError, action: RecoveryAction): ErrorResponse {
    const retryAction: ErrorAction = {
      type: 'retry',
      label: 'Try Again',
      handler: async () => {
        error.retryCount++;
        await new Promise(resolve => setTimeout(resolve, action.delay || 1000));
        // Retry logic would be handled by the component
      },
      primary: true
    };

    return {
      message: error.userMessage,
      severity: error.severity,
      actions: [retryAction, this.createDismissAction()],
      retryable: true,
      autoRetry: error.severity === 'low',
      retryDelay: action.delay
    };
  }

  /**
   * Create fallback response
   */
  private createFallbackResponse(error: UIError, strategy?: any): ErrorResponse {
    return {
      message: error.userMessage,
      severity: error.severity,
      actions: [
        this.createReportAction(error),
        this.createDismissAction()
      ],
      fallbackContent: strategy?.content || this.createGenericFallback(),
      retryable: false
    };
  }

  /**
   * Create reload response
   */
  private createReloadResponse(error: UIError): ErrorResponse {
    return {
      message: 'The page will reload to fix this issue.',
      severity: error.severity,
      actions: [],
      retryable: false
    };
  }

  /**
   * Create redirect response
   */
  private createRedirectResponse(error: UIError): ErrorResponse {
    return {
      message: 'Redirecting to a safe page...',
      severity: error.severity,
      actions: [],
      retryable: false
    };
  }

  /**
   * Create common actions
   */
  private createRetryAction(error: UIError): ErrorAction {
    return {
      type: 'retry',
      label: 'Try Again',
      handler: () => {
        error.retryCount++;
        // Retry would be handled by calling component
      },
      primary: true
    };
  }

  private createReportAction(error: UIError): ErrorAction {
    return {
      type: 'report',
      label: 'Report Issue',
      handler: () => this.reportError(error, true)
    };
  }

  private createDismissAction(): ErrorAction {
    return {
      type: 'dismiss',
      label: 'Dismiss',
      handler: () => {
        // Dismiss handled by UI component
      }
    };
  }

  /**
   * Utility methods
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateRetryDelay(retryCount: number): number {
    return Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
  }

  private getCircuitBreaker(component: string): CircuitBreaker {
    if (!this.circuitBreakers.has(component)) {
      this.circuitBreakers.set(component, new CircuitBreaker(this.config.circuitBreaker));
    }
    return this.circuitBreakers.get(component)!;
  }

  private createSkeletonFallback(): React.ReactNode {
    // Would return skeleton component
    return null;
  }

  private createOfflineFallback(): React.ReactNode {
    // Would return offline component
    return null;
  }

  private createGenericFallback(): React.ReactNode {
    // Would return generic error component
    return null;
  }

  private autoFixAltText(element: string): void {
    // Auto-fix implementation
  }

  private autoFixAriaLabel(element: string): void {
    // Auto-fix implementation
  }
}