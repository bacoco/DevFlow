export { OnboardingManager, useOnboarding } from './OnboardingManager';
export { ProductTour } from './ProductTour';
export { ContextualTooltip, useTooltips, TooltipManager } from './ContextualTooltip';
export { HelpSystem } from './HelpSystem';
export { ProgressiveOnboarding, useProgressiveOnboarding } from './ProgressiveOnboarding';
export { ErrorRecovery, useErrorRecovery } from './ErrorRecovery';

export type {
  OnboardingStep,
  OnboardingAction,
  OnboardingCondition,
  OnboardingTour,
  OnboardingTrigger,
  UserPersona,
  OnboardingProgress,
  OnboardingState,
  TooltipConfig,
  HelpContent,
  ErrorRecoveryAction
} from './types';