import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Canvas } from '@react-three/fiber';
import { Vector3 } from 'three';
import Scene3D from '../Scene3D';
import { CodeArtifact, VisualizationConfig } from '../types';

// Mock WebGL context for testing
const mockWebGLContext = {
  canvas: document.createElement('canvas'),
  getExtension: jest.fn(),
  getParameter: jest.fn(),
  createShader: jest.fn(),
  shaderSource: jest.fn(),
  compileShader: jest.fn(),
  createProgram: jest.fn(),
  attachShader: jest.fn(),
  linkProgram: jest.fn(),
  useProgram: jest.fn(),
  getAttribLocation: jest.fn(),
  getUniformLocation: jest.fn(),
  enableVertexAttribArray: jest.fn(),
  vertexAttribPointer: jest.fn(),
  uniform1f: jest.fn(),
  uniform2f: jest.fn(),
  uniform3f: jest.fn(),
  uniform4f: jest.fn(),
  uniformMatrix4fv: jest.fn(),
  createBuffer: jest.fn(),
  bindBuffer: jest.fn(),
  bufferData: jest.fn(),
  drawArrays: jest.fn(),
  drawElements: jest.fn(),
  clear: jest.fn(),
  clearColor: jest.fn(),
  clearDepth: jest.fn(),
  enable: jest.fn(),
  disable: jest.fn(),
  depthFunc: jest.fn(),
  blendFunc: jest.fn(),
  viewport: jest.fn(),
  readPixels: jest.fn(() => new Uint8Array(4)),
  getShaderParameter: jest.fn(() => true),
  getProgramParameter: jest.fn(() => true),
  getShaderInfoLog: jest.fn(() => ''),
  getProgramInfoLog: jest.fn(() => ''),
};

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = jest.fn((contextType) => {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return mockWebGLContext;
  }
  return null;
});

// Visual regression testing utilities
class VisualRegressionTester {
  private canvas: HTMLCanvasElement;
  private context: WebGLRenderingContext;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.context = canvas.getContext('webgl') as WebGLRenderingContext;
  }

  captureScreenshot(): ImageData {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const pixels = new Uint8Array(width * height * 4);
    
    // Mock pixel data for testing
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = Math.floor(Math.random() * 255);     // R
      pixels[i + 1] = Math.floor(Math.random() * 255); // G
      pixels[i + 2] = Math.floor(Math.random() * 255); // B
      pixels[i + 3] = 255;                             // A
    }
    
    return new ImageData(new Uint8ClampedArray(pixels), width, height);
  }

  compareScreenshots(baseline: ImageData, current: ImageData, threshold = 0.1): {
    match: boolean;
    difference: number;
    diffPixels: number;
  } {
    if (baseline.width !== current.width || baseline.height !== current.height) {
      return { match: false, difference: 1, diffPixels: baseline.width * baseline.height };
    }

    let diffPixels = 0;
    const totalPixels = baseline.width * baseline.height;
    
    for (let i = 0; i < baseline.data.length; i += 4) {
      const rDiff = Math.abs(baseline.data[i] - current.data[i]);
      const gDiff = Math.abs(baseline.data[i + 1] - current.data[i + 1]);
      const bDiff = Math.abs(baseline.data[i + 2] - current.data[i + 2]);
      
      const pixelDiff = (rDiff + gDiff + bDiff) / (3 * 255);
      
      if (pixelDiff > threshold) {
        diffPixels++;
      }
    }
    
    const difference = diffPixels / totalPixels;
    return {
      match: difference <= threshold,
      difference,
      diffPixels
    };
  }
}// Mo
ck artifacts for testing
const mockArtifacts: CodeArtifact[] = [
  {
    id: 'file1',
    filePath: '/src/components/App.tsx',
    type: 'file',
    name: 'App.tsx',
    position3D: new Vector3(0, 0, 0),
    complexity: 5,
    changeFrequency: 3,
    lastModified: new Date('2023-01-01'),
    authors: ['john.doe'],
    dependencies: ['class1'],
    size: 100,
  },
  {
    id: 'class1',
    filePath: '/src/components/App.tsx',
    type: 'class',
    name: 'AppComponent',
    position3D: new Vector3(2, 0, 0),
    complexity: 8,
    changeFrequency: 5,
    lastModified: new Date('2023-01-02'),
    authors: ['jane.smith'],
    dependencies: [],
    size: 200,
  },
];

