/**
 * Command Palette Component
 * Power user command interface with fuzzy search and action execution
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Command as CommandIcon, 
  Search, 
  X, 
  Clock, 
  Star,
  Zap,
  ArrowRight,
  Hash,
  Settings,
  Navigation,
  Edit,
  Plus,
  Trash2,
  Eye,
  HelpCircle,
  Keyboard
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { 
  useNavigationStore, 
  useCommandPalette 
} from './NavigationController';
import { Command, CommandCategory } from './types';

interface CommandPaletteProps {
  className?: string;
  maxCommands?: number;
  showCategories?: boolean;
  showShortcuts?: boolean;
  enableFuzzySearch?: boolean;
}

// Command category icons
const categoryIcons: Record<CommandCategory, React.ComponentType<any>> = {
  navigation: Navigation,
  actions: Zap,
  view: Eye,
  edit: Edit,
  create: Plus,
  delete: Trash2,
  settings: Settings,
  help: HelpCircle,
};

// Mock commands (in a real app, these would come from various sources)
const createMockCommands = (): Command[] => [
  // Navigation commands
  {
    id: 'nav-dashboard',
    label: 'Go to Dashboard',
    description: 'Navigate to the main dashboard',
    icon: Navigation,
    category: 'navigation',
    keywords: ['dashboard', 'home', 'main'],
    shortcut: 'g d',
    handler: () => window.location.href = '/',
    enabled: true,
    visible: true,
    priority: 10,
    useCount: 0,
  },
  {
    id: 'nav-tasks',
    label: 'Go to Tasks',
    description: 'Navigate to the tasks page',
    icon: Navigation,
    category: 'navigation',
    keywords: ['tasks', 'todo', 'work'],
    shortcut: 'g t',
    handler: () => window.location.href = '/tasks',
    enabled: true,
    visible: true,
    priority: 9,
    useCount: 0,
  },
  {
    id: 'nav-analytics',
    label: 'Go to Analytics',
    description: 'Navigate to the analytics page',
    icon: Navigation,
    category: 'navigation',
    keywords: ['analytics', 'stats', 'metrics'],
    shortcut: 'g a',
    handler: () => window.location.href = '/analytics',
    enabled: true,
    visible: true,
    priority: 8,
    useCount: 0,
  },
  
  // Action commands
  {
    id: 'action-new-task',
    label: 'Create New Task',
    description: 'Create a new task',
    icon: Plus,
    category: 'create',
    keywords: ['new', 'create', 'task', 'add'],
    shortcut: 'c t',
    handler: () => console.log('Create new task'),
    enabled: true,
    visible: true,
    priority: 9,
    useCount: 0,
  },
  {
    id: 'action-search',
    label: 'Search Everything',
    description: 'Open global search',
    icon: Search,
    category: 'actions',
    keywords: ['search', 'find', 'look'],
    shortcut: '/',
    handler: () => console.log('Open search'),
    enabled: true,
    visible: true,
    priority: 8,
    useCount: 0,
  },
  {
    id: 'action-toggle-theme',
    label: 'Toggle Theme',
    description: 'Switch between light and dark theme',
    icon: Settings,
    category: 'settings',
    keywords: ['theme', 'dark', 'light', 'toggle'],
    shortcut: 't',
    handler: () => console.log('Toggle theme'),
    enabled: true,
    visible: true,
    priority: 7,
    useCount: 0,
  },
  
  // View commands
  {
    id: 'view-fullscreen',
    label: 'Toggle Fullscreen',
    description: 'Enter or exit fullscreen mode',
    icon: Eye,
    category: 'view',
    keywords: ['fullscreen', 'full', 'screen', 'expand'],
    shortcut: 'f',
    handler: () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
    },
    enabled: true,
    visible: true,
    priority: 6,
    useCount: 0,
  },
  {
    id: 'view-sidebar',
    label: 'Toggle Sidebar',
    description: 'Show or hide the sidebar',
    icon: Eye,
    category: 'view',
    keywords: ['sidebar', 'menu', 'navigation', 'toggle'],
    shortcut: 'b',
    handler: () => console.log('Toggle sidebar'),
    enabled: true,
    visible: true,
    priority: 7,
    useCount: 0,
  },
  
  // Help commands
  {
    id: 'help-shortcuts',
    label: 'Show Keyboard Shortcuts',
    description: 'Display all available keyboard shortcuts',
    icon: Keyboard,
    category: 'help',
    keywords: ['shortcuts', 'keyboard', 'keys', 'help'],
    shortcut: '?',
    handler: () => console.log('Show shortcuts'),
    enabled: true,
    visible: true,
    priority: 5,
    useCount: 0,
  },
  {
    id: 'help-docs',
    label: 'Open Documentation',
    description: 'Open the documentation in a new tab',
    icon: HelpCircle,
    category: 'help',
    keywords: ['docs', 'documentation', 'help', 'guide'],
    handler: () => window.open('/docs', '_blank'),
    enabled: true,
    visible: true,
    priority: 4,
    useCount: 0,
  },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  className,
  maxCommands = 20,
  showCategories = true,
  showShortcuts = true,
  enableFuzzySearch = true,
}) => {
  const {
    openCommandPalette,
    closeCommandPalette,
    setCommandQuery,
    selectCommand,
    executeCommand,
  } = useNavigationStore();
  
  const commandPaletteState = useCommandPalette();
  const [localQuery, setLocalQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [commands] = useState<Command[]>(createMockCommands());
  
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Filter and sort commands based on query
  const filteredCommands = useMemo(() => {
    if (!localQuery.trim()) {
      // Show recent and favorite commands when no query
      const recentCommands = commandPaletteState.recentCommands.slice(0, 5);
      const favoriteCommands = commandPaletteState.favoriteCommands.slice(0, 5);
      const otherCommands = commands
        .filter(cmd => 
          !recentCommands.some(r => r.id === cmd.id) &&
          !favoriteCommands.some(f => f.id === cmd.id)
        )
        .sort((a, b) => b.priority - a.priority)
        .slice(0, maxCommands - recentCommands.length - favoriteCommands.length);
      
      return [...favoriteCommands, ...recentCommands, ...otherCommands];
    }

    const query = localQuery.toLowerCase();
    
    return commands
      .filter(command => {
        if (!command.enabled || !command.visible) return false;
        
        // Exact label match
        if (command.label.toLowerCase().includes(query)) return true;
        
        // Keyword match
        if (command.keywords.some(keyword => keyword.includes(query))) return true;
        
        // Fuzzy search on label
        if (enableFuzzySearch && fuzzyMatch(command.label.toLowerCase(), query)) return true;
        
        return false;
      })
      .map(command => ({
        ...command,
        relevance: calculateRelevance(command, query),
      }))
      .sort((a, b) => {
        // Sort by relevance, then priority, then usage count
        if (a.relevance !== b.relevance) return b.relevance - a.relevance;
        if (a.priority !== b.priority) return b.priority - a.priority;
        return b.useCount - a.useCount;
      })
      .slice(0, maxCommands);
  }, [localQuery, commands, commandPaletteState, maxCommands, enableFuzzySearch]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    if (!showCategories) return { all: filteredCommands };
    
    const groups: Record<string, Command[]> = {};
    
    filteredCommands.forEach(command => {
      const category = command.category;
      if (!groups[category]) groups[category] = [];
      groups[category].push(command);
    });
    
    return groups;
  }, [filteredCommands, showCategories]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + P to open command palette
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        openCommandPalette();
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      
      // Escape to close
      if (event.key === 'Escape' && commandPaletteState.isOpen) {
        closeCommandPalette();
        setLocalQuery('');
        setSelectedIndex(0);
      }
      
      // Arrow navigation
      if (commandPaletteState.isOpen && filteredCommands.length > 0) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
        } else if (event.key === 'Enter' && selectedIndex >= 0) {
          event.preventDefault();
          const command = filteredCommands[selectedIndex];
          if (command) {
            handleCommandExecute(command);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteState.isOpen, filteredCommands, selectedIndex, openCommandPalette, closeCommandPalette]);

  // Handle input change
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setLocalQuery(query);
    setCommandQuery(query);
    setSelectedIndex(0);
  };

  // Handle command execution
  const handleCommandExecute = async (command: Command) => {
    if (command.requiresConfirmation) {
      const confirmed = window.confirm(
        command.confirmationMessage || `Are you sure you want to execute "${command.label}"?`
      );
      if (!confirmed) return;
    }

    await executeCommand(command);
    setLocalQuery('');
    setSelectedIndex(0);
  };

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && selectedIndex >= 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [selectedIndex]);

  // Render command item
  const renderCommandItem = (command: Command, index: number) => {
    const Icon = command.icon as React.ComponentType<{ size?: number; className?: string }>;
    const isSelected = index === selectedIndex;
    const isRecent = commandPaletteState.recentCommands.some(r => r.id === command.id);
    const isFavorite = commandPaletteState.favoriteCommands.some(f => f.id === command.id);

    return (
      <motion.button
        key={command.id}
        onClick={() => handleCommandExecute(command)}
        onMouseEnter={() => setSelectedIndex(index)}
        className={cn(
          'w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors',
          isSelected 
            ? 'bg-blue-50 dark:bg-blue-900/20' 
            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
        )}
        whileHover={{ x: 4 }}
        layout
      >
        {/* Icon */}
        <div className="flex-shrink-0 relative">
          {Icon && (
            <Icon 
              size={16} 
              className={cn(
                isSelected ? 'text-blue-500' : 'text-gray-400'
              )} 
            />
          )}
          
          {/* Status indicators */}
          {isFavorite && (
            <Star size={8} className="absolute -top-1 -right-1 text-yellow-500 fill-current" />
          )}
          {isRecent && !isFavorite && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className={cn(
              'font-medium truncate',
              isSelected 
                ? 'text-blue-700 dark:text-blue-300' 
                : 'text-gray-900 dark:text-gray-100'
            )}>
              {command.label}
            </p>
            
            {/* Shortcut */}
            {showShortcuts && command.shortcut && (
              <div className="flex items-center space-x-1 ml-2">
                {command.shortcut.split(' ').map((key, i) => (
                  <kbd
                    key={i}
                    className={cn(
                      'px-2 py-1 text-xs font-mono rounded border',
                      'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600',
                      'text-gray-600 dark:text-gray-400'
                    )}
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            )}
          </div>
          
          {command.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
              {command.description}
            </p>
          )}
        </div>
        
        {/* Arrow indicator */}
        {isSelected && (
          <ArrowRight size={14} className="text-blue-500 flex-shrink-0" />
        )}
      </motion.button>
    );
  };

  return (
    <AnimatePresence>
      {commandPaletteState.isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
          onClick={closeCommandPalette}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={cn(
              'absolute top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl',
              'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
              'rounded-lg shadow-xl overflow-hidden',
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center space-x-3 p-4 border-b border-gray-200 dark:border-gray-700">
              <CommandIcon size={16} className="text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a command or search..."
                value={localQuery}
                onChange={handleInputChange}
                className={cn(
                  'flex-1 bg-transparent border-none outline-none',
                  'text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400'
                )}
                autoFocus
              />
              <button
                onClick={closeCommandPalette}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={16} />
              </button>
            </div>

            {/* Results */}
            <div ref={resultsRef} className="max-h-96 overflow-y-auto">
              {filteredCommands.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <CommandIcon size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No commands found</p>
                  {localQuery && (
                    <p className="text-sm mt-1">Try a different search term</p>
                  )}
                </div>
              ) : showCategories ? (
                <div className="py-2">
                  {Object.entries(groupedCommands).map(([category, categoryCommands]) => {
                    const CategoryIcon = categoryIcons[category as CommandCategory];
                    let commandIndex = 0;
                    
                    // Calculate the starting index for this category
                    for (const [prevCategory, prevCommands] of Object.entries(groupedCommands)) {
                      if (prevCategory === category) break;
                      commandIndex += prevCommands.length;
                    }
                    
                    return (
                      <div key={category} className="mb-4">
                        <div className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          <CategoryIcon size={12} />
                          <span>{category}</span>
                        </div>
                        <div>
                          {categoryCommands.map((command, index) => 
                            renderCommandItem(command, commandIndex + index)
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-2">
                  {filteredCommands.map((command, index) => 
                    renderCommandItem(command, index)
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-4">
                <span>↑↓ Navigate</span>
                <span>↵ Execute</span>
                <span>Esc Close</span>
              </div>
              <span>{filteredCommands.length} commands</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Utility functions
function fuzzyMatch(text: string, query: string): boolean {
  let textIndex = 0;
  let queryIndex = 0;
  
  while (textIndex < text.length && queryIndex < query.length) {
    if (text[textIndex] === query[queryIndex]) {
      queryIndex++;
    }
    textIndex++;
  }
  
  return queryIndex === query.length;
}

function calculateRelevance(command: Command, query: string): number {
  const label = command.label.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Exact match gets highest score
  if (label === queryLower) return 1.0;
  
  // Starts with query gets high score
  if (label.startsWith(queryLower)) return 0.9;
  
  // Contains query gets medium score
  if (label.includes(queryLower)) return 0.7;
  
  // Keyword match gets lower score
  if (command.keywords.some(keyword => keyword.includes(queryLower))) return 0.5;
  
  // Fuzzy match gets lowest score
  if (fuzzyMatch(label, queryLower)) return 0.3;
  
  return 0;
}