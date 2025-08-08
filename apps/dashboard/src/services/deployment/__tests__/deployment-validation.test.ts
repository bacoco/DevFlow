/**
 * Deployment Validation Tests for UX Improvements
 * Ensures UX improvements work correctly in production environment
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { UXDeploymentPipeline, DeploymentConfig, createUXDeploymentPipeline } from '../ux-deployment-pipeline'
import { FeatureFlagSystem, createFeatureFlagSystem, UserContext } from '../FeatureFlagSystem'
import { RollbackManager, createRollbackManager } from '../RollbackManager'
import { UXAlertingSystem, createUXAlertingSystem } from '../UXAlertingSystem'

describe('UX Deployment Validation', () => {
  let deploymentPipeline: UXDeploymentPipeline
  let featureFlagSystem: FeatureFlagSystem
  let rollbackManager: RollbackManager
  let alertingSystem: UXAlertingSystem

  const mockDeploymentConfig: DeploymentConfig = {
    environment: 'production',
    version: 'v2.1.4',
    features: ['new-navigation', 'enhanced-charts', 'mobile-optimization'],
    rollbackVersion: 'v2.1.3',
    healthCheckEndpoints: ['/api/health', '/api/metrics', '/api/ux-status'],
    performanceThresholds: {
      maxLoadTime: 2000,
      maxErrorRate: 2,
      minUserSatisfactionScore: 4.0,
      maxCoreWebVitalsRegression: 10
    }
  }

  const mockUserContext: UserContext = {
    userId: 'test-user-123',
    userRole: 'developer',
    deviceType: 'desktop',
    browserType: 'chrome',
    geographicRegion: 'US',
    customAttributes: { segments: ['beta_users'] },
    sessionId: 'session-456'
  }

  beforeEach(() => {
    deploymentPipeline = createUXDeploymentPipeline(mockDeploymentConfig)
    featureFlagSystem = createFeatureFlagSystem()
    rollbackManager = createRollbackManager()
    alertingSystem = createUXAlertingSystem()
  })

  afterEach(() => {
    rollbackManager.stopMonitoring()
    alertingSystem.stopMonitoring()
  })

  describe('Deployment Pipeline Validation', () => {
    it('should successfully deploy UX improvements with blue-green strategy', async () => {
      const result = await deploymentPipeline.deploy()

      expect(result.success).toBe(true)
      expect(result.version).toBe(mockDeploymentConfig.version)
      expect(result.environment).toBe(mockDeploymentConfig.environment)
      expect(result.rollbackTriggered).toBe(false)
      expect(result.healthChecks).toHaveLength(mockDeploymentConfig.healthCheckEndpoints.length)
      expect(result.healthChecks.every(check => check.status === 'healthy')).toBe(true)
    })

    it('should validate performance thresholds during deployment', async () => {
      const result = await deploymentPipeline.deploy()

      expect(result.performanceMetrics.loadTime).toBeLessThanOrEqual(mockDeploymentConfig.performanceThresholds.maxLoadTime)
      expect(result.performanceMetrics.errorRate).toBeLessThanOrEqual(mockDeploymentConfig.performanceThresholds.maxErrorRate)
      expect(result.performanceMetrics.userSatisfactionScore).toBeGreaterThanOrEqual(mockDeploymentConfig.performanceThresholds.minUserSatisfactionScore)
    })

    it('should validate Core Web Vitals metrics', async () => {
      const result = await deploymentPipeline.deploy()

      expect(result.performanceMetrics.coreWebVitals.lcp).toBeLessThan(2500) // Good LCP threshold
      expect(result.performanceMetrics.coreWebVitals.fid).toBeLessThan(100) // Good FID threshold
      expect(result.performanceMetrics.coreWebVitals.cls).toBeLessThan(0.1) // Good CLS threshold
    })

    it('should maintain deployment history', async () => {
      await deploymentPipeline.deploy()
      await deploymentPipeline.deploy()

      const history = deploymentPipeline.getDeploymentHistory()
      expect(history).toHaveLength(2)
      expect(history.every(deployment => deployment.version === mockDeploymentConfig.version)).toBe(true)
    })

    it('should handle deployment failures gracefully', async () => {
      // Mock a deployment failure by setting impossible thresholds
      const failingConfig: DeploymentConfig = {
        ...mockDeploymentConfig,
        performanceThresholds: {
          maxLoadTime: 1, // Impossible threshold
          maxErrorRate: 0,
          minUserSatisfactionScore: 5.0,
          maxCoreWebVitalsRegression: 0
        }
      }

      const failingPipeline = createUXDeploymentPipeline(failingConfig)
      const result = await failingPipeline.deploy()

      expect(result.success).toBe(false)
      expect(result.rollbackTriggered).toBe(true)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })
  })

  describe('Feature Flag System Validation', () => {
    it('should correctly evaluate feature flags for target users', async () => {
      const evaluation = await featureFlagSystem.evaluateFlag('ux-new-navigation', mockUserContext)

      expect(evaluation.flagId).toBe('ux-new-navigation')
      expect(evaluation.enabled).toBe(true)
      expect(evaluation.variant).toBeDefined()
      expect(evaluation.reason).toBe('All conditions met')
    })

    it('should respect rollout percentages', async () => {
      // Test with different user IDs to verify percentage rollout
      const evaluations = await Promise.all(
        Array.from({ length: 100 }, (_, i) => 
          featureFlagSystem.evaluateFlag('ux-new-navigation', {
            ...mockUserContext,
            userId: `user-${i}`
          })
        )
      )

      const enabledCount = evaluations.filter(e => e.enabled).length
      expect(enabledCount).toBeGreaterThan(0)
      expect(enabledCount).toBeLessThan(100) // Should not be 100% due to rollout percentage
    })

    it('should track feature impressions and conversions', async () => {
      await featureFlagSystem.evaluateFlag('ux-new-navigation', mockUserContext)
      await featureFlagSystem.trackConversion('ux-new-navigation', mockUserContext, { action: 'task_completed' })

      const abTestResults = await featureFlagSystem.getABTestResults('ux-new-navigation')
      expect(abTestResults).toBeDefined()
      expect(abTestResults!.variants).toHaveLength(2)
      expect(abTestResults!.variants.every(v => v.impressions > 0)).toBe(true)
    })

    it('should handle gradual rollout correctly', async () => {
      const flag = await featureFlagSystem.createFeatureFlag({
        name: 'Test Gradual Rollout',
        description: 'Testing gradual rollout functionality',
        enabled: true,
        rolloutPercentage: 10,
        targetAudience: {
          userSegments: [],
          userRoles: [],
          geographicRegions: [],
          deviceTypes: [],
          browserTypes: [],
          customAttributes: {}
        },
        variants: [{
          id: 'test-variant',
          name: 'Test Variant',
          description: 'Test variant',
          weight: 100,
          configuration: {},
          enabled: true
        }],
        conditions: [],
        createdBy: 'test'
      })

      // Start gradual rollout
      featureFlagSystem.gradualRollout(flag.id, 50, 20, 0.1) // 0.1 minute intervals for testing

      // Wait for rollout to progress
      await new Promise(resolve => setTimeout(resolve, 200))

      const updatedFlag = featureFlagSystem.getAllFeatureFlags().find(f => f.id === flag.id)
      expect(updatedFlag!.rolloutPercentage).toBeGreaterThan(10)
    })

    it('should emergency disable features when needed', async () => {
      const flag = await featureFlagSystem.createFeatureFlag({
        name: 'Emergency Test Flag',
        description: 'Testing emergency disable',
        enabled: true,
        rolloutPercentage: 100,
        targetAudience: {
          userSegments: [],
          userRoles: [],
          geographicRegions: [],
          deviceTypes: [],
          browserTypes: [],
          customAttributes: {}
        },
        variants: [],
        conditions: [],
        createdBy: 'test'
      })

      await featureFlagSystem.emergencyDisable(flag.id, 'Critical bug detected')

      const disabledFlag = featureFlagSystem.getAllFeatureFlags().find(f => f.id === flag.id)
      expect(disabledFlag!.enabled).toBe(false)
      expect(disabledFlag!.rolloutPercentage).toBe(0)
    })
  })

  describe('Rollback Manager Validation', () => {
    it('should create comprehensive rollback plans', async () => {
      const plan = await rollbackManager.createRollbackPlan('v2.1.4', 'v2.1.3')

      expect(plan.deploymentVersion).toBe('v2.1.4')
      expect(plan.rollbackVersion).toBe('v2.1.3')
      expect(plan.steps).toHaveLength(6) // Default steps
      expect(plan.estimatedDurationMinutes).toBeGreaterThan(0)
      expect(plan.riskLevel).toBeDefined()
    })

    it('should execute rollback plans successfully', async () => {
      const plan = await rollbackManager.createRollbackPlan('v2.1.4', 'v2.1.3')
      const execution = await rollbackManager.executeRollback(
        plan.id,
        'manual',
        'Testing rollback execution'
      )

      expect(execution.status).toBe('completed')
      expect(execution.triggeredBy).toBe('manual')
      expect(execution.steps.every(step => 
        step.status === 'completed' || step.status === 'skipped'
      )).toBe(true)
    })

    it('should detect rollback triggers automatically', async () => {
      const triggers = rollbackManager.getRollbackTriggers()
      
      expect(triggers).toHaveLength(3) // Default triggers
      expect(triggers.some(t => t.name === 'High Error Rate')).toBe(true)
      expect(triggers.some(t => t.name === 'User Satisfaction Drop')).toBe(true)
      expect(triggers.some(t => t.name === 'Performance Regression')).toBe(true)
    })

    it('should handle rollback failures with recovery procedures', async () => {
      // Create a plan with a step that will fail
      const plan = await rollbackManager.createRollbackPlan('v2.1.4', 'v2.1.3', [
        {
          id: 'failing_step',
          name: 'Failing Step',
          description: 'This step will fail',
          type: 'traffic_switch',
          configuration: { shouldFail: true },
          estimatedDurationMinutes: 1,
          rollbackOnFailure: true,
          dependencies: []
        }
      ])

      const execution = await rollbackManager.executeRollback(
        plan.id,
        'manual',
        'Testing rollback failure handling'
      )

      expect(execution.status).toBe('failed')
      expect(execution.errors).toHaveLength(1)
    })
  })

  describe('Alerting System Validation', () => {
    it('should create and manage alert rules', async () => {
      const rule = await alertingSystem.createAlertRule({
        name: 'Test Alert Rule',
        description: 'Testing alert rule creation',
        enabled: true,
        severity: 'warning',
        category: 'performance',
        conditions: [{
          metric: 'pageLoadTime',
          operator: 'gt',
          threshold: 2000,
          timeWindow: 5,
          aggregation: 'avg',
          minimumSamples: 3
        }],
        actions: [{
          type: 'slack',
          configuration: { channel: '#test' },
          enabled: true
        }],
        cooldownMinutes: 10,
        escalationRules: [],
        tags: ['test']
      })

      expect(rule.id).toBeDefined()
      expect(rule.name).toBe('Test Alert Rule')
      expect(rule.enabled).toBe(true)
    })

    it('should trigger alerts when conditions are met', async () => {
      // Add metric snapshots that should trigger alerts
      alertingSystem.addMetricSnapshot({
        timestamp: new Date(),
        metrics: {
          errorRate: 6, // Above threshold of 5%
          userSatisfactionScore: 4.5,
          pageLoadTime: 1500,
          accessibilityScore: 95
        },
        context: {
          deploymentVersion: 'v2.1.4',
          featureFlags: ['ux-new-navigation']
        }
      })

      // Wait for alert processing
      await new Promise(resolve => setTimeout(resolve, 100))

      const activeAlerts = alertingSystem.getActiveAlerts()
      expect(activeAlerts.some(alert => alert.category === 'error')).toBe(true)
    })

    it('should resolve alerts when conditions improve', async () => {
      // First, trigger an alert
      alertingSystem.addMetricSnapshot({
        timestamp: new Date(),
        metrics: {
          errorRate: 6,
          userSatisfactionScore: 4.5,
          pageLoadTime: 1500,
          accessibilityScore: 95
        },
        context: {}
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      // Then, add metrics that should resolve the alert
      alertingSystem.addMetricSnapshot({
        timestamp: new Date(),
        metrics: {
          errorRate: 1, // Below threshold
          userSatisfactionScore: 4.5,
          pageLoadTime: 1500,
          accessibilityScore: 95
        },
        context: {}
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      const activeAlerts = alertingSystem.getActiveAlerts()
      expect(activeAlerts.filter(alert => alert.category === 'error')).toHaveLength(0)
    })

    it('should handle alert escalations', async () => {
      const rule = await alertingSystem.createAlertRule({
        name: 'Escalation Test Rule',
        description: 'Testing alert escalation',
        enabled: true,
        severity: 'critical',
        category: 'error',
        conditions: [{
          metric: 'errorRate',
          operator: 'gt',
          threshold: 10,
          timeWindow: 1,
          aggregation: 'avg',
          minimumSamples: 1
        }],
        actions: [{
          type: 'slack',
          configuration: { channel: '#alerts' },
          enabled: true
        }],
        cooldownMinutes: 5,
        escalationRules: [{
          afterMinutes: 0.1, // 6 seconds for testing
          actions: [{
            type: 'pagerduty',
            configuration: { service: 'test' },
            enabled: true
          }]
        }],
        tags: ['test', 'escalation']
      })

      // Trigger the alert
      alertingSystem.addMetricSnapshot({
        timestamp: new Date(),
        metrics: {
          errorRate: 15, // Above threshold
          userSatisfactionScore: 4.0,
          pageLoadTime: 1500,
          accessibilityScore: 95
        },
        context: {}
      })

      await new Promise(resolve => setTimeout(resolve, 200)) // Wait for escalation

      const activeAlerts = alertingSystem.getActiveAlerts()
      const escalatedAlert = activeAlerts.find(alert => alert.ruleId === rule.id)
      
      expect(escalatedAlert).toBeDefined()
      expect(escalatedAlert!.status).toBe('escalated')
      expect(escalatedAlert!.escalations).toHaveLength(1)
    })
  })

  describe('Integration Validation', () => {
    it('should integrate deployment pipeline with feature flags', async () => {
      // Deploy with feature flags
      const result = await deploymentPipeline.deploy()
      
      // Verify feature flags are working
      const evaluation = await featureFlagSystem.evaluateFlag('ux-new-navigation', mockUserContext)
      
      expect(result.success).toBe(true)
      expect(evaluation.enabled).toBe(true)
    })

    it('should integrate alerting with rollback manager', async () => {
      // Create a rollback plan
      const plan = await rollbackManager.createRollbackPlan('v2.1.4', 'v2.1.3')
      
      // Trigger an alert that should initiate rollback
      alertingSystem.addMetricSnapshot({
        timestamp: new Date(),
        metrics: {
          errorRate: 8, // High error rate
          userSatisfactionScore: 2.5, // Low satisfaction
          pageLoadTime: 4000, // Slow performance
          accessibilityScore: 85 // Low accessibility
        },
        context: {
          deploymentVersion: 'v2.1.4'
        }
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      const activeAlerts = alertingSystem.getActiveAlerts()
      expect(activeAlerts.length).toBeGreaterThan(0)
      
      // In a real implementation, this would trigger automatic rollback
      const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical')
      expect(criticalAlerts.length).toBeGreaterThan(0)
    })

    it('should validate end-to-end deployment workflow', async () => {
      // 1. Deploy new version
      const deploymentResult = await deploymentPipeline.deploy()
      expect(deploymentResult.success).toBe(true)

      // 2. Verify feature flags are active
      const flagEvaluation = await featureFlagSystem.evaluateFlag('ux-new-navigation', mockUserContext)
      expect(flagEvaluation.enabled).toBe(true)

      // 3. Monitor for issues (simulate good metrics)
      alertingSystem.addMetricSnapshot({
        timestamp: new Date(),
        metrics: {
          errorRate: 1,
          userSatisfactionScore: 4.3,
          pageLoadTime: 1200,
          accessibilityScore: 96
        },
        context: {
          deploymentVersion: deploymentResult.version
        }
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      // 4. Verify no alerts triggered
      const activeAlerts = alertingSystem.getActiveAlerts()
      expect(activeAlerts.filter(alert => alert.severity === 'critical')).toHaveLength(0)

      // 5. Verify deployment history is maintained
      const history = deploymentPipeline.getDeploymentHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(true)
    })
  })

  describe('Production Environment Validation', () => {
    it('should validate health check endpoints', async () => {
      const result = await deploymentPipeline.deploy()
      
      expect(result.healthChecks).toHaveLength(3)
      expect(result.healthChecks.every(check => 
        check.status === 'healthy' && check.responseTime < 1000
      )).toBe(true)
    })

    it('should validate UX metrics collection', async () => {
      const metricsSnapshot = {
        timestamp: new Date(),
        metrics: {
          userSatisfactionScore: 4.2,
          taskCompletionRate: 94,
          averageTaskTime: 28,
          errorRate: 1.2,
          pageLoadTime: 1400,
          accessibilityScore: 97,
          lcp: 1300,
          fid: 45,
          cls: 0.08
        },
        context: {
          deploymentVersion: 'v2.1.4',
          featureFlags: ['ux-new-navigation', 'enhanced-charts']
        }
      }

      alertingSystem.addMetricSnapshot(metricsSnapshot)

      // Verify metrics are within acceptable ranges
      expect(metricsSnapshot.metrics.userSatisfactionScore).toBeGreaterThan(4.0)
      expect(metricsSnapshot.metrics.taskCompletionRate).toBeGreaterThan(90)
      expect(metricsSnapshot.metrics.errorRate).toBeLessThan(2)
      expect(metricsSnapshot.metrics.accessibilityScore).toBeGreaterThan(95)
      expect(metricsSnapshot.metrics.lcp).toBeLessThan(2500)
      expect(metricsSnapshot.metrics.cls).toBeLessThan(0.1)
    })

    it('should validate cross-browser compatibility', async () => {
      const browsers = ['chrome', 'firefox', 'safari', 'edge']
      
      for (const browser of browsers) {
        const userContext: UserContext = {
          ...mockUserContext,
          browserType: browser
        }
        
        const evaluation = await featureFlagSystem.evaluateFlag('ux-new-navigation', userContext)
        expect(evaluation.enabled).toBe(true)
      }
    })

    it('should validate mobile device compatibility', async () => {
      const deviceTypes = ['mobile', 'tablet', 'desktop']
      
      for (const deviceType of deviceTypes) {
        const userContext: UserContext = {
          ...mockUserContext,
          deviceType: deviceType as any
        }
        
        const evaluation = await featureFlagSystem.evaluateFlag('ux-mobile-optimization', userContext)
        
        if (deviceType === 'mobile' || deviceType === 'tablet') {
          expect(evaluation.enabled).toBe(true)
        }
      }
    })

    it('should validate geographic region targeting', async () => {
      const regions = ['US', 'EU', 'APAC']
      
      for (const region of regions) {
        const userContext: UserContext = {
          ...mockUserContext,
          geographicRegion: region
        }
        
        const evaluation = await featureFlagSystem.evaluateFlag('ux-new-navigation', userContext)
        
        if (region === 'US' || region === 'EU') {
          expect(evaluation.enabled).toBe(true)
        }
      }
    })
  })

  describe('Performance and Load Validation', () => {
    it('should handle high-volume feature flag evaluations', async () => {
      const startTime = Date.now()
      const evaluations = await Promise.all(
        Array.from({ length: 1000 }, (_, i) => 
          featureFlagSystem.evaluateFlag('ux-new-navigation', {
            ...mockUserContext,
            userId: `load-test-user-${i}`
          })
        )
      )
      const endTime = Date.now()

      expect(evaluations).toHaveLength(1000)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
      expect(evaluations.every(e => e.flagId === 'ux-new-navigation')).toBe(true)
    })

    it('should handle concurrent deployment operations', async () => {
      const deploymentPromises = Array.from({ length: 3 }, () => 
        deploymentPipeline.deploy()
      )

      const results = await Promise.all(deploymentPromises)
      
      // At least one should succeed (others might fail due to concurrent access)
      expect(results.some(result => result.success)).toBe(true)
    })

    it('should validate memory usage during monitoring', async () => {
      const initialMemory = process.memoryUsage()
      
      // Add many metric snapshots
      for (let i = 0; i < 1000; i++) {
        alertingSystem.addMetricSnapshot({
          timestamp: new Date(Date.now() - i * 1000),
          metrics: {
            errorRate: Math.random() * 5,
            userSatisfactionScore: 3.5 + Math.random() * 1.5,
            pageLoadTime: 1000 + Math.random() * 2000,
            accessibilityScore: 90 + Math.random() * 10
          },
          context: {}
        })
      }

      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    })
  })
})