import { EventEmitter } from 'events';

export interface UserEvent {
  id: string;
  userId: string;
  sessionId: string;
  timestamp: Date;
  eventType: string;
  eventData: Record<string, any>;
  pageUrl: string;
  userAgent: string;
  viewport: { width: number; height: number };
  anonymized: boolean;
}

export interface UserSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  pageViews: number;
  interactions: number;
  deviceInfo: DeviceInfo;
  referrer?: string;
  exitPage?: string;
}

export interface DeviceInfo {
  type: 'desktop' | 'tablet' | 'mobile';
  os: string;
  browser: string;
  screenResolution: string;
  touchCapable: boolean;
}

export interface PrivacySettings {
  collectPersonalData: boolean;
  collectBehaviorData: boolean;
  retentionPeriod: number; // days
  anonymizeAfter: number; // days
  allowCrossSiteTracking: boolean;
  respectDoNotTrack: boolean;
}

export interface AnalyticsConfig {
  privacy: PrivacySettings;
  sampling: {
    rate: number; // 0-1, percentage of events to collect
    strategy: 'random' | 'deterministic';
  };
  storage: {
    local: boolean;
    remote: boolean;
    batchSize: number;
    flushInterval: number; // milliseconds
  };
}

export interface BehaviorInsight {
  type: 'user_flow' | 'feature_usage' | 'performance' | 'error_pattern' | 'engagement';
  title: string;
  description: string;
  confidence: number; // 0-1
  impact: 'low' | 'medium' | 'high';
  recommendations: string[];
  data: Record<string, any>;
}

export interface UserJourneyStep {
  page: string;
  action: string;
  timestamp: Date;
  duration: number;
  exitPoint?: boolean;
}

export interface UserJourney {
  userId: string;
  sessionId: string;
  steps: UserJourneyStep[];
  completed: boolean;
  totalDuration: number;
  conversionEvents: string[];
}

export class UserBehaviorAnalytics extends EventEmitter {
  private events: UserEvent[] = [];
  private sessions: Map<string, UserSession> = new Map();
  private config: AnalyticsConfig;
  private eventQueue: UserEvent[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(config: AnalyticsConfig) {
    super();
    this.config = config;
    this.startFlushTimer();
  }

  // Event Collection
  trackEvent(
    eventType: string,
    eventData: Record<string, any>,
    userId?: string,
    sessionId?: string
  ): void {
    // Respect privacy settings
    if (!this.shouldCollectEvent(eventType, eventData)) {
      return;
    }

    // Apply sampling
    if (!this.shouldSampleEvent()) {
      return;
    }

    const event: UserEvent = {
      id: this.generateEventId(),
      userId: userId || 'anonymous',
      sessionId: sessionId || this.generateSessionId(),
      timestamp: new Date(),
      eventType,
      eventData: this.sanitizeEventData(eventData),
      pageUrl: this.getCurrentPageUrl(),
      userAgent: this.getUserAgent(),
      viewport: this.getViewport(),
      anonymized: !this.config.privacy.collectPersonalData
    };

    this.eventQueue.push(event);
    this.updateSession(event);
    
    this.emit('eventTracked', event);
  }

  // Specialized tracking methods
  trackPageView(page: string, userId?: string, sessionId?: string): void {
    this.trackEvent('page_view', { page }, userId, sessionId);
  }

  trackUserInteraction(
    element: string,
    action: string,
    context: Record<string, any> = {},
    userId?: string,
    sessionId?: string
  ): void {
    this.trackEvent('user_interaction', {
      element,
      action,
      ...context
    }, userId, sessionId);
  }

  trackPerformanceMetric(
    metric: string,
    value: number,
    context: Record<string, any> = {},
    userId?: string,
    sessionId?: string
  ): void {
    this.trackEvent('performance_metric', {
      metric,
      value,
      ...context
    }, userId, sessionId);
  }

  trackError(
    error: Error,
    context: Record<string, any> = {},
    userId?: string,
    sessionId?: string
  ): void {
    this.trackEvent('error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context
    }, userId, sessionId);
  }

  trackConversion(
    conversionType: string,
    value?: number,
    context: Record<string, any> = {},
    userId?: string,
    sessionId?: string
  ): void {
    this.trackEvent('conversion', {
      conversionType,
      value,
      ...context
    }, userId, sessionId);
  }

  // Session Management
  startSession(userId: string, deviceInfo: DeviceInfo): string {
    const sessionId = this.generateSessionId();
    const session: UserSession = {
      id: sessionId,
      userId,
      startTime: new Date(),
      pageViews: 0,
      interactions: 0,
      deviceInfo,
      referrer: document.referrer || undefined
    };

    this.sessions.set(sessionId, session);
    this.emit('sessionStarted', session);
    
    return sessionId;
  }

  endSession(sessionId: string, exitPage?: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.endTime = new Date();
    session.duration = session.endTime.getTime() - session.startTime.getTime();
    session.exitPage = exitPage;

    this.emit('sessionEnded', session);
  }

