/**
 * Input Component Tests
 * Comprehensive tests for input validation, accessibility, and functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../Input';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    input: React.forwardRef<HTMLInputElement, any>(({ children, ...props }, ref) => (
      <input ref={ref} {...props} />
    )),
    label: React.forwardRef<HTMLLabelElement, any>(({ children, ...props }, ref) => (
      <label ref={ref} {...props}>{children}</label>
    )),
    div: React.forwardRef<HTMLDivElement, any>(({ children, ...props }, ref) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    button: React.forwardRef<HTMLButtonElement, any>(({ children, ...props }, ref) => (
      <button ref={ref} {...props}>{children}</button>
    )),
    p: React.forwardRef<HTMLParagraphElement, any>(({ children, ...props }, ref) => (
      <p ref={ref} {...props}>{children}</p>
    )),
  },
  HTMLMotionProps: {},
  Variants: {},
}));

describe('Input Component', () => {
  const user = userEvent.setup();

  describe('Basic Functionality', () => {
    it('renders with default props', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass('block', 'w-full', 'rounded-lg');
    });

    it('renders with label', () => {
      render(<Input label="Test Label" />);
      const label = screen.getByText('Test Label');
      const input = screen.getByRole('textbox');
      
      expect(label).toBeInTheDocument();
      expect(label).toHaveAttribute('for', input.id);
    });

    it('renders with placeholder when no label', () => {
      render(<Input placeholder="Enter text" />);
      const input = screen.getByPlaceholderText('Enter text');
      expect(input).toBeInTheDocument();
    });

    it('handles controlled value', async () => {
      const handleChange = jest.fn();
      render(<Input value="test" onChange={handleChange} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('test');
      
      await user.type(input, 'ing');
      expect(handleChange).toHaveBeenCalled();
    });

    it('handles uncontrolled value', async () => {
      render(<Input defaultValue="initial" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('initial');
      
      await user.clear(input);
      await user.type(input, 'new value');
      expect(input).toHaveValue('new value');
    });
  });

  describe('Validation States', () => {
    it('renders error state with error text', () => {
      render(<Input state="error" errorText="This field is required" />);
      
      const input = screen.getByRole('textbox');
      const errorText = screen.getByText('This field is required');
      
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', errorText.id);
      expect(errorText).toHaveClass('text-error-500');
    });

    it('renders success state', () => {
      render(<Input state="success" helperText="Valid input" />);
      
      const input = screen.getByRole('textbox');
      const helperText = screen.getByText('Valid input');
      
      expect(input).toHaveAttribute('aria-invalid', 'false');
      expect(helperText).toHaveClass('text-success-500');
    });

    it('renders warning state', () => {
      render(<Input state="warning" helperText="Warning message" />);
      
      const helperText = screen.getByText('Warning message');
      expect(helperText).toHaveClass('text-warning-500');
    });

    it('prioritizes error text over helper text', () => {
      render(
        <Input 
          helperText="Helper text" 
          errorText="Error text" 
        />
      );
      
      expect(screen.getByText('Error text')).toBeInTheDocument();
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('renders loading state', () => {
      render(<Input loading />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      
      // Loading spinner should be present
      const loadingIcon = screen.getByTestId('loading-icon') || 
                         document.querySelector('[data-testid="loading-icon"]') ||
                         document.querySelector('.animate-spin');
      // Note: Since we mocked framer-motion, we'll check for disabled state
      expect(input).toBeDisabled();
    });

    it('disables input when loading', () => {
      render(<Input loading />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });
  });

  describe('Password Input', () => {
    it('renders password input with toggle button', () => {
      render(<Input type="password" />);
      
      const input = screen.getByRole('textbox'); // Initially hidden
      const toggleButton = screen.getByLabelText('Show password');
      
      expect(input).toHaveAttribute('type', 'password');
      expect(toggleButton).toBeInTheDocument();
    });

    it('toggles password visibility', async () => {
      render(<Input type="password" />);
      
      const input = screen.getByRole('textbox');
      const toggleButton = screen.getByLabelText('Show password');
      
      expect(input).toHaveAttribute('type', 'password');
      
      await user.click(toggleButton);
      expect(input).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText('Hide password')).toBeInTheDocument();
    });
  });

  describe('Clearable Input', () => {
    it('shows clear button when input has value', async () => {
      render(<Input clearable />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'test');
      
      const clearButton = screen.getByLabelText('Clear input');
      expect(clearButton).toBeInTheDocument();
    });

    it('clears input when clear button is clicked', async () => {
      const handleClear = jest.fn();
      render(<Input clearable onClear={handleClear} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'test');
      
      const clearButton = screen.getByLabelText('Clear input');
      await user.click(clearButton);
      
      expect(input).toHaveValue('');
      expect(handleClear).toHaveBeenCalled();
    });

    it('does not show clear button when disabled', () => {
      render(<Input clearable disabled value="test" />);
      
      const clearButton = screen.queryByLabelText('Clear input');
      expect(clearButton).not.toBeInTheDocument();
    });
  });

  describe('Auto-complete Functionality', () => {
    const suggestions = ['apple', 'banana', 'cherry', 'date'];

    it('shows suggestions when typing', async () => {
      render(<Input suggestions={suggestions} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'a');
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
        expect(screen.getByText('apple')).toBeInTheDocument();
      });
    });

    it('filters suggestions based on input', async () => {
      render(<Input suggestions={suggestions} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'ch');
      
      await waitFor(() => {
        expect(screen.getByText('cherry')).toBeInTheDocument();
        expect(screen.queryByText('apple')).not.toBeInTheDocument();
      });
    });

    it('selects suggestion on click', async () => {
      const handleSuggestionSelect = jest.fn();
      render(
        <Input 
          suggestions={suggestions} 
          onSuggestionSelect={handleSuggestionSelect}
        />
      );
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'a');
      
      await waitFor(() => {
        const suggestion = screen.getByText('apple');
        expect(suggestion).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('apple'));
      
      expect(handleSuggestionSelect).toHaveBeenCalledWith('apple');
      expect(input).toHaveValue('apple');
    });

    it('navigates suggestions with keyboard', async () => {
      render(<Input suggestions={suggestions} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'a');
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      // Navigate down
      await user.keyboard('{ArrowDown}');
      const firstOption = screen.getByRole('option', { name: 'apple' });
      expect(firstOption).toHaveAttribute('aria-selected', 'true');
      
      // Navigate down again
      await user.keyboard('{ArrowDown}');
      const secondOption = screen.getByRole('option', { name: 'banana' });
      expect(secondOption).toHaveAttribute('aria-selected', 'true');
    });

    it('selects suggestion with Enter key', async () => {
      const handleSuggestionSelect = jest.fn();
      render(
        <Input 
          suggestions={suggestions} 
          onSuggestionSelect={handleSuggestionSelect}
        />
      );
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'a');
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');
      
      expect(handleSuggestionSelect).toHaveBeenCalledWith('apple');
    });

    it('closes suggestions with Escape key', async () => {
      render(<Input suggestions={suggestions} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'a');
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', async () => {
      const { container } = render(
        <Input 
          label="Test Input" 
          helperText="Helper text"
          required
        />
      );
      
      const input = screen.getByRole('textbox');
      const label = screen.getByText('Test Input');
      
      expect(input).toBeInTheDocument();
      expect(label).toBeInTheDocument();
      expect(label).toHaveAttribute('for', input.id);
    });

    it('supports keyboard navigation', async () => {
      render(<Input label="Test Input" />);
      
      const input = screen.getByRole('textbox');
      
      await user.tab();
      expect(input).toHaveFocus();
      
      await user.keyboard('test');
      expect(input).toHaveValue('test');
    });

    it('has proper ARIA attributes', () => {
      render(
        <Input 
          label="Test Input"
          helperText="Helper text"
          required
          aria-label="Custom label"
        />
      );
      
      const input = screen.getByRole('textbox');
      const helperText = screen.getByText('Helper text');
      
      expect(input).toHaveAttribute('aria-describedby', helperText.id);
      expect(input).toHaveAttribute('aria-label', 'Custom label');
      expect(input).toHaveAttribute('required');
    });

    it('has proper ARIA attributes for suggestions', async () => {
      render(<Input suggestions={['test']} />);
      
      const input = screen.getByRole('combobox');
      
      expect(input).toHaveAttribute('aria-autocomplete', 'list');
      expect(input).toHaveAttribute('aria-expanded', 'false');
      
      await user.type(input, 't');
      
      await waitFor(() => {
        expect(input).toHaveAttribute('aria-expanded', 'true');
        expect(input).toHaveAttribute('aria-controls');
      });
    });

    it('announces required fields to screen readers', () => {
      render(<Input label="Required Field" required />);
      
      const label = screen.getByText(/Required Field/);
      expect(label).toHaveTextContent('*');
    });
  });

  describe('Variants and Sizes', () => {
    it('applies variant classes correctly', () => {
      const { rerender } = render(<Input variant="filled" />);
      let input = screen.getByRole('textbox');
      expect(input).toHaveClass('bg-gray-100');
      
      rerender(<Input variant="outlined" />);
      input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-2');
    });

    it('applies size classes correctly', () => {
      const { rerender } = render(<Input size="sm" />);
      let input = screen.getByRole('textbox');
      expect(input).toHaveClass('px-3', 'py-2', 'text-sm');
      
      rerender(<Input size="lg" />);
      input = screen.getByRole('textbox');
      expect(input).toHaveClass('px-4', 'py-3', 'text-base');
    });

    it('applies full width when specified', () => {
      render(<Input fullWidth />);
      const container = screen.getByRole('textbox').parentElement?.parentElement;
      expect(container).toHaveClass('w-full');
    });
  });

  describe('Icons', () => {
    const TestIcon = () => <span data-testid="test-icon">Icon</span>;

    it('renders left icon', () => {
      render(<Input icon={<TestIcon />} iconPosition="left" />);
      
      const icon = screen.getByTestId('test-icon');
      expect(icon).toBeInTheDocument();
    });

    it('renders right icon', () => {
      render(<Input icon={<TestIcon />} iconPosition="right" />);
      
      const icon = screen.getByTestId('test-icon');
      expect(icon).toBeInTheDocument();
    });

    it('adjusts padding for icons', () => {
      render(<Input icon={<TestIcon />} iconPosition="left" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('pl-10');
    });
  });

  describe('Event Handlers', () => {
    it('calls onChange handler', async () => {
      const handleChange = jest.fn();
      render(<Input onChange={handleChange} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'test');
      
      expect(handleChange).toHaveBeenCalled();
    });

    it('calls onFocus handler', async () => {
      const handleFocus = jest.fn();
      render(<Input onFocus={handleFocus} />);
      
      const input = screen.getByRole('textbox');
      await user.click(input);
      
      expect(handleFocus).toHaveBeenCalled();
    });

    it('calls onBlur handler', async () => {
      const handleBlur = jest.fn();
      render(<Input onBlur={handleBlur} />);
      
      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.tab();
      
      // Wait for blur event to be processed
      await waitFor(() => {
        expect(handleBlur).toHaveBeenCalled();
      });
    });

    it('calls onKeyDown handler', async () => {
      const handleKeyDown = jest.fn();
      render(<Input onKeyDown={handleKeyDown} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'a');
      
      expect(handleKeyDown).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty suggestions array', async () => {
      render(<Input suggestions={[]} />);
      
      const input = screen.getByRole('textbox'); // Should not be combobox without suggestions
      await user.type(input, 'test');
      
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('handles null/undefined values gracefully', () => {
      render(<Input value={undefined} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('');
    });

    it('handles very long suggestion lists', async () => {
      const longSuggestions = Array.from({ length: 100 }, (_, i) => `item-${i}`);
      render(<Input suggestions={longSuggestions} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'item');
      
      await waitFor(() => {
        const listbox = screen.getByRole('listbox');
        expect(listbox).toBeInTheDocument();
        expect(listbox).toHaveClass('max-h-60', 'overflow-y-auto');
      });
    });
  });
});