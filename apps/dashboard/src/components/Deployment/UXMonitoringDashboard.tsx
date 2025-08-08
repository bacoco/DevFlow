/**
 * UX Monitoring Dashboard for Production Deployment
 * Real-time monitoring of UX metrics and user satisfaction
 */

import React, { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'

export interface UXMetrics {
  timestamp: Date
  userSatisfactionScore: number
  taskCompletionRate: number
  averageTaskTime: number
  errorRate: number
  accessibilityScore: number
  performanceScore: number
  coreWebVitals: {
    lcp: number
    fid: number
    cls: number
  }
  userFeedback: {
    positive: number
    negative: number
    neutral: number
  }
}

export interface DeploymentStatus {
  version: string
  environment: 'blue' | 'green'
  status: 'deploying' | 'healthy' | 'degraded' | 'failed'
  deployedAt: Date
  healthChecks: {
    endpoint: string
    status: 'healthy' | 'unhealthy'
    responseTime: number
  }[]
}

export interface Alert {
  id: string
  type: 'performance' | 'satisfaction' | 'error' | 'accessibility'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: Date
  resolved: boolean
}

export const UXMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<UXMetrics[]>([])
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')

  useEffect(() => {
    // Initialize monitoring data
    loadMonitoringData()
    
    // Set up real-time updates
    const interval = setInterval(loadMonitoringData, 30000) // Update every 30 seconds
    
    return () => clearInterval(interval)
  }, [selectedTimeRange])

  const loadMonitoringData = async () => {
    try {
      setIsLoading(true)
      
      // Simulate API calls - in real implementation, these would be actual API endpoints
      const [metricsData, statusData, alertsData] = await Promise.all([
        fetchUXMetrics(selectedTimeRange),
        fetchDeploymentStatus(),
        fetchAlerts()
      ])
      
      setMetrics(metricsData)
      setDeploymentStatus(statusData)
      setAlerts(alertsData)
    } catch (error) {
      console.error('Failed to load monitoring data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRollback = async () => {
    if (!deploymentStatus) return
    
    try {
      const confirmed = window.confirm(
        'Are you sure you want to rollback the deployment? This will revert to the previous version.'
      )
      
      if (confirmed) {
        await rollbackDeployment(deploymentStatus.version)
        await loadMonitoringData()
      }
    } catch (error) {
      console.error('Rollback failed:', error)
      alert('Rollback failed. Please check the logs and try again.')
    }
  }

  const resolveAlert = async (alertId: string) => {
    try {
      await markAlertResolved(alertId)
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, resolved: true } : alert
      ))
    } catch (error) {
      console.error('Failed to resolve alert:', error)
    }
  }

  const currentMetrics = metrics[metrics.length - 1]
  const previousMetrics = metrics[metrics.length - 2]

  if (isLoading && metrics.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">UX Monitoring Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time monitoring of user experience metrics</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          
          {deploymentStatus?.status === 'degraded' && (
            <Button
              onClick={handleRollback}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              Rollback Deployment
            </Button>
          )}
        </div>
      </div>

      {/* Deployment Status */}
      {deploymentStatus && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Deployment Status</h2>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Version: {deploymentStatus.version}</span>
                <span className="text-sm text-gray-600">Environment: {deploymentStatus.environment}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  deploymentStatus.status === 'healthy' ? 'bg-green-100 text-green-800' :
                  deploymentStatus.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                  deploymentStatus.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {deploymentStatus.status}
                </span>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-gray-600">Deployed</p>
              <p className="text-sm font-medium">
                {deploymentStatus.deployedAt.toLocaleString()}
              </p>
            </div>
          </div>
          
          {/* Health Checks */}
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Health Checks</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {deploymentStatus.healthChecks.map((check, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">{check.endpoint}</span>
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${
                      check.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    <span className="text-xs text-gray-600">{check.responseTime}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Alerts */}
      {alerts.filter(alert => !alert.resolved).length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Active Alerts</h2>
          <div className="space-y-3">
            {alerts.filter(alert => !alert.resolved).map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border-l-4 ${
                  alert.severity === 'critical' ? 'bg-red-50 border-red-500' :
                  alert.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                  alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                  'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {alert.severity}
                      </span>
                      <span className="text-sm text-gray-600">{alert.type}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-900">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {alert.timestamp.toLocaleString()}
                    </p>
                  </div>
                  
                  <Button
                    onClick={() => resolveAlert(alert.id)}
                    variant="outline"
                    size="sm"
                  >
                    Resolve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Key Metrics */}
      {currentMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="User Satisfaction"
            value={currentMetrics.userSatisfactionScore}
            previousValue={previousMetrics?.userSatisfactionScore}
            format="decimal"
            suffix="/5"
            threshold={{ min: 4.0, max: 5.0 }}
          />
          
          <MetricCard
            title="Task Completion Rate"
            value={currentMetrics.taskCompletionRate}
            previousValue={previousMetrics?.taskCompletionRate}
            format="percentage"
            threshold={{ min: 90, max: 100 }}
          />
          
          <MetricCard
            title="Average Task Time"
            value={currentMetrics.averageTaskTime}
            previousValue={previousMetrics?.averageTaskTime}
            format="duration"
            suffix="s"
            threshold={{ min: 0, max: 30 }}
            inverse={true}
          />
          
          <MetricCard
            title="Error Rate"
            value={currentMetrics.errorRate}
            previousValue={previousMetrics?.errorRate}
            format="percentage"
            threshold={{ min: 0, max: 2 }}
            inverse={true}
          />
          
          <MetricCard
            title="Accessibility Score"
            value={currentMetrics.accessibilityScore}
            previousValue={previousMetrics?.accessibilityScore}
            format="percentage"
            threshold={{ min: 95, max: 100 }}
          />
          
          <MetricCard
            title="Performance Score"
            value={currentMetrics.performanceScore}
            previousValue={previousMetrics?.performanceScore}
            format="percentage"
            threshold={{ min: 90, max: 100 }}
          />
          
          <MetricCard
            title="LCP (Core Web Vital)"
            value={currentMetrics.coreWebVitals.lcp}
            previousValue={previousMetrics?.coreWebVitals.lcp}
            format="duration"
            suffix="ms"
            threshold={{ min: 0, max: 2500 }}
            inverse={true}
          />
          
          <MetricCard
            title="CLS (Core Web Vital)"
            value={currentMetrics.coreWebVitals.cls}
            previousValue={previousMetrics?.coreWebVitals.cls}
            format="decimal"
            threshold={{ min: 0, max: 0.1 }}
            inverse={true}
          />
        </div>
      )}

      {/* User Feedback */}
      {currentMetrics && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">User Feedback Distribution</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {currentMetrics.userFeedback.positive}
              </div>
              <div className="text-sm text-gray-600">Positive</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-600">
                {currentMetrics.userFeedback.neutral}
              </div>
              <div className="text-sm text-gray-600">Neutral</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {currentMetrics.userFeedback.negative}
              </div>
              <div className="text-sm text-gray-600">Negative</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: number
  previousValue?: number
  format: 'percentage' | 'decimal' | 'duration' | 'integer'
  suffix?: string
  threshold?: { min: number; max: number }
  inverse?: boolean
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  previousValue,
  format,
  suffix = '',
  threshold,
  inverse = false
}) => {
  const formatValue = (val: number): string => {
    switch (format) {
      case 'percentage':
        return `${val.toFixed(1)}%`
      case 'decimal':
        return val.toFixed(2)
      case 'duration':
        return val.toFixed(0)
      case 'integer':
        return val.toString()
      default:
        return val.toString()
    }
  }

  const getStatusColor = (): string => {
    if (!threshold) return 'text-gray-900'
    
    const isGood = inverse 
      ? value <= threshold.max 
      : value >= threshold.min
    
    if (isGood) return 'text-green-600'
    if (value >= threshold.min * 0.8) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getTrend = (): { direction: 'up' | 'down' | 'stable'; color: string } => {
    if (!previousValue) return { direction: 'stable', color: 'text-gray-500' }
    
    const change = value - previousValue
    const isImprovement = inverse ? change < 0 : change > 0
    
    if (Math.abs(change) < 0.01) return { direction: 'stable', color: 'text-gray-500' }
    
    return {
      direction: change > 0 ? 'up' : 'down',
      color: isImprovement ? 'text-green-600' : 'text-red-600'
    }
  }

  const trend = getTrend()

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {previousValue && (
          <div className={`flex items-center text-sm ${trend.color}`}>
            {trend.direction === 'up' && '↗'}
            {trend.direction === 'down' && '↘'}
            {trend.direction === 'stable' && '→'}
          </div>
        )}
      </div>
      
      <div className={`text-3xl font-bold mt-2 ${getStatusColor()}`}>
        {formatValue(value)}{suffix}
      </div>
      
      {previousValue && (
        <div className="text-sm text-gray-500 mt-1">
          vs {formatValue(previousValue)}{suffix}
        </div>
      )}
    </Card>
  )
}

// Mock API functions - in real implementation, these would be actual API calls
async function fetchUXMetrics(timeRange: string): Promise<UXMetrics[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Generate mock data
  const now = new Date()
  const data: UXMetrics[] = []
  
  for (let i = 0; i < 24; i++) {
    data.push({
      timestamp: new Date(now.getTime() - i * 60 * 60 * 1000),
      userSatisfactionScore: 4.2 + Math.random() * 0.6,
      taskCompletionRate: 92 + Math.random() * 6,
      averageTaskTime: 25 + Math.random() * 10,
      errorRate: Math.random() * 2,
      accessibilityScore: 96 + Math.random() * 3,
      performanceScore: 88 + Math.random() * 10,
      coreWebVitals: {
        lcp: 1200 + Math.random() * 800,
        fid: 50 + Math.random() * 50,
        cls: Math.random() * 0.15
      },
      userFeedback: {
        positive: Math.floor(Math.random() * 100) + 150,
        negative: Math.floor(Math.random() * 20) + 5,
        neutral: Math.floor(Math.random() * 50) + 25
      }
    })
  }
  
  return data.reverse()
}

async function fetchDeploymentStatus(): Promise<DeploymentStatus> {
  await new Promise(resolve => setTimeout(resolve, 300))
  
  return {
    version: 'v2.1.3',
    environment: 'blue',
    status: 'healthy',
    deployedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    healthChecks: [
      { endpoint: '/api/health', status: 'healthy', responseTime: 120 },
      { endpoint: '/api/metrics', status: 'healthy', responseTime: 85 },
      { endpoint: '/api/feedback', status: 'healthy', responseTime: 95 }
    ]
  }
}

async function fetchAlerts(): Promise<Alert[]> {
  await new Promise(resolve => setTimeout(resolve, 200))
  
  return [
    {
      id: '1',
      type: 'performance',
      severity: 'medium',
      message: 'Page load time increased by 15% in the last hour',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      resolved: false
    }
  ]
}

async function rollbackDeployment(version: string): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 2000))
  console.log(`Rolling back deployment ${version}`)
}

async function markAlertResolved(alertId: string): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 500))
  console.log(`Resolved alert ${alertId}`)
}

export default UXMonitoringDashboard