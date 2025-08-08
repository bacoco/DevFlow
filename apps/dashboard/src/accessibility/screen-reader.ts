/**
 * Screen Reader Support System
 * Provides comprehensive ARIA support and live region management
 */

export type Priority = 'polite' | 'assertive' | 'off';
export type LiveRegionType = 'status' | 'alert' | 'log' | 'marquee' | 'timer';

export interface AriaAttributes {
  label?: string;
  labelledby?: string;
  describedby?: string;
  expanded?: boolean;
  selected?: boolean;
  checked?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  live?: Priority;
  atomic?: boolean;
  relevant?: string;
  busy?: boolean;
  controls?: string;
  owns?: string;
  flowto?: string;
  activedescendant?: string;
  role?: string;
  level?: number;
  setsize?: number;
  posinset?: number;
}

export class ScreenReaderManager {
  private static instance: ScreenReaderManager;
  private liveRegions: Map<string, HTMLElement> = new Map();
  private announceQueue: Array<{ message: string; priority: Priority }> = [];
  private isProcessingQueue = false;

  static getInstance(): ScreenReaderManager {
    if (!ScreenReaderManager.instance) {
      ScreenReaderManager.instance = new ScreenReaderManager();
      ScreenReaderManager.instance.initialize();
    }
    return ScreenReaderManager.instance;
  }

  private initialize(): void {
    // Delay initialization to ensure DOM is ready
    if (typeof window !== 'undefined') {
      setTimeout(() => this.createLiveRegions(), 0);
    }
  }

  /**
   * Creates live regions for screen reader announcements
   */
  private createLiveRegions(): void {
    const regions = [
      { id: 'polite-announcements', priority: 'polite' as Priority },
      { id: 'assertive-announcements', priority: 'assertive' as Priority },
      { id: 'status-updates', priority: 'polite' as Priority, role: 'status' },
      { id: 'alert-messages', priority: 'assertive' as Priority, role: 'alert' }
    ];

    regions.forEach(({ id, priority, role }) => {
      let region = document.getElementById(id);
      if (!region) {
        region = document.createElement('div');
        region.id = id;
        region.setAttribute('aria-live', priority);
        region.setAttribute('aria-atomic', 'true');
        region.className = 'sr-only';
        
        if (role) {
          region.setAttribute('role', role);
        }

        // Hide visually but keep accessible to screen readers
        region.style.cssText = `
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          padding: 0 !important;
          margin: -1px !important;
          overflow: hidden !important;
          clip: rect(0, 0, 0, 0) !important;
          white-space: nowrap !important;
          border: 0 !important;
        `;

        document.body.appendChild(region);
      }
      this.liveRegions.set(id, region);
    });
  }

  /**
   * Announces a message to screen readers
   */
  announceToScreenReader(message: string, priority: Priority = 'polite'): void {
    if (!message || !message.trim()) return;

    this.announceQueue.push({ message: message.trim(), priority });
    this.processAnnounceQueue();
  }

