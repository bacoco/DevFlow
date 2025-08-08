import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { OnboardingState, OnboardingTour, OnboardingStep, OnboardingProgress, UserPersona } from './types';

interface OnboardingContextType {
  state: OnboardingState;
  startTour: (tourId: string) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipStep: () => void;
  finishTour: () => void;
  pauseTour: () => void;
  resumeTour: () => void;
  setUserPersona: (persona: UserPersona) => void;
  updatePreferences: (preferences: Partial<OnboardingState['preferences']>) => void;
  registerTour: (tour: OnboardingTour) => void;
  getTourProgress: (tourId: string) => OnboardingProgress | null;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

type OnboardingAction =
  | { type: 'START_TOUR'; payload: { tour: OnboardingTour } }
  | { type: 'NEXT_STEP' }
  | { type: 'PREVIOUS_STEP' }
  | { type: 'SKIP_STEP' }
  | { type: 'FINISH_TOUR' }
  | { type: 'PAUSE_TOUR' }
  | { type: 'RESUME_TOUR' }
  | { type: 'SET_USER_PERSONA'; payload: { persona: UserPersona } }
  | { type: 'UPDATE_PREFERENCES'; payload: { preferences: Partial<OnboardingState['preferences']> } }
  | { type: 'REGISTER_TOUR'; payload: { tour: OnboardingTour } }
  | { type: 'UPDATE_PROGRESS'; payload: { progress: OnboardingProgress } };

const initialState: OnboardingState = {
  currentTour: null,
  currentStep: 0,
  isActive: false,
  progress: [],
  userPersona: null,
  preferences: {
    autoStart: true,
    showTooltips: true,
    learningPace: 'medium'
  }
};

function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'START_TOUR':
      return {
        ...state,
        currentTour: action.payload.tour,
        currentStep: 0,
        isActive: true
      };

    case 'NEXT_STEP':
      if (!state.currentTour) return state;
      const nextStep = state.currentStep + 1;
      if (nextStep >= state.currentTour.steps.length) {
        return {
          ...state,
          isActive: false,
          currentTour: null,
          currentStep: 0
        };
      }
      return {
        ...state,
        currentStep: nextStep
      };

    case 'PREVIOUS_STEP':
      if (state.currentStep > 0) {
        return {
          ...state,
          currentStep: state.currentStep - 1
        };
      }
      return state;

    case 'SKIP_STEP':
      return onboardingReducer(state, { type: 'NEXT_STEP' });

    case 'FINISH_TOUR':
      return {
        ...state,
        isActive: false,
        currentTour: null,
        currentStep: 0
      };

    case 'PAUSE_TOUR':
      return {
        ...state,
        isActive: false
      };

    case 'RESUME_TOUR':
      return {
        ...state,
        isActive: true
      };

    case 'SET_USER_PERSONA':
      return {
        ...state,
        userPersona: action.payload.persona
      };

    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.payload.preferences
        }
      };

    case 'UPDATE_PROGRESS':
      const existingIndex = state.progress.findIndex(p => 
        p.tourId === action.payload.progress.tourId && 
        p.userId === action.payload.progress.userId
      );
      
      if (existingIndex >= 0) {
        const newProgress = [...state.progress];
        newProgress[existingIndex] = action.payload.progress;
        return {
          ...state,
          progress: newProgress
        };
      } else {
        return {
          ...state,
          progress: [...state.progress, action.payload.progress]
        };
      }

    default:
      return state;
  }
}

interface OnboardingManagerProps {
  children: React.ReactNode;
  userId: string;
}

