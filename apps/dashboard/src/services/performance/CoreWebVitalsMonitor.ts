/**
 * Core Web Vitals Monitor
 * Specialized monitoring for Core Web Vitals with alerting
 */

import { 
  CoreWebVitals, 
  PerformanceAlert, 
  PerformanceBenchmark,
  DeviceInfo,
  NetworkInfo 
} from './types';

export class CoreWebVitalsMonitor {
  private vitals: CoreWebVitals | null = null;
  private benchmarks: Map<string, PerformanceBenchmark> = new Map();
  private alertCallbacks: Array<(alert: PerformanceAlert) => void> = [];
  private thresholds = {
    lcp: { good: 2500, poor: 4000 },
    fid: { good: 100, poor: 300 },
    cls: { good: 0.1, poor: 0.25 },
    fcp: { good: 1800, poor: 3000 },
    ttfb: { good: 800, poor: 1800 },
    inp: { good: 200, poor: 500 }
  };

  constructor() {
    this.initializeBenchmarks();
    this.startMonitoring();
  }

  private initializeBenchmarks(): void {
    Object.keys(this.thresholds).forEach(metric => {
      this.benchmarks.set(metric, {
        name: metric,
        target: this.thresholds[metric as keyof typeof this.thresholds].good,
        current: 0,
        trend: 'stable',
        history: []
      });
    });
  }

  private startMonitoring(): void {
    // Monitor LCP
    this.observeMetric('largest-contentful-paint', (entries) => {
      const lastEntry = entries[entries.length - 1];
      this.updateVital('lcp', lastEntry.startTime);
    });

    // Monitor FID
    this.observeMetric('first-input', (entries) => {
      entries.forEach((entry: any) => {
        const fid = entry.processingStart - entry.startTime;
        this.updateVital('fid', fid);
      });
    });

    // Monitor CLS
    this.observeCLS();

    // Monitor FCP
    this.observeMetric('paint', (entries) => {
      const fcpEntry = entries.find((entry: any) => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        this.updateVital('fcp', fcpEntry.startTime);
      }
    });

    // Monitor TTFB
    this.observeTTFB();

    // Monitor INP (if supported)
    this.observeINP();
  }

