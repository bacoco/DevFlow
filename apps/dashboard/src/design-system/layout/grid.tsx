/**
 * Responsive Grid System
 * CSS Grid and Flexbox utilities with responsive behavior
 */

'use client';

import React, { forwardRef, HTMLAttributes, CSSProperties } from 'react';
import { cn } from '../../utils/cn';
import { useResponsiveValue, type ResponsiveValue } from './responsive-engine';
import { gridSystem, type Breakpoint } from '../tokens/breakpoints';

// Grid container props
export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  columns?: ResponsiveValue<number | 'auto' | 'none'>;
  rows?: ResponsiveValue<number | 'auto' | 'none'>;
  gap?: ResponsiveValue<number | string>;
  columnGap?: ResponsiveValue<number | string>;
  rowGap?: ResponsiveValue<number | string>;
  autoFlow?: ResponsiveValue<'row' | 'column' | 'row dense' | 'column dense'>;
  autoColumns?: ResponsiveValue<string>;
  autoRows?: ResponsiveValue<string>;
  justifyItems?: ResponsiveValue<'start' | 'end' | 'center' | 'stretch'>;
  alignItems?: ResponsiveValue<'start' | 'end' | 'center' | 'stretch'>;
  justifyContent?: ResponsiveValue<'start' | 'end' | 'center' | 'stretch' | 'space-around' | 'space-between' | 'space-evenly'>;
  alignContent?: ResponsiveValue<'start' | 'end' | 'center' | 'stretch' | 'space-around' | 'space-between' | 'space-evenly'>;
  dense?: boolean;
  container?: boolean;
}

// Grid item props
export interface GridItemProps extends HTMLAttributes<HTMLDivElement> {
  column?: ResponsiveValue<number | string>;
  columnStart?: ResponsiveValue<number | string>;
  columnEnd?: ResponsiveValue<number | string>;
  columnSpan?: ResponsiveValue<number>;
  row?: ResponsiveValue<number | string>;
  rowStart?: ResponsiveValue<number | string>;
  rowEnd?: ResponsiveValue<number | string>;
  rowSpan?: ResponsiveValue<number>;
  area?: ResponsiveValue<string>;
  justifySelf?: ResponsiveValue<'start' | 'end' | 'center' | 'stretch'>;
  alignSelf?: ResponsiveValue<'start' | 'end' | 'center' | 'stretch'>;
}

// Flex container props
export interface FlexProps extends HTMLAttributes<HTMLDivElement> {
  direction?: ResponsiveValue<'row' | 'row-reverse' | 'column' | 'column-reverse'>;
  wrap?: ResponsiveValue<'nowrap' | 'wrap' | 'wrap-reverse'>;
  justify?: ResponsiveValue<'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'>;
  align?: ResponsiveValue<'start' | 'end' | 'center' | 'stretch' | 'baseline'>;
  gap?: ResponsiveValue<number | string>;
  inline?: boolean;
}

// Flex item props
export interface FlexItemProps extends HTMLAttributes<HTMLDivElement> {
  flex?: ResponsiveValue<string | number>;
  grow?: ResponsiveValue<number>;
  shrink?: ResponsiveValue<number>;
  basis?: ResponsiveValue<string | number>;
  alignSelf?: ResponsiveValue<'auto' | 'start' | 'end' | 'center' | 'stretch' | 'baseline'>;
  order?: ResponsiveValue<number>;
}

// Container props
export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  maxWidth?: ResponsiveValue<Breakpoint | number | string | false>;
  fluid?: boolean;
  centered?: boolean;
  padding?: ResponsiveValue<number | string>;
  paddingX?: ResponsiveValue<number | string>;
  paddingY?: ResponsiveValue<number | string>;
}

// Utility functions
function formatGapValue(value: number | string): string {
  if (typeof value === 'number') {
    return `${value * 0.25}rem`; // Convert to rem using 4px base
  }
  return value;
}

function formatSpanValue(span: number): string {
  return `span ${span} / span ${span}`;
}

function getGridTemplateValue(value: number | 'auto' | 'none'): string {
  if (value === 'auto') return 'auto';
  if (value === 'none') return 'none';
  return `repeat(${value}, minmax(0, 1fr))`;
}

