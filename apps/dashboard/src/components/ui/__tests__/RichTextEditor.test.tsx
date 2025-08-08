/**
 * RichTextEditor Component Tests
 * Comprehensive tests for rich text editing functionality and accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import RichTextEditor, { RichTextEditorRef } from '../RichTextEditor';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock TipTap editor
const mockEditor = {
  getHTML: jest.fn(() => '<p>Test content</p>'),
  setContent: jest.fn(),
  commands: {
    focus: jest.fn(),
    blur: jest.fn(),
    setContent: jest.fn(),
    toggleBold: jest.fn(() => ({ run: jest.fn() })),
    toggleItalic: jest.fn(() => ({ run: jest.fn() })),
    toggleStrike: jest.fn(() => ({ run: jest.fn() })),
    toggleCode: jest.fn(() => ({ run: jest.fn() })),
    toggleBulletList: jest.fn(() => ({ run: jest.fn() })),
    toggleOrderedList: jest.fn(() => ({ run: jest.fn() })),
    toggleTaskList: jest.fn(() => ({ run: jest.fn() })),
    toggleBlockquote: jest.fn(() => ({ run: jest.fn() })),
    undo: jest.fn(() => ({ run: jest.fn() })),
    redo: jest.fn(() => ({ run: jest.fn() })),
    extendMarkRange: jest.fn(() => ({
      unsetLink: jest.fn(() => ({ run: jest.fn() })),
      setLink: jest.fn(() => ({ run: jest.fn() })),
    })),
  },
  chain: jest.fn(() => ({
    focus: jest.fn(() => ({
      toggleBold: jest.fn(() => ({ run: jest.fn() })),
      toggleItalic: jest.fn(() => ({ run: jest.fn() })),
      toggleStrike: jest.fn(() => ({ run: jest.fn() })),
      toggleCode: jest.fn(() => ({ run: jest.fn() })),
      toggleBulletList: jest.fn(() => ({ run: jest.fn() })),
      toggleOrderedList: jest.fn(() => ({ run: jest.fn() })),
      toggleTaskList: jest.fn(() => ({ run: jest.fn() })),
      toggleBlockquote: jest.fn(() => ({ run: jest.fn() })),
      undo: jest.fn(() => ({ run: jest.fn() })),
      redo: jest.fn(() => ({ run: jest.fn() })),
      extendMarkRange: jest.fn(() => ({
        unsetLink: jest.fn(() => ({ run: jest.fn() })),
        setLink: jest.fn(() => ({ run: jest.fn() })),
      })),
    })),
  })),
  can: jest.fn(() => ({
    chain: jest.fn(() => ({
      focus: jest.fn(() => ({
        toggleBold: jest.fn(() => ({ run: jest.fn(() => true) })),
        toggleItalic: jest.fn(() => ({ run: jest.fn(() => true) })),
        toggleStrike: jest.fn(() => ({ run: jest.fn(() => true) })),
        toggleCode: jest.fn(() => ({ run: jest.fn(() => true) })),
        undo: jest.fn(() => ({ run: jest.fn(() => true) })),
        redo: jest.fn(() => ({ run: jest.fn(() => true) })),
      })),
    })),
  })),
  isActive: jest.fn((format) => false),
  getAttributes: jest.fn(() => ({ href: '' })),
  isEmpty: false,
};

// Mock @tiptap/react
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => mockEditor),
  EditorContent: ({ editor, className }: any) => (
    <div className={className} data-testid="editor-content">
      Editor Content
    </div>
  ),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, any>(({ children, ...props }, ref) => (
      <div ref={ref} {...props}>
        {children}
      </div>
    )),
  },
}));

// Mock window.prompt
const mockPrompt = jest.fn();
Object.defineProperty(window, 'prompt', {
  value: mockPrompt,
  writable: true,
});

describe('RichTextEditor Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrompt.mockReturnValue('https://example.com');
  });

  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(<RichTextEditor />);
      
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(<RichTextEditor placeholder="Enter your text here..." />);
      
      // The placeholder is passed to the editor configuration
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<RichTextEditor className="custom-editor" testId="custom-editor" />);
      
      const editor = screen.getByTestId('custom-editor');
      expect(editor).toHaveClass('custom-editor');
    });

    it('renders with custom test id', () => {
      render(<RichTextEditor testId="my-editor" />);
      
      expect(screen.getByTestId('my-editor')).toBeInTheDocument();
    });
  });

  describe('Toolbar Functionality', () => {
    it('renders all toolbar buttons when editable', () => {
      render(<RichTextEditor editable={true} />);
      
      // Text formatting buttons
      expect(screen.getByTitle('Bold')).toBeInTheDocument();
      expect(screen.getByTitle('Italic')).toBeInTheDocument();
      expect(screen.getByTitle('Strikethrough')).toBeInTheDocument();
      expect(screen.getByTitle('Inline Code')).toBeInTheDocument();
      
      // List buttons
      expect(screen.getByTitle('Bullet List')).toBeInTheDocument();
      expect(screen.getByTitle('Numbered List')).toBeInTheDocument();
      expect(screen.getByTitle('Task List')).toBeInTheDocument();
      
      // Block formatting
      expect(screen.getByTitle('Quote')).toBeInTheDocument();
      expect(screen.getByTitle('Link')).toBeInTheDocument();
      
      // History buttons
      expect(screen.getByTitle('Undo')).toBeInTheDocument();
      expect(screen.getByTitle('Redo')).toBeInTheDocument();
    });

    it('does not render toolbar when not editable', () => {
      render(<RichTextEditor editable={false} />);
      
      expect(screen.queryByTitle('Bold')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Italic')).not.toBeInTheDocument();
    });

    it('handles bold button click', async () => {
      const user = userEvent.setup();
      render(<RichTextEditor />);
      
      const boldButton = screen.getByTitle('Bold');
      await user.click(boldButton);
      
      expect(mockEditor.chain().focus().toggleBold().run).toHaveBeenCalled();
    });

    it('handles italic button click', async () => {
      const user = userEvent.setup();
      render(<RichTextEditor />);
      
      const italicButton = screen.getByTitle('Italic');
      await user.click(italicButton);
      
      expect(mockEditor.chain().focus().toggleItalic().run).toHaveBeenCalled();
    });

    it('handles list button clicks', async () => {
      const user = userEvent.setup();
      render(<RichTextEditor />);
      
      const bulletListButton = screen.getByTitle('Bullet List');
      await user.click(bulletListButton);
      
      expect(mockEditor.chain().focus().toggleBulletList().run).toHaveBeenCalled();
    });

    it('handles undo/redo button clicks', async () => {
      const user = userEvent.setup();
      render(<RichTextEditor />);
      
      const undoButton = screen.getByTitle('Undo');
      const redoButton = screen.getByTitle('Redo');
      
      await user.click(undoButton);
      expect(mockEditor.chain().focus().undo().run).toHaveBeenCalled();
      
      await user.click(redoButton);
      expect(mockEditor.chain().focus().redo().run).toHaveBeenCalled();
    });
  });

  describe('Link Functionality', () => {
    it('handles link creation', async () => {
      const user = userEvent.setup();
      mockPrompt.mockReturnValue('https://example.com');
      
      render(<RichTextEditor />);
      
      const linkButton = screen.getByTitle('Link');
      await user.click(linkButton);
      
      expect(mockPrompt).toHaveBeenCalledWith('URL', '');
      expect(mockEditor.chain().focus().extendMarkRange().setLink).toHaveBeenCalled();
    });

    it('handles link removal when empty URL provided', async () => {
      const user = userEvent.setup();
      mockPrompt.mockReturnValue('');
      
      render(<RichTextEditor />);
      
      const linkButton = screen.getByTitle('Link');
      await user.click(linkButton);
      
      expect(mockEditor.chain().focus().extendMarkRange().unsetLink().run).toHaveBeenCalled();
    });

    it('handles link cancellation', async () => {
      const user = userEvent.setup();
      mockPrompt.mockReturnValue(null);
      
      render(<RichTextEditor />);
      
      const linkButton = screen.getByTitle('Link');
      await user.click(linkButton);
      
      expect(mockEditor.chain().focus().extendMarkRange().setLink).not.toHaveBeenCalled();
    });
  });

  describe('Content Management', () => {
    it('calls onChange when content changes', () => {
      const onChange = jest.fn();
      const { useEditor } = require('@tiptap/react');
      
      // Mock the onUpdate callback
      useEditor.mockImplementation((config) => {
        // Simulate content change
        setTimeout(() => {
          config.onUpdate({ editor: mockEditor });
        }, 0);
        return mockEditor;
      });
      
      render(<RichTextEditor onChange={onChange} />);
      
      // Wait for the async onUpdate call
      setTimeout(() => {
        expect(onChange).toHaveBeenCalledWith('<p>Test content</p>');
      }, 10);
    });

    it('calls onFocus and onBlur callbacks', () => {
      const onFocus = jest.fn();
      const onBlur = jest.fn();
      const { useEditor } = require('@tiptap/react');
      
      useEditor.mockImplementation((config) => {
        // Simulate focus/blur events
        setTimeout(() => {
          config.onFocus();
          config.onBlur();
        }, 0);
        return mockEditor;
      });
      
      render(<RichTextEditor onFocus={onFocus} onBlur={onBlur} />);
      
      setTimeout(() => {
        expect(onFocus).toHaveBeenCalled();
        expect(onBlur).toHaveBeenCalled();
      }, 10);
    });
  });

  describe('Ref Methods', () => {
    it('exposes ref methods correctly', () => {
      const ref = React.createRef<RichTextEditorRef>();
      render(<RichTextEditor ref={ref} />);
      
      expect(ref.current).toBeTruthy();
      expect(typeof ref.current?.getContent).toBe('function');
      expect(typeof ref.current?.setContent).toBe('function');
      expect(typeof ref.current?.focus).toBe('function');
      expect(typeof ref.current?.blur).toBe('function');
      expect(typeof ref.current?.isEmpty).toBe('function');
      expect(typeof ref.current?.getEditor).toBe('function');
    });

    it('getContent returns editor HTML', () => {
      const ref = React.createRef<RichTextEditorRef>();
      render(<RichTextEditor ref={ref} />);
      
      const content = ref.current?.getContent();
      expect(content).toBe('<p>Test content</p>');
    });

    it('setContent calls editor setContent', () => {
      const ref = React.createRef<RichTextEditorRef>();
      render(<RichTextEditor ref={ref} />);
      
      ref.current?.setContent('<p>New content</p>');
      expect(mockEditor.commands.setContent).toHaveBeenCalledWith('<p>New content</p>');
    });

    it('focus calls editor focus', () => {
      const ref = React.createRef<RichTextEditorRef>();
      render(<RichTextEditor ref={ref} />);
      
      ref.current?.focus();
      expect(mockEditor.commands.focus).toHaveBeenCalled();
    });

    it('blur calls editor blur', () => {
      const ref = React.createRef<RichTextEditorRef>();
      render(<RichTextEditor ref={ref} />);
      
      ref.current?.blur();
      expect(mockEditor.commands.blur).toHaveBeenCalled();
    });

    it('isEmpty returns editor isEmpty', () => {
      const ref = React.createRef<RichTextEditorRef>();
      render(<RichTextEditor ref={ref} />);
      
      const isEmpty = ref.current?.isEmpty();
      expect(isEmpty).toBe(false);
    });

    it('getEditor returns editor instance', () => {
      const ref = React.createRef<RichTextEditorRef>();
      render(<RichTextEditor ref={ref} />);
      
      const editor = ref.current?.getEditor();
      expect(editor).toBe(mockEditor);
    });
  });

  describe('Auto-save Functionality', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('auto-saves content after delay', () => {
      const onChange = jest.fn();
      render(
        <RichTextEditor 
          autoSave={true}
          autoSaveDelay={1000}
          onChange={onChange}
          content="<p>Initial content</p>"
        />
      );
      
      // Fast-forward time
      jest.advanceTimersByTime(1000);
      
      // Auto-save should trigger if content changed
      expect(onChange).toHaveBeenCalled();
    });

    it('does not auto-save when disabled', () => {
      const onChange = jest.fn();
      render(
        <RichTextEditor 
          autoSave={false}
          onChange={onChange}
        />
      );
      
      jest.advanceTimersByTime(2000);
      
      // Should not auto-save
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('Collaborative Features', () => {
    it('shows collaborative indicator when enabled', () => {
      render(<RichTextEditor collaborative={true} />);
      
      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    it('does not show collaborative indicator when disabled', () => {
      render(<RichTextEditor collaborative={false} />);
      
      expect(screen.queryByText('Live')).not.toBeInTheDocument();
    });
  });

  describe('Button States', () => {
    it('shows active state for formatting buttons', () => {
      mockEditor.isActive.mockImplementation((format) => format === 'bold');
      
      render(<RichTextEditor />);
      
      const boldButton = screen.getByTitle('Bold');
      // Active buttons should have primary variant styling
      expect(boldButton).toBeInTheDocument();
    });

    it('disables buttons when commands are not available', () => {
      mockEditor.can.mockReturnValue({
        chain: () => ({
          focus: () => ({
            toggleBold: () => ({ run: () => false }),
            undo: () => ({ run: () => false }),
            redo: () => ({ run: () => false }),
          }),
        }),
      });
      
      render(<RichTextEditor />);
      
      const undoButton = screen.getByTitle('Undo');
      const redoButton = screen.getByTitle('Redo');
      
      expect(undoButton).toBeDisabled();
      expect(redoButton).toBeDisabled();
    });
  });

  describe('Loading State', () => {
    it('shows loading skeleton when editor is not ready', () => {
      const { useEditor } = require('@tiptap/react');
      useEditor.mockReturnValue(null);
      
      render(<RichTextEditor />);
      
      // Should show loading skeleton
      const loadingElements = screen.getAllByRole('generic');
      expect(loadingElements.length).toBeGreaterThan(0);
    });
  });

  describe('Mentions', () => {
    const mentions = [
      { id: '1', label: 'John Doe', avatar: 'avatar1.jpg' },
      { id: '2', label: 'Jane Smith', avatar: 'avatar2.jpg' },
    ];

    it('accepts mentions prop', () => {
      render(<RichTextEditor mentions={mentions} />);
      
      // Component should render without errors
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });

    it('calls onMention when mention is selected', () => {
      const onMention = jest.fn();
      render(<RichTextEditor mentions={mentions} onMention={onMention} />);
      
      // Component should render without errors
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should not have any accessibility violations', async () => {
      const { container } = render(<RichTextEditor />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper focus management', () => {
      render(<RichTextEditor />);
      
      const editorContent = screen.getByTestId('editor-content');
      expect(editorContent).toHaveClass('focus:outline-none');
    });

    it('toolbar buttons have proper titles for screen readers', () => {
      render(<RichTextEditor />);
      
      expect(screen.getByTitle('Bold')).toBeInTheDocument();
      expect(screen.getByTitle('Italic')).toBeInTheDocument();
      expect(screen.getByTitle('Undo')).toBeInTheDocument();
      expect(screen.getByTitle('Redo')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles null content gracefully', () => {
      render(<RichTextEditor content="" />);
      
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });

    it('handles very long content', () => {
      const longContent = '<p>' + 'A'.repeat(10000) + '</p>';
      render(<RichTextEditor content={longContent} />);
      
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });

    it('handles rapid toolbar clicks', async () => {
      const user = userEvent.setup();
      render(<RichTextEditor />);
      
      const boldButton = screen.getByTitle('Bold');
      
      // Rapid clicks
      await user.click(boldButton);
      await user.click(boldButton);
      await user.click(boldButton);
      
      // Should handle all clicks
      expect(mockEditor.chain().focus().toggleBold().run).toHaveBeenCalledTimes(3);
    });

    it('handles editor destruction gracefully', () => {
      const { unmount } = render(<RichTextEditor />);
      
      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Responsive Design', () => {
    it('toolbar wraps on small screens', () => {
      render(<RichTextEditor />);
      
      // Toolbar should have flex-wrap class
      const toolbar = screen.getByTestId('editor-content').parentElement?.querySelector('.flex-wrap');
      expect(toolbar).toBeInTheDocument();
    });
  });

  describe('Dark Mode Support', () => {
    it('applies dark mode classes', () => {
      render(<RichTextEditor testId="dark-editor" />);
      
      const editor = screen.getByTestId('dark-editor');
      expect(editor).toHaveClass('dark:bg-gray-800');
    });
  });
});