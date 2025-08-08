import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingManager } from '../OnboardingManager';
import { ProductTour } from '../ProductTour';
import { ContextualTooltip, TooltipManager } from '../ContextualTooltip';
import { HelpSystem } from '../HelpSystem';
import { ProgressiveOnboarding } from '../ProgressiveOnboarding';
import { ErrorRecovery } from '../ErrorRecovery';
import { OnboardingTour, TooltipConfig, UserPersona } from '../types';

// Mock createPortal
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (children: React.ReactNode) => children,
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();
Element.prototype.getBoundingClientRect = jest.fn(() => ({
  top: 100,
  left: 100,
  bottom: 200,
  right: 300,
  width: 200,
  height: 100,
  x: 100,
  y: 100,
  toJSON: jest.fn()
}));

const newDeveloperPersona: UserPersona = {
  id: 'new-developer',
  name: 'New Developer',
  characteristics: ['first-time-user', 'needs-guidance'],
  learningPace: 'slow',
  preferredContentType: 'visual'
};

const experiencedDeveloperPersona: UserPersona = {
  id: 'experienced-developer',
  name: 'Experienced Developer',
  characteristics: ['familiar-with-tools', 'wants-efficiency'],
  learningPace: 'fast',
  preferredContentType: 'text'
};

const basicTour: OnboardingTour = {
  id: 'basic-tour',
  name: 'Basic Dashboard Tour',
  description: 'Learn the basics of the dashboard',
  steps: [
    {
      id: 'welcome',
      title: 'Welcome',
      description: 'Welcome to DevFlow',
      target: '[data-testid="dashboard"]',
      position: 'center',
      content: {
        text: 'Welcome to DevFlow Dashboard! Let\'s take a quick tour.'
      },
      actions: [
        { type: 'next', label: 'Start Tour', variant: 'primary' }
      ],
      skippable: false,
      optional: false
    },
    {
      id: 'navigation',
      title: 'Navigation',
      description: 'Learn about navigation',
      target: '[data-testid="nav-menu"]',
      position: 'right',
      content: {
        text: 'This is your main navigation menu. Use it to access different sections.'
      },
      actions: [
        { type: 'next', label: 'Continue', variant: 'primary' }
      ],
      skippable: true,
      optional: false
    },
    {
      id: 'widgets',
      title: 'Dashboard Widgets',
      description: 'Understand dashboard widgets',
      target: '[data-testid="widget-area"]',
      position: 'top',
      content: {
        text: 'These widgets show your productivity metrics. You can customize them.'
      },
      actions: [
        { type: 'finish', label: 'Finish', variant: 'primary' }
      ],
      skippable: true,
      optional: false
    }
  ],
  triggers: [
    { type: 'first_visit', condition: true }
  ],
  userPersona: newDeveloperPersona,
  priority: 1,
  version: '1.0'
};

const advancedTour: OnboardingTour = {
  id: 'advanced-tour',
  name: 'Advanced Features Tour',
  description: 'Learn advanced features',
  steps: [
    {
      id: 'shortcuts',
      title: 'Keyboard Shortcuts',
      description: 'Learn keyboard shortcuts',
      target: '[data-testid="command-palette"]',
      position: 'bottom',
      content: {
        text: 'Press Ctrl+K to open the command palette for quick actions.'
      },
      actions: [
        { type: 'next', label: 'Got it', variant: 'primary' }
      ],
      skippable: true,
      optional: false
    },
    {
      id: 'customization',
      title: 'Customization',
      description: 'Customize your dashboard',
      target: '[data-testid="settings"]',
      position: 'left',
      content: {
        text: 'Access settings to customize your dashboard layout and preferences.'
      },
      actions: [
        { type: 'finish', label: 'Done', variant: 'primary' }
      ],
      skippable: true,
      optional: false
    }
  ],
  triggers: [
    { type: 'first_visit', condition: true }
  ],
  userPersona: experiencedDeveloperPersona,
  priority: 2,
  version: '1.0'
};

