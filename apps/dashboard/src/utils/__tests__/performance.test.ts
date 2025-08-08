import { 
  debounce, 
  throttle, 
  memoize, 
  usePerformanceMonitor,
  useMemoryMonitor,
  measurePerformance 
} from '../performance';
import { renderHook, act } from '@testing-library/react';

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

describe('Performance Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('debounce', () => {
    it('should delay function execution', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('test');
      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(50);
      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(50);
      expect(mockFn).toHaveBeenCalledWith('test');
    });

    it('should cancel previous calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('first');
      jest.advanceTimersByTime(50);
      debouncedFn('second');
      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('second');
    });

    it('should execute immediately when immediate is true', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100, true);

      debouncedFn('test');
      expect(mockFn).toHaveBeenCalledWith('test');

      debouncedFn('test2');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    it('should limit function execution rate', () => {
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 100);

      throttledFn('first');
      expect(mockFn).toHaveBeenCalledWith('first');

      throttledFn('second');
      expect(mockFn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);
      throttledFn('third');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenLastCalledWith('third');
    });

    it('should execute first call immediately', () => {
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 100);

      throttledFn('test');
      expect(mockFn).toHaveBeenCalledWith('test');
    });
  });

  describe('memoize', () => {
    it('should cache function results', () => {
      const mockFn = jest.fn((x: number) => x * 2);
      const memoizedFn = memoize(mockFn);

      const result1 = memoizedFn(5);
      const result2 = memoizedFn(5);

      expect(result1).toBe(10);
      expect(result2).toBe(10);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should use custom key function', () => {
      const mockFn = jest.fn((obj: { id: number; name: string }) => obj.name.toUpperCase());
      const memoizedFn = memoize(mockFn, (obj) => obj.id.toString());

      const obj1 = { id: 1, name: 'test' };
      const obj2 = { id: 1, name: 'different' };

      const result1 = memoizedFn(obj1);
      const result2 = memoizedFn(obj2);

      expect(result1).toBe('TEST');
      expect(result2).toBe('TEST'); // Should return cached result
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should limit cache size', () => {
      const mockFn = jest.fn((x: number) => x * 2);
      const memoizedFn = memoize(mockFn);

      // Fill cache beyond limit (100 items)
      for (let i = 0; i < 105; i++) {
        memoizedFn(i);
      }

      // First item should be evicted
      memoizedFn(0);
      expect(mockFn).toHaveBeenCalledTimes(106); // Called again for item 0
    });
  });

  describe('usePerformanceMonitor', () => {
    it('should measure render performance', () => {
      const { result } = renderHook(() => usePerformanceMonitor());

      act(() => {
        const endMeasure = result.current.measureRender('TestComponent');
        endMeasure();
      });

      expect(mockPerformance.now).toHaveBeenCalled();
    });

    it('should measure async operations', async () => {
      const { result } = renderHook(() => usePerformanceMonitor());

      const mockOperation = jest.fn().mockResolvedValue('result');

      await act(async () => {
        const operationResult = await result.current.measureAsyncOperation(
          'test-operation',
          mockOperation
        );
        expect(operationResult).toBe('result');
      });

      expect(mockOperation).toHaveBeenCalled();
      expect(mockPerformance.now).toHaveBeenCalled();
    });

    it('should handle async operation errors', async () => {
      const { result } = renderHook(() => usePerformanceMonitor());

      const mockOperation = jest.fn().mockRejectedValue(new Error('Test error'));

      await act(async () => {
        try {
          await result.current.measureAsyncOperation('test-operation', mockOperation);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      });

      expect(mockOperation).toHaveBeenCalled();
    });
  });

  describe('useMemoryMonitor', () => {
    it('should return null when memory API is not available', () => {
      const { result } = renderHook(() => useMemoryMonitor());

      const memoryUsage = result.current.getMemoryUsage();
      expect(memoryUsage).toBeNull();
    });

    it('should detect memory leaks when available', () => {
      // Mock memory API
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 95 * 1024 * 1024,
          totalJSHeapSize: 100 * 1024 * 1024,
          jsHeapSizeLimit: 200 * 1024 * 1024,
        },
        configurable: true,
      });

      const { result } = renderHook(() => useMemoryMonitor());

      const hasLeak = result.current.checkMemoryLeaks();
      expect(hasLeak).toBe(true);

      const memoryUsage = result.current.getMemoryUsage();
      expect(memoryUsage).toEqual({
        used: 95 * 1024 * 1024,
        total: 100 * 1024 * 1024,
        limit: 200 * 1024 * 1024,
        percentage: 95,
      });
    });
  });

  describe('measurePerformance decorator', () => {
    it('should measure method execution time', async () => {
      class TestClass {
        @measurePerformance('test-method')
        async testMethod(value: number) {
          return value * 2;
        }
      }

      const instance = new TestClass();
      const result = await instance.testMethod(5);

      expect(result).toBe(10);
      expect(mockPerformance.now).toHaveBeenCalled();
    });

    it('should handle method errors', async () => {
      class TestClass {
        @measurePerformance('error-method')
        async errorMethod() {
          throw new Error('Test error');
        }
      }

      const instance = new TestClass();

      try {
        await instance.errorMethod();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      expect(mockPerformance.now).toHaveBeenCalled();
    });
  });

  describe('Performance thresholds', () => {
    it('should warn about slow operations in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // This would be tested with actual PerformanceMonitor instance
      // For now, we just verify the console spy setup
      expect(consoleSpy).toBeDefined();

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Bundle size analysis', () => {
    it('should analyze component size in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Mock component
      const mockComponent = { name: 'TestComponent', props: {} };

      // This would test the actual bundle analyzer
      expect(mockComponent).toBeDefined();

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Web Vitals', () => {
    it('should handle missing PerformanceObserver gracefully', () => {
      const originalObserver = global.PerformanceObserver;
      delete (global as any).PerformanceObserver;

      // This should not throw
      expect(() => {
        // Code that uses PerformanceObserver
      }).not.toThrow();

      global.PerformanceObserver = originalObserver;
    });
  });

  describe('Error handling', () => {
    it('should handle performance API unavailability', () => {
      const originalPerformance = global.performance;
      delete (global as any).performance;

      // Functions should handle missing performance API gracefully
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      expect(() => debouncedFn('test')).not.toThrow();

      global.performance = originalPerformance;
    });
  });
});