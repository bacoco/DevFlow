/**
 * Production Performance Test Suite
 * Tests critical performance metrics and optimizations
 */

import { render, screen, waitFor } from '@testing-library/react';
import { performance } from 'perf_hooks';
import { getPerformanceMonitor, reportBundleSize, reportMemoryUsage } from '../../utils/performance';
import { getAccessibilityAuditor } from '../../utils/accessibility-audit';

// Mock components for testing
import { Dashboard } from '../../components/Dashboard/Dashboard';
import { TaskBoard } from '../../components/TaskManager/TaskBoard';
import { ChartWidget } from '../../components/Widget/ChartWidget';

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  COMPONENT_MOUNT: 100,
  INITIAL_RENDER: 500,
  INTERACTION_RESPONSE: 50,
  MEMORY_USAGE: 50 * 1024 * 1024, // 50MB
  BUNDLE_SIZE: 2 * 1024 * 1024, // 2MB
};

describe('Production Performance Tests', () => {
  let performanceMonitor: ReturnType<typeof getPerformanceMonitor>;

  beforeEach(() => {
    performanceMonitor = getPerformanceMonitor();
    // Clear previous metrics
    performanceMonitor.destroy();
    performanceMonitor = getPerformanceMonitor();
  });

  afterEach(() => {
    performanceMonitor.destroy();
  });

  describe('Component Mount Performance', () => {
    it('should mount Dashboard component within performance threshold', async () => {
      const startTime = performance.now();
      
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
      
      const mountTime = performance.now() - startTime;
      expect(mountTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_MOUNT);
    });

    it('should mount TaskBoard component within performance threshold', async () => {
      const startTime = performance.now();
      
      const mockTasks = Array.from({ length: 100 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        status: 'todo',
        priority: 'medium',
      }));
      
      render(<TaskBoard tasks={mockTasks} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('task-board')).toBeInTheDocument();
      });
      
      const mountTime = performance.now() - startTime;
      expect(mountTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_MOUNT);
    });

    it('should mount ChartWidget component within performance threshold', async () => {
      const startTime = performance.now();
      
      const mockData = Array.from({ length: 1000 }, (_, i) => ({
        x: i,
        y: Math.random() * 100,
      }));
      
      render(<ChartWidget data={mockData} type="line" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('chart-widget')).toBeInTheDocument();
      });
      
      const mountTime = performance.now() - startTime;
      expect(mountTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_MOUNT);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not exceed memory usage threshold', async () => {
      // Render multiple components to simulate real usage
      const components = Array.from({ length: 10 }, (_, i) => (
        <Dashboard key={i} />
      ));
      
      render(<div>{components}</div>);
      
      await waitFor(() => {
        expect(screen.getAllByTestId('dashboard')).toHaveLength(10);
      });
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      reportMemoryUsage();
      
      const memoryMetrics = performanceMonitor.getMetricsByName('memory_usage');
      if (memoryMetrics.length > 0) {
        const latestMemoryUsage = memoryMetrics[memoryMetrics.length - 1].value;
        expect(latestMemoryUsage).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE);
      }
    });

    it('should not have memory leaks after component unmount', async () => {
      const { unmount } = render(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
      
      // Record initial memory
      reportMemoryUsage();
      const initialMemory = performanceMonitor.getMetricsByName('memory_usage');
      
      unmount();
      
      // Force garbage collection
      if (global.gc) {
        global.gc();
      }
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      reportMemoryUsage();
      const finalMemory = performanceMonitor.getMetricsByName('memory_usage');
      
      if (initialMemory.length > 0 && finalMemory.length > 1) {
        const memoryDiff = finalMemory[finalMemory.length - 1].value - initialMemory[initialMemory.length - 1].value;
        // Allow for some memory increase, but not excessive
        expect(memoryDiff).toBeLessThan(10 * 1024 * 1024); // 10MB threshold
      }
    });
  });

  describe('Bundle Size Tests', () => {
    it('should report bundle size within threshold', () => {
      reportBundleSize();
      
      const bundleMetrics = performanceMonitor.getMetricsByName('bundle_size');
      if (bundleMetrics.length > 0) {
        const bundleSize = bundleMetrics[bundleMetrics.length - 1].value;
        expect(bundleSize).toBeLessThan(PERFORMANCE_THRESHOLDS.BUNDLE_SIZE);
      }
    });
  });

  describe('Rendering Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: Math.random() * 1000,
      }));
      
      const startTime = performance.now();
      
      render(
        <div data-testid="large-list">
          {largeDataset.slice(0, 100).map(item => (
            <div key={item.id}>{item.name}: {item.value}</div>
          ))}
        </div>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('large-list')).toBeInTheDocument();
      });
      
      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INITIAL_RENDER);
    });

    it('should handle rapid state updates efficiently', async () => {
      let updateCount = 0;
      const maxUpdates = 100;
      
      const TestComponent = () => {
        const [count, setCount] = React.useState(0);
        
        React.useEffect(() => {
          const interval = setInterval(() => {
            if (updateCount < maxUpdates) {
              setCount(c => c + 1);
              updateCount++;
            }
          }, 10);
          
          return () => clearInterval(interval);
        }, []);
        
        return <div data-testid="counter">{count}</div>;
      };
      
      const startTime = performance.now();
      
      render(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('counter')).toHaveTextContent(maxUpdates.toString());
      }, { timeout: 5000 });
      
      const totalTime = performance.now() - startTime;
      const averageUpdateTime = totalTime / maxUpdates;
      
      expect(averageUpdateTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INTERACTION_RESPONSE);
    });
  });

  describe('Accessibility Performance', () => {
    it('should complete accessibility audit within reasonable time', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
      
      const auditor = getAccessibilityAuditor();
      const startTime = performance.now();
      
      const report = await auditor.runAudit();
      
      const auditTime = performance.now() - startTime;
      
      expect(auditTime).toBeLessThan(5000); // 5 seconds max for audit
      expect(report.score).toBeGreaterThan(80); // Minimum 80% accessibility score
    });
  });

  describe('Animation Performance', () => {
    it('should maintain 60fps during animations', async () => {
      const AnimatedComponent = () => {
        const [isAnimating, setIsAnimating] = React.useState(false);
        
        return (
          <div
            data-testid="animated-element"
            style={{
              transform: isAnimating ? 'translateX(100px)' : 'translateX(0)',
              transition: 'transform 1s ease-in-out',
            }}
            onClick={() => setIsAnimating(!isAnimating)}
          >
            Animated Element
          </div>
        );
      };
      
      render(<AnimatedComponent />);
      
      const element = screen.getByTestId('animated-element');
      
      // Start animation
      const startTime = performance.now();
      element.click();
      
      // Monitor frame rate during animation
      let frameCount = 0;
      const frameCallback = () => {
        frameCount++;
        if (performance.now() - startTime < 1000) {
          requestAnimationFrame(frameCallback);
        }
      };
      
      requestAnimationFrame(frameCallback);
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const fps = frameCount / 1; // frames per second
      expect(fps).toBeGreaterThan(55); // Allow some tolerance below 60fps
    });
  });

  describe('Network Performance', () => {
    it('should handle API request failures gracefully', async () => {
      // Mock failed API request
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const startTime = performance.now();
      
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
      
      const loadTime = performance.now() - startTime;
      
      // Should still load within threshold even with failed requests
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INITIAL_RENDER);
    });

    it('should implement proper caching strategies', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });
      
      global.fetch = mockFetch;
      
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
      
      // Render another instance
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getAllByTestId('dashboard')).toHaveLength(2);
      });
      
      // Should use cached data, not make additional requests
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});

// Performance benchmark utility
export function runPerformanceBenchmark(
  name: string,
  fn: () => Promise<void> | void,
  iterations = 10
): Promise<{ average: number; min: number; max: number; total: number }> {
  return new Promise(async (resolve) => {
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      await fn();
      const endTime = performance.now();
      times.push(endTime - startTime);
    }
    
    const total = times.reduce((sum, time) => sum + time, 0);
    const average = total / iterations;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    console.log(`Performance Benchmark: ${name}`);
    console.log(`Average: ${average.toFixed(2)}ms`);
    console.log(`Min: ${min.toFixed(2)}ms`);
    console.log(`Max: ${max.toFixed(2)}ms`);
    console.log(`Total: ${total.toFixed(2)}ms`);
    
    resolve({ average, min, max, total });
  });
}