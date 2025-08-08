/**
 * Network Status Component Tests
 * Tests network status display and offline functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NetworkStatus, NetworkStatusIndicator } from '../NetworkStatus';
import { useOfflineService } from '../../../services/offlineService';
import { AccessibilityProvider } from '../../../contexts/AccessibilityContext';

// Mock the offline service hook
jest.mock('../../../services/offlineService', () => ({
  useOfflineService: jest.fn(),
}));

// Test wrapper with required providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AccessibilityProvider>
    {children}
  </AccessibilityProvider>
);

const mockUseOfflineService = useOfflineService as jest.MockedFunction<typeof useOfflineService>;

describe('NetworkStatus', () => {
  const defaultMockReturn = {
    networkStatus: {
      online: true,
      lastSync: new Date('2023-01-01T12:00:00Z'),
      queueSize: 0,
    },
    syncResult: null,
    syncData: jest.fn(),
    isOffline: false,
    getQueuedOperations: jest.fn(() => []),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOfflineService.mockReturnValue(defaultMockReturn);
  });

  describe('Online Status', () => {
    it('should display online status when connected', () => {
      render(
        <TestWrapper>
          <NetworkStatus />
        </TestWrapper>
      );

      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByText(/Last sync:/)).toBeInTheDocument();
    });

    it('should show green wifi icon when online', () => {
      render(
        <TestWrapper>
          <NetworkStatus />
        </TestWrapper>
      );

      const wifiIcon = document.querySelector('.text-green-500');
      expect(wifiIcon).toBeInTheDocument();
    });

    it('should not show sync button when queue is empty', () => {
      render(
        <TestWrapper>
          <NetworkStatus />
        </TestWrapper>
      );

      expect(screen.queryByText('Sync Now')).not.toBeInTheDocument();
    });
  });

  describe('Offline Status', () => {
    beforeEach(() => {
      mockUseOfflineService.mockReturnValue({
        ...defaultMockReturn,
        networkStatus: {
          ...defaultMockReturn.networkStatus,
          online: false,
        },
        isOffline: true,
      });
    });

    it('should display offline status when disconnected', () => {
      render(
        <TestWrapper>
          <NetworkStatus />
        </TestWrapper>
      );

      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('should show red wifi-off icon when offline', () => {
      render(
        <TestWrapper>
          <NetworkStatus />
        </TestWrapper>
      );

      const wifiOffIcon = document.querySelector('.text-red-500');
      expect(wifiOffIcon).toBeInTheDocument();
    });

    it('should not show sync button when offline', () => {
      render(
        <TestWrapper>
          <NetworkStatus />
        </TestWrapper>
      );

      expect(screen.queryByText('Sync Now')).not.toBeInTheDocument();
    });
  });

  describe('Pending Operations', () => {
    beforeEach(() => {
      mockUseOfflineService.mockReturnValue({
        ...defaultMockReturn,
        networkStatus: {
          ...defaultMockReturn.networkStatus,
          queueSize: 3,
        },
      });
    });

    it('should display pending operations count', () => {
      render(
        <TestWrapper>
          <NetworkStatus />
        </TestWrapper>
      );

      expect(screen.getByText('3 pending')).toBeInTheDocument();
    });

    it('should show amber clock icon when operations are pending', () => {
      render(
        <TestWrapper>
          <NetworkStatus />
        </TestWrapper>
      );

      const clockIcon = document.querySelector('.text-amber-500');
      expect(clockIcon).toBeInTheDocument();
    });

    it('should show sync button when operations are pending and online', () => {
      render(
        <TestWrapper>
          <NetworkStatus />
        </TestWrapper>
      );

      expect(screen.getByText('Sync Now')).toBeInTheDocument();
    });

    it('should call syncData when sync button is clicked', async () => {
      const mockSyncData = jest.fn();
      mockUseOfflineService.mockReturnValue({
        ...defaultMockReturn,
        networkStatus: {
          ...defaultMockReturn.networkStatus,
          queueSize: 3,
        },
        syncData: mockSyncData,
      });

      render(
        <TestWrapper>
          <NetworkStatus />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Sync Now'));

      expect(mockSyncData).toHaveBeenCalled();
    });
  });

  describe('Syncing Status', () => {
    it('should show syncing status during sync operation', async () => {
      const mockSyncData = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      mockUseOfflineService.mockReturnValue({
        ...defaultMockReturn,
        networkStatus: {
          ...defaultMockReturn.networkStatus,
          queueSize: 1,
        },
        syncData: mockSyncData,
      });

      render(
        <TestWrapper>
          <NetworkStatus />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Sync Now'));

      expect(screen.getByText('Syncing...')).toBeInTheDocument();
      
      const syncIcon = document.querySelector('.animate-spin');
      expect(syncIcon).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Syncing...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Compact Mode', () => {
    it('should render in compact mode', () => {
      render(
        <TestWrapper>
          <NetworkStatus compact />
        </TestWrapper>
      );

      expect(screen.getByText('Online')).toBeInTheDocument();
      // Should not have the full card structure
      expect(screen.queryByText('Connection:')).not.toBeInTheDocument();
    });

    it('should show inline sync button in compact mode with pending operations', () => {
      mockUseOfflineService.mockReturnValue({
        ...defaultMockReturn,
        networkStatus: {
          ...defaultMockReturn.networkStatus,
          queueSize: 2,
        },
      });

      render(
        <TestWrapper>
          <NetworkStatus compact />
        </TestWrapper>
      );

      expect(screen.getByText('2 pending')).toBeInTheDocument();
      
      // Should have a small sync button
      const syncButton = document.querySelector('button');
      expect(syncButton).toBeInTheDocument();
    });
  });

  describe('Detailed View', () => {
    it('should show detailed information when showDetails is true', () => {
      render(
        <TestWrapper>
          <NetworkStatus showDetails />
        </TestWrapper>
      );

      expect(screen.getByText('Connection:')).toBeInTheDocument();
      expect(screen.getByText('Pending operations:')).toBeInTheDocument();
      expect(screen.getByText('Last sync:')).toBeInTheDocument();
    });

    it('should show sync result when available', () => {
      mockUseOfflineService.mockReturnValue({
        ...defaultMockReturn,
        syncResult: {
          success: true,
          syncedItems: 5,
          failedItems: 1,
          conflicts: [],
        },
      });

      render(
        <TestWrapper>
          <NetworkStatus showDetails />
        </TestWrapper>
      );

      expect(screen.getByText('Last Sync Result')).toBeInTheDocument();
      expect(screen.getByText('Synced: 5 items')).toBeInTheDocument();
      expect(screen.getByText('Failed: 1 items')).toBeInTheDocument();
    });

    it('should show conflicts in sync result', () => {
      mockUseOfflineService.mockReturnValue({
        ...defaultMockReturn,
        syncResult: {
          success: false,
          syncedItems: 3,
          failedItems: 0,
          conflicts: [
            {
              id: 'conflict-1',
              localData: {},
              serverData: {},
              resolution: 'manual',
            },
          ],
        },
      });

      render(
        <TestWrapper>
          <NetworkStatus showDetails />
        </TestWrapper>
      );

      expect(screen.getByText('Conflicts: 1 items')).toBeInTheDocument();
    });

    it('should show offline message when disconnected', () => {
      mockUseOfflineService.mockReturnValue({
        ...defaultMockReturn,
        networkStatus: {
          ...defaultMockReturn.networkStatus,
          online: false,
        },
        isOffline: true,
      });

      render(
        <TestWrapper>
          <NetworkStatus showDetails />
        </TestWrapper>
      );

      expect(screen.getByText(/You're currently offline/)).toBeInTheDocument();
    });
  });
});

describe('NetworkStatusIndicator', () => {
  const defaultMockReturn = {
    networkStatus: {
      online: true,
      lastSync: new Date(),
      queueSize: 0,
    },
    syncResult: null,
    syncData: jest.fn(),
    isOffline: false,
    getQueuedOperations: jest.fn(() => []),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOfflineService.mockReturnValue(defaultMockReturn);
  });

  it('should not render when online with empty queue', () => {
    const { container } = render(
        <TestWrapper>
          <NetworkStatusIndicator />
        </TestWrapper>
      );
    expect(container.firstChild).toBeNull();
  });

  it('should show offline indicator when disconnected', () => {
    mockUseOfflineService.mockReturnValue({
      ...defaultMockReturn,
      isOffline: true,
    });

    render(
        <TestWrapper>
          <NetworkStatusIndicator />
        </TestWrapper>
      );

    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('should show pending operations indicator', () => {
    mockUseOfflineService.mockReturnValue({
      ...defaultMockReturn,
      networkStatus: {
        ...defaultMockReturn.networkStatus,
        queueSize: 2,
      },
    });

    render(
        <TestWrapper>
          <NetworkStatusIndicator />
        </TestWrapper>
      );

    expect(screen.getByText('2 pending')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    mockUseOfflineService.mockReturnValue({
      ...defaultMockReturn,
      isOffline: true,
    });

    render(
        <TestWrapper>
          <NetworkStatusIndicator className="custom-class" />
        </TestWrapper>
      );

    const indicator = screen.getByText('Offline').closest('div');
    expect(indicator).toHaveClass('custom-class');
  });
});