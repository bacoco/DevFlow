/**
 * Rollback Manager for UX Deployments
 * Handles automatic and manual rollbacks when UX changes negatively impact user experience
 */

export interface RollbackTrigger {
  id: string
  name: string
  description: string
  enabled: boolean
  conditions: RollbackCondition[]
  severity: 'low' | 'medium' | 'high' | 'critical'
  autoRollback: boolean
  cooldownMinutes: number
}

export interface RollbackCondition {
  metric: string
  operator: 'greater_than' | 'less_than' | 'equals' | 'percentage_change'
  threshold: number
  timeWindowMinutes: number
  minimumSampleSize: number
}

export interface RollbackPlan {
  id: string
  deploymentVersion: string
  rollbackVersion: string
  steps: RollbackStep[]
  estimatedDurationMinutes: number
  riskLevel: 'low' | 'medium' | 'high'
  approvalRequired: boolean
  createdAt: Date
}

export interface RollbackStep {
  id: string
  name: string
  description: string
  type: 'traffic_switch' | 'feature_flag' | 'database_migration' | 'cache_clear' | 'notification'
  configuration: Record<string, any>
  estimatedDurationMinutes: number
  rollbackOnFailure: boolean
  dependencies: string[]
}

export interface RollbackExecution {
  id: string
  planId: string
  triggeredBy: 'automatic' | 'manual'
  triggerReason: string
  startedAt: Date
  completedAt?: Date
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled'
  steps: RollbackStepExecution[]
  metrics: RollbackMetrics
  errors: string[]
}

export interface RollbackStepExecution {
  stepId: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
  startedAt?: Date
  completedAt?: Date
  error?: string
  logs: string[]
}

export interface RollbackMetrics {
  userImpact: {
    affectedUsers: number
    errorRateReduction: number
    performanceImprovement: number
    satisfactionImprovement: number
  }
  systemMetrics: {
    rollbackDuration: number
    successRate: number
    dataLoss: boolean
    serviceDowntime: number
  }
}

export interface UXMetricSnapshot {
  timestamp: Date
  userSatisfactionScore: number
  taskCompletionRate: number
  averageTaskTime: number
  errorRate: number
  pageLoadTime: number
  accessibilityScore: number
  coreWebVitals: {
    lcp: number
    fid: number
    cls: number
  }
}

export class RollbackManager {
  private triggers: Map<string, RollbackTrigger> = new Map()
  private plans: Map<string, RollbackPlan> = new Map()
  private executions: Map<string, RollbackExecution> = new Map()
  private metricsHistory: UXMetricSnapshot[] = []
  private monitoringInterval: NodeJS.Timeout | null = null

  constructor() {
    this.initializeDefaultTriggers()
    this.startMonitoring()
  }

