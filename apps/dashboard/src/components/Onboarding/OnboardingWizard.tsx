import React, { useState, useEffect } from 'react';
import { OnboardingStep, OnboardingProgress, OnboardingData } from '../../types/onboarding';
import { WelcomeStep } from './steps/WelcomeStep';
import { RoleSelectionStep } from './steps/RoleSelectionStep';
import { PrivacySettingsStep } from './steps/PrivacySettingsStep';
import { DashboardSetupStep } from './steps/DashboardSetupStep';
import { NotificationPreferencesStep } from './steps/NotificationPreferencesStep';
import { CompletionStep } from './steps/CompletionStep';
import { OnboardingProgress as ProgressComponent } from './OnboardingProgress';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface OnboardingWizardProps {
  isOpen: boolean;
  onComplete: (data: OnboardingData) => void;
  onSkip?: () => void;
  className?: string;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  isOpen,
  onComplete,
  onSkip,
  className = ''
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({});
  const [isLoading, setIsLoading] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to DevFlow Intelligence',
      description: 'Let\'s get you set up with personalized productivity insights',
      component: WelcomeStep,
      isRequired: false,
      isCompleted: false,
    },
    {
      id: 'role',
      title: 'Tell us about your role',
      description: 'This helps us customize your dashboard and recommendations',
      component: RoleSelectionStep,
      isRequired: true,
      isCompleted: false,
    },
    {
      id: 'privacy',
      title: 'Privacy & Data Collection',
      description: 'Configure what data we collect and how it\'s used',
      component: PrivacySettingsStep,
      isRequired: true,
      isCompleted: false,
    },
    {
      id: 'dashboard',
      title: 'Dashboard Setup',
      description: 'Choose your preferred widgets and layout',
      component: DashboardSetupStep,
      isRequired: true,
      isCompleted: false,
    },
    {
      id: 'notifications',
      title: 'Notification Preferences',
      description: 'Set up how you want to receive alerts and updates',
      component: NotificationPreferencesStep,
      isRequired: false,
      isCompleted: false,
    },
    {
      id: 'completion',
      title: 'You\'re all set!',
      description: 'Your personalized dashboard is ready',
      component: CompletionStep,
      isRequired: false,
      isCompleted: false,
    },
  ];

  const [stepsState, setStepsState] = useState(steps);

  const currentStep = stepsState[currentStepIndex];
  const progress: OnboardingProgress = {
    currentStep: currentStepIndex + 1,
    totalSteps: stepsState.length,
    completedSteps: stepsState.filter(step => step.isCompleted).map(step => step.id),
    stepData: onboardingData,
  };

  const handleNext = () => {
    if (currentStepIndex < stepsState.length - 1) {
      // Mark current step as completed
      const updatedSteps = [...stepsState];
      updatedSteps[currentStepIndex].isCompleted = true;
      setStepsState(updatedSteps);
      
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleStepComplete = (stepId: string, data: any) => {
    setOnboardingData(prev => ({
      ...prev,
      [stepId]: data,
    }));

    // Mark step as completed
    const updatedSteps = [...stepsState];
    const stepIndex = updatedSteps.findIndex(step => step.id === stepId);
    if (stepIndex !== -1) {
      updatedSteps[stepIndex].isCompleted = true;
      setStepsState(updatedSteps);
    }
  };

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      // Validate required data
      const completeData: OnboardingData = {
        user: onboardingData.role || {
          role: 'developer',
          experience: 'intermediate',
        },
        privacy: onboardingData.privacy || {
          ideTelemetry: true,
          gitActivity: true,
          communicationData: false,
          granularControls: {},
          anonymization: 'partial',
        },
        dashboard: onboardingData.dashboard || {
          preferredWidgets: ['productivity_score', 'time_in_flow'],
          layout: 'spacious',
          theme: 'auto',
          autoRefresh: true,
        },
        notifications: onboardingData.notifications || {
          email: false,
          inApp: true,
          slack: false,
          frequency: 'daily',
        },
      };

      await onComplete(completeData);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
  };

  const canProceed = () => {
    if (!currentStep.isRequired) return true;
    return currentStep.isCompleted || onboardingData[currentStep.id];
  };

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === stepsState.length - 1;

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {currentStep.title}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {currentStep.description}
              </p>
            </div>
            {!isFirstStep && !isLastStep && (
              <button
                onClick={handleSkip}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Skip setup
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <ProgressComponent progress={progress} />
        </div>

        {/* Step Content */}
        <div className="px-6 py-6 overflow-y-auto max-h-[60vh]">
          <currentStep.component
            onNext={handleNext}
            onPrevious={handlePrevious}
            onComplete={(data) => handleStepComplete(currentStep.id, data)}
            stepData={onboardingData[currentStep.id]}
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={isFirstStep}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <div className="flex items-center space-x-3">
              {isLastStep ? (
                <button
                  onClick={handleFinish}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Finishing...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Complete Setup</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;