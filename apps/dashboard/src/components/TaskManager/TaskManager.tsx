import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calendar, User, CheckCircle, Circle, Clock, AlertCircle, MoreHorizontal, Edit, Trash2, Star, Grid, List, LayoutGrid } from 'lucide-react';
import TaskModal from './TaskModal';
import TaskBoard from './TaskBoard';
import SearchAndFilter from './SearchAndFilter';
import SearchResults from './SearchResults';
import SearchPagination from './SearchPagination';
import { searchService } from '../../services/searchService';

import { Task } from '../../types/design-system';
import { SearchResult, PaginationConfig, FilterCriteria, SavedSearch } from './SearchAndFilter';

interface TaskManagerProps {
  className?: string;
}

const TaskManager: React.FC<TaskManagerProps> = ({ className = '' }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [pagination, setPagination] = useState<PaginationConfig>({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState<FilterCriteria[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'search'>('list');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  // Sample data - replace with API calls
  useEffect(() => {
    const sampleTasks: Task[] = [
      {
        id: '1',
        title: 'Implement user authentication',
        description: 'Add JWT-based authentication system with role-based access control',
        status: 'in-progress',
        priority: 'high',
        assignee: { id: '1', name: 'John Doe', email: 'john@example.com' },
        dueDate: new Date('2025-02-15'),
        tags: ['backend', 'security'],
        createdAt: new Date('2025-01-20'),
        updatedAt: new Date('2025-01-30'),
        starred: true
      },
      {
        id: '2',
        title: 'Design dashboard UI components',
        description: 'Create reusable React components for the main dashboard',
        status: 'done',
        priority: 'medium',
        assignee: { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
        dueDate: new Date('2025-01-25'),
        tags: ['frontend', 'ui'],
        createdAt: new Date('2025-01-15'),
        updatedAt: new Date('2025-01-25'),
        starred: false
      },
      {
        id: '3',
        title: 'Set up CI/CD pipeline',
        description: 'Configure automated testing and deployment pipeline',
        status: 'todo',
        priority: 'urgent',
        assignee: { id: '3', name: 'Mike Johnson', email: 'mike@example.com' },
        dueDate: new Date('2025-02-10'),
        tags: ['devops', 'automation'],
        createdAt: new Date('2025-01-28'),
        updatedAt: new Date('2025-01-28'),
        starred: false
      },
      {
        id: '4',
        title: 'API documentation',
        description: 'Write comprehensive API documentation using OpenAPI spec',
        status: 'todo',
        priority: 'low',
        assignee: { id: '4', name: 'Sarah Wilson', email: 'sarah@example.com' },
        dueDate: new Date('2025-02-20'),
        tags: ['documentation', 'api'],
        createdAt: new Date('2025-01-29'),
        updatedAt: new Date('2025-01-29'),
        starred: false
      }
    ];
    setTasks(sampleTasks);
    
    // Load saved searches
    setSavedSearches(searchService.getSavedSearches());
  }, []);

  // Handle search results
  const handleSearchResults = (results: SearchResult[], paginationConfig: PaginationConfig) => {
    setSearchResults(results);
    setPagination(paginationConfig);
  };

  // Handle filters change
  const handleFiltersChange = (newFilters: FilterCriteria[]) => {
    setFilters(newFilters);
  };

  // Handle saved search selection
  const handleSavedSearchSelect = (savedSearch: SavedSearch) => {
    searchService.useSavedSearch(savedSearch.id);
    setSavedSearches(searchService.getSavedSearches());
  };

  // Handle saved search creation
  const handleSavedSearchCreate = (searchData: Omit<SavedSearch, 'id' | 'createdAt' | 'lastUsed' | 'useCount'>) => {
    searchService.createSavedSearch(searchData);
    setSavedSearches(searchService.getSavedSearches());
  };

  // Handle saved search deletion
  const handleSavedSearchDelete = (id: string) => {
    searchService.deleteSavedSearch(id);
    setSavedSearches(searchService.getSavedSearches());
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setPagination(prev => ({ ...prev, pageSize, page: 1 }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'in-progress': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'todo': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const toggleTaskStatus = (taskId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const newStatus = task.status === 'done' ? 'todo' : 
                         task.status === 'todo' ? 'in-progress' : 'done';
        return { ...task, status: newStatus, updatedAt: new Date() };
      }
      return task;
    }));
  };

  const toggleStar = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, starred: !task.starred } : task
    ));
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
    setSelectedTasks(prev => {
      const newSelected = new Set(prev);
      newSelected.delete(taskId);
      return newSelected;
    });
  };

  const handleSaveTask = (taskData: Partial<Task>) => {
    if (editingTask) {
      // Update existing task
      setTasks(prev => prev.map(task => 
        task.id === editingTask.id ? { ...task, ...taskData, updatedAt: new Date() } : task
      ));
    } else {
      // Create new task
      const newTask: Task = {
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
        starred: false,
        ...taskData
      } as Task;
      setTasks(prev => [...prev, newTask]);
    }
    setEditingTask(null);
  };

  // Handle task actions from search results
  const handleTaskAction = (taskId: string, action: 'toggle' | 'star' | 'edit' | 'delete' | 'view') => {
    switch (action) {
      case 'toggle':
        toggleTaskStatus(taskId);
        break;
      case 'star':
        toggleStar(taskId);
        break;
      case 'edit':
      case 'view':
        const task = tasks.find(t => t.id === taskId);
        if (task) setEditingTask(task);
        break;
      case 'delete':
        deleteTask(taskId);
        break;
    }
  };

  // Handle task selection
  const handleTaskSelect = (taskId: string, selected: boolean) => {
    setSelectedTasks(prev => {
      const newSelected = new Set(prev);
      if (selected) {
        newSelected.add(taskId);
      } else {
        newSelected.delete(taskId);
      }
      return newSelected;
    });
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Task Manager</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className={`px-3 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
                showAdvancedSearch
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Search size={16} />
              Advanced Search
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus size={20} />
              New Task
            </button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm flex items-center gap-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              <List size={16} />
              List
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-2 text-sm flex items-center gap-2 ${viewMode === 'board' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              <LayoutGrid size={16} />
              Board
            </button>
            <button
              onClick={() => setViewMode('search')}
              className={`px-3 py-2 text-sm flex items-center gap-2 ${viewMode === 'search' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              <Search size={16} />
              Search
            </button>
          </div>

          {selectedTasks.size > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{selectedTasks.size} selected</span>
              <button
                onClick={() => setSelectedTasks(new Set())}
                className="text-blue-600 hover:text-blue-800"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Advanced Search Panel */}
      {showAdvancedSearch && (
        <SearchAndFilter
          tasks={tasks}
          onSearchResults={handleSearchResults}
          onFiltersChange={handleFiltersChange}
          onSavedSearchSelect={handleSavedSearchSelect}
          savedSearches={savedSearches}
          onSavedSearchCreate={handleSavedSearchCreate}
          onSavedSearchDelete={handleSavedSearchDelete}
          pageSize={pagination.pageSize}
          enableAdvancedSearch={true}
          enableSavedSearches={true}
          enableRealTimeSearch={true}
          className="border-b border-gray-200"
        />
      )}

      {/* Task Content */}
      <div className="flex-1">
        {viewMode === 'search' ? (
          <div className="space-y-4">
            <SearchResults
              results={searchResults}
              pagination={pagination}
              onTaskAction={handleTaskAction}
              onTaskSelect={handleTaskSelect}
              selectedTasks={selectedTasks}
              viewMode="list"
              showRelevanceScore={true}
              showMatchedFields={true}
              className="m-6"
            />
            
            {pagination.totalPages > 1 && (
              <SearchPagination
                pagination={pagination}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                showPageSizeSelector={true}
                showItemCount={true}
                showQuickJump={pagination.totalPages > 10}
                className="mx-6"
              />
            )}
          </div>
        ) : viewMode === 'board' ? (
          <div className="p-6">
            <TaskBoard
              tasks={tasks}
              onToggleStatus={toggleTaskStatus}
              onToggleStar={toggleStar}
              onEditTask={setEditingTask}
              onDeleteTask={deleteTask}
            />
          </div>
        ) : (
          <div className="p-6">
            {tasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Circle size={48} className="mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                <p className="text-gray-500">Create a new task to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <button
                          onClick={() => toggleTaskStatus(task.id)}
                          className="mt-1 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          {task.status === 'done' ? (
                            <CheckCircle size={20} className="text-green-600" />
                          ) : (
                            <Circle size={20} />
                          )}
                        </button>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className={`font-semibold ${task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {task.title}
                            </h3>
                            {task.starred && (
                              <Star size={16} className="text-yellow-500 fill-current" />
                            )}
                          </div>
                          
                          <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                          
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                              {task.status.replace('-', ' ')}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            {task.tags?.map((tag) => (
                              <span key={tag} className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <User size={14} />
                              {task.assignee?.name}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar size={14} />
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                            </div>
                            {task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done' && (
                              <div className="flex items-center gap-1 text-red-500">
                                <AlertCircle size={14} />
                                Overdue
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleStar(task.id)}
                          className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                        >
                          <Star size={16} className={task.starred ? 'text-yellow-500 fill-current' : ''} />
                        </button>
                        <button
                          onClick={() => setEditingTask(task)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={showCreateModal || editingTask !== null}
        onClose={() => {
          setShowCreateModal(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        task={editingTask}
        mode={editingTask ? 'edit' : 'create'}
      />
    </div>
  );
};

export default TaskManager;