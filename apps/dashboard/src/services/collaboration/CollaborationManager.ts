/**
 * CollaborationManager
 * Central service for managing all collaboration and social features
 */

import { SharingService } from './SharingService';
import { AnnotationSystem } from './AnnotationSystem';
import { TeamInsightsService } from './TeamInsightsService';
import { AchievementSystem } from './AchievementSystem';
import { SocialLearningService } from './SocialLearningService';
import {
  ShareableContent,
  ShareRequest,
  SharedContent,
  Annotation,
  AnnotationTarget,
  TeamInsights,
  Achievement,
  UserAchievement,
  BestPractice,
  LearningRecommendation,
  User,
  CollaborationResponse,
  CollaborationEvent,
  CollaborationEventType
} from './types';

export class CollaborationManager {
  private sharingService: SharingService;
  private annotationSystem: AnnotationSystem;
  private teamInsightsService: TeamInsightsService;
  private achievementSystem: AchievementSystem;
  private socialLearningService: SocialLearningService;
  private eventListeners: Map<CollaborationEventType, Function[]> = new Map();

  constructor() {
    this.sharingService = new SharingService();
    this.annotationSystem = new AnnotationSystem();
    this.teamInsightsService = new TeamInsightsService();
    this.achievementSystem = new AchievementSystem();
    this.socialLearningService = new SocialLearningService();
    
    this.initializeEventHandlers();
  }

