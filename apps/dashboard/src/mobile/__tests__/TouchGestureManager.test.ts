/**
 * Touch Gesture Manager Tests
 */

import { TouchGestureManager } from '../TouchGestureManager'
import { SwipeHandler, TapHandler, PinchConfig } from '../types'

// Mock DOM methods
Object.defineProperty(window, 'addEventListener', {
  value: jest.fn()
})

Object.defineProperty(document, 'addEventListener', {
  value: jest.fn()
})

describe('TouchGestureManager', () => {
  let gestureManager: TouchGestureManager
  let mockElement: HTMLElement

  beforeEach(() => {
    gestureManager = new TouchGestureManager()
    mockElement = document.createElement('div')
    mockElement.id = 'test-element'
    
    // Mock getBoundingClientRect
    mockElement.getBoundingClientRect = jest.fn(() => ({
      top: 0,
      left: 0,
      width: 100,
      height: 100,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: jest.fn()
    }))
  })

  afterEach(() => {
    gestureManager.destroy()
    jest.clearAllMocks()
  })

  describe('Swipe Gesture Recognition', () => {
    it('should register swipe handler correctly', () => {
      const swipeHandler: SwipeHandler = {
        onSwipe: jest.fn(),
        onSwipeStart: jest.fn(),
        onSwipeEnd: jest.fn()
      }

      gestureManager.registerSwipeHandler(mockElement, swipeHandler)
      
      expect((mockElement as any).__swipeHandler).toBe(swipeHandler)
    })

    it('should detect horizontal swipe gestures', () => {
      const swipeHandler: SwipeHandler = {
        onSwipe: jest.fn()
      }

      gestureManager.registerSwipeHandler(mockElement, swipeHandler)

      // Mock the touch event target
      const mockTarget = mockElement
      
      // Simulate touch events for right swipe
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 10, clientY: 50 } as Touch]
      })
      Object.defineProperty(touchStart, 'target', { value: mockTarget })
      
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 80, clientY: 50 } as Touch]
      })
      Object.defineProperty(touchEnd, 'target', { value: mockTarget })

      // Mock the private methods by accessing them through the instance
      ;(gestureManager as any).handleTouchStart(touchStart)
      ;(gestureManager as any).touchEndPosition = { x: 80, y: 50 }
      ;(gestureManager as any).handleTouchEnd(touchEnd)

      expect(swipeHandler.onSwipe).toHaveBeenCalledWith('right', expect.any(Number), expect.any(Number))
    })

    it('should detect vertical swipe gestures', () => {
      const swipeHandler: SwipeHandler = {
        onSwipe: jest.fn()
      }

      gestureManager.registerSwipeHandler(mockElement, swipeHandler)

      // Simulate touch events for down swipe
      ;(gestureManager as any).touchStartPosition = { x: 50, y: 10 }
      ;(gestureManager as any).touchEndPosition = { x: 50, y: 80 }
      ;(gestureManager as any).touchStartTime = Date.now() - 200

      const direction = (gestureManager as any).getSwipeDirection(
        { x: 50, y: 10 }, 
        { x: 50, y: 80 }
      )

      expect(direction).toBe('down')
    })
  })

  describe('Tap Gesture Recognition', () => {
    it('should register tap handler correctly', () => {
      const tapHandler: TapHandler = {
        onTap: jest.fn(),
        onDoubleTap: jest.fn(),
        onLongPress: jest.fn()
      }

      gestureManager.addTapGesture(mockElement, tapHandler)
      
      expect((mockElement as any).__tapHandler).toBe(tapHandler)
    })

    it('should detect single tap', (done) => {
      const tapHandler: TapHandler = {
        onTap: jest.fn(() => {
          expect(tapHandler.onTap).toHaveBeenCalledWith({ x: 50, y: 50 })
          done()
        })
      }

      gestureManager.addTapGesture(mockElement, tapHandler)

      // Simulate tap
      ;(gestureManager as any).handleTap(mockElement, { x: 50, y: 50 })
    })

    it('should detect double tap', (done) => {
      const tapHandler: TapHandler = {
        onTap: jest.fn(),
        onDoubleTap: jest.fn(() => {
          expect(tapHandler.onDoubleTap).toHaveBeenCalledWith({ x: 50, y: 50 })
          done()
        })
      }

      gestureManager.addTapGesture(mockElement, tapHandler)

      // Simulate double tap
      ;(gestureManager as any).handleTap(mockElement, { x: 50, y: 50 })
      ;(gestureManager as any).handleTap(mockElement, { x: 50, y: 50 })
    })

    it('should detect long press', (done) => {
      const tapHandler: TapHandler = {
        onTap: jest.fn(),
        onLongPress: jest.fn(() => {
          expect(tapHandler.onLongPress).toHaveBeenCalledWith({ x: 50, y: 50 })
          done()
        })
      }

      gestureManager.addTapGesture(mockElement, tapHandler)

      // Simulate long press
      ;(gestureManager as any).handleLongPress(mockElement, { x: 50, y: 50 })
    })
  })

  describe('Pinch Gesture Recognition', () => {
    it('should register pinch configuration correctly', () => {
      const pinchConfig: PinchConfig = {
        minScale: 0.5,
        maxScale: 3.0,
        onPinch: jest.fn()
      }

      gestureManager.enablePinchZoom(mockElement, pinchConfig)
      
      expect((mockElement as any).__pinchConfig).toBe(pinchConfig)
    })

    it('should calculate distance between two points correctly', () => {
      const distance = (gestureManager as any).getDistance(
        { x: 0, y: 0 },
        { x: 3, y: 4 }
      )

      expect(distance).toBe(5) // 3-4-5 triangle
    })

    it('should calculate center point between two touches', () => {
      const center = (gestureManager as any).getCenterPoint(
        { clientX: 10, clientY: 20 },
        { clientX: 30, clientY: 40 }
      )

      expect(center).toEqual({ x: 20, y: 30 })
    })

    it('should handle pinch gesture with scale clamping', () => {
      const pinchConfig: PinchConfig = {
        minScale: 0.5,
        maxScale: 2.0,
        onPinch: jest.fn()
      }

      gestureManager.enablePinchZoom(mockElement, pinchConfig)

      // Simulate pinch with scale beyond max
      ;(gestureManager as any).handlePinch(mockElement, 3.0, { x: 50, y: 50 })

      expect(pinchConfig.onPinch).toHaveBeenCalledWith(2.0, { x: 50, y: 50 })
    })
  })

  describe('Scroll Bounce Prevention', () => {
    it('should prevent scroll bounce on element', () => {
      const addEventListener = jest.fn()
      mockElement.addEventListener = addEventListener

      gestureManager.preventScrollBounce(mockElement)

      expect(addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: true })
      expect(addEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function), { passive: false })
    })
  })

  describe('Utility Methods', () => {
    it('should generate element ID when none exists', () => {
      const elementWithoutId = document.createElement('div')
      const id = (gestureManager as any).getElementId(elementWithoutId)

      expect(id).toMatch(/DIV_/)
    })

    it('should use existing element ID', () => {
      mockElement.id = 'custom-id'
      const id = (gestureManager as any).getElementId(mockElement)

      expect(id).toBe('custom-id')
    })

    it('should determine swipe direction correctly', () => {
      const getSwipeDirection = (gestureManager as any).getSwipeDirection.bind(gestureManager)

      expect(getSwipeDirection({ x: 0, y: 0 }, { x: 50, y: 10 })).toBe('right')
      expect(getSwipeDirection({ x: 50, y: 0 }, { x: 0, y: 10 })).toBe('left')
      expect(getSwipeDirection({ x: 0, y: 0 }, { x: 10, y: 50 })).toBe('down')
      expect(getSwipeDirection({ x: 0, y: 50 }, { x: 10, y: 0 })).toBe('up')
    })
  })

  describe('Cleanup', () => {
    it('should clean up event listeners and timeouts on destroy', () => {
      const removeEventListener = jest.spyOn(document, 'removeEventListener')
      
      gestureManager.destroy()

      expect(removeEventListener).toHaveBeenCalled()
    })
  })
})