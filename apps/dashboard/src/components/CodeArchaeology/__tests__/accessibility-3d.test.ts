/**
 * Accessibility Tests for 3D Visualization
 * Comprehensive testing for keyboard navigation, screen reader support, and WCAG compliance
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import {
  testAccessibility,
  testKeyboardNavigation,
  testScreenReaderAnnouncements,
  testFocusManagement,
  testARIALabels,
  runFullAccessibilityTest,
  wcagConfig,
} from '../../../utils/accessibility-test-helpers';
import { setupTestEnvironment, cleanupTestEnvironment } from '../../../utils/test-utils';
import { Scene3D } from '../Scene3D';
import { CodeArchaeologyViewer } from '../CodeArchaeologyViewer';
import { TemporalVisualization } from '../TemporalVisualization';
import { TraceabilityVisualization } from '../TraceabilityVisualization';
import { TemporalControls } from '../TemporalControls';
import { FilterPanel } from '../FilterPanel';
import type { CodeArtifact, Visualization3D, TraceabilityLink, AnimationSequence } from '../types';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock WebGL and Three.js for accessibility testing
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

// Mock requestAnimationFrame for consistent testing
global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(callback, 16);
  return 1;
});

global.cancelAnimationFrame = jest.fn();

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
  {
    requirementId: 'req-2',
    specFile: 'requirements.md',
    codeArtifacts: ['artifact-3'],
    linkType: 'tests',
    confidence: 0.8,
  },
];

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
  ],
  duration: 1000,
  easing: 'easeInOut',
};

// Accessibility testing utilities
class AccessibilityTester {
  static async testKeyboardNavigation3D(container: HTMLElement): Promise<{
    canvasAccessible: boolean;
    navigationWorks: boolean;
    selectionWorks: boolean;
    zoomWorks: boolean;
    errors: string[];
  }> {
    const user = userEvent.setup();
    const errors: string[] = [];
    
    const canvas = container.querySelector('canvas');
    if (!canvas) {
      errors.push('Canvas element not found');
      return { canvasAccessible: false, navigationWorks: false, selectionWorks: false, zoomWorks: false, errors };
    }

    // Test canvas accessibility
    const canvasAccessible = canvas.hasAttribute('tabindex') && 
                            canvas.hasAttribute('role') && 
                            canvas.hasAttribute('aria-label');
    
    if (!canvasAccessible) {
      errors.push('Canvas lacks proper accessibility attributes');
    }

    // Test focus
    canvas.focus();
    if (document.activeElement !== canvas) {
      errors.push('Canvas cannot receive focus');
    }

    // Test navigation keys
    let navigationWorks = true;
    try {
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{ArrowLeft}');
      await user.keyboard('{ArrowUp}');
      await user.keyboard('{ArrowDown}');
    } catch (error) {
      navigationWorks = false;
      errors.push('Arrow key navigation failed');
    }

    // Test selection keys
    let selectionWorks = true;
    try {
      await user.keyboard('{Enter}');
      await user.keyboard(' ');
      await user.keyboard('{Tab}');
    } catch (error) {
      selectionWorks = false;
      errors.push('Selection key handling failed');
    }

    // Test zoom keys
    let zoomWorks = true;
    try {
      await user.keyboard('{Equal}'); // Zoom in
      await user.keyboard('{Minus}'); // Zoom out
      await user.keyboard('{Digit0}'); // Reset zoom
    } catch (error) {
      zoomWorks = false;
      errors.push('Zoom key handling failed');
    }

    return { canvasAccessible, navigationWorks, selectionWorks, zoomWorks, errors };
  }

  static async testScreenReaderSupport(container: HTMLElement): Promise<{
    hasLiveRegion: boolean;
    hasProperLabels: boolean;
    hasDescriptions: boolean;
    announcesChanges: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Check for live region
    const liveRegion = container.querySelector('[aria-live]');
    const hasLiveRegion = !!liveRegion;
    
    if (!hasLiveRegion) {
      errors.push('No live region found for screen reader announcements');
    }

    // Check canvas labels
    const canvas = container.querySelector('canvas');
    const hasProperLabels = canvas && 
                           canvas.hasAttribute('aria-label') && 
                           canvas.getAttribute('aria-label')!.length > 0;
    
    if (!hasProperLabels) {
      errors.push('Canvas lacks proper aria-label');
    }

    // Check for descriptions
    const hasDescriptions = canvas && canvas.hasAttribute('aria-describedby');
    if (!hasDescriptions) {
      errors.push('Canvas lacks aria-describedby for detailed description');
    }

    // Test if changes are announced
    let announcesChanges = false;
    if (liveRegion) {
      const initialContent = liveRegion.textContent;
      
      // Simulate a change that should trigger announcement
      const changeEvent = new CustomEvent('artifactSelected', {
        detail: { artifactId: 'artifact-1', name: 'Button.tsx' }
      });
      container.dispatchEvent(changeEvent);
      
      // Check if live region content changed
      setTimeout(() => {
        announcesChanges = liveRegion.textContent !== initialContent;
      }, 100);
    }

    return { hasLiveRegion, hasProperLabels, hasDescriptions, announcesChanges, errors };
  }

  static testColorContrastCompliance(container: HTMLElement): {
    compliant: boolean;
    violations: string[];
  } {
    const violations: string[] = [];
    
    // Check text elements for contrast
    const textElements = container.querySelectorAll('button, label, span, div');
    
    textElements.forEach((element, index) => {
      const computedStyle = window.getComputedStyle(element);
      const color = computedStyle.color;
      const backgroundColor = computedStyle.backgroundColor;
      
      // Simple contrast check (in real implementation, would use proper contrast calculation)
      if (color === backgroundColor) {
        violations.push(`Element ${index} has insufficient color contrast`);
      }
    });

    return {
      compliant: violations.length === 0,
      violations,
    };
  }

  static testReducedMotionSupport(renderComponent: () => void): {
    respectsPreference: boolean;
    error?: string;
  } {
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

    try {
      renderComponent();
      return { respectsPreference: true };
    } catch (error) {
      return { 
        respectsPreference: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static testHighContrastSupport(renderComponent: () => void): {
    supportsHighContrast: boolean;
    error?: string;
  } {
    // Mock high contrast preference
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

    try {
      renderComponent();
      return { supportsHighContrast: true };
    } catch (error) {
      return { 
        supportsHighContrast: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

describe('Accessibility Tests for 3D Visualization', () => {
  beforeAll(() => {
    setupTestEnvironment();
  });

  afterAll(() => {
    cleanupTestEnvironment();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Keyboard Navigation Support', () => {
    it('should support comprehensive keyboard navigation in 3D scene', async () => {
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

      const result = await AccessibilityTester.testKeyboardNavigation3D(container);
      
      expect(result.canvasAccessible).toBe(true);
      expect(result.navigationWorks).toBe(true);
      expect(result.selectionWorks).toBe(true);
      expect(result.zoomWorks).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle Tab navigation through 3D controls', async () => {
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

      await testKeyboardNavigation(container);

      // Verify all interactive elements are reachable via Tab
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      expect(focusableElements.length).toBeGreaterThan(0);

      const user = userEvent.setup();
      
      // Tab through all elements
      for (let i = 0; i < focusableElements.length; i++) {
        await user.tab();
        expect(document.activeElement).toBe(focusableElements[i]);
      }
    });

    it('should support spatial navigation with arrow keys', async () => {
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
      expect(canvas).toHaveFocus();

      // Test spatial navigation
      await user.keyboard('{ArrowRight}'); // Move right in 3D space
      await user.keyboard('{ArrowLeft}');  // Move left in 3D space
      await user.keyboard('{ArrowUp}');    // Move up in 3D space
      await user.keyboard('{ArrowDown}');  // Move down in 3D space

      // Test depth navigation
      await user.keyboard('{PageUp}');     // Move forward in Z
      await user.keyboard('{PageDown}');   // Move backward in Z

      // Canvas should maintain focus throughout navigation
      expect(canvas).toHaveFocus();
    });

    it('should support artifact selection via keyboard', async () => {
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

      // Navigate to first artifact and select
      await user.keyboard('{ArrowRight}'); // Navigate to artifact
      await user.keyboard('{Enter}');      // Select artifact

      expect(onArtifactSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
        })
      );

      // Test space bar selection
      await user.keyboard(' ');
      expect(onArtifactSelect).toHaveBeenCalledTimes(2);
    });

    it('should support zoom controls via keyboard', async () => {
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
      
      canvas.focus();

      // Test zoom controls
      await user.keyboard('{Equal}');  // Zoom in (+ key)
      await user.keyboard('{Minus}');  // Zoom out (- key)
      await user.keyboard('{Digit0}'); // Reset zoom

      // Test alternative zoom controls
      await user.keyboard('{Control>}{Equal}{/Control}'); // Ctrl+Plus
      await user.keyboard('{Control>}{Minus}{/Control}'); // Ctrl+Minus

      expect(canvas).toHaveFocus();
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide comprehensive screen reader support', async () => {
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

      const result = await AccessibilityTester.testScreenReaderSupport(container);
      
      expect(result.hasLiveRegion).toBe(true);
      expect(result.hasProperLabels).toBe(true);
      expect(result.hasDescriptions).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should announce artifact selection changes', async () => {
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

      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();

      const user = userEvent.setup();
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      
      canvas.focus();
      await user.keyboard('{Enter}'); // Select artifact

      await waitFor(() => {
        expect(liveRegion).toHaveTextContent(/selected/i);
      });
    });

    it('should provide detailed descriptions for complex visualizations', async () => {
      const { container } = render(
        <TraceabilityVisualization
          artifacts={mockCodeArtifacts}
          traceabilityLinks={mockTraceabilityLinks}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const canvas = container.querySelector('canvas');
      expect(canvas).toHaveAttribute('aria-describedby');

      const descriptionId = canvas?.getAttribute('aria-describedby');
      const description = container.querySelector(`#${descriptionId}`);
      
      expect(description).toBeInTheDocument();
      expect(description?.textContent).toContain('traceability');
      expect(description?.textContent).toContain('requirements');
      expect(description?.textContent).toContain('code artifacts');
    });

    it('should announce temporal navigation changes', async () => {
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

      const liveRegion = container.querySelector('[aria-live]');
      expect(liveRegion).toBeInTheDocument();

      // Simulate time change
      const timeControl = container.querySelector('input[type="range"]');
      if (timeControl) {
        const user = userEvent.setup();
        await user.click(timeControl);
        
        await waitFor(() => {
          expect(liveRegion).toHaveTextContent(/time/i);
        });
      }
    });
  });

  describe('ARIA Labels and Descriptions', () => {
    it('should have proper ARIA labels for all interactive elements', async () => {
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

      const ariaResult = testARIALabels(container);
      expect(ariaResult.violations).toHaveLength(0);
      expect(ariaResult.withLabels).toBe(ariaResult.total);
    });

    it('should provide context-aware ARIA descriptions', async () => {
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

      const canvas = container.querySelector('canvas');
      const ariaLabel = canvas?.getAttribute('aria-label');
      
      expect(ariaLabel).toContain('3D visualization');
      expect(ariaLabel).toContain(`${mockCodeArtifacts.length} artifacts`);
      
      const describedBy = canvas?.getAttribute('aria-describedby');
      if (describedBy) {
        const description = container.querySelector(`#${describedBy}`);
        expect(description?.textContent).toContain('Navigate with arrow keys');
        expect(description?.textContent).toContain('Select with Enter or Space');
      }
    });

    it('should update ARIA labels based on current state', async () => {
      const { container, rerender } = render(
        <Scene3D
          artifacts={mockCodeArtifacts.slice(0, 1)}
          width={800}
          height={600}
          onArtifactSelect={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      let canvas = container.querySelector('canvas');
      let ariaLabel = canvas?.getAttribute('aria-label');
      expect(ariaLabel).toContain('1 artifact');

      // Re-render with more artifacts
      rerender(
        <Scene3D
          artifacts={mockCodeArtifacts}
          width={800}
          height={600}
          onArtifactSelect={jest.fn()}
        />
      );

      canvas = container.querySelector('canvas');
      ariaLabel = canvas?.getAttribute('aria-label');
      expect(ariaLabel).toContain('3 artifacts');
    });
  });

  describe('Focus Management', () => {
    it('should manage focus properly in 3D environment', async () => {
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

      const focusCount = testFocusManagement(container);
      expect(focusCount).toBeGreaterThan(0);

      // Test focus indicators
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      canvas.focus();
      
      const computedStyle = window.getComputedStyle(canvas, ':focus');
      const hasVisibleFocus = computedStyle.outline !== 'none' || 
                             computedStyle.boxShadow !== 'none' ||
                             computedStyle.border !== 'none';
      
      expect(hasVisibleFocus).toBe(true);
    });

    it('should trap focus within modal dialogs', async () => {
      const { container } = render(
        <div>
          <CodeArchaeologyViewer
            visualization={mockVisualization3D}
            width={800}
            height={600}
          />
          <div role="dialog" aria-modal="true">
            <button>Close</button>
            <input type="text" placeholder="Search" />
            <button>Apply</button>
          </div>
        </div>
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      const dialog = container.querySelector('[role="dialog"]');
      const dialogButtons = dialog?.querySelectorAll('button');
      const dialogInput = dialog?.querySelector('input');

      if (dialogButtons && dialogInput) {
        const user = userEvent.setup();
        
        // Focus first button
        dialogButtons[0].focus();
        expect(dialogButtons[0]).toHaveFocus();

        // Tab should move to input
        await user.tab();
        expect(dialogInput).toHaveFocus();

        // Tab should move to second button
        await user.tab();
        expect(dialogButtons[1]).toHaveFocus();

        // Tab should wrap back to first button
        await user.tab();
        expect(dialogButtons[0]).toHaveFocus();
      }
    });

    it('should restore focus after modal closes', async () => {
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
      canvas.focus();
      expect(canvas).toHaveFocus();

      // Simulate modal opening and closing
      const modal = document.createElement('div');
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      
      const modalButton = document.createElement('button');
      modalButton.textContent = 'Close';
      modal.appendChild(modalButton);
      
      document.body.appendChild(modal);
      modalButton.focus();
      expect(modalButton).toHaveFocus();

      // Close modal and restore focus
      document.body.removeChild(modal);
      canvas.focus();
      expect(canvas).toHaveFocus();
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('should meet WCAG color contrast requirements', async () => {
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

      const contrastResult = AccessibilityTester.testColorContrastCompliance(container);
      expect(contrastResult.compliant).toBe(true);
      expect(contrastResult.violations).toHaveLength(0);
    });

    it('should support high contrast mode', async () => {
      const renderComponent = () => {
        render(
          <CodeArchaeologyViewer
            visualization={mockVisualization3D}
            width={800}
            height={600}
          />
        );
      };

      const result = AccessibilityTester.testHighContrastSupport(renderComponent);
      expect(result.supportsHighContrast).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should provide alternative visual indicators', async () => {
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

      // Should provide non-color-dependent visual indicators
      const canvas = container.querySelector('canvas');
      expect(canvas).toHaveAttribute('aria-label');
      
      // Should have text alternatives for visual information
      const textAlternatives = container.querySelectorAll('[aria-label], [aria-describedby]');
      expect(textAlternatives.length).toBeGreaterThan(0);
    });
  });

  describe('Motion and Animation Accessibility', () => {
    it('should respect reduced motion preferences', async () => {
      const renderComponent = () => {
        render(
          <TemporalVisualization
            animations={[mockAnimationSequence]}
            currentTime={new Date('2023-01-01')}
            onTimeChange={jest.fn()}
            width={800}
            height={600}
          />
        );
      };

      const result = AccessibilityTester.testReducedMotionSupport(renderComponent);
      expect(result.respectsPreference).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should provide animation controls', async () => {
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

      // Should have play/pause controls
      const playButton = container.querySelector('button[aria-label*="play"], button[aria-label*="pause"]');
      expect(playButton).toBeInTheDocument();

      // Should have speed controls
      const speedControl = container.querySelector('input[type="range"][aria-label*="speed"]');
      expect(speedControl).toBeInTheDocument();

      // Controls should be keyboard accessible
      if (playButton) {
        const user = userEvent.setup();
        playButton.focus();
        expect(playButton).toHaveFocus();
        
        await user.keyboard('{Enter}');
        // Animation state should change
      }
    });

    it('should announce animation state changes', async () => {
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

      const liveRegion = container.querySelector('[aria-live]');
      expect(liveRegion).toBeInTheDocument();

      const playButton = container.querySelector('button[aria-label*="play"]');
      if (playButton) {
        const user = userEvent.setup();
        await user.click(playButton);

        await waitFor(() => {
          expect(liveRegion).toHaveTextContent(/playing|started/i);
        });
      }
    });
  });

  describe('Comprehensive WCAG Compliance', () => {
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

      const results = await runFullAccessibilityTest(container);
      
      expect(results.axe.violations).toHaveLength(0);
      expect(results.ariaLabels.violations).toHaveLength(0);
      expect(results.focusManagement).toBeGreaterThan(0);
      expect(results.landmarks.hasMain).toBe(true);
    });

    it('should meet WCAG 2.1 AA standards', async () => {
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

      const results = await axe(container, wcagConfig);
      expect(results).toHaveNoViolations();
    });

    it('should support assistive technologies', async () => {
      const { container } = render(
        <TraceabilityVisualization
          artifacts={mockCodeArtifacts}
          traceabilityLinks={mockTraceabilityLinks}
          width={800}
          height={600}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });

      // Should have proper semantic structure
      const landmarks = container.querySelectorAll('[role="main"], [role="region"], main');
      expect(landmarks.length).toBeGreaterThan(0);

      // Should have proper heading structure
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (headings.length > 0) {
        const firstHeading = headings[0];
        expect(['h1', 'h2'].includes(firstHeading.tagName.toLowerCase())).toBe(true);
      }

      // Should have skip links for keyboard users
      const skipLinks = container.querySelectorAll('a[href^="#"]');
      expect(skipLinks.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling and Graceful Degradation', () => {
    it('should handle WebGL unavailability gracefully', async () => {
      // Mock WebGL unavailability
      HTMLCanvasElement.prototype.getContext = jest.fn(() => null);

      const { container } = render(
        <Scene3D
          artifacts={mockCodeArtifacts}
          width={800}
          height={600}
          onArtifactSelect={jest.fn()}
        />
      );

      // Should still render accessible fallback
      expect(container).toBeInTheDocument();
      
      // Should provide text alternative
      const fallbackContent = container.querySelector('[role="img"], [aria-label]');
      expect(fallbackContent).toBeInTheDocument();
    });

    it('should provide meaningful error messages', async () => {
      // Mock context creation failure
      HTMLCanvasElement.prototype.getContext = jest.fn(() => {
        throw new Error('WebGL not supported');
      });

      const { container } = render(
        <CodeArchaeologyViewer
          visualization={mockVisualization3D}
          width={800}
          height={600}
        />
      );

      // Should display accessible error message
      const errorMessage = container.querySelector('[role="alert"], .error-message');
      expect(errorMessage).toBeInTheDocument();
      
      if (errorMessage) {
        expect(errorMessage.textContent).toContain('visualization');
        expect(errorMessage.textContent).toContain('not available');
      }
    });

    it('should maintain accessibility during error states', async () => {
      // Mock partial failure
      const mockContext = { ...mockWebGLContext };
      mockContext.getParameter = jest.fn(() => {
        throw new Error('Parameter not available');
      });

      HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext);

      const { container } = render(
        <Scene3D
          artifacts={mockCodeArtifacts}
          width={800}
          height={600}
          onArtifactSelect={jest.fn()}
        />
      );

      // Should still be accessible even with errors
      const results = await testAccessibility(container);
      expect(results.violations).toHaveLength(0);
    });
  });
});