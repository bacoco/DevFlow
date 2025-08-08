export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  platform: string;
  isMobile: boolean;
  supportsWebGL: boolean;
  supportsWebGL2: boolean;
}

export interface WebGLFeatureSupport {
  floatTextures: boolean;
  halfFloatTextures: boolean;
  vertexArrayObjects: boolean;
  instancedArrays: boolean;
  multipleRenderTargets: boolean;
  depthTextures: boolean;
  textureFilterAnisotropic: boolean;
  standardDerivatives: boolean;
  shaderTextureLOD: boolean;
  fragmentDepth: boolean;
  drawBuffers: boolean;
  colorBufferFloat: boolean;
  colorBufferHalfFloat: boolean;
  textureCompressionS3TC: boolean;
  textureCompressionPVRTC: boolean;
  textureCompressionETC1: boolean;
}

export interface CompatibilityReport {
  browserInfo: BrowserInfo;
  webglSupport: WebGLFeatureSupport;
  performanceScore: number;
  recommendedSettings: RecommendedSettings;
  knownIssues: string[];
  workarounds: string[];
}

export interface RecommendedSettings {
  antialias: boolean;
  alpha: boolean;
  depth: boolean;
  stencil: boolean;
  preserveDrawingBuffer: boolean;
  premultipliedAlpha: boolean;
  powerPreference: 'default' | 'high-performance' | 'low-power';
  maxTextureSize: number;
  maxRenderBufferSize: number;
  pixelRatio: number;
}

export class WebGLCompatibility {
  private browserInfo: BrowserInfo;
  private webglSupport: WebGLFeatureSupport;
  private knownIssues: Map<string, string[]> = new Map();
  private workarounds: Map<string, string[]> = new Map();

  constructor() {
    this.browserInfo = this.detectBrowser();
    this.webglSupport = this.detectWebGLFeatures();
    this.initializeKnownIssues();
    this.initializeWorkarounds();
  }

