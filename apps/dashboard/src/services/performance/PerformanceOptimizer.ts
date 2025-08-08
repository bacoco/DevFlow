/**
 * Performance Optimizer
 * Provides optimization recommendations based on usage patterns
 */

import { 
  PerformanceRecommendation, 
  PerformanceMetric, 
  DeviceInfo, 
  NetworkInfo,
  AdaptiveStrategy 
} from './types';

export class PerformanceOptimizer {
  private recommendations: PerformanceRecommendation[] = [];
  private usagePatterns: Map<string, any> = new Map();
  private adaptiveStrategies: Map<string, AdaptiveStrategy> = new Map();

  constructor() {
    this.initializeAdaptiveStrategies();
  }

  private initializeAdaptiveStrategies(): void {
    const strategies: AdaptiveStrategy[] = [
      {
        condition: 'connection.effectiveType === "2g" || connection.effectiveType === "slow-2g"',
        strategy: 'reduce_image_quality',
        parameters: { quality: 0.6, format: 'webp' },
        enabled: true
      },
      {
        condition: 'device.memory && device.memory < 4',
        strategy: 'limit_concurrent_requests',
        parameters: { maxConcurrent: 3 },
        enabled: true
      },
      {
        condition: 'device.type === "mobile"',
        strategy: 'enable_lazy_loading',
        parameters: { threshold: '50px', rootMargin: '100px' },
        enabled: true
      },
      {
        condition: 'connection.saveData === true',
        strategy: 'data_saver_mode',
        parameters: { 
          disableAnimations: true, 
          reduceImageQuality: true,
          limitChartComplexity: true 
        },
        enabled: true
      },
      {
        condition: 'performance.now() > 10000', // Page has been open for 10+ seconds
        strategy: 'preload_likely_next_pages',
        parameters: { confidence: 0.7 },
        enabled: true
      }
    ];

    strategies.forEach(strategy => {
      this.adaptiveStrategies.set(strategy.strategy, strategy);
    });
  }

  public analyzePerformance(metrics: PerformanceMetric[]): PerformanceRecommendation[] {
    this.recommendations = [];
    
    this.analyzeLoadingPerformance(metrics);
    this.analyzeRuntimePerformance(metrics);
    this.analyzeResourceUsage(metrics);
    this.analyzeUserInteractions(metrics);
    this.analyzeNetworkPatterns(metrics);

    return this.recommendations;
  }

  private analyzeLoadingPerformance(metrics: PerformanceMetric[]): void {
    const lcpMetrics = metrics.filter(m => m.name === 'lcp');
    const fcpMetrics = metrics.filter(m => m.name === 'fcp');
    const ttfbMetrics = metrics.filter(m => m.name === 'ttfb');

    // Analyze LCP
    if (lcpMetrics.length > 0) {
      const avgLCP = lcpMetrics.reduce((sum, m) => sum + m.value, 0) / lcpMetrics.length;
      
      if (avgLCP > 4000) {
        this.recommendations.push({
          id: this.generateId(),
          type: 'optimization',
          priority: 'high',
          title: 'Optimize Largest Contentful Paint',
          description: `LCP is ${avgLCP.toFixed(0)}ms, which is poor. Users expect content to load within 2.5s.`,
          impact: 'Improving LCP will significantly enhance perceived loading performance',
          effort: 'medium',
          implementation: 'Optimize images, implement lazy loading, reduce server response times, and eliminate render-blocking resources',
          basedOnPattern: 'slow_lcp_pattern'
        });
      }
    }

    // Analyze TTFB
    if (ttfbMetrics.length > 0) {
      const avgTTFB = ttfbMetrics.reduce((sum, m) => sum + m.value, 0) / ttfbMetrics.length;
      
      if (avgTTFB > 800) {
        this.recommendations.push({
          id: this.generateId(),
          type: 'configuration',
          priority: 'high',
          title: 'Improve Server Response Time',
          description: `TTFB is ${avgTTFB.toFixed(0)}ms. Server should respond within 600ms.`,
          impact: 'Faster server responses improve all loading metrics',
          effort: 'high',
          implementation: 'Optimize database queries, implement caching, use CDN, upgrade server infrastructure',
          basedOnPattern: 'slow_server_response'
        });
      }
    }
  }

