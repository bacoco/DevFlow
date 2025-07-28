import * as vscode from 'vscode';
import { TelemetryManager } from './telemetry/telemetryManager';
import { PrivacyManager } from './privacy/privacyManager';
import { FocusTracker } from './tracking/focusTracker';
import { FileChangeTracker } from './tracking/fileChangeTracker';
import { BuildTracker } from './tracking/buildTracker';

let telemetryManager: TelemetryManager;
let privacyManager: PrivacyManager;
let focusTracker: FocusTracker;
let fileChangeTracker: FileChangeTracker;
let buildTracker: BuildTracker;

export function activate(context: vscode.ExtensionContext) {
    console.log('DevFlow Intelligence extension is now active');

    // Initialize managers
    privacyManager = new PrivacyManager(context);
    telemetryManager = new TelemetryManager(context, privacyManager);
    
    // Initialize trackers
    focusTracker = new FocusTracker(telemetryManager);
    fileChangeTracker = new FileChangeTracker(telemetryManager);
    buildTracker = new BuildTracker(telemetryManager);

    // Register commands
    registerCommands(context);

    // Start tracking
    startTracking(context);

    // Show welcome message on first activation
    showWelcomeMessage(context);
}

export function deactivate() {
    console.log('DevFlow Intelligence extension is being deactivated');
    
    // Clean up resources
    if (telemetryManager) {
        telemetryManager.dispose();
    }
    if (focusTracker) {
        focusTracker.dispose();
    }
    if (fileChangeTracker) {
        fileChangeTracker.dispose();
    }
    if (buildTracker) {
        buildTracker.dispose();
    }
}

function registerCommands(context: vscode.ExtensionContext) {
    // Show dashboard command
    const showDashboardCommand = vscode.commands.registerCommand('devflow.showDashboard', () => {
        vscode.window.showInformationMessage('Opening DevFlow Dashboard...');
        // In a real implementation, this would open a webview or external dashboard
        vscode.env.openExternal(vscode.Uri.parse('http://localhost:3000/dashboard'));
    });

    // Configure privacy command
    const configurePrivacyCommand = vscode.commands.registerCommand('devflow.configurePrivacy', async () => {
        await privacyManager.showPrivacyConfiguration();
    });

    // Toggle telemetry command
    const toggleTelemetryCommand = vscode.commands.registerCommand('devflow.toggleTelemetry', async () => {
        const config = vscode.workspace.getConfiguration('devflow.telemetry');
        const currentEnabled = config.get<boolean>('enabled', true);
        
        await config.update('enabled', !currentEnabled, vscode.ConfigurationTarget.Global);
        
        const status = !currentEnabled ? 'enabled' : 'disabled';
        vscode.window.showInformationMessage(`DevFlow telemetry ${status}`);
        
        // Update telemetry manager
        telemetryManager.updateConfiguration();
    });

    context.subscriptions.push(
        showDashboardCommand,
        configurePrivacyCommand,
        toggleTelemetryCommand
    );
}

function startTracking(context: vscode.ExtensionContext) {
    // Start all trackers
    focusTracker.start();
    fileChangeTracker.start();
    buildTracker.start();

    // Listen for configuration changes
    const configChangeListener = vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('devflow')) {
            telemetryManager.updateConfiguration();
        }
    });

    context.subscriptions.push(configChangeListener);
}

async function showWelcomeMessage(context: vscode.ExtensionContext) {
    const hasShownWelcome = context.globalState.get<boolean>('devflow.hasShownWelcome', false);
    
    if (!hasShownWelcome) {
        const result = await vscode.window.showInformationMessage(
            'Welcome to DevFlow Intelligence! This extension collects anonymous productivity telemetry to help improve your development workflow.',
            'Configure Privacy',
            'Learn More',
            'Dismiss'
        );

        switch (result) {
            case 'Configure Privacy':
                await vscode.commands.executeCommand('devflow.configurePrivacy');
                break;
            case 'Learn More':
                vscode.env.openExternal(vscode.Uri.parse('https://devflow.ai/privacy'));
                break;
        }

        await context.globalState.update('devflow.hasShownWelcome', true);
    }
}