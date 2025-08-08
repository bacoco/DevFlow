/**
 * Tests for PreferenceManager
 */

import { PreferenceManager } from '../PreferenceManager';
import { UserPreferences } from '../types';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('PreferenceManager', () => {
  let manager: PreferenceManager;
  const userId = 'test-user';
  const deviceId = 'test-device';

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    manager = new PreferenceManager(userId, deviceId);
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('Initialization', () => {
    it('should create default preferences when no stored preferences exist', () => {
      const preferences = manager.getPreferences();
      
      expect(preferences.userId).toBe(userId);
      expect(preferences.theme.mode).toBe('auto');
      expect(preferences.layout.defaultView).toBe('dashboard');
      expect(preferences.widgets).toEqual([]);
      expect(preferences.notifications.enabled).toBe(true);
      expect(preferences.accessibility.highContrast).toBe(false);
      expect(preferences.privacy.trackingEnabled).toBe(true);
    });

    it('should load existing preferences from localStorage', () => {
      const existingPreferences: UserPreferences = {
        id: 'existing-id',
        userId,
        theme: {
          mode: 'dark',
          colorScheme: 'blue',
          density: 'compact'
        },
        layout: {
          defaultView: 'analytics',
          widgetOrder: ['widget1', 'widget2'],
          columnCount: 4,
          showSidebar: false,
          compactMode: true
        },
        widgets: [],
        notifications: {
          enabled: false,
          frequency: 'daily',
          channels: ['email'],
          quietHours: {
            enabled: true,
            startTime: '22:00',
            endTime: '08:00',
            timezone: 'UTC'
          }
        },
        accessibility: {
          highContrast: true,
          reducedMotion: true,
          fontSize: 'large',
          screenReaderOptimized: true,
          keyboardNavigation: true
        },
        privacy: {
          trackingEnabled: false,
          analyticsEnabled: false,
          personalizationEnabled: true,
          dataRetentionDays: 30,
          shareUsageData: false
        },
        lastUpdated: new Date('2023-01-01')
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingPreferences));
      
      const newManager = new PreferenceManager(userId, deviceId);
      const preferences = newManager.getPreferences();
      
      expect(preferences.theme.mode).toBe('dark');
      expect(preferences.layout.defaultView).toBe('analytics');
      expect(preferences.notifications.enabled).toBe(false);
      expect(preferences.accessibility.highContrast).toBe(true);
      expect(preferences.privacy.trackingEnabled).toBe(false);
      
      newManager.destroy();
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const newManager = new PreferenceManager(userId, deviceId);
      const preferences = newManager.getPreferences();
      
      // Should fall back to defaults
      expect(preferences.theme.mode).toBe('auto');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load local preferences:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
      newManager.destroy();
    });
  });

  describe('Theme Preferences', () => {
    it('should update theme preferences', async () => {
      await manager.updateThemePreference({
        mode: 'dark',
        colorScheme: 'purple',
        density: 'compact'
      });
      
      const preferences = manager.getPreferences();
      expect(preferences.theme.mode).toBe('dark');
      expect(preferences.theme.colorScheme).toBe('purple');
      expect(preferences.theme.density).toBe('compact');
      expect(preferences.lastUpdated).toBeInstanceOf(Date);
    });

    it('should merge partial theme updates', async () => {
      await manager.updateThemePreference({ mode: 'dark' });
      await manager.updateThemePreference({ density: 'compact' });
      
      const preferences = manager.getPreferences();
      expect(preferences.theme.mode).toBe('dark');
      expect(preferences.theme.density).toBe('compact');
      expect(preferences.theme.colorScheme).toBe('default'); // Should preserve default
    });
  });

  describe('Layout Preferences', () => {
    it('should update layout preferences', async () => {
      await manager.updateLayoutPreference({
        defaultView: 'analytics',
        columnCount: 4,
        showSidebar: false
      });
      
      const preferences = manager.getPreferences();
      expect(preferences.layout.defaultView).toBe('analytics');
      expect(preferences.layout.columnCount).toBe(4);
      expect(preferences.layout.showSidebar).toBe(false);
    });
  });

  describe('Widget Preferences', () => {
    it('should update widget preferences', async () => {
      const widgets = [
        {
          widgetId: 'widget1',
          position: { x: 0, y: 0 },
          size: { width: 2, height: 2 },
          configuration: { theme: 'dark' },
          visible: true,
          priority: 1
        },
        {
          widgetId: 'widget2',
          position: { x: 2, y: 0 },
          size: { width: 1, height: 1 },
          configuration: {},
          visible: true,
          priority: 2
        }
      ];
      
      await manager.updateWidgetPreferences(widgets);
      
      const preferences = manager.getPreferences();
      expect(preferences.widgets).toHaveLength(2);
      expect(preferences.widgets[0].widgetId).toBe('widget1');
      expect(preferences.widgets[1].widgetId).toBe('widget2');
    });

    it('should update individual widget preference', async () => {
      const widget = {
        widgetId: 'new-widget',
        position: { x: 1, y: 1 },
        size: { width: 3, height: 2 },
        configuration: { refreshRate: 5000 },
        visible: true,
        priority: 1
      };
      
      await manager.updateWidgetPreference(widget);
      
      const preferences = manager.getPreferences();
      expect(preferences.widgets).toHaveLength(1);
      expect(preferences.widgets[0].widgetId).toBe('new-widget');
      expect(preferences.widgets[0].configuration.refreshRate).toBe(5000);
    });

    it('should update existing widget preference', async () => {
      // Add initial widget
      const initialWidget = {
        widgetId: 'existing-widget',
        position: { x: 0, y: 0 },
        size: { width: 2, height: 2 },
        configuration: { theme: 'light' },
        visible: true,
        priority: 1
      };
      
      await manager.updateWidgetPreference(initialWidget);
      
      // Update the same widget
      const updatedWidget = {
        ...initialWidget,
        size: { width: 3, height: 3 },
        configuration: { theme: 'dark' }
      };
      
      await manager.updateWidgetPreference(updatedWidget);
      
      const preferences = manager.getPreferences();
      expect(preferences.widgets).toHaveLength(1);
      expect(preferences.widgets[0].size.width).toBe(3);
      expect(preferences.widgets[0].configuration.theme).toBe('dark');
    });

    it('should remove widget preference', async () => {
      // Add widgets
      await manager.updateWidgetPreference({
        widgetId: 'widget1',
        position: { x: 0, y: 0 },
        size: { width: 2, height: 2 },
        configuration: {},
        visible: true,
        priority: 1
      });
      
      await manager.updateWidgetPreference({
        widgetId: 'widget2',
        position: { x: 2, y: 0 },
        size: { width: 2, height: 2 },
        configuration: {},
        visible: true,
        priority: 2
      });
      
      expect(manager.getPreferences().widgets).toHaveLength(2);
      
      // Remove one widget
      await manager.removeWidgetPreference('widget1');
      
      const preferences = manager.getPreferences();
      expect(preferences.widgets).toHaveLength(1);
      expect(preferences.widgets[0].widgetId).toBe('widget2');
    });
  });

  describe('Accessibility Preferences', () => {
    it('should update accessibility preferences', async () => {
      await manager.updateAccessibilityPreferences({
        highContrast: true,
        reducedMotion: true,
        fontSize: 'large',
        screenReaderOptimized: true
      });
      
      const preferences = manager.getPreferences();
      expect(preferences.accessibility.highContrast).toBe(true);
      expect(preferences.accessibility.reducedMotion).toBe(true);
      expect(preferences.accessibility.fontSize).toBe('large');
      expect(preferences.accessibility.screenReaderOptimized).toBe(true);
    });
  });

  describe('Privacy Preferences', () => {
    it('should update privacy preferences', async () => {
      await manager.updatePrivacyPreferences({
        trackingEnabled: false,
        analyticsEnabled: false,
        dataRetentionDays: 30
      });
      
      const preferences = manager.getPreferences();
      expect(preferences.privacy.trackingEnabled).toBe(false);
      expect(preferences.privacy.analyticsEnabled).toBe(false);
      expect(preferences.privacy.dataRetentionDays).toBe(30);
    });
  });

  describe('Change Listeners', () => {
    it('should notify listeners when preferences change', async () => {
      const listener = jest.fn();
      const unsubscribe = manager.addChangeListener(listener);
      
      await manager.updateThemePreference({ mode: 'dark' });
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: expect.objectContaining({ mode: 'dark' })
        })
      );
      
      unsubscribe();
    });

    it('should allow unsubscribing from change listeners', async () => {
      const listener = jest.fn();
      const unsubscribe = manager.addChangeListener(listener);
      
      unsubscribe();
      
      await manager.updateThemePreference({ mode: 'dark' });
      
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', async () => {
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      manager.addChangeListener(errorListener);
      
      await manager.updateThemePreference({ mode: 'dark' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Preference change listener error:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Import/Export', () => {
    it('should export preferences as JSON', () => {
      const exported = manager.exportPreferences();
      const parsed = JSON.parse(exported);
      
      expect(parsed.userId).toBe(userId);
      expect(parsed.theme).toBeDefined();
      expect(parsed.layout).toBeDefined();
      expect(parsed.widgets).toBeDefined();
    });

    it('should import valid preferences', async () => {
      const preferences = manager.getPreferences();
      preferences.theme.mode = 'dark';
      preferences.layout.columnCount = 4;
      
      const exported = JSON.stringify(preferences);
      
      await manager.importPreferences(exported);
      
      const imported = manager.getPreferences();
      expect(imported.theme.mode).toBe('dark');
      expect(imported.layout.columnCount).toBe(4);
    });

    it('should reject invalid preferences', async () => {
      const invalidPreferences = JSON.stringify({ invalid: 'data' });
      
      await expect(manager.importPreferences(invalidPreferences))
        .rejects.toThrow('Invalid preferences format');
    });

    it('should handle malformed JSON during import', async () => {
      await expect(manager.importPreferences('invalid-json'))
        .rejects.toThrow('Failed to import preferences');
    });
  });

  describe('Reset to Defaults', () => {
    it('should reset all preferences to defaults', async () => {
      // Modify preferences
      await manager.updateThemePreference({ mode: 'dark' });
      await manager.updateLayoutPreference({ columnCount: 4 });
      
      expect(manager.getPreferences().theme.mode).toBe('dark');
      expect(manager.getPreferences().layout.columnCount).toBe(4);
      
      // Reset to defaults
      await manager.resetToDefaults();
      
      const preferences = manager.getPreferences();
      expect(preferences.theme.mode).toBe('auto');
      expect(preferences.layout.columnCount).toBe(3);
    });
  });

  describe('Device-specific Preferences', () => {
    it('should return device-specific preferences', () => {
      const devicePrefs = manager.getDevicePreferences();
      
      expect(devicePrefs.theme).toBeDefined();
      expect(devicePrefs.accessibility).toBeDefined();
      expect(devicePrefs.notifications).toBeDefined();
      expect(devicePrefs.layout).toBeUndefined(); // Not device-specific
      expect(devicePrefs.widgets).toBeUndefined(); // Not device-specific
    });
  });

  describe('Sync Status', () => {
    it('should return sync status', () => {
      const status = manager.getSyncStatus();
      
      expect(status.syncInProgress).toBe(false);
      expect(status.hasUnsyncedChanges).toBe(true); // New preferences not synced
      expect(status.lastSyncTime).toBeUndefined();
    });
  });
});