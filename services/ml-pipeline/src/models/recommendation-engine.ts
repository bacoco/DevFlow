import { FeatureVector } from '../types/ml-types';
import { User, ProductivityMetric, MetricType } from '@devflow/shared-types';
// Simple statistics functions
const ss = {
  mean: (values: number[]): number => values.reduce((sum, val) => sum + val, 0) / values.length
};

export interface Recommendation {
  id: string;
  userId: string;
  type: RecommendationType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  actionItems: ActionItem[];
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  category: RecommendationCategory;
  metadata: RecommendationMetadata;
  expiresAt: Date;
}

export interface ActionItem {
  id: string;
  description: string;
  type: 'immediate' | 'short_term' | 'long_term';
  estimatedEffort: number; // in hours
  expectedImpact: number; // 0-1 scale
  resources: string[];
}

export interface RecommendationMetadata {
  basedOnMetrics: string[];
  similarUsers: string[];
  confidence: number;
  generatedAt: Date;
  algorithm: string;
  version: string;
}

export enum RecommendationType {
  PRODUCTIVITY_IMPROVEMENT = 'productivity_improvement',
  FOCUS_OPTIMIZATION = 'focus_optimization',
  CODE_QUALITY_ENHANCEMENT = 'code_quality_enhancement',
  COLLABORATION_IMPROVEMENT = 'collaboration_improvement',
  SKILL_DEVELOPMENT = 'skill_development',
  WORKFLOW_OPTIMIZATION = 'workflow_optimization',
  HEALTH_WELLNESS = 'health_wellness'
}

export enum RecommendationCategory {
  PERSONAL = 'personal',
  TEAM = 'team',
  TECHNICAL = 'technical',
  PROCESS = 'process'
}

export interface UserProfile {
  userId: string;
  features: Record<string, number>;
  preferences: UserPreferences;
  historicalMetrics: ProductivityMetric[];
  skillLevel: SkillLevel;
  workingStyle: WorkingStyle;
}

export interface UserPreferences {
  preferredWorkingHours: number[];
  communicationStyle: 'direct' | 'collaborative' | 'independent';
  learningStyle: 'visual' | 'hands_on' | 'theoretical';
  feedbackFrequency: 'immediate' | 'daily' | 'weekly';
}

export interface SkillLevel {
  overall: number; // 0-1 scale
  technical: number;
  collaboration: number;
  leadership: number;
  domain: Record<string, number>;
}

export interface WorkingStyle {
  focusPreference: 'deep_work' | 'collaborative' | 'mixed';
  productivityPeakHours: number[];
  interruptionTolerance: number; // 0-1 scale
  multitaskingAbility: number; // 0-1 scale
}

export interface SimilarityScore {
  userId: string;
  similarity: number;
  commonMetrics: string[];
  sharedCharacteristics: string[];
}

export class CollaborativeFilteringEngine {
  private userProfiles: Map<string, UserProfile> = new Map();
  private userSimilarities: Map<string, SimilarityScore[]> = new Map();
  private recommendationTemplates: Map<RecommendationType, RecommendationTemplate> = new Map();

  constructor() {
    this.initializeRecommendationTemplates();
  }

  async buildUserProfile(
    userId: string,
    features: FeatureVector[],
    metrics: ProductivityMetric[],
    user: User
  ): Promise<UserProfile> {
    // Aggregate features over time
    const aggregatedFeatures = this.aggregateFeatures(features);
    
    // Infer user preferences from behavior patterns
    const preferences = this.inferUserPreferences(features, metrics);
    
    // Calculate skill levels from metrics
    const skillLevel = this.calculateSkillLevel(metrics, features);
    
    // Determine working style
    const workingStyle = this.determineWorkingStyle(features, metrics);

    const profile: UserProfile = {
      userId,
      features: aggregatedFeatures,
      preferences,
      historicalMetrics: metrics,
      skillLevel,
      workingStyle
    };

    this.userProfiles.set(userId, profile);
    return profile;
  }

