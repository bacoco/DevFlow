import { MongoClient, Db, Collection } from 'mongodb';
import { Logger } from '../utils/logger';
import { TaskData } from './task-completion-predictor';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  skills: string[];
  capacity: number; // Hours per week
  currentWorkload: number; // Current assigned hours
  efficiency: number; // 0-1 scale based on historical performance
  availability: Availability[];
  preferences: WorkPreferences;
  performanceMetrics: PerformanceMetrics;
}

export interface Availability {
  startDate: Date;
  endDate: Date;
  availableHours: number;
  reason?: string; // vacation, training, etc.
}

export interface WorkPreferences {
  preferredTaskTypes: string[];
  preferredComplexity: { min: number; max: number };
  workingHours: { start: number; end: number };
  collaborationStyle: 'independent' | 'collaborative' | 'mixed';
}

export interface PerformanceMetrics {
  completionRate: number; // Percentage of tasks completed on time
  averageQuality: number; // 0-10 scale
  velocityTrend: 'increasing' | 'stable' | 'decreasing';
  skillGrowth: Record<string, number>; // Skill improvement over time
  collaborationScore: number; // How well they work with others
}

export interface WorkloadOptimization {
  teamId: string;
  optimizationDate: Date;
  currentState: WorkloadState;
  optimizedState: WorkloadState;
  recommendations: OptimizationRecommendation[];
  expectedImprovements: ExpectedImprovements;
  implementationPlan: ImplementationStep[];
}

export interface WorkloadState {
  teamMembers: TeamMemberWorkload[];
  totalCapacity: number;
  totalWorkload: number;
  utilizationRate: number;
  balanceScore: number; // 0-100, higher is better balanced
  skillCoverage: Record<string, number>;
}

export interface TeamMemberWorkload {
  memberId: string;
  name: string;
  assignedTasks: TaskAssignment[];
  totalHours: number;
  utilizationRate: number;
  skillUtilization: Record<string, number>;
  workloadBalance: number; // How balanced their workload is
}

export interface TaskAssignment {
  taskId: string;
  title: string;
  estimatedHours: number;
  priority: TaskData['priority'];
  complexity: number;
  requiredSkills: string[];
  currentAssignee?: string;
  suggestedAssignee?: string;
  reassignmentReason?: string;
  confidenceScore: number;
}

export interface OptimizationRecommendation {
  type: 'task_reassignment' | 'capacity_adjustment' | 'skill_development' | 'timeline_adjustment' | 'resource_addition';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedMembers: string[];
  affectedTasks: string[];
  expectedImpact: {
    balanceImprovement: number;
    efficiencyGain: number;
    riskReduction: number;
  };
  implementationEffort: 'low' | 'medium' | 'high';
  timeline: string;
}

export interface ExpectedImprovements {
  balanceImprovement: number; // Percentage improvement in workload balance
  efficiencyGain: number; // Percentage improvement in team efficiency
  deliveryTimeReduction: number; // Days saved
  riskReduction: number; // Percentage reduction in delivery risk
  memberSatisfaction: number; // Expected improvement in satisfaction
}

export interface ImplementationStep {
  step: number;
  action: string;
  assignee: string;
  estimatedTime: number; // Hours
  dependencies: number[];
  status: 'pending' | 'in_progress' | 'completed';
}

export class WorkloadOptimizer {
  private db: Db;
  private tasksCollection: Collection<TaskData>;
  private usersCollection: Collection<TeamMember>;
  private teamsCollection: Collection<any>;
  private logger: Logger;

  constructor(mongoClient: MongoClient, logger: Logger) {
    this.db = mongoClient.db('devflow_tasks');
    this.tasksCollection = this.db.collection<TaskData>('tasks');
    this.usersCollection = this.db.collection<TeamMember>('users');
    this.teamsCollection = this.db.collection('teams');
    this.logger = logger;
  }

