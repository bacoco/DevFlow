import { WebGLRenderer, WebGLRenderTarget, Texture, Material, Geometry, BufferGeometry } from 'three';

export interface WebGLCapabilities {
  maxTextureSize: number;
  maxVertexTextures: number;
  maxFragmentTextures: number;
  maxVaryingVectors: number;
  maxVertexAttribs: number;
  maxVertexUniforms: number;
  maxFragmentUniforms: number;
  supportsFloatTextures: boolean;
  supportsHalfFloatTextures: boolean;
  supportsVertexArrayObjects: boolean;
  supportsInstancedArrays: boolean;
  supportsMultipleRenderTargets: boolean;
  maxAnisotropy: number;
  maxSamples: number;
  precision: 'highp' | 'mediump' | 'lowp';
}

export interface WebGLPerformanceMetrics {
  drawCalls: number;
  triangles: number;
  points: number;
  lines: number;
  geometries: number;
  textures: number;
  programs: number;
  memoryUsage: {
    geometries: number;
    textures: number;
    total: number;
  };
  renderTime: number;
  frameTime: number;
}

export interface WebGLOptimizationConfig {
  enableInstancedRendering: boolean;
  enableTextureAtlasing: boolean;
  enableGeometryMerging: boolean;
  enableFrustumCulling: boolean;
  enableOcclusionCulling: boolean;
  maxDrawCalls: number;
  maxTriangles: number;
  targetFrameTime: number; // in milliseconds
  qualityLevels: QualityLevel[];
  fallbackMode: 'canvas2d' | 'svg' | 'disabled';
}

export interface QualityLevel {
  name: string;
  maxTextureSize: number;
  shadowMapSize: number;
  antialias: boolean;
  pixelRatio: number;
  maxLights: number;
  enablePostProcessing: boolean;
  enableReflections: boolean;
  enableShadows: boolean;
}

export class WebGLOptimizer {
  private renderer: WebGLRenderer;
  private capabilities: WebGLCapabilities;
  private config: WebGLOptimizationConfig;
  private currentQualityLevel: QualityLevel;
  private performanceHistory: number[] = [];
  private textureAtlas: TextureAtlas | null = null;
  private geometryBatcher: GeometryBatcher | null = null;
  private instancedRenderer: InstancedRenderer | null = null;

  constructor(renderer: WebGLRenderer, config: WebGLOptimizationConfig) {
    this.renderer = renderer;
    this.config = config;
    this.capabilities = this.detectCapabilities();
    this.currentQualityLevel = this.selectInitialQualityLevel();
    
    this.initializeOptimizations();
  }

  /**
   * Detect WebGL capabilities of the current device
   */
  private detectCapabilities(): WebGLCapabilities {
    const gl = this.renderer.getContext();
    const debugInfo = this.renderer.debug;

    return {
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxVertexTextures: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
      maxFragmentTextures: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
      maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
      maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      maxVertexUniforms: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
      maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      supportsFloatTextures: this.checkExtension(gl, 'OES_texture_float'),
      supportsHalfFloatTextures: this.checkExtension(gl, 'OES_texture_half_float'),
      supportsVertexArrayObjects: this.checkExtension(gl, 'OES_vertex_array_object'),
      supportsInstancedArrays: this.checkExtension(gl, 'ANGLE_instanced_arrays'),
      supportsMultipleRenderTargets: this.checkExtension(gl, 'WEBGL_draw_buffers'),
      maxAnisotropy: this.getMaxAnisotropy(gl),
      maxSamples: this.getMaxSamples(gl),
      precision: this.detectPrecision(gl),
    };
  }

  /**
   * Check if a WebGL extension is supported
   */
  private checkExtension(gl: WebGLRenderingContext, extensionName: string): boolean {
    return gl.getExtension(extensionName) !== null;
  }

  /**
   * Get maximum anisotropy level
   */
  private getMaxAnisotropy(gl: WebGLRenderingContext): number {
    const ext = gl.getExtension('EXT_texture_filter_anisotropic');
    return ext ? gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 1;
  }

