/**
 * Modern Header Component
 * Sticky header with search, notifications, and user profile integration
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Bell, 
  Settings, 
  User, 
  Command,
  X,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useUIStore, useSidebar, useNotifications } from '../../stores/uiStore';
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';
import { Notification } from '../../types/design-system';

export interface HeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  showSearch?: boolean;
  showNotifications?: boolean;
  className?: string;
  onSearchSubmit?: (query: string) => void;
  onNotificationClick?: (notification: Notification) => void;
}

const notificationIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertCircle,
  error: AlertCircle,
};

export const Header: React.FC<HeaderProps> = ({
  breadcrumbs = [],
  showSearch = true,
  showNotifications = true,
  className,
  onSearchSubmit,
  onNotificationClick,
}) => {
  const { collapsed } = useSidebar();
  const { notifications, removeNotification, clearNotifications } = useNotifications();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  const searchRef = useRef<HTMLInputElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const unreadNotifications = notifications.filter(n => !n.persistent).length;

  // Close panels when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotificationPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + K for search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
        setSearchFocused(true);
      }
      
      // Escape to close panels
      if (event.key === 'Escape') {
        setSearchFocused(false);
        setShowNotificationPanel(false);
        setShowQuickActions(false);
        searchRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearchSubmit?.(searchQuery.trim());
      setSearchFocused(false);
      searchRef.current?.blur();
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    onNotificationClick?.(notification);
    if (!notification.persistent) {
      removeNotification(notification.id);
    }
  };

  const formatNotificationTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <motion.header
      className={cn(
        'sticky top-0 z-30 h-16',
        'bg-white/80 dark:bg-gray-900/80 backdrop-blur-md',
        'border-b border-gray-200 dark:border-gray-800',
        'transition-all duration-300',
        className
      )}
      style={{
        marginLeft: collapsed ? 64 : 256,
      }}
      layout
    >
      <div className="flex items-center justify-between h-full px-6">
        {/* Left Section - Breadcrumbs */}
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          {breadcrumbs.length > 0 && (
            <Breadcrumb 
              items={breadcrumbs}
              className="hidden sm:flex"
            />
          )}
        </div>

        {/* Center Section - Search */}
        {showSearch && (
          <div className="flex-1 max-w-md mx-4">
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="relative">
                <Search 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                  size={16} 
                />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search... (⌘K)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  className={cn(
                    'w-full pl-10 pr-12 py-2 rounded-lg transition-all duration-200',
                    'bg-gray-100 dark:bg-gray-800',
                    'border border-transparent',
                    'text-gray-900 dark:text-gray-100',
                    'placeholder-gray-500 dark:placeholder-gray-400',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                    'focus:bg-white dark:focus:bg-gray-700',
                    searchFocused && 'ring-2 ring-blue-500 bg-white dark:bg-gray-700'
                  )}
                />
                
                {/* Search shortcut indicator */}
                <div className={cn(
                  'absolute right-3 top-1/2 transform -translate-y-1/2',
                  'flex items-center space-x-1 text-xs text-gray-400',
                  searchFocused && 'opacity-0'
                )}>
                  <Command size={12} />
                  <span>K</span>
                </div>

                {/* Clear search */}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className={cn(
                      'absolute right-3 top-1/2 transform -translate-y-1/2',
                      'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                      'transition-colors'
                    )}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Search suggestions/results overlay */}
              <AnimatePresence>
                {searchFocused && searchQuery && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn(
                      'absolute top-full mt-2 left-0 right-0',
                      'bg-white dark:bg-gray-800',
                      'border border-gray-200 dark:border-gray-700',
                      'rounded-lg shadow-xl',
                      'py-2 z-50'
                    )}
                  >
                    <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Press Enter to search for "{searchQuery}"
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>
        )}

        {/* Right Section - Actions */}
        <div className="flex items-center space-x-2">
          {/* Quick Actions */}
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              'text-gray-600 dark:text-gray-400',
              'hover:text-gray-900 dark:hover:text-gray-100',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
          >
            <Settings size={20} />
          </button>

          {/* Notifications */}
          {showNotifications && (
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                className={cn(
                  'relative p-2 rounded-lg transition-colors',
                  'text-gray-600 dark:text-gray-400',
                  'hover:text-gray-900 dark:hover:text-gray-100',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500'
                )}
              >
                <Bell size={20} />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-medium">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>

              {/* Notification Panel */}
              <AnimatePresence>
                {showNotificationPanel && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className={cn(
                      'absolute top-full right-0 mt-2 w-80',
                      'bg-white dark:bg-gray-800',
                      'border border-gray-200 dark:border-gray-700',
                      'rounded-lg shadow-xl',
                      'z-50'
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        Notifications
                      </h3>
                      {notifications.length > 0 && (
                        <button
                          onClick={clearNotifications}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                          <Bell size={32} className="mx-auto mb-2 opacity-50" />
                          <p>No notifications</p>
                        </div>
                      ) : (
                        <div className="py-2">
                          {notifications.map((notification) => {
                            const Icon = notificationIcons[notification.type];
                            
                            return (
                              <motion.div
                                key={notification.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className={cn(
                                  'flex items-start space-x-3 p-4',
                                  'hover:bg-gray-50 dark:hover:bg-gray-700',
                                  'cursor-pointer transition-colors',
                                  'border-l-4',
                                  notification.type === 'error' && 'border-red-500',
                                  notification.type === 'warning' && 'border-yellow-500',
                                  notification.type === 'success' && 'border-green-500',
                                  notification.type === 'info' && 'border-blue-500'
                                )}
                                onClick={() => handleNotificationClick(notification)}
                              >
                                <Icon 
                                  size={16} 
                                  className={cn(
                                    'flex-shrink-0 mt-0.5',
                                    notification.type === 'error' && 'text-red-500',
                                    notification.type === 'warning' && 'text-yellow-500',
                                    notification.type === 'success' && 'text-green-500',
                                    notification.type === 'info' && 'text-blue-500'
                                  )}
                                />
                                
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                    {notification.title}
                                  </p>
                                  {notification.message && (
                                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                                      {notification.message}
                                    </p>
                                  )}
                                  <div className="flex items-center space-x-2 mt-2">
                                    <Clock size={12} className="text-gray-400" />
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {formatNotificationTime(notification.timestamp)}
                                    </span>
                                  </div>
                                </div>

                                {!notification.persistent && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeNotification(notification.id);
                                    }}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* User Profile */}
          <button
            className={cn(
              'flex items-center space-x-2 p-2 rounded-lg transition-colors',
              'text-gray-600 dark:text-gray-400',
              'hover:text-gray-900 dark:hover:text-gray-100',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
          </button>
        </div>
      </div>
    </motion.header>
  );
};