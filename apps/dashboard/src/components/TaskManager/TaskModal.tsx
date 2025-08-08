import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  User,
  Tag,
  AlertCircle,
  Save,
  Clock,
  Paperclip,
  MessageCircle,
  GitBranch,
  Star,
  StarOff,
  Eye,
  EyeOff,
  Users,
  Target,
  CheckCircle,
  Activity,
  History,
  Wifi,
  WifiOff,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { Task, TaskUser, TaskAttachment, TaskComment, TaskDependency, TaskModalProps } from '../../types/design-system';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import RichTextEditor, { RichTextEditorRef } from '../ui/RichTextEditor';
import FileUpload from '../ui/FileUpload';
import TaskComments from './TaskComments';
import TaskDependencies from './TaskDependencies';

// Mock data for development
const mockUsers: TaskUser[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', avatar: undefined },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', avatar: undefined },
  { id: '3', name: 'Mike Johnson', email: 'mike@example.com', avatar: undefined },
];

const mockCurrentUser: TaskUser = mockUsers[0];

const TaskModal: React.FC<TaskModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  task, 
  mode,
  autoSave = false,
  collaborative = false 
}) => {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignee: undefined,
    dueDate: undefined,
    tags: [],
    estimatedHours: undefined,
    labels: [],
    watchers: [],
  });
  
  const [activeTab, setActiveTab] = useState<'details' | 'attachments' | 'comments' | 'dependencies' | 'activity'>('details');
  const [tagInput, setTagInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [collaborators, setCollaborators] = useState<TaskUser[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  const descriptionEditorRef = useRef<RichTextEditorRef>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastAutoSaveRef = useRef<string>('');
  const collaborativeTimeoutRef = useRef<NodeJS.Timeout>();

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Simulate collaborative editing
  useEffect(() => {
    if (collaborative && isOpen) {
      // Simulate other users joining/leaving
      const simulateCollaborators = () => {
        const activeCollaborators = mockUsers.filter(user => 
          user.id !== mockCurrentUser.id && Math.random() > 0.5
        );
        setCollaborators(activeCollaborators);
      };

      simulateCollaborators();
      collaborativeTimeoutRef.current = setInterval(simulateCollaborators, 10000);

      return () => {
        if (collaborativeTimeoutRef.current) {
          clearInterval(collaborativeTimeoutRef.current);
        }
      };
    }
  }, [collaborative, isOpen]);

  // Initialize form data
  useEffect(() => {
    if (task && (mode === 'edit' || mode === 'view')) {
      setFormData({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee,
        dueDate: task.dueDate,
        tags: task.tags || [],
        estimatedHours: task.estimatedHours,
        labels: task.labels || [],
        watchers: task.watchers || [],
      });
      
      // Set description in rich text editor
      if (descriptionEditorRef.current && task.description) {
        descriptionEditorRef.current.setContent(task.description);
      }
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        assignee: undefined,
        dueDate: undefined,
        tags: [],
        estimatedHours: undefined,
        labels: [],
        watchers: [],
      });
      
      if (descriptionEditorRef.current) {
        descriptionEditorRef.current.setContent('');
      }
    }
    
    setErrors({});
    setHasUnsavedChanges(false);
    setLastSaved(null);
  }, [task, mode, isOpen]);

  // Enhanced auto-save functionality
  const performAutoSave = useCallback(async () => {
    if (!autoSave || !hasUnsavedChanges || mode === 'view' || !isOnline) return;
    
    const currentContent = JSON.stringify({
      ...formData,
      description: descriptionEditorRef.current?.getContent() || '',
    });

    // Skip if content hasn't changed since last auto-save
    if (currentContent === lastAutoSaveRef.current) return;

    setAutoSaveStatus('saving');
    setIsAutoSaving(true);
    
    try {
      const taskData = {
        ...formData,
        description: descriptionEditorRef.current?.getContent() || '',
        updatedAt: new Date(),
      };
      
      await onSave(taskData as Task);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      setAutoSaveStatus('saved');
      lastAutoSaveRef.current = currentContent;
      
      // Reset status after 2 seconds
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setAutoSaveStatus('error');
      
      // Reset error status after 5 seconds
      setTimeout(() => setAutoSaveStatus('idle'), 5000);
    } finally {
      setIsAutoSaving(false);
    }
  }, [autoSave, hasUnsavedChanges, mode, formData, onSave, isOnline]);

  // Debounced auto-save
  useEffect(() => {
    if (autoSave && hasUnsavedChanges) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(performAutoSave, 2000);
    }
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [autoSave, hasUnsavedChanges, performAutoSave]);

  // Mark as having unsaved changes
  const markAsChanged = useCallback(() => {
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true);
    }
  }, [hasUnsavedChanges]);

  // Update form data and mark as changed
  const updateFormData = useCallback((updates: Partial<Task>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    markAsChanged();
  }, [markAsChanged]);

  // Enhanced validation with detailed error messages
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    const newValidationErrors: Record<string, string[]> = {};

    // Title validation
    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
      newValidationErrors.title = ['Task title cannot be empty'];
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title is too long';
      newValidationErrors.title = ['Title must be less than 200 characters'];
    }

    // Description validation
    const description = descriptionEditorRef.current?.getContent() || '';
    if (!description.trim() || description === '<p></p>') {
      newErrors.description = 'Description is required';
      newValidationErrors.description = ['Task description cannot be empty'];
    } else if (description.length > 10000) {
      newErrors.description = 'Description is too long';
      newValidationErrors.description = ['Description must be less than 10,000 characters'];
    }

    // Due date validation
    if (formData.dueDate && formData.dueDate < new Date()) {
      newErrors.dueDate = 'Due date cannot be in the past';
      newValidationErrors.dueDate = ['Please select a future date'];
    }

    // Estimated hours validation
    if (formData.estimatedHours && (formData.estimatedHours < 0 || formData.estimatedHours > 1000)) {
      newErrors.estimatedHours = 'Invalid estimated hours';
      newValidationErrors.estimatedHours = ['Estimated hours must be between 0 and 1000'];
    }

    // Tags validation
    if (formData.tags && formData.tags.length > 10) {
      newErrors.tags = 'Too many tags';
      newValidationErrors.tags = ['Maximum 10 tags allowed'];
    }

    setErrors(newErrors);
    setValidationErrors(newValidationErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setActiveTab('details');
      return;
    }

    const description = descriptionEditorRef.current?.getContent() || '';
    const taskData = {
      ...formData,
      description,
      updatedAt: new Date(),
      ...(mode === 'create' && {
        id: Date.now().toString(),
        createdAt: new Date(),
      }),
    };

    try {
      await onSave(taskData as Task);
      setHasUnsavedChanges(false);
      onClose();
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  };

  const handleDelete = async () => {
    if (task && onDelete && window.confirm('Are you sure you want to delete this task?')) {
      try {
        await onDelete(task.id);
        onClose();
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !(formData.tags || []).includes(tagInput.trim())) {
      updateFormData({
        tags: [...(formData.tags || []), tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    updateFormData({
      tags: (formData.tags || []).filter(tag => tag !== tagToRemove)
    });
  };

  const addLabel = () => {
    if (labelInput.trim() && !(formData.labels || []).includes(labelInput.trim())) {
      updateFormData({
        labels: [...(formData.labels || []), labelInput.trim()]
      });
      setLabelInput('');
    }
  };

  const removeLabel = (labelToRemove: string) => {
    updateFormData({
      labels: (formData.labels || []).filter(label => label !== labelToRemove)
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent, type: 'tag' | 'label') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'tag') {
        addTag();
      } else {
        addLabel();
      }
    }
  };

  // File upload handlers
  const handleFileUpload = async (files: File[]): Promise<TaskAttachment[]> => {
    // Mock file upload - in real app, this would upload to server
    const attachments: TaskAttachment[] = files.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type,
      size: file.size,
      uploadedAt: new Date(),
      uploadedBy: mockCurrentUser,
    }));

    // Update task with new attachments
    updateFormData({
      attachments: [...(task?.attachments || []), ...attachments]
    });

    return attachments;
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    updateFormData({
      attachments: (task?.attachments || []).filter(att => att.id !== attachmentId)
    });
  };

  // Comment handlers
  const handleAddComment = (content: string, mentions?: TaskUser[]) => {
    const newComment: TaskComment = {
      id: `${Date.now()}-${Math.random()}`,
      author: mockCurrentUser,
      content,
      createdAt: new Date(),
      mentions,
    };

    updateFormData({
      comments: [...(task?.comments || []), newComment]
    });
  };

  const handleUpdateComment = (commentId: string, content: string) => {
    updateFormData({
      comments: (task?.comments || []).map(comment =>
        comment.id === commentId
          ? { ...comment, content, updatedAt: new Date(), edited: true }
          : comment
      )
    });
  };

  const handleDeleteComment = (commentId: string) => {
    updateFormData({
      comments: (task?.comments || []).filter(comment => comment.id !== commentId)
    });
  };

  // Dependency handlers
  const handleAddDependency = (dependency: Omit<TaskDependency, 'id'>) => {
    const newDependency: TaskDependency = {
      ...dependency,
      id: `${Date.now()}-${Math.random()}`,
    };

    updateFormData({
      dependencies: [...(task?.dependencies || []), newDependency]
    });
  };

  const handleRemoveDependency = (dependencyId: string) => {
    updateFormData({
      dependencies: (task?.dependencies || []).filter(dep => dep.id !== dependencyId)
    });
  };

  const tabs = [
    { id: 'details', label: 'Details', icon: Target },
    { id: 'attachments', label: 'Attachments', icon: Paperclip, count: task?.attachments?.length },
    { id: 'comments', label: 'Comments', icon: MessageCircle, count: task?.comments?.length },
    { id: 'dependencies', label: 'Dependencies', icon: GitBranch, count: task?.dependencies?.length },
    { id: 'activity', label: 'Activity', icon: Activity, count: task?.activity?.length },
  ] as const;

  const modalTitle = mode === 'create' 
    ? 'Create New Task' 
    : mode === 'view' 
    ? 'Task Details' 
    : 'Edit Task';

  const modalFooter = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Connection status */}
        <div className="flex items-center gap-2 text-sm">
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-gray-500 dark:text-gray-400">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-red-500" />
              <span className="text-red-600 dark:text-red-400">Offline</span>
            </>
          )}
        </div>

        {/* Enhanced auto-save indicator */}
        {autoSave && (
          <div className="flex items-center gap-2 text-sm">
            {autoSaveStatus === 'saving' ? (
              <>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-blue-600 dark:text-blue-400">Saving...</span>
              </>
            ) : autoSaveStatus === 'saved' ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-green-600 dark:text-green-400">
                  Saved {lastSaved ? formatTimeAgo(lastSaved) : ''}
                </span>
              </>
            ) : autoSaveStatus === 'error' ? (
              <>
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-red-600 dark:text-red-400">Save failed</span>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span className="text-yellow-600 dark:text-yellow-400">Unsaved changes</span>
              </>
            ) : null}
          </div>
        )}

        {/* Enhanced collaborative indicator */}
        {collaborative && (
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <UserCheck className="w-4 h-4 text-green-500" />
              <span className="text-gray-500 dark:text-gray-400">
                {collaborators.length > 0 
                  ? `${collaborators.length} collaborator${collaborators.length > 1 ? 's' : ''} online`
                  : 'Live collaboration'
                }
              </span>
            </div>
            {collaborators.length > 0 && (
              <div className="flex -space-x-1">
                {collaborators.slice(0, 3).map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium text-primary-700 dark:text-primary-300"
                    title={collaborator.name}
                  >
                    {collaborator.avatar ? (
                      <img
                        src={collaborator.avatar}
                        alt={collaborator.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      collaborator.name.charAt(0).toUpperCase()
                    )}
                  </div>
                ))}
                {collaborators.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400">
                    +{collaborators.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {mode !== 'view' && (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            {task && onDelete && (
              <Button variant="danger" onClick={handleDelete}>
                Delete
              </Button>
            )}
            <Button 
              variant="primary" 
              onClick={handleSubmit}
              icon={<Save className="w-4 h-4" />}
              loading={isAutoSaving}
            >
              {mode === 'create' ? 'Create Task' : 'Save Changes'}
            </Button>
          </>
        )}
        {mode === 'view' && (
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  );

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      size="xl"
      footer={modalFooter}
      testId="task-modal"
    >
      <div className="flex flex-col h-full">
        {/* Tab navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'details' && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title *
                  </label>
                  <Input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => updateFormData({ title: e.target.value })}
                    placeholder="Enter task title"
                    state={errors.title ? 'error' : 'default'}
                    errorText={errors.title}
                    disabled={mode === 'view'}
                    fullWidth
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description *
                  </label>
                  <RichTextEditor
                    ref={descriptionEditorRef}
                    content={formData.description || ''}
                    placeholder="Describe the task in detail... Use @ to mention team members, create task lists, and format your content."
                    editable={mode !== 'view'}
                    onChange={(content) => {
                      updateFormData({ description: content });
                    }}
                    mentions={mockUsers.map(user => ({
                      id: user.id,
                      label: user.name,
                      avatar: user.avatar,
                    }))}
                    collaborative={collaborative}
                    autoSave={autoSave}
                    autoSaveDelay={1500}
                    className={errors.description ? 'border-error-500 focus-within:border-error-500 focus-within:ring-error-500' : ''}
                  />
                  {errors.description && (
                    <div className="mt-2">
                      <p className="text-sm text-error-600 dark:text-error-400 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.description}
                      </p>
                      {validationErrors.description && (
                        <ul className="mt-1 text-xs text-error-500 dark:text-error-400 list-disc list-inside">
                          {validationErrors.description.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Supports rich text formatting, task lists, mentions, and links
                  </div>
                </div>

                {/* Status, Priority, and Assignee */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => updateFormData({ status: e.target.value as any })}
                      disabled={mode === 'view'}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => updateFormData({ priority: e.target.value as any })}
                      disabled={mode === 'view'}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Assignee
                    </label>
                    <select
                      value={formData.assignee?.id || ''}
                      onChange={(e) => {
                        const selectedUser = mockUsers.find(user => user.id === e.target.value);
                        updateFormData({ assignee: selectedUser });
                      }}
                      disabled={mode === 'view'}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Unassigned</option>
                      {mockUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Due Date and Estimated Hours */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Due Date
                    </label>
                    <Input
                      type="date"
                      value={formData.dueDate ? new Date(formData.dueDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => updateFormData({ dueDate: e.target.value ? new Date(e.target.value) : undefined })}
                      disabled={mode === 'view'}
                      fullWidth
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Estimated Hours
                    </label>
                    <Input
                      type="number"
                      value={formData.estimatedHours?.toString() || ''}
                      onChange={(e) => updateFormData({ estimatedHours: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="0"
                      disabled={mode === 'view'}
                      fullWidth
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Tag className="w-4 h-4 inline mr-1" />
                    Tags
                  </label>
                  {mode !== 'view' && (
                    <div className="flex gap-2 mb-3">
                      <Input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => handleKeyPress(e, 'tag')}
                        placeholder="Add a tag"
                        className="flex-1"
                      />
                      <Button variant="secondary" onClick={addTag}>
                        Add
                      </Button>
                    </div>
                  )}
                  {(formData.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {(formData.tags || []).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                        >
                          {tag}
                          {mode !== 'view' && (
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Labels */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Labels
                  </label>
                  {mode !== 'view' && (
                    <div className="flex gap-2 mb-3">
                      <Input
                        type="text"
                        value={labelInput}
                        onChange={(e) => setLabelInput(e.target.value)}
                        onKeyDown={(e) => handleKeyPress(e, 'label')}
                        placeholder="Add a label"
                        className="flex-1"
                      />
                      <Button variant="secondary" onClick={addLabel}>
                        Add
                      </Button>
                    </div>
                  )}
                  {(formData.labels || []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {(formData.labels || []).map((label) => (
                        <span
                          key={label}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                        >
                          {label}
                          {mode !== 'view' && (
                            <button
                              type="button"
                              onClick={() => removeLabel(label)}
                              className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'attachments' && (
              <motion.div
                key="attachments"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    File Attachments
                  </h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {task?.attachments?.length || 0} of 10 files
                  </div>
                </div>

                {!isOnline && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <WifiOff className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        File uploads are disabled while offline
                      </p>
                    </div>
                  </div>
                )}

                <FileUpload
                  onUpload={mode !== 'view' && isOnline ? handleFileUpload : undefined}
                  onRemove={mode !== 'view' ? handleRemoveAttachment : undefined}
                  attachments={task?.attachments || []}
                  disabled={mode === 'view' || !isOnline}
                  maxFiles={10}
                  maxSize={10 * 1024 * 1024} // 10MB
                  acceptedTypes={[
                    'image/*',
                    'application/pdf',
                    'text/*',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/vnd.ms-excel',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                  ]}
                  testId="task-file-upload"
                />
              </motion.div>
            )}

            {activeTab === 'comments' && (
              <motion.div
                key="comments"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <TaskComments
                  comments={task?.comments || []}
                  currentUser={mockCurrentUser}
                  onAddComment={mode !== 'view' ? handleAddComment : () => {}}
                  onUpdateComment={mode !== 'view' ? handleUpdateComment : () => {}}
                  onDeleteComment={mode !== 'view' ? handleDeleteComment : () => {}}
                  availableUsers={mockUsers}
                />
              </motion.div>
            )}

            {activeTab === 'dependencies' && (
              <motion.div
                key="dependencies"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <TaskDependencies
                  task={task || formData as Task}
                  allTasks={[]} // In real app, this would be passed from parent
                  onAddDependency={mode !== 'view' ? handleAddDependency : () => {}}
                  onRemoveDependency={mode !== 'view' ? handleRemoveDependency : () => {}}
                />
              </motion.div>
            )}

            {activeTab === 'activity' && (
              <motion.div
                key="activity"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Activity Timeline
                  </h3>
                </div>

                <div className="space-y-3">
                  {task?.activity && task.activity.length > 0 ? (
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                      
                      {task.activity.map((activity, index) => (
                        <motion.div
                          key={activity.id}
                          className="relative flex items-start gap-4 pb-4"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          {/* Timeline dot */}
                          <div className="relative z-10 w-8 h-8 rounded-full bg-white dark:bg-gray-800 border-2 border-primary-500 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                          </div>
                          
                          {/* Activity content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {activity.user.name}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatTimeAgo(activity.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {activity.description}
                            </p>
                            {activity.details && Object.keys(activity.details).length > 0 && (
                              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400">
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(activity.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <History className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                      <p>No activity yet</p>
                      <p className="text-sm mt-1">Task activity will appear here as changes are made</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Modal>
  );
};

export default TaskModal;