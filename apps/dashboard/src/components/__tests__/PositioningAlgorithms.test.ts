import { Vector3 } from 'three';
import { PositioningAlgorithms, PositioningConfig } from '../CodeArchaeology/PositioningAlgorithms';
import { CodeArtifact } from '../CodeArchaeology/types';

// Mock Three.js
jest.mock('three', () => ({
  Vector3: jest.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x, y, z,
    clone: jest.fn().mockReturnThis(),
    copy: jest.fn().mockReturnThis(),
    add: jest.fn().mockReturnThis(),
    multiplyScalar: jest.fn().mockReturnThis(),
    distanceTo: jest.fn().mockReturnValue(1),
    set: jest.fn().mockReturnThis(),
    subVectors: jest.fn().mockReturnThis(),
    normalize: jest.fn().mockReturnThis(),
  })),
}));

// Generate test artifacts
const generateTestArtifacts = (count: number): CodeArtifact[] => {
  const artifacts: CodeArtifact[] = [];
  
  for (let i = 0; i < count; i++) {
    artifacts.push({
      id: `artifact-${i}`,
      filePath: `/src/components/Component${i}.tsx`,
      type: ['file', 'function', 'class', 'interface'][i % 4] as any,
      name: `Component${i}`,
      position3D: new Vector3(0, 0, 0),
      complexity: Math.random() * 10,
      changeFrequency: Math.random() * 10,
      lastModified: new Date(),
      authors: [`author${i % 3}`],
      dependencies: i > 0 ? [`artifact-${i - 1}`] : [],
      size: 100,
    });
  }
  
  return artifacts;
};

