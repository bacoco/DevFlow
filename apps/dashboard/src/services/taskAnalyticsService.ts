/**
 * Task Analytics Service
 * Provides analytics calculations and reporting for task management
 */

import {
  TaskAnalytics,
  TaskMetrics,
  TaskTrends,
  TaskInsight,
  TeamPerformanceMetrics,
  ProductivityReport,
  BurndownData,
  VelocityData,
  CycleTimeData,
  AnalyticsFilters,
  TimeRange,
  ExportFormat,
  ReportType,
  TrendData,
} from '../types/analytics';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: string;
  dueDate: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  startedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
}

class TaskAnalyticsService {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  /**
   * Calculate task metrics for a given time range and filters
   */
  async calculateTaskMetrics(filters: AnalyticsFilters): Promise<TaskMetrics> {
    try {
      // In a real implementation, this would fetch from API
      const tasks = await this.fetchTasks(filters);
      
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
      const todoTasks = tasks.filter(t => t.status === 'todo').length;
      const overdueTasks = tasks.filter(t => 
        new Date(t.dueDate) < new Date() && t.status !== 'completed'
      ).length;

      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      
      // Calculate average completion time
      const completedTasksWithTime = tasks.filter(t => 
        t.status === 'completed' && t.completedAt && t.createdAt
      );
      
      const averageCompletionTime = completedTasksWithTime.length > 0
        ? completedTasksWithTime.reduce((sum, task) => {
            const created = new Date(task.createdAt).getTime();
            const completed = new Date(task.completedAt!).getTime();
            return sum + (completed - created) / (1000 * 60 * 60); // hours
          }, 0) / completedTasksWithTime.length
        : 0;

      // Calculate velocity (tasks per day)
      const timeRangeInDays = this.getTimeRangeInDays(filters.timeRange || 'last30days');
      const velocity = timeRangeInDays > 0 ? completedTasks / timeRangeInDays : 0;

      // Calculate burndown rate
      const totalEstimatedHours = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
      const completedEstimatedHours = tasks
        .filter(t => t.status === 'completed')
        .reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
      
      const burndownRate = totalEstimatedHours > 0 
        ? (completedEstimatedHours / totalEstimatedHours) * 100 
        : 0;

      // Calculate cycle time and lead time
      const cycleTime = this.calculateAverageCycleTime(tasks);
      const leadTime = averageCompletionTime; // Same as completion time for now

      return {
        totalTasks,
        completedTasks,
        inProgressTasks,
        todoTasks,
        overdueTasks,
        completionRate,
        averageCompletionTime,
        velocity,
        burndownRate,
        cycleTime,
        leadTime,
      };
    } catch (error) {
      console.error('Error calculating task metrics:', error);
      throw error;
    }
  }

  /**
   * Generate task trends data
   */
  async generateTaskTrends(filters: AnalyticsFilters): Promise<TaskTrends> {
    try {
      const tasks = await this.fetchTasks(filters);
      const timeRange = filters.timeRange || 'last30days';
      const dates = this.generateDateRange(timeRange);

      const completion = dates.map(date => ({
        date,
        value: this.getTasksCompletedOnDate(tasks, date),
      }));

      const velocity = dates.map(date => ({
        date,
        value: this.getVelocityForDate(tasks, date),
      }));

      const burndown = this.generateBurndownData(tasks, dates);

      const cycleTime = dates.map(date => ({
        date,
        value: this.getAverageCycleTimeForDate(tasks, date),
      }));

      const workload = dates.map(date => ({
        date,
        value: this.getWorkloadForDate(tasks, date),
      }));

      return {
        completion,
        velocity,
        burndown: burndown.map(b => ({ date: b.date, value: b.actual })),
        cycleTime,
        workload,
      };
    } catch (error) {
      console.error('Error generating task trends:', error);
      throw error;
    }
  }

  /**
   * Generate task insights using analytics data
   */
  async generateTaskInsights(
    metrics: TaskMetrics,
    trends: TaskTrends,
    filters: AnalyticsFilters
  ): Promise<TaskInsight[]> {
    const insights: TaskInsight[] = [];

    // Completion rate insights
    if (metrics.completionRate < 70) {
      insights.push({
        id: 'low-completion-rate',
        type: 'warning',
        title: 'Low Task Completion Rate',
        description: `Your completion rate of ${metrics.completionRate.toFixed(1)}% is below the recommended 70%. Consider reviewing task prioritization and workload distribution.`,
        impact: 'high',
        confidence: 85,
        actionable: true,
        actions: [
          {
            id: 'review-priorities',
            title: 'Review Task Priorities',
            description: 'Reassess task priorities to focus on high-impact items',
            type: 'process',
            effort: 'low',
            impact: 'high',
          },
          {
            id: 'reduce-wip',
            title: 'Reduce Work in Progress',
            description: 'Limit concurrent tasks to improve focus',
            type: 'process',
            effort: 'medium',
            impact: 'high',
          },
        ],
      });
    }

    // Velocity trends
    const recentVelocity = trends.velocity.slice(-7).map(v => v.value);
    const velocityTrend = this.calculateTrend(recentVelocity);
    
    if (velocityTrend < -0.1) {
      insights.push({
        id: 'declining-velocity',
        type: 'warning',
        title: 'Declining Velocity Trend',
        description: 'Your task completion velocity has been declining over the past week. This may indicate increasing complexity or capacity issues.',
        impact: 'medium',
        confidence: 75,
        actionable: true,
        actions: [
          {
            id: 'capacity-review',
            title: 'Review Team Capacity',
            description: 'Assess current workload and team availability',
            type: 'resource',
            effort: 'low',
            impact: 'medium',
          },
        ],
      });
    } else if (velocityTrend > 0.1) {
      insights.push({
        id: 'improving-velocity',
        type: 'achievement',
        title: 'Improving Velocity',
        description: 'Great job! Your task completion velocity has been improving consistently.',
        impact: 'medium',
        confidence: 80,
        actionable: false,
      });
    }

    // Overdue tasks
    if (metrics.overdueTasks > 0) {
      const overduePercentage = (metrics.overdueTasks / metrics.totalTasks) * 100;
      insights.push({
        id: 'overdue-tasks',
        type: overduePercentage > 20 ? 'warning' : 'recommendation',
        title: `${metrics.overdueTasks} Overdue Tasks`,
        description: `You have ${metrics.overdueTasks} overdue tasks (${overduePercentage.toFixed(1)}% of total). Consider reviewing deadlines and priorities.`,
        impact: overduePercentage > 20 ? 'high' : 'medium',
        confidence: 95,
        actionable: true,
        actions: [
          {
            id: 'reschedule-tasks',
            title: 'Reschedule Overdue Tasks',
            description: 'Review and update due dates for overdue tasks',
            type: 'process',
            effort: 'low',
            impact: 'medium',
          },
        ],
      });
    }

    // Cycle time analysis
    if (metrics.cycleTime > 72) { // More than 3 days
      insights.push({
        id: 'long-cycle-time',
        type: 'bottleneck',
        title: 'Long Task Cycle Time',
        description: `Average cycle time of ${(metrics.cycleTime / 24).toFixed(1)} days is longer than optimal. Consider breaking down large tasks.`,
        impact: 'medium',
        confidence: 70,
        actionable: true,
        actions: [
          {
            id: 'break-down-tasks',
            title: 'Break Down Large Tasks',
            description: 'Split complex tasks into smaller, manageable pieces',
            type: 'process',
            effort: 'medium',
            impact: 'high',
          },
        ],
      });
    }

    return insights;
  }

  /**
   * Generate team performance metrics
   */
  async generateTeamPerformanceMetrics(
    teamId: string,
    filters: AnalyticsFilters
  ): Promise<TeamPerformanceMetrics> {
    try {
      // Mock implementation - in real app, fetch team data
      const teamMembers = await this.fetchTeamMembers(teamId);
      const teamTasks = await this.fetchTeamTasks(teamId, filters);

      const members = await Promise.all(
        teamMembers.map(async (member) => {
          const memberTasks = teamTasks.filter(t => t.assignee === member.id);
          const memberFilters = { ...filters, userIds: [member.id] };
          
          const metrics = await this.calculateTaskMetrics(memberFilters);
          const trends = await this.generateTaskTrends(memberFilters);

          return {
            userId: member.id,
            name: member.name,
            email: member.email,
            role: member.role,
            metrics,
            trends,
            productivityScore: this.calculateProductivityScore(metrics),
            focusScore: this.calculateFocusScore(metrics, trends),
            collaborationScore: this.calculateCollaborationScore(memberTasks),
            qualityScore: this.calculateQualityScore(memberTasks),
          };
        })
      );

      const aggregatedMetrics = this.aggregateTeamMetrics(members.map(m => m.metrics));

      return {
        teamId,
        teamName: `Team ${teamId}`,
        timeRange: filters.timeRange || 'last30days',
        members,
        aggregatedMetrics,
        comparisons: {
          previousPeriod: aggregatedMetrics, // Mock - would calculate previous period
          teamAverage: aggregatedMetrics,
        },
        rankings: {
          velocity: this.rankMembers(members, 'velocity'),
          quality: this.rankMembers(members, 'quality'),
          efficiency: this.rankMembers(members, 'efficiency'),
        },
      };
    } catch (error) {
      console.error('Error generating team performance metrics:', error);
      throw error;
    }
  }

