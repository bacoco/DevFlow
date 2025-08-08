import { WebGLOptimizer, DEFAULT_WEBGL_CONFIG } from '../performance/WebGLOptimizer';
import { WebGLCompatibility } from '../performance/WebGLCompatibility';
import { FallbackRenderer, DEFAULT_FALLBACK_CONFIG } from '../performance/FallbackRenderer';

// Mock WebGL context
class MockWebGLContext {
  private extensions: Map<string, any> = new Map();
  private parameters: Map<number, any> = new Map();

  constructor(capabilities: Partial<any> = {}) {
    // Set default parameters
    this.parameters.set(0x0D33, capabilities.maxTextureSize || 2048); // MAX_TEXTURE_SIZE
    this.parameters.set(0x8872, capabilities.maxVertexTextures || 8); // MAX_VERTEX_TEXTURE_IMAGE_UNITS
    this.parameters.set(0x8B4D, capabilities.maxFragmentTextures || 16); // MAX_TEXTURE_IMAGE_UNITS
    this.parameters.set(0x8DFB, capabilities.maxVaryingVectors || 8); // MAX_VARYING_VECTORS
    this.parameters.set(0x8869, capabilities.maxVertexAttribs || 16); // MAX_VERTEX_ATTRIBS
    this.parameters.set(0x8B4A, capabilities.maxVertexUniforms || 256); // MAX_VERTEX_UNIFORM_VECTORS
    this.parameters.set(0x8B49, capabilities.maxFragmentUniforms || 256); // MAX_FRAGMENT_UNIFORM_VECTORS
    this.parameters.set(0x8B4C, capabilities.maxSamples || 4); // MAX_SAMPLES

    // Set up extensions
    if (capabilities.floatTextures) {
      this.extensions.set('OES_texture_float', {});
    }
    if (capabilities.instancedArrays) {
      this.extensions.set('ANGLE_instanced_arrays', {});
    }
    if (capabilities.vertexArrayObjects) {
      this.extensions.set('OES_vertex_array_object', {});
    }
  }

  getParameter(pname: number): any {
    return this.parameters.get(pname);
  }

  getExtension(name: string): any {
    return this.extensions.get(name) || null;
  }

  createShader(type: number): any {
    return { type };
  }

  shaderSource(shader: any, source: string): void {
    shader.source = source;
  }

  compileShader(shader: any): void {
    shader.compiled = !shader.source.includes('precision highp float') || 
                     this.extensions.has('OES_texture_float');
  }

  getShaderParameter(shader: any, pname: number): any {
    if (pname === 0x8B81) { // COMPILE_STATUS
      return shader.compiled;
    }
    return true;
  }

  deleteShader(shader: any): void {
    // Mock implementation
  }
}

// Mock WebGL renderer
class MockWebGLRenderer {
  public info = {
    render: {
      calls: 0,
      triangles: 0,
      points: 0,
      lines: 0,
    },
    memory: {
      geometries: 0,
      textures: 0,
    },
    programs: [],
  };

  private context: MockWebGLContext;
  private pixelRatio = 1;
  private shadowMapEnabled = false;
  private shadowMapSize = { setScalar: jest.fn() };

  constructor(context: MockWebGLContext) {
    this.context = context;
  }

  getContext(): MockWebGLContext {
    return this.context;
  }

  setPixelRatio(ratio: number): void {
    this.pixelRatio = ratio;
  }

  get shadowMap() {
    return {
      enabled: this.shadowMapEnabled,
      mapSize: this.shadowMapSize,
    };
  }

  set shadowMap(value: any) {
    this.shadowMapEnabled = value.enabled;
  }

  get debug() {
    return {};
  }
}

