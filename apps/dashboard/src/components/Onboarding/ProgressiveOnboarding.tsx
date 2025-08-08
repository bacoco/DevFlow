import React, { useEffect, useState, useCallback } from 'react';
import { useOnboarding } from './OnboardingManager';
import { OnboardingTour, UserPersona, OnboardingProgress } from './types';

interface ProgressiveOnboardingProps {
  userId: string;
  className?: string;
}

interface LearningPaceAnalyzer {
  analyzeUserPace: (progress: OnboardingProgress[]) => 'fast' | 'medium' | 'slow';
  adaptTourForPace: (tour: OnboardingTour, pace: 'fast' | 'medium' | 'slow') => OnboardingTour;
  shouldShowHint: (stepId: string, timeSpent: number, pace: 'fast' | 'medium' | 'slow') => boolean;
}

const learningPaceAnalyzer: LearningPaceAnalyzer = {
  analyzeUserPace: (progress: OnboardingProgress[]) => {
    if (progress.length === 0) return 'medium';

    const completedTours = progress.filter(p => p.completed);
    if (completedTours.length === 0) return 'medium';

    // Calculate average time per step
    const totalSteps = completedTours.reduce((sum, tour) => sum + tour.completedSteps.length, 0);
    const totalTime = completedTours.reduce((sum, tour) => {
      const duration = tour.lastInteraction.getTime() - tour.startedAt.getTime();
      return sum + duration;
    }, 0);

    if (totalSteps === 0) return 'medium';

    const avgTimePerStep = totalTime / totalSteps;
    const avgTimeInSeconds = avgTimePerStep / 1000;

    // Classify based on average time per step
    if (avgTimeInSeconds < 30) return 'fast';
    if (avgTimeInSeconds > 120) return 'slow';
    return 'medium';
  },

  adaptTourForPace: (tour: OnboardingTour, pace: 'fast' | 'medium' | 'slow') => {
    const adaptedTour = { ...tour };

    switch (pace) {
      case 'fast':
        // Remove optional steps, reduce delays, make more steps skippable
        adaptedTour.steps = tour.steps.map(step => ({
          ...step,
          skippable: true,
          content: {
            ...step.content,
            text: step.content.text.length > 100 
              ? step.content.text.substring(0, 100) + '...' 
              : step.content.text
          }
        })).filter(step => !step.optional);
        break;

      case 'slow':
        // Add more detailed explanations, increase delays, add more hints
        adaptedTour.steps = tour.steps.map(step => ({
          ...step,
          skippable: false,
          content: {
            ...step.content,
            text: step.content.text + (step.optional ? '\n\nTake your time to explore this feature.' : '')
          }
        }));
        break;

      default: // medium
        // Keep original tour structure
        break;
    }

    return adaptedTour;
  },

  shouldShowHint: (stepId: string, timeSpent: number, pace: 'fast' | 'medium' | 'slow') => {
    const thresholds = {
      fast: 15000,    // 15 seconds
      medium: 30000,  // 30 seconds
      slow: 60000     // 60 seconds
    };

    return timeSpent > thresholds[pace];
  }
};

// Predefined user personas
const userPersonas: UserPersona[] = [
  {
    id: 'new-developer',
    name: 'New Developer',
    characteristics: ['first-time-user', 'needs-guidance', 'prefers-step-by-step'],
    learningPace: 'slow',
    preferredContentType: 'visual'
  },
  {
    id: 'experienced-developer',
    name: 'Experienced Developer',
    characteristics: ['familiar-with-tools', 'wants-efficiency', 'prefers-shortcuts'],
    learningPace: 'fast',
    preferredContentType: 'text'
  },
  {
    id: 'team-lead',
    name: 'Team Lead',
    characteristics: ['management-focused', 'needs-overview', 'collaborative-features'],
    learningPace: 'medium',
    preferredContentType: 'interactive'
  },
  {
    id: 'power-user',
    name: 'Power User',
    characteristics: ['advanced-features', 'customization-focused', 'efficiency-oriented'],
    learningPace: 'fast',
    preferredContentType: 'interactive'
  }
];

