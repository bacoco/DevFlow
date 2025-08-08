/**
 * Mobile Optimizer
 * Handles responsive layouts, device detection, and mobile-specific optimizations
 */

import { DeviceInfo, ScreenSize, Platform, BrowserInfo, MobileLayoutConfig, MobileChartConfig } from './types'

export class MobileOptimizer {
  private deviceInfo: DeviceInfo
  private layoutConfig: MobileLayoutConfig
  private resizeObserver: ResizeObserver | null = null
  private orientationChangeCallbacks: Array<(orientation: 'portrait' | 'landscape') => void> = []

  constructor(layoutConfig?: Partial<MobileLayoutConfig>) {
    this.layoutConfig = {
      breakpoints: {
        mobile: 768,
        tablet: 1024,
        desktop: 1200
      },
      touchTargetSize: 44,
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32
      },
      navigation: {
        type: 'bottom-tabs',
        collapsible: true,
        swipeToOpen: true,
        overlay: false
      },
      ...layoutConfig
    }

    this.deviceInfo = this.detectDevice()
    this.setupOrientationListener()
    this.setupViewportListener()
  }

  getDeviceInfo(): DeviceInfo {
    return this.deviceInfo
  }

  isMobile(): boolean {
    return this.deviceInfo.type === 'mobile'
  }

  isTablet(): boolean {
    return this.deviceInfo.type === 'tablet'
  }

  isTouchDevice(): boolean {
    return this.deviceInfo.touchCapable
  }

  getCurrentBreakpoint(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth
    if (width < this.layoutConfig.breakpoints.mobile) {
      return 'mobile'
    } else if (width < this.layoutConfig.breakpoints.tablet) {
      return 'tablet'
    } else {
      return 'desktop'
    }
  }

  adaptLayoutForScreen(layout: any, screenSize: ScreenSize): any {
    const breakpoint = this.getCurrentBreakpoint()
    
    switch (breakpoint) {
      case 'mobile':
        return this.adaptForMobile(layout)
      case 'tablet':
        return this.adaptForTablet(layout)
      default:
        return layout
    }
  }

  enableTouchGestures(element: HTMLElement, gestures: any[]): void {
    if (!this.isTouchDevice()) return

    // Add touch-friendly classes
    element.classList.add('touch-enabled')
    
    // Ensure minimum touch target size
    const computedStyle = window.getComputedStyle(element)
    const width = parseInt(computedStyle.width)
    const height = parseInt(computedStyle.height)
    
    if (width < this.layoutConfig.touchTargetSize || height < this.layoutConfig.touchTargetSize) {
      element.style.minWidth = `${this.layoutConfig.touchTargetSize}px`
      element.style.minHeight = `${this.layoutConfig.touchTargetSize}px`
    }

    // Add touch feedback
    element.addEventListener('touchstart', () => {
      element.classList.add('touch-active')
    }, { passive: true })

    element.addEventListener('touchend', () => {
      setTimeout(() => element.classList.remove('touch-active'), 150)
    }, { passive: true })
  }

  optimizeChartsForMobile(chart: any): any {
    if (!this.isMobile()) return chart

    const mobileConfig: MobileChartConfig = {
      simplifiedView: true,
      touchInteractions: true,
      gestureZoom: true,
      swipeNavigation: true,
      compactLegend: true
    }

    return {
      ...chart,
      mobile: mobileConfig,
      // Reduce data points for performance
      data: this.simplifyChartData(chart.data),
      // Adjust dimensions
      width: Math.min(chart.width || 400, window.innerWidth - 32),
      height: Math.min(chart.height || 300, window.innerHeight * 0.4),
      // Simplify interactions
      interactions: this.simplifyChartInteractions(chart.interactions || {})
    }
  }

  handleOrientationChange(orientation: 'portrait' | 'landscape'): void {
    this.deviceInfo.orientation = orientation
    
    // Update viewport meta tag
    this.updateViewportMeta()
    
    // Trigger callbacks
    this.orientationChangeCallbacks.forEach(callback => callback(orientation))
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('orientationchange', {
      detail: { orientation }
    }))
  }

  onOrientationChange(callback: (orientation: 'portrait' | 'landscape') => void): void {
    this.orientationChangeCallbacks.push(callback)
  }

  private detectDevice(): DeviceInfo {
    const userAgent = navigator.userAgent
    const screenSize: ScreenSize = {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1
    }

    const platform: Platform = {
      os: this.detectOS(userAgent),
      version: this.detectOSVersion(userAgent),
      isMobile: this.isMobileDevice(userAgent),
      isTablet: this.isTabletDevice(userAgent)
    }

    const browserInfo: BrowserInfo = {
      name: this.detectBrowser(userAgent),
      version: this.detectBrowserVersion(userAgent),
      engine: this.detectEngine(userAgent)
    }

    let deviceType: 'desktop' | 'tablet' | 'mobile' = 'desktop'
    if (platform.isMobile) {
      deviceType = 'mobile'
    } else if (platform.isTablet) {
      deviceType = 'tablet'
    }

    return {
      type: deviceType,
      screenSize,
      orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
      touchCapable: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      platform,
      browserInfo
    }
  }

  private detectOS(userAgent: string): Platform['os'] {
    if (/iPad|iPhone|iPod/.test(userAgent)) return 'ios'
    if (/Android/.test(userAgent)) return 'android'
    if (/Windows/.test(userAgent)) return 'windows'
    if (/Mac/.test(userAgent)) return 'macos'
    if (/Linux/.test(userAgent)) return 'linux'
    return 'linux'
  }

  private detectOSVersion(userAgent: string): string {
    const match = userAgent.match(/(?:Android|iPhone OS|Mac OS X|Windows NT)\s([\d._]+)/)
    return match ? match[1].replace(/_/g, '.') : 'unknown'
  }

  private isMobileDevice(userAgent: string): boolean {
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    const isSmallScreen = window.innerWidth < this.layoutConfig.breakpoints.mobile
    return isMobileUA || isSmallScreen
  }

  private isTabletDevice(userAgent: string): boolean {
    const isTabletUA = /iPad|Android/i.test(userAgent)
    const isTabletScreen = window.innerWidth >= this.layoutConfig.breakpoints.mobile && 
                          window.innerWidth < this.layoutConfig.breakpoints.tablet
    return (isTabletUA && window.innerWidth >= this.layoutConfig.breakpoints.mobile) || isTabletScreen
  }

  private detectBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    return 'Unknown'
  }

  private detectBrowserVersion(userAgent: string): string {
    const match = userAgent.match(/(?:Chrome|Firefox|Safari|Edge)\/(\d+\.\d+)/)
    return match ? match[1] : 'unknown'
  }

  private detectEngine(userAgent: string): string {
    if (userAgent.includes('WebKit')) return 'WebKit'
    if (userAgent.includes('Gecko')) return 'Gecko'
    if (userAgent.includes('Trident')) return 'Trident'
    return 'Unknown'
  }

  private adaptForMobile(layout: any): any {
    return {
      ...layout,
      columns: 1,
      spacing: this.layoutConfig.spacing.sm,
      padding: this.layoutConfig.spacing.md,
      fontSize: 'sm',
      navigation: {
        ...layout.navigation,
        type: 'bottom-tabs',
        collapsible: true
      }
    }
  }

  private adaptForTablet(layout: any): any {
    return {
      ...layout,
      columns: Math.min(layout.columns || 2, 2),
      spacing: this.layoutConfig.spacing.md,
      padding: this.layoutConfig.spacing.lg,
      fontSize: 'md'
    }
  }

  private simplifyChartData(data: any[]): any[] {
    if (!Array.isArray(data) || data.length <= 50) return data
    
    // Sample data points for mobile performance
    const step = Math.ceil(data.length / 50)
    return data.filter((_, index) => index % step === 0)
  }

  private simplifyChartInteractions(interactions: any): any {
    return {
      ...interactions,
      hover: false, // Disable hover on touch devices
      zoom: true,
      pan: true,
      brush: false // Disable brush selection on mobile
    }
  }

  private setupOrientationListener(): void {
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        const newOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
        this.handleOrientationChange(newOrientation)
      }, 100)
    })

    // Also listen for resize events as fallback
    window.addEventListener('resize', () => {
      const newOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      if (newOrientation !== this.deviceInfo.orientation) {
        this.handleOrientationChange(newOrientation)
      }
    })
  }

  private setupViewportListener(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === document.documentElement) {
          this.deviceInfo.screenSize = {
            width: window.innerWidth,
            height: window.innerHeight,
            pixelRatio: window.devicePixelRatio || 1
          }
        }
      }
    })

    this.resizeObserver.observe(document.documentElement)
  }

  private updateViewportMeta(): void {
    let viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement
    if (!viewport) {
      viewport = document.createElement('meta')
      viewport.name = 'viewport'
      document.head.appendChild(viewport)
    }

    // Adjust viewport based on orientation and device
    const content = this.isMobile() 
      ? 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
      : 'width=device-width, initial-scale=1.0'
    
    viewport.content = content
  }

  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }
    this.orientationChangeCallbacks = []
  }
}

// Singleton instance
export const mobileOptimizer = new MobileOptimizer()