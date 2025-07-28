import * as vscode from 'vscode';

export interface PrivacyConsent {
    userId: string;
    consentGiven: boolean;
    consentTimestamp: Date;
    dataTypes: {
        keystrokes: boolean;
        fileChanges: boolean;
        debugging: boolean;
        focusTime: boolean;
        buildEvents: boolean;
        testEvents: boolean;
    };
    retentionPeriodDays: number;
}

export class PrivacyManager {
    private context: vscode.ExtensionContext;
    private consent?: PrivacyConsent;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadConsent();
    }

    /**
     * Check if user has given consent
     */
    hasConsent(): boolean {
        return this.consent?.consentGiven ?? false;
    }

    /**
     * Get user ID
     */
    getUserId(): string | undefined {
        return this.consent?.userId;
    }

    /**
     * Get current consent settings
     */
    getConsent(): PrivacyConsent | undefined {
        return this.consent;
    }

    /**
     * Show privacy configuration dialog
     */
    async showPrivacyConfiguration(): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'devflowPrivacy',
            'DevFlow Privacy Settings',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this.getPrivacyConfigurationHtml();

        // Handle messages from webview
        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'saveConsent':
                    await this.saveConsent(message.consent);
                    panel.dispose();
                    vscode.window.showInformationMessage('Privacy settings saved successfully');
                    break;
                case 'getConsent':
                    panel.webview.postMessage({
                        command: 'consentData',
                        consent: this.consent
                    });
                    break;
            }
        });
    }

    /**
     * Request initial consent from user
     */
    async requestInitialConsent(): Promise<boolean> {
        const result = await vscode.window.showInformationMessage(
            'DevFlow Intelligence would like to collect anonymous telemetry data to improve your development experience. You can configure what data is collected in the privacy settings.',
            { modal: true },
            'Accept and Configure',
            'Accept Defaults',
            'Decline'
        );

        switch (result) {
            case 'Accept and Configure':
                await this.showPrivacyConfiguration();
                return this.hasConsent();
            case 'Accept Defaults':
                await this.saveDefaultConsent();
                return true;
            case 'Decline':
                await this.saveDeclinedConsent();
                return false;
            default:
                return false;
        }
    }

    /**
     * Load consent from storage
     */
    private loadConsent(): void {
        const storedConsent = this.context.globalState.get<PrivacyConsent>('devflow.privacy.consent');
        if (storedConsent) {
            this.consent = {
                ...storedConsent,
                consentTimestamp: new Date(storedConsent.consentTimestamp)
            };
        }
    }

    /**
     * Save consent to storage
     */
    private async saveConsent(consent: PrivacyConsent): Promise<void> {
        this.consent = consent;
        await this.context.globalState.update('devflow.privacy.consent', consent);
    }

    /**
     * Save default consent settings
     */
    private async saveDefaultConsent(): Promise<void> {
        const defaultConsent: PrivacyConsent = {
            userId: this.generateUserId(),
            consentGiven: true,
            consentTimestamp: new Date(),
            dataTypes: {
                keystrokes: true,
                fileChanges: true,
                debugging: true,
                focusTime: true,
                buildEvents: true,
                testEvents: true
            },
            retentionPeriodDays: 365
        };

        await this.saveConsent(defaultConsent);
    }

    /**
     * Save declined consent
     */
    private async saveDeclinedConsent(): Promise<void> {
        const declinedConsent: PrivacyConsent = {
            userId: this.generateUserId(),
            consentGiven: false,
            consentTimestamp: new Date(),
            dataTypes: {
                keystrokes: false,
                fileChanges: false,
                debugging: false,
                focusTime: false,
                buildEvents: false,
                testEvents: false
            },
            retentionPeriodDays: 0
        };

        await this.saveConsent(declinedConsent);
    }

    /**
     * Generate anonymous user ID
     */
    private generateUserId(): string {
        // Generate a random UUID-like string
        return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
    }

    /**
     * Get HTML for privacy configuration webview
     */
    private getPrivacyConfigurationHtml(): string {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>DevFlow Privacy Settings</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 20px;
                    line-height: 1.6;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                }
                .section {
                    margin-bottom: 30px;
                    padding: 20px;
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 5px;
                }
                .checkbox-group {
                    margin: 15px 0;
                }
                .checkbox-group label {
                    display: flex;
                    align-items: center;
                    margin-bottom: 10px;
                    cursor: pointer;
                }
                .checkbox-group input[type="checkbox"] {
                    margin-right: 10px;
                }
                .button-group {
                    text-align: center;
                    margin-top: 30px;
                }
                button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 10px 20px;
                    margin: 0 10px;
                    border-radius: 3px;
                    cursor: pointer;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .info {
                    background-color: var(--vscode-textBlockQuote-background);
                    border-left: 4px solid var(--vscode-textBlockQuote-border);
                    padding: 15px;
                    margin: 15px 0;
                }
                select, input[type="number"] {
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    padding: 5px;
                    border-radius: 3px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>DevFlow Privacy Settings</h1>
                
                <div class="info">
                    <strong>Your Privacy Matters:</strong> DevFlow Intelligence collects anonymous telemetry data to provide productivity insights. You have full control over what data is collected and how it's used.
                </div>

                <div class="section">
                    <h2>Consent</h2>
                    <label>
                        <input type="checkbox" id="consentGiven"> I consent to telemetry data collection
                    </label>
                </div>

                <div class="section">
                    <h2>Data Collection Types</h2>
                    <div class="checkbox-group">
                        <label>
                            <input type="checkbox" id="keystrokes"> Keystroke patterns (for focus time analysis)
                        </label>
                        <label>
                            <input type="checkbox" id="fileChanges"> File changes (for productivity tracking)
                        </label>
                        <label>
                            <input type="checkbox" id="debugging"> Debug sessions (for workflow analysis)
                        </label>
                        <label>
                            <input type="checkbox" id="focusTime"> Focus time tracking
                        </label>
                        <label>
                            <input type="checkbox" id="buildEvents"> Build events (success/failure)
                        </label>
                        <label>
                            <input type="checkbox" id="testEvents"> Test run results
                        </label>
                    </div>
                </div>

                <div class="section">
                    <h2>Data Retention</h2>
                    <label>
                        Retain data for: 
                        <select id="retentionPeriod">
                            <option value="30">30 days</option>
                            <option value="90">90 days</option>
                            <option value="180">180 days</option>
                            <option value="365" selected>1 year</option>
                            <option value="730">2 years</option>
                        </select>
                    </label>
                </div>

                <div class="button-group">
                    <button onclick="saveSettings()">Save Settings</button>
                    <button onclick="loadDefaults()">Load Defaults</button>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                
                // Request current consent data
                vscode.postMessage({ command: 'getConsent' });

                // Listen for messages from extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.command === 'consentData') {
                        loadConsentData(message.consent);
                    }
                });

                function loadConsentData(consent) {
                    if (consent) {
                        document.getElementById('consentGiven').checked = consent.consentGiven;
                        document.getElementById('keystrokes').checked = consent.dataTypes.keystrokes;
                        document.getElementById('fileChanges').checked = consent.dataTypes.fileChanges;
                        document.getElementById('debugging').checked = consent.dataTypes.debugging;
                        document.getElementById('focusTime').checked = consent.dataTypes.focusTime;
                        document.getElementById('buildEvents').checked = consent.dataTypes.buildEvents;
                        document.getElementById('testEvents').checked = consent.dataTypes.testEvents;
                        document.getElementById('retentionPeriod').value = consent.retentionPeriodDays.toString();
                    }
                }

                function saveSettings() {
                    const consent = {
                        userId: generateUserId(),
                        consentGiven: document.getElementById('consentGiven').checked,
                        consentTimestamp: new Date(),
                        dataTypes: {
                            keystrokes: document.getElementById('keystrokes').checked,
                            fileChanges: document.getElementById('fileChanges').checked,
                            debugging: document.getElementById('debugging').checked,
                            focusTime: document.getElementById('focusTime').checked,
                            buildEvents: document.getElementById('buildEvents').checked,
                            testEvents: document.getElementById('testEvents').checked
                        },
                        retentionPeriodDays: parseInt(document.getElementById('retentionPeriod').value)
                    };

                    vscode.postMessage({
                        command: 'saveConsent',
                        consent: consent
                    });
                }

                function loadDefaults() {
                    document.getElementById('consentGiven').checked = true;
                    document.getElementById('keystrokes').checked = true;
                    document.getElementById('fileChanges').checked = true;
                    document.getElementById('debugging').checked = true;
                    document.getElementById('focusTime').checked = true;
                    document.getElementById('buildEvents').checked = true;
                    document.getElementById('testEvents').checked = true;
                    document.getElementById('retentionPeriod').value = '365';
                }

                function generateUserId() {
                    return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
                }
            </script>
        </body>
        </html>
        `;
    }
}