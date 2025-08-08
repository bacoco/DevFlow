import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingManager, useOnboarding } from '../OnboardingManager';
import { OnboardingTour, UserPersona } from '../types';

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

const mockTour: OnboardingTour = {
  id: 'test-tour',
  name: 'Test Tour',
  description: 'A test tour',
  steps: [
    {
      id: 'step-1',
      title: 'Step 1',
      description: 'First step',
      target: '[data-testid="target-1"]',
      position: 'bottom',
      content: {
        text: 'This is the first step'
      },
      actions: [
        { type: 'next', label: 'Next', variant: 'primary' }
      ],
      skippable: true,
      optional: false
    },
    {
      id: 'step-2',
      title: 'Step 2',
      description: 'Second step',
      target: '[data-testid="target-2"]',
      position: 'top',
      content: {
        text: 'This is the second step'
      },
      actions: [
        { type: 'finish', label: 'Finish', variant: 'primary' }
      ],
      skippable: false,
      optional: false
    }
  ],
  triggers: [
    { type: 'first_visit', condition: true }
  ],
  priority: 1,
  version: '1.0'
};

const mockPersona: UserPersona = {
  id: 'test-persona',
  name: 'Test Persona',
  characteristics: ['test'],
  learningPace: 'medium',
  preferredContentType: 'text'
};

// Test component that uses the onboarding hook
function TestComponent() {
  const {
    state,
    startTour,
    nextStep,
    previousStep,
    skipStep,
    finishTour,
    setUserPersona,
    registerTour,
    getTourProgress
  } = useOnboarding();

  React.useEffect(() => {
    registerTour(mockTour);
  }, [registerTour]);

  return (
    <div>
      <div data-testid="current-tour">
        {state.currentTour?.name || 'No tour'}
      </div>
      <div data-testid="current-step">
        {state.currentStep}
      </div>
      <div data-testid="is-active">
        {state.isActive ? 'active' : 'inactive'}
      </div>
      <div data-testid="user-persona">
        {state.userPersona?.name || 'No persona'}
      </div>
      
      <button onClick={() => startTour('test-tour')}>
        Start Tour
      </button>
      <button onClick={nextStep}>
        Next Step
      </button>
      <button onClick={previousStep}>
        Previous Step
      </button>
      <button onClick={skipStep}>
        Skip Step
      </button>
      <button onClick={finishTour}>
        Finish Tour
      </button>
      <button onClick={() => setUserPersona(mockPersona)}>
        Set Persona
      </button>
      
      {/* Mock target elements */}
      <div data-testid="target-1">Target 1</div>
      <div data-testid="target-2">Target 2</div>
    </div>
  );
}

describe('OnboardingManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('renders children and provides onboarding context', () => {
    render(
      <OnboardingManager userId="test-user">
        <TestComponent />
      </OnboardingManager>
    );

    expect(screen.getByText('No tour')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('inactive')).toBeInTheDocument();
  });

  it('starts a tour when requested', async () => {
    render(
      <OnboardingManager userId="test-user">
        <TestComponent />
      </OnboardingManager>
    );

    fireEvent.click(screen.getByText('Start Tour'));

    await waitFor(() => {
      expect(screen.getByText('Test Tour')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
    });
  });

  it('navigates through tour steps', async () => {
    render(
      <OnboardingManager userId="test-user">
        <TestComponent />
      </OnboardingManager>
    );

    // Start tour
    fireEvent.click(screen.getByText('Start Tour'));
    
    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    // Go to next step
    fireEvent.click(screen.getByText('Next Step'));
    
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    // Go back to previous step
    fireEvent.click(screen.getByText('Previous Step'));
    
    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  it('skips steps when requested', async () => {
    render(
      <OnboardingManager userId="test-user">
        <TestComponent />
      </OnboardingManager>
    );

    fireEvent.click(screen.getByText('Start Tour'));
    
    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Skip Step'));
    
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('finishes tour and resets state', async () => {
    render(
      <OnboardingManager userId="test-user">
        <TestComponent />
      </OnboardingManager>
    );

    fireEvent.click(screen.getByText('Start Tour'));
    
    await waitFor(() => {
      expect(screen.getByText('active')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Finish Tour'));
    
    await waitFor(() => {
      expect(screen.getByText('inactive')).toBeInTheDocument();
      expect(screen.getByText('No tour')).toBeInTheDocument();
    });
  });

  it('sets user persona', async () => {
    render(
      <OnboardingManager userId="test-user">
        <TestComponent />
      </OnboardingManager>
    );

    fireEvent.click(screen.getByText('Set Persona'));
    
    await waitFor(() => {
      expect(screen.getByText('Test Persona')).toBeInTheDocument();
    });
  });

  it('saves progress to localStorage', async () => {
    render(
      <OnboardingManager userId="test-user">
        <TestComponent />
      </OnboardingManager>
    );

    fireEvent.click(screen.getByText('Start Tour'));
    
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'onboarding_progress_test-user',
        expect.stringContaining('test-tour')
      );
    });
  });

  it('loads progress from localStorage', () => {
    const savedProgress = JSON.stringify([
      {
        userId: 'test-user',
        tourId: 'test-tour',
        currentStep: 1,
        completedSteps: ['step-1'],
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
        <TestComponent />
      </OnboardingManager>
    );

    // The component should load the saved progress
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
      'onboarding_progress_test-user'
    );
  });

  it('handles localStorage errors gracefully', () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    // Should not throw an error
    expect(() => {
      render(
        <OnboardingManager userId="test-user">
          <TestComponent />
        </OnboardingManager>
      );
    }).not.toThrow();
  });

  it('updates preferences and saves them', async () => {
    render(
      <OnboardingManager userId="test-user">
        <TestComponent />
      </OnboardingManager>
    );

    // The component should save default preferences
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'onboarding_preferences_test-user',
        expect.stringContaining('autoStart')
      );
    });
  });

  it('completes tour when reaching the last step', async () => {
    render(
      <OnboardingManager userId="test-user">
        <TestComponent />
      </OnboardingManager>
    );

    fireEvent.click(screen.getByText('Start Tour'));
    
    // Go to last step
    fireEvent.click(screen.getByText('Next Step'));
    
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    // Next step should finish the tour
    fireEvent.click(screen.getByText('Next Step'));
    
    await waitFor(() => {
      expect(screen.getByText('inactive')).toBeInTheDocument();
      expect(screen.getByText('No tour')).toBeInTheDocument();
    });
  });
});

describe('useOnboarding hook', () => {
  it('throws error when used outside OnboardingManager', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useOnboarding must be used within an OnboardingManager');

    consoleSpy.mockRestore();
  });
});