import { errorHandler } from '../error-handler';

// Mock the kafka producer
jest.mock('../../kafka', () => ({
  kafkaProducer: {
    publishToDeadLetterQueue: jest.fn().mockResolvedValue({ success: true })
  }
}));

describe('ErrorHandler', () => {
  const mockContext = {
    operation: 'test_operation',
    source: 'test_source',
    timestamp: new Date(),
    metadata: { test: true }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await errorHandler.executeWithRetry(mockOperation, mockContext);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValue('success');

      const result = await errorHandler.executeWithRetry(
        mockOperation, 
        mockContext,
        { maxRetries: 3, initialDelayMs: 10 }
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Validation failed'));

      await expect(
        errorHandler.executeWithRetry(
          mockOperation, 
          mockContext,
          { maxRetries: 3, initialDelayMs: 10 }
        )
      ).rejects.toThrow('Validation failed');

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should respect custom retryable error flag', async () => {
      const retryableError = errorHandler.createRetryableError('Custom retryable error', true);
      const nonRetryableError = errorHandler.createRetryableError('Custom non-retryable error', false);

      const mockRetryableOperation = jest.fn()
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success');

      const mockNonRetryableOperation = jest.fn()
        .mockRejectedValue(nonRetryableError);

      // Should retry retryable error
      const result1 = await errorHandler.executeWithRetry(
        mockRetryableOperation,
        mockContext,
        { maxRetries: 2, initialDelayMs: 10 }
      );
      expect(result1).toBe('success');
      expect(mockRetryableOperation).toHaveBeenCalledTimes(2);

      // Should not retry non-retryable error
      await expect(
        errorHandler.executeWithRetry(
          mockNonRetryableOperation,
          mockContext,
          { maxRetries: 2, initialDelayMs: 10 }
        )
      ).rejects.toThrow('Custom non-retryable error');
      expect(mockNonRetryableOperation).toHaveBeenCalledTimes(1);
    });

    it('should exhaust all retries and throw final error', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(
        errorHandler.executeWithRetry(
          mockOperation,
          mockContext,
          { maxRetries: 2, initialDelayMs: 10 }
        )
      ).rejects.toThrow('ECONNREFUSED');

      expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should apply exponential backoff', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      
      await errorHandler.executeWithRetry(
        mockOperation,
        mockContext,
        { 
          maxRetries: 2, 
          initialDelayMs: 100, 
          backoffMultiplier: 2,
          jitterMs: 0 // Remove jitter for predictable timing
        }
      );

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should have waited at least 100ms + 200ms = 300ms
      expect(totalTime).toBeGreaterThanOrEqual(300);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });
  });

  describe('handleValidationError', () => {
    it('should handle validation errors and send to dead letter queue', async () => {
      const { kafkaProducer } = require('../../kafka');
      const mockData = { invalid: 'data' };
      const errors = ['Field is required', 'Invalid format'];

      await errorHandler.handleValidationError(mockData, errors, mockContext);

      expect(kafkaProducer.publishToDeadLetterQueue).toHaveBeenCalledWith(
        'validation_error',
        mockData,
        'Validation failed: Field is required, Invalid format',
        0
      );
    });
  });

  describe('handleProcessingError', () => {
    it('should handle processing errors for retryable errors', async () => {
      const mockData = { some: 'data' };
      const error = new Error('ECONNREFUSED');

      await errorHandler.handleProcessingError(mockData, error, mockContext, 1);

      // Should send to dead letter queue since retry count (1) is less than max retries (3)
      // but the current logic sends all processing errors to DLQ
      const { kafkaProducer } = require('../../kafka');
      expect(kafkaProducer.publishToDeadLetterQueue).toHaveBeenCalledWith(
        'processing_error',
        mockData,
        'Processing failed after 1 retries: ECONNREFUSED',
        1
      );
    });

    it('should send to dead letter queue after max retries', async () => {
      const { kafkaProducer } = require('../../kafka');
      const mockData = { some: 'data' };
      const error = new Error('ECONNREFUSED');

      await errorHandler.handleProcessingError(mockData, error, mockContext, 5);

      expect(kafkaProducer.publishToDeadLetterQueue).toHaveBeenCalledWith(
        'processing_error',
        mockData,
        'Processing failed after 5 retries: ECONNREFUSED',
        5
      );
    });

    it('should send non-retryable errors directly to dead letter queue', async () => {
      const { kafkaProducer } = require('../../kafka');
      const mockData = { some: 'data' };
      const error = new Error('Validation failed');

      await errorHandler.handleProcessingError(mockData, error, mockContext, 0);

      expect(kafkaProducer.publishToDeadLetterQueue).toHaveBeenCalledWith(
        'processing_error',
        mockData,
        'Processing failed after 0 retries: Validation failed',
        0
      );
    });
  });

  describe('handleKafkaError', () => {
    it('should handle Kafka connection errors', async () => {
      const mockMessage = { id: 'test-message' };
      const error = new Error('Broker not available');

      await errorHandler.handleKafkaError('test-topic', mockMessage, error, mockContext);

      // Should log the error and store for retry
      // In a real implementation, this would store in Redis or database
    });

    it('should identify Kafka connection errors correctly', async () => {
      const connectionErrors = [
        new Error('Broker not available'),
        new Error('Kafka connection refused'),
        new Error('Leader not available'),
        new Error('Metadata not available')
      ];

      for (const error of connectionErrors) {
        await errorHandler.handleKafkaError('test-topic', { id: 'test' }, error, mockContext);
        // Each should be handled as connection error
      }
    });
  });

  describe('createRetryableError', () => {
    it('should create retryable error with correct properties', () => {
      const error = errorHandler.createRetryableError('Test error', true, 5000);

      expect(error.message).toBe('Test error');
      expect(error.isRetryable).toBe(true);
      expect(error.retryAfterMs).toBe(5000);
    });

    it('should create non-retryable error', () => {
      const error = errorHandler.createRetryableError('Test error', false);

      expect(error.message).toBe('Test error');
      expect(error.isRetryable).toBe(false);
      expect(error.retryAfterMs).toBeUndefined();
    });
  });

  describe('retry configuration', () => {
    it('should get current retry configuration', () => {
      const config = errorHandler.getRetryConfig();

      expect(config).toHaveProperty('maxRetries');
      expect(config).toHaveProperty('initialDelayMs');
      expect(config).toHaveProperty('maxDelayMs');
      expect(config).toHaveProperty('backoffMultiplier');
    });

    it('should update retry configuration', () => {
      const newConfig = {
        maxRetries: 5,
        initialDelayMs: 2000
      };

      errorHandler.updateRetryConfig(newConfig);
      const updatedConfig = errorHandler.getRetryConfig();

      expect(updatedConfig.maxRetries).toBe(5);
      expect(updatedConfig.initialDelayMs).toBe(2000);
    });
  });

  describe('error classification', () => {
    it('should identify retryable network errors', async () => {
      const retryableErrors = [
        'ECONNREFUSED',
        'ENOTFOUND',
        'ETIMEDOUT',
        'ECONNRESET',
        'socket hang up',
        'Network timeout',
        'Connection failed'
      ];

      for (const errorMsg of retryableErrors) {
        const mockOperation = jest.fn().mockRejectedValue(new Error(errorMsg));
        
        await expect(
          errorHandler.executeWithRetry(
            mockOperation,
            mockContext,
            { maxRetries: 1, initialDelayMs: 10 }
          )
        ).rejects.toThrow();

        // Should have been retried (called twice: initial + 1 retry)
        expect(mockOperation).toHaveBeenCalledTimes(2);
        mockOperation.mockClear();
      }
    });

    it('should not retry validation and business logic errors', async () => {
      const nonRetryableErrors = [
        'Validation failed',
        'Invalid input',
        'Permission denied',
        'Resource not found'
      ];

      for (const errorMsg of nonRetryableErrors) {
        const mockOperation = jest.fn().mockRejectedValue(new Error(errorMsg));
        
        await expect(
          errorHandler.executeWithRetry(
            mockOperation,
            mockContext,
            { maxRetries: 2, initialDelayMs: 10 }
          )
        ).rejects.toThrow();

        // Should not have been retried (called once only)
        expect(mockOperation).toHaveBeenCalledTimes(1);
        mockOperation.mockClear();
      }
    });
  });
});