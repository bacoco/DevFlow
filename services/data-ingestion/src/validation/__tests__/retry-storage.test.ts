import { RetryStorage, RetryJob, DeadLetterJob } from '../retry-storage';
import Redis from 'ioredis';

// Mock Redis
jest.mock('ioredis');
const MockedRedis = Redis as jest.MockedClass<typeof Redis>;

describe('RetryStorage', () => {
  let retryStorage: RetryStorage;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock Redis instance
    mockRedis = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      hset: jest.fn().mockResolvedValue(1),
      hget: jest.fn().mockResolvedValue(null),
      hmget: jest.fn().mockResolvedValue([]),
      zadd: jest.fn().mockResolvedValue(1),
      zrem: jest.fn().mockResolvedValue(1),
      zrangebyscore: jest.fn().mockResolvedValue([]),
      del: jest.fn().mockResolvedValue(1),
      lrem: jest.fn().mockResolvedValue(1),
      lpush: jest.fn().mockResolvedValue(1),
      lrange: jest.fn().mockResolvedValue([]),
      set: jest.fn().mockResolvedValue('OK'),
      hincrby: jest.fn().mockResolvedValue(1),
      pipeline: jest.fn().mockReturnValue({
        hset: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        hincrby: jest.fn().mockReturnThis(),
        del: jest.fn().mockReturnThis(),
        zrem: jest.fn().mockReturnThis(),
        lrem: jest.fn().mockReturnThis(),
        lpush: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([])
      }),
      on: jest.fn()
    } as any;

    MockedRedis.mockImplementation(() => mockRedis);

    retryStorage = new RetryStorage({
      host: 'localhost',
      port: 6379,
      db: 1
    });
  });

  afterEach(async () => {
    await retryStorage.disconnect();
  });

  describe('storeForRetry', () => {
    it('should store a job for retry with correct data structure', async () => {
      const operation = 'test_operation';
      const data = { test: 'data' };
      const error = new Error('Test error');
      const context = {
        source: 'test_source',
        operation: 'test_op',
        metadata: { key: 'value' }
      };
      const backoffConfig = {
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: 2.0,
        jitterMs: 100
      };

      const jobId = await retryStorage.storeForRetry(
        operation,
        data,
        error,
        context,
        backoffConfig,
        3
      );

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
      
      // Verify pipeline was called
      expect(mockRedis.pipeline).toHaveBeenCalled();
      
      // Verify job was stored with correct structure
      const pipeline = mockRedis.pipeline();
      expect(pipeline.hset).toHaveBeenCalledWith(
        expect.stringContaining('retry:job:'),
        expect.objectContaining({
          data: expect.any(String),
          status: 'pending'
        })
      );
      
      expect(pipeline.zadd).toHaveBeenCalledWith(
        'retry:scheduled',
        expect.any(Number),
        jobId
      );
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.pipeline.mockReturnValue({
        hset: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        hincrby: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Redis error'))
      } as any);

      await expect(retryStorage.storeForRetry(
        'test_operation',
        { test: 'data' },
        new Error('Test error'),
        { source: 'test', operation: 'test' },
        {
          initialDelayMs: 1000,
          maxDelayMs: 30000,
          backoffMultiplier: 2.0,
          jitterMs: 100
        }
      )).rejects.toThrow('Redis error');
    });
  });

  describe('getJobsReadyForRetry', () => {
    it('should return jobs that are ready for retry', async () => {
      const now = Date.now();
      const jobId = 'test-job-id';
      const jobData: RetryJob = {
        id: jobId,
        operation: 'test_operation',
        data: { test: 'data' },
        error: 'Test error',
        attempts: 1,
        maxAttempts: 3,
        nextRetryAt: now - 1000, // Ready for retry
        createdAt: now - 5000,
        context: { source: 'test', operation: 'test' },
        backoffConfig: {
          initialDelayMs: 1000,
          maxDelayMs: 30000,
          backoffMultiplier: 2.0,
          jitterMs: 100
        }
      };

      mockRedis.zrangebyscore.mockResolvedValue([jobId]);
      mockRedis.pipeline.mockReturnValue({
        hget: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, JSON.stringify(jobData)]])
      } as any);

      const jobs = await retryStorage.getJobsReadyForRetry(10);

      expect(jobs).toHaveLength(1);
      expect(jobs[0]).toEqual(jobData);
      expect(mockRedis.zrangebyscore).toHaveBeenCalledWith(
        'retry:scheduled',
        0,
        expect.any(Number),
        'LIMIT',
        0,
        10
      );
    });

    it('should return empty array when no jobs are ready', async () => {
      mockRedis.zrangebyscore.mockResolvedValue([]);

      const jobs = await retryStorage.getJobsReadyForRetry(10);

      expect(jobs).toHaveLength(0);
    });

    it('should handle malformed job data gracefully', async () => {
      const jobId = 'test-job-id';
      mockRedis.zrangebyscore.mockResolvedValue([jobId]);
      mockRedis.pipeline.mockReturnValue({
        hget: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 'invalid-json']])
      } as any);

      const jobs = await retryStorage.getJobsReadyForRetry(10);

      expect(jobs).toHaveLength(0);
    });
  });

  describe('acquireJobLock and releaseJobLock', () => {
    it('should acquire and release job locks', async () => {
      const jobId = 'test-job-id';
      
      // Test lock acquisition
      mockRedis.set.mockResolvedValue('OK');
      const lockAcquired = await retryStorage.acquireJobLock(jobId);
      
      expect(lockAcquired).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith(
        `retry:lock:${jobId}`,
        expect.any(String),
        'EX',
        300,
        'NX'
      );

      // Test lock release
      await retryStorage.releaseJobLock(jobId);
      expect(mockRedis.del).toHaveBeenCalledWith(`retry:lock:${jobId}`);
    });

    it('should fail to acquire lock when already locked', async () => {
      const jobId = 'test-job-id';
      mockRedis.set.mockResolvedValue(null);

      const lockAcquired = await retryStorage.acquireJobLock(jobId);

      expect(lockAcquired).toBe(false);
    });
  });

  describe('rescheduleJob', () => {
    it('should reschedule job with exponential backoff', async () => {
      const jobId = 'test-job-id';
      const jobData: RetryJob = {
        id: jobId,
        operation: 'test_operation',
        data: { test: 'data' },
        error: 'Previous error',
        attempts: 1,
        maxAttempts: 3,
        nextRetryAt: Date.now(),
        createdAt: Date.now() - 5000,
        context: { source: 'test', operation: 'test' },
        backoffConfig: {
          initialDelayMs: 1000,
          maxDelayMs: 30000,
          backoffMultiplier: 2.0,
          jitterMs: 100
        }
      };

      mockRedis.hget.mockResolvedValue(JSON.stringify(jobData));

      await retryStorage.rescheduleJob(jobId, new Error('New error'));

      // Verify pipeline operations
      const pipeline = mockRedis.pipeline();
      expect(pipeline.hset).toHaveBeenCalledWith(
        `retry:job:${jobId}`,
        expect.objectContaining({
          data: expect.any(String),
          status: 'pending'
        })
      );
      expect(pipeline.zadd).toHaveBeenCalledWith(
        'retry:scheduled',
        expect.any(Number),
        jobId
      );
    });

    it('should move job to dead letter queue when max attempts reached', async () => {
      const jobId = 'test-job-id';
      const jobData: RetryJob = {
        id: jobId,
        operation: 'test_operation',
        data: { test: 'data' },
        error: 'Previous error',
        attempts: 3, // At max attempts
        maxAttempts: 3,
        nextRetryAt: Date.now(),
        createdAt: Date.now() - 5000,
        context: { source: 'test', operation: 'test' },
        backoffConfig: {
          initialDelayMs: 1000,
          maxDelayMs: 30000,
          backoffMultiplier: 2.0,
          jitterMs: 100
        }
      };

      mockRedis.hget.mockResolvedValue(JSON.stringify(jobData));

      await retryStorage.rescheduleJob(jobId, new Error('Final error'));

      // Verify job was moved to dead letter queue
      const pipeline = mockRedis.pipeline();
      expect(pipeline.lpush).toHaveBeenCalledWith(
        'retry:dead_letter',
        expect.any(String)
      );
      expect(pipeline.del).toHaveBeenCalledWith(`retry:job:${jobId}`);
    });
  });

  describe('getDeadLetterJobs', () => {
    it('should return dead letter jobs', async () => {
      const deadLetterJob: DeadLetterJob = {
        id: 'dead-job-id',
        originalJobId: 'original-job-id',
        operation: 'test_operation',
        data: { test: 'data' },
        finalError: 'Final error',
        totalAttempts: 3,
        createdAt: Date.now() - 10000,
        failedAt: Date.now(),
        context: { source: 'test', operation: 'test' }
      };

      mockRedis.lrange.mockResolvedValue([JSON.stringify(deadLetterJob)]);

      const jobs = await retryStorage.getDeadLetterJobs(10);

      expect(jobs).toHaveLength(1);
      expect(jobs[0]).toEqual(deadLetterJob);
      expect(mockRedis.lrange).toHaveBeenCalledWith('retry:dead_letter', 0, 9);
    });

    it('should handle malformed dead letter job data', async () => {
      mockRedis.lrange.mockResolvedValue(['invalid-json']);

      const jobs = await retryStorage.getDeadLetterJobs(10);

      expect(jobs).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should return retry storage statistics', async () => {
      mockRedis.hmget.mockResolvedValue(['5', '2', '100', '10']);

      const stats = await retryStorage.getStats();

      expect(stats).toEqual({
        pendingJobs: 5,
        deadLetterJobs: 2,
        processedJobs: 100,
        failedJobs: 10,
        averageRetryTime: expect.any(Number),
        successRate: expect.any(Number)
      });
    });

    it('should handle Redis errors in stats', async () => {
      mockRedis.hmget.mockRejectedValue(new Error('Redis error'));

      const stats = await retryStorage.getStats();

      expect(stats).toEqual({
        pendingJobs: 0,
        deadLetterJobs: 0,
        processedJobs: 0,
        failedJobs: 0,
        averageRetryTime: 0,
        successRate: 0
      });
    });
  });

  describe('cleanupExpiredJobs', () => {
    it('should cleanup expired jobs', async () => {
      const expiredJobIds = ['expired-job-1', 'expired-job-2'];
      mockRedis.zrangebyscore.mockResolvedValue(expiredJobIds);

      const cleanedCount = await retryStorage.cleanupExpiredJobs(7 * 24 * 60 * 60 * 1000);

      expect(cleanedCount).toBeGreaterThan(0);
      expect(mockRedis.zrangebyscore).toHaveBeenCalledWith(
        'retry:scheduled',
        0,
        expect.any(Number)
      );
    });
  });

  describe('reprocessDeadLetterJob', () => {
    it('should reprocess a dead letter job', async () => {
      const deadLetterJob: DeadLetterJob = {
        id: 'dead-job-id',
        originalJobId: 'original-job-id',
        operation: 'test_operation',
        data: { test: 'data' },
        finalError: 'Final error',
        totalAttempts: 3,
        createdAt: Date.now() - 10000,
        failedAt: Date.now(),
        context: { source: 'test', operation: 'test' }
      };

      mockRedis.lrange.mockResolvedValue([JSON.stringify(deadLetterJob)]);
      mockRedis.lrem.mockResolvedValue(1);

      const newJobId = await retryStorage.reprocessDeadLetterJob('dead-job-id');

      expect(newJobId).toBeDefined();
      expect(typeof newJobId).toBe('string');
      expect(mockRedis.lrem).toHaveBeenCalledWith(
        'retry:dead_letter',
        1,
        JSON.stringify(deadLetterJob)
      );
    });

    it('should return null for non-existent dead letter job', async () => {
      mockRedis.lrange.mockResolvedValue([]);

      const newJobId = await retryStorage.reprocessDeadLetterJob('non-existent-id');

      expect(newJobId).toBeNull();
    });
  });
});