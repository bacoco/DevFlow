/**
 * TeamInsightsService
 * Generates team insights with privacy protection and anonymization
 */

import {
  TeamInsights,
  TeamMetric,
  TeamTrend,
  TeamComparison,
  TrendDataPoint,
  MetricCategory,
  TrendDirection,
  InsightsPrivacy,
  AggregationLevel,
  TimePeriod,
  TimeGranularity
} from './types';

interface UserActivity {
  userId: string;
  timestamp: Date;
  activity: string;
  value: number;
  metadata: Record<string, any>;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  joinedAt: Date;
  isActive: boolean;
}

export class TeamInsightsService {
  private userActivities: Map<string, UserActivity[]> = new Map();
  private teamMembers: Map<string, TeamMember[]> = new Map();
  private benchmarkData: Map<string, number> = new Map();

  constructor() {
    this.initializeBenchmarkData();
  }

  /**
   * Generate comprehensive team insights for a given period
   */
  async generateTeamInsights(
    teamId: string,
    period: { start: Date; end: Date },
    privacy?: InsightsPrivacy
  ): Promise<TeamInsights> {
    const defaultPrivacy: InsightsPrivacy = {
      anonymizeIndividuals: true,
      aggregationLevel: 'team',
      excludeMetrics: [],
      retentionDays: 90
    };

    const privacySettings = { ...defaultPrivacy, ...privacy };
    
    // Get team members
    const members = this.teamMembers.get(teamId) || [];
    
    // Generate metrics
    const metrics = await this.generateTeamMetrics(teamId, period, privacySettings);
    
    // Generate trends
    const trends = await this.generateTeamTrends(teamId, period, privacySettings);
    
    // Generate comparisons
    const comparisons = await this.generateTeamComparisons(teamId, period, privacySettings);

    const insights: TeamInsights = {
      teamId,
      period: {
        start: period.start,
        end: period.end,
        granularity: this.determineGranularity(period.start, period.end)
      },
      metrics,
      trends,
      comparisons,
      privacy: privacySettings,
      generatedAt: new Date()
    };

    // Log insights generation
    this.logInsightsActivity(teamId, 'insights_generated', {
      period,
      metricCount: metrics.length,
      trendCount: trends.length,
      privacyLevel: privacySettings.aggregationLevel
    });

    return insights;
  }

  /**
   * Record user activity for insights generation
   */
  async recordUserActivity(
    userId: string,
    activity: string,
    value: number = 1,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    if (!this.userActivities.has(userId)) {
      this.userActivities.set(userId, []);
    }

    const userActivity: UserActivity = {
      userId,
      timestamp: new Date(),
      activity,
      value,
      metadata
    };

    this.userActivities.get(userId)!.push(userActivity);

    // Keep only recent activities (based on retention policy)
    this.cleanupOldActivities(userId);
  }

  /**
   * Get team comparisons with industry benchmarks
   */
  async getTeamComparisons(teamId: string): Promise<TeamComparison[]> {
    const members = this.teamMembers.get(teamId) || [];
    const comparisons: TeamComparison[] = [];

    // Calculate team averages for key metrics
    const teamMetrics = await this.calculateTeamAverages(teamId);

    for (const [metric, teamValue] of teamMetrics) {
      const benchmarkValue = this.benchmarkData.get(metric) || 0;
      
      if (benchmarkValue > 0) {
        const percentile = this.calculatePercentile(teamValue, benchmarkValue);
        
        comparisons.push({
          metric,
          teamValue,
          benchmarkValue,
          percentile,
          category: this.getMetricCategory(metric)
        });
      }
    }

    return comparisons;
  }

  /**
   * Get anonymized team performance summary
   */
  async getAnonymizedTeamSummary(
    teamId: string,
    period: { start: Date; end: Date }
  ): Promise<{
    totalMembers: number;
    activeMembers: number;
    topPerformers: number;
    improvementAreas: string[];
    strengths: string[];
  }> {
    const members = this.teamMembers.get(teamId) || [];
    const activeMembers = members.filter(m => m.isActive).length;
    
    // Calculate performance distribution (anonymized)
    const performanceScores = await this.calculateAnonymizedPerformance(teamId, period);
    const topPerformers = performanceScores.filter(score => score > 0.8).length;

    // Identify improvement areas and strengths
    const metrics = await this.generateTeamMetrics(teamId, period, {
      anonymizeIndividuals: true,
      aggregationLevel: 'team',
      excludeMetrics: [],
      retentionDays: 90
    });

    const improvementAreas = metrics
      .filter(m => m.changeDirection === 'down' && Math.abs(m.change) > 0.1)
      .map(m => m.name);

    const strengths = metrics
      .filter(m => m.changeDirection === 'up' && m.change > 0.1)
      .map(m => m.name);

    return {
      totalMembers: members.length,
      activeMembers,
      topPerformers,
      improvementAreas,
      strengths
    };
  }

