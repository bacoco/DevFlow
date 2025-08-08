/**
 * Touch Gesture Recognition System
 * Handles swipe, pinch, tap, and other touch gestures for mobile devices
 */

import { 
  GestureType, 
  GestureConfig, 
  TouchGesture, 
  Position, 
  Direction, 
  SwipeHandler, 
  TapHandler, 
  PinchConfig 
} from './types'

export class TouchGestureManager {
  private activeGestures = new Map<string, GestureConfig[]>()
  private touchStartTime = 0
  private touchStartPosition: Position = { x: 0, y: 0 }
  private touchEndPosition: Position = { x: 0, y: 0 }
  private initialDistance = 0
  private currentScale = 1
  private tapTimeout: NodeJS.Timeout | null = null
  private longPressTimeout: NodeJS.Timeout | null = null

  constructor() {
    this.bindEvents()
  }

  private bindEvents(): void {
    // Passive event listeners for better performance
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false })
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false })
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false })
    document.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: true })
  }

  registerSwipeHandler(element: HTMLElement, handler: SwipeHandler, config?: Partial<GestureConfig>): void {
    const elementId = this.getElementId(element)
    const gestureConfig: GestureConfig = {
      type: 'swipe',
      threshold: 50,
      minDistance: 30,
      maxDistance: 1000,
      minDuration: 50,
      maxDuration: 1000,
      preventDefault: true,
      ...config
    }

    if (!this.activeGestures.has(elementId)) {
      this.activeGestures.set(elementId, [])
    }
    this.activeGestures.get(elementId)!.push(gestureConfig)

    // Store handler reference
    ;(element as any).__swipeHandler = handler
  }

  enablePinchZoom(element: HTMLElement, config: PinchConfig): void {
    const elementId = this.getElementId(element)
    const gestureConfig: GestureConfig = {
      type: 'pinch',
      preventDefault: true
    }

    if (!this.activeGestures.has(elementId)) {
      this.activeGestures.set(elementId, [])
    }
    this.activeGestures.get(elementId)!.push(gestureConfig)

    // Store config reference
    ;(element as any).__pinchConfig = config
  }

  addTapGesture(element: HTMLElement, handler: TapHandler, config?: Partial<GestureConfig>): void {
    const elementId = this.getElementId(element)
    const gestureConfig: GestureConfig = {
      type: 'tap',
      maxDuration: 300,
      threshold: 10,
      preventDefault: false,
      ...config
    }

    if (!this.activeGestures.has(elementId)) {
      this.activeGestures.set(elementId, [])
    }
    this.activeGestures.get(elementId)!.push(gestureConfig)

    // Store handler reference
    ;(element as any).__tapHandler = handler
  }

  preventScrollBounce(element: HTMLElement): void {
    element.addEventListener('touchstart', (e) => {
      if (element.scrollTop === 0) {
        element.scrollTop = 1
      } else if (element.scrollTop + element.offsetHeight >= element.scrollHeight) {
        element.scrollTop = element.scrollHeight - element.offsetHeight - 1
      }
    }, { passive: true })

    element.addEventListener('touchmove', (e) => {
      const touch = e.touches[0]
      const startY = this.touchStartPosition.y
      const currentY = touch.clientY
      const isScrollingUp = currentY > startY
      const isScrollingDown = currentY < startY

      if ((isScrollingUp && element.scrollTop === 0) ||
          (isScrollingDown && element.scrollTop + element.offsetHeight >= element.scrollHeight)) {
        e.preventDefault()
      }
    }, { passive: false })
  }

  private handleTouchStart(event: TouchEvent): void {
    const touch = event.touches[0]
    this.touchStartTime = Date.now()
    this.touchStartPosition = { x: touch.clientX, y: touch.clientY }
    this.touchEndPosition = this.touchStartPosition

    // Handle multi-touch for pinch gestures
    if (event.touches.length === 2) {
      this.initialDistance = this.getDistance(event.touches[0], event.touches[1])
      this.currentScale = 1
    }

    // Set up long press detection
    this.longPressTimeout = setTimeout(() => {
      this.handleLongPress(event.target as HTMLElement, this.touchStartPosition)
    }, 500)

    // Handle gesture configs
    const element = event.target as HTMLElement
    if (element) {
      const elementId = this.getElementId(element)
      const gestures = this.activeGestures.get(elementId)

      if (gestures) {
        gestures.forEach(gesture => {
          if (gesture.preventDefault) {
            event.preventDefault()
          }
        })
      }
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    const touch = event.touches[0]
    this.touchEndPosition = { x: touch.clientX, y: touch.clientY }

    // Clear long press timeout on move
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout)
      this.longPressTimeout = null
    }

    // Handle pinch gestures
    if (event.touches.length === 2) {
      const currentDistance = this.getDistance(event.touches[0], event.touches[1])
      const scale = currentDistance / this.initialDistance
      this.handlePinch(event.target as HTMLElement, scale, this.getCenterPoint(event.touches[0], event.touches[1]))
    }

    // Handle pan gestures
    this.handlePan(event.target as HTMLElement, this.touchEndPosition)
  }

  private handleTouchEnd(event: TouchEvent): void {
    const duration = Date.now() - this.touchStartTime
    const distance = this.getDistance(this.touchStartPosition, this.touchEndPosition)
    const element = event.target as HTMLElement

    // Clear timeouts
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout)
      this.longPressTimeout = null
    }

    // Determine gesture type
    if (distance < 10 && duration < 300) {
      this.handleTap(element, this.touchEndPosition)
    } else if (distance > 30) {
      const direction = this.getSwipeDirection(this.touchStartPosition, this.touchEndPosition)
      const velocity = distance / duration
      this.handleSwipe(element, direction, distance, velocity)
    }

    // Reset pinch state
    this.initialDistance = 0
    this.currentScale = 1
  }

  private handleTouchCancel(event: TouchEvent): void {
    // Clear all timeouts and reset state
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout)
      this.longPressTimeout = null
    }
    if (this.tapTimeout) {
      clearTimeout(this.tapTimeout)
      this.tapTimeout = null
    }
  }

  private handleTap(element: HTMLElement, position: Position): void {
    const handler = (element as any).__tapHandler as TapHandler
    if (!handler) return

    // Handle double tap detection
    if (this.tapTimeout) {
      clearTimeout(this.tapTimeout)
      this.tapTimeout = null
      if (handler.onDoubleTap) {
        handler.onDoubleTap(position)
      }
    } else {
      this.tapTimeout = setTimeout(() => {
        handler.onTap(position)
        this.tapTimeout = null
      }, 300)
    }
  }

  private handleLongPress(element: HTMLElement, position: Position): void {
    const handler = (element as any).__tapHandler as TapHandler
    if (handler?.onLongPress) {
      handler.onLongPress(position)
    }
  }

  private handleSwipe(element: HTMLElement, direction: Direction, distance: number, velocity: number): void {
    const handler = (element as any).__swipeHandler as SwipeHandler
    if (handler) {
      handler.onSwipe(direction, distance, velocity)
    }
  }

  private handlePinch(element: HTMLElement, scale: number, center: Position): void {
    const config = (element as any).__pinchConfig as PinchConfig
    if (!config) return

    const clampedScale = Math.max(config.minScale, Math.min(config.maxScale, scale))
    
    if (config.onPinch) {
      config.onPinch(clampedScale, center)
    }
  }

  private handlePan(element: HTMLElement, position: Position): void {
    // Pan handling can be added here for specific use cases
  }

  private getDistance(pos1: Position | Touch, pos2: Position | Touch): number {
    const dx = ('clientX' in pos1 ? pos1.clientX : pos1.x) - ('clientX' in pos2 ? pos2.clientX : pos2.x)
    const dy = ('clientY' in pos1 ? pos1.clientY : pos1.y) - ('clientY' in pos2 ? pos2.clientY : pos2.y)
    return Math.sqrt(dx * dx + dy * dy)
  }

  private getCenterPoint(touch1: Touch, touch2: Touch): Position {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    }
  }

  private getSwipeDirection(start: Position, end: Position): Direction {
    const dx = end.x - start.x
    const dy = end.y - start.y

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left'
    } else {
      return dy > 0 ? 'down' : 'up'
    }
  }

  private getElementId(element: HTMLElement): string {
    if (!element) {
      return 'unknown_' + Math.random().toString(36).substr(2, 9)
    }
    
    if (element.id) {
      return element.id
    }
    
    const parent = element.parentNode
    if (parent && parent.children) {
      const index = Array.from(parent.children).indexOf(element)
      return element.tagName + '_' + (index >= 0 ? index : Math.random().toString(36).substr(2, 9))
    }
    
    return element.tagName + '_' + Math.random().toString(36).substr(2, 9)
  }

  destroy(): void {
    document.removeEventListener('touchstart', this.handleTouchStart.bind(this))
    document.removeEventListener('touchmove', this.handleTouchMove.bind(this))
    document.removeEventListener('touchend', this.handleTouchEnd.bind(this))
    document.removeEventListener('touchcancel', this.handleTouchCancel.bind(this))
    
    this.activeGestures.clear()
    
    if (this.tapTimeout) {
      clearTimeout(this.tapTimeout)
    }
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout)
    }
  }
}

// Singleton instance
export const touchGestureManager = new TouchGestureManager()