import { Object3D, Geometry, Material, Texture, BufferGeometry } from 'three';

export interface MemoryUsage {
  geometries: number;
  materials: number;
  textures: number;
  objects: number;
  totalMemoryMB: number;
  gpuMemoryMB: number;
}

export interface MemoryConfig {
  maxMemoryMB: number;
  maxGPUMemoryMB: number;
  gcThresholdMB: number;
  gcInterval: number;
  enableAutoGC: boolean;
  retainRecentlyUsed: boolean;
  maxRetainTime: number;
}

export interface ManagedResource {
  id: string;
  resource: Object3D | Geometry | Material | Texture | BufferGeometry;
  type: 'geometry' | 'material' | 'texture' | 'object';
  memorySize: number;
  lastUsed: Date;
  referenceCount: number;
  isDisposed: boolean;
}

export class MemoryManager {
  private config: MemoryConfig;
  private resources: Map<string, ManagedResource> = new Map();
  private gcTimer: NodeJS.Timeout | null = null;
  private memoryUsage: MemoryUsage = {
    geometries: 0,
    materials: 0,
    textures: 0,
    objects: 0,
    totalMemoryMB: 0,
    gpuMemoryMB: 0,
  };

  constructor(config: MemoryConfig) {
    this.config = config;
    
    if (config.enableAutoGC) {
      this.startAutoGC();
    }
  }

  /**
   * Register a resource for memory management
   */
  registerResource(
    id: string,
    resource: Object3D | Geometry | Material | Texture | BufferGeometry,
    type: 'geometry' | 'material' | 'texture' | 'object'
  ): void {
    const memorySize = this.calculateResourceMemorySize(resource, type);
    
    const managedResource: ManagedResource = {
      id,
      resource,
      type,
      memorySize,
      lastUsed: new Date(),
      referenceCount: 1,
      isDisposed: false,
    };

    this.resources.set(id, managedResource);
    this.updateMemoryUsage();
  }

  /**
   * Unregister a resource
   */
  unregisterResource(id: string): void {
    const resource = this.resources.get(id);
    if (resource) {
      this.disposeResource(resource);
      this.resources.delete(id);
      this.updateMemoryUsage();
    }
  }

  /**
   * Mark a resource as used (updates last used time)
   */
  markResourceUsed(id: string): void {
    const resource = this.resources.get(id);
    if (resource) {
      resource.lastUsed = new Date();
    }
  }

  /**
   * Increment reference count for a resource
   */
  addReference(id: string): void {
    const resource = this.resources.get(id);
    if (resource) {
      resource.referenceCount++;
    }
  }

  /**
   * Decrement reference count for a resource
   */
  removeReference(id: string): void {
    const resource = this.resources.get(id);
    if (resource) {
      resource.referenceCount = Math.max(0, resource.referenceCount - 1);
      
      // If no references and auto GC is enabled, mark for disposal
      if (resource.referenceCount === 0 && this.config.enableAutoGC) {
        this.scheduleResourceDisposal(id);
      }
    }
  }

  /**
   * Force garbage collection
   */
  forceGarbageCollection(): number {
    const beforeMemory = this.memoryUsage.totalMemoryMB;
    
    const disposedResources = this.performGarbageCollection();
    this.updateMemoryUsage();
    
    const afterMemory = this.memoryUsage.totalMemoryMB;
    const freedMemory = beforeMemory - afterMemory;
    
    console.log(`Memory GC: Disposed ${disposedResources} resources, freed ${freedMemory.toFixed(2)}MB`);
    
    return freedMemory;
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): MemoryUsage {
    return { ...this.memoryUsage };
  }

  /**
   * Check if memory usage is within limits
   */
  isMemoryWithinLimits(): boolean {
    return (
      this.memoryUsage.totalMemoryMB <= this.config.maxMemoryMB &&
      this.memoryUsage.gpuMemoryMB <= this.config.maxGPUMemoryMB
    );
  }

  /**
   * Get memory pressure level (0-1, where 1 is maximum pressure)
   */
  getMemoryPressure(): number {
    const totalPressure = this.memoryUsage.totalMemoryMB / this.config.maxMemoryMB;
    const gpuPressure = this.memoryUsage.gpuMemoryMB / this.config.maxGPUMemoryMB;
    
    return Math.max(totalPressure, gpuPressure);
  }

  /**
   * Get resources sorted by disposal priority
   */
  getDisposalCandidates(): ManagedResource[] {
    const now = new Date();
    
    return Array.from(this.resources.values())
      .filter(resource => !resource.isDisposed && resource.referenceCount === 0)
      .sort((a, b) => {
        // Sort by last used time (oldest first)
        const aAge = now.getTime() - a.lastUsed.getTime();
        const bAge = now.getTime() - b.lastUsed.getTime();
        
        if (aAge !== bAge) {
          return bAge - aAge;
        }
        
        // Then by memory size (largest first)
        return b.memorySize - a.memorySize;
      });
  }

  /**
   * Dispose of resources to free memory
   */
  freeMemory(targetMemoryMB: number): number {
    const candidates = this.getDisposalCandidates();
    let freedMemory = 0;
    let disposedCount = 0;

    for (const candidate of candidates) {
      if (freedMemory >= targetMemoryMB) {
        break;
      }

      this.disposeResource(candidate);
      this.resources.delete(candidate.id);
      freedMemory += candidate.memorySize / (1024 * 1024);
      disposedCount++;
    }

    this.updateMemoryUsage();
    
    console.log(`Freed ${freedMemory.toFixed(2)}MB by disposing ${disposedCount} resources`);
    
    return freedMemory;
  }

