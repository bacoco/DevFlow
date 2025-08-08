/**
 * Mobile Optimization Demo Component
 * Demonstrates all mobile optimization features working together
 */

import React, { useState, useEffect, useRef } from 'react'
import { useMobileOptimization } from './index'
import { MobileNavigation } from './MobileNavigation'
import { touchGestureManager } from './TouchGestureManager'
import { mobileChartOptimizer } from './MobileChartOptimizer'
import { offlineSyncManager } from './OfflineSyncManager'
import { mobileNotificationManager } from './MobileNotificationManager'
import { TabConfig, MenuConfig, ActionConfig } from './types'

export const MobileDemo: React.FC = () => {
  const { deviceInfo, isOnline, isMobile, isTablet, currentBreakpoint } = useMobileOptimization()
  const [activeDemo, setActiveDemo] = useState('overview')
  const [gestureLog, setGestureLog] = useState<string[]>([])
  const [syncStatus, setSyncStatus] = useState<string>('Ready')
  const [notificationCount, setNotificationCount] = useState(0)
  
  const chartRef = useRef<HTMLDivElement>(null)
  const gestureRef = useRef<HTMLDivElement>(null)

  // Demo navigation tabs
  const demoTabs: TabConfig[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: '📱',
      route: '#overview'
    },
    {
      id: 'gestures',
      label: 'Gestures',
      icon: '👆',
      route: '#gestures',
      badge: gestureLog.length > 0 ? gestureLog.length : undefined
    },
    {
      id: 'charts',
      label: 'Charts',
      icon: '📊',
      route: '#charts'
    },
    {
      id: 'sync',
      label: 'Sync',
      icon: '🔄',
      route: '#sync'
    }
  ]

  // Demo menu
  const demoMenu: MenuConfig = {
    items: [
      {
        id: 'settings',
        label: 'Settings',
        icon: '⚙️',
        action: () => alert('Settings clicked')
      },
      {
        id: 'help',
        label: 'Help',
        icon: '❓',
        action: () => alert('Help clicked')
      },
      {
        id: 'about',
        label: 'About',
        icon: 'ℹ️',
        action: () => alert('About clicked')
      }
    ],
    position: 'left',
    overlay: true,
    swipeToClose: true
  }

  // Floating action button
  const floatingAction: ActionConfig = {
    icon: '🔔',
    label: 'Send Notification',
    action: handleSendNotification,
    position: 'bottom-right'
  }

  useEffect(() => {
    // Setup gesture recognition on demo area
    if (gestureRef.current) {
      touchGestureManager.registerSwipeHandler(gestureRef.current, {
        onSwipe: (direction, distance, velocity) => {
          const logEntry = `Swipe ${direction}: ${distance.toFixed(0)}px at ${velocity.toFixed(2)}px/ms`
          setGestureLog(prev => [...prev.slice(-4), logEntry])
        }
      })

      touchGestureManager.addTapGesture(gestureRef.current, {
        onTap: (position) => {
          const logEntry = `Tap at (${position.x.toFixed(0)}, ${position.y.toFixed(0)})`
          setGestureLog(prev => [...prev.slice(-4), logEntry])
        },
        onDoubleTap: (position) => {
          const logEntry = `Double tap at (${position.x.toFixed(0)}, ${position.y.toFixed(0)})`
          setGestureLog(prev => [...prev.slice(-4), logEntry])
        },
        onLongPress: (position) => {
          const logEntry = `Long press at (${position.x.toFixed(0)}, ${position.y.toFixed(0)})`
          setGestureLog(prev => [...prev.slice(-4), logEntry])
        }
      })

      touchGestureManager.enablePinchZoom(gestureRef.current, {
        minScale: 0.5,
        maxScale: 3.0,
        onPinch: (scale, center) => {
          const logEntry = `Pinch scale: ${scale.toFixed(2)} at (${center.x.toFixed(0)}, ${center.y.toFixed(0)})`
          setGestureLog(prev => [...prev.slice(-4), logEntry])
        }
      })
    }

    // Setup chart optimization
    if (chartRef.current) {
      const sampleData = Array.from({ length: 100 }, (_, i) => ({
        x: i,
        y: Math.sin(i * 0.1) * 50 + Math.random() * 20
      }))

      const chartData = {
        data: sampleData,
        width: 600,
        height: 400,
        type: 'line'
      }

      mobileChartOptimizer.optimizeChart(chartRef.current, chartData)
    }

    // Setup offline sync monitoring
    const syncInterval = setInterval(async () => {
      const queueLength = offlineSyncManager.getSyncQueueLength()
      const online = offlineSyncManager.isOnlineStatus()
      
      if (queueLength > 0) {
        setSyncStatus(`${queueLength} items queued`)
      } else if (online) {
        setSyncStatus('Synced')
      } else {
        setSyncStatus('Offline')
      }
    }, 1000)

    return () => {
      clearInterval(syncInterval)
    }
  }, [])

  async function handleSendNotification() {
    const notification = {
      id: `demo-${Date.now()}`,
      title: 'Mobile Demo',
      body: `Test notification #${notificationCount + 1}`,
      badge: notificationCount + 1
    }

    const success = await mobileNotificationManager.showNotification(notification)
    if (success) {
      setNotificationCount(prev => prev + 1)
      mobileNotificationManager.updateBadgeCount(notificationCount + 1)
    }
  }

  async function handleOfflineAction() {
    await offlineSyncManager.queueAction({
      type: 'create',
      data: {
        id: Date.now().toString(),
        message: 'Demo action',
        timestamp: new Date()
      }
    })
    setSyncStatus('Action queued')
  }

  function clearGestureLog() {
    setGestureLog([])
  }

  const renderOverview = () => (
    <div className="p-4 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Device Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Device Type:</strong> {deviceInfo.type}
          </div>
          <div>
            <strong>Screen Size:</strong> {deviceInfo.screenSize.width}×{deviceInfo.screenSize.height}
          </div>
          <div>
            <strong>Orientation:</strong> {deviceInfo.orientation}
          </div>
          <div>
            <strong>Touch Capable:</strong> {deviceInfo.touchCapable ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Platform:</strong> {deviceInfo.platform.os} {deviceInfo.platform.version}
          </div>
          <div>
            <strong>Browser:</strong> {deviceInfo.browserInfo.name} {deviceInfo.browserInfo.version}
          </div>
          <div>
            <strong>Pixel Ratio:</strong> {deviceInfo.screenSize.pixelRatio}
          </div>
          <div>
            <strong>Breakpoint:</strong> {currentBreakpoint}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Optimization Status</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Mobile Optimized:</span>
            <span className={isMobile ? 'text-green-600' : 'text-gray-500'}>
              {isMobile ? '✓ Active' : '○ Inactive'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Touch Gestures:</span>
            <span className={deviceInfo.touchCapable ? 'text-green-600' : 'text-gray-500'}>
              {deviceInfo.touchCapable ? '✓ Enabled' : '○ Disabled'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Online Status:</span>
            <span className={isOnline ? 'text-green-600' : 'text-orange-500'}>
              {isOnline ? '✓ Online' : '○ Offline'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Sync Status:</span>
            <span className="text-blue-600">{syncStatus}</span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderGestures = () => (
    <div className="p-4 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Touch Gesture Demo</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Try swiping, tapping, double-tapping, long-pressing, or pinching on the area below:
        </p>
        
        <div
          ref={gestureRef}
          className="w-full h-64 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 select-none"
          style={{ touchAction: 'none' }}
        >
          <div className="text-center">
            <div className="text-4xl mb-2">👆</div>
            <div>Touch interaction area</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Gesture Log</h3>
            <button
              onClick={clearGestureLog}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear
            </button>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 h-32 overflow-y-auto">
            {gestureLog.length === 0 ? (
              <div className="text-gray-500 text-sm">No gestures detected yet...</div>
            ) : (
              <div className="space-y-1">
                {gestureLog.map((log, index) => (
                  <div key={index} className="text-sm font-mono">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const renderCharts = () => (
    <div className="p-4 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Mobile-Optimized Chart</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          This chart is automatically optimized for mobile devices with simplified data and touch interactions.
        </p>
        
        <div
          ref={chartRef}
          className="w-full h-64 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center"
        >
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">📊</div>
            <div>Mobile-optimized chart would render here</div>
            <div className="text-sm mt-2">
              {isMobile ? 'Simplified for mobile' : 'Full desktop version'}
            </div>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <div>• Data points: {isMobile ? '~50 (sampled)' : '100 (full)'}</div>
          <div>• Touch interactions: {deviceInfo.touchCapable ? 'Enabled' : 'Disabled'}</div>
          <div>• Gesture zoom: {isMobile ? 'Enabled' : 'Disabled'}</div>
        </div>
      </div>
    </div>
  )

  const renderSync = () => (
    <div className="p-4 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Offline Sync Demo</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Test offline synchronization by performing actions while offline.
        </p>

        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <span>Connection Status:</span>
            <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-orange-500'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <span>Sync Status:</span>
            <span className="font-medium text-blue-600">{syncStatus}</span>
          </div>

          <button
            onClick={handleOfflineAction}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Perform Offline Action
          </button>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            <div>• Actions are queued when offline</div>
            <div>• Automatic sync when connection restored</div>
            <div>• Conflict resolution for data changes</div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeDemo) {
      case 'gestures':
        return renderGestures()
      case 'charts':
        return renderCharts()
      case 'sync':
        return renderSync()
      default:
        return renderOverview()
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <header className="p-4 bg-white dark:bg-gray-800 shadow-sm">
          <h1 className="text-2xl font-bold text-center">Mobile Optimization Demo</h1>
          <p className="text-center text-gray-600 dark:text-gray-400 mt-2">
            Showcasing mobile-first UX improvements
          </p>
        </header>

        <main className="pb-20">
          {renderContent()}
        </main>

        <MobileNavigation
          tabs={demoTabs.map(tab => ({
            ...tab,
            disabled: false
          }))}
          menu={demoMenu}
          floatingAction={floatingAction}
          onBackButton={(event) => {
            console.log('Back button pressed', event)
            return false // Allow default behavior
          }}
        />
      </div>
    </div>
  )
}

export default MobileDemo