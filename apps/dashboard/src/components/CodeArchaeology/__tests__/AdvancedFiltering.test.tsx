import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AdvancedFiltering from '../AdvancedFiltering';
import { CodeArtifact, RequirementNode } from '../types';
import { FilteringService } from '../FilteringService';
import { Vector3 } from 'three';

// Mock the child components
jest.mock('../FilterPanel', () => ({
  __esModule: true,
  default: ({ criteria, onCriteriaChange, onSaveView }: any) => (
    <div data-testid="filter-panel">
      <input
        data-testid="search-input"
        value={criteria.searchQuery}
        onChange={(e) => onCriteriaChange({ ...criteria, searchQuery: e.target.value })}
        placeholder="Search artifacts..."
      />
      <button
        data-testid="save-view-button"
        onClick={() => onSaveView('Test View', criteria)}
      >
        Save View
      </button>
    </div>
  ),
}));

jest.mock('../SearchHighlighter', () => ({
  __esModule: true,
  default: ({ searchQuery, onResultSelect }: any) => (
    <div data-testid="search-highlighter">
      <div data-testid="search-query">{searchQuery}</div>
      <button
        data-testid="select-result"
        onClick={() => onResultSelect({ type: 'artifact', item: mockArtifacts[0] })}
      >
        Select Result
      </button>
    </div>
  ),
}));

