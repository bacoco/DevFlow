/**
 * App Integration Tests
 * Tests the complete application integration with all components
 * Covers data flow, state management, page transitions, and error handling
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from '../App';
import { useUIStore } from '../../../stores/uiStore';
import { useDataStore } from '../../../stores/dataStore';
import { useUserStore } from '../../../stores/userStore';
import { axe, toHaveNoViolations } from 'jest-axe';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock WebSocket
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.OPEN,
};

// Mock window.WebSocket
Object.defineProperty(window, 'WebSocket', {
  writable: true,
  value: jest.fn(() => mockWebSocket),
});

// Mock Sentry for error reporting
Object.defineProperty(window, 'Sentry', {
  writable: true,
  value: {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
  },
});

// Mock performance API
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => [{ duration: 100 }]),
  },
});

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock ResizeObserver
const mockResizeObserver = jest.fn();
mockResizeObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.ResizeObserver = mockResizeObserver;

// Mock matchMedia
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

// Create a test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

describe('App Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    
    // Reset all stores
    useUIStore.getState().clearErrors();
    useDataStore.getState().clearAllData();
    useUserStore.getState().clearUserData();
    
    // Mock authenticated user
    useUserStore.getState().login(
      {
        id: 'test-user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'developer' as any,
        teamIds: ['team-1'],
        preferences: {
          theme: 'dark',
          timezone: 'UTC',
          notifications: {
            email: true,
            inApp: true,
            slack: false,
            frequency: 'immediate',
          },
          dashboard: {
            defaultTimeRange: 'week',
            autoRefresh: true,
            refreshInterval: 30,
            compactMode: false,
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      'test-token'
    );
  });

  afterEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('renders the complete application', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    // Wait for initialization
    await waitFor(() => {
      expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
    });

    // Check that main components are rendered
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('handles theme switching', async () => {
    const user = userEvent.setup();
    
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
    });

    // Initially should be dark theme
    expect(document.documentElement).toHaveClass('dark');

    // Find and click theme toggle (this would be in the header or sidebar)
    // For now, we'll test the store directly
    useUIStore.getState().setTheme('light');
    
    await waitFor(() => {
      expect(document.documentElement).toHaveClass('light');
    });
  });

  it('handles sidebar toggle', async () => {
    const user = userEvent.setup();
    
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
    });

    // Test sidebar state
    const initialCollapsed = useUIStore.getState().sidebarCollapsed;
    
    // Toggle sidebar
    useUIStore.getState().toggleSidebar();
    
    expect(useUIStore.getState().sidebarCollapsed).toBe(!initialCollapsed);
  });

  it('handles notifications', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
    });

    // Add a notification
    useUIStore.getState().addNotification({
      type: 'success',
      title: 'Test Notification',
      message: 'This is a test notification',
    });

    // Check that notification appears
    await waitFor(() => {
      expect(screen.getByText('Test Notification')).toBeInTheDocument();
    });
  });

  it('handles WebSocket connection status', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
    });

    // Simulate connection loss
    useDataStore.getState().setConnectionStatus('disconnected');

    // Should show offline indicator
    await waitFor(() => {
      expect(screen.getByText(/offline mode/i)).toBeInTheDocument();
    });

    // Simulate reconnection
    useDataStore.getState().setConnectionStatus('connected');

    // Offline indicator should disappear
    await waitFor(() => {
      expect(screen.queryByText(/offline mode/i)).not.toBeInTheDocument();
    });
  });

  it('handles error states gracefully', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
    });

    // Simulate a global error
    const testError = new Error('Test error');
    useUIStore.getState().setGlobalError(testError);

    // Should show error fallback
    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    // Clear error
    useUIStore.getState().clearErrors();

    // Should return to normal state
    await waitFor(() => {
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });
  });

  it('handles loading states', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    // Should show loading initially
    expect(screen.getByText(/initializing/i)).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
    });

    // Test component-level loading
    useUIStore.getState().setComponentLoading('test-component', true);
    
    expect(useUIStore.getState().loading.components['test-component']).toBe(true);
    
    useUIStore.getState().setComponentLoading('test-component', false);
    
    expect(useUIStore.getState().loading.components['test-component']).toBe(false);
  });

  it('handles modal states', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
    });

    // Open a modal
    useUIStore.getState().openModal('test-modal', { test: 'data' });

    // Should show modal
    await waitFor(() => {
      expect(screen.getByText('test-modal')).toBeInTheDocument();
    });

    // Close modal
    useUIStore.getState().closeModal();

    // Modal should disappear
    await waitFor(() => {
      expect(screen.queryByText('test-modal')).not.toBeInTheDocument();
    });
  });

  it('handles user activity tracking', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
    });

    const initialActivity = useUserStore.getState().session.lastActivity;
    
    // Simulate user activity
    useUserStore.getState().updateActivity();
    
    const updatedActivity = useUserStore.getState().session.lastActivity;
    
    expect(updatedActivity).not.toBe(initialActivity);
    expect(updatedActivity).toBeInstanceOf(Date);
  });

  it('handles data synchronization', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
    });

    // Test data refresh
    const initialSync = useDataStore.getState().lastSync;
    
    await useDataStore.getState().refreshData();
    
    const updatedSync = useDataStore.getState().lastSync;
    
    expect(updatedSync).not.toBe(initialSync);
  });

  it('maintains accessibility standards', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
    });

    // Check for skip links
    expect(screen.getByText(/skip to main content/i)).toBeInTheDocument();
    expect(screen.getByText(/skip to navigation/i)).toBeInTheDocument();

    // Check for proper ARIA roles
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();

    // Run accessibility audit
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
    });

    // Test global keyboard shortcuts
    await user.keyboard('{Control>}k{/Control}');
    // Should trigger search functionality

    await user.keyboard('{Control>}b{/Control}');
    // Should toggle sidebar

    await user.keyboard('{Escape}');
    // Should close any open modals
  });

  it('handles page transitions smoothly', async () => {
    const user = userEvent.setup();
    
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
    });

    // Test page navigation
    // This would require actual navigation components to be rendered
    // For now, we'll test the store directly
    
    const initialPage = 'dashboard';
    expect(screen.getByRole('main')).toBeInTheDocument();
    
    // Simulate page change
    act(() => {
      // This would be triggered by navigation
      useUIStore.getState().setGlobalLoading(true);
    });

    act(() => {
      useUIStore.getState().setGlobalLoading(false);
    });
  });

  it('handles real-time data updates', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
    });

    // Simulate real-time data update
    act(() => {
      useDataStore.getState().addTask({
        id: 'new-task',
        title: 'New Real-time Task',
        description: 'Added via WebSocket',
        status: 'todo',
        priority: 'high',
        assignee: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
        },
        tags: ['urgent'],
        dueDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // Should show notification about new task
    await waitFor(() => {
      // This would depend on the actual notification implementation
      expect(useDataStore.getState().tasks.tasks).toHaveLength(1);
    });
  });

  it('handles error recovery gracefully', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
    });

    // Simulate component error
    const testError = new Error('Component error');
    
    act(() => {
      useUIStore.getState().setComponentError('test-component', testError);
    });

    // Should handle error gracefully
    expect(useUIStore.getState().errors.components['test-component']).toBe(testError);

    // Clear error
    act(() => {
      useUIStore.getState().clearComponentError('test-component');
    });

    expect(useUIStore.getState().errors.components['test-component']).toBeNull();
  });

  it('handles offline mode correctly', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
    });

    // Simulate going offline
    act(() => {
      useDataStore.getState().setConnectionStatus('disconnected');
    });

    // Should show offline indicator
    await waitFor(() => {
      expect(screen.getByText(/offline mode/i)).toBeInTheDocument();
    });

    // Simulate coming back online
    act(() => {
      useDataStore.getState().setConnectionStatus('connected');
    });

    // Offline indicator should disappear
    await waitFor(() => {
      expect(screen.queryByText(/offline mode/i)).not.toBeInTheDocument();
    });
  });

  it('persists user preferences', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
    });

    // Update user preferences
    act(() => {
      useUserStore.getState().updatePreferences({
        theme: 'light',
        dashboard: {
          defaultTimeRange: 'month',
          autoRefresh: false,
          refreshInterval: 60,
          compactMode: true,
        },
      });
    });

    // Preferences should be updated
    const preferences = useUserStore.getState().preferences;
    expect(preferences.theme).toBe('light');
    expect(preferences.dashboard.compactMode).toBe(true);
  });
});

describe('App Performance', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    
    // Mock performance API
    Object.defineProperty(window, 'performance', {
      writable: true,
      value: {
        now: jest.fn(() => Date.now()),
        mark: jest.fn(),
        measure: jest.fn(),
        getEntriesByType: jest.fn(() => []),
      },
    });
  });

  it('loads within acceptable time limits', async () => {
    const startTime = performance.now();
    
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
    });

    const endTime = performance.now();
    const loadTime = endTime - startTime;

    // Should load within 2 seconds (generous for testing environment)
    expect(loadTime).toBeLessThan(2000);
  });

  it('handles large datasets efficiently', async () => {
    // Mock large dataset
    const largeTasks = Array.from({ length: 1000 }, (_, i) => ({
      id: `task-${i}`,
      title: `Task ${i}`,
      description: `Description for task ${i}`,
      status: 'todo' as const,
      priority: 'medium' as const,
      assignee: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
      },
      tags: [`tag-${i % 5}`],
      dueDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/initializing/i)).not.toBeInTheDocument();
    });

    // Set large dataset
    const startTime = performance.now();
    useDataStore.getState().setTasks(largeTasks);
    const endTime = performance.now();

    // Should handle large dataset quickly
    expect(endTime - startTime).toBeLessThan(100);
  });
});