import { EventEmitter } from 'events';

export interface Command {
  id: string;
  name: string;
  description: string;
  category: string;
  action: string;
  parameters?: Record<string, any>;
  shortcuts: KeyboardShortcut[];
  voicePatterns: string[];
  gesturePatterns: string[];
  contextRelevance: Record<string, number>; // context -> relevance score
  usageCount: number;
  lastUsed: Date | null;
  tags: string[];
  icon?: string;
}

export interface KeyboardShortcut {
  key: string;
  modifiers: string[]; // ctrl, shift, alt, meta
  description: string;
}

export interface CommandSuggestion {
  command: Command;
  relevanceScore: number;
  reason: string;
  suggestedShortcut?: KeyboardShortcut;
  suggestedVoicePattern?: string;
  suggestedGesture?: string;
}

export interface UserContext {
  currentPage: string;
  selectedItems: string[];
  recentActions: string[];
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  workingHours: boolean;
  focusLevel: number; // 0-100
  collaborationState: 'solo' | 'collaborative';
  deviceType: 'desktop' | 'mobile' | 'tablet';
  inputMethod: 'keyboard' | 'touch' | 'voice' | 'gesture';
}

export interface LearningData {
  commandId: string;
  context: UserContext;
  timestamp: Date;
  success: boolean;
  executionTime: number;
}

export class CommandSuggestionEngine extends EventEmitter {
  private commands: Map<string, Command> = new Map();
  private userContext: UserContext;
  private learningData: LearningData[] = [];
  private shortcutMap: Map<string, string> = new Map(); // shortcut -> commandId
  private contextPatterns: Map<string, number> = new Map(); // pattern -> frequency
  
  constructor() {
    super();
    
    this.userContext = {
      currentPage: 'dashboard',
      selectedItems: [],
      recentActions: [],
      timeOfDay: this.getTimeOfDay(),
      workingHours: this.isWorkingHours(),
      focusLevel: 70,
      collaborationState: 'solo',
      deviceType: this.detectDeviceType(),
      inputMethod: 'keyboard'
    };
    
    this.registerDefaultCommands();
    this.setupKeyboardListeners();
    this.loadLearningData();
  }