  async optimizeWorkload(teamId: string): Promise<WorkloadOptimization> {
    try {
      this.logger.info(`Starting workload optimization for team ${teamId}`);

      // Get team members and their current workload
      const teamMembers = await this.getTeamMembers(teamId);
      const activeTasks = await this.getActiveTasks(teamId);

      // Analyze current state
      const currentState = await this.analyzeCurrentWorkload(teamMembers, activeTasks);

      // Generate optimization recommendations
      const recommendations = await this.generateOptimizationRecommendations(
        teamMembers, 
        activeTasks, 
        currentState
      );

      // Create optimized state
      const optimizedState = await this.createOptimizedState(
        teamMembers, 
        activeTasks, 
        recommendations
      );

      // Calculate expected improvements
      const expectedImprovements = this.calculateExpectedImprovements(
        currentState, 
        optimizedState
      );

      // Create implementation plan
      const implementationPlan = this.createImplementationPlan(recommendations);

      const optimization: WorkloadOptimization = {
        teamId,
        optimizationDate: new Date(),
        currentState,
        optimizedState,
        recommendations,
        expectedImprovements,
        implementationPlan
      };

      this.logger.info(`Workload optimization completed for team ${teamId}. Balance improvement: ${expectedImprovements.balanceImprovement}%`);

      return optimization;
    } catch (error) {
      this.logger.error(`Failed to optimize workload for team ${teamId}:`, error);
      throw error;
    }
  }

  private async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const team = await this.teamsCollection.findOne({ id: teamId });
    if (!team) {
      throw new Error(`Team ${teamId} not found`);
    }

    const members = await this.usersCollection.find({
      id: { $in: team.memberIds }
    }).toArray();

    // Enrich with performance metrics
    for (const member of members) {
      member.performanceMetrics = await this.calculatePerformanceMetrics(member.id);
      member.currentWorkload = await this.calculateCurrentWorkload(member.id);
    }

