/**
 * UI State Store
 * Manages global UI state using Zustand
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Notification, ThemeMode } from '../types/design-system';

interface UIState {
  // Theme state
  theme: ThemeMode;
  sidebarCollapsed: boolean;

  // Modal state
  activeModal: string | null;
  modalData: any;

  // Notification state
  notifications: Notification[];

  // Loading state
  loading: {
    global: boolean;
    components: Record<string, boolean>;
  };

  // Error state
  errors: {
    global: Error | null;
    components: Record<string, Error | null>;
  };

  // Layout state
  layout: {
    headerHeight: number;
    sidebarWidth: number;
    footerHeight: number;
  };

  // Actions
  setTheme: (theme: ThemeMode) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  openModal: (modalId: string, data?: any) => void;
  closeModal: () => void;

  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  setGlobalLoading: (loading: boolean) => void;
  setComponentLoading: (componentId: string, loading: boolean) => void;

  setGlobalError: (error: Error | null) => void;
  setComponentError: (componentId: string, error: Error | null) => void;
  clearErrors: () => void;

  updateLayout: (layout: Partial<UIState['layout']>) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
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

        // Theme actions
        setTheme: (theme) => set({ theme }),

        // Sidebar actions
        toggleSidebar: () => set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed
        })),
        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

        // Modal actions
        openModal: (modalId, data) => set({
          activeModal: modalId,
          modalData: data
        }),
        closeModal: () => set({
          activeModal: null,
          modalData: null
        }),

        // Notification actions
        addNotification: (notification) => {
          const id = Math.random().toString(36).substring(2, 11);
          const newNotification: Notification = {
            ...notification,
            id,
            timestamp: new Date(),
          };

          set((state) => ({
            notifications: [...state.notifications, newNotification],
          }));

          // Auto-remove notification if not persistent
          if (!notification.persistent) {
            const duration = notification.duration || 5000;
            setTimeout(() => {
              get().removeNotification(id);
            }, duration);
          }
        },

        removeNotification: (id) => set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id),
        })),

        clearNotifications: () => set({ notifications: [] }),

        // Loading actions
        setGlobalLoading: (loading) => set((state) => ({
          loading: { ...state.loading, global: loading },
        })),

        setComponentLoading: (componentId, loading) => set((state) => ({
          loading: {
            ...state.loading,
            components: {
              ...state.loading.components,
              [componentId]: loading,
            },
          },
        })),

        // Error actions
        setGlobalError: (error) => set((state) => ({
          errors: { ...state.errors, global: error },
        })),

        setComponentError: (componentId, error) => set((state) => ({
          errors: {
            ...state.errors,
            components: {
              ...state.errors.components,
              [componentId]: error,
            },
          },
        })),

        clearErrors: () => set({
          errors: {
            global: null,
            components: {},
          },
        }),

        // Layout actions
        updateLayout: (layout) => set((state) => ({
          layout: { ...state.layout, ...layout },
        })),
      }),
      {
        name: 'devflow-ui-store',
        // Only persist certain parts of the state
        partialize: (state) => ({
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
          layout: state.layout,
        }),
      }
    ),
    {
      name: 'ui-store',
    }
  )
);

// Selector hooks for better performance
export const useTheme = () => useUIStore((state) => state.theme);
export const useSidebar = () => useUIStore((state) => ({
  collapsed: state.sidebarCollapsed,
  toggle: state.toggleSidebar,
  setCollapsed: state.setSidebarCollapsed,
}));
export const useModal = () => useUIStore((state) => ({
  activeModal: state.activeModal,
  modalData: state.modalData,
  openModal: state.openModal,
  closeModal: state.closeModal,
}));
export const useNotifications = () => useUIStore((state) => ({
  notifications: state.notifications,
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  clearNotifications: state.clearNotifications,
}));
export const useLoading = () => useUIStore((state) => ({
  global: state.loading.global,
  components: state.loading.components,
  setGlobalLoading: state.setGlobalLoading,
  setComponentLoading: state.setComponentLoading,
}));
export const useErrors = () => useUIStore((state) => ({
  global: state.errors.global,
  components: state.errors.components,
  setGlobalError: state.setGlobalError,
  setComponentError: state.setComponentError,
  clearErrors: state.clearErrors,
}));
export const useLayout = () => useUIStore((state) => ({
  layout: state.layout,
  updateLayout: state.updateLayout,
}));