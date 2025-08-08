import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { motion } from 'framer-motion';

export interface PaginationConfig {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface SearchPaginationProps {
  pagination: PaginationConfig;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
  showPageSizeSelector?: boolean;
  showItemCount?: boolean;
  showQuickJump?: boolean;
  pageSizeOptions?: number[];
}

const SearchPagination: React.FC<SearchPaginationProps> = ({
  pagination,
  onPageChange,
  onPageSizeChange,
  className = '',
  showPageSizeSelector = true,
  showItemCount = true,
  showQuickJump = false,
  pageSizeOptions = [10, 20, 50, 100]
}) => {
  const { page, pageSize, totalItems, totalPages } = pagination;

  // Calculate visible page numbers
  const getVisiblePages = (): number[] => {
    const delta = 2; // Number of pages to show on each side of current page
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];

    for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
      range.push(i);
    }

    if (page - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (page + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots.filter((item, index, arr) => {
      // Remove duplicate 1s and last pages
      if (typeof item === 'number') {
        return arr.indexOf(item) === index;
      }
      return true;
    }) as number[];
  };

  const visiblePages = getVisiblePages();
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      onPageChange(newPage);
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    if (newPageSize !== pageSize) {
      onPageSizeChange(newPageSize);
      // Adjust current page to maintain position
      const currentItem = (page - 1) * pageSize + 1;
      const newPage = Math.ceil(currentItem / newPageSize);
      onPageChange(newPage);
    }
  };

  if (totalPages <= 1 && !showItemCount) {
    return null;
  }

  return (
    <div className={`flex items-center justify-between bg-white border-t border-gray-200 px-4 py-3 ${className}`}>
      {/* Item count and page size selector */}
      <div className="flex items-center gap-4">
        {showItemCount && (
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{startItem}</span> to{' '}
            <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{totalItems}</span> results
          </div>
        )}

        {showPageSizeSelector && totalItems > Math.min(...pageSizeOptions) && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Show:</label>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-700">per page</span>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First page button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handlePageChange(1)}
            disabled={page === 1}
            className="p-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="First page"
          >
            <ChevronsLeft size={16} />
          </motion.button>

          {/* Previous page button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="p-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <ChevronLeft size={16} />
          </motion.button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {visiblePages.map((pageNum, index) => (
              <React.Fragment key={index}>
                {pageNum === '...' ? (
                  <span className="px-3 py-2 text-gray-500">...</span>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePageChange(pageNum as number)}
                    className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                      page === pageNum
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </motion.button>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Next page button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            className="p-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <ChevronRight size={16} />
          </motion.button>

          {/* Last page button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handlePageChange(totalPages)}
            disabled={page === totalPages}
            className="p-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Last page"
          >
            <ChevronsRight size={16} />
          </motion.button>

          {/* Quick jump input */}
          {showQuickJump && totalPages > 10 && (
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm text-gray-700">Go to:</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                className="w-16 px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const target = e.target as HTMLInputElement;
                    const newPage = parseInt(target.value);
                    if (newPage >= 1 && newPage <= totalPages) {
                      handlePageChange(newPage);
                      target.value = '';
                    }
                  }
                }}
                placeholder={page.toString()}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchPagination;