import React, { useState, useEffect } from 'react';
import { Layout, Responsive, WidthProvider } from 'react-grid-layout';
import { DashboardGrid } from '../Layout/DashboardGrid';

const ResponsiveGridLayout = WidthProvider(Responsive);
import { Widget, Dashboard as DashboardType, WidgetConfig, WidgetData } from '../../types/dashboard';
import { WidgetSelector } from '../Widget/WidgetSelector';
import { WidgetConfigModal } from '../Widget/WidgetConfigModal';
import { DashboardPreferences } from './DashboardPreferences';
import { WebSocketStatus } from '../../contexts/WebSocketContext';
import { useWebSocketContext } from '../../contexts/WebSocketContext';
import { Settings, Plus, Save, Download, Upload, Sliders, Wifi, WifiOff } from 'lucide-react';
import { dashboardService } from '../../services/dashboardService';

interface DashboardProps {
  dashboard: DashboardType;
  onDashboardUpdate?: (dashboard: DashboardType) => void;
  onWidgetAdd?: () => void;
  className?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  dashboard,
  onDashboardUpdate,
  onWidgetAdd,
  className = ''
}) => {
  const { isConnected, connectionState } = useWebSocketContext();
  const [isEditing, setIsEditing] = useState(false);
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({});
  const [widgets, setWidgets] = useState<Widget[]>(dashboard.widgets);
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);
  const [configWidget, setConfigWidget] = useState<Widget | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [liveUpdateCount, setLiveUpdateCount] = useState(0);

  useEffect(() => {
    setWidgets(dashboard.widgets);
    
    // Convert widget positions to react-grid-layout format
    const gridLayouts: { [key: string]: Layout[] } = {
      lg: dashboard.widgets.map(widget => ({
        i: widget.id,
        x: widget.position.x,
        y: widget.position.y,
        w: widget.position.w,
        h: widget.position.h,
      }))
    };
    
    setLayouts(gridLayouts);
  }, [dashboard]);

  const handleLayoutChange = (layout: Layout[], layouts: { [key: string]: Layout[] }) => {
    setLayouts(layouts);
    
    if (onDashboardUpdate) {
      // Update widget positions
      const updatedWidgets = widgets.map(widget => {
        const layoutItem = layout.find(item => item.i === widget.id);
        if (layoutItem) {
          return {
            ...widget,
            position: {
              x: layoutItem.x,
              y: layoutItem.y,
              w: layoutItem.w,
              h: layoutItem.h,
            }
          };
        }
        return widget;
      });

      const updatedDashboard = {
        ...dashboard,
        widgets: updatedWidgets,
        updatedAt: new Date(),
      };

      onDashboardUpdate(updatedDashboard);
    }
  };

  const handleWidgetRefresh = (widgetId: string) => {
    // Simulate data refresh
    console.log(`Refreshing widget: ${widgetId}`);
    // In a real app, this would trigger a data fetch
  };

  const handleWidgetDataUpdate = (widgetId: string, data: WidgetData) => {
    setWidgets(prevWidgets => 
      prevWidgets.map(widget => 
        widget.id === widgetId 
          ? { ...widget, data }
          : widget
      )
    );
    
    setLiveUpdateCount(prev => prev + 1);

    // Optionally persist the updated data
    if (onDashboardUpdate) {
      const updatedDashboard = {
        ...dashboard,
        widgets: widgets.map(widget => 
          widget.id === widgetId 
            ? { ...widget, data }
            : widget
        ),
        updatedAt: new Date(),
      };
      onDashboardUpdate(updatedDashboard);
    }
  };

  const handleWidgetConfigure = (widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (widget) {
      setConfigWidget(widget);
    }
  };

  const handleWidgetRemove = (widgetId: string) => {
    const updatedWidgets = widgets.filter(widget => widget.id !== widgetId);
    setWidgets(updatedWidgets);
    
    if (onDashboardUpdate) {
      const updatedDashboard = {
        ...dashboard,
        widgets: updatedWidgets,
        updatedAt: new Date(),
      };
      onDashboardUpdate(updatedDashboard);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (onDashboardUpdate) {
        const updatedDashboard = {
          ...dashboard,
          widgets,
          updatedAt: new Date(),
        };
        await onDashboardUpdate(updatedDashboard);
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddWidget = async (widgetData: Omit<Widget, 'id' | 'data'>) => {
    const newWidget: Widget = {
      ...widgetData,
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data: {
        metrics: [],
        chartData: { labels: [], datasets: [] },
        summary: {
          current: 0,
          previous: 0,
          change: 0,
          changePercent: 0,
          trend: 'stable' as const,
        },
        lastUpdated: new Date(),
      },
    };

    const updatedWidgets = [...widgets, newWidget];
    setWidgets(updatedWidgets);

    if (onDashboardUpdate) {
      const updatedDashboard = {
        ...dashboard,
        widgets: updatedWidgets,
        updatedAt: new Date(),
      };
      await onDashboardUpdate(updatedDashboard);
    }
  };

  const handleWidgetConfigSave = async (widgetId: string, config: WidgetConfig) => {
    try {
      await dashboardService.updateWidgetConfig(dashboard.id, widgetId, config);
      
      const updatedWidgets = widgets.map(widget =>
        widget.id === widgetId
          ? { ...widget, config, title: config.title || widget.title }
          : widget
      );
      
      setWidgets(updatedWidgets);
      setConfigWidget(null);

      if (onDashboardUpdate) {
        const updatedDashboard = {
          ...dashboard,
          widgets: updatedWidgets,
          updatedAt: new Date(),
        };
        await onDashboardUpdate(updatedDashboard);
      }
    } catch (error) {
      console.error('Failed to update widget configuration:', error);
      throw error;
    }
  };

  const handleExportDashboard = () => {
    try {
      const exportData = dashboardService.exportDashboard(dashboard);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dashboard.name.replace(/\s+/g, '_')}_dashboard.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export dashboard:', error);
    }
  };

  const handleImportDashboard = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importData = e.target?.result as string;
        const importedDashboard = await dashboardService.importDashboard(dashboard.id, importData);
        
        setWidgets(importedDashboard.widgets);
        
        if (onDashboardUpdate) {
          await onDashboardUpdate(importedDashboard);
        }
      } catch (error) {
        console.error('Failed to import dashboard:', error);
        alert('Failed to import dashboard. Please check the file format.');
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    event.target.value = '';
  };

  return (
    <div className={`dashboard ${className}`}>
      {/* Dashboard Header */}
      <div className="flex items-center justify-between mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{dashboard.name}</h1>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>Last updated: {new Date(dashboard.updatedAt).toLocaleString()}</span>
            {liveUpdateCount > 0 && (
              <span className="text-green-600 font-medium">
                {liveUpdateCount} live updates
              </span>
            )}
          </div>
        </div>
        
        {/* WebSocket Status */}
        <div className="flex items-center space-x-4">
          <WebSocketStatus showDetails={true} />
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowWidgetSelector(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            aria-label="Add new widget"
          >
            <Plus size={16} />
            <span>Add Widget</span>
          </button>

          {/* Export/Import */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportDashboard}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              aria-label="Export dashboard"
            >
              <Download size={16} />
              <span>Export</span>
            </button>
            
            <label className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors cursor-pointer">
              <Upload size={16} />
              <span>Import</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportDashboard}
                className="hidden"
              />
            </label>
          </div>

          <button
            onClick={() => setShowPreferences(true)}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            aria-label="Dashboard preferences"
          >
            <Sliders size={16} />
            <span>Preferences</span>
          </button>
          
          <button
            onClick={isEditing ? handleSave : () => setIsEditing(true)}
            disabled={isLoading}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isEditing 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            aria-label={isEditing ? 'Save changes' : 'Edit dashboard'}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : isEditing ? (
              <>
                <Save size={16} />
                <span>Save</span>
              </>
            ) : (
              <>
                <Settings size={16} />
                <span>Edit</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Edit Mode Notice */}
      {isEditing && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            📝 Edit mode is active. Drag and resize widgets to customize your dashboard.
          </p>
        </div>
      )}

      {/* Simplified Dashboard Grid - Direct Implementation */}
      <div className="dashboard-grid-container">
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={60}
          margin={[16, 16]}
          containerPadding={[16, 16]}
          onLayoutChange={handleLayoutChange}
          isDraggable={isEditing}
          isResizable={isEditing}
          compactType="vertical"
          preventCollision={false}
          useCSSTransforms={true}
          autoSize={true}
          verticalCompact={true}
        >
          {widgets.map((widget) => (
            <div key={widget.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">{widget.title}</h3>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600 font-medium">LIVE</span>
                  </div>
                </div>
              </div>
              <div className="p-4 h-full">
                {widget.type === 'metric_card' && (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {widget.data?.summary?.current || 0}
                      {widget.title.includes('Score') ? '%' : widget.title.includes('Time') ? 'h' : ''}
                    </div>
                    <div className="text-sm text-gray-600">
                      {widget.data?.summary?.trend === 'up' ? '↗️' : widget.data?.summary?.trend === 'down' ? '↘️' : '➡️'} 
                      {widget.data?.summary?.changePercent?.toFixed(1)}% vs previous
                    </div>
                  </div>
                )}
                {widget.type === 'line_chart' && (
                  <div className="text-center">
                    <div className="text-lg font-semibold mb-4">Weekly Trend</div>
                    <div className="h-32 bg-gradient-to-r from-blue-100 to-blue-200 rounded flex items-center justify-center">
                      📈 Chart Visualization
                    </div>
                  </div>
                )}
                {widget.type === 'activity_feed' && (
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
                )}
                {widget.type === 'flow_state' && (
                  <div className="text-center">
                    <div className="text-4xl mb-4">🧘</div>
                    <div className="text-2xl font-bold text-blue-600 mb-2">
                      {widget.data?.summary?.current || 0}%
                    </div>
                    <div className="text-sm text-gray-600">Flow State</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${widget.data?.summary?.current || 0}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>

      {/* Empty State */}
      {widgets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No widgets yet
          </h3>
          <p className="text-gray-600 mb-6 max-w-md">
            Start building your dashboard by adding widgets to track your team's productivity metrics.
          </p>
          <button
            onClick={() => setShowWidgetSelector(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            <span>Add Your First Widget</span>
          </button>
        </div>
      )}

      {/* Widget Selector Modal */}
      <WidgetSelector
        isOpen={showWidgetSelector}
        onClose={() => setShowWidgetSelector(false)}
        onAddWidget={handleAddWidget}
      />

      {/* Widget Configuration Modal */}
      {configWidget && (
        <WidgetConfigModal
          widget={configWidget}
          isOpen={!!configWidget}
          onClose={() => setConfigWidget(null)}
          onSave={handleWidgetConfigSave}
        />
      )}

      {/* Dashboard Preferences Modal */}
      <DashboardPreferences
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        onPreferencesUpdate={(prefs) => {
          // Handle preferences update if needed
          console.log('Preferences updated:', prefs);
        }}
      />
    </div>
  );
};

export default Dashboard;