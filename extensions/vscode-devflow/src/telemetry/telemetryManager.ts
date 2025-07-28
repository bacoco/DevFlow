import * as vscode from 'vscode';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { PrivacyManager } from '../privacy/privacyManager';

export interface TelemetryEvent {
    type: 'keystroke' | 'file_change' | 'focus' | 'debug' | 'build' | 'test_run';
    timestamp: Date;
    data: any;
    sessionId: string;
    userId?: string;
}

export interface TelemetryBatch {
    batchId: string;
    userId: string;
    sessionId: string;
    events: TelemetryEvent[];
    timestamp: Date;
    privacyLevel: string;
}

export class TelemetryManager {
    private context: vscode.ExtensionContext;
    private privacyManager: PrivacyManager;
    private sessionId: string;
    private eventBuffer: TelemetryEvent[] = [];
    private batchTimer?: NodeJS.Timeout;
    private config: any;

    constructor(context: vscode.ExtensionContext, privacyManager: PrivacyManager) {
        this.context = context;
        this.privacyManager = privacyManager;
        this.sessionId = uuidv4();
        this.updateConfiguration();
        this.startBatchTimer();
    }

    /**
     * Update configuration from VS Code settings
     */
    updateConfiguration(): void {
        this.config = {
            enabled: vscode.workspace.getConfiguration('devflow.telemetry').get<boolean>('enabled', true),
            privacyLevel: vscode.workspace.getConfiguration('devflow.telemetry').get<string>('privacyLevel', 'team'),
            endpoint: vscode.workspace.getConfiguration('devflow.telemetry').get<string>('endpoint', 'http://localhost:3001/telemetry'),
            batchSize: vscode.workspace.getConfiguration('devflow.telemetry').get<number>('batchSize', 50),
            batchInterval: vscode.workspace.getConfiguration('devflow.telemetry').get<number>('batchInterval', 30000)
        };

        // Restart batch timer with new interval
        if (this.batchTimer) {
            clearInterval(this.batchTimer);
            this.startBatchTimer();
        }
    }

    /**
     * Collect keystroke telemetry
     */
    collectKeystroke(fileName?: string, keystrokeCount: number = 1): void {
        if (!this.canCollectData('collectKeystrokes')) return;

        const event: TelemetryEvent = {
            type: 'keystroke',
            timestamp: new Date(),
            sessionId: this.sessionId,
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
    collectFileChange(fileName: string, changeType: 'created' | 'modified' | 'deleted'): void {
        if (!this.canCollectData('collectFileChanges')) return;

        const event: TelemetryEvent = {
            type: 'file_change',
            timestamp: new Date(),
            sessionId: this.sessionId,
            data: {
                fileName: this.sanitizeFileName(fileName),
                fileExtension: this.getFileExtension(fileName),
                changeType
            }
        };

        this.addEvent(event);
    }

    /**
     * Collect focus time telemetry
     */
    collectFocusTime(focusDurationMs: number, interruptionCount: number = 0): void {
        if (!this.canCollectData('collectFocusTime')) return;

        const event: TelemetryEvent = {
            type: 'focus',
            timestamp: new Date(),
            sessionId: this.sessionId,
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
    collectDebugSession(debugSessionId: string, action: 'start' | 'stop' | 'breakpoint'): void {
        if (!this.canCollectData('collectDebugging')) return;

        const event: TelemetryEvent = {
            type: 'debug',
            timestamp: new Date(),
            sessionId: this.sessionId,
            data: {
                debugSessionId,
                action
            }
        };

        this.addEvent(event);
    }

    /**
     * Collect build event telemetry
     */
    collectBuildEvent(buildResult: 'success' | 'failure' | 'cancelled', errorCount?: number, warningCount?: number): void {
        if (!this.canCollectData('collectBuildEvents')) return;

        const event: TelemetryEvent = {
            type: 'build',
            timestamp: new Date(),
            sessionId: this.sessionId,
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
        if (!this.canCollectData('collectTestEvents')) return;

        const event: TelemetryEvent = {
            type: 'test_run',
            timestamp: new Date(),
            sessionId: this.sessionId,
            data: {
                testResults
            }
        };

        this.addEvent(event);
    }

    /**
     * Manually flush events
     */
    async flush(): Promise<void> {
        if (this.eventBuffer.length > 0) {
            await this.processBatch();
        }
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        if (this.batchTimer) {
            clearInterval(this.batchTimer);
        }
        // Flush remaining events
        this.flush();
    }

    /**
     * Add event to buffer
     */
    private addEvent(event: TelemetryEvent): void {
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
    private canCollectData(settingKey: string): boolean {
        if (!this.config.enabled) return false;
        if (!this.privacyManager.hasConsent()) return false;
        
        return vscode.workspace.getConfiguration('devflow.privacy').get<boolean>(settingKey, true);
    }

    /**
     * Sanitize file name based on privacy level
     */
    private sanitizeFileName(fileName?: string): string | undefined {
        if (!fileName) return undefined;

        switch (this.config.privacyLevel) {
            case 'private':
                return undefined; // Don't collect file names
            case 'team':
                // Remove absolute paths, keep relative paths
                return fileName.replace(/^.*[\\\/]/, '');
            case 'public':
                return fileName;
            default:
                return undefined;
        }
    }

    /**
     * Get file extension from file name
     */
    private getFileExtension(fileName: string): string | undefined {
        const match = fileName.match(/\.([^.]+)$/);
        return match ? match[1] : undefined;
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
        }, this.config.batchInterval);
    }

    /**
     * Process and send batch of events
     */
    private async processBatch(): Promise<void> {
        if (this.eventBuffer.length === 0) return;

        const events = [...this.eventBuffer];
        this.eventBuffer = [];

        const batch: TelemetryBatch = {
            batchId: uuidv4(),
            userId: this.privacyManager.getUserId() || 'anonymous',
            sessionId: this.sessionId,
            events,
            timestamp: new Date(),
            privacyLevel: this.config.privacyLevel
        };

        try {
            await this.sendBatch(batch);
        } catch (error) {
            console.error('Failed to send telemetry batch:', error);
            // Re-add events to buffer for retry (with limit to prevent memory issues)
            if (this.eventBuffer.length < 1000) {
                this.eventBuffer.unshift(...events);
            }
        }
    }

    /**
     * Send batch to ingestion service
     */
    private async sendBatch(batch: TelemetryBatch): Promise<void> {
        try {
            await axios.post(this.config.endpoint, batch, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
        } catch (error) {
            // Log error but don't throw to avoid disrupting user experience
            console.error('Telemetry batch send failed:', error);
            throw error;
        }
    }
}