import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SearchAndFilter from '../SearchAndFilter';
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
  },
  {
    id: '3',
    title: 'Set up CI/CD pipeline',
    description: 'Configure automated testing and deployment pipeline',
    status: 'todo',
    priority: 'urgent',
    assignee: { id: '3', name: 'Mike Johnson', email: 'mike@example.com' },
    tags: ['devops', 'automation'],
    dueDate: new Date('2025-02-10'),
    createdAt: new Date('2025-01-28'),
    updatedAt: new Date('2025-01-28'),
    starred: false
  }
];

const mockSavedSearches = [
  {
    id: '1',
    name: 'High Priority Tasks',
    query: {
      text: '',
      fields: ['all'] as const,
      caseSensitive: false,
      wholeWords: false,
      regex: false
    },
    filters: [
      {
        id: '1',
        field: 'priority' as const,
        operator: 'equals' as const,
        value: 'high'
      }
    ],
    createdAt: new Date('2025-01-01'),
    lastUsed: new Date('2025-01-30'),
    useCount: 5
  }
];

describe('SearchAndFilter', () => {
  const defaultProps = {
    tasks: mockTasks,
    onSearchResults: jest.fn(),
    onFiltersChange: jest.fn(),
    onSavedSearchSelect: jest.fn(),
    savedSearches: mockSavedSearches,
    onSavedSearchCreate: jest.fn(),
    onSavedSearchDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Basic Search Functionality', () => {
    it('renders search input and basic controls', () => {
      render(<SearchAndFilter {...defaultProps} />);
      
      expect(screen.getByPlaceholderText('Search tasks...')).toBeInTheDocument();
      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.getByText('Advanced')).toBeInTheDocument();
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    it('performs real-time search with debouncing', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<SearchAndFilter {...defaultProps} enableRealTimeSearch={true} debounceMs={300} />);
      
      const searchInput = screen.getByPlaceholderText('Search tasks...');
      
      await user.type(searchInput, 'authentication');
      
      // Should not call immediately
      expect(defaultProps.onSearchResults).not.toHaveBeenCalled();
      
      // Advance timers to trigger debounced search
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(defaultProps.onSearchResults).toHaveBeenCalled();
      });
    });

    it('clears search when X button is clicked', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search tasks...');
      await user.type(searchInput, 'test');
      
      const clearButton = screen.getByRole('button', { name: '' });
      await user.click(clearButton);
      
      expect(searchInput).toHaveValue('');
    });

    it('highlights search results correctly', async () => {
      render(<SearchAndFilter {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search tasks...');
      await userEvent.type(searchInput, 'authentication');
      
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        const calls = defaultProps.onSearchResults.mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const [results] = calls[calls.length - 1];
        expect(results[0].highlights.title).toContain('<mark');
      });
    });
  });

  describe('Advanced Search Features', () => {
    it('toggles advanced search panel', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      const advancedButton = screen.getByText('Advanced');
      await user.click(advancedButton);
      
      expect(screen.getByText('Search In')).toBeInTheDocument();
      expect(screen.getByText('Options')).toBeInTheDocument();
      expect(screen.getByText('Sort By')).toBeInTheDocument();
    });

    it('handles case sensitive search', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      // Open advanced search
      await user.click(screen.getByText('Advanced'));
      
      // Enable case sensitive
      const caseSensitiveCheckbox = screen.getByLabelText('Case sensitive');
      await user.click(caseSensitiveCheckbox);
      
      expect(caseSensitiveCheckbox).toBeChecked();
    });

    it('handles whole words only search', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      await user.click(screen.getByText('Advanced'));
      
      const wholeWordsCheckbox = screen.getByLabelText('Whole words only');
      await user.click(wholeWordsCheckbox);
      
      expect(wholeWordsCheckbox).toBeChecked();
    });

    it('handles regex search', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      await user.click(screen.getByText('Advanced'));
      
      const regexCheckbox = screen.getByLabelText('Regular expression');
      await user.click(regexCheckbox);
      
      expect(regexCheckbox).toBeChecked();
    });

    it('changes sort field and order', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      await user.click(screen.getByText('Advanced'));
      
      const sortSelect = screen.getByDisplayValue('Updated Date');
      await user.selectOptions(sortSelect, 'title');
      
      expect(sortSelect).toHaveValue('title');
    });
  });

  describe('Filter Functionality', () => {
    it('toggles filter panel', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      const filterButton = screen.getByText('Filters');
      await user.click(filterButton);
      
      expect(screen.getByText('Add Filter')).toBeInTheDocument();
    });

    it('adds new filter', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      await user.click(screen.getByText('Filters'));
      await user.click(screen.getByText('Add Filter'));
      
      expect(screen.getByDisplayValue('Status')).toBeInTheDocument();
    });

    it('removes filter', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      await user.click(screen.getByText('Filters'));
      await user.click(screen.getByText('Add Filter'));
      
      const removeButton = screen.getByTitle('Remove filter');
      await user.click(removeButton);
      
      expect(screen.queryByDisplayValue('Status')).not.toBeInTheDocument();
    });

    it('updates filter field', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      await user.click(screen.getByText('Filters'));
      await user.click(screen.getByText('Add Filter'));
      
      const fieldSelect = screen.getByDisplayValue('Status');
      await user.selectOptions(fieldSelect, 'priority');
      
      expect(fieldSelect).toHaveValue('priority');
    });

    it('updates filter operator', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      await user.click(screen.getByText('Filters'));
      await user.click(screen.getByText('Add Filter'));
      
      const operatorSelect = screen.getByDisplayValue('Equals');
      await user.selectOptions(operatorSelect, 'contains');
      
      expect(operatorSelect).toHaveValue('contains');
    });

    it('handles multiple filters with logical operators', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      await user.click(screen.getByText('Filters'));
      
      // Add first filter
      await user.click(screen.getByText('Add Filter'));
      
      // Add second filter
      await user.click(screen.getByText('Add Filter'));
      
      // Check that logical operator selector appears for second filter
      expect(screen.getByDisplayValue('AND')).toBeInTheDocument();
    });

    it('clears all filters', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      await user.click(screen.getByText('Filters'));
      await user.click(screen.getByText('Add Filter'));
      
      const clearButton = screen.getByTitle('Clear all filters');
      await user.click(clearButton);
      
      expect(defaultProps.onFiltersChange).toHaveBeenCalledWith([]);
    });
  });

  describe('Saved Searches', () => {
    it('displays saved searches panel', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      await user.click(screen.getByText('Saved'));
      
      expect(screen.getByText('Saved Searches')).toBeInTheDocument();
      expect(screen.getByText('High Priority Tasks')).toBeInTheDocument();
    });

    it('loads saved search', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      await user.click(screen.getByText('Saved'));
      await user.click(screen.getByText('High Priority Tasks'));
      
      expect(defaultProps.onSavedSearchSelect).toHaveBeenCalledWith(mockSavedSearches[0]);
    });

    it('deletes saved search', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      await user.click(screen.getByText('Saved'));
      
      const deleteButton = screen.getByTitle('');
      await user.click(deleteButton);
      
      expect(defaultProps.onSavedSearchDelete).toHaveBeenCalledWith('1');
    });

    it('opens save search modal', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      // Add some search criteria first
      const searchInput = screen.getByPlaceholderText('Search tasks...');
      await user.type(searchInput, 'test');
      
      await user.click(screen.getByText('Filters'));
      await user.click(screen.getByText('Save Search'));
      
      expect(screen.getByText('Save Search')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter search name...')).toBeInTheDocument();
    });

    it('saves new search', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      // Add search criteria
      const searchInput = screen.getByPlaceholderText('Search tasks...');
      await user.type(searchInput, 'test');
      
      await user.click(screen.getByText('Filters'));
      await user.click(screen.getByText('Save Search'));
      
      const nameInput = screen.getByPlaceholderText('Enter search name...');
      await user.type(nameInput, 'My Test Search');
      
      await user.click(screen.getByText('Save'));
      
      expect(defaultProps.onSavedSearchCreate).toHaveBeenCalledWith({
        name: 'My Test Search',
        query: expect.objectContaining({
          text: 'test'
        }),
        filters: []
      });
    });
  });

  describe('Search Results and Pagination', () => {
    it('calls onSearchResults with correct pagination', async () => {
      render(<SearchAndFilter {...defaultProps} pageSize={2} />);
      
      const searchInput = screen.getByPlaceholderText('Search tasks...');
      await userEvent.type(searchInput, 'test');
      
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(defaultProps.onSearchResults).toHaveBeenCalledWith(
          expect.any(Array),
          expect.objectContaining({
            page: 1,
            pageSize: 2,
            totalItems: expect.any(Number),
            totalPages: expect.any(Number)
          })
        );
      });
    });

    it('calculates relevance scores correctly', async () => {
      render(<SearchAndFilter {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search tasks...');
      await userEvent.type(searchInput, 'authentication');
      
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        const calls = defaultProps.onSearchResults.mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const [results] = calls[calls.length - 1];
        
        // Should find the authentication task with high relevance
        const authTask = results.find((r: any) => r.task.title.includes('authentication'));
        expect(authTask).toBeDefined();
        expect(authTask.relevanceScore).toBeGreaterThan(0);
      });
    });

    it('handles empty search results', async () => {
      render(<SearchAndFilter {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search tasks...');
      await userEvent.type(searchInput, 'nonexistent');
      
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        const calls = defaultProps.onSearchResults.mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const [results] = calls[calls.length - 1];
        expect(results).toHaveLength(0);
      });
    });
  });

  describe('Filter Combinations', () => {
    it('applies status filter correctly', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      await user.click(screen.getByText('Filters'));
      await user.click(screen.getByText('Add Filter'));
      
      // Set filter to status = 'done'
      const valueSelect = screen.getByDisplayValue('');
      await user.selectOptions(valueSelect, 'done');
      
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        const calls = defaultProps.onSearchResults.mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const [results] = calls[calls.length - 1];
        
        // Should only return tasks with 'done' status
        results.forEach((result: any) => {
          expect(result.task.status).toBe('done');
        });
      });
    });

    it('applies priority filter correctly', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      await user.click(screen.getByText('Filters'));
      await user.click(screen.getByText('Add Filter'));
      
      // Change field to priority
      const fieldSelect = screen.getByDisplayValue('Status');
      await user.selectOptions(fieldSelect, 'priority');
      
      // Set value to 'high'
      const valueSelect = screen.getByDisplayValue('');
      await user.selectOptions(valueSelect, 'high');
      
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        const calls = defaultProps.onSearchResults.mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const [results] = calls[calls.length - 1];
        
        results.forEach((result: any) => {
          expect(result.task.priority).toBe('high');
        });
      });
    });

    it('combines multiple filters with AND logic', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      await user.click(screen.getByText('Filters'));
      
      // Add first filter: status = 'in-progress'
      await user.click(screen.getByText('Add Filter'));
      const firstValueSelect = screen.getByDisplayValue('');
      await user.selectOptions(firstValueSelect, 'in-progress');
      
      // Add second filter: priority = 'high'
      await user.click(screen.getByText('Add Filter'));
      const fieldSelects = screen.getAllByDisplayValue('Status');
      await user.selectOptions(fieldSelects[1], 'priority');
      
      const valueSelects = screen.getAllByDisplayValue('');
      await user.selectOptions(valueSelects[1], 'high');
      
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        const calls = defaultProps.onSearchResults.mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const [results] = calls[calls.length - 1];
        
        results.forEach((result: any) => {
          expect(result.task.status).toBe('in-progress');
          expect(result.task.priority).toBe('high');
        });
      });
    });

    it('combines multiple filters with OR logic', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      await user.click(screen.getByText('Filters'));
      
      // Add first filter
      await user.click(screen.getByText('Add Filter'));
      
      // Add second filter with OR logic
      await user.click(screen.getByText('Add Filter'));
      const logicalOperatorSelect = screen.getByDisplayValue('AND');
      await user.selectOptions(logicalOperatorSelect, 'OR');
      
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      // Should apply OR logic between filters
      expect(logicalOperatorSelect).toHaveValue('OR');
    });
  });

  describe('Error Handling', () => {
    it('handles invalid regex patterns gracefully', async () => {
      const user = userEvent.setup();
      render(<SearchAndFilter {...defaultProps} />);
      
      await user.click(screen.getByText('Advanced'));
      
      // Enable regex
      const regexCheckbox = screen.getByLabelText('Regular expression');
      await user.click(regexCheckbox);
      
      // Enter invalid regex
      const searchInput = screen.getByPlaceholderText('Search tasks...');
      await user.type(searchInput, '[invalid');
      
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      // Should not crash and should still call onSearchResults
      await waitFor(() => {
        expect(defaultProps.onSearchResults).toHaveBeenCalled();
      });
    });

    it('handles empty tasks array', () => {
      render(<SearchAndFilter {...defaultProps} tasks={[]} />);
      
      expect(screen.getByPlaceholderText('Search tasks...')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('debounces search input correctly', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<SearchAndFilter {...defaultProps} debounceMs={500} />);
      
      const searchInput = screen.getByPlaceholderText('Search tasks...');
      
      // Type multiple characters quickly
      await user.type(searchInput, 'test');
      
      // Should not have called onSearchResults yet
      expect(defaultProps.onSearchResults).not.toHaveBeenCalled();
      
      // Advance timers by less than debounce time
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      // Still should not have called
      expect(defaultProps.onSearchResults).not.toHaveBeenCalled();
      
      // Advance timers to complete debounce
      act(() => {
        jest.advanceTimersByTime(200);
      });
      
      // Now should have called
      await waitFor(() => {
        expect(defaultProps.onSearchResults).toHaveBeenCalled();
      });
    });

    it('cancels previous search when new search is initiated', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<SearchAndFilter {...defaultProps} debounceMs={300} />);
      
      const searchInput = screen.getByPlaceholderText('Search tasks...');
      
      // Start first search
      await user.type(searchInput, 'first');
      
      // Start second search before first completes
      await user.clear(searchInput);
      await user.type(searchInput, 'second');
      
      // Advance timers
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      // Should only call once for the second search
      await waitFor(() => {
        expect(defaultProps.onSearchResults).toHaveBeenCalledTimes(1);
      });
    });
  });
});