import { MongoClient, Db, Collection } from 'mongodb';
import { Logger } from '../utils/logger';
import { TaskData, TaskFeatures } from '../services/task-completion-predictor';

export interface TaskManagerIntegration {
  extractFeaturesFromTaskManager(taskId: string): Promise<TaskFeatures>;
  syncTaskData(): Promise<void>;
  getHistoricalTaskData(filters?: TaskDataFilters): Promise<TaskData[]>;
}

export interface TaskDataFilters {
  teamId?: string;
  projectId?: string;
  assignee?: string;
  status?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  complexity?: {
    min: number;
    max: number;
  };
}

export class TaskFeatureExtractor implements TaskManagerIntegration {
  private db: Db;
  private tasksCollection: Collection<TaskData>;
  private usersCollection: Collection<any>;
  private projectsCollection: Collection<any>;
  private logger: Logger;

  constructor(mongoClient: MongoClient, logger: Logger) {
    this.db = mongoClient.db('devflow_tasks');
    this.tasksCollection = this.db.collection<TaskData>('tasks');
    this.usersCollection = this.db.collection('users');
    this.projectsCollection = this.db.collection('projects');
    this.logger = logger;
  }

  async extractFeaturesFromTaskManager(taskId: string): Promise<TaskFeatures> {
    try {
      const task = await this.tasksCollection.findOne({ id: taskId });
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      // Extract comprehensive features
      const features: TaskFeatures = {
        titleLength: task.title.length,
        descriptionLength: task.description.length,
        priority: this.encodePriority(task.priority),
        complexity: task.complexity,
        estimatedHours: task.estimatedHours,
        dependencyCount: task.dependencies.length,
        tagCount: task.tags.length,
        assigneeExperience: await this.calculateAssigneeExperience(task.assignee),
        teamVelocity: await this.calculateTeamVelocity(task.teamId),
        projectComplexity: await this.calculateProjectComplexity(task.projectId),
        timeOfCreation: new Date(task.createdAt).getHours(),
        dayOfWeek: new Date(task.createdAt).getDay(),
        isBlocked: task.status === 'blocked' ? 1 : 0,
        similarTasksAvgTime: await this.calculateSimilarTasksAvgTime(task)
      };

      return features;
    } catch (error) {
      this.logger.error(`Failed to extract features for task ${taskId}:`, error);
      throw error;
    }
  }

  async syncTaskData(): Promise<void> {
    try {
      this.logger.info('Starting task data synchronization');

      // This would typically sync with the main TaskManager database
      // For now, we'll simulate the sync process
      
      // Get tasks from the main dashboard database
      const dashboardDb = this.db.client.db('devflow_dashboard');
      const dashboardTasks = dashboardDb.collection('tasks');
      
      const recentTasks = await dashboardTasks.find({
        updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      }).toArray();

      // Transform and upsert tasks
      for (const dashboardTask of recentTasks) {
        const transformedTask = this.transformDashboardTask(dashboardTask);
        
        await this.tasksCollection.updateOne(
          { id: transformedTask.id },
          { $set: transformedTask },
          { upsert: true }
        );
      }

      this.logger.info(`Synchronized ${recentTasks.length} tasks`);
    } catch (error) {
      this.logger.error('Failed to sync task data:', error);
      throw error;
    }
  }

  async getHistoricalTaskData(filters: TaskDataFilters = {}): Promise<TaskData[]> {
    try {
      const query: any = {};

      // Apply filters
      if (filters.teamId) query.teamId = filters.teamId;
      if (filters.projectId) query.projectId = filters.projectId;
      if (filters.assignee) query.assignee = filters.assignee;
      if (filters.status) query.status = { $in: filters.status };
      
      if (filters.dateRange) {
        query.createdAt = {
          $gte: filters.dateRange.start,
          $lte: filters.dateRange.end
        };
      }
      
      if (filters.complexity) {
        query.complexity = {
          $gte: filters.complexity.min,
          $lte: filters.complexity.max
        };
      }

      const tasks = await this.tasksCollection.find(query)
        .sort({ createdAt: -1 })
        .limit(1000) // Reasonable limit
        .toArray();

      return tasks;
    } catch (error) {
      this.logger.error('Failed to get historical task data:', error);
      throw error;
    }
  }

  private transformDashboardTask(dashboardTask: any): TaskData {
    return {
      id: dashboardTask._id || dashboardTask.id,
      title: dashboardTask.title,
      description: dashboardTask.description || '',
      assignee: dashboardTask.assignee,
      priority: dashboardTask.priority || 'medium',
      complexity: dashboardTask.complexity || 5,
      estimatedHours: dashboardTask.estimatedHours || 8,
      actualHours: dashboardTask.actualHours,
      status: dashboardTask.status,
      createdAt: dashboardTask.createdAt,
      startedAt: dashboardTask.startedAt,
      completedAt: dashboardTask.completedAt,
      dependencies: dashboardTask.dependencies || [],
      tags: dashboardTask.tags || [],
      projectId: dashboardTask.projectId,
      teamId: dashboardTask.teamId
    };
  }