export function OnboardingManager({ children, userId }: OnboardingManagerProps) {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);
  const [registeredTours, setRegisteredTours] = React.useState<OnboardingTour[]>([]);

  // Load user progress from storage
  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem(`onboarding_progress_${userId}`);
      if (savedProgress) {
        try {
          const progress = JSON.parse(savedProgress);
          progress.forEach((p: OnboardingProgress) => {
            dispatch({ type: 'UPDATE_PROGRESS', payload: { progress: p } });
          });
        } catch (error) {
          console.warn('Failed to parse onboarding progress:', error);
        }
      }

      const savedPreferences = localStorage.getItem(`onboarding_preferences_${userId}`);
      if (savedPreferences) {
        try {
          const preferences = JSON.parse(savedPreferences);
          dispatch({ type: 'UPDATE_PREFERENCES', payload: { preferences } });
        } catch (error) {
          console.warn('Failed to parse onboarding preferences:', error);
        }
      }
    } catch (error) {
      console.warn('Failed to access localStorage:', error);
    }
  }, [userId]);

  // Save progress to storage
  useEffect(() => {
    try {
      localStorage.setItem(`onboarding_progress_${userId}`, JSON.stringify(state.progress));
    } catch (error) {
      console.warn('Failed to save onboarding progress:', error);
    }
  }, [state.progress, userId]);

  // Save preferences to storage
  useEffect(() => {
    try {
      localStorage.setItem(`onboarding_preferences_${userId}`, JSON.stringify(state.preferences));
    } catch (error) {
      console.warn('Failed to save onboarding preferences:', error);
    }
  }, [state.preferences, userId]);

  const startTour = useCallback((tourId: string) => {
    const tour = registeredTours.find(t => t.id === tourId);
    if (!tour) {
      console.warn(`Tour with id "${tourId}" not found`);
      return;
    }

    dispatch({ type: 'START_TOUR', payload: { tour } });

    // Update progress
    const progress: OnboardingProgress = {
      userId,
      tourId,
      currentStep: 0,
      completedSteps: [],
      skippedSteps: [],
      startedAt: new Date(),
      lastInteraction: new Date(),
      completed: false,
      abandoned: false,
      learningPace: state.preferences.learningPace
    };

    dispatch({ type: 'UPDATE_PROGRESS', payload: { progress } });
  }, [registeredTours, userId, state.preferences.learningPace]);

  const nextStep = useCallback(() => {
    if (!state.currentTour) return;

    const currentStepId = state.currentTour.steps[state.currentStep]?.id;
    if (currentStepId) {
      const progress = state.progress.find(p => p.tourId === state.currentTour!.id && p.userId === userId);
      if (progress) {
        const updatedProgress: OnboardingProgress = {
          ...progress,
          currentStep: state.currentStep + 1,
          completedSteps: [...progress.completedSteps, currentStepId],
          lastInteraction: new Date(),
          completed: state.currentStep + 1 >= state.currentTour.steps.length
        };
        dispatch({ type: 'UPDATE_PROGRESS', payload: { progress: updatedProgress } });
      }
    }

    dispatch({ type: 'NEXT_STEP' });
  }, [state.currentTour, state.currentStep, state.progress, userId]);

  const previousStep = useCallback(() => {
    dispatch({ type: 'PREVIOUS_STEP' });
  }, []);

  const skipStep = useCallback(() => {
    if (!state.currentTour) return;

    const currentStepId = state.currentTour.steps[state.currentStep]?.id;
    if (currentStepId) {
      const progress = state.progress.find(p => p.tourId === state.currentTour!.id && p.userId === userId);
      if (progress) {
        const updatedProgress: OnboardingProgress = {
          ...progress,
          currentStep: state.currentStep + 1,
          skippedSteps: [...progress.skippedSteps, currentStepId],
          lastInteraction: new Date()
        };
        dispatch({ type: 'UPDATE_PROGRESS', payload: { progress: updatedProgress } });
      }
    }

    dispatch({ type: 'SKIP_STEP' });
  }, [state.currentTour, state.currentStep, state.progress, userId]);

  const finishTour = useCallback(() => {
    if (!state.currentTour) return;

    const progress = state.progress.find(p => p.tourId === state.currentTour!.id && p.userId === userId);
    if (progress) {
      const updatedProgress: OnboardingProgress = {
        ...progress,
        completed: true,
        lastInteraction: new Date()
      };
      dispatch({ type: 'UPDATE_PROGRESS', payload: { progress: updatedProgress } });
    }

    dispatch({ type: 'FINISH_TOUR' });
  }, [state.currentTour, state.progress, userId]);

  const pauseTour = useCallback(() => {
    dispatch({ type: 'PAUSE_TOUR' });
  }, []);

  const resumeTour = useCallback(() => {
    dispatch({ type: 'RESUME_TOUR' });
  }, []);

  const setUserPersona = useCallback((persona: UserPersona) => {
    dispatch({ type: 'SET_USER_PERSONA', payload: { persona } });
  }, []);

  const updatePreferences = useCallback((preferences: Partial<OnboardingState['preferences']>) => {
    dispatch({ type: 'UPDATE_PREFERENCES', payload: { preferences } });
  }, []);

  const registerTour = useCallback((tour: OnboardingTour) => {
    setRegisteredTours(prev => {
      const existingIndex = prev.findIndex(t => t.id === tour.id);
      if (existingIndex >= 0) {
        const newTours = [...prev];
        newTours[existingIndex] = tour;
        return newTours;
      }
      return [...prev, tour];
    });
  }, []);

  const getTourProgress = useCallback((tourId: string) => {
    return state.progress.find(p => p.tourId === tourId && p.userId === userId) || null;
  }, [state.progress, userId]);

  const contextValue: OnboardingContextType = {
    state,
    startTour,
    nextStep,
    previousStep,
    skipStep,
    finishTour,
    pauseTour,
    resumeTour,
    setUserPersona,
    updatePreferences,
    registerTour,
    getTourProgress
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingManager');
  }
  return context;
}