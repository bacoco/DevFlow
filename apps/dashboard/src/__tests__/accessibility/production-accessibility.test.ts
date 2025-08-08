/**
 * Production Accessibility Test Suite
 * Comprehensive WCAG 2.1 AA compliance testing
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { getAccessibilityAuditor, testKeyboardNavigation, testColorContrast } from '../../utils/accessibility-audit';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock components for testing
import { Dashboard } from '../../components/Dashboard/Dashboard';
import { TaskBoard } from '../../components/TaskManager/TaskBoard';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Navigation } from '../../components/Layout/Navigation';

describe('Production Accessibility Tests', () => {
  describe('WCAG 2.1 AA Compliance', () => {
    it('should have no accessibility violations in Dashboard', async () => {
      const { container } = render(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in TaskBoard', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', status: 'todo', priority: 'high' },
        { id: '2', title: 'Task 2', status: 'in-progress', priority: 'medium' },
        { id: '3', title: 'Task 3', status: 'done', priority: 'low' },
      ];
      
      const { container } = render(<TaskBoard tasks={mockTasks} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('task-board')).toBeInTheDocument();
      });
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in Modal', async () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}}>
          <h2>Test Modal</h2>
          <p>This is a test modal content.</p>
          <Button onClick={() => {}}>Close</Button>
        </Modal>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in Navigation', async () => {
      const mockUser = { name: 'Test User', avatar: '/avatar.jpg' };
      const mockItems = [
        { id: '1', label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
        { id: '2', label: 'Tasks', href: '/tasks', icon: 'tasks' },
        { id: '3', label: 'Analytics', href: '/analytics', icon: 'analytics' },
      ];
      
      const { container } = render(
        <Navigation items={mockItems} user={mockUser} />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support full keyboard navigation in Dashboard', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
      
      const dashboard = screen.getByTestId('dashboard');
      const isNavigable = await testKeyboardNavigation(dashboard);
      
      expect(isNavigable).toBe(true);
    });

    it('should support tab navigation through form elements', async () => {
      const TestForm = () => (
        <form data-testid="test-form">
          <Input label="First Name" data-testid="first-name" />
          <Input label="Last Name" data-testid="last-name" />
          <Input label="Email" type="email" data-testid="email" />
          <Button type="submit" data-testid="submit">Submit</Button>
        </form>
      );
      
      render(<TestForm />);
      
      const user = userEvent.setup();
      
      // Tab through form elements
      await user.tab();
      expect(screen.getByTestId('first-name')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByTestId('last-name')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByTestId('email')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByTestId('submit')).toHaveFocus();
    });

    it('should support arrow key navigation in TaskBoard', async () => {
      const mockTasks = Array.from({ length: 9 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        status: 'todo',
        priority: 'medium',
      }));
      
      render(<TaskBoard tasks={mockTasks} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('task-board')).toBeInTheDocument();
      });
      
      const user = userEvent.setup();
      const firstTask = screen.getByTestId('task-task-0');
      
      // Focus first task
      firstTask.focus();
      expect(firstTask).toHaveFocus();
      
      // Navigate with arrow keys
      await user.keyboard('{ArrowDown}');
      expect(screen.getByTestId('task-task-1')).toHaveFocus();
      
      await user.keyboard('{ArrowRight}');
      expect(screen.getByTestId('task-task-2')).toHaveFocus();
      
      await user.keyboard('{ArrowUp}');
      expect(screen.getByTestId('task-task-0')).toHaveFocus();
    });

    it('should trap focus in Modal', async () => {
      const TestModal = () => (
        <Modal isOpen={true} onClose={() => {}} data-testid="test-modal">
          <h2>Modal Title</h2>
          <Input label="Input 1" data-testid="input-1" />
          <Input label="Input 2" data-testid="input-2" />
          <Button data-testid="close-button">Close</Button>
        </Modal>
      );
      
      render(<TestModal />);
      
      const user = userEvent.setup();
      
      // Focus should start on first focusable element
      await waitFor(() => {
        expect(screen.getByTestId('input-1')).toHaveFocus();
      });
      
      // Tab through modal elements
      await user.tab();
      expect(screen.getByTestId('input-2')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByTestId('close-button')).toHaveFocus();
      
      // Tab should wrap back to first element
      await user.tab();
      expect(screen.getByTestId('input-1')).toHaveFocus();
      
      // Shift+Tab should go backwards
      await user.tab({ shift: true });
      expect(screen.getByTestId('close-button')).toHaveFocus();
    });

    it('should handle Escape key to close Modal', async () => {
      const mockOnClose = jest.fn();
      
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <h2>Test Modal</h2>
          <Button>Test Button</Button>
        </Modal>
      );
      
      const user = userEvent.setup();
      
      await user.keyboard('{Escape}');
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper ARIA labels and descriptions', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
      
      // Check for ARIA landmarks
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      
      // Check for ARIA labels
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
      
      // Check for ARIA descriptions
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).toHaveAttribute('aria-describedby');
      });
    });

    it('should announce dynamic content changes', async () => {
      const TestComponent = () => {
        const [message, setMessage] = React.useState('');
        
        return (
          <div>
            <Button 
              onClick={() => setMessage('Content updated!')}
              data-testid="update-button"
            >
              Update Content
            </Button>
            <div 
              role="status" 
              aria-live="polite" 
              data-testid="live-region"
            >
              {message}
            </div>
          </div>
        );
      };
      
      render(<TestComponent />);
      
      const button = screen.getByTestId('update-button');
      const liveRegion = screen.getByTestId('live-region');
      
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveTextContent('');
      
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(liveRegion).toHaveTextContent('Content updated!');
      });
    });

    it('should provide proper form validation feedback', async () => {
      const TestForm = () => {
        const [error, setError] = React.useState('');
        
        return (
          <form>
            <Input
              label="Email"
              type="email"
              error={error}
              data-testid="email-input"
              aria-describedby="email-error"
            />
            <div id="email-error" role="alert" data-testid="error-message">
              {error}
            </div>
            <Button 
              onClick={() => setError('Please enter a valid email')}
              data-testid="validate-button"
            >
              Validate
            </Button>
          </form>
        );
      };
      
      render(<TestForm />);
      
      const input = screen.getByTestId('email-input');
      const errorMessage = screen.getByTestId('error-message');
      const button = screen.getByTestId('validate-button');
      
      expect(input).toHaveAttribute('aria-describedby', 'email-error');
      expect(errorMessage).toHaveAttribute('role', 'alert');
      
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(errorMessage).toHaveTextContent('Please enter a valid email');
        expect(input).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });

  describe('Color Contrast', () => {
    it('should meet WCAG AA color contrast requirements', async () => {
      const { container } = render(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
      
      const contrastResults = testColorContrast(container);
      
      // All text should pass contrast requirements
      const failedElements = contrastResults.filter(result => !result.passes);
      
      if (failedElements.length > 0) {
        console.warn('Elements with insufficient contrast:', failedElements);
      }
      
      expect(failedElements.length).toBe(0);
    });

    it('should maintain contrast in dark theme', async () => {
      const { container } = render(
        <div data-theme="dark">
          <Dashboard />
        </div>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
      
      const contrastResults = testColorContrast(container);
      const failedElements = contrastResults.filter(result => !result.passes);
      
      expect(failedElements.length).toBe(0);
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicators', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
      
      const user = userEvent.setup();
      
      // Tab to first focusable element
      await user.tab();
      
      const focusedElement = document.activeElement;
      expect(focusedElement).toBeTruthy();
      
      // Check for focus indicator styles
      const computedStyle = window.getComputedStyle(focusedElement!);
      const hasOutline = computedStyle.outline !== 'none' && computedStyle.outline !== '';
      const hasBoxShadow = computedStyle.boxShadow !== 'none' && computedStyle.boxShadow !== '';
      
      expect(hasOutline || hasBoxShadow).toBe(true);
    });

    it('should restore focus after modal closes', async () => {
      const TestComponent = () => {
        const [isModalOpen, setIsModalOpen] = React.useState(false);
        
        return (
          <div>
            <Button 
              onClick={() => setIsModalOpen(true)}
              data-testid="open-modal"
            >
              Open Modal
            </Button>
            <Modal 
              isOpen={isModalOpen} 
              onClose={() => setIsModalOpen(false)}
            >
              <h2>Test Modal</h2>
              <Button 
                onClick={() => setIsModalOpen(false)}
                data-testid="close-modal"
              >
                Close
              </Button>
            </Modal>
          </div>
        );
      };
      
      render(<TestComponent />);
      
      const openButton = screen.getByTestId('open-modal');
      
      // Focus and click the open button
      openButton.focus();
      expect(openButton).toHaveFocus();
      
      fireEvent.click(openButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('close-modal')).toBeInTheDocument();
      });
      
      // Close the modal
      const closeButton = screen.getByTestId('close-modal');
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(screen.queryByTestId('close-modal')).not.toBeInTheDocument();
      });
      
      // Focus should return to the open button
      expect(openButton).toHaveFocus();
    });
  });

  describe('Responsive Accessibility', () => {
    it('should maintain accessibility on mobile viewports', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });
      
      const { container } = render(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
      
      // Check for mobile-specific accessibility features
      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveAttribute('aria-label');
      
      // Check for proper touch target sizes
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height);
        expect(size).toBeGreaterThanOrEqual(44); // 44px minimum touch target
      });
    });
  });

  describe('Automated Accessibility Monitoring', () => {
    it('should run continuous accessibility monitoring', async () => {
      const auditor = getAccessibilityAuditor();
      
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
      
      // Start monitoring
      const stopMonitoring = auditor.startContinuousMonitoring(1000);
      
      // Wait for a few monitoring cycles
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const reports = auditor.getReports();
      expect(reports.length).toBeGreaterThan(0);
      
      // Check that all reports have acceptable scores
      reports.forEach(report => {
        expect(report.score).toBeGreaterThan(80);
      });
      
      // Stop monitoring
      stopMonitoring();
    });

    it('should detect and report critical accessibility issues', async () => {
      // Render component with intentional accessibility issues
      const BadComponent = () => (
        <div data-testid="bad-component">
          <button>Button without accessible name</button>
          <img src="test.jpg" alt="" />
          <input type="text" />
          <div style={{ color: '#ccc', backgroundColor: '#ddd' }}>
            Low contrast text
          </div>
        </div>
      );
      
      render(<BadComponent />);
      
      const auditor = getAccessibilityAuditor();
      const report = await auditor.runAudit();
      
      expect(report.violations.length).toBeGreaterThan(0);
      
      const criticalIssues = auditor.getCriticalIssues();
      expect(criticalIssues.length).toBeGreaterThan(0);
    });
  });
});