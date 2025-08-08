/**
 * Error Reporting Service Tests
 * Tests error reporting, logging, and queue management
 */

import { errorReporting, reportNetworkError, reportServiceError, useErrorReporting } from '../errorReporting';
import { renderHook, act } from '@testing-library/react';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('ErrorReportingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
    });
  });

  describe('Error Reporting', () => {
    it('should report error with correct structure', () => {
      const error = new Error('Test error');
      const errorId = errorReporting.reportError({
        error,
        level: 'component',
        boundaryName: 'TestComponent',
      });

      expect(errorId).toMatch(/^error_\d+_[a-z0-9]+$/);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'devflow_error_reports',
        expect.stringContaining('"message":"Test error"')
      );
    });

    it('should include metadata in error report', () => {
      const error = new Error('Test error with metadata');
      const metadata = { userId: '123', feature: 'dashboard' };

      errorReporting.reportError({
        error,
        level: 'service',
        metadata,
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'devflow_error_reports',
        expect.stringContaining('"userId":"123"')
      );
    });

    it('should not report errors when disabled', () => {
      errorReporting.updateConfig({ enabled: false });

      const errorId = errorReporting.reportError({
        error: new Error('Disabled error'),
        level: 'component',
      });

      expect(errorId).toBe('');
      expect(localStorageMock.setItem).not.toHaveBeenCalled();

      // Re-enable for other tests
      errorReporting.updateConfig({ enabled: true });
    });
  });

  describe('Local Storage Management', () => {
    it('should store errors in localStorage when enabled', () => {
      const error = new Error('Storage test');

      errorReporting.reportError({
        error,
        level: 'component',
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'devflow_error_reports',
        expect.any(String)
      );
    });

    it('should not store errors in localStorage when disabled', () => {
      errorReporting.updateConfig({ enableLocalStorage: false });

      const error = new Error('No storage test');

      errorReporting.reportError({
        error,
        level: 'component',
      });

      expect(localStorageMock.setItem).not.toHaveBeenCalled();

      // Re-enable for other tests
      errorReporting.updateConfig({ enableLocalStorage: true });
    });

    it('should limit stored errors to maxReports', () => {
      const existingReports = Array.from({ length: 50 }, (_, i) => ({
        id: `error_${i}`,
        message: `Error ${i}`,
        timestamp: new Date().toISOString(),
      }));

      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingReports));

      const error = new Error('New error');
      errorReporting.reportError({
        error,
        level: 'component',
      });

      const setItemCall = localStorageMock.setItem.mock.calls[0];
      const storedReports = JSON.parse(setItemCall[1]);
      
      expect(storedReports).toHaveLength(50); // Should still be 50 (max limit)
      expect(storedReports[49].message).toBe('New error'); // New error should be last
    });

    it('should retrieve local error reports', () => {
      const mockReports = [
        { id: '1', message: 'Error 1', timestamp: '2023-01-01' },
        { id: '2', message: 'Error 2', timestamp: '2023-01-02' },
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockReports));

      const reports = errorReporting.getLocalErrorReports();

      expect(reports).toEqual(mockReports);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('devflow_error_reports');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const error = new Error('Storage error test');
      const errorId = errorReporting.reportError({
        error,
        level: 'component',
      });

      expect(errorId).toMatch(/^error_\d+_[a-z0-9]+$/); // Should still return error ID
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to store error report locally:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Network Reporting', () => {
    it('should send error report to remote endpoint when online', async () => {
      errorReporting.updateConfig({
        endpoint: 'https://api.example.com/errors',
        apiKey: 'test-key',
      });

      const error = new Error('Network test');
      errorReporting.reportError({
        error,
        level: 'network',
      });

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/errors',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-key',
          }),
          body: expect.stringContaining('"message":"Network test"'),
        })
      );
    });

    it('should queue errors when offline', () => {
      Object.defineProperty(navigator, 'onLine', { value: false });

      const error = new Error('Offline test');
      errorReporting.reportError({
        error,
        level: 'component',
      });

      expect(fetch).not.toHaveBeenCalled();

      // Reset online status
      Object.defineProperty(navigator, 'onLine', { value: true });
    });

    it('should handle network errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      errorReporting.updateConfig({
        endpoint: 'https://api.example.com/errors',
      });

      const error = new Error('Network failure test');
      errorReporting.reportError({
        error,
        level: 'network',
      });

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send error report:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Error Statistics', () => {
    it('should provide error statistics', () => {
      const mockReports = [
        { id: '1', level: 'component', message: 'Error 1', timestamp: '2023-01-01' },
        { id: '2', level: 'network', message: 'Error 2', timestamp: '2023-01-02' },
        { id: '3', level: 'component', message: 'Error 3', timestamp: '2023-01-03' },
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockReports));

      const stats = errorReporting.getErrorStats();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByLevel).toEqual({
        component: 2,
        network: 1,
      });
      expect(stats.recentErrors).toHaveLength(3);
    });

    it('should return empty stats when no errors exist', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const stats = errorReporting.getErrorStats();

      expect(stats.totalErrors).toBe(0);
      expect(stats.errorsByLevel).toEqual({});
      expect(stats.recentErrors).toEqual([]);
    });
  });

  describe('Global Error Handlers', () => {
    it('should handle unhandled errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Simulate unhandled error
      const errorEvent = new ErrorEvent('error', {
        message: 'Unhandled error',
        filename: 'test.js',
        lineno: 10,
        colno: 5,
        error: new Error('Unhandled error'),
      });

      window.dispatchEvent(errorEvent);

      expect(localStorageMock.setItem).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle unhandled promise rejections', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Simulate unhandled promise rejection
      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject('Test rejection'),
        reason: 'Test rejection',
      });

      window.dispatchEvent(rejectionEvent);

      expect(localStorageMock.setItem).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});

describe('Error Reporting Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('reportNetworkError', () => {
    it('should report network error with correct metadata', () => {
      const error = new Error('Network timeout');
      const errorId = reportNetworkError(error, '/api/data', 'GET');

      expect(errorId).toMatch(/^error_\d+_[a-z0-9]+$/);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'devflow_error_reports',
        expect.stringContaining('"networkError":true')
      );
    });
  });

  describe('reportServiceError', () => {
    it('should report service error with correct metadata', () => {
      const error = new Error('Service unavailable');
      const errorId = reportServiceError(error, 'UserService', 'getUserData');

      expect(errorId).toMatch(/^error_\d+_[a-z0-9]+$/);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'devflow_error_reports',
        expect.stringContaining('"serviceError":true')
      );
    });
  });
});

describe('useErrorReporting Hook', () => {
  it('should provide error reporting functions', () => {
    const { result } = renderHook(() => useErrorReporting());

    expect(result.current.reportError).toBeInstanceOf(Function);
    expect(result.current.reportNetworkError).toBeInstanceOf(Function);
    expect(result.current.getErrorStats).toBeInstanceOf(Function);
    expect(result.current.clearLocalReports).toBeInstanceOf(Function);
  });

  it('should report errors through hook', () => {
    const { result } = renderHook(() => useErrorReporting());

    act(() => {
      const errorId = result.current.reportError(
        new Error('Hook test error'),
        { component: 'TestComponent' }
      );
      expect(errorId).toMatch(/^error_\d+_[a-z0-9]+$/);
    });

    expect(localStorageMock.setItem).toHaveBeenCalled();
  });
});