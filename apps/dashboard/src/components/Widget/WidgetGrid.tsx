import React, { useState, useCallback, useMemo } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { motion, AnimatePresence } from 'framer-motion';
import { Widget as WidgetType, WidgetPosition } from '../../types/dashboard';
import { Widget } from './Widget';
import { MetricCard } from './MetricCard';
import { ChartWidget } from './ChartWidget';
import { ActivityFeedWidget } from './ActivityFeedWidget';
import { Plus, Settings, Lock, Unlock } from 'lucide-react';
// CSS imports moved to _app.tsx to avoid global CSS import issues

const ResponsiveGridLayout = WidthProvider(Responsive);

interface WidgetGridProps {
  widgets: WidgetType[];
  onWidgetUpdate: (widgetId: string, updates: Partial<WidgetType>) => void;
  onWidgetRemove: (widgetId: string) => void;
  onWidgetAdd: () => void;
  onLayoutChange?: (layout: Layout[]) => void;
  isEditable?: boolean;
  className?: string;
}

interface GridBreakpoints {
  lg: number;
  md: number;
  sm: number;
  xs: number;
  xxs: number;
}

interface GridCols {
  lg: number;
  md: number;
  sm: number;
  xs: number;
  xxs: number;
}

const BREAKPOINTS: GridBreakpoints = {
  lg: 1200,
  md: 996,
  sm: 768,
  xs: 480,
  xxs: 0,
};

const COLS: GridCols = {
  lg: 12,
  md: 10,
  sm: 6,
  xs: 4,
  xxs: 2,
};

const DEFAULT_WIDGET_SIZE = {
  w: 4,
  h: 6,
  minW: 2,
  minH: 4,
  maxW: 12,
  maxH: 12,
};

