import React, { useState, useEffect } from 'react'
import { feedbackSystem } from '../../services/feedback/FeedbackSystem'
import {
  UXDashboardData,
  UsabilityAlert,
  SatisfactionMetrics,
  FeatureUsageData,
  UXTrend
} from '../../services/feedback/types'

export const UXDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<UXDashboardData | null>(null)
  const [satisfactionReport, setSatisfactionReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    end: new Date()
  })
  const [selectedTab, setSelectedTab] = useState<'overview' | 'satisfaction' | 'features' | 'alerts'>('overview')

  useEffect(() => {
    loadDashboardData()
  }, [timeRange])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [uxData, satReport] = await Promise.all([
        feedbackSystem.getUXDashboardData(timeRange),
        feedbackSystem.getSatisfactionReport(timeRange)
      ])
      
      setDashboardData(uxData)
      setSatisfactionReport(satReport)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTimeRangeChange = (days: number) => {
    setTimeRange({
      start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      end: new Date()
    })
  }

  const handleAlertAction = async (alertId: string, action: 'acknowledge' | 'resolve') => {
    try {
      if (action === 'acknowledge') {
        feedbackSystem.acknowledgeAlert(alertId, 'ux-team')
      } else {
        feedbackSystem.resolveAlert(alertId, 'ux-team', 'Issue resolved')
      }
      await loadDashboardData()
    } catch (error) {
      console.error(`Failed to ${action} alert:`, error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading UX Dashboard...</span>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Failed to load dashboard data</p>
        <button 
          onClick={loadDashboardData}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">UX Analytics Dashboard</h1>
        <p className="text-gray-600">Monitor user experience metrics and satisfaction</p>
      </div>

      {/* Time Range Selector */}
      <div className="mb-6">
        <div className="flex space-x-2">
          {[7, 30, 90].map(days => (
            <button
              key={days}
              onClick={() => handleTimeRangeChange(days)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                timeRange.start.getTime() === new Date(Date.now() - days * 24 * 60 * 60 * 1000).getTime()
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Last {days} days
            </button>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'satisfaction', label: 'Satisfaction' },
            { id: 'features', label: 'Features' },
            { id: 'alerts', label: 'Alerts' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.id === 'alerts' && dashboardData.alerts.length > 0 && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {dashboardData.alerts.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <OverviewTab 
          overview={dashboardData.overview} 
          trends={dashboardData.trends}
          metrics={dashboardData.usabilityMetrics}
        />
      )}

      {selectedTab === 'satisfaction' && satisfactionReport && (
        <SatisfactionTab report={satisfactionReport} />
      )}

      {selectedTab === 'features' && (
        <FeaturesTab features={dashboardData.featureUsage} />
      )}

      {selectedTab === 'alerts' && (
        <AlertsTab 
          alerts={dashboardData.alerts} 
          onAlertAction={handleAlertAction}
        />
      )}
    </div>
  )
}

interface OverviewTabProps {
  overview: UXDashboardData['overview']
  trends: UXTrend[]
  metrics: UXDashboardData['usabilityMetrics']
}

const OverviewTab: React.FC<OverviewTabProps> = ({ overview, trends, metrics }) => {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Users"
          value={overview.totalUsers.toLocaleString()}
          trend={trends.find(t => t.metric === 'total-users')}
          icon="👥"
        />
        <MetricCard
          title="Satisfaction Score"
          value={overview.satisfactionScore.toFixed(1)}
          trend={trends.find(t => t.metric === 'satisfaction')}
          icon="😊"
          suffix="/5"
        />
        <MetricCard
          title="Error Rate"
          value={overview.errorRate.toFixed(1)}
          trend={trends.find(t => t.metric === 'error-rate')}
          icon="⚠️"
          suffix="%"
          isInverted
        />
        <MetricCard
          title="Retention Rate"
          value={overview.retentionRate.toFixed(1)}
          trend={trends.find(t => t.metric === 'retention')}
          icon="🔄"
          suffix="%"
        />
      </div>

      {/* Usability Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Usability Metrics</h3>
        <div className="space-y-4">
          {metrics.map(metric => (
            <div key={metric.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium capitalize">
                  {metric.type.replace(/-/g, ' ')}
                </h4>
                <p className="text-sm text-gray-600">
                  Threshold: {metric.threshold}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {typeof metric.value === 'number' ? metric.value.toFixed(1) : metric.value}
                </div>
                <div className={`text-sm font-medium ${
                  metric.status === 'good' ? 'text-green-600' :
                  metric.status === 'warning' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {metric.status.toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface SatisfactionTabProps {
  report: any
}

const SatisfactionTab: React.FC<SatisfactionTabProps> = ({ report }) => {
  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Executive Summary</h3>
        <p className="text-gray-700">{report.executive_summary}</p>
      </div>

      {/* NPS and CSAT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Net Promoter Score</h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {report.metrics.nps.score}
            </div>
            <div className="text-sm text-gray-600 mb-4">
              {report.metrics.nps.responseCount} responses
            </div>
            <div className="flex justify-between text-sm">
              <div className="text-center">
                <div className="font-medium text-red-600">
                  {report.metrics.nps.distribution.detractors}
                </div>
                <div className="text-gray-500">Detractors</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-yellow-600">
                  {report.metrics.nps.distribution.passives}
                </div>
                <div className="text-gray-500">Passives</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-green-600">
                  {report.metrics.nps.distribution.promoters}
                </div>
                <div className="text-gray-500">Promoters</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Customer Satisfaction</h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">
              {report.metrics.csat.averageScore.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600 mb-4">
              {report.metrics.csat.responseCount} responses
            </div>
            <div className="space-y-2">
              {Object.entries(report.metrics.csat.byFeature).map(([feature, score]: [string, any]) => (
                <div key={feature} className="flex justify-between text-sm">
                  <span className="capitalize">{feature}</span>
                  <span className="font-medium">{score.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Insights and Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Key Insights</h3>
          <ul className="space-y-2">
            {report.insights.insights.map((insight: string, index: number) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span className="text-sm text-gray-700">{insight}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
          <ul className="space-y-2">
            {report.insights.recommendations.map((rec: string, index: number) => (
              <li key={index} className="flex items-start">
                <span className="text-green-500 mr-2">→</span>
                <span className="text-sm text-gray-700">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

interface FeaturesTabProps {
  features: FeatureUsageData[]
}

const FeaturesTab: React.FC<FeaturesTabProps> = ({ features }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Feature Usage Analytics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Feature
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unique Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Adoption Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Used
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {features.map(feature => (
                <tr key={feature.featureId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {feature.featureName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {feature.category}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {feature.usageCount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {feature.uniqueUsers.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${Math.min(feature.adoptionRate, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-900">
                        {feature.adoptionRate.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(feature.lastUsed).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

interface AlertsTabProps {
  alerts: UsabilityAlert[]
  onAlertAction: (alertId: string, action: 'acknowledge' | 'resolve') => void
}

const AlertsTab: React.FC<AlertsTabProps> = ({ alerts, onAlertAction }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">🎉</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Alerts</h3>
        <p className="text-gray-500">All UX metrics are within acceptable ranges.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {alerts.map(alert => (
        <div key={alert.id} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                  {alert.severity.toUpperCase()}
                </span>
                <span className="ml-2 text-sm text-gray-500">
                  {alert.type.replace(/-/g, ' ')}
                </span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                {alert.message}
              </h4>
              <div className="text-sm text-gray-600 mb-4">
                <p><strong>Current Value:</strong> {alert.details.currentValue}</p>
                <p><strong>Threshold:</strong> {alert.details.threshold}</p>
                <p><strong>Affected Users:</strong> {alert.details.affectedUsers}</p>
                <p><strong>Trend:</strong> {alert.details.trend}</p>
              </div>
              <div className="mb-4">
                <h5 className="font-medium text-gray-900 mb-2">Suggested Actions:</h5>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  {alert.details.suggestedActions.map((action, index) => (
                    <li key={index}>{action}</li>
                  ))}
                </ul>
              </div>
              <div className="text-xs text-gray-500">
                Created: {new Date(alert.createdAt).toLocaleString()}
                {alert.acknowledgedAt && (
                  <span className="ml-4">
                    Acknowledged: {new Date(alert.acknowledgedAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            <div className="ml-4 flex flex-col space-y-2">
              {!alert.acknowledgedAt && (
                <button
                  onClick={() => onAlertAction(alert.id, 'acknowledge')}
                  className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                >
                  Acknowledge
                </button>
              )}
              {!alert.resolvedAt && (
                <button
                  onClick={() => onAlertAction(alert.id, 'resolve')}
                  className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200"
                >
                  Resolve
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  trend?: UXTrend
  icon: string
  suffix?: string
  isInverted?: boolean
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  trend, 
  icon, 
  suffix = '', 
  isInverted = false 
}) => {
  const getTrendColor = () => {
    if (!trend) return 'text-gray-500'
    
    const isPositive = trend.direction === 'up'
    const isGoodTrend = isInverted ? !isPositive : isPositive
    
    return isGoodTrend ? 'text-green-600' : 'text-red-600'
  }

  const getTrendIcon = () => {
    if (!trend) return ''
    return trend.direction === 'up' ? '↗' : '↘'
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {value}{suffix}
          </p>
          {trend && (
            <p className={`text-sm ${getTrendColor()}`}>
              {getTrendIcon()} {Math.abs(trend.changePercent).toFixed(1)}%
            </p>
          )}
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  )
}