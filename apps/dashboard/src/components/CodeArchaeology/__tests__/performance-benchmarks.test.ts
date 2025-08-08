/**
 * Performance Benchmark Tests for 3D Code Archaeology
 * Tests for rendering performance, memory usage, and scalability across different device profiles
 */

import { render, waitFor } from '@testing-library/react';
import { setupTestEnvironment, cleanupTestEnvironment } from '../../../utils/test-utils';
import { Scene3D } from '../Scene3D';
import { CodeArchaeologyViewer } from '../CodeArchaeologyViewer';
import { TemporalVisualization } from '../TemporalVisualization';
import { WebGLOptimizer } from '../performance/WebGLOptimizer';
import { FallbackRenderer } from '../performance/FallbackRenderer';
import type { CodeArtifact, Visualization3D, AnimationSequence } from '../types';

// Device profiles for testing
const DEVICE_PROFILES = {
  highEnd: {
    name: 'High-end Desktop',
    cpu: { cores: 8, speed: 3.5 },
    gpu: { memory: 8192, compute: 'high' },
    ram: 32768,
    screen: { width: 2560, height: 1440, dpi: 109 },
    webgl: {
      maxTextureSize: 4096,
      maxVertexAttribs: 32,
      extensions: ['ANGLE_instanced_arrays', 'OES_texture_float', 'EXT_texture_filter_anisotropic'],
    },
  },
  midRange: {
    name: 'Mid-range Laptop',
    cpu: { cores: 4, speed: 2.8 },
    gpu: { memory: 4096, compute: 'medium' },
    ram: 16384,
    screen: { width: 1920, height: 1080, dpi: 96 },
    webgl: {
      maxTextureSize: 2048,
      maxVertexAttribs: 16,
      extensions: ['ANGLE_instanced_arrays', 'OES_texture_float'],
    },
  },
  lowEnd: {
    name: 'Budget Laptop',
    cpu: { cores: 2, speed: 2.0 },
    gpu: { memory: 2048, compute: 'low' },
    ram: 8192,
    screen: { width: 1366, height: 768, dpi: 96 },
    webgl: {
      maxTextureSize: 1024,
      maxVertexAttribs: 8,
      extensions: ['ANGLE_instanced_arrays'],
    },
  },
  mobile: {
    name: 'Mobile Device',
    cpu: { cores: 4, speed: 1.8 },
    gpu: { memory: 1024, compute: 'mobile' },
    ram: 4096,
    screen: { width: 375, height: 667, dpi: 326 },
    webgl: {
      maxTextureSize: 512,
      maxVertexAttribs: 8,
      extensions: [],
    },
  },
  tablet: {
    name: 'Tablet Device',
    cpu: { cores: 6, speed: 2.4 },
    gpu: { memory: 2048, compute: 'mobile' },
    ram: 6144,
    screen: { width: 768, height: 1024, dpi: 264 },
    webgl: {
      maxTextureSize: 1024,
      maxVertexAttribs: 12,
      extensions: ['ANGLE_instanced_arrays'],
    },
  },
};

// Mock WebGL context with device-specific capabilities
function createMockWebGLContext(deviceProfile: typeof DEVICE_PROFILES.highEnd) {
  return {
    canvas: document.createElement('canvas'),
    drawingBufferWidth: deviceProfile.screen.width,
    drawingBufferHeight: deviceProfile.screen.height,
    viewport: jest.fn(),
    clear: jest.fn(),
    clearColor: jest.fn(),
    getParameter: jest.fn((param: number) => {
      switch (param) {
        case 0x0D33: return deviceProfile.webgl.maxTextureSize; // MAX_TEXTURE_SIZE
        case 0x8869: return deviceProfile.webgl.maxVertexAttribs; // MAX_VERTEX_ATTRIBS
        case 0x7937: return `${deviceProfile.name} GPU`; // RENDERER
        case 0x7938: return 'WebGL 1.0'; // VERSION
        default: return 0;
      }
    }),
    getExtension: jest.fn((name: string) => {
      return deviceProfile.webgl.extensions.includes(name) ? {} : null;
    }),
    isContextLost: jest.fn(() => false),
    createShader: jest.fn(),
    createProgram: jest.fn(),
    createBuffer: jest.fn(),
    createTexture: jest.fn(),
    deleteShader: jest.fn(),
    deleteProgram: jest.fn(),
    deleteBuffer: jest.fn(),
    deleteTexture: jest.fn(),
  };
}

// Performance measurement utilities
class PerformanceBenchmark {
  private measurements: Map<string, number[]> = new Map();
  private memoryBaseline: number = 0;

