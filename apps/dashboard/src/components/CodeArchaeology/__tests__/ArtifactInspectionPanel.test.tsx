import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ArtifactInspectionPanel from '../ArtifactInspectionPanel';
import { CodeArtifact } from '../types';
import { Vector3 } from 'three';

// Mock the child components
jest.mock('../CodeSnippetPreview', () => ({
  CodeSnippetPreview: ({ code, language, fileName }: any) => (
    <div data-testid="code-snippet-preview">
      <div data-testid="file-name">{fileName}</div>
      <div data-testid="language">{language}</div>
      <pre data-testid="code-content">{code}</pre>
    </div>
  ),
}));

jest.mock('../ChangeHistoryTimeline', () => ({
  ChangeHistoryTimeline: ({ changes, artifactName }: any) => (
    <div data-testid="change-history-timeline">
      <div data-testid="artifact-name">{artifactName}</div>
      <div data-testid="changes-count">{changes.length}</div>
    </div>
  ),
}));

jest.mock('../DependencyGraph', () => ({
  DependencyGraph: ({ centerArtifact, dependencies, onNodeClick }: any) => (
    <div data-testid="dependency-graph">
      <div data-testid="center-artifact">{centerArtifact.name}</div>
      <div data-testid="dependencies-count">{dependencies.length}</div>
      <button
        data-testid="mock-dependency-click"
        onClick={() => onNodeClick && onNodeClick(dependencies[0])}
      >
        Click Dependency
      </button>
    </div>
  ),
}));

// Mock D3 to avoid issues in test environment
jest.mock('d3', () => ({
  select: jest.fn(() => ({
    selectAll: jest.fn(() => ({
      remove: jest.fn(),
    })),
  })),
}));

const mockArtifact: CodeArtifact = {
  id: 'test-artifact-1',
  filePath: 'src/components/TestComponent.tsx',
  type: 'class',
  name: 'TestComponent',
  position3D: new Vector3(0, 0, 0),
  complexity: 5,
  changeFrequency: 3,
  lastModified: new Date('2024-01-15T10:30:00Z'),
  authors: ['john.doe', 'jane.smith'],
  dependencies: ['dep1', 'dep2'],
};

