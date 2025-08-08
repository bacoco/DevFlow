/**
 * WebGL Compatibility and Fallback Tests
 * Tests for WebGL optimization, fallback rendering modes, and cross-browser compatibility
 */

// Mock WebGL context for testing
const mockWebGLContext = {
  getParameter: jest.fn(),
  getExtension: jest.fn(),
  createShader: jest.fn(),
  createProgram: jest.fn(),
  deleteShader: jest.fn(),
  deleteProgram: jest.fn(),
  useProgram: jest.fn(),
  bindBuffer: jest.fn(),
  bufferData: jest.fn(),
  drawArrays: jest.fn(),
  drawElements: jest.fn(),
  viewport: jest.fn(),
  clear: jest.fn(),
  clearColor: jest.fn(),
  enable: jest.fn(),
  disable: jest.fn(),
  isContextLost: jest.fn(() => false),
};

// Mock Canvas for testing
const mockCanvas = {
  getContext: jest.fn(),
  width: 800,
  height: 600,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock WebGL constants
const GL_CONSTANTS = {
  VERTEX_SHADER: 35633,
  FRAGMENT_SHADER: 35632,
  ARRAY_BUFFER: 34962,
  ELEMENT_ARRAY_BUFFER: 34963,
  STATIC_DRAW: 35044,
  TRIANGLES: 4,
  MAX_TEXTURE_SIZE: 3379,
  MAX_VERTEX_ATTRIBS: 34921,
  MAX_FRAGMENT_UNIFORM_VECTORS: 36349,
  RENDERER: 7937,
  VERSION: 7938,
  VENDOR: 7936,
};

interface WebGLCapabilities {
  maxTextureSize: number;
  maxVertexAttributes: number;
  maxFragmentUniforms: number;
  supportsFloatTextures: boolean;
  supportsInstancedArrays: boolean;
  supportsVertexArrayObjects: boolean;
  maxAnisotropy: number;
  renderer: string;
  version: string;
  vendor: string;
}

interface RenderingFallback {
  level: 'webgl2' | 'webgl1' | 'canvas2d' | 'svg';
  features: string[];
  performance: 'high' | 'medium' | 'low';
  limitations: string[];
}

class WebGLCapabilityDetector {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private gl2: WebGL2RenderingContext | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  detectCapabilities(): WebGLCapabilities | null {
    // Try WebGL2 first
    this.gl2 = this.canvas.getContext('webgl2') as WebGL2RenderingContext;
    if (this.gl2) {
      this.gl = this.gl2;
    } else {
      // Fallback to WebGL1
      this.gl = this.canvas.getContext('webgl') as WebGLRenderingContext;
    }

    if (!this.gl) {
      return null;
    }

    return {
      maxTextureSize: this.gl.getParameter(GL_CONSTANTS.MAX_TEXTURE_SIZE),
      maxVertexAttributes: this.gl.getParameter(GL_CONSTANTS.MAX_VERTEX_ATTRIBS),
      maxFragmentUniforms: this.gl.getParameter(GL_CONSTANTS.MAX_FRAGMENT_UNIFORM_VECTORS),
      supportsFloatTextures: this.checkFloatTextureSupport(),
      supportsInstancedArrays: this.checkInstancedArraySupport(),
      supportsVertexArrayObjects: this.checkVAOSupport(),
      maxAnisotropy: this.getMaxAnisotropy(),
      renderer: this.gl.getParameter(GL_CONSTANTS.RENDERER),
      version: this.gl.getParameter(GL_CONSTANTS.VERSION),
      vendor: this.gl.getParameter(GL_CONSTANTS.VENDOR),
    };
  }

  private checkFloatTextureSupport(): boolean {
    if (!this.gl) return false;
    return !!this.gl.getExtension('OES_texture_float');
  }

  private checkInstancedArraySupport(): boolean {
    if (!this.gl) return false;
    return !!(
      this.gl.getExtension('ANGLE_instanced_arrays') ||
      (this.gl2 && 'drawArraysInstanced' in this.gl2)
    );
  }

  private checkVAOSupport(): boolean {
    if (!this.gl) return false;
    return !!(
      this.gl.getExtension('OES_vertex_array_object') ||
      (this.gl2 && 'createVertexArray' in this.gl2)
    );
  }

  private getMaxAnisotropy(): number {
    if (!this.gl) return 1;
    const ext = this.gl.getExtension('EXT_texture_filter_anisotropic');
    if (ext) {
      return this.gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
    }
    return 1;
  }

  isContextLost(): boolean {
    return this.gl ? this.gl.isContextLost() : true;
  }
}

class RenderingFallbackManager {
  private capabilities: WebGLCapabilities | null;
  private currentFallback: RenderingFallback;

  constructor(capabilities: WebGLCapabilities | null) {
    this.capabilities = capabilities;
    this.currentFallback = this.determineFallback();
  }

  private determineFallback(): RenderingFallback {
    if (!this.capabilities) {
      return {
        level: 'canvas2d',
        features: ['basic-shapes', 'text-rendering'],
        performance: 'low',
        limitations: ['no-3d', 'no-shaders', 'limited-effects'],
      };
    }

    // Check for WebGL2 features
    if (this.capabilities.version.includes('WebGL 2.0')) {
      return {
        level: 'webgl2',
        features: ['instancing', 'vao', 'transform-feedback', 'uniform-buffers'],
        performance: 'high',
        limitations: [],
      };
    }

    // WebGL1 with extensions
    const features: string[] = ['basic-3d'];
    const limitations: string[] = [];

    if (this.capabilities.supportsInstancedArrays) {
      features.push('instancing');
    } else {
      limitations.push('no-instancing');
    }

    if (this.capabilities.supportsFloatTextures) {
      features.push('float-textures');
    } else {
      limitations.push('no-float-textures');
    }

    if (this.capabilities.maxTextureSize < 2048) {
      limitations.push('limited-texture-size');
    }

    return {
      level: 'webgl1',
      features,
      performance: limitations.length > 2 ? 'low' : 'medium',
      limitations,
    };
  }

  getCurrentFallback(): RenderingFallback {
    return this.currentFallback;
  }

  shouldUseSimplifiedRendering(): boolean {
    return this.currentFallback.performance === 'low' || 
           this.currentFallback.limitations.length > 3;
  }

  getRecommendedSettings(): {
    maxArtifacts: number;
    lodLevels: number;
    textureResolution: number;
    enableShadows: boolean;
    enableAntialiasing: boolean;
  } {
    switch (this.currentFallback.performance) {
      case 'high':
        return {
          maxArtifacts: 5000,
          lodLevels: 4,
          textureResolution: 1024,
          enableShadows: true,
          enableAntialiasing: true,
        };
      case 'medium':
        return {
          maxArtifacts: 2000,
          lodLevels: 3,
          textureResolution: 512,
          enableShadows: false,
          enableAntialiasing: true,
        };
      case 'low':
        return {
          maxArtifacts: 500,
          lodLevels: 2,
          textureResolution: 256,
          enableShadows: false,
          enableAntialiasing: false,
        };
    }
  }
}

class PerformanceMonitor {
  private frameCount: number = 0;
  private lastTime: number = 0;
  private currentFPS: number = 60;
  private fpsHistory: number[] = [];
  private memoryUsage: number = 0;
  private renderTime: number = 0;

  update(deltaTime: number): void {
    this.frameCount++;
    const currentTime = performance.now();

    if (currentTime - this.lastTime >= 1000) {
      this.currentFPS = this.frameCount;
      this.frameCount = 0;
      this.lastTime = currentTime;

      this.fpsHistory.push(this.currentFPS);
      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift();
      }

      // Estimate memory usage (simplified)
      if ((performance as any).memory) {
        this.memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024;
      }
    }

    this.renderTime = deltaTime;
  }

  getCurrentFPS(): number {
    return this.currentFPS;
  }

  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return this.currentFPS;
    return this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
  }

  getMemoryUsage(): number {
    return this.memoryUsage;
  }

  getRenderTime(): number {
    return this.renderTime;
  }

  shouldReduceQuality(): boolean {
    return this.currentFPS < 30 || this.renderTime > 33.33; // Below 30fps or above 33ms frame time
  }

  shouldIncreaseQuality(): boolean {
    return this.currentFPS > 55 && this.renderTime < 16; // Above 55fps and below 16ms frame time
  }
}

