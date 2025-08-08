/**
 * Navigation System Types
 * Type definitions for the enhanced navigation system
 */

import { ReactNode } from 'react';

// Navigation Context Types
export interface NavigationContext {
  currentRoute: string;
  userRole: UserRole;
  availableActions: NavigationAction[];
  breadcrumbs: BreadcrumbItem[];
  history: NavigationHistoryItem[];
  preferences: NavigationPreferences;
}

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
  level: 'viewer' | 'contributor' | 'admin' | 'owner';
}

export interface NavigationAction {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  category: 'navigation' | 'action' | 'view' | 'edit';
  handler: () => void;
  visible: boolean;
  disabled?: boolean;
}

// Breadcrumb Types
export interface BreadcrumbItem {
  id: string;
  label: string;
  href?: string;
  icon?: ReactNode;
  active?: boolean;
  clickable?: boolean;
  metadata?: Record<string, any>;
}

export interface NavigationHistoryItem {
  id: string;
  route: string;
  title: string;
  timestamp: Date;
  context?: Record<string, any>;
}

// Navigation Preferences
export interface NavigationPreferences {
  collapsedSections: string[];
  pinnedItems: string[];
  recentItems: string[];
  customOrder: string[];
  shortcuts: Record<string, string>;
}

// Adaptive Navigation Types
export interface AdaptiveNavigationItem {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  children?: AdaptiveNavigationItem[];
  
  // Adaptive properties
  priority: number;
  contextRelevance: number;
  userFrequency: number;
  roleVisibility: UserRole['level'][];
  conditions?: NavigationCondition[];
  
  // State
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  hidden?: boolean;
}

export interface NavigationCondition {
  type: 'role' | 'permission' | 'feature' | 'context' | 'time';
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between';
  value: any;
  negate?: boolean;
}

// Global Search Types
export interface SearchProvider {
  id: string;
  name: string;
  icon?: ReactNode;
  priority: number;
  search: (query: string) => Promise<SearchResult[]>;
  getSuggestions: (partial: string) => Promise<SearchSuggestion[]>;
}

export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: SearchResultType;
  category: string;
  url?: string;
  icon?: ReactNode;
  relevance: number;
  metadata?: Record<string, any>;
  actions?: SearchResultAction[];
}

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'query' | 'filter' | 'command';
  category?: string;
  icon?: ReactNode;
  description?: string;
}

export interface SearchResultAction {
  id: string;
  label: string;
  icon?: ReactNode;
  handler: (result: SearchResult) => void;
  primary?: boolean;
}

export type SearchResultType = 
  | 'page' 
  | 'task' 
  | 'user' 
  | 'team' 
  | 'dashboard' 
  | 'widget' 
  | 'report' 
  | 'setting' 
  | 'help' 
  | 'command';

// Command Palette Types
export interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  category: CommandCategory;
  keywords: string[];
  shortcut?: string;
  handler: () => void | Promise<void>;
  
  // Conditions
  enabled: boolean;
  visible: boolean;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  
  // Metadata
  priority: number;
  lastUsed?: Date;
  useCount: number;
}

export type CommandCategory = 
  | 'navigation' 
  | 'actions' 
  | 'view' 
  | 'edit' 
  | 'create' 
  | 'delete' 
  | 'settings' 
  | 'help';

export interface CommandPaletteState {
  isOpen: boolean;
  query: string;
  selectedIndex: number;
  filteredCommands: Command[];
  recentCommands: Command[];
  favoriteCommands: Command[];
}

// Navigation State Management Types
export interface NavigationState {
  currentRoute: string;
  previousRoute?: string;
  breadcrumbs: BreadcrumbItem[];
  history: NavigationHistoryItem[];
  searchState: SearchState;
  commandPaletteState: CommandPaletteState;
  preferences: NavigationPreferences;
  context: NavigationContext;
}

export interface SearchState {
  isOpen: boolean;
  query: string;
  results: SearchResult[];
  suggestions: SearchSuggestion[];
  selectedIndex: number;
  loading: boolean;
  providers: SearchProvider[];
  activeProvider?: string;
}

// URL Synchronization Types
export interface URLSyncConfig {
  syncBreadcrumbs: boolean;
  syncSearchQuery: boolean;
  syncFilters: boolean;
  syncViewState: boolean;
  debounceMs: number;
}

export interface URLState {
  route: string;
  params: Record<string, string>;
  query: Record<string, string>;
  hash?: string;
  state?: Record<string, any>;
}

// Navigation Events
export interface NavigationEvent {
  type: NavigationEventType;
  timestamp: Date;
  route: string;
  context?: Record<string, any>;
  user?: {
    id: string;
    role: UserRole;
  };
}

export type NavigationEventType = 
  | 'route_change' 
  | 'breadcrumb_click' 
  | 'search_query' 
  | 'command_execute' 
  | 'shortcut_use' 
  | 'menu_expand' 
  | 'menu_collapse';

// Keyboard Navigation Types
export interface KeyboardShortcut {
  id: string;
  key: string;
  modifiers: KeyboardModifier[];
  description: string;
  category: string;
  handler: (event: KeyboardEvent) => void;
  enabled: boolean;
  global?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export type KeyboardModifier = 'ctrl' | 'cmd' | 'alt' | 'shift' | 'meta';

// Analytics Types
export interface NavigationAnalytics {
  pageViews: Record<string, number>;
  searchQueries: Record<string, number>;
  commandUsage: Record<string, number>;
  shortcutUsage: Record<string, number>;
  userJourneys: NavigationJourney[];
  performanceMetrics: NavigationPerformanceMetrics;
}

export interface NavigationJourney {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  steps: NavigationJourneyStep[];
  completed: boolean;
  goal?: string;
}

export interface NavigationJourneyStep {
  route: string;
  timestamp: Date;
  duration: number;
  action?: string;
  context?: Record<string, any>;
}

export interface NavigationPerformanceMetrics {
  averageRouteChangeTime: number;
  searchResponseTime: number;
  commandExecutionTime: number;
  breadcrumbRenderTime: number;
  totalNavigationTime: number;
}