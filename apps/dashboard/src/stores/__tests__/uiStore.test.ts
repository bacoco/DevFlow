/**
 * UI Store Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useUIStore, useTheme, useSidebar, useModal, useNotifications, useLoading, useErrors, useLayout } from '../uiStore';

// Mock zustand persist
jest.mock('zustand/middleware', () => ({
  devtools: (fn: any) => fn,
  persist: (fn: any) => fn,
}));

describe('UI Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUIStore.setState({
      theme: 'dark',
      sidebarCollapsed: false,
      activeModal: null,
      modalData: null,
      notifications: [],
      loading: {
        global: false,
        components: {},
      },
      errors: {
        global: null,
        components: {},
      },
      layout: {
        headerHeight: 64,
        sidebarWidth: 256,
        footerHeight: 0,
      },
    });
  });

  describe('Theme Management', () => {
    it('should set theme correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
    });

    it('should provide theme selector hook', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        useUIStore.getState().setTheme('auto');
      });

      expect(result.current).toBe('auto');
    });
  });

  describe('Sidebar Management', () => {
    it('should toggle sidebar correctly', () => {
      const { result } = renderHook(() => useUIStore());

      expect(result.current.sidebarCollapsed).toBe(false);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarCollapsed).toBe(true);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarCollapsed).toBe(false);
    });

    it('should set sidebar collapsed state directly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setSidebarCollapsed(true);
      });

      expect(result.current.sidebarCollapsed).toBe(true);
    });

    it('should provide sidebar selector hook', () => {
      const { result } = renderHook(() => useSidebar());

      expect(result.current.collapsed).toBe(false);
      expect(typeof result.current.toggle).toBe('function');
      expect(typeof result.current.setCollapsed).toBe('function');
    });
  });

  describe('Modal Management', () => {
    it('should open and close modals correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openModal('test-modal', { test: 'data' });
      });

      expect(result.current.activeModal).toBe('test-modal');
      expect(result.current.modalData).toEqual({ test: 'data' });

      act(() => {
        result.current.closeModal();
      });

      expect(result.current.activeModal).toBeNull();
      expect(result.current.modalData).toBeNull();
    });

    it('should provide modal selector hook', () => {
      const { result } = renderHook(() => useModal());

      expect(result.current.activeModal).toBeNull();
      expect(typeof result.current.openModal).toBe('function');
      expect(typeof result.current.closeModal).toBe('function');
    });
  });

  describe('Notification Management', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should add notifications correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.addNotification({
          type: 'success',
          title: 'Test Notification',
          message: 'This is a test',
        });
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].title).toBe('Test Notification');
      expect(result.current.notifications[0].type).toBe('success');
    });

    it('should auto-remove non-persistent notifications', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.addNotification({
          type: 'info',
          title: 'Auto Remove',
          duration: 1000,
        });
      });

      expect(result.current.notifications).toHaveLength(1);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it('should not auto-remove persistent notifications', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.addNotification({
          type: 'warning',
          title: 'Persistent',
          persistent: true,
        });
      });

      expect(result.current.notifications).toHaveLength(1);

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(result.current.notifications).toHaveLength(1);
    });

    it('should remove notifications by id', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.addNotification({
          type: 'error',
          title: 'Error',
          persistent: true,
        });
      });

      const notificationId = result.current.notifications[0].id;

      act(() => {
        result.current.removeNotification(notificationId);
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it('should clear all notifications', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.addNotification({ type: 'info', title: 'Test 1', persistent: true });
        result.current.addNotification({ type: 'info', title: 'Test 2', persistent: true });
      });

      expect(result.current.notifications).toHaveLength(2);

      act(() => {
        result.current.clearNotifications();
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it('should provide notifications selector hook', () => {
      const { result } = renderHook(() => useNotifications());

      expect(result.current.notifications).toEqual([]);
      expect(typeof result.current.addNotification).toBe('function');
      expect(typeof result.current.removeNotification).toBe('function');
      expect(typeof result.current.clearNotifications).toBe('function');
    });
  });

  describe('Loading State Management', () => {
    it('should manage global loading state', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setGlobalLoading(true);
      });

      expect(result.current.loading.global).toBe(true);

      act(() => {
        result.current.setGlobalLoading(false);
      });

      expect(result.current.loading.global).toBe(false);
    });

    it('should manage component loading states', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setComponentLoading('dashboard', true);
        result.current.setComponentLoading('tasks', true);
      });

      expect(result.current.loading.components.dashboard).toBe(true);
      expect(result.current.loading.components.tasks).toBe(true);

      act(() => {
        result.current.setComponentLoading('dashboard', false);
      });

      expect(result.current.loading.components.dashboard).toBe(false);
      expect(result.current.loading.components.tasks).toBe(true);
    });

    it('should provide loading selector hook', () => {
      const { result } = renderHook(() => useLoading());

      expect(result.current.global).toBe(false);
      expect(result.current.components).toEqual({});
      expect(typeof result.current.setGlobalLoading).toBe('function');
      expect(typeof result.current.setComponentLoading).toBe('function');
    });
  });

  describe('Error State Management', () => {
    const testError = new Error('Test error');

    it('should manage global error state', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setGlobalError(testError);
      });

      expect(result.current.errors.global).toBe(testError);

      act(() => {
        result.current.setGlobalError(null);
      });

      expect(result.current.errors.global).toBeNull();
    });

    it('should manage component error states', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setComponentError('dashboard', testError);
      });

      expect(result.current.errors.components.dashboard).toBe(testError);

      act(() => {
        result.current.setComponentError('dashboard', null);
      });

      expect(result.current.errors.components.dashboard).toBeNull();
    });

    it('should clear all errors', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setGlobalError(testError);
        result.current.setComponentError('dashboard', testError);
      });

      expect(result.current.errors.global).toBe(testError);
      expect(result.current.errors.components.dashboard).toBe(testError);

      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.errors.global).toBeNull();
      expect(result.current.errors.components).toEqual({});
    });

    it('should provide errors selector hook', () => {
      const { result } = renderHook(() => useErrors());

      expect(result.current.global).toBeNull();
      expect(result.current.components).toEqual({});
      expect(typeof result.current.setGlobalError).toBe('function');
      expect(typeof result.current.setComponentError).toBe('function');
      expect(typeof result.current.clearErrors).toBe('function');
    });
  });

  describe('Layout Management', () => {
    it('should update layout properties', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.updateLayout({
          headerHeight: 80,
          sidebarWidth: 300,
        });
      });

      expect(result.current.layout.headerHeight).toBe(80);
      expect(result.current.layout.sidebarWidth).toBe(300);
      expect(result.current.layout.footerHeight).toBe(0); // Should remain unchanged
    });

    it('should provide layout selector hook', () => {
      const { result } = renderHook(() => useLayout());

      expect(result.current.layout).toEqual({
        headerHeight: 64,
        sidebarWidth: 256,
        footerHeight: 0,
      });
      expect(typeof result.current.updateLayout).toBe('function');
    });
  });
});