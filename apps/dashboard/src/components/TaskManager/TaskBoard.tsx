import React, { useState, useMemo, useCallback } from 'react';
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  AlertCircle, 
  Star, 
  Edit, 
  Trash2, 
  User, 
  Calendar,
  MoreVertical,
  Plus,
  Filter,
  Users,
  Tag as TagIcon,
  GripVertical
} from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  KeyboardSensor,
  TouchSensor
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import {
  useSortable,
  SortableContext as SortableContextProvider
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FixedSizeList as List } from 'react-window';
import { motion, AnimatePresence } from 'framer-motion';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: string;
  dueDate: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  starred: boolean;
}

interface TaskColumn {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'completed';
  color: string;
  limit?: number;
}

interface TaskBoardProps {
  tasks: Task[];
  onToggleStatus: (taskId: string) => void;
  onToggleStar: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onTaskMove?: (taskId: string, fromColumn: string, toColumn: string) => void;
  onBulkUpdate?: (taskIds: string[], updates: Partial<Task>) => void;
  dragEnabled?: boolean;
  virtualScrolling?: boolean;
  groupBy?: 'assignee' | 'priority' | 'tag';
  showColumnLimits?: boolean;
  onColumnUpdate?: (columnId: string, updates: Partial<TaskColumn>) => void;
}

// Sortable Task Item Component
const SortableTaskItem: React.FC<{
  task: Task;
  onToggleStatus: (taskId: string) => void;
  onToggleStar: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  isSelected?: boolean;
  onSelect?: (taskId: string, selected: boolean) => void;
  dragEnabled?: boolean;
}> = ({ 
  task, 
  onToggleStatus, 
  onToggleStar, 
  onEditTask, 
  onDeleteTask,
  isSelected = false,
  onSelect,
  dragEnabled = true
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !dragEnabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500';
      case 'high': return 'border-l-orange-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-500';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    return new Date(dueDate) < new Date() && status !== 'completed';
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02 }}
      className={`bg-white rounded-lg shadow-sm border-l-4 ${getPriorityColor(task.priority)} p-4 hover:shadow-md transition-all duration-200 cursor-pointer ${
        isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
      } ${isDragging ? 'shadow-lg z-50' : ''}`}
      onClick={() => onSelect?.(task.id, !isSelected)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {dragEnabled && (
            <button
              {...attributes}
              {...listeners}
              className="text-gray-400 hover:text-gray-600 transition-colors cursor-grab active:cursor-grabbing"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical size={16} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus(task.id);
            }}
            className="text-gray-400 hover:text-blue-600 transition-colors"
          >
            {task.status === 'completed' ? (
              <CheckCircle size={18} className="text-green-600" />
            ) : task.status === 'in-progress' ? (
              <Clock size={18} className="text-blue-600" />
            ) : (
              <Circle size={18} />
            )}
          </button>
          {task.starred && (
            <Star size={16} className="text-yellow-500 fill-current" />
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar(task.id);
            }}
            className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
          >
            <Star size={14} className={task.starred ? 'text-yellow-500 fill-current' : ''} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditTask(task);
            }}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteTask(task.id);
            }}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <h4 className={`font-medium mb-2 ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
        {task.title}
      </h4>
      
      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{task.description}</p>
      
      <div className="flex flex-wrap gap-1 mb-3">
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityBadgeColor(task.priority)}`}>
          {task.priority}
        </span>
        {task.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
            {tag}
          </span>
        ))}
        {task.tags.length > 2 && (
          <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
            +{task.tags.length - 2}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <User size={12} />
          <span className="truncate max-w-[80px]">{task.assignee}</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar size={12} />
          <span>{new Date(task.dueDate).toLocaleDateString()}</span>
          {isOverdue(task.dueDate, task.status) && (
            <AlertCircle size={12} className="text-red-500 ml-1" />
          )}
        </div>
      </div>

      {isOverdue(task.dueDate, task.status) && (
        <div className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1">
          <AlertCircle size={12} />
          Overdue
        </div>
      )}
    </motion.div>
  );
};

