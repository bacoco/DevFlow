import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingWizard } from '../OnboardingWizard';
import { OnboardingData } from '../../../types/onboarding';

describe('Onboarding Integration', () => {
  const mockOnComplete = jest.fn();
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('completes full onboarding flow for developer role', async () => {
    const user = userEvent.setup();
    
    render(
      <OnboardingWizard
        isOpen={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    // Step 1: Welcome
    expect(screen.getByText('Welcome to DevFlow Intelligence')).toBeInTheDocument();
    await user.click(screen.getByText('Let\'s Get Started'));

    // Step 2: Role Selection
    expect(screen.getByText('Tell us about your role')).toBeInTheDocument();
    await user.click(screen.getByText('Developer'));
    await user.click(screen.getByText('Intermediate (2-5 years)'));
    await user.click(screen.getByText('Continue'));

    // Step 3: Privacy Settings
    expect(screen.getByText('Privacy & Data Collection')).toBeInTheDocument();
    
    // Toggle some privacy settings
    const ideToggle = screen.getByLabelText(/IDE Telemetry Data/);
    expect(ideToggle).toBeChecked(); // Should be enabled by default
    
    const communicationToggle = screen.getByLabelText(/Team Communication Data/);
    await user.click(communicationToggle); // Enable communication data
    
    // Select anonymization level
    await user.click(screen.getByText('Full Anonymization'));
    
    await user.click(screen.getByText('Continue'));

    // Step 4: Dashboard Setup
    expect(screen.getByText('Dashboard Setup')).toBeInTheDocument();
    
    // Should have recommended widgets pre-selected for developer
    expect(screen.getByText('Choose your dashboard widgets')).toBeInTheDocument();
    
    // Select layout
    await user.click(screen.getByText('Compact'));
    
    // Select theme
    await user.click(screen.getByText('Dark'));
    
    await user.click(screen.getByText('Continue'));

    // Step 5: Notification Preferences
    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    
    // Enable email notifications
    const emailToggle = screen.getAllByRole('checkbox').find(
      checkbox => checkbox.closest('.p-4')?.textContent?.includes('Email')
    );
    if (emailToggle) {
      await user.click(emailToggle);
    }
    
    // Select frequency
    await user.click(screen.getByText('Hourly Digest'));
    
    await user.click(screen.getByText('Continue'));

    // Step 6: Completion
    expect(screen.getByText('You\'re all set!')).toBeInTheDocument();
    expect(screen.getByText('Setup Complete')).toBeInTheDocument();
    
    // Complete the onboarding
    await user.click(screen.getByText('Complete Setup'));

    // Verify the completion callback was called with correct data
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            role: 'developer',
            experience: 'intermediate',
          }),
          privacy: expect.objectContaining({
            ideTelemetry: true,
            communicationData: true,
            anonymization: 'full',
          }),
          dashboard: expect.objectContaining({
            layout: 'compact',
            theme: 'dark',
          }),
          notifications: expect.objectContaining({
            email: true,
            frequency: 'hourly',
          }),
        })
      );
    });
  });

  it('completes flow for team lead with different preferences', async () => {
    const user = userEvent.setup();
    
    render(
      <OnboardingWizard
        isOpen={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    // Progress through steps with team lead selections
    await user.click(screen.getByText('Let\'s Get Started'));
    
    // Select team lead role
    await user.click(screen.getByText('Team Lead'));
    await user.click(screen.getByText('Senior (5+ years)'));
    
    // Select team
    const teamSelect = screen.getByDisplayValue('Select a team...');
    await user.selectOptions(teamSelect, 'Frontend Team');
    
    await user.click(screen.getByText('Continue'));

    // Privacy settings - keep defaults
    await user.click(screen.getByText('Continue'));

    // Dashboard setup - should show team lead recommendations
    expect(screen.getByText('Recommended for team leads')).toBeInTheDocument();
    await user.click(screen.getByText('Use Recommended'));
    
    // Select spacious layout
    await user.click(screen.getByText('Spacious'));
    
    await user.click(screen.getByText('Continue'));

    // Notifications - enable Slack
    const slackToggle = screen.getAllByRole('checkbox').find(
      checkbox => checkbox.closest('.p-4')?.textContent?.includes('Slack')
    );
    if (slackToggle) {
      await user.click(slackToggle);
    }
    
    await user.click(screen.getByText('Continue'));
    
    // Complete
    await user.click(screen.getByText('Complete Setup'));

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            role: 'team_lead',
            team: 'Frontend Team',
            experience: 'senior',
          }),
          dashboard: expect.objectContaining({
            layout: 'spacious',
          }),
          notifications: expect.objectContaining({
            slack: true,
          }),
        })
      );
    });
  });

  it('handles navigation between steps correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <OnboardingWizard
        isOpen={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    // Progress to step 3
    await user.click(screen.getByText('Let\'s Get Started'));
    await user.click(screen.getByText('Developer'));
    await user.click(screen.getByText('Intermediate (2-5 years)'));
    await user.click(screen.getByText('Continue'));
    
    expect(screen.getByText('Privacy & Data Collection')).toBeInTheDocument();
    
    // Go back to step 2
    await user.click(screen.getByText('Previous'));
    expect(screen.getByText('Tell us about your role')).toBeInTheDocument();
    
    // Should maintain previous selections
    const developerButton = screen.getByText('Developer').closest('button');
    expect(developerButton).toHaveClass('border-blue-500');
    
    const intermediateOption = screen.getByText('Intermediate (2-5 years)').closest('label');
    expect(intermediateOption?.querySelector('input')).toBeChecked();
    
    // Go forward again
    await user.click(screen.getByText('Continue'));
    expect(screen.getByText('Privacy & Data Collection')).toBeInTheDocument();
  });

  it('shows progress correctly throughout flow', async () => {
    const user = userEvent.setup();
    
    render(
      <OnboardingWizard
        isOpen={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    // Step 1
    expect(screen.getByText('Step 1 of 6')).toBeInTheDocument();
    expect(screen.getByText('17% complete')).toBeInTheDocument();
    
    await user.click(screen.getByText('Let\'s Get Started'));
    
    // Step 2
    expect(screen.getByText('Step 2 of 6')).toBeInTheDocument();
    expect(screen.getByText('33% complete')).toBeInTheDocument();
    
    await user.click(screen.getByText('Developer'));
    await user.click(screen.getByText('Intermediate (2-5 years)'));
    await user.click(screen.getByText('Continue'));
    
    // Step 3
    expect(screen.getByText('Step 3 of 6')).toBeInTheDocument();
    expect(screen.getByText('50% complete')).toBeInTheDocument();
  });

  it('allows skipping onboarding from middle steps', async () => {
    const user = userEvent.setup();
    
    render(
      <OnboardingWizard
        isOpen={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    // Progress to step 2
    await user.click(screen.getByText('Let\'s Get Started'));
    
    // Skip should be available
    expect(screen.getByText('Skip setup')).toBeInTheDocument();
    await user.click(screen.getByText('Skip setup'));
    
    expect(mockOnSkip).toHaveBeenCalled();
  });

  it('validates required steps before allowing progression', async () => {
    const user = userEvent.setup();
    
    render(
      <OnboardingWizard
        isOpen={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    // Progress to role selection
    await user.click(screen.getByText('Let\'s Get Started'));
    
    // Try to continue without selecting role - should be disabled
    const continueButton = screen.getByText('Continue');
    expect(continueButton).toBeDisabled();
    
    // Select role but not experience
    await user.click(screen.getByText('Developer'));
    // Button should still be disabled (experience is required)
    expect(continueButton).toBeDisabled();
    
    // Select experience
    await user.click(screen.getByText('Intermediate (2-5 years)'));
    // Now button should be enabled
    expect(continueButton).not.toBeDisabled();
  });
});