  /**
   * Get maximum MSAA samples
   */
  private getMaxSamples(gl: WebGLRenderingContext): number {
    return gl.getParameter(gl.MAX_SAMPLES) || 0;
  }

  /**
   * Detect shader precision support
   */
  private detectPrecision(gl: WebGLRenderingContext): 'highp' | 'mediump' | 'lowp' {
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fragmentShader) return 'lowp';

    gl.shaderSource(fragmentShader, 'precision highp float; void main() { gl_FragColor = vec4(1.0); }');
    gl.compileShader(fragmentShader);

    if (gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      gl.deleteShader(fragmentShader);
      return 'highp';
    }

    gl.deleteShader(fragmentShader);
    return 'mediump';
  }

  /**
   * Select initial quality level based on capabilities
   */
  private selectInitialQualityLevel(): QualityLevel {
    const score = this.calculateDeviceScore();
    
    if (score >= 0.8) {
      return this.config.qualityLevels.find(level => level.name === 'ultra') || this.config.qualityLevels[0];
    } else if (score >= 0.6) {
      return this.config.qualityLevels.find(level => level.name === 'high') || this.config.qualityLevels[1];
    } else if (score >= 0.4) {
      return this.config.qualityLevels.find(level => level.name === 'medium') || this.config.qualityLevels[2];
    } else {
      return this.config.qualityLevels.find(level => level.name === 'low') || this.config.qualityLevels[3];
    }
  }

  /**
   * Calculate device performance score (0-1)
   */
  private calculateDeviceScore(): number {
    let score = 0;

    // Texture capabilities (0-0.3)
    score += Math.min(this.capabilities.maxTextureSize / 4096, 1) * 0.15;
    score += Math.min(this.capabilities.maxFragmentTextures / 16, 1) * 0.15;

    // Precision support (0-0.2)
    switch (this.capabilities.precision) {
      case 'highp': score += 0.2; break;
      case 'mediump': score += 0.1; break;
      case 'lowp': score += 0.05; break;
    }

    // Extension support (0-0.3)
    if (this.capabilities.supportsFloatTextures) score += 0.1;
    if (this.capabilities.supportsInstancedArrays) score += 0.1;
    if (this.capabilities.supportsVertexArrayObjects) score += 0.1;

    // Anisotropy and MSAA (0-0.2)
    score += Math.min(this.capabilities.maxAnisotropy / 16, 1) * 0.1;
    score += Math.min(this.capabilities.maxSamples / 8, 1) * 0.1;

    return Math.min(score, 1);
  }

  /**
   * Initialize optimization systems
   */
  private initializeOptimizations(): void {
    if (this.config.enableTextureAtlasing) {
      this.textureAtlas = new TextureAtlas(this.capabilities.maxTextureSize);
    }

    if (this.config.enableGeometryMerging) {
      this.geometryBatcher = new GeometryBatcher();
    }

    if (this.config.enableInstancedRendering && this.capabilities.supportsInstancedArrays) {
      this.instancedRenderer = new InstancedRenderer(this.renderer);
    }

    this.applyQualitySettings();
  }

  /**
   * Apply current quality settings to renderer
   */
  private applyQualitySettings(): void {
    const quality = this.currentQualityLevel;

    // Update renderer settings
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatio));
    this.renderer.shadowMap.enabled = quality.enableShadows;
    
    if (quality.enableShadows) {
      this.renderer.shadowMap.mapSize.setScalar(quality.shadowMapSize);
    }

    // Update material settings would be handled by the materials themselves
    // based on the current quality level
  }

  /**
   * Monitor performance and adjust quality automatically
   */
  updatePerformance(frameTime: number): void {
    this.performanceHistory.push(frameTime);
    
    // Keep only recent history (last 60 frames)
    if (this.performanceHistory.length > 60) {
      this.performanceHistory.shift();
    }

    // Check if we need to adjust quality
    if (this.performanceHistory.length >= 30) {
      const averageFrameTime = this.performanceHistory.reduce((sum, time) => sum + time, 0) / this.performanceHistory.length;
      
      if (averageFrameTime > this.config.targetFrameTime * 1.5) {
        this.decreaseQuality();
      } else if (averageFrameTime < this.config.targetFrameTime * 0.7) {
        this.increaseQuality();
      }
    }
  }

  /**
   * Decrease quality level for better performance
   */
  private decreaseQuality(): void {
    const currentIndex = this.config.qualityLevels.indexOf(this.currentQualityLevel);
    if (currentIndex < this.config.qualityLevels.length - 1) {
      this.currentQualityLevel = this.config.qualityLevels[currentIndex + 1];
      this.applyQualitySettings();
      console.log(`WebGL quality decreased to: ${this.currentQualityLevel.name}`);
    }
  }

  /**
   * Increase quality level when performance allows
   */
  private increaseQuality(): void {
    const currentIndex = this.config.qualityLevels.indexOf(this.currentQualityLevel);
    if (currentIndex > 0) {
      this.currentQualityLevel = this.config.qualityLevels[currentIndex - 1];
      this.applyQualitySettings();
      console.log(`WebGL quality increased to: ${this.currentQualityLevel.name}`);
    }
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): WebGLPerformanceMetrics {
    const info = this.renderer.info;
    
    return {
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      points: info.render.points,
      lines: info.render.lines,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length || 0,
      memoryUsage: {
        geometries: info.memory.geometries * 1024, // Rough estimate
        textures: info.memory.textures * 1024, // Rough estimate
        total: (info.memory.geometries + info.memory.textures) * 1024,
      },
      renderTime: this.performanceHistory.length > 0 ? 
        this.performanceHistory[this.performanceHistory.length - 1] : 0,
      frameTime: this.performanceHistory.length > 0 ? 
        this.performanceHistory.reduce((sum, time) => sum + time, 0) / this.performanceHistory.length : 0,
    };
  }

  /**
   * Get current capabilities
   */
  getCapabilities(): WebGLCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Get current quality level
   */
  getCurrentQualityLevel(): QualityLevel {
    return { ...this.currentQualityLevel };
  }

  /**
   * Manually set quality level
   */
  setQualityLevel(levelName: string): boolean {
    const level = this.config.qualityLevels.find(l => l.name === levelName);
    if (level) {
      this.currentQualityLevel = level;
      this.applyQualitySettings();
      return true;
    }
    return false;
  }

  /**
   * Check if fallback mode should be used
   */
  shouldUseFallback(): boolean {
    const score = this.calculateDeviceScore();
    return score < 0.2 || !this.capabilities.supportsFloatTextures;
  }

  /**
   * Get recommended fallback mode
   */
  getFallbackMode(): 'canvas2d' | 'svg' | 'disabled' {
    return this.config.fallbackMode;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.textureAtlas?.dispose();
    this.geometryBatcher?.dispose();
    this.instancedRenderer?.dispose();
  }
}

/**
 * Texture atlas for combining multiple textures
 */
class TextureAtlas {
  private maxSize: number;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private texture: Texture | null = null;
  private regions: Map<string, { x: number; y: number; width: number; height: number }> = new Map();
  private currentX = 0;
  private currentY = 0;
  private rowHeight = 0;

  constructor(maxSize: number) {
    this.maxSize = Math.min(maxSize, 2048); // Reasonable limit
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.maxSize;
    this.canvas.height = this.maxSize;
    this.context = this.canvas.getContext('2d')!;
  }

  /**
   * Add a texture to the atlas
   */
  addTexture(id: string, image: HTMLImageElement | HTMLCanvasElement): boolean {
    const width = image.width;
    const height = image.height;

    // Check if texture fits in current row
    if (this.currentX + width > this.maxSize) {
      // Move to next row
      this.currentX = 0;
      this.currentY += this.rowHeight;
      this.rowHeight = 0;
    }

    // Check if texture fits in atlas
    if (this.currentY + height > this.maxSize) {
      return false; // Atlas is full
    }

    // Draw texture to atlas
    this.context.drawImage(image, this.currentX, this.currentY);

    // Store region information
    this.regions.set(id, {
      x: this.currentX / this.maxSize,
      y: this.currentY / this.maxSize,
      width: width / this.maxSize,
      height: height / this.maxSize,
    });

    // Update position
    this.currentX += width;
    this.rowHeight = Math.max(this.rowHeight, height);

    return true;
  }

