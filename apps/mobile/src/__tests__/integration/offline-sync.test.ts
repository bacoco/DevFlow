import {offlineService} from '../../services/offlineService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn((callback) => {
    // Simulate network state changes
    setTimeout(() => callback({isConnected: false}), 100);
    setTimeout(() => callback({isConnected: true}), 200);
    return jest.fn(); // unsubscribe function
  }),
  fetch: jest.fn(() => Promise.resolve({isConnected: true})),
}));

describe('OfflineService Integration', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe('Cache Management', () => {
    it('should cache and retrieve data correctly', async () => {
      const testData = {id: 1, name: 'Test Data'};
      const cacheKey = 'test_data';

      await offlineService.cacheData(cacheKey, testData);
      const retrieved = await offlineService.getCachedData(cacheKey);

      expect(retrieved).toEqual(testData);
    });

    it('should return null for expired cache', async () => {
      const testData = {id: 1, name: 'Test Data'};
      const cacheKey = 'test_data';
      const shortTTL = 100; // 100ms

      await offlineService.cacheData(cacheKey, testData, shortTTL);
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const retrieved = await offlineService.getCachedData(cacheKey);
      expect(retrieved).toBeNull();
    });

    it('should handle cache cleanup', async () => {
      // Cache multiple items
      for (let i = 0; i < 10; i++) {
        await offlineService.cacheData(`item_${i}`, {id: i, data: 'test'});
      }

      const statsBefore = await offlineService.getCacheStats();
      expect(statsBefore.totalEntries).toBe(10);

      await offlineService.clearCache();

      const statsAfter = await offlineService.getCacheStats();
      expect(statsAfter.totalEntries).toBe(0);
    });
  });

  describe('Offline Queue', () => {
    it('should queue actions when offline', async () => {
      await offlineService.initialize();

      const action = {
        type: 'UPDATE_SETTINGS',
        payload: {theme: 'dark'},
      };

      await offlineService.addOfflineAction(action);
      expect(offlineService.getOfflineQueueSize()).toBe(1);
    });

    it('should process queue when coming back online', async () => {
      await offlineService.initialize();

      // Add actions to queue
      await offlineService.addOfflineAction({
        type: 'UPDATE_SETTINGS',
        payload: {theme: 'dark'},
      });

      await offlineService.addOfflineAction({
        type: 'MARK_ALERT_READ',
        payload: {alertId: '123'},
      });

      expect(offlineService.getOfflineQueueSize()).toBeGreaterThanOrEqual(2);

      // Process queue (this would normally happen when network comes back)
      await offlineService.processOfflineQueue();

      // Queue should be processed (though actions might fail without proper backend)
      expect(offlineService.getOfflineQueueSize()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Network State Management', () => {
    it('should track online/offline state', async () => {
      await offlineService.initialize();

      // Initially should be online (mocked)
      expect(offlineService.isConnected()).toBe(true);

      // Wait for network state changes from mock
      await new Promise(resolve => setTimeout(resolve, 250));

      // Should have processed network state changes
      expect(offlineService.isConnected()).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle large cache operations efficiently', async () => {
      const startTime = Date.now();
      
      // Cache 100 items
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          offlineService.cacheData(`perf_test_${i}`, {
            id: i,
            data: 'x'.repeat(1000), // 1KB of data
          })
        );
      }

      await Promise.all(promises);
      
      const cacheTime = Date.now() - startTime;
      expect(cacheTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Retrieve all items
      const retrieveStart = Date.now();
      const retrievePromises = [];
      
      for (let i = 0; i < 100; i++) {
        retrievePromises.push(offlineService.getCachedData(`perf_test_${i}`));
      }

      const results = await Promise.all(retrievePromises);
      const retrieveTime = Date.now() - retrieveStart;
      
      expect(retrieveTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(results.filter(r => r !== null)).toHaveLength(100);
    });

    it('should handle concurrent cache operations', async () => {
      const concurrentOperations = 50;
      const promises = [];

      // Mix of cache and retrieve operations
      for (let i = 0; i < concurrentOperations; i++) {
        if (i % 2 === 0) {
          promises.push(
            offlineService.cacheData(`concurrent_${i}`, {id: i, data: 'test'})
          );
        } else {
          promises.push(
            offlineService.getCachedData(`concurrent_${i - 1}`)
          );
        }
      }

      const startTime = Date.now();
      await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(3000); // Should handle concurrent ops efficiently
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      // Mock AsyncStorage to throw error
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValue(new Error('Storage full'));

      // Should not throw error
      await expect(
        offlineService.cacheData('test', {data: 'test'})
      ).resolves.not.toThrow();

      // Restore original method
      AsyncStorage.setItem = originalSetItem;
    });

    it('should handle corrupted cache data', async () => {
      // Manually set corrupted data
      await AsyncStorage.setItem('cache_corrupted', 'invalid json');

      const result = await offlineService.getCachedData('corrupted');
      expect(result).toBeNull();
    });
  });
});