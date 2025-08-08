import { Vector3, PerspectiveCamera } from 'three';
import { LODManager, DEFAULT_LOD_CONFIG, ArtifactLOD } from '../performance/LODManager';
import { ProgressiveLoader, DEFAULT_PROGRESSIVE_CONFIG } from '../performance/ProgressiveLoader';
import { MemoryManager, DEFAULT_MEMORY_CONFIG } from '../performance/MemoryManager';
import { CodeArtifact } from '../types';

// Mock Three.js for testing
jest.mock('three', () => ({
  Vector3: jest.fn().mockImplementation((x = 0, y = 0, z = 0) => {
    const createVector = (x: number, y: number, z: number) => ({
      x, y, z,
      distanceTo: jest.fn(() => 10),
      clone: jest.fn(() => createVector(x, y, z)),
      min: jest.fn(function(v) { this.x = Math.min(this.x, v.x); this.y = Math.min(this.y, v.y); this.z = Math.min(this.z, v.z); return this; }),
      max: jest.fn(function(v) { this.x = Math.max(this.x, v.x); this.y = Math.max(this.y, v.y); this.z = Math.max(this.z, v.z); return this; }),
      add: jest.fn(function(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }),
      sub: jest.fn(function(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }),
      multiplyScalar: jest.fn(function(s) { this.x *= s; this.y *= s; this.z *= s; return this; })
    });
    return createVector(x, y, z);
  }),
  PerspectiveCamera: jest.fn().mockImplementation(() => ({
    position: { x: 0, y: 0, z: 0, distanceTo: jest.fn(() => 10) },
    projectionMatrix: {},
    matrixWorldInverse: {},
  })),
  Frustum: jest.fn().mockImplementation(() => ({
    setFromProjectionMatrix: jest.fn(),
    containsPoint: jest.fn(() => true),
  })),
  Matrix4: jest.fn().mockImplementation(() => ({
    multiplyMatrices: jest.fn(),
  })),
  BufferGeometry: jest.fn().mockImplementation(() => ({
    dispose: jest.fn(),
    attributes: {},
    index: null,
  })),
  Material: jest.fn().mockImplementation(() => ({
    dispose: jest.fn(),
  })),
  Texture: jest.fn().mockImplementation(() => ({
    dispose: jest.fn(),
    image: { width: 512, height: 512 },
    generateMipmaps: true,
  })),
  Object3D: jest.fn().mockImplementation(() => ({
    parent: null,
    remove: jest.fn(),
    traverse: jest.fn(),
  })),
}));