  // Analysis Methods
  generateBehaviorInsights(timeRange?: { start: Date; end: Date }): BehaviorInsight[] {
    const relevantEvents = this.getEventsInRange(timeRange);
    const insights: BehaviorInsight[] = [];

    // User flow analysis
    insights.push(...this.analyzeUserFlows(relevantEvents));
    
    // Feature usage analysis
    insights.push(...this.analyzeFeatureUsage(relevantEvents));
    
    // Performance analysis
    insights.push(...this.analyzePerformance(relevantEvents));
    
    // Error pattern analysis
    insights.push(...this.analyzeErrorPatterns(relevantEvents));
    
    // Engagement analysis
    insights.push(...this.analyzeEngagement(relevantEvents));

    return insights.sort((a, b) => b.confidence * this.getImpactWeight(b.impact) - 
                                   a.confidence * this.getImpactWeight(a.impact));
  }

  analyzeUserJourneys(timeRange?: { start: Date; end: Date }): UserJourney[] {
    const relevantEvents = this.getEventsInRange(timeRange);
    const journeyMap = new Map<string, UserJourney>();

    // Group events by session
    const sessionEvents = new Map<string, UserEvent[]>();
    relevantEvents.forEach(event => {
      if (!sessionEvents.has(event.sessionId)) {
        sessionEvents.set(event.sessionId, []);
      }
      sessionEvents.get(event.sessionId)!.push(event);
    });

    // Build journeys
    sessionEvents.forEach((events, sessionId) => {
      const sortedEvents = events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const journey = this.buildUserJourney(sortedEvents);
      journeyMap.set(sessionId, journey);
    });

    return Array.from(journeyMap.values());
  }

  getEngagementMetrics(timeRange?: { start: Date; end: Date }): EngagementMetrics {
    const relevantEvents = this.getEventsInRange(timeRange);
    const sessions = Array.from(this.sessions.values()).filter(s => 
      !timeRange || (s.startTime >= timeRange.start && s.startTime <= timeRange.end)
    );

    const totalUsers = new Set(relevantEvents.map(e => e.userId)).size;
    const totalSessions = sessions.length;
    const totalPageViews = relevantEvents.filter(e => e.eventType === 'page_view').length;
    const totalInteractions = relevantEvents.filter(e => e.eventType === 'user_interaction').length;

    const avgSessionDuration = sessions
      .filter(s => s.duration)
      .reduce((sum, s) => sum + s.duration!, 0) / sessions.length || 0;

    const bounceRate = sessions.filter(s => s.pageViews <= 1).length / totalSessions * 100;

    return {
      totalUsers,
      totalSessions,
      totalPageViews,
      totalInteractions,
      avgSessionDuration: avgSessionDuration / 1000, // Convert to seconds
      bounceRate,
      engagementRate: (totalInteractions / totalPageViews) * 100,
      conversionRate: this.calculateConversionRate(relevantEvents)
    };
  }

  // Privacy and Compliance
  anonymizeUserData(userId: string): void {
    // Anonymize stored events
    this.events.forEach(event => {
      if (event.userId === userId) {
        event.userId = this.hashUserId(userId);
        event.anonymized = true;
        event.eventData = this.removePersonalData(event.eventData);
      }
    });

    // Anonymize sessions
    this.sessions.forEach(session => {
      if (session.userId === userId) {
        session.userId = this.hashUserId(userId);
      }
    });

    this.emit('userDataAnonymized', userId);
  }

  deleteUserData(userId: string): void {
    // Remove events
    this.events = this.events.filter(event => event.userId !== userId);
    
    // Remove sessions
    const sessionsToDelete = Array.from(this.sessions.entries())
      .filter(([_, session]) => session.userId === userId)
      .map(([sessionId, _]) => sessionId);
    
    sessionsToDelete.forEach(sessionId => this.sessions.delete(sessionId));

    this.emit('userDataDeleted', userId);
  }

  exportUserData(userId: string): UserDataExport {
    const userEvents = this.events.filter(event => event.userId === userId);
    const userSessions = Array.from(this.sessions.values())
      .filter(session => session.userId === userId);

    return {
      userId,
      exportDate: new Date(),
      events: userEvents,
      sessions: userSessions,
      totalEvents: userEvents.length,
      totalSessions: userSessions.length
    };
  }

  // Private Methods
  private shouldCollectEvent(eventType: string, eventData: Record<string, any>): boolean {
    // Respect Do Not Track
    if (this.config.privacy.respectDoNotTrack && navigator.doNotTrack === '1') {
      return false;
    }

    // Check if behavior data collection is enabled
    if (!this.config.privacy.collectBehaviorData) {
      return false;
    }

    // Check for personal data if not allowed
    if (!this.config.privacy.collectPersonalData && this.containsPersonalData(eventData)) {
      return false;
    }

    return true;
  }

