import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Widget } from './Widget';
import { Widget as WidgetType, MetricSummary } from '../../types/dashboard';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Activity, 
  AlertCircle,
  BarChart3,
  Zap,
  Clock,
  Target,
  Bug
} from 'lucide-react';
import { useRealTimeSync } from '../../hooks/useRealTimeSync';
import { useDataStore } from '../../stores/dataStore';

interface MetricCardProps {
  widget: WidgetType;
  onRefresh?: () => void;
  onConfigure?: () => void;
  onRemove?: () => void;
  loading?: boolean;
  error?: string;
  realTimeEnabled?: boolean;
}

interface TrendData {
  value: number;
  timestamp: Date;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  widget,
  onRefresh,
  onConfigure,
  onRemove,
  loading,
  error,
  realTimeEnabled = true
}) => {
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [trendHistory, setTrendHistory] = useState<TrendData[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const { updateWidgetData } = useDataStore();
  const summary = widget.data?.summary;
  const metricType = widget.config.metrics[0] || '';

  // Real-time data sync
  const { data: realTimeData, isConnected } = useRealTimeSync(
    realTimeEnabled ? `widget-${widget.id}` : null,
    {
      onDataUpdate: (newData) => {
        if (newData.summary && summary) {
          // Trigger animation if value changed
          if (newData.summary.current !== summary.current) {
            setPreviousValue(summary.current);
            setIsAnimating(true);
            setTimeout(() => setIsAnimating(false), 1000);
          }
          
          // Update trend history
          setTrendHistory(prev => [
            ...prev.slice(-9), // Keep last 9 points
            { value: newData.summary.current, timestamp: new Date() }
          ]);
        }
        
        updateWidgetData(widget.id, newData);
      }
    }
  );

  // Initialize trend history
  useEffect(() => {
    if (summary && trendHistory.length === 0) {
      setTrendHistory([
        { value: summary.previous, timestamp: new Date(Date.now() - 60000) },
        { value: summary.current, timestamp: new Date() }
      ]);
    }
  }, [summary, trendHistory.length]);

  const getMetricIcon = (type: string) => {
    const iconProps = { size: 20, className: "text-gray-400" };
    switch (type) {
      case 'productivity_score':
        return <Zap {...iconProps} className="text-blue-500" />;
      case 'time_in_flow':
        return <Clock {...iconProps} className="text-green-500" />;
      case 'commit_frequency':
        return <Activity {...iconProps} className="text-purple-500" />;
      case 'bug_rate':
        return <Bug {...iconProps} className="text-red-500" />;
      case 'code_churn':
        return <BarChart3 {...iconProps} className="text-orange-500" />;
      case 'review_lag':
        return <Target {...iconProps} className="text-indigo-500" />;
      default:
        return <Activity {...iconProps} />;
    }
  };

  const getTrendIcon = (trend: string) => {
    const iconProps = { size: 16 };
    switch (trend) {
      case 'up':
        return <TrendingUp {...iconProps} className="text-green-500" />;
      case 'down':
        return <TrendingDown {...iconProps} className="text-red-500" />;
      default:
        return <Minus {...iconProps} className="text-gray-400" />;
    }
  };

  const getTrendColor = (trend: string, changePercent: number) => {
    const isPositiveGood = ['productivity_score', 'time_in_flow', 'commit_frequency'].includes(metricType);
    const isNegativeGood = ['bug_rate', 'review_lag', 'code_churn'].includes(metricType);
    
    if (Math.abs(changePercent) < 1) return 'text-gray-600';
    
    if (trend === 'up') {
      return isPositiveGood ? 'text-green-600' : 'text-red-600';
    } else if (trend === 'down') {
      return isNegativeGood ? 'text-green-600' : 'text-red-600';
    }
    return 'text-gray-600';
  };

  const getTrendBgColor = (trend: string, changePercent: number) => {
    const isPositiveGood = ['productivity_score', 'time_in_flow', 'commit_frequency'].includes(metricType);
    const isNegativeGood = ['bug_rate', 'review_lag', 'code_churn'].includes(metricType);
    
    if (Math.abs(changePercent) < 1) return 'bg-gray-50';
    
    if (trend === 'up') {
      return isPositiveGood ? 'bg-green-50' : 'bg-red-50';
    } else if (trend === 'down') {
      return isNegativeGood ? 'bg-green-50' : 'bg-red-50';
    }
    return 'bg-gray-50';
  };

  const formatValue = (value: number, metricType: string) => {
    if (typeof value !== 'number' || isNaN(value)) return '—';
    
    switch (metricType) {
      case 'time_in_flow':
        return value >= 1 ? `${value.toFixed(1)}h` : `${Math.round(value * 60)}m`;
      case 'productivity_score':
        return `${Math.round(value)}%`;
      case 'commit_frequency':
        return `${value.toFixed(1)}/day`;
      case 'bug_rate':
        return `${value.toFixed(2)}%`;
      case 'code_churn':
        return `${value.toFixed(1)}%`;
      case 'review_lag':
        return value >= 24 ? `${(value / 24).toFixed(1)}d` : `${Math.round(value)}h`;
      default:
        return value.toLocaleString();
    }
  };

  const getMetricLabel = (type: string) => {
    switch (type) {
      case 'time_in_flow':
        return 'Time in Flow';
      case 'productivity_score':
        return 'Productivity Score';
      case 'commit_frequency':
        return 'Commit Frequency';
      case 'bug_rate':
        return 'Bug Rate';
      case 'code_churn':
        return 'Code Churn';
      case 'review_lag':
        return 'Review Lag';
      default:
        return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  // Mini trend chart data
  const trendChartData = useMemo(() => {
    if (trendHistory.length < 2) return [];
    
    const maxValue = Math.max(...trendHistory.map(d => d.value));
    const minValue = Math.min(...trendHistory.map(d => d.value));
    const range = maxValue - minValue || 1;
    
    return trendHistory.map((point, index) => ({
      x: (index / (trendHistory.length - 1)) * 100,
      y: 100 - ((point.value - minValue) / range) * 100
    }));
  }, [trendHistory]);

  const pathData = trendChartData.length > 1 
    ? `M ${trendChartData.map(p => `${p.x},${p.y}`).join(' L ')}`
    : '';

  return (
    <Widget
      widget={widget}
      onRefresh={onRefresh}
      onConfigure={onConfigure}
      onRemove={onRemove}
      loading={loading}
      error={error}
    >
      {summary ? (
        <div className="h-full flex flex-col">
          {/* Header with icon and connection status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              {getMetricIcon(metricType)}
              <span className="text-sm font-medium text-gray-600">
                {getMetricLabel(metricType)}
              </span>
            </div>
            
            {realTimeEnabled && (
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-400' : 'bg-gray-300'
                }`} />
                <span className="text-xs text-gray-500">
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
            )}
          </div>

          {/* Main metric value with animation */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-center mb-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={summary.current}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.2, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`text-4xl font-bold mb-2 ${
                    isAnimating ? 'text-blue-600' : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {formatValue(summary.current, metricType)}
                </motion.div>
              </AnimatePresence>
              
              {previousValue !== null && isAnimating && (
                <motion.div
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="text-lg text-gray-400 absolute"
                  style={{ marginTop: '-3rem' }}
                >
                  {formatValue(previousValue, metricType)}
                </motion.div>
              )}
            </div>

            {/* Trend indicator */}
            <motion.div 
              className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg ${
                getTrendBgColor(summary.trend, summary.changePercent)
              }`}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              {getTrendIcon(summary.trend)}
              <span className={`text-sm font-semibold ${
                getTrendColor(summary.trend, summary.changePercent)
              }`}>
                {summary.changePercent > 0 ? '+' : ''}{summary.changePercent.toFixed(1)}%
              </span>
              <span className="text-sm text-gray-500">
                vs {widget.config.timeRange}
              </span>
            </motion.div>

            {/* Mini trend chart */}
            {trendChartData.length > 1 && (
              <div className="mt-4">
                <div className="text-xs text-gray-500 mb-2 text-center">Trend</div>
                <div className="h-12 w-full">
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 100 100"
                    className="overflow-visible"
                  >
                    <defs>
                      <linearGradient id={`gradient-${widget.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    
                    {/* Trend line */}
                    <motion.path
                      d={pathData}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={getTrendColor(summary.trend, summary.changePercent)}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, ease: "easeInOut" }}
                    />
                    
                    {/* Fill area under curve */}
                    <motion.path
                      d={`${pathData} L 100,100 L 0,100 Z`}
                      fill={`url(#gradient-${widget.id})`}
                      className={getTrendColor(summary.trend, summary.changePercent)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                    />
                    
                    {/* Data points */}
                    {trendChartData.map((point, index) => (
                      <motion.circle
                        key={index}
                        cx={point.x}
                        cy={point.y}
                        r="1.5"
                        fill="currentColor"
                        className={getTrendColor(summary.trend, summary.changePercent)}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      />
                    ))}
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Comparison data */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center text-xs text-gray-500">
              <div>
                <span className="font-medium">Previous:</span>{' '}
                {formatValue(summary.previous, metricType)}
              </div>
              <div>
                <span className="font-medium">Change:</span>{' '}
                <span className={getTrendColor(summary.trend, summary.changePercent)}>
                  {summary.change > 0 ? '+' : ''}{formatValue(Math.abs(summary.change), metricType)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-gray-500">
            <AlertCircle size={24} className="mx-auto mb-2" />
            <p className="text-sm">No data available</p>
          </div>
        </div>
      )}
    </Widget>
  );
};

export default MetricCard;