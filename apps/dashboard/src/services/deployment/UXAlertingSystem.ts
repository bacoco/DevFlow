/**
 * UX Alerting System for Production Monitoring
 * Monitors UX metrics and sends alerts for issues and performance regressions
 */

export interface AlertRule {
  id: string
  name: string
  description: string
  enabled: boolean
  severity: 'info' | 'warning' | 'error' | 'critical'
  category: 'performance' | 'usability' | 'accessibility' | 'satisfaction' | 'error'
  conditions: AlertCondition[]
  actions: AlertAction[]
  cooldownMinutes: number
  escalationRules: EscalationRule[]
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

export interface AlertCondition {
  metric: string
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'change_percent' | 'anomaly'
  threshold: number
  timeWindow: number // minutes
  aggregation: 'avg' | 'max' | 'min' | 'sum' | 'count'
  minimumSamples: number
}

export interface AlertAction {
  type: 'email' | 'slack' | 'webhook' | 'dashboard' | 'pagerduty' | 'rollback'
  configuration: Record<string, any>
  enabled: boolean
}

export interface EscalationRule {
  afterMinutes: number
  actions: AlertAction[]
  condition?: 'unresolved' | 'worsening'
}

export interface Alert {
  id: string
  ruleId: string
  ruleName: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  category: string
  title: string
  description: string
  triggeredAt: Date
  resolvedAt?: Date
  status: 'active' | 'resolved' | 'suppressed' | 'escalated'
  metrics: AlertMetricData[]
  actions: AlertActionExecution[]
  escalations: AlertEscalation[]
  tags: string[]
  context: AlertContext
}

export interface AlertMetricData {
  metric: string
  value: number
  threshold: number
  previousValue?: number
  trend: 'improving' | 'stable' | 'degrading'
  timestamp: Date
}

export interface AlertActionExecution {
  actionType: string
  executedAt: Date
  status: 'success' | 'failed' | 'pending'
  error?: string
  response?: any
}

export interface AlertEscalation {
  level: number
  triggeredAt: Date
  actions: AlertActionExecution[]
}

export interface AlertContext {
  deploymentVersion?: string
  featureFlags?: string[]
  userSegment?: string
  geographicRegion?: string
  deviceType?: string
  additionalData?: Record<string, any>
}

export interface MetricSnapshot {
  timestamp: Date
  metrics: Record<string, number>
  context: AlertContext
}

export class UXAlertingSystem {
  private alertRules: Map<string, AlertRule> = new Map()
  private activeAlerts: Map<string, Alert> = new Map()
  private alertHistory: Alert[] = []
  private metricsBuffer: MetricSnapshot[] = []
  private monitoringInterval: NodeJS.Timeout | null = null
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor() {
    this.initializeDefaultRules()
    this.startMonitoring()
  }

  /**
   * Start monitoring metrics and checking alert rules
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }

    this.monitoringInterval = setInterval(async () => {
      await this.checkAlertRules()
    }, 30000) // Check every 30 seconds

    console.log('UX alerting system monitoring started')
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    // Clear escalation timers
    this.escalationTimers.forEach(timer => clearTimeout(timer))
    this.escalationTimers.clear()

    console.log('UX alerting system monitoring stopped')
  }

  /**
   * Add metric data point
   */
  addMetricSnapshot(snapshot: MetricSnapshot): void {
    this.metricsBuffer.push(snapshot)

    // Keep only last 24 hours of data
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
    this.metricsBuffer = this.metricsBuffer.filter(s => s.timestamp > cutoffTime)
  }

