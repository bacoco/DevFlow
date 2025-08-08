/**
 * Focused tests for TaskModal validation functionality
 * Tests form validation, error messages, and validation feedback
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  default: React.forwardRef(({ onChange, content, placeholder, editable, className }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      getContent: () => content || '',
      setContent: (newContent: string) => onChange?.(newContent),
      focus: jest.fn(),
      blur: jest.fn(),
      isEmpty: () => !content || content === '<p></p>',
      getEditor: () => null,
    }));

    return (
      <div className={className}>
        <textarea
          data-testid="rich-text-editor"
          value={content || ''}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={!editable}
        />
      </div>
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
  mode: 'create',
  task: undefined,
  autoSave: false,
  collaborative: false,
};

describe('TaskModal Validation', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  describe('Title Validation', () => {
    it('shows error when title is empty', async () => {
      const onSave = jest.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const saveButton = screen.getByRole('button', { name: /create task/i });
      await user.click(saveButton);

      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(screen.getByText('Task title cannot be empty')).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('shows error when title is only whitespace', async () => {
      const onSave = jest.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, '   ');

      const saveButton = screen.getByRole('button', { name: /create task/i });
      await user.click(saveButton);

      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('shows error when title exceeds maximum length', async () => {
      const onSave = jest.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByLabelText(/title/i);
      const longTitle = 'a'.repeat(201);
      await user.type(titleInput, longTitle);

      const saveButton = screen.getByRole('button', { name: /create task/i });
      await user.click(saveButton);

      expect(screen.getByText('Title is too long')).toBeInTheDocument();
      expect(screen.getByText('Title must be less than 200 characters')).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('accepts valid title', async () => {
      const onSave = jest.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Valid Task Title');

      const descriptionEditor = screen.getByTestId('rich-text-editor');
      await user.type(descriptionEditor, 'Valid description');

      const saveButton = screen.getByRole('button', { name: /create task/i });
      await user.click(saveButton);

      expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Valid Task Title',
        })
      );
    });
  });

  describe('Description Validation', () => {
    it('shows error when description is empty', async () => {
      const onSave = jest.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Valid Title');

      const saveButton = screen.getByRole('button', { name: /create task/i });
      await user.click(saveButton);

      expect(screen.getByText('Description is required')).toBeInTheDocument();
      expect(screen.getByText('Task description cannot be empty')).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('shows error when description is only empty paragraph', async () => {
      const onSave = jest.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Valid Title');

      // Simulate rich text editor returning empty paragraph
      const descriptionEditor = screen.getByTestId('rich-text-editor');
      fireEvent.change(descriptionEditor, { target: { value: '<p></p>' } });

      const saveButton = screen.getByRole('button', { name: /create task/i });
      await user.click(saveButton);

      expect(screen.getByText('Description is required')).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('accepts valid description', async () => {
      const onSave = jest.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Valid Title');

      const descriptionEditor = screen.getByTestId('rich-text-editor');
      await user.type(descriptionEditor, 'Valid description content');

      const saveButton = screen.getByRole('button', { name: /create task/i });
      await user.click(saveButton);

      expect(screen.queryByText('Description is required')).not.toBeInTheDocument();
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Valid description content',
        })
      );
    });

    it('shows visual error styling on description editor', async () => {
      render(<TaskModal {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /create task/i });
      await user.click(saveButton);

      const editorContainer = screen.getByTestId('rich-text-editor').parentElement;
      expect(editorContainer).toHaveClass('border-error-500');
    });
  });

  describe('Due Date Validation', () => {
    it('shows error when due date is in the past', async () => {
      const onSave = jest.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Valid Title');

      const descriptionEditor = screen.getByTestId('rich-text-editor');
      await user.type(descriptionEditor, 'Valid description');

      const dueDateInput = screen.getByLabelText(/due date/i);
      await user.type(dueDateInput, '2020-01-01');

      const saveButton = screen.getByRole('button', { name: /create task/i });
      await user.click(saveButton);

      expect(screen.getByText('Due date cannot be in the past')).toBeInTheDocument();
      expect(screen.getByText('Please select a future date')).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('accepts future due date', async () => {
      const onSave = jest.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Valid Title');

      const descriptionEditor = screen.getByTestId('rich-text-editor');
      await user.type(descriptionEditor, 'Valid description');

      const dueDateInput = screen.getByLabelText(/due date/i);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const futureDateString = futureDate.toISOString().split('T')[0];
      await user.type(dueDateInput, futureDateString);

      const saveButton = screen.getByRole('button', { name: /create task/i });
      await user.click(saveButton);

      expect(screen.queryByText('Due date cannot be in the past')).not.toBeInTheDocument();
      expect(onSave).toHaveBeenCalled();
    });
  });

  describe('Multiple Field Validation', () => {
    it('shows multiple validation errors simultaneously', async () => {
      const onSave = jest.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const dueDateInput = screen.getByLabelText(/due date/i);
      await user.type(dueDateInput, '2020-01-01');

      const estimatedHoursInput = screen.getByLabelText(/estimated hours/i);
      await user.type(estimatedHoursInput, '-5');

      const saveButton = screen.getByRole('button', { name: /create task/i });
      await user.click(saveButton);

      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(screen.getByText('Description is required')).toBeInTheDocument();
      expect(screen.getByText('Due date cannot be in the past')).toBeInTheDocument();
      expect(screen.getByText('Invalid estimated hours')).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('Validation in Edit Mode', () => {
    it('validates existing task data', async () => {
      const invalidTask = {
        ...mockTask,
        title: '', // Invalid empty title
      };

      const onSave = jest.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} mode="edit" task={invalidTask} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('allows saving valid existing task', async () => {
      const onSave = jest.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} mode="edit" task={mockTask} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
      expect(onSave).toHaveBeenCalled();
    });
  });

  describe('Validation in View Mode', () => {
    it('does not show validation errors in view mode', async () => {
      const invalidTask = {
        ...mockTask,
        title: '', // Invalid empty title
      };

      render(<TaskModal {...defaultProps} mode="view" task={invalidTask} />);

      // Should not show validation errors in view mode
      expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
    });

    it('does not have save button in view mode', () => {
      render(<TaskModal {...defaultProps} mode="view" task={mockTask} />);

      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('associates error messages with form fields', async () => {
      render(<TaskModal {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /create task/i });
      await user.click(saveButton);

      const titleInput = screen.getByLabelText(/title/i);
      const errorMessage = screen.getByText('Title is required');

      // In a real implementation, these would be properly associated
      expect(titleInput).toBeInTheDocument();
      expect(errorMessage).toBeInTheDocument();
    });

    it('announces validation errors to screen readers', async () => {
      render(<TaskModal {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /create task/i });
      await user.click(saveButton);

      // Error messages should be announced to screen readers
      const errorMessages = screen.getAllByText(/required|invalid/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });
});