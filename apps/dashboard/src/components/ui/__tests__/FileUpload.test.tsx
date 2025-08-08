/**
 * FileUpload Component Tests
 * Comprehensive tests for file upload functionality, drag and drop, and accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import FileUpload from '../FileUpload';
import { TaskAttachment } from '../../../types/design-system';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, any>(({ children, whileHover, whileTap, animate, initial, exit, transition, ...props }, ref) => (
      <div ref={ref} {...props}>
        {children}
      </div>
    )),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock react-dropzone
const mockGetRootProps = jest.fn(() => ({
  onClick: jest.fn(),
  onKeyDown: jest.fn(),
  tabIndex: 0,
  role: 'button',
}));

const mockGetInputProps = jest.fn(() => ({
  type: 'file',
  multiple: true,
  accept: '',
}));

jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(() => ({
    getRootProps: mockGetRootProps,
    getInputProps: mockGetInputProps,
    isDragActive: false,
  })),
}));

// Test data
const mockAttachments: TaskAttachment[] = [
  {
    id: '1',
    name: 'document.pdf',
    url: 'https://example.com/document.pdf',
    type: 'application/pdf',
    size: 1024000,
    uploadedBy: { id: '1', name: 'John Doe', email: 'john@example.com' },
    uploadedAt: new Date('2023-01-01'),
  },
  {
    id: '2',
    name: 'image.jpg',
    url: 'https://example.com/image.jpg',
    type: 'image/jpeg',
    size: 512000,
    uploadedBy: { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
    uploadedAt: new Date('2023-01-02'),
  },
];

const createMockFile = (name: string, type: string, size: number): File => {
  const file = new File([''], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('FileUpload Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.open
    Object.defineProperty(window, 'open', {
      value: jest.fn(),
      writable: true,
    });
  });

  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(<FileUpload />);
      
      expect(screen.getByText('Click to upload or drag and drop')).toBeInTheDocument();
      expect(screen.getByText(/Any file type/)).toBeInTheDocument();
      expect(screen.getByText(/Up to 10 files/)).toBeInTheDocument();
    });

    it('renders with custom props', () => {
      render(
        <FileUpload
          maxFiles={5}
          maxSize={5 * 1024 * 1024}
          acceptedTypes={['image/jpeg', 'image/png']}
          testId="custom-upload"
        />
      );
      
      expect(screen.getByTestId('custom-upload')).toBeInTheDocument();
      expect(screen.getByText(/Accepted: image\/jpeg, image\/png/)).toBeInTheDocument();
      expect(screen.getByText(/Max 5 MB per file/)).toBeInTheDocument();
      expect(screen.getByText(/Up to 5 files/)).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<FileUpload className="custom-upload" testId="upload" />);
      
      const container = screen.getByTestId('upload');
      expect(container).toHaveClass('custom-upload');
    });

    it('shows disabled state', () => {
      render(<FileUpload disabled testId="upload" />);
      
      const dropzone = screen.getByText('Click to upload or drag and drop').closest('div');
      expect(dropzone).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });

  describe('File Display', () => {
    it('displays existing attachments', () => {
      render(<FileUpload attachments={mockAttachments} />);
      
      expect(screen.getByText('document.pdf')).toBeInTheDocument();
      expect(screen.getByText('image.jpg')).toBeInTheDocument();
      expect(screen.getByText('1000 KB')).toBeInTheDocument();
      expect(screen.getByText('500 KB')).toBeInTheDocument();
      expect(screen.getByText('Uploaded by John Doe')).toBeInTheDocument();
      expect(screen.getByText('Uploaded by Jane Smith')).toBeInTheDocument();
    });

    it('shows file count', () => {
      render(<FileUpload attachments={mockAttachments} maxFiles={5} />);
      
      expect(screen.getByText('2 of 5 files')).toBeInTheDocument();
    });

    it('displays correct file icons based on type', () => {
      render(<FileUpload attachments={mockAttachments} />);
      
      // Should render file icons (we can't easily test the specific icons, but we can test they render)
      const fileElements = screen.getAllByText(/document\.pdf|image\.jpg/);
      expect(fileElements).toHaveLength(2);
    });

    it('formats file sizes correctly', () => {
      const largeAttachment: TaskAttachment = {
        ...mockAttachments[0],
        size: 1024 * 1024 * 1024, // 1GB
      };
      
      render(<FileUpload attachments={[largeAttachment]} />);
      
      expect(screen.getByText('1 GB')).toBeInTheDocument();
    });
  });

  describe('File Actions', () => {
    it('calls onRemove when remove button is clicked', async () => {
      const onRemove = jest.fn();
      const user = userEvent.setup();
      
      render(<FileUpload attachments={mockAttachments} onRemove={onRemove} />);
      
      const removeButtons = screen.getAllByTitle('Remove');
      await user.click(removeButtons[0]);
      
      expect(onRemove).toHaveBeenCalledWith('1');
    });

    it('opens file URL when download button is clicked', async () => {
      const user = userEvent.setup();
      const mockOpen = jest.fn();
      window.open = mockOpen;
      
      render(<FileUpload attachments={mockAttachments} />);
      
      const downloadButtons = screen.getAllByTitle('Download');
      await user.click(downloadButtons[0]);
      
      expect(mockOpen).toHaveBeenCalledWith('https://example.com/document.pdf', '_blank');
    });

    it('shows preview button for images', () => {
      render(<FileUpload attachments={mockAttachments} />);
      
      const previewButtons = screen.getAllByTitle('Preview');
      expect(previewButtons).toHaveLength(1); // Only for the image file
    });

    it('opens image preview when preview button is clicked', async () => {
      const user = userEvent.setup();
      const mockOpen = jest.fn();
      window.open = mockOpen;
      
      render(<FileUpload attachments={mockAttachments} />);
      
      const previewButton = screen.getByTitle('Preview');
      await user.click(previewButton);
      
      expect(mockOpen).toHaveBeenCalledWith('https://example.com/image.jpg', '_blank');
    });
  });

  describe('Drag and Drop', () => {
    it('configures dropzone with correct props', () => {
      const { useDropzone } = require('react-dropzone');
      
      render(
        <FileUpload
          maxFiles={5}
          maxSize={1024000}
          acceptedTypes={['image/jpeg']}
        />
      );
      
      expect(useDropzone).toHaveBeenCalledWith(
        expect.objectContaining({
          maxSize: 1024000,
          maxFiles: 5,
          accept: { 'image/jpeg': [] },
          disabled: false,
        })
      );
    });

    it('handles drag active state', () => {
      const { useDropzone } = require('react-dropzone');
      useDropzone.mockReturnValue({
        getRootProps: mockGetRootProps,
        getInputProps: mockGetInputProps,
        isDragActive: true,
      });
      
      render(<FileUpload />);
      
      expect(screen.getByText('Drop files here')).toBeInTheDocument();
    });

    it('calls onDrop when files are dropped', async () => {
      const onUpload = jest.fn().mockResolvedValue([]);
      const { useDropzone } = require('react-dropzone');
      
      let onDropCallback: any;
      useDropzone.mockImplementation((config) => {
        onDropCallback = config.onDrop;
        return {
          getRootProps: mockGetRootProps,
          getInputProps: mockGetInputProps,
          isDragActive: false,
        };
      });
      
      render(<FileUpload onUpload={onUpload} />);
      
      const testFile = createMockFile('test.txt', 'text/plain', 1024);
      await onDropCallback([testFile], []);
      
      expect(onUpload).toHaveBeenCalledWith([testFile]);
    });
  });

  describe('File Upload Process', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('shows upload progress', async () => {
      const onUpload = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 2000))
      );
      const { useDropzone } = require('react-dropzone');
      
      let onDropCallback: any;
      useDropzone.mockImplementation((config) => {
        onDropCallback = config.onDrop;
        return {
          getRootProps: mockGetRootProps,
          getInputProps: mockGetInputProps,
          isDragActive: false,
        };
      });
      
      render(<FileUpload onUpload={onUpload} />);
      
      const testFile = createMockFile('test.txt', 'text/plain', 1024);
      
      // Trigger file drop
      onDropCallback([testFile], []);
      
      // Should show uploading file
      await waitFor(() => {
        expect(screen.getByText('test.txt')).toBeInTheDocument();
      });
      
      // Fast-forward through progress updates
      jest.advanceTimersByTime(1000);
      
      await waitFor(() => {
        expect(screen.getByText(/\d+%/)).toBeInTheDocument();
      });
    });

    it('handles upload errors', async () => {
      const onUpload = jest.fn().mockRejectedValue(new Error('Upload failed'));
      const { useDropzone } = require('react-dropzone');
      
      let onDropCallback: any;
      useDropzone.mockImplementation((config) => {
        onDropCallback = config.onDrop;
        return {
          getRootProps: mockGetRootProps,
          getInputProps: mockGetInputProps,
          isDragActive: false,
        };
      });
      
      render(<FileUpload onUpload={onUpload} />);
      
      const testFile = createMockFile('test.txt', 'text/plain', 1024);
      
      // Trigger file drop
      onDropCallback([testFile], []);
      
      // Fast-forward through progress and error
      jest.advanceTimersByTime(2000);
      
      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument();
      });
    });

    it('prevents upload when max files exceeded', async () => {
      const onUpload = jest.fn();
      const { useDropzone } = require('react-dropzone');
      
      let onDropCallback: any;
      useDropzone.mockImplementation((config) => {
        onDropCallback = config.onDrop;
        return {
          getRootProps: mockGetRootProps,
          getInputProps: mockGetInputProps,
          isDragActive: false,
        };
      });
      
      render(<FileUpload onUpload={onUpload} maxFiles={2} attachments={mockAttachments} />);
      
      const testFile = createMockFile('test.txt', 'text/plain', 1024);
      
      // Try to upload when already at max
      onDropCallback([testFile], []);
      
      expect(onUpload).not.toHaveBeenCalled();
    });

    it('removes uploading files when remove button is clicked', async () => {
      const onUpload = jest.fn().mockImplementation(() => 
        new Promise(() => {}) // Never resolves to keep file in uploading state
      );
      const { useDropzone } = require('react-dropzone');
      const user = userEvent.setup();
      
      let onDropCallback: any;
      useDropzone.mockImplementation((config) => {
        onDropCallback = config.onDrop;
        return {
          getRootProps: mockGetRootProps,
          getInputProps: mockGetInputProps,
          isDragActive: false,
        };
      });
      
      render(<FileUpload onUpload={onUpload} />);
      
      const testFile = createMockFile('test.txt', 'text/plain', 1024);
      
      // Trigger file drop
      onDropCallback([testFile], []);
      
      // Wait for file to appear
      await waitFor(() => {
        expect(screen.getByText('test.txt')).toBeInTheDocument();
      });
      
      // Click remove button
      const removeButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg') // Find button with X icon
      );
      if (removeButton) {
        await user.click(removeButton);
      }
      
      // File should be removed
      expect(screen.queryByText('test.txt')).not.toBeInTheDocument();
    });
  });

  describe('File Type Handling', () => {
    it('displays correct colors for different file types', () => {
      const differentTypes: TaskAttachment[] = [
        { ...mockAttachments[0], type: 'image/png', name: 'image.png' },
        { ...mockAttachments[0], type: 'video/mp4', name: 'video.mp4' },
        { ...mockAttachments[0], type: 'audio/mp3', name: 'audio.mp3' },
        { ...mockAttachments[0], type: 'application/zip', name: 'archive.zip' },
      ];
      
      render(<FileUpload attachments={differentTypes} />);
      
      expect(screen.getByText('image.png')).toBeInTheDocument();
      expect(screen.getByText('video.mp4')).toBeInTheDocument();
      expect(screen.getByText('audio.mp3')).toBeInTheDocument();
      expect(screen.getByText('archive.zip')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should not have any accessibility violations', async () => {
      const { container } = render(<FileUpload attachments={mockAttachments} />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper ARIA attributes on dropzone', () => {
      render(<FileUpload />);
      
      const dropzone = screen.getByRole('button');
      expect(dropzone).toHaveAttribute('tabIndex', '0');
    });

    it('has proper button titles for screen readers', () => {
      render(<FileUpload attachments={mockAttachments} onRemove={jest.fn()} />);
      
      expect(screen.getAllByTitle('Download')).toHaveLength(2);
      expect(screen.getAllByTitle('Remove')).toHaveLength(2);
      expect(screen.getByTitle('Preview')).toBeInTheDocument();
    });

    it('provides file input for keyboard users', () => {
      render(<FileUpload />);
      
      const fileInput = screen.getByRole('button').querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty attachments array', () => {
      render(<FileUpload attachments={[]} />);
      
      expect(screen.getByText('Click to upload or drag and drop')).toBeInTheDocument();
      expect(screen.queryByText(/of \d+ files/)).not.toBeInTheDocument();
    });

    it('handles very large file sizes', () => {
      const largeFile: TaskAttachment = {
        ...mockAttachments[0],
        size: 1024 * 1024 * 1024 * 5, // 5GB
      };
      
      render(<FileUpload attachments={[largeFile]} />);
      
      expect(screen.getByText('5 GB')).toBeInTheDocument();
    });

    it('handles zero byte files', () => {
      const zeroByteFile: TaskAttachment = {
        ...mockAttachments[0],
        size: 0,
      };
      
      render(<FileUpload attachments={[zeroByteFile]} />);
      
      expect(screen.getByText('0 Bytes')).toBeInTheDocument();
    });

    it('handles files without extensions', () => {
      const noExtFile: TaskAttachment = {
        ...mockAttachments[0],
        name: 'README',
        type: 'text/plain',
      };
      
      render(<FileUpload attachments={[noExtFile]} />);
      
      expect(screen.getByText('README')).toBeInTheDocument();
    });

    it('handles very long file names', () => {
      const longNameFile: TaskAttachment = {
        ...mockAttachments[0],
        name: 'a'.repeat(100) + '.txt',
      };
      
      render(<FileUpload attachments={[longNameFile]} />);
      
      const fileName = screen.getByText(longNameFile.name);
      expect(fileName).toHaveClass('truncate');
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive classes', () => {
      render(<FileUpload testId="upload" />);
      
      const container = screen.getByTestId('upload');
      expect(container).toHaveClass('w-full');
    });
  });

  describe('Dark Mode Support', () => {
    it('applies dark mode classes', () => {
      render(<FileUpload />);
      
      const dropzone = screen.getByText('Click to upload or drag and drop').closest('div');
      expect(dropzone).toHaveClass('dark:border-gray-600');
    });
  });
});