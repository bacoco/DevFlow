export interface Developer {
  id: string;
  name: string;
  email: string;
  githubUsername: string;
  teamId: string;
  skills: string[];
  expertise: ExpertiseArea[];
  workload: WorkloadMetrics;
  availability: AvailabilityStatus;
  preferences: ReviewerPreferences;
}

export interface ExpertiseArea {
  technology: string;
  level: ExpertiseLevel;
  confidence: number; // 0-1
  lastUpdated: Date;
  evidenceCount: number; // Number of commits/reviews in this area
}

export interface WorkloadMetrics {
  currentReviews: number;
  averageReviewTime: number; // in hours
  reviewCapacity: number;
  weeklyCommitCount: number;
  lastActivityDate: Date;
}

export interface AvailabilityStatus {
  isAvailable: boolean;
  timezone: string;
  workingHours: {
    start: string; // HH:mm format
    end: string;
  };
  outOfOffice?: {
    start: Date;
    end: Date;
    reason: string;
  };
}

export interface ReviewerPreferences {
  maxReviewsPerDay: number;
  preferredFileTypes: string[];
  avoidFileTypes: string[];
  preferredTeams: string[];
  notificationSettings: {
    immediate: boolean;
    digest: boolean;
    channels: string[];
  };
}

export interface PullRequest {
  id: string;
  title: string;
  description: string;
  author: string;
  repository: string;
  branch: string;
  targetBranch: string;
  createdAt: Date;
  updatedAt: Date;
  files: FileChange[];
  size: PRSize;
  priority: Priority;
  labels: string[];
  isDraft: boolean;
  requiredReviewers?: string[];
  excludedReviewers?: string[];
}

export interface FileChange {
  filename: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  language: string;
  complexity: number; // 1-10 scale
}

export interface ReviewAssignment {
  pullRequestId: string;
  reviewerId: string;
  assignedAt: Date;
  confidence: number; // 0-1, how confident we are in this assignment
  reasoning: AssignmentReason[];
  priority: Priority;
  estimatedReviewTime: number; // in minutes
  deadline?: Date;
}

export interface AssignmentReason {
  type: ReasonType;
  description: string;
  weight: number; // 0-1, how much this reason contributed to the assignment
  evidence?: any;
}

export interface ReviewerSuggestion {
  reviewer: Developer;
  confidence: number;
  reasons: AssignmentReason[];
  estimatedTime: number;
  workloadImpact: number; // 0-1, how much this would impact their workload
  availabilityScore: number; // 0-1, how available they are
}

export interface AssignmentAlgorithmConfig {
  weights: {
    expertise: number;
    workload: number;
    availability: number;
    collaboration: number;
    diversity: number;
  };
  constraints: {
    maxReviewersPerPR: number;
    minExpertiseLevel: ExpertiseLevel;
    maxWorkloadThreshold: number;
    requireTeamDiversity: boolean;
    avoidSameAuthor: boolean;
  };
  preferences: {
    favorRecentCollaborators: boolean;
    balanceWorkload: boolean;
    prioritizeExperts: boolean;
    considerTimezone: boolean;
  };
}

export interface GitAnalysis {
  developerId: string;
  repository: string;
  analysis: {
    commitCount: number;
    linesAdded: number;
    linesDeleted: number;
    filesModified: string[];
    languages: Record<string, number>; // language -> line count
    complexity: number;
    reviewsGiven: number;
    reviewsReceived: number;
    collaborators: string[];
    timePatterns: {
      mostActiveHours: number[];
      mostActiveDays: string[];
    };
  };
  period: {
    start: Date;
    end: Date;
  };
}

export interface CodePattern {
  pattern: string;
  language: string;
  complexity: number;
  frequency: number;
  expertise: ExpertiseLevel;
}

export type ExpertiseLevel = 'novice' | 'intermediate' | 'advanced' | 'expert';
export type PRSize = 'xs' | 'small' | 'medium' | 'large' | 'xl';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type ReasonType = 
  | 'expertise_match'
  | 'workload_balance'
  | 'availability'
  | 'collaboration_history'
  | 'team_diversity'
  | 'file_ownership'
  | 'language_expertise'
  | 'domain_knowledge'
  | 'recent_activity';