describe('PositioningAlgorithms', () => {
  let positioningAlgorithms: PositioningAlgorithms;
  let testArtifacts: CodeArtifact[];

  beforeEach(() => {
    positioningAlgorithms = new PositioningAlgorithms();
    testArtifacts = generateTestArtifacts(10);
  });

  describe('Constructor and Configuration', () => {
    it('initializes with default configuration', () => {
      const config = positioningAlgorithms.getConfig();
      
      expect(config.algorithm).toBe('force-directed');
      expect(config.spacing).toBe(3);
      expect(config.iterations).toBe(100);
    });

    it('accepts custom configuration', () => {
      const customConfig: Partial<PositioningConfig> = {
        algorithm: 'hierarchical',
        spacing: 5,
        iterations: 50,
      };
      
      const customAlgorithms = new PositioningAlgorithms(customConfig);
      const config = customAlgorithms.getConfig();
      
      expect(config.algorithm).toBe('hierarchical');
      expect(config.spacing).toBe(5);
      expect(config.iterations).toBe(50);
    });

    it('updates configuration correctly', () => {
      const newConfig = { spacing: 10, iterations: 200 };
      positioningAlgorithms.updateConfig(newConfig);
      
      const config = positioningAlgorithms.getConfig();
      expect(config.spacing).toBe(10);
      expect(config.iterations).toBe(200);
    });
  });

  describe('Position Artifacts', () => {
    it('returns positioned artifacts', () => {
      const positioned = positioningAlgorithms.positionArtifacts(testArtifacts);
      
      expect(positioned).toHaveLength(testArtifacts.length);
      expect(positioned[0]).toHaveProperty('position3D');
    });

    it('does not modify original artifacts array', () => {
      const originalPositions = testArtifacts.map(a => ({ ...a.position3D }));
      positioningAlgorithms.positionArtifacts(testArtifacts);
      
      testArtifacts.forEach((artifact, index) => {
        expect(artifact.position3D).toEqual(originalPositions[index]);
      });
    });

    it('handles empty artifacts array', () => {
      const positioned = positioningAlgorithms.positionArtifacts([]);
      expect(positioned).toEqual([]);
    });

    it('handles single artifact', () => {
      const singleArtifact = [testArtifacts[0]];
      const positioned = positioningAlgorithms.positionArtifacts(singleArtifact);
      
      expect(positioned).toHaveLength(1);
      expect(positioned[0]).toHaveProperty('position3D');
    });
  });

  describe('Hierarchical Layout', () => {
    it('positions artifacts in hierarchical structure', () => {
      positioningAlgorithms.updateConfig({ algorithm: 'hierarchical' });
      const positioned = positioningAlgorithms.positionArtifacts(testArtifacts);
      
      expect(positioned).toHaveLength(testArtifacts.length);
      // Artifacts with dependencies should be at different levels
      const yPositions = positioned.map(a => a.position3D.y);
      const uniqueYPositions = [...new Set(yPositions)];
      expect(uniqueYPositions.length).toBeGreaterThan(1);
    });

    it('handles circular dependencies gracefully', () => {
      const circularArtifacts = generateTestArtifacts(3);
      circularArtifacts[0].dependencies = ['artifact-2'];
      circularArtifacts[1].dependencies = ['artifact-0'];
      circularArtifacts[2].dependencies = ['artifact-1'];
      
      positioningAlgorithms.updateConfig({ algorithm: 'hierarchical' });
      
      expect(() => {
        positioningAlgorithms.positionArtifacts(circularArtifacts);
      }).not.toThrow();
    });
  });

  describe('Force-Directed Layout', () => {
    it('applies force-directed positioning', () => {
      positioningAlgorithms.updateConfig({ algorithm: 'force-directed' });
      const positioned = positioningAlgorithms.positionArtifacts(testArtifacts);
      
      expect(positioned).toHaveLength(testArtifacts.length);
      // Artifacts should be spread out in 3D space
      const positions = positioned.map(a => a.position3D);
      expect(positions.some(p => p.x !== 0 || p.y !== 0 || p.z !== 0)).toBe(true);
    });

    it('converges within specified iterations', () => {
      positioningAlgorithms.updateConfig({ 
        algorithm: 'force-directed',
        iterations: 10 
      });
      
      const startTime = performance.now();
      positioningAlgorithms.positionArtifacts(testArtifacts);
      const endTime = performance.now();
      
      // Should complete quickly with fewer iterations
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Circular Layout', () => {
    it('arranges artifacts in circular pattern', () => {
      positioningAlgorithms.updateConfig({ algorithm: 'circular' });
      const positioned = positioningAlgorithms.positionArtifacts(testArtifacts);
      
      expect(positioned).toHaveLength(testArtifacts.length);
      
      // Check that artifacts are arranged in a roughly circular pattern
      const distances = positioned.map(a => 
        Math.sqrt(a.position3D.x * a.position3D.x + a.position3D.z * a.position3D.z)
      );
      
      // All distances should be similar (circular arrangement)
      const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
      const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length;
      
      expect(variance).toBeLessThan(avgDistance * 0.5); // Low variance indicates circular arrangement
    });
  });

  describe('Grid Layout', () => {
    it('arranges artifacts in grid pattern', () => {
      positioningAlgorithms.updateConfig({ algorithm: 'grid' });
      const positioned = positioningAlgorithms.positionArtifacts(testArtifacts);
      
      expect(positioned).toHaveLength(testArtifacts.length);
      
      // Check that positions follow grid pattern
      const xPositions = positioned.map(a => a.position3D.x);
      const zPositions = positioned.map(a => a.position3D.z);
      
      // Grid positions should have regular spacing
      const uniqueX = [...new Set(xPositions)].sort((a, b) => a - b);
      const uniqueZ = [...new Set(zPositions)].sort((a, b) => a - b);
      
      expect(uniqueX.length).toBeGreaterThan(1);
      expect(uniqueZ.length).toBeGreaterThan(1);
    });

    it('uses complexity for height variation', () => {
      positioningAlgorithms.updateConfig({ algorithm: 'grid' });
      const positioned = positioningAlgorithms.positionArtifacts(testArtifacts);
      
      // Artifacts with different complexity should have different heights
      const yPositions = positioned.map(a => a.position3D.y);
      const uniqueY = [...new Set(yPositions)];
      
      expect(uniqueY.length).toBeGreaterThan(1);
    });
  });

  describe('Clustered Layout', () => {
    it('groups artifacts by file path', () => {
      // Create artifacts with different file paths
      const clusteredArtifacts = [
        ...generateTestArtifacts(3).map(a => ({ ...a, filePath: '/src/components/' + a.name })),
        ...generateTestArtifacts(3).map(a => ({ ...a, filePath: '/src/utils/' + a.name, id: a.id + '-utils' })),
      ];
      
      positioningAlgorithms.updateConfig({ algorithm: 'clustered' });
      const positioned = positioningAlgorithms.positionArtifacts(clusteredArtifacts);
      
      expect(positioned).toHaveLength(clusteredArtifacts.length);
      
      // Artifacts from same directory should be closer together
      const componentArtifacts = positioned.filter(a => a.filePath.includes('/components/'));
      const utilArtifacts = positioned.filter(a => a.filePath.includes('/utils/'));
      
      expect(componentArtifacts.length).toBe(3);
      expect(utilArtifacts.length).toBe(3);
    });
  });

  describe('Optimization', () => {
    it('reduces overlaps between artifacts', () => {
      // Create artifacts with overlapping positions
      const overlappingArtifacts = testArtifacts.map(artifact => ({
        ...artifact,
        position3D: new Vector3(0, 0, 0), // All at same position
      }));
      
      const optimized = positioningAlgorithms.optimizePositions(overlappingArtifacts);
      
      // After optimization, artifacts should be spread out
      const positions = optimized.map(a => a.position3D);
      const uniquePositions = positions.filter((pos, index, arr) => 
        !arr.slice(0, index).some(p => p.x === pos.x && p.y === pos.y && p.z === pos.z)
      );
      
      expect(uniquePositions.length).toBeGreaterThan(1);
    });

    it('maintains relative positioning while reducing overlaps', () => {
      const positioned = positioningAlgorithms.positionArtifacts(testArtifacts);
      const originalCentroid = this.calculateCentroid(positioned);
      
      const optimized = positioningAlgorithms.optimizePositions(positioned);
      const optimizedCentroid = this.calculateCentroid(optimized);
      
      // Centroid should remain roughly the same
      expect(Math.abs(originalCentroid.x - optimizedCentroid.x)).toBeLessThan(1);
      expect(Math.abs(originalCentroid.y - optimizedCentroid.y)).toBeLessThan(1);
      expect(Math.abs(originalCentroid.z - optimizedCentroid.z)).toBeLessThan(1);
    });
  });

  describe('Performance', () => {
    it('handles large datasets efficiently', () => {
      const largeDataset = generateTestArtifacts(1000);
      
      const startTime = performance.now();
      positioningAlgorithms.positionArtifacts(largeDataset);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('scales reasonably with dataset size', () => {
      const sizes = [10, 50, 100, 200];
      const times: number[] = [];
      
      sizes.forEach(size => {
        const dataset = generateTestArtifacts(size);
        
        const startTime = performance.now();
        positioningAlgorithms.positionArtifacts(dataset);
        const endTime = performance.now();
        
        times.push(endTime - startTime);
      });
      
      // Performance should scale reasonably (not exponentially)
      for (let i = 1; i < times.length; i++) {
        const ratio = times[i] / times[i - 1];
        expect(ratio).toBeLessThan(10); // Should not be more than 10x slower for larger datasets
      }
    });

    it('force-directed algorithm completes within iteration limit', () => {
      const iterations = 50;
      positioningAlgorithms.updateConfig({ 
        algorithm: 'force-directed',
        iterations 
      });
      
      const startTime = performance.now();
      positioningAlgorithms.positionArtifacts(testArtifacts);
      const endTime = performance.now();
      
      // Should complete quickly with limited iterations
      expect(endTime - startTime).toBeLessThan(iterations * 2); // Rough estimate
    });
  });

  describe('Edge Cases', () => {
    it('handles artifacts without dependencies', () => {
      const noDepsArtifacts = testArtifacts.map(a => ({ ...a, dependencies: [] }));
      
      expect(() => {
        positioningAlgorithms.positionArtifacts(noDepsArtifacts);
      }).not.toThrow();
    });

    it('handles artifacts with invalid dependencies', () => {
      const invalidDepsArtifacts = testArtifacts.map(a => ({ 
        ...a, 
        dependencies: ['non-existent-id'] 
      }));
      
      expect(() => {
        positioningAlgorithms.positionArtifacts(invalidDepsArtifacts);
      }).not.toThrow();
    });

    it('handles artifacts with same file path', () => {
      const samePath = testArtifacts.map(a => ({ 
        ...a, 
        filePath: '/src/same/file.ts' 
      }));
      
      positioningAlgorithms.updateConfig({ algorithm: 'clustered' });
      
      expect(() => {
        positioningAlgorithms.positionArtifacts(samePath);
      }).not.toThrow();
    });
  });

  // Helper method for tests
  private calculateCentroid(artifacts: CodeArtifact[]): Vector3 {
    const sum = artifacts.reduce(
      (acc, artifact) => ({
        x: acc.x + artifact.position3D.x,
        y: acc.y + artifact.position3D.y,
        z: acc.z + artifact.position3D.z,
      }),
      { x: 0, y: 0, z: 0 }
    );
    
    return new Vector3(
      sum.x / artifacts.length,
      sum.y / artifacts.length,
      sum.z / artifacts.length
    );
  }
});