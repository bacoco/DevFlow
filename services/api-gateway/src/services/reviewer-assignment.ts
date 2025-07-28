import { 
  Developer, 
  PullRequest, 
  ReviewAssignment, 
  ReviewerSuggestion,
  AssignmentAlgorithmConfig,
  AssignmentReason,
  GitAnalysis,
  ExpertiseArea
} from '../types/code-review';
import { ExpertiseAnalyzer } from './expertise-analyzer';
import { WorkloadBalancer } from './workload-balancer';

export class ReviewerAssignmentService {
  private expertiseAnalyzer: ExpertiseAnalyzer;
  private workloadBalancer: WorkloadBalancer;
  private config: AssignmentAlgorithmConfig;

  constructor(config?: Partial<AssignmentAlgorithmConfig>) {
    this.config = {
      weights: {
        expertise: 0.4,
        workload: 0.3,
        availability: 0.15,
        collaboration: 0.1,
        diversity: 0.05,
      },
      constraints: {
        maxReviewersPerPR: 3,
        minExpertiseLevel: 'intermediate',
        maxWorkloadThreshold: 0.8,
        requireTeamDiversity: true,
        avoidSameAuthor: true,
      },
      preferences: {
        favorRecentCollaborators: true,
        balanceWorkload: true,
        prioritizeExperts: true,
        considerTimezone: true,
      },
      ...config,
    };

    this.expertiseAnalyzer = new ExpertiseAnalyzer();
    this.workloadBalancer = new WorkloadBalancer(this.config);
  }