  private registerDefaultCommands(): void {
    const defaultCommands: Command[] = [
      // Navigation commands
      {
        id: 'nav-dashboard',
        name: 'Go to Dashboard',
        description: 'Navigate to the main dashboard',
        category: 'navigation',
        action: 'navigate',
        parameters: { page: 'dashboard' },
        shortcuts: [{ key: 'd', modifiers: ['ctrl', 'shift'], description: 'Ctrl+Shift+D' }],
        voicePatterns: ['go to dashboard', 'show dashboard'],
        gesturePatterns: ['swipe_right'],
        contextRelevance: { 'tasks': 0.8, 'analytics': 0.6, 'settings': 0.9 },
        usageCount: 0,
        lastUsed: null,
        tags: ['navigation', 'dashboard'],
        icon: 'home'
      },
      {
        id: 'nav-tasks',
        name: 'Go to Tasks',
        description: 'Navigate to task management',
        category: 'navigation',
        action: 'navigate',
        parameters: { page: 'tasks' },
        shortcuts: [{ key: 't', modifiers: ['ctrl', 'shift'], description: 'Ctrl+Shift+T' }],
        voicePatterns: ['go to tasks', 'show tasks'],
        gesturePatterns: ['swipe_left'],
        contextRelevance: { 'dashboard': 0.9, 'analytics': 0.7 },
        usageCount: 0,
        lastUsed: null,
        tags: ['navigation', 'tasks'],
        icon: 'list'
      },
      
      // Task management commands
      {
        id: 'create-task',
        name: 'Create New Task',
        description: 'Create a new task',
        category: 'task-management',
        action: 'create_task',
        shortcuts: [{ key: 'n', modifiers: ['ctrl'], description: 'Ctrl+N' }],
        voicePatterns: ['create task', 'new task', 'add task'],
        gesturePatterns: ['tap_plus'],
        contextRelevance: { 'tasks': 1.0, 'dashboard': 0.8 },
        usageCount: 0,
        lastUsed: null,
        tags: ['task', 'create'],
        icon: 'plus'
      },
      {
        id: 'complete-task',
        name: 'Complete Task',
        description: 'Mark selected task as complete',
        category: 'task-management',
        action: 'complete_task',
        shortcuts: [{ key: 'Enter', modifiers: ['ctrl'], description: 'Ctrl+Enter' }],
        voicePatterns: ['complete task', 'mark done', 'finish task'],
        gesturePatterns: ['thumbs_up', 'check_gesture'],
        contextRelevance: { 'tasks': 1.0 },
        usageCount: 0,
        lastUsed: null,
        tags: ['task', 'complete'],
        icon: 'check'
      },
      {
        id: 'delete-task',
        name: 'Delete Task',
        description: 'Delete selected task',
        category: 'task-management',
        action: 'delete_task',
        shortcuts: [{ key: 'Delete', modifiers: [], description: 'Delete' }],
        voicePatterns: ['delete task', 'remove task'],
        gesturePatterns: ['zigzag', 'swipe_down_fast'],
        contextRelevance: { 'tasks': 0.9 },
        usageCount: 0,
        lastUsed: null,
        tags: ['task', 'delete'],
        icon: 'trash'
      },
      
      // Search and filter commands
      {
        id: 'search',
        name: 'Search',
        description: 'Open search interface',
        category: 'search',
        action: 'search',
        shortcuts: [{ key: 'f', modifiers: ['ctrl'], description: 'Ctrl+F' }],
        voicePatterns: ['search', 'find'],
        gesturePatterns: ['circle'],
        contextRelevance: { 'tasks': 0.9, 'dashboard': 0.8, 'analytics': 0.7 },
        usageCount: 0,
        lastUsed: null,
        tags: ['search', 'find'],
        icon: 'search'
      },
      {
        id: 'filter-priority',
        name: 'Filter by Priority',
        description: 'Filter items by priority level',
        category: 'filter',
        action: 'filter',
        parameters: { type: 'priority' },
        shortcuts: [{ key: 'p', modifiers: ['ctrl', 'shift'], description: 'Ctrl+Shift+P' }],
        voicePatterns: ['filter by priority', 'show priority'],
        gesturePatterns: ['long_press'],
        contextRelevance: { 'tasks': 1.0, 'dashboard': 0.6 },
        usageCount: 0,
        lastUsed: null,
        tags: ['filter', 'priority'],
        icon: 'filter'
      },
      
      // View commands
      {
        id: 'toggle-kanban',
        name: 'Kanban View',
        description: 'Switch to Kanban board view',
        category: 'view',
        action: 'toggle_view',
        parameters: { viewType: 'kanban' },
        shortcuts: [{ key: 'k', modifiers: ['ctrl'], description: 'Ctrl+K' }],
        voicePatterns: ['kanban view', 'board view'],
        gesturePatterns: ['swipe_up'],
        contextRelevance: { 'tasks': 1.0 },
        usageCount: 0,
        lastUsed: null,
        tags: ['view', 'kanban'],
        icon: 'grid'
      },
      {
        id: 'toggle-list',
        name: 'List View',
        description: 'Switch to list view',
        category: 'view',
        action: 'toggle_view',
        parameters: { viewType: 'list' },
        shortcuts: [{ key: 'l', modifiers: ['ctrl'], description: 'Ctrl+L' }],
        voicePatterns: ['list view', 'table view'],
        gesturePatterns: ['swipe_down'],
        contextRelevance: { 'tasks': 1.0 },
        usageCount: 0,
        lastUsed: null,
        tags: ['view', 'list'],
        icon: 'list'
      },
      
      // System commands
      {
        id: 'save',
        name: 'Save',
        description: 'Save current changes',
        category: 'system',
        action: 'save',
        shortcuts: [{ key: 's', modifiers: ['ctrl'], description: 'Ctrl+S' }],
        voicePatterns: ['save', 'save changes'],
        gesturePatterns: ['fist'],
        contextRelevance: { 'tasks': 0.8, 'settings': 1.0 },
        usageCount: 0,
        lastUsed: null,
        tags: ['system', 'save'],
        icon: 'save'
      },
      {
        id: 'undo',
        name: 'Undo',
        description: 'Undo last action',
        category: 'system',
        action: 'undo',
        shortcuts: [{ key: 'z', modifiers: ['ctrl'], description: 'Ctrl+Z' }],
        voicePatterns: ['undo', 'undo last action'],
        gesturePatterns: ['mouse_line_left'],
        contextRelevance: { 'tasks': 0.9, 'dashboard': 0.7 },
        usageCount: 0,
        lastUsed: null,
        tags: ['system', 'undo'],
        icon: 'undo'
      },
      {
        id: 'redo',
        name: 'Redo',
        description: 'Redo last undone action',
        category: 'system',
        action: 'redo',
        shortcuts: [{ key: 'y', modifiers: ['ctrl'], description: 'Ctrl+Y' }],
        voicePatterns: ['redo', 'redo action'],
        gesturePatterns: ['mouse_line_right'],
        contextRelevance: { 'tasks': 0.9, 'dashboard': 0.7 },
        usageCount: 0,
        lastUsed: null,
        tags: ['system', 'redo'],
        icon: 'redo'
      },
      
      // Help and settings
      {
        id: 'help',
        name: 'Show Help',
        description: 'Show help and documentation',
        category: 'help',
        action: 'show_help',
        shortcuts: [{ key: 'F1', modifiers: [], description: 'F1' }],
        voicePatterns: ['help', 'show help', 'how to'],
        gesturePatterns: ['question_mark'],
        contextRelevance: { 'dashboard': 0.6, 'tasks': 0.6, 'settings': 0.8 },
        usageCount: 0,
        lastUsed: null,
        tags: ['help', 'documentation'],
        icon: 'help'
      },
      {
        id: 'settings',
        name: 'Open Settings',
        description: 'Open application settings',
        category: 'system',
        action: 'open_settings',
        shortcuts: [{ key: ',', modifiers: ['ctrl'], description: 'Ctrl+,' }],
        voicePatterns: ['settings', 'preferences', 'options'],
        gesturePatterns: ['gear_gesture'],
        contextRelevance: { 'dashboard': 0.7, 'tasks': 0.5 },
        usageCount: 0,
        lastUsed: null,
        tags: ['system', 'settings'],
        icon: 'settings'
      }
    ];

    defaultCommands.forEach(command => {
      this.commands.set(command.id, command);
      
      // Register keyboard shortcuts
      command.shortcuts.forEach(shortcut => {
        const shortcutKey = this.getShortcutKey(shortcut);
        this.shortcutMap.set(shortcutKey, command.id);
      });
    });
  }

