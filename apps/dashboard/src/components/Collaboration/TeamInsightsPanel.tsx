/**
 * TeamInsightsPanel
 * Component for displaying team insights with privacy protection and anonymization
 */

import React, { useState, useEffect } from 'react';
import CollaborationManager from '../../services/collaboration/CollaborationManager';
import {
  User,
  TeamInsights,
  TeamMetric,
  TeamTrend,
  TeamComparison,
  MetricCategory
} from '../../services/collaboration/types';

interface TeamInsightsPanelProps {
  teamId: string;
  currentUser: User;
  collaborationManager: CollaborationManager;
  teamInsights: TeamInsights | null;
  loading: boolean;
  onInsightsRefresh: () => void;
}

export const TeamInsightsPanel: React.FC<TeamInsightsPanelProps> = ({
  teamId,
  currentUser,
  collaborationManager,
  teamInsights,
  loading,
  onInsightsRefresh
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedCategory, setSelectedCategory] = useState<MetricCategory | 'all'>('all');
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);

  const periodOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ];

  const categoryOptions: { value: MetricCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'All Categories' },
    { value: 'productivity', label: 'Productivity' },
    { value: 'collaboration', label: 'Collaboration' },
    { value: 'quality', label: 'Quality' },
    { value: 'engagement', label: 'Engagement' }
  ];

  const handlePeriodChange = async (period: string) => {
    setSelectedPeriod(period);
    // In a real implementation, would trigger data refresh with new period
    onInsightsRefresh();
  };

  const getMetricIcon = (category: MetricCategory) => {
    switch (category) {
      case 'productivity':
        return '🚀';
      case 'collaboration':
        return '🤝';
      case 'quality':
        return '✨';
      case 'engagement':
        return '💪';
      default:
        return '📊';
    }
  };

  const getChangeIcon = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return '📈';
      case 'down':
        return '📉';
      case 'stable':
        return '➡️';
      default:
        return '➡️';
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing':
        return '📈';
      case 'decreasing':
        return '📉';
      case 'stable':
        return '➡️';
      case 'volatile':
        return '📊';
      default:
        return '📊';
    }
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatMetricValue = (metric: TeamMetric) => {
    if (metric.unit === 'percentage') {
      return `${metric.value}%`;
    }
    if (metric.unit === 'score') {
      return `${metric.value}/100`;
    }
    return `${metric.value} ${metric.unit}`;
  };

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 80) return 'text-green-600';
    if (percentile >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredMetrics = teamInsights?.metrics.filter(metric => 
    selectedCategory === 'all' || metric.category === selectedCategory
  ) || [];

  const filteredTrends = teamInsights?.trends.filter(trend => 
    selectedCategory === 'all' || 
    filteredMetrics.some(m => m.name.toLowerCase().includes(trend.metric.toLowerCase()))
  ) || [];

  const filteredComparisons = teamInsights?.comparisons.filter(comparison => 
    selectedCategory === 'all' || comparison.category === selectedCategory
  ) || [];

  return (
    <div className="team-insights-panel p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Team Insights</h3>
        <div className="flex items-center space-x-3">
          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {periodOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as MetricCategory | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categoryOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Privacy Settings */}
          <button
            onClick={() => setShowPrivacySettings(true)}
            className="p-2 text-gray-500 hover:text-gray-700"
            title="Privacy Settings"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onInsightsRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Privacy Settings Modal */}
      {showPrivacySettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Privacy Settings</h4>
              <button
                onClick={() => setShowPrivacySettings(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-md">
                <h5 className="font-medium text-blue-900 mb-2">Current Privacy Level</h5>
                <p className="text-sm text-blue-800">
                  {teamInsights?.privacy.anonymizeIndividuals ? 'Individual data is anonymized' : 'Individual data is visible'}
                </p>
                <p className="text-sm text-blue-800">
                  Aggregation level: {teamInsights?.privacy.aggregationLevel}
                </p>
                <p className="text-sm text-blue-800">
                  Data retention: {teamInsights?.privacy.retentionDays} days
                </p>
              </div>

              <div className="text-sm text-gray-600">
                <p>Team insights are designed to protect individual privacy while providing valuable team-level analytics.</p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Individual contributions are anonymized</li>
                  <li>Only aggregated team metrics are shown</li>
                  <li>No personal performance data is exposed</li>
                  <li>Data is automatically cleaned after retention period</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowPrivacySettings(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading team insights...</p>
        </div>
      ) : !teamInsights ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
          </svg>
          <p>No team insights available</p>
          <p className="text-sm">Insights will be generated as team activity increases</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Key Metrics */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Key Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredMetrics.map((metric, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{getMetricIcon(metric.category)}</span>
                    <span className="text-lg">{getChangeIcon(metric.changeDirection)}</span>
                  </div>
                  
                  <h5 className="font-medium text-gray-900 mb-1">{metric.name}</h5>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {formatMetricValue(metric)}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className={`${
                      metric.changeDirection === 'up' ? 'text-green-600' : 
                      metric.changeDirection === 'down' ? 'text-red-600' : 
                      'text-gray-600'
                    }`}>
                      {formatPercentage(Math.abs(metric.change))} {metric.changeDirection}
                    </span>
                    
                    {metric.benchmark && (
                      <span className="text-gray-500">
                        vs {formatMetricValue({ ...metric, value: metric.benchmark })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trends */}
          {filteredTrends.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">Trends</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredTrends.map((trend, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-gray-900 capitalize">{trend.metric}</h5>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getTrendIcon(trend.direction)}</span>
                        <span className="text-sm text-gray-500">
                          {Math.round(trend.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>

                    {/* Simple trend visualization */}
                    <div className="mb-3">
                      <div className="flex items-end space-x-1 h-16">
                        {trend.dataPoints.slice(-7).map((point, i) => {
                          const maxValue = Math.max(...trend.dataPoints.map(p => p.value));
                          const height = maxValue > 0 ? (point.value / maxValue) * 100 : 0;
                          
                          return (
                            <div
                              key={i}
                              className="flex-1 bg-blue-200 rounded-t"
                              style={{ height: `${height}%` }}
                              title={`${point.value} (${point.anonymizedContributors} contributors)`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Insights */}
                    <div className="space-y-1">
                      {trend.insights.slice(0, 2).map((insight, i) => (
                        <p key={i} className="text-sm text-gray-600">
                          • {insight}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comparisons */}
          {filteredComparisons.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">Industry Comparisons</h4>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Metric
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Team Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Industry Avg
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Percentile
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Performance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredComparisons.map((comparison, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {comparison.metric}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {comparison.teamValue.toFixed(1)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {comparison.benchmarkValue.toFixed(1)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={getPercentileColor(comparison.percentile)}>
                              {comparison.percentile.toFixed(0)}th
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    comparison.percentile >= 80 ? 'bg-green-500' :
                                    comparison.percentile >= 60 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${comparison.percentile}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">
                                {comparison.percentile >= 80 ? 'Excellent' :
                                 comparison.percentile >= 60 ? 'Good' :
                                 'Needs Improvement'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <div>
                <h5 className="font-medium text-blue-900 mb-1">Privacy Protected</h5>
                <p className="text-sm text-blue-800">
                  All insights are anonymized and aggregated to protect individual privacy. 
                  No personal performance data is exposed in these team-level metrics.
                </p>
              </div>
            </div>
          </div>

          {/* Generated timestamp */}
          <div className="text-center text-sm text-gray-500">
            Last updated: {new Intl.DateTimeFormat('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }).format(teamInsights.generatedAt)}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamInsightsPanel;