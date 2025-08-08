import React from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { Widget as WidgetType, WidgetData } from '../../types/dashboard';
import { Widget } from '../Widget/Widget';
import { MetricCard } from '../Widget/MetricCard';
import { RealTimeWidget } from '../Widget/RealTimeWidget';
import { LineChart } from '../Charts/LineChart';
import { BarChart } from '../Charts/BarChart';
import { GripVertical } from 'lucide-react';
// CSS imports moved to _app.tsx to avoid global CSS import issues

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardGridProps {
  widgets: WidgetType[];
  layouts: { [key: string]: Layout[] };
  onLayoutChange: (layout: Layout[], layouts: { [key: string]: Layout[] }) => void;
  onWidgetRefresh?: (widgetId: string) => void;
  onWidgetConfigure?: (widgetId: string) => void;
  onWidgetRemove?: (widgetId: string) => void;
  onWidgetDataUpdate?: (widgetId: string, data: WidgetData) => void;
  isEditable?: boolean;
  className?: string;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  widgets,
  layouts,
  onLayoutChange,
  onWidgetRefresh,
  onWidgetConfigure,
  onWidgetRemove,
  onWidgetDataUpdate,
  isEditable = false,
  className = ''
}) => {
  const renderWidget = (widget: WidgetType) => {
    const commonProps = {
      widget,
      onRefresh: onWidgetRefresh ? () => onWidgetRefresh(widget.id) : undefined,
      onConfigure: onWidgetConfigure ? () => onWidgetConfigure(widget.id) : undefined,
      onRemove: onWidgetRemove ? () => onWidgetRemove(widget.id) : undefined,
      isEditable,
    };

    // Wrap widgets that can benefit from real-time updates
    const shouldUseRealTime = ['metric_card', 'line_chart', 'bar_chart', 'flow_state'].includes(widget.type);

    if (shouldUseRealTime && onWidgetDataUpdate) {
      return (
        <RealTimeWidget
          widget={widget}
          onDataUpdate={onWidgetDataUpdate}
          className="h-full"
        >
          {({ widget: updatedWidget, isLive, isLoading, error, lastUpdate }) => (
            <div className="h-full relative">
              {renderStaticWidget(updatedWidget, commonProps)}
              
              {/* Real-time status indicators */}
              {isLive && (
                <div className="absolute top-2 left-2 flex items-center space-x-1 z-10">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 font-medium bg-white px-1 rounded">
                    LIVE
                  </span>
                </div>
              )}
              
              {error && (
                <div className="absolute top-2 left-2 flex items-center space-x-1 z-10">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-xs text-red-600 font-medium bg-white px-1 rounded" title={error.message}>
                    ERROR
                  </span>
                </div>
              )}
              
              {isLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-20">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              )}
              
              {lastUpdate && (
                <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white px-1 rounded">
                  Updated: {lastUpdate.toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
        </RealTimeWidget>
      );
    }

    return renderStaticWidget(widget, commonProps);
  };

  const renderStaticWidget = (widget: WidgetType, commonProps: any) => {
    switch (widget.type) {
      case 'metric_card':
        return <MetricCard {...commonProps} />;
      
      case 'line_chart':
        return (
          <Widget {...commonProps}>
            <div className="h-full flex items-center justify-center">
              {widget.data?.chartData ? (
                <LineChart 
                  data={widget.data.chartData}
                  width={300}
                  height={200}
                />
              ) : (
                <div className="text-gray-500">No data available</div>
              )}
            </div>
          </Widget>
        );
      
      case 'bar_chart':
        return (
          <Widget {...commonProps}>
            <div className="h-full flex items-center justify-center">
              {widget.data?.chartData ? (
                <BarChart 
                  data={widget.data.chartData}
                  width={300}
                  height={200}
                />
              ) : (
                <div className="text-gray-500">No data available</div>
              )}
            </div>
          </Widget>
        );
      
      case 'activity_feed':
        return (
          <Widget {...commonProps}>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="text-sm">
                  <span className="font-medium">John Doe</span> committed to main branch
                </div>
                <div className="text-xs text-gray-500">2m ago</div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="text-sm">
                  <span className="font-medium">Jane Smith</span> opened a pull request
                </div>
                <div className="text-xs text-gray-500">5m ago</div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <div className="text-sm">
                  <span className="font-medium">Build #123</span> completed successfully
                </div>
                <div className="text-xs text-gray-500">10m ago</div>
              </div>
            </div>
          </Widget>
        );
      
      case 'flow_state':
        return (
          <Widget {...commonProps}>
            <div className="h-full flex flex-col justify-center items-center space-y-4">
              <div className="text-4xl">🧘</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {widget.data?.summary?.current || 0}%
                </div>
                <div className="text-sm text-gray-600">Flow State</div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${widget.data?.summary?.current || 0}%` }}
                ></div>
              </div>
            </div>
          </Widget>
        );
      
      default:
        return (
          <Widget {...commonProps}>
            <div className="flex items-center justify-center h-full text-gray-500">
              Widget type "{widget.type}" not implemented
            </div>
          </Widget>
        );
    }
  };

  const breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
  const cols = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };

  // Debug logging
  console.log('DashboardGrid render:', {
    widgetCount: widgets.length,
    layouts: layouts,
    breakpoints,
    cols
  });

  return (
    <div className={`dashboard-grid ${className}`}>
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={breakpoints}
        cols={cols}
        rowHeight={60}
        margin={[16, 16]}
        containerPadding={[16, 16]}
        onLayoutChange={onLayoutChange}
        isDraggable={isEditable}
        isResizable={isEditable}
        compactType="vertical"
        preventCollision={false}
        useCSSTransforms={true}
        draggableHandle=".drag-handle"
        autoSize={true}
        verticalCompact={true}
      >
        {widgets.map((widget) => (
          <div key={widget.id} className="widget-container relative">
            {isEditable && (
              <div className="drag-handle absolute top-2 right-2 z-10 p-1 bg-gray-100 rounded cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical size={16} className="text-gray-600" />
              </div>
            )}
            <div className={isEditable ? 'group' : ''}>
              {renderWidget(widget)}
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
};

export default DashboardGrid;