import { WebGLCompatibility } from '../performance/WebGLCompatibility';
import { WebGLOptimizer, DEFAULT_WEBGL_CONFIG } from '../performance/WebGLOptimizer';
import { FallbackRenderer, DEFAULT_FALLBACK_CONFIG } from '../performance/FallbackRenderer';

// Browser user agent strings for testing
const BROWSER_USER_AGENTS = {
  chrome: {
    desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    mobile: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
  },
  firefox: {
    desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    mobile: 'Mozilla/5.0 (Mobile; rv:89.0) Gecko/89.0 Firefox/89.0',
  },
  safari: {
    desktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
  },
  edge: {
    desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
    mobile: 'Mozilla/5.0 (Linux; Android 10; HD1913) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36 EdgA/46.3.4.5155',
  },
  opera: {
    desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 OPR/77.0.4054.172',
    mobile: 'Mozilla/5.0 (Linux; Android 10; VOG-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36 OPR/64.2.3282.60138',
  },
};

// Mock WebGL capabilities for different hardware configurations
const HARDWARE_PROFILES = {
  highEnd: {
    maxTextureSize: 4096,
    maxVertexTextures: 32,
    maxFragmentTextures: 32,
    maxVaryingVectors: 16,
    maxVertexAttribs: 32,
    maxVertexUniforms: 1024,
    maxFragmentUniforms: 1024,
    maxSamples: 8,
    floatTextures: true,
    halfFloatTextures: true,
    vertexArrayObjects: true,
    instancedArrays: true,
    multipleRenderTargets: true,
    depthTextures: true,
    textureFilterAnisotropic: true,
    maxAnisotropy: 16,
  },
  midRange: {
    maxTextureSize: 2048,
    maxVertexTextures: 16,
    maxFragmentTextures: 16,
    maxVaryingVectors: 8,
    maxVertexAttribs: 16,
    maxVertexUniforms: 512,
    maxFragmentUniforms: 512,
    maxSamples: 4,
    floatTextures: true,
    halfFloatTextures: true,
    vertexArrayObjects: true,
    instancedArrays: true,
    multipleRenderTargets: true,
    depthTextures: true,
    textureFilterAnisotropic: true,
    maxAnisotropy: 8,
  },
  lowEnd: {
    maxTextureSize: 1024,
    maxVertexTextures: 4,
    maxFragmentTextures: 8,
    maxVaryingVectors: 4,
    maxVertexAttribs: 8,
    maxVertexUniforms: 256,
    maxFragmentUniforms: 256,
    maxSamples: 0,
    floatTextures: false,
    halfFloatTextures: true,
    vertexArrayObjects: false,
    instancedArrays: false,
    multipleRenderTargets: false,
    depthTextures: false,
    textureFilterAnisotropic: false,
    maxAnisotropy: 1,
  },
  mobile: {
    maxTextureSize: 512,
    maxVertexTextures: 2,
    maxFragmentTextures: 4,
    maxVaryingVectors: 4,
    maxVertexAttribs: 8,
    maxVertexUniforms: 128,
    maxFragmentUniforms: 128,
    maxSamples: 0,
    floatTextures: false,
    halfFloatTextures: false,
    vertexArrayObjects: false,
    instancedArrays: false,
    multipleRenderTargets: false,
    depthTextures: false,
    textureFilterAnisotropic: false,
    maxAnisotropy: 1,
  },
};

// Mock WebGL context for testing
class MockWebGLContext {
  private capabilities: any;
  private extensions: Map<string, any> = new Map();

  constructor(capabilities: any) {
    this.capabilities = capabilities;
    this.setupExtensions();
  }

  private setupExtensions(): void {
    if (this.capabilities.floatTextures) {
      this.extensions.set('OES_texture_float', {});
    }
    if (this.capabilities.halfFloatTextures) {
      this.extensions.set('OES_texture_half_float', {});
    }
    if (this.capabilities.vertexArrayObjects) {
      this.extensions.set('OES_vertex_array_object', {});
    }
    if (this.capabilities.instancedArrays) {
      this.extensions.set('ANGLE_instanced_arrays', {});
    }
    if (this.capabilities.multipleRenderTargets) {
      this.extensions.set('WEBGL_draw_buffers', {});
    }
    if (this.capabilities.depthTextures) {
      this.extensions.set('WEBGL_depth_texture', {});
    }
    if (this.capabilities.textureFilterAnisotropic) {
      this.extensions.set('EXT_texture_filter_anisotropic', {
        MAX_TEXTURE_MAX_ANISOTROPY_EXT: this.capabilities.maxAnisotropy,
      });
    }
  }

