/**
 * Modern Sidebar Navigation Component
 * Collapsible sidebar with dark theme, smooth animations, and modern design
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  CheckSquare, 
  BarChart3, 
  Users, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  User,
  Moon,
  Sun,
  Monitor,
  LogOut,
  HelpCircle
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useUIStore, useTheme, useSidebar, useNotifications } from '../../stores/uiStore';
import { NavigationItem } from '../../types/design-system';

export interface SidebarProps {
  className?: string;
  user?: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  onUserProfileClick?: () => void;
  onLogout?: () => void;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home as any,
    href: '/',
    active: true,
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: CheckSquare as any,
    href: '/tasks',
    badge: 12,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3 as any,
    href: '/analytics',
  },
  {
    id: 'team',
    label: 'Team',
    icon: Users as any,
    href: '/team',
    badge: 3,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings as any,
    href: '/settings',
  },
];

const themeOptions = [
  { value: 'light' as const, label: 'Light', icon: Sun },
  { value: 'dark' as const, label: 'Dark', icon: Moon },
  { value: 'auto' as const, label: 'System', icon: Monitor },
];

export const Sidebar: React.FC<SidebarProps> = ({
  className,
  user = {
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Developer',
  },
  onUserProfileClick,
  onLogout,
}) => {
  const theme = useTheme();
  const { collapsed, toggle, setCollapsed } = useSidebar();
  const { notifications } = useNotifications();
  const { setTheme } = useUIStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const unreadNotifications = notifications.filter(n => !n.persistent).length;

  const sidebarVariants = {
    expanded: {
      width: 256,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      },
    },
    collapsed: {
      width: 64,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  const contentVariants = {
    expanded: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.2,
        delay: 0.1,
      },
    },
    collapsed: {
      opacity: 0,
      x: -10,
      transition: {
        duration: 0.2,
      },
    },
  };

  const filteredNavItems = navigationItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen',
        'bg-gray-900 border-r border-gray-800',
        'flex flex-col',
        'shadow-xl',
        className
      )}
      variants={sidebarVariants}
      animate={collapsed ? 'collapsed' : 'expanded'}
      initial={false}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              variants={contentVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              className="flex items-center space-x-3"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">DF</span>
              </div>
              <div>
                <h1 className="text-white font-semibold text-lg">DevFlow</h1>
                <p className="text-gray-400 text-xs">Intelligence Dashboard</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={toggle}
          className={cn(
            'p-2 rounded-lg transition-colors',
            'text-gray-400 hover:text-white hover:bg-gray-800',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            collapsed && 'mx-auto'
          )}
        >
          {collapsed ? (
            <ChevronRight size={20} />
          ) : (
            <ChevronLeft size={20} />
          )}
        </button>
      </div>

      {/* Search */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            variants={contentVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            className="p-4 border-b border-gray-800"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search navigation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'w-full pl-10 pr-4 py-2 rounded-lg',
                  'bg-gray-800 border border-gray-700',
                  'text-white placeholder-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  'transition-colors'
                )}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon as React.ComponentType<{ size?: number; className?: string }>;
          
          return (
            <motion.a
              key={item.id}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200',
                'group relative',
                item.active
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800',
                collapsed && 'justify-center'
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon size={20} className="flex-shrink-0" />
              
              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    variants={contentVariants}
                    initial="collapsed"
                    animate="expanded"
                    exit="collapsed"
                    className="flex items-center justify-between flex-1 min-w-0"
                  >
                    <span className="font-medium truncate">{item.label}</span>
                    {item.badge && (
                      <span className={cn(
                        'px-2 py-1 text-xs font-medium rounded-full',
                        item.active
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-700 text-gray-300'
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className={cn(
                  'absolute left-full ml-2 px-2 py-1 rounded-md',
                  'bg-gray-800 text-white text-sm',
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                  'pointer-events-none z-50',
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
            </motion.a>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 p-4 space-y-2">
        {/* Notifications */}
        <button
          className={cn(
            'flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors w-full',
            'text-gray-300 hover:text-white hover:bg-gray-800',
            'group relative',
            collapsed && 'justify-center'
          )}
        >
          <div className="relative">
            <Bell size={20} />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </div>
          
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                variants={contentVariants}
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
                className="font-medium"
              >
                Notifications
              </motion.span>
            )}
          </AnimatePresence>

          {collapsed && (
            <div className={cn(
              'absolute left-full ml-2 px-2 py-1 rounded-md',
              'bg-gray-800 text-white text-sm',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              'pointer-events-none z-50',
              'whitespace-nowrap'
            )}>
              Notifications
              {unreadNotifications > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-500 rounded-full text-xs">
                  {unreadNotifications}
                </span>
              )}
            </div>
          )}
        </button>

        {/* Theme Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className={cn(
              'flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors w-full',
              'text-gray-300 hover:text-white hover:bg-gray-800',
              'group relative',
              collapsed && 'justify-center'
            )}
          >
            {theme === 'light' && <Sun size={20} />}
            {theme === 'dark' && <Moon size={20} />}
            {theme === 'auto' && <Monitor size={20} />}
            
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  variants={contentVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  className="font-medium capitalize"
                >
                  {theme} Theme
                </motion.span>
              )}
            </AnimatePresence>

            {collapsed && (
              <div className={cn(
                'absolute left-full ml-2 px-2 py-1 rounded-md',
                'bg-gray-800 text-white text-sm',
                'opacity-0 group-hover:opacity-100 transition-opacity',
                'pointer-events-none z-50',
                'whitespace-nowrap'
              )}>
                {theme} Theme
              </div>
            )}
          </button>

          {/* Theme Menu */}
          <AnimatePresence>
            {showThemeMenu && !collapsed && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  'absolute bottom-full mb-2 left-0 right-0',
                  'bg-gray-800 border border-gray-700 rounded-lg shadow-xl',
                  'py-2 z-50'
                )}
              >
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        setTheme(option.value);
                        setShowThemeMenu(false);
                      }}
                      className={cn(
                        'flex items-center space-x-3 px-4 py-2 w-full',
                        'text-gray-300 hover:text-white hover:bg-gray-700',
                        'transition-colors',
                        theme === option.value && 'text-blue-400 bg-gray-700'
                      )}
                    >
                      <Icon size={16} />
                      <span className="text-sm">{option.label}</span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={cn(
              'flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors w-full',
              'text-gray-300 hover:text-white hover:bg-gray-800',
              'group relative',
              collapsed && 'justify-center'
            )}
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full" />
              ) : (
                <User size={16} className="text-white" />
              )}
            </div>
            
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  variants={contentVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  className="flex-1 text-left min-w-0"
                >
                  <p className="font-medium truncate">{user.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user.role}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {collapsed && (
              <div className={cn(
                'absolute left-full ml-2 px-2 py-1 rounded-md',
                'bg-gray-800 text-white text-sm',
                'opacity-0 group-hover:opacity-100 transition-opacity',
                'pointer-events-none z-50',
                'whitespace-nowrap'
              )}>
                {user.name}
                <br />
                <span className="text-xs text-gray-400">{user.role}</span>
              </div>
            )}
          </button>

          {/* User Menu */}
          <AnimatePresence>
            {showUserMenu && !collapsed && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  'absolute bottom-full mb-2 left-0 right-0',
                  'bg-gray-800 border border-gray-700 rounded-lg shadow-xl',
                  'py-2 z-50'
                )}
              >
                <button
                  onClick={() => {
                    onUserProfileClick?.();
                    setShowUserMenu(false);
                  }}
                  className={cn(
                    'flex items-center space-x-3 px-4 py-2 w-full',
                    'text-gray-300 hover:text-white hover:bg-gray-700',
                    'transition-colors'
                  )}
                >
                  <User size={16} />
                  <span className="text-sm">Profile</span>
                </button>
                
                <button
                  className={cn(
                    'flex items-center space-x-3 px-4 py-2 w-full',
                    'text-gray-300 hover:text-white hover:bg-gray-700',
                    'transition-colors'
                  )}
                >
                  <HelpCircle size={16} />
                  <span className="text-sm">Help & Support</span>
                </button>
                
                <div className="border-t border-gray-700 my-2" />
                
                <button
                  onClick={() => {
                    onLogout?.();
                    setShowUserMenu(false);
                  }}
                  className={cn(
                    'flex items-center space-x-3 px-4 py-2 w-full',
                    'text-red-400 hover:text-red-300 hover:bg-gray-700',
                    'transition-colors'
                  )}
                >
                  <LogOut size={16} />
                  <span className="text-sm">Sign Out</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
};