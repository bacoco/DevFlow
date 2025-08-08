/**
 * Global Search Component
 * Intelligent search with autocomplete, keyboard shortcuts, and multiple providers
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Command, 
  X, 
  Clock, 
  TrendingUp,
  Filter,
  ArrowRight,
  Loader2,
  FileText,
  Users,
  Settings,
  BarChart3,
  CheckSquare,
  Hash
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { 
  useNavigationStore, 
  useSearchState 
} from './NavigationController';
import { 
  SearchResult, 
  SearchSuggestion, 
  SearchProvider, 
  SearchResultType 
} from './types';

interface GlobalSearchProps {
  className?: string;
  placeholder?: string;
  showShortcut?: boolean;
  maxResults?: number;
  enableFilters?: boolean;
  onResultSelect?: (result: SearchResult) => void;
}

// Search result type icons
const resultTypeIcons: Record<SearchResultType, React.ComponentType<any>> = {
  page: FileText,
  task: CheckSquare,
  user: Users,
  team: Users,
  dashboard: BarChart3,
  widget: BarChart3,
  report: FileText,
  setting: Settings,
  help: FileText,
  command: Hash,
};

// Mock search providers (in a real app, these would be separate services)
const createMockSearchProviders = (): SearchProvider[] => [
  {
    id: 'pages',
    name: 'Pages',
    icon: FileText,
    priority: 10,
    search: async (query: string): Promise<SearchResult[]> => {
      const pages = [
        { id: 'dashboard', title: 'Dashboard', url: '/', type: 'page' as const },
        { id: 'tasks', title: 'Tasks', url: '/tasks', type: 'page' as const },
        { id: 'analytics', title: 'Analytics', url: '/analytics', type: 'page' as const },
        { id: 'team', title: 'Team', url: '/team', type: 'page' as const },
        { id: 'settings', title: 'Settings', url: '/settings', type: 'page' as const },
      ];

      return pages
        .filter(page => 
          page.title.toLowerCase().includes(query.toLowerCase())
        )
        .map(page => ({
          id: page.id,
          title: page.title,
          description: `Navigate to ${page.title}`,
          type: page.type,
          category: 'Navigation',
          url: page.url,
          icon: resultTypeIcons[page.type],
          relevance: page.title.toLowerCase().startsWith(query.toLowerCase()) ? 1 : 0.5,
          actions: [
            {
              id: 'navigate',
              label: 'Go to page',
              icon: ArrowRight,
              handler: (result) => console.log('Navigate to', result.url),
              primary: true,
            },
          ],
        }));
    },
    getSuggestions: async (partial: string): Promise<SearchSuggestion[]> => {
      const suggestions = ['dashboard', 'tasks', 'analytics', 'team', 'settings'];
      return suggestions
        .filter(s => s.includes(partial.toLowerCase()))
        .map(s => ({
          id: s,
          text: s,
          type: 'query' as const,
          category: 'Pages',
          icon: Search,
        }));
    },
  },
  {
    id: 'tasks',
    name: 'Tasks',
    icon: CheckSquare,
    priority: 9,
    search: async (query: string): Promise<SearchResult[]> => {
      const tasks = [
        { id: 'task-1', title: 'Fix navigation bug', status: 'In Progress' },
        { id: 'task-2', title: 'Update dashboard design', status: 'Todo' },
        { id: 'task-3', title: 'Implement search feature', status: 'Done' },
        { id: 'task-4', title: 'Write documentation', status: 'In Review' },
      ];

      return tasks
        .filter(task => 
          task.title.toLowerCase().includes(query.toLowerCase())
        )
        .map(task => ({
          id: task.id,
          title: task.title,
          description: `Status: ${task.status}`,
          type: 'task' as const,
          category: 'Tasks',
          url: `/tasks/${task.id}`,
          icon: CheckSquare,
          relevance: task.title.toLowerCase().includes(query.toLowerCase()) ? 0.8 : 0.4,
          metadata: { status: task.status },
          actions: [
            {
              id: 'view',
              label: 'View task',
              icon: ArrowRight,
              handler: (result) => console.log('View task', result.id),
              primary: true,
            },
          ],
        }));
    },
    getSuggestions: async (partial: string): Promise<SearchSuggestion[]> => {
      return [
        { id: 'filter-status', text: 'status:', type: 'filter' as const, description: 'Filter by status' },
        { id: 'filter-assignee', text: 'assignee:', type: 'filter' as const, description: 'Filter by assignee' },
      ].filter(s => s.text.includes(partial.toLowerCase()));
    },
  },
  {
    id: 'users',
    name: 'Users',
    icon: Users,
    priority: 8,
    search: async (query: string): Promise<SearchResult[]> => {
      const users = [
        { id: 'user-1', name: 'John Doe', email: 'john@example.com', role: 'Developer' },
        { id: 'user-2', name: 'Jane Smith', email: 'jane@example.com', role: 'Designer' },
        { id: 'user-3', name: 'Bob Johnson', email: 'bob@example.com', role: 'Manager' },
      ];

      return users
        .filter(user => 
          user.name.toLowerCase().includes(query.toLowerCase()) ||
          user.email.toLowerCase().includes(query.toLowerCase())
        )
        .map(user => ({
          id: user.id,
          title: user.name,
          description: `${user.role} • ${user.email}`,
          type: 'user' as const,
          category: 'People',
          url: `/team/${user.id}`,
          icon: Users,
          relevance: user.name.toLowerCase().startsWith(query.toLowerCase()) ? 0.9 : 0.6,
          metadata: { email: user.email, role: user.role },
        }));
    },
    getSuggestions: async (): Promise<SearchSuggestion[]> => [],
  },
];

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  className,
  placeholder = 'Search...',
  showShortcut = true,
  maxResults = 10,
  enableFilters = true,
  onResultSelect,
}) => {
  const {
    openSearch,
    closeSearch,
    setSearchQuery,
    performSearch,
    selectSearchResult,
    registerSearchProvider,
  } = useNavigationStore();
  
  const searchState = useSearchState();
  const [localQuery, setLocalQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Initialize search providers
  useEffect(() => {
    const providers = createMockSearchProviders();
    providers.forEach(provider => registerSearchProvider(provider));
  }, [registerSearchProvider]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        openSearch();
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      
      // Escape to close search
      if (event.key === 'Escape' && searchState.isOpen) {
        closeSearch();
        setLocalQuery('');
        setSelectedIndex(-1);
      }
      
      // Arrow navigation
      if (searchState.isOpen && searchState.results.length > 0) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedIndex(prev => 
            prev < searchState.results.length - 1 ? prev + 1 : 0
          );
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : searchState.results.length - 1
          );
        } else if (event.key === 'Enter' && selectedIndex >= 0) {
          event.preventDefault();
          handleResultSelect(searchState.results[selectedIndex]);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchState.isOpen, searchState.results, selectedIndex, openSearch, closeSearch]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setSearchQuery(query);
      performSearch(query);
    }, 300),
    [setSearchQuery, performSearch]
  );

  // Handle input change
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setLocalQuery(query);
    setSelectedIndex(-1);
    
    if (query.trim()) {
      debouncedSearch(query);
    } else {
      setSearchQuery('');
    }
  };

  // Handle result selection
  const handleResultSelect = (result: SearchResult) => {
    // Add to recent searches
    setRecentSearches(prev => [
      localQuery,
      ...prev.filter(q => q !== localQuery).slice(0, 4)
    ]);
    
    // Navigate or execute action
    if (result.url) {
      window.location.href = result.url;
    }
    
    onResultSelect?.(result);
    closeSearch();
    setLocalQuery('');
    setSelectedIndex(-1);
  };

  // Handle suggestion select
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'filter') {
      setLocalQuery(prev => prev + suggestion.text);
      inputRef.current?.focus();
    } else {
      setLocalQuery(suggestion.text);
      debouncedSearch(suggestion.text);
    }
  };

  // Parse filters from query
  const parseFilters = (query: string) => {
    const filters: Record<string, string> = {};
    const filterRegex = /(\w+):(\w+)/g;
    let match;
    
    while ((match = filterRegex.exec(query)) !== null) {
      filters[match[1]] = match[2];
    }
    
    return filters;
  };

  // Filter results based on active filters
  const filteredResults = searchState.results
    .filter(result => {
      const filters = parseFilters(localQuery);
      
      // Apply filters
      for (const [key, value] of Object.entries(filters)) {
        if (key === 'type' && result.type !== value) return false;
        if (key === 'category' && result.category.toLowerCase() !== value.toLowerCase()) return false;
        // Add more filter logic as needed
      }
      
      return true;
    })
    .slice(0, maxResults);

  return (
    <>
      {/* Search Input */}
      <div className={cn('relative', className)}>
        <div className="relative">
          <Search 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
            size={16} 
          />
          <input
            ref={inputRef}
            type="text"
            placeholder={showShortcut ? `${placeholder} (⌘K)` : placeholder}
            value={localQuery}
            onChange={handleInputChange}
            onFocus={openSearch}
            className={cn(
              'w-full pl-10 pr-12 py-2 rounded-lg transition-all duration-200',
              'bg-gray-100 dark:bg-gray-800',
              'border border-transparent',
              'text-gray-900 dark:text-gray-100',
              'placeholder-gray-500 dark:placeholder-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'focus:bg-white dark:focus:bg-gray-700',
              searchState.isOpen && 'ring-2 ring-blue-500 bg-white dark:bg-gray-700'
            )}
          />
          
          {/* Loading indicator */}
          {searchState.loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Loader2 size={16} className="animate-spin text-gray-400" />
            </div>
          )}
          
          {/* Clear button */}
          {localQuery && !searchState.loading && (
            <button
              onClick={() => {
                setLocalQuery('');
                setSearchQuery('');
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={16} />
            </button>
          )}
          
          {/* Shortcut indicator */}
          {!localQuery && !searchState.loading && showShortcut && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1 text-xs text-gray-400">
              <Command size={12} />
              <span>K</span>
            </div>
          )}
        </div>
      </div>

      {/* Search Results Overlay */}
      <AnimatePresence>
        {searchState.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            onClick={closeSearch}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={cn(
                'absolute top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl',
                'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                'rounded-lg shadow-xl overflow-hidden'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  <Search size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {localQuery ? `Results for "${localQuery}"` : 'Search everything'}
                  </span>
                </div>
                
                {enableFilters && (
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                      'p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700',
                      showFilters && 'bg-gray-100 dark:bg-gray-700'
                    )}
                  >
                    <Filter size={16} />
                  </button>
                )}
              </div>

              {/* Filters */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-b border-gray-200 dark:border-gray-700 p-4"
                  >
                    <div className="flex flex-wrap gap-2">
                      {['page', 'task', 'user', 'setting'].map(type => (
                        <button
                          key={type}
                          onClick={() => {
                            const newQuery = localQuery.includes(`type:${type}`) 
                              ? localQuery.replace(`type:${type}`, '').trim()
                              : `${localQuery} type:${type}`.trim();
                            setLocalQuery(newQuery);
                            debouncedSearch(newQuery);
                          }}
                          className={cn(
                            'px-3 py-1 text-xs rounded-full border transition-colors',
                            localQuery.includes(`type:${type}`)
                              ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                              : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Results */}
              <div ref={resultsRef} className="max-h-96 overflow-y-auto">
                {!localQuery && recentSearches.length > 0 && (
                  <div className="p-4">
                    <div className="flex items-center space-x-2 mb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <Clock size={12} />
                      <span>Recent Searches</span>
                    </div>
                    <div className="space-y-1">
                      {recentSearches.map((search, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setLocalQuery(search);
                            debouncedSearch(search);
                          }}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <span className="text-sm text-gray-700 dark:text-gray-300">{search}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {localQuery && filteredResults.length === 0 && !searchState.loading && (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    <Search size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No results found for "{localQuery}"</p>
                    <p className="text-sm mt-1">Try adjusting your search terms</p>
                  </div>
                )}

                {filteredResults.length > 0 && (
                  <div className="py-2">
                    {filteredResults.map((result, index) => {
                      const Icon = result.icon as React.ComponentType<{ size?: number; className?: string }>;
                      const isSelected = index === selectedIndex;
                      
                      return (
                        <motion.button
                          key={result.id}
                          onClick={() => handleResultSelect(result)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={cn(
                            'w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors',
                            isSelected 
                              ? 'bg-blue-50 dark:bg-blue-900/20' 
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                          )}
                          whileHover={{ x: 4 }}
                        >
                          {Icon && (
                            <Icon 
                              size={16} 
                              className={cn(
                                'flex-shrink-0',
                                isSelected ? 'text-blue-500' : 'text-gray-400'
                              )} 
                            />
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'font-medium truncate',
                              isSelected 
                                ? 'text-blue-700 dark:text-blue-300' 
                                : 'text-gray-900 dark:text-gray-100'
                            )}>
                              {result.title}
                            </p>
                            {result.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {result.description}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                              {result.category}
                            </span>
                            {isSelected && (
                              <ArrowRight size={14} className="text-blue-500" />
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {/* Suggestions */}
                {searchState.suggestions.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center space-x-2 mb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <TrendingUp size={12} />
                      <span>Suggestions</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {searchState.suggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          onClick={() => handleSuggestionSelect(suggestion)}
                          className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          {suggestion.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-4">
                  <span>↑↓ Navigate</span>
                  <span>↵ Select</span>
                  <span>Esc Close</span>
                </div>
                <span>{filteredResults.length} results</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}