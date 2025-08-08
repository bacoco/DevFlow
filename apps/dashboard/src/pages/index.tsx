import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { Dashboard } from '../components/Dashboard/Dashboard';
import { WidgetSelector } from '../components/Widget/WidgetSelector';

const ResponsiveGridLayout = WidthProvider(Responsive);
import { OnboardingWizard } from '../components/Onboarding/OnboardingWizard';
import { WebSocketProvider } from '../contexts/WebSocketContext';
import { AuthProvider } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/Auth/ProtectedRoute';
import { Dashboard as DashboardType, Widget } from '../types/dashboard';
import { OnboardingData } from '../types/onboarding';


// Mock data for demonstration - Enhanced with working data
const mockDashboard: DashboardType = {
  id: 'dashboard-1',
  userId: 'user-1',
  name: 'DevFlow Intelligence Dashboard',
  widgets: [
    {
      id: 'widget-1',
      type: 'metric_card',
      title: 'Productivity Score',
      config: {
        timeRange: 'day',
        metrics: ['productivity_score'],
        filters: {},
        chartOptions: { responsive: true, maintainAspectRatio: false },
      },
      data: {
        metrics: [
          { name: 'productivity_score', value: 85, timestamp: new Date() }
        ],
        chartData: { 
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], 
          datasets: [
            {
              label: 'Productivity',
              data: [75, 82, 78, 85, 90],
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
            }
          ]
        },
        summary: {
          current: 85,
          previous: 80,
          change: 5,
          changePercent: 6.25,
          trend: 'up',
        },
        lastUpdated: new Date(),
      },
      permissions: [],
      position: { x: 0, y: 0, w: 3, h: 3 },
    },
    {
      id: 'widget-2',
      type: 'metric_card',
      title: 'Time in Flow',
      config: {
        timeRange: 'day',
        metrics: ['time_in_flow'],
        filters: {},
        chartOptions: { responsive: true, maintainAspectRatio: false },
      },
      data: {
        metrics: [
          { name: 'time_in_flow', value: 6.5, timestamp: new Date() }
        ],
        chartData: { 
          labels: ['9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM'], 
          datasets: [
            {
              label: 'Flow Hours',
              data: [0.5, 1.2, 1.8, 0.3, 1.5, 2.1, 1.8],
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
            }
          ]
        },
        summary: {
          current: 6.5,
          previous: 5.8,
          change: 0.7,
          changePercent: 12.07,
          trend: 'up',
        },
        lastUpdated: new Date(),
      },
      permissions: [],
      position: { x: 3, y: 0, w: 3, h: 3 },
    },
    {
      id: 'widget-3',
      type: 'line_chart',
      title: 'Weekly Productivity Trend',
      config: {
        timeRange: 'week',
        metrics: ['productivity_score'],
        filters: {},
        chartOptions: { responsive: true, maintainAspectRatio: false },
      },
      data: {
        metrics: [],
        chartData: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          datasets: [
            {
              label: 'Productivity Score',
              data: [75, 82, 78, 85, 90],
              borderColor: '#3b82f6',
              borderWidth: 2,
            },
          ],
        },
        summary: {
          current: 85,
          previous: 80,
          change: 5,
          changePercent: 6.25,
          trend: 'up',
        },
        lastUpdated: new Date(),
      },
      permissions: [],
      position: { x: 6, y: 0, w: 6, h: 4 },
    },
    {
      id: 'widget-4',
      type: 'activity_feed',
      title: 'Recent Activity',
      config: {
        timeRange: 'day',
        metrics: [],
        filters: {},
        chartOptions: { responsive: true, maintainAspectRatio: false },
      },
      data: {
        metrics: [
          { name: 'activity_count', value: 12, timestamp: new Date() }
        ],
        chartData: { 
          labels: ['Activities'], 
          datasets: [
            {
              label: 'Recent Activity',
              data: [12],
              backgroundColor: '#8b5cf6',
            }
          ]
        },
        summary: {
          current: 12,
          previous: 8,
          change: 4,
          changePercent: 50,
          trend: 'up',
        },
        lastUpdated: new Date(),
        activities: [
          {
            id: '1',
            type: 'commit',
            message: 'Fixed authentication bug',
            timestamp: new Date(Date.now() - 5 * 60 * 1000),
            user: 'Loic'
          },
          {
            id: '2',
            type: 'task',
            message: 'Completed dashboard widget implementation',
            timestamp: new Date(Date.now() - 15 * 60 * 1000),
            user: 'Loic'
          },
          {
            id: '3',
            type: 'review',
            message: 'Code review completed for PR #123',
            timestamp: new Date(Date.now() - 30 * 60 * 1000),
            user: 'Loic'
          },
          {
            id: '4',
            type: 'meeting',
            message: 'Sprint planning meeting',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            user: 'Team'
          }
        ]
      },
      permissions: [],
      position: { x: 0, y: 3, w: 12, h: 4 },
    },
    {
      id: 'widget-5',
      type: 'metric_card',
      title: 'Code Quality Score',
      config: {
        timeRange: 'day',
        metrics: ['code_quality'],
        filters: {},
        chartOptions: { responsive: true, maintainAspectRatio: false },
      },
      data: {
        metrics: [
          { name: 'code_quality', value: 92, timestamp: new Date() }
        ],
        chartData: { 
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], 
          datasets: [
            {
              label: 'Quality Score',
              data: [88, 90, 89, 92, 94],
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
            }
          ]
        },
        summary: {
          current: 92,
          previous: 89,
          change: 3,
          changePercent: 3.37,
          trend: 'up',
        },
        lastUpdated: new Date(),
      },
      permissions: [],
      position: { x: 0, y: 7, w: 4, h: 3 },
    },
    {
      id: 'widget-6',
      type: 'metric_card',
      title: 'Team Velocity',
      config: {
        timeRange: 'week',
        metrics: ['velocity'],
        filters: {},
        chartOptions: { responsive: true, maintainAspectRatio: false },
      },
      data: {
        metrics: [
          { name: 'velocity', value: 42, timestamp: new Date() }
        ],
        chartData: { 
          labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], 
          datasets: [
            {
              label: 'Story Points',
              data: [38, 41, 39, 42],
              borderColor: '#8b5cf6',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
            }
          ]
        },
        summary: {
          current: 42,
          previous: 39,
          change: 3,
          changePercent: 7.69,
          trend: 'up',
        },
        lastUpdated: new Date(),
      },
      permissions: [],
      position: { x: 4, y: 7, w: 4, h: 3 },
    },
    {
      id: 'widget-7',
      type: 'flow_state',
      title: 'Flow State',
      config: {
        timeRange: 'day',
        metrics: ['flow_state'],
        filters: {},
        chartOptions: { responsive: true, maintainAspectRatio: false },
      },
      data: {
        metrics: [
          { name: 'flow_state', value: 78, timestamp: new Date() }
        ],
        chartData: { 
          labels: ['Flow'], 
          datasets: [
            {
              label: 'Flow State',
              data: [78],
              backgroundColor: '#06b6d4',
            }
          ]
        },
        summary: {
          current: 78,
          previous: 72,
          change: 6,
          changePercent: 8.33,
          trend: 'up',
        },
        lastUpdated: new Date(),
      },
      permissions: [],
      position: { x: 8, y: 7, w: 4, h: 3 },
    },
  ],
  layout: {
    columns: 12,
    rowHeight: 60,
    margin: [16, 16],
    containerPadding: [16, 16],
  },
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Function to customize dashboard based on onboarding data
function customizeDashboardFromOnboarding(baseDashboard: DashboardType, onboardingData: OnboardingData): DashboardType {
  const { user, dashboard: dashboardPrefs } = onboardingData;
  
  // Filter widgets based on user preferences
  const preferredWidgetTypes = dashboardPrefs.preferredWidgets;
  const filteredWidgets = baseDashboard.widgets.filter(widget => 
    preferredWidgetTypes.includes(widget.type)
  );

  // Add role-specific widgets if not already present
  const roleSpecificWidgets = getRoleSpecificWidgets(user.role);
  roleSpecificWidgets.forEach(newWidget => {
    if (!filteredWidgets.find(w => w.type === newWidget.type)) {
      filteredWidgets.push(newWidget);
    }
  });

  // Adjust layout based on preferences
  const layoutColumns = dashboardPrefs.layout === 'compact' ? 16 : 12;
  const rowHeight = dashboardPrefs.layout === 'compact' ? 40 : 60;

  return {
    ...baseDashboard,
    name: `${user.role.replace('_', ' ')} Dashboard`,
    widgets: filteredWidgets,
    layout: {
      ...baseDashboard.layout,
      columns: layoutColumns,
      rowHeight,
    },
    updatedAt: new Date(),
  };
}