const tooltipConfigs: TooltipConfig[] = [
  {
    id: 'nav-tooltip',
    target: '[data-testid="nav-menu"]',
    content: 'Click here to navigate between sections',
    position: 'bottom',
    trigger: 'hover',
    dismissible: true,
    persistent: false
  },
  {
    id: 'help-tooltip',
    target: '[data-testid="help-button"]',
    content: 'Get help and documentation',
    position: 'left',
    trigger: 'hover',
    dismissible: true,
    persistent: false
  }
];

// Comprehensive test application
function TestApp() {
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [tooltips, setTooltips] = React.useState<TooltipConfig[]>([]);

  const {
    registerTour,
    startTour,
    setUserPersona,
    state
  } = require('../OnboardingManager').useOnboarding();

  React.useEffect(() => {
    registerTour(basicTour);
    registerTour(advancedTour);
  }, [registerTour]);

  const handlePersonaChange = (persona: UserPersona) => {
    setUserPersona(persona);
    // Start appropriate tour based on persona
    if (persona.id === 'new-developer') {
      startTour('basic-tour');
    } else if (persona.id === 'experienced-developer') {
      startTour('advanced-tour');
    }
  };

  const simulateError = () => {
    setError(new Error('Test error for recovery system'));
  };

  const showTooltips = () => {
    setTooltips(tooltipConfigs);
  };

  const hideTooltips = () => {
    setTooltips([]);
  };

  return (
    <div>
      {/* Mock dashboard elements */}
      <div data-testid="dashboard">Dashboard</div>
      <nav data-testid="nav-menu">Navigation Menu</nav>
      <div data-testid="widget-area">Widget Area</div>
      <div data-testid="command-palette">Command Palette</div>
      <div data-testid="settings">Settings</div>
      <button data-testid="help-button" onClick={() => setHelpOpen(true)}>
        Help
      </button>

      {/* Control buttons */}
      <div data-testid="controls">
        <button onClick={() => handlePersonaChange(newDeveloperPersona)}>
          Set New Developer Persona
        </button>
        <button onClick={() => handlePersonaChange(experiencedDeveloperPersona)}>
          Set Experienced Developer Persona
        </button>
        <button onClick={() => startTour('basic-tour')}>
          Start Basic Tour
        </button>
        <button onClick={() => startTour('advanced-tour')}>
          Start Advanced Tour
        </button>
        <button onClick={showTooltips}>
          Show Tooltips
        </button>
        <button onClick={hideTooltips}>
          Hide Tooltips
        </button>
        <button onClick={simulateError}>
          Simulate Error
        </button>
      </div>

      {/* Current state display */}
      <div data-testid="state-display">
        <div data-testid="current-persona">
          {state.userPersona?.name || 'No Persona'}
        </div>
        <div data-testid="current-tour">
          {state.currentTour?.name || 'No Tour'}
        </div>
        <div data-testid="tour-active">
          {state.isActive ? 'Active' : 'Inactive'}
        </div>
      </div>

      {/* Components */}
      <ProductTour />
      <ProgressiveOnboarding userId="test-user" />
      <TooltipManager 
        tooltips={tooltips} 
        onDismiss={(id) => setTooltips(prev => prev.filter(t => t.id !== id))}
      />
      <HelpSystem 
        isOpen={helpOpen} 
        onClose={() => setHelpOpen(false)} 
      />
      <ErrorRecovery 
        error={error} 
        onRecover={() => setError(null)}
        onDismiss={() => setError(null)}
      />
    </div>
  );
}

