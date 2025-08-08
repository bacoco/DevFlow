/**
 * Circuit Breaker Implementation
 * Prevents cascading failures by temporarily blocking requests to failing services
 */

import { CircuitBreakerConfig, CircuitBreakerState } from './types';

export class CircuitBreaker {
  private state: CircuitBreakerState;
  private config: CircuitBreakerConfig;
  private failureCount: number = 0;
  private lastFailureTime?: Date;
  private nextAttemptTime?: Date;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
    this.state = {
      state: 'closed',
      failureCount: 0
    };
  }

  /**
   * Check if circuit breaker is open (blocking requests)
   */
  isOpen(): boolean {
    if (this.state.state === 'open') {
      if (this.nextAttemptTime && new Date() > this.nextAttemptTime) {
        this.state.state = 'half-open';
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Check if circuit breaker is half-open (allowing limited requests)
   */
  isHalfOpen(): boolean {
    return this.state.state === 'half-open';
  }

  /**
   * Record a successful operation
   */
  recordSuccess(): void {
    this.failureCount = 0;
    this.state.failureCount = 0;
    this.state.state = 'closed';
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
  }

  /**
   * Record a failed operation
   */
  recordFailure(): void {
    this.failureCount++;
    this.state.failureCount = this.failureCount;
    this.lastFailureTime = new Date();
    this.state.lastFailureTime = this.lastFailureTime;

    if (this.state.state === 'half-open') {
      // If we're half-open and still failing, go back to open
      this.openCircuit();
    } else if (this.failureCount >= this.config.failureThreshold) {
      // If we've exceeded the failure threshold, open the circuit
      this.openCircuit();
    }
  }

  /**
   * Open the circuit breaker
   */
  private openCircuit(): void {
    this.state.state = 'open';
    this.nextAttemptTime = new Date(Date.now() + this.config.resetTimeout);
    this.state.nextAttemptTime = this.nextAttemptTime;
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  /**
   * Get failure rate over monitoring period
   */
  getFailureRate(): number {
    if (!this.lastFailureTime) return 0;
    
    const monitoringWindow = new Date(Date.now() - this.config.monitoringPeriod);
    if (this.lastFailureTime < monitoringWindow) {
      return 0;
    }
    
    return this.failureCount / this.config.failureThreshold;
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.state.state = 'closed';
    this.failureCount = 0;
    this.state.failureCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
    this.state.lastFailureTime = undefined;
    this.state.nextAttemptTime = undefined;
  }

  /**
   * Check if we can make a request based on circuit breaker state
   */
  canExecute(): boolean {
    if (this.isOpen()) {
      return false;
    }
    
    if (this.isHalfOpen()) {
      // In half-open state, allow limited requests
      return this.failureCount < this.config.halfOpenMaxCalls;
    }
    
    return true;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Get metrics for monitoring
   */
  getMetrics() {
    return {
      state: this.state.state,
      failureCount: this.failureCount,
      failureRate: this.getFailureRate(),
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      isOpen: this.isOpen(),
      isHalfOpen: this.isHalfOpen(),
      canExecute: this.canExecute()
    };
  }
}