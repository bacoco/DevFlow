/**
 * Error Boundary Tests
 * Test suite for React error boundary component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary, withErrorBoundary, useErrorHandler } from '../ErrorBoundary';
import { ErrorHandler } from '../../../services/error-handling/ErrorHandler';

// Mock the ErrorHandler
jest.mock('../../../services/error-handling/ErrorHandler');

// Test component that throws errors
const ThrowError: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({ 
  shouldThrow = false, 
  errorMessage = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

// Test component for useErrorHandler hook
const TestHookComponent: React.FC = () => {
  const { handleError, reportError } = useErrorHandler();

  const triggerError = () => {
    const error = new Error('Manual error');
    handleError(error, { component: 'TestHookComponent' });
  };

  const triggerReport = () => {
    const error = new Error('Report error');
    reportError(error, true);
  };

  return (
    <div>
      <button onClick={triggerError}>Trigger Error</button>
      <button onClick={triggerReport}>Report Error</button>
    </div>
  );
};

describe('ErrorBoundary', () => {
  let mockErrorHandler: jest.Mocked<ErrorHandler>;

  beforeEach(() => {
    // Mock ErrorHandler
    mockErrorHandler = {
      handleUIError: jest.fn().mockResolvedValue({
        message: 'Test error occurred',
        severity: 'medium',
        actions: [],
        retryable: true,
        autoRetry: false
      }),
      reportError: jest.fn().mockResolvedValue(undefined)
    } as any;

    (ErrorHandler.getInstance as jest.Mock).mockReturnValue(mockErrorHandler);

    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn().mockReturnValue('test-session-id'),
        setItem: jest.fn()
      },
      writable: true
    });

    // Suppress console.error for cleaner test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('error catching', () => {
    it('should catch and display errors', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Component failed" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Component Error')).toBeInTheDocument();
      expect(screen.getByText('A component on this page encountered an error.')).toBeInTheDocument();
    });

    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should call onError callback when provided', () => {
      const onError = jest.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} errorMessage="Callback test" />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });

    it('should handle different error boundary levels', () => {
      render(
        <ErrorBoundary level="page" componentName="TestPage">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Page Error')).toBeInTheDocument();
      expect(screen.getByText('This page encountered an error and cannot be displayed properly.')).toBeInTheDocument();
    });
  });

  describe('error recovery', () => {
    it('should provide retry functionality', async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Component Error')).toBeInTheDocument();

      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      // Rerender with no error to simulate successful retry
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('No error')).toBeInTheDocument();
      });
    });

    it('should limit retry attempts', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const retryButton = screen.getByText('Try Again');

      // Click retry 3 times (max retries)
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);

      // After max retries, button should be disabled or not present
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    });

    it('should provide reset functionality', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const resetButton = screen.getByText('Reset');
      fireEvent.click(resetButton);

      // After reset, should show the component again (which will throw again)
      expect(screen.getByText('Component Error')).toBeInTheDocument();
    });
  });

  describe('error reporting', () => {
    it('should provide error reporting functionality', async () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reportButton = screen.getByText('Report Issue');
      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(mockErrorHandler.handleUIError).toHaveBeenCalled();
      });
    });

    it('should show report sent confirmation', async () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reportButton = screen.getByText('Report Issue');
      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(screen.getByText('✓ Report sent')).toBeInTheDocument();
      });
    });
  });

  describe('custom fallback', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(screen.queryByText('Component Error')).not.toBeInTheDocument();
    });
  });

  describe('error isolation', () => {
    it('should isolate errors when isolate prop is true', () => {
      const onError = jest.fn();

      render(
        <ErrorBoundary isolate={true} onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalled();
      expect(mockErrorHandler.handleUIError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            isolate: true
          })
        })
      );
    });
  });

  describe('withErrorBoundary HOC', () => {
    it('should wrap component with error boundary', () => {
      const WrappedComponent = withErrorBoundary(ThrowError, {
        level: 'component',
        componentName: 'WrappedThrowError'
      });

      render(<WrappedComponent shouldThrow={true} />);

      expect(screen.getByText('Component Error')).toBeInTheDocument();
    });

    it('should preserve component display name', () => {
      const TestComponent = () => <div>Test</div>;
      TestComponent.displayName = 'TestComponent';

      const WrappedComponent = withErrorBoundary(TestComponent);

      expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)');
    });
  });

  describe('useErrorHandler hook', () => {
    it('should provide error handling functionality', async () => {
      render(<TestHookComponent />);

      const triggerButton = screen.getByText('Trigger Error');
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(mockErrorHandler.handleUIError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            component: 'TestHookComponent'
          })
        );
      });
    });

    it('should provide error reporting functionality', async () => {
      render(<TestHookComponent />);

      const reportButton = screen.getByText('Report Error');
      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(mockErrorHandler.reportError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Report error'
          }),
          true
        );
      });
    });
  });

  describe('error context creation', () => {
    it('should create proper error context', () => {
      render(
        <ErrorBoundary componentName="TestComponent">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(mockErrorHandler.handleUIError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          sessionId: 'test-session-id',
          component: 'TestComponent',
          action: 'render',
          timestamp: expect.any(Date),
          url: expect.any(String),
          userAgent: expect.any(String),
          metadata: expect.any(Object)
        })
      );
    });

    it('should generate session ID if not present', () => {
      (window.sessionStorage.getItem as jest.Mock).mockReturnValue(null);

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'error_session_id',
        expect.stringMatching(/^session_\d+_[a-z0-9]+$/)
      );
    });
  });

  describe('automatic retry', () => {
    it('should schedule automatic retry for low severity errors', async () => {
      mockErrorHandler.handleUIError.mockResolvedValue({
        message: 'Test error',
        severity: 'low',
        actions: [],
        retryable: true,
        autoRetry: true,
        retryDelay: 100
      });

      jest.useFakeTimers();

      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Component Error')).toBeInTheDocument();

      // Fast-forward time to trigger auto-retry
      jest.advanceTimersByTime(150);

      // Rerender with no error to simulate successful retry
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('No error')).toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });
});