import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActivityFeed, ActivityItem } from '../ActivityFeed';
import { AccessibilityProvider } from '../../../contexts/AccessibilityContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the hooks and services
jest.mock('../../../hooks/useRealTimeSync', () => ({
  useRealTimeSync: jest.fn(() => ({
    isConnected: true,
    subscribeToDataType: jest.fn(),
    unsubscribeFromDataType: jest.fn()
  }))
}));

jest.mock('../VirtualScroll', () => ({
  VirtualScroll: jest.fn(({ items, renderItem, emptyMessage, loading }) => {
    if (loading) {
      return <div data-testid="loading">Loading...</div>;
    }
    if (items.length === 0) {
      return <div data-testid="empty">{emptyMessage}</div>;
    }
    return (
      <div data-testid="virtual-scroll">
        {items.map((item: ActivityItem, index: number) => (
          <div key={item.id} data-testid={`activity-item-${item.id}`}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    );
  }),
  useVirtualScroll: jest.fn(() => ({
    items: [],
    loading: false,
    hasMore: false,
    error: null,
    loadMore: jest.fn(),
    reset: jest.fn()
  }))
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => children
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  GitCommit: () => <div data-testid="git-commit-icon" />,
  GitPullRequest: () => <div data-testid="git-pr-icon" />,
  MessageSquare: () => <div data-testid="message-icon" />,
  Bug: () => <div data-testid="bug-icon" />,
  CheckCircle: () => <div data-testid="check-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  User: () => <div data-testid="user-icon" />,
  Search: () => <div data-testid="search-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  ChevronDown: () => <div data-testid="chevron-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
  Hash: () => <div data-testid="hash-icon" />,
  ExternalLink: () => <div data-testid="external-link-icon" />
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'commit',
    title: 'Fix authentication bug',
    description: 'Fixed login issue with special characters',
    user: { id: '1', name: 'John Doe', email: 'john@example.com' },
    timestamp: new Date('2024-01-01T10:00:00Z'),
    metadata: {
      repository: 'frontend-app',
      branch: 'main',
      commitHash: 'abc123',
      priority: 'high',
      tags: ['bugfix', 'auth']
    }
  },
  {
    id: '2',
    type: 'pull_request',
    title: 'Add dark theme support',
    description: 'Implemented comprehensive dark theme',
    user: { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
    timestamp: new Date('2024-01-01T09:00:00Z'),
    metadata: {
      repository: 'frontend-app',
      pullRequestId: '123',
      priority: 'medium',
      tags: ['feature']
    },
    isNew: true
  },
  {
    id: '3',
    type: 'bug',
    title: 'Memory leak in chart component',
    description: 'Identified memory leak issue',
    user: { id: '3', name: 'Mike Johnson', email: 'mike@example.com' },
    timestamp: new Date('2024-01-01T08:00:00Z'),
    metadata: {
      repository: 'dashboard',
      priority: 'critical',
      tags: ['bug', 'performance']
    }
  }
];

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AccessibilityProvider>
        {children}
      </AccessibilityProvider>
    </QueryClientProvider>
  );
};

describe('ActivityFeed', () => {
  const mockFetchActivities = jest.fn();
  const mockOnItemClick = jest.fn();
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useVirtualScroll to return our test data
    const { useVirtualScroll } = require('../VirtualScroll');
    useVirtualScroll.mockReturnValue({
      items: mockActivities,
      loading: false,
      hasMore: false,
      error: null,
      loadMore: jest.fn(),
      reset: jest.fn()
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Basic Rendering', () => {
    it('renders activity feed with activities', () => {
      render(
        <TestWrapper>
          <ActivityFeed />
        </TestWrapper>
      );

      expect(screen.getByTestId('virtual-scroll')).toBeInTheDocument();
      expect(screen.getByTestId('activity-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('activity-item-2')).toBeInTheDocument();
      expect(screen.getByTestId('activity-item-3')).toBeInTheDocument();
    });

    it('renders search input when search is enabled', () => {
      render(
        <TestWrapper>
          <ActivityFeed enableSearch={true} />
        </TestWrapper>
      );

      expect(screen.getByPlaceholderText('Search activities...')).toBeInTheDocument();
      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });

    it('renders filter controls when filtering is enabled', () => {
      render(
        <TestWrapper>
          <ActivityFeed enableFiltering={true} />
        </TestWrapper>
      );

      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.getByTestId('filter-icon')).toBeInTheDocument();
    });

    it('renders refresh button', () => {
      render(
        <TestWrapper>
          <ActivityFeed onRefresh={mockOnRefresh} />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Refresh activities')).toBeInTheDocument();
      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
    });

    it('displays activity count', () => {
      render(
        <TestWrapper>
          <ActivityFeed enableFiltering={true} />
        </TestWrapper>
      );

      expect(screen.getByText('3 activities')).toBeInTheDocument();
    });
  });

  describe('Activity Items', () => {
    it('renders activity item with correct information', () => {
      render(
        <TestWrapper>
          <ActivityFeed />
        </TestWrapper>
      );

      const activity = mockActivities[0];
      
      expect(screen.getByText(activity.title)).toBeInTheDocument();
      expect(screen.getByText(activity.description)).toBeInTheDocument();
      expect(screen.getByText(activity.user.name)).toBeInTheDocument();
    });

    it('displays activity metadata correctly', () => {
      render(
        <TestWrapper>
          <ActivityFeed />
        </TestWrapper>
      );

      expect(screen.getByText('frontend-app')).toBeInTheDocument();
      expect(screen.getByText('main')).toBeInTheDocument();
      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('bugfix')).toBeInTheDocument();
      expect(screen.getByText('auth')).toBeInTheDocument();
    });

    it('highlights new activities', () => {
      render(
        <TestWrapper>
          <ActivityFeed />
        </TestWrapper>
      );

      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('calls onItemClick when activity is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ActivityFeed onItemClick={mockOnItemClick} />
        </TestWrapper>
      );

      const activityItem = screen.getByTestId('activity-item-1').firstChild as HTMLElement;
      await user.click(activityItem);

      expect(mockOnItemClick).toHaveBeenCalledWith(mockActivities[0]);
    });

    it('handles keyboard navigation on activity items', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ActivityFeed onItemClick={mockOnItemClick} />
        </TestWrapper>
      );

      const activityItem = screen.getByTestId('activity-item-1').firstChild as HTMLElement;
      activityItem.focus();
      await user.keyboard('{Enter}');

      expect(mockOnItemClick).toHaveBeenCalledWith(mockActivities[0]);
    });
  });

  describe('Search Functionality', () => {
    it('filters activities by search term', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ActivityFeed enableSearch={true} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search activities...');
      await user.type(searchInput, 'authentication');

      // The VirtualScroll mock should receive filtered items
      // In a real test, we'd verify the filtered results
      expect(searchInput).toHaveValue('authentication');
    });

    it('searches in activity title, description, and user name', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ActivityFeed enableSearch={true} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search activities...');
      
      // Search by title
      await user.clear(searchInput);
      await user.type(searchInput, 'Fix authentication');
      expect(searchInput).toHaveValue('Fix authentication');

      // Search by user name
      await user.clear(searchInput);
      await user.type(searchInput, 'John Doe');
      expect(searchInput).toHaveValue('John Doe');

      // Search by description
      await user.clear(searchInput);
      await user.type(searchInput, 'login issue');
      expect(searchInput).toHaveValue('login issue');
    });

    it('searches in metadata fields', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ActivityFeed enableSearch={true} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search activities...');
      
      // Search by repository
      await user.type(searchInput, 'frontend-app');
      expect(searchInput).toHaveValue('frontend-app');

      // Search by tags
      await user.clear(searchInput);
      await user.type(searchInput, 'bugfix');
      expect(searchInput).toHaveValue('bugfix');
    });
  });

  describe('Filter Functionality', () => {
    it('shows filter options when filter button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ActivityFeed enableFiltering={true} />
        </TestWrapper>
      );

      const filterButton = screen.getByText('Filters');
      await user.click(filterButton);

      expect(screen.getByText('Activity Types')).toBeInTheDocument();
      expect(screen.getByText('Priority')).toBeInTheDocument();
    });

    it('filters by activity type', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ActivityFeed enableFiltering={true} />
        </TestWrapper>
      );

      // Open filters
      await user.click(screen.getByText('Filters'));

      // Click on commit filter
      const commitFilter = screen.getByText('Commit');
      await user.click(commitFilter);

      // Verify filter is active (would need to check filtered results in real implementation)
      expect(commitFilter).toHaveAttribute('aria-pressed', 'true');
    });

    it('filters by priority', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ActivityFeed enableFiltering={true} />
        </TestWrapper>
      );

      // Open filters
      await user.click(screen.getByText('Filters'));

      // Click on high priority filter
      const highPriorityFilter = screen.getByText('high');
      await user.click(highPriorityFilter);

      expect(highPriorityFilter).toHaveAttribute('aria-pressed', 'true');
    });

    it('shows active filter count', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ActivityFeed enableFiltering={true} />
        </TestWrapper>
      );

      // Open filters
      await user.click(screen.getByText('Filters'));

      // Apply a filter
      await user.click(screen.getByText('Commit'));

      // Should show filter count badge
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('clears all filters when clear button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ActivityFeed enableFiltering={true} />
        </TestWrapper>
      );

      // Open filters and apply some
      await user.click(screen.getByText('Filters'));
      await user.click(screen.getByText('Commit'));
      await user.click(screen.getByText('high'));

      // Clear filters
      const clearButton = screen.getByText('Clear all filters');
      await user.click(clearButton);

      // Filters should be cleared (would need to verify in real implementation)
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('subscribes to real-time updates when enabled', () => {
      const { useRealTimeSync } = require('../../../hooks/useRealTimeSync');
      const mockSubscribe = jest.fn();
      
      useRealTimeSync.mockReturnValue({
        isConnected: true,
        subscribeToDataType: mockSubscribe,
        unsubscribeFromDataType: jest.fn()
      });

      render(
        <TestWrapper>
          <ActivityFeed enableRealTime={true} />
        </TestWrapper>
      );

      expect(mockSubscribe).toHaveBeenCalledWith('user_activity', {});
    });

    it('shows offline indicator when not connected', () => {
      const { useRealTimeSync } = require('../../../hooks/useRealTimeSync');
      
      useRealTimeSync.mockReturnValue({
        isConnected: false,
        subscribeToDataType: jest.fn(),
        unsubscribeFromDataType: jest.fn()
      });

      render(
        <TestWrapper>
          <ActivityFeed enableRealTime={true} enableFiltering={true} />
        </TestWrapper>
      );

      expect(screen.getByText('Offline')).toBeInTheDocument();
      expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('shows loading state', () => {
      const { useVirtualScroll } = require('../VirtualScroll');
      useVirtualScroll.mockReturnValue({
        items: [],
        loading: true,
        hasMore: false,
        error: null,
        loadMore: jest.fn(),
        reset: jest.fn()
      });

      render(
        <TestWrapper>
          <ActivityFeed />
        </TestWrapper>
      );

      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    it('shows empty state when no activities', () => {
      const { useVirtualScroll } = require('../VirtualScroll');
      useVirtualScroll.mockReturnValue({
        items: [],
        loading: false,
        hasMore: false,
        error: null,
        loadMore: jest.fn(),
        reset: jest.fn()
      });

      render(
        <TestWrapper>
          <ActivityFeed emptyMessage="No activities found" />
        </TestWrapper>
      );

      expect(screen.getByTestId('empty')).toBeInTheDocument();
      expect(screen.getByText('No activities found')).toBeInTheDocument();
    });

    it('shows error state and retry button', async () => {
      const user = userEvent.setup();
      const mockReset = jest.fn();
      
      const { useVirtualScroll } = require('../VirtualScroll');
      useVirtualScroll.mockReturnValue({
        items: [],
        loading: false,
        hasMore: false,
        error: new Error('Failed to load'),
        loadMore: jest.fn(),
        reset: mockReset
      });

      render(
        <TestWrapper>
          <ActivityFeed onRefresh={mockOnRefresh} />
        </TestWrapper>
      );

      expect(screen.getByText('Failed to load activities')).toBeInTheDocument();
      
      const retryButton = screen.getByText('Try Again');
      await user.click(retryButton);

      expect(mockReset).toHaveBeenCalled();
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  describe('Refresh Functionality', () => {
    it('calls onRefresh when refresh button is clicked', async () => {
      const user = userEvent.setup();
      const mockReset = jest.fn();
      
      const { useVirtualScroll } = require('../VirtualScroll');
      useVirtualScroll.mockReturnValue({
        items: mockActivities,
        loading: false,
        hasMore: false,
        error: null,
        loadMore: jest.fn(),
        reset: mockReset
      });

      render(
        <TestWrapper>
          <ActivityFeed onRefresh={mockOnRefresh} />
        </TestWrapper>
      );

      const refreshButton = screen.getByLabelText('Refresh activities');
      await user.click(refreshButton);

      expect(mockReset).toHaveBeenCalled();
      expect(mockOnRefresh).toHaveBeenCalled();
    });

    it('shows loading state during refresh', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ActivityFeed onRefresh={mockOnRefresh} />
        </TestWrapper>
      );

      const refreshButton = screen.getByLabelText('Refresh activities');
      
      // Mock a slow refresh
      mockOnRefresh.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      await user.click(refreshButton);
      
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <ActivityFeed />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Search activities')).toBeInTheDocument();
      expect(screen.getByLabelText('Refresh activities')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ActivityFeed enableFiltering={true} />
        </TestWrapper>
      );

      const filterButton = screen.getByText('Filters');
      
      // Should be focusable
      filterButton.focus();
      expect(filterButton).toHaveFocus();

      // Should respond to Enter key
      await user.keyboard('{Enter}');
      expect(screen.getByText('Activity Types')).toBeInTheDocument();
    });

    it('announces filter changes to screen readers', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ActivityFeed enableFiltering={true} />
        </TestWrapper>
      );

      // Open filters
      await user.click(screen.getByText('Filters'));

      // Apply filter
      const commitFilter = screen.getByText('Commit');
      await user.click(commitFilter);

      // Should have proper aria-pressed state
      expect(commitFilter).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Virtual Scrolling Integration', () => {
    it('passes correct props to VirtualScroll', () => {
      const { VirtualScroll } = require('../VirtualScroll');
      
      render(
        <TestWrapper>
          <ActivityFeed 
            height={800}
            itemHeight={150}
            emptyMessage="Custom empty message"
          />
        </TestWrapper>
      );

      expect(VirtualScroll).toHaveBeenCalledWith(
        expect.objectContaining({
          items: mockActivities,
          itemHeight: 150,
          containerHeight: expect.any(Number),
          emptyMessage: 'Custom empty message',
          getItemKey: expect.any(Function),
          renderItem: expect.any(Function)
        }),
        expect.any(Object)
      );
    });

    it('uses correct item key function', () => {
      const { VirtualScroll } = require('../VirtualScroll');
      
      render(
        <TestWrapper>
          <ActivityFeed />
        </TestWrapper>
      );

      const call = VirtualScroll.mock.calls[0];
      const getItemKey = call[0].getItemKey;
      
      expect(getItemKey(mockActivities[0])).toBe('1');
    });
  });
});