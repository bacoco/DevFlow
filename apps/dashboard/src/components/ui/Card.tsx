/**
 * Card Component
 * A versatile card component with glass morphism effects, hover animations, and multiple variants
 */

import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { CardProps } from '../../types/design-system';

// Card variant styles
const cardVariants = {
  default: {
    base: 'bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700',
    hover: 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600',
  },
  elevated: {
    base: 'bg-white shadow-lg border-0 dark:bg-gray-800',
    hover: 'hover:shadow-xl hover:-translate-y-1',
  },
  outlined: {
    base: 'bg-transparent border-2 border-gray-300 dark:border-gray-600',
    hover: 'hover:border-primary-500 hover:bg-gray-50 dark:hover:bg-gray-800/50',
  },
  glass: {
    base: 'bg-white/10 backdrop-blur-md border border-white/20 dark:bg-gray-900/20 dark:border-gray-700/30',
    hover: 'hover:bg-white/20 hover:border-white/30 dark:hover:bg-gray-900/30 dark:hover:border-gray-600/40',
  },
};

// Card padding styles
const cardPadding = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
};

// Animation variants
const cardAnimations = {
  initial: { 
    scale: 1,
    y: 0,
    rotateX: 0,
    rotateY: 0,
  },
  hover: {
    scale: 1.02,
    y: -2,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1,
      ease: 'easeInOut',
    },
  },
  focus: {
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
    transition: {
      duration: 0.15,
      ease: 'easeOut',
    },
  },
};

// Glass morphism specific animations
const glassAnimations = {
  initial: {
    scale: 1,
    backdropFilter: 'blur(12px)',
  },
  hover: {
    scale: 1.01,
    backdropFilter: 'blur(16px)',
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  tap: {
    scale: 0.99,
    transition: {
      duration: 0.1,
      ease: 'easeInOut',
    },
  },
};

// Elevated card specific animations
const elevatedAnimations = {
  initial: {
    scale: 1,
    y: 0,
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  },
  hover: {
    scale: 1.02,
    y: -4,
    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  tap: {
    scale: 0.98,
    y: -2,
    transition: {
      duration: 0.1,
      ease: 'easeInOut',
    },
  },
};

/**
 * Card component with multiple variants and smooth animations
 */
export const Card = forwardRef<
  HTMLDivElement,
  CardProps & Omit<HTMLMotionProps<'div'>, keyof CardProps>
>(({
  variant = 'default',
  padding = 'md',
  hover = false,
  interactive = false,
  rounded = true,
  shadow = false,
  className = '',
  children,
  testId,
  onClick,
  onKeyDown,
  tabIndex,
  role,
  ...props
}, ref) => {
  // Determine if card should be interactive
  const isInteractive = interactive || !!onClick;
  
  // Build class names
  const baseClasses = [
    'relative overflow-hidden',
    'transition-all duration-200 ease-in-out',
    rounded ? 'rounded-xl' : 'rounded-none',
    cardPadding[padding],
    cardVariants[variant].base,
    hover && cardVariants[variant].hover,
    shadow && variant === 'default' ? 'shadow-sm' : '',
    isInteractive ? 'cursor-pointer focus:outline-none' : '',
    className,
  ].filter(Boolean).join(' ');

  // Select appropriate animation variant
  const getAnimationVariant = () => {
    if (variant === 'glass') return glassAnimations;
    if (variant === 'elevated') return elevatedAnimations;
    return cardAnimations;
  };

  // Handle keyboard interactions for accessibility
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isInteractive && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick?.(event as any);
    }
    onKeyDown?.(event);
  };

  // Handle click events
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isInteractive) {
      onClick?.(event);
    }
  };

  const animationVariant = getAnimationVariant();

  return (
    <motion.div
      ref={ref}
      className={baseClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={isInteractive ? (tabIndex ?? 0) : tabIndex}
      role={isInteractive ? (role ?? 'button') : role}
      data-testid={testId}
      variants={animationVariant}
      initial="initial"
      whileHover={hover || isInteractive ? "hover" : undefined}
      whileTap={isInteractive ? "tap" : undefined}
      whileFocus={isInteractive ? "focus" : undefined}
      {...props}
    >
      {/* Glass morphism overlay for glass variant */}
      {variant === 'glass' && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Interactive state indicator */}
      {isInteractive && (
        <motion.div
          className="absolute inset-0 bg-primary-500/5 opacity-0 pointer-events-none"
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </motion.div>
  );
});

Card.displayName = 'Card';

export default Card;