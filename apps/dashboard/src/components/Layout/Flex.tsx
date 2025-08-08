/**
 * Flexible Layout Component
 * Flexbox-based layout system with responsive capabilities
 */

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Flex direction */
  direction?: 'row' | 'row-reverse' | 'col' | 'col-reverse' | {
    xs?: 'row' | 'row-reverse' | 'col' | 'col-reverse';
    sm?: 'row' | 'row-reverse' | 'col' | 'col-reverse';
    md?: 'row' | 'row-reverse' | 'col' | 'col-reverse';
    lg?: 'row' | 'row-reverse' | 'col' | 'col-reverse';
    xl?: 'row' | 'row-reverse' | 'col' | 'col-reverse';
    '2xl'?: 'row' | 'row-reverse' | 'col' | 'col-reverse';
  };
  /** Flex wrap */
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  /** Gap between items */
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Align items */
  align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch';
  /** Justify content */
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
  /** Align content (for wrapped items) */
  alignContent?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly' | 'stretch';
  /** Enable full height */
  fullHeight?: boolean;
  /** Enable full width */
  fullWidth?: boolean;
  children: React.ReactNode;
}

const directionClasses = {
  row: 'flex-row',
  'row-reverse': 'flex-row-reverse',
  col: 'flex-col',
  'col-reverse': 'flex-col-reverse'
};

const wrapClasses = {
  nowrap: 'flex-nowrap',
  wrap: 'flex-wrap',
  'wrap-reverse': 'flex-wrap-reverse'
};

const gapClasses = {
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
  baseline: 'items-baseline',
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

const alignContentClasses = {
  start: 'content-start',
  end: 'content-end',
  center: 'content-center',
  between: 'content-between',
  around: 'content-around',
  evenly: 'content-evenly',
  stretch: 'content-stretch'
};

export const Flex = forwardRef<HTMLDivElement, FlexProps>(
  ({ 
    direction = 'row',
    wrap = 'nowrap',
    gap = 'none',
    align,
    justify,
    alignContent,
    fullHeight = false,
    fullWidth = false,
    className,
    children,
    ...props
  }, ref) => {
    // Generate responsive direction classes
    const getDirectionClasses = () => {
      if (typeof direction === 'string') {
        return directionClasses[direction];
      }
      
      const responsiveClasses = [];
      if (direction.xs) responsiveClasses.push(directionClasses[direction.xs]);
      if (direction.sm) responsiveClasses.push(`sm:${directionClasses[direction.sm]}`);
      if (direction.md) responsiveClasses.push(`md:${directionClasses[direction.md]}`);
      if (direction.lg) responsiveClasses.push(`lg:${directionClasses[direction.lg]}`);
      if (direction.xl) responsiveClasses.push(`xl:${directionClasses[direction.xl]}`);
      if (direction['2xl']) responsiveClasses.push(`2xl:${directionClasses[direction['2xl']]}`);
      
      return responsiveClasses.join(' ');
    };

    const flexClasses = cn(
      'flex',
      getDirectionClasses(),
      wrapClasses[wrap],
      gapClasses[gap],
      align && alignClasses[align],
      justify && justifyClasses[justify],
      alignContent && alignContentClasses[alignContent],
      fullHeight && 'h-full',
      fullWidth && 'w-full',
      className
    );

    return (
      <div
        ref={ref}
        className={flexClasses}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Flex.displayName = 'Flex';