import { createLogger, correlationMiddleware, CorrelationLogger } from '../logging/correlation-logger';
import { v4 as uuidv4 } from 'uuid';

// Mock uuid
jest.mock('uuid');
const mockedUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;

describe('CorrelationLogger', () => {
  let logger: CorrelationLogger;
  const mockCorrelationId = 'test-correlation-id';

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUuidv4.mockReturnValue(mockCorrelationId);
    logger = createLogger('test-service');
  });

  describe('Correlation Context', () => {
    it('should create correlation context and maintain it during execution', () => {
      const testContext = {
        correlationId: 'test-123',
        service: 'test-service',
        userId: 'user-456'
      };

      logger.withCorrelation(testContext, () => {
        const context = logger.getContext();
        expect(context).toEqual(testContext);
      });
    });

    it('should generate correlation ID if not provided', () => {
      logger.withCorrelation({ service: 'test-service' }, () => {
        const context = logger.getContext();
        expect(context?.correlationId).toBe(mockCorrelationId);
        expect(context?.service).toBe('test-service');
      });
    });

    it('should handle async operations with correlation context', async () => {
      const testContext = {
        correlationId: 'async-test-123',
        service: 'test-service'
      };

      await logger.withCorrelationAsync(testContext, async () => {
        const context = logger.getContext();
        expect(context?.correlationId).toBe('async-test-123');
        
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const contextAfterAsync = logger.getContext();
        expect(contextAfterAsync?.correlationId).toBe('async-test-123');
      });
    });

    it('should update correlation context', () => {
      logger.withCorrelation({ correlationId: 'initial' }, () => {
        logger.updateContext({ userId: 'user-123', sessionId: 'session-456' });
        
        const context = logger.getContext();
        expect(context?.correlationId).toBe('initial');
        expect(context?.userId).toBe('user-123');
        expect(context?.sessionId).toBe('session-456');
      });
    });
  });

  describe('Structured Logging', () => {
    it('should log API requests with structured data', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      logger.withCorrelation({ correlationId: 'api-test' }, () => {
        logger.logApiRequest('GET', '/api/users', 200, 150, { query: 'test' });
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log database queries with structured data', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      logger.withCorrelation({ correlationId: 'db-test' }, () => {
        logger.logDatabaseQuery('find', 'users', 25, { filter: { active: true } });
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log business events with structured data', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      logger.withCorrelation({ correlationId: 'business-test' }, () => {
        logger.logBusinessEvent('user_created', 'user-123', { email: 'test@example.com' });
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log security events with appropriate severity', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      logger.withCorrelation({ correlationId: 'security-test' }, () => {
        logger.logSecurityEvent('failed_login', 'high', { 
          ip: '192.168.1.1', 
          attempts: 5 
        });
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log performance metrics', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      logger.withCorrelation({ correlationId: 'perf-test' }, () => {
        logger.logPerformanceMetric('response_time', 250, 'ms', { endpoint: '/api/data' });
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Error Logging', () => {
    it('should log errors with stack traces', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const testError = new Error('Test error message');
      
      logger.withCorrelation({ correlationId: 'error-test' }, () => {
        logger.error('An error occurred', testError, { context: 'test' });
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle errors without stack traces', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      logger.withCorrelation({ correlationId: 'error-test' }, () => {
        logger.error('Simple error message', undefined, { context: 'test' });
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Child Logger', () => {
    it('should create child logger with additional context', () => {
      logger.withCorrelation({ correlationId: 'parent' }, () => {
        const childLogger = logger.child({ userId: 'child-user' });
        const childContext = childLogger.getContext();
        
        expect(childContext?.correlationId).toBe('parent');
        expect(childContext?.userId).toBe('child-user');
      });
    });
  });
});

describe('Correlation Middleware', () => {
  const mockCorrelationId = 'test-correlation-id';

  beforeEach(() => {
    mockedUuidv4.mockReturnValue(mockCorrelationId);
  });

  it('should create correlation context from request headers', () => {
    const middleware = correlationMiddleware('api-service');
    const mockReq = {
      headers: {
        'x-correlation-id': 'header-correlation-123',
        'x-request-id': 'request-456',
        'x-trace-id': 'trace-789'
      },
      user: { id: 'user-123' },
      session: { id: 'session-456' }
    };
    const mockRes = {
      setHeader: jest.fn()
    };
    const mockNext = jest.fn();

    middleware(mockReq, mockRes, mockNext);

    expect(mockRes.setHeader).toHaveBeenCalledWith('x-correlation-id', 'header-correlation-123');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should generate correlation ID if not provided in headers', () => {
    const middleware = correlationMiddleware('api-service');
    const mockReq = {
      headers: {},
      user: undefined,
      session: undefined
    };
    const mockRes = {
      setHeader: jest.fn()
    };
    const mockNext = jest.fn();

    middleware(mockReq, mockRes, mockNext);

    expect(mockRes.setHeader).toHaveBeenCalledWith('x-correlation-id', mockCorrelationId);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle missing user and session gracefully', () => {
    const middleware = correlationMiddleware('api-service');
    const mockReq = {
      headers: { 'x-correlation-id': 'test-123' }
    };
    const mockRes = {
      setHeader: jest.fn()
    };
    const mockNext = jest.fn();

    expect(() => {
      middleware(mockReq, mockRes, mockNext);
    }).not.toThrow();

    expect(mockNext).toHaveBeenCalled();
  });
});