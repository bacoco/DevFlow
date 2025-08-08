import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AccessibilityPanel } from '../AccessibilityPanel';
import { AccessibilityProvider } from '../../../contexts/AccessibilityContext';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock providers
const MockProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AccessibilityProvider>
    {children}
  </AccessibilityProvider>
);

describe('AccessibilityPanel', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Accessibility Compliance', () => {
    it('should not have any accessibility violations', async () => {
      const { container } = render(
        <MockProviders>
          <AccessibilityPanel {...defaultProps} />
        </MockProviders>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes', () => {
      render(
        <MockProviders>
          <AccessibilityPanel {...defaultProps} />
        </MockProviders>
      );

      // Check modal ARIA attributes
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby');
      expect(modal).toHaveAttribute('aria-describedby');

      // Check switch elements have proper ARIA attributes
      const switches = screen.getAllByRole('switch');
      switches.forEach(switchElement => {
        expect(switchElement).toHaveAttribute('aria-checked');
      });
    });

    it('should have proper heading hierarchy', () => {
      render(
        <MockProviders>
          <AccessibilityPanel {...defaultProps} />
        </MockProviders>
      );

      // Main title should be h2 (assuming modal title is h2)
      const mainTitle = screen.getByText('Accessibility Settings');
      expect(mainTitle.tagName).toBe('H2');

      // Section headings should be h3
      const sectionHeadings = [
        'Visual Settings',
        'Navigation Settings',
        'Screen Reader Settings',
        'Accessibility Testing'
      ];

      sectionHeadings.forEach(heading => {
        const element = screen.getByText(heading);
        expect(element.tagName).toBe('H3');
      });
    });

    it('should have proper labels for form controls', () => {
      render(
        <MockProviders>
          <AccessibilityPanel {...defaultProps} />
        </MockProviders>
      );

      // Check that all switches have associated labels
      const highContrastSwitch = screen.getByRole('switch', { name: /high contrast mode/i });
      expect(highContrastSwitch).toBeInTheDocument();

      const fontSizeSelect = screen.getByRole('combobox', { name: /select font size/i });
      expect(fontSizeSelect).toBeInTheDocument();

      const reducedMotionSwitch = screen.getByRole('switch', { name: /reduced motion/i });
      expect(reducedMotionSwitch).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation between controls', async () => {
      const user = userEvent.setup();
      
      render(
        <MockProviders>
          <AccessibilityPanel {...defaultProps} />
        </MockProviders>
      );

      // Tab through controls
      await user.tab();
      expect(document.activeElement).toHaveAttribute('role', 'switch');

      await user.tab();
      expect(document.activeElement).toHaveAttribute('role', 'combobox');

      await user.tab();
      expect(document.activeElement).toHaveAttribute('role', 'switch');
    });

    it('should handle Enter and Space key activation for switches', async () => {
      const user = userEvent.setup();
      
      render(
        <MockProviders>
          <AccessibilityPanel {...defaultProps} />
        </MockProviders>
      );

      const highContrastSwitch = screen.getByRole('switch', { name: /high contrast mode/i });
      
      // Focus the switch
      highContrastSwitch.focus();
      expect(document.activeElement).toBe(highContrastSwitch);

      // Test Enter key
      const initialState = highContrastSwitch.getAttribute('aria-checked');
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(highContrastSwitch.getAttribute('aria-checked')).not.toBe(initialState);
      });

      // Test Space key
      const newState = highContrastSwitch.getAttribute('aria-checked');
      await user.keyboard(' ');
      
      await waitFor(() => {
        expect(highContrastSwitch.getAttribute('aria-checked')).not.toBe(newState);
      });
    });

    it('should handle Escape key to close modal', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      render(
        <MockProviders>
          <AccessibilityPanel {...defaultProps} onClose={onClose} />
        </MockProviders>
      );

      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide descriptive text for settings', () => {
      render(
        <MockProviders>
          <AccessibilityPanel {...defaultProps} />
        </MockProviders>
      );

      // Check for descriptive text
      expect(screen.getByText(/increases contrast for better visibility/i)).toBeInTheDocument();
      expect(screen.getByText(/adjust text size for better readability/i)).toBeInTheDocument();
      expect(screen.getByText(/minimizes animations and transitions/i)).toBeInTheDocument();
    });

    it('should have proper live regions for announcements', () => {
      render(
        <MockProviders>
          <AccessibilityPanel {...defaultProps} />
        </MockProviders>
      );

      // Check that modal has aria-live attribute
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-live', 'polite');
    });

    it('should provide accessible descriptions for buttons', () => {
      render(
        <MockProviders>
          <AccessibilityPanel {...defaultProps} />
        </MockProviders>
      );

      const testButton = screen.getByRole('button', { name: /run accessibility tests/i });
      expect(testButton).toHaveAttribute('aria-describedby');
      
      const resetButton = screen.getByRole('button', { name: /reset all accessibility settings/i });
      expect(resetButton).toBeInTheDocument();
    });
  });

  describe('Settings Management', () => {
    it('should update settings when controls are changed', async () => {
      const user = userEvent.setup();
      
      render(
        <MockProviders>
          <AccessibilityPanel {...defaultProps} />
        </MockProviders>
      );

      const highContrastSwitch = screen.getByRole('switch', { name: /high contrast mode/i });
      const initialState = highContrastSwitch.getAttribute('aria-checked') === 'true';

      await user.click(highContrastSwitch);

      await waitFor(() => {
        expect(highContrastSwitch.getAttribute('aria-checked')).toBe((!initialState).toString());
      });
    });

    it('should update font size setting', async () => {
      const user = userEvent.setup();
      
      render(
        <MockProviders>
          <AccessibilityPanel {...defaultProps} />
        </MockProviders>
      );

      const fontSizeSelect = screen.getByRole('combobox', { name: /select font size/i });
      
      await user.selectOptions(fontSizeSelect, 'large');
      expect(fontSizeSelect).toHaveValue('large');
    });

    it('should reset settings to defaults', async () => {
      const user = userEvent.setup();
      
      render(
        <MockProviders>
          <AccessibilityPanel {...defaultProps} />
        </MockProviders>
      );

      // Change some settings first
      const highContrastSwitch = screen.getByRole('switch', { name: /high contrast mode/i });
      await user.click(highContrastSwitch);

      // Reset to defaults
      const resetButton = screen.getByRole('button', { name: /reset to defaults/i });
      await user.click(resetButton);

      // Check that settings are reset
      await waitFor(() => {
        expect(highContrastSwitch.getAttribute('aria-checked')).toBe('false');
      });
    });
  });

  describe('Accessibility Testing Feature', () => {
    it('should run accessibility tests and display results', async () => {
      const user = userEvent.setup();
      
      render(
        <MockProviders>
          <AccessibilityPanel {...defaultProps} />
        </MockProviders>
      );

      const testButton = screen.getByRole('button', { name: /run accessibility tests/i });
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/test results/i)).toBeInTheDocument();
      });
    });
  });

  describe('Focus Management', () => {
    it('should trap focus within the modal', async () => {
      const user = userEvent.setup();
      
      render(
        <MockProviders>
          <AccessibilityPanel {...defaultProps} />
        </MockProviders>
      );

      // Get all focusable elements
      const focusableElements = screen.getAllByRole('button').concat(
        screen.getAllByRole('switch'),
        screen.getAllByRole('combobox')
      );

      // Tab to the last element
      for (let i = 0; i < focusableElements.length; i++) {
        await user.tab();
      }

      // One more tab should cycle back to the first element
      await user.tab();
      expect(document.activeElement).toBe(focusableElements[0]);
    });

    it('should handle Shift+Tab for reverse navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <MockProviders>
          <AccessibilityPanel {...defaultProps} />
        </MockProviders>
      );

      // Focus first element
      await user.tab();
      const firstElement = document.activeElement;

      // Shift+Tab should go to last element
      await user.tab({ shift: true });
      expect(document.activeElement).not.toBe(firstElement);
    });
  });

  describe('High Contrast Mode', () => {
    it('should apply high contrast styles when enabled', async () => {
      const user = userEvent.setup();
      
      render(
        <MockProviders>
          <AccessibilityPanel {...defaultProps} />
        </MockProviders>
      );

      const highContrastSwitch = screen.getByRole('switch', { name: /high contrast mode/i });
      await user.click(highContrastSwitch);

      // Check that high contrast class is applied to document
      await waitFor(() => {
        expect(document.documentElement).toHaveClass('high-contrast');
      });
    });
  });

  describe('Reduced Motion', () => {
    it('should respect reduced motion preference', async () => {
      const user = userEvent.setup();
      
      render(
        <MockProviders>
          <AccessibilityPanel {...defaultProps} />
        </MockProviders>
      );

      const reducedMotionSwitch = screen.getByRole('switch', { name: /reduced motion/i });
      await user.click(reducedMotionSwitch);

      // Check that reduced motion class is applied to document
      await waitFor(() => {
        expect(document.documentElement).toHaveClass('reduced-motion');
      });
    });
  });
});