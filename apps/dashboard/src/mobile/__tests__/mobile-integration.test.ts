/**
 * Mobile Integration Tests
 * Tests the complete mobile optimization system working together
 */

import { touchGestureManager } from '../TouchGestureManager'
import { mobileOptimizer } from '../MobileOptimizer'
import { mobileChartOptimizer } from '../MobileChartOptimizer'
import { offlineSyncManager } from '../OfflineSyncManager'
import { mobileNotificationManager } from '../MobileNotificationManager'

// Mock IndexedDB
const mockIDBRequest = {
  onsuccess: null as any,
  onerror: null as any,
  onupgradeneeded: null as any,
  result: null as any
}

const mockIDBDatabase = {
  createObjectStore: jest.fn(() => ({
    createIndex: jest.fn()
  })),
  transaction: jest.fn(() => ({
    objectStore: jest.fn(() => ({
      get: jest.fn(() => {
        const req = { ...mockIDBRequest }
        setTimeout(() => {
          req.result = { data: { id: 'chart-1', data: [{ x: 1, y: 10 }, { x: 2, y: 20 }] } }
          if (req.onsuccess) req.onsuccess()
        }, 0)
        return req
      }),
      put: jest.fn(() => {
        const req = { ...mockIDBRequest }
        setTimeout(() => {
          if (req.onsuccess) req.onsuccess()
        }, 0)
        return req
      }),
      add: jest.fn(() => mockIDBRequest),
      clear: jest.fn(() => mockIDBRequest),
      getAll: jest.fn(() => mockIDBRequest)
    }))
  })),
  close: jest.fn(),
  objectStoreNames: {
    contains: jest.fn(() => false)
  }
}

Object.defineProperty(global, 'indexedDB', {
  value: {
    open: jest.fn(() => {
      setTimeout(() => {
        if (mockIDBRequest.onupgradeneeded) {
          mockIDBRequest.onupgradeneeded({ target: { result: mockIDBDatabase } })
        }
        if (mockIDBRequest.onsuccess) {
          mockIDBRequest.result = mockIDBDatabase
          mockIDBRequest.onsuccess()
        }
      }, 0)
      return mockIDBRequest
    })
  },
  configurable: true
})

// Mock Service Worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    ready: Promise.resolve({
      showNotification: jest.fn(),
      getNotifications: jest.fn(() => Promise.resolve([])),
      sync: {
        register: jest.fn()
      },
      pushManager: {
        getSubscription: jest.fn(() => Promise.resolve(null)),
        subscribe: jest.fn(() => Promise.resolve({
          toJSON: jest.fn(() => ({}))
        }))
      }
    }),
    addEventListener: jest.fn()
  }
})

// Mock Notification API
Object.defineProperty(window, 'Notification', {
  value: class MockNotification {
    static permission: NotificationPermission = 'granted'
    static requestPermission = jest.fn(() => Promise.resolve('granted' as NotificationPermission))
    
    constructor(public title: string, public options?: NotificationOptions) {}
    close = jest.fn()
  }
})

