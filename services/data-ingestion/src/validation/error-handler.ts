import winston from 'winston';
import { kafkaProducer } from '../kafka';

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs?: number;
}

export interface ErrorContext {
  operation: string;
  source: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface RetryableError extends Error {
  isRetryable: boolean;
  retryAfterMs?: number;
}

export class ErrorHandler {
  private logger: winston.Logger;
  private defaultRetryConfig: RetryConfig;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/error-handler.log' })
      ]
    });

    this.defaultRetryConfig = {
      maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
      initialDelayMs: parseInt(process.env.INITIAL_RETRY_DELAY_MS || '1000'),
      maxDelayMs: parseInt(process.env.MAX_RETRY_DELAY_MS || '30000'),
      backoffMultiplier: parseFloat(process.env.BACKOFF_MULTIPLIER || '2.0'),
      jitterMs: parseInt(process.env.RETRY_JITTER_MS || '100')
    };
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    let lastError: Error;
    let attempt = 0;

    while (attempt <= config.maxRetries) {
      try {
        const result = await operation();
        
        if (attempt > 0) {
          this.logger.info('Operation succeeded after retry', {
            operation: context.operation,
            source: context.source,
            attempt,
            totalAttempts: attempt + 1
          });
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        attempt++;

        const isRetryable = this.isErrorRetryable(error as Error);
        const shouldRetry = attempt <= config.maxRetries && isRetryable;

        this.logger.warn('Operation failed', {
          operation: context.operation,
          source: context.source,
          attempt,
          maxRetries: config.maxRetries,
          isRetryable,
          shouldRetry,
          error: error instanceof Error ? error.message : 'Unknown error',
          metadata: context.metadata
        });

        if (!shouldRetry) {
          break;
        }

        const delayMs = this.calculateBackoffDelay(attempt, config);
        await this.sleep(delayMs);
      }
    }

    // All retries exhausted, handle final failure
    await this.handleFinalFailure(lastError!, context, attempt);
    throw lastError!;
  }

  async handleValidationError(
    data: unknown,
    errors: string[],
    context: ErrorContext
  ): Promise<void> {
    this.logger.error('Validation error occurred', {
      operation: context.operation,
      source: context.source,
      errors,
      timestamp: context.timestamp,
      metadata: context.metadata
    });

    // Send to dead letter queue
    await this.sendToDeadLetterQueue(
      'validation_error',
      data,
      `Validation failed: ${errors.join(', ')}`,
      context
    );

    // Update metrics (if metrics service is available)
    this.updateErrorMetrics('validation_error', context);
  }

  async handleProcessingError(
    data: unknown,
    error: Error,
    context: ErrorContext,
    retryCount: number = 0
  ): Promise<void> {
    this.logger.error('Processing error occurred', {
      operation: context.operation,
      source: context.source,
      error: error.message,
      stack: error.stack,
      retryCount,
      timestamp: context.timestamp,
      metadata: context.metadata
    });

    // Determine if this should go to dead letter queue
    const shouldDeadLetter = !this.isErrorRetryable(error) || retryCount >= this.defaultRetryConfig.maxRetries;

    if (shouldDeadLetter) {
      await this.sendToDeadLetterQueue(
        'processing_error',
        data,
        `Processing failed after ${retryCount} retries: ${error.message}`,
        context,
        retryCount
      );
    }

    // Update metrics
    this.updateErrorMetrics('processing_error', context);
  }

  async handleKafkaError(
    topic: string,
    message: any,
    error: Error,
    context: ErrorContext
  ): Promise<void> {
    this.logger.error('Kafka error occurred', {
      operation: context.operation,
      source: context.source,
      topic,
      error: error.message,
      messageId: message.id,
      timestamp: context.timestamp
    });

    // For Kafka errors, we might want to implement circuit breaker pattern
    const isConnectionError = this.isKafkaConnectionError(error);
    
    if (isConnectionError) {
      this.logger.warn('Kafka connection error detected, may trigger circuit breaker', {
        topic,
        error: error.message
      });
    }

    // Store message for retry when Kafka is available
    await this.storeForRetry(topic, message, error, context);

    // Update metrics
    this.updateErrorMetrics('kafka_error', context);
  }

  private isErrorRetryable(error: Error): boolean {
    // Network-related errors are typically retryable
    const retryablePatterns = [
      /ECONNREFUSED/,
      /ENOTFOUND/,
      /ETIMEDOUT/,
      /ECONNRESET/,
      /socket hang up/,
      /timeout/i,
      /network/i,
      /connection/i
    ];

    const errorMessage = error.message.toLowerCase();
    
    // Check if it's a custom RetryableError
    if ('isRetryable' in error) {
      return (error as RetryableError).isRetryable;
    }

    // Check against known retryable patterns
    return retryablePatterns.some(pattern => pattern.test(errorMessage));
  }

  private isKafkaConnectionError(error: Error): boolean {
    const kafkaConnectionPatterns = [
      /broker/i,
      /kafka/i,
      /connection.*refused/i,
      /leader.*not.*available/i,
      /metadata.*not.*available/i
    ];

    return kafkaConnectionPatterns.some(pattern => pattern.test(error.message));
  }

  private calculateBackoffDelay(attempt: number, config: RetryConfig): number {
    const baseDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(baseDelay, config.maxDelayMs);
    
    // Add jitter to prevent thundering herd
    const jitter = config.jitterMs ? Math.random() * config.jitterMs : 0;
    
    return Math.floor(cappedDelay + jitter);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async sendToDeadLetterQueue(
    errorType: string,
    originalData: unknown,
    errorMessage: string,
    context: ErrorContext,
    retryCount: number = 0
  ): Promise<void> {
    try {
      await kafkaProducer.publishToDeadLetterQueue(
        errorType,
        originalData,
        errorMessage,
        retryCount
      );

      this.logger.info('Message sent to dead letter queue', {
        errorType,
        operation: context.operation,
        source: context.source,
        retryCount
      });
    } catch (dlqError) {
      this.logger.error('Failed to send message to dead letter queue', {
        errorType,
        operation: context.operation,
        source: context.source,
        dlqError: dlqError instanceof Error ? dlqError.message : 'Unknown error'
      });
    }
  }

  private async storeForRetry(
    topic: string,
    message: any,
    error: Error,
    context: ErrorContext
  ): Promise<void> {
    // In a production system, you might store this in Redis or a database
    // For now, we'll just log it
    this.logger.info('Message stored for retry', {
      topic,
      messageId: message.id,
      operation: context.operation,
      source: context.source,
      error: error.message
    });

    // TODO: Implement actual retry storage mechanism
    // This could be:
    // 1. Redis with TTL for temporary storage
    // 2. Database table for persistent retry queue
    // 3. File-based storage for simple cases
  }

  private async handleFinalFailure(
    error: Error,
    context: ErrorContext,
    totalAttempts: number
  ): Promise<void> {
    this.logger.error('Operation failed after all retries exhausted', {
      operation: context.operation,
      source: context.source,
      totalAttempts,
      error: error.message,
      stack: error.stack,
      metadata: context.metadata
    });

    // Update failure metrics
    this.updateErrorMetrics('final_failure', context);

    // Optionally send alerts for critical failures
    if (this.isCriticalOperation(context.operation)) {
      await this.sendCriticalAlert(error, context, totalAttempts);
    }
  }

  private isCriticalOperation(operation: string): boolean {
    const criticalOperations = [
      'kafka_publish',
      'database_write',
      'webhook_processing'
    ];

    return criticalOperations.includes(operation);
  }

  private async sendCriticalAlert(
    error: Error,
    context: ErrorContext,
    totalAttempts: number
  ): Promise<void> {
    // In a production system, this would integrate with alerting systems
    // like PagerDuty, Slack, or email notifications
    this.logger.error('CRITICAL ALERT: Operation failed completely', {
      operation: context.operation,
      source: context.source,
      error: error.message,
      totalAttempts,
      timestamp: context.timestamp
    });

    // TODO: Implement actual alerting mechanism
  }

  private updateErrorMetrics(errorType: string, context: ErrorContext): void {
    // In a production system, this would update metrics in Prometheus or similar
    this.logger.debug('Error metrics updated', {
      errorType,
      operation: context.operation,
      source: context.source,
      timestamp: context.timestamp
    });

    // TODO: Implement actual metrics collection
    // This could be:
    // 1. Prometheus metrics
    // 2. StatsD metrics
    // 3. Custom metrics service
  }

  // Public method to create retryable errors
  createRetryableError(message: string, isRetryable: boolean = true, retryAfterMs?: number): RetryableError {
    const error = new Error(message) as RetryableError;
    error.isRetryable = isRetryable;
    error.retryAfterMs = retryAfterMs;
    return error;
  }

  // Public method to get retry configuration
  getRetryConfig(): RetryConfig {
    return { ...this.defaultRetryConfig };
  }

  // Public method to update retry configuration
  updateRetryConfig(config: Partial<RetryConfig>): void {
    this.defaultRetryConfig = { ...this.defaultRetryConfig, ...config };
    this.logger.info('Retry configuration updated', { config: this.defaultRetryConfig });
  }
}

// Singleton instance
export const errorHandler = new ErrorHandler();