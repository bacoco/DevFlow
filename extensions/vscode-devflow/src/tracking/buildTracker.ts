import * as vscode from 'vscode';
import { TelemetryManager } from '../telemetry/telemetryManager';

export class BuildTracker {
    private telemetryManager: TelemetryManager;
    private disposables: vscode.Disposable[] = [];

    constructor(telemetryManager: TelemetryManager) {
        this.telemetryManager = telemetryManager;
    }

    start(): void {
        // Track debug sessions
        this.disposables.push(
            vscode.debug.onDidStartDebugSession(session => {
                this.telemetryManager.collectDebugSession(session.id, 'start');
            })
        );

        this.disposables.push(
            vscode.debug.onDidTerminateDebugSession(session => {
                this.telemetryManager.collectDebugSession(session.id, 'stop');
            })
        );

        // Track breakpoint changes
        this.disposables.push(
            vscode.debug.onDidChangeBreakpoints(event => {
                if (event.added.length > 0 || event.removed.length > 0 || event.changed.length > 0) {
                    // Use a generic session ID for breakpoint events
                    this.telemetryManager.collectDebugSession('breakpoint_change', 'breakpoint');
                }
            })
        );

        // Track task execution (builds, tests, etc.)
        this.disposables.push(
            vscode.tasks.onDidStartTask(event => {
                this.handleTaskStart(event.execution.task);
            })
        );

        this.disposables.push(
            vscode.tasks.onDidEndTask(event => {
                this.handleTaskEnd(event.execution.task, event.exitCode);
            })
        );

        // Track diagnostic changes (errors/warnings)
        this.disposables.push(
            vscode.languages.onDidChangeDiagnostics(event => {
                this.handleDiagnosticChanges(event);
            })
        );
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }

    private handleTaskStart(task: vscode.Task): void {
        // Track task starts but don't send telemetry yet
        // We'll wait for the task to complete to get the result
    }

    private handleTaskEnd(task: vscode.Task, exitCode?: number): void {
        const taskType = this.getTaskType(task);
        
        if (taskType === 'build') {
            const buildResult = exitCode === 0 ? 'success' : 'failure';
            this.telemetryManager.collectBuildEvent(buildResult);
        } else if (taskType === 'test') {
            // For test tasks, we'll try to parse the output for results
            // This is a simplified implementation
            const testResults = this.parseTestResults(task);
            if (testResults) {
                this.telemetryManager.collectTestRun(testResults);
            }
        }
    }

    private handleDiagnosticChanges(event: vscode.DiagnosticChangeEvent): void {
        // Count errors and warnings across all changed files
        let errorCount = 0;
        let warningCount = 0;

        event.uris.forEach(uri => {
            const diagnostics = vscode.languages.getDiagnostics(uri);
            diagnostics.forEach(diagnostic => {
                if (diagnostic.severity === vscode.DiagnosticSeverity.Error) {
                    errorCount++;
                } else if (diagnostic.severity === vscode.DiagnosticSeverity.Warning) {
                    warningCount++;
                }
            });
        });

        // Only send telemetry if there are errors or warnings
        if (errorCount > 0 || warningCount > 0) {
            this.telemetryManager.collectBuildEvent('failure', errorCount, warningCount);
        }
    }

    private getTaskType(task: vscode.Task): 'build' | 'test' | 'other' {
        const taskName = task.name.toLowerCase();
        const taskGroup = task.group;

        if (taskGroup === vscode.TaskGroup.Build || taskName.includes('build') || taskName.includes('compile')) {
            return 'build';
        } else if (taskGroup === vscode.TaskGroup.Test || taskName.includes('test') || taskName.includes('spec')) {
            return 'test';
        }

        return 'other';
    }

    private parseTestResults(task: vscode.Task): { passed: number; failed: number; skipped: number } | null {
        // This is a simplified implementation
        // In a real implementation, you would parse the task output or integrate with specific test frameworks
        
        // For now, return a placeholder result
        return {
            passed: 0,
            failed: 0,
            skipped: 0
        };
    }
}