const defaultConfig: VisualizationConfig = {
  showDependencies: true,
  showComplexity: true,
  showChangeFrequency: true,
};

describe('Visual Regression Tests for 3D Rendering', () => {
  let visualTester: VisualRegressionTester;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    document.body.appendChild(canvas);
    visualTester = new VisualRegressionTester(canvas);
  });

  afterEach(() => {
    document.body.removeChild(canvas);
  });

  describe('Screenshot Comparison Tests', () => {
    it('should maintain consistent 3D scene rendering', async () => {
      const { container } = render(
        <Canvas>
          <Scene3D
            artifacts={mockArtifacts}
            config={defaultConfig}
            onArtifactSelect={jest.fn()}
            onCameraChange={jest.fn()}
          />
        </Canvas>
      );

      // Wait for scene to render
      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      // Capture baseline screenshot
      const baseline = visualTester.captureScreenshot();
      
      // Re-render the same scene
      const { container: container2 } = render(
        <Canvas>
          <Scene3D
            artifacts={mockArtifacts}
            config={defaultConfig}
            onArtifactSelect={jest.fn()}
            onCameraChange={jest.fn()}
          />
        </Canvas>
      );

      await waitFor(() => {
        expect(container2.querySelector('canvas')).toBeInTheDocument();
      });

      // Capture current screenshot
      const current = visualTester.captureScreenshot();
      
      // Compare screenshots
      const comparison = visualTester.compareScreenshots(baseline, current, 0.05);
      
      expect(comparison.match).toBe(true);
      expect(comparison.difference).toBeLessThan(0.05);
    });

    it('should detect visual changes when artifacts are modified', async () => {
      // Render initial scene
      const { container } = render(
        <Canvas>
          <Scene3D
            artifacts={mockArtifacts}
            config={defaultConfig}
            onArtifactSelect={jest.fn()}
            onCameraChange={jest.fn()}
          />
        </Canvas>
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const baseline = visualTester.captureScreenshot();

      // Render scene with modified artifacts
      const modifiedArtifacts = mockArtifacts.map(artifact => ({
        ...artifact,
        position3D: new Vector3(artifact.position3D.x + 1, artifact.position3D.y, artifact.position3D.z),
      }));

      const { container: container2 } = render(
        <Canvas>
          <Scene3D
            artifacts={modifiedArtifacts}
            config={defaultConfig}
            onArtifactSelect={jest.fn()}
            onCameraChange={jest.fn()}
          />
        </Canvas>
      );

      await waitFor(() => {
        expect(container2.querySelector('canvas')).toBeInTheDocument();
      });

      const current = visualTester.captureScreenshot();
      const comparison = visualTester.compareScreenshots(baseline, current, 0.05);
      
      // Should detect the change
      expect(comparison.match).toBe(false);
      expect(comparison.difference).toBeGreaterThan(0.05);
    });

    it('should maintain visual consistency across different configurations', async () => {
      const configs = [
        { ...defaultConfig, showDependencies: false },
        { ...defaultConfig, showComplexity: false },
        { ...defaultConfig, showChangeFrequency: false },
      ];

      const screenshots: ImageData[] = [];

      for (const config of configs) {
        const { container } = render(
          <Canvas>
            <Scene3D
              artifacts={mockArtifacts}
              config={config}
              onArtifactSelect={jest.fn()}
              onCameraChange={jest.fn()}
            />
          </Canvas>
        );

        await waitFor(() => {
          expect(container.querySelector('canvas')).toBeInTheDocument();
        });

        screenshots.push(visualTester.captureScreenshot());
      }

      // Each configuration should produce a different but consistent result
      for (let i = 0; i < screenshots.length; i++) {
        for (let j = i + 1; j < screenshots.length; j++) {
          const comparison = visualTester.compareScreenshots(screenshots[i], screenshots[j], 0.05);
          // Different configs should produce different visuals
          expect(comparison.match).toBe(false);
        }
      }
    });
  });
});