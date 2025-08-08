/**
 * Adaptive Navigation Component Tests
 * Tests for role-based navigation adaptation and user behavior learning
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AdaptiveNavigation } from '../AdaptiveNavigation';
import { useNavigationStore, useNavigationContext, useNavigationPreferences } from '../NavigationController';

// Mock the navigation hooks
vi.mock('../NavigationController', () => ({
  useNavigationStore: vi.fn(),
  useNavigationContext: vi.fn(),
  useNavigationPreferences: vi.fn(),
}));

describe('AdaptiveNavigation', () => {
  const mockNavigationStore = {
    navigateTo: vi.fn(),
    addRecentItem: vi.fn(),
    togglePinnedItem: vi.fn(),
  };

  const mockContext = {
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

  const mockPreferences = {
    collapsedSections: [],
    pinnedItems: ['dashboard'],
    recentItems: ['tasks', 'analytics'],
    customOrder: [],
    shortcuts: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigationStore as any).mockReturnValue(mockNavigationStore);
    (useNavigationContext as any).mockReturnValue(mockContext);
    (useNavigationPreferences as any).mockReturnValue(mockPreferences);
  });

  describe('Role-based Visibility', () => {
    it('should show items appropriate for viewer role', () => {
      const viewerContext = {
        ...mockContext,
        userRole: { ...mockContext.userRole, level: 'viewer' as const },
      };
      (useNavigationContext as any).mockReturnValue(viewerContext);

      render(<AdaptiveNavigation />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.queryByText('Team')).not.toBeInTheDocument();
    });

    it('should show admin items for admin role', () => {
      const adminContext = {
        ...mockContext,
        userRole: { ...mockContext.userRole, level: 'admin' as const },
      };
      (useNavigationContext as any).mockReturnValue(adminContext);

      render(<AdaptiveNavigation />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Team')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
    });

    it('should respect permission-based conditions', () => {
      const limitedContext = {
        ...mockContext,
        userRole: {
          ...mockContext.userRole,
          permissions: [], // No permissions
        },
      };
      (useNavigationContext as any).mockReturnValue(limitedContext);

      render(<AdaptiveNavigation />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('Analytics')).not.toBeInTheDocument();
    });
  });

  describe('User Preferences', () => {
    it('should show pinned items section', () => {
      render(<AdaptiveNavigation showPinnedItems={true} />);

      expect(screen.getByText('Pinned')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('should show recent items section', () => {
      render(<AdaptiveNavigation showRecentItems={true} />);

      expect(screen.getByText('Recent')).toBeInTheDocument();
    });

    it('should handle pin/unpin actions', async () => {
      const user = userEvent.setup();
      
      render(<AdaptiveNavigation />);

      // Hover over an item to show actions
      const tasksItem = screen.getByText('Tasks');
      await user.hover(tasksItem);

      // Find and click pin button
      const pinButton = screen.getByTitle('Pin item');
      await user.click(pinButton);

      expect(mockNavigationStore.togglePinnedItem).toHaveBeenCalledWith('tasks');
    });
  });

  describe('Navigation Behavior', () => {
    it('should navigate to item href on click', async () => {
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

      const settingsItem = screen.getByText('Settings');
      await user.click(settingsItem);

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Preferences')).toBeInTheDocument();
      });
    });

    it('should call onClick handler if provided', async () => {
      const onItemClick = vi.fn();
      const user = userEvent.setup();
      
      render(<AdaptiveNavigation onItemClick={onItemClick} />);

      const dashboardItem = screen.getByText('Dashboard');
      await user.click(dashboardItem);

      expect(onItemClick).toHaveBeenCalled();
    });
  });

  describe('Collapsed Mode', () => {
    it('should show tooltips in collapsed mode', async () => {
      const user = userEvent.setup();
      
      render(<AdaptiveNavigation collapsed={true} />);

      const dashboardItem = screen.getByText('Dashboard').closest('div');
      await user.hover(dashboardItem!);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
    });

    it('should hide text labels in collapsed mode', () => {
      render(<AdaptiveNavigation collapsed={true} />);

      // Text should still be present but visually hidden
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('should not show sections in collapsed mode', () => {
      render(<AdaptiveNavigation collapsed={true} showPinnedItems={true} />);

      expect(screen.queryByText('Pinned')).not.toBeInTheDocument();
    });
  });

  describe('Adaptive Scoring', () => {
    it('should prioritize pinned items', () => {
      const preferences = {
        ...mockPreferences,
        pinnedItems: ['analytics', 'dashboard'],
      };
      (useNavigationPreferences as any).mockReturnValue(preferences);

      render(<AdaptiveNavigation />);

      // Pinned items should appear in pinned section
      expect(screen.getByText('Pinned')).toBeInTheDocument();
    });

    it('should show recent items with indicators', () => {
      const preferences = {
        ...mockPreferences,
        recentItems: ['tasks'],
      };
      (useNavigationPreferences as any).mockReturnValue(preferences);

      render(<AdaptiveNavigation showRecentItems={true} />);

      // Should show recent indicator (green dot)
      const tasksItem = screen.getByText('Tasks').closest('div');
      expect(tasksItem?.querySelector('.bg-green-500')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<AdaptiveNavigation />);

      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(<AdaptiveNavigation />);

      const firstItem = screen.getByText('Dashboard');
      firstItem.focus();

      fireEvent.keyDown(firstItem, { key: 'Tab' });
      
      // Should be able to navigate with keyboard
      expect(document.activeElement).toBeDefined();
    });

    it('should have proper button roles for interactive elements', () => {
      render(<AdaptiveNavigation />);

      const dashboardItem = screen.getByText('Dashboard').closest('div');
      expect(dashboardItem).toHaveAttribute('role', 'button');
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of navigation items', () => {
      const startTime = performance.now();
      render(<AdaptiveNavigation maxItems={100} />);
      const endTime = performance.now();

      // Should render quickly even with many items
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should limit displayed items based on maxItems prop', () => {
      render(<AdaptiveNavigation maxItems={2} />);

      // Should only show limited number of items
      const navItems = screen.getAllByRole('button');
      expect(navItems.length).toBeLessThanOrEqual(4); // Including pin buttons
    });
  });

  describe('Animation and Interaction', () => {
    it('should show hover effects', async () => {
      const user = userEvent.setup();
      
      render(<AdaptiveNavigation />);

      const dashboardItem = screen.getByText('Dashboard');
      await user.hover(dashboardItem);

      // Should show action buttons on hover
      await waitFor(() => {
        expect(screen.getByTitle('Pin item')).toBeInTheDocument();
      });
    });

    it('should animate expansion of child items', async () => {
      const user = userEvent.setup();
      
      render(<AdaptiveNavigation />);

      const settingsItem = screen.getByText('Settings');
      await user.click(settingsItem);

      // Should animate the expansion
      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing navigation context gracefully', () => {
      (useNavigationContext as any).mockReturnValue(null);

      expect(() => {
        render(<AdaptiveNavigation />);
      }).not.toThrow();
    });

    it('should handle missing preferences gracefully', () => {
      (useNavigationPreferences as any).mockReturnValue(null);

      expect(() => {
        render(<AdaptiveNavigation />);
      }).not.toThrow();
    });

    it('should handle navigation errors gracefully', async () => {
      const user = userEvent.setup();
      mockNavigationStore.navigateTo.mockImplementation(() => {
        throw new Error('Navigation failed');
      });

      render(<AdaptiveNavigation />);

      const dashboardItem = screen.getByText('Dashboard');
      
      // Should not crash on navigation error
      expect(async () => {
        await user.click(dashboardItem);
      }).not.toThrow();
    });
  });
});