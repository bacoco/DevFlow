import { MongoClient, Db, Collection } from 'mongodb';
import { Logger } from '../utils/logger';
import { TaskData } from './task-completion-predictor';

export interface DependencyGraph {
  nodes: TaskNode[];
  edges: TaskEdge[];
  criticalPath: string[];
  bottlenecks: Bottleneck[];
}

export interface TaskNode {
  id: string;
  title: string;
  assignee: string;
  estimatedHours: number;
  actualHours?: number;
  status: TaskData['status'];
  priority: TaskData['priority'];
  complexity: number;
  startDate?: Date;
  endDate?: Date;
  slack: number; // Available slack time
  isCritical: boolean;
  isBottleneck: boolean;
}

export interface TaskEdge {
  from: string;
  to: string;
  type: 'dependency' | 'resource' | 'temporal';
  weight: number;
}

export interface Bottleneck {
  id: string;
  type: 'resource' | 'dependency' | 'capacity' | 'skill' | 'external';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedTasks: string[];
  estimatedDelay: number; // Hours
  suggestedActions: string[];
  confidence: number;
  detectedAt: Date;
}

export interface BottleneckAnalysis {
  projectId: string;
  teamId: string;
  analysisDate: Date;
  bottlenecks: Bottleneck[];
  criticalPath: string[];
  riskScore: number; // 0-100
  recommendations: Recommendation[];
  metrics: BottleneckMetrics;
}

export interface Recommendation {
  type: 'resource_reallocation' | 'task_reordering' | 'dependency_removal' | 'skill_development' | 'external_escalation';
  priority: 'low' | 'medium' | 'high';
  description: string;
  estimatedImpact: number; // Hours saved
  effort: 'low' | 'medium' | 'high';
  affectedTasks: string[];
}

export interface BottleneckMetrics {
  totalTasks: number;
  criticalPathLength: number;
  averageSlack: number;
  resourceUtilization: Record<string, number>;
  dependencyComplexity: number;
  riskFactors: string[];
}

export class BottleneckDetector {
  private db: Db;
  private tasksCollection: Collection<TaskData>;
  private usersCollection: Collection<any>;
  private projectsCollection: Collection<any>;
  private logger: Logger;
  private alertService: any; // Would be injected

  constructor(
    mongoClient: MongoClient,
    logger: Logger,
    alertService?: any
  ) {
    this.db = mongoClient.db('devflow_tasks');
    this.tasksCollection = this.db.collection<TaskData>('tasks');
    this.usersCollection = this.db.collection('users');
    this.projectsCollection = this.db.collection('projects');
    this.logger = logger;
    this.alertService = alertService;
  }

  async analyzeBottlenecks(projectId: string, teamId?: string): Promise<BottleneckAnalysis> {
    try {
      this.logger.info(`Starting bottleneck analysis for project ${projectId}`);

      // Get project tasks
      const tasks = await this.getProjectTasks(projectId, teamId);
      
      if (tasks.length === 0) {
        throw new Error(`No tasks found for project ${projectId}`);
      }

      // Build dependency graph
      const dependencyGraph = await this.buildDependencyGraph(tasks);
      
      // Calculate critical path
      const criticalPath = this.calculateCriticalPath(dependencyGraph);
      
      // Detect bottlenecks
      const bottlenecks = await this.detectBottlenecks(dependencyGraph, tasks);
      
      // Calculate risk score
      const riskScore = this.calculateRiskScore(bottlenecks, criticalPath.length, tasks.length);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(bottlenecks, dependencyGraph);
      
      // Calculate metrics
      const metrics = this.calculateMetrics(dependencyGraph, tasks);

      const analysis: BottleneckAnalysis = {
        projectId,
        teamId: teamId || 'all',
        analysisDate: new Date(),
        bottlenecks,
        criticalPath,
        riskScore,
        recommendations,
        metrics
      };

      // Send alerts for critical bottlenecks
      await this.sendBottleneckAlerts(analysis);

      this.logger.info(`Bottleneck analysis completed. Found ${bottlenecks.length} bottlenecks with risk score ${riskScore}`);
      
      return analysis;
    } catch (error) {
      this.logger.error(`Failed to analyze bottlenecks for project ${projectId}:`, error);
      throw error;
    }
  }

  private async getProjectTasks(projectId: string, teamId?: string): Promise<TaskData[]> {
    const query: any = { 
      projectId,
      status: { $in: ['todo', 'in_progress', 'review'] } // Active tasks only
    };
    
    if (teamId) {
      query.teamId = teamId;
    }

    return await this.tasksCollection.find(query).toArray();
  }

