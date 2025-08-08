/**
 * Mobile Optimization and Touch Interaction System
 * Main entry point for mobile-specific features
 */

export * from './types'
export * from './TouchGestureManager'
export * from './MobileOptimizer'
export * from './MobileNavigation'
export * from './MobileChartOptimizer'
export * from './OfflineSyncManager'
export * from './MobileNotificationManager'

// Re-export singleton instances for easy access
export { touchGestureManager } from './TouchGestureManager'
export { mobileOptimizer } from './MobileOptimizer'
export { mobileChartOptimizer } from './MobileChartOptimizer'
export { offlineSyncManager } from './OfflineSyncManager'
export { mobileNotificationManager } from './MobileNotificationManager'

// Mobile optimization hook
import { useState, useEffect } from 'react'
import { mobileOptimizer } from './MobileOptimizer'
import { DeviceInfo } from './types'

export const useMobileOptimization = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(mobileOptimizer.getDeviceInfo())
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOrientationChange = (orientation: 'portrait' | 'landscape') => {
      setDeviceInfo(prev => ({ ...prev, orientation }))
    }

    const handleOnlineStatusChange = () => {
      setIsOnline(navigator.onLine)
    }

    mobileOptimizer.onOrientationChange(handleOrientationChange)
    window.addEventListener('online', handleOnlineStatusChange)
    window.addEventListener('offline', handleOnlineStatusChange)

    return () => {
      window.removeEventListener('online', handleOnlineStatusChange)
      window.removeEventListener('offline', handleOnlineStatusChange)
    }
  }, [])

  return {
    deviceInfo,
    isOnline,
    isMobile: mobileOptimizer.isMobile(),
    isTablet: mobileOptimizer.isTablet(),
    isTouchDevice: mobileOptimizer.isTouchDevice(),
    currentBreakpoint: mobileOptimizer.getCurrentBreakpoint()
  }
}