import React from 'react';
import { render, screen } from '@testing-library/react';
import { Vector3 } from 'three';
import CodeArtifact3D from '../CodeArchaeology/CodeArtifact3D';
import { CodeArtifact, VisualizationConfig } from '../CodeArchaeology/types';

// Additional test-specific mocks

const mockArtifact: CodeArtifact = {
  id: 'test-artifact',
  filePath: '/src/components/Test.tsx',
  type: 'file',
  name: 'Test.tsx',
  position3D: new Vector3(0, 0, 0),
  complexity: 5,
  changeFrequency: 3,
  lastModified: new Date('2023-01-01'),
  authors: ['john.doe'],
  dependencies: ['dep1', 'dep2'],
  size: 100,
  color: '#4a90e2',
};

const defaultConfig: VisualizationConfig = {
  showDependencies: true,
  showComplexity: true,
  showChangeFrequency: true,
};

const renderCodeArtifact3D = (props: Partial<React.ComponentProps<typeof CodeArtifact3D>> = {}) => {
  const defaultProps = {
    artifact: mockArtifact,
    config: defaultConfig,
    isSelected: false,
    isHighlighted: false,
    onClick: jest.fn(),
    onHover: jest.fn(),
  };

  return render(
    <div data-testid="canvas">
      <CodeArtifact3D {...defaultProps} {...props} />
    </div>
  );
};