  private async buildDependencyGraph(tasks: TaskData[]): Promise<DependencyGraph> {
    const nodes: TaskNode[] = [];
    const edges: TaskEdge[] = [];
    const taskMap = new Map(tasks.map(task => [task.id, task]));

    // Create nodes
    for (const task of tasks) {
      const node: TaskNode = {
        id: task.id,
        title: task.title,
        assignee: task.assignee,
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours,
        status: task.status,
        priority: task.priority,
        complexity: task.complexity,
        startDate: task.startedAt,
        endDate: task.completedAt,
        slack: 0, // Will be calculated
        isCritical: false, // Will be determined
        isBottleneck: false // Will be determined
      };
      nodes.push(node);
    }

    // Create dependency edges
    for (const task of tasks) {
      for (const depId of task.dependencies) {
        if (taskMap.has(depId)) {
          edges.push({
            from: depId,
            to: task.id,
            type: 'dependency',
            weight: taskMap.get(depId)!.estimatedHours
          });
        }
      }
    }

    // Add resource constraint edges (same assignee)
    const assigneeGroups = this.groupTasksByAssignee(tasks);
    for (const [assignee, assigneeTasks] of assigneeGroups) {
      // Sort by priority and creation date
      const sortedTasks = assigneeTasks.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      // Create resource constraint edges
      for (let i = 0; i < sortedTasks.length - 1; i++) {
        edges.push({
          from: sortedTasks[i].id,
          to: sortedTasks[i + 1].id,
          type: 'resource',
          weight: sortedTasks[i].estimatedHours
        });
      }
    }

    return {
      nodes,
      edges,
      criticalPath: [], // Will be calculated
      bottlenecks: [] // Will be calculated
    };
  }

  private groupTasksByAssignee(tasks: TaskData[]): Map<string, TaskData[]> {
    const groups = new Map<string, TaskData[]>();
    
    for (const task of tasks) {
      if (!groups.has(task.assignee)) {
        groups.set(task.assignee, []);
      }
      groups.get(task.assignee)!.push(task);
    }
    
    return groups;
  }

  private calculateCriticalPath(graph: DependencyGraph): string[] {
    // Implement Critical Path Method (CPM)
    const nodeMap = new Map(graph.nodes.map(node => [node.id, node]));
    const incomingEdges = new Map<string, TaskEdge[]>();
    const outgoingEdges = new Map<string, TaskEdge[]>();

    // Build edge maps
    for (const edge of graph.edges) {
      if (!incomingEdges.has(edge.to)) incomingEdges.set(edge.to, []);
      if (!outgoingEdges.has(edge.from)) outgoingEdges.set(edge.from, []);
      
      incomingEdges.get(edge.to)!.push(edge);
      outgoingEdges.get(edge.from)!.push(edge);
    }

    // Forward pass - calculate earliest start times
    const earliestStart = new Map<string, number>();
    const earliestFinish = new Map<string, number>();
    
    const processedNodes = new Set<string>();
    const queue = graph.nodes.filter(node => !incomingEdges.has(node.id));

    // Initialize start nodes
    for (const node of queue) {
      earliestStart.set(node.id, 0);
      earliestFinish.set(node.id, node.estimatedHours);
    }

    while (queue.length > 0) {
      const currentNode = queue.shift()!;
      if (processedNodes.has(currentNode.id)) continue;
      
      processedNodes.add(currentNode.id);
      
      // Process outgoing edges
      const outgoing = outgoingEdges.get(currentNode.id) || [];
      for (const edge of outgoing) {
        const targetNode = nodeMap.get(edge.to)!;
        const newEarliestStart = earliestFinish.get(currentNode.id)!;
        
        if (!earliestStart.has(edge.to) || newEarliestStart > earliestStart.get(edge.to)!) {
          earliestStart.set(edge.to, newEarliestStart);
          earliestFinish.set(edge.to, newEarliestStart + targetNode.estimatedHours);
        }
        
        // Check if all dependencies are processed
        const incoming = incomingEdges.get(edge.to) || [];
        const allDepsProcessed = incoming.every(inEdge => processedNodes.has(inEdge.from));
        
        if (allDepsProcessed && !processedNodes.has(edge.to)) {
          queue.push(targetNode);
        }
      }
    }

    // Backward pass - calculate latest start times
    const latestStart = new Map<string, number>();
    const latestFinish = new Map<string, number>();
    
    // Find project end time
    const projectEndTime = Math.max(...Array.from(earliestFinish.values()));
    
    // Initialize end nodes
    const endNodes = graph.nodes.filter(node => !outgoingEdges.has(node.id));
    for (const node of endNodes) {
      latestFinish.set(node.id, projectEndTime);
      latestStart.set(node.id, projectEndTime - node.estimatedHours);
    }

    // Backward pass
    const backwardQueue = [...endNodes];
    const backwardProcessed = new Set<string>();

    while (backwardQueue.length > 0) {
      const currentNode = backwardQueue.shift()!;
      if (backwardProcessed.has(currentNode.id)) continue;
      
      backwardProcessed.add(currentNode.id);
      
      // Process incoming edges
      const incoming = incomingEdges.get(currentNode.id) || [];
      for (const edge of incoming) {
        const sourceNode = nodeMap.get(edge.from)!;
        const newLatestFinish = latestStart.get(currentNode.id)!;
        
        if (!latestFinish.has(edge.from) || newLatestFinish < latestFinish.get(edge.from)!) {
          latestFinish.set(edge.from, newLatestFinish);
          latestStart.set(edge.from, newLatestFinish - sourceNode.estimatedHours);
        }
        
        if (!backwardProcessed.has(edge.from)) {
          backwardQueue.push(sourceNode);
        }
      }
    }

    // Calculate slack and identify critical path
    const criticalPath: string[] = [];
    
    for (const node of graph.nodes) {
      const slack = (latestStart.get(node.id) || 0) - (earliestStart.get(node.id) || 0);
      node.slack = slack;
      node.isCritical = slack === 0;
      
      if (node.isCritical) {
        criticalPath.push(node.id);
      }
    }

    // Sort critical path by earliest start time
    criticalPath.sort((a, b) => 
      (earliestStart.get(a) || 0) - (earliestStart.get(b) || 0)
    );

    return criticalPath;
  }

