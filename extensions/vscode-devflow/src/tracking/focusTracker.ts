import * as vscode from 'vscode';
import { TelemetryManager } from '../telemetry/telemetryManager';

export class FocusTracker {
    private telemetryManager: TelemetryManager;
    private disposables: vscode.Disposable[] = [];
    private focusStartTime?: Date;
    private interruptionCount = 0;
    private isWindowFocused = true;
    private keystrokeCount = 0;
    private keystrokeTimer?: NodeJS.Timeout;

    constructor(telemetryManager: TelemetryManager) {
        this.telemetryManager = telemetryManager;
    }

    start(): void {
        // Track window focus changes
        this.disposables.push(
            vscode.window.onDidChangeWindowState(state => {
                this.handleWindowStateChange(state.focused);
            })
        );

        // Track active editor changes (potential interruptions)
        this.disposables.push(
            vscode.window.onDidChangeActiveTextEditor(editor => {
                this.handleEditorChange(editor);
            })
        );

        // Track text document changes (keystroke activity)
        this.disposables.push(
            vscode.workspace.onDidChangeTextDocument(event => {
                this.handleTextChange(event);
            })
        );

        // Start focus session
        this.startFocusSession();
    }

    dispose(): void {
        this.endFocusSession();
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        
        if (this.keystrokeTimer) {
            clearTimeout(this.keystrokeTimer);
        }
    }

    private handleWindowStateChange(focused: boolean): void {
        if (focused !== this.isWindowFocused) {
            if (!focused) {
                // Window lost focus - potential interruption
                this.interruptionCount++;
                this.endFocusSession();
            } else {
                // Window gained focus - start new session
                this.startFocusSession();
            }
            this.isWindowFocused = focused;
        }
    }

    private handleEditorChange(editor: vscode.TextEditor | undefined): void {
        if (editor) {
            // Editor change might indicate task switching
            this.interruptionCount++;
        }
    }

    private handleTextChange(event: vscode.TextDocumentChangeEvent): void {
        if (event.contentChanges.length > 0) {
            this.keystrokeCount += event.contentChanges.reduce((sum, change) => sum + change.text.length, 0);
            
            // Collect keystroke telemetry
            const fileName = event.document.fileName;
            this.telemetryManager.collectKeystroke(fileName, event.contentChanges.length);
            
            // Debounce keystroke counting
            if (this.keystrokeTimer) {
                clearTimeout(this.keystrokeTimer);
            }
            
            this.keystrokeTimer = setTimeout(() => {
                this.keystrokeCount = 0;
            }, 5000); // Reset count after 5 seconds of inactivity
        }
    }

    private startFocusSession(): void {
        this.focusStartTime = new Date();
        this.interruptionCount = 0;
    }

    private endFocusSession(): void {
        if (this.focusStartTime) {
            const focusDuration = Date.now() - this.focusStartTime.getTime();
            
            // Only record sessions longer than 30 seconds
            if (focusDuration > 30000) {
                this.telemetryManager.collectFocusTime(focusDuration, this.interruptionCount);
            }
            
            this.focusStartTime = undefined;
        }
    }
}