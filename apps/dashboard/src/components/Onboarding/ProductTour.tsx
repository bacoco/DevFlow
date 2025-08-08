import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOnboarding } from './OnboardingManager';
import { OnboardingStep } from './types';

interface ProductTourProps {
  className?: string;
}

interface TourOverlayProps {
  step: OnboardingStep;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onFinish: () => void;
  currentStepIndex: number;
  totalSteps: number;
  canGoPrevious: boolean;
}

function TourOverlay({
  step,
  onNext,
  onPrevious,
  onSkip,
  onFinish,
  currentStepIndex,
  totalSteps,
  canGoPrevious
}: TourOverlayProps) {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [overlayPosition, setOverlayPosition] = useState({ top: 0, left: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = document.querySelector(step.target) as HTMLElement;
    setTargetElement(element);

    if (element) {
      // Scroll element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Add highlight class
      element.classList.add('onboarding-highlight');
      
      // Calculate overlay position
      const rect = element.getBoundingClientRect();
      const overlayRect = overlayRef.current?.getBoundingClientRect();
      
      let top = rect.bottom + 10;
      let left = rect.left;

      // Adjust position based on step.position
      switch (step.position) {
        case 'top':
          top = rect.top - (overlayRect?.height || 0) - 10;
          break;
        case 'left':
          top = rect.top;
          left = rect.left - (overlayRect?.width || 0) - 10;
          break;
        case 'right':
          top = rect.top;
          left = rect.right + 10;
          break;
        case 'center':
          top = window.innerHeight / 2 - (overlayRect?.height || 0) / 2;
          left = window.innerWidth / 2 - (overlayRect?.width || 0) / 2;
          break;
        default: // bottom
          top = rect.bottom + 10;
      }

      // Ensure overlay stays within viewport
      const maxTop = window.innerHeight - (overlayRect?.height || 0) - 20;
      const maxLeft = window.innerWidth - (overlayRect?.width || 0) - 20;
      
      top = Math.max(20, Math.min(top, maxTop));
      left = Math.max(20, Math.min(left, maxLeft));

      setOverlayPosition({ top, left });
    }

    return () => {
      if (element) {
        element.classList.remove('onboarding-highlight');
      }
    };
  }, [step.target, step.position]);

  const handleAction = (action: any) => {
    if (action.handler) {
      action.handler();
    }

    switch (action.type) {
      case 'next':
        onNext();
        break;
      case 'skip':
        onSkip();
        break;
      case 'finish':
        onFinish();
        break;
    }
  };

  const isLastStep = currentStepIndex === totalSteps - 1;

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
      
      {/* Tour overlay */}
      <div
        ref={overlayRef}
        className="fixed z-50 bg-white rounded-lg shadow-xl border max-w-md"
        style={{
          top: overlayPosition.top,
          left: overlayPosition.left
        }}
      >
        {/* Progress indicator */}
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span>Step {currentStepIndex + 1} of {totalSteps}</span>
            <div className="flex space-x-1">
              {Array.from({ length: totalSteps }).map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index <= currentStepIndex ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {step.title}
          </h3>
          
          {step.description && (
            <p className="text-sm text-gray-600 mb-3">
              {step.description}
            </p>
          )}

          <div className="text-sm text-gray-700 mb-4">
            {step.content.text}
          </div>

          {/* Media content */}
          {step.content.media && (
            <div className="mb-4">
              {step.content.media.type === 'image' ? (
                <img
                  src={step.content.media.url}
                  alt={step.content.media.alt || step.title}
                  className="w-full rounded-md"
                />
              ) : (
                <video
                  src={step.content.media.url}
                  controls
                  className="w-full rounded-md"
                  poster={step.content.media.alt}
                >
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {canGoPrevious && (
                <button
                  onClick={onPrevious}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Previous
                </button>
              )}
              
              {step.skippable && (
                <button
                  onClick={onSkip}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Skip
                </button>
              )}
            </div>

            <div className="flex space-x-2">
              {step.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleAction(action)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    action.variant === 'primary'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : action.variant === 'secondary'
                      ? 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {action.label}
                </button>
              ))}
              
              {step.actions.length === 0 && (
                <button
                  onClick={isLastStep ? onFinish : onNext}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {isLastStep ? 'Finish' : 'Next'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

export function ProductTour({ className }: ProductTourProps) {
  const { state, nextStep, previousStep, skipStep, finishTour } = useOnboarding();

  if (!state.isActive || !state.currentTour) {
    return null;
  }

  const currentStep = state.currentTour.steps[state.currentStep];
  if (!currentStep) {
    return null;
  }

  return (
    <div className={className}>
      <TourOverlay
        step={currentStep}
        onNext={nextStep}
        onPrevious={previousStep}
        onSkip={skipStep}
        onFinish={finishTour}
        currentStepIndex={state.currentStep}
        totalSteps={state.currentTour.steps.length}
        canGoPrevious={state.currentStep > 0}
      />
      
      {/* CSS for highlighting */}
      <style jsx global>{`
        .onboarding-highlight {
          position: relative;
          z-index: 45;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
          border-radius: 4px;
          transition: box-shadow 0.3s ease;
        }
        
        .onboarding-highlight::before {
          content: '';
          position: absolute;
          inset: -4px;
          border: 2px solid #3b82f6;
          border-radius: 6px;
          pointer-events: none;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}