/**
 * Task Analytics Dashboard Component
 * Main dashboard for displaying task analytics and reporting features
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { VelocityChart } from './VelocityChart';
import { BurndownChart } from './BurndownChart';
import { CompletionTrendChart } from './CompletionTrendChart';
import { TaskMetricsCards } from './TaskMetricsCards';
import { ProductivityInsights } from './ProductivityInsights';
import { TeamPerformanceTable } from './TeamPerformanceTable';
import { ReportGenerator } from './ReportGenerator';
import { AnalyticsFilters } from './AnalyticsFilters';
import { useTaskAnalytics } from '../../hooks/useTaskAnalytics';
import { AnalyticsFilters as IAnalyticsFilters, TimeRange, ReportType } from '../../types/analytics';
import { 
  ChartBarIcon, 
  DocumentChartBarIcon, 
  UserGroupIcon,
  ClockIcon,
  TrendingUpIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface TaskAnalyticsDashboardProps {
  userId?: string;
  teamId?: string;
  className?: string;
}

export const TaskAnalyticsDashboard: React.FC<TaskAnalyticsDashboardProps> = ({
  userId,
  teamId,
  className = '',
}) => {
  const [filters, setFilters] = useState<IAnalyticsFilters>({
    timeRange: 'last30days',
    userIds: userId ? [userId] : undefined,
    teamIds: teamId ? [teamId] : undefined,
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'team' | 'reports'>('overview');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  const {
    metrics,
    trends,
    insights,
    teamPerformance,
    isLoading,
    error,
    refetch,
  } = useTaskAnalytics(filters);

  const tabs = useMemo(() => [
    {
      id: 'overview' as const,
      label: 'Overview',
      icon: ChartBarIcon,
      description: 'Key metrics and insights',
    },
    {
      id: 'trends' as const,
      label: 'Trends',
      icon: TrendingUpIcon,
      description: 'Historical trends and patterns',
    },
    {
      id: 'team' as const,
      label: 'Team Performance',
      icon: UserGroupIcon,
      description: 'Team and individual performance',
      disabled: !teamId,
    },
    {
      id: 'reports' as const,
      label: 'Reports',
      icon: DocumentChartBarIcon,
      description: 'Generate and export reports',
    },
  ], [teamId]);

  const handleFiltersChange = (newFilters: IAnalyticsFilters) => {
    setFilters(newFilters);
  };

  const handleExportReport = async (type: ReportType, format: string) => {
    // Implementation would be handled by ReportGenerator
    console.log('Exporting report:', { type, format, filters });
  };

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-500 mb-2">
            <ChartBarIcon className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Failed to Load Analytics
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error.message || 'An error occurred while loading analytics data.'}
          </p>
          <Button onClick={() => refetch()} variant="primary">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Task Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Insights and performance metrics for your tasks
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFiltersModal(true)}
            icon={<FunnelIcon className="h-4 w-4" />}
          >
            Filters
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReportModal(true)}
            icon={<DocumentArrowDownIcon className="h-4 w-4" />}
          >
            Export
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => refetch()}
            loading={isLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <ClockIcon className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Time Range:
          </span>
          <select
            value={filters.timeRange}
            onChange={(e) => handleFiltersChange({
              ...filters,
              timeRange: e.target.value as TimeRange,
            })}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option>
            <option value="last90days">Last 90 Days</option>
            <option value="thisWeek">This Week</option>
            <option value="lastWeek">Last Week</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="thisQuarter">This Quarter</option>
            <option value="lastQuarter">Last Quarter</option>
          </select>
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isDisabled = tab.disabled;
            
            return (
              <button
                key={tab.id}
                onClick={() => !isDisabled && setActiveTab(tab.id)}
                disabled={isDisabled}
                className={`
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${isActive
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : isDisabled
                    ? 'border-transparent text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <Icon className={`
                  -ml-0.5 mr-2 h-5 w-5 transition-colors
                  ${isActive
                    ? 'text-blue-500 dark:text-blue-400'
                    : isDisabled
                    ? 'text-gray-400 dark:text-gray-600'
                    : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400'
                  }
                `} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Metrics Cards */}
            {metrics && <TaskMetricsCards metrics={metrics} loading={isLoading} />}
            
            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {trends && (
                <>
                  <CompletionTrendChart
                    data={trends.completion}
                    loading={isLoading}
                    title="Task Completion Trend"
                  />
                  <VelocityChart
                    data={trends.velocity}
                    loading={isLoading}
                    title="Velocity Trend"
                  />
                </>
              )}
            </div>

            {/* Insights */}
            {insights && insights.length > 0 && (
              <ProductivityInsights insights={insights} />
            )}
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="space-y-6">
            {trends && (
              <>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <BurndownChart
                    data={trends.burndown}
                    loading={isLoading}
                    title="Burndown Chart"
                  />
                  <VelocityChart
                    data={trends.velocity}
                    loading={isLoading}
                    title="Velocity Chart"
                    showTarget={true}
                  />
                </div>
                
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <CompletionTrendChart
                    data={trends.completion}
                    loading={isLoading}
                    title="Completion Trend"
                    showMovingAverage={true}
                  />
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Cycle Time Trend
                    </h3>
                    <CompletionTrendChart
                      data={trends.cycleTime}
                      loading={isLoading}
                      title=""
                      color="#f59e0b"
                    />
                  </Card>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'team' && teamPerformance && (
          <div className="space-y-6">
            <TeamPerformanceTable
              teamPerformance={teamPerformance}
              loading={isLoading}
            />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <ReportGenerator
              filters={filters}
              onExport={handleExportReport}
              metrics={metrics}
              trends={trends}
              insights={insights}
              teamPerformance={teamPerformance}
            />
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <Modal
        isOpen={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        title="Analytics Filters"
        size="lg"
      >
        <AnalyticsFilters
          filters={filters}
          onChange={handleFiltersChange}
          onApply={() => setShowFiltersModal(false)}
        />
      </Modal>

      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Export Report"
        size="md"
      >
        <ReportGenerator
          filters={filters}
          onExport={handleExportReport}
          metrics={metrics}
          trends={trends}
          insights={insights}
          teamPerformance={teamPerformance}
          compact={true}
        />
      </Modal>
    </div>
  );
};