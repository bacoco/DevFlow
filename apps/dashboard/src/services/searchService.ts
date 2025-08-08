import { Task } from '../types/design-system';

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

class SearchService {
  private savedSearches: SavedSearch[] = [];
  private storageKey = 'task_saved_searches';

  constructor() {
    this.loadSavedSearches();
  }

  // Load saved searches from localStorage
  private loadSavedSearches(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.savedSearches = parsed.map((search: any) => ({
          ...search,
          createdAt: new Date(search.createdAt),
          lastUsed: new Date(search.lastUsed)
        }));
      }
    } catch (error) {
      console.error('Error loading saved searches:', error);
      this.savedSearches = [];
    }
  }

  // Save searches to localStorage
  private saveSavedSearches(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.savedSearches));
    } catch (error) {
      console.error('Error saving searches:', error);
    }
  }

  // Get all saved searches
  getSavedSearches(): SavedSearch[] {
    return [...this.savedSearches].sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
  }

  // Create a new saved search
  createSavedSearch(searchData: Omit<SavedSearch, 'id' | 'createdAt' | 'lastUsed' | 'useCount'>): SavedSearch {
    const savedSearch: SavedSearch = {
      ...searchData,
      id: Date.now().toString(),
      createdAt: new Date(),
      lastUsed: new Date(),
      useCount: 0
    };

    this.savedSearches.push(savedSearch);
    this.saveSavedSearches();
    return savedSearch;
  }

  // Update a saved search
  updateSavedSearch(id: string, updates: Partial<SavedSearch>): SavedSearch | null {
    const index = this.savedSearches.findIndex(search => search.id === id);
    if (index === -1) return null;

    this.savedSearches[index] = { ...this.savedSearches[index], ...updates };
    this.saveSavedSearches();
    return this.savedSearches[index];
  }

  // Delete a saved search
  deleteSavedSearch(id: string): boolean {
    const index = this.savedSearches.findIndex(search => search.id === id);
    if (index === -1) return false;

    this.savedSearches.splice(index, 1);
    this.saveSavedSearches();
    return true;
  }

  // Use a saved search (increment use count and update last used)
  useSavedSearch(id: string): SavedSearch | null {
    const search = this.savedSearches.find(s => s.id === id);
    if (!search) return null;

    search.useCount++;
    search.lastUsed = new Date();
    this.saveSavedSearches();
    return search;
  }

  // Search tasks with query and filters
  searchTasks(
    tasks: Task[],
    query: SearchQuery,
    filters: FilterCriteria[],
    sortField: keyof Task = 'updatedAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): SearchResult[] {
    let results: SearchResult[] = [];

    // Apply filters first
    let filteredTasks = this.applyFilters(tasks, filters);

    // Apply search query
    if (query.text) {
      results = filteredTasks
        .map(task => this.evaluateTaskMatch(task, query))
        .filter(result => result.matchedFields.length > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore);
    } else {
      results = filteredTasks.map(task => ({
        task,
        relevanceScore: 1,
        matchedFields: [],
        highlights: {}
      }));
    }

    // Apply sorting
    results.sort((a, b) => {
      const aValue = this.getFieldValue(a.task, sortField);
      const bValue = this.getFieldValue(b.task, sortField);
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return results;
  }

  // Apply filters to tasks
  private applyFilters(tasks: Task[], filters: FilterCriteria[]): Task[] {
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
          const groupResult = currentGroup.some(f => this.evaluateFilter(task, f));
          
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
  }

  // Evaluate individual filter
  private evaluateFilter(task: Task, filter: FilterCriteria): boolean {
    const fieldValue = this.getFieldValue(task, filter.field);
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
  }

  // Evaluate task match against search query
  private evaluateTaskMatch(task: Task, query: SearchQuery): SearchResult {
    const searchTerm = query.caseSensitive ? query.text : query.text.toLowerCase();
    const matchedFields: string[] = [];
    const highlights: Record<string, string> = {};
    let relevanceScore = 0;

    // Create regex pattern
    let pattern: RegExp;
    try {
      if (query.regex) {
        pattern = new RegExp(query.text, query.caseSensitive ? 'g' : 'gi');
      } else if (query.wholeWords) {
        const escapedTerm = query.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        pattern = new RegExp(`\\b${escapedTerm}\\b`, query.caseSensitive ? 'g' : 'gi');
      } else {
        const escapedTerm = query.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        pattern = new RegExp(escapedTerm, query.caseSensitive ? 'g' : 'gi');
      }
    } catch (error) {
      // Fallback to simple string matching if regex is invalid
      pattern = new RegExp(query.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), query.caseSensitive ? 'g' : 'gi');
    }

    // Check title
    if (query.fields.includes('all') || query.fields.includes('title')) {
      const titleText = query.caseSensitive ? task.title : task.title.toLowerCase();
      if (pattern.test(task.title)) {
        matchedFields.push('title');
        highlights.title = this.highlightText(task.title, pattern);
        relevanceScore += 10;
        if (titleText.startsWith(searchTerm)) relevanceScore += 5;
        if (titleText === searchTerm) relevanceScore += 20;
      }
    }

    // Check description
    if ((query.fields.includes('all') || query.fields.includes('description')) && task.description) {
      if (pattern.test(task.description)) {
        matchedFields.push('description');
        highlights.description = this.highlightText(task.description, pattern);
        relevanceScore += 5;
      }
    }

    // Check tags
    if ((query.fields.includes('all') || query.fields.includes('tags')) && task.tags) {
      const matchingTags = task.tags.filter(tag => pattern.test(tag));
      if (matchingTags.length > 0) {
        matchedFields.push('tags');
        highlights.tags = task.tags.map(tag => 
          pattern.test(tag) ? this.highlightText(tag, pattern) : tag
        ).join(', ');
        relevanceScore += 3 * matchingTags.length;
      }
    }

    // Check assignee
    if ((query.fields.includes('all') || query.fields.includes('assignee')) && task.assignee) {
      if (pattern.test(task.assignee.name)) {
        matchedFields.push('assignee');
        highlights.assignee = this.highlightText(task.assignee.name, pattern);
        relevanceScore += 2;
      }
    }

    // Check comments
    if ((query.fields.includes('all') || query.fields.includes('comments')) && task.comments) {
      const matchingComments = task.comments.filter(comment => pattern.test(comment.content));
      if (matchingComments.length > 0) {
        matchedFields.push('comments');
        relevanceScore += matchingComments.length;
      }
    }

    // Boost score for recent tasks
    const daysSinceUpdate = (Date.now() - new Date(task.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 7) relevanceScore += 2;
    if (daysSinceUpdate < 1) relevanceScore += 3;

    // Boost score for high priority tasks
    if (task.priority === 'urgent') relevanceScore += 3;
    if (task.priority === 'high') relevanceScore += 2;

    return {
      task,
      relevanceScore,
      matchedFields,
      highlights
    };
  }

  // Highlight matching text
  private highlightText(text: string, pattern: RegExp): string {
    return text.replace(pattern, '<mark class="bg-yellow-200 text-yellow-900 px-1 rounded">$&</mark>');
  }

  // Get field value from task
  private getFieldValue(task: Task, field: keyof Task | 'any'): any {
    if (field === 'any') return task;
    return task[field as keyof Task];
  }

  // Paginate search results
  paginateResults(results: SearchResult[], page: number, pageSize: number): {
    paginatedResults: SearchResult[];
    pagination: PaginationConfig;
  } {
    const totalItems = results.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedResults = results.slice(startIndex, endIndex);

    const pagination: PaginationConfig = {
      page,
      pageSize,
      totalItems,
      totalPages
    };

    return { paginatedResults, pagination };
  }

  // Get search suggestions based on existing tasks
  getSearchSuggestions(tasks: Task[], query: string, limit: number = 10): string[] {
    if (!query || query.length < 2) return [];

    const suggestions = new Set<string>();
    const queryLower = query.toLowerCase();

    tasks.forEach(task => {
      // Title suggestions
      if (task.title.toLowerCase().includes(queryLower)) {
        suggestions.add(task.title);
      }

      // Tag suggestions
      task.tags?.forEach(tag => {
        if (tag.toLowerCase().includes(queryLower)) {
          suggestions.add(tag);
        }
      });

      // Assignee suggestions
      if (task.assignee?.name.toLowerCase().includes(queryLower)) {
        suggestions.add(task.assignee.name);
      }
    });

    return Array.from(suggestions).slice(0, limit);
  }

  // Export search results
  exportSearchResults(results: SearchResult[], format: 'csv' | 'json'): string {
    if (format === 'json') {
      return JSON.stringify(results.map(r => r.task), null, 2);
    }

    // CSV format
    const headers = ['ID', 'Title', 'Description', 'Status', 'Priority', 'Assignee', 'Due Date', 'Tags', 'Relevance Score'];
    const rows = results.map(result => [
      result.task.id,
      `"${result.task.title.replace(/"/g, '""')}"`,
      `"${(result.task.description || '').replace(/"/g, '""')}"`,
      result.task.status,
      result.task.priority,
      result.task.assignee?.name || '',
      result.task.dueDate ? new Date(result.task.dueDate).toISOString().split('T')[0] : '',
      `"${(result.task.tags || []).join(', ')}"`,
      result.relevanceScore.toFixed(2)
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  // Clear all saved searches
  clearAllSavedSearches(): void {
    this.savedSearches = [];
    this.saveSavedSearches();
  }

  // Get search analytics
  getSearchAnalytics(): {
    totalSavedSearches: number;
    mostUsedSearch: SavedSearch | null;
    recentSearches: SavedSearch[];
    averageUseCount: number;
  } {
    const totalSavedSearches = this.savedSearches.length;
    const mostUsedSearch = this.savedSearches.reduce((prev, current) => 
      (prev.useCount > current.useCount) ? prev : current, this.savedSearches[0] || null
    );
    const recentSearches = [...this.savedSearches]
      .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
      .slice(0, 5);
    const averageUseCount = totalSavedSearches > 0 
      ? this.savedSearches.reduce((sum, search) => sum + search.useCount, 0) / totalSavedSearches 
      : 0;

    return {
      totalSavedSearches,
      mostUsedSearch,
      recentSearches,
      averageUseCount
    };
  }
}

export const searchService = new SearchService();
export default SearchService;