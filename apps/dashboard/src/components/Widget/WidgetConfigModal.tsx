import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Widget, WidgetConfig, MetricType, TimePeriod, WidgetType } from '../../types/dashboard';

interface WidgetConfigModalProps {
  widget: Widget;
  isOpen: boolean;
  onClose: () => void;
  onSave: (widgetId: string, config: WidgetConfig) => void;
}

interface FormErrors {
  title?: string;
  timeRange?: string;
  metrics?: string;
}

const METRIC_OPTIONS: { value: MetricType; label: string }[] = [
  { value: 'time_in_flow', label: 'Time in Flow' },
  { value: 'code_churn', label: 'Code Churn' },
  { value: 'review_lag', label: 'Review Lag' },
  { value: 'commit_frequency', label: 'Commit Frequency' },
  { value: 'bug_rate', label: 'Bug Rate' },
  { value: 'productivity_score', label: 'Productivity Score' },
];

const TIME_RANGE_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: 'hour', label: 'Last Hour' },
  { value: 'day', label: 'Last Day' },
  { value: 'week', label: 'Last Week' },
  { value: 'month', label: 'Last Month' },
  { value: 'quarter', label: 'Last Quarter' },
];

const WIDGET_TYPE_OPTIONS: { value: WidgetType; label: string }[] = [
  { value: 'line_chart', label: 'Line Chart' },
  { value: 'bar_chart', label: 'Bar Chart' },
  { value: 'pie_chart', label: 'Pie Chart' },
  { value: 'metric_card', label: 'Metric Card' },
  { value: 'activity_feed', label: 'Activity Feed' },
  { value: 'team_overview', label: 'Team Overview' },
  { value: 'code_quality', label: 'Code Quality' },
  { value: 'flow_state', label: 'Flow State' },
];

export const WidgetConfigModal: React.FC<WidgetConfigModalProps> = ({
  widget,
  isOpen,
  onClose,
  onSave,
}) => {
  const [config, setConfig] = useState<WidgetConfig>(widget.config);
  const [title, setTitle] = useState(widget.title);
  const [widgetType, setWidgetType] = useState<WidgetType>(widget.type);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(widget.config);
      setTitle(widget.title);
      setWidgetType(widget.type);
      setErrors({});
    }
  }, [isOpen, widget]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Widget title is required';
    }

    if (!config.timeRange) {
      newErrors.timeRange = 'Time range is required';
    }

    if (config.metrics.length === 0) {
      newErrors.metrics = 'At least one metric must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const updatedConfig = {
        ...config,
        title,
      };
      
      await onSave(widget.id, updatedConfig);
      onClose();
    } catch (error) {
      console.error('Failed to save widget configuration:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMetricToggle = (metric: MetricType) => {
    const updatedMetrics = config.metrics.includes(metric)
      ? config.metrics.filter(m => m !== metric)
      : [...config.metrics, metric];
    
    setConfig({
      ...config,
      metrics: updatedMetrics,
    });
  };

  const handleFilterChange = (key: string, value: any) => {
    setConfig({
      ...config,
      filters: {
        ...config.filters,
        [key]: value,
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Configure Widget
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Widget Title */}
            <div>
              <label htmlFor="widget-title" className="block text-sm font-medium text-gray-700 mb-2">
                Widget Title
              </label>
              <input
                id="widget-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter widget title"
              />
              {errors.title && (
                <div className="flex items-center mt-1 text-sm text-red-600">
                  <AlertCircle size={16} className="mr-1" />
                  {errors.title}
                </div>
              )}
            </div>

            {/* Widget Type */}
            <div>
              <label htmlFor="widget-type" className="block text-sm font-medium text-gray-700 mb-2">
                Widget Type
              </label>
              <select
                id="widget-type"
                value={widgetType}
                onChange={(e) => setWidgetType(e.target.value as WidgetType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {WIDGET_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Range */}
            <div>
              <label htmlFor="time-range" className="block text-sm font-medium text-gray-700 mb-2">
                Time Range
              </label>
              <select
                id="time-range"
                value={config.timeRange}
                onChange={(e) => setConfig({ ...config, timeRange: e.target.value as TimePeriod })}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.timeRange ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select time range</option>
                {TIME_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.timeRange && (
                <div className="flex items-center mt-1 text-sm text-red-600">
                  <AlertCircle size={16} className="mr-1" />
                  {errors.timeRange}
                </div>
              )}
            </div>

            {/* Metrics Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Metrics to Display
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
                {METRIC_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.metrics.includes(option.value)}
                      onChange={() => handleMetricToggle(option.value)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
              {errors.metrics && (
                <div className="flex items-center mt-1 text-sm text-red-600">
                  <AlertCircle size={16} className="mr-1" />
                  {errors.metrics}
                </div>
              )}
            </div>

            {/* Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filters
              </label>
              <div className="space-y-3">
                <div>
                  <label htmlFor="team-filter" className="block text-xs text-gray-600 mb-1">
                    Team
                  </label>
                  <input
                    id="team-filter"
                    type="text"
                    value={config.filters.teamId || ''}
                    onChange={(e) => handleFilterChange('teamId', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Filter by team (optional)"
                  />
                </div>
                <div>
                  <label htmlFor="project-filter" className="block text-xs text-gray-600 mb-1">
                    Project
                  </label>
                  <input
                    id="project-filter"
                    type="text"
                    value={config.filters.projectId || ''}
                    onChange={(e) => handleFilterChange('projectId', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Filter by project (optional)"
                  />
                </div>
              </div>
            </div>

            {/* Chart Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chart Options
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.chartOptions.responsive}
                    onChange={(e) => setConfig({
                      ...config,
                      chartOptions: {
                        ...config.chartOptions,
                        responsive: e.target.checked,
                      },
                    })}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Responsive</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.chartOptions.maintainAspectRatio}
                    onChange={(e) => setConfig({
                      ...config,
                      chartOptions: {
                        ...config.chartOptions,
                        maintainAspectRatio: e.target.checked,
                      },
                    })}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Maintain Aspect Ratio</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WidgetConfigModal;