import React, { Suspense, lazy, ComponentType, useEffect, useState } from 'react';
import { AdaptiveSkeleton } from './SkeletonLoaders';

// Preloading strategies
type PreloadStrategy = 'immediate' | 'hover' | 'viewport' | 'idle' | 'manual';

interface LazyComponentConfig {
  loader: () => Promise<{ default: ComponentType<any> }>;
  preloadStrategy?: PreloadStrategy;
  fallback?: React.ReactNode;
  retryCount?: number;
  timeout?: number;
}

// Component preloader with different strategies
class ComponentPreloader {
  private static preloadedComponents = new Map<string, Promise<any>>();
  private static preloadQueue = new Set<string>();

  static preload(key: string, loader: () => Promise<any>): Promise<any> {
    if (this.preloadedComponents.has(key)) {
      return this.preloadedComponents.get(key)!;
    }

    const promise = loader().catch(error => {
      console.warn(`Failed to preload component ${key}:`, error);
      this.preloadedComponents.delete(key);
      throw error;
    });

    this.preloadedComponents.set(key, promise);
    return promise;
  }

  static schedulePreload(key: string, loader: () => Promise<any>, strategy: PreloadStrategy) {
    if (this.preloadedComponents.has(key) || this.preloadQueue.has(key)) {
      return;
    }

    this.preloadQueue.add(key);

    switch (strategy) {
      case 'immediate':
        this.preload(key, loader);
        break;
      case 'idle':
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => this.preload(key, loader));
        } else {
          setTimeout(() => this.preload(key, loader), 100);
        }
        break;
      case 'viewport':
        // Will be handled by intersection observer
        break;
      default:
        break;
    }
  }

  static isPreloaded(key: string): boolean {
    return this.preloadedComponents.has(key);
  }
}

// Enhanced lazy loading with retry logic
function createLazyComponent(config: LazyComponentConfig) {
  const { loader, retryCount = 3, timeout = 10000 } = config;
  
  return lazy(() => {
    let attempts = 0;
    
    const loadWithRetry = async (): Promise<{ default: ComponentType<any> }> => {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Component load timeout')), timeout);
        });
        
        return await Promise.race([loader(), timeoutPromise]);
      } catch (error) {
        attempts++;
        if (attempts < retryCount) {
          console.warn(`Component load attempt ${attempts} failed, retrying...`, error);
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
          return loadWithRetry();
        }
        throw error;
      }
    };
    
    return loadWithRetry();
  });
}

// Lazy component wrapper with preloading
interface LazyWrapperProps {
  componentKey: string;
  config: LazyComponentConfig;
  children?: React.ReactNode;
  [key: string]: any;
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({ 
  componentKey, 
  config, 
  children,
  ...props 
}) => {
  const [Component, setComponent] = useState<ComponentType<any> | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const LazyComponent = createLazyComponent(config);
    setComponent(() => LazyComponent);

    // Schedule preloading based on strategy
    if (config.preloadStrategy) {
      ComponentPreloader.schedulePreload(componentKey, config.loader, config.preloadStrategy);
    }
  }, [componentKey, config]);

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
        <h3 className="text-red-800 font-medium">Failed to load component</h3>
        <p className="text-red-600 text-sm mt-1">{error.message}</p>
        <button 
          onClick={() => {
            setError(null);
            window.location.reload();
          }}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!Component) {
    return config.fallback || <AdaptiveSkeleton type="card" />;
  }

  return (
    <Suspense fallback={config.fallback || <AdaptiveSkeleton type="card" />}>
      <Component {...props}>
        {children}
      </Component>
    </Suspense>
  );
};

// Hook for preloading components on hover
export const usePreloadOnHover = (componentKey: string, loader: () => Promise<any>) => {
  const handleMouseEnter = () => {
    ComponentPreloader.preload(componentKey, loader);
  };

  return { onMouseEnter: handleMouseEnter };
};

// Hook for preloading components in viewport
export const usePreloadInViewport = (componentKey: string, loader: () => Promise<any>) => {
  const [ref, setRef] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            ComponentPreloader.preload(componentKey, loader);
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '50px' }
    );

    observer.observe(ref);

    return () => observer.disconnect();
  }, [ref, componentKey, loader]);

  return setRef;
};

// Route-based lazy loading
export const createLazyRoute = (
  loader: () => Promise<{ default: ComponentType<any> }>,
  fallback?: React.ReactNode
) => {
  const LazyComponent = createLazyComponent({ loader });
  
  return (props: any) => (
    <Suspense fallback={fallback || <AdaptiveSkeleton type="dashboard" />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Preload manager for route transitions
export class RoutePreloader {
  private static preloadedRoutes = new Map<string, Promise<any>>();

  static preloadRoute(routePath: string, loader: () => Promise<any>) {
    if (this.preloadedRoutes.has(routePath)) {
      return this.preloadedRoutes.get(routePath)!;
    }

    const promise = loader().catch(error => {
      console.warn(`Failed to preload route ${routePath}:`, error);
      this.preloadedRoutes.delete(routePath);
      throw error;
    });

    this.preloadedRoutes.set(routePath, promise);
    return promise;
  }

  static preloadRouteOnHover(routePath: string, loader: () => Promise<any>) {
    return {
      onMouseEnter: () => this.preloadRoute(routePath, loader),
      onFocus: () => this.preloadRoute(routePath, loader),
    };
  }
}

export { ComponentPreloader };