/**
 * Feature Flag System for UX Deployment
 * Enables gradual rollout and A/B testing of UX improvements
 */

export interface FeatureFlag {
  id: string
  name: string
  description: string
  enabled: boolean
  rolloutPercentage: number
  targetAudience: TargetAudience
  variants: FeatureVariant[]
  conditions: FeatureCondition[]
  metrics: FeatureMetrics
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

export interface FeatureVariant {
  id: string
  name: string
  description: string
  weight: number
  configuration: Record<string, any>
  enabled: boolean
}

export interface TargetAudience {
  userSegments: string[]
  userRoles: string[]
  geographicRegions: string[]
  deviceTypes: string[]
  browserTypes: string[]
  customAttributes: Record<string, any>
}

export interface FeatureCondition {
  type: 'user_attribute' | 'time_range' | 'device_type' | 'custom'
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
  value: any
  attribute?: string
}

export interface FeatureMetrics {
  impressions: number
  conversions: number
  conversionRate: number
  userSatisfaction: number
  errorRate: number
  performanceImpact: number
  lastUpdated: Date
}

export interface UserContext {
  userId: string
  userRole: string
  deviceType: 'desktop' | 'tablet' | 'mobile'
  browserType: string
  geographicRegion: string
  customAttributes: Record<string, any>
  sessionId: string
}

export interface FeatureEvaluation {
  flagId: string
  enabled: boolean
  variant?: FeatureVariant
  reason: string
  timestamp: Date
}

export interface ABTestResult {
  flagId: string
  variants: {
    variantId: string
    name: string
    impressions: number
    conversions: number
    conversionRate: number
    userSatisfaction: number
    statisticalSignificance: number
  }[]
  winner?: string
  confidence: number
  recommendedAction: 'continue' | 'stop' | 'rollout_winner' | 'needs_more_data'
}

export class FeatureFlagSystem {
  private flags: Map<string, FeatureFlag> = new Map()
  private evaluationCache: Map<string, FeatureEvaluation> = new Map()
  private metricsCollector: MetricsCollector

  constructor(metricsCollector: MetricsCollector) {
    this.metricsCollector = metricsCollector
    this.loadFeatureFlags()
  }

  /**
   * Evaluate a feature flag for a user
   */
  async evaluateFlag(flagId: string, userContext: UserContext): Promise<FeatureEvaluation> {
    const cacheKey = `${flagId}:${userContext.userId}:${userContext.sessionId}`
    
    // Check cache first
    const cached = this.evaluationCache.get(cacheKey)
    if (cached && this.isCacheValid(cached)) {
      return cached
    }

    const flag = this.flags.get(flagId)
    if (!flag) {
      const evaluation: FeatureEvaluation = {
        flagId,
        enabled: false,
        reason: 'Flag not found',
        timestamp: new Date()
      }
      this.evaluationCache.set(cacheKey, evaluation)
      return evaluation
    }

    // Check if flag is globally enabled
    if (!flag.enabled) {
      const evaluation: FeatureEvaluation = {
        flagId,
        enabled: false,
        reason: 'Flag globally disabled',
        timestamp: new Date()
      }
      this.evaluationCache.set(cacheKey, evaluation)
      return evaluation
    }

    // Check rollout percentage
    if (!this.isUserInRollout(userContext.userId, flag.rolloutPercentage)) {
      const evaluation: FeatureEvaluation = {
        flagId,
        enabled: false,
        reason: 'User not in rollout percentage',
        timestamp: new Date()
      }
      this.evaluationCache.set(cacheKey, evaluation)
      return evaluation
    }

    // Check target audience
    if (!this.matchesTargetAudience(userContext, flag.targetAudience)) {
      const evaluation: FeatureEvaluation = {
        flagId,
        enabled: false,
        reason: 'User not in target audience',
        timestamp: new Date()
      }
      this.evaluationCache.set(cacheKey, evaluation)
      return evaluation
    }

    // Check conditions
    if (!this.evaluateConditions(userContext, flag.conditions)) {
      const evaluation: FeatureEvaluation = {
        flagId,
        enabled: false,
        reason: 'Conditions not met',
        timestamp: new Date()
      }
      this.evaluationCache.set(cacheKey, evaluation)
      return evaluation
    }

    // Select variant for A/B testing
    const variant = this.selectVariant(userContext.userId, flag.variants)

    const evaluation: FeatureEvaluation = {
      flagId,
      enabled: true,
      variant,
      reason: 'All conditions met',
      timestamp: new Date()
    }

    // Cache the evaluation
    this.evaluationCache.set(cacheKey, evaluation)

    // Track impression
    this.metricsCollector.trackImpression(flagId, variant?.id, userContext)

    return evaluation
  }

