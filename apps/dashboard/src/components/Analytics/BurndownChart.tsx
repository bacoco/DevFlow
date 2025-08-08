/**
 * Burndown Chart Component
 * Displays project burndown with ideal vs actual progress
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Area,
  ComposedChart,
} from 'recharts';
import { Card } from '../ui/Card';
import { TrendData, BurndownData } from '../../types/analytics';
import { format, parseISO } from 'date-fns';

interface BurndownChartProps {
  data: TrendData[] | BurndownData[];
  loading?: boolean;
  title?: string;
  showScope?: boolean;
  className?: string;
}

export const BurndownChart: React.FC<BurndownChartProps> = ({
  data,
  loading = false,
  title = 'Burndown Chart',
  showScope = false,
  className = '',
}) => {
  const chartData = useMemo(() => {
    return data.map((item, index) => {
      const baseData = {
        date: format(parseISO(item.date), 'MMM dd'),
        actual: item.value,
      };

      // If it's BurndownData, include additional fields
      if ('ideal' in item) {
        return {
          ...baseData,
          ideal: item.ideal,
          remaining: item.remaining,
          completed: item.completed,
          scope: 'scope' in item ? item.scope : undefined,
        };
      }

      // For TrendData, calculate ideal burndown
      const totalDays = data.length;
      const totalWork = data[0]?.value || 0;
      const ideal = totalWork - (totalWork / totalDays) * (index + 1);

      return {
        ...baseData,
        ideal: Math.max(0, ideal),
      };
    });
  }, [data]);

  const burndownMetrics = useMemo(() => {
    if (chartData.length === 0) return null;

    const latest = chartData[chartData.length - 1];
    const initial = chartData[0];
    
    const totalWork = initial.ideal || initial.actual;
    const remainingWork = latest.actual;
    const completedWork = totalWork - remainingWork;
    const progressPercentage = totalWork > 0 ? (completedWork / totalWork) * 100 : 0;
    
    // Calculate if on track
    const idealRemaining = latest.ideal || 0;
    const variance = remainingWork - idealRemaining;
    const isOnTrack = variance <= totalWork * 0.1; // Within 10% tolerance

    return {
      totalWork,
      remainingWork,
      completedWork,
      progressPercentage,
      variance,
      isOnTrack,
    };
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value} {entry.name.includes('scope') ? '' : 'tasks'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-1/3"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          {burndownMetrics && (
            <div className="flex items-center gap-4 mt-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Progress: <span className="font-medium">{burndownMetrics.progressPercentage.toFixed(1)}%</span>
              </div>
              <div className={`text-sm font-medium ${
                burndownMetrics.isOnTrack 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {burndownMetrics.isOnTrack ? '✓ On Track' : '⚠ Behind Schedule'}
              </div>
            </div>
          )}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="h-64"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="currentColor"
              className="text-gray-200 dark:text-gray-700"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
              axisLine={{ stroke: 'currentColor' }}
              tickLine={{ stroke: 'currentColor' }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
              axisLine={{ stroke: 'currentColor' }}
              tickLine={{ stroke: 'currentColor' }}
              label={{ 
                value: 'Remaining Tasks', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Ideal burndown line */}
            <Line
              type="monotone"
              dataKey="ideal"
              name="Ideal"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              animationDuration={800}
              animationEasing="ease-out"
            />
            
            {/* Actual burndown line */}
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              animationDuration={800}
              animationEasing="ease-out"
            />

            {/* Scope changes (if available) */}
            {showScope && chartData.some(d => d.scope !== undefined) && (
              <Line
                type="monotone"
                dataKey="scope"
                name="Scope"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={{ r: 3, strokeWidth: 0 }}
                animationDuration={800}
                animationEasing="ease-out"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Burndown Insights */}
      {burndownMetrics && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Burndown Analysis
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total Work:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {burndownMetrics.totalWork.toFixed(0)} tasks
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Completed:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {burndownMetrics.completedWork.toFixed(0)} tasks
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Remaining:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {burndownMetrics.remainingWork.toFixed(0)} tasks
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Variance:</span>
              <span className={`ml-2 font-medium ${
                burndownMetrics.variance <= 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {burndownMetrics.variance > 0 ? '+' : ''}{burndownMetrics.variance.toFixed(0)} tasks
              </span>
            </div>
          </div>
          
          {/* Recommendations */}
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {burndownMetrics.isOnTrack 
                ? '✓ Project is on track to meet the deadline. Continue current pace.'
                : burndownMetrics.variance > 0
                ? '⚠ Project is behind schedule. Consider increasing velocity or adjusting scope.'
                : '🚀 Project is ahead of schedule. Great work!'
              }
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};