  // Private methods for generating insights

  private async generateTeamMetrics(
    teamId: string,
    period: { start: Date; end: Date },
    privacy: InsightsPrivacy
  ): Promise<TeamMetric[]> {
    const metrics: TeamMetric[] = [];
    const members = this.teamMembers.get(teamId) || [];

    // Productivity metrics
    if (!privacy.excludeMetrics.includes('commits_per_day')) {
      const commitsMetric = await this.calculateCommitsPerDay(teamId, period, privacy);
      metrics.push(commitsMetric);
    }

    if (!privacy.excludeMetrics.includes('collaboration_score')) {
      const collaborationMetric = await this.calculateCollaborationScore(teamId, period, privacy);
      metrics.push(collaborationMetric);
    }

    if (!privacy.excludeMetrics.includes('code_quality_score')) {
      const qualityMetric = await this.calculateCodeQualityScore(teamId, period, privacy);
      metrics.push(qualityMetric);
    }

    if (!privacy.excludeMetrics.includes('engagement_level')) {
      const engagementMetric = await this.calculateEngagementLevel(teamId, period, privacy);
      metrics.push(engagementMetric);
    }

    return metrics;
  }

  private async generateTeamTrends(
    teamId: string,
    period: { start: Date; end: Date },
    privacy: InsightsPrivacy
  ): Promise<TeamTrend[]> {
    const trends: TeamTrend[] = [];

    // Generate trends for key metrics
    const trendMetrics = ['productivity', 'collaboration', 'quality', 'engagement'];

    for (const metric of trendMetrics) {
      if (privacy.excludeMetrics.includes(metric)) continue;

      const dataPoints = await this.generateTrendDataPoints(teamId, metric, period, privacy);
      const direction = this.calculateTrendDirection(dataPoints);
      const confidence = this.calculateTrendConfidence(dataPoints);
      const insights = this.generateTrendInsights(metric, direction, dataPoints);

      trends.push({
        metric,
        dataPoints,
        direction,
        confidence,
        insights
      });
    }

    return trends;
  }

  private async generateTeamComparisons(
    teamId: string,
    period: { start: Date; end: Date },
    privacy: InsightsPrivacy
  ): Promise<TeamComparison[]> {
    const comparisons: TeamComparison[] = [];
    const teamMetrics = await this.calculateTeamAverages(teamId);

    for (const [metric, teamValue] of teamMetrics) {
      if (privacy.excludeMetrics.includes(metric)) continue;

      const benchmarkValue = this.benchmarkData.get(metric);
      if (benchmarkValue) {
        const percentile = this.calculatePercentile(teamValue, benchmarkValue);
        
        comparisons.push({
          metric,
          teamValue,
          benchmarkValue,
          percentile,
          category: this.getMetricCategory(metric)
        });
      }
    }

    return comparisons;
  }

  // Metric calculation methods

  private async calculateCommitsPerDay(
    teamId: string,
    period: { start: Date; end: Date },
    privacy: InsightsPrivacy
  ): Promise<TeamMetric> {
    const members = this.teamMembers.get(teamId) || [];
    let totalCommits = 0;
    let contributorCount = 0;

    for (const member of members) {
      const activities = this.getUserActivitiesInPeriod(member.id, period, 'commit');
      if (activities.length > 0) {
        totalCommits += activities.reduce((sum, activity) => sum + activity.value, 0);
        contributorCount++;
      }
    }

    const days = Math.ceil((period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24));
    const commitsPerDay = days > 0 ? totalCommits / days : 0;
    
    // Calculate change from previous period
    const previousPeriod = this.getPreviousPeriod(period);
    const previousCommitsPerDay = await this.calculatePreviousCommitsPerDay(teamId, previousPeriod);
    const change = previousCommitsPerDay > 0 ? (commitsPerDay - previousCommitsPerDay) / previousCommitsPerDay : 0;

    return {
      name: 'Commits per Day',
      value: privacy.anonymizeIndividuals ? Math.round(commitsPerDay * 10) / 10 : commitsPerDay,
      unit: 'commits/day',
      change,
      changeDirection: change > 0.05 ? 'up' : change < -0.05 ? 'down' : 'stable',
      benchmark: this.benchmarkData.get('commits_per_day'),
      category: 'productivity'
    };
  }

