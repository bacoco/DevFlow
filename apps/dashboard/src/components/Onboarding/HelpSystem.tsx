import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HelpContent } from './types';

interface HelpSystemProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

interface SearchResult extends HelpContent {
  relevanceScore: number;
  matchedKeywords: string[];
}

const mockHelpContent: HelpContent[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with DevFlow Dashboard',
    content: `
      <h3>Welcome to DevFlow Dashboard</h3>
      <p>This guide will help you get started with the developer productivity dashboard.</p>
      <h4>Key Features:</h4>
      <ul>
        <li>Real-time productivity metrics</li>
        <li>Code archaeology and analysis</li>
        <li>Task management and tracking</li>
        <li>Team collaboration tools</li>
      </ul>
      <h4>First Steps:</h4>
      <ol>
        <li>Complete the onboarding tour</li>
        <li>Configure your preferences</li>
        <li>Connect your development tools</li>
        <li>Explore the dashboard widgets</li>
      </ol>
    `,
    category: 'Getting Started',
    tags: ['basics', 'introduction', 'setup'],
    searchKeywords: ['getting started', 'introduction', 'basics', 'first time', 'setup', 'onboarding'],
    media: {
      type: 'video',
      url: '/videos/getting-started.mp4',
      thumbnail: '/images/getting-started-thumb.jpg',
      duration: 180
    },
    relatedContent: ['dashboard-overview', 'preferences-setup'],
    lastUpdated: new Date('2024-01-15'),
    popularity: 95
  },
  {
    id: 'dashboard-overview',
    title: 'Dashboard Overview',
    content: `
      <h3>Understanding Your Dashboard</h3>
      <p>The DevFlow dashboard provides a comprehensive view of your development productivity.</p>
      <h4>Main Sections:</h4>
      <ul>
        <li><strong>Metrics Overview:</strong> Key productivity indicators</li>
        <li><strong>Code Analysis:</strong> Code quality and complexity metrics</li>
        <li><strong>Task Tracking:</strong> Current and completed tasks</li>
        <li><strong>Team Insights:</strong> Collaborative productivity data</li>
      </ul>
      <h4>Customization:</h4>
      <p>You can customize your dashboard by:</p>
      <ul>
        <li>Rearranging widgets</li>
        <li>Changing time ranges</li>
        <li>Setting up filters</li>
        <li>Creating custom views</li>
      </ul>
    `,
    category: 'Dashboard',
    tags: ['dashboard', 'overview', 'widgets', 'customization'],
    searchKeywords: ['dashboard', 'overview', 'widgets', 'layout', 'customize', 'sections'],
    relatedContent: ['getting-started', 'widget-configuration'],
    lastUpdated: new Date('2024-01-10'),
    popularity: 88
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    content: `
      <h3>Keyboard Shortcuts</h3>
      <p>Speed up your workflow with these keyboard shortcuts:</p>
      <h4>Navigation:</h4>
      <ul>
        <li><kbd>Ctrl/Cmd + K</kbd> - Open command palette</li>
        <li><kbd>Ctrl/Cmd + /</kbd> - Open help</li>
        <li><kbd>Ctrl/Cmd + ,</kbd> - Open preferences</li>
        <li><kbd>G then D</kbd> - Go to dashboard</li>
        <li><kbd>G then T</kbd> - Go to tasks</li>
        <li><kbd>G then A</kbd> - Go to analytics</li>
      </ul>
      <h4>Actions:</h4>
      <ul>
        <li><kbd>N</kbd> - Create new task</li>
        <li><kbd>R</kbd> - Refresh current view</li>
        <li><kbd>F</kbd> - Focus search</li>
        <li><kbd>Esc</kbd> - Close modals/overlays</li>
      </ul>
      <h4>Accessibility:</h4>
      <ul>
        <li><kbd>Tab</kbd> - Navigate between elements</li>
        <li><kbd>Space</kbd> - Activate buttons/checkboxes</li>
        <li><kbd>Enter</kbd> - Submit forms/activate links</li>
        <li><kbd>Arrow keys</kbd> - Navigate lists/menus</li>
      </ul>
    `,
    category: 'Productivity',
    tags: ['shortcuts', 'keyboard', 'navigation', 'productivity'],
    searchKeywords: ['keyboard', 'shortcuts', 'hotkeys', 'navigation', 'quick', 'fast'],
    relatedContent: ['command-palette', 'accessibility-features'],
    lastUpdated: new Date('2024-01-12'),
    popularity: 76
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting Common Issues',
    content: `
      <h3>Troubleshooting Guide</h3>
      <p>Solutions to common problems you might encounter:</p>
      
      <h4>Dashboard Not Loading</h4>
      <ul>
        <li>Check your internet connection</li>
        <li>Clear browser cache and cookies</li>
        <li>Try refreshing the page</li>
        <li>Disable browser extensions temporarily</li>
      </ul>
      
      <h4>Data Not Updating</h4>
      <ul>
        <li>Verify your data connections are active</li>
        <li>Check if you have the necessary permissions</li>
        <li>Try manually refreshing the data</li>
        <li>Contact your administrator if issues persist</li>
      </ul>
      
      <h4>Performance Issues</h4>
      <ul>
        <li>Close unnecessary browser tabs</li>
        <li>Reduce the number of active widgets</li>
        <li>Check your system resources</li>
        <li>Try using a different browser</li>
      </ul>
      
      <h4>Accessibility Problems</h4>
      <ul>
        <li>Enable high contrast mode if needed</li>
        <li>Adjust font size in preferences</li>
        <li>Use keyboard navigation if mouse is problematic</li>
        <li>Enable screen reader optimizations</li>
      </ul>
    `,
    category: 'Support',
    tags: ['troubleshooting', 'problems', 'issues', 'support'],
    searchKeywords: ['troubleshooting', 'problems', 'issues', 'not working', 'broken', 'error', 'help'],
    relatedContent: ['performance-tips', 'accessibility-features'],
    lastUpdated: new Date('2024-01-08'),
    popularity: 82
  }
];

