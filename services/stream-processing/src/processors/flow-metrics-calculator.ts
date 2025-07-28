import { StreamEvent, TimeWindow } from '../types/stream-processing';
import { IDETelemetry, ProductivityMetric, MetricType, TimePeriod, FlowState, Activity } from '@devflow/shared-types';
import { v4 as uuidv4 } from 'uuid';

export interface FlowConfiguration {
  focusThresholdMs: number; // Minimum time to consider as focused work
  interruptionThresholdMs: number; // Gap between activities to consider interruption
  deepWorkThresholdMs: number; // Minimum continuous time for deep work
  sessionTimeoutMs: number; // Max gap before ending a session
  keystrokeIntensityThreshold: number; // Keystrokes per minute for active coding
  minimumSessionDurationMs: number; // Minimum session duration to consider
}

export interface FlowDetectionResult {
  flowState: FlowState;
  metrics: ProductivityMetric[];
  insights: FlowInsight[];
}

export interface FlowInsight {
  type: 'peak_hours' | 'interruption_pattern' | 'focus_decline' | 'deep_work_session';
  message: string;
  confidence: number;
  metadata: Record<string, any>;
}

export class FlowMetricsCalculator {
  private config: FlowConfiguration;

  constructor(config?: Partial<FlowConfiguration>) {
    this.config = {
      focusThresholdMs: 5 * 60 * 1000, // 5 minutes
      interruptionThresholdMs: 2 * 60 * 1000, // 2 minutes
      deepWorkThresholdMs: 25 * 60 * 1000, // 25 minutes (Pomodoro)
      sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes
      keystrokeIntensityThreshold: 30, // 30 keystrokes per minute
      minimumSessionDurationMs: 10 * 60 * 1000, // 10 minutes
      ...config
    };
  }

  calculateFlowMetrics(events: StreamEvent[], windowStart: Date, windowEnd: Date): FlowDetectionResult {
    // Filter and sort IDE events
    const ideEvents = this.filterAndSortIDEEvents(events);
    
    if (ideEvents.length === 0) {
      return this.createEmptyResult(events[0]?.userId, windowStart, windowEnd);
    }

    // Detect focus sessions
    const focusSessions = this.detectFocusSessions(ideEvents);
    
    // Calculate interruptions
    const interruptions = this.detectInterruptions(ideEvents);
    
    // Create flow state
    const flowState = this.createFlowState(ideEvents, focusSessions, interruptions, windowStart, windowEnd);
    
    // Generate metrics
    const metrics = this.generateFlowMetrics(flowState, windowStart, windowEnd);
    
    // Generate insights
    const insights = this.generateFlowInsights(flowState, ideEvents);

    return {
      flowState,
      metrics,
      insights
    };
  }

