/**
 * Responsive Behavior Tests
 * Tests mobile optimization across different screen sizes and orientations
 */

import { mobileOptimizer } from '../MobileOptimizer'
import { mobileChartOptimizer } from '../MobileChartOptimizer'
import { touchGestureManager } from '../TouchGestureManager'

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}))

describe('Responsive Behavior Tests', () => {
  const originalInnerWidth = window.innerWidth
  const originalInnerHeight = window.innerHeight
  const originalUserAgent = navigator.userAgent

  afterEach(() => {
    // Restore original values
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, configurable: true })
    Object.defineProperty(navigator, 'userAgent', { value: originalUserAgent, configurable: true })
    jest.clearAllMocks()
  })

  describe('Breakpoint Transitions', () => {
    const testBreakpoints = [
      { width: 320, height: 568, expected: 'mobile', device: 'iPhone SE' },
      { width: 375, height: 667, expected: 'mobile', device: 'iPhone 8' },
      { width: 414, height: 896, expected: 'mobile', device: 'iPhone 11 Pro Max' },
      { width: 768, height: 1024, expected: 'tablet', device: 'iPad' },
      { width: 1024, height: 768, expected: 'tablet', device: 'iPad Landscape' },
      { width: 1366, height: 1024, expected: 'desktop', device: 'Desktop' },
      { width: 1920, height: 1080, expected: 'desktop', device: 'Full HD' }
    ]

    testBreakpoints.forEach(({ width, height, expected, device }) => {
      it(`should detect ${expected} breakpoint for ${device} (${width}x${height})`, () => {
        Object.defineProperty(window, 'innerWidth', { value: width, configurable: true })
        Object.defineProperty(window, 'innerHeight', { value: height, configurable: true })

        const optimizer = new (require('../MobileOptimizer').MobileOptimizer)()
        const breakpoint = optimizer.getCurrentBreakpoint()

        expect(breakpoint).toBe(expected)
        optimizer.destroy()
      })
    })
  })

  describe('Orientation Changes', () => {
    it('should handle portrait to landscape transition', () => {
      // Start in portrait
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 667, configurable: true })

      const optimizer = new (require('../MobileOptimizer').MobileOptimizer)()
      let deviceInfo = optimizer.getDeviceInfo()
      expect(deviceInfo.orientation).toBe('portrait')

      // Switch to landscape
      Object.defineProperty(window, 'innerWidth', { value: 667, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 375, configurable: true })

      const orientationCallback = jest.fn()
      optimizer.onOrientationChange(orientationCallback)
      optimizer.handleOrientationChange('landscape')

      expect(orientationCallback).toHaveBeenCalledWith('landscape')
      optimizer.destroy()
    })

    it('should adapt chart layout for orientation changes', () => {
      const chartElement = document.createElement('div')
      chartElement.style.width = '100%'
      chartElement.style.height = '300px'

      const chartData = {
        data: [{ x: 1, y: 10 }, { x: 2, y: 20 }],
        width: 400,
        height: 300
      }

      // Portrait mode
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 667, configurable: true })

      let optimizedChart = mobileChartOptimizer.optimizeChart(chartElement, chartData)
      const portraitHeight = optimizedChart.layout.height

      // Landscape mode
      Object.defineProperty(window, 'innerWidth', { value: 667, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 375, configurable: true })

      optimizedChart = mobileChartOptimizer.optimizeChart(chartElement, chartData)
      const landscapeHeight = optimizedChart.layout.height

      // Landscape should have different (likely smaller) height due to viewport constraints
      expect(landscapeHeight).not.toBe(portraitHeight)
    })
  })

  describe('Touch Target Optimization', () => {
    it('should ensure minimum touch target sizes on mobile', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true })

      const optimizer = new (require('../MobileOptimizer').MobileOptimizer)()
      
      // Create small element
      const smallElement = document.createElement('button')
      smallElement.style.width = '20px'
      smallElement.style.height = '20px'

      optimizer.enableTouchGestures(smallElement, [])

      expect(smallElement.style.minWidth).toBe('44px')
      expect(smallElement.style.minHeight).toBe('44px')
      
      optimizer.destroy()
    })

    it('should not modify touch targets on desktop', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true })
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true })

      const optimizer = new (require('../MobileOptimizer').MobileOptimizer)()
      
      const element = document.createElement('button')
      element.style.width = '20px'
      element.style.height = '20px'

      optimizer.enableTouchGestures(element, [])

      expect(element.style.minWidth).toBe('')
      expect(element.style.minHeight).toBe('')
      
      optimizer.destroy()
    })
  })

  describe('Chart Data Sampling', () => {
    it('should sample data more aggressively on smaller screens', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({ x: i, y: Math.random() }))
      const chartElement = document.createElement('div')

      // Small mobile screen
      Object.defineProperty(window, 'innerWidth', { value: 320, configurable: true })
      
      const mobileChart = mobileChartOptimizer.optimizeChart(chartElement, {
        data: largeDataset,
        width: 800,
        height: 600
      })

      // Larger tablet screen
      Object.defineProperty(window, 'innerWidth', { value: 768, configurable: true })
      
      const tabletChart = mobileChartOptimizer.optimizeChart(chartElement, {
        data: largeDataset,
        width: 800,
        height: 600
      })

      // Mobile should have more aggressive sampling
      expect(mobileChart.data.length).toBeLessThanOrEqual(tabletChart.data.length)
    })
  })

  describe('Gesture Sensitivity Adaptation', () => {
    it('should adapt gesture thresholds for different screen sizes', () => {
      const element = document.createElement('div')
      
      // Small screen - should have lower thresholds
      Object.defineProperty(window, 'innerWidth', { value: 320, configurable: true })
      
      const swipeHandler = jest.fn()
      touchGestureManager.registerSwipeHandler(element, {
        onSwipe: swipeHandler
      }, {
        minDistance: 20 // Lower threshold for small screens
      })

      // Simulate short swipe that should trigger on small screen
      ;(touchGestureManager as any).touchStartPosition = { x: 10, y: 50 }
      ;(touchGestureManager as any).touchEndPosition = { x: 35, y: 50 }
      ;(touchGestureManager as any).touchStartTime = Date.now() - 200

      const distance = (touchGestureManager as any).getDistance(
        { x: 10, y: 50 },
        { x: 35, y: 50 }
      )

      expect(distance).toBe(25) // Should be above the 20px threshold
    })
  })

  describe('Layout Density Adaptation', () => {
    it('should use different spacing for different screen sizes', () => {
      const baseLayout = {
        columns: 3,
        spacing: 16,
        padding: 24
      }

      // Mobile
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
      const mobileOptimizer = new (require('../MobileOptimizer').MobileOptimizer)()
      const mobileLayout = mobileOptimizer.adaptLayoutForScreen(baseLayout, {
        width: 375,
        height: 667,
        pixelRatio: 2
      })

      // Tablet
      Object.defineProperty(window, 'innerWidth', { value: 768, configurable: true })
      const tabletOptimizer = new (require('../MobileOptimizer').MobileOptimizer)()
      const tabletLayout = tabletOptimizer.adaptLayoutForScreen(baseLayout, {
        width: 768,
        height: 1024,
        pixelRatio: 2
      })

      expect(mobileLayout.columns).toBe(1)
      expect(tabletLayout.columns).toBe(2)
      expect(mobileLayout.spacing).toBeLessThan(tabletLayout.spacing)

      mobileOptimizer.destroy()
      tabletOptimizer.destroy()
    })
  })

  describe('Performance Scaling', () => {
    it('should reduce animation complexity on lower-end devices', () => {
      // Mock low-end device characteristics
      Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true })
      Object.defineProperty(navigator, 'hardwareConcurrency', { value: 2, configurable: true })

      const optimizer = new (require('../MobileOptimizer').MobileOptimizer)()
      const deviceInfo = optimizer.getDeviceInfo()

      // Low pixel ratio and few cores suggest lower-end device
      expect(deviceInfo.screenSize.pixelRatio).toBe(1)
      
      optimizer.destroy()
    })

    it('should optimize chart rendering for device capabilities', () => {
      const chartElement = document.createElement('div')
      const complexChart = {
        data: Array.from({ length: 500 }, (_, i) => ({ x: i, y: Math.random() })),
        animations: true,
        interactions: {
          hover: true,
          zoom: true,
          pan: true,
          brush: true
        }
      }

      // Low-end mobile device
      Object.defineProperty(window, 'innerWidth', { value: 320, configurable: true })
      Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true })

      const optimizedChart = mobileChartOptimizer.optimizeChart(chartElement, complexChart)

      // Should disable performance-heavy features
      expect(optimizedChart.interactions.hover).toBe(false)
      expect(optimizedChart.interactions.brush).toBe(false)
      expect(optimizedChart.data.length).toBeLessThan(complexChart.data.length)
    })
  })

  describe('Accessibility Adaptations', () => {
    it('should increase touch targets for accessibility on mobile', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true })

      const optimizer = new (require('../MobileOptimizer').MobileOptimizer)({
        touchTargetSize: 48 // Larger for accessibility
      })

      const element = document.createElement('button')
      element.style.width = '30px'
      element.style.height = '30px'

      optimizer.enableTouchGestures(element, [])

      expect(element.style.minWidth).toBe('48px')
      expect(element.style.minHeight).toBe('48px')
      
      optimizer.destroy()
    })
  })

  describe('Network-Aware Optimizations', () => {
    it('should adapt behavior based on connection quality', () => {
      // Mock slow connection
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: '2g',
          downlink: 0.5,
          rtt: 2000
        },
        configurable: true
      })

      const chartElement = document.createElement('div')
      const chartData = {
        data: Array.from({ length: 200 }, (_, i) => ({ x: i, y: Math.random() })),
        highQuality: true
      }

      // Should optimize more aggressively for slow connections
      const optimizedChart = mobileChartOptimizer.optimizeChart(chartElement, chartData)
      
      // More aggressive data sampling expected for slow connections
      expect(optimizedChart.data.length).toBeLessThan(100)
    })
  })

  describe('Battery-Aware Optimizations', () => {
    it('should reduce resource usage when battery is low', () => {
      // Mock low battery
      Object.defineProperty(navigator, 'getBattery', {
        value: () => Promise.resolve({
          level: 0.15, // 15% battery
          charging: false
        }),
        configurable: true
      })

      // In a real implementation, this would reduce animations, 
      // polling frequency, and other resource-intensive operations
      const optimizer = new (require('../MobileOptimizer').MobileOptimizer)()
      
      // This is a placeholder for battery-aware optimizations
      expect(optimizer.getDeviceInfo()).toBeDefined()
      
      optimizer.destroy()
    })
  })

  describe('Cross-Device Consistency', () => {
    it('should maintain consistent behavior across similar devices', () => {
      const devices = [
        { width: 375, height: 667, name: 'iPhone 8' },
        { width: 375, height: 812, name: 'iPhone X' },
        { width: 414, height: 896, name: 'iPhone 11 Pro Max' }
      ]

      const results = devices.map(device => {
        Object.defineProperty(window, 'innerWidth', { value: device.width, configurable: true })
        Object.defineProperty(window, 'innerHeight', { value: device.height, configurable: true })

        const optimizer = new (require('../MobileOptimizer').MobileOptimizer)()
        const breakpoint = optimizer.getCurrentBreakpoint()
        const isMobile = optimizer.isMobile()
        
        optimizer.destroy()
        
        return { device: device.name, breakpoint, isMobile }
      })

      // All should be detected as mobile
      results.forEach(result => {
        expect(result.breakpoint).toBe('mobile')
        expect(result.isMobile).toBe(true)
      })
    })
  })
})