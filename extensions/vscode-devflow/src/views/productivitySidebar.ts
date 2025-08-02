import * as vscode from 'vscode';
import axios from 'axios';

export interface ProductivityMetrics {
    focusTime: {
        today: number;
        thisWeek: number;
        average: number;
    };
    codeQuality: {
        churnRate: number;
        complexityTrend: 'improving' | 'stable' | 'declining';
        reviewLagTime: number;
    };
    productivity: {
        commitsToday: number;
        linesChanged: number;
        flowScore: number;
        interruptionCount: number;
    };
    recommendations: Recommendation[];
}

export interface Recommendation {
    id: string;
    type: 'focus' | 'quality' | 'workflow' | 'break';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    actionable: boolean;
    action?: string;
}

export class ProductivitySidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'devflow.productivitySidebar';
    
    private _view?: vscode.WebviewView;
    private _context: vscode.ExtensionContext;
    private _metrics?: ProductivityMetrics;
    private _refreshTimer?: NodeJS.Timeout;

    constructor(context: vscode.ExtensionContext) {
        this._context = context;
        this.startMetricsRefresh();
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._context.extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'refresh':
                    await this.refreshMetrics();
                    break;
                case 'executeRecommendation':
                    await this.executeRecommendation(data.recommendationId);
                    break;
                case 'dismissRecommendation':
                    await this.dismissRecommendation(data.recommendationId);
                    break;
                case 'openDashboard':
                    vscode.commands.executeCommand('devflow.showDashboard');
                    break;
            }
        });

        // Initial load
        this.refreshMetrics();
    }

    public async refreshMetrics(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('devflow.telemetry');
            const endpoint = config.get<string>('endpoint', 'http://localhost:3001');
            const userId = this._context.globalState.get<string>('devflow.userId', 'anonymous');

            const response = await axios.get(`${endpoint}/metrics/productivity/${userId}`, {
                timeout: 5000
            });

            this._metrics = response.data;
            this.updateWebview();
        } catch (error) {
            console.error('Failed to fetch productivity metrics:', error);
            this._metrics = this.getMockMetrics(); // Fallback to mock data
            this.updateWebview();
        }
    }

    private updateWebview(): void {
        if (this._view && this._metrics) {
            this._view.webview.postMessage({
                type: 'updateMetrics',
                metrics: this._metrics
            });
        }
    }

    private async executeRecommendation(recommendationId: string): Promise<void> {
        const recommendation = this._metrics?.recommendations.find(r => r.id === recommendationId);
        if (!recommendation || !recommendation.actionable) return;

        switch (recommendation.type) {
            case 'break':
                vscode.window.showInformationMessage(
                    'Time for a break! You\'ve been coding for a while.',
                    'Take 5 minutes',
                    'Remind me later'
                ).then(selection => {
                    if (selection === 'Take 5 minutes') {
                        // Set a timer reminder
                        setTimeout(() => {
                            vscode.window.showInformationMessage('Break time is over! Ready to get back to coding?');
                        }, 5 * 60 * 1000);
                    }
                });
                break;
            case 'focus':
                vscode.window.showInformationMessage(
                    'Consider enabling Focus Mode to minimize distractions.',
                    'Enable Focus Mode'
                ).then(selection => {
                    if (selection === 'Enable Focus Mode') {
                        vscode.commands.executeCommand('workbench.action.toggleZenMode');
                    }
                });
                break;
            case 'quality':
                if (recommendation.action === 'run_tests') {
                    vscode.commands.executeCommand('workbench.action.tasks.runTask');
                } else if (recommendation.action === 'format_code') {
                    vscode.commands.executeCommand('editor.action.formatDocument');
                }
                break;
            case 'workflow':
                if (recommendation.action === 'commit_changes') {
                    vscode.commands.executeCommand('git.commit');
                }
                break;
        }

        // Mark recommendation as executed
        await this.dismissRecommendation(recommendationId);
    }

    private async dismissRecommendation(recommendationId: string): Promise<void> {
        if (this._metrics) {
            this._metrics.recommendations = this._metrics.recommendations.filter(r => r.id !== recommendationId);
            this.updateWebview();
        }
    }

    private startMetricsRefresh(): void {
        // Refresh metrics every 5 minutes
        this._refreshTimer = setInterval(() => {
            this.refreshMetrics();
        }, 5 * 60 * 1000);
    }

    private getMockMetrics(): ProductivityMetrics {
        return {
            focusTime: {
                today: 4.2,
                thisWeek: 28.5,
                average: 5.1
            },
            codeQuality: {
                churnRate: 0.15,
                complexityTrend: 'stable',
                reviewLagTime: 2.3
            },
            productivity: {
                commitsToday: 3,
                linesChanged: 247,
                flowScore: 0.78,
                interruptionCount: 12
            },
            recommendations: [
                {
                    id: 'rec_1',
                    type: 'focus',
                    priority: 'medium',
                    title: 'Minimize Distractions',
                    description: 'You\'ve had 12 interruptions today. Consider enabling Focus Mode.',
                    actionable: true,
                    action: 'enable_focus_mode'
                },
                {
                    id: 'rec_2',
                    type: 'break',
                    priority: 'high',
                    title: 'Take a Break',
                    description: 'You\'ve been coding for 2.5 hours straight. A short break can improve focus.',
                    actionable: true,
                    action: 'take_break'
                }
            ]
        };
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>DevFlow Productivity</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-sideBar-background);
                    margin: 0;
                    padding: 16px;
                    line-height: 1.4;
                }
                
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                
                .refresh-btn {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 4px 8px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                }
                
                .refresh-btn:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                
                .metric-section {
                    margin-bottom: 20px;
                }
                
                .metric-title {
                    font-weight: bold;
                    margin-bottom: 8px;
                    color: var(--vscode-textLink-foreground);
                }
                
                .metric-item {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 4px;
                    font-size: 13px;
                }
                
                .metric-value {
                    font-weight: 500;
                }
                
                .flow-score {
                    width: 100%;
                    height: 8px;
                    background: var(--vscode-progressBar-background);
                    border-radius: 4px;
                    margin: 4px 0;
                    overflow: hidden;
                }
                
                .flow-score-fill {
                    height: 100%;
                    background: var(--vscode-progressBar-background);
                    transition: width 0.3s ease;
                }
                
                .recommendations {
                    margin-top: 16px;
                }
                
                .recommendation {
                    background: var(--vscode-textBlockQuote-background);
                    border-left: 3px solid var(--vscode-textBlockQuote-border);
                    padding: 12px;
                    margin-bottom: 12px;
                    border-radius: 0 3px 3px 0;
                }
                
                .recommendation.high {
                    border-left-color: #f14c4c;
                }
                
                .recommendation.medium {
                    border-left-color: #ffcc02;
                }
                
                .recommendation.low {
                    border-left-color: #89d185;
                }
                
                .recommendation-title {
                    font-weight: bold;
                    margin-bottom: 4px;
                    font-size: 13px;
                }
                
                .recommendation-description {
                    font-size: 12px;
                    margin-bottom: 8px;
                    opacity: 0.9;
                }
                
                .recommendation-actions {
                    display: flex;
                    gap: 8px;
                }
                
                .recommendation-btn {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 4px 8px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 11px;
                }
                
                .recommendation-btn:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                
                .recommendation-btn.secondary {
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                }
                
                .dashboard-link {
                    text-align: center;
                    margin-top: 20px;
                    padding-top: 16px;
                    border-top: 1px solid var(--vscode-panel-border);
                }
                
                .dashboard-btn {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 16px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 13px;
                    width: 100%;
                }
                
                .dashboard-btn:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                
                .loading {
                    text-align: center;
                    opacity: 0.7;
                    font-style: italic;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h3>DevFlow Productivity</h3>
                <button class="refresh-btn" onclick="refresh()">↻</button>
            </div>
            
            <div id="content" class="loading">
                Loading metrics...
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                function refresh() {
                    document.getElementById('content').innerHTML = '<div class="loading">Refreshing...</div>';
                    vscode.postMessage({ type: 'refresh' });
                }
                
                function executeRecommendation(id) {
                    vscode.postMessage({ type: 'executeRecommendation', recommendationId: id });
                }
                
                function dismissRecommendation(id) {
                    vscode.postMessage({ type: 'dismissRecommendation', recommendationId: id });
                }
                
                function openDashboard() {
                    vscode.postMessage({ type: 'openDashboard' });
                }
                
                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.type === 'updateMetrics') {
                        updateMetricsDisplay(message.metrics);
                    }
                });
                
                function updateMetricsDisplay(metrics) {
                    const content = document.getElementById('content');
                    
                    const flowScoreColor = metrics.productivity.flowScore > 0.7 ? '#89d185' : 
                                          metrics.productivity.flowScore > 0.4 ? '#ffcc02' : '#f14c4c';
                    
                    content.innerHTML = \`
                        <div class="metric-section">
                            <div class="metric-title">Focus Time</div>
                            <div class="metric-item">
                                <span>Today:</span>
                                <span class="metric-value">\${metrics.focusTime.today.toFixed(1)}h</span>
                            </div>
                            <div class="metric-item">
                                <span>This Week:</span>
                                <span class="metric-value">\${metrics.focusTime.thisWeek.toFixed(1)}h</span>
                            </div>
                            <div class="metric-item">
                                <span>Average:</span>
                                <span class="metric-value">\${metrics.focusTime.average.toFixed(1)}h</span>
                            </div>
                        </div>
                        
                        <div class="metric-section">
                            <div class="metric-title">Code Quality</div>
                            <div class="metric-item">
                                <span>Churn Rate:</span>
                                <span class="metric-value">\${(metrics.codeQuality.churnRate * 100).toFixed(1)}%</span>
                            </div>
                            <div class="metric-item">
                                <span>Complexity:</span>
                                <span class="metric-value">\${metrics.codeQuality.complexityTrend}</span>
                            </div>
                            <div class="metric-item">
                                <span>Review Lag:</span>
                                <span class="metric-value">\${metrics.codeQuality.reviewLagTime.toFixed(1)}h</span>
                            </div>
                        </div>
                        
                        <div class="metric-section">
                            <div class="metric-title">Today's Activity</div>
                            <div class="metric-item">
                                <span>Commits:</span>
                                <span class="metric-value">\${metrics.productivity.commitsToday}</span>
                            </div>
                            <div class="metric-item">
                                <span>Lines Changed:</span>
                                <span class="metric-value">\${metrics.productivity.linesChanged}</span>
                            </div>
                            <div class="metric-item">
                                <span>Interruptions:</span>
                                <span class="metric-value">\${metrics.productivity.interruptionCount}</span>
                            </div>
                            <div class="metric-item">
                                <span>Flow Score:</span>
                                <span class="metric-value">\${(metrics.productivity.flowScore * 100).toFixed(0)}%</span>
                            </div>
                            <div class="flow-score">
                                <div class="flow-score-fill" style="width: \${metrics.productivity.flowScore * 100}%; background: \${flowScoreColor};"></div>
                            </div>
                        </div>
                        
                        \${metrics.recommendations.length > 0 ? \`
                            <div class="recommendations">
                                <div class="metric-title">Recommendations</div>
                                \${metrics.recommendations.map(rec => \`
                                    <div class="recommendation \${rec.priority}">
                                        <div class="recommendation-title">\${rec.title}</div>
                                        <div class="recommendation-description">\${rec.description}</div>
                                        \${rec.actionable ? \`
                                            <div class="recommendation-actions">
                                                <button class="recommendation-btn" onclick="executeRecommendation('\${rec.id}')">
                                                    Apply
                                                </button>
                                                <button class="recommendation-btn secondary" onclick="dismissRecommendation('\${rec.id}')">
                                                    Dismiss
                                                </button>
                                            </div>
                                        \` : ''}
                                    </div>
                                \`).join('')}
                            </div>
                        \` : ''}
                        
                        <div class="dashboard-link">
                            <button class="dashboard-btn" onclick="openDashboard()">
                                Open Full Dashboard
                            </button>
                        </div>
                    \`;
                }
            </script>
        </body>
        </html>`;
    }

    public dispose(): void {
        if (this._refreshTimer) {
            clearInterval(this._refreshTimer);
        }
    }
}