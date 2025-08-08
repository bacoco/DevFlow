/**
 * SocialLearningService
 * Manages best practices, learning recommendations, and social learning features
 */

import {
  BestPractice,
  LearningRecommendation,
  BestPracticeCategory,
  LearningDifficulty,
  LearningContent,
  LearningStep,
  CodeExample,
  LearningResource,
  BestPracticeUsage,
  BestPracticeRating,
  BestPracticeFeedback,
  RecommendationReason,
  RecommendationContext,
  ReasonType,
  ResourceType,
  FeedbackType
} from './types';

interface UserLearningProfile {
  userId: string;
  skillLevel: Record<BestPracticeCategory, LearningDifficulty>;
  interests: BestPracticeCategory[];
  completedPractices: string[];
  learningGoals: string[];
  preferredLearningStyle: 'visual' | 'hands_on' | 'reading' | 'mixed';
  lastActive: Date;
}

interface LearningAnalytics {
  userId: string;
  practiceId: string;
  action: 'view' | 'implement' | 'rate' | 'share';
  timestamp: Date;
  duration?: number;
  success?: boolean;
  metadata: Record<string, any>;
}

export class SocialLearningService {
  private bestPractices: Map<string, BestPractice> = new Map();
  private userProfiles: Map<string, UserLearningProfile> = new Map();
  private learningAnalytics: Map<string, LearningAnalytics[]> = new Map();
  private practiceCounter = 0;

  constructor() {
    this.initializeDefaultBestPractices();
  }

  /**
   * Get best practices with optional filtering
   */
  async getBestPractices(
    category?: string,
    difficulty?: string,
    userId?: string
  ): Promise<BestPractice[]> {
    let practices = Array.from(this.bestPractices.values());

    // Apply filters
    if (category) {
      practices = practices.filter(p => p.category === category);
    }

    if (difficulty) {
      practices = practices.filter(p => p.difficulty === difficulty);
    }

    // Sort by relevance if user is provided
    if (userId) {
      practices = await this.sortByRelevance(practices, userId);
    } else {
      // Default sort by votes and usage
      practices.sort((a, b) => {
        const scoreA = a.votes + (a.usage.implementations * 2);
        const scoreB = b.votes + (b.usage.implementations * 2);
        return scoreB - scoreA;
      });
    }

    return practices;
  }

