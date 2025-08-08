import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportModal } from '../ExportModal';
import { exportService } from '../../../services/exportService';

// Mock the export service
jest.mock('../../../services/exportService', () => ({
  exportService: {
    startExport: jest.fn(),
    getJobStatus: jest.fn(),
  },
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

const mockExportService = exportService as jest.Mocked<typeof exportService>;

describe('ExportModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    dataType: 'dashboard' as const,
    defaultName: 'Test Export',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when open', () => {
    render(<ExportModal {...defaultProps} />);
    
    expect(screen.getByText('Export Data')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Export')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<ExportModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Export Data')).not.toBeInTheDocument();
  });

  it('should display format options', () => {
    render(<ExportModal {...defaultProps} />);
    
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('PNG')).toBeInTheDocument();
  });

  it('should allow format selection', async () => {
    const user = userEvent.setup();
    render(<ExportModal {...defaultProps} />);
    
    // Click on JSON format
    await user.click(screen.getByText('JSON'));
    
    // Should show JSON-specific options
    expect(screen.getByText('JSON Options')).toBeInTheDocument();
    expect(screen.getByText('Pretty print (formatted)')).toBeInTheDocument();
  });

  it('should show CSV-specific options when CSV is selected', async () => {
    const user = userEvent.setup();
    render(<ExportModal {...defaultProps} />);
    
    // CSV should be selected by default
    expect(screen.getByText('CSV Options')).toBeInTheDocument();
    expect(screen.getByText('Delimiter')).toBeInTheDocument();
    expect(screen.getByText('Include headers')).toBeInTheDocument();
  });

  it('should show PDF-specific options when PDF is selected', async () => {
    const user = userEvent.setup();
    render(<ExportModal {...defaultProps} />);
    
    await user.click(screen.getByText('PDF'));
    
    expect(screen.getByText('PDF Options')).toBeInTheDocument();
    expect(screen.getByText('Orientation')).toBeInTheDocument();
    expect(screen.getByText('Page Size')).toBeInTheDocument();
  });

  it('should show PNG-specific options when PNG is selected', async () => {
    const user = userEvent.setup();
    render(<ExportModal {...defaultProps} />);
    
    await user.click(screen.getByText('PNG'));
    
    expect(screen.getByText('PNG Options')).toBeInTheDocument();
    expect(screen.getByText('Width (px)')).toBeInTheDocument();
    expect(screen.getByText('Height (px)')).toBeInTheDocument();
  });

  it('should handle export name input', async () => {
    const user = userEvent.setup();
    render(<ExportModal {...defaultProps} defaultName="" />);
    
    const nameInput = screen.getByPlaceholderText('Enter export name');
    await user.type(nameInput, 'My Custom Export');
    
    expect(nameInput).toHaveValue('My Custom Export');
  });

  it('should disable export button when name is empty', () => {
    render(<ExportModal {...defaultProps} defaultName="" />);
    
    const exportButton = screen.getByRole('button', { name: /export/i });
    expect(exportButton).toBeDisabled();
  });

  it('should enable export button when name is provided', () => {
    render(<ExportModal {...defaultProps} />);
    
    const exportButton = screen.getByRole('button', { name: /export/i });
    expect(exportButton).not.toBeDisabled();
  });

  it('should call exportService.startExport when export button is clicked', async () => {
    const user = userEvent.setup();
    const onExportStart = jest.fn();
    mockExportService.startExport.mockResolvedValue('job-123');
    
    render(
      <ExportModal 
        {...defaultProps} 
        onExportStart={onExportStart}
      />
    );
    
    const exportButton = screen.getByRole('button', { name: /export/i });
    await user.click(exportButton);
    
    await waitFor(() => {
      expect(mockExportService.startExport).toHaveBeenCalledWith({
        format: 'csv',
        name: 'Test Export',
        metadata: {
          dataType: 'dashboard',
          includeMetadata: true,
        },
        async: true,
        notify: true,
      });
    });
    
    expect(onExportStart).toHaveBeenCalledWith('job-123');
  });

  it('should handle synchronous export with download', async () => {
    const user = userEvent.setup();
    mockExportService.startExport.mockResolvedValue('job-123');
    mockExportService.getJobStatus.mockReturnValue({
      id: 'job-123',
      name: 'Test Export',
      format: 'csv',
      status: 'completed',
      progress: 100,
      createdAt: new Date(),
      downloadUrl: 'mock-download-url',
      metadata: {
        dataType: 'dashboard',
      },
    });
    
    // Mock document methods
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    const createElement = jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    const appendChild = jest.spyOn(document.body, 'appendChild').mockImplementation();
    const removeChild = jest.spyOn(document.body, 'removeChild').mockImplementation();
    
    render(<ExportModal {...defaultProps} />);
    
    // Uncheck async export
    const asyncCheckbox = screen.getByText('Process in background (recommended for large datasets)');
    await user.click(asyncCheckbox);
    
    const exportButton = screen.getByRole('button', { name: /export & download/i });
    await user.click(exportButton);
    
    await waitFor(() => {
      expect(mockExportService.startExport).toHaveBeenCalledWith(
        expect.objectContaining({
          async: false,
        })
      );
    });
    
    expect(createElement).toHaveBeenCalledWith('a');
    expect(mockLink.href).toBe('mock-download-url');
    expect(mockLink.download).toBe('Test Export.csv');
    expect(mockLink.click).toHaveBeenCalled();
    
    createElement.mockRestore();
    appendChild.mockRestore();
    removeChild.mockRestore();
  });

  it('should handle export errors gracefully', async () => {
    const user = userEvent.setup();
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    mockExportService.startExport.mockRejectedValue(new Error('Export failed'));
    
    render(<ExportModal {...defaultProps} />);
    
    const exportButton = screen.getByRole('button', { name: /export/i });
    await user.click(exportButton);
    
    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Export failed:', expect.any(Error));
    });
    
    consoleError.mockRestore();
  });

  it('should close modal when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    
    render(<ExportModal {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should close modal when X button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    
    render(<ExportModal {...defaultProps} onClose={onClose} />);
    
    // Find the X button (close icon)
    const closeIcon = screen.getByRole('button', { name: '' }); // The X button typically has no accessible name
    await user.click(closeIcon);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should toggle general options checkboxes', async () => {
    const user = userEvent.setup();
    render(<ExportModal {...defaultProps} />);
    
    const metadataCheckbox = screen.getByText('Include metadata');
    const notifyCheckbox = screen.getByText('Notify when export is complete');
    
    // Initially checked
    expect(metadataCheckbox.previousElementSibling).toBeChecked();
    expect(notifyCheckbox.previousElementSibling).toBeChecked();
    
    // Uncheck metadata
    await user.click(metadataCheckbox);
    expect(metadataCheckbox.previousElementSibling).not.toBeChecked();
    
    // Uncheck notify
    await user.click(notifyCheckbox);
    expect(notifyCheckbox.previousElementSibling).not.toBeChecked();
  });

  it('should update CSV options', async () => {
    const user = userEvent.setup();
    render(<ExportModal {...defaultProps} />);
    
    // Change delimiter
    const delimiterSelect = screen.getByDisplayValue('Comma (,)');
    await user.selectOptions(delimiterSelect, 'Semicolon (;)');
    expect(delimiterSelect).toHaveValue(';');
    
    // Toggle include headers
    const headersCheckbox = screen.getByText('Include headers');
    await user.click(headersCheckbox);
    expect(headersCheckbox.previousElementSibling).not.toBeChecked();
  });

  it('should update PNG options', async () => {
    const user = userEvent.setup();
    render(<ExportModal {...defaultProps} />);
    
    // Select PNG format
    await user.click(screen.getByText('PNG'));
    
    // Update width
    const widthInput = screen.getByDisplayValue('1200');
    await user.clear(widthInput);
    await user.type(widthInput, '800');
    expect(widthInput).toHaveValue('800');
    
    // Update quality
    const qualitySlider = screen.getByRole('slider');
    fireEvent.change(qualitySlider, { target: { value: '0.8' } });
    expect(qualitySlider).toHaveValue('0.8');
  });

  it('should show loading state during export', async () => {
    const user = userEvent.setup();
    mockExportService.startExport.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve('job-123'), 1000))
    );
    
    render(<ExportModal {...defaultProps} />);
    
    const exportButton = screen.getByRole('button', { name: /export/i });
    await user.click(exportButton);
    
    // Should show loading state
    expect(screen.getByRole('button', { name: /export/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });
});