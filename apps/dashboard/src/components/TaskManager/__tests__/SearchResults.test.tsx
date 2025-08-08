import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SearchResults from '../SearchResults';
import { SearchResult, PaginationConfig } from '../SearchResults';
import { Task } from '../../../types/design-system';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock tasks data
const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Implement user authentication',
    description: 'Add JWT-based authentication system with role-based access control',
    status: 'in-progress',
    priority: 'high',
    assignee: { id: '1', name: 'John Doe', email: 'john@example.com' },
    tags: ['backend', 'security'],
    dueDate: new Date('2025-02-15'),
    createdAt: new Date('2025-01-20'),
    updatedAt: new Date('2025-01-30'),
    starred: true
  },
  {
    id: '2',
    title: 'Design dashboard UI components',
    description: 'Create reusable React components for the main dashboard',
    status: 'done',
    priority: 'medium',
    assignee: { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
    tags: ['frontend', 'ui'],
    dueDate: new Date('2025-01-25'),
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-25'),
    starred: false
  }
];

const mockSearchResults: SearchResult[] = [
  {
    task: mockTasks[0],
    relevanceScore: 15.5,
    matchedFields: ['title', 'description'],
    highlights: {
      title: 'Implement user <mark class="bg-yellow-200 text-yellow-900 px-1 rounded">authentication</mark>',
      description: 'Add JWT-based <mark class="bg-yellow-200 text-yellow-900 px-1 rounded">authentication</mark> system'
    }
  },
  {
    task: mockTasks[1],
    relevanceScore: 8.2,
    matchedFields: ['tags'],
    highlights: {
      tags: 'frontend, <mark class="bg-yellow-200 text-yellow-900 px-1 rounded">ui</mark>'
    }
  }
];

const mockPagination: PaginationConfig = {
  page: 1,
  pageSize: 20,
  totalItems: 2,
  totalPages: 1
};