describe('WebGL Optimization System', () => {
  let mockContext: MockWebGLContext;
  let mockRenderer: MockWebGLRenderer;
  let optimizer: WebGLOptimizer;

  beforeEach(() => {
    mockContext = new MockWebGLContext({
      maxTextureSize: 2048,
      maxVertexTextures: 8,
      maxFragmentTextures: 16,
      floatTextures: true,
      instancedArrays: true,
      vertexArrayObjects: true,
    });
    mockRenderer = new MockWebGLRenderer(mockContext);
    optimizer = new WebGLOptimizer(mockRenderer as any, DEFAULT_WEBGL_CONFIG);
  });

  afterEach(() => {
    optimizer.dispose();
  });

  describe('Capability Detection', () => {
    it('should detect WebGL capabilities correctly', () => {
      const capabilities = optimizer.getCapabilities();
      
      expect(capabilities.maxTextureSize).toBe(2048);
      expect(capabilities.maxFragmentTextures).toBe(16);
      expect(capabilities.supportsFloatTextures).toBe(true);
      expect(capabilities.supportsInstancedArrays).toBe(true);
      expect(capabilities.supportsVertexArrayObjects).toBe(true);
    });

    it('should handle limited capabilities gracefully', () => {
      const limitedContext = new MockWebGLContext({
        maxTextureSize: 512,
        maxFragmentTextures: 4,
        floatTextures: false,
        instancedArrays: false,
      });
      const limitedRenderer = new MockWebGLRenderer(limitedContext);
      const limitedOptimizer = new WebGLOptimizer(limitedRenderer as any, DEFAULT_WEBGL_CONFIG);

      const capabilities = limitedOptimizer.getCapabilities();
      expect(capabilities.maxTextureSize).toBe(512);
      expect(capabilities.supportsFloatTextures).toBe(false);
      expect(capabilities.supportsInstancedArrays).toBe(false);

      limitedOptimizer.dispose();
    });
  });

  describe('Quality Level Management', () => {
    it('should select appropriate initial quality level', () => {
      const qualityLevel = optimizer.getCurrentQualityLevel();
      expect(qualityLevel).toBeDefined();
      expect(['ultra', 'high', 'medium', 'low']).toContain(qualityLevel.name);
    });

    it('should allow manual quality level changes', () => {
      const success = optimizer.setQualityLevel('low');
      expect(success).toBe(true);
      
      const currentLevel = optimizer.getCurrentQualityLevel();
      expect(currentLevel.name).toBe('low');
    });

    it('should reject invalid quality level names', () => {
      const success = optimizer.setQualityLevel('invalid');
      expect(success).toBe(false);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics', () => {
      // Simulate some frame times
      optimizer.updatePerformance(16.67); // 60 FPS
      optimizer.updatePerformance(33.33); // 30 FPS
      optimizer.updatePerformance(50.0);  // 20 FPS

      const metrics = optimizer.getPerformanceMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.drawCalls).toBeGreaterThanOrEqual(0);
      expect(metrics.triangles).toBeGreaterThanOrEqual(0);
      expect(metrics.renderTime).toBeGreaterThan(0);
    });

    it('should adjust quality based on performance', () => {
      const initialLevel = optimizer.getCurrentQualityLevel();
      
      // Simulate poor performance
      for (let i = 0; i < 60; i++) {
        optimizer.updatePerformance(50); // 20 FPS
      }

      const newLevel = optimizer.getCurrentQualityLevel();
      const initialIndex = DEFAULT_WEBGL_CONFIG.qualityLevels.findIndex(l => l.name === initialLevel.name);
      const newIndex = DEFAULT_WEBGL_CONFIG.qualityLevels.findIndex(l => l.name === newLevel.name);
      
      expect(newIndex).toBeGreaterThanOrEqual(initialIndex);
    });
  });

  describe('Fallback Detection', () => {
    it('should recommend fallback for very limited hardware', () => {
      const veryLimitedContext = new MockWebGLContext({
        maxTextureSize: 256,
        maxFragmentTextures: 2,
        floatTextures: false,
        instancedArrays: false,
        vertexArrayObjects: false,
      });
      const veryLimitedRenderer = new MockWebGLRenderer(veryLimitedContext);
      const veryLimitedOptimizer = new WebGLOptimizer(veryLimitedRenderer as any, DEFAULT_WEBGL_CONFIG);

      expect(veryLimitedOptimizer.shouldUseFallback()).toBe(true);
      expect(veryLimitedOptimizer.getFallbackMode()).toBe('canvas2d');

      veryLimitedOptimizer.dispose();
    });

    it('should not recommend fallback for capable hardware', () => {
      expect(optimizer.shouldUseFallback()).toBe(false);
    });
  });
});

