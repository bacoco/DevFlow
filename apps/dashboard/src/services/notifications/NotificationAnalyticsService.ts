import {
  NotificationAnalytics,
  NotificationEvent,
  NotificationContext,
  DismissalPattern,
  Notification,
  NotificationCategory,
  NotificationType,
  NotificationPriority
} from './types';

export class NotificationAnalyticsService {
  private analyticsBuffer: NotificationAnalytics[] = [];
  private dismissalPatterns: Map<string, DismissalPattern[]> = new Map();
  private batchSize = 50;
  private flushInterval = 30000; // 30 seconds

  constructor(
    private storageService: AnalyticsStorageService,
    private privacyService: PrivacyService
  ) {
    this.initializeAnalytics().catch(error => {
      console.warn('Failed to initialize analytics:', error);
    });
    this.startPeriodicFlush();
  }

  /**
   * Records a notification event with privacy protection
   */
  async recordEvent(analytics: NotificationAnalytics): Promise<void> {
    // Apply privacy filters
    const sanitizedAnalytics = await this.privacyService.sanitizeAnalytics(analytics);
    
    // Add to buffer
    this.analyticsBuffer.push(sanitizedAnalytics);

    // Flush if buffer is full
    if (this.analyticsBuffer.length >= this.batchSize) {
      await this.flushAnalytics();
    }

    // Update real-time patterns
    await this.updateDismissalPatterns(analytics);
  }

  /**
   * Gets comprehensive analytics for notification optimization
   */
  async getNotificationAnalytics(
    userId: string,
    timeRange: TimeRange
  ): Promise<NotificationAnalyticsReport> {
    const events = await this.storageService.getEvents(userId, timeRange);
    
    return {
      overview: this.calculateOverviewMetrics(events),
      engagement: this.calculateEngagementMetrics(events),
      timing: this.calculateTimingAnalytics(events),
      channels: this.calculateChannelEffectiveness(events),
      categories: this.calculateCategoryPerformance(events),
      trends: this.calculateTrends(events),
      recommendations: await this.generateRecommendations(userId, events)
    };
  }

  /**
   * Analyzes user dismissal patterns for learning
   */
  async analyzeDismissalPatterns(userId: string): Promise<DismissalInsights> {
    const patterns = await this.getUserDismissalPatterns(userId);
    
    const insights: DismissalInsights = {
      highDismissalCategories: [],
      lowEngagementTypes: [],
      optimalTimings: {},
      fatigueIndicators: [],
      recommendations: []
    };

    // Identify high dismissal categories
    patterns.forEach(pattern => {
      if (pattern.dismissalRate > 0.7) {
        insights.highDismissalCategories.push({
          category: pattern.category,
          dismissalRate: pattern.dismissalRate,
          averageTimeToAction: pattern.averageTimeToAction
        });
      }
    });

    // Identify low engagement types
    patterns.forEach(pattern => {
      if (pattern.averageTimeToAction > 60000 && pattern.dismissalRate > 0.5) { // > 1 minute
        insights.lowEngagementTypes.push({
          type: pattern.type,
          category: pattern.category,
          engagementScore: this.calculateEngagementScore(pattern)
        });
      }
    });

    // Calculate optimal timings
    insights.optimalTimings = await this.calculateOptimalTimings(userId);

    // Detect fatigue indicators
    insights.fatigueIndicators = await this.detectFatigueIndicators(userId);

    // Generate recommendations
    insights.recommendations = this.generateDismissalRecommendations(insights);

    return insights;
  }

  /**
   * Tracks notification fatigue and suggests mitigation
   */
  async trackNotificationFatigue(userId: string): Promise<FatigueAnalysis> {
    const recentEvents = await this.storageService.getEvents(userId, {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      end: new Date()
    });

    const fatigueScore = this.calculateFatigueScore(recentEvents);
    const fatigueFactors = this.identifyFatigueFactors(recentEvents);
    const mitigationStrategies = this.suggestMitigationStrategies(fatigueFactors);

    return {
      fatigueScore,
      level: this.categorizeFatigueLevel(fatigueScore),
      factors: fatigueFactors,
      mitigationStrategies,
      projectedImprovement: this.projectImprovement(fatigueFactors, mitigationStrategies)
    };
  }