// Predefined tours for different personas
const personaTours: Record<string, OnboardingTour[]> = {
  'new-developer': [
    {
      id: 'basic-navigation',
      name: 'Basic Navigation',
      description: 'Learn how to navigate the dashboard',
      steps: [
        {
          id: 'welcome',
          title: 'Welcome to DevFlow',
          description: 'Let\'s start with the basics',
          target: '[data-testid="main-dashboard"]',
          position: 'center',
          content: {
            text: 'Welcome to DevFlow Dashboard! This tour will help you get familiar with the main features. We\'ll go step by step to make sure you\'re comfortable.',
            media: {
              type: 'image',
              url: '/images/welcome-dashboard.png',
              alt: 'Dashboard overview'
            }
          },
          actions: [
            { type: 'next', label: 'Let\'s Start', variant: 'primary' }
          ],
          skippable: false,
          optional: false
        },
        {
          id: 'main-navigation',
          title: 'Main Navigation',
          description: 'Learn about the main navigation menu',
          target: '[data-testid="main-nav"]',
          position: 'right',
          content: {
            text: 'This is your main navigation menu. You can access different sections of the dashboard from here. Take a moment to see what\'s available.'
          },
          actions: [
            { type: 'next', label: 'Continue', variant: 'primary' }
          ],
          skippable: true,
          optional: false
        }
      ],
      triggers: [
        { type: 'first_visit', condition: true }
      ],
      userPersona: userPersonas[0],
      priority: 1,
      version: '1.0'
    }
  ],
  'experienced-developer': [
    {
      id: 'quick-overview',
      name: 'Quick Overview',
      description: 'Fast overview of key features',
      steps: [
        {
          id: 'shortcuts',
          title: 'Keyboard Shortcuts',
          description: 'Essential shortcuts for productivity',
          target: '[data-testid="command-palette-trigger"]',
          position: 'bottom',
          content: {
            text: 'Press Ctrl+K (Cmd+K on Mac) to open the command palette. This is your fastest way to navigate and perform actions.'
          },
          actions: [
            { type: 'next', label: 'Got it', variant: 'primary' }
          ],
          skippable: true,
          optional: false
        }
      ],
      triggers: [
        { type: 'first_visit', condition: true }
      ],
      userPersona: userPersonas[1],
      priority: 1,
      version: '1.0'
    }
  ]
};

