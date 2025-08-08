import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './Card';
import { Button } from './Button';
import { ExportJob, ExportProgress as ExportProgressType } from '../../types/export';
import { exportService } from '../../services/exportService';

interface ExportProgressProps {
  jobId: string;
  onComplete?: (job: ExportJob) => void;
  onCancel?: (jobId: string) => void;
  compact?: boolean;
}

export const ExportProgress: React.FC<ExportProgressProps> = ({
  jobId,
  onComplete,
  onCancel,
  compact = false,
}) => {
  const [job, setJob] = useState<ExportJob | null>(null);
  const [progress, setProgress] = useState<ExportProgressType | null>(null);

  useEffect(() => {
    // Get initial job status
    const initialJob = exportService.getJobStatus(jobId);
    if (initialJob) {
      setJob(initialJob);
    }

    // Subscribe to progress updates
    const handleProgress = (progressUpdate: ExportProgressType) => {
      setProgress(progressUpdate);
      
      // Update job status
      const updatedJob = exportService.getJobStatus(jobId);
      if (updatedJob) {
        setJob(updatedJob);
        
        if (updatedJob.status === 'completed' && onComplete) {
          onComplete(updatedJob);
        }
      }
    };

    exportService.onProgress(jobId, handleProgress);

    return () => {
      exportService.offProgress(jobId);
    };
  }, [jobId, onComplete]);

  const handleCancel = async () => {
    const success = await exportService.cancelExport(jobId);
    if (success && onCancel) {
      onCancel(jobId);
    }
  };

  const handleDownload = () => {
    if (job?.downloadUrl) {
      const link = document.createElement('a');
      link.href = job.downloadUrl;
      link.download = `${job.name}.${job.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      case 'cancelled':
        return 'text-gray-600 dark:text-gray-400';
      case 'processing':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'cancelled':
        return (
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636" />
          </svg>
        );
      case 'processing':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </motion.div>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const formatTimeRemaining = (seconds?: number) => {
    if (!seconds) return '';
    
    if (seconds < 60) {
      return `${Math.round(seconds)}s remaining`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)}m remaining`;
    } else {
      return `${Math.round(seconds / 3600)}h remaining`;
    }
  };

  if (!job) {
    return null;
  }

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
      >
        <div className="flex-shrink-0">
          {getStatusIcon(job.status)}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {job.name}
          </p>
          <div className="flex items-center space-x-2">
            <span className={`text-xs capitalize ${getStatusColor(job.status)}`}>
              {job.status}
            </span>
            {job.status === 'processing' && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {job.progress}%
              </span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 flex space-x-2">
          {job.status === 'completed' && (
            <Button size="sm" variant="ghost" onClick={handleDownload}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </Button>
          )}
          
          {job.status === 'processing' && (
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <Card variant="default" padding="lg">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {getStatusIcon(job.status)}
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {job.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {job.format.toUpperCase()} export • Created {job.createdAt.toLocaleString()}
              </p>
            </div>
          </div>
          
          <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(job.status)} bg-current bg-opacity-10`}>
            {job.status}
          </span>
        </div>

        {/* Progress Bar */}
        {job.status === 'processing' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {progress?.message || 'Processing...'}
              </span>
              <span className="text-gray-900 dark:text-gray-100">
                {job.progress}%
              </span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-blue-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${job.progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            
            {progress?.estimatedTimeRemaining && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatTimeRemaining(progress.estimatedTimeRemaining)}
              </p>
            )}
          </div>
        )}

        {/* Error Message */}
        {job.status === 'failed' && job.error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-800 dark:text-red-200">
              {job.error}
            </p>
          </div>
        )}

        {/* Completion Info */}
        {job.status === 'completed' && job.completedAt && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <p className="text-sm text-green-800 dark:text-green-200">
              Export completed successfully at {job.completedAt.toLocaleString()}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          {job.status === 'processing' && (
            <Button variant="secondary" onClick={handleCancel}>
              Cancel Export
            </Button>
          )}
          
          {job.status === 'completed' && job.downloadUrl && (
            <Button variant="primary" onClick={handleDownload}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download
            </Button>
          )}
          
          {job.status === 'failed' && (
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Retry
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};