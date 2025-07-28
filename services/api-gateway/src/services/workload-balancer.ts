import { 
  Developer, 
  PullRequest, 
  ReviewAssignment, 
  ReviewerSuggestion,
  AssignmentAlgorithmConfig,
  WorkloadMetrics,
  AssignmentReason,
  ReasonType
} from '../types/code-review';

export class WorkloadBalancer {
  private config: AssignmentAlgorithmConfig;

  constructor(config: AssignmentAlgorithmConfig) {
    this.config = config;
  }

  /**
   * Calculates workload scores for developers
   */
  calculateWorkloadScores(developers: Developer[]): Map<string, number> {
    const scores = new Map<string, number>();
    
    // Calculate relative workload scores
    const workloads = developers.map(dev => this.calculateCurrentWorkload(dev.workload));
    const maxWorkload = Math.max(...workloads);
    const minWorkload = Math.min(...workloads);
    const workloadRange = maxWorkload - minWorkload || 1;

    developers.forEach((developer, index) => {
      const currentWorkload = workloads[index];
      
      // Normalize workload to 0-1 scale (lower is better)
      const normalizedWorkload = workloadRange > 0 
        ? (currentWorkload - minWorkload) / workloadRange 
        : 0;
      
      // Invert so higher score means lower workload (better for assignment)
      const workloadScore = 1 - normalizedWorkload;
      
      // Apply capacity factor
      const capacityFactor = this.calculateCapacityFactor(developer.workload);
      
      scores.set(developer.id, workloadScore * capacityFactor);
    });

    return scores;
  }

  /**
   * Balances assignments across team members
   */
  async balanceAssignments(
    pullRequest: PullRequest,
    developers: Developer[],
    existingAssignments: ReviewAssignment[]
  ): Promise<ReviewerSuggestion[]> {
    // Filter available developers
    const availableDevelopers = developers.filter(dev => 
      this.isAvailableForReview(dev, pullRequest)
    );

    if (availableDevelopers.length === 0) {
      return [];
    }

    // Calculate workload scores
    const workloadScores = this.calculateWorkloadScores(availableDevelopers);
    
    // Calculate suggestions for each developer
    const suggestions: ReviewerSuggestion[] = [];
    
    for (const developer of availableDevelopers) {
      const workloadScore = workloadScores.get(developer.id) || 0;
      const workloadImpact = this.calculateWorkloadImpact(developer, pullRequest);
      
      if (workloadScore > 0.1 && workloadImpact < this.config.constraints.maxWorkloadThreshold) {
        const suggestion = await this.createWorkloadSuggestion(
          developer,
          pullRequest,
          workloadScore,
          workloadImpact
        );
        suggestions.push(suggestion);
      }
    }

    // Sort by workload score (higher is better)
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Predicts future workload based on current assignments
   */
  predictFutureWorkload(
    developer: Developer,
    timeHorizonDays: number = 7
  ): WorkloadMetrics {
    const current = developer.workload;
    
    // Simple prediction based on current trends
    const dailyReviewRate = current.currentReviews / 7; // Assume reviews are spread over a week
    const predictedReviews = Math.ceil(dailyReviewRate * timeHorizonDays);
    
    // Factor in average review time
    const predictedHours = predictedReviews * current.averageReviewTime;
    const workingHoursPerDay = 8;
    const totalWorkingHours = timeHorizonDays * workingHoursPerDay;
    
    const utilizationRate = Math.min(predictedHours / totalWorkingHours, 1.0);
    
    return {
      currentReviews: predictedReviews,
      averageReviewTime: current.averageReviewTime,
      reviewCapacity: Math.max(current.reviewCapacity - predictedReviews, 0),
      weeklyCommitCount: current.weeklyCommitCount,
      lastActivityDate: current.lastActivityDate,
    };
  }

  /**
   * Optimizes assignments to minimize workload imbalance
   */
  optimizeAssignments(
    pullRequests: PullRequest[],
    developers: Developer[],
    maxIterations: number = 100
  ): Map<string, string[]> {
    // Initialize assignments
    const assignments = new Map<string, string[]>();
    pullRequests.forEach(pr => assignments.set(pr.id, []));

    // Greedy assignment with local optimization
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let improved = false;

      for (const pr of pullRequests) {
        const currentAssignees = assignments.get(pr.id) || [];
        
        if (currentAssignees.length < this.config.constraints.maxReviewersPerPR) {
          const bestReviewer = this.findBestReviewer(pr, developers, assignments);
          
          if (bestReviewer && !currentAssignees.includes(bestReviewer.id)) {
            currentAssignees.push(bestReviewer.id);
            assignments.set(pr.id, currentAssignees);
            improved = true;
          }
        }
      }

      if (!improved) break;
    }

    return assignments;
  }

  /**
   * Calculates the impact of assigning a PR to a developer
   */
  private calculateWorkloadImpact(developer: Developer, pullRequest: PullRequest): number {
    const estimatedTime = this.estimateReviewTime(pullRequest);
    const currentCapacity = developer.workload.reviewCapacity;
    
    if (currentCapacity <= 0) return 1.0; // Maximum impact
    
    const impact = estimatedTime / (currentCapacity * developer.workload.averageReviewTime);
    return Math.min(impact, 1.0);
  }

  private calculateCurrentWorkload(workload: WorkloadMetrics): number {
    const reviewLoad = workload.currentReviews / Math.max(workload.reviewCapacity, 1);
    const timeLoad = workload.averageReviewTime / 4; // Normalize against 4-hour average
    const activityFactor = this.getActivityFactor(workload.lastActivityDate);
    
    return (reviewLoad * 0.6 + timeLoad * 0.3) * activityFactor;
  }