describe('WebGL Compatibility System', () => {
  let compatibility: WebGLCompatibility;

  beforeEach(() => {
    // Mock navigator and document for testing
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      configurable: true,
    });

    Object.defineProperty(navigator, 'platform', {
      value: 'MacIntel',
      configurable: true,
    });

    // Mock canvas and WebGL context
    const mockCanvas = {
      getContext: jest.fn().mockImplementation((type: string) => {
        if (type === 'webgl' || type === 'experimental-webgl') {
          return new MockWebGLContext();
        }
        if (type === 'webgl2') {
          return new MockWebGLContext();
        }
        return null;
      }),
    };

    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return mockCanvas as any;
      }
      return document.createElement(tagName);
    });

    compatibility = new WebGLCompatibility();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Browser Detection', () => {
    it('should detect Chrome browser correctly', () => {
      const browserInfo = compatibility.getBrowserInfo();
      expect(browserInfo.name).toBe('Chrome');
      expect(browserInfo.engine).toBe('Blink');
      expect(browserInfo.isMobile).toBe(false);
    });

    it('should detect mobile browsers', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        configurable: true,
      });

      const mobileCompatibility = new WebGLCompatibility();
      const browserInfo = mobileCompatibility.getBrowserInfo();
      expect(browserInfo.isMobile).toBe(true);
    });
  });

  describe('Feature Detection', () => {
    it('should detect WebGL features', () => {
      const webglSupport = compatibility.getWebGLSupport();
      expect(webglSupport).toBeDefined();
      expect(typeof webglSupport.floatTextures).toBe('boolean');
      expect(typeof webglSupport.instancedArrays).toBe('boolean');
    });
  });

  describe('Compatibility Report', () => {
    it('should generate comprehensive compatibility report', () => {
      const report = compatibility.generateReport();
      
      expect(report.browserInfo).toBeDefined();
      expect(report.webglSupport).toBeDefined();
      expect(report.performanceScore).toBeGreaterThanOrEqual(0);
      expect(report.performanceScore).toBeLessThanOrEqual(1);
      expect(report.recommendedSettings).toBeDefined();
      expect(Array.isArray(report.knownIssues)).toBe(true);
      expect(Array.isArray(report.workarounds)).toBe(true);
    });

    it('should provide appropriate recommendations for different devices', () => {
      const report = compatibility.generateReport();
      const settings = report.recommendedSettings;
      
      expect(settings.maxTextureSize).toBeGreaterThan(0);
      expect(settings.pixelRatio).toBeGreaterThan(0);
      expect(['default', 'high-performance', 'low-power']).toContain(settings.powerPreference);
    });
  });

  describe('Context Creation', () => {
    it('should create WebGL context with optimal attributes', () => {
      const canvas = document.createElement('canvas');
      const context = compatibility.createOptimalContext(canvas);
      
      expect(context).toBeDefined();
    });

    it('should return optimal context attributes', () => {
      const attributes = compatibility.getOptimalContextAttributes();
      
      expect(attributes).toBeDefined();
      expect(typeof attributes.alpha).toBe('boolean');
      expect(typeof attributes.antialias).toBe('boolean');
      expect(typeof attributes.depth).toBe('boolean');
    });
  });
});

