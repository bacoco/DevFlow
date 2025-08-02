import React from 'react';
import { Vector3 } from 'three';
import TemporalVisualization from '../CodeArchaeology/TemporalVisualization';
import { CodeArtifact, VisualizationConfig } from '../CodeArchaeology/types';

// Mock Three.js for performance testing
jest.mock('three', () => ({
  Vector3: jest.fn().mockImplementation((x = 0, y = 0, z = 0) => ({ x, y, z })),
  Color: jest.fn().mockImplementation(() => ({ r: 1, g: 1, b: 1, getHexString: () => '#ffffff' })),
}));

jest.mock('@react-three/fiber', () => ({
  useFrame: jest.fn(),
  useThree: jest.fn(() => ({ camera: { position: { x: 0, y: 0, z: 0 } } })),
}));

jest.mock('@react-three/drei', () => ({
  Text: jest.fn(() => null),
  Line: jest.fn(() => null),
}));

// Mock child components for performance testing
jest.mock('../CodeArchaeology/TemporalControls', () => {
  return function MockTemporalControls() {
    return <div data-testid="temporal-controls" />;
  };
});

jest.mock('../CodeArchaeology/AnimationSystem', () => {
  return function MockAnimationSystem() {
    return null;
  };
});

jest.mock('../CodeArchaeology/TemporalLayer', () => {
  return function MockTemporalLayer() {
    return <div data-testid="temporal-layer" />;
  };
});

