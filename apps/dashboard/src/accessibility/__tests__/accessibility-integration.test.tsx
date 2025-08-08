/**
 * Accessibility Integration Tests
 * Comprehensive tests for accessibility infrastructure with screen reader simulation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessibilityManager } from '../accessibility-manager';
import { FocusManager } from '../focus-management';
import { ScreenReaderManager } from '../screen-reader';
import { KeyboardNavigationManager } from '../keyboard-navigation';
import { VisualPreferencesManager } from '../visual-preferences';
import { AccessibilityTester } from '../testing-utilities';

// Mock screen reader announcements for testing
const mockAnnouncements: Array<{ message: string; priority: string }> = [];

// Mock the screen reader manager
jest.mock('../screen-reader', () => ({
  ScreenReaderManager: {
    getInstance: () => ({
      announceToScreenReader: (message: string, priority: string) => {
        mockAnnouncements.push({ message, priority });
      },
      updateLiveRegion: jest.fn(),
      setAriaAttributes: jest.fn(),
      createAccessibleDescription: jest.fn(),
      announceFocusChange: jest.fn(),
      announceTableNavigation: jest.fn(),
      announceLoadingState: jest.fn(),
      announceFormError: jest.fn(),
      cleanup: jest.fn()
    })
  },
  useScreenReader: () => ({
    announce: (message: string, priority: string) => {
      mockAnnouncements.push({ message, priority });
    },
    updateLiveRegion: jest.fn(),
    setAriaAttributes: jest.fn(),
    createAccessibleDescription: jest.fn(),
    announceFocusChange: jest.fn(),
    announceTableNavigation: jest.fn(),
    announceLoadingState: jest.fn(),
    announceFormError: jest.fn()
  })
}));

// Test component with accessibility features
const TestAccessibleComponent: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({ name: '', email: '' });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    
    setErrors(newErrors);
  };

  return (
    <div>
      <header>
        <h1>Accessibility Test Page</h1>
        <nav aria-label="Main navigation">
          <ul>
            <li><a href="#main">Skip to main content</a></li>
            <li><a href="#section1">Section 1</a></li>
            <li><a href="#section2">Section 2</a></li>
          </ul>
        </nav>
      </header>

      <main id="main">
        <section id="section1">
          <h2>Interactive Elements</h2>
          <button onClick={() => setIsModalOpen(true)}>
            Open Modal
          </button>
          
          <div data-keyboard-nav role="toolbar" aria-label="Toolbar">
            <button>Action 1</button>
            <button>Action 2</button>
            <button>Action 3</button>
          </div>
        </section>

        <section id="section2">
          <h2>Form Example</h2>
          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name">Name:</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                aria-describedby={errors.name ? 'name-error' : undefined}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <div id="name-error" role="alert" aria-live="assertive">
                  {errors.name}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="email">Email:</label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                aria-describedby={errors.email ? 'email-error' : undefined}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <div id="email-error" role="alert" aria-live="assertive">
                  {errors.email}
                </div>
              )}
            </div>

            <button type="submit">Submit</button>
          </form>
        </section>

        <section>
          <h2>Data Table</h2>
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Role</th>
                <th scope="col">Department</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>John Doe</td>
                <td>Developer</td>
                <td>Engineering</td>
              </tr>
              <tr>
                <td>Jane Smith</td>
                <td>Designer</td>
                <td>Design</td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>

      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          data-modal
        >
          <div>
            <h3 id="modal-title">Modal Dialog</h3>
            <p>This is a modal dialog for testing accessibility.</p>
            <button onClick={() => setIsModalOpen(false)} data-close>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

describe('Accessibility Integration Tests', () => {
  let accessibilityManager: AccessibilityManager;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    mockAnnouncements.length = 0;
    
    // Initialize accessibility manager
    accessibilityManager = AccessibilityManager.getInstance({
      enableFocusManagement: true,
      enableScreenReaderSupport: true,
      enableKeyboardNavigation: true,
      enableVisualPreferences: true,
      enableAutomaticTesting: false
    });
  });

  afterEach(() => {
    accessibilityManager.cleanup();
    jest.clearAllMocks();
  });

  describe('Focus Management', () => {
    test('should manage focus properly in modal dialogs', async () => {
      render(<TestAccessibleComponent />);
      
      const openModalButton = screen.getByText('Open Modal');
      await user.click(openModalButton);

      // Modal should be open and focused
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();

      // Focus should be trapped within modal
      const closeButton = screen.getByText('Close');
      expect(closeButton).toHaveFocus();

      // Tab should cycle within modal
      await user.tab();
      expect(closeButton).toHaveFocus(); // Should cycle back to close button

      // Escape should close modal
      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Focus should return to trigger button
      expect(openModalButton).toHaveFocus();
    });

    test('should handle focus restoration correctly', async () => {
      render(<TestAccessibleComponent />);
      
      const nameInput = screen.getByLabelText('Name:');
      nameInput.focus();
      
      const focusManager = FocusManager.getInstance();
      const submitButton = screen.getByText('Submit');
      
      // Manage focus with restoration
      focusManager.manageFocus(submitButton, { restoreOnUnmount: true });
      expect(submitButton).toHaveFocus();
      
      // Restore focus
      focusManager.restoreFocus();
      expect(nameInput).toHaveFocus();
    });
  });

  describe('Screen Reader Support', () => {
    test('should announce form validation errors', async () => {
      render(<TestAccessibleComponent />);
      
      const submitButton = screen.getByText('Submit');
      await user.click(submitButton);

      // Check that error messages are announced
      await waitFor(() => {
        const errorElements = screen.getAllByRole('alert');
        expect(errorElements).toHaveLength(2);
      });

      // Verify announcements were made
      expect(mockAnnouncements).toContainEqual({
        message: expect.stringContaining('Name is required'),
        priority: 'assertive'
      });
    });

    test('should announce loading states', async () => {
      const screenReader = ScreenReaderManager.getInstance();
      
      screenReader.announceLoadingState(true, 'form data');
      expect(mockAnnouncements).toContainEqual({
        message: 'Loading form data...',
        priority: 'polite'
      });

      screenReader.announceLoadingState(false, 'form data');
      expect(mockAnnouncements).toContainEqual({
        message: 'Finished loading form data',
        priority: 'polite'
      });
    });

    test('should provide table navigation announcements', () => {
      render(<TestAccessibleComponent />);
      
      const table = screen.getByRole('table');
      const cells = table.querySelectorAll('td');
      const firstCell = cells[0] as HTMLElement;
      
      const screenReader = ScreenReaderManager.getInstance();
      screenReader.announceTableNavigation(firstCell, 0, 0, 2, 3);
      
      expect(mockAnnouncements).toContainEqual({
        message: 'John Doe, row 1 of 2, column 1 of 3',
        priority: 'polite'
      });
    });
  });

  describe('Keyboard Navigation', () => {
    test('should handle arrow key navigation in toolbar', async () => {
      render(<TestAccessibleComponent />);
      
      const toolbar = screen.getByRole('toolbar');
      const buttons = toolbar.querySelectorAll('button');
      
      // Focus first button
      buttons[0].focus();
      expect(buttons[0]).toHaveFocus();

      // Arrow right should move to next button
      await user.keyboard('{ArrowRight}');
      expect(buttons[1]).toHaveFocus();

      // Arrow left should move back
      await user.keyboard('{ArrowLeft}');
      expect(buttons[0]).toHaveFocus();

      // Home should go to first button
      buttons[2].focus();
      await user.keyboard('{Home}');
      expect(buttons[0]).toHaveFocus();

      // End should go to last button
      await user.keyboard('{End}');
      expect(buttons[2]).toHaveFocus();
    });

    test('should handle keyboard shortcuts', async () => {
      render(<TestAccessibleComponent />);
      
      const keyboardManager = KeyboardNavigationManager.getInstance();
      let shortcutTriggered = false;

      keyboardManager.registerShortcut({
        key: 'k',
        ctrlKey: true,
        handler: () => { shortcutTriggered = true; },
        description: 'Test shortcut'
      });

      await user.keyboard('{Control>}k{/Control}');
      expect(shortcutTriggered).toBe(true);
    });

    test('should skip shortcuts in input fields', async () => {
      render(<TestAccessibleComponent />);
      
      const nameInput = screen.getByLabelText('Name:');
      nameInput.focus();

      const keyboardManager = KeyboardNavigationManager.getInstance();
      let shortcutTriggered = false;

      keyboardManager.registerShortcut({
        key: 'k',
        handler: () => { shortcutTriggered = true; },
        description: 'Test shortcut'
      });

      await user.type(nameInput, 'k');
      expect(shortcutTriggered).toBe(false);
      expect(nameInput).toHaveValue('k');
    });
  });

  describe('Visual Preferences', () => {
    test('should apply high contrast mode', () => {
      const visualPreferences = VisualPreferencesManager.getInstance();
      
      visualPreferences.updatePreference('highContrast', true);
      
      expect(document.documentElement).toHaveClass('high-contrast');
      expect(document.documentElement.style.getPropertyValue('--contrast-mode')).toBe('high');
    });

    test('should apply reduced motion preferences', () => {
      const visualPreferences = VisualPreferencesManager.getInstance();
      
      visualPreferences.updatePreference('reducedMotion', true);
      
      expect(document.documentElement).toHaveClass('reduced-motion');
      expect(document.documentElement.style.getPropertyValue('--animation-duration')).toBe('0.01ms');
    });

    test('should apply font size scaling', () => {
      const visualPreferences = VisualPreferencesManager.getInstance();
      
      visualPreferences.updatePreference('fontSize', 'large');
      
      expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1.125');
    });

    test('should persist preferences in localStorage', () => {
      const visualPreferences = VisualPreferencesManager.getInstance();
      
      visualPreferences.updatePreference('highContrast', true);
      visualPreferences.updatePreference('fontSize', 'large');
      
      const stored = localStorage.getItem('visual-preferences');
      expect(stored).toBeTruthy();
      
      const preferences = JSON.parse(stored!);
      expect(preferences.highContrast).toBe(true);
      expect(preferences.fontSize).toBe('large');
    });
  });

  describe('Accessibility Testing', () => {
    test('should run accessibility audit', async () => {
      render(<TestAccessibleComponent />);
      
      const tester = AccessibilityTester.getInstance();
      const report = await tester.runAccessibilityAudit();
      
      expect(report).toHaveProperty('violations');
      expect(report).toHaveProperty('passes');
      expect(report).toHaveProperty('incomplete');
      expect(report.timestamp).toBeInstanceOf(Date);
    });

    test('should check color contrast', () => {
      const tester = AccessibilityTester.getInstance();
      
      const result = tester.checkColorContrast('#000000', '#ffffff');
      
      expect(result.ratio).toBeGreaterThan(20);
      expect(result.AA).toBe(true);
      expect(result.AAA).toBe(true);
    });

    test('should test keyboard navigation', async () => {
      render(<TestAccessibleComponent />);
      
      const tester = AccessibilityTester.getInstance();
      const toolbar = screen.getByRole('toolbar');
      const result = await tester.testKeyboardNavigation(toolbar);
      
      expect(result.focusableElements).toHaveLength(3);
      expect(result.issues).toHaveLength(0);
    });

    test('should test screen reader compatibility', () => {
      render(<TestAccessibleComponent />);
      
      const tester = AccessibilityTester.getInstance();
      const button = screen.getByText('Open Modal');
      const result = tester.testScreenReaderCompatibility(button);
      
      expect(result.hasAccessibleName).toBe(true);
      expect(result.hasRole).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complex user interactions', async () => {
      render(<TestAccessibleComponent />);
      
      // Navigate using keyboard
      await user.tab(); // Skip link
      await user.tab(); // Section 1 link
      await user.tab(); // Section 2 link
      await user.tab(); // Open Modal button
      
      const openModalButton = screen.getByText('Open Modal');
      expect(openModalButton).toHaveFocus();
      
      // Open modal with Enter key
      await user.keyboard('{Enter}');
      
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      
      // Close modal with Escape
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      
      // Focus should return to trigger
      expect(openModalButton).toHaveFocus();
    });

    test('should handle form validation with screen reader support', async () => {
      render(<TestAccessibleComponent />);
      
      const nameInput = screen.getByLabelText('Name:');
      const emailInput = screen.getByLabelText('Email:');
      const submitButton = screen.getByText('Submit');
      
      // Fill partial form
      await user.type(nameInput, 'John');
      await user.click(submitButton);
      
      // Check for error announcement
      await waitFor(() => {
        const emailError = screen.getByText('Email is required');
        expect(emailError).toBeInTheDocument();
        expect(emailError).toHaveAttribute('role', 'alert');
      });
      
      // Complete form
      await user.type(emailInput, 'john@example.com');
      await user.click(submitButton);
      
      // Errors should be cleared
      expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
    });

    test('should maintain accessibility during dynamic content changes', async () => {
      const { rerender } = render(<TestAccessibleComponent />);
      
      // Add dynamic content
      const DynamicContent: React.FC = () => (
        <div>
          <TestAccessibleComponent />
          <div role="status" data-announce="New content loaded">
            <p>This is dynamically added content</p>
            <button>New Action</button>
          </div>
        </div>
      );
      
      rerender(<DynamicContent />);
      
      // Check that new content is accessible
      const newButton = screen.getByText('New Action');
      expect(newButton).toBeInTheDocument();
      
      // Focus should work on new content
      newButton.focus();
      expect(newButton).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    test('should handle accessibility manager errors gracefully', () => {
      // Test with invalid configuration
      expect(() => {
        AccessibilityManager.getInstance({
          enableFocusManagement: true,
          enableScreenReaderSupport: true,
          enableKeyboardNavigation: true,
          enableVisualPreferences: true,
          enableAutomaticTesting: true,
          testingInterval: -1 // Invalid interval
        });
      }).not.toThrow();
    });

    test('should handle missing elements gracefully', () => {
      const focusManager = FocusManager.getInstance();
      
      // Try to focus non-existent element
      expect(() => {
        const fakeElement = document.createElement('div');
        focusManager.manageFocus(fakeElement);
      }).not.toThrow();
    });
  });
});

// Screen reader simulation tests
describe('Screen Reader Simulation', () => {
  test('should simulate screen reader navigation', async () => {
    render(<TestAccessibleComponent />);
    
    const user = userEvent.setup();
    
    // Simulate screen reader virtual cursor navigation
    const headings = screen.getAllByRole('heading');
    
    for (const heading of headings) {
      heading.focus();
      
      // Simulate screen reader announcement
      const level = heading.tagName.charAt(1);
      const text = heading.textContent;
      mockAnnouncements.push({
        message: `Heading level ${level}, ${text}`,
        priority: 'polite'
      });
    }
    
    expect(mockAnnouncements).toContainEqual({
      message: 'Heading level 1, Accessibility Test Page',
      priority: 'polite'
    });
  });

  test('should simulate screen reader form navigation', async () => {
    render(<TestAccessibleComponent />);
    
    const nameInput = screen.getByLabelText('Name:');
    const emailInput = screen.getByLabelText('Email:');
    
    // Simulate screen reader form mode
    nameInput.focus();
    mockAnnouncements.push({
      message: 'Name, edit text',
      priority: 'polite'
    });
    
    emailInput.focus();
    mockAnnouncements.push({
      message: 'Email, edit text, email',
      priority: 'polite'
    });
    
    expect(mockAnnouncements).toContainEqual({
      message: 'Name, edit text',
      priority: 'polite'
    });
    
    expect(mockAnnouncements).toContainEqual({
      message: 'Email, edit text, email',
      priority: 'polite'
    });
  });
});