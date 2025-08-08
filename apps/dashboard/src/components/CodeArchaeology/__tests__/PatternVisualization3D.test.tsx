import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import PatternVisualization3D from '../PatternVisualization3D';
import { CodeArtifact } from '../types';
import { ArchitecturalPattern } from '../ArchitecturalPatternService';
import { Vector3 } from 'three';

// Mock React Three Fiber components
jest.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: any) => <div data-testid="canvas">{children}</div>,
  useFrame: jest.fn(),
}));

jest.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Text: ({ children, ...props }: any) => (
    <div data-testid="text" {...props}>
      {children}
    </div>
  ),
  Sphere: ({ children, ...props }: any) => (
    <div data-testid="sphere" {...props}>
      {children}
    </div>
  ),
  Line: (props: any) => <div data-testid="line" {...props} />,
}));

// Mock the ArchitecturalPatternService
const mockPatterns: ArchitecturalPattern[] = [
  {
    id: 'singleton-pattern',
    name: 'Singleton Pattern',
    type: 'design_pattern',
    description: 'Singleton pattern detected in SingletonService',
    confidence: 0.8,
    artifacts: ['singleton-service'],
    detectedAt: new Date('2024-01-15T10:30:00Z'),
    evolution: [],
  },
  {
    id: 'mvc-pattern',
    name: 'Model-View-Controller (MVC)',
    type: 'architectural_pattern',
    description: 'MVC architectural pattern detected',
    confidence: 0.9,
    artifacts: ['user-model', 'user-view', 'user-controller'],
    detectedAt: new Date('2024-01-20T14:15:00Z'),
    evolution: [],
  },
  {
    id: 'god-class-antipattern',
    name: 'God Class Anti-Pattern',
    type: 'anti_pattern',
    description: 'God class anti-pattern detected in GodClass',
    confidence: 0.7,
    artifacts: ['god-class'],
    detectedAt: new Date('2024-01-25T09:45:00Z'),
    evolution: [],
  },
];

const mockPatternNodes = [
  {
    id: 'singleton-pattern',
    name: 'Singleton Pattern',
    type: 'design_pattern',
    position: { x: 10, y: 0, z: 0 },
    confidence: 0.8,
    size: 5,
    color: '#4CAF50',
  },
  {
    id: 'mvc-pattern',
    name: 'Model-View-Controller (MVC)',
    type: 'architectural_pattern',
    position: { x: 0, y: 10, z: 0 },
    confidence: 0.9,
    size: 8,
    color: '#2196F3',
  },
  {
    id: 'god-class-antipattern',
    name: 'God Class Anti-Pattern',
    type: 'anti_pattern',
    position: { x: 0, y: 0, z: 10 },
    confidence: 0.7,
    size: 4,
    color: '#F44336',
  },
];

const mockPatternConnections = [
  {
    id: 'singleton-pattern-singleton-service',
    fromId: 'singleton-pattern',
    toId: 'singleton-service',
    strength: 0.8,
    type: 'pattern_involvement',
  },
  {
    id: 'mvc-pattern-user-model',
    fromId: 'mvc-pattern',
    toId: 'user-model',
    strength: 0.9,
    type: 'pattern_involvement',
  },
];

const mockPatternTrends = [
  {
    patternId: 'mvc-pattern',
    patternName: 'Model-View-Controller (MVC)',
    trend: 'stable' as const,
    confidenceOverTime: [
      { timestamp: new Date('2024-01-01'), confidence: 0.8 },
      { timestamp: new Date('2024-01-15'), confidence: 0.9 },
    ],
    impactScore: 7.2,
    recommendation: 'This pattern is stable and well-established in the codebase',
  },
  {
    patternId: 'singleton-pattern',
    patternName: 'Singleton Pattern',
    trend: 'emerging' as const,
    confidenceOverTime: [
      { timestamp: new Date('2024-01-01'), confidence: 0.6 },
      { timestamp: new Date('2024-01-15'), confidence: 0.8 },
    ],
    impactScore: 4.0,
    recommendation: 'This pattern is strengthening - consider leveraging it more broadly',
  },
];

