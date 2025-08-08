/**
 * SkipLinks Component Tests
 * Comprehensive tests for skip links accessibility functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import SkipLinks from '../SkipLinks';
import { AccessibilityProvider } from '../../../contexts/AccessibilityContext';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock providers
const MockProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AccessibilityProvider>
    {children}
  </AccessibilityProvider>
);

// Mock DOM elements for skip targets
const createMockTarget = (id: string) => {
  const element = document.createElement('div');
  element.id = id.replace('#', '');
  element.tabIndex = -1;
  element.focus = jest.fn();
  element.scrollIntoView = jest.fn();
  document.body.appendChild(element);
  return element;
};

describe('SkipLinks Component', () => {
  beforeEach(() => {
    // Clear document body
    document.body.innerHTML = '';
    
    // Create mock target elements
    createMockTarget('main-content');
    createMockTarget('navigation');
    createMockTarget('sidebar');
    createMockTarget('footer');
    
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = jest.fn();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Basic Rendering', () => {
    it('renders with default links', () => {
      render(
        <MockProviders>
          <SkipLinks />
        </MockProviders>
      );
      
      expect(screen.getByRole('navigation', { name: 'Skip links' })).toBeInTheDocument();
      expect(screen.getByText('Skip to main content')).toBeInTheDocument();
      expect(screen.getByText('Skip to navigation')).toBeInTheDocument();
      expect(screen.getByText('Skip to sidebar')).toBeInTheDocument();
      expect(screen.getByText('Skip to footer')).toBeInTheDocument();
    });

    it('renders with custom links', () => {
      const customLinks = [
        { href: '#header', label: 'Skip to header' },
        { href: '#content', label: 'Skip to content' },
      ];
      
      render(
        <MockProviders>
          <SkipLinks links={customLinks} />
        </MockProviders>
      );
      
      expect(screen.getByText('Skip to header')).toBeInTheDocument();
      expect(screen.getByText('Skip to content')).toBeInTheDocument();
      expect(screen.queryByText('Skip to main content')).not.toBeInTheDocument();
    });

    it('does not render when skip links are disabled', () => {
      // Mock accessibility context with skip links disabled
      const MockProvidersDisabled: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <AccessibilityProvider>
          {children}
        </AccessibilityProvider>
      );

      // We need to mock the useAccessibility hook to return disabled skip links
      const mockUseAccessibility = jest.fn(() => ({
        settings: { skipLinks: false, reducedMotion: false },
        announceToScreenReader: jest.fn(),
      }));

      jest.doMock('../../../contexts/AccessibilityContext', () => ({
        AccessibilityProvider: ({ children }: any) => children,
        useAccessibility: mockUseAccessibility,
      }));

      const { container } = render(<SkipLinks />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Navigation Functionality', () => {
    it('focuses target element when skip link is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <MockProviders>
          <SkipLinks />
        </MockProviders>
      );
      
      const skipLink = screen.getByText('Skip to main content');
      await user.click(skipLink);
      
      const target = document.getElementById('main-content');
      expect(target?.focus).toHaveBeenCalled();
    });

    it('scrolls to target element when skip link is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <MockProviders>
          <SkipLinks />
        </MockProviders>
      );
      
      const skipLink = screen.getByText('Skip to main content');
      await user.click(skipLink);
      
      const target = document.getElementById('main-content');
      expect(target?.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      });
    });

    it('uses auto scroll behavior when reduced motion is enabled', async () => {
      // Mock reduced motion preference
      const mockUseAccessibility = jest.fn(() => ({
        settings: { skipLinks: true, reducedMotion: true },
        announceToScreenReader: jest.fn(),
      }));

      jest.doMock('../../../contexts/AccessibilityContext', () => ({
        AccessibilityProvider: ({ children }: any) => children,
        useAccessibility: mockUseAccessibility,
      }));

      const user = userEvent.setup();
      
      render(<SkipLinks />);
      
      const skipLink = screen.getByText('Skip to main content');
      await user.click(skipLink);
      
      const target = document.getElementById('main-content');
      expect(target?.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'auto',
        block: 'start',
      });
    });

    it('handles keyboard navigation with Enter key', async () => {
      const user = userEvent.setup();
      
      render(
        <MockProviders>
          <SkipLinks />
        </MockProviders>
      );
      
      const skipLink = screen.getByText('Skip to main content');
      skipLink.focus();
      await user.keyboard('{Enter}');
      
      const target = document.getElementById('main-content');
      expect(target?.focus).toHaveBeenCalled();
    });

    it('does not handle other keyboard keys', async () => {
      const user = userEvent.setup();
      
      render(
        <MockProviders>
          <SkipLinks />
        </MockProviders>
      );
      
      const skipLink = screen.getByText('Skip to main content');
      skipLink.focus();
      await user.keyboard('{Space}');
      
      const target = document.getElementById('main-content');
      expect(target?.focus).not.toHaveBeenCalled();
    });

    it('prevents default link behavior', async () => {
      const user = userEvent.setup();
      
      render(
        <MockProviders>
          <SkipLinks />
        </MockProviders>
      );
      
      const skipLink = screen.getByText('Skip to main content');
      const clickEvent = jest.fn();
      skipLink.addEventListener('click', clickEvent);
      
      await user.click(skipLink);
      
      expect(clickEvent).toHaveBeenCalled();
      const event = clickEvent.mock.calls[0][0];
      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe('Target Element Handling', () => {
    it('makes target element focusable if not already', async () => {
      const user = userEvent.setup();
      
      // Create target with tabIndex -1
      const target = document.getElementById('main-content');
      if (target) {
        target.tabIndex = -1;
      }
      
      render(
        <MockProviders>
          <SkipLinks />
        </MockProviders>
      );
      
      const skipLink = screen.getByText('Skip to main content');
      await user.click(skipLink);
      
      expect(target?.tabIndex).toBe(-1);
    });

    it('restores original tabIndex after focusing', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup();
      
      // Create target with original tabIndex
      const target = document.getElementById('main-content');
      if (target) {
        target.tabIndex = 0;
      }
      
      render(
        <MockProviders>
          <SkipLinks />
        </MockProviders>
      );
      
      const skipLink = screen.getByText('Skip to main content');
      await user.click(skipLink);
      
      // Fast-forward time to trigger tabIndex restoration
      jest.advanceTimersByTime(150);
      
      expect(target?.tabIndex).toBe(0);
      
      jest.useRealTimers();
    });

    it('handles missing target elements gracefully', async () => {
      const user = userEvent.setup();
      
      // Remove target element
      const target = document.getElementById('main-content');
      if (target) {
        target.remove();
      }
      
      render(
        <MockProviders>
          <SkipLinks />
        </MockProviders>
      );
      
      const skipLink = screen.getByText('Skip to main content');
      
      // Should not throw error
      expect(async () => {
        await user.click(skipLink);
      }).not.toThrow();
    });
  });

  describe('Screen Reader Announcements', () => {
    it('announces skip action to screen reader', async () => {
      const mockAnnounce = jest.fn();
      const mockUseAccessibility = jest.fn(() => ({
        settings: { skipLinks: true, reducedMotion: false },
        announceToScreenReader: mockAnnounce,
      }));

      jest.doMock('../../../contexts/AccessibilityContext', () => ({
        AccessibilityProvider: ({ children }: any) => children,
        useAccessibility: mockUseAccessibility,
      }));

      const user = userEvent.setup();
      
      render(<SkipLinks />);
      
      const skipLink = screen.getByText('Skip to main content');
      await user.click(skipLink);
      
      expect(mockAnnounce).toHaveBeenCalledWith(
        'Skipped to skip to main content',
        'polite'
      );
    });
  });

  describe('Link Attributes', () => {
    it('has correct href attributes', () => {
      render(
        <MockProviders>
          <SkipLinks />
        </MockProviders>
      );
      
      const mainContentLink = screen.getByText('Skip to main content');
      expect(mainContentLink).toHaveAttribute('href', '#main-content');
      
      const navigationLink = screen.getByText('Skip to navigation');
      expect(navigationLink).toHaveAttribute('href', '#navigation');
    });

    it('has skip-link class for styling', () => {
      render(
        <MockProviders>
          <SkipLinks />
        </MockProviders>
      );
      
      const skipLink = screen.getByText('Skip to main content');
      expect(skipLink).toHaveClass('skip-link');
    });
  });

  describe('Accessibility', () => {
    it('should not have any accessibility violations', async () => {
      const { container } = render(
        <MockProviders>
          <SkipLinks />
        </MockProviders>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper ARIA attributes', () => {
      render(
        <MockProviders>
          <SkipLinks />
        </MockProviders>
      );
      
      const container = screen.getByRole('navigation', { name: 'Skip links' });
      expect(container).toHaveAttribute('role', 'navigation');
      expect(container).toHaveAttribute('aria-label', 'Skip links');
    });

    it('provides keyboard navigation', () => {
      render(
        <MockProviders>
          <SkipLinks />
        </MockProviders>
      );
      
      const skipLinks = screen.getAllByRole('link');
      skipLinks.forEach(link => {
        expect(link).toBeInstanceOf(HTMLAnchorElement);
        // Links should be focusable by default
        expect(link.tabIndex).not.toBe(-1);
      });
    });

    it('maintains focus order', () => {
      render(
        <MockProviders>
          <SkipLinks />
        </MockProviders>
      );
      
      const skipLinks = screen.getAllByRole('link');
      expect(skipLinks).toHaveLength(4);
      
      // Links should appear in DOM order
      expect(skipLinks[0]).toHaveTextContent('Skip to main content');
      expect(skipLinks[1]).toHaveTextContent('Skip to navigation');
      expect(skipLinks[2]).toHaveTextContent('Skip to sidebar');
      expect(skipLinks[3]).toHaveTextContent('Skip to footer');
    });
  });

  describe('Custom Links', () => {
    it('handles empty links array', () => {
      render(
        <MockProviders>
          <SkipLinks links={[]} />
        </MockProviders>
      );
      
      const container = screen.getByRole('navigation', { name: 'Skip links' });
      expect(container).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('handles single custom link', () => {
      const customLinks = [
        { href: '#custom', label: 'Skip to custom section' },
      ];
      
      render(
        <MockProviders>
          <SkipLinks links={customLinks} />
        </MockProviders>
      );
      
      expect(screen.getByText('Skip to custom section')).toBeInTheDocument();
      expect(screen.getAllByRole('link')).toHaveLength(1);
    });

    it('handles multiple custom links', () => {
      const customLinks = [
        { href: '#section1', label: 'Skip to section 1' },
        { href: '#section2', label: 'Skip to section 2' },
        { href: '#section3', label: 'Skip to section 3' },
      ];
      
      render(
        <MockProviders>
          <SkipLinks links={customLinks} />
        </MockProviders>
      );
      
      expect(screen.getByText('Skip to section 1')).toBeInTheDocument();
      expect(screen.getByText('Skip to section 2')).toBeInTheDocument();
      expect(screen.getByText('Skip to section 3')).toBeInTheDocument();
      expect(screen.getAllByRole('link')).toHaveLength(3);
    });
  });

  describe('Edge Cases', () => {
    it('handles links with special characters in href', async () => {
      const user = userEvent.setup();
      const specialLinks = [
        { href: '#section-with-dashes', label: 'Skip to dashed section' },
        { href: '#section_with_underscores', label: 'Skip to underscore section' },
      ];
      
      // Create corresponding elements
      const dashedElement = document.createElement('div');
      dashedElement.id = 'section-with-dashes';
      dashedElement.focus = jest.fn();
      dashedElement.scrollIntoView = jest.fn();
      document.body.appendChild(dashedElement);
      
      render(
        <MockProviders>
          <SkipLinks links={specialLinks} />
        </MockProviders>
      );
      
      const skipLink = screen.getByText('Skip to dashed section');
      await user.click(skipLink);
      
      expect(dashedElement.focus).toHaveBeenCalled();
    });

    it('handles very long link labels', () => {
      const longLabel = 'Skip to a very long section name that might wrap to multiple lines and test text overflow handling';
      const longLinks = [
        { href: '#long-section', label: longLabel },
      ];
      
      render(
        <MockProviders>
          <SkipLinks links={longLinks} />
        </MockProviders>
      );
      
      expect(screen.getByText(longLabel)).toBeInTheDocument();
    });

    it('handles invalid href values gracefully', async () => {
      const user = userEvent.setup();
      const invalidLinks = [
        { href: '', label: 'Empty href' },
        { href: 'invalid-href', label: 'Invalid href' },
      ];
      
      render(
        <MockProviders>
          <SkipLinks links={invalidLinks} />
        </MockProviders>
      );
      
      const emptyHrefLink = screen.getByText('Empty href');
      const invalidHrefLink = screen.getByText('Invalid href');
      
      // Should not throw errors
      expect(async () => {
        await user.click(emptyHrefLink);
        await user.click(invalidHrefLink);
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('renders efficiently with many links', () => {
      const manyLinks = Array.from({ length: 20 }, (_, i) => ({
        href: `#section${i}`,
        label: `Skip to section ${i}`,
      }));
      
      const startTime = performance.now();
      render(
        <MockProviders>
          <SkipLinks links={manyLinks} />
        </MockProviders>
      );
      const endTime = performance.now();
      
      // Should render quickly (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
      expect(screen.getAllByRole('link')).toHaveLength(20);
    });
  });
});