  private observeMetric(entryType: string, callback: (entries: PerformanceEntry[]) => void): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      observer.observe({ entryTypes: [entryType] });
    } catch (error) {
      console.warn(`Failed to observe ${entryType}:`, error);
    }
  }

  private observeCLS(): void {
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
              this.updateVital('cls', clsValue);
            }
          }
        });
      });

      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('Failed to observe CLS:', error);
    }
  }

  private observeTTFB(): void {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const ttfb = navigation.responseStart - navigation.requestStart;
        this.updateVital('ttfb', ttfb);
      }
    });
  }

  private observeINP(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.duration) {
            this.updateVital('inp', entry.duration);
          }
        });
      });

      observer.observe({ entryTypes: ['event'] });
    } catch (error) {
      console.warn('Failed to observe INP:', error);
    }
  }

  private updateVital(metric: keyof CoreWebVitals, value: number): void {
    if (!this.vitals) {
      this.vitals = {
        lcp: 0,
        fid: 0,
        cls: 0,
        fcp: 0,
        ttfb: 0,
        inp: 0
      };
    }

    this.vitals[metric] = value;
    this.updateBenchmark(metric, value);
    this.checkThresholds(metric, value);
  }

  private updateBenchmark(metric: string, value: number): void {
    const benchmark = this.benchmarks.get(metric);
    if (!benchmark) return;

    const previousValue = benchmark.current;
    benchmark.current = value;
    benchmark.history.push({ timestamp: new Date(), value });

    // Keep only last 100 entries
    if (benchmark.history.length > 100) {
      benchmark.history = benchmark.history.slice(-100);
    }

    // Update trend
    if (benchmark.history.length >= 10) {
      const recent = benchmark.history.slice(-10);
      const older = benchmark.history.slice(-20, -10);
      
      if (older.length > 0) {
        const recentAvg = recent.reduce((sum, entry) => sum + entry.value, 0) / recent.length;
        const olderAvg = older.reduce((sum, entry) => sum + entry.value, 0) / older.length;
        
        const change = (recentAvg - olderAvg) / olderAvg;
        
        if (change < -0.05) {
          benchmark.trend = 'improving';
        } else if (change > 0.05) {
          benchmark.trend = 'degrading';
        } else {
          benchmark.trend = 'stable';
        }
      }
    }
  }

  private checkThresholds(metric: keyof CoreWebVitals, value: number): void {
    const threshold = this.thresholds[metric];
    if (!threshold) return;

    let severity: PerformanceAlert['severity'] = 'low';
    let alertType: PerformanceAlert['type'] = 'threshold_breach';

    if (value > threshold.poor) {
      severity = 'high';
    } else if (value > threshold.good) {
      severity = 'medium';
    } else {
      return; // Value is good, no alert needed
    }

    // Check for regression
    const benchmark = this.benchmarks.get(metric);
    if (benchmark && benchmark.trend === 'degrading') {
      alertType = 'regression';
      severity = severity === 'high' ? 'critical' : 'high';
    }

    const alert: PerformanceAlert = {
      id: this.generateId(),
      type: alertType,
      metric,
      currentValue: value,
      threshold: threshold.good,
      severity,
      timestamp: new Date(),
      url: window.location.href,
      description: this.getAlertDescription(metric, value, threshold)
    };

    this.triggerAlert(alert);
  }

  private getAlertDescription(metric: string, value: number, threshold: any): string {
    const metricNames = {
      lcp: 'Largest Contentful Paint',
      fid: 'First Input Delay',
      cls: 'Cumulative Layout Shift',
      fcp: 'First Contentful Paint',
      ttfb: 'Time to First Byte',
      inp: 'Interaction to Next Paint'
    };

    const name = metricNames[metric as keyof typeof metricNames] || metric.toUpperCase();
    const unit = ['cls'].includes(metric) ? '' : 'ms';
    
    return `${name} is ${value.toFixed(2)}${unit}, which exceeds the good threshold of ${threshold.good}${unit}`;
  }

  private triggerAlert(alert: PerformanceAlert): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    });

    // Send alert to monitoring service
    this.sendAlert(alert);
  }

  private async sendAlert(alert: PerformanceAlert): Promise<void> {
    try {
      await fetch('/api/performance/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert)
      });
    } catch (error) {
      console.error('Failed to send performance alert:', error);
    }
  }

  private generateId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public onAlert(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  public removeAlertCallback(callback: (alert: PerformanceAlert) => void): void {
    const index = this.alertCallbacks.indexOf(callback);
    if (index > -1) {
      this.alertCallbacks.splice(index, 1);
    }
  }

  public getCurrentVitals(): CoreWebVitals | null {
    return this.vitals ? { ...this.vitals } : null;
  }

  public getBenchmarks(): Map<string, PerformanceBenchmark> {
    return new Map(this.benchmarks);
  }

  public getVitalScore(metric: keyof CoreWebVitals): 'good' | 'needs-improvement' | 'poor' {
    if (!this.vitals) return 'poor';
    
    const value = this.vitals[metric];
    const threshold = this.thresholds[metric];
    
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  public getOverallScore(): number {
    if (!this.vitals) return 0;

    const scores = Object.keys(this.thresholds).map(metric => {
      const score = this.getVitalScore(metric as keyof CoreWebVitals);
      switch (score) {
        case 'good': return 100;
        case 'needs-improvement': return 50;
        case 'poor': return 0;
        default: return 0;
      }
    });

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  public exportData(): {
    vitals: CoreWebVitals | null;
    benchmarks: Array<[string, PerformanceBenchmark]>;
    timestamp: Date;
  } {
    return {
      vitals: this.vitals,
      benchmarks: Array.from(this.benchmarks.entries()),
      timestamp: new Date()
    };
  }
}

// Singleton instance
export const coreWebVitalsMonitor = new CoreWebVitalsMonitor();