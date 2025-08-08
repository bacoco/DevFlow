/**
 * Privacy-first user behavior tracking system
 * Tracks user interactions while respecting privacy preferences
 */

import { UserInteractionEvent, InteractionType, InteractionContext, PrivacyPreferences } from './types';

export class BehaviorTracker {
  private events: UserInteractionEvent[] = [];
  private sessionId: string;
  private userId: string;
  private privacyPreferences: PrivacyPreferences;
  private eventBuffer: UserInteractionEvent[] = [];
  private bufferFlushInterval: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 50;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds

  constructor(userId: string, privacyPreferences: PrivacyPreferences) {
    this.userId = userId;
    this.sessionId = this.generateSessionId();
    this.privacyPreferences = privacyPreferences;
    
    if (this.privacyPreferences.trackingEnabled) {
      this.startBufferFlush();
    }
  }

  /**
   * Track a user interaction event
   */
  trackInteraction(
    type: InteractionType,
    element: string,
    context: Partial<InteractionContext> = {},
    metadata: Record<string, any> = {},
    duration?: number
  ): void {
    if (!this.privacyPreferences.trackingEnabled) {
      return;
    }

    const event: UserInteractionEvent = {
      id: this.generateEventId(),
      userId: this.userId,
      sessionId: this.sessionId,
      type,
      element,
      timestamp: new Date(),
      duration,
      context: this.enrichContext(context),
      metadata: this.sanitizeMetadata(metadata)
    };

    this.eventBuffer.push(event);

    // For immediate access in tests and small buffers, flush immediately
    // In production, this would be buffered
    this.flushBuffer();
  }

  /**
   * Track click interactions
   */
  trackClick(element: string, context?: Partial<InteractionContext>, metadata?: Record<string, any>): void {
    this.trackInteraction('click', element, context, metadata);
  }

  /**
   * Track hover interactions with duration
   */
  trackHover(element: string, duration: number, context?: Partial<InteractionContext>): void {
    this.trackInteraction('hover', element, context, { duration }, duration);
  }

  /**
   * Track navigation events
   */
  trackNavigation(fromPage: string, toPage: string, context?: Partial<InteractionContext>): void {
    this.trackInteraction('navigation', `${fromPage} -> ${toPage}`, context, {
      fromPage,
      toPage
    });
  }

  /**
   * Track widget interactions
   */
  trackWidgetInteraction(
    widgetId: string,
    action: string,
    context?: Partial<InteractionContext>,
    metadata?: Record<string, any>
  ): void {
    this.trackInteraction('widget_interaction', widgetId, context, {
      action,
      ...metadata
    });
  }

  /**
   * Track search queries (anonymized)
   */
  trackSearch(query: string, resultsCount: number, context?: Partial<InteractionContext>): void {
    const anonymizedQuery = this.anonymizeSearchQuery(query);
    this.trackInteraction('search', 'global_search', context, {
      queryLength: query.length,
      queryType: this.categorizeQuery(query),
      resultsCount,
      anonymizedQuery: this.privacyPreferences.analyticsEnabled ? anonymizedQuery : null
    });
  }

  /**
   * Track preference changes
   */
  trackPreferenceChange(
    preferenceType: string,
    oldValue: any,
    newValue: any,
    context?: Partial<InteractionContext>
  ): void {
    this.trackInteraction('preference_change', preferenceType, context, {
      preferenceType,
      changed: true,
      // Don't store actual values for privacy
      valueType: typeof newValue
    });
  }

  /**
   * Get recent events for analysis
   */
  getRecentEvents(limit: number = 100): UserInteractionEvent[] {
    return [...this.events].slice(-limit);
  }

  /**
   * Get events by type
   */
  getEventsByType(type: InteractionType, limit: number = 50): UserInteractionEvent[] {
    return this.events
      .filter(event => event.type === type)
      .slice(-limit);
  }

