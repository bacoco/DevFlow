import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SelectableItem {
  id: string;
  type: string;
  data: any;
  selectable?: boolean;
}

export interface BatchOperation {
  id: string;
  label: string;
  icon: string;
  action: (items: SelectableItem[]) => Promise<void>;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  disabled?: (items: SelectableItem[]) => boolean;
}

interface BulkSelectionManagerProps {
  items: SelectableItem[];
  operations: BatchOperation[];
  onSelectionChange?: (selectedItems: SelectableItem[]) => void;
  className?: string;
  children: (props: BulkSelectionRenderProps) => React.ReactNode;
}

interface BulkSelectionRenderProps {
  selectedItems: SelectableItem[];
  isSelected: (id: string) => boolean;
  toggleSelection: (item: SelectableItem) => void;
  selectAll: () => void;
  clearSelection: () => void;
  selectRange: (startId: string, endId: string) => void;
  isSelectionMode: boolean;
}

export const BulkSelectionManager: React.FC<BulkSelectionManagerProps> = ({
  items,
  operations,
  onSelectionChange,
  className = '',
  children
}) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [isOperationInProgress, setIsOperationInProgress] = useState(false);
  const [operationFeedback, setOperationFeedback] = useState<string | null>(null);
  const selectionRef = useRef<HTMLDivElement>(null);

  const selectedItemsArray = items.filter(item => selectedItems.has(item.id));
  const isSelectionMode = selectedItems.size > 0;

  useEffect(() => {
    onSelectionChange?.(selectedItemsArray);
  }, [selectedItems, onSelectionChange]);

  const toggleSelection = useCallback((item: SelectableItem) => {
    if (!item.selectable && item.selectable !== undefined) return;

    setSelectedItems(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(item.id)) {
        newSelection.delete(item.id);
      } else {
        newSelection.add(item.id);
      }
      return newSelection;
    });
    setLastSelectedId(item.id);
  }, []);

  const selectAll = useCallback(() => {
    const selectableItems = items.filter(item => item.selectable !== false);
    setSelectedItems(new Set(selectableItems.map(item => item.id)));
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
    setLastSelectedId(null);
  }, []);

  const selectRange = useCallback((startId: string, endId: string) => {
    const startIndex = items.findIndex(item => item.id === startId);
    const endIndex = items.findIndex(item => item.id === endId);
    
    if (startIndex === -1 || endIndex === -1) return;

    const [start, end] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
    const rangeItems = items.slice(start, end + 1).filter(item => item.selectable !== false);
    
    setSelectedItems(prev => {
      const newSelection = new Set(prev);
      rangeItems.forEach(item => newSelection.add(item.id));
      return newSelection;
    });
  }, [items]);

  const isSelected = useCallback((id: string) => selectedItems.has(id), [selectedItems]);

  const executeOperation = useCallback(async (operation: BatchOperation) => {
    if (isOperationInProgress) return;
    
    const itemsToProcess = selectedItemsArray;
    if (itemsToProcess.length === 0) return;

    if (operation.disabled?.(itemsToProcess)) return;

    if (operation.requiresConfirmation) {
      const message = operation.confirmationMessage || 
        `Are you sure you want to ${operation.label.toLowerCase()} ${itemsToProcess.length} items?`;
      if (!window.confirm(message)) return;
    }

    setIsOperationInProgress(true);
    setOperationFeedback(`${operation.label} in progress...`);

    try {
      await operation.action(itemsToProcess);
      setOperationFeedback(`${operation.label} completed successfully`);
      clearSelection();
      
      setTimeout(() => setOperationFeedback(null), 3000);
    } catch (error) {
      setOperationFeedback(`${operation.label} failed: ${error.message}`);
      setTimeout(() => setOperationFeedback(null), 5000);
    } finally {
      setIsOperationInProgress(false);
    }
  }, [selectedItemsArray, isOperationInProgress, clearSelection]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectionRef.current?.contains(document.activeElement)) return;

      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'a':
            event.preventDefault();
            selectAll();
            break;
          case 'Escape':
            event.preventDefault();
            clearSelection();
            break;
        }
      }

      if (event.shiftKey && lastSelectedId && event.key === 'ArrowDown') {
        event.preventDefault();
        const currentIndex = items.findIndex(item => item.id === lastSelectedId);
        const nextItem = items[currentIndex + 1];
        if (nextItem) {
          selectRange(lastSelectedId, nextItem.id);
          setLastSelectedId(nextItem.id);
        }
      }

      if (event.shiftKey && lastSelectedId && event.key === 'ArrowUp') {
        event.preventDefault();
        const currentIndex = items.findIndex(item => item.id === lastSelectedId);
        const prevItem = items[currentIndex - 1];
        if (prevItem) {
          selectRange(lastSelectedId, prevItem.id);
          setLastSelectedId(prevItem.id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectAll, clearSelection, selectRange, lastSelectedId, items]);

  return (
    <div ref={selectionRef} className={`bulk-selection-manager ${className}`}>
      {children({
        selectedItems: selectedItemsArray,
        isSelected,
        toggleSelection,
        selectAll,
        clearSelection,
        selectRange,
        isSelectionMode
      })}

      <AnimatePresence>
        {isSelectionMode && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border p-4 z-50"
          >
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
              </span>
              
              <div className="flex gap-2">
                {operations.map(operation => (
                  <button
                    key={operation.id}
                    onClick={() => executeOperation(operation)}
                    disabled={isOperationInProgress || operation.disabled?.(selectedItemsArray)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <span className={operation.icon} />
                    {operation.label}
                  </button>
                ))}
                
                <button
                  onClick={clearSelection}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Clear
                </button>
              </div>
            </div>

            {operationFeedback && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-2 text-sm text-gray-600 dark:text-gray-400"
              >
                {operationFeedback}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};