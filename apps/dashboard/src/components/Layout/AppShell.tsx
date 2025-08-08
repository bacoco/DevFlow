/**
 * App Shell Layout Component
 * Main app layout with sticky header, collapsible sidebar, and main content area
 * Includes theme switching functionality and notification system integration
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useUIStore, useSidebar, useTheme, useNotifications } from '../../stores/uiStore';
import { Header, HeaderProps } from './Header';
import { Sidebar, SidebarProps } from './Sidebar';
import { Toast } from '../ui/Toast';
import { LayoutProps } from '../../types/design-system';

export interface AppShellProps extends Omit<LayoutProps, 'sidebar' | 'header'> {
  children: React.ReactNode;
  headerProps?: Partial<HeaderProps>;
  sidebarProps?: Partial<SidebarProps>;
  showHeader?: boolean;
  showSidebar?: boolean;
  showFooter?: boolean;
  footer?: React.ReactNode;
  className?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  headerProps = {},
  sidebarProps = {},
  showHeader = true,
  showSidebar = true,
  showFooter = false,
  footer,
  className,
  theme: propTheme,
  onSidebarToggle,
}) => {
  const { theme, setTheme } = useUIStore();
  const { collapsed, toggle } = useSidebar();
  const { notifications } = useNotifications();
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const currentTheme = propTheme || theme;
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    if (currentTheme === 'auto') {
      // Use system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const applySystemTheme = () => {
        root.classList.add(mediaQuery.matches ? 'dark' : 'light');
      };
      
      applySystemTheme();
      mediaQuery.addEventListener('change', applySystemTheme);
      
      return () => mediaQuery.removeEventListener('change', applySystemTheme);
    } else {
      // Use explicit theme
      root.classList.add(currentTheme);
    }
  }, [theme, propTheme, mounted]);

  // Handle sidebar toggle
  const handleSidebarToggle = () => {
    toggle();
    onSidebarToggle?.();
  };

  // Layout animation variants
  const layoutVariants = {
    expanded: {
      marginLeft: showSidebar ? 256 : 0,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      },
    },
    collapsed: {
      marginLeft: showSidebar ? 64 : 0,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  const contentVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
      },
    },
    exit: { 
      opacity: 0, 
      y: -20,
      transition: {
        duration: 0.2,
      },
    },
  };

  if (!mounted) {
    // Prevent hydration mismatch by not rendering until mounted
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'min-h-screen bg-gray-50 dark:bg-gray-900',
      'transition-colors duration-300',
      className
    )}>
      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <Sidebar
            {...sidebarProps}
            onUserProfileClick={sidebarProps.onUserProfileClick}
            onLogout={sidebarProps.onLogout}
          />
        )}
      </AnimatePresence>

      {/* Main Layout */}
      <motion.div
        className="flex flex-col min-h-screen"
        variants={layoutVariants}
        animate={collapsed ? 'collapsed' : 'expanded'}
        initial={false}
      >
        {/* Header */}
        <AnimatePresence>
          {showHeader && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Header
                {...headerProps}
                onSearchSubmit={headerProps.onSearchSubmit}
                onNotificationClick={headerProps.onNotificationClick}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <motion.main
          className={cn(
            'flex-1 relative',
            showHeader && 'pt-0', // Header is sticky, so no top padding needed
            'transition-all duration-300'
          )}
          variants={contentVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {/* Content Container */}
          <div className={cn(
            'h-full',
            'transition-all duration-300'
          )}>
            {children}
          </div>

          {/* Overlay for mobile when sidebar is open */}
          <AnimatePresence>
            {showSidebar && !collapsed && (
              <motion.div
                className={cn(
                  'fixed inset-0 bg-black/50 z-30',
                  'lg:hidden' // Only show on mobile
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleSidebarToggle}
              />
            )}
          </AnimatePresence>
        </motion.main>

        {/* Footer */}
        <AnimatePresence>
          {showFooter && footer && (
            <motion.footer
              className={cn(
                'border-t border-gray-200 dark:border-gray-800',
                'bg-white/80 dark:bg-gray-900/80 backdrop-blur-md',
                'transition-colors duration-300'
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              {footer}
            </motion.footer>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {notifications
            .filter(notification => !notification.persistent)
            .slice(0, 5) // Limit to 5 visible toasts
            .map((notification) => (
              <Toast
                key={notification.id}
                notification={notification}
                onDismiss={(id) => {
                  // This will be handled by the notification store
                }}
              />
            ))}
        </AnimatePresence>
      </div>

      {/* Theme transition overlay */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-40"
        initial={false}
        animate={{
          backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)',
        }}
        transition={{ duration: 0.3 }}
      />
    </div>
  );
};

// Export default for easier importing
export default AppShell;