  /**
   * Detect browser information
   */
  private detectBrowser(): BrowserInfo {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    
    let name = 'Unknown';
    let version = 'Unknown';
    let engine = 'Unknown';

    // Detect browser name and version
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      name = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Blink';
    } else if (userAgent.includes('Firefox')) {
      name = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Gecko';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      name = 'Safari';
      const match = userAgent.match(/Version\/(\d+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'WebKit';
    } else if (userAgent.includes('Edg')) {
      name = 'Edge';
      const match = userAgent.match(/Edg\/(\d+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Blink';
    } else if (userAgent.includes('OPR') || userAgent.includes('Opera')) {
      name = 'Opera';
      const match = userAgent.match(/(?:OPR|Opera)\/(\d+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Blink';
    }

    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    return {
      name,
      version,
      engine,
      platform,
      isMobile,
      supportsWebGL: this.checkWebGLSupport(),
      supportsWebGL2: this.checkWebGL2Support(),
    };
  }

  /**
   * Check basic WebGL support
   */
  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return gl !== null;
    } catch (e) {
      return false;
    }
  }

  /**
   * Check WebGL 2.0 support
   */
  private checkWebGL2Support(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      return gl !== null;
    } catch (e) {
      return false;
    }
  }

  /**
   * Detect WebGL feature support
   */
  private detectWebGLFeatures(): WebGLFeatureSupport {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) {
      return this.getEmptyFeatureSupport();
    }

    return {
      floatTextures: this.checkExtension(gl, 'OES_texture_float'),
      halfFloatTextures: this.checkExtension(gl, 'OES_texture_half_float'),
      vertexArrayObjects: this.checkExtension(gl, 'OES_vertex_array_object'),
      instancedArrays: this.checkExtension(gl, 'ANGLE_instanced_arrays'),
      multipleRenderTargets: this.checkExtension(gl, 'WEBGL_draw_buffers'),
      depthTextures: this.checkExtension(gl, 'WEBGL_depth_texture'),
      textureFilterAnisotropic: this.checkExtension(gl, 'EXT_texture_filter_anisotropic'),
      standardDerivatives: this.checkExtension(gl, 'OES_standard_derivatives'),
      shaderTextureLOD: this.checkExtension(gl, 'EXT_shader_texture_lod'),
      fragmentDepth: this.checkExtension(gl, 'EXT_frag_depth'),
      drawBuffers: this.checkExtension(gl, 'WEBGL_draw_buffers'),
      colorBufferFloat: this.checkExtension(gl, 'WEBGL_color_buffer_float'),
      colorBufferHalfFloat: this.checkExtension(gl, 'EXT_color_buffer_half_float'),
      textureCompressionS3TC: this.checkExtension(gl, 'WEBGL_compressed_texture_s3tc'),
      textureCompressionPVRTC: this.checkExtension(gl, 'WEBGL_compressed_texture_pvrtc'),
      textureCompressionETC1: this.checkExtension(gl, 'WEBGL_compressed_texture_etc1'),
    };
  }

  /**
   * Check if a WebGL extension is supported
   */
  private checkExtension(gl: WebGLRenderingContext, extensionName: string): boolean {
    try {
      return gl.getExtension(extensionName) !== null;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get empty feature support object
   */
  private getEmptyFeatureSupport(): WebGLFeatureSupport {
    return {
      floatTextures: false,
      halfFloatTextures: false,
      vertexArrayObjects: false,
      instancedArrays: false,
      multipleRenderTargets: false,
      depthTextures: false,
      textureFilterAnisotropic: false,
      standardDerivatives: false,
      shaderTextureLOD: false,
      fragmentDepth: false,
      drawBuffers: false,
      colorBufferFloat: false,
      colorBufferHalfFloat: false,
      textureCompressionS3TC: false,
      textureCompressionPVRTC: false,
      textureCompressionETC1: false,
    };
  }

  /**
   * Initialize known browser issues
   */
  private initializeKnownIssues(): void {
    // Safari issues
    this.knownIssues.set('Safari', [
      'Limited WebGL extension support on older versions',
      'Float texture support may be limited',
      'Performance issues with large textures on iOS',
      'Memory limitations on mobile devices',
    ]);

    // Firefox issues
    this.knownIssues.set('Firefox', [
      'ANGLE_instanced_arrays may not work on older versions',
      'WebGL context loss more frequent on some systems',
      'Performance issues with complex shaders',
    ]);

    // Chrome issues
    this.knownIssues.set('Chrome', [
      'GPU blacklist may disable WebGL on some hardware',
      'Memory pressure can cause context loss',
      'Performance varies significantly between versions',
    ]);

    // Edge issues
    this.knownIssues.set('Edge', [
      'Legacy Edge has limited WebGL support',
      'Chromium Edge generally compatible with Chrome',
    ]);

    // Mobile issues
    this.knownIssues.set('Mobile', [
      'Limited memory and processing power',
      'Thermal throttling affects performance',
      'Battery usage concerns with intensive graphics',
      'Touch interaction differences',
    ]);
  }

  /**
   * Initialize workarounds for known issues
   */
  private initializeWorkarounds(): void {
    // Safari workarounds
    this.workarounds.set('Safari', [
      'Use half-float textures instead of float when possible',
      'Reduce texture sizes on iOS devices',
      'Implement manual vertex array object management',
      'Use lower precision shaders when needed',
    ]);

    // Firefox workarounds
    this.workarounds.set('Firefox', [
      'Implement fallback for instanced rendering',
      'Add context loss recovery mechanisms',
      'Optimize shader complexity',
      'Use texture atlasing to reduce draw calls',
    ]);

    // Chrome workarounds
    this.workarounds.set('Chrome', [
      'Check for GPU blacklist and provide fallbacks',
      'Implement memory management and cleanup',
      'Monitor performance and adjust quality dynamically',
    ]);

    // Mobile workarounds
    this.workarounds.set('Mobile', [
      'Reduce geometry complexity significantly',
      'Use lower resolution textures',
      'Implement aggressive LOD systems',
      'Provide touch-friendly controls',
      'Add performance monitoring and throttling',
    ]);
  }

  /**
   * Generate compatibility report
   */
  generateReport(): CompatibilityReport {
    const performanceScore = this.calculatePerformanceScore();
    const recommendedSettings = this.getRecommendedSettings();
    const knownIssues = this.getKnownIssues();
    const workarounds = this.getWorkarounds();

    return {
      browserInfo: this.browserInfo,
      webglSupport: this.webglSupport,
      performanceScore,
      recommendedSettings,
      knownIssues,
      workarounds,
    };
  }

  /**
   * Calculate performance score (0-1)
   */
  private calculatePerformanceScore(): number {
    let score = 0;

    // Base WebGL support
    if (this.browserInfo.supportsWebGL) {
      score += 0.2;
    }

    // WebGL 2.0 support
    if (this.browserInfo.supportsWebGL2) {
      score += 0.1;
    }

    // Feature support (0.5 total)
    const features = Object.values(this.webglSupport);
    const supportedFeatures = features.filter(Boolean).length;
    score += (supportedFeatures / features.length) * 0.5;

    // Browser-specific adjustments
    switch (this.browserInfo.name) {
      case 'Chrome':
        score += 0.15;
        break;
      case 'Firefox':
        score += 0.1;
        break;
      case 'Safari':
        score += 0.05;
        break;
      case 'Edge':
        score += 0.12;
        break;
      case 'Opera':
        score += 0.1;
        break;
    }

    // Mobile penalty
    if (this.browserInfo.isMobile) {
      score -= 0.3;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Get recommended WebGL context settings
   */
  private getRecommendedSettings(): RecommendedSettings {
    const isMobile = this.browserInfo.isMobile;
    const performanceScore = this.calculatePerformanceScore();
    const isHighEnd = performanceScore > 0.8;
    const isMidRange = performanceScore > 0.5 && performanceScore <= 0.8;
    const isLowEnd = performanceScore <= 0.5;

    let maxTextureSize = 4096;
    if (isMobile || performanceScore < 0.3) {
      maxTextureSize = 512;
    } else if (isLowEnd) {
      maxTextureSize = 1024;
    } else if (isMidRange) {
      maxTextureSize = 2048;
    }

    return {
      antialias: !isMobile && !isLowEnd,
      alpha: false,
      depth: true,
      stencil: false,
      preserveDrawingBuffer: false,
      premultipliedAlpha: true,
      powerPreference: isMobile ? 'low-power' : 'high-performance',
      maxTextureSize,
      maxRenderBufferSize: maxTextureSize,
      pixelRatio: isMobile ? 1.0 : Math.min(window.devicePixelRatio || 1, 2.0),
    };
  }

  /**
   * Get known issues for current browser
   */
  private getKnownIssues(): string[] {
    const issues: string[] = [];

    // Browser-specific issues
    const browserIssues = this.knownIssues.get(this.browserInfo.name);
    if (browserIssues) {
      issues.push(...browserIssues);
    }

    // Mobile issues
    if (this.browserInfo.isMobile) {
      const mobileIssues = this.knownIssues.get('Mobile');
      if (mobileIssues) {
        issues.push(...mobileIssues);
      }
    }

    // Feature-specific issues
    if (!this.webglSupport.floatTextures) {
      issues.push('Float textures not supported - may affect rendering quality');
    }

    if (!this.webglSupport.instancedArrays) {
      issues.push('Instanced rendering not supported - may affect performance');
    }

    if (!this.webglSupport.vertexArrayObjects) {
      issues.push('Vertex Array Objects not supported - may affect performance');
    }

    return issues;
  }

  /**
   * Get workarounds for current browser
   */
  private getWorkarounds(): string[] {
    const workarounds: string[] = [];

    // Browser-specific workarounds
    const browserWorkarounds = this.workarounds.get(this.browserInfo.name);
    if (browserWorkarounds) {
      workarounds.push(...browserWorkarounds);
    }

    // Mobile workarounds
    if (this.browserInfo.isMobile) {
      const mobileWorkarounds = this.workarounds.get('Mobile');
      if (mobileWorkarounds) {
        workarounds.push(...mobileWorkarounds);
      }
    }

    return workarounds;
  }

  /**
   * Check if WebGL should be disabled
   */
  shouldDisableWebGL(): boolean {
    return !this.browserInfo.supportsWebGL || this.calculatePerformanceScore() < 0.2;
  }

  /**
   * Get recommended fallback mode
   */
  getFallbackMode(): 'canvas2d' | 'svg' | 'disabled' {
    return 'canvas2d'; // Default fallback mode
  }

  /**
   * Get optimal WebGL context attributes
   */
  getOptimalContextAttributes(): WebGLContextAttributes {
    const settings = this.getRecommendedSettings();

    return {
      alpha: settings.alpha,
      antialias: settings.antialias,
      depth: settings.depth,
      stencil: settings.stencil,
      preserveDrawingBuffer: settings.preserveDrawingBuffer,
      premultipliedAlpha: settings.premultipliedAlpha,
      powerPreference: settings.powerPreference,
    };
  }

  /**
   * Create WebGL context with optimal settings
   */
  createOptimalContext(canvas: HTMLCanvasElement): WebGLRenderingContext | null {
    const attributes = this.getOptimalContextAttributes();

    // Try WebGL 2.0 first if supported
    if (this.browserInfo.supportsWebGL2) {
      const gl2 = canvas.getContext('webgl2', attributes) as WebGL2RenderingContext;
      if (gl2) {
        return gl2;
      }
    }

    // Fallback to WebGL 1.0
    const gl = canvas.getContext('webgl', attributes) || 
               canvas.getContext('experimental-webgl', attributes);

    return gl as WebGLRenderingContext;
  }

  /**
   * Get browser info
   */
  getBrowserInfo(): BrowserInfo {
    return { ...this.browserInfo };
  }

  /**
   * Get WebGL feature support
   */
  getWebGLSupport(): WebGLFeatureSupport {
    return { ...this.webglSupport };
  }
}

/**
 * Global compatibility instance
 */
export const webglCompatibility = new WebGLCompatibility();