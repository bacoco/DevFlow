/**
 * Button Component
 * A flexible button component built on Radix UI Slot with design system integration
 */

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

// Button variants using class-variance-authority
const buttonVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center gap-2',
    'rounded-md text-sm font-medium',
    'transition-colors duration-150 ease-smooth',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-interactive-primary text-white',
          'hover:bg-interactive-primary-hover',
          'active:bg-interactive-primary-active',
          'focus-visible:ring-interactive-primary',
        ],
        secondary: [
          'bg-interactive-secondary text-text-primary border border-border-primary',
          'hover:bg-interactive-secondary-hover',
          'active:bg-interactive-secondary-active',
          'focus-visible:ring-interactive-primary',
        ],
        outline: [
          'border border-border-primary bg-transparent text-text-primary',
          'hover:bg-interactive-secondary',
          'active:bg-interactive-secondary-hover',
          'focus-visible:ring-interactive-primary',
        ],
        ghost: [
          'bg-transparent text-text-primary',
          'hover:bg-interactive-secondary',
          'active:bg-interactive-secondary-hover',
          'focus-visible:ring-interactive-primary',
        ],
        destructive: [
          'bg-status-error text-white',
          'hover:bg-red-600',
          'active:bg-red-700',
          'focus-visible:ring-status-error',
        ],
        success: [
          'bg-status-success text-white',
          'hover:bg-green-600',
          'active:bg-green-700',
          'focus-visible:ring-status-success',
        ],
        warning: [
          'bg-status-warning text-white',
          'hover:bg-yellow-600',
          'active:bg-yellow-700',
          'focus-visible:ring-status-warning',
        ],
        link: [
          'text-interactive-primary underline-offset-4',
          'hover:underline',
          'focus-visible:ring-interactive-primary',
        ],
      },
      size: {
        xs: 'h-7 px-2 text-xs',
        sm: 'h-8 px-3 text-sm',
        md: 'h-9 px-4 text-sm',
        lg: 'h-10 px-6 text-base',
        xl: 'h-11 px-8 text-base',
        icon: 'h-9 w-9 p-0',
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
      loading: {
        true: 'cursor-wait',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
      loading: false,
    },
  }
);

// Button props interface
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

// Loading spinner component
const LoadingSpinner = ({ size = 'sm' }: { size?: 'xs' | 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <svg
      className={cn('animate-spin', sizeClasses[size])}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

// Button component
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading,
      loadingText,
      leftIcon,
      rightIcon,
      asChild = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    const isDisabled = disabled || loading;
    
    // Determine spinner size based on button size
    const spinnerSize = size === 'xs' ? 'xs' : size === 'sm' ? 'sm' : size === 'lg' || size === 'xl' ? 'lg' : 'md';

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, fullWidth, loading, className })
        )}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        {...props}
      >
        {loading && (
          <LoadingSpinner size={spinnerSize} />
        )}
        {!loading && leftIcon && (
          <span className="flex-shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        <span className={cn(loading && 'opacity-70')}>
          {loading && loadingText ? loadingText : children}
        </span>
        {!loading && rightIcon && (
          <span className="flex-shrink-0" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
export type { ButtonProps };