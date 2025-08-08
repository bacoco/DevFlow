/**
 * Adaptive Navigation Component
 * Navigation that adapts based on user role, context, and usage patterns
 */

import React, { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  CheckSquare, 
  BarChart3, 
  Users, 
  Settings,
  ChevronDown,
  ChevronRight,
  Pin,
  Clock,
  Star,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useNavigationStore, useNavigationContext, useNavigationPreferences } from './NavigationController';
import { AdaptiveNavigationItem, NavigationCondition, UserRole } from './types';

interface AdaptiveNavigationProps {
  className?: string;
  collapsed?: boolean;
  maxItems?: number;
  showRecentItems?: boolean;
  showPinnedItems?: boolean;
  enableReordering?: boolean;
  onItemClick?: (item: AdaptiveNavigationItem) => void;
}

// Base navigation items with adaptive properties
const baseNavigationItems: AdaptiveNavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    href: '/',
    priority: 10,
    contextRelevance: 1,
    userFrequency: 0,
    roleVisibility: ['viewer', 'contributor', 'admin', 'owner'],
    active: true,
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: CheckSquare,
    href: '/tasks',
    priority: 9,
    contextRelevance: 0.8,
    userFrequency: 0,
    roleVisibility: ['contributor', 'admin', 'owner'],
    badge: 12,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    href: '/analytics',
    priority: 8,
    contextRelevance: 0.6,
    userFrequency: 0,
    roleVisibility: ['contributor', 'admin', 'owner'],
    conditions: [
      {
        type: 'permission',
        operator: 'contains',
        value: 'analytics.view',
      },
    ],
  },
  {
    id: 'team',
    label: 'Team',
    icon: Users,
    href: '/team',
    priority: 7,
    contextRelevance: 0.5,
    userFrequency: 0,
    roleVisibility: ['admin', 'owner'],
    badge: 3,
    children: [
      {
        id: 'team-members',
        label: 'Members',
        href: '/team/members',
        priority: 5,
        contextRelevance: 0.4,
        userFrequency: 0,
        roleVisibility: ['admin', 'owner'],
      },
      {
        id: 'team-roles',
        label: 'Roles & Permissions',
        href: '/team/roles',
        priority: 4,
        contextRelevance: 0.3,
        userFrequency: 0,
        roleVisibility: ['owner'],
      },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    href: '/settings',
    priority: 6,
    contextRelevance: 0.3,
    userFrequency: 0,
    roleVisibility: ['viewer', 'contributor', 'admin', 'owner'],
    children: [
      {
        id: 'settings-profile',
        label: 'Profile',
        href: '/settings/profile',
        priority: 3,
        contextRelevance: 0.2,
        userFrequency: 0,
        roleVisibility: ['viewer', 'contributor', 'admin', 'owner'],
      },
      {
        id: 'settings-preferences',
        label: 'Preferences',
        href: '/settings/preferences',
        priority: 2,
        contextRelevance: 0.2,
        userFrequency: 0,
        roleVisibility: ['viewer', 'contributor', 'admin', 'owner'],
      },
      {
        id: 'settings-integrations',
        label: 'Integrations',
        href: '/settings/integrations',
        priority: 1,
        contextRelevance: 0.1,
        userFrequency: 0,
        roleVisibility: ['admin', 'owner'],
      },
    ],
  },
];