  /**
   * Create a new alert rule
   */
  async createAlertRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AlertRule> {
    const newRule: AlertRule = {
      ...rule,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.alertRules.set(newRule.id, newRule)
    console.log(`Created alert rule: ${newRule.name}`)

    return newRule
  }

  /**
   * Update an alert rule
   */
  async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<AlertRule | null> {
    const rule = this.alertRules.get(ruleId)
    if (!rule) return null

    const updatedRule: AlertRule = {
      ...rule,
      ...updates,
      updatedAt: new Date()
    }

    this.alertRules.set(ruleId, updatedRule)
    console.log(`Updated alert rule: ${updatedRule.name}`)

    return updatedRule
  }

  /**
   * Delete an alert rule
   */
  async deleteAlertRule(ruleId: string): Promise<boolean> {
    const rule = this.alertRules.get(ruleId)
    if (!rule) return false

    this.alertRules.delete(ruleId)
    
    // Resolve any active alerts for this rule
    const activeAlertsForRule = Array.from(this.activeAlerts.values())
      .filter(alert => alert.ruleId === ruleId)
    
    for (const alert of activeAlertsForRule) {
      await this.resolveAlert(alert.id, 'Rule deleted')
    }

    console.log(`Deleted alert rule: ${rule.name}`)
    return true
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values())
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values())
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
      .slice(0, limit)
  }

  /**
   * Resolve an alert manually
   */
  async resolveAlert(alertId: string, reason: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId)
    if (!alert) return false

    alert.status = 'resolved'
    alert.resolvedAt = new Date()
    alert.context.additionalData = {
      ...alert.context.additionalData,
      resolutionReason: reason
    }

    this.activeAlerts.delete(alertId)
    this.alertHistory.push(alert)

    // Clear escalation timer
    const escalationTimer = this.escalationTimers.get(alertId)
    if (escalationTimer) {
      clearTimeout(escalationTimer)
      this.escalationTimers.delete(alertId)
    }