  private async processAnnounceQueue(): Promise<void> {
    if (this.isProcessingQueue || this.announceQueue.length === 0) return;

    this.isProcessingQueue = true;

    while (this.announceQueue.length > 0) {
      const { message, priority } = this.announceQueue.shift()!;
      await this.makeAnnouncement(message, priority);
      // Small delay to ensure screen readers process the announcement
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessingQueue = false;
  }

  private async makeAnnouncement(message: string, priority: Priority): Promise<void> {
    const regionId = priority === 'assertive' ? 'assertive-announcements' : 'polite-announcements';
    const region = this.liveRegions.get(regionId);
    
    if (region) {
      // Clear previous content
      region.textContent = '';
      // Force reflow
      region.offsetHeight;
      // Set new content
      region.textContent = message;
    }
  }

  /**
   * Updates a live region with new content
   */
  updateLiveRegion(content: string, regionType: LiveRegionType = 'status'): void {
    const regionId = regionType === 'alert' ? 'alert-messages' : 'status-updates';
    const region = this.liveRegions.get(regionId);
    
    if (region) {
      region.textContent = content;
    }
  }

  /**
   * Sets ARIA attributes on an element
   */
  setAriaAttributes(element: HTMLElement, attributes: AriaAttributes): void {
    Object.entries(attributes).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      const ariaKey = key === 'role' ? 'role' : `aria-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      
      if (typeof value === 'boolean') {
        element.setAttribute(ariaKey, value.toString());
      } else {
        element.setAttribute(ariaKey, value.toString());
      }
    });
  }

  /**
   * Creates accessible descriptions for complex UI elements
   */
  createAccessibleDescription(element: HTMLElement, description: string): string {
    // Check if element already has a description
    const existingDescId = element.getAttribute('aria-describedby');
    if (existingDescId) {
      const existingDesc = document.getElementById(existingDescId);
      if (existingDesc) {
        existingDesc.textContent = description;
        return existingDescId;
      }
    }

    const descriptionId = `desc-${Math.random().toString(36).substr(2, 9)}`;
    
    const descElement = document.createElement('div');
    descElement.id = descriptionId;
    descElement.className = 'sr-only';
    descElement.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;
    descElement.textContent = description;
    document.body.appendChild(descElement);
    
    element.setAttribute('aria-describedby', descriptionId);
    
    return descriptionId;
  }

  /**
   * Manages focus announcements for dynamic content
   */
  announceFocusChange(element: HTMLElement, context?: string): void {
    const label = element.getAttribute('aria-label') || 
                  element.getAttribute('title') || 
                  element.textContent || 
                  'Interactive element';
    
    const role = element.getAttribute('role') || element.tagName.toLowerCase();
    const state = this.getElementState(element);
    
    let announcement = `${label}, ${role}`;
    if (state) announcement += `, ${state}`;
    if (context) announcement += `, ${context}`;
    
    this.announceToScreenReader(announcement, 'polite');
  }

  /**
   * Gets the current state of an element for announcements
   */
  private getElementState(element: HTMLElement): string {
    const states: string[] = [];
    
    if (element.getAttribute('aria-expanded') === 'true') states.push('expanded');
    if (element.getAttribute('aria-expanded') === 'false') states.push('collapsed');
    if (element.getAttribute('aria-selected') === 'true') states.push('selected');
    if (element.getAttribute('aria-checked') === 'true') states.push('checked');
    if (element.getAttribute('aria-pressed') === 'true') states.push('pressed');
    if (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true') {
      states.push('disabled');
    }
    
    return states.join(', ');
  }

  /**
   * Creates accessible table announcements
   */
  announceTableNavigation(
    cell: HTMLElement, 
    rowIndex: number, 
    colIndex: number, 
    totalRows: number, 
    totalCols: number
  ): void {
    const cellContent = cell.textContent?.trim() || 'empty cell';
    const announcement = `${cellContent}, row ${rowIndex + 1} of ${totalRows}, column ${colIndex + 1} of ${totalCols}`;
    this.announceToScreenReader(announcement, 'polite');
  }

  /**
   * Announces loading states
   */
  announceLoadingState(isLoading: boolean, context?: string): void {
    const message = isLoading 
      ? `Loading${context ? ` ${context}` : ''}...`
      : `Finished loading${context ? ` ${context}` : ''}`;
    
    this.announceToScreenReader(message, 'polite');
  }

  /**
   * Announces form validation errors
   */
  announceFormError(fieldName: string, errorMessage: string): void {
    const announcement = `Error in ${fieldName}: ${errorMessage}`;
    this.announceToScreenReader(announcement, 'assertive');
  }

  /**
   * Cleans up live regions and event listeners
   */
  cleanup(): void {
    this.liveRegions.forEach((region) => {
      if (region.parentNode) {
        region.parentNode.removeChild(region);
      }
    });
    this.liveRegions.clear();
    this.announceQueue = [];
  }
}

// React hook for screen reader support
export function useScreenReader() {
  const screenReader = ScreenReaderManager.getInstance();

  return {
    announce: screenReader.announceToScreenReader.bind(screenReader),
    updateLiveRegion: screenReader.updateLiveRegion.bind(screenReader),
    setAriaAttributes: screenReader.setAriaAttributes.bind(screenReader),
    createAccessibleDescription: screenReader.createAccessibleDescription.bind(screenReader),
    announceFocusChange: screenReader.announceFocusChange.bind(screenReader),
    announceTableNavigation: screenReader.announceTableNavigation.bind(screenReader),
    announceLoadingState: screenReader.announceLoadingState.bind(screenReader),
    announceFormError: screenReader.announceFormError.bind(screenReader)
  };
}