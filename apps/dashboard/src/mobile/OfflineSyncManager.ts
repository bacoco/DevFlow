/**
 * Offline Synchronization Manager
 * Handles offline data storage and background synchronization for mobile devices
 */

import { OfflineSyncConfig, SyncTask, SyncResult, SyncConflict } from './types'

export class OfflineSyncManager {
  private config: OfflineSyncConfig
  private syncQueue: SyncTask[] = []
  private isOnline = navigator.onLine
  private syncInProgress = false
  private syncInterval: NodeJS.Timeout | null = null
  private db: IDBDatabase | null = null
  private dbName = 'DevFlowOfflineDB'
  private dbVersion = 1

  constructor(config?: Partial<OfflineSyncConfig>) {
    this.config = {
      enabled: true,
      syncInterval: 30000, // 30 seconds
      maxRetries: 3,
      backgroundSync: true,
      conflictResolution: 'merge',
      ...config
    }

    this.initializeDatabase()
    this.setupEventListeners()
    this.startSyncInterval()
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' })
          syncStore.createIndex('timestamp', 'timestamp', { unique: false })
          syncStore.createIndex('type', 'type', { unique: false })
        }

        if (!db.objectStoreNames.contains('offlineData')) {
          const dataStore = db.createObjectStore('offlineData', { keyPath: 'id' })
          dataStore.createIndex('lastModified', 'lastModified', { unique: false })
          dataStore.createIndex('type', 'type', { unique: false })
        }