export const WidgetGrid: React.FC<WidgetGridProps> = ({
  widgets,
  onWidgetUpdate,
  onWidgetRemove,
  onWidgetAdd,
  onLayoutChange,
  isEditable = false,
  className = '',
}) => {
  const [editMode, setEditMode] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [resizingWidget, setResizingWidget] = useState<string | null>(null);

  // Convert widgets to grid layout format
  const layouts = useMemo(() => {
    const layout: Layout[] = widgets.map((widget) => ({
      i: widget.id,
      x: widget.position.x,
      y: widget.position.y,
      w: widget.position.w,
      h: widget.position.h,
      minW: DEFAULT_WIDGET_SIZE.minW,
      minH: DEFAULT_WIDGET_SIZE.minH,
      maxW: DEFAULT_WIDGET_SIZE.maxW,
      maxH: DEFAULT_WIDGET_SIZE.maxH,
      isDraggable: isEditable && editMode,
      isResizable: isEditable && editMode,
    }));

    return {
      lg: layout,
      md: layout,
      sm: layout,
      xs: layout,
      xxs: layout,
    };
  }, [widgets, isEditable, editMode]);

  // Handle layout changes (drag/resize)
  const handleLayoutChange = useCallback(
    (layout: Layout[], layouts: { [key: string]: Layout[] }) => {
      if (!editMode) return;

      layout.forEach((item) => {
        const widget = widgets.find((w) => w.id === item.i);
        if (widget) {
          const newPosition: WidgetPosition = {
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
          };

          // Only update if position actually changed
          if (
            widget.position.x !== newPosition.x ||
            widget.position.y !== newPosition.y ||
            widget.position.w !== newPosition.w ||
            widget.position.h !== newPosition.h
          ) {
            onWidgetUpdate(widget.id, { position: newPosition });
          }
        }
      });

      onLayoutChange?.(layout);
    },
    [widgets, onWidgetUpdate, onLayoutChange, editMode]
  );

  // Handle drag start
  const handleDragStart = useCallback((layout: Layout[], oldItem: Layout, newItem: Layout) => {
    setDraggedWidget(newItem.i);
  }, []);

  // Handle drag stop
  const handleDragStop = useCallback((layout: Layout[], oldItem: Layout, newItem: Layout) => {
    setDraggedWidget(null);
  }, []);

  // Handle resize start
  const handleResizeStart = useCallback((layout: Layout[], oldItem: Layout, newItem: Layout) => {
    setResizingWidget(newItem.i);
  }, []);

  // Handle resize stop
  const handleResizeStop = useCallback((layout: Layout[], oldItem: Layout, newItem: Layout) => {
    setResizingWidget(null);
  }, []);

  // Render widget based on type
  const renderWidget = useCallback(
    (widget: WidgetType) => {
      const isBeingDragged = draggedWidget === widget.id;
      const isBeingResized = resizingWidget === widget.id;
      const isInteracting = isBeingDragged || isBeingResized;

      const commonProps = {
        widget,
        onRefresh: () => {
          // Trigger widget refresh
          onWidgetUpdate(widget.id, { 
            data: { ...widget.data, lastUpdated: new Date() } 
          });
        },
        onConfigure: () => {
          // Open configuration modal
          console.log('Configure widget:', widget.id);
        },
        onRemove: editMode ? () => onWidgetRemove(widget.id) : undefined,
        loading: false,
        error: undefined,
      };

      let WidgetComponent;
      switch (widget.type) {
        case 'metric_card':
          WidgetComponent = MetricCard;
          break;
        case 'line_chart':
        case 'bar_chart':
        case 'pie_chart':
          WidgetComponent = ChartWidget;
          break;
        case 'activity_feed':
          WidgetComponent = ActivityFeedWidget;
          break;
        default:
          WidgetComponent = Widget;
      }

      return (
        <motion.div
          key={widget.id}
          layout
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            zIndex: isInteracting ? 1000 : 1,
          }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ 
            duration: 0.3,
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
          className={`
            relative h-full
            ${isBeingDragged ? 'shadow-2xl ring-2 ring-blue-500 ring-opacity-50' : ''}
            ${isBeingResized ? 'ring-2 ring-green-500 ring-opacity-50' : ''}
            ${editMode ? 'cursor-move' : ''}
          `}
          whileHover={editMode ? { scale: 1.02 } : {}}
          whileTap={editMode ? { scale: 0.98 } : {}}
        >
          <WidgetComponent {...commonProps} />
          
          {/* Edit mode overlay */}
          {editMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-blue-500 bg-opacity-10 border-2 border-blue-500 border-dashed rounded-lg pointer-events-none"
            />
          )}
          
          {/* Drag handle for edit mode */}
          {editMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-2 right-2 bg-blue-500 text-white p-1 rounded cursor-move z-10"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Settings size={12} />
            </motion.div>
          )}
        </motion.div>
      );
    },
    [draggedWidget, resizingWidget, editMode, onWidgetUpdate, onWidgetRemove]
  );

  return (
    <div className={`widget-grid ${className}`}>
      {/* Grid Controls */}
      {isEditable && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">Dashboard Layout</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setEditMode(!editMode)}
                className={`
                  flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${editMode 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
                aria-label={editMode ? 'Exit edit mode' : 'Enter edit mode'}
              >
                {editMode ? <Unlock size={16} /> : <Lock size={16} />}
                <span>{editMode ? 'Exit Edit' : 'Edit Layout'}</span>
              </button>
            </div>
          </div>
          
          <motion.button
            onClick={onWidgetAdd}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Add new widget"
          >
            <Plus size={16} />
            <span>Add Widget</span>
          </motion.button>
        </motion.div>
      )}

      {/* Grid Layout */}
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={60}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        onResizeStart={handleResizeStart}
        onResizeStop={handleResizeStop}
        isDraggable={editMode}
        isResizable={editMode}
        useCSSTransforms={true}
        preventCollision={false}
        compactType="vertical"
        draggableHandle=".widget-drag-handle"
      >
        <AnimatePresence mode="popLayout">
          {widgets.map((widget) => (
            <div key={widget.id} className="widget-container">
              {renderWidget(widget)}
            </div>
          ))}
        </AnimatePresence>
      </ResponsiveGridLayout>

      {/* Empty state */}
      {widgets.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center h-64 text-center"
        >
          <div className="text-gray-400 mb-4">
            <Settings size={48} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No widgets yet</h3>
          <p className="text-gray-600 mb-4">Add your first widget to get started</p>
          {isEditable && (
            <motion.button
              onClick={onWidgetAdd}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus size={16} />
              <span>Add Widget</span>
            </motion.button>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default WidgetGrid;