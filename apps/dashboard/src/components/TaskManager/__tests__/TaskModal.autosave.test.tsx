/**
 * Focused tests for TaskModal auto-save functionality
 * Tests auto-save behavior, debouncing, error handling, and offline scenarios
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskModal from '../TaskModal';
import { Task, TaskUser, TaskModalProps } from '../../../types/design-system';

// Mock dependencies
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

jest.mock('../../../components/ui/Modal', () => ({
  Modal: ({ children, isOpen, title, footer }: any) => 
    isOpen ? (
      <div data-testid="modal">
        <div data-testid="modal-title">{title}</div>
        <div data-testid="modal-content">{children}</div>
        <div data-testid="modal-footer">{footer}</div>
      </div>
    ) : null,
}));

jest.mock('../../../components/ui/RichTextEditor', () => ({
  __esModule: true,
  default: React.forwardRef(({ onChange, content, placeholder, editable }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      getContent: () => content || '',
      setContent: (newContent: string) => onChange?.(newContent),
      focus: jest.fn(),
      blur: jest.fn(),
      isEmpty: () => !content || content === '<p></p>',
      getEditor: () => null,
    }));

    return (
      <textarea
        data-testid="rich-text-editor"
        value={content || ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={!editable}
      />
    );
  }),
}));

// Mock other components
jest.mock('../../../components/ui/FileUpload', () => ({
  __esModule: true,
  default: () => <div data-testid="file-upload">File Upload</div>,
}));

jest.mock('../TaskComments', () => ({
  __esModule: true,
  default: () => <div data-testid="task-comments">Comments</div>,
}));

jest.mock('../TaskDependencies', () => ({
  __esModule: true,
  default: () => <div data-testid="task-dependencies">Dependencies</div>,
}));

const mockUser: TaskUser = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
};

const mockTask: Task = {
  id: 'task-1',
  title: 'Test Task',
  description: 'Test description',
  status: 'todo',
  priority: 'medium',
  assignee: mockUser,
  tags: ['test'],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
};

const defaultProps: TaskModalProps = {
  isOpen: true,
  onClose: jest.fn(),
  onSave: jest.fn(),
  mode: 'edit',
  task: mockTask,
  autoSave: true,
  collaborative: false,
};

describe('TaskModal Auto-save', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Auto-save Triggering', () => {
    it('triggers auto-save after title change', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByDisplayValue('Test Task');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Task');

      // Should show unsaved changes immediately
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();

      // Fast-forward to trigger auto-save
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Updated Task',
          })
        );
      });
    });

    it('triggers auto-save after description change', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const descriptionEditor = screen.getByTestId('rich-text-editor');
      await user.clear(descriptionEditor);
      await user.type(descriptionEditor, 'Updated description');

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            description: 'Updated description',
          })
        );
      });
    });
  });

  describe('Auto-save Status Indicators', () => {
    it('shows saving status during auto-save', async () => {
      const onSave = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 500))
      );
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByDisplayValue('Test Task');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Task');

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Should show saving status
      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });

      // Complete the save
      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
      });
    });

    it('shows saved status after successful save', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByDisplayValue('Test Task');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Task');

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText(/Saved/)).toBeInTheDocument();
      });
    });

    it('shows error status after failed save', async () => {
      const onSave = jest.fn().mockRejectedValue(new Error('Save failed'));
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByDisplayValue('Test Task');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Task');

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument();
      });
    });
  });

  describe('Offline Behavior', () => {
    it('does not auto-save when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const onSave = jest.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByDisplayValue('Test Task');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Task');

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('shows offline indicator', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<TaskModal {...defaultProps} />);

      expect(screen.getByText('Offline')).toBeInTheDocument();
    });
  });

  describe('Content Change Detection', () => {
    it('does not save if content has not changed', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      // Trigger auto-save without making changes
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('View Mode Behavior', () => {
    it('does not auto-save in view mode', async () => {
      const onSave = jest.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} mode="view" />);

      // Try to trigger auto-save (though inputs should be disabled)
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(onSave).not.toHaveBeenCalled();
    });
  });
});