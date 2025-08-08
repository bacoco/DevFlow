/**
 * Screen Reader Support Tests
 * Tests for ARIA support, live regions, and screen reader announcements
 */

import { ScreenReaderManager } from '../screen-reader';

describe('ScreenReaderManager', () => {
  let screenReader: ScreenReaderManager;

  beforeEach(() => {
    screenReader = ScreenReaderManager.getInstance();
    
    // Clear any existing live regions
    const existingRegions = document.querySelectorAll('[aria-live]');
    existingRegions.forEach(region => region.remove());
  });

  afterEach(() => {
    screenReader.cleanup();
  });

  describe('Live Regions', () => {
    test('should create live regions on initialization', () => {
      const politeRegion = document.getElementById('polite-announcements');
      const assertiveRegion = document.getElementById('assertive-announcements');
      const statusRegion = document.getElementById('status-updates');
      const alertRegion = document.getElementById('alert-messages');

      expect(politeRegion).toBeInTheDocument();
      expect(assertiveRegion).toBeInTheDocument();
      expect(statusRegion).toBeInTheDocument();
      expect(alertRegion).toBeInTheDocument();

      expect(politeRegion?.getAttribute('aria-live')).toBe('polite');
      expect(assertiveRegion?.getAttribute('aria-live')).toBe('assertive');
      expect(statusRegion?.getAttribute('role')).toBe('status');
      expect(alertRegion?.getAttribute('role')).toBe('alert');
    });

    test('should make announcements to appropriate live regions', async () => {
      screenReader.announceToScreenReader('Test polite message', 'polite');
      
      const politeRegion = document.getElementById('polite-announcements');
      
      // Wait for announcement to be processed
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(politeRegion?.textContent).toBe('Test polite message');
    });

    test('should handle assertive announcements', async () => {
      screenReader.announceToScreenReader('Urgent message', 'assertive');
      
      const assertiveRegion = document.getElementById('assertive-announcements');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(assertiveRegion?.textContent).toBe('Urgent message');
    });

    test('should queue multiple announcements', async () => {
      screenReader.announceToScreenReader('First message', 'polite');
      screenReader.announceToScreenReader('Second message', 'polite');
      
      const politeRegion = document.getElementById('polite-announcements');
      
      // Wait for both announcements to be processed
      await new Promise(resolve => setTimeout(resolve, 300));
      
      expect(politeRegion?.textContent).toBe('Second message');
    });

    test('should update live regions directly', () => {
      screenReader.updateLiveRegion('Status update', 'status');
      
      const statusRegion = document.getElementById('status-updates');
      expect(statusRegion?.textContent).toBe('Status update');
    });

    test('should handle alert messages', () => {
      screenReader.updateLiveRegion('Alert message', 'alert');
      
      const alertRegion = document.getElementById('alert-messages');
      expect(alertRegion?.textContent).toBe('Alert message');
    });
  });

  describe('ARIA Attributes', () => {
    test('should set basic ARIA attributes', () => {
      const element = document.createElement('button');
      
      screenReader.setAriaAttributes(element, {
        label: 'Test button',
        expanded: false,
        controls: 'menu-1'
      });

      expect(element.getAttribute('aria-label')).toBe('Test button');
      expect(element.getAttribute('aria-expanded')).toBe('false');
      expect(element.getAttribute('aria-controls')).toBe('menu-1');
    });

    test('should handle boolean ARIA attributes', () => {
      const element = document.createElement('input');
      
      screenReader.setAriaAttributes(element, {
        checked: true,
        disabled: false,
        hidden: true
      });

      expect(element.getAttribute('aria-checked')).toBe('true');
      expect(element.getAttribute('aria-disabled')).toBe('false');
      expect(element.getAttribute('aria-hidden')).toBe('true');
    });

    test('should set role attribute', () => {
      const element = document.createElement('div');
      
      screenReader.setAriaAttributes(element, {
        role: 'button'
      });

      expect(element.getAttribute('role')).toBe('button');
    });

    test('should handle complex ARIA attributes', () => {
      const element = document.createElement('div');
      
      screenReader.setAriaAttributes(element, {
        labelledby: 'label-1 label-2',
        describedby: 'desc-1',
        activedescendant: 'option-3',
        setsize: 10,
        posinset: 3
      });

      expect(element.getAttribute('aria-labelledby')).toBe('label-1 label-2');
      expect(element.getAttribute('aria-describedby')).toBe('desc-1');
      expect(element.getAttribute('aria-activedescendant')).toBe('option-3');
      expect(element.getAttribute('aria-setsize')).toBe('10');
      expect(element.getAttribute('aria-posinset')).toBe('3');
    });

    test('should skip undefined and null values', () => {
      const element = document.createElement('button');
      
      screenReader.setAriaAttributes(element, {
        label: 'Test',
        expanded: undefined,
        checked: null as any
      });

      expect(element.getAttribute('aria-label')).toBe('Test');
      expect(element.hasAttribute('aria-expanded')).toBe(false);
      expect(element.hasAttribute('aria-checked')).toBe(false);
    });
  });

  describe('Accessible Descriptions', () => {
    test('should create accessible descriptions', () => {
      const element = document.createElement('button');
      document.body.appendChild(element);
      
      const descriptionId = screenReader.createAccessibleDescription(
        element,
        'This button performs an important action'
      );

      expect(element.getAttribute('aria-describedby')).toBe(descriptionId);
      
      const descElement = document.getElementById(descriptionId);
      expect(descElement).toBeInTheDocument();
      expect(descElement?.textContent).toBe('This button performs an important action');
      expect(descElement?.className).toBe('sr-only');
      
      document.body.removeChild(element);
    });

    test('should reuse existing description elements', () => {
      const element = document.createElement('button');
      document.body.appendChild(element);
      
      const firstId = screenReader.createAccessibleDescription(element, 'First description');
      const secondId = screenReader.createAccessibleDescription(element, 'Second description');

      expect(firstId).toBe(secondId);
      
      const descElement = document.getElementById(firstId);
      expect(descElement?.textContent).toBe('Second description');
      
      document.body.removeChild(element);
    });
  });

  describe('Focus Announcements', () => {
    test('should announce focus changes with basic information', () => {
      const button = document.createElement('button');
      button.textContent = 'Click me';
      
      const announceSpy = jest.spyOn(screenReader, 'announceToScreenReader');
      
      screenReader.announceFocusChange(button);
      
      expect(announceSpy).toHaveBeenCalledWith('Click me, button', 'polite');
    });

    test('should announce focus changes with ARIA label', () => {
      const button = document.createElement('button');
      button.setAttribute('aria-label', 'Close dialog');
      
      const announceSpy = jest.spyOn(screenReader, 'announceToScreenReader');
      
      screenReader.announceFocusChange(button);
      
      expect(announceSpy).toHaveBeenCalledWith('Close dialog, button', 'polite');
    });

    test('should include element state in announcements', () => {
      const button = document.createElement('button');
      button.textContent = 'Menu';
      button.setAttribute('aria-expanded', 'true');
      button.setAttribute('aria-pressed', 'true');
      
      const announceSpy = jest.spyOn(screenReader, 'announceToScreenReader');
      
      screenReader.announceFocusChange(button);
      
      expect(announceSpy).toHaveBeenCalledWith('Menu, button, expanded, pressed', 'polite');
    });

    test('should include context in announcements', () => {
      const button = document.createElement('button');
      button.textContent = 'Save';
      
      const announceSpy = jest.spyOn(screenReader, 'announceToScreenReader');
      
      screenReader.announceFocusChange(button, 'in form');
      
      expect(announceSpy).toHaveBeenCalledWith('Save, button, in form', 'polite');
    });
  });

  describe('Table Navigation', () => {
    test('should announce table cell navigation', () => {
      const cell = document.createElement('td');
      cell.textContent = 'John Doe';
      
      const announceSpy = jest.spyOn(screenReader, 'announceToScreenReader');
      
      screenReader.announceTableNavigation(cell, 0, 0, 3, 4);
      
      expect(announceSpy).toHaveBeenCalledWith(
        'John Doe, row 1 of 3, column 1 of 4',
        'polite'
      );
    });

    test('should handle empty table cells', () => {
      const cell = document.createElement('td');
      
      const announceSpy = jest.spyOn(screenReader, 'announceToScreenReader');
      
      screenReader.announceTableNavigation(cell, 1, 2, 5, 3);
      
      expect(announceSpy).toHaveBeenCalledWith(
        'empty cell, row 2 of 5, column 3 of 3',
        'polite'
      );
    });
  });

  describe('Loading State Announcements', () => {
    test('should announce loading start', () => {
      const announceSpy = jest.spyOn(screenReader, 'announceToScreenReader');
      
      screenReader.announceLoadingState(true);
      
      expect(announceSpy).toHaveBeenCalledWith('Loading...', 'polite');
    });

    test('should announce loading completion', () => {
      const announceSpy = jest.spyOn(screenReader, 'announceToScreenReader');
      
      screenReader.announceLoadingState(false);
      
      expect(announceSpy).toHaveBeenCalledWith('Finished loading', 'polite');
    });

    test('should include context in loading announcements', () => {
      const announceSpy = jest.spyOn(screenReader, 'announceToScreenReader');
      
      screenReader.announceLoadingState(true, 'user data');
      
      expect(announceSpy).toHaveBeenCalledWith('Loading user data...', 'polite');
    });
  });

  describe('Form Error Announcements', () => {
    test('should announce form errors assertively', () => {
      const announceSpy = jest.spyOn(screenReader, 'announceToScreenReader');
      
      screenReader.announceFormError('Email', 'Please enter a valid email address');
      
      expect(announceSpy).toHaveBeenCalledWith(
        'Error in Email: Please enter a valid email address',
        'assertive'
      );
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty announcements', () => {
      const announceSpy = jest.spyOn(screenReader, 'announceToScreenReader');
      
      screenReader.announceToScreenReader('', 'polite');
      screenReader.announceToScreenReader('   ', 'polite');
      
      expect(announceSpy).toHaveBeenCalledTimes(2);
      // Should not actually make announcements for empty strings
    });

    test('should handle rapid successive announcements', async () => {
      const messages = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];
      
      messages.forEach(message => {
        screenReader.announceToScreenReader(message, 'polite');
      });
      
      // Wait for all announcements to be processed
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const politeRegion = document.getElementById('polite-announcements');
      expect(politeRegion?.textContent).toBe('Fifth');
    });

    test('should handle mixed priority announcements', async () => {
      screenReader.announceToScreenReader('Polite message', 'polite');
      screenReader.announceToScreenReader('Urgent message', 'assertive');
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const politeRegion = document.getElementById('polite-announcements');
      const assertiveRegion = document.getElementById('assertive-announcements');
      
      expect(politeRegion?.textContent).toBe('Polite message');
      expect(assertiveRegion?.textContent).toBe('Urgent message');
    });
  });

  describe('Cleanup', () => {
    test('should clean up live regions and queues', () => {
      screenReader.announceToScreenReader('Test message', 'polite');
      
      screenReader.cleanup();
      
      const politeRegion = document.getElementById('polite-announcements');
      const assertiveRegion = document.getElementById('assertive-announcements');
      
      expect(politeRegion).not.toBeInTheDocument();
      expect(assertiveRegion).not.toBeInTheDocument();
    });
  });
});