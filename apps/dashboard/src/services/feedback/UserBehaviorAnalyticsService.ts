import {
  UserBehaviorEvent,
  BehaviorEventType,
  UsabilityMetric,
  UsabilityMetricType,
  FeatureUsageData,
  UsageTrend,
  UXDashboardData,
  UXOverview,
  UXTrend,
  MetricContext
} from './types'

/**
 * Service for analyzing user behavior and generating UX insights
 */
export class UserBehaviorAnalyticsService {
  private events: UserBehaviorEvent[] = []
  private metrics: Map<string, UsabilityMetric> = new Map()
  private featureUsage: Map<string, FeatureUsageData> = new Map()

  constructor() {
    this.initializeMetrics()
  }

  /**
   * Add a behavior event for analysis
   */
  addEvent(event: UserBehaviorEvent): void {
    this.events.push(event)
    this.updateMetrics(event)
    this.updateFeatureUsage(event)
    
    // Keep only recent events in memory (last 10000)
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000)
    }
  }

  /**
   * Get comprehensive UX dashboard data
   */
  async getDashboardData(timeRange: { start: Date; end: Date }): Promise<UXDashboardData> {
    const filteredEvents = this.getEventsInRange(timeRange)
    
    return {
      overview: this.calculateOverview(filteredEvents, timeRange),
      usabilityMetrics: Array.from(this.metrics.values()),
      featureUsage: Array.from(this.featureUsage.values()),
      satisfaction: await this.getSatisfactionMetrics(timeRange),
      recentFeedback: await this.getRecentFeedback(10),
      alerts: await this.getActiveAlerts(),
      trends: this.calculateTrends(timeRange)
    }
  }

  /**
   * Calculate task completion rate
   */
  calculateTaskCompletionRate(taskType: string, timeRange: { start: Date; end: Date }): number {
    const events = this.getEventsInRange(timeRange)
    const taskStarts = events.filter(e => e.type === 'click' && e.element.includes(taskType))
    const taskCompletions = events.filter(e => e.type === 'task-completion' && e.element.includes(taskType))
    
    if (taskStarts.length === 0) return 0
    return (taskCompletions.length / taskStarts.length) * 100
  }

  /**
   * Calculate average task completion time
   */
  calculateAverageTaskTime(taskType: string, timeRange: { start: Date; end: Date }): number {
    const events = this.getEventsInRange(timeRange)
    const taskSessions = this.groupEventsBySession(events)
    const taskTimes: number[] = []
    
    for (const sessionEvents of taskSessions.values()) {
      const taskStart = sessionEvents.find(e => e.element.includes(taskType) && e.type === 'click')
      const taskEnd = sessionEvents.find(e => e.element.includes(taskType) && e.type === 'task-completion')
      
      if (taskStart && taskEnd) {
        taskTimes.push(taskEnd.timestamp.getTime() - taskStart.timestamp.getTime())
      }
    }
    
    if (taskTimes.length === 0) return 0
    return taskTimes.reduce((sum, time) => sum + time, 0) / taskTimes.length
  }

  /**
   * Calculate error rate
   */
  calculateErrorRate(timeRange: { start: Date; end: Date }): number {
    const events = this.getEventsInRange(timeRange)
    const totalInteractions = events.filter(e => ['click', 'form-submit', 'search'].includes(e.type)).length
    const errors = events.filter(e => e.type === 'error').length
    
    if (totalInteractions === 0) return 0
    return (errors / totalInteractions) * 100
  }

  /**
   * Calculate bounce rate
   */
  calculateBounceRate(timeRange: { start: Date; end: Date }): number {
    const events = this.getEventsInRange(timeRange)
    const sessions = this.groupEventsBySession(events)
    let bounces = 0
    
    for (const sessionEvents of sessions.values()) {
      const pageViews = sessionEvents.filter(e => e.type === 'page-view')
      const interactions = sessionEvents.filter(e => ['click', 'scroll', 'form-submit'].includes(e.type))
      
      // Consider it a bounce if only one page view and minimal interactions
      if (pageViews.length === 1 && interactions.length < 2) {
        bounces++
      }
    }
    
    return sessions.size === 0 ? 0 : (bounces / sessions.size) * 100
  }

  /**
   * Get feature adoption rates
   */
  getFeatureAdoptionRates(timeRange: { start: Date; end: Date }): Map<string, number> {
    const events = this.getEventsInRange(timeRange)
    const uniqueUsers = new Set(events.map(e => e.userId).filter(Boolean))
    const featureUsers = new Map<string, Set<string>>()
    
    events.forEach(event => {
      if (event.userId && event.type === 'feature-discovery') {
        if (!featureUsers.has(event.element)) {
          featureUsers.set(event.element, new Set())
        }
        featureUsers.get(event.element)!.add(event.userId)
      }
    })
    
    const adoptionRates = new Map<string, number>()
    for (const [feature, users] of featureUsers.entries()) {
      const rate = uniqueUsers.size === 0 ? 0 : (users.size / uniqueUsers.size) * 100
      adoptionRates.set(feature, rate)
    }
    
    return adoptionRates
  }

  /**
   * Analyze user journey patterns
   */
  analyzeUserJourneys(timeRange: { start: Date; end: Date }): Map<string, number> {
    const events = this.getEventsInRange(timeRange)
    const sessions = this.groupEventsBySession(events)
    const journeyPatterns = new Map<string, number>()
    
    for (const sessionEvents of sessions.values()) {
      const pageSequence = sessionEvents
        .filter(e => e.type === 'page-view')
        .map(e => e.page)
        .join(' -> ')
      
      if (pageSequence) {
        journeyPatterns.set(pageSequence, (journeyPatterns.get(pageSequence) || 0) + 1)
      }
    }
    
    return journeyPatterns
  }

  /**
   * Get user engagement metrics
   */
  getUserEngagementMetrics(timeRange: { start: Date; end: Date }): {
    averageSessionDuration: number
    pagesPerSession: number
    interactionsPerSession: number
    returnVisitorRate: number
  } {
    const events = this.getEventsInRange(timeRange)
    const sessions = this.groupEventsBySession(events)
    
    let totalDuration = 0
    let totalPages = 0
    let totalInteractions = 0
    const userSessions = new Map<string, number>()
    
    for (const [sessionId, sessionEvents] of sessions.entries()) {
      const duration = this.calculateSessionDuration(sessionEvents)
      const pages = new Set(sessionEvents.map(e => e.page)).size
      const interactions = sessionEvents.filter(e => 
        ['click', 'scroll', 'form-submit', 'search'].includes(e.type)
      ).length
      
      totalDuration += duration
      totalPages += pages
      totalInteractions += interactions
      
      const userId = sessionEvents[0]?.userId
      if (userId) {
        userSessions.set(userId, (userSessions.get(userId) || 0) + 1)
      }
    }
    
    const sessionCount = sessions.size
    const returningUsers = Array.from(userSessions.values()).filter(count => count > 1).length
    const totalUsers = userSessions.size
    
    return {
      averageSessionDuration: sessionCount === 0 ? 0 : totalDuration / sessionCount,
      pagesPerSession: sessionCount === 0 ? 0 : totalPages / sessionCount,
      interactionsPerSession: sessionCount === 0 ? 0 : totalInteractions / sessionCount,
      returnVisitorRate: totalUsers === 0 ? 0 : (returningUsers / totalUsers) * 100
    }
  }

  /**
   * Identify usability issues
   */
  identifyUsabilityIssues(timeRange: { start: Date; end: Date }): Array<{
    type: string
    severity: 'low' | 'medium' | 'high'
    description: string
    affectedUsers: number
    frequency: number
  }> {
    const events = this.getEventsInRange(timeRange)
    const issues: Array<{
      type: string
      severity: 'low' | 'medium' | 'high'
      description: string
      affectedUsers: number
      frequency: number
    }> = []
    
    // High error rate
    const errorRate = this.calculateErrorRate(timeRange)
    if (errorRate > 5) {
      issues.push({
        type: 'high-error-rate',
        severity: errorRate > 10 ? 'high' : 'medium',
        description: `Error rate is ${errorRate.toFixed(1)}%, which is above the 5% threshold`,
        affectedUsers: new Set(events.filter(e => e.type === 'error').map(e => e.userId)).size,
        frequency: events.filter(e => e.type === 'error').length
      })
    }
    
    // High bounce rate
    const bounceRate = this.calculateBounceRate(timeRange)
    if (bounceRate > 60) {
      issues.push({
        type: 'high-bounce-rate',
        severity: bounceRate > 80 ? 'high' : 'medium',
        description: `Bounce rate is ${bounceRate.toFixed(1)}%, indicating users are leaving quickly`,
        affectedUsers: Math.floor(bounceRate / 100 * new Set(events.map(e => e.userId)).size),
        frequency: Math.floor(bounceRate)
      })
    }
    
    // Low feature adoption
    const adoptionRates = this.getFeatureAdoptionRates(timeRange)
    for (const [feature, rate] of adoptionRates.entries()) {
      if (rate < 20) {
        issues.push({
          type: 'low-feature-adoption',
          severity: rate < 10 ? 'high' : 'medium',
          description: `Feature "${feature}" has low adoption rate of ${rate.toFixed(1)}%`,
          affectedUsers: new Set(events.map(e => e.userId)).size - Math.floor(rate / 100 * new Set(events.map(e => e.userId)).size),
          frequency: Math.floor(rate)
        })
      }
    }
    
    return issues.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })
  }

  private initializeMetrics(): void {
    const metricTypes: UsabilityMetricType[] = [
      'task-completion-rate',
      'task-completion-time',
      'error-rate',
      'bounce-rate',
      'feature-adoption-rate',
      'user-satisfaction',
      'page-load-time',
      'interaction-response-time'
    ]
    
    metricTypes.forEach(type => {
      this.metrics.set(type, {
        id: `metric-${type}`,
        type,
        value: 0,
        threshold: this.getDefaultThreshold(type),
        status: 'good',
        timestamp: new Date(),
        context: {
          timeRange: { start: new Date(), end: new Date() },
          sampleSize: 0
        }
      })
    })
  }

  private getDefaultThreshold(type: UsabilityMetricType): number {
    const thresholds: Record<UsabilityMetricType, number> = {
      'task-completion-rate': 90,
      'task-completion-time': 30000, // 30 seconds
      'error-rate': 5,
      'bounce-rate': 60,
      'feature-adoption-rate': 50,
      'user-satisfaction': 4.0,
      'nps-score': 50,
      'csat-score': 4.0,
      'page-load-time': 3000, // 3 seconds
      'interaction-response-time': 100 // 100ms
    }
    
    return thresholds[type] || 0
  }

  private updateMetrics(event: UserBehaviorEvent): void {
    // Update relevant metrics based on event type
    switch (event.type) {
      case 'error':
        this.updateErrorRateMetric()
        break
      case 'task-completion':
        this.updateTaskCompletionMetrics()
        break
      case 'page-view':
        this.updateBounceRateMetric()
        break
    }
  }

  private updateErrorRateMetric(): void {
    const timeRange = { start: new Date(Date.now() - 24 * 60 * 60 * 1000), end: new Date() }
    const errorRate = this.calculateErrorRate(timeRange)
    
    const metric = this.metrics.get('error-rate')!
    metric.value = errorRate
    metric.status = errorRate > metric.threshold ? 'critical' : 'good'
    metric.timestamp = new Date()
  }

  private updateTaskCompletionMetrics(): void {
    const timeRange = { start: new Date(Date.now() - 24 * 60 * 60 * 1000), end: new Date() }
    const completionRate = this.calculateTaskCompletionRate('task', timeRange)
    
    const metric = this.metrics.get('task-completion-rate')!
    metric.value = completionRate
    metric.status = completionRate < metric.threshold ? 'warning' : 'good'
    metric.timestamp = new Date()
  }

  private updateBounceRateMetric(): void {
    const timeRange = { start: new Date(Date.now() - 24 * 60 * 60 * 1000), end: new Date() }
    const bounceRate = this.calculateBounceRate(timeRange)
    
    const metric = this.metrics.get('bounce-rate')!
    metric.value = bounceRate
    metric.status = bounceRate > metric.threshold ? 'warning' : 'good'
    metric.timestamp = new Date()
  }

  private updateFeatureUsage(event: UserBehaviorEvent): void {
    if (event.type === 'feature-discovery' || event.type === 'click') {
      const featureId = event.element
      let usage = this.featureUsage.get(featureId)
      
      if (!usage) {
        usage = {
          featureId,
          featureName: featureId,
          category: 'general',
          usageCount: 0,
          uniqueUsers: 0,
          averageSessionsPerUser: 0,
          retentionRate: 0,
          adoptionRate: 0,
          timeToFirstUse: 0,
          lastUsed: new Date(),
          trends: []
        }
        this.featureUsage.set(featureId, usage)
      }
      
      usage.usageCount++
      usage.lastUsed = event.timestamp
      
      // Update unique users (simplified)
      if (event.userId) {
        usage.uniqueUsers = new Set([...Array(usage.uniqueUsers), event.userId]).size
      }
    }
  }

  private getEventsInRange(timeRange: { start: Date; end: Date }): UserBehaviorEvent[] {
    return this.events.filter(event => 
      event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
    )
  }

  private groupEventsBySession(events: UserBehaviorEvent[]): Map<string, UserBehaviorEvent[]> {
    const sessions = new Map<string, UserBehaviorEvent[]>()
    
    events.forEach(event => {
      if (!sessions.has(event.sessionId)) {
        sessions.set(event.sessionId, [])
      }
      sessions.get(event.sessionId)!.push(event)
    })
    
    return sessions
  }

  private calculateSessionDuration(events: UserBehaviorEvent[]): number {
    if (events.length === 0) return 0
    
    const sortedEvents = events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    const start = sortedEvents[0].timestamp.getTime()
    const end = sortedEvents[sortedEvents.length - 1].timestamp.getTime()
    
    return end - start
  }

  private calculateOverview(events: UserBehaviorEvent[], timeRange: { start: Date; end: Date }): UXOverview {
    const uniqueUsers = new Set(events.map(e => e.userId).filter(Boolean))
    const sessions = this.groupEventsBySession(events)
    const engagement = this.getUserEngagementMetrics(timeRange)
    
    return {
      totalUsers: uniqueUsers.size,
      activeUsers: uniqueUsers.size, // Simplified
      newUsers: Math.floor(uniqueUsers.size * 0.3), // Estimated
      retentionRate: engagement.returnVisitorRate,
      averageSessionDuration: engagement.averageSessionDuration,
      bounceRate: this.calculateBounceRate(timeRange),
      errorRate: this.calculateErrorRate(timeRange),
      satisfactionScore: 4.2 // Would come from actual satisfaction data
    }
  }

  private calculateTrends(timeRange: { start: Date; end: Date }): UXTrend[] {
    // Simplified trend calculation
    const currentMetrics = Array.from(this.metrics.values())
    
    return currentMetrics.map(metric => ({
      metric: metric.type,
      current: metric.value,
      previous: metric.value * 0.95, // Simulated previous value
      change: metric.value * 0.05,
      changePercent: 5,
      direction: 'up' as const,
      isGood: metric.status === 'good'
    }))
  }

  private async getSatisfactionMetrics(timeRange: { start: Date; end: Date }) {
    // This would integrate with actual satisfaction data
    return {
      nps: {
        score: 45,
        responseCount: 150,
        distribution: { detractors: 20, passives: 80, promoters: 50 },
        trend: 5
      },
      csat: {
        averageScore: 4.2,
        responseCount: 200,
        distribution: { 1: 5, 2: 10, 3: 25, 4: 80, 5: 80 },
        byFeature: { 'dashboard': 4.3, 'charts': 4.1, 'navigation': 4.4 }
      },
      period: timeRange
    }
  }

  private async getRecentFeedback(limit: number) {
    // This would fetch from actual feedback storage
    return []
  }

  private async getActiveAlerts() {
    // This would fetch from alert system
    return []
  }
}

export const userBehaviorAnalyticsService = new UserBehaviorAnalyticsService()