  /**
   * Start continuous monitoring for rollback triggers
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }

    this.monitoringInterval = setInterval(async () => {
      await this.checkRollbackTriggers()
    }, 60000) // Check every minute

    console.log('Rollback monitoring started')
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    console.log('Rollback monitoring stopped')
  }

  /**
   * Create a rollback plan for a deployment
   */
  async createRollbackPlan(
    deploymentVersion: string,
    rollbackVersion: string,
    customSteps?: RollbackStep[]
  ): Promise<RollbackPlan> {
    const planId = this.generateId()
    
    const defaultSteps: RollbackStep[] = [
      {
        id: 'notify_start',
        name: 'Notify Rollback Start',
        description: 'Send notifications about rollback initiation',
        type: 'notification',
        configuration: {
          channels: ['slack', 'email', 'dashboard'],
          message: `Starting rollback from ${deploymentVersion} to ${rollbackVersion}`
        },
        estimatedDurationMinutes: 1,
        rollbackOnFailure: false,
        dependencies: []
      },
      {
        id: 'disable_feature_flags',
        name: 'Disable New Feature Flags',
        description: 'Disable feature flags introduced in the problematic deployment',
        type: 'feature_flag',
        configuration: {
          action: 'disable',
          flags: ['ux-new-navigation', 'ux-enhanced-charts', 'ux-mobile-optimization']
        },
        estimatedDurationMinutes: 2,
        rollbackOnFailure: true,
        dependencies: ['notify_start']
      },
      {
        id: 'switch_traffic',
        name: 'Switch Traffic to Previous Version',
        description: 'Redirect traffic from current deployment to previous stable version',
        type: 'traffic_switch',
        configuration: {
          fromVersion: deploymentVersion,
          toVersion: rollbackVersion,
          strategy: 'immediate'
        },
        estimatedDurationMinutes: 3,
        rollbackOnFailure: true,
        dependencies: ['disable_feature_flags']
      },
      {
        id: 'clear_caches',
        name: 'Clear Application Caches',
        description: 'Clear CDN and application caches to ensure users get the rolled back version',
        type: 'cache_clear',
        configuration: {
          cacheTypes: ['cdn', 'application', 'browser'],
          purgeStrategy: 'aggressive'
        },
        estimatedDurationMinutes: 2,
        rollbackOnFailure: false,
        dependencies: ['switch_traffic']
      },
      {
        id: 'verify_rollback',
        name: 'Verify Rollback Success',
        description: 'Run health checks and verify metrics have improved',
        type: 'verification',
        configuration: {
          healthChecks: ['/api/health', '/api/metrics', '/api/ux-status'],
          metricsToCheck: ['error_rate', 'response_time', 'user_satisfaction'],
          successThreshold: 0.95
        },
        estimatedDurationMinutes: 5,
        rollbackOnFailure: false,
        dependencies: ['clear_caches']
      },
      {
        id: 'notify_completion',
        name: 'Notify Rollback Completion',
        description: 'Send notifications about successful rollback',
        type: 'notification',
        configuration: {
          channels: ['slack', 'email', 'dashboard'],
          message: `Rollback completed successfully. System restored to ${rollbackVersion}`
        },
        estimatedDurationMinutes: 1,
        rollbackOnFailure: false,
        dependencies: ['verify_rollback']
      }
    ]

    const steps = customSteps || defaultSteps
    const estimatedDuration = steps.reduce((total, step) => total + step.estimatedDurationMinutes, 0)

    const plan: RollbackPlan = {
      id: planId,
      deploymentVersion,
      rollbackVersion,
      steps,
      estimatedDurationMinutes: estimatedDuration,
      riskLevel: this.assessRiskLevel(steps),
      approvalRequired: this.requiresApproval(steps),
      createdAt: new Date()
    }

    this.plans.set(planId, plan)
    console.log(`Created rollback plan ${planId} for ${deploymentVersion} -> ${rollbackVersion}`)

    return plan
  }

  /**
   * Execute a rollback plan
   */
  async executeRollback(
    planId: string,
    triggeredBy: 'automatic' | 'manual',
    triggerReason: string,
    approvedBy?: string
  ): Promise<RollbackExecution> {
    const plan = this.plans.get(planId)
    if (!plan) {
      throw new Error(`Rollback plan ${planId} not found`)
    }

    if (plan.approvalRequired && triggeredBy === 'automatic') {
      throw new Error('Rollback plan requires manual approval but was triggered automatically')
    }

    const executionId = this.generateId()
    const execution: RollbackExecution = {
      id: executionId,
      planId,
      triggeredBy,
      triggerReason,
      startedAt: new Date(),
      status: 'in_progress',
      steps: plan.steps.map(step => ({
        stepId: step.id,
        status: 'pending',
        logs: []
      })),
      metrics: {
        userImpact: {
          affectedUsers: 0,
          errorRateReduction: 0,
          performanceImprovement: 0,
          satisfactionImprovement: 0
        },
        systemMetrics: {
          rollbackDuration: 0,
          successRate: 0,
          dataLoss: false,
          serviceDowntime: 0
        }
      },
      errors: []
    }

    this.executions.set(executionId, execution)

    console.log(`Starting rollback execution ${executionId} for plan ${planId}`)
    console.log(`Triggered by: ${triggeredBy}, Reason: ${triggerReason}`)

    try {
      await this.executeRollbackSteps(execution, plan)
      
      execution.status = 'completed'
      execution.completedAt = new Date()
      execution.metrics.systemMetrics.rollbackDuration = 
        execution.completedAt.getTime() - execution.startedAt.getTime()

      console.log(`Rollback execution ${executionId} completed successfully`)
      
    } catch (error) {
      execution.status = 'failed'
      execution.errors.push(error.message)
      
      console.error(`Rollback execution ${executionId} failed:`, error)
      
      // Attempt to rollback the rollback if possible
      await this.handleRollbackFailure(execution, plan)
    }

    return execution
  }

