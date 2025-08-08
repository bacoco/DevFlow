/**
 * AchievementSystem
 * Handles gamification through achievements and rewards
 */

import {
  Achievement,
  UserAchievement,
  AchievementCategory,
  AchievementDifficulty,
  AchievementCriteria,
  CriteriaCondition,
  AchievementReward,
  RewardType,
  CriteriaType,
  ComparisonOperator,
  TimeFrame
} from './types';

interface UserProgress {
  userId: string;
  achievementId: string;
  currentValue: number;
  targetValue: number;
  lastUpdated: Date;
  streak?: number;
  metadata: Record<string, any>;
}

export class AchievementSystem {
  private achievements: Map<string, Achievement> = new Map();
  private userAchievements: Map<string, UserAchievement[]> = new Map();
  private userProgress: Map<string, UserProgress[]> = new Map();
  private achievementCounter = 0;

  constructor() {
    this.initializeDefaultAchievements();
  }

  /**
   * Get all available achievements
   */
  async getAvailableAchievements(): Promise<Achievement[]> {
    return Array.from(this.achievements.values())
      .filter(achievement => !achievement.isSecret)
      .sort((a, b) => {
        // Sort by difficulty and points
        const difficultyOrder = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
        const diffComparison = difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
        return diffComparison !== 0 ? diffComparison : b.points - a.points;
      });
  }

