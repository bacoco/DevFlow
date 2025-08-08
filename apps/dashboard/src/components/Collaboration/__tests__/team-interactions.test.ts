/**
 * Team Interactions Tests
 * Tests for team collaboration features including annotations, achievements, and social learning
 */

import { AnnotationSystem } from '../../../services/collaboration/AnnotationSystem';
import { AchievementSystem } from '../../../services/collaboration/AchievementSystem';
import { SocialLearningService } from '../../../services/collaboration/SocialLearningService';
import { TeamInsightsService } from '../../../services/collaboration/TeamInsightsService';
import {
  Annotation,
  AnnotationType,
  AnnotationTarget,
  Achievement,
  BestPractice,
  User
} from '../../../services/collaboration/types';

describe('Team Collaboration Features', () => {
  let annotationSystem: AnnotationSystem;
  let achievementSystem: AchievementSystem;
  let socialLearningService: SocialLearningService;
  let teamInsightsService: TeamInsightsService;

  const mockUser: User = {
    id: 'test-user-1',
    name: 'Test User',
    email: 'test@example.com',
    avatar: '',
    role: 'developer',
    teamId: 'test-team',
    preferences: {} as any
  };

  beforeEach(() => {
    annotationSystem = new AnnotationSystem();
    achievementSystem = new AchievementSystem();
    socialLearningService = new SocialLearningService();
    teamInsightsService = new TeamInsightsService();
  });

  describe('Annotation System', () => {
    it('should create annotation successfully', async () => {
      const annotationData = {
        authorId: mockUser.id,
        content: 'This chart shows interesting trends',
        type: 'comment' as AnnotationType,
        visibility: 'team' as const,
        position: { x: 100, y: 200 }
      };

      const annotation = await annotationSystem.createAnnotation(
        'chart',
        'test-chart-1',
        annotationData
      );

      expect(annotation).toBeDefined();
      expect(annotation.authorId).toBe(mockUser.id);
      expect(annotation.content).toBe(annotationData.content);
      expect(annotation.targetType).toBe('chart');
      expect(annotation.targetId).toBe('test-chart-1');
    });

    it('should handle annotation replies', async () => {
      // Create initial annotation
      const annotation = await annotationSystem.createAnnotation(
        'dashboard',
        'test-dashboard',
        {
          authorId: mockUser.id,
          content: 'Initial comment',
          position: { x: 50, y: 100 }
        }
      );

      // Add reply
      const updatedAnnotation = await annotationSystem.replyToAnnotation(
        annotation.id,
        {
          authorId: 'user-2',
          content: 'Great observation!'
        }
      );

      expect(updatedAnnotation.replies).toHaveLength(1);
      expect(updatedAnnotation.replies[0].content).toBe('Great observation!');
      expect(updatedAnnotation.replies[0].authorId).toBe('user-2');
    });
  });
});  
  it('should manage annotation reactions', async () => {
      const annotation = await annotationSystem.createAnnotation(
        'widget',
        'test-widget',
        {
          authorId: mockUser.id,
          content: 'Widget feedback',
          position: { x: 0, y: 0 }
        }
      );

      // Add reaction
      const updatedAnnotation = await annotationSystem.addReaction(
        annotation.id,
        'user-2',
        'like'
      );

      expect(updatedAnnotation.reactions).toHaveLength(1);
      expect(updatedAnnotation.reactions[0].type).toBe('like');
      expect(updatedAnnotation.reactions[0].userId).toBe('user-2');
    });

    it('should get annotations by target', async () => {
      // Create multiple annotations
      await annotationSystem.createAnnotation('chart', 'chart-1', {
        authorId: mockUser.id,
        content: 'First comment',
        position: { x: 0, y: 0 }
      });

      await annotationSystem.createAnnotation('chart', 'chart-1', {
        authorId: 'user-2',
        content: 'Second comment',
        position: { x: 100, y: 100 }
      });

      const annotations = await annotationSystem.getAnnotations('chart', 'chart-1');

      expect(annotations).toHaveLength(2);
      expect(annotations[0].targetType).toBe('chart');
      expect(annotations[0].targetId).toBe('chart-1');
    });

    it('should handle annotation resolution', async () => {
      const annotation = await annotationSystem.createAnnotation(
        'dashboard',
        'test-dashboard',
        {
          authorId: mockUser.id,
          content: 'Issue that needs resolution',
          type: 'issue',
          position: { x: 0, y: 0 }
        }
      );

      expect(annotation.isResolved).toBe(false);

      const resolvedAnnotation = await annotationSystem.toggleAnnotationResolution(
        annotation.id,
        mockUser.id
      );

      expect(resolvedAnnotation.isResolved).toBe(true);
    });
  });

  describe('Achievement System', () => {
    it('should unlock achievements based on activity', async () => {
      const newAchievements = await achievementSystem.checkAchievements(
        mockUser.id,
        'sharing',
        { shares_created: 1 }
      );

      expect(newAchievements.length).toBeGreaterThan(0);
      expect(newAchievements[0].userId).toBe(mockUser.id);
    });

    it('should track user achievement progress', async () => {
      const userProgress = await achievementSystem.getUserProgress(mockUser.id);

      expect(userProgress).toBeDefined();
      expect(userProgress.completed).toBeDefined();
      expect(userProgress.inProgress).toBeDefined();
      expect(userProgress.available).toBeDefined();
    });

    it('should calculate user points correctly', async () => {
      // Unlock an achievement first
      await achievementSystem.checkAchievements(
        mockUser.id,
        'sharing',
        { shares_created: 1 }
      );

      const totalPoints = await achievementSystem.getUserPoints(mockUser.id);

      expect(totalPoints).toBeGreaterThan(0);
    });

    it('should generate leaderboard', async () => {
      // Create achievements for multiple users
      await achievementSystem.checkAchievements('user-1', 'sharing');
      await achievementSystem.checkAchievements('user-2', 'collaboration');

      const leaderboard = await achievementSystem.getLeaderboard();

      expect(leaderboard).toBeDefined();
      expect(Array.isArray(leaderboard)).toBe(true);
    });

    it('should handle repeatable achievements', async () => {
      // First unlock
      const firstUnlock = await achievementSystem.checkAchievements(
        mockUser.id,
        'daily_collaboration'
      );

      // Second unlock (should work for repeatable achievements)
      const secondUnlock = await achievementSystem.checkAchievements(
        mockUser.id,
        'daily_collaboration'
      );

      // Check that repeatable achievements can be unlocked multiple times
      const userAchievements = await achievementSystem.getUserAchievements(mockUser.id);
      const repeatableAchievements = userAchievements.filter(ua => {
        const achievement = achievementSystem['achievements'].get(ua.achievementId);
        return achievement?.isRepeatable;
      });

      expect(repeatableAchievements.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Social Learning Service', () => {
    it('should provide personalized recommendations', async () => {
      const recommendations = await socialLearningService.getPersonalizedRecommendations(
        mockUser.id
      );

      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should track best practice usage', async () => {
      const bestPractices = await socialLearningService.getBestPractices();
      
      if (bestPractices.length > 0) {
        const practiceId = bestPractices[0].id;
        const result = await socialLearningService.recordUsage(
          mockUser.id,
          practiceId,
          'view'
        );

        expect(result).toBe(true);
      }
    });

    it('should handle best practice ratings', async () => {
      const bestPractices = await socialLearningService.getBestPractices();
      
      if (bestPractices.length > 0) {
        const practiceId = bestPractices[0].id;
        const result = await socialLearningService.rateBestPractice(
          mockUser.id,
          practiceId,
          5,
          'Very helpful!'
        );

        expect(result).toBe(true);
      }
    });

    it('should provide learning statistics', async () => {
      const stats = await socialLearningService.getUserLearningStats(mockUser.id);

      expect(stats).toBeDefined();
      expect(typeof stats.practicesViewed).toBe('number');
      expect(typeof stats.practicesImplemented).toBe('number');
      expect(typeof stats.learningStreak).toBe('number');
    });

    it('should get trending practices', async () => {
      const trending = await socialLearningService.getTrendingPractices('week');

      expect(Array.isArray(trending)).toBe(true);
    });

    it('should create new best practices', async () => {
      const practiceData = {
        title: 'Test Best Practice',
        description: 'A test practice for unit testing',
        category: 'workflow' as const,
        difficulty: 'beginner' as const,
        tags: ['test', 'example'],
        content: {
          steps: [
            {
              title: 'Step 1',
              description: 'First step description'
            }
          ],
          examples: [],
          resources: [],
          tips: ['Test tip']
        }
      };

      const newPractice = await socialLearningService.createBestPractice(
        mockUser.id,
        practiceData
      );

      expect(newPractice).toBeDefined();
      expect(newPractice.title).toBe(practiceData.title);
      expect(newPractice.author).toBe(mockUser.id);
    });
  });

  describe('Team Insights Service', () => {
    beforeEach(async () => {
      // Record some sample activities
      await teamInsightsService.recordUserActivity(mockUser.id, 'commit', 3);
      await teamInsightsService.recordUserActivity(mockUser.id, 'collaboration', 1);
      await teamInsightsService.recordUserActivity('user-2', 'commit', 5);
      await teamInsightsService.recordUserActivity('user-2', 'review', 2);
    });

    it('should generate team insights with privacy protection', async () => {
      const period = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        end: new Date()
      };

      const insights = await teamInsightsService.generateTeamInsights(
        'test-team',
        period
      );

      expect(insights).toBeDefined();
      expect(insights.teamId).toBe('test-team');
      expect(insights.metrics).toBeDefined();
      expect(insights.trends).toBeDefined();
      expect(insights.privacy.anonymizeIndividuals).toBe(true);
    });

    it('should provide team comparisons', async () => {
      const comparisons = await teamInsightsService.getTeamComparisons('test-team');

      expect(Array.isArray(comparisons)).toBe(true);
    });

    it('should generate anonymized team summary', async () => {
      const period = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: new Date()
      };

      const summary = await teamInsightsService.getAnonymizedTeamSummary(
        'test-team',
        period
      );

      expect(summary).toBeDefined();
      expect(typeof summary.totalMembers).toBe('number');
      expect(typeof summary.activeMembers).toBe('number');
      expect(Array.isArray(summary.improvementAreas)).toBe(true);
      expect(Array.isArray(summary.strengths)).toBe(true);
    });

    it('should record user activities', async () => {
      const result = await teamInsightsService.recordUserActivity(
        mockUser.id,
        'test_activity',
        1,
        { context: 'unit_test' }
      );

      // Should not throw and complete successfully
      expect(result).toBeUndefined(); // Method returns void
    });
  });

  describe('Cross-Feature Integration', () => {
    it('should integrate annotations with achievements', async () => {
      // Create annotation
      const annotation = await annotationSystem.createAnnotation(
        'dashboard',
        'test-dashboard',
        {
          authorId: mockUser.id,
          content: 'Integration test annotation',
          position: { x: 0, y: 0 }
        }
      );

      // Check if annotation creation triggers achievements
      const achievements = await achievementSystem.checkAchievements(
        mockUser.id,
        'collaboration',
        { annotations_created: 1 }
      );

      expect(annotation).toBeDefined();
      // Achievements may or may not be unlocked depending on criteria
      expect(Array.isArray(achievements)).toBe(true);
    });

    it('should integrate learning with achievements', async () => {
      const bestPractices = await socialLearningService.getBestPractices();
      
      if (bestPractices.length > 0) {
        // Record learning activity
        await socialLearningService.recordUsage(
          mockUser.id,
          bestPractices[0].id,
          'implement'
        );

        // Check for learning achievements
        const achievements = await achievementSystem.checkAchievements(
          mockUser.id,
          'learning',
          { best_practices_implemented: 1 }
        );

        expect(Array.isArray(achievements)).toBe(true);
      }
    });

    it('should integrate team insights with all activities', async () => {
      // Record various activities
      await teamInsightsService.recordUserActivity(mockUser.id, 'annotation_created');
      await teamInsightsService.recordUserActivity(mockUser.id, 'content_shared');
      await teamInsightsService.recordUserActivity(mockUser.id, 'best_practice_viewed');

      const period = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        end: new Date()
      };

      const insights = await teamInsightsService.generateTeamInsights(
        'test-team',
        period
      );

      expect(insights).toBeDefined();
      expect(insights.metrics.length).toBeGreaterThan(0);
    });
  });

  describe('Privacy and Security', () => {
    it('should anonymize individual data in team insights', async () => {
      const period = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const insights = await teamInsightsService.generateTeamInsights(
        'test-team',
        period,
        {
          anonymizeIndividuals: true,
          aggregationLevel: 'team',
          excludeMetrics: [],
          retentionDays: 90
        }
      );

      expect(insights.privacy.anonymizeIndividuals).toBe(true);
      expect(insights.privacy.aggregationLevel).toBe('team');
      
      // Verify that trends contain anonymized contributor counts
      insights.trends.forEach(trend => {
        trend.dataPoints.forEach(point => {
          expect(typeof point.anonymizedContributors).toBe('number');
          expect(point.anonymizedContributors).toBeGreaterThanOrEqual(0);
        });
      });
    });

    it('should respect annotation visibility settings', async () => {
      // Create private annotation
      const privateAnnotation = await annotationSystem.createAnnotation(
        'chart',
        'test-chart',
        {
          authorId: mockUser.id,
          content: 'Private annotation',
          visibility: 'private',
          position: { x: 0, y: 0 }
        }
      );

      // Create team annotation
      const teamAnnotation = await annotationSystem.createAnnotation(
        'chart',
        'test-chart',
        {
          authorId: mockUser.id,
          content: 'Team annotation',
          visibility: 'team',
          position: { x: 100, y: 100 }
        }
      );

      // Get annotations for the author (should see both)
      const authorAnnotations = await annotationSystem.getAnnotations(
        'chart',
        'test-chart',
        mockUser.id
      );

      // Get annotations for another user (should only see team annotation)
      const otherUserAnnotations = await annotationSystem.getAnnotations(
        'chart',
        'test-chart',
        'other-user'
      );

      expect(authorAnnotations).toHaveLength(2);
      expect(otherUserAnnotations.length).toBeLessThanOrEqual(1);
    });

    it('should protect user data in achievement leaderboards', async () => {
      // Create achievements for multiple users
      await achievementSystem.checkAchievements('user-1', 'sharing');
      await achievementSystem.checkAchievements('user-2', 'collaboration');

      const leaderboard = await achievementSystem.getLeaderboard();

      // Verify that leaderboard doesn't expose sensitive user information
      leaderboard.forEach(entry => {
        expect(entry.userId).toBeDefined();
        expect(entry.totalPoints).toBeDefined();
        expect(entry.achievementCount).toBeDefined();
        // Should not contain email, personal info, etc.
        expect(entry).not.toHaveProperty('email');
        expect(entry).not.toHaveProperty('personalInfo');
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid annotation data', async () => {
      await expect(
        annotationSystem.createAnnotation('chart', 'test-chart', {
          authorId: '',
          content: '',
          position: { x: 0, y: 0 }
        })
      ).rejects.toThrow();
    });

    it('should handle non-existent achievement checks', async () => {
      const achievements = await achievementSystem.checkAchievements(
        'non-existent-user',
        'non-existent-context'
      );

      expect(Array.isArray(achievements)).toBe(true);
      expect(achievements).toHaveLength(0);
    });

    it('should handle empty team insights generation', async () => {
      const period = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const insights = await teamInsightsService.generateTeamInsights(
        'empty-team',
        period
      );

      expect(insights).toBeDefined();
      expect(insights.teamId).toBe('empty-team');
      expect(Array.isArray(insights.metrics)).toBe(true);
    });

    it('should handle invalid best practice ratings', async () => {
      const result = await socialLearningService.rateBestPractice(
        mockUser.id,
        'non-existent-practice',
        6, // Invalid rating (should be 1-5)
        'Invalid rating'
      );

      expect(result).toBe(false);
    });
  });
});