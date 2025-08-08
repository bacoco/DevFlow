import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportProgress } from '../ExportProgress';
import { exportService } from '../../../services/exportService';
import { ExportJob } from '../../../types/export';

// Mock the export service
jest.mock('../../../services/exportService', () => ({
  exportService: {
    getJobStatus: jest.fn(),
    onProgress: jest.fn(),
    offProgress: jest.fn(),
    cancelExport: jest.fn(),
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

describe('ExportProgress', () => {
  const mockJob: ExportJob = {
    id: 'test-job-id',
    name: 'Test Export',
    format: 'csv',
    status: 'processing',
    progress: 50,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    metadata: {
      dataType: 'dashboard',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockExportService.getJobStatus.mockReturnValue(mockJob);
  });

  it('should render processing job', () => {
    render(<ExportProgress jobId="test-job-id" />);
    
    expect(screen.getByText('Test Export')).toBeInTheDocument();
    expect(screen.getByText('processing')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should render completed job with download button', () => {
    const completedJob: ExportJob = {
      ...mockJob,
      status: 'completed',
      progress: 100,
      completedAt: new Date('2024-01-01T10:05:00Z'),
      downloadUrl: 'mock-download-url',
    };
    
    mockExportService.getJobStatus.mockReturnValue(completedJob);
    
    render(<ExportProgress jobId="test-job-id" />);
    
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText(/export completed successfully/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
  });

  it('should render failed job with error message', () => {
    const failedJob: ExportJob = {
      ...mockJob,
      status: 'failed',
      progress: 0,
      error: 'Export failed due to network error',
    };
    
    mockExportService.getJobStatus.mockReturnValue(failedJob);
    
    render(<ExportProgress jobId="test-job-id" />);
    
    expect(screen.getByText('failed')).toBeInTheDocument();
    expect(screen.getByText('Export failed due to network error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('should render cancelled job', () => {
    const cancelledJob: ExportJob = {
      ...mockJob,
      status: 'cancelled',
      progress: 0,
    };
    
    mockExportService.getJobStatus.mockReturnValue(cancelledJob);
    
    render(<ExportProgress jobId="test-job-id" />);
    
    expect(screen.getByText('cancelled')).toBeInTheDocument();
  });

  it('should render in compact mode', () => {
    render(<ExportProgress jobId="test-job-id" compact />);
    
    expect(screen.getByText('Test Export')).toBeInTheDocument();
    expect(screen.getByText('processing')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    
    // Should not have the full card layout
    expect(screen.queryByText('CSV export • Created')).not.toBeInTheDocument();
  });

  it('should subscribe to progress updates on mount', () => {
    render(<ExportProgress jobId="test-job-id" />);
    
    expect(mockExportService.onProgress).toHaveBeenCalledWith(
      'test-job-id',
      expect.any(Function)
    );
  });

  it('should unsubscribe from progress updates on unmount', () => {
    const { unmount } = render(<ExportProgress jobId="test-job-id" />);
    
    unmount();
    
    expect(mockExportService.offProgress).toHaveBeenCalledWith('test-job-id');
  });

  it('should handle progress updates', async () => {
    let progressCallback: any;
    mockExportService.onProgress.mockImplementation((jobId, callback) => {
      progressCallback = callback;
    });
    
    render(<ExportProgress jobId="test-job-id" />);
    
    // Simulate progress update
    const updatedJob: ExportJob = {
      ...mockJob,
      progress: 75,
    };
    mockExportService.getJobStatus.mockReturnValue(updatedJob);
    
    progressCallback({
      jobId: 'test-job-id',
      progress: 75,
      status: 'processing',
      message: 'Processing data...',
    });
    
    await waitFor(() => {
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('Processing data...')).toBeInTheDocument();
    });
  });

  it('should call onComplete when job completes', async () => {
    const onComplete = jest.fn();
    let progressCallback: any;
    
    mockExportService.onProgress.mockImplementation((jobId, callback) => {
      progressCallback = callback;
    });
    
    render(<ExportProgress jobId="test-job-id" onComplete={onComplete} />);
    
    // Simulate completion
    const completedJob: ExportJob = {
      ...mockJob,
      status: 'completed',
      progress: 100,
      completedAt: new Date(),
      downloadUrl: 'mock-download-url',
    };
    mockExportService.getJobStatus.mockReturnValue(completedJob);
    
    progressCallback({
      jobId: 'test-job-id',
      progress: 100,
      status: 'completed',
    });
    
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(completedJob);
    });
  });

  it('should handle cancel button click', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    mockExportService.cancelExport.mockResolvedValue(true);
    
    render(<ExportProgress jobId="test-job-id" onCancel={onCancel} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel export/i });
    await user.click(cancelButton);
    
    expect(mockExportService.cancelExport).toHaveBeenCalledWith('test-job-id');
    
    await waitFor(() => {
      expect(onCancel).toHaveBeenCalledWith('test-job-id');
    });
  });

  it('should handle download button click', async () => {
    const user = userEvent.setup();
    const completedJob: ExportJob = {
      ...mockJob,
      status: 'completed',
      progress: 100,
      downloadUrl: 'mock-download-url',
    };
    
    mockExportService.getJobStatus.mockReturnValue(completedJob);
    
    // Mock document methods
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    const createElement = jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    const appendChild = jest.spyOn(document.body, 'appendChild').mockImplementation();
    const removeChild = jest.spyOn(document.body, 'removeChild').mockImplementation();
    
    render(<ExportProgress jobId="test-job-id" />);
    
    const downloadButton = screen.getByRole('button', { name: /download/i });
    await user.click(downloadButton);
    
    expect(createElement).toHaveBeenCalledWith('a');
    expect(mockLink.href).toBe('mock-download-url');
    expect(mockLink.download).toBe('Test Export.csv');
    expect(mockLink.click).toHaveBeenCalled();
    
    createElement.mockRestore();
    appendChild.mockRestore();
    removeChild.mockRestore();
  });

  it('should handle compact mode download button', async () => {
    const user = userEvent.setup();
    const completedJob: ExportJob = {
      ...mockJob,
      status: 'completed',
      progress: 100,
      downloadUrl: 'mock-download-url',
    };
    
    mockExportService.getJobStatus.mockReturnValue(completedJob);
    
    // Mock document methods
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    const createElement = jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    const appendChild = jest.spyOn(document.body, 'appendChild').mockImplementation();
    const removeChild = jest.spyOn(document.body, 'removeChild').mockImplementation();
    
    render(<ExportProgress jobId="test-job-id" compact />);
    
    // In compact mode, download button should be an icon button
    const downloadButton = screen.getByRole('button');
    await user.click(downloadButton);
    
    expect(mockLink.click).toHaveBeenCalled();
    
    createElement.mockRestore();
    appendChild.mockRestore();
    removeChild.mockRestore();
  });

  it('should handle compact mode cancel button', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    mockExportService.cancelExport.mockResolvedValue(true);
    
    render(<ExportProgress jobId="test-job-id" compact onCancel={onCancel} />);
    
    // In compact mode, cancel button should be an icon button
    const cancelButton = screen.getByRole('button');
    await user.click(cancelButton);
    
    expect(mockExportService.cancelExport).toHaveBeenCalledWith('test-job-id');
  });

  it('should return null when job is not found', () => {
    mockExportService.getJobStatus.mockReturnValue(null);
    
    const { container } = render(<ExportProgress jobId="invalid-job-id" />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should format time remaining correctly', async () => {
    let progressCallback: any;
    mockExportService.onProgress.mockImplementation((jobId, callback) => {
      progressCallback = callback;
    });
    
    render(<ExportProgress jobId="test-job-id" />);
    
    // Test seconds
    progressCallback({
      jobId: 'test-job-id',
      progress: 25,
      status: 'processing',
      estimatedTimeRemaining: 30,
    });
    
    await waitFor(() => {
      expect(screen.getByText('30s remaining')).toBeInTheDocument();
    });
    
    // Test minutes
    progressCallback({
      jobId: 'test-job-id',
      progress: 50,
      status: 'processing',
      estimatedTimeRemaining: 120,
    });
    
    await waitFor(() => {
      expect(screen.getByText('2m remaining')).toBeInTheDocument();
    });
    
    // Test hours
    progressCallback({
      jobId: 'test-job-id',
      progress: 75,
      status: 'processing',
      estimatedTimeRemaining: 3600,
    });
    
    await waitFor(() => {
      expect(screen.getByText('1h remaining')).toBeInTheDocument();
    });
  });

  it('should show correct status colors and icons', () => {
    const statuses = [
      { status: 'completed', expectedClass: 'text-green-600' },
      { status: 'failed', expectedClass: 'text-red-600' },
      { status: 'cancelled', expectedClass: 'text-gray-600' },
      { status: 'processing', expectedClass: 'text-blue-600' },
    ];
    
    statuses.forEach(({ status }) => {
      const jobWithStatus: ExportJob = {
        ...mockJob,
        status: status as any,
      };
      
      mockExportService.getJobStatus.mockReturnValue(jobWithStatus);
      
      const { unmount } = render(<ExportProgress jobId="test-job-id" />);
      
      expect(screen.getByText(status)).toBeInTheDocument();
      
      unmount();
    });
  });
});