import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SmartNotificationSystem } from '../SmartNotificationSystem';

// Mock the notification services
jest.mock('../../../services/notifications/ContextualNotificationEngine', () => ({
  ContextualNotificationEngine: jest.fn().mockImplementation(() => ({
    shouldShowNotification: jest.fn().mockResolvedValue(true),
    learnFromUserInteraction: jest.fn().mockResolvedValue(undefined),
    getOptimalDeliveryTime: jest.fn().mockResolvedValue(new Date())
  }))
}));

jest.mock('../../../services/notifications/NotificationGroupingManager', () => ({
  NotificationGroupingManager: jest.fn().mockImplementation(() => ({
    groupNotifications: jest.fn().mockResolvedValue([]),
    performBatchOperation: jest.fn().mockResolvedValue({ successCount: 0, failureCount: 0 })
  }))
}));

jest.mock('../../../services/notifications/NotificationPreferencesManager', () => ({
  NotificationPreferencesManager: jest.fn().mockImplementation(() => ({
    getPreferences: jest.fn().mockResolvedValue({
      userId: 'user-123',
      channels: { inApp: true, email: false, push: true, desktop: false, mobile: true },
      frequency: { immediate: [], batched: [], daily: [], weekly: [], disabled: [] },
      categories: {},
      quietHours: { enabled: false, startTime: '22:00', endTime: '08:00', timezone: 'UTC', allowUrgent: true },
      escalation: { enabled: false, urgentDelay: 5, highDelay: 15, maxEscalations: 3, escalationChannels: [] }
    }),
    updatePreferences: jest.fn().mockResolvedValue({})
  }))
}));

jest.mock('../../../services/notifications/AlertEscalationManager', () => ({
  AlertEscalationManager: jest.fn().mockImplementation(() => ({
    initiateEscalation: jest.fn().mockResolvedValue(undefined),
    cancelEscalation: jest.fn().mockResolvedValue(undefined)
  }))
}));

jest.mock('../../../services/notifications/NotificationAnalyticsService', () => ({
  NotificationAnalyticsService: jest.fn().mockImplementation(() => ({
    recordEvent: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('SmartNotificationSystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    render(<SmartNotificationSystem userId="user-123" />);
    
    // Check for loading indicator
    const loadingElement = document.querySelector('.animate-pulse');
    expect(loadingElement).toBeInTheDocument();
  });

  it('should render notifications in correct position', () => {
    const { container } = render(
      <SmartNotificationSystem userId="user-123" position="bottom-left" />
    );

    const notificationContainer = container.querySelector('.fixed');
    expect(notificationContainer).toHaveClass('bottom-4', 'left-4');
  });

  it('should handle different positions correctly', () => {
    const positions = [
      { position: 'top-right' as const, classes: ['top-4', 'right-4'] },
      { position: 'top-left' as const, classes: ['top-4', 'left-4'] },
      { position: 'bottom-right' as const, classes: ['bottom-4', 'right-4'] },
      { position: 'bottom-left' as const, classes: ['bottom-4', 'left-4'] }
    ];

    positions.forEach(({ position, classes }) => {
      const { container } = render(
        <SmartNotificationSystem userId="user-123" position={position} />
      );

      const notificationContainer = container.querySelector('.fixed');
      classes.forEach(className => {
        expect(notificationContainer).toHaveClass(className);
      });
    });
  });

  it('should render with custom className', () => {
    const { container } = render(
      <SmartNotificationSystem userId="user-123" className="custom-class" />
    );

    const notificationContainer = container.querySelector('.fixed');
    expect(notificationContainer).toHaveClass('custom-class');
  });

  it('should handle maxVisible prop', () => {
    render(<SmartNotificationSystem userId="user-123" maxVisible={3} />);
    
    // Component should render without errors
    const loadingElement = document.querySelector('.animate-pulse');
    expect(loadingElement).toBeInTheDocument();
  });

  it('should handle autoHide prop', () => {
    render(<SmartNotificationSystem userId="user-123" autoHide={false} />);
    
    // Component should render without errors
    const loadingElement = document.querySelector('.animate-pulse');
    expect(loadingElement).toBeInTheDocument();
  });
});