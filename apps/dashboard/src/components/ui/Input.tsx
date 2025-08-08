/**
 * Input Component
 * A comprehensive input component with floating labels, validation states, and accessibility
 */

import React, { forwardRef, useState, useId, useRef, useEffect, KeyboardEvent } from 'react';
import { motion, HTMLMotionProps, Variants } from 'framer-motion';
import { Eye, EyeOff, X, Loader2, AlertCircle, CheckCircle, Info, ChevronDown } from 'lucide-react';
import { InputProps } from '../../types/design-system';

// Input variant styles
const inputVariants = {
  default: {
    base: 'border-gray-300 bg-white focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:focus:border-primary-400',
    error: 'border-error-500 focus:border-error-500 focus:ring-error-500 dark:border-error-400',
    success: 'border-success-500 focus:border-success-500 focus:ring-success-500 dark:border-success-400',
    warning: 'border-warning-500 focus:border-warning-500 focus:ring-warning-500 dark:border-warning-400',
  },
  filled: {
    base: 'border-transparent bg-gray-100 focus:bg-white focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:focus:bg-gray-800 dark:focus:border-primary-400',
    error: 'bg-error-50 border-transparent focus:border-error-500 focus:ring-error-500 dark:bg-error-900/20',
    success: 'bg-success-50 border-transparent focus:border-success-500 focus:ring-success-500 dark:bg-success-900/20',
    warning: 'bg-warning-50 border-transparent focus:border-warning-500 focus:ring-warning-500 dark:bg-warning-900/20',
  },
  outlined: {
    base: 'border-2 border-gray-300 bg-transparent focus:border-primary-500 focus:ring-0 dark:border-gray-600 dark:focus:border-primary-400',
    error: 'border-2 border-error-500 focus:border-error-500 focus:ring-0 dark:border-error-400',
    success: 'border-2 border-success-500 focus:border-success-500 focus:ring-0 dark:border-success-400',
    warning: 'border-2 border-warning-500 focus:border-warning-500 focus:ring-0 dark:border-warning-400',
  },
};

// Input size styles
const inputSizes = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-4 py-3 text-base',
};

// State icons
const stateIcons = {
  error: AlertCircle,
  success: CheckCircle,
  warning: Info,
};

// State colors
const stateColors = {
  error: 'text-error-500 dark:text-error-400',
  success: 'text-success-500 dark:text-success-400',
  warning: 'text-warning-500 dark:text-warning-400',
  default: 'text-gray-400 dark:text-gray-500',
};

// Animation variants
const labelAnimations: Variants = {
  floating: {
    scale: 0.75,
    y: -20,
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
  },
  default: {
    scale: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
  }
};

const inputAnimations: Variants = {
  focus: {
    scale: 1.01,
    transition: { duration: 0.15, ease: [0.4, 0, 0.2, 1] }
  },
  blur: {
    scale: 1,
    transition: { duration: 0.15, ease: [0.4, 0, 0.2, 1] }
  }
};

const suggestionsAnimations: Variants = {
  hidden: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: { duration: 0.15, ease: [0.4, 0, 0.2, 1] }
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
  }
};

/**
 * Input component with floating labels, validation states, and comprehensive features
 */
export const Input = forwardRef<
  HTMLInputElement,
  InputProps & Omit<HTMLMotionProps<'input'>, keyof InputProps>
