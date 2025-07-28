import React, { useState, useEffect } from 'react';
import { OnboardingStepProps } from '../../../types/onboarding';
import { WidgetType } from '../../../types/dashboard';
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  Activity, 
  Users, 
  Code, 
  Clock, 
  TrendingUp,
  Layout,
  Monitor,
  Smartphone,
  Palette
} from 'lucide-react';

interface WidgetOption {
  id: WidgetType;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'productivity' | 'quality' | 'collaboration' | 'insights';
  recommended: boolean;
  roleRelevance: Record<string, number>; // 1-5 relevance score
}

export const DashboardSetupStep: React.FC<OnboardingStepProps> = ({
  onNext,
  onComplete,
  stepData,
}) => {
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(
    stepData?.preferredWidgets || []
  );
  const [layout, setLayout] = useState<'compact' | 'spacious'>(
    stepData?.layout || 'spacious'
  );
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>(
    stepData?.theme || 'auto'
  );
  const [autoRefresh, setAutoRefresh] = useState<boolean>(
    stepData?.autoRefresh ?? true
  );

  // Get user role from previous step data
  const userRole = stepData?.role || 'developer';

  const widgetOptions: WidgetOption[] = [
    {
      id: 'metric_card',
      title: 'Productivity Score',
      description: 'Overall productivity metric with trend indicators',
      icon: TrendingUp,
      category: 'productivity',
      recommended: true,
      roleRelevance: { developer: 5, team_lead: 4, manager: 5, admin: 3 },
    },
    {
      id: 'flow_state',
      title: 'Flow State Tracker',
      description: 'Time spent in focused coding sessions',
      icon: Clock,
      category: 'productivity',
      recommended: true,
      roleRelevance: { developer: 5, team_lead: 3, manager: 2, admin: 1 },
    },
    {
      id: 'line_chart',
      title: 'Productivity Trends',
      description: 'Historical productivity patterns and trends',
      icon: LineChart,
      category: 'productivity',
      recommended: true,
      roleRelevance: { developer: 4, team_lead: 5, manager: 5, admin: 3 },
    },
    {
      id: 'code_quality',
      title: 'Code Quality Metrics',
      description: 'Code churn, complexity, and review metrics',
      icon: Code,
      category: 'quality',
      recommended: true,
      roleRelevance: { developer: 4, team_lead: 5, manager: 4, admin: 2 },
    },
    {
      id: 'bar_chart',
      title: 'Team Performance',
      description: 'Comparative team and individual metrics',
      icon: BarChart3,
      category: 'collaboration',
      recommended: false,
      roleRelevance: { developer: 2, team_lead: 5, manager: 5, admin: 4 },
    },
    {
      id: 'team_overview',
      title: 'Team Overview',
      description: 'Team member status and current activities',
      icon: Users,
      category: 'collaboration',
      recommended: false,
      roleRelevance: { developer: 1, team_lead: 5, manager: 4, admin: 3 },
    },
    {
      id: 'activity_feed',
      title: 'Activity Feed',
      description: 'Recent commits, PRs, and team activities',
      icon: Activity,
      category: 'insights',
      recommended: true,
      roleRelevance: { developer: 3, team_lead: 4, manager: 3, admin: 2 },
    },
    {
      id: 'pie_chart',
      title: 'Time Distribution',
      description: 'How time is spent across different activities',
      icon: PieChart,
      category: 'insights',
      recommended: false,
      roleRelevance: { developer: 3, team_lead: 3, manager: 4, admin: 2 },
    },
  ];

  // Sort widgets by role relevance
  const sortedWidgets = [...widgetOptions].sort((a, b) => {
    const aRelevance = a.roleRelevance[userRole] || 0;
    const bRelevance = b.roleRelevance[userRole] || 0;
    return bRelevance - aRelevance;
  });

  // Get recommended widgets for the user's role
  const recommendedWidgets = sortedWidgets
    .filter(widget => widget.roleRelevance[userRole] >= 4)
    .map(widget => widget.id);

  useEffect(() => {
    // Auto-select recommended widgets if none selected
    if (selectedWidgets.length === 0) {
      setSelectedWidgets(recommendedWidgets);
    }
  }, [userRole]);

  const handleWidgetToggle = (widgetId: string) => {
    setSelectedWidgets(prev => 
      prev.includes(widgetId)
        ? prev.filter(id => id !== widgetId)
        : [...prev, widgetId]
    );
  };

  const handleSelectRecommended = () => {
    setSelectedWidgets(recommendedWidgets);
  };

  const handleClearAll = () => {
    setSelectedWidgets([]);
  };

  const handleContinue = () => {
    const data = {
      preferredWidgets: selectedWidgets,
      layout,
      theme,
      autoRefresh,
    };
    
    onComplete(data);
    onNext();
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'productivity': return 'bg-blue-100 text-blue-800';
      case 'quality': return 'bg-green-100 text-green-800';
      case 'collaboration': return 'bg-purple-100 text-purple-800';
      case 'insights': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const layoutOptions = [
    {
      id: 'compact',
      title: 'Compact',
      description: 'More widgets in less space',
      icon: Smartphone,
    },
    {
      id: 'spacious',
      title: 'Spacious',
      description: 'Larger widgets with more detail',
      icon: Monitor,
    },
  ];

  const themeOptions = [
    { id: 'light', title: 'Light', description: 'Clean and bright interface' },
    { id: 'dark', title: 'Dark', description: 'Easy on the eyes' },
    { id: 'auto', title: 'Auto', description: 'Matches system preference' },
  ];

  return (
    <div className="dashboard-setup-step">
      {/* Role-based Recommendations */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
        <h3 className="font-semibold text-green-900 mb-2">
          Recommended for {userRole.replace('_', ' ')}s
        </h3>
        <p className="text-green-800 text-sm mb-3">
          Based on your role, we've pre-selected the most relevant widgets for your workflow.
        </p>
        <div className="flex space-x-3">
          <button
            onClick={handleSelectRecommended}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
          >
            Use Recommended
          </button>
          <button
            onClick={handleClearAll}
            className="px-3 py-1 bg-white text-green-700 text-sm rounded border border-green-300 hover:bg-green-50 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Widget Selection */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Choose your dashboard widgets ({selectedWidgets.length} selected)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedWidgets.map((widget) => {
            const isSelected = selectedWidgets.includes(widget.id);
            const relevance = widget.roleRelevance[userRole] || 0;
            const isHighlyRelevant = relevance >= 4;
            
            return (
              <button
                key={widget.id}
                onClick={() => handleWidgetToggle(widget.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all hover:border-blue-300 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      isSelected ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <widget.icon className={`w-5 h-5 ${
                        isSelected ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                        <span>{widget.title}</span>
                        {isHighlyRelevant && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                            Recommended
                          </span>
                        )}
                      </h4>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(widget.category)}`}>
                    {widget.category}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">
                  {widget.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < relevance ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                    <span className="text-xs text-gray-500 ml-2">
                      Relevance for your role
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Layout Preferences */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Dashboard layout
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {layoutOptions.map((option) => (
            <label
              key={option.id}
              className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                layout === option.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="layout"
                value={option.id}
                checked={layout === option.id}
                onChange={(e) => setLayout(e.target.value as 'compact' | 'spacious')}
                className="sr-only"
              />
              <div className={`p-2 rounded-lg ${
                layout === option.id ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <option.icon className={`w-5 h-5 ${
                  layout === option.id ? 'text-blue-600' : 'text-gray-600'
                }`} />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{option.title}</h4>
                <p className="text-sm text-gray-600">{option.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Theme and Preferences */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Appearance and preferences
        </h3>
        
        <div className="space-y-4">
          {/* Theme Selection */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Theme</h4>
            <div className="flex space-x-3">
              {themeOptions.map((option) => (
                <label
                  key={option.id}
                  className={`flex-1 p-3 rounded-lg border cursor-pointer transition-colors ${
                    theme === option.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={option.id}
                    checked={theme === option.id}
                    onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'auto')}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="font-medium text-gray-900 mb-1">{option.title}</div>
                    <div className="text-sm text-gray-600">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Auto Refresh */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Auto-refresh data</h4>
              <p className="text-sm text-gray-600">Automatically update dashboard data every 30 seconds</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-gray-900 mb-2">Dashboard preview:</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div>• {selectedWidgets.length} widgets selected</div>
          <div>• {layout} layout with {theme} theme</div>
          <div>• Auto-refresh: {autoRefresh ? 'enabled' : 'disabled'}</div>
        </div>
      </div>

      {/* Continue Button */}
      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={selectedWidgets.length === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default DashboardSetupStep;