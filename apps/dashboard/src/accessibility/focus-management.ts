/**
 * Focus Management System
 * Provides comprehensive focus handling with trapping and restoration
 */

export interface FocusOptions {
  preventScroll?: boolean;
  restoreOnUnmount?: boolean;
  trapFocus?: boolean;
}

export interface FocusTrap {
  activate(): void;
  deactivate(): void;
  pause(): void;
  unpause(): void;
}

export class FocusManager {
  private static instance: FocusManager;
  private focusHistory: HTMLElement[] = [];
  private activeTrap: FocusTrap | null = null;

  static getInstance(): FocusManager {
    if (!FocusManager.instance) {
      FocusManager.instance = new FocusManager();
    }
    return FocusManager.instance;
  }

  /**
   * Manages focus with proper restoration
   */
  manageFocus(element: HTMLElement, options: FocusOptions = {}): void {
    const currentFocus = document.activeElement as HTMLElement;
    
    if (currentFocus && options.restoreOnUnmount) {
      this.focusHistory.push(currentFocus);
    }

    element.focus({ preventScroll: options.preventScroll });

    if (options.trapFocus) {
      this.activeTrap = this.createFocusTrap(element);
      this.activeTrap.activate();
    }
  }

  /**
   * Restores focus to the previously focused element
   */
  restoreFocus(): void {
    const previousElement = this.focusHistory.pop();
    if (previousElement && document.contains(previousElement)) {
      previousElement.focus();
    }
  }

  /**
   * Creates a focus trap for a container element
   */
  createFocusTrap(container: HTMLElement): FocusTrap {
    let isActive = false;
    let isPaused = false;

    const getFocusableElements = (): HTMLElement[] => {
      const focusableSelectors = [
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'a[href]',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]'
      ].join(', ');

      return Array.from(container.querySelectorAll(focusableSelectors))
        .filter(el => this.isVisible(el as HTMLElement)) as HTMLElement[];
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!isActive || isPaused || event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const currentElement = document.activeElement as HTMLElement;

      if (event.shiftKey) {
        // Shift + Tab (backward)
        if (currentElement === firstElement || !focusableElements.includes(currentElement)) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab (forward)
        if (currentElement === lastElement || !focusableElements.includes(currentElement)) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    return {
      activate: () => {
        if (isActive) return;
        isActive = true;
        document.addEventListener('keydown', handleKeyDown);
        
        // Focus first focusable element
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      },

      deactivate: () => {
        if (!isActive) return;
        isActive = false;
        isPaused = false;
        document.removeEventListener('keydown', handleKeyDown);
        this.activeTrap = null;
      },

      pause: () => {
        isPaused = true;
      },

      unpause: () => {
        isPaused = false;
      }
    };
  }

  /**
   * Checks if an element is visible and focusable
   */
  private isVisible(element: HTMLElement): boolean {
    if (!element || !element.offsetParent) return false;
    
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 && 
           element.offsetHeight > 0;
  }

  /**
   * Sets logical tab order for elements
   */
  setTabOrder(elements: HTMLElement[]): void {
    elements.forEach((element, index) => {
      element.tabIndex = index;
    });
  }

  /**
   * Handles arrow key navigation within a container
   */
  handleArrowNavigation(
    event: KeyboardEvent, 
    container: HTMLElement, 
    orientation: 'horizontal' | 'vertical' | 'both' = 'both'
  ): void {
    const focusableElements = this.getFocusableChildren(container);
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    
    if (currentIndex === -1 || focusableElements.length === 0) return;

    let nextIndex = currentIndex;
    let shouldPreventDefault = false;

    switch (event.key) {
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          nextIndex = (currentIndex + 1) % focusableElements.length;
          shouldPreventDefault = true;
        }
        break;
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          nextIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
          shouldPreventDefault = true;
        }
        break;
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          nextIndex = (currentIndex + 1) % focusableElements.length;
          shouldPreventDefault = true;
        }
        break;
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          nextIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
          shouldPreventDefault = true;
        }
        break;
      case 'Home':
        nextIndex = 0;
        shouldPreventDefault = true;
        break;
      case 'End':
        nextIndex = focusableElements.length - 1;
        shouldPreventDefault = true;
        break;
    }

    if (shouldPreventDefault) {
      event.preventDefault();
    }

    if (nextIndex !== currentIndex && focusableElements[nextIndex]) {
      focusableElements[nextIndex].focus();
    }
  }

  private getFocusableChildren(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])',
      '[role="menuitem"]:not([disabled])'
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors))
      .filter(el => this.isVisible(el as HTMLElement)) as HTMLElement[];
  }
}

// React hook for focus management
export function useFocusManagement() {
  const focusManager = FocusManager.getInstance();

  return {
    manageFocus: focusManager.manageFocus.bind(focusManager),
    restoreFocus: focusManager.restoreFocus.bind(focusManager),
    createFocusTrap: focusManager.createFocusTrap.bind(focusManager),
    setTabOrder: focusManager.setTabOrder.bind(focusManager),
    handleArrowNavigation: focusManager.handleArrowNavigation.bind(focusManager)
  };
}