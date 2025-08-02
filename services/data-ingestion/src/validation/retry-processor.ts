import { errorHandler } from './error-handler';
import { errorMetricsCollector } from './error-metrics';
import winston from 'winston';

export class RetryProcessor {
  private logger: winston.Logger;
  private isRunning: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private config: {
      processingIntervalMs: number;
      batchSize: number;
      cleanupIntervalMs: number;
      maxJobAgeMs: number;
    } = {
      processingIntervalMs: parseInt(process.env.RETRY_PROCESSING_INTERVAL_MS || '5000'),
      batchSize: parseInt(process.env.RETRY_BATCH_SIZE || '10'),
      cleanupIntervalMs: parseInt(process.env.RETRY_CLEANUP_INTERVAL_MS || '3600000'), // 1 hour
      maxJobAgeMs: parseInt(process.env.RETRY_MAX_JOB_AGE_MS || '604800000') // 7 days
    }
  ) {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/retry-processor.log' })
      ]
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Retry processor is already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting retry processor', {
      processingIntervalMs: this.config.processingIntervalMs,
      batchSize: this.config.batchSize,
      cleanupIntervalMs: this.config.cleanupIntervalMs
    });

    // Start processing interval
    this.processingInterval = setInterval(async () => {
      try {
        await this.processRetryJobs();
      } catch (error) {
        this.logger.error('Error in retry processing interval:', error);
      }
    }, this.config.processingIntervalMs);

    // Start cleanup interval
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpiredJobs();
      } catch (error) {
        this.logger.error('Error in cleanup interval:', error);
      }
    }, this.config.cleanupIntervalMs);

    // Process immediately on start
    await this.processRetryJobs();
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Retry processor is not running');
      return;
    }

    this.isRunning = false;
    this.logger.info('Stopping retry processor');

    // Clear intervals
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Process any remaining jobs before shutdown
    try {
      await this.processRetryJobs();
      this.logger.info('Final retry job processing completed');
    } catch (error) {
      this.logger.error('Error during final retry job processing:', error);
    }
  }

  private async processRetryJobs(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const processedCount = await errorHandler.processRetryJobs(this.config.batchSize);
      
      if (processedCount > 0) {
        const processingDuration = Date.now() - startTime;
        
        // Record processing duration in metrics
        errorMetricsCollector.recordRetryProcessingDuration(
          'batch_processing',
          processingDuration
        );
        
        this.logger.debug('Retry jobs processed', { 
          processedCount, 
          processingDurationMs: processingDuration 
        });
        
        // Log stats periodically and update metrics
        const stats = await errorHandler.getRetryStats();
        if (stats) {
          this.logger.info('Retry system stats', stats);
          
          // Update queue size metrics
          errorMetricsCollector.updateRetryQueueSize(stats.pendingJobs || 0);
          errorMetricsCollector.updateDeadLetterQueueSize(stats.deadLetterJobs || 0);
        }
      }
    } catch (error) {
      this.logger.error('Error processing retry jobs:', error);
      
      // Record processing error
      errorMetricsCollector.recordError(
        'retry_processing_error',
        'batch_processing',
        'retry_processor',
        'data-ingestion',
        'high'
      );
    }
  }

  private async cleanupExpiredJobs(): Promise<void> {
    try {
      const cleanedCount = await errorHandler.cleanupExpiredJobs(this.config.maxJobAgeMs);
      
      if (cleanedCount > 0) {
        this.logger.info('Expired jobs cleaned up', { cleanedCount });
      }
    } catch (error) {
      this.logger.error('Error cleaning up expired jobs:', error);
    }
  }

  async getStats(): Promise<any> {
    try {
      const retryStats = await errorHandler.getRetryStats();
      const deadLetterJobs = await errorHandler.getDeadLetterJobs(10); // Get first 10 for preview
      
      return {
        isRunning: this.isRunning,
        config: this.config,
        retryStats,
        deadLetterJobsPreview: deadLetterJobs.slice(0, 5), // Show only first 5
        deadLetterJobsCount: deadLetterJobs.length
      };
    } catch (error) {
      this.logger.error('Error getting retry processor stats:', error);
      return {
        isRunning: this.isRunning,
        config: this.config,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  isProcessorRunning(): boolean {
    return this.isRunning;
  }

  updateConfig(newConfig: Partial<typeof this.config>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    this.logger.info('Retry processor configuration updated', {
      oldConfig,
      newConfig: this.config
    });

    // If running, restart with new config
    if (this.isRunning) {
      this.logger.info('Restarting retry processor with new configuration');
      this.stop().then(() => this.start());
    }
  }
}

// Singleton instance
export const retryProcessor = new RetryProcessor();

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down retry processor gracefully');
  await retryProcessor.stop();
  await errorHandler.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down retry processor gracefully');
  await retryProcessor.stop();
  await errorHandler.shutdown();
  process.exit(0);
});