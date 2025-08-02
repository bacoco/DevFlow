import { Vector3 } from 'three';
import { CodeArtifact } from './types';

export interface PositioningConfig {
  algorithm: 'hierarchical' | 'force-directed' | 'circular' | 'grid' | 'clustered';
  spacing: number;
  clusterRadius: number;
  forceStrength: number;
  iterations: number;
  centerAttraction: number;
  repulsionStrength: number;
}

export interface ClusterInfo {
  id: string;
  center: Vector3;
  artifacts: string[];
  radius: number;
  color: string;
}

export class PositioningAlgorithms {
  private config: PositioningConfig;

  constructor(config: Partial<PositioningConfig> = {}) {
    this.config = {
      algorithm: 'force-directed',
      spacing: 3,
      clusterRadius: 10,
      forceStrength: 0.1,
      iterations: 100,
      centerAttraction: 0.01,
      repulsionStrength: 1.0,
      ...config,
    };
  }

  /**
   * Main positioning function that applies the selected algorithm
   */
  positionArtifacts(artifacts: CodeArtifact[]): CodeArtifact[] {
    switch (this.config.algorithm) {
      case 'hierarchical':
        return this.hierarchicalLayout(artifacts);
      case 'force-directed':
        return this.forceDirectedLayout(artifacts);
      case 'circular':
        return this.circularLayout(artifacts);
      case 'grid':
        return this.gridLayout(artifacts);
      case 'clustered':
        return this.clusteredLayout(artifacts);
      default:
        return artifacts;
    }
  }

  /**
   * Hierarchical layout based on file structure and dependencies
   */
  private hierarchicalLayout(artifacts: CodeArtifact[]): CodeArtifact[] {
    const positioned = [...artifacts];
    const levels = new Map<string, number>();
    const visited = new Set<string>();

    // Calculate hierarchy levels based on dependencies
    const calculateLevel = (artifactId: string, currentLevel = 0): number => {
      if (visited.has(artifactId)) {
        return levels.get(artifactId) || 0;
      }

      visited.add(artifactId);
      const artifact = positioned.find(a => a.id === artifactId);
      if (!artifact) return currentLevel;

      let maxDependencyLevel = currentLevel;
      artifact.dependencies.forEach(depId => {
        const depLevel = calculateLevel(depId, currentLevel + 1);
        maxDependencyLevel = Math.max(maxDependencyLevel, depLevel);
      });

      levels.set(artifactId, maxDependencyLevel);
      return maxDependencyLevel;
    };

    // Calculate levels for all artifacts
    positioned.forEach(artifact => {
      if (!visited.has(artifact.id)) {
        calculateLevel(artifact.id);
      }
    });

    // Position artifacts based on hierarchy
    const levelGroups = new Map<number, CodeArtifact[]>();
    positioned.forEach(artifact => {
      const level = levels.get(artifact.id) || 0;
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(artifact);
    });

    // Arrange each level
    levelGroups.forEach((levelArtifacts, level) => {
      const y = level * this.config.spacing * 2;
      const angleStep = (2 * Math.PI) / Math.max(1, levelArtifacts.length);
      const radius = Math.max(5, levelArtifacts.length * 0.5);

      levelArtifacts.forEach((artifact, index) => {
        const angle = index * angleStep;
        artifact.position3D = new Vector3(
          Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius
        );
      });
    });

    return positioned;
  }

  /**
   * Force-directed layout for natural clustering
   */
  private forceDirectedLayout(artifacts: CodeArtifact[]): CodeArtifact[] {
    const positioned = [...artifacts];
    
    // Initialize random positions if not set
    positioned.forEach(artifact => {
      if (!artifact.position3D || (artifact.position3D.x === 0 && artifact.position3D.y === 0 && artifact.position3D.z === 0)) {
        artifact.position3D = new Vector3(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20
        );
      }
    });

    // Run force simulation
    for (let iteration = 0; iteration < this.config.iterations; iteration++) {
      const forces = new Map<string, Vector3>();

      // Initialize forces
      positioned.forEach(artifact => {
        forces.set(artifact.id, new Vector3(0, 0, 0));
      });

      // Calculate repulsion forces (all artifacts repel each other)
      for (let i = 0; i < positioned.length; i++) {
        for (let j = i + 1; j < positioned.length; j++) {
          const artifactA = positioned[i];
          const artifactB = positioned[j];
          
          const distance = artifactA.position3D.distanceTo(artifactB.position3D);
          if (distance < 0.1) continue; // Avoid division by zero

          const repulsionForce = this.config.repulsionStrength / (distance * distance);
          const direction = new Vector3()
            .subVectors(artifactA.position3D, artifactB.position3D)
            .normalize();

          forces.get(artifactA.id)!.add(direction.clone().multiplyScalar(repulsionForce));
          forces.get(artifactB.id)!.add(direction.clone().multiplyScalar(-repulsionForce));
        }
      }

      // Calculate attraction forces (dependencies attract)
      positioned.forEach(artifact => {
        artifact.dependencies.forEach(depId => {
          const dependency = positioned.find(a => a.id === depId);
          if (!dependency) return;

          const distance = artifact.position3D.distanceTo(dependency.position3D);
          const attractionForce = distance * this.config.forceStrength;
          const direction = new Vector3()
            .subVectors(dependency.position3D, artifact.position3D)
            .normalize();

          forces.get(artifact.id)!.add(direction.multiplyScalar(attractionForce));
        });
      });

      // Apply center attraction
      positioned.forEach(artifact => {
        const centerForce = artifact.position3D.clone().multiplyScalar(-this.config.centerAttraction);
        forces.get(artifact.id)!.add(centerForce);
      });

      // Apply forces to positions
      positioned.forEach(artifact => {
        const force = forces.get(artifact.id)!;
        artifact.position3D.add(force);
      });
    }

    return positioned;
  }

