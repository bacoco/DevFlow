/**
 * Keyboard Navigation System
 * Provides comprehensive keyboard navigation with logical tab order and shortcuts
 */

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  handler: (event: KeyboardEvent) => void;
  description: string;
  scope?: string;
}

export interface NavigationContext {
  container: HTMLElement;
  orientation: 'horizontal' | 'vertical' | 'both';
  wrap: boolean;
  skipDisabled: boolean;
}

export class KeyboardNavigationManager {
  private static instance: KeyboardNavigationManager;
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private navigationContexts: Map<HTMLElement, NavigationContext> = new Map();
  private isEnabled = true;

  static getInstance(): KeyboardNavigationManager {
    if (!KeyboardNavigationManager.instance) {
      KeyboardNavigationManager.instance = new KeyboardNavigationManager();
      KeyboardNavigationManager.instance.initialize();
    }
    return KeyboardNavigationManager.instance;
  }

  private initialize(): void {
    document.addEventListener('keydown', this.handleGlobalKeyDown.bind(this));
    this.registerDefaultShortcuts();
  }

  /**
   * Registers default keyboard shortcuts
   */
  private registerDefaultShortcuts(): void {
    // Skip links navigation
    this.registerShortcut({
      key: 'Tab',
      handler: this.handleSkipLinksNavigation.bind(this),
      description: 'Navigate skip links'
    });

    // Global search
    this.registerShortcut({
      key: 'k',
      ctrlKey: true,
      handler: (event) => {
        event.preventDefault();
        this.focusGlobalSearch();
      },
      description: 'Open global search'
    });

    // Help dialog
    this.registerShortcut({
      key: '?',
      shiftKey: true,
      handler: (event) => {
        event.preventDefault();
        this.showKeyboardShortcuts();
      },
      description: 'Show keyboard shortcuts help'
    });

    // Escape key for closing modals/menus
    this.registerShortcut({
      key: 'Escape',
      handler: this.handleEscapeKey.bind(this),
      description: 'Close modal or menu'
    });
  }

  /**
   * Registers a keyboard shortcut
   */
  registerShortcut(shortcut: KeyboardShortcut): void {
    const key = this.createShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  /**
   * Unregisters a keyboard shortcut
   */
  unregisterShortcut(shortcut: Partial<KeyboardShortcut>): void {
    const key = this.createShortcutKey(shortcut as KeyboardShortcut);
    this.shortcuts.delete(key);
  }

  /**
   * Creates a unique key for a shortcut
   */
  private createShortcutKey(shortcut: KeyboardShortcut): string {
    const modifiers = [];
    if (shortcut.ctrlKey) modifiers.push('ctrl');
    if (shortcut.altKey) modifiers.push('alt');
    if (shortcut.shiftKey) modifiers.push('shift');
    if (shortcut.metaKey) modifiers.push('meta');
    
    return `${modifiers.join('+')}-${shortcut.key.toLowerCase()}`;
  }

  /**
   * Handles global keydown events
   */
  private handleGlobalKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled) return;

    const shortcutKey = this.createShortcutKey({
      key: event.key,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey
    } as KeyboardShortcut);

    const shortcut = this.shortcuts.get(shortcutKey);
    if (shortcut) {
      // Check if we're in an input field and should skip certain shortcuts
      const activeElement = document.activeElement as HTMLElement;
      const isInInput = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
      );

      // Skip shortcuts in input fields unless they're specifically allowed
      if (isInInput && !this.isInputSafeShortcut(shortcut)) {
        return;
      }

