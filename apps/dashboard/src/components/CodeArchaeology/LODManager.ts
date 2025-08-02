import { Vector3, Camera, Frustum, Matrix4 } from 'three';
import { CodeArtifact } from './types';

export interface LODLevel {
  name: string;
  minDistance: number;
  maxDistance: number;
  geometryComplexity: 'low' | 'medium' | 'high';
  showLabels: boolean;
  showDetails: boolean;
  maxArtifacts: number;
  cullingEnabled: boolean;
}

export interface LODConfig {
  levels: LODLevel[];
  adaptiveQuality: boolean;
  performanceTarget: number; // Target FPS
  maxRenderDistance: number;
  frustumCulling: boolean;
  occlusionCulling: boolean;
}

export interface ArtifactLOD {
  artifact: CodeArtifact;
  level: LODLevel;
  distance: number;
  isVisible: boolean;
  shouldRender: boolean;
  geometryComplexity: 'low' | 'medium' | 'high';
  showLabels: boolean;
  showDetails: boolean;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  renderCount: number;
  culledCount: number;
  memoryUsage: number;
  lastUpdate: number;
}

export class LODManager {
  private config: LODConfig;
  private performanceMetrics: PerformanceMetrics;
  private frustum: Frustum;
  private cameraMatrix: Matrix4;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private performanceHistory: number[] = [];

  constructor(config: LODConfig) {
    this.config = config;
    this.frustum = new Frustum();
    this.cameraMatrix = new Matrix4();
    this.performanceMetrics = {
      fps: 60,
      frameTime: 16.67,
      renderCount: 0,
      culledCount: 0,
      memoryUsage: 0,
      lastUpdate: Date.now(),
    };
  }

  /**
   * Update LOD calculations based on camera position and performance
   */
  updateLOD(
    artifacts: CodeArtifact[],
    camera: Camera,
    deltaTime: number
  ): ArtifactLOD[] {
    this.updatePerformanceMetrics(deltaTime);
    this.updateFrustum(camera);

    const cameraPosition = camera.position;
    const artifactLODs: ArtifactLOD[] = [];

    // Sort artifacts by distance for better culling
    const sortedArtifacts = artifacts
      .map(artifact => ({
        artifact,
        distance: cameraPosition.distanceTo(artifact.position3D),
      }))
      .sort((a, b) => a.distance - b.distance);

    let renderCount = 0;
    let culledCount = 0;

    for (const { artifact, distance } of sortedArtifacts) {
      const lodLevel = this.determineLODLevel(distance);
      const isInFrustum = this.config.frustumCulling
        ? this.isInFrustum(artifact.position3D)
        : true;
      
      const shouldRender = this.shouldRenderArtifact(
        artifact,
        distance,
        lodLevel,
        isInFrustum,
        renderCount
      );

      if (shouldRender) {
        renderCount++;
      } else {
        culledCount++;
      }

      artifactLODs.push({
        artifact,
        level: lodLevel,
        distance,
        isVisible: isInFrustum,
        shouldRender,
        geometryComplexity: lodLevel.geometryComplexity,
        showLabels: lodLevel.showLabels && distance < 50,
        showDetails: lodLevel.showDetails && distance < 20,
      });
    }

    this.performanceMetrics.renderCount = renderCount;
    this.performanceMetrics.culledCount = culledCount;

    // Adaptive quality adjustment
    if (this.config.adaptiveQuality) {
      this.adjustQualityBasedOnPerformance();
    }

    return artifactLODs;
  }

  /**
   * Determine the appropriate LOD level based on distance
   */
  private determineLODLevel(distance: number): LODLevel {
    for (const level of this.config.levels) {
      if (distance >= level.minDistance && distance < level.maxDistance) {
        return level;
      }
    }
    // Return the lowest quality level if distance exceeds all ranges
    return this.config.levels[this.config.levels.length - 1];
  }

