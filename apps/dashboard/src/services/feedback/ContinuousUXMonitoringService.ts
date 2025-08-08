import {
  UsabilityAlert,
  UsabilityMetric,
  UsabilityMetricType,
  AlertDetails,
  AlertChannel,
  AlertConfig
} from './types'
import { userBehaviorAnalyticsService } from './UserBehaviorAnalyticsService'

/**
 * Service for continuous UX monitoring with automated alerts
 */
export class ContinuousUXMonitoringService {
  private alerts: Map<string, UsabilityAlert> = new Map()
  private monitoringInterval: NodeJS.Timeout | null = null
  private alertConfig: AlertConfig
  private thresholds: Map<UsabilityMetricType, number> = new Map()

  constructor() {
    this.alertConfig = {
      enabled: true,
      channels: [
        {
          type: 'email',
          config: { recipients: ['ux-team@company.com'] },
          enabled: true
        }
      ],
      thresholds: {
        'task-completion-rate': 85,
        'error-rate': 5,
        'bounce-rate': 70,
        'user-satisfaction': 3.5,
        'page-load-time': 3000
      },
      frequency: 'hourly'
    }
    
    this.initializeThresholds()
    this.startMonitoring()
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }

    const intervalMs = this.getIntervalMs()
    this.monitoringInterval = setInterval(() => {
      this.performMonitoringCheck()
    }, intervalMs)

