/**
 * Breadcrumb Navigation Component
 * Modern breadcrumb navigation with smooth animations and dark theme support
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface BreadcrumbItem {
  id: string;
  label: string;
  href?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  active?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  showHome?: boolean;
  maxItems?: number;
  className?: string;
  onItemClick?: (item: BreadcrumbItem) => void;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator = <ChevronRight size={16} className="text-gray-400" />,
  showHome = true,
  maxItems = 5,
  className,
  onItemClick,
}) => {
  // Add home item if requested and not already present
  const allItems = showHome && items[0]?.id !== 'home' 
    ? [{ id: 'home', label: 'Home', href: '/', icon: Home }, ...items]
    : items;

  // Truncate items if too many
  const displayItems = allItems.length > maxItems
    ? [
        ...allItems.slice(0, 1),
        { id: 'ellipsis', label: '...', active: false },
        ...allItems.slice(-maxItems + 2)
      ]
    : allItems;

  const handleItemClick = (item: BreadcrumbItem, event: React.MouseEvent) => {
    if (item.id === 'ellipsis') {
      event.preventDefault();
      return;
    }

    if (onItemClick) {
      event.preventDefault();
      onItemClick(item);
    }
  };

  return (
    <nav
      className={cn('flex items-center space-x-1 text-sm', className)}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-1">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const Icon = item.icon;
          const isEllipsis = item.id === 'ellipsis';

          return (
            <li key={item.id} className="flex items-center">
              {index > 0 && (
                <span className="mx-2 flex-shrink-0">
                  {separator}
                </span>
              )}
              
              {isEllipsis ? (
                <span className="text-gray-500 px-2 py-1">
                  {item.label}
                </span>
              ) : (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {item.href && !isLast ? (
                    <a
                      href={item.href}
                      onClick={(e) => handleItemClick(item, e)}
                      className={cn(
                        'flex items-center space-x-1 px-2 py-1 rounded-md transition-colors',
                        'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                        'dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
                      )}
                      aria-current={isLast ? 'page' : undefined}
                    >
                      {Icon && <Icon size={16} className="flex-shrink-0" />}
                      <span className="truncate max-w-32">{item.label}</span>
                    </a>
                  ) : (
                    <span
                      className={cn(
                        'flex items-center space-x-1 px-2 py-1',
                        isLast
                          ? 'text-gray-900 dark:text-gray-100 font-medium'
                          : 'text-gray-600 dark:text-gray-400'
                      )}
                      aria-current={isLast ? 'page' : undefined}
                    >
                      {Icon && <Icon size={16} className="flex-shrink-0" />}
                      <span className="truncate max-w-32">{item.label}</span>
                    </span>
                  )}
                </motion.div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};