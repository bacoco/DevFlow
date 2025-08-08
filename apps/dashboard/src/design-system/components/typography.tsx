/**
 * Responsive Typography Components
 * Typography components with responsive scaling and accessibility features
 */

'use client';

import React, { forwardRef, HTMLAttributes, ElementType } from 'react';
import { cn } from '../../utils/cn';
import { useResponsiveValue, type ResponsiveValue } from '../layout/responsive-engine';
import { 
  typographyVariants, 
  responsiveTypography, 
  responsiveFontSizes,
  type TypographyVariant,
  type FontWeight,
  type LetterSpacing 
} from '../tokens/typography';

// Base typography props
interface BaseTypographyProps {
  variant?: ResponsiveValue<keyof typeof typographyVariants | 'fluid'>;
  size?: ResponsiveValue<keyof typeof typographyVariants.body | keyof typeof responsiveFontSizes.fluid>;
  weight?: ResponsiveValue<FontWeight>;
  letterSpacing?: ResponsiveValue<LetterSpacing>;
  color?: ResponsiveValue<string>;
  align?: ResponsiveValue<'left' | 'center' | 'right' | 'justify'>;
  transform?: ResponsiveValue<'none' | 'uppercase' | 'lowercase' | 'capitalize'>;
  decoration?: ResponsiveValue<'none' | 'underline' | 'line-through'>;
  truncate?: boolean;
  noWrap?: boolean;
  fluid?: boolean;
  as?: ElementType;
}

// Text component props
export interface TextProps extends BaseTypographyProps, Omit<HTMLAttributes<HTMLElement>, 'color'> {}

// Heading component props
export interface HeadingProps extends BaseTypographyProps, Omit<HTMLAttributes<HTMLHeadingElement>, 'color'> {
  level?: ResponsiveValue<1 | 2 | 3 | 4 | 5 | 6>;
}

// Display component props
export interface DisplayProps extends BaseTypographyProps, Omit<HTMLAttributes<HTMLElement>, 'color'> {
  level?: ResponsiveValue<'sm' | 'md' | 'lg' | 'xl' | '2xl'>;
}

// Code component props
export interface CodeProps extends BaseTypographyProps, Omit<HTMLAttributes<HTMLElement>, 'color'> {
  inline?: boolean;
  block?: boolean;
}

// Label component props
export interface LabelProps extends BaseTypographyProps, Omit<HTMLAttributes<HTMLLabelElement>, 'color'> {
  htmlFor?: string;
  required?: boolean;
}

// Utility functions
function getTypographyStyles(
  variant?: keyof typeof typographyVariants | 'fluid',
  size?: keyof typeof typographyVariants.body | keyof typeof responsiveFontSizes.fluid,
  fluid?: boolean
) {
  if (fluid || variant === 'fluid') {
    const fluidSize = size as keyof typeof responsiveFontSizes.fluid;
    return {
      fontSize: responsiveFontSizes.fluid[fluidSize] || responsiveFontSizes.fluid['body-md'],
      lineHeight: '1.5',
    };
  }

  if (variant && variant !== 'fluid') {
    const variantStyles = typographyVariants[variant as keyof typeof typographyVariants];
    if (variantStyles && size && typeof variantStyles === 'object' && size in variantStyles) {
      return (variantStyles as any)[size];
    }
  }

  return typographyVariants.body.md;
}

// Base Text Component
export const Text = forwardRef<HTMLElement, TextProps>(({
  className,
  children,
  variant = 'body',
  size = 'md',
  weight,
  letterSpacing,
  color,
  align,
  transform,
  decoration,
  truncate,
  noWrap,
  fluid,
  as: Component = 'p',
  style,
  ...props
}, ref) => {
  const resolvedVariant = useResponsiveValue(variant);
  const resolvedSize = useResponsiveValue(size);
  const resolvedWeight = useResponsiveValue(weight);
  const resolvedLetterSpacing = useResponsiveValue(letterSpacing);
  const resolvedColor = useResponsiveValue(color);
  const resolvedAlign = useResponsiveValue(align);
  const resolvedTransform = useResponsiveValue(transform);
  const resolvedDecoration = useResponsiveValue(decoration);

  const typographyStyles = getTypographyStyles(resolvedVariant, resolvedSize, fluid);

  const textStyles = {
    ...typographyStyles,
    ...(resolvedWeight && { fontWeight: resolvedWeight }),
    ...(resolvedLetterSpacing && { letterSpacing: resolvedLetterSpacing }),
    ...(resolvedColor && { color: resolvedColor }),
    ...(resolvedAlign && { textAlign: resolvedAlign }),
    ...(resolvedTransform && { textTransform: resolvedTransform }),
    ...(resolvedDecoration && { textDecoration: resolvedDecoration }),
    ...(truncate && {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }),
    ...(noWrap && { whiteSpace: 'nowrap' }),
    ...style,
  };

  return (
    <Component
      ref={ref}
      className={cn(
        'text-base',
        truncate && 'truncate',
        noWrap && 'whitespace-nowrap',
        className
      )}
      style={textStyles}
      {...props}
    >
      {children}
    </Component>
  );
});

Text.displayName = 'Text';