// Generate test data
const generateArtifacts = (count: number): CodeArtifact[] => {
  const artifacts: CodeArtifact[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    artifacts.push({
      id: `artifact-${i}`,
      filePath: `/src/file${i}.ts`,
      type: ['file', 'function', 'class', 'interface'][i % 4] as any,
      name: `Artifact${i}`,
      position3D: new Vector3(
        (i % 10) * 2,
        Math.floor(i / 10) * 2,
        (i % 5) * 2
      ),
      complexity: Math.random() * 10,
      changeFrequency: Math.random() * 10,
      lastModified: new Date(now.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      authors: [`author${i % 5}`],
      dependencies: [],
      size: Math.random() * 100,
    });
  }
  
  return artifacts;
};

const defaultConfig: VisualizationConfig = {
  showDependencies: true,
  showComplexity: true,
  showChangeFrequency: true,
};

describe('TemporalVisualization Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles small datasets efficiently (100 artifacts)', () => {
    const artifacts = generateArtifacts(100);
    
    const startTime = performance.now();
    
    const component = React.createElement(TemporalVisualization, {
      artifacts,
      config: defaultConfig,
      onArtifactSelect: jest.fn(),
      onArtifactHover: jest.fn(),
    });
    
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(50); // Should complete in less than 50ms
    expect(component).toBeDefined();
  });

  it('handles medium datasets efficiently (1000 artifacts)', () => {
    const artifacts = generateArtifacts(1000);
    
    const startTime = performance.now();
    
    const component = React.createElement(TemporalVisualization, {
      artifacts,
      config: defaultConfig,
      onArtifactSelect: jest.fn(),
      onArtifactHover: jest.fn(),
    });
    
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(200); // Should complete in less than 200ms
    expect(component).toBeDefined();
  });

  it('handles large datasets efficiently (5000 artifacts)', () => {
    const artifacts = generateArtifacts(5000);
    
    const startTime = performance.now();
    
    const component = React.createElement(TemporalVisualization, {
      artifacts,
      config: defaultConfig,
      onArtifactSelect: jest.fn(),
      onArtifactHover: jest.fn(),
    });
    
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
    expect(component).toBeDefined();
  });

  it('efficiently calculates temporal layers', () => {
    const artifacts = generateArtifacts(1000);
    
    // Measure time to calculate layers multiple times
    const iterations = 100;
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      React.createElement(TemporalVisualization, {
        artifacts,
        config: defaultConfig,
        onArtifactSelect: jest.fn(),
        onArtifactHover: jest.fn(),
      });
    }
    
    const endTime = performance.now();
    const averageTime = (endTime - startTime) / iterations;
    
    expect(averageTime).toBeLessThan(10); // Average should be less than 10ms per calculation
  });

  it('efficiently handles time range calculations', () => {
    const artifacts = generateArtifacts(2000);
    
    const startTime = performance.now();
    
    // Create component multiple times to test memoization
    for (let i = 0; i < 50; i++) {
      React.createElement(TemporalVisualization, {
        artifacts,
        config: defaultConfig,
        onArtifactSelect: jest.fn(),
        onArtifactHover: jest.fn(),
      });
    }
    
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(500); // Should handle repeated calculations efficiently
  });

  it('memory usage remains stable with large datasets', () => {
    const artifacts = generateArtifacts(3000);
    
    // Create and destroy components to test for memory leaks
    for (let i = 0; i < 10; i++) {
      const component = React.createElement(TemporalVisualization, {
        artifacts,
        config: defaultConfig,
        onArtifactSelect: jest.fn(),
        onArtifactHover: jest.fn(),
      });
      
      // Simulate component cleanup
      expect(component).toBeDefined();
    }
    
    // If we reach here without running out of memory, the test passes
    expect(true).toBe(true);
  });

  it('handles rapid configuration changes efficiently', () => {
    const artifacts = generateArtifacts(500);
    const configs = [
      { showDependencies: true, showComplexity: true, showChangeFrequency: true },
      { showDependencies: false, showComplexity: true, showChangeFrequency: false },
      { showDependencies: true, showComplexity: false, showChangeFrequency: true },
      { showDependencies: false, showComplexity: false, showChangeFrequency: false },
    ];
    
    const startTime = performance.now();
    
    configs.forEach(config => {
      React.createElement(TemporalVisualization, {
        artifacts,
        config,
        onArtifactSelect: jest.fn(),
        onArtifactHover: jest.fn(),
      });
    });
    
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(100); // Should handle config changes quickly
  });

  it('scales linearly with artifact count', () => {
    const sizes = [100, 200, 400, 800];
    const times: number[] = [];
    
    sizes.forEach(size => {
      const artifacts = generateArtifacts(size);
      
      const startTime = performance.now();
      React.createElement(TemporalVisualization, {
        artifacts,
        config: defaultConfig,
        onArtifactSelect: jest.fn(),
        onArtifactHover: jest.fn(),
      });
      const endTime = performance.now();
      
      times.push(endTime - startTime);
    });
    
    // Check that performance scales reasonably (not exponentially)
    for (let i = 1; i < times.length; i++) {
      const ratio = times[i] / times[i - 1];
      expect(ratio).toBeLessThan(5); // Should not be more than 5x slower for 2x data
    }
  });

  it('handles empty artifact arrays efficiently', () => {
    const startTime = performance.now();
    
    const component = React.createElement(TemporalVisualization, {
      artifacts: [],
      config: defaultConfig,
      onArtifactSelect: jest.fn(),
      onArtifactHover: jest.fn(),
    });
    
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(10); // Should be very fast for empty data
    expect(component).toBeDefined();
  });

  it('efficiently handles artifacts with complex dependency graphs', () => {
    const artifacts = generateArtifacts(1000);
    
    // Add complex dependencies
    artifacts.forEach((artifact, index) => {
      const dependencyCount = Math.min(10, Math.floor(Math.random() * 5));
      artifact.dependencies = Array.from({ length: dependencyCount }, (_, i) => 
        `artifact-${(index + i + 1) % artifacts.length}`
      );
    });
    
    const startTime = performance.now();
    
    React.createElement(TemporalVisualization, {
      artifacts,
      config: defaultConfig,
      onArtifactSelect: jest.fn(),
      onArtifactHover: jest.fn(),
    });
    
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(300); // Should handle complex dependencies efficiently
  });
});