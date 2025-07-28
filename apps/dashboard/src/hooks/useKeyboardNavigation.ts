import { useEffect, useCallback, useRef } from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';

interface KeyboardNavigationOptions {
  enableArrowKeys?: boolean;
  enableTabTrapping?: boolean;
  enableEscapeKey?: boolean;
  onEscape?: () => void;
  focusableSelectors?: string[];
}

const DEFAULT_FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
  '[role="button"]:not([disabled])',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="tab"]',
];

export const useKeyboardNavigation = (
  containerRef: React.RefObject<HTMLElement>,
  options: KeyboardNavigationOptions = {}
) => {
  const { settings, announceToScreenReader } = useAccessibility();
  const currentFocusIndex = useRef<number>(0);
  
  const {
    enableArrowKeys = true,
    enableTabTrapping = false,
    enableEscapeKey = true,
    onEscape,
    focusableSelectors = DEFAULT_FOCUSABLE_SELECTORS,
  } = options;

  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    
    const selector = focusableSelectors.join(', ');
    const elements = containerRef.current.querySelectorAll(selector);
    
    return Array.from(elements).filter((element) => {
      const htmlElement = element as HTMLElement;
      return (
        htmlElement.offsetWidth > 0 &&
        htmlElement.offsetHeight > 0 &&
        !htmlElement.hasAttribute('disabled') &&
        htmlElement.tabIndex !== -1
      );
    }) as HTMLElement[];
  }, [containerRef, focusableSelectors]);

  const focusElement = useCallback((index: number) => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const targetIndex = Math.max(0, Math.min(index, focusableElements.length - 1));
    const element = focusableElements[targetIndex];
    
    if (element) {
      element.focus();
      currentFocusIndex.current = targetIndex;
      
      // Announce focus change for screen readers
      if (settings.screenReaderMode) {
        const label = element.getAttribute('aria-label') || 
                     element.getAttribute('title') ||
                     element.textContent?.trim() ||
                     element.tagName.toLowerCase();
        announceToScreenReader(`Focused on ${label}`);
      }
    }
  }, [getFocusableElements, settings.screenReaderMode, announceToScreenReader]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!settings.keyboardNavigation) return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const currentElement = document.activeElement as HTMLElement;
    const currentIndex = focusableElements.indexOf(currentElement);
    
    if (currentIndex !== -1) {
      currentFocusIndex.current = currentIndex;
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        if (enableArrowKeys) {
          event.preventDefault();
          const nextIndex = (currentFocusIndex.current + 1) % focusableElements.length;
          focusElement(nextIndex);
        }
        break;

      case 'ArrowUp':
      case 'ArrowLeft':
        if (enableArrowKeys) {
          event.preventDefault();
          const prevIndex = currentFocusIndex.current === 0 
            ? focusableElements.length - 1 
            : currentFocusIndex.current - 1;
          focusElement(prevIndex);
        }
        break;

      case 'Home':
        if (enableArrowKeys) {
          event.preventDefault();
          focusElement(0);
        }
        break;

      case 'End':
        if (enableArrowKeys) {
          event.preventDefault();
          focusElement(focusableElements.length - 1);
        }
        break;

      case 'Tab':
        if (enableTabTrapping) {
          event.preventDefault();
          const nextIndex = event.shiftKey
            ? (currentFocusIndex.current === 0 ? focusableElements.length - 1 : currentFocusIndex.current - 1)
            : (currentFocusIndex.current + 1) % focusableElements.length;
          focusElement(nextIndex);
        }
        break;

      case 'Escape':
        if (enableEscapeKey && onEscape) {
          event.preventDefault();
          onEscape();
        }
        break;

      case 'Enter':
      case ' ':
        // Handle activation of focused element
        if (currentElement && (
          currentElement.getAttribute('role') === 'button' ||
          currentElement.tagName === 'BUTTON'
        )) {
          event.preventDefault();
          currentElement.click();
        }
        break;
    }
  }, [
    settings.keyboardNavigation,
    getFocusableElements,
    enableArrowKeys,
    enableTabTrapping,
    enableEscapeKey,
    onEscape,
    focusElement,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, containerRef]);

  const focusFirst = useCallback(() => {
    focusElement(0);
  }, [focusElement]);

  const focusLast = useCallback(() => {
    const focusableElements = getFocusableElements();
    focusElement(focusableElements.length - 1);
  }, [focusElement, getFocusableElements]);

  const focusNext = useCallback(() => {
    const focusableElements = getFocusableElements();
    const nextIndex = (currentFocusIndex.current + 1) % focusableElements.length;
    focusElement(nextIndex);
  }, [focusElement, getFocusableElements]);

  const focusPrevious = useCallback(() => {
    const focusableElements = getFocusableElements();
    const prevIndex = currentFocusIndex.current === 0 
      ? focusableElements.length - 1 
      : currentFocusIndex.current - 1;
    focusElement(prevIndex);
  }, [focusElement, getFocusableElements]);

  return {
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    focusElement,
    getFocusableElements,
  };
};

export default useKeyboardNavigation;