  /**
   * Provides real-time optimization suggestions
   */
  async getOptimizationSuggestions(
    notification: Notification,
    userId: string
  ): Promise<OptimizationSuggestion[]> {
    const userPatterns = await this.getUserDismissalPatterns(userId);
    const recentAnalytics = await this.getRecentAnalytics(userId, 24 * 60 * 60 * 1000); // 24 hours
    
    const suggestions: OptimizationSuggestion[] = [];

    // Timing optimization
    const timingSuggestion = await this.suggestOptimalTiming(notification, userPatterns);
    if (timingSuggestion) {
      suggestions.push(timingSuggestion);
    }

    // Content optimization
    const contentSuggestion = this.suggestContentOptimization(notification, userPatterns);
    if (contentSuggestion) {
      suggestions.push(contentSuggestion);
    }

    // Channel optimization
    const channelSuggestion = this.suggestOptimalChannel(notification, recentAnalytics);
    if (channelSuggestion) {
      suggestions.push(channelSuggestion);
    }

    // Frequency optimization
    const frequencySuggestion = this.suggestFrequencyAdjustment(notification, recentAnalytics);
    if (frequencySuggestion) {
      suggestions.push(frequencySuggestion);
    }

    return suggestions.sort((a, b) => b.impact - a.impact);
  }

  /**
   * Generates A/B testing recommendations
   */
  async generateABTestRecommendations(userId: string): Promise<ABTestRecommendation[]> {
    const analytics = await this.getNotificationAnalytics(userId, {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end: new Date()
    });

    const recommendations: ABTestRecommendation[] = [];

    // Test different timing strategies
    if (analytics.timing.peakEngagementHours.length > 0) {
      recommendations.push({
        testType: 'timing',
        hypothesis: 'Sending notifications during peak engagement hours will improve interaction rates',
        variants: [
          { name: 'current', description: 'Current timing strategy' },
          { name: 'peak_hours', description: 'Send during peak engagement hours' }
        ],
        expectedImprovement: 15,
        duration: 14, // days
        sampleSize: 1000
      });
    }

    // Test different content formats
    if (analytics.engagement.averageTimeToAction > 30000) { // > 30 seconds
      recommendations.push({
        testType: 'content',
        hypothesis: 'Shorter, more actionable notification content will reduce time to action',
        variants: [
          { name: 'current', description: 'Current content format' },
          { name: 'concise', description: 'Shorter, action-focused content' }
        ],
        expectedImprovement: 25,
        duration: 21, // days
        sampleSize: 800
      });
    }

    // Test different grouping strategies
    if (analytics.overview.totalNotifications > 100) {
      recommendations.push({
        testType: 'grouping',
        hypothesis: 'Smart grouping will reduce notification fatigue and improve engagement',
        variants: [
          { name: 'individual', description: 'Send notifications individually' },
          { name: 'smart_grouped', description: 'Group similar notifications intelligently' }
        ],
        expectedImprovement: 20,
        duration: 28, // days
        sampleSize: 1200
      });
    }

    return recommendations;
  }

  private async initializeAnalytics(): Promise<void> {
    // Load existing dismissal patterns
    const patterns = await this.storageService.getDismissalPatterns();
    patterns.forEach(pattern => {
      const userPatterns = this.dismissalPatterns.get(pattern.userId) || [];
      userPatterns.push(pattern);
      this.dismissalPatterns.set(pattern.userId, userPatterns);
    });
  }

  private startPeriodicFlush(): void {
    setInterval(() => {
      this.flushAnalytics();
    }, this.flushInterval);
  }

  private async flushAnalytics(): Promise<void> {
    if (this.analyticsBuffer.length === 0) return;

    const batch = [...this.analyticsBuffer];
    this.analyticsBuffer = [];

    try {
      await this.storageService.saveBatch(batch);
    } catch (error) {
      console.error('Failed to flush analytics:', error);
      // Re-add to buffer for retry
      this.analyticsBuffer.unshift(...batch);
    }
  }