// Droppable Column Component
const DroppableColumn: React.FC<{
  column: TaskColumn;
  tasks: Task[];
  onToggleStatus: (taskId: string) => void;
  onToggleStar: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  selectedTasks: Set<string>;
  onTaskSelect: (taskId: string, selected: boolean) => void;
  dragEnabled?: boolean;
  virtualScrolling?: boolean;
  showLimit?: boolean;
}> = ({ 
  column, 
  tasks, 
  onToggleStatus, 
  onToggleStar, 
  onEditTask, 
  onDeleteTask,
  selectedTasks,
  onTaskSelect,
  dragEnabled = true,
  virtualScrolling = false,
  showLimit = false
}) => {
  const isOverLimit = column.limit && tasks.length > column.limit;

  const TaskItem = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <div className="p-2">
        <SortableTaskItem
          task={tasks[index]}
          onToggleStatus={onToggleStatus}
          onToggleStar={onToggleStar}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
          isSelected={selectedTasks.has(tasks[index].id)}
          onSelect={onTaskSelect}
          dragEnabled={dragEnabled}
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className={`rounded-lg border-2 border-dashed ${column.color} p-4 mb-4 relative`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">{column.title}</h3>
          <div className="flex items-center gap-2">
            {showLimit && column.limit && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                isOverLimit ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
              }`}>
                {tasks.length}/{column.limit}
              </span>
            )}
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">{tasks.length} tasks</span>
          <button className="text-gray-400 hover:text-blue-600 transition-colors">
            <Plus size={16} />
          </button>
        </div>
        {isOverLimit && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}
      </div>
      
      <div className="flex-1 min-h-[400px]">
        <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          {virtualScrolling && tasks.length > 10 ? (
            <List
              height={400}
              itemCount={tasks.length}
              itemSize={120}
              className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
            >
              {TaskItem}
            </List>
          ) : (
            <AnimatePresence>
              <div className="space-y-4">
                {tasks.map((task) => (
                  <SortableTaskItem
                    key={task.id}
                    task={task}
                    onToggleStatus={onToggleStatus}
                    onToggleStar={onToggleStar}
                    onEditTask={onEditTask}
                    onDeleteTask={onDeleteTask}
                    isSelected={selectedTasks.has(task.id)}
                    onSelect={onTaskSelect}
                    dragEnabled={dragEnabled}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </SortableContext>
        
        {tasks.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 text-gray-400"
          >
            <Circle size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tasks in {column.title.toLowerCase()}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  onToggleStatus,
  onToggleStar,
  onEditTask,
  onDeleteTask,
  onTaskMove,
  onBulkUpdate,
  dragEnabled = true,
  virtualScrolling = false,
  groupBy,
  showColumnLimits = false,
  onColumnUpdate,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  const columns: TaskColumn[] = [
    { id: 'todo', title: 'To Do', status: 'todo', color: 'bg-gray-100 border-gray-300', limit: showColumnLimits ? 10 : undefined },
    { id: 'in-progress', title: 'In Progress', status: 'in-progress', color: 'bg-blue-100 border-blue-300', limit: showColumnLimits ? 5 : undefined },
    { id: 'completed', title: 'Completed', status: 'completed', color: 'bg-green-100 border-green-300' },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500';
      case 'high': return 'border-l-orange-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-500';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    return new Date(dueDate) < new Date() && status !== 'completed';
  };

  return (
    <div className=\"grid grid-cols-1 md:grid-cols-3 gap-6 h-full\">
      {columns.map((column) => {
        const columnTasks = tasks.filter(task => task.status === column.id);
        
        return (
          <div key={column.id} className=\"flex flex-col\">
            <div className={`rounded-lg border-2 border-dashed ${column.color} p-4 mb-4`}>
              <h3 className=\"font-semibold text-gray-900 mb-2\">{column.title}</h3>
              <span className=\"text-sm text-gray-600\">{columnTasks.length} tasks</span>
            </div>
            
            <div className=\"flex-1 space-y-4 min-h-[400px]\">
              {columnTasks.map((task) => (
                <div
                  key={task.id}
                  className={`bg-white rounded-lg shadow-sm border-l-4 ${getPriorityColor(task.priority)} p-4 hover:shadow-md transition-shadow`}
                >
                  <div className=\"flex items-start justify-between mb-3\">
                    <div className=\"flex items-center gap-2\">
                      <button
                        onClick={() => onToggleStatus(task.id)}
                        className=\"text-gray-400 hover:text-blue-600 transition-colors\"
                      >
                        {task.status === 'completed' ? (
                          <CheckCircle size={18} className=\"text-green-600\" />
                        ) : task.status === 'in-progress' ? (
                          <Clock size={18} className=\"text-blue-600\" />
                        ) : (
                          <Circle size={18} />
                        )}
                      </button>
                      {task.starred && (
                        <Star size={16} className=\"text-yellow-500 fill-current\" />
                      )}
                    </div>
                    
                    <div className=\"flex items-center gap-1\">
                      <button
                        onClick={() => onToggleStar(task.id)}
                        className=\"p-1 text-gray-400 hover:text-yellow-500 transition-colors\"
                      >
                        <Star size={14} className={task.starred ? 'text-yellow-500 fill-current' : ''} />
                      </button>
                      <button
                        onClick={() => onEditTask(task)}
                        className=\"p-1 text-gray-400 hover:text-blue-600 transition-colors\"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className=\"p-1 text-gray-400 hover:text-red-600 transition-colors\"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <h4 className={`font-medium mb-2 ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                    {task.title}
                  </h4>
                  
                  <p className=\"text-gray-600 text-sm mb-3 line-clamp-2\">{task.description}</p>
                  
                  <div className=\"flex flex-wrap gap-1 mb-3\">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityBadgeColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    {task.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className=\"px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs\">
                        {tag}
                      </span>
                    ))}
                    {task.tags.length > 2 && (
                      <span className=\"px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs\">
                        +{task.tags.length - 2}
                      </span>
                    )}
                  </div>

                  <div className=\"flex items-center justify-between text-xs text-gray-500\">
                    <div className=\"flex items-center gap-1\">
                      <User size={12} />
                      <span className=\"truncate max-w-[80px]\">{task.assignee}</span>
                    </div>
                    <div className=\"flex items-center gap-1\">
                      <Calendar size={12} />
                      <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                      {isOverdue(task.dueDate, task.status) && (
                        <AlertCircle size={12} className=\"text-red-500 ml-1\" />
                      )}
                    </div>
                  </div>

                  {isOverdue(task.dueDate, task.status) && (
                    <div className=\"mt-2 text-xs text-red-600 font-medium flex items-center gap-1\">
                      <AlertCircle size={12} />
                      Overdue
                    </div>
                  )}
                </div>
              ))}
              
              {columnTasks.length === 0 && (
                <div className=\"text-center py-8 text-gray-400\">
                  <Circle size={32} className=\"mx-auto mb-2 opacity-50\" />
                  <p className=\"text-sm\">No tasks in {column.title.toLowerCase()}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TaskBoard;