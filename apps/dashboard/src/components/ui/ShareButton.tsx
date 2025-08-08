import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from './Button';
import { ShareModal } from './ShareModal';

interface ShareButtonProps {
  dashboardId: string;
  dashboardName: string;
  currentUserId: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showText?: boolean;
  className?: string;
  disabled?: boolean;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  dashboardId,
  dashboardName,
  currentUserId,
  variant = 'secondary',
  size = 'md',
  showIcon = true,
  showText = true,
  className,
  disabled = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
            />
          </motion.svg>
        )}
        {showText && 'Share'}
      </Button>

      <ShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        dashboardId={dashboardId}
        dashboardName={dashboardName}
        currentUserId={currentUserId}
      />
    </>
  );
};