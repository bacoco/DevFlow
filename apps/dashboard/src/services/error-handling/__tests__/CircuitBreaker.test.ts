/**
 * Circuit Breaker Tests
 * Test suite for circuit breaker pattern implementation
 */

import { CircuitBreaker } from '../CircuitBreaker';
import { CircuitBreakerConfig } from '../types';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  let config: CircuitBreakerConfig;

  beforeEach(() => {
    config = {
      failureThreshold: 3,
      resetTimeout: 5000,
      monitoringPeriod: 10000,
      halfOpenMaxCalls: 2
    };
    circuitBreaker = new CircuitBreaker(config);
  });

  describe('initial state', () => {
    it('should start in closed state', () => {
      expect(circuitBreaker.isOpen()).toBe(false);
      expect(circuitBreaker.isHalfOpen()).toBe(false);
      expect(circuitBreaker.canExecute()).toBe(true);
    });

    it('should have zero failure count initially', () => {
      const state = circuitBreaker.getState();
      expect(state.failureCount).toBe(0);
      expect(state.state).toBe('closed');
    });
  });

  describe('failure handling', () => {
    it('should remain closed below failure threshold', () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();

      expect(circuitBreaker.isOpen()).toBe(false);
      expect(circuitBreaker.canExecute()).toBe(true);
    });

    it('should open when failure threshold is reached', () => {
      for (let i = 0; i < config.failureThreshold; i++) {
        circuitBreaker.recordFailure();
      }

      expect(circuitBreaker.isOpen()).toBe(true);
      expect(circuitBreaker.canExecute()).toBe(false);
    });

    it('should set next attempt time when opening', () => {
      for (let i = 0; i < config.failureThreshold; i++) {
        circuitBreaker.recordFailure();
      }

      const state = circuitBreaker.getState();
      expect(state.nextAttemptTime).toBeDefined();
      expect(state.nextAttemptTime!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('success handling', () => {
    it('should reset failure count on success', () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordSuccess();

      const state = circuitBreaker.getState();
      expect(state.failureCount).toBe(0);
      expect(state.state).toBe('closed');
    });

    it('should close circuit on success in half-open state', () => {
      // Open the circuit
      for (let i = 0; i < config.failureThreshold; i++) {
        circuitBreaker.recordFailure();
      }

      // Manually set to half-open (simulating timeout)
      const state = circuitBreaker.getState();
      state.state = 'half-open';

      circuitBreaker.recordSuccess();

      expect(circuitBreaker.isOpen()).toBe(false);
      expect(circuitBreaker.isHalfOpen()).toBe(false);
    });
  });

  describe('half-open state', () => {
    beforeEach(() => {
      // Open the circuit
      for (let i = 0; i < config.failureThreshold; i++) {
        circuitBreaker.recordFailure();
      }
    });

    it('should transition to half-open after timeout', (done) => {
      // Use a short timeout for testing
      const shortConfig = { ...config, resetTimeout: 100 };
      const shortCircuitBreaker = new CircuitBreaker(shortConfig);

      // Open the circuit
      for (let i = 0; i < shortConfig.failureThreshold; i++) {
        shortCircuitBreaker.recordFailure();
      }

      expect(shortCircuitBreaker.isOpen()).toBe(true);

      setTimeout(() => {
        expect(shortCircuitBreaker.isOpen()).toBe(false);
        expect(shortCircuitBreaker.isHalfOpen()).toBe(true);
        done();
      }, 150);
    });

    it('should allow limited calls in half-open state', () => {
      const state = circuitBreaker.getState();
      state.state = 'half-open';
      state.failureCount = 0;

      expect(circuitBreaker.canExecute()).toBe(true);

      // Simulate some failures but below half-open limit
      circuitBreaker.recordFailure();
      expect(circuitBreaker.canExecute()).toBe(true);
    });

    it('should go back to open on failure in half-open state', () => {
      const state = circuitBreaker.getState();
      state.state = 'half-open';

      circuitBreaker.recordFailure();

      expect(circuitBreaker.isOpen()).toBe(true);
      expect(circuitBreaker.isHalfOpen()).toBe(false);
    });
  });

  describe('execute method', () => {
    it('should execute function when circuit is closed', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalled();
    });

    it('should throw error when circuit is open', async () => {
      // Open the circuit
      for (let i = 0; i < config.failureThreshold; i++) {
        circuitBreaker.recordFailure();
      }

      const mockFn = jest.fn().mockResolvedValue('success');
      
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('Circuit breaker is open');
      expect(mockFn).not.toHaveBeenCalled();
    });

    it('should record success when function succeeds', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      await circuitBreaker.execute(mockFn);
      
      const state = circuitBreaker.getState();
      expect(state.failureCount).toBe(0);
    });

    it('should record failure when function fails', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));
      
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('test error');
      
      const state = circuitBreaker.getState();
      expect(state.failureCount).toBe(1);
    });
  });

  describe('failure rate calculation', () => {
    it('should calculate failure rate correctly', () => {
      expect(circuitBreaker.getFailureRate()).toBe(0);

      circuitBreaker.recordFailure();
      expect(circuitBreaker.getFailureRate()).toBeGreaterThan(0);
    });

    it('should return 0 for old failures outside monitoring period', () => {
      // Mock old failure time
      const oldTime = new Date(Date.now() - config.monitoringPeriod - 1000);
      const state = circuitBreaker.getState();
      state.lastFailureTime = oldTime;

      expect(circuitBreaker.getFailureRate()).toBe(0);
    });
  });

  describe('reset functionality', () => {
    it('should reset circuit breaker to initial state', () => {
      // Open the circuit
      for (let i = 0; i < config.failureThreshold; i++) {
        circuitBreaker.recordFailure();
      }

      expect(circuitBreaker.isOpen()).toBe(true);

      circuitBreaker.reset();

      expect(circuitBreaker.isOpen()).toBe(false);
      expect(circuitBreaker.isHalfOpen()).toBe(false);
      expect(circuitBreaker.canExecute()).toBe(true);

      const state = circuitBreaker.getState();
      expect(state.failureCount).toBe(0);
      expect(state.state).toBe('closed');
    });
  });

  describe('metrics', () => {
    it('should provide comprehensive metrics', () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();

      const metrics = circuitBreaker.getMetrics();

      expect(metrics).toHaveProperty('state');
      expect(metrics).toHaveProperty('failureCount');
      expect(metrics).toHaveProperty('failureRate');
      expect(metrics).toHaveProperty('isOpen');
      expect(metrics).toHaveProperty('isHalfOpen');
      expect(metrics).toHaveProperty('canExecute');

      expect(metrics.failureCount).toBe(2);
      expect(metrics.state).toBe('closed');
      expect(metrics.isOpen).toBe(false);
      expect(metrics.canExecute).toBe(true);
    });

    it('should show correct metrics when circuit is open', () => {
      // Open the circuit
      for (let i = 0; i < config.failureThreshold; i++) {
        circuitBreaker.recordFailure();
      }

      const metrics = circuitBreaker.getMetrics();

      expect(metrics.state).toBe('open');
      expect(metrics.isOpen).toBe(true);
      expect(metrics.canExecute).toBe(false);
      expect(metrics.failureCount).toBe(config.failureThreshold);
    });
  });

  describe('edge cases', () => {
    it('should handle zero failure threshold', () => {
      const zeroConfig = { ...config, failureThreshold: 0 };
      const zeroCircuitBreaker = new CircuitBreaker(zeroConfig);

      zeroCircuitBreaker.recordFailure();

      expect(zeroCircuitBreaker.isOpen()).toBe(true);
    });

    it('should handle very short reset timeout', () => {
      const shortConfig = { ...config, resetTimeout: 1 };
      const shortCircuitBreaker = new CircuitBreaker(shortConfig);

      // Open the circuit
      for (let i = 0; i < shortConfig.failureThreshold; i++) {
        shortCircuitBreaker.recordFailure();
      }

      expect(shortCircuitBreaker.isOpen()).toBe(true);

      // Should quickly transition to half-open
      setTimeout(() => {
        expect(shortCircuitBreaker.isHalfOpen()).toBe(true);
      }, 10);
    });

    it('should handle concurrent failures correctly', () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(Promise.resolve().then(() => circuitBreaker.recordFailure()));
      }

      return Promise.all(promises).then(() => {
        const state = circuitBreaker.getState();
        expect(state.failureCount).toBe(10);
        expect(circuitBreaker.isOpen()).toBe(true);
      });
    });
  });
});