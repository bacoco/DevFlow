/**
 * ConnectionStatus Component Tests
 * Comprehensive tests for connection status indicator
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ConnectionStatus } from '../ConnectionStatus';

expect.extend(toHaveNoViolations);

// Mock WebSocket context
const mockWebSocketContext = {
  isConnected: true,
  connectionState: 'connected' as const,
  lastConnected: new Date(),
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
};

jest.mock('../../../contexts/WebSocketContext', () => ({
  useWebSocket: () => mockWebSocketContext,
}));

describe('ConnectionStatus Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders connection status indicator', () => {
      render(<ConnectionStatus />);
      
      const indicator = screen.getByRole('status');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveAttribute('aria-label', 'Connection status');
    });

    it('shows connected state by default', () => {
      render(<ConnectionStatus />);
      
      const indicator = screen.getByRole('status');
      expect(indicator).toHaveClass('bg-success-500');
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  describe('Connection States', () => {
    it('shows connecting state', () => {
      const connectingContext = {
        ...mockWebSocketContext,
        isConnected: false,
        connectionState: 'connecting' as const,
      };

      jest.doMock('../../../contexts/WebSocketContext', () => ({
        useWebSocket: () => connectingContext,
      }));

      render(<ConnectionStatus />);
      
      const indicator = screen.getByRole('status');
      expect(indicator).toHaveClass('bg-warning-500');
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    it('shows disconnected state', () => {
      const disconnectedContext = {
        ...mockWebSocketContext,
        isConnected: false,
        connectionState: 'disconnected' as const,
      };

      jest.doMock('../../../contexts/WebSocketContext', () => ({
        useWebSocket: () => disconnectedContext,
      }));

      render(<ConnectionStatus />);
      
      const indicator = screen.getByRole('status');
      expect(indicator).toHaveClass('bg-error-500');
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('shows reconnecting state with attempt count', () => {
      const reconnectingContext = {
        ...mockWebSocketContext,
        isConnected: false,
        connectionState: 'reconnecting' as const,
        reconnectAttempts: 2,
      };

      jest.doMock('../../../contexts/WebSocketContext', () => ({
        useWebSocket: () => reconnectingContext,
      }));

      render(<ConnectionStatus />);
      
      expect(screen.getByText('Reconnecting... (2/5)')).toBeInTheDocument();
    });
  });

  describe('Visual Indicators', () => {
    it('shows pulse animation for connecting state', () => {
      const connectingContext = {
        ...mockWebSocketContext,
        isConnected: false,
        connectionState: 'connecting' as const,
      };

      jest.doMock('../../../contexts/WebSocketContext', () => ({
        useWebSocket: () => connectingContext,
      }));

      render(<ConnectionStatus />);
      
      const indicator = screen.getByRole('status');
      expect(indicator.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('shows appropriate icons for each state', () => {
      render(<ConnectionStatus />);
      
      // Connected state should show check icon
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('renders in compact mode', () => {
      render(<ConnectionStatus compact />);
      
      const indicator = screen.getByRole('status');
      expect(indicator).toHaveClass('w-3', 'h-3');
      expect(screen.queryByText('Connected')).not.toBeInTheDocument();
    });

    it('shows tooltip in compact mode', async () => {
      render(<ConnectionStatus compact />);
      
      const indicator = screen.getByRole('status');
      expect(indicator).toHaveAttribute('title', 'Connected');
    });
  });

  describe('Last Connected Time', () => {
    it('shows last connected time when disconnected', () => {
      const disconnectedContext = {
        ...mockWebSocketContext,
        isConnected: false,
        connectionState: 'disconnected' as const,
        lastConnected: new Date('2023-01-01T12:00:00Z'),
      };

      jest.doMock('../../../contexts/WebSocketContext', () => ({
        useWebSocket: () => disconnectedContext,
      }));

      render(<ConnectionStatus showLastConnected />);
      
      expect(screen.getByText(/Last connected:/)).toBeInTheDocument();
    });

    it('does not show last connected time when connected', () => {
      render(<ConnectionStatus showLastConnected />);
      
      expect(screen.queryByText(/Last connected:/)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<ConnectionStatus />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA labels', () => {
      render(<ConnectionStatus />);
      
      const indicator = screen.getByRole('status');
      expect(indicator).toHaveAttribute('aria-label', 'Connection status');
      expect(indicator).toHaveAttribute('aria-live', 'polite');
    });

    it('announces state changes to screen readers', () => {
      const { rerender } = render(<ConnectionStatus />);
      
      const indicator = screen.getByRole('status');
      expect(indicator).toHaveTextContent('Connected');

      const disconnectedContext = {
        ...mockWebSocketContext,
        isConnected: false,
        connectionState: 'disconnected' as const,
      };

      jest.doMock('../../../contexts/WebSocketContext', () => ({
        useWebSocket: () => disconnectedContext,
      }));

      rerender(<ConnectionStatus />);
      expect(indicator).toHaveTextContent('Disconnected');
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      render(<ConnectionStatus className="custom-class" />);
      
      const container = screen.getByRole('status').parentElement;
      expect(container).toHaveClass('custom-class');
    });

    it('allows custom colors for states', () => {
      render(
        <ConnectionStatus 
          colors={{
            connected: 'bg-green-600',
            connecting: 'bg-yellow-600',
            disconnected: 'bg-red-600',
            reconnecting: 'bg-orange-600',
          }}
        />
      );
      
      const indicator = screen.getByRole('status');
      expect(indicator).toHaveClass('bg-green-600');
    });
  });

  describe('Error Handling', () => {
    it('handles missing WebSocket context gracefully', () => {
      jest.doMock('../../../contexts/WebSocketContext', () => ({
        useWebSocket: () => null,
      }));

      render(<ConnectionStatus />);
      
      const indicator = screen.getByRole('status');
      expect(indicator).toHaveClass('bg-gray-400');
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });
});