  /**
   * Check if a feature is enabled for a user
   */
  async isFeatureEnabled(flagId: string, userContext: UserContext): Promise<boolean> {
    const evaluation = await this.evaluateFlag(flagId, userContext)
    return evaluation.enabled
  }

  /**
   * Get feature variant for a user
   */
  async getFeatureVariant(flagId: string, userContext: UserContext): Promise<FeatureVariant | null> {
    const evaluation = await this.evaluateFlag(flagId, userContext)
    return evaluation.variant || null
  }

  /**
   * Track feature conversion
   */
  async trackConversion(flagId: string, userContext: UserContext, conversionData?: any): Promise<void> {
    const evaluation = await this.evaluateFlag(flagId, userContext)
    if (evaluation.enabled) {
      this.metricsCollector.trackConversion(flagId, evaluation.variant?.id, userContext, conversionData)
    }
  }

  /**
   * Create a new feature flag
   */
  async createFeatureFlag(flag: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt' | 'metrics'>): Promise<FeatureFlag> {
    const newFlag: FeatureFlag = {
      ...flag,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      metrics: {
        impressions: 0,
        conversions: 0,
        conversionRate: 0,
        userSatisfaction: 0,
        errorRate: 0,
        performanceImpact: 0,
        lastUpdated: new Date()
      }
    }

    this.flags.set(newFlag.id, newFlag)
    await this.persistFeatureFlag(newFlag)

    return newFlag
  }