  /**
   * Get personalized learning recommendations for a user
   */
  async getPersonalizedRecommendations(userId: string): Promise<LearningRecommendation[]> {
    const userProfile = await this.getUserLearningProfile(userId);
    const recommendations: LearningRecommendation[] = [];

    // Get all best practices
    const allPractices = Array.from(this.bestPractices.values());

    for (const practice of allPractices) {
      // Skip if already completed
      if (userProfile.completedPractices.includes(practice.id)) {
        continue;
      }

      // Calculate recommendation score
      const recommendation = await this.calculateRecommendation(userId, practice, userProfile);
      
      if (recommendation && recommendation.confidence > 0.3) {
        recommendations.push(recommendation);
      }
    }

    // Sort by confidence and return top recommendations
    return recommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);
  }

  /**
   * Record user interaction with a best practice
   */
  async recordUsage(
    userId: string,
    bestPracticeId: string,
    action: 'view' | 'implement' | 'rate'
  ): Promise<boolean> {
    const practice = this.bestPractices.get(bestPracticeId);
    if (!practice) {
      return false;
    }

    // Record analytics
    const analytics: LearningAnalytics = {
      userId,
      practiceId: bestPracticeId,
      action,
      timestamp: new Date(),
      metadata: {}
    };

    if (!this.learningAnalytics.has(userId)) {
      this.learningAnalytics.set(userId, []);
    }
    this.learningAnalytics.get(userId)!.push(analytics);

    // Update practice usage
    switch (action) {
      case 'view':
        practice.usage.views++;
        break;
      case 'implement':
        practice.usage.implementations++;
        await this.updateUserProfile(userId, bestPracticeId, 'implemented');
        break;
      case 'rate':
        // Rating would be handled separately
        break;
    }

    // Update user learning profile
    await this.updateUserLearningProgress(userId, practice);

    this.logLearningActivity(userId, action, {
      practiceId: bestPracticeId,
      practiceTitle: practice.title,
      category: practice.category
    });

    return true;
  }

  /**
   * Rate a best practice
   */
  async rateBestPractice(
    userId: string,
    bestPracticeId: string,
    rating: number,
    comment?: string
  ): Promise<boolean> {
    const practice = this.bestPractices.get(bestPracticeId);
    if (!practice || rating < 1 || rating > 5) {
      return false;
    }

    // Remove existing rating from same user
    practice.usage.ratings = practice.usage.ratings.filter(r => r.userId !== userId);

    // Add new rating
    const newRating: BestPracticeRating = {
      userId,
      rating,
      comment,
      createdAt: new Date()
    };

    practice.usage.ratings.push(newRating);

    // Update overall votes (simplified)
    const averageRating = practice.usage.ratings.reduce((sum, r) => sum + r.rating, 0) / practice.usage.ratings.length;
    practice.votes = Math.round(averageRating * practice.usage.ratings.length);

    await this.recordUsage(userId, bestPracticeId, 'rate');

    return true;
  }

  /**
   * Provide feedback on a best practice
   */
  async provideFeedback(
    userId: string,
    bestPracticeId: string,
    feedbackType: FeedbackType,
    content: string,
    isHelpful: boolean = true
  ): Promise<boolean> {
    const practice = this.bestPractices.get(bestPracticeId);
    if (!practice) {
      return false;
    }

    const feedback: BestPracticeFeedback = {
      userId,
      type: feedbackType,
      content,
      isHelpful,
      createdAt: new Date()
    };

    practice.usage.feedback.push(feedback);

    this.logLearningActivity(userId, 'feedback_provided', {
      practiceId: bestPracticeId,
      feedbackType,
      isHelpful
    });

    return true;
  }

  /**
   * Create a new best practice
   */
  async createBestPractice(
    userId: string,
    practiceData: Omit<BestPractice, 'id' | 'author' | 'votes' | 'usage' | 'createdAt' | 'updatedAt'>
  ): Promise<BestPractice> {
    const practiceId = this.generatePracticeId();
    
    const bestPractice: BestPractice = {
      ...practiceData,
      id: practiceId,
      author: userId,
      votes: 0,
      usage: {
        views: 0,
        implementations: 0,
        ratings: [],
        feedback: []
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.bestPractices.set(practiceId, bestPractice);

    this.logLearningActivity(userId, 'practice_created', {
      practiceId,
      title: practiceData.title,
      category: practiceData.category
    });

    return bestPractice;
  }

  /**
   * Get learning statistics for a user
   */
  async getUserLearningStats(userId: string): Promise<{
    practicesViewed: number;
    practicesImplemented: number;
    practicesRated: number;
    averageRating: number;
    learningStreak: number;
    favoriteCategory: BestPracticeCategory;
  }> {
    const analytics = this.learningAnalytics.get(userId) || [];
    
    const practicesViewed = analytics.filter(a => a.action === 'view').length;
    const practicesImplemented = analytics.filter(a => a.action === 'implement').length;
    const practicesRated = analytics.filter(a => a.action === 'rate').length;

    // Calculate average rating given by user
    let totalRating = 0;
    let ratingCount = 0;
    for (const [, practice] of this.bestPractices) {
      const userRating = practice.usage.ratings.find(r => r.userId === userId);
      if (userRating) {
        totalRating += userRating.rating;
        ratingCount++;
      }
    }
    const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

    // Calculate learning streak
    const learningStreak = this.calculateLearningStreak(userId);

    // Find favorite category
    const categoryCount: Record<string, number> = {};
    for (const analytic of analytics) {
      const practice = this.bestPractices.get(analytic.practiceId);
      if (practice) {
        categoryCount[practice.category] = (categoryCount[practice.category] || 0) + 1;
      }
    }
    
    const favoriteCategory = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as BestPracticeCategory || 'workflow';

    return {
      practicesViewed,
      practicesImplemented,
      practicesRated,
      averageRating: Math.round(averageRating * 10) / 10,
      learningStreak,
      favoriteCategory
    };
  }

  /**
   * Search best practices
   */
  async searchBestPractices(
    query: string,
    filters?: { type?: string; author?: string; dateRange?: { start: Date; end: Date } }
  ): Promise<any[]> {
    const results: any[] = [];
    
    for (const [, practice] of this.bestPractices) {
      // Apply filters
      if (filters?.author && practice.author !== filters.author) continue;
      
      if (filters?.dateRange) {
        const practiceDate = practice.createdAt;
        if (practiceDate < filters.dateRange.start || practiceDate > filters.dateRange.end) {
          continue;
        }
      }

      // Simple query matching
      const matchesQuery = !query || 
        practice.title.toLowerCase().includes(query.toLowerCase()) ||
        practice.description.toLowerCase().includes(query.toLowerCase()) ||
        practice.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));

      if (matchesQuery) {
        results.push({
          type: 'best_practice',
          id: practice.id,
          title: practice.title,
          description: practice.description,
          category: practice.category,
          difficulty: practice.difficulty,
          author: practice.author,
          votes: practice.votes,
          views: practice.usage.views,
          implementations: practice.usage.implementations,
          createdAt: practice.createdAt
        });
      }
    }

    return results.sort((a, b) => b.votes - a.votes);
  }

  /**
   * Get trending best practices
   */
  async getTrendingPractices(timeframe: 'day' | 'week' | 'month' = 'week'): Promise<BestPractice[]> {
    const cutoffDate = new Date();
    switch (timeframe) {
      case 'day':
        cutoffDate.setDate(cutoffDate.getDate() - 1);
        break;
      case 'week':
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(cutoffDate.getMonth() - 1);
        break;
    }

    const practices = Array.from(this.bestPractices.values());
    
    // Calculate trending score based on recent activity
    const trendingPractices = practices.map(practice => {
      let recentActivity = 0;
      
      // Count recent views and implementations
      for (const [, analytics] of this.learningAnalytics) {
        const recentAnalytics = analytics.filter(a => 
          a.practiceId === practice.id && a.timestamp >= cutoffDate
        );
        recentActivity += recentAnalytics.length;
      }

      return {
        practice,
        trendingScore: recentActivity + (practice.votes * 0.1)
      };
    });

    return trendingPractices
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, 10)
      .map(item => item.practice);
  }

  // Private helper methods

  private async getUserLearningProfile(userId: string): Promise<UserLearningProfile> {
    let profile = this.userProfiles.get(userId);
    
    if (!profile) {
      profile = {
        userId,
        skillLevel: {
          workflow: 'beginner',
          code_quality: 'beginner',
          collaboration: 'beginner',
          productivity: 'beginner',
          tools: 'beginner'
        },
        interests: ['workflow', 'productivity'],
        completedPractices: [],
        learningGoals: [],
        preferredLearningStyle: 'mixed',
        lastActive: new Date()
      };
      this.userProfiles.set(userId, profile);
    }

    return profile;
  }

  private async calculateRecommendation(
    userId: string,
    practice: BestPractice,
    userProfile: UserLearningProfile
  ): Promise<LearningRecommendation | null> {
    let confidence = 0;
    let reasonType: ReasonType = 'skill_gap';
    let explanation = '';
    const relatedMetrics: string[] = [];

    // Check skill level match
    const userSkillLevel = userProfile.skillLevel[practice.category];
    const skillLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
    const userSkillIndex = skillLevels.indexOf(userSkillLevel);
    const practiceSkillIndex = skillLevels.indexOf(practice.difficulty);

    if (practiceSkillIndex === userSkillIndex || practiceSkillIndex === userSkillIndex + 1) {
      confidence += 0.4;
      reasonType = 'skill_gap';
      explanation = `Matches your ${userSkillLevel} level in ${practice.category}`;
    }

    // Check interest alignment
    if (userProfile.interests.includes(practice.category)) {
      confidence += 0.3;
      explanation += ` and aligns with your interest in ${practice.category}`;
    }

    // Check recent team trends (simplified)
    const recentTeamActivity = await this.getRecentTeamActivity(userId, practice.category);
    if (recentTeamActivity > 0) {
      confidence += 0.2;
      reasonType = 'team_trend';
      explanation += `. Your team is actively working on ${practice.category}`;
      relatedMetrics.push('team_activity');
    }

    // Check practice popularity and success rate
    if (practice.usage.implementations > 10 && practice.votes > 20) {
      confidence += 0.1;
      explanation += '. This practice has proven successful for many users';
    }

    if (confidence < 0.3) {
      return null;
    }

    const context: RecommendationContext = {
      currentSkillLevel: userSkillLevel,
      teamContext: [practice.category],
      recentActivity: await this.getRecentUserActivity(userId),
      goals: userProfile.learningGoals
    };

    return {
      userId,
      bestPracticeId: practice.id,
      reason: {
        type: reasonType,
        explanation,
        relatedMetrics
      },
      confidence: Math.min(1, confidence),
      context,
      createdAt: new Date()
    };
  }

  private async sortByRelevance(
    practices: BestPractice[],
    userId: string
  ): Promise<BestPractice[]> {
    const userProfile = await this.getUserLearningProfile(userId);
    
    return practices.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Interest bonus
      if (userProfile.interests.includes(a.category)) scoreA += 10;
      if (userProfile.interests.includes(b.category)) scoreB += 10;

      // Skill level match bonus
      const userSkillA = userProfile.skillLevel[a.category];
      const userSkillB = userProfile.skillLevel[b.category];
      
      if (a.difficulty === userSkillA) scoreA += 5;
      if (b.difficulty === userSkillB) scoreB += 5;

      // Usage and votes
      scoreA += a.votes + (a.usage.implementations * 2);
      scoreB += b.votes + (b.usage.implementations * 2);

      return scoreB - scoreA;
    });
  }

  private async updateUserProfile(
    userId: string,
    practiceId: string,
    action: string
  ): Promise<void> {
    const profile = await this.getUserLearningProfile(userId);
    
    if (action === 'implemented' && !profile.completedPractices.includes(practiceId)) {
      profile.completedPractices.push(practiceId);
      
      // Update skill level based on completed practices
      const practice = this.bestPractices.get(practiceId);
      if (practice) {
        await this.updateSkillLevel(profile, practice.category);
      }
    }

    profile.lastActive = new Date();
  }

  private async updateSkillLevel(
    profile: UserLearningProfile,
    category: BestPracticeCategory
  ): Promise<void> {
    const completedInCategory = profile.completedPractices.filter(practiceId => {
      const practice = this.bestPractices.get(practiceId);
      return practice && practice.category === category;
    }).length;

    // Simple skill progression
    if (completedInCategory >= 20) {
      profile.skillLevel[category] = 'expert';
    } else if (completedInCategory >= 10) {
      profile.skillLevel[category] = 'advanced';
    } else if (completedInCategory >= 5) {
      profile.skillLevel[category] = 'intermediate';
    }
  }

  private async updateUserLearningProgress(
    userId: string,
    practice: BestPractice
  ): Promise<void> {
    const profile = await this.getUserLearningProfile(userId);
    
    // Add category to interests if not present and user is engaging
    if (!profile.interests.includes(practice.category)) {
      const categoryEngagement = await this.getCategoryEngagement(userId, practice.category);
      if (categoryEngagement >= 3) {
        profile.interests.push(practice.category);
      }
    }
  }

  private async getCategoryEngagement(
    userId: string,
    category: BestPracticeCategory
  ): Promise<number> {
    const analytics = this.learningAnalytics.get(userId) || [];
    return analytics.filter(a => {
      const practice = this.bestPractices.get(a.practiceId);
      return practice && practice.category === category;
    }).length;
  }

  private calculateLearningStreak(userId: string): number {
    const analytics = this.learningAnalytics.get(userId) || [];
    if (analytics.length === 0) return 0;

    // Sort by timestamp
    const sortedAnalytics = analytics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const analytic of sortedAnalytics) {
      const analyticDate = new Date(analytic.timestamp);
      analyticDate.setHours(0, 0, 0, 0);

      const daysDiff = (currentDate.getTime() - analyticDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff === streak) {
        streak++;
      } else if (daysDiff > streak + 1) {
        break;
      }
    }

    return streak;
  }

  private async getRecentTeamActivity(
    userId: string,
    category: BestPracticeCategory
  ): Promise<number> {
    // Mock implementation - in real app, would check team activity
    return Math.floor(Math.random() * 5);
  }

  private async getRecentUserActivity(userId: string): Promise<string[]> {
    const analytics = this.learningAnalytics.get(userId) || [];
    const recentAnalytics = analytics.filter(a => {
      const daysSince = (Date.now() - a.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 7;
    });

    return recentAnalytics.map(a => a.action);
  }

  private generatePracticeId(): string {
    return `practice_${++this.practiceCounter}_${Date.now()}`;
  }

  private initializeDefaultBestPractices(): void {
    // Workflow best practices
    this.bestPractices.set('daily_standup_optimization', {
      id: 'daily_standup_optimization',
      title: 'Optimize Daily Standups for Remote Teams',
      description: 'Learn how to run effective daily standups that keep remote teams aligned and productive',
      category: 'workflow',
      difficulty: 'intermediate',
      tags: ['remote-work', 'meetings', 'agile', 'communication'],
      content: {
        steps: [
          {
            title: 'Set a consistent time and duration',
            description: 'Choose a time that works for all team members and stick to 15 minutes maximum',
            action: 'Schedule recurring 15-minute meeting',
            expectedOutcome: 'Consistent attendance and time management'
          },
          {
            title: 'Use the three-question format',
            description: 'What did you do yesterday? What will you do today? Any blockers?',
            action: 'Structure updates around these questions',
            expectedOutcome: 'Focused and relevant updates'
          },
          {
            title: 'Address blockers immediately after',
            description: 'Keep the standup brief, but schedule follow-up discussions for blockers',
            action: 'Create separate meetings for detailed problem-solving',
            expectedOutcome: 'Efficient use of everyone\'s time'
          }
        ],
        examples: [
          {
            language: 'markdown',
            code: `## Daily Standup Template

**Yesterday:**
- Completed user authentication feature
- Fixed 3 bugs in payment system

**Today:**
- Working on dashboard analytics
- Code review for team member's PR

**Blockers:**
- Waiting for API documentation from backend team`,
            explanation: 'Simple template for standup updates'
          }
        ],
        resources: [
          {
            type: 'article',
            title: 'The Ultimate Guide to Remote Standups',
            url: 'https://example.com/remote-standups',
            description: 'Comprehensive guide to running effective remote standups'
          }
        ],
        tips: [
          'Use video calls to maintain team connection',
          'Rotate who goes first to keep engagement high',
          'Document blockers in a shared space for follow-up'
        ]
      },
      author: 'system',
      votes: 45,
      usage: {
        views: 120,
        implementations: 23,
        ratings: [
          { userId: 'user1', rating: 5, createdAt: new Date() },
          { userId: 'user2', rating: 4, comment: 'Really helpful for our team', createdAt: new Date() }
        ],
        feedback: []
      },
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15')
    });

    this.bestPractices.set('code_review_checklist', {
      id: 'code_review_checklist',
      title: 'Comprehensive Code Review Checklist',
      description: 'A systematic approach to conducting thorough and constructive code reviews',
      category: 'code_quality',
      difficulty: 'intermediate',
      tags: ['code-review', 'quality', 'collaboration', 'best-practices'],
      content: {
        steps: [
          {
            title: 'Review for functionality',
            description: 'Ensure the code does what it\'s supposed to do',
            action: 'Test the feature manually or review test cases',
            expectedOutcome: 'Confidence that the code works as intended'
          },
          {
            title: 'Check code style and conventions',
            description: 'Verify adherence to team coding standards',
            action: 'Use automated linting tools and manual review',
            expectedOutcome: 'Consistent code style across the codebase'
          },
          {
            title: 'Look for potential issues',
            description: 'Identify security vulnerabilities, performance issues, and edge cases',
            action: 'Review for common pitfalls and anti-patterns',
            expectedOutcome: 'More robust and secure code'
          }
        ],
        examples: [
          {
            language: 'javascript',
            code: `// Before: Potential security issue
function getUserData(userId) {
  return db.query(\`SELECT * FROM users WHERE id = \${userId}\`);
}

// After: Using parameterized queries
function getUserData(userId) {
  return db.query('SELECT * FROM users WHERE id = ?', [userId]);
}`,
            explanation: 'Example of identifying and fixing a security vulnerability during code review'
          }
        ],
        resources: [
          {
            type: 'documentation',
            title: 'Code Review Best Practices',
            url: 'https://example.com/code-review-guide',
            description: 'Industry standard practices for code reviews'
          }
        ],
        tips: [
          'Be constructive and specific in your feedback',
          'Praise good code as well as pointing out issues',
          'Focus on the code, not the person'
        ]
      },
      author: 'system',
      votes: 67,
      usage: {
        views: 89,
        implementations: 34,
        ratings: [
          { userId: 'user3', rating: 5, comment: 'Great checklist!', createdAt: new Date() }
        ],
        feedback: []
      },
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-10')
    });

    this.bestPractices.set('effective_collaboration', {
      id: 'effective_collaboration',
      title: 'Building Effective Team Collaboration',
      description: 'Strategies for improving team communication and collaboration in software development',
      category: 'collaboration',
      difficulty: 'beginner',
      tags: ['teamwork', 'communication', 'productivity', 'culture'],
      content: {
        steps: [
          {
            title: 'Establish clear communication channels',
            description: 'Define when to use different communication methods',
            action: 'Create team communication guidelines',
            expectedOutcome: 'Reduced communication overhead and confusion'
          },
          {
            title: 'Practice active listening',
            description: 'Focus on understanding before being understood',
            action: 'Ask clarifying questions and summarize what you heard',
            expectedOutcome: 'Better understanding and fewer misunderstandings'
          },
          {
            title: 'Share knowledge proactively',
            description: 'Document decisions and share learnings with the team',
            action: 'Write brief summaries of solutions and lessons learned',
            expectedOutcome: 'Improved team knowledge and reduced duplicate work'
          }
        ],
        examples: [],
        resources: [
          {
            type: 'video',
            title: 'Team Collaboration Fundamentals',
            url: 'https://example.com/collaboration-video',
            description: 'Video guide on building collaborative teams'
          }
        ],
        tips: [
          'Schedule regular one-on-ones with team members',
          'Use collaborative tools effectively',
          'Celebrate team wins together'
        ]
      },
      author: 'system',
      votes: 32,
      usage: {
        views: 156,
        implementations: 18,
        ratings: [],
        feedback: []
      },
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-01-20')
    });
  }

  private logLearningActivity(
    userId: string,
    action: string,
    metadata: Record<string, any>
  ): void {
    console.log(`📚 Learning activity: ${userId} - ${action}`, metadata);
  }
}

export default SocialLearningService;