  private async calculateCollaborationScore(
    teamId: string,
    period: { start: Date; end: Date },
    privacy: InsightsPrivacy
  ): Promise<TeamMetric> {
    const members = this.teamMembers.get(teamId) || [];
    let collaborationEvents = 0;

    for (const member of members) {
      const activities = this.getUserActivitiesInPeriod(member.id, period, 'collaboration');
      collaborationEvents += activities.length;
    }

    // Normalize collaboration score (0-100)
    const maxPossibleEvents = members.length * members.length * 7; // Assuming weekly interactions
    const collaborationScore = Math.min(100, (collaborationEvents / maxPossibleEvents) * 100);

    const previousPeriod = this.getPreviousPeriod(period);
    const previousScore = await this.calculatePreviousCollaborationScore(teamId, previousPeriod);
    const change = previousScore > 0 ? (collaborationScore - previousScore) / previousScore : 0;

    return {
      name: 'Collaboration Score',
      value: Math.round(collaborationScore),
      unit: 'score',
      change,
      changeDirection: change > 0.05 ? 'up' : change < -0.05 ? 'down' : 'stable',
      benchmark: this.benchmarkData.get('collaboration_score'),
      category: 'collaboration'
    };
  }

  private async calculateCodeQualityScore(
    teamId: string,
    period: { start: Date; end: Date },
    privacy: InsightsPrivacy
  ): Promise<TeamMetric> {
    const members = this.teamMembers.get(teamId) || [];
    let qualityEvents = 0;
    let totalEvents = 0;

    for (const member of members) {
      const activities = this.getUserActivitiesInPeriod(member.id, period);
      const qualityActivities = activities.filter(a => 
        a.activity.includes('review') || a.activity.includes('test') || a.activity.includes('refactor')
      );
      
      qualityEvents += qualityActivities.length;
      totalEvents += activities.length;
    }

    const qualityScore = totalEvents > 0 ? (qualityEvents / totalEvents) * 100 : 0;

    const previousPeriod = this.getPreviousPeriod(period);
    const previousScore = await this.calculatePreviousQualityScore(teamId, previousPeriod);
    const change = previousScore > 0 ? (qualityScore - previousScore) / previousScore : 0;

    return {
      name: 'Code Quality Score',
      value: Math.round(qualityScore),
      unit: 'score',
      change,
      changeDirection: change > 0.05 ? 'up' : change < -0.05 ? 'down' : 'stable',
      benchmark: this.benchmarkData.get('code_quality_score'),
      category: 'quality'
    };
  }

  private async calculateEngagementLevel(
    teamId: string,
    period: { start: Date; end: Date },
    privacy: InsightsPrivacy
  ): Promise<TeamMetric> {
    const members = this.teamMembers.get(teamId) || [];
    let activeMembers = 0;
    let totalActivities = 0;

    for (const member of members) {
      const activities = this.getUserActivitiesInPeriod(member.id, period);
      if (activities.length > 0) {
        activeMembers++;
        totalActivities += activities.length;
      }
    }

    const engagementLevel = members.length > 0 ? (activeMembers / members.length) * 100 : 0;

    const previousPeriod = this.getPreviousPeriod(period);
    const previousEngagement = await this.calculatePreviousEngagement(teamId, previousPeriod);
    const change = previousEngagement > 0 ? (engagementLevel - previousEngagement) / previousEngagement : 0;

    return {
      name: 'Team Engagement',
      value: Math.round(engagementLevel),
      unit: 'percentage',
      change,
      changeDirection: change > 0.05 ? 'up' : change < -0.05 ? 'down' : 'stable',
      benchmark: this.benchmarkData.get('engagement_level'),
      category: 'engagement'
    };
  }

  // Trend analysis methods

  private async generateTrendDataPoints(
    teamId: string,
    metric: string,
    period: { start: Date; end: Date },
    privacy: InsightsPrivacy
  ): Promise<TrendDataPoint[]> {
    const dataPoints: TrendDataPoint[] = [];
    const granularity = this.determineGranularity(period.start, period.end);
    const intervals = this.generateTimeIntervals(period.start, period.end, granularity);

    for (const interval of intervals) {
      const value = await this.calculateMetricForInterval(teamId, metric, interval);
      const contributors = await this.getActiveContributorsForInterval(teamId, interval);

      dataPoints.push({
        timestamp: interval.start,
        value: privacy.anonymizeIndividuals ? Math.round(value * 10) / 10 : value,
        anonymizedContributors: contributors
      });
    }

    return dataPoints;
  }

  private calculateTrendDirection(dataPoints: TrendDataPoint[]): TrendDirection {
    if (dataPoints.length < 2) return 'stable';

    const values = dataPoints.map(dp => dp.value);
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;
    const variance = this.calculateVariance(values);

    if (variance > 0.3) return 'volatile';
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private calculateTrendConfidence(dataPoints: TrendDataPoint[]): number {
    if (dataPoints.length < 3) return 0.5;

    const values = dataPoints.map(dp => dp.value);
    const variance = this.calculateVariance(values);
    const trend = this.calculateLinearTrend(values);

    // Higher confidence for lower variance and stronger trend
    const confidenceScore = Math.max(0, Math.min(1, (1 - variance) * Math.abs(trend)));
    return Math.round(confidenceScore * 100) / 100;
  }

  private generateTrendInsights(
    metric: string,
    direction: TrendDirection,
    dataPoints: TrendDataPoint[]
  ): string[] {
    const insights: string[] = [];

    switch (direction) {
      case 'increasing':
        insights.push(`${metric} is showing positive growth over the period`);
        if (dataPoints.length > 0) {
          const growth = ((dataPoints[dataPoints.length - 1].value - dataPoints[0].value) / dataPoints[0].value) * 100;
          insights.push(`Growth rate: ${Math.round(growth)}%`);
        }
        break;
      
      case 'decreasing':
        insights.push(`${metric} is declining and may need attention`);
        insights.push('Consider investigating potential causes and implementing improvement strategies');
        break;
      
      case 'volatile':
        insights.push(`${metric} shows high variability`);
        insights.push('Consider stabilizing factors that may be causing fluctuations');
        break;
      
      case 'stable':
        insights.push(`${metric} is maintaining consistent levels`);
        break;
    }

    return insights;
  }

  // Helper methods

  private getUserActivitiesInPeriod(
    userId: string,
    period: { start: Date; end: Date },
    activityFilter?: string
  ): UserActivity[] {
    const activities = this.userActivities.get(userId) || [];
    
    return activities.filter(activity => {
      const inPeriod = activity.timestamp >= period.start && activity.timestamp <= period.end;
      const matchesFilter = !activityFilter || activity.activity.includes(activityFilter);
      return inPeriod && matchesFilter;
    });
  }

  private async calculateTeamAverages(teamId: string): Promise<Map<string, number>> {
    const averages = new Map<string, number>();
    const members = this.teamMembers.get(teamId) || [];

    // Calculate averages for key metrics
    const metrics = ['commits_per_day', 'collaboration_score', 'code_quality_score', 'engagement_level'];
    
    for (const metric of metrics) {
      let total = 0;
      let count = 0;

      for (const member of members) {
        const activities = this.userActivities.get(member.id) || [];
        const metricActivities = activities.filter(a => a.activity.includes(metric.split('_')[0]));
        
        if (metricActivities.length > 0) {
          total += metricActivities.reduce((sum, activity) => sum + activity.value, 0);
          count++;
        }
      }

      averages.set(metric, count > 0 ? total / count : 0);
    }

    return averages;
  }

  private calculatePercentile(value: number, benchmark: number): number {
    // Simplified percentile calculation
    const ratio = value / benchmark;
    return Math.min(100, Math.max(0, ratio * 50 + 25));
  }

  private getMetricCategory(metric: string): string {
    if (metric.includes('commit') || metric.includes('productivity')) return 'productivity';
    if (metric.includes('collaboration') || metric.includes('share')) return 'collaboration';
    if (metric.includes('quality') || metric.includes('review')) return 'quality';
    if (metric.includes('engagement') || metric.includes('activity')) return 'engagement';
    return 'other';
  }

  private async calculateAnonymizedPerformance(
    teamId: string,
    period: { start: Date; end: Date }
  ): Promise<number[]> {
    const members = this.teamMembers.get(teamId) || [];
    const scores: number[] = [];

    for (const member of members) {
      const activities = this.getUserActivitiesInPeriod(member.id, period);
      const score = Math.min(1, activities.length / 100); // Normalize to 0-1
      scores.push(score);
    }

    return scores;
  }

  private determineGranularity(start: Date, end: Date): TimeGranularity {
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    
    if (diffDays <= 7) return 'day';
    if (diffDays <= 30) return 'week';
    if (diffDays <= 90) return 'month';
    return 'quarter';
  }

  private generateTimeIntervals(
    start: Date,
    end: Date,
    granularity: TimeGranularity
  ): { start: Date; end: Date }[] {
    const intervals: { start: Date; end: Date }[] = [];
    let current = new Date(start);

    while (current < end) {
      const intervalEnd = new Date(current);
      
      switch (granularity) {
        case 'day':
          intervalEnd.setDate(intervalEnd.getDate() + 1);
          break;
        case 'week':
          intervalEnd.setDate(intervalEnd.getDate() + 7);
          break;
        case 'month':
          intervalEnd.setMonth(intervalEnd.getMonth() + 1);
          break;
        case 'quarter':
          intervalEnd.setMonth(intervalEnd.getMonth() + 3);
          break;
      }

      intervals.push({
        start: new Date(current),
        end: new Date(Math.min(intervalEnd.getTime(), end.getTime()))
      });

      current = intervalEnd;
    }

    return intervals;
  }

  private async calculateMetricForInterval(
    teamId: string,
    metric: string,
    interval: { start: Date; end: Date }
  ): Promise<number> {
    const members = this.teamMembers.get(teamId) || [];
    let total = 0;

    for (const member of members) {
      const activities = this.getUserActivitiesInPeriod(member.id, interval, metric);
      total += activities.reduce((sum, activity) => sum + activity.value, 0);
    }

    return total;
  }

  private async getActiveContributorsForInterval(
    teamId: string,
    interval: { start: Date; end: Date }
  ): Promise<number> {
    const members = this.teamMembers.get(teamId) || [];
    let activeCount = 0;

    for (const member of members) {
      const activities = this.getUserActivitiesInPeriod(member.id, interval);
      if (activities.length > 0) {
        activeCount++;
      }
    }

    return activeCount;
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    
    return variance / (mean * mean); // Coefficient of variation
  }

  private calculateLinearTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  private getPreviousPeriod(period: { start: Date; end: Date }): { start: Date; end: Date } {
    const duration = period.end.getTime() - period.start.getTime();
    return {
      start: new Date(period.start.getTime() - duration),
      end: new Date(period.start.getTime())
    };
  }

  private async calculatePreviousCommitsPerDay(
    teamId: string,
    period: { start: Date; end: Date }
  ): Promise<number> {
    // Simplified implementation
    return Math.random() * 10; // Mock previous value
  }

  private async calculatePreviousCollaborationScore(
    teamId: string,
    period: { start: Date; end: Date }
  ): Promise<number> {
    return Math.random() * 100; // Mock previous value
  }

  private async calculatePreviousQualityScore(
    teamId: string,
    period: { start: Date; end: Date }
  ): Promise<number> {
    return Math.random() * 100; // Mock previous value
  }

  private async calculatePreviousEngagement(
    teamId: string,
    period: { start: Date; end: Date }
  ): Promise<number> {
    return Math.random() * 100; // Mock previous value
  }

  private cleanupOldActivities(userId: string): void {
    const activities = this.userActivities.get(userId);
    if (!activities) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90); // Keep 90 days

    const recentActivities = activities.filter(activity => activity.timestamp >= cutoffDate);
    this.userActivities.set(userId, recentActivities);
  }

  private initializeBenchmarkData(): void {
    // Initialize with industry benchmark data
    this.benchmarkData.set('commits_per_day', 3.5);
    this.benchmarkData.set('collaboration_score', 75);
    this.benchmarkData.set('code_quality_score', 80);
    this.benchmarkData.set('engagement_level', 85);
  }

  private logInsightsActivity(
    teamId: string,
    action: string,
    metadata: Record<string, any>
  ): void {
    console.log(`📊 Team insights: ${action} for team ${teamId}`, metadata);
  }
}

export default TeamInsightsService;