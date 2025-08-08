import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { ExportProgress } from './ExportProgress';
import { ExportJob } from '../../types/export';
import { exportService } from '../../services/exportService';

interface ExportHistoryProps {
  onExportComplete?: (job: ExportJob) => void;
}

export const ExportHistory: React.FC<ExportHistoryProps> = ({
  onExportComplete,
}) => {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<ExportJob[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');

  useEffect(() => {
    // Load export history
    const loadHistory = () => {
      const history = exportService.getExportHistory();
      setJobs(history);
    };

    loadHistory();
    
    // Refresh every 5 seconds to catch updates
    const interval = setInterval(loadHistory, 5000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Apply filters
    let filtered = jobs;

    if (searchTerm) {
      filtered = filtered.filter(job =>
        job.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.format.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter);
    }

    if (formatFilter !== 'all') {
      filtered = filtered.filter(job => job.format === formatFilter);
    }

    setFilteredJobs(filtered);
  }, [jobs, searchTerm, statusFilter, formatFilter]);

  const handleDeleteJob = async (jobId: string) => {
    const success = await exportService.deleteExport(jobId);
    if (success) {
      setJobs(prev => prev.filter(job => job.id !== jobId));
    }
  };

  const handleDownload = (job: ExportJob) => {
    if (job.downloadUrl) {
      const link = document.createElement('a');
      link.href = job.downloadUrl;
      link.download = `${job.name}.${job.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
    
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400`;
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400`;
      case 'cancelled':
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400`;
      case 'processing':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400`;
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv':
        return '📊';
      case 'json':
        return '📄';
      case 'pdf':
        return '📋';
      case 'png':
        return '🖼️';
      default:
        return '📁';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const activeJobs = jobs.filter(job => job.status === 'processing');
  const completedJobs = filteredJobs.filter(job => job.status !== 'processing');

  return (
    <div className="space-y-6">
      {/* Active Exports */}
      {activeJobs.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Active Exports
          </h3>
          <div className="space-y-3">
            {activeJobs.map(job => (
              <ExportProgress
                key={job.id}
                jobId={job.id}
                compact
                onComplete={onExportComplete}
                onCancel={() => handleDeleteJob(job.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Export History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Export History
          </h3>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {completedJobs.length} exports
          </span>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Input
            type="search"
            placeholder="Search exports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All Formats</option>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="pdf">PDF</option>
            <option value="png">PNG</option>
          </select>
        </div>

        {/* Export List */}
        <div className="space-y-3">
          <AnimatePresence>
            {completedJobs.length === 0 ? (
              <Card variant="outlined" padding="lg">
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-600 dark:text-gray-400">
                    {jobs.length === 0 ? 'No exports yet' : 'No exports match your filters'}
                  </p>
                </div>
              </Card>
            ) : (
              completedJobs.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card variant="outlined" padding="md" hover>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0 text-2xl">
                          {getFormatIcon(job.format)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {job.name}
                          </h4>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {job.format.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {job.createdAt.toLocaleDateString()}
                            </span>
                            {job.completedAt && (
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                Completed in {Math.round((job.completedAt.getTime() - job.createdAt.getTime()) / 1000)}s
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className={getStatusBadge(job.status)}>
                          {job.status}
                        </span>
                        
                        <div className="flex space-x-2">
                          {job.status === 'completed' && job.downloadUrl && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDownload(job)}
                              title="Download"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteJob(job.id)}
                            title="Delete"
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Error message for failed exports */}
                    {job.status === 'failed' && job.error && (
                      <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-200">
                        {job.error}
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};