  /**
   * Check if an artifact should be rendered based on various criteria
   */
  private shouldRenderArtifact(
    artifact: CodeArtifact,
    distance: number,
    lodLevel: LODLevel,
    isInFrustum: boolean,
    currentRenderCount: number
  ): boolean {
    // Distance culling
    if (distance > this.config.maxRenderDistance) {
      return false;
    }

    // Frustum culling
    if (!isInFrustum) {
      return false;
    }

    // Performance-based culling
    if (currentRenderCount >= lodLevel.maxArtifacts) {
      return false;
    }

    // Adaptive quality culling
    if (this.performanceMetrics.fps < this.config.performanceTarget) {
      const performanceRatio = this.performanceMetrics.fps / this.config.performanceTarget;
      const cullProbability = 1 - performanceRatio;
      
      // Cull less important artifacts when performance is poor
      if (Math.random() < cullProbability && artifact.complexity < 5) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a position is within the camera frustum
   */
  private isInFrustum(position: Vector3): boolean {
    return this.frustum.containsPoint(position);
  }

  /**
   * Update the frustum based on camera state
   */
  private updateFrustum(camera: Camera): void {
    this.cameraMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.cameraMatrix);
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(deltaTime: number): void {
    this.frameCount++;
    const currentTime = Date.now();
    
    // Calculate FPS
    const frameTime = deltaTime * 1000; // Convert to milliseconds
    this.performanceMetrics.frameTime = frameTime;
    this.performanceMetrics.fps = 1000 / frameTime;

    // Keep performance history for adaptive adjustments
    this.performanceHistory.push(this.performanceMetrics.fps);
    if (this.performanceHistory.length > 60) { // Keep last 60 frames
      this.performanceHistory.shift();
    }

    this.performanceMetrics.lastUpdate = currentTime;
  }

  /**
   * Adjust quality settings based on performance
   */
  private adjustQualityBasedOnPerformance(): void {
    const avgFPS = this.performanceHistory.reduce((sum, fps) => sum + fps, 0) / this.performanceHistory.length;
    
    if (avgFPS < this.config.performanceTarget * 0.8) {
      // Performance is poor, reduce quality
      this.reduceQuality();
    } else if (avgFPS > this.config.performanceTarget * 1.2) {
      // Performance is good, increase quality
      this.increaseQuality();
    }
  }

  /**
   * Reduce rendering quality to improve performance
   */
  private reduceQuality(): void {
    // Reduce max render distance
    this.config.maxRenderDistance = Math.max(50, this.config.maxRenderDistance * 0.9);
    
    // Reduce max artifacts per level
    this.config.levels.forEach(level => {
      level.maxArtifacts = Math.max(10, Math.floor(level.maxArtifacts * 0.9));
    });
  }

  /**
   * Increase rendering quality when performance allows
   */
  private increaseQuality(): void {
    // Increase max render distance
    this.config.maxRenderDistance = Math.min(200, this.config.maxRenderDistance * 1.05);
    
    // Increase max artifacts per level
    this.config.levels.forEach(level => {
      level.maxArtifacts = Math.min(1000, Math.floor(level.maxArtifacts * 1.05));
    });
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Update LOD configuration
   */
  updateConfig(newConfig: Partial<LODConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get default LOD configuration
   */
  static getDefaultConfig(): LODConfig {
    return {
      levels: [
        {
          name: 'High Detail',
          minDistance: 0,
          maxDistance: 25,
          geometryComplexity: 'high',
          showLabels: true,
          showDetails: true,
          maxArtifacts: 100,
          cullingEnabled: false,
        },
        {
          name: 'Medium Detail',
          minDistance: 25,
          maxDistance: 75,
          geometryComplexity: 'medium',
          showLabels: true,
          showDetails: false,
          maxArtifacts: 300,
          cullingEnabled: true,
        },
        {
          name: 'Low Detail',
          minDistance: 75,
          maxDistance: 150,
          geometryComplexity: 'low',
          showLabels: false,
          showDetails: false,
          maxArtifacts: 500,
          cullingEnabled: true,
        },
        {
          name: 'Minimal',
          minDistance: 150,
          maxDistance: Infinity,
          geometryComplexity: 'low',
          showLabels: false,
          showDetails: false,
          maxArtifacts: 100,
          cullingEnabled: true,
        },
      ],
      adaptiveQuality: true,
      performanceTarget: 60,
      maxRenderDistance: 200,
      frustumCulling: true,
      occlusionCulling: false,
    };
  }
}