import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingWizard } from '../OnboardingWizard';
import { OnboardingData } from '../../../types/onboarding';

// Mock the step components
jest.mock('../steps/WelcomeStep', () => ({
  WelcomeStep: ({ onNext, onComplete }: any) => (
    <div data-testid="welcome-step">
      <button onClick={() => { onComplete({}); onNext(); }}>Get Started</button>
    </div>
  ),
}));

jest.mock('../steps/RoleSelectionStep', () => ({
  RoleSelectionStep: ({ onNext, onComplete }: any) => (
    <div data-testid="role-step">
      <button onClick={() => { onComplete({ role: 'developer', experience: 'intermediate' }); onNext(); }}>
        Continue
      </button>
    </div>
  ),
}));

jest.mock('../steps/PrivacySettingsStep', () => ({
  PrivacySettingsStep: ({ onNext, onComplete }: any) => (
    <div data-testid="privacy-step">
      <button onClick={() => { onComplete({ ideTelemetry: true, gitActivity: true }); onNext(); }}>
        Continue
      </button>
    </div>
  ),
}));

jest.mock('../steps/DashboardSetupStep', () => ({
  DashboardSetupStep: ({ onNext, onComplete }: any) => (
    <div data-testid="dashboard-step">
      <button onClick={() => { onComplete({ preferredWidgets: ['metric_card'] }); onNext(); }}>
        Continue
      </button>
    </div>
  ),
}));

jest.mock('../steps/NotificationPreferencesStep', () => ({
  NotificationPreferencesStep: ({ onNext, onComplete }: any) => (
    <div data-testid="notifications-step">
      <button onClick={() => { onComplete({ inApp: true }); onNext(); }}>
        Continue
      </button>
    </div>
  ),
}));

jest.mock('../steps/CompletionStep', () => ({
  CompletionStep: () => <div data-testid="completion-step">Completion</div>,
}));

describe('OnboardingWizard', () => {
  const mockOnComplete = jest.fn();
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(
      <OnboardingWizard
        isOpen={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    expect(screen.getByText('Welcome to DevFlow Intelligence')).toBeInTheDocument();
    expect(screen.getByTestId('welcome-step')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <OnboardingWizard
        isOpen={false}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    expect(screen.queryByText('Welcome to DevFlow Intelligence')).not.toBeInTheDocument();
  });

  it('progresses through steps correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <OnboardingWizard
        isOpen={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    // Start with welcome step
    expect(screen.getByTestId('welcome-step')).toBeInTheDocument();
    
    // Progress to role selection
    await user.click(screen.getByText('Get Started'));
    expect(screen.getByTestId('role-step')).toBeInTheDocument();
    
    // Progress to privacy settings
    await user.click(screen.getByText('Continue'));
    expect(screen.getByTestId('privacy-step')).toBeInTheDocument();
    
    // Progress to dashboard setup
    await user.click(screen.getByText('Continue'));
    expect(screen.getByTestId('dashboard-step')).toBeInTheDocument();
    
    // Progress to notifications
    await user.click(screen.getByText('Continue'));
    expect(screen.getByTestId('notifications-step')).toBeInTheDocument();
    
    // Progress to completion
    await user.click(screen.getByText('Continue'));
    expect(screen.getByTestId('completion-step')).toBeInTheDocument();
  });

  it('shows progress correctly', () => {
    render(
      <OnboardingWizard
        isOpen={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    expect(screen.getByText('Step 1 of 6')).toBeInTheDocument();
    expect(screen.getByText('17% complete')).toBeInTheDocument();
  });

  it('allows navigation backwards', async () => {
    const user = userEvent.setup();
    
    render(
      <OnboardingWizard
        isOpen={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    // Progress to second step
    await user.click(screen.getByText('Get Started'));
    expect(screen.getByTestId('role-step')).toBeInTheDocument();
    
    // Go back to first step
    await user.click(screen.getByText('Previous'));
    expect(screen.getByTestId('welcome-step')).toBeInTheDocument();
  });

  it('disables previous button on first step', () => {
    render(
      <OnboardingWizard
        isOpen={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    const previousButton = screen.getByText('Previous');
    expect(previousButton).toBeDisabled();
  });

  it('shows skip button on non-first and non-last steps', async () => {
    const user = userEvent.setup();
    
    render(
      <OnboardingWizard
        isOpen={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    // First step - no skip button
    expect(screen.queryByText('Skip setup')).not.toBeInTheDocument();
    
    // Progress to second step
    await user.click(screen.getByText('Get Started'));
    expect(screen.getByText('Skip setup')).toBeInTheDocument();
  });

  it('calls onSkip when skip button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <OnboardingWizard
        isOpen={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    // Progress to second step
    await user.click(screen.getByText('Get Started'));
    
    // Click skip
    await user.click(screen.getByText('Skip setup'));
    expect(mockOnSkip).toHaveBeenCalled();
  });

  it('completes onboarding with collected data', async () => {
    const user = userEvent.setup();
    
    render(
      <OnboardingWizard
        isOpen={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    // Progress through all steps
    await user.click(screen.getByText('Get Started'));
    await user.click(screen.getByText('Continue'));
    await user.click(screen.getByText('Continue'));
    await user.click(screen.getByText('Continue'));
    await user.click(screen.getByText('Continue'));
    
    // Complete setup
    await user.click(screen.getByText('Complete Setup'));
    
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            role: 'developer',
            experience: 'intermediate',
          }),
          privacy: expect.objectContaining({
            ideTelemetry: true,
            gitActivity: true,
          }),
          dashboard: expect.objectContaining({
            preferredWidgets: ['metric_card'],
          }),
          notifications: expect.objectContaining({
            inApp: true,
          }),
        })
      );
    });
  });

  it('shows loading state during completion', async () => {
    const user = userEvent.setup();
    
    // Mock a slow completion
    const slowOnComplete = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(
      <OnboardingWizard
        isOpen={true}
        onComplete={slowOnComplete}
        onSkip={mockOnSkip}
      />
    );

    // Progress through all steps
    await user.click(screen.getByText('Get Started'));
    await user.click(screen.getByText('Continue'));
    await user.click(screen.getByText('Continue'));
    await user.click(screen.getByText('Continue'));
    await user.click(screen.getByText('Continue'));
    
    // Click complete setup
    await user.click(screen.getByText('Complete Setup'));
    
    // Should show loading state
    expect(screen.getByText('Finishing...')).toBeInTheDocument();
    expect(screen.getByText('Complete Setup')).toBeDisabled();
  });

  it('handles completion errors gracefully', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Mock a failing completion
    const failingOnComplete = jest.fn(() => Promise.reject(new Error('Test error')));
    
    render(
      <OnboardingWizard
        isOpen={true}
        onComplete={failingOnComplete}
        onSkip={mockOnSkip}
      />
    );

    // Progress through all steps
    await user.click(screen.getByText('Get Started'));
    await user.click(screen.getByText('Continue'));
    await user.click(screen.getByText('Continue'));
    await user.click(screen.getByText('Continue'));
    await user.click(screen.getByText('Continue'));
    
    // Click complete setup
    await user.click(screen.getByText('Complete Setup'));
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to complete onboarding:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });
});