import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';

export interface GitEventData {
  userId: string;
  eventType: 'commit' | 'push' | 'pull_request' | 'merge' | 'branch' | 'tag';
  repository: string;
  branch: string;
  hash?: string;
  message?: string;
  author: string;
  timestamp: Date;
  files: GitFileChange[];
  stats: GitStats;
  metadata: GitMetadata;
}

export interface GitFileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
}

export interface GitStats {
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  totalChanges: number;
}

export interface GitMetadata {
  pullRequestId?: string;
  reviewers?: string[];
  labels?: string[];
  milestone?: string;
  issueReferences?: string[];
}

export class GitEventAnalyzer extends EventEmitter {
  private logger: Logger;
  private isInitialized = false;
  private eventBuffer: GitEventData[] = [];
  private repositoryStats: Map<string, any> = new Map();
  private userContributions: Map<string, any> = new Map();

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    try {
      // Initialize Git webhook handlers
      await this.initializeGitWebhooks();
      
      // Start event processing
      this.startEventProcessing();
      
      this.isInitialized = true;
      this.logger.info('GitEventAnalyzer initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize GitEventAnalyzer:', error);
      throw error;
    }
  }

  private async initializeGitWebhooks(): Promise<void> {
    // This would set up webhook handlers for GitHub, GitLab, etc.
    // For now, we'll simulate with mock data
    this.logger.info('Git webhook handlers initialized');
    
    // Start mock data generation
    this.startMockGitEvents();
  }

  private startMockGitEvents(): void {
    // Simulate Git events
    setInterval(() => {
      const mockEvent = this.generateMockGitEvent();
      this.analyzeGitEvent(mockEvent);
    }, 120000); // Every 2 minutes
  }

  private generateMockGitEvent(): GitEventData {
    const eventTypes: GitEventData['eventType'][] = ['commit', 'push', 'pull_request', 'merge', 'branch'];
    const fileExtensions = ['ts', 'js', 'py', 'java', 'cpp', 'md', 'json', 'css', 'html'];
    
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const numFiles = Math.floor(Math.random() * 5) + 1;
    
    const files: GitFileChange[] = [];
    let totalAdditions = 0;
    let totalDeletions = 0;
    
    for (let i = 0; i < numFiles; i++) {
      const additions = Math.floor(Math.random() * 100);
      const deletions = Math.floor(Math.random() * 50);
      const ext = fileExtensions[Math.floor(Math.random() * fileExtensions.length)];
      
      files.push({
        path: `src/components/Component${i}.${ext}`,
        status: Math.random() > 0.8 ? 'added' : 'modified',
        additions,
        deletions,
        changes: additions + deletions
      });
      
      totalAdditions += additions;
      totalDeletions += deletions;
    }
    
    return {
      userId: 'demo-user',
      eventType,
      repository: 'devflow/intelligence',
      branch: Math.random() > 0.8 ? 'feature/new-feature' : 'main',
      hash: this.generateCommitHash(),
      message: this.generateCommitMessage(eventType),
      author: 'demo-user',
      timestamp: new Date(),
      files,
      stats: {
        totalFiles: files.length,
        totalAdditions,
        totalDeletions,
        totalChanges: totalAdditions + totalDeletions
      },
      metadata: {
        pullRequestId: eventType === 'pull_request' ? `PR-${Math.floor(Math.random() * 1000)}` : undefined,
        reviewers: eventType === 'pull_request' ? ['reviewer1', 'reviewer2'] : undefined,
        labels: eventType === 'pull_request' ? ['enhancement', 'feature'] : undefined,
        issueReferences: Math.random() > 0.7 ? [`#${Math.floor(Math.random() * 100)}`] : undefined
      }
    };
  }

  private generateCommitHash(): string {
    return Array.from({ length: 40 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  private generateCommitMessage(eventType: GitEventData['eventType']): string {
    const messages = {
      commit: [
        'Fix bug in user authentication',
        'Add new dashboard component',
        'Update dependencies',
        'Refactor context engine',
        'Improve error handling'
      ],
      push: [
        'Push latest changes to main',
        'Deploy to staging environment',
        'Sync with remote repository'
      ],
      pull_request: [
        'Add advanced user experience features',
        'Implement context-aware notifications',
        'Enhance activity classification'
      ],
      merge: [
        'Merge feature branch into main',
        'Merge pull request #123',
        'Merge hotfix into production'
      ],
      branch: [
        'Create feature branch',
        'Create hotfix branch',
        'Create release branch'
      ]
    };
    
    const messageList = messages[eventType] || messages.commit;
    return messageList[Math.floor(Math.random() * messageList.length)];
  }

  analyzeGitEvent(eventData: GitEventData): void {
    try {
      // Enrich event data with analysis
      const enrichedEvent = this.enrichGitEvent(eventData);
      
      // Add to buffer
      this.eventBuffer.push(enrichedEvent);
      
      // Keep buffer manageable
      if (this.eventBuffer.length > 500) {
        this.eventBuffer = this.eventBuffer.slice(-500);
      }
      
      // Update repository and user statistics
      this.updateRepositoryStats(enrichedEvent);
      this.updateUserContributions(enrichedEvent);
      
      // Emit event for context engine
      this.emit('gitEvent', enrichedEvent);
      
      this.logger.debug(`Analyzed Git event: ${eventData.eventType} in ${eventData.repository}`);
    } catch (error) {
      this.logger.error('Failed to analyze Git event:', error);
    }
  }

  private enrichGitEvent(eventData: GitEventData): GitEventData {
    // Add analysis metadata
    const enrichedEvent = {
      ...eventData,
      analysis: {
        complexity: this.calculateComplexity(eventData),
        impact: this.calculateImpact(eventData),
        riskLevel: this.calculateRiskLevel(eventData),
        codeQuality: this.analyzeCodeQuality(eventData),
        collaborationIndicators: this.analyzeCollaboration(eventData),
        workPattern: this.analyzeWorkPattern(eventData)
      }
    };
    
    return enrichedEvent;
  }

  private calculateComplexity(event: GitEventData): number {
    // Calculate complexity based on files changed, lines modified, etc.
    const fileComplexity = event.stats.totalFiles * 0.2;
    const changeComplexity = (event.stats.totalAdditions + event.stats.totalDeletions) * 0.001;
    const typeComplexity = this.getEventTypeComplexity(event.eventType);
    
    return Math.min(10, fileComplexity + changeComplexity + typeComplexity);
  }

  private getEventTypeComplexity(eventType: GitEventData['eventType']): number {
    const complexityMap = {
      commit: 1,
      push: 1.5,
      pull_request: 3,
      merge: 2.5,
      branch: 0.5,
      tag: 0.3
    };
    return complexityMap[eventType] || 1;
  }

  private calculateImpact(event: GitEventData): 'low' | 'medium' | 'high' {
    const totalChanges = event.stats.totalChanges;
    const fileCount = event.stats.totalFiles;
    
    if (totalChanges > 500 || fileCount > 10) return 'high';
    if (totalChanges > 100 || fileCount > 3) return 'medium';
    return 'low';
  }

  private calculateRiskLevel(event: GitEventData): 'low' | 'medium' | 'high' {
    // Analyze risk based on various factors
    let riskScore = 0;
    
    // Large changes are riskier
    if (event.stats.totalChanges > 1000) riskScore += 3;
    else if (event.stats.totalChanges > 300) riskScore += 2;
    else if (event.stats.totalChanges > 100) riskScore += 1;
    
    // Many files changed is riskier
    if (event.stats.totalFiles > 20) riskScore += 2;
    else if (event.stats.totalFiles > 10) riskScore += 1;
    
    // Direct commits to main branch are riskier
    if (event.branch === 'main' && event.eventType === 'commit') riskScore += 2;
    
    // No reviewers on PR is riskier
    if (event.eventType === 'pull_request' && !event.metadata.reviewers?.length) riskScore += 1;
    
    if (riskScore >= 5) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
  }

  private analyzeCodeQuality(event: GitEventData): any {
    const testFiles = event.files.filter(f => 
      f.path.includes('test') || f.path.includes('spec') || f.path.endsWith('.test.ts')
    );
    
    const documentationFiles = event.files.filter(f => 
      f.path.endsWith('.md') || f.path.includes('docs')
    );
    
    return {
      hasTests: testFiles.length > 0,
      testCoverage: testFiles.length / event.files.length,
      hasDocumentation: documentationFiles.length > 0,
      documentationRatio: documentationFiles.length / event.files.length,
      averageChangeSize: event.stats.totalChanges / event.stats.totalFiles
    };
  }

  private analyzeCollaboration(event: GitEventData): any {
    return {
      hasReviewers: event.metadata.reviewers && event.metadata.reviewers.length > 0,
      reviewerCount: event.metadata.reviewers?.length || 0,
      hasIssueReferences: event.metadata.issueReferences && event.metadata.issueReferences.length > 0,
      isPullRequest: event.eventType === 'pull_request',
      branchType: this.analyzeBranchType(event.branch)
    };
  }

  private analyzeBranchType(branch: string): 'main' | 'feature' | 'hotfix' | 'release' | 'other' {
    if (branch === 'main' || branch === 'master') return 'main';
    if (branch.startsWith('feature/')) return 'feature';
    if (branch.startsWith('hotfix/')) return 'hotfix';
    if (branch.startsWith('release/')) return 'release';
    return 'other';
  }

  private analyzeWorkPattern(event: GitEventData): any {
    const hour = event.timestamp.getHours();
    const dayOfWeek = event.timestamp.getDay();
    
    return {
      timeOfDay: this.categorizeTimeOfDay(hour),
      dayOfWeek: this.categorizeDayOfWeek(dayOfWeek),
      isWorkingHours: hour >= 9 && hour <= 17 && dayOfWeek >= 1 && dayOfWeek <= 5,
      commitFrequency: this.calculateCommitFrequency(event.userId)
    };
  }

  private categorizeTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  private categorizeDayOfWeek(day: number): 'weekday' | 'weekend' {
    return day >= 1 && day <= 5 ? 'weekday' : 'weekend';
  }

  private calculateCommitFrequency(userId: string): number {
    const userEvents = this.eventBuffer.filter(e => 
      e.userId === userId && e.eventType === 'commit'
    );
    
    if (userEvents.length < 2) return 0;
    
    const timeSpan = Date.now() - userEvents[0].timestamp.getTime();
    const days = timeSpan / (1000 * 60 * 60 * 24);
    
    return userEvents.length / Math.max(1, days);
  }

  private updateRepositoryStats(event: GitEventData): void {
    const repoKey = event.repository;
    let stats = this.repositoryStats.get(repoKey);
    
    if (!stats) {
      stats = {
        totalCommits: 0,
        totalAdditions: 0,
        totalDeletions: 0,
        contributors: new Set(),
        branches: new Set(),
        lastActivity: null,
        riskEvents: 0
      };
      this.repositoryStats.set(repoKey, stats);
    }
    
    // Update stats
    if (event.eventType === 'commit') stats.totalCommits++;
    stats.totalAdditions += event.stats.totalAdditions;
    stats.totalDeletions += event.stats.totalDeletions;
    stats.contributors.add(event.author);
    stats.branches.add(event.branch);
    stats.lastActivity = event.timestamp;
    
    if (event.analysis?.riskLevel === 'high') {
      stats.riskEvents++;
    }
  }

  private updateUserContributions(event: GitEventData): void {
    const userId = event.userId;
    let contributions = this.userContributions.get(userId);
    
    if (!contributions) {
      contributions = {
        totalCommits: 0,
        totalAdditions: 0,
        totalDeletions: 0,
        repositories: new Set(),
        lastActivity: null,
        workPatterns: {
          morningCommits: 0,
          afternoonCommits: 0,
          eveningCommits: 0,
          nightCommits: 0,
          weekdayCommits: 0,
          weekendCommits: 0
        }
      };
      this.userContributions.set(userId, contributions);
    }
    
    // Update contributions
    if (event.eventType === 'commit') {
      contributions.totalCommits++;
      
      // Update work patterns
      const pattern = event.analysis?.workPattern;
      if (pattern) {
        contributions.workPatterns[`${pattern.timeOfDay}Commits`]++;
        contributions.workPatterns[`${pattern.dayOfWeek}Commits`]++;
      }
    }
    
    contributions.totalAdditions += event.stats.totalAdditions;
    contributions.totalDeletions += event.stats.totalDeletions;
    contributions.repositories.add(event.repository);
    contributions.lastActivity = event.timestamp;
  }

  private startEventProcessing(): void {
    // Process events periodically for insights
    setInterval(() => {
      this.generateInsights();
    }, 300000); // Every 5 minutes
  }

  private generateInsights(): void {
    if (this.eventBuffer.length === 0) return;
    
    try {
      const insights = {
        recentActivity: this.analyzeRecentActivity(),
        riskAnalysis: this.analyzeRiskTrends(),
        collaborationPatterns: this.analyzeCollaborationPatterns(),
        productivityMetrics: this.calculateProductivityMetrics()
      };
      
      this.emit('gitInsights', insights);
      this.logger.debug('Generated Git insights');
    } catch (error) {
      this.logger.error('Failed to generate Git insights:', error);
    }
  }

  private analyzeRecentActivity(): any {
    const recentEvents = this.eventBuffer.slice(-20);
    
    return {
      eventCount: recentEvents.length,
      dominantEventType: this.getDominantEventType(recentEvents),
      averageComplexity: this.getAverageComplexity(recentEvents),
      activeRepositories: [...new Set(recentEvents.map(e => e.repository))],
      activeBranches: [...new Set(recentEvents.map(e => e.branch))]
    };
  }

  private getDominantEventType(events: GitEventData[]): string {
    const typeCounts = events.reduce((counts, event) => {
      counts[event.eventType] = (counts[event.eventType] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    return Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';
  }

  private getAverageComplexity(events: GitEventData[]): number {
    const complexities = events
      .map(e => e.analysis?.complexity || 0)
      .filter(c => c > 0);
    
    return complexities.length > 0 ? 
      complexities.reduce((sum, c) => sum + c, 0) / complexities.length : 0;
  }

  private analyzeRiskTrends(): any {
    const recentEvents = this.eventBuffer.slice(-50);
    const highRiskEvents = recentEvents.filter(e => e.analysis?.riskLevel === 'high');
    
    return {
      riskEventCount: highRiskEvents.length,
      riskPercentage: (highRiskEvents.length / recentEvents.length) * 100,
      riskTrend: this.calculateRiskTrend(),
      riskFactors: this.identifyRiskFactors(highRiskEvents)
    };
  }

  private calculateRiskTrend(): 'increasing' | 'decreasing' | 'stable' {
    const recent = this.eventBuffer.slice(-25);
    const older = this.eventBuffer.slice(-50, -25);
    
    const recentRisk = recent.filter(e => e.analysis?.riskLevel === 'high').length / recent.length;
    const olderRisk = older.filter(e => e.analysis?.riskLevel === 'high').length / older.length;
    
    if (recentRisk > olderRisk * 1.2) return 'increasing';
    if (recentRisk < olderRisk * 0.8) return 'decreasing';
    return 'stable';
  }

  private identifyRiskFactors(riskEvents: GitEventData[]): string[] {
    const factors = [];
    
    if (riskEvents.some(e => e.stats.totalChanges > 1000)) {
      factors.push('Large change sets');
    }
    
    if (riskEvents.some(e => e.branch === 'main' && e.eventType === 'commit')) {
      factors.push('Direct commits to main branch');
    }
    
    if (riskEvents.some(e => !e.metadata.reviewers?.length && e.eventType === 'pull_request')) {
      factors.push('Pull requests without reviewers');
    }
    
    return factors;
  }

  private analyzeCollaborationPatterns(): any {
    const recentEvents = this.eventBuffer.slice(-100);
    const prEvents = recentEvents.filter(e => e.eventType === 'pull_request');
    
    return {
      pullRequestRate: (prEvents.length / recentEvents.length) * 100,
      averageReviewers: this.getAverageReviewers(prEvents),
      collaborationScore: this.calculateCollaborationScore(recentEvents),
      codeReviewCoverage: this.calculateCodeReviewCoverage(recentEvents)
    };
  }

  private getAverageReviewers(prEvents: GitEventData[]): number {
    const reviewerCounts = prEvents
      .map(e => e.metadata.reviewers?.length || 0)
      .filter(count => count > 0);
    
    return reviewerCounts.length > 0 ? 
      reviewerCounts.reduce((sum, count) => sum + count, 0) / reviewerCounts.length : 0;
  }

  private calculateCollaborationScore(events: GitEventData[]): number {
    let score = 0;
    
    events.forEach(event => {
      if (event.eventType === 'pull_request') score += 3;
      if (event.metadata.reviewers?.length) score += event.metadata.reviewers.length;
      if (event.metadata.issueReferences?.length) score += 1;
    });
    
    return events.length > 0 ? score / events.length : 0;
  }

  private calculateCodeReviewCoverage(events: GitEventData[]): number {
    const commits = events.filter(e => e.eventType === 'commit');
    const reviewedCommits = commits.filter(e => 
      events.some(pr => pr.eventType === 'pull_request' && pr.hash === e.hash)
    );
    
    return commits.length > 0 ? (reviewedCommits.length / commits.length) * 100 : 0;
  }

  private calculateProductivityMetrics(): any {
    const recentEvents = this.eventBuffer.slice(-100);
    
    return {
      commitFrequency: this.getCommitFrequency(recentEvents),
      averageChangeSize: this.getAverageChangeSize(recentEvents),
      codeQualityScore: this.getCodeQualityScore(recentEvents),
      workingHoursRatio: this.getWorkingHoursRatio(recentEvents)
    };
  }

  private getCommitFrequency(events: GitEventData[]): number {
    const commits = events.filter(e => e.eventType === 'commit');
    if (commits.length < 2) return 0;
    
    const timeSpan = commits[commits.length - 1].timestamp.getTime() - commits[0].timestamp.getTime();
    const days = timeSpan / (1000 * 60 * 60 * 24);
    
    return commits.length / Math.max(1, days);
  }

  private getAverageChangeSize(events: GitEventData[]): number {
    const changeSizes = events.map(e => e.stats.totalChanges).filter(size => size > 0);
    return changeSizes.length > 0 ? 
      changeSizes.reduce((sum, size) => sum + size, 0) / changeSizes.length : 0;
  }

  private getCodeQualityScore(events: GitEventData[]): number {
    let score = 0;
    let count = 0;
    
    events.forEach(event => {
      if (event.analysis?.codeQuality) {
        const quality = event.analysis.codeQuality;
        let eventScore = 0;
        
        if (quality.hasTests) eventScore += 30;
        if (quality.hasDocumentation) eventScore += 20;
        if (quality.testCoverage > 0.5) eventScore += 25;
        if (quality.averageChangeSize < 100) eventScore += 25; // Smaller changes are better
        
        score += eventScore;
        count++;
      }
    });
    
    return count > 0 ? score / count : 0;
  }

  private getWorkingHoursRatio(events: GitEventData[]): number {
    const workingHoursEvents = events.filter(e => 
      e.analysis?.workPattern?.isWorkingHours
    );
    
    return events.length > 0 ? (workingHoursEvents.length / events.length) * 100 : 0;
  }

  // Public methods
  onGitEvent(callback: (event: GitEventData) => void): void {
    this.on('gitEvent', callback);
  }

  onGitInsights(callback: (insights: any) => void): void {
    this.on('gitInsights', callback);
  }

  getRepositoryStats(repository: string): any {
    const stats = this.repositoryStats.get(repository);
    if (!stats) return null;
    
    return {
      ...stats,
      contributors: Array.from(stats.contributors),
      branches: Array.from(stats.branches)
    };
  }

  getUserContributions(userId: string): any {
    const contributions = this.userContributions.get(userId);
    if (!contributions) return null;
    
    return {
      ...contributions,
      repositories: Array.from(contributions.repositories)
    };
  }

  getRecentEvents(repository?: string, limit: number = 50): GitEventData[] {
    let events = this.eventBuffer.slice(-limit);
    
    if (repository) {
      events = events.filter(e => e.repository === repository);
    }
    
    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}