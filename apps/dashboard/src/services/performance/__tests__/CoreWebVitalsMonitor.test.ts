/**
 * Core Web Vitals Monitor Tests
 * Tests for Core Web Vitals monitoring and alerting
 */

import { CoreWebVitalsMonitor } from '../CoreWebVitalsMonitor';
import { PerformanceAlert } from '../types';

// Mock PerformanceObserver
class MockPerformanceObserver {
  private callback: (list: any) => void;
  
  constructor(callback: (list: any) => void) {
    this.callback = callback;
  }
  
  observe() {}
  disconnect() {}
  
  // Helper method to simulate entries
  simulateEntries(entries: any[]) {
    this.callback({
      getEntries: () => entries
    });
  }
}

global.PerformanceObserver = MockPerformanceObserver as any;

// Mock performance.getEntriesByType
Object.defineProperty(performance, 'getEntriesByType', {
  writable: true,
  value: jest.fn()
});

// Mock fetch
global.fetch = jest.fn();

describe('CoreWebVitalsMonitor', () => {
  let monitor: CoreWebVitalsMonitor;
  let mockAlertCallback: jest.Mock;

  beforeEach(() => {
    monitor = new CoreWebVitalsMonitor();
    mockAlertCallback = jest.fn();
    monitor.onAlert(mockAlertCallback);
    
    // Clear all mocks
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
    (performance.getEntriesByType as jest.Mock).mockClear();
  });

  describe('Initialization', () => {
    it('should initialize benchmarks for all metrics', () => {
      const benchmarks = monitor.getBenchmarks();
      
      expect(benchmarks.has('lcp')).toBe(true);
      expect(benchmarks.has('fid')).toBe(true);
      expect(benchmarks.has('cls')).toBe(true);
      expect(benchmarks.has('fcp')).toBe(true);
      expect(benchmarks.has('ttfb')).toBe(true);
      expect(benchmarks.has('inp')).toBe(true);
    });

    it('should set correct thresholds for each metric', () => {
      const benchmarks = monitor.getBenchmarks();
      
      expect(benchmarks.get('lcp')?.target).toBe(2500);
      expect(benchmarks.get('fid')?.target).toBe(100);
      expect(benchmarks.get('cls')?.target).toBe(0.1);
      expect(benchmarks.get('fcp')?.target).toBe(1800);
      expect(benchmarks.get('ttfb')?.target).toBe(800);
      expect(benchmarks.get('inp')?.target).toBe(200);
    });
  });

  describe('LCP Monitoring', () => {
    it('should update LCP value when observed', () => {
      const mockEntries = [
        { startTime: 2000 },
        { startTime: 2500 }
      ];

      // Simulate LCP observation
      const observer = new MockPerformanceObserver(() => {});
      (observer as any).simulateEntries = (entries: any[]) => {
        (monitor as any).updateVital('lcp', entries[entries.length - 1].startTime);
      };
      observer.simulateEntries(mockEntries);

      const vitals = monitor.getCurrentVitals();
      expect(vitals?.lcp).toBe(2500);
    });

    it('should trigger alert for poor LCP', () => {
      (monitor as any).updateVital('lcp', 5000);

      expect(mockAlertCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          metric: 'lcp',
          currentValue: 5000,
          severity: 'high'
        })
      );
    });
  });

  describe('FID Monitoring', () => {
    it('should calculate FID correctly', () => {
      const mockEntry = {
        processingStart: 150,
        startTime: 50
      };

      (monitor as any).updateVital('fid', mockEntry.processingStart - mockEntry.startTime);

      const vitals = monitor.getCurrentVitals();
      expect(vitals?.fid).toBe(100);
    });

    it('should trigger alert for poor FID', () => {
      (monitor as any).updateVital('fid', 400);

      expect(mockAlertCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          metric: 'fid',
          currentValue: 400,
          severity: 'high'
        })
      );
    });
  });

  describe('CLS Monitoring', () => {
    it('should accumulate CLS values correctly', () => {
      // Simulate multiple layout shifts
      (monitor as any).updateVital('cls', 0.05);
      (monitor as any).updateVital('cls', 0.08);
      (monitor as any).updateVital('cls', 0.12);

      const vitals = monitor.getCurrentVitals();
      expect(vitals?.cls).toBe(0.12); // Should use the highest value
    });

    it('should trigger alert for poor CLS', () => {
      (monitor as any).updateVital('cls', 0.3);

      expect(mockAlertCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          metric: 'cls',
          currentValue: 0.3,
          severity: 'high'
        })
      );
    });
  });

  describe('TTFB Monitoring', () => {
    it('should calculate TTFB from navigation timing', () => {
      const mockNavigation = {
        responseStart: 1000,
        requestStart: 200
      };

      (performance.getEntriesByType as jest.Mock).mockReturnValue([mockNavigation]);

      // Simulate load event
      window.dispatchEvent(new Event('load'));

      setTimeout(() => {
        const vitals = monitor.getCurrentVitals();
        expect(vitals?.ttfb).toBe(800);
      }, 10);
    });

    it('should trigger alert for poor TTFB', () => {
      (monitor as any).updateVital('ttfb', 2000);

      expect(mockAlertCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          metric: 'ttfb',
          currentValue: 2000,
          severity: 'high'
        })
      );
    });
  });

  describe('Benchmark Management', () => {
    it('should update benchmark history', () => {
      (monitor as any).updateVital('lcp', 2000);
      (monitor as any).updateVital('lcp', 2200);
      (monitor as any).updateVital('lcp', 1800);

      const benchmarks = monitor.getBenchmarks();
      const lcpBenchmark = benchmarks.get('lcp');

      expect(lcpBenchmark?.current).toBe(1800);
      expect(lcpBenchmark?.history.length).toBe(3);
    });

    it('should calculate trend correctly', () => {
      // Add enough data points to calculate trend
      for (let i = 0; i < 20; i++) {
        const value = i < 10 ? 2000 + i * 10 : 2100 - i * 5; // Improving trend
        (monitor as any).updateVital('lcp', value);
      }

      const benchmarks = monitor.getBenchmarks();
      const lcpBenchmark = benchmarks.get('lcp');

      expect(lcpBenchmark?.trend).toBe('improving');
    });

    it('should limit history to 100 entries', () => {
      // Add more than 100 entries
      for (let i = 0; i < 150; i++) {
        (monitor as any).updateVital('lcp', 2000 + i);
      }

      const benchmarks = monitor.getBenchmarks();
      const lcpBenchmark = benchmarks.get('lcp');

      expect(lcpBenchmark?.history.length).toBe(100);
    });
  });

  describe('Vital Scoring', () => {
    it('should score vitals correctly', () => {
      (monitor as any).updateVital('lcp', 2000);
      (monitor as any).updateVital('fid', 150);
      (monitor as any).updateVital('cls', 0.3);

      expect(monitor.getVitalScore('lcp')).toBe('good');
      expect(monitor.getVitalScore('fid')).toBe('needs-improvement');
      expect(monitor.getVitalScore('cls')).toBe('poor');
    });

    it('should calculate overall score correctly', () => {
      (monitor as any).updateVital('lcp', 2000); // good
      (monitor as any).updateVital('fid', 50);   // good
      (monitor as any).updateVital('cls', 0.15); // needs-improvement
      (monitor as any).updateVital('fcp', 1500); // good
      (monitor as any).updateVital('ttfb', 600); // good
      (monitor as any).updateVital('inp', 150);  // good

      const score = monitor.getOverallScore();
      expect(score).toBeGreaterThan(80); // Mostly good scores
    });
  });

  describe('Alert Management', () => {
    it('should send alerts to monitoring service', async () => {
      (fetch as jest.Mock).mockResolvedValue({ ok: true });

      (monitor as any).updateVital('lcp', 5000);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(fetch).toHaveBeenCalledWith('/api/performance/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('lcp')
      });
    });

    it('should handle alert sending errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      (monitor as any).updateVital('lcp', 5000);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(consoleSpy).toHaveBeenCalledWith('Failed to send performance alert:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should remove alert callbacks', () => {
      monitor.removeAlertCallback(mockAlertCallback);

      (monitor as any).updateVital('lcp', 5000);

      expect(mockAlertCallback).not.toHaveBeenCalled();
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      monitor.onAlert(errorCallback);
      (monitor as any).updateVital('lcp', 5000);

      expect(consoleSpy).toHaveBeenCalledWith('Error in alert callback:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Data Export', () => {
    it('should export data correctly', () => {
      (monitor as any).updateVital('lcp', 2500);
      (monitor as any).updateVital('fid', 100);

      const exportData = monitor.exportData();

      expect(exportData).toHaveProperty('vitals');
      expect(exportData).toHaveProperty('benchmarks');
      expect(exportData).toHaveProperty('timestamp');
      expect(exportData.vitals?.lcp).toBe(2500);
      expect(exportData.vitals?.fid).toBe(100);
      expect(exportData.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Alert Description Generation', () => {
    it('should generate correct alert descriptions', () => {
      const getAlertDescription = (monitor as any).getAlertDescription.bind(monitor);

      const lcpDescription = getAlertDescription('lcp', 3000, { good: 2500 });
      expect(lcpDescription).toContain('Largest Contentful Paint');
      expect(lcpDescription).toContain('3000');
      expect(lcpDescription).toContain('2500');

      const clsDescription = getAlertDescription('cls', 0.2, { good: 0.1 });
      expect(clsDescription).toContain('Cumulative Layout Shift');
      expect(clsDescription).toContain('0.20');
      expect(clsDescription).not.toContain('ms');
    });
  });
});