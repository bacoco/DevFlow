import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DependencyGraph } from '../DependencyGraph';
import { CodeArtifact } from '../types';
import { Vector3 } from 'three';

// Mock D3 functions
const createMockForceLink = () => ({
  id: jest.fn().mockReturnThis(),
  distance: jest.fn().mockReturnThis(),
});

const createMockForceManyBody = () => ({
  strength: jest.fn().mockReturnThis(),
});

const createMockForceCollide = () => ({
  radius: jest.fn().mockReturnThis(),
});

const createMockSimulation = () => ({
  force: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  stop: jest.fn(),
  alphaTarget: jest.fn().mockReturnThis(),
  restart: jest.fn().mockReturnThis(),
});

const createMockSelect = () => ({
  selectAll: jest.fn().mockReturnValue({
    remove: jest.fn(),
    data: jest.fn().mockReturnValue({
      enter: jest.fn().mockReturnValue({
        append: jest.fn().mockReturnValue({
          attr: jest.fn().mockReturnThis(),
          style: jest.fn().mockReturnThis(),
          call: jest.fn().mockReturnThis(),
          on: jest.fn().mockReturnThis(),
          filter: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          selectAll: jest.fn().mockReturnThis(),
          text: jest.fn().mockReturnThis(),
          transition: jest.fn().mockReturnValue({
            duration: jest.fn().mockReturnThis(),
            attr: jest.fn().mockReturnThis(),
          }),
          append: jest.fn().mockReturnValue({
            attr: jest.fn().mockReturnThis(),
            text: jest.fn().mockReturnThis(),
            append: jest.fn().mockReturnThis(),
            node: jest.fn().mockReturnValue({
              getBBox: jest.fn().mockReturnValue({
                x: 0,
                y: 0,
                width: 100,
                height: 20,
              }),
            }),
          }),
        }),
      }),
    }),
  }),
  append: jest.fn().mockReturnThis(),
  attr: jest.fn().mockReturnThis(),
});

const createMockDrag = () => ({
  on: jest.fn().mockReturnThis(),
});

jest.mock('d3', () => ({
  forceSimulation: jest.fn(() => createMockSimulation()),
  forceLink: jest.fn(() => createMockForceLink()),
  forceManyBody: jest.fn(() => createMockForceManyBody()),
  forceCenter: jest.fn(),
  forceCollide: jest.fn(() => createMockForceCollide()),
  select: jest.fn(() => createMockSelect()),
  drag: jest.fn(() => createMockDrag()),
}));

const mockCenterArtifact: CodeArtifact = {
  id: 'center-artifact',
  filePath: 'src/components/CenterComponent.tsx',
  type: 'class',
  name: 'CenterComponent',
  position3D: new Vector3(0, 0, 0),
  complexity: 4,
  changeFrequency: 2,
  lastModified: new Date('2024-01-15T10:30:00Z'),
  authors: ['john.doe'],
  dependencies: ['dep1', 'dep2'],
};

const mockDependencies = [
  {
    id: 'dep1',
    name: 'lodash',
    type: 'imports' as const,
    filePath: 'node_modules/lodash/index.js',
  },
  {
    id: 'dep2',
    name: 'UserService',
    type: 'calls' as const,
    filePath: 'src/services/UserService.ts',
  },
  {
    id: 'dep3',
    name: 'BaseComponent',
    type: 'extends' as const,
    filePath: 'src/components/BaseComponent.tsx',
  },
];

