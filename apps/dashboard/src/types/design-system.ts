/**
 * TypeScript interfaces for design system components and props
 */

import { ReactNode, HTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes } from 'react';
import { designTokens } from '../styles/design-tokens';

// Base component props
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
  testId?: string;
}

// Theme types
export type ThemeMode = 'light' | 'dark' | 'auto';
export type ColorVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Button component types
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'>, BaseComponentProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  rounded?: boolean;
}

// Input component types
export type InputVariant = 'default' | 'filled' | 'outlined';
export type InputState = 'default' | 'error' | 'success' | 'warning';
export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>, BaseComponentProps {
  variant?: InputVariant;
  state?: InputState;
  size?: InputSize;
  label?: string;
  helperText?: string;
  errorText?: string;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  clearable?: boolean;
  fullWidth?: boolean;
  onClear?: () => void;
  autoComplete?: string;
  suggestions?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
}

// Card component types
export type CardVariant = 'default' | 'elevated' | 'outlined' | 'glass';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export interface CardProps extends HTMLAttributes<HTMLDivElement>, BaseComponentProps {
  variant?: CardVariant;
  padding?: CardPadding;
  hover?: boolean;
  interactive?: boolean;
  rounded?: boolean;
  shadow?: boolean;
}

// Modal component types
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  size?: ModalSize;
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  preventScroll?: boolean;
  centered?: boolean;
  footer?: ReactNode;
}

// Layout component types
export interface LayoutProps extends BaseComponentProps {
  sidebar?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  theme?: ThemeMode;
  sidebarCollapsed?: boolean;
  onSidebarToggle?: () => void;
}

// Navigation component types
export interface NavigationItem {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  badge?: string | number;
  children?: NavigationItem[];
}

export interface NavigationProps extends BaseComponentProps {
  items: NavigationItem[];
  collapsed?: boolean;
  theme?: ThemeMode;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'pills' | 'underline';
}

// Widget component types
export type WidgetType = 'metric' | 'chart' | 'table' | 'activity' | 'custom';

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetSize {
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface WidgetConfig {
  refreshInterval?: number;
  autoRefresh?: boolean;
  exportable?: boolean;
  configurable?: boolean;
  removable?: boolean;
}

export interface WidgetProps extends BaseComponentProps {
  id: string;
  title: string;
  type: WidgetType;
  size: WidgetSize;
  position: WidgetPosition;
  data?: any;
  config?: WidgetConfig;
  loading?: boolean;
  error?: string;
  editable?: boolean;
  resizable?: boolean;
  draggable?: boolean;
  onResize?: (size: WidgetSize) => void;
  onMove?: (position: WidgetPosition) => void;
  onRemove?: () => void;
  onConfigure?: () => void;
  onExport?: () => void;
}

// Chart component types
export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'heatmap' | 'donut';

export interface ChartDataPoint {
  [key: string]: any;
}

export interface ChartData {
  labels?: string[];
  datasets: ChartDataPoint[];
}

export interface ChartConfig {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  animation?: boolean;
  legend?: {
    display?: boolean;
    position?: 'top' | 'bottom' | 'left' | 'right';
  };
  tooltip?: {
    enabled?: boolean;
    format?: (value: any) => string;
  };
  colors?: string[];
  grid?: {
    display?: boolean;
    color?: string;
  };
  axes?: {
    x?: {
      display?: boolean;
      title?: string;
    };
    y?: {
      display?: boolean;
      title?: string;
    };
  };
}

export interface ChartProps extends BaseComponentProps {
  type: ChartType;
  data: ChartData;
  config?: ChartConfig;
  width?: number;
  height?: number;
  interactive?: boolean;
  realTime?: boolean;
  exportable?: boolean;
  zoomable?: boolean;
  loading?: boolean;
  error?: string;
  onDataPointClick?: (dataPoint: ChartDataPoint) => void;
  onExport?: (format: 'png' | 'svg' | 'pdf') => void;
}

// Task component types
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: TaskUser;
}