// Grid Container Component
export const Grid = forwardRef<HTMLDivElement, GridProps>(({
  className,
  children,
  columns,
  rows,
  gap,
  columnGap,
  rowGap,
  autoFlow,
  autoColumns,
  autoRows,
  justifyItems,
  alignItems,
  justifyContent,
  alignContent,
  dense,
  container,
  style,
  ...props
}, ref) => {
  const resolvedColumns = useResponsiveValue(columns);
  const resolvedRows = useResponsiveValue(rows);
  const resolvedGap = useResponsiveValue(gap);
  const resolvedColumnGap = useResponsiveValue(columnGap);
  const resolvedRowGap = useResponsiveValue(rowGap);
  const resolvedAutoFlow = useResponsiveValue(autoFlow);
  const resolvedAutoColumns = useResponsiveValue(autoColumns);
  const resolvedAutoRows = useResponsiveValue(autoRows);
  const resolvedJustifyItems = useResponsiveValue(justifyItems);
  const resolvedAlignItems = useResponsiveValue(alignItems);
  const resolvedJustifyContent = useResponsiveValue(justifyContent);
  const resolvedAlignContent = useResponsiveValue(alignContent);

  const gridStyles: CSSProperties = {
    display: 'grid',
    ...(resolvedColumns && { gridTemplateColumns: getGridTemplateValue(resolvedColumns) }),
    ...(resolvedRows && { gridTemplateRows: getGridTemplateValue(resolvedRows) }),
    ...(resolvedGap && { gap: formatGapValue(resolvedGap) }),
    ...(resolvedColumnGap && { columnGap: formatGapValue(resolvedColumnGap) }),
    ...(resolvedRowGap && { rowGap: formatGapValue(resolvedRowGap) }),
    ...(resolvedAutoFlow && { gridAutoFlow: resolvedAutoFlow }),
    ...(resolvedAutoColumns && { gridAutoColumns: resolvedAutoColumns }),
    ...(resolvedAutoRows && { gridAutoRows: resolvedAutoRows }),
    ...(resolvedJustifyItems && { justifyItems: resolvedJustifyItems }),
    ...(resolvedAlignItems && { alignItems: resolvedAlignItems }),
    ...(resolvedJustifyContent && { justifyContent: resolvedJustifyContent }),
    ...(resolvedAlignContent && { alignContent: resolvedAlignContent }),
    ...(container && { containerType: 'inline-size' }),
    ...style,
  };

  return (
    <div
      ref={ref}
      className={cn(
        'grid',
        dense && 'grid-flow-dense',
        className
      )}
      style={gridStyles}
      {...props}
    >
      {children}
    </div>
  );
});

Grid.displayName = 'Grid';

// Grid Item Component
export const GridItem = forwardRef<HTMLDivElement, GridItemProps>(({
  className,
  children,
  column,
  columnStart,
  columnEnd,
  columnSpan,
  row,
  rowStart,
  rowEnd,
  rowSpan,
  area,
  justifySelf,
  alignSelf,
  style,
  ...props
}, ref) => {
  const resolvedColumn = useResponsiveValue(column);
  const resolvedColumnStart = useResponsiveValue(columnStart);
  const resolvedColumnEnd = useResponsiveValue(columnEnd);
  const resolvedColumnSpan = useResponsiveValue(columnSpan);
  const resolvedRow = useResponsiveValue(row);
  const resolvedRowStart = useResponsiveValue(rowStart);
  const resolvedRowEnd = useResponsiveValue(rowEnd);
  const resolvedRowSpan = useResponsiveValue(rowSpan);
  const resolvedArea = useResponsiveValue(area);
  const resolvedJustifySelf = useResponsiveValue(justifySelf);
  const resolvedAlignSelf = useResponsiveValue(alignSelf);

  const itemStyles: CSSProperties = {
    ...(resolvedColumn && { gridColumn: resolvedColumn }),
    ...(resolvedColumnStart && { gridColumnStart: resolvedColumnStart }),
    ...(resolvedColumnEnd && { gridColumnEnd: resolvedColumnEnd }),
    ...(resolvedColumnSpan && { gridColumn: formatSpanValue(resolvedColumnSpan) }),
    ...(resolvedRow && { gridRow: resolvedRow }),
    ...(resolvedRowStart && { gridRowStart: resolvedRowStart }),
    ...(resolvedRowEnd && { gridRowEnd: resolvedRowEnd }),
    ...(resolvedRowSpan && { gridRow: formatSpanValue(resolvedRowSpan) }),
    ...(resolvedArea && { gridArea: resolvedArea }),
    ...(resolvedJustifySelf && { justifySelf: resolvedJustifySelf }),
    ...(resolvedAlignSelf && { alignSelf: resolvedAlignSelf }),
    ...style,
  };

  return (
    <div
      ref={ref}
      className={className}
      style={itemStyles}
      {...props}
    >
      {children}
    </div>
  );
});

GridItem.displayName = 'GridItem';

// Flex Container Component
export const Flex = forwardRef<HTMLDivElement, FlexProps>(({
  className,
  children,
  direction,
  wrap,
  justify,
  align,
  gap,
  inline,
  style,
  ...props
}, ref) => {
  const resolvedDirection = useResponsiveValue(direction);
  const resolvedWrap = useResponsiveValue(wrap);
  const resolvedJustify = useResponsiveValue(justify);
  const resolvedAlign = useResponsiveValue(align);
  const resolvedGap = useResponsiveValue(gap);

  const flexStyles: CSSProperties = {
    display: inline ? 'inline-flex' : 'flex',
    ...(resolvedDirection && { flexDirection: resolvedDirection }),
    ...(resolvedWrap && { flexWrap: resolvedWrap }),
    ...(resolvedJustify && { 
      justifyContent: resolvedJustify === 'between' ? 'space-between' : 
                     resolvedJustify === 'around' ? 'space-around' :
                     resolvedJustify === 'evenly' ? 'space-evenly' :
                     resolvedJustify === 'start' ? 'flex-start' :
                     resolvedJustify === 'end' ? 'flex-end' : resolvedJustify
    }),
    ...(resolvedAlign && { 
      alignItems: resolvedAlign === 'start' ? 'flex-start' : 
                  resolvedAlign === 'end' ? 'flex-end' : resolvedAlign
    }),
    ...(resolvedGap && { gap: formatGapValue(resolvedGap) }),
    ...style,
  };

  return (
    <div
      ref={ref}
      className={cn('flex', className)}
      style={flexStyles}
      {...props}
    >
      {children}
    </div>
  );
});