  private async updateDismissalPatterns(analytics: NotificationAnalytics): Promise<void> {
    if (analytics.event !== 'dismissed' && analytics.event !== 'clicked') return;

    const userId = analytics.userId;
    const userPatterns = this.dismissalPatterns.get(userId) || [];
    
    // Find or create pattern for this category/type combination
    let pattern = userPatterns.find(p => 
      p.category === analytics.context.category && 
      p.type === analytics.context.type
    );

    if (!pattern) {
      pattern = {
        userId,
        category: analytics.context.category as NotificationCategory,
        type: analytics.context.type as NotificationType,
        dismissalRate: 0,
        averageTimeToAction: 0,
        preferredActions: [],
        lastUpdated: new Date()
      };
      userPatterns.push(pattern);
    }

    // Update pattern based on event
    const alpha = 0.1; // Learning rate
    if (analytics.event === 'dismissed') {
      pattern.dismissalRate = pattern.dismissalRate * (1 - alpha) + alpha;
    } else if (analytics.event === 'clicked') {
      pattern.dismissalRate = pattern.dismissalRate * (1 - alpha);
      
      // Update average time to action
      const timeToAction = analytics.timestamp.getTime() - analytics.context.notificationTimestamp;
      pattern.averageTimeToAction = pattern.averageTimeToAction * (1 - alpha) + timeToAction * alpha;
    }

    pattern.lastUpdated = new Date();
    this.dismissalPatterns.set(userId, userPatterns);

    // Persist updated pattern
    await this.storageService.updateDismissalPattern(pattern);
  }

  private calculateOverviewMetrics(events: NotificationAnalytics[]): OverviewMetrics {
    const totalNotifications = new Set(events.map(e => e.notificationId)).size;
    const totalInteractions = events.length;
    const uniqueUsers = new Set(events.map(e => e.userId)).size;

    const deliveredEvents = events.filter(e => e.event === 'delivered');
    const viewedEvents = events.filter(e => e.event === 'viewed');
    const clickedEvents = events.filter(e => e.event === 'clicked');
    const dismissedEvents = events.filter(e => e.event === 'dismissed');

    return {
      totalNotifications,
      totalInteractions,
      uniqueUsers,
      deliveryRate: deliveredEvents.length / totalNotifications,
      viewRate: viewedEvents.length / deliveredEvents.length,
      clickRate: clickedEvents.length / viewedEvents.length,
      dismissalRate: dismissedEvents.length / viewedEvents.length
    };
  }

  private calculateEngagementMetrics(events: NotificationAnalytics[]): EngagementMetrics {
    const interactionEvents = events.filter(e => 
      ['viewed', 'clicked', 'dismissed'].includes(e.event)
    );

    const timeToActions = interactionEvents
      .filter(e => e.context.timeToAction)
      .map(e => e.context.timeToAction!);

    return {
      averageTimeToAction: timeToActions.reduce((sum, time) => sum + time, 0) / timeToActions.length,
      medianTimeToAction: this.calculateMedian(timeToActions),
      engagementRate: events.filter(e => e.event === 'clicked').length / events.filter(e => e.event === 'viewed').length,
      retentionRate: this.calculateRetentionRate(events)
    };
  }

  private calculateTimingAnalytics(events: NotificationAnalytics[]): TimingAnalytics {
    const hourlyEngagement: Record<number, number> = {};
    const dailyEngagement: Record<number, number> = {};

    events.forEach(event => {
      const hour = event.timestamp.getHours();
      const day = event.timestamp.getDay();

      hourlyEngagement[hour] = (hourlyEngagement[hour] || 0) + 1;
      dailyEngagement[day] = (dailyEngagement[day] || 0) + 1;
    });

    const peakEngagementHours = Object.entries(hourlyEngagement)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    const peakEngagementDays = Object.entries(dailyEngagement)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([day]) => parseInt(day));