  async calculateUserSimilarity(userId1: string, userId2: string): Promise<number> {
    const profile1 = this.userProfiles.get(userId1);
    const profile2 = this.userProfiles.get(userId2);

    if (!profile1 || !profile2) {
      return 0;
    }

    // Calculate feature similarity using cosine similarity
    const featureSimilarity = this.cosineSimilarity(profile1.features, profile2.features);
    
    // Calculate preference similarity
    const preferenceSimilarity = this.calculatePreferenceSimilarity(
      profile1.preferences, 
      profile2.preferences
    );
    
    // Calculate working style similarity
    const styleSimilarity = this.calculateWorkingStyleSimilarity(
      profile1.workingStyle,
      profile2.workingStyle
    );

    // Weighted combination
    const similarity = (
      featureSimilarity * 0.5 +
      preferenceSimilarity * 0.3 +
      styleSimilarity * 0.2
    );

    return Math.max(0, Math.min(1, similarity));
  }

  async findSimilarUsers(userId: string, limit: number = 10): Promise<SimilarityScore[]> {
    const targetProfile = this.userProfiles.get(userId);
    if (!targetProfile) {
      return [];
    }

    const similarities: SimilarityScore[] = [];

    for (const [otherUserId, otherProfile] of this.userProfiles.entries()) {
      if (otherUserId === userId) continue;

      const similarity = await this.calculateUserSimilarity(userId, otherUserId);
      
      if (similarity > 0.1) { // Minimum similarity threshold
        const commonMetrics = this.findCommonMetrics(targetProfile, otherProfile);
        const sharedCharacteristics = this.findSharedCharacteristics(targetProfile, otherProfile);

        similarities.push({
          userId: otherUserId,
          similarity,
          commonMetrics,
          sharedCharacteristics
        });
      }
    }

    // Sort by similarity and return top results
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topSimilarities = similarities.slice(0, limit);
    
    this.userSimilarities.set(userId, topSimilarities);
    return topSimilarities;
  }

