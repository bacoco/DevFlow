/**
 * Error Analytics Dashboard
 * Monitoring and visualization of error patterns and trends
 */

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Clock, 
  BarChart3, 
  PieChart, 
  Activity,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';
import { ErrorAnalytics } from '../../services/error-handling/ErrorAnalytics';
import { ErrorAnalytics as ErrorAnalyticsData, ErrorCategory, ErrorSeverity } from '../../services/error-handling/types';

interface ErrorAnalyticsDashboardProps {
  className?: string;
}

export const ErrorAnalyticsDashboard: React.FC<ErrorAnalyticsDashboardProps> = ({ className }) => {
  const [analytics, setAnalytics] = useState<ErrorAnalyticsData[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [userImpact, setUserImpact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week' | 'month'>('day');
  const [selectedCategory, setSelectedCategory] = useState<ErrorCategory | 'all'>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<ErrorSeverity | 'all'>('all');

  const errorAnalytics = new ErrorAnalytics();

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const analyticsData = errorAnalytics.getAnalytics();
      const trendsData = errorAnalytics.getErrorTrends(timeRange);
      const categoriesData = errorAnalytics.getTopErrorCategories();
      const userImpactData = errorAnalytics.getUserImpactAnalysis();

      setAnalytics(analyticsData);
      setTrends(trendsData);
      setCategories(categoriesData);
      setUserImpact(userImpactData);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const exportData = errorAnalytics.exportAnalytics();
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredAnalytics = analytics.filter(item => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (selectedSeverity !== 'all' && item.severity !== selectedSeverity) return false;
    return true;
  });

  const totalErrors = analytics.reduce((sum, item) => sum + item.count, 0);
  const criticalErrors = analytics.filter(item => item.severity === 'critical').reduce((sum, item) => sum + item.count, 0);
  const averageResolutionRate = analytics.length > 0 
    ? analytics.reduce((sum, item) => sum + item.resolutionRate, 0) / analytics.length 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className={`error-analytics-dashboard space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Error Analytics</h2>
          <p className="text-gray-600">Monitor and analyze error patterns across the application</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadAnalyticsData}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="hour">Last Hour</option>
            <option value="day">Last Day</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="network">Network</option>
            <option value="ui">UI</option>
            <option value="data">Data</option>
            <option value="auth">Auth</option>
            <option value="performance">Performance</option>
            <option value="accessibility">Accessibility</option>
            <option value="unknown">Unknown</option>
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Errors</p>
              <p className="text-2xl font-bold text-gray-900">{totalErrors.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Critical Errors</p>
              <p className="text-2xl font-bold text-gray-900">{criticalErrors.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Affected Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {userImpact?.totalAffectedUsers?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Resolution Rate</p>
              <p className="text-2xl font-bold text-gray-900">{averageResolutionRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Trends Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Error Trends</h3>
          <BarChart3 className="w-5 h-5 text-gray-500" />
        </div>
        <div className="h-64 flex items-center justify-center text-gray-500">
          {trends.length > 0 ? (
            <div className="w-full">
              <div className="text-sm text-gray-600 mb-2">
                Showing {trends.length} data points over {timeRange}
              </div>
              {/* Simplified trend visualization */}
              <div className="flex items-end space-x-1 h-32">
                {trends.map((point, index) => (
                  <div
                    key={index}
                    className="bg-blue-500 rounded-t"
                    style={{
                      height: `${Math.max(4, (point.count / Math.max(...trends.map(t => t.count))) * 100)}%`,
                      width: `${100 / trends.length}%`
                    }}
                    title={`${point.count} errors at ${point.timestamp.toLocaleTimeString()}`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p>No trend data available</p>
          )}
        </div>
      </div>

      {/* Error Categories and Top Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Error Categories */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Error Categories</h3>
            <PieChart className="w-5 h-5 text-gray-500" />
          </div>
          <div className="space-y-3">
            {categories.map((category, index) => (
              <div key={category.category} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}
                  />
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {category.category}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {category.count}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({category.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Errors */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Errors</h3>
            <Clock className="w-5 h-5 text-gray-500" />
          </div>
          <div className="space-y-3">
            {filteredAnalytics.slice(0, 5).map((error, index) => (
              <div key={error.errorId} className="border-l-4 border-red-400 pl-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {error.component}
                    </p>
                    <p className="text-xs text-gray-500">
                      {error.category} • {error.severity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {error.count}
                    </p>
                    <p className="text-xs text-gray-500">
                      {error.affectedUsers} users
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Error List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Error Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Component
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Affected Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resolution Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Occurrence
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAnalytics.map((error) => (
                <tr key={error.errorId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {error.component}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                      {error.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      error.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      error.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      error.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {error.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {error.count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {error.affectedUsers}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {error.resolutionRate.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {error.lastOccurrence.toLocaleDateString()} {error.lastOccurrence.toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};