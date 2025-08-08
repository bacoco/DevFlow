import React, { Suspense, ComponentType, LazyExoticComponent } from 'react';
import { motion } from 'framer-motion';

// Loading skeleton component
export const LoadingSkeleton: React.FC<{ 
  height?: string; 
  width?: string; 
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
}> = ({ 
  height = '20px', 
  width = '100%', 
  className = '', 
  variant = 'rectangular' 
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700';
  const variantClasses = {
    text: 'rounded',
    rectangular: 'rounded-md',
    circular: 'rounded-full',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{ height, width }}
      role="status"
      aria-label="Loading content"
    />
  );
};

// Enhanced loading component with animations
export const LoadingSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  message?: string;
}> = ({ size = 'md', className = '', message }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-2 ${className}`}>
      <motion.div
        className={`${sizeClasses[size]} border-2 border-gray-200 border-t-blue-600 rounded-full`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        role="status"
        aria-label="Loading"
      />
      {message && (
        <p className="text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
};

// Progressive loading component
export const ProgressiveLoader: React.FC<{
  progress: number;
  message?: string;
  className?: string;
}> = ({ progress, message, className = '' }) => {
  return (
    <div className={`w-full space-y-2 ${className}`}>
      <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
        <motion.div
          className="bg-blue-600 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {message && (
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center" aria-live="polite">
          {message} ({Math.round(progress)}%)
        </p>
      )}
    </div>
  );
};

// Lazy loading wrapper with error boundary
interface LazyWrapperProps {
  fallback?: React.ComponentType;
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  children: React.ReactNode;
}

const DefaultErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="flex flex-col items-center justify-center p-8 space-y-4">
    <div className="text-red-600 dark:text-red-400">
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <div className="text-center">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Failed to load component
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        {error.message}
      </p>
    </div>
    <button
      onClick={retry}
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      Try Again
    </button>
  </div>
);

class LazyErrorBoundary extends React.Component<
  { fallback: React.ComponentType<{ error: Error; retry: () => void }>; children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy loading error:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback;
      return <FallbackComponent error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({
  fallback: FallbackComponent = LoadingSpinner,
  errorFallback: ErrorFallbackComponent = DefaultErrorFallback,
  children,
}) => {
  return (
    <LazyErrorBoundary fallback={ErrorFallbackComponent}>
      <Suspense fallback={<FallbackComponent />}>
        {children}
      </Suspense>
    </LazyErrorBoundary>
  );
};

// HOC for lazy loading components
export function withLazyLoading<P extends object>(
  Component: LazyExoticComponent<ComponentType<P>>,
  options: {
    fallback?: React.ComponentType;
    errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  } = {}
) {
  return function LazyComponent(props: P) {
    return (
      <LazyWrapper {...options}>
        <Component {...props} />
      </LazyWrapper>
    );
  };
}

// Preload utility for lazy components
export const preloadComponent = (componentImport: () => Promise<any>) => {
  const componentPromise = componentImport();
  return componentPromise;
};

// Intersection observer hook for lazy loading
export const useIntersectionObserver = (
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
) => {
  const [element, setElement] = React.useState<Element | null>(null);

  React.useEffect(() => {
    if (!element) return;

    const observer = new IntersectionObserver(callback, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [element, callback, options]);

  return setElement;
};

// Lazy image component with progressive loading
export const LazyImage: React.FC<{
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}> = ({ src, alt, placeholder, className = '', onLoad, onError }) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isInView, setIsInView] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  const setRef = useIntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
      }
    },
    { threshold: 0.1 }
  );

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div ref={setRef} className={`relative overflow-hidden ${className}`}>
      {!isLoaded && !hasError && (
        <LoadingSkeleton
          height="100%"
          width="100%"
          className="absolute inset-0"
          variant="rectangular"
        />
      )}
      
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="text-gray-400 dark:text-gray-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      )}

      {isInView && (
        <motion.img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className={`${isLoaded ? 'block' : 'hidden'} w-full h-full object-cover`}
        />
      )}
    </div>
  );
};

// Bundle size analyzer utility (development only)
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV === 'development') {
    const getComponentSize = (component: any) => {
      try {
        return JSON.stringify(component).length;
      } catch {
        return 0;
      }
    };

    return {
      logComponentSize: (name: string, component: any) => {
        const size = getComponentSize(component);
        console.log(`Component ${name} size: ${size} bytes`);
      },
    };
  }

  return {
    logComponentSize: () => {},
  };
};