import { EventEmitter } from 'events';

export interface VoiceCommand {
  id: string;
  name: string;
  patterns: string[];
  action: string;
  parameters?: Record<string, any>;
  confidence: number;
  context?: string[];
  description: string;
}

export interface VoiceCommandResult {
  command: VoiceCommand;
  confidence: number;
  parameters: Record<string, any>;
  transcript: string;
  timestamp: Date;
}

export interface SpeechRecognitionConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
}

export class VoiceCommandProcessor extends EventEmitter {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private commands: Map<string, VoiceCommand> = new Map();
  private config: SpeechRecognitionConfig;
  private speechSynthesis: SpeechSynthesis;
  private currentContext: string[] = [];

  constructor(config: Partial<SpeechRecognitionConfig> = {}) {
    super();
    
    this.config = {
      language: 'en-US',
      continuous: true,
      interimResults: true,
      maxAlternatives: 3,
      ...config
    };

    this.speechSynthesis = window.speechSynthesis;
    this.initializeRecognition();
    this.registerDefaultCommands();
  }

  private initializeRecognition(): void {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    this.recognition.lang = this.config.language;
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = this.config.maxAlternatives;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.emit('listening', true);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.emit('listening', false);
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      this.handleSpeechResult(event);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.emit('error', event.error);
    };
  }

  private handleSpeechResult(event: SpeechRecognitionEvent): void {
    const results = Array.from(event.results);
    const latestResult = results[results.length - 1];
    
    if (latestResult.isFinal) {
      const transcript = latestResult[0].transcript.trim().toLowerCase();
      const confidence = latestResult[0].confidence;
      
      this.emit('transcript', { transcript, confidence, isFinal: true });
      
      // Process command
      const commandResult = this.processCommand(transcript, confidence);
      if (commandResult) {
        this.emit('command', commandResult);
        this.executeCommand(commandResult);
      }
    } else {
      // Interim results
      const transcript = latestResult[0].transcript.trim().toLowerCase();
      this.emit('transcript', { transcript, confidence: 0, isFinal: false });
    }
  }

  private processCommand(transcript: string, confidence: number): VoiceCommandResult | null {
    let bestMatch: { command: VoiceCommand; confidence: number; parameters: Record<string, any> } | null = null;

    for (const command of this.commands.values()) {
      // Check if command is valid in current context
      if (command.context && command.context.length > 0) {
        const hasValidContext = command.context.some(ctx => this.currentContext.includes(ctx));
        if (!hasValidContext) continue;
      }

      for (const pattern of command.patterns) {
        const match = this.matchPattern(transcript, pattern);
        if (match && match.confidence > 0.6) {
          if (!bestMatch || match.confidence > bestMatch.confidence) {
            bestMatch = {
              command,
              confidence: match.confidence * confidence,
              parameters: match.parameters
            };
          }
        }
      }
    }

    if (bestMatch && bestMatch.confidence > 0.5) {
      return {
        command: bestMatch.command,
        confidence: bestMatch.confidence,
        parameters: bestMatch.parameters,
        transcript,
        timestamp: new Date()
      };
    }

    return null;
  }

  private matchPattern(transcript: string, pattern: string): { confidence: number; parameters: Record<string, any> } | null {
    // Convert pattern to regex, handling parameters like {taskName}
    const paramRegex = /\{(\w+)\}/g;
    const parameters: Record<string, any> = {};
    
    let regexPattern = pattern.toLowerCase();
    let paramMatch;
    
    while ((paramMatch = paramRegex.exec(pattern)) !== null) {
      const paramName = paramMatch[1];
      regexPattern = regexPattern.replace(`{${paramName}}`, '(.+?)');
    }
    
    // Add word boundaries and make it flexible
    regexPattern = regexPattern
      .replace(/\s+/g, '\\s+')
      .replace(/\?/g, '\\?')
      .replace(/\./g, '\\.');
    
    const regex = new RegExp(`\\b${regexPattern}\\b`, 'i');
    const match = transcript.match(regex);
    
    if (match) {
      // Extract parameters
      const paramNames = Array.from(pattern.matchAll(/\{(\w+)\}/g)).map(m => m[1]);
      paramNames.forEach((name, index) => {
        if (match[index + 1]) {
          parameters[name] = match[index + 1].trim();
        }
      });
      
      // Calculate confidence based on match quality
      const confidence = Math.min(1, match[0].length / transcript.length + 0.3);
      
      return { confidence, parameters };
    }
    
    return null;
  }

  private executeCommand(result: VoiceCommandResult): void {
    try {
      // Dispatch command to appropriate handler
      switch (result.command.action) {
        case 'navigate':
          this.handleNavigationCommand(result);
          break;
        case 'create_task':
          this.handleCreateTaskCommand(result);
          break;
        case 'search':
          this.handleSearchCommand(result);
          break;
        case 'filter':
          this.handleFilterCommand(result);
          break;
        case 'toggle_view':
          this.handleToggleViewCommand(result);
          break;
        case 'voice_feedback':
          this.handleVoiceFeedbackCommand(result);
          break;
        default:
          this.emit('commandExecuted', result);
      }
    } catch (error) {
      this.emit('error', `Failed to execute command: ${error}`);
    }
  }

  private handleNavigationCommand(result: VoiceCommandResult): void {
    const { page } = result.parameters;
    if (page) {
      // Navigate to specified page
      window.location.hash = `#/${page}`;
      this.speak(`Navigating to ${page}`);
    }
  }

  private handleCreateTaskCommand(result: VoiceCommandResult): void {
    const { taskName, priority } = result.parameters;
    
    // Emit event for task creation
    this.emit('createTask', {
      title: taskName || 'New Task',
      priority: priority || 'medium',
      description: `Created via voice command: "${result.transcript}"`
    });
    
    this.speak(`Creating task: ${taskName || 'New Task'}`);
  }

  private handleSearchCommand(result: VoiceCommandResult): void {
    const { query } = result.parameters;
    if (query) {
      this.emit('search', { query });
      this.speak(`Searching for ${query}`);
    }
  }

  private handleFilterCommand(result: VoiceCommandResult): void {
    const { filterType, filterValue } = result.parameters;
    
    this.emit('filter', {
      type: filterType,
      value: filterValue
    });
    
    this.speak(`Filtering by ${filterType}: ${filterValue}`);
  }

  private handleToggleViewCommand(result: VoiceCommandResult): void {
    const { viewType } = result.parameters;
    
    this.emit('toggleView', { viewType });
    this.speak(`Switching to ${viewType} view`);
  }

  private handleVoiceFeedbackCommand(result: VoiceCommandResult): void {
    const { message } = result.parameters;
    if (message) {
      this.speak(message);
    }
  }

  private registerDefaultCommands(): void {
    const defaultCommands: VoiceCommand[] = [
      // Navigation commands
      {
        id: 'nav-dashboard',
        name: 'Navigate to Dashboard',
        patterns: [
          'go to dashboard',
          'show dashboard',
          'navigate to dashboard',
          'open dashboard'
        ],
        action: 'navigate',
        parameters: { page: 'dashboard' },
        confidence: 0.9,
        description: 'Navigate to the main dashboard'
      },
      {
        id: 'nav-tasks',
        name: 'Navigate to Tasks',
        patterns: [
          'go to tasks',
          'show tasks',
          'navigate to tasks',
          'open tasks',
          'show task manager'
        ],
        action: 'navigate',
        parameters: { page: 'tasks' },
        confidence: 0.9,
        description: 'Navigate to the task manager'
      },
      {
        id: 'nav-analytics',
        name: 'Navigate to Analytics',
        patterns: [
          'go to analytics',
          'show analytics',
          'navigate to analytics',
          'open analytics',
          'show reports'
        ],
        action: 'navigate',
        parameters: { page: 'analytics' },
        confidence: 0.9,
        description: 'Navigate to analytics and reports'
      },

      // Task management commands
      {
        id: 'create-task',
        name: 'Create Task',
        patterns: [
          'create task {taskName}',
          'add task {taskName}',
          'new task {taskName}',
          'create a task called {taskName}',
          'add a new task {taskName}'
        ],
        action: 'create_task',
        confidence: 0.8,
        context: ['tasks', 'dashboard'],
        description: 'Create a new task with specified name'
      },
      {
        id: 'create-priority-task',
        name: 'Create Priority Task',
        patterns: [
          'create {priority} priority task {taskName}',
          'add {priority} task {taskName}',
          'new {priority} priority task {taskName}'
        ],
        action: 'create_task',
        confidence: 0.8,
        context: ['tasks', 'dashboard'],
        description: 'Create a new task with specified priority'
      },

      // Search commands
      {
        id: 'search',
        name: 'Search',
        patterns: [
          'search for {query}',
          'find {query}',
          'look for {query}',
          'search {query}'
        ],
        action: 'search',
        confidence: 0.8,
        description: 'Search for items matching the query'
      },

      // Filter commands
      {
        id: 'filter-priority',
        name: 'Filter by Priority',
        patterns: [
          'show {priority} priority tasks',
          'filter by {priority} priority',
          'show only {priority} tasks'
        ],
        action: 'filter',
        parameters: { filterType: 'priority' },
        confidence: 0.8,
        context: ['tasks'],
        description: 'Filter tasks by priority level'
      },
      {
        id: 'filter-assignee',
        name: 'Filter by Assignee',
        patterns: [
          'show tasks assigned to {assignee}',
          'filter by assignee {assignee}',
          'show {assignee} tasks'
        ],
        action: 'filter',
        parameters: { filterType: 'assignee' },
        confidence: 0.8,
        context: ['tasks'],
        description: 'Filter tasks by assignee'
      },

      // View commands
      {
        id: 'toggle-kanban',
        name: 'Switch to Kanban View',
        patterns: [
          'switch to kanban',
          'show kanban view',
          'kanban view',
          'board view'
        ],
        action: 'toggle_view',
        parameters: { viewType: 'kanban' },
        confidence: 0.9,
        context: ['tasks'],
        description: 'Switch to Kanban board view'
      },
      {
        id: 'toggle-list',
        name: 'Switch to List View',
        patterns: [
          'switch to list',
          'show list view',
          'list view',
          'table view'
        ],
        action: 'toggle_view',
        parameters: { viewType: 'list' },
        confidence: 0.9,
        context: ['tasks'],
        description: 'Switch to list/table view'
      },

      // System commands
      {
        id: 'help',
        name: 'Show Help',
        patterns: [
          'help',
          'what can you do',
          'show commands',
          'voice commands',
          'how to use voice'
        ],
        action: 'voice_feedback',
        parameters: { 
          message: 'I can help you navigate, create tasks, search, filter, and change views. Try saying "go to dashboard" or "create task review code"' 
        },
        confidence: 0.9,
        description: 'Show available voice commands'
      },
      {
        id: 'stop-listening',
        name: 'Stop Listening',
        patterns: [
          'stop listening',
          'turn off voice',
          'disable voice',
          'stop voice commands'
        ],
        action: 'voice_feedback',
        confidence: 0.9,
        description: 'Stop voice command recognition'
      }
    ];

    defaultCommands.forEach(command => {
      this.commands.set(command.id, command);
    });
  }

  // Public API methods
  startListening(): void {
    if (!this.recognition) {
      this.emit('error', 'Speech recognition not available');
      return;
    }

    if (!this.isListening) {
      this.recognition.start();
    }
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  toggleListening(): void {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  speak(text: string, options: SpeechSynthesisUtteranceOptions = {}): void {
    if (!this.speechSynthesis) {
      console.warn('Speech synthesis not available');
      return;
    }

    // Cancel any ongoing speech
    this.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate || 1;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 0.8;
    utterance.lang = options.lang || this.config.language;

    utterance.onstart = () => this.emit('speechStart', text);
    utterance.onend = () => this.emit('speechEnd', text);
    utterance.onerror = (event) => this.emit('speechError', event);

    this.speechSynthesis.speak(utterance);
  }

  addCommand(command: VoiceCommand): void {
    this.commands.set(command.id, command);
  }

  removeCommand(commandId: string): void {
    this.commands.delete(commandId);
  }

  getCommands(): VoiceCommand[] {
    return Array.from(this.commands.values());
  }

  setContext(context: string[]): void {
    this.currentContext = context;
  }

  addContext(context: string): void {
    if (!this.currentContext.includes(context)) {
      this.currentContext.push(context);
    }
  }

  removeContext(context: string): void {
    this.currentContext = this.currentContext.filter(ctx => ctx !== context);
  }

  isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.speechSynthesis.getVoices();
  }

  // Training and customization
  trainCommand(transcript: string, commandId: string): void {
    const command = this.commands.get(commandId);
    if (command) {
      // Add the transcript as a new pattern if it's not already there
      const normalizedTranscript = transcript.toLowerCase().trim();
      if (!command.patterns.includes(normalizedTranscript)) {
        command.patterns.push(normalizedTranscript);
        this.emit('commandTrained', { commandId, transcript });
      }
    }
  }

  exportCommands(): string {
    const commandsData = Array.from(this.commands.values());
    return JSON.stringify(commandsData, null, 2);
  }

  importCommands(commandsJson: string): void {
    try {
      const commands: VoiceCommand[] = JSON.parse(commandsJson);
      commands.forEach(command => {
        this.commands.set(command.id, command);
      });
      this.emit('commandsImported', commands.length);
    } catch (error) {
      this.emit('error', `Failed to import commands: ${error}`);
    }
  }

  // Analytics and debugging
  getRecognitionStats(): any {
    return {
      isListening: this.isListening,
      commandCount: this.commands.size,
      currentContext: this.currentContext,
      isSupported: this.isSupported(),
      availableVoices: this.getAvailableVoices().length
    };
  }
}

// Type declarations for Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognitionOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

interface SpeechSynthesisUtteranceOptions extends SpeechRecognitionOptions {}