    console.log(`Resolved alert: ${alert.title}`)
    return true
  }

  /**
   * Suppress an alert
   */
  async suppressAlert(alertId: string, durationMinutes: number): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId)
    if (!alert) return false

    alert.status = 'suppressed'
    
    // Auto-reactivate after suppression period
    setTimeout(() => {
      if (this.activeAlerts.has(alertId)) {
        alert.status = 'active'
        console.log(`Alert suppression expired: ${alert.title}`)
      }
    }, durationMinutes * 60 * 1000)

    console.log(`Suppressed alert for ${durationMinutes} minutes: ${alert.title}`)
    return true
  }

  /**
   * Check all alert rules against current metrics
   */
  private async checkAlertRules(): Promise<void> {
    if (this.metricsBuffer.length === 0) return

    const currentSnapshot = this.metricsBuffer[this.metricsBuffer.length - 1]

    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue

      try {
        await this.evaluateAlertRule(rule, currentSnapshot)
      } catch (error) {
        console.error(`Error evaluating alert rule ${rule.name}:`, error)
      }
    }
  }

  /**
   * Evaluate a single alert rule
   */
  private async evaluateAlertRule(rule: AlertRule, currentSnapshot: MetricSnapshot): Promise<void> {
    const conditionResults = await Promise.all(
      rule.conditions.map(condition => this.evaluateCondition(condition, currentSnapshot))
    )

    const allConditionsMet = conditionResults.every(result => result.met)
    const existingAlert = Array.from(this.activeAlerts.values())
      .find(alert => alert.ruleId === rule.id && alert.status === 'active')

    if (allConditionsMet && !existingAlert) {
      // Trigger new alert
      await this.triggerAlert(rule, conditionResults, currentSnapshot)
    } else if (!allConditionsMet && existingAlert) {
      // Auto-resolve alert if conditions no longer met
      await this.resolveAlert(existingAlert.id, 'Conditions no longer met')
    } else if (existingAlert) {
      // Update existing alert with new metric data
      this.updateAlertMetrics(existingAlert, conditionResults, currentSnapshot)
    }
  }

  /**
   * Evaluate a single alert condition
   */
  private async evaluateCondition(
    condition: AlertCondition, 
    currentSnapshot: MetricSnapshot
  ): Promise<{ met: boolean; value: number; previousValue?: number; trend: 'improving' | 'stable' | 'degrading' }> {
    const metricValue = currentSnapshot.metrics[condition.metric]
    if (metricValue === undefined) {
      return { met: false, value: 0, trend: 'stable' }
    }

    // Get historical data for the time window
    const windowStart = new Date(currentSnapshot.timestamp.getTime() - condition.timeWindow * 60 * 1000)
    const historicalData = this.metricsBuffer
      .filter(s => s.timestamp >= windowStart && s.timestamp <= currentSnapshot.timestamp)
      .map(s => s.metrics[condition.metric])
      .filter(v => v !== undefined)

    if (historicalData.length < condition.minimumSamples) {
      return { met: false, value: metricValue, trend: 'stable' }
    }

    // Calculate aggregated value
    let aggregatedValue: number
    switch (condition.aggregation) {
      case 'avg':
        aggregatedValue = historicalData.reduce((sum, val) => sum + val, 0) / historicalData.length
        break
      case 'max':
        aggregatedValue = Math.max(...historicalData)
        break
      case 'min':
        aggregatedValue = Math.min(...historicalData)
        break
      case 'sum':
        aggregatedValue = historicalData.reduce((sum, val) => sum + val, 0)
        break
      case 'count':
        aggregatedValue = historicalData.length
        break
      default:
        aggregatedValue = metricValue
    }

    // Calculate trend
    const previousValue = historicalData.length > 1 ? historicalData[historicalData.length - 2] : undefined
    let trend: 'improving' | 'stable' | 'degrading' = 'stable'
    
    if (previousValue !== undefined) {
      const change = metricValue - previousValue
      const changePercent = Math.abs(change / previousValue) * 100
      
      if (changePercent > 5) { // 5% threshold for trend detection
        // Determine if change is improvement or degradation based on metric type
        const isImprovement = this.isMetricImprovement(condition.metric, change)
        trend = isImprovement ? 'improving' : 'degrading'
      }
    }

    // Evaluate condition
    let conditionMet = false
    switch (condition.operator) {
      case 'gt':
        conditionMet = aggregatedValue > condition.threshold
        break
      case 'lt':
        conditionMet = aggregatedValue < condition.threshold
        break
      case 'eq':
        conditionMet = Math.abs(aggregatedValue - condition.threshold) < 0.01
        break
      case 'gte':
        conditionMet = aggregatedValue >= condition.threshold
        break
      case 'lte':
        conditionMet = aggregatedValue <= condition.threshold
        break
      case 'change_percent':
        if (previousValue !== undefined) {
          const changePercent = ((aggregatedValue - previousValue) / previousValue) * 100
          conditionMet = Math.abs(changePercent) > condition.threshold
        }
        break
      case 'anomaly':
        // Simple anomaly detection using standard deviation
        const mean = historicalData.reduce((sum, val) => sum + val, 0) / historicalData.length
        const variance = historicalData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalData.length
        const stdDev = Math.sqrt(variance)
        conditionMet = Math.abs(aggregatedValue - mean) > condition.threshold * stdDev
        break
    }

    return {
      met: conditionMet,
      value: aggregatedValue,
      previousValue,
      trend
    }
  }

  /**
   * Trigger a new alert
   */
  private async triggerAlert(
    rule: AlertRule,
    conditionResults: any[],
    currentSnapshot: MetricSnapshot
  ): Promise<void> {
    const alertId = this.generateId()
    
    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      category: rule.category,
      title: this.generateAlertTitle(rule, conditionResults),
      description: this.generateAlertDescription(rule, conditionResults),
      triggeredAt: new Date(),
      status: 'active',
      metrics: conditionResults.map((result, index) => ({
        metric: rule.conditions[index].metric,
        value: result.value,
        threshold: rule.conditions[index].threshold,
        previousValue: result.previousValue,
        trend: result.trend,
        timestamp: currentSnapshot.timestamp
      })),
      actions: [],
      escalations: [],
      tags: rule.tags,
      context: currentSnapshot.context
    }

    this.activeAlerts.set(alertId, alert)

    // Execute alert actions
    await this.executeAlertActions(alert, rule.actions)

    // Set up escalation timer
    if (rule.escalationRules.length > 0) {
      this.setupEscalationTimer(alert, rule.escalationRules[0])
    }

    console.log(`Triggered alert: ${alert.title}`)
  }

  /**
   * Execute alert actions
   */
  private async executeAlertActions(alert: Alert, actions: AlertAction[]): Promise<void> {
    for (const action of actions) {
      if (!action.enabled) continue

      const execution: AlertActionExecution = {
        actionType: action.type,
        executedAt: new Date(),
        status: 'pending'
      }

      try {
        await this.executeAlertAction(alert, action)
        execution.status = 'success'
      } catch (error) {
        execution.status = 'failed'
        execution.error = error.message
        console.error(`Alert action failed: ${action.type}`, error)
      }

      alert.actions.push(execution)
    }
  }

  /**
   * Execute individual alert action
   */
  private async executeAlertAction(alert: Alert, action: AlertAction): Promise<void> {
    switch (action.type) {
      case 'email':
        await this.sendEmailAlert(alert, action.configuration)
        break
      
      case 'slack':
        await this.sendSlackAlert(alert, action.configuration)
        break
      
      case 'webhook':
        await this.sendWebhookAlert(alert, action.configuration)
        break
      
      case 'dashboard':
        await this.updateDashboardAlert(alert, action.configuration)
        break
      
      case 'pagerduty':
        await this.sendPagerDutyAlert(alert, action.configuration)
        break
      
      case 'rollback':
        await this.triggerRollback(alert, action.configuration)
        break
      
      default:
        console.warn(`Unknown alert action type: ${action.type}`)
    }
  }

  /**
   * Setup escalation timer
   */
  private setupEscalationTimer(alert: Alert, escalationRule: EscalationRule): void {
    const timer = setTimeout(async () => {
      if (this.activeAlerts.has(alert.id) && alert.status === 'active') {
        await this.escalateAlert(alert, escalationRule)
      }
    }, escalationRule.afterMinutes * 60 * 1000)

    this.escalationTimers.set(alert.id, timer)
  }

  /**
   * Escalate an alert
   */
  private async escalateAlert(alert: Alert, escalationRule: EscalationRule): Promise<void> {
    const escalation: AlertEscalation = {
      level: alert.escalations.length + 1,
      triggeredAt: new Date(),
      actions: []
    }

    alert.status = 'escalated'
    alert.escalations.push(escalation)

    // Execute escalation actions
    for (const action of escalationRule.actions) {
      if (!action.enabled) continue

      const execution: AlertActionExecution = {
        actionType: action.type,
        executedAt: new Date(),
        status: 'pending'
      }

      try {
        await this.executeAlertAction(alert, action)
        execution.status = 'success'
      } catch (error) {
        execution.status = 'failed'
        execution.error = error.message
      }

      escalation.actions.push(execution)
    }

    console.log(`Escalated alert: ${alert.title} (Level ${escalation.level})`)
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'High Error Rate',
        description: 'Error rate exceeds 5% for more than 5 minutes',
        enabled: true,
        severity: 'critical',
        category: 'error',
        conditions: [
          {
            metric: 'errorRate',
            operator: 'gt',
            threshold: 5,
            timeWindow: 5,
            aggregation: 'avg',
            minimumSamples: 5
          }
        ],
        actions: [
          {
            type: 'slack',
            configuration: { channel: '#alerts', urgent: true },
            enabled: true
          },
          {
            type: 'email',
            configuration: { recipients: ['oncall@company.com'] },
            enabled: true
          }
        ],
        cooldownMinutes: 15,
        escalationRules: [
          {
            afterMinutes: 10,
            actions: [
              {
                type: 'pagerduty',
                configuration: { service: 'ux-monitoring' },
                enabled: true
              }
            ]
          }
        ],
        tags: ['production', 'critical']
      },
      {
        name: 'User Satisfaction Drop',
        description: 'User satisfaction score drops below 3.5 or decreases by more than 15%',
        enabled: true,
        severity: 'warning',
        category: 'satisfaction',
        conditions: [
          {
            metric: 'userSatisfactionScore',
            operator: 'lt',
            threshold: 3.5,
            timeWindow: 10,
            aggregation: 'avg',
            minimumSamples: 10
          }
        ],
        actions: [
          {
            type: 'slack',
            configuration: { channel: '#ux-team' },
            enabled: true
          }
        ],
        cooldownMinutes: 30,
        escalationRules: [],
        tags: ['ux', 'satisfaction']
      },
      {
        name: 'Performance Regression',
        description: 'Page load time increases significantly',
        enabled: true,
        severity: 'warning',
        category: 'performance',
        conditions: [
          {
            metric: 'pageLoadTime',
            operator: 'gt',
            threshold: 3000,
            timeWindow: 5,
            aggregation: 'avg',
            minimumSamples: 10
          }
        ],
        actions: [
          {
            type: 'slack',
            configuration: { channel: '#performance' },
            enabled: true
          }
        ],
        cooldownMinutes: 20,
        escalationRules: [],
        tags: ['performance', 'regression']
      },
      {
        name: 'Accessibility Score Drop',
        description: 'Accessibility score drops below 90%',
        enabled: true,
        severity: 'error',
        category: 'accessibility',
        conditions: [
          {
            metric: 'accessibilityScore',
            operator: 'lt',
            threshold: 90,
            timeWindow: 15,
            aggregation: 'avg',
            minimumSamples: 5
          }
        ],
        actions: [
          {
            type: 'slack',
            configuration: { channel: '#accessibility' },
            enabled: true
          }
        ],
        cooldownMinutes: 60,
        escalationRules: [],
        tags: ['accessibility', 'compliance']
      }
    ]

    defaultRules.forEach(async rule => {
      await this.createAlertRule(rule)
    })
  }

  // Helper methods

  private generateAlertTitle(rule: AlertRule, conditionResults: any[]): string {
    const primaryCondition = rule.conditions[0]
    const primaryResult = conditionResults[0]
    
    return `${rule.name}: ${primaryCondition.metric} is ${primaryResult.value.toFixed(2)} (threshold: ${primaryCondition.threshold})`
  }

  private generateAlertDescription(rule: AlertRule, conditionResults: any[]): string {
    let description = rule.description + '\n\nConditions:\n'
    
    rule.conditions.forEach((condition, index) => {
      const result = conditionResults[index]
      description += `- ${condition.metric}: ${result.value.toFixed(2)} ${condition.operator} ${condition.threshold} (${result.trend})\n`
    })
    
    return description
  }

  private isMetricImprovement(metric: string, change: number): boolean {
    // Define which metrics improve with increase vs decrease
    const lowerIsBetter = ['errorRate', 'pageLoadTime', 'averageTaskTime', 'lcp', 'fid', 'cls']
    const higherIsBetter = ['userSatisfactionScore', 'taskCompletionRate', 'accessibilityScore', 'performanceScore']
    
    if (lowerIsBetter.includes(metric)) {
      return change < 0 // Decrease is improvement
    } else if (higherIsBetter.includes(metric)) {
      return change > 0 // Increase is improvement
    }
    
    return false // Unknown metric, assume no improvement
  }

  private updateAlertMetrics(alert: Alert, conditionResults: any[], currentSnapshot: MetricSnapshot): void {
    alert.metrics = conditionResults.map((result, index) => ({
      metric: alert.metrics[index].metric,
      value: result.value,
      threshold: alert.metrics[index].threshold,
      previousValue: result.previousValue,
      trend: result.trend,
      timestamp: currentSnapshot.timestamp
    }))
  }

  // Mock implementations for alert actions
  private async sendEmailAlert(alert: Alert, config: any): Promise<void> {
    console.log(`Sending email alert: ${alert.title}`)
  }

  private async sendSlackAlert(alert: Alert, config: any): Promise<void> {
    console.log(`Sending Slack alert to ${config.channel}: ${alert.title}`)
  }

  private async sendWebhookAlert(alert: Alert, config: any): Promise<void> {
    console.log(`Sending webhook alert: ${alert.title}`)
  }

  private async updateDashboardAlert(alert: Alert, config: any): Promise<void> {
    console.log(`Updating dashboard with alert: ${alert.title}`)
  }

  private async sendPagerDutyAlert(alert: Alert, config: any): Promise<void> {
    console.log(`Sending PagerDuty alert: ${alert.title}`)
  }

  private async triggerRollback(alert: Alert, config: any): Promise<void> {
    console.log(`Triggering rollback due to alert: ${alert.title}`)
  }

  private generateId(): string {
    return 'alert_' + Math.random().toString(36).substr(2, 9)
  }
}

// Export factory function
export function createUXAlertingSystem(): UXAlertingSystem {
  return new UXAlertingSystem()
}