/**
 * Enhanced Breadcrumb Component
 * Advanced breadcrumb navigation with clickable history, context menus, and smart truncation
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  Home, 
  MoreHorizontal, 
  Clock, 
  Bookmark,
  Copy,
  Share,
  ExternalLink
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useNavigationStore, useBreadcrumbs, useNavigationHistory } from './NavigationController';
import { BreadcrumbItem } from './types';

interface EnhancedBreadcrumbProps {
  className?: string;
  maxItems?: number;
  showHome?: boolean;
  showHistory?: boolean;
  enableContextMenu?: boolean;
  separator?: React.ReactNode;
  onItemClick?: (item: BreadcrumbItem) => void;
}

interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  item: BreadcrumbItem | null;
}

export const EnhancedBreadcrumb: React.FC<EnhancedBreadcrumbProps> = ({
  className,
  maxItems = 5,
  showHome = true,
  showHistory = true,
  enableContextMenu = true,
  separator = <ChevronRight size={16} className="text-gray-400" />,
  onItemClick,
}) => {
  const { navigateTo, updateBreadcrumbs } = useNavigationStore();
  const breadcrumbs = useBreadcrumbs();
  const history = useNavigationHistory();
  
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    item: null,
  });
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const historyDropdownRef = useRef<HTMLDivElement>(null);

  // Add home item if requested and not already present
  const allItems = showHome && breadcrumbs[0]?.id !== 'home' 
    ? [{ id: 'home', label: 'Home', href: '/', icon: Home, clickable: true }, ...breadcrumbs]
    : breadcrumbs;

  // Smart truncation with ellipsis
  const displayItems = allItems.length > maxItems
    ? [
        ...allItems.slice(0, 1), // Always show first item
        { 
          id: 'ellipsis', 
          label: '...', 
          clickable: false,
          metadata: { hiddenItems: allItems.slice(1, -maxItems + 2) }
        },
        ...allItems.slice(-maxItems + 2) // Show last items
      ]
    : allItems;

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, item: null });
      }
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(event.target as Node)) {
        setShowHistoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle item click
  const handleItemClick = (item: BreadcrumbItem, event: React.MouseEvent) => {
    if (item.id === 'ellipsis') {
      // Show hidden items in dropdown
      setShowHistoryDropdown(true);
      return;
    }

    if (!item.clickable) {
      return;
    }

    event.preventDefault();
    
    if (item.href) {
      navigateTo(item.href);
    }
    
    onItemClick?.(item);
  };

  // Handle context menu
  const handleContextMenu = (item: BreadcrumbItem, event: React.MouseEvent) => {
    if (!enableContextMenu || item.id === 'ellipsis' || !item.clickable) {
      return;
    }

    event.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: event.clientX, y: event.clientY },
      item,
    });
  };

  // Context menu actions
  const handleCopyLink = () => {
    if (contextMenu.item?.href) {
      navigator.clipboard.writeText(window.location.origin + contextMenu.item.href);
    }
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, item: null });
  };

  const handleOpenInNewTab = () => {
    if (contextMenu.item?.href) {
      window.open(contextMenu.item.href, '_blank');
    }
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, item: null });
  };

  const handleBookmark = () => {
    // Add to bookmarks (would integrate with browser bookmarks API)
    console.log('Bookmark:', contextMenu.item);
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, item: null });
  };

  // Render breadcrumb item
  const renderBreadcrumbItem = (item: BreadcrumbItem, index: number) => {
    const isLast = index === displayItems.length - 1;
    const isEllipsis = item.id === 'ellipsis';
    const Icon = item.icon as React.ComponentType<{ size?: number; className?: string }>;
    const isHovered = hoveredItem === item.id;

    return (
      <li key={item.id} className="flex items-center">
        {index > 0 && (
          <span className="mx-2 flex-shrink-0">
            {separator}
          </span>
        )}
        
        <motion.div
          className="relative"
          onHoverStart={() => setHoveredItem(item.id)}
          onHoverEnd={() => setHoveredItem(null)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isEllipsis ? (
            <button
              onClick={(e) => handleItemClick(item, e)}
              className={cn(
                'flex items-center space-x-1 px-2 py-1 rounded-md transition-colors',
                'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
                'dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
              )}
              title={`Show ${item.metadata?.hiddenItems?.length || 0} hidden items`}
            >
              <MoreHorizontal size={16} />
            </button>
          ) : (
            <div
              className={cn(
                'flex items-center space-x-2 px-2 py-1 rounded-md transition-all duration-200',
                item.clickable && !isLast && 'cursor-pointer',
                item.clickable && !isLast && 'hover:bg-gray-100 dark:hover:bg-gray-800',
                item.clickable && !isLast && 'hover:text-gray-900 dark:hover:text-gray-100',
                isLast && 'text-gray-900 dark:text-gray-100 font-medium',
                !isLast && 'text-gray-600 dark:text-gray-400',
                item.clickable && 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
              )}
              onClick={item.clickable ? (e) => handleItemClick(item, e) : undefined}
              onContextMenu={item.clickable ? (e) => handleContextMenu(item, e) : undefined}
              role={item.clickable ? 'button' : undefined}
              tabIndex={item.clickable ? 0 : undefined}
              aria-current={isLast ? 'page' : undefined}
            >
              {/* Icon */}
              {Icon && (
                <Icon 
                  size={16} 
                  className={cn(
                    'flex-shrink-0',
                    isHovered && item.clickable && 'text-blue-500'
                  )} 
                />
              )}
              
              {/* Label */}
              <span className={cn(
                'truncate max-w-32 transition-colors',
                isHovered && item.clickable && 'text-blue-500'
              )}>
                {item.label}
              </span>
              
              {/* Hover indicator */}
              {isHovered && item.clickable && !isLast && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-1 h-1 bg-blue-500 rounded-full"
                />
              )}
            </div>
          )}

          {/* Tooltip for truncated items */}
          {item.label.length > 20 && (
            <div className={cn(
              'absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 z-50',
              'px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded',
              'opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none',
              'whitespace-nowrap'
            )}>
              {item.label}
            </div>
          )}
        </motion.div>
      </li>
    );
  };

  return (
    <div className={cn('relative', className)}>
      {/* Main breadcrumb navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center">
        <ol className="flex items-center space-x-1">
          {displayItems.map((item, index) => renderBreadcrumbItem(item, index))}
        </ol>

        {/* History button */}
        {showHistory && history.length > 0 && (
          <div className="relative ml-4">
            <button
              onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
              className={cn(
                'p-2 rounded-md transition-colors',
                'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
                'dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800',
                'focus:outline-none focus:ring-2 focus:ring-blue-500'
              )}
              title="Navigation history"
            >
              <Clock size={16} />
            </button>

            {/* History dropdown */}
            <AnimatePresence>
              {showHistoryDropdown && (
                <motion.div
                  ref={historyDropdownRef}
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className={cn(
                    'absolute top-full right-0 mt-2 w-64 z-50',
                    'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                    'rounded-lg shadow-xl py-2'
                  )}
                >
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                    Recent Pages
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto">
                    {history.slice(0, 10).map((historyItem) => (
                      <button
                        key={historyItem.id}
                        onClick={() => {
                          navigateTo(historyItem.route);
                          setShowHistoryDropdown(false);
                        }}
                        className={cn(
                          'w-full flex items-center space-x-3 px-3 py-2 text-left',
                          'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {historyItem.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {historyItem.route}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(historyItem.timestamp).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </nav>

      {/* Context menu */}
      <AnimatePresence>
        {contextMenu.isOpen && contextMenu.item && (
          <motion.div
            ref={contextMenuRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              'fixed z-50 w-48',
              'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
              'rounded-lg shadow-xl py-2'
            )}
            style={{
              left: contextMenu.position.x,
              top: contextMenu.position.y,
            }}
          >
            <button
              onClick={() => handleItemClick(contextMenu.item!, {} as React.MouseEvent)}
              className={cn(
                'w-full flex items-center space-x-3 px-3 py-2 text-left',
                'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                'text-gray-700 dark:text-gray-300'
              )}
            >
              <ExternalLink size={16} />
              <span className="text-sm">Go to page</span>
            </button>
            
            <button
              onClick={handleOpenInNewTab}
              className={cn(
                'w-full flex items-center space-x-3 px-3 py-2 text-left',
                'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                'text-gray-700 dark:text-gray-300'
              )}
            >
              <ExternalLink size={16} />
              <span className="text-sm">Open in new tab</span>
            </button>
            
            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
            
            <button
              onClick={handleCopyLink}
              className={cn(
                'w-full flex items-center space-x-3 px-3 py-2 text-left',
                'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                'text-gray-700 dark:text-gray-300'
              )}
            >
              <Copy size={16} />
              <span className="text-sm">Copy link</span>
            </button>
            
            <button
              onClick={handleBookmark}
              className={cn(
                'w-full flex items-center space-x-3 px-3 py-2 text-left',
                'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                'text-gray-700 dark:text-gray-300'
              )}
            >
              <Bookmark size={16} />
              <span className="text-sm">Bookmark</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};