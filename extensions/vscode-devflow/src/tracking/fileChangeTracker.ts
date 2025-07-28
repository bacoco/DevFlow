import * as vscode from 'vscode';
import { TelemetryManager } from '../telemetry/telemetryManager';

export class FileChangeTracker {
    private telemetryManager: TelemetryManager;
    private disposables: vscode.Disposable[] = [];

    constructor(telemetryManager: TelemetryManager) {
        this.telemetryManager = telemetryManager;
    }

    start(): void {
        // Track file creation
        this.disposables.push(
            vscode.workspace.onDidCreateFiles(event => {
                event.files.forEach(file => {
                    this.telemetryManager.collectFileChange(file.fsPath, 'created');
                });
            })
        );

        // Track file deletion
        this.disposables.push(
            vscode.workspace.onDidDeleteFiles(event => {
                event.files.forEach(file => {
                    this.telemetryManager.collectFileChange(file.fsPath, 'deleted');
                });
            })
        );

        // Track file saves (modifications)
        this.disposables.push(
            vscode.workspace.onDidSaveTextDocument(document => {
                this.telemetryManager.collectFileChange(document.fileName, 'modified');
            })
        );

        // Track file renames
        this.disposables.push(
            vscode.workspace.onDidRenameFiles(event => {
                event.files.forEach(file => {
                    this.telemetryManager.collectFileChange(file.oldUri.fsPath, 'deleted');
                    this.telemetryManager.collectFileChange(file.newUri.fsPath, 'created');
                });
            })
        );
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}