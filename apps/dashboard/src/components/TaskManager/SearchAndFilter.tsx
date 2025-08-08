import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  Calendar, 
  User, 
  Tag, 
  Star, 
  Clock,
  Save,
  Trash2,
  Plus,
  Settings,
  SortAsc,
  SortDesc,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, TaskStatus, TaskPriority } from '../../types/design-system';

// Search and filter types
export interface SearchQuery {
  text: string;
  fields: SearchField[];
  caseSensitive: boolean;
  wholeWords: boolean;
  regex: boolean;
}

export interface FilterCriteria {
  id: string;
  field: keyof Task | 'any';
  operator: FilterOperator;
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface SavedSearch {
  id: string;
  name: string;
  query: SearchQuery;
  filters: FilterCriteria[];
  createdAt: Date;
  lastUsed: Date;
  useCount: number;
}

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

export type SearchField = 'title' | 'description' | 'tags' | 'assignee' | 'comments' | 'all';
export type FilterOperator = 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'in' | 'notIn' | 'isEmpty' | 'isNotEmpty';
export type SortField = keyof Task;
export type SortOrder = 'asc' | 'desc';

interface SearchAndFilterProps {
  tasks: Task[];
  onSearchResults: (results: SearchResult[], pagination: PaginationConfig) => void;
  onFiltersChange: (filters: FilterCriteria[]) => void;
  onSavedSearchSelect: (savedSearch: SavedSearch) => void;
  savedSearches?: SavedSearch[];
  onSavedSearchCreate: (savedSearch: Omit<SavedSearch, 'id' | 'createdAt' | 'lastUsed' | 'useCount'>) => void;
  onSavedSearchDelete: (id: string) => void;
  className?: string;
  pageSize?: number;
  enableAdvancedSearch?: boolean;
  enableSavedSearches?: boolean;
  enableRealTimeSearch?: boolean;
  debounceMs?: number;
}

const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  tasks,
  onSearchResults,
  onFiltersChange,
  onSavedSearchSelect,
  savedSearches = [],
  onSavedSearchCreate,
  onSavedSearchDelete,
  className = '',
  pageSize = 20,
  enableAdvancedSearch = true,
  enableSavedSearches = true,
  enableRealTimeSearch = true,
  debounceMs = 300
}) => {
  // State management
  const [searchQuery, setSearchQuery] = useState<SearchQuery>({
    text: '',
    fields: ['all'],
    caseSensitive: false,
    wholeWords: false,
    regex: false
  });
  
  const [filters, setFilters] = useState<FilterCriteria[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // UI state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [showSaveSearchModal, setShowSaveSearchModal] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  
  // Refs for debouncing
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Search field options
  const searchFieldOptions: { value: SearchField; label: string }[] = [
    { value: 'all', label: 'All Fields' },
    { value: 'title', label: 'Title' },
    { value: 'description', label: 'Description' },
    { value: 'tags', label: 'Tags' },
    { value: 'assignee', label: 'Assignee' },
    { value: 'comments', label: 'Comments' }
  ];

  // Filter field options
  const filterFieldOptions = [
    { value: 'status', label: 'Status', type: 'select', options: ['todo', 'in-progress', 'review', 'done', 'blocked'] },
    { value: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'urgent'] },
    { value: 'assignee', label: 'Assignee', type: 'text' },
    { value: 'tags', label: 'Tags', type: 'multiselect' },
    { value: 'dueDate', label: 'Due Date', type: 'date' },
    { value: 'createdAt', label: 'Created Date', type: 'date' },
    { value: 'updatedAt', label: 'Updated Date', type: 'date' },
    { value: 'estimatedHours', label: 'Estimated Hours', type: 'number' },
    { value: 'actualHours', label: 'Actual Hours', type: 'number' }
  ];

  // Operator options based on field type
  const getOperatorOptions = (fieldType: string): { value: FilterOperator; label: string }[] => {
    switch (fieldType) {
      case 'text':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'contains', label: 'Contains' },
          { value: 'startsWith', label: 'Starts With' },
          { value: 'endsWith', label: 'Ends With' },
          { value: 'isEmpty', label: 'Is Empty' },
          { value: 'isNotEmpty', label: 'Is Not Empty' }
        ];
      case 'select':
      case 'multiselect':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'in', label: 'In' },
          { value: 'notIn', label: 'Not In' }
        ];
      case 'number':
      case 'date':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'greaterThan', label: 'Greater Than' },
          { value: 'lessThan', label: 'Less Than' },
          { value: 'between', label: 'Between' }
        ];
      default:
        return [{ value: 'equals', label: 'Equals' }];
    }
  };

  // Highlight text function
  const highlightText = useCallback((text: string, searchTerm: string, caseSensitive: boolean = false): string => {
    if (!searchTerm || !text) return text;
    
    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, flags);
    
    return text.replace(regex, '<mark class="bg-yellow-200 text-yellow-900 px-1 rounded">$1</mark>');
  }, []);

  // Calculate relevance score
  const calculateRelevanceScore = useCallback((task: Task, query: SearchQuery): number => {
    let score = 0;
    const searchTerm = query.text.toLowerCase();
    
    if (!searchTerm) return 1;

    // Title matches get highest score
    if (task.title.toLowerCase().includes(searchTerm)) {
      score += 10;
      if (task.title.toLowerCase().startsWith(searchTerm)) score += 5;
    }

    // Description matches
    if (task.description?.toLowerCase().includes(searchTerm)) {
      score += 5;
    }

    // Tag matches
    if (task.tags?.some(tag => tag.toLowerCase().includes(searchTerm))) {
      score += 3;
    }

    // Assignee matches
    if (task.assignee?.name.toLowerCase().includes(searchTerm)) {
      score += 2;
    }

    // Boost score for exact matches
    if (task.title.toLowerCase() === searchTerm) score += 20;

    // Boost score for recent tasks
    const daysSinceUpdate = (Date.now() - new Date(task.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 7) score += 2;
    if (daysSinceUpdate < 1) score += 3;

    return score;
  }, []);

  // Apply filters to tasks
  const applyFilters = useCallback((tasks: Task[], filters: FilterCriteria[]): Task[] => {
    if (filters.length === 0) return tasks;

    return tasks.filter(task => {
      let result = true;
      let currentGroup: FilterCriteria[] = [];
      
      // Group filters by logical operators
      for (let i = 0; i < filters.length; i++) {
        const filter = filters[i];
        currentGroup.push(filter);
        
        // Process group when we hit an OR operator or reach the end
        if (filter.logicalOperator === 'OR' || i === filters.length - 1) {
          const groupResult = currentGroup.some(f => evaluateFilter(task, f));
          
          if (i === 0 || filters[i - currentGroup.length]?.logicalOperator === 'AND') {
            result = result && groupResult;
          } else {
            result = result || groupResult;
          }
          
          currentGroup = [];
        }
      }
      
      return result;
    });
  }, []);

  // Evaluate individual filter
  const evaluateFilter = (task: Task, filter: FilterCriteria): boolean => {
    const fieldValue = getFieldValue(task, filter.field);
    const filterValue = filter.value;

    switch (filter.operator) {
      case 'equals':
        return fieldValue === filterValue;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase());
      case 'startsWith':
        return String(fieldValue).toLowerCase().startsWith(String(filterValue).toLowerCase());
      case 'endsWith':
        return String(fieldValue).toLowerCase().endsWith(String(filterValue).toLowerCase());
      case 'greaterThan':
        return fieldValue > filterValue;
      case 'lessThan':
        return fieldValue < filterValue;
      case 'between':
        return fieldValue >= filterValue[0] && fieldValue <= filterValue[1];
      case 'in':
        return Array.isArray(filterValue) && filterValue.includes(fieldValue);
      case 'notIn':
        return Array.isArray(filterValue) && !filterValue.includes(fieldValue);
      case 'isEmpty':
        return !fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0);
      case 'isNotEmpty':
        return fieldValue && (!Array.isArray(fieldValue) || fieldValue.length > 0);
      default:
        return true;
    }
  };

  // Get field value from task
  const getFieldValue = (task: Task, field: keyof Task | 'any'): any => {
    if (field === 'any') return task;
    return task[field as keyof Task];
  };

  // Perform search with debouncing
  const performSearch = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      let filteredTasks = applyFilters(tasks, filters);
      let searchResults: SearchResult[] = [];

      if (searchQuery.text) {
        searchResults = filteredTasks
          .map(task => {
            const relevanceScore = calculateRelevanceScore(task, searchQuery);
            const matchedFields: string[] = [];
            const highlights: Record<string, string> = {};

            // Check which fields match and create highlights
            if (searchQuery.fields.includes('all') || searchQuery.fields.includes('title')) {
              if (task.title.toLowerCase().includes(searchQuery.text.toLowerCase())) {
                matchedFields.push('title');
                highlights.title = highlightText(task.title, searchQuery.text, searchQuery.caseSensitive);
              }
            }

            if (searchQuery.fields.includes('all') || searchQuery.fields.includes('description')) {
              if (task.description?.toLowerCase().includes(searchQuery.text.toLowerCase())) {
                matchedFields.push('description');
                highlights.description = highlightText(task.description, searchQuery.text, searchQuery.caseSensitive);
              }
            }

            if (searchQuery.fields.includes('all') || searchQuery.fields.includes('tags')) {
              const matchingTags = task.tags?.filter(tag => 
                tag.toLowerCase().includes(searchQuery.text.toLowerCase())
              );
              if (matchingTags && matchingTags.length > 0) {
                matchedFields.push('tags');
                highlights.tags = matchingTags.map(tag => 
                  highlightText(tag, searchQuery.text, searchQuery.caseSensitive)
                ).join(', ');
              }
            }

            return {
              task,
              relevanceScore,
              matchedFields,
              highlights
            };
          })
          .filter(result => result.matchedFields.length > 0 || !searchQuery.text)
          .sort((a, b) => b.relevanceScore - a.relevanceScore);
      } else {
        searchResults = filteredTasks.map(task => ({
          task,
          relevanceScore: 1,
          matchedFields: [],
          highlights: {}
        }));
      }

      // Apply sorting
      searchResults.sort((a, b) => {
        const aValue = getFieldValue(a.task, sortField);
        const bValue = getFieldValue(b.task, sortField);
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Calculate pagination
      const totalItems = searchResults.length;
      const totalPages = Math.ceil(totalItems / pageSize);
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedResults = searchResults.slice(startIndex, endIndex);

      const pagination: PaginationConfig = {
        page: currentPage,
        pageSize,
        totalItems,
        totalPages
      };

      onSearchResults(paginatedResults, pagination);
    }, enableRealTimeSearch ? debounceMs : 0);
  }, [
    tasks, 
    filters, 
    searchQuery, 
    currentPage, 
    sortField, 
    sortOrder, 
    pageSize, 
    enableRealTimeSearch, 
    debounceMs,
    applyFilters,
    calculateRelevanceScore,
    highlightText,
    onSearchResults
  ]);

  // Effect to trigger search when dependencies change
  useEffect(() => {
    performSearch();
  }, [performSearch]);

  // Effect to notify parent of filter changes
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  // Add new filter
  const addFilter = () => {
    const newFilter: FilterCriteria = {
      id: Date.now().toString(),
      field: 'status',
      operator: 'equals',
      value: '',
      logicalOperator: filters.length > 0 ? 'AND' : undefined
    };
    setFilters([...filters, newFilter]);
  };

  // Update filter
  const updateFilter = (id: string, updates: Partial<FilterCriteria>) => {
    setFilters(filters.map(filter => 
      filter.id === id ? { ...filter, ...updates } : filter
    ));
  };

  // Remove filter
  const removeFilter = (id: string) => {
    setFilters(filters.filter(filter => filter.id !== id));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters([]);
    setSearchQuery({
      text: '',
      fields: ['all'],
      caseSensitive: false,
      wholeWords: false,
      regex: false
    });
    setCurrentPage(1);
  };

  // Save current search
  const saveCurrentSearch = () => {
    if (!saveSearchName.trim()) return;

    const savedSearch: Omit<SavedSearch, 'id' | 'createdAt' | 'lastUsed' | 'useCount'> = {
      name: saveSearchName.trim(),
      query: searchQuery,
      filters: filters
    };

    onSavedSearchCreate(savedSearch);
    setSaveSearchName('');
    setShowSaveSearchModal(false);
  };

  // Load saved search
  const loadSavedSearch = (savedSearch: SavedSearch) => {
    setSearchQuery(savedSearch.query);
    setFilters(savedSearch.filters);
    setCurrentPage(1);
    onSavedSearchSelect(savedSearch);
    setShowSavedSearches(false);
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Main Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search tasks..."
              value={searchQuery.text}
              onChange={(e) => setSearchQuery({ ...searchQuery, text: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery.text && (
              <button
                onClick={() => setSearchQuery({ ...searchQuery, text: '' })}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`px-3 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
              showFilterPanel || filters.length > 0
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter size={16} />
            Filters
            {filters.length > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                {filters.length}
              </span>
            )}
          </button>

          {enableAdvancedSearch && (
            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className={`px-3 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
                showAdvancedSearch
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Settings size={16} />
              Advanced
            </button>
          )}

          {enableSavedSearches && (
            <button
              onClick={() => setShowSavedSearches(!showSavedSearches)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <Star size={16} />
              Saved
            </button>
          )}

          <button
            onClick={clearFilters}
            className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
            title="Clear all filters"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Advanced Search Panel */}
      <AnimatePresence>
        {showAdvancedSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-200 overflow-hidden"
          >
            <div className="p-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search In
                  </label>
                  <select
                    multiple
                    value={searchQuery.fields}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, option => option.value as SearchField);
                      setSearchQuery({ ...searchQuery, fields: values });
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {searchFieldOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Options
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={searchQuery.caseSensitive}
                        onChange={(e) => setSearchQuery({ ...searchQuery, caseSensitive: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Case sensitive</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={searchQuery.wholeWords}
                        onChange={(e) => setSearchQuery({ ...searchQuery, wholeWords: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Whole words only</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={searchQuery.regex}
                        onChange={(e) => setSearchQuery({ ...searchQuery, regex: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Regular expression</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={sortField}
                      onChange={(e) => setSortField(e.target.value as SortField)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="updatedAt">Updated Date</option>
                      <option value="createdAt">Created Date</option>
                      <option value="dueDate">Due Date</option>
                      <option value="title">Title</option>
                      <option value="priority">Priority</option>
                      <option value="status">Status</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                    >
                      {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilterPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-200 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Filters</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={addFilter}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 text-sm"
                  >
                    <Plus size={14} />
                    Add Filter
                  </button>
                  {(searchQuery.text || filters.length > 0) && (
                    <button
                      onClick={() => setShowSaveSearchModal(true)}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1 text-sm"
                    >
                      <Save size={14} />
                      Save Search
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {filters.map((filter, index) => (
                  <FilterRow
                    key={filter.id}
                    filter={filter}
                    index={index}
                    filterFieldOptions={filterFieldOptions}
                    onUpdate={(updates) => updateFilter(filter.id, updates)}
                    onRemove={() => removeFilter(filter.id)}
                    showLogicalOperator={index > 0}
                  />
                ))}

                {filters.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Filter size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No filters applied</p>
                    <p className="text-sm">Click "Add Filter" to start filtering tasks</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Searches Panel */}
      <AnimatePresence>
        {showSavedSearches && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-200 overflow-hidden"
          >
            <div className="p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Saved Searches</h3>
              
              {savedSearches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Star size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No saved searches</p>
                  <p className="text-sm">Create a search and save it for quick access</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedSearches.map(savedSearch => (
                    <div
                      key={savedSearch.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 cursor-pointer" onClick={() => loadSavedSearch(savedSearch)}>
                        <h4 className="font-medium text-gray-900">{savedSearch.name}</h4>
                        <div className="text-sm text-gray-500 mt-1">
                          {savedSearch.query.text && (
                            <span className="mr-3">Query: "{savedSearch.query.text}"</span>
                          )}
                          {savedSearch.filters.length > 0 && (
                            <span className="mr-3">{savedSearch.filters.length} filters</span>
                          )}
                          <span>Used {savedSearch.useCount} times</span>
                        </div>
                      </div>
                      <button
                        onClick={() => onSavedSearchDelete(savedSearch.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Search Modal */}
      <AnimatePresence>
        {showSaveSearchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowSaveSearchModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium text-gray-900 mb-4">Save Search</h3>
              <input
                type="text"
                placeholder="Enter search name..."
                value={saveSearchName}
                onChange={(e) => setSaveSearchName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowSaveSearchModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCurrentSearch}
                  disabled={!saveSearchName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Filter Row Component
interface FilterRowProps {
  filter: FilterCriteria;
  index: number;
  filterFieldOptions: any[];
  onUpdate: (updates: Partial<FilterCriteria>) => void;
  onRemove: () => void;
  showLogicalOperator: boolean;
}

const FilterRow: React.FC<FilterRowProps> = ({
  filter,
  index,
  filterFieldOptions,
  onUpdate,
  onRemove,
  showLogicalOperator
}) => {
  const fieldOption = filterFieldOptions.find(option => option.value === filter.field);
  const operatorOptions = fieldOption ? getOperatorOptions(fieldOption.type) : [];

  const getOperatorOptions = (fieldType: string): { value: FilterOperator; label: string }[] => {
    switch (fieldType) {
      case 'text':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'contains', label: 'Contains' },
          { value: 'startsWith', label: 'Starts With' },
          { value: 'endsWith', label: 'Ends With' },
          { value: 'isEmpty', label: 'Is Empty' },
          { value: 'isNotEmpty', label: 'Is Not Empty' }
        ];
      case 'select':
      case 'multiselect':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'in', label: 'In' },
          { value: 'notIn', label: 'Not In' }
        ];
      case 'number':
      case 'date':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'greaterThan', label: 'Greater Than' },
          { value: 'lessThan', label: 'Less Than' },
          { value: 'between', label: 'Between' }
        ];
      default:
        return [{ value: 'equals', label: 'Equals' }];
    }
  };

  const renderValueInput = () => {
    if (!fieldOption) return null;

    switch (fieldOption.type) {
      case 'select':
        return (
          <select
            value={filter.value}
            onChange={(e) => onUpdate({ value: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select...</option>
            {fieldOption.options.map((option: string) => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        );
      
      case 'multiselect':
        return (
          <select
            multiple
            value={Array.isArray(filter.value) ? filter.value : []}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, option => option.value);
              onUpdate({ value: values });
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {fieldOption.options.map((option: string) => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        );
      
      case 'date':
        return (
          <input
            type="date"
            value={filter.value}
            onChange={(e) => onUpdate({ value: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={filter.value}
            onChange={(e) => onUpdate({ value: parseFloat(e.target.value) || 0 })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );
      
      default:
        return (
          <input
            type="text"
            value={filter.value}
            onChange={(e) => onUpdate({ value: e.target.value })}
            placeholder="Enter value..."
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
    >
      {showLogicalOperator && (
        <select
          value={filter.logicalOperator || 'AND'}
          onChange={(e) => onUpdate({ logicalOperator: e.target.value as 'AND' | 'OR' })}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        >
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>
      )}

      <select
        value={filter.field}
        onChange={(e) => onUpdate({ field: e.target.value as keyof Task })}
        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {filterFieldOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <select
        value={filter.operator}
        onChange={(e) => onUpdate({ operator: e.target.value as FilterOperator })}
        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {operatorOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {!['isEmpty', 'isNotEmpty'].includes(filter.operator) && (
        <div className="flex-1">
          {renderValueInput()}
        </div>
      )}

      <button
        onClick={onRemove}
        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
        title="Remove filter"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
};

export default SearchAndFilter;