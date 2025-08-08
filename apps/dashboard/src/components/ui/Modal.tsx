/**
 * Modal Component
 * A comprehensive modal component with backdrop blur, smooth animations, and enhanced accessibility
 * Includes focus management, screen reader support, and keyboard navigation
 */

import React, { forwardRef, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, HTMLMotionProps, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ModalProps } from '../../types/design-system';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { FocusManager } from '../../utils/accessibility';

// Modal size styles
const modalSizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4 my-4 h-[calc(100vh-2rem)]',
};

// Animation variants
const backdropAnimations = {
  hidden: {
    opacity: 0,
    backdropFilter: 'blur(0px)',
  },
  visible: {
    opacity: 1,
    backdropFilter: 'blur(8px)',
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    backdropFilter: 'blur(0px)',
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

const modalAnimations = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
      delay: 0.1,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

// Enhanced focus trap utility with accessibility features
const useFocusTrap = (
  isOpen: boolean, 
  modalRef: React.RefObject<HTMLDivElement>,
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void
) => {
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const focusTrapCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Use the enhanced FocusManager for focus trapping
    focusTrapCleanup.current = FocusManager.trapFocus(modalRef.current);

    // Announce modal opening to screen readers
    announceToScreenReader('Modal dialog opened', 'assertive');

    // Cleanup function
    return () => {
      if (focusTrapCleanup.current) {
        focusTrapCleanup.current();
      }
      
      // Restore focus to the previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
        announceToScreenReader('Modal dialog closed', 'polite');
      }
    };
  }, [isOpen, modalRef, announceToScreenReader]);
};

// Body scroll lock utility
const useBodyScrollLock = (isOpen: boolean, preventScroll: boolean) => {
  useEffect(() => {
    if (!isOpen || !preventScroll) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    // Lock body scroll
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = originalStyle;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen, preventScroll]);
};

/**
 * Modal component with backdrop blur, smooth animations, and enhanced accessibility
 */
export const Modal = forwardRef<
  HTMLDivElement,
  ModalProps & Omit<HTMLMotionProps<'div'>, keyof ModalProps>
>(({
  isOpen,
  onClose,
  size = 'md',
  title,
  description,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  preventScroll = true,
  centered = true,
  footer,
  className = '',
  children,
  testId,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  ...props
}, ref) => {
  const { settings, announceToScreenReader } = useAccessibility();
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleId = `modal-title-${Math.random().toString(36).substr(2, 9)}`;
  const descriptionId = `modal-description-${Math.random().toString(36).substr(2, 9)}`;

  // Custom hooks for modal functionality
  useFocusTrap(isOpen, modalRef, announceToScreenReader);
  useBodyScrollLock(isOpen, preventScroll);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === overlayRef.current) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  // Handle close button click
  const handleCloseClick = useCallback(() => {
    announceToScreenReader('Closing modal', 'polite');
    onClose();
  }, [onClose, announceToScreenReader]);

  // Generate accessible IDs
  const modalTitleId = ariaLabelledBy || (title ? titleId : undefined);
  const modalDescriptionId = ariaDescribedBy || (description ? descriptionId : undefined);

  // Build class names
  const overlayClasses = [
    'fixed inset-0 z-modal',
    'flex items-center justify-center',
    'bg-black/50',
    centered ? 'p-4' : 'pt-16 pb-4 px-4',
  ].filter(Boolean).join(' ');

  const modalClasses = [
    'relative w-full',
    'bg-white dark:bg-gray-800',
    'rounded-xl shadow-2xl',
    'border border-gray-200 dark:border-gray-700',
    'overflow-hidden',
    modalSizes[size],
    size === 'full' ? 'flex flex-col' : '',
    className,
  ].filter(Boolean).join(' ');

  const headerClasses = [
    'flex items-center justify-between',
    'px-6 py-4',
    'border-b border-gray-200 dark:border-gray-700',
    'bg-gray-50 dark:bg-gray-900/50',
  ].filter(Boolean).join(' ');

  const contentClasses = [
    'px-6 py-4',
    size === 'full' ? 'flex-1 overflow-y-auto' : '',
  ].filter(Boolean).join(' ');

  const footerClasses = [
    'px-6 py-4',
    'border-t border-gray-200 dark:border-gray-700',
    'bg-gray-50 dark:bg-gray-900/50',
  ].filter(Boolean).join(' ');

  // Don't render anything if modal is not open
  if (!isOpen) return null;

  // Create portal to render modal at document root
  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          ref={overlayRef}
          className={overlayClasses}
          onClick={handleOverlayClick}
          variants={backdropAnimations}
          initial="hidden"
          animate="visible"
          exit="exit"
          data-testid={testId ? `${testId}-overlay` : undefined}
        >
          <motion.div
            ref={(node) => {
              if (typeof ref === 'function') {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
              modalRef.current = node;
            }}
            className={modalClasses}
            onClick={(e) => e.stopPropagation()}
            variants={settings.reducedMotion ? {} : modalAnimations}
            initial={settings.reducedMotion ? undefined : "hidden"}
            animate={settings.reducedMotion ? undefined : "visible"}
            exit={settings.reducedMotion ? undefined : "exit"}
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            aria-describedby={modalDescriptionId}
            aria-live="polite"
            data-testid={testId}
            {...props}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className={headerClasses}>
                <div className="flex-1 min-w-0">
                  {title && (
                    <h2
                      id={modalTitleId}
                      className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate"
                    >
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p
                      id={modalDescriptionId}
                      className="mt-1 text-sm text-gray-500 dark:text-gray-400"
                    >
                      {description}
                    </p>
                  )}
                </div>
                
                {showCloseButton && (
                  <motion.button
                    type="button"
                    className={[
                      'ml-4 p-2 rounded-lg',
                      'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                      'hover:bg-gray-100 dark:hover:bg-gray-700',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                      'transition-colors duration-200',
                      'min-w-[44px] min-h-[44px]', // Ensure minimum touch target size
                    ].join(' ')}
                    onClick={handleCloseClick}
                    aria-label={`Close ${title || 'modal'}`}
                    aria-describedby="close-button-description"
                    whileHover={settings.reducedMotion ? {} : { scale: 1.05 }}
                    whileTap={settings.reducedMotion ? {} : { scale: 0.95 }}
                  >
                    <X className="w-5 h-5" aria-hidden="true" />
                    <span id="close-button-description" className="sr-only">
                      Press Escape key or click this button to close the modal
                    </span>
                  </motion.button>
                )}
              </div>
            )}

            {/* Content */}
            <div className={contentClasses}>
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className={footerClasses}>
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render modal in a portal
  return createPortal(modalContent, document.body);
});

Modal.displayName = 'Modal';

export default Modal;