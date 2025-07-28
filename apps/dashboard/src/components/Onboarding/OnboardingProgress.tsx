import React from 'react';
import { OnboardingProgress as ProgressType } from '../../types/onboarding';
import { Check } from 'lucide-react';

interface OnboardingProgressProps {
  progress: ProgressType;
  className?: string;
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  progress,
  className = ''
}) => {
  const progressPercentage = (progress.currentStep / progress.totalSteps) * 100;

  return (
    <div className={`onboarding-progress ${className}`}>
      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          Step {progress.currentStep} of {progress.totalSteps}
        </span>
        <span className="text-sm text-gray-500">
          {Math.round(progressPercentage)}% complete
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between">
        {Array.from({ length: progress.totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < progress.currentStep;
          const isCurrent = stepNumber === progress.currentStep;
          
          return (
            <div
              key={stepNumber}
              className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                isCompleted
                  ? 'bg-green-500 border-green-500 text-white'
                  : isCurrent
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-400'
              }`}
            >
              {isCompleted ? (
                <Check size={16} />
              ) : (
                <span className="text-sm font-medium">{stepNumber}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OnboardingProgress;