describe('WebGL Compatibility and Optimization Tests', () => {
  let mockCanvasElement: HTMLCanvasElement;
  let capabilityDetector: WebGLCapabilityDetector;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock canvas
    mockCanvasElement = mockCanvas as any;
    capabilityDetector = new WebGLCapabilityDetector(mockCanvasElement);
  });

  describe('WebGL Capability Detection', () => {
    it('should detect WebGL2 capabilities efficiently', () => {
      // Mock WebGL2 support
      mockCanvas.getContext.mockImplementation((type) => {
        if (type === 'webgl2') {
          return {
            ...mockWebGLContext,
            getParameter: jest.fn((param) => {
              switch (param) {
                case GL_CONSTANTS.MAX_TEXTURE_SIZE: return 4096;
                case GL_CONSTANTS.MAX_VERTEX_ATTRIBS: return 16;
                case GL_CONSTANTS.MAX_FRAGMENT_UNIFORM_VECTORS: return 1024;
                case GL_CONSTANTS.RENDERER: return 'Mock WebGL2 Renderer';
                case GL_CONSTANTS.VERSION: return 'WebGL 2.0';
                case GL_CONSTANTS.VENDOR: return 'Mock Vendor';
                default: return 0;
              }
            }),
            getExtension: jest.fn(() => ({ MAX_TEXTURE_MAX_ANISOTROPY_EXT: 16 })),
            drawArraysInstanced: jest.fn(),
            createVertexArray: jest.fn(),
          };
        }
        return null;
      });

      const startTime = performance.now();
      const capabilities = capabilityDetector.detectCapabilities();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50); // Should be fast
      expect(capabilities).not.toBeNull();
      expect(capabilities!.maxTextureSize).toBe(4096);
      expect(capabilities!.supportsInstancedArrays).toBe(true);
      expect(capabilities!.supportsVertexArrayObjects).toBe(true);
      expect(capabilities!.version).toContain('WebGL 2.0');
    });

    it('should fallback to WebGL1 when WebGL2 is not available', () => {
      // Mock WebGL1 only support
      mockCanvas.getContext.mockImplementation((type) => {
        if (type === 'webgl') {
          return {
            ...mockWebGLContext,
            getParameter: jest.fn((param) => {
              switch (param) {
                case GL_CONSTANTS.MAX_TEXTURE_SIZE: return 2048;
                case GL_CONSTANTS.MAX_VERTEX_ATTRIBS: return 8;
                case GL_CONSTANTS.MAX_FRAGMENT_UNIFORM_VECTORS: return 256;
                case GL_CONSTANTS.RENDERER: return 'Mock WebGL1 Renderer';
                case GL_CONSTANTS.VERSION: return 'WebGL 1.0';
                case GL_CONSTANTS.VENDOR: return 'Mock Vendor';
                default: return 0;
              }
            }),
            getExtension: jest.fn((name) => {
              if (name === 'OES_texture_float') return {};
              if (name === 'ANGLE_instanced_arrays') return {};
              return null;
            }),
          };
        }
        return null;
      });

      const startTime = performance.now();
      const capabilities = capabilityDetector.detectCapabilities();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
      expect(capabilities).not.toBeNull();
      expect(capabilities!.maxTextureSize).toBe(2048);
      expect(capabilities!.supportsFloatTextures).toBe(true);
      expect(capabilities!.supportsInstancedArrays).toBe(true);
      expect(capabilities!.version).toContain('WebGL 1.0');
    });

    it('should handle no WebGL support gracefully', () => {
      // Mock no WebGL support
      mockCanvas.getContext.mockReturnValue(null);

      const startTime = performance.now();
      const capabilities = capabilityDetector.detectCapabilities();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(10);
      expect(capabilities).toBeNull();
    });

    it('should detect context loss efficiently', () => {
      mockCanvas.getContext.mockReturnValue({
        ...mockWebGLContext,
        isContextLost: jest.fn(() => true),
      });

      capabilityDetector.detectCapabilities();

      const startTime = performance.now();
      const isLost = capabilityDetector.isContextLost();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(5);
      expect(isLost).toBe(true);
    });
  });

  describe('Rendering Fallback Management', () => {
    it('should determine appropriate fallback for high-end devices', () => {
      const highEndCapabilities: WebGLCapabilities = {
        maxTextureSize: 4096,
        maxVertexAttributes: 16,
        maxFragmentUniforms: 1024,
        supportsFloatTextures: true,
        supportsInstancedArrays: true,
        supportsVertexArrayObjects: true,
        maxAnisotropy: 16,
        renderer: 'High-end GPU',
        version: 'WebGL 2.0',
        vendor: 'GPU Vendor',
      };

      const startTime = performance.now();
      const fallbackManager = new RenderingFallbackManager(highEndCapabilities);
      const fallback = fallbackManager.getCurrentFallback();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(10);
      expect(fallback.level).toBe('webgl2');
      expect(fallback.performance).toBe('high');
      expect(fallback.limitations).toHaveLength(0);
      expect(fallback.features).toContain('instancing');
    });

    it('should determine appropriate fallback for mid-range devices', () => {
      const midRangeCapabilities: WebGLCapabilities = {
        maxTextureSize: 2048,
        maxVertexAttributes: 8,
        maxFragmentUniforms: 256,
        supportsFloatTextures: false,
        supportsInstancedArrays: true,
        supportsVertexArrayObjects: false,
        maxAnisotropy: 4,
        renderer: 'Mid-range GPU',
        version: 'WebGL 1.0',
        vendor: 'GPU Vendor',
      };

      const startTime = performance.now();
      const fallbackManager = new RenderingFallbackManager(midRangeCapabilities);
      const fallback = fallbackManager.getCurrentFallback();
      const settings = fallbackManager.getRecommendedSettings();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(10);
      expect(fallback.level).toBe('webgl1');
      expect(fallback.performance).toBe('medium');
      expect(fallback.limitations).toContain('no-float-textures');
      expect(settings.maxArtifacts).toBe(2000);
      expect(settings.enableShadows).toBe(false);
    });

    it('should determine appropriate fallback for low-end devices', () => {
      const lowEndCapabilities: WebGLCapabilities = {
        maxTextureSize: 1024,
        maxVertexAttributes: 4,
        maxFragmentUniforms: 128,
        supportsFloatTextures: false,
        supportsInstancedArrays: false,
        supportsVertexArrayObjects: false,
        maxAnisotropy: 1,
        renderer: 'Low-end GPU',
        version: 'WebGL 1.0',
        vendor: 'GPU Vendor',
      };

      const startTime = performance.now();
      const fallbackManager = new RenderingFallbackManager(lowEndCapabilities);
      const fallback = fallbackManager.getCurrentFallback();
      const settings = fallbackManager.getRecommendedSettings();
      const shouldSimplify = fallbackManager.shouldUseSimplifiedRendering();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(10);
      expect(fallback.level).toBe('webgl1');
      expect(fallback.performance).toBe('low');
      expect(fallback.limitations.length).toBeGreaterThan(2);
      expect(settings.maxArtifacts).toBe(500);
      expect(settings.textureResolution).toBe(256);
      expect(shouldSimplify).toBe(true);
    });

    it('should handle no WebGL support with Canvas2D fallback', () => {
      const startTime = performance.now();
      const fallbackManager = new RenderingFallbackManager(null);
      const fallback = fallbackManager.getCurrentFallback();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(5);
      expect(fallback.level).toBe('canvas2d');
      expect(fallback.performance).toBe('low');
      expect(fallback.limitations).toContain('no-3d');
      expect(fallback.features).toContain('basic-shapes');
    });
  });

  describe('Performance Monitoring', () => {
    let performanceMonitor: PerformanceMonitor;

    beforeEach(() => {
      performanceMonitor = new PerformanceMonitor();
    });

    it('should monitor FPS efficiently', () => {
      const frameCount = 60;
      const startTime = performance.now();

      for (let i = 0; i < frameCount; i++) {
        performanceMonitor.update(16.67); // 60fps frame time
      }

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
      expect(performanceMonitor.getCurrentFPS()).toBeGreaterThan(0);
    });

    it('should detect when quality should be reduced', () => {
      // Simulate poor performance
      for (let i = 0; i < 30; i++) {
        performanceMonitor.update(40); // 25fps frame time
      }

      const shouldReduce = performanceMonitor.shouldReduceQuality();
      expect(shouldReduce).toBe(true);
    });

    it('should detect when quality can be increased', () => {
      // Simulate good performance - need to wait for FPS calculation
      performanceMonitor.update(14); // ~71fps frame time
      
      // Mock the internal FPS calculation
      (performanceMonitor as any).currentFPS = 60;
      (performanceMonitor as any).renderTime = 14;

      const shouldIncrease = performanceMonitor.shouldIncreaseQuality();
      expect(shouldIncrease).toBe(true);
    });

    it('should calculate average FPS accurately', () => {
      // Mock the FPS history directly for testing
      (performanceMonitor as any).fpsHistory = [60, 58, 62, 59, 61];

      const averageFPS = performanceMonitor.getAverageFPS();
      expect(averageFPS).toBeGreaterThan(55);
      expect(averageFPS).toBeLessThan(65);
    });

    it('should track render time efficiently', () => {
      const renderTimes = [12, 15, 18, 14, 16];

      renderTimes.forEach(time => {
        performanceMonitor.update(time);
      });

      const currentRenderTime = performanceMonitor.getRenderTime();
      expect(currentRenderTime).toBe(16); // Last render time
    });
  });

  describe('Cross-Browser Compatibility', () => {
    const browserConfigs = [
      {
        name: 'Chrome',
        webgl2: true,
        extensions: ['ANGLE_instanced_arrays', 'OES_texture_float', 'EXT_texture_filter_anisotropic'],
        maxTextureSize: 4096,
      },
      {
        name: 'Firefox',
        webgl2: true,
        extensions: ['ANGLE_instanced_arrays', 'OES_texture_float'],
        maxTextureSize: 4096,
      },
      {
        name: 'Safari',
        webgl2: false,
        extensions: ['ANGLE_instanced_arrays'],
        maxTextureSize: 2048,
      },
      {
        name: 'Edge',
        webgl2: true,
        extensions: ['ANGLE_instanced_arrays', 'OES_texture_float', 'EXT_texture_filter_anisotropic'],
        maxTextureSize: 4096,
      },
    ];

    browserConfigs.forEach(config => {
      it(`should handle ${config.name} capabilities efficiently`, () => {
        // Mock browser-specific WebGL context
        mockCanvas.getContext.mockImplementation((type) => {
          if (type === 'webgl2' && config.webgl2) {
            return {
              ...mockWebGLContext,
              getParameter: jest.fn((param) => {
                switch (param) {
                  case GL_CONSTANTS.MAX_TEXTURE_SIZE: return config.maxTextureSize;
                  case GL_CONSTANTS.RENDERER: return `${config.name} Renderer`;
                  case GL_CONSTANTS.VERSION: return 'WebGL 2.0';
                  default: return 256;
                }
              }),
              getExtension: jest.fn((name) => config.extensions.includes(name) ? {} : null),
              drawArraysInstanced: jest.fn(),
            };
          } else if (type === 'webgl') {
            return {
              ...mockWebGLContext,
              getParameter: jest.fn((param) => {
                switch (param) {
                  case GL_CONSTANTS.MAX_TEXTURE_SIZE: return config.maxTextureSize;
                  case GL_CONSTANTS.RENDERER: return `${config.name} Renderer`;
                  case GL_CONSTANTS.VERSION: return 'WebGL 1.0';
                  default: return 128;
                }
              }),
              getExtension: jest.fn((name) => config.extensions.includes(name) ? {} : null),
            };
          }
          return null;
        });

        const startTime = performance.now();
        
        const detector = new WebGLCapabilityDetector(mockCanvasElement);
        const capabilities = detector.detectCapabilities();
        const fallbackManager = new RenderingFallbackManager(capabilities);
        const fallback = fallbackManager.getCurrentFallback();
        
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(50);
        expect(capabilities).not.toBeNull();
        expect(capabilities!.maxTextureSize).toBe(config.maxTextureSize);
        expect(fallback.level).toBe(config.webgl2 ? 'webgl2' : 'webgl1');
      });
    });

    it('should handle mobile device limitations', () => {
      // Mock mobile device capabilities
      mockCanvas.getContext.mockImplementation((type) => {
        if (type === 'webgl') {
          return {
            ...mockWebGLContext,
            getParameter: jest.fn((param) => {
              switch (param) {
                case GL_CONSTANTS.MAX_TEXTURE_SIZE: return 1024; // Limited texture size
                case GL_CONSTANTS.MAX_VERTEX_ATTRIBS: return 8;
                case GL_CONSTANTS.MAX_FRAGMENT_UNIFORM_VECTORS: return 64; // Very limited
                case GL_CONSTANTS.RENDERER: return 'Mobile GPU';
                case GL_CONSTANTS.VERSION: return 'WebGL 1.0';
                default: return 32;
              }
            }),
            getExtension: jest.fn(() => null), // No extensions
          };
        }
        return null;
      });

      const startTime = performance.now();
      
      const detector = new WebGLCapabilityDetector(mockCanvasElement);
      const capabilities = detector.detectCapabilities();
      const fallbackManager = new RenderingFallbackManager(capabilities);
      const settings = fallbackManager.getRecommendedSettings();
      
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(30);
      expect(capabilities!.maxTextureSize).toBe(1024);
      expect(settings.maxArtifacts).toBeLessThanOrEqual(500);
      expect(settings.textureResolution).toBeLessThanOrEqual(256);
      expect(settings.enableShadows).toBe(false);
    });
  });

  describe('Memory Management Integration', () => {
    it('should efficiently manage WebGL resources', () => {
      const resourceCount = 100;
      const resources: any[] = [];

      const startTime = performance.now();

      // Simulate creating WebGL resources
      for (let i = 0; i < resourceCount; i++) {
        const mockBuffer = {
          id: `buffer-${i}`,
          dispose: jest.fn(),
          size: 1024 * (i + 1),
        };
        resources.push(mockBuffer);
      }

      // Simulate disposing resources
      resources.forEach(resource => {
        resource.dispose();
      });

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
      expect(resources).toHaveLength(resourceCount);
      resources.forEach(resource => {
        expect(resource.dispose).toHaveBeenCalled();
      });
    });

    it('should handle context loss and recovery', () => {
      let contextLost = false;
      
      mockCanvas.getContext.mockImplementation(() => ({
        ...mockWebGLContext,
        isContextLost: () => contextLost,
      }));

      const detector = new WebGLCapabilityDetector(mockCanvasElement);
      detector.detectCapabilities();

      const startTime = performance.now();

      // Simulate context loss
      contextLost = true;
      expect(detector.isContextLost()).toBe(true);

      // Simulate context recovery
      contextLost = false;
      const recoveredCapabilities = detector.detectCapabilities();

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
      expect(recoveredCapabilities).not.toBeNull();
    });
  });

  describe('Stress Testing', () => {
    it('should maintain performance under high load', () => {
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        // Simulate rapid capability detection
        mockCanvas.getContext.mockReturnValue({
          ...mockWebGLContext,
          getParameter: jest.fn((param) => {
            if (param === GL_CONSTANTS.VERSION) return 'WebGL 1.0';
            if (param === GL_CONSTANTS.RENDERER) return 'Test Renderer';
            if (param === GL_CONSTANTS.VENDOR) return 'Test Vendor';
            return Math.random() * 4096;
          }),
          getExtension: jest.fn(() => ({})),
        });

        const detector = new WebGLCapabilityDetector(mockCanvasElement);
        const capabilities = detector.detectCapabilities();
        const fallbackManager = new RenderingFallbackManager(capabilities);
        fallbackManager.getCurrentFallback();
      }

      const endTime = performance.now();
      const averageTime = (endTime - startTime) / iterations;

      expect(averageTime).toBeLessThan(5); // Should be very fast per iteration
    });

    it('should handle rapid context switching', () => {
      const switchCount = 50;
      const startTime = performance.now();

      for (let i = 0; i < switchCount; i++) {
        // Alternate between WebGL2 and WebGL1
        const isWebGL2 = i % 2 === 0;
        
        mockCanvas.getContext.mockImplementation((type) => {
          if (type === 'webgl2' && isWebGL2) {
            return { ...mockWebGLContext, drawArraysInstanced: jest.fn() };
          } else if (type === 'webgl') {
            return mockWebGLContext;
          }
          return null;
        });

        const detector = new WebGLCapabilityDetector(mockCanvasElement);
        detector.detectCapabilities();
      }

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500);
    });
  });
});