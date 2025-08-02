import React from 'react';
import { render, screen } from '@testing-library/react';
import { Vector3 } from 'three';
import Scene3D from '../CodeArchaeology/Scene3D';
import { CodeArtifact, VisualizationConfig } from '../CodeArchaeology/types';

// Additional test-specific mocks

// Mock the child components
jest.mock('../CodeArchaeology/CodeArtifact3D', () => {
  return function MockCodeArtifact3D({ artifact, onClick, onHover, isSelected, isHighlighted }: any) {
    return (
      <div
        data-testid={`artifact-${artifact.id}`}
        data-selected={isSelected}
        data-highlighted={isHighlighted}
        onClick={() => onClick?.(artifact)}
        onMouseEnter={() => onHover?.(artifact)}
        onMouseLeave={() => onHover?.(null)}
      >
        {artifact.name}
      </div>
    );
  };
});

jest.mock('../CodeArchaeology/DependencyLines', () => {
  return function MockDependencyLines({ connections }: any) {
    return (
      <div data-testid="dependency-lines" data-connection-count={connections.length}>
        {connections.map((conn: any, index: number) => (
          <div key={index} data-testid={`connection-${index}`} />
        ))}
      </div>
    );
  };
});

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
  {
    id: 'function1',
    filePath: '/src/utils/helper.ts',
    type: 'function',
    name: 'helperFunction',
    position3D: new Vector3(-2, 0, 0),
    complexity: 2,
    changeFrequency: 1,
    lastModified: new Date('2023-01-03'),
    authors: ['bob.wilson'],
    dependencies: [],
    size: 50,
  },
];

const defaultConfig: VisualizationConfig = {
  showDependencies: true,
  showComplexity: true,
  showChangeFrequency: true,
};

const renderScene3D = (props: Partial<React.ComponentProps<typeof Scene3D>> = {}) => {
  const defaultProps = {
    artifacts: mockArtifacts,
    config: defaultConfig,
    onArtifactSelect: jest.fn(),
    onCameraChange: jest.fn(),
  };

  return render(
    <div data-testid="canvas">
      <Scene3D {...defaultProps} {...props} />
    </div>
  );
};

describe('Scene3D Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all artifacts', () => {
    renderScene3D();
    
    expect(screen.getByTestId('artifact-file1')).toBeInTheDocument();
    expect(screen.getByTestId('artifact-class1')).toBeInTheDocument();
    expect(screen.getByTestId('artifact-function1')).toBeInTheDocument();
  });

  it('filters artifacts by type when configured', () => {
    const config = {
      ...defaultConfig,
      filterByType: ['file' as const],
    };

    renderScene3D({ config });
    
    expect(screen.getByTestId('artifact-file1')).toBeInTheDocument();
    expect(screen.queryByTestId('artifact-class1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('artifact-function1')).not.toBeInTheDocument();
  });

  it('filters artifacts by author when configured', () => {
    const config = {
      ...defaultConfig,
      filterByAuthor: ['john.doe'],
    };

    renderScene3D({ config });
    
    expect(screen.getByTestId('artifact-file1')).toBeInTheDocument();
    expect(screen.queryByTestId('artifact-class1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('artifact-function1')).not.toBeInTheDocument();
  });

  it('shows dependency lines when enabled', () => {
    renderScene3D();
    
    const dependencyLines = screen.getByTestId('dependency-lines');
    expect(dependencyLines).toBeInTheDocument();
    expect(dependencyLines).toHaveAttribute('data-connection-count', '1'); // file1 -> class1
  });

  it('hides dependency lines when disabled', () => {
    const config = {
      ...defaultConfig,
      showDependencies: false,
    };

    renderScene3D({ config });
    
    const dependencyLines = screen.getByTestId('dependency-lines');
    expect(dependencyLines).toHaveAttribute('data-connection-count', '0');
  });

  it('handles artifact selection', () => {
    const onArtifactSelect = jest.fn();
    renderScene3D({ onArtifactSelect });
    
    const artifact = screen.getByTestId('artifact-file1');
    fireEvent.click(artifact);
    
    expect(onArtifactSelect).toHaveBeenCalledWith(mockArtifacts[0]);
  });

  it('handles artifact hover', () => {
    renderScene3D();
    
    const artifact = screen.getByTestId('artifact-file1');
    
    // Test hover in
    fireEvent.mouseEnter(artifact);
    expect(artifact).toHaveAttribute('data-highlighted', 'true');
    
    // Test hover out
    fireEvent.mouseLeave(artifact);
    expect(artifact).toHaveAttribute('data-highlighted', 'false');
  });

  it('maintains selection state', () => {
    renderScene3D();
    
    const artifact = screen.getByTestId('artifact-file1');
    fireEvent.click(artifact);
    
    expect(artifact).toHaveAttribute('data-selected', 'true');
  });

  it('renders ground plane and grid helper', () => {
    const { container } = renderScene3D();
    
    // Check for mesh elements (ground plane and grid would be rendered as mesh elements)
    const meshElements = container.querySelectorAll('mesh');
    expect(meshElements.length).toBeGreaterThan(0);
  });

  it('handles empty artifacts array', () => {
    renderScene3D({ artifacts: [] });
    
    expect(screen.queryByTestId(/artifact-/)).not.toBeInTheDocument();
    
    const dependencyLines = screen.getByTestId('dependency-lines');
    expect(dependencyLines).toHaveAttribute('data-connection-count', '0');
  });

  it('handles artifacts without dependencies', () => {
    const artifactsWithoutDeps = mockArtifacts.map(artifact => ({
      ...artifact,
      dependencies: [],
    }));

    renderScene3D({ artifacts: artifactsWithoutDeps });
    
    const dependencyLines = screen.getByTestId('dependency-lines');
    expect(dependencyLines).toHaveAttribute('data-connection-count', '0');
  });
});

describe('Scene3D Performance', () => {
  it('handles large number of artifacts efficiently', () => {
    const largeArtifactSet = Array.from({ length: 100 }, (_, index) => ({
      id: `artifact-${index}`,
      filePath: `/src/file${index}.ts`,
      type: 'file' as const,
      name: `File${index}`,
      position3D: new Vector3(index % 10, Math.floor(index / 10), 0),
      complexity: Math.random() * 10,
      changeFrequency: Math.random() * 10,
      lastModified: new Date(),
      authors: [`author${index % 5}`],
      dependencies: [],
      size: 100,
    }));

    const startTime = performance.now();
    renderScene3D({ artifacts: largeArtifactSet });
    const endTime = performance.now();
    
    // Should render within reasonable time (less than 1 second)
    expect(endTime - startTime).toBeLessThan(1000);
  });

  it('efficiently updates when configuration changes', () => {
    const { rerender } = renderScene3D();
    
    const newConfig = {
      ...defaultConfig,
      showDependencies: false,
    };

    const startTime = performance.now();
    rerender(
      <Canvas>
        <Scene3D
          artifacts={mockArtifacts}
          config={newConfig}
          onArtifactSelect={jest.fn()}
          onCameraChange={jest.fn()}
        />
      </Canvas>
    );
    const endTime = performance.now();
    
    // Configuration updates should be fast
    expect(endTime - startTime).toBeLessThan(100);
  });
});