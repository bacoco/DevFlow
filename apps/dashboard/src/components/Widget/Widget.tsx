import React, { useRef } from 'react';
import { Widget as WidgetType } from '../../types/dashboard';
import { MoreHorizontal, RefreshCw, Move } from 'lucide-react';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';

interface WidgetProps {
  widget: WidgetType;
  onRefresh?: () => void;
  onConfigure?: () => void;
  onRemove?: () => void;
  children: React.ReactNode;
  loading?: boolean;
  error?: string;
  isEditable?: boolean;
}

export const Widget: React.FC<WidgetProps> = ({
  widget,
  onRefresh,
  onConfigure,
  onRemove,
  children,
  loading = false,
  error,
  isEditable = false
}) => {
  const [showMenu, setShowMenu] = React.useState(false);
  const { settings, announceToScreenReader } = useAccessibility();
  const widgetRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useKeyboardNavigation(menuRef, {
    enableTabTrapping: showMenu,
    enableEscapeKey: true,
    onEscape: () => setShowMenu(false),
  });

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
      announceToScreenReader(`${widget.title} widget refreshed`);
    }
  };

  const handleConfigure = () => {
    if (onConfigure) {
      onConfigure();
      setShowMenu(false);
      announceToScreenReader(`Opening configuration for ${widget.title} widget`);
    }
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
      setShowMenu(false);
      announceToScreenReader(`${widget.title} widget removed`);
    }
  };

  return (
    <div 
      ref={widgetRef}
      className={`bg-white rounded-lg shadow-md border border-gray-200 h-full flex flex-col ${
        isEditable ? 'hover:shadow-lg transition-shadow cursor-move' : ''
      }`}
      role="region"
      aria-label={`${widget.title} widget`}
      aria-describedby={`widget-${widget.id}-description`}
      tabIndex={0}
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 truncate">
          {widget.title}
        </h3>
        
        <div className="flex items-center space-x-2">
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              aria-label={`Refresh ${widget.title} widget data`}
              aria-describedby={loading ? `widget-${widget.id}-loading` : undefined}
            >
              <RefreshCw 
                size={16} 
                className={loading ? 'animate-spin' : ''} 
                aria-hidden="true"
              />
              {loading && (
                <span id={`widget-${widget.id}-loading`} className="sr-only">
                  Loading widget data
                </span>
              )}
            </button>
          )}
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              aria-label={`${widget.title} widget options`}
              aria-expanded={showMenu}
              aria-haspopup="menu"
            >
              <MoreHorizontal size={16} aria-hidden="true" />
            </button>
            
            {showMenu && (
              <div 
                ref={menuRef}
                className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-32"
                role="menu"
                aria-label={`${widget.title} widget menu`}
              >
                {onConfigure && (
                  <button
                    onClick={handleConfigure}
                    className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                    role="menuitem"
                    tabIndex={0}
                  >
                    Configure
                  </button>
                )}
                {onRemove && (
                  <button
                    onClick={handleRemove}
                    className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 focus:outline-none focus:bg-red-50"
                    role="menuitem"
                    tabIndex={0}
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Widget Content */}
      <div 
        className="flex-1 p-4 overflow-hidden"
        id={`widget-${widget.id}-content`}
        role="main"
        aria-live="polite"
        aria-busy={loading}
      >
        {error ? (
          <div 
            className="flex items-center justify-center h-full"
            role="alert"
            aria-describedby={`widget-${widget.id}-error`}
          >
            <div className="text-center">
              <div className="text-red-500 mb-2" aria-hidden="true">⚠️</div>
              <p id={`widget-${widget.id}-error`} className="text-sm text-red-600">
                Error loading {widget.title}: {error}
              </p>
            </div>
          </div>
        ) : loading ? (
          <div 
            className="flex items-center justify-center h-full"
            aria-label={`Loading ${widget.title} data`}
          >
            <div 
              className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
              aria-hidden="true"
            />
            <span className="sr-only">Loading {widget.title} data</span>
          </div>
        ) : (
          <div aria-describedby={`widget-${widget.id}-description`}>
            {children}
          </div>
        )}
      </div>

      {/* Hidden description for screen readers */}
      <div id={`widget-${widget.id}-description`} className="sr-only">
        {widget.title} widget displaying {widget.config.metrics.join(', ')} metrics 
        for the {widget.config.timeRange} time period.
        {widget.data?.summary && (
          ` Current value: ${widget.data.summary.current}, 
            Previous value: ${widget.data.summary.previous}, 
            Change: ${widget.data.summary.change} (${widget.data.summary.changePercent}%)`
        )}
      </div>

      {/* Widget Footer */}
      {widget.data?.lastUpdated && (
        <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-500">
          Last updated: {new Date(widget.data.lastUpdated).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default Widget;