export const AdaptiveNavigation: React.FC<AdaptiveNavigationProps> = ({
  className,
  collapsed = false,
  maxItems = 10,
  showRecentItems = true,
  showPinnedItems = true,
  enableReordering = true,
  onItemClick,
}) => {
  const { navigateTo, addRecentItem, togglePinnedItem } = useNavigationStore();
  const context = useNavigationContext();
  const preferences = useNavigationPreferences();
  
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // Evaluate navigation conditions
  const evaluateCondition = (condition: NavigationCondition, context: any): boolean => {
    const { type, operator, value, negate = false } = condition;
    let result = false;

    switch (type) {
      case 'role':
        result = operator === 'equals' 
          ? context.userRole.level === value
          : context.userRole.level !== value;
        break;
      case 'permission':
        result = operator === 'contains'
          ? context.userRole.permissions.includes(value)
          : !context.userRole.permissions.includes(value);
        break;
      case 'feature':
        // Feature flag evaluation would go here
        result = true;
        break;
      case 'context':
        // Context-based conditions
        result = true;
        break;
      case 'time':
        // Time-based conditions
        result = true;
        break;
    }

    return negate ? !result : result;
  };

  // Filter and sort navigation items based on adaptive criteria
  const adaptiveItems = useMemo(() => {
    const userRole = context.userRole;
    
    const filterAndScoreItems = (items: AdaptiveNavigationItem[]): AdaptiveNavigationItem[] => {
      return items
        .filter(item => {
          // Check role visibility
          if (!item.roleVisibility.includes(userRole.level)) {
            return false;
          }
          
          // Check conditions
          if (item.conditions) {
            return item.conditions.every(condition => 
              evaluateCondition(condition, context)
            );
          }
          
          return !item.hidden;
        })
        .map(item => {
          // Calculate adaptive score
          const frequencyScore = preferences.recentItems.includes(item.id) ? 0.3 : 0;
          const pinnedScore = preferences.pinnedItems.includes(item.id) ? 0.5 : 0;
          const adaptiveScore = 
            item.priority * 0.4 + 
            item.contextRelevance * 0.3 + 
            frequencyScore + 
            pinnedScore;

          return {
            ...item,
            adaptiveScore,
            children: item.children ? filterAndScoreItems(item.children) : undefined,
          };
        })
        .sort((a, b) => {
          // Sort by pinned status first, then adaptive score
          const aPinned = preferences.pinnedItems.includes(a.id);
          const bPinned = preferences.pinnedItems.includes(b.id);
          
          if (aPinned && !bPinned) return -1;
          if (!aPinned && bPinned) return 1;
          
          return (b as any).adaptiveScore - (a as any).adaptiveScore;
        })
        .slice(0, maxItems);
    };

    return filterAndScoreItems(baseNavigationItems);
  }, [context, preferences, maxItems]);

  // Handle item click
  const handleItemClick = (item: AdaptiveNavigationItem, event: React.MouseEvent) => {
    event.preventDefault();
    
    if (item.children && item.children.length > 0) {
      // Toggle expansion for items with children
      setExpandedItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(item.id)) {
          newSet.delete(item.id);
        } else {
          newSet.add(item.id);
        }
        return newSet;
      });
    } else if (item.href) {
      // Navigate to item
      navigateTo(item.href);
      addRecentItem(item.id);
    }
    
    if (item.onClick) {
      item.onClick();
    }
    
    onItemClick?.(item);
  };

  // Handle pin toggle
  const handlePinToggle = (item: AdaptiveNavigationItem, event: React.MouseEvent) => {
    event.stopPropagation();
    togglePinnedItem(item.id);
  };

  // Render navigation item
  const renderNavigationItem = (item: AdaptiveNavigationItem, level = 0) => {
    const Icon = item.icon as React.ComponentType<{ size?: number; className?: string }>;
    const isExpanded = expandedItems.has(item.id);
    const isPinned = preferences.pinnedItems.includes(item.id);
    const isRecent = preferences.recentItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id} className={cn('relative', level > 0 && 'ml-4')}>
        <motion.div
          className={cn(
            'group flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            item.active && 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
            item.disabled && 'opacity-50 cursor-not-allowed',
            collapsed && 'justify-center px-2',
            'cursor-pointer'
          )}
          onClick={(e) => handleItemClick(item, e)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          layout
        >
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {/* Icon */}
            <div className="flex-shrink-0 relative">
              {Icon && <Icon size={20} />}
              
              {/* Status indicators */}
              {isRecent && !collapsed && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
              )}
            </div>

            {/* Label and badge */}
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center justify-between flex-1 min-w-0"
                >
                  <span className="font-medium truncate">{item.label}</span>
                  
                  <div className="flex items-center space-x-1">
                    {/* Badge */}
                    {item.badge && (
                      <span className={cn(
                        'px-2 py-1 text-xs font-medium rounded-full',
                        item.active
                          ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      )}>
                        {item.badge}
                      </span>
                    )}
                    
                    {/* Expand/collapse icon */}
                    {hasChildren && (
                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight size={16} className="text-gray-400" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {/* Pin button */}
                <button
                  onClick={(e) => handlePinToggle(item, e)}
                  className={cn(
                    'p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
                    isPinned && 'text-yellow-500'
                  )}
                  title={isPinned ? 'Unpin item' : 'Pin item'}
                >
                  <Pin size={14} />
                </button>
                
                {/* More actions */}
                <button
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title="More actions"
                >
                  <MoreHorizontal size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Children */}
        <AnimatePresence>
          {hasChildren && isExpanded && !collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-1 space-y-1">
                {item.children!.map(child => renderNavigationItem(child, level + 1))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tooltip for collapsed state */}
        {collapsed && (
          <div className={cn(
            'absolute left-full ml-2 px-2 py-1 rounded-md z-50',
            'bg-gray-900 dark:bg-gray-700 text-white text-sm',
            'opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none',
            'whitespace-nowrap'
          )}>
            {item.label}
            {item.badge && (
              <span className="ml-2 px-1.5 py-0.5 bg-blue-600 rounded-full text-xs">
                {item.badge}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className={cn('space-y-1', className)}>
      {/* Pinned items section */}
      {showPinnedItems && preferences.pinnedItems.length > 0 && !collapsed && (
        <div className="mb-4">
          <div className="flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <Pin size={12} />
            <span>Pinned</span>
          </div>
          <div className="space-y-1">
            {adaptiveItems
              .filter(item => preferences.pinnedItems.includes(item.id))
              .map(item => renderNavigationItem(item))}
          </div>
        </div>
      )}

      {/* Main navigation items */}
      <div className="space-y-1">
        {adaptiveItems
          .filter(item => !preferences.pinnedItems.includes(item.id))
          .map(item => renderNavigationItem(item))}
      </div>

      {/* Recent items section */}
      {showRecentItems && preferences.recentItems.length > 0 && !collapsed && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <Clock size={12} />
            <span>Recent</span>
          </div>
          <div className="space-y-1">
            {preferences.recentItems
              .slice(0, 5)
              .map(itemId => {
                const item = baseNavigationItems.find(i => i.id === itemId);
                return item ? renderNavigationItem(item) : null;
              })
              .filter(Boolean)}
          </div>
        </div>
      )}
    </nav>
  );
};