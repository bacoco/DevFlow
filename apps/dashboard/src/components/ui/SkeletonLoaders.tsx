import React from 'react';
import { motion } from 'framer-motion';
import { useAccessibility } from '../../contexts/AccessibilityContext';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'rectangular' | 'circular';
  animation?: 'pulse' | 'wave' | 'none';
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width = '100%',
  height = '1rem',
  variant = 'rectangular',
  animation = 'pulse',
}) => {
  const { settings } = useAccessibility();

  const baseClasses = 'bg-gray-200 dark:bg-gray-700';
  
  const variantClasses = {
    text: 'rounded',
    rectangular: 'rounded-md',
    circular: 'rounded-full',
  };

  const animationClasses = {
    pulse: settings.reducedMotion ? '' : 'animate-pulse',
    wave: settings.reducedMotion ? '' : 'animate-wave',
    none: '',
  };

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  if (animation === 'wave' && !settings.reducedMotion) {
    return (
      <motion.div
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        style={style}
        animate={{
          backgroundPosition: ['200% 0', '-200% 0'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
        role="status"
        aria-label="Loading content"
        style={{
          ...style,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          backgroundSize: '200% 100%',
        }}
      />
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
      role="status"
      aria-label="Loading content"
    />
  );
};

// Dashboard skeleton
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 p-6" role="status" aria-label="Loading dashboard">
    {/* Header skeleton */}
    <div className="flex items-center justify-between">
      <Skeleton width="200px" height="32px" />
      <div className="flex space-x-2">
        <Skeleton width="80px" height="36px" />
        <Skeleton width="80px" height="36px" />
      </div>
    </div>

    {/* Metrics cards skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <Skeleton width="60px" height="16px" />
            <Skeleton variant="circular" width="24px" height="24px" />
          </div>
          <Skeleton width="80px" height="32px" className="mb-2" />
          <Skeleton width="120px" height="14px" />
        </div>
      ))}
    </div>

    {/* Charts skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <Skeleton width="150px" height="24px" className="mb-4" />
        <Skeleton width="100%" height="300px" />
      </div>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <Skeleton width="150px" height="24px" className="mb-4" />
        <Skeleton width="100%" height="300px" />
      </div>
    </div>

    {/* Table skeleton */}
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <Skeleton width="120px" height="24px" />
      </div>
      <div className="p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center space-x-4">
            <Skeleton variant="circular" width="40px" height="40px" />
            <div className="flex-1 space-y-2">
              <Skeleton width="60%" height="16px" />
              <Skeleton width="40%" height="14px" />
            </div>
            <Skeleton width="80px" height="32px" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Task board skeleton
export const TaskBoardSkeleton: React.FC = () => (
  <div className="flex space-x-6 p-6 overflow-x-auto" role="status" aria-label="Loading task board">
    {Array.from({ length: 3 }).map((_, columnIndex) => (
      <div key={columnIndex} className="flex-shrink-0 w-80">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <Skeleton width="100px" height="20px" />
            <Skeleton variant="circular" width="24px" height="24px" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, taskIndex) => (
              <div key={taskIndex} className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                <Skeleton width="80%" height="16px" className="mb-2" />
                <Skeleton width="60%" height="14px" className="mb-3" />
                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <Skeleton width="60px" height="20px" />
                    <Skeleton width="60px" height="20px" />
                  </div>
                  <Skeleton variant="circular" width="32px" height="32px" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Chart skeleton
export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = '300px' }) => (
  <div className="space-y-4" role="status" aria-label="Loading chart">
    <div className="flex items-center justify-between">
      <Skeleton width="150px" height="24px" />
      <div className="flex space-x-2">
        <Skeleton width="60px" height="20px" />
        <Skeleton width="60px" height="20px" />
        <Skeleton width="60px" height="20px" />
      </div>
    </div>
    <div className="relative" style={{ height }}>
      <Skeleton width="100%" height="100%" />
      {/* Simulate chart elements */}
      <div className="absolute inset-0 flex items-end justify-around p-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton
            key={index}
            width="20px"
            height={`${Math.random() * 60 + 20}%`}
            className="opacity-30"
          />
        ))}
      </div>
    </div>
  </div>
);

// Table skeleton
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="space-y-4" role="status" aria-label="Loading table">
    {/* Table header */}
    <div className="flex space-x-4">
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton key={index} width="120px" height="20px" />
      ))}
    </div>
    
    {/* Table rows */}
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              width={colIndex === 0 ? '150px' : '100px'} 
              height="16px" 
            />
          ))}
        </div>
      ))}
    </div>
  </div>
);

// List skeleton
export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => (
  <div className="space-y-4" role="status" aria-label="Loading list">
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-4">
        <Skeleton variant="circular" width="48px" height="48px" />
        <div className="flex-1 space-y-2">
          <Skeleton width="70%" height="16px" />
          <Skeleton width="50%" height="14px" />
        </div>
        <Skeleton width="80px" height="32px" />
      </div>
    ))}
  </div>
);

// Card skeleton
export const CardSkeleton: React.FC<{ showImage?: boolean }> = ({ showImage = false }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden" role="status" aria-label="Loading card">
    {showImage && (
      <Skeleton width="100%" height="200px" variant="rectangular" />
    )}
    <div className="p-6 space-y-4">
      <Skeleton width="80%" height="24px" />
      <div className="space-y-2">
        <Skeleton width="100%" height="16px" />
        <Skeleton width="90%" height="16px" />
        <Skeleton width="60%" height="16px" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton width="100px" height="32px" />
        <Skeleton width="80px" height="20px" />
      </div>
    </div>
  </div>
);

// Form skeleton
export const FormSkeleton: React.FC<{ fields?: number }> = ({ fields = 4 }) => (
  <div className="space-y-6" role="status" aria-label="Loading form">
    {Array.from({ length: fields }).map((_, index) => (
      <div key={index} className="space-y-2">
        <Skeleton width="120px" height="16px" />
        <Skeleton width="100%" height="40px" />
      </div>
    ))}
    <div className="flex space-x-4">
      <Skeleton width="100px" height="40px" />
      <Skeleton width="80px" height="40px" />
    </div>
  </div>
);

// Navigation skeleton
export const NavigationSkeleton: React.FC = () => (
  <div className="space-y-2 p-4" role="status" aria-label="Loading navigation">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="flex items-center space-x-3">
        <Skeleton variant="circular" width="20px" height="20px" />
        <Skeleton width="120px" height="16px" />
      </div>
    ))}
  </div>
);

export {
  Skeleton,
  DashboardSkeleton,
  TaskBoardSkeleton,
  ChartSkeleton,
  TableSkeleton,
  ListSkeleton,
  CardSkeleton,
  FormSkeleton,
  NavigationSkeleton,
};

export default Skeleton;