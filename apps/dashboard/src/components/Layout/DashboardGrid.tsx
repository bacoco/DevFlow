import React from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { Widget as WidgetType } from '../../types/dashboard';
import { Widget } from '../Widget/Widget';
import { MetricCard } from '../Widget/MetricCard';
import { LineChart } from '../Charts/LineChart';
import { BarChart } from '../Charts/BarChart';
import { GripVertical } from 'lucide-react';
import 'react-grid-layout/css/styles.css';
import 'react-grid-layout/css/resizable.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardGridProps {
  widgets: WidgetType[];
  layouts: { [key: string]: Layout[] };
  onLayoutChange: (layout: Layout[], layouts: { [key: string]: Layout[] }) => void;
  onWidgetRefresh?: (widgetId: string) => void;
  onWidgetConfigure?: (widgetId: string) => void;
  onWidgetRemove?: (widgetId: string) => void;
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

  return (
    <div className={`dashboard-grid ${className}`}>
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={breakpoints}
        cols={cols}
        rowHeight={60}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        onLayoutChange={onLayoutChange}
        isDraggable={isEditable}
        isResizable={isEditable}
        compactType="vertical"
        preventCollision={false}
        useCSSTransforms={true}
        draggableHandle=".drag-handle"
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