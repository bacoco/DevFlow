/**
 * Responsive Grid System Component
 * CSS Grid-based layout system with responsive breakpoints and auto-fit capabilities
 */

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { designTokens } from '../../styles/design-tokens';

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of columns (responsive object or number) */
  columns?: number | {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  /** Gap between grid items */
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Row gap (if different from gap) */
  rowGap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Column gap (if different from gap) */
  columnGap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Auto-fit columns with minimum width */
  autoFit?: string;
  /** Auto-fill columns with minimum width */
  autoFill?: string;
  /** Minimum column width for auto layouts */
  minColumnWidth?: string;
  /** Maximum column width for auto layouts */
  maxColumnWidth?: string;
  /** Grid template areas */
  areas?: string[];
  /** Align items */
  alignItems?: 'start' | 'end' | 'center' | 'stretch';
  /** Justify items */
  justifyItems?: 'start' | 'end' | 'center' | 'stretch';
  /** Align content */
  alignContent?: 'start' | 'end' | 'center' | 'stretch' | 'space-between' | 'space-around' | 'space-evenly';
  /** Justify content */
  justifyContent?: 'start' | 'end' | 'center' | 'stretch' | 'space-between' | 'space-around' | 'space-evenly';
  children: React.ReactNode;
}

const gapClasses = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
  '2xl': 'gap-12'
};

const rowGapClasses = {
  none: 'row-gap-0',
  xs: 'row-gap-1',
  sm: 'row-gap-2',
  md: 'row-gap-4',
  lg: 'row-gap-6',
  xl: 'row-gap-8',
  '2xl': 'row-gap-12'
};

const columnGapClasses = {
  none: 'column-gap-0',
  xs: 'column-gap-1',
  sm: 'column-gap-2',
  md: 'column-gap-4',
  lg: 'column-gap-6',
  xl: 'column-gap-8',
  '2xl': 'column-gap-12'
};

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ 
    columns = 1,
    gap = 'md',
    rowGap,
    columnGap,
    autoFit,
    autoFill,
    minColumnWidth,
    maxColumnWidth,
    areas,
    alignItems,
    justifyItems,
    alignContent,
    justifyContent,
    className,
    style,
    children,
    ...props
  }, ref) => {
    // Generate responsive column classes
    const getColumnClasses = () => {
      if (typeof columns === 'number') {
        return `grid-cols-${columns}`;
      }
      
      const responsiveClasses = [];
      if (columns.xs) responsiveClasses.push(`grid-cols-${columns.xs}`);
      if (columns.sm) responsiveClasses.push(`sm:grid-cols-${columns.sm}`);
      if (columns.md) responsiveClasses.push(`md:grid-cols-${columns.md}`);
      if (columns.lg) responsiveClasses.push(`lg:grid-cols-${columns.lg}`);
      if (columns.xl) responsiveClasses.push(`xl:grid-cols-${columns.xl}`);
      if (columns['2xl']) responsiveClasses.push(`2xl:grid-cols-${columns['2xl']}`);
      
      return responsiveClasses.join(' ');
    };

    // Generate custom grid template columns for auto-fit/auto-fill
    const getGridTemplateColumns = () => {
      if (autoFit && minColumnWidth) {
        return `repeat(auto-fit, minmax(${minColumnWidth}, ${maxColumnWidth || '1fr'}))`;
      }
      if (autoFill && minColumnWidth) {
        return `repeat(auto-fill, minmax(${minColumnWidth}, ${maxColumnWidth || '1fr'}))`;
      }
      return undefined;
    };

    // Generate grid template areas
    const getGridTemplateAreas = () => {
      if (areas && areas.length > 0) {
        return areas.map(area => `"${area}"`).join(' ');
      }
      return undefined;
    };

    const gridClasses = cn(
      'grid',
      !autoFit && !autoFill && getColumnClasses(),
      gap && gapClasses[gap],
      rowGap && rowGapClasses[rowGap],
      columnGap && columnGapClasses[columnGap],
      alignItems && `items-${alignItems}`,
      justifyItems && `justify-items-${justifyItems}`,
      alignContent && `content-${alignContent}`,
      justifyContent && `justify-${justifyContent}`,
      className
    );

    const gridStyle = {
      ...style,
      gridTemplateColumns: getGridTemplateColumns(),
      gridTemplateAreas: getGridTemplateAreas(),
    };

    return (
      <div
        ref={ref}
        className={gridClasses}
        style={gridStyle}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Grid.displayName = 'Grid';