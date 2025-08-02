import { Vector3 } from 'three';
import { CodeArtifact } from '../types';

export interface LoadingChunk {
  id: string;
  artifacts: CodeArtifact[];
  bounds: BoundingBox;
  priority: number;
  isLoaded: boolean;
  isLoading: boolean;
  loadedAt?: Date;
}

export interface BoundingBox {
  min: Vector3;
  max: Vector3;
  center: Vector3;
  size: Vector3;
}

export interface ProgressiveLoadingConfig {
  chunkSize: number;
  maxConcurrentLoads: number;
  preloadDistance: number;
  unloadDistance: number;
  priorityBias: {
    distance: number;
    complexity: number;
    changeFrequency: number;
  };
}

export interface LoadingProgress {
  totalChunks: number;
  loadedChunks: number;
  loadingChunks: number;
  progress: number;
  estimatedTimeRemaining: number;
}

export class ProgressiveLoader {
  private config: ProgressiveLoadingConfig;
  private chunks: Map<string, LoadingChunk> = new Map();
  private loadingQueue: string[] = [];
  private activeLoads: Set<string> = new Set();
  private loadingStartTimes: Map<string, number> = new Map();
  private averageLoadTime: number = 1000; // ms

  constructor(config: ProgressiveLoadingConfig) {
    this.config = config;
  }

  /**
   * Initialize progressive loading by chunking artifacts
   */
  initialize(artifacts: CodeArtifact[]): void {
    this.chunks.clear();
    this.loadingQueue = [];
    this.activeLoads.clear();

    const chunks = this.createChunks(artifacts);
    chunks.forEach(chunk => {
      this.chunks.set(chunk.id, chunk);
    });
  }

  /**
   * Update loading based on camera position
   */
  updateLoading(cameraPosition: Vector3): LoadingProgress {
    this.updateChunkPriorities(cameraPosition);
    this.processLoadingQueue();
    this.unloadDistantChunks(cameraPosition);

    return this.getLoadingProgress();
  }

  /**
   * Get currently loaded artifacts
   */
  getLoadedArtifacts(): CodeArtifact[] {
    const loadedArtifacts: CodeArtifact[] = [];
    
    for (const chunk of this.chunks.values()) {
      if (chunk.isLoaded) {
        loadedArtifacts.push(...chunk.artifacts);
      }
    }

    return loadedArtifacts;
  }

  /**
   * Get artifacts that should be visible based on current loading state
   */
  getVisibleArtifacts(cameraPosition: Vector3): CodeArtifact[] {
    const visibleArtifacts: CodeArtifact[] = [];
    
    for (const chunk of this.chunks.values()) {
      if (chunk.isLoaded) {
        const distance = cameraPosition.distanceTo(chunk.bounds.center);
        if (distance <= this.config.preloadDistance * 1.5) {
          visibleArtifacts.push(...chunk.artifacts);
        }
      }
    }

    return visibleArtifacts;
  }

  /**
   * Force load a specific chunk
   */
  async forceLoadChunk(chunkId: string): Promise<void> {
    const chunk = this.chunks.get(chunkId);
    if (!chunk || chunk.isLoaded || chunk.isLoading) {
      return;
    }

    await this.loadChunk(chunk);
  }

  /**
   * Create spatial chunks from artifacts
   */
  private createChunks(artifacts: CodeArtifact[]): LoadingChunk[] {
    if (artifacts.length === 0) return [];

    // Calculate overall bounds
    const overallBounds = this.calculateBounds(artifacts);
    
    // Determine chunk grid size
    const chunkCount = Math.ceil(artifacts.length / this.config.chunkSize);
    const gridSize = Math.ceil(Math.sqrt(chunkCount));
    
    const chunkWidth = overallBounds.size.x / gridSize;
    const chunkHeight = overallBounds.size.z / gridSize;
    
    const chunks: LoadingChunk[] = [];
    const chunkMap: Map<string, CodeArtifact[]> = new Map();

    // Assign artifacts to chunks based on spatial position
    artifacts.forEach(artifact => {
      const chunkX = Math.floor((artifact.position3D.x - overallBounds.min.x) / chunkWidth);
      const chunkZ = Math.floor((artifact.position3D.z - overallBounds.min.z) / chunkHeight);
      const chunkKey = `${Math.min(chunkX, gridSize - 1)}_${Math.min(chunkZ, gridSize - 1)}`;
      
      if (!chunkMap.has(chunkKey)) {
        chunkMap.set(chunkKey, []);
      }
      chunkMap.get(chunkKey)!.push(artifact);
    });

    // Create chunk objects
    chunkMap.forEach((chunkArtifacts, chunkKey) => {
      const bounds = this.calculateBounds(chunkArtifacts);
      const priority = this.calculateChunkPriority(chunkArtifacts, bounds);

      chunks.push({
        id: chunkKey,
        artifacts: chunkArtifacts,
        bounds,
        priority,
        isLoaded: false,
        isLoading: false,
      });
    });

    return chunks;
  }

  /**
   * Calculate bounding box for a set of artifacts
   */
  private calculateBounds(artifacts: CodeArtifact[]): BoundingBox {
    if (artifacts.length === 0) {
      return {
        min: new Vector3(),
        max: new Vector3(),
        center: new Vector3(),
        size: new Vector3(),
      };
    }

    const min = artifacts[0].position3D.clone();
    const max = artifacts[0].position3D.clone();

    artifacts.forEach(artifact => {
      min.min(artifact.position3D);
      max.max(artifact.position3D);
    });

    const center = min.clone().add(max).multiplyScalar(0.5);
    const size = max.clone().sub(min);

    return { min, max, center, size };
  }

  /**
   * Calculate priority for a chunk
   */
  private calculateChunkPriority(artifacts: CodeArtifact[], bounds: BoundingBox): number {
    let priority = 0;

    // Base priority on artifact count
    priority += artifacts.length * 0.1;

    // Add complexity-based priority
    const avgComplexity = artifacts.reduce((sum, a) => sum + a.complexity, 0) / artifacts.length;
    priority += avgComplexity * this.config.priorityBias.complexity;

    // Add change frequency priority
    const avgChangeFreq = artifacts.reduce((sum, a) => sum + a.changeFrequency, 0) / artifacts.length;
    priority += avgChangeFreq * this.config.priorityBias.changeFrequency;

    return priority;
  }

  /**
   * Update chunk priorities based on camera position
   */
  private updateChunkPriorities(cameraPosition: Vector3): void {
    for (const chunk of this.chunks.values()) {
      const distance = cameraPosition.distanceTo(chunk.bounds.center);
      const distancePriority = Math.max(0, 100 - distance) * this.config.priorityBias.distance;
      
      chunk.priority = this.calculateChunkPriority(chunk.artifacts, chunk.bounds) + distancePriority;

      // Add to loading queue if within preload distance and not loaded/loading
      if (distance <= this.config.preloadDistance && !chunk.isLoaded && !chunk.isLoading) {
        if (!this.loadingQueue.includes(chunk.id)) {
          this.loadingQueue.push(chunk.id);
        }
      }
    }

    // Sort loading queue by priority
    this.loadingQueue.sort((a, b) => {
      const chunkA = this.chunks.get(a)!;
      const chunkB = this.chunks.get(b)!;
      return chunkB.priority - chunkA.priority;
    });
  }

  /**
   * Process the loading queue
   */
  private processLoadingQueue(): void {
    while (
      this.activeLoads.size < this.config.maxConcurrentLoads &&
      this.loadingQueue.length > 0
    ) {
      const chunkId = this.loadingQueue.shift()!;
      const chunk = this.chunks.get(chunkId);
      
      if (chunk && !chunk.isLoaded && !chunk.isLoading) {
        this.loadChunk(chunk);
      }
    }
  }

  /**
   * Load a chunk asynchronously
   */
  private async loadChunk(chunk: LoadingChunk): Promise<void> {
    chunk.isLoading = true;
    this.activeLoads.add(chunk.id);
    this.loadingStartTimes.set(chunk.id, performance.now());

    try {
      // Simulate loading time based on chunk size
      const loadTime = Math.max(100, chunk.artifacts.length * 10);
      await new Promise(resolve => setTimeout(resolve, loadTime));

      // Process artifacts (this could involve additional data fetching, processing, etc.)
      await this.processChunkArtifacts(chunk.artifacts);

      chunk.isLoaded = true;
      chunk.loadedAt = new Date();

      // Update average load time
      const actualLoadTime = performance.now() - this.loadingStartTimes.get(chunk.id)!;
      this.averageLoadTime = (this.averageLoadTime + actualLoadTime) / 2;

    } catch (error) {
      console.error(`Failed to load chunk ${chunk.id}:`, error);
    } finally {
      chunk.isLoading = false;
      this.activeLoads.delete(chunk.id);
      this.loadingStartTimes.delete(chunk.id);
    }
  }

  /**
   * Process artifacts in a chunk (placeholder for actual processing)
   */
  private async processChunkArtifacts(artifacts: CodeArtifact[]): Promise<void> {
    // This could involve:
    // - Loading additional metadata
    // - Processing dependencies
    // - Generating 3D positions
    // - Calculating metrics
    
    // For now, just simulate processing time
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Unload distant chunks to free memory
   */
  private unloadDistantChunks(cameraPosition: Vector3): void {
    for (const chunk of this.chunks.values()) {
      if (chunk.isLoaded) {
        const distance = cameraPosition.distanceTo(chunk.bounds.center);
        
        if (distance > this.config.unloadDistance) {
          chunk.isLoaded = false;
          chunk.loadedAt = undefined;
          
          // Remove from loading queue if present
          const queueIndex = this.loadingQueue.indexOf(chunk.id);
          if (queueIndex !== -1) {
            this.loadingQueue.splice(queueIndex, 1);
          }
        }
      }
    }
  }

  /**
   * Get current loading progress
   */
  private getLoadingProgress(): LoadingProgress {
    const totalChunks = this.chunks.size;
    const loadedChunks = Array.from(this.chunks.values()).filter(c => c.isLoaded).length;
    const loadingChunks = this.activeLoads.size;
    const progress = totalChunks > 0 ? loadedChunks / totalChunks : 1;
    
    const remainingChunks = totalChunks - loadedChunks - loadingChunks;
    const estimatedTimeRemaining = remainingChunks * this.averageLoadTime;

    return {
      totalChunks,
      loadedChunks,
      loadingChunks,
      progress,
      estimatedTimeRemaining,
    };
  }

  /**
   * Get chunk information for debugging
   */
  getChunkInfo(): Array<{
    id: string;
    artifactCount: number;
    isLoaded: boolean;
    isLoading: boolean;
    priority: number;
    bounds: BoundingBox;
  }> {
    return Array.from(this.chunks.values()).map(chunk => ({
      id: chunk.id,
      artifactCount: chunk.artifacts.length,
      isLoaded: chunk.isLoaded,
      isLoading: chunk.isLoading,
      priority: chunk.priority,
      bounds: chunk.bounds,
    }));
  }
}

/**
 * Default progressive loading configuration
 */
export const DEFAULT_PROGRESSIVE_CONFIG: ProgressiveLoadingConfig = {
  chunkSize: 100,
  maxConcurrentLoads: 3,
  preloadDistance: 50,
  unloadDistance: 100,
  priorityBias: {
    distance: 1.0,
    complexity: 0.5,
    changeFrequency: 0.3,
  },
};