  private encodePriority(priority: TaskData['priority']): number {
    const mapping = { low: 1, medium: 2, high: 3, urgent: 4 };
    return mapping[priority];
  }

  private async calculateAssigneeExperience(assignee: string): Promise<number> {
    try {
      // Get user's historical performance
      const user = await this.usersCollection.findOne({ id: assignee });
      if (!user) return 5; // Default experience level

      // Calculate experience based on completed tasks in last 90 days
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      
      const completedTasks = await this.tasksCollection.find({
        assignee,
        status: 'done',
        completedAt: { $gte: ninetyDaysAgo }
      }).toArray();

      // Calculate accuracy (tasks completed on time)
      const onTimeTasks = completedTasks.filter(task => {
        if (!task.actualHours || !task.estimatedHours) return false;
        return task.actualHours <= task.estimatedHours * 1.2; // Within 20% of estimate
      });

      const accuracy = completedTasks.length > 0 ? onTimeTasks.length / completedTasks.length : 0.5;
      const taskCount = Math.min(completedTasks.length, 50); // Cap at 50 for normalization
      
      // Experience score: 40% accuracy, 60% task count
      const experienceScore = (accuracy * 4) + (taskCount / 50 * 6);
      
      return Math.min(10, Math.max(1, experienceScore));
    } catch (error) {
      this.logger.error(`Failed to calculate assignee experience for ${assignee}:`, error);
      return 5; // Default
    }
  }

  private async calculateTeamVelocity(teamId: string): Promise<number> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const teamTasks = await this.tasksCollection.find({
        teamId,
        status: 'done',
        completedAt: { $gte: thirtyDaysAgo },
        actualHours: { $exists: true, $gt: 0 }
      }).toArray();

      if (teamTasks.length === 0) return 6; // Default velocity

      // Calculate average completion time
      const totalHours = teamTasks.reduce((sum, task) => sum + (task.actualHours || 0), 0);
      const avgHours = totalHours / teamTasks.length;

      // Calculate velocity as tasks per week
      const weeksInPeriod = 4.3; // ~30 days
      const tasksPerWeek = teamTasks.length / weeksInPeriod;

      // Combine both metrics (normalized)
      const velocityScore = (tasksPerWeek * 0.6) + ((20 - Math.min(20, avgHours)) / 20 * 4);
      
