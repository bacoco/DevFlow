import { v4 as uuidv4 } from 'uuid';
import { IDEEventType, PrivacyLevel, validateIDETelemetry } from '@devflow/shared-types';
import { 
  VSCodeTelemetryEvent, 
  PrivacyConsent, 
  TelemetryBatch, 
  TelemetryConfig,
  TelemetryCollectionResult 
} from './types';

export class TelemetryCollector {
  private config: TelemetryConfig;
  private sessionId: string;
  private userId?: string;
  private consent?: PrivacyConsent;
  private eventBuffer: VSCodeTelemetryEvent[] = [];
  private batchTimer?: NodeJS.Timeout;

  constructor(config: TelemetryConfig) {
    this.config = config;
    this.sessionId = uuidv4();
    this.startBatchTimer();
  }

  /**
   * Set user ID and privacy consent
   */
  setUserConsent(userId: string, consent: PrivacyConsent): void {
    this.userId = userId;
    this.consent = consent;
    
    if (!consent.consentGiven) {
      this.clearEventBuffer();
      this.stopCollection();
    }
  }

  /**
   * Collect keystroke telemetry
   */
  collectKeystroke(fileName?: string, keystrokeCount: number = 1): void {
    if (!this.canCollectData('keystrokes')) return;

    const event: VSCodeTelemetryEvent = {
      type: IDEEventType.KEYSTROKE,
      timestamp: new Date(),
      sessionId: this.sessionId,
      userId: this.userId,
      data: {
        fileName: this.sanitizeFileName(fileName),
        keystrokeCount
      }
    };

    this.addEvent(event);
  }

  /**
   * Collect file change telemetry
   */
  collectFileChange(fileName: string, fileExtension?: string): void {
    if (!this.canCollectData('fileChanges')) return;

    const event: VSCodeTelemetryEvent = {
      type: IDEEventType.FILE_CHANGE,
      timestamp: new Date(),
      sessionId: this.sessionId,
      userId: this.userId,
      data: {
        fileName: this.sanitizeFileName(fileName),
        fileExtension
      }
    };

    this.addEvent(event);
  }

  /**
   * Collect focus time telemetry
   */
  collectFocusTime(focusDurationMs: number, interruptionCount: number = 0): void {
    if (!this.canCollectData('focusTime')) return;

    const event: VSCodeTelemetryEvent = {
      type: IDEEventType.FOCUS,
      timestamp: new Date(),
      sessionId: this.sessionId,
      userId: this.userId,
      data: {
        focusDurationMs,
        interruptionCount
      }
    };

    this.addEvent(event);
  }

  /**
   * Collect debug session telemetry
   */
  collectDebugSession(debugSessionId: string): void {
    if (!this.canCollectData('debugging')) return;

    const event: VSCodeTelemetryEvent = {
      type: IDEEventType.DEBUG,
      timestamp: new Date(),
      sessionId: this.sessionId,
      userId: this.userId,
      data: {
        debugSessionId
      }
    };

    this.addEvent(event);
  }

  /**
   * Collect build event telemetry
   */
  collectBuildEvent(buildResult: 'success' | 'failure' | 'cancelled', errorCount?: number, warningCount?: number): void {
    if (!this.canCollectData('buildEvents')) return;

    const event: VSCodeTelemetryEvent = {
      type: IDEEventType.BUILD,
      timestamp: new Date(),
      sessionId: this.sessionId,
      userId: this.userId,
      data: {
        buildResult,
        errorCount,
        warningCount
      }
    };

    this.addEvent(event);
  }

  /**
   * Collect test run telemetry
   */
  collectTestRun(testResults: { passed: number; failed: number; skipped: number }): void {
    if (!this.canCollectData('testEvents')) return;

    const event: VSCodeTelemetryEvent = {
      type: IDEEventType.TEST_RUN,
      timestamp: new Date(),
      sessionId: this.sessionId,
      userId: this.userId,
      data: {
        testResults
      }
    };

    this.addEvent(event);
  }

  /**
   * Manually flush events
   */
  async flush(): Promise<TelemetryCollectionResult> {
    if (this.eventBuffer.length === 0) {
      return {
        success: true,
        eventsCollected: 0,
        errors: [],
        metadata: {
          sessionId: this.sessionId,
          collectionTimestamp: new Date(),
          privacyLevel: this.config.privacyLevel
        }
      };
    }

    return await this.processBatch();
  }

