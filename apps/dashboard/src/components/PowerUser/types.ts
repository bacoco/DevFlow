// Bulk Selection Types
export interface SelectableItem {
  id: string;
  type: string;
  data: any;
  selectable?: boolean;
}

export interface BatchOperation {
  id: string;
  label: string;
  icon: string;
  action: (items: SelectableItem[]) => Promise<void>;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  disabled?: (items: SelectableItem[]) => boolean;
}

export interface BulkSelectionState {
  selectedItems: Set<string>;
  lastSelectedId: string | null;
  isOperationInProgress: boolean;
  operationFeedback: string | null;
}

// Keyboard Shortcuts Types
export interface KeyboardShortcut {
  id: string;
  keys: string[];
  description: string;
  action: () => void;
  category?: string;
  global?: boolean;
  preventDefault?: boolean;
  enabled?: boolean;
  customizable?: boolean;
}

export interface ShortcutCategory {
  id: string;
  name: string;
  shortcuts: KeyboardShortcut[];
}

export interface KeyboardShortcutState {
  pressedKeys: Set<string>;
  customShortcuts: Map<string, string[]>;
  isRecording: string | null;
}

// Advanced Filtering Types
export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  type: FilterType;
}

export interface FilterGroup {
  id: string;
  conditions: FilterCondition[];
  operator: 'AND' | 'OR';
  groups?: FilterGroup[];
}

export interface SavedFilterSet {
  id: string;
  name: string;
  description?: string;
  filter: FilterGroup;
  createdAt: Date;
  updatedAt: Date;
  isPublic?: boolean;
  tags?: string[];
}

export type FilterOperator = 
  | 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with'
  | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal' | 'between'
  | 'in' | 'not_in' | 'is_null' | 'is_not_null' | 'regex';

export type FilterType = 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';

export interface FilterField {
  key: string;
  label: string;
  type: FilterType;
  options?: { value: any; label: string }[];
  placeholder?: string;
  validation?: (value: any) => boolean;
}

// Drag & Drop Layout Types
export interface LayoutItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  resizable?: boolean;
  draggable?: boolean;
  component: React.ComponentType<any>;
  props?: any;
  title?: string;
}

export interface GridConfig {
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  gap: number;
  snapToGrid: boolean;
}

export interface DragState {
  isDragging: boolean;
  draggedItem: LayoutItem | null;
  dragOffset: { x: number; y: number };
  originalPosition: { x: number; y: number };
}

export interface ResizeState {
  isResizing: boolean;
  resizedItem: LayoutItem | null;
  resizeHandle: string;
  startPosition: { x: number; y: number };
  startSize: { width: number; height: number };
}

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se';

// API Integration Types
export interface APIEndpoint {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers: Record<string, string>;
  body?: string;
  authentication?: APIAuthentication;
  description?: string;
  tags?: string[];
}

export interface APIAuthentication {
  type: 'none' | 'bearer' | 'basic' | 'api-key';
  token?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  apiKeyHeader?: string;
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  headers?: Record<string, string>;
  retryPolicy?: WebhookRetryPolicy;
  description?: string;
}

export interface WebhookRetryPolicy {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
}

export interface APIResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  duration: number;
  timestamp: Date;
}

export interface APITestResult {
  success: boolean;
  response?: APIResponse;
  error?: string;
  duration: number;
}

// Power User Preferences
export interface PowerUserPreferences {
  bulkSelection: {
    showConfirmationDialogs: boolean;
    defaultBatchSize: number;
    enableKeyboardShortcuts: boolean;
  };
  keyboardShortcuts: {
    customBindings: Map<string, string[]>;
    enableGlobalShortcuts: boolean;
    showHelpOnStartup: boolean;
  };
  filtering: {
    saveFiltersLocally: boolean;
    maxSavedFilters: number;
    defaultOperator: 'AND' | 'OR';
  };
  layout: {
    snapToGrid: boolean;
    showGrid: boolean;
    gridSize: number;
    enableAnimations: boolean;
  };
  apiIntegration: {
    defaultTimeout: number;
    enableRequestLogging: boolean;
    maxRetries: number;
  };
}

// Event Types
export interface PowerUserEvent {
  type: 'bulk_operation' | 'shortcut_executed' | 'filter_applied' | 'layout_changed' | 'api_called';
  timestamp: Date;
  data: any;
  userId?: string;
  sessionId?: string;
}

export interface BulkOperationEvent extends PowerUserEvent {
  type: 'bulk_operation';
  data: {
    operation: string;
    itemCount: number;
    duration: number;
    success: boolean;
  };
}

export interface ShortcutExecutedEvent extends PowerUserEvent {
  type: 'shortcut_executed';
  data: {
    shortcutId: string;
    keys: string[];
    category: string;
  };
}

export interface FilterAppliedEvent extends PowerUserEvent {
  type: 'filter_applied';
  data: {
    filterId?: string;
    conditionCount: number;
    resultCount: number;
  };
}

export interface LayoutChangedEvent extends PowerUserEvent {
  type: 'layout_changed';
  data: {
    itemId: string;
    action: 'moved' | 'resized' | 'added' | 'removed';
    position?: { x: number; y: number };
    size?: { width: number; height: number };
  };
}

export interface APICalledEvent extends PowerUserEvent {
  type: 'api_called';
  data: {
    endpointId: string;
    method: string;
    url: string;
    status: number;
    duration: number;
    success: boolean;
  };
}

// Utility Types
export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PowerUserAnalytics {
  shortcutUsage: Record<string, number>;
  bulkOperationStats: {
    totalOperations: number;
    averageItemsPerOperation: number;
    mostUsedOperation: string;
  };
  filterUsage: {
    totalFiltersApplied: number;
    averageConditionsPerFilter: number;
    mostUsedFields: string[];
  };
  layoutCustomization: {
    totalChanges: number;
    mostMovedItems: string[];
    averageSessionDuration: number;
  };
  apiIntegration: {
    totalCalls: number;
    averageResponseTime: number;
    successRate: number;
    mostUsedEndpoints: string[];
  };
}

// Component Props Types
export interface BulkSelectionRenderProps {
  selectedItems: SelectableItem[];
  isSelected: (id: string) => boolean;
  toggleSelection: (item: SelectableItem) => void;
  selectAll: () => void;
  clearSelection: () => void;
  selectRange: (startId: string, endId: string) => void;
  isSelectionMode: boolean;
}

export interface PowerUserContextValue {
  preferences: PowerUserPreferences;
  updatePreferences: (updates: Partial<PowerUserPreferences>) => void;
  analytics: PowerUserAnalytics;
  trackEvent: (event: PowerUserEvent) => void;
}

// Error Types
export interface PowerUserError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export interface ValidationError extends PowerUserError {
  field: string;
  value: any;
}

export interface APIError extends PowerUserError {
  status?: number;
  endpoint?: string;
  method?: string;
}