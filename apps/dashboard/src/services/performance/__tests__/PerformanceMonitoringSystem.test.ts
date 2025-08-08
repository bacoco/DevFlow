/**
 * Performance Monitoring System Tests
 * Tests for the main performance monitoring coordinator
 */

import { PerformanceMonitoringSystem } from '../PerformanceMonitoringSystem';
import { PerformanceAlert, PerformanceConfig } from '../types';

// Mock the singleton instances
jest.mock('../RealUserMonitoring', () => ({
  rumInstance: {
    getMetrics: jest.fn(() => []),
    destroy: jest.fn()
  }
}));

jest.mock('../CoreWebVitalsMonitor', () => ({
  coreWebVitalsMonitor: {
    onAlert: jest.fn(),
    getCurrentVitals: jest.fn(() => ({
      lcp: 2000,
      fid: 50,
      cls: 0.05,
      fcp: 1500,
      ttfb: 600,
      inp: 150
    })),
    getBenchmarks: jest.fn(() => new Map())
  }
}));

jest.mock('../PerformanceBudgetManager', () => ({
  performanceBudgetManager: {
    setBudget: jest.fn(),
    onBudgetViolation: jest.fn(),
    getBudgetStatus: jest.fn(() => ({
      totalBudgets: 5,
      activeBudgets: 5,
      recentViolations: 0,
      overallHealth: 'good'
    }))
  }
}));

jest.mock('../PerformanceOptimizer', () => ({
  performanceOptimizer: {
    getAdaptiveStrategy: jest.fn(() => []),
    applyAdaptiveStrategies: jest.fn(),
    getRecommendations: jest.fn(() => []),
    analyzePerformance: jest.fn(() => [])
  }
}));

// Mock fetch
global.fetch = jest.fn();

// Mock navigator
Object.defineProperty(navigator, 'hardwareConcurrency', {
  writable: true,
  value: 4
});

Object.defineProperty(navigator, 'connection', {
  writable: true,
  value: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    saveData: false,
    addEventListener: jest.fn()
  }
});

