import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext';

interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  getItemKey?: (item: T, index: number) => string | number;
  loadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  emptyMessage?: string;
}

export function VirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
  getItemKey,
  loadMore,
  hasMore = false,
  loading = false,
  emptyMessage = 'No items to display',
}: VirtualScrollProps<T>) {
  const { settings, announceToScreenReader } = useAccessibility();
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight),
      items.length
    );

    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length, end + overscan),
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index,
    }));
  }, [items, visibleRange]);

  // Handle scroll
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    setIsScrolling(true);
    onScroll?.(newScrollTop);

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set scrolling to false after scroll ends
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);

    // Load more items if near bottom
    if (loadMore && hasMore && !loading) {
      const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
      if (scrollTop + clientHeight >= scrollHeight - itemHeight * 5) {
        loadMore();
      }
    }
  }, [onScroll, loadMore, hasMore, loading, itemHeight]);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!settings.keyboardNavigation) return;

    const currentIndex = Math.floor(scrollTop / itemHeight);
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        newIndex = Math.min(items.length - 1, currentIndex + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        newIndex = Math.max(0, currentIndex - 1);
        break;
      case 'PageDown':
        event.preventDefault();
        newIndex = Math.min(
          items.length - 1,
          currentIndex + Math.floor(containerHeight / itemHeight)
        );
        break;
      case 'PageUp':
        event.preventDefault();
        newIndex = Math.max(
          0,
          currentIndex - Math.floor(containerHeight / itemHeight)
        );
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = items.length - 1;
        break;
      default:
        return;
    }

    if (newIndex !== currentIndex) {
      const newScrollTop = newIndex * itemHeight;
      scrollElementRef.current?.scrollTo({
        top: newScrollTop,
        behavior: settings.reducedMotion ? 'auto' : 'smooth',
      });

      // Announce navigation for screen readers
      if (settings.screenReaderMode) {
        announceToScreenReader(
          `Navigated to item ${newIndex + 1} of ${items.length}`,
          'polite'
        );
      }
    }
  }, [
    settings.keyboardNavigation,
    settings.reducedMotion,
    settings.screenReaderMode,
    scrollTop,
    itemHeight,
    items.length,
    containerHeight,
    announceToScreenReader,
  ]);

  // Scroll to item programmatically
  const scrollToItem = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const targetScrollTop = index * itemHeight;
    scrollElementRef.current?.scrollTo({
      top: targetScrollTop,
      behavior: settings.reducedMotion ? 'auto' : behavior,
    });
  }, [itemHeight, settings.reducedMotion]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Empty state
  if (items.length === 0 && !loading) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height: containerHeight }}
        role="status"
        aria-label={emptyMessage}
      >
        <div className="text-center text-gray-500 dark:text-gray-400">
          <svg
            className="w-12 h-12 mx-auto mb-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="listbox"
      aria-label={`Virtual scroll list with ${items.length} items`}
      aria-live="polite"
      aria-busy={loading}
    >
      {/* Total height container */}
      <div
        style={{
          height: items.length * itemHeight,
          position: 'relative',
        }}
      >
        {/* Visible items */}
        {visibleItems.map(({ item, index }) => (
          <div
            key={getItemKey ? getItemKey(item, index) : index}
            style={{
              position: 'absolute',
              top: index * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
            role="option"
            aria-posinset={index + 1}
            aria-setsize={items.length}
          >
            {renderItem(item, index)}
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div
            style={{
              position: 'absolute',
              top: items.length * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
            className="flex items-center justify-center"
            role="status"
            aria-label="Loading more items"
          >
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Loading more...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Scroll indicator for screen readers */}
      {settings.screenReaderMode && (
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {isScrolling && (
            <span>
              Scrolling through items {visibleRange.start + 1} to {visibleRange.end} of {items.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Hook for virtual scroll with infinite loading
export const useVirtualScroll = <T,>(
  initialItems: T[],
  fetchMore: (offset: number, limit: number) => Promise<T[]>,
  itemsPerPage: number = 50
) => {
  const [items, setItems] = useState<T[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const newItems = await fetchMore(items.length, itemsPerPage);
      
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems(prev => [...prev, ...newItems]);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [items.length, loading, hasMore, fetchMore, itemsPerPage]);

  const reset = useCallback(() => {
    setItems(initialItems);
    setHasMore(true);
    setError(null);
    setLoading(false);
  }, [initialItems]);

  return {
    items,
    loading,
    hasMore,
    error,
    loadMore,
    reset,
  };
};

export default VirtualScroll;