  /**
   * Cleanup and dispose all resources
   */
  dispose(): void {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }

    for (const resource of this.resources.values()) {
      this.disposeResource(resource);
    }

    this.resources.clear();
    this.updateMemoryUsage();
  }

  /**
   * Calculate memory size of a resource
   */
  private calculateResourceMemorySize(
    resource: Object3D | Geometry | Material | Texture | BufferGeometry,
    type: string
  ): number {
    let size = 0;

    switch (type) {
      case 'geometry':
        if (resource instanceof BufferGeometry) {
          // Calculate size based on buffer attributes
          const attributes = resource.attributes;
          for (const key in attributes) {
            const attribute = attributes[key];
            size += attribute.array.byteLength;
          }
          
          if (resource.index) {
            size += resource.index.array.byteLength;
          }
        }
        break;

      case 'texture':
        if (resource instanceof Texture && resource.image) {
          const image = resource.image;
          if (image.width && image.height) {
            // Estimate texture memory (width * height * 4 bytes per pixel for RGBA)
            size = image.width * image.height * 4;
            
            // Account for mipmaps
            if (resource.generateMipmaps) {
              size *= 1.33; // Approximate mipmap overhead
            }
          }
        }
        break;

      case 'material':
        // Materials have relatively small memory footprint
        size = 1024; // 1KB estimate
        break;

      case 'object':
        // Objects themselves don't use much memory, but we track them
        size = 512; // 0.5KB estimate
        break;
    }

    return size;
  }

  /**
   * Update memory usage statistics
   */
  private updateMemoryUsage(): void {
    const usage = {
      geometries: 0,
      materials: 0,
      textures: 0,
      objects: 0,
      totalMemoryMB: 0,
      gpuMemoryMB: 0,
    };

    for (const resource of this.resources.values()) {
      if (!resource.isDisposed) {
        const sizeMB = resource.memorySize / (1024 * 1024);
        
        switch (resource.type) {
          case 'geometry':
            usage.geometries++;
            usage.gpuMemoryMB += sizeMB;
            break;
          case 'material':
            usage.materials++;
            usage.gpuMemoryMB += sizeMB;
            break;
          case 'texture':
            usage.textures++;
            usage.gpuMemoryMB += sizeMB;
            break;
          case 'object':
            usage.objects++;
            break;
        }
        
        usage.totalMemoryMB += sizeMB;
      }
    }

    this.memoryUsage = usage;
  }

  /**
   * Dispose a single resource
   */
  private disposeResource(resource: ManagedResource): void {
    if (resource.isDisposed) {
      return;
    }

    try {
      const res = resource.resource;

      if (res instanceof BufferGeometry) {
        res.dispose();
      } else if (res instanceof Material) {
        res.dispose();
      } else if (res instanceof Texture) {
        res.dispose();
      } else if (res instanceof Object3D) {
        // Remove from parent and dispose children
        if (res.parent) {
          res.parent.remove(res);
        }
        
        res.traverse((child) => {
          if (child instanceof Object3D) {
            // Dispose geometry and materials
            if ((child as any).geometry) {
              (child as any).geometry.dispose();
            }
            
            if ((child as any).material) {
              const material = (child as any).material;
              if (Array.isArray(material)) {
                material.forEach(mat => mat.dispose());
              } else {
                material.dispose();
              }
            }
          }
        });
      }

      resource.isDisposed = true;
    } catch (error) {
      console.warn(`Error disposing resource ${resource.id}:`, error);
      resource.isDisposed = true;
    }
  }

  /**
   * Perform garbage collection
   */
  private performGarbageCollection(): number {
    const now = new Date();
    const candidates = this.getDisposalCandidates();
    let disposedCount = 0;

    for (const candidate of candidates) {
      const age = now.getTime() - candidate.lastUsed.getTime();
      
      // Dispose if:
      // 1. No references and older than max retain time
      // 2. Memory pressure is high
      const shouldDispose = 
        (candidate.referenceCount === 0 && age > this.config.maxRetainTime) ||
        this.getMemoryPressure() > 0.8;

      if (shouldDispose) {
        this.disposeResource(candidate);
        this.resources.delete(candidate.id);
        disposedCount++;
      }
    }

    return disposedCount;
  }

  /**
   * Start automatic garbage collection
   */
  private startAutoGC(): void {
    this.gcTimer = setInterval(() => {
      if (this.memoryUsage.totalMemoryMB > this.config.gcThresholdMB) {
        this.performGarbageCollection();
        this.updateMemoryUsage();
      }
    }, this.config.gcInterval);
  }

  /**
   * Schedule a resource for disposal (with delay)
   */
  private scheduleResourceDisposal(id: string): void {
    setTimeout(() => {
      const resource = this.resources.get(id);
      if (resource && resource.referenceCount === 0) {
        this.disposeResource(resource);
        this.resources.delete(id);
        this.updateMemoryUsage();
      }
    }, 5000); // 5 second delay before disposal
  }
}

/**
 * Default memory management configuration
 */
export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  maxMemoryMB: 512,
  maxGPUMemoryMB: 256,
  gcThresholdMB: 400,
  gcInterval: 30000, // 30 seconds
  enableAutoGC: true,
  retainRecentlyUsed: true,
  maxRetainTime: 300000, // 5 minutes
};