  private async detectBottlenecks(graph: DependencyGraph, tasks: TaskData[]): Promise<Bottleneck[]> {
    const bottlenecks: Bottleneck[] = [];

    // Resource bottlenecks
    bottlenecks.push(...await this.detectResourceBottlenecks(tasks));
    
    // Dependency bottlenecks
    bottlenecks.push(...this.detectDependencyBottlenecks(graph));
    
    // Capacity bottlenecks
    bottlenecks.push(...await this.detectCapacityBottlenecks(tasks));
    
    // Skill bottlenecks
    bottlenecks.push(...await this.detectSkillBottlenecks(tasks));
    
    // External dependency bottlenecks
    bottlenecks.push(...await this.detectExternalBottlenecks(tasks));

    // Mark bottleneck nodes in graph
    for (const bottleneck of bottlenecks) {
      for (const taskId of bottleneck.affectedTasks) {
        const node = graph.nodes.find(n => n.id === taskId);
        if (node) node.isBottleneck = true;
      }
    }

    return bottlenecks.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  private async detectResourceBottlenecks(tasks: TaskData[]): Promise<Bottleneck[]> {
    const bottlenecks: Bottleneck[] = [];
    const assigneeWorkload = new Map<string, { tasks: TaskData[], totalHours: number }>();

    // Calculate workload per assignee
    for (const task of tasks) {
      if (!assigneeWorkload.has(task.assignee)) {
        assigneeWorkload.set(task.assignee, { tasks: [], totalHours: 0 });
      }
      const workload = assigneeWorkload.get(task.assignee)!;
      workload.tasks.push(task);
      workload.totalHours += task.estimatedHours;
    }

    // Detect overloaded assignees
    for (const [assignee, workload] of assigneeWorkload) {
      if (workload.totalHours > 80) { // More than 2 weeks of work
        const severity = workload.totalHours > 160 ? 'critical' : 
                        workload.totalHours > 120 ? 'high' : 'medium';
        
        bottlenecks.push({
          id: `resource-${assignee}`,
          type: 'resource',
          severity,
          description: `${assignee} is overloaded with ${workload.totalHours} hours of work`,
          affectedTasks: workload.tasks.map(t => t.id),
          estimatedDelay: Math.max(0, workload.totalHours - 80) * 0.2, // 20% delay factor
          suggestedActions: [
            'Redistribute tasks to other team members',
            'Prioritize critical tasks',
            'Consider extending timeline',
            'Add additional resources'
          ],
          confidence: 0.9,
          detectedAt: new Date()
        });
      }
    }

    return bottlenecks;
  }

  private detectDependencyBottlenecks(graph: DependencyGraph): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    const dependencyCount = new Map<string, number>();

    // Count incoming dependencies for each task
    for (const edge of graph.edges) {
      if (edge.type === 'dependency') {
        dependencyCount.set(edge.to, (dependencyCount.get(edge.to) || 0) + 1);
      }
    }

    // Detect tasks with too many dependencies
    for (const [taskId, count] of dependencyCount) {
      if (count > 5) {
        const node = graph.nodes.find(n => n.id === taskId);
        if (!node) continue;

        const severity = count > 10 ? 'critical' : count > 7 ? 'high' : 'medium';
        
        bottlenecks.push({
          id: `dependency-${taskId}`,
          type: 'dependency',
          severity,
          description: `Task "${node.title}" has ${count} dependencies, creating a bottleneck`,
          affectedTasks: [taskId],
          estimatedDelay: count * 0.5, // Each dependency adds potential delay
          suggestedActions: [
            'Review and remove unnecessary dependencies',
            'Parallelize independent work streams',
            'Break down complex dependencies',
            'Create intermediate deliverables'
          ],
          confidence: 0.8,
          detectedAt: new Date()
        });
      }
    }

    return bottlenecks;
  }

