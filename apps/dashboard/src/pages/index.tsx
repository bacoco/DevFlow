import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Dashboard } from '../components/Dashboard/Dashboard';
import { OnboardingWizard } from '../components/Onboarding/OnboardingWizard';
import { WebSocketProvider } from '../contexts/WebSocketContext';
import { AuthProvider } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/Auth/ProtectedRoute';
import { Dashboard as DashboardType, Widget } from '../types/dashboard';
import { OnboardingData } from '../types/onboarding';
import '../styles/dashboard.css';

// Mock data for demonstration
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
        metrics: [],
        chartData: { labels: [], datasets: [] },
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
      position: { x: 0, y: 0, w: 4, h: 3 },
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
        metrics: [],
        chartData: { labels: [], datasets: [] },
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
      position: { x: 4, y: 0, w: 4, h: 3 },
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
      position: { x: 8, y: 0, w: 4, h: 4 },
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
        metrics: [],
        chartData: { labels: [], datasets: [] },
        summary: {
          current: 0,
          previous: 0,
          change: 0,
          changePercent: 0,
          trend: 'stable',
        },
        lastUpdated: new Date(),
      },
      permissions: [],
      position: { x: 0, y: 3, w: 8, h: 4 },
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
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);

  // Check if user needs onboarding (in real app, this would check user preferences)
  useEffect(() => {
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
    console.log('Add widget clicked');
    // In a real app, this would open a widget selection modal
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
        autoConnect={true}
        onConnectionChange={setIsWebSocketConnected}
      >
        <main className="min-h-screen bg-gray-50">
          {/* Connection Status Banner */}
          {!isWebSocketConnected && (
            <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
              <div className="container mx-auto">
                <p className="text-sm text-yellow-800">
                  ⚠️ Real-time updates are currently unavailable. Dashboard will show cached data.
                </p>
              </div>
            </div>
          )}
          
          <div className="container mx-auto px-4 py-8">
            <Dashboard
              dashboard={currentDashboard}
              onDashboardUpdate={handleDashboardUpdate}
              onWidgetAdd={handleWidgetAdd}
            />
          </div>
        </main>

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