  /**
   * Generate productivity report
   */
  async generateProductivityReport(
    type: ReportType,
    filters: AnalyticsFilters,
    options: {
      title?: string;
      description?: string;
      includeCharts?: boolean;
      includeInsights?: boolean;
    } = {}
  ): Promise<ProductivityReport> {
    try {
      const {
        title = `${type} Productivity Report`,
        description,
        includeCharts = true,
        includeInsights = true,
      } = options;

      let data: TaskAnalytics | TeamPerformanceMetrics;
      
      if (type === 'team' && filters.teamIds?.[0]) {
        data = await this.generateTeamPerformanceMetrics(filters.teamIds[0], filters);
      } else {
        const metrics = await this.calculateTaskMetrics(filters);
        const trends = await this.generateTaskTrends(filters);
        const insights = includeInsights 
          ? await this.generateTaskInsights(metrics, trends, filters)
          : [];

        data = {
          id: `analytics-${Date.now()}`,
          userId: filters.userIds?.[0],
          teamId: filters.teamIds?.[0],
          timeRange: filters.timeRange || 'last30days',
          generatedAt: new Date().toISOString(),
          metrics,
          trends,
          insights,
        };
      }

      const charts = includeCharts ? this.generateReportCharts(data, type) : [];
      const insights = 'insights' in data ? data.insights : [];

      return {
        id: `report-${Date.now()}`,
        title,
        description,
        type,
        scope: type === 'team' ? 'team' : 'user',
        timeRange: filters.timeRange || 'last30days',
        filters,
        data,
        charts,
        insights,
        recommendations: this.generateRecommendations(insights),
        createdAt: new Date().toISOString(),
        createdBy: 'current-user', // Would be actual user ID
        format: ['pdf', 'csv'],
      };
    } catch (error) {
      console.error('Error generating productivity report:', error);
      throw error;
    }
  }