    return {
      hourlyEngagement,
      dailyEngagement,
      peakEngagementHours,
      peakEngagementDays,
      optimalSendTime: this.calculateOptimalSendTime(events)
    };
  }

  private calculateChannelEffectiveness(events: NotificationAnalytics[]): ChannelAnalytics {
    const channelStats: Record<string, { delivered: number; engaged: number }> = {};

    events.forEach(event => {
      const channel = event.context.channel;
      if (!channelStats[channel]) {
        channelStats[channel] = { delivered: 0, engaged: 0 };
      }

      if (event.event === 'delivered') {
        channelStats[channel].delivered++;
      } else if (['viewed', 'clicked'].includes(event.event)) {
        channelStats[channel].engaged++;
      }
    });

    const effectiveness: Record<string, number> = {};
    Object.entries(channelStats).forEach(([channel, stats]) => {
      effectiveness[channel] = stats.delivered > 0 ? stats.engaged / stats.delivered : 0;
    });

    return {
      channelStats,
      effectiveness,
      recommendedChannels: Object.entries(effectiveness)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([channel]) => channel)
    };
  }

  private calculateCategoryPerformance(events: NotificationAnalytics[]): CategoryAnalytics {
    const categoryStats: Record<string, { sent: number; engaged: number; dismissed: number }> = {};

    events.forEach(event => {
      const category = event.context.category || 'unknown';
      if (!categoryStats[category]) {
        categoryStats[category] = { sent: 0, engaged: 0, dismissed: 0 };
      }

      if (event.event === 'delivered') {
        categoryStats[category].sent++;
      } else if (['viewed', 'clicked'].includes(event.event)) {
        categoryStats[category].engaged++;
      } else if (event.event === 'dismissed') {
        categoryStats[category].dismissed++;
      }
    });

    const performance: Record<string, number> = {};
    Object.entries(categoryStats).forEach(([category, stats]) => {
      performance[category] = stats.sent > 0 ? stats.engaged / stats.sent : 0;
    });

    return {
      categoryStats,
      performance,
      topPerformingCategories: Object.entries(performance)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category]) => category)
    };
  }

  private calculateTrends(events: NotificationAnalytics[]): TrendAnalytics {
    // Group events by day
    const dailyMetrics: Record<string, { sent: number; engaged: number }> = {};

    events.forEach(event => {
      const day = event.timestamp.toISOString().split('T')[0];
      if (!dailyMetrics[day]) {
        dailyMetrics[day] = { sent: 0, engaged: 0 };
      }

      if (event.event === 'delivered') {
        dailyMetrics[day].sent++;
      } else if (['viewed', 'clicked'].includes(event.event)) {
        dailyMetrics[day].engaged++;
      }
    });

    const engagementTrend = Object.entries(dailyMetrics).map(([date, metrics]) => ({
      date,
      engagementRate: metrics.sent > 0 ? metrics.engaged / metrics.sent : 0
    }));

    return {
      engagementTrend,
      volumeTrend: Object.entries(dailyMetrics).map(([date, metrics]) => ({
        date,
        volume: metrics.sent
      })),
      trendDirection: this.calculateTrendDirection(engagementTrend)
    };
  }

  private async generateRecommendations(
    userId: string,
    events: NotificationAnalytics[]
  ): Promise<AnalyticsRecommendation[]> {
    const recommendations: AnalyticsRecommendation[] = [];

    // Low engagement recommendation
    const engagementRate = events.filter(e => e.event === 'clicked').length / 
                          events.filter(e => e.event === 'viewed').length;
    
    if (engagementRate < 0.1) {
      recommendations.push({
        type: 'improve_engagement',
        priority: 'high',
        title: 'Improve Notification Engagement',
        description: 'Your notification engagement rate is below 10%. Consider improving content relevance and timing.',
        expectedImpact: 'high',
        actionItems: [
          'Review notification content for relevance',
          'Optimize send timing based on user activity',
          'Implement personalization based on user preferences'
        ]
      });
    }

    // High dismissal rate recommendation
    const dismissalRate = events.filter(e => e.event === 'dismissed').length / 
                         events.filter(e => e.event === 'viewed').length;
    
    if (dismissalRate > 0.5) {
      recommendations.push({
        type: 'reduce_dismissals',
        priority: 'medium',
        title: 'Reduce Notification Dismissals',
        description: 'Over 50% of your notifications are being dismissed. Consider reducing frequency or improving targeting.',
        expectedImpact: 'medium',
        actionItems: [
          'Implement smarter notification grouping',
          'Allow users to customize notification preferences',
          'Use machine learning to improve targeting'
        ]
      });
    }

    return recommendations;
  }

  private async getUserDismissalPatterns(userId: string): Promise<DismissalPattern[]> {
    return this.dismissalPatterns.get(userId) || [];
  }

  private calculateEngagementScore(pattern: DismissalPattern): number {
    // Higher score = better engagement
    const dismissalPenalty = pattern.dismissalRate * 0.5;
    const timePenalty = Math.min(pattern.averageTimeToAction / 60000, 1) * 0.3; // Normalize to minutes
    return Math.max(0, 1 - dismissalPenalty - timePenalty);
  }

  private async calculateOptimalTimings(userId: string): Promise<Record<string, number[]>> {
    // Simplified implementation - would analyze historical engagement by hour
    return {
      weekday: [9, 13, 17], // 9 AM, 1 PM, 5 PM
      weekend: [10, 15] // 10 AM, 3 PM
    };
  }

  private async detectFatigueIndicators(userId: string): Promise<FatigueIndicator[]> {
    const indicators: FatigueIndicator[] = [];
    
    // This would analyze patterns like:
    // - Increasing dismissal rates over time
    // - Decreasing time spent viewing notifications
    // - Clustering of dismissals
    
    return indicators;
  }

  private generateDismissalRecommendations(insights: DismissalInsights): string[] {
    const recommendations: string[] = [];

    if (insights.highDismissalCategories.length > 0) {
      recommendations.push('Consider reducing frequency for high-dismissal categories');
    }

    if (insights.lowEngagementTypes.length > 0) {
      recommendations.push('Improve content relevance for low-engagement notification types');
    }

    return recommendations;
  }

  private calculateFatigueScore(events: NotificationAnalytics[]): number {
    // Simplified fatigue calculation
    const dismissalRate = events.filter(e => e.event === 'dismissed').length / 
                         events.filter(e => e.event === 'viewed').length;
    const volume = events.filter(e => e.event === 'delivered').length;
    const volumeScore = Math.min(volume / 100, 1); // Normalize to 0-1

    return (dismissalRate * 0.6) + (volumeScore * 0.4);
  }

  private identifyFatigueFactors(events: NotificationAnalytics[]): FatigueFactor[] {
    // Analyze what's contributing to fatigue
    return [];
  }

  private suggestMitigationStrategies(factors: FatigueFactor[]): MitigationStrategy[] {
    // Suggest ways to reduce fatigue
    return [];
  }

  private categorizeFatigueLevel(score: number): 'low' | 'medium' | 'high' {
    if (score < 0.3) return 'low';
    if (score < 0.6) return 'medium';
    return 'high';
  }

  private projectImprovement(factors: FatigueFactor[], strategies: MitigationStrategy[]): number {
    // Project potential improvement from strategies
    return 0.2; // 20% improvement
  }

  private async getRecentAnalytics(userId: string, timeWindow: number): Promise<NotificationAnalytics[]> {
    return this.storageService.getEvents(userId, {
      start: new Date(Date.now() - timeWindow),
      end: new Date()
    });
  }

  private async suggestOptimalTiming(
    notification: Notification,
    patterns: DismissalPattern[]
  ): Promise<OptimizationSuggestion | null> {
    // Analyze patterns to suggest optimal timing
    return null;
  }

  private suggestContentOptimization(
    notification: Notification,
    patterns: DismissalPattern[]
  ): OptimizationSuggestion | null {
    // Suggest content improvements based on patterns
    return null;
  }

  private suggestOptimalChannel(
    notification: Notification,
    analytics: NotificationAnalytics[]
  ): OptimizationSuggestion | null {
    // Suggest best channel based on recent performance
    return null;
  }

  private suggestFrequencyAdjustment(
    notification: Notification,
    analytics: NotificationAnalytics[]
  ): OptimizationSuggestion | null {
    // Suggest frequency adjustments
    return null;
  }

  private calculateMedian(numbers: number[]): number {
    const sorted = numbers.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private calculateRetentionRate(events: NotificationAnalytics[]): number {
    // Simplified retention calculation
    return 0.8; // 80% retention
  }

  private calculateOptimalSendTime(events: NotificationAnalytics[]): string {
    // Find hour with highest engagement
    const hourlyEngagement: Record<number, number> = {};
    events.forEach(event => {
      if (event.event === 'clicked') {
        const hour = event.timestamp.getHours();
        hourlyEngagement[hour] = (hourlyEngagement[hour] || 0) + 1;
      }
    });

    const optimalHour = Object.entries(hourlyEngagement)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '9';

    return `${optimalHour.padStart(2, '0')}:00`;
  }

  private calculateTrendDirection(trend: Array<{ date: string; engagementRate: number }>): 'up' | 'down' | 'stable' {
    if (trend.length < 2) return 'stable';
    
    const recent = trend.slice(-7); // Last 7 days
    const older = trend.slice(-14, -7); // Previous 7 days
    
    const recentAvg = recent.reduce((sum, t) => sum + t.engagementRate, 0) / recent.length;
    const olderAvg = older.reduce((sum, t) => sum + t.engagementRate, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.05) return 'up';
    if (change < -0.05) return 'down';
    return 'stable';
  }
}

