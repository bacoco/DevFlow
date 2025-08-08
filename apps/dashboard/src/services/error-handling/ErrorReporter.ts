/**
 * Error Reporter
 * Handles error reporting with user consent and privacy protection
 */

import { ErrorReport, UIError } from './types';

export class ErrorReporter {
  private reportQueue: ErrorReport[] = [];
  private isOnline: boolean = navigator.onLine;
  private reportingEndpoint: string = '/api/errors';

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushReportQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Report an error with user consent
   */
  async reportError(report: ErrorReport): Promise<void> {
    if (!report.userConsent) {
      // Store locally without sending if no consent
      this.storeLocalReport(report);
      return;
    }

    // Sanitize error data for privacy
    const sanitizedReport = this.sanitizeReport(report);

    if (this.isOnline) {
      try {
        await this.sendReport(sanitizedReport);
      } catch (error) {
        // Queue for later if sending fails
        this.queueReport(sanitizedReport);
      }
    } else {
      this.queueReport(sanitizedReport);
    }
  }

  /**
   * Request user consent for error reporting
   */
  async requestReportingConsent(error: UIError): Promise<boolean> {
    return new Promise((resolve) => {
      // Create consent modal
      const modal = this.createConsentModal(error, resolve);
      document.body.appendChild(modal);
    });
  }

  /**
   * Sanitize error report for privacy
   */
  private sanitizeReport(report: ErrorReport): ErrorReport {
    const sanitized = { ...report };
    
    // Remove sensitive data from context
    if (sanitized.error.context.metadata) {
      const sanitizedMetadata = { ...sanitized.error.context.metadata };
      
      // Remove potential PII
      delete sanitizedMetadata.email;
      delete sanitizedMetadata.phone;
      delete sanitizedMetadata.address;
      delete sanitizedMetadata.ssn;
      delete sanitizedMetadata.creditCard;
      
      // Hash user identifiers
      if (sanitizedMetadata.userId) {
        sanitizedMetadata.userId = this.hashValue(sanitizedMetadata.userId);
      }
      
      sanitized.error.context.metadata = sanitizedMetadata;
    }

    // Sanitize URL parameters
    if (sanitized.error.context.url) {
      sanitized.error.context.url = this.sanitizeUrl(sanitized.error.context.url);
    }

    // Remove stack trace details that might contain sensitive info
    if (sanitized.error.stack) {
      sanitized.error.stack = this.sanitizeStackTrace(sanitized.error.stack);
    }

    return sanitized;
  }

  /**
   * Send error report to server
   */
  private async sendReport(report: ErrorReport): Promise<void> {
    const response = await fetch(this.reportingEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(report),
    });

    if (!response.ok) {
      throw new Error(`Failed to send error report: ${response.statusText}`);
    }
  }

  /**
   * Queue report for later sending
   */
  private queueReport(report: ErrorReport): void {
    this.reportQueue.push(report);
    
    // Limit queue size to prevent memory issues
    if (this.reportQueue.length > 100) {
      this.reportQueue.shift(); // Remove oldest report
    }
    
    // Store in localStorage for persistence
    this.persistReportQueue();
  }

  /**
   * Flush queued reports when online
   */
  private async flushReportQueue(): Promise<void> {
    if (!this.isOnline || this.reportQueue.length === 0) {
      return;
    }

    const reportsToSend = [...this.reportQueue];
    this.reportQueue = [];

    for (const report of reportsToSend) {
      try {
        await this.sendReport(report);
      } catch (error) {
        // Re-queue failed reports
        this.reportQueue.push(report);
      }
    }

    this.persistReportQueue();
  }

  /**
   * Store report locally without sending
   */
  private storeLocalReport(report: ErrorReport): void {
    const localReports = this.getLocalReports();
    localReports.push(report);
    
    // Limit local storage
    if (localReports.length > 50) {
      localReports.shift();
    }
    
    localStorage.setItem('error_reports_local', JSON.stringify(localReports));
  }

  /**
   * Get locally stored reports
   */
  private getLocalReports(): ErrorReport[] {
    try {
      const stored = localStorage.getItem('error_reports_local');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Persist report queue to localStorage
   */
  private persistReportQueue(): void {
    try {
      localStorage.setItem('error_report_queue', JSON.stringify(this.reportQueue));
    } catch (error) {
      // Handle localStorage quota exceeded
      console.warn('Failed to persist error report queue:', error);
    }
  }

  /**
   * Load report queue from localStorage
   */
  private loadReportQueue(): void {
    try {
      const stored = localStorage.getItem('error_report_queue');
      if (stored) {
        this.reportQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load error report queue:', error);
      this.reportQueue = [];
    }
  }

  /**
   * Create consent modal for error reporting
   */
  private createConsentModal(error: UIError, resolve: (consent: boolean) => void): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'error-consent-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'consent-title');
    modal.setAttribute('aria-describedby', 'consent-description');
    
    modal.innerHTML = `
      <div class="error-consent-backdrop">
        <div class="error-consent-content">
          <h2 id="consent-title">Help Us Improve</h2>
          <p id="consent-description">
            An error occurred that affected your experience. Would you like to send 
            anonymous error details to help us fix this issue? No personal information 
            will be included.
          </p>
          <div class="error-consent-details">
            <details>
              <summary>What information will be sent?</summary>
              <ul>
                <li>Error type and message</li>
                <li>Page where error occurred</li>
                <li>Browser and device information</li>
                <li>Time of error</li>
              </ul>
              <p><strong>Not included:</strong> Personal data, passwords, or private content</p>
            </details>
          </div>
          <div class="error-consent-actions">
            <button class="consent-deny" type="button">No, Thanks</button>
            <button class="consent-allow" type="button">Send Report</button>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    const denyButton = modal.querySelector('.consent-deny') as HTMLButtonElement;
    const allowButton = modal.querySelector('.consent-allow') as HTMLButtonElement;

    denyButton.addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve(false);
    });

    allowButton.addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve(true);
    });

    // Handle escape key
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', handleEscape);
        resolve(false);
      }
    };
    document.addEventListener('keydown', handleEscape);

    return modal;
  }

  /**
   * Utility methods for data sanitization
   */
  private hashValue(value: string): string {
    // Simple hash function for anonymization
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `hash_${Math.abs(hash)}`;
  }

  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove sensitive query parameters
      const sensitiveParams = ['token', 'key', 'password', 'secret', 'auth'];
      sensitiveParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });
      return urlObj.toString();
    } catch {
      return url.split('?')[0]; // Return just the path if URL parsing fails
    }
  }

  private sanitizeStackTrace(stack: string): string {
    // Remove file paths that might contain sensitive information
    return stack
      .split('\n')
      .map(line => {
        // Keep function names and line numbers, remove full file paths
        return line.replace(/\/.*?\//g, '/[path]/');
      })
      .join('\n');
  }

  /**
   * Get reporting statistics
   */
  getReportingStats() {
    return {
      queuedReports: this.reportQueue.length,
      localReports: this.getLocalReports().length,
      isOnline: this.isOnline
    };
  }

  /**
   * Clear all stored reports (for privacy compliance)
   */
  clearAllReports(): void {
    this.reportQueue = [];
    localStorage.removeItem('error_report_queue');
    localStorage.removeItem('error_reports_local');
  }
}