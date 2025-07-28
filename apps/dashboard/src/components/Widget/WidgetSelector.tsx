import React, { useState } from 'react';
import { X, Plus, BarChart3, LineChart, PieChart, Activity, Users, Code, Zap } from 'lucide-react';
import { WidgetType, Widget, MetricType, TimePeriod } from '../../types/dashboard';

interface WidgetSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (widget: Omit<Widget, 'id' | 'data'>) => void;
}

interface WidgetTemplate {
  type: WidgetType;
  title: string;
  description: string;
  icon: React.ReactNode;
  defaultConfig: {
    timeRange: TimePeriod;
    metrics: MetricType[];
    filters: Record<string, any>;
    chartOptions: {
      responsive: boolean;
      maintainAspectRatio: boolean;
    };
  };
  defaultPosition: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

const WIDGET_TEMPLATES: WidgetTemplate[] = [
  {
    type: 'metric_card',
    title: 'Productivity Score',
    description: 'Display key productivity metrics in a card format',
    icon: <Zap className="w-6 h-6" />,
    defaultConfig: {
      timeRange: 'day',
      metrics: ['productivity_score'],
      filters: {},
      chartOptions: {
        responsive: true,
        maintainAspectRatio: true,
      },
    },
    defaultPosition: { x: 0, y: 0, w: 3, h: 3 },
  },
  {
    type: 'line_chart',
    title: 'Time in Flow',
    description: 'Track focus time and flow state over time',
    icon: <LineChart className="w-6 h-6" />,
    defaultConfig: {
      timeRange: 'week',
      metrics: ['time_in_flow'],
      filters: {},
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
      },
    },
    defaultPosition: { x: 3, y: 0, w: 6, h: 4 },
  },
  {
    type: 'bar_chart',
    title: 'Code Quality Metrics',
    description: 'Visualize code churn, review lag, and bug rates',
    icon: <BarChart3 className="w-6 h-6" />,
    defaultConfig: {
      timeRange: 'week',
      metrics: ['code_churn', 'review_lag', 'bug_rate'],
      filters: {},
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
      },
    },
    defaultPosition: { x: 0, y: 4, w: 6, h: 4 },
  },
  {
    type: 'pie_chart',
    title: 'Commit Distribution',
    description: 'Show commit frequency distribution across team members',
    icon: <PieChart className="w-6 h-6" />,
    defaultConfig: {
      timeRange: 'month',
      metrics: ['commit_frequency'],
      filters: {},
      chartOptions: {
        responsive: true,
        maintainAspectRatio: true,
      },
    },
    defaultPosition: { x: 6, y: 4, w: 3, h: 4 },
  },
  {
    type: 'activity_feed',
    title: 'Recent Activity',
    description: 'Live feed of team development activities',
    icon: <Activity className="w-6 h-6" />,
    defaultConfig: {
      timeRange: 'day',
      metrics: [],
      filters: {},
      chartOptions: {
        responsive: true,
        maintainAspectRatio: true,
      },
    },
    defaultPosition: { x: 9, y: 0, w: 3, h: 6 },
  },
  {
    type: 'team_overview',
    title: 'Team Overview',
    description: 'Summary of team productivity and performance',
    icon: <Users className="w-6 h-6" />,
    defaultConfig: {
      timeRange: 'week',
      metrics: ['productivity_score', 'time_in_flow'],
      filters: {},
      chartOptions: {
        responsive: true,
        maintainAspectRatio: true,
      },
    },
    defaultPosition: { x: 0, y: 8, w: 6, h: 3 },
  },
  {
    type: 'code_quality',
    title: 'Code Quality Dashboard',
    description: 'Comprehensive view of code quality metrics',
    icon: <Code className="w-6 h-6" />,
    defaultConfig: {
      timeRange: 'month',
      metrics: ['code_churn', 'bug_rate'],
      filters: {},
      chartOptions: {
        responsive: true,
        maintainAspectRatio: true,
      },
    },
    defaultPosition: { x: 6, y: 8, w: 6, h: 3 },
  },
  {
    type: 'flow_state',
    title: 'Flow State Analysis',
    description: 'Deep dive into developer flow patterns',
    icon: <Zap className="w-6 h-6" />,
    defaultConfig: {
      timeRange: 'week',
      metrics: ['time_in_flow'],
      filters: {},
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
      },
    },
    defaultPosition: { x: 0, y: 11, w: 12, h: 4 },
  },
];

export const WidgetSelector: React.FC<WidgetSelectorProps> = ({
  isOpen,
  onClose,
  onAddWidget,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<WidgetTemplate | null>(null);

  const handleAddWidget = (template: WidgetTemplate) => {
    const widget: Omit<Widget, 'id' | 'data'> = {
      type: template.type,
      title: template.title,
      config: template.defaultConfig,
      permissions: [],
      position: template.defaultPosition,
    };

    onAddWidget(widget);
    onClose();
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
        <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Add Widget to Dashboard
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
          </div>

          {/* Widget Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {WIDGET_TEMPLATES.map((template) => (
              <div
                key={template.type}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  selectedTemplate?.type === template.type
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`p-2 rounded-lg ${
                    selectedTemplate?.type === template.type
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {template.icon}
                  </div>
                  <h4 className="font-medium text-gray-900">{template.title}</h4>
                </div>
                <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                
                {/* Widget Preview */}
                <div className="bg-gray-50 rounded p-2 mb-3">
                  <div className="text-xs text-gray-500 mb-1">Preview:</div>
                  <div className="bg-white rounded border h-16 flex items-center justify-center">
                    <div className="text-xs text-gray-400">
                      {template.type.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                {template.defaultConfig.metrics.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-1">Metrics:</div>
                    <div className="flex flex-wrap gap-1">
                      {template.defaultConfig.metrics.map((metric) => (
                        <span
                          key={metric}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                        >
                          {metric.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddWidget(template);
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <Plus size={16} />
                  <span>Add Widget</span>
                </button>
              </div>
            ))}
          </div>

          {/* Selected Template Details */}
          {selectedTemplate && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">
                {selectedTemplate.title} Configuration
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Time Range:</span>
                  <span className="ml-2 text-blue-600">
                    {selectedTemplate.defaultConfig.timeRange}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Size:</span>
                  <span className="ml-2 text-blue-600">
                    {selectedTemplate.defaultPosition.w} × {selectedTemplate.defaultPosition.h}
                  </span>
                </div>
              </div>
              <p className="text-sm text-blue-600 mt-2">
                You can customize these settings after adding the widget.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WidgetSelector;