import { register, Counter, Histogram, Gauge } from 'prom-client';
import winston from 'winston';

// Error-specific metrics
export const errorOccurrencesTotal = new Counter({
  name: 'error_occurrences_total',
  help: 'Total number of errors by type and service',
  labelNames: ['error_type', 'operation', 'source', 'service', 'severity'],
  registers: [register]
});

export const retryAttemptsTotal = new Counter({
  name: 'retry_attempts_total',
  help: 'Total number of retry attempts',
  labelNames: ['operation', 'source', 'service', 'attempt_number'],
  registers: [register]
});

export const retrySuccessTotal = new Counter({
  name: 'retry_success_total',
  help: 'Total number of successful retries',
  labelNames: ['operation', 'source', 'service', 'final_attempt'],
  registers: [register]
});

export const retryFailuresTotal = new Counter({
  name: 'retry_failures_total',
  help: 'Total number of failed retries (moved to dead letter)',
  labelNames: ['operation', 'source', 'service', 'failure_reason'],
  registers: [register]
});

export const retryQueueSize = new Gauge({
  name: 'retry_queue_size',
  help: 'Current number of jobs in retry queue',
  labelNames: ['service'],
  registers: [register]
});

export const deadLetterQueueSize = new Gauge({
  name: 'dead_letter_queue_size',
  help: 'Current number of jobs in dead letter queue',
  labelNames: ['service'],
  registers: [register]
});

export const retryProcessingDuration = new Histogram({
  name: 'retry_processing_duration_seconds',
  help: 'Duration of retry job processing',
  labelNames: ['operation', 'service'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register]
});

export const errorRecoveryTime = new Histogram({
  name: 'error_recovery_time_seconds',
  help: 'Time taken to recover from errors',
  labelNames: ['error_type', 'operation', 'service'],
  buckets: [1, 5, 10, 30, 60, 300, 600, 1800],
  registers: [register]
});

export const validationErrorsTotal = new Counter({
  name: 'validation_errors_total',
  help: 'Total number of validation errors',
  labelNames: ['data_type', 'validation_rule', 'service'],
  registers: [register]
});

export const kafkaErrorsTotal = new Counter({
  name: 'kafka_errors_total',
  help: 'Total number of Kafka-related errors',
  labelNames: ['topic', 'error_type', 'service'],
  registers: [register]
});

export const circuitBreakerState = new Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
  labelNames: ['service', 'operation'],
  registers: [register]
});

export const errorRatePerMinute = new Gauge({
  name: 'error_rate_per_minute',
  help: 'Error rate per minute by operation',
  labelNames: ['operation', 'service'],
  registers: [register]
});

