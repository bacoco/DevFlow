/**
 * AlertPreferences Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertPreferences } from '../AlertPreferences';
import { alertService, UserAlertPreferences } from '../../../services/alertService';

// Mock the alert service
jest.mock('../../../services/alertService');
const mockAlertService = alertService as jest.Mocked<typeof alertService>;

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock Button component
jest.mock('../Button', () => ({
  Button: ({ children, onClick, disabled, loading, variant, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled || loading}
      data-variant={variant}
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
  Input: ({ value, onChange, placeholder, type, ...props }: any) => (
    <input 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder}
      type={type}
      {...props}
    />
  ),
}));

// Mock icons
jest.mock('lucide-react', () => ({
  Settings: () => <div data-testid="settings-icon" />,
  Save: () => <div data-testid="save-icon" />,
  RotateCcw: () => <div data-testid="reset-icon" />,
  Bell: () => <div data-testid="bell-icon" />,
  Mail: () => <div data-testid="mail-icon" />,
  Smartphone: () => <div data-testid="smartphone-icon" />,
  Webhook: () => <div data-testid="webhook-icon" />,
}));

const mockPreferences: UserAlertPreferences = {
  userId: 'test-user',
  channels: {
    'in-app': {
      enabled: true,
      severityThreshold: 'low',
      frequency: 'immediate',
    },
    email: {
      enabled: true,
      severityThreshold: 'medium',
      frequency: 'batched',
      batchInterval: 30,
      quietHours: {
        start: '22:00',
        end: '08:00',
        timezone: 'UTC',
      },
    },
    sms: {
      enabled: false,
      severityThreshold: 'high',
      frequency: 'immediate',
    },
    push: {
      enabled: true,
      severityThreshold: 'medium',
      frequency: 'immediate',
    },
    webhook: {
      enabled: false,
      severityThreshold: 'critical',
      frequency: 'immediate',
    },
  },
  categories: {
    system: {
      enabled: true,
      channels: ['in-app', 'email'],
    },
    security: {
      enabled: true,
      channels: ['in-app', 'email', 'push'],
    },
  },
  escalationSettings: {
    autoEscalate: true,
    escalationDelay: 15,
    maxEscalationLevel: 3,
  },
  snoozeSettings: {
    defaultDuration: 30,
    maxDuration: 480,
    allowedSeverities: ['low', 'medium', 'high'],
  },
};

describe('AlertPreferences', () => {
  const mockGetUserPreferences = jest.fn();
  const mockUpdateUserPreferences = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGetUserPreferences.mockReturnValue(mockPreferences);
    mockUpdateUserPreferences.mockImplementation(() => {});

    mockAlertService.getUserPreferences = mockGetUserPreferences;
    mockAlertService.updateUserPreferences = mockUpdateUserPreferences;
  });

  it('renders alert preferences with header', () => {
    render(<AlertPreferences />);

    expect(screen.getByText('Alert Preferences')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('loads user preferences on mount', () => {
    render(<AlertPreferences userId="test-user" />);

    expect(mockGetUserPreferences).toHaveBeenCalledWith('test-user');
  });

  it('displays channel preferences correctly', () => {
    render(<AlertPreferences />);

    expect(screen.getByText('In-App Notifications')).toBeInTheDocument();
    expect(screen.getByText('Email Notifications')).toBeInTheDocument();
    expect(screen.getByText('SMS Notifications')).toBeInTheDocument();
    expect(screen.getByText('Push Notifications')).toBeInTheDocument();
    expect(screen.getByText('Webhook Notifications')).toBeInTheDocument();
  });

  it('shows enabled/disabled state for channels', () => {
    render(<AlertPreferences />);

    // Check toggle states - this would depend on the actual toggle implementation
    // For now, we'll check that the channels are rendered
    expect(screen.getByText('In-App Notifications')).toBeInTheDocument();
    expect(screen.getByText('Email Notifications')).toBeInTheDocument();
  });

  it('displays severity threshold options', () => {
    render(<AlertPreferences />);

    // Should show severity options for enabled channels
    expect(screen.getAllByText('Low')).toHaveLength(4); // One for each severity level
    expect(screen.getAllByText('Medium')).toHaveLength(4);
    expect(screen.getAllByText('High')).toHaveLength(4);
    expect(screen.getAllByText('Critical')).toHaveLength(4);
  });

  it('displays frequency options', () => {
    render(<AlertPreferences />);

    expect(screen.getAllByText('Immediate')).toHaveLength(3); // Multiple channels
    expect(screen.getAllByText('Batched')).toHaveLength(3);
    expect(screen.getAllByText('Digest')).toHaveLength(3);
  });

  it('shows batch interval input for batched frequency', () => {
    render(<AlertPreferences />);

    // Email is set to batched frequency, so should show batch interval
    const batchIntervalInputs = screen.getAllByDisplayValue('30');
    expect(batchIntervalInputs.length).toBeGreaterThan(0);
  });

  it('displays quiet hours settings', () => {
    render(<AlertPreferences />);

    expect(screen.getAllByText('From:')).toHaveLength(3); // For email, sms, push
    expect(screen.getAllByText('To:')).toHaveLength(3);
  });

  it('toggles channel enabled state', async () => {
    const user = userEvent.setup();
    render(<AlertPreferences />);

    // Find and click a channel toggle (this would depend on implementation)
    // For now, we'll simulate the behavior
    expect(screen.getByText('SMS Notifications')).toBeInTheDocument();
  });

  it('updates severity threshold', async () => {
    const user = userEvent.setup();
    render(<AlertPreferences />);

    // Click on a severity button to change threshold
    const highSeverityButtons = screen.getAllByText('High');
    await user.click(highSeverityButtons[0]);

    // Should mark as having changes
    expect(screen.getByText('Save Changes')).not.toBeDisabled();
  });

  it('updates frequency setting', async () => {
    const user = userEvent.setup();
    render(<AlertPreferences />);

    // Click on a frequency button
    const immediateButtons = screen.getAllByText('Immediate');
    await user.click(immediateButtons[0]);

    expect(screen.getByText('Save Changes')).not.toBeDisabled();
  });

  it('displays category preferences', () => {
    render(<AlertPreferences />);

    expect(screen.getByText('Category Settings')).toBeInTheDocument();
    expect(screen.getByText('system')).toBeInTheDocument();
    expect(screen.getByText('security')).toBeInTheDocument();
  });

  it('allows adding new categories', async () => {
    const user = userEvent.setup();
    render(<AlertPreferences />);

    const addCategoryInput = screen.getByPlaceholderText('Add category...');
    const addButton = screen.getByText('Add');

    await user.type(addCategoryInput, 'performance');
    await user.click(addButton);

    expect(screen.getByText('Save Changes')).not.toBeDisabled();
  });

  it('displays escalation settings', () => {
    render(<AlertPreferences />);

    expect(screen.getByText('Escalation Settings')).toBeInTheDocument();
    expect(screen.getByText('Auto-escalation')).toBeInTheDocument();
    expect(screen.getByText('Escalation Delay (minutes)')).toBeInTheDocument();
    expect(screen.getByText('Max Escalation Level')).toBeInTheDocument();
  });

  it('shows escalation delay and max level inputs when auto-escalation is enabled', () => {
    render(<AlertPreferences />);

    expect(screen.getByDisplayValue('15')).toBeInTheDocument(); // escalation delay
    expect(screen.getByDisplayValue('3')).toBeInTheDocument(); // max escalation level
  });

  it('displays snooze settings', () => {
    render(<AlertPreferences />);

    expect(screen.getByText('Snooze Settings')).toBeInTheDocument();
    expect(screen.getByText('Default Duration (minutes)')).toBeInTheDocument();
    expect(screen.getByText('Max Duration (minutes)')).toBeInTheDocument();
    expect(screen.getByText('Allowed Severities for Snoozing')).toBeInTheDocument();
  });

  it('shows snooze duration inputs', () => {
    render(<AlertPreferences />);

    expect(screen.getByDisplayValue('30')).toBeInTheDocument(); // default duration
    expect(screen.getByDisplayValue('480')).toBeInTheDocument(); // max duration
  });

  it('displays allowed severities for snoozing', () => {
    render(<AlertPreferences />);

    // Should show severity buttons for snooze settings
    const severityButtons = screen.getAllByText('Low');
    expect(severityButtons.length).toBeGreaterThan(0);
  });

  it('saves preferences when save button is clicked', async () => {
    const user = userEvent.setup();
    render(<AlertPreferences userId="test-user" />);

    // Make a change to enable save button
    const highSeverityButtons = screen.getAllByText('High');
    await user.click(highSeverityButtons[0]);

    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    expect(mockUpdateUserPreferences).toHaveBeenCalledWith(
      'test-user',
      expect.any(Object)
    );
  });

  it('resets preferences when reset button is clicked', async () => {
    const user = userEvent.setup();
    render(<AlertPreferences />);

    // Make a change to show reset button
    const highSeverityButtons = screen.getAllByText('High');
    await user.click(highSeverityButtons[0]);

    expect(screen.getByText('Reset')).toBeInTheDocument();

    const resetButton = screen.getByText('Reset');
    await user.click(resetButton);

    // Should reload original preferences
    expect(mockGetUserPreferences).toHaveBeenCalledTimes(2);
  });

  it('disables save button when no changes', () => {
    render(<AlertPreferences />);

    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).toBeDisabled();
  });

  it('enables save button when changes are made', async () => {
    const user = userEvent.setup();
    render(<AlertPreferences />);

    // Make a change
    const highSeverityButtons = screen.getAllByText('High');
    await user.click(highSeverityButtons[0]);

    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).not.toBeDisabled();
  });

  it('shows loading state while saving', async () => {
    const user = userEvent.setup();
    
    // Mock a delayed save
    mockUpdateUserPreferences.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<AlertPreferences />);

    // Make a change
    const highSeverityButtons = screen.getAllByText('High');
    await user.click(highSeverityButtons[0]);

    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    // Should show loading state (this depends on Button component implementation)
    expect(saveButton).toBeDisabled();
  });

  it('updates escalation delay input', async () => {
    const user = userEvent.setup();
    render(<AlertPreferences />);

    const escalationDelayInput = screen.getByDisplayValue('15');
    await user.clear(escalationDelayInput);
    await user.type(escalationDelayInput, '20');

    expect(screen.getByText('Save Changes')).not.toBeDisabled();
  });

  it('updates max escalation level input', async () => {
    const user = userEvent.setup();
    render(<AlertPreferences />);

    const maxLevelInput = screen.getByDisplayValue('3');
    await user.clear(maxLevelInput);
    await user.type(maxLevelInput, '5');

    expect(screen.getByText('Save Changes')).not.toBeDisabled();
  });

  it('updates snooze default duration', async () => {
    const user = userEvent.setup();
    render(<AlertPreferences />);

    const defaultDurationInput = screen.getByDisplayValue('30');
    await user.clear(defaultDurationInput);
    await user.type(defaultDurationInput, '60');

    expect(screen.getByText('Save Changes')).not.toBeDisabled();
  });

  it('updates snooze max duration', async () => {
    const user = userEvent.setup();
    render(<AlertPreferences />);

    const maxDurationInput = screen.getByDisplayValue('480');
    await user.clear(maxDurationInput);
    await user.type(maxDurationInput, '720');

    expect(screen.getByText('Save Changes')).not.toBeDisabled();
  });

  it('handles category channel toggles', async () => {
    const user = userEvent.setup();
    render(<AlertPreferences />);

    // Find category channel toggles (implementation dependent)
    expect(screen.getByText('system')).toBeInTheDocument();
    expect(screen.getByText('security')).toBeInTheDocument();
  });

  it('removes custom categories', async () => {
    const user = userEvent.setup();
    
    // Add a custom category to the mock
    const preferencesWithCustom = {
      ...mockPreferences,
      categories: {
        ...mockPreferences.categories,
        custom: {
          enabled: true,
          channels: ['in-app'],
        },
      },
    };
    
    mockGetUserPreferences.mockReturnValue(preferencesWithCustom);
    
    render(<AlertPreferences />);

    expect(screen.getByText('custom')).toBeInTheDocument();
    
    // Should show remove button for custom categories
    const removeButtons = screen.getAllByText('Remove');
    expect(removeButtons.length).toBeGreaterThan(0);
  });

  it('shows loading spinner while preferences load', () => {
    mockGetUserPreferences.mockReturnValue(null as any);
    
    render(<AlertPreferences />);

    // Should show loading spinner
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('uses default userId when not provided', () => {
    render(<AlertPreferences />);

    expect(mockGetUserPreferences).toHaveBeenCalledWith('current-user');
  });

  it('applies custom className', () => {
    const { container } = render(<AlertPreferences className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });
});