// Helper function to get role-specific widgets
function getRoleSpecificWidgets(role: string): Widget[] {
  const baseWidget = {
    config: {
      timeRange: 'day' as const,
      metrics: [] as any[],
      filters: {},
      chartOptions: { responsive: true, maintainAspectRatio: false },
    },
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
    permissions: [],
  };

  switch (role) {
    case 'team_lead':
      return [
        {
          ...baseWidget,
          id: 'team-velocity',
          type: 'bar_chart',
          title: 'Team Velocity',
          position: { x: 0, y: 4, w: 6, h: 4 },
        },
        {
          ...baseWidget,
          id: 'review-queue',
          type: 'team_overview',
          title: 'Review Queue',
          position: { x: 6, y: 4, w: 6, h: 4 },
        },
      ];
    case 'manager':
      return [
        {
          ...baseWidget,
          id: 'delivery-forecast',
          type: 'line_chart',
          title: 'Delivery Forecast',
          position: { x: 0, y: 4, w: 8, h: 4 },
        },
        {
          ...baseWidget,
          id: 'resource-utilization',
          type: 'pie_chart',
          title: 'Resource Utilization',
          position: { x: 8, y: 4, w: 4, h: 4 },
        },
      ];
    default:
      return [];
  }
}

const DashboardContent: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentDashboard, setCurrentDashboard] = useState<DashboardType>(mockDashboard);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(true);
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);
  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>({
    lg: [
      { i: 'widget-1', x: 0, y: 0, w: 3, h: 3 },
      { i: 'widget-2', x: 3, y: 0, w: 3, h: 3 },
      { i: 'widget-3', x: 6, y: 0, w: 6, h: 4 },
      { i: 'widget-4', x: 0, y: 3, w: 12, h: 4 },
      { i: 'widget-5', x: 0, y: 7, w: 4, h: 3 },
      { i: 'widget-6', x: 4, y: 7, w: 4, h: 3 },
      { i: 'widget-7', x: 8, y: 7, w: 4, h: 3 },
    ]
  });

  // Check if user needs onboarding (in real app, this would check user preferences)
  useEffect(() => {
    // Skip onboarding in development mode for easier testing
    if (process.env.NODE_ENV === 'development') {
      localStorage.setItem('devflow_onboarding_completed', 'true');
      setShowOnboarding(false);
      return;
    }
    
    const hasCompletedOnboarding = localStorage.getItem('devflow_onboarding_completed');
    if (!hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = async (data: OnboardingData) => {
    console.log('Onboarding completed with data:', data);
    
    // In a real app, this would save to backend and customize dashboard
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Customize dashboard based on onboarding data
      const customizedDashboard = customizeDashboardFromOnboarding(mockDashboard, data);
      setCurrentDashboard(customizedDashboard);
      
      // Mark onboarding as completed
      localStorage.setItem('devflow_onboarding_completed', 'true');
      localStorage.setItem('devflow_onboarding_data', JSON.stringify(data));
      
      setShowOnboarding(false);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
  };

  const handleOnboardingSkip = () => {
    localStorage.setItem('devflow_onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  const handleDashboardUpdate = (dashboard: DashboardType) => {
    console.log('Dashboard updated:', dashboard);
    setCurrentDashboard(dashboard);
    // In a real app, this would save to backend
  };

  const handleWidgetAdd = () => {
    setShowWidgetSelector(true);
  };

  const handleAddWidget = (widgetData: Omit<Widget, 'id' | 'data'>) => {
    console.log('Adding widget:', widgetData);
    
    // Create a new widget with unique ID and mock data
    const newWidgetId = `widget-${Date.now()}`;
    const newWidget: Widget = {
      ...widgetData,
      id: newWidgetId,
      data: {
        metrics: [
          { name: 'sample_metric', value: Math.floor(Math.random() * 100), timestamp: new Date() }
        ],
        chartData: { 
          labels: ['Sample Data'], 
          datasets: [
            {
              label: widgetData.title,
              data: [Math.floor(Math.random() * 100)],
              borderColor: '#06b6d4',
              backgroundColor: 'rgba(6, 182, 212, 0.1)',
            }
          ]
        },
        summary: {
          current: Math.floor(Math.random() * 100),
          previous: Math.floor(Math.random() * 100),
          change: Math.floor(Math.random() * 20) - 10,
          changePercent: Math.floor(Math.random() * 20) - 10,
          trend: Math.random() > 0.5 ? 'up' : 'down',
        },
        lastUpdated: new Date(),
      },
    };

    // Add the new widget to the dashboard
    const updatedDashboard = {
      ...currentDashboard,
      widgets: [...currentDashboard.widgets, newWidget],
      updatedAt: new Date(),
    };

    // Add the new widget to the layout
    const newLayout = {
      i: newWidgetId,
      x: widgetData.position.x,
      y: widgetData.position.y,
      w: widgetData.position.w,
      h: widgetData.position.h,
    };

    setLayouts(prevLayouts => ({
      ...prevLayouts,
      lg: [...prevLayouts.lg, newLayout]
    }));

    setCurrentDashboard(updatedDashboard);
    setShowWidgetSelector(false);
  };

  return (
    <>
      <Head>
        <title>DevFlow Intelligence Dashboard</title>
        <meta name="description" content="AI-powered developer productivity dashboard" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <WebSocketProvider 
        autoConnect={false}
        onConnectionChange={setIsWebSocketConnected}
      >
        <main className="min-h-screen bg-gray-50">
          {/* Success Banner */}
          <div className="bg-green-50 border-b border-green-200 px-4 py-2">
            <div className="container mx-auto">
              <p className="text-sm text-green-800">
                ✅ Dashboard loaded successfully with demo data
              </p>
            </div>
          </div>
          
          <div className="container mx-auto px-4 py-8">
            {/* Debug info */}
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                🔧 Debug: Dashboard has {currentDashboard.widgets.length} widgets. 
                Layout columns: {currentDashboard.layout.columns}
              </p>
            </div>
            
            {/* Navigation Menu */}
            <div className="mb-6">
              <nav className="flex space-x-4 mb-4">
                <a href="/overview" className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">
                  📖 App Overview
                </a>
                <a href="/" className="bg-blue-600 text-white px-4 py-2 rounded-md">
                  Dashboard
                </a>
                <a href="/tasks" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
                  Task Manager
                </a>
                <a href="/code-archaeology" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
                  Code Archaeology
                </a>
                <a href="/analytics" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
                  Analytics
                </a>
                <a href="/documentation-demo" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">
                  Documentation
                </a>
              </nav>
            </div>

            {/* Direct Grid Implementation - Same as working grid-test */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                DevFlow Intelligence Dashboard
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>✅ Connected</span>
                <span>Last updated: {new Date().toLocaleString()}</span>
                <button 
                  onClick={handleWidgetAdd}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add Widget
                </button>
              </div>
            </div>

            <ResponsiveGridLayout
              className="layout"
              layouts={layouts}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={60}
              margin={[16, 16]}
              containerPadding={[16, 16]}
              onLayoutChange={(layout, newLayouts) => {
                console.log('Layout changed:', layout);
                setLayouts(newLayouts);
              }}
              isDraggable={true}
              isResizable={true}
              compactType="vertical"
              preventCollision={false}
              useCSSTransforms={true}
              autoSize={true}
              verticalCompact={true}
            >
              {currentDashboard.widgets.map((widget, index) => (
                <div key={widget.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                  <div className={`h-full p-4 flex flex-col justify-center items-center text-white ${
                    index === 0 ? 'bg-blue-500' : 
                    index === 1 ? 'bg-green-500' : 
                    index === 2 ? 'bg-purple-500' : 
                    index === 3 ? 'bg-yellow-500' : 
                    index === 4 ? 'bg-red-500' : 
                    index === 5 ? 'bg-indigo-500' : 'bg-pink-500'
                  }`}>
                    <h3 className="text-lg font-semibold mb-2">{widget.title}</h3>
                    <p className="text-2xl font-bold">
                      {widget.data?.summary?.current || Math.floor(Math.random() * 100)}
                      {widget.title.includes('Score') ? '%' : widget.title.includes('Time') ? 'h' : ''}
                    </p>
                    <p className="text-sm opacity-90 mt-2">ID: {widget.id}</p>
                  </div>
                </div>
              ))}
            </ResponsiveGridLayout>
          </div>
        </main>

        {/* Widget Selector Modal */}
        <WidgetSelector
          isOpen={showWidgetSelector}
          onClose={() => setShowWidgetSelector(false)}
          onAddWidget={handleAddWidget}
        />

        {/* Onboarding Wizard */}
        <OnboardingWizard
          isOpen={showOnboarding}
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      </WebSocketProvider>
    </>
  );
};

export default function Home() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <DashboardContent />
      </ProtectedRoute>
    </AuthProvider>
  );
}