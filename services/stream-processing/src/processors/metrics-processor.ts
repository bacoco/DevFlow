import { StreamEvent, ProcessedEvent } from '../types/stream-processing';
import { ProductivityMetric, MetricType, TimePeriod, GitEvent, IDETelemetry } from '@devflow/shared-types';
import { FlowMetricsCalculator } from './flow-metrics-calculator';
import { CodeQualityCalculator } from './code-quality-calculator';
import { v4 as uuidv4 } from 'uuid';

export class MetricsProcessor {
  private processedCount: number = 0;
  private startTime: Date = new Date();
  private flowCalculator: FlowMetricsCalculator;
  private codeQualityCalculator: CodeQualityCalculator;

  constructor() {
    this.flowCalculator = new FlowMetricsCalculator();
    this.codeQualityCalculator = new CodeQualityCalculator();
  }

  processWindow(events: StreamEvent[], windowStart: Date, windowEnd: Date): ProcessedEvent[] {
    const processedEvents: ProcessedEvent[] = [];
    
    // Group events by user and type
    const eventsByUser = this.groupEventsByUser(events);
    
    for (const [userId, userEvents] of eventsByUser) {
      const metrics = this.calculateMetricsForUser(userEvents, windowStart, windowEnd);
      
      if (metrics.length > 0) {
        const processedEvent: ProcessedEvent = {
          id: uuidv4(),
          originalEventId: userEvents[0]?.id || 'batch',
          type: 'metrics_batch',
          timestamp: windowEnd,
          userId,
          metrics,
          aggregations: this.calculateAggregations(userEvents)
        };
        
        processedEvents.push(processedEvent);
      }
    }

    this.processedCount += processedEvents.length;
    return processedEvents;
  }

  private groupEventsByUser(events: StreamEvent[]): Map<string, StreamEvent[]> {
    const grouped = new Map<string, StreamEvent[]>();
    
    for (const event of events) {
      if (!grouped.has(event.userId)) {
        grouped.set(event.userId, []);
      }
      grouped.get(event.userId)!.push(event);
    }
    
    return grouped;
  }

  private calculateMetricsForUser(events: StreamEvent[], windowStart: Date, windowEnd: Date): ProductivityMetric[] {
    const metrics: ProductivityMetric[] = [];
    
    // Separate events by type
    const gitEvents = events.filter(e => e.type === 'git');
    const ideEvents = events.filter(e => e.type === 'ide');
    const communicationEvents = events.filter(e => e.type === 'communication');
    
    // Calculate time-in-flow metrics from IDE events
    if (ideEvents.length > 0) {
      metrics.push(...this.calculateTimeInFlowMetrics(ideEvents, windowStart, windowEnd));
    }
    
    // Calculate code quality metrics from Git events
    if (gitEvents.length > 0) {
      metrics.push(...this.calculateCodeQualityMetrics(gitEvents, windowStart, windowEnd));
    }
    
    // Calculate collaboration metrics from communication events
    if (communicationEvents.length > 0) {
      metrics.push(...this.calculateCollaborationMetrics(communicationEvents, windowStart, windowEnd));
    }
    
    return metrics;
  }

  private calculateTimeInFlowMetrics(events: StreamEvent[], windowStart: Date, windowEnd: Date): ProductivityMetric[] {
    const userId = events[0]?.userId;
    
    if (!userId) return [];

    // Use the dedicated flow metrics calculator
    const flowResult = this.flowCalculator.calculateFlowMetrics(events, windowStart, windowEnd);
    
    // Add project context to metrics
    const projectId = this.extractProjectId(events);
    return flowResult.metrics.map(metric => ({
      ...metric,
      context: {
        ...metric.context,
        projectId
      }
    }));
  }

