/**
 * LoadingScreen Component Tests
 * Comprehensive tests for loading screen component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { LoadingScreen } from '../LoadingScreen';

expect.extend(toHaveNoViolations);

describe('LoadingScreen Component', () => {
  describe('Rendering', () => {
    it('renders loading screen with default message', () => {
      render(<LoadingScreen />);
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders with custom message', () => {
      render(<LoadingScreen message="Loading dashboard data..." />);
      
      expect(screen.getByText('Loading dashboard data...')).toBeInTheDocument();
    });

    it('renders without message when message is empty', () => {
      render(<LoadingScreen message="" />);
      
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Loading Variants', () => {
    it('renders spinner variant by default', () => {
      render(<LoadingScreen />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
    });

    it('renders dots variant', () => {
      render(<LoadingScreen variant="dots" />);
      
      const dots = screen.getByTestId('loading-dots');
      expect(dots).toBeInTheDocument();
      expect(dots.children).toHaveLength(3);
    });

    it('renders pulse variant', () => {
      render(<LoadingScreen variant="pulse" />);
      
      const pulse = screen.getByTestId('loading-pulse');
      expect(pulse).toBeInTheDocument();
      expect(pulse).toHaveClass('animate-pulse');
    });

    it('renders skeleton variant', () => {
      render(<LoadingScreen variant="skeleton" />);
      
      const skeleton = screen.getByTestId('loading-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton.children.length).toBeGreaterThan(0);
    });
  });

  describe('Size Variants', () => {
    it('renders small size', () => {
      render(<LoadingScreen size="sm" />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('w-4', 'h-4');
    });

    it('renders medium size (default)', () => {
      render(<LoadingScreen size="md" />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('w-8', 'h-8');
    });

    it('renders large size', () => {
      render(<LoadingScreen size="lg" />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('w-12', 'h-12');
    });

    it('renders extra large size', () => {
      render(<LoadingScreen size="xl" />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('w-16', 'h-16');
    });
  });

  describe('Fullscreen Mode', () => {
    it('renders in fullscreen mode', () => {
      render(<LoadingScreen fullscreen />);
      
      const container = screen.getByRole('status').parentElement;
      expect(container).toHaveClass('fixed', 'inset-0', 'z-50');
    });

    it('renders with backdrop in fullscreen mode', () => {
      render(<LoadingScreen fullscreen backdrop />);
      
      const container = screen.getByRole('status').parentElement;
      expect(container).toHaveClass('bg-black/50', 'backdrop-blur-sm');
    });

    it('does not render fullscreen styles by default', () => {
      render(<LoadingScreen />);
      
      const container = screen.getByRole('status').parentElement;
      expect(container).not.toHaveClass('fixed', 'inset-0');
    });
  });

  describe('Progress Indicator', () => {
    it('shows progress bar when progress is provided', () => {
      render(<LoadingScreen progress={50} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('shows progress percentage text', () => {
      render(<LoadingScreen progress={75} showProgressText />);
      
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('does not show progress bar when progress is not provided', () => {
      render(<LoadingScreen />);
      
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('handles progress values correctly', () => {
      const { rerender } = render(<LoadingScreen progress={0} />);
      let progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');

      rerender(<LoadingScreen progress={100} />);
      progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');

      rerender(<LoadingScreen progress={150} />);
      progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100'); // Clamped to 100
    });
  });

  describe('Custom Content', () => {
    it('renders custom children', () => {
      render(
        <LoadingScreen>
          <div data-testid="custom-content">Custom loading content</div>
        </LoadingScreen>
      );
      
      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
      expect(screen.getByText('Custom loading content')).toBeInTheDocument();
    });

    it('renders children alongside default loading indicator', () => {
      render(
        <LoadingScreen message="Loading...">
          <div data-testid="custom-content">Additional info</div>
        </LoadingScreen>
      );
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<LoadingScreen />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA attributes', () => {
      render(<LoadingScreen message="Loading data..." />);
      
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
      expect(status).toHaveAttribute('aria-label', 'Loading data...');
    });

    it('provides proper ARIA attributes for progress bar', () => {
      render(<LoadingScreen progress={60} message="Loading..." />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', 'Loading progress');
      expect(progressBar).toHaveAttribute('aria-valuenow', '60');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('announces loading state to screen readers', () => {
      render(<LoadingScreen message="Loading dashboard..." />);
      
      const status = screen.getByRole('status');
      expect(status).toHaveTextContent('Loading dashboard...');
    });

    it('handles focus management in fullscreen mode', () => {
      render(<LoadingScreen fullscreen />);
      
      const container = screen.getByRole('status').parentElement;
      expect(container).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Animation and Timing', () => {
    it('applies correct animation classes', () => {
      render(<LoadingScreen variant="spinner" />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('animate-spin');
    });

    it('applies staggered animation for dots variant', () => {
      render(<LoadingScreen variant="dots" />);
      
      const dots = screen.getByTestId('loading-dots');
      const dotElements = dots.children;
      
      expect(dotElements[0]).toHaveClass('animate-bounce');
      expect(dotElements[1]).toHaveStyle('animation-delay: 0.1s');
      expect(dotElements[2]).toHaveStyle('animation-delay: 0.2s');
    });

    it('respects reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<LoadingScreen />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toBeInTheDocument();
      // Animation classes should still be present but CSS will handle reduced motion
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      render(<LoadingScreen className="custom-loading" />);
      
      const container = screen.getByRole('status').parentElement;
      expect(container).toHaveClass('custom-loading');
    });

    it('applies custom colors', () => {
      render(<LoadingScreen color="text-primary-500" />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('text-primary-500');
    });

    it('applies custom background in fullscreen mode', () => {
      render(<LoadingScreen fullscreen backgroundColor="bg-blue-900/80" />);
      
      const container = screen.getByRole('status').parentElement;
      expect(container).toHaveClass('bg-blue-900/80');
    });
  });

  describe('Performance', () => {
    it('renders efficiently with minimal DOM nodes', () => {
      const { container } = render(<LoadingScreen />);
      
      // Should have minimal DOM structure
      const allElements = container.querySelectorAll('*');
      expect(allElements.length).toBeLessThan(10);
    });

    it('handles rapid re-renders without issues', () => {
      const { rerender } = render(<LoadingScreen progress={0} />);
      
      // Rapidly update progress
      for (let i = 1; i <= 100; i += 10) {
        rerender(<LoadingScreen progress={i} />);
      }
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined progress gracefully', () => {
      render(<LoadingScreen progress={undefined} />);
      
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('handles negative progress values', () => {
      render(<LoadingScreen progress={-10} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('handles very long messages', () => {
      const longMessage = 'A'.repeat(1000);
      render(<LoadingScreen message={longMessage} />);
      
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('handles null children gracefully', () => {
      render(<LoadingScreen>{null}</LoadingScreen>);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });
});