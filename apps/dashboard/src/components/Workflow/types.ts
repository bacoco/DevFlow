/**
 * Workflow Optimization Types
 * Defines interfaces for streamlined workflow management
 */

export interface WorkflowContext {
  userId: string
  userRole: 'developer' | 'team_lead' | 'manager' | 'admin'
  currentTask?: string
  recentActions: WorkflowAction[]
  preferences: WorkflowPreferences
  teamContext?: TeamContext
}

export interface WorkflowAction {
  id: string
  type: string
  timestamp: Date
  duration?: number
  context: Record<string, any>
  success: boolean
}

export interface WorkflowPreferences {
  defaultViews: Record<string, any>
  shortcuts: KeyboardShortcut[]
  batchOperations: boolean
  progressiveDisclosure: boolean
  autoSave: boolean
}

export interface TeamContext {
  teamId: string
  teamRole: string
  commonWorkflows: string[]
  sharedPreferences: Record<string, any>
}

export interface KeyboardShortcut {
  key: string
  modifiers: string[]
  action: string
  context?: string
}

export interface SmartDefault {
  context: string
  field: string
  value: any
  confidence: number
  source: 'user_history' | 'team_pattern' | 'role_based' | 'system'
}

export interface ProgressiveDisclosureConfig {
  component: string
  levels: DisclosureLevel[]
  userLevel: 'beginner' | 'intermediate' | 'advanced'
  adaptToUsage: boolean
}

export interface DisclosureLevel {
  level: number
  label: string
  fields: string[]
  condition?: (context: WorkflowContext) => boolean
}

export interface BatchOperation {
  id: string
  name: string
  description: string
  actions: BatchAction[]
  confirmationRequired: boolean
  undoable: boolean
}

export interface BatchAction {
  type: string
  target: string
  parameters: Record<string, any>
}

export interface ContextualAction {
  id: string
  label: string
  icon?: string
  shortcut?: string
  action: (context: WorkflowContext) => Promise<void>
  condition: (context: WorkflowContext) => boolean
  priority: number
}

export interface WorkflowState {
  id: string
  userId: string
  context: string
  state: Record<string, any>
  timestamp: Date
  autoSaved: boolean
}

export interface QuickAccessItem {
  id: string
  label: string
  icon?: string
  action: string
  frequency: number
  lastUsed: Date
  context?: string[]
}

export interface WorkflowOptimizationMetrics {
  taskCompletionTime: number
  clickCount: number
  errorRate: number
  backtrackingCount: number
  shortcutUsage: number
  batchOperationUsage: number
}