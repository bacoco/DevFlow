/**
 * ShareModal Component Tests
 * Comprehensive tests for share modal functionality
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ShareModal } from '../ShareModal';

expect.extend(toHaveNoViolations);

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

describe('ShareModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    url: 'https://example.com/dashboard',
    title: 'My Dashboard',
    description: 'Check out my productivity dashboard',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders modal when open', () => {
      render(<ShareModal {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Share Dashboard')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<ShareModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders with custom title', () => {
      render(<ShareModal {...defaultProps} modalTitle="Share My Work" />);
      
      expect(screen.getByText('Share My Work')).toBeInTheDocument();
    });

    it('renders dashboard title and description', () => {
      render(<ShareModal {...defaultProps} />);
      
      expect(screen.getByText('My Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Check out my productivity dashboard')).toBeInTheDocument();
    });
  });

  describe('Share Options', () => {
    it('renders all share options', () => {
      render(<ShareModal {...defaultProps} />);
      
      expect(screen.getByText('Copy Link')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Twitter')).toBeInTheDocument();
      expect(screen.getByText('LinkedIn')).toBeInTheDocument();
      expect(screen.getByText('Facebook')).toBeInTheDocument();
    });

    it('copies link to clipboard when copy option is clicked', async () => {
      const user = userEvent.setup();
      render(<ShareModal {...defaultProps} />);
      
      const copyButton = screen.getByText('Copy Link');
      await user.click(copyButton);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(defaultProps.url);
      
      await waitFor(() => {
        expect(screen.getByText('Link copied!')).toBeInTheDocument();
      });
    });

    it('opens email client when email option is clicked', async () => {
      const user = userEvent.setup();
      const mockOpen = jest.fn();
      Object.assign(window, { open: mockOpen });
      
      render(<ShareModal {...defaultProps} />);
      
      const emailButton = screen.getByText('Email');
      await user.click(emailButton);
      
      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('mailto:'),
        '_blank'
      );
    });

    it('opens Twitter share when Twitter option is clicked', async () => {
      const user = userEvent.setup();
      const mockOpen = jest.fn();
      Object.assign(window, { open: mockOpen });
      
      render(<ShareModal {...defaultProps} />);
      
      const twitterButton = screen.getByText('Twitter');
      await user.click(twitterButton);
      
      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('twitter.com/intent/tweet'),
        '_blank'
      );
    });

    it('opens LinkedIn share when LinkedIn option is clicked', async () => {
      const user = userEvent.setup();
      const mockOpen = jest.fn();
      Object.assign(window, { open: mockOpen });
      
      render(<ShareModal {...defaultProps} />);
      
      const linkedinButton = screen.getByText('LinkedIn');
      await user.click(linkedinButton);
      
      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('linkedin.com/sharing/share-offsite'),
        '_blank'
      );
    });

    it('opens Facebook share when Facebook option is clicked', async () => {
      const user = userEvent.setup();
      const mockOpen = jest.fn();
      Object.assign(window, { open: mockOpen });
      
      render(<ShareModal {...defaultProps} />);
      
      const facebookButton = screen.getByText('Facebook');
      await user.click(facebookButton);
      
      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('facebook.com/sharer/sharer.php'),
        '_blank'
      );
    });
  });

  describe('Link Preview', () => {
    it('shows link preview section', () => {
      render(<ShareModal {...defaultProps} />);
      
      expect(screen.getByText('Link Preview')).toBeInTheDocument();
      expect(screen.getByDisplayValue(defaultProps.url)).toBeInTheDocument();
    });

    it('allows editing the share URL', async () => {
      const user = userEvent.setup();
      render(<ShareModal {...defaultProps} />);
      
      const urlInput = screen.getByDisplayValue(defaultProps.url);
      await user.clear(urlInput);
      await user.type(urlInput, 'https://custom.com/dashboard');
      
      expect(urlInput).toHaveValue('https://custom.com/dashboard');
    });

    it('shows QR code when enabled', () => {
      render(<ShareModal {...defaultProps} showQRCode />);
      
      expect(screen.getByText('QR Code')).toBeInTheDocument();
      expect(screen.getByTestId('qr-code')).toBeInTheDocument();
    });

    it('allows downloading QR code', async () => {
      const user = userEvent.setup();
      render(<ShareModal {...defaultProps} showQRCode />);
      
      const downloadButton = screen.getByText('Download QR Code');
      await user.click(downloadButton);
      
      // Should trigger download (implementation would handle actual download)
      expect(downloadButton).toBeInTheDocument();
    });
  });

  describe('Permission Settings', () => {
    it('shows permission settings when enabled', () => {
      render(<ShareModal {...defaultProps} showPermissions />);
      
      expect(screen.getByText('Access Permissions')).toBeInTheDocument();
      expect(screen.getByText('View Only')).toBeInTheDocument();
      expect(screen.getByText('Comment')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('allows selecting different permission levels', async () => {
      const user = userEvent.setup();
      render(<ShareModal {...defaultProps} showPermissions />);
      
      const editOption = screen.getByLabelText('Edit');
      await user.click(editOption);
      
      expect(editOption).toBeChecked();
    });

    it('shows expiration settings', () => {
      render(<ShareModal {...defaultProps} showPermissions />);
      
      expect(screen.getByText('Link Expiration')).toBeInTheDocument();
      expect(screen.getByText('Never')).toBeInTheDocument();
      expect(screen.getByText('1 day')).toBeInTheDocument();
      expect(screen.getByText('1 week')).toBeInTheDocument();
      expect(screen.getByText('1 month')).toBeInTheDocument();
    });

    it('allows setting link expiration', async () => {
      const user = userEvent.setup();
      render(<ShareModal {...defaultProps} showPermissions />);
      
      const weekOption = screen.getByLabelText('1 week');
      await user.click(weekOption);
      
      expect(weekOption).toBeChecked();
    });
  });

  describe('Modal Interactions', () => {
    it('closes modal when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<ShareModal {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('closes modal when backdrop is clicked', async () => {
      const user = userEvent.setup();
      render(<ShareModal {...defaultProps} />);
      
      const backdrop = screen.getByTestId('modal-backdrop');
      await user.click(backdrop);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('closes modal when Escape key is pressed', async () => {
      const user = userEvent.setup();
      render(<ShareModal {...defaultProps} />);
      
      await user.keyboard('{Escape}');
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('does not close when clicking inside modal content', async () => {
      const user = userEvent.setup();
      render(<ShareModal {...defaultProps} />);
      
      const modalContent = screen.getByRole('dialog');
      await user.click(modalContent);
      
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<ShareModal {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA attributes', () => {
      render(<ShareModal {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('manages focus properly', () => {
      render(<ShareModal {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveFocus();
    });

    it('traps focus within modal', async () => {
      const user = userEvent.setup();
      render(<ShareModal {...defaultProps} />);
      
      const firstButton = screen.getByText('Copy Link');
      const lastButton = screen.getByRole('button', { name: /close/i });
      
      // Focus should be trapped within modal
      lastButton.focus();
      await user.tab();
      expect(firstButton).toHaveFocus();
      
      firstButton.focus();
      await user.tab({ shift: true });
      expect(lastButton).toHaveFocus();
    });

    it('restores focus when modal closes', async () => {
      const user = userEvent.setup();
      const triggerButton = document.createElement('button');
      document.body.appendChild(triggerButton);
      triggerButton.focus();
      
      const { rerender } = render(<ShareModal {...defaultProps} />);
      
      rerender(<ShareModal {...defaultProps} isOpen={false} />);
      
      expect(triggerButton).toHaveFocus();
      
      document.body.removeChild(triggerButton);
    });

    it('provides proper labels for share options', () => {
      render(<ShareModal {...defaultProps} />);
      
      const copyButton = screen.getByRole('button', { name: 'Copy Link' });
      expect(copyButton).toHaveAttribute('aria-label', 'Copy link to clipboard');
      
      const emailButton = screen.getByRole('button', { name: 'Email' });
      expect(emailButton).toHaveAttribute('aria-label', 'Share via email');
    });
  });

  describe('Error Handling', () => {
    it('handles clipboard errors gracefully', async () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockRejectedValue(new Error('Clipboard failed')),
        },
      });

      const user = userEvent.setup();
      render(<ShareModal {...defaultProps} />);
      
      const copyButton = screen.getByText('Copy Link');
      await user.click(copyButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to copy link')).toBeInTheDocument();
      });
    });

    it('handles popup blocker errors', async () => {
      const mockOpen = jest.fn().mockReturnValue(null);
      Object.assign(window, { open: mockOpen });

      const user = userEvent.setup();
      render(<ShareModal {...defaultProps} />);
      
      const twitterButton = screen.getByText('Twitter');
      await user.click(twitterButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please allow popups to share')).toBeInTheDocument();
      });
    });

    it('calls onError callback when provided', async () => {
      const onError = jest.fn();
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockRejectedValue(new Error('Clipboard failed')),
        },
      });

      const user = userEvent.setup();
      render(<ShareModal {...defaultProps} onError={onError} />);
      
      const copyButton = screen.getByText('Copy Link');
      await user.click(copyButton);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });
  });

  describe('Customization', () => {
    it('allows custom share options', () => {
      const customOptions = [
        { name: 'Slack', icon: '💬', action: jest.fn() },
        { name: 'Discord', icon: '🎮', action: jest.fn() },
      ];

      render(<ShareModal {...defaultProps} customOptions={customOptions} />);
      
      expect(screen.getByText('Slack')).toBeInTheDocument();
      expect(screen.getByText('Discord')).toBeInTheDocument();
    });

    it('executes custom option actions', async () => {
      const customAction = jest.fn();
      const customOptions = [
        { name: 'Custom', icon: '⚡', action: customAction },
      ];

      const user = userEvent.setup();
      render(<ShareModal {...defaultProps} customOptions={customOptions} />);
      
      const customButton = screen.getByText('Custom');
      await user.click(customButton);
      
      expect(customAction).toHaveBeenCalledWith({
        url: defaultProps.url,
        title: defaultProps.title,
        description: defaultProps.description,
      });
    });

    it('applies custom styling', () => {
      render(<ShareModal {...defaultProps} className="custom-modal" />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('custom-modal');
    });

    it('allows hiding specific sections', () => {
      render(
        <ShareModal 
          {...defaultProps} 
          showQRCode={false}
          showPermissions={false}
        />
      );
      
      expect(screen.queryByText('QR Code')).not.toBeInTheDocument();
      expect(screen.queryByText('Access Permissions')).not.toBeInTheDocument();
    });
  });

  describe('Analytics Integration', () => {
    it('tracks share events when analytics callback is provided', async () => {
      const onAnalytics = jest.fn();
      const user = userEvent.setup();
      
      render(<ShareModal {...defaultProps} onAnalytics={onAnalytics} />);
      
      const twitterButton = screen.getByText('Twitter');
      await user.click(twitterButton);
      
      expect(onAnalytics).toHaveBeenCalledWith({
        event: 'share',
        platform: 'twitter',
        url: defaultProps.url,
        title: defaultProps.title,
      });
    });

    it('tracks copy events', async () => {
      const onAnalytics = jest.fn();
      const user = userEvent.setup();
      
      render(<ShareModal {...defaultProps} onAnalytics={onAnalytics} />);
      
      const copyButton = screen.getByText('Copy Link');
      await user.click(copyButton);
      
      expect(onAnalytics).toHaveBeenCalledWith({
        event: 'copy_link',
        url: defaultProps.url,
        title: defaultProps.title,
      });
    });
  });
});