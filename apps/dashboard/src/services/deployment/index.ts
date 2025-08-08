/**
 * UX Deployment Service - Main Integration Point
 * Coordinates deployment pipeline, feature flags, rollback, and monitoring
 */

import { UXDeploymentPipeline, DeploymentConfig, createUXDeploymentPipeline } from './ux-deployment-pipeline'
import { FeatureFlagSystem, createFeatureFlagSystem, UserContext } from './FeatureFlagSystem'
import { RollbackManager, createRollbackManager } from './RollbackManager'
import { UXAlertingSystem, createUXAlertingSystem } from './UXAlertingSystem'

export interface UXDeploymentService {
  deploymentPipeline: UXDeploymentPipeline
  featureFlagSystem: FeatureFlagSystem
  rollbackManager: RollbackManager
  alertingSystem: UXAlertingSystem
}

export interface DeploymentServiceConfig {
  deployment: DeploymentConfig
  monitoring: {
    alertingEnabled: boolean
    rollbackMonitoringEnabled: boolean
    metricsCollectionInterval: number
  }
  featureFlags: {
    defaultRolloutPercentage: number
    enableABTesting: boolean
  }
}

/**
 * Create and configure the complete UX deployment service
 */
export function createUXDeploymentService(config: DeploymentServiceConfig): UXDeploymentService {
  // Initialize core services
  const deploymentPipeline = createUXDeploymentPipeline(config.deployment)
  const featureFlagSystem = createFeatureFlagSystem()
  const rollbackManager = createRollbackManager()
  const alertingSystem = createUXAlertingSystem()

  // Configure monitoring if enabled
  if (!config.monitoring.alertingEnabled) {
    alertingSystem.stopMonitoring()
  }

  if (!config.monitoring.rollbackMonitoringEnabled) {
    rollbackManager.stopMonitoring()
  }

  return {
    deploymentPipeline,
    featureFlagSystem,
    rollbackManager,
    alertingSystem
  }
}

/**
 * Default production configuration
 */
export const defaultProductionConfig: DeploymentServiceConfig = {
  deployment: {
    environment: 'production',
    version: process.env.DEPLOYMENT_VERSION || 'latest',
    features: [
      'ux-new-navigation',
      'ux-enhanced-charts', 
      'ux-mobile-optimization',
      'ux-accessibility-improvements',
      'ux-performance-enhancements'
    ],
    rollbackVersion: process.env.ROLLBACK_VERSION || 'previous',
    healthCheckEndpoints: [
      '/api/health',
      '/api/metrics',
      '/api/ux-status',
      '/api/feature-flags/health'
    ],
    performanceThresholds: {
      maxLoadTime: 2000, // 2 seconds
      maxErrorRate: 2, // 2%
      minUserSatisfactionScore: 4.0, // 4.0/5.0
      maxCoreWebVitalsRegression: 15 // 15%
    }
  },
  monitoring: {
    alertingEnabled: true,
    rollbackMonitoringEnabled: true,
    metricsCollectionInterval: 30000 // 30 seconds
  },
  featureFlags: {
    defaultRolloutPercentage: 25, // 25% initial rollout
    enableABTesting: true
  }
}

// Export all types and services
export * from './ux-deployment-pipeline'
export * from './FeatureFlagSystem'
export * from './RollbackManager'
export * from './UXAlertingSystem'

// Export React components
export { UXMonitoringDashboard } from '../components/Deployment/UXMonitoringDashboard'