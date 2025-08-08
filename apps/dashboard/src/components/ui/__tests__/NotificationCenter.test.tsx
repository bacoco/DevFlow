/**
 * NotificationCenter Component Tests
 * Comprehensive tests for notification center functionality and accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import NotificationCenter from '../NotificationCenter';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, any>(({ children, initial, animate, exit, transition, ...props }, ref) => (
      <div ref={ref} {...props}>
        {children}
      </div>
    )),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock notification data
const mockNotifications = [
  {
    id: '1',
    title: 'Task Completed',
    message: 'Your task "Update documentation" has been completed.',
    type: 'success' as const,
    timestamp: new Date('2023-01-01T10:00:00Z'),
    read: false,
    actions: [
      { label: 'View Task', action: jest.fn() },
    ],
  },
  {
    id: '2',
    title: 'System Alert',
    message: 'Server maintenance scheduled for tonight.',
    type: 'warning' as const,
    timestamp: new Date('2023-01-01T09:00:00Z'),
    read: true,
    actions: [
      { label: 'Learn More', action: jest.fn() },
      { label: 'Dismiss', action: jest.fn() },
    ],
  },
  {
    id: '3',
    title: 'Error Occurred',
    message: 'Failed to sync data. Please try again.',
    type: 'error' as const,
    timestamp: new Date('2023-01-01T08:00:00Z'),
    read: false,
    actions: [
      { label: 'Retry', action: jest.fn() },
    ],
  },
];

describe('NotificationCenter Component', () => {
  const defaultProps = {
    notifications: mockNotifications,
    onMarkAsRead: jest.fn(),
    onMarkAllAsRead: jest.fn(),
    onClearAll: jest.fn(),
    onNotificationClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders notification center with notifications', () => {
      render(<NotificationCenter {...defaultProps} />);
      
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Task Completed')).toBeInTheDocument();
      expect(screen.getByText('System Alert')).toBeInTheDocument();
      expect(screen.getByText('Error Occurred')).toBeInTheDocument();
    });

    it('shows notification count', () => {
      render(<NotificationCenter {...defaultProps} />);
      
      // Should show unread count (2 unread notifications)
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('renders empty state when no notifications', () => {
      render(<NotificationCenter {...defaultProps} notifications={[]} />);
      
      expect(screen.getByText('No notifications')).toBeInTheDocument();
      expect(screen.getByText('You\'re all caught up!')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<NotificationCenter {...defaultProps} className="custom-center" testId="notification-center" />);
      
      const center = screen.getByTestId('notification-center');
      expect(center).toHaveClass('custom-center');
    });
  });

  describe('Notification Display', () => {
    it('displays notification details correctly', () => {
      render(<NotificationCenter {...defaultProps} />);
      
      // Check first notification
      expect(screen.getByText('Task Completed')).toBeInTheDocument();
      expect(screen.getByText('Your task "Update documentation" has been completed.')).toBeInTheDocument();
      
      // Check timestamp formatting
      expect(screen.getByText(/Jan 1, 2023/)).toBeInTheDocument();
    });

    it('shows different icons for different notification types', () => {
      render(<NotificationCenter {...defaultProps} />);
      
      // Should render different icons based on type (success, warning, error)
      const notifications = screen.getAllByRole('article');
      expect(notifications).toHaveLength(3);
    });

    it('distinguishes between read and unread notifications', () => {
      render(<NotificationCenter {...defaultProps} />);
      
      const notifications = screen.getAllByRole('article');
      
      // First notification (unread) should have different styling
      expect(notifications[0]).toHaveClass('bg-white');
      
      // Second notification (read) should have different styling
      expect(notifications[1]).toHaveClass('bg-gray-50');
    });

    it('shows notification actions', () => {
      render(<NotificationCenter {...defaultProps} />);
      
      expect(screen.getByText('View Task')).toBeInTheDocument();
      expect(screen.getByText('Learn More')).toBeInTheDocument();
      expect(screen.getByText('Dismiss')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  describe('Notification Interactions', () => {
    it('calls onNotificationClick when notification is clicked', async () => {
      const user = userEvent.setup();
      render(<NotificationCenter {...defaultProps} />);
      
      const notification = screen.getByText('Task Completed').closest('article');
      if (notification) {
        await user.click(notification);
      }
      
      expect(defaultProps.onNotificationClick).toHaveBeenCalledWith(mockNotifications[0]);
    });

    it('calls onMarkAsRead when unread notification is clicked', async () => {
      const user = userEvent.setup();
      render(<NotificationCenter {...defaultProps} />);
      
      const notification = screen.getByText('Task Completed').closest('article');
      if (notification) {
        await user.click(notification);
      }
      
      expect(defaultProps.onMarkAsRead).toHaveBeenCalledWith('1');
    });

    it('does not call onMarkAsRead for already read notifications', async () => {
      const user = userEvent.setup();
      render(<NotificationCenter {...defaultProps} />);
      
      const notification = screen.getByText('System Alert').closest('article');
      if (notification) {
        await user.click(notification);
      }
      
      expect(defaultProps.onMarkAsRead).not.toHaveBeenCalled();
    });

    it('executes notification actions when clicked', async () => {
      const user = userEvent.setup();
      render(<NotificationCenter {...defaultProps} />);
      
      const viewTaskButton = screen.getByText('View Task');
      await user.click(viewTaskButton);
      
      expect(mockNotifications[0].actions[0].action).toHaveBeenCalled();
    });
  });

  describe('Bulk Actions', () => {
    it('shows mark all as read button when there are unread notifications', () => {
      render(<NotificationCenter {...defaultProps} />);
      
      expect(screen.getByText('Mark all as read')).toBeInTheDocument();
    });

    it('calls onMarkAllAsRead when mark all as read is clicked', async () => {
      const user = userEvent.setup();
      render(<NotificationCenter {...defaultProps} />);
      
      const markAllButton = screen.getByText('Mark all as read');
      await user.click(markAllButton);
      
      expect(defaultProps.onMarkAllAsRead).toHaveBeenCalled();
    });

    it('shows clear all button', () => {
      render(<NotificationCenter {...defaultProps} />);
      
      expect(screen.getByText('Clear all')).toBeInTheDocument();
    });

    it('calls onClearAll when clear all is clicked', async () => {
      const user = userEvent.setup();
      render(<NotificationCenter {...defaultProps} />);
      
      const clearAllButton = screen.getByText('Clear all');
      await user.click(clearAllButton);
      
      expect(defaultProps.onClearAll).toHaveBeenCalled();
    });

    it('hides mark all as read when all notifications are read', () => {
      const allReadNotifications = mockNotifications.map(n => ({ ...n, read: true }));
      render(<NotificationCenter {...defaultProps} notifications={allReadNotifications} />);
      
      expect(screen.queryByText('Mark all as read')).not.toBeInTheDocument();
    });
  });

  describe('Filtering and Sorting', () => {
    it('shows filter options', () => {
      render(<NotificationCenter {...defaultProps} />);
      
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Unread')).toBeInTheDocument();
    });

    it('filters notifications by unread status', async () => {
      const user = userEvent.setup();
      render(<NotificationCenter {...defaultProps} />);
      
      const unreadFilter = screen.getByText('Unread');
      await user.click(unreadFilter);
      
      // Should only show unread notifications
      expect(screen.getByText('Task Completed')).toBeInTheDocument();
      expect(screen.getByText('Error Occurred')).toBeInTheDocument();
      expect(screen.queryByText('System Alert')).not.toBeInTheDocument();
    });

    it('shows all notifications when All filter is selected', async () => {
      const user = userEvent.setup();
      render(<NotificationCenter {...defaultProps} />);
      
      // First filter by unread
      const unreadFilter = screen.getByText('Unread');
      await user.click(unreadFilter);
      
      // Then switch back to all
      const allFilter = screen.getByText('All');
      await user.click(allFilter);
      
      // Should show all notifications again
      expect(screen.getByText('Task Completed')).toBeInTheDocument();
      expect(screen.getByText('System Alert')).toBeInTheDocument();
      expect(screen.getByText('Error Occurred')).toBeInTheDocument();
    });

    it('sorts notifications by timestamp (newest first)', () => {
      render(<NotificationCenter {...defaultProps} />);
      
      const notifications = screen.getAllByRole('article');
      const titles = notifications.map(n => n.querySelector('h4')?.textContent);
      
      // Should be sorted by timestamp (newest first)
      expect(titles).toEqual(['Task Completed', 'System Alert', 'Error Occurred']);
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports keyboard navigation through notifications', async () => {
      const user = userEvent.setup();
      render(<NotificationCenter {...defaultProps} />);
      
      const firstNotification = screen.getByText('Task Completed').closest('article');
      if (firstNotification) {
        firstNotification.focus();
        expect(firstNotification).toHaveFocus();
        
        // Tab to next notification
        await user.tab();
        const secondNotification = screen.getByText('System Alert').closest('article');
        expect(secondNotification).toHaveFocus();
      }
    });

    it('activates notifications with Enter key', async () => {
      const user = userEvent.setup();
      render(<NotificationCenter {...defaultProps} />);
      
      const notification = screen.getByText('Task Completed').closest('article');
      if (notification) {
        notification.focus();
        await user.keyboard('{Enter}');
        
        expect(defaultProps.onNotificationClick).toHaveBeenCalledWith(mockNotifications[0]);
      }
    });

    it('activates notifications with Space key', async () => {
      const user = userEvent.setup();
      render(<NotificationCenter {...defaultProps} />);
      
      const notification = screen.getByText('Task Completed').closest('article');
      if (notification) {
        notification.focus();
        await user.keyboard(' ');
        
        expect(defaultProps.onNotificationClick).toHaveBeenCalledWith(mockNotifications[0]);
      }
    });
  });

  describe('Accessibility', () => {
    it('should not have any accessibility violations', async () => {
      const { container } = render(<NotificationCenter {...defaultProps} />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper ARIA attributes', () => {
      render(<NotificationCenter {...defaultProps} />);
      
      const notificationList = screen.getByRole('list');
      expect(notificationList).toHaveAttribute('aria-label', 'Notifications');
      
      const notifications = screen.getAllByRole('listitem');
      expect(notifications).toHaveLength(3);
      
      notifications.forEach((notification, index) => {
        expect(notification).toHaveAttribute('role', 'listitem');
      });
    });

    it('provides screen reader friendly timestamps', () => {
      render(<NotificationCenter {...defaultProps} />);
      
      // Should have accessible time elements
      const timeElements = screen.getAllByRole('time');
      expect(timeElements.length).toBeGreaterThan(0);
    });

    it('has proper heading structure', () => {
      render(<NotificationCenter {...defaultProps} />);
      
      const mainHeading = screen.getByRole('heading', { level: 2 });
      expect(mainHeading).toHaveTextContent('Notifications');
      
      const notificationTitles = screen.getAllByRole('heading', { level: 4 });
      expect(notificationTitles).toHaveLength(3);
    });

    it('provides accessible button labels', () => {
      render(<NotificationCenter {...defaultProps} />);
      
      const markAllButton = screen.getByRole('button', { name: /mark all as read/i });
      expect(markAllButton).toBeInTheDocument();
      
      const clearAllButton = screen.getByRole('button', { name: /clear all/i });
      expect(clearAllButton).toBeInTheDocument();
    });

    it('announces notification count to screen readers', () => {
      render(<NotificationCenter {...defaultProps} />);
      
      const countElement = screen.getByText('2');
      expect(countElement).toHaveAttribute('aria-label', '2 unread notifications');
    });
  });

  describe('Loading States', () => {
    it('shows loading state when notifications are being fetched', () => {
      render(<NotificationCenter {...defaultProps} loading={true} />);
      
      expect(screen.getByText('Loading notifications...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('shows skeleton loaders during loading', () => {
      render(<NotificationCenter {...defaultProps} loading={true} />);
      
      const skeletons = screen.getAllByRole('status');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error States', () => {
    it('shows error message when there is an error', () => {
      const error = new Error('Failed to load notifications');
      render(<NotificationCenter {...defaultProps} error={error} />);
      
      expect(screen.getByText('Failed to load notifications')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('calls retry function when retry button is clicked', async () => {
      const onRetry = jest.fn();
      const error = new Error('Failed to load notifications');
      const user = userEvent.setup();
      
      render(<NotificationCenter {...defaultProps} error={error} onRetry={onRetry} />);
      
      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);
      
      expect(onRetry).toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive classes', () => {
      render(<NotificationCenter {...defaultProps} testId="notification-center" />);
      
      const center = screen.getByTestId('notification-center');
      expect(center).toHaveClass('w-full');
    });

    it('handles mobile layout', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<NotificationCenter {...defaultProps} />);
      
      // Should still render all content
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getAllByRole('article')).toHaveLength(3);
    });
  });

  describe('Dark Mode Support', () => {
    it('applies dark mode classes', () => {
      render(<NotificationCenter {...defaultProps} testId="notification-center" />);
      
      const center = screen.getByTestId('notification-center');
      expect(center).toHaveClass('dark:bg-gray-800');
    });
  });

  describe('Performance', () => {
    it('handles large numbers of notifications efficiently', () => {
      const manyNotifications = Array.from({ length: 100 }, (_, i) => ({
        ...mockNotifications[0],
        id: `notification-${i}`,
        title: `Notification ${i}`,
      }));
      
      const startTime = performance.now();
      render(<NotificationCenter {...defaultProps} notifications={manyNotifications} />);
      const endTime = performance.now();
      
      // Should render quickly
      expect(endTime - startTime).toBeLessThan(200);
    });

    it('implements virtual scrolling for large lists', () => {
      const manyNotifications = Array.from({ length: 1000 }, (_, i) => ({
        ...mockNotifications[0],
        id: `notification-${i}`,
        title: `Notification ${i}`,
      }));
      
      render(<NotificationCenter {...defaultProps} notifications={manyNotifications} />);
      
      // Should not render all 1000 notifications in DOM
      const renderedNotifications = screen.getAllByRole('article');
      expect(renderedNotifications.length).toBeLessThan(50);
    });
  });

  describe('Edge Cases', () => {
    it('handles notifications without actions', () => {
      const notificationsWithoutActions = [{
        ...mockNotifications[0],
        actions: [],
      }];
      
      render(<NotificationCenter {...defaultProps} notifications={notificationsWithoutActions} />);
      
      expect(screen.getByText('Task Completed')).toBeInTheDocument();
      expect(screen.queryByText('View Task')).not.toBeInTheDocument();
    });

    it('handles very long notification messages', () => {
      const longMessage = 'A'.repeat(500);
      const longNotification = [{
        ...mockNotifications[0],
        message: longMessage,
      }];
      
      render(<NotificationCenter {...defaultProps} notifications={longNotification} />);
      
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('handles notifications with missing timestamps', () => {
      const notificationWithoutTimestamp = [{
        ...mockNotifications[0],
        timestamp: undefined as any,
      }];
      
      render(<NotificationCenter {...defaultProps} notifications={notificationWithoutTimestamp} />);
      
      expect(screen.getByText('Task Completed')).toBeInTheDocument();
    });

    it('handles invalid notification types gracefully', () => {
      const invalidTypeNotification = [{
        ...mockNotifications[0],
        type: 'invalid' as any,
      }];
      
      render(<NotificationCenter {...defaultProps} notifications={invalidTypeNotification} />);
      
      expect(screen.getByText('Task Completed')).toBeInTheDocument();
    });
  });
});