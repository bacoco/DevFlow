import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';
import { 
  ExportFormat, 
  ExportOptions, 
  ExportMetadata,
  CSVExportOptions,
  PDFExportOptions,
  PNGExportOptions,
  JSONExportOptions 
} from '../../types/export';
import { exportService } from '../../services/exportService';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataType: 'dashboard' | 'tasks' | 'analytics' | 'chart' | 'widget';
  dataId?: string;
  defaultName?: string;
  onExportStart?: (jobId: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  dataType,
  dataId,
  defaultName,
  onExportStart,
}) => {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [exportName, setExportName] = useState(defaultName || '');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [asyncExport, setAsyncExport] = useState(true);
  const [notify, setNotify] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Format-specific options
  const [csvOptions, setCsvOptions] = useState<CSVExportOptions>({
    delimiter: ',',
    includeHeaders: true,
    encoding: 'utf-8',
  });

  const [pdfOptions, setPdfOptions] = useState<PDFExportOptions>({
    orientation: 'portrait',
    pageSize: 'A4',
    includeCharts: true,
    includeMetadata: true,
  });

  const [pngOptions, setPngOptions] = useState<PNGExportOptions>({
    width: 1200,
    height: 800,
    quality: 0.9,
    backgroundColor: '#ffffff',
  });

  const [jsonOptions, setJsonOptions] = useState<JSONExportOptions>({
    pretty: true,
    includeSchema: true,
  });

  const formatOptions = [
    { value: 'csv', label: 'CSV', icon: '📊', description: 'Comma-separated values for spreadsheets' },
    { value: 'json', label: 'JSON', icon: '📄', description: 'JavaScript Object Notation for APIs' },
    { value: 'pdf', label: 'PDF', icon: '📋', description: 'Portable Document Format for reports' },
    { value: 'png', label: 'PNG', icon: '🖼️', description: 'Image format for charts and visualizations' },
  ] as const;

  const handleExport = async () => {
    if (!exportName.trim()) {
      return;
    }

    setIsExporting(true);

    try {
      const metadata: ExportMetadata = {
        dataType,
        dataId,
        includeMetadata,
      };

      const options: ExportOptions = {
        format,
        name: exportName,
        metadata,
        async: asyncExport,
        notify,
      };

      const jobId = await exportService.startExport(options);
      
      if (onExportStart) {
        onExportStart(jobId);
      }

      if (!asyncExport) {
        // For synchronous exports, trigger download immediately
        const job = exportService.getJobStatus(jobId);
        if (job?.downloadUrl) {
          const link = document.createElement('a');
          link.href = job.downloadUrl;
          link.download = `${exportName}.${format}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }

      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const renderFormatOptions = () => (
    <div className="grid grid-cols-2 gap-3">
      {formatOptions.map((option) => (
        <motion.div
          key={option.value}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Card
            variant={format === option.value ? 'elevated' : 'outlined'}
            padding="md"
            interactive
            className={`cursor-pointer transition-all ${
              format === option.value
                ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            onClick={() => setFormat(option.value)}
          >
            <div className="flex items-start space-x-3">
              <span className="text-2xl">{option.icon}</span>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                  {option.label}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {option.description}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );

  const renderFormatSpecificOptions = () => {
    switch (format) {
      case 'csv':
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">CSV Options</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Delimiter
                </label>
                <select
                  value={csvOptions.delimiter}
                  onChange={(e) => setCsvOptions({ ...csvOptions, delimiter: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value=",">Comma (,)</option>
                  <option value=";">Semicolon (;)</option>
                  <option value="\t">Tab</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Encoding
                </label>
                <select
                  value={csvOptions.encoding}
                  onChange={(e) => setCsvOptions({ ...csvOptions, encoding: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="utf-8">UTF-8</option>
                  <option value="utf-16">UTF-16</option>
                </select>
              </div>
            </div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={csvOptions.includeHeaders}
                onChange={(e) => setCsvOptions({ ...csvOptions, includeHeaders: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Include headers</span>
            </label>
          </div>
        );

      case 'pdf':
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">PDF Options</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Orientation
                </label>
                <select
                  value={pdfOptions.orientation}
                  onChange={(e) => setPdfOptions({ ...pdfOptions, orientation: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Page Size
                </label>
                <select
                  value={pdfOptions.pageSize}
                  onChange={(e) => setPdfOptions({ ...pdfOptions, pageSize: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="A4">A4</option>
                  <option value="A3">A3</option>
                  <option value="letter">Letter</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={pdfOptions.includeCharts}
                  onChange={(e) => setPdfOptions({ ...pdfOptions, includeCharts: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Include charts</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={pdfOptions.includeMetadata}
                  onChange={(e) => setPdfOptions({ ...pdfOptions, includeMetadata: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Include metadata</span>
              </label>
            </div>
          </div>
        );

      case 'png':
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">PNG Options</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                label="Width (px)"
                value={pngOptions.width?.toString() || ''}
                onChange={(e) => setPngOptions({ ...pngOptions, width: parseInt(e.target.value) || 1200 })}
              />
              <Input
                type="number"
                label="Height (px)"
                value={pngOptions.height?.toString() || ''}
                onChange={(e) => setPngOptions({ ...pngOptions, height: parseInt(e.target.value) || 800 })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quality
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={pngOptions.quality}
                  onChange={(e) => setPngOptions({ ...pngOptions, quality: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {Math.round((pngOptions.quality || 0.9) * 100)}%
                </span>
              </div>
              <Input
                type="text"
                label="Background Color"
                value={pngOptions.backgroundColor || ''}
                onChange={(e) => setPngOptions({ ...pngOptions, backgroundColor: e.target.value })}
                placeholder="#ffffff"
              />
            </div>
          </div>
        );

      case 'json':
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">JSON Options</h4>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={jsonOptions.pretty}
                  onChange={(e) => setJsonOptions({ ...jsonOptions, pretty: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Pretty print (formatted)</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={jsonOptions.includeSchema}
                  onChange={(e) => setJsonOptions({ ...jsonOptions, includeSchema: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Include data schema</span>
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Export Data
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Export Name */}
          <Input
            label="Export Name"
            value={exportName}
            onChange={(e) => setExportName(e.target.value)}
            placeholder="Enter export name"
            required
          />

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Export Format
            </label>
            {renderFormatOptions()}
          </div>

          {/* Format-specific Options */}
          <AnimatePresence mode="wait">
            <motion.div
              key={format}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderFormatSpecificOptions()}
            </motion.div>
          </AnimatePresence>

          {/* General Options */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">General Options</h4>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Include metadata</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={asyncExport}
                  onChange={(e) => setAsyncExport(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Process in background (recommended for large datasets)
                </span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={notify}
                  onChange={(e) => setNotify(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Notify when export is complete
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleExport}
            loading={isExporting}
            disabled={!exportName.trim() || isExporting}
          >
            {asyncExport ? 'Start Export' : 'Export & Download'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};