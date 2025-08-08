/**
 * ShareButton Component Tests
 * Comprehensive tests for share button functionality
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ShareButton } from '../ShareButton';

expect.extend(toHaveNoViolations);

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

// Mock Web Share API
Object.assign(navigator, {
  share: jest.fn().mockResolvedValue(undefined),
  canShare: jest.fn().mockReturnValue(true),
});

describe('ShareButton Component', () => {
  const defaultProps = {
    url: 'https://example.com/dashboard',
    title: 'My Dashboard',
    text: 'Check out my dashboard',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders share button with default props', () => {
      render(<ShareButton {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /share/i });
      expect(button).toBeInTheDocument();
    });

    it('renders with custom label', () => {
      render(<ShareButton {...defaultProps} label="Share Dashboard" />);
      
      expect(screen.getByRole('button', { name: 'Share Dashboard' })).toBeInTheDocument();
    });

    it('renders with icon only when showLabel is false', () => {
      render(<ShareButton {...defaultProps} showLabel={false} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Share');
      expect(screen.queryByText('Share')).not.toBeInTheDocument();
    });
  });

  describe('Share Methods', () => {
    it('uses Web Share API when available', async () => {
      const user = userEvent.setup();
      render(<ShareButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(navigator.share).toHaveBeenCalledWith({
        url: defaultProps.url,
        title: defaultProps.title,
        text: defaultProps.text,
      });
    });

    it('falls back to copy to clipboard when Web Share API is not available', async () => {
      // Mock Web Share API as not available
      Object.assign(navigator, {
        share: undefined,
        canShare: undefined,
      });

      const user = userEvent.setup();
      render(<ShareButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(defaultProps.url);
    });

    it('shows success message after copying to clipboard', async () => {
      Object.assign(navigator, {
        share: undefined,
        canShare: undefined,
      });

      const user = userEvent.setup();
      render(<ShareButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Copied to clipboard!')).toBeInTheDocument();
      });
    });

    it('calls onShare callback when provided', async () => {
      const onShare = jest.fn();
      const user = userEvent.setup();
      
      render(<ShareButton {...defaultProps} onShare={onShare} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(onShare).toHaveBeenCalledWith({
        method: 'native',
        data: {
          url: defaultProps.url,
          title: defaultProps.title,
          text: defaultProps.text,
        },
      });
    });
  });

  describe('Share Options Menu', () => {
    it('shows share options when showOptions is true', async () => {
      const user = userEvent.setup();
      render(<ShareButton {...defaultProps} showOptions />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByText('Copy Link')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Twitter')).toBeInTheDocument();
    });

    it('copies link when copy option is selected', async () => {
      const user = userEvent.setup();
      render(<ShareButton {...defaultProps} showOptions />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const copyOption = screen.getByText('Copy Link');
      await user.click(copyOption);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(defaultProps.url);
    });

    it('opens email client when email option is selected', async () => {
      const user = userEvent.setup();
      const mockOpen = jest.fn();
      Object.assign(window, { open: mockOpen });
      
      render(<ShareButton {...defaultProps} showOptions />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const emailOption = screen.getByText('Email');
      await user.click(emailOption);
      
      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('mailto:'),
        '_blank'
      );
    });

    it('opens Twitter share when Twitter option is selected', async () => {
      const user = userEvent.setup();
      const mockOpen = jest.fn();
      Object.assign(window, { open: mockOpen });
      
      render(<ShareButton {...defaultProps} showOptions />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const twitterOption = screen.getByText('Twitter');
      await user.click(twitterOption);
      
      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('twitter.com/intent/tweet'),
        '_blank'
      );
    });

    it('closes menu when clicking outside', async () => {
      const user = userEvent.setup();
      render(<ShareButton {...defaultProps} showOptions />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(screen.getByRole('menu')).toBeInTheDocument();
      
      await user.click(document.body);
      
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('Button Variants', () => {
    it('renders primary variant', () => {
      render(<ShareButton {...defaultProps} variant="primary" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary-600');
    });

    it('renders secondary variant', () => {
      render(<ShareButton {...defaultProps} variant="secondary" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-100');
    });

    it('renders ghost variant', () => {
      render(<ShareButton {...defaultProps} variant="ghost" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-transparent');
    });
  });

  describe('Size Variants', () => {
    it('renders small size', () => {
      render(<ShareButton {...defaultProps} size="sm" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-3', 'py-1.5');
    });

    it('renders medium size (default)', () => {
      render(<ShareButton {...defaultProps} size="md" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-2');
    });

    it('renders large size', () => {
      render(<ShareButton {...defaultProps} size="lg" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-6', 'py-3');
    });
  });

  describe('Loading State', () => {
    it('shows loading state during share operation', async () => {
      // Mock slow share operation
      Object.assign(navigator, {
        share: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100))),
      });

      const user = userEvent.setup();
      render(<ShareButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(button).toBeDisabled();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('disables button during loading', async () => {
      Object.assign(navigator, {
        share: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100))),
      });

      const user = userEvent.setup();
      render(<ShareButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Error Handling', () => {
    it('handles share API errors gracefully', async () => {
      Object.assign(navigator, {
        share: jest.fn().mockRejectedValue(new Error('Share failed')),
      });

      const user = userEvent.setup();
      render(<ShareButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to share')).toBeInTheDocument();
      });
    });

    it('handles clipboard API errors gracefully', async () => {
      Object.assign(navigator, {
        share: undefined,
        clipboard: {
          writeText: jest.fn().mockRejectedValue(new Error('Clipboard failed')),
        },
      });

      const user = userEvent.setup();
      render(<ShareButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to copy link')).toBeInTheDocument();
      });
    });

    it('calls onError callback when provided', async () => {
      const onError = jest.fn();
      Object.assign(navigator, {
        share: jest.fn().mockRejectedValue(new Error('Share failed')),
      });

      const user = userEvent.setup();
      render(<ShareButton {...defaultProps} onError={onError} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });
  });

  describe('Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<ShareButton {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA attributes', () => {
      render(<ShareButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Share');
    });

    it('provides proper ARIA attributes for options menu', async () => {
      const user = userEvent.setup();
      render(<ShareButton {...defaultProps} showOptions />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('aria-labelledby');
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(button).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('handles keyboard navigation for options menu', async () => {
      const user = userEvent.setup();
      render(<ShareButton {...defaultProps} showOptions />);
      
      const button = screen.getByRole('button');
      button.focus();
      
      await user.keyboard('{Enter}');
      expect(screen.getByRole('menu')).toBeInTheDocument();
      
      await user.keyboard('{ArrowDown}');
      expect(screen.getByText('Copy Link')).toHaveFocus();
      
      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });

    it('announces share status to screen readers', async () => {
      Object.assign(navigator, {
        share: undefined,
        canShare: undefined,
      });

      const user = userEvent.setup();
      render(<ShareButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      await waitFor(() => {
        const status = screen.getByRole('status');
        expect(status).toHaveTextContent('Copied to clipboard!');
        expect(status).toHaveAttribute('aria-live', 'polite');
      });
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      render(<ShareButton {...defaultProps} className="custom-share" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-share');
    });

    it('applies custom icon', () => {
      const CustomIcon = () => <span data-testid="custom-icon">📤</span>;
      render(<ShareButton {...defaultProps} icon={<CustomIcon />} />);
      
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
  });

  describe('Data Validation', () => {
    it('handles missing URL gracefully', async () => {
      const user = userEvent.setup();
      render(<ShareButton title="Test" text="Test" />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      // Should still attempt to share with available data
      expect(navigator.share).toHaveBeenCalledWith({
        title: 'Test',
        text: 'Test',
      });
    });

    it('validates share data before sharing', async () => {
      const user = userEvent.setup();
      render(<ShareButton />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      // Should not call share API with empty data
      expect(navigator.share).not.toHaveBeenCalled();
    });
  });
});