// Supporting interfaces
interface AnalyticsStorageService {
  getEvents(userId: string, timeRange: TimeRange): Promise<NotificationAnalytics[]>;
  saveBatch(analytics: NotificationAnalytics[]): Promise<void>;
  getDismissalPatterns(): Promise<DismissalPattern[]>;
  updateDismissalPattern(pattern: DismissalPattern): Promise<void>;
}

interface PrivacyService {
  sanitizeAnalytics(analytics: NotificationAnalytics): Promise<NotificationAnalytics>;
}

interface TimeRange {
  start: Date;
  end: Date;
}

interface NotificationAnalyticsReport {
  overview: OverviewMetrics;
  engagement: EngagementMetrics;
  timing: TimingAnalytics;
  channels: ChannelAnalytics;
  categories: CategoryAnalytics;
  trends: TrendAnalytics;
  recommendations: AnalyticsRecommendation[];
}

interface OverviewMetrics {
  totalNotifications: number;
  totalInteractions: number;
  uniqueUsers: number;
  deliveryRate: number;
  viewRate: number;
  clickRate: number;
  dismissalRate: number;
}

interface EngagementMetrics {
  averageTimeToAction: number;
  medianTimeToAction: number;
  engagementRate: number;
  retentionRate: number;
}

interface TimingAnalytics {
  hourlyEngagement: Record<number, number>;
  dailyEngagement: Record<number, number>;
  peakEngagementHours: number[];
  peakEngagementDays: number[];
  optimalSendTime: string;
}

