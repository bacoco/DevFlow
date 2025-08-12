export interface WorkContext {
  activityType: 'coding' | 'reviewing' | 'planning' | 'debugging' | 'meeting';
  projectContext: ProjectInfo;
  focusLevel: number; // 0-100
  collaborationState: CollaborationInfo;
  environmentFactors: EnvironmentData;
  timestamp: Date;
  confidence: number;
}

export interface ProjectInfo {
  projectId: string;
  name: string;
  repository?: string;
  currentBranch?: string;
  activeFiles: string[];
  recentCommits: GitCommit[];
}

export interface CollaborationInfo {
  activeCollaborators: string[];
  sharedArtifacts: string[];
  communicationChannels: string[];
  meetingStatus?: 'in-meeting' | 'available' | 'busy';
}

export interface EnvironmentData {
  timeOfDay: string;
  dayOfWeek: string;
  workingHours: boolean;
  location?: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  networkQuality: 'excellent' | 'good' | 'poor';
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  timestamp: Date;
  files: string[];
}

export interface ContextEvent {
  id: string;
  userId: string;
  eventType: 'activity_change' | 'focus_change' | 'collaboration_change' | 'environment_change';
  context: WorkContext;
  previousContext?: WorkContext;
  timestamp: Date;
  source: string;
}

export interface PredictedAction {
  actionType: string;
  description: string;
  confidence: number;
  suggestedTiming: Date;
  context: WorkContext;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface ContextEngine {
  getCurrentContext(userId: string): Promise<WorkContext>;
  subscribeToContextChanges(userId: string, callback: (context: WorkContext) => void): void;
  predictNextActions(context: WorkContext): Promise<PredictedAction[]>;
  getContextHistory(userId: string, timeRange: TimeRange): Promise<ContextEvent[]>;
  updateContext(userId: string, contextUpdate: Partial<WorkContext>): Promise<void>;
}

export interface ActivityClassificationResult {
  activityType: WorkContext['activityType'];
  confidence: number;
  features: Record<string, number>;
  timestamp: Date;
}

export interface ContextAggregatorInput {
  ideActivity?: any;
  gitEvents?: GitCommit[];
  calendarData?: any;
  biometricData?: any;
  environmentData?: EnvironmentData;
}