  /**
   * Suggests reviewers for a pull request with confidence scores
   */
  async suggestReviewers(
    pullRequest: PullRequest,
    developers: Developer[],
    gitAnalysis?: GitAnalysis[]
  ): Promise<ReviewerSuggestion[]> {
    // Update expertise if git analysis is provided
    if (gitAnalysis) {
      await this.updateDeveloperExpertise(developers, gitAnalysis);
    }

    // Get suggestions from different algorithms
    const expertiseSuggestions = await this.getExpertiseBasedSuggestions(pullRequest, developers);
    const workloadSuggestions = await this.workloadBalancer.balanceAssignments(pullRequest, developers, []);
    const collaborationSuggestions = await this.getCollaborationBasedSuggestions(pullRequest, developers);

    // Combine and rank suggestions
    const combinedSuggestions = this.combineAndRankSuggestions(
      expertiseSuggestions,
      workloadSuggestions,
      collaborationSuggestions
    );

    // Apply constraints and filters
    const filteredSuggestions = this.applyConstraints(combinedSuggestions, pullRequest);

    // Ensure team diversity if required
    const finalSuggestions = this.config.constraints.requireTeamDiversity
      ? this.ensureTeamDiversity(filteredSuggestions)
      : filteredSuggestions;

    return finalSuggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.config.constraints.maxReviewersPerPR);
  }

  /**
   * Assigns reviewers automatically based on suggestions
   */
  async assignReviewers(
    pullRequest: PullRequest,
    developers: Developer[],
    maxAssignments: number = 2
  ): Promise<ReviewAssignment[]> {
    const suggestions = await this.suggestReviewers(pullRequest, developers);
    const assignments: ReviewAssignment[] = [];

    for (let i = 0; i < Math.min(suggestions.length, maxAssignments); i++) {
      const suggestion = suggestions[i];
      
      const assignment: ReviewAssignment = {
        pullRequestId: pullRequest.id,
        reviewerId: suggestion.reviewer.id,
        assignedAt: new Date(),
        confidence: suggestion.confidence,
        reasoning: suggestion.reasons,
        priority: pullRequest.priority,
        estimatedReviewTime: suggestion.estimatedTime,
        deadline: this.calculateDeadline(pullRequest, suggestion.estimatedTime),
      };

      assignments.push(assignment);
    }

    return assignments;
  }

  /**
   * Updates configuration for the assignment algorithm
   */
  updateConfig(newConfig: Partial<AssignmentAlgorithmConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.workloadBalancer = new WorkloadBalancer(this.config);
  }

  /**
   * Analyzes assignment effectiveness and suggests improvements
   */
  async analyzeAssignmentEffectiveness(
    assignments: ReviewAssignment[],
    completedReviews: any[] // Would be actual review data
  ): Promise<{
    accuracy: number;
    averageReviewTime: number;
    workloadBalance: number;
    suggestions: string[];
  }> {
    // This would analyze historical data to improve the algorithm
    // For now, return mock analysis
    return {
      accuracy: 0.85,
      averageReviewTime: 4.2,
      workloadBalance: 0.78,
      suggestions: [
        'Consider increasing expertise weight for complex PRs',
        'Workload distribution is slightly uneven',
        'Timezone consideration could be improved',
      ],
    };
  }

  private async getExpertiseBasedSuggestions(
    pullRequest: PullRequest,
    developers: Developer[]
  ): Promise<ReviewerSuggestion[]> {
    const suggestions: ReviewerSuggestion[] = [];

    // Analyze PR requirements
    const requiredExpertise = this.analyzeRequiredExpertise(pullRequest);

    for (const developer of developers) {
      const expertiseMatch = this.calculateExpertiseMatch(developer.expertise, requiredExpertise);
      
      if (expertiseMatch.score > 0.3) { // Minimum expertise threshold
        const reasons: AssignmentReason[] = [
          {
            type: 'expertise_match',
            description: `Strong expertise in ${expertiseMatch.matchedAreas.join(', ')}`,
            weight: expertiseMatch.score,
            evidence: {
              matchedAreas: expertiseMatch.matchedAreas,
              expertiseLevel: expertiseMatch.level,
              confidence: expertiseMatch.confidence,
            },
          },
        ];

        // Add file ownership reason if applicable
        const ownedFiles = this.getOwnedFiles(developer, pullRequest.files.map(f => f.filename));
        if (ownedFiles.length > 0) {
          reasons.push({
            type: 'file_ownership',
            description: `Has worked on ${ownedFiles.length} of the modified files`,
            weight: Math.min(ownedFiles.length / pullRequest.files.length, 1.0) * 0.3,
            evidence: { ownedFiles },
          });
        }

        suggestions.push({
          reviewer: developer,
          confidence: expertiseMatch.score * this.config.weights.expertise,
          reasons,
          estimatedTime: this.estimateReviewTimeForExpertise(pullRequest, expertiseMatch.level),
          workloadImpact: 0, // Will be calculated by workload balancer
          availabilityScore: 0, // Will be calculated by workload balancer
        });
      }
    }

    return suggestions;
  }

  private async getCollaborationBasedSuggestions(
    pullRequest: PullRequest,
    developers: Developer[]
  ): Promise<ReviewerSuggestion[]> {
    const suggestions: ReviewerSuggestion[] = [];
    const author = developers.find(d => d.id === pullRequest.author);

    if (!author) return suggestions;

    for (const developer of developers) {
      if (developer.id === pullRequest.author) continue;

      const collaborationScore = this.calculateCollaborationScore(author, developer);
      
      if (collaborationScore > 0.2) {
        const reasons: AssignmentReason[] = [
          {
            type: 'collaboration_history',
            description: 'Has collaborated frequently with the PR author',
            weight: collaborationScore,
            evidence: {
              collaborationScore,
              sharedProjects: [], // Would be calculated from actual data
            },
          },
        ];

        suggestions.push({
          reviewer: developer,
          confidence: collaborationScore * this.config.weights.collaboration,
          reasons,
          estimatedTime: 0, // Will be calculated elsewhere
          workloadImpact: 0,
          availabilityScore: 0,
        });
      }
    }

    return suggestions;
  }

  private combineAndRankSuggestions(
    expertiseSuggestions: ReviewerSuggestion[],
    workloadSuggestions: ReviewerSuggestion[],
    collaborationSuggestions: ReviewerSuggestion[]
  ): ReviewerSuggestion[] {
    const suggestionMap = new Map<string, ReviewerSuggestion>();

    // Combine suggestions by reviewer ID
    const allSuggestions = [...expertiseSuggestions, ...workloadSuggestions, ...collaborationSuggestions];
    
    for (const suggestion of allSuggestions) {
      const existing = suggestionMap.get(suggestion.reviewer.id);
      
      if (existing) {
        // Combine confidence scores and reasons
        existing.confidence = Math.min(existing.confidence + suggestion.confidence, 1.0);
        existing.reasons.push(...suggestion.reasons);
        existing.estimatedTime = Math.max(existing.estimatedTime, suggestion.estimatedTime);
        existing.workloadImpact = Math.max(existing.workloadImpact, suggestion.workloadImpact);
        existing.availabilityScore = Math.max(existing.availabilityScore, suggestion.availabilityScore);
      } else {
        suggestionMap.set(suggestion.reviewer.id, { ...suggestion });
      }
    }

    return Array.from(suggestionMap.values());
  }

  private applyConstraints(
    suggestions: ReviewerSuggestion[],
    pullRequest: PullRequest
  ): ReviewerSuggestion[] {
    return suggestions.filter(suggestion => {
      // Check minimum expertise level
      const hasMinExpertise = suggestion.reasons.some(reason => 
        reason.type === 'expertise_match' && 
        reason.evidence?.expertiseLevel &&
        this.isExpertiseLevelSufficient(reason.evidence.expertiseLevel, this.config.constraints.minExpertiseLevel)
      );

      // Check workload threshold
      const withinWorkloadThreshold = suggestion.workloadImpact <= this.config.constraints.maxWorkloadThreshold;

      // Check if not the same author (if constraint is enabled)
      const notSameAuthor = !this.config.constraints.avoidSameAuthor || 
                           suggestion.reviewer.id !== pullRequest.author;

      // Check excluded reviewers
      const notExcluded = !pullRequest.excludedReviewers?.includes(suggestion.reviewer.id);

      return (hasMinExpertise || suggestion.confidence > 0.7) && 
             withinWorkloadThreshold && 
             notSameAuthor && 
             notExcluded;
    });
  }

  private ensureTeamDiversity(suggestions: ReviewerSuggestion[]): ReviewerSuggestion[] {
    const teamMap = new Map<string, ReviewerSuggestion[]>();
    
    // Group by team
    for (const suggestion of suggestions) {
      const teamId = suggestion.reviewer.teamId;
      if (!teamMap.has(teamId)) {
        teamMap.set(teamId, []);
      }
      teamMap.get(teamId)!.push(suggestion);
    }

    // Select best from each team
    const diverseSuggestions: ReviewerSuggestion[] = [];
    for (const teamSuggestions of teamMap.values()) {
      teamSuggestions.sort((a, b) => b.confidence - a.confidence);
      diverseSuggestions.push(teamSuggestions[0]);
    }

    return diverseSuggestions.sort((a, b) => b.confidence - a.confidence);
  }

  private analyzeRequiredExpertise(pullRequest: PullRequest): string[] {
    const expertise = new Set<string>();

    // Analyze file extensions and patterns
    for (const file of pullRequest.files) {
      const extension = file.filename.split('.').pop()?.toLowerCase();
      
      if (extension) {
        const languageMap: Record<string, string> = {
          'ts': 'TypeScript',
          'js': 'JavaScript',
          'py': 'Python',
          'java': 'Java',
          'go': 'Go',
          'rs': 'Rust',
          'cpp': 'C++',
          'cs': 'C#',
          'php': 'PHP',
          'rb': 'Ruby',
          'swift': 'Swift',
          'kt': 'Kotlin',
        };

        const language = languageMap[extension];
        if (language) {
          expertise.add(language);
        }
      }

      // Detect frameworks from file paths
      if (file.filename.includes('docker')) expertise.add('Docker');
      if (file.filename.includes('.k8s.') || file.filename.includes('kubernetes')) expertise.add('Kubernetes');
      if (file.filename.includes('terraform') || file.filename.endsWith('.tf')) expertise.add('Terraform');
      if (file.filename.includes('package.json')) expertise.add('Node.js');
      if (file.filename.includes('requirements.txt')) expertise.add('Python');
    }

    return Array.from(expertise);
  }

  private calculateExpertiseMatch(
    developerExpertise: ExpertiseArea[],
    requiredExpertise: string[]
  ): {
    score: number;
    matchedAreas: string[];
    level: string;
    confidence: number;
  } {
    const matches: { area: string; level: string; confidence: number }[] = [];

    for (const required of requiredExpertise) {
      const match = developerExpertise.find(exp => 
        exp.technology.toLowerCase() === required.toLowerCase()
      );

      if (match) {
        matches.push({
          area: match.technology,
          level: match.level,
          confidence: match.confidence,
        });
      }
    }

    if (matches.length === 0) {
      return { score: 0, matchedAreas: [], level: 'novice', confidence: 0 };
    }

    const avgConfidence = matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length;
    const matchRatio = matches.length / requiredExpertise.length;
    const score = avgConfidence * matchRatio;

    const bestMatch = matches.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );

    return {
      score,
      matchedAreas: matches.map(m => m.area),
      level: bestMatch.level,
      confidence: avgConfidence,
    };
  }

  private calculateCollaborationScore(author: Developer, reviewer: Developer): number {
    // This would analyze actual collaboration history
    // For now, return a mock score based on team membership
    if (author.teamId === reviewer.teamId) {
      return 0.6; // Same team
    }
    
    // Check for shared skills/expertise
    const sharedSkills = author.skills.filter(skill => reviewer.skills.includes(skill));
    return Math.min(sharedSkills.length * 0.1, 0.4);
  }

  private getOwnedFiles(developer: Developer, filenames: string[]): string[] {
    // This would check actual file ownership/authorship
    // For now, return empty array
    return [];
  }

  private estimateReviewTimeForExpertise(pullRequest: PullRequest, expertiseLevel: string): number {
    const baseTime = 30; // minutes
    const expertiseMultipliers = {
      'expert': 0.7,
      'advanced': 0.8,
      'intermediate': 1.0,
      'novice': 1.5,
    };

    const multiplier = expertiseMultipliers[expertiseLevel as keyof typeof expertiseMultipliers] || 1.0;
    return Math.ceil(baseTime * multiplier);
  }

  private isExpertiseLevelSufficient(level: string, minLevel: string): boolean {
    const levels = ['novice', 'intermediate', 'advanced', 'expert'];
    const levelIndex = levels.indexOf(level);
    const minLevelIndex = levels.indexOf(minLevel);
    return levelIndex >= minLevelIndex;
  }

  private calculateDeadline(pullRequest: PullRequest, estimatedTime: number): Date {
    const deadline = new Date();
    
    // Add estimated time plus buffer based on priority
    const priorityBuffers = {
      critical: 2, // 2 hours
      high: 8,     // 8 hours
      medium: 24,  // 1 day
      low: 72,     // 3 days
    };

    const bufferHours = priorityBuffers[pullRequest.priority] || 24;
    deadline.setHours(deadline.getHours() + bufferHours);
    
    return deadline;
  }

  private async updateDeveloperExpertise(developers: Developer[], gitAnalysis: GitAnalysis[]): Promise<void> {
    for (const developer of developers) {
      const developerAnalysis = gitAnalysis.filter(analysis => analysis.developerId === developer.id);
      if (developerAnalysis.length > 0) {
        developer.expertise = await this.expertiseAnalyzer.updateExpertise(developer, developerAnalysis[0]);
      }
    }
  }
}