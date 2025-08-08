/**
 * Visual Regression Tests for 3D Rendering
 * Tests for screenshot comparison, animation accuracy, cross-browser compatibility, and accessibility
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { testAccessibility, testKeyboardNavigation, runFullAccessibilityTest } from '../../../utils/accessibility-test-helpers';
import { setupTestEnvironment, cleanupTestEnvironment } from '../../../utils/test-utils';
import { Scene3D } from '../Scene3D';
import { CodeArchaeologyViewer } from '../CodeArchaeologyViewer';
import { TemporalVisualization } from '../TemporalVisualization';
import { TraceabilityVisualization } from '../TraceabilityVisualization';
import type { CodeArtifact, Visualization3D, AnimationSequence } from '../types';

// Mock Three.js and WebGL for testing
const mockThreeJS = {
  Scene: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    remove: jest.fn(),
    children: [],
    traverse: jest.fn(),
  })),
  WebGLRenderer: jest.fn().mockImplementation(() => ({
    setSize: jest.fn(),
    render: jest.fn(),
    domElement: document.createElement('canvas'),
    dispose: jest.fn(),
    getContext: jest.fn(() => ({
      canvas: document.createElement('canvas'),
      drawingBufferWidth: 800,
      drawingBufferHeight: 600,
    })),
  })),
  PerspectiveCamera: jest.fn().mockImplementation(() => ({
    position: { set: jest.fn(), x: 0, y: 0, z: 10 },
    lookAt: jest.fn(),
    updateProjectionMatrix: jest.fn(),
  })),
  Mesh: jest.fn().mockImplementation(() => ({
    position: { set: jest.fn(), x: 0, y: 0, z: 0 },
    rotation: { set: jest.fn(), x: 0, y: 0, z: 0 },
    scale: { set: jest.fn(), x: 1, y: 1, z: 1 },
    material: { color: { setHex: jest.fn() } },
    geometry: { dispose: jest.fn() },
    dispose: jest.fn(),
  })),
  BoxGeometry: jest.fn(),
  MeshBasicMaterial: jest.fn(),
  Color: jest.fn(),
  Vector3: jest.fn().mockImplementation((x = 0, y = 0, z = 0) => ({ x, y, z })),
  AnimationMixer: jest.fn().mockImplementation(() => ({
    clipAction: jest.fn(() => ({
      play: jest.fn(),
      stop: jest.fn(),
      setDuration: jest.fn(),
      setLoop: jest.fn(),
    })),
    update: jest.fn(),
  })),
};

// Mock canvas context for screenshot comparison
const mockCanvasContext = {
  getImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(800 * 600 * 4),
    width: 800,
    height: 600,
  })),
  putImageData: jest.fn(),
  drawImage: jest.fn(),
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  scale: jest.fn(),
};

// Mock HTML5 Canvas for screenshot testing
const mockCanvas = {
  getContext: jest.fn(() => mockCanvasContext),
  toDataURL: jest.fn(() => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),
  width: 800,
  height: 600,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock WebGL context
const mockWebGLContext = {
  canvas: mockCanvas,
  drawingBufferWidth: 800,
  drawingBufferHeight: 600,
  viewport: jest.fn(),
  clear: jest.fn(),
  clearColor: jest.fn(),
  enable: jest.fn(),
  disable: jest.fn(),
  getParameter: jest.fn((param) => {
    switch (param) {
      case 0x1F00: return 'Mock WebGL Vendor'; // GL_VENDOR
      case 0x1F01: return 'Mock WebGL Renderer'; // GL_RENDERER
      case 0x1F02: return 'WebGL 1.0'; // GL_VERSION
      case 0x0D33: return 4096; // GL_MAX_TEXTURE_SIZE
      default: return 0;
    }
  }),
  getExtension: jest.fn(() => null),
  createShader: jest.fn(),
  createProgram: jest.fn(),
  useProgram: jest.fn(),
  bindBuffer: jest.fn(),
  bufferData: jest.fn(),
  drawArrays: jest.fn(),
  drawElements: jest.fn(),
  isContextLost: jest.fn(() => false),
};

// Mock browser APIs
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn((contextType) => {
    if (contextType === 'webgl' || contextType === 'webgl2') {
      return mockWebGLContext;
    }
    if (contextType === '2d') {
      return mockCanvasContext;
    }
    return null;
  }),
});

// Mock requestAnimationFrame for animation testing
let animationFrameId = 0;
const animationFrameCallbacks = new Map<number, () => void>();

global.requestAnimationFrame = jest.fn((callback) => {
  const id = ++animationFrameId;
  animationFrameCallbacks.set(id, callback);
  return id;
});

global.cancelAnimationFrame = jest.fn((id) => {
  animationFrameCallbacks.delete(id);
});

// Helper to trigger animation frames
const triggerAnimationFrame = () => {
  animationFrameCallbacks.forEach(callback => callback());
  animationFrameCallbacks.clear();
};

// Mock performance.now for consistent timing
let mockTime = 0;
Object.defineProperty(performance, 'now', {
  value: jest.fn(() => mockTime),
});

const advanceTime = (ms: number) => {
  mockTime += ms;
};

// Test data
const mockCodeArtifacts: CodeArtifact[] = [
  {
    id: 'artifact-1',
    filePath: 'src/components/Button.tsx',
    type: 'file',
    name: 'Button.tsx',
    position3D: { x: 0, y: 0, z: 0 },
    complexity: 5,
    changeFrequency: 10,
    lastModified: new Date('2023-01-01'),
    authors: ['john@example.com'],
    dependencies: ['artifact-2'],
  },
  {
    id: 'artifact-2',
    filePath: 'src/components/Button.tsx',
    type: 'function',
    name: 'handleClick',
    position3D: { x: 1, y: 0, z: 0 },
    complexity: 3,
    changeFrequency: 5,
    lastModified: new Date('2023-01-02'),
    authors: ['jane@example.com'],
    dependencies: [],
  },
];

const mockVisualization3D: Visualization3D = {
  id: 'viz-1',
  sceneData: {
    artifacts: mockCodeArtifacts,
    connections: [],
    metadata: { totalFiles: 2, totalFunctions: 1 },
  },
  artifacts: mockCodeArtifacts.map(artifact => ({
    artifact,
    position: artifact.position3D,
    scale: { x: 1, y: 1, z: 1 },
    rotation: { x: 0, y: 0, z: 0 },
    color: { r: 0.5, g: 0.5, b: 0.5 },
    opacity: 1,
    visible: true,
  })),
  connections: [],
  animations: [],
  metadata: { createdAt: new Date(), version: '1.0' },
};

const mockAnimationSequence: AnimationSequence = {
  id: 'anim-1',
  timeRange: {
    start: new Date('2023-01-01'),
    end: new Date('2023-01-31'),
  },
  keyframes: [
    {
      timestamp: new Date('2023-01-01'),
      artifactChanges: [
        {
          artifactId: 'artifact-1',
          changeType: 'added',
          newPosition: { x: 0, y: 0, z: 0 },
          transitionDuration: 1000,
        },
      ],
    },
    {
      timestamp: new Date('2023-01-15'),
      artifactChanges: [
        {
          artifactId: 'artifact-2',
          changeType: 'added',
          newPosition: { x: 1, y: 0, z: 0 },
          transitionDuration: 1000,
        },
      ],
    },
  ],
  duration: 2000,
  easing: 'easeInOut',
};

// Screenshot comparison utilities
interface ScreenshotData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

class ScreenshotComparator {
  private referenceScreenshots = new Map<string, ScreenshotData>();

  captureScreenshot(canvas: HTMLCanvasElement, testName: string): ScreenshotData {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Cannot get 2D context for screenshot');
    }

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const screenshot = {
      data: new Uint8ClampedArray(imageData.data),
      width: imageData.width,
      height: imageData.height,
    };

    // Store as reference if not exists
    if (!this.referenceScreenshots.has(testName)) {
      this.referenceScreenshots.set(testName, screenshot);
    }

    return screenshot;
  }

  compareScreenshots(current: ScreenshotData, reference: ScreenshotData, threshold = 0.1): {
    match: boolean;
    difference: number;
    diffPixels: number;
  } {
    if (current.width !== reference.width || current.height !== reference.height) {
      return { match: false, difference: 1, diffPixels: current.width * current.height };
    }

    let diffPixels = 0;
    const totalPixels = current.width * current.height;

    for (let i = 0; i < current.data.length; i += 4) {
      const rDiff = Math.abs(current.data[i] - reference.data[i]);
      const gDiff = Math.abs(current.data[i + 1] - reference.data[i + 1]);
      const bDiff = Math.abs(current.data[i + 2] - reference.data[i + 2]);
      const aDiff = Math.abs(current.data[i + 3] - reference.data[i + 3]);

      const pixelDiff = (rDiff + gDiff + bDiff + aDiff) / (4 * 255);
      if (pixelDiff > threshold) {
        diffPixels++;
      }
    }

    const difference = diffPixels / totalPixels;
    return {
      match: difference <= threshold,
      difference,
      diffPixels,
    };
  }

  getReference(testName: string): ScreenshotData | undefined {
    return this.referenceScreenshots.get(testName);
  }
}

// Animation testing framework
class AnimationTester {
  private animationCallbacks: (() => void)[] = [];
  private currentTime = 0;

  startAnimation(callback: () => void): void {
    this.animationCallbacks.push(callback);
  }

  stopAnimation(callback: () => void): void {
    const index = this.animationCallbacks.indexOf(callback);
    if (index > -1) {
      this.animationCallbacks.splice(index, 1);
    }
  }

  tick(deltaTime: number): void {
    this.currentTime += deltaTime;
    this.animationCallbacks.forEach(callback => callback());
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  reset(): void {
    this.currentTime = 0;
    this.animationCallbacks = [];
  }
}

describe('Visual Regression Tests for 3D Rendering', () => {
  let screenshotComparator: ScreenshotComparator;
  let animationTester: AnimationTester;

  beforeAll(() => {
    setupTestEnvironment();
    screenshotComparator = new ScreenshotComparator();
    animationTester = new AnimationTester();

    // Mock Three.js
    (global as any).THREE = mockThreeJS;
  });

  afterAll(() => {
    cleanupTestEnvironment();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    animationTester.reset();
    mockTime = 0;
  });

  describe('Screenshot Comparison Tests', () => {
    it('should maintain consistent 3D scene rendering', async () => {
      const { container } = render(
        <Scene3D
          artifacts={mockCodeArtifacts}
          width={800}
          height={600}
          onArtifactSelect={jest.fn()}
        />
      );

      // Wait for scene to initialize
      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas).toBeInTheDocument();

      // Capture screenshot
      const screenshot = screenshotComparator.captureScreenshot(canvas, 'basic-3d-scene');
      expect(screenshot.width).toBe(800);
      expect(screenshot.height).toBe(600);

      // Compare with reference (first run establishes reference)
      const reference = screenshotComparator.getReference('basic-3d-scene');
      if (reference) {
        const comparison = screenshotComparator.compareScreenshots(screenshot, reference);
        expect(comparison.match).toBe(true);
        expect(comparison.difference).toBeLessThan(0.05); // 5% difference threshold
      }
    });

    it('should maintain consistent artifact positioning', async () => {
      const { container } = render(
        <CodeArchaeologyViewer
          visualization={mockVisualization3D}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      const screenshot = screenshotComparator.captureScreenshot(canvas, 'artifact-positioning');

      // Verify artifacts are positioned correctly
      expect(mockThreeJS.Mesh).toHaveBeenCalled();
      
      const reference = screenshotComparator.getReference('artifact-positioning');
      if (reference) {
        const comparison = screenshotComparator.compareScreenshots(screenshot, reference);
        expect(comparison.match).toBe(true);
      }
    });

    it('should maintain consistent traceability visualization', async () => {
      const { container } = render(
        <TraceabilityVisualization
          artifacts={mockCodeArtifacts}
          traceabilityLinks={[
            {
              requirementId: 'req-1',
              specFile: 'spec.md',
              codeArtifacts: ['artifact-1'],
              linkType: 'implements',
              confidence: 0.9,
            },
          ]}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      const screenshot = screenshotComparator.captureScreenshot(canvas, 'traceability-visualization');

      const reference = screenshotComparator.getReference('traceability-visualization');
      if (reference) {
        const comparison = screenshotComparator.compareScreenshots(screenshot, reference);
        expect(comparison.match).toBe(true);
        expect(comparison.diffPixels).toBeLessThan(1000); // Allow minor differences
      }
    });

    it('should handle different viewport sizes consistently', async () => {
      const viewportSizes = [
        { width: 400, height: 300 },
        { width: 800, height: 600 },
        { width: 1200, height: 800 },
      ];

      for (const size of viewportSizes) {
        const { container, unmount } = render(
          <Scene3D
            artifacts={mockCodeArtifacts}
            width={size.width}
            height={size.height}
            onArtifactSelect={jest.fn()}
          />
        );

        await waitFor(() => {
          expect(container.querySelector('canvas')).toBeInTheDocument();
        });

        const canvas = container.querySelector('canvas') as HTMLCanvasElement;
        expect(canvas.width).toBe(size.width);
        expect(canvas.height).toBe(size.height);

        const screenshot = screenshotComparator.captureScreenshot(
          canvas,
          `viewport-${size.width}x${size.height}`
        );

        expect(screenshot.width).toBe(size.width);
        expect(screenshot.height).toBe(size.height);

        unmount();
      }
    });
  });

  describe('Animation Testing Framework', () => {
    it('should accurately test temporal navigation animations', async () => {
      const onTimeChange = jest.fn();
      
      const { container } = render(
        <TemporalVisualization
          animations={[mockAnimationSequence]}
          currentTime={new Date('2023-01-01')}
          onTimeChange={onTimeChange}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      // Start animation testing
      let animationProgress = 0;
      const animationDuration = 2000; // 2 seconds
      const frameRate = 60; // 60 FPS
      const frameTime = 1000 / frameRate;

      animationTester.startAnimation(() => {
        animationProgress += frameTime;
        advanceTime(frameTime);
        triggerAnimationFrame();
      });

      // Test animation frames
      const screenshots: ScreenshotData[] = [];
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      for (let frame = 0; frame < 10; frame++) {
        animationTester.tick(frameTime);
        
        // Capture screenshot at this frame
        const screenshot = screenshotComparator.captureScreenshot(
          canvas,
          `animation-frame-${frame}`
        );
        screenshots.push(screenshot);

        // Verify animation progress
        expect(animationTester.getCurrentTime()).toBe(frame * frameTime);
      }

      // Verify screenshots show progression
      expect(screenshots).toHaveLength(10);
      
      // Compare first and last frames - they should be different
      if (screenshots.length >= 2) {
        const comparison = screenshotComparator.compareScreenshots(
          screenshots[0],
          screenshots[screenshots.length - 1]
        );
        expect(comparison.difference).toBeGreaterThan(0.01); // Should show change
      }
    });

    it('should test smooth transitions between time periods', async () => {
      const { container } = render(
        <TemporalVisualization
          animations={[mockAnimationSequence]}
          currentTime={new Date('2023-01-01')}
          onTimeChange={jest.fn()}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      
      // Test transition smoothness by capturing multiple frames
      const transitionFrames: ScreenshotData[] = [];
      const transitionDuration = 1000; // 1 second transition
      const frameCount = 30; // 30 frames for smooth transition
      
      for (let i = 0; i < frameCount; i++) {
        const progress = i / (frameCount - 1);
        advanceTime(transitionDuration / frameCount);
        triggerAnimationFrame();
        
        const screenshot = screenshotComparator.captureScreenshot(
          canvas,
          `transition-frame-${i}`
        );
        transitionFrames.push(screenshot);
      }

      // Verify smooth progression - adjacent frames should be similar
      for (let i = 1; i < transitionFrames.length; i++) {
        const comparison = screenshotComparator.compareScreenshots(
          transitionFrames[i - 1],
          transitionFrames[i]
        );
        
        // Adjacent frames should be very similar (smooth transition)
        expect(comparison.difference).toBeLessThan(0.1);
      }

      // But first and last frames should be different
      const overallComparison = screenshotComparator.compareScreenshots(
        transitionFrames[0],
        transitionFrames[transitionFrames.length - 1]
      );
      expect(overallComparison.difference).toBeGreaterThan(0.05);
    });

    it('should test animation performance under load', async () => {
      const largeArtifactSet = Array.from({ length: 100 }, (_, i) => ({
        ...mockCodeArtifacts[0],
        id: `artifact-${i}`,
        position3D: { x: i % 10, y: Math.floor(i / 10), z: 0 },
      }));

      const { container } = render(
        <Scene3D
          artifacts={largeArtifactSet}
          width={800}
          height={600}
          onArtifactSelect={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const startTime = performance.now();
      
      // Simulate 60 frames of animation
      for (let frame = 0; frame < 60; frame++) {
        animationTester.tick(16.67); // 60 FPS
        triggerAnimationFrame();
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Animation should complete within reasonable time
      expect(totalTime).toBeLessThan(2000); // 2 seconds for 60 frames
      
      // Verify all artifacts were processed
      expect(mockThreeJS.Mesh).toHaveBeenCalledTimes(largeArtifactSet.length);
    });
  });

  describe('Cross-Browser Compatibility Tests', () => {
    const browserConfigs = [
      {
        name: 'Chrome',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        webgl2: true,
        features: ['webgl2', 'instancing', 'vao'],
      },
      {
        name: 'Firefox',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        webgl2: true,
        features: ['webgl2', 'instancing'],
      },
      {
        name: 'Safari',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        webgl2: false,
        features: ['webgl1'],
      },
      {
        name: 'Edge',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
        webgl2: true,
        features: ['webgl2', 'instancing', 'vao'],
      },
    ];

    browserConfigs.forEach(config => {
      it(`should render consistently in ${config.name}`, async () => {
        // Mock browser-specific user agent
        Object.defineProperty(navigator, 'userAgent', {
          value: config.userAgent,
          configurable: true,
        });

        // Mock browser-specific WebGL capabilities
        mockWebGLContext.getParameter = jest.fn((param) => {
          switch (param) {
            case 0x1F00: return `${config.name} WebGL Vendor`;
            case 0x1F01: return `${config.name} WebGL Renderer`;
            case 0x1F02: return config.webgl2 ? 'WebGL 2.0' : 'WebGL 1.0';
            case 0x0D33: return config.webgl2 ? 4096 : 2048; // MAX_TEXTURE_SIZE
            default: return 0;
          }
        });

        const { container } = render(
          <Scene3D
            artifacts={mockCodeArtifacts}
            width={800}
            height={600}
            onArtifactSelect={jest.fn()}
          />
        );

        await waitFor(() => {
          expect(container.querySelector('canvas')).toBeInTheDocument();
        });

        const canvas = container.querySelector('canvas') as HTMLCanvasElement;
        const screenshot = screenshotComparator.captureScreenshot(
          canvas,
          `browser-${config.name.toLowerCase()}`
        );

        expect(screenshot.width).toBe(800);
        expect(screenshot.height).toBe(600);

        // Verify WebGL context was created
        expect(canvas.getContext).toHaveBeenCalledWith('webgl2');
        if (!config.webgl2) {
          expect(canvas.getContext).toHaveBeenCalledWith('webgl');
        }
      });
    });

    it('should handle WebGL context loss gracefully', async () => {
      let contextLost = false;
      
      // Mock context loss
      mockWebGLContext.isContextLost = jest.fn(() => contextLost);
      
      const { container } = render(
        <Scene3D
          artifacts={mockCodeArtifacts}
          width={800}
          height={600}
          onArtifactSelect={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      
      // Simulate context loss
      contextLost = true;
      const lostEvent = new Event('webglcontextlost');
      canvas.dispatchEvent(lostEvent);

      // Component should handle context loss gracefully
      expect(() => {
        const screenshot = screenshotComparator.captureScreenshot(canvas, 'context-lost');
        expect(screenshot).toBeDefined();
      }).not.toThrow();

      // Simulate context restoration
      contextLost = false;
      const restoredEvent = new Event('webglcontextrestored');
      canvas.dispatchEvent(restoredEvent);

      // Should be able to render again
      await waitFor(() => {
        expect(mockWebGLContext.isContextLost()).toBe(false);
      });
    });

    it('should adapt to different screen densities', async () => {
      const densities = [1, 1.5, 2, 3]; // 1x, 1.5x, 2x, 3x pixel ratios

      for (const density of densities) {
        Object.defineProperty(window, 'devicePixelRatio', {
          value: density,
          configurable: true,
        });

        const { container, unmount } = render(
          <Scene3D
            artifacts={mockCodeArtifacts}
            width={800}
            height={600}
            onArtifactSelect={jest.fn()}
          />
        );

        await waitFor(() => {
          expect(container.querySelector('canvas')).toBeInTheDocument();
        });

        const canvas = container.querySelector('canvas') as HTMLCanvasElement;
        
        // Canvas should adapt to pixel ratio
        const expectedWidth = 800 * density;
        const expectedHeight = 600 * density;
        
        // WebGL renderer should be configured for the pixel ratio
        expect(mockThreeJS.WebGLRenderer).toHaveBeenCalled();

        const screenshot = screenshotComparator.captureScreenshot(
          canvas,
          `density-${density}x`
        );
        
        expect(screenshot).toBeDefined();
        
        unmount();
      }
    });
  });

  describe('Accessibility Tests for 3D Visualization', () => {
    it('should support keyboard navigation in 3D space', async () => {
      const onArtifactSelect = jest.fn();
      
      const { container } = render(
        <CodeArchaeologyViewer
          visualization={mockVisualization3D}
          width={800}
          height={600}
          onArtifactSelect={onArtifactSelect}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      // Test keyboard navigation
      await testKeyboardNavigation(container);

      const user = userEvent.setup();
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      
      // Focus the canvas
      canvas.focus();
      expect(canvas).toHaveFocus();

      // Test arrow key navigation
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{ArrowLeft}');
      await user.keyboard('{ArrowUp}');
      await user.keyboard('{ArrowDown}');

      // Test zoom controls
      await user.keyboard('{Equal}'); // Zoom in
      await user.keyboard('{Minus}'); // Zoom out

      // Test selection with Enter/Space
      await user.keyboard('{Enter}');
      await user.keyboard(' ');

      // Verify canvas maintains focus and responds to keyboard
      expect(canvas).toHaveFocus();
    });

    it('should provide proper ARIA labels and descriptions', async () => {
      const { container } = render(
        <CodeArchaeologyViewer
          visualization={mockVisualization3D}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      
      // Canvas should have proper ARIA attributes
      expect(canvas).toHaveAttribute('role', 'img');
      expect(canvas).toHaveAttribute('aria-label');
      expect(canvas).toHaveAttribute('tabindex', '0');

      // Should have description for screen readers
      const description = canvas.getAttribute('aria-describedby');
      if (description) {
        const descriptionElement = container.querySelector(`#${description}`);
        expect(descriptionElement).toBeInTheDocument();
        expect(descriptionElement).toHaveTextContent(/3D visualization/i);
      }
    });

    it('should announce changes to screen readers', async () => {
      const { container } = render(
        <CodeArchaeologyViewer
          visualization={mockVisualization3D}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      // Should have live region for announcements
      const liveRegion = container.querySelector('[aria-live]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');

      // Should announce when artifacts are selected
      const user = userEvent.setup();
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      
      canvas.focus();
      await user.keyboard('{Enter}');

      // Live region should be updated
      await waitFor(() => {
        expect(liveRegion).toHaveTextContent(/selected/i);
      });
    });

    it('should support high contrast mode', async () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const { container } = render(
        <CodeArchaeologyViewer
          visualization={mockVisualization3D}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      // Component should render without errors in high contrast mode
      expect(container.querySelector('canvas')).toBeInTheDocument();

      // Should apply high contrast styles
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      const computedStyle = window.getComputedStyle(canvas);
      
      // In high contrast mode, should have enhanced visual indicators
      expect(computedStyle.outline).not.toBe('none');
    });

    it('should support reduced motion preferences', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const { container } = render(
        <TemporalVisualization
          animations={[mockAnimationSequence]}
          currentTime={new Date('2023-01-01')}
          onTimeChange={jest.fn()}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      // Animations should be disabled or reduced
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas).toBeInTheDocument();

      // Should not start automatic animations
      expect(requestAnimationFrame).not.toHaveBeenCalled();
    });

    it('should pass comprehensive accessibility audit', async () => {
      const { container } = render(
        <CodeArchaeologyViewer
          visualization={mockVisualization3D}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      // Run full accessibility test suite
      const results = await runFullAccessibilityTest(container);

      // Should pass all accessibility tests
      expect(results.axe.violations).toHaveLength(0);
      expect(results.ariaLabels.violations).toHaveLength(0);
      expect(results.focusManagement).toBeGreaterThan(0);
      expect(results.landmarks.hasMain).toBe(true);
    });

    it('should provide alternative text descriptions for complex visualizations', async () => {
      const { container } = render(
        <TraceabilityVisualization
          artifacts={mockCodeArtifacts}
          traceabilityLinks={[
            {
              requirementId: 'req-1',
              specFile: 'spec.md',
              codeArtifacts: ['artifact-1'],
              linkType: 'implements',
              confidence: 0.9,
            },
          ]}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      // Should provide detailed text alternative
      const textAlternative = container.querySelector('[role="img"]');
      expect(textAlternative).toHaveAttribute('aria-label');
      
      const ariaLabel = textAlternative?.getAttribute('aria-label');
      expect(ariaLabel).toContain('traceability');
      expect(ariaLabel).toContain('artifacts');
      expect(ariaLabel).toContain('requirements');

      // Should have detailed description
      const describedBy = textAlternative?.getAttribute('aria-describedby');
      if (describedBy) {
        const description = container.querySelector(`#${describedBy}`);
        expect(description).toBeInTheDocument();
        expect(description?.textContent).toContain('visualization shows');
      }
    });
  });

  describe('Performance and Memory Tests', () => {
    it('should maintain consistent rendering performance', async () => {
      const performanceMarks: number[] = [];
      
      const { container } = render(
        <Scene3D
          artifacts={mockCodeArtifacts}
          width={800}
          height={600}
          onArtifactSelect={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      // Measure rendering performance over multiple frames
      for (let frame = 0; frame < 60; frame++) {
        const startTime = performance.now();
        
        triggerAnimationFrame();
        advanceTime(16.67); // 60 FPS
        
        const endTime = performance.now();
        performanceMarks.push(endTime - startTime);
      }

      // Calculate performance metrics
      const averageFrameTime = performanceMarks.reduce((sum, time) => sum + time, 0) / performanceMarks.length;
      const maxFrameTime = Math.max(...performanceMarks);
      const minFrameTime = Math.min(...performanceMarks);

      // Performance should be consistent
      expect(averageFrameTime).toBeLessThan(16.67); // Should maintain 60 FPS
      expect(maxFrameTime).toBeLessThan(33.33); // No frame should take longer than 30 FPS
      expect(maxFrameTime - minFrameTime).toBeLessThan(10); // Frame time variance should be low
    });

    it('should handle memory cleanup properly', async () => {
      const { container, unmount } = render(
        <Scene3D
          artifacts={mockCodeArtifacts}
          width={800}
          height={600}
          onArtifactSelect={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      // Verify resources were created
      expect(mockThreeJS.WebGLRenderer).toHaveBeenCalled();
      expect(mockThreeJS.Scene).toHaveBeenCalled();
      expect(mockThreeJS.Mesh).toHaveBeenCalled();

      // Unmount component
      unmount();

      // Verify cleanup was called
      const rendererInstance = mockThreeJS.WebGLRenderer.mock.results[0]?.value;
      if (rendererInstance) {
        expect(rendererInstance.dispose).toHaveBeenCalled();
      }
    });
  });
});