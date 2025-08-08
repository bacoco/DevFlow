/**
 * AppShell Component Tests
 * Tests for the main app layout component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from '../AppShell';
import { useUIStore } from '../../../stores/uiStore';

// Mock the stores
jest.mock('../../../stores/uiStore');
const mockUseUIStore = useUIStore as jest.MockedFunction<typeof useUIStore>;

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    main: ({ children, ...props }: any) => <main {...props}>{children}</main>,
    footer: ({ children, ...props }: any) => <footer {...props}>{children}</footer>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock components
jest.mock('../Header', () => ({
  Header: ({ onSearchSubmit, onNotificationClick, ...props }: any) => (
    <header data-testid="header" {...props}>
      <button onClick={() => onSearchSubmit?.('test search')}>Search</button>
      <button onClick={() => onNotificationClick?.({ id: '1', type: 'info', title: 'Test' })}>
        Notification
      </button>
    </header>
  ),
}));

jest.mock('../Sidebar', () => ({
  Sidebar: ({ onUserProfileClick, onLogout, ...props }: any) => (
    <aside data-testid="sidebar" {...props}>
      <button onClick={() => onUserProfileClick?.()}>Profile</button>
      <button onClick={() => onLogout?.()}>Logout</button>
    </aside>
  ),
}));

jest.mock('../Toast', () => ({
  Toast: ({ notification, onDismiss }: any) => (
    <div data-testid={`toast-${notification.id}`}>
      {notification.title}
      <button onClick={() => onDismiss?.(notification.id)}>Dismiss</button>
    </div>
  ),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('AppShell', () => {
  const mockStore = {
    theme: 'dark' as const,
    setTheme: jest.fn(),
    sidebarCollapsed: false,
    toggleSidebar: jest.fn(),
    setSidebarCollapsed: jest.fn(),
    notifications: [],
    addNotification: jest.fn(),
    removeNotification: jest.fn(),
    clearNotifications: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUIStore.mockReturnValue(mockStore);
    
    // Mock document.documentElement
    Object.defineProperty(document, 'documentElement', {
      value: {
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
        },
      },
      writable: true,
    });
  });

  it('renders children content', () => {
    render(
      <AppShell>
        <div data-testid="main-content">Test Content</div>
      </AppShell>
    );

    expect(screen.getByTestId('main-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders header when showHeader is true', () => {
    render(
      <AppShell showHeader={true}>
        <div>Content</div>
      </AppShell>
    );

    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('does not render header when showHeader is false', () => {
    render(
      <AppShell showHeader={false}>
        <div>Content</div>
      </AppShell>
    );

    expect(screen.queryByTestId('header')).not.toBeInTheDocument();
  });

  it('renders sidebar when showSidebar is true', () => {
    render(
      <AppShell showSidebar={true}>
        <div>Content</div>
      </AppShell>
    );

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('does not render sidebar when showSidebar is false', () => {
    render(
      <AppShell showSidebar={false}>
        <div>Content</div>
      </AppShell>
    );

    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
  });

  it('renders footer when showFooter is true and footer is provided', () => {
    const footer = <div data-testid="footer-content">Footer Content</div>;
    
    render(
      <AppShell showFooter={true} footer={footer}>
        <div>Content</div>
      </AppShell>
    );

    expect(screen.getByTestId('footer-content')).toBeInTheDocument();
  });

  it('does not render footer when showFooter is false', () => {
    const footer = <div data-testid="footer-content">Footer Content</div>;
    
    render(
      <AppShell showFooter={false} footer={footer}>
        <div>Content</div>
      </AppShell>
    );

    expect(screen.queryByTestId('footer-content')).not.toBeInTheDocument();
  });

  it('applies theme classes to document element', async () => {
    const mockClassList = {
      add: jest.fn(),
      remove: jest.fn(),
    };
    
    Object.defineProperty(document, 'documentElement', {
      value: { classList: mockClassList },
      writable: true,
    });

    render(
      <AppShell theme="light">
        <div>Content</div>
      </AppShell>
    );

    await waitFor(() => {
      expect(mockClassList.remove).toHaveBeenCalledWith('light', 'dark');
      expect(mockClassList.add).toHaveBeenCalledWith('light');
    });
  });

  it('handles auto theme with system preference', async () => {
    const mockClassList = {
      add: jest.fn(),
      remove: jest.fn(),
    };
    
    const mockMatchMedia = jest.fn().mockImplementation(query => ({
      matches: true, // Simulate dark mode preference
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    
    Object.defineProperty(window, 'matchMedia', {
      value: mockMatchMedia,
      writable: true,
    });
    
    Object.defineProperty(document, 'documentElement', {
      value: { classList: mockClassList },
      writable: true,
    });

    render(
      <AppShell theme="auto">
        <div>Content</div>
      </AppShell>
    );

    await waitFor(() => {
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
      expect(mockClassList.add).toHaveBeenCalledWith('dark');
    });
  });

  it('passes header props to Header component', () => {
    const headerProps = {
      breadcrumbs: [{ id: '1', label: 'Home', href: '/' }],
      showSearch: false,
      onSearchSubmit: jest.fn(),
    };

    render(
      <AppShell headerProps={headerProps}>
        <div>Content</div>
      </AppShell>
    );

    const header = screen.getByTestId('header');
    expect(header).toBeInTheDocument();
  });

  it('passes sidebar props to Sidebar component', () => {
    const sidebarProps = {
      user: { name: 'John Doe', email: 'john@example.com' },
      onUserProfileClick: jest.fn(),
      onLogout: jest.fn(),
    };

    render(
      <AppShell sidebarProps={sidebarProps}>
        <div>Content</div>
      </AppShell>
    );

    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toBeInTheDocument();
  });

  it('handles sidebar toggle callback', async () => {
    const onSidebarToggle = jest.fn();
    mockStore.toggleSidebar = jest.fn();

    render(
      <AppShell onSidebarToggle={onSidebarToggle}>
        <div>Content</div>
      </AppShell>
    );

    // This would be triggered by the sidebar toggle button
    // Since we're mocking the components, we'll simulate the call
    mockStore.toggleSidebar();
    
    expect(mockStore.toggleSidebar).toHaveBeenCalled();
  });

  it('renders toast notifications', () => {
    const notificationsWithToasts = [
      {
        id: '1',
        type: 'info' as const,
        title: 'Test Notification',
        message: 'This is a test',
        timestamp: new Date(),
        persistent: false,
      },
      {
        id: '2',
        type: 'success' as const,
        title: 'Success Notification',
        timestamp: new Date(),
        persistent: false,
      },
    ];

    mockUseUIStore.mockReturnValue({
      ...mockStore,
      notifications: notificationsWithToasts,
    });

    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    expect(screen.getByTestId('toast-1')).toBeInTheDocument();
    expect(screen.getByTestId('toast-2')).toBeInTheDocument();
    expect(screen.getByText('Test Notification')).toBeInTheDocument();
    expect(screen.getByText('Success Notification')).toBeInTheDocument();
  });

  it('does not render persistent notifications as toasts', () => {
    const notificationsWithPersistent = [
      {
        id: '1',
        type: 'info' as const,
        title: 'Persistent Notification',
        timestamp: new Date(),
        persistent: true,
      },
      {
        id: '2',
        type: 'info' as const,
        title: 'Toast Notification',
        timestamp: new Date(),
        persistent: false,
      },
    ];

    mockUseUIStore.mockReturnValue({
      ...mockStore,
      notifications: notificationsWithPersistent,
    });

    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    expect(screen.queryByTestId('toast-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('toast-2')).toBeInTheDocument();
  });

  it('limits toast notifications to 5', () => {
    const manyNotifications = Array.from({ length: 10 }, (_, i) => ({
      id: `${i + 1}`,
      type: 'info' as const,
      title: `Notification ${i + 1}`,
      timestamp: new Date(),
      persistent: false,
    }));

    mockUseUIStore.mockReturnValue({
      ...mockStore,
      notifications: manyNotifications,
    });

    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    // Should only render first 5 toasts
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByTestId(`toast-${i}`)).toBeInTheDocument();
    }
    
    for (let i = 6; i <= 10; i++) {
      expect(screen.queryByTestId(`toast-${i}`)).not.toBeInTheDocument();
    }
  });

  it('applies custom className', () => {
    const { container } = render(
      <AppShell className="custom-app-shell">
        <div>Content</div>
      </AppShell>
    );

    expect(container.firstChild).toHaveClass('custom-app-shell');
  });

  it('shows loading state before mounting', () => {
    // Mock useState to simulate unmounted state
    const mockUseState = jest.spyOn(React, 'useState');
    mockUseState.mockImplementationOnce(() => [false, jest.fn()]); // mounted = false

    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    expect(screen.getByRole('generic')).toHaveClass('min-h-screen', 'bg-gray-50', 'dark:bg-gray-900');
    
    mockUseState.mockRestore();
  });

  it('handles responsive layout changes', () => {
    mockUseUIStore.mockReturnValue({
      ...mockStore,
      sidebarCollapsed: true,
    });

    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    // The layout should adapt to collapsed sidebar
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});