/**
 * Collaboration Components Index
 * Exports all collaboration-related components and services
 */

// Main Components
export { CollaborationHub } from './CollaborationHub';
export { SharePanel } from './SharePanel';

// Services
export { collaborationManager } from '../../services/collaboration/CollaborationManager';
export { sharingService } from '../../services/collaboration/SharingService';
export { annotationSystem } from '../../services/collaboration/AnnotationSystem';
export { teamInsightsService } from '../../services/collaboration/TeamInsightsService';
export { achievementSystem } from '../../services/collaboration/AchievementSystem';
export { socialLearningService } from '../../services/collaboration/SocialLearningService';

// Types
export type {
  User,
  Team,
  ShareableContent,
  ShareResult,
  SharePermission,
  Permission,
  Annotation,
  AnnotationTarget,
  AnnotationType,
  TeamInsights,
  Achievement,
  UserAchievement,
  Challenge,
  BestPractice,
  SuccessStory,
  LearningRecommendation,
  CollaborationEvent,
  CollaborationNotification,
  PrivacyLevel
} from '../../services/collaboration/types';