  /**
   * Get session summary
   */
  getSessionSummary(): {
    sessionId: string;
    startTime: Date;
    duration: number;
    eventCount: number;
    uniqueElements: number;
    mostInteractedElements: Array<{ element: string; count: number }>;
  } {
    if (this.events.length === 0) {
      return {
        sessionId: this.sessionId,
        startTime: new Date(),
        duration: 0,
        eventCount: 0,
        uniqueElements: 0,
        mostInteractedElements: []
      };
    }

    const startTime = this.events[0].timestamp;
    const endTime = this.events[this.events.length - 1].timestamp;
    const duration = endTime.getTime() - startTime.getTime();

    const elementCounts = this.events.reduce((acc, event) => {
      acc[event.element] = (acc[event.element] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostInteractedElements = Object.entries(elementCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([element, count]) => ({ element, count }));

    return {
      sessionId: this.sessionId,
      startTime,
      duration,
      eventCount: this.events.length,
      uniqueElements: Object.keys(elementCounts).length,
      mostInteractedElements
    };
  }

  /**
   * Update privacy preferences
   */
  updatePrivacyPreferences(preferences: PrivacyPreferences): void {
    const wasTrackingEnabled = this.privacyPreferences.trackingEnabled;
    this.privacyPreferences = preferences;

    if (!preferences.trackingEnabled && wasTrackingEnabled) {
      // Stop tracking and clear data
      this.stopBufferFlush();
      this.clearData();
    } else if (preferences.trackingEnabled && !wasTrackingEnabled) {
      // Start tracking
      this.startBufferFlush();
    }
  }

  /**
   * Clear all tracking data
   */
  clearData(): void {
    this.events = [];
    this.eventBuffer = [];
  }

  /**
   * Destroy the tracker and clean up resources
   */
  destroy(): void {
    this.stopBufferFlush();
    this.flushBuffer();
    this.clearData();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private enrichContext(context: Partial<InteractionContext>): InteractionContext {
    const now = new Date();
    return {
      page: context.page || window.location.pathname,
      section: context.section || 'unknown',
      userRole: context.userRole || 'developer',
      deviceType: context.deviceType || this.detectDeviceType(),
      timeOfDay: context.timeOfDay || now.getHours(),
      dayOfWeek: context.dayOfWeek || now.getDay()
    };
  }

  private detectDeviceType(): 'desktop' | 'tablet' | 'mobile' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    // Remove potentially sensitive data
    const sanitized = { ...metadata };
    
    // Remove common sensitive keys
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'email', 'phone'];
    sensitiveKeys.forEach(key => {
      if (key in sanitized) {
        delete sanitized[key];
      }
    });

    // Limit string lengths to prevent data leakage
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 100) {
        sanitized[key] = sanitized[key].substring(0, 100) + '...';
      }
    });

    return sanitized;
  }

  private anonymizeSearchQuery(query: string): string {
    // Replace specific terms with categories
    const patterns = [
      { pattern: /\b\d+\b/g, replacement: '[NUMBER]' },
      { pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, replacement: '[EMAIL]' },
      { pattern: /\b\d{3}-\d{3}-\d{4}\b/g, replacement: '[PHONE]' },
      { pattern: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, replacement: '[NAME]' }
    ];

    let anonymized = query.toLowerCase();
    patterns.forEach(({ pattern, replacement }) => {
      anonymized = anonymized.replace(pattern, replacement);
    });

    return anonymized;
  }

  private categorizeQuery(query: string): string {
    const categories = [
      { pattern: /\b(error|bug|issue|problem)\b/i, category: 'troubleshooting' },
      { pattern: /\b(performance|speed|slow|fast)\b/i, category: 'performance' },
      { pattern: /\b(user|team|member|developer)\b/i, category: 'people' },
      { pattern: /\b(chart|graph|visualization|data)\b/i, category: 'analytics' },
      { pattern: /\b(setting|config|preference)\b/i, category: 'configuration' }
    ];

    for (const { pattern, category } of categories) {
      if (pattern.test(query)) {
        return category;
      }
    }

    return 'general';
  }

  private startBufferFlush(): void {
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
    }

    this.bufferFlushInterval = setInterval(() => {
      this.flushBuffer();
    }, this.FLUSH_INTERVAL);
  }

  private stopBufferFlush(): void {
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
      this.bufferFlushInterval = null;
    }
  }

  private flushBuffer(): void {
    if (this.eventBuffer.length === 0) {
      return;
    }

    // Move events from buffer to main storage
    this.events.push(...this.eventBuffer);
    this.eventBuffer = [];

    // Keep only recent events to prevent memory issues
    const maxEvents = 1000;
    if (this.events.length > maxEvents) {
      this.events = this.events.slice(-maxEvents);
    }

    // In a real implementation, this would send data to a server
    // For now, we'll just store it locally
    this.persistEvents();
  }

  /**
   * Force flush buffer immediately (for testing)
   */
  forceFlush(): void {
    this.flushBuffer();
  }

  private persistEvents(): void {
    if (!this.privacyPreferences.trackingEnabled) {
      return;
    }

    try {
      const recentEvents = this.events.slice(-100); // Only persist recent events
      localStorage.setItem(
        `behavior_events_${this.userId}`,
        JSON.stringify(recentEvents)
      );
    } catch (error) {
      console.warn('Failed to persist behavior events:', error);
    }
  }
}