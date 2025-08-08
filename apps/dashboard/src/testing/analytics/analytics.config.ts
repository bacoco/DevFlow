import { AnalyticsConfig } from './UserBehaviorAnalytics';

export const analyticsConfig: AnalyticsConfig = {
  privacy: {
    collectPersonalData: false, // Privacy-first approach
    collectBehaviorData: true,
    retentionPeriod: 365, // 1 year
    anonymizeAfter: 90, // 3 months
    allowCrossSiteTracking: false,
    respectDoNotTrack: true
  },
  sampling: {
    rate: 0.1, // 10% sampling rate to reduce data volume
    strategy: 'deterministic' // Consistent sampling for same users
  },
  storage: {
    local: true, // Store locally for offline capability
    remote: true, // Send to analytics server
    batchSize: 50, // Events per batch
    flushInterval: 30000 // 30 seconds
  }
};

export const developmentAnalyticsConfig: AnalyticsConfig = {
  privacy: {
    collectPersonalData: true, // Allow for development testing
    collectBehaviorData: true,
    retentionPeriod: 30, // Shorter retention for dev
    anonymizeAfter: 7, // Quick anonymization
    allowCrossSiteTracking: false,
    respectDoNotTrack: false // Ignore DNT in development
  },
  sampling: {
    rate: 1.0, // Collect all events in development
    strategy: 'random'
  },
  storage: {
    local: true,
    remote: false, // Don't send to server in development
    batchSize: 10,
    flushInterval: 5000 // 5 seconds for faster testing
  }
};

export const criticalEventsConfig = {
  // Events that should always be collected regardless of sampling
  alwaysCollect: [
    'error',
    'conversion',
    'user_feedback',
    'accessibility_issue',
    'performance_critical'
  ],
  
  // Events that require user consent
  requireConsent: [
    'user_interaction',
    'page_view',
    'feature_usage'
  ],
  
  // Events that should be anonymized immediately
  immediateAnonymization: [
    'search_query',
    'form_input',
    'user_preference'
  ]
};

export const privacyComplianceConfig = {
  // GDPR compliance settings
  gdpr: {
    enabled: true,
    consentRequired: true,
    rightToBeForgotten: true,
    dataPortability: true,
    consentWithdrawal: true
  },
  
  // CCPA compliance settings
  ccpa: {
    enabled: true,
    optOutRights: true,
    dataDisclosure: true,
    nonDiscrimination: true
  },
  
  // Cookie settings
  cookies: {
    essential: true, // Always allowed
    analytics: false, // Requires consent
    marketing: false, // Requires consent
    preferences: true // Usually allowed
  }
};