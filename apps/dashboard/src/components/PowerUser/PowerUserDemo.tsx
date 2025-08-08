import React, { useState, useCallback } from 'react';
import { BulkSelectionManager, SelectableItem, BatchOperation } from './BulkSelectionManager';
import { KeyboardShortcutManager, KeyboardShortcut } from './KeyboardShortcutManager';
import { AdvancedFilterSystem, FilterField, SavedFilterSet, FilterGroup } from './AdvancedFilterSystem';
import { DragDropLayoutCustomizer, LayoutItem, GridConfig } from './DragDropLayoutCustomizer';
import { APIIntegrationTools, APIEndpoint, WebhookConfig } from './APIIntegrationTools';

// Sample data for demonstrations
const sampleItems: SelectableItem[] = [
  { id: '1', type: 'task', data: { name: 'Implement authentication', priority: 'high' }, selectable: true },
  { id: '2', type: 'task', data: { name: 'Fix navigation bug', priority: 'medium' }, selectable: true },
  { id: '3', type: 'task', data: { name: 'Update documentation', priority: 'low' }, selectable: true },
  { id: '4', type: 'task', data: { name: 'Optimize performance', priority: 'high' }, selectable: true },
  { id: '5', type: 'task', data: { name: 'Add unit tests', priority: 'medium' }, selectable: true },
];

