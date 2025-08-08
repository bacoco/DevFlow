/**
 * Real User Monitoring (RUM) System
 * Tracks actual user performance metrics in production
 */

import { 
  PerformanceMetric, 
  CoreWebVitals, 
  DeviceInfo, 
  NetworkInfo, 
  RUMData,
  PerformanceSession 
} from './types';

export class RealUserMonitoring {
  private metrics: PerformanceMetric[] = [];
  private currentSession: PerformanceSession | null = null;
  private observers: Map<string, PerformanceObserver> = new Map();
  private config = {
    enableRUM: true,
    samplingRate: 0.1, // 10% sampling
    bufferSize: 100,
    flushInterval: 30000 // 30 seconds
  };

  constructor() {
    this.initializeRUM();
    this.startSession();
  }

  private initializeRUM(): void {
    if (!this.config.enableRUM || Math.random() > this.config.samplingRate) {
      return;
    }

    this.setupPerformanceObservers();
    this.setupNavigationTiming();
    this.setupResourceTiming();
    this.setupUserTiming();
    this.startPeriodicFlush();
  }

  private setupPerformanceObservers(): void {
    // Core Web Vitals observers
    this.observeLCP();
    this.observeFID();
    this.observeCLS();
    this.observeINP();
  }

  private observeLCP(): void {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      this.recordMetric({
        name: 'lcp',
        value: lastEntry.startTime,
        timestamp: new Date(),
        url: window.location.href,
        sessionId: this.currentSession?.id || '',
        deviceInfo: this.getDeviceInfo(),
        networkInfo: this.getNetworkInfo()
      });
    });

    try {
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', observer);
    } catch (error) {
      console.warn('LCP observer not supported:', error);
    }
  }

  private observeFID(): void {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        this.recordMetric({
          name: 'fid',
          value: entry.processingStart - entry.startTime,
          timestamp: new Date(),
          url: window.location.href,
          sessionId: this.currentSession?.id || '',
          deviceInfo: this.getDeviceInfo(),
          networkInfo: this.getNetworkInfo()
        });
      });
    });

    try {
      observer.observe({ entryTypes: ['first-input'] });
      this.observers.set('fid', observer);
    } catch (error) {
      console.warn('FID observer not supported:', error);
    }
  }

  private observeCLS(): void {
    if (!('PerformanceObserver' in window)) return;

    let clsValue = 0;
    let sessionValue = 0;
    let sessionEntries: any[] = [];

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
            this.recordMetric({
              name: 'cls',
              value: clsValue,
              timestamp: new Date(),
              url: window.location.href,
              sessionId: this.currentSession?.id || '',
              deviceInfo: this.getDeviceInfo(),
              networkInfo: this.getNetworkInfo()
            });
          }
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('cls', observer);
    } catch (error) {
      console.warn('CLS observer not supported:', error);
    }
  }

  private observeINP(): void {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        this.recordMetric({
          name: 'inp',
          value: entry.duration,
          timestamp: new Date(),
          url: window.location.href,
          sessionId: this.currentSession?.id || '',
          deviceInfo: this.getDeviceInfo(),
          networkInfo: this.getNetworkInfo()
        });
      });
    });

    try {
      observer.observe({ entryTypes: ['event'] });
      this.observers.set('inp', observer);
    } catch (error) {
      console.warn('INP observer not supported:', error);
    }
  }

  private setupNavigationTiming(): void {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          const metrics = {
            ttfb: navigation.responseStart - navigation.requestStart,
            fcp: this.getFirstContentfulPaint(),
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
            loadComplete: navigation.loadEventEnd - navigation.navigationStart
          };

          Object.entries(metrics).forEach(([name, value]) => {
            if (value > 0) {
              this.recordMetric({
                name,
                value,
                timestamp: new Date(),
                url: window.location.href,
                sessionId: this.currentSession?.id || '',
                deviceInfo: this.getDeviceInfo(),
                networkInfo: this.getNetworkInfo()
              });
            }
          });
        }
      }, 0);
    });
  }

  private setupResourceTiming(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.duration > 100) { // Only track slow resources
          this.recordMetric({
            name: 'resource_timing',
            value: entry.duration,
            timestamp: new Date(),
            url: entry.name,
            sessionId: this.currentSession?.id || '',
            deviceInfo: this.getDeviceInfo(),
            networkInfo: this.getNetworkInfo()
          });
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', observer);
    } catch (error) {
      console.warn('Resource timing observer not supported:', error);
    }
  }

  private setupUserTiming(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        this.recordMetric({
          name: `user_timing_${entry.name}`,
          value: entry.duration || entry.startTime,
          timestamp: new Date(),
          url: window.location.href,
          sessionId: this.currentSession?.id || '',
          deviceInfo: this.getDeviceInfo(),
          networkInfo: this.getNetworkInfo()
        });
      });
    });

    try {
      observer.observe({ entryTypes: ['measure', 'mark'] });
      this.observers.set('user-timing', observer);
    } catch (error) {
      console.warn('User timing observer not supported:', error);
    }
  }

  private getFirstContentfulPaint(): number {
    const entries = performance.getEntriesByType('paint');
    const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
    return fcpEntry ? fcpEntry.startTime : 0;
  }

  private getDeviceInfo(): DeviceInfo {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    return {
      type: this.getDeviceType(),
      memory: (performance as any).memory?.usedJSHeapSize,
      cores: navigator.hardwareConcurrency,
      connection: connection?.effectiveType,
      platform: navigator.platform,
      userAgent: navigator.userAgent
    };
  }

  private getNetworkInfo(): NetworkInfo {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    return {
      effectiveType: connection?.effectiveType || '4g',
      downlink: connection?.downlink || 10,
      rtt: connection?.rtt || 100,
      saveData: connection?.saveData || false
    };
  }

  private getDeviceType(): 'desktop' | 'tablet' | 'mobile' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private recordMetric(metric: Omit<PerformanceMetric, 'id'>): void {
    const fullMetric: PerformanceMetric = {
      id: this.generateId(),
      ...metric
    };

    this.metrics.push(fullMetric);

    if (this.metrics.length >= this.config.bufferSize) {
      this.flushMetrics();
    }
  }

  private startSession(): void {
    this.currentSession = {
      id: this.generateId(),
      startTime: new Date(),
      pageViews: 1,
      interactions: 0,
      errors: 0,
      averageResponseTime: 0,
      deviceInfo: this.getDeviceInfo(),
      networkInfo: this.getNetworkInfo()
    };
  }

  private startPeriodicFlush(): void {
    setInterval(() => {
      this.flushMetrics();
    }, this.config.flushInterval);
  }

  private async flushMetrics(): Promise<void> {
    if (this.metrics.length === 0) return;

    const metricsToSend = [...this.metrics];
    this.metrics = [];

    try {
      await this.sendMetrics(metricsToSend);
    } catch (error) {
      console.error('Failed to send performance metrics:', error);
      // Re-add metrics to buffer for retry
      this.metrics.unshift(...metricsToSend);
    }
  }

  private async sendMetrics(metrics: PerformanceMetric[]): Promise<void> {
    // Use sendBeacon for reliability, fallback to fetch
    const data = JSON.stringify({ metrics, session: this.currentSession });
    
    if (navigator.sendBeacon) {
      const blob = new Blob([data], { type: 'application/json' });
      navigator.sendBeacon('/api/performance/metrics', blob);
    } else {
      await fetch('/api/performance/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        keepalive: true
      });
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public getCoreWebVitals(): Promise<CoreWebVitals> {
    return new Promise((resolve) => {
      const vitals: Partial<CoreWebVitals> = {};
      
      // Get current values from recorded metrics
      const lcpMetric = this.metrics.find(m => m.name === 'lcp');
      const fidMetric = this.metrics.find(m => m.name === 'fid');
      const clsMetric = this.metrics.find(m => m.name === 'cls');
      const fcpMetric = this.metrics.find(m => m.name === 'fcp');
      const ttfbMetric = this.metrics.find(m => m.name === 'ttfb');
      const inpMetric = this.metrics.find(m => m.name === 'inp');

      vitals.lcp = lcpMetric?.value || 0;
      vitals.fid = fidMetric?.value || 0;
      vitals.cls = clsMetric?.value || 0;
      vitals.fcp = fcpMetric?.value || 0;
      vitals.ttfb = ttfbMetric?.value || 0;
      vitals.inp = inpMetric?.value;

      resolve(vitals as CoreWebVitals);
    });
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  public destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.flushMetrics();
  }
}

// Singleton instance
export const rumInstance = new RealUserMonitoring();