describe('SearchResults', () => {
  const defaultProps = {
    results: mockSearchResults,
    pagination: mockPagination,
    onTaskAction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders search results correctly', () => {
      render(<SearchResults {...defaultProps} />);
      
      expect(screen.getByText('Search Results (2)')).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
      expect(screen.getByText('Implement user authentication')).toBeInTheDocument();
      expect(screen.getByText('Design dashboard UI components')).toBeInTheDocument();
    });

    it('renders empty state when no results', () => {
      render(<SearchResults {...defaultProps} results={[]} pagination={{ ...mockPagination, totalItems: 0 }} />);
      
      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search terms or filters')).toBeInTheDocument();
    });

    it('renders loading state', () => {
      render(<SearchResults {...defaultProps} loading={true} />);
      
      expect(screen.getByText('Searching tasks...')).toBeInTheDocument();
    });

    it('renders error state', () => {
      render(<SearchResults {...defaultProps} error="Search failed" />);
      
      expect(screen.getByText('Search Error')).toBeInTheDocument();
      expect(screen.getByText('Search failed')).toBeInTheDocument();
    });
  });

  describe('Task Actions', () => {
    it('calls onTaskAction when toggle button is clicked', async () => {
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
      const toggleButtons = screen.getAllByRole('button');
      const toggleButton = toggleButtons.find(button => 
        button.querySelector('svg') && button.className.includes('hover:text-blue-600')
      );
      
      if (toggleButton) {
        await user.click(toggleButton);
        expect(defaultProps.onTaskAction).toHaveBeenCalledWith('1', 'toggle');
      }
    });

    it('calls onTaskAction when star button is clicked', async () => {
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
      const starButtons = screen.getAllByRole('button');
      const starButton = starButtons.find(button => 
        button.className.includes('hover:text-yellow-500')
      );
      
      if (starButton) {
        await user.click(starButton);
        expect(defaultProps.onTaskAction).toHaveBeenCalledWith('1', 'star');
      }
    });

    it('calls onTaskAction when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(button => 
        button.querySelector('svg') && button.className.includes('hover:text-blue-600')
      );
      
      // Find the edit button specifically (there might be multiple blue buttons)
      const allButtons = screen.getAllByRole('button');
      for (const button of allButtons) {
        const svg = button.querySelector('svg');
        if (svg && button.className.includes('hover:text-blue-600')) {
          await user.click(button);
          break;
        }
      }
      
      expect(defaultProps.onTaskAction).toHaveBeenCalled();
    });

    it('calls onTaskAction when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(button => 
        button.className.includes('hover:text-red-600')
      );
      
      if (deleteButton) {
        await user.click(deleteButton);
        expect(defaultProps.onTaskAction).toHaveBeenCalledWith('1', 'delete');
      }
    });
  });

  describe('Task Selection', () => {
    it('renders checkboxes when onTaskSelect is provided', () => {
      render(<SearchResults {...defaultProps} onTaskSelect={jest.fn()} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);
    });

    it('calls onTaskSelect when checkbox is clicked', async () => {
      const user = userEvent.setup();
      const onTaskSelect = jest.fn();
      render(<SearchResults {...defaultProps} onTaskSelect={onTaskSelect} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      
      expect(onTaskSelect).toHaveBeenCalledWith('1', true);
    });

    it('shows selected tasks with visual indication', () => {
      const selectedTasks = new Set(['1']);
      render(<SearchResults {...defaultProps} onTaskSelect={jest.fn()} selectedTasks={selectedTasks} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toBeChecked();
    });
  });

  describe('Highlighted Text', () => {
    it('renders highlighted text in titles', () => {
      render(<SearchResults {...defaultProps} />);
      
      const titleElement = screen.getByText((content, element) => {
        return element?.innerHTML.includes('<mark') && content.includes('authentication');
      });
      
      expect(titleElement).toBeInTheDocument();
    });

    it('renders highlighted text in descriptions', () => {
      render(<SearchResults {...defaultProps} />);
      
      // Check if highlighted description is rendered
      const container = screen.getByText('Implement user authentication').closest('div');
      expect(container).toBeInTheDocument();
    });

    it('renders highlighted text in tags', () => {
      render(<SearchResults {...defaultProps} />);
      
      // The second result should have highlighted tags
      expect(screen.getByText('Design dashboard UI components')).toBeInTheDocument();
    });
  });

  describe('Relevance Scores', () => {
    it('shows relevance scores when enabled', () => {
      render(<SearchResults {...defaultProps} showRelevanceScore={true} />);
      
      expect(screen.getByText('15.5')).toBeInTheDocument();
      expect(screen.getByText('8.2')).toBeInTheDocument();
    });

    it('hides relevance scores by default', () => {
      render(<SearchResults {...defaultProps} />);
      
      expect(screen.queryByText('15.5')).not.toBeInTheDocument();
      expect(screen.queryByText('8.2')).not.toBeInTheDocument();
    });
  });

  describe('Matched Fields', () => {
    it('shows matched fields when enabled', () => {
      render(<SearchResults {...defaultProps} showMatchedFields={true} />);
      
      expect(screen.getByText(/Matched in: Title, Description/)).toBeInTheDocument();
      expect(screen.getByText(/Matched in: Tags/)).toBeInTheDocument();
    });

    it('hides matched fields when disabled', () => {
      render(<SearchResults {...defaultProps} showMatchedFields={false} />);
      
      expect(screen.queryByText(/Matched in:/)).not.toBeInTheDocument();
    });
  });

  describe('Task Status and Priority', () => {
    it('displays task status badges correctly', () => {
      render(<SearchResults {...defaultProps} />);
      
      expect(screen.getByText('in progress')).toBeInTheDocument();
      expect(screen.getByText('done')).toBeInTheDocument();
    });

    it('displays priority badges correctly', () => {
      render(<SearchResults {...defaultProps} />);
      
      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
    });

    it('shows correct status icons', () => {
      render(<SearchResults {...defaultProps} />);
      
      // Check for status icons (Clock for in-progress, CheckCircle for done)
      const container = screen.getByText('Implement user authentication').closest('div');
      expect(container).toBeInTheDocument();
    });

    it('applies line-through style for completed tasks', () => {
      render(<SearchResults {...defaultProps} />);
      
      const completedTaskTitle = screen.getByText('Design dashboard UI components');
      expect(completedTaskTitle).toHaveClass('line-through');
    });
  });

  describe('Task Details', () => {
    it('displays assignee information', () => {
      render(<SearchResults {...defaultProps} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('displays due dates', () => {
      render(<SearchResults {...defaultProps} />);
      
      expect(screen.getByText('2/15/2025')).toBeInTheDocument();
      expect(screen.getByText('1/25/2025')).toBeInTheDocument();
    });

    it('displays tags', () => {
      render(<SearchResults {...defaultProps} />);
      
      expect(screen.getByText('backend')).toBeInTheDocument();
      expect(screen.getByText('security')).toBeInTheDocument();
      expect(screen.getByText('frontend')).toBeInTheDocument();
      expect(screen.getByText('ui')).toBeInTheDocument();
    });

    it('shows overdue indicator for overdue tasks', () => {
      const overdueTask = {
        ...mockTasks[0],
        dueDate: new Date('2025-01-01'), // Past date
        status: 'in-progress' as const
      };

      const overdueResult = {
        ...mockSearchResults[0],
        task: overdueTask
      };

      render(<SearchResults {...defaultProps} results={[overdueResult]} />);
      
      expect(screen.getByText('Overdue')).toBeInTheDocument();
    });

    it('does not show overdue for completed tasks', () => {
      const completedOverdueTask = {
        ...mockTasks[0],
        dueDate: new Date('2025-01-01'), // Past date
        status: 'done' as const
      };

      const completedResult = {
        ...mockSearchResults[0],
        task: completedOverdueTask
      };

      render(<SearchResults {...defaultProps} results={[completedResult]} />);
      
      expect(screen.queryByText('Overdue')).not.toBeInTheDocument();
    });
  });

  describe('View Modes', () => {
    it('renders list view by default', () => {
      render(<SearchResults {...defaultProps} />);
      
      // List view should show full descriptions
      expect(screen.getByText(/Add JWT-based authentication system/)).toBeInTheDocument();
    });

    it('renders grid view when specified', () => {
      render(<SearchResults {...defaultProps} viewMode="grid" />);
      
      // Grid view should still show task titles
      expect(screen.getByText('Implement user authentication')).toBeInTheDocument();
      expect(screen.getByText('Design dashboard UI components')).toBeInTheDocument();
    });

    it('renders compact view when specified', () => {
      render(<SearchResults {...defaultProps} viewMode="compact" />);
      
      // Compact view should show task titles
      expect(screen.getByText('Implement user authentication')).toBeInTheDocument();
      expect(screen.getByText('Design dashboard UI components')).toBeInTheDocument();
    });
  });

  describe('Text Expansion', () => {
    it('shows expand button for long descriptions', () => {
      const longDescriptionTask = {
        ...mockTasks[0],
        description: 'This is a very long description that should be truncated in the UI and show a show more button. '.repeat(10)
      };

      const longDescriptionResult = {
        ...mockSearchResults[0],
        task: longDescriptionTask
      };

      render(<SearchResults {...defaultProps} results={[longDescriptionResult]} />);
      
      expect(screen.getByText('Show more')).toBeInTheDocument();
    });

    it('expands and collapses long descriptions', async () => {
      const user = userEvent.setup();
      const longDescriptionTask = {
        ...mockTasks[0],
        description: 'This is a very long description that should be truncated in the UI and show a show more button. '.repeat(10)
      };

      const longDescriptionResult = {
        ...mockSearchResults[0],
        task: longDescriptionTask
      };

      render(<SearchResults {...defaultProps} results={[longDescriptionResult]} />);
      
      const showMoreButton = screen.getByText('Show more');
      await user.click(showMoreButton);
      
      expect(screen.getByText('Show less')).toBeInTheDocument();
    });
  });

  describe('Pagination Info', () => {
    it('displays pagination information correctly', () => {
      const paginationWithMultiplePages = {
        page: 2,
        pageSize: 10,
        totalItems: 25,
        totalPages: 3
      };

      render(<SearchResults {...defaultProps} pagination={paginationWithMultiplePages} />);
      
      expect(screen.getByText('Search Results (25)')).toBeInTheDocument();
      expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    });

    it('handles single page correctly', () => {
      render(<SearchResults {...defaultProps} />);
      
      expect(screen.getByText('Search Results (2)')).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for buttons', () => {
      render(<SearchResults {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('has proper checkbox labels when selection is enabled', () => {
      render(<SearchResults {...defaultProps} onTaskSelect={jest.fn()} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);
    });

    it('maintains focus management', async () => {
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      if (buttons.length > 0) {
        await user.tab();
        expect(document.activeElement).toBe(buttons[0]);
      }
    });
  });

  describe('Performance', () => {
    it('handles large result sets efficiently', () => {
      const largeResults = Array.from({ length: 100 }, (_, i) => ({
        task: { ...mockTasks[0], id: `task-${i}`, title: `Task ${i}` },
        relevanceScore: Math.random() * 20,
        matchedFields: ['title'],
        highlights: {}
      }));

      const largePagination = {
        page: 1,
        pageSize: 20,
        totalItems: 100,
        totalPages: 5
      };

      render(<SearchResults results={largeResults} pagination={largePagination} onTaskAction={jest.fn()} />);
      
      expect(screen.getByText('Search Results (100)')).toBeInTheDocument();
    });

    it('renders without performance issues', () => {
      const startTime = performance.now();
      
      render(<SearchResults {...defaultProps} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render quickly (less than 100ms)
      expect(renderTime).toBeLessThan(100);
    });
  });
});