  private analyzeRuntimePerformance(metrics: PerformanceMetric[]): void {
    const fidMetrics = metrics.filter(m => m.name === 'fid');
    const inpMetrics = metrics.filter(m => m.name === 'inp');
    const clsMetrics = metrics.filter(m => m.name === 'cls');

    // Analyze FID/INP
    const interactionMetrics = [...fidMetrics, ...inpMetrics];
    if (interactionMetrics.length > 0) {
      const avgInteractionDelay = interactionMetrics.reduce((sum, m) => sum + m.value, 0) / interactionMetrics.length;
      
      if (avgInteractionDelay > 200) {
        this.recommendations.push({
          id: this.generateId(),
          type: 'optimization',
          priority: 'medium',
          title: 'Reduce Input Delay',
          description: `Average input delay is ${avgInteractionDelay.toFixed(0)}ms. Target is under 100ms.`,
          impact: 'Better responsiveness improves user experience and engagement',
          effort: 'medium',
          implementation: 'Break up long tasks, use web workers, optimize JavaScript execution, implement code splitting',
          basedOnPattern: 'slow_interaction_response'
        });
      }
    }

    // Analyze CLS
    if (clsMetrics.length > 0) {
      const avgCLS = clsMetrics.reduce((sum, m) => sum + m.value, 0) / clsMetrics.length;
      
      if (avgCLS > 0.1) {
        this.recommendations.push({
          id: this.generateId(),
          type: 'optimization',
          priority: 'medium',
          title: 'Reduce Layout Shifts',
          description: `CLS score is ${avgCLS.toFixed(3)}. Target is under 0.1 for good user experience.`,
          impact: 'Stable layouts prevent user frustration and improve usability',
          effort: 'low',
          implementation: 'Set dimensions for images and videos, reserve space for dynamic content, use CSS transforms for animations',
          basedOnPattern: 'layout_instability'
        });
      }
    }
  }

  private analyzeResourceUsage(metrics: PerformanceMetric[]): void {
    const resourceMetrics = metrics.filter(m => m.name === 'resource_timing');
    
    if (resourceMetrics.length > 0) {
      // Group by resource type
      const slowResources = resourceMetrics.filter(m => m.value > 1000);
      
      if (slowResources.length > 0) {
        this.recommendations.push({
          id: this.generateId(),
          type: 'resource',
          priority: 'medium',
          title: 'Optimize Slow Resources',
          description: `${slowResources.length} resources are loading slowly (>1s). This impacts overall page performance.`,
          impact: 'Faster resource loading improves page load times and user experience',
          effort: 'medium',
          implementation: 'Compress images, minify CSS/JS, use CDN, implement resource hints (preload, prefetch)',
          basedOnPattern: 'slow_resource_loading'
        });
      }
    }
  }

  private analyzeUserInteractions(metrics: PerformanceMetric[]): void {
    const userTimingMetrics = metrics.filter(m => m.name.startsWith('user_timing_'));
    
    // Analyze custom performance marks
    const slowOperations = userTimingMetrics.filter(m => m.value > 500);
    
    if (slowOperations.length > 0) {
      this.recommendations.push({
        id: this.generateId(),
        type: 'optimization',
        priority: 'medium',
        title: 'Optimize Slow Operations',
        description: `${slowOperations.length} custom operations are taking longer than 500ms.`,
        impact: 'Optimizing slow operations improves perceived performance',
        effort: 'medium',
        implementation: 'Profile slow operations, implement caching, use virtualization for large lists, optimize algorithms',
        basedOnPattern: 'slow_custom_operations'
      });
    }
  }

  private analyzeNetworkPatterns(metrics: PerformanceMetric[]): void {
    // Analyze network conditions from metrics
    const networkConditions = metrics.map(m => m.networkInfo).filter(Boolean);
    
    if (networkConditions.length > 0) {
      const slowConnections = networkConditions.filter(n => 
        n.effectiveType === '2g' || n.effectiveType === 'slow-2g'
      ).length;
      
      const slowConnectionRatio = slowConnections / networkConditions.length;
      
      if (slowConnectionRatio > 0.2) {
        this.recommendations.push({
          id: this.generateId(),
          type: 'optimization',
          priority: 'high',
          title: 'Optimize for Slow Networks',
          description: `${(slowConnectionRatio * 100).toFixed(1)}% of users have slow network connections.`,
          impact: 'Better performance on slow networks improves accessibility and user retention',
          effort: 'high',
          implementation: 'Implement adaptive loading, reduce bundle sizes, use service workers for caching, enable compression',
          basedOnPattern: 'slow_network_usage'
        });
      }
    }
  }

  public getAdaptiveStrategy(deviceInfo: DeviceInfo, networkInfo: NetworkInfo): AdaptiveStrategy[] {
    const applicableStrategies: AdaptiveStrategy[] = [];
    
    this.adaptiveStrategies.forEach(strategy => {
      if (strategy.enabled && this.evaluateCondition(strategy.condition, { device: deviceInfo, connection: networkInfo })) {
        applicableStrategies.push(strategy);
      }
    });

    return applicableStrategies;
  }

  private evaluateCondition(condition: string, context: any): boolean {
    try {
      // Simple condition evaluation - in production, use a proper expression evaluator
      const func = new Function('device', 'connection', 'performance', `return ${condition}`);
      return func(context.device, context.connection, performance);
    } catch (error) {
      console.warn('Failed to evaluate adaptive strategy condition:', condition, error);
      return false;
    }
  }