  private async detectCapacityBottlenecks(tasks: TaskData[]): Promise<Bottleneck[]> {
    const bottlenecks: Bottleneck[] = [];
    
    // Get team capacity information
    const teams = new Set(tasks.map(t => t.teamId));
    
    for (const teamId of teams) {
      const teamTasks = tasks.filter(t => t.teamId === teamId);
      const totalEstimatedHours = teamTasks.reduce((sum, t) => sum + t.estimatedHours, 0);
      
      // Get team size and capacity
      const teamMembers = new Set(teamTasks.map(t => t.assignee));
      const teamSize = teamMembers.size;
      const weeklyCapacity = teamSize * 40; // 40 hours per person per week
      const weeksNeeded = totalEstimatedHours / weeklyCapacity;
      
      if (weeksNeeded > 8) { // More than 2 months of work
        const severity = weeksNeeded > 16 ? 'critical' : weeksNeeded > 12 ? 'high' : 'medium';
        
        bottlenecks.push({
          id: `capacity-${teamId}`,
          type: 'capacity',
          severity,
          description: `Team ${teamId} has ${weeksNeeded.toFixed(1)} weeks of work with current capacity`,
          affectedTasks: teamTasks.map(t => t.id),
          estimatedDelay: Math.max(0, (weeksNeeded - 8) * weeklyCapacity * 0.1),
          suggestedActions: [
            'Add team members',
            'Reduce scope',
            'Extend timeline',
            'Optimize processes'
          ],
          confidence: 0.85,
          detectedAt: new Date()
        });
      }
    }

    return bottlenecks;
  }

  private async detectSkillBottlenecks(tasks: TaskData[]): Promise<Bottleneck[]> {
    const bottlenecks: Bottleneck[] = [];
    
    // Analyze skill requirements vs team skills
    const skillRequirements = new Map<string, TaskData[]>();
    
    // Extract skills from task tags and descriptions
    for (const task of tasks) {
      const skills = this.extractSkillsFromTask(task);
      for (const skill of skills) {
        if (!skillRequirements.has(skill)) {
          skillRequirements.set(skill, []);
        }
        skillRequirements.get(skill)!.push(task);
      }
    }

    // Check for skill bottlenecks
    for (const [skill, skillTasks] of skillRequirements) {
      const assignees = new Set(skillTasks.map(t => t.assignee));
      const totalHours = skillTasks.reduce((sum, t) => sum + t.estimatedHours, 0);
      
      if (assignees.size === 1 && totalHours > 40) {
        // Single person with specialized skill
        const assignee = Array.from(assignees)[0];
        
        bottlenecks.push({
          id: `skill-${skill}-${assignee}`,
          type: 'skill',
          severity: totalHours > 80 ? 'high' : 'medium',
          description: `${assignee} is the only person with ${skill} skills (${totalHours} hours of work)`,
          affectedTasks: skillTasks.map(t => t.id),
          estimatedDelay: totalHours * 0.15, // Risk of delay if person unavailable
          suggestedActions: [
            'Cross-train other team members',
            'Document knowledge and processes',
            'Pair programming sessions',
            'Consider external expertise'
          ],
          confidence: 0.7,
          detectedAt: new Date()
        });
      }
    }

    return bottlenecks;
  }

