import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductTour } from '../ProductTour';
import { OnboardingManager } from '../OnboardingManager';
import { OnboardingTour } from '../types';

// Mock createPortal to render in the same container
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (children: React.ReactNode) => children,
}));

const mockTour: OnboardingTour = {
  id: 'test-tour',
  name: 'Test Tour',
  description: 'A test tour',
  steps: [
    {
      id: 'step-1',
      title: 'Welcome',
      description: 'Welcome to the tour',
      target: '[data-testid="target-element"]',
      position: 'bottom',
      content: {
        text: 'This is the first step of our tour. Let\'s get started!',
        media: {
          type: 'image',
          url: '/test-image.jpg',
          alt: 'Test image'
        }
      },
      actions: [
        { type: 'next', label: 'Continue', variant: 'primary' },
        { type: 'skip', label: 'Skip', variant: 'secondary' }
      ],
      skippable: true,
      optional: false
    },
    {
      id: 'step-2',
      title: 'Features',
      description: 'Learn about features',
      target: '[data-testid="features-section"]',
      position: 'top',
      content: {
        text: 'Here are the main features you can use.',
        media: {
          type: 'video',
          url: '/test-video.mp4'
        }
      },
      actions: [
        { type: 'finish', label: 'Finish Tour', variant: 'primary' }
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

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingManager userId="test-user">
      <div>
        {/* Target elements for the tour */}
        <div data-testid="target-element">Target Element</div>
        <div data-testid="features-section">Features Section</div>
        {children}
      </div>
    </OnboardingManager>
  );
}

// Component to control the tour
function TourController() {
  const { registerTour, startTour } = require('../OnboardingManager').useOnboarding();

  React.useEffect(() => {
    registerTour(mockTour);
  }, [registerTour]);

  return (
    <button onClick={() => startTour('test-tour')}>
      Start Tour
    </button>
  );
}

describe('ProductTour', () => {
  beforeEach(() => {
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = jest.fn();
    
    // Mock getBoundingClientRect
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
  });

  it('renders nothing when no tour is active', () => {
    render(
      <TestWrapper>
        <ProductTour />
      </TestWrapper>
    );

    expect(screen.queryByText('Welcome')).not.toBeInTheDocument();
  });

  it('renders tour overlay when tour is active', async () => {
    render(
      <TestWrapper>
        <TourController />
        <ProductTour />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Start Tour'));

    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument();
      expect(screen.getByText('Welcome to the tour')).toBeInTheDocument();
      expect(screen.getByText('This is the first step of our tour. Let\'s get started!')).toBeInTheDocument();
    });
  });

  it('displays progress indicator', async () => {
    render(
      <TestWrapper>
        <TourController />
        <ProductTour />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Start Tour'));

    await waitFor(() => {
      expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    });
  });

  it('renders media content when provided', async () => {
    render(
      <TestWrapper>
        <TourController />
        <ProductTour />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Start Tour'));

    await waitFor(() => {
      const image = screen.getByAltText('Test image');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', '/test-image.jpg');
    });
  });

  it('handles next step navigation', async () => {
    render(
      <TestWrapper>
        <TourController />
        <ProductTour />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Start Tour'));

    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Features')).toBeInTheDocument();
      expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
    });
  });

  it('handles skip step action', async () => {
    render(
      <TestWrapper>
        <TourController />
        <ProductTour />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Start Tour'));

    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Skip'));

    await waitFor(() => {
      expect(screen.getByText('Features')).toBeInTheDocument();
    });
  });

  it('handles previous step navigation', async () => {
    render(
      <TestWrapper>
        <TourController />
        <ProductTour />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Start Tour'));

    // Go to second step
    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Continue'));

    // Go back to first step
    await waitFor(() => {
      expect(screen.getByText('Features')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Previous'));

    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument();
    });
  });

  it('finishes tour on last step', async () => {
    render(
      <TestWrapper>
        <TourController />
        <ProductTour />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Start Tour'));

    // Navigate to last step
    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Continue'));

    // Finish tour
    await waitFor(() => {
      expect(screen.getByText('Features')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Finish Tour'));

    await waitFor(() => {
      expect(screen.queryByText('Features')).not.toBeInTheDocument();
    });
  });

  it('renders video content correctly', async () => {
    render(
      <TestWrapper>
        <TourController />
        <ProductTour />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Start Tour'));
    
    // Navigate to step with video
    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      const video = screen.getByRole('img'); // video element shows as img in test
      expect(video).toBeInTheDocument();
    });
  });

  it('highlights target element', async () => {
    render(
      <TestWrapper>
        <TourController />
        <ProductTour />
      </TestWrapper>
    );

    const targetElement = screen.getByTestId('target-element');
    
    fireEvent.click(screen.getByText('Start Tour'));

    await waitFor(() => {
      expect(targetElement).toHaveClass('onboarding-highlight');
    });
  });

  it('removes highlight when tour ends', async () => {
    render(
      <TestWrapper>
        <TourController />
        <ProductTour />
      </TestWrapper>
    );

    const targetElement = screen.getByTestId('target-element');
    
    fireEvent.click(screen.getByText('Start Tour'));

    await waitFor(() => {
      expect(targetElement).toHaveClass('onboarding-highlight');
    });

    // Navigate to next step (should remove highlight from previous target)
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(targetElement).not.toHaveClass('onboarding-highlight');
    });
  });

  it('handles custom action handlers', async () => {
    const customHandler = jest.fn();
    const tourWithCustomAction: OnboardingTour = {
      ...mockTour,
      steps: [
        {
          ...mockTour.steps[0],
          actions: [
            { 
              type: 'custom', 
              label: 'Custom Action', 
              variant: 'primary',
              handler: customHandler
            }
          ]
        }
      ]
    };

    const CustomTourController = () => {
      const { registerTour, startTour } = require('../OnboardingManager').useOnboarding();

      React.useEffect(() => {
        registerTour(tourWithCustomAction);
      }, [registerTour]);

      return (
        <button onClick={() => startTour('test-tour')}>
          Start Custom Tour
        </button>
      );
    };

    render(
      <TestWrapper>
        <CustomTourController />
        <ProductTour />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Start Custom Tour'));

    await waitFor(() => {
      expect(screen.getByText('Custom Action')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Custom Action'));

    expect(customHandler).toHaveBeenCalled();
  });

  it('shows default next/finish button when no actions provided', async () => {
    const tourWithoutActions: OnboardingTour = {
      ...mockTour,
      steps: [
        {
          ...mockTour.steps[0],
          actions: []
        }
      ]
    };

    const NoActionTourController = () => {
      const { registerTour, startTour } = require('../OnboardingManager').useOnboarding();

      React.useEffect(() => {
        registerTour(tourWithoutActions);
      }, [registerTour]);

      return (
        <button onClick={() => startTour('test-tour')}>
          Start No Action Tour
        </button>
      );
    };

    render(
      <TestWrapper>
        <NoActionTourController />
        <ProductTour />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Start No Action Tour'));

    await waitFor(() => {
      // When no actions are provided, it should show "Finish" for last step
      expect(screen.getByText('Finish')).toBeInTheDocument();
    });
  });

  it('scrolls target element into view', async () => {
    render(
      <TestWrapper>
        <TourController />
        <ProductTour />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Start Tour'));

    await waitFor(() => {
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center'
      });
    });
  });
});