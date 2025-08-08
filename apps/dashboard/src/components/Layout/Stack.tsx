/**
 * Stack Layout Component
 * Simplified vertical or horizontal stacking with consistent spacing
 */

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Stack direction */
  direction?: 'vertical' | 'horizontal';
  /** Spacing between items */
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Align items */
  align?: 'start' | 'end' | 'center' | 'stretch';
  /** Justify content */
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
  /** Wrap items */
  wrap?: boolean;
  /** Divider between items */
  divider?: React.ReactNode;
  /** Enable full height */
  fullHeight?: boolean;
  /** Enable full width */
  fullWidth?: boolean;
  children: React.ReactNode;
}

const spacingClasses = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
  '2xl': 'gap-12'
};

const alignClasses = {
  start: 'items-start',
  end: 'items-end',
  center: 'items-center',
  stretch: 'items-stretch'
};

const justifyClasses = {
  start: 'justify-start',
  end: 'justify-end',
  center: 'justify-center',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly'
};

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  ({ 
    direction = 'vertical',
    spacing = 'md',
    align,
    justify,
    wrap = false,
    divider,
    fullHeight = false,
    fullWidth = false,
    className,
    children,
    ...props
  }, ref) => {
    const isVertical = direction === 'vertical';
    
    const stackClasses = cn(
      'flex',
      isVertical ? 'flex-col' : 'flex-row',
      spacingClasses[spacing],
      align && alignClasses[align],
      justify && justifyClasses[justify],
      wrap && 'flex-wrap',
      fullHeight && 'h-full',
      fullWidth && 'w-full',
      className
    );

    // Handle dividers
    const childrenArray = React.Children.toArray(children);
    const childrenWithDividers = divider 
      ? childrenArray.reduce((acc, child, index) => {
          acc.push(child);
          if (index < childrenArray.length - 1) {
            acc.push(
              <div 
                key={`divider-${index}`} 
                className={cn(
                  'flex-shrink-0',
                  isVertical ? 'w-full' : 'h-full'
                )}
              >
                {divider}
              </div>
            );
          }
          return acc;
        }, [] as React.ReactNode[])
      : childrenArray;

    return (
      <div
        ref={ref}
        className={stackClasses}
        {...props}
      >
        {childrenWithDividers}
      </div>
    );
  }
);

Stack.displayName = 'Stack';