  /**
   * Export report in specified format
   */
  async exportReport(
    report: ProductivityReport,
    format: ExportFormat
  ): Promise<Blob> {
    try {
      switch (format) {
        case 'json':
          return new Blob([JSON.stringify(report, null, 2)], {
            type: 'application/json',
          });

        case 'csv':
          const csvData = this.convertReportToCSV(report);
          return new Blob([csvData], { type: 'text/csv' });

        case 'pdf':
          // In a real implementation, this would generate a PDF
          const pdfData = JSON.stringify(report);
          return new Blob([pdfData], { type: 'application/pdf' });

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      throw error;
    }
  }

  // Private helper methods

  private async fetchTasks(filters: AnalyticsFilters): Promise<Task[]> {
    // Mock implementation - in real app, this would fetch from API
    const mockTasks: Task[] = Array.from({ length: 50 }, (_, i) => ({
      id: `task-${i}`,
      title: `Task ${i + 1}`,
      description: `Description for task ${i + 1}`,
      status: ['todo', 'in-progress', 'completed'][Math.floor(Math.random() * 3)] as any,
      priority: ['low', 'medium', 'high', 'urgent'][Math.floor(Math.random() * 4)] as any,
      assignee: `user-${Math.floor(Math.random() * 5) + 1}`,
      dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      tags: [`tag-${Math.floor(Math.random() * 3) + 1}`],
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: Math.random() > 0.5 ? new Date().toISOString() : undefined,
      startedAt: Math.random() > 0.3 ? new Date().toISOString() : undefined,
      estimatedHours: Math.floor(Math.random() * 20) + 1,
      actualHours: Math.floor(Math.random() * 25) + 1,
    }));

    return mockTasks;
  }

  private async fetchTeamMembers(teamId: string) {
    // Mock implementation
    return [
      { id: 'user-1', name: 'Alice Johnson', email: 'alice@example.com', role: 'Developer' },
      { id: 'user-2', name: 'Bob Smith', email: 'bob@example.com', role: 'Developer' },
      { id: 'user-3', name: 'Carol Davis', email: 'carol@example.com', role: 'Lead' },
    ];
  }

  private async fetchTeamTasks(teamId: string, filters: AnalyticsFilters): Promise<Task[]> {
    const allTasks = await this.fetchTasks(filters);
    return allTasks.filter(task => ['user-1', 'user-2', 'user-3'].includes(task.assignee));
  }

  private getTimeRangeInDays(timeRange: TimeRange): number {
    const ranges: Record<TimeRange, number> = {
      today: 1,
      yesterday: 1,
      last7days: 7,
      last30days: 30,
      last90days: 90,
      thisWeek: 7,
      lastWeek: 7,
      thisMonth: 30,
      lastMonth: 30,
      thisQuarter: 90,
      lastQuarter: 90,
      thisYear: 365,
      lastYear: 365,
      custom: 30, // Default
    };
    return ranges[timeRange] || 30;
  }

  private calculateAverageCycleTime(tasks: Task[]): number {
    const completedTasks = tasks.filter(t => 
      t.status === 'completed' && t.startedAt && t.completedAt
    );

    if (completedTasks.length === 0) return 0;

    const totalCycleTime = completedTasks.reduce((sum, task) => {
      const started = new Date(task.startedAt!).getTime();
      const completed = new Date(task.completedAt!).getTime();
      return sum + (completed - started) / (1000 * 60 * 60); // hours
    }, 0);

    return totalCycleTime / completedTasks.length;
  }

  private generateDateRange(timeRange: TimeRange): string[] {
    const days = this.getTimeRangeInDays(timeRange);
    const dates: string[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
  }

  private getTasksCompletedOnDate(tasks: Task[], date: string): number {
    return tasks.filter(task => 
      task.status === 'completed' && 
      task.completedAt?.startsWith(date)
    ).length;
  }

  private getVelocityForDate(tasks: Task[], date: string): number {
    // Calculate velocity as tasks completed per day
    return this.getTasksCompletedOnDate(tasks, date);
  }

  private generateBurndownData(tasks: Task[], dates: string[]): BurndownData[] {
    const totalTasks = tasks.length;
    let remainingTasks = totalTasks;

    return dates.map((date, index) => {
      const completedOnDate = this.getTasksCompletedOnDate(tasks, date);
      remainingTasks -= completedOnDate;
      
      const ideal = totalTasks - ((totalTasks / dates.length) * (index + 1));
      
      return {
        date,
        ideal: Math.max(0, ideal),
        actual: Math.max(0, remainingTasks),
        remaining: Math.max(0, remainingTasks),
        completed: totalTasks - remainingTasks,
      };
    });
  }

  private getAverageCycleTimeForDate(tasks: Task[], date: string): number {
    const tasksCompletedOnDate = tasks.filter(task => 
      task.status === 'completed' && 
      task.completedAt?.startsWith(date) &&
      task.startedAt
    );

    if (tasksCompletedOnDate.length === 0) return 0;

    const totalCycleTime = tasksCompletedOnDate.reduce((sum, task) => {
      const started = new Date(task.startedAt!).getTime();
      const completed = new Date(task.completedAt!).getTime();
      return sum + (completed - started) / (1000 * 60 * 60); // hours
    }, 0);

    return totalCycleTime / tasksCompletedOnDate.length;
  }

  private getWorkloadForDate(tasks: Task[], date: string): number {
    return tasks.filter(task => {
      const createdDate = task.createdAt.split('T')[0];
      const completedDate = task.completedAt?.split('T')[0];
      
      return createdDate <= date && (!completedDate || completedDate >= date);
    }).length;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + val * index, 0);
    const sumXX = values.reduce((sum, _, index) => sum + index * index, 0);
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private calculateProductivityScore(metrics: TaskMetrics): number {
    // Weighted score based on multiple factors
    const completionWeight = 0.4;
    const velocityWeight = 0.3;
    const efficiencyWeight = 0.3;
    
    const completionScore = Math.min(metrics.completionRate, 100);
    const velocityScore = Math.min(metrics.velocity * 10, 100); // Scale velocity
    const efficiencyScore = Math.min((1 / Math.max(metrics.averageCompletionTime / 24, 0.1)) * 100, 100);
    
    return Math.round(
      completionScore * completionWeight +
      velocityScore * velocityWeight +
      efficiencyScore * efficiencyWeight
    );
  }

  private calculateFocusScore(metrics: TaskMetrics, trends: TaskTrends): number {
    // Based on consistency and cycle time
    const cycleTimeScore = Math.max(0, 100 - (metrics.cycleTime / 24) * 10);
    const consistencyScore = 100 - (this.calculateVariance(trends.velocity.map(v => v.value)) * 10);
    
    return Math.round((cycleTimeScore + consistencyScore) / 2);
  }

  private calculateCollaborationScore(tasks: Task[]): number {
    // Mock implementation - would analyze task interactions, comments, etc.
    return Math.floor(Math.random() * 30) + 70; // 70-100
  }

  private calculateQualityScore(tasks: Task[]): number {
    // Mock implementation - would analyze rework, defects, etc.
    return Math.floor(Math.random() * 20) + 80; // 80-100
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  private aggregateTeamMetrics(memberMetrics: TaskMetrics[]): TaskMetrics {
    if (memberMetrics.length === 0) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        todoTasks: 0,
        overdueTasks: 0,
        completionRate: 0,
        averageCompletionTime: 0,
        velocity: 0,
        burndownRate: 0,
        cycleTime: 0,
        leadTime: 0,
      };
    }

    const totals = memberMetrics.reduce((acc, metrics) => ({
      totalTasks: acc.totalTasks + metrics.totalTasks,
      completedTasks: acc.completedTasks + metrics.completedTasks,
      inProgressTasks: acc.inProgressTasks + metrics.inProgressTasks,
      todoTasks: acc.todoTasks + metrics.todoTasks,
      overdueTasks: acc.overdueTasks + metrics.overdueTasks,
      averageCompletionTime: acc.averageCompletionTime + metrics.averageCompletionTime,
      velocity: acc.velocity + metrics.velocity,
      burndownRate: acc.burndownRate + metrics.burndownRate,
      cycleTime: acc.cycleTime + metrics.cycleTime,
      leadTime: acc.leadTime + metrics.leadTime,
    }));

    const memberCount = memberMetrics.length;

    return {
      ...totals,
      completionRate: totals.totalTasks > 0 ? (totals.completedTasks / totals.totalTasks) * 100 : 0,
      averageCompletionTime: totals.averageCompletionTime / memberCount,
      velocity: totals.velocity / memberCount,
      burndownRate: totals.burndownRate / memberCount,
      cycleTime: totals.cycleTime / memberCount,
      leadTime: totals.leadTime / memberCount,
    };
  }

  private rankMembers(members: any[], metric: string) {
    const getScore = (member: any) => {
      switch (metric) {
        case 'velocity':
          return member.metrics.velocity;
        case 'quality':
          return member.qualityScore;
        case 'efficiency':
          return member.productivityScore;
        default:
          return 0;
      }
    };

    return members
      .map(member => ({
        userId: member.userId,
        name: member.name,
        score: getScore(member),
        rank: 0,
        change: 0, // Would calculate from previous period
      }))
      .sort((a, b) => b.score - a.score)
      .map((member, index) => ({ ...member, rank: index + 1 }));
  }

  private generateReportCharts(data: any, type: ReportType) {
    // Mock implementation - would generate actual chart configurations
    return [
      {
        id: 'completion-trend',
        title: 'Task Completion Trend',
        type: 'line' as const,
        data: data.trends?.completion || [],
        config: {
          xAxis: 'date',
          yAxis: 'value',
          colors: ['#3b82f6'],
        },
      },
      {
        id: 'velocity-chart',
        title: 'Velocity Chart',
        type: 'bar' as const,
        data: data.trends?.velocity || [],
        config: {
          xAxis: 'date',
          yAxis: 'value',
          colors: ['#10b981'],
        },
      },
    ];
  }

  private generateRecommendations(insights: TaskInsight[]): string[] {
    return insights
      .filter(insight => insight.actionable && insight.actions)
      .flatMap(insight => insight.actions?.map(action => action.description) || []);
  }

  private convertReportToCSV(report: ProductivityReport): string {
    // Simple CSV conversion - would be more sophisticated in real implementation
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Report Title', report.title],
      ['Generated At', report.createdAt],
      ['Time Range', report.timeRange],
    ];

    if ('metrics' in report.data) {
      const metrics = report.data.metrics;
      rows.push(
        ['Total Tasks', metrics.totalTasks.toString()],
        ['Completed Tasks', metrics.completedTasks.toString()],
        ['Completion Rate', `${metrics.completionRate.toFixed(1)}%`],
        ['Average Completion Time', `${metrics.averageCompletionTime.toFixed(1)} hours`],
        ['Velocity', `${metrics.velocity.toFixed(1)} tasks/day`]
      );
    }

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

export const taskAnalyticsService = new TaskAnalyticsService();
export default TaskAnalyticsService;