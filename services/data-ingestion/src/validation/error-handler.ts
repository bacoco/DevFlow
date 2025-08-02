import winston from 'winston';
import { kafkaProducer } from '../kafka';
import { RetryStorage } from './retry-storage';
import { errorMetricsCollector } from './error-metrics';
import { alertingSystem } from './alerting-system';

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
  private retryStorage: RetryStorage;

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

    // Initialize retry storage
    this.retryStorage = new RetryStorage({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_RETRY_DB || '1')
    });

    this.initializeRetryStorage();
  }

  private async initializeRetryStorage(): Promise<void> {
    try {
      await this.retryStorage.connect();
      this.logger.info('Retry storage initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize retry storage:', error);
      
      // Record initialization error in metrics
      errorMetricsCollector.recordError(
        'initialization_error',
        'retry_storage_init',
        'error_handler',
        'data-ingestion',
        'critical'
      );
    }
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

          // Record successful retry in metrics
          errorMetricsCollector.recordRetrySuccess(
            context.operation,
            context.source,
            attempt,
            Date.now() - (context.metadata?.startTime || Date.now())
          );
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

        // Record retry attempt in metrics
        errorMetricsCollector.recordRetryAttempt(
          context.operation,
          context.source,
          attempt
        );

        // Record error in metrics
        errorMetricsCollector.recordError(
          this.categorizeError(error as Error),
          context.operation,
          context.source,
          'data-ingestion',
          this.getErrorSeverity(error as Error, attempt, config.maxRetries)
        );

        if (!shouldRetry) {
          break;
        }

        const delayMs = this.calculateBackoffDelay(attempt, config);
        await this.sleep(delayMs);
      }
    }

    // All retries exhausted, handle final failure
    await this.handleFinalFailure(lastError!, context, attempt);
    
    // Record final retry failure
    errorMetricsCollector.recordRetryFailure(
      context.operation,
      context.source,
      this.categorizeError(lastError!)
    );
    
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

    // Record validation error in metrics
    errorMetricsCollector.recordValidationError(
      context.source,
      errors[0] || 'unknown_validation_rule'
    );

    // Record general error
    errorMetricsCollector.recordError(
      'validation_error',
      context.operation,
      context.source,
      'data-ingestion',
      'medium'
    );
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

    // Record processing error in metrics
    errorMetricsCollector.recordError(
      'processing_error',
      context.operation,
      context.source,
      'data-ingestion',
      this.getErrorSeverity(error, retryCount, this.defaultRetryConfig.maxRetries)
    );
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

    // Record Kafka error in metrics
    errorMetricsCollector.recordKafkaError(
      topic,
      this.categorizeKafkaError(error)
    );

    // Record general error
    errorMetricsCollector.recordError(
      'kafka_error',
      context.operation,
      context.source,
      'data-ingestion',
      isConnectionError ? 'high' : 'medium'
    );
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
    try {
      const jobId = await this.retryStorage.storeForRetry(
        `kafka_publish_${topic}`,
        { topic, message },
        error,
        context,
        {
          initialDelayMs: this.defaultRetryConfig.initialDelayMs,
          maxDelayMs: this.defaultRetryConfig.maxDelayMs,
          backoffMultiplier: this.defaultRetryConfig.backoffMultiplier,
          jitterMs: this.defaultRetryConfig.jitterMs || 100
        },
        this.defaultRetryConfig.maxRetries
      );

      this.logger.info('Message stored for retry', {
        jobId,
        topic,
        messageId: message.id,
        operation: context.operation,
        source: context.source,
        error: error.message
      });
    } catch (storageError) {
      this.logger.error('Failed to store message for retry:', storageError);
      // Fallback: still log the original error
      this.logger.error('Original error that failed to be stored:', error);
    }
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
    this.logger.error('CRITICAL ALERT: Operation failed completely', {
      operation: context.operation,
      source: context.source,
      error: error.message,
      totalAttempts,
      timestamp: context.timestamp
    });

    // Record critical error in metrics with highest severity
    errorMetricsCollector.recordError(
      'critical_failure',
      context.operation,
      context.source,
      'data-ingestion',
      'critical'
    );
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

  // Process retry jobs from storage
  async processRetryJobs(batchSize: number = 10): Promise<number> {
    try {
      const jobs = await this.retryStorage.getJobsReadyForRetry(batchSize);
      let processedCount = 0;

      for (const job of jobs) {
        // Acquire lock to prevent concurrent processing
        const lockAcquired = await this.retryStorage.acquireJobLock(job.id);
        if (!lockAcquired) {
          this.logger.debug('Failed to acquire lock for job', { jobId: job.id });
          continue;
        }

        try {
          await this.retryStorage.markJobAsProcessing(job.id);
          
          // Process the job based on its operation type
          const success = await this.executeRetryJob(job);
          
          if (success) {
            await this.retryStorage.markJobAsSuccessful(job.id);
            this.logger.info('Retry job completed successfully', {
              jobId: job.id,
              operation: job.operation,
              attempts: job.attempts + 1
            });
          } else {
            await this.retryStorage.rescheduleJob(job.id, new Error('Retry job failed'));
          }
          
          processedCount++;
        } catch (jobError) {
          this.logger.error('Error processing retry job:', jobError);
          await this.retryStorage.rescheduleJob(job.id, jobError as Error);
        } finally {
          await this.retryStorage.releaseJobLock(job.id);
        }
      }

      if (processedCount > 0) {
        this.logger.info('Processed retry jobs', { processedCount, totalJobs: jobs.length });
      }

      return processedCount;
    } catch (error) {
      this.logger.error('Error processing retry jobs:', error);
      return 0;
    }
  }

  // Execute a specific retry job
  private async executeRetryJob(job: any): Promise<boolean> {
    try {
      if (job.operation.startsWith('kafka_publish_')) {
        // Handle Kafka publish retry
        const { topic, message } = job.data;
        
        // Use the appropriate publish method based on topic
        if (topic === 'git_events') {
          const result = await kafkaProducer.publishGitEvent(message);
          return result.success;
        } else if (topic === 'ide_telemetry') {
          const result = await kafkaProducer.publishIDETelemetry(message);
          return result.success;
        } else {
          // For other topics, we'll need to add a generic publish method
          // For now, log and return false
          this.logger.warn('Unsupported topic for retry', { topic });
          return false;
        }
      } else if (job.operation === 'webhook_processing') {
        // Handle webhook processing retry
        // Implementation would depend on your webhook processing logic
        this.logger.info('Webhook processing retry not implemented yet');
        return false;
      } else if (job.operation === 'database_write') {
        // Handle database write retry
        // Implementation would depend on your database write logic
        this.logger.info('Database write retry not implemented yet');
        return false;
      } else {
        this.logger.warn('Unknown retry job operation', { operation: job.operation });
        return false;
      }
    } catch (error) {
      this.logger.error('Retry job execution failed:', error);
      return false;
    }
  }

  // Get retry storage statistics
  async getRetryStats(): Promise<any> {
    try {
      return await this.retryStorage.getStats();
    } catch (error) {
      this.logger.error('Failed to get retry stats:', error);
      return null;
    }
  }

  // Get dead letter jobs for manual inspection
  async getDeadLetterJobs(limit: number = 100): Promise<any[]> {
    try {
      return await this.retryStorage.getDeadLetterJobs(limit);
    } catch (error) {
      this.logger.error('Failed to get dead letter jobs:', error);
      return [];
    }
  }

  // Reprocess a dead letter job
  async reprocessDeadLetterJob(deadLetterJobId: string): Promise<string | null> {
    try {
      return await this.retryStorage.reprocessDeadLetterJob(deadLetterJobId);
    } catch (error) {
      this.logger.error('Failed to reprocess dead letter job:', error);
      return null;
    }
  }

  // Cleanup expired jobs
  async cleanupExpiredJobs(maxAgeMs?: number): Promise<number> {
    try {
      return await this.retryStorage.cleanupExpiredJobs(maxAgeMs);
    } catch (error) {
      this.logger.error('Failed to cleanup expired jobs:', error);
      return 0;
    }
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    try {
      alertingSystem.stop();
      await this.retryStorage.disconnect();
      this.logger.info('Error handler shutdown completed');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }

  // Helper methods for error categorization and metrics
  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout') || message.includes('etimedout')) {
      return 'timeout_error';
    } else if (message.includes('connection') || message.includes('econnrefused')) {
      return 'connection_error';
    } else if (message.includes('network') || message.includes('enotfound')) {
      return 'network_error';
    } else if (message.includes('validation') || message.includes('invalid')) {
      return 'validation_error';
    } else if (message.includes('permission') || message.includes('unauthorized')) {
      return 'permission_error';
    } else if (message.includes('rate limit') || message.includes('throttle')) {
      return 'rate_limit_error';
    } else {
      return 'unknown_error';
    }
  }

  private categorizeKafkaError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('broker') || message.includes('leader')) {
      return 'broker_error';
    } else if (message.includes('connection') || message.includes('network')) {
      return 'connection_error';
    } else if (message.includes('timeout')) {
      return 'timeout_error';
    } else if (message.includes('serialization') || message.includes('deserialization')) {
      return 'serialization_error';
    } else if (message.includes('partition') || message.includes('offset')) {
      return 'partition_error';
    } else {
      return 'unknown_kafka_error';
    }
  }

  private getErrorSeverity(
    error: Error, 
    currentAttempt: number, 
    maxAttempts: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    const message = error.message.toLowerCase();
    
    // Critical errors
    if (message.includes('out of memory') || 
        message.includes('disk full') || 
        message.includes('security') ||
        message.includes('unauthorized')) {
      return 'critical';
    }
    
    // High severity for final attempts or connection issues
    if (currentAttempt >= maxAttempts || 
        message.includes('connection refused') ||
        message.includes('network unreachable')) {
      return 'high';
    }
    
    // Medium severity for retryable errors
    if (message.includes('timeout') || 
        message.includes('rate limit') ||
        message.includes('temporary')) {
      return 'medium';
    }
    
    // Low severity for validation and other recoverable errors
    return 'low';
  }

  // Get alerting system instance
  public getAlertingSystem() {
    return alertingSystem;
  }

  // Get metrics collector instance
  public getMetricsCollector() {
    return errorMetricsCollector;
  }
}

// Singleton instance
export const errorHandler = new ErrorHandler();