jest.mock('../SavedViewsManager', () => ({
  __esModule: true,
  default: ({ savedViews, onLoadView, onDeleteView }: any) => (
    <div data-testid="saved-views-manager">
      <div data-testid="saved-views-count">{savedViews.length}</div>
      {savedViews.map((view: any) => (
        <div key={view.id} data-testid={`saved-view-${view.id}`}>
          <span>{view.name}</span>
          <button
            data-testid={`load-view-${view.id}`}
            onClick={() => onLoadView(view)}
          >
            Load
          </button>
          <button
            data-testid={`delete-view-${view.id}`}
            onClick={() => onDeleteView(view.id)}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  ),
}));

// Mock FilteringService
jest.mock('../FilteringService', () => ({
  FilteringService: {
    createDefaultCriteria: jest.fn(() => ({
      fileTypes: [],
      authors: [],
      dateRange: { start: null, end: null },
      complexityRange: { min: 0, max: 100 },
      changeFrequencyRange: { min: 0, max: 100 },
      searchQuery: '',
    })),
    filterArtifacts: jest.fn((artifacts) => artifacts),
    filterRequirements: jest.fn((requirements) => requirements),
    getFilterStats: jest.fn(() => ({
      artifacts: { filtered: 2, total: 2 },
      requirements: { filtered: 1, total: 1 },
      typeBreakdown: { file: 1, function: 1 },
      complexityStats: { avg: 5, min: 3, max: 7 },
      changeFrequencyStats: { avg: 2.5, min: 1, max: 4 },
      authorBreakdown: [{ author: 'john.doe', count: 2 }],
    })),
    hasActiveFilters: jest.fn(() => false),
    getFilterDescription: jest.fn(() => 'No active filters'),
    serializeCriteria: jest.fn(() => new URLSearchParams()),
    deserializeCriteria: jest.fn(() => ({
      fileTypes: [],
      authors: [],
      dateRange: { start: null, end: null },
      complexityRange: { min: 0, max: 100 },
      changeFrequencyRange: { min: 0, max: 100 },
      searchQuery: '',
    })),
  },
}));

const mockArtifacts: CodeArtifact[] = [
  {
    id: 'artifact-1',
    filePath: 'src/components/Component1.tsx',
    type: 'file',
    name: 'Component1',
    position3D: new Vector3(0, 0, 0),
    complexity: 3,
    changeFrequency: 1,
    lastModified: new Date('2024-01-15'),
    authors: ['john.doe'],
    dependencies: [],
  },
  {
    id: 'artifact-2',
    filePath: 'src/utils/helper.ts',
    type: 'function',
    name: 'helperFunction',
    position3D: new Vector3(1, 1, 1),
    complexity: 7,
    changeFrequency: 4,
    lastModified: new Date('2024-01-20'),
    authors: ['jane.smith'],
    dependencies: [],
  },
];

const mockRequirements: RequirementNode[] = [
  {
    id: 'req-1',
    title: 'Test Requirement',
    description: 'A test requirement',
    position3D: new Vector3(0, 0, 0),
    linkedArtifacts: ['artifact-1'],
    coverage: 100,
    priority: 'high',
    status: 'implemented',
  },
];

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock URL manipulation
const mockReplaceState = jest.fn();
Object.defineProperty(window, 'history', {
  value: { replaceState: mockReplaceState },
});

describe('AdvancedFiltering', () => {
  const defaultProps = {
    artifacts: mockArtifacts,
    requirements: mockRequirements,
    onFilteredArtifactsChange: jest.fn(),
    onFilteredRequirementsChange: jest.fn(),
    onArtifactSelect: jest.fn(),
    onRequirementSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Rendering', () => {
    it('renders filter status bar', () => {
      render(<AdvancedFiltering {...defaultProps} />);
      
      expect(screen.getByText('2 of 2 artifacts')).toBeInTheDocument();
      expect(screen.getByText('• 1 of 1 requirements')).toBeInTheDocument();
    });

    it('renders show/hide filters button', () => {
      render(<AdvancedFiltering {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /show filters/i })).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <AdvancedFiltering {...defaultProps} className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('renders without requirements when not provided', () => {
      render(<AdvancedFiltering {...defaultProps} requirements={[]} />);
      
      expect(screen.getByText('2 of 2 artifacts')).toBeInTheDocument();
      expect(screen.queryByText('requirements')).not.toBeInTheDocument();
    });
  });

  describe('Filter Panel Toggle', () => {
    it('shows filter panel when show filters is clicked', async () => {
      const user = userEvent.setup();
      render(<AdvancedFiltering {...defaultProps} />);
      
      const showButton = screen.getByRole('button', { name: /show filters/i });
      await user.click(showButton);
      
      expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
      expect(screen.getByTestId('saved-views-manager')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /hide filters/i })).toBeInTheDocument();
    });

    it('hides filter panel when hide filters is clicked', async () => {
      const user = userEvent.setup();
      render(<AdvancedFiltering {...defaultProps} />);
      
      // Show first
      const showButton = screen.getByRole('button', { name: /show filters/i });
      await user.click(showButton);
      
      // Then hide
      const hideButton = screen.getByRole('button', { name: /hide filters/i });
      await user.click(hideButton);
      
      expect(screen.queryByTestId('filter-panel')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /show filters/i })).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('shows search results when search query is entered', async () => {
      const user = userEvent.setup();
      render(<AdvancedFiltering {...defaultProps} />);
      
      // Show filter panel
      await user.click(screen.getByRole('button', { name: /show filters/i }));
      
      // Enter search query
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'test query');
      
      expect(screen.getByTestId('search-highlighter')).toBeInTheDocument();
      expect(screen.getByTestId('search-query')).toHaveTextContent('test query');
    });

    it('handles search result selection', async () => {
      const user = userEvent.setup();
      const onArtifactSelect = jest.fn();
      
      render(<AdvancedFiltering {...defaultProps} onArtifactSelect={onArtifactSelect} />);
      
      // Show filter panel and enter search
      await user.click(screen.getByRole('button', { name: /show filters/i }));
      await user.type(screen.getByTestId('search-input'), 'test');
      
      // Select result
      await user.click(screen.getByTestId('select-result'));
      
      expect(onArtifactSelect).toHaveBeenCalledWith(mockArtifacts[0]);
    });
  });

  describe('Filter Statistics', () => {
    it('displays filter statistics when filters are active', () => {
      (FilteringService.hasActiveFilters as jest.Mock).mockReturnValue(true);
      (FilteringService.getFilterDescription as jest.Mock).mockReturnValue('Active filters applied');
      
      render(<AdvancedFiltering {...defaultProps} />);
      
      expect(screen.getByText('Active filters applied')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
    });

    it('shows detailed statistics breakdown', () => {
      (FilteringService.hasActiveFilters as jest.Mock).mockReturnValue(true);
      
      render(<AdvancedFiltering {...defaultProps} />);
      
      expect(screen.getByText('By Type')).toBeInTheDocument();
      expect(screen.getByText('Complexity')).toBeInTheDocument();
      expect(screen.getByText('Change Frequency')).toBeInTheDocument();
      expect(screen.getByText('Top Authors')).toBeInTheDocument();
    });

    it('clears all filters when clear all is clicked', async () => {
      const user = userEvent.setup();
      (FilteringService.hasActiveFilters as jest.Mock).mockReturnValue(true);
      
      render(<AdvancedFiltering {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /clear all/i }));
      
      expect(FilteringService.createDefaultCriteria).toHaveBeenCalled();
    });
  });

  describe('Saved Views Integration', () => {
    it('loads saved views from localStorage on mount', () => {
      const mockSavedViews = JSON.stringify([
        {
          id: 'view-1',
          name: 'Test View',
          createdAt: '2024-01-15T10:00:00Z',
          lastUsed: '2024-01-15T10:00:00Z',
          criteria: {
            fileTypes: ['file'],
            authors: [],
            dateRange: { start: null, end: null },
            complexityRange: { min: 0, max: 100 },
            changeFrequencyRange: { min: 0, max: 100 },
            searchQuery: '',
          },
        },
      ]);
      
      localStorageMock.getItem.mockReturnValue(mockSavedViews);
      
      render(<AdvancedFiltering {...defaultProps} />);
      
      // Show filter panel to see saved views
      fireEvent.click(screen.getByRole('button', { name: /show filters/i }));
      
      expect(screen.getByTestId('saved-views-count')).toHaveTextContent('1');
      expect(screen.getByTestId('saved-view-view-1')).toBeInTheDocument();
    });

    it('saves views to localStorage when view is saved', async () => {
      const user = userEvent.setup();
      render(<AdvancedFiltering {...defaultProps} />);
      
      // Show filter panel and save view
      await user.click(screen.getByRole('button', { name: /show filters/i }));
      await user.click(screen.getByTestId('save-view-button'));
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'codeArchaeology_savedViews',
        expect.any(String)
      );
    });

    it('loads saved view when selected', async () => {
      const user = userEvent.setup();
      const mockSavedViews = [
        {
          id: 'view-1',
          name: 'Test View',
          createdAt: new Date('2024-01-15'),
          lastUsed: new Date('2024-01-15'),
          criteria: {
            fileTypes: ['file'],
            authors: [],
            dateRange: { start: null, end: null },
            complexityRange: { min: 0, max: 100 },
            changeFrequencyRange: { min: 0, max: 100 },
            searchQuery: 'test',
          },
        },
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedViews));
      
      render(<AdvancedFiltering {...defaultProps} />);
      
      // Show filter panel and load view
      await user.click(screen.getByRole('button', { name: /show filters/i }));
      await user.click(screen.getByTestId('load-view-view-1'));
      
      // Should update search input
      expect(screen.getByTestId('search-input')).toHaveValue('test');
    });

    it('deletes saved view when delete is clicked', async () => {
      const user = userEvent.setup();
      const mockSavedViews = [
        {
          id: 'view-1',
          name: 'Test View',
          createdAt: new Date('2024-01-15'),
          lastUsed: new Date('2024-01-15'),
          criteria: FilteringService.createDefaultCriteria(),
        },
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedViews));
      
      render(<AdvancedFiltering {...defaultProps} />);
      
      // Show filter panel and delete view
      await user.click(screen.getByRole('button', { name: /show filters/i }));
      await user.click(screen.getByTestId('delete-view-view-1'));
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'codeArchaeology_savedViews',
        '[]'
      );
    });
  });

  describe('URL Synchronization', () => {
    it('updates URL when filter criteria changes', async () => {
      const user = userEvent.setup();
      render(<AdvancedFiltering {...defaultProps} />);
      
      // Show filter panel and change criteria
      await user.click(screen.getByRole('button', { name: /show filters/i }));
      await user.type(screen.getByTestId('search-input'), 'test');
      
      expect(FilteringService.serializeCriteria).toHaveBeenCalled();
      expect(mockReplaceState).toHaveBeenCalled();
    });

    it('loads criteria from URL on mount', () => {
      const mockUrlParams = new URLSearchParams('search=test');
      Object.defineProperty(window, 'location', {
        value: { search: '?search=test' },
        writable: true,
      });
      
      render(<AdvancedFiltering {...defaultProps} />);
      
      expect(FilteringService.deserializeCriteria).toHaveBeenCalled();
    });
  });

  describe('No Results State', () => {
    it('shows no results message when no artifacts match filters', () => {
      (FilteringService.filterArtifacts as jest.Mock).mockReturnValue([]);
      (FilteringService.filterRequirements as jest.Mock).mockReturnValue([]);
      (FilteringService.hasActiveFilters as jest.Mock).mockReturnValue(true);
      
      render(<AdvancedFiltering {...defaultProps} />);
      
      expect(screen.getByText('No Results Found')).toBeInTheDocument();
      expect(screen.getByText('No artifacts or requirements match your current filter criteria.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear all filters/i })).toBeInTheDocument();
    });

    it('clears filters from no results state', async () => {
      const user = userEvent.setup();
      (FilteringService.filterArtifacts as jest.Mock).mockReturnValue([]);
      (FilteringService.filterRequirements as jest.Mock).mockReturnValue([]);
      (FilteringService.hasActiveFilters as jest.Mock).mockReturnValue(true);
      
      render(<AdvancedFiltering {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /clear all filters/i }));
      
      expect(FilteringService.createDefaultCriteria).toHaveBeenCalled();
    });
  });

  describe('Parent Component Integration', () => {
    it('calls onFilteredArtifactsChange when artifacts are filtered', () => {
      const onFilteredArtifactsChange = jest.fn();
      
      render(
        <AdvancedFiltering
          {...defaultProps}
          onFilteredArtifactsChange={onFilteredArtifactsChange}
        />
      );
      
      expect(onFilteredArtifactsChange).toHaveBeenCalledWith(mockArtifacts);
    });

    it('calls onFilteredRequirementsChange when requirements are filtered', () => {
      const onFilteredRequirementsChange = jest.fn();
      
      render(
        <AdvancedFiltering
          {...defaultProps}
          onFilteredRequirementsChange={onFilteredRequirementsChange}
        />
      );
      
      expect(onFilteredRequirementsChange).toHaveBeenCalledWith(mockRequirements);
    });

    it('handles missing onFilteredRequirementsChange gracefully', () => {
      expect(() => {
        render(
          <AdvancedFiltering
            {...defaultProps}
            onFilteredRequirementsChange={undefined}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('handles localStorage errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      expect(() => {
        render(<AdvancedFiltering {...defaultProps} />);
      }).not.toThrow();
      
      consoleSpy.mockRestore();
    });

    it('handles invalid JSON in localStorage gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      expect(() => {
        render(<AdvancedFiltering {...defaultProps} />);
      }).not.toThrow();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('memoizes filtered results to avoid unnecessary recalculations', () => {
      const { rerender } = render(<AdvancedFiltering {...defaultProps} />);
      
      const initialCallCount = (FilteringService.filterArtifacts as jest.Mock).mock.calls.length;
      
      // Re-render with same props
      rerender(<AdvancedFiltering {...defaultProps} />);
      
      // Should not call filter function again
      expect((FilteringService.filterArtifacts as jest.Mock).mock.calls.length).toBe(initialCallCount);
    });

    it('only updates parent when filtered data actually changes', () => {
      const onFilteredArtifactsChange = jest.fn();
      const { rerender } = render(
        <AdvancedFiltering
          {...defaultProps}
          onFilteredArtifactsChange={onFilteredArtifactsChange}
        />
      );
      
      const initialCallCount = onFilteredArtifactsChange.mock.calls.length;
      
      // Re-render with same artifacts
      rerender(
        <AdvancedFiltering
          {...defaultProps}
          onFilteredArtifactsChange={onFilteredArtifactsChange}
        />
      );
      
      // Should not call callback again
      expect(onFilteredArtifactsChange.mock.calls.length).toBe(initialCallCount);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for buttons', () => {
      render(<AdvancedFiltering {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /show filters/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<AdvancedFiltering {...defaultProps} />);
      
      // Tab to show filters button
      await user.tab();
      expect(screen.getByRole('button', { name: /show filters/i })).toHaveFocus();
      
      // Press Enter to show filters
      await user.keyboard('{Enter}');
      expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
    });
  });
});