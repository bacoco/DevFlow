/**
 * Task Dependencies Component
 * Visualizes and manages task dependencies with interactive graph
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  Link,
  Unlink,
  Plus,
  X,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  Pause,
} from 'lucide-react';
import { TaskDependency, Task, TaskStatus } from '../../types/design-system';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

export interface TaskDependenciesProps {
  task: Task;
  allTasks: Task[];
  onAddDependency: (dependency: Omit<TaskDependency, 'id'>) => void;
  onRemoveDependency: (dependencyId: string) => void;
  className?: string;
  testId?: string;
}

const getStatusIcon = (status: TaskStatus) => {
  switch (status) {
    case 'todo':
      return <Clock className="w-4 h-4 text-gray-500" />;
    case 'in-progress':
      return <div className="w-4 h-4 rounded-full bg-blue-500 animate-pulse" />;
    case 'review':
      return <Pause className="w-4 h-4 text-yellow-500" />;
    case 'done':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'blocked':
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-500" />;
  }
};

const getStatusColor = (status: TaskStatus): string => {
  switch (status) {
    case 'todo':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    case 'in-progress':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'review':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'done':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'blocked':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
};

const getDependencyTypeIcon = (type: TaskDependency['type']) => {
  switch (type) {
    case 'blocks':
      return <ArrowRight className="w-4 h-4 text-red-500" />;
    case 'blocked_by':
      return <ArrowLeft className="w-4 h-4 text-orange-500" />;
    case 'related':
      return <Link className="w-4 h-4 text-blue-500" />;
    default:
      return <Link className="w-4 h-4 text-gray-500" />;
  }
};

const getDependencyTypeLabel = (type: TaskDependency['type']): string => {
  switch (type) {
    case 'blocks':
      return 'Blocks';
    case 'blocked_by':
      return 'Blocked by';
    case 'related':
      return 'Related to';
    default:
      return 'Related';
  }
};

export const TaskDependencies: React.FC<TaskDependenciesProps> = ({
  task,
  allTasks,
  onAddDependency,
  onRemoveDependency,
  className = '',
  testId,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<TaskDependency['type']>('blocks');

  const dependencies = task.dependencies || [];

  // Filter available tasks for adding dependencies
  const availableTasks = allTasks.filter(t => 
    t.id !== task.id && // Not the current task
    !dependencies.some(dep => dep.taskId === t.id) && // Not already a dependency
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddDependency = useCallback((targetTask: Task) => {
    onAddDependency({
      type: selectedType,
      taskId: targetTask.id,
      taskTitle: targetTask.title,
      taskStatus: targetTask.status,
    });
    setShowAddModal(false);
    setSearchQuery('');
  }, [selectedType, onAddDependency]);

  const containerClasses = [
    'space-y-4',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses} data-testid={testId}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Dependencies
        </h3>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowAddModal(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Dependency
        </Button>
      </div>

      {/* Dependencies list */}
      <div className="space-y-3">
        <AnimatePresence>
          {dependencies.length === 0 ? (
            <motion.div
              className="text-center py-8 text-gray-500 dark:text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Link className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>No dependencies yet</p>
              <p className="text-sm mt-1">Add dependencies to track task relationships</p>
            </motion.div>
          ) : (
            dependencies.map((dependency) => (
              <motion.div
                key={dependency.id}
                className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* Dependency type icon */}
                <div className="flex-shrink-0">
                  {getDependencyTypeIcon(dependency.type)}
                </div>

                {/* Task info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {getDependencyTypeLabel(dependency.type)}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(dependency.taskStatus)}`}>
                      {getStatusIcon(dependency.taskStatus)}
                      {dependency.taskStatus.replace('-', ' ')}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {dependency.taskTitle}
                  </p>
                </div>

                {/* Remove button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveDependency(dependency.id)}
                  className="p-1 min-w-0 text-error-600 hover:text-error-700 dark:text-error-400 dark:hover:text-error-300"
                  title="Remove dependency"
                >
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Dependency warnings */}
      {dependencies.some(dep => dep.taskStatus === 'blocked') && (
        <motion.div
          className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Blocked Dependencies
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Some dependencies are blocked, which may affect this task's progress.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Add dependency modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSearchQuery('');
        }}
        title="Add Task Dependency"
        size="md"
      >
        <div className="space-y-4">
          {/* Dependency type selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Dependency Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['blocks', 'blocked_by', 'related'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`p-3 text-center border rounded-lg transition-colors ${
                    selectedType === type
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    {getDependencyTypeIcon(type)}
                    <span className="text-xs font-medium">
                      {getDependencyTypeLabel(type)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Task search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Tasks
            </label>
            <Input
              type="text"
              placeholder="Search for tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4" />}
              iconPosition="left"
            />
          </div>

          {/* Available tasks */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {availableTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Search className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">
                  {searchQuery ? 'No tasks found' : 'Start typing to search for tasks'}
                </p>
              </div>
            ) : (
              availableTasks.map((availableTask) => (
                <motion.button
                  key={availableTask.id}
                  onClick={() => handleAddDependency(availableTask)}
                  className="w-full p-3 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(availableTask.status)}`}>
                      {getStatusIcon(availableTask.status)}
                      {availableTask.status.replace('-', ' ')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {availableTask.title}
                      </p>
                      {availableTask.assignee && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Assigned to {availableTask.assignee.name}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TaskDependencies;