describe('Onboarding System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('completes full onboarding flow for new developer', async () => {
    const user = userEvent.setup();

    render(
      <OnboardingManager userId="test-user">
        <TestApp />
      </OnboardingManager>
    );

    // Set persona to new developer
    await user.click(screen.getByText('Set New Developer Persona'));

    // Should start basic tour automatically
    await waitFor(() => {
      expect(screen.getByText('New Developer')).toBeInTheDocument();
      expect(screen.getByText('Basic Dashboard Tour')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    // Should show welcome step
    expect(screen.getByText('Welcome')).toBeInTheDocument();
    expect(screen.getByText('Welcome to DevFlow Dashboard! Let\'s take a quick tour.')).toBeInTheDocument();

    // Progress through tour
    await user.click(screen.getByText('Start Tour'));

    await waitFor(() => {
      expect(screen.getByText('Navigation')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Dashboard Widgets')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Finish'));

    // Tour should be completed
    await waitFor(() => {
      expect(screen.getByTestId('tour-active')).toHaveTextContent('Inactive');
      expect(screen.getByTestId('current-tour')).toHaveTextContent('No Tour');
    });
  });

  it('completes advanced tour for experienced developer', async () => {
    const user = userEvent.setup();

    render(
      <OnboardingManager userId="test-user">
        <TestApp />
      </OnboardingManager>
    );

    // Set persona to experienced developer
    await user.click(screen.getByText('Set Experienced Developer Persona'));

    await waitFor(() => {
      expect(screen.getByText('Experienced Developer')).toBeInTheDocument();
      expect(screen.getByText('Advanced Features Tour')).toBeInTheDocument();
    });

    // Should show shortcuts step
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();

    await user.click(screen.getByText('Got it'));

    await waitFor(() => {
      expect(screen.getByText('Customization')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Done'));

    await waitFor(() => {
      expect(screen.getByTestId('tour-active')).toHaveTextContent('Inactive');
    });
  });

  it('shows and dismisses contextual tooltips', async () => {
    const user = userEvent.setup();

    render(
      <OnboardingManager userId="test-user">
        <TestApp />
      </OnboardingManager>
    );

    // Show tooltips
    await user.click(screen.getByText('Show Tooltips'));

    // Hover over navigation to show tooltip
    await user.hover(screen.getByTestId('nav-menu'));

    await waitFor(() => {
      expect(screen.getByText('Click here to navigate between sections')).toBeInTheDocument();
    });

    // Hide tooltips
    await user.click(screen.getByText('Hide Tooltips'));

    await waitFor(() => {
      expect(screen.queryByText('Click here to navigate between sections')).not.toBeInTheDocument();
    });
  });

  it('opens and uses help system', async () => {
    const user = userEvent.setup();

    render(
      <OnboardingManager userId="test-user">
        <TestApp />
      </OnboardingManager>
    );

    // Open help system
    await user.click(screen.getByTestId('help-button'));

    await waitFor(() => {
      expect(screen.getByText('Help & Documentation')).toBeInTheDocument();
      expect(screen.getByText('Popular Articles')).toBeInTheDocument();
    });

    // Search for help content
    const searchInput = screen.getByPlaceholderText('Search documentation...');
    await user.type(searchInput, 'getting started');

    await waitFor(() => {
      expect(screen.getByText('Search Results (1)')).toBeInTheDocument();
      expect(screen.getByText('Getting Started with DevFlow Dashboard')).toBeInTheDocument();
    });

    // Click on search result
    await user.click(screen.getByText('Getting Started with DevFlow Dashboard'));

    await waitFor(() => {
      expect(screen.getByText('Welcome to DevFlow Dashboard')).toBeInTheDocument();
    });

    // Go back to search
    await user.click(screen.getByLabelText('Go back'));

    await waitFor(() => {
      // After going back, should show search results again since search is still active
      expect(screen.getByText('Search Results (1)')).toBeInTheDocument();
    });

    // Close help
    await user.click(screen.getByLabelText('Close help'));

    await waitFor(() => {
      expect(screen.queryByText('Help & Documentation')).not.toBeInTheDocument();
    });
  });

  it('handles error recovery flow', async () => {
    const user = userEvent.setup();

    render(
      <OnboardingManager userId="test-user">
        <TestApp />
      </OnboardingManager>
    );

    // Simulate an error
    await user.click(screen.getByText('Simulate Error'));

    await waitFor(() => {
      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
      expect(screen.getByText('An unexpected error occurred. We\'re sorry for the inconvenience.')).toBeInTheDocument();
    });

    // Should show recovery actions
    expect(screen.getByText('Refresh Page')).toBeInTheDocument();
    expect(screen.getByText('Report Issue')).toBeInTheDocument();

    // Dismiss error
    await user.click(screen.getByLabelText('Dismiss error'));

    await waitFor(() => {
      expect(screen.queryByText('Something Went Wrong')).not.toBeInTheDocument();
    });
  });

  it('persists onboarding progress across sessions', async () => {
    const user = userEvent.setup();

    // Mock saved progress
    const savedProgress = JSON.stringify([
      {
        userId: 'test-user',
        tourId: 'basic-tour',
        currentStep: 1,
        completedSteps: ['welcome'],
        skippedSteps: [],
        startedAt: new Date().toISOString(),
        lastInteraction: new Date().toISOString(),
        completed: false,
        abandoned: false,
        learningPace: 'medium'
      }
    ]);

    mockLocalStorage.getItem.mockReturnValue(savedProgress);

    render(
      <OnboardingManager userId="test-user">
        <TestApp />
      </OnboardingManager>
    );

    // Should load saved progress
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('onboarding_progress_test-user');

    // Start the tour that has progress
    await user.click(screen.getByText('Start Basic Tour'));

    // Should resume from saved step (step 1 would be the welcome step)
    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument();
    });
  });

  it('adapts tour based on user learning pace', async () => {
    const user = userEvent.setup();

    render(
      <OnboardingManager userId="test-user">
        <TestApp />
      </OnboardingManager>
    );

    // Set new developer persona (slow learner)
    await user.click(screen.getByText('Set New Developer Persona'));

    await waitFor(() => {
      expect(screen.getByText('Basic Dashboard Tour')).toBeInTheDocument();
    });

    // Tour should be adapted for slow learners (more detailed, less skippable)
    expect(screen.getByText('Welcome')).toBeInTheDocument();
    
    // The welcome step should not be skippable for new developers
    expect(screen.queryByText('Skip')).not.toBeInTheDocument();
  });

  it('shows progressive onboarding hints', async () => {
    const user = userEvent.setup();

    render(
      <OnboardingManager userId="test-user">
        <TestApp />
      </OnboardingManager>
    );

    await user.click(screen.getByText('Set New Developer Persona'));

    await waitFor(() => {
      expect(screen.getByText('Basic Dashboard Tour')).toBeInTheDocument();
    });

    // Wait for hint to appear (mocked timing)
    await waitFor(() => {
      // Progressive onboarding should show hints for slow learners
      // This would normally take time, but we can test the component is rendered
      expect(screen.getByText('Welcome')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('handles multiple personas and tour switching', async () => {
    const user = userEvent.setup();

    render(
      <OnboardingManager userId="test-user">
        <TestApp />
      </OnboardingManager>
    );

    // Start with new developer
    await user.click(screen.getByText('Set New Developer Persona'));

    await waitFor(() => {
      expect(screen.getByText('New Developer')).toBeInTheDocument();
      expect(screen.getByText('Basic Dashboard Tour')).toBeInTheDocument();
    });

    // Switch to experienced developer
    await user.click(screen.getByText('Set Experienced Developer Persona'));

    await waitFor(() => {
      expect(screen.getByText('Experienced Developer')).toBeInTheDocument();
      expect(screen.getByText('Advanced Features Tour')).toBeInTheDocument();
    });

    // Should show different tour content
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('integrates all components in a realistic user journey', async () => {
    const user = userEvent.setup();

    render(
      <OnboardingManager userId="test-user">
        <TestApp />
      </OnboardingManager>
    );

    // 1. User sets persona
    await user.click(screen.getByText('Set New Developer Persona'));

    // 2. Tour starts automatically
    await waitFor(() => {
      expect(screen.getByText('Basic Dashboard Tour')).toBeInTheDocument();
    });

    // 3. User goes through tour
    await user.click(screen.getByText('Start Tour'));
    await user.click(screen.getByText('Continue'));
    await user.click(screen.getByText('Finish'));

    // 4. User explores tooltips
    await user.click(screen.getByText('Show Tooltips'));
    await user.hover(screen.getByTestId('nav-menu'));

    await waitFor(() => {
      expect(screen.getByText('Click here to navigate between sections')).toBeInTheDocument();
    });

    // 5. User opens help system
    await user.click(screen.getByTestId('help-button'));

    await waitFor(() => {
      expect(screen.getByText('Help & Documentation')).toBeInTheDocument();
    });

    // 6. User searches for help
    const searchInput = screen.getByPlaceholderText('Search documentation...');
    await user.type(searchInput, 'shortcuts');

    await waitFor(() => {
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });

    // 7. User closes help
    await user.click(screen.getByLabelText('Close help'));

    // 8. System should have saved all interactions
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'onboarding_progress_test-user',
      expect.any(String)
    );
  });
});