  private filterAndSortIDEEvents(events: StreamEvent[]): StreamEvent[] {
    return events
      .filter(event => event.type === 'ide')
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private detectFocusSessions(events: StreamEvent[]): Activity[] {
    const activities: Activity[] = [];
    
    if (events.length === 0) return activities;

    let sessionStart = events[0].timestamp;
    let sessionEnd = events[0].timestamp;
    let currentType = this.getActivityType(events[0].data as IDETelemetry);
    let maxIntensity = this.calculateIntensity(events[0].data as IDETelemetry);
    let interruptions = 0;

    for (let i = 1; i < events.length; i++) {
      const event = events[i];
      const ideEvent = event.data as IDETelemetry;
      const eventTime = event.timestamp;
      const activityType = this.getActivityType(ideEvent);
      const intensity = this.calculateIntensity(ideEvent);

      const timeSinceLastEvent = eventTime.getTime() - events[i - 1].timestamp.getTime();

      // Check if this is a new session (gap too large or different activity type)
      if (timeSinceLastEvent > this.config.interruptionThresholdMs || currentType !== activityType) {
        // Close current session if it's long enough
        const sessionDuration = sessionEnd.getTime() - sessionStart.getTime();
        if (sessionDuration >= this.config.focusThresholdMs) {
          activities.push({
            type: currentType,
            startTime: sessionStart,
            endTime: new Date(sessionEnd.getTime() + (2 * 60 * 1000)), // Add buffer
            intensity: maxIntensity,
            interruptions
          });
        }

        // Start new session
        sessionStart = eventTime;
        currentType = activityType;
        maxIntensity = intensity;
        interruptions = 0;
      } else {
        // Continue current session
        maxIntensity = Math.max(maxIntensity, intensity);
        if (timeSinceLastEvent > this.config.interruptionThresholdMs / 2) {
          interruptions++;
        }
      }

      sessionEnd = eventTime;
    }

    // Close final session
    const finalSessionDuration = sessionEnd.getTime() - sessionStart.getTime();
    if (finalSessionDuration >= this.config.focusThresholdMs) {
      activities.push({
        type: currentType,
        startTime: sessionStart,
        endTime: new Date(sessionEnd.getTime() + (2 * 60 * 1000)), // Add buffer
        intensity: maxIntensity,
        interruptions
      });
    }

    return activities;
  }

  private getActivityType(ideEvent: IDETelemetry): Activity['type'] {
    switch (ideEvent.eventType) {
      case 'debug':
        return 'debugging';
      case 'test_run':
        return 'testing';
      case 'keystroke':
      case 'file_change':
        return 'coding';
      default:
        return 'coding';
    }
  }

  private calculateIntensity(ideEvent: IDETelemetry): number {
    const data = ideEvent.data;
    
    // Calculate intensity based on activity indicators
    let intensity = 0;

    if (data.keystrokeCount) {
      // Normalize keystroke count to intensity (0-1)
      const keystrokesPerMinute = data.keystrokeCount; // Assuming this is per minute
      intensity += Math.min(keystrokesPerMinute / this.config.keystrokeIntensityThreshold, 1) * 0.4;
    }

    if (data.focusDurationMs) {
      // Longer focus duration indicates higher intensity
      const focusMinutes = data.focusDurationMs / (60 * 1000);
      intensity += Math.min(focusMinutes / 30, 1) * 0.3; // Max 30 minutes for full score
    }

    if (data.errorCount !== undefined) {
      // More errors might indicate debugging/problem-solving intensity
      intensity += Math.min(data.errorCount / 10, 1) * 0.2;
    }

    if (data.buildResult) {
      // Build activity indicates active development
      intensity += 0.1;
    }

    return Math.min(intensity, 1);
  }

  private detectInterruptions(events: StreamEvent[]): number {
    let interruptions = 0;
    let lastEventTime = 0;

    for (const event of events) {
      const eventTime = event.timestamp.getTime();
      
      if (lastEventTime > 0) {
        const gap = eventTime - lastEventTime;
        if (gap > this.config.interruptionThresholdMs && gap < this.config.sessionTimeoutMs) {
          interruptions++;
        }
      }
      
      lastEventTime = eventTime;
    }

    return interruptions;
  }

  private createFlowState(
    events: StreamEvent[], 
    activities: Activity[], 
    interruptions: number,
    windowStart: Date,
    windowEnd: Date
  ): FlowState {
    const userId = events[0]?.userId || 'unknown';
    const sessionId = uuidv4();

    // Calculate total focus time
    const totalFocusTimeMs = activities.reduce((total, activity) => {
      return total + (activity.endTime.getTime() - activity.startTime.getTime());
    }, 0);

    // Calculate deep work percentage
    const deepWorkTime = activities
      .filter(activity => {
        const duration = activity.endTime.getTime() - activity.startTime.getTime();
        return duration >= this.config.deepWorkThresholdMs && activity.intensity > 0.5; // Lower threshold
      })
      .reduce((total, activity) => {
        return total + (activity.endTime.getTime() - activity.startTime.getTime());
      }, 0);

    const windowDuration = windowEnd.getTime() - windowStart.getTime();
    const deepWorkPercentage = windowDuration > 0 ? deepWorkTime / windowDuration : 0;

    // Calculate focus score
    const focusScore = this.calculateFocusScore(totalFocusTimeMs, interruptions, windowDuration);

    return {
      userId,
      sessionId,
      startTime: windowStart,
      endTime: windowEnd,
      interruptionCount: interruptions,
      focusScore,
      activities,
      totalFocusTimeMs,
      deepWorkPercentage
    };
  }

  private calculateFocusScore(focusTime: number, interruptions: number, windowDuration: number): number {
    if (windowDuration === 0) return 0;

    // Base score from focus time ratio
    const focusRatio = focusTime / windowDuration;
    
    // Penalty for interruptions
    const interruptionPenalty = Math.min(interruptions * 0.05, 0.3); // Max 30% penalty
    
    // Bonus for sustained focus periods
    const sustainedFocusBonus = focusTime > this.config.deepWorkThresholdMs ? 0.1 : 0;

    const score = Math.max(0, Math.min(1, focusRatio - interruptionPenalty + sustainedFocusBonus));
    return score;
  }

  private generateFlowMetrics(flowState: FlowState, windowStart: Date, windowEnd: Date): ProductivityMetric[] {
    const metrics: ProductivityMetric[] = [];
    const windowDuration = windowEnd.getTime() - windowStart.getTime();
    const timePeriod = this.getTimePeriodFromDuration(windowDuration);

    // Time in flow metric
    metrics.push({
      id: uuidv4(),
      userId: flowState.userId,
      metricType: MetricType.TIME_IN_FLOW,
      value: flowState.totalFocusTimeMs,
      timestamp: windowEnd,
      aggregationPeriod: timePeriod,
      context: {
        tags: {
          sessionId: flowState.sessionId,
          interruptions: flowState.interruptionCount.toString(),
          activities: flowState.activities.length.toString()
        }
      },
      confidence: this.calculateMetricConfidence(flowState.activities.length),
      metadata: {
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
        deepWorkPercentage: flowState.deepWorkPercentage
      }
    });

    // Focus time metric
    metrics.push({
      id: uuidv4(),
      userId: flowState.userId,
      metricType: MetricType.FOCUS_TIME,
      value: flowState.focusScore,
      timestamp: windowEnd,
      aggregationPeriod: timePeriod,
      context: {
        tags: {
          sessionId: flowState.sessionId,
          totalFocusTime: flowState.totalFocusTimeMs.toString(),
          deepWorkTime: (flowState.deepWorkPercentage * windowDuration).toString()
        }
      },
      confidence: this.calculateMetricConfidence(flowState.activities.length),
      metadata: {
        algorithm: 'focus-score-v1',
        interruptionCount: flowState.interruptionCount,
        activitiesAnalyzed: flowState.activities.length
      }
    });

    return metrics;
  }

  private generateFlowInsights(flowState: FlowState, events: StreamEvent[]): FlowInsight[] {
    const insights: FlowInsight[] = [];

    // Deep work session insight
    if (flowState.deepWorkPercentage > 0.6) {
      insights.push({
        type: 'deep_work_session',
        message: `Excellent deep work session with ${Math.round(flowState.deepWorkPercentage * 100)}% deep work time`,
        confidence: 0.9,
        metadata: {
          deepWorkPercentage: flowState.deepWorkPercentage,
          totalFocusTime: flowState.totalFocusTimeMs
        }
      });
    }

    // Interruption pattern insight
    if (flowState.interruptionCount > 5) {
      insights.push({
        type: 'interruption_pattern',
        message: `High interruption count (${flowState.interruptionCount}) may be affecting productivity`,
        confidence: 0.8,
        metadata: {
          interruptionCount: flowState.interruptionCount,
          averageActivityDuration: this.calculateAverageActivityDuration(flowState.activities)
        }
      });
    }

    // Focus decline insight
    if (flowState.focusScore < 0.4 && flowState.activities.length > 0) {
      insights.push({
        type: 'focus_decline',
        message: 'Low focus score detected - consider taking a break or reducing distractions',
        confidence: 0.7,
        metadata: {
          focusScore: flowState.focusScore,
          suggestedAction: 'break_or_environment_change'
        }
      });
    }

    // Peak hours insight (simplified - would need historical data for full implementation)
    const hourOfDay = new Date(flowState.startTime).getHours();
    if (flowState.focusScore > 0.7 && (hourOfDay >= 9 && hourOfDay <= 11)) {
      insights.push({
        type: 'peak_hours',
        message: 'Morning hours showing high productivity - consider scheduling complex tasks during this time',
        confidence: 0.6,
        metadata: {
          hourOfDay,
          focusScore: flowState.focusScore
        }
      });
    }

    return insights;
  }

  private calculateAverageActivityDuration(activities: Activity[]): number {
    if (activities.length === 0) return 0;
    
    const totalDuration = activities.reduce((sum, activity) => {
      return sum + (activity.endTime.getTime() - activity.startTime.getTime());
    }, 0);
    
    return totalDuration / activities.length;
  }

  private getTimePeriodFromDuration(durationMs: number): TimePeriod {
    const hours = durationMs / (1000 * 60 * 60);
    
    if (hours <= 1) return TimePeriod.HOUR;
    if (hours <= 24) return TimePeriod.DAY;
    if (hours <= 168) return TimePeriod.WEEK;
    return TimePeriod.MONTH;
  }

  private calculateMetricConfidence(activityCount: number): number {
    // Confidence increases with more data points
    return Math.min(activityCount / 20, 1);
  }

  private createEmptyResult(userId: string, windowStart: Date, windowEnd: Date): FlowDetectionResult {
    return {
      flowState: {
        userId: userId || 'unknown',
        sessionId: uuidv4(),
        startTime: windowStart,
        endTime: windowEnd,
        interruptionCount: 0,
        focusScore: 0,
        activities: [],
        totalFocusTimeMs: 0,
        deepWorkPercentage: 0
      },
      metrics: [],
      insights: []
    };
  }

  // Configuration methods
  updateConfiguration(config: Partial<FlowConfiguration>): void {
    this.config = { ...this.config, ...config };
  }

  getConfiguration(): FlowConfiguration {
    return { ...this.config };
  }

  // Utility method for testing
  async getThroughput(): Promise<number> {
    // This would track processing throughput in a real implementation
    return 0;
  }
}