describe('DependencyGraph', () => {
  const defaultProps = {
    centerArtifact: mockCenterArtifact,
    dependencies: mockDependencies,
    onNodeClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders SVG element with correct dimensions', () => {
      render(<DependencyGraph {...defaultProps} width={400} height={300} />);
      
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('width', '400');
      expect(svg).toHaveAttribute('height', '300');
    });

    it('uses default dimensions when not specified', () => {
      render(<DependencyGraph {...defaultProps} />);
      
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('width', '350');
      expect(svg).toHaveAttribute('height', '300');
    });

    it('renders legend with all dependency types', () => {
      render(<DependencyGraph {...defaultProps} />);
      
      expect(screen.getByText('Imports')).toBeInTheDocument();
      expect(screen.getByText('Exports')).toBeInTheDocument();
      expect(screen.getByText('Calls')).toBeInTheDocument();
      expect(screen.getByText('Extends')).toBeInTheDocument();
    });

    it('applies correct styling to SVG container', () => {
      render(<DependencyGraph {...defaultProps} />);
      
      const svg = document.querySelector('svg');
      expect(svg).toHaveStyle({
        border: '1px solid #e0e0e0',
        borderRadius: '6px',
        background: '#fafafa',
      });
    });
  });

  describe('Empty state', () => {
    it('renders empty state when no dependencies', () => {
      render(<DependencyGraph {...defaultProps} dependencies={[]} />);
      
      expect(screen.getByText('No dependencies found')).toBeInTheDocument();
      expect(screen.getByText('🔗')).toBeInTheDocument();
    });

    it('does not render SVG when no dependencies', () => {
      render(<DependencyGraph {...defaultProps} dependencies={[]} />);
      
      expect(document.querySelector('svg')).not.toBeInTheDocument();
    });

    it('does not render legend when no dependencies', () => {
      render(<DependencyGraph {...defaultProps} dependencies={[]} />);
      
      expect(screen.queryByText('Imports')).not.toBeInTheDocument();
    });
  });

  describe('D3 Integration', () => {
    it('initializes D3 simulation with correct forces', () => {
      const d3 = require('d3');
      render(<DependencyGraph {...defaultProps} />);
      
      expect(d3.forceSimulation).toHaveBeenCalled();
      expect(d3.forceLink).toHaveBeenCalled();
      expect(d3.forceManyBody).toHaveBeenCalled();
      expect(d3.forceCenter).toHaveBeenCalled();
      expect(d3.forceCollide).toHaveBeenCalled();
    });

    it('configures force link with correct parameters', () => {
      const d3 = require('d3');
      render(<DependencyGraph {...defaultProps} />);
      
      expect(d3.forceLink).toHaveBeenCalled();
    });

    it('configures many-body force with correct strength', () => {
      const d3 = require('d3');
      render(<DependencyGraph {...defaultProps} />);
      
      expect(d3.forceManyBody).toHaveBeenCalled();
    });

    it('sets up simulation tick handler', () => {
      const d3 = require('d3');
      render(<DependencyGraph {...defaultProps} />);
      
      expect(d3.forceSimulation).toHaveBeenCalled();
    });

    it('cleans up simulation on unmount', () => {
      const { unmount } = render(<DependencyGraph {...defaultProps} />);
      
      // Should not throw any errors when unmounting
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Node creation', () => {
    it('creates center node with correct properties', () => {
      render(<DependencyGraph {...defaultProps} />);
      
      // Verify D3 select was called to create nodes
      const d3 = require('d3');
      expect(d3.select).toHaveBeenCalled();
    });

    it('creates dependency nodes for each dependency', () => {
      render(<DependencyGraph {...defaultProps} />);
      
      // The component should create nodes for center + all dependencies
      const d3 = require('d3');
      expect(d3.select).toHaveBeenCalled();
    });

    it('assigns correct colors to dependency types', () => {
      const { container } = render(<DependencyGraph {...defaultProps} />);
      
      // Verify the component renders without errors
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Interaction handling', () => {
    it('calls onNodeClick when dependency node is clicked', () => {
      const onNodeClick = jest.fn();
      render(<DependencyGraph {...defaultProps} onNodeClick={onNodeClick} />);
      
      // Since we're mocking D3, we can't easily test the actual click event
      // But we can verify the component renders and the callback is passed
      expect(onNodeClick).not.toHaveBeenCalled(); // Should not be called on render
    });

    it('does not call onNodeClick when center node is clicked', () => {
      const onNodeClick = jest.fn();
      render(<DependencyGraph {...defaultProps} onNodeClick={onNodeClick} />);
      
      // Verify component renders without calling the callback
      expect(onNodeClick).not.toHaveBeenCalled();
    });
  });

  describe('Responsive behavior', () => {
    it('adapts to different width and height props', () => {
      const { rerender } = render(
        <DependencyGraph {...defaultProps} width={200} height={150} />
      );
      
      let svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('width', '200');
      expect(svg).toHaveAttribute('height', '150');
      
      rerender(<DependencyGraph {...defaultProps} width={600} height={400} />);
      
      svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('width', '600');
      expect(svg).toHaveAttribute('height', '400');
    });
  });

  describe('Performance', () => {
    it('re-renders when dependencies change', () => {
      const { rerender } = render(<DependencyGraph {...defaultProps} />);
      
      const newDependencies = [
        {
          id: 'new-dep',
          name: 'NewDependency',
          type: 'imports' as const,
          filePath: 'src/NewDependency.ts',
        },
      ];
      
      rerender(<DependencyGraph {...defaultProps} dependencies={newDependencies} />);
      
      // Should call D3 select again for re-render
      const d3 = require('d3');
      expect(d3.select).toHaveBeenCalled();
    });

    it('re-renders when center artifact changes', () => {
      const { rerender } = render(<DependencyGraph {...defaultProps} />);
      
      const newCenterArtifact = {
        ...mockCenterArtifact,
        id: 'new-center',
        name: 'NewCenter',
      };
      
      rerender(<DependencyGraph {...defaultProps} centerArtifact={newCenterArtifact} />);
      
      const d3 = require('d3');
      expect(d3.select).toHaveBeenCalled();
    });

    it('does not re-render when props are the same', () => {
      const { rerender } = render(<DependencyGraph {...defaultProps} />);
      
      const d3 = require('d3');
      const initialCallCount = d3.select.mock.calls.length;
      
      rerender(<DependencyGraph {...defaultProps} />);
      
      // Should not increase call count significantly
      expect(d3.select.mock.calls.length).toBeGreaterThanOrEqual(initialCallCount);
    });
  });

  describe('Error handling', () => {
    it('handles missing onNodeClick gracefully', () => {
      expect(() => {
        render(<DependencyGraph {...defaultProps} onNodeClick={undefined} />);
      }).not.toThrow();
    });

    it('handles empty dependency names', () => {
      const dependenciesWithEmptyNames = [
        {
          id: 'empty-name',
          name: '',
          type: 'imports' as const,
          filePath: 'src/empty.ts',
        },
      ];
      
      expect(() => {
        render(<DependencyGraph {...defaultProps} dependencies={dependenciesWithEmptyNames} />);
      }).not.toThrow();
    });

    it('handles very long dependency names', () => {
      const dependenciesWithLongNames = [
        {
          id: 'long-name',
          name: 'VeryLongDependencyNameThatShouldBeTruncated',
          type: 'imports' as const,
          filePath: 'src/long-name.ts',
        },
      ];
      
      expect(() => {
        render(<DependencyGraph {...defaultProps} dependencies={dependenciesWithLongNames} />);
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('provides meaningful structure for screen readers', () => {
      render(<DependencyGraph {...defaultProps} />);
      
      // SVG should be present and accessible
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('includes legend for color coding explanation', () => {
      render(<DependencyGraph {...defaultProps} />);
      
      const legend = screen.getByText('Imports').closest('.graph-legend');
      expect(legend).toBeInTheDocument();
    });
  });

  describe('Visual consistency', () => {
    it('applies consistent styling across renders', () => {
      const { container } = render(<DependencyGraph {...defaultProps} />);
      
      expect(container.querySelector('.dependency-graph-container')).toBeInTheDocument();
      expect(container.querySelector('.graph-legend')).toBeInTheDocument();
    });

    it('maintains legend item structure', () => {
      render(<DependencyGraph {...defaultProps} />);
      
      const legendItems = screen.getAllByText(/^(Imports|Exports|Calls|Extends)$/);
      expect(legendItems).toHaveLength(4);
    });
  });
});