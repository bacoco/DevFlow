import React, { useState } from 'react';
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
  Tag as TagIcon,
  Search,
  TrendingUp,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '../../types/design-system';

export interface SearchResult {
  task: Task;
  relevanceScore: number;
  matchedFields: string[];
  highlights: Record<string, string>;
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface SearchResultsProps {
  results: SearchResult[];
  pagination: PaginationConfig;
  onTaskAction: (taskId: string, action: 'toggle' | 'star' | 'edit' | 'delete' | 'view') => void;
  onTaskSelect?: (taskId: string, selected: boolean) => void;
  selectedTasks?: Set<string>;
  viewMode?: 'list' | 'grid' | 'compact';
  showRelevanceScore?: boolean;
  showMatchedFields?: boolean;
  className?: string;
  loading?: boolean;
  error?: string;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  pagination,
  onTaskAction,
  onTaskSelect,
  selectedTasks = new Set(),
  viewMode = 'list',
  showRelevanceScore = false,
  showMatchedFields = true,
  className = '',
  loading = false,
  error
}) => {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
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
      case 'done': return 'text-green-600 bg-green-50 border-green-200';
      case 'in-progress': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'review': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'blocked': return 'text-red-600 bg-red-50 border-red-200';
      case 'todo': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle size={18} className="text-green-600" />;
      case 'in-progress': return <Clock size={18} className="text-blue-600" />;
      case 'review': return <Eye size={18} className="text-purple-600" />;
      case 'blocked': return <AlertCircle size={18} className="text-red-600" />;
      default: return <Circle size={18} className="text-gray-400" />;
    }
  };

  const isOverdue = (dueDate?: Date, status?: string) => {
    if (!dueDate || status === 'done') return false;
    return new Date(dueDate) < new Date();
  };

  const formatRelevanceScore = (score: number): string => {
    return `${Math.round(score * 10) / 10}`;
  };

  const renderHighlightedText = (text: string, highlights: string) => {
    if (!highlights) return text;
    return <span dangerouslySetInnerHTML={{ __html: highlights }} />;
  };

  const renderMatchedFields = (matchedFields: string[]) => {
    if (!showMatchedFields || matchedFields.length === 0) return null;

    return (
      <div className="flex items-center gap-1 mt-2">
        <Search size={12} className="text-gray-400" />
        <span className="text-xs text-gray-500">
          Matched in: {matchedFields.map(field => field.charAt(0).toUpperCase() + field.slice(1)).join(', ')}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Searching tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-red-200 ${className}`}>
        <div className="p-8 text-center">
          <AlertCircle size={32} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-900 mb-2">Search Error</h3>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
        <div className="p-8 text-center">
          <Search size={32} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-500">Try adjusting your search terms or filters</p>
        </div>
      </div>
    );
  }

  const renderListView = () => (
    <div className="space-y-4">
      {results.map((result, index) => {
        const { task, relevanceScore, matchedFields, highlights } = result;
        const isSelected = selectedTasks.has(task.id);
        const isExpanded = expandedTasks.has(task.id);

        return (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-all duration-200 ${
              isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {onTaskSelect && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onTaskSelect(task.id, e.target.checked)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                )}

                <button
                  onClick={() => onTaskAction(task.id, 'toggle')}
                  className="mt-1 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  {getStatusIcon(task.status)}
                </button>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`font-semibold ${task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {highlights.title ? (
                        renderHighlightedText(task.title, highlights.title)
                      ) : (
                        task.title
                      )}
                    </h3>
                    
                    {showRelevanceScore && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <TrendingUp size={12} />
                        <span>{formatRelevanceScore(relevanceScore)}</span>
                      </div>
                    )}
                  </div>
                  
                  {task.description && (
                    <p className="text-gray-600 text-sm mb-3">
                      {highlights.description ? (
                        renderHighlightedText(
                          isExpanded ? task.description : task.description.slice(0, 150) + (task.description.length > 150 ? '...' : ''),
                          highlights.description
                        )
                      ) : (
                        isExpanded ? task.description : task.description.slice(0, 150) + (task.description.length > 150 ? '...' : '')
                      )}
                      {task.description.length > 150 && (
                        <button
                          onClick={() => toggleTaskExpansion(task.id)}
                          className="ml-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          {isExpanded ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                      {task.status.replace('-', ' ')}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    {task.tags?.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs">
                        {highlights.tags && highlights.tags.includes(tag) ? (
                          renderHighlightedText(tag, highlights.tags)
                        ) : (
                          tag
                        )}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {task.assignee && (
                      <div className="flex items-center gap-1">
                        <User size={14} />
                        <span>{task.assignee.name}</span>
                      </div>
                    )}
                    {task.dueDate && (
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                        {isOverdue(task.dueDate, task.status) && (
                          <AlertCircle size={14} className="text-red-500 ml-1" />
                        )}
                      </div>
                    )}
                    {task.comments && task.comments.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span>{task.comments.length} comments</span>
                      </div>
                    )}
                  </div>

                  {renderMatchedFields(matchedFields)}

                  {isOverdue(task.dueDate, task.status) && (
                    <div className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle size={12} />
                      Overdue
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onTaskAction(task.id, 'star')}
                  className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                >
                  <Star size={16} className={task.starred ? 'text-yellow-500 fill-current' : ''} />
                </button>
                <button
                  onClick={() => onTaskAction(task.id, 'view')}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => onTaskAction(task.id, 'edit')}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => onTaskAction(task.id, 'delete')}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {results.map((result, index) => {
        const { task, relevanceScore, matchedFields, highlights } = result;
        const isSelected = selectedTasks.has(task.id);

        return (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={`bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-all duration-200 ${
              isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {onTaskSelect && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onTaskSelect(task.id, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                )}
                <button
                  onClick={() => onTaskAction(task.id, 'toggle')}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                >
                  {getStatusIcon(task.status)}
                </button>
              </div>
              
              <div className="flex items-center gap-1">
                {showRelevanceScore && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <TrendingUp size={12} />
                    <span>{formatRelevanceScore(relevanceScore)}</span>
                  </div>
                )}
                <button
                  onClick={() => onTaskAction(task.id, 'star')}
                  className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                >
                  <Star size={14} className={task.starred ? 'text-yellow-500 fill-current' : ''} />
                </button>
              </div>
            </div>

            <h4 className={`font-medium mb-2 ${task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
              {highlights.title ? (
                renderHighlightedText(task.title, highlights.title)
              ) : (
                task.title
              )}
            </h4>
            
            {task.description && (
              <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                {highlights.description ? (
                  renderHighlightedText(task.description, highlights.description)
                ) : (
                  task.description
                )}
              </p>
            )}
            
            <div className="flex flex-wrap gap-1 mb-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
              {task.tags?.slice(0, 2).map((tag) => (
                <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                  {highlights.tags && highlights.tags.includes(tag) ? (
                    renderHighlightedText(tag, highlights.tags)
                  ) : (
                    tag
                  )}
                </span>
              ))}
              {task.tags && task.tags.length > 2 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                  +{task.tags.length - 2}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              {task.assignee && (
                <div className="flex items-center gap-1">
                  <User size={12} />
                  <span className="truncate">{task.assignee.name}</span>
                </div>
              )}
              {task.dueDate && (
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {renderMatchedFields(matchedFields)}

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                {task.status.replace('-', ' ')}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onTaskAction(task.id, 'view')}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Eye size={14} />
                </button>
                <button
                  onClick={() => onTaskAction(task.id, 'edit')}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit size={14} />
                </button>
                <button
                  onClick={() => onTaskAction(task.id, 'delete')}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  const renderCompactView = () => (
    <div className="space-y-2">
      {results.map((result, index) => {
        const { task, relevanceScore, matchedFields, highlights } = result;
        const isSelected = selectedTasks.has(task.id);

        return (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.02 }}
            className={`bg-white rounded-lg p-3 border border-gray-200 hover:shadow-sm transition-all duration-200 ${
              isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {onTaskSelect && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onTaskSelect(task.id, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                )}

                <button
                  onClick={() => onTaskAction(task.id, 'toggle')}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                >
                  {getStatusIcon(task.status)}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium truncate ${task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {highlights.title ? (
                        renderHighlightedText(task.title, highlights.title)
                      ) : (
                        task.title
                      )}
                    </h4>
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      {task.assignee && (
                        <span className="text-xs text-gray-500 truncate max-w-20">
                          {task.assignee.name}
                        </span>
                      )}
                      {showRelevanceScore && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <TrendingUp size={10} />
                          <span>{formatRelevanceScore(relevanceScore)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {renderMatchedFields(matchedFields)}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => onTaskAction(task.id, 'star')}
                  className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                >
                  <Star size={14} className={task.starred ? 'text-yellow-500 fill-current' : ''} />
                </button>
                <button
                  onClick={() => onTaskAction(task.id, 'view')}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Eye size={14} />
                </button>
                <button
                  onClick={() => onTaskAction(task.id, 'edit')}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-medium text-gray-900">
              Search Results ({pagination.totalItems})
            </h3>
            {pagination.totalItems > 0 && (
              <span className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {/* Toggle view mode */}}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="View options"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {viewMode === 'list' && renderListView()}
          {viewMode === 'grid' && renderGridView()}
          {viewMode === 'compact' && renderCompactView()}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SearchResults;