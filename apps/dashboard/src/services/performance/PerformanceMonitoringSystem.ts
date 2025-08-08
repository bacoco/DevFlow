/**
 * Performance Monitoring System
 * Central coordinator for all performance monitoring activities
 */

import { RealUserMonitoring, rumInstance } from './RealUserMonitoring';
import { CoreWebVitalsMonitor, coreWebVitalsMonitor } from './CoreWebVitalsMonitor';
import { PerformanceBudgetManager, performanceBudgetManager } from './PerformanceBudgetManager';
import { PerformanceOptimizer, performanceOptimizer } from './PerformanceOptimizer';
import { 
  PerformanceConfig, 
  PerformanceAlert, 
  PerformanceRecommendation,
  PerformanceBenchmark,
  CoreWebVitals,
  PerformanceMetric
} from './types';

export class PerformanceMonitoringSystem {
  private config: PerformanceConfig;
  private alertCallbacks: Array<(alert: PerformanceAlert) => void> = [];
  private isInitialized = false;

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = {
      enableRUM: true,
      enableCoreWebVitals: true,
      enableBudgetChecks: true,
      enableAdaptiveStrategies: true,
      samplingRate: 0.1,
      alertThresholds: {
        lcp: 4000,
        fid: 300,
        cls: 0.25,
        fcp: 3000,
        ttfb: 1800
      },
      budgets: [],
      adaptiveStrategies: [],
      ...config
    };
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize monitoring components
      if (this.config.enableRUM) {
        this.initializeRUM();
      }

      if (this.config.enableCoreWebVitals) {
        this.initializeCoreWebVitals();
      }

      if (this.config.enableBudgetChecks) {
        this.initializeBudgetManager();
      }

      if (this.config.enableAdaptiveStrategies) {
        this.initializeAdaptiveStrategies();
      }

      // Set up cross-component communication
      this.setupEventHandlers();

      this.isInitialized = true;
      console.log('Performance Monitoring System initialized');
    } catch (error) {
      console.error('Failed to initialize Performance Monitoring System:', error);
    }
  }

  private initializeRUM(): void {
    // RUM is already initialized as singleton
    // Just configure it if needed
  }

  private initializeCoreWebVitals(): void {
    coreWebVitalsMonitor.onAlert((alert) => {
      this.handleAlert(alert);
    });
  }

  private initializeBudgetManager(): void {
    // Import budgets from config
    if (this.config.budgets.length > 0) {
      this.config.budgets.forEach(budget => {
        performanceBudgetManager.setBudget(budget);
      });
    }

    performanceBudgetManager.onBudgetViolation((alert) => {
      this.handleAlert(alert);
    });
  }

  private initializeAdaptiveStrategies(): void {
    // Apply adaptive strategies based on current conditions
    const deviceInfo = this.getDeviceInfo();
    const networkInfo = this.getNetworkInfo();
    
    const strategies = performanceOptimizer.getAdaptiveStrategy(deviceInfo, networkInfo);
    performanceOptimizer.applyAdaptiveStrategies(strategies);
  }

  private setupEventHandlers(): void {
    // Listen for performance events
    window.addEventListener('beforeunload', () => {
      this.flushAllData();
    });

    // Listen for visibility changes to pause/resume monitoring
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseMonitoring();
      } else {
        this.resumeMonitoring();
      }
    });

    // Listen for network changes to adapt strategies
    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener('change', () => {
        this.adaptToNetworkChange();
      });
    }
  }

  private handleAlert(alert: PerformanceAlert): void {
    // Trigger alert callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in performance alert callback:', error);
      }
    });

    // Send alert to monitoring service
    this.sendAlert(alert);

    // Generate recommendations based on alert
    if (alert.type === 'regression' || alert.severity === 'critical') {
      this.generateRecommendations();
    }
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

  private generateRecommendations(): void {
    const metrics = rumInstance.getMetrics();
    const recommendations = performanceOptimizer.analyzePerformance(metrics);
    
    if (recommendations.length > 0) {
      console.log('Generated performance recommendations:', recommendations);
      // Could trigger UI notification or send to analytics
    }
  }

  private adaptToNetworkChange(): void {
    const deviceInfo = this.getDeviceInfo();
    const networkInfo = this.getNetworkInfo();
    
    const strategies = performanceOptimizer.getAdaptiveStrategy(deviceInfo, networkInfo);
    performanceOptimizer.applyAdaptiveStrategies(strategies);
  }

  private pauseMonitoring(): void {
    // Pause expensive monitoring when page is hidden
    console.log('Pausing performance monitoring');
  }

  private resumeMonitoring(): void {
    // Resume monitoring when page becomes visible
    console.log('Resuming performance monitoring');
  }

  private flushAllData(): void {
    // Ensure all data is sent before page unload
    rumInstance.destroy();
  }

  private getDeviceInfo() {
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

  private getNetworkInfo() {
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

  // Public API methods

  public onAlert(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  public removeAlertCallback(callback: (alert: PerformanceAlert) => void): void {
    const index = this.alertCallbacks.indexOf(callback);
    if (index > -1) {
      this.alertCallbacks.splice(index, 1);
    }
  }

  public async getCurrentVitals(): Promise<CoreWebVitals | null> {
    return coreWebVitalsMonitor.getCurrentVitals();
  }

  public getBenchmarks(): Map<string, PerformanceBenchmark> {
    return coreWebVitalsMonitor.getBenchmarks();
  }

  public getRecommendations(): PerformanceRecommendation[] {
    return performanceOptimizer.getRecommendations();
  }

  public checkBudgets(metrics: Record<string, number>) {
    return performanceBudgetManager.checkMultipleMetrics(metrics);
  }

  public getMetrics(): PerformanceMetric[] {
    return rumInstance.getMetrics();
  }

  public generateReport(): {
    vitals: CoreWebVitals | null;
    benchmarks: Array<[string, PerformanceBenchmark]>;
    recommendations: PerformanceRecommendation[];
    budgetStatus: any;
    metrics: PerformanceMetric[];
    timestamp: Date;
  } {
    return {
      vitals: coreWebVitalsMonitor.getCurrentVitals(),
      benchmarks: Array.from(coreWebVitalsMonitor.getBenchmarks().entries()),
      recommendations: performanceOptimizer.getRecommendations(),
      budgetStatus: performanceBudgetManager.getBudgetStatus(),
      metrics: rumInstance.getMetrics(),
      timestamp: new Date()
    };
  }

  public updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize if needed
    if (this.isInitialized) {
      this.initialize();
    }
  }

  public getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  public destroy(): void {
    rumInstance.destroy();
    this.alertCallbacks = [];
    this.isInitialized = false;
  }
}

// Singleton instance
export const performanceMonitoringSystem = new PerformanceMonitoringSystem();

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  performanceMonitoringSystem.initialize();
}