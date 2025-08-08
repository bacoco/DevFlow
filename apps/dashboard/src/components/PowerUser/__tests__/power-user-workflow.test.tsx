import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkSelectionManager, SelectableItem, BatchOperation } from '../BulkSelectionManager';
import { KeyboardShortcutManager, KeyboardShortcut } from '../KeyboardShortcutManager';
import { AdvancedFilterSystem, FilterField } from '../AdvancedFilterSystem';
import { DragDropLayoutCustomizer, LayoutItem, GridConfig } from '../DragDropLayoutCustomizer';
import { APIIntegrationTools, APIEndpoint, WebhookConfig } from '../APIIntegrationTools';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock fetch for API testing
global.fetch = jest.fn();

describe('Power User Workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Bulk Selection and Batch Operations', () => {
    const mockItems: SelectableItem[] = [
      { id: '1', type: 'task', data: { name: 'Task 1' }, selectable: true },
      { id: '2', type: 'task', data: { name: 'Task 2' }, selectable: true },
      { id: '3', type: 'task', data: { name: 'Task 3' }, selectable: true },
    ];

    const mockOperations: BatchOperation[] = [
      {
        id: 'delete',
        label: 'Delete',
        icon: '🗑️',
        action: jest.fn().mockResolvedValue(undefined),
        requiresConfirmation: true,
      },
      {
        id: 'archive',
        label: 'Archive',
        icon: '📦',
        action: jest.fn().mockResolvedValue(undefined),
      },
    ];

    it('should handle bulk selection workflow', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();

      render(
        <BulkSelectionManager
          items={mockItems}
          operations={mockOperations}
          onSelectionChange={onSelectionChange}
        >
          {({ selectedItems, isSelected, toggleSelection, selectAll, clearSelection }) => (
            <div>
              <button onClick={selectAll} data-testid="select-all">
                Select All
              </button>
              <button onClick={clearSelection} data-testid="clear-selection">
                Clear Selection
              </button>
              {mockItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => toggleSelection(item)}
                  data-testid={`item-${item.id}`}
                  className={isSelected(item.id) ? 'selected' : ''}
                >
                  {item.data.name}
                </div>
              ))}
              <div data-testid="selected-count">{selectedItems.length}</div>
            </div>
          )}
        </BulkSelectionManager>
      );

      // Test individual selection
      await user.click(screen.getByTestId('item-1'));
      expect(onSelectionChange).toHaveBeenCalledWith([mockItems[0]]);
      expect(screen.getByTestId('selected-count')).toHaveTextContent('1');

      // Test select all
      await user.click(screen.getByTestId('select-all'));
      expect(onSelectionChange).toHaveBeenCalledWith(mockItems);
      expect(screen.getByTestId('selected-count')).toHaveTextContent('3');

      // Test clear selection
      await user.click(screen.getByTestId('clear-selection'));
      expect(onSelectionChange).toHaveBeenCalledWith([]);
      expect(screen.getByTestId('selected-count')).toHaveTextContent('0');
    });

    it('should execute batch operations with confirmation', async () => {
      const user = userEvent.setup();
      
      // Mock window.confirm
      const originalConfirm = window.confirm;
      window.confirm = jest.fn().mockReturnValue(true);

      render(
        <BulkSelectionManager
          items={mockItems}
          operations={mockOperations}
        >
          {({ toggleSelection }) => (
            <div>
              {mockItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => toggleSelection(item)}
                  data-testid={`item-${item.id}`}
                >
                  {item.data.name}
                </div>
              ))}
            </div>
          )}
        </BulkSelectionManager>
      );

      // Select items
      await user.click(screen.getByTestId('item-1'));
      await user.click(screen.getByTestId('item-2'));

      // Find and click delete button (should appear in floating panel)
      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Delete'));

      // Verify confirmation was shown
      expect(window.confirm).toHaveBeenCalled();

      // Verify operation was executed
      await waitFor(() => {
        expect(mockOperations[0].action).toHaveBeenCalledWith([mockItems[0], mockItems[1]]);
      });

      // Restore window.confirm
      window.confirm = originalConfirm;
    });

    it('should handle keyboard shortcuts for bulk selection', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();

      render(
        <div data-testid="container">
          <BulkSelectionManager
            items={mockItems}
            operations={mockOperations}
            onSelectionChange={onSelectionChange}
          >
            {({ selectAll, clearSelection }) => (
              <div>
                {mockItems.map(item => (
                  <div key={item.id} data-testid={`item-${item.id}`}>
                    {item.data.name}
                  </div>
                ))}
              </div>
            )}
          </BulkSelectionManager>
        </div>
      );

      const container = screen.getByTestId('container');
      container.focus();

      // Test Ctrl+A for select all
      await user.keyboard('{Control>}a{/Control}');
      expect(onSelectionChange).toHaveBeenCalledWith(mockItems);

      // Test Escape for clear selection
      await user.keyboard('{Escape}');
      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });
  });

  describe('Keyboard Shortcuts System', () => {
    const mockShortcuts: KeyboardShortcut[] = [
      {
        id: 'save',
        keys: ['ctrl', 's'],
        description: 'Save',
        action: jest.fn(),
        customizable: true,
      },
      {
        id: 'search',
        keys: ['ctrl', 'k'],
        description: 'Search',
        action: jest.fn(),
        customizable: true,
      },
    ];

    it('should execute keyboard shortcuts', async () => {
      const user = userEvent.setup();
      const onShortcutExecuted = jest.fn();

      render(
        <div data-testid="container">
          <KeyboardShortcutManager
            shortcuts={mockShortcuts}
            onShortcutExecuted={onShortcutExecuted}
          />
        </div>
      );

      const container = screen.getByTestId('container');
      container.focus();

      // Test Ctrl+S shortcut
      await user.keyboard('{Control>}s{/Control}');
      
      await waitFor(() => {
        expect(mockShortcuts[0].action).toHaveBeenCalled();
        expect(onShortcutExecuted).toHaveBeenCalledWith(mockShortcuts[0]);
      });

      // Test Ctrl+K shortcut
      await user.keyboard('{Control>}k{/Control}');
      
      await waitFor(() => {
        expect(mockShortcuts[1].action).toHaveBeenCalled();
        expect(onShortcutExecuted).toHaveBeenCalledWith(mockShortcuts[1]);
      });
    });

    it('should show and hide help dialog', async () => {
      const user = userEvent.setup();
      const onToggleHelp = jest.fn();

      render(
        <KeyboardShortcutManager
          shortcuts={mockShortcuts}
          showHelp={true}
          onToggleHelp={onToggleHelp}
        />
      );

      // Help dialog should be visible
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();

      // Close help dialog
      await user.click(screen.getByText('✕'));
      expect(onToggleHelp).toHaveBeenCalled();
    });

    it('should allow customizing shortcuts', async () => {
      const user = userEvent.setup();

      render(
        <KeyboardShortcutManager
          shortcuts={mockShortcuts}
          showHelp={true}
        />
      );

      // Find and click edit button for first shortcut
      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]);

      // Recording dialog should appear
      expect(screen.getByText('Record New Shortcut')).toBeInTheDocument();
      expect(screen.getByText('Waiting for keys...')).toBeInTheDocument();

      // Cancel recording
      await user.click(screen.getByText('Cancel'));
      expect(screen.queryByText('Record New Shortcut')).not.toBeInTheDocument();
    });
  });

  describe('Advanced Filtering System', () => {
    const mockFields: FilterField[] = [
      {
        key: 'name',
        label: 'Name',
        type: 'string',
      },
      {
        key: 'priority',
        label: 'Priority',
        type: 'string',
        options: [
          { value: 'low', label: 'Low' },
          { value: 'high', label: 'High' },
        ],
      },
    ];

    it('should build and apply filters', async () => {
      const user = userEvent.setup();
      const onFilterChange = jest.fn();

      render(
        <AdvancedFilterSystem
          fields={mockFields}
          onFilterChange={onFilterChange}
        />
      );

      // Show query builder
      await user.click(screen.getByText('Show Query Builder'));
      expect(screen.getByText('Query Builder')).toBeInTheDocument();

      // Add condition
      await user.click(screen.getByText('Add Condition'));

      // Verify condition was added
      expect(screen.getByDisplayValue('name')).toBeInTheDocument();
      expect(screen.getByDisplayValue('equals')).toBeInTheDocument();

      // Verify filter change was called
      expect(onFilterChange).toHaveBeenCalled();
    });

    it('should save and load filters', async () => {
      const user = userEvent.setup();
      const onSaveFilter = jest.fn();

      render(
        <AdvancedFilterSystem
          fields={mockFields}
          onFilterChange={jest.fn()}
          onSaveFilter={onSaveFilter}
        />
      );

      // Open save dialog
      await user.click(screen.getByText('Save Filter'));
      expect(screen.getByText('Save Filter')).toBeInTheDocument();

      // Enter filter name
      const nameInput = screen.getByPlaceholderText('Enter filter name');
      await user.type(nameInput, 'My Filter');

      // Save filter
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(onSaveFilter).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Filter',
        })
      );
    });

    it('should clear all filters', async () => {
      const user = userEvent.setup();
      const onFilterChange = jest.fn();

      render(
        <AdvancedFilterSystem
          fields={mockFields}
          onFilterChange={onFilterChange}
        />
      );

      // Clear all filters
      await user.click(screen.getByText('Clear All'));

      // Verify empty filter was applied
      expect(onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          conditions: [],
          operator: 'AND',
        })
      );
    });
  });

  describe('Drag & Drop Layout Customization', () => {
    const MockComponent: React.FC = () => <div>Mock Component</div>;

    const mockItems: LayoutItem[] = [
      {
        id: 'item1',
        x: 0,
        y: 0,
        width: 200,
        height: 150,
        component: MockComponent,
        title: 'Item 1',
        draggable: true,
        resizable: true,
      },
      {
        id: 'item2',
        x: 220,
        y: 0,
        width: 200,
        height: 150,
        component: MockComponent,
        title: 'Item 2',
        draggable: true,
        resizable: true,
      },
    ];

    const mockGridConfig: GridConfig = {
      columns: 12,
      rows: 8,
      cellWidth: 80,
      cellHeight: 60,
      gap: 10,
      snapToGrid: true,
    };

    it('should render layout items', () => {
      const onLayoutChange = jest.fn();

      render(
        <DragDropLayoutCustomizer
          items={mockItems}
          gridConfig={mockGridConfig}
          onLayoutChange={onLayoutChange}
          editMode={true}
        />
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Show Grid')).toBeInTheDocument();
      expect(screen.getByText('Snap to Grid')).toBeInTheDocument();
    });

    it('should toggle edit mode controls', async () => {
      const user = userEvent.setup();
      const onLayoutChange = jest.fn();

      const { rerender } = render(
        <DragDropLayoutCustomizer
          items={mockItems}
          gridConfig={mockGridConfig}
          onLayoutChange={onLayoutChange}
          editMode={false}
        />
      );

      // Edit mode controls should not be visible
      expect(screen.queryByText('Show Grid')).not.toBeInTheDocument();

      // Enable edit mode
      rerender(
        <DragDropLayoutCustomizer
          items={mockItems}
          gridConfig={mockGridConfig}
          onLayoutChange={onLayoutChange}
          editMode={true}
        />
      );

      // Edit mode controls should be visible
      expect(screen.getByText('Show Grid')).toBeInTheDocument();
      expect(screen.getByText('Snap to Grid')).toBeInTheDocument();
    });

    it('should handle item selection', async () => {
      const user = userEvent.setup();
      const onItemSelect = jest.fn();

      render(
        <DragDropLayoutCustomizer
          items={mockItems}
          gridConfig={mockGridConfig}
          onLayoutChange={jest.fn()}
          onItemSelect={onItemSelect}
          editMode={true}
        />
      );

      // Click on first item
      const item1 = screen.getByText('Item 1').closest('div');
      if (item1) {
        await user.click(item1);
        expect(onItemSelect).toHaveBeenCalledWith(mockItems[0]);
      }
    });
  });

  describe('API Integration Tools', () => {
    const mockEndpoints: APIEndpoint[] = [
      {
        id: 'test-endpoint',
        name: 'Test Endpoint',
        url: 'https://api.example.com/test',
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        authentication: { type: 'none' },
      },
    ];

    const mockWebhooks: WebhookConfig[] = [
      {
        id: 'test-webhook',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['test.event'],
        active: true,
      },
    ];

    it('should display endpoints and webhooks', () => {
      render(
        <APIIntegrationTools
          endpoints={mockEndpoints}
          webhooks={mockWebhooks}
          onEndpointSave={jest.fn()}
          onEndpointDelete={jest.fn()}
          onWebhookSave={jest.fn()}
          onWebhookDelete={jest.fn()}
          onWebhookToggle={jest.fn()}
        />
      );

      expect(screen.getByText('Test Endpoint')).toBeInTheDocument();
      expect(screen.getByText('https://api.example.com/test')).toBeInTheDocument();
    });

    it('should switch between tabs', async () => {
      const user = userEvent.setup();

      render(
        <APIIntegrationTools
          endpoints={mockEndpoints}
          webhooks={mockWebhooks}
          onEndpointSave={jest.fn()}
          onEndpointDelete={jest.fn()}
          onWebhookSave={jest.fn()}
          onWebhookDelete={jest.fn()}
          onWebhookToggle={jest.fn()}
        />
      );

      // Switch to webhooks tab
      await user.click(screen.getByText('Webhooks'));
      expect(screen.getByText('Test Webhook')).toBeInTheDocument();

      // Switch to testing tab
      await user.click(screen.getByText('Testing'));
      expect(screen.getByText('API Testing')).toBeInTheDocument();
    });

    it('should test API endpoint', async () => {
      const user = userEvent.setup();
      
      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({ success: true }),
      });

      render(
        <APIIntegrationTools
          endpoints={mockEndpoints}
          webhooks={mockWebhooks}
          onEndpointSave={jest.fn()}
          onEndpointDelete={jest.fn()}
          onWebhookSave={jest.fn()}
          onWebhookDelete={jest.fn()}
          onWebhookToggle={jest.fn()}
        />
      );

      // Select endpoint
      await user.click(screen.getByText('Test Endpoint'));

      // Test endpoint
      await user.click(screen.getByText('Test'));

      // Verify fetch was called
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should add new endpoint', async () => {
      const user = userEvent.setup();
      const onEndpointSave = jest.fn();

      render(
        <APIIntegrationTools
          endpoints={[]}
          webhooks={[]}
          onEndpointSave={onEndpointSave}
          onEndpointDelete={jest.fn()}
          onWebhookSave={jest.fn()}
          onWebhookDelete={jest.fn()}
          onWebhookToggle={jest.fn()}
        />
      );

      // Add new endpoint
      await user.click(screen.getByText('+ Add'));

      // Should show endpoint form
      expect(screen.getByText('API Endpoint Configuration')).toBeInTheDocument();
      expect(screen.getByDisplayValue('New Endpoint')).toBeInTheDocument();
    });

    it('should toggle webhook status', async () => {
      const user = userEvent.setup();
      const onWebhookToggle = jest.fn();

      render(
        <APIIntegrationTools
          endpoints={[]}
          webhooks={mockWebhooks}
          onEndpointSave={jest.fn()}
          onEndpointDelete={jest.fn()}
          onWebhookSave={jest.fn()}
          onWebhookDelete={jest.fn()}
          onWebhookToggle={onWebhookToggle}
        />
      );

      // Switch to webhooks tab
      await user.click(screen.getByText('Webhooks'));

      // Select webhook
      await user.click(screen.getByText('Test Webhook'));

      // Toggle webhook (should show Disable since it's active)
      await user.click(screen.getByText('Disable'));

      expect(onWebhookToggle).toHaveBeenCalledWith('test-webhook', false);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex power user workflow', async () => {
      const user = userEvent.setup();

      // Mock items for bulk selection
      const items: SelectableItem[] = [
        { id: '1', type: 'task', data: { name: 'Task 1', priority: 'high' } },
        { id: '2', type: 'task', data: { name: 'Task 2', priority: 'low' } },
      ];

      const operations: BatchOperation[] = [
        {
          id: 'update-priority',
          label: 'Update Priority',
          icon: '⚡',
          action: jest.fn().mockResolvedValue(undefined),
        },
      ];

      const shortcuts: KeyboardShortcut[] = [
        {
          id: 'select-all',
          keys: ['ctrl', 'a'],
          description: 'Select All Items',
          action: jest.fn(),
        },
      ];

      const filterFields: FilterField[] = [
        {
          key: 'priority',
          label: 'Priority',
          type: 'string',
          options: [
            { value: 'high', label: 'High' },
            { value: 'low', label: 'Low' },
          ],
        },
      ];

      // Render integrated power user interface
      render(
        <div data-testid="power-user-interface">
          <KeyboardShortcutManager shortcuts={shortcuts} />
          
          <AdvancedFilterSystem
            fields={filterFields}
            onFilterChange={jest.fn()}
          />
          
          <BulkSelectionManager items={items} operations={operations}>
            {({ selectedItems, toggleSelection, selectAll }) => (
              <div>
                <button onClick={selectAll} data-testid="select-all-btn">
                  Select All
                </button>
                {items.map(item => (
                  <div
                    key={item.id}
                    onClick={() => toggleSelection(item)}
                    data-testid={`item-${item.id}`}
                  >
                    {item.data.name} - {item.data.priority}
                  </div>
                ))}
                <div data-testid="selected-count">{selectedItems.length}</div>
              </div>
            )}
          </BulkSelectionManager>
        </div>
      );

      // Test integrated workflow
      // 1. Apply filter
      await user.click(screen.getByText('Show Query Builder'));
      await user.click(screen.getByText('Add Condition'));

      // 2. Select items
      await user.click(screen.getByTestId('select-all-btn'));
      expect(screen.getByTestId('selected-count')).toHaveTextContent('2');

      // 3. Execute batch operation
      await waitFor(() => {
        expect(screen.getByText('Update Priority')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Update Priority'));

      // 4. Verify operation was executed
      await waitFor(() => {
        expect(operations[0].action).toHaveBeenCalledWith(items);
      });
    });
  });
});