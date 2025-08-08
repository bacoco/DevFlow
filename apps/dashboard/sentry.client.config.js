import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Environment configuration
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION,
  
  // Error filtering
  beforeSend(event, hint) {
    // Filter out development errors
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    
    // Filter out known non-critical errors
    const error = hint.originalException;
    if (error && error.message) {
      const message = error.message.toLowerCase();
      
      // Filter out network errors that are expected
      if (message.includes('network error') || 
          message.includes('fetch failed') ||
          message.includes('websocket')) {
        return null;
      }
      
      // Filter out browser extension errors
      if (message.includes('extension') || 
          message.includes('chrome-extension')) {
        return null;
      }
    }
    
    return event;
  },
  
  // Additional configuration
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  // User context
  initialScope: {
    tags: {
      component: 'dashboard',
    },
  },
});