  /**
   * Get user's achievements
   */
  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    const userAchievements = this.userAchievements.get(userId) || [];
    return userAchievements.sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime());
  }

  /**
   * Get user's achievement progress
   */
  async getUserProgress(userId: string): Promise<{
    completed: UserAchievement[];
    inProgress: Array<{
      achievement: Achievement;
      progress: number;
      currentValue: number;
      targetValue: number;
    }>;
    available: Achievement[];
  }> {
    const completed = await this.getUserAchievements(userId);
    const completedIds = new Set(completed.map(ua => ua.achievementId));
    
    const userProgressData = this.userProgress.get(userId) || [];
    const inProgress = [];
    
    for (const progress of userProgressData) {
      if (!completedIds.has(progress.achievementId)) {
        const achievement = this.achievements.get(progress.achievementId);
        if (achievement) {
          inProgress.push({
            achievement,
            progress: Math.min(100, (progress.currentValue / progress.targetValue) * 100),
            currentValue: progress.currentValue,
            targetValue: progress.targetValue
          });
        }
      }
    }

    const available = Array.from(this.achievements.values())
      .filter(achievement => 
        !completedIds.has(achievement.id) && 
        !userProgressData.some(p => p.achievementId === achievement.id) &&
        !achievement.isSecret
      );

    return { completed, inProgress, available };
  }

  /**
   * Check and update achievements for a user
   */
  async checkAchievements(
    userId: string,
    context: string,
    activityData?: Record<string, any>
  ): Promise<UserAchievement[]> {
    const newAchievements: UserAchievement[] = [];
    const userAchievements = this.userAchievements.get(userId) || [];
    const completedIds = new Set(userAchievements.map(ua => ua.achievementId));

    for (const [achievementId, achievement] of this.achievements) {
      // Skip if already completed and not repeatable
      if (completedIds.has(achievementId) && !achievement.isRepeatable) {
        continue;
      }

      // Check if achievement criteria are met
      const criteriaResult = await this.evaluateAchievementCriteria(
        userId,
        achievement,
        context,
        activityData
      );

      if (criteriaResult.achieved) {
        const userAchievement = await this.unlockAchievement(
          userId,
          achievementId,
          criteriaResult.metadata
        );
        newAchievements.push(userAchievement);
      } else if (criteriaResult.progress !== undefined) {
        // Update progress tracking
        await this.updateUserProgress(
          userId,
          achievementId,
          criteriaResult.progress,
          criteriaResult.metadata
        );
      }
    }

    return newAchievements;
  }

  /**
   * Unlock an achievement for a user
   */
  async unlockAchievement(
    userId: string,
    achievementId: string,
    metadata: Record<string, any> = {}
  ): Promise<UserAchievement> {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) {
      throw new Error('Achievement not found');
    }

    const userAchievement: UserAchievement = {
      userId,
      achievementId,
      unlockedAt: new Date(),
      progress: 100,
      isCompleted: true,
      metadata
    };

    // Add to user's achievements
    if (!this.userAchievements.has(userId)) {
      this.userAchievements.set(userId, []);
    }
    this.userAchievements.get(userId)!.push(userAchievement);

    // Apply rewards
    await this.applyAchievementRewards(userId, achievement);

    // Log achievement unlock
    this.logAchievementActivity(userId, 'achievement_unlocked', {
      achievementId,
      achievementName: achievement.name,
      points: achievement.points,
      difficulty: achievement.difficulty
    });

    return userAchievement;
  }

  /**
   * Get achievement statistics for a user
   */
  async getUserAchievementCount(userId: string): Promise<number> {
    const userAchievements = this.userAchievements.get(userId) || [];
    return userAchievements.length;
  }

  /**
   * Get user's total achievement points
   */
  async getUserPoints(userId: string): Promise<number> {
    const userAchievements = this.userAchievements.get(userId) || [];
    let totalPoints = 0;

    for (const userAchievement of userAchievements) {
      const achievement = this.achievements.get(userAchievement.achievementId);
      if (achievement) {
        totalPoints += achievement.points;
      }
    }

    return totalPoints;
  }

  /**
   * Get leaderboard data
   */
  async getLeaderboard(
    category?: AchievementCategory,
    limit: number = 10
  ): Promise<Array<{
    userId: string;
    totalPoints: number;
    achievementCount: number;
    recentAchievements: UserAchievement[];
  }>> {
    const leaderboard: Map<string, {
      userId: string;
      totalPoints: number;
      achievementCount: number;
      recentAchievements: UserAchievement[];
    }> = new Map();

    // Calculate points for each user
    for (const [userId, userAchievements] of this.userAchievements) {
      let totalPoints = 0;
      let achievementCount = 0;
      const recentAchievements: UserAchievement[] = [];

      for (const userAchievement of userAchievements) {
        const achievement = this.achievements.get(userAchievement.achievementId);
        if (achievement) {
          // Filter by category if specified
          if (!category || achievement.category === category) {
            totalPoints += achievement.points;
            achievementCount++;
            
            // Get recent achievements (last 7 days)
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            if (userAchievement.unlockedAt >= weekAgo) {
              recentAchievements.push(userAchievement);
            }
          }
        }
      }

      if (achievementCount > 0) {
        leaderboard.set(userId, {
          userId,
          totalPoints,
          achievementCount,
          recentAchievements: recentAchievements.sort((a, b) => 
            b.unlockedAt.getTime() - a.unlockedAt.getTime()
          )
        });
      }
    }

    // Sort by total points and return top entries
    return Array.from(leaderboard.values())
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit);
  }

  /**
   * Create a custom achievement
   */
  async createCustomAchievement(achievement: Omit<Achievement, 'id'>): Promise<Achievement> {
    const achievementId = this.generateAchievementId();
    const newAchievement: Achievement = {
      ...achievement,
      id: achievementId
    };

    this.achievements.set(achievementId, newAchievement);

    this.logAchievementActivity('system', 'achievement_created', {
      achievementId,
      name: achievement.name,
      category: achievement.category
    });

    return newAchievement;
  }

  // Private methods

  private async evaluateAchievementCriteria(
    userId: string,
    achievement: Achievement,
    context: string,
    activityData?: Record<string, any>
  ): Promise<{
    achieved: boolean;
    progress?: number;
    metadata?: Record<string, any>;
  }> {
    const criteria = achievement.criteria;
    
    switch (criteria.type) {
      case 'single_action':
        return this.evaluateSingleActionCriteria(userId, criteria, context, activityData);
      
      case 'cumulative':
        return this.evaluateCumulativeCriteria(userId, achievement, criteria, context);
      
      case 'streak':
        return this.evaluateStreakCriteria(userId, achievement, criteria, context);
      
      case 'milestone':
        return this.evaluateMilestoneCriteria(userId, criteria, context, activityData);
      
      default:
        return { achieved: false };
    }
  }

  private async evaluateSingleActionCriteria(
    userId: string,
    criteria: AchievementCriteria,
    context: string,
    activityData?: Record<string, any>
  ): Promise<{ achieved: boolean; metadata?: Record<string, any> }> {
    // Check if the current action matches the criteria
    for (const condition of criteria.conditions) {
      const conditionMet = this.evaluateCondition(condition, context, activityData);
      if (!conditionMet) {
        return { achieved: false };
      }
    }

    return { 
      achieved: true, 
      metadata: { 
        context, 
        timestamp: new Date(),
        activityData 
      } 
    };
  }

  private async evaluateCumulativeCriteria(
    userId: string,
    achievement: Achievement,
    criteria: AchievementCriteria,
    context: string
  ): Promise<{ achieved: boolean; progress?: number; metadata?: Record<string, any> }> {
    // Get or create progress tracking
    let userProgressData = this.userProgress.get(userId) || [];
    let progress = userProgressData.find(p => p.achievementId === achievement.id);

    if (!progress) {
      progress = {
        userId,
        achievementId: achievement.id,
        currentValue: 0,
        targetValue: criteria.conditions[0]?.value || 1,
        lastUpdated: new Date(),
        metadata: {}
      };
      userProgressData.push(progress);
      this.userProgress.set(userId, userProgressData);
    }

    // Increment progress based on context
    const increment = this.getProgressIncrement(context, criteria.conditions[0]);
    progress.currentValue += increment;
    progress.lastUpdated = new Date();

    const progressPercentage = (progress.currentValue / progress.targetValue) * 100;
    const achieved = progress.currentValue >= progress.targetValue;

    return {
      achieved,
      progress: progressPercentage,
      metadata: {
        currentValue: progress.currentValue,
        targetValue: progress.targetValue,
        increment
      }
    };
  }

  private async evaluateStreakCriteria(
    userId: string,
    achievement: Achievement,
    criteria: AchievementCriteria,
    context: string
  ): Promise<{ achieved: boolean; progress?: number; metadata?: Record<string, any> }> {
    let userProgressData = this.userProgress.get(userId) || [];
    let progress = userProgressData.find(p => p.achievementId === achievement.id);

    if (!progress) {
      progress = {
        userId,
        achievementId: achievement.id,
        currentValue: 0,
        targetValue: criteria.conditions[0]?.value || 1,
        lastUpdated: new Date(),
        streak: 0,
        metadata: {}
      };
      userProgressData.push(progress);
      this.userProgress.set(userId, userProgressData);
    }

    // Check if streak should continue or reset
    const now = new Date();
    const timeSinceLastUpdate = now.getTime() - progress.lastUpdated.getTime();
    const daysSinceLastUpdate = timeSinceLastUpdate / (1000 * 60 * 60 * 24);

    if (daysSinceLastUpdate > 1.5) { // Allow some flexibility
      progress.streak = 0;
    }

    // Increment streak if criteria match
    if (this.evaluateCondition(criteria.conditions[0], context)) {
      progress.streak = (progress.streak || 0) + 1;
      progress.currentValue = progress.streak;
      progress.lastUpdated = now;
    }

    const progressPercentage = (progress.currentValue / progress.targetValue) * 100;
    const achieved = progress.currentValue >= progress.targetValue;

    return {
      achieved,
      progress: progressPercentage,
      metadata: {
        currentStreak: progress.streak,
        targetStreak: progress.targetValue
      }
    };
  }

  private async evaluateMilestoneCriteria(
    userId: string,
    criteria: AchievementCriteria,
    context: string,
    activityData?: Record<string, any>
  ): Promise<{ achieved: boolean; metadata?: Record<string, any> }> {
    // Milestone achievements are typically based on reaching specific values
    const condition = criteria.conditions[0];
    if (!condition || !activityData) {
      return { achieved: false };
    }

    const currentValue = activityData[condition.metric] || 0;
    const achieved = this.compareValues(currentValue, condition.operator, condition.value);

    return {
      achieved,
      metadata: {
        metric: condition.metric,
        currentValue,
        targetValue: condition.value,
        milestone: true
      }
    };
  }

  private evaluateCondition(
    condition: CriteriaCondition,
    context: string,
    activityData?: Record<string, any>
  ): boolean {
    // Check if the condition matches the current context/activity
    if (condition.context && !context.includes(condition.context)) {
      return false;
    }

    if (condition.metric && activityData) {
      const value = activityData[condition.metric] || 0;
      return this.compareValues(value, condition.operator, condition.value);
    }

    return true;
  }

  private compareValues(
    actual: number,
    operator: ComparisonOperator,
    target: number
  ): boolean {
    switch (operator) {
      case 'equals':
        return actual === target;
      case 'greater_than':
        return actual > target;
      case 'less_than':
        return actual < target;
      case 'between':
        // For 'between', target should be an array [min, max]
        if (Array.isArray(target) && target.length === 2) {
          return actual >= target[0] && actual <= target[1];
        }
        return false;
      default:
        return false;
    }
  }

  private getProgressIncrement(context: string, condition: CriteriaCondition): number {
    // Determine how much to increment based on the context and condition
    if (condition.metric && condition.metric.includes(context)) {
      return 1;
    }
    
    // Default increment
    return context.includes('share') || context.includes('collaboration') ? 1 : 0;
  }

  private async updateUserProgress(
    userId: string,
    achievementId: string,
    progressValue: number,
    metadata: Record<string, any>
  ): Promise<void> {
    let userProgressData = this.userProgress.get(userId) || [];
    let progress = userProgressData.find(p => p.achievementId === achievementId);

    if (progress) {
      progress.lastUpdated = new Date();
      progress.metadata = { ...progress.metadata, ...metadata };
    }
  }

  private async applyAchievementRewards(
    userId: string,
    achievement: Achievement
  ): Promise<void> {
    for (const reward of achievement.rewards) {
      await this.applyReward(userId, reward, achievement);
    }
  }

  private async applyReward(
    userId: string,
    reward: AchievementReward,
    achievement: Achievement
  ): Promise<void> {
    switch (reward.type) {
      case 'badge':
        // Award badge (in real implementation, would update user profile)
        console.log(`🏆 User ${userId} earned badge: ${reward.value}`);
        break;
      
      case 'points':
        // Points are already calculated from achievement.points
        console.log(`⭐ User ${userId} earned ${achievement.points} points`);
        break;
      
      case 'feature_unlock':
        // Unlock premium features
        console.log(`🔓 User ${userId} unlocked feature: ${reward.value}`);
        break;
      
      case 'customization':
        // Unlock customization options
        console.log(`🎨 User ${userId} unlocked customization: ${reward.value}`);
        break;
      
      case 'recognition':
        // Public recognition
        console.log(`👏 User ${userId} received recognition: ${reward.value}`);
        break;
    }
  }

  private generateAchievementId(): string {
    return `achievement_${++this.achievementCounter}_${Date.now()}`;
  }

  private initializeDefaultAchievements(): void {
    // Collaboration achievements
    this.achievements.set('first_share', {
      id: 'first_share',
      name: 'First Share',
      description: 'Share your first dashboard or insight with a teammate',
      icon: '🤝',
      category: 'collaboration',
      difficulty: 'bronze',
      points: 10,
      criteria: {
        type: 'single_action',
        conditions: [{
          metric: 'shares_created',
          operator: 'equals',
          value: 1
        }]
      },
      rewards: [{
        type: 'badge',
        value: 'collaborator',
        description: 'Collaborator badge'
      }],
      isSecret: false,
      isRepeatable: false
    });

    this.achievements.set('annotation_master', {
      id: 'annotation_master',
      name: 'Annotation Master',
      description: 'Create 50 helpful annotations on team dashboards',
      icon: '📝',
      category: 'collaboration',
      difficulty: 'silver',
      points: 50,
      criteria: {
        type: 'cumulative',
        conditions: [{
          metric: 'annotations_created',
          operator: 'greater_than',
          value: 50
        }]
      },
      rewards: [{
        type: 'feature_unlock',
        value: 'advanced_annotations',
        description: 'Advanced annotation features'
      }],
      isSecret: false,
      isRepeatable: false
    });

    this.achievements.set('team_player', {
      id: 'team_player',
      name: 'Team Player',
      description: 'Collaborate with team members for 7 consecutive days',
      icon: '👥',
      category: 'collaboration',
      difficulty: 'gold',
      points: 100,
      criteria: {
        type: 'streak',
        conditions: [{
          metric: 'collaboration_activity',
          operator: 'greater_than',
          value: 7,
          context: 'daily_collaboration'
        }],
        timeframe: 'daily'
      },
      rewards: [{
        type: 'recognition',
        value: 'team_spotlight',
        description: 'Featured in team spotlight'
      }],
      isSecret: false,
      isRepeatable: true
    });

    // Learning achievements
    this.achievements.set('knowledge_seeker', {
      id: 'knowledge_seeker',
      name: 'Knowledge Seeker',
      description: 'View 10 best practices from the learning library',
      icon: '📚',
      category: 'learning',
      difficulty: 'bronze',
      points: 20,
      criteria: {
        type: 'cumulative',
        conditions: [{
          metric: 'best_practices_viewed',
          operator: 'greater_than',
          value: 10
        }]
      },
      rewards: [{
        type: 'customization',
        value: 'learning_theme',
        description: 'Special learning theme'
      }],
      isSecret: false,
      isRepeatable: false
    });

    // Productivity achievements
    this.achievements.set('productivity_champion', {
      id: 'productivity_champion',
      name: 'Productivity Champion',
      description: 'Achieve top 10% productivity score in your team',
      icon: '🚀',
      category: 'productivity',
      difficulty: 'platinum',
      points: 200,
      criteria: {
        type: 'milestone',
        conditions: [{
          metric: 'productivity_percentile',
          operator: 'greater_than',
          value: 90
        }]
      },
      rewards: [{
        type: 'recognition',
        value: 'productivity_leader',
        description: 'Productivity leader recognition'
      }],
      isSecret: false,
      isRepeatable: true
    });

    // Secret achievements
    this.achievements.set('early_bird', {
      id: 'early_bird',
      name: 'Early Bird',
      description: 'Access the dashboard before 7 AM for 5 consecutive days',
      icon: '🌅',
      category: 'engagement',
      difficulty: 'silver',
      points: 75,
      criteria: {
        type: 'streak',
        conditions: [{
          metric: 'early_access',
          operator: 'equals',
          value: 5,
          context: 'morning_access'
        }],
        timeframe: 'daily'
      },
      rewards: [{
        type: 'customization',
        value: 'sunrise_theme',
        description: 'Exclusive sunrise theme'
      }],
      isSecret: true,
      isRepeatable: false
    });
  }

  private logAchievementActivity(
    userId: string,
    action: string,
    metadata: Record<string, any>
  ): void {
    console.log(`🏆 Achievement activity: ${userId} - ${action}`, metadata);
  }
}

export default AchievementSystem;