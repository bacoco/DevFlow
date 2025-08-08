// Production integration utilities
// This file orchestrates all production optimizations and monitoring

import { getPerformanceMonitor } from './performance';
import { getAccessibilityAuditor } from './accessibility-audit';
import { getProductionMonitor } from './monitoring';

interface ProductionConfig {
  enablePerformanceMonitoring: boolean;
  enableAccessibilityAuditing: boolean;
  enableAnalytics: boolean;
  enableErrorTracking: boolean;
  environment: 'development' | 'staging' | 'production';
}

class ProductionIntegration {
  private config: ProductionConfig;
  private initialized = false;

  constructor() {
    this.config = {
      enablePerformanceMonitoring: process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true',
      enableAccessibilityAuditing: process.env.NODE_ENV !== 'production', // Only in dev/staging
      enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
      enableErrorTracking: process.env.NEXT_PUBLIC_ENABLE_ERROR_TRACKING === 'true',
      environment: (process.env.NEXT_PUBLIC_ENVIRONMENT as any) || 'development',
    };
  }

  async initialize() {
    if (this.initialized || typeof window === 'undefined') return;

    console.log('🚀 Initializing production systems...');

    try {
      // Initialize monitoring systems
      await this.initializeMonitoring();
      
      // Initialize performance tracking
      if (this.config.enablePerformanceMonitoring) {
        this.initializePerformanceTracking();
      }
      
      // Initialize accessibility auditing (dev/staging only)
      if (this.config.enableAccessibilityAuditing) {
        this.initializeAccessibilityAuditing();
      }
      
      // Set up error boundaries
      this.setupGlobalErrorHandling();
      
      // Initialize feature flags
      this.initializeFeatureFlags();
      
      this.initialized = true;
      console.log('✅ Production systems initialized successfully');
      
      // Report successful initialization
      this.reportInitialization();
      
    } catch (error) {
      console.error('❌ Failed to initialize production systems:', error);
      
      // Report initialization failure
      if (this.config.enableErrorTracking) {
        const monitor = getProductionMonitor();
        monitor.trackError(error as Error, {
          context: 'production_initialization',
          config: this.config,
        });
      }
    }
  }

