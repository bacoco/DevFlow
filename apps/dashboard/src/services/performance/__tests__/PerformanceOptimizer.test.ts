/**
 * Performance Optimizer Tests
 * Tests for performance optimization recommendations and adaptive strategies
 */

import { PerformanceOptimizer } from '../PerformanceOptimizer';
import { PerformanceMetric, DeviceInfo, NetworkInfo } from '../types';

// Mock DOM methods
Object.defineProperty(document, 'querySelectorAll', {
  writable: true,
  value: jest.fn(() => [])
});

Object.defineProperty(document, 'querySelector', {
  writable: true,
  value: jest.fn(() => null)
});

Object.defineProperty(document, 'createElement', {
  writable: true,
  value: jest.fn(() => ({
    rel: '',
    href: '',
    style: { setProperty: jest.fn() }
  }))
});

Object.defineProperty(document, 'head', {
  writable: true,
  value: { appendChild: jest.fn() }
});

Object.defineProperty(document, 'documentElement', {
  writable: true,
  value: { style: { setProperty: jest.fn() } }
});

// Mock window methods
Object.defineProperty(window, 'dispatchEvent', {
  writable: true,
  value: jest.fn()
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

describe('PerformanceOptimizer', () => {
  let optimizer: PerformanceOptimizer;
  let mockMetrics: PerformanceMetric[];
  let mockDeviceInfo: DeviceInfo;
  let mockNetworkInfo: NetworkInfo;

  beforeEach(() => {
    optimizer = new PerformanceOptimizer();
    
    mockDeviceInfo = {
      type: 'desktop',
      memory: 8,
      cores: 4,
      connection: '4g',
      platform: 'MacIntel',
      userAgent: 'Mozilla/5.0...'
    };

    mockNetworkInfo = {
      effectiveType: '4g',
      downlink: 10,
      rtt: 100,
      saveData: false
    };

    mockMetrics = [
      {
        id: '1',
        name: 'lcp',
        value: 3000,
        timestamp: new Date(),
        url: 'http://test.com',
        sessionId: 'session1',
        deviceInfo: mockDeviceInfo,
        networkInfo: mockNetworkInfo
      },
      {
        id: '2',
        name: 'fid',
        value: 250,
        timestamp: new Date(),
        url: 'http://test.com',
        sessionId: 'session1',
        deviceInfo: mockDeviceInfo,
        networkInfo: mockNetworkInfo
      }
    ];

    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default adaptive strategies', () => {
      const strategies = (optimizer as any).adaptiveStrategies;
      
      expect(strategies.has('reduce_image_quality')).toBe(true);
      expect(strategies.has('limit_concurrent_requests')).toBe(true);
      expect(strategies.has('enable_lazy_loading')).toBe(true);
      expect(strategies.has('data_saver_mode')).toBe(true);
      expect(strategies.has('preload_likely_next_pages')).toBe(true);
    });
  });

  describe('Performance Analysis', () => {
    it('should analyze loading performance and generate recommendations', () => {
      const slowLCPMetrics = [
        {
          ...mockMetrics[0],
          name: 'lcp',
          value: 5000
        }
      ];

      const recommendations = optimizer.analyzePerformance(slowLCPMetrics);
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.title.includes('Largest Contentful Paint'))).toBe(true);
    });

    it('should analyze TTFB and recommend server optimizations', () => {
      const slowTTFBMetrics = [
        {
          ...mockMetrics[0],
          name: 'ttfb',
          value: 1200
        }
      ];

      const recommendations = optimizer.analyzePerformance(slowTTFBMetrics);
      
      expect(recommendations.some(r => r.title.includes('Server Response Time'))).toBe(true);
    });

    it('should analyze runtime performance', () => {
      const slowFIDMetrics = [
        {
          ...mockMetrics[0],
          name: 'fid',
          value: 300
        }
      ];

      const recommendations = optimizer.analyzePerformance(slowFIDMetrics);
      
      expect(recommendations.some(r => r.title.includes('Input Delay'))).toBe(true);
    });

    it('should analyze CLS issues', () => {
      const highCLSMetrics = [
        {
          ...mockMetrics[0],
          name: 'cls',
          value: 0.2
        }
      ];

      const recommendations = optimizer.analyzePerformance(highCLSMetrics);
      
      expect(recommendations.some(r => r.title.includes('Layout Shifts'))).toBe(true);
    });

    it('should analyze resource usage', () => {
      const slowResourceMetrics = [
        {
          ...mockMetrics[0],
          name: 'resource_timing',
          value: 1500
        }
      ];

      const recommendations = optimizer.analyzePerformance(slowResourceMetrics);
      
      expect(recommendations.some(r => r.title.includes('Slow Resources'))).toBe(true);
    });

    it('should analyze network patterns', () => {
      const slowNetworkMetrics = mockMetrics.map(m => ({
        ...m,
        networkInfo: {
          ...m.networkInfo,
          effectiveType: '2g' as const
        }
      }));

      const recommendations = optimizer.analyzePerformance(slowNetworkMetrics);
      
      expect(recommendations.some(r => r.title.includes('Slow Networks'))).toBe(true);
    });
  });

  describe('Adaptive Strategies', () => {
    it('should get applicable strategies for mobile device', () => {
      const mobileDevice: DeviceInfo = {
        ...mockDeviceInfo,
        type: 'mobile'
      };

      const strategies = optimizer.getAdaptiveStrategy(mobileDevice, mockNetworkInfo);
      
      expect(strategies.some(s => s.strategy === 'enable_lazy_loading')).toBe(true);
    });

    it('should get applicable strategies for slow network', () => {
      const slowNetwork: NetworkInfo = {
        ...mockNetworkInfo,
        effectiveType: '2g'
      };

      const strategies = optimizer.getAdaptiveStrategy(mockDeviceInfo, slowNetwork);
      
      expect(strategies.some(s => s.strategy === 'reduce_image_quality')).toBe(true);
    });

    it('should get applicable strategies for low memory device', () => {
      const lowMemoryDevice: DeviceInfo = {
        ...mockDeviceInfo,
        memory: 2
      };

      const strategies = optimizer.getAdaptiveStrategy(lowMemoryDevice, mockNetworkInfo);
      
      expect(strategies.some(s => s.strategy === 'limit_concurrent_requests')).toBe(true);
    });

    it('should get applicable strategies for data saver mode', () => {
      const dataSaverNetwork: NetworkInfo = {
        ...mockNetworkInfo,
        saveData: true
      };

      const strategies = optimizer.getAdaptiveStrategy(mockDeviceInfo, dataSaverNetwork);
      
      expect(strategies.some(s => s.strategy === 'data_saver_mode')).toBe(true);
    });
  });

  describe('Strategy Application', () => {
    it('should apply image quality reduction strategy', () => {
      const mockImages = [
        {
          dataset: { originalSrc: 'http://example.com/image.jpg' },
          src: ''
        }
      ];
      
      (document.querySelectorAll as jest.Mock).mockReturnValue(mockImages);

      const strategy = {
        condition: '',
        strategy: 'reduce_image_quality',
        parameters: { quality: 0.6, format: 'webp' },
        enabled: true
      };

      optimizer.applyAdaptiveStrategies([strategy]);

      expect(mockImages[0].src).toContain('quality=0.6');
      expect(mockImages[0].src).toContain('format=webp');
    });

    it('should apply lazy loading strategy', () => {
      const mockElements = [
        { dataset: { src: 'http://example.com/image.jpg' } }
      ];
      
      (document.querySelectorAll as jest.Mock).mockReturnValue(mockElements);

      const strategy = {
        condition: '',
        strategy: 'enable_lazy_loading',
        parameters: { threshold: '50px', rootMargin: '100px' },
        enabled: true
      };

      optimizer.applyAdaptiveStrategies([strategy]);

      expect(IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          threshold: 0,
          rootMargin: '100px'
        })
      );
    });

    it('should apply data saver mode strategy', () => {
      const strategy = {
        condition: '',
        strategy: 'data_saver_mode',
        parameters: { 
          disableAnimations: true,
          reduceImageQuality: true,
          limitChartComplexity: true
        },
        enabled: true
      };

      optimizer.applyAdaptiveStrategies([strategy]);

      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--animation-duration', '0s');
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'data-saver-mode'
        })
      );
    });

    it('should apply page preloading strategy', () => {
      const mockLinks = [
        {
          href: 'http://example.com/page1',
          addEventListener: jest.fn()
        }
      ];
      
      (document.querySelectorAll as jest.Mock).mockReturnValue(mockLinks);

      const strategy = {
        condition: '',
        strategy: 'preload_likely_next_pages',
        parameters: { confidence: 0.7 },
        enabled: true
      };

      optimizer.applyAdaptiveStrategies([strategy]);

      expect(mockLinks[0].addEventListener).toHaveBeenCalledWith('mouseenter', expect.any(Function));
      expect(mockLinks[0].addEventListener).toHaveBeenCalledWith('mouseleave', expect.any(Function));
    });
  });

  describe('Condition Evaluation', () => {
    it('should evaluate simple conditions correctly', () => {
      const evaluateCondition = (optimizer as any).evaluateCondition.bind(optimizer);
      
      const result = evaluateCondition(
        'device.type === "mobile"',
        { device: { type: 'mobile' }, connection: mockNetworkInfo }
      );

      expect(result).toBe(true);
    });

    it('should handle complex conditions', () => {
      const evaluateCondition = (optimizer as any).evaluateCondition.bind(optimizer);
      
      const result = evaluateCondition(
        'connection.effectiveType === "2g" || connection.effectiveType === "slow-2g"',
        { device: mockDeviceInfo, connection: { ...mockNetworkInfo, effectiveType: '2g' } }
      );

      expect(result).toBe(true);
    });

    it('should handle condition evaluation errors gracefully', () => {
      const evaluateCondition = (optimizer as any).evaluateCondition.bind(optimizer);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = evaluateCondition(
        'invalid.syntax.here',
        { device: mockDeviceInfo, connection: mockNetworkInfo }
      );

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Usage Pattern Tracking', () => {
    it('should track usage patterns', () => {
      const pattern = 'slow_loading_pattern';
      const data = { frequency: 5, avgDuration: 2000 };

      optimizer.trackUsagePattern(pattern, data);

      const patterns = (optimizer as any).usagePatterns;
      expect(patterns.has(pattern)).toBe(true);
      expect(patterns.get(pattern)).toMatchObject(data);
    });

    it('should update existing patterns', () => {
      const pattern = 'test_pattern';
      
      optimizer.trackUsagePattern(pattern, { count: 1 });
      optimizer.trackUsagePattern(pattern, { count: 2, newField: 'value' });

      const patterns = (optimizer as any).usagePatterns;
      const patternData = patterns.get(pattern);
      
      expect(patternData.count).toBe(2);
      expect(patternData.newField).toBe('value');
    });
  });

  describe('Recommendation Management', () => {
    it('should get current recommendations', () => {
      optimizer.analyzePerformance(mockMetrics);
      const recommendations = optimizer.getRecommendations();
      
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should clear recommendations', () => {
      optimizer.analyzePerformance(mockMetrics);
      optimizer.clearRecommendations();
      
      const recommendations = optimizer.getRecommendations();
      expect(recommendations).toHaveLength(0);
    });
  });

  describe('Report Export', () => {
    it('should export optimization report', () => {
      optimizer.analyzePerformance(mockMetrics);
      optimizer.trackUsagePattern('test_pattern', { data: 'value' });

      const report = optimizer.exportOptimizationReport();

      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('adaptiveStrategies');
      expect(report).toHaveProperty('usagePatterns');
      expect(report).toHaveProperty('timestamp');
      expect(report.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Request Limiting Strategy', () => {
    it('should apply request limiting correctly', () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn();

      const strategy = {
        condition: '',
        strategy: 'limit_concurrent_requests',
        parameters: { maxConcurrent: 2 },
        enabled: true
      };

      optimizer.applyAdaptiveStrategies([strategy]);

      // Verify fetch was replaced
      expect(window.fetch).not.toBe(originalFetch);

      // Restore
      global.fetch = originalFetch;
    });
  });

  describe('Recommendation Priority and Effort', () => {
    it('should assign correct priority levels', () => {
      const criticalMetrics = [
        {
          ...mockMetrics[0],
          name: 'lcp',
          value: 6000 // Very poor
        }
      ];

      const recommendations = optimizer.analyzePerformance(criticalMetrics);
      const lcpRec = recommendations.find(r => r.title.includes('Largest Contentful Paint'));
      
      expect(lcpRec?.priority).toBe('high');
    });

    it('should provide implementation guidance', () => {
      const recommendations = optimizer.analyzePerformance(mockMetrics);
      
      recommendations.forEach(rec => {
        expect(rec.implementation).toBeTruthy();
        expect(rec.impact).toBeTruthy();
        expect(rec.effort).toMatch(/^(low|medium|high)$/);
      });
    });
  });
});