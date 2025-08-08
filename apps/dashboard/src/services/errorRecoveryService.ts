/**
 * Error Recovery Service
 * Provides automated error recovery mechanisms and strategies
 */

import { errorReporting } from '../utils/errorReporting';

export interface RecoveryStrategy {
  name: string;
  canRecover: (error: Error) => boolean;
  recover: (error: Error, context?: any) => Promise<boolean>;
  maxAttempts: number;
  backoffMs: number;
}

export interface RecoveryContext {
  componentName?: string;
  props?: any;
  state?: any;
  metadata?: Record<string, any>;
}

class ErrorRecoveryService {
  private strategies: RecoveryStrategy[] = [];
  private recoveryAttempts: Map<string, number> = new Map();

  constructor() {
    this.registerDefaultStrategies();
  }

  private registerDefaultStrategies(): void {
    // Network error recovery
    this.registerStrategy({
      name: 'network-retry',
      canRecover: (error) => {
        return error.message.includes('fetch') || 
               error.message.includes('network') ||
               error.message.includes('timeout') ||
               error.name === 'NetworkError';
      },
      recover: async (error, context) => {
        // Wait for network to be available
        if (!navigator.onLine) {
          await this.waitForNetwork();
        }

        // Retry the failed operation
        if (context?.retryFunction) {
          try {
            await context.retryFunction();
            return true;
          } catch (retryError) {
            console.warn('Network retry failed:', retryError);
            return false;
          }
        }

        return false;
      },
      maxAttempts: 3,
      backoffMs: 1000,
    });

    // Memory error recovery
    this.registerStrategy({
      name: 'memory-cleanup',
      canRecover: (error) => {
        return error.message.includes('memory') ||
               error.message.includes('heap') ||
               error.name === 'RangeError';
      },
      recover: async (error, context) => {
        try {
          // Force garbage collection if available
          if (window.gc) {
            window.gc();
          }

          // Clear caches
          this.clearCaches();

          // Reduce memory usage
          this.reduceMemoryUsage();

          return true;
        } catch (cleanupError) {
          console.warn('Memory cleanup failed:', cleanupError);
          return false;
        }
      },
      maxAttempts: 1,
      backoffMs: 0,
    });

    // State corruption recovery
    this.registerStrategy({
      name: 'state-reset',
      canRecover: (error) => {
        return error.message.includes('state') ||
               error.message.includes('undefined') ||
               error.message.includes('null');
      },
      recover: async (error, context) => {
        try {
          // Reset component state if available
          if (context?.resetState) {
            context.resetState();
          }

          // Clear local storage for the component
          if (context?.componentName) {
            this.clearComponentStorage(context.componentName);
          }

          return true;
        } catch (resetError) {
          console.warn('State reset failed:', resetError);
          return false;
        }
      },
      maxAttempts: 1,
      backoffMs: 0,
    });

    // Render error recovery
    this.registerStrategy({
      name: 'render-fallback',
      canRecover: (error) => {
        return error.message.includes('render') ||
               error.message.includes('React') ||
               error.name === 'Invariant Violation';
      },
      recover: async (error, context) => {
        try {
          // Force re-render with safe props
          if (context?.forceUpdate) {
            context.forceUpdate();
          }

          return true;
        } catch (renderError) {
          console.warn('Render recovery failed:', renderError);
          return false;
        }
      },
      maxAttempts: 2,
      backoffMs: 100,
    });
  }

  public registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy);
  }

  public async attemptRecovery(
    error: Error,
    context?: RecoveryContext
  ): Promise<{ recovered: boolean; strategy?: string }> {
    const errorKey = this.getErrorKey(error, context);
    
    // Find applicable strategies
    const applicableStrategies = this.strategies.filter(strategy => 
      strategy.canRecover(error)
    );

    if (applicableStrategies.length === 0) {
      return { recovered: false };
    }

    // Try each strategy
    for (const strategy of applicableStrategies) {
      const attempts = this.recoveryAttempts.get(`${errorKey}-${strategy.name}`) || 0;
      
      if (attempts >= strategy.maxAttempts) {
        continue;
      }

      try {
        // Increment attempt counter
        this.recoveryAttempts.set(`${errorKey}-${strategy.name}`, attempts + 1);

        // Apply backoff delay
        if (attempts > 0 && strategy.backoffMs > 0) {
          await this.delay(strategy.backoffMs * Math.pow(2, attempts - 1));
        }

        // Attempt recovery
        const recovered = await strategy.recover(error, context);

        if (recovered) {
          // Reset attempt counter on success
          this.recoveryAttempts.delete(`${errorKey}-${strategy.name}`);
          
          // Report successful recovery
          errorReporting.reportError({
            error: new Error(`Recovery successful: ${strategy.name}`),
            level: 'service',
            metadata: {
              originalError: error.message,
              recoveryStrategy: strategy.name,
              attempts: attempts + 1,
            },
          });

          return { recovered: true, strategy: strategy.name };
        }
      } catch (recoveryError) {
        console.warn(`Recovery strategy ${strategy.name} failed:`, recoveryError);
        
        // Report recovery failure
        errorReporting.reportError({
          error: recoveryError as Error,
          level: 'service',
          metadata: {
            originalError: error.message,
            recoveryStrategy: strategy.name,
            attempts: attempts + 1,
          },
        });
      }
    }

    return { recovered: false };
  }

  private getErrorKey(error: Error, context?: RecoveryContext): string {
    return `${error.name}-${error.message}-${context?.componentName || 'unknown'}`;
  }

  private async waitForNetwork(): Promise<void> {
    return new Promise((resolve) => {
      if (navigator.onLine) {
        resolve();
        return;
      }

      const handleOnline = () => {
        window.removeEventListener('online', handleOnline);
        resolve();
      };

      window.addEventListener('online', handleOnline);
    });
  }

  private clearCaches(): void {
    try {
      // Clear various caches
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }

      // Clear session storage
      sessionStorage.clear();
    } catch (error) {
      console.warn('Failed to clear caches:', error);
    }
  }

  private reduceMemoryUsage(): void {
    try {
      // Remove large objects from memory
      // This is a placeholder - implement based on your app's specific needs
      
      // Clear image caches
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (img.src.startsWith('blob:')) {
          URL.revokeObjectURL(img.src);
        }
      });

      // Clear canvas contexts
      const canvases = document.querySelectorAll('canvas');
      canvases.forEach(canvas => {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      });
    } catch (error) {
      console.warn('Failed to reduce memory usage:', error);
    }
  }

  private clearComponentStorage(componentName: string): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes(componentName.toLowerCase())) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear component storage:', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getRecoveryStats(): {
    totalAttempts: number;
    successfulRecoveries: number;
    strategiesUsed: Record<string, number>;
  } {
    const totalAttempts = Array.from(this.recoveryAttempts.values()).reduce((sum, attempts) => sum + attempts, 0);
    
    // This is a simplified version - in a real implementation, you'd track more detailed stats
    return {
      totalAttempts,
      successfulRecoveries: 0, // Would need to track this separately
      strategiesUsed: {}, // Would need to track this separately
    };
  }

  public clearRecoveryHistory(): void {
    this.recoveryAttempts.clear();
  }
}

// Create singleton instance
export const errorRecovery = new ErrorRecoveryService();

// Utility function for components to attempt recovery
export const attemptErrorRecovery = async (
  error: Error,
  context?: RecoveryContext
): Promise<boolean> => {
  const result = await errorRecovery.attemptRecovery(error, context);
  return result.recovered;
};