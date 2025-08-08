/**
 * Demo component showcasing personalization features
 */

import React, { useState, useEffect } from 'react';
import {
  usePersonalization,
  useInteractionTracker,
  useWidgetSuggestions,
  useLayoutRecommendations,
  useSmartDefaults,
  usePreferences,
  useSessionAnalytics,
  useLearningInsights
} from '../../hooks/usePersonalization';
import { UserRole, DeviceType } from '../../services/personalization';

export const PersonalizationDemo: React.FC = () => {
  const {
    state,
    preferences,
    insights,
    isInitialized,
    trackInteraction,
    generateInsights,
    resetPersonalization
  } = usePersonalization();

  const {
    trackClick,
    trackHover,
    trackNavigation,
    trackWidgetInteraction,
    trackSearch
  } = useInteractionTracker();

  const {
    updateTheme,
    updateLayout,
    updateAccessibility,
    updatePrivacy
  } = usePreferences();

  const { getSmartDefault, getAllSmartDefaults } = useSmartDefaults();
  const { sessionSummary } = useSessionAnalytics();
  const { learningInsights } = useLearningInsights();

  const [userRole, setUserRole] = useState<UserRole>('developer');
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [currentWidgets, setCurrentWidgets] = useState<string[]>([]);

  const { suggestions: widgetSuggestions, refreshSuggestions } = useWidgetSuggestions(
    userRole,
    deviceType,
    currentWidgets,
    { width: 6, height: 4 }
  );

  const { recommendations: layoutRecommendations, refreshRecommendations } = useLayoutRecommendations(
    userRole,
    deviceType
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Demo interaction handlers
  const handleDemoClick = (element: string) => {
    trackClick(element, { page: 'personalization-demo' });
  };

  const handleDemoHover = (element: string) => {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      trackHover(element, duration, { page: 'personalization-demo' });
    };
  };

  const handleDemoSearch = () => {
    if (searchQuery.trim()) {
      trackSearch(searchQuery, Math.floor(Math.random() * 20) + 1);
      setSearchQuery('');
    }
  };

  const handleWidgetInteraction = (widgetId: string, action: string) => {
    trackWidgetInteraction(widgetId, action, { page: 'personalization-demo' });
  };

  const handleAddWidget = (widgetId: string) => {
    setCurrentWidgets(prev => [...prev, widgetId]);
    handleWidgetInteraction(widgetId, 'add');
  };

  const handleRemoveWidget = (widgetId: string) => {
    setCurrentWidgets(prev => prev.filter(id => id !== widgetId));
    handleWidgetInteraction(widgetId, 'remove');
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing personalization engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Personalization Engine Demo
        </h1>
        <p className="text-gray-600 mb-6">
          Explore the adaptive UI system, behavior tracking, and smart recommendations.
        </p>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900">Tracking Status</h3>
            <p className={`text-sm ${state.trackingEnabled ? 'text-green-600' : 'text-red-600'}`}>
              {state.trackingEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900">Learning Status</h3>
            <p className={`text-sm ${state.learningEnabled ? 'text-green-600' : 'text-red-600'}`}>
              {state.learningEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-900">Session Events</h3>
            <p className="text-sm text-purple-600">
              {sessionSummary?.eventCount || 0} interactions
            </p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="font-semibold text-orange-900">Confidence Score</h3>
            <p className="text-sm text-orange-600">
              {((learningInsights?.confidenceScore || 0) * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'preferences', label: 'Preferences' },
              { id: 'suggestions', label: 'Suggestions' },
              { id: 'insights', label: 'Insights' },
              { id: 'interactions', label: 'Interactions' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  handleDemoClick(`tab-${tab.id}`);
                }}
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
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* User Context */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-4">User Context</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      User Role
                    </label>
                    <select
                      value={userRole}
                      onChange={(e) => {
                        setUserRole(e.target.value as UserRole);
                        handleDemoClick('role-change');
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="developer">Developer</option>
                      <option value="team_lead">Team Lead</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Device Type
                    </label>
                    <select
                      value={deviceType}
                      onChange={(e) => {
                        setDeviceType(e.target.value as DeviceType);
                        handleDemoClick('device-change');
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="desktop">Desktop</option>
                      <option value="tablet">Tablet</option>
                      <option value="mobile">Mobile</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Smart Defaults */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-4">Smart Defaults</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Theme Mode:</span>
                    <span className="font-medium">
                      {getSmartDefault('theme.mode', 'auto')?.value}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Layout Columns:</span>
                    <span className="font-medium">
                      {getSmartDefault('layout.columnCount', 3)?.value}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Theme Density:</span>
                    <span className="font-medium">
                      {getSmartDefault('theme.density', 'comfortable')?.value}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Refresh Interval:</span>
                    <span className="font-medium">
                      {getSmartDefault('widgets.refreshInterval', 60000)?.value}ms
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Session Summary */}
            {sessionSummary && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-4">Current Session</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <p className="font-medium">
                      {Math.round(sessionSummary.duration / 1000 / 60)} minutes
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Events:</span>
                    <p className="font-medium">{sessionSummary.eventCount}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Unique Elements:</span>
                    <p className="font-medium">{sessionSummary.uniqueElements}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Most Clicked:</span>
                    <p className="font-medium">
                      {sessionSummary.mostInteractedElements[0]?.element || 'None'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-6">
            {/* Theme Preferences */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-4">Theme Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mode
                  </label>
                  <select
                    value={preferences?.theme.mode || 'auto'}
                    onChange={(e) => {
                      updateTheme({ mode: e.target.value as 'light' | 'dark' | 'auto' });
                      handleDemoClick('theme-mode-change');
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="auto">Auto</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color Scheme
                  </label>
                  <select
                    value={preferences?.theme.colorScheme || 'default'}
                    onChange={(e) => {
                      updateTheme({ colorScheme: e.target.value });
                      handleDemoClick('color-scheme-change');
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="default">Default</option>
                    <option value="blue">Blue</option>
                    <option value="green">Green</option>
                    <option value="purple">Purple</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Density
                  </label>
                  <select
                    value={preferences?.theme.density || 'comfortable'}
                    onChange={(e) => {
                      updateTheme({ density: e.target.value as 'compact' | 'comfortable' | 'spacious' });
                      handleDemoClick('density-change');
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="compact">Compact</option>
                    <option value="comfortable">Comfortable</option>
                    <option value="spacious">Spacious</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Layout Preferences */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-4">Layout Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Column Count
                  </label>
                  <select
                    value={preferences?.layout.columnCount || 3}
                    onChange={(e) => {
                      updateLayout({ columnCount: parseInt(e.target.value) });
                      handleDemoClick('column-count-change');
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="1">1 Column</option>
                    <option value="2">2 Columns</option>
                    <option value="3">3 Columns</option>
                    <option value="4">4 Columns</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default View
                  </label>
                  <select
                    value={preferences?.layout.defaultView || 'dashboard'}
                    onChange={(e) => {
                      updateLayout({ defaultView: e.target.value });
                      handleDemoClick('default-view-change');
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="dashboard">Dashboard</option>
                    <option value="analytics">Analytics</option>
                    <option value="tasks">Tasks</option>
                    <option value="team">Team</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="show-sidebar"
                    checked={preferences?.layout.showSidebar || false}
                    onChange={(e) => {
                      updateLayout({ showSidebar: e.target.checked });
                      handleDemoClick('sidebar-toggle');
                    }}
                    className="mr-2"
                  />
                  <label htmlFor="show-sidebar" className="text-sm font-medium text-gray-700">
                    Show Sidebar
                  </label>
                </div>
              </div>
            </div>

            {/* Accessibility Preferences */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-4">Accessibility Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="high-contrast"
                      checked={preferences?.accessibility.highContrast || false}
                      onChange={(e) => {
                        updateAccessibility({ highContrast: e.target.checked });
                        handleDemoClick('high-contrast-toggle');
                      }}
                      className="mr-2"
                    />
                    <label htmlFor="high-contrast" className="text-sm font-medium text-gray-700">
                      High Contrast
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="reduced-motion"
                      checked={preferences?.accessibility.reducedMotion || false}
                      onChange={(e) => {
                        updateAccessibility({ reducedMotion: e.target.checked });
                        handleDemoClick('reduced-motion-toggle');
                      }}
                      className="mr-2"
                    />
                    <label htmlFor="reduced-motion" className="text-sm font-medium text-gray-700">
                      Reduced Motion
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Font Size
                  </label>
                  <select
                    value={preferences?.accessibility.fontSize || 'medium'}
                    onChange={(e) => {
                      updateAccessibility({ fontSize: e.target.value as 'small' | 'medium' | 'large' | 'extra-large' });
                      handleDemoClick('font-size-change');
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="extra-large">Extra Large</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="space-y-6">
            {/* Widget Suggestions */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Widget Suggestions</h3>
                <button
                  onClick={() => {
                    refreshSuggestions();
                    handleDemoClick('refresh-widget-suggestions');
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                >
                  Refresh
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {widgetSuggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.widgetId}
                    className="bg-white p-4 rounded-lg border border-gray-200"
                    onMouseEnter={handleDemoHover(`widget-suggestion-${suggestion.widgetId}`)}
                  >
                    <h4 className="font-medium text-gray-900 mb-2">
                      {suggestion.widgetId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">{suggestion.reason}</p>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs text-gray-500">
                        Confidence: {(suggestion.confidence * 100).toFixed(0)}%
                      </span>
                      <span className="text-xs text-gray-500">
                        Size: {suggestion.size.width}x{suggestion.size.height}
                      </span>
                    </div>
                    <button
                      onClick={() => handleAddWidget(suggestion.widgetId)}
                      disabled={currentWidgets.includes(suggestion.widgetId)}
                      className={`w-full px-3 py-1 rounded-md text-sm ${
                        currentWidgets.includes(suggestion.widgetId)
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {currentWidgets.includes(suggestion.widgetId) ? 'Added' : 'Add Widget'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Layout Recommendations */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Layout Recommendations</h3>
                <button
                  onClick={() => {
                    refreshRecommendations();
                    handleDemoClick('refresh-layout-recommendations');
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                >
                  Refresh
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {layoutRecommendations.map((recommendation, index) => (
                  <div
                    key={recommendation.layoutId}
                    className="bg-white p-4 rounded-lg border border-gray-200"
                    onMouseEnter={handleDemoHover(`layout-recommendation-${recommendation.layoutId}`)}
                  >
                    <h4 className="font-medium text-gray-900 mb-2">
                      {recommendation.layoutId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h4>
                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Score:</span>
                        <span className="font-medium">{(recommendation.score * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Confidence:</span>
                        <span className="font-medium">{(recommendation.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {recommendation.reasons.map((reason, idx) => (
                        <p key={idx} className="text-xs text-gray-600">• {reason}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Widgets */}
            {currentWidgets.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-4">Current Widgets</h3>
                <div className="flex flex-wrap gap-2">
                  {currentWidgets.map(widgetId => (
                    <div
                      key={widgetId}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center"
                    >
                      {widgetId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      <button
                        onClick={() => handleRemoveWidget(widgetId)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-6">
            {/* Learning Insights */}
            {learningInsights && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-4">Learning Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {learningInsights.learnedPatterns}
                    </div>
                    <div className="text-sm text-gray-600">Learned Patterns</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {(learningInsights.confidenceScore * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600">Confidence Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {(learningInsights.adaptationRate * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600">Adaptation Rate</div>
                  </div>
                </div>
                
                {learningInsights.topRecommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Top Recommendations</h4>
                    <div className="space-y-2">
                      {learningInsights.topRecommendations.map((rec, index) => (
                        <div key={index} className="bg-white p-3 rounded border">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-medium text-gray-900">{rec.key}:</span>
                              <span className="ml-2 text-gray-700">{String(rec.value)}</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{rec.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Behavioral Insights */}
            {insights && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-4">Behavioral Insights</h3>
                
                {/* Most Used Features */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Most Used Features</h4>
                  <div className="space-y-2">
                    {insights.mostUsedFeatures.slice(0, 5).map((feature, index) => (
                      <div key={feature.feature} className="flex justify-between items-center">
                        <span className="text-gray-700">{feature.feature}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{feature.usageCount} uses</span>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${Math.min(100, (feature.usageCount / Math.max(...insights.mostUsedFeatures.map(f => f.usageCount))) * 100)}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Device Usage Pattern */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Device Usage Pattern</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {(insights.deviceUsagePattern.desktop * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-gray-600">Desktop</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {(insights.deviceUsagePattern.tablet * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-gray-600">Tablet</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {(insights.deviceUsagePattern.mobile * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-gray-600">Mobile</div>
                    </div>
                  </div>
                </div>

                {/* Workflow Patterns */}
                {insights.workflowPatterns.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Workflow Patterns</h4>
                    <div className="space-y-2">
                      {insights.workflowPatterns.map((pattern, index) => (
                        <div key={pattern.name} className="bg-white p-3 rounded border">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-gray-900">{pattern.name}</span>
                            <span className="text-sm text-gray-600">
                              {pattern.frequency} times
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            Avg. duration: {Math.round(pattern.averageDuration / 1000)}s
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  generateInsights();
                  handleDemoClick('generate-insights');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Refresh Insights
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to reset all personalization data?')) {
                    resetPersonalization();
                    handleDemoClick('reset-personalization');
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Reset All Data
              </button>
            </div>
          </div>
        )}

        {activeTab === 'interactions' && (
          <div className="space-y-6">
            {/* Demo Interactions */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-4">Demo Interactions</h3>
              
              {/* Search Demo */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Search Tracking</h4>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter search query..."
                    className="flex-1 p-2 border border-gray-300 rounded-md"
                    onKeyPress={(e) => e.key === 'Enter' && handleDemoSearch()}
                  />
                  <button
                    onClick={handleDemoSearch}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Search
                  </button>
                </div>
              </div>

              {/* Click Demo */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Click Tracking</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['Button A', 'Button B', 'Button C', 'Button D'].map(button => (
                    <button
                      key={button}
                      onClick={() => handleDemoClick(`demo-${button.toLowerCase().replace(' ', '-')}`)}
                      className="p-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
                    >
                      {button}
                    </button>
                  ))}
                </div>
              </div>

              {/* Navigation Demo */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Navigation Tracking</h4>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      trackNavigation('/demo', '/dashboard');
                      handleDemoClick('nav-dashboard');
                    }}
                    className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
                  >
                    Go to Dashboard
                  </button>
                  <button
                    onClick={() => {
                      trackNavigation('/demo', '/analytics');
                      handleDemoClick('nav-analytics');
                    }}
                    className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
                  >
                    Go to Analytics
                  </button>
                  <button
                    onClick={() => {
                      trackNavigation('/demo', '/tasks');
                      handleDemoClick('nav-tasks');
                    }}
                    className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
                  >
                    Go to Tasks
                  </button>
                </div>
              </div>

              {/* Hover Demo */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Hover Tracking</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['Widget 1', 'Widget 2', 'Widget 3'].map(widget => (
                    <div
                      key={widget}
                      className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onMouseEnter={handleDemoHover(`demo-${widget.toLowerCase().replace(' ', '-')}`)}
                    >
                      <h5 className="font-medium text-gray-900">{widget}</h5>
                      <p className="text-sm text-gray-600">Hover over me to track interaction</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Interactions */}
            {sessionSummary && sessionSummary.mostInteractedElements.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-4">Most Interacted Elements</h3>
                <div className="space-y-2">
                  {sessionSummary.mostInteractedElements.slice(0, 10).map((element, index) => (
                    <div key={element.element} className="flex justify-between items-center">
                      <span className="text-gray-700">{element.element}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">{element.count} interactions</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${(element.count / Math.max(...sessionSummary.mostInteractedElements.map(e => e.count))) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};