  private setupKeyboardListeners(): void {
    document.addEventListener('keydown', (event) => {
      const shortcutKey = this.getShortcutKeyFromEvent(event);
      const commandId = this.shortcutMap.get(shortcutKey);
      
      if (commandId) {
        event.preventDefault();
        this.executeCommand(commandId);
      }
    });
  }

  private getShortcutKey(shortcut: KeyboardShortcut): string {
    const modifiers = shortcut.modifiers.sort().join('+');
    return modifiers ? `${modifiers}+${shortcut.key}` : shortcut.key;
  }

  private getShortcutKeyFromEvent(event: KeyboardEvent): string {
    const modifiers = [];
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.shiftKey) modifiers.push('shift');
    if (event.altKey) modifiers.push('alt');
    if (event.metaKey) modifiers.push('meta');
    
    const key = event.key;
    return modifiers.length > 0 ? `${modifiers.join('+')}+${key}` : key;
  }

  // Public API methods
  updateContext(context: Partial<UserContext>): void {
    this.userContext = { ...this.userContext, ...context };
    this.emit('contextUpdated', this.userContext);
  }

  getSuggestions(limit: number = 5): CommandSuggestion[] {
    const suggestions: CommandSuggestion[] = [];
    
    for (const command of this.commands.values()) {
      const relevanceScore = this.calculateRelevanceScore(command);
      
      if (relevanceScore > 0.1) { // Only suggest relevant commands
        const suggestion: CommandSuggestion = {
          command,
          relevanceScore,
          reason: this.generateReasonText(command, relevanceScore),
          suggestedShortcut: this.getBestShortcut(command),
          suggestedVoicePattern: this.getBestVoicePattern(command),
          suggestedGesture: this.getBestGesture(command)
        };
        
        suggestions.push(suggestion);
      }
    }
    
    // Sort by relevance score and return top suggestions
    return suggestions
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  private calculateRelevanceScore(command: Command): number {
    let score = 0;
    
    // Context relevance
    const contextRelevance = command.contextRelevance[this.userContext.currentPage] || 0;
    score += contextRelevance * 0.4;
    
    // Usage frequency
    const usageScore = Math.min(1, command.usageCount / 100); // Normalize to 0-1
    score += usageScore * 0.2;
    
    // Recency
    if (command.lastUsed) {
      const daysSinceUsed = (Date.now() - command.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 1 - daysSinceUsed / 30); // Decay over 30 days
      score += recencyScore * 0.1;
    }
    
    // Time of day relevance
    const timeRelevance = this.getTimeRelevance(command);
    score += timeRelevance * 0.1;
    
    // Device type relevance
    const deviceRelevance = this.getDeviceRelevance(command);
    score += deviceRelevance * 0.1;
    
    // Input method relevance
    const inputRelevance = this.getInputMethodRelevance(command);
    score += inputRelevance * 0.1;
    
    return Math.min(1, score);
  }

  private getTimeRelevance(command: Command): number {
    // Some commands are more relevant at certain times
    const timePreferences: Record<string, Record<string, number>> = {
      'create-task': { morning: 0.9, afternoon: 0.7, evening: 0.5, night: 0.3 },
      'complete-task': { morning: 0.6, afternoon: 0.9, evening: 0.8, night: 0.4 },
      'nav-analytics': { morning: 0.8, afternoon: 0.6, evening: 0.4, night: 0.2 }
    };
    
    const preferences = timePreferences[command.id];
    return preferences ? preferences[this.userContext.timeOfDay] || 0.5 : 0.5;
  }

  private getDeviceRelevance(command: Command): number {
    // Some commands work better on certain devices
    if (this.userContext.deviceType === 'mobile') {
      // Prefer touch-friendly commands on mobile
      return command.gesturePatterns.length > 0 ? 0.8 : 0.6;
    } else if (this.userContext.deviceType === 'desktop') {
      // Prefer keyboard shortcuts on desktop
      return command.shortcuts.length > 0 ? 0.8 : 0.6;
    }
    return 0.7;
  }

  private getInputMethodRelevance(command: Command): number {
    switch (this.userContext.inputMethod) {
      case 'keyboard':
        return command.shortcuts.length > 0 ? 1.0 : 0.5;
      case 'voice':
        return command.voicePatterns.length > 0 ? 1.0 : 0.3;
      case 'gesture':
      case 'touch':
        return command.gesturePatterns.length > 0 ? 1.0 : 0.4;
      default:
        return 0.7;
    }
  }

  private generateReasonText(command: Command, score: number): string {
    const reasons = [];
    
    if (command.contextRelevance[this.userContext.currentPage] > 0.7) {
      reasons.push(`relevant to ${this.userContext.currentPage}`);
    }
    
    if (command.usageCount > 10) {
      reasons.push('frequently used');
    }
    
    if (command.lastUsed && (Date.now() - command.lastUsed.getTime()) < 24 * 60 * 60 * 1000) {
      reasons.push('used recently');
    }
    
    if (this.userContext.inputMethod === 'keyboard' && command.shortcuts.length > 0) {
      reasons.push('has keyboard shortcut');
    }
    
    if (this.userContext.inputMethod === 'voice' && command.voicePatterns.length > 0) {
      reasons.push('voice command available');
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'suggested for current context';
  }

  private getBestShortcut(command: Command): KeyboardShortcut | undefined {
    // Return the shortest/most convenient shortcut
    return command.shortcuts.sort((a, b) => 
      (a.modifiers.length + a.key.length) - (b.modifiers.length + b.key.length)
    )[0];
  }

  private getBestVoicePattern(command: Command): string | undefined {
    // Return the shortest voice pattern
    return command.voicePatterns.sort((a, b) => a.length - b.length)[0];
  }

  private getBestGesture(command: Command): string | undefined {
    // Return the first gesture pattern (could be enhanced with preference learning)
    return command.gesturePatterns[0];
  }

  executeCommand(commandId: string, parameters?: Record<string, any>): void {
    const command = this.commands.get(commandId);
    if (!command) return;
    
    const startTime = Date.now();
    
    try {
      // Update usage statistics
      command.usageCount++;
      command.lastUsed = new Date();
      
      // Record learning data
      const learningData: LearningData = {
        commandId,
        context: { ...this.userContext },
        timestamp: new Date(),
        success: true,
        executionTime: 0 // Will be updated after execution
      };
      
      // Execute command
      this.emit('commandExecuted', {
        command,
        parameters: { ...command.parameters, ...parameters },
        context: this.userContext
      });
      
      // Update execution time
      learningData.executionTime = Date.now() - startTime;
      this.learningData.push(learningData);
      
      // Keep learning data manageable
      if (this.learningData.length > 1000) {
        this.learningData = this.learningData.slice(-1000);
      }
      
      // Update recent actions
      this.userContext.recentActions = [
        commandId,
        ...this.userContext.recentActions.slice(0, 9)
      ];
      
      this.saveLearningData();
      
    } catch (error) {
      // Record failed execution
      const learningData: LearningData = {
        commandId,
        context: { ...this.userContext },
        timestamp: new Date(),
        success: false,
        executionTime: Date.now() - startTime
      };
      
      this.learningData.push(learningData);
      this.emit('commandError', { command, error });
    }
  }

  addCommand(command: Command): void {
    this.commands.set(command.id, command);
    
    // Register keyboard shortcuts
    command.shortcuts.forEach(shortcut => {
      const shortcutKey = this.getShortcutKey(shortcut);
      this.shortcutMap.set(shortcutKey, command.id);
    });
    
    this.emit('commandAdded', command);
  }

  removeCommand(commandId: string): void {
    const command = this.commands.get(commandId);
    if (command) {
      // Remove keyboard shortcuts
      command.shortcuts.forEach(shortcut => {
        const shortcutKey = this.getShortcutKey(shortcut);
        this.shortcutMap.delete(shortcutKey);
      });
      
      this.commands.delete(commandId);
      this.emit('commandRemoved', commandId);
    }
  }

  getCommand(commandId: string): Command | undefined {
    return this.commands.get(commandId);
  }

  getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  getCommandsByCategory(category: string): Command[] {
    return Array.from(this.commands.values()).filter(cmd => cmd.category === category);
  }

  searchCommands(query: string): Command[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.commands.values()).filter(command =>
      command.name.toLowerCase().includes(lowerQuery) ||
      command.description.toLowerCase().includes(lowerQuery) ||
      command.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      command.voicePatterns.some(pattern => pattern.toLowerCase().includes(lowerQuery))
    );
  }

  learnFromUserBehavior(): void {
    // Analyze learning data to improve suggestions
    const patternAnalysis = this.analyzeLearningPatterns();
    
    // Update command relevance based on patterns
    for (const [commandId, patterns] of patternAnalysis) {
      const command = this.commands.get(commandId);
      if (command) {
        // Adjust context relevance based on usage patterns
        for (const [context, frequency] of patterns.contextUsage) {
          const currentRelevance = command.contextRelevance[context] || 0;
          const adjustedRelevance = Math.min(1, currentRelevance + frequency * 0.1);
          command.contextRelevance[context] = adjustedRelevance;
        }
      }
    }
    
    this.emit('learningUpdated', patternAnalysis);
  }

  private analyzeLearningPatterns(): Map<string, any> {
    const patterns = new Map();
    
    // Group learning data by command
    const commandGroups = new Map<string, LearningData[]>();
    for (const data of this.learningData) {
      if (!commandGroups.has(data.commandId)) {
        commandGroups.set(data.commandId, []);
      }
      commandGroups.get(data.commandId)!.push(data);
    }
    
    // Analyze patterns for each command
    for (const [commandId, dataPoints] of commandGroups) {
      const contextUsage = new Map<string, number>();
      const timeUsage = new Map<string, number>();
      const successRate = dataPoints.filter(d => d.success).length / dataPoints.length;
      
      for (const data of dataPoints) {
        // Context usage patterns
        const context = data.context.currentPage;
        contextUsage.set(context, (contextUsage.get(context) || 0) + 1);
        
        // Time usage patterns
        const timeOfDay = data.context.timeOfDay;
        timeUsage.set(timeOfDay, (timeUsage.get(timeOfDay) || 0) + 1);
      }
      
      patterns.set(commandId, {
        contextUsage,
        timeUsage,
        successRate,
        totalUsage: dataPoints.length
      });
    }
    
    return patterns;
  }

  private loadLearningData(): void {
    try {
      const saved = localStorage.getItem('commandSuggestionLearning');
      if (saved) {
        const data = JSON.parse(saved);
        this.learningData = data.learningData || [];
        
        // Update command usage statistics
        if (data.commandStats) {
          for (const [commandId, stats] of Object.entries(data.commandStats as any)) {
            const command = this.commands.get(commandId);
            if (command) {
              command.usageCount = stats.usageCount || 0;
              command.lastUsed = stats.lastUsed ? new Date(stats.lastUsed) : null;
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load learning data:', error);
    }
  }

  private saveLearningData(): void {
    try {
      const commandStats: Record<string, any> = {};
      for (const [commandId, command] of this.commands) {
        commandStats[commandId] = {
          usageCount: command.usageCount,
          lastUsed: command.lastUsed?.toISOString()
        };
      }
      
      const data = {
        learningData: this.learningData.slice(-500), // Keep last 500 entries
        commandStats
      };
      
      localStorage.setItem('commandSuggestionLearning', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save learning data:', error);
    }
  }

  // Utility methods
  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  private isWorkingHours(): boolean {
    const hour = new Date().getHours();
    const day = new Date().getDay();
    return day >= 1 && day <= 5 && hour >= 9 && hour <= 17;
  }

  private detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const userAgent = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) return 'mobile';
    return 'desktop';
  }

  getStats(): any {
    return {
      totalCommands: this.commands.size,
      totalShortcuts: this.shortcutMap.size,
      learningDataPoints: this.learningData.length,
      currentContext: this.userContext,
      mostUsedCommands: Array.from(this.commands.values())
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5)
        .map(cmd => ({ id: cmd.id, name: cmd.name, usageCount: cmd.usageCount }))
    };
  }

  exportData(): string {
    return JSON.stringify({
      commands: Array.from(this.commands.values()),
      learningData: this.learningData,
      userContext: this.userContext
    }, null, 2);
  }

  importData(data: string): void {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.commands) {
        parsed.commands.forEach((command: Command) => {
          this.addCommand(command);
        });
      }
      
      if (parsed.learningData) {
        this.learningData = parsed.learningData;
      }
      
      if (parsed.userContext) {
        this.userContext = { ...this.userContext, ...parsed.userContext };
      }
      
      this.emit('dataImported');
    } catch (error) {
      this.emit('error', `Failed to import data: ${error}`);
    }
  }
}