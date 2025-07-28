import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoleSelectionStep } from '../steps/RoleSelectionStep';

describe('RoleSelectionStep', () => {
  const mockProps = {
    onNext: jest.fn(),
    onPrevious: jest.fn(),
    onComplete: jest.fn(),
    stepData: {},
    isFirstStep: false,
    isLastStep: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all role options', () => {
    render(<RoleSelectionStep {...mockProps} />);

    expect(screen.getByText('Developer')).toBeInTheDocument();
    expect(screen.getByText('Team Lead')).toBeInTheDocument();
    expect(screen.getByText('Engineering Manager')).toBeInTheDocument();
    expect(screen.getByText('System Administrator')).toBeInTheDocument();
  });

  it('renders experience level options', () => {
    render(<RoleSelectionStep {...mockProps} />);

    expect(screen.getByText('Junior (0-2 years)')).toBeInTheDocument();
    expect(screen.getByText('Intermediate (2-5 years)')).toBeInTheDocument();
    expect(screen.getByText('Senior (5+ years)')).toBeInTheDocument();
  });

  it('renders team selection dropdown', () => {
    render(<RoleSelectionStep {...mockProps} />);

    expect(screen.getByText('Which team are you part of?')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Select a team...')).toBeInTheDocument();
  });

  it('selects role and updates preview', async () => {
    const user = userEvent.setup();
    render(<RoleSelectionStep {...mockProps} />);

    // Select developer role
    await user.click(screen.getByText('Developer'));

    // Should show role preview
    expect(screen.getByText('Your personalized dashboard will include:')).toBeInTheDocument();
    expect(screen.getByText('Personal productivity tracking')).toBeInTheDocument();
    expect(screen.getByText('Time in flow')).toBeInTheDocument();
  });

  it('selects experience level', async () => {
    const user = userEvent.setup();
    render(<RoleSelectionStep {...mockProps} />);

    // Select senior experience
    await user.click(screen.getByText('Senior (5+ years)'));

    // Should be selected
    const seniorOption = screen.getByText('Senior (5+ years)').closest('label');
    expect(seniorOption?.querySelector('input')).toBeChecked();
  });

  it('selects team from dropdown', async () => {
    const user = userEvent.setup();
    render(<RoleSelectionStep {...mockProps} />);

    const teamSelect = screen.getByDisplayValue('Select a team...');
    await user.selectOptions(teamSelect, 'Frontend Team');

    expect(teamSelect).toHaveValue('Frontend Team');
  });

  it('disables continue button when role not selected', () => {
    render(<RoleSelectionStep {...mockProps} />);

    const continueButton = screen.getByText('Continue');
    expect(continueButton).toBeDisabled();
  });

  it('enables continue button when role and experience selected', async () => {
    const user = userEvent.setup();
    render(<RoleSelectionStep {...mockProps} />);

    // Select role and experience
    await user.click(screen.getByText('Developer'));
    await user.click(screen.getByText('Intermediate (2-5 years)'));

    const continueButton = screen.getByText('Continue');
    expect(continueButton).not.toBeDisabled();
  });

  it('calls onComplete and onNext when continue clicked', async () => {
    const user = userEvent.setup();
    render(<RoleSelectionStep {...mockProps} />);

    // Select role and experience
    await user.click(screen.getByText('Developer'));
    await user.click(screen.getByText('Senior (5+ years)'));

    // Click continue
    await user.click(screen.getByText('Continue'));

    expect(mockProps.onComplete).toHaveBeenCalledWith({
      role: 'developer',
      team: '',
      experience: 'senior',
    });
    expect(mockProps.onNext).toHaveBeenCalled();
  });

  it('includes team in data when selected', async () => {
    const user = userEvent.setup();
    render(<RoleSelectionStep {...mockProps} />);

    // Select role, experience, and team
    await user.click(screen.getByText('Team Lead'));
    await user.click(screen.getByText('Senior (5+ years)'));
    
    const teamSelect = screen.getByDisplayValue('Select a team...');
    await user.selectOptions(teamSelect, 'Backend Team');

    // Click continue
    await user.click(screen.getByText('Continue'));

    expect(mockProps.onComplete).toHaveBeenCalledWith({
      role: 'team_lead',
      team: 'Backend Team',
      experience: 'senior',
    });
  });

  it('loads existing step data', () => {
    const existingData = {
      role: 'manager',
      team: 'Platform Team',
      experience: 'senior',
    };

    render(<RoleSelectionStep {...mockProps} stepData={existingData} />);

    // Should have manager role selected
    const managerButton = screen.getByText('Engineering Manager').closest('button');
    expect(managerButton).toHaveClass('border-blue-500');

    // Should have senior experience selected
    const seniorOption = screen.getByText('Senior (5+ years)').closest('label');
    expect(seniorOption?.querySelector('input')).toBeChecked();

    // Should have team selected
    const teamSelect = screen.getByDisplayValue('Platform Team');
    expect(teamSelect).toHaveValue('Platform Team');
  });

  it('shows different dashboard focus for different roles', async () => {
    const user = userEvent.setup();
    render(<RoleSelectionStep {...mockProps} />);

    // Select team lead role
    await user.click(screen.getByText('Team Lead'));
    expect(screen.getByText('Team velocity')).toBeInTheDocument();
    expect(screen.getByText('Review lag times')).toBeInTheDocument();

    // Select manager role
    await user.click(screen.getByText('Engineering Manager'));
    expect(screen.getByText('Delivery timelines')).toBeInTheDocument();
    expect(screen.getByText('Team productivity trends')).toBeInTheDocument();
  });
});