  /**
   * Update a feature flag
   */
  async updateFeatureFlag(flagId: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag | null> {
    const flag = this.flags.get(flagId)
    if (!flag) return null

    const updatedFlag: FeatureFlag = {
      ...flag,
      ...updates,
      updatedAt: new Date()
    }

    this.flags.set(flagId, updatedFlag)
    await this.persistFeatureFlag(updatedFlag)

    // Clear cache for this flag
    this.clearFlagCache(flagId)

    return updatedFlag
  }

  /**
   * Delete a feature flag
   */
  async deleteFeatureFlag(flagId: string): Promise<boolean> {
    const flag = this.flags.get(flagId)
    if (!flag) return false

    this.flags.delete(flagId)
    this.clearFlagCache(flagId)
    await this.removePersistedFlag(flagId)

    return true
  }

  /**
   * Get all feature flags
   */
  getAllFeatureFlags(): FeatureFlag[] {
    return Array.from(this.flags.values())
  }

  /**
   * Get A/B test results for a feature flag
   */
  async getABTestResults(flagId: string): Promise<ABTestResult | null> {
    const flag = this.flags.get(flagId)
    if (!flag || flag.variants.length < 2) return null

    const metrics = await this.metricsCollector.getVariantMetrics(flagId)
    
    const variants = flag.variants.map(variant => {
      const variantMetrics = metrics.find(m => m.variantId === variant.id)
      return {
        variantId: variant.id,
        name: variant.name,
        impressions: variantMetrics?.impressions || 0,
        conversions: variantMetrics?.conversions || 0,
        conversionRate: variantMetrics?.conversionRate || 0,
        userSatisfaction: variantMetrics?.userSatisfaction || 0,
        statisticalSignificance: this.calculateStatisticalSignificance(variantMetrics)
      }
    })

    const winner = this.determineWinner(variants)
    const confidence = this.calculateConfidence(variants)

    return {
      flagId,
      variants,
      winner,
      confidence,
      recommendedAction: this.getRecommendedAction(variants, confidence)
    }
  }

  /**
   * Gradually increase rollout percentage
   */
  async gradualRollout(flagId: string, targetPercentage: number, incrementPercentage: number = 10, intervalMinutes: number = 60): Promise<void> {
    const flag = this.flags.get(flagId)
    if (!flag) throw new Error('Feature flag not found')

    const rolloutInterval = setInterval(async () => {
      const currentFlag = this.flags.get(flagId)
      if (!currentFlag) {
        clearInterval(rolloutInterval)
        return
      }

      const newPercentage = Math.min(currentFlag.rolloutPercentage + incrementPercentage, targetPercentage)
      
      await this.updateFeatureFlag(flagId, { rolloutPercentage: newPercentage })
      
      console.log(`Rolled out ${flagId} to ${newPercentage}% of users`)

      if (newPercentage >= targetPercentage) {
        clearInterval(rolloutInterval)
        console.log(`Gradual rollout completed for ${flagId}`)
      }
    }, intervalMinutes * 60 * 1000)
  }

  /**
   * Emergency kill switch for a feature flag
   */
  async emergencyDisable(flagId: string, reason: string): Promise<void> {
    await this.updateFeatureFlag(flagId, { 
      enabled: false,
      rolloutPercentage: 0
    })
    
    this.clearFlagCache(flagId)
    
    console.log(`Emergency disabled feature flag ${flagId}: ${reason}`)
    
    // Send alert to monitoring system
    this.metricsCollector.sendAlert({
      type: 'feature_flag_emergency_disabled',
      flagId,
      reason,
      timestamp: new Date()
    })
  }

  // Private helper methods

  private async loadFeatureFlags(): Promise<void> {
    // In real implementation, load from database or configuration service
    // For now, create some example flags
    const exampleFlags: FeatureFlag[] = [
      {
        id: 'ux-new-navigation',
        name: 'New Navigation System',
        description: 'Enhanced navigation with improved accessibility',
        enabled: true,
        rolloutPercentage: 25,
        targetAudience: {
          userSegments: ['beta_users', 'power_users'],
          userRoles: ['developer', 'team_lead'],
          geographicRegions: ['US', 'EU'],
          deviceTypes: ['desktop', 'tablet'],
          browserTypes: ['chrome', 'firefox', 'safari'],
          customAttributes: {}
        },
        variants: [
          {
            id: 'control',
            name: 'Control (Current Navigation)',
            description: 'Current navigation system',
            weight: 50,
            configuration: { useNewNavigation: false },
            enabled: true
          },
          {
            id: 'treatment',
            name: 'Treatment (New Navigation)',
            description: 'New enhanced navigation system',
            weight: 50,
            configuration: { useNewNavigation: true },
            enabled: true
          }
        ],
        conditions: [],
        metrics: {
          impressions: 1250,
          conversions: 875,
          conversionRate: 70,
          userSatisfaction: 4.2,
          errorRate: 1.5,
          performanceImpact: -5,
          lastUpdated: new Date()
        },
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        createdBy: 'ux-team'
      }
    ]

    exampleFlags.forEach(flag => {
      this.flags.set(flag.id, flag)
    })
  }

  private isUserInRollout(userId: string, rolloutPercentage: number): boolean {
    if (rolloutPercentage >= 100) return true
    if (rolloutPercentage <= 0) return false

    // Use consistent hashing to ensure same user always gets same result
    const hash = this.hashString(userId)
    const userPercentile = (hash % 100) + 1
    
    return userPercentile <= rolloutPercentage
  }

  private matchesTargetAudience(userContext: UserContext, targetAudience: TargetAudience): boolean {
    // Check user segments
    if (targetAudience.userSegments.length > 0) {
      const userSegments = userContext.customAttributes.segments || []
      if (!targetAudience.userSegments.some(segment => userSegments.includes(segment))) {
        return false
      }
    }

    // Check user roles
    if (targetAudience.userRoles.length > 0 && !targetAudience.userRoles.includes(userContext.userRole)) {
      return false
    }

    // Check device types
    if (targetAudience.deviceTypes.length > 0 && !targetAudience.deviceTypes.includes(userContext.deviceType)) {
      return false
    }

    // Check browser types
    if (targetAudience.browserTypes.length > 0 && !targetAudience.browserTypes.includes(userContext.browserType)) {
      return false
    }

    // Check geographic regions
    if (targetAudience.geographicRegions.length > 0 && !targetAudience.geographicRegions.includes(userContext.geographicRegion)) {
      return false
    }

    return true
  }

  private evaluateConditions(userContext: UserContext, conditions: FeatureCondition[]): boolean {
    return conditions.every(condition => {
      switch (condition.type) {
        case 'user_attribute':
          const attributeValue = userContext.customAttributes[condition.attribute!]
          return this.evaluateCondition(attributeValue, condition.operator, condition.value)
        
        case 'device_type':
          return this.evaluateCondition(userContext.deviceType, condition.operator, condition.value)
        
        case 'time_range':
          const now = new Date()
          return this.evaluateCondition(now, condition.operator, new Date(condition.value))
        
        default:
          return true
      }
    })
  }

  private evaluateCondition(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected
      case 'not_equals':
        return actual !== expected
      case 'contains':
        return String(actual).includes(String(expected))
      case 'greater_than':
        return actual > expected
      case 'less_than':
        return actual < expected
      default:
        return false
    }
  }

