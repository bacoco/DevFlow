/**
 * Toast Notification Component
 * Displays temporary notifications with different types and actions
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  AlertTriangle,
  Clock
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { NotificationProps, Notification } from '../../types/design-system';
import { useNotifications } from '../../stores/uiStore';

const notificationIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const notificationStyles = {
  success: {
    container: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
    title: 'text-green-900 dark:text-green-100',
    message: 'text-green-700 dark:text-green-300',
    progress: 'bg-green-500',
  },
  error: {
    container: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
    title: 'text-red-900 dark:text-red-100',
    message: 'text-red-700 dark:text-red-300',
    progress: 'bg-red-500',
  },
  warning: {
    container: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    icon: 'text-yellow-600 dark:text-yellow-400',
    title: 'text-yellow-900 dark:text-yellow-100',
    message: 'text-yellow-700 dark:text-yellow-300',
    progress: 'bg-yellow-500',
  },
  info: {
    container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-900 dark:text-blue-100',
    message: 'text-blue-700 dark:text-blue-300',
    progress: 'bg-blue-500',
  },
};

export interface ToastProps extends Omit<NotificationProps, 'onDismiss'> {
  onDismiss?: (id: string) => void;
  showProgress?: boolean;
  pauseOnHover?: boolean;
}

export const Toast: React.FC<ToastProps> = ({
  notification,
  onDismiss,
  showProgress = true,
  pauseOnHover = true,
  className,
}) => {
  const { removeNotification } = useNotifications();
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const Icon = notification.icon ? 
    () => notification.icon as React.ReactElement : 
    notificationIcons[notification.type];
  
  const styles = notificationStyles[notification.type];
  const duration = notification.duration || 5000;

  // Handle auto-dismiss with progress bar
  useEffect(() => {
    if (notification.persistent) return;

    const interval = setInterval(() => {
      if (!isPaused && !isHovered) {
        setProgress((prev) => {
          const newProgress = prev - (100 / (duration / 100));
          if (newProgress <= 0) {
            handleDismiss();
            return 0;
          }
          return newProgress;
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [duration, isPaused, isHovered, notification.persistent]);

  const handleDismiss = () => {
    onDismiss?.(notification.id);
    removeNotification(notification.id);
  };

  const handleMouseEnter = () => {
    if (pauseOnHover) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (pauseOnHover) {
      setIsHovered(false);
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      className={cn(
        'relative w-80 rounded-lg border shadow-lg backdrop-blur-sm',
        'overflow-hidden',
        styles.container,
        className
      )}
      initial={{ opacity: 0, x: 300, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.9 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      whileHover={{ scale: 1.02 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      layout
    >
      {/* Progress bar */}
      {showProgress && !notification.persistent && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
          <motion.div
            className={cn('h-full', styles.progress)}
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className={cn('flex-shrink-0 mt-0.5', styles.icon)}>
            <Icon size={20} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className={cn('font-semibold text-sm', styles.title)}>
                  {notification.title}
                </h4>
                
                {notification.message && (
                  <p className={cn('text-sm mt-1', styles.message)}>
                    {notification.message}
                  </p>
                )}

                {/* Timestamp */}
                <div className="flex items-center space-x-1 mt-2">
                  <Clock size={12} className="text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(notification.timestamp)}
                  </span>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={handleDismiss}
                className={cn(
                  'flex-shrink-0 ml-2 p-1 rounded-md transition-colors',
                  'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                )}
              >
                <X size={16} />
              </button>
            </div>

            {/* Actions */}
            {notification.actions && notification.actions.length > 0 && (
              <div className="flex items-center space-x-2 mt-3">
                {notification.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      action.action();
                      if (!notification.persistent) {
                        handleDismiss();
                      }
                    }}
                    className={cn(
                      'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-offset-2',
                      action.variant === 'primary' && [
                        'bg-blue-600 text-white hover:bg-blue-700',
                        'focus:ring-blue-500'
                      ],
                      action.variant === 'secondary' && [
                        'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
                        'hover:bg-gray-300 dark:hover:bg-gray-600',
                        'focus:ring-gray-500'
                      ],
                      (!action.variant || action.variant === 'ghost') && [
                        'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                        'focus:ring-gray-500'
                      ]
                    )}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Toast container component for managing multiple toasts
export interface ToastContainerProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  maxToasts?: number;
  className?: string;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  position = 'top-right',
  maxToasts = 5,
  className,
}) => {
  const { notifications } = useNotifications();

  const visibleNotifications = notifications
    .filter(n => !n.persistent)
    .slice(0, maxToasts);

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
  };

  if (visibleNotifications.length === 0) return null;

  return (
    <div className={cn(
      'fixed z-50 space-y-2',
      positionClasses[position],
      className
    )}>
      <AnimatePresence>
        {visibleNotifications.map((notification) => (
          <Toast
            key={notification.id}
            notification={notification}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Toast;