  /**
   * Stop telemetry collection
   */
  stopCollection(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = undefined;
    }
    this.clearEventBuffer();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<TelemetryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (!this.config.enabled) {
      this.stopCollection();
    } else if (!this.batchTimer) {
      this.startBatchTimer();
    }
  }

  /**
   * Get current session statistics
   */
  getSessionStats(): { sessionId: string; eventsBuffered: number; userId?: string } {
    return {
      sessionId: this.sessionId,
      eventsBuffered: this.eventBuffer.length,
      userId: this.userId
    };
  }

  /**
   * Add event to buffer
   */
  private addEvent(event: VSCodeTelemetryEvent): void {
    if (!this.config.enabled) return;

    this.eventBuffer.push(event);

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.config.batchSize) {
      this.processBatch();
    }
  }

  /**
   * Check if data collection is allowed for specific type
   */
  private canCollectData(dataType: keyof PrivacyConsent['dataTypes']): boolean {
    if (!this.config.enabled) return false;
    if (!this.consent?.consentGiven) return false;
    return this.consent.dataTypes[dataType];
  }

  /**
   * Sanitize file name based on privacy level
   */
  private sanitizeFileName(fileName?: string): string | undefined {
    if (!fileName) return undefined;

    switch (this.config.privacyLevel) {
      case PrivacyLevel.PRIVATE:
        return undefined; // Don't collect file names
      case PrivacyLevel.TEAM:
        // Remove absolute paths, keep relative paths
        return fileName.replace(/^.*[\\\/]/, '');
      case PrivacyLevel.PUBLIC:
        return fileName;
      default:
        return undefined;
    }
  }

  /**
   * Start batch processing timer
   */
  private startBatchTimer(): void {
    if (this.batchTimer) return;

    this.batchTimer = setInterval(async () => {
      if (this.eventBuffer.length > 0) {
        await this.processBatch();
      }
    }, this.config.batchIntervalMs);
  }

  /**
   * Process and send batch of events
   */
  private async processBatch(): Promise<TelemetryCollectionResult> {
    if (this.eventBuffer.length === 0) {
      return {
        success: true,
        eventsCollected: 0,
        errors: [],
        metadata: {
          sessionId: this.sessionId,
          collectionTimestamp: new Date(),
          privacyLevel: this.config.privacyLevel
        }
      };
    }

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    const batch: TelemetryBatch = {
      batchId: uuidv4(),
      userId: this.userId || 'anonymous',
      sessionId: this.sessionId,
      events,
      timestamp: new Date(),
      compressed: this.config.compressionEnabled,
      privacyLevel: this.config.privacyLevel
    };

    try {
      // Validate events before sending
      const validEvents = [];
      const errors = [];

      for (const event of events) {
        try {
          const telemetryEvent = {
            id: uuidv4(),
            userId: event.userId || 'anonymous',
            sessionId: event.sessionId,
            eventType: event.type,
            timestamp: event.timestamp,
            data: event.data,
            privacyLevel: this.config.privacyLevel
          };

          validateIDETelemetry(telemetryEvent);
          validEvents.push(event);
        } catch (validationError) {
          errors.push(`Validation failed: ${validationError}`);
        }
      }

      // Send batch to ingestion endpoint
      await this.sendBatch(batch);

      return {
        success: true,
        eventsCollected: events.length, // Return total events processed, not just valid ones
        errors,
        metadata: {
          sessionId: this.sessionId,
          collectionTimestamp: new Date(),
          privacyLevel: this.config.privacyLevel
        }
      };

    } catch (error) {
      // Re-add events to buffer for retry
      this.eventBuffer.unshift(...events);
      
      return {
        success: false,
        eventsCollected: 0,
        errors: [`Batch processing failed: ${error}`],
        metadata: {
          sessionId: this.sessionId,
          collectionTimestamp: new Date(),
          privacyLevel: this.config.privacyLevel
        }
      };
    }
  }

  /**
   * Send batch to ingestion service
   */
  private async sendBatch(batch: TelemetryBatch): Promise<void> {
    // This would typically send to the data ingestion service
    // For now, we'll just log it
    console.log('Sending telemetry batch:', {
      batchId: batch.batchId,
      eventCount: batch.events.length,
      userId: batch.userId,
      sessionId: batch.sessionId,
      privacyLevel: batch.privacyLevel
    });

    // In a real implementation, this would make an HTTP request:
    // await axios.post(this.config.endpoint, batch, {
    //   headers: {
    //     'Authorization': `Bearer ${this.config.apiKey}`,
    //     'Content-Type': 'application/json'
    //   }
    // });
  }

  /**
   * Clear event buffer
   */
  private clearEventBuffer(): void {
    this.eventBuffer = [];
  }
}