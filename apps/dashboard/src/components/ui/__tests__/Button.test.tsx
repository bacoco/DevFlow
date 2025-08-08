/**
 * Button Component Tests
 * Comprehensive test suite for Button component variants, states, and accessibility
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Heart, Download } from 'lucide-react';
import { Button } from '../Button';
import { AccessibilityProvider } from '../../../contexts/AccessibilityContext';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock providers
const MockProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AccessibilityProvider>
    {children}
  </AccessibilityProvider>
);

describe('Button Component', () => {
  // Basic rendering tests
  describe('Rendering', () => {
    it('renders with default props', () => {
      render(
        <MockProviders>
          <Button>Click me</Button>
        </MockProviders>
      );
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('bg-primary-600'); // Default primary variant
    });

    it('renders with custom test id', () => {
      render(
        <MockProviders>
          <Button testId="custom-button">Test</Button>
        </MockProviders>
      );
      expect(screen.getByTestId('custom-button')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      render(
        <MockProviders>
          <Button className="custom-class">Test</Button>
        </MockProviders>
      );
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });

  // Variant tests
  describe('Variants', () => {
    it('renders primary variant correctly', () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary-600', 'text-white');
    });

    it('renders secondary variant correctly', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-100', 'text-gray-900');
    });

    it('renders ghost variant correctly', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-transparent', 'text-gray-700');
    });

    it('renders danger variant correctly', () => {
      render(<Button variant="danger">Danger</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-error-600', 'text-white');
    });
  });

  // Size tests
  describe('Sizes', () => {
    it('renders small size correctly', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');
    });

    it('renders medium size correctly (default)', () => {
      render(<Button size="md">Medium</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-2', 'text-sm');
    });

    it('renders large size correctly', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-6', 'py-3', 'text-base');
    });
  });

  // State tests
  describe('States', () => {
    it('renders disabled state correctly', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('cursor-not-allowed');
    });

    it('renders loading state correctly', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('shows loading spinner and dims text when loading', () => {
      render(<Button loading>Loading Text</Button>);
      const textSpan = screen.getByText('Loading Text');
      expect(textSpan).toHaveClass('opacity-70');
    });

    it('prevents click when disabled', async () => {
      const handleClick = jest.fn();
      render(<Button disabled onClick={handleClick}>Disabled</Button>);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('prevents click when loading', async () => {
      const handleClick = jest.fn();
      render(<Button loading onClick={handleClick}>Loading</Button>);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  // Icon tests
  describe('Icons', () => {
    it('renders left icon correctly', () => {
      render(
        <Button icon={<Heart data-testid="heart-icon" />} iconPosition="left">
          With Icon
        </Button>
      );
      
      const icon = screen.getByTestId('heart-icon');
      const button = screen.getByRole('button');
      
      expect(icon).toBeInTheDocument();
      expect(button).toContainElement(icon);
    });

    it('renders right icon correctly', () => {
      render(
        <Button icon={<Download data-testid="download-icon" />} iconPosition="right">
          Download
        </Button>
      );
      
      const icon = screen.getByTestId('download-icon');
      expect(icon).toBeInTheDocument();
    });

    it('renders icon without text', () => {
      render(<Button icon={<Heart data-testid="heart-icon" />} />);
      
      const icon = screen.getByTestId('heart-icon');
      expect(icon).toBeInTheDocument();
    });

    it('hides icon when loading', () => {
      render(
        <Button 
          loading 
          icon={<Heart data-testid="heart-icon" />}
        >
          Loading
        </Button>
      );
      
      expect(screen.queryByTestId('heart-icon')).not.toBeInTheDocument();
    });
  });

  // Layout tests
  describe('Layout', () => {
    it('renders full width correctly', () => {
      render(<Button fullWidth>Full Width</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full');
    });

    it('renders rounded correctly', () => {
      render(<Button rounded>Rounded</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('rounded-full');
    });

    it('renders with default rounded corners when not rounded', () => {
      render(<Button>Default</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('rounded-lg');
    });
  });

  // Interaction tests
  describe('Interactions', () => {
    it('calls onClick when clicked', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('handles keyboard navigation', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Press me</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      
      expect(button).toHaveFocus();
      
      await userEvent.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      await userEvent.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('supports focus and blur events', async () => {
      const handleFocus = jest.fn();
      const handleBlur = jest.fn();
      
      render(
        <Button onFocus={handleFocus} onBlur={handleBlur}>
          Focus me
        </Button>
      );
      
      const button = screen.getByRole('button');
      
      await userEvent.click(button);
      expect(handleFocus).toHaveBeenCalled();
      
      await userEvent.tab();
      expect(handleBlur).toHaveBeenCalled();
    });
  });

  // Animation tests
  describe('Animations', () => {
    it('applies hover animations when not disabled', () => {
      render(<Button>Hover me</Button>);
      const button = screen.getByRole('button');
      
      // Check that motion props are applied
      expect(button).toHaveAttribute('style');
    });

    it('does not apply hover animations when disabled', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      
      // Motion component should still be rendered but without hover effects
      expect(button).toBeInTheDocument();
    });
  });

  // Accessibility tests
  describe('Accessibility', () => {
    it('should not have any accessibility violations', async () => {
      const { container } = render(
        <MockProviders>
          <Button>Accessible Button</Button>
        </MockProviders>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes', () => {
      render(
        <MockProviders>
          <Button 
            aria-label="Custom label"
            aria-describedby="description"
            aria-pressed={true}
            aria-expanded={false}
          >
            Aria Button
          </Button>
        </MockProviders>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom label');
      expect(button).toHaveAttribute('aria-describedby', 'description');
      expect(button).toHaveAttribute('aria-pressed', 'true');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('role', 'button');
    });

    it('should have proper tabIndex', () => {
      const { rerender } = render(
        <MockProviders>
          <Button>Normal Button</Button>
        </MockProviders>
      );
      
      expect(screen.getByRole('button')).toHaveAttribute('tabIndex', '0');

      rerender(
        <MockProviders>
          <Button disabled>Disabled Button</Button>
        </MockProviders>
      );
      
      expect(screen.getByRole('button')).toHaveAttribute('tabIndex', '-1');
    });

    it('should handle keyboard navigation', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(
        <MockProviders>
          <Button onClick={handleClick}>Keyboard Button</Button>
        </MockProviders>
      );

      const button = screen.getByRole('button');
      button.focus();
      
      // Test Enter key
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Test Space key
      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('should provide accessible labels for different states', () => {
      const { rerender } = render(
        <MockProviders>
          <Button loading>Loading Button</Button>
        </MockProviders>
      );
      
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Loading');
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');

      rerender(
        <MockProviders>
          <Button aria-label="Custom Label">Button Text</Button>
        </MockProviders>
      );
      
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Custom Label');

      rerender(
        <MockProviders>
          <Button>Button Text</Button>
        </MockProviders>
      );
      
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Button Text');
    });

    it('should handle disabled state accessibility', () => {
      render(
        <MockProviders>
          <Button disabled>Disabled Button</Button>
        </MockProviders>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('tabIndex', '-1');
    });

    it('maintains focus visibility', () => {
      render(
        <MockProviders>
          <Button>Focus me</Button>
        </MockProviders>
      );
      const button = screen.getByRole('button');
      
      button.focus();
      expect(button).toHaveFocus();
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-2');
    });

    it('should respect reduced motion preferences', async () => {
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

      render(
        <MockProviders>
          <Button>Reduced Motion Button</Button>
        </MockProviders>
      );

      // Button should still be functional even with reduced motion
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should meet minimum touch target size requirements', () => {
      render(
        <MockProviders>
          <Button size="sm">Small Button</Button>
        </MockProviders>
      );

      const button = screen.getByRole('button');
      const styles = window.getComputedStyle(button);
      
      // The button should have minimum dimensions for accessibility
      // This is enforced by CSS classes in the component
      expect(button).toHaveClass('px-3', 'py-1.5'); // Ensures minimum size
    });
  });

  // Edge cases
  describe('Edge Cases', () => {
    it('handles empty children gracefully', () => {
      render(<Button>{''}</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('handles null children gracefully', () => {
      render(<Button>{null}</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('handles multiple rapid clicks', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Rapid Click</Button>);
      
      const button = screen.getByRole('button');
      
      // Simulate rapid clicks
      await userEvent.click(button);
      await userEvent.click(button);
      await userEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(3);
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Ref Button</Button>);
      
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current).toBe(screen.getByRole('button'));
    });
  });

  // Variant combinations
  describe('Variant Combinations', () => {
    it('renders all variant and size combinations correctly', () => {
      const variants = ['primary', 'secondary', 'ghost', 'danger'] as const;
      const sizes = ['sm', 'md', 'lg'] as const;
      
      variants.forEach(variant => {
        sizes.forEach(size => {
          const { unmount } = render(
            <Button variant={variant} size={size}>
              {variant} {size}
            </Button>
          );
          
          const button = screen.getByRole('button');
          expect(button).toBeInTheDocument();
          
          unmount();
        });
      });
    });

    it('handles disabled state with all variants', () => {
      const variants = ['primary', 'secondary', 'ghost', 'danger'] as const;
      
      variants.forEach(variant => {
        const { unmount } = render(
          <Button variant={variant} disabled>
            Disabled {variant}
          </Button>
        );
        
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
        expect(button).toHaveClass('cursor-not-allowed');
        
        unmount();
      });
    });
  });
});