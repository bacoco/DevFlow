/**
 * Input Component
 * A flexible input component with design system integration
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

// Input variants
const inputVariants = cva(
  [
    'flex w-full rounded-md border bg-background-elevated px-3 py-2',
    'text-sm text-text-primary placeholder:text-text-tertiary',
    'transition-colors duration-150 ease-smooth',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium',
  ],
  {
    variants: {
      variant: {
        default: [
          'border-border-primary',
          'focus-visible:ring-interactive-primary',
          'hover:border-border-secondary',
        ],
        error: [
          'border-status-error',
          'focus-visible:ring-status-error',
          'text-status-error',
        ],
        success: [
          'border-status-success',
          'focus-visible:ring-status-success',
        ],
      },
      size: {
        sm: 'h-8 px-2 text-xs',
        md: 'h-9 px-3 text-sm',
        lg: 'h-10 px-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

// Input props interface
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  helperText?: string;
  label?: string;
  required?: boolean;
}

// Input component
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      type = 'text',
      leftIcon,
      rightIcon,
      error,
      helperText,
      label,
      required,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId();
    const errorId = error ? `${inputId}-error` : undefined;
    const helperTextId = helperText ? `${inputId}-helper` : undefined;
    const describedBy = [errorId, helperTextId].filter(Boolean).join(' ') || undefined;

    // Determine variant based on error state
    const effectiveVariant = error ? 'error' : variant;

    const inputElement = (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            inputVariants({ variant: effectiveVariant, size }),
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className
          )}
          ref={ref}
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary">
            {rightIcon}
          </div>
        )}
      </div>
    );

    if (label || error || helperText) {
      return (
        <div className="space-y-2">
          {label && (
            <label
              htmlFor={inputId}
              className={cn(
                'text-sm font-medium text-text-primary',
                required && "after:content-['*'] after:ml-0.5 after:text-status-error"
              )}
            >
              {label}
            </label>
          )}
          {inputElement}
          {error && (
            <p
              id={errorId}
              className="text-sm text-status-error"
              role="alert"
              aria-live="polite"
            >
              {error}
            </p>
          )}
          {helperText && !error && (
            <p
              id={helperTextId}
              className="text-sm text-text-secondary"
            >
              {helperText}
            </p>
          )}
        </div>
      );
    }

    return inputElement;
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };
export type { InputProps };