  /**
   * Check for rollback triggers
   */
  private async checkRollbackTriggers(): Promise<void> {
    const currentMetrics = await this.getCurrentUXMetrics()
    this.metricsHistory.push(currentMetrics)

    // Keep only last 24 hours of metrics
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
    this.metricsHistory = this.metricsHistory.filter(m => m.timestamp > cutoffTime)

    for (const trigger of this.triggers.values()) {
      if (!trigger.enabled || !trigger.autoRollback) continue

      const shouldTrigger = await this.evaluateTrigger(trigger, currentMetrics)
      
      if (shouldTrigger) {
        console.log(`Rollback trigger activated: ${trigger.name}`)
        await this.handleAutomaticRollback(trigger)
      }
    }
  }

  /**
   * Evaluate if a trigger should activate
   */
  private async evaluateTrigger(trigger: RollbackTrigger, currentMetrics: UXMetricSnapshot): Promise<boolean> {
    for (const condition of trigger.conditions) {
      const metricValue = this.getMetricValue(currentMetrics, condition.metric)
      const historicalValues = this.getHistoricalMetricValues(condition.metric, condition.timeWindowMinutes)
      
      if (historicalValues.length < condition.minimumSampleSize) {
        continue // Not enough data
      }

      const conditionMet = this.evaluateCondition(condition, metricValue, historicalValues)
      
      if (conditionMet) {
        console.log(`Rollback condition met: ${condition.metric} ${condition.operator} ${condition.threshold}`)
        return true
      }
    }

    return false
  }

  /**
   * Handle automatic rollback
   */
  private async handleAutomaticRollback(trigger: RollbackTrigger): Promise<void> {
    // Find the most recent deployment to rollback
    const currentDeployment = await this.getCurrentDeployment()
    const previousDeployment = await this.getPreviousDeployment()

    if (!currentDeployment || !previousDeployment) {
      console.error('Cannot determine deployment versions for automatic rollback')
      return
    }

    // Create rollback plan
    const plan = await this.createRollbackPlan(
      currentDeployment.version,
      previousDeployment.version
    )

    // Execute rollback
    await this.executeRollback(
      plan.id,
      'automatic',
      `Triggered by: ${trigger.name} - ${trigger.description}`
    )
  }

  /**
   * Execute rollback steps
   */
  private async executeRollbackSteps(execution: RollbackExecution, plan: RollbackPlan): Promise<void> {
    const completedSteps = new Set<string>()

    for (const step of plan.steps) {
      // Check dependencies
      const dependenciesMet = step.dependencies.every(dep => completedSteps.has(dep))
      if (!dependenciesMet) {
        const stepExecution = execution.steps.find(s => s.stepId === step.id)!
        stepExecution.status = 'skipped'
        stepExecution.logs.push('Dependencies not met, skipping step')
        continue
      }

      const stepExecution = execution.steps.find(s => s.stepId === step.id)!
      stepExecution.status = 'in_progress'
      stepExecution.startedAt = new Date()

      try {
        await this.executeRollbackStep(step, stepExecution)
        
        stepExecution.status = 'completed'
        stepExecution.completedAt = new Date()
        completedSteps.add(step.id)
        
        console.log(`Rollback step completed: ${step.name}`)
        
      } catch (error) {
        stepExecution.status = 'failed'
        stepExecution.error = error.message
        
        console.error(`Rollback step failed: ${step.name}`, error)
        
        if (step.rollbackOnFailure) {
          throw new Error(`Critical rollback step failed: ${step.name}`)
        }
      }
    }
  }

  /**
   * Execute individual rollback step
   */
  private async executeRollbackStep(step: RollbackStep, execution: RollbackStepExecution): Promise<void> {
    execution.logs.push(`Starting step: ${step.name}`)

    switch (step.type) {
      case 'traffic_switch':
        await this.executeTrafficSwitch(step, execution)
        break
      
      case 'feature_flag':
        await this.executeFeatureFlagStep(step, execution)
        break
      
      case 'cache_clear':
        await this.executeCacheClear(step, execution)
        break
      
      case 'notification':
        await this.executeNotification(step, execution)
        break
      
      default:
        execution.logs.push(`Unknown step type: ${step.type}`)
    }

    // Simulate step duration
    await new Promise(resolve => setTimeout(resolve, step.estimatedDurationMinutes * 100))
  }

