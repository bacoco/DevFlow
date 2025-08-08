/**
 * Error Analytics
 * Tracks and analyzes error patterns for monitoring and improvement
 */

import { UIError, ErrorAnalytics as ErrorAnalyticsData, ErrorCategory, ErrorSeverity } from './types';

export class ErrorAnalytics {
  private errorCounts: Map<string, number> = new Map();
  private errorHistory: UIError[] = [];
  private maxHistorySize: number = 1000;
  private analyticsEndpoint: string = '/api/analytics/errors';

  constructor() {
    // Load existing analytics from localStorage
    this.loadAnalyticsData();
    
    // Periodically send analytics data
    setInterval(() => {
      this.sendAnalyticsData();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Record an error occurrence
   */
  recordError(error: UIError): void {
    // Add to history
    this.errorHistory.push(error);
    
    // Maintain history size limit
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }

    // Update error counts
    const errorKey = this.getErrorKey(error);
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);

    // Persist to localStorage
    this.persistAnalyticsData();

    // Check for error patterns that need immediate attention
    this.checkErrorPatterns(error);
  }

  /**
   * Get error analytics data
   */
  getAnalytics(): ErrorAnalyticsData[] {
    const analyticsMap = new Map<string, ErrorAnalyticsData>();

    this.errorHistory.forEach(error => {
      const key = this.getErrorKey(error);
      
      if (!analyticsMap.has(key)) {
        analyticsMap.set(key, {
          errorId: key,
          category: error.category,
          severity: error.severity,
          component: error.context.component,
          count: 0,
          firstOccurrence: error.context.timestamp,
          lastOccurrence: error.context.timestamp,
          affectedUsers: new Set<string>(),
          resolutionRate: 0,
          averageRecoveryTime: 0
        } as any);
      }

      const analytics = analyticsMap.get(key)!;
      analytics.count++;
      
      if (error.context.timestamp > analytics.lastOccurrence) {
        analytics.lastOccurrence = error.context.timestamp;
      }
      
      if (error.context.userId) {
        (analytics.affectedUsers as Set<string>).add(error.context.userId);
      }
    });

    // Convert Set to number for affected users
    return Array.from(analyticsMap.values()).map(analytics => ({
      ...analytics,
      affectedUsers: (analytics.affectedUsers as Set<string>).size,
      resolutionRate: this.calculateResolutionRate(analytics.errorId),
      averageRecoveryTime: this.calculateAverageRecoveryTime(analytics.errorId)
    }));
  }

  /**
   * Get error trends over time
   */
  getErrorTrends(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): any[] {
    const now = new Date();
    const timeRanges = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000
    };

    const rangeMs = timeRanges[timeRange];
    const startTime = new Date(now.getTime() - rangeMs);

    const relevantErrors = this.errorHistory.filter(
      error => error.context.timestamp >= startTime
    );

    // Group errors by time buckets
    const bucketSize = rangeMs / 24; // 24 data points
    const buckets = new Map<number, { timestamp: Date; count: number; severity: Record<ErrorSeverity, number> }>();

    relevantErrors.forEach(error => {
      const bucketIndex = Math.floor((error.context.timestamp.getTime() - startTime.getTime()) / bucketSize);
      
      if (!buckets.has(bucketIndex)) {
        buckets.set(bucketIndex, {
          timestamp: new Date(startTime.getTime() + bucketIndex * bucketSize),
          count: 0,
          severity: { low: 0, medium: 0, high: 0, critical: 0 }
        });
      }

      const bucket = buckets.get(bucketIndex)!;
      bucket.count++;
      bucket.severity[error.severity]++;
    });

    return Array.from(buckets.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get top error categories
   */
  getTopErrorCategories(limit: number = 10): Array<{ category: ErrorCategory; count: number; percentage: number }> {
    const categoryCounts = new Map<ErrorCategory, number>();
    let totalErrors = 0;

    this.errorHistory.forEach(error => {
      const count = categoryCounts.get(error.category) || 0;
      categoryCounts.set(error.category, count + 1);
      totalErrors++;
    });

    return Array.from(categoryCounts.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: (count / totalErrors) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get error rate by component
   */
  getErrorRateByComponent(): Array<{ component: string; errorRate: number; totalErrors: number }> {
    const componentCounts = new Map<string, number>();
    
    this.errorHistory.forEach(error => {
      const count = componentCounts.get(error.context.component) || 0;
      componentCounts.set(error.context.component, count + 1);
    });

    return Array.from(componentCounts.entries())
      .map(([component, totalErrors]) => ({
        component,
        totalErrors,
        errorRate: this.calculateComponentErrorRate(component)
      }))
      .sort((a, b) => b.errorRate - a.errorRate);
  }

  /**
   * Get user impact analysis
   */
  getUserImpactAnalysis(): {
    totalAffectedUsers: number;
    errorsByUser: Array<{ userId: string; errorCount: number; lastError: Date }>;
    averageErrorsPerUser: number;
  } {
    const userErrors = new Map<string, { count: number; lastError: Date }>();

    this.errorHistory.forEach(error => {
      if (error.context.userId) {
        const existing = userErrors.get(error.context.userId) || { count: 0, lastError: new Date(0) };
        userErrors.set(error.context.userId, {
          count: existing.count + 1,
          lastError: error.context.timestamp > existing.lastError ? error.context.timestamp : existing.lastError
        });
      }
    });

    const errorsByUser = Array.from(userErrors.entries()).map(([userId, data]) => ({
      userId,
      errorCount: data.count,
      lastError: data.lastError
    }));

    return {
      totalAffectedUsers: userErrors.size,
      errorsByUser: errorsByUser.sort((a, b) => b.errorCount - a.errorCount),
      averageErrorsPerUser: errorsByUser.length > 0 
        ? errorsByUser.reduce((sum, user) => sum + user.errorCount, 0) / errorsByUser.length 
        : 0
    };
  }

  /**
   * Check for concerning error patterns
   */
  private checkErrorPatterns(error: UIError): void {
    const recentErrors = this.getRecentErrors(5 * 60 * 1000); // Last 5 minutes
    
    // Check for error spikes
    if (recentErrors.length > 10) {
      this.alertErrorSpike(recentErrors);
    }

    // Check for critical error patterns
    const criticalErrors = recentErrors.filter(e => e.severity === 'critical');
    if (criticalErrors.length > 2) {
      this.alertCriticalErrorPattern(criticalErrors);
    }

    // Check for component-specific issues
    const componentErrors = recentErrors.filter(e => e.context.component === error.context.component);
    if (componentErrors.length > 5) {
      this.alertComponentIssue(error.context.component, componentErrors);
    }
  }

  /**
   * Get recent errors within time window
   */
  private getRecentErrors(timeWindowMs: number): UIError[] {
    const cutoff = new Date(Date.now() - timeWindowMs);
    return this.errorHistory.filter(error => error.context.timestamp >= cutoff);
  }

  /**
   * Alert handlers for error patterns
   */
  private alertErrorSpike(errors: UIError[]): void {
    console.warn(`Error spike detected: ${errors.length} errors in the last 5 minutes`);
    // Could trigger monitoring alerts here
  }

  private alertCriticalErrorPattern(errors: UIError[]): void {
    console.error(`Critical error pattern detected: ${errors.length} critical errors in the last 5 minutes`);
    // Could trigger immediate alerts here
  }

  private alertComponentIssue(component: string, errors: UIError[]): void {
    console.warn(`Component issue detected in ${component}: ${errors.length} errors in the last 5 minutes`);
    // Could trigger component-specific alerts here
  }

  /**
   * Utility methods
   */
  private getErrorKey(error: UIError): string {
    return `${error.category}_${error.context.component}_${error.name}`;
  }

  private calculateResolutionRate(errorId: string): number {
    // This would typically come from tracking resolved vs unresolved errors
    // For now, return a placeholder calculation
    const errorCount = this.errorCounts.get(errorId) || 0;
    return Math.max(0, 100 - (errorCount * 10)); // Simplified calculation
  }

  private calculateAverageRecoveryTime(errorId: string): number {
    // This would track time from error to resolution
    // For now, return a placeholder
    return 30000; // 30 seconds placeholder
  }

  private calculateComponentErrorRate(component: string): number {
    const componentErrors = this.errorHistory.filter(e => e.context.component === component);
    const timeWindow = 24 * 60 * 60 * 1000; // 24 hours
    const recentErrors = componentErrors.filter(
      e => Date.now() - e.context.timestamp.getTime() < timeWindow
    );
    
    // Return errors per hour
    return (recentErrors.length / 24);
  }

  /**
   * Send analytics data to server
   */
  private async sendAnalyticsData(): Promise<void> {
    if (!navigator.onLine) return;

    try {
      const analytics = this.getAnalytics();
      const trends = this.getErrorTrends();
      const categories = this.getTopErrorCategories();
      const userImpact = this.getUserImpactAnalysis();

      await fetch(this.analyticsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analytics,
          trends,
          categories,
          userImpact,
          timestamp: new Date().toISOString()
        }),
      });
    } catch (error) {
      console.warn('Failed to send error analytics:', error);
    }
  }

  /**
   * Persist analytics data to localStorage
   */
  private persistAnalyticsData(): void {
    try {
      const data = {
        errorHistory: this.errorHistory.slice(-this.maxHistorySize), // Keep only recent history
        errorCounts: Array.from(this.errorCounts.entries())
      };
      localStorage.setItem('error_analytics', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to persist error analytics:', error);
    }
  }

  /**
   * Load analytics data from localStorage
   */
  private loadAnalyticsData(): void {
    try {
      const stored = localStorage.getItem('error_analytics');
      if (stored) {
        const data = JSON.parse(stored);
        this.errorHistory = data.errorHistory || [];
        this.errorCounts = new Map(data.errorCounts || []);
      }
    } catch (error) {
      console.warn('Failed to load error analytics:', error);
    }
  }

  /**
   * Clear analytics data
   */
  clearAnalytics(): void {
    this.errorHistory = [];
    this.errorCounts.clear();
    localStorage.removeItem('error_analytics');
  }

  /**
   * Export analytics data for external analysis
   */
  exportAnalytics(): string {
    return JSON.stringify({
      analytics: this.getAnalytics(),
      trends: this.getErrorTrends(),
      categories: this.getTopErrorCategories(),
      userImpact: this.getUserImpactAnalysis(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }
}