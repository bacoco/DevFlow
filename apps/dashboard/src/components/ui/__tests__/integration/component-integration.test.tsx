/**
 * Component Integration Tests
 * Tests for component interactions and integration scenarios
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AccessibilityProvider } from '../../../contexts/AccessibilityContext';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { Button } from '../../Button';
import { Modal } from '../../Modal';
import { Input } from '../../Input';
import { Card } from '../../Card';
import { Toast, ToastContainer } from '../../Toast';

// Test providers wrapper
const TestProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AccessibilityProvider>
          {children}
        </AccessibilityProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('Component Integration Tests', () => {
  describe('Modal with Form Components', () => {
    it('integrates modal with form inputs correctly', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      const onClose = jest.fn();

      const ModalForm = () => {
        const [isOpen, setIsOpen] = React.useState(true);
        const [formData, setFormData] = React.useState({ name: '', email: '' });

        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          onSubmit(formData);
          setIsOpen(false);
        };

        return (
          <TestProviders>
            <Modal
              isOpen={isOpen}
              onClose={() => {
                setIsOpen(false);
                onClose();
              }}
              title="User Form"
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setIsOpen(false);
                      onClose();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary">
                    Submit
                  </Button>
                </div>
              </form>
            </Modal>
          </TestProviders>
        );
      };

      render(<ModalForm />);

      // Verify modal is open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('User Form')).toBeInTheDocument();

      // Fill out form
      const nameInput = screen.getByLabelText('Name');
      const emailInput = screen.getByLabelText('Email');

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');

      // Submit form
      const submitButton = screen.getByRole('button', { name: 'Submit' });
      await user.click(submitButton);

      // Verify form submission
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
      });

      // Verify modal closes
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('handles form validation errors correctly', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();

      const ModalFormWithValidation = () => {
        const [isOpen, setIsOpen] = React.useState(true);
        const [formData, setFormData] = React.useState({ name: '', email: '' });
        const [errors, setErrors] = React.useState<Record<string, string>>({});

        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          
          const newErrors: Record<string, string> = {};
          if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
          }
          if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
          } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email is invalid';
          }

          if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
          }

          onSubmit(formData);
          setIsOpen(false);
        };

        return (
          <TestProviders>
            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="User Form">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, name: e.target.value }));
                    if (errors.name) {
                      setErrors(prev => ({ ...prev, name: '' }));
                    }
                  }}
                  error={errors.name}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, email: e.target.value }));
                    if (errors.email) {
                      setErrors(prev => ({ ...prev, email: '' }));
                    }
                  }}
                  error={errors.email}
                  required
                />
                <Button type="submit" variant="primary">
                  Submit
                </Button>
              </form>
            </Modal>
          </TestProviders>
        );
      };

      render(<ModalFormWithValidation />);

      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: 'Submit' });
      await user.click(submitButton);

      // Verify validation errors are shown
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();

      // Fill name but invalid email
      const nameInput = screen.getByLabelText('Name');
      const emailInput = screen.getByLabelText('Email');

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      // Verify email validation error
      expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
      expect(screen.getByText('Email is invalid')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();

      // Fix email and submit
      await user.clear(emailInput);
      await user.type(emailInput, 'john@example.com');
      await user.click(submitButton);

      // Verify successful submission
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
      });
    });
  });

  describe('Card with Interactive Elements', () => {
    it('integrates card with buttons and handles interactions', async () => {
      const user = userEvent.setup();
      const onEdit = jest.fn();
      const onDelete = jest.fn();
      const onToggleFavorite = jest.fn();

      const InteractiveCard = () => {
        const [isFavorite, setIsFavorite] = React.useState(false);

        const handleToggleFavorite = () => {
          setIsFavorite(!isFavorite);
          onToggleFavorite(!isFavorite);
        };

        return (
          <TestProviders>
            <Card variant="elevated" padding="lg">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Project Card</h3>
                  <p className="text-gray-600">This is a sample project description.</p>
                </div>
                
                <div className="flex justify-between items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleFavorite}
                    aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {isFavorite ? '❤️' : '🤍'} Favorite
                  </Button>
                  
                  <div className="space-x-2">
                    <Button variant="secondary" size="sm" onClick={onEdit}>
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={onDelete}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </TestProviders>
        );
      };

      render(<InteractiveCard />);

      // Verify card content
      expect(screen.getByText('Project Card')).toBeInTheDocument();
      expect(screen.getByText('This is a sample project description.')).toBeInTheDocument();

      // Test favorite toggle
      const favoriteButton = screen.getByRole('button', { name: 'Add to favorites' });
      await user.click(favoriteButton);

      expect(onToggleFavorite).toHaveBeenCalledWith(true);
      expect(screen.getByRole('button', { name: 'Remove from favorites' })).toBeInTheDocument();

      // Test edit button
      const editButton = screen.getByRole('button', { name: 'Edit' });
      await user.click(editButton);
      expect(onEdit).toHaveBeenCalled();

      // Test delete button
      const deleteButton = screen.getByRole('button', { name: 'Delete' });
      await user.click(deleteButton);
      expect(onDelete).toHaveBeenCalled();
    });
  });

  describe('Toast Notification Integration', () => {
    it('integrates toast notifications with user actions', async () => {
      const user = userEvent.setup();

      const ToastIntegrationExample = () => {
        const [toasts, setToasts] = React.useState<Array<{
          id: string;
          type: 'success' | 'error' | 'warning' | 'info';
          title: string;
          message: string;
        }>>([]);

        const addToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
          const id = Math.random().toString(36).substr(2, 9);
          setToasts(prev => [...prev, { id, type, title, message }]);
        };

        const removeToast = (id: string) => {
          setToasts(prev => prev.filter(toast => toast.id !== id));
        };

        const handleSuccess = () => {
          addToast('success', 'Success!', 'Operation completed successfully');
        };

        const handleError = () => {
          addToast('error', 'Error!', 'Something went wrong');
        };

        const handleWarning = () => {
          addToast('warning', 'Warning!', 'Please check your input');
        };

        return (
          <TestProviders>
            <div className="space-y-4">
              <div className="space-x-2">
                <Button variant="primary" onClick={handleSuccess}>
                  Success Action
                </Button>
                <Button variant="danger" onClick={handleError}>
                  Error Action
                </Button>
                <Button variant="secondary" onClick={handleWarning}>
                  Warning Action
                </Button>
              </div>

              <ToastContainer position="top-right">
                {toasts.map(toast => (
                  <Toast
                    key={toast.id}
                    type={toast.type}
                    title={toast.title}
                    message={toast.message}
                    onClose={() => removeToast(toast.id)}
                    autoClose={false}
                  />
                ))}
              </ToastContainer>
            </div>
          </TestProviders>
        );
      };

      render(<ToastIntegrationExample />);

      // Test success toast
      const successButton = screen.getByRole('button', { name: 'Success Action' });
      await user.click(successButton);

      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();

      // Test error toast
      const errorButton = screen.getByRole('button', { name: 'Error Action' });
      await user.click(errorButton);

      expect(screen.getByText('Error!')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Test warning toast
      const warningButton = screen.getByRole('button', { name: 'Warning Action' });
      await user.click(warningButton);

      expect(screen.getByText('Warning!')).toBeInTheDocument();
      expect(screen.getByText('Please check your input')).toBeInTheDocument();

      // Test toast dismissal
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      await user.click(closeButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText('Success!')).not.toBeInTheDocument();
      });
    });
  });

  describe('Theme Integration', () => {
    it('integrates components with theme switching', async () => {
      const user = userEvent.setup();

      const ThemeIntegrationExample = () => {
        const [theme, setTheme] = React.useState<'light' | 'dark'>('light');

        return (
          <TestProviders>
            <div className={theme === 'dark' ? 'dark' : ''}>
              <div className="bg-white dark:bg-gray-900 p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Theme Integration Test
                  </h2>
                  <Button
                    variant="secondary"
                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  >
                    Switch to {theme === 'light' ? 'Dark' : 'Light'} Theme
                  </Button>
                </div>

                <Card variant="default" padding="md">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Sample Card
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    This card should adapt to the current theme.
                  </p>
                  <Button variant="primary">
                    Primary Button
                  </Button>
                </Card>

                <Input
                  label="Sample Input"
                  placeholder="Type something..."
                  className="w-full"
                />
              </div>
            </div>
          </TestProviders>
        );
      };

      render(<ThemeIntegrationExample />);

      // Verify initial light theme
      expect(screen.getByText('Theme Integration Test')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Switch to Dark Theme' })).toBeInTheDocument();

      // Switch to dark theme
      const themeButton = screen.getByRole('button', { name: 'Switch to Dark Theme' });
      await user.click(themeButton);

      // Verify theme switched
      expect(screen.getByRole('button', { name: 'Switch to Light Theme' })).toBeInTheDocument();

      // Verify components are still functional
      const primaryButton = screen.getByRole('button', { name: 'Primary Button' });
      expect(primaryButton).toBeInTheDocument();

      const input = screen.getByLabelText('Sample Input');
      await user.type(input, 'test input');
      expect(input).toHaveValue('test input');
    });
  });

  describe('Accessibility Integration', () => {
    it('maintains accessibility across component interactions', async () => {
      const user = userEvent.setup();

      const AccessibilityIntegrationExample = () => {
        const [currentStep, setCurrentStep] = React.useState(1);
        const [formData, setFormData] = React.useState({
          name: '',
          email: '',
          message: '',
        });

        const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 3));
        const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

        return (
          <TestProviders>
            <div role="main" aria-labelledby="form-title">
              <h1 id="form-title">Multi-Step Form</h1>
              
              <div role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={3}>
                Step {currentStep} of 3
              </div>

              {currentStep === 1 && (
                <Card variant="default" padding="lg" role="region" aria-labelledby="step1-title">
                  <h2 id="step1-title">Personal Information</h2>
                  <div className="space-y-4">
                    <Input
                      label="Full Name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                      aria-describedby="name-help"
                    />
                    <div id="name-help" className="text-sm text-gray-600">
                      Enter your full legal name
                    </div>
                    
                    <Input
                      label="Email Address"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                </Card>
              )}

              {currentStep === 2 && (
                <Card variant="default" padding="lg" role="region" aria-labelledby="step2-title">
                  <h2 id="step2-title">Additional Information</h2>
                  <Input
                    label="Message"
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    multiline
                    rows={4}
                  />
                </Card>
              )}

              {currentStep === 3 && (
                <Card variant="default" padding="lg" role="region" aria-labelledby="step3-title">
                  <h2 id="step3-title">Review Your Information</h2>
                  <dl>
                    <dt>Name:</dt>
                    <dd>{formData.name}</dd>
                    <dt>Email:</dt>
                    <dd>{formData.email}</dd>
                    <dt>Message:</dt>
                    <dd>{formData.message}</dd>
                  </dl>
                </Card>
              )}

              <div className="flex justify-between mt-6">
                <Button
                  variant="secondary"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  Previous
                </Button>
                
                {currentStep < 3 ? (
                  <Button variant="primary" onClick={nextStep}>
                    Next
                  </Button>
                ) : (
                  <Button variant="primary">
                    Submit
                  </Button>
                )}
              </div>
            </div>
          </TestProviders>
        );
      };

      render(<AccessibilityIntegrationExample />);

      // Verify initial accessibility structure
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();

      // Navigate through steps
      const nextButton = screen.getByRole('button', { name: 'Next' });
      await user.click(nextButton);

      // Verify step 2 accessibility
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
      expect(screen.getByLabelText('Message')).toBeInTheDocument();

      // Continue to step 3
      await user.click(screen.getByRole('button', { name: 'Next' }));

      // Verify step 3 accessibility
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
      expect(screen.getByText('Review Your Information')).toBeInTheDocument();

      // Test navigation back
      const prevButton = screen.getByRole('button', { name: 'Previous' });
      await user.click(prevButton);

      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
    });
  });
});