  private extractSkillsFromTask(task: TaskData): string[] {
    const skills: string[] = [];
    const skillKeywords = [
      'frontend', 'backend', 'database', 'devops', 'security', 'mobile',
      'react', 'angular', 'vue', 'node', 'python', 'java', 'kubernetes',
      'aws', 'azure', 'docker', 'microservices', 'api', 'ml', 'ai'
    ];

    const text = (task.title + ' ' + task.description + ' ' + task.tags.join(' ')).toLowerCase();
    
    for (const keyword of skillKeywords) {
      if (text.includes(keyword)) {
        skills.push(keyword);
      }
    }

    return skills;
  }

  private async detectExternalBottlenecks(tasks: TaskData[]): Promise<Bottleneck[]> {
    const bottlenecks: Bottleneck[] = [];
    
    // Look for external dependencies in task descriptions and tags
    const externalKeywords = [
      'external', 'third-party', 'vendor', 'client', 'approval', 'legal',
      'compliance', 'review', 'procurement', 'integration'
    ];

    for (const task of tasks) {
      const text = (task.title + ' ' + task.description + ' ' + task.tags.join(' ')).toLowerCase();
      const hasExternalDep = externalKeywords.some(keyword => text.includes(keyword));
      
      if (hasExternalDep && task.complexity > 6) {
        bottlenecks.push({
          id: `external-${task.id}`,
          type: 'external',
          severity: 'medium',
          description: `Task "${task.title}" depends on external factors`,
          affectedTasks: [task.id],
          estimatedDelay: task.estimatedHours * 0.3, // 30% delay risk
          suggestedActions: [
            'Identify and engage external stakeholders early',
            'Create contingency plans',
            'Parallelize independent work',
            'Set up regular check-ins'
          ],
          confidence: 0.6,
          detectedAt: new Date()
        });
      }
    }

    return bottlenecks;
  }

  private calculateRiskScore(bottlenecks: Bottleneck[], criticalPathLength: number, totalTasks: number): number {
    let riskScore = 0;
    
    // Base risk from bottlenecks
    for (const bottleneck of bottlenecks) {
      const severityWeight = { low: 1, medium: 2, high: 3, critical: 4 };
      riskScore += severityWeight[bottleneck.severity] * bottleneck.confidence * 10;
    }
    
    // Risk from critical path length
    const criticalPathRisk = (criticalPathLength / totalTasks) * 30;
    riskScore += criticalPathRisk;
    
    // Risk from project complexity
    const complexityRisk = Math.min(20, totalTasks / 10);
    riskScore += complexityRisk;
    
    return Math.min(100, Math.max(0, riskScore));
  }

  private async generateRecommendations(bottlenecks: Bottleneck[], graph: DependencyGraph): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    
    // Resource reallocation recommendations
    const resourceBottlenecks = bottlenecks.filter(b => b.type === 'resource');
    if (resourceBottlenecks.length > 0) {
      recommendations.push({
        type: 'resource_reallocation',
        priority: 'high',
        description: 'Redistribute tasks from overloaded team members to balance workload',
        estimatedImpact: resourceBottlenecks.reduce((sum, b) => sum + b.estimatedDelay, 0) * 0.7,
        effort: 'medium',
        affectedTasks: resourceBottlenecks.flatMap(b => b.affectedTasks)
      });
    }

    // Task reordering recommendations
    const dependencyBottlenecks = bottlenecks.filter(b => b.type === 'dependency');
    if (dependencyBottlenecks.length > 0) {
      recommendations.push({
        type: 'task_reordering',
        priority: 'medium',
        description: 'Reorder tasks to reduce dependency chains and enable parallel work',
        estimatedImpact: dependencyBottlenecks.reduce((sum, b) => sum + b.estimatedDelay, 0) * 0.5,
        effort: 'low',
        affectedTasks: dependencyBottlenecks.flatMap(b => b.affectedTasks)
      });
    }

    // Skill development recommendations
    const skillBottlenecks = bottlenecks.filter(b => b.type === 'skill');
    if (skillBottlenecks.length > 0) {
      recommendations.push({
        type: 'skill_development',
        priority: 'medium',
        description: 'Cross-train team members to reduce single points of failure',
        estimatedImpact: skillBottlenecks.reduce((sum, b) => sum + b.estimatedDelay, 0) * 0.8,
        effort: 'high',
        affectedTasks: skillBottlenecks.flatMap(b => b.affectedTasks)
      });
    }

