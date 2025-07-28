import React from 'react';
import { Widget } from './Widget';
import { Widget as WidgetType, MetricSummary } from '../../types/dashboard';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  widget: WidgetType;
  onRefresh?: () => void;
  onConfigure?: () => void;
  onRemove?: () => void;
  loading?: boolean;
  error?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  widget,
  onRefresh,
  onConfigure,
  onRemove,
  loading,
  error
}) => {
  const summary = widget.data?.summary;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="text-green-500" size={20} />;
      case 'down':
        return <TrendingDown className="text-red-500" size={20} />;
      default:
        return <Minus className="text-gray-500" size={20} />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatValue = (value: number, metricType: string) => {
    switch (metricType) {
      case 'time_in_flow':
        return `${Math.round(value)}h`;
      case 'productivity_score':
        return `${Math.round(value)}%`;
      case 'commit_frequency':
        return `${value}/day`;
      case 'bug_rate':
        return `${value.toFixed(2)}%`;
      default:
        return value.toString();
    }
  };

  return (
    <Widget
      widget={widget}
      onRefresh={onRefresh}
      onConfigure={onConfigure}
      onRemove={onRemove}
      loading={loading}
      error={error}
    >
      {summary && (
        <div className="h-full flex flex-col justify-center">
          {/* Main Metric Value */}
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {formatValue(summary.current, widget.config.metrics[0] || '')}
            </div>
            <div className="text-sm text-gray-600">
              Current {widget.config.metrics[0]?.replace('_', ' ')}
            </div>
          </div>

          {/* Trend Information */}
          <div className="flex items-center justify-center space-x-2">
            {getTrendIcon(summary.trend)}
            <span className={`text-sm font-medium ${getTrendColor(summary.trend)}`}>
              {summary.changePercent > 0 ? '+' : ''}{summary.changePercent.toFixed(1)}%
            </span>
            <span className="text-sm text-gray-500">
              vs previous period
            </span>
          </div>

          {/* Additional Context */}
          <div className="mt-4 text-center">
            <div className="text-xs text-gray-500">
              Previous: {formatValue(summary.previous, widget.config.metrics[0] || '')}
            </div>
          </div>
        </div>
      )}
    </Widget>
  );
};

export default MetricCard;