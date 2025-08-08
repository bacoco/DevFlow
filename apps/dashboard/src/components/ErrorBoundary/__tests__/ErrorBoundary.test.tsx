/**
 * Error Boundary Component Tests
 * Tests error catching, reporting, and recovery mechanisms
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary, PageErrorBoundary, ComponentErrorBoundary, WidgetErrorBoundary } from '../ErrorBoundary';
import { errorReporting } from '../../../utils/errorReporting';
import { AccessibilityProvider } from '../../../contexts/AccessibilityContext';

// Mock error reporting service
jest.mock('../../../utils/errorReporting', () => ({
  errorReporting: {
    reportError: jest.fn(),
  },
}));

// Test wrapper with required providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AccessibilityProvider>
    {children}
  </AccessibilityProvider>
);

// Test component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({ 
  shouldThrow = true, 
  errorMessage = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

// Test component that works normally
const WorkingComponent: React.FC = () => <div>Working component</div>;

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Error Catching', () => {
    it('should catch and display error when child component throws', () => {
      render(
        <TestWrapper>
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should render children normally when no error occurs', () => {
      render(
        <TestWrapper>
          <ErrorBoundary>
            <WorkingComponent />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Working component')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      const onError = jest.fn();
      
      render(
        <TestWrapper>
          <ErrorBoundary onError={onError}>
            <ThrowError errorMessage="Custom error" />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Custom error' }),
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });
  });

  describe('Error Reporting', () => {
    it('should report error to error reporting service', () => {
      render(
        <TestWrapper>
          <ErrorBoundary name="TestBoundary">
            <ThrowError errorMessage="Reported error" />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(errorReporting.reportError).toHaveBeenCalledWith({
        error: expect.objectContaining({ message: 'Reported error' }),
        errorInfo: expect.objectContaining({ componentStack: expect.any(String) }),
        level: 'component',
        boundaryName: 'TestBoundary',
      });
    });

    it('should include error ID in report', () => {
      render(
        <TestWrapper>
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
        </TestWrapper>
      );

      // Check that error ID is generated and stored
      expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('should reset error state when retry button is clicked', async () => {
      let shouldThrow = true;
      const TestComponent = () => <ThrowError shouldThrow={shouldThrow} />;

      const { rerender } = render(
        <TestWrapper>
          <ErrorBoundary>
            <TestComponent />
          </ErrorBoundary>
        </TestWrapper>
      );

      // Error should be displayed
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Fix the error condition
      shouldThrow = false;

      // Click retry button
      fireEvent.click(screen.getByText('Try Again'));

      // Rerender with fixed component
      rerender(
        <TestWrapper>
          <ErrorBoundary>
            <ThrowError shouldThrow={false} />
          </ErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('No error')).toBeInTheDocument();
        expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
      });
    });

    it('should show report button and handle error reporting', () => {
      render(
        <TestWrapper>
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
        </TestWrapper>
      );

      const reportButton = screen.getByText('Report');
      expect(reportButton).toBeInTheDocument();

      // Mock window.alert
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      fireEvent.click(reportButton);

      expect(alertSpy).toHaveBeenCalledWith(
        'Error report sent successfully. Thank you for helping us improve!'
      );

      alertSpy.mockRestore();
    });
  });

  describe('Different Error Levels', () => {
    it('should render page-level error boundary correctly', () => {
      render(
        <TestWrapper>
          <PageErrorBoundary>
            <ThrowError />
          </PageErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Page Error')).toBeInTheDocument();
      expect(screen.getByText('Go Home')).toBeInTheDocument();
    });

    it('should render component-level error boundary correctly', () => {
      render(
        <TestWrapper>
          <ComponentErrorBoundary>
            <ThrowError />
          </ComponentErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.queryByText('Go Home')).not.toBeInTheDocument();
    });

    it('should render widget-level error boundary correctly', () => {
      render(
        <TestWrapper>
          <WidgetErrorBoundary>
            <ThrowError />
          </WidgetErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Custom Fallback Components', () => {
    const CustomFallback: React.FC<any> = ({ error, retry }) => (
      <div>
        <h1>Custom Error: {error.message}</h1>
        <button onClick={retry}>Custom Retry</button>
      </div>
    );

    it('should use custom fallback component when provided', () => {
      render(
        <TestWrapper>
          <ErrorBoundary fallback={CustomFallback}>
            <ThrowError errorMessage="Custom fallback test" />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Custom Error: Custom fallback test')).toBeInTheDocument();
      expect(screen.getByText('Custom Retry')).toBeInTheDocument();
    });

    it('should pass correct props to custom fallback', () => {
      const FallbackWithProps: React.FC<any> = ({ error, retry, level }) => (
        <div>
          <span>Error: {error.message}</span>
          <span>Level: {level}</span>
          <button onClick={retry}>Retry</button>
        </div>
      );

      render(
        <TestWrapper>
          <ErrorBoundary fallback={FallbackWithProps} level="widget">
            <ThrowError errorMessage="Props test" />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Error: Props test')).toBeInTheDocument();
      expect(screen.getByText('Level: widget')).toBeInTheDocument();
    });
  });

  describe('Development vs Production', () => {
    it('should show error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <TestWrapper>
          <ErrorBoundary>
            <ThrowError errorMessage="Development error" />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Development error')).toBeInTheDocument();
      expect(screen.getByText('Stack trace')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('should hide error details in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(
        <TestWrapper>
          <ErrorBoundary>
            <ThrowError errorMessage="Production error" />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(screen.queryByText('Production error')).not.toBeInTheDocument();
      expect(screen.queryByText('Stack trace')).not.toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Error Isolation', () => {
    it('should isolate errors when isolate prop is true', () => {
      const onError = jest.fn();

      render(
        <TestWrapper>
          <div>
            <ErrorBoundary isolate={true} onError={onError}>
              <ThrowError />
            </ErrorBoundary>
            <div>Other content</div>
          </div>
        </TestWrapper>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Other content')).toBeInTheDocument();
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('Multiple Error Boundaries', () => {
    it('should handle nested error boundaries correctly', () => {
      render(
        <TestWrapper>
          <ErrorBoundary name="Outer">
            <div>Outer content</div>
            <ErrorBoundary name="Inner">
              <ThrowError />
            </ErrorBoundary>
          </ErrorBoundary>
        </TestWrapper>
      );

      // Inner error boundary should catch the error
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Outer content')).toBeInTheDocument();
    });
  });

  describe('Error Boundary Cleanup', () => {
    it('should clean up timeouts on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { unmount } = render(
        <TestWrapper>
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
        </TestWrapper>
      );

      unmount();

      // Verify cleanup was called (implementation detail)
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });
  });
});