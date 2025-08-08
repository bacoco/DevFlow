import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingManager } from '../OnboardingManager';
import { ProductTour } from '../ProductTour';
import { OnboardingTour } from '../types';

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

const simpleTour: OnboardingTour = {
  id: 'simple-tour',
  name: 'Simple Tour',
  description: 'A simple test tour',
  steps: [
    {
      id: 'step-1',
      title: 'Welcome',
      description: 'Welcome step',
      target: '[data-testid="target"]',
      position: 'bottom',
      content: {
        text: 'Welcome to the tour!'
      },
      actions: [
        { type: 'next', label: 'Next', variant: 'primary' }
      ],
      skippable: false,
      optional: false
    },
    {
      id: 'step-2',
      title: 'Finish',
      description: 'Final step',
      target: '[data-testid="target"]',
      position: 'bottom',
      content: {
        text: 'Tour complete!'
      },
      actions: [
        { type: 'finish', label: 'Done', variant: 'primary' }
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

function TestApp() {
  const { registerTour, startTour } = require('../OnboardingManager').useOnboarding();

  React.useEffect(() => {
    registerTour(simpleTour);
  }, [registerTour]);

  return (
    <div>
      <div data-testid="target">Target Element</div>
      <button onClick={() => startTour('simple-tour')}>
        Start Tour
      </button>
      <ProductTour />
    </div>
  );
}

describe('Onboarding Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('completes a basic onboarding flow', async () => {
    render(
      <OnboardingManager userId="test-user">
        <TestApp />
      </OnboardingManager>
    );

    // Start the tour
    fireEvent.click(screen.getByText('Start Tour'));

    // Should show first step
    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument();
      expect(screen.getByText('Welcome to the tour!')).toBeInTheDocument();
    });

    // Progress to next step
    fireEvent.click(screen.getByText('Next'));

    // Should show second step
    await waitFor(() => {
      expect(screen.getByText('Finish')).toBeInTheDocument();
      expect(screen.getByText('Tour complete!')).toBeInTheDocument();
    });

    // Complete the tour
    fireEvent.click(screen.getByText('Done'));

    // Tour should be finished
    await waitFor(() => {
      expect(screen.queryByText('Finish')).not.toBeInTheDocument();
    });
  });

  it('saves progress to localStorage', async () => {
    render(
      <OnboardingManager userId="test-user">
        <TestApp />
      </OnboardingManager>
    );

    fireEvent.click(screen.getByText('Start Tour'));

    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'onboarding_progress_test-user',
        expect.stringContaining('simple-tour')
      );
    });
  });
});

describe('Error Handling', () => {
  it('handles localStorage errors gracefully', () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    expect(() => {
      render(
        <OnboardingManager userId="test-user">
          <TestApp />
        </OnboardingManager>
      );
    }).not.toThrow();
  });
});