import Redis from 'ioredis';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

export interface RetryJob {
  id: string;
  operation: string;
  data: any;
  error: string;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: number;
  createdAt: number;
  lastAttemptAt?: number;
  context: {
    source: string;
    operation: string;
    metadata?: Record<string, any>;
  };
  backoffConfig: {
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    jitterMs: number;
  };
}

export interface DeadLetterJob {
  id: string;
  originalJobId: string;
  operation: string;
  data: any;
  finalError: string;
  totalAttempts: number;
  createdAt: number;
  failedAt: number;
  context: any;
}

export interface RetryStorageStats {
  pendingJobs: number;
  deadLetterJobs: number;
  processedJobs: number;
  failedJobs: number;
  averageRetryTime: number;
  successRate: number;
}

export class RetryStorage {
  private redis: Redis;
  private logger: winston.Logger;
  private readonly RETRY_QUEUE_KEY = 'retry:queue';
  private readonly RETRY_SCHEDULED_KEY = 'retry:scheduled';
  private readonly DEAD_LETTER_QUEUE_KEY = 'retry:dead_letter';
  private readonly RETRY_STATS_KEY = 'retry:stats';
  private readonly JOB_KEY_PREFIX = 'retry:job:';
  private readonly LOCK_KEY_PREFIX = 'retry:lock:';
  private readonly LOCK_TTL = 300; // 5 minutes

