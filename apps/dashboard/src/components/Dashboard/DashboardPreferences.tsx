import React, { useState, useEffect } from 'react';
import { X, Save, Palette, Clock, Layout, Bell } from 'lucide-react';
import { DashboardPreferences as DashboardPreferencesType, TimePeriod } from '../../types/dashboard';
import { dashboardService } from '../../services/dashboardService';

interface DashboardPreferencesProps {
  isOpen: boolean;
  onClose: () => void;
  onPreferencesUpdate?: (preferences: DashboardPreferencesType) => void;
}

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', description: 'Clean and bright interface' },
  { value: 'dark', label: 'Dark', description: 'Easy on the eyes' },
  { value: 'auto', label: 'Auto', description: 'Follow system preference' },
];

const TIME_RANGE_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: 'hour', label: 'Last Hour' },
  { value: 'day', label: 'Last Day' },
  { value: 'week', label: 'Last Week' },
  { value: 'month', label: 'Last Month' },
  { value: 'quarter', label: 'Last Quarter' },
];

const REFRESH_INTERVAL_OPTIONS = [
  { value: 10, label: '10 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' },
];

const NOTIFICATION_FREQUENCY_OPTIONS = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'hourly', label: 'Hourly digest' },
  { value: 'daily', label: 'Daily digest' },
];

export const DashboardPreferences: React.FC<DashboardPreferencesProps> = ({
  isOpen,
  onClose,
  onPreferencesUpdate,
}) => {
  const [preferences, setPreferences] = useState<DashboardPreferencesType>({
    defaultTimeRange: 'day',
    autoRefresh: true,
    refreshInterval: 30,
    compactMode: false,
  });

  const [userPreferences, setUserPreferences] = useState({
    theme: 'light',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    notifications: {
      email: true,
      inApp: true,
      slack: false,
      frequency: 'daily' as const,
    },
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen]);

  const loadPreferences = () => {
    try {
      const savedPreferences = dashboardService.getDashboardPreferences();
      if (savedPreferences.dashboard) {
        setPreferences(savedPreferences.dashboard);
      }
      if (savedPreferences.theme) {
        setUserPreferences(prev => ({
          ...prev,
          theme: savedPreferences.theme,
          timezone: savedPreferences.timezone || prev.timezone,
          notifications: savedPreferences.notifications || prev.notifications,
        }));
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const allPreferences = {
        dashboard: preferences,
        theme: userPreferences.theme,
        timezone: userPreferences.timezone,
        notifications: userPreferences.notifications,
      };

      dashboardService.saveDashboardPreferences(allPreferences);
      
      if (onPreferencesUpdate) {
        onPreferencesUpdate(preferences);
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferenceChange = (key: keyof DashboardPreferencesType, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleUserPreferenceChange = (key: string, value: any) => {
    setUserPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleNotificationChange = (key: string, value: any) => {
    setUserPreferences(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value,
      },
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Dashboard Preferences
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-8">
            {/* Appearance Section */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Palette className="w-5 h-5 text-gray-600" />
                <h4 className="text-md font-medium text-gray-900">Appearance</h4>
              </div>
              
              <div className="space-y-4 ml-7">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {THEME_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={`relative flex cursor-pointer rounded-lg border p-3 focus:outline-none ${
                          userPreferences.theme === option.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="theme"
                          value={option.value}
                          checked={userPreferences.theme === option.value}
                          onChange={(e) => handleUserPreferenceChange('theme', e.target.value)}
                          className="sr-only"
                        />
                        <div className="flex flex-col">
                          <span className="block text-sm font-medium text-gray-900">
                            {option.label}
                          </span>
                          <span className="block text-xs text-gray-500">
                            {option.description}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.compactMode}
                      onChange={(e) => handlePreferenceChange('compactMode', e.target.checked)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Compact mode</span>
                  </label>
                  <p className="text-xs text-gray-500 ml-6">
                    Reduce spacing and padding for more content density
                  </p>
                </div>
              </div>
            </div>

            {/* Dashboard Layout Section */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Layout className="w-5 h-5 text-gray-600" />
                <h4 className="text-md font-medium text-gray-900">Dashboard Layout</h4>
              </div>
              
              <div className="space-y-4 ml-7">
                <div>
                  <label htmlFor="default-time-range" className="block text-sm font-medium text-gray-700 mb-2">
                    Default Time Range
                  </label>
                  <select
                    id="default-time-range"
                    value={preferences.defaultTimeRange}
                    onChange={(e) => handlePreferenceChange('defaultTimeRange', e.target.value as TimePeriod)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TIME_RANGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Auto-refresh Section */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Clock className="w-5 h-5 text-gray-600" />
                <h4 className="text-md font-medium text-gray-900">Auto-refresh</h4>
              </div>
              
              <div className="space-y-4 ml-7">
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.autoRefresh}
                      onChange={(e) => handlePreferenceChange('autoRefresh', e.target.checked)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Enable auto-refresh</span>
                  </label>
                </div>

                {preferences.autoRefresh && (
                  <div>
                    <label htmlFor="refresh-interval" className="block text-sm font-medium text-gray-700 mb-2">
                      Refresh Interval
                    </label>
                    <select
                      id="refresh-interval"
                      value={preferences.refreshInterval}
                      onChange={(e) => handlePreferenceChange('refreshInterval', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {REFRESH_INTERVAL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Notifications Section */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Bell className="w-5 h-5 text-gray-600" />
                <h4 className="text-md font-medium text-gray-900">Notifications</h4>
              </div>
              
              <div className="space-y-4 ml-7">
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={userPreferences.notifications.email}
                      onChange={(e) => handleNotificationChange('email', e.target.checked)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Email notifications</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={userPreferences.notifications.inApp}
                      onChange={(e) => handleNotificationChange('inApp', e.target.checked)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">In-app notifications</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={userPreferences.notifications.slack}
                      onChange={(e) => handleNotificationChange('slack', e.target.checked)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Slack notifications</span>
                  </label>
                </div>

                <div>
                  <label htmlFor="notification-frequency" className="block text-sm font-medium text-gray-700 mb-2">
                    Notification Frequency
                  </label>
                  <select
                    id="notification-frequency"
                    value={userPreferences.notifications.frequency}
                    onChange={(e) => handleNotificationChange('frequency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {NOTIFICATION_FREQUENCY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Timezone Section */}
            <div>
              <div className="ml-7">
                <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <input
                  id="timezone"
                  type="text"
                  value={userPreferences.timezone}
                  onChange={(e) => handleUserPreferenceChange('timezone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., America/New_York"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Current timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-8">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              <span>{isLoading ? 'Saving...' : 'Save Preferences'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPreferences;