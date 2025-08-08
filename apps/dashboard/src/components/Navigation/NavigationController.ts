/**
 * Navigation Controller
 * Central controller for managing navigation state and behavior
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { 
  NavigationState, 
  NavigationContext, 
  BreadcrumbItem, 
  NavigationHistoryItem,
  SearchResult,
  SearchSuggestion,
  Command,
  NavigationPreferences,
  KeyboardShortcut,
  NavigationEvent,
  URLState,
  SearchProvider,
  UserRole
} from './types';

interface NavigationStore extends NavigationState {
  // Navigation actions
  navigateTo: (route: string, options?: NavigationOptions) => void;
  updateBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  addToHistory: (item: NavigationHistoryItem) => void;
  clearHistory: () => void;
  
  // Search actions
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (query: string) => void;
  performSearch: (query: string) => Promise<void>;
  selectSearchResult: (index: number) => void;
  registerSearchProvider: (provider: SearchProvider) => void;
  
  // Command palette actions
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  setCommandQuery: (query: string) => void;
  selectCommand: (index: number) => void;
  executeCommand: (command: Command) => Promise<void>;
  registerCommand: (command: Command) => void;
  unregisterCommand: (commandId: string) => void;
  
  // Keyboard shortcuts
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (shortcutId: string) => void;
  handleKeyboardEvent: (event: KeyboardEvent) => boolean;
  
  // Preferences
  updatePreferences: (preferences: Partial<NavigationPreferences>) => void;
  addRecentItem: (itemId: string) => void;
  togglePinnedItem: (itemId: string) => void;
  
  // Context management
  updateContext: (context: Partial<NavigationContext>) => void;
  
  // URL synchronization
  syncWithURL: (urlState: URLState) => void;
  getURLState: () => URLState;
  
  // Analytics
  trackEvent: (event: NavigationEvent) => void;
  getAnalytics: () => any;
}

interface NavigationOptions {
  replace?: boolean;
  preserveHistory?: boolean;
  updateBreadcrumbs?: boolean;
  trackEvent?: boolean;
}

const defaultPreferences: NavigationPreferences = {
  collapsedSections: [],
  pinnedItems: [],
  recentItems: [],
  customOrder: [],
  shortcuts: {},
};

const defaultContext: NavigationContext = {
  currentRoute: '/',
  userRole: {
    id: 'default',
    name: 'User',
    permissions: [],
    level: 'viewer',
  },
  availableActions: [],
  breadcrumbs: [],
  history: [],
  preferences: defaultPreferences,
};

export const useNavigationStore = create<NavigationStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentRoute: '/',
        previousRoute: undefined,
        breadcrumbs: [],
        history: [],
        searchState: {
          isOpen: false,
          query: '',
          results: [],
          suggestions: [],
          selectedIndex: -1,
          loading: false,
          providers: [],
          activeProvider: undefined,
        },
        commandPaletteState: {
          isOpen: false,
          query: '',
          selectedIndex: -1,
          filteredCommands: [],
          recentCommands: [],
          favoriteCommands: [],
        },
        preferences: defaultPreferences,
        context: defaultContext,

        // Navigation actions
        navigateTo: (route, options = {}) => {
          const state = get();
          const previousRoute = state.currentRoute;
          
          // Track navigation event
          if (options.trackEvent !== false) {
            get().trackEvent({
              type: 'route_change',
              timestamp: new Date(),
              route,
              context: { previousRoute },
            });
          }
          
          // Add to history if not replacing
          if (!options.replace && options.preserveHistory !== false) {
            get().addToHistory({
              id: `${Date.now()}-${Math.random()}`,
              route: previousRoute,
              title: document.title,
              timestamp: new Date(),
            });
          }
          
          set({
            currentRoute: route,
            previousRoute,
          });
          
          // Update URL
          if (typeof window !== 'undefined') {
            const method = options.replace ? 'replaceState' : 'pushState';
            window.history[method]({}, '', route);
          }
        },

        updateBreadcrumbs: (breadcrumbs) => {
          set({ breadcrumbs });
          
          // Track breadcrumb update
          get().trackEvent({
            type: 'breadcrumb_click',
            timestamp: new Date(),
            route: get().currentRoute,
            context: { breadcrumbCount: breadcrumbs.length },
          });
        },

        addToHistory: (item) => {
          set((state) => ({
            history: [item, ...state.history.slice(0, 49)], // Keep last 50 items
          }));
        },

        clearHistory: () => {
          set({ history: [] });
        },

        // Search actions
        openSearch: () => {
          set((state) => ({
            searchState: {
              ...state.searchState,
              isOpen: true,
              selectedIndex: -1,
            },
          }));
        },

        closeSearch: () => {
          set((state) => ({
            searchState: {
              ...state.searchState,
              isOpen: false,
              query: '',
              results: [],
              suggestions: [],
              selectedIndex: -1,
            },
          }));
        },

        setSearchQuery: (query) => {
          set((state) => ({
            searchState: {
              ...state.searchState,
              query,
              selectedIndex: -1,
            },
          }));
          
          // Debounced search
          const timeoutId = setTimeout(() => {
            get().performSearch(query);
          }, 300);
          
          return () => clearTimeout(timeoutId);
        },

        performSearch: async (query) => {
          if (!query.trim()) {
            set((state) => ({
              searchState: {
                ...state.searchState,
                results: [],
                suggestions: [],
              },
            }));
            return;
          }

          set((state) => ({
            searchState: {
              ...state.searchState,
              loading: true,
            },
          }));

          try {
            const { searchState } = get();
            const allResults: SearchResult[] = [];
            const allSuggestions: SearchSuggestion[] = [];

            // Search across all providers
            await Promise.all(
              searchState.providers.map(async (provider) => {
                try {
                  const [results, suggestions] = await Promise.all([
                    provider.search(query),
                    provider.getSuggestions(query),
                  ]);
                  
                  allResults.push(...results);
                  allSuggestions.push(...suggestions);
                } catch (error) {
                  console.warn(`Search provider ${provider.name} failed:`, error);
                }
              })
            );

            // Sort results by relevance
            allResults.sort((a, b) => b.relevance - a.relevance);
            
            set((state) => ({
              searchState: {
                ...state.searchState,
                results: allResults.slice(0, 50), // Limit results
                suggestions: allSuggestions.slice(0, 10), // Limit suggestions
                loading: false,
              },
            }));

            // Track search event
            get().trackEvent({
              type: 'search_query',
              timestamp: new Date(),
              route: get().currentRoute,
              context: { 
                query, 
                resultCount: allResults.length,
                providers: searchState.providers.map(p => p.id),
              },
            });
          } catch (error) {
            console.error('Search failed:', error);
            set((state) => ({
              searchState: {
                ...state.searchState,
                loading: false,
              },
            }));
          }
        },

        selectSearchResult: (index) => {
          const { searchState } = get();
          if (index >= 0 && index < searchState.results.length) {
            const result = searchState.results[index];
            
            if (result.url) {
              get().navigateTo(result.url);
              get().closeSearch();
            }
          }
        },

        registerSearchProvider: (provider) => {
          set((state) => ({
            searchState: {
              ...state.searchState,
              providers: [
                ...state.searchState.providers.filter(p => p.id !== provider.id),
                provider,
              ].sort((a, b) => b.priority - a.priority),
            },
          }));
        },

        // Command palette actions
        openCommandPalette: () => {
          set((state) => ({
            commandPaletteState: {
              ...state.commandPaletteState,
              isOpen: true,
              query: '',
              selectedIndex: -1,
            },
          }));
        },

        closeCommandPalette: () => {
          set((state) => ({
            commandPaletteState: {
              ...state.commandPaletteState,
              isOpen: false,
              query: '',
              selectedIndex: -1,
            },
          }));
        },

        setCommandQuery: (query) => {
          // Filter commands based on query
          const allCommands = get().context.availableActions
            .filter(action => action.category === 'action')
            .map(action => ({
              id: action.id,
              label: action.label,
              description: '',
              icon: action.icon,
              category: 'actions' as const,
              keywords: [action.label.toLowerCase()],
              shortcut: action.shortcut,
              handler: action.handler,
              enabled: !action.disabled,
              visible: action.visible,
              priority: 1,
              lastUsed: undefined,
              useCount: 0,
            }));

          const filteredCommands = query.trim()
            ? allCommands.filter(command =>
                command.label.toLowerCase().includes(query.toLowerCase()) ||
                command.keywords.some(keyword => keyword.includes(query.toLowerCase()))
              )
            : allCommands;

          set((state) => ({
            commandPaletteState: {
              ...state.commandPaletteState,
              query,
              filteredCommands: filteredCommands.slice(0, 20), // Limit results
              selectedIndex: filteredCommands.length > 0 ? 0 : -1,
            },
          }));
        },

        selectCommand: (index) => {
          set((state) => ({
            commandPaletteState: {
              ...state.commandPaletteState,
              selectedIndex: index,
            },
          }));
        },

        executeCommand: async (command) => {
          try {
            // Track command execution
            get().trackEvent({
              type: 'command_execute',
              timestamp: new Date(),
              route: get().currentRoute,
              context: { commandId: command.id, category: command.category },
            });

            // Execute command
            await command.handler();
            
            // Update command usage
            command.lastUsed = new Date();
            command.useCount++;
            
            // Add to recent commands
            set((state) => ({
              commandPaletteState: {
                ...state.commandPaletteState,
                recentCommands: [
                  command,
                  ...state.commandPaletteState.recentCommands
                    .filter(c => c.id !== command.id)
                    .slice(0, 9), // Keep last 10
                ],
              },
            }));
            
            get().closeCommandPalette();
          } catch (error) {
            console.error('Command execution failed:', error);
          }
        },

        registerCommand: (command) => {
          // Commands are managed through context.availableActions
          // This is a placeholder for future command registration
        },

        unregisterCommand: (commandId) => {
          // Commands are managed through context.availableActions
          // This is a placeholder for future command unregistration
        },

        // Keyboard shortcuts
        registerShortcut: (shortcut) => {
          // Store shortcut in preferences
          set((state) => ({
            preferences: {
              ...state.preferences,
              shortcuts: {
                ...state.preferences.shortcuts,
                [shortcut.key]: shortcut.id,
              },
            },
          }));
        },

        unregisterShortcut: (shortcutId) => {
          set((state) => ({
            preferences: {
              ...state.preferences,
              shortcuts: Object.fromEntries(
                Object.entries(state.preferences.shortcuts)
                  .filter(([, id]) => id !== shortcutId)
              ),
            },
          }));
        },

        handleKeyboardEvent: (event) => {
          const { preferences, context } = get();
          
          // Build key combination string
          const modifiers = [];
          if (event.ctrlKey) modifiers.push('ctrl');
          if (event.metaKey) modifiers.push('cmd');
          if (event.altKey) modifiers.push('alt');
          if (event.shiftKey) modifiers.push('shift');
          
          const keyCombo = [...modifiers, event.key.toLowerCase()].join('+');
          
          // Find matching shortcut
          const shortcutId = preferences.shortcuts[keyCombo];
          if (shortcutId) {
            const action = context.availableActions.find(a => a.id === shortcutId);
            if (action && action.visible && !action.disabled) {
              event.preventDefault();
              action.handler();
              
              // Track shortcut usage
              get().trackEvent({
                type: 'shortcut_use',
                timestamp: new Date(),
                route: get().currentRoute,
                context: { shortcutId, keyCombo },
              });
              
              return true;
            }
          }
          
          return false;
        },

        // Preferences
        updatePreferences: (preferences) => {
          set((state) => ({
            preferences: {
              ...state.preferences,
              ...preferences,
            },
          }));
        },

        addRecentItem: (itemId) => {
          set((state) => ({
            preferences: {
              ...state.preferences,
              recentItems: [
                itemId,
                ...state.preferences.recentItems
                  .filter(id => id !== itemId)
                  .slice(0, 9), // Keep last 10
              ],
            },
          }));
        },

        togglePinnedItem: (itemId) => {
          set((state) => ({
            preferences: {
              ...state.preferences,
              pinnedItems: state.preferences.pinnedItems.includes(itemId)
                ? state.preferences.pinnedItems.filter(id => id !== itemId)
                : [...state.preferences.pinnedItems, itemId],
            },
          }));
        },

        // Context management
        updateContext: (context) => {
          set((state) => ({
            context: {
              ...state.context,
              ...context,
            },
          }));
        },

        // URL synchronization
        syncWithURL: (urlState) => {
          set({
            currentRoute: urlState.route,
          });
        },

        getURLState: () => {
          const state = get();
          return {
            route: state.currentRoute,
            params: {},
            query: {},
            hash: undefined,
            state: undefined,
          };
        },

        // Analytics
        trackEvent: (event) => {
          // Store events for analytics (in a real app, this would send to analytics service)
          console.log('Navigation event:', event);
        },

        getAnalytics: () => {
          // Return analytics data (placeholder)
          return {};
        },
      }),
      {
        name: 'devflow-navigation-store',
        partialize: (state) => ({
          preferences: state.preferences,
          history: state.history.slice(0, 20), // Persist limited history
        }),
      }
    ),
    {
      name: 'navigation-store',
    }
  )
);

// Selector hooks for better performance
export const useCurrentRoute = () => useNavigationStore(state => state.currentRoute);
export const useBreadcrumbs = () => useNavigationStore(state => state.breadcrumbs);
export const useNavigationHistory = () => useNavigationStore(state => state.history);
export const useSearchState = () => useNavigationStore(state => state.searchState);
export const useCommandPalette = () => useNavigationStore(state => state.commandPaletteState);
export const useNavigationPreferences = () => useNavigationStore(state => state.preferences);
export const useNavigationContext = () => useNavigationStore(state => state.context);