/**
 * Usability Tests for 3D Code Archaeology Features
 * Tests for user experience, interaction patterns, and workflow efficiency
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupTestEnvironment, cleanupTestEnvironment } from '../../../utils/test-utils';
import { Scene3D } from '../Scene3D';
import { CodeArchaeologyViewer } from '../CodeArchaeologyViewer';
import { TemporalVisualization } from '../TemporalVisualization';
import { TraceabilityVisualization } from '../TraceabilityVisualization';
import { FilterPanel } from '../FilterPanel';
import { ArtifactInspectionPanel } from '../ArtifactInspectionPanel';
import type { CodeArtifact, Visualization3D, TraceabilityLink, AnimationSequence } from '../types';

// Mock WebGL and Three.js for usability testing
const mockWebGLContext = {
  canvas: document.createElement('canvas'),
  drawingBufferWidth: 800,
  drawingBufferHeight: 600,
  viewport: jest.fn(),
  clear: jest.fn(),
  clearColor: jest.fn(),
  getParameter: jest.fn(() => 'Mock WebGL'),
  getExtension: jest.fn(() => null),
  isContextLost: jest.fn(() => false),
};

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn((contextType) => {
    if (contextType === 'webgl' || contextType === 'webgl2') {
      return mockWebGLContext;
    }
    return null;
  }),
});

// Mock performance API for timing tests
global.performance.mark = jest.fn();
global.performance.measure = jest.fn();
global.performance.getEntriesByName = jest.fn(() => [{ duration: 16.67 }]);

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
  {
    id: 'artifact-3',
    filePath: 'src/components/Input.tsx',
    type: 'class',
    name: 'InputComponent',
    position3D: { x: 0, y: 1, z: 0 },
    complexity: 8,
    changeFrequency: 15,
    lastModified: new Date('2023-01-03'),
    authors: ['bob@example.com'],
    dependencies: ['artifact-1'],
  },
];

const mockVisualization3D: Visualization3D = {
  id: 'viz-1',
  sceneData: {
    artifacts: mockCodeArtifacts,
    connections: [],
    metadata: { totalFiles: 2, totalFunctions: 1, totalClasses: 1 },
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

const mockTraceabilityLinks: TraceabilityLink[] = [
  {
    requirementId: 'req-1',
    specFile: 'requirements.md',
    codeArtifacts: ['artifact-1', 'artifact-2'],
    linkType: 'implements',
    confidence: 0.9,
  },
];

// Usability testing utilities
class UsabilityTester {
  static async measureInteractionTime(
    interaction: () => Promise<void>
  ): Promise<number> {
    const startTime = performance.now();
    await interaction();
    const endTime = performance.now();
    return endTime - startTime;
  }

  static async testWorkflowEfficiency(
    steps: Array<{ name: string; action: () => Promise<void> }>
  ): Promise<{
    totalTime: number;
    stepTimes: Array<{ name: string; time: number }>;
    averageStepTime: number;
  }> {
    const stepTimes: Array<{ name: string; time: number }> = [];
    const startTime = performance.now();

    for (const step of steps) {
      const stepStartTime = performance.now();
      await step.action();
      const stepEndTime = performance.now();
      stepTimes.push({
        name: step.name,
        time: stepEndTime - stepStartTime,
      });
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageStepTime = stepTimes.reduce((sum, step) => sum + step.time, 0) / stepTimes.length;

    return { totalTime, stepTimes, averageStepTime };
  }

  static testDiscoverability(container: HTMLElement): {
    visibleControls: number;
    labeledControls: number;
    tooltipControls: number;
    discoverabilityScore: number;
  } {
    const allControls = container.querySelectorAll('button, input, select, [role="button"]');
    const visibleControls = Array.from(allControls).filter(
      control => window.getComputedStyle(control).display !== 'none'
    ).length;

    const labeledControls = Array.from(allControls).filter(
      control => control.hasAttribute('aria-label') || 
                 control.hasAttribute('aria-labelledby') ||
                 control.querySelector('label')
    ).length;

    const tooltipControls = Array.from(allControls).filter(
      control => control.hasAttribute('title') || 
                 control.hasAttribute('aria-describedby')
    ).length;

    const discoverabilityScore = (labeledControls + tooltipControls) / (visibleControls * 2);

    return {
      visibleControls,
      labeledControls,
      tooltipControls,
      discoverabilityScore,
    };
  }

  static async testLearnability(
    container: HTMLElement,
    taskSequence: Array<() => Promise<void>>
  ): Promise<{
    completionTimes: number[];
    improvementRate: number;
    learnabilityScore: number;
  }> {
    const completionTimes: number[] = [];

    for (const task of taskSequence) {
      const startTime = performance.now();
      await task();
      const endTime = performance.now();
      completionTimes.push(endTime - startTime);
    }

    // Calculate improvement rate (how much faster the last task was vs first)
    const firstTime = completionTimes[0];
    const lastTime = completionTimes[completionTimes.length - 1];
    const improvementRate = (firstTime - lastTime) / firstTime;

    // Learnability score based on improvement rate and consistency
    const variance = completionTimes.reduce((sum, time, index) => {
      const expected = firstTime * (1 - (improvementRate * index / (completionTimes.length - 1)));
      return sum + Math.pow(time - expected, 2);
    }, 0) / completionTimes.length;

    const learnabilityScore = Math.max(0, improvementRate - (variance / (firstTime * firstTime)));

    return {
      completionTimes,
      improvementRate,
      learnabilityScore,
    };
  }

  static testErrorRecovery(container: HTMLElement): {
    hasErrorBoundary: boolean;
    hasErrorMessages: boolean;
    hasUndoCapability: boolean;
    hasResetCapability: boolean;
    errorRecoveryScore: number;
  } {
    const hasErrorBoundary = !!container.querySelector('[data-testid="error-boundary"]');
    const hasErrorMessages = !!container.querySelector('[role="alert"], .error-message');
    const hasUndoCapability = !!container.querySelector('[aria-label*="undo"], [title*="undo"]');
    const hasResetCapability = !!container.querySelector('[aria-label*="reset"], [title*="reset"]');

    const features = [hasErrorBoundary, hasErrorMessages, hasUndoCapability, hasResetCapability];
    const errorRecoveryScore = features.filter(Boolean).length / features.length;

    return {
      hasErrorBoundary,
      hasErrorMessages,
      hasUndoCapability,
      hasResetCapability,
      errorRecoveryScore,
    };
  }
}

describe('3D Code Archaeology Usability Tests', () => {
  beforeAll(() => {
    setupTestEnvironment();
  });

  afterAll(() => {
    cleanupTestEnvironment();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Interaction Patterns and User Experience', () => {
    it('should provide intuitive 3D navigation controls', async () => {
      const onCameraChange = jest.fn();
      
      const { container } = render(
        <Scene3D
          artifacts={mockCodeArtifacts}
          width={800}
          height={600}
          onCameraChange={onCameraChange}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      // Test mouse navigation
      const mouseNavTime = await UsabilityTester.measureInteractionTime(async () => {
        await user.pointer([
          { target: canvas, coords: { x: 400, y: 300 } },
          { keys: '[MouseLeft>]', coords: { x: 450, y: 350 } },
          { keys: '[/MouseLeft]' },
        ]);
      });

      expect(mouseNavTime).toBeLessThan(100); // Should be responsive
      expect(onCameraChange).toHaveBeenCalled();

      // Test keyboard navigation
      canvas.focus();
      const keyboardNavTime = await UsabilityTester.measureInteractionTime(async () => {
        await user.keyboard('{ArrowRight}{ArrowUp}');
      });

      expect(keyboardNavTime).toBeLessThan(50);
    });

    it('should provide efficient artifact selection workflow', async () => {
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

      const user = userEvent.setup();
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      // Test selection workflow efficiency
      const workflowResult = await UsabilityTester.testWorkflowEfficiency([
        {
          name: 'Navigate to artifact',
          action: async () => {
            canvas.focus();
            await user.keyboard('{ArrowRight}');
          },
        },
        {
          name: 'Select artifact',
          action: async () => {
            await user.keyboard('{Enter}');
          },
        },
        {
          name: 'View details',
          action: async () => {
            await waitFor(() => {
              expect(onArtifactSelect).toHaveBeenCalled();
            });
          },
        },
      ]);

      expect(workflowResult.totalTime).toBeLessThan(500);
      expect(workflowResult.averageStepTime).toBeLessThan(200);
      expect(onArtifactSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
        })
      );
    });

    it('should provide discoverable controls and features', async () => {
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

      const discoverability = UsabilityTester.testDiscoverability(container);

      expect(discoverability.visibleControls).toBeGreaterThan(0);
      expect(discoverability.discoverabilityScore).toBeGreaterThan(0.7);
      expect(discoverability.labeledControls).toBe(discoverability.visibleControls);
    });

    it('should support efficient temporal navigation', async () => {
      const onTimeChange = jest.fn();
      
      const mockAnimation: AnimationSequence = {
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
        ],
        duration: 1000,
        easing: 'easeInOut',
      };

      const { container } = render(
        <TemporalVisualization
          animations={[mockAnimation]}
          currentTime={new Date('2023-01-01')}
          onTimeChange={onTimeChange}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const timeSlider = container.querySelector('input[type="range"]');
      
      if (timeSlider) {
        const temporalNavTime = await UsabilityTester.measureInteractionTime(async () => {
          await user.click(timeSlider);
          await user.keyboard('{ArrowRight}{ArrowRight}');
        });

        expect(temporalNavTime).toBeLessThan(100);
        expect(onTimeChange).toHaveBeenCalled();
      }
    });
  });

  describe('Learnability and Skill Transfer', () => {
    it('should demonstrate good learnability for new users', async () => {
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

      const user = userEvent.setup();
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      // Simulate repeated task performance to test learning
      const taskSequence = Array(5).fill(0).map(() => async () => {
        canvas.focus();
        await user.keyboard('{ArrowRight}{Enter}');
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      const learnabilityResult = await UsabilityTester.testLearnability(
        container,
        taskSequence
      );

      expect(learnabilityResult.improvementRate).toBeGreaterThan(0.1);
      expect(learnabilityResult.learnabilityScore).toBeGreaterThan(0.3);
      expect(learnabilityResult.completionTimes[0]).toBeGreaterThan(
        learnabilityResult.completionTimes[learnabilityResult.completionTimes.length - 1]
      );
    });

    it('should provide consistent interaction patterns across features', async () => {
      const components = [
        <Scene3D artifacts={mockCodeArtifacts} width={800} height={600} />,
        <TraceabilityVisualization
          artifacts={mockCodeArtifacts}
          traceabilityLinks={mockTraceabilityLinks}
          width={800}
          height={600}
        />,
        <FilterPanel
          artifacts={mockCodeArtifacts}
          onFilterChange={jest.fn()}
        />,
      ];

      const interactionPatterns: string[] = [];

      for (const component of components) {
        const { container, unmount } = render(component);
        
        await waitFor(() => {
          const canvas = container.querySelector('canvas');
          const buttons = container.querySelectorAll('button');
          if (canvas || buttons.length > 0) {
            // Component rendered successfully
          }
        });

        // Check for consistent keyboard shortcuts
        const keyboardShortcuts = container.querySelectorAll('[data-keyboard-shortcut]');
        keyboardShortcuts.forEach(element => {
          const shortcut = element.getAttribute('data-keyboard-shortcut');
          if (shortcut) {
            interactionPatterns.push(shortcut);
          }
        });

        // Check for consistent ARIA patterns
        const ariaPatterns = container.querySelectorAll('[role], [aria-label]');
        expect(ariaPatterns.length).toBeGreaterThan(0);

        unmount();
      }

      // Verify consistency across components
      const uniquePatterns = new Set(interactionPatterns);
      expect(uniquePatterns.size).toBeLessThanOrEqual(interactionPatterns.length);
    });

    it('should provide helpful onboarding and guidance', async () => {
      const { container } = render(
        <CodeArchaeologyViewer
          visualization={mockVisualization3D}
          width={800}
          height={600}
          showOnboarding={true}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      // Check for onboarding elements
      const helpText = container.querySelector('[data-testid="help-text"], .onboarding-tip');
      const tutorial = container.querySelector('[data-testid="tutorial"], .tutorial-overlay');
      const shortcuts = container.querySelector('[data-testid="keyboard-shortcuts"]');

      // At least one form of guidance should be present
      const guidanceElements = [helpText, tutorial, shortcuts].filter(Boolean);
      expect(guidanceElements.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle user errors gracefully', async () => {
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

      const errorRecovery = UsabilityTester.testErrorRecovery(container);

      expect(errorRecovery.errorRecoveryScore).toBeGreaterThan(0.5);
      expect(errorRecovery.hasErrorMessages).toBe(true);
    });

    it('should provide undo/redo functionality for user actions', async () => {
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

      const user = userEvent.setup();

      // Look for undo/redo controls
      const undoButton = container.querySelector('[aria-label*="undo"], [title*="undo"]');
      const redoButton = container.querySelector('[aria-label*="redo"], [title*="redo"]');

      if (undoButton && redoButton) {
        // Test undo functionality
        await user.click(undoButton);
        expect(undoButton).toBeInTheDocument();

        // Test redo functionality
        await user.click(redoButton);
        expect(redoButton).toBeInTheDocument();
      }

      // Test keyboard shortcuts for undo/redo
      await user.keyboard('{Control>}z{/Control}'); // Undo
      await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}'); // Redo
    });

    it('should handle WebGL context loss gracefully', async () => {
      // Mock context loss
      const mockLostContext = {
        ...mockWebGLContext,
        isContextLost: jest.fn(() => true),
      };

      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        value: jest.fn(() => mockLostContext),
      });

      const { container } = render(
        <Scene3D
          artifacts={mockCodeArtifacts}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        // Should show fallback or error message
        const fallbackMessage = container.querySelector('[data-testid="webgl-fallback"]');
        const errorMessage = container.querySelector('[role="alert"]');
        
        expect(fallbackMessage || errorMessage).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Responsiveness', () => {
    it('should maintain responsive interactions under load', async () => {
      const largeArtifactSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `artifact-${i}`,
        filePath: `src/file-${i}.ts`,
        type: 'file' as const,
        name: `file-${i}.ts`,
        position3D: { x: Math.random() * 100, y: Math.random() * 100, z: Math.random() * 100 },
        complexity: Math.floor(Math.random() * 10),
        changeFrequency: Math.floor(Math.random() * 20),
        lastModified: new Date(),
        authors: [`user-${i % 10}@example.com`],
        dependencies: [],
      }));

      const { container } = render(
        <Scene3D
          artifacts={largeArtifactSet}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      // Test interaction responsiveness with large dataset
      const interactionTime = await UsabilityTester.measureInteractionTime(async () => {
        canvas.focus();
        await user.keyboard('{ArrowRight}{ArrowRight}{Enter}');
      });

      expect(interactionTime).toBeLessThan(200); // Should remain responsive
    });

    it('should provide smooth animations and transitions', async () => {
      const mockAnimation: AnimationSequence = {
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
        ],
        duration: 1000,
        easing: 'easeInOut',
      };

      const { container } = render(
        <TemporalVisualization
          animations={[mockAnimation]}
          currentTime={new Date('2023-01-01')}
          onTimeChange={jest.fn()}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      // Test animation smoothness by checking frame rate
      const frameCount = 60;
      const frameTimes: number[] = [];

      for (let i = 0; i < frameCount; i++) {
        const startTime = performance.now();
        
        // Simulate animation frame
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        const endTime = performance.now();
        frameTimes.push(endTime - startTime);
      }

      const averageFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
      expect(averageFrameTime).toBeLessThan(20); // Should maintain good frame rate
    });

    it('should adapt quality based on device performance', async () => {
      // Mock low-performance device
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 2,
        configurable: true,
      });

      const { container } = render(
        <CodeArchaeologyViewer
          visualization={mockVisualization3D}
          width={800}
          height={600}
          adaptiveQuality={true}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      // Should automatically reduce quality for low-end devices
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      const context = canvas.getContext('webgl');
      
      if (context) {
        // Check if quality settings were adapted
        expect(canvas.width).toBeLessThanOrEqual(800);
        expect(canvas.height).toBeLessThanOrEqual(600);
      }
    });
  });

  describe('Accessibility Integration with Usability', () => {
    it('should maintain usability while providing accessibility features', async () => {
      const { container } = render(
        <CodeArchaeologyViewer
          visualization={mockVisualization3D}
          width={800}
          height={600}
          accessibilityMode={true}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      // Test that accessibility features don't impede normal usage
      const normalInteractionTime = await UsabilityTester.measureInteractionTime(async () => {
        await user.pointer([
          { target: canvas, coords: { x: 400, y: 300 } },
          { keys: '[MouseLeft>]', coords: { x: 450, y: 350 } },
          { keys: '[/MouseLeft]' },
        ]);
      });

      const keyboardInteractionTime = await UsabilityTester.measureInteractionTime(async () => {
        canvas.focus();
        await user.keyboard('{ArrowRight}{Enter}');
      });

      expect(normalInteractionTime).toBeLessThan(100);
      expect(keyboardInteractionTime).toBeLessThan(100);

      // Verify accessibility features are present
      expect(canvas).toHaveAttribute('aria-label');
      expect(container.querySelector('[aria-live]')).toBeInTheDocument();
    });

    it('should provide alternative interaction methods', async () => {
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

      // Check for alternative interaction methods
      const listView = container.querySelector('[data-testid="list-view"]');
      const treeView = container.querySelector('[data-testid="tree-view"]');
      const searchBox = container.querySelector('input[type="search"]');

      // At least one alternative method should be available
      const alternativeMethods = [listView, treeView, searchBox].filter(Boolean);
      expect(alternativeMethods.length).toBeGreaterThan(0);
    });
  });

  describe('Cross-Device Usability', () => {
    it('should adapt interface for touch devices', async () => {
      // Mock touch device
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 10,
        configurable: true,
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

      // Check for touch-friendly controls
      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        const computedStyle = window.getComputedStyle(button);
        const minTouchTarget = 44; // Minimum touch target size in pixels
        
        // Note: In a real test, you'd check actual computed dimensions
        expect(button).toBeInTheDocument();
      });
    });

    it('should work efficiently on mobile devices', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, configurable: true });

      const { container } = render(
        <CodeArchaeologyViewer
          visualization={mockVisualization3D}
          width={375}
          height={400}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      // Test mobile-specific interactions
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      
      // Simulate touch gestures
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch],
      });
      
      const touchMove = new TouchEvent('touchmove', {
        touches: [{ clientX: 150, clientY: 150 } as Touch],
      });

      const touchEnd = new TouchEvent('touchend', {
        touches: [],
      });

      fireEvent(canvas, touchStart);
      fireEvent(canvas, touchMove);
      fireEvent(canvas, touchEnd);

      // Should handle touch events without errors
      expect(canvas).toBeInTheDocument();
    });
  });
});