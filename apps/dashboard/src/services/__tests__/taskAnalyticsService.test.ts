/**
 * Unit tests for TaskAnalyticsService
 */

import { taskAnalyticsService } from '../taskAnalyticsService';
import { AnalyticsFilters, TaskMetrics, TaskTrends, TaskInsight } from '../../types/analytics';

// Mock data
const mockTasks = [
  {
    id: 'task-1',
    title: 'Task 1',
    description: 'Description 1',
    status: 'completed' as const,
    priority: 'high' as const,
    assignee: 'user-1',
    dueDate: '2024-01-15T00:00:00Z',
    tags: ['tag-1'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
    completedAt: '2024-01-10T00:00:00Z',
    startedAt: '2024-01-05T00:00:00Z',
    estimatedHours: 8,
    actualHours: 10,
  },
  {
    id: 'task-2',
    title: 'Task 2',
    description: 'Description 2',
    status: 'in-progress' as const,
    priority: 'medium' as const,
    assignee: 'user-1',
    dueDate: '2024-01-20T00:00:00Z',
    tags: ['tag-2'],
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-11T00:00:00Z',
    startedAt: '2024-01-08T00:00:00Z',
    estimatedHours: 6,
    actualHours: 4,
  },
  {
    id: 'task-3',
    title: 'Task 3',
    description: 'Description 3',
    status: 'todo' as const,
    priority: 'low' as const,
    assignee: 'user-2',
    dueDate: '2024-01-25T00:00:00Z',
    tags: ['tag-1', 'tag-3'],
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-12T00:00:00Z',
    estimatedHours: 4,
    actualHours: 0,
  },
];

// Mock the fetch function
global.fetch = jest.fn();

describe('TaskAnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateTaskMetrics', () => {
    it('should calculate basic task metrics correctly', async () => {
      // Mock the fetchTasks method
      jest.spyOn(taskAnalyticsService as any, 'fetchTasks').mockResolvedValue(mockTasks);

      const filters: AnalyticsFilters = {
        timeRange: 'last30days',
      };

      const metrics = await taskAnalyticsService.calculateTaskMetrics(filters);

      expect(metrics).toEqual({
        totalTasks: 3,
        completedTasks: 1,
        inProgressTasks: 1,
        todoTasks: 1,
        overdueTasks: expect.any(Number), // Depends on current date vs mock dates
        completionRate: 33.33333333333333, // 1/3 * 100
        averageCompletionTime: expect.any(Number),
        velocity: expect.any(Number),
        burndownRate: expect.any(Number),
        cycleTime: expect.any(Number),
        leadTime: expect.any(Number),
      });

      expect(metrics.totalTasks).toBe(3);
      expect(metrics.completedTasks).toBe(1);
      expect(metrics.inProgressTasks).toBe(1);
      expect(metrics.todoTasks).toBe(1);
    });

    it('should handle empty task list', async () => {
      jest.spyOn(taskAnalyticsService as any, 'fetchTasks').mockResolvedValue([]);

      const filters: AnalyticsFilters = {
        timeRange: 'last7days',
      };

      const metrics = await taskAnalyticsService.calculateTaskMetrics(filters);

      expect(metrics).toEqual({
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
      });
    });

    it('should calculate completion rate correctly', async () => {
      const completedTasks = [
        { ...mockTasks[0], status: 'completed' as const },
        { ...mockTasks[1], status: 'completed' as const },
        { ...mockTasks[2], status: 'todo' as const },
      ];

      jest.spyOn(taskAnalyticsService as any, 'fetchTasks').mockResolvedValue(completedTasks);

      const filters: AnalyticsFilters = {
        timeRange: 'last30days',
      };

      const metrics = await taskAnalyticsService.calculateTaskMetrics(filters);

      expect(metrics.completionRate).toBeCloseTo(66.67, 1); // 2/3 * 100
    });
  });

  describe('generateTaskTrends', () => {
    it('should generate trend data for specified time range', async () => {
      jest.spyOn(taskAnalyticsService as any, 'fetchTasks').mockResolvedValue(mockTasks);

      const filters: AnalyticsFilters = {
        timeRange: 'last7days',
      };

      const trends = await taskAnalyticsService.generateTaskTrends(filters);

      expect(trends).toHaveProperty('completion');
      expect(trends).toHaveProperty('velocity');
      expect(trends).toHaveProperty('burndown');
      expect(trends).toHaveProperty('cycleTime');
      expect(trends).toHaveProperty('workload');

      expect(Array.isArray(trends.completion)).toBe(true);
      expect(Array.isArray(trends.velocity)).toBe(true);
      expect(Array.isArray(trends.burndown)).toBe(true);
      expect(Array.isArray(trends.cycleTime)).toBe(true);
      expect(Array.isArray(trends.workload)).toBe(true);

      // Should have 7 data points for last7days
      expect(trends.completion).toHaveLength(7);
      expect(trends.velocity).toHaveLength(7);
    });

    it('should generate valid trend data structure', async () => {
      jest.spyOn(taskAnalyticsService as any, 'fetchTasks').mockResolvedValue(mockTasks);

      const filters: AnalyticsFilters = {
        timeRange: 'last7days',
      };

      const trends = await taskAnalyticsService.generateTaskTrends(filters);

      // Check structure of first completion data point
      const firstCompletion = trends.completion[0];
      expect(firstCompletion).toHaveProperty('date');
      expect(firstCompletion).toHaveProperty('value');
      expect(typeof firstCompletion.date).toBe('string');
      expect(typeof firstCompletion.value).toBe('number');
    });
  });

  describe('generateTaskInsights', () => {
    it('should generate insights based on metrics and trends', async () => {
      const mockMetrics: TaskMetrics = {
        totalTasks: 10,
        completedTasks: 6,
        inProgressTasks: 2,
        todoTasks: 2,
        overdueTasks: 3,
        completionRate: 60,
        averageCompletionTime: 48,
        velocity: 2.5,
        burndownRate: 75,
        cycleTime: 72,
        leadTime: 48,
      };

      const mockTrends: TaskTrends = {
        completion: [
          { date: '2024-01-01', value: 2 },
          { date: '2024-01-02', value: 1 },
          { date: '2024-01-03', value: 3 },
        ],
        velocity: [
          { date: '2024-01-01', value: 2 },
          { date: '2024-01-02', value: 1 },
          { date: '2024-01-03', value: 3 },
        ],
        burndown: [
          { date: '2024-01-01', value: 10 },
          { date: '2024-01-02', value: 8 },
          { date: '2024-01-03', value: 5 },
        ],
        cycleTime: [
          { date: '2024-01-01', value: 24 },
          { date: '2024-01-02', value: 48 },
          { date: '2024-01-03', value: 72 },
        ],
        workload: [
          { date: '2024-01-01', value: 10 },
          { date: '2024-01-02', value: 9 },
          { date: '2024-01-03', value: 7 },
        ],
      };

      const filters: AnalyticsFilters = {
        timeRange: 'last30days',
      };

      const insights = await taskAnalyticsService.generateTaskInsights(
        mockMetrics,
        mockTrends,
        filters
      );

      expect(Array.isArray(insights)).toBe(true);
      expect(insights.length).toBeGreaterThan(0);

      // Should generate insight about overdue tasks
      const overdueInsight = insights.find(insight => insight.id === 'overdue-tasks');
      expect(overdueInsight).toBeDefined();
      expect(overdueInsight?.type).toBe('warning');
      expect(overdueInsight?.actionable).toBe(true);

      // Should generate insight about long cycle time (72 hours > 72 hour threshold)
      const cycleTimeInsight = insights.find(insight => insight.id === 'long-cycle-time');
      expect(cycleTimeInsight).toBeDefined();
      expect(cycleTimeInsight?.type).toBe('bottleneck');
    });

    it('should generate achievement insights for good performance', async () => {
      const goodMetrics: TaskMetrics = {
        totalTasks: 10,
        completedTasks: 9,
        inProgressTasks: 1,
        todoTasks: 0,
        overdueTasks: 0,
        completionRate: 90,
        averageCompletionTime: 24,
        velocity: 3.5,
        burndownRate: 95,
        cycleTime: 48,
        leadTime: 24,
      };

      const improvingTrends: TaskTrends = {
        completion: [
          { date: '2024-01-01', value: 2 },
          { date: '2024-01-02', value: 3 },
          { date: '2024-01-03', value: 4 },
        ],
        velocity: [
          { date: '2024-01-01', value: 2 },
          { date: '2024-01-02', value: 3 },
          { date: '2024-01-03', value: 4 },
        ],
        burndown: [],
        cycleTime: [],
        workload: [],
      };

      const filters: AnalyticsFilters = {
        timeRange: 'last30days',
      };

      const insights = await taskAnalyticsService.generateTaskInsights(
        goodMetrics,
        improvingTrends,
        filters
      );

      // Should generate achievement insight for improving velocity
      const velocityInsight = insights.find(insight => insight.id === 'improving-velocity');
      expect(velocityInsight).toBeDefined();
      expect(velocityInsight?.type).toBe('achievement');
    });
  });

  describe('generateTeamPerformanceMetrics', () => {
    it('should generate team performance metrics', async () => {
      jest.spyOn(taskAnalyticsService as any, 'fetchTeamMembers').mockResolvedValue([
        { id: 'user-1', name: 'Alice', email: 'alice@example.com', role: 'Developer' },
        { id: 'user-2', name: 'Bob', email: 'bob@example.com', role: 'Developer' },
      ]);

      jest.spyOn(taskAnalyticsService as any, 'fetchTeamTasks').mockResolvedValue(mockTasks);

      const filters: AnalyticsFilters = {
        timeRange: 'last30days',
        teamIds: ['team-1'],
      };

      const teamPerformance = await taskAnalyticsService.generateTeamPerformanceMetrics(
        'team-1',
        filters
      );

      expect(teamPerformance).toHaveProperty('teamId', 'team-1');
      expect(teamPerformance).toHaveProperty('teamName');
      expect(teamPerformance).toHaveProperty('members');
      expect(teamPerformance).toHaveProperty('aggregatedMetrics');
      expect(teamPerformance).toHaveProperty('comparisons');
      expect(teamPerformance).toHaveProperty('rankings');

      expect(Array.isArray(teamPerformance.members)).toBe(true);
      expect(teamPerformance.members.length).toBe(2);

      // Check member structure
      const firstMember = teamPerformance.members[0];
      expect(firstMember).toHaveProperty('userId');
      expect(firstMember).toHaveProperty('name');
      expect(firstMember).toHaveProperty('metrics');
      expect(firstMember).toHaveProperty('trends');
      expect(firstMember).toHaveProperty('productivityScore');
    });
  });

  describe('generateProductivityReport', () => {
    it('should generate a complete productivity report', async () => {
      jest.spyOn(taskAnalyticsService as any, 'fetchTasks').mockResolvedValue(mockTasks);

      const filters: AnalyticsFilters = {
        timeRange: 'last30days',
        userIds: ['user-1'],
      };

      const report = await taskAnalyticsService.generateProductivityReport(
        'individual',
        filters,
        {
          title: 'Test Report',
          description: 'Test Description',
          includeCharts: true,
          includeInsights: true,
        }
      );

      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('title', 'Test Report');
      expect(report).toHaveProperty('description', 'Test Description');
      expect(report).toHaveProperty('type', 'individual');
      expect(report).toHaveProperty('data');
      expect(report).toHaveProperty('charts');
      expect(report).toHaveProperty('insights');
      expect(report).toHaveProperty('recommendations');

      expect(Array.isArray(report.charts)).toBe(true);
      expect(Array.isArray(report.insights)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe('exportReport', () => {
    it('should export report as JSON', async () => {
      const mockReport = {
        id: 'report-1',
        title: 'Test Report',
        type: 'individual' as const,
        data: {},
        charts: [],
        insights: [],
        recommendations: [],
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: 'user-1',
        format: ['json' as const],
        scope: 'user' as const,
        timeRange: 'last30days' as const,
        filters: {},
        description: 'Test',
      };

      const blob = await taskAnalyticsService.exportReport(mockReport, 'json');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');

      // Read blob content
      const text = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsText(blob);
      });
      const parsed = JSON.parse(text);
      expect(parsed.id).toBe('report-1');
      expect(parsed.title).toBe('Test Report');
    });

    it('should export report as CSV', async () => {
      const mockReport = {
        id: 'report-1',
        title: 'Test Report',
        type: 'individual' as const,
        data: {
          metrics: {
            totalTasks: 10,
            completedTasks: 8,
            completionRate: 80,
            velocity: 2.5,
            averageCompletionTime: 24,
          },
        },
        charts: [],
        insights: [],
        recommendations: [],
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: 'user-1',
        format: ['csv' as const],
        scope: 'user' as const,
        timeRange: 'last30days' as const,
        filters: {},
        description: 'Test',
      };

      const blob = await taskAnalyticsService.exportReport(mockReport, 'csv');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/csv');

      // Read blob content
      const text = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsText(blob);
      });
      expect(text).toContain('Metric,Value');
      expect(text).toContain('Test Report');
    });

    it('should throw error for unsupported format', async () => {
      const mockReport = {
        id: 'report-1',
        title: 'Test Report',
        type: 'individual' as const,
        data: {},
        charts: [],
        insights: [],
        recommendations: [],
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: 'user-1',
        format: ['json' as const],
        scope: 'user' as const,
        timeRange: 'last30days' as const,
        filters: {},
        description: 'Test',
      };

      await expect(
        taskAnalyticsService.exportReport(mockReport, 'unsupported' as any)
      ).rejects.toThrow('Unsupported export format: unsupported');
    });
  });

  describe('error handling', () => {
    it('should handle errors in calculateTaskMetrics', async () => {
      jest.spyOn(taskAnalyticsService as any, 'fetchTasks').mockRejectedValue(
        new Error('Network error')
      );

      const filters: AnalyticsFilters = {
        timeRange: 'last30days',
      };

      await expect(
        taskAnalyticsService.calculateTaskMetrics(filters)
      ).rejects.toThrow('Network error');
    });

    it('should handle errors in generateTaskTrends', async () => {
      jest.spyOn(taskAnalyticsService as any, 'fetchTasks').mockRejectedValue(
        new Error('Database error')
      );

      const filters: AnalyticsFilters = {
        timeRange: 'last7days',
      };

      await expect(
        taskAnalyticsService.generateTaskTrends(filters)
      ).rejects.toThrow('Database error');
    });
  });
});