function searchHelpContent(query: string, content: HelpContent[]): SearchResult[] {
  if (!query.trim()) return [];

  const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
  
  return content
    .map(item => {
      let relevanceScore = 0;
      const matchedKeywords: string[] = [];

      // Search in title (highest weight)
      searchTerms.forEach(term => {
        if (item.title.toLowerCase().includes(term)) {
          relevanceScore += 10;
          matchedKeywords.push(term);
        }
      });

      // Search in keywords (high weight)
      searchTerms.forEach(term => {
        item.searchKeywords.forEach(keyword => {
          if (keyword.toLowerCase().includes(term)) {
            relevanceScore += 8;
            if (!matchedKeywords.includes(term)) {
              matchedKeywords.push(term);
            }
          }
        });
      });

      // Search in tags (medium weight)
      searchTerms.forEach(term => {
        item.tags.forEach(tag => {
          if (tag.toLowerCase().includes(term)) {
            relevanceScore += 5;
            if (!matchedKeywords.includes(term)) {
              matchedKeywords.push(term);
            }
          }
        });
      });

      // Search in content (lower weight)
      searchTerms.forEach(term => {
        if (item.content.toLowerCase().includes(term)) {
          relevanceScore += 2;
          if (!matchedKeywords.includes(term)) {
            matchedKeywords.push(term);
          }
        }
      });

      // Search in category (medium weight)
      searchTerms.forEach(term => {
        if (item.category.toLowerCase().includes(term)) {
          relevanceScore += 6;
          if (!matchedKeywords.includes(term)) {
            matchedKeywords.push(term);
          }
        }
      });

      return {
        ...item,
        relevanceScore,
        matchedKeywords
      };
    })
    .filter(item => item.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

export function HelpSystem({ isOpen, onClose, className }: HelpSystemProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContent, setSelectedContent] = useState<HelpContent | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize categories
  useEffect(() => {
    const uniqueCategories = Array.from(new Set(mockHelpContent.map(item => item.category)));
    setCategories(uniqueCategories);
  }, []);

  // Focus search input when help opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = searchHelpContent(searchQuery, mockHelpContent);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Filter content by category
  const filteredContent = useMemo(() => {
    if (selectedCategory) {
      return mockHelpContent.filter(item => item.category === selectedCategory);
    }
    return mockHelpContent;
  }, [selectedCategory]);

  // Popular content (when no search or category filter)
  const popularContent = useMemo(() => {
    return mockHelpContent
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 5);
  }, []);

  const handleContentSelect = (content: HelpContent) => {
    setSelectedContent(content);
  };

  const handleBack = () => {
    setSelectedContent(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (selectedContent) {
        handleBack();
      } else {
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ${className || ''}`}>
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            {selectedContent && (
              <button
                onClick={handleBack}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Go back"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2 className="text-xl font-semibold text-gray-900">
              {selectedContent ? selectedContent.title : 'Help & Documentation'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Close help"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {selectedContent ? (
          /* Content View */
          <div className="flex-1 overflow-auto p-6">
            {/* Media */}
            {selectedContent.media && (
              <div className="mb-6">
                {selectedContent.media.type === 'video' ? (
                  <div className="relative">
                    <video
                      controls
                      poster={selectedContent.media.thumbnail}
                      className="w-full rounded-lg"
                    >
                      <source src={selectedContent.media.url} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    {selectedContent.media.duration && (
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                        {Math.floor(selectedContent.media.duration / 60)}:{(selectedContent.media.duration % 60).toString().padStart(2, '0')}
                      </div>
                    )}
                  </div>
                ) : (
                  <img
                    src={selectedContent.media.url}
                    alt={selectedContent.title}
                    className="w-full rounded-lg"
                  />
                )}
              </div>
            )}

            {/* Content */}
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: selectedContent.content }}
            />

            {/* Tags */}
            {selectedContent.tags.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Tags:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedContent.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Related Content */}
            {selectedContent.relatedContent.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Related Articles:</h4>
                <div className="space-y-2">
                  {selectedContent.relatedContent.map(relatedId => {
                    const related = mockHelpContent.find(item => item.id === relatedId);
                    if (!related) return null;
                    return (
                      <button
                        key={relatedId}
                        onClick={() => handleContentSelect(related)}
                        className="block w-full text-left p-2 hover:bg-gray-50 rounded-md transition-colors"
                      >
                        <div className="text-sm font-medium text-blue-600 hover:text-blue-800">
                          {related.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {related.category}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Search and Browse View */
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 border-r bg-gray-50 p-4 overflow-auto">
              {/* Search */}
              <div className="mb-6">
                <label htmlFor="help-search" className="block text-sm font-medium text-gray-700 mb-2">
                  Search Help
                </label>
                <input
                  ref={searchInputRef}
                  id="help-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documentation..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Categories */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Categories</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedCategory === '' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                        selectedCategory === category 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-auto">
              {searchQuery.trim() ? (
                /* Search Results */
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Search Results ({searchResults.length})
                  </h3>
                  {searchResults.length > 0 ? (
                    <div className="space-y-4">
                      {searchResults.map(result => (
                        <button
                          key={result.id}
                          onClick={() => handleContentSelect(result)}
                          className="block w-full text-left p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 mb-1">
                                {result.title}
                              </h4>
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                {result.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
                              </p>
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span>{result.category}</span>
                                <span>Relevance: {result.relevanceScore}</span>
                                {result.matchedKeywords.length > 0 && (
                                  <span>
                                    Matches: {result.matchedKeywords.join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>
                            {result.media && (
                              <div className="ml-4 flex-shrink-0">
                                <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center">
                                  {result.media.type === 'video' ? (
                                    <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 6.306a7.962 7.962 0 00-6 0m6 0V5a2 2 0 00-2-2H9a2 2 0 00-2 2v1.306m6 0V7a2 2 0 01-2 2H9a2 2 0 01-2-2V6.306" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Try adjusting your search terms or browse by category.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Browse Content */
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {selectedCategory ? `${selectedCategory} Articles` : 'Popular Articles'}
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {(selectedCategory ? filteredContent : popularContent).map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleContentSelect(item)}
                        className="text-left p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">
                              {item.title}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {item.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>{item.category}</span>
                              <span>Updated {item.lastUpdated.toLocaleDateString()}</span>
                              {!selectedCategory && (
                                <span>★ {item.popularity}</span>
                              )}
                            </div>
                          </div>
                          {item.media && (
                            <div className="ml-4 flex-shrink-0">
                              <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center">
                                {item.media.type === 'video' ? (
                                  <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                  </svg>
                                ) : (
                                  <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}