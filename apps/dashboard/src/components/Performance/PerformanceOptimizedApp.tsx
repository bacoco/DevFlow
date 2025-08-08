import React, { useEffect, useState } from 'react';
import { ProgressiveEnhancementProvider, useFeatureDetection } from './ProgressiveEnhancement';
import { LazyWrapper } from './LazyLoadingManager';
import { AdaptiveSkeleton } from './SkeletonLoaders';
import { usePerformanceMonitor } from '../../services/PerformanceMonitor';
import { useOfflineStatus } from '../../services/OfflineManager';

// Performance-optimized wrapper for the entire application
export const PerformanceOptimizedApp: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ProgressiveEnhancementProvider>
      <PerformanceMonitoringWrapper>
        <OfflineAwareWrapper>
          {children}
        </OfflineAwareWrapper>
      </PerformanceMonitoringWrapper>
    </ProgressiveEnhancementProvider>
  );
};

// Performance monitoring wrapper
const PerformanceMonitoringWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mark, measureFunction } = usePerformanceMonitor();

  useEffect(() => {
    mark('app-start');
    
    return () => {
      mark('app-end');
    };
  }, [mark]);

  return (
    <div className="performance-monitored-app">
      {children}
    </div>
  );
};

// Offline-aware wrapper
const OfflineAwareWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOnline } = useOfflineStatus();

  return (
    <div className={`app-wrapper ${isOnline ? 'online' : 'offline'}`}>
      {!isOnline && (
        <div className="offline-banner bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">
                You're currently offline. Some features may be limited.
              </p>
            </div>
          </div>
        </div>
      )}
      {children}
    </div>
  );
};

// Performance-optimized component loader
interface OptimizedComponentProps {
  componentKey: string;
  loader: () => Promise<{ default: React.ComponentType<any> }>;
  fallbackType?: 'dashboard' | 'chart' | 'table' | 'card';
  preloadStrategy?: 'immediate' | 'hover' | 'viewport' | 'idle';
  children?: React.ReactNode;
  [key: string]: any;
}

export const OptimizedComponent: React.FC<OptimizedComponentProps> = ({
  componentKey,
  loader,
  fallbackType = 'card',
  preloadStrategy = 'idle',
  children,
  ...props
}) => {
  const featureDetection = useFeatureDetection();
  
  // Adapt loading strategy based on device capabilities
  const adaptedStrategy = React.useMemo(() => {
    if (!featureDetection.canUseAdvancedFeatures) {
      return 'manual'; // Don't preload on low-end devices
    }
    
    if (!featureDetection.shouldPreloadContent) {
      return 'hover'; // Only preload on interaction for slow connections
    }
    
    return preloadStrategy;
  }, [featureDetection, preloadStrategy]);

  const config = {
    loader,
    preloadStrategy: adaptedStrategy,
    fallback: <AdaptiveSkeleton type={fallbackType} />,
    retryCount: featureDetection.isOnline ? 3 : 1,
    timeout: featureDetection.connectionSpeed === 'slow-2g' ? 30000 : 10000,
  };

  return (
    <LazyWrapper componentKey={componentKey} config={config} {...props}>
      {children}
    </LazyWrapper>
  );
};

// Performance-aware image component
interface OptimizedImageProps {
  src: string;
  lowQualitySrc?: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  lowQualitySrc,
  alt,
  className,
  width,
  height,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState(lowQualitySrc || src);
  const [imageError, setImageError] = useState(false);
  const featureDetection = useFeatureDetection();

  useEffect(() => {
    // Don't load high-quality images on slow connections or low-end devices
    if (!featureDetection.shouldLoadImages || (lowQualitySrc && !featureDetection.shouldPreloadContent)) {
      return;
    }

    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setImageLoaded(true);
    };
    img.onerror = () => {
      setImageError(true);
    };
    img.src = src;
  }, [src, lowQualitySrc, featureDetection]);

  if (imageError) {
    return (
      <div 
        className={`bg-gray-200 dark:bg-gray-700 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`${className} ${imageLoaded ? 'opacity-100' : 'opacity-75'} transition-opacity duration-300`}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
    />
  );
};

// Performance metrics display component
export const PerformanceMetrics: React.FC = () => {
  const { webVitals, getReport } = usePerformanceMonitor();
  const [showMetrics, setShowMetrics] = useState(false);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const report = getReport();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setShowMetrics(!showMetrics)}
        className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
      >
        Performance
      </button>
      
      {showMetrics && (
        <div className="absolute bottom-12 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 w-80 max-h-96 overflow-y-auto">
          <h3 className="font-semibold mb-3">Core Web Vitals</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>LCP:</span>
              <span className={getMetricColor(webVitals.LCP, 2500, 4000)}>
                {webVitals.LCP ? `${webVitals.LCP.toFixed(0)}ms` : 'N/A'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>FID:</span>
              <span className={getMetricColor(webVitals.FID, 100, 300)}>
                {webVitals.FID ? `${webVitals.FID.toFixed(0)}ms` : 'N/A'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>CLS:</span>
              <span className={getMetricColor(webVitals.CLS, 0.1, 0.25)}>
                {webVitals.CLS ? webVitals.CLS.toFixed(3) : 'N/A'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>FCP:</span>
              <span className={getMetricColor(webVitals.FCP, 1800, 3000)}>
                {webVitals.FCP ? `${webVitals.FCP.toFixed(0)}ms` : 'N/A'}
              </span>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <div>Total Metrics: {report.summary.totalMetrics}</div>
              <div>Good: {report.summary.goodMetrics}</div>
              <div>Poor: {report.summary.poorMetrics}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get color based on metric thresholds
function getMetricColor(value: number | null, goodThreshold: number, poorThreshold: number): string {
  if (value === null) return 'text-gray-500';
  if (value <= goodThreshold) return 'text-green-600';
  if (value <= poorThreshold) return 'text-yellow-600';
  return 'text-red-600';
}

// Hook for measuring component performance
export const useComponentPerformance = (componentName: string) => {
  const { measureFunction, measureAsyncFunction, mark } = usePerformanceMonitor();

  useEffect(() => {
    mark(`${componentName}-mount`);
    
    return () => {
      mark(`${componentName}-unmount`);
    };
  }, [componentName, mark]);

  return {
    measureRender: (renderFn: () => void) => measureFunction(`${componentName}-render`, renderFn),
    measureAsync: (asyncFn: () => Promise<any>) => measureAsyncFunction(`${componentName}-async`, asyncFn),
  };
};

// Performance-optimized list component with virtualization
interface OptimizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  className?: string;
}

export function OptimizedList<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  className,
}: OptimizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const featureDetection = useFeatureDetection();

  // Calculate visible range
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );

  // Don't virtualize on low-end devices to avoid complexity
  if (featureDetection.deviceCapabilities.isLowEnd || items.length < 50) {
    return (
      <div className={className} style={{ height: containerHeight, overflowY: 'auto' }}>
        {items.map((item, index) => (
          <div key={index} style={{ height: itemHeight }}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    );
  }

  const visibleItems = items.slice(visibleStart, visibleEnd);

  return (
    <div
      className={className}
      style={{ height: containerHeight, overflowY: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${visibleStart * itemHeight}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={visibleStart + index} style={{ height: itemHeight }}>
              {renderItem(item, visibleStart + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}