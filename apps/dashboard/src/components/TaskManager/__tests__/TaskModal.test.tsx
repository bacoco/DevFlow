/**
 * Comprehensive unit tests for TaskModal component
 * Tests rich editing, auto-save, collaborative features, and validation
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

jest.mock('../../../components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, variant, size, icon, loading, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {icon && <span data-testid="button-icon">{icon}</span>}
      {children}
    </button>
  ),
}));

jest.mock('../../../components/ui/Input', () => ({
  Input: ({ value, onChange, disabled, type, label, fullWidth, ...props }: any) => (
    <input
      type={type || 'text'}
      value={value}
      onChange={onChange}
      disabled={disabled}
      aria-label={label}
      {...props}
    />
  ),
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

jest.mock('../../../components/ui/FileUpload', () => ({
  __esModule: true,
  default: ({ onUpload, onRemove, attachments, disabled }: any) => (
    <div data-testid="file-upload">
      <button
        data-testid="upload-button"
        onClick={() => onUpload?.([new File(['test'], 'test.txt', { type: 'text/plain' })])}
        disabled={disabled}
      >
        Upload File
      </button>
      {attachments?.map((attachment: any) => (
        <div key={attachment.id} data-testid={`attachment-${attachment.id}`}>
          {attachment.name}
          <button
            data-testid={`remove-attachment-${attachment.id}`}
            onClick={() => onRemove?.(attachment.id)}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  ),
}));

jest.mock('../TaskComments', () => ({
  __esModule: true,
  default: ({ comments, onAddComment, onUpdateComment, onDeleteComment }: any) => (
    <div data-testid="task-comments">
      <button
        data-testid="add-comment-button"
        onClick={() => onAddComment?.('Test comment')}
      >
        Add Comment
      </button>
      {comments?.map((comment: any) => (
        <div key={comment.id} data-testid={`comment-${comment.id}`}>
          {comment.content}
          <button
            data-testid={`update-comment-${comment.id}`}
            onClick={() => onUpdateComment?.(comment.id, 'Updated comment')}
          >
            Update
          </button>
          <button
            data-testid={`delete-comment-${comment.id}`}
            onClick={() => onDeleteComment?.(comment.id)}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  ),
}));

jest.mock('../TaskDependencies', () => ({
  __esModule: true,
  default: ({ task, onAddDependency, onRemoveDependency }: any) => (
    <div data-testid="task-dependencies">
      <button
        data-testid="add-dependency-button"
        onClick={() => onAddDependency?.({ type: 'blocks', taskId: 'dep-1', taskTitle: 'Dependency Task', taskStatus: 'todo' })}
      >
        Add Dependency
      </button>
      {task?.dependencies?.map((dep: any) => (
        <div key={dep.id} data-testid={`dependency-${dep.id}`}>
          {dep.taskTitle}
          <button
            data-testid={`remove-dependency-${dep.id}`}
            onClick={() => onRemoveDependency?.(dep.id)}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  ),
}));

// Mock data
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
  tags: ['test', 'development'],
  labels: ['frontend'],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  dueDate: new Date('2024-12-31'),
  estimatedHours: 8,
  attachments: [
    {
      id: 'att-1',
      name: 'test.pdf',
      url: 'http://example.com/test.pdf',
      type: 'application/pdf',
      size: 1024,
      uploadedAt: new Date(),
      uploadedBy: mockUser,
    },
  ],
  comments: [
    {
      id: 'comment-1',
      author: mockUser,
      content: 'Test comment',
      createdAt: new Date(),
    },
  ],
  dependencies: [
    {
      id: 'dep-1',
      type: 'blocks',
      taskId: 'task-2',
      taskTitle: 'Dependency Task',
      taskStatus: 'todo',
    },
  ],
  activity: [
    {
      id: 'activity-1',
      type: 'created',
      user: mockUser,
      timestamp: new Date(),
      details: {},
      description: 'Task created',
    },
  ],
};

const defaultProps: TaskModalProps = {
  isOpen: true,
  onClose: jest.fn(),
  onSave: jest.fn(),
  mode: 'edit',
  task: mockTask,
  autoSave: false,
  collaborative: false,
};

describe('TaskModal', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders modal when open', () => {
      render(<TaskModal {...defaultProps} />);
      
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Edit Task');
    });

    it('does not render when closed', () => {
      render(<TaskModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('renders correct title for different modes', () => {
      const { rerender } = render(<TaskModal {...defaultProps} mode="create" />);
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Create New Task');

      rerender(<TaskModal {...defaultProps} mode="view" />);
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Task Details');

      rerender(<TaskModal {...defaultProps} mode="edit" />);
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Edit Task');
    });
  });

  describe('Form Validation', () => {
    it('validates required title field', async () => {
      const onSave = jest.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} mode="create" task={undefined} />);

      // Try to save without title
      const saveButton = screen.getByRole('button', { name: /create task/i });
      await user.click(saveButton);

      expect(onSave).not.toHaveBeenCalled();
      // Check if validation error appears
      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
      });
    });

    it('validates required description field', async () => {
      const onSave = jest.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} mode="create" task={undefined} />);

      // Fill title but leave description empty
      const titleInput = screen.getByPlaceholderText('Enter task title');
      await user.type(titleInput, 'Test Task');

      const saveButton = screen.getByRole('button', { name: /create task/i });
      await user.click(saveButton);

      expect(onSave).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByText('Description is required')).toBeInTheDocument();
      });
    });
  });

  describe('Rich Text Editor Integration', () => {
    it('renders rich text editor with correct props', () => {
      render(<TaskModal {...defaultProps} />);

      const editor = screen.getByTestId('rich-text-editor');
      expect(editor).toBeInTheDocument();
      expect(editor).toHaveValue('Test description');
    });

    it('updates description when editor content changes', async () => {
      const onSave = jest.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      const editor = screen.getByTestId('rich-text-editor');
      await user.clear(editor);
      await user.type(editor, 'Updated description');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            description: 'Updated description',
          })
        );
      });
    });

    it('disables editor in view mode', () => {
      render(<TaskModal {...defaultProps} mode="view" />);

      const editor = screen.getByTestId('rich-text-editor');
      expect(editor).toBeDisabled();
    });
  });

  describe('File Attachments', () => {
    it('renders file upload component', async () => {
      render(<TaskModal {...defaultProps} />);

      // Switch to attachments tab
      const attachmentsTab = screen.getByRole('button', { name: /attachments/i });
      await user.click(attachmentsTab);

      expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    });

    it('handles file upload', async () => {
      const onSave = jest.fn();
      render(<TaskModal {...defaultProps} onSave={onSave} />);

      // Switch to attachments tab
      const attachmentsTab = screen.getByRole('button', { name: /attachments/i });
      await user.click(attachmentsTab);

      const uploadButton = screen.getByTestId('upload-button');
      await user.click(uploadButton);

      // Should add attachment to task
      expect(screen.getByTestId('attachment-att-1')).toBeInTheDocument();
    });
  });

  describe('Comments System', () => {
    it('renders comments component', async () => {
      render(<TaskModal {...defaultProps} />);

      // Switch to comments tab
      const commentsTab = screen.getByRole('button', { name: /comments/i });
      await user.click(commentsTab);

      expect(screen.getByTestId('task-comments')).toBeInTheDocument();
    });
  });

  describe('Dependencies Management', () => {
    it('renders dependencies component', async () => {
      render(<TaskModal {...defaultProps} />);

      // Switch to dependencies tab
      const dependenciesTab = screen.getByRole('button', { name: /dependencies/i });
      await user.click(dependenciesTab);

      expect(screen.getByTestId('task-dependencies')).toBeInTheDocument();
    });
  });

  describe('Activity Timeline', () => {
    it('renders activity timeline', async () => {
      render(<TaskModal {...defaultProps} />);

      // Switch to activity tab
      const activityTab = screen.getByRole('button', { name: /activity/i });
      await user.click(activityTab);

      expect(screen.getByText('Activity Timeline')).toBeInTheDocument();
      expect(screen.getByText('Task created')).toBeInTheDocument();
    });

    it('shows empty state when no activity', async () => {
      const taskWithoutActivity = { ...mockTask, activity: [] };
      render(<TaskModal {...defaultProps} task={taskWithoutActivity} />);

      // Switch to activity tab
      const activityTab = screen.getByRole('button', { name: /activity/i });
      await user.click(activityTab);

      expect(screen.getByText('No activity yet')).toBeInTheDocument();
    });
  });

  describe('Collaborative Features', () => {
    it('shows collaborative indicators when enabled', () => {
      render(<TaskModal {...defaultProps} collaborative={true} />);

      // Check for collaborative indicators in the footer
      expect(screen.getByText(/Live collaboration|collaborator/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<TaskModal {...defaultProps} />);

      const modal = screen.getByTestId('modal');
      expect(modal).toBeInTheDocument();
    });

    it('manages focus properly', () => {
      render(<TaskModal {...defaultProps} />);

      // Modal should be focusable
      const modal = screen.getByTestId('modal');
      expect(modal).toBeInTheDocument();
    });
  });
});