// Heading Component
export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(({
  className,
  children,
  level = 1,
  variant = 'heading',
  size,
  weight,
  fluid,
  as,
  ...props
}, ref) => {
  const resolvedLevel = useResponsiveValue(level);
  const resolvedSize = useResponsiveValue(size);

  // Determine component and default size based on level
  const Component = as || (`h${resolvedLevel}` as ElementType);
  const defaultSize = resolvedSize || (`h${resolvedLevel}` as keyof typeof typographyVariants.heading);

  return (
    <Text
      ref={ref}
      as={Component}
      variant={variant}
      size={defaultSize}
      weight={weight || 'semibold'}
      fluid={fluid}
      className={cn('heading', `heading-${resolvedLevel}`, className)}
      {...props}
    >
      {children}
    </Text>
  );
});

Heading.displayName = 'Heading';

// Display Component (for large headings)
export const Display = forwardRef<HTMLElement, DisplayProps>(({
  className,
  children,
  level = 'lg',
  variant = 'display',
  weight,
  fluid = true,
  as = 'h1',
  ...props
}, ref) => {
  const resolvedLevel = useResponsiveValue(level);

  return (
    <Text
      ref={ref}
      as={as}
      variant={variant}
      size={resolvedLevel}
      weight={weight || 'bold'}
      fluid={fluid}
      className={cn('display', `display-${resolvedLevel}`, className)}
      {...props}
    >
      {children}
    </Text>
  );
});

Display.displayName = 'Display';

// Code Component
export const Code = forwardRef<HTMLElement, CodeProps>(({
  className,
  children,
  variant = 'code',
  size = 'md',
  inline = true,
  block,
  as,
  ...props
}, ref) => {
  const Component = as || (inline && !block ? 'code' : 'pre');

  return (
    <Text
      ref={ref}
      as={Component}
      variant={variant}
      size={size}
      className={cn(
        'font-mono',
        inline && !block && 'inline-code',
        block && 'block-code',
        className
      )}
      {...props}
    >
      {block ? <code>{children}</code> : children}
    </Text>
  );
});

Code.displayName = 'Code';

// Label Component
export const Label = forwardRef<HTMLLabelElement, LabelProps>(({
  className,
  children,
  variant = 'label',
  size = 'md',
  weight = 'medium',
  required,
  htmlFor,
  ...props
}, ref) => {
  return (
    <Text
      ref={ref}
      as="label"
      variant={variant}
      size={size}
      weight={weight}
      htmlFor={htmlFor}
      className={cn('label', required && 'required', className)}
      {...props}
    >
      {children}
      {required && (
        <span className="text-red-500 ml-1" aria-label="required">
          *
        </span>
      )}
    </Text>
  );
});

Label.displayName = 'Label';

// Utility components for common text patterns
export const Caption = forwardRef<HTMLElement, TextProps>((props, ref) => (
  <Text
    ref={ref}
    variant="body"
    size="xs"
    color="var(--color-text-secondary)"
    {...props}
  />
));

Caption.displayName = 'Caption';

export const Lead = forwardRef<HTMLElement, TextProps>((props, ref) => (
  <Text
    ref={ref}
    variant="body"
    size="lg"
    {...props}
  />
));

Lead.displayName = 'Lead';

export const Muted = forwardRef<HTMLElement, TextProps>((props, ref) => (
  <Text
    ref={ref}
    color="var(--color-text-muted)"
    {...props}
  />
));

Muted.displayName = 'Muted';

export const Small = forwardRef<HTMLElement, TextProps>((props, ref) => (
  <Text
    ref={ref}
    variant="body"
    size="sm"
    {...props}
  />
));

Small.displayName = 'Small';

export const Strong = forwardRef<HTMLElement, TextProps>((props, ref) => (
  <Text
    ref={ref}
    as="strong"
    weight="semibold"
    {...props}
  />
));

Strong.displayName = 'Strong';

export const Emphasis = forwardRef<HTMLElement, TextProps>((props, ref) => (
  <Text
    ref={ref}
    as="em"
    {...props}
  />
));

Emphasis.displayName = 'Emphasis';

// Responsive text size utilities
export const useResponsiveTextSize = (
  baseSize: keyof typeof responsiveFontSizes.fluid,
  fluid: boolean = true
) => {
  if (fluid) {
    return {
      fontSize: responsiveFontSizes.fluid[baseSize],
      lineHeight: '1.5',
    };
  }

  // Return breakpoint-specific sizes
  return {
    fontSize: responsiveFontSizes.breakpoint.md[baseSize],
    lineHeight: '1.5',
  };
};

// Typography scale helper
export const getTypographyScale = () => ({
  display: Object.keys(typographyVariants.display),
  heading: Object.keys(typographyVariants.heading),
  body: Object.keys(typographyVariants.body),
  label: Object.keys(typographyVariants.label),
  code: Object.keys(typographyVariants.code),
});

// Accessibility helpers
export const getAccessibleTextColor = (backgroundColor: string, theme: 'light' | 'dark' = 'light') => {
  // This is a simplified version - in practice, you'd use a proper contrast calculation
  const isDark = theme === 'dark';
  return isDark ? 'var(--color-text-primary-dark)' : 'var(--color-text-primary-light)';
};

export const getReadableLineHeight = (fontSize: string) => {
  const size = parseFloat(fontSize);
  if (size <= 14) return '1.4';
  if (size <= 18) return '1.5';
  if (size <= 24) return '1.4';
  return '1.2';
};