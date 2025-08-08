import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, FileText, Video, Code } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  section: string;
  type: 'guide' | 'video' | 'reference' | 'example';
  url: string;
  relevance: number;
}

interface DocumentationSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  onResults: (results: SearchResult[]) => void;
  context?: string;
}

export const DocumentationSearch: React.FC<DocumentationSearchProps> = ({
  query,
  onQueryChange,
  onResults,
  context
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mock documentation content for search
  const documentationContent = [
    {
      id: 'navigation-basics',
      title: 'Navigation Basics',
      excerpt: 'Learn how to navigate the dashboard efficiently with keyboard shortcuts and adaptive menus.',
      section: 'Getting Started',
      type: 'guide' as const,
      url: '/docs/navigation',
      keywords: ['navigation', 'menu', 'keyboard', 'shortcuts', 'breadcrumb']
    },
    {
      id: 'accessibility-features',
      title: 'Accessibility Features',
      excerpt: 'Comprehensive guide to accessibility features including screen reader support and keyboard navigation.',
      section: 'Accessibility',
      type: 'guide' as const,
      url: '/docs/accessibility',
      keywords: ['accessibility', 'screen reader', 'keyboard', 'a11y', 'wcag', 'contrast']
    },
    {
      id: 'mobile-optimization',
      title: 'Mobile Optimization',
      excerpt: 'How to use the dashboard effectively on mobile devices with touch gestures and responsive design.',
      section: 'Mobile',
      type: 'guide' as const,
      url: '/docs/mobile',
      keywords: ['mobile', 'touch', 'gestures', 'responsive', 'tablet', 'phone']
    },
    {
      id: 'personalization-setup',
      title: 'Setting Up Personalization',
      excerpt: 'Configure your dashboard to adapt to your workflow with smart defaults and layout recommendations.',
      section: 'Personalization',
      type: 'guide' as const,
      url: '/docs/personalization',
      keywords: ['personalization', 'customization', 'preferences', 'layout', 'widgets']
    },
    {
      id: 'chart-interactions',
      title: 'Interactive Charts Tutorial',
      excerpt: 'Learn to interact with charts using zoom, pan, brush, and drill-down features.',
      section: 'Data Visualization',
      type: 'video' as const,
      url: '/docs/charts/interactions',
      keywords: ['charts', 'visualization', 'zoom', 'pan', 'brush', 'interactive']
    },
    {
      id: 'collaboration-features',
      title: 'Collaboration Features',
      excerpt: 'Share insights, annotate dashboards, and collaborate with your team effectively.',
      section: 'Collaboration',
      type: 'guide' as const,
      url: '/docs/collaboration',
      keywords: ['collaboration', 'sharing', 'annotations', 'team', 'comments']
    },
    {
      id: 'performance-tips',
      title: 'Performance Optimization Tips',
      excerpt: 'Best practices for optimal dashboard performance and loading times.',
      section: 'Performance',
      type: 'reference' as const,
      url: '/docs/performance',
      keywords: ['performance', 'optimization', 'loading', 'speed', 'cache']
    },
    {
      id: 'error-handling',
      title: 'Error Handling and Recovery',
      excerpt: 'Understanding error messages and recovery options when things go wrong.',
      section: 'Troubleshooting',
      type: 'guide' as const,
      url: '/docs/errors',
      keywords: ['error', 'troubleshooting', 'recovery', 'debugging', 'issues']
    }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length > 0) {
      setIsLoading(true);
      const timeoutId = setTimeout(() => {
        performSearch(query);
        setIsLoading(false);
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      onResults([]);
      setSuggestions([]);
    }
  }, [query]);

  const performSearch = (searchQuery: string) => {
    const results = documentationContent
      .map(item => {
        const titleMatch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
        const excerptMatch = item.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
        const keywordMatch = item.keywords.some(keyword => 
          keyword.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        let relevance = 0;
        if (titleMatch) relevance += 3;
        if (excerptMatch) relevance += 2;
        if (keywordMatch) relevance += 1;
        
        // Boost relevance based on context
        if (context && item.section.toLowerCase().includes(context.toLowerCase())) {
          relevance += 2;
        }
        
        return relevance > 0 ? { ...item, relevance } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b!.relevance - a!.relevance)
      .slice(0, 10) as SearchResult[];

    onResults(results);
    
    // Generate suggestions based on partial matches
    const suggestions = documentationContent
      .filter(item => 
        item.keywords.some(keyword => 
          keyword.toLowerCase().startsWith(searchQuery.toLowerCase())
        )
      )
      .map(item => item.title)
      .slice(0, 5);
    
    setSuggestions(suggestions);
  };

  const handleSearch = (searchQuery: string) => {
    onQueryChange(searchQuery);
    if (searchQuery && !recentSearches.includes(searchQuery)) {
      setRecentSearches(prev => [searchQuery, ...prev.slice(0, 4)]);
    }
  };

  const clearSearch = () => {
    onQueryChange('');
    onResults([]);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Enter' && suggestions.length > 0) {
      handleSearch(suggestions[0]);
      setIsOpen(false);
    }
  };

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search documentation..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="Search documentation"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 
                      border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          
          {isLoading && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              <span className="ml-2">Searching...</span>
            </div>
          )}

          {!query && recentSearches.length > 0 && (
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Recent Searches
              </h3>
              <div className="space-y-1">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(search)}
                    className="block w-full text-left px-2 py-1 text-sm text-gray-600 dark:text-gray-400 
                             hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && suggestions.length > 0 && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Suggestions
              </h3>
              <div className="space-y-1">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(suggestion)}
                    className="block w-full text-left px-2 py-1 text-sm text-gray-600 dark:text-gray-400 
                             hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!query && !recentSearches.length && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Start typing to search documentation</p>
              <div className="mt-2 text-xs">
                Try: "accessibility", "mobile", "charts", "navigation"
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SearchResultIcon: React.FC<{ type: SearchResult['type'] }> = ({ type }) => {
  const icons = {
    guide: FileText,
    video: Video,
    reference: FileText,
    example: Code
  };
  
  const Icon = icons[type];
  return <Icon className="h-4 w-4" />;
};