  getParameter(pname: number): any {
    const paramMap: { [key: number]: string } = {
      0x0D33: 'maxTextureSize',
      0x8872: 'maxVertexTextures',
      0x8B4D: 'maxFragmentTextures',
      0x8DFB: 'maxVaryingVectors',
      0x8869: 'maxVertexAttribs',
      0x8B4A: 'maxVertexUniforms',
      0x8B49: 'maxFragmentUniforms',
      0x8B4C: 'maxSamples',
    };

    const param = paramMap[pname];
    return param ? this.capabilities[param] : 0;
  }

  getExtension(name: string): any {
    return this.extensions.get(name) || null;
  }

  createShader(type: number): any {
    return { type, compiled: false };
  }

  shaderSource(shader: any, source: string): void {
    shader.source = source;
  }

  compileShader(shader: any): void {
    // Simulate compilation success/failure based on capabilities
    if (shader.source.includes('precision highp float')) {
      shader.compiled = this.capabilities.floatTextures;
    } else {
      shader.compiled = true;
    }
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

// Helper function to mock browser environment
function mockBrowserEnvironment(userAgent: string, platform: string = 'Win32'): void {
  Object.defineProperty(navigator, 'userAgent', {
    value: userAgent,
    configurable: true,
  });

  Object.defineProperty(navigator, 'platform', {
    value: platform,
    configurable: true,
  });
}

// Helper function to mock WebGL context creation
function mockWebGLContext(capabilities: any): void {
  const mockCanvas = {
    getContext: jest.fn().mockImplementation((type: string) => {
      if (type === 'webgl' || type === 'experimental-webgl') {
        return new MockWebGLContext(capabilities);
      }
      if (type === 'webgl2') {
        return capabilities.webgl2 ? new MockWebGLContext(capabilities) : null;
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
}

describe('Cross-Browser WebGL Compatibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Chrome Browser Compatibility', () => {
    it('should detect Chrome desktop correctly', () => {
      mockBrowserEnvironment(BROWSER_USER_AGENTS.chrome.desktop);
      mockWebGLContext(HARDWARE_PROFILES.highEnd);

      const compatibility = new WebGLCompatibility();
      const report = compatibility.generateReport();

      expect(report.browserInfo.name).toBe('Chrome');
      expect(report.browserInfo.engine).toBe('Blink');
      expect(report.browserInfo.isMobile).toBe(false);
      expect(report.performanceScore).toBeGreaterThan(0.7);
    });

    it('should detect Chrome mobile correctly', () => {
      mockBrowserEnvironment(BROWSER_USER_AGENTS.chrome.mobile, 'Linux armv7l');
      mockWebGLContext(HARDWARE_PROFILES.mobile);

      const compatibility = new WebGLCompatibility();
      const report = compatibility.generateReport();

      expect(report.browserInfo.name).toBe('Chrome');
      expect(report.browserInfo.isMobile).toBe(true);
      expect(report.performanceScore).toBeLessThan(0.5);
      expect(report.recommendedSettings.pixelRatio).toBe(1.0);
    });

    it('should provide Chrome-specific optimizations', () => {
      mockBrowserEnvironment(BROWSER_USER_AGENTS.chrome.desktop);
      mockWebGLContext(HARDWARE_PROFILES.highEnd);

      const compatibility = new WebGLCompatibility();
      const report = compatibility.generateReport();

      expect(report.recommendedSettings.powerPreference).toBe('high-performance');
      expect(report.recommendedSettings.antialias).toBe(true);
    });
  });

  describe('Firefox Browser Compatibility', () => {
    it('should detect Firefox desktop correctly', () => {
      mockBrowserEnvironment(BROWSER_USER_AGENTS.firefox.desktop);
      mockWebGLContext(HARDWARE_PROFILES.midRange);

      const compatibility = new WebGLCompatibility();
      const report = compatibility.generateReport();

      expect(report.browserInfo.name).toBe('Firefox');
      expect(report.browserInfo.engine).toBe('Gecko');
      expect(report.knownIssues.some(issue => 
        issue.includes('ANGLE_instanced_arrays')
      )).toBe(true);
    });

    it('should provide Firefox-specific workarounds', () => {
      mockBrowserEnvironment(BROWSER_USER_AGENTS.firefox.desktop);
      mockWebGLContext(HARDWARE_PROFILES.midRange);

      const compatibility = new WebGLCompatibility();
      const report = compatibility.generateReport();

      expect(report.workarounds.some(workaround => 
        workaround.includes('fallback for instanced rendering')
      )).toBe(true);
    });
  });

  describe('Safari Browser Compatibility', () => {
    it('should detect Safari desktop correctly', () => {
      mockBrowserEnvironment(BROWSER_USER_AGENTS.safari.desktop, 'MacIntel');
      mockWebGLContext(HARDWARE_PROFILES.midRange);

      const compatibility = new WebGLCompatibility();
      const report = compatibility.generateReport();

      expect(report.browserInfo.name).toBe('Safari');
      expect(report.browserInfo.engine).toBe('WebKit');
      expect(report.browserInfo.platform).toBe('MacIntel');
    });

    it('should handle Safari iOS limitations', () => {
      mockBrowserEnvironment(BROWSER_USER_AGENTS.safari.mobile, 'iPhone');
      mockWebGLContext(HARDWARE_PROFILES.mobile);

      const compatibility = new WebGLCompatibility();
      const report = compatibility.generateReport();

      expect(report.browserInfo.isMobile).toBe(true);
      expect(report.knownIssues.some(issue => 
        issue.includes('Performance issues with large textures on iOS')
      )).toBe(true);
      expect(report.recommendedSettings.maxTextureSize).toBeLessThanOrEqual(1024);
    });

    it('should provide Safari-specific workarounds', () => {
      mockBrowserEnvironment(BROWSER_USER_AGENTS.safari.desktop, 'MacIntel');
      mockWebGLContext({ ...HARDWARE_PROFILES.midRange, floatTextures: false });

      const compatibility = new WebGLCompatibility();
      const report = compatibility.generateReport();

      expect(report.workarounds.some(workaround => 
        workaround.includes('half-float textures instead of float')
      )).toBe(true);
    });
  });

  describe('Edge Browser Compatibility', () => {
    it('should detect modern Edge correctly', () => {
      mockBrowserEnvironment(BROWSER_USER_AGENTS.edge.desktop);
      mockWebGLContext(HARDWARE_PROFILES.highEnd);

      const compatibility = new WebGLCompatibility();
      const report = compatibility.generateReport();

      expect(report.browserInfo.name).toBe('Edge');
      expect(report.browserInfo.engine).toBe('Blink');
      expect(report.performanceScore).toBeGreaterThan(0.6);
    });
  });

  describe('Opera Browser Compatibility', () => {
    it('should detect Opera correctly', () => {
      mockBrowserEnvironment(BROWSER_USER_AGENTS.opera.desktop);
      mockWebGLContext(HARDWARE_PROFILES.midRange);

      const compatibility = new WebGLCompatibility();
      const report = compatibility.generateReport();

      expect(report.browserInfo.name).toBe('Opera');
      expect(report.browserInfo.engine).toBe('Blink');
    });
  });

  describe('Hardware Profile Compatibility', () => {
    it('should optimize for high-end hardware', () => {
      mockBrowserEnvironment(BROWSER_USER_AGENTS.chrome.desktop);
      mockWebGLContext(HARDWARE_PROFILES.highEnd);

      const compatibility = new WebGLCompatibility();
      const report = compatibility.generateReport();

      expect(report.performanceScore).toBeGreaterThan(0.8);
      expect(report.recommendedSettings.maxTextureSize).toBeGreaterThanOrEqual(2048);
      expect(report.recommendedSettings.antialias).toBe(true);
      expect(report.recommendedSettings.pixelRatio).toBeGreaterThan(1.0);
    });

    it('should adapt for mid-range hardware', () => {
      mockBrowserEnvironment(BROWSER_USER_AGENTS.chrome.desktop);
      mockWebGLContext(HARDWARE_PROFILES.midRange);

      const compatibility = new WebGLCompatibility();
      const report = compatibility.generateReport();

      expect(report.performanceScore).toBeGreaterThan(0.5);
      expect(report.performanceScore).toBeLessThan(0.8);
      expect(report.recommendedSettings.maxTextureSize).toBe(2048);
    });

    it('should provide fallback for low-end hardware', () => {
      mockBrowserEnvironment(BROWSER_USER_AGENTS.chrome.desktop);
      mockWebGLContext(HARDWARE_PROFILES.lowEnd);

      const compatibility = new WebGLCompatibility();
      const report = compatibility.generateReport();

      expect(report.performanceScore).toBeLessThan(0.5);
      expect(report.recommendedSettings.antialias).toBe(false);
      expect(report.recommendedSettings.maxTextureSize).toBeLessThanOrEqual(1024);
    });

    it('should recommend fallback for very limited hardware', () => {
      mockBrowserEnvironment(BROWSER_USER_AGENTS.chrome.desktop);
      mockWebGLContext(HARDWARE_PROFILES.mobile);

      const compatibility = new WebGLCompatibility();
      
      expect(compatibility.shouldDisableWebGL()).toBe(true);
      expect(compatibility.getFallbackMode()).toBe('canvas2d');
    });
  });

  describe('WebGL Context Creation', () => {
    it('should create optimal context for each browser', () => {
      const browsers = [
        { ua: BROWSER_USER_AGENTS.chrome.desktop, name: 'Chrome' },
        { ua: BROWSER_USER_AGENTS.firefox.desktop, name: 'Firefox' },
        { ua: BROWSER_USER_AGENTS.safari.desktop, name: 'Safari' },
        { ua: BROWSER_USER_AGENTS.edge.desktop, name: 'Edge' },
      ];

      browsers.forEach(({ ua, name }) => {
        mockBrowserEnvironment(ua);
        mockWebGLContext(HARDWARE_PROFILES.midRange);

        const compatibility = new WebGLCompatibility();
        const canvas = document.createElement('canvas');
        const context = compatibility.createOptimalContext(canvas);

        expect(context).toBeTruthy();
        
        const attributes = compatibility.getOptimalContextAttributes();
        expect(attributes).toBeDefined();
        expect(typeof attributes.antialias).toBe('boolean');
        expect(typeof attributes.alpha).toBe('boolean');
      });
    });

    it('should handle WebGL context creation failures gracefully', () => {
      mockBrowserEnvironment(BROWSER_USER_AGENTS.chrome.desktop);
      
      // Mock failed context creation
      const mockCanvas = {
        getContext: jest.fn().mockReturnValue(null),
      };

      jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          return mockCanvas as any;
        }
        return document.createElement(tagName);
      });

      const compatibility = new WebGLCompatibility();
      const canvas = document.createElement('canvas');
      const context = compatibility.createOptimalContext(canvas);

      expect(context).toBeNull();
    });
  });

  describe('Performance Adaptation', () => {
    it('should adjust quality settings based on browser performance', () => {
      const testCases = [
        { hardware: HARDWARE_PROFILES.highEnd, expectedQuality: 'ultra' },
        { hardware: HARDWARE_PROFILES.midRange, expectedQuality: 'high' },
        { hardware: HARDWARE_PROFILES.lowEnd, expectedQuality: 'low' },
      ];

      testCases.forEach(({ hardware, expectedQuality }) => {
        mockBrowserEnvironment(BROWSER_USER_AGENTS.chrome.desktop);
        mockWebGLContext(hardware);

        const compatibility = new WebGLCompatibility();
        const report = compatibility.generateReport();

        // The quality level should be appropriate for the hardware
        if (expectedQuality === 'ultra') {
          expect(report.performanceScore).toBeGreaterThan(0.7);
        } else if (expectedQuality === 'high') {
          expect(report.performanceScore).toBeGreaterThan(0.5);
        } else {
          expect(report.performanceScore).toBeLessThan(0.5);
        }
      });
    });
  });

  describe('Fallback Integration', () => {
    it('should seamlessly integrate with fallback renderer', () => {
      mockBrowserEnvironment(BROWSER_USER_AGENTS.safari.mobile, 'iPhone');
      mockWebGLContext(HARDWARE_PROFILES.mobile);

      const compatibility = new WebGLCompatibility();
      
      if (compatibility.shouldDisableWebGL()) {
        const fallbackRenderer = new FallbackRenderer(DEFAULT_FALLBACK_CONFIG);
        const config = fallbackRenderer.getConfig();
        
        expect(config.mode).toBe('canvas2d');
        expect(config.maxArtifacts).toBeLessThanOrEqual(500);
        
        fallbackRenderer.dispose();
      }
    });
  });
});

describe('WebGL Extension Compatibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const extensionTests = [
    {
      name: 'OES_texture_float',
      description: 'Float texture support',
      critical: true,
    },
    {
      name: 'ANGLE_instanced_arrays',
      description: 'Instanced rendering support',
      critical: false,
    },
    {
      name: 'OES_vertex_array_object',
      description: 'Vertex Array Object support',
      critical: false,
    },
    {
      name: 'WEBGL_draw_buffers',
      description: 'Multiple render targets',
      critical: false,
    },
    {
      name: 'EXT_texture_filter_anisotropic',
      description: 'Anisotropic filtering',
      critical: false,
    },
  ];