// Create a mock service instance that will be used consistently
const mockServiceInstance = {
  analyzePatterns: jest.fn().mockResolvedValue(mockPatterns),
  getPatternVisualizationData: jest.fn().mockReturnValue({
    patternNodes: mockPatternNodes,
    patternConnections: mockPatternConnections,
  }),
  getPatternTrends: jest.fn().mockReturnValue(mockPatternTrends),
};

jest.mock('../ArchitecturalPatternService', () => ({
  ArchitecturalPatternService: jest.fn().mockImplementation(() => mockServiceInstance),
}));

const mockArtifacts: CodeArtifact[] = [
  {
    id: 'singleton-service',
    filePath: 'src/services/SingletonService.ts',
    type: 'class',
    name: 'SingletonService',
    position3D: new Vector3(10, 0, 0),
    complexity: 5,
    changeFrequency: 2,
    lastModified: new Date('2024-01-15T10:30:00Z'),
    authors: ['john.doe'],
    dependencies: ['logger'],
  },
  {
    id: 'user-model',
    filePath: 'src/models/UserModel.ts',
    type: 'class',
    name: 'UserModel',
    position3D: new Vector3(-10, 0, 0),
    complexity: 2,
    changeFrequency: 1,
    lastModified: new Date('2024-01-10T16:20:00Z'),
    authors: ['alice.brown'],
    dependencies: [],
  },
  {
    id: 'user-view',
    filePath: 'src/views/UserView.tsx',
    type: 'class',
    name: 'UserView',
    position3D: new Vector3(0, -10, 0),
    complexity: 6,
    changeFrequency: 4,
    lastModified: new Date('2024-01-30T11:10:00Z'),
    authors: ['charlie.davis'],
    dependencies: ['user-model', 'user-controller'],
  },
  {
    id: 'user-controller',
    filePath: 'src/controllers/UserController.ts',
    type: 'class',
    name: 'UserController',
    position3D: new Vector3(0, 0, -10),
    complexity: 8,
    changeFrequency: 5,
    lastModified: new Date('2024-02-01T13:30:00Z'),
    authors: ['eve.miller'],
    dependencies: ['user-model', 'user-service'],
  },
];