  // Content Sharing Methods
  async shareContent(
    content: ShareableContent, 
    shareRequest: ShareRequest
  ): Promise<CollaborationResponse<SharedContent>> {
    try {
      const result = await this.sharingService.shareContent(content, shareRequest);
      
      // Emit sharing event
      this.emitEvent('content_shared', {
        type: 'content_shared',
        userId: content.createdBy,
        targetId: content.id,
        targetType: content.type,
        data: { recipients: shareRequest.recipients },
        timestamp: new Date()
      });

      // Check for sharing achievements
      await this.checkSharingAchievements(content.createdBy);

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getSharedContent(userId: string): Promise<CollaborationResponse<SharedContent[]>> {
    try {
      const sharedContent = await this.sharingService.getSharedContent(userId);
      return { success: true, data: sharedContent };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async revokeShare(shareId: string, userId: string): Promise<CollaborationResponse<boolean>> {
    try {
      const result = await this.sharingService.revokeShare(shareId, userId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Annotation Methods
  async createAnnotation(
    targetType: AnnotationTarget,
    targetId: string,
    annotation: Partial<Annotation>
  ): Promise<CollaborationResponse<Annotation>> {
    try {
      const result = await this.annotationSystem.createAnnotation(targetType, targetId, annotation);
      
      // Emit annotation event
      this.emitEvent('annotation_created', {
        type: 'annotation_created',
        userId: annotation.authorId!,
        targetId,
        targetType,
        data: { annotationType: annotation.type },
        timestamp: new Date()
      });

      // Check for collaboration achievements
      await this.checkCollaborationAchievements(annotation.authorId!);

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getAnnotations(
    targetType: AnnotationTarget, 
    targetId: string
  ): Promise<CollaborationResponse<Annotation[]>> {
    try {
      const annotations = await this.annotationSystem.getAnnotations(targetType, targetId);
      return { success: true, data: annotations };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async replyToAnnotation(
    annotationId: string, 
    reply: { authorId: string; content: string }
  ): Promise<CollaborationResponse<Annotation>> {
    try {
      const result = await this.annotationSystem.replyToAnnotation(annotationId, reply);
      
      // Emit reply event
      this.emitEvent('annotation_replied', {
        type: 'annotation_replied',
        userId: reply.authorId,
        targetId: annotationId,
        targetType: 'annotation',
        data: { content: reply.content },
        timestamp: new Date()
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Team Insights Methods
  async getTeamInsights(
    teamId: string, 
    period: { start: Date; end: Date }
  ): Promise<CollaborationResponse<TeamInsights>> {
    try {
      const insights = await this.teamInsightsService.generateTeamInsights(teamId, period);
      
      // Emit insights generation event
      this.emitEvent('team_insights_generated', {
        type: 'team_insights_generated',
        userId: 'system',
        targetId: teamId,
        targetType: 'team',
        data: { period },
        timestamp: new Date()
      });

      return { success: true, data: insights };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getTeamComparisons(teamId: string): Promise<CollaborationResponse<any>> {
    try {
      const comparisons = await this.teamInsightsService.getTeamComparisons(teamId);
      return { success: true, data: comparisons };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Achievement Methods
  async getUserAchievements(userId: string): Promise<CollaborationResponse<UserAchievement[]>> {
    try {
      const achievements = await this.achievementSystem.getUserAchievements(userId);
      return { success: true, data: achievements };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getAvailableAchievements(): Promise<CollaborationResponse<Achievement[]>> {
    try {
      const achievements = await this.achievementSystem.getAvailableAchievements();
      return { success: true, data: achievements };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async celebrateAchievement(userId: string, achievementId: string): Promise<void> {
    // Emit achievement event
    this.emitEvent('achievement_unlocked', {
      type: 'achievement_unlocked',
      userId,
      targetId: achievementId,
      targetType: 'achievement',
      data: { celebrationType: 'unlock' },
      timestamp: new Date()
    });

    // Trigger celebration UI (handled by event listeners)
  }

  // Social Learning Methods
  async getBestPractices(
    category?: string, 
    difficulty?: string
  ): Promise<CollaborationResponse<BestPractice[]>> {
    try {
      const practices = await this.socialLearningService.getBestPractices(category, difficulty);
      return { success: true, data: practices };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getLearningRecommendations(
    userId: string
  ): Promise<CollaborationResponse<LearningRecommendation[]>> {
    try {
      const recommendations = await this.socialLearningService.getPersonalizedRecommendations(userId);
      return { success: true, data: recommendations };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async recordBestPracticeUsage(
    userId: string, 
    bestPracticeId: string, 
    action: 'view' | 'implement' | 'rate'
  ): Promise<CollaborationResponse<boolean>> {
    try {
      const result = await this.socialLearningService.recordUsage(userId, bestPracticeId, action);
      
      // Emit learning event
      this.emitEvent('best_practice_viewed', {
        type: 'best_practice_viewed',
        userId,
        targetId: bestPracticeId,
        targetType: 'best_practice',
        data: { action },
        timestamp: new Date()
      });

      // Check for learning achievements
      await this.checkLearningAchievements(userId);

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Event Management
  addEventListener(eventType: CollaborationEventType, callback: Function): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  removeEventListener(eventType: CollaborationEventType, callback: Function): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(eventType: CollaborationEventType, event: CollaborationEvent): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  }

  // Achievement Checking Methods
  private async checkSharingAchievements(userId: string): Promise<void> {
    await this.achievementSystem.checkAchievements(userId, 'sharing');
  }

  private async checkCollaborationAchievements(userId: string): Promise<void> {
    await this.achievementSystem.checkAchievements(userId, 'collaboration');
  }

  private async checkLearningAchievements(userId: string): Promise<void> {
    await this.achievementSystem.checkAchievements(userId, 'learning');
  }

  // Initialization
  private initializeEventHandlers(): void {
    // Set up cross-service event handling
    this.addEventListener('content_shared', (event: CollaborationEvent) => {
      // Update user engagement metrics
      this.teamInsightsService.recordUserActivity(event.userId, 'content_shared');
    });

    this.addEventListener('annotation_created', (event: CollaborationEvent) => {
      // Update collaboration metrics
      this.teamInsightsService.recordUserActivity(event.userId, 'annotation_created');
    });

    this.addEventListener('achievement_unlocked', (event: CollaborationEvent) => {
      // Trigger celebration and notifications
      this.celebrateUserAchievement(event.userId, event.targetId);
    });
  }

  private async celebrateUserAchievement(userId: string, achievementId: string): Promise<void> {
    // Implementation for achievement celebration
    // This would trigger UI animations, notifications, etc.
    console.log(`🎉 User ${userId} unlocked achievement ${achievementId}!`);
  }

  // Utility Methods
  async getCollaborationStats(userId: string): Promise<CollaborationResponse<any>> {
    try {
      const stats = {
        sharesCreated: await this.sharingService.getUserShareCount(userId),
        annotationsCreated: await this.annotationSystem.getUserAnnotationCount(userId),
        achievementsUnlocked: await this.achievementSystem.getUserAchievementCount(userId),
        bestPracticesViewed: await this.socialLearningService.getUserLearningStats(userId)
      };
      
      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async searchCollaborationContent(
    query: string, 
    filters?: { type?: string; author?: string; dateRange?: { start: Date; end: Date } }
  ): Promise<CollaborationResponse<any[]>> {
    try {
      // Implement cross-service search
      const results = await Promise.all([
        this.sharingService.searchSharedContent(query, filters),
        this.annotationSystem.searchAnnotations(query, filters),
        this.socialLearningService.searchBestPractices(query, filters)
      ]);

      const combinedResults = results.flat();
      return { success: true, data: combinedResults };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default CollaborationManager;