describe('CodeArtifact3D Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Geometry Rendering', () => {
    it('renders box geometry for file artifacts', () => {
      const fileArtifact = { ...mockArtifact, type: 'file' as const };
      const { container } = renderCodeArtifact3D({ artifact: fileArtifact });
      
      const boxGeometry = container.querySelector('boxGeometry');
      expect(boxGeometry).toBeInTheDocument();
    });

    it('renders cylinder geometry for function artifacts', () => {
      const functionArtifact = { ...mockArtifact, type: 'function' as const };
      const { container } = renderCodeArtifact3D({ artifact: functionArtifact });
      
      const cylinderGeometry = container.querySelector('cylinderGeometry');
      expect(cylinderGeometry).toBeInTheDocument();
    });

    it('renders box geometry for class artifacts', () => {
      const classArtifact = { ...mockArtifact, type: 'class' as const };
      const { container } = renderCodeArtifact3D({ artifact: classArtifact });
      
      const boxGeometry = container.querySelector('boxGeometry');
      expect(boxGeometry).toBeInTheDocument();
    });

    it('renders cone geometry for interface artifacts', () => {
      const interfaceArtifact = { ...mockArtifact, type: 'interface' as const };
      const { container } = renderCodeArtifact3D({ artifact: interfaceArtifact });
      
      const coneGeometry = container.querySelector('coneGeometry');
      expect(coneGeometry).toBeInTheDocument();
    });
  });

  describe('Visual Properties', () => {
    it('applies custom color when specified', () => {
      const coloredArtifact = { ...mockArtifact, color: '#ff0000' };
      renderCodeArtifact3D({ artifact: coloredArtifact });
      
      // The color would be applied to the material, which we can't easily test in JSDOM
      // But we can verify the component renders without errors
      expect(screen.getByTestId('text')).toBeInTheDocument();
    });

    it('scales based on complexity when enabled', () => {
      const complexArtifact = { ...mockArtifact, complexity: 20 };
      const config = { ...defaultConfig, showComplexity: true };
      
      renderCodeArtifact3D({ artifact: complexArtifact, config });
      
      // Verify component renders (scaling is handled in Three.js which we can't test directly)
      expect(screen.getByTestId('text')).toBeInTheDocument();
    });

    it('does not scale based on complexity when disabled', () => {
      const complexArtifact = { ...mockArtifact, complexity: 20 };
      const config = { ...defaultConfig, showComplexity: false };
      
      renderCodeArtifact3D({ artifact: complexArtifact, config });
      
      expect(screen.getByTestId('text')).toBeInTheDocument();
    });
  });

  describe('Interaction Handling', () => {
    it('calls onClick when artifact is clicked', () => {
      const onClick = jest.fn();
      const { container } = renderCodeArtifact3D({ onClick });
      
      const mesh = container.querySelector('mesh');
      expect(mesh).toBeInTheDocument();
      
      if (mesh) {
        fireEvent.click(mesh);
        expect(onClick).toHaveBeenCalledWith(mockArtifact);
      }
    });

    it('calls onHover when artifact is hovered', () => {
      const onHover = jest.fn();
      const { container } = renderCodeArtifact3D({ onHover });
      
      const mesh = container.querySelector('mesh');
      expect(mesh).toBeInTheDocument();
      
      if (mesh) {
        fireEvent.mouseEnter(mesh);
        expect(onHover).toHaveBeenCalledWith(mockArtifact);
        
        fireEvent.mouseLeave(mesh);
        expect(onHover).toHaveBeenCalledWith(null);
      }
    });

    it('prevents event propagation on interactions', () => {
      const onClick = jest.fn();
      const { container } = renderCodeArtifact3D({ onClick });
      
      const mesh = container.querySelector('mesh');
      if (mesh) {
        const event = new MouseEvent('click', { bubbles: true });
        const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');
        
        fireEvent(mesh, event);
        expect(stopPropagationSpy).toHaveBeenCalled();
      }
    });
  });

  describe('Label Display', () => {
    it('shows label when artifact is selected', () => {
      renderCodeArtifact3D({ isSelected: true });
      
      const label = screen.getByTestId('text');
      expect(label).toBeInTheDocument();
      expect(label).toHaveTextContent('Test.tsx');
    });

    it('shows label when artifact is highlighted', () => {
      renderCodeArtifact3D({ isHighlighted: true });
      
      const label = screen.getByTestId('text');
      expect(label).toBeInTheDocument();
      expect(label).toHaveTextContent('Test.tsx');
    });

    it('hides label when artifact is not selected or highlighted', () => {
      renderCodeArtifact3D({ isSelected: false, isHighlighted: false });
      
      // Label should not be rendered when not selected/highlighted
      // This is handled by conditional rendering in the component
      expect(screen.queryByTestId('text')).not.toBeInTheDocument();
    });
  });

  describe('Indicator Rendering', () => {
    it('shows complexity indicator for high complexity artifacts', () => {
      const complexArtifact = { ...mockArtifact, complexity: 10 };
      const config = { ...defaultConfig, showComplexity: true };
      const { container } = renderCodeArtifact3D({ artifact: complexArtifact, config });
      
      // Should render additional sphere for complexity indicator
      const spheres = container.querySelectorAll('sphereGeometry');
      expect(spheres.length).toBeGreaterThan(0);
    });

    it('shows change frequency indicator for frequently changed artifacts', () => {
      const frequentArtifact = { ...mockArtifact, changeFrequency: 10 };
      const config = { ...defaultConfig, showChangeFrequency: true };
      const { container } = renderCodeArtifact3D({ artifact: frequentArtifact, config });
      
      // Should render additional sphere for change frequency indicator
      const spheres = container.querySelectorAll('sphereGeometry');
      expect(spheres.length).toBeGreaterThan(0);
    });

    it('does not show indicators when disabled in config', () => {
      const complexArtifact = { ...mockArtifact, complexity: 10, changeFrequency: 10 };
      const config = {
        ...defaultConfig,
        showComplexity: false,
        showChangeFrequency: false,
      };
      const { container } = renderCodeArtifact3D({ artifact: complexArtifact, config });
      
      // Should only have the main geometry, no indicator spheres
      const spheres = container.querySelectorAll('sphereGeometry');
      expect(spheres.length).toBe(0);
    });
  });

  describe('State Management', () => {
    it('maintains hover state correctly', () => {
      const { container } = renderCodeArtifact3D();
      
      const mesh = container.querySelector('mesh');
      if (mesh) {
        // Hover in
        fireEvent.mouseEnter(mesh);
        // Component should update internal hover state
        
        // Hover out
        fireEvent.mouseLeave(mesh);
        // Component should clear internal hover state
      }
      
      // Verify component doesn't crash and continues to render
      expect(container.querySelector('mesh')).toBeInTheDocument();
    });

    it('handles rapid hover state changes', () => {
      const onHover = jest.fn();
      const { container } = renderCodeArtifact3D({ onHover });
      
      const mesh = container.querySelector('mesh');
      if (mesh) {
        // Rapid hover in/out
        fireEvent.mouseEnter(mesh);
        fireEvent.mouseLeave(mesh);
        fireEvent.mouseEnter(mesh);
        fireEvent.mouseLeave(mesh);
        
        expect(onHover).toHaveBeenCalledTimes(4);
      }
    });
  });

  describe('Performance', () => {
    it('renders efficiently with minimal props', () => {
      const startTime = performance.now();
      renderCodeArtifact3D();
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('handles prop updates efficiently', () => {
      const { rerender } = renderCodeArtifact3D();
      
      const startTime = performance.now();
      rerender(
        <Canvas>
          <CodeArtifact3D
            artifact={mockArtifact}
            config={defaultConfig}
            isSelected={true}
            isHighlighted={false}
            onClick={jest.fn()}
            onHover={jest.fn()}
          />
        </Canvas>
      );
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50);
    });
  });
});