  private shouldSampleEvent(): boolean {
    if (this.config.sampling.strategy === 'random') {
      return Math.random() < this.config.sampling.rate;
    } else {
      // Deterministic sampling based on timestamp
      return (Date.now() % 100) < (this.config.sampling.rate * 100);
    }
  }

  private sanitizeEventData(eventData: Record<string, any>): Record<string, any> {
    if (!this.config.privacy.collectPersonalData) {
      return this.removePersonalData(eventData);
    }
    return eventData;
  }

  private removePersonalData(data: Record<string, any>): Record<string, any> {
    const sanitized = { ...data };
    const personalDataKeys = ['email', 'name', 'phone', 'address', 'ip', 'userId'];
    
    personalDataKeys.forEach(key => {
      if (key in sanitized) {
        delete sanitized[key];
      }
    });

    return sanitized;
  }

  private containsPersonalData(data: Record<string, any>): boolean {
    const personalDataKeys = ['email', 'name', 'phone', 'address', 'ip'];
    return personalDataKeys.some(key => key in data);
  }

  private updateSession(event: UserEvent): void {
    const session = this.sessions.get(event.sessionId);
    if (!session) return;

    if (event.eventType === 'page_view') {
      session.pageViews++;
    } else if (event.eventType === 'user_interaction') {
      session.interactions++;
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.config.storage.flushInterval);
  }

  private flushEvents(): void {
    if (this.eventQueue.length === 0) return;

    const eventsToFlush = this.eventQueue.splice(0, this.config.storage.batchSize);
    
    if (this.config.storage.local) {
      this.storeEventsLocally(eventsToFlush);
    }
    
    if (this.config.storage.remote) {
      this.sendEventsToServer(eventsToFlush);
    }

    this.events.push(...eventsToFlush);
  }

  private storeEventsLocally(events: UserEvent[]): void {
    try {
      const existingEvents = JSON.parse(localStorage.getItem('analytics_events') || '[]');
      const allEvents = [...existingEvents, ...events];
      localStorage.setItem('analytics_events', JSON.stringify(allEvents));
    } catch (error) {
      console.warn('Failed to store events locally:', error);
    }
  }

  private sendEventsToServer(events: UserEvent[]): void {
    // Implementation would send events to analytics server
    this.emit('eventsBatched', events);
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `ses_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private hashUserId(userId: string): string {
    // Simple hash function for anonymization
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `anon_${Math.abs(hash).toString(36)}`;
  }

  private getCurrentPageUrl(): string {
    return typeof window !== 'undefined' ? window.location.href : '';
  }

  private getUserAgent(): string {
    return typeof navigator !== 'undefined' ? navigator.userAgent : '';
  }

  private getViewport(): { width: number; height: number } {
    if (typeof window !== 'undefined') {
      return {
        width: window.innerWidth,
        height: window.innerHeight
      };
    }
    return { width: 0, height: 0 };
  }

  private getEventsInRange(timeRange?: { start: Date; end: Date }): UserEvent[] {
    if (!timeRange) return this.events;
    
    return this.events.filter(event => 
      event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
    );
  }

  private analyzeUserFlows(events: UserEvent[]): BehaviorInsight[] {
    // Implementation for user flow analysis
    return [];
  }

  private analyzeFeatureUsage(events: UserEvent[]): BehaviorInsight[] {
    // Implementation for feature usage analysis
    return [];
  }

  private analyzePerformance(events: UserEvent[]): BehaviorInsight[] {
    // Implementation for performance analysis
    return [];
  }

  private analyzeErrorPatterns(events: UserEvent[]): BehaviorInsight[] {
    // Implementation for error pattern analysis
    return [];
  }

  private analyzeEngagement(events: UserEvent[]): BehaviorInsight[] {
    // Implementation for engagement analysis
    return [];
  }

  private buildUserJourney(events: UserEvent[]): UserJourney {
    // Implementation for building user journey
    return {
      userId: events[0]?.userId || '',
      sessionId: events[0]?.sessionId || '',
      steps: [],
      completed: false,
      totalDuration: 0,
      conversionEvents: []
    };
  }

  private calculateConversionRate(events: UserEvent[]): number {
    const conversionEvents = events.filter(e => e.eventType === 'conversion');
    const totalSessions = new Set(events.map(e => e.sessionId)).size;
    return totalSessions > 0 ? (conversionEvents.length / totalSessions) * 100 : 0;
  }

  private getImpactWeight(impact: string): number {
    switch (impact) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 1;
    }
  }
}

export interface EngagementMetrics {
  totalUsers: number;
  totalSessions: number;
  totalPageViews: number;
  totalInteractions: number;
  avgSessionDuration: number;
  bounceRate: number;
  engagementRate: number;
  conversionRate: number;
}

export interface UserDataExport {
  userId: string;
  exportDate: Date;
  events: UserEvent[];
  sessions: UserSession[];
  totalEvents: number;
  totalSessions: number;
}