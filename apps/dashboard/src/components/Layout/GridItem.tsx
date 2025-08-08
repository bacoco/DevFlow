/**
 * Grid Item Component
 * Individual grid item with responsive span and positioning capabilities
 */

import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Column span (responsive object or number) */
  colSpan?: number | {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  /** Row span (responsive object or number) */
  rowSpan?: number | {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  /** Column start position */
  colStart?: number | {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  /** Column end position */
  colEnd?: number | {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  /** Row start position */
  rowStart?: number | {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  /** Row end position */
  rowEnd?: number | {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  /** Grid area name */
  area?: string;
  /** Align self */
  alignSelf?: 'auto' | 'start' | 'end' | 'center' | 'stretch';
  /** Justify self */
  justifySelf?: 'auto' | 'start' | 'end' | 'center' | 'stretch';
  /** Aspect ratio maintenance */
  aspectRatio?: 'square' | 'video' | 'auto' | string;
  children: React.ReactNode;
}

export const GridItem = forwardRef<HTMLDivElement, GridItemProps>(
  ({ 
    colSpan,
    rowSpan,
    colStart,
    colEnd,
    rowStart,
    rowEnd,
    area,
    alignSelf,
    justifySelf,
    aspectRatio,
    className,
    style,
    children,
    ...props
  }, ref) => {
    // Generate responsive span classes
    const getSpanClasses = (span: GridItemProps['colSpan'], type: 'col' | 'row') => {
      if (typeof span === 'number') {
        return `${type}-span-${span}`;
      }
      
      if (span && typeof span === 'object') {
        const responsiveClasses = [];
        if (span.xs) responsiveClasses.push(`${type}-span-${span.xs}`);
        if (span.sm) responsiveClasses.push(`sm:${type}-span-${span.sm}`);
        if (span.md) responsiveClasses.push(`md:${type}-span-${span.md}`);
        if (span.lg) responsiveClasses.push(`lg:${type}-span-${span.lg}`);
        if (span.xl) responsiveClasses.push(`xl:${type}-span-${span.xl}`);
        if (span['2xl']) responsiveClasses.push(`2xl:${type}-span-${span['2xl']}`);
        
        return responsiveClasses.join(' ');
      }
      
      return '';
    };

    // Generate responsive position classes
    const getPositionClasses = (position: GridItemProps['colStart'], type: 'col' | 'row', direction: 'start' | 'end') => {
      if (typeof position === 'number') {
        return `${type}-${direction}-${position}`;
      }
      
      if (position && typeof position === 'object') {
        const responsiveClasses = [];
        if (position.xs) responsiveClasses.push(`${type}-${direction}-${position.xs}`);
        if (position.sm) responsiveClasses.push(`sm:${type}-${direction}-${position.sm}`);
        if (position.md) responsiveClasses.push(`md:${type}-${direction}-${position.md}`);
        if (position.lg) responsiveClasses.push(`lg:${type}-${direction}-${position.lg}`);
        if (position.xl) responsiveClasses.push(`xl:${type}-${direction}-${position.xl}`);
        if (position['2xl']) responsiveClasses.push(`2xl:${type}-${direction}-${position['2xl']}`);
        
        return responsiveClasses.join(' ');
      }
      
      return '';
    };

    // Get aspect ratio classes
    const getAspectRatioClass = () => {
      switch (aspectRatio) {
        case 'square':
          return 'aspect-square';
        case 'video':
          return 'aspect-video';
        case 'auto':
          return 'aspect-auto';
        default:
          return aspectRatio ? `aspect-[${aspectRatio}]` : '';
      }
    };

    const gridItemClasses = cn(
      colSpan && getSpanClasses(colSpan, 'col'),
      rowSpan && getSpanClasses(rowSpan, 'row'),
      colStart && getPositionClasses(colStart, 'col', 'start'),
      colEnd && getPositionClasses(colEnd, 'col', 'end'),
      rowStart && getPositionClasses(rowStart, 'row', 'start'),
      rowEnd && getPositionClasses(rowEnd, 'row', 'end'),
      alignSelf && `self-${alignSelf}`,
      justifySelf && `justify-self-${justifySelf}`,
      aspectRatio && getAspectRatioClass(),
      className
    );

    const gridItemStyle = {
      ...style,
      gridArea: area,
    };

    return (
      <div
        ref={ref}
        className={gridItemClasses}
        style={gridItemStyle}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GridItem.displayName = 'GridItem';