  private calculateCodeQualityMetrics(events: StreamEvent[], windowStart: Date, windowEnd: Date): ProductivityMetric[] {
    const userId = events[0]?.userId;
    
    if (!userId) return [];

    // Use the dedicated code quality calculator
    const qualityResult = this.codeQualityCalculator.calculateCodeQualityMetrics(events, windowStart, windowEnd);
    
    // Add additional context to metrics
    return qualityResult.metrics.map(metric => ({
      ...metric,
      context: {
        ...metric.context,
        repository: this.extractRepository(events)
      }
    }));
  }

  private calculateCollaborationMetrics(events: StreamEvent[], windowStart: Date, windowEnd: Date): ProductivityMetric[] {
    const metrics: ProductivityMetric[] = [];
    const userId = events[0]?.userId;
    
    if (!userId) return metrics;

    const collaborationScore = this.calculateCollaborationScore(events);
    
    metrics.push({
      id: uuidv4(),
      userId,
      metricType: MetricType.COLLABORATION_SCORE,
      value: collaborationScore,
      timestamp: windowEnd,
      aggregationPeriod: this.getTimePeriodFromWindow(windowEnd.getTime() - windowStart.getTime()),
      context: {
        teamId: this.extractTeamId(events),
        tags: {
          interactions: events.length.toString()
        }
      },
      confidence: this.calculateConfidence(events.length)
    });

    return metrics;
  }





  private calculateCollaborationScore(events: StreamEvent[]): number {
    // Simple collaboration score based on event frequency and diversity
    const uniqueTypes = new Set(events.map(e => (e.data as any).type || e.type));
    const typesDiversity = uniqueTypes.size / 5; // Normalize to max 5 types
    const frequency = Math.min(events.length / 10, 1); // Normalize to max 10 events
    
    return (typesDiversity + frequency) / 2;
  }

  private calculateAggregations(events: StreamEvent[]): Record<string, number> {
    const aggregations: Record<string, number> = {};
    
    // Count events by type
    const eventCounts = new Map<string, number>();
    for (const event of events) {
      const key = `${event.type}_events`;
      eventCounts.set(key, (eventCounts.get(key) || 0) + 1);
    }
    
    for (const [key, count] of eventCounts) {
      aggregations[key] = count;
    }
    
    // Calculate time span
    if (events.length > 1) {
      const sortedEvents = events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      aggregations.time_span_ms = sortedEvents[sortedEvents.length - 1].timestamp.getTime() - sortedEvents[0].timestamp.getTime();
    }
    
    return aggregations;
  }

  private getTimePeriodFromWindow(windowSizeMs: number): TimePeriod {
    const hours = windowSizeMs / (1000 * 60 * 60);
    
    if (hours <= 1) return TimePeriod.HOUR;
    if (hours <= 24) return TimePeriod.DAY;
    if (hours <= 168) return TimePeriod.WEEK; // 7 days
    return TimePeriod.MONTH;
  }

  private calculateConfidence(eventCount: number): number {
    // Simple confidence calculation based on event count
    return Math.min(eventCount / 10, 1);
  }

  private extractProjectId(events: StreamEvent[]): string | undefined {
    for (const event of events) {
      const projectId = (event.data as any).projectId || (event.metadata as any)?.projectId;
      if (projectId) return projectId;
    }
    return undefined;
  }

  private extractRepository(events: StreamEvent[]): string | undefined {
    for (const event of events) {
      const repository = (event.data as GitEvent).repository;
      if (repository) return repository;
    }
    return undefined;
  }

  private extractTeamId(events: StreamEvent[]): string | undefined {
    for (const event of events) {
      const teamId = (event.data as any).teamId || (event.metadata as any)?.teamId;
      if (teamId) return teamId;
    }
    return undefined;
  }

  async getThroughput(): Promise<number> {
    const runtimeMs = Date.now() - this.startTime.getTime();
    const runtimeHours = runtimeMs / (1000 * 60 * 60);
    
    return runtimeHours > 0 ? this.processedCount / runtimeHours : 0;
  }
}