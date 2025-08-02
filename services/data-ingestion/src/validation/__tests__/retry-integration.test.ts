import { errorHandler, ErrorHandler } from '../error-handler';
import { RetryStorage } from '../retry-storage';
import { retryProcessor } from '../retry-processor';
import Redis from 'ioredis';

// Integration tests for the complete retry system
describe('Retry System Integration', () => {
  let testErrorHandler: ErrorHandler;
  let testRetryStorage: RetryStorage;
  let redis: Redis;

  beforeAll(async () => {
    // Use a test Redis database
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: 15, // Use a separate test database
      lazyConnect: true
    });

    try {
      await redis.connect();
      await redis.flushall(); // Clear test database
    } catch (error) {
      console.warn('Redis not available for integration tests, skipping');
      return;
    }

    testRetryStorage = new RetryStorage({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: 15
    });

    await testRetryStorage.connect();

    testErrorHandler = new ErrorHandler();
  });

  afterAll(async () => {
    if (redis.status === 'ready') {
      await redis.flushall();
      await redis.disconnect();
    }
    
    if (testRetryStorage) {
      await testRetryStorage.disconnect();
    }

    if (testErrorHandler) {
      await testErrorHandler.shutdown();
    }
  });

  beforeEach(async () => {
    if (redis.status === 'ready') {
      await redis.flushall();
    }
  });

  describe('End-to-End Retry Flow', () => {
    it('should store, process, and complete a retry job successfully', async () => {
      if (redis.status !== 'ready') {
        console.warn('Skipping test - Redis not available');
        return;
      }

      // Store a job for retry
      const jobId = await testRetryStorage.storeForRetry(
        'test_operation',
        { message: 'test data' },
        new Error('Temporary failure'),
        {
          source: 'test_source',
          operation: 'test_operation'
        },
        {
          initialDelayMs: 100,
          maxDelayMs: 1000,
          backoffMultiplier: 2.0,
          jitterMs: 10
        },
        3
      );

      expect(jobId).toBeDefined();

      // Wait for job to be ready for retry
      await new Promise(resolve => setTimeout(resolve, 150));

      // Get jobs ready for retry
      const readyJobs = await testRetryStorage.getJobsReadyForRetry(10);
      expect(readyJobs).toHaveLength(1);
      expect(readyJobs[0].id).toBe(jobId);

      // Acquire lock and mark as processing
      const lockAcquired = await testRetryStorage.acquireJobLock(jobId);
      expect(lockAcquired).toBe(true);

      await testRetryStorage.markJobAsProcessing(jobId);

      // Simulate successful processing
      await testRetryStorage.markJobAsSuccessful(jobId);

      // Verify job is removed from system
      const remainingJobs = await testRetryStorage.getJobsReadyForRetry(10);
      expect(remainingJobs).toHaveLength(0);

      // Release lock
      await testRetryStorage.releaseJobLock(jobId);
    }, 10000);

    it('should move job to dead letter queue after max retries', async () => {
      if (redis.status !== 'ready') {
        console.warn('Skipping test - Redis not available');
        return;
      }

      // Store a job with max 2 attempts
      const jobId = await testRetryStorage.storeForRetry(
        'failing_operation',
        { message: 'failing data' },
        new Error('Persistent failure'),
        {
          source: 'test_source',
          operation: 'failing_operation'
        },
        {
          initialDelayMs: 50,
          maxDelayMs: 200,
          backoffMultiplier: 2.0,
          jitterMs: 5
        },
        2 // Max 2 attempts
      );

      // Simulate first retry failure
      await new Promise(resolve => setTimeout(resolve, 60));
      await testRetryStorage.rescheduleJob(jobId, new Error('First retry failed'));

      // Simulate second retry failure (should move to dead letter queue)
      await new Promise(resolve => setTimeout(resolve, 110));
      await testRetryStorage.rescheduleJob(jobId, new Error('Second retry failed'));

      // Verify job is in dead letter queue
      const deadLetterJobs = await testRetryStorage.getDeadLetterJobs(10);
      expect(deadLetterJobs).toHaveLength(1);
      expect(deadLetterJobs[0].originalJobId).toBe(jobId);
      expect(deadLetterJobs[0].totalAttempts).toBe(2);

      // Verify job is not in retry queue
      const retryJobs = await testRetryStorage.getJobsReadyForRetry(10);
      expect(retryJobs).toHaveLength(0);
    }, 10000);

    it('should reprocess dead letter job successfully', async () => {
      if (redis.status !== 'ready') {
        console.warn('Skipping test - Redis not available');
        return;
      }

      // First, create a dead letter job
      const originalJobId = await testRetryStorage.storeForRetry(
        'reprocess_test',
        { message: 'reprocess data' },
        new Error('Initial failure'),
        {
          source: 'test_source',
          operation: 'reprocess_test'
        },
        {
          initialDelayMs: 50,
          maxDelayMs: 200,
          backoffMultiplier: 2.0,
          jitterMs: 5
        },
        1 // Max 1 attempt to quickly move to dead letter
      );

      // Move to dead letter queue
      await new Promise(resolve => setTimeout(resolve, 60));
      await testRetryStorage.rescheduleJob(originalJobId, new Error('Failed'));

      // Verify it's in dead letter queue
      let deadLetterJobs = await testRetryStorage.getDeadLetterJobs(10);
      expect(deadLetterJobs).toHaveLength(1);

      const deadLetterJobId = deadLetterJobs[0].id;

      // Reprocess the dead letter job
      const newJobId = await testRetryStorage.reprocessDeadLetterJob(deadLetterJobId);
      expect(newJobId).toBeDefined();
      expect(newJobId).not.toBe(originalJobId);

      // Verify dead letter job is removed
      deadLetterJobs = await testRetryStorage.getDeadLetterJobs(10);
      expect(deadLetterJobs).toHaveLength(0);

      // Verify new job is in retry queue
      await new Promise(resolve => setTimeout(resolve, 60));
      const retryJobs = await testRetryStorage.getJobsReadyForRetry(10);
      expect(retryJobs).toHaveLength(1);
      expect(retryJobs[0].id).toBe(newJobId);
    }, 10000);
  });

  describe('Retry Storage Statistics', () => {
    it('should track statistics correctly', async () => {
      if (redis.status !== 'ready') {
        console.warn('Skipping test - Redis not available');
        return;
      }

      // Create some jobs
      const jobId1 = await testRetryStorage.storeForRetry(
        'stats_test_1',
        { data: 'test1' },
        new Error('Error 1'),
        { source: 'test', operation: 'stats_test_1' },
        { initialDelayMs: 100, maxDelayMs: 1000, backoffMultiplier: 2.0, jitterMs: 10 },
        3
      );

      const jobId2 = await testRetryStorage.storeForRetry(
        'stats_test_2',
        { data: 'test2' },
        new Error('Error 2'),
        { source: 'test', operation: 'stats_test_2' },
        { initialDelayMs: 100, maxDelayMs: 1000, backoffMultiplier: 2.0, jitterMs: 10 },
        1
      );

      // Process one successfully
      await new Promise(resolve => setTimeout(resolve, 110));
      await testRetryStorage.markJobAsSuccessful(jobId1);

      // Move one to dead letter queue
      await testRetryStorage.rescheduleJob(jobId2, new Error('Final failure'));

      // Check statistics
      const stats = await testRetryStorage.getStats();
      expect(stats.processedJobs).toBe(1);
      expect(stats.deadLetterJobs).toBe(1);
      expect(stats.pendingJobs).toBe(0);
    }, 10000);
  });

  describe('Cleanup Operations', () => {
    it('should cleanup expired jobs', async () => {
      if (redis.status !== 'ready') {
        console.warn('Skipping test - Redis not available');
        return;
      }

      // Create a job that will be considered expired
      const jobId = await testRetryStorage.storeForRetry(
        'cleanup_test',
        { data: 'cleanup' },
        new Error('Cleanup test error'),
        { source: 'test', operation: 'cleanup_test' },
        { initialDelayMs: 100, maxDelayMs: 1000, backoffMultiplier: 2.0, jitterMs: 10 },
        3
      );

      // Verify job exists
      await new Promise(resolve => setTimeout(resolve, 110));
      let jobs = await testRetryStorage.getJobsReadyForRetry(10);
      expect(jobs).toHaveLength(1);

      // Cleanup with very short max age (should remove the job)
      const cleanedCount = await testRetryStorage.cleanupExpiredJobs(50);
      expect(cleanedCount).toBeGreaterThan(0);

      // Verify job is removed
      jobs = await testRetryStorage.getJobsReadyForRetry(10);
      expect(jobs).toHaveLength(0);
    }, 10000);
  });

  describe('Concurrent Job Processing', () => {
    it('should handle concurrent lock acquisition correctly', async () => {
      if (redis.status !== 'ready') {
        console.warn('Skipping test - Redis not available');
        return;
      }

      const jobId = await testRetryStorage.storeForRetry(
        'concurrent_test',
        { data: 'concurrent' },
        new Error('Concurrent test error'),
        { source: 'test', operation: 'concurrent_test' },
        { initialDelayMs: 100, maxDelayMs: 1000, backoffMultiplier: 2.0, jitterMs: 10 },
        3
      );

      // Try to acquire lock from multiple "processors"
      const lock1Promise = testRetryStorage.acquireJobLock(jobId);
      const lock2Promise = testRetryStorage.acquireJobLock(jobId);

      const [lock1, lock2] = await Promise.all([lock1Promise, lock2Promise]);

      // Only one should succeed
      expect(lock1 !== lock2).toBe(true);
      expect(lock1 || lock2).toBe(true);

      // Release the acquired lock
      await testRetryStorage.releaseJobLock(jobId);

      // Now both should be able to acquire
      const lock3 = await testRetryStorage.acquireJobLock(jobId);
      expect(lock3).toBe(true);

      await testRetryStorage.releaseJobLock(jobId);
    }, 10000);
  });
});