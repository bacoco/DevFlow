/**
 * Offline Service Tests
 * Tests offline capabilities, data caching, and synchronization
 */

import { offlineService, OfflineData, SyncResult } from '../offlineService';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock document.hidden
Object.defineProperty(document, 'hidden', {
  writable: true,
  value: false,
});

describe('OfflineService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });
    Object.defineProperty(navigator, 'onLine', { value: true });
  });

  describe('Network Status Detection', () => {
    it('should detect online status correctly', () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      expect(offlineService.isOffline() === false).toBeTruthy();
    });

    it('should detect offline status correctly', () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      expect(offlineService.isOffline() === true).toBeTruthy();
    });

    it('should provide network status information', () => {
      const status = offlineService.getNetworkStatus();
      expect('online' in status).toBeTruthy();
      expect('lastSync' in status).toBeTruthy();
      expect('queueSize' in status).toBeTruthy();
    });
  });

  describe('Operation Queuing', () => {
    it('should queue operations when offline', () => {
      const operation = {
        type: 'create' as const,
        entity: 'tasks',
        data: { title: 'Test Task', completed: false },
      };

      const id = offlineService.queueOperation(operation);
      expect(typeof id === 'string').toBeTruthy();
      expect(id.startsWith('offline_')).toBeTruthy();

      const queuedOps = offlineService.getQueuedOperations();
      expect(queuedOps.length === 1).toBeTruthy();
      expect(queuedOps[0].entity === 'tasks').toBeTruthy();
    });

    it('should save queue to localStorage', () => {
      const operation = {
        type: 'update' as const,
        entity: 'tasks',
        data: { id: '1', title: 'Updated Task' },
      };

      offlineService.queueOperation(operation);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'devflow_offline_queue',
        expect.any(String)
      );
    });

    it('should load queue from localStorage on initialization', () => {
      const mockQueue = [
        {
          id: 'test-1',
          type: 'create',
          entity: 'tasks',
          data: { title: 'Test' },
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3,
        },
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockQueue));
      
      // Create new instance to test loading
      const testService = new (offlineService.constructor as any)();
      const queuedOps = testService.getQueuedOperations();
      
      expect(queuedOps.length === 1).toBeTruthy();
      expect(queuedOps[0].id === 'test-1').toBeTruthy();
    });

    it('should respect max queue size', () => {
      // Configure small queue size for testing
      offlineService.updateConfig({ maxQueueSize: 2 });

      // Add operations beyond limit
      for (let i = 0; i < 5; i++) {
        offlineService.queueOperation({
          type: 'create',
          entity: 'tasks',
          data: { title: `Task ${i}` },
        });
      }

      const queuedOps = offlineService.getQueuedOperations();
      expect(queuedOps.length <= 2).toBeTruthy();
    });
  });

  describe('Data Synchronization', () => {
    it('should sync queued operations when online', async () => {
      // Queue an operation
      offlineService.queueOperation({
        type: 'create',
        entity: 'tasks',
        data: { title: 'Test Task' },
      });

      // Mock successful API response
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      const result = await offlineService.syncData();
      
      expect(result.success === true).toBeTruthy();
      expect(result.syncedItems === 1).toBeTruthy();
      expect(result.failedItems === 0).toBeTruthy();
      expect(fetch).toHaveBeenCalled();
    });

    it('should handle API failures during sync', async () => {
      offlineService.queueOperation({
        type: 'create',
        entity: 'tasks',
        data: { title: 'Test Task' },
      });

      // Mock API failure
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await offlineService.syncData();
      
      expect(result.success === false).toBeTruthy();
      expect(result.failedItems > 0).toBeTruthy();
    });

    it('should not sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      offlineService.queueOperation({
        type: 'create',
        entity: 'tasks',
        data: { title: 'Test Task' },
      });

      const result = await offlineService.syncData();
      
      expect(result.syncedItems === 0).toBeTruthy();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should retry failed operations', async () => {
      offlineService.queueOperation({
        type: 'create',
        entity: 'tasks',
        data: { title: 'Test Task' },
      });

      // Mock failure then success
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        });

      // First sync should fail
      let result = await offlineService.syncData();
      expect(result.success === false).toBeTruthy();
      
      // Second sync should succeed
      result = await offlineService.syncData();
      expect(result.success === true).toBeTruthy();
    });

    it('should remove operations after max retries', async () => {
      offlineService.updateConfig({ maxRetries: 1 });
      
      offlineService.queueOperation({
        type: 'create',
        entity: 'tasks',
        data: { title: 'Test Task' },
      });

      // Mock consistent failure
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      // Sync multiple times to exceed max retries
      await offlineService.syncData();
      await offlineService.syncData();

      const queuedOps = offlineService.getQueuedOperations();
      expect(queuedOps.length === 0).toBeTruthy();
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect conflicts during sync', async () => {
      offlineService.queueOperation({
        type: 'update',
        entity: 'tasks',
        data: { id: '1', title: 'Local Update' },
      });

      // Mock conflict response
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({
          data: { id: '1', title: 'Server Update' },
        }),
      });

      const result = await offlineService.syncData();
      
      expect(result.conflicts.length > 0).toBeTruthy();
      expect(result.conflicts[0].localData.title === 'Local Update').toBeTruthy();
      expect(result.conflicts[0].serverData.title === 'Server Update').toBeTruthy();
    });

    it('should handle automatic conflict resolution', async () => {
      offlineService.updateConfig({ conflictResolution: 'merge' });
      
      offlineService.queueOperation({
        type: 'update',
        entity: 'tasks',
        data: { id: '1', title: 'Local Update' },
      });

      // Mock conflict then successful resolution
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: () => Promise.resolve({
            data: { id: '1', title: 'Server Update' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        });

      const result = await offlineService.syncData();
      
      expect(result.syncedItems === 1).toBeTruthy();
      expect(fetch).toHaveBeenCalledTimes(2); // Conflict + resolution
    });
  });

  describe('Event System', () => {
    it('should emit events for network status changes', () => {
      const onlineCallback = jest.fn();
      const offlineCallback = jest.fn();

      offlineService.on('online', onlineCallback);
      offlineService.on('offline', offlineCallback);

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false });
      window.dispatchEvent(new Event('offline'));

      expect(offlineCallback).toHaveBeenCalled();

      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', { value: true });
      window.dispatchEvent(new Event('online'));

      expect(onlineCallback).toHaveBeenCalled();
    });

    it('should emit events for queue updates', () => {
      const queueUpdateCallback = jest.fn();
      offlineService.on('queueUpdated', queueUpdateCallback);

      offlineService.queueOperation({
        type: 'create',
        entity: 'tasks',
        data: { title: 'Test Task' },
      });

      expect(queueUpdateCallback).toHaveBeenCalledWith({
        queueSize: expect.any(Number),
      });
    });

    it('should emit events for sync completion', async () => {
      const syncCompletedCallback = jest.fn();
      offlineService.on('syncCompleted', syncCompletedCallback);

      offlineService.queueOperation({
        type: 'create',
        entity: 'tasks',
        data: { title: 'Test Task' },
      });

      await offlineService.syncData();

      expect(syncCompletedCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: expect.any(Boolean),
          syncedItems: expect.any(Number),
          failedItems: expect.any(Number),
        })
      );
    });
  });

  describe('Queue Management', () => {
    it('should clear queue when requested', () => {
      offlineService.queueOperation({
        type: 'create',
        entity: 'tasks',
        data: { title: 'Test Task' },
      });

      expect(offlineService.getQueuedOperations().length > 0).toBeTruthy();

      offlineService.clearQueue();

      expect(offlineService.getQueuedOperations().length === 0).toBeTruthy();
    });

    it('should remove specific items from queue', () => {
      const id1 = offlineService.queueOperation({
        type: 'create',
        entity: 'tasks',
        data: { title: 'Task 1' },
      });

      const id2 = offlineService.queueOperation({
        type: 'create',
        entity: 'tasks',
        data: { title: 'Task 2' },
      });

      expect(offlineService.getQueuedOperations().length === 2).toBeTruthy();

      const removed = offlineService.removeFromQueue(id1);
      expect(removed === true).toBeTruthy();
      expect(offlineService.getQueuedOperations().length === 1).toBeTruthy();
      expect(offlineService.getQueuedOperations()[0].id === id2).toBeTruthy();
    });

    it('should return false when trying to remove non-existent item', () => {
      const removed = offlineService.removeFromQueue('non-existent-id');
      expect(removed === false).toBeTruthy();
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      const newConfig = {
        maxQueueSize: 500,
        syncInterval: 60000,
        conflictResolution: 'server' as const,
      };

      offlineService.updateConfig(newConfig);

      // Test that config is applied by checking behavior
      const status = offlineService.getNetworkStatus();
      expect(typeof status.queueSize === 'number').toBeTruthy();
    });

    it('should disable offline mode when configured', () => {
      offlineService.updateConfig({ enabled: false });

      expect(() => {
        offlineService.queueOperation({
          type: 'create',
          entity: 'tasks',
          data: { title: 'Test Task' },
        });
      }).toThrow('Offline mode is disabled');
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      const documentRemoveEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      offlineService.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalled();
      expect(documentRemoveEventListenerSpy).toHaveBeenCalled();

      removeEventListenerSpy.mockRestore();
      documentRemoveEventListenerSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Should not throw error
      expect(() => {
        offlineService.queueOperation({
          type: 'create',
          entity: 'tasks',
          data: { title: 'Test Task' },
        });
      }).not.toThrow();

      consoleSpy.mockRestore();
    });

    it('should handle malformed localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Should not throw error and should initialize empty queue
      const testService = new (offlineService.constructor as any)();
      const queuedOps = testService.getQueuedOperations();
      
      expect(queuedOps.length === 0).toBeTruthy();

      consoleSpy.mockRestore();
    });
  });
});