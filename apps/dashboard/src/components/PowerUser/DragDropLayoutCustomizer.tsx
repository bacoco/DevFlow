import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface LayoutItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  resizable?: boolean;
  draggable?: boolean;
  component: React.ComponentType<any>;
  props?: any;
  title?: string;
}

export interface GridConfig {
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  gap: number;
  snapToGrid: boolean;
}

interface DragDropLayoutCustomizerProps {
  items: LayoutItem[];
  gridConfig: GridConfig;
  onLayoutChange: (items: LayoutItem[]) => void;
  onItemSelect?: (item: LayoutItem | null) => void;
  className?: string;
  editMode?: boolean;
}

interface DragState {
  isDragging: boolean;
  draggedItem: LayoutItem | null;
  dragOffset: { x: number; y: number };
  originalPosition: { x: number; y: number };
}

interface ResizeState {
  isResizing: boolean;
  resizedItem: LayoutItem | null;
  resizeHandle: string;
  startPosition: { x: number; y: number };
  startSize: { width: number; height: number };
}

export const DragDropLayoutCustomizer: React.FC<DragDropLayoutCustomizerProps> = ({
  items,
  gridConfig,
  onLayoutChange,
  onItemSelect,
  className = '',
  editMode = false
}) => {
  const [layoutItems, setLayoutItems] = useState<LayoutItem[]>(items);
  const [selectedItem, setSelectedItem] = useState<LayoutItem | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItem: null,
    dragOffset: { x: 0, y: 0 },
    originalPosition: { x: 0, y: 0 }
  });
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    resizedItem: null,
    resizeHandle: '',
    startPosition: { x: 0, y: 0 },
    startSize: { width: 0, height: 0 }
  });
  const [showGrid, setShowGrid] = useState(editMode);
  const [snapToGrid, setSnapToGrid] = useState(gridConfig.snapToGrid);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Update items when props change
  useEffect(() => {
    setLayoutItems(items);
  }, [items]);

  // Snap position to grid
  const snapToGridPosition = useCallback((x: number, y: number) => {
    if (!snapToGrid) return { x, y };
    
    const snappedX = Math.round(x / (gridConfig.cellWidth + gridConfig.gap)) * (gridConfig.cellWidth + gridConfig.gap);
    const snappedY = Math.round(y / (gridConfig.cellHeight + gridConfig.gap)) * (gridConfig.cellHeight + gridConfig.gap);
    
    return { x: snappedX, y: snappedY };
  }, [snapToGrid, gridConfig]);

  // Snap size to grid
  const snapToGridSize = useCallback((width: number, height: number) => {
    if (!snapToGrid) return { width, height };
    
    const snappedWidth = Math.max(
      gridConfig.cellWidth,
      Math.round(width / (gridConfig.cellWidth + gridConfig.gap)) * (gridConfig.cellWidth + gridConfig.gap)
    );
    const snappedHeight = Math.max(
      gridConfig.cellHeight,
      Math.round(height / (gridConfig.cellHeight + gridConfig.gap)) * (gridConfig.cellHeight + gridConfig.gap)
    );
    
    return { width: snappedWidth, height: snappedHeight };
  }, [snapToGrid, gridConfig]);

  // Check for collisions
  const checkCollision = useCallback((item: LayoutItem, otherItems: LayoutItem[]) => {
    return otherItems.some(other => {
      if (other.id === item.id) return false;
      
      return !(
        item.x >= other.x + other.width ||
        item.x + item.width <= other.x ||
        item.y >= other.y + other.height ||
        item.y + item.height <= other.y
      );
    });
  }, []);

  // Handle drag start
  const handleDragStart = useCallback((item: LayoutItem, event: React.MouseEvent) => {
    if (!editMode || !item.draggable) return;
    
    event.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const offsetX = event.clientX - rect.left - item.x;
    const offsetY = event.clientY - rect.top - item.y;

    setDragState({
      isDragging: true,
      draggedItem: item,
      dragOffset: { x: offsetX, y: offsetY },
      originalPosition: { x: item.x, y: item.y }
    });

    setSelectedItem(item);
    onItemSelect?.(item);
  }, [editMode, onItemSelect]);

  // Handle drag move
  const handleDragMove = useCallback((event: MouseEvent) => {
    if (!dragState.isDragging || !dragState.draggedItem) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const newX = event.clientX - rect.left - dragState.dragOffset.x;
    const newY = event.clientY - rect.top - dragState.dragOffset.y;

    const snappedPosition = snapToGridPosition(newX, newY);
    
    // Constrain to container bounds
    const constrainedX = Math.max(0, Math.min(snappedPosition.x, rect.width - dragState.draggedItem.width));
    const constrainedY = Math.max(0, Math.min(snappedPosition.y, rect.height - dragState.draggedItem.height));

    const updatedItem = {
      ...dragState.draggedItem,
      x: constrainedX,
      y: constrainedY
    };

    // Check for collisions
    const otherItems = layoutItems.filter(item => item.id !== dragState.draggedItem!.id);
    const hasCollision = checkCollision(updatedItem, otherItems);

    if (!hasCollision) {
      setLayoutItems(prev => prev.map(item => 
        item.id === dragState.draggedItem!.id ? updatedItem : item
      ));
    }
  }, [dragState, layoutItems, snapToGridPosition, checkCollision]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (dragState.isDragging) {
      setDragState({
        isDragging: false,
        draggedItem: null,
        dragOffset: { x: 0, y: 0 },
        originalPosition: { x: 0, y: 0 }
      });
      onLayoutChange(layoutItems);
    }
  }, [dragState.isDragging, layoutItems, onLayoutChange]);

  // Handle resize start
  const handleResizeStart = useCallback((item: LayoutItem, handle: string, event: React.MouseEvent) => {
    if (!editMode || !item.resizable) return;
    
    event.preventDefault();
    event.stopPropagation();

    setResizeState({
      isResizing: true,
      resizedItem: item,
      resizeHandle: handle,
      startPosition: { x: event.clientX, y: event.clientY },
      startSize: { width: item.width, height: item.height }
    });

    setSelectedItem(item);
    onItemSelect?.(item);
  }, [editMode, onItemSelect]);

  // Handle resize move
  const handleResizeMove = useCallback((event: MouseEvent) => {
    if (!resizeState.isResizing || !resizeState.resizedItem) return;

    const deltaX = event.clientX - resizeState.startPosition.x;
    const deltaY = event.clientY - resizeState.startPosition.y;

    let newWidth = resizeState.startSize.width;
    let newHeight = resizeState.startSize.height;
    let newX = resizeState.resizedItem.x;
    let newY = resizeState.resizedItem.y;

    switch (resizeState.resizeHandle) {
      case 'se': // Southeast
        newWidth = resizeState.startSize.width + deltaX;
        newHeight = resizeState.startSize.height + deltaY;
        break;
      case 'sw': // Southwest
        newWidth = resizeState.startSize.width - deltaX;
        newHeight = resizeState.startSize.height + deltaY;
        newX = resizeState.resizedItem.x + deltaX;
        break;
      case 'ne': // Northeast
        newWidth = resizeState.startSize.width + deltaX;
        newHeight = resizeState.startSize.height - deltaY;
        newY = resizeState.resizedItem.y + deltaY;
        break;
      case 'nw': // Northwest
        newWidth = resizeState.startSize.width - deltaX;
        newHeight = resizeState.startSize.height - deltaY;
        newX = resizeState.resizedItem.x + deltaX;
        newY = resizeState.resizedItem.y + deltaY;
        break;
      case 'n': // North
        newHeight = resizeState.startSize.height - deltaY;
        newY = resizeState.resizedItem.y + deltaY;
        break;
      case 's': // South
        newHeight = resizeState.startSize.height + deltaY;
        break;
      case 'e': // East
        newWidth = resizeState.startSize.width + deltaX;
        break;
      case 'w': // West
        newWidth = resizeState.startSize.width - deltaX;
        newX = resizeState.resizedItem.x + deltaX;
        break;
    }

    // Apply constraints
    const minWidth = resizeState.resizedItem.minWidth || gridConfig.cellWidth;
    const minHeight = resizeState.resizedItem.minHeight || gridConfig.cellHeight;
    const maxWidth = resizeState.resizedItem.maxWidth || Infinity;
    const maxHeight = resizeState.resizedItem.maxHeight || Infinity;

    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

    // Snap to grid
    const snappedSize = snapToGridSize(newWidth, newHeight);
    const snappedPosition = snapToGridPosition(newX, newY);

    const updatedItem = {
      ...resizeState.resizedItem,
      x: snappedPosition.x,
      y: snappedPosition.y,
      width: snappedSize.width,
      height: snappedSize.height
    };

    // Check for collisions
    const otherItems = layoutItems.filter(item => item.id !== resizeState.resizedItem!.id);
    const hasCollision = checkCollision(updatedItem, otherItems);

    if (!hasCollision) {
      setLayoutItems(prev => prev.map(item => 
        item.id === resizeState.resizedItem!.id ? updatedItem : item
      ));
    }
  }, [resizeState, layoutItems, snapToGridSize, snapToGridPosition, checkCollision, gridConfig]);

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    if (resizeState.isResizing) {
      setResizeState({
        isResizing: false,
        resizedItem: null,
        resizeHandle: '',
        startPosition: { x: 0, y: 0 },
        startSize: { width: 0, height: 0 }
      });
      onLayoutChange(layoutItems);
    }
  }, [resizeState.isResizing, layoutItems, onLayoutChange]);

  // Mouse event handlers
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      handleDragMove(event);
      handleResizeMove(event);
    };

    const handleMouseUp = () => {
      handleDragEnd();
      handleResizeEnd();
    };

    if (dragState.isDragging || resizeState.isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState.isDragging, resizeState.isResizing, handleDragMove, handleDragEnd, handleResizeMove, handleResizeEnd]);

  // Render resize handles
  const renderResizeHandles = useCallback((item: LayoutItem) => {
    if (!editMode || !item.resizable || selectedItem?.id !== item.id) return null;

    const handles = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
    
    return handles.map(handle => (
      <div
        key={handle}
        className={`absolute w-3 h-3 bg-blue-600 border border-white rounded-sm cursor-${handle}-resize z-10 ${getHandlePosition(handle)}`}
        onMouseDown={(e) => handleResizeStart(item, handle, e)}
      />
    ));
  }, [editMode, selectedItem, handleResizeStart]);

  // Get handle position classes
  const getHandlePosition = (handle: string) => {
    const positions: Record<string, string> = {
      'nw': '-top-1.5 -left-1.5',
      'n': '-top-1.5 left-1/2 transform -translate-x-1/2',
      'ne': '-top-1.5 -right-1.5',
      'w': 'top-1/2 -left-1.5 transform -translate-y-1/2',
      'e': 'top-1/2 -right-1.5 transform -translate-y-1/2',
      'sw': '-bottom-1.5 -left-1.5',
      's': '-bottom-1.5 left-1/2 transform -translate-x-1/2',
      'se': '-bottom-1.5 -right-1.5'
    };
    return positions[handle] || '';
  };

  // Handle item click
  const handleItemClick = useCallback((item: LayoutItem, event: React.MouseEvent) => {
    if (!editMode) return;
    
    event.stopPropagation();
    setSelectedItem(item);
    onItemSelect?.(item);
  }, [editMode, onItemSelect]);

  // Handle container click
  const handleContainerClick = useCallback(() => {
    if (editMode) {
      setSelectedItem(null);
      onItemSelect?.(null);
    }
  }, [editMode, onItemSelect]);

  return (
    <div className={`drag-drop-layout-customizer ${className}`}>
      {editMode && (
        <div className="flex items-center gap-4 mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
            />
            Show Grid
          </label>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.checked)}
            />
            Snap to Grid
          </label>
          
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {selectedItem ? `Selected: ${selectedItem.title || selectedItem.id}` : 'Click an item to select'}
          </span>
        </div>
      )}

      <div
        ref={containerRef}
        className="relative w-full h-full overflow-hidden bg-gray-50 dark:bg-gray-900 rounded-lg"
        onClick={handleContainerClick}
        style={{ minHeight: '600px' }}
      >
        {/* Grid overlay */}
        {showGrid && editMode && (
          <div
            ref={gridRef}
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(to right, #ccc 1px, transparent 1px),
                linear-gradient(to bottom, #ccc 1px, transparent 1px)
              `,
              backgroundSize: `${gridConfig.cellWidth + gridConfig.gap}px ${gridConfig.cellHeight + gridConfig.gap}px`
            }}
          />
        )}

        {/* Layout items */}
        <AnimatePresence>
          {layoutItems.map(item => {
            const Component = item.component;
            const isSelected = selectedItem?.id === item.id;
            const isDragging = dragState.draggedItem?.id === item.id;
            
            return (
              <motion.div
                key={item.id}
                layout
                className={`absolute border-2 rounded-lg overflow-hidden ${
                  editMode 
                    ? `cursor-move ${isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-300 dark:border-gray-600'} ${isDragging ? 'z-50' : 'z-10'}`
                    : 'border-transparent'
                }`}
                style={{
                  left: item.x,
                  top: item.y,
                  width: item.width,
                  height: item.height,
                  opacity: isDragging ? 0.8 : 1
                }}
                onMouseDown={(e) => handleDragStart(item, e)}
                onClick={(e) => handleItemClick(item, e)}
                whileDrag={{ scale: 1.02 }}
              >
                {editMode && (
                  <div className="absolute top-0 left-0 right-0 bg-gray-800 bg-opacity-75 text-white text-xs px-2 py-1 z-20">
                    {item.title || item.id}
                  </div>
                )}
                
                <div className={`w-full h-full ${editMode ? 'pt-6' : ''}`}>
                  <Component {...(item.props || {})} />
                </div>
                
                {renderResizeHandles(item)}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};