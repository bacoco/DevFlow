/**
 * Completion Trend Chart Component
 * Displays task completion trends over time with moving averages
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
  ReferenceLine,
} from 'recharts';
import { Card } from '../ui/Card';
import { TrendData } from '../../types/analytics';
import { format, parseISO } from 'date-fns';

interface CompletionTrendChartProps {
  data: TrendData[];
  loading?: boolean;
  title?: string;
  showMovingAverage?: boolean;
  movingAveragePeriod?: number;
  color?: string;
  className?: string;
}

export const CompletionTrendChart: React.FC<CompletionTrendChartProps> = ({
  data,
  loading = false,
  title = 'Completion Trend',
  showMovingAverage = false,
  movingAveragePeriod = 7,
  color = '#3b82f6',
  className = '',
}) => {
  const chartData = useMemo(() => {
    const processedData = data.map((item) => ({
      ...item,
      date: format(parseISO(item.date), 'MMM dd'),
      completed: item.value,
    }));

    // Calculate moving average if requested
    if (showMovingAverage) {
      return processedData.map((item, index) => {
        const start = Math.max(0, index - movingAveragePeriod + 1);
        const slice = processedData.slice(start, index + 1);
        const movingAvg = slice.reduce((sum, d) => sum + d.completed, 0) / slice.length;
        
        return {
          ...item,
          movingAverage: movingAvg,
        };
      });
    }

    return processedData;
  }, [data, showMovingAverage, movingAveragePeriod]);

  const trendMetrics = useMemo(() => {
    if (data.length === 0) return null;

    const values = data.map(d => d.value);
    const total = values.reduce((sum, val) => sum + val, 0);
    const average = total / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    // Calculate trend direction
    const recent = values.slice(-7); // Last 7 data points
    const older = values.slice(-14, -7); // Previous 7 data points
    
    let trendDirection = 0;
    if (older.length > 0) {
      const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
      const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
      trendDirection = ((recentAvg - olderAvg) / olderAvg) * 100;
    }

    // Calculate consistency (inverse of coefficient of variation)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);
    const consistency = average > 0 ? Math.max(0, 100 - (standardDeviation / average * 100)) : 0;

    return {
      total,
      average,
      max,
      min,
      trendDirection,
      consistency,
    };
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(1)} tasks
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
          {trendMetrics && (
            <div className="flex items-center gap-4 mt-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Avg: <span className="font-medium">{trendMetrics.average.toFixed(1)} tasks/day</span>
              </div>
              <div className={`text-sm font-medium ${
                trendMetrics.trendDirection > 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : trendMetrics.trendDirection < 0 
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                {trendMetrics.trendDirection > 0 ? '↗' : trendMetrics.trendDirection < 0 ? '↘' : '→'} 
                {Math.abs(trendMetrics.trendDirection).toFixed(1)}%
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
          <LineChart
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
                value: 'Tasks Completed', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Main completion line */}
            <Line
              type="monotone"
              dataKey="completed"
              name="Completed"
              stroke={color}
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 0, className: "drop-shadow-lg" }}
              animationDuration={800}
              animationEasing="ease-out"
            />

            {/* Moving average line */}
            {showMovingAverage && (
              <Line
                type="monotone"
                dataKey="movingAverage"
                name={`${movingAveragePeriod}-day Average`}
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                animationDuration={800}
                animationEasing="ease-out"
              />
            )}

            {/* Average reference line */}
            {trendMetrics && (
              <ReferenceLine
                y={trendMetrics.average}
                stroke="#6b7280"
                strokeDasharray="3 3"
                label={{ value: "Average", position: "topRight" }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Trend Insights */}
      {trendMetrics && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Completion Analysis
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {trendMetrics.total} tasks
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Peak Day:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {trendMetrics.max} tasks
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Low Day:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {trendMetrics.min} tasks
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Consistency:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {trendMetrics.consistency.toFixed(0)}%
              </span>
            </div>
          </div>
          
          {/* Trend Interpretation */}
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {Math.abs(trendMetrics.trendDirection) < 5 
                ? '→ Completion rate is stable with minimal variation.'
                : trendMetrics.trendDirection > 0
                ? '↗ Completion rate is trending upward. Great momentum!'
                : '↘ Completion rate is declining. Consider reviewing workload and priorities.'
              }
              {trendMetrics.consistency > 80 && ' High consistency in daily completions.'}
              {trendMetrics.consistency < 60 && ' Consider establishing more consistent work patterns.'}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};