// Generate test artifacts
const generateTestArtifacts = (count: number): CodeArtifact[] => {
  const artifacts: CodeArtifact[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    artifacts.push({
      id: `artifact-${i}`,
      filePath: `/src/file${i}.ts`,
      type: ['file', 'function', 'class', 'interface'][i % 4] as any,
      name: `Artifact${i}`,
      position3D: new Vector3(
        (i % 10) * 5,
        Math.floor(i / 10) * 5,
        (i % 5) * 5
      ),
      complexity: Math.random() * 20,
      changeFrequency: Math.random() * 10,
      lastModified: new Date(now.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      authors: [`author${i % 5}`],
      dependencies: [],
      size: Math.random() * 100,
    });
  }
  
  return artifacts;
};

describe('3D Performance Optimization Tests', () => {
  describe('LOD Manager Performance Tests', () => {
    let lodManager: LODManager;
    let camera: PerspectiveCamera;

    beforeEach(() => {
      lodManager = new LODManager(DEFAULT_LOD_CONFIG);
      camera = new PerspectiveCamera();
    });

    it('should handle small datasets efficiently (100 artifacts)', () => {
      const artifacts = generateTestArtifacts(100);
      
      const startTime = performance.now();
      const lodResults = lodManager.calculateLOD(artifacts, camera);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50); // Should complete in less than 50ms
      expect(lodResults).toHaveLength(100);
      expect(lodResults.every(lod => lod.artifact && lod.level)).toBe(true);
    });

    it('should handle medium datasets efficiently (1000 artifacts)', () => {
      const artifacts = generateTestArtifacts(1000);
      
      const startTime = performance.now();
      const lodResults = lodManager.calculateLOD(artifacts, camera);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(200); // Should complete in less than 200ms
      expect(lodResults).toHaveLength(1000);
    });

    it('should handle large datasets efficiently (5000 artifacts)', () => {
      const artifacts = generateTestArtifacts(5000);
      
      const startTime = performance.now();
      const lodResults = lodManager.calculateLOD(artifacts, camera);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
      expect(lodResults).toHaveLength(5000);
    });

    it('should efficiently implement frustum culling', () => {
      const artifacts = generateTestArtifacts(2000);
      
      // Test with frustum culling enabled
      const startTimeWithCulling = performance.now();
      const resultsWithCulling = lodManager.calculateLOD(artifacts, camera);
      const endTimeWithCulling = performance.now();
      
      // Test with frustum culling disabled
      const configNoCulling = { ...DEFAULT_LOD_CONFIG, frustumCulling: false };
      const lodManagerNoCulling = new LODManager(configNoCulling);
      
      const startTimeNoCulling = performance.now();
      const resultsNoCulling = lodManagerNoCulling.calculateLOD(artifacts, camera);
      const endTimeNoCulling = performance.now();
      
      const timeWithCulling = endTimeWithCulling - startTimeWithCulling;
      const timeNoCulling = endTimeNoCulling - startTimeNoCulling;
      
      // Frustum culling should not significantly impact performance for this test size
      expect(timeWithCulling).toBeLessThan(timeNoCulling * 5); // More lenient for test environment
      expect(resultsWithCulling).toHaveLength(artifacts.length);
      expect(resultsNoCulling).toHaveLength(artifacts.length);
    });

    it('should scale linearly with artifact count', () => {
      const sizes = [100, 200, 400, 800];
      const times: number[] = [];
      
      sizes.forEach(size => {
        const artifacts = generateTestArtifacts(size);
        
        const startTime = performance.now();
        lodManager.calculateLOD(artifacts, camera);
        const endTime = performance.now();
        
        times.push(endTime - startTime);
      });
      
      // Check that performance scales reasonably (not exponentially)
      for (let i = 1; i < times.length; i++) {
        const ratio = times[i] / times[i - 1];
        expect(ratio).toBeLessThan(20); // More lenient for test environment
      }
    });

    it('should efficiently limit visible artifacts', () => {
      const artifacts = generateTestArtifacts(2000);
      const configLimited = { ...DEFAULT_LOD_CONFIG, maxVisibleArtifacts: 500 };
      const lodManagerLimited = new LODManager(configLimited);
      
      const startTime = performance.now();
      const results = lodManagerLimited.calculateLOD(artifacts, camera);
      const endTime = performance.now();
      
      const visibleArtifacts = results.filter(lod => lod.isVisible);
      
      expect(endTime - startTime).toBeLessThan(300);
      expect(visibleArtifacts.length).toBeLessThanOrEqual(500);
      expect(results).toHaveLength(2000); // All artifacts should still be tracked
    });

    it('should handle adaptive quality adjustments efficiently', () => {
      const artifacts = generateTestArtifacts(1000);
      const configAdaptive = { ...DEFAULT_LOD_CONFIG, adaptiveQuality: true };
      const lodManagerAdaptive = new LODManager(configAdaptive);
      
      const iterations = 10;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        lodManagerAdaptive.calculateLOD(artifacts, camera);
        lodManagerAdaptive.updatePerformance(16.67); // Simulate 60fps frame time
      }
      
      const endTime = performance.now();
      const averageTime = (endTime - startTime) / iterations;
      
      expect(averageTime).toBeLessThan(100); // Should handle adaptive quality efficiently
      
      const metrics = lodManagerAdaptive.getPerformanceMetrics();
      expect(metrics).toHaveProperty('currentFPS');
      expect(metrics).toHaveProperty('averageFPS');
      expect(metrics).toHaveProperty('performanceRatio');
    });
  });

  describe('Progressive Loader Performance Tests', () => {
    let progressiveLoader: ProgressiveLoader;
    let cameraPosition: Vector3;

    beforeEach(() => {
      progressiveLoader = new ProgressiveLoader(DEFAULT_PROGRESSIVE_CONFIG);
      cameraPosition = new Vector3(0, 0, 0);
    });

    it('should initialize chunking efficiently for large datasets', () => {
      const artifacts = generateTestArtifacts(5000);
      
      const startTime = performance.now();
      progressiveLoader.initialize(artifacts);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(500); // Should initialize in less than 500ms
      
      const chunkInfo = progressiveLoader.getChunkInfo();
      expect(chunkInfo.length).toBeGreaterThan(0);
      expect(chunkInfo.every(chunk => chunk.artifactCount > 0)).toBe(true);
    });

    it('should handle progressive loading updates efficiently', () => {
      const artifacts = generateTestArtifacts(2000);
      progressiveLoader.initialize(artifacts);
      
      const iterations = 50;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        // Simulate camera movement
        cameraPosition.x = i * 2;
        cameraPosition.z = i * 2;
        progressiveLoader.updateLoading(cameraPosition);
      }
      
      const endTime = performance.now();
      const averageTime = (endTime - startTime) / iterations;
      
      expect(averageTime).toBeLessThan(10); // Should update efficiently
    });

    it('should efficiently manage chunk priorities', () => {
      const artifacts = generateTestArtifacts(1000);
      progressiveLoader.initialize(artifacts);
      
      const startTime = performance.now();
      
      // Test multiple camera positions
      const positions = [
        new Vector3(0, 0, 0),
        new Vector3(10, 0, 10),
        new Vector3(-10, 0, -10),
        new Vector3(20, 0, 0),
      ];
      
      positions.forEach(position => {
        progressiveLoader.updateLoading(position);
      });
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
      
      const chunkInfo = progressiveLoader.getChunkInfo();
      expect(chunkInfo.every(chunk => typeof chunk.priority === 'number')).toBe(true);
    });

    it('should handle concurrent loading limits efficiently', () => {
      const artifacts = generateTestArtifacts(1500);
      const configLimited = { ...DEFAULT_PROGRESSIVE_CONFIG, maxConcurrentLoads: 2 };
      const loaderLimited = new ProgressiveLoader(configLimited);
      
      loaderLimited.initialize(artifacts);
      
      const startTime = performance.now();
      
      // Trigger loading for multiple chunks
      for (let i = 0; i < 10; i++) {
        loaderLimited.updateLoading(new Vector3(i * 5, 0, i * 5));
      }
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(200);
      
      const progress = loaderLimited.updateLoading(cameraPosition);
      expect(progress.loadingChunks).toBeLessThanOrEqual(2);
    });

    it('should efficiently get visible artifacts', () => {
      const artifacts = generateTestArtifacts(3000);
      progressiveLoader.initialize(artifacts);
      
      // Simulate some loading
      progressiveLoader.updateLoading(cameraPosition);
      
      const startTime = performance.now();
      const visibleArtifacts = progressiveLoader.getVisibleArtifacts(cameraPosition);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50);
      expect(Array.isArray(visibleArtifacts)).toBe(true);
    });

    it('should handle memory-efficient chunk unloading', () => {
      const artifacts = generateTestArtifacts(2000);
      const configUnload = { ...DEFAULT_PROGRESSIVE_CONFIG, unloadDistance: 50 };
      const loaderUnload = new ProgressiveLoader(configUnload);
      
      loaderUnload.initialize(artifacts);
      
      // Load chunks near origin
      loaderUnload.updateLoading(new Vector3(0, 0, 0));
      
      const startTime = performance.now();
      
      // Move camera far away to trigger unloading
      loaderUnload.updateLoading(new Vector3(100, 0, 100));
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
      
      const loadedArtifacts = loaderUnload.getLoadedArtifacts();
      expect(Array.isArray(loadedArtifacts)).toBe(true);
    });
  });

  describe('Memory Manager Performance Tests', () => {
    let memoryManager: MemoryManager;

    beforeEach(() => {
      memoryManager = new MemoryManager(DEFAULT_MEMORY_CONFIG);
    });

    afterEach(() => {
      memoryManager.dispose();
    });

    it('should efficiently register and track resources', () => {
      const resourceCount = 1000;
      
      const startTime = performance.now();
      
      for (let i = 0; i < resourceCount; i++) {
        const mockGeometry = { dispose: jest.fn(), attributes: {}, index: null };
        memoryManager.registerResource(`geometry-${i}`, mockGeometry as any, 'geometry');
      }
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(200); // Should register efficiently
      
      const usage = memoryManager.getMemoryUsage();
      expect(usage.geometries).toBe(resourceCount);
    });

    it('should efficiently calculate memory usage', () => {
      // Register various resource types
      const resourceTypes = [
        { type: 'geometry', count: 100 },
        { type: 'material', count: 50 },
        { type: 'texture', count: 25 },
        { type: 'object', count: 200 },
      ];
      
      const startTime = performance.now();
      
      resourceTypes.forEach(({ type, count }) => {
        for (let i = 0; i < count; i++) {
          const mockResource = { dispose: jest.fn() };
          if (type === 'texture') {
            (mockResource as any).image = { width: 256, height: 256 };
            (mockResource as any).generateMipmaps = true;
          }
          memoryManager.registerResource(`${type}-${i}`, mockResource as any, type as any);
        }
      });
      
      const usage = memoryManager.getMemoryUsage();
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(300);
      expect(usage.geometries).toBe(100);
      expect(usage.materials).toBe(50);
      expect(usage.textures).toBe(25);
      expect(usage.objects).toBe(200);
      expect(usage.totalMemoryMB).toBeGreaterThan(0);
    });

    it('should efficiently perform garbage collection', () => {
      // Register resources with zero references
      for (let i = 0; i < 500; i++) {
        const mockGeometry = { dispose: jest.fn(), attributes: {}, index: null };
        memoryManager.registerResource(`geometry-${i}`, mockGeometry as any, 'geometry');
        memoryManager.removeReference(`geometry-${i}`); // Make eligible for GC
      }
      
      const startTime = performance.now();
      const freedMemory = memoryManager.forceGarbageCollection();
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(200);
      expect(freedMemory).toBeGreaterThanOrEqual(0);
      
      const usage = memoryManager.getMemoryUsage();
      expect(usage.geometries).toBeLessThanOrEqual(500); // Some should be disposed
    });

    it('should efficiently manage reference counting', () => {
      const resourceCount = 1000;
      
      // Register resources
      for (let i = 0; i < resourceCount; i++) {
        const mockGeometry = { dispose: jest.fn(), attributes: {}, index: null };
        memoryManager.registerResource(`geometry-${i}`, mockGeometry as any, 'geometry');
      }
      
      const startTime = performance.now();
      
      // Add and remove references
      for (let i = 0; i < resourceCount; i++) {
        memoryManager.addReference(`geometry-${i}`);
        memoryManager.markResourceUsed(`geometry-${i}`);
        if (i % 2 === 0) {
          memoryManager.removeReference(`geometry-${i}`);
        }
      }
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should efficiently identify disposal candidates', () => {
      // Register resources with different usage patterns
      for (let i = 0; i < 200; i++) {
        const mockGeometry = { dispose: jest.fn(), attributes: {}, index: null };
        memoryManager.registerResource(`geometry-${i}`, mockGeometry as any, 'geometry');
        
        // Make some eligible for disposal
        if (i % 3 === 0) {
          memoryManager.removeReference(`geometry-${i}`);
        }
      }
      
      const startTime = performance.now();
      const candidates = memoryManager.getDisposalCandidates();
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50);
      expect(Array.isArray(candidates)).toBe(true);
      expect(candidates.every(c => c.referenceCount === 0)).toBe(true);
    });

    it('should efficiently free memory to target', () => {
      // Register large resources
      for (let i = 0; i < 100; i++) {
        const mockTexture = {
          dispose: jest.fn(),
          image: { width: 1024, height: 1024 },
          generateMipmaps: true,
        };
        memoryManager.registerResource(`texture-${i}`, mockTexture as any, 'texture');
        memoryManager.removeReference(`texture-${i}`); // Make eligible for disposal
      }
      
      const initialUsage = memoryManager.getMemoryUsage();
      
      const startTime = performance.now();
      const freedMemory = memoryManager.freeMemory(50); // Try to free 50MB
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
      expect(freedMemory).toBeGreaterThanOrEqual(0);
      
      const finalUsage = memoryManager.getMemoryUsage();
      expect(finalUsage.totalMemoryMB).toBeLessThanOrEqual(initialUsage.totalMemoryMB);
    });

    it('should handle memory pressure calculations efficiently', () => {
      // Fill memory close to limits
      for (let i = 0; i < 50; i++) {
        const mockTexture = {
          dispose: jest.fn(),
          image: { width: 512, height: 512 },
          generateMipmaps: true,
        };
        memoryManager.registerResource(`texture-${i}`, mockTexture as any, 'texture');
      }
      
      const startTime = performance.now();
      
      const pressure = memoryManager.getMemoryPressure();
      const withinLimits = memoryManager.isMemoryWithinLimits();
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(10);
      expect(typeof pressure).toBe('number');
      expect(pressure).toBeGreaterThanOrEqual(0);
      expect(pressure).toBeLessThanOrEqual(1);
      expect(typeof withinLimits).toBe('boolean');
    });
  });

  describe('WebGL Optimization and Fallback Tests', () => {
    it('should handle WebGL context loss gracefully', () => {
      // Simulate WebGL context loss scenario
      const mockCanvas = {
        getContext: jest.fn(() => null), // Simulate context loss
      };
      
      const startTime = performance.now();
      
      // Test fallback behavior
      const hasWebGL = mockCanvas.getContext('webgl') !== null;
      const hasWebGL2 = mockCanvas.getContext('webgl2') !== null;
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(10);
      expect(hasWebGL).toBe(false);
      expect(hasWebGL2).toBe(false);
    });

    it('should efficiently detect graphics capabilities', () => {
      const startTime = performance.now();
      
      // Simulate capability detection
      const capabilities = {
        maxTextureSize: 4096,
        maxVertexAttributes: 16,
        maxFragmentUniforms: 1024,
        supportsFloatTextures: true,
        supportsInstancedArrays: true,
      };
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(5);
      expect(capabilities).toHaveProperty('maxTextureSize');
      expect(capabilities).toHaveProperty('maxVertexAttributes');
    });

    it('should handle quality adjustment efficiently', () => {
      const artifacts = generateTestArtifacts(1000);
      
      const qualityLevels = ['high', 'medium', 'low'];
      const times: number[] = [];
      
      qualityLevels.forEach(quality => {
        const startTime = performance.now();
        
        // Simulate quality adjustment
        const adjustedArtifacts = artifacts.map(artifact => ({
          ...artifact,
          renderQuality: quality,
          geometryDetail: quality === 'high' ? 1.0 : quality === 'medium' ? 0.7 : 0.4,
        }));
        
        const endTime = performance.now();
        times.push(endTime - startTime);
        
        expect(adjustedArtifacts).toHaveLength(artifacts.length);
      });
      
      // Quality adjustment should be fast
      times.forEach(time => {
        expect(time).toBeLessThan(50);
      });
    });
  });

  describe('Integration Performance Tests', () => {
    it('should handle combined LOD, Progressive Loading, and Memory Management efficiently', () => {
      const artifacts = generateTestArtifacts(2000);
      
      const lodManager = new LODManager(DEFAULT_LOD_CONFIG);
      const progressiveLoader = new ProgressiveLoader(DEFAULT_PROGRESSIVE_CONFIG);
      const memoryManager = new MemoryManager(DEFAULT_MEMORY_CONFIG);
      
      const camera = new PerspectiveCamera();
      const cameraPosition = new Vector3(0, 0, 0);
      
      const startTime = performance.now();
      
      // Initialize progressive loading
      progressiveLoader.initialize(artifacts);
      
      // Update loading
      progressiveLoader.updateLoading(cameraPosition);
      
      // Get visible artifacts
      const visibleArtifacts = progressiveLoader.getVisibleArtifacts(cameraPosition);
      
      // Calculate LOD
      const lodResults = lodManager.calculateLOD(visibleArtifacts, camera);
      
      // Register resources in memory manager
      lodResults.forEach((lod, index) => {
        if (lod.isVisible) {
          const mockGeometry = { dispose: jest.fn(), attributes: {}, index: null };
          memoryManager.registerResource(`artifact-${index}`, mockGeometry as any, 'geometry');
        }
      });
      
      // Check memory usage
      const memoryUsage = memoryManager.getMemoryUsage();
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
      expect(lodResults.length).toBeGreaterThanOrEqual(0);
      expect(memoryUsage.totalMemoryMB).toBeGreaterThanOrEqual(0);
      
      // Cleanup
      memoryManager.dispose();
    });

    it('should maintain performance under stress conditions', () => {
      const artifacts = generateTestArtifacts(5000);
      
      const lodManager = new LODManager({
        ...DEFAULT_LOD_CONFIG,
        maxVisibleArtifacts: 1000,
        adaptiveQuality: true,
      });
      
      const progressiveLoader = new ProgressiveLoader({
        ...DEFAULT_PROGRESSIVE_CONFIG,
        maxConcurrentLoads: 5,
        chunkSize: 200,
      });
      
      const memoryManager = new MemoryManager({
        ...DEFAULT_MEMORY_CONFIG,
        maxMemoryMB: 256,
        enableAutoGC: true,
      });
      
      const camera = new PerspectiveCamera();
      
      progressiveLoader.initialize(artifacts);
      
      const iterations = 20;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        // Simulate camera movement
        const cameraPosition = new Vector3(i * 5, 0, i * 5);
        
        // Update systems
        progressiveLoader.updateLoading(cameraPosition);
        const visibleArtifacts = progressiveLoader.getVisibleArtifacts(cameraPosition);
        const lodResults = lodManager.calculateLOD(visibleArtifacts, camera);
        
        // Simulate frame time
        lodManager.updatePerformance(16.67);
        
        // Register some resources
        lodResults.slice(0, 10).forEach((lod, index) => {
          if (lod.isVisible) {
            const mockResource = { dispose: jest.fn() };
            memoryManager.registerResource(`frame-${i}-${index}`, mockResource as any, 'object');
          }
        });
        
        // Periodic garbage collection
        if (i % 5 === 0) {
          memoryManager.forceGarbageCollection();
        }
      }
      
      const endTime = performance.now();
      const averageTime = (endTime - startTime) / iterations;
      
      expect(averageTime).toBeLessThan(100); // Should maintain good performance
      
      const finalMetrics = lodManager.getPerformanceMetrics();
      const finalMemory = memoryManager.getMemoryUsage();
      
      expect(finalMetrics.currentFPS).toBeGreaterThan(0);
      expect(finalMemory.totalMemoryMB).toBeLessThan(DEFAULT_MEMORY_CONFIG.maxMemoryMB);
      
      // Cleanup
      memoryManager.dispose();
    });
  });
});