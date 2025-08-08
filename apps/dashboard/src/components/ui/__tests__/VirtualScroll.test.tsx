/**
 * VirtualScroll Component Tests
 * Comprehensive tests for virtual scrolling functionality and accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { VirtualScroll, useVirtualScroll } from '../VirtualScroll';
import { AccessibilityProvider } from '../../../contexts/AccessibilityContext';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock providers
const MockProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AccessibilityProvider>
    {children}
  </AccessibilityProvider>
);

// Test data
const generateTestItems = (count: number) => 
  Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    description: `Description for item ${i}`,
  }));

const TestItem: React.FC<{ item: any; index: number }> = ({ item, index }) => (
  <div className="p-4 border-b" data-testid={`item-${index}`}>
    <h3>{item.name}</h3>
    <p>{item.description}</p>
  </div>
);

describe('VirtualScroll Component', () => {
  const defaultProps = {
    items: generateTestItems(100),
    itemHeight: 80,
    containerHeight: 400,
    renderItem: TestItem,
  };

  describe('Basic Rendering', () => {
    it('renders virtual scroll container', () => {
      render(
        <MockProviders>
          <VirtualScroll {...defaultProps} />
        </MockProviders>
      );
      
      const container = screen.getByRole('listbox');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('aria-label', 'Virtual scroll list with 100 items');
    });

    it('renders only visible items', () => {
      render(
        <MockProviders>
          <VirtualScroll {...defaultProps} />
        </MockProviders>
      );
      
      // Should only render visible items + overscan
      const visibleItems = screen.getAllByTestId(/^item-/);
      expect(visibleItems.length).toBeLessThan(defaultProps.items.length);
      expect(visibleItems.length).toBeGreaterThan(0);
    });

    it('applies custom className', () => {
      render(
        <MockProviders>
          <VirtualScroll {...defaultProps} className="custom-scroll" />
        </MockProviders>
      );
      
      const container = screen.getByRole('listbox');
      expect(container).toHaveClass('custom-scroll');
    });

    it('sets correct container height', () => {
      render(
        <MockProviders>
          <VirtualScroll {...defaultProps} />
        </MockProviders>
      );
      
      const container = screen.getByRole('listbox');
      expect(container).toHaveStyle({ height: '400px' });
    });
  });

  describe('Scrolling Behavior', () => {
    it('updates visible items on scroll', async () => {
      render(
        <MockProviders>
          <VirtualScroll {...defaultProps} />
        </MockProviders>
      );
      
      const container = screen.getByRole('listbox');
      
      // Initial state - should show items starting from 0
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      
      // Scroll down
      fireEvent.scroll(container, { target: { scrollTop: 400 } });
      
      await waitFor(() => {
        // Should now show different items
        const visibleItems = screen.getAllByTestId(/^item-/);
        expect(visibleItems.length).toBeGreaterThan(0);
      });
    });

    it('calls onScroll callback', () => {
      const onScroll = jest.fn();
      render(
        <MockProviders>
          <VirtualScroll {...defaultProps} onScroll={onScroll} />
        </MockProviders>
      );
      
      const container = screen.getByRole('listbox');
      fireEvent.scroll(container, { target: { scrollTop: 200 } });
      
      expect(onScroll).toHaveBeenCalledWith(200);
    });

    it('handles overscan correctly', () => {
      render(
        <MockProviders>
          <VirtualScroll {...defaultProps} overscan={2} />
        </MockProviders>
      );
      
      const visibleItems = screen.getAllByTestId(/^item-/);
      expect(visibleItems.length).toBeGreaterThan(5); // Should include overscan items
    });
  });

  describe('Keyboard Navigation', () => {
    it('navigates with arrow keys', async () => {
      const user = userEvent.setup();
      render(
        <MockProviders>
          <VirtualScroll {...defaultProps} />
        </MockProviders>
      );
      
      const container = screen.getByRole('listbox');
      container.focus();
      
      // Arrow down should scroll to next item
      await user.keyboard('{ArrowDown}');
      
      await waitFor(() => {
        expect(container.scrollTop).toBeGreaterThan(0);
      });
    });

    it('navigates with page up/down keys', async () => {
      const user = userEvent.setup();
      render(
        <MockProviders>
          <VirtualScroll {...defaultProps} />
        </MockProviders>
      );
      
      const container = screen.getByRole('listbox');
      container.focus();
      
      // Page down should scroll by container height
      await user.keyboard('{PageDown}');
      
      await waitFor(() => {
        expect(container.scrollTop).toBeGreaterThan(0);
      });
    });

    it('navigates to home and end', async () => {
      const user = userEvent.setup();
      render(
        <MockProviders>
          <VirtualScroll {...defaultProps} />
        </MockProviders>
      );
      
      const container = screen.getByRole('listbox');
      container.focus();
      
      // End key should scroll to bottom
      await user.keyboard('{End}');
      
      await waitFor(() => {
        expect(container.scrollTop).toBeGreaterThan(0);
      });
      
      // Home key should scroll to top
      await user.keyboard('{Home}');
      
      await waitFor(() => {
        expect(container.scrollTop).toBe(0);
      });
    });
  });

  describe('Infinite Loading', () => {
    it('calls loadMore when near bottom', async () => {
      const loadMore = jest.fn();
      render(
        <MockProviders>
          <VirtualScroll 
            {...defaultProps} 
            loadMore={loadMore}
            hasMore={true}
          />
        </MockProviders>
      );
      
      const container = screen.getByRole('listbox');
      
      // Scroll near bottom
      const scrollHeight = defaultProps.items.length * defaultProps.itemHeight;
      fireEvent.scroll(container, { 
        target: { 
          scrollTop: scrollHeight - 200,
          scrollHeight,
          clientHeight: defaultProps.containerHeight,
        } 
      });
      
      await waitFor(() => {
        expect(loadMore).toHaveBeenCalled();
      });
    });

    it('shows loading indicator when loading', () => {
      render(
        <MockProviders>
          <VirtualScroll 
            {...defaultProps} 
            loading={true}
            hasMore={true}
          />
        </MockProviders>
      );
      
      expect(screen.getByRole('status', { name: /loading more items/i })).toBeInTheDocument();
      expect(screen.getByText('Loading more...')).toBeInTheDocument();
    });

    it('does not call loadMore when loading', () => {
      const loadMore = jest.fn();
      render(
        <MockProviders>
          <VirtualScroll 
            {...defaultProps} 
            loadMore={loadMore}
            hasMore={true}
            loading={true}
          />
        </MockProviders>
      );
      
      const container = screen.getByRole('listbox');
      
      // Scroll near bottom while loading
      const scrollHeight = defaultProps.items.length * defaultProps.itemHeight;
      fireEvent.scroll(container, { 
        target: { 
          scrollTop: scrollHeight - 200,
          scrollHeight,
          clientHeight: defaultProps.containerHeight,
        } 
      });
      
      expect(loadMore).not.toHaveBeenCalled();
    });

    it('does not call loadMore when no more items', () => {
      const loadMore = jest.fn();
      render(
        <MockProviders>
          <VirtualScroll 
            {...defaultProps} 
            loadMore={loadMore}
            hasMore={false}
          />
        </MockProviders>
      );
      
      const container = screen.getByRole('listbox');
      
      // Scroll to bottom
      const scrollHeight = defaultProps.items.length * defaultProps.itemHeight;
      fireEvent.scroll(container, { 
        target: { 
          scrollTop: scrollHeight - 200,
          scrollHeight,
          clientHeight: defaultProps.containerHeight,
        } 
      });
      
      expect(loadMore).not.toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no items', () => {
      render(
        <MockProviders>
          <VirtualScroll 
            {...defaultProps} 
            items={[]}
            emptyMessage="No data available"
          />
        </MockProviders>
      );
      
      expect(screen.getByRole('status', { name: /no data available/i })).toBeInTheDocument();
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('shows default empty message', () => {
      render(
        <MockProviders>
          <VirtualScroll 
            {...defaultProps} 
            items={[]}
          />
        </MockProviders>
      );
      
      expect(screen.getByText('No items to display')).toBeInTheDocument();
    });

    it('does not show empty state when loading', () => {
      render(
        <MockProviders>
          <VirtualScroll 
            {...defaultProps} 
            items={[]}
            loading={true}
          />
        </MockProviders>
      );
      
      expect(screen.queryByText('No items to display')).not.toBeInTheDocument();
    });
  });

  describe('Item Keys', () => {
    it('uses getItemKey when provided', () => {
      const getItemKey = jest.fn((item, index) => `key-${item.id}`);
      render(
        <MockProviders>
          <VirtualScroll 
            {...defaultProps} 
            getItemKey={getItemKey}
          />
        </MockProviders>
      );
      
      expect(getItemKey).toHaveBeenCalled();
    });

    it('uses index as key when getItemKey not provided', () => {
      render(
        <MockProviders>
          <VirtualScroll {...defaultProps} />
        </MockProviders>
      );
      
      // Should render without errors
      const visibleItems = screen.getAllByTestId(/^item-/);
      expect(visibleItems.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should not have any accessibility violations', async () => {
      const { container } = render(
        <MockProviders>
          <VirtualScroll {...defaultProps} />
        </MockProviders>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper ARIA attributes', () => {
      render(
        <MockProviders>
          <VirtualScroll {...defaultProps} />
        </MockProviders>
      );
      
      const container = screen.getByRole('listbox');
      expect(container).toHaveAttribute('aria-label', 'Virtual scroll list with 100 items');
      expect(container).toHaveAttribute('aria-live', 'polite');
      expect(container).toHaveAttribute('tabIndex', '0');
    });

    it('sets aria-busy when loading', () => {
      render(
        <MockProviders>
          <VirtualScroll {...defaultProps} loading={true} />
        </MockProviders>
      );
      
      const container = screen.getByRole('listbox');
      expect(container).toHaveAttribute('aria-busy', 'true');
    });

    it('sets proper ARIA attributes on items', () => {
      render(
        <MockProviders>
          <VirtualScroll {...defaultProps} />
        </MockProviders>
      );
      
      const firstItem = screen.getByTestId('item-0').parentElement;
      expect(firstItem).toHaveAttribute('role', 'option');
      expect(firstItem).toHaveAttribute('aria-posinset', '1');
      expect(firstItem).toHaveAttribute('aria-setsize', '100');
    });

    it('is focusable', () => {
      render(
        <MockProviders>
          <VirtualScroll {...defaultProps} />
        </MockProviders>
      );
      
      const container = screen.getByRole('listbox');
      container.focus();
      expect(container).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('handles large datasets efficiently', () => {
      const largeDataset = generateTestItems(10000);
      
      render(
        <MockProviders>
          <VirtualScroll 
            {...defaultProps} 
            items={largeDataset}
          />
        </MockProviders>
      );
      
      // Should only render visible items, not all 10000
      const visibleItems = screen.getAllByTestId(/^item-/);
      expect(visibleItems.length).toBeLessThan(50);
    });

    it('updates efficiently on scroll', () => {
      const onScroll = jest.fn();
      render(
        <MockProviders>
          <VirtualScroll {...defaultProps} onScroll={onScroll} />
        </MockProviders>
      );
      
      const container = screen.getByRole('listbox');
      
      // Multiple rapid scrolls
      fireEvent.scroll(container, { target: { scrollTop: 100 } });
      fireEvent.scroll(container, { target: { scrollTop: 200 } });
      fireEvent.scroll(container, { target: { scrollTop: 300 } });
      
      expect(onScroll).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge Cases', () => {
    it('handles zero items', () => {
      render(
        <MockProviders>
          <VirtualScroll 
            {...defaultProps} 
            items={[]}
          />
        </MockProviders>
      );
      
      expect(screen.getByText('No items to display')).toBeInTheDocument();
    });

    it('handles single item', () => {
      render(
        <MockProviders>
          <VirtualScroll 
            {...defaultProps} 
            items={[generateTestItems(1)[0]]}
          />
        </MockProviders>
      );
      
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
    });

    it('handles very small container height', () => {
      render(
        <MockProviders>
          <VirtualScroll 
            {...defaultProps} 
            containerHeight={50}
          />
        </MockProviders>
      );
      
      const container = screen.getByRole('listbox');
      expect(container).toHaveStyle({ height: '50px' });
    });

    it('handles item height larger than container', () => {
      render(
        <MockProviders>
          <VirtualScroll 
            {...defaultProps} 
            itemHeight={500}
            containerHeight={200}
          />
        </MockProviders>
      );
      
      // Should still render without errors
      const visibleItems = screen.getAllByTestId(/^item-/);
      expect(visibleItems.length).toBeGreaterThan(0);
    });
  });
});

describe('useVirtualScroll Hook', () => {
  const TestComponent: React.FC<{
    fetchMore: (offset: number, limit: number) => Promise<any[]>;
    itemsPerPage?: number;
  }> = ({ fetchMore, itemsPerPage }) => {
    const { items, loading, hasMore, error, loadMore, reset } = useVirtualScroll(
      generateTestItems(10),
      fetchMore,
      itemsPerPage
    );

    return (
      <div>
        <div data-testid="items-count">{items.length}</div>
        <div data-testid="loading">{loading.toString()}</div>
        <div data-testid="has-more">{hasMore.toString()}</div>
        <div data-testid="error">{error?.message || 'none'}</div>
        <button onClick={loadMore} data-testid="load-more">Load More</button>
        <button onClick={reset} data-testid="reset">Reset</button>
      </div>
    );
  };

  it('initializes with initial items', () => {
    const fetchMore = jest.fn().mockResolvedValue([]);
    
    render(<TestComponent fetchMore={fetchMore} />);
    
    expect(screen.getByTestId('items-count')).toHaveTextContent('10');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('has-more')).toHaveTextContent('true');
    expect(screen.getByTestId('error')).toHaveTextContent('none');
  });

  it('loads more items successfully', async () => {
    const fetchMore = jest.fn().mockResolvedValue(generateTestItems(5));
    
    render(<TestComponent fetchMore={fetchMore} />);
    
    const loadMoreButton = screen.getByTestId('load-more');
    fireEvent.click(loadMoreButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('items-count')).toHaveTextContent('15');
    });
    
    expect(fetchMore).toHaveBeenCalledWith(10, 50);
  });

  it('sets hasMore to false when no more items', async () => {
    const fetchMore = jest.fn().mockResolvedValue([]);
    
    render(<TestComponent fetchMore={fetchMore} />);
    
    const loadMoreButton = screen.getByTestId('load-more');
    fireEvent.click(loadMoreButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('has-more')).toHaveTextContent('false');
    });
  });

  it('handles fetch errors', async () => {
    const fetchMore = jest.fn().mockRejectedValue(new Error('Fetch failed'));
    
    render(<TestComponent fetchMore={fetchMore} />);
    
    const loadMoreButton = screen.getByTestId('load-more');
    fireEvent.click(loadMoreButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Fetch failed');
    });
  });

  it('prevents multiple simultaneous loads', async () => {
    const fetchMore = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(generateTestItems(5)), 100))
    );
    
    render(<TestComponent fetchMore={fetchMore} />);
    
    const loadMoreButton = screen.getByTestId('load-more');
    
    // Click multiple times rapidly
    fireEvent.click(loadMoreButton);
    fireEvent.click(loadMoreButton);
    fireEvent.click(loadMoreButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    
    // Should only call fetchMore once
    expect(fetchMore).toHaveBeenCalledTimes(1);
  });

  it('resets state correctly', async () => {
    const fetchMore = jest.fn().mockResolvedValue(generateTestItems(5));
    
    render(<TestComponent fetchMore={fetchMore} />);
    
    // Load more items first
    const loadMoreButton = screen.getByTestId('load-more');
    fireEvent.click(loadMoreButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('items-count')).toHaveTextContent('15');
    });
    
    // Reset
    const resetButton = screen.getByTestId('reset');
    fireEvent.click(resetButton);
    
    expect(screen.getByTestId('items-count')).toHaveTextContent('10');
    expect(screen.getByTestId('has-more')).toHaveTextContent('true');
    expect(screen.getByTestId('error')).toHaveTextContent('none');
  });

  it('uses custom items per page', async () => {
    const fetchMore = jest.fn().mockResolvedValue(generateTestItems(3));
    
    render(<TestComponent fetchMore={fetchMore} itemsPerPage={3} />);
    
    const loadMoreButton = screen.getByTestId('load-more');
    fireEvent.click(loadMoreButton);
    
    await waitFor(() => {
      expect(fetchMore).toHaveBeenCalledWith(10, 3);
    });
  });
});