        if (!db.objectStoreNames.contains('conflicts')) {
          const conflictStore = db.createObjectStore('conflicts', { keyPath: 'id' })
          conflictStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  private setupEventListeners(): void {
    // Online/offline detection
    window.addEventListener('online', () => {
      this.isOnline = true
      this.triggerSync()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
    })

    // Page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.triggerSync()
      }
    })

    // Service worker sync event
    if ('serviceWorker' in navigator && this.config.backgroundSync) {
      navigator.serviceWorker.ready.then(registration => {
        if ('sync' in registration) {
          // Register for background sync
          return registration.sync.register('background-sync')
        }
      }).catch(err => {
        console.warn('Background sync not supported:', err)
      })
    }
  }

  private startSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.triggerSync()
      }
    }, this.config.syncInterval)
  }

  async queueAction(action: Omit<SyncTask, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const task: SyncTask = {
      id: this.generateId(),
      timestamp: new Date(),
      retryCount: 0,
      ...action
    }

    this.syncQueue.push(task)
    await this.persistSyncQueue()

    // Try immediate sync if online
    if (this.isOnline) {
      this.triggerSync()
    }
  }

  async getCachedData(key: string): Promise<any | null> {
    if (!this.db) return null

    return new Promise((resolve, reject) => {
      const transaction = this.db!.createTransaction(['offlineData'], 'readonly')
      const store = transaction.objectStore('offlineData')
      const request = store.get(key)

      request.onsuccess = () => resolve(request.result?.data || null)
      request.onerror = () => reject(request.error)
    })
  }

  async setCachedData(key: string, data: any, type: string = 'general'): Promise<void> {
    if (!this.db) return

    const cacheEntry = {
      id: key,
      data,
      type,
      lastModified: new Date(),
      version: 1
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.createTransaction(['offlineData'], 'readwrite')
      const store = transaction.objectStore('offlineData')
      const request = store.put(cacheEntry)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async syncWhenOnline(): Promise<SyncResult> {
    if (!this.isOnline) {
      return {
        success: false,
        syncedItems: 0,
        failedItems: this.syncQueue.length,
        conflicts: []
      }
    }

    return this.performSync()
  }

  private async triggerSync(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return

    try {
      await this.performSync()
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  private async performSync(): Promise<SyncResult> {
    this.syncInProgress = true
    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      failedItems: 0,
      conflicts: []
    }

    try {
      // Load sync queue from storage
      await this.loadSyncQueue()

      // Process each task in the queue
      for (let i = this.syncQueue.length - 1; i >= 0; i--) {
        const task = this.syncQueue[i]
        
        try {
          const syncSuccess = await this.syncTask(task)
          
          if (syncSuccess) {
            this.syncQueue.splice(i, 1)
            result.syncedItems++
          } else {
            task.retryCount++
            if (task.retryCount >= this.config.maxRetries) {
              this.syncQueue.splice(i, 1)
              result.failedItems++
            }
          }
        } catch (error) {
          console.error('Task sync failed:', error)
          task.retryCount++
          if (task.retryCount >= this.config.maxRetries) {
            this.syncQueue.splice(i, 1)
            result.failedItems++
          }
        }
      }

      // Persist updated queue
      await this.persistSyncQueue()

      // Sync cached data
      await this.syncCachedData()

    } catch (error) {
      console.error('Sync process failed:', error)
      result.success = false
    } finally {
      this.syncInProgress = false
    }

    return result
  }

  private async syncTask(task: SyncTask): Promise<boolean> {
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: task.type,
          data: task.data,
          timestamp: task.timestamp
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Handle conflicts
        if (result.conflict) {
          await this.handleConflict({
            id: task.id,
            type: task.type,
            clientData: task.data,
            serverData: result.serverData
          })
        }

        return true
      } else if (response.status === 409) {
        // Conflict detected
        const conflictData = await response.json()
        await this.handleConflict({
          id: task.id,
          type: task.type,
          clientData: task.data,
          serverData: conflictData.serverData
        })
        return true
      }

      return false
    } catch (error) {
      console.error('Task sync request failed:', error)
      return false
    }
  }

  private async handleConflict(conflict: Omit<SyncConflict, 'resolution'>): Promise<void> {
    let resolution: 'client' | 'server' | 'merge' = this.config.conflictResolution

    // Apply conflict resolution strategy
    switch (resolution) {
      case 'client':
        // Keep client data, overwrite server
        await this.forceSyncData(conflict.id, conflict.clientData)
        break
      
      case 'server':
        // Accept server data, update local cache
        await this.setCachedData(conflict.id, conflict.serverData)
        break
      
      case 'merge':
        // Attempt to merge data
        const mergedData = this.mergeData(conflict.clientData, conflict.serverData)
        await this.setCachedData(conflict.id, mergedData)
        await this.forceSyncData(conflict.id, mergedData)
        break
    }

    // Store conflict for user review if needed
    await this.storeConflict({ ...conflict, resolution })
  }

  private mergeData(clientData: any, serverData: any): any {
    // Simple merge strategy - can be enhanced based on data structure
    if (typeof clientData === 'object' && typeof serverData === 'object') {
      return {
        ...serverData,
        ...clientData,
        _lastModified: new Date(),
        _mergedFrom: {
          client: clientData._lastModified || new Date(),
          server: serverData._lastModified || new Date()
        }
      }
    }

    // For non-objects, prefer client data
    return clientData
  }

  private async forceSyncData(id: string, data: any): Promise<void> {
    try {
      await fetch(`/api/sync/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Force-Update': 'true'
        },
        body: JSON.stringify(data)
      })
    } catch (error) {
      console.error('Force sync failed:', error)
    }
  }

  private async syncCachedData(): Promise<void> {
    if (!this.db) return

    // Get all cached data that needs syncing
    const transaction = this.db.createTransaction(['offlineData'], 'readonly')
    const store = transaction.objectStore('offlineData')
    const request = store.getAll()

    request.onsuccess = async () => {
      const cachedItems = request.result
      
      for (const item of cachedItems) {
        try {
          // Check if server has newer version
          const response = await fetch(`/api/data/${item.id}/version`)
          if (response.ok) {
            const serverVersion = await response.json()
            
            if (serverVersion.version > item.version) {
              // Fetch updated data from server
              const dataResponse = await fetch(`/api/data/${item.id}`)
              if (dataResponse.ok) {
                const serverData = await dataResponse.json()
                await this.setCachedData(item.id, serverData, item.type)
              }
            }
          }
        } catch (error) {
          console.error('Failed to sync cached item:', item.id, error)
        }
      }
    }
  }

  private async persistSyncQueue(): Promise<void> {
    if (!this.db) return

    const transaction = this.db.createTransaction(['syncQueue'], 'readwrite')
    const store = transaction.objectStore('syncQueue')

    // Clear existing queue
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear()
      clearRequest.onsuccess = () => resolve()
      clearRequest.onerror = () => reject(clearRequest.error)
    })

    // Add current queue items
    for (const task of this.syncQueue) {
      await new Promise<void>((resolve, reject) => {
        const addRequest = store.add(task)
        addRequest.onsuccess = () => resolve()
        addRequest.onerror = () => reject(addRequest.error)
      })
    }
  }

  private async loadSyncQueue(): Promise<void> {
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.createTransaction(['syncQueue'], 'readonly')
      const store = transaction.objectStore('syncQueue')
      const request = store.getAll()

      request.onsuccess = () => {
        this.syncQueue = request.result || []
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  private async storeConflict(conflict: SyncConflict): Promise<void> {
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.createTransaction(['conflicts'], 'readwrite')
      const store = transaction.objectStore('conflicts')
      const request = store.put({
        ...conflict,
        timestamp: new Date()
      })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  isOnlineStatus(): boolean {
    return this.isOnline
  }

  getSyncQueueLength(): number {
    return this.syncQueue.length
  }

  async clearCache(): Promise<void> {
    if (!this.db) return

    const transaction = this.db.createTransaction(['offlineData'], 'readwrite')
    const store = transaction.objectStore('offlineData')
    
    return new Promise((resolve, reject) => {
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    if (this.db) {
      this.db.close()
    }

    window.removeEventListener('online', this.triggerSync)
    window.removeEventListener('offline', this.triggerSync)
    document.removeEventListener('visibilitychange', this.triggerSync)
  }
}

// Singleton instance
export const offlineSyncManager = new OfflineSyncManager()