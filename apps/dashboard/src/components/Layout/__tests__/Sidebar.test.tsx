/**
 * Sidebar Component Tests
 * Tests for modern sidebar navigation functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Sidebar } from '../Sidebar';

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    aside: ({ children, ...props }: any) => <aside {...props}>{children}</aside>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    a: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock the UI store
jest.mock('../../../stores/uiStore', () => ({
  useUIStore: jest.fn(() => ({
    setTheme: jest.fn(),
  })),
  useTheme: jest.fn(() => 'dark'),
  useSidebar: jest.fn(() => ({
    collapsed: false,
    toggle: jest.fn(),
    setCollapsed: jest.fn(),
  })),
  useNotifications: jest.fn(() => ({
    notifications: [],
  })),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders sidebar with navigation items', () => {
    render(<Sidebar />);

    expect(screen.getByText('DevFlow')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('displays user information', () => {
    const user = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'Designer',
    };

    render(<Sidebar user={user} />);

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Designer')).toBeInTheDocument();
  });

  it('handles sidebar toggle', () => {
    const mockToggle = jest.fn();
    require('../../../stores/uiStore').useSidebar.mockReturnValue({
      collapsed: false,
      toggle: mockToggle,
      setCollapsed: jest.fn(),
    });

    render(<Sidebar />);

    // Look for the toggle button (chevron icon)
    const toggleButtons = screen.getAllByRole('button');
    const toggleButton = toggleButtons.find(button => 
      button.querySelector('svg') // Find button with SVG (chevron icon)
    );
    
    if (toggleButton) {
      fireEvent.click(toggleButton);
      expect(mockToggle).toHaveBeenCalled();
    }
  });

  it('shows search input when not collapsed', () => {
    render(<Sidebar />);

    expect(screen.getByPlaceholderText('Search navigation...')).toBeInTheDocument();
  });

  it('filters navigation items based on search', () => {
    render(<Sidebar />);

    const searchInput = screen.getByPlaceholderText('Search navigation...');
    fireEvent.change(searchInput, { target: { value: 'task' } });

    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.queryByText('Analytics')).not.toBeInTheDocument();
  });

  it('displays notification badges', () => {
    require('../../../stores/uiStore').useNotifications.mockReturnValue({
      notifications: [
        { id: '1', type: 'info', title: 'Test', timestamp: new Date() },
        { id: '2', type: 'warning', title: 'Test 2', timestamp: new Date() },
      ],
    });

    render(<Sidebar />);

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('handles theme switching', async () => {
    const mockSetTheme = jest.fn();
    require('../../../stores/uiStore').useUIStore.mockReturnValue({
      setTheme: mockSetTheme,
    });

    render(<Sidebar />);

    const themeButton = screen.getByText(/dark theme/i);
    fireEvent.click(themeButton);

    await waitFor(() => {
      const lightOption = screen.getByText('Light');
      fireEvent.click(lightOption);
    });

    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('handles user profile interactions', () => {
    const mockOnUserProfileClick = jest.fn();
    const mockOnLogout = jest.fn();

    render(
      <Sidebar 
        onUserProfileClick={mockOnUserProfileClick}
        onLogout={mockOnLogout}
      />
    );

    const userButton = screen.getByText('John Doe');
    fireEvent.click(userButton);

    const profileButton = screen.getByText('Profile');
    fireEvent.click(profileButton);

    expect(mockOnUserProfileClick).toHaveBeenCalled();
  });

  it('shows collapsed state correctly', () => {
    require('../../../stores/uiStore').useSidebar.mockReturnValue({
      collapsed: true,
      toggle: mockToggle,
      setCollapsed: mockSetCollapsed,
    });

    render(<Sidebar />);

    // Search should not be visible when collapsed
    expect(screen.queryByPlaceholderText('Search navigation...')).not.toBeInTheDocument();
  });

  it('displays navigation item badges', () => {
    render(<Sidebar />);

    // Tasks should have badge of 12
    expect(screen.getByText('12')).toBeInTheDocument();
    // Team should have badge of 3
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});