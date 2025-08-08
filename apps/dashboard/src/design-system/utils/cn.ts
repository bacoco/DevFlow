/**
 * Utility for concatenating class names
 * Combines clsx and tailwind-merge for optimal class name handling
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names with proper Tailwind CSS class merging
 * @param inputs - Class names to combine
 * @returns Merged class name string
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Conditional class name utility
 * @param condition - Boolean condition
 * @param trueClass - Class to apply when condition is true
 * @param falseClass - Class to apply when condition is false
 * @returns Appropriate class name
 */
export function conditionalClass(
  condition: boolean,
  trueClass: string,
  falseClass?: string
): string {
  return condition ? trueClass : falseClass || '';
}

/**
 * Variant class utility for component variants
 * @param variants - Object mapping variant names to class names
 * @param variant - Current variant
 * @param defaultVariant - Default variant to use if variant is not found
 * @returns Class name for the variant
 */
export function variantClass<T extends string>(
  variants: Record<T, string>,
  variant: T | undefined,
  defaultVariant: T
): string {
  return variants[variant || defaultVariant] || variants[defaultVariant];
}

/**
 * Size class utility for component sizes
 * @param sizes - Object mapping size names to class names
 * @param size - Current size
 * @param defaultSize - Default size to use if size is not found
 * @returns Class name for the size
 */
export function sizeClass<T extends string>(
  sizes: Record<T, string>,
  size: T | undefined,
  defaultSize: T
): string {
  return sizes[size || defaultSize] || sizes[defaultSize];
}

/**
 * Responsive class utility
 * @param baseClass - Base class name
 * @param responsiveClasses - Object with breakpoint-specific classes
 * @returns Combined responsive class string
 */
export function responsiveClass(
  baseClass: string,
  responsiveClasses: Partial<Record<'sm' | 'md' | 'lg' | 'xl' | '2xl', string>>
): string {
  const classes = [baseClass];
  
  Object.entries(responsiveClasses).forEach(([breakpoint, className]) => {
    if (className) {
      classes.push(`${breakpoint}:${className}`);
    }
  });
  
  return classes.join(' ');
}

/**
 * State class utility for interactive states
 * @param baseClass - Base class name
 * @param states - Object with state-specific classes
 * @returns Combined state class string
 */
export function stateClass(
  baseClass: string,
  states: Partial<Record<'hover' | 'focus' | 'active' | 'disabled' | 'selected', string>>
): string {
  const classes = [baseClass];
  
  Object.entries(states).forEach(([state, className]) => {
    if (className) {
      classes.push(`${state}:${className}`);
    }
  });
  
  return classes.join(' ');
}

/**
 * Focus class utility for accessibility
 * @param baseClass - Base class name
 * @param focusClass - Focus-specific class
 * @param focusVisible - Whether to use focus-visible instead of focus
 * @returns Combined focus class string
 */
export function focusClass(
  baseClass: string,
  focusClass: string,
  focusVisible: boolean = true
): string {
  const focusPrefix = focusVisible ? 'focus-visible' : 'focus';
  return `${baseClass} ${focusPrefix}:${focusClass}`;
}

/**
 * Dark mode class utility
 * @param lightClass - Class for light mode
 * @param darkClass - Class for dark mode
 * @returns Combined dark mode class string
 */
export function darkModeClass(lightClass: string, darkClass: string): string {
  return `${lightClass} dark:${darkClass}`;
}

/**
 * Animation class utility
 * @param baseClass - Base class name
 * @param animationClass - Animation class
 * @param reduceMotion - Whether to respect reduced motion preference
 * @returns Combined animation class string
 */
export function animationClass(
  baseClass: string,
  animationClass: string,
  reduceMotion: boolean = true
): string {
  if (reduceMotion) {
    return `${baseClass} motion-safe:${animationClass}`;
  }
  return `${baseClass} ${animationClass}`;
}

/**
 * Grid class utility for CSS Grid layouts
 * @param columns - Number of columns or template
 * @param rows - Number of rows or template
 * @param gap - Gap size
 * @returns Grid class string
 */
export function gridClass(
  columns?: number | string,
  rows?: number | string,
  gap?: number | string
): string {
  const classes = ['grid'];
  
  if (columns) {
    if (typeof columns === 'number') {
      classes.push(`grid-cols-${columns}`);
    } else {
      classes.push(columns);
    }
  }
  
  if (rows) {
    if (typeof rows === 'number') {
      classes.push(`grid-rows-${rows}`);
    } else {
      classes.push(rows);
    }
  }
  
  if (gap) {
    if (typeof gap === 'number') {
      classes.push(`gap-${gap}`);
    } else {
      classes.push(`gap-${gap}`);
    }
  }
  
  return classes.join(' ');
}

/**
 * Flex class utility for Flexbox layouts
 * @param direction - Flex direction
 * @param justify - Justify content
 * @param align - Align items
 * @param wrap - Flex wrap
 * @param gap - Gap size
 * @returns Flex class string
 */
export function flexClass(
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse',
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly',
  align?: 'start' | 'end' | 'center' | 'stretch' | 'baseline',
  wrap?: 'wrap' | 'wrap-reverse' | 'nowrap',
  gap?: number | string
): string {
  const classes = ['flex'];
  
  if (direction) {
    classes.push(`flex-${direction}`);
  }
  
  if (justify) {
    classes.push(`justify-${justify}`);
  }
  
  if (align) {
    classes.push(`items-${align}`);
  }
  
  if (wrap) {
    classes.push(`flex-${wrap}`);
  }
  
  if (gap) {
    if (typeof gap === 'number') {
      classes.push(`gap-${gap}`);
    } else {
      classes.push(`gap-${gap}`);
    }
  }
  
  return classes.join(' ');
}