interface ChannelAnalytics {
  channelStats: Record<string, { delivered: number; engaged: number }>;
  effectiveness: Record<string, number>;
  recommendedChannels: string[];
}

interface CategoryAnalytics {
  categoryStats: Record<string, { sent: number; engaged: number; dismissed: number }>;
  performance: Record<string, number>;
  topPerformingCategories: string[];
}

interface TrendAnalytics {
  engagementTrend: Array<{ date: string; engagementRate: number }>;
  volumeTrend: Array<{ date: string; volume: number }>;
  trendDirection: 'up' | 'down' | 'stable';
}

interface AnalyticsRecommendation {
  type: string;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  expectedImpact: 'low' | 'medium' | 'high';
  actionItems: string[];
}

interface DismissalInsights {
  highDismissalCategories: Array<{
    category: NotificationCategory;
    dismissalRate: number;
    averageTimeToAction: number;
  }>;
  lowEngagementTypes: Array<{
    type: NotificationType;
    category: NotificationCategory;
    engagementScore: number;
  }>;
  optimalTimings: Record<string, number[]>;
  fatigueIndicators: FatigueIndicator[];
  recommendations: string[];
}

interface FatigueAnalysis {
  fatigueScore: number;
  level: 'low' | 'medium' | 'high';
  factors: FatigueFactor[];
  mitigationStrategies: MitigationStrategy[];
  projectedImprovement: number;
}

interface FatigueIndicator {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

interface FatigueFactor {
  factor: string;
  impact: number;
  description: string;
}

interface MitigationStrategy {
  strategy: string;
  expectedReduction: number;
  description: string;
}

interface OptimizationSuggestion {
  type: 'timing' | 'content' | 'channel' | 'frequency';
  title: string;
  description: string;
  impact: number; // 0-1 scale
  implementation: string;
}

interface ABTestRecommendation {
  testType: 'timing' | 'content' | 'grouping';
  hypothesis: string;
  variants: Array<{ name: string; description: string }>;
  expectedImprovement: number;
  duration: number;
  sampleSize: number;
}