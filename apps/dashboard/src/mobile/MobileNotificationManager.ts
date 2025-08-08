/**
 * Mobile Notification Manager
 * Handles device notification integration and mobile-specific notification features
 */

import { MobileNotificationConfig, MobileNotification, NotificationAction } from './types'

export class MobileNotificationManager {
  private config: MobileNotificationConfig
  private registration: ServiceWorkerRegistration | null = null
  private permission: NotificationPermission = 'default'

  constructor(config?: Partial<MobileNotificationConfig>) {
    this.config = {
      enabled: true,
      badge: true,
      sound: true,
      vibration: true,
      priority: 'normal',
      ...config
    }

    this.initialize()
  }

  private async initialize(): Promise<void> {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn('Notifications not supported')
      return
    }

    // Get current permission status
    this.permission = Notification.permission

    // Register service worker for background notifications
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.ready
        this.setupServiceWorkerListeners()
      } catch (error) {
        console.error('Service worker registration failed:', error)
      }
    }

    // Setup push notification support
    this.setupPushNotifications()
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false
    }

    if (this.permission === 'granted') {
      return true
    }

    try {
      this.permission = await Notification.requestPermission()
      return this.permission === 'granted'
    } catch (error) {
      console.error('Permission request failed:', error)
      return false
    }
  }

  async showNotification(notification: MobileNotification): Promise<boolean> {
    if (!('Notification' in window) || !this.config.enabled || this.permission !== 'granted') {
      return false
    }

    try {
      const options: NotificationOptions = {
        body: notification.body,
        icon: notification.icon || '/icons/icon-192x192.png',
        badge: this.config.badge ? (notification.badge || '/icons/badge-72x72.png') : undefined,
        tag: notification.tag,
        data: notification.data,
        requireInteraction: this.config.priority === 'high',
        silent: !this.config.sound,
        actions: notification.actions?.map(action => ({
          action: action.action,
          title: action.title,
          icon: action.icon
        }))
      }

      // Add vibration pattern for mobile devices
      if (this.config.vibration && 'vibrate' in navigator) {
        const vibrationPattern = this.getVibrationPattern(this.config.priority)
        navigator.vibrate(vibrationPattern)
      }

      // Show notification
      if (this.registration) {
        // Use service worker for persistent notifications
        await this.registration.showNotification(notification.title, options)
      } else {
        // Fallback to regular notification
        const notif = new Notification(notification.title, options)
        
        // Auto-close after delay for non-persistent notifications
        if (this.config.priority !== 'high') {
          setTimeout(() => notif.close(), 5000)
        }
      }

      return true
    } catch (error) {
      console.error('Failed to show notification:', error)
      return false
    }
  }

  async scheduleNotification(notification: MobileNotification, delay: number): Promise<boolean> {
    if (!this.registration) {
      // Fallback to setTimeout for browsers without service worker
      setTimeout(() => {
        this.showNotification(notification)
      }, delay)
      return true
    }

    try {
      // Use service worker for scheduled notifications
      await this.registration.sync.register(`scheduled-notification-${notification.id}`)
      
      // Store notification data for service worker
      const notificationData = {
        ...notification,
        scheduledTime: Date.now() + delay
      }
      
      await this.storeScheduledNotification(notificationData)
      return true
    } catch (error) {
      console.error('Failed to schedule notification:', error)
      return false
    }
  }

  async cancelNotification(tag: string): Promise<void> {
    if (!this.registration) return

    try {
      const notifications = await this.registration.getNotifications({ tag })
      notifications.forEach(notification => notification.close())
    } catch (error) {
      console.error('Failed to cancel notification:', error)
    }
  }

  async getActiveNotifications(): Promise<Notification[]> {
    if (!this.registration) return []

    try {
      return await this.registration.getNotifications()
    } catch (error) {
      console.error('Failed to get active notifications:', error)
      return []
    }
  }

  async clearAllNotifications(): Promise<void> {
    const notifications = await this.getActiveNotifications()
    notifications.forEach(notification => notification.close())
  }

  updateBadgeCount(count: number): void {
    if (!this.config.badge) return

    // Update app badge (PWA feature)
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        (navigator as any).setAppBadge(count)
      } else {
        (navigator as any).clearAppBadge()
      }
    }

    // Update document title as fallback
    const originalTitle = document.title.replace(/^\(\d+\)\s*/, '')
    document.title = count > 0 ? `(${count}) ${originalTitle}` : originalTitle
  }

  private setupServiceWorkerListeners(): void {
    if (!this.registration) return

    // Listen for notification clicks
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'NOTIFICATION_CLICK') {
        this.handleNotificationClick(event.data.notification, event.data.action)
      }
    })

    // Listen for notification close
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'NOTIFICATION_CLOSE') {
        this.handleNotificationClose(event.data.notification)
      }
    })
  }

  private async setupPushNotifications(): Promise<void> {
    if (!this.registration || !('PushManager' in window)) return

    try {
      // Check if push messaging is supported
      const subscription = await this.registration.pushManager.getSubscription()
      
      if (!subscription) {
        // Subscribe to push notifications
        const vapidPublicKey = await this.getVapidPublicKey()
        if (vapidPublicKey) {
          const newSubscription = await this.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
          })
          
          // Send subscription to server
          await this.sendSubscriptionToServer(newSubscription)
        }
      }
    } catch (error) {
      console.error('Push notification setup failed:', error)
    }
  }

  private async getVapidPublicKey(): Promise<string | null> {
    try {
      const response = await fetch('/api/push/vapid-public-key')
      if (response.ok) {
        const data = await response.json()
        return data.publicKey
      }
    } catch (error) {
      console.error('Failed to get VAPID public key:', error)
    }
    return null
  }

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent
        })
      })
    } catch (error) {
      console.error('Failed to send subscription to server:', error)
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  private getVibrationPattern(priority: 'low' | 'normal' | 'high'): number[] {
    switch (priority) {
      case 'low':
        return [100]
      case 'high':
        return [200, 100, 200, 100, 200]
      default:
        return [200, 100, 200]
    }
  }

  private async storeScheduledNotification(notification: any): Promise<void> {
    // Store in IndexedDB for service worker access
    const request = indexedDB.open('NotificationDB', 1)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('scheduledNotifications')) {
        db.createObjectStore('scheduledNotifications', { keyPath: 'id' })
      }
    }

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      const transaction = db.transaction(['scheduledNotifications'], 'readwrite')
      const store = transaction.objectStore('scheduledNotifications')
      store.put(notification)
    }
  }

  private handleNotificationClick(notification: any, action?: string): void {
    // Handle notification click events
    if (action) {
      // Handle action button clicks
      this.executeNotificationAction(action, notification.data)
    } else {
      // Handle main notification click
      this.focusOrOpenApp(notification.data?.url)
    }

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('notificationClick', {
      detail: { notification, action }
    }))
  }

  private handleNotificationClose(notification: any): void {
    // Handle notification close events
    window.dispatchEvent(new CustomEvent('notificationClose', {
      detail: { notification }
    }))
  }

  private executeNotificationAction(action: string, data: any): void {
    switch (action) {
      case 'view':
        this.focusOrOpenApp(data?.url)
        break
      case 'dismiss':
        // Just close the notification
        break
      case 'snooze':
        // Reschedule notification
        if (data?.id) {
          this.scheduleNotification(data, 10 * 60 * 1000) // 10 minutes
        }
        break
      default:
        // Custom action handling
        window.dispatchEvent(new CustomEvent('notificationAction', {
          detail: { action, data }
        }))
    }
  }

  private focusOrOpenApp(url?: string): void {
    if ('clients' in self) {
      // Service worker context
      ;(self as any).clients.matchAll().then((clients: any[]) => {
        const client = clients.find(c => c.visibilityState === 'visible')
        if (client) {
          client.focus()
          if (url) {
            client.navigate(url)
          }
        } else {
          ;(self as any).clients.openWindow(url || '/')
        }
      })
    } else {
      // Main thread context
      if (url) {
        window.location.href = url
      } else {
        window.focus()
      }
    }
  }

  // Configuration methods
  setConfig(config: Partial<MobileNotificationConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): MobileNotificationConfig {
    return { ...this.config }
  }

  isSupported(): boolean {
    return 'Notification' in window
  }

  getPermissionStatus(): NotificationPermission {
    return this.permission
  }
}

// Singleton instance
export const mobileNotificationManager = new MobileNotificationManager()