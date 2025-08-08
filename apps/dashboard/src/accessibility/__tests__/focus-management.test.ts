/**
 * Focus Management Tests
 * Tests for focus trapping, restoration, and keyboard navigation
 */

import { FocusManager } from '../focus-management';

describe('FocusManager', () => {
  let focusManager: FocusManager;
  let container: HTMLElement;

  beforeEach(() => {
    focusManager = FocusManager.getInstance();
    
    // Create test container with focusable elements
    container = document.createElement('div');
    container.innerHTML = `
      <button id="btn1">Button 1</button>
      <input id="input1" type="text" />
      <button id="btn2">Button 2</button>
      <button id="btn3" disabled>Disabled Button</button>
      <a id="link1" href="#">Link 1</a>
      <div id="div1" tabindex="0">Focusable Div</div>
      <button id="btn4" style="display: none;">Hidden Button</button>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('Focus Management', () => {
    test('should focus element with basic options', () => {
      const button = document.getElementById('btn1') as HTMLElement;
      
      focusManager.manageFocus(button);
      
      expect(document.activeElement).toBe(button);
    });

    test('should focus element without scrolling when preventScroll is true', () => {
      const button = document.getElementById('btn1') as HTMLElement;
      const scrollIntoViewSpy = jest.spyOn(button, 'focus');
      
      focusManager.manageFocus(button, { preventScroll: true });
      
      expect(scrollIntoViewSpy).toHaveBeenCalledWith({ preventScroll: true });
    });

    test('should store focus history for restoration', () => {
      const button1 = document.getElementById('btn1') as HTMLElement;
      const button2 = document.getElementById('btn2') as HTMLElement;
      
      button1.focus();
      focusManager.manageFocus(button2, { restoreOnUnmount: true });
      
      expect(document.activeElement).toBe(button2);
      
      focusManager.restoreFocus();
      expect(document.activeElement).toBe(button1);
    });
  });

  describe('Focus Trap', () => {
    test('should create and activate focus trap', () => {
      const trap = focusManager.createFocusTrap(container);
      
      trap.activate();
      
      // First focusable element should be focused
      expect(document.activeElement).toBe(document.getElementById('btn1'));
    });

    test('should trap tab navigation within container', () => {
      const trap = focusManager.createFocusTrap(container);
      trap.activate();

      const button1 = document.getElementById('btn1') as HTMLElement;
      const link1 = document.getElementById('link1') as HTMLElement;
      
      // Tab from last focusable element should go to first
      link1.focus();
      
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true
      });
      
      document.dispatchEvent(tabEvent);
      
      // Should cycle back to first element
      expect(document.activeElement).toBe(button1);
    });

    test('should handle shift+tab navigation', () => {
      const trap = focusManager.createFocusTrap(container);
      trap.activate();

      const button1 = document.getElementById('btn1') as HTMLElement;
      const div1 = document.getElementById('div1') as HTMLElement;
      
      button1.focus();
      
      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true
      });
      
      document.dispatchEvent(shiftTabEvent);
      
      // Should go to last focusable element
      expect(document.activeElement).toBe(div1);
    });

    test('should pause and unpause focus trap', () => {
      const trap = focusManager.createFocusTrap(container);
      trap.activate();
      trap.pause();

      const button1 = document.getElementById('btn1') as HTMLElement;
      button1.focus();
      
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true
      });
      
      document.dispatchEvent(tabEvent);
      
      // Tab should work normally when paused
      expect(document.activeElement).not.toBe(button1);
      
      trap.unpause();
      // Focus trap should work again after unpause
    });

    test('should deactivate focus trap', () => {
      const trap = focusManager.createFocusTrap(container);
      trap.activate();
      trap.deactivate();

      const button1 = document.getElementById('btn1') as HTMLElement;
      button1.focus();
      
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true
      });
      
      document.dispatchEvent(tabEvent);
      
      // Tab should work normally after deactivation
      expect(document.activeElement).not.toBe(button1);
    });
  });

  describe('Tab Order Management', () => {
    test('should set logical tab order', () => {
      const elements = [
        document.getElementById('btn2') as HTMLElement,
        document.getElementById('btn1') as HTMLElement,
        document.getElementById('input1') as HTMLElement
      ];
      
      focusManager.setTabOrder(elements);
      
      expect(elements[0].tabIndex).toBe(0);
      expect(elements[1].tabIndex).toBe(1);
      expect(elements[2].tabIndex).toBe(2);
    });
  });

  describe('Arrow Key Navigation', () => {
    test('should handle horizontal arrow navigation', () => {
      const button1 = document.getElementById('btn1') as HTMLElement;
      const input1 = document.getElementById('input1') as HTMLElement;
      
      button1.focus();
      
      const rightArrowEvent = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true
      });
      
      focusManager.handleArrowNavigation(rightArrowEvent, container, 'horizontal');
      
      expect(document.activeElement).toBe(input1);
    });

    test('should handle vertical arrow navigation', () => {
      const button1 = document.getElementById('btn1') as HTMLElement;
      const input1 = document.getElementById('input1') as HTMLElement;
      
      button1.focus();
      
      const downArrowEvent = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true
      });
      
      focusManager.handleArrowNavigation(downArrowEvent, container, 'vertical');
      
      expect(document.activeElement).toBe(input1);
    });

    test('should handle Home and End keys', () => {
      const input1 = document.getElementById('input1') as HTMLElement;
      const button1 = document.getElementById('btn1') as HTMLElement;
      const div1 = document.getElementById('div1') as HTMLElement;
      
      input1.focus();
      
      const homeEvent = new KeyboardEvent('keydown', {
        key: 'Home',
        bubbles: true
      });
      
      focusManager.handleArrowNavigation(homeEvent, container);
      expect(document.activeElement).toBe(button1);
      
      const endEvent = new KeyboardEvent('keydown', {
        key: 'End',
        bubbles: true
      });
      
      focusManager.handleArrowNavigation(endEvent, container);
      expect(document.activeElement).toBe(div1);
    });

    test('should skip disabled and hidden elements', () => {
      const button2 = document.getElementById('btn2') as HTMLElement;
      const link1 = document.getElementById('link1') as HTMLElement;
      
      button2.focus();
      
      const rightArrowEvent = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true
      });
      
      focusManager.handleArrowNavigation(rightArrowEvent, container);
      
      // Should skip disabled button and hidden button, go to link
      expect(document.activeElement).toBe(link1);
    });

    test('should wrap around when reaching boundaries', () => {
      const div1 = document.getElementById('div1') as HTMLElement;
      const button1 = document.getElementById('btn1') as HTMLElement;
      
      div1.focus();
      
      const rightArrowEvent = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true
      });
      
      focusManager.handleArrowNavigation(rightArrowEvent, container);
      
      // Should wrap to first element
      expect(document.activeElement).toBe(button1);
    });
  });

  describe('Visibility Detection', () => {
    test('should detect visible elements correctly', () => {
      const visibleButton = document.getElementById('btn1') as HTMLElement;
      const hiddenButton = document.getElementById('btn4') as HTMLElement;
      
      // Use private method through type assertion for testing
      const isVisible = (focusManager as any).isVisible;
      
      expect(isVisible(visibleButton)).toBe(true);
      expect(isVisible(hiddenButton)).toBe(false);
    });

    test('should handle elements with zero dimensions', () => {
      const zeroSizeElement = document.createElement('div');
      zeroSizeElement.style.width = '0px';
      zeroSizeElement.style.height = '0px';
      container.appendChild(zeroSizeElement);
      
      const isVisible = (focusManager as any).isVisible;
      expect(isVisible(zeroSizeElement)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty containers', () => {
      const emptyContainer = document.createElement('div');
      document.body.appendChild(emptyContainer);
      
      const trap = focusManager.createFocusTrap(emptyContainer);
      
      expect(() => trap.activate()).not.toThrow();
      
      document.body.removeChild(emptyContainer);
    });

    test('should handle containers with only disabled elements', () => {
      const disabledContainer = document.createElement('div');
      disabledContainer.innerHTML = `
        <button disabled>Disabled 1</button>
        <input disabled />
        <button disabled>Disabled 2</button>
      `;
      document.body.appendChild(disabledContainer);
      
      const trap = focusManager.createFocusTrap(disabledContainer);
      
      expect(() => trap.activate()).not.toThrow();
      
      document.body.removeChild(disabledContainer);
    });

    test('should handle focus restoration when element is removed', () => {
      const tempButton = document.createElement('button');
      tempButton.textContent = 'Temp Button';
      container.appendChild(tempButton);
      
      tempButton.focus();
      
      const button1 = document.getElementById('btn1') as HTMLElement;
      focusManager.manageFocus(button1, { restoreOnUnmount: true });
      
      // Remove the original focused element
      container.removeChild(tempButton);
      
      // Should not throw when trying to restore focus
      expect(() => focusManager.restoreFocus()).not.toThrow();
    });
  });
});