  private calculateCapacityFactor(workload: WorkloadMetrics): number {
    const capacityRatio = workload.reviewCapacity / Math.max(workload.currentReviews, 1);
    return Math.min(capacityRatio / 2, 1.0); // Normalize to 0-1 range
  }

  private isAvailableForReview(developer: Developer, pullRequest: PullRequest): boolean {
    // Check basic availability
    if (!developer.availability.isAvailable) return false;
    
    // Check if author is excluded
    if (this.config.constraints.avoidSameAuthor && developer.id === pullRequest.author) {
      return false;
    }
    
    // Check excluded reviewers
    if (pullRequest.excludedReviewers?.includes(developer.id)) {
      return false;
    }
    
    // Check workload threshold
    const workloadImpact = this.calculateWorkloadImpact(developer, pullRequest);
    if (workloadImpact > this.config.constraints.maxWorkloadThreshold) {
      return false;
    }
    
    // Check out of office
    if (developer.availability.outOfOffice) {
      const now = new Date();
      const { start, end } = developer.availability.outOfOffice;
      if (now >= start && now <= end) return false;
    }
    
    return true;
  }

  private async createWorkloadSuggestion(
    developer: Developer,
    pullRequest: PullRequest,
    workloadScore: number,
    workloadImpact: number
  ): Promise<ReviewerSuggestion> {
    const estimatedTime = this.estimateReviewTime(pullRequest);
    const availabilityScore = this.calculateAvailabilityScore(developer);
    
    const reasons: AssignmentReason[] = [
      {
        type: 'workload_balance',
        description: `Low current workload (${developer.workload.currentReviews}/${developer.workload.reviewCapacity} reviews)`,
        weight: workloadScore,
        evidence: {
          currentReviews: developer.workload.currentReviews,
          capacity: developer.workload.reviewCapacity,
          averageTime: developer.workload.averageReviewTime,
        },
      },
    ];

    if (availabilityScore > 0.8) {
      reasons.push({
        type: 'availability',
        description: 'High availability based on timezone and working hours',
        weight: availabilityScore * 0.3,
        evidence: {
          timezone: developer.availability.timezone,
          workingHours: developer.availability.workingHours,
        },
      });
    }

    const confidence = (workloadScore * this.config.weights.workload) + 
                     (availabilityScore * this.config.weights.availability);

    return {
      reviewer: developer,
      confidence: Math.min(confidence, 1.0),
      reasons,
      estimatedTime,
      workloadImpact,
      availabilityScore,
    };
  }

  private findBestReviewer(
    pullRequest: PullRequest,
    developers: Developer[],
    currentAssignments: Map<string, string[]>
  ): Developer | null {
    let bestReviewer: Developer | null = null;
    let bestScore = 0;

    for (const developer of developers) {
      if (!this.isAvailableForReview(developer, pullRequest)) continue;
      
      // Check if already assigned to this PR
      const assignees = currentAssignments.get(pullRequest.id) || [];
      if (assignees.includes(developer.id)) continue;
      
      // Calculate total current assignments
      let totalAssignments = 0;
      for (const assignments of currentAssignments.values()) {
        if (assignments.includes(developer.id)) totalAssignments++;
      }
      
      // Score based on workload balance
      const workloadScore = 1 / (totalAssignments + 1);
      const capacityScore = developer.workload.reviewCapacity / Math.max(developer.workload.currentReviews, 1);
      
      const totalScore = workloadScore * capacityScore;
      
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestReviewer = developer;
      }
    }

    return bestReviewer;
  }

  private estimateReviewTime(pullRequest: PullRequest): number {
    // Base time estimation in minutes
    const baseTime = 30;
    
    // Size factor
    const sizeMultipliers = {
      xs: 0.5,
      small: 1.0,
      medium: 2.0,
      large: 4.0,
      xl: 8.0,
    };
    
    const sizeMultiplier = sizeMultipliers[pullRequest.size] || 1.0;
    
    // Complexity factor based on file changes
    const complexityFactor = pullRequest.files.reduce((sum, file) => {
      return sum + (file.complexity * 0.1);
    }, 1.0);
    
    // Priority factor
    const priorityMultipliers = {
      low: 0.8,
      medium: 1.0,
      high: 1.5,
      critical: 2.0,
    };
    
    const priorityMultiplier = priorityMultipliers[pullRequest.priority] || 1.0;
    
    return Math.ceil(baseTime * sizeMultiplier * complexityFactor * priorityMultiplier);
  }

  private calculateAvailabilityScore(developer: Developer): number {
    if (!developer.availability.isAvailable) return 0;
    
    const now = new Date();
    const currentHour = now.getHours();
    
    // Parse working hours
    const [startHour] = developer.availability.workingHours.start.split(':').map(Number);
    const [endHour] = developer.availability.workingHours.end.split(':').map(Number);
    
    // Check if within working hours
    const isWorkingHours = currentHour >= startHour && currentHour <= endHour;
    
    // Base score
    let score = isWorkingHours ? 1.0 : 0.3;
    
    // Reduce score if out of office
    if (developer.availability.outOfOffice) {
      const { start, end } = developer.availability.outOfOffice;
      if (now >= start && now <= end) {
        score *= 0.1;
      }
    }
    
    return score;
  }

  private getActivityFactor(lastActivityDate: Date): number {
    const now = new Date();
    const daysSinceActivity = (now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceActivity <= 1) return 1.0;
    if (daysSinceActivity <= 3) return 0.8;
    if (daysSinceActivity <= 7) return 0.6;
    return 0.3;
  }
}