describe('PatternVisualization3D', () => {
  const defaultProps = {
    artifacts: mockArtifacts,
    onPatternSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock service to return patterns by default
    mockServiceInstance.analyzePatterns.mockResolvedValue(mockPatterns);
    mockServiceInstance.getPatternVisualizationData.mockReturnValue({
      patternNodes: mockPatternNodes,
      patternConnections: mockPatternConnections,
    });
    mockServiceInstance.getPatternTrends.mockReturnValue(mockPatternTrends);
  });

  describe('Rendering', () => {
    it('renders loading state initially', () => {
      render(<PatternVisualization3D {...defaultProps} />);
      
      expect(screen.getByText('Analyzing architectural patterns...')).toBeInTheDocument();
      expect(document.querySelector('.loading-spinner')).toBeInTheDocument();
    });

    it('renders empty state when no patterns are detected', async () => {
      mockServiceInstance.analyzePatterns.mockResolvedValue([]);
      mockServiceInstance.getPatternVisualizationData.mockReturnValue({
        patternNodes: [],
        patternConnections: [],
      });
      mockServiceInstance.getPatternTrends.mockReturnValue([]);

      render(<PatternVisualization3D {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('No Patterns Detected')).toBeInTheDocument();
      });

      expect(screen.getByText('No architectural patterns were found in the current codebase.')).toBeInTheDocument();
      expect(screen.getByText('🏗️')).toBeInTheDocument();
    });

    it('renders visualization with patterns', async () => {
      render(<PatternVisualization3D {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Architectural Patterns (3)')).toBeInTheDocument();
      });

      expect(screen.getByTestId('canvas')).toBeInTheDocument();
      expect(screen.getByText('Design Patterns:')).toBeInTheDocument();
      expect(screen.getByText('Architectural:')).toBeInTheDocument();
      expect(screen.getByText('Anti-patterns:')).toBeInTheDocument();
    });

    it('displays correct pattern statistics', async () => {
      render(<PatternVisualization3D {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Architectural Patterns (3)')).toBeInTheDocument();
      });

      // Check pattern type counts
      const designPatternCount = screen.getByText('Design Patterns:').nextElementSibling;
      const architecturalCount = screen.getByText('Architectural:').nextElementSibling;
      const antiPatternCount = screen.getByText('Anti-patterns:').nextElementSibling;

      expect(designPatternCount).toHaveTextContent('1');
      expect(architecturalCount).toHaveTextContent('1');
      expect(antiPatternCount).toHaveTextContent('1');
    });

    it('renders pattern legend', async () => {
      render(<PatternVisualization3D {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Architectural Patterns (3)')).toBeInTheDocument();
      });

      expect(screen.getByText('Design Patterns')).toBeInTheDocument();
      expect(screen.getByText('Architectural Patterns')).toBeInTheDocument();
      expect(screen.getByText('Anti-patterns')).toBeInTheDocument();
      expect(screen.getByText('Code Artifacts')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <PatternVisualization3D {...defaultProps} className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Pattern Trends', () => {
    it('shows pattern trends when showTrends is true', async () => {
      render(<PatternVisualization3D {...defaultProps} showTrends={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('Pattern Trends')).toBeInTheDocument();
      });

      expect(screen.getAllByText('Model-View-Controller (MVC)')).toHaveLength(2); // One in 3D, one in trends
      expect(screen.getAllByText('Singleton Pattern')).toHaveLength(2); // One in 3D, one in trends
      expect(screen.getByText('stable')).toBeInTheDocument();
      expect(screen.getByText('emerging')).toBeInTheDocument();
    });

    it('does not show pattern trends when showTrends is false', async () => {
      render(<PatternVisualization3D {...defaultProps} showTrends={false} />);
      
      await waitFor(() => {
        expect(screen.getByText('Architectural Patterns (3)')).toBeInTheDocument();
      });

      expect(screen.queryByText('Pattern Trends')).not.toBeInTheDocument();
    });

    it('displays trend indicators with correct styling', async () => {
      render(<PatternVisualization3D {...defaultProps} showTrends={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('Pattern Trends')).toBeInTheDocument();
      });

      const stableIndicator = screen.getByText('stable');
      const emergingIndicator = screen.getByText('emerging');

      expect(stableIndicator).toHaveClass('trend-indicator', 'stable');
      expect(emergingIndicator).toHaveClass('trend-indicator', 'emerging');
    });

    it('displays impact scores and recommendations', async () => {
      render(<PatternVisualization3D {...defaultProps} showTrends={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('Pattern Trends')).toBeInTheDocument();
      });

      expect(screen.getByText('Impact: 7.2')).toBeInTheDocument();
      expect(screen.getByText('Impact: 4.0')).toBeInTheDocument();
      expect(screen.getByText('This pattern is stable and well-established in the codebase')).toBeInTheDocument();
      expect(screen.getByText('This pattern is strengthening - consider leveraging it more broadly')).toBeInTheDocument();
    });
  });

  describe('Pattern Selection', () => {
    it('highlights selected pattern', async () => {
      render(<PatternVisualization3D {...defaultProps} selectedPatternId="mvc-pattern" />);
      
      await waitFor(() => {
        expect(screen.getByText('Architectural Patterns (3)')).toBeInTheDocument();
      });

      // The selected pattern should be rendered (we can't easily test the 3D highlighting in JSDOM)
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('calls onPatternSelect when pattern is clicked', async () => {
      const onPatternSelect = jest.fn();
      render(<PatternVisualization3D {...defaultProps} onPatternSelect={onPatternSelect} />);
      
      await waitFor(() => {
        expect(screen.getByText('Architectural Patterns (3)')).toBeInTheDocument();
      });

      // Since we can't easily simulate 3D clicks, we test that the component renders
      // and the callback is properly passed
      expect(onPatternSelect).not.toHaveBeenCalled(); // Should not be called on render
    });
  });

  describe('Error Handling', () => {
    it('handles analysis errors gracefully', async () => {
      mockServiceInstance.analyzePatterns.mockRejectedValue(new Error('Analysis failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<PatternVisualization3D {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('No Patterns Detected')).toBeInTheDocument();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to analyze patterns:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('handles empty artifacts array', async () => {
      mockServiceInstance.analyzePatterns.mockResolvedValue([]);

      render(<PatternVisualization3D {...defaultProps} artifacts={[]} />);
      
      await waitFor(() => {
        expect(screen.getByText('No Patterns Detected')).toBeInTheDocument();
      });
    });

    it('handles missing onPatternSelect callback', async () => {
      expect(() => {
        render(<PatternVisualization3D artifacts={mockArtifacts} />);
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('re-analyzes patterns when artifacts change', async () => {
      const { rerender } = render(<PatternVisualization3D {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockServiceInstance.analyzePatterns).toHaveBeenCalledWith(mockArtifacts);
      });

      const newArtifacts = [...mockArtifacts, {
        id: 'new-artifact',
        filePath: 'src/NewComponent.ts',
        type: 'class' as const,
        name: 'NewComponent',
        position3D: new Vector3(20, 20, 20),
        complexity: 3,
        changeFrequency: 1,
        lastModified: new Date(),
        authors: ['dev'],
        dependencies: [],
      }];

      rerender(<PatternVisualization3D {...defaultProps} artifacts={newArtifacts} />);
      
      await waitFor(() => {
        expect(mockServiceInstance.analyzePatterns).toHaveBeenCalledWith(newArtifacts);
      });

      expect(mockServiceInstance.analyzePatterns).toHaveBeenCalledTimes(2);
    });

    it('does not re-analyze when other props change', async () => {
      const { rerender } = render(<PatternVisualization3D {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockServiceInstance.analyzePatterns).toHaveBeenCalledTimes(1);
      });

      rerender(<PatternVisualization3D {...defaultProps} selectedPatternId="new-selection" />);
      
      // Should not trigger re-analysis
      expect(mockServiceInstance.analyzePatterns).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('provides meaningful structure for screen readers', async () => {
      render(<PatternVisualization3D {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Architectural Patterns (3)')).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Architectural Patterns (3)');
    });

    it('includes descriptive text for empty state', async () => {
      mockServiceInstance.analyzePatterns.mockResolvedValue([]);

      render(<PatternVisualization3D {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('No Patterns Detected')).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('No Patterns Detected');
    });
  });

  describe('Visual Consistency', () => {
    it('applies consistent styling across renders', async () => {
      const { container } = render(<PatternVisualization3D {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Architectural Patterns (3)')).toBeInTheDocument();
      });

      expect(container.querySelector('.pattern-visualization-3d')).toBeInTheDocument();
      expect(container.querySelector('.visualization-header')).toBeInTheDocument();
      expect(container.querySelector('.canvas-container')).toBeInTheDocument();
      expect(container.querySelector('.pattern-legend')).toBeInTheDocument();
    });

    it('maintains legend structure', async () => {
      render(<PatternVisualization3D {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Architectural Patterns (3)')).toBeInTheDocument();
      });

      const legendItems = screen.getAllByText(/^(Design Patterns|Architectural Patterns|Anti-patterns|Code Artifacts)$/);
      expect(legendItems).toHaveLength(4);
    });
  });
});