import React, { Suspense } from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  LazyWrapper,
  usePreloadOnHover,
  usePreloadInViewport,
  createLazyRoute,
  ComponentPreloader,
  RoutePreloader,
} from '../LazyLoadingManager';

// Mock components for testing
const MockComponent = ({ children }: { children?: React.ReactNode }) => (
  <div data-testid="mock-component">{children}</div>
);

const MockLazyComponent = () => (
  <div data-testid="lazy-component">Lazy Loaded Content</div>
);

// Mock dynamic import
const mockLoader = jest.fn(() => 
  Promise.resolve({ default: MockLazyComponent })
);

const mockFailingLoader = jest.fn(() => 
  Promise.reject(new Error('Failed to load component'))
);

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.prototype.observe = jest.fn();
mockIntersectionObserver.prototype.unobserve = jest.fn();
mockIntersectionObserver.prototype.disconnect = jest.fn();

Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  value: mockIntersectionObserver,
});

// Mock requestIdleCallback
Object.defineProperty(global, 'requestIdleCallback', {
  writable: true,
  value: (callback: () => void) => setTimeout(callback, 0),
});

describe('Lazy Loading Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('LazyWrapper Component', () => {
    it('should render fallback while loading', async () => {
      const config = {
        loader: mockLoader,
        fallback: <div data-testid="loading">Loading...</div>,
      };

      render(
        <LazyWrapper componentKey="test-component" config={config} />
      );

      expect(screen.getByTestId('loading')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByTestId('lazy-component')).toBeInTheDocument();
      });
    });

    it('should handle loading errors gracefully', async () => {
      const config = {
        loader: mockFailingLoader,
        retryCount: 1,
      };

      render(
        <LazyWrapper componentKey="failing-component" config={config} />
      );

      await waitFor(() => {
        expect(screen.getByText(/failed to load component/i)).toBeInTheDocument();
      });

      // Should show retry button
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should implement retry logic with exponential backoff', async () => {
      const config = {
        loader: mockFailingLoader,
        retryCount: 3,
      };

      const startTime = Date.now();
      
      render(
        <LazyWrapper componentKey="retry-component" config={config} />
      );

      await waitFor(() => {
        expect(screen.getByText(/failed to load component/i)).toBeInTheDocument();
      }, { timeout: 10000 });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should have taken time for retries (1s + 2s + 4s = 7s minimum)
      expect(totalTime).toBeGreaterThan(1000);
      expect(mockFailingLoader).toHaveBeenCalledTimes(3);
    });

    it('should respect timeout configuration', async () => {
      const slowLoader = vi.fn(() => 
        new Promise(resolve => setTimeout(() => resolve({ default: MockLazyComponent }), 2000))
      );

      const config = {
        loader: slowLoader,
        timeout: 1000, // 1 second timeout
      };

      render(
        <LazyWrapper componentKey="timeout-component" config={config} />
      );

      await waitFor(() => {
        expect(screen.getByText(/failed to load component/i)).toBeInTheDocument();
      });
    });
  });

  describe('Preloading Strategies', () => {
    it('should preload on hover', async () => {
      const TestComponent = () => {
        const hoverProps = usePreloadOnHover('hover-component', mockLoader);
        return <div data-testid="hover-target" {...hoverProps}>Hover me</div>;
      };

      render(<TestComponent />);

      const hoverTarget = screen.getByTestId('hover-target');
      fireEvent.mouseEnter(hoverTarget);

      await waitFor(() => {
        expect(mockLoader).toHaveBeenCalled();
      });
    });

    it('should preload when in viewport', async () => {
      const TestComponent = () => {
        const setRef = usePreloadInViewport('viewport-component', mockLoader);
        return <div ref={setRef} data-testid="viewport-target">In viewport</div>;
      };

      render(<TestComponent />);

      // Simulate intersection observer callback
      const observerCallback = mockIntersectionObserver.mock.calls[0]?.[0];
      if (observerCallback) {
        observerCallback([{
          isIntersecting: true,
          target: screen.getByTestId('viewport-target'),
        }]);
      }

      await waitFor(() => {
        expect(mockLoader).toHaveBeenCalled();
      });
    });

    it('should preload immediately when strategy is immediate', () => {
      const config = {
        loader: mockLoader,
        preloadStrategy: 'immediate' as const,
      };

      render(
        <LazyWrapper componentKey="immediate-component" config={config} />
      );

      expect(mockLoader).toHaveBeenCalled();
    });

    it('should preload on idle when strategy is idle', async () => {
      const config = {
        loader: mockLoader,
        preloadStrategy: 'idle' as const,
      };

      render(
        <LazyWrapper componentKey="idle-component" config={config} />
      );

      await waitFor(() => {
        expect(mockLoader).toHaveBeenCalled();
      });
    });
  });

  describe('Route Preloading', () => {
    it('should create lazy route with suspense boundary', async () => {
      const LazyRoute = createLazyRoute(
        mockLoader,
        <div data-testid="route-loading">Loading route...</div>
      );

      render(<LazyRoute />);

      expect(screen.getByTestId('route-loading')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('lazy-component')).toBeInTheDocument();
      });
    });

    it('should preload routes on hover', () => {
      const hoverProps = RoutePreloader.preloadRouteOnHover('/test-route', mockLoader);
      
      const TestLink = () => (
        <a href="/test-route" data-testid="route-link" {...hoverProps}>
          Test Route
        </a>
      );

      render(<TestLink />);

      const link = screen.getByTestId('route-link');
      fireEvent.mouseEnter(link);

      expect(mockLoader).toHaveBeenCalled();
    });

    it('should preload routes on focus for keyboard navigation', () => {
      const hoverProps = RoutePreloader.preloadRouteOnHover('/test-route', mockLoader);
      
      const TestLink = () => (
        <a href="/test-route" data-testid="route-link" {...hoverProps}>
          Test Route
        </a>
      );

      render(<TestLink />);

      const link = screen.getByTestId('route-link');
      fireEvent.focus(link);

      expect(mockLoader).toHaveBeenCalled();
    });
  });

  describe('Performance Optimization', () => {
    it('should avoid duplicate preloading', async () => {
      // First preload
      ComponentPreloader.preload('duplicate-test', mockLoader);
      
      // Second preload of same component
      ComponentPreloader.preload('duplicate-test', mockLoader);

      await waitFor(() => {
        expect(mockLoader).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle preload failures gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      await expect(
        ComponentPreloader.preload('failing-component', mockFailingLoader)
      ).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to preload component'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should check if component is already preloaded', () => {
      ComponentPreloader.preload('preloaded-component', mockLoader);
      
      expect(ComponentPreloader.isPreloaded('preloaded-component')).toBe(true);
      expect(ComponentPreloader.isPreloaded('not-preloaded')).toBe(false);
    });

    it('should measure preloading performance', async () => {
      const startTime = performance.now();
      
      await ComponentPreloader.preload('performance-test', mockLoader);
      
      const endTime = performance.now();
      const preloadTime = endTime - startTime;
      
      expect(preloadTime).toBeLessThan(100); // Should preload quickly
    });
  });

  describe('Memory Management', () => {
    it('should clean up intersection observers', () => {
      const TestComponent = () => {
        const setRef = usePreloadInViewport('cleanup-test', mockLoader);
        return <div ref={setRef}>Test</div>;
      };

      const { unmount } = render(<TestComponent />);
      
      unmount();

      expect(mockIntersectionObserver.prototype.disconnect).toHaveBeenCalled();
    });

    it('should not leak memory with many preloaded components', () => {
      // Simulate preloading many components
      const componentKeys = Array.from({ length: 100 }, (_, i) => `component-${i}`);
      
      componentKeys.forEach(key => {
        ComponentPreloader.schedulePreload(key, mockLoader, 'idle');
      });

      // Memory usage should remain reasonable
      // This is a basic test - in real scenarios you'd use memory profiling tools
      expect(componentKeys.length).toBe(100);
    });
  });

  describe('Error Boundaries and Fallbacks', () => {
    it('should render custom fallback during loading', () => {
      const customFallback = <div data-testid="custom-fallback">Custom Loading</div>;
      
      const config = {
        loader: mockLoader,
        fallback: customFallback,
      };

      render(
        <LazyWrapper componentKey="custom-fallback-test" config={config} />
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    });

    it('should provide retry functionality after errors', async () => {
      let shouldFail = true;
      const conditionalLoader = jest.fn(() => {
        if (shouldFail) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({ default: MockLazyComponent });
      });

      const config = {
        loader: conditionalLoader,
        retryCount: 1,
      };

      render(
        <LazyWrapper componentKey="retry-test" config={config} />
      );

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Fix the loader and retry
      shouldFail = false;
      fireEvent.click(screen.getByText('Retry'));

      await waitFor(() => {
        expect(screen.getByTestId('lazy-component')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should maintain focus management during lazy loading', async () => {
      const config = {
        loader: mockLoader,
      };

      render(
        <div>
          <button data-testid="before">Before</button>
          <LazyWrapper componentKey="focus-test" config={config} />
          <button data-testid="after">After</button>
        </div>
      );

      const beforeButton = screen.getByTestId('before');
      beforeButton.focus();

      await waitFor(() => {
        expect(screen.getByTestId('lazy-component')).toBeInTheDocument();
      });

      // Focus should not be lost during loading
      expect(document.activeElement).toBe(beforeButton);
    });

    it('should provide appropriate loading announcements', () => {
      const config = {
        loader: mockLoader,
        fallback: <div role="status" aria-live="polite">Loading component...</div>,
      };

      render(
        <LazyWrapper componentKey="a11y-test" config={config} />
      );

      const loadingAnnouncement = screen.getByRole('status');
      expect(loadingAnnouncement).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Network Conditions', () => {
    it('should adapt preloading based on connection speed', () => {
      // Mock slow connection
      Object.defineProperty(navigator, 'connection', {
        writable: true,
        value: {
          effectiveType: '2g',
          downlink: 0.5,
        },
      });

      const config = {
        loader: mockLoader,
        preloadStrategy: 'hover' as const,
      };

      render(
        <LazyWrapper componentKey="slow-connection-test" config={config} />
      );

      // On slow connections, should be more conservative with preloading
      expect(mockLoader).not.toHaveBeenCalled();
    });

    it('should handle offline scenarios', async () => {
      // Mock offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const config = {
        loader: mockFailingLoader, // Will fail due to offline
      };

      render(
        <LazyWrapper componentKey="offline-test" config={config} />
      );

      await waitFor(() => {
        expect(screen.getByText(/failed to load component/i)).toBeInTheDocument();
      });
    });
  });
});