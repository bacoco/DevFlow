// Offline Manager for handling offline functionality and service worker integration
import React from 'react';

interface QueuedAction {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
  retryCount: number;
}

interface OfflineManagerConfig {
  maxRetries: number;
  retryDelay: number;
  queueLimit: number;
}

class OfflineManager {
  private config: OfflineManagerConfig;
  private isOnline: boolean;
  private listeners: Set<(isOnline: boolean) => void>;
  private db: IDBDatabase | null = null;

  constructor(config: Partial<OfflineManagerConfig> = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 5000,
      queueLimit: 100,
      ...config
    };
    
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.listeners = new Set();
    
    if (typeof window !== 'undefined') {
      this.initializeEventListeners();
      this.initializeDatabase();
      this.registerServiceWorker();
    }
  }

  private initializeEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });
  }

  private async initializeDatabase() {
    if (typeof indexedDB === 'undefined') {
      return Promise.resolve();
    }
    
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('devflow-offline-queue', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('actions')) {
          const store = db.createObjectStore('actions', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
        
        // Listen for service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is available
                this.notifyServiceWorkerUpdate();
              }
            });
          }
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  private notifyServiceWorkerUpdate() {
    // Notify user about service worker update
    const event = new CustomEvent('sw-update-available');
    window.dispatchEvent(event);
  }

  public onOnlineStatusChange(callback: (isOnline: boolean) => void) {
    this.listeners.add(callback);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.isOnline));
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public async queueAction(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>) {
    if (!this.db) {
      await this.initializeDatabase();
    }

    const queuedAction: QueuedAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0
    };

    return new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['actions'], 'readwrite');
      const store = transaction.objectStore('actions');
      
      // Check queue limit
      const countRequest = store.count();
      countRequest.onsuccess = () => {
        if (countRequest.result >= this.config.queueLimit) {
          // Remove oldest item
          const index = store.index('timestamp');
          const cursorRequest = index.openCursor();
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (cursor) {
              store.delete(cursor.primaryKey);
            }
          };
        }
        
        const addRequest = store.add(queuedAction);
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error);
      };
    });
  }

  public async processQueue() {
    if (!this.isOnline || !this.db) return;

    const actions = await this.getQueuedActions();
    
    for (const action of actions) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        });

        if (response.ok) {
          await this.removeQueuedAction(action.id);
        } else {
          await this.handleFailedAction(action);
        }
      } catch (error) {
        console.error('Failed to process queued action:', error);
        await this.handleFailedAction(action);
      }
    }
  }

  private async getQueuedActions(): Promise<QueuedAction[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['actions'], 'readonly');
      const store = transaction.objectStore('actions');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async removeQueuedAction(id: string) {
    return new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['actions'], 'readwrite');
      const store = transaction.objectStore('actions');
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async handleFailedAction(action: QueuedAction) {
    if (action.retryCount >= this.config.maxRetries) {
      await this.removeQueuedAction(action.id);
      console.warn('Action exceeded max retries, removing from queue:', action);
      return;
    }

    // Update retry count
    const updatedAction = {
      ...action,
      retryCount: action.retryCount + 1
    };

    return new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['actions'], 'readwrite');
      const store = transaction.objectStore('actions');
      const request = store.put(updatedAction);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async clearQueue() {
    return new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['actions'], 'readwrite');
      const store = transaction.objectStore('actions');
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async getQueueSize(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['actions'], 'readonly');
      const store = transaction.objectStore('actions');
      const request = store.count();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Enhanced fetch with offline support
  public async enhancedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    if (this.isOnline) {
      try {
        const response = await fetch(url, options);
        return response;
      } catch (error) {
        // Network error, queue if it's a mutation
        if (options.method && options.method !== 'GET') {
          await this.queueAction({
            url,
            method: options.method,
            headers: (options.headers as Record<string, string>) || {},
            body: options.body as string
          });
        }
        throw error;
      }
    } else {
      // Offline - queue mutations and throw for queries
      if (options.method && options.method !== 'GET') {
        await this.queueAction({
          url,
          method: options.method,
          headers: (options.headers as Record<string, string>) || {},
          body: options.body as string
        });
        
        return new Response(
          JSON.stringify({ queued: true, message: 'Action queued for when online' }),
          { status: 202, statusText: 'Accepted' }
        );
      } else {
        throw new Error('Offline - data not available');
      }
    }
  }
}

// Singleton instance - only create if in browser environment
export const offlineManager = typeof window !== 'undefined' ? new OfflineManager() : null;

// React hook for offline status
export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = React.useState(
    offlineManager ? offlineManager.getOnlineStatus() : navigator.onLine
  );
  
  React.useEffect(() => {
    if (!offlineManager) {
      // Fallback for test environment
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
    
    return offlineManager.onOnlineStatusChange(setIsOnline);
  }, []);
  
  return {
    isOnline,
    queueAction: offlineManager ? offlineManager.queueAction.bind(offlineManager) : async () => {},
    processQueue: offlineManager ? offlineManager.processQueue.bind(offlineManager) : async () => {},
    enhancedFetch: offlineManager ? offlineManager.enhancedFetch.bind(offlineManager) : fetch
  };
};

export default OfflineManager;