import React, { useState, useEffect } from 'react';
import { Layout } from 'react-grid-layout';
import { DashboardGrid } from '../Layout/DashboardGrid';
import { Widget, Dashboard as DashboardType, WidgetConfig } from '../../types/dashboard';
import { WidgetSelector } from '../Widget/WidgetSelector';
import { WidgetConfigModal } from '../Widget/WidgetConfigModal';
import { DashboardPreferences } from './DashboardPreferences';
import { Settings, Plus, Save, Download, Upload, Sliders } from 'lucide-react';
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
  const [isEditing, setIsEditing] = useState(false);
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({});
  const [widgets, setWidgets] = useState<Widget[]>(dashboard.widgets);
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);
  const [configWidget, setConfigWidget] = useState<Widget | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
          <p className="text-sm text-gray-600">
            Last updated: {new Date(dashboard.updatedAt).toLocaleString()}
          </p>
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

      {/* Dashboard Grid */}
      <DashboardGrid
        widgets={widgets}
        layouts={layouts}
        onLayoutChange={handleLayoutChange}
        onWidgetRefresh={handleWidgetRefresh}
        onWidgetConfigure={handleWidgetConfigure}
        onWidgetRemove={handleWidgetRemove}
        isEditable={isEditing}
        className="min-h-screen"
      />

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