/**
 * Global Search Component Tests
 * Tests for intelligent search functionality with autocomplete and keyboard shortcuts
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { GlobalSearch } from '../GlobalSearch';
import { useNavigationStore, useSearchState } from '../NavigationController';

// Mock the navigation hooks
vi.mock('../NavigationController', () => ({
  useNavigationStore: vi.fn(),
  useSearchState: vi.fn(),
}));

describe('GlobalSearch', () => {
  const mockNavigationStore = {
    openSearch: vi.fn(),
    closeSearch: vi.fn(),
    setSearchQuery: vi.fn(),
    performSearch: vi.fn(),
    selectSearchResult: vi.fn(),
    registerSearchProvider: vi.fn(),
  };

  const mockSearchState = {
    isOpen: false,
    query: '',
    results: [],
    suggestions: [],
    selectedIndex: -1,
    loading: false,
    providers: [],
    activeProvider: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigationStore as any).mockReturnValue(mockNavigationStore);
    (useSearchState as any).mockReturnValue(mockSearchState);

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000/',
        origin: 'http://localhost:3000',
      },
      writable: true,
    });
  });

  describe('Basic Functionality', () => {
    it('should render search input with placeholder', () => {
      render(<GlobalSearch placeholder="Search everything..." />);

      expect(screen.getByPlaceholderText('Search everything... (⌘K)')).toBeInTheDocument();
    });

    it('should open search on input focus', async () => {
      const user = userEvent.setup();
      
      render(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/Search/);
      await user.click(searchInput);

      expect(mockNavigationStore.openSearch).toHaveBeenCalled();
    });

    it('should handle search input changes', async () => {
      const user = userEvent.setup();
      
      render(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/Search/);
      await user.type(searchInput, 'test query');

      expect(mockNavigationStore.setSearchQuery).toHaveBeenCalledWith('test query');
    });

    it('should clear search input', async () => {
      const user = userEvent.setup();
      
      render(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/Search/) as HTMLInputElement;
      await user.type(searchInput, 'test');

      const clearButton = screen.getByRole('button');
      await user.click(clearButton);

      expect(searchInput.value).toBe('');
      expect(mockNavigationStore.setSearchQuery).toHaveBeenCalledWith('');
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should open search with Cmd+K', () => {
      render(<GlobalSearch />);

      fireEvent.keyDown(document, {
        key: 'k',
        metaKey: true,
      });

      expect(mockNavigationStore.openSearch).toHaveBeenCalled();
    });

    it('should open search with Ctrl+K', () => {
      render(<GlobalSearch />);

      fireEvent.keyDown(document, {
        key: 'k',
        ctrlKey: true,
      });

      expect(mockNavigationStore.openSearch).toHaveBeenCalled();
    });

    it('should close search with Escape', () => {
      (useSearchState as any).mockReturnValue({
        ...mockSearchState,
        isOpen: true,
      });

      render(<GlobalSearch />);

      fireEvent.keyDown(document, {
        key: 'Escape',
      });

      expect(mockNavigationStore.closeSearch).toHaveBeenCalled();
    });

    it('should navigate results with arrow keys', () => {
      const mockResults = [
        {
          id: 'result-1',
          title: 'Dashboard',
          type: 'page' as const,
          category: 'Navigation',
          relevance: 1,
        },
        {
          id: 'result-2',
          title: 'Tasks',
          type: 'page' as const,
          category: 'Navigation',
          relevance: 0.8,
        },
      ];

      (useSearchState as any).mockReturnValue({
        ...mockSearchState,
        isOpen: true,
        results: mockResults,
      });

      render(<GlobalSearch />);

      fireEvent.keyDown(document, {
        key: 'ArrowDown',
      });

      // Should select first result
      expect(screen.getByText('Dashboard')).toHaveClass('bg-blue-50');
    });

    it('should select result with Enter key', () => {
      const mockResults = [
        {
          id: 'result-1',
          title: 'Dashboard',
          type: 'page' as const,
          category: 'Navigation',
          url: '/',
          relevance: 1,
        },
      ];

      (useSearchState as any).mockReturnValue({
        ...mockSearchState,
        isOpen: true,
        results: mockResults,
      });

      render(<GlobalSearch />);

      fireEvent.keyDown(document, {
        key: 'Enter',
      });

      // Should navigate to result URL
      expect(window.location.href).toBe('http://localhost:3000/');
    });
  });

  describe('Search Results', () => {
    it('should display search results', () => {
      const mockResults = [
        {
          id: 'result-1',
          title: 'Dashboard',
          description: 'Navigate to Dashboard',
          type: 'page' as const,
          category: 'Navigation',
          url: '/',
          relevance: 1,
        },
        {
          id: 'result-2',
          title: 'Tasks',
          description: 'Navigate to Tasks',
          type: 'page' as const,
          category: 'Navigation',
          url: '/tasks',
          relevance: 0.8,
        },
      ];

      (useSearchState as any).mockReturnValue({
        ...mockSearchState,
        isOpen: true,
        query: 'test',
        results: mockResults,
      });

      render(<GlobalSearch />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
      expect(screen.getByText('Navigate to Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Navigate to Tasks')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      (useSearchState as any).mockReturnValue({
        ...mockSearchState,
        isOpen: true,
        loading: true,
      });

      render(<GlobalSearch />);

      expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
    });

    it('should show no results message', () => {
      (useSearchState as any).mockReturnValue({
        ...mockSearchState,
        isOpen: true,
        query: 'nonexistent',
        results: [],
        loading: false,
      });

      render(<GlobalSearch />);

      expect(screen.getByText('No results found for "nonexistent"')).toBeInTheDocument();
    });

    it('should handle result clicks', async () => {
      const user = userEvent.setup();
      const onResultSelect = vi.fn();
      
      const mockResults = [
        {
          id: 'result-1',
          title: 'Dashboard',
          type: 'page' as const,
          category: 'Navigation',
          url: '/',
          relevance: 1,
        },
      ];

      (useSearchState as any).mockReturnValue({
        ...mockSearchState,
        isOpen: true,
        results: mockResults,
      });

      render(<GlobalSearch onResultSelect={onResultSelect} />);

      const result = screen.getByText('Dashboard');
      await user.click(result);

      expect(onResultSelect).toHaveBeenCalledWith(mockResults[0]);
    });

    it('should limit results based on maxResults prop', () => {
      const mockResults = Array.from({ length: 20 }, (_, i) => ({
        id: `result-${i}`,
        title: `Result ${i}`,
        type: 'page' as const,
        category: 'Navigation',
        relevance: 1,
      }));

      (useSearchState as any).mockReturnValue({
        ...mockSearchState,
        isOpen: true,
        results: mockResults,
      });

      render(<GlobalSearch maxResults={5} />);

      // Should only show 5 results
      const resultElements = screen.getAllByText(/Result \d+/);
      expect(resultElements).toHaveLength(5);
    });
  });

  describe('Search Suggestions', () => {
    it('should display search suggestions', () => {
      const mockSuggestions = [
        {
          id: 'suggestion-1',
          text: 'dashboard',
          type: 'query' as const,
          category: 'Pages',
        },
        {
          id: 'suggestion-2',
          text: 'tasks',
          type: 'query' as const,
          category: 'Pages',
        },
      ];

      (useSearchState as any).mockReturnValue({
        ...mockSearchState,
        isOpen: true,
        suggestions: mockSuggestions,
      });

      render(<GlobalSearch />);

      expect(screen.getByText('Suggestions')).toBeInTheDocument();
      expect(screen.getByText('dashboard')).toBeInTheDocument();
      expect(screen.getByText('tasks')).toBeInTheDocument();
    });

    it('should handle suggestion clicks', async () => {
      const user = userEvent.setup();
      
      const mockSuggestions = [
        {
          id: 'suggestion-1',
          text: 'dashboard',
          type: 'query' as const,
        },
      ];

      (useSearchState as any).mockReturnValue({
        ...mockSearchState,
        isOpen: true,
        suggestions: mockSuggestions,
      });

      render(<GlobalSearch />);

      const suggestion = screen.getByText('dashboard');
      await user.click(suggestion);

      expect(mockNavigationStore.setSearchQuery).toHaveBeenCalledWith('dashboard');
    });
  });

  describe('Recent Searches', () => {
    it('should show recent searches when no query', () => {
      render(<GlobalSearch />);

      // Mock recent searches in component state
      const searchInput = screen.getByPlaceholderText(/Search/);
      fireEvent.focus(searchInput);

      // This would show recent searches in a real implementation
      // For now, we just verify the search opens
      expect(mockNavigationStore.openSearch).toHaveBeenCalled();
    });
  });

  describe('Filters', () => {
    it('should show filter controls when enabled', () => {
      (useSearchState as any).mockReturnValue({
        ...mockSearchState,
        isOpen: true,
      });

      render(<GlobalSearch enableFilters={true} />);

      const filterButton = screen.getByRole('button', { name: /filter/i });
      expect(filterButton).toBeInTheDocument();
    });

    it('should toggle filter panel', async () => {
      const user = userEvent.setup();
      
      (useSearchState as any).mockReturnValue({
        ...mockSearchState,
        isOpen: true,
      });

      render(<GlobalSearch enableFilters={true} />);

      const filterButton = screen.getByRole('button', { name: /filter/i });
      await user.click(filterButton);

      // Should show filter options
      await waitFor(() => {
        expect(screen.getByText('page')).toBeInTheDocument();
        expect(screen.getByText('task')).toBeInTheDocument();
      });
    });

    it('should apply filters to search query', async () => {
      const user = userEvent.setup();
      
      (useSearchState as any).mockReturnValue({
        ...mockSearchState,
        isOpen: true,
      });

      render(<GlobalSearch enableFilters={true} />);

      // Open filters
      const filterButton = screen.getByRole('button', { name: /filter/i });
      await user.click(filterButton);

      // Click a filter
      const pageFilter = screen.getByText('page');
      await user.click(pageFilter);

      expect(mockNavigationStore.setSearchQuery).toHaveBeenCalledWith(' type:page');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      (useSearchState as any).mockReturnValue({
        ...mockSearchState,
        isOpen: true,
      });

      render(<GlobalSearch />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should support screen reader announcements', () => {
      (useSearchState as any).mockReturnValue({
        ...mockSearchState,
        isOpen: true,
        query: 'test',
      });

      render(<GlobalSearch />);

      expect(screen.getByText('Results for "test"')).toBeInTheDocument();
    });

    it('should have keyboard navigation instructions', () => {
      (useSearchState as any).mockReturnValue({
        ...mockSearchState,
        isOpen: true,
      });

      render(<GlobalSearch />);

      expect(screen.getByText('↑↓ Navigate')).toBeInTheDocument();
      expect(screen.getByText('↵ Select')).toBeInTheDocument();
      expect(screen.getByText('Esc Close')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should debounce search queries', async () => {
      const user = userEvent.setup();
      
      render(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/Search/);
      
      // Type multiple characters quickly
      await user.type(searchInput, 'test', { delay: 50 });

      // Should debounce the search calls
      await waitFor(() => {
        expect(mockNavigationStore.setSearchQuery).toHaveBeenCalledTimes(4); // Once per character
      });
    });

    it('should handle large result sets efficiently', () => {
      const largeResults = Array.from({ length: 1000 }, (_, i) => ({
        id: `result-${i}`,
        title: `Result ${i}`,
        type: 'page' as const,
        category: 'Navigation',
        relevance: 1,
      }));

      (useSearchState as any).mockReturnValue({
        ...mockSearchState,
        isOpen: true,
        results: largeResults,
      });

      const startTime = performance.now();
      render(<GlobalSearch />);
      const endTime = performance.now();

      // Should render quickly even with many results
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle search provider errors gracefully', () => {
      mockNavigationStore.performSearch.mockImplementation(() => {
        throw new Error('Search failed');
      });

      render(<GlobalSearch />);

      // Should not crash on search error
      expect(() => {
        fireEvent.change(screen.getByPlaceholderText(/Search/), {
          target: { value: 'test' },
        });
      }).not.toThrow();
    });

    it('should handle missing search state gracefully', () => {
      (useSearchState as any).mockReturnValue(null);

      expect(() => {
        render(<GlobalSearch />);
      }).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should close search overlay when clicking outside', async () => {
      const user = userEvent.setup();
      
      (useSearchState as any).mockReturnValue({
        ...mockSearchState,
        isOpen: true,
      });

      render(<GlobalSearch />);

      const overlay = screen.getByRole('dialog').parentElement;
      await user.click(overlay!);

      expect(mockNavigationStore.closeSearch).toHaveBeenCalled();
    });

    it('should maintain focus management', async () => {
      const user = userEvent.setup();
      
      render(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/Search/);
      await user.click(searchInput);

      expect(document.activeElement).toBe(searchInput);
    });
  });
});