  /**
   * Get texture coordinates for a region
   */
  getRegion(id: string): { x: number; y: number; width: number; height: number } | null {
    return this.regions.get(id) || null;
  }

  /**
   * Get the atlas texture
   */
  getTexture(): Texture {
    if (!this.texture) {
      this.texture = new Texture(this.canvas);
      this.texture.needsUpdate = true;
    }
    return this.texture;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.texture?.dispose();
  }
}

/**
 * Geometry batcher for combining multiple geometries
 */
class GeometryBatcher {
  private batches: Map<string, BufferGeometry[]> = new Map();

  /**
   * Add geometry to a batch
   */
  addGeometry(batchId: string, geometry: BufferGeometry): void {
    if (!this.batches.has(batchId)) {
      this.batches.set(batchId, []);
    }
    this.batches.get(batchId)!.push(geometry);
  }

  /**
   * Get merged geometry for a batch
   */
  getBatchedGeometry(batchId: string): BufferGeometry | null {
    const geometries = this.batches.get(batchId);
    if (!geometries || geometries.length === 0) {
      return null;
    }

    if (geometries.length === 1) {
      return geometries[0];
    }

    // Merge geometries (simplified implementation)
    const merged = new BufferGeometry();
    // Implementation would merge all geometries into one
    // This is a complex operation that would need proper implementation
    return merged;
  }

  /**
   * Clear a batch
   */
  clearBatch(batchId: string): void {
    this.batches.delete(batchId);
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.batches.clear();
  }
}

/**
 * Instanced renderer for efficient rendering of similar objects
 */
class InstancedRenderer {
  private renderer: WebGLRenderer;
  private instancedMeshes: Map<string, any> = new Map();

  constructor(renderer: WebGLRenderer) {
    this.renderer = renderer;
  }

  /**
   * Create instanced mesh for similar objects
   */
  createInstancedMesh(id: string, geometry: BufferGeometry, material: Material, count: number): any {
    // Implementation would create InstancedMesh
    // This requires Three.js InstancedMesh which may not be available in all versions
    return null;
  }

  /**
   * Update instance data
   */
  updateInstances(id: string, positions: Float32Array, rotations?: Float32Array, scales?: Float32Array): void {
    const mesh = this.instancedMeshes.get(id);
    if (mesh) {
      // Update instance attributes
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.instancedMeshes.clear();
  }
}

/**
 * Default WebGL optimization configuration
 */
export const DEFAULT_WEBGL_CONFIG: WebGLOptimizationConfig = {
  enableInstancedRendering: true,
  enableTextureAtlasing: true,
  enableGeometryMerging: true,
  enableFrustumCulling: true,
  enableOcclusionCulling: false,
  maxDrawCalls: 1000,
  maxTriangles: 100000,
  targetFrameTime: 16.67, // 60 FPS
  qualityLevels: [
    {
      name: 'ultra',
      maxTextureSize: 2048,
      shadowMapSize: 2048,
      antialias: true,
      pixelRatio: 2.0,
      maxLights: 8,
      enablePostProcessing: true,
      enableReflections: true,
      enableShadows: true,
    },
    {
      name: 'high',
      maxTextureSize: 1024,
      shadowMapSize: 1024,
      antialias: true,
      pixelRatio: 1.5,
      maxLights: 6,
      enablePostProcessing: true,
      enableReflections: false,
      enableShadows: true,
    },
    {
      name: 'medium',
      maxTextureSize: 512,
      shadowMapSize: 512,
      antialias: false,
      pixelRatio: 1.0,
      maxLights: 4,
      enablePostProcessing: false,
      enableReflections: false,
      enableShadows: true,
    },
    {
      name: 'low',
      maxTextureSize: 256,
      shadowMapSize: 256,
      antialias: false,
      pixelRatio: 1.0,
      maxLights: 2,
      enablePostProcessing: false,
      enableReflections: false,
      enableShadows: false,
    },
  ],
  fallbackMode: 'canvas2d',
};