  /**
   * Circular layout for equal distribution
   */
  private circularLayout(artifacts: CodeArtifact[]): CodeArtifact[] {
    const positioned = [...artifacts];
    const radius = Math.max(5, positioned.length * 0.8);
    const angleStep = (2 * Math.PI) / Math.max(1, positioned.length);

    positioned.forEach((artifact, index) => {
      const angle = index * angleStep;
      const height = Math.sin(index * 0.5) * 2; // Add some vertical variation
      
      artifact.position3D = new Vector3(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );
    });

    return positioned;
  }

  /**
   * Grid layout for organized structure
   */
  private gridLayout(artifacts: CodeArtifact[]): CodeArtifact[] {
    const positioned = [...artifacts];
    const gridSize = Math.ceil(Math.sqrt(positioned.length));
    
    positioned.forEach((artifact, index) => {
      const x = (index % gridSize) * this.config.spacing;
      const z = Math.floor(index / gridSize) * this.config.spacing;
      const y = (artifact.complexity || 0) * 0.5; // Height based on complexity
      
      artifact.position3D = new Vector3(
        x - (gridSize * this.config.spacing) / 2,
        y,
        z - (gridSize * this.config.spacing) / 2
      );
    });

    return positioned;
  }

  /**
   * Clustered layout based on similarity and relationships
   */
  private clusteredLayout(artifacts: CodeArtifact[]): CodeArtifact[] {
    const positioned = [...artifacts];
    const clusters = this.generateClusters(positioned);
    
    clusters.forEach(cluster => {
      const clusterArtifacts = positioned.filter(a => cluster.artifacts.includes(a.id));
      const angleStep = (2 * Math.PI) / Math.max(1, clusterArtifacts.length);
      
      clusterArtifacts.forEach((artifact, index) => {
        const angle = index * angleStep;
        const localRadius = cluster.radius * (0.3 + Math.random() * 0.4); // Vary radius within cluster
        
        artifact.position3D = new Vector3(
          cluster.center.x + Math.cos(angle) * localRadius,
          cluster.center.y + (Math.random() - 0.5) * 2,
          cluster.center.z + Math.sin(angle) * localRadius
        );
      });
    });

    return positioned;
  }

  /**
   * Generate clusters based on artifact relationships and properties
   */
  private generateClusters(artifacts: CodeArtifact[]): ClusterInfo[] {
    const clusters: ClusterInfo[] = [];
    const clustered = new Set<string>();
    
    // Group by file path similarity
    const pathGroups = new Map<string, CodeArtifact[]>();
    artifacts.forEach(artifact => {
      const pathParts = artifact.filePath.split('/');
      const directory = pathParts.slice(0, -1).join('/') || 'root';
      
      if (!pathGroups.has(directory)) {
        pathGroups.set(directory, []);
      }
      pathGroups.get(directory)!.push(artifact);
    });

    // Create clusters from path groups
    let clusterIndex = 0;
    pathGroups.forEach((groupArtifacts, directory) => {
      if (groupArtifacts.length > 1) {
        const angle = (clusterIndex / pathGroups.size) * 2 * Math.PI;
        const distance = this.config.clusterRadius;
        
        clusters.push({
          id: `cluster-${clusterIndex}`,
          center: new Vector3(
            Math.cos(angle) * distance,
            0,
            Math.sin(angle) * distance
          ),
          artifacts: groupArtifacts.map(a => a.id),
          radius: Math.max(3, groupArtifacts.length * 0.5),
          color: this.getClusterColor(clusterIndex),
        });
        
        groupArtifacts.forEach(a => clustered.add(a.id));
        clusterIndex++;
      }
    });

    // Handle unclustered artifacts
    const unclustered = artifacts.filter(a => !clustered.has(a.id));
    if (unclustered.length > 0) {
      clusters.push({
        id: 'cluster-misc',
        center: new Vector3(0, 5, 0),
        artifacts: unclustered.map(a => a.id),
        radius: Math.max(3, unclustered.length * 0.3),
        color: '#cccccc',
      });
    }

    return clusters;
  }

  /**
   * Get color for cluster visualization
   */
  private getClusterColor(index: number): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    return colors[index % colors.length];
  }

  /**
   * Optimize positions to reduce overlaps and improve readability
   */
  optimizePositions(artifacts: CodeArtifact[]): CodeArtifact[] {
    const positioned = [...artifacts];
    const minDistance = this.config.spacing * 0.8;

    // Separate overlapping artifacts
    for (let iteration = 0; iteration < 10; iteration++) {
      let hasOverlaps = false;

      for (let i = 0; i < positioned.length; i++) {
        for (let j = i + 1; j < positioned.length; j++) {
          const artifactA = positioned[i];
          const artifactB = positioned[j];
          
          const distance = artifactA.position3D.distanceTo(artifactB.position3D);
          
          if (distance < minDistance) {
            hasOverlaps = true;
            
            // Move artifacts apart
            const direction = new Vector3()
              .subVectors(artifactA.position3D, artifactB.position3D)
              .normalize();
            
            const moveDistance = (minDistance - distance) / 2;
            artifactA.position3D.add(direction.multiplyScalar(moveDistance));
            artifactB.position3D.add(direction.multiplyScalar(-moveDistance));
          }
        }
      }

      if (!hasOverlaps) break;
    }

    return positioned;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PositioningConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): PositioningConfig {
    return { ...this.config };
  }
}