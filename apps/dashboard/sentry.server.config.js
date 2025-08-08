import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Environment configuration
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION,
  
  // Server-specific configuration
  beforeSend(event, hint) {
    // Filter out development errors
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    
    // Filter out known non-critical server errors
    const error = hint.originalException;
    if (error && error.message) {
      const message = error.message.toLowerCase();
      
      // Filter out expected API errors
      if (message.includes('404') || 
          message.includes('not found') ||
          message.includes('unauthorized')) {
        return null;
      }
    }
    
    return event;
  },
  
  // Additional server configuration
  initialScope: {
    tags: {
      component: 'dashboard-server',
    },
  },
});