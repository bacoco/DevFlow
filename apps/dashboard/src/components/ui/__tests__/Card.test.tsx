/**
 * Card Component Tests
 * Comprehensive tests for card variants, interactions, and accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card } from '../Card';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, any>(({ children, whileHover, whileTap, whileFocus, variants, initial, ...props }, ref) => (
      <div ref={ref} {...props}>
        {children}
      </div>
    )),
  },
}));

describe('Card Component', () => {
  const defaultProps = {
    children: 'Test Card Content',
    testId: 'test-card',
  };

  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Card {...defaultProps} />);
      
      const card = screen.getByTestId('test-card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent('Test Card Content');
    });

    it('renders children correctly', () => {
      render(
        <Card testId="test-card">
          <h2>Card Title</h2>
          <p>Card description</p>
        </Card>
      );
      
      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card description')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<Card {...defaultProps} className="custom-class" />);
      
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('custom-class');
    });
  });

  describe('Variants', () => {
    it('applies default variant styles', () => {
      render(<Card {...defaultProps} variant="default" />);
      
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('bg-white', 'border', 'border-gray-200');
    });

    it('applies elevated variant styles', () => {
      render(<Card {...defaultProps} variant="elevated" />);
      
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('bg-white', 'shadow-lg', 'border-0');
    });

    it('applies outlined variant styles', () => {
      render(<Card {...defaultProps} variant="outlined" />);
      
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('bg-transparent', 'border-2', 'border-gray-300');
    });

    it('applies glass variant styles', () => {
      render(<Card {...defaultProps} variant="glass" />);
      
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('bg-white/10', 'backdrop-blur-md', 'border', 'border-white/20');
    });
  });

  describe('Padding Options', () => {
    it('applies no padding', () => {
      render(<Card {...defaultProps} padding="none" />);
      
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('p-0');
    });

    it('applies small padding', () => {
      render(<Card {...defaultProps} padding="sm" />);
      
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('p-3');
    });

    it('applies medium padding (default)', () => {
      render(<Card {...defaultProps} padding="md" />);
      
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('p-4');
    });

    it('applies large padding', () => {
      render(<Card {...defaultProps} padding="lg" />);
      
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('p-6');
    });

    it('applies extra large padding', () => {
      render(<Card {...defaultProps} padding="xl" />);
      
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('p-8');
    });
  });

  describe('Interactive States', () => {
    it('applies interactive styles when interactive prop is true', () => {
      render(<Card {...defaultProps} interactive />);
      
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('cursor-pointer', 'focus:outline-none');
      expect(card).toHaveAttribute('tabIndex', '0');
      expect(card).toHaveAttribute('role', 'button');
    });

    it('applies interactive styles when onClick is provided', () => {
      const handleClick = jest.fn();
      render(<Card {...defaultProps} onClick={handleClick} />);
      
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('cursor-pointer', 'focus:outline-none');
      expect(card).toHaveAttribute('tabIndex', '0');
      expect(card).toHaveAttribute('role', 'button');
    });

    it('does not apply interactive styles by default', () => {
      render(<Card {...defaultProps} />);
      
      const card = screen.getByTestId('test-card');
      expect(card).not.toHaveClass('cursor-pointer');
      expect(card).not.toHaveAttribute('tabIndex');
      expect(card).not.toHaveAttribute('role');
    });
  });

  describe('Hover Effects', () => {
    it('applies hover classes when hover prop is true', () => {
      render(<Card {...defaultProps} hover variant="default" />);
      
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('hover:shadow-md', 'hover:border-gray-300');
    });

    it('applies different hover effects for different variants', () => {
      const { rerender } = render(<Card {...defaultProps} hover variant="elevated" />);
      let card = screen.getByTestId('test-card');
      expect(card).toHaveClass('hover:shadow-xl', 'hover:-translate-y-1');

      rerender(<Card {...defaultProps} hover variant="outlined" />);
      card = screen.getByTestId('test-card');
      expect(card).toHaveClass('hover:border-primary-500', 'hover:bg-gray-50');

      rerender(<Card {...defaultProps} hover variant="glass" />);
      card = screen.getByTestId('test-card');
      expect(card).toHaveClass('hover:bg-white/20', 'hover:border-white/30');
    });
  });

  describe('Rounded Corners', () => {
    it('applies rounded corners by default', () => {
      render(<Card {...defaultProps} />);
      
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('rounded-xl');
    });

    it('removes rounded corners when rounded is false', () => {
      render(<Card {...defaultProps} rounded={false} />);
      
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('rounded-none');
      expect(card).not.toHaveClass('rounded-xl');
    });
  });

  describe('Shadow Effects', () => {
    it('applies shadow when shadow prop is true and variant is default', () => {
      render(<Card {...defaultProps} shadow variant="default" />);
      
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('shadow-sm');
    });

    it('does not apply shadow for non-default variants', () => {
      render(<Card {...defaultProps} shadow variant="elevated" />);
      
      const card = screen.getByTestId('test-card');
      expect(card).not.toHaveClass('shadow-sm');
    });
  });

  describe('Click Interactions', () => {
    it('calls onClick when card is clicked', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(<Card {...defaultProps} onClick={handleClick} />);
      
      const card = screen.getByTestId('test-card');
      await user.click(card);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when card is not interactive', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(<Card {...defaultProps} />);
      
      const card = screen.getByTestId('test-card');
      fireEvent.click(card);
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Interactions', () => {
    it('calls onClick when Enter key is pressed on interactive card', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(<Card {...defaultProps} onClick={handleClick} />);
      
      const card = screen.getByTestId('test-card');
      card.focus();
      await user.keyboard('{Enter}');
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick when Space key is pressed on interactive card', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(<Card {...defaultProps} onClick={handleClick} />);
      
      const card = screen.getByTestId('test-card');
      card.focus();
      await user.keyboard(' ');
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('calls custom onKeyDown handler', async () => {
      const handleKeyDown = jest.fn();
      const user = userEvent.setup();
      
      render(<Card {...defaultProps} onKeyDown={handleKeyDown} interactive />);
      
      const card = screen.getByTestId('test-card');
      card.focus();
      await user.keyboard('a');
      
      expect(handleKeyDown).toHaveBeenCalled();
    });

    it('does not respond to keyboard events when not interactive', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(<Card {...defaultProps} />);
      
      const card = screen.getByTestId('test-card');
      await user.type(card, '{Enter}');
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes when interactive', () => {
      render(<Card {...defaultProps} interactive />);
      
      const card = screen.getByTestId('test-card');
      expect(card).toHaveAttribute('role', 'button');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('allows custom role and tabIndex', () => {
      render(<Card {...defaultProps} interactive role="tab" tabIndex={-1} />);
      
      const card = screen.getByTestId('test-card');
      expect(card).toHaveAttribute('role', 'tab');
      expect(card).toHaveAttribute('tabIndex', '-1');
    });

    it('does not have ARIA attributes when not interactive', () => {
      render(<Card {...defaultProps} />);
      
      const card = screen.getByTestId('test-card');
      expect(card).not.toHaveAttribute('role');
      expect(card).not.toHaveAttribute('tabIndex');
    });

    it('is focusable when interactive', () => {
      render(<Card {...defaultProps} interactive />);
      
      const card = screen.getByTestId('test-card');
      card.focus();
      expect(card).toHaveFocus();
    });
  });

  describe('Glass Morphism Effects', () => {
    it('renders glass morphism overlay for glass variant', () => {
      render(<Card {...defaultProps} variant="glass" />);
      
      const card = screen.getByTestId('test-card');
      const overlay = card.querySelector('.bg-gradient-to-br');
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveClass('from-white/5', 'to-transparent', 'pointer-events-none');
    });

    it('does not render glass morphism overlay for other variants', () => {
      const { rerender } = render(<Card {...defaultProps} variant="default" />);
      let card = screen.getByTestId('test-card');
      let overlay = card.querySelector('.bg-gradient-to-br');
      expect(overlay).not.toBeInTheDocument();

      rerender(<Card {...defaultProps} variant="elevated" />);
      card = screen.getByTestId('test-card');
      overlay = card.querySelector('.bg-gradient-to-br');
      expect(overlay).not.toBeInTheDocument();

      rerender(<Card {...defaultProps} variant="outlined" />);
      card = screen.getByTestId('test-card');
      overlay = card.querySelector('.bg-gradient-to-br');
      expect(overlay).not.toBeInTheDocument();
    });
  });

  describe('Content Structure', () => {
    it('renders content in proper z-index layer', () => {
      render(<Card {...defaultProps} />);
      
      const card = screen.getByTestId('test-card');
      const contentWrapper = card.querySelector('.relative.z-10');
      expect(contentWrapper).toBeInTheDocument();
      expect(contentWrapper).toHaveTextContent('Test Card Content');
    });

    it('renders interactive state indicator when interactive', () => {
      render(<Card {...defaultProps} interactive />);
      
      const card = screen.getByTestId('test-card');
      const indicator = card.querySelector('.bg-primary-500\\/5');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass('opacity-0', 'pointer-events-none');
    });

    it('does not render interactive state indicator when not interactive', () => {
      render(<Card {...defaultProps} />);
      
      const card = screen.getByTestId('test-card');
      const indicator = card.querySelector('.bg-primary-500\\/5');
      expect(indicator).not.toBeInTheDocument();
    });
  });

  describe('Forward Ref', () => {
    it('forwards ref to the card element', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Card {...defaultProps} ref={ref} />);
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toHaveAttribute('data-testid', 'test-card');
    });
  });

  describe('Custom Props', () => {
    it('passes through additional HTML props', () => {
      render(
        <Card 
          {...defaultProps} 
          data-custom="test-value"
          aria-label="Custom card"
        />
      );
      
      const card = screen.getByTestId('test-card');
      expect(card).toHaveAttribute('data-custom', 'test-value');
      expect(card).toHaveAttribute('aria-label', 'Custom card');
    });
  });
});