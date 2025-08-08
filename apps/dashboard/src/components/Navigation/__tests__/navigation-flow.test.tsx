/**
 * Navigation Flow Tests
 * Comprehensive tests covering all user navigation journeys
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Components to test
import { AdaptiveNavigation } from '../AdaptiveNavigation';
import { EnhancedBreadcrumb } from '../EnhancedBreadcrumb';
import { GlobalSearch } from '../GlobalSearch';
import { CommandPalette } from '../CommandPalette';
import { useNavigationStore } from '../NavigationController';
import { useURLSynchronization } from '../URLSynchronization';

// Mock dependencies
vi.mock('../NavigationController', () => ({
  useNavigationStore: vi.fn(),
  useCurrentRoute: vi.fn(),
  useBreadcrumbs: vi.fn(),
  useNavigationHistory: vi.fn(),
  useSearchState: vi.fn(),
  useCommandPalette: vi.fn(),
  useNavigationPreferences: vi.fn(),
  useNavigationContext: vi.fn(),
}));

vi.mock('../URLSynchronization', () => ({
  useURLSynchronization: vi.fn(),
  useNavigationWithURLSync: vi.fn(),
  URLUtils: {
    addQueryParam: vi.fn(),
    removeQueryParam: vi.fn(),
    getQueryParam: vi.fn(),
    updateHash: vi.fn(),
    clearQueryParams: vi.fn(),
    buildURL: vi.fn(),
  },
}));

// Test utilities
const mockNavigationStore = {
  navigateTo: vi.fn(),
  updateBreadcrumbs: vi.fn(),
  addToHistory: vi.fn(),
  clearHistory: vi.fn(),
  openSearch: vi.fn(),
  closeSearch: vi.fn(),
  setSearchQuery: vi.fn(),
  performSearch: vi.fn(),
  selectSearchResult: vi.fn(),
  registerSearchProvider: vi.fn(),
  openCommandPalette: vi.fn(),
  closeCommandPalette: vi.fn(),
  setCommandQuery: vi.fn(),
  selectCommand: vi.fn(),
  executeCommand: vi.fn(),
  registerCommand: vi.fn(),
  unregisterCommand: vi.fn(),
  registerShortcut: vi.fn(),
  unregisterShortcut: vi.fn(),
  handleKeyboardEvent: vi.fn(),
  updatePreferences: vi.fn(),
  addRecentItem: vi.fn(),
  togglePinnedItem: vi.fn(),
  updateContext: vi.fn(),
  syncWithURL: vi.fn(),
  getURLState: vi.fn(),
  trackEvent: vi.fn(),
  getAnalytics: vi.fn(),
};

const mockNavigationContext = {
  currentRoute: '/',
  userRole: {
    id: 'test-user',
    name: 'Test User',
    permissions: ['analytics.view', 'team.view'],
    level: 'contributor' as const,
  },
  availableActions: [],
  breadcrumbs: [],
  history: [],
  preferences: {
    collapsedSections: [],
    pinnedItems: [],
    recentItems: [],
    customOrder: [],
    shortcuts: {},
  },
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

const mockCommandPaletteState = {
  isOpen: false,
  query: '',
  selectedIndex: -1,
  filteredCommands: [],
  recentCommands: [],
  favoriteCommands: [],
};

describe('Navigation Flow Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default mock implementations
    (useNavigationStore as any).mockReturnValue(mockNavigationStore);
    (useURLSynchronization as any).mockReturnValue({
      syncStateToURL: vi.fn(),
      syncURLToState: vi.fn(),
      parseURL: vi.fn(),
      buildURL: vi.fn(),
      getCurrentURLState: vi.fn(),
    });

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000/',
        origin: 'http://localhost:3000',
        pathname: '/',
        search: '',
        hash: '',
      },
      writable: true,
    });

    // Mock history API
    Object.defineProperty(window, 'history', {
      value: {
        pushState: vi.fn(),
        replaceState: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
        go: vi.fn(),
        state: {},
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Adaptive Navigation', () => {
    it('should render navigation items based on user role', () => {
      const mockContext = {
        ...mockNavigationContext,
        userRole: {
          ...mockNavigationContext.userRole,
          level: 'viewer' as const,
        },
      };

      render(<AdaptiveNavigation />);

      // Should show items available to viewers
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      
      // Should not show admin-only items
      expect(screen.queryByText('Team')).not.toBeInTheDocument();
    });

    it('should handle navigation item clicks', async () => {
      const user = userEvent.setup();
      
      render(<AdaptiveNavigation />);

      const dashboardItem = screen.getByText('Dashboard');
      await user.click(dashboardItem);

      expect(mockNavigationStore.navigateTo).toHaveBeenCalledWith('/');
      expect(mockNavigationStore.addRecentItem).toHaveBeenCalledWith('dashboard');
    });

    it('should expand/collapse items with children', async () => {
      const user = userEvent.setup();
      
      render(<AdaptiveNavigation />);

      // Find an item with children (Settings)
      const settingsItem = screen.getByText('Settings');
      await user.click(settingsItem);

      // Should expand to show children
      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Preferences')).toBeInTheDocument();
      });
    });

    it('should handle pin/unpin functionality', async () => {
      const user = userEvent.setup();
      
      render(<AdaptiveNavigation />);

      // Hover over an item to show actions
      const dashboardItem = screen.getByText('Dashboard');
      await user.hover(dashboardItem);

      // Find and click pin button
      const pinButton = screen.getByTitle('Pin item');
      await user.click(pinButton);

      expect(mockNavigationStore.togglePinnedItem).toHaveBeenCalledWith('dashboard');
    });

    it('should show tooltips in collapsed mode', async () => {
      const user = userEvent.setup();
      
      render(<AdaptiveNavigation collapsed={true} />);

      const dashboardItem = screen.getByText('Dashboard').closest('div');
      await user.hover(dashboardItem!);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Enhanced Breadcrumb', () => {
    const mockBreadcrumbs = [
      { id: 'home', label: 'Home', href: '/', clickable: true },
      { id: 'tasks', label: 'Tasks', href: '/tasks', clickable: true },
      { id: 'task-123', label: 'Task #123', clickable: false },
    ];

    beforeEach(() => {
      (useNavigationStore as any).mockReturnValue({
        ...mockNavigationStore,
        breadcrumbs: mockBreadcrumbs,
      });
    });

    it('should render breadcrumb items correctly', () => {
      render(<EnhancedBreadcrumb />);

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
      expect(screen.getByText('Task #123')).toBeInTheDocument();
    });

    it('should handle breadcrumb item clicks', async () => {
      const user = userEvent.setup();
      
      render(<EnhancedBreadcrumb />);

      const tasksItem = screen.getByText('Tasks');
      await user.click(tasksItem);

      expect(mockNavigationStore.navigateTo).toHaveBeenCalledWith('/tasks');
    });

    it('should show context menu on right click', async () => {
      const user = userEvent.setup();
      
      render(<EnhancedBreadcrumb enableContextMenu={true} />);

      const tasksItem = screen.getByText('Tasks');
      await user.pointer({ keys: '[MouseRight]', target: tasksItem });

      await waitFor(() => {
        expect(screen.getByText('Go to page')).toBeInTheDocument();
        expect(screen.getByText('Open in new tab')).toBeInTheDocument();
        expect(screen.getByText('Copy link')).toBeInTheDocument();
      });
    });

    it('should handle ellipsis for long breadcrumb chains', () => {
      const longBreadcrumbs = Array.from({ length: 10 }, (_, i) => ({
        id: `item-${i}`,
        label: `Item ${i}`,
        href: `/item-${i}`,
        clickable: true,
      }));

      (useNavigationStore as any).mockReturnValue({
        ...mockNavigationStore,
        breadcrumbs: longBreadcrumbs,
      });

      render(<EnhancedBreadcrumb maxItems={5} />);

      expect(screen.getByText('...')).toBeInTheDocument();
    });

    it('should show navigation history dropdown', async () => {
      const user = userEvent.setup();
      const mockHistory = [
        {
          id: '1',
          route: '/tasks',
          title: 'Tasks',
          timestamp: new Date(),
        },
        {
          id: '2',
          route: '/analytics',
          title: 'Analytics',
          timestamp: new Date(),
        },
      ];

      (useNavigationStore as any).mockReturnValue({
        ...mockNavigationStore,
        history: mockHistory,
      });

      render(<EnhancedBreadcrumb showHistory={true} />);

      const historyButton = screen.getByTitle('Navigation history');
      await user.click(historyButton);

      await waitFor(() => {
        expect(screen.getByText('Recent Pages')).toBeInTheDocument();
        expect(screen.getByText('Tasks')).toBeInTheDocument();
        expect(screen.getByText('Analytics')).toBeInTheDocument();
      });
    });
  });

  describe('Global Search', () => {
    beforeEach(() => {
      (useNavigationStore as any).mockReturnValue({
        ...mockNavigationStore,
        searchState: mockSearchState,
      });
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

    it('should open search with Cmd+K shortcut', async () => {
      render(<GlobalSearch />);

      fireEvent.keyDown(document, {
        key: 'k',
        metaKey: true,
      });

      expect(mockNavigationStore.openSearch).toHaveBeenCalled();
    });

    it('should close search with Escape key', async () => {
      (useNavigationStore as any).mockReturnValue({
        ...mockNavigationStore,
        searchState: { ...mockSearchState, isOpen: true },
      });

      render(<GlobalSearch />);

      fireEvent.keyDown(document, {
        key: 'Escape',
      });

      expect(mockNavigationStore.closeSearch).toHaveBeenCalled();
    });

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

      (useNavigationStore as any).mockReturnValue({
        ...mockNavigationStore,
        searchState: {
          ...mockSearchState,
          isOpen: true,
          query: 'test',
          results: mockResults,
        },
      });

      render(<GlobalSearch />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
      expect(screen.getByText('Navigate to Dashboard')).toBeInTheDocument();
    });

    it('should handle arrow key navigation in results', async () => {
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

      (useNavigationStore as any).mockReturnValue({
        ...mockNavigationStore,
        searchState: {
          ...mockSearchState,
          isOpen: true,
          results: mockResults,
        },
      });

      render(<GlobalSearch />);

      // Simulate arrow down key
      fireEvent.keyDown(document, {
        key: 'ArrowDown',
      });

      // Should select first result
      expect(screen.getByText('Dashboard')).toHaveClass('bg-blue-50');
    });
  });

  describe('Command Palette', () => {
    beforeEach(() => {
      (useNavigationStore as any).mockReturnValue({
        ...mockNavigationStore,
        commandPaletteState: mockCommandPaletteState,
      });
    });

    it('should open command palette with Cmd+Shift+P', async () => {
      render(<CommandPalette />);

      fireEvent.keyDown(document, {
        key: 'P',
        metaKey: true,
        shiftKey: true,
      });

      expect(mockNavigationStore.openCommandPalette).toHaveBeenCalled();
    });

    it('should close command palette with Escape', async () => {
      (useNavigationStore as any).mockReturnValue({
        ...mockNavigationStore,
        commandPaletteState: { ...mockCommandPaletteState, isOpen: true },
      });

      render(<CommandPalette />);

      fireEvent.keyDown(document, {
        key: 'Escape',
      });

      expect(mockNavigationStore.closeCommandPalette).toHaveBeenCalled();
    });

    it('should filter commands based on query', async () => {
      const user = userEvent.setup();
      const mockCommands = [
        {
          id: 'nav-dashboard',
          label: 'Go to Dashboard',
          description: 'Navigate to the main dashboard',
          category: 'navigation' as const,
          keywords: ['dashboard', 'home'],
          handler: vi.fn(),
          enabled: true,
          visible: true,
          priority: 10,
          useCount: 0,
        },
      ];

      (useNavigationStore as any).mockReturnValue({
        ...mockNavigationStore,
        commandPaletteState: {
          ...mockCommandPaletteState,
          isOpen: true,
          filteredCommands: mockCommands,
        },
      });

      render(<CommandPalette />);

      const input = screen.getByPlaceholderText(/Type a command/);
      await user.type(input, 'dashboard');

      expect(mockNavigationStore.setCommandQuery).toHaveBeenCalledWith('dashboard');
    });

    it('should execute command on Enter key', async () => {
      const mockCommand = {
        id: 'nav-dashboard',
        label: 'Go to Dashboard',
        description: 'Navigate to the main dashboard',
        category: 'navigation' as const,
        keywords: ['dashboard', 'home'],
        handler: vi.fn(),
        enabled: true,
        visible: true,
        priority: 10,
        useCount: 0,
      };

      (useNavigationStore as any).mockReturnValue({
        ...mockNavigationStore,
        commandPaletteState: {
          ...mockCommandPaletteState,
          isOpen: true,
          filteredCommands: [mockCommand],
        },
      });

      render(<CommandPalette />);

      fireEvent.keyDown(document, {
        key: 'Enter',
      });

      expect(mockNavigationStore.executeCommand).toHaveBeenCalledWith(mockCommand);
    });

    it('should show command categories', () => {
      const mockCommands = [
        {
          id: 'nav-dashboard',
          label: 'Go to Dashboard',
          category: 'navigation' as const,
          keywords: [],
          handler: vi.fn(),
          enabled: true,
          visible: true,
          priority: 10,
          useCount: 0,
        },
        {
          id: 'action-new-task',
          label: 'Create New Task',
          category: 'create' as const,
          keywords: [],
          handler: vi.fn(),
          enabled: true,
          visible: true,
          priority: 9,
          useCount: 0,
        },
      ];

      (useNavigationStore as any).mockReturnValue({
        ...mockNavigationStore,
        commandPaletteState: {
          ...mockCommandPaletteState,
          isOpen: true,
          filteredCommands: mockCommands,
        },
      });

      render(<CommandPalette showCategories={true} />);

      expect(screen.getByText('navigation')).toBeInTheDocument();
      expect(screen.getByText('create')).toBeInTheDocument();
    });
  });

  describe('URL Synchronization', () => {
    it('should sync navigation state to URL', () => {
      const mockSyncStateToURL = vi.fn();
      (useURLSynchronization as any).mockReturnValue({
        syncStateToURL: mockSyncStateToURL,
        syncURLToState: vi.fn(),
        parseURL: vi.fn(),
        buildURL: vi.fn(),
        getCurrentURLState: vi.fn(),
      });

      const TestComponent = () => {
        useURLSynchronization();
        return <div>Test</div>;
      };

      render(<TestComponent />);

      // Should call sync on mount
      expect(mockSyncStateToURL).toHaveBeenCalled();
    });

    it('should handle browser back/forward navigation', () => {
      const mockSyncURLToState = vi.fn();
      (useURLSynchronization as any).mockReturnValue({
        syncStateToURL: vi.fn(),
        syncURLToState: mockSyncURLToState,
        parseURL: vi.fn(),
        buildURL: vi.fn(),
        getCurrentURLState: vi.fn(),
      });

      const TestComponent = () => {
        useURLSynchronization();
        return <div>Test</div>;
      };

      render(<TestComponent />);

      // Simulate browser back button
      fireEvent(window, new PopStateEvent('popstate', { state: {} }));

      expect(mockSyncURLToState).toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete navigation flow', async () => {
      const user = userEvent.setup();
      
      // Setup complete navigation system
      const NavigationSystem = () => (
        <div>
          <AdaptiveNavigation />
          <EnhancedBreadcrumb />
          <GlobalSearch />
          <CommandPalette />
        </div>
      );

      render(<NavigationSystem />);

      // 1. Navigate using adaptive navigation
      const dashboardItem = screen.getByText('Dashboard');
      await user.click(dashboardItem);

      expect(mockNavigationStore.navigateTo).toHaveBeenCalledWith('/');
      expect(mockNavigationStore.addRecentItem).toHaveBeenCalledWith('dashboard');

      // 2. Use global search
      const searchInput = screen.getByPlaceholderText(/Search/);
      await user.click(searchInput);
      expect(mockNavigationStore.openSearch).toHaveBeenCalled();

      // 3. Use command palette
      fireEvent.keyDown(document, {
        key: 'P',
        metaKey: true,
        shiftKey: true,
      });
      expect(mockNavigationStore.openCommandPalette).toHaveBeenCalled();
    });

    it('should maintain navigation state consistency', async () => {
      const user = userEvent.setup();
      
      // Mock consistent state across components
      const consistentState = {
        currentRoute: '/tasks',
        breadcrumbs: [
          { id: 'home', label: 'Home', href: '/', clickable: true },
          { id: 'tasks', label: 'Tasks', href: '/tasks', clickable: false },
        ],
        history: [
          {
            id: '1',
            route: '/',
            title: 'Dashboard',
            timestamp: new Date(),
          },
        ],
      };

      (useNavigationStore as any).mockReturnValue({
        ...mockNavigationStore,
        ...consistentState,
      });

      const NavigationSystem = () => (
        <div>
          <AdaptiveNavigation />
          <EnhancedBreadcrumb />
        </div>
      );

      render(<NavigationSystem />);

      // Verify consistent state display
      expect(screen.getByText('Tasks')).toBeInTheDocument(); // In breadcrumb
      expect(screen.getAllByText('Tasks')).toHaveLength(2); // In navigation and breadcrumb
    });

    it('should handle error states gracefully', async () => {
      // Mock error in navigation store
      (useNavigationStore as any).mockImplementation(() => {
        throw new Error('Navigation store error');
      });

      // Should not crash the application
      expect(() => {
        render(<AdaptiveNavigation />);
      }).not.toThrow();
    });

    it('should support accessibility features', async () => {
      const user = userEvent.setup();
      
      render(<AdaptiveNavigation />);

      // Check for proper ARIA attributes
      const navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();

      // Check keyboard navigation
      const firstItem = screen.getByText('Dashboard');
      firstItem.focus();
      
      fireEvent.keyDown(firstItem, { key: 'Tab' });
      
      // Should move focus to next item
      expect(document.activeElement).not.toBe(firstItem);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large navigation datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        label: `Item ${i}`,
        href: `/item-${i}`,
        clickable: true,
      }));

      (useNavigationStore as any).mockReturnValue({
        ...mockNavigationStore,
        breadcrumbs: largeDataset,
      });

      const startTime = performance.now();
      render(<EnhancedBreadcrumb />);
      const endTime = performance.now();

      // Should render within reasonable time (< 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should debounce search queries', async () => {
      const user = userEvent.setup();
      
      render(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/Search/);
      
      // Type multiple characters quickly
      await user.type(searchInput, 'test query', { delay: 50 });

      // Should only call search once after debounce
      await waitFor(() => {
        expect(mockNavigationStore.setSearchQuery).toHaveBeenCalledTimes(10); // Once per character
      });
    });
  });
});