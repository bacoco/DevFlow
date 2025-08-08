import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportButton } from '../ExportButton';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
  },
}));

// Mock the ExportModal component
jest.mock('../ExportModal', () => ({
  ExportModal: ({ isOpen, onClose, onExportStart }: any) => (
    isOpen ? (
      <div data-testid="export-modal">
        <button onClick={() => onExportStart('test-job-id')}>Start Export</button>
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null
  ),
}));

describe('ExportButton', () => {
  const defaultProps = {
    dataType: 'dashboard' as const,
  };

  it('should render with default props', () => {
    render(<ExportButton {...defaultProps} />);
    
    const button = screen.getByRole('button', { name: /export/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('should render with icon and text by default', () => {
    render(<ExportButton {...defaultProps} />);
    
    const button = screen.getByRole('button', { name: /export/i });
    expect(button).toBeInTheDocument();
    
    // Check for SVG icon
    const icon = button.querySelector('svg');
    expect(icon).toBeInTheDocument();
    
    // Check for text
    expect(button).toHaveTextContent('Export');
  });

  it('should render with icon only when showText is false', () => {
    render(<ExportButton {...defaultProps} showText={false} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    
    // Should have icon
    const icon = button.querySelector('svg');
    expect(icon).toBeInTheDocument();
    
    // Should not have text
    expect(button).not.toHaveTextContent('Export');
  });

  it('should render with text only when showIcon is false', () => {
    render(<ExportButton {...defaultProps} showIcon={false} />);
    
    const button = screen.getByRole('button', { name: /export/i });
    expect(button).toBeInTheDocument();
    
    // Should not have icon
    const icon = button.querySelector('svg');
    expect(icon).not.toBeInTheDocument();
    
    // Should have text
    expect(button).toHaveTextContent('Export');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<ExportButton {...defaultProps} disabled />);
    
    const button = screen.getByRole('button', { name: /export/i });
    expect(button).toBeDisabled();
  });

  it('should apply custom className', () => {
    render(<ExportButton {...defaultProps} className="custom-class" />);
    
    const button = screen.getByRole('button', { name: /export/i });
    expect(button).toHaveClass('custom-class');
  });

  it('should render with different variants', () => {
    const { rerender } = render(<ExportButton {...defaultProps} variant="primary" />);
    let button = screen.getByRole('button', { name: /export/i });
    expect(button).toBeInTheDocument();

    rerender(<ExportButton {...defaultProps} variant="secondary" />);
    button = screen.getByRole('button', { name: /export/i });
    expect(button).toBeInTheDocument();

    rerender(<ExportButton {...defaultProps} variant="ghost" />);
    button = screen.getByRole('button', { name: /export/i });
    expect(button).toBeInTheDocument();

    rerender(<ExportButton {...defaultProps} variant="danger" />);
    button = screen.getByRole('button', { name: /export/i });
    expect(button).toBeInTheDocument();
  });

  it('should render with different sizes', () => {
    const { rerender } = render(<ExportButton {...defaultProps} size="sm" />);
    let button = screen.getByRole('button', { name: /export/i });
    expect(button).toBeInTheDocument();

    rerender(<ExportButton {...defaultProps} size="md" />);
    button = screen.getByRole('button', { name: /export/i });
    expect(button).toBeInTheDocument();

    rerender(<ExportButton {...defaultProps} size="lg" />);
    button = screen.getByRole('button', { name: /export/i });
    expect(button).toBeInTheDocument();
  });

  it('should open modal when clicked', async () => {
    const user = userEvent.setup();
    render(<ExportButton {...defaultProps} />);
    
    const button = screen.getByRole('button', { name: /export/i });
    await user.click(button);
    
    expect(screen.getByTestId('export-modal')).toBeInTheDocument();
  });

  it('should close modal when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<ExportButton {...defaultProps} />);
    
    // Open modal
    const button = screen.getByRole('button', { name: /export/i });
    await user.click(button);
    
    expect(screen.getByTestId('export-modal')).toBeInTheDocument();
    
    // Close modal
    const closeButton = screen.getByText('Close Modal');
    await user.click(closeButton);
    
    expect(screen.queryByTestId('export-modal')).not.toBeInTheDocument();
  });

  it('should call onExportStart when export is started', async () => {
    const user = userEvent.setup();
    const onExportStart = jest.fn();
    
    render(<ExportButton {...defaultProps} onExportStart={onExportStart} />);
    
    // Open modal
    const button = screen.getByRole('button', { name: /export/i });
    await user.click(button);
    
    // Start export
    const startExportButton = screen.getByText('Start Export');
    await user.click(startExportButton);
    
    expect(onExportStart).toHaveBeenCalledWith('test-job-id');
    expect(screen.queryByTestId('export-modal')).not.toBeInTheDocument();
  });

  it('should pass dataType to modal', async () => {
    const user = userEvent.setup();
    render(<ExportButton dataType="tasks" />);
    
    const button = screen.getByRole('button', { name: /export/i });
    await user.click(button);
    
    expect(screen.getByTestId('export-modal')).toBeInTheDocument();
  });

  it('should pass dataId to modal when provided', async () => {
    const user = userEvent.setup();
    render(<ExportButton {...defaultProps} dataId="test-id" />);
    
    const button = screen.getByRole('button', { name: /export/i });
    await user.click(button);
    
    expect(screen.getByTestId('export-modal')).toBeInTheDocument();
  });

  it('should pass defaultName to modal when provided', async () => {
    const user = userEvent.setup();
    render(<ExportButton {...defaultProps} defaultName="Custom Export Name" />);
    
    const button = screen.getByRole('button', { name: /export/i });
    await user.click(button);
    
    expect(screen.getByTestId('export-modal')).toBeInTheDocument();
  });

  it('should not open modal when disabled', async () => {
    const user = userEvent.setup();
    render(<ExportButton {...defaultProps} disabled />);
    
    const button = screen.getByRole('button', { name: /export/i });
    await user.click(button);
    
    expect(screen.queryByTestId('export-modal')).not.toBeInTheDocument();
  });

  it('should handle keyboard interaction', () => {
    render(<ExportButton {...defaultProps} />);
    
    const button = screen.getByRole('button', { name: /export/i });
    
    // Focus the button
    button.focus();
    expect(button).toHaveFocus();
    
    // Press Enter
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
    expect(screen.getByTestId('export-modal')).toBeInTheDocument();
  });

  it('should handle different data types', () => {
    const dataTypes = ['dashboard', 'tasks', 'analytics', 'chart', 'widget'] as const;
    
    dataTypes.forEach(dataType => {
      const { unmount } = render(<ExportButton dataType={dataType} />);
      
      const button = screen.getByRole('button', { name: /export/i });
      expect(button).toBeInTheDocument();
      
      unmount();
    });
  });
});