      shortcut.handler(event);
    }
  }

  /**
   * Checks if a shortcut is safe to use in input fields
   */
  private isInputSafeShortcut(shortcut: KeyboardShortcut): boolean {
    const safeKeys = ['Escape', 'Tab', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'];
    return safeKeys.includes(shortcut.key) || shortcut.ctrlKey || shortcut.altKey || shortcut.metaKey;
  }

  /**
   * Sets up navigation context for a container
   */
  setupNavigationContext(container: HTMLElement, context: Partial<NavigationContext>): void {
    const fullContext: NavigationContext = {
      container,
      orientation: 'both',
      wrap: true,
      skipDisabled: true,
      ...context
    };

    this.navigationContexts.set(container, fullContext);
    container.addEventListener('keydown', this.handleContainerKeyDown.bind(this));
  }

  /**
   * Handles keydown events within navigation contexts
   */
  private handleContainerKeyDown(event: KeyboardEvent): void {
    const container = event.currentTarget as HTMLElement;
    const context = this.navigationContexts.get(container);
    
    if (!context) return;

    const focusableElements = this.getFocusableElements(container, context.skipDisabled);
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    let handled = false;

    switch (event.key) {
      case 'ArrowRight':
        if (context.orientation === 'horizontal' || context.orientation === 'both') {
          nextIndex = this.getNextIndex(currentIndex, focusableElements.length, 1, context.wrap);
          handled = true;
        }
        break;
      case 'ArrowLeft':
        if (context.orientation === 'horizontal' || context.orientation === 'both') {
          nextIndex = this.getNextIndex(currentIndex, focusableElements.length, -1, context.wrap);
          handled = true;
        }
        break;
      case 'ArrowDown':
        if (context.orientation === 'vertical' || context.orientation === 'both') {
          nextIndex = this.getNextIndex(currentIndex, focusableElements.length, 1, context.wrap);
          handled = true;
        }
        break;
      case 'ArrowUp':
        if (context.orientation === 'vertical' || context.orientation === 'both') {
          nextIndex = this.getNextIndex(currentIndex, focusableElements.length, -1, context.wrap);
          handled = true;
        }
        break;
      case 'Home':
        nextIndex = 0;
        handled = true;
        break;
      case 'End':
        nextIndex = focusableElements.length - 1;
        handled = true;
        break;
    }

    if (handled && nextIndex !== currentIndex) {
      event.preventDefault();
      focusableElements[nextIndex].focus();
    }
  }

  /**
   * Gets the next index for navigation
   */
  private getNextIndex(current: number, total: number, direction: number, wrap: boolean): number {
    let next = current + direction;
    
    if (wrap) {
      if (next < 0) next = total - 1;
      if (next >= total) next = 0;
    } else {
      next = Math.max(0, Math.min(total - 1, next));
    }
    
    return next;
  }

  /**
   * Gets focusable elements within a container
   */
  private getFocusableElements(container: HTMLElement, skipDisabled: boolean): HTMLElement[] {
    const selectors = [
      'button',
      'input',
      'select',
      'textarea',
      'a[href]',
      '[tabindex]',
      '[contenteditable="true"]',
      '[role="button"]',
      '[role="menuitem"]',
      '[role="tab"]',
      '[role="option"]'
    ];

    const elements = Array.from(container.querySelectorAll(selectors.join(', '))) as HTMLElement[];
    
    return elements.filter(element => {
      if (!this.isVisible(element)) return false;
      if (element.tabIndex === -1) return false;
      if (skipDisabled && (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true')) {
        return false;
      }
      return true;
    });
  }

  /**
   * Checks if an element is visible
   */
  private isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 && 
           element.offsetHeight > 0;
  }

  /**
   * Handles skip links navigation
   */
  private handleSkipLinksNavigation(event: KeyboardEvent): void {
    if (event.key === 'Tab' && !event.shiftKey) {
      const skipLinks = document.querySelectorAll('[data-skip-link]');
      if (skipLinks.length > 0 && document.activeElement === document.body) {
        event.preventDefault();
        (skipLinks[0] as HTMLElement).focus();
      }
    }
  }

  /**
   * Focuses the global search input
   */
  private focusGlobalSearch(): void {
    const searchInput = document.querySelector('[data-global-search]') as HTMLElement;
    if (searchInput) {
      searchInput.focus();
    }
  }

  /**
   * Shows keyboard shortcuts help
   */
  private showKeyboardShortcuts(): void {
    // This would typically open a modal or panel with shortcuts
    const event = new CustomEvent('show-keyboard-shortcuts', {
      detail: { shortcuts: Array.from(this.shortcuts.values()) }
    });
    document.dispatchEvent(event);
  }

  /**
   * Handles escape key for closing modals/menus
   */
  private handleEscapeKey(event: KeyboardEvent): void {
    // Find the topmost modal or menu
    const modals = document.querySelectorAll('[role="dialog"], [role="menu"], [data-modal]');
    if (modals.length > 0) {
      const topModal = modals[modals.length - 1] as HTMLElement;
      const closeButton = topModal.querySelector('[data-close], [aria-label*="close" i]') as HTMLElement;
      if (closeButton) {
        closeButton.click();
      } else {
        // Dispatch a close event
        const closeEvent = new CustomEvent('modal-close', { detail: { modal: topModal } });
        topModal.dispatchEvent(closeEvent);
      }
    }
  }

  /**
   * Creates roving tabindex for a group of elements
   */
  createRovingTabindex(elements: HTMLElement[], initialIndex = 0): void {
    elements.forEach((element, index) => {
      element.tabIndex = index === initialIndex ? 0 : -1;
    });

    elements.forEach((element, index) => {
      element.addEventListener('focus', () => {
        elements.forEach((el, i) => {
          el.tabIndex = i === index ? 0 : -1;
        });
      });
    });
  }

  /**
   * Enables or disables keyboard navigation
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Gets all registered shortcuts
   */
  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Cleanup method
   */
  cleanup(): void {
    document.removeEventListener('keydown', this.handleGlobalKeyDown.bind(this));
    this.shortcuts.clear();
    this.navigationContexts.clear();
  }
}

// React hook for keyboard navigation
export function useKeyboardNavigation() {
  const keyboardNav = KeyboardNavigationManager.getInstance();

  return {
    registerShortcut: keyboardNav.registerShortcut.bind(keyboardNav),
    unregisterShortcut: keyboardNav.unregisterShortcut.bind(keyboardNav),
    setupNavigationContext: keyboardNav.setupNavigationContext.bind(keyboardNav),
    createRovingTabindex: keyboardNav.createRovingTabindex.bind(keyboardNav),
    setEnabled: keyboardNav.setEnabled.bind(keyboardNav),
    getShortcuts: keyboardNav.getShortcuts.bind(keyboardNav)
  };
}