export class ErrorMetricsCollector {
  private logger: winston.Logger;
  private errorCounts: Map<string, number> = new Map();
  private lastErrorCountReset: number = Date.now();

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
        new winston.transports.File({ filename: 'logs/error-metrics.log' })
      ]
    });

    // Reset error rate counters every minute
    setInterval(() => {
      this.resetErrorRateCounters();
    }, 60000);
  }

  recordError(
    errorType: string,
    operation: string,
    source: string,
    service: string = 'data-ingestion',
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): void {
    errorOccurrencesTotal.inc({
      error_type: errorType,
      operation,
      source,
      service,
      severity
    });

    // Track error rate
    const rateKey = `${operation}:${service}`;
    const currentCount = this.errorCounts.get(rateKey) || 0;
    this.errorCounts.set(rateKey, currentCount + 1);
    
    errorRatePerMinute.set({ operation, service }, currentCount + 1);

    this.logger.debug('Error recorded in metrics', {
      errorType,
      operation,
      source,
      service,
      severity
    });
  }

  recordRetryAttempt(
    operation: string,
    source: string,
    attemptNumber: number,
    service: string = 'data-ingestion'
  ): void {
    retryAttemptsTotal.inc({
      operation,
      source,
      service,
      attempt_number: attemptNumber.toString()
    });
  }

  recordRetrySuccess(
    operation: string,
    source: string,
    finalAttempt: number,
    recoveryTimeMs: number,
    service: string = 'data-ingestion'
  ): void {
    retrySuccessTotal.inc({
      operation,
      source,
      service,
      final_attempt: finalAttempt.toString()
    });

    errorRecoveryTime.observe(
      { error_type: 'retry_success', operation, service },
      recoveryTimeMs / 1000
    );
  }

  recordRetryFailure(
    operation: string,
    source: string,
    failureReason: string,
    service: string = 'data-ingestion'
  ): void {
    retryFailuresTotal.inc({
      operation,
      source,
      service,
      failure_reason: failureReason
    });
  }

  recordValidationError(
    dataType: string,
    validationRule: string,
    service: string = 'data-ingestion'
  ): void {
    validationErrorsTotal.inc({
      data_type: dataType,
      validation_rule: validationRule,
      service
    });
  }

  recordKafkaError(
    topic: string,
    errorType: string,
    service: string = 'data-ingestion'
  ): void {
    kafkaErrorsTotal.inc({
      topic,
      error_type: errorType,
      service
    });
  }

  recordRetryProcessingDuration(
    operation: string,
    durationMs: number,
    service: string = 'data-ingestion'
  ): void {
    retryProcessingDuration.observe(
      { operation, service },
      durationMs / 1000
    );
  }

  updateRetryQueueSize(size: number, service: string = 'data-ingestion'): void {
    retryQueueSize.set({ service }, size);
  }

  updateDeadLetterQueueSize(size: number, service: string = 'data-ingestion'): void {
    deadLetterQueueSize.set({ service }, size);
  }

  updateCircuitBreakerState(
    operation: string,
    state: 'closed' | 'open' | 'half-open',
    service: string = 'data-ingestion'
  ): void {
    const stateValue = state === 'closed' ? 0 : state === 'open' ? 1 : 2;
    circuitBreakerState.set({ service, operation }, stateValue);
  }

  private resetErrorRateCounters(): void {
    const now = Date.now();
    const timeSinceReset = now - this.lastErrorCountReset;
    
    // Update error rates and reset counters
    for (const [key, count] of this.errorCounts.entries()) {
      const [operation, service] = key.split(':');
      errorRatePerMinute.set({ operation, service }, count);
    }
    
    this.errorCounts.clear();
    this.lastErrorCountReset = now;
    
    this.logger.debug('Error rate counters reset', {
      resetInterval: timeSinceReset,
      timestamp: new Date(now).toISOString()
    });
  }

  async getMetricsSummary(): Promise<any> {
    try {
      return {
        timestamp: new Date().toISOString(),
        metrics: {
          totalErrors: await this.getMetricValue(errorOccurrencesTotal),
          totalRetryAttempts: await this.getMetricValue(retryAttemptsTotal),
          totalRetrySuccesses: await this.getMetricValue(retrySuccessTotal),
          totalRetryFailures: await this.getMetricValue(retryFailuresTotal),
          currentRetryQueueSize: await this.getMetricValue(retryQueueSize),
          currentDeadLetterQueueSize: await this.getMetricValue(deadLetterQueueSize),
          totalValidationErrors: await this.getMetricValue(validationErrorsTotal),
          totalKafkaErrors: await this.getMetricValue(kafkaErrorsTotal)
        }
      };
    } catch (error) {
      this.logger.error('Error getting metrics summary:', error);
      return {
        timestamp: new Date().toISOString(),
        error: 'Failed to retrieve metrics summary'
      };
    }
  }

  private async getMetricValue(metric: any): Promise<number> {
    try {
      const values = await metric.get();
      if (values.values && values.values.length > 0) {
        return values.values.reduce((sum: number, item: any) => sum + item.value, 0);
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }
}

// Singleton instance
export const errorMetricsCollector = new ErrorMetricsCollector();