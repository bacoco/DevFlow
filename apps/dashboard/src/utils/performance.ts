// Performance monitoring utilities for production

export interface PerformanceMetrics {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private observers: PerformanceObserver[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers();
    }
  }

  private initializeObservers() {
    // Core Web Vitals monitoring
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        this.recordMetric({
          name: 'LCP',
          value: lastEntry.startTime,
          timestamp: Date.now(),
          metadata: {
            element: (lastEntry as any).element?.tagName,
            url: (lastEntry as any).url,
          }
        });
      });

      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.recordMetric({
            name: 'FID',
            value: entry.processingStart - entry.startTime,
            timestamp: Date.now(),
            metadata: {
              eventType: (entry as any).name,
            }
          });
        });
      });

      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (e) {
        console.warn('FID observer not supported');
      }

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        });

        this.recordMetric({
          name: 'CLS',
          value: clsValue,
          timestamp: Date.now(),
        });
      });

      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (e) {
        console.warn('CLS observer not supported');
      }

      // Navigation timing
      this.recordNavigationMetrics();
    }
  }

  private recordNavigationMetrics() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        // Time to First Byte (TTFB)
        this.recordMetric({
          name: 'TTFB',
          value: navigation.responseStart - navigation.requestStart,
          timestamp: Date.now(),
        });

        // DOM Content Loaded
        this.recordMetric({
          name: 'DCL',
          value: navigation.domContentLoadedEventEnd - navigation.navigationStart,
          timestamp: Date.now(),
        });

        // Load Complete
        this.recordMetric({
          name: 'Load',
          value: navigation.loadEventEnd - navigation.navigationStart,
          timestamp: Date.now(),
        });
      }
    }
  }

  recordMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);
    
    // Send to analytics if enabled
    if (process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true') {
      this.sendToAnalytics(metric);
    }

    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  private sendToAnalytics(metric: PerformanceMetrics) {
    // Send to your analytics service
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', 'performance_metric', {
        metric_name: metric.name,
        metric_value: Math.round(metric.value),
        custom_parameter: metric.metadata,
      });
    }

    // Send to Sentry
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.addBreadcrumb({
        category: 'performance',
        message: `${metric.name}: ${metric.value}ms`,
        level: 'info',
        data: metric.metadata,
      });
    }
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getMetricsByName(name: string): PerformanceMetrics[] {
    return this.metrics.filter(metric => metric.name === name);
  }

  getAverageMetric(name: string): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;
    
    const sum = metrics.reduce((acc, metric) => acc + metric.value, 0);
    return sum / metrics.length;
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = [];
  }
}

// Singleton instance
let performanceMonitor: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
}

// React hook for performance monitoring
import { useEffect, useRef } from 'react';

export function usePerformanceMonitor(componentName: string) {
  const startTime = useRef<number>(Date.now());
  const monitor = getPerformanceMonitor();

  useEffect(() => {
    const mountTime = Date.now() - startTime.current;
    
    monitor.recordMetric({
      name: 'component_mount',
      value: mountTime,
      timestamp: Date.now(),
      metadata: {
        component: componentName,
      }
    });

    return () => {
      const unmountTime = Date.now() - startTime.current;
      
      monitor.recordMetric({
        name: 'component_lifetime',
        value: unmountTime,
        timestamp: Date.now(),
        metadata: {
          component: componentName,
        }
      });
    };
  }, [componentName, monitor]);
}

// Bundle size monitoring
export function reportBundleSize() {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const jsResources = resources.filter(resource => 
      resource.name.includes('.js') && 
      resource.name.includes('/_next/static/')
    );

    const totalSize = jsResources.reduce((acc, resource) => {
      return acc + (resource.transferSize || 0);
    }, 0);

    getPerformanceMonitor().recordMetric({
      name: 'bundle_size',
      value: totalSize,
      timestamp: Date.now(),
      metadata: {
        files: jsResources.length,
      }
    });
  }
}

// Memory usage monitoring
export function reportMemoryUsage() {
  if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
    const memory = (performance as any).memory;
    
    getPerformanceMonitor().recordMetric({
      name: 'memory_usage',
      value: memory.usedJSHeapSize,
      timestamp: Date.now(),
      metadata: {
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      }
    });
  }
}

// Error boundary performance impact
export function reportErrorBoundaryTrigger(componentName: string, error: Error) {
  getPerformanceMonitor().recordMetric({
    name: 'error_boundary_trigger',
    value: 1,
    timestamp: Date.now(),
    metadata: {
      component: componentName,
      error: error.message,
    }
  });
}