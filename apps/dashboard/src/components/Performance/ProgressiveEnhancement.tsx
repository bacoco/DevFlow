import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

// Progressive enhancement context
interface ProgressiveEnhancementContext {
  isJavaScriptEnabled: boolean;
  isOnline: boolean;
  supportsIntersectionObserver: boolean;
  supportsServiceWorker: boolean;
  supportsWebGL: boolean;
  deviceCapabilities: DeviceCapabilities;
  connectionSpeed: ConnectionSpeed;
}

interface DeviceCapabilities {
  memory: number; // GB
  cores: number;
  isMobile: boolean;
  isLowEnd: boolean;
}

type ConnectionSpeed = 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';

const ProgressiveContext = createContext<ProgressiveEnhancementContext | null>(null);

// Feature detection utilities
const detectFeatures = (): Omit<ProgressiveEnhancementContext, 'isOnline' | 'connectionSpeed'> => {
  const isJavaScriptEnabled = true; // If this runs, JS is enabled
  
  const supportsIntersectionObserver = 'IntersectionObserver' in window;
  const supportsServiceWorker = 'serviceWorker' in navigator;
  const supportsWebGL = (() => {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  })();

  // Device capabilities detection
  const deviceCapabilities: DeviceCapabilities = {
    memory: (navigator as any).deviceMemory || 4, // Default to 4GB if not available
    cores: navigator.hardwareConcurrency || 4,
    isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    isLowEnd: false
  };

  // Determine if device is low-end
  deviceCapabilities.isLowEnd = deviceCapabilities.memory <= 2 || deviceCapabilities.cores <= 2;

  return {
    isJavaScriptEnabled,
    supportsIntersectionObserver,
    supportsServiceWorker,
    supportsWebGL,
    deviceCapabilities
  };
};

// Connection speed detection
const detectConnectionSpeed = (): ConnectionSpeed => {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  if (!connection) return 'unknown';
  
  const effectiveType = connection.effectiveType;
  return effectiveType || 'unknown';
};