export function ProgressiveOnboarding({ userId, className }: ProgressiveOnboardingProps) {
  const { 
    state, 
    registerTour, 
    startTour, 
    setUserPersona, 
    updatePreferences,
    getTourProgress 
  } = useOnboarding();
  
  const [detectedPersona, setDetectedPersona] = useState<UserPersona | null>(null);
  const [currentStepStartTime, setCurrentStepStartTime] = useState<Date | null>(null);
  const [showHint, setShowHint] = useState(false);

  // Detect user persona based on behavior
  const detectUserPersona = useCallback((progress: OnboardingProgress[]): UserPersona | null => {
    if (progress.length === 0) return null;

    const analyzedPace = learningPaceAnalyzer.analyzeUserPace(progress);
    
    // Simple heuristic based on learning pace and interaction patterns
    const totalSkipped = progress.reduce((sum, p) => sum + p.skippedSteps.length, 0);
    const totalCompleted = progress.reduce((sum, p) => sum + p.completedSteps.length, 0);
    const skipRatio = totalCompleted > 0 ? totalSkipped / totalCompleted : 0;

    if (analyzedPace === 'fast' && skipRatio > 0.3) {
      return userPersonas.find(p => p.id === 'experienced-developer') || null;
    } else if (analyzedPace === 'slow' && skipRatio < 0.1) {
      return userPersonas.find(p => p.id === 'new-developer') || null;
    } else if (analyzedPace === 'medium') {
      return userPersonas.find(p => p.id === 'team-lead') || null;
    }

    return null;
  }, []);

  // Initialize tours and detect persona
  useEffect(() => {
    // Register all tours
    Object.values(personaTours).flat().forEach(tour => {
      registerTour(tour);
    });

    // Detect persona from existing progress
    const persona = detectUserPersona(state.progress);
    if (persona && !state.userPersona) {
      setDetectedPersona(persona);
      setUserPersona(persona);
    }
  }, [registerTour, detectUserPersona, state.progress, state.userPersona, setUserPersona]);

  // Auto-start appropriate tour for new users
  useEffect(() => {
    if (!state.userPersona || state.currentTour) return;

    const userTours = personaTours[state.userPersona.id] || [];
    const incompleteTours = userTours.filter(tour => {
      const progress = getTourProgress(tour.id);
      return !progress || !progress.completed;
    });

    if (incompleteTours.length > 0 && state.preferences.autoStart) {
      // Start the highest priority incomplete tour
      const nextTour = incompleteTours.sort((a, b) => a.priority - b.priority)[0];
      startTour(nextTour.id);
    }
  }, [state.userPersona, state.currentTour, state.preferences.autoStart, getTourProgress, startTour]);

  // Track step timing for adaptive hints
  useEffect(() => {
    if (state.isActive && state.currentTour) {
      setCurrentStepStartTime(new Date());
      setShowHint(false);
    }
  }, [state.currentStep, state.isActive, state.currentTour]);

  // Show adaptive hints based on time spent
  useEffect(() => {
    if (!currentStepStartTime || !state.isActive || !state.currentTour || !state.userPersona) {
      return;
    }

    const checkForHint = () => {
      const timeSpent = Date.now() - currentStepStartTime.getTime();
      const currentStep = state.currentTour!.steps[state.currentStep];
      
      if (currentStep && learningPaceAnalyzer.shouldShowHint(
        currentStep.id, 
        timeSpent, 
        state.userPersona!.learningPace
      )) {
        setShowHint(true);
      }
    };

    const interval = setInterval(checkForHint, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [currentStepStartTime, state.isActive, state.currentTour, state.currentStep, state.userPersona]);

  // Adapt current tour based on detected learning pace
  useEffect(() => {
    if (state.currentTour && state.userPersona) {
      const analyzedPace = learningPaceAnalyzer.analyzeUserPace(state.progress);
      
      // Update user persona learning pace if it has changed significantly
      if (analyzedPace !== state.userPersona.learningPace) {
        const updatedPersona = {
          ...state.userPersona,
          learningPace: analyzedPace
        };
        setUserPersona(updatedPersona);
        
        // Update preferences to match detected pace
        updatePreferences({ learningPace: analyzedPace });
      }
    }
  }, [state.currentTour, state.userPersona, state.progress, setUserPersona, updatePreferences]);

  // Render adaptive hint overlay
  const renderHint = () => {
    if (!showHint || !state.currentTour || !state.userPersona) return null;

    const currentStep = state.currentTour.steps[state.currentStep];
    if (!currentStep) return null;

    const hintMessages = {
      fast: "Need help? Press 'Skip' to move faster, or use Ctrl+K for quick actions.",
      medium: "Take your time! Click on highlighted elements to learn more about them.",
      slow: "No rush! You can always come back to this tour later from the help menu."
    };

    return (
      <div className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm">
              {hintMessages[state.userPersona.learningPace]}
            </p>
          </div>
          <button
            onClick={() => setShowHint(false)}
            className="flex-shrink-0 text-blue-200 hover:text-white"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  // Render persona detection notification
  const renderPersonaDetection = () => {
    if (!detectedPersona || state.userPersona) return null;

    return (
      <div className="fixed top-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900">
              Personalized Experience
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              We've detected you might be a {detectedPersona.name}. Would you like a customized onboarding experience?
            </p>
            <div className="flex space-x-2 mt-3">
              <button
                onClick={() => {
                  setUserPersona(detectedPersona);
                  setDetectedPersona(null);
                }}
                className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
              >
                Yes, customize
              </button>
              <button
                onClick={() => setDetectedPersona(null)}
                className="px-3 py-1 bg-gray-200 text-gray-800 text-xs rounded-md hover:bg-gray-300 transition-colors"
              >
                No thanks
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={className}>
      {renderPersonaDetection()}
      {renderHint()}
    </div>
  );
}

// Hook for accessing progressive onboarding features
export function useProgressiveOnboarding() {
  const onboarding = useOnboarding();
  
  const suggestNextTour = useCallback(() => {
    if (!onboarding.state.userPersona) return null;
    
    const userTours = personaTours[onboarding.state.userPersona.id] || [];
    const incompleteTours = userTours.filter(tour => {
      const progress = onboarding.getTourProgress(tour.id);
      return !progress || !progress.completed;
    });
    
    return incompleteTours.sort((a, b) => a.priority - b.priority)[0] || null;
  }, [onboarding.state.userPersona, onboarding.getTourProgress]);

  const getPersonaRecommendations = useCallback(() => {
    if (!onboarding.state.userPersona) return [];
    
    const persona = onboarding.state.userPersona;
    const recommendations = [];
    
    if (persona.characteristics.includes('needs-guidance')) {
      recommendations.push('Consider enabling tooltips for additional help');
    }
    
    if (persona.characteristics.includes('wants-efficiency')) {
      recommendations.push('Learn keyboard shortcuts to speed up your workflow');
    }
    
    if (persona.characteristics.includes('collaborative-features')) {
      recommendations.push('Explore team insights and sharing features');
    }
    
    return recommendations;
  }, [onboarding.state.userPersona]);

  return {
    ...onboarding,
    suggestNextTour,
    getPersonaRecommendations,
    userPersonas,
    learningPaceAnalyzer
  };
}