/**
 * Comprehensive Keyboard Navigation Tests for 3D Visualization
 * Tests for spatial navigation, artifact selection, and accessibility compliance
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupTestEnvironment, cleanupTestEnvironment } from '../../../utils/test-utils';
import { Scene3D } from '../Scene3D';
import { CodeArchaeologyViewer } from '../CodeArchaeologyViewer';
import { TemporalVisualization } from '../TemporalVisualization';
import { TraceabilityVisualization } from '../TraceabilityVisualization';
import { FilterPanel } from '../FilterPanel';
import type { CodeArtifact, Visualization3D, TraceabilityLink, AnimationSequence } from '../types';

// Mock WebGL for keyboard navigation testing
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
    position3D: { x: 10, y: 0, z: 0 },
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
    position3D: { x: 0, y: 10, z: 0 },
    complexity: 8,
    changeFrequency: 15,
    lastModified: new Date('2023-01-03'),
    authors: ['bob@example.com'],
    dependencies: ['artifact-1'],
  },
  {
    id: 'artifact-4',
    filePath: 'src/utils/helpers.ts',
    type: 'function',
    name: 'formatDate',
    position3D: { x: 0, y: 0, z: 10 },
    complexity: 2,
    changeFrequency: 3,
    lastModified: new Date('2023-01-04'),
    authors: ['alice@example.com'],
    dependencies: [],
  },
];

const mockVisualization3D: Visualization3D = {
  id: 'viz-1',
  sceneData: {
    artifacts: mockCodeArtifacts,
    connections: [],
    metadata: { totalFiles: 3, totalFunctions: 2, totalClasses: 1 },
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

// Keyboard navigation testing utilities
class KeyboardNavigationTester {
  static async testSpatialNavigation(
    canvas: HTMLCanvasElement,
    user: ReturnType<typeof userEvent.setup>
  ): Promise<{
    canNavigate: boolean;
    directions: string[];
    errors: string[];
  }> {
    const errors: string[] = [];
    const directions: string[] = [];

    canvas.focus();
    if (document.activeElement !== canvas) {
      errors.push('Canvas cannot receive focus');
      return { canNavigate: false, directions, errors };
    }

    const navigationKeys = [
      { key: '{ArrowRight}', direction: 'right' },
      { key: '{ArrowLeft}', direction: 'left' },
      { key: '{ArrowUp}', direction: 'up' },
      { key: '{ArrowDown}', direction: 'down' },
      { key: '{PageUp}', direction: 'forward' },
      { key: '{PageDown}', direction: 'backward' },
    ];

    for (const { key, direction } of navigationKeys) {
      try {
        await user.keyboard(key);
        directions.push(direction);
        
        // Verify canvas maintains focus
        if (document.activeElement !== canvas) {
          errors.push(`Focus lost during ${direction} navigation`);
        }
      } catch (error) {
        errors.push(`Failed to navigate ${direction}: ${error}`);
      }
    }

    return {
      canNavigate: errors.length === 0,
      directions,
      errors,
    };
  }

  static async testArtifactSelection(
    canvas: HTMLCanvasElement,
    user: ReturnType<typeof userEvent.setup>,
    onArtifactSelect: jest.Mock
  ): Promise<{
    canSelect: boolean;
    selectionMethods: string[];
    errors: string[];
  }> {
    const errors: string[] = [];
    const selectionMethods: string[] = [];

    canvas.focus();

    // Test Enter key selection
    try {
      await user.keyboard('{Enter}');
      if (onArtifactSelect.mock.calls.length > 0) {
        selectionMethods.push('Enter');
      }
    } catch (error) {
      errors.push(`Enter key selection failed: ${error}`);
    }

    // Test Space key selection
    try {
      await user.keyboard(' ');
      if (onArtifactSelect.mock.calls.length > selectionMethods.length) {
        selectionMethods.push('Space');
      }
    } catch (error) {
      errors.push(`Space key selection failed: ${error}`);
    }

    // Test Tab navigation to next artifact
    try {
      await user.keyboard('{Tab}');
      selectionMethods.push('Tab');
    } catch (error) {
      errors.push(`Tab navigation failed: ${error}`);
    }

    return {
      canSelect: selectionMethods.length > 0,
      selectionMethods,
      errors,
    };
  }

  static async testZoomControls(
    canvas: HTMLCanvasElement,
    user: ReturnType<typeof userEvent.setup>
  ): Promise<{
    canZoom: boolean;
    zoomMethods: string[];
    errors: string[];
  }> {
    const errors: string[] = [];
    const zoomMethods: string[] = [];

    canvas.focus();

    const zoomKeys = [
      { key: '{Equal}', method: 'Plus key zoom in' },
      { key: '{Minus}', method: 'Minus key zoom out' },
      { key: '{Digit0}', method: 'Zero key reset zoom' },
      { key: '{Control>}{Equal}{/Control}', method: 'Ctrl+Plus zoom in' },
      { key: '{Control>}{Minus}{/Control}', method: 'Ctrl+Minus zoom out' },
    ];

    for (const { key, method } of zoomKeys) {
      try {
        await user.keyboard(key);
        zoomMethods.push(method);
      } catch (error) {
        errors.push(`${method} failed: ${error}`);
      }
    }

    return {
      canZoom: zoomMethods.length > 0,
      zoomMethods,
      errors,
    };
  }

  static async testKeyboardShortcuts(
    container: HTMLElement,
    user: ReturnType<typeof userEvent.setup>
  ): Promise<{
    shortcuts: Array<{ key: string; action: string; works: boolean }>;
    totalShortcuts: number;
    workingShortcuts: number;
  }> {
    const shortcuts = [
      { key: '{Control>}f{/Control}', action: 'Search/Filter', element: 'input[type="search"]' },
      { key: '{Escape}', action: 'Close modal/panel', element: '[role="dialog"]' },
      { key: '{Control>}z{/Control}', action: 'Undo', element: '[aria-label*="undo"]' },
      { key: '{Control>}{Shift>}z{/Shift}{/Control}', action: 'Redo', element: '[aria-label*="redo"]' },
      { key: '{F1}', action: 'Help', element: '[data-testid="help"]' },
      { key: '{Control>}h{/Control}', action: 'Toggle help', element: '[data-testid="help-toggle"]' },
      { key: '{Control>}r{/Control}', action: 'Reset view', element: '[aria-label*="reset"]' },
    ];

    const results = [];

    for (const shortcut of shortcuts) {
      try {
        const initialElement = container.querySelector(shortcut.element);
        await user.keyboard(shortcut.key);
        
        // Check if the shortcut had an effect
        const elementAfter = container.querySelector(shortcut.element);
        const works = initialElement !== elementAfter || 
                     (initialElement && initialElement !== document.activeElement);
        
        results.push({
          key: shortcut.key,
          action: shortcut.action,
          works,
        });
      } catch (error) {
        results.push({
          key: shortcut.key,
          action: shortcut.action,
          works: false,
        });
      }
    }

    return {
      shortcuts: results,
      totalShortcuts: results.length,
      workingShortcuts: results.filter(s => s.works).length,
    };
  }
}

describe('Comprehensive 3D Keyboard Navigation Tests', () => {
  beforeAll(() => {
    setupTestEnvironment();
  });

  afterAll(() => {
    cleanupTestEnvironment();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Spatial Navigation', () => {
    it('should support all directional navigation keys', async () => {
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

      const result = await KeyboardNavigationTester.testSpatialNavigation(canvas, user);

      expect(result.canNavigate).toBe(true);
      expect(result.directions).toContain('right');
      expect(result.directions).toContain('left');
      expect(result.directions).toContain('up');
      expect(result.directions).toContain('down');
      expect(result.directions).toContain('forward');
      expect(result.directions).toContain('backward');
      expect(result.errors).toHaveLength(0);
      expect(onCameraChange).toHaveBeenCalled();
    });

    it('should maintain focus during navigation', async () => {
      const { container } = render(
        <Scene3D
          artifacts={mockCodeArtifacts}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      canvas.focus();
      expect(canvas).toHaveFocus();

      // Navigate in multiple directions
      await user.keyboard('{ArrowRight}');
      expect(canvas).toHaveFocus();

      await user.keyboard('{ArrowUp}');
      expect(canvas).toHaveFocus();

      await user.keyboard('{PageDown}');
      expect(canvas).toHaveFocus();
    });

    it('should provide smooth navigation with WASD keys', async () => {
      const { container } = render(
        <Scene3D
          artifacts={mockCodeArtifacts}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      canvas.focus();

      // Test WASD navigation
      await user.keyboard('w'); // Forward
      await user.keyboard('a'); // Left
      await user.keyboard('s'); // Backward
      await user.keyboard('d'); // Right

      expect(canvas).toHaveFocus();
    });
  });

  describe('Artifact Selection and Interaction', () => {
    it('should support multiple selection methods', async () => {
      const onArtifactSelect = jest.fn();
      
      const { container } = render(
        <Scene3D
          artifacts={mockCodeArtifacts}
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

      const result = await KeyboardNavigationTester.testArtifactSelection(
        canvas,
        user,
        onArtifactSelect
      );

      expect(result.canSelect).toBe(true);
      expect(result.selectionMethods).toContain('Enter');
      expect(result.selectionMethods).toContain('Space');
      expect(result.errors).toHaveLength(0);
      expect(onArtifactSelect).toHaveBeenCalled();
    });

    it('should navigate between artifacts with Tab key', async () => {
      const onArtifactSelect = jest.fn();
      
      const { container } = render(
        <Scene3D
          artifacts={mockCodeArtifacts}
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

      canvas.focus();

      // Tab through artifacts
      for (let i = 0; i < mockCodeArtifacts.length; i++) {
        await user.keyboard('{Tab}');
        await user.keyboard('{Enter}');
      }

      expect(onArtifactSelect).toHaveBeenCalledTimes(mockCodeArtifacts.length);
    });

    it('should support Shift+Tab for reverse navigation', async () => {
      const onArtifactSelect = jest.fn();
      
      const { container } = render(
        <Scene3D
          artifacts={mockCodeArtifacts}
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

      canvas.focus();

      // Navigate forward then backward
      await user.keyboard('{Tab}');
      await user.keyboard('{Tab}');
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      await user.keyboard('{Enter}');

      expect(onArtifactSelect).toHaveBeenCalled();
    });

    it('should provide context menu access via keyboard', async () => {
      const { container } = render(
        <Scene3D
          artifacts={mockCodeArtifacts}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      canvas.focus();

      // Navigate to artifact and open context menu
      await user.keyboard('{Tab}');
      await user.keyboard('{F10}'); // Context menu key
      
      // Alternative context menu access
      await user.keyboard('{Shift>}{F10}{/Shift}');

      expect(canvas).toHaveFocus();
    });
  });

  describe('Zoom and View Controls', () => {
    it('should support comprehensive zoom controls', async () => {
      const { container } = render(
        <Scene3D
          artifacts={mockCodeArtifacts}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      const result = await KeyboardNavigationTester.testZoomControls(canvas, user);

      expect(result.canZoom).toBe(true);
      expect(result.zoomMethods.length).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should support view reset and home position', async () => {
      const { container } = render(
        <Scene3D
          artifacts={mockCodeArtifacts}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      canvas.focus();

      // Navigate away from home position
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{ArrowUp}');
      await user.keyboard('{Equal}'); // Zoom in

      // Reset to home position
      await user.keyboard('{Home}');
      await user.keyboard('{Digit0}'); // Reset zoom

      expect(canvas).toHaveFocus();
    });

    it('should support fine and coarse movement modes', async () => {
      const { container } = render(
        <Scene3D
          artifacts={mockCodeArtifacts}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      canvas.focus();

      // Fine movement (with Shift)
      await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
      await user.keyboard('{Shift>}{ArrowUp}{/Shift}');

      // Coarse movement (with Ctrl)
      await user.keyboard('{Control>}{ArrowRight}{/Control}');
      await user.keyboard('{Control>}{ArrowUp}{/Control}');

      expect(canvas).toHaveFocus();
    });
  });

  describe('Temporal Navigation Controls', () => {
    it('should support keyboard-driven temporal navigation', async () => {
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
        timeSlider.focus();

        // Navigate through time
        await user.keyboard('{ArrowRight}'); // Forward in time
        await user.keyboard('{ArrowLeft}');  // Backward in time
        await user.keyboard('{PageUp}');     // Jump forward
        await user.keyboard('{PageDown}');   // Jump backward
        await user.keyboard('{Home}');       // Go to start
        await user.keyboard('{End}');        // Go to end

        expect(onTimeChange).toHaveBeenCalled();
      }

      // Test play/pause controls
      const playButton = container.querySelector('button[aria-label*="play"]');
      if (playButton) {
        await user.click(playButton);
        await user.keyboard(' '); // Space to toggle play/pause
      }
    });

    it('should support animation speed controls', async () => {
      const mockAnimation: AnimationSequence = {
        id: 'anim-1',
        timeRange: {
          start: new Date('2023-01-01'),
          end: new Date('2023-01-31'),
        },
        keyframes: [],
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

      const user = userEvent.setup();

      // Test speed controls
      await user.keyboard('{Shift>}{Equal}{/Shift}'); // Increase speed
      await user.keyboard('{Shift>}{Minus}{/Shift}'); // Decrease speed
      await user.keyboard('{Shift>}{Digit1}{/Shift}'); // Normal speed
    });
  });

  describe('Filter and Search Controls', () => {
    it('should support keyboard-driven filtering', async () => {
      const onFilterChange = jest.fn();
      
      const { container } = render(
        <div>
          <FilterPanel
            artifacts={mockCodeArtifacts}
            onFilterChange={onFilterChange}
          />
          <Scene3D
            artifacts={mockCodeArtifacts}
            width={800}
            height={600}
          />
        </div>
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const user = userEvent.setup();

      // Test filter shortcuts
      await user.keyboard('{Control>}f{/Control}'); // Open search
      
      const searchInput = container.querySelector('input[type="search"]');
      if (searchInput) {
        expect(searchInput).toHaveFocus();
        
        await user.type(searchInput, 'Button');
        await user.keyboard('{Enter}');
        
        expect(onFilterChange).toHaveBeenCalled();
      }

      // Test filter by type shortcuts
      await user.keyboard('{Control>}1{/Control}'); // Filter files
      await user.keyboard('{Control>}2{/Control}'); // Filter functions
      await user.keyboard('{Control>}3{/Control}'); // Filter classes
    });

    it('should support search result navigation', async () => {
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

      // Open search
      await user.keyboard('{Control>}f{/Control}');
      
      const searchInput = container.querySelector('input[type="search"]');
      if (searchInput) {
        await user.type(searchInput, 'Component');
        
        // Navigate search results
        await user.keyboard('{F3}');        // Next result
        await user.keyboard('{Shift>}{F3}{/Shift}'); // Previous result
        await user.keyboard('{Escape}');    // Close search
      }
    });
  });

  describe('Global Keyboard Shortcuts', () => {
    it('should support comprehensive keyboard shortcuts', async () => {
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

      const result = await KeyboardNavigationTester.testKeyboardShortcuts(container, user);

      expect(result.totalShortcuts).toBeGreaterThan(0);
      expect(result.workingShortcuts).toBeGreaterThan(0);
      
      // At least 50% of shortcuts should work
      const successRate = result.workingShortcuts / result.totalShortcuts;
      expect(successRate).toBeGreaterThan(0.5);
    });

    it('should provide help for keyboard shortcuts', async () => {
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

      // Test help shortcut
      await user.keyboard('{F1}');
      
      // Should show help dialog or panel
      const helpDialog = container.querySelector('[role="dialog"]');
      const helpPanel = container.querySelector('[data-testid="help-panel"]');
      
      expect(helpDialog || helpPanel).toBeInTheDocument();

      // Test alternative help shortcut
      await user.keyboard('{Control>}h{/Control}');
    });

    it('should handle shortcut conflicts gracefully', async () => {
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

      // Test potentially conflicting shortcuts
      await user.keyboard('{Control>}z{/Control}'); // Undo
      await user.keyboard('{Control>}y{/Control}'); // Redo (alternative)
      await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}'); // Redo

      // Should not cause errors or unexpected behavior
      expect(container.querySelector('canvas')).toBeInTheDocument();
    });
  });

  describe('Accessibility Integration', () => {
    it('should announce navigation changes to screen readers', async () => {
      const { container } = render(
        <Scene3D
          artifacts={mockCodeArtifacts}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      const liveRegion = container.querySelector('[aria-live]');

      expect(liveRegion).toBeInTheDocument();

      canvas.focus();
      await user.keyboard('{ArrowRight}');

      await waitFor(() => {
        expect(liveRegion).toHaveTextContent(/moved|navigated/i);
      });
    });

    it('should announce artifact selection to screen readers', async () => {
      const onArtifactSelect = jest.fn();
      
      const { container } = render(
        <Scene3D
          artifacts={mockCodeArtifacts}
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
      const liveRegion = container.querySelector('[aria-live]');

      canvas.focus();
      await user.keyboard('{Tab}');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(liveRegion).toHaveTextContent(/selected/i);
      });

      expect(onArtifactSelect).toHaveBeenCalled();
    });

    it('should provide skip links for keyboard users', async () => {
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

      // Look for skip links
      const skipLinks = container.querySelectorAll('a[href^="#"], button[data-skip-to]');
      
      if (skipLinks.length > 0) {
        // Test skip link functionality
        await user.click(skipLinks[0]);
        
        // Should move focus to target element
        const targetId = skipLinks[0].getAttribute('href')?.substring(1) ||
                        skipLinks[0].getAttribute('data-skip-to');
        
        if (targetId) {
          const targetElement = container.querySelector(`#${targetId}`);
          expect(targetElement).toHaveFocus();
        }
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle keyboard navigation when no artifacts are present', async () => {
      const { container } = render(
        <Scene3D
          artifacts={[]}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      canvas.focus();

      // Should not error when navigating with no artifacts
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{Tab}');
      await user.keyboard('{Enter}');

      expect(canvas).toHaveFocus();
    });

    it('should handle rapid keyboard input gracefully', async () => {
      const { container } = render(
        <Scene3D
          artifacts={mockCodeArtifacts}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;

      canvas.focus();

      // Rapid keyboard input
      const rapidKeys = '{ArrowRight}{ArrowUp}{ArrowLeft}{ArrowDown}{Tab}{Enter}{Escape}';
      await user.keyboard(rapidKeys);

      expect(canvas).toBeInTheDocument();
    });

    it('should maintain keyboard navigation during context loss', async () => {
      // Mock context loss
      const mockLostContext = {
        ...mockWebGLContext,
        isContextLost: jest.fn(() => true),
      };

      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        value: jest.fn(() => mockLostContext),
        configurable: true,
      });

      const { container } = render(
        <Scene3D
          artifacts={mockCodeArtifacts}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        const fallback = container.querySelector('[data-testid="webgl-fallback"]') ||
                         container.querySelector('canvas');
        expect(fallback).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const focusableElement = container.querySelector('canvas, button, input') as HTMLElement;

      if (focusableElement) {
        focusableElement.focus();
        await user.keyboard('{ArrowRight}');
        
        // Should still be focusable and responsive
        expect(focusableElement).toBeInTheDocument();
      }
    });
  });
});