  /**
   * Execute traffic switch step
   */
  private async executeTrafficSwitch(step: RollbackStep, execution: RollbackStepExecution): Promise<void> {
    const config = step.configuration
    execution.logs.push(`Switching traffic from ${config.fromVersion} to ${config.toVersion}`)
    
    // In real implementation, this would:
    // - Update load balancer configuration
    // - Gradually shift traffic if strategy is 'gradual'
    // - Monitor health during switch
    // - Verify traffic is flowing to correct version
    
    execution.logs.push('Traffic switch completed successfully')
  }

  /**
   * Execute feature flag step
   */
  private async executeFeatureFlagStep(step: RollbackStep, execution: RollbackStepExecution): Promise<void> {
    const config = step.configuration
    execution.logs.push(`${config.action} feature flags: ${config.flags.join(', ')}`)
    
    // In real implementation, this would:
    // - Connect to feature flag service
    // - Update flag configurations
    // - Verify changes are propagated
    
    execution.logs.push('Feature flags updated successfully')
  }

  /**
   * Execute cache clear step
   */
  private async executeCacheClear(step: RollbackStep, execution: RollbackStepExecution): Promise<void> {
    const config = step.configuration
    execution.logs.push(`Clearing caches: ${config.cacheTypes.join(', ')}`)
    
    // In real implementation, this would:
    // - Clear CDN caches
    // - Purge application caches
    // - Invalidate browser caches
    
    execution.logs.push('Caches cleared successfully')
  }

  /**
   * Execute notification step
   */
  private async executeNotification(step: RollbackStep, execution: RollbackStepExecution): Promise<void> {
    const config = step.configuration
    execution.logs.push(`Sending notifications to: ${config.channels.join(', ')}`)
    
    // In real implementation, this would:
    // - Send Slack notifications
    // - Send email alerts
    // - Update dashboard status
    
    execution.logs.push('Notifications sent successfully')
  }

  /**
   * Handle rollback failure
   */
  private async handleRollbackFailure(execution: RollbackExecution, plan: RollbackPlan): Promise<void> {
    console.error('Rollback failed, attempting recovery procedures')
    
    // Send critical alerts
    await this.sendCriticalAlert({
      type: 'rollback_failure',
      executionId: execution.id,
      planId: plan.id,
      errors: execution.errors,
      timestamp: new Date()
    })
    
    // Attempt manual intervention notification
    await this.requestManualIntervention(execution, plan)
  }

