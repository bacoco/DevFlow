/**
 * AppShell Component Example
 * Demonstrates usage of the AppShell layout component
 */

import React, { useState } from 'react';
import { AppShell } from './AppShell';
import { useNotifications } from '../../stores/uiStore';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export const AppShellExample: React.FC = () => {
  const { addNotification } = useNotifications();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    addNotification({
      type: 'info',
      title: 'Search Performed',
      message: `Searching for: ${query}`,
      duration: 3000,
    });
  };

  const handleNotificationClick = (notification: any) => {
    console.log('Notification clicked:', notification);
  };

  const handleUserProfile = () => {
    addNotification({
      type: 'info',
      title: 'Profile Clicked',
      message: 'Opening user profile...',
      duration: 2000,
    });
  };

  const handleLogout = () => {
    addNotification({
      type: 'warning',
      title: 'Logging Out',
      message: 'You have been logged out successfully',
      duration: 3000,
    });
  };

  const addSampleNotifications = () => {
    const notifications = [
      {
        type: 'success' as const,
        title: 'Task Completed',
        message: 'Your task has been completed successfully',
        actions: [
          {
            label: 'View Details',
            action: () => console.log('View details clicked'),
            variant: 'primary' as const,
          },
        ],
      },
      {
        type: 'warning' as const,
        title: 'System Maintenance',
        message: 'Scheduled maintenance will begin in 30 minutes',
        persistent: true,
        actions: [
          {
            label: 'Learn More',
            action: () => console.log('Learn more clicked'),
            variant: 'secondary' as const,
          },
        ],
      },
      {
        type: 'error' as const,
        title: 'Connection Error',
        message: 'Failed to connect to the server. Please try again.',
        actions: [
          {
            label: 'Retry',
            action: () => console.log('Retry clicked'),
            variant: 'primary' as const,
          },
          {
            label: 'Cancel',
            action: () => console.log('Cancel clicked'),
            variant: 'ghost' as const,
          },
        ],
      },
      {
        type: 'info' as const,
        title: 'New Feature Available',
        message: 'Check out the new dashboard widgets!',
        duration: 8000,
      },
    ];

    notifications.forEach(notification => {
      addNotification(notification);
    });
  };

  const breadcrumbs = [
    { id: 'home', label: 'Home', href: '/' },
    { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
    { id: 'analytics', label: 'Analytics', href: '/analytics', active: true },
  ];

  const user = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'Senior Developer',
    avatar: undefined,
  };

  const footer = (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <div>
          © 2024 DevFlow Intelligence. All rights reserved.
        </div>
        <div className="flex items-center space-x-4">
          <a href="#" className="hover:text-gray-900 dark:hover:text-gray-100">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-gray-900 dark:hover:text-gray-100">
            Terms of Service
          </a>
          <a href="#" className="hover:text-gray-900 dark:hover:text-gray-100">
            Support
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <AppShell
      headerProps={{
        breadcrumbs,
        onSearchSubmit: handleSearch,
        onNotificationClick: handleNotificationClick,
      }}
      sidebarProps={{
        user,
        onUserProfileClick: handleUserProfile,
        onLogout: handleLogout,
      }}
      showFooter={true}
      footer={footer}
      className="custom-app-shell"
    >
      <div className="p-6 space-y-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
            AppShell Example
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Search Demo */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Search Demo</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Current search query: "{searchQuery || 'None'}"
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Use the search bar in the header (⌘K) to test search functionality.
              </p>
            </Card>

            {/* Notification Demo */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Notifications</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Test the notification system with various types of alerts.
              </p>
              <Button onClick={addSampleNotifications} className="w-full">
                Add Sample Notifications
              </Button>
            </Card>

            {/* Theme Demo */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Theme Switching</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Use the theme switcher in the sidebar to toggle between light, dark, and auto themes.
              </p>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
                <div className="w-4 h-4 bg-gray-900 rounded"></div>
                <div className="w-4 h-4 bg-gradient-to-r from-white to-gray-900 rounded"></div>
              </div>
            </Card>

            {/* Layout Demo */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Responsive Layout</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                The layout adapts to different screen sizes and sidebar states.
              </p>
              <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                <li>• Collapsible sidebar</li>
                <li>• Sticky header</li>
                <li>• Mobile overlay</li>
                <li>• Smooth animations</li>
              </ul>
            </Card>

            {/* Navigation Demo */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Navigation</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                The sidebar includes navigation items with badges and search functionality.
              </p>
              <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                <li>• Dashboard</li>
                <li>• Tasks (12)</li>
                <li>• Analytics</li>
                <li>• Team (3)</li>
                <li>• Settings</li>
              </ul>
            </Card>

            {/* User Profile Demo */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">User Profile</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                User profile section with dropdown menu and logout functionality.
              </p>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">JD</span>
                </div>
                <div>
                  <p className="font-medium text-sm">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.role}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Feature List */}
          <Card className="p-6 mt-8">
            <h2 className="text-xl font-semibold mb-4">AppShell Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">Layout Features</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>✓ Responsive design</li>
                  <li>✓ Collapsible sidebar</li>
                  <li>✓ Sticky header</li>
                  <li>✓ Optional footer</li>
                  <li>✓ Mobile-friendly</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">Interactive Features</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>✓ Theme switching</li>
                  <li>✓ Search functionality</li>
                  <li>✓ Notification system</li>
                  <li>✓ User profile menu</li>
                  <li>✓ Keyboard shortcuts</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">Animation Features</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>✓ Smooth transitions</li>
                  <li>✓ Layout animations</li>
                  <li>✓ Toast notifications</li>
                  <li>✓ Hover effects</li>
                  <li>✓ Loading states</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">Accessibility Features</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>✓ Keyboard navigation</li>
                  <li>✓ Focus management</li>
                  <li>✓ Screen reader support</li>
                  <li>✓ High contrast support</li>
                  <li>✓ ARIA labels</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
};

export default AppShellExample;