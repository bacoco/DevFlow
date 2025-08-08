/**
 * Rich Text Editor Component
 * A comprehensive rich text editor using TipTap with collaborative features
 */

import React, { forwardRef, useImperativeHandle, useCallback } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Mention from '@tiptap/extension-mention';
import { motion } from 'framer-motion';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Undo,
  Redo,
  CheckSquare,
  AtSign,
} from 'lucide-react';
import { Button } from './Button';

export interface RichTextEditorProps {
  content?: string;
  placeholder?: string;
  editable?: boolean;
  onChange?: (content: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
  testId?: string;
  mentions?: Array<{
    id: string;
    label: string;
    avatar?: string;
  }>;
  onMention?: (mention: { id: string; label: string }) => void;
  collaborative?: boolean;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export interface RichTextEditorRef {
  getContent: () => string;
  setContent: (content: string) => void;
  focus: () => void;
  blur: () => void;
  isEmpty: () => boolean;
  getEditor: () => Editor | null;
}

const ToolbarButton: React.FC<{
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  tooltip: string;
}> = ({ onClick, isActive, disabled, icon, tooltip }) => (
  <Button
    variant={isActive ? 'primary' : 'ghost'}
    size="sm"
    onClick={onClick}
    disabled={disabled}
    className="p-2 min-w-0"
    title={tooltip}
  >
    {icon}
  </Button>
);

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({
  content = '',
  placeholder = 'Start typing...',
  editable = true,
  onChange,
  onFocus,
  onBlur,
  className = '',
  testId,
  mentions = [],
  onMention,
  collaborative = false,
  autoSave = false,
  autoSaveDelay = 1000,
}, ref) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary-600 dark:text-primary-400 underline hover:text-primary-700 dark:hover:text-primary-300',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-1 py-0.5 rounded',
        },
        suggestion: {
          items: ({ query }) => {
            return mentions
              .filter(item => item.label.toLowerCase().startsWith(query.toLowerCase()))
              .slice(0, 5);
          },
          render: () => {
            let component: any;
            let popup: any;

            return {
              onStart: (props: any) => {
                component = new MentionList({
                  props,
                  editor: props.editor,
                });

                if (!props.clientRect) {
                  return;
                }

                // Note: In a real implementation, you would import and use tippy.js here
                // For now, we'll create a simple dropdown
                const dropdown = document.createElement('div');
                dropdown.className = 'mention-dropdown fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg';
                dropdown.appendChild(component.element);
                document.body.appendChild(dropdown);
                
                const rect = props.clientRect();
                dropdown.style.left = `${rect.left}px`;
                dropdown.style.top = `${rect.bottom + 5}px`;
                
                popup = [{ 
                  hide: () => dropdown.remove(),
                  destroy: () => dropdown.remove(),
                  setProps: () => {},
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                }];
              },

              onUpdate(props: any) {
                component.updateProps(props);

                if (!props.clientRect) {
                  return;
                }

                const rect = props.clientRect();
                const dropdown = document.querySelector('.mention-dropdown') as HTMLElement;
                if (dropdown) {
                  dropdown.style.left = `${rect.left}px`;
                  dropdown.style.top = `${rect.bottom + 5}px`;
                }
              },

              onKeyDown(props: any) {
                if (props.event.key === 'Escape') {
                  popup[0].hide();
                  return true;
                }

                return component.onKeyDown(props);
              },

              onExit() {
                popup[0].destroy();
                component.destroy();
              },
            };
          },
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
    },
    onFocus,
    onBlur,
  });

  // Auto-save functionality
  React.useEffect(() => {
    if (!autoSave || !editor || !onChange) return;

    const timeoutId = setTimeout(() => {
      const html = editor.getHTML();
      if (html !== content) {
        onChange(html);
      }
    }, autoSaveDelay);

    return () => clearTimeout(timeoutId);
  }, [editor?.getHTML(), autoSave, autoSaveDelay, onChange, content]);

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    getContent: () => editor?.getHTML() || '',
    setContent: (newContent: string) => {
      editor?.commands.setContent(newContent);
    },
    focus: () => {
      editor?.commands.focus();
    },
    blur: () => {
      editor?.commands.blur();
    },
    isEmpty: () => editor?.isEmpty || true,
    getEditor: () => editor,
  }), [editor]);

  const setLink = useCallback(() => {
    const previousUrl = editor?.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  const containerClasses = [
    'border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden',
    'focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500',
    'bg-white dark:bg-gray-800',
    className,
  ].filter(Boolean).join(' ');

  return (
    <motion.div
      className={containerClasses}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      data-testid={testId}
    >
      {/* Toolbar */}
      {editable && (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          {/* Text formatting */}
          <div className="flex items-center gap-1 pr-2 border-r border-gray-200 dark:border-gray-700">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              disabled={!editor.can().chain().focus().toggleBold().run()}
              icon={<Bold className="w-4 h-4" />}
              tooltip="Bold"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
              icon={<Italic className="w-4 h-4" />}
              tooltip="Italic"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              disabled={!editor.can().chain().focus().toggleStrike().run()}
              icon={<Strikethrough className="w-4 h-4" />}
              tooltip="Strikethrough"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive('code')}
              disabled={!editor.can().chain().focus().toggleCode().run()}
              icon={<Code className="w-4 h-4" />}
              tooltip="Inline Code"
            />
          </div>

          {/* Lists */}
          <div className="flex items-center gap-1 pr-2 border-r border-gray-200 dark:border-gray-700">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              icon={<List className="w-4 h-4" />}
              tooltip="Bullet List"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              icon={<ListOrdered className="w-4 h-4" />}
              tooltip="Numbered List"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              isActive={editor.isActive('taskList')}
              icon={<CheckSquare className="w-4 h-4" />}
              tooltip="Task List"
            />
          </div>

          {/* Block formatting */}
          <div className="flex items-center gap-1 pr-2 border-r border-gray-200 dark:border-gray-700">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              icon={<Quote className="w-4 h-4" />}
              tooltip="Quote"
            />
            <ToolbarButton
              onClick={setLink}
              isActive={editor.isActive('link')}
              icon={<LinkIcon className="w-4 h-4" />}
              tooltip="Link"
            />
          </div>

          {/* History */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().chain().focus().undo().run()}
              icon={<Undo className="w-4 h-4" />}
              tooltip="Undo"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().chain().focus().redo().run()}
              icon={<Redo className="w-4 h-4" />}
              tooltip="Redo"
            />
          </div>

          {/* Collaborative indicator */}
          {collaborative && (
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Live</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Editor content */}
      <div className="prose prose-sm dark:prose-invert max-w-none p-4 min-h-[120px] focus-within:outline-none">
        <EditorContent
          editor={editor}
          className="focus:outline-none [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:min-h-[80px]"
        />
      </div>
    </motion.div>
  );
});

// Mention list component for autocomplete
class MentionList {
  items: Array<{ id: string; label: string; avatar?: string }>;
  command: any;
  element: HTMLElement;
  selectedIndex: number;

  constructor({ items, command, editor }: any) {
    this.items = items;
    this.command = command;
    this.selectedIndex = 0;

    this.element = document.createElement('div');
    this.element.className = 'mention-list bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-1 max-h-40 overflow-y-auto';

    this.render();
  }

  updateProps({ items, command }: any) {
    this.items = items;
    this.command = command;
    this.selectedIndex = 0;
    this.render();
  }

  render() {
    this.element.innerHTML = '';

    this.items.forEach((item, index) => {
      const button = document.createElement('button');
      button.className = `mention-item w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
        index === this.selectedIndex ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-gray-100'
      }`;
      button.innerHTML = `
        <div class="flex items-center gap-2">
          ${item.avatar ? `<img src="${item.avatar}" alt="${item.label}" class="w-6 h-6 rounded-full">` : `<div class="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-medium">${item.label.charAt(0).toUpperCase()}</div>`}
          <span>${item.label}</span>
        </div>
      `;

      button.addEventListener('click', () => {
        this.selectItem(index);
      });

      this.element.appendChild(button);
    });
  }

  onKeyDown({ event }: any) {
    if (event.key === 'ArrowUp') {
      this.upHandler();
      return true;
    }

    if (event.key === 'ArrowDown') {
      this.downHandler();
      return true;
    }

    if (event.key === 'Enter') {
      this.enterHandler();
      return true;
    }

    return false;
  }

  upHandler() {
    this.selectedIndex = ((this.selectedIndex + this.items.length) - 1) % this.items.length;
    this.render();
  }

  downHandler() {
    this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
    this.render();
  }

  enterHandler() {
    this.selectItem(this.selectedIndex);
  }

  selectItem(index: number) {
    const item = this.items[index];

    if (item) {
      this.command({ id: item.id, label: item.label });
    }
  }

  destroy() {
    this.element.remove();
  }
}

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;