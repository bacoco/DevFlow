/**
 * Task Metrics Cards Component
 * Displays key task metrics in card format with trends
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/Card';
import { TaskMetrics } from '../../types/analytics';
import {
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
} from '@heroicons/react/24/outline';

interface TaskMetricsCardsProps {
  metrics: TaskMetrics;
  loading?: boolean;
  previousMetrics?: TaskMetrics;
  className?: string;
}

interface MetricCardData {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  change?: number;
  changeLabel?: string;
  format?: 'number' | 'percentage' | 'time' | 'rate';
}

export const TaskMetricsCards: React.FC<TaskMetricsCardsProps> = ({
  metrics,
  loading = false,
  previousMetrics,
  className = '',
}) => {
  const formatValue = (value: number, format: string = 'number'): string => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'time':
        if (value < 24) {
          return `${value.toFixed(1)}h`;
        } else {
          return `${(value / 24).toFixed(1)}d`;
        }
      case 'rate':
        return `${value.toFixed(1)}/day`;
      default:
        return value.toString();
    }
  };

  const calculateChange = (current: number, previous?: number): number | undefined => {
    if (previous === undefined || previous === 0) return undefined;
    return ((current - previous) / previous) * 100;
  };

  const metricsData: MetricCardData[] = [
    {
      id: 'completion-rate',
      title: 'Completion Rate',
      value: formatValue(metrics.completionRate, 'percentage'),
      subtitle: `${metrics.completedTasks} of ${metrics.totalTasks} tasks`,
      icon: CheckCircleIcon,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      change: calculateChange(metrics.completionRate, previousMetrics?.completionRate),
      format: 'percentage',
    },
    {
      id: 'velocity',
      title: 'Velocity',
      value: formatValue(metrics.velocity, 'rate'),
      subtitle: 'Tasks completed per day',
      icon: TrendingUpIcon,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      change: calculateChange(metrics.velocity, previousMetrics?.velocity),
      format: 'rate',
    },
    {
      id: 'avg-completion-time',
      title: 'Avg Completion Time',
      value: formatValue(metrics.averageCompletionTime, 'time'),
      subtitle: 'From creation to completion',
      icon: ClockIcon,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      change: calculateChange(metrics.averageCompletionTime, previousMetrics?.averageCompletionTime),
      format: 'time',
    },
    {
      id: 'burndown-rate',
      title: 'Burndown Rate',
      value: formatValue(metrics.burndownRate, 'percentage'),
      subtitle: 'Work completed vs planned',
      icon: ChartBarIcon,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      change: calculateChange(metrics.burndownRate, previousMetrics?.burndownRate),
      format: 'percentage',
    },
    {
      id: 'cycle-time',
      title: 'Cycle Time',
      value: formatValue(metrics.cycleTime, 'time'),
      subtitle: 'From start to completion',
      icon: ClockIcon,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      change: calculateChange(metrics.cycleTime, previousMetrics?.cycleTime),
      format: 'time',
    },
    {
      id: 'overdue-tasks',
      title: 'Overdue Tasks',
      value: metrics.overdueTasks,
      subtitle: `${((metrics.overdueTasks / metrics.totalTasks) * 100).toFixed(1)}% of total`,
      icon: ExclamationTriangleIcon,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      change: calculateChange(metrics.overdueTasks, previousMetrics?.overdueTasks),
      format: 'number',
    },
  ];

  const getTrendIcon = (change?: number) => {
    if (change === undefined) return MinusIcon;
    if (change > 0) return TrendingUpIcon;
    if (change < 0) return TrendingDownIcon;
    return MinusIcon;
  };

  const getTrendColor = (change?: number, metricId?: string) => {
    if (change === undefined) return 'text-gray-400';
    
    // For some metrics, negative change is good (like completion time, overdue tasks)
    const negativeIsGood = ['avg-completion-time', 'cycle-time', 'overdue-tasks'].includes(metricId || '');
    
    if (negativeIsGood) {
      return change < 0 ? 'text-green-500' : change > 0 ? 'text-red-500' : 'text-gray-400';
    } else {
      return change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="p-6">
            <div className="animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {metricsData.map((metric, index) => {
        const Icon = metric.icon;
        const TrendIcon = getTrendIcon(metric.change);
        
        return (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="p-6 hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <Icon className={`h-6 w-6 ${metric.color}`} />
                </div>
                {metric.change !== undefined && (
                  <div className={`flex items-center text-sm ${getTrendColor(metric.change, metric.id)}`}>
                    <TrendIcon className="h-4 w-4 mr-1" />
                    <span>{Math.abs(metric.change).toFixed(1)}%</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {metric.title}
                </h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metric.value}
                </p>
                {metric.subtitle && (
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    {metric.subtitle}
                  </p>
                )}
              </div>

              {/* Progress bar for completion rate */}
              {metric.id === 'completion-rate' && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(metrics.completionRate, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Status indicator for overdue tasks */}
              {metric.id === 'overdue-tasks' && (
                <div className="mt-4">
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    metrics.overdueTasks === 0
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : metrics.overdueTasks <= 3
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {metrics.overdueTasks === 0 
                      ? 'All on track' 
                      : metrics.overdueTasks <= 3 
                      ? 'Needs attention' 
                      : 'Critical'
                    }
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};