  async generateRecommendations(userId: string): Promise<Recommendation[]> {
    const userProfile = this.userProfiles.get(userId);
    if (!userProfile) {
      throw new Error(`User profile not found for user ${userId}`);
    }

    const similarUsers = await this.findSimilarUsers(userId);
    const recommendations: Recommendation[] = [];

    // Generate different types of recommendations
    recommendations.push(...await this.generateProductivityRecommendations(userProfile, similarUsers));
    recommendations.push(...await this.generateFocusRecommendations(userProfile, similarUsers));
    recommendations.push(...await this.generateCodeQualityRecommendations(userProfile, similarUsers));
    recommendations.push(...await this.generateCollaborationRecommendations(userProfile, similarUsers));
    recommendations.push(...await this.generateSkillDevelopmentRecommendations(userProfile, similarUsers));

    // Sort by priority and confidence
    recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });

    return recommendations.slice(0, 10); // Return top 10 recommendations
  }

  private aggregateFeatures(features: FeatureVector[]): Record<string, number> {
    if (features.length === 0) return {};

    const aggregated: Record<string, number> = {};
    const featureNames = Object.keys(features[0].features);

    for (const featureName of featureNames) {
      const values = features.map(f => f.features[featureName]).filter(v => v !== undefined);
      if (values.length > 0) {
        aggregated[featureName] = ss.mean(values);
      }
    }

    return aggregated;
  }

  private inferUserPreferences(
    features: FeatureVector[],
    metrics: ProductivityMetric[]
  ): UserPreferences {
    // Analyze patterns to infer preferences
    const focusTimeMetrics = metrics.filter(m => m.metricType === MetricType.FOCUS_TIME);
    const peakHours = this.findPeakProductivityHours(focusTimeMetrics);

    return {
      preferredWorkingHours: peakHours,
      communicationStyle: this.inferCommunicationStyle(metrics),
      learningStyle: this.inferLearningStyle(features),
      feedbackFrequency: this.inferFeedbackFrequency(metrics)
    };
  }

  private calculateSkillLevel(
    metrics: ProductivityMetric[],
    features: FeatureVector[]
  ): SkillLevel {
    // Calculate skill levels based on performance metrics
    const codeQualityMetrics = metrics.filter(m => m.metricType === MetricType.CODE_CHURN);
    const collaborationMetrics = metrics.filter(m => m.metricType === MetricType.COLLABORATION_SCORE);

    const technical = this.calculateTechnicalSkill(codeQualityMetrics, features);
    const collaboration = this.calculateCollaborationSkill(collaborationMetrics);
    const leadership = this.calculateLeadershipSkill(metrics);

    return {
      overall: (technical + collaboration + leadership) / 3,
      technical,
      collaboration,
      leadership,
      domain: this.calculateDomainSkills(metrics)
    };
  }

  private determineWorkingStyle(
    features: FeatureVector[],
    metrics: ProductivityMetric[]
  ): WorkingStyle {
    const focusMetrics = metrics.filter(m => m.metricType === MetricType.FOCUS_TIME);
    const flowMetrics = metrics.filter(m => m.metricType === MetricType.TIME_IN_FLOW);

    return {
      focusPreference: this.determineFocusPreference(focusMetrics),
      productivityPeakHours: this.findPeakProductivityHours(focusMetrics),
      interruptionTolerance: this.calculateInterruptionTolerance(features),
      multitaskingAbility: this.calculateMultitaskingAbility(features)
    };
  }

  private cosineSimilarity(features1: Record<string, number>, features2: Record<string, number>): number {
    const commonFeatures = Object.keys(features1).filter(key => key in features2);
    
    if (commonFeatures.length === 0) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const feature of commonFeatures) {
      const val1 = features1[feature];
      const val2 = features2[feature];
      
      dotProduct += val1 * val2;
      norm1 += val1 * val1;
      norm2 += val2 * val2;
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  private calculatePreferenceSimilarity(pref1: UserPreferences, pref2: UserPreferences): number {
    let similarity = 0;
    let factors = 0;

    // Compare preferred working hours
    const hourOverlap = this.calculateHourOverlap(pref1.preferredWorkingHours, pref2.preferredWorkingHours);
    similarity += hourOverlap;
    factors++;

    // Compare communication styles
    if (pref1.communicationStyle === pref2.communicationStyle) {
      similarity += 1;
    }
    factors++;

    // Compare learning styles
    if (pref1.learningStyle === pref2.learningStyle) {
      similarity += 1;
    }
    factors++;

    // Compare feedback frequency
    if (pref1.feedbackFrequency === pref2.feedbackFrequency) {
      similarity += 1;
    }
    factors++;

    return factors > 0 ? similarity / factors : 0;
  }

  private calculateWorkingStyleSimilarity(style1: WorkingStyle, style2: WorkingStyle): number {
    let similarity = 0;
    let factors = 0;

    // Compare focus preferences
    if (style1.focusPreference === style2.focusPreference) {
      similarity += 1;
    }
    factors++;

    // Compare productivity peak hours
    const peakOverlap = this.calculateHourOverlap(style1.productivityPeakHours, style2.productivityPeakHours);
    similarity += peakOverlap;
    factors++;

    // Compare interruption tolerance
    const interruptionSimilarity = 1 - Math.abs(style1.interruptionTolerance - style2.interruptionTolerance);
    similarity += interruptionSimilarity;
    factors++;

    // Compare multitasking ability
    const multitaskingSimilarity = 1 - Math.abs(style1.multitaskingAbility - style2.multitaskingAbility);
    similarity += multitaskingSimilarity;
    factors++;

    return factors > 0 ? similarity / factors : 0;
  }

  private calculateHourOverlap(hours1: number[], hours2: number[]): number {
    const set1 = new Set(hours1);
    const set2 = new Set(hours2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private findCommonMetrics(profile1: UserProfile, profile2: UserProfile): string[] {
    const metrics1 = new Set(profile1.historicalMetrics.map(m => m.metricType));
    const metrics2 = new Set(profile2.historicalMetrics.map(m => m.metricType));
    
    return [...metrics1].filter(metric => metrics2.has(metric));
  }

  private findSharedCharacteristics(profile1: UserProfile, profile2: UserProfile): string[] {
    const characteristics: string[] = [];

    if (profile1.preferences.communicationStyle === profile2.preferences.communicationStyle) {
      characteristics.push(`communication_style_${profile1.preferences.communicationStyle}`);
    }

    if (profile1.workingStyle.focusPreference === profile2.workingStyle.focusPreference) {
      characteristics.push(`focus_preference_${profile1.workingStyle.focusPreference}`);
    }

    // Add more characteristic comparisons as needed

    return characteristics;
  }

  // Helper methods for generating specific types of recommendations
  private async generateProductivityRecommendations(
    userProfile: UserProfile,
    similarUsers: SimilarityScore[]
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    
    // Analyze productivity patterns
    const avgProductivity = userProfile.features['commits_per_day'] || 0;
    
    if (avgProductivity < 2) { // Low productivity threshold
      const template = this.recommendationTemplates.get(RecommendationType.PRODUCTIVITY_IMPROVEMENT);
      if (template) {
        recommendations.push(this.createRecommendationFromTemplate(
          userProfile.userId,
          template,
          'low_productivity',
          { currentProductivity: avgProductivity, similarUsers }
        ));
      }
    }

    return recommendations;
  }

  private async generateFocusRecommendations(
    userProfile: UserProfile,
    similarUsers: SimilarityScore[]
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    
    const focusTime = userProfile.features['total_focus_time_hours'] || 0;
    const interruptionRate = userProfile.features['interruption_rate_per_hour'] || 0;
    
    if (focusTime < 4 || interruptionRate > 5) { // Focus improvement needed
      const template = this.recommendationTemplates.get(RecommendationType.FOCUS_OPTIMIZATION);
      if (template) {
        recommendations.push(this.createRecommendationFromTemplate(
          userProfile.userId,
          template,
          'focus_improvement',
          { focusTime, interruptionRate, similarUsers }
        ));
      }
    }

    return recommendations;
  }

  private async generateCodeQualityRecommendations(
    userProfile: UserProfile,
    similarUsers: SimilarityScore[]
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    
    const reviewCycleTime = userProfile.features['review_cycle_time_hours'] || 0;
    const refactoringRatio = userProfile.features['refactoring_ratio'] || 0;
    
    if (reviewCycleTime > 48 || refactoringRatio < 0.1) { // Code quality issues
      const template = this.recommendationTemplates.get(RecommendationType.CODE_QUALITY_ENHANCEMENT);
      if (template) {
        recommendations.push(this.createRecommendationFromTemplate(
          userProfile.userId,
          template,
          'code_quality_improvement',
          { reviewCycleTime, refactoringRatio, similarUsers }
        ));
      }
    }

    return recommendations;
  }

  private async generateCollaborationRecommendations(
    userProfile: UserProfile,
    similarUsers: SimilarityScore[]
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    
    const collaborationScore = userProfile.skillLevel.collaboration;
    
    if (collaborationScore < 0.6) { // Low collaboration
      const template = this.recommendationTemplates.get(RecommendationType.COLLABORATION_IMPROVEMENT);
      if (template) {
        recommendations.push(this.createRecommendationFromTemplate(
          userProfile.userId,
          template,
          'collaboration_improvement',
          { collaborationScore, similarUsers }
        ));
      }
    }

    return recommendations;
  }

  private async generateSkillDevelopmentRecommendations(
    userProfile: UserProfile,
    similarUsers: SimilarityScore[]
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    
    // Find skill gaps by comparing with similar users
    const skillGaps = this.identifySkillGaps(userProfile, similarUsers);
    
    if (skillGaps.length > 0) {
      const template = this.recommendationTemplates.get(RecommendationType.SKILL_DEVELOPMENT);
      if (template) {
        recommendations.push(this.createRecommendationFromTemplate(
          userProfile.userId,
          template,
          'skill_development',
          { skillGaps, similarUsers }
        ));
      }
    }

    return recommendations;
  }

  // Helper methods for user profile analysis
  private findPeakProductivityHours(metrics: ProductivityMetric[]): number[] {
    // Analyze metrics by hour to find peak productivity times
    const hourlyProductivity: Record<number, number[]> = {};
    
    for (const metric of metrics) {
      const hour = metric.timestamp.getHours();
      if (!hourlyProductivity[hour]) {
        hourlyProductivity[hour] = [];
      }
      hourlyProductivity[hour].push(metric.value);
    }

    const hourlyAverages: Array<{ hour: number; avg: number }> = [];
    for (const [hour, values] of Object.entries(hourlyProductivity)) {
      hourlyAverages.push({
        hour: parseInt(hour),
        avg: ss.mean(values)
      });
    }

    // Return top 4 hours
    return hourlyAverages
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 4)
      .map(item => item.hour);
  }

  private inferCommunicationStyle(metrics: ProductivityMetric[]): UserPreferences['communicationStyle'] {
    // Simple heuristic based on collaboration metrics
    const collaborationMetrics = metrics.filter(m => m.metricType === MetricType.COLLABORATION_SCORE);
    
    if (collaborationMetrics.length === 0) return 'independent';
    
    const avgCollaboration = ss.mean(collaborationMetrics.map(m => m.value));
    
    if (avgCollaboration > 0.7) return 'collaborative';
    if (avgCollaboration > 0.4) return 'direct';
    return 'independent';
  }

  private inferLearningStyle(features: FeatureVector[]): UserPreferences['learningStyle'] {
    // Simple heuristic - could be enhanced with more sophisticated analysis
    return 'hands_on'; // Default
  }

  private inferFeedbackFrequency(metrics: ProductivityMetric[]): UserPreferences['feedbackFrequency'] {
    // Analyze review patterns to infer preferred feedback frequency
    const reviewMetrics = metrics.filter(m => m.metricType === MetricType.REVIEW_LAG);
    
    if (reviewMetrics.length === 0) return 'weekly';
    
    const avgReviewLag = ss.mean(reviewMetrics.map(m => m.value));
    
    if (avgReviewLag < 4) return 'immediate';
    if (avgReviewLag < 24) return 'daily';
    return 'weekly';
  }

  private calculateTechnicalSkill(
    codeQualityMetrics: ProductivityMetric[],
    features: FeatureVector[]
  ): number {
    if (codeQualityMetrics.length === 0) return 0.5; // Default
    
    const avgQuality = ss.mean(codeQualityMetrics.map(m => m.value));
    return Math.max(0, Math.min(1, avgQuality / 100)); // Normalize to 0-1
  }

  private calculateCollaborationSkill(collaborationMetrics: ProductivityMetric[]): number {
    if (collaborationMetrics.length === 0) return 0.5; // Default
    
    const avgCollaboration = ss.mean(collaborationMetrics.map(m => m.value));
    return Math.max(0, Math.min(1, avgCollaboration));
  }

  private calculateLeadershipSkill(metrics: ProductivityMetric[]): number {
    // Simple heuristic based on various metrics
    // Could be enhanced with more sophisticated analysis
    return 0.5; // Default
  }

  private calculateDomainSkills(metrics: ProductivityMetric[]): Record<string, number> {
    // Analyze metrics to determine domain-specific skills
    return {
      frontend: 0.5,
      backend: 0.5,
      devops: 0.5,
      testing: 0.5
    };
  }

  private determineFocusPreference(focusMetrics: ProductivityMetric[]): WorkingStyle['focusPreference'] {
    if (focusMetrics.length === 0) return 'mixed';
    
    const avgFocusTime = ss.mean(focusMetrics.map(m => m.value));
    
    if (avgFocusTime > 6) return 'deep_work';
    if (avgFocusTime < 2) return 'collaborative';
    return 'mixed';
  }

  private calculateInterruptionTolerance(features: FeatureVector[]): number {
    const interruptionRates = features
      .map(f => f.features['interruption_rate_per_hour'])
      .filter(rate => rate !== undefined);
    
    if (interruptionRates.length === 0) return 0.5;
    
    const avgInterruptionRate = ss.mean(interruptionRates);
    // Higher interruption rate = higher tolerance (normalized)
    return Math.max(0, Math.min(1, avgInterruptionRate / 10));
  }

  private calculateMultitaskingAbility(features: FeatureVector[]): number {
    // Simple heuristic based on context switching patterns
    return 0.5; // Default - could be enhanced
  }

  private identifySkillGaps(
    userProfile: UserProfile,
    similarUsers: SimilarityScore[]
  ): string[] {
    const gaps: string[] = [];
    
    // Compare skills with similar users
    for (const similarUser of similarUsers.slice(0, 3)) { // Top 3 similar users
      const similarProfile = this.userProfiles.get(similarUser.userId);
      if (!similarProfile) continue;
      
      // Check technical skill gap
      if (similarProfile.skillLevel.technical > userProfile.skillLevel.technical + 0.2) {
        gaps.push('technical_skills');
      }
      
      // Check collaboration skill gap
      if (similarProfile.skillLevel.collaboration > userProfile.skillLevel.collaboration + 0.2) {
        gaps.push('collaboration_skills');
      }
    }
    
    return [...new Set(gaps)]; // Remove duplicates
  }

  private createRecommendationFromTemplate(
    userId: string,
    template: RecommendationTemplate,
    context: string,
    data: any
  ): Recommendation {
    const id = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id,
      userId,
      type: template.type,
      priority: template.priority,
      title: template.title,
      description: this.personalizeDescription(template.description, data),
      actionItems: template.actionItems.map(item => ({
        ...item,
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      })),
      confidence: this.calculateRecommendationConfidence(data),
      impact: template.impact,
      category: template.category,
      metadata: {
        basedOnMetrics: data.basedOnMetrics || [],
        similarUsers: data.similarUsers?.map((u: SimilarityScore) => u.userId) || [],
        confidence: this.calculateRecommendationConfidence(data),
        generatedAt: new Date(),
        algorithm: 'collaborative_filtering',
        version: '1.0'
      },
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };
  }

  private personalizeDescription(template: string, data: any): string {
    // Simple template replacement - could be enhanced
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key]?.toString() || match;
    });
  }

  private calculateRecommendationConfidence(data: any): number {
    // Calculate confidence based on data quality and similarity scores
    const similarUsers = data.similarUsers || [];
    const avgSimilarity = similarUsers.length > 0 ? 
      ss.mean(similarUsers.map((u: SimilarityScore) => u.similarity)) : 0.5;
    
    return Math.max(0.3, Math.min(0.95, avgSimilarity));
  }

  private initializeRecommendationTemplates(): void {
    // Initialize recommendation templates
    this.recommendationTemplates.set(RecommendationType.PRODUCTIVITY_IMPROVEMENT, {
      type: RecommendationType.PRODUCTIVITY_IMPROVEMENT,
      priority: 'medium',
      title: 'Boost Your Daily Productivity',
      description: 'Based on analysis of similar developers, you could increase your daily output by focusing on time management and reducing context switching.',
      actionItems: [
        {
          description: 'Use time-blocking techniques for focused coding sessions',
          type: 'immediate',
          estimatedEffort: 0.5,
          expectedImpact: 0.7,
          resources: ['Time management guide', 'Focus timer app']
        },
        {
          description: 'Minimize interruptions during peak productivity hours',
          type: 'short_term',
          estimatedEffort: 1,
          expectedImpact: 0.8,
          resources: ['Notification management guide']
        }
      ],
      impact: 'high',
      category: RecommendationCategory.PERSONAL
    });

    this.recommendationTemplates.set(RecommendationType.FOCUS_OPTIMIZATION, {
      type: RecommendationType.FOCUS_OPTIMIZATION,
      priority: 'high',
      title: 'Optimize Your Focus Time',
      description: 'Your focus patterns suggest opportunities for deeper work sessions. Similar developers have improved their flow state by {focusTime} hours.',
      actionItems: [
        {
          description: 'Schedule 2-hour uninterrupted coding blocks',
          type: 'immediate',
          estimatedEffort: 0.25,
          expectedImpact: 0.9,
          resources: ['Deep work methodology']
        }
      ],
      impact: 'high',
      category: RecommendationCategory.PERSONAL
    });

    this.recommendationTemplates.set(RecommendationType.CODE_QUALITY_ENHANCEMENT, {
      type: RecommendationType.CODE_QUALITY_ENHANCEMENT,
      priority: 'medium',
      title: 'Enhance Code Quality Practices',
      description: 'Your code review cycle time of {reviewCycleTime} hours could be improved. Similar developers achieve faster reviews through better practices.',
      actionItems: [
        {
          description: 'Create smaller, focused pull requests',
          type: 'immediate',
          estimatedEffort: 0.5,
          expectedImpact: 0.6,
          resources: ['PR best practices guide']
        }
      ],
      impact: 'medium',
      category: RecommendationCategory.TECHNICAL
    });

    this.recommendationTemplates.set(RecommendationType.COLLABORATION_IMPROVEMENT, {
      type: RecommendationType.COLLABORATION_IMPROVEMENT,
      priority: 'medium',
      title: 'Strengthen Team Collaboration',
      description: 'Your collaboration score of {collaborationScore} suggests opportunities for better team engagement.',
      actionItems: [
        {
          description: 'Participate more actively in code reviews',
          type: 'short_term',
          estimatedEffort: 2,
          expectedImpact: 0.7,
          resources: ['Code review guidelines']
        }
      ],
      impact: 'medium',
      category: RecommendationCategory.TEAM
    });

    this.recommendationTemplates.set(RecommendationType.SKILL_DEVELOPMENT, {
      type: RecommendationType.SKILL_DEVELOPMENT,
      priority: 'low',
      title: 'Develop Key Skills',
      description: 'Based on similar developers in your role, focusing on {skillGaps} could accelerate your growth.',
      actionItems: [
        {
          description: 'Complete relevant online courses or tutorials',
          type: 'long_term',
          estimatedEffort: 20,
          expectedImpact: 0.8,
          resources: ['Learning platform recommendations']
        }
      ],
      impact: 'high',
      category: RecommendationCategory.PERSONAL
    });
  }
}

interface RecommendationTemplate {
  type: RecommendationType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  actionItems: Omit<ActionItem, 'id'>[];
  impact: 'low' | 'medium' | 'high';
  category: RecommendationCategory;
}