    return members;
  }

  private async getActiveTasks(teamId: string): Promise<TaskData[]> {
    return await this.tasksCollection.find({
      teamId,
      status: { $in: ['todo', 'in_progress'] }
    }).toArray();
  }

  private async analyzeCurrentWorkload(
    teamMembers: TeamMember[], 
    tasks: TaskData[]
  ): Promise<WorkloadState> {
    const memberWorkloads: TeamMemberWorkload[] = [];
    let totalCapacity = 0;
    let totalWorkload = 0;
    const skillCoverage: Record<string, number> = {};

    for (const member of teamMembers) {
      const memberTasks = tasks.filter(task => task.assignee === member.id);
      const assignments: TaskAssignment[] = memberTasks.map(task => ({
        taskId: task.id,
        title: task.title,
        estimatedHours: task.estimatedHours,
        priority: task.priority,
        complexity: task.complexity,
        requiredSkills: this.extractRequiredSkills(task),
        currentAssignee: task.assignee,
        confidenceScore: 0.8 // Default confidence
      }));

      const memberHours = memberTasks.reduce((sum, task) => sum + task.estimatedHours, 0);
      const utilizationRate = member.capacity > 0 ? (memberHours / member.capacity) * 100 : 0;

      // Calculate skill utilization
      const skillUtilization: Record<string, number> = {};
      for (const skill of member.skills) {
        const skillTasks = memberTasks.filter(task => 
          this.extractRequiredSkills(task).includes(skill)
        );
        const skillHours = skillTasks.reduce((sum, task) => sum + task.estimatedHours, 0);
        skillUtilization[skill] = memberHours > 0 ? (skillHours / memberHours) * 100 : 0;
        
        // Update team skill coverage
        skillCoverage[skill] = (skillCoverage[skill] || 0) + 1;
      }

      memberWorkloads.push({
        memberId: member.id,
        name: member.name,
        assignedTasks: assignments,
        totalHours: memberHours,
        utilizationRate,
        skillUtilization,
        workloadBalance: this.calculateWorkloadBalance(assignments)
      });

      totalCapacity += member.capacity;
      totalWorkload += memberHours;
    }

    const utilizationRate = totalCapacity > 0 ? (totalWorkload / totalCapacity) * 100 : 0;
    const balanceScore = this.calculateTeamBalanceScore(memberWorkloads);

    return {
      teamMembers: memberWorkloads,
      totalCapacity,
      totalWorkload,
      utilizationRate,
      balanceScore,
      skillCoverage
    };
  }

  private async generateOptimizationRecommendations(
    teamMembers: TeamMember[],
    tasks: TaskData[],
    currentState: WorkloadState
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Task reassignment recommendations
    recommendations.push(...await this.generateTaskReassignmentRecommendations(
      teamMembers, tasks, currentState
    ));

    // Capacity adjustment recommendations
    recommendations.push(...this.generateCapacityAdjustmentRecommendations(
      teamMembers, currentState
    ));

    // Skill development recommendations
    recommendations.push(...this.generateSkillDevelopmentRecommendations(
      teamMembers, tasks
    ));

    // Timeline adjustment recommendations
    recommendations.push(...this.generateTimelineAdjustmentRecommendations(
      tasks, currentState
    ));

    // Resource addition recommendations
    recommendations.push(...this.generateResourceAdditionRecommendations(
      currentState
    ));

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private async generateTaskReassignmentRecommendations(
    teamMembers: TeamMember[],
    tasks: TaskData[],
    currentState: WorkloadState
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];
    const memberMap = new Map(teamMembers.map(m => [m.id, m]));

    // Find overloaded and underloaded members
    const overloaded = currentState.teamMembers.filter(m => m.utilizationRate > 90);
    const underloaded = currentState.teamMembers.filter(m => m.utilizationRate < 70);

    if (overloaded.length > 0 && underloaded.length > 0) {
      const reassignments: string[] = [];
      const affectedMembers: string[] = [];

      for (const overloadedMember of overloaded) {
        const member = memberMap.get(overloadedMember.memberId)!;
        const reassignableTasks = overloadedMember.assignedTasks
          .filter(task => task.priority !== 'urgent')
          .sort((a, b) => a.complexity - b.complexity); // Start with simpler tasks

        for (const task of reassignableTasks.slice(0, 3)) { // Limit to 3 tasks
          const bestAssignee = this.findBestAssignee(task, underloaded, memberMap);
          
          if (bestAssignee && bestAssignee.utilizationRate < 85) {
            reassignments.push(`${task.title} from ${member.name} to ${bestAssignee.name}`);
            affectedMembers.push(overloadedMember.memberId, bestAssignee.memberId);
          }
        }
      }

      if (reassignments.length > 0) {
        recommendations.push({
          type: 'task_reassignment',
          priority: 'high',
          description: `Reassign ${reassignments.length} tasks to balance workload: ${reassignments.slice(0, 2).join(', ')}${reassignments.length > 2 ? '...' : ''}`,
          affectedMembers: [...new Set(affectedMembers)],
          affectedTasks: reassignments.map(r => r.split(' ')[0]),
          expectedImpact: {
            balanceImprovement: 15,
            efficiencyGain: 10,
            riskReduction: 20
          },
          implementationEffort: 'medium',
          timeline: '1-2 days'
        });
      }
    }

    return recommendations;
  }

  private generateCapacityAdjustmentRecommendations(
    teamMembers: TeamMember[],
    currentState: WorkloadState
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    if (currentState.utilizationRate > 95) {
      recommendations.push({
        type: 'capacity_adjustment',
        priority: 'high',
        description: 'Team is over-capacity. Consider reducing scope or extending timeline',
        affectedMembers: teamMembers.map(m => m.id),
        affectedTasks: [],
        expectedImpact: {
          balanceImprovement: 25,
          efficiencyGain: 15,
          riskReduction: 30
        },
        implementationEffort: 'high',
        timeline: '1-2 weeks'
      });
    } else if (currentState.utilizationRate < 60) {
      recommendations.push({
        type: 'capacity_adjustment',
        priority: 'medium',
        description: 'Team has excess capacity. Consider taking on additional work',
        affectedMembers: teamMembers.map(m => m.id),
        affectedTasks: [],
        expectedImpact: {
          balanceImprovement: 10,
          efficiencyGain: 20,
          riskReduction: 5
        },
        implementationEffort: 'medium',
        timeline: '1 week'
      });
    }

    return recommendations;
  }

  private generateSkillDevelopmentRecommendations(
    teamMembers: TeamMember[],
    tasks: TaskData[]
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Identify skill gaps
    const requiredSkills = new Set<string>();
    tasks.forEach(task => {
      this.extractRequiredSkills(task).forEach(skill => requiredSkills.add(skill));
    });

    const teamSkills = new Set<string>();
    teamMembers.forEach(member => {
      member.skills.forEach(skill => teamSkills.add(skill));
    });

    const skillGaps = Array.from(requiredSkills).filter(skill => !teamSkills.has(skill));
    
    if (skillGaps.length > 0) {
      recommendations.push({
        type: 'skill_development',
        priority: 'medium',
        description: `Develop missing skills: ${skillGaps.slice(0, 3).join(', ')}`,
        affectedMembers: teamMembers.slice(0, 2).map(m => m.id), // Top 2 candidates
        affectedTasks: [],
        expectedImpact: {
          balanceImprovement: 20,
          efficiencyGain: 25,
          riskReduction: 15
        },
        implementationEffort: 'high',
        timeline: '4-8 weeks'
      });
    }

    return recommendations;
  }

  private generateTimelineAdjustmentRecommendations(
    tasks: TaskData[],
    currentState: WorkloadState
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    if (currentState.utilizationRate > 100) {
      const urgentTasks = tasks.filter(task => task.priority === 'urgent').length;
      const totalTasks = tasks.length;

      recommendations.push({
        type: 'timeline_adjustment',
        priority: urgentTasks > totalTasks * 0.3 ? 'critical' : 'high',
        description: `Current workload exceeds capacity by ${(currentState.utilizationRate - 100).toFixed(1)}%. Consider extending timeline`,
        affectedMembers: [],
        affectedTasks: tasks.map(t => t.id),
        expectedImpact: {
          balanceImprovement: 30,
          efficiencyGain: 20,
          riskReduction: 40
        },
        implementationEffort: 'low',
        timeline: 'Immediate'
      });
    }

    return recommendations;
  }

  private generateResourceAdditionRecommendations(
    currentState: WorkloadState
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    if (currentState.utilizationRate > 110) {
      recommendations.push({
        type: 'resource_addition',
        priority: 'critical',
        description: 'Team is significantly over-capacity. Consider adding team members',
        affectedMembers: [],
        affectedTasks: [],
        expectedImpact: {
          balanceImprovement: 40,
          efficiencyGain: 30,
          riskReduction: 50
        },
        implementationEffort: 'high',
        timeline: '2-4 weeks'
      });
    }

    return recommendations;
  }

  private async createOptimizedState(
    teamMembers: TeamMember[],
    tasks: TaskData[],
    recommendations: OptimizationRecommendation[]
  ): Promise<WorkloadState> {
    // Apply task reassignment recommendations
    const optimizedTasks = [...tasks];
    const reassignmentRecs = recommendations.filter(r => r.type === 'task_reassignment');
    
    for (const rec of reassignmentRecs) {
      // This would apply the actual reassignments
      // For now, we'll simulate the optimization
    }

    // Recalculate workload state with optimizations applied
    return await this.analyzeCurrentWorkload(teamMembers, optimizedTasks);
  }

  private calculateExpectedImprovements(
    currentState: WorkloadState,
    optimizedState: WorkloadState
  ): ExpectedImprovements {
    return {
      balanceImprovement: Math.max(0, optimizedState.balanceScore - currentState.balanceScore),
      efficiencyGain: Math.max(0, (optimizedState.utilizationRate - currentState.utilizationRate) * 0.5),
      deliveryTimeReduction: Math.max(0, (currentState.utilizationRate - optimizedState.utilizationRate) * 0.1),
      riskReduction: Math.max(0, (currentState.utilizationRate > 100 ? 30 : 0) - (optimizedState.utilizationRate > 100 ? 30 : 0)),
      memberSatisfaction: Math.max(0, optimizedState.balanceScore - currentState.balanceScore) * 0.5
    };
  }

  private createImplementationPlan(recommendations: OptimizationRecommendation[]): ImplementationStep[] {
    const steps: ImplementationStep[] = [];
    let stepNumber = 1;

    for (const rec of recommendations.slice(0, 5)) { // Top 5 recommendations
      if (rec.type === 'task_reassignment') {
        steps.push({
          step: stepNumber++,
          action: `Review and approve task reassignments: ${rec.description}`,
          assignee: 'team-lead',
          estimatedTime: 2,
          dependencies: [],
          status: 'pending'
        });

        steps.push({
          step: stepNumber++,
          action: 'Communicate changes to affected team members',
          assignee: 'team-lead',
          estimatedTime: 1,
          dependencies: [stepNumber - 2],
          status: 'pending'
        });

        steps.push({
          step: stepNumber++,
          action: 'Update task assignments in project management system',
          assignee: 'project-manager',
          estimatedTime: 0.5,
          dependencies: [stepNumber - 2],
          status: 'pending'
        });
      }
    }

    return steps;
  }

  // Helper methods
  private extractRequiredSkills(task: TaskData): string[] {
    const skillKeywords = [
      'frontend', 'backend', 'database', 'devops', 'security', 'mobile',
      'react', 'angular', 'vue', 'node', 'python', 'java', 'kubernetes'
    ];

    const text = (task.title + ' ' + task.description + ' ' + task.tags.join(' ')).toLowerCase();
    return skillKeywords.filter(skill => text.includes(skill));
  }

  private findBestAssignee(
    task: TaskAssignment,
    availableMembers: TeamMemberWorkload[],
    memberMap: Map<string, TeamMember>
  ): TeamMemberWorkload | null {
    let bestScore = -1;
    let bestAssignee: TeamMemberWorkload | null = null;

    for (const memberWorkload of availableMembers) {
      const member = memberMap.get(memberWorkload.memberId);
      if (!member) continue;

      let score = 0;

      // Skill match score
      const matchingSkills = task.requiredSkills.filter(skill => member.skills.includes(skill));
      score += matchingSkills.length * 10;

      // Capacity score (prefer members with more available capacity)
      score += (100 - memberWorkload.utilizationRate) * 0.1;

      // Efficiency score
      score += member.efficiency * 5;

      // Complexity preference score
      const complexityFit = Math.abs(task.complexity - ((member.preferences.preferredComplexity.min + member.preferences.preferredComplexity.max) / 2));
      score += Math.max(0, 5 - complexityFit);

      if (score > bestScore) {
        bestScore = score;
        bestAssignee = memberWorkload;
      }
    }

    return bestAssignee;
  }

  private calculateWorkloadBalance(assignments: TaskAssignment[]): number {
    if (assignments.length === 0) return 100;

    // Calculate balance based on task complexity distribution
    const complexities = assignments.map(a => a.complexity);
    const avgComplexity = complexities.reduce((sum, c) => sum + c, 0) / complexities.length;
    const variance = complexities.reduce((sum, c) => sum + Math.pow(c - avgComplexity, 2), 0) / complexities.length;
    
    // Lower variance = better balance
    return Math.max(0, 100 - variance * 10);
  }

  private calculateTeamBalanceScore(memberWorkloads: TeamMemberWorkload[]): number {
    if (memberWorkloads.length === 0) return 0;

    const utilizations = memberWorkloads.map(m => m.utilizationRate);
    const avgUtilization = utilizations.reduce((sum, u) => sum + u, 0) / utilizations.length;
    const variance = utilizations.reduce((sum, u) => sum + Math.pow(u - avgUtilization, 2), 0) / utilizations.length;
    
    // Lower variance = better balance, ideal utilization around 80%
    const balanceScore = Math.max(0, 100 - variance);
    const utilizationScore = Math.max(0, 100 - Math.abs(avgUtilization - 80));
    
    return (balanceScore + utilizationScore) / 2;
  }

  private async calculatePerformanceMetrics(memberId: string): Promise<PerformanceMetrics> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const completedTasks = await this.tasksCollection.find({
      assignee: memberId,
      status: 'done',
      completedAt: { $gte: thirtyDaysAgo }
    }).toArray();

    const onTimeTasks = completedTasks.filter(task => {
      if (!task.actualHours || !task.estimatedHours) return false;
      return task.actualHours <= task.estimatedHours * 1.2; // Within 20% of estimate
    });

    const completionRate = completedTasks.length > 0 ? (onTimeTasks.length / completedTasks.length) * 100 : 80;

    return {
      completionRate,
      averageQuality: 8.5, // Would be calculated from code reviews, etc.
      velocityTrend: 'stable',
      skillGrowth: {},
      collaborationScore: 7.5
    };
  }

  private async calculateCurrentWorkload(memberId: string): Promise<number> {
    const activeTasks = await this.tasksCollection.find({
      assignee: memberId,
      status: { $in: ['todo', 'in_progress'] }
    }).toArray();

    return activeTasks.reduce((sum, task) => sum + task.estimatedHours, 0);
  }

  // Public API methods
  async getWorkloadOptimization(teamId: string): Promise<WorkloadOptimization> {
    return await this.optimizeWorkload(teamId);
  }

  async getTeamUtilization(teamId: string): Promise<{ utilizationRate: number; balanceScore: number }> {
    const teamMembers = await this.getTeamMembers(teamId);
    const activeTasks = await this.getActiveTasks(teamId);
    const currentState = await this.analyzeCurrentWorkload(teamMembers, activeTasks);
    
    return {
      utilizationRate: currentState.utilizationRate,
      balanceScore: currentState.balanceScore
    };
  }

  async suggestTaskReassignment(taskId: string): Promise<{ suggestedAssignee: string; confidence: number; reason: string } | null> {
    const task = await this.tasksCollection.findOne({ id: taskId });
    if (!task) return null;

    const teamMembers = await this.getTeamMembers(task.teamId);
    const activeTasks = await this.getActiveTasks(task.teamId);
    const currentState = await this.analyzeCurrentWorkload(teamMembers, activeTasks);

    const underloaded = currentState.teamMembers.filter(m => m.utilizationRate < 80);
    const memberMap = new Map(teamMembers.map(m => [m.id, m]));

    const taskAssignment: TaskAssignment = {
      taskId: task.id,
      title: task.title,
      estimatedHours: task.estimatedHours,
      priority: task.priority,
      complexity: task.complexity,
      requiredSkills: this.extractRequiredSkills(task),
      currentAssignee: task.assignee,
      confidenceScore: 0.8
    };

    const bestAssignee = this.findBestAssignee(taskAssignment, underloaded, memberMap);
    
    if (bestAssignee && bestAssignee.memberId !== task.assignee) {
      const member = memberMap.get(bestAssignee.memberId)!;
      return {
        suggestedAssignee: bestAssignee.memberId,
        confidence: 0.8,
        reason: `Better skill match and lower utilization (${bestAssignee.utilizationRate.toFixed(1)}% vs current assignee)`
      };
    }

    return null;
  }
}