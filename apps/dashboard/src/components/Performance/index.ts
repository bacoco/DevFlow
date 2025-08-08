// Performance optimization components and utilities

// Skeleton Loaders
export {
  Skeleton,
  DashboardSkeleton,
  ChartSkeleton,
  TableSkeleton,
  NavigationSkeleton,
  CardSkeleton,
  AdaptiveSkeleton,
} from './SkeletonLoaders';

// Lazy Loading
export {
  LazyWrapper,
  usePreloadOnHover,
  usePreloadInViewport,
  createLazyRoute,
  ComponentPreloader,
  RoutePreloader,
} from './LazyLoadingManager';

// Progressive Enhancement
export {
  ProgressiveEnhancementProvider,
  useProgressiveEnhancement,
  ProgressiveComponent,
  CoreFunctionality,
  EnhancedFunctionality,
  AdaptiveLoader,
  ProgressiveImage,
  useFeatureDetection,
} from './ProgressiveEnhancement';

// Performance Optimized App Components
export {
  PerformanceOptimizedApp,
  OptimizedComponent,
  OptimizedImage,
  PerformanceMetrics,
  useComponentPerformance,
  OptimizedList,
} from './PerformanceOptimizedApp';

// Services
export { performanceMonitor, usePerformanceMonitor } from '../../services/PerformanceMonitor';
export { offlineManager, useOfflineStatus } from '../../services/OfflineManager';