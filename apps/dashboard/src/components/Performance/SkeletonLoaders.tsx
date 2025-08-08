import React from 'react';
import { cn } from '../../utils/cn';

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({ className, animate = true }) => (
  <div
    className={cn(
      'bg-gray-200 dark:bg-gray-700 rounded',
      animate && 'animate-pulse',
      className
    )}
    role="status"
    aria-label="Loading content"
  />
);

// Dashboard-specific skeleton components
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 p-6" role="status" aria-label="Loading dashboard">
    {/* Header skeleton */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-32" />
    </div>
    
    {/* Stats cards skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-4 border rounded-lg">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
    
    {/* Chart skeleton */}
    <div className="border rounded-lg p-4">
      <Skeleton className="h-6 w-32 mb-4" />
      <Skeleton className="h-64 w-full" />
    </div>
  </div>
);

export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 300 }) => (
  <div className="space-y-4" role="status" aria-label="Loading chart">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-24" />
    </div>
    <Skeleton className={`w-full`} style={{ height: `${height}px` }} />
    <div className="flex justify-center space-x-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-2">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="space-y-4" role="status" aria-label="Loading table">
    {/* Table header */}
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
    
    {/* Table rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} className="h-4 w-full" />
        ))}
      </div>
    ))}
  </div>
);

export const NavigationSkeleton: React.FC = () => (
  <div className="space-y-2 p-4" role="status" aria-label="Loading navigation">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex items-center space-x-3">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-4 w-24" />
      </div>
    ))}
  </div>
);

export const CardSkeleton: React.FC = () => (
  <div className="p-4 border rounded-lg space-y-3" role="status" aria-label="Loading card">
    <Skeleton className="h-5 w-3/4" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-2/3" />
    <div className="flex justify-between items-center pt-2">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-8 w-20" />
    </div>
  </div>
);

// Adaptive skeleton that matches content structure
interface AdaptiveSkeletonProps {
  type: 'dashboard' | 'chart' | 'table' | 'navigation' | 'card';
  config?: {
    rows?: number;
    columns?: number;
    height?: number;
  };
}

export const AdaptiveSkeleton: React.FC<AdaptiveSkeletonProps> = ({ type, config = {} }) => {
  switch (type) {
    case 'dashboard':
      return <DashboardSkeleton />;
    case 'chart':
      return <ChartSkeleton height={config.height} />;
    case 'table':
      return <TableSkeleton rows={config.rows} columns={config.columns} />;
    case 'navigation':
      return <NavigationSkeleton />;
    case 'card':
      return <CardSkeleton />;
    default:
      return <Skeleton className="h-32 w-full" />;
  }
};

export { Skeleton };