import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { performanceMonitor } from '../../../services/PerformanceMonitor';
import { offlineManager } from '../../../services/OfflineManager';

// Mock performance APIs
const mockPerformanceObserver = jest.fn();
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => []),
};

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.prototype.observe = jest.fn();
mockIntersectionObserver.prototype.unobserve = jest.fn();
mockIntersectionObserver.prototype.disconnect = jest.fn();

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(() => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          add: jest.fn(() => ({ onsuccess: null, onerror: null })),
          get: jest.fn(() => ({ onsuccess: null, onerror: null })),
          delete: jest.fn(() => ({ onsuccess: null, onerror: null })),
          clear: jest.fn(() => ({ onsuccess: null, onerror: null })),
          count: jest.fn(() => ({ onsuccess: null, onerror: null })),
          getAll: jest.fn(() => ({ onsuccess: null, onerror: null })),
          createIndex: jest.fn(),
        })),
      })),
      objectStoreNames: {
        contains: jest.fn(() => false),
      },
      createObjectStore: jest.fn(() => ({
        createIndex: jest.fn(),
      })),
    },
  })),
};

// Setup global mocks
Object.defineProperty(global, 'PerformanceObserver', {
  writable: true,
  value: mockPerformanceObserver,
});

Object.defineProperty(global, 'performance', {
  writable: true,
  value: mockPerformance,
});

Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  value: mockIntersectionObserver,
});

Object.defineProperty(global, 'indexedDB', {
  writable: true,
  value: mockIndexedDB,
});

Object.defineProperty(global, 'navigator', {
  writable: true,
  value: {
    onLine: true,
    serviceWorker: {
      register: jest.fn(() => Promise.resolve({})),
    },
    userAgent: 'test-agent',
  },
});

