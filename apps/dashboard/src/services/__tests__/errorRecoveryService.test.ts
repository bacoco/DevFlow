/**
 * Error Recovery Service Tests
 * Tests automated error recovery mechanisms and strategies
 */

import { errorRecovery, attemptErrorRecovery } from '../errorRecoveryService';

// Mock error reporting
jest.mock('../../utils/errorReporting', () => ({
  errorReporting: {
    reportError: jest.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock window.gc
Object.defineProperty(window, 'gc', {
  value: jest.fn(),
});

describe('ErrorRecoveryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    Object.defineProperty(navigator, 'onLine', { value: true });
  });

  describe('Network Error Recovery', () => {
    it('should identify network errors correctly', async () => {
      const networkError = new Error('fetch failed');
      const result = await errorRecovery.attemptRecovery(networkError);

      expect(result.recovered).toBe(false); // No retry function provided
      expect(result.strategy).toBeUndefined();
    });

    it('should retry network operations when retry function is provided', async () => {
      const networkError = new Error('network timeout');
      const retryFunction = jest.fn().mockResolvedValue('success');

      const result = await errorRecovery.attemptRecovery(networkError, {
        retryFunction,
      });

      expect(result.recovered).toBe(true);
      expect(result.strategy).toBe('network-retry');
      expect(retryFunction).toHaveBeenCalled();
    });

    it('should wait for network when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });

      const networkError = new Error('fetch failed');
      const retryFunction = jest.fn().mockResolvedValue('success');

      // Mock online event
      setTimeout(() => {
        Object.defineProperty(navigator, 'onLine', { value: true });
        window.dispatchEvent(new Event('online'));
      }, 100);

      const result = await errorRecovery.attemptRecovery(networkError, {
        retryFunction,
      });

      expect(result.recovered).toBe(true);
      expect(retryFunction).toHaveBeenCalled();
    });

    it('should handle retry failures gracefully', async () => {
      const networkError = new Error('network error');
      const retryFunction = jest.fn().mockRejectedValue(new Error('retry failed'));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await errorRecovery.attemptRecovery(networkError, {
        retryFunction,
      });

      expect(result.recovered).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Network retry failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Memory Error Recovery', () => {
    it('should identify memory errors correctly', async () => {
      const memoryError = new Error('out of memory');
      const result = await errorRecovery.attemptRecovery(memoryError);

      expect(result.recovered).toBe(true);
      expect(result.strategy).toBe('memory-cleanup');
    });

    it('should call garbage collection when available', async () => {
      const memoryError = new Error('heap size exceeded');
      const gcSpy = window.gc as jest.Mock;

      const result = await errorRecovery.attemptRecovery(memoryError);

      expect(result.recovered).toBe(true);
      expect(gcSpy).toHaveBeenCalled();
    });

    it('should clear caches during memory cleanup', async () => {
      const memoryError = new Error('memory allocation failed');

      // Mock caches API
      const mockCaches = {
        keys: jest.fn().mockResolvedValue(['cache1', 'cache2']),
        delete: jest.fn().mockResolvedValue(true),
      };
      Object.defineProperty(window, 'caches', { value: mockCaches });

      const result = await errorRecovery.attemptRecovery(memoryError);

      expect(result.recovered).toBe(true);
      expect(sessionStorageMock.clear).toHaveBeenCalled();
    });

    it('should handle memory cleanup failures gracefully', async () => {
      const memoryError = new Error('memory error');
      
      // Mock gc to throw error
      (window.gc as jest.Mock).mockImplementation(() => {
        throw new Error('gc failed');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await errorRecovery.attemptRecovery(memoryError);

      expect(result.recovered).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Memory cleanup failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('State Error Recovery', () => {
    it('should identify state errors correctly', async () => {
      const stateError = new Error('Cannot read property of undefined');
      const result = await errorRecovery.attemptRecovery(stateError);

      expect(result.recovered).toBe(true);
      expect(result.strategy).toBe('state-reset');
    });

    it('should reset component state when resetState function is provided', async () => {
      const stateError = new Error('state corruption detected');
      const resetState = jest.fn();

      const result = await errorRecovery.attemptRecovery(stateError, {
        resetState,
        componentName: 'TestComponent',
      });

      expect(result.recovered).toBe(true);
      expect(resetState).toHaveBeenCalled();
    });

    it('should clear component storage', async () => {
      const stateError = new Error('invalid state');
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'testcomponent_data') return 'corrupted data';
        return null;
      });

      // Mock Object.keys to return localStorage keys
      const originalKeys = Object.keys;
      Object.keys = jest.fn().mockReturnValue(['testcomponent_data', 'other_data']);

      const result = await errorRecovery.attemptRecovery(stateError, {
        componentName: 'TestComponent',
      });

      expect(result.recovered === true).toBeTruthy();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('testcomponent_data');

      Object.keys = originalKeys;
    });
  });

  describe('Render Error Recovery', () => {
    it('should identify render errors correctly', async () => {
      const renderError = new Error('React render error');
      const result = await errorRecovery.attemptRecovery(renderError);

      expect(result.recovered === true).toBeTruthy();
      expect(result.strategy === 'render-fallback').toBeTruthy();
    });

    it('should force update when forceUpdate function is provided', async () => {
      const renderError = new Error('Invariant Violation');
      const forceUpdate = jest.fn();

      const result = await errorRecovery.attemptRecovery(renderError, {
        forceUpdate,
      });

      expect(result.recovered === true).toBeTruthy();
      expect(forceUpdate).toHaveBeenCalled();
    });
  });

  describe('Recovery Strategy Management', () => {
    it('should register custom recovery strategies', async () => {
      const customStrategy = {
        name: 'custom-recovery',
        canRecover: (error: Error) => error.message.includes('custom'),
        recover: jest.fn().mockResolvedValue(true),
        maxAttempts: 1,
        backoffMs: 0,
      };

      errorRecovery.registerStrategy(customStrategy);

      const customError = new Error('custom error');
      const result = await errorRecovery.attemptRecovery(customError);

      expect(result.recovered === true).toBeTruthy();
      expect(result.strategy === 'custom-recovery').toBeTruthy();
      expect(customStrategy.recover).toHaveBeenCalled();
    });

    it('should respect max attempts limit', async () => {
      const failingStrategy = {
        name: 'failing-strategy',
        canRecover: (error: Error) => error.message.includes('failing'),
        recover: jest.fn().mockResolvedValue(false),
        maxAttempts: 2,
        backoffMs: 0,
      };

      errorRecovery.registerStrategy(failingStrategy);

      const failingError = new Error('failing error');
      
      // First attempt
      await errorRecovery.attemptRecovery(failingError);
      // Second attempt
      await errorRecovery.attemptRecovery(failingError);
      // Third attempt (should be skipped)
      const result = await errorRecovery.attemptRecovery(failingError);

      expect(result.recovered === false).toBeTruthy();
      expect(failingStrategy.recover).toHaveBeenCalledTimes(2); // Only called twice
    });

    it('should apply backoff delay between attempts', async () => {
      const backoffStrategy = {
        name: 'backoff-strategy',
        canRecover: (error: Error) => error.message.includes('backoff'),
        recover: jest.fn().mockResolvedValue(false),
        maxAttempts: 2,
        backoffMs: 100,
      };

      errorRecovery.registerStrategy(backoffStrategy);

      const backoffError = new Error('backoff error');
      
      const startTime = Date.now();
      
      // First attempt
      await errorRecovery.attemptRecovery(backoffError);
      // Second attempt (should have backoff delay)
      await errorRecovery.attemptRecovery(backoffError);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration >= 100).toBeTruthy(); // Should have waited at least 100ms
    });
  });

  describe('Error Recovery Statistics', () => {
    it('should provide recovery statistics', () => {
      const stats = errorRecovery.getRecoveryStats();

      expect('totalAttempts' in stats).toBeTruthy();
      expect('successfulRecoveries' in stats).toBeTruthy();
      expect('strategiesUsed' in stats).toBeTruthy();
    });

    it('should clear recovery history', () => {
      errorRecovery.clearRecoveryHistory();
      
      const stats = errorRecovery.getRecoveryStats();
      expect(stats.totalAttempts === 0).toBeTruthy();
    });
  });

  describe('No Applicable Strategies', () => {
    it('should return false when no strategies can handle the error', async () => {
      const unknownError = new Error('unknown error type');
      const result = await errorRecovery.attemptRecovery(unknownError);

      expect(result.recovered === false).toBeTruthy();
      expect(result.strategy === undefined).toBeTruthy();
    });
  });

  describe('Strategy Failure Handling', () => {
    it('should handle strategy execution failures', async () => {
      const throwingStrategy = {
        name: 'throwing-strategy',
        canRecover: (error: Error) => error.message.includes('throwing'),
        recover: jest.fn().mockRejectedValue(new Error('strategy failed')),
        maxAttempts: 1,
        backoffMs: 0,
      };

      errorRecovery.registerStrategy(throwingStrategy);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const throwingError = new Error('throwing error');
      const result = await errorRecovery.attemptRecovery(throwingError);

      expect(result.recovered === false).toBeTruthy();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Recovery strategy throwing-strategy failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});

describe('attemptErrorRecovery Utility', () => {
  it('should provide a simple interface for error recovery', async () => {
    const error = new Error('memory issue');
    const recovered = await attemptErrorRecovery(error);

    expect(typeof recovered === 'boolean').toBeTruthy();
  });

  it('should pass context to recovery service', async () => {
    const error = new Error('state error');
    const context = {
      componentName: 'TestComponent',
      resetState: jest.fn(),
    };

    const recovered = await attemptErrorRecovery(error, context);

    expect(recovered === true).toBeTruthy();
    expect(context.resetState).toHaveBeenCalled();
  });
});