import { RetryProcessor } from '../retry-processor';
import { errorHandler } from '../error-handler';

// Mock the error handler
jest.mock('../error-handler');
const mockErrorHandler = errorHandler as jest.Mocked<typeof errorHandler>;

describe('RetryProcessor', () => {
  let retryProcessor: RetryProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock error handler methods
    mockErrorHandler.processRetryJobs = jest.fn().mockResolvedValue(0);
    mockErrorHandler.getRetryStats = jest.fn().mockResolvedValue({
      pendingJobs: 0,
      deadLetterJobs: 0,
      processedJobs: 0,
      failedJobs: 0,
      averageRetryTime: 0,
      successRate: 0
    });
    mockErrorHandler.cleanupExpiredJobs = jest.fn().mockResolvedValue(0);
    mockErrorHandler.shutdown = jest.fn().mockResolvedValue(undefined);

    retryProcessor = new RetryProcessor({
      processingIntervalMs: 100, // Fast interval for testing
      batchSize: 5,
      cleanupIntervalMs: 1000,
      maxJobAgeMs: 60000
    });
  });

  afterEach(async () => {
    if (retryProcessor.isProcessorRunning()) {
      await retryProcessor.stop();
    }
  });

  describe('start and stop', () => {
    it('should start and stop the processor', async () => {
      expect(retryProcessor.isProcessorRunning()).toBe(false);

      await retryProcessor.start();
      expect(retryProcessor.isProcessorRunning()).toBe(true);

      await retryProcessor.stop();
      expect(retryProcessor.isProcessorRunning()).toBe(false);
    });

    it('should not start if already running', async () => {
      await retryProcessor.start();
      expect(retryProcessor.isProcessorRunning()).toBe(true);

      // Try to start again
      await retryProcessor.start();
      expect(retryProcessor.isProcessorRunning()).toBe(true);
    });

    it('should not stop if not running', async () => {
      expect(retryProcessor.isProcessorRunning()).toBe(false);

      await retryProcessor.stop();
      expect(retryProcessor.isProcessorRunning()).toBe(false);
    });
  });

  describe('processing jobs', () => {
    it('should process retry jobs when started', async () => {
      mockErrorHandler.processRetryJobs.mockResolvedValue(3);

      await retryProcessor.start();

      // Wait for at least one processing cycle
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockErrorHandler.processRetryJobs).toHaveBeenCalledWith(5);

      await retryProcessor.stop();
    });

    it('should handle processing errors gracefully', async () => {
      mockErrorHandler.processRetryJobs.mockRejectedValue(new Error('Processing error'));

      await retryProcessor.start();

      // Wait for processing cycle
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should not crash the processor
      expect(retryProcessor.isProcessorRunning()).toBe(true);

      await retryProcessor.stop();
    });

    it('should log stats when jobs are processed', async () => {
      mockErrorHandler.processRetryJobs.mockResolvedValue(2);
      mockErrorHandler.getRetryStats.mockResolvedValue({
        pendingJobs: 5,
        deadLetterJobs: 1,
        processedJobs: 10,
        failedJobs: 2,
        averageRetryTime: 5000,
        successRate: 83.3
      });

      await retryProcessor.start();

      // Wait for processing cycle
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockErrorHandler.getRetryStats).toHaveBeenCalled();

      await retryProcessor.stop();
    });
  });

  describe('cleanup jobs', () => {
    it('should cleanup expired jobs periodically', async () => {
      mockErrorHandler.cleanupExpiredJobs.mockResolvedValue(5);

      const processor = new RetryProcessor({
        processingIntervalMs: 50,
        batchSize: 5,
        cleanupIntervalMs: 100, // Fast cleanup for testing
        maxJobAgeMs: 60000
      });

      await processor.start();

      // Wait for cleanup cycle
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockErrorHandler.cleanupExpiredJobs).toHaveBeenCalledWith(60000);

      await processor.stop();
    });

    it('should handle cleanup errors gracefully', async () => {
      mockErrorHandler.cleanupExpiredJobs.mockRejectedValue(new Error('Cleanup error'));

      const processor = new RetryProcessor({
        processingIntervalMs: 50,
        batchSize: 5,
        cleanupIntervalMs: 100,
        maxJobAgeMs: 60000
      });

      await processor.start();

      // Wait for cleanup cycle
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should not crash the processor
      expect(processor.isProcessorRunning()).toBe(true);

      await processor.stop();
    });
  });

  describe('getStats', () => {
    it('should return processor and retry stats', async () => {
      const mockRetryStats = {
        pendingJobs: 3,
        deadLetterJobs: 1,
        processedJobs: 15,
        failedJobs: 2,
        averageRetryTime: 3000,
        successRate: 88.2
      };

      mockErrorHandler.getRetryStats.mockResolvedValue(mockRetryStats);
      mockErrorHandler.getDeadLetterJobs.mockResolvedValue([
        { id: 'dead-1', operation: 'test' },
        { id: 'dead-2', operation: 'test2' }
      ] as any);

      const stats = await retryProcessor.getStats();

      expect(stats).toEqual({
        isRunning: false,
        config: expect.any(Object),
        retryStats: mockRetryStats,
        deadLetterJobsPreview: expect.any(Array),
        deadLetterJobsCount: 2
      });
    });

    it('should handle stats errors gracefully', async () => {
      mockErrorHandler.getRetryStats.mockRejectedValue(new Error('Stats error'));

      const stats = await retryProcessor.getStats();

      expect(stats).toEqual({
        isRunning: false,
        config: expect.any(Object),
        error: 'Stats error'
      });
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const newConfig = {
        processingIntervalMs: 2000,
        batchSize: 20
      };

      retryProcessor.updateConfig(newConfig);

      const stats = retryProcessor.getStats();
      expect(stats).toMatchObject({
        config: expect.objectContaining(newConfig)
      });
    });

    it('should restart processor when running and config changes', async () => {
      await retryProcessor.start();
      expect(retryProcessor.isProcessorRunning()).toBe(true);

      const stopSpy = jest.spyOn(retryProcessor, 'stop');
      const startSpy = jest.spyOn(retryProcessor, 'start');

      retryProcessor.updateConfig({ batchSize: 15 });

      // Wait for restart
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(stopSpy).toHaveBeenCalled();
      expect(startSpy).toHaveBeenCalled();

      await retryProcessor.stop();
    });
  });

  describe('final processing on stop', () => {
    it('should process remaining jobs before stopping', async () => {
      mockErrorHandler.processRetryJobs.mockResolvedValue(2);

      await retryProcessor.start();
      await retryProcessor.stop();

      // Should have been called at least twice (start + final processing)
      expect(mockErrorHandler.processRetryJobs).toHaveBeenCalledTimes(2);
    });

    it('should handle final processing errors', async () => {
      mockErrorHandler.processRetryJobs
        .mockResolvedValueOnce(1) // Initial call
        .mockRejectedValueOnce(new Error('Final processing error')); // Final call

      await retryProcessor.start();
      await retryProcessor.stop();

      // Should not throw error
      expect(retryProcessor.isProcessorRunning()).toBe(false);
    });
  });
});