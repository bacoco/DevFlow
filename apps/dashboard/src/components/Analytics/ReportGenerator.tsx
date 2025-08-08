/**
 * Report Generator Component
 * Allows users to generate and export analytics reports
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { 
  TaskMetrics, 
  TaskTrends, 
  TaskInsight, 
  TeamPerformanceMetrics,
  AnalyticsFilters,
  ReportType,
  ExportFormat,
} from '../../types/analytics';
import { taskAnalyticsService } from '../../services/taskAnalyticsService';
import {
  DocumentArrowDownIcon,
  DocumentTextIcon,
  TableCellsIcon,
  PhotoIcon,
  DocumentIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface ReportGeneratorProps {
  filters: AnalyticsFilters;
  metrics?: TaskMetrics;
  trends?: TaskTrends;
  insights?: TaskInsight[];
  teamPerformance?: TeamPerformanceMetrics;
  onExport: (type: ReportType, format: string) => void;
  compact?: boolean;
  className?: string;
}

interface ReportConfig {
  title: string;
  description: string;
  type: ReportType;
  includeCharts: boolean;
  includeInsights: boolean;
  formats: ExportFormat[];
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  filters,
  metrics,
  trends,
  insights,
  teamPerformance,
  onExport,
  compact = false,
  className = '',
}) => {
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    title: 'Task Analytics Report',
    description: 'Comprehensive task performance analysis',
    type: 'individual',
    includeCharts: true,
    includeInsights: true,
    formats: ['pdf'],
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReports, setGeneratedReports] = useState<Array<{
    id: string;
    title: string;
    format: ExportFormat;
    generatedAt: string;
    size: string;
  }>>([]);

  const reportTypes: Array<{ value: ReportType; label: string; description: string }> = [
    {
      value: 'individual',
      label: 'Individual Report',
      description: 'Personal productivity metrics and insights',
    },
    {
      value: 'team',
      label: 'Team Report',
      description: 'Team performance and collaboration metrics',
    },
    {
      value: 'comparative',
      label: 'Comparative Report',
      description: 'Compare performance across time periods',
    },
    {
      value: 'trend',
      label: 'Trend Analysis',
      description: 'Historical trends and pattern analysis',
    },
    {
      value: 'burndown',
      label: 'Burndown Report',
      description: 'Project progress and burndown analysis',
    },
    {
      value: 'velocity',
      label: 'Velocity Report',
      description: 'Task completion velocity analysis',
    },
  ];

  const exportFormats: Array<{ value: ExportFormat; label: string; icon: React.ComponentType<any> }> = [
    { value: 'pdf', label: 'PDF Document', icon: DocumentTextIcon },
    { value: 'csv', label: 'CSV Data', icon: TableCellsIcon },
    { value: 'json', label: 'JSON Data', icon: DocumentIcon },
    { value: 'xlsx', label: 'Excel Spreadsheet', icon: TableCellsIcon },
    { value: 'png', label: 'PNG Image', icon: PhotoIcon },
  ];

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    
    try {
      // Generate report using the service
      const report = await taskAnalyticsService.generateProductivityReport(
        reportConfig.type,
        filters,
        {
          title: reportConfig.title,
          description: reportConfig.description,
          includeCharts: reportConfig.includeCharts,
          includeInsights: reportConfig.includeInsights,
        }
      );

      // Export in selected formats
      for (const format of reportConfig.formats) {
        const blob = await taskAnalyticsService.exportReport(report, format);
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${report.title.replace(/\s+/g, '_')}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Add to generated reports list
        setGeneratedReports(prev => [...prev, {
          id: `${report.id}-${format}`,
          title: report.title,
          format,
          generatedAt: new Date().toISOString(),
          size: `${(blob.size / 1024).toFixed(1)} KB`,
        }]);
      }

      // Call the onExport callback
      onExport(reportConfig.type, reportConfig.formats.join(','));
      
    } catch (error) {
      console.error('Error generating report:', error);
      // In a real app, show error notification
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFormatToggle = (format: ExportFormat) => {
    setReportConfig(prev => ({
      ...prev,
      formats: prev.formats.includes(format)
        ? prev.formats.filter(f => f !== format)
        : [...prev.formats, format],
    }));
  };

  if (compact) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="grid grid-cols-2 gap-4">
          {exportFormats.slice(0, 4).map((format) => {
            const Icon = format.icon;
            return (
              <Button
                key={format.value}
                variant="outline"
                size="sm"
                onClick={() => onExport('individual', format.value)}
                icon={<Icon className="h-4 w-4" />}
                className="justify-start"
              >
                {format.label}
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <DocumentArrowDownIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Generate Report
        </h3>
      </div>

      <div className="space-y-6">
        {/* Report Configuration */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Report Title
            </label>
            <Input
              value={reportConfig.title}
              onChange={(e) => setReportConfig(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter report title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={reportConfig.description}
              onChange={(e) => setReportConfig(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter report description"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Report Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {reportTypes.map((type) => (
                <div
                  key={type.value}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    reportConfig.type === type.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => setReportConfig(prev => ({ ...prev, type: type.value }))}
                >
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    {type.label}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {type.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Export Formats
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {exportFormats.map((format) => {
                const Icon = format.icon;
                const isSelected = reportConfig.formats.includes(format.value);
                
                return (
                  <div
                    key={format.value}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    onClick={() => handleFormatToggle(format.value)}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${
                        isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'
                      }`} />
                      <span className={`text-sm font-medium ${
                        isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'
                      }`}>
                        {format.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={reportConfig.includeCharts}
                onChange={(e) => setReportConfig(prev => ({ 
                  ...prev, 
                  includeCharts: e.target.checked 
                }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Include Charts
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={reportConfig.includeInsights}
                onChange={(e) => setReportConfig(prev => ({ 
                  ...prev, 
                  includeInsights: e.target.checked 
                }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Include Insights
              </span>
            </label>
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleGenerateReport}
            loading={isGenerating}
            disabled={reportConfig.formats.length === 0}
            icon={<DocumentArrowDownIcon className="h-4 w-4" />}
          >
            Generate Report
          </Button>
        </div>

        {/* Generated Reports History */}
        {generatedReports.length > 0 && (
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
              Recent Reports
            </h4>
            <div className="space-y-2">
              {generatedReports.slice(-5).map((report) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {report.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {report.format.toUpperCase()} • {report.size} • {new Date(report.generatedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <ClockIcon className="h-4 w-4 text-gray-400" />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};