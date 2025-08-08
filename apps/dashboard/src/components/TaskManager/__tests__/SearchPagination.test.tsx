import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SearchPagination, { PaginationConfig } from '../SearchPagination';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

describe('SearchPagination', () => {
  const defaultPagination: PaginationConfig = {
    page: 1,
    pageSize: 20,
    totalItems: 100,
    totalPages: 5
  };

  const defaultProps = {
    pagination: defaultPagination,
    onPageChange: jest.fn(),
    onPageSizeChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders pagination controls correctly', () => {
      render(<SearchPagination {...defaultProps} />);
      
      expect(screen.getByText('Showing 1 to 20 of 100 results')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('renders page size selector when enabled', () => {
      render(<SearchPagination {...defaultProps} showPageSizeSelector={true} />);
      
      expect(screen.getByText('Show:')).toBeInTheDocument();
      expect(screen.getByText('per page')).toBeInTheDocument();
      expect(screen.getByDisplayValue('20')).toBeInTheDocument();
    });

    it('hides page size selector when disabled', () => {
      render(<SearchPagination {...defaultProps} showPageSizeSelector={false} />);
      
      expect(screen.queryByText('Show:')).not.toBeInTheDocument();
      expect(screen.queryByText('per page')).not.toBeInTheDocument();
    });

    it('hides item count when disabled', () => {
      render(<SearchPagination {...defaultProps} showItemCount={false} />);
      
      expect(screen.queryByText(/Showing \d+ to \d+ of \d+ results/)).not.toBeInTheDocument();
    });

    it('shows quick jump when enabled and many pages', () => {
      const manyPagesPagination = {
        ...defaultPagination,
        totalPages: 15
      };

      render(
        <SearchPagination 
          {...defaultProps} 
          pagination={manyPagesPagination}
          showQuickJump={true} 
        />
      );
      
      expect(screen.getByText('Go to:')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('1')).toBeInTheDocument();
    });

    it('does not render when only one page and no item count', () => {
      const singlePagePagination = {
        page: 1,
        pageSize: 20,
        totalItems: 10,
        totalPages: 1
      };

      const { container } = render(
        <SearchPagination 
          pagination={singlePagePagination}
          onPageChange={jest.fn()}
          onPageSizeChange={jest.fn()}
          showItemCount={false}
        />
      );
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Page Navigation', () => {
    it('calls onPageChange when page number is clicked', async () => {
      const user = userEvent.setup();
      render(<SearchPagination {...defaultProps} />);
      
      await user.click(screen.getByText('3'));
      
      expect(defaultProps.onPageChange).toHaveBeenCalledWith(3);
    });

    it('calls onPageChange when next button is clicked', async () => {
      const user = userEvent.setup();
      render(<SearchPagination {...defaultProps} />);
      
      const nextButton = screen.getByTitle('Next page');
      await user.click(nextButton);
      
      expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
    });

    it('calls onPageChange when previous button is clicked', async () => {
      const currentPagePagination = {
        ...defaultPagination,
        page: 3
      };

      const user = userEvent.setup();
      render(<SearchPagination {...defaultProps} pagination={currentPagePagination} />);
      
      const prevButton = screen.getByTitle('Previous page');
      await user.click(prevButton);
      
      expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
    });

    it('calls onPageChange when first page button is clicked', async () => {
      const currentPagePagination = {
        ...defaultPagination,
        page: 3
      };

      const user = userEvent.setup();
      render(<SearchPagination {...defaultProps} pagination={currentPagePagination} />);
      
      const firstButton = screen.getByTitle('First page');
      await user.click(firstButton);
      
      expect(defaultProps.onPageChange).toHaveBeenCalledWith(1);
    });

    it('calls onPageChange when last page button is clicked', async () => {
      const user = userEvent.setup();
      render(<SearchPagination {...defaultProps} />);
      
      const lastButton = screen.getByTitle('Last page');
      await user.click(lastButton);
      
      expect(defaultProps.onPageChange).toHaveBeenCalledWith(5);
    });

    it('disables previous buttons on first page', () => {
      render(<SearchPagination {...defaultProps} />);
      
      const firstButton = screen.getByTitle('First page');
      const prevButton = screen.getByTitle('Previous page');
      
      expect(firstButton).toBeDisabled();
      expect(prevButton).toBeDisabled();
    });

    it('disables next buttons on last page', () => {
      const lastPagePagination = {
        ...defaultPagination,
        page: 5
      };

      render(<SearchPagination {...defaultProps} pagination={lastPagePagination} />);
      
      const nextButton = screen.getByTitle('Next page');
      const lastButton = screen.getByTitle('Last page');
      
      expect(nextButton).toBeDisabled();
      expect(lastButton).toBeDisabled();
    });

    it('highlights current page', () => {
      const currentPagePagination = {
        ...defaultPagination,
        page: 3
      };

      render(<SearchPagination {...defaultProps} pagination={currentPagePagination} />);
      
      const currentPageButton = screen.getByText('3');
      expect(currentPageButton).toHaveClass('bg-blue-600');
    });
  });

  describe('Page Size Selection', () => {
    it('calls onPageSizeChange when page size is changed', async () => {
      const user = userEvent.setup();
      render(<SearchPagination {...defaultProps} showPageSizeSelector={true} />);
      
      const pageSizeSelect = screen.getByDisplayValue('20');
      await user.selectOptions(pageSizeSelect, '50');
      
      expect(defaultProps.onPageSizeChange).toHaveBeenCalledWith(50);
    });

    it('uses custom page size options', () => {
      render(
        <SearchPagination 
          {...defaultProps} 
          showPageSizeSelector={true}
          pageSizeOptions={[5, 15, 25, 50]}
        />
      );
      
      const pageSizeSelect = screen.getByDisplayValue('20');
      const options = Array.from(pageSizeSelect.querySelectorAll('option')).map(option => option.value);
      
      expect(options).toEqual(['5', '15', '25', '50']);
    });

    it('hides page size selector when total items is less than minimum option', () => {
      const smallPagination = {
        page: 1,
        pageSize: 5,
        totalItems: 8,
        totalPages: 2
      };

      render(
        <SearchPagination 
          pagination={smallPagination}
          onPageChange={jest.fn()}
          onPageSizeChange={jest.fn()}
          showPageSizeSelector={true}
          pageSizeOptions={[10, 20, 50]}
        />
      );
      
      expect(screen.queryByText('Show:')).not.toBeInTheDocument();
    });
  });

  describe('Quick Jump', () => {
    it('handles quick jump to valid page', async () => {
      const user = userEvent.setup();
      const manyPagesPagination = {
        ...defaultPagination,
        totalPages: 15
      };

      render(
        <SearchPagination 
          {...defaultProps} 
          pagination={manyPagesPagination}
          showQuickJump={true} 
        />
      );
      
      const jumpInput = screen.getByPlaceholderText('1');
      await user.type(jumpInput, '7');
      await user.keyboard('{Enter}');
      
      expect(defaultProps.onPageChange).toHaveBeenCalledWith(7);
    });

    it('ignores quick jump to invalid page', async () => {
      const user = userEvent.setup();
      const manyPagesPagination = {
        ...defaultPagination,
        totalPages: 15
      };

      render(
        <SearchPagination 
          {...defaultProps} 
          pagination={manyPagesPagination}
          showQuickJump={true} 
        />
      );
      
      const jumpInput = screen.getByPlaceholderText('1');
      await user.type(jumpInput, '20');
      await user.keyboard('{Enter}');
      
      expect(defaultProps.onPageChange).not.toHaveBeenCalled();
    });

    it('clears input after successful jump', async () => {
      const user = userEvent.setup();
      const manyPagesPagination = {
        ...defaultPagination,
        totalPages: 15
      };

      render(
        <SearchPagination 
          {...defaultProps} 
          pagination={manyPagesPagination}
          showQuickJump={true} 
        />
      );
      
      const jumpInput = screen.getByPlaceholderText('1') as HTMLInputElement;
      await user.type(jumpInput, '7');
      await user.keyboard('{Enter}');
      
      expect(jumpInput.value).toBe('');
    });
  });

  describe('Page Number Display', () => {
    it('shows ellipsis for large page ranges', () => {
      const manyPagesPagination = {
        page: 10,
        pageSize: 20,
        totalItems: 500,
        totalPages: 25
      };

      render(<SearchPagination {...defaultProps} pagination={manyPagesPagination} />);
      
      expect(screen.getByText('...')).toBeInTheDocument();
    });

    it('shows correct page range around current page', () => {
      const middlePagePagination = {
        page: 10,
        pageSize: 20,
        totalItems: 500,
        totalPages: 25
      };

      render(<SearchPagination {...defaultProps} pagination={middlePagePagination} />);
      
      // Should show pages around current page (8, 9, 10, 11, 12)
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('9')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('11')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('shows first and last pages', () => {
      const middlePagePagination = {
        page: 10,
        pageSize: 20,
        totalItems: 500,
        totalPages: 25
      };

      render(<SearchPagination {...defaultProps} pagination={middlePagePagination} />);
      
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('handles edge case with few pages', () => {
      const fewPagesPagination = {
        page: 2,
        pageSize: 20,
        totalItems: 60,
        totalPages: 3
      };

      render(<SearchPagination {...defaultProps} pagination={fewPagesPagination} />);
      
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.queryByText('...')).not.toBeInTheDocument();
    });
  });

  describe('Item Count Display', () => {
    it('shows correct item range for first page', () => {
      render(<SearchPagination {...defaultProps} />);
      
      expect(screen.getByText('Showing 1 to 20 of 100 results')).toBeInTheDocument();
    });

    it('shows correct item range for middle page', () => {
      const middlePagePagination = {
        page: 3,
        pageSize: 20,
        totalItems: 100,
        totalPages: 5
      };

      render(<SearchPagination {...defaultProps} pagination={middlePagePagination} />);
      
      expect(screen.getByText('Showing 41 to 60 of 100 results')).toBeInTheDocument();
    });

    it('shows correct item range for last page', () => {
      const lastPagePagination = {
        page: 5,
        pageSize: 20,
        totalItems: 95,
        totalPages: 5
      };

      render(<SearchPagination {...defaultProps} pagination={lastPagePagination} />);
      
      expect(screen.getByText('Showing 81 to 95 of 95 results')).toBeInTheDocument();
    });

    it('handles single item correctly', () => {
      const singleItemPagination = {
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1
      };

      render(<SearchPagination {...defaultProps} pagination={singleItemPagination} />);
      
      expect(screen.getByText('Showing 1 to 1 of 1 results')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero total items', () => {
      const emptyPagination = {
        page: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0
      };

      render(<SearchPagination {...defaultProps} pagination={emptyPagination} />);
      
      expect(screen.getByText('Showing 1 to 0 of 0 results')).toBeInTheDocument();
    });

    it('handles single page with few items', () => {
      const fewItemsPagination = {
        page: 1,
        pageSize: 20,
        totalItems: 5,
        totalPages: 1
      };

      render(<SearchPagination {...defaultProps} pagination={fewItemsPagination} />);
      
      expect(screen.getByText('Showing 1 to 5 of 5 results')).toBeInTheDocument();
    });

    it('prevents navigation to invalid pages', async () => {
      const user = userEvent.setup();
      render(<SearchPagination {...defaultProps} />);
      
      // Try to click the same page
      await user.click(screen.getByText('1'));
      
      expect(defaultProps.onPageChange).not.toHaveBeenCalled();
    });

    it('handles page size change with current position adjustment', async () => {
      const user = userEvent.setup();
      const onPageChange = jest.fn();
      const onPageSizeChange = jest.fn();
      
      const currentPagePagination = {
        page: 3,
        pageSize: 20,
        totalItems: 100,
        totalPages: 5
      };

      render(
        <SearchPagination 
          pagination={currentPagePagination}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          showPageSizeSelector={true}
        />
      );
      
      const pageSizeSelect = screen.getByDisplayValue('20');
      await user.selectOptions(pageSizeSelect, '50');
      
      expect(onPageSizeChange).toHaveBeenCalledWith(50);
      expect(onPageChange).toHaveBeenCalledWith(2); // Adjusted page
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for navigation buttons', () => {
      render(<SearchPagination {...defaultProps} />);
      
      expect(screen.getByTitle('First page')).toBeInTheDocument();
      expect(screen.getByTitle('Previous page')).toBeInTheDocument();
      expect(screen.getByTitle('Next page')).toBeInTheDocument();
      expect(screen.getByTitle('Last page')).toBeInTheDocument();
    });

    it('has proper labels for form controls', () => {
      render(<SearchPagination {...defaultProps} showPageSizeSelector={true} />);
      
      expect(screen.getByText('Show:')).toBeInTheDocument();
      expect(screen.getByText('per page')).toBeInTheDocument();
    });

    it('maintains keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<SearchPagination {...defaultProps} />);
      
      // Tab through navigation buttons
      await user.tab();
      expect(document.activeElement).toHaveAttribute('title', 'First page');
      
      await user.tab();
      expect(document.activeElement).toHaveAttribute('title', 'Previous page');
    });

    it('supports keyboard navigation for quick jump', async () => {
      const user = userEvent.setup();
      const manyPagesPagination = {
        ...defaultPagination,
        totalPages: 15
      };

      render(
        <SearchPagination 
          {...defaultProps} 
          pagination={manyPagesPagination}
          showQuickJump={true} 
        />
      );
      
      const jumpInput = screen.getByPlaceholderText('1');
      jumpInput.focus();
      
      expect(document.activeElement).toBe(jumpInput);
    });
  });

  describe('Performance', () => {
    it('renders efficiently with many pages', () => {
      const manyPagesPagination = {
        page: 50,
        pageSize: 20,
        totalItems: 2000,
        totalPages: 100
      };

      const startTime = performance.now();
      
      render(<SearchPagination {...defaultProps} pagination={manyPagesPagination} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render quickly even with many pages
      expect(renderTime).toBeLessThan(50);
    });

    it('does not re-render unnecessarily', () => {
      const { rerender } = render(<SearchPagination {...defaultProps} />);
      
      // Re-render with same props
      rerender(<SearchPagination {...defaultProps} />);
      
      // Should not cause issues
      expect(screen.getByText('Showing 1 to 20 of 100 results')).toBeInTheDocument();
    });
  });
});