/**
 * Error Reporting and Logging Utilities
 * Provides centralized error handling, reporting, and logging
 */

import { ErrorInfo } from 'react';

export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  level: 'page' | 'component' | 'widget' | 'service' | 'network';
  boundaryName?: string;
  userId?: string;
  sessionId: string;
  metadata?: Record<string, any>;
}

export interface ErrorReportingConfig {
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  maxReports: number;
  enableLocalStorage: boolean;
  enableConsoleLogging: boolean;
}

class ErrorReportingService {
  private config: ErrorReportingConfig;
  private sessionId: string;
  private reportQueue: ErrorReport[] = [];
  private isOnline: boolean = navigator.onLine;

  constructor(config: Partial<ErrorReportingConfig> = {}) {
    this.config = {
      enabled: true,
      maxReports: 50,
      enableLocalStorage: true,
      enableConsoleLogging: process.env.NODE_ENV === 'development',
      ...config,
    };

    this.sessionId = this.generateSessionId();
    this.setupEventListeners();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupEventListeners(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushReportQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Global error handler for unhandled errors
    window.addEventListener('error', (event) => {
      this.reportError({
        error: event.error || new Error(event.message),
        level: 'page',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Global handler for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        error: new Error(`Unhandled Promise Rejection: ${event.reason}`),
        level: 'service',
        metadata: {
          reason: event.reason,
        },
      });
    });
  }

  public reportError({
    error,
    errorInfo,
    level = 'component',
    boundaryName,
    metadata = {},
  }: {
    error: Error;
    errorInfo?: ErrorInfo;
    level?: ErrorReport['level'];
    boundaryName?: string;
    metadata?: Record<string, any>;
  }): string {
    if (!this.config.enabled) {
      return '';
    }

    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const report: ErrorReport = {
      id: errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      level,
      boundaryName,
      sessionId: this.sessionId,
      metadata: {
        ...metadata,
        errorName: error.name,
        isOnline: this.isOnline,
      },
    };

    // Add to queue for processing
    this.reportQueue.push(report);

    // Log to console if enabled
    if (this.config.enableConsoleLogging) {
      console.group(`🚨 Error Report [${level}]`);
      console.error('Error:', error);
      console.log('Report:', report);
      if (errorInfo) {
        console.log('Component Stack:', errorInfo.componentStack);
      }
      console.groupEnd();
    }

    // Store locally if enabled
    if (this.config.enableLocalStorage) {
      this.storeErrorLocally(report);
    }

    // Send to remote service if online
    if (this.isOnline) {
      this.sendErrorReport(report);
    }

    return errorId;
  }

  private storeErrorLocally(report: ErrorReport): void {
    try {
      const existingReports = this.getLocalErrorReports();
      const updatedReports = [...existingReports, report].slice(-this.config.maxReports);
      localStorage.setItem('devflow_error_reports', JSON.stringify(updatedReports));
    } catch (error) {
      console.warn('Failed to store error report locally:', error);
    }
  }

  private async sendErrorReport(report: ErrorReport): Promise<void> {
    if (!this.config.endpoint) {
      return;
    }

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify(report),
      });

      if (!response.ok) {
        throw new Error(`Failed to send error report: ${response.status}`);
      }

      // Remove from queue if successfully sent
      this.reportQueue = this.reportQueue.filter(r => r.id !== report.id);
    } catch (error) {
      console.warn('Failed to send error report:', error);
      // Keep in queue for retry when online
    }
  }

  private async flushReportQueue(): Promise<void> {
    const reportsToSend = [...this.reportQueue];
    
    for (const report of reportsToSend) {
      await this.sendErrorReport(report);
    }
  }

  public getLocalErrorReports(): ErrorReport[] {
    try {
      const reports = localStorage.getItem('devflow_error_reports');
      return reports ? JSON.parse(reports) : [];
    } catch (error) {
      console.warn('Failed to retrieve local error reports:', error);
      return [];
    }
  }

  public clearLocalErrorReports(): void {
    try {
      localStorage.removeItem('devflow_error_reports');
      console.log('Local error reports cleared');
    } catch (error) {
      console.warn('Failed to clear local error reports:', error);
    }
  }

  public getErrorStats(): {
    totalErrors: number;
    errorsByLevel: Record<string, number>;
    recentErrors: ErrorReport[];
  } {
    const reports = this.getLocalErrorReports();
    const errorsByLevel: Record<string, number> = {};

    reports.forEach(report => {
      errorsByLevel[report.level] = (errorsByLevel[report.level] || 0) + 1;
    });

    return {
      totalErrors: reports.length,
      errorsByLevel,
      recentErrors: reports.slice(-10),
    };
  }

  public updateConfig(newConfig: Partial<ErrorReportingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Create singleton instance
export const errorReporting = new ErrorReportingService({
  endpoint: process.env.NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT,
  apiKey: process.env.NEXT_PUBLIC_ERROR_REPORTING_API_KEY,
});

// Utility functions for common error scenarios
export const reportNetworkError = (error: Error, url: string, method: string) => {
  return errorReporting.reportError({
    error,
    level: 'network',
    metadata: {
      url,
      method,
      networkError: true,
    },
  });
};

export const reportServiceError = (error: Error, service: string, operation: string) => {
  return errorReporting.reportError({
    error,
    level: 'service',
    metadata: {
      service,
      operation,
      serviceError: true,
    },
  });
};

export const reportValidationError = (error: Error, field: string, value: any) => {
  return errorReporting.reportError({
    error,
    level: 'component',
    metadata: {
      field,
      value,
      validationError: true,
    },
  });
};

// Hook for React components to report errors
export const useErrorReporting = () => {
  const reportError = (error: Error, metadata?: Record<string, any>) => {
    return errorReporting.reportError({
      error,
      level: 'component',
      metadata,
    });
  };

  const reportNetworkError = (error: Error, url: string, method: string) => {
    return errorReporting.reportError({
      error,
      level: 'network',
      metadata: {
        url,
        method,
        networkError: true,
      },
    });
  };

  return {
    reportError,
    reportNetworkError,
    getErrorStats: () => errorReporting.getErrorStats(),
    clearLocalReports: () => errorReporting.clearLocalErrorReports(),
  };
};