  private selectVariant(userId: string, variants: FeatureVariant[]): FeatureVariant | undefined {
    const enabledVariants = variants.filter(v => v.enabled)
    if (enabledVariants.length === 0) return undefined
    if (enabledVariants.length === 1) return enabledVariants[0]

    // Use consistent hashing for variant selection
    const hash = this.hashString(userId + 'variant')
    const totalWeight = enabledVariants.reduce((sum, v) => sum + v.weight, 0)
    const targetWeight = hash % totalWeight

    let currentWeight = 0
    for (const variant of enabledVariants) {
      currentWeight += variant.weight
      if (targetWeight < currentWeight) {
        return variant
      }
    }

    return enabledVariants[0]
  }

  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  private isCacheValid(evaluation: FeatureEvaluation): boolean {
    const cacheAgeMs = Date.now() - evaluation.timestamp.getTime()
    const maxCacheAgeMs = 5 * 60 * 1000 // 5 minutes
    return cacheAgeMs < maxCacheAgeMs
  }

  private clearFlagCache(flagId: string): void {
    const keysToDelete = Array.from(this.evaluationCache.keys()).filter(key => key.startsWith(flagId + ':'))
    keysToDelete.forEach(key => this.evaluationCache.delete(key))
  }

  private generateId(): string {
    return 'flag_' + Math.random().toString(36).substr(2, 9)
  }

  private async persistFeatureFlag(flag: FeatureFlag): Promise<void> {
    // In real implementation, save to database
    console.log('Persisting feature flag:', flag.id)
  }

  private async removePersistedFlag(flagId: string): Promise<void> {
    // In real implementation, remove from database
    console.log('Removing persisted feature flag:', flagId)
  }

  private calculateStatisticalSignificance(metrics: any): number {
    // Simplified statistical significance calculation
    if (!metrics || metrics.impressions < 100) return 0
    return Math.min(95, (metrics.impressions / 1000) * 95)
  }

  private determineWinner(variants: any[]): string | undefined {
    if (variants.length < 2) return undefined
    
    const sortedVariants = variants.sort((a, b) => b.conversionRate - a.conversionRate)
    const winner = sortedVariants[0]
    
    // Only declare winner if statistically significant and meaningful difference
    if (winner.statisticalSignificance > 90 && winner.conversionRate > sortedVariants[1].conversionRate * 1.1) {
      return winner.variantId
    }
    
    return undefined
  }

  private calculateConfidence(variants: any[]): number {
    if (variants.length < 2) return 0
    
    const totalImpressions = variants.reduce((sum, v) => sum + v.impressions, 0)
    if (totalImpressions < 1000) return 0
    
    return Math.min(95, (totalImpressions / 10000) * 95)
  }

  private getRecommendedAction(variants: any[], confidence: number): 'continue' | 'stop' | 'rollout_winner' | 'needs_more_data' {
    if (confidence < 80) return 'needs_more_data'
    
    const winner = this.determineWinner(variants)
    if (winner) return 'rollout_winner'
    
    const hasNegativeImpact = variants.some(v => v.conversionRate < 50 || v.userSatisfaction < 3.0)
    if (hasNegativeImpact) return 'stop'
    
    return 'continue'
  }
}

// Metrics collector interface
export interface MetricsCollector {
  trackImpression(flagId: string, variantId: string | undefined, userContext: UserContext): void
  trackConversion(flagId: string, variantId: string | undefined, userContext: UserContext, conversionData?: any): void
  getVariantMetrics(flagId: string): Promise<any[]>
  sendAlert(alert: any): void
}

// Default metrics collector implementation
export class DefaultMetricsCollector implements MetricsCollector {
  private impressions: Map<string, number> = new Map()
  private conversions: Map<string, number> = new Map()

  trackImpression(flagId: string, variantId: string | undefined, userContext: UserContext): void {
    const key = `${flagId}:${variantId || 'default'}`
    this.impressions.set(key, (this.impressions.get(key) || 0) + 1)
    console.log(`Tracked impression for ${key}`)
  }

  trackConversion(flagId: string, variantId: string | undefined, userContext: UserContext, conversionData?: any): void {
    const key = `${flagId}:${variantId || 'default'}`
    this.conversions.set(key, (this.conversions.get(key) || 0) + 1)
    console.log(`Tracked conversion for ${key}`)
  }

  async getVariantMetrics(flagId: string): Promise<any[]> {
    // Return mock metrics for demo
    return [
      {
        variantId: 'control',
        impressions: 625,
        conversions: 400,
        conversionRate: 64,
        userSatisfaction: 3.8
      },
      {
        variantId: 'treatment',
        impressions: 625,
        conversions: 475,
        conversionRate: 76,
        userSatisfaction: 4.2
      }
    ]
  }

  sendAlert(alert: any): void {
    console.log('Alert sent:', alert)
  }
}

// Export factory function
export function createFeatureFlagSystem(metricsCollector?: MetricsCollector): FeatureFlagSystem {
  return new FeatureFlagSystem(metricsCollector || new DefaultMetricsCollector())
}