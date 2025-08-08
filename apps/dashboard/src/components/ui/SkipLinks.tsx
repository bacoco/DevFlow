/**
 * Skip Links Component
 * Provides keyboard navigation shortcuts for accessibility
 */

import React from 'react';
import { cn } from '../../utils/cn';

export const SkipLinks: React.FC = () => {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <a
        href="#main-content"
        className={cn(
          'absolute top-4 left-4 z-50',
          'bg-blue-600 text-white px-4 py-2 rounded-lg',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          'transition-all duration-200',
          'font-medium text-sm'
        )}
      >
        Skip to main content
      </a>
      <a
        href="#navigation"
        className={cn(
          'absolute top-4 left-32 z-50',
          'bg-blue-600 text-white px-4 py-2 rounded-lg',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          'transition-all duration-200',
          'font-medium text-sm'
        )}
      >
        Skip to navigation
      </a>
    </div>
  );
};

export default SkipLinks;