  public applyAdaptiveStrategies(strategies: AdaptiveStrategy[]): void {
    strategies.forEach(strategy => {
      switch (strategy.strategy) {
        case 'reduce_image_quality':
          this.applyImageQualityReduction(strategy.parameters);
          break;
        case 'limit_concurrent_requests':
          this.applyRequestLimiting(strategy.parameters);
          break;
        case 'enable_lazy_loading':
          this.applyLazyLoading(strategy.parameters);
          break;
        case 'data_saver_mode':
          this.applyDataSaverMode(strategy.parameters);
          break;
        case 'preload_likely_next_pages':
          this.applyPagePreloading(strategy.parameters);
          break;
      }
    });
  }

  private applyImageQualityReduction(params: any): void {
    // Implement image quality reduction
    const images = document.querySelectorAll('img[data-adaptive]');
    images.forEach((img: any) => {
      if (img.dataset.originalSrc) {
        const url = new URL(img.dataset.originalSrc);
        url.searchParams.set('quality', params.quality);
        url.searchParams.set('format', params.format);
        img.src = url.toString();
      }
    });
  }

  private applyRequestLimiting(params: any): void {
    // Implement request limiting logic
    if (window.fetch) {
      const originalFetch = window.fetch;
      let activeRequests = 0;
      const requestQueue: Array<() => void> = [];

      window.fetch = function(...args) {
        return new Promise((resolve, reject) => {
          const executeRequest = () => {
            activeRequests++;
            originalFetch.apply(this, args)
              .then(resolve)
              .catch(reject)
              .finally(() => {
                activeRequests--;
                if (requestQueue.length > 0) {
                  const nextRequest = requestQueue.shift();
                  nextRequest?.();
                }
              });
          };

          if (activeRequests < params.maxConcurrent) {
            executeRequest();
          } else {
            requestQueue.push(executeRequest);
          }
        });
      };
    }
  }

  private applyLazyLoading(params: any): void {
    // Implement lazy loading for images and components
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            if (element.dataset.src) {
              (element as HTMLImageElement).src = element.dataset.src;
              element.removeAttribute('data-src');
              observer.unobserve(element);
            }
          }
        });
      }, {
        threshold: 0,
        rootMargin: params.rootMargin
      });

      document.querySelectorAll('[data-src]').forEach(el => observer.observe(el));
    }
  }

  private applyDataSaverMode(params: any): void {
    // Apply data saver optimizations
    if (params.disableAnimations) {
      document.documentElement.style.setProperty('--animation-duration', '0s');
    }
    
    if (params.reduceImageQuality) {
      this.applyImageQualityReduction({ quality: 0.5, format: 'webp' });
    }
    
    if (params.limitChartComplexity) {
      // Signal to chart components to reduce complexity
      window.dispatchEvent(new CustomEvent('data-saver-mode', { detail: params }));
    }
  }

  private applyPagePreloading(params: any): void {
    // Implement intelligent page preloading
    const links = document.querySelectorAll('a[href]');
    const linkHoverTimes = new Map();

    links.forEach(link => {
      link.addEventListener('mouseenter', () => {
        linkHoverTimes.set(link, Date.now());
      });

      link.addEventListener('mouseleave', () => {
        const hoverTime = Date.now() - (linkHoverTimes.get(link) || 0);
        if (hoverTime > 200) { // User showed interest
          const href = (link as HTMLAnchorElement).href;
          if (href && !document.querySelector(`link[rel="prefetch"][href="${href}"]`)) {
            const prefetchLink = document.createElement('link');
            prefetchLink.rel = 'prefetch';
            prefetchLink.href = href;
            document.head.appendChild(prefetchLink);
          }
        }
      });
    });
  }

  public trackUsagePattern(pattern: string, data: any): void {
    this.usagePatterns.set(pattern, {
      ...this.usagePatterns.get(pattern),
      ...data,
      lastUpdated: new Date()
    });
  }

  public getRecommendations(): PerformanceRecommendation[] {
    return [...this.recommendations];
  }

  public clearRecommendations(): void {
    this.recommendations = [];
  }

  private generateId(): string {
    return `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public exportOptimizationReport(): {
    recommendations: PerformanceRecommendation[];
    adaptiveStrategies: AdaptiveStrategy[];
    usagePatterns: Array<[string, any]>;
    timestamp: Date;
  } {
    return {
      recommendations: this.recommendations,
      adaptiveStrategies: Array.from(this.adaptiveStrategies.values()),
      usagePatterns: Array.from(this.usagePatterns.entries()),
      timestamp: new Date()
    };
  }
}

// Singleton instance
export const performanceOptimizer = new PerformanceOptimizer();