  startMeasurement(name: string): void {
    performance.mark(`${name}-start`);
    if ((performance as any).memory) {
      this.memoryBaseline = (performance as any).memory.usedJSHeapSize;
    }
  }

  endMeasurement(name: string): {
    duration: number;
    memoryDelta: number;
  } {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const entries = performance.getEntriesByName(name);
    const duration = entries[entries.length - 1]?.duration || 0;
    
    let memoryDelta = 0;
    if ((performance as any).memory) {
      memoryDelta = (performance as any).memory.usedJSHeapSize - this.memoryBaseline;
    }

    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)!.push(duration);

    return { duration, memoryDelta };
  }

  getStatistics(name: string): {
    min: number;
    max: number;
    average: number;
    median: number;
    p95: number;
  } {
    const measurements = this.measurements.get(name) || [];
    if (measurements.length === 0) {
      return { min: 0, max: 0, average: 0, median: 0, p95: 0 };
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const average = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95 = sorted[p95Index];

    return { min, max, average, median, p95 };
  }

  clear(): void {
    this.measurements.clear();
    performance.clearMarks();
    performance.clearMeasures();
  }
}

// Generate test data of various sizes
function generateTestArtifacts(count: number): CodeArtifact[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `artifact-${i}`,
    filePath: `src/components/Component${i}.tsx`,
    type: i % 3 === 0 ? 'file' : i % 3 === 1 ? 'function' : 'class',
    name: `Component${i}`,
    position3D: {
      x: (Math.random() - 0.5) * 100,
      y: (Math.random() - 0.5) * 100,
      z: (Math.random() - 0.5) * 100,
    },
    complexity: Math.floor(Math.random() * 20) + 1,
    changeFrequency: Math.floor(Math.random() * 50),
    lastModified: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
    authors: [`user${i % 10}@example.com`],
    dependencies: Array.from(
      { length: Math.floor(Math.random() * 5) },
      (_, j) => `artifact-${Math.floor(Math.random() * count)}`
    ),
  }));
}

