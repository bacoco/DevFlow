import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, X, Search, ChevronRight, Lightbulb, AlertCircle, CheckCircle } from 'lucide-react';

interface HelpTopic {
  id: string;
  title: string;
  content: React.ReactNode;
  category: string;
  keywords: string[];
  relatedTopics?: string[];
}

interface ContextualHelpProps {
  context?: string;
  element?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface InAppHelpProps {
  context?: string;
}

export const InAppHelp: React.FC<InAppHelpProps> = ({ context }) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HelpTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);

  const helpTopics: HelpTopic[] = [
    {
      id: 'navigation-basics',
      title: 'How to Navigate the Dashboard',
      category: 'getting-started',
      keywords: ['navigation', 'menu', 'breadcrumb', 'sidebar'],
      content: (
        <div className="space-y-4">
          <p>The dashboard uses an adaptive navigation system that learns from your usage patterns.</p>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Quick Tips:</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Use Cmd/Ctrl + K to open the command palette</li>
              <li>• Click breadcrumbs to navigate back to previous sections</li>
              <li>• The sidebar highlights your most-used features</li>
            </ul>
          </div>
        </div>
      ),
      relatedTopics: ['keyboard-shortcuts', 'search-features']
    },
    {
      id: 'keyboard-shortcuts',
      title: 'Keyboard Shortcuts',
      category: 'getting-started',
      keywords: ['keyboard', 'shortcuts', 'hotkeys', 'accessibility'],
      content: (
        <div className="space-y-4">
          <p>Master these keyboard shortcuts to navigate efficiently:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-semibold mb-3">Navigation</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Command Palette</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">⌘K</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Global Search</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">⌘/</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Go Back</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">⌘←</kbd>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-semibold mb-3">Actions</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Save Changes</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">⌘S</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Refresh Data</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">⌘R</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Toggle Help</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">?</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      relatedTopics: ['navigation-basics', 'accessibility-features']
    },
    {
      id: 'accessibility-features',
      title: 'Accessibility Features',
      category: 'accessibility',
      keywords: ['accessibility', 'screen reader', 'keyboard', 'contrast', 'a11y'],
      content: (
        <div className="space-y-4">
          <p>The dashboard is designed to be fully accessible to all users:</p>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-semibold">Screen Reader Support</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  All content is properly labeled and announced by screen readers.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-semibold">Keyboard Navigation</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Navigate the entire dashboard using only your keyboard.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-semibold">High Contrast Mode</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enable high contrast colors in your preferences.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
      relatedTopics: ['keyboard-shortcuts', 'preferences-settings']
    },
    {
      id: 'mobile-usage',
      title: 'Using on Mobile Devices',
      category: 'mobile',
      keywords: ['mobile', 'touch', 'gestures', 'responsive'],
      content: (
        <div className="space-y-4">
          <p>The dashboard is optimized for mobile devices with touch-friendly interactions:</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl mb-2">👆</div>
              <h4 className="font-semibold text-sm">Tap</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">Select items</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl mb-2">↔️</div>
              <h4 className="font-semibold text-sm">Swipe</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">Navigate pages</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl mb-2">🤏</div>
              <h4 className="font-semibold text-sm">Pinch</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">Zoom charts</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl mb-2">✋</div>
              <h4 className="font-semibold text-sm">Long Press</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">Context menu</p>
            </div>
          </div>
        </div>
      ),
      relatedTopics: ['chart-interactions', 'navigation-basics']
    },
    {
      id: 'chart-interactions',
      title: 'Interacting with Charts',
      category: 'data-visualization',
      keywords: ['charts', 'zoom', 'pan', 'brush', 'drill-down'],
      content: (
        <div className="space-y-4">
          <p>Charts support various interaction methods for data exploration:</p>
          <div className="space-y-3">
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <h4 className="font-semibold mb-1">Zoom and Pan</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Mouse wheel to zoom, click and drag to pan around the chart.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <h4 className="font-semibold mb-1">Brush Selection</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click and drag to select a time range or data subset.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <h4 className="font-semibold mb-1">Drill-down</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Double-click data points to drill down into detailed views.
              </p>
            </div>
          </div>
        </div>
      ),
      relatedTopics: ['mobile-usage', 'data-export']
    },
    {
      id: 'troubleshooting',
      title: 'Common Issues and Solutions',
      category: 'troubleshooting',
      keywords: ['error', 'problem', 'fix', 'troubleshoot', 'issue'],
      content: (
        <div className="space-y-4">
          <p>Solutions to common issues you might encounter:</p>
          <div className="space-y-4">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Dashboard Not Loading</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    If the dashboard appears blank or doesn't load properly:
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Check your internet connection</li>
                    <li>• Clear your browser cache and cookies</li>
                    <li>• Try refreshing the page (Cmd/Ctrl + R)</li>
                    <li>• Disable browser extensions temporarily</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Charts Not Displaying</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    If charts appear empty or show error messages:
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Verify your data source is connected</li>
                    <li>• Check if you have permission to view the data</li>
                    <li>• Try adjusting the time range filter</li>
                    <li>• Contact your administrator if issues persist</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      relatedTopics: ['data-sources', 'permissions']
    }
  ];

  const categories = [
    { id: 'getting-started', name: 'Getting Started', icon: '🚀' },
    { id: 'accessibility', name: 'Accessibility', icon: '♿' },
    { id: 'mobile', name: 'Mobile', icon: '📱' },
    { id: 'data-visualization', name: 'Charts', icon: '📊' },
    { id: 'troubleshooting', name: 'Troubleshooting', icon: '🔧' }
  ];

  useEffect(() => {
    if (searchQuery) {
      const results = helpTopics.filter(topic =>
        topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.keywords.some(keyword => 
          keyword.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const filteredTopics = searchQuery 
    ? searchResults 
    : helpTopics.filter(topic => topic.category === activeCategory);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          In-App Help System
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Get contextual assistance and discover features as you work.
        </p>
      </div>

      {/* Help Widget Demo */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Contextual Help Widget
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          This floating help button appears throughout the dashboard to provide contextual assistance.
        </p>
        
        <div className="relative inline-block">
          <button
            onClick={() => setIsHelpOpen(!isHelpOpen)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white 
                     rounded-full shadow-lg flex items-center justify-center transition-colors z-50"
            aria-label="Open help"
          >
            <HelpCircle className="h-6 w-6" />
          </button>

          {/* Help Popup */}
          {isHelpOpen && (
            <div className="fixed bottom-24 right-6 w-80 bg-white dark:bg-gray-800 rounded-lg 
                          shadow-xl border border-gray-200 dark:border-gray-700 z-50">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Need Help?
                  </h4>
                  <button
                    onClick={() => setIsHelpOpen(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label="Close help popup"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Search help topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 
                             rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto">
                {searchQuery ? (
                  <div className="p-2">
                    {searchResults.length > 0 ? (
                      searchResults.map(topic => (
                        <button
                          key={topic.id}
                          onClick={() => setSelectedTopic(topic)}
                          className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 
                                   rounded-lg transition-colors"
                        >
                          <div className="font-medium text-sm text-gray-900 dark:text-white">
                            {topic.title}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No help topics found</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-2">
                    <div className="space-y-1">
                      {categories.map(category => (
                        <button
                          key={category.id}
                          onClick={() => setActiveCategory(category.id)}
                          className="w-full flex items-center justify-between p-3 text-left 
                                   hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">{category.icon}</span>
                            <span className="font-medium text-sm text-gray-900 dark:text-white">
                              {category.name}
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
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

      {/* Help Topics Browser */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Browse Help Topics
          </h3>
          
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeCategory === category.id
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {selectedTopic ? (
            <div>
              <button
                onClick={() => setSelectedTopic(null)}
                className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 
                         hover:text-blue-800 dark:hover:text-blue-200 mb-4"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                <span>Back to topics</span>
              </button>
              
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {selectedTopic.title}
              </h4>
              
              <div className="prose dark:prose-invert max-w-none">
                {selectedTopic.content}
              </div>

              {selectedTopic.relatedTopics && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Related Topics
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedTopic.relatedTopics.map(topicId => {
                      const relatedTopic = helpTopics.find(t => t.id === topicId);
                      return relatedTopic ? (
                        <button
                          key={topicId}
                          onClick={() => setSelectedTopic(relatedTopic)}
                          className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 
                                   text-gray-700 dark:text-gray-300 rounded-full 
                                   hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          {relatedTopic.title}
                        </button>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTopics.map(topic => (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic)}
                  className="w-full text-left p-4 rounded-lg border border-gray-200 dark:border-gray-700 
                           hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 
                           transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {topic.title}
                    </h4>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Feature Discovery */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 
                    rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-3">
          <Lightbulb className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Feature Discovery
            </h3>
            <p className="text-blue-800 dark:text-blue-200 mb-4">
              The help system learns from your usage patterns and suggests relevant features and tips.
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-blue-700 dark:text-blue-300">
                <CheckCircle className="h-4 w-4" />
                <span>Contextual tooltips appear when you hover over new features</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-blue-700 dark:text-blue-300">
                <CheckCircle className="h-4 w-4" />
                <span>Progressive disclosure reveals advanced features as you become more proficient</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-blue-700 dark:text-blue-300">
                <CheckCircle className="h-4 w-4" />
                <span>Smart suggestions based on your workflow and role</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};