    console.log(`UX monitoring started with ${this.alertConfig.frequency} frequency`)
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }

  /**
   * Update alert configuration
   */
  updateAlertConfig(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config }
    
    if (config.thresholds) {
      Object.entries(config.thresholds).forEach(([metric, threshold]) => {
        this.thresholds.set(metric as UsabilityMetricType, threshold)
      })
    }

    // Restart monitoring with new config
    if (this.alertConfig.enabled) {
      this.startMonitoring()
    } else {
      this.stopMonitoring()
    }
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): UsabilityAlert[] {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.resolvedAt)
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        return severityOrder[b.severity] - severityOrder[a.severity]
      })
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): void {
    const alert = this.alerts.get(alertId)
    if (alert && !alert.acknowledgedAt) {
      alert.acknowledgedAt = new Date()
      this.sendNotification('alert-acknowledged', {
        alert,
        acknowledgedBy
      })
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, resolvedBy: string, resolution: string): void {
    const alert = this.alerts.get(alertId)
    if (alert && !alert.resolvedAt) {
      alert.resolvedAt = new Date()
      this.sendNotification('alert-resolved', {
        alert,
        resolvedBy,
        resolution
      })
    }
  }

  /**
   * Manually trigger a monitoring check
   */
  async performMonitoringCheck(): Promise<void> {
    if (!this.alertConfig.enabled) {
      return
    }

    try {
      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        end: new Date()
      }

      const dashboardData = await userBehaviorAnalyticsService.getDashboardData(timeRange)
      
      // Check each metric against thresholds
      for (const metric of dashboardData.usabilityMetrics) {
        await this.checkMetricThreshold(metric, timeRange)
      }

      // Check for anomalies
      await this.detectAnomalies(dashboardData.usabilityMetrics, timeRange)

      // Check for trend changes
      await this.detectTrendChanges(dashboardData.trends, timeRange)

      console.log(`UX monitoring check completed. Active alerts: ${this.getActiveAlerts().length}`)
    } catch (error) {
      console.error('Error during UX monitoring check:', error)
      this.createSystemAlert('monitoring-error', 'medium', 'UX monitoring check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get monitoring health status
   */
  getMonitoringHealth(): {
    isRunning: boolean
    lastCheck: Date | null
    alertCount: number
    criticalAlerts: number
    systemHealth: 'healthy' | 'warning' | 'critical'
  } {
    const activeAlerts = this.getActiveAlerts()
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical').length
    
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (criticalAlerts > 0) {
      systemHealth = 'critical'
    } else if (activeAlerts.length > 5) {
      systemHealth = 'warning'
    }

    return {
      isRunning: this.monitoringInterval !== null,
      lastCheck: new Date(), // Would track actual last check time
      alertCount: activeAlerts.length,
      criticalAlerts,
      systemHealth
    }
  }

  /**
   * Generate monitoring report
   */
  async generateMonitoringReport(timeRange: { start: Date; end: Date }): Promise<{
    summary: {
      totalAlerts: number
      resolvedAlerts: number
      averageResolutionTime: number
      topIssues: string[]
    }
    metrics: UsabilityMetric[]
    recommendations: string[]
  }> {
    const alertsInRange = Array.from(this.alerts.values())
      .filter(alert => alert.createdAt >= timeRange.start && alert.createdAt <= timeRange.end)
    
    const resolvedAlerts = alertsInRange.filter(alert => alert.resolvedAt)
    const averageResolutionTime = resolvedAlerts.length > 0
      ? resolvedAlerts.reduce((sum, alert) => {
          const resolutionTime = alert.resolvedAt!.getTime() - alert.createdAt.getTime()
          return sum + resolutionTime
        }, 0) / resolvedAlerts.length
      : 0

    const topIssues = this.getTopIssues(alertsInRange)
    const dashboardData = await userBehaviorAnalyticsService.getDashboardData(timeRange)
    const recommendations = this.generateRecommendations(alertsInRange, dashboardData.usabilityMetrics)

    return {
      summary: {
        totalAlerts: alertsInRange.length,
        resolvedAlerts: resolvedAlerts.length,
        averageResolutionTime,
        topIssues
      },
      metrics: dashboardData.usabilityMetrics,
      recommendations
    }
  }

  private async checkMetricThreshold(metric: UsabilityMetric, timeRange: { start: Date; end: Date }): Promise<void> {
    const threshold = this.thresholds.get(metric.type)
    if (!threshold) return

    const isThresholdBreached = this.isThresholdBreached(metric, threshold)
    
    if (isThresholdBreached) {
      const existingAlert = Array.from(this.alerts.values())
        .find(alert => 
          alert.metric === metric.type && 
          !alert.resolvedAt &&
          alert.type === 'threshold-breach'
        )

      if (!existingAlert) {
        await this.createAlert({
          type: 'threshold-breach',
          severity: this.calculateSeverity(metric, threshold),
          metric: metric.type,
          message: `${metric.type} has breached threshold`,
          details: {
            currentValue: metric.value,
            threshold,
            previousValue: metric.value * 0.95, // Simplified
            trend: metric.value > threshold ? 'declining' : 'improving',
            affectedUsers: this.estimateAffectedUsers(metric),
            suggestedActions: this.getSuggestedActions(metric.type)
          }
        })
      }
    } else {
      // Check if we should resolve existing alerts
      const existingAlert = Array.from(this.alerts.values())
        .find(alert => 
          alert.metric === metric.type && 
          !alert.resolvedAt &&
          alert.type === 'threshold-breach'
        )

      if (existingAlert) {
        this.resolveAlert(existingAlert.id, 'system', 'Metric returned to normal levels')
      }
    }
  }

  private async detectAnomalies(metrics: UsabilityMetric[], timeRange: { start: Date; end: Date }): Promise<void> {
    for (const metric of metrics) {
      const anomaly = await this.detectMetricAnomaly(metric, timeRange)
      
      if (anomaly) {
        await this.createAlert({
          type: 'anomaly-detected',
          severity: anomaly.severity,
          metric: metric.type,
          message: `Anomaly detected in ${metric.type}`,
          details: {
            currentValue: metric.value,
            threshold: anomaly.expectedValue,
            previousValue: anomaly.expectedValue,
            trend: anomaly.trend,
            affectedUsers: this.estimateAffectedUsers(metric),
            suggestedActions: [`Investigate ${metric.type} anomaly`, 'Check for system issues', 'Review recent changes']
          }
        })
      }
    }
  }

  private async detectTrendChanges(trends: any[], timeRange: { start: Date; end: Date }): Promise<void> {
    for (const trend of trends) {
      if (Math.abs(trend.changePercent) > 20) { // Significant change
        const severity = Math.abs(trend.changePercent) > 50 ? 'high' : 'medium'
        
        await this.createAlert({
          type: 'trend-change',
          severity,
          metric: trend.metric as UsabilityMetricType,
          message: `Significant trend change in ${trend.metric}`,
          details: {
            currentValue: trend.current,
            threshold: trend.previous,
            previousValue: trend.previous,
            trend: trend.direction === 'up' ? 'improving' : 'declining',
            affectedUsers: 0, // Would calculate based on metric
            suggestedActions: this.getSuggestedActions(trend.metric)
          }
        })
      }
    }
  }

  private async createAlert(alertData: {
    type: 'threshold-breach' | 'trend-change' | 'anomaly-detected'
    severity: 'low' | 'medium' | 'high' | 'critical'
    metric: UsabilityMetricType
    message: string
    details: AlertDetails
  }): Promise<void> {
    const alert: UsabilityAlert = {
      id: this.generateAlertId(),
      type: alertData.type,
      severity: alertData.severity,
      metric: alertData.metric,
      message: alertData.message,
      details: alertData.details,
      createdAt: new Date()
    }

    this.alerts.set(alert.id, alert)
    
    // Send notifications
    await this.sendAlertNotifications(alert)
    
    console.log(`Created UX alert: ${alert.message} (${alert.severity})`)
  }

  private createSystemAlert(type: string, severity: 'low' | 'medium' | 'high' | 'critical', message: string, metadata: any): void {
    const alert: UsabilityAlert = {
      id: this.generateAlertId(),
      type: 'anomaly-detected', // System alerts as anomalies
      severity,
      metric: 'error-rate', // Default metric for system alerts
      message,
      details: {
        currentValue: 0,
        threshold: 0,
        trend: 'stable',
        affectedUsers: 0,
        suggestedActions: ['Check system logs', 'Verify monitoring configuration']
      },
      createdAt: new Date()
    }

    this.alerts.set(alert.id, alert)
  }

  private async sendAlertNotifications(alert: UsabilityAlert): Promise<void> {
    for (const channel of this.alertConfig.channels) {
      if (!channel.enabled) continue

      try {
        await this.sendNotification('new-alert', { alert }, channel)
      } catch (error) {
        console.error(`Failed to send alert notification via ${channel.type}:`, error)
      }
    }
  }

  private async sendNotification(type: string, data: any, channel?: AlertChannel): Promise<void> {
    const channels = channel ? [channel] : this.alertConfig.channels.filter(c => c.enabled)
    
    for (const ch of channels) {
      switch (ch.type) {
        case 'email':
          await this.sendEmailNotification(type, data, ch.config)
          break
        case 'slack':
          await this.sendSlackNotification(type, data, ch.config)
          break
        case 'webhook':
          await this.sendWebhookNotification(type, data, ch.config)
          break
      }
    }
  }

  private async sendEmailNotification(type: string, data: any, config: any): Promise<void> {
    // Email notification implementation
    console.log(`Email notification (${type}):`, data)
  }

  private async sendSlackNotification(type: string, data: any, config: any): Promise<void> {
    // Slack notification implementation
    console.log(`Slack notification (${type}):`, data)
  }

  private async sendWebhookNotification(type: string, data: any, config: any): Promise<void> {
    // Webhook notification implementation
    console.log(`Webhook notification (${type}):`, data)
  }

  private isThresholdBreached(metric: UsabilityMetric, threshold: number): boolean {
    switch (metric.type) {
      case 'task-completion-rate':
      case 'user-satisfaction':
        return metric.value < threshold
      case 'error-rate':
      case 'bounce-rate':
      case 'page-load-time':
      case 'interaction-response-time':
        return metric.value > threshold
      default:
        return false
    }
  }

  private calculateSeverity(metric: UsabilityMetric, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
    const deviation = Math.abs(metric.value - threshold) / threshold
    
    if (deviation > 0.5) return 'critical'
    if (deviation > 0.3) return 'high'
    if (deviation > 0.1) return 'medium'
    return 'low'
  }

  private estimateAffectedUsers(metric: UsabilityMetric): number {
    // Simplified estimation - would use actual user data
    return Math.floor(Math.random() * 1000) + 100
  }

  private getSuggestedActions(metricType: UsabilityMetricType): string[] {
    const actions: Record<UsabilityMetricType, string[]> = {
      'task-completion-rate': [
        'Review task flow for friction points',
        'Conduct user testing on problematic tasks',
        'Simplify complex workflows'
      ],
      'error-rate': [
        'Review error logs for common issues',
        'Improve error handling and messaging',
        'Add validation to prevent errors'
      ],
      'bounce-rate': [
        'Improve page loading speed',
        'Review content relevance and clarity',
        'Optimize landing page experience'
      ],
      'user-satisfaction': [
        'Collect detailed user feedback',
        'Review recent feature changes',
        'Conduct satisfaction surveys'
      ],
      'page-load-time': [
        'Optimize images and assets',
        'Review server performance',
        'Implement caching strategies'
      ],
      'interaction-response-time': [
        'Optimize JavaScript performance',
        'Review database queries',
        'Implement loading states'
      ],
      'feature-adoption-rate': [
        'Improve feature discoverability',
        'Add onboarding for new features',
        'Review feature value proposition'
      ],
      'nps-score': [
        'Analyze NPS feedback comments',
        'Focus on detractor concerns',
        'Enhance promoter experience'
      ],
      'csat-score': [
        'Review feature-specific satisfaction',
        'Improve user support resources',
        'Address common pain points'
      ],
      'task-completion-time': [
        'Streamline task workflows',
        'Remove unnecessary steps',
        'Improve interface efficiency'
      ]
    }

    return actions[metricType] || ['Review metric and investigate causes']
  }

  private async detectMetricAnomaly(metric: UsabilityMetric, timeRange: { start: Date; end: Date }): Promise<{
    severity: 'low' | 'medium' | 'high' | 'critical'
    expectedValue: number
    trend: 'improving' | 'declining' | 'stable'
  } | null> {
    // Simplified anomaly detection - would use more sophisticated algorithms
    const expectedValue = metric.value * 0.95 // Simplified baseline
    const deviation = Math.abs(metric.value - expectedValue) / expectedValue
    
    if (deviation > 0.3) {
      return {
        severity: deviation > 0.5 ? 'critical' : 'high',
        expectedValue,
        trend: metric.value > expectedValue ? 'improving' : 'declining'
      }
    }
    
    return null
  }

  private getTopIssues(alerts: UsabilityAlert[]): string[] {
    const issueCount = new Map<string, number>()
    
    alerts.forEach(alert => {
      const issue = alert.metric
      issueCount.set(issue, (issueCount.get(issue) || 0) + 1)
    })
    
    return Array.from(issueCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue]) => issue)
  }

  private generateRecommendations(alerts: UsabilityAlert[], metrics: UsabilityMetric[]): string[] {
    const recommendations: string[] = []
    
    // High-level recommendations based on alert patterns
    const criticalAlerts = alerts.filter(a => a.severity === 'critical')
    if (criticalAlerts.length > 0) {
      recommendations.push('Address critical UX issues immediately to prevent user churn')
    }
    
    const errorRateMetric = metrics.find(m => m.type === 'error-rate')
    if (errorRateMetric && errorRateMetric.value > 5) {
      recommendations.push('Focus on error reduction through better validation and error handling')
    }
    
    const bounceRateMetric = metrics.find(m => m.type === 'bounce-rate')
    if (bounceRateMetric && bounceRateMetric.value > 70) {
      recommendations.push('Improve landing page experience and content relevance')
    }
    
    return recommendations
  }

  private initializeThresholds(): void {
    Object.entries(this.alertConfig.thresholds).forEach(([metric, threshold]) => {
      this.thresholds.set(metric as UsabilityMetricType, threshold)
    })
  }

  private getIntervalMs(): number {
    switch (this.alertConfig.frequency) {
      case 'immediate':
        return 5 * 60 * 1000 // 5 minutes
      case 'hourly':
        return 60 * 60 * 1000 // 1 hour
      case 'daily':
        return 24 * 60 * 60 * 1000 // 24 hours
      default:
        return 60 * 60 * 1000 // 1 hour default
    }
  }

  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

export const continuousUXMonitoringService = new ContinuousUXMonitoringService()