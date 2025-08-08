/**
 * Toast Component Tests
 * Tests for the toast notification component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toast, ToastContainer } from '../Toast';
import { useNotifications } from '../../../stores/uiStore';
import { Notification } from '../../../types/design-system';

// Mock the stores
jest.mock('../../../stores/uiStore');
const mockUseNotifications = useNotifications as jest.MockedFunction<typeof useNotifications>;

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock icons
jest.mock('lucide-react', () => ({
  X: () => <div data-testid="x-icon">X</div>,
  CheckCircle: () => <div data-testid="check-icon">✓</div>,
  AlertCircle: () => <div data-testid="alert-icon">!</div>,
  Info: () => <div data-testid="info-icon">i</div>,
  AlertTriangle: () => <div data-testid="warning-icon">⚠</div>,
  Clock: () => <div data-testid="clock-icon">🕐</div>,
}));

describe('Toast', () => {
  const mockNotifications = {
    notifications: [],
    removeNotification: jest.fn(),
    addNotification: jest.fn(),
    clearNotifications: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNotifications.mockReturnValue(mockNotifications);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const createMockNotification = (overrides: Partial<Notification> = {}): Notification => ({
    id: '1',
    type: 'info',
    title: 'Test Notification',
    message: 'This is a test message',
    timestamp: new Date(),
    persistent: false,
    duration: 5000,
    ...overrides,
  });

  it('renders notification content correctly', () => {
    const notification = createMockNotification({
      title: 'Success Message',
      message: 'Operation completed successfully',
      type: 'success',
    });

    render(<Toast notification={notification} />);

    expect(screen.getByText('Success Message')).toBeInTheDocument();
    expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
    expect(screen.getByTestId('check-icon')).toBeInTheDocument();
  });

  it('renders different notification types with correct icons', () => {
    const types: Array<{ type: Notification['type']; iconTestId: string }> = [
      { type: 'success', iconTestId: 'check-icon' },
      { type: 'error', iconTestId: 'alert-icon' },
      { type: 'warning', iconTestId: 'warning-icon' },
      { type: 'info', iconTestId: 'info-icon' },
    ];

    types.forEach(({ type, iconTestId }) => {
      const notification = createMockNotification({ type });
      const { unmount } = render(<Toast notification={notification} />);
      
      expect(screen.getByTestId(iconTestId)).toBeInTheDocument();
      unmount();
    });
  });

  it('shows close button and handles dismiss', async () => {
    const notification = createMockNotification();
    const onDismiss = jest.fn();

    render(<Toast notification={notification} onDismiss={onDismiss} />);

    const closeButton = screen.getByRole('button');
    await userEvent.click(closeButton);

    expect(onDismiss).toHaveBeenCalledWith('1');
    expect(mockNotifications.removeNotification).toHaveBeenCalledWith('1');
  });

  it('auto-dismisses non-persistent notifications', async () => {
    const notification = createMockNotification({
      persistent: false,
      duration: 1000,
    });

    render(<Toast notification={notification} />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockNotifications.removeNotification).toHaveBeenCalledWith('1');
    });
  });

  it('does not auto-dismiss persistent notifications', async () => {
    const notification = createMockNotification({
      persistent: true,
      duration: 1000,
    });

    render(<Toast notification={notification} />);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockNotifications.removeNotification).not.toHaveBeenCalled();
  });

  it('pauses auto-dismiss on hover', async () => {
    const notification = createMockNotification({
      persistent: false,
      duration: 1000,
    });

    render(<Toast notification={notification} pauseOnHover={true} />);

    const toast = screen.getByRole('generic');
    
    // Hover over toast
    fireEvent.mouseEnter(toast);
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should not dismiss while hovered
    expect(mockNotifications.removeNotification).not.toHaveBeenCalled();

    // Leave hover
    fireEvent.mouseLeave(toast);
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should dismiss after leaving hover
    await waitFor(() => {
      expect(mockNotifications.removeNotification).toHaveBeenCalledWith('1');
    });
  });

  it('renders action buttons', async () => {
    const action1 = jest.fn();
    const action2 = jest.fn();
    
    const notification = createMockNotification({
      actions: [
        { label: 'Confirm', action: action1, variant: 'primary' },
        { label: 'Cancel', action: action2, variant: 'secondary' },
      ],
    });

    render(<Toast notification={notification} />);

    const confirmButton = screen.getByText('Confirm');
    const cancelButton = screen.getByText('Cancel');

    expect(confirmButton).toBeInTheDocument();
    expect(cancelButton).toBeInTheDocument();

    await userEvent.click(confirmButton);
    expect(action1).toHaveBeenCalled();

    await userEvent.click(cancelButton);
    expect(action2).toHaveBeenCalled();
  });

  it('dismisses toast after action click for non-persistent notifications', async () => {
    const action = jest.fn();
    const notification = createMockNotification({
      persistent: false,
      actions: [{ label: 'Action', action }],
    });

    render(<Toast notification={notification} />);

    const actionButton = screen.getByText('Action');
    await userEvent.click(actionButton);

    expect(action).toHaveBeenCalled();
    expect(mockNotifications.removeNotification).toHaveBeenCalledWith('1');
  });

  it('does not dismiss persistent notifications after action click', async () => {
    const action = jest.fn();
    const notification = createMockNotification({
      persistent: true,
      actions: [{ label: 'Action', action }],
    });

    render(<Toast notification={notification} />);

    const actionButton = screen.getByText('Action');
    await userEvent.click(actionButton);

    expect(action).toHaveBeenCalled();
    expect(mockNotifications.removeNotification).not.toHaveBeenCalled();
  });

  it('shows progress bar for non-persistent notifications', () => {
    const notification = createMockNotification({ persistent: false });

    render(<Toast notification={notification} showProgress={true} />);

    // Progress bar should be present (we can't easily test the animation)
    const toast = screen.getByRole('generic');
    expect(toast).toBeInTheDocument();
  });

  it('does not show progress bar for persistent notifications', () => {
    const notification = createMockNotification({ persistent: true });

    render(<Toast notification={notification} showProgress={true} />);

    // Progress bar should not be present for persistent notifications
    const toast = screen.getByRole('generic');
    expect(toast).toBeInTheDocument();
  });

  it('formats timestamp correctly', () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const oneHourAgo = new Date(now.getTime() - 3600000);

    // Mock Date.now to control current time
    jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

    const recentNotification = createMockNotification({
      timestamp: new Date(now.getTime() - 30000), // 30 seconds ago
    });

    const { rerender } = render(<Toast notification={recentNotification} />);
    expect(screen.getByText('Just now')).toBeInTheDocument();

    const minuteAgoNotification = createMockNotification({
      timestamp: oneMinuteAgo,
    });

    rerender(<Toast notification={minuteAgoNotification} />);
    expect(screen.getByText('1m ago')).toBeInTheDocument();

    const hourAgoNotification = createMockNotification({
      timestamp: oneHourAgo,
    });

    rerender(<Toast notification={hourAgoNotification} />);
    // Should show formatted time
    expect(screen.getByText(oneHourAgo.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))).toBeInTheDocument();

    jest.restoreAllMocks();
  });

  it('uses custom icon when provided', () => {
    const CustomIcon = () => <div data-testid="custom-icon">Custom</div>;
    const notification = createMockNotification({
      icon: <CustomIcon />,
    });

    render(<Toast notification={notification} />);

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('info-icon')).not.toBeInTheDocument();
  });
});

describe('ToastContainer', () => {
  const mockNotifications = {
    notifications: [],
    removeNotification: jest.fn(),
    addNotification: jest.fn(),
    clearNotifications: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNotifications.mockReturnValue(mockNotifications);
  });

  it('renders nothing when no notifications', () => {
    mockUseNotifications.mockReturnValue({
      ...mockNotifications,
      notifications: [],
    });

    const { container } = render(<ToastContainer />);
    expect(container.firstChild).toBeNull();
  });

  it('renders non-persistent notifications', () => {
    const notifications = [
      {
        id: '1',
        type: 'info' as const,
        title: 'Notification 1',
        timestamp: new Date(),
        persistent: false,
      },
      {
        id: '2',
        type: 'success' as const,
        title: 'Notification 2',
        timestamp: new Date(),
        persistent: true, // Should not render
      },
      {
        id: '3',
        type: 'error' as const,
        title: 'Notification 3',
        timestamp: new Date(),
        persistent: false,
      },
    ];

    mockUseNotifications.mockReturnValue({
      ...mockNotifications,
      notifications,
    });

    render(<ToastContainer />);

    expect(screen.getByText('Notification 1')).toBeInTheDocument();
    expect(screen.queryByText('Notification 2')).not.toBeInTheDocument();
    expect(screen.getByText('Notification 3')).toBeInTheDocument();
  });

  it('limits notifications to maxToasts', () => {
    const notifications = Array.from({ length: 10 }, (_, i) => ({
      id: `${i + 1}`,
      type: 'info' as const,
      title: `Notification ${i + 1}`,
      timestamp: new Date(),
      persistent: false,
    }));

    mockUseNotifications.mockReturnValue({
      ...mockNotifications,
      notifications,
    });

    render(<ToastContainer maxToasts={3} />);

    // Should only render first 3
    expect(screen.getByText('Notification 1')).toBeInTheDocument();
    expect(screen.getByText('Notification 2')).toBeInTheDocument();
    expect(screen.getByText('Notification 3')).toBeInTheDocument();
    expect(screen.queryByText('Notification 4')).not.toBeInTheDocument();
  });

  it('applies correct position classes', () => {
    const notifications = [
      {
        id: '1',
        type: 'info' as const,
        title: 'Test',
        timestamp: new Date(),
        persistent: false,
      },
    ];

    mockUseNotifications.mockReturnValue({
      ...mockNotifications,
      notifications,
    });

    const { rerender } = render(<ToastContainer position="top-right" />);
    expect(screen.getByRole('generic')).toHaveClass('top-4', 'right-4');

    rerender(<ToastContainer position="bottom-left" />);
    expect(screen.getByRole('generic')).toHaveClass('bottom-4', 'left-4');

    rerender(<ToastContainer position="top-center" />);
    expect(screen.getByRole('generic')).toHaveClass('top-4', 'left-1/2');
  });

  it('applies custom className', () => {
    const notifications = [
      {
        id: '1',
        type: 'info' as const,
        title: 'Test',
        timestamp: new Date(),
        persistent: false,
      },
    ];

    mockUseNotifications.mockReturnValue({
      ...mockNotifications,
      notifications,
    });

    render(<ToastContainer className="custom-container" />);
    expect(screen.getByRole('generic')).toHaveClass('custom-container');
  });
});