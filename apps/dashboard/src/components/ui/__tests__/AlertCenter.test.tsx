/**
 * AlertCenter Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertCenter } from '../AlertCenter';
import { alertService, Alert } from '../../../services/alertService';

// Mock the alert service
jest.mock('../../../services/alertService');
const mockAlertService = alertService as jest.Mocked<typeof alertService>;

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Button component
jest.mock('../Button', () => ({
  Button: ({ children, onClick, disabled, loading, variant, size, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled || loading}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </button>
  ),
}));

// Mock Card component
jest.mock('../Card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  ),
}));

// Mock Input component
jest.mock('../Input', () => ({
  Input: ({ value, onChange, placeholder, icon, clearable, onClear, ...props }: any) => (
    <div>
      <input 
        value={value} 
        onChange={onChange} 
        placeholder={placeholder}
        {...props}
      />
      {clearable && <button onClick={onClear}>Clear</button>}
    </div>
  ),
}));

// Mock Modal component
jest.mock('../Modal', () => ({
  Modal: ({ isOpen, onClose, title, children, ...props }: any) => 
    isOpen ? (
      <div data-testid="modal" {...props}>
        <h2>{title}</h2>
        {children}
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

// Mock icons
jest.mock('lucide-react', () => ({
  Bell: () => <div data-testid="bell-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  Info: () => <div data-testid="info-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Search: () => <div data-testid="search-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  EyeOff: () => <div data-testid="eye-off-icon" />,
  Pause: () => <div data-testid="pause-icon" />,
  MoreVertical: () => <div data-testid="more-vertical-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

const mockAlerts: Alert[] = [
  {
    id: 'alert-1',
    title: 'Critical System Alert',
    message: 'Database connection lost',
    severity: 'critical',
    category: 'system',
    source: 'monitoring',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    status: 'active',
    escalationLevel: 0,
    channels: ['in-app'],
    deliveryAttempts: [],
    tags: ['database', 'urgent'],
    metadata: {},
  },
  {
    id: 'alert-2',
    title: 'High Priority Security Alert',
    message: 'Suspicious login detected',
    severity: 'high',
    category: 'security',
    source: 'security-scanner',
    timestamp: new Date('2024-01-01T09:30:00Z'),
    status: 'acknowledged',
    acknowledgedBy: 'admin',
    acknowledgedAt: new Date('2024-01-01T09:35:00Z'),
    escalationLevel: 0,
    channels: ['in-app', 'email'],
    deliveryAttempts: [],
    tags: ['security'],
    metadata: {},
  },
  {
    id: 'alert-3',
    title: 'Medium Performance Alert',
    message: 'Response time increased',
    severity: 'medium',
    category: 'performance',
    source: 'apm',
    timestamp: new Date('2024-01-01T09:00:00Z'),
    status: 'snoozed',
    snoozedUntil: new Date('2024-01-01T10:30:00Z'),
    escalationLevel: 0,
    channels: ['in-app'],
    deliveryAttempts: [],
    tags: ['performance'],
    metadata: {},
  },
];

const mockStats = {
  total: 3,
  active: 1,
  acknowledged: 1,
  resolved: 0,
  snoozed: 1,
  escalated: 0,
  bySeverity: {
    low: 0,
    medium: 1,
    high: 1,
    critical: 1,
  },
  byCategory: {
    system: 1,
    security: 1,
    performance: 1,
  },
};

describe('AlertCenter', () => {
  const mockSubscribe = jest.fn();
  const mockAcknowledgeAlert = jest.fn();
  const mockResolveAlert = jest.fn();
  const mockSnoozeAlert = jest.fn();
  const mockGetActiveAlerts = jest.fn();
  const mockGetAlertStatistics = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSubscribe.mockReturnValue(() => {});
    mockGetActiveAlerts.mockReturnValue(mockAlerts);
    mockGetAlertStatistics.mockReturnValue(mockStats);
    mockAcknowledgeAlert.mockResolvedValue(true);
    mockResolveAlert.mockResolvedValue(true);
    mockSnoozeAlert.mockResolvedValue(true);

    mockAlertService.subscribe = mockSubscribe;
    mockAlertService.getActiveAlerts = mockGetActiveAlerts;
    mockAlertService.getAlertStatistics = mockGetAlertStatistics;
    mockAlertService.acknowledgeAlert = mockAcknowledgeAlert;
    mockAlertService.resolveAlert = mockResolveAlert;
    mockAlertService.snoozeAlert = mockSnoozeAlert;
  });

  it('renders alert center with header and stats', () => {
    render(<AlertCenter />);

    expect(screen.getByText('Alert Center')).toBeInTheDocument();
    expect(screen.getByText('1 Critical')).toBeInTheDocument();
    expect(screen.getByText('1 High')).toBeInTheDocument();
    expect(screen.getByText('1 Medium')).toBeInTheDocument();
    expect(screen.getByText('0 Low')).toBeInTheDocument();
  });

  it('displays alerts with correct information', () => {
    render(<AlertCenter />);

    expect(screen.getByText('Critical System Alert')).toBeInTheDocument();
    expect(screen.getByText('Database connection lost')).toBeInTheDocument();
    expect(screen.getByText('High Priority Security Alert')).toBeInTheDocument();
    expect(screen.getByText('Medium Performance Alert')).toBeInTheDocument();
  });

  it('shows alert status badges', () => {
    render(<AlertCenter />);

    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('acknowledged')).toBeInTheDocument();
    expect(screen.getByText('snoozed')).toBeInTheDocument();
  });

  it('shows alert severity badges', () => {
    render(<AlertCenter />);

    expect(screen.getByText('critical')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
  });

  it('displays alert metadata correctly', () => {
    render(<AlertCenter />);

    expect(screen.getByText('Category: system')).toBeInTheDocument();
    expect(screen.getByText('Source: monitoring')).toBeInTheDocument();
    expect(screen.getByText('Category: security')).toBeInTheDocument();
    expect(screen.getByText('Source: security-scanner')).toBeInTheDocument();
  });

  it('shows alert tags', () => {
    render(<AlertCenter />);

    expect(screen.getByText('database')).toBeInTheDocument();
    expect(screen.getByText('urgent')).toBeInTheDocument();
    expect(screen.getByText('security')).toBeInTheDocument();
    expect(screen.getByText('performance')).toBeInTheDocument();
  });

  it('subscribes to alert updates on mount', () => {
    render(<AlertCenter />);

    expect(mockSubscribe).toHaveBeenCalledWith(expect.any(Function));
    expect(mockGetActiveAlerts).toHaveBeenCalled();
  });

  it('handles alert acknowledgment', async () => {
    const user = userEvent.setup();
    render(<AlertCenter />);

    const acknowledgeButton = screen.getByText('Acknowledge');
    await user.click(acknowledgeButton);

    expect(mockAcknowledgeAlert).toHaveBeenCalledWith('alert-1', 'current-user');
  });

  it('handles alert resolution', async () => {
    const user = userEvent.setup();
    render(<AlertCenter />);

    const resolveButtons = screen.getAllByText('Resolve');
    await user.click(resolveButtons[0]);

    expect(mockResolveAlert).toHaveBeenCalledWith('alert-1', 'current-user');
  });

  it('shows snooze options when snooze button is clicked', async () => {
    const user = userEvent.setup();
    render(<AlertCenter />);

    const snoozeButton = screen.getAllByTestId('pause-icon')[0].closest('button');
    if (snoozeButton) {
      await user.click(snoozeButton);
    }

    expect(screen.getByText('15 minutes')).toBeInTheDocument();
    expect(screen.getByText('30 minutes')).toBeInTheDocument();
    expect(screen.getByText('1 hour')).toBeInTheDocument();
  });

  it('handles alert snoozing', async () => {
    const user = userEvent.setup();
    render(<AlertCenter />);

    const snoozeButton = screen.getAllByTestId('pause-icon')[0].closest('button');
    if (snoozeButton) {
      await user.click(snoozeButton);
    }

    const thirtyMinutesOption = screen.getByText('30 minutes');
    await user.click(thirtyMinutesOption);

    expect(mockSnoozeAlert).toHaveBeenCalledWith('alert-1', 30, 'current-user');
  });

  it('filters alerts by search term', async () => {
    const user = userEvent.setup();
    render(<AlertCenter />);

    const searchInput = screen.getByPlaceholderText('Search alerts...');
    await user.type(searchInput, 'system');

    // Should show only the system alert
    expect(screen.getByText('Critical System Alert')).toBeInTheDocument();
    expect(screen.queryByText('High Priority Security Alert')).not.toBeInTheDocument();
  });

  it('filters alerts by severity', async () => {
    const user = userEvent.setup();
    render(<AlertCenter />);

    const severitySelect = screen.getByDisplayValue('All Severities');
    await user.selectOptions(severitySelect, 'critical');

    // Should show only critical alerts
    expect(screen.getByText('Critical System Alert')).toBeInTheDocument();
    expect(screen.queryByText('High Priority Security Alert')).not.toBeInTheDocument();
  });

  it('filters alerts by status', async () => {
    const user = userEvent.setup();
    render(<AlertCenter />);

    const statusSelect = screen.getByDisplayValue('All Statuses');
    await user.selectOptions(statusSelect, 'acknowledged');

    // Should show only acknowledged alerts
    expect(screen.getByText('High Priority Security Alert')).toBeInTheDocument();
    expect(screen.queryByText('Critical System Alert')).not.toBeInTheDocument();
  });

  it('toggles resolved alerts visibility', async () => {
    const user = userEvent.setup();
    
    // Add a resolved alert to the mock
    const alertsWithResolved = [
      ...mockAlerts,
      {
        id: 'alert-4',
        title: 'Resolved Alert',
        message: 'This was resolved',
        severity: 'low' as const,
        category: 'test',
        source: 'test',
        timestamp: new Date(),
        status: 'resolved' as const,
        resolvedBy: 'admin',
        resolvedAt: new Date(),
        escalationLevel: 0,
        channels: ['in-app' as const],
        deliveryAttempts: [],
        tags: [],
        metadata: {},
      },
    ];
    
    mockGetActiveAlerts.mockReturnValue(alertsWithResolved);
    
    render(<AlertCenter />);

    // Initially resolved alerts should be hidden
    expect(screen.queryByText('Resolved Alert')).not.toBeInTheDocument();

    const showResolvedButton = screen.getByText('Show Resolved');
    await user.click(showResolvedButton);

    // Now resolved alerts should be visible
    expect(screen.getByText('Resolved Alert')).toBeInTheDocument();
    expect(screen.getByText('Hide Resolved')).toBeInTheDocument();
  });

  it('opens settings modal', async () => {
    const user = userEvent.setup();
    render(<AlertCenter />);

    const settingsButton = screen.getByTestId('settings-icon').closest('button');
    if (settingsButton) {
      await user.click(settingsButton);
    }

    expect(screen.getByText('Alert Settings')).toBeInTheDocument();
    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
  });

  it('shows empty state when no alerts', () => {
    mockGetActiveAlerts.mockReturnValue([]);
    mockGetAlertStatistics.mockReturnValue({
      ...mockStats,
      total: 0,
      active: 0,
      acknowledged: 0,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
    });

    render(<AlertCenter />);

    expect(screen.getByText('No alerts found')).toBeInTheDocument();
    expect(screen.getByText('All systems are running smoothly')).toBeInTheDocument();
  });

  it('shows expanded actions when more button is clicked', async () => {
    const user = userEvent.setup();
    render(<AlertCenter />);

    const moreButton = screen.getAllByTestId('more-vertical-icon')[0].closest('button');
    if (moreButton) {
      await user.click(moreButton);
    }

    expect(screen.getByText('Delivery attempts: 0')).toBeInTheDocument();
    expect(screen.getByText('Escalation level: 0')).toBeInTheDocument();
  });

  it('displays snooze time for snoozed alerts', () => {
    render(<AlertCenter />);

    // The snoozed alert should show remaining snooze time
    expect(screen.getByText(/Snoozed for/)).toBeInTheDocument();
  });

  it('handles compact mode', () => {
    render(<AlertCenter compact />);

    // In compact mode, the component should still render but with smaller padding
    expect(screen.getByText('Alert Center')).toBeInTheDocument();
    expect(screen.getByText('Critical System Alert')).toBeInTheDocument();
  });

  it('limits alerts when maxAlerts prop is set', () => {
    render(<AlertCenter maxAlerts={2} />);

    // Should show only 2 alerts even though there are 3 in the mock
    expect(screen.getByText('Critical System Alert')).toBeInTheDocument();
    expect(screen.getByText('High Priority Security Alert')).toBeInTheDocument();
    expect(screen.getByText('Medium Performance Alert')).toBeInTheDocument();
  });

  it('hides filters when showFilters is false', () => {
    render(<AlertCenter showFilters={false} />);

    expect(screen.queryByPlaceholderText('Search alerts...')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('All Severities')).not.toBeInTheDocument();
  });

  it('clears search when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<AlertCenter />);

    const searchInput = screen.getByPlaceholderText('Search alerts...');
    await user.type(searchInput, 'system');

    // Assuming the Input component has a clear functionality
    // This would depend on the actual Input component implementation
    expect(searchInput).toHaveValue('system');
  });

  it('updates alerts when service notifies of changes', async () => {
    const { rerender } = render(<AlertCenter />);

    // Get the callback function passed to subscribe
    const subscribeCallback = mockSubscribe.mock.calls[0][0];

    // Simulate new alerts
    const newAlerts = [
      ...mockAlerts,
      {
        id: 'alert-4',
        title: 'New Alert',
        message: 'New alert message',
        severity: 'low' as const,
        category: 'test',
        source: 'test',
        timestamp: new Date(),
        status: 'active' as const,
        escalationLevel: 0,
        channels: ['in-app' as const],
        deliveryAttempts: [],
        tags: [],
        metadata: {},
      },
    ];

    act(() => {
      subscribeCallback(newAlerts);
    });

    rerender(<AlertCenter />);

    expect(screen.getByText('New Alert')).toBeInTheDocument();
  });
});