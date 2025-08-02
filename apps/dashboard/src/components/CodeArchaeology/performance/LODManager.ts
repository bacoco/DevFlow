import { Vector3, Camera, Frustum, Matrix4 } from 'three';
import { CodeArtifact } from '../types';

export interface LODLevel {
  distance: number;
  complexity: 'high' | 'medium' | 'low' | 'hidden';
  geometryDetail: number;
  textureResolution: number;
  showLabels: boolean;
  showDetails: boolean;
}

export interface LODConfig {
  levels: LODLevel[];
  frustumCulling: boolean;
  maxVisibleArtifacts: number;
  adaptiveQuality: boolean;
  performanceTarget: number; // Target FPS
}

export interface ArtifactLOD {
  artifact: CodeArtifact;
  distance: number;
  level: LODLevel;
  isVisible: boolean;
  inFrustum: boolean;
  priority: number;
}

export class LODManager {
  private config: LODConfig;
  private frustum: Frustum;
  private cameraMatrix: Matrix4;
  private performanceMonitor: PerformanceMonitor;

  constructor(config: LODConfig) {
    this.config = config;
    this.frustum = new Frustum();
    this.cameraMatrix = new Matrix4();
    this.performanceMonitor = new PerformanceMonitor(config.performanceTarget);
  }

  /**
   * Calculate LOD levels for all artifacts based on camera position and performance
   */
  calculateLOD(artifacts: CodeArtifact[], camera: Camera): ArtifactLOD[] {
    // Update frustum for culling
    this.updateFrustum(camera);
    
    // Calculate distance and visibility for each artifact
    const artifactLODs = artifacts.map(artifact => {
      const distance = camera.position.distanceTo(artifact.position3D);
      const inFrustum = this.config.frustumCulling ? this.isInFrustum(artifact.position3D) : true;
      const level = this.getLODLevel(distance);
      const priority = this.calculatePriority(artifact, distance);

      return {
        artifact,
        distance,
        level,
        isVisible: inFrustum && level.complexity !== 'hidden',
        inFrustum,
        priority,
      };
    });

    // Sort by priority and limit visible artifacts if needed
    const visibleArtifacts = artifactLODs
      .filter(lod => lod.isVisible)
      .sort((a, b) => b.priority - a.priority);

    // Apply adaptive quality based on performance
    const adaptedLODs = this.applyAdaptiveQuality(visibleArtifacts);

    // Limit visible artifacts if performance is poor
    if (adaptedLODs.length > this.config.maxVisibleArtifacts) {
      const limited = adaptedLODs.slice(0, this.config.maxVisibleArtifacts);
      const hidden = adaptedLODs.slice(this.config.maxVisibleArtifacts);
      
      hidden.forEach(lod => {
        lod.isVisible = false;
        lod.level = { ...lod.level, complexity: 'hidden' };
      });

      return [...limited, ...hidden, ...artifactLODs.filter(lod => !lod.inFrustum)];
    }

    return [...adaptedLODs, ...artifactLODs.filter(lod => !lod.isVisible)];
  }