  extensionTests.forEach(({ name, description, critical }) => {
    it(`should handle ${name} extension (${description})`, () => {
      mockBrowserEnvironment(BROWSER_USER_AGENTS.chrome.desktop);
      
      // Test with extension supported
      const withExtension = { ...HARDWARE_PROFILES.midRange };
      withExtension[name.toLowerCase().replace(/[^a-z]/g, '')] = true;
      mockWebGLContext(withExtension);

      let compatibility = new WebGLCompatibility();
      let support = compatibility.getWebGLSupport();
      
      // Check that the extension is detected
      const supportKey = name.toLowerCase().replace(/[^a-z]/g, '');
      expect(support[supportKey as keyof typeof support]).toBe(true);

      // Test without extension
      const withoutExtension = { ...HARDWARE_PROFILES.midRange };
      withoutExtension[name.toLowerCase().replace(/[^a-z]/g, '')] = false;
      mockWebGLContext(withoutExtension);

      compatibility = new WebGLCompatibility();
      support = compatibility.getWebGLSupport();
      
      expect(support[supportKey as keyof typeof support]).toBe(false);

      if (critical) {
        // Critical extensions should affect performance score significantly
        const report = compatibility.generateReport();
        expect(report.performanceScore).toBeLessThan(0.7);
      }
    });
  });
});