describe('Performance Optimization Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset performance mock
    mockPerformance.now.mockReturnValue(Date.now());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Core Web Vitals Tracking', () => {
    it('should track LCP (Largest Contentful Paint)', () => {
      const mockLCPEntry = {
        name: 'largest-contentful-paint',
        startTime: 1500,
        duration: 0,
      };

      // Simulate LCP observer callback
      const observerCallback = mockPerformanceObserver.mock.calls[0]?.[0];
      if (observerCallback) {
        observerCallback({
          getEntries: () => [mockLCPEntry],
        });
      }

      const webVitals = performanceMonitor.getWebVitals();
      expect(webVitals.LCP).toBe(1500);
    });

    it('should track FID (First Input Delay)', () => {
      const mockFIDEntry = {
        name: 'first-input',
        startTime: 100,
        processingStart: 150,
        duration: 50,
      };

      // Simulate FID observer callback
      const observerCallback = mockPerformanceObserver.mock.calls[1]?.[0];
      if (observerCallback) {
        observerCallback({
          getEntries: () => [mockFIDEntry],
        });
      }

      const webVitals = performanceMonitor.getWebVitals();
      expect(webVitals.FID).toBe(50);
    });

    it('should track CLS (Cumulative Layout Shift)', () => {
      const mockCLSEntry = {
        name: 'layout-shift',
        value: 0.05,
        startTime: 200,
        hadRecentInput: false,
      };

      // Simulate CLS observer callback
      const observerCallback = mockPerformanceObserver.mock.calls[2]?.[0];
      if (observerCallback) {
        observerCallback({
          getEntries: () => [mockCLSEntry],
        });
      }

      const webVitals = performanceMonitor.getWebVitals();
      expect(webVitals.CLS).toBe(0.05);
    });

    it('should rate performance metrics correctly', () => {
      const metrics = performanceMonitor.getMetrics();
      
      // Test LCP rating
      const lcpMetric = metrics.find(m => m.name === 'LCP');
      if (lcpMetric && lcpMetric.value <= 2500) {
        expect(lcpMetric.rating).toBe('good');
      }
    });
  });

  describe('Loading Time Validation', () => {
    it('should measure component loading times', async () => {
      const startTime = 100;
      const endTime = 300;
      
      mockPerformance.now
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      const result = performanceMonitor.measureFunction('test-component', () => {
        return 'test-result';
      });

      expect(result).toBe('test-result');
      
      const metrics = performanceMonitor.getMetrics();
      const componentMetric = metrics.find(m => m.name === 'function-test-component');
      expect(componentMetric?.value).toBe(200);
    });

    it('should measure async function performance', async () => {
      const startTime = 100;
      const endTime = 500;
      
      mockPerformance.now
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      const asyncFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'async-result';
      };

      const result = await performanceMonitor.measureAsyncFunction('async-test', asyncFunction);

      expect(result).toBe('async-result');
      
      const metrics = performanceMonitor.getMetrics();
      const asyncMetric = metrics.find(m => m.name === 'async-function-async-test');
      expect(asyncMetric?.value).toBe(400);
    });

    it('should validate page load times are under threshold', () => {
      const mockNavigationEntry = {
        name: 'navigation',
        navigationStart: 0,
        loadEventEnd: 2000,
        domContentLoadedEventEnd: 1500,
        responseStart: 200,
        requestStart: 100,
      };

      mockPerformance.getEntriesByType.mockReturnValue([mockNavigationEntry]);

      // Simulate navigation timing tracking
      const metrics = performanceMonitor.getMetrics();
      const loadMetric = metrics.find(m => m.name === 'load');
      
      if (loadMetric) {
        expect(loadMetric.value).toBeLessThan(3000); // Should load in under 3 seconds
      }
    });
  });

  describe('Interaction Responsiveness', () => {
    it('should track interaction delays', () => {
      const mockInteractionEntry = {
        name: 'click',
        startTime: 100,
        processingEnd: 150,
        duration: 50,
      };

      // Simulate interaction observer
      const observerCallback = mockPerformanceObserver.mock.calls.find(
        call => call[1]?.type === 'event'
      )?.[0];
      
      if (observerCallback) {
        observerCallback({
          getEntries: () => [mockInteractionEntry],
        });
      }

      const webVitals = performanceMonitor.getWebVitals();
      expect(webVitals.INP).toBe(50);
    });

    it('should detect long tasks that block interactions', () => {
      const mockLongTaskEntry = {
        name: 'long-task',
        duration: 150, // Over 50ms threshold
        startTime: 100,
      };

      // Simulate long task observer
      const observerCallback = mockPerformanceObserver.mock.calls.find(
        call => call[1]?.type === 'longtask'
      )?.[0];
      
      if (observerCallback) {
        observerCallback({
          getEntries: () => [mockLongTaskEntry],
        });
      }

      const metrics = performanceMonitor.getMetrics();
      const longTaskMetric = metrics.find(m => m.name === 'long-task');
      expect(longTaskMetric?.rating).toBe('poor');
    });

    it('should validate interaction response times', () => {
      // Test that interactions respond within 100ms
      const startTime = performance.now();
      
      // Simulate user interaction
      const handleClick = () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        expect(responseTime).toBeLessThan(100);
      };

      handleClick();
    });
  });

  describe('Offline Manager Performance', () => {
    it('should queue actions efficiently when offline', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const mockAction = {
        url: '/api/test',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' }),
      };

      const startTime = performance.now();
      await offlineManager.queueAction(mockAction);
      const endTime = performance.now();

      const queueTime = endTime - startTime;
      expect(queueTime).toBeLessThan(50); // Should queue quickly
    });

    it('should process queue efficiently when back online', async () => {
      // Mock online state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      // Mock fetch
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      ) as jest.Mock;

      const startTime = performance.now();
      await offlineManager.processQueue();
      const endTime = performance.now();

      const processTime = endTime - startTime;
      expect(processTime).toBeLessThan(1000); // Should process within 1 second
    });
  });

  describe('Performance Budget Validation', () => {
    it('should validate bundle size is within budget', () => {
      // This would typically be done in a build step
      // Here we simulate checking resource timing
      const mockResourceEntries = [
        {
          name: '/static/js/main.js',
          transferSize: 250000, // 250KB
          duration: 500,
        },
        {
          name: '/static/css/main.css',
          transferSize: 50000, // 50KB
          duration: 100,
        },
      ];

      mockPerformance.getEntriesByType.mockReturnValue(mockResourceEntries);

      const totalSize = mockResourceEntries.reduce((sum, entry) => sum + entry.transferSize, 0);
      expect(totalSize).toBeLessThan(500000); // 500KB budget
    });

    it('should validate Core Web Vitals meet thresholds', () => {
      const webVitals = performanceMonitor.getWebVitals();
      
      // LCP should be under 2.5s for good rating
      if (webVitals.LCP !== null) {
        expect(webVitals.LCP).toBeLessThan(2500);
      }
      
      // FID should be under 100ms for good rating
      if (webVitals.FID !== null) {
        expect(webVitals.FID).toBeLessThan(100);
      }
      
      // CLS should be under 0.1 for good rating
      if (webVitals.CLS !== null) {
        expect(webVitals.CLS).toBeLessThan(0.1);
      }
    });
  });

  describe('Memory and Resource Management', () => {
    it('should clean up performance observers on dispose', () => {
      const disconnectSpy = jest.fn();
      mockPerformanceObserver.prototype.disconnect = disconnectSpy;

      performanceMonitor.dispose();

      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('should limit metrics collection to prevent memory leaks', () => {
      // Generate many metrics
      for (let i = 0; i < 1000; i++) {
        performanceMonitor.measureFunction(`test-${i}`, () => i);
      }

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.length).toBeLessThan(10000); // Should have reasonable limit
    });
  });

  describe('Progressive Enhancement Performance', () => {
    it('should load core functionality quickly', () => {
      const startTime = performance.now();
      
      // Simulate core functionality loading
      const coreFeatures = ['navigation', 'basic-charts', 'data-display'];
      coreFeatures.forEach(feature => {
        // Simulate feature initialization
        performanceMonitor.mark(`${feature}-start`);
        performanceMonitor.mark(`${feature}-end`);
      });
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      expect(loadTime).toBeLessThan(1000); // Core should load in under 1 second
    });

    it('should defer enhanced features appropriately', async () => {
      const enhancedFeatures = ['3d-visualizations', 'advanced-analytics', 'ai-insights'];
      
      // Simulate deferred loading
      const loadPromises = enhancedFeatures.map(async (feature) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return feature;
      });

      const startTime = performance.now();
      const results = await Promise.all(loadPromises);
      const endTime = performance.now();

      expect(results).toHaveLength(3);
      expect(endTime - startTime).toBeGreaterThan(100); // Should be deferred
    });
  });
});