  /**
   * Update frustum for culling calculations
   */
  private updateFrustum(camera: Camera): void {
    this.cameraMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.cameraMatrix);
  }

  /**
   * Check if a position is within the camera frustum
   */
  private isInFrustum(position: Vector3): boolean {
    return this.frustum.containsPoint(position);
  }

  /**
   * Get appropriate LOD level based on distance
   */
  private getLODLevel(distance: number): LODLevel {
    for (const level of this.config.levels) {
      if (distance <= level.distance) {
        return level;
      }
    }
    
    // Return the lowest quality level if distance exceeds all thresholds
    return this.config.levels[this.config.levels.length - 1];
  }

  /**
   * Calculate priority for artifact rendering
   */
  private calculatePriority(artifact: CodeArtifact, distance: number): number {
    let priority = 1.0;

    // Closer artifacts have higher priority
    priority += Math.max(0, 100 - distance) / 100;

    // High complexity artifacts have higher priority
    priority += artifact.complexity / 20;

    // Frequently changed artifacts have higher priority
    priority += artifact.changeFrequency / 10;

    // Files have higher priority than functions/classes
    switch (artifact.type) {
      case 'file':
        priority += 0.5;
        break;
      case 'class':
        priority += 0.3;
        break;
      case 'function':
        priority += 0.2;
        break;
      case 'interface':
        priority += 0.1;
        break;
    }

    return priority;
  }

  /**
   * Apply adaptive quality adjustments based on performance
   */
  private applyAdaptiveQuality(artifactLODs: ArtifactLOD[]): ArtifactLOD[] {
    if (!this.config.adaptiveQuality) {
      return artifactLODs;
    }

    const currentFPS = this.performanceMonitor.getCurrentFPS();
    const targetFPS = this.config.performanceTarget;

    if (currentFPS < targetFPS * 0.8) {
      // Performance is poor, reduce quality
      return artifactLODs.map(lod => ({
        ...lod,
        level: this.reduceLODQuality(lod.level),
      }));
    } else if (currentFPS > targetFPS * 1.2) {
      // Performance is good, can increase quality
      return artifactLODs.map(lod => ({
        ...lod,
        level: this.increaseLODQuality(lod.level),
      }));
    }

    return artifactLODs;
  }

  /**
   * Reduce LOD quality for performance
   */
  private reduceLODQuality(level: LODLevel): LODLevel {
    return {
      ...level,
      geometryDetail: Math.max(0.1, level.geometryDetail * 0.7),
      textureResolution: Math.max(64, level.textureResolution * 0.5),
      showLabels: false,
      showDetails: false,
    };
  }

  /**
   * Increase LOD quality when performance allows
   */
  private increaseLODQuality(level: LODLevel): LODLevel {
    return {
      ...level,
      geometryDetail: Math.min(1.0, level.geometryDetail * 1.2),
      textureResolution: Math.min(1024, level.textureResolution * 1.5),
      showLabels: level.distance < 50,
      showDetails: level.distance < 30,
    };
  }

  /**
   * Update performance monitoring
   */
  updatePerformance(deltaTime: number): void {
    this.performanceMonitor.update(deltaTime);
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceMonitor.getMetrics();
  }
}

/**
 * Performance monitoring for adaptive quality
 */
class PerformanceMonitor {
  private targetFPS: number;
  private frameCount: number = 0;
  private lastTime: number = 0;
  private currentFPS: number = 60;
  private fpsHistory: number[] = [];
  private maxHistorySize: number = 60; // 1 second at 60fps

  constructor(targetFPS: number) {
    this.targetFPS = targetFPS;
    this.lastTime = performance.now();
  }

  update(deltaTime: number): void {
    this.frameCount++;
    const currentTime = performance.now();

    if (currentTime - this.lastTime >= 1000) {
      this.currentFPS = this.frameCount;
      this.frameCount = 0;
      this.lastTime = currentTime;

      // Update FPS history
      this.fpsHistory.push(this.currentFPS);
      if (this.fpsHistory.length > this.maxHistorySize) {
        this.fpsHistory.shift();
      }
    }
  }

  getCurrentFPS(): number {
    return this.currentFPS;
  }

  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return this.currentFPS;
    return this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
  }

  getMetrics(): PerformanceMetrics {
    return {
      currentFPS: this.currentFPS,
      averageFPS: this.getAverageFPS(),
      targetFPS: this.targetFPS,
      performanceRatio: this.currentFPS / this.targetFPS,
      isPerformanceGood: this.currentFPS >= this.targetFPS * 0.9,
    };
  }
}

export interface PerformanceMetrics {
  currentFPS: number;
  averageFPS: number;
  targetFPS: number;
  performanceRatio: number;
  isPerformanceGood: boolean;
}

/**
 * Default LOD configuration
 */
export const DEFAULT_LOD_CONFIG: LODConfig = {
  levels: [
    {
      distance: 10,
      complexity: 'high',
      geometryDetail: 1.0,
      textureResolution: 1024,
      showLabels: true,
      showDetails: true,
    },
    {
      distance: 25,
      complexity: 'medium',
      geometryDetail: 0.7,
      textureResolution: 512,
      showLabels: true,
      showDetails: false,
    },
    {
      distance: 50,
      complexity: 'low',
      geometryDetail: 0.4,
      textureResolution: 256,
      showLabels: false,
      showDetails: false,
    },
    {
      distance: 100,
      complexity: 'hidden',
      geometryDetail: 0.1,
      textureResolution: 64,
      showLabels: false,
      showDetails: false,
    },
  ],
  frustumCulling: true,
  maxVisibleArtifacts: 1000,
  adaptiveQuality: true,
  performanceTarget: 60,
};