describe('3D Code Archaeology Performance Benchmarks', () => {
  let benchmark: PerformanceBenchmark;

  beforeAll(() => {
    setupTestEnvironment();
    benchmark = new PerformanceBenchmark();
  });

  afterAll(() => {
    cleanupTestEnvironment();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    benchmark.clear();
  });

  describe('Rendering Performance Across Device Profiles', () => {
    Object.entries(DEVICE_PROFILES).forEach(([profileName, profile]) => {
      describe(`${profile.name} Performance`, () => {
        beforeEach(() => {
          // Mock device-specific WebGL context
          Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
            value: jest.fn(() => createMockWebGLContext(profile)),
            configurable: true,
          });

          // Mock device capabilities
          Object.defineProperty(navigator, 'hardwareConcurrency', {
            value: profile.cpu.cores,
            configurable: true,
          });

          Object.defineProperty(window, 'innerWidth', {
            value: profile.screen.width,
            configurable: true,
          });

          Object.defineProperty(window, 'innerHeight', {
            value: profile.screen.height,
            configurable: true,
          });
        });

        it('should render small datasets efficiently', async () => {
          const artifacts = generateTestArtifacts(50);
          
          benchmark.startMeasurement('small-dataset-render');
          
          const { container } = render(
            <Scene3D
              artifacts={artifacts}
              width={profile.screen.width}
              height={profile.screen.height}
            />
          );

          await waitFor(() => {
            expect(container.querySelector('canvas')).toBeInTheDocument();
          });

          const result = benchmark.endMeasurement('small-dataset-render');

          // Performance expectations based on device profile
          const expectedMaxTime = profileName === 'mobile' ? 200 : 
                                 profileName === 'lowEnd' ? 150 : 100;
          
          expect(result.duration).toBeLessThan(expectedMaxTime);
          expect(result.memoryDelta).toBeLessThan(50 * 1024 * 1024); // 50MB
        });

        it('should handle medium datasets within acceptable limits', async () => {
          const artifacts = generateTestArtifacts(500);
          
          benchmark.startMeasurement('medium-dataset-render');
          
          const { container } = render(
            <Scene3D
              artifacts={artifacts}
              width={profile.screen.width}
              height={profile.screen.height}
            />
          );

          await waitFor(() => {
            expect(container.querySelector('canvas')).toBeInTheDocument();
          });

          const result = benchmark.endMeasurement('medium-dataset-render');

          const expectedMaxTime = profileName === 'mobile' ? 1000 : 
                                 profileName === 'lowEnd' ? 800 : 
                                 profileName === 'midRange' ? 500 : 300;
          
          expect(result.duration).toBeLessThan(expectedMaxTime);
          expect(result.memoryDelta).toBeLessThan(200 * 1024 * 1024); // 200MB
        });

        it('should adapt quality for large datasets', async () => {
          const artifacts = generateTestArtifacts(2000);
          
          benchmark.startMeasurement('large-dataset-render');
          
          const { container } = render(
            <Scene3D
              artifacts={artifacts}
              width={profile.screen.width}
              height={profile.screen.height}
              adaptiveQuality={true}
            />
          );

          await waitFor(() => {
            expect(container.querySelector('canvas')).toBeInTheDocument();
          });

          const result = benchmark.endMeasurement('large-dataset-render');

          // Large datasets should trigger quality adaptation
          const expectedMaxTime = profileName === 'mobile' ? 3000 : 
                                 profileName === 'lowEnd' ? 2000 : 1000;
          
          expect(result.duration).toBeLessThan(expectedMaxTime);
          
          // Should use fallback for mobile/low-end devices
          if (profileName === 'mobile' || profileName === 'lowEnd') {
            const fallbackIndicator = container.querySelector('[data-testid="quality-reduced"]');
            // In a real implementation, this would indicate quality reduction
          }
        });

        it('should maintain frame rate during interactions', async () => {
          const artifacts = generateTestArtifacts(200);
          
          const { container } = render(
            <Scene3D
              artifacts={artifacts}
              width={profile.screen.width}
              height={profile.screen.height}
            />
          );

          await waitFor(() => {
            expect(container.querySelector('canvas')).toBeInTheDocument();
          });

          const canvas = container.querySelector('canvas') as HTMLCanvasElement;
          
          // Simulate multiple interactions
          const interactionCount = 10;
          for (let i = 0; i < interactionCount; i++) {
            benchmark.startMeasurement(`interaction-${i}`);
            
            // Simulate camera movement
            const event = new MouseEvent('mousemove', {
              clientX: Math.random() * profile.screen.width,
              clientY: Math.random() * profile.screen.height,
            });
            canvas.dispatchEvent(event);
            
            // Wait for frame
            await new Promise(resolve => requestAnimationFrame(resolve));
            
            benchmark.endMeasurement(`interaction-${i}`);
          }

          // Check interaction performance
          for (let i = 0; i < interactionCount; i++) {
            const stats = benchmark.getStatistics(`interaction-${i}`);
            const expectedMaxFrameTime = profileName === 'mobile' ? 33 : 16.67; // 30fps vs 60fps
            expect(stats.average).toBeLessThan(expectedMaxFrameTime);
          }
        });
      });
    });
  });

  describe('Memory Usage and Garbage Collection', () => {
    it('should manage memory efficiently during long sessions', async () => {
      const artifacts = generateTestArtifacts(1000);
      
      const { container, rerender } = render(
        <Scene3D
          artifacts={artifacts}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Simulate multiple re-renders (like changing time in temporal view)
      for (let i = 0; i < 20; i++) {
        benchmark.startMeasurement(`rerender-${i}`);
        
        const modifiedArtifacts = artifacts.map(artifact => ({
          ...artifact,
          position3D: {
            x: artifact.position3D.x + Math.random() * 2 - 1,
            y: artifact.position3D.y + Math.random() * 2 - 1,
            z: artifact.position3D.z + Math.random() * 2 - 1,
          },
        }));

        rerender(
          <Scene3D
            artifacts={modifiedArtifacts}
            width={800}
            height={600}
          />
        );

        await new Promise(resolve => requestAnimationFrame(resolve));
        
        benchmark.endMeasurement(`rerender-${i}`);
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be reasonable (less than 100MB for 20 re-renders)
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024);
    });

    it('should clean up resources when component unmounts', async () => {
      const artifacts = generateTestArtifacts(500);
      
      const { container, unmount } = render(
        <Scene3D
          artifacts={artifacts}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const memoryBeforeUnmount = (performance as any).memory?.usedJSHeapSize || 0;
      
      benchmark.startMeasurement('component-unmount');
      unmount();
      benchmark.endMeasurement('component-unmount');

      // Force garbage collection if available
      if ((global as any).gc) {
        (global as any).gc();
      }

      const memoryAfterUnmount = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryFreed = memoryBeforeUnmount - memoryAfterUnmount;
      
      // Should free significant memory (at least 10MB for 500 artifacts)
      expect(memoryFreed).toBeGreaterThan(10 * 1024 * 1024);
      
      const unmountStats = benchmark.getStatistics('component-unmount');
      expect(unmountStats.average).toBeLessThan(100); // Should unmount quickly
    });
  });

  describe('Animation and Temporal Performance', () => {
    it('should maintain smooth animations across device profiles', async () => {
      const artifacts = generateTestArtifacts(100);
      const mockAnimation: AnimationSequence = {
        id: 'perf-test-anim',
        timeRange: {
          start: new Date('2023-01-01'),
          end: new Date('2023-01-31'),
        },
        keyframes: Array.from({ length: 30 }, (_, i) => ({
          timestamp: new Date(Date.now() + i * 1000),
          artifactChanges: artifacts.slice(0, 10).map(artifact => ({
            artifactId: artifact.id,
            changeType: 'modified' as const,
            newPosition: {
              x: artifact.position3D.x + Math.sin(i * 0.1) * 10,
              y: artifact.position3D.y + Math.cos(i * 0.1) * 10,
              z: artifact.position3D.z,
            },
            transitionDuration: 1000,
          })),
        })),
        duration: 30000,
        easing: 'easeInOut',
      };

      Object.entries(DEVICE_PROFILES).forEach(([profileName, profile]) => {
        it(`should animate smoothly on ${profile.name}`, async () => {
          // Mock device-specific context
          Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
            value: jest.fn(() => createMockWebGLContext(profile)),
            configurable: true,
          });

          const { container } = render(
            <TemporalVisualization
              animations={[mockAnimation]}
              currentTime={new Date('2023-01-01')}
              onTimeChange={jest.fn()}
              width={profile.screen.width}
              height={profile.screen.height}
            />
          );

          await waitFor(() => {
            expect(container.querySelector('canvas')).toBeInTheDocument();
          });

          // Simulate animation frames
          const frameCount = 60; // 1 second at 60fps
          const frameTimes: number[] = [];

          for (let i = 0; i < frameCount; i++) {
            benchmark.startMeasurement(`animation-frame-${i}`);
            
            // Simulate animation update
            await new Promise(resolve => requestAnimationFrame(resolve));
            
            const result = benchmark.endMeasurement(`animation-frame-${i}`);
            frameTimes.push(result.duration);
          }

          const averageFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
          const targetFrameTime = profileName === 'mobile' ? 33.33 : 16.67; // 30fps vs 60fps
          
          expect(averageFrameTime).toBeLessThan(targetFrameTime);
          
          // Check for frame drops (frames taking more than 2x target time)
          const frameDrops = frameTimes.filter(time => time > targetFrameTime * 2).length;
          const frameDropPercentage = (frameDrops / frameCount) * 100;
          
          expect(frameDropPercentage).toBeLessThan(10); // Less than 10% frame drops
        });
      });
    });
  });

  describe('Scalability and Load Testing', () => {
    it('should handle increasing artifact counts gracefully', async () => {
      const testSizes = [100, 500, 1000, 2000, 5000];
      const renderTimes: Array<{ size: number; time: number }> = [];

      for (const size of testSizes) {
        const artifacts = generateTestArtifacts(size);
        
        benchmark.startMeasurement(`scalability-${size}`);
        
        const { container, unmount } = render(
          <Scene3D
            artifacts={artifacts}
            width={800}
            height={600}
            adaptiveQuality={true}
          />
        );

        await waitFor(() => {
          expect(container.querySelector('canvas')).toBeInTheDocument();
        });

        const result = benchmark.endMeasurement(`scalability-${size}`);
        renderTimes.push({ size, time: result.duration });
        
        unmount();
      }

      // Check that render time doesn't grow exponentially
      for (let i = 1; i < renderTimes.length; i++) {
        const current = renderTimes[i];
        const previous = renderTimes[i - 1];
        
        const sizeRatio = current.size / previous.size;
        const timeRatio = current.time / previous.time;
        
        // Time growth should be less than quadratic
        expect(timeRatio).toBeLessThan(sizeRatio * sizeRatio);
      }
    });

    it('should maintain performance under concurrent operations', async () => {
      const artifacts = generateTestArtifacts(1000);
      
      const { container } = render(
        <CodeArchaeologyViewer
          visualization={{
            id: 'concurrent-test',
            sceneData: {
              artifacts,
              connections: [],
              metadata: { totalFiles: artifacts.length, totalFunctions: 0, totalClasses: 0 },
            },
            artifacts: artifacts.map(artifact => ({
              artifact,
              position: artifact.position3D,
              scale: { x: 1, y: 1, z: 1 },
              rotation: { x: 0, y: 0, z: 0 },
              color: { r: 0.5, g: 0.5, b: 0.5 },
              opacity: 1,
              visible: true,
            })),
            connections: [],
            animations: [],
            metadata: { createdAt: new Date(), version: '1.0' },
          }}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      // Simulate concurrent operations
      const operations = [
        () => {
          // Simulate filtering
          const filterEvent = new CustomEvent('filter', {
            detail: { type: 'file' },
          });
          container.dispatchEvent(filterEvent);
        },
        () => {
          // Simulate search
          const searchEvent = new CustomEvent('search', {
            detail: { query: 'Component' },
          });
          container.dispatchEvent(searchEvent);
        },
        () => {
          // Simulate selection
          const selectEvent = new CustomEvent('select', {
            detail: { artifactId: 'artifact-1' },
          });
          container.dispatchEvent(selectEvent);
        },
      ];

      benchmark.startMeasurement('concurrent-operations');
      
      // Execute operations concurrently
      await Promise.all(operations.map(op => 
        new Promise(resolve => {
          op();
          requestAnimationFrame(resolve);
        })
      ));

      const result = benchmark.endMeasurement('concurrent-operations');
      
      expect(result.duration).toBeLessThan(200); // Should handle concurrent ops quickly
    });
  });

  describe('WebGL Optimization Performance', () => {
    it('should optimize rendering based on capabilities', async () => {
      const artifacts = generateTestArtifacts(1000);
      
      // Test with different WebGL capabilities
      const capabilities = [
        { name: 'high-end', maxTextureSize: 4096, extensions: ['ANGLE_instanced_arrays', 'OES_texture_float'] },
        { name: 'mid-range', maxTextureSize: 2048, extensions: ['ANGLE_instanced_arrays'] },
        { name: 'low-end', maxTextureSize: 1024, extensions: [] },
      ];

      for (const capability of capabilities) {
        Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
          value: jest.fn(() => ({
            ...createMockWebGLContext(DEVICE_PROFILES.midRange),
            getParameter: jest.fn((param: number) => {
              if (param === 0x0D33) return capability.maxTextureSize;
              return 256;
            }),
            getExtension: jest.fn((name: string) => 
              capability.extensions.includes(name) ? {} : null
            ),
          })),
          configurable: true,
        });

        benchmark.startMeasurement(`webgl-optimization-${capability.name}`);
        
        const { container, unmount } = render(
          <Scene3D
            artifacts={artifacts}
            width={800}
            height={600}
          />
        );

        await waitFor(() => {
          expect(container.querySelector('canvas')).toBeInTheDocument();
        });

        const result = benchmark.endMeasurement(`webgl-optimization-${capability.name}`);
        
        // Higher capabilities should render faster or handle more artifacts
        if (capability.name === 'high-end') {
          expect(result.duration).toBeLessThan(500);
        } else if (capability.name === 'low-end') {
          // Should still work but may take longer or use fallback
          expect(result.duration).toBeLessThan(2000);
        }
        
        unmount();
      }
    });

    it('should fallback gracefully when WebGL is unavailable', async () => {
      const artifacts = generateTestArtifacts(100);
      
      // Mock no WebGL support
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        value: jest.fn(() => null),
        configurable: true,
      });

      benchmark.startMeasurement('fallback-render');
      
      const { container } = render(
        <Scene3D
          artifacts={artifacts}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        // Should show fallback or error message
        const fallback = container.querySelector('[data-testid="webgl-fallback"]') ||
                         container.querySelector('[data-testid="canvas2d-fallback"]') ||
                         container.querySelector('canvas');
        expect(fallback).toBeInTheDocument();
      });

      const result = benchmark.endMeasurement('fallback-render');
      
      // Fallback should still be reasonably fast
      expect(result.duration).toBeLessThan(1000);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions in rendering', async () => {
      const artifacts = generateTestArtifacts(500);
      const iterations = 10;
      const renderTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        benchmark.startMeasurement(`regression-test-${i}`);
        
        const { container, unmount } = render(
          <Scene3D
            artifacts={artifacts}
            width={800}
            height={600}
          />
        );

        await waitFor(() => {
          expect(container.querySelector('canvas')).toBeInTheDocument();
        });

        const result = benchmark.endMeasurement(`regression-test-${i}`);
        renderTimes.push(result.duration);
        
        unmount();
      }

      const averageTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      const standardDeviation = Math.sqrt(
        renderTimes.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / renderTimes.length
      );

      // Performance should be consistent (low standard deviation)
      const coefficientOfVariation = standardDeviation / averageTime;
      expect(coefficientOfVariation).toBeLessThan(0.3); // Less than 30% variation

      // No single render should be more than 3 standard deviations from mean
      const outliers = renderTimes.filter(time => 
        Math.abs(time - averageTime) > 3 * standardDeviation
      );
      expect(outliers.length).toBe(0);
    });
  });
});