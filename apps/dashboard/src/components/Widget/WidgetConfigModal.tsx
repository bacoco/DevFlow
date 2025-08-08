import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, AlertCircle, Eye, Settings, Palette } from 'lucide-react';
import { Widget, WidgetConfig, MetricType, TimePeriod, WidgetType } from '../../types/dashboard';
import { MetricCard } from './MetricCard';
import { ChartWidget } from './ChartWidget';
import { ActivityFeedWidget } from './ActivityFeedWidget';

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
  const [showPreview, setShowPreview] = useState(true);
  const [activeTab, setActiveTab] = useState<'general' | 'data' | 'appearance'>('general');

  // Generate preview widget with current configuration
  const previewWidget = useMemo((): Widget => {
    // Generate mock data based on widget type and configuration
    const generateMockData = () => {
      const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const datasets = config.metrics.map((metric, index) => ({
        label: metric.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        data: Array.from({ length: 7 }, () => Math.floor(Math.random() * 100) + 20),
        backgroundColor: `hsl(${index * 60}, 70%, 50%)`,
        borderColor: `hsl(${index * 60}, 70%, 40%)`,
        borderWidth: 2,
      }));

      return {
        metrics: [],
        chartData: { labels, datasets },
        summary: {
          current: 85,
          previous: 78,
          change: 7,
          changePercent: 8.97,
          trend: 'up' as const,
        },
        lastUpdated: new Date(),
      };
    };

    return {
      id: 'preview',
      type: widgetType,
      title: title || 'Preview Widget',
      config: {
        ...config,
        title,
      },
      data: generateMockData(),
      permissions: [],
      position: { x: 0, y: 0, w: 4, h: 6 },
    };
  }, [config, title, widgetType]);

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'data', label: 'Data', icon: Eye },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ] as const;

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
        <div className="inline-block w-full max-w-6xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-medium text-gray-900">
                Configure Widget
              </h3>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`flex items-center space-x-2 px-3 py-1 rounded-md text-sm transition-colors ${
                  showPreview 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Eye size={16} />
                <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content Layout */}
          <div className={`grid gap-6 ${showPreview ? 'grid-cols-2' : 'grid-cols-1'}`}>

            {/* Configuration Panel */}
            <div className="space-y-6">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon size={16} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* General Tab */}
                {activeTab === 'general' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
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
                  </motion.div>
                )}

                {/* Data Tab */}
                {activeTab === 'data' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
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
                  </motion.div>
                )}

                {/* Appearance Tab */}
                {activeTab === 'appearance' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
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

                    {/* Color Scheme */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Color Scheme
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {['blue', 'green', 'purple', 'orange'].map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`h-8 rounded-md border-2 transition-all ${
                              config.chartOptions.colorScheme === color
                                ? 'border-gray-900 scale-110'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                            style={{ backgroundColor: `var(--color-${color}-500)` }}
                            onClick={() => setConfig({
                              ...config,
                              chartOptions: {
                                ...config.chartOptions,
                                colorScheme: color,
                              },
                            })}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

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

            {/* Preview Panel */}
            <AnimatePresence>
              {showPreview && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-gray-50 rounded-lg p-6"
                >
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Live Preview</h4>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-80">
                    {(() => {
                      const commonProps = {
                        widget: previewWidget,
                        loading: false,
                        error: undefined,
                      };

                      switch (widgetType) {
                        case 'metric_card':
                          return <MetricCard {...commonProps} />;
                        case 'line_chart':
                        case 'bar_chart':
                        case 'pie_chart':
                          return <ChartWidget {...commonProps} />;
                        case 'activity_feed':
                          return <ActivityFeedWidget {...commonProps} />;
                        default:
                          return (
                            <div className="flex items-center justify-center h-full text-gray-500">
                              <div className="text-center">
                                <div className="text-2xl mb-2">🔧</div>
                                <p className="text-sm">Preview not available for this widget type</p>
                              </div>
                            </div>
                          );
                      }
                    })()}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    This preview shows how your widget will look with sample data
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WidgetConfigModal;