    // External escalation recommendations
    const externalBottlenecks = bottlenecks.filter(b => b.type === 'external');
    if (externalBottlenecks.length > 0) {
      recommendations.push({
        type: 'external_escalation',
        priority: 'high',
        description: 'Proactively engage external stakeholders to prevent delays',
        estimatedImpact: externalBottlenecks.reduce((sum, b) => sum + b.estimatedDelay, 0) * 0.6,
        effort: 'medium',
        affectedTasks: externalBottlenecks.flatMap(b => b.affectedTasks)
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private calculateMetrics(graph: DependencyGraph, tasks: TaskData[]): BottleneckMetrics {
    const criticalTasks = graph.nodes.filter(n => n.isCritical);
    const totalSlack = graph.nodes.reduce((sum, n) => sum + n.slack, 0);
    
    // Calculate resource utilization
    const assigneeHours = new Map<string, number>();
    for (const task of tasks) {
      assigneeHours.set(task.assignee, (assigneeHours.get(task.assignee) || 0) + task.estimatedHours);
    }
    
    const resourceUtilization: Record<string, number> = {};
    for (const [assignee, hours] of assigneeHours) {
      resourceUtilization[assignee] = Math.min(100, (hours / 40) * 100); // Assuming 40 hours per week capacity
    }

    // Calculate dependency complexity
    const avgDependencies = tasks.reduce((sum, t) => sum + t.dependencies.length, 0) / tasks.length;
    const dependencyComplexity = Math.min(10, avgDependencies * 2);

    // Identify risk factors
    const riskFactors: string[] = [];
    if (criticalTasks.length / tasks.length > 0.3) riskFactors.push('High critical path ratio');
    if (totalSlack / tasks.length < 8) riskFactors.push('Low average slack');
    if (Object.values(resourceUtilization).some(util => util > 90)) riskFactors.push('Resource overutilization');
    if (dependencyComplexity > 6) riskFactors.push('High dependency complexity');

    return {
      totalTasks: tasks.length,
      criticalPathLength: criticalTasks.length,
      averageSlack: totalSlack / tasks.length,
      resourceUtilization,
      dependencyComplexity,
      riskFactors
    };
  }

  private async sendBottleneckAlerts(analysis: BottleneckAnalysis): Promise<void> {
    if (!this.alertService) return;

    const criticalBottlenecks = analysis.bottlenecks.filter(b => 
      b.severity === 'critical' || b.severity === 'high'
    );

    if (criticalBottlenecks.length > 0) {
      try {
        await this.alertService.sendAlert({
          type: 'bottleneck_detected',
          severity: 'high',
          title: `${criticalBottlenecks.length} Critical Bottlenecks Detected`,
          description: `Project ${analysis.projectId} has critical bottlenecks that may cause delays`,
          data: {
            projectId: analysis.projectId,
            riskScore: analysis.riskScore,
            bottlenecks: criticalBottlenecks.map(b => ({
              type: b.type,
              severity: b.severity,
              description: b.description,
              estimatedDelay: b.estimatedDelay
            }))
          },
          recipients: ['project-managers', 'team-leads']
        });
      } catch (error) {
        this.logger.error('Failed to send bottleneck alert:', error);
      }
    }
  }

  // Public API methods
  async getBottleneckAnalysis(projectId: string, teamId?: string): Promise<BottleneckAnalysis> {
    return await this.analyzeBottlenecks(projectId, teamId);
  }

  async getProjectRiskScore(projectId: string): Promise<number> {
    const analysis = await this.analyzeBottlenecks(projectId);
    return analysis.riskScore;
  }

  async getBottleneckRecommendations(projectId: string): Promise<Recommendation[]> {
    const analysis = await this.analyzeBottlenecks(projectId);
    return analysis.recommendations;
  }

  async scheduleBottleneckAnalysis(projectId: string, intervalHours: number = 24): Promise<void> {
    // This would typically use a job scheduler like node-cron
    this.logger.info(`Scheduled bottleneck analysis for project ${projectId} every ${intervalHours} hours`);
    
    setInterval(async () => {
      try {
        await this.analyzeBottlenecks(projectId);
      } catch (error) {
        this.logger.error(`Scheduled bottleneck analysis failed for project ${projectId}:`, error);
      }
    }, intervalHours * 60 * 60 * 1000);
  }
}