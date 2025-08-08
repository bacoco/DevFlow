import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitCommit, 
  GitPullRequest, 
  MessageSquare, 
  Bug, 
  CheckCircle, 
  Clock,
  User,
  Search,
  Filter,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  Calendar,
  Hash,
  ExternalLink
} from 'lucide-react';
import { VirtualScroll, useVirtualScroll } from './VirtualScroll';
import { useRealTimeSync } from '../../hooks/useRealTimeSync';
import { useAccessibility } from '../../contexts/AccessibilityContext';

export interface ActivityItem {
  id: string;
  type: 'commit' | 'pull_request' | 'comment' | 'bug' | 'task_complete' | 'review' | 'deployment' | 'merge';
  title: string;
  description: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
  };
  timestamp: Date;
  metadata?: {
    repository?: string;
    branch?: string;
    pullRequestId?: string;
    commitHash?: string;
    issueId?: string;
    deploymentId?: string;
    url?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    tags?: string[];
  };
  isNew?: boolean; // For highlighting new items
}

export interface ActivityFeedProps {
  className?: string;
  height?: number;
  itemHeight?: number;
  enableRealTime?: boolean;
  enableFiltering?: boolean;
  enableSearch?: boolean;
  filters?: {
    userId?: string;
    teamId?: string;
    repository?: string;
    type?: ActivityItem['type'][];
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
  onItemClick?: (item: ActivityItem) => void;
  onRefresh?: () => void;
  fetchActivities?: (offset: number, limit: number, filters?: any) => Promise<ActivityItem[]>;
  emptyMessage?: string;
  loadingMessage?: string;
}

const ITEM_HEIGHT = 120;
const ITEMS_PER_PAGE = 50;

// Activity type configurations
const ACTIVITY_CONFIG = {
  commit: {
    icon: GitCommit,
    color: 'bg-blue-500',
    label: 'Commit',
    description: 'Code commit'
  },
  pull_request: {
    icon: GitPullRequest,
    color: 'bg-green-500',
    label: 'Pull Request',
    description: 'Pull request activity'
  },
  comment: {
    icon: MessageSquare,
    color: 'bg-purple-500',
    label: 'Comment',
    description: 'Comment or discussion'
  },
  bug: {
    icon: Bug,
    color: 'bg-red-500',
    label: 'Bug',
    description: 'Bug report or fix'
  },
  task_complete: {
    icon: CheckCircle,
    color: 'bg-emerald-500',
    label: 'Task Complete',
    description: 'Task completion'
  },
  review: {
    icon: Clock,
    color: 'bg-orange-500',
    label: 'Review',
    description: 'Code review'
  },
  deployment: {
    icon: ExternalLink,
    color: 'bg-indigo-500',
    label: 'Deployment',
    description: 'Deployment activity'
  },
  merge: {
    icon: GitPullRequest,
    color: 'bg-teal-500',
    label: 'Merge',
    description: 'Branch merge'
  }
};

// Mock data generator for development
const generateMockActivities = (count: number, offset: number = 0): ActivityItem[] => {
  const activities: ActivityItem[] = [];
  const types = Object.keys(ACTIVITY_CONFIG) as ActivityItem['type'][];
  const users = [
    { id: '1', name: 'John Doe', email: 'john@example.com' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
    { id: '3', name: 'Mike Johnson', email: 'mike@example.com' },
    { id: '4', name: 'Sarah Wilson', email: 'sarah@example.com' },
    { id: '5', name: 'Alex Chen', email: 'alex@example.com' },
  ];
  const repositories = ['frontend-app', 'backend-api', 'mobile-app', 'dashboard', 'shared-lib'];

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const user = users[Math.floor(Math.random() * users.length)];
    const repo = repositories[Math.floor(Math.random() * repositories.length)];
    const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Last 7 days

    activities.push({
      id: `activity-${offset + i}`,
      type,
      title: `${ACTIVITY_CONFIG[type].label} in ${repo}`,
      description: `Sample ${type} activity description for testing purposes. This is a longer description to test text wrapping and layout.`,
      user,
      timestamp,
      metadata: {
        repository: repo,
        branch: Math.random() > 0.5 ? 'main' : 'develop',
        commitHash: Math.random().toString(36).substring(2, 9),
        pullRequestId: Math.floor(Math.random() * 1000).toString(),
        priority: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
        tags: ['feature', 'bugfix', 'hotfix', 'refactor'].slice(0, Math.floor(Math.random() * 3) + 1),
        url: `https://github.com/example/${repo}/commit/${Math.random().toString(36).substring(2, 9)}`
      },
      isNew: Math.random() > 0.8 // 20% chance of being new
    });
  }

  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

const formatTimeAgo = (timestamp: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return timestamp.toLocaleDateString();
};

const ActivityItemComponent: React.FC<{
  item: ActivityItem;
  index: number;
  onClick?: (item: ActivityItem) => void;
  isHighlighted?: boolean;
}> = ({ item, index, onClick, isHighlighted }) => {
  const { settings } = useAccessibility();
  const config = ACTIVITY_CONFIG[item.type];
  const IconComponent = config.icon;

  const handleClick = useCallback(() => {
    onClick?.(item);
  }, [item, onClick]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ 
        duration: settings.reducedMotion ? 0 : 0.2,
        delay: settings.reducedMotion ? 0 : index * 0.02 
      }}
      className={`
        flex items-start space-x-3 p-4 rounded-lg transition-all duration-200
        ${isHighlighted ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}
        ${onClick ? 'cursor-pointer' : ''}
        ${item.isNew ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
      `}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      tabIndex={onClick ? 0 : -1}
      role={onClick ? 'button' : 'article'}
      aria-label={`${config.label}: ${item.title} by ${item.user.name} ${formatTimeAgo(item.timestamp)}`}
    >
      {/* Activity Icon */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${config.color}`}>
        <IconComponent size={18} className="text-white" />
      </div>

      {/* Activity Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {item.title}
              </h4>
              {item.isNew && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  New
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
              {item.description}
            </p>
          </div>
          <div className="flex flex-col items-end space-y-1 ml-4">
            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
              {formatTimeAgo(item.timestamp)}
            </span>
            {item.metadata?.priority && (
              <span className={`
                inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                ${item.metadata.priority === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                  item.metadata.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                  item.metadata.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}
              `}>
                {item.metadata.priority}
              </span>
            )}
          </div>
        </div>

        {/* User and Metadata */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User size={12} className="text-gray-400" />
            <span className="text-xs text-gray-600 dark:text-gray-400">{item.user.name}</span>
          </div>
          <div className="flex items-center space-x-2">
            {item.metadata?.repository && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                <Hash size={10} className="mr-1" />
                {item.metadata.repository}
              </span>
            )}
            {item.metadata?.branch && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                {item.metadata.branch}
              </span>
            )}
            {item.metadata?.url && (
              <ExternalLink size={12} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            )}
          </div>
        </div>

        {/* Tags */}
        {item.metadata?.tags && item.metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.metadata.tags.map((tag, tagIndex) => (
              <span
                key={tagIndex}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  className = '',
  height = 600,
  itemHeight = ITEM_HEIGHT,
  enableRealTime = true,
  enableFiltering = true,
  enableSearch = true,
  filters = {},
  onItemClick,
  onRefresh,
  fetchActivities,
  emptyMessage = 'No activities found',
  loadingMessage = 'Loading activities...'
}) => {
  const { settings, announceToScreenReader } = useAccessibility();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<{
    types: ActivityItem['type'][];
    priority: string[];
    dateRange: { start: Date | null; end: Date | null };
  }>({
    types: [],
    priority: [],
    dateRange: { start: null, end: null }
  });
  const [showFilters, setShowFilters] = useState(false);
  const [highlightedItems, setHighlightedItems] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const newItemsRef = useRef<Set<string>>(new Set());

  // Real-time sync
  const { isConnected, subscribeToDataType, unsubscribeFromDataType } = useRealTimeSync({
    enableUserActivitySync: enableRealTime,
    filters,
    onSyncError: (error) => {
      console.error('Activity feed sync error:', error);
    }
  });

  // Mock fetch function if none provided
  const defaultFetchActivities = useCallback(async (offset: number, limit: number) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return generateMockActivities(limit, offset);
  }, []);

  // Virtual scroll with infinite loading
  const {
    items: activities,
    loading,
    hasMore,
    error,
    loadMore,
    reset
  } = useVirtualScroll(
    [],
    fetchActivities || defaultFetchActivities,
    ITEMS_PER_PAGE
  );

  // Filter activities
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(activity =>
        activity.title.toLowerCase().includes(searchLower) ||
        activity.description.toLowerCase().includes(searchLower) ||
        activity.user.name.toLowerCase().includes(searchLower) ||
        activity.metadata?.repository?.toLowerCase().includes(searchLower) ||
        activity.metadata?.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Apply type filters
    if (selectedFilters.types.length > 0) {
      filtered = filtered.filter(activity => selectedFilters.types.includes(activity.type));
    }

    // Apply priority filters
    if (selectedFilters.priority.length > 0) {
      filtered = filtered.filter(activity => 
        activity.metadata?.priority && selectedFilters.priority.includes(activity.metadata.priority)
      );
    }

    // Apply date range filter
    if (selectedFilters.dateRange.start || selectedFilters.dateRange.end) {
      filtered = filtered.filter(activity => {
        const activityDate = activity.timestamp;
        const start = selectedFilters.dateRange.start;
        const end = selectedFilters.dateRange.end;
        
        if (start && activityDate < start) return false;
        if (end && activityDate > end) return false;
        return true;
      });
    }

    return filtered;
  }, [activities, searchTerm, selectedFilters]);

  // Handle real-time updates
  useEffect(() => {
    if (!enableRealTime || !isConnected) return;

    const handleNewActivity = (newActivity: ActivityItem) => {
      // Add to highlighted items
      setHighlightedItems(prev => new Set([...prev, newActivity.id]));
      newItemsRef.current.add(newActivity.id);

      // Announce new activity for screen readers
      if (settings.screenReaderMode) {
        announceToScreenReader(
          `New ${ACTIVITY_CONFIG[newActivity.type].label}: ${newActivity.title}`,
          'polite'
        );
      }

      // Remove highlight after 5 seconds
      setTimeout(() => {
        setHighlightedItems(prev => {
          const next = new Set(prev);
          next.delete(newActivity.id);
          return next;
        });
        newItemsRef.current.delete(newActivity.id);
      }, 5000);
    };

    // Subscribe to activity updates
    subscribeToDataType('user_activity', filters);

    return () => {
      unsubscribeFromDataType('user_activity', filters);
    };
  }, [enableRealTime, isConnected, filters, settings.screenReaderMode, announceToScreenReader, subscribeToDataType, unsubscribeFromDataType]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      reset();
      onRefresh?.();
      
      if (settings.screenReaderMode) {
        announceToScreenReader('Activity feed refreshed', 'polite');
      }
    } finally {
      setRefreshing(false);
    }
  }, [reset, onRefresh, settings.screenReaderMode, announceToScreenReader]);

  // Handle filter changes
  const handleTypeFilterChange = useCallback((type: ActivityItem['type']) => {
    setSelectedFilters(prev => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type]
    }));
  }, []);

  const handlePriorityFilterChange = useCallback((priority: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      priority: prev.priority.includes(priority)
        ? prev.priority.filter(p => p !== priority)
        : [...prev.priority, priority]
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedFilters({
      types: [],
      priority: [],
      dateRange: { start: null, end: null }
    });
    setSearchTerm('');
  }, []);

  // Render activity item
  const renderActivityItem = useCallback((item: ActivityItem, index: number) => (
    <ActivityItemComponent
      key={item.id}
      item={item}
      index={index}
      onClick={onItemClick}
      isHighlighted={highlightedItems.has(item.id)}
    />
  ), [onItemClick, highlightedItems]);

  const activeFilterCount = selectedFilters.types.length + selectedFilters.priority.length + 
    (selectedFilters.dateRange.start || selectedFilters.dateRange.end ? 1 : 0);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header Controls */}
      {(enableSearch || enableFiltering) && (
        <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          {/* Search and Refresh */}
          <div className="flex items-center space-x-3">
            {enableSearch && (
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="Search activities"
                />
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center justify-center w-10 h-10 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              aria-label="Refresh activities"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Filter Controls */}
          {enableFiltering && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                aria-expanded={showFilters}
                aria-controls="activity-filters"
              >
                <Filter size={16} />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-blue-500 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown 
                  size={16} 
                  className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`}
                />
              </button>
              <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                <span>{filteredActivities.length} activities</span>
                {!isConnected && enableRealTime && (
                  <div className="flex items-center space-x-1 text-orange-500">
                    <AlertCircle size={12} />
                    <span>Offline</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Filter Options */}
          <AnimatePresence>
            {showFilters && enableFiltering && (
              <motion.div
                id="activity-filters"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                {/* Type Filters */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Activity Types
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(ACTIVITY_CONFIG).map(([type, config]) => (
                      <button
                        key={type}
                        onClick={() => handleTypeFilterChange(type as ActivityItem['type'])}
                        className={`
                          inline-flex items-center space-x-1 px-3 py-1 text-xs rounded-full transition-colors
                          ${selectedFilters.types.includes(type as ActivityItem['type'])
                            ? `${config.color} text-white`
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}
                        `}
                        aria-pressed={selectedFilters.types.includes(type as ActivityItem['type'])}
                      >
                        <config.icon size={12} />
                        <span>{config.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority Filters */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['low', 'medium', 'high', 'critical'].map((priority) => (
                      <button
                        key={priority}
                        onClick={() => handlePriorityFilterChange(priority)}
                        className={`
                          px-3 py-1 text-xs rounded-full transition-colors capitalize
                          ${selectedFilters.priority.includes(priority)
                            ? priority === 'critical' ? 'bg-red-500 text-white' :
                              priority === 'high' ? 'bg-orange-500 text-white' :
                              priority === 'medium' ? 'bg-yellow-500 text-white' :
                              'bg-gray-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}
                        `}
                        aria-pressed={selectedFilters.priority.includes(priority)}
                      >
                        {priority}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear Filters */}
                {activeFilterCount > 0 && (
                  <div className="flex justify-end">
                    <button
                      onClick={clearFilters}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Activity List */}
      <div className="flex-1 overflow-hidden">
        {error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Failed to load activities
              </p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <VirtualScroll
            items={filteredActivities}
            itemHeight={itemHeight}
            containerHeight={height - (enableSearch || enableFiltering ? 120 : 0)}
            renderItem={renderActivityItem}
            getItemKey={(item) => item.id}
            loadMore={loadMore}
            hasMore={hasMore}
            loading={loading}
            emptyMessage={emptyMessage}
            className="px-4"
          />
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;