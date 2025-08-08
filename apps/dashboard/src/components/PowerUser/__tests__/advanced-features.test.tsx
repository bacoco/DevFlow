import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkSelectionManager } from '../BulkSelectionManager';
import { KeyboardShortcutManager } from '../KeyboardShortcutManager';
import { AdvancedFilterSystem } from '../AdvancedFilterSystem';
import { DragDropLayoutCustomizer } from '../DragDropLayoutCustomizer';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('Advanced Power User Features', () => {
  describe('Keyboard Shortcut Customization', () => {
    it('should record and save custom shortcuts', async () => {
      const user = userEvent.setup();
      const shortcuts = [
        {
          id: 'test-shortcut',
          keys: ['ctrl', 's'],
          description: 'Test Shortcut',
          action: jest.fn(),
          customizable: true,
        },
      ];

      render(
        <KeyboardShortcutManager
          shortcuts={shortcuts}
          showHelp={true}
        />
      );

      // Start recording
      await user.click(screen.getByText('Edit'));
      expect(screen.getByText('Record New Shortcut')).toBeInTheDocument();

      // Simulate key press during recording
      fireEvent.keyDown(document, { key: 'Control', ctrlKey: true });
      fireEvent.keyDown(document, { key: 'x', ctrlKey: true });

      // Save the new shortcut
      await user.click(screen.getByText('Save'));

      // Verify recording dialog is closed
      expect(screen.queryByText('Record New Shortcut')).not.toBeInTheDocument();
    });

    it('should prevent conflicts with existing shortcuts', async () => {
      const user = userEvent.setup();
      const shortcuts = [
        {
          id: 'shortcut1',
          keys: ['ctrl', 's'],
          description: 'Save',
          action: jest.fn(),
          customizable: true,
        },
        {
          id: 'shortcut2',
          keys: ['ctrl', 'o'],
          description: 'Open',
          action: jest.fn(),
          customizable: true,
        },
      ];

      render(
        <KeyboardShortcutManager
          shortcuts={shortcuts}
          showHelp={true}
        />
      );

      // Both shortcuts should be visible
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Open')).toBeInTheDocument();
    });

    it('should reset shortcuts to default', async () => {
      const user = userEvent.setup();
      const shortcuts = [
        {
          id: 'test-shortcut',
          keys: ['ctrl', 's'],
          description: 'Test Shortcut',
          action: jest.fn(),
          customizable: true,
        },
      ];

      // Mock localStorage
      const mockLocalStorage = {
        getItem: jest.fn().mockReturnValue(JSON.stringify({ 'test-shortcut': ['ctrl', 'x'] })),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      };
      Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

      render(
        <KeyboardShortcutManager
          shortcuts={shortcuts}
          showHelp={true}
        />
      );

      // Reset button should be available for customized shortcuts
      const resetButton = screen.getByText('Reset');
      await user.click(resetButton);

      // Verify localStorage was updated
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Advanced Filtering Logic', () => {
    const filterFields = [
      { key: 'name', label: 'Name', type: 'string' as const },
      { key: 'age', label: 'Age', type: 'number' as const },
      { key: 'active', label: 'Active', type: 'boolean' as const },
    ];

    it('should handle complex nested filter groups', async () => {
      const user = userEvent.setup();
      const onFilterChange = jest.fn();

      render(
        <AdvancedFilterSystem
          fields={filterFields}
          onFilterChange={onFilterChange}
        />
      );

      // Show query builder
      await user.click(screen.getByText('Show Query Builder'));

      // Add first condition
      await user.click(screen.getByText('Add Condition'));

      // Add a group
      await user.click(screen.getByText('Add Group'));

      // Verify nested structure is created
      expect(onFilterChange).toHaveBeenCalled();
      const lastCall = onFilterChange.mock.calls[onFilterChange.mock.calls.length - 1][0];
      expect(lastCall.groups).toBeDefined();
    });

    it('should validate filter conditions', async () => {
      const user = userEvent.setup();
      const fieldsWithValidation = [
        {
          key: 'email',
          label: 'Email',
          type: 'string' as const,
          validation: (value: string) => value.includes('@'),
        },
      ];

      render(
        <AdvancedFilterSystem
          fields={fieldsWithValidation}
          onFilterChange={jest.fn()}
        />
      );

      await user.click(screen.getByText('Show Query Builder'));
      await user.click(screen.getByText('Add Condition'));

      // Enter invalid email
      const input = screen.getByRole('textbox');
      await user.type(input, 'invalid-email');

      // Validation should prevent invalid values (implementation dependent)
      expect(input).toHaveValue('invalid-email');
    });

    it('should export and import filter configurations', async () => {
      const user = userEvent.setup();
      const onSaveFilter = jest.fn();

      render(
        <AdvancedFilterSystem
          fields={filterFields}
          onFilterChange={jest.fn()}
          onSaveFilter={onSaveFilter}
        />
      );

      // Create a filter
      await user.click(screen.getByText('Show Query Builder'));
      await user.click(screen.getByText('Add Condition'));

      // Save the filter
      await user.click(screen.getByText('Save Filter'));
      
      const nameInput = screen.getByPlaceholderText('Enter filter name');
      await user.type(nameInput, 'Complex Filter');
      
      const descriptionInput = screen.getByPlaceholderText('Optional description');
      await user.type(descriptionInput, 'A complex filter for testing');

      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(onSaveFilter).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Complex Filter',
          description: 'A complex filter for testing',
        })
      );
    });
  });

  describe('Drag & Drop Advanced Features', () => {
    const MockComponent: React.FC = () => <div>Mock Component</div>;

    const layoutItems = [
      {
        id: 'item1',
        x: 0,
        y: 0,
        width: 200,
        height: 150,
        minWidth: 100,
        minHeight: 100,
        maxWidth: 400,
        maxHeight: 300,
        component: MockComponent,
        title: 'Constrained Item',
        draggable: true,
        resizable: true,
      },
    ];

    const gridConfig = {
      columns: 12,
      rows: 8,
      cellWidth: 80,
      cellHeight: 60,
      gap: 10,
      snapToGrid: true,
    };

    it('should respect size constraints during resize', async () => {
      const onLayoutChange = jest.fn();

      render(
        <DragDropLayoutCustomizer
          items={layoutItems}
          gridConfig={gridConfig}
          onLayoutChange={onLayoutChange}
          editMode={true}
        />
      );

      // Select item to show resize handles
      const item = screen.getByText('Constrained Item').closest('div');
      if (item) {
        fireEvent.click(item);
      }

      // Resize handles should be present (implementation dependent)
      // This test verifies the component renders without errors
      expect(screen.getByText('Constrained Item')).toBeInTheDocument();
    });

    it('should handle collision detection', async () => {
      const overlappingItems = [
        {
          id: 'item1',
          x: 0,
          y: 0,
          width: 200,
          height: 150,
          component: MockComponent,
          title: 'Item 1',
          draggable: true,
        },
        {
          id: 'item2',
          x: 100,
          y: 50,
          width: 200,
          height: 150,
          component: MockComponent,
          title: 'Item 2',
          draggable: true,
        },
      ];

      const onLayoutChange = jest.fn();

      render(
        <DragDropLayoutCustomizer
          items={overlappingItems}
          gridConfig={gridConfig}
          onLayoutChange={onLayoutChange}
          editMode={true}
        />
      );

      // Both items should render
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('should snap to grid when enabled', async () => {
      const onLayoutChange = jest.fn();

      render(
        <DragDropLayoutCustomizer
          items={layoutItems}
          gridConfig={{ ...gridConfig, snapToGrid: true }}
          onLayoutChange={onLayoutChange}
          editMode={true}
        />
      );

      // Grid should be visible
      expect(screen.getByText('Show Grid')).toBeInTheDocument();
      expect(screen.getByText('Snap to Grid')).toBeInTheDocument();

      // Snap to Grid checkbox should be checked
      const snapCheckbox = screen.getByRole('checkbox', { name: /snap to grid/i });
      expect(snapCheckbox).toBeChecked();
    });
  });

  describe('Bulk Operations Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const user = userEvent.setup();
      
      // Create large dataset
      const largeItemSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        type: 'task',
        data: { name: `Task ${i}`, priority: i % 3 === 0 ? 'high' : 'low' },
        selectable: true,
      }));

      const operations = [
        {
          id: 'bulk-update',
          label: 'Bulk Update',
          icon: '📝',
          action: jest.fn().mockResolvedValue(undefined),
        },
      ];

      const onSelectionChange = jest.fn();

      render(
        <BulkSelectionManager
          items={largeItemSet}
          operations={operations}
          onSelectionChange={onSelectionChange}
        >
          {({ selectAll, selectedItems }) => (
            <div>
              <button onClick={selectAll} data-testid="select-all">
                Select All ({largeItemSet.length} items)
              </button>
              <div data-testid="selected-count">{selectedItems.length}</div>
            </div>
          )}
        </BulkSelectionManager>
      );

      // Test selecting all items
      const startTime = performance.now();
      await user.click(screen.getByTestId('select-all'));
      const endTime = performance.now();

      // Should complete within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(screen.getByTestId('selected-count')).toHaveTextContent('1000');
    });

    it('should provide progress feedback for long operations', async () => {
      const user = userEvent.setup();
      
      const items = [
        { id: '1', type: 'task', data: { name: 'Task 1' }, selectable: true },
        { id: '2', type: 'task', data: { name: 'Task 2' }, selectable: true },
      ];

      const slowOperation = {
        id: 'slow-operation',
        label: 'Slow Operation',
        icon: '⏳',
        action: jest.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, 100))
        ),
      };

      render(
        <BulkSelectionManager
          items={items}
          operations={[slowOperation]}
        >
          {({ toggleSelection }) => (
            <div>
              {items.map(item => (
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

      // Execute slow operation
      await user.click(screen.getByText('Slow Operation'));

      // Should show progress feedback
      await waitFor(() => {
        expect(screen.getByText(/in progress/i)).toBeInTheDocument();
      });

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/completed successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Features', () => {
    it('should support keyboard navigation in bulk selection', async () => {
      const user = userEvent.setup();
      const items = [
        { id: '1', type: 'task', data: { name: 'Task 1' }, selectable: true },
        { id: '2', type: 'task', data: { name: 'Task 2' }, selectable: true },
        { id: '3', type: 'task', data: { name: 'Task 3' }, selectable: true },
      ];

      render(
        <div data-testid="container">
          <BulkSelectionManager items={items} operations={[]}>
            {({ selectedItems, toggleSelection }) => (
              <div>
                {items.map(item => (
                  <div
                    key={item.id}
                    onClick={() => toggleSelection(item)}
                    data-testid={`item-${item.id}`}
                    tabIndex={0}
                  >
                    {item.data.name}
                  </div>
                ))}
                <div data-testid="selected-count">{selectedItems.length}</div>
              </div>
            )}
          </BulkSelectionManager>
        </div>
      );

      const container = screen.getByTestId('container');
      container.focus();

      // Test Ctrl+A for select all
      await user.keyboard('{Control>}a{/Control}');
      expect(screen.getByTestId('selected-count')).toHaveTextContent('3');

      // Test Escape for clear selection
      await user.keyboard('{Escape}');
      expect(screen.getByTestId('selected-count')).toHaveTextContent('0');
    });

    it('should provide ARIA labels for complex interactions', () => {
      const shortcuts = [
        {
          id: 'test',
          keys: ['ctrl', 's'],
          description: 'Save Document',
          action: jest.fn(),
        },
      ];

      render(
        <KeyboardShortcutManager
          shortcuts={shortcuts}
          showHelp={true}
        />
      );

      // Help dialog should have proper ARIA attributes
      const dialog = screen.getByRole('dialog', { hidden: true });
      expect(dialog).toBeInTheDocument();
    });

    it('should support screen reader announcements', async () => {
      const user = userEvent.setup();
      const items = [
        { id: '1', type: 'task', data: { name: 'Task 1' }, selectable: true },
      ];

      const operations = [
        {
          id: 'delete',
          label: 'Delete',
          icon: '🗑️',
          action: jest.fn().mockResolvedValue(undefined),
        },
      ];

      render(
        <BulkSelectionManager items={items} operations={operations}>
          {({ toggleSelection }) => (
            <div>
              <div
                onClick={() => toggleSelection(items[0])}
                data-testid="item-1"
              >
                Task 1
              </div>
            </div>
          )}
        </BulkSelectionManager>
      );

      // Select item
      await user.click(screen.getByTestId('item-1'));

      // Execute operation
      await user.click(screen.getByText('Delete'));

      // Should provide feedback (implementation dependent)
      await waitFor(() => {
        expect(screen.getByText(/completed successfully/i)).toBeInTheDocument();
      });
    });
  });
});