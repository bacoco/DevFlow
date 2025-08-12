import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';

export interface IDEActivityData {
  userId: string;
  fileType: string;
  actionType: 'editing' | 'viewing' | 'debugging' | 'reviewing' | 'planning';
  keywordFrequency: Record<string, number>;
  timeSpentInFile: number;
  numberOfEdits: number;
  projectId: string;
  projectName: string;
  activeFile: string;
  repository?: string;
  branch?: string;
  collaborators?: string[];
  continuousEditingTime: number;
  interruptionCount: number;
  keystrokePattern: 'steady' | 'burst' | 'irregular';
  timestamp: Date;
}

export class IDEActivityCollector extends EventEmitter {
  private logger: Logger;
  private isInitialized = false;
  private activityBuffer: IDEActivityData[] = [];
  private userSessions: Map<string, any> = new Map();

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    try {
      // Initialize VS Code extension integration
      await this.initializeVSCodeIntegration();
      
      // Start activity processing
      this.startActivityProcessing();
      
      this.isInitialized = true;
      this.logger.info('IDEActivityCollector initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize IDEActivityCollector:', error);
      throw error;
    }
  }

  private async initializeVSCodeIntegration(): Promise<void> {
    // This would integrate with the VS Code extension
    // For now, we'll simulate the integration
    this.logger.info('VS Code extension integration initialized');
    
    // Set up mock data collection for demonstration
    this.startMockDataCollection();
  }

  private startMockDataCollection(): void {
    // Simulate IDE activity data collection
    setInterval(() => {
      const mockActivity = this.generateMockActivity();
      this.collectActivity(mockActivity);
    }, 30000); // Every 30 seconds
  }

  private generateMockActivity(): IDEActivityData {
    const fileTypes = ['ts', 'js', 'py', 'java', 'cpp', 'md', 'json'];
    const actionTypes: IDEActivityData['actionType'][] = ['editing', 'viewing', 'debugging', 'reviewing', 'planning'];
    const keystrokePatterns: IDEActivityData['keystrokePattern'][] = ['steady', 'burst', 'irregular'];
    
    return {
      userId: 'demo-user',
      fileType: fileTypes[Math.floor(Math.random() * fileTypes.length)],
      actionType: actionTypes[Math.floor(Math.random() * actionTypes.length)],
      keywordFrequency: {
        'function': Math.random() * 0.3,
        'class': Math.random() * 0.2,
        'debug': Math.random() * 0.1,
        'test': Math.random() * 0.15,
        'todo': Math.random() * 0.05
      },
      timeSpentInFile: Math.random() * 3600, // 0-60 minutes
      numberOfEdits: Math.floor(Math.random() * 50),
      projectId: 'devflow-project',
      projectName: 'DevFlow Intelligence',
      activeFile: `src/components/Example.${fileTypes[Math.floor(Math.random() * fileTypes.length)]}`,
      repository: 'https://github.com/devflow/intelligence',
      branch: 'main',
      collaborators: Math.random() > 0.7 ? ['colleague1', 'colleague2'] : [],
      continuousEditingTime: Math.random() * 1800, // 0-30 minutes
      interruptionCount: Math.floor(Math.random() * 10),
      keystrokePattern: keystrokePatterns[Math.floor(Math.random() * keystrokePatterns.length)],
      timestamp: new Date()
    };
  }

  collectActivity(activityData: IDEActivityData): void {
    try {
      // Process and enrich the activity data
      const enrichedData = this.enrichActivityData(activityData);
      
      // Add to buffer
      this.activityBuffer.push(enrichedData);
      
      // Keep buffer size manageable
      if (this.activityBuffer.length > 1000) {
        this.activityBuffer = this.activityBuffer.slice(-1000);
      }
      
      // Emit activity data event
      this.emit('activityData', enrichedData);
      
      this.logger.debug(`Collected IDE activity: ${activityData.actionType} on ${activityData.fileType}`);
    } catch (error) {
      this.logger.error('Failed to collect IDE activity:', error);
    }
  }

  private enrichActivityData(activityData: IDEActivityData): IDEActivityData {
    // Add session tracking
    const userId = activityData.userId;
    let session = this.userSessions.get(userId);
    
    if (!session) {
      session = {
        startTime: new Date(),
        totalEdits: 0,
        totalTimeSpent: 0,
        filesSwitched: 0,
        lastFile: null
      };
      this.userSessions.set(userId, session);
    }
    
    // Update session data
    session.totalEdits += activityData.numberOfEdits;
    session.totalTimeSpent += activityData.timeSpentInFile;
    
    if (session.lastFile && session.lastFile !== activityData.activeFile) {
      session.filesSwitched++;
    }
    session.lastFile = activityData.activeFile;
    
    // Enrich with session context
    const enrichedData = {
      ...activityData,
      sessionContext: {
        sessionDuration: Date.now() - session.startTime.getTime(),
        totalEditsInSession: session.totalEdits,
        totalTimeInSession: session.totalTimeSpent,
        filesSwitchedInSession: session.filesSwitched
      }
    };
    
    return enrichedData;
  }

  private startActivityProcessing(): void {
    // Process activity buffer periodically
    setInterval(() => {
      this.processActivityBuffer();
    }, 60000); // Every minute
  }

  private processActivityBuffer(): void {
    if (this.activityBuffer.length === 0) return;
    
    try {
      // Analyze patterns in recent activity
      const recentActivity = this.activityBuffer.slice(-10); // Last 10 activities
      const patterns = this.analyzeActivityPatterns(recentActivity);
      
      // Emit pattern analysis
      this.emit('activityPatterns', patterns);
      
      this.logger.debug(`Processed ${recentActivity.length} recent activities`);
    } catch (error) {
      this.logger.error('Failed to process activity buffer:', error);
    }
  }

  private analyzeActivityPatterns(activities: IDEActivityData[]): any {
    const patterns = {
      dominantActivity: this.getDominantActivity(activities),
      averageEditingTime: this.getAverageEditingTime(activities),
      interruptionRate: this.getInterruptionRate(activities),
      focusScore: this.calculateFocusScore(activities),
      collaborationLevel: this.getCollaborationLevel(activities),
      codeQualityIndicators: this.getCodeQualityIndicators(activities)
    };
    
    return patterns;
  }

  private getDominantActivity(activities: IDEActivityData[]): string {
    const activityCounts = activities.reduce((counts, activity) => {
      counts[activity.actionType] = (counts[activity.actionType] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    return Object.entries(activityCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';
  }

  private getAverageEditingTime(activities: IDEActivityData[]): number {
    const editingActivities = activities.filter(a => a.actionType === 'editing');
    if (editingActivities.length === 0) return 0;
    
    const totalTime = editingActivities.reduce((sum, a) => sum + a.continuousEditingTime, 0);
    return totalTime / editingActivities.length;
  }

  private getInterruptionRate(activities: IDEActivityData[]): number {
    const totalInterruptions = activities.reduce((sum, a) => sum + a.interruptionCount, 0);
    return activities.length > 0 ? totalInterruptions / activities.length : 0;
  }

  private calculateFocusScore(activities: IDEActivityData[]): number {
    // Calculate focus score based on continuous editing time and interruptions
    const avgEditingTime = this.getAverageEditingTime(activities);
    const interruptionRate = this.getInterruptionRate(activities);
    
    // Higher editing time and lower interruptions = higher focus
    const focusScore = Math.max(0, Math.min(100, 
      (avgEditingTime / 1800) * 50 + // Max 50 points for 30min continuous editing
      Math.max(0, (10 - interruptionRate) * 5) // Max 50 points for low interruptions
    ));
    
    return focusScore;
  }

  private getCollaborationLevel(activities: IDEActivityData[]): number {
    const collaborativeActivities = activities.filter(a => 
      a.collaborators && a.collaborators.length > 0
    );
    
    return activities.length > 0 ? 
      (collaborativeActivities.length / activities.length) * 100 : 0;
  }

  private getCodeQualityIndicators(activities: IDEActivityData[]): any {
    const testKeywords = ['test', 'spec', 'describe', 'it', 'expect'];
    const debugKeywords = ['debug', 'console', 'log', 'print', 'breakpoint'];
    
    let testingActivity = 0;
    let debuggingActivity = 0;
    
    activities.forEach(activity => {
      const keywords = Object.keys(activity.keywordFrequency);
      
      if (keywords.some(k => testKeywords.includes(k.toLowerCase()))) {
        testingActivity++;
      }
      
      if (keywords.some(k => debugKeywords.includes(k.toLowerCase()))) {
        debuggingActivity++;
      }
    });
    
    return {
      testingRatio: activities.length > 0 ? testingActivity / activities.length : 0,
      debuggingRatio: activities.length > 0 ? debuggingActivity / activities.length : 0,
      codeReviewActivity: activities.filter(a => a.actionType === 'reviewing').length
    };
  }

  // Public methods for external integration
  onActivityData(callback: (data: IDEActivityData) => void): void {
    this.on('activityData', callback);
  }

  onActivityPatterns(callback: (patterns: any) => void): void {
    this.on('activityPatterns', callback);
  }

  getRecentActivity(userId: string, minutes: number = 60): IDEActivityData[] {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    return this.activityBuffer.filter(activity => 
      activity.userId === userId && activity.timestamp > cutoffTime
    );
  }

  getUserSession(userId: string): any {
    return this.userSessions.get(userId);
  }

  // Integration with VS Code extension
  async setupVSCodeExtension(): Promise<void> {
    // This would set up the actual VS Code extension integration
    // Including WebSocket connection, event handlers, etc.
    this.logger.info('Setting up VS Code extension integration');
    
    // For now, we'll continue with mock data
    // In a real implementation, this would:
    // 1. Establish WebSocket connection with VS Code extension
    // 2. Set up event handlers for file operations
    // 3. Configure data collection preferences
    // 4. Handle authentication and permissions
  }
}