const sampleOperations: BatchOperation[] = [
  {
    id: 'delete',
    label: 'Delete',
    icon: '🗑️',
    action: async (items) => {
      console.log('Deleting items:', items);
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
    requiresConfirmation: true,
    confirmationMessage: 'Are you sure you want to delete these items?'
  },
  {
    id: 'archive',
    label: 'Archive',
    icon: '📦',
    action: async (items) => {
      console.log('Archiving items:', items);
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  },
  {
    id: 'export',
    label: 'Export',
    icon: '📤',
    action: async (items) => {
      console.log('Exporting items:', items);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
];

const sampleShortcuts: KeyboardShortcut[] = [
  {
    id: 'save',
    keys: ['ctrl', 's'],
    description: 'Save current work',
    action: () => console.log('Save shortcut triggered'),
    category: 'File',
    customizable: true
  },
  {
    id: 'search',
    keys: ['ctrl', 'k'],
    description: 'Open search',
    action: () => console.log('Search shortcut triggered'),
    category: 'Navigation',
    customizable: true
  },
  {
    id: 'new_task',
    keys: ['ctrl', 'n'],
    description: 'Create new task',
    action: () => console.log('New task shortcut triggered'),
    category: 'Tasks',
    customizable: true
  },
  {
    id: 'toggle_sidebar',
    keys: ['ctrl', 'b'],
    description: 'Toggle sidebar',
    action: () => console.log('Toggle sidebar shortcut triggered'),
    category: 'View',
    customizable: true
  }
];

const sampleFilterFields: FilterField[] = [
  {
    key: 'name',
    label: 'Task Name',
    type: 'string',
    placeholder: 'Enter task name'
  },
  {
    key: 'priority',
    label: 'Priority',
    type: 'string',
    options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' }
    ]
  },
  {
    key: 'created_date',
    label: 'Created Date',
    type: 'date'
  },
  {
    key: 'assignee',
    label: 'Assignee',
    type: 'string',
    placeholder: 'Enter assignee name'
  },
  {
    key: 'status',
    label: 'Status',
    type: 'string',
    options: [
      { value: 'todo', label: 'To Do' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'done', label: 'Done' }
    ]
  }
];

// Sample components for layout customization
const SampleChart: React.FC = () => (
  <div className="w-full h-full bg-blue-100 dark:bg-blue-900 rounded p-4 flex items-center justify-center">
    <div className="text-center">
      <div className="text-2xl mb-2">📊</div>
      <div className="text-sm font-medium">Sample Chart</div>
    </div>
  </div>
);

const SampleWidget: React.FC = () => (
  <div className="w-full h-full bg-green-100 dark:bg-green-900 rounded p-4 flex items-center justify-center">
    <div className="text-center">
      <div className="text-2xl mb-2">📈</div>
      <div className="text-sm font-medium">Sample Widget</div>
    </div>
  </div>
);

const SampleTable: React.FC = () => (
  <div className="w-full h-full bg-purple-100 dark:bg-purple-900 rounded p-4 flex items-center justify-center">
    <div className="text-center">
      <div className="text-2xl mb-2">📋</div>
      <div className="text-sm font-medium">Sample Table</div>
    </div>
  </div>
);

const sampleLayoutItems: LayoutItem[] = [
  {
    id: 'chart1',
    x: 0,
    y: 0,
    width: 300,
    height: 200,
    component: SampleChart,
    title: 'Performance Chart',
    resizable: true,
    draggable: true
  },
  {
    id: 'widget1',
    x: 320,
    y: 0,
    width: 200,
    height: 150,
    component: SampleWidget,
    title: 'Metrics Widget',
    resizable: true,
    draggable: true
  },
  {
    id: 'table1',
    x: 0,
    y: 220,
    width: 400,
    height: 250,
    component: SampleTable,
    title: 'Data Table',
    resizable: true,
    draggable: true
  }
];

const sampleGridConfig: GridConfig = {
  columns: 12,
  rows: 8,
  cellWidth: 80,
  cellHeight: 60,
  gap: 10,
  snapToGrid: true
};

const sampleEndpoints: APIEndpoint[] = [
  {
    id: 'tasks_api',
    name: 'Tasks API',
    url: 'https://api.example.com/tasks',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    authentication: {
      type: 'bearer',
      token: 'your-api-token'
    },
    description: 'Fetch all tasks from the API',
    tags: ['tasks', 'productivity']
  },
  {
    id: 'create_task',
    name: 'Create Task',
    url: 'https://api.example.com/tasks',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'New Task',
      priority: 'medium',
      assignee: 'user@example.com'
    }),
    authentication: {
      type: 'bearer',
      token: 'your-api-token'
    },
    description: 'Create a new task',
    tags: ['tasks', 'create']
  }
];

const sampleWebhooks: WebhookConfig[] = [
  {
    id: 'task_updates',
    name: 'Task Updates',
    url: 'https://your-app.com/webhooks/tasks',
    events: ['task.created', 'task.updated', 'task.deleted'],
    active: true,
    secret: 'webhook-secret-key',
    retryPolicy: {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2
    },
    description: 'Receive notifications when tasks are modified'
  },
  {
    id: 'user_events',
    name: 'User Events',
    url: 'https://your-app.com/webhooks/users',
    events: ['user.login', 'user.logout'],
    active: false,
    description: 'Track user authentication events'
  }
];

export const PowerUserDemo: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<string>('bulk-selection');
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilterSet[]>([]);
  const [layoutItems, setLayoutItems] = useState<LayoutItem[]>(sampleLayoutItems);
  const [editMode, setEditMode] = useState(false);
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>(sampleEndpoints);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>(sampleWebhooks);

  const handleFilterChange = useCallback((filter: FilterGroup) => {
    console.log('Filter changed:', filter);
  }, []);

  const handleSaveFilter = useCallback((filter: SavedFilterSet) => {
    setSavedFilters(prev => [...prev, filter]);
  }, []);

  const handleDeleteFilter = useCallback((filterId: string) => {
    setSavedFilters(prev => prev.filter(f => f.id !== filterId));
  }, []);

  const handleLayoutChange = useCallback((items: LayoutItem[]) => {
    setLayoutItems(items);
  }, []);

  const handleEndpointSave = useCallback((endpoint: APIEndpoint) => {
    setEndpoints(prev => {
      const existing = prev.find(e => e.id === endpoint.id);
      if (existing) {
        return prev.map(e => e.id === endpoint.id ? endpoint : e);
      } else {
        return [...prev, endpoint];
      }
    });
  }, []);

  const handleEndpointDelete = useCallback((endpointId: string) => {
    setEndpoints(prev => prev.filter(e => e.id !== endpointId));
  }, []);

  const handleWebhookSave = useCallback((webhook: WebhookConfig) => {
    setWebhooks(prev => {
      const existing = prev.find(w => w.id === webhook.id);
      if (existing) {
        return prev.map(w => w.id === webhook.id ? webhook : w);
      } else {
        return [...prev, webhook];
      }
    });
  }, []);

  const handleWebhookDelete = useCallback((webhookId: string) => {
    setWebhooks(prev => prev.filter(w => w.id !== webhookId));
  }, []);

  const handleWebhookToggle = useCallback((webhookId: string, active: boolean) => {
    setWebhooks(prev => prev.map(w => 
      w.id === webhookId ? { ...w, active } : w
    ));
  }, []);

  const demos = [
    { id: 'bulk-selection', label: 'Bulk Selection', icon: '☑️' },
    { id: 'keyboard-shortcuts', label: 'Keyboard Shortcuts', icon: '⌨️' },
    { id: 'advanced-filtering', label: 'Advanced Filtering', icon: '🔍' },
    { id: 'drag-drop-layout', label: 'Drag & Drop Layout', icon: '🎯' },
    { id: 'api-integration', label: 'API Integration', icon: '🔌' }
  ];

  return (
    <div className="power-user-demo p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Power User Features</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Advanced interaction patterns designed for power users who need efficient workflows and customization options.
        </p>
      </div>

      {/* Demo navigation */}
      <div className="flex flex-wrap gap-2 mb-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        {demos.map(demo => (
          <button
            key={demo.id}
            onClick={() => setActiveDemo(demo.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeDemo === demo.id
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            <span className="mr-2">{demo.icon}</span>
            {demo.label}
          </button>
        ))}
      </div>

      {/* Keyboard shortcut manager (global) */}
      <KeyboardShortcutManager
        shortcuts={sampleShortcuts}
        showHelp={showShortcutHelp}
        onToggleHelp={() => setShowShortcutHelp(!showShortcutHelp)}
        onShortcutExecuted={(shortcut) => console.log('Shortcut executed:', shortcut)}
      />

      {/* Demo content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        {activeDemo === 'bulk-selection' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">Bulk Selection & Batch Operations</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Select multiple items and perform batch operations with clear feedback. 
                Use Ctrl+A to select all, Ctrl+Click for individual selection, and Shift+Click for range selection.
              </p>
            </div>

            <BulkSelectionManager
              items={sampleItems}
              operations={sampleOperations}
              onSelectionChange={(items) => console.log('Selection changed:', items)}
            >
              {({ selectedItems, isSelected, toggleSelection, selectAll, clearSelection, isSelectionMode }) => (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-4">
                    <button
                      onClick={selectAll}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearSelection}
                      className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Clear Selection
                    </button>
                    {isSelectionMode && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedItems.length} items selected
                      </span>
                    )}
                  </div>

                  <div className="grid gap-2">
                    {sampleItems.map(item => (
                      <div
                        key={item.id}
                        onClick={() => toggleSelection(item)}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          isSelected(item.id)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                            : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{item.data.name}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Priority: {item.data.priority}
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded border-2 ${
                            isSelected(item.id)
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {isSelected(item.id) && (
                              <div className="w-full h-full flex items-center justify-center text-white text-xs">
                                ✓
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </BulkSelectionManager>
          </div>
        )}

        {activeDemo === 'keyboard-shortcuts' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">Keyboard Shortcuts</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Comprehensive keyboard shortcut system with customizable bindings. 
                Press ? or click "Show Help" to view all available shortcuts.
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setShowShortcutHelp(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Show Keyboard Shortcuts Help
              </button>

              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <h3 className="font-medium mb-2">Try these shortcuts:</h3>
                <ul className="space-y-1 text-sm">
                  <li><kbd className="px-2 py-1 bg-white dark:bg-gray-600 rounded">Ctrl+S</kbd> - Save</li>
                  <li><kbd className="px-2 py-1 bg-white dark:bg-gray-600 rounded">Ctrl+K</kbd> - Search</li>
                  <li><kbd className="px-2 py-1 bg-white dark:bg-gray-600 rounded">Ctrl+N</kbd> - New Task</li>
                  <li><kbd className="px-2 py-1 bg-white dark:bg-gray-600 rounded">Ctrl+B</kbd> - Toggle Sidebar</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeDemo === 'advanced-filtering' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">Advanced Filtering</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Build complex queries with saved filter sets and visual query builder. 
                Create nested conditions with AND/OR logic.
              </p>
            </div>

            <AdvancedFilterSystem
              fields={sampleFilterFields}
              onFilterChange={handleFilterChange}
              savedFilters={savedFilters}
              onSaveFilter={handleSaveFilter}
              onDeleteFilter={handleDeleteFilter}
            />
          </div>
        )}

        {activeDemo === 'drag-drop-layout' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">Drag & Drop Layout Customization</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Customize your dashboard layout with drag-and-drop functionality, 
                grid snapping, and resize handles. Toggle edit mode to start customizing.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`px-4 py-2 rounded font-medium ${
                    editMode
                      ? 'bg-orange-600 text-white hover:bg-orange-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {editMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
                </button>
                
                {editMode && (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Drag items to move them, use resize handles to change size
                  </span>
                )}
              </div>

              <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                <DragDropLayoutCustomizer
                  items={layoutItems}
                  gridConfig={sampleGridConfig}
                  onLayoutChange={handleLayoutChange}
                  editMode={editMode}
                  className="min-h-[500px]"
                />
              </div>
            </div>
          </div>
        )}

        {activeDemo === 'api-integration' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">API Integration Tools</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Configure API endpoints and webhooks with authentication, testing capabilities, 
                and retry policies for robust integrations.
              </p>
            </div>

            <APIIntegrationTools
              endpoints={endpoints}
              webhooks={webhooks}
              onEndpointSave={handleEndpointSave}
              onEndpointDelete={handleEndpointDelete}
              onWebhookSave={handleWebhookSave}
              onWebhookDelete={handleWebhookDelete}
              onWebhookToggle={handleWebhookToggle}
            />
          </div>
        )}
      </div>

      {/* Global shortcut hint */}
      <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm">
        Press <kbd className="px-1 bg-gray-600 rounded">?</kbd> for keyboard shortcuts
      </div>
    </div>
  );
};