Flex.displayName = 'Flex';

// Flex Item Component
export const FlexItem = forwardRef<HTMLDivElement, FlexItemProps>(({
  className,
  children,
  flex,
  grow,
  shrink,
  basis,
  alignSelf,
  order,
  style,
  ...props
}, ref) => {
  const resolvedFlex = useResponsiveValue(flex);
  const resolvedGrow = useResponsiveValue(grow);
  const resolvedShrink = useResponsiveValue(shrink);
  const resolvedBasis = useResponsiveValue(basis);
  const resolvedAlignSelf = useResponsiveValue(alignSelf);
  const resolvedOrder = useResponsiveValue(order);

  const itemStyles: CSSProperties = {
    ...(resolvedFlex && { flex: resolvedFlex }),
    ...(resolvedGrow !== undefined && { flexGrow: resolvedGrow }),
    ...(resolvedShrink !== undefined && { flexShrink: resolvedShrink }),
    ...(resolvedBasis && { flexBasis: resolvedBasis }),
    ...(resolvedAlignSelf && { 
      alignSelf: resolvedAlignSelf === 'start' ? 'flex-start' : 
                 resolvedAlignSelf === 'end' ? 'flex-end' : resolvedAlignSelf
    }),
    ...(resolvedOrder !== undefined && { order: resolvedOrder }),
    ...style,
  };

  return (
    <div
      ref={ref}
      className={className}
      style={itemStyles}
      {...props}
    >
      {children}
    </div>
  );
});

FlexItem.displayName = 'FlexItem';

// Container Component
export const Container = forwardRef<HTMLDivElement, ContainerProps>(({
  className,
  children,
  maxWidth,
  fluid,
  centered = true,
  padding,
  paddingX,
  paddingY,
  style,
  ...props
}, ref) => {
  const resolvedMaxWidth = useResponsiveValue(maxWidth);
  const resolvedPadding = useResponsiveValue(padding);
  const resolvedPaddingX = useResponsiveValue(paddingX);
  const resolvedPaddingY = useResponsiveValue(paddingY);

  const getMaxWidthValue = (value: Breakpoint | number | string | false | undefined): string | undefined => {
    if (value === false || value === undefined) return undefined;
    if (typeof value === 'number') return `${value}px`;
    if (typeof value === 'string' && !Object.keys(gridSystem).includes(value)) return value;
    
    // Handle breakpoint values
    const breakpoint = value as Breakpoint;
    const config = gridSystem[breakpoint];
    return config?.maxWidth ? `${config.maxWidth}px` : undefined;
  };

  const containerStyles: CSSProperties = {
    width: '100%',
    ...(resolvedMaxWidth !== undefined && !fluid && { 
      maxWidth: getMaxWidthValue(resolvedMaxWidth) 
    }),
    ...(centered && { marginLeft: 'auto', marginRight: 'auto' }),
    ...(resolvedPadding && { 
      padding: formatGapValue(resolvedPadding) 
    }),
    ...(resolvedPaddingX && { 
      paddingLeft: formatGapValue(resolvedPaddingX),
      paddingRight: formatGapValue(resolvedPaddingX)
    }),
    ...(resolvedPaddingY && { 
      paddingTop: formatGapValue(resolvedPaddingY),
      paddingBottom: formatGapValue(resolvedPaddingY)
    }),
    ...style,
  };

  return (
    <div
      ref={ref}
      className={cn(
        'container',
        fluid && 'container-fluid',
        className
      )}
      style={containerStyles}
      {...props}
    >
      {children}
    </div>
  );
});

Container.displayName = 'Container';

// Utility components for common layouts
export const Stack = forwardRef<HTMLDivElement, FlexProps>(({
  direction = 'column',
  ...props
}, ref) => (
  <Flex ref={ref} direction={direction} {...props} />
));

Stack.displayName = 'Stack';

export const HStack = forwardRef<HTMLDivElement, FlexProps>((props, ref) => (
  <Flex ref={ref} direction="row" {...props} />
));

HStack.displayName = 'HStack';

export const VStack = forwardRef<HTMLDivElement, FlexProps>((props, ref) => (
  <Flex ref={ref} direction="column" {...props} />
));

VStack.displayName = 'VStack';

// Center component for centering content
export interface CenterProps extends FlexProps {
  inline?: boolean;
}

export const Center = forwardRef<HTMLDivElement, CenterProps>(({
  inline,
  ...props
}, ref) => (
  <Flex
    ref={ref}
    justify="center"
    align="center"
    inline={inline}
    {...props}
  />
));

Center.displayName = 'Center';