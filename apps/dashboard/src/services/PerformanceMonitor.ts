// Performance Monitor with Core Web Vitals tracking
import React from 'react';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  id?: string;
  delta?: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
  navigationType?: string;
}

interface CoreWebVitals {
  CLS: number | null; // Cumulative Layout Shift
  FID: number | null; // First Input Delay
  FCP: number | null; // First Contentful Paint
  LCP: number | null; // Largest Contentful Paint
  TTFB: number | null; // Time to First Byte
  INP: number | null; // Interaction to Next Paint
}

interface PerformanceConfig {
  enableConsoleLogging: boolean;
  enableAnalytics: boolean;
  sampleRate: number;
  endpoint?: string;
}

class PerformanceMonitor {
  private config: PerformanceConfig;
  private metrics: PerformanceMetric[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private webVitals: CoreWebVitals = {
    CLS: null,
    FID: null,
    FCP: null,
    LCP: null,
    TTFB: null,
    INP: null
  };

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enableConsoleLogging: process.env.NODE_ENV === 'development',
      enableAnalytics: true,
      sampleRate: 1.0,
      ...config
    };

    this.initializeObservers();
    this.trackNavigationTiming();
    this.trackResourceTiming();
  }

  private initializeObservers() {
    // Core Web Vitals observers
    this.observeLCP();
    this.observeFID();
    this.observeCLS();
    this.observeFCP();
    this.observeINP();
    
    // Additional performance observers
    this.observeLongTasks();
    this.observeLayoutShifts();
    this.observePaintTiming();
  }

  private observeLCP() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
        
        if (lastEntry) {
          this.webVitals.LCP = lastEntry.startTime;
          this.recordMetric({
            name: 'LCP',
            value: lastEntry.startTime,
            timestamp: Date.now(),
            rating: this.rateLCP(lastEntry.startTime)
          });
        }
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true });
      this.observers.set('lcp', observer);
    } catch (error) {
      console.warn('LCP observer not supported:', error);
    }
  }

  private observeFID() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.processingStart && entry.startTime) {
            const fid = entry.processingStart - entry.startTime;
            this.webVitals.FID = fid;
            this.recordMetric({
              name: 'FID',
              value: fid,
              timestamp: Date.now(),
              rating: this.rateFID(fid)
            });
          }
        });
      });

      observer.observe({ type: 'first-input', buffered: true });
      this.observers.set('fid', observer);
    } catch (error) {
      console.warn('FID observer not supported:', error);
    }
  }

  private observeCLS() {
    if (!('PerformanceObserver' in window)) return;

    let clsValue = 0;
    let sessionValue = 0;
    let sessionEntries: any[] = [];

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            const firstSessionEntry = sessionEntries[0];
            const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

            if (sessionValue && 
                entry.startTime - lastSessionEntry.startTime < 1000 &&
                entry.startTime - firstSessionEntry.startTime < 5000) {
              sessionValue += entry.value;
              sessionEntries.push(entry);
            } else {
              sessionValue = entry.value;
              sessionEntries = [entry];
            }

            if (sessionValue > clsValue) {
              clsValue = sessionValue;
              this.webVitals.CLS = clsValue;
              this.recordMetric({
                name: 'CLS',
                value: clsValue,
                timestamp: Date.now(),
                rating: this.rateCLS(clsValue)
              });
            }
          }
        });
      });

      observer.observe({ type: 'layout-shift', buffered: true });
      this.observers.set('cls', observer);
    } catch (error) {
      console.warn('CLS observer not supported:', error);
    }
  }

  private observeFCP() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.name === 'first-contentful-paint') {
            this.webVitals.FCP = entry.startTime;
            this.recordMetric({
              name: 'FCP',
              value: entry.startTime,
              timestamp: Date.now(),
              rating: this.rateFCP(entry.startTime)
            });
          }
        });
      });

      observer.observe({ type: 'paint', buffered: true });
      this.observers.set('fcp', observer);
    } catch (error) {
      console.warn('FCP observer not supported:', error);
    }
  }

  private observeINP() {
    if (!('PerformanceObserver' in window)) return;

    let maxINP = 0;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          const inp = entry.processingEnd - entry.startTime;
          if (inp > maxINP) {
            maxINP = inp;
            this.webVitals.INP = inp;
            this.recordMetric({
              name: 'INP',
              value: inp,
              timestamp: Date.now(),
              rating: this.rateINP(inp)
            });
          }
        });
      });

      observer.observe({ type: 'event', buffered: true });
      this.observers.set('inp', observer);
    } catch (error) {
      console.warn('INP observer not supported:', error);
    }
  }

  private observeLongTasks() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.recordMetric({
            name: 'long-task',
            value: entry.duration,
            timestamp: Date.now(),
            rating: entry.duration > 100 ? 'poor' : 'good'
          });
        });
      });

      observer.observe({ type: 'longtask', buffered: true });
      this.observers.set('longtask', observer);
    } catch (error) {
      console.warn('Long task observer not supported:', error);
    }
  }

  private observeLayoutShifts() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.hadRecentInput) return;
          
          this.recordMetric({
            name: 'layout-shift',
            value: entry.value,
            timestamp: Date.now(),
            rating: entry.value > 0.1 ? 'poor' : entry.value > 0.05 ? 'needs-improvement' : 'good'
          });
        });
      });

      observer.observe({ type: 'layout-shift', buffered: true });
      this.observers.set('layout-shift', observer);
    } catch (error) {
      console.warn('Layout shift observer not supported:', error);
    }
  }

  private observePaintTiming() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.recordMetric({
            name: entry.name,
            value: entry.startTime,
            timestamp: Date.now(),
            rating: this.ratePaintTiming(entry.name, entry.startTime)
          });
        });
      });

      observer.observe({ type: 'paint', buffered: true });
      this.observers.set('paint', observer);
    } catch (error) {
      console.warn('Paint timing observer not supported:', error);
    }
  }

  private trackNavigationTiming() {
    if (!('performance' in window) || !performance.getEntriesByType) return;

    const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (navigationEntries.length > 0) {
      const entry = navigationEntries[0];
      
      // TTFB
      const ttfb = entry.responseStart - entry.requestStart;
      this.webVitals.TTFB = ttfb;
      this.recordMetric({
        name: 'TTFB',
        value: ttfb,
        timestamp: Date.now(),
        rating: this.rateTTFB(ttfb)
      });

      // DOM Content Loaded
      this.recordMetric({
        name: 'DCL',
        value: entry.domContentLoadedEventEnd - entry.navigationStart,
        timestamp: Date.now()
      });

      // Load Complete
      this.recordMetric({
        name: 'load',
        value: entry.loadEventEnd - entry.navigationStart,
        timestamp: Date.now()
      });
    }
  }

  private trackResourceTiming() {
    if (!('performance' in window) || !performance.getEntriesByType) return;

    const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    resourceEntries.forEach((entry) => {
      this.recordMetric({
        name: 'resource-load',
        value: entry.duration,
        timestamp: Date.now(),
        id: entry.name
      });
    });
  }

  // Rating functions based on Core Web Vitals thresholds
  private rateLCP(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 2500) return 'good';
    if (value <= 4000) return 'needs-improvement';
    return 'poor';
  }

  private rateFID(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 100) return 'good';
    if (value <= 300) return 'needs-improvement';
    return 'poor';
  }

  private rateCLS(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 0.1) return 'good';
    if (value <= 0.25) return 'needs-improvement';
    return 'poor';
  }

  private rateFCP(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 1800) return 'good';
    if (value <= 3000) return 'needs-improvement';
    return 'poor';
  }

  private rateTTFB(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 800) return 'good';
    if (value <= 1800) return 'needs-improvement';
    return 'poor';
  }

  private rateINP(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 200) return 'good';
    if (value <= 500) return 'needs-improvement';
    return 'poor';
  }

  private ratePaintTiming(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    if (name === 'first-paint' || name === 'first-contentful-paint') {
      return this.rateFCP(value);
    }
    return 'good';
  }

  private recordMetric(metric: PerformanceMetric) {
    // Sample rate check
    if (Math.random() > this.config.sampleRate) return;

    this.metrics.push(metric);

    if (this.config.enableConsoleLogging) {
      console.log(`Performance: ${metric.name} = ${metric.value.toFixed(2)}ms (${metric.rating || 'N/A'})`);
    }

    if (this.config.enableAnalytics) {
      this.sendToAnalytics(metric);
    }

    // Emit custom event
    window.dispatchEvent(new CustomEvent('performance-metric', { detail: metric }));
  }

  private async sendToAnalytics(metric: PerformanceMetric) {
    if (!this.config.endpoint) return;

    try {
      await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...metric,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: Date.now()
        }),
      });
    } catch (error) {
      console.warn('Failed to send performance metric:', error);
    }
  }

  // Public API
  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  public getWebVitals(): CoreWebVitals {
    return { ...this.webVitals };
  }

  public measureUserTiming(name: string, startMark?: string, endMark?: string) {
    if (!('performance' in window)) return;

    try {
      if (startMark && endMark) {
        performance.measure(name, startMark, endMark);
      } else {
        performance.measure(name);
      }

      const measures = performance.getEntriesByName(name, 'measure');
      if (measures.length > 0) {
        const measure = measures[measures.length - 1];
        this.recordMetric({
          name: `user-timing-${name}`,
          value: measure.duration,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.warn('User timing measurement failed:', error);
    }
  }

  public mark(name: string) {
    if ('performance' in window && performance.mark) {
      performance.mark(name);
    }
  }

  public measureFunction<T>(name: string, fn: () => T): T {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    
    this.recordMetric({
      name: `function-${name}`,
      value: endTime - startTime,
      timestamp: Date.now()
    });
    
    return result;
  }

  public async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    
    this.recordMetric({
      name: `async-function-${name}`,
      value: endTime - startTime,
      timestamp: Date.now()
    });
    
    return result;
  }

  public getPerformanceReport() {
    const webVitals = this.getWebVitals();
    const metrics = this.getMetrics();
    
    return {
      webVitals,
      metrics: metrics.reduce((acc, metric) => {
        if (!acc[metric.name]) {
          acc[metric.name] = [];
        }
        acc[metric.name].push(metric);
        return acc;
      }, {} as Record<string, PerformanceMetric[]>),
      summary: {
        totalMetrics: metrics.length,
        goodMetrics: metrics.filter(m => m.rating === 'good').length,
        poorMetrics: metrics.filter(m => m.rating === 'poor').length,
        averageValues: this.calculateAverages(metrics)
      }
    };
  }

  private calculateAverages(metrics: PerformanceMetric[]) {
    const grouped = metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric.value);
      return acc;
    }, {} as Record<string, number[]>);

    return Object.entries(grouped).reduce((acc, [name, values]) => {
      acc[name] = values.reduce((sum, val) => sum + val, 0) / values.length;
      return acc;
    }, {} as Record<string, number>);
  }

  public dispose() {
    this.observers.forEach((observer) => {
      observer.disconnect();
    });
    this.observers.clear();
    this.metrics = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  const [webVitals, setWebVitals] = React.useState<CoreWebVitals>(performanceMonitor.getWebVitals());
  const [metrics, setMetrics] = React.useState<PerformanceMetric[]>([]);

  React.useEffect(() => {
    const handleMetric = (event: CustomEvent<PerformanceMetric>) => {
      setMetrics(prev => [...prev, event.detail]);
      setWebVitals(performanceMonitor.getWebVitals());
    };

    window.addEventListener('performance-metric', handleMetric as EventListener);
    
    return () => {
      window.removeEventListener('performance-metric', handleMetric as EventListener);
    };
  }, []);

  return {
    webVitals,
    metrics,
    measureFunction: performanceMonitor.measureFunction.bind(performanceMonitor),
    measureAsyncFunction: performanceMonitor.measureAsyncFunction.bind(performanceMonitor),
    mark: performanceMonitor.mark.bind(performanceMonitor),
    getReport: performanceMonitor.getPerformanceReport.bind(performanceMonitor)
  };
};

export default PerformanceMonitor;