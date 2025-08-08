// Production monitoring and analytics utilities

interface MonitoringConfig {
  enableAnalytics: boolean;
  enableErrorTracking: boolean;
  enablePerformanceMonitoring: boolean;
  analyticsId?: string;
  sentryDsn?: string;
}

class ProductionMonitor {
  private config: MonitoringConfig;
  private initialized = false;

  constructor() {
    this.config = {
      enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
      enableErrorTracking: process.env.NEXT_PUBLIC_ENABLE_ERROR_TRACKING === 'true',
      enablePerformanceMonitoring: process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true',
      analyticsId: process.env.NEXT_PUBLIC_ANALYTICS_ID,
      sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    };
  }

  async initialize() {
    if (this.initialized || typeof window === 'undefined') return;

    try {
      // Initialize Google Analytics
      if (this.config.enableAnalytics && this.config.analyticsId) {
        await this.initializeAnalytics();
      }

      // Initialize error tracking
      if (this.config.enableErrorTracking) {
        await this.initializeErrorTracking();
      }

      // Initialize performance monitoring
      if (this.config.enablePerformanceMonitoring) {
        this.initializePerformanceMonitoring();
      }

      this.initialized = true;
      console.log('Production monitoring initialized');
    } catch (error) {
      console.error('Failed to initialize monitoring:', error);
    }
  }

  private async initializeAnalytics() {
    if (!this.config.analyticsId) return;

    // Load Google Analytics
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.config.analyticsId}`;
    document.head.appendChild(script);

    // Initialize gtag
    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) {
      (window as any).dataLayer.push(args);
    }
    (window as any).gtag = gtag;

    gtag('js', new Date());
    gtag('config', this.config.analyticsId, {
      page_title: document.title,
      page_location: window.location.href,
    });

    // Track page views
    this.trackPageView();
  }

  private async initializeErrorTracking() {
    // Error tracking is handled by Sentry configuration files
    // This method can be used for additional error tracking setup
    
    // Global error handler
    window.addEventListener('error', (event) => {
      this.trackError(event.error, {
        type: 'javascript_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(event.reason, {
        type: 'unhandled_promise_rejection',
      });
    });
  }

  private initializePerformanceMonitoring() {
    // Monitor Core Web Vitals
    this.monitorWebVitals();
    
    // Monitor resource loading
    this.monitorResourceLoading();
    
    // Monitor user interactions
    this.monitorUserInteractions();
  }

  private monitorWebVitals() {
    // This integrates with the performance monitoring utilities
    import('./performance').then(({ getPerformanceMonitor }) => {
      const monitor = getPerformanceMonitor();
      
      // The performance monitor handles Core Web Vitals automatically
      // We just need to ensure it's running
    });
  }

  private monitorResourceLoading() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            
            // Track slow resources
            if (resourceEntry.duration > 1000) {
              this.trackEvent('slow_resource', {
                resource_name: resourceEntry.name,
                duration: Math.round(resourceEntry.duration),
                size: resourceEntry.transferSize,
              });
            }
            
            // Track failed resources
            if (resourceEntry.transferSize === 0 && resourceEntry.duration > 0) {
              this.trackError(new Error('Resource failed to load'), {
                type: 'resource_error',
                resource: resourceEntry.name,
              });
            }
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['resource'] });
      } catch (e) {
        console.warn('Resource monitoring not supported');
      }
    }
  }

  private monitorUserInteractions() {
    // Track long tasks that block the main thread
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          if (entry.duration > 50) { // Tasks longer than 50ms
            this.trackEvent('long_task', {
              duration: Math.round(entry.duration),
              start_time: Math.round(entry.startTime),
            });
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.warn('Long task monitoring not supported');
      }
    }

    // Track user engagement
    let engagementStartTime = Date.now();
    let isEngaged = true;

    const trackEngagement = () => {
      if (isEngaged) {
        const engagementTime = Date.now() - engagementStartTime;
        this.trackEvent('user_engagement', {
          duration: Math.round(engagementTime / 1000), // in seconds
        });
      }
    };

    // Track when user becomes inactive
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        trackEngagement();
        isEngaged = false;
      } else {
        engagementStartTime = Date.now();
        isEngaged = true;
      }
    });

    // Track engagement on page unload
    window.addEventListener('beforeunload', trackEngagement);
  }

  // Public methods for tracking
  trackPageView(path?: string) {
    if (!this.config.enableAnalytics) return;

    const page = path || window.location.pathname;
    
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('config', this.config.analyticsId, {
        page_path: page,
        page_title: document.title,
      });
    }
  }

  trackEvent(eventName: string, parameters?: Record<string, any>) {
    if (!this.config.enableAnalytics) return;

    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventName, {
        ...parameters,
        timestamp: Date.now(),
      });
    }

    // Also send to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', eventName, parameters);
    }
  }

  trackError(error: Error, context?: Record<string, any>) {
    if (!this.config.enableErrorTracking) return;

    // Send to Sentry if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        extra: context,
      });
    }

    // Send to analytics
    this.trackEvent('error', {
      error_message: error.message,
      error_stack: error.stack,
      ...context,
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Tracked Error:', error, context);
    }
  }

  trackUserAction(action: string, category: string, label?: string, value?: number) {
    this.trackEvent('user_action', {
      action,
      category,
      label,
      value,
    });
  }

  trackPerformanceMetric(metricName: string, value: number, unit = 'ms') {
    this.trackEvent('performance_metric', {
      metric_name: metricName,
      metric_value: value,
      unit,
    });
  }

  trackFeatureUsage(featureName: string, context?: Record<string, any>) {
    this.trackEvent('feature_usage', {
      feature: featureName,
      ...context,
    });
  }

  // A/B testing support
  trackExperiment(experimentName: string, variant: string, context?: Record<string, any>) {
    this.trackEvent('experiment', {
      experiment_name: experimentName,
      variant,
      ...context,
    });
  }

  // Business metrics
  trackBusinessMetric(metricName: string, value: number, context?: Record<string, any>) {
    this.trackEvent('business_metric', {
      metric_name: metricName,
      metric_value: value,
      ...context,
    });
  }
}

// Singleton instance
let productionMonitor: ProductionMonitor | null = null;

export function getProductionMonitor(): ProductionMonitor {
  if (!productionMonitor) {
    productionMonitor = new ProductionMonitor();
  }
  return productionMonitor;
}

// React hook for component-level monitoring
import { useEffect } from 'react';

export function useMonitoring(componentName: string) {
  const monitor = getProductionMonitor();

  useEffect(() => {
    // Track component mount
    monitor.trackEvent('component_mount', {
      component: componentName,
    });

    return () => {
      // Track component unmount
      monitor.trackEvent('component_unmount', {
        component: componentName,
      });
    };
  }, [componentName, monitor]);

  return {
    trackEvent: monitor.trackEvent.bind(monitor),
    trackError: monitor.trackError.bind(monitor),
    trackUserAction: monitor.trackUserAction.bind(monitor),
    trackFeatureUsage: monitor.trackFeatureUsage.bind(monitor),
  };
}

// Initialize monitoring when module loads
if (typeof window !== 'undefined') {
  const monitor = getProductionMonitor();
  monitor.initialize();
}