  private async initializeMonitoring() {
    const monitor = getProductionMonitor();
    await monitor.initialize();
    
    // Track application startup
    monitor.trackEvent('app_startup', {
      environment: this.config.environment,
      timestamp: Date.now(),
      user_agent: navigator.userAgent,
      screen_resolution: `${screen.width}x${screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
    });
  }

  private initializePerformanceTracking() {
    const performanceMonitor = getPerformanceMonitor();
    const productionMonitor = getProductionMonitor();
    
    // Set up performance metric reporting
    const reportMetrics = () => {
      const metrics = performanceMonitor.getMetrics();
      
      // Report Core Web Vitals
      const lcp = performanceMonitor.getAverageMetric('LCP');
      const fid = performanceMonitor.getAverageMetric('FID');
      const cls = performanceMonitor.getAverageMetric('CLS');
      
      if (lcp > 0) productionMonitor.trackPerformanceMetric('LCP', lcp);
      if (fid > 0) productionMonitor.trackPerformanceMetric('FID', fid);
      if (cls > 0) productionMonitor.trackPerformanceMetric('CLS', cls);
      
      // Report custom metrics
      const bundleSize = performanceMonitor.getAverageMetric('bundle_size');
      const memoryUsage = performanceMonitor.getAverageMetric('memory_usage');
      
      if (bundleSize > 0) productionMonitor.trackPerformanceMetric('bundle_size', bundleSize, 'bytes');
      if (memoryUsage > 0) productionMonitor.trackPerformanceMetric('memory_usage', memoryUsage, 'bytes');
    };
    
    // Report metrics periodically
    setInterval(reportMetrics, 60000); // Every minute
    
    // Report metrics on page unload
    window.addEventListener('beforeunload', reportMetrics);
  }

  private initializeAccessibilityAuditing() {
    const auditor = getAccessibilityAuditor();
    const productionMonitor = getProductionMonitor();
    
    // Start continuous accessibility monitoring
    const stopMonitoring = auditor.startContinuousMonitoring(300000); // Every 5 minutes
    
    // Report accessibility metrics
    const reportAccessibility = () => {
      const reports = auditor.getReports();
      if (reports.length > 0) {
        const latestReport = reports[reports.length - 1];
        
        productionMonitor.trackEvent('accessibility_audit', {
          score: latestReport.score,
          violations: latestReport.violations.length,
          critical_issues: latestReport.violations.filter(v => v.impact === 'critical').length,
          serious_issues: latestReport.violations.filter(v => v.impact === 'serious').length,
        });
      }
    };
    
    // Report accessibility metrics periodically
    setInterval(reportAccessibility, 300000); // Every 5 minutes
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      stopMonitoring();
    });
  }

  private setupGlobalErrorHandling() {
    const productionMonitor = getProductionMonitor();
    
    // Enhanced error reporting
    window.addEventListener('error', (event) => {
      productionMonitor.trackError(event.error, {
        type: 'javascript_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        message: event.message,
        stack: event.error?.stack,
      });
    });
    
    // Promise rejection handling
    window.addEventListener('unhandledrejection', (event) => {
      productionMonitor.trackError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        {
          type: 'unhandled_promise_rejection',
          reason: String(event.reason),
        }
      );
    });
    
    // Network error handling
    window.addEventListener('offline', () => {
      productionMonitor.trackEvent('network_offline');
    });
    
    window.addEventListener('online', () => {
      productionMonitor.trackEvent('network_online');
    });
  }

  private initializeFeatureFlags() {
    // Simple feature flag system
    const featureFlags = {
      enableNewDashboard: this.config.environment === 'production',
      enableBetaFeatures: this.config.environment !== 'production',
      enableDebugMode: this.config.environment === 'development',
      enableA11yAuditing: this.config.enableAccessibilityAuditing,
      enablePerformanceMonitoring: this.config.enablePerformanceMonitoring,
    };
    
    // Store feature flags globally
    (window as any).__FEATURE_FLAGS__ = featureFlags;
    
    // Track feature flag configuration
    const productionMonitor = getProductionMonitor();
    productionMonitor.trackEvent('feature_flags_initialized', {
      flags: featureFlags,
    });
  }

  private reportInitialization() {
    const productionMonitor = getProductionMonitor();
    
    // Report system capabilities
    const capabilities = {
      webgl: this.checkWebGLSupport(),
      webworkers: typeof Worker !== 'undefined',
      serviceworker: 'serviceWorker' in navigator,
      indexeddb: 'indexedDB' in window,
      websockets: 'WebSocket' in window,
      performance_observer: 'PerformanceObserver' in window,
      intersection_observer: 'IntersectionObserver' in window,
    };
    
    productionMonitor.trackEvent('system_capabilities', capabilities);
    
    // Report browser information
    const browserInfo = {
      user_agent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookie_enabled: navigator.cookieEnabled,
      online: navigator.onLine,
    };
    
    productionMonitor.trackEvent('browser_info', browserInfo);
  }

  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch (e) {
      return false;
    }
  }

  // Public methods
  getConfig(): ProductionConfig {
    return { ...this.config };
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // Health check endpoint data
  getHealthStatus() {
    const performanceMonitor = getPerformanceMonitor();
    const accessibilityAuditor = getAccessibilityAuditor();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      initialized: this.initialized,
      performance: {
        metrics_count: performanceMonitor.getMetrics().length,
        average_lcp: performanceMonitor.getAverageMetric('LCP'),
        average_fid: performanceMonitor.getAverageMetric('FID'),
        average_cls: performanceMonitor.getAverageMetric('CLS'),
      },
      accessibility: {
        reports_count: accessibilityAuditor.getReports().length,
        average_score: accessibilityAuditor.getAverageScore(),
        critical_issues: accessibilityAuditor.getCriticalIssues().length,
      },
      features: (window as any).__FEATURE_FLAGS__ || {},
    };
  }
}

// Singleton instance
let productionIntegration: ProductionIntegration | null = null;

export function getProductionIntegration(): ProductionIntegration {
  if (!productionIntegration) {
    productionIntegration = new ProductionIntegration();
  }
  return productionIntegration;
}

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  const integration = getProductionIntegration();
  
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      integration.initialize();
    });
  } else {
    integration.initialize();
  }
}

// React hook for production integration
import { useEffect, useState } from 'react';

export function useProductionIntegration() {
  const [integration] = useState(() => getProductionIntegration());
  const [isReady, setIsReady] = useState(integration.isInitialized());

  useEffect(() => {
    if (!isReady) {
      integration.initialize().then(() => {
        setIsReady(true);
      });
    }
  }, [integration, isReady]);

  return {
    integration,
    isReady,
    config: integration.getConfig(),
    healthStatus: integration.getHealthStatus(),
  };
}