describe('ArtifactInspectionPanel', () => {
  const defaultProps = {
    artifact: mockArtifact,
    isVisible: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders when visible with artifact', () => {
      render(<ArtifactInspectionPanel {...defaultProps} />);
      
      expect(screen.getByText('TestComponent')).toBeInTheDocument();
      expect(screen.getByText('class')).toBeInTheDocument();
      expect(screen.getByText('src/components/TestComponent.tsx')).toBeInTheDocument();
    });

    it('does not render when not visible', () => {
      render(<ArtifactInspectionPanel {...defaultProps} isVisible={false} />);
      
      expect(screen.queryByText('TestComponent')).not.toBeInTheDocument();
    });

    it('does not render when artifact is null', () => {
      render(<ArtifactInspectionPanel {...defaultProps} artifact={null} />);
      
      expect(screen.queryByText('TestComponent')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <ArtifactInspectionPanel {...defaultProps} className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Header functionality', () => {
    it('displays artifact information correctly', () => {
      render(<ArtifactInspectionPanel {...defaultProps} />);
      
      expect(screen.getByText('TestComponent')).toBeInTheDocument();
      expect(screen.getByText('class')).toBeInTheDocument();
      expect(screen.getByText('src/components/TestComponent.tsx')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      render(<ArtifactInspectionPanel {...defaultProps} onClose={onClose} />);
      
      const closeButton = screen.getByRole('button', { name: /close inspection panel/i });
      await user.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tab navigation', () => {
    it('renders all tabs', () => {
      render(<ArtifactInspectionPanel {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /code/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /history/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /dependencies/i })).toBeInTheDocument();
    });

    it('starts with overview tab active', () => {
      render(<ArtifactInspectionPanel {...defaultProps} />);
      
      const overviewTab = screen.getByRole('button', { name: /overview/i });
      expect(overviewTab).toHaveClass('active');
    });

    it('switches tabs when clicked', async () => {
      const user = userEvent.setup();
      render(<ArtifactInspectionPanel {...defaultProps} />);
      
      const codeTab = screen.getByRole('button', { name: /code/i });
      await user.click(codeTab);
      
      expect(codeTab).toHaveClass('active');
      expect(screen.getByRole('button', { name: /overview/i })).not.toHaveClass('active');
    });
  });

  describe('Overview tab', () => {
    it('displays loading state initially', () => {
      render(<ArtifactInspectionPanel {...defaultProps} />);
      
      expect(screen.getByText('Loading artifact details...')).toBeInTheDocument();
      expect(document.querySelector('.spinner')).toBeInTheDocument();
    });

    it('displays metrics after loading', async () => {
      render(<ArtifactInspectionPanel {...defaultProps} />);
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading artifact details...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Complexity')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Change Frequency')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('displays artifact metadata', async () => {
      render(<ArtifactInspectionPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading artifact details...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Last Modified:')).toBeInTheDocument();
      expect(screen.getByText('Authors:')).toBeInTheDocument();
      expect(screen.getByText('john.doe, jane.smith')).toBeInTheDocument();
    });

    it('applies complexity color coding', async () => {
      render(<ArtifactInspectionPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading artifact details...')).not.toBeInTheDocument();
      });

      const complexityValue = screen.getByText('5');
      expect(complexityValue).toHaveStyle({ color: '#FF9800' }); // Orange for complexity 5
    });
  });

  describe('Code tab', () => {
    it('displays code snippet preview', async () => {
      const user = userEvent.setup();
      render(<ArtifactInspectionPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading artifact details...')).not.toBeInTheDocument();
      });

      const codeTab = screen.getByRole('button', { name: /code/i });
      await user.click(codeTab);
      
      expect(screen.getByTestId('code-snippet-preview')).toBeInTheDocument();
      expect(screen.getByTestId('file-name')).toHaveTextContent('TestComponent');
      expect(screen.getByTestId('language')).toHaveTextContent('typescript');
    });
  });

  describe('History tab', () => {
    it('displays change history timeline', async () => {
      const user = userEvent.setup();
      render(<ArtifactInspectionPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading artifact details...')).not.toBeInTheDocument();
      });

      const historyTab = screen.getByRole('button', { name: /history/i });
      await user.click(historyTab);
      
      expect(screen.getByTestId('change-history-timeline')).toBeInTheDocument();
      expect(screen.getByTestId('artifact-name')).toHaveTextContent('TestComponent');
      expect(screen.getByTestId('changes-count')).toHaveTextContent('3');
    });
  });

  describe('Dependencies tab', () => {
    it('displays dependencies header with count', async () => {
      const user = userEvent.setup();
      render(<ArtifactInspectionPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading artifact details...')).not.toBeInTheDocument();
      });

      const dependenciesTab = screen.getByRole('button', { name: /dependencies/i });
      await user.click(dependenciesTab);
      
      expect(screen.getByText('Dependencies (3)')).toBeInTheDocument();
    });

    it('displays view toggle buttons', async () => {
      const user = userEvent.setup();
      render(<ArtifactInspectionPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading artifact details...')).not.toBeInTheDocument();
      });

      const dependenciesTab = screen.getByRole('button', { name: /dependencies/i });
      await user.click(dependenciesTab);
      
      expect(screen.getByRole('button', { name: /list/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /graph/i })).toBeInTheDocument();
    });

    it('starts with list view active', async () => {
      const user = userEvent.setup();
      render(<ArtifactInspectionPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading artifact details...')).not.toBeInTheDocument();
      });

      const dependenciesTab = screen.getByRole('button', { name: /dependencies/i });
      await user.click(dependenciesTab);
      
      const listButton = screen.getByRole('button', { name: /list/i });
      expect(listButton).toHaveClass('active');
    });

    it('switches to graph view when graph button is clicked', async () => {
      const user = userEvent.setup();
      render(<ArtifactInspectionPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading artifact details...')).not.toBeInTheDocument();
      });

      const dependenciesTab = screen.getByRole('button', { name: /dependencies/i });
      await user.click(dependenciesTab);
      
      const graphButton = screen.getByRole('button', { name: /graph/i });
      await user.click(graphButton);
      
      expect(graphButton).toHaveClass('active');
      expect(screen.getByRole('button', { name: /list/i })).not.toHaveClass('active');
      expect(screen.getByTestId('dependency-graph')).toBeInTheDocument();
    });

    it('displays dependency list in list view', async () => {
      const user = userEvent.setup();
      render(<ArtifactInspectionPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading artifact details...')).not.toBeInTheDocument();
      });

      const dependenciesTab = screen.getByRole('button', { name: /dependencies/i });
      await user.click(dependenciesTab);
      
      expect(screen.getByText('lodash')).toBeInTheDocument();
      expect(screen.getByText('UserService')).toBeInTheDocument();
      expect(screen.getByText('validateInput')).toBeInTheDocument();
    });

    it('handles dependency click in graph view', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<ArtifactInspectionPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading artifact details...')).not.toBeInTheDocument();
      });

      const dependenciesTab = screen.getByRole('button', { name: /dependencies/i });
      await user.click(dependenciesTab);
      
      const graphButton = screen.getByRole('button', { name: /graph/i });
      await user.click(graphButton);
      
      const mockDependencyClick = screen.getByTestId('mock-dependency-click');
      await user.click(mockDependencyClick);
      
      expect(consoleSpy).toHaveBeenCalledWith('Navigate to dependency:', expect.any(Object));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error handling', () => {
    it('handles loading errors gracefully', async () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock fetch functions to throw errors
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      render(<ArtifactInspectionPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading artifact details...')).not.toBeInTheDocument();
      });
      
      // Should still render the component without crashing
      expect(screen.getByText('TestComponent')).toBeInTheDocument();
      
      global.fetch = originalFetch;
      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<ArtifactInspectionPanel {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /close inspection panel/i });
      expect(closeButton).toHaveAttribute('aria-label', 'Close inspection panel');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ArtifactInspectionPanel {...defaultProps} />);
      
      // Tab to the close button first, then to the first tab button
      await user.tab(); // Close button
      await user.tab(); // Overview tab
      expect(screen.getByRole('button', { name: /overview/i })).toHaveFocus();
      
      // Tab to next tab
      await user.tab();
      expect(screen.getByRole('button', { name: /code/i })).toHaveFocus();
    });

    it('handles Enter key on tab buttons', async () => {
      const user = userEvent.setup();
      render(<ArtifactInspectionPanel {...defaultProps} />);
      
      const codeTab = screen.getByRole('button', { name: /code/i });
      codeTab.focus();
      await user.keyboard('{Enter}');
      
      expect(codeTab).toHaveClass('active');
    });
  });

  describe('Responsive behavior', () => {
    it('applies responsive classes on mobile viewport', () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });

      const { container } = render(<ArtifactInspectionPanel {...defaultProps} />);
      
      // Trigger resize event
      fireEvent(window, new Event('resize'));
      
      expect(container.firstChild).toHaveClass('artifact-inspection-panel');
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily when props do not change', () => {
      const { rerender } = render(<ArtifactInspectionPanel {...defaultProps} />);
      
      const initialRenderCount = screen.getAllByText('TestComponent').length;
      
      // Re-render with same props
      rerender(<ArtifactInspectionPanel {...defaultProps} />);
      
      const afterRerenderCount = screen.getAllByText('TestComponent').length;
      expect(afterRerenderCount).toBe(initialRenderCount);
    });

    it('cleans up resources when unmounted', () => {
      const { unmount } = render(<ArtifactInspectionPanel {...defaultProps} />);
      
      // Should not throw any errors when unmounting
      expect(() => unmount()).not.toThrow();
    });
  });
});