describe('Mobile Device Compatibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mobileDevices = [
    {
      name: 'iPhone',
      userAgent: BROWSER_USER_AGENTS.safari.mobile,
      platform: 'iPhone',
      expectedLimitations: ['Memory limitations', 'Performance issues with large textures'],
    },
    {
      name: 'Android Chrome',
      userAgent: BROWSER_USER_AGENTS.chrome.mobile,
      platform: 'Linux armv7l',
      expectedLimitations: ['Limited memory', 'Thermal throttling'],
    },
  ];

  mobileDevices.forEach(({ name, userAgent, platform, expectedLimitations }) => {
    it(`should handle ${name} device limitations`, () => {
      mockBrowserEnvironment(userAgent, platform);
      mockWebGLContext(HARDWARE_PROFILES.mobile);

      const compatibility = new WebGLCompatibility();
      const report = compatibility.generateReport();

      expect(report.browserInfo.isMobile).toBe(true);
      expect(report.performanceScore).toBeLessThan(0.5);
      expect(report.recommendedSettings.pixelRatio).toBe(1.0);
      expect(report.recommendedSettings.powerPreference).toBe('low-power');
      
      // Check for mobile-specific issues
      expectedLimitations.forEach(limitation => {
        expect(report.knownIssues.some(issue => 
          issue.toLowerCase().includes(limitation.toLowerCase())
        )).toBe(true);
      });
    });
  });

  it('should recommend appropriate fallback for mobile devices', () => {
    mockBrowserEnvironment(BROWSER_USER_AGENTS.safari.mobile, 'iPhone');
    mockWebGLContext(HARDWARE_PROFILES.mobile);

    const compatibility = new WebGLCompatibility();
    
    if (compatibility.shouldDisableWebGL()) {
      expect(compatibility.getFallbackMode()).toBe('canvas2d');
    }

    const report = compatibility.generateReport();
    expect(report.recommendedSettings.maxTextureSize).toBeLessThanOrEqual(1024);
  });
});