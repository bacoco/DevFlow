import React, { useState } from 'react';
import Head from 'next/head';
import { AuthProvider } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/Auth/ProtectedRoute';
import { WebSocketProvider } from '../contexts/WebSocketContext';
import { LineChart } from '../components/Charts/LineChart';
import { BarChart } from '../components/Charts/BarChart';

const AnalyticsContent: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');

  // Mock analytics data
  const productivityData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Productivity Score',
        data: [75, 82, 78, 85, 90, 65, 70],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Flow Time (hours)',
        data: [4.5, 6.2, 5.8, 7.1, 8.2, 3.5, 4.0],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
      }
    ]
  };

  const codeQualityData = {
    labels: ['Code Coverage', 'Bug Rate', 'Code Churn', 'Review Time', 'Complexity'],
    datasets: [
      {
        label: 'Current Week',
        data: [85, 2.1, 15, 4.5, 6.2],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
      },
      {
        label: 'Previous Week',
        data: [82, 2.8, 18, 5.2, 6.8],
        backgroundColor: 'rgba(156, 163, 175, 0.8)',
      }
    ]
  };

  const teamMetrics = [
    { name: 'Total Commits', value: 247, change: '+12%', trend: 'up' },
    { name: 'Code Reviews', value: 89, change: '+8%', trend: 'up' },
    { name: 'Bug Reports', value: 23, change: '-15%', trend: 'down' },
    { name: 'Feature Releases', value: 12, change: '+25%', trend: 'up' },
  ];

  const getTrendColor = (trend: string) => {
    return trend === 'up' ? 'text-green-600' : 'text-red-600';
  };

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? '↗️' : '↘️';
  };

  return (
    <>
      <Head>
        <title>Analytics - DevFlow Dashboard</title>
        <meta name="description" content="Development team analytics and insights" />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <nav className="flex space-x-4">
              <a href="/" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
                Dashboard
              </a>
              <a href="/tasks" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
                Task Manager
              </a>
              <a href="/code-archaeology" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
                Code Archaeology
              </a>
              <a href="/analytics" className="bg-blue-600 text-white px-4 py-2 rounded-md">
                Analytics
              </a>
            </nav>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-2">Comprehensive insights into team productivity and code quality</p>
            </div>
            
            {/* Time Range Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setTimeRange('day')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  timeRange === 'day' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setTimeRange('week')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  timeRange === 'week' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setTimeRange('month')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  timeRange === 'month' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Month
              </button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {teamMetrics.map((metric) => (
              <div key={metric.name} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{metric.name}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{metric.value}</p>
                  </div>
                  <div className={`text-right ${getTrendColor(metric.trend)}`}>
                    <div className="text-2xl">{getTrendIcon(metric.trend)}</div>
                    <div className="text-sm font-medium">{metric.change}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Productivity Trends */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Productivity Trends</h3>
              <div className="h-80">
                <LineChart 
                  data={productivityData}
                  width={500}
                  height={300}
                />
              </div>
            </div>

            {/* Code Quality Metrics */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Code Quality Comparison</h3>
              <div className="h-80">
                <BarChart 
                  data={codeQualityData}
                  width={500}
                  height={300}
                />
              </div>
            </div>
          </div>

          {/* Detailed Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Team Performance */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Performance</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Average Productivity</span>
                  <span className="font-semibold text-gray-900">82%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '82%' }}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Code Quality Score</span>
                  <span className="font-semibold text-gray-900">91%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '91%' }}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Delivery Speed</span>
                  <span className="font-semibold text-gray-900">76%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '76%' }}></div>
                </div>
              </div>
            </div>

            {/* Recent Activities */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Feature deployment completed</p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Code review cycle improved</p>
                    <p className="text-xs text-gray-500">4 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Performance optimization deployed</p>
                    <p className="text-xs text-gray-500">1 day ago</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">New team member onboarded</p>
                    <p className="text-xs text-gray-500">2 days ago</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Insights */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Insights</h3>
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">🚀 Productivity Boost</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Team productivity increased 15% this week. Focus time sessions are showing great results.
                  </p>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-900">✅ Quality Improvement</p>
                  <p className="text-xs text-green-700 mt-1">
                    Bug rate decreased by 20%. Code review process improvements are paying off.
                  </p>
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-900">⚠️ Attention Needed</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Code complexity in AuthService.ts is increasing. Consider refactoring.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default function AnalyticsPage() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <WebSocketProvider autoConnect={false}>
          <AnalyticsContent />
        </WebSocketProvider>
      </ProtectedRoute>
    </AuthProvider>
  );
}