  /**
   * Initialize default rollback triggers
   */
  private initializeDefaultTriggers(): void {
    const defaultTriggers: RollbackTrigger[] = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        description: 'Error rate exceeds 5% for more than 5 minutes',
        enabled: true,
        conditions: [
          {
            metric: 'errorRate',
            operator: 'greater_than',
            threshold: 5,
            timeWindowMinutes: 5,
            minimumSampleSize: 10
          }
        ],
        severity: 'critical',
        autoRollback: true,
        cooldownMinutes: 30
      },
      {
        id: 'user_satisfaction_drop',
        name: 'User Satisfaction Drop',
        description: 'User satisfaction drops below 3.0 or decreases by more than 20%',
        enabled: true,
        conditions: [
          {
            metric: 'userSatisfactionScore',
            operator: 'less_than',
            threshold: 3.0,
            timeWindowMinutes: 10,
            minimumSampleSize: 20
          },
          {
            metric: 'userSatisfactionScore',
            operator: 'percentage_change',
            threshold: -20,
            timeWindowMinutes: 15,
            minimumSampleSize: 30
          }
        ],
        severity: 'high',
        autoRollback: true,
        cooldownMinutes: 60
      },
      {
        id: 'performance_regression',
        name: 'Performance Regression',
        description: 'Page load time increases by more than 50% or exceeds 3 seconds',
        enabled: true,
        conditions: [
          {
            metric: 'pageLoadTime',
            operator: 'greater_than',
            threshold: 3000,
            timeWindowMinutes: 5,
            minimumSampleSize: 15
          },
          {
            metric: 'pageLoadTime',
            operator: 'percentage_change',
            threshold: 50,
            timeWindowMinutes: 10,
            minimumSampleSize: 20
          }
        ],
        severity: 'medium',
        autoRollback: false,
        cooldownMinutes: 45
      }
    ]

    defaultTriggers.forEach(trigger => {
      this.triggers.set(trigger.id, trigger)
    })
  }

  // Helper methods

  private async getCurrentUXMetrics(): Promise<UXMetricSnapshot> {
    // In real implementation, fetch from monitoring system
    return {
      timestamp: new Date(),
      userSatisfactionScore: 4.1 + Math.random() * 0.8,
      taskCompletionRate: 90 + Math.random() * 8,
      averageTaskTime: 25 + Math.random() * 10,
      errorRate: Math.random() * 3,
      pageLoadTime: 1200 + Math.random() * 800,
      accessibilityScore: 95 + Math.random() * 4,
      coreWebVitals: {
        lcp: 1500 + Math.random() * 1000,
        fid: 50 + Math.random() * 50,
        cls: Math.random() * 0.2
      }
    }
  }

  private getMetricValue(metrics: UXMetricSnapshot, metricName: string): number {
    switch (metricName) {
      case 'userSatisfactionScore': return metrics.userSatisfactionScore
      case 'taskCompletionRate': return metrics.taskCompletionRate
      case 'averageTaskTime': return metrics.averageTaskTime
      case 'errorRate': return metrics.errorRate
      case 'pageLoadTime': return metrics.pageLoadTime
      case 'accessibilityScore': return metrics.accessibilityScore
      case 'lcp': return metrics.coreWebVitals.lcp
      case 'fid': return metrics.coreWebVitals.fid
      case 'cls': return metrics.coreWebVitals.cls
      default: return 0
    }
  }

  private getHistoricalMetricValues(metricName: string, timeWindowMinutes: number): number[] {
    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000)
    return this.metricsHistory
      .filter(m => m.timestamp > cutoffTime)
      .map(m => this.getMetricValue(m, metricName))
  }

  private evaluateCondition(condition: RollbackCondition, currentValue: number, historicalValues: number[]): boolean {
    switch (condition.operator) {
      case 'greater_than':
        return currentValue > condition.threshold
      
      case 'less_than':
        return currentValue < condition.threshold
      
      case 'equals':
        return Math.abs(currentValue - condition.threshold) < 0.01
      
      case 'percentage_change':
        if (historicalValues.length === 0) return false
        const baseline = historicalValues.reduce((sum, val) => sum + val, 0) / historicalValues.length
        const percentageChange = ((currentValue - baseline) / baseline) * 100
        return condition.threshold < 0 ? percentageChange < condition.threshold : percentageChange > condition.threshold
      
      default:
        return false
    }
  }

  private assessRiskLevel(steps: RollbackStep[]): 'low' | 'medium' | 'high' {
    const hasTrafficSwitch = steps.some(s => s.type === 'traffic_switch')
    const hasDatabaseMigration = steps.some(s => s.type === 'database_migration')
    const criticalSteps = steps.filter(s => s.rollbackOnFailure).length

    if (hasDatabaseMigration || criticalSteps > 3) return 'high'
    if (hasTrafficSwitch || criticalSteps > 1) return 'medium'
    return 'low'
  }

  private requiresApproval(steps: RollbackStep[]): boolean {
    return steps.some(s => s.type === 'database_migration') || 
           this.assessRiskLevel(steps) === 'high'
  }

  private async getCurrentDeployment(): Promise<{ version: string } | null> {
    // Mock implementation
    return { version: 'v2.1.3' }
  }

  private async getPreviousDeployment(): Promise<{ version: string } | null> {
    // Mock implementation
    return { version: 'v2.1.2' }
  }

  private async sendCriticalAlert(alert: any): Promise<void> {
    console.error('CRITICAL ALERT:', alert)
  }

  private async requestManualIntervention(execution: RollbackExecution, plan: RollbackPlan): Promise<void> {
    console.log('Manual intervention required for rollback:', execution.id)
  }

  private generateId(): string {
    return 'rb_' + Math.random().toString(36).substr(2, 9)
  }

  // Public API methods

  getRollbackTriggers(): RollbackTrigger[] {
    return Array.from(this.triggers.values())
  }

  getRollbackPlans(): RollbackPlan[] {
    return Array.from(this.plans.values())
  }

  getRollbackExecutions(): RollbackExecution[] {
    return Array.from(this.executions.values())
  }

  async manualRollback(planId: string, reason: string, approvedBy: string): Promise<RollbackExecution> {
    return this.executeRollback(planId, 'manual', reason, approvedBy)
  }
}

// Export factory function
export function createRollbackManager(): RollbackManager {
  return new RollbackManager()
}