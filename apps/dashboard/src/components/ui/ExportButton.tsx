import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from './Button';
import { ExportModal } from './ExportModal';
import { ExportFormat } from '../../types/export';

interface ExportButtonProps {
  dataType: 'dashboard' | 'tasks' | 'analytics' | 'chart' | 'widget';
  dataId?: string;
  defaultName?: string;
  defaultFormat?: ExportFormat;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showText?: boolean;
  onExportStart?: (jobId: string) => void;
  className?: string;
  disabled?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  dataType,
  dataId,
  defaultName,
  defaultFormat,
  variant = 'secondary',
  size = 'md',
  showIcon = true,
  showText = true,
  onExportStart,
  className,
  disabled = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleExportStart = (jobId: string) => {
    setIsModalOpen(false);
    if (onExportStart) {
      onExportStart(jobId);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsModalOpen(true)}
        disabled={disabled}
        className={className}
      >
        {showIcon && (
          <motion.svg
            className={`w-4 h-4 ${showText ? 'mr-2' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.2 }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </motion.svg>
        )}
        {showText && 'Export'}
      </Button>

      <ExportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        dataType={dataType}
        dataId={dataId}
        defaultName={defaultName}
        onExportStart={handleExportStart}
      />
    </>
  );
};