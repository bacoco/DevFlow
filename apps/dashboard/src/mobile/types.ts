/**
 * Mobile optimization and touch interaction types
 */

export interface DeviceInfo {
  type: 'desktop' | 'tablet' | 'mobile'
  screenSize: ScreenSize
  orientation: 'portrait' | 'landscape'
  touchCapable: boolean
  platform: Platform
  browserInfo: BrowserInfo
}

export interface ScreenSize {
  width: number
  height: number
  pixelRatio: number
}

export interface Platform {
  os: 'ios' | 'android' | 'windows' | 'macos' | 'linux'
  version: string
  isMobile: boolean
  isTablet: boolean
}

export interface BrowserInfo {
  name: string
  version: string
  engine: string
}

export interface TouchGesture {
  type: GestureType
  element: string
  startPosition: Position
  endPosition: Position
  duration: number
  velocity?: number
  direction?: Direction
}

export type GestureType = 'tap' | 'swipe' | 'pinch' | 'pan' | 'longpress' | 'doubletap'

export interface Position {
  x: number
  y: number
}

export type Direction = 'up' | 'down' | 'left' | 'right'

export interface GestureConfig {
  type: GestureType
  threshold?: number
  minDistance?: number
  maxDistance?: number
  minDuration?: number
  maxDuration?: number
  preventDefault?: boolean
}

export interface SwipeHandler {
  onSwipe: (direction: Direction, distance: number, velocity: number) => void
  onSwipeStart?: (position: Position) => void
  onSwipeEnd?: (position: Position) => void
}

export interface TapHandler {
  onTap: (position: Position) => void
  onDoubleTap?: (position: Position) => void
  onLongPress?: (position: Position) => void
}

export interface PinchConfig {
  minScale: number
  maxScale: number
  onPinchStart?: (scale: number) => void
  onPinch?: (scale: number, center: Position) => void
  onPinchEnd?: (scale: number) => void
}

export interface MobileLayoutConfig {
  breakpoints: ResponsiveBreakpoints
  touchTargetSize: number
  spacing: MobileSpacing
  navigation: MobileNavigationConfig
}

export interface ResponsiveBreakpoints {
  mobile: number
  tablet: number
  desktop: number
}

export interface MobileSpacing {
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
}

export interface MobileNavigationConfig {
  type: 'bottom-tabs' | 'hamburger' | 'drawer'
  collapsible: boolean
  swipeToOpen?: boolean
  overlay?: boolean
}

export interface TabConfig {
  id: string
  label: string
  icon: string
  route: string
  badge?: number
  disabled?: boolean
}

export interface MenuConfig {
  items: MenuItem[]
  position: 'left' | 'right'
  overlay: boolean
  swipeToClose: boolean
}

export interface MenuItem {
  id: string
  label: string
  icon?: string
  route?: string
  action?: () => void
  children?: MenuItem[]
}

export interface ActionConfig {
  icon: string
  label: string
  action: () => void
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
}

export interface BackButtonHandler {
  (event: PopStateEvent): boolean | void
}

export interface MobileChartConfig {
  simplifiedView: boolean
  touchInteractions: boolean
  gestureZoom: boolean
  swipeNavigation: boolean
  compactLegend: boolean
}

export interface OfflineSyncConfig {
  enabled: boolean
  syncInterval: number
  maxRetries: number
  backgroundSync: boolean
  conflictResolution: 'client' | 'server' | 'merge'
}

export interface SyncTask {
  id: string
  type: 'create' | 'update' | 'delete'
  data: any
  timestamp: Date
  retryCount: number
}

export interface SyncResult {
  success: boolean
  syncedItems: number
  failedItems: number
  conflicts: SyncConflict[]
}

export interface SyncConflict {
  id: string
  type: string
  clientData: any
  serverData: any
  resolution?: 'client' | 'server' | 'merge'
}

export interface MobileNotificationConfig {
  enabled: boolean
  badge: boolean
  sound: boolean
  vibration: boolean
  priority: 'low' | 'normal' | 'high'
}

export interface NotificationAction {
  action: string
  title: string
  icon?: string
}

export interface MobileNotification {
  id: string
  title: string
  body: string
  icon?: string
  badge?: number
  tag?: string
  actions?: NotificationAction[]
  data?: any
}