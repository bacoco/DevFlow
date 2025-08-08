/**
 * Velocity Chart Component
 * Displays task completion velocity over time with trend analysis
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  Legend,
} from 'recharts';
import { Card } from '../ui/Card';
import { TrendData } from '../../types/analytics';
import { format, parseISO } from 'date-fns';

interface VelocityChartProps {
  data: TrendData[];
  loading?: boolean;
  title?: string;
  showTarget?: boolean;
  targetValue?: number;
  className?: string;
}

export const VelocityChart: React.FC<VelocityChartProps> = ({
  data,
  loading = false,
  title = 'Velocity Chart',
  showTarget = false,
  targetValue,
  className = '',
}) => {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      date: format(parseISO(item.date), 'MMM dd'),
      velocity: item.value,
      target: item.target || targetValue,
    }));
  }, [data, targetValue]);

  const averageVelocity = useMemo(() => {
    if (data.length === 0) return 0;
    return data.reduce((sum, item) => sum + item.value, 0) / data.length;
  }, [data]);

  const velocityTrend = useMemo(() => {
    if (data.length < 2) return 0;
    
    const recent = data.slice(-7); // Last 7 data points
    const older = data.slice(-14, -7); // Previous 7 data points
    
    if (older.length === 0) return 0;
    
    const recentAvg = recent.reduce((sum, item) => sum + item.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, item) => sum + item.value, 0) / older.length;
    
    return ((recentAvg - olderAvg) / olderAvg) * 100;
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
              {entry.name}: {entry.value} {entry.name === 'velocity' ? 'tasks' : ''}
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
          <div className="flex items-center gap-4 mt-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Avg: <span className="font-medium">{averageVelocity.toFixed(1)} tasks/day</span>
            </div>
            <div className={`text-sm font-medium ${
              velocityTrend > 0 
                ? 'text-green-600 dark:text-green-400' 
                : velocityTrend < 0 
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {velocityTrend > 0 ? '↗' : velocityTrend < 0 ? '↘' : '→'} 
              {Math.abs(velocityTrend).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="h-64"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
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
            
            <Bar
              dataKey="velocity"
              name="Velocity"
              fill="#3b82f6"
              radius={[2, 2, 0, 0]}
              animationDuration={800}
              animationEasing="ease-out"
            />
            
            {showTarget && (
              <ReferenceLine
                y={targetValue || averageVelocity}
                stroke="#10b981"
                strokeDasharray="5 5"
                label={{ value: "Target", position: "topRight" }}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Velocity Insights */}
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          Velocity Insights
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Peak Day:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {chartData.reduce((max, item) => 
                item.velocity > max.velocity ? item : max, chartData[0]
              )?.date || 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Peak Velocity:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {Math.max(...data.map(d => d.value)).toFixed(1)} tasks
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Consistency:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {data.length > 1 ? (
                100 - (Math.sqrt(
                  data.reduce((sum, item) => {
                    const diff = item.value - averageVelocity;
                    return sum + diff * diff;
                  }, 0) / data.length
                ) / averageVelocity * 100)
              ).toFixed(0) : 100}%
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};