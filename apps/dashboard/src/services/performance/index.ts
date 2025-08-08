/**
 * Performance Monitoring Service Index
 * Main entry point for performance monitoring functionality
 */

// Core monitoring system
export { PerformanceMonitoringSystem, performanceMonitoringSystem } from './PerformanceMonitoringSystem';

// Individual monitoring components
export { RealUserMonitoring, rumInstance } from './RealUserMonitoring';
export { CoreWebVitalsMonitor, coreWebVitalsMonitor } from './CoreWebVitalsMonitor';
export { PerformanceBudgetManager, performanceBudgetManager } from './PerformanceBudgetManager';
export { PerformanceOptimizer, performanceOptimizer } from './PerformanceOptimizer';

// Types
export * from './types';

// React components
export { default as PerformanceMonitoringDashboard } from '../../components/Performance/PerformanceMonitoringDashboard';

// Utility functions
export const initializePerformanceMonitoring = async (config?: any) => {
  const { performanceMonitoringSystem } = await import('./PerformanceMonitoringSystem');
  
  if (config) {
    performanceMonitoringSystem.updateConfig(config);
  }
  
  await performanceMonitoringSystem.initialize();
  return performanceMonitoringSystem;
};

export const getPerformanceReport = () => {
  const { performanceMonitoringSystem } = require('./PerformanceMonitoringSystem');
  return performanceMonitoringSystem.generateReport();
};

export const checkPerformanceBudgets = (metrics: Record<string, number>) => {
  const { performanceBudgetManager } = require('./PerformanceBudgetManager');
  return performanceBudgetManager.checkMultipleMetrics(metrics);
};

export const getPerformanceRecommendations = (metrics?: any[]) => {
  const { performanceOptimizer } = require('./PerformanceOptimizer');
  
  if (metrics) {
    return performanceOptimizer.analyzePerformance(metrics);
  }
  
  return performanceOptimizer.getRecommendations();
};

// Performance measurement utilities
export const measurePerformance = (name: string, fn: () => void | Promise<void>) => {
  return async () => {
    const startTime = performance.now();
    performance.mark(`${name}-start`);
    
    try {
      const result = await fn();
      
      const endTime = performance.now();
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
      
      const duration = endTime - startTime;
      console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`);
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.error(`Performance: ${name} failed after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  };
};

export const withPerformanceTracking = <T extends (...args: any[]) => any>(
  name: string,
  fn: T
): T => {
  return ((...args: Parameters<T>) => {
    const startTime = performance.now();
    performance.mark(`${name}-start`);
    
    try {
      const result = fn(...args);
      
      // Handle both sync and async functions
      if (result && typeof result.then === 'function') {
        return result.then((value: any) => {
          const endTime = performance.now();
          performance.mark(`${name}-end`);
          performance.measure(name, `${name}-start`, `${name}-end`);
          
          const duration = endTime - startTime;
          console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`);
          
          return value;
        }).catch((error: any) => {
          const endTime = performance.now();
          const duration = endTime - startTime;
          console.error(`Performance: ${name} failed after ${duration.toFixed(2)}ms`, error);
          throw error;
        });
      } else {
        const endTime = performance.now();
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        
        const duration = endTime - startTime;
        console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`);
        
        return result;
      }
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.error(`Performance: ${name} failed after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  }) as T;
};

// Performance hooks for React components
export const usePerformanceMonitoring = () => {
  const [vitals, setVitals] = React.useState(null);
  const [recommendations, setRecommendations] = React.useState([]);
  const [alerts, setAlerts] = React.useState([]);

  React.useEffect(() => {
    let mounted = true;

    const initializeMonitoring = async () => {
      try {
        await performanceMonitoringSystem.initialize();
        
        if (mounted) {
          const currentVitals = await performanceMonitoringSystem.getCurrentVitals();
          const currentRecommendations = performanceMonitoringSystem.getRecommendations();
          
          setVitals(currentVitals);
          setRecommendations(currentRecommendations);
        }

        const handleAlert = (alert: any) => {
          if (mounted) {
            setAlerts(prev => [alert, ...prev.slice(0, 9)]);
          }
        };

        performanceMonitoringSystem.onAlert(handleAlert);

        return () => {
          performanceMonitoringSystem.removeAlertCallback(handleAlert);
        };
      } catch (error) {
        console.error('Failed to initialize performance monitoring:', error);
      }
    };

    initializeMonitoring();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    vitals,
    recommendations,
    alerts,
    generateReport: () => performanceMonitoringSystem.generateReport(),
    checkBudgets: (metrics: Record<string, number>) => 
      performanceBudgetManager.checkMultipleMetrics(metrics)
  };
};

// Performance decorator for class methods
export const performanceTrack = (name?: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const trackingName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = withPerformanceTracking(trackingName, originalMethod);

    return descriptor;
  };
};

// Default export for convenience
export default {
  PerformanceMonitoringSystem,
  performanceMonitoringSystem,
  initializePerformanceMonitoring,
  getPerformanceReport,
  checkPerformanceBudgets,
  getPerformanceRecommendations,
  measurePerformance,
  withPerformanceTracking,
  performanceTrack
};