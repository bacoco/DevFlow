/**
 * Button Component
 * A comprehensive button component with multiple variants, states, and animations
 * Enhanced with accessibility features including ARIA support and keyboard navigation
 */

import React, { forwardRef, useRef, useEffect } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { ButtonProps } from '../../types/design-system';
import { designTokens } from '../../styles/design-tokens';
import { useAccessibility } from '../../contexts/AccessibilityContext';

// Button variant styles
const buttonVariants = {
  primary: {
    base: 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700 hover:border-primary-700 focus:ring-primary-500',
    disabled: 'bg-primary-300 text-primary-100 border-primary-300 cursor-not-allowed',
  },
  secondary: {
    base: 'bg-gray-100 text-gray-900 border-gray-300 hover:bg-gray-200 hover:border-gray-400 focus:ring-gray-500 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700',
    disabled: 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-gray-900 dark:text-gray-600 dark:border-gray-800',
  },
  ghost: {
    base: 'bg-transparent text-gray-700 border-transparent hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-500 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100',
    disabled: 'bg-transparent text-gray-400 border-transparent cursor-not-allowed dark:text-gray-600',
  },
  danger: {
    base: 'bg-error-600 text-white border-error-600 hover:bg-error-700 hover:border-error-700 focus:ring-error-500',
    disabled: 'bg-error-300 text-error-100 border-error-300 cursor-not-allowed',
  },
};

// Button size styles
const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm font-medium',
  md: 'px-4 py-2 text-sm font-medium',
  lg: 'px-6 py-3 text-base font-medium',
};

// Animation variants
const buttonAnimations = {
  initial: { scale: 1 },
  hover: { 
    scale: 1.02,
    transition: { 
      duration: 0.15,
      ease: 'easeOut'
    }
  },
  tap: { 
    scale: 0.98,
    transition: { 
      duration: 0.1,
      ease: 'easeInOut'
    }
  },
  focus: {
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
    transition: { 
      duration: 0.15,
      ease: 'easeOut'
    }
  },
};

// Loading spinner animation
const spinnerAnimation = {
  animate: {
    rotate: 360,
  },
  transition: {
    duration: 1,
    repeat: Infinity,
    ease: 'linear',
  },
};

/**
 * Button component with comprehensive variants, states, and animations
 * Enhanced with accessibility features
 */
export const Button = forwardRef<
  HTMLButtonElement,
  ButtonProps & Omit<HTMLMotionProps<'button'>, keyof ButtonProps>
>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  rounded = false,
  className = '',
  children,
  testId,
  onClick,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-pressed': ariaPressed,
  'aria-expanded': ariaExpanded,
  ...props
}, ref) => {
  const { settings, announceToScreenReader } = useAccessibility();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isDisabled = disabled || loading;

  // Merge refs
  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref(buttonRef.current);
      } else {
        ref.current = buttonRef.current;
      }
    }
  }, [ref]);
  
  // Build class names
  const baseClasses = [
    'inline-flex items-center justify-center',
    'border font-medium',
    'transition-all duration-200 ease-in-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:cursor-not-allowed',
    rounded ? 'rounded-full' : 'rounded-lg',
    fullWidth ? 'w-full' : '',
    buttonSizes[size],
    isDisabled 
      ? buttonVariants[variant].disabled 
      : buttonVariants[variant].base,
    className,
  ].filter(Boolean).join(' ');

  // Handle click with loading state and accessibility announcements
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) {
      event.preventDefault();
      return;
    }

    // Announce button activation for screen readers
    if (settings.screenReaderMode && children) {
      const buttonText = typeof children === 'string' ? children : ariaLabel || 'Button';
      announceToScreenReader(`${buttonText} activated`, 'polite');
    }

    onClick?.(event);
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (isDisabled) return;

    // Handle Enter and Space key activation
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      buttonRef.current?.click();
    }

    // Call any existing onKeyDown handler
    props.onKeyDown?.(event);
  };

  // Render icon with proper spacing
  const renderIcon = (iconElement: React.ReactNode, position: 'left' | 'right') => {
    if (!iconElement) return null;
    
    const iconClasses = [
      'flex-shrink-0',
      size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4',
      position === 'left' && children ? 'mr-2' : '',
      position === 'right' && children ? 'ml-2' : '',
    ].filter(Boolean).join(' ');

    return (
      <span className={iconClasses}>
        {iconElement}
      </span>
    );
  };

  // Render loading spinner
  const renderLoadingSpinner = () => (
    <motion.div
      className={`flex-shrink-0 ${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} ${children ? 'mr-2' : ''}`}
      {...spinnerAnimation}
    >
      <Loader2 className="w-full h-full" />
    </motion.div>
  );

  // Generate accessible label
  const getAccessibleLabel = () => {
    if (ariaLabel) return ariaLabel;
    if (typeof children === 'string') return children;
    if (loading) return 'Loading';
    return 'Button';
  };

  return (
    <motion.button
      ref={buttonRef}
      className={baseClasses}
      disabled={isDisabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-testid={testId}
      aria-label={getAccessibleLabel()}
      aria-describedby={ariaDescribedBy}
      aria-pressed={ariaPressed}
      aria-expanded={ariaExpanded}
      aria-busy={loading}
      aria-disabled={isDisabled}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      variants={settings.reducedMotion ? {} : buttonAnimations}
      initial={settings.reducedMotion ? undefined : "initial"}
      whileHover={!isDisabled && !settings.reducedMotion ? "hover" : undefined}
      whileTap={!isDisabled && !settings.reducedMotion ? "tap" : undefined}
      whileFocus={!isDisabled && !settings.reducedMotion ? "focus" : undefined}
      {...props}
    >
      {loading && renderLoadingSpinner()}
      {!loading && icon && iconPosition === 'left' && renderIcon(icon, 'left')}
      {children && (
        <span className={loading ? 'opacity-70' : ''}>
          {children}
        </span>
      )}
      {!loading && icon && iconPosition === 'right' && renderIcon(icon, 'right')}
    </motion.button>
  );
});

Button.displayName = 'Button';

export default Button;