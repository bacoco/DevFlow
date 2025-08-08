export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector for the element to highlight
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  content: {
    text: string;
    media?: {
      type: 'image' | 'video';
      url: string;
      alt?: string;
    };
  };
  actions: OnboardingAction[];
  conditions?: OnboardingCondition[];
  skippable: boolean;
  optional: boolean;
}

export interface OnboardingAction {
  type: 'next' | 'skip' | 'finish' | 'custom';
  label: string;
  handler?: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export interface OnboardingCondition {
  type: 'element_exists' | 'user_action' | 'time_spent' | 'custom';
  value: any;
  validator?: () => boolean | Promise<boolean>;
}

export interface OnboardingTour {
  id: string;
  name: string;
  description: string;
  steps: OnboardingStep[];
  triggers: OnboardingTrigger[];
  userPersona?: UserPersona;
  priority: number;
  version: string;
}

export interface OnboardingTrigger {
  type: 'first_visit' | 'feature_access' | 'user_request' | 'time_based' | 'custom';
  condition: any;
  delay?: number;
}

export interface UserPersona {
  id: string;
  name: string;
  characteristics: string[];
  learningPace: 'fast' | 'medium' | 'slow';
  preferredContentType: 'text' | 'visual' | 'interactive';
}

export interface OnboardingProgress {
  userId: string;
  tourId: string;
  currentStep: number;
  completedSteps: string[];
  skippedSteps: string[];
  startedAt: Date;
  lastInteraction: Date;
  completed: boolean;
  abandoned: boolean;
  learningPace: 'fast' | 'medium' | 'slow';
}

export interface TooltipConfig {
  id: string;
  target: string;
  content: string | React.ReactNode;
  position: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  trigger: 'hover' | 'click' | 'focus' | 'manual';
  delay?: number;
  dismissible: boolean;
  persistent: boolean;
  maxWidth?: number;
  className?: string;
}

export interface HelpContent {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  searchKeywords: string[];
  media?: {
    type: 'image' | 'video' | 'interactive';
    url: string;
    thumbnail?: string;
    duration?: number;
  };
  relatedContent: string[];
  lastUpdated: Date;
  popularity: number;
}

export interface ErrorRecoveryAction {
  id: string;
  errorType: string;
  title: string;
  description: string;
  actions: {
    label: string;
    handler: () => void | Promise<void>;
    type: 'primary' | 'secondary';
  }[];
  preventionTips?: string[];
  relatedHelp?: string[];
}

export interface OnboardingState {
  currentTour: OnboardingTour | null;
  currentStep: number;
  isActive: boolean;
  progress: OnboardingProgress[];
  userPersona: UserPersona | null;
  preferences: {
    autoStart: boolean;
    showTooltips: boolean;
    learningPace: 'fast' | 'medium' | 'slow';
  };
}