>(({
  variant = 'default',
  state = 'default',
  size = 'md',
  label,
  helperText,
  errorText,
  icon,
  iconPosition = 'left',
  loading = false,
  clearable = false,
  fullWidth = false,
  className = '',
  testId,
  type = 'text',
  value,
  defaultValue,
  placeholder,
  disabled,
  required,
  autoComplete,
  suggestions = [],
  onChange,
  onFocus,
  onBlur,
  onClear,
  onSuggestionSelect,
  onKeyDown,
  ...props
}, ref) => {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const helperId = useId();
  const errorId = useId();
  const suggestionsId = useId();

  const currentValue = value !== undefined ? value : internalValue;
  const hasValue = currentValue && currentValue.toString().length > 0;
  const isFloating = focused || hasValue;
  const isPassword = type === 'password';
  const currentType = isPassword && showPassword ? 'text' : type;
  const hasSuggestions = suggestions.length > 0;
  
  // Determine current state for styling
  const currentState = errorText ? 'error' : state;
  const displayText = errorText || helperText;

  // Filter suggestions based on current value
  useEffect(() => {
    if (hasSuggestions && currentValue) {
      const filtered = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(currentValue.toString().toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(focused && filtered.length > 0);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
    setSelectedSuggestionIndex(-1);
  }, [currentValue, suggestions, focused, hasSuggestions]);

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Build class names
  const containerClasses = [
    'relative',
    fullWidth ? 'w-full' : '',
    className,
  ].filter(Boolean).join(' ');

  const inputClasses = [
    'block w-full rounded-lg border transition-all duration-200 ease-in-out',
    'focus:outline-none focus:ring-1',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'placeholder:text-transparent',
    inputSizes[size],
    inputVariants[variant][currentState as keyof typeof inputVariants[typeof variant]] || inputVariants[variant].base,
    icon && iconPosition === 'left' ? 'pl-10' : '',
    icon && iconPosition === 'right' ? 'pr-10' : '',
    (clearable && hasValue) || isPassword || loading || hasSuggestions ? 'pr-10' : '',
    label ? 'pt-6' : '',
  ].filter(Boolean).join(' ');

  const labelClasses = [
    'absolute left-4 text-gray-500 dark:text-gray-400 pointer-events-none',
    'transition-all duration-200 ease-out origin-left',
    size === 'sm' ? 'top-2' : size === 'lg' ? 'top-3.5' : 'top-2.5',
    focused ? stateColors[currentState] : 'text-gray-500 dark:text-gray-400',
  ].filter(Boolean).join(' ');

  // Handle input change
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(event);
  };

  // Handle focus
  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    if (hasSuggestions && currentValue) {
      setShowSuggestions(true);
    }
    onFocus?.(event);
  };

  // Handle blur
  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    // Delay blur to allow suggestion clicks
    setTimeout(() => {
      setFocused(false);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }, 150);
    onBlur?.(event);
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && filteredSuggestions.length > 0) {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev < filteredSuggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev > 0 ? prev - 1 : filteredSuggestions.length - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (selectedSuggestionIndex >= 0) {
            handleSuggestionSelect(filteredSuggestions[selectedSuggestionIndex]);
          }
          break;
        case 'Escape':
          event.preventDefault();
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
          break;
        case 'Tab':
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
          break;
      }
    }
    onKeyDown?.(event);
  };

  // Handle clear
  const handleClear = () => {
    const syntheticEvent = {
      target: { value: '' },
      currentTarget: { value: '' },
    } as React.ChangeEvent<HTMLInputElement>;
    
    if (value === undefined) {
      setInternalValue('');
    }
    onChange?.(syntheticEvent);
    onClear?.();
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    const syntheticEvent = {
      target: { value: suggestion },
      currentTarget: { value: suggestion },
    } as React.ChangeEvent<HTMLInputElement>;
    
    if (value === undefined) {
      setInternalValue(suggestion);
    }
    onChange?.(syntheticEvent);
    onSuggestionSelect?.(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.focus();
  };

  // Render icon
  const renderIcon = (iconElement: React.ReactNode, position: 'left' | 'right') => {
    if (!iconElement) return null;
    
    const iconClasses = [
      'absolute top-1/2 transform -translate-y-1/2',
      'w-5 h-5',
      position === 'left' ? 'left-3' : 'right-3',
      stateColors[currentState],
    ].filter(Boolean).join(' ');

    return (
      <div className={iconClasses}>
        {iconElement}
      </div>
    );
  };

  // Render state icon
  const renderStateIcon = () => {
    if (loading) {
      return (
        <motion.div
          className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-full h-full" />
        </motion.div>
      );
    }

    if (clearable && hasValue && !disabled) {
      return (
        <button
          type="button"
          className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          onClick={handleClear}
          tabIndex={-1}
          aria-label="Clear input"
        >
          <X className="w-full h-full" />
        </button>
      );
    }

    if (isPassword) {
      return (
        <button
          type="button"
          className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          onClick={togglePasswordVisibility}
          tabIndex={-1}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff className="w-full h-full" /> : <Eye className="w-full h-full" />}
        </button>
      );
    }

    if (hasSuggestions && !loading) {
      return (
        <button
          type="button"
          className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          onClick={() => setShowSuggestions(!showSuggestions)}
          tabIndex={-1}
          aria-label="Toggle suggestions"
          aria-expanded={showSuggestions}
          aria-controls={suggestionsId}
        >
          <motion.div
            animate={{ rotate: showSuggestions ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-full h-full" />
          </motion.div>
        </button>
      );
    }

    if (currentState !== 'default' && stateIcons[currentState as keyof typeof stateIcons]) {
      const StateIcon = stateIcons[currentState as keyof typeof stateIcons];
      return (
        <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${stateColors[currentState]}`}>
          <StateIcon className="w-full h-full" />
        </div>
      );
    }

    return null;
  };

  return (
    <div className={containerClasses}>
      <div className="relative">
        {/* Input field */}
        <motion.input
          ref={(node) => {
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
            inputRef.current = node;
          }}
          id={inputId}
          type={currentType}
          value={currentValue}
          placeholder={label ? ' ' : placeholder}
          disabled={disabled || loading}
          required={required}
          autoComplete={autoComplete}
          className={inputClasses}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          data-testid={testId}
          aria-describedby={[
            displayText ? (errorText ? errorId : helperId) : undefined,
            showSuggestions ? suggestionsId : undefined
          ].filter(Boolean).join(' ') || undefined}
          aria-invalid={currentState === 'error'}
          aria-expanded={showSuggestions}
          aria-autocomplete={hasSuggestions ? 'list' : undefined}
          aria-controls={showSuggestions ? suggestionsId : undefined}
          role={hasSuggestions ? 'combobox' : undefined}
          variants={inputAnimations}
          whileFocus="focus"
          {...props}
        />

        {/* Floating label */}
        {label && (
          <motion.label
            htmlFor={inputId}
            className={labelClasses}
            variants={labelAnimations}
            animate={isFloating ? 'floating' : 'default'}
          >
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </motion.label>
        )}

        {/* Left icon */}
        {icon && iconPosition === 'left' && renderIcon(icon, 'left')}

        {/* Right icon */}
        {icon && iconPosition === 'right' && renderIcon(icon, 'right')}

        {/* State/action icons */}
        {renderStateIcon()}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <motion.div
          ref={suggestionsRef}
          id={suggestionsId}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          variants={suggestionsAnimations}
          initial="hidden"
          animate="visible"
          exit="hidden"
          role="listbox"
          aria-label="Suggestions"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <motion.button
              key={suggestion}
              type="button"
              className={[
                'w-full px-4 py-2 text-left text-sm transition-colors',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none',
                selectedSuggestionIndex === index
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'text-gray-900 dark:text-gray-100',
                index === 0 ? 'rounded-t-lg' : '',
                index === filteredSuggestions.length - 1 ? 'rounded-b-lg' : ''
              ].filter(Boolean).join(' ')}
              onClick={() => handleSuggestionSelect(suggestion)}
              onMouseEnter={() => setSelectedSuggestionIndex(index)}
              role="option"
              aria-selected={selectedSuggestionIndex === index}
              whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
              whileTap={{ scale: 0.98 }}
            >
              {suggestion}
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Helper/error text */}
      {displayText && (
        <motion.p
          id={errorText ? errorId : helperId}
          className={`mt-2 text-sm ${stateColors[currentState]}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        >
          {displayText}
        </motion.p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;