/**
 * Mobile Optimizer Tests
 */

import { MobileOptimizer } from '../MobileOptimizer'

// Mock window and navigator objects
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024
})

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768
})

Object.defineProperty(window, 'devicePixelRatio', {
  writable: true,
  configurable: true,
  value: 2
})

Object.defineProperty(navigator, 'userAgent', {
  writable: true,
  configurable: true,
  value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
})

Object.defineProperty(navigator, 'maxTouchPoints', {
  writable: true,
  configurable: true,
  value: 5
})

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}))

describe('MobileOptimizer', () => {
  let optimizer: MobileOptimizer

  beforeEach(() => {
    optimizer = new MobileOptimizer()
  })

  afterEach(() => {
    optimizer.destroy()
    jest.clearAllMocks()
  })

  describe('Device Detection', () => {
    it('should detect mobile device correctly', () => {
      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      Object.defineProperty(window, 'innerHeight', { value: 667 })
      
      const mobileOptimizer = new MobileOptimizer()
      const deviceInfo = mobileOptimizer.getDeviceInfo()

      expect(deviceInfo.type).toBe('mobile')
      expect(deviceInfo.platform.isMobile).toBe(true)
      expect(deviceInfo.touchCapable).toBe(true)
      
      mobileOptimizer.destroy()
    })

    it('should detect tablet device correctly', () => {
      // Set tablet viewport
      Object.defineProperty(window, 'innerWidth', { value: 768 })
      Object.defineProperty(window, 'innerHeight', { value: 1024 })
      Object.defineProperty(navigator, 'userAgent', { 
        value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      })
      
      const tabletOptimizer = new MobileOptimizer()
      const deviceInfo = tabletOptimizer.getDeviceInfo()

      expect(deviceInfo.type).toBe('tablet')
      expect(deviceInfo.platform.isTablet).toBe(true)
      
      tabletOptimizer.destroy()
    })

    it('should detect desktop device correctly', () => {
      // Set desktop viewport
      Object.defineProperty(window, 'innerWidth', { value: 1920 })
      Object.defineProperty(window, 'innerHeight', { value: 1080 })
      Object.defineProperty(navigator, 'userAgent', { 
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      })
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 0 })
      
      const desktopOptimizer = new MobileOptimizer()
      const deviceInfo = desktopOptimizer.getDeviceInfo()

      expect(deviceInfo.type).toBe('desktop')
      expect(deviceInfo.platform.isMobile).toBe(false)
      expect(deviceInfo.touchCapable).toBe(false)
      
      desktopOptimizer.destroy()
    })
  })

  describe('Operating System Detection', () => {
    it('should detect iOS correctly', () => {
      Object.defineProperty(navigator, 'userAgent', { 
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      })
      
      const iosOptimizer = new MobileOptimizer()
      const deviceInfo = iosOptimizer.getDeviceInfo()

      expect(deviceInfo.platform.os).toBe('ios')
      
      iosOptimizer.destroy()
    })

    it('should detect Android correctly', () => {
      Object.defineProperty(navigator, 'userAgent', { 
        value: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36'
      })
      
      const androidOptimizer = new MobileOptimizer()
      const deviceInfo = androidOptimizer.getDeviceInfo()

      expect(deviceInfo.platform.os).toBe('android')
      
      androidOptimizer.destroy()
    })

    it('should detect Windows correctly', () => {
      Object.defineProperty(navigator, 'userAgent', { 
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      })
      
      const windowsOptimizer = new MobileOptimizer()
      const deviceInfo = windowsOptimizer.getDeviceInfo()

      expect(deviceInfo.platform.os).toBe('windows')
      
      windowsOptimizer.destroy()
    })
  })

  describe('Browser Detection', () => {
    it('should detect Chrome correctly', () => {
      Object.defineProperty(navigator, 'userAgent', { 
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      })
      
      const chromeOptimizer = new MobileOptimizer()
      const deviceInfo = chromeOptimizer.getDeviceInfo()

      expect(deviceInfo.browserInfo.name).toBe('Chrome')
      
      chromeOptimizer.destroy()
    })

    it('should detect Safari correctly', () => {
      Object.defineProperty(navigator, 'userAgent', { 
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
      })
      
      const safariOptimizer = new MobileOptimizer()
      const deviceInfo = safariOptimizer.getDeviceInfo()

      expect(deviceInfo.browserInfo.name).toBe('Safari')
      
      safariOptimizer.destroy()
    })
  })

  describe('Breakpoint Detection', () => {
    it('should return mobile breakpoint for small screens', () => {
      Object.defineProperty(window, 'innerWidth', { value: 600 })
      
      const breakpoint = optimizer.getCurrentBreakpoint()
      expect(breakpoint).toBe('mobile')
    })

    it('should return tablet breakpoint for medium screens', () => {
      Object.defineProperty(window, 'innerWidth', { value: 900 })
      
      const breakpoint = optimizer.getCurrentBreakpoint()
      expect(breakpoint).toBe('tablet')
    })

    it('should return desktop breakpoint for large screens', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1400 })
      
      const breakpoint = optimizer.getCurrentBreakpoint()
      expect(breakpoint).toBe('desktop')
    })
  })

  describe('Layout Adaptation', () => {
    it('should adapt layout for mobile screens', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      
      const originalLayout = {
        columns: 3,
        spacing: 16,
        padding: 24,
        fontSize: 'lg'
      }

      const adaptedLayout = optimizer.adaptLayoutForScreen(originalLayout, {
        width: 375,
        height: 667,
        pixelRatio: 2
      })

      expect(adaptedLayout.columns).toBe(1)
      expect(adaptedLayout.fontSize).toBe('sm')
      expect(adaptedLayout.navigation.type).toBe('bottom-tabs')
    })

    it('should adapt layout for tablet screens', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768 })
      
      const originalLayout = {
        columns: 4,
        spacing: 16,
        padding: 24
      }

      const adaptedLayout = optimizer.adaptLayoutForScreen(originalLayout, {
        width: 768,
        height: 1024,
        pixelRatio: 2
      })

      expect(adaptedLayout.columns).toBe(2)
      expect(adaptedLayout.fontSize).toBe('md')
    })
  })

  describe('Touch Gesture Enablement', () => {
    it('should enable touch gestures on touch devices', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 5 })
      
      const touchOptimizer = new MobileOptimizer()
      const element = document.createElement('div')
      element.style.width = '20px'
      element.style.height = '20px'

      touchOptimizer.enableTouchGestures(element, [])

      expect(element.classList.contains('touch-enabled')).toBe(true)
      expect(element.style.minWidth).toBe('44px')
      expect(element.style.minHeight).toBe('44px')
      
      touchOptimizer.destroy()
    })

    it('should not enable touch gestures on non-touch devices', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 0 })
      
      const nonTouchOptimizer = new MobileOptimizer()
      const element = document.createElement('div')

      nonTouchOptimizer.enableTouchGestures(element, [])

      expect(element.classList.contains('touch-enabled')).toBe(false)
      
      nonTouchOptimizer.destroy()
    })
  })

  describe('Chart Optimization', () => {
    it('should optimize charts for mobile devices', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      
      const mobileOptimizer = new MobileOptimizer()
      const originalChart = {
        width: 800,
        height: 600,
        data: Array.from({ length: 100 }, (_, i) => ({ x: i, y: Math.random() })),
        interactions: {
          hover: true,
          zoom: true,
          pan: true,
          brush: true
        }
      }

      const optimizedChart = mobileOptimizer.optimizeChartsForMobile(originalChart)

      expect(optimizedChart.width).toBeLessThan(originalChart.width)
      expect(optimizedChart.height).toBeLessThan(originalChart.height)
      expect(optimizedChart.data.length).toBeLessThan(originalChart.data.length)
      expect(optimizedChart.interactions.hover).toBe(false)
      expect(optimizedChart.interactions.brush).toBe(false)
      
      mobileOptimizer.destroy()
    })

    it('should not optimize charts for desktop devices', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1920 })
      
      const desktopOptimizer = new MobileOptimizer()
      const originalChart = {
        width: 800,
        height: 600,
        data: Array.from({ length: 100 }, (_, i) => ({ x: i, y: Math.random() }))
      }

      const result = desktopOptimizer.optimizeChartsForMobile(originalChart)

      expect(result).toBe(originalChart)
      
      desktopOptimizer.destroy()
    })
  })

  describe('Orientation Handling', () => {
    it('should handle orientation change correctly', () => {
      const orientationCallback = jest.fn()
      optimizer.onOrientationChange(orientationCallback)

      // Simulate orientation change
      Object.defineProperty(window, 'innerWidth', { value: 667 })
      Object.defineProperty(window, 'innerHeight', { value: 375 })

      optimizer.handleOrientationChange('landscape')

      expect(orientationCallback).toHaveBeenCalledWith('landscape')
    })

    it('should dispatch orientation change event', () => {
      const eventListener = jest.fn()
      window.addEventListener('orientationchange', eventListener)

      optimizer.handleOrientationChange('portrait')

      expect(eventListener).toHaveBeenCalled()
    })
  })

  describe('Utility Methods', () => {
    it('should correctly identify mobile device', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      
      const mobileOptimizer = new MobileOptimizer()
      
      expect(mobileOptimizer.isMobile()).toBe(true)
      expect(mobileOptimizer.isTablet()).toBe(false)
      
      mobileOptimizer.destroy()
    })

    it('should correctly identify tablet device', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768 })
      Object.defineProperty(navigator, 'userAgent', { 
        value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      })
      
      const tabletOptimizer = new MobileOptimizer()
      
      expect(tabletOptimizer.isMobile()).toBe(false)
      expect(tabletOptimizer.isTablet()).toBe(true)
      
      tabletOptimizer.destroy()
    })

    it('should correctly identify touch device', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 5 })
      
      const touchOptimizer = new MobileOptimizer()
      
      expect(touchOptimizer.isTouchDevice()).toBe(true)
      
      touchOptimizer.destroy()
    })
  })

  describe('Cleanup', () => {
    it('should clean up observers and callbacks on destroy', () => {
      const mockDisconnect = jest.fn()
      ;(optimizer as any).resizeObserver = { disconnect: mockDisconnect }

      optimizer.destroy()

      expect(mockDisconnect).toHaveBeenCalled()
      expect((optimizer as any).orientationChangeCallbacks).toEqual([])
    })
  })
})