export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<OnboardingStepProps>;
  isRequired: boolean;
  isCompleted: boolean;
}

export interface OnboardingStepProps {
  onNext: () => void;
  onPrevious: () => void;
  onComplete: (data: any) => void;
  stepData: any;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export interface OnboardingProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  stepData: Record<string, any>;
}

export interface OnboardingData {
  user: {
    role: string;
    team?: string;
    experience: string;
  };
  privacy: {
    ideTelemetry: boolean;
    gitActivity: boolean;
    communicationData: boolean;
    granularControls: Record<string, boolean>;
    anonymization: 'none' | 'partial' | 'full';
  };
  dashboard: {
    preferredWidgets: string[];
    layout: 'compact' | 'spacious';
    theme: 'light' | 'dark' | 'auto';
    autoRefresh: boolean;
  };
  notifications: {
    email: boolean;
    inApp: boolean;
    slack: boolean;
    frequency: 'immediate' | 'hourly' | 'daily';
  };
}

export interface PrivacyExplanation {
  setting: string;
  title: string;
  description: string;
  example: string;
  impact: 'low' | 'medium' | 'high';
  benefits: string[];
  risks: string[];
}

export interface RoleBasedRecommendation {
  role: string;
  recommendedWidgets: string[];
  dashboardLayout: any;
  privacyDefaults: Partial<OnboardingData['privacy']>;
  notificationDefaults: Partial<OnboardingData['notifications']>;
}