// Progressive enhancement provider
export const ProgressiveEnhancementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [context, setContext] = useState<ProgressiveEnhancementContext>(() => ({
    ...detectFeatures(),
    isOnline: navigator.onLine,
    connectionSpeed: detectConnectionSpeed()
  }));

  useEffect(() => {
    const handleOnline = () => setContext(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setContext(prev => ({ ...prev, isOnline: false }));
    
    const handleConnectionChange = () => {
      setContext(prev => ({ ...prev, connectionSpeed: detectConnectionSpeed() }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return (
    <ProgressiveContext.Provider value={context}>
      {children}
    </ProgressiveContext.Provider>
  );
};

// Hook to access progressive enhancement context
export const useProgressiveEnhancement = () => {
  const context = useContext(ProgressiveContext);
  if (!context) {
    throw new Error('useProgressiveEnhancement must be used within ProgressiveEnhancementProvider');
  }
  return context;
};

// Progressive component wrapper
interface ProgressiveComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requirements?: {
    requiresJS?: boolean;
    requiresOnline?: boolean;
    requiresHighEnd?: boolean;
    requiresFastConnection?: boolean;
    requiresFeature?: keyof ProgressiveEnhancementContext;
  };
}

export const ProgressiveComponent: React.FC<ProgressiveComponentProps> = ({
  children,
  fallback,
  requirements = {}
}) => {
  const context = useProgressiveEnhancement();
  
  const {
    requiresJS = false,
    requiresOnline = false,
    requiresHighEnd = false,
    requiresFastConnection = false,
    requiresFeature
  } = requirements;

  // Check requirements
  const meetsRequirements = 
    (!requiresJS || context.isJavaScriptEnabled) &&
    (!requiresOnline || context.isOnline) &&
    (!requiresHighEnd || !context.deviceCapabilities.isLowEnd) &&
    (!requiresFastConnection || ['4g', '3g'].includes(context.connectionSpeed)) &&
    (!requiresFeature || context[requiresFeature]);

  if (!meetsRequirements) {
    return <>{fallback}</> || null;
  }

  return <>{children}</>;
};

// Core functionality component (always loads)
export const CoreFunctionality: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="core-functionality">{children}</div>;
};

// Enhanced functionality component (loads progressively)
export const EnhancedFunctionality: React.FC<{ 
  children: React.ReactNode;
  loadingStrategy?: 'immediate' | 'idle' | 'interaction';
}> = ({ children, loadingStrategy = 'idle' }) => {
  const [shouldLoad, setShouldLoad] = useState(loadingStrategy === 'immediate');
  const context = useProgressiveEnhancement();

  useEffect(() => {
    if (shouldLoad) return;

    switch (loadingStrategy) {
      case 'idle':
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => setShouldLoad(true));
        } else {
          setTimeout(() => setShouldLoad(true), 100);
        }
        break;
      case 'interaction':
        const handleInteraction = () => {
          setShouldLoad(true);
          document.removeEventListener('click', handleInteraction);
          document.removeEventListener('keydown', handleInteraction);
          document.removeEventListener('scroll', handleInteraction);
        };
        
        document.addEventListener('click', handleInteraction, { once: true });
        document.addEventListener('keydown', handleInteraction, { once: true });
        document.addEventListener('scroll', handleInteraction, { once: true });
        
        return () => {
          document.removeEventListener('click', handleInteraction);
          document.removeEventListener('keydown', handleInteraction);
          document.removeEventListener('scroll', handleInteraction);
        };
    }
  }, [loadingStrategy, shouldLoad]);

  if (!shouldLoad) {
    return null;
  }

  // Don't load enhanced features on low-end devices or slow connections
  if (context.deviceCapabilities.isLowEnd || context.connectionSpeed === 'slow-2g') {
    return null;
  }

  return <div className="enhanced-functionality">{children}</div>;
};

// Adaptive loading based on device capabilities
export const AdaptiveLoader: React.FC<{
  highEnd: React.ReactNode;
  midRange: React.ReactNode;
  lowEnd: React.ReactNode;
}> = ({ highEnd, midRange, lowEnd }) => {
  const { deviceCapabilities, connectionSpeed } = useProgressiveEnhancement();

  if (deviceCapabilities.isLowEnd || connectionSpeed === 'slow-2g') {
    return <>{lowEnd}</>;
  }

  if (deviceCapabilities.memory >= 8 && connectionSpeed === '4g') {
    return <>{highEnd}</>;
  }

  return <>{midRange}</>;
};

// Progressive image loading
interface ProgressiveImageProps {
  src: string;
  lowQualitySrc?: string;
  alt: string;
  className?: string;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  lowQualitySrc,
  alt,
  className
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState(lowQualitySrc || src);
  const { connectionSpeed, deviceCapabilities } = useProgressiveEnhancement();

  useEffect(() => {
    // Load low quality first on slow connections
    if (lowQualitySrc && (connectionSpeed === 'slow-2g' || connectionSpeed === '2g')) {
      return;
    }

    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setImageLoaded(true);
    };
    img.src = src;
  }, [src, lowQualitySrc, connectionSpeed]);

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`${className} ${imageLoaded ? 'opacity-100' : 'opacity-75'} transition-opacity duration-300`}
      loading="lazy"
    />
  );
};

// Feature detection hook
export const useFeatureDetection = () => {
  const context = useProgressiveEnhancement();
  
  return {
    ...context,
    canUseAdvancedFeatures: !context.deviceCapabilities.isLowEnd && context.connectionSpeed !== 'slow-2g',
    shouldPreloadContent: context.connectionSpeed === '4g' && !context.deviceCapabilities.isLowEnd,
    shouldUseAnimations: !context.deviceCapabilities.isLowEnd,
    shouldLoadImages: context.isOnline && context.connectionSpeed !== 'slow-2g'
  };
};