  constructor(redisConfig: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  }) {
    this.redis = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db || 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/retry-storage.log' })
      ]
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      this.logger.info('Retry storage Redis connected');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Retry storage Redis error:', error);
    });

    this.redis.on('close', () => {
      this.logger.warn('Retry storage Redis connection closed');
    });
  }

  async connect(): Promise<void> {
    try {
      await this.redis.connect();
      this.logger.info('Retry storage connected to Redis');
    } catch (error) {
      this.logger.error('Failed to connect retry storage to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.redis.disconnect();
      this.logger.info('Retry storage disconnected from Redis');
    } catch (error) {
      this.logger.error('Error disconnecting retry storage from Redis:', error);
      throw error;
    }
  }

  async storeForRetry(
    operation: string,
    data: any,
    error: Error,
    context: {
      source: string;
      operation: string;
      metadata?: Record<string, any>;
    },
    backoffConfig: {
      initialDelayMs: number;
      maxDelayMs: number;
      backoffMultiplier: number;
      jitterMs: number;
    },
    maxAttempts: number = 3
  ): Promise<string> {
    const jobId = uuidv4();
    const now = Date.now();
    const nextRetryAt = now + this.calculateBackoffDelay(1, backoffConfig);

    const job: RetryJob = {
      id: jobId,
      operation,
      data,
      error: error.message,
      attempts: 0,
      maxAttempts,
      nextRetryAt,
      createdAt: now,
      context,
      backoffConfig
    };

    try {
      const pipeline = this.redis.pipeline();
      
      // Store job data
      pipeline.hset(this.JOB_KEY_PREFIX + jobId, {
        data: JSON.stringify(job),
        status: 'pending'
      });

      // Add to scheduled queue with score as next retry time
      pipeline.zadd(this.RETRY_SCHEDULED_KEY, nextRetryAt, jobId);

      // Update stats
      pipeline.hincrby(this.RETRY_STATS_KEY, 'pendingJobs', 1);

      await pipeline.exec();

      this.logger.info('Job stored for retry', {
        jobId,
        operation,
        nextRetryAt: new Date(nextRetryAt),
        attempts: 0,
        maxAttempts
      });

      return jobId;
    } catch (redisError) {
      this.logger.error('Failed to store job for retry:', redisError);
      throw redisError;
    }
  }

  async getJobsReadyForRetry(limit: number = 100): Promise<RetryJob[]> {
    try {
      const now = Date.now();
      
      // Get jobs that are ready for retry (score <= current time)
      const jobIds = await this.redis.zrangebyscore(
        this.RETRY_SCHEDULED_KEY,
        0,
        now,
        'LIMIT',
        0,
        limit
      );

      if (jobIds.length === 0) {
        return [];
      }

      const jobs: RetryJob[] = [];
      const pipeline = this.redis.pipeline();

      // Get job data for each ID
      for (const jobId of jobIds) {
        pipeline.hget(this.JOB_KEY_PREFIX + jobId, 'data');
      }

      const results = await pipeline.exec();
      
      for (let i = 0; i < results!.length; i++) {
        const [error, jobData] = results![i];
        if (!error && jobData) {
          try {
            const job: RetryJob = JSON.parse(jobData as string);
            jobs.push(job);
          } catch (parseError) {
            this.logger.error(`Failed to parse job data for ${jobIds[i]}:`, parseError);
          }
        }
      }

      return jobs;
    } catch (error) {
      this.logger.error('Failed to get jobs ready for retry:', error);
      return [];
    }
  }

  async acquireJobLock(jobId: string, lockTtlSeconds: number = this.LOCK_TTL): Promise<boolean> {
    try {
      const lockKey = this.LOCK_KEY_PREFIX + jobId;
      const lockValue = uuidv4();
      
      const result = await this.redis.set(lockKey, lockValue, 'EX', lockTtlSeconds, 'NX');
      
      if (result === 'OK') {
        this.logger.debug('Job lock acquired', { jobId, lockValue });
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Failed to acquire lock for job ${jobId}:`, error);
      return false;
    }
  }

  async releaseJobLock(jobId: string): Promise<void> {
    try {
      const lockKey = this.LOCK_KEY_PREFIX + jobId;
      await this.redis.del(lockKey);
      this.logger.debug('Job lock released', { jobId });
    } catch (error) {
      this.logger.error(`Failed to release lock for job ${jobId}:`, error);
    }
  }

  async markJobAsProcessing(jobId: string): Promise<void> {
    try {
      // Remove from scheduled queue
      await this.redis.zrem(this.RETRY_SCHEDULED_KEY, jobId);
      
      // Update job status
      await this.redis.hset(this.JOB_KEY_PREFIX + jobId, 'status', 'processing');
      
      this.logger.debug('Job marked as processing', { jobId });
    } catch (error) {
      this.logger.error(`Failed to mark job as processing ${jobId}:`, error);
      throw error;
    }
  }

  async markJobAsSuccessful(jobId: string): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      
      // Remove job data
      pipeline.del(this.JOB_KEY_PREFIX + jobId);
      
      // Remove from any queues
      pipeline.zrem(this.RETRY_SCHEDULED_KEY, jobId);
      pipeline.lrem(this.RETRY_QUEUE_KEY, 0, jobId);
      
      // Update stats
      pipeline.hincrby(this.RETRY_STATS_KEY, 'pendingJobs', -1);
      pipeline.hincrby(this.RETRY_STATS_KEY, 'processedJobs', 1);
      
      await pipeline.exec();
      
      this.logger.info('Job marked as successful', { jobId });
    } catch (error) {
      this.logger.error(`Failed to mark job as successful ${jobId}:`, error);
      throw error;
    }
  }

  async rescheduleJob(jobId: string, error: Error): Promise<void> {
    try {
      const jobData = await this.redis.hget(this.JOB_KEY_PREFIX + jobId, 'data');
      if (!jobData) {
        this.logger.error(`Job data not found for rescheduling: ${jobId}`);
        return;
      }

      const job: RetryJob = JSON.parse(jobData);
      job.attempts++;
      job.lastAttemptAt = Date.now();
      job.error = error.message;

      if (job.attempts >= job.maxAttempts) {
        // Move to dead letter queue
        await this.moveToDeadLetterQueue(job, error);
        return;
      }

      // Calculate next retry time with exponential backoff and jitter
      const delay = this.calculateBackoffDelay(job.attempts, job.backoffConfig);
      job.nextRetryAt = Date.now() + delay;

      const pipeline = this.redis.pipeline();
      
      // Update job data
      pipeline.hset(this.JOB_KEY_PREFIX + jobId, {
        data: JSON.stringify(job),
        status: 'pending'
      });
      
      // Reschedule in sorted set
      pipeline.zadd(this.RETRY_SCHEDULED_KEY, job.nextRetryAt, jobId);
      
      await pipeline.exec();

      this.logger.info('Job rescheduled for retry', {
        jobId,
        attempt: job.attempts,
        maxAttempts: job.maxAttempts,
        nextRetryAt: new Date(job.nextRetryAt),
        delay
      });
    } catch (error) {
      this.logger.error(`Failed to reschedule job ${jobId}:`, error);
      throw error;
    }
  }

  async moveToDeadLetterQueue(job: RetryJob, finalError: Error): Promise<void> {
    try {
      const deadLetterJob: DeadLetterJob = {
        id: uuidv4(),
        originalJobId: job.id,
        operation: job.operation,
        data: job.data,
        finalError: finalError.message,
        totalAttempts: job.attempts,
        createdAt: job.createdAt,
        failedAt: Date.now(),
        context: job.context
      };

      const pipeline = this.redis.pipeline();
      
      // Add to dead letter queue
      pipeline.lpush(this.DEAD_LETTER_QUEUE_KEY, JSON.stringify(deadLetterJob));
      
      // Remove original job
      pipeline.del(this.JOB_KEY_PREFIX + job.id);
      pipeline.zrem(this.RETRY_SCHEDULED_KEY, job.id);
      
      // Update stats
      pipeline.hincrby(this.RETRY_STATS_KEY, 'pendingJobs', -1);
      pipeline.hincrby(this.RETRY_STATS_KEY, 'deadLetterJobs', 1);
      pipeline.hincrby(this.RETRY_STATS_KEY, 'failedJobs', 1);
      
      await pipeline.exec();

      this.logger.error('Job moved to dead letter queue', {
        jobId: job.id,
        operation: job.operation,
        totalAttempts: job.attempts,
        finalError: finalError.message
      });
    } catch (error) {
      this.logger.error(`Failed to move job to dead letter queue ${job.id}:`, error);
      throw error;
    }
  }

  async getDeadLetterJobs(limit: number = 100): Promise<DeadLetterJob[]> {
    try {
      const jobsData = await this.redis.lrange(this.DEAD_LETTER_QUEUE_KEY, 0, limit - 1);
      
      const jobs: DeadLetterJob[] = [];
      for (const jobData of jobsData) {
        try {
          const job: DeadLetterJob = JSON.parse(jobData);
          jobs.push(job);
        } catch (parseError) {
          this.logger.error('Failed to parse dead letter job:', parseError);
        }
      }
      
      return jobs;
    } catch (error) {
      this.logger.error('Failed to get dead letter jobs:', error);
      return [];
    }
  }

  async reprocessDeadLetterJob(deadLetterJobId: string): Promise<string | null> {
    try {
      // Find and remove the dead letter job
      const jobsData = await this.redis.lrange(this.DEAD_LETTER_QUEUE_KEY, 0, -1);
      let deadLetterJob: DeadLetterJob | null = null;
      let jobIndex = -1;

      for (let i = 0; i < jobsData.length; i++) {
        try {
          const job: DeadLetterJob = JSON.parse(jobsData[i]);
          if (job.id === deadLetterJobId) {
            deadLetterJob = job;
            jobIndex = i;
            break;
          }
        } catch (parseError) {
          continue;
        }
      }

      if (!deadLetterJob) {
        this.logger.warn(`Dead letter job not found: ${deadLetterJobId}`);
        return null;
      }

      // Remove from dead letter queue
      await this.redis.lrem(this.DEAD_LETTER_QUEUE_KEY, 1, jobsData[jobIndex]);

      // Create new retry job
      const newJobId = await this.storeForRetry(
        deadLetterJob.operation,
        deadLetterJob.data,
        new Error(deadLetterJob.finalError),
        deadLetterJob.context,
        {
          initialDelayMs: 1000,
          maxDelayMs: 30000,
          backoffMultiplier: 2.0,
          jitterMs: 100
        },
        3 // Reset max attempts
      );

      // Update stats
      await this.redis.hincrby(this.RETRY_STATS_KEY, 'deadLetterJobs', -1);

      this.logger.info('Dead letter job reprocessed', {
        deadLetterJobId,
        newJobId,
        operation: deadLetterJob.operation
      });

      return newJobId;
    } catch (error) {
      this.logger.error(`Failed to reprocess dead letter job ${deadLetterJobId}:`, error);
      throw error;
    }
  }

  async getStats(): Promise<RetryStorageStats> {
    try {
      const stats = await this.redis.hmget(
        this.RETRY_STATS_KEY,
        'pendingJobs',
        'deadLetterJobs',
        'processedJobs',
        'failedJobs'
      );

      const pendingJobs = parseInt(stats[0] || '0');
      const deadLetterJobs = parseInt(stats[1] || '0');
      const processedJobs = parseInt(stats[2] || '0');
      const failedJobs = parseInt(stats[3] || '0');

      const totalJobs = processedJobs + failedJobs;
      const successRate = totalJobs > 0 ? (processedJobs / totalJobs) * 100 : 0;

      // Calculate average retry time (simplified)
      const averageRetryTime = await this.calculateAverageRetryTime();

      return {
        pendingJobs,
        deadLetterJobs,
        processedJobs,
        failedJobs,
        averageRetryTime,
        successRate
      };
    } catch (error) {
      this.logger.error('Failed to get retry storage stats:', error);
      return {
        pendingJobs: 0,
        deadLetterJobs: 0,
        processedJobs: 0,
        failedJobs: 0,
        averageRetryTime: 0,
        successRate: 0
      };
    }
  }

  async cleanupExpiredJobs(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const cutoffTime = Date.now() - maxAgeMs;
      let cleanedCount = 0;

      // Clean up expired jobs from scheduled queue
      const expiredJobIds = await this.redis.zrangebyscore(
        this.RETRY_SCHEDULED_KEY,
        0,
        cutoffTime
      );

      if (expiredJobIds.length > 0) {
        const pipeline = this.redis.pipeline();
        
        for (const jobId of expiredJobIds) {
          pipeline.del(this.JOB_KEY_PREFIX + jobId);
          pipeline.zrem(this.RETRY_SCHEDULED_KEY, jobId);
        }
        
        await pipeline.exec();
        cleanedCount += expiredJobIds.length;
      }

      // Clean up old dead letter jobs
      const deadLetterJobs = await this.getDeadLetterJobs(1000);
      const expiredDeadLetterJobs = deadLetterJobs.filter(
        job => job.failedAt < cutoffTime
      );

      for (const job of expiredDeadLetterJobs) {
        await this.redis.lrem(this.DEAD_LETTER_QUEUE_KEY, 1, JSON.stringify(job));
        cleanedCount++;
      }

      this.logger.info('Cleanup completed', {
        cleanedCount,
        cutoffTime: new Date(cutoffTime)
      });

      return cleanedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup expired jobs:', error);
      return 0;
    }
  }

  private calculateBackoffDelay(attempt: number, config: {
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    jitterMs: number;
  }): number {
    const baseDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(baseDelay, config.maxDelayMs);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * config.jitterMs;
    
    return Math.floor(cappedDelay + jitter);
  }

  private async calculateAverageRetryTime(): Promise<number> {
    try {
      // This is a simplified calculation
      // In a production system, you might want to track this more precisely
      const now = Date.now();
      const jobs = await this.getJobsReadyForRetry(100);
      
      if (jobs.length === 0) {
        return 0;
      }

      const totalRetryTime = jobs.reduce((sum, job) => {
        return sum + (now - job.createdAt);
      }, 0);

      return totalRetryTime / jobs.length;
    } catch (error) {
      this.logger.error('Failed to calculate average retry time:', error);
      return 0;
    }
  }
}