describe('Mobile Integration Tests', () => {
  let mockElement: HTMLElement

  beforeEach(() => {
    mockElement = document.createElement('div')
    mockElement.id = 'test-chart'
    document.body.appendChild(mockElement)

    // Reset mocks
    jest.clearAllMocks()
  })

  afterEach(() => {
    document.body.removeChild(mockElement)
  })

  describe('Touch Gestures + Chart Optimization Integration', () => {
    it('should integrate touch gestures with chart optimization', async () => {
      // Setup mobile environment
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true })

      // Create a chart
      const chartData = {
        data: Array.from({ length: 100 }, (_, i) => ({ x: i, y: Math.random() })),
        width: 800,
        height: 600
      }

      // Optimize chart for mobile
      const optimizedChart = mobileChartOptimizer.optimizeChart(mockElement, chartData)

      expect(optimizedChart.data.length).toBeLessThan(chartData.data.length)
      expect(optimizedChart.layout.width).toBeLessThan(chartData.width)

      // Setup touch gestures on the chart
      const swipeHandler = jest.fn()
      touchGestureManager.registerSwipeHandler(mockElement, {
        onSwipe: swipeHandler
      })

      // Simulate swipe gesture
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch]
      })
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 200, clientY: 100 } as Touch]
      })

      // Trigger touch events
      ;(touchGestureManager as any).handleTouchStart(touchStart)
      ;(touchGestureManager as any).touchEndPosition = { x: 200, y: 100 }
      ;(touchGestureManager as any).touchStartTime = Date.now() - 200
      ;(touchGestureManager as any).handleTouchEnd(touchEnd)

      // Verify integration
      expect(swipeHandler).toHaveBeenCalledWith('right', expect.any(Number), expect.any(Number))
    })

    it('should handle pinch zoom on mobile charts', () => {
      const pinchHandler = jest.fn()
      
      touchGestureManager.enablePinchZoom(mockElement, {
        minScale: 0.5,
        maxScale: 3.0,
        onPinch: pinchHandler
      })

      // Simulate pinch gesture
      ;(touchGestureManager as any).handlePinch(mockElement, 1.5, { x: 100, y: 100 })

      expect(pinchHandler).toHaveBeenCalledWith(1.5, { x: 100, y: 100 })
    })
  })

  describe('Offline Sync + Mobile Optimization Integration', () => {
    it('should sync data when mobile device comes online', async () => {
      // Setup offline environment
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

      // Queue some actions while offline
      await offlineSyncManager.queueAction({
        type: 'create',
        data: { id: '1', name: 'Test Item' }
      })

      expect(offlineSyncManager.getSyncQueueLength()).toBe(1)

      // Mock fetch for sync
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })
      ) as jest.Mock

      // Simulate coming online
      Object.defineProperty(navigator, 'onLine', { value: true })
      window.dispatchEvent(new Event('online'))

      // Wait for sync to complete
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify sync occurred
      expect(global.fetch).toHaveBeenCalledWith('/api/sync', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }))
    })

    it('should cache chart data for offline access', async () => {
      const chartData = {
        id: 'chart-1',
        data: [{ x: 1, y: 10 }, { x: 2, y: 20 }]
      }

      await offlineSyncManager.setCachedData('chart-1', chartData, 'chart')

      const cachedData = await offlineSyncManager.getCachedData('chart-1')
      expect(cachedData).toEqual(chartData)
    })
  })

  describe('Mobile Notifications + Device Integration', () => {
    it('should show mobile-optimized notifications', async () => {
      const notification = {
        id: 'test-1',
        title: 'Test Notification',
        body: 'This is a test notification',
        badge: 1
      }

      const result = await mobileNotificationManager.showNotification(notification)
      expect(result).toBe(true)
    })

    it('should handle notification permissions', async () => {
      const hasPermission = await mobileNotificationManager.requestPermission()
      expect(hasPermission).toBe(true)
    })

    it('should update app badge count', () => {
      // Mock setAppBadge
      Object.defineProperty(navigator, 'setAppBadge', {
        value: jest.fn(),
        configurable: true
      })

      mobileNotificationManager.updateBadgeCount(5)
      expect((navigator as any).setAppBadge).toHaveBeenCalledWith(5)
    })
  })

  describe('Responsive Layout + Touch Optimization Integration', () => {
    it('should adapt layout and enable touch gestures together', () => {
      // Setup mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true })

      const originalLayout = {
        columns: 3,
        spacing: 16,
        navigation: { type: 'top-nav' }
      }

      // Adapt layout for mobile
      const adaptedLayout = mobileOptimizer.adaptLayoutForScreen(originalLayout, {
        width: 375,
        height: 667,
        pixelRatio: 2
      })

      expect(adaptedLayout.columns).toBe(1)
      expect(adaptedLayout.navigation.type).toBe('bottom-tabs')

      // Enable touch gestures
      mobileOptimizer.enableTouchGestures(mockElement, [])
      expect(mockElement.classList.contains('touch-enabled')).toBe(true)
    })
  })

  describe('Performance Optimization Integration', () => {
    it('should optimize chart data for mobile performance', () => {
      // Large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({ x: i, y: Math.random() }))
      
      const chartData = {
        data: largeDataset,
        width: 1200,
        height: 800
      }

      // Setup mobile environment
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })

      const optimizedChart = mobileChartOptimizer.optimizeChart(mockElement, chartData)

      // Verify performance optimizations
      expect(optimizedChart.data.length).toBeLessThan(100) // Data sampling
      expect(optimizedChart.layout.width).toBeLessThan(400) // Size optimization
      expect(optimizedChart.config.simplifiedView).toBe(true)
    })

    it('should handle memory management for mobile devices', () => {
      // Test cleanup methods
      expect(() => {
        touchGestureManager.destroy()
        mobileOptimizer.destroy()
        offlineSyncManager.destroy()
      }).not.toThrow()
    })
  })

  describe('Cross-Feature Event Handling', () => {
    it('should coordinate events across mobile features', () => {
      const eventListener = jest.fn()

      // Listen for custom mobile events
      window.addEventListener('chartZoom', eventListener)
      window.addEventListener('notificationClick', eventListener)

      // Simulate chart zoom event
      mockElement.dispatchEvent(new CustomEvent('chartZoom', {
        detail: { scale: 1.5, center: { x: 100, y: 100 } }
      }))

      // Simulate notification click event
      window.dispatchEvent(new CustomEvent('notificationClick', {
        detail: { notification: { id: 'test' }, action: 'view' }
      }))

      expect(eventListener).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error Handling and Fallbacks', () => {
    it('should gracefully handle unsupported features', () => {
      // Remove touch support
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true })

      // Should not throw errors
      expect(() => {
        mobileOptimizer.enableTouchGestures(mockElement, [])
        touchGestureManager.registerSwipeHandler(mockElement, { onSwipe: jest.fn() })
      }).not.toThrow()
    })

    it('should handle offline sync failures gracefully', async () => {
      // Mock failed fetch
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error'))) as jest.Mock

      await offlineSyncManager.queueAction({
        type: 'create',
        data: { id: '1', name: 'Test' }
      })

      // Should not throw and should maintain queue
      const result = await offlineSyncManager.syncWhenOnline()
      expect(result.success).toBe(false)
      expect(offlineSyncManager.getSyncQueueLength()).toBeGreaterThan(0)
    })

    it('should handle notification API unavailability', async () => {
      // Remove Notification API
      delete (window as any).Notification

      const result = await mobileNotificationManager.showNotification({
        id: 'test',
        title: 'Test',
        body: 'Test notification'
      })

      expect(result).toBe(false)
    })
  })

  describe('Device-Specific Optimizations', () => {
    it('should apply iOS-specific optimizations', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        configurable: true
      })

      const iosOptimizer = new (require('../MobileOptimizer').MobileOptimizer)()
      const deviceInfo = iosOptimizer.getDeviceInfo()

      expect(deviceInfo.platform.os).toBe('ios')
      expect(deviceInfo.touchCapable).toBe(true)

      iosOptimizer.destroy()
    })

    it('should apply Android-specific optimizations', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36',
        configurable: true
      })

      const androidOptimizer = new (require('../MobileOptimizer').MobileOptimizer)()
      const deviceInfo = androidOptimizer.getDeviceInfo()

      expect(deviceInfo.platform.os).toBe('android')
      expect(deviceInfo.touchCapable).toBe(true)

      androidOptimizer.destroy()
    })
  })
})