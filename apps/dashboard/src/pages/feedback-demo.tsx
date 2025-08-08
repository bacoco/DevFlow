import React, { useState, useEffect } from 'react'
import { feedbackSystem, feedbackUtils } from '../services/feedback'
import { FeedbackWidgetManager } from '../components/Feedback/FeedbackWidgetManager'
import { UXDashboard } from '../components/Feedback/UXDashboard'

export default function FeedbackDemo() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [activeTab, setActiveTab] = useState<'demo' | 'dashboard'>('demo')
  const [quickInsights, setQuickInsights] = useState<any>(null)

  useEffect(() => {
    initializeFeedbackSystem()
  }, [])

  const initializeFeedbackSystem = async () => {
    try {
      await feedbackSystem.initialize({
        role: 'developer',
        tenure: 45,
        featureUsage: {
          'dashboard': 25,
          'charts': 15,
          'analytics': 8,
          'feedback-demo': 1
        },
        lastActivity: new Date(),
        preferences: {
          theme: 'light',
          notifications: true
        }
      })

      // Add demo widgets
      const npsWidget = feedbackUtils.createNPSWidget({
        trigger: 'time',
        delay: 10000, // 10 seconds
        userSegments: ['experienced-user']
      })

      const csatWidget = feedbackUtils.createCSATWidget('feedback-demo', {
        trigger: 'feature',
        delay: 5000
      })

      feedbackSystem.updateConfiguration({
        widgets: [npsWidget, csatWidget]
      })

      setIsInitialized(true)

      // Get quick insights
      const insights = await feedbackUtils.getQuickInsights(7)
      setQuickInsights(insights)

    } catch (error) {
      console.error('Failed to initialize feedback system:', error)
    }
  }

  const handleTrackEvent = (type: string, element: string) => {
    feedbackSystem.trackEvent(type as any, element, {
      demoAction: true,
      timestamp: new Date().toISOString()
    })
  }

  const handleRecordNPS = (score: number) => {
    feedbackSystem.recordNPS(score, `Demo NPS score: ${score}`, 'demo')
  }

  const handleRecordCSAT = (score: number, feature: string) => {
    feedbackSystem.recordCSAT(score, feature, `Demo CSAT for ${feature}`)
  }

  const handleShowWidget = (widgetType: 'nps' | 'csat') => {
    const suggestions = feedbackSystem.getContextualSuggestions()
    const widget = suggestions.find(w => w.type === widgetType)
    if (widget) {
      feedbackSystem.showFeedbackWidget(widget.id)
    }
  }

  const handleTriggerError = () => {
    feedbackSystem.trackEvent('error', 'demo-error', {
      errorType: 'simulated',
      errorMessage: 'This is a demo error for testing purposes'
    })
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing Feedback System...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            User Feedback & Continuous Improvement System Demo
          </h1>
          <p className="text-gray-600">
            Comprehensive user feedback collection, behavior analytics, and UX monitoring
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'demo', label: 'Interactive Demo' },
              { id: 'dashboard', label: 'UX Analytics Dashboard' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'demo' && (
          <div className="space-y-8">
            {/* Quick Insights */}
            {quickInsights && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Quick Insights (Last 7 Days)</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {quickInsights.summary.totalUsers}
                    </div>
                    <div className="text-sm text-gray-500">Total Users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {quickInsights.summary.satisfactionScore.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-500">Satisfaction</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {quickInsights.summary.npsScore}
                    </div>
                    <div className="text-sm text-gray-500">NPS Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">
                      {quickInsights.summary.csatScore.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-500">CSAT Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {quickInsights.summary.errorRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-500">Error Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {quickInsights.summary.activeAlerts}
                    </div>
                    <div className="text-sm text-gray-500">Active Alerts</div>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Demo Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Event Tracking */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Event Tracking Demo</h2>
                <p className="text-gray-600 mb-4">
                  Track user behavior events to understand how users interact with your application.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => handleTrackEvent('click', 'demo-button-1')}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    data-feature-id="demo-button-1"
                  >
                    Track Click Event
                  </button>
                  <button
                    onClick={() => handleTrackEvent('feature-discovery', 'analytics-feature')}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Track Feature Discovery
                  </button>
                  <button
                    onClick={() => handleTrackEvent('task-completion', 'demo-task')}
                    className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                  >
                    Track Task Completion
                  </button>
                  <button
                    onClick={handleTriggerError}
                    className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Simulate Error Event
                  </button>
                </div>
              </div>

              {/* Satisfaction Tracking */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Satisfaction Tracking Demo</h2>
                <p className="text-gray-600 mb-4">
                  Collect NPS and CSAT scores to measure user satisfaction.
                </p>
                
                <div className="mb-6">
                  <h3 className="font-medium mb-2">Record NPS Score (0-10)</h3>
                  <div className="flex space-x-1">
                    {Array.from({ length: 11 }, (_, i) => i).map(score => (
                      <button
                        key={score}
                        onClick={() => handleRecordNPS(score)}
                        className="w-8 h-8 text-xs bg-gray-100 hover:bg-blue-100 rounded"
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-medium mb-2">Record CSAT Score (1-5)</h3>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map(score => (
                      <button
                        key={score}
                        onClick={() => handleRecordCSAT(score, 'demo-feature')}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-green-100 rounded"
                      >
                        {score} ⭐
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Feedback Widgets */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Feedback Widgets Demo</h2>
              <p className="text-gray-600 mb-4">
                Show contextual feedback widgets to collect user feedback at the right moment.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => handleShowWidget('nps')}
                  className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Show NPS Widget
                </button>
                <button
                  onClick={() => handleShowWidget('csat')}
                  className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Show CSAT Widget
                </button>
              </div>
            </div>

            {/* Privacy Controls */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Privacy Controls Demo</h2>
              <p className="text-gray-600 mb-4">
                Manage user consent and privacy preferences.
              </p>
              <div className="flex items-center space-x-4">
                <span className="text-sm">
                  Current Consent Status: 
                  <span className={`ml-2 font-medium ${
                    feedbackSystem.hasUserConsent() ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {feedbackSystem.hasUserConsent() ? 'Granted' : 'Not Granted'}
                  </span>
                </span>
                <button
                  onClick={() => feedbackSystem.setUserConsent(true)}
                  className="px-4 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Grant Consent
                </button>
                <button
                  onClick={() => feedbackSystem.setUserConsent(false)}
                  className="px-4 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Revoke Consent
                </button>
              </div>
            </div>

            {/* Implementation Guide */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Implementation Guide</h2>
              <div className="prose max-w-none">
                <h3 className="text-lg font-medium">Quick Start</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`import { feedbackSystem, FeedbackWidgetManager } from './services/feedback'

// 1. Initialize the system
await feedbackSystem.initialize({
  role: 'developer',
  tenure: 30,
  featureUsage: { dashboard: 10 },
  lastActivity: new Date(),
  preferences: {}
})

// 2. Track events
feedbackSystem.trackEvent('click', 'export-button')
feedbackSystem.trackEvent('feature-discovery', 'charts')

// 3. Record satisfaction
feedbackSystem.recordNPS(9, 'Great product!')
feedbackSystem.recordCSAT(4, 'dashboard', 'Easy to use')

// 4. Add to your React app
function App() {
  return (
    <div>
      <YourAppContent />
      <FeedbackWidgetManager />
    </div>
  )
}`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <UXDashboard />
        )}
      </div>

      {/* Feedback Widget Manager */}
      <FeedbackWidgetManager />
    </div>
  )
}