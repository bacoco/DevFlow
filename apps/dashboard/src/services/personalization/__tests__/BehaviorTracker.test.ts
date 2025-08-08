/**
 * Tests for BehaviorTracker
 */

import { BehaviorTracker } from '../BehaviorTracker';
import { PrivacyPreferences } from '../types';

describe('BehaviorTracker', () => {
  let tracker: BehaviorTracker;
  let privacyPreferences: PrivacyPreferences;

  beforeEach(() => {
    privacyPreferences = {
      trackingEnabled: true,
      analyticsEnabled: true,
      personalizationEnabled: true,
      dataRetentionDays: 90,
      shareUsageData: false
    };
    
    tracker = new BehaviorTracker('test-user', privacyPreferences);
  });

  afterEach(() => {
    tracker.destroy();
  });

  describe('Interaction Tracking', () => {
    it('should track click interactions', () => {
      tracker.trackClick('test-button', { page: 'dashboard' });
      
      const events = tracker.getRecentEvents(10);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('click');
      expect(events[0].element).toBe('test-button');
      expect(events[0].context.page).toBe('dashboard');
    });

    it('should track hover interactions with duration', () => {
      tracker.trackHover('test-widget', 5000, { section: 'main' });
      
      const events = tracker.getRecentEvents(10);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('hover');
      expect(events[0].duration).toBe(5000);
      expect(events[0].context.section).toBe('main');
    });

    it('should track navigation events', () => {
      tracker.trackNavigation('/dashboard', '/analytics');
      
      const events = tracker.getRecentEvents(10);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('navigation');
      expect(events[0].metadata.fromPage).toBe('/dashboard');
      expect(events[0].metadata.toPage).toBe('/analytics');
    });

    it('should track widget interactions', () => {
      tracker.trackWidgetInteraction('code-quality-widget', 'expand', {}, { widgetSize: 'large' });
      
      const events = tracker.getRecentEvents(10);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('widget_interaction');
      expect(events[0].element).toBe('code-quality-widget');
      expect(events[0].metadata.action).toBe('expand');
      expect(events[0].metadata.widgetSize).toBe('large');
    });

    it('should anonymize search queries', () => {
      tracker.trackSearch('john.doe@example.com performance', 5);
      
      const events = tracker.getRecentEvents(10);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('search');
      expect(events[0].metadata.queryLength).toBe(32);
      expect(events[0].metadata.queryType).toBe('performance');
      expect(events[0].metadata.resultsCount).toBe(5);
    });

    it('should track preference changes', () => {
      tracker.trackPreferenceChange('theme', 'light', 'dark');
      
      const events = tracker.getRecentEvents(10);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('preference_change');
      expect(events[0].element).toBe('theme');
      expect(events[0].metadata.preferenceType).toBe('theme');
      expect(events[0].metadata.changed).toBe(true);
    });
  });

  describe('Privacy Compliance', () => {
    it('should not track when tracking is disabled', () => {
      const disabledPreferences = { ...privacyPreferences, trackingEnabled: false };
      const disabledTracker = new BehaviorTracker('test-user', disabledPreferences);
      
      disabledTracker.trackClick('test-button');
      
      const events = disabledTracker.getRecentEvents(10);
      expect(events).toHaveLength(0);
      
      disabledTracker.destroy();
    });

    it('should sanitize sensitive metadata', () => {
      tracker.trackClick('test-button', {}, { 
        password: 'secret123',
        token: 'abc123',
        normalData: 'safe'
      });
      
      const events = tracker.getRecentEvents(10);
      expect(events[0].metadata.password).toBeUndefined();
      expect(events[0].metadata.token).toBeUndefined();
      expect(events[0].metadata.normalData).toBe('safe');
    });

    it('should limit string lengths in metadata', () => {
      const longString = 'a'.repeat(150);
      tracker.trackClick('test-button', {}, { longData: longString });
      
      const events = tracker.getRecentEvents(10);
      expect(events[0].metadata.longData).toHaveLength(103); // 100 + '...'
      expect(events[0].metadata.longData).toEndWith('...');
    });

    it('should update privacy preferences', () => {
      tracker.trackClick('test-button');
      expect(tracker.getRecentEvents(10)).toHaveLength(1);
      
      const newPreferences = { ...privacyPreferences, trackingEnabled: false };
      tracker.updatePrivacyPreferences(newPreferences);
      
      tracker.trackClick('another-button');
      expect(tracker.getRecentEvents(10)).toHaveLength(1); // No new events
    });

    it('should clear data when tracking is disabled', () => {
      tracker.trackClick('test-button');
      expect(tracker.getRecentEvents(10)).toHaveLength(1);
      
      const newPreferences = { ...privacyPreferences, trackingEnabled: false };
      tracker.updatePrivacyPreferences(newPreferences);
      
      expect(tracker.getRecentEvents(10)).toHaveLength(0);
    });
  });

  describe('Event Filtering and Analysis', () => {
    beforeEach(() => {
      // Add some test events
      tracker.trackClick('button1');
      tracker.trackClick('button2');
      tracker.trackHover('widget1', 1000);
      tracker.trackNavigation('/page1', '/page2');
      tracker.trackClick('button1'); // Duplicate
    });

    it('should get events by type', () => {
      const clickEvents = tracker.getEventsByType('click');
      expect(clickEvents).toHaveLength(3);
      
      const hoverEvents = tracker.getEventsByType('hover');
      expect(hoverEvents).toHaveLength(1);
      
      const navEvents = tracker.getEventsByType('navigation');
      expect(navEvents).toHaveLength(1);
    });

    it('should generate session summary', () => {
      const summary = tracker.getSessionSummary();
      
      expect(summary.eventCount).toBe(5);
      expect(summary.uniqueElements).toBe(4); // button1, button2, widget1, /page1 -> /page2
      expect(summary.mostInteractedElements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ element: 'button1', count: 2 })
        ])
      );
      expect(summary.sessionId).toBeDefined();
      expect(summary.startTime).toBeInstanceOf(Date);
    });

    it('should limit recent events to prevent memory issues', () => {
      // Add many events
      for (let i = 0; i < 1500; i++) {
        tracker.trackClick(`button-${i}`);
      }
      
      const events = tracker.getRecentEvents(2000);
      expect(events.length).toBeLessThanOrEqual(1000); // Should be capped
    });
  });

  describe('Context Enrichment', () => {
    it('should enrich context with default values', () => {
      tracker.trackClick('test-button');
      
      const events = tracker.getRecentEvents(10);
      const context = events[0].context;
      
      expect(context.page).toBeDefined();
      expect(context.section).toBe('unknown'); // Default value
      expect(context.userRole).toBe('developer'); // Default value
      expect(context.deviceType).toBeDefined();
      expect(context.timeOfDay).toBeGreaterThanOrEqual(0);
      expect(context.timeOfDay).toBeLessThan(24);
      expect(context.dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(context.dayOfWeek).toBeLessThan(7);
    });

    it('should preserve provided context values', () => {
      const customContext = {
        page: '/custom-page',
        section: 'sidebar',
        userRole: 'team_lead' as const,
        deviceType: 'tablet' as const
      };
      
      tracker.trackClick('test-button', customContext);
      
      const events = tracker.getRecentEvents(10);
      const context = events[0].context;
      
      expect(context.page).toBe('/custom-page');
      expect(context.section).toBe('sidebar');
      expect(context.userRole).toBe('team_lead');
      expect(context.deviceType).toBe('tablet');
    });
  });

  describe('Data Persistence', () => {
    it('should persist events to localStorage when enabled', () => {
      const localStorageSpy = jest.spyOn(Storage.prototype, 'setItem');
      
      tracker.trackClick('test-button');
      
      // Trigger flush by adding many events
      for (let i = 0; i < 50; i++) {
        tracker.trackClick(`button-${i}`);
      }
      
      expect(localStorageSpy).toHaveBeenCalledWith(
        'behavior_events_test-user',
        expect.any(String)
      );
      
      localStorageSpy.mockRestore();
    });

    it('should handle localStorage errors gracefully', () => {
      const localStorageSpy = jest.spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new Error('Storage full');
        });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      tracker.trackClick('test-button');
      
      // Trigger flush
      for (let i = 0; i < 50; i++) {
        tracker.trackClick(`button-${i}`);
      }
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to persist behavior events:',
        expect.any(Error)
      );
      
      localStorageSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });
});