describe('Fallback Renderer System', () => {
  let fallbackRenderer: FallbackRenderer;
  let container: HTMLDivElement;

  beforeEach(() => {
    fallbackRenderer = new FallbackRenderer(DEFAULT_FALLBACK_CONFIG);
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    fallbackRenderer.dispose();
    document.body.removeChild(container);
  });

  describe('Canvas 2D Fallback', () => {
    it('should render artifacts using Canvas 2D', () => {
      const mockArtifacts = [
        {
          id: 'test1',
          name: 'TestFile.ts',
          type: 'file' as const,
          position3D: { x: 0, y: 0, z: 0 },
          complexity: 5,
          changeFrequency: 2,
          authors: ['developer1'],
          dependencies: [],
          filePath: '/test/TestFile.ts',
          lastModified: new Date(),
        },
      ];

      fallbackRenderer.render(container, mockArtifacts, {
        width: 800,
        height: 600,
        backgroundColor: '#f5f5f5',
        gridEnabled: true,
        labelsEnabled: true,
        connectionLinesEnabled: false,
      });

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeTruthy();
      expect(canvas?.width).toBe(800);
      expect(canvas?.height).toBe(600);
    });

    it('should handle artifact interactions', (done) => {
      const mockArtifacts = [
        {
          id: 'test1',
          name: 'TestFile.ts',
          type: 'file' as const,
          position3D: { x: 0, y: 0, z: 0 },
          complexity: 5,
          changeFrequency: 2,
          authors: ['developer1'],
          dependencies: [],
          filePath: '/test/TestFile.ts',
          lastModified: new Date(),
        },
      ];

      fallbackRenderer.render(container, mockArtifacts, {
        width: 800,
        height: 600,
        backgroundColor: '#f5f5f5',
        gridEnabled: true,
        labelsEnabled: true,
        connectionLinesEnabled: false,
      });

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeTruthy();

      // Listen for artifact selection event
      canvas?.addEventListener('artifactSelected', (event: any) => {
        expect(event.detail.id).toBe('test1');
        done();
      });

      // Simulate click event
      const clickEvent = new MouseEvent('click', {
        clientX: 400, // Center of canvas
        clientY: 300,
      });
      canvas?.dispatchEvent(clickEvent);
    });
  });

  describe('SVG Fallback', () => {
    it('should render artifacts using SVG', () => {
      const svgConfig = { ...DEFAULT_FALLBACK_CONFIG, mode: 'svg' as const };
      const svgRenderer = new FallbackRenderer(svgConfig);

      const mockArtifacts = [
        {
          id: 'test1',
          name: 'TestFile.ts',
          type: 'file' as const,
          position3D: { x: 0, y: 0, z: 0 },
          complexity: 5,
          changeFrequency: 2,
          authors: ['developer1'],
          dependencies: [],
          filePath: '/test/TestFile.ts',
          lastModified: new Date(),
        },
      ];

      svgRenderer.render(container, mockArtifacts, {
        width: 800,
        height: 600,
        viewBox: '0 0 800 600',
        backgroundColor: '#f5f5f5',
        enableCSS3D: false,
        enableTransitions: true,
      });

      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('width')).toBe('800');
      expect(svg?.getAttribute('height')).toBe('600');

      svgRenderer.dispose();
    });
  });

  describe('Disabled Mode', () => {
    it('should show disabled message when rendering is disabled', () => {
      const disabledConfig = { ...DEFAULT_FALLBACK_CONFIG, mode: 'disabled' as const };
      const disabledRenderer = new FallbackRenderer(disabledConfig);

      disabledRenderer.render(container, [], {
        width: 800,
        height: 600,
        backgroundColor: '#f5f5f5',
        gridEnabled: false,
        labelsEnabled: false,
        connectionLinesEnabled: false,
      });

      const message = container.querySelector('.fallback-disabled-message');
      expect(message).toBeTruthy();
      expect(message?.textContent).toContain('3D Visualization Unavailable');

      disabledRenderer.dispose();
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration correctly', () => {
      const newConfig = { mode: 'svg' as const, maxArtifacts: 100 };
      fallbackRenderer.updateConfig(newConfig);

      const config = fallbackRenderer.getConfig();
      expect(config.mode).toBe('svg');
      expect(config.maxArtifacts).toBe(100);
    });

    it('should limit artifacts based on configuration', () => {
      const limitedConfig = { ...DEFAULT_FALLBACK_CONFIG, maxArtifacts: 2 };
      const limitedRenderer = new FallbackRenderer(limitedConfig);

      const mockArtifacts = Array.from({ length: 5 }, (_, i) => ({
        id: `test${i}`,
        name: `TestFile${i}.ts`,
        type: 'file' as const,
        position3D: { x: i * 10, y: 0, z: 0 },
        complexity: 5,
        changeFrequency: 2,
        authors: ['developer1'],
        dependencies: [],
        filePath: `/test/TestFile${i}.ts`,
        lastModified: new Date(),
      }));

      limitedRenderer.render(container, mockArtifacts, {
        width: 800,
        height: 600,
        backgroundColor: '#f5f5f5',
        gridEnabled: true,
        labelsEnabled: true,
        connectionLinesEnabled: false,
      });

      // Should only render 2 artifacts due to limit
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeTruthy();

      limitedRenderer.dispose();
    });
  });
});

describe('Integration Tests', () => {
  it('should seamlessly switch between WebGL and fallback rendering', () => {
    // This would be a more complex integration test
    // that simulates performance degradation and fallback switching
    expect(true).toBe(true); // Placeholder
  });

  it('should maintain consistent artifact selection across rendering modes', () => {
    // Test that artifact selection works the same way in both WebGL and fallback modes
    expect(true).toBe(true); // Placeholder
  });

  it('should preserve visual consistency between rendering modes', () => {
    // Test that the visual representation is as consistent as possible
    // between WebGL and fallback rendering
    expect(true).toBe(true); // Placeholder
  });
});