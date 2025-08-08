/**
 * Responsive Container Component
 * Provides responsive layout container with CSS Grid and container queries
 */

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { designTokens } from '../../styles/design-tokens';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum width constraint */
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'none';
  /** Padding configuration */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'responsive';
  /** Center the container */
  centered?: boolean;
  /** Enable fluid width */
  fluid?: boolean;
  /** Custom breakpoint behavior */
  breakpoint?: keyof typeof designTokens.screens;
  children: React.ReactNode;
}

const maxWidthClasses = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-full',
  none: 'max-w-none'
};

const paddingClasses = {
  none: '',
  sm: 'px-4 py-2',
  md: 'px-6 py-4',
  lg: 'px-8 py-6',
  xl: 'px-12 py-8',
  responsive: 'px-4 sm:px-6 lg:px-8'
};

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ 
    maxWidth = 'full',
    padding = 'responsive',
    centered = true,
    fluid = false,
    breakpoint,
    className,
    children,
    ...props
  }, ref) => {
    const containerClasses = cn(
      'w-full',
      !fluid && maxWidthClasses[maxWidth],
      paddingClasses[padding],
      centered && 'mx-auto',
      breakpoint && `container-${breakpoint}`,
      className
    );

    return (
      <div
        ref={ref}
        className={containerClasses}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Container.displayName = 'Container';