      return Math.max(1, Math.min(10, velocityScore));
    } catch (error) {
      this.logger.error(`Failed to calculate team velocity for ${teamId}:`, error);
      return 6; // Default
    }
  }

  private async calculateProjectComplexity(projectId: string): Promise<number> {
    try {
      const project = await this.projectsCollection.findOne({ id: projectId });
      if (!project) return 5; // Default complexity

      // Get project tasks
      const projectTasks = await this.tasksCollection.find({
        projectId,
        complexity: { $exists: true }
      }).toArray();

      if (projectTasks.length === 0) return 5;

      // Calculate average complexity
      const avgComplexity = projectTasks.reduce((sum, task) => sum + task.complexity, 0) / projectTasks.length;
      
      // Factor in project metadata
      let complexityAdjustment = 0;
      
      if (project.technology?.includes('legacy')) complexityAdjustment += 1;
      if (project.technology?.includes('microservices')) complexityAdjustment += 0.5;
      if (project.teamSize > 10) complexityAdjustment += 0.5;
      if (project.isGreenfield === false) complexityAdjustment += 1;

      return Math.min(10, Math.max(1, avgComplexity + complexityAdjustment));
    } catch (error) {
      this.logger.error(`Failed to calculate project complexity for ${projectId}:`, error);
      return 5; // Default
    }
  }

  private async calculateSimilarTasksAvgTime(task: TaskData): Promise<number> {
    try {
      // Find similar tasks based on multiple criteria
      const similarTasks = await this.tasksCollection.find({
        status: 'done',
        actualHours: { $exists: true, $gt: 0 },
        $or: [
          // Same complexity and priority
          {
            complexity: { $gte: task.complexity - 1, $lte: task.complexity + 1 },
            priority: task.priority
          },
          // Same tags
          {
            tags: { $in: task.tags }
          },
          // Same project
          {
            projectId: task.projectId,
            complexity: { $gte: task.complexity - 2, $lte: task.complexity + 2 }
          }
        ]
      }).limit(50).toArray();

      if (similarTasks.length === 0) return task.estimatedHours;

      // Calculate weighted average based on similarity
      let totalWeightedTime = 0;
      let totalWeight = 0;

      similarTasks.forEach(similarTask => {
        let weight = 1;
        
        // Higher weight for exact complexity match
        if (similarTask.complexity === task.complexity) weight += 2;
        
        // Higher weight for same priority
        if (similarTask.priority === task.priority) weight += 1;
        
        // Higher weight for shared tags
        const sharedTags = task.tags.filter(tag => similarTask.tags.includes(tag));
        weight += sharedTags.length * 0.5;
        
        // Higher weight for same project
        if (similarTask.projectId === task.projectId) weight += 1;

        totalWeightedTime += (similarTask.actualHours || 0) * weight;
        totalWeight += weight;
      });

      return totalWeight > 0 ? totalWeightedTime / totalWeight : task.estimatedHours;
    } catch (error) {
      this.logger.error('Failed to calculate similar tasks average time:', error);
      return task.estimatedHours;
    }
  }

  // Additional utility methods for advanced feature extraction

  async extractTextFeatures(text: string): Promise<any> {
    // Simple text analysis - could be enhanced with NLP libraries
    const words = text.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    
    // Technical keywords that might indicate complexity
    const technicalKeywords = [
      'api', 'database', 'integration', 'migration', 'refactor', 'optimization',
      'security', 'performance', 'scalability', 'architecture', 'algorithm'
    ];
    
    const technicalWordCount = words.filter(word => 
      technicalKeywords.includes(word)
    ).length;

    return {
      wordCount: words.length,
      uniqueWordCount: uniqueWords.size,
      avgWordLength: words.reduce((sum, word) => sum + word.length, 0) / words.length,
      technicalWordRatio: technicalWordCount / words.length,
      readabilityScore: this.calculateReadabilityScore(words)
    };
  }

  private calculateReadabilityScore(words: string[]): number {
    // Simplified readability score
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const longWordCount = words.filter(word => word.length > 6).length;
    const longWordRatio = longWordCount / words.length;
    
    // Lower score = easier to read = potentially less complex
    return (avgWordLength * 2) + (longWordRatio * 10);
  }

  async extractTemporalFeatures(task: TaskData): Promise<any> {
    const createdAt = new Date(task.createdAt);
    
    return {
      hourOfDay: createdAt.getHours(),
      dayOfWeek: createdAt.getDay(),
      dayOfMonth: createdAt.getDate(),
      month: createdAt.getMonth(),
      quarter: Math.floor(createdAt.getMonth() / 3) + 1,
      isWeekend: createdAt.getDay() === 0 || createdAt.getDay() === 6,
      isBusinessHours: createdAt.getHours() >= 9 && createdAt.getHours() <= 17,
      seasonality: this.getSeason(createdAt.getMonth())
    };
  }

  private getSeason(month: number): string {
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  async extractCollaborationFeatures(task: TaskData): Promise<any> {
    try {
      // Analyze team collaboration patterns
      const teamTasks = await this.tasksCollection.find({
        teamId: task.teamId,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }).toArray();

      const assignees = new Set(teamTasks.map(t => t.assignee));
      const avgTasksPerAssignee = teamTasks.length / assignees.size;
      
      // Calculate assignee's current workload
      const assigneeActiveTasks = await this.tasksCollection.countDocuments({
        assignee: task.assignee,
        status: { $in: ['todo', 'in_progress'] }
      });

      return {
        teamSize: assignees.size,
        avgTasksPerAssignee,
        assigneeCurrentWorkload: assigneeActiveTasks,
        dependencyComplexity: await this.calculateDependencyComplexity(task),
        collaborationScore: await this.calculateCollaborationScore(task)
      };
    } catch (error) {
      this.logger.error('Failed to extract collaboration features:', error);
      return {
        teamSize: 5,
        avgTasksPerAssignee: 3,
        assigneeCurrentWorkload: 2,
        dependencyComplexity: 1,
        collaborationScore: 5
      };
    }
  }

  private async calculateDependencyComplexity(task: TaskData): Promise<number> {
    if (task.dependencies.length === 0) return 0;

    // Analyze dependency chain depth and complexity
    let maxDepth = 0;
    let totalComplexity = 0;

    for (const depId of task.dependencies) {
      const depTask = await this.tasksCollection.findOne({ id: depId });
      if (depTask) {
        totalComplexity += depTask.complexity;
        const depDepth = await this.calculateDependencyDepth(depTask, new Set([task.id]));
        maxDepth = Math.max(maxDepth, depDepth);
      }
    }

    return (maxDepth * 0.5) + (totalComplexity / task.dependencies.length * 0.5);
  }

  private async calculateDependencyDepth(task: TaskData, visited: Set<string>): Promise<number> {
    if (visited.has(task.id) || task.dependencies.length === 0) return 0;
    
    visited.add(task.id);
    let maxDepth = 0;

    for (const depId of task.dependencies) {
      const depTask = await this.tasksCollection.findOne({ id: depId });
      if (depTask && !visited.has(depTask.id)) {
        const depth = 1 + await this.calculateDependencyDepth(depTask, new Set(visited));
        maxDepth = Math.max(maxDepth, depth);
      }
    }

    return maxDepth;
  }

  private async calculateCollaborationScore(task: TaskData): Promise<number> {
    // Analyze how collaborative the task is likely to be
    let score = 5; // Base score

    // Tasks with dependencies require more collaboration
    score += task.dependencies.length * 0.5;

    // High complexity tasks often need more collaboration
    if (task.complexity > 7) score += 1;

    // Certain tags indicate collaborative work
    const collaborativeTags = ['review', 'pair-programming', 'architecture', 'design'];
    const hasCollaborativeTags = task.tags.some(tag => 
      collaborativeTags.some(colTag => tag.toLowerCase().includes(colTag))
    );
    if (hasCollaborativeTags) score += 2;

    return Math.min(10, Math.max(1, score));
  }
}