describe('PerformanceMonitoringSystem', () => {
  let system: PerformanceMonitoringSystem;
  let mockConfig: PerformanceConfig;

  beforeEach(() => {
    mockConfig = {
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
      adaptiveStrategies: []
    };

    system = new PerformanceMonitoringSystem(mockConfig);
    
    // Clear all mocks
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    system.destroy();
  });

  describe('Initialization', () => {
    it('should initialize successfully with default config', async () => {
      const defaultSystem = new PerformanceMonitoringSystem();
      await expect(defaultSystem.initialize()).resolves.not.toThrow();
      defaultSystem.destroy();
    });

    it('should initialize successfully with custom config', async () => {
      await expect(system.initialize()).resolves.not.toThrow();
    });

    it('should not reinitialize if already initialized', async () => {
      await system.initialize();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await system.initialize();
      
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      consoleSpy.mockRestore();
    });

    it('should handle initialization errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock an error during initialization
      const originalConnection = (navigator as any).connection;
      delete (navigator as any).connection;
      
      await system.initialize();
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      // Restore
      (navigator as any).connection = originalConnection;
      consoleSpy.mockRestore();
    });
  });

  describe('Alert Handling', () => {
    it('should register and trigger alert callbacks', async () => {
      const alertCallback = jest.fn();
      const mockAlert: PerformanceAlert = {
        id: 'test-alert',
        type: 'threshold_breach',
        metric: 'lcp',
        currentValue: 5000,
        threshold: 2500,
        severity: 'high',
        timestamp: new Date(),
        url: 'http://test.com',
        description: 'LCP exceeded threshold'
      };

      system.onAlert(alertCallback);
      await system.initialize();

      // Simulate alert
      const handleAlert = (system as any).handleAlert.bind(system);
      handleAlert(mockAlert);

      expect(alertCallback).toHaveBeenCalledWith(mockAlert);
    });

    it('should remove alert callbacks', async () => {
      const alertCallback = jest.fn();
      
      system.onAlert(alertCallback);
      system.removeAlertCallback(alertCallback);
      
      await system.initialize();

      // Simulate alert
      const mockAlert: PerformanceAlert = {
        id: 'test-alert',
        type: 'threshold_breach',
        metric: 'lcp',
        currentValue: 5000,
        threshold: 2500,
        severity: 'high',
        timestamp: new Date(),
        url: 'http://test.com',
        description: 'LCP exceeded threshold'
      };

      const handleAlert = (system as any).handleAlert.bind(system);
      handleAlert(mockAlert);

      expect(alertCallback).not.toHaveBeenCalled();
    });

    it('should send alerts to monitoring service', async () => {
      (fetch as jest.Mock).mockResolvedValue({ ok: true });
      
      await system.initialize();

      const mockAlert: PerformanceAlert = {
        id: 'test-alert',
        type: 'threshold_breach',
        metric: 'lcp',
        currentValue: 5000,
        threshold: 2500,
        severity: 'high',
        timestamp: new Date(),
        url: 'http://test.com',
        description: 'LCP exceeded threshold'
      };

      const handleAlert = (system as any).handleAlert.bind(system);
      await handleAlert(mockAlert);

      expect(fetch).toHaveBeenCalledWith('/api/performance/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockAlert)
      });
    });

    it('should handle alert sending errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await system.initialize();

      const mockAlert: PerformanceAlert = {
        id: 'test-alert',
        type: 'threshold_breach',
        metric: 'lcp',
        currentValue: 5000,
        threshold: 2500,
        severity: 'high',
        timestamp: new Date(),
        url: 'http://test.com',
        description: 'LCP exceeded threshold'
      };

      const handleAlert = (system as any).handleAlert.bind(system);
      await handleAlert(mockAlert);

      expect(consoleSpy).toHaveBeenCalledWith('Failed to send performance alert:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Data Retrieval', () => {
    beforeEach(async () => {
      await system.initialize();
    });

    it('should get current vitals', async () => {
      const vitals = await system.getCurrentVitals();
      
      expect(vitals).toEqual({
        lcp: 2000,
        fid: 50,
        cls: 0.05,
        fcp: 1500,
        ttfb: 600,
        inp: 150
      });
    });

    it('should get benchmarks', () => {
      const benchmarks = system.getBenchmarks();
      expect(benchmarks).toBeInstanceOf(Map);
    });

    it('should get recommendations', () => {
      const recommendations = system.getRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should get metrics', () => {
      const metrics = system.getMetrics();
      expect(Array.isArray(metrics)).toBe(true);
    });
  });

  describe('Budget Checking', () => {
    beforeEach(async () => {
      await system.initialize();
    });

    it('should check budgets for multiple metrics', () => {
      const mockMetrics = {
        lcp: 3000,
        fid: 150,
        cls: 0.15
      };

      const result = system.checkBudgets(mockMetrics);
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('results');
    });
  });

  describe('Report Generation', () => {
    beforeEach(async () => {
      await system.initialize();
    });

    it('should generate comprehensive report', () => {
      const report = system.generateReport();
      
      expect(report).toHaveProperty('vitals');
      expect(report).toHaveProperty('benchmarks');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('budgetStatus');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('timestamp');
      expect(report.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', async () => {
      const newConfig = { samplingRate: 0.2 };
      
      system.updateConfig(newConfig);
      const config = system.getConfig();
      
      expect(config.samplingRate).toBe(0.2);
    });

    it('should get current configuration', () => {
      const config = system.getConfig();
      
      expect(config).toEqual(mockConfig);
    });
  });

  describe('Lifecycle Management', () => {
    it('should handle page visibility changes', async () => {
      await system.initialize();
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Simulate page becoming hidden
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      
      expect(consoleSpy).toHaveBeenCalledWith('Pausing performance monitoring');
      
      // Simulate page becoming visible
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      
      expect(consoleSpy).toHaveBeenCalledWith('Resuming performance monitoring');
      
      consoleSpy.mockRestore();
    });

    it('should handle beforeunload event', async () => {
      await system.initialize();
      
      // Simulate beforeunload
      window.dispatchEvent(new Event('beforeunload'));
      
      // Should not throw
      expect(true).toBe(true);
    });

    it('should destroy cleanly', async () => {
      await system.initialize();
      
      expect(() => system.destroy()).not.toThrow();
    });
  });

  describe('Device and Network Detection', () => {
    it('should detect device type correctly', () => {
      const getDeviceType = (system as any).getDeviceType.bind(system);
      
      // Mock different window sizes
      Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
      expect(getDeviceType()).toBe('mobile');
      
      Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });
      expect(getDeviceType()).toBe('tablet');
      
      Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
      expect(getDeviceType()).toBe('desktop');
    });

    it('should get device info', () => {
      const getDeviceInfo = (system as any).getDeviceInfo.bind(system);
      const deviceInfo = getDeviceInfo();
      
      expect(deviceInfo).toHaveProperty('type');
      expect(deviceInfo).toHaveProperty('cores');
      expect(deviceInfo).toHaveProperty('platform');
      expect(deviceInfo).toHaveProperty('userAgent');
    });

    it('should get network info', () => {
      const getNetworkInfo = (system as any).getNetworkInfo.bind(system);
      const networkInfo = getNetworkInfo();
      
      expect(networkInfo).toHaveProperty('effectiveType');
      expect(networkInfo).toHaveProperty('downlink');
      expect(networkInfo).toHaveProperty('rtt');
      expect(networkInfo).toHaveProperty('saveData');
    });
  });
});