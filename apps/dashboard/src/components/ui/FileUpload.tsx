/**
 * File Upload Component
 * A comprehensive file upload component with drag and drop, progress, and preview
 */

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  File,
  Image,
  FileText,
  Archive,
  Video,
  Music,
  X,
  Download,
  Eye,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { Button } from './Button';
import { TaskAttachment } from '../../types/design-system';

export interface FileUploadProps {
  onUpload?: (files: File[]) => Promise<TaskAttachment[]>;
  onRemove?: (attachmentId: string) => void;
  attachments?: TaskAttachment[];
  maxFiles?: number;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
  disabled?: boolean;
  className?: string;
  testId?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  error?: string;
  id: string;
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return Image;
  if (type.startsWith('video/')) return Video;
  if (type.startsWith('audio/')) return Music;
  if (type.includes('pdf') || type.includes('document') || type.includes('text')) return FileText;
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return Archive;
  return File;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileTypeColor = (type: string): string => {
  if (type.startsWith('image/')) return 'text-green-600 dark:text-green-400';
  if (type.startsWith('video/')) return 'text-purple-600 dark:text-purple-400';
  if (type.startsWith('audio/')) return 'text-blue-600 dark:text-blue-400';
  if (type.includes('pdf')) return 'text-red-600 dark:text-red-400';
  if (type.includes('document') || type.includes('text')) return 'text-blue-600 dark:text-blue-400';
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-gray-600 dark:text-gray-400';
};

export const FileUpload: React.FC<FileUploadProps> = ({
  onUpload,
  onRemove,
  attachments = [],
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = [],
  disabled = false,
  className = '',
  testId,
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    setDragActive(false);

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      console.warn('Some files were rejected:', rejectedFiles);
    }

    // Check if we exceed max files
    const totalFiles = attachments.length + uploadingFiles.length + acceptedFiles.length;
    if (totalFiles > maxFiles) {
      console.warn(`Cannot upload more than ${maxFiles} files`);
      return;
    }

    // Create uploading file entries
    const newUploadingFiles: UploadingFile[] = acceptedFiles.map(file => ({
      file,
      progress: 0,
      id: `${Date.now()}-${Math.random()}`,
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    // Simulate upload progress and call onUpload
    if (onUpload) {
      try {
        // Simulate progress updates
        for (const uploadingFile of newUploadingFiles) {
          for (let progress = 0; progress <= 100; progress += 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            setUploadingFiles(prev =>
              prev.map(f =>
                f.id === uploadingFile.id ? { ...f, progress } : f
              )
            );
          }
        }

        // Call the actual upload function
        const uploadedAttachments = await onUpload(acceptedFiles);

        // Remove from uploading files
        setUploadingFiles(prev =>
          prev.filter(f => !newUploadingFiles.some(nf => nf.id === f.id))
        );
      } catch (error) {
        console.error('Upload failed:', error);
        // Mark files as failed
        setUploadingFiles(prev =>
          prev.map(f =>
            newUploadingFiles.some(nf => nf.id === f.id)
              ? { ...f, error: 'Upload failed' }
              : f
          )
        );
      }
    }
  }, [attachments.length, uploadingFiles.length, maxFiles, onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    accept: acceptedTypes.length > 0 ? acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}) : undefined,
    maxSize,
    maxFiles: maxFiles - attachments.length - uploadingFiles.length,
    disabled,
  });

  const removeUploadingFile = (id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id));
  };

  const containerClasses = [
    'w-full',
    className,
  ].filter(Boolean).join(' ');

  const dropzoneClasses = [
    'border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200',
    'hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
    isDragActive || dragActive
      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
      : 'border-gray-300 dark:border-gray-600',
    disabled
      ? 'opacity-50 cursor-not-allowed'
      : 'cursor-pointer',
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses} data-testid={testId}>
      {/* Dropzone */}
      <motion.div
        {...getRootProps()}
        className={dropzoneClasses}
        whileHover={!disabled ? { scale: 1.01 } : undefined}
        whileTap={!disabled ? { scale: 0.99 } : undefined}
      >
        <input {...getInputProps()} />
        <motion.div
          className="flex flex-col items-center gap-3"
          animate={isDragActive || dragActive ? { scale: 1.05 } : { scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className={`p-3 rounded-full ${isDragActive || dragActive ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <Upload className={`w-6 h-6 ${isDragActive || dragActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {isDragActive || dragActive ? 'Drop files here' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {acceptedTypes.length > 0 ? `Accepted: ${acceptedTypes.join(', ')}` : 'Any file type'}
              {' • '}
              Max {formatFileSize(maxSize)} per file
              {' • '}
              Up to {maxFiles} files
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Uploading files */}
      <AnimatePresence>
        {uploadingFiles.map((uploadingFile) => (
          <motion.div
            key={uploadingFile.id}
            className="mt-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded ${getFileTypeColor(uploadingFile.file.type)} bg-current bg-opacity-10`}>
                {React.createElement(getFileIcon(uploadingFile.file.type), {
                  className: `w-4 h-4 ${getFileTypeColor(uploadingFile.file.type)}`,
                })}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {uploadingFile.file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(uploadingFile.file.size)}
                </p>
                
                {/* Progress bar */}
                {!uploadingFile.error && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <motion.div
                          className="bg-primary-600 h-1.5 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadingFile.progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {uploadingFile.progress}%
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Error message */}
                {uploadingFile.error && (
                  <div className="mt-2 flex items-center gap-1 text-error-600 dark:text-error-400">
                    <AlertCircle className="w-3 h-3" />
                    <span className="text-xs">{uploadingFile.error}</span>
                  </div>
                )}
              </div>

              {/* Loading or remove button */}
              <div className="flex items-center gap-2">
                {uploadingFile.progress < 100 && !uploadingFile.error && (
                  <Loader2 className="w-4 h-4 text-primary-600 dark:text-primary-400 animate-spin" />
                )}
                {uploadingFile.progress === 100 && !uploadingFile.error && (
                  <CheckCircle className="w-4 h-4 text-success-600 dark:text-success-400" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUploadingFile(uploadingFile.id)}
                  className="p-1 min-w-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Existing attachments */}
      <AnimatePresence>
        {attachments.map((attachment) => (
          <motion.div
            key={attachment.id}
            className="mt-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded ${getFileTypeColor(attachment.type)} bg-current bg-opacity-10`}>
                {React.createElement(getFileIcon(attachment.type), {
                  className: `w-4 h-4 ${getFileTypeColor(attachment.type)}`,
                })}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {attachment.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{formatFileSize(attachment.size)}</span>
                  <span>•</span>
                  <span>Uploaded by {attachment.uploadedBy.name}</span>
                  <span>•</span>
                  <span>{new Date(attachment.uploadedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                {attachment.type.startsWith('image/') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(attachment.url, '_blank')}
                    className="p-1 min-w-0"
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(attachment.url, '_blank')}
                  className="p-1 min-w-0"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </Button>
                {onRemove && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(attachment.id)}
                    className="p-1 min-w-0 text-error-600 hover:text-error-700 dark:text-error-400 dark:hover:text-error-300"
                    title="Remove"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* File count info */}
      {(attachments.length > 0 || uploadingFiles.length > 0) && (
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
          {attachments.length + uploadingFiles.length} of {maxFiles} files
        </div>
      )}
    </div>
  );
};

export default FileUpload;