export interface TaskComment {
  id: string;
  author: TaskUser;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  edited?: boolean;
  mentions?: TaskUser[];
}

export interface TaskDependency {
  id: string;
  type: 'blocks' | 'blocked_by' | 'related';
  taskId: string;
  taskTitle: string;
  taskStatus: TaskStatus;
}

export interface TaskActivity {
  id: string;
  type: 'created' | 'updated' | 'commented' | 'status_changed' | 'assigned' | 'attachment_added' | 'dependency_added';
  user: TaskUser;
  timestamp: Date;
  details: Record<string, any>;
  description: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: TaskUser;
  tags?: string[];
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  dependencies?: TaskDependency[];
  attachments?: TaskAttachment[];
  comments?: TaskComment[];
  activity?: TaskActivity[];
  estimatedHours?: number;
  actualHours?: number;
  completedAt?: Date;
  labels?: string[];
  watchers?: TaskUser[];
}

export interface TaskColumn {
  id: string;
  title: string;
  status: TaskStatus;
  color?: string;
  limit?: number;
  tasks: Task[];
}

export interface TaskBoardProps extends BaseComponentProps {
  columns: TaskColumn[];
  tasks: Task[];
  onTaskMove?: (taskId: string, fromColumn: string, toColumn: string) => void;
  onTaskUpdate?: (task: Task) => void;
  onTaskCreate?: (task: Partial<Task>) => void;
  onTaskDelete?: (taskId: string) => void;
  dragEnabled?: boolean;
  virtualScrolling?: boolean;
  groupBy?: 'assignee' | 'priority' | 'tag';
  filterBy?: Partial<Task>;
  sortBy?: keyof Task;
  sortOrder?: 'asc' | 'desc';
}

export interface TaskModalProps extends BaseComponentProps {
  task?: Task;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  mode: 'create' | 'edit' | 'view';
  autoSave?: boolean;
  collaborative?: boolean;
}

// Notification types
export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  actions?: {
    label: string;
    action: () => void;
    variant?: ButtonVariant;
  }[];
  icon?: ReactNode;
  timestamp: Date;
}

export interface NotificationProps extends BaseComponentProps {
  notification: Notification;
  onDismiss: (id: string) => void;
  onAction?: (id: string, actionIndex: number) => void;
}

export interface ToastProviderProps extends BaseComponentProps {
  position?: NotificationPosition;
  maxNotifications?: number;
  defaultDuration?: number;
}

// Animation types
export interface AnimationProps {
  initial?: any;
  animate?: any;
  exit?: any;
  transition?: any;
  variants?: any;
  whileHover?: any;
  whileTap?: any;
  whileFocus?: any;
  whileInView?: any;
}

// Theme provider types
export interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isDark: boolean;
  toggleTheme: () => void;
}

export interface ThemeProviderProps extends BaseComponentProps {
  defaultTheme?: ThemeMode;
  storageKey?: string;
}

// Responsive types
export type Breakpoint = keyof typeof designTokens.screens;

export interface ResponsiveValue<T> {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
}

// Utility types
export type ComponentVariant<T extends string> = T;
export type ComponentSize<T extends string> = T;
export type ComponentState<T extends string> = T;

// Event handler types
export interface ComponentEventHandlers {
  onClick?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onHover?: () => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  onKeyUp?: (event: KeyboardEvent) => void;
}

// Accessibility types
export interface AccessibilityProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-hidden'?: boolean;
  'aria-disabled'?: boolean;
  'aria-selected'?: boolean;
  'aria-checked'?: boolean;
  'aria-pressed'?: boolean;
  'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
  role?: string;
  tabIndex?: number;
}

// Export all types for easy importing
export type {
  BaseComponentProps,
  ThemeMode,
  ColorVariant,
  Size,
  AnimationProps,
  ThemeContextValue,
  ThemeProviderProps,
  Breakpoint,
  ResponsiveValue,
  ComponentEventHandlers,
  AccessibilityProps
};