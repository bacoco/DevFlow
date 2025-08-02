import * as vscode from 'vscode';
import axios from 'axios';

export interface ProductivityInsight {
    id: string;
    type: 'achievement' | 'warning' | 'suggestion' | 'milestone';
    priority: 'high' | 'medium' | 'low';
    title: string;
    message: string;
    actionable: boolean;
    actions?: InsightAction[];
    timestamp: Date;
    context?: {
        metric?: string;
        value?: number;
        threshold?: number;
        trend?: 'improving' | 'declining' | 'stable';
    };
}

export interface InsightAction {
    id: string;
    label: string;
    command?: string;
    args?: any[];
    url?: string;
}

export class InsightNotificationManager {
    private context: vscode.ExtensionContext;
    private lastNotificationCheck: Date;
    private checkInterval?: NodeJS.Timeout;
    private shownInsights: Set<string> = new Set();

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.lastNotificationCheck = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
        this.loadShownInsights();
        this.startPeriodicCheck();
    }

    /**
     * Start periodic checking for new insights
     */
    public startPeriodicCheck(): void {
        // Check for insights every 30 minutes
        this.checkInterval = setInterval(() => {
            this.checkForNewInsights();
        }, 30 * 60 * 1000);

        // Initial check
        setTimeout(() => this.checkForNewInsights(), 5000);
    }

    /**
     * Check for new productivity insights
     */
    public async checkForNewInsights(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('devflow.telemetry');
            const endpoint = config.get<string>('endpoint', 'http://localhost:3001');
            const userId = this.context.globalState.get<string>('devflow.userId', 'anonymous');

            const response = await axios.get(`${endpoint}/insights/${userId}`, {
                params: {
                    since: this.lastNotificationCheck.toISOString()
                },
                timeout: 5000
            });

            const insights: ProductivityInsight[] = response.data;
            
            for (const insight of insights) {
                if (!this.shownInsights.has(insight.id)) {
                    await this.showInsightNotification(insight);
                    this.shownInsights.add(insight.id);
                }
            }

            this.lastNotificationCheck = new Date();
            await this.saveShownInsights();

        } catch (error) {
            console.error('Failed to fetch productivity insights:', error);
            // Show mock insights for development
            if (process.env.NODE_ENV === 'development') {
                await this.showMockInsights();
            }
        }
    }

    /**
     * Show insight notification to user
     */
    private async showInsightNotification(insight: ProductivityInsight): Promise<void> {
        const actions = insight.actions?.map(action => action.label) || [];
        
        let result: string | undefined;

        switch (insight.type) {
            case 'achievement':
                result = await vscode.window.showInformationMessage(
                    `🎉 ${insight.title}`,
                    { detail: insight.message },
                    ...actions
                );
                break;
            case 'warning':
                result = await vscode.window.showWarningMessage(
                    `⚠️ ${insight.title}`,
                    { detail: insight.message },
                    ...actions
                );
                break;
            case 'suggestion':
                result = await vscode.window.showInformationMessage(
                    `💡 ${insight.title}`,
                    { detail: insight.message },
                    ...actions
                );
                break;
            case 'milestone':
                result = await vscode.window.showInformationMessage(
                    `🏆 ${insight.title}`,
                    { detail: insight.message },
                    ...actions
                );
                break;
        }

        if (result && insight.actions) {
            const selectedAction = insight.actions.find(action => action.label === result);
            if (selectedAction) {
                await this.executeInsightAction(selectedAction);
            }
        }
    }

    /**
     * Execute an insight action
     */
    private async executeInsightAction(action: InsightAction): Promise<void> {
        try {
            if (action.command) {
                await vscode.commands.executeCommand(action.command, ...(action.args || []));
            } else if (action.url) {
                await vscode.env.openExternal(vscode.Uri.parse(action.url));
            }
        } catch (error) {
            console.error('Failed to execute insight action:', error);
            vscode.window.showErrorMessage(`Failed to execute action: ${action.label}`);
        }
    }

    /**
     * Show context-aware recommendations based on current activity
     */
    public async showContextualRecommendation(): Promise<void> {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) return;

        const document = activeEditor.document;
        const fileName = document.fileName;
        const fileExtension = fileName.split('.').pop()?.toLowerCase();
        const lineCount = document.lineCount;
        const wordCount = document.getText().split(/\s+/).length;

        // Generate context-aware recommendations
        const recommendations = this.generateContextualRecommendations(
            fileExtension || '',
            lineCount,
            wordCount
        );

        for (const recommendation of recommendations) {
            if (!this.shownInsights.has(recommendation.id)) {
                await this.showInsightNotification(recommendation);
                this.shownInsights.add(recommendation.id);
            }
        }
    }

    /**
     * Generate contextual recommendations based on current file
     */
    private generateContextualRecommendations(
        fileExtension: string,
        lineCount: number,
        wordCount: number
    ): ProductivityInsight[] {
        const recommendations: ProductivityInsight[] = [];

        // Large file recommendation
        if (lineCount > 500) {
            recommendations.push({
                id: `large_file_${Date.now()}`,
                type: 'suggestion',
                priority: 'medium',
                title: 'Large File Detected',
                message: `This file has ${lineCount} lines. Consider breaking it into smaller modules for better maintainability.`,
                actionable: true,
                actions: [
                    {
                        id: 'refactor_guide',
                        label: 'Refactoring Guide',
                        url: 'https://devflow.ai/guides/refactoring'
                    }
                ],
                timestamp: new Date()
            });
        }

        // Test file recommendations
        if (fileExtension.includes('test') || fileExtension.includes('spec')) {
            recommendations.push({
                id: `test_file_${Date.now()}`,
                type: 'suggestion',
                priority: 'low',
                title: 'Test File Best Practices',
                message: 'Consider adding descriptive test names and grouping related tests.',
                actionable: true,
                actions: [
                    {
                        id: 'run_tests',
                        label: 'Run Tests',
                        command: 'workbench.action.tasks.test'
                    }
                ],
                timestamp: new Date()
            });
        }

        // Documentation recommendations
        if (['md', 'txt', 'rst'].includes(fileExtension)) {
            recommendations.push({
                id: `docs_${Date.now()}`,
                type: 'suggestion',
                priority: 'low',
                title: 'Documentation Enhancement',
                message: 'Great work on documentation! Consider adding code examples or diagrams.',
                actionable: false,
                timestamp: new Date()
            });
        }

        return recommendations;
    }

    /**
     * Show mock insights for development
     */
    private async showMockInsights(): Promise<void> {
        const mockInsights: ProductivityInsight[] = [
            {
                id: 'mock_achievement_1',
                type: 'achievement',
                priority: 'high',
                title: 'Focus Streak!',
                message: 'You\'ve maintained focus for 2 hours straight. Great job!',
                actionable: false,
                timestamp: new Date()
            },
            {
                id: 'mock_suggestion_1',
                type: 'suggestion',
                priority: 'medium',
                title: 'Break Reminder',
                message: 'You\'ve been coding for 90 minutes. Consider taking a short break.',
                actionable: true,
                actions: [
                    {
                        id: 'take_break',
                        label: 'Set Break Timer',
                        command: 'devflow.setBreakTimer'
                    }
                ],
                timestamp: new Date()
            }
        ];

        for (const insight of mockInsights) {
            if (!this.shownInsights.has(insight.id)) {
                await this.showInsightNotification(insight);
                this.shownInsights.add(insight.id);
            }
        }
    }

    /**
     * Load previously shown insights from storage
     */
    private loadShownInsights(): void {
        const stored = this.context.globalState.get<string[]>('devflow.shownInsights', []);
        this.shownInsights = new Set(stored);
    }

    /**
     * Save shown insights to storage
     */
    private async saveShownInsights(): Promise<void> {
        const insightsArray = Array.from(this.shownInsights);
        // Keep only the last 100 insights to prevent storage bloat
        const recentInsights = insightsArray.slice(-100);
        await this.context.globalState.update('devflow.shownInsights', recentInsights);
        this.shownInsights = new Set(recentInsights);
    }

    /**
     * Clear all shown insights (for testing)
     */
    public async clearShownInsights(): Promise<void> {
        this.shownInsights.clear();
        await this.context.globalState.update('devflow.shownInsights', []);
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
    }
}