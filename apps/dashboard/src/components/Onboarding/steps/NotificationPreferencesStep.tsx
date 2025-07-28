import React, { useState } from 'react';
import { OnboardingStepProps } from '../../../types/onboarding';
import { Mail, Bell, MessageSquare, Clock, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface NotificationChannel {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  enabled: boolean;
  settings?: Record<string, any>;
}

interface NotificationType {
  id: string;
  title: string;
  description: string;
  example: string;
  severity: 'low' | 'medium' | 'high';
  defaultChannels: string[];
  enabled: boolean;
}

export const NotificationPreferencesStep: React.FC<OnboardingStepProps> = ({
  onNext,
  onComplete,
  stepData,
}) => {
  const [channels, setChannels] = useState<NotificationChannel[]>([
    {
      id: 'email',
      title: 'Email',
      description: 'Receive notifications via email',
      icon: Mail,
      enabled: stepData?.email ?? false,
    },
    {
      id: 'inApp',
      title: 'In-App',
      description: 'Show notifications in the dashboard',
      icon: Bell,
      enabled: stepData?.inApp ?? true,
    },
    {
      id: 'slack',
      title: 'Slack',
      description: 'Send notifications to Slack (requires integration)',
      icon: MessageSquare,
      enabled: stepData?.slack ?? false,
    },
  ]);

  const [frequency, setFrequency] = useState<'immediate' | 'hourly' | 'daily'>(
    stepData?.frequency || 'daily'
  );

  const [notificationTypes, setNotificationTypes] = useState<NotificationType[]>([
    {
      id: 'productivity_alerts',
      title: 'Productivity Alerts',
      description: 'Notifications about productivity changes and insights',
      example: 'Your focus time decreased by 20% this week',
      severity: 'medium',
      defaultChannels: ['inApp'],
      enabled: true,
    },
    {
      id: 'quality_issues',
      title: 'Code Quality Issues',
      description: 'Alerts about code quality degradation or improvements',
      example: 'Code churn rate is above normal threshold',
      severity: 'high',
      defaultChannels: ['inApp', 'email'],
      enabled: true,
    },
    {
      id: 'team_updates',
      title: 'Team Updates',
      description: 'Information about team performance and collaboration',
      example: 'Team velocity increased by 15% this sprint',
      severity: 'low',
      defaultChannels: ['inApp'],
      enabled: false,
    },
    {
      id: 'review_assignments',
      title: 'Code Review Assignments',
      description: 'Notifications when you\'re assigned to review code',
      example: 'You\'ve been assigned to review PR #123',
      severity: 'medium',
      defaultChannels: ['inApp', 'slack'],
      enabled: true,
    },
    {
      id: 'achievement_badges',
      title: 'Achievement Badges',
      description: 'Celebrate your productivity milestones and achievements',
      example: 'Congratulations! You achieved a 7-day flow streak',
      severity: 'low',
      defaultChannels: ['inApp'],
      enabled: true,
    },
    {
      id: 'system_alerts',
      title: 'System Alerts',
      description: 'Important system updates and maintenance notifications',
      example: 'Scheduled maintenance tonight from 2-4 AM',
      severity: 'high',
      defaultChannels: ['inApp', 'email'],
      enabled: true,
    },
  ]);

  const [quietHours, setQuietHours] = useState({
    enabled: stepData?.quietHours?.enabled ?? true,
    start: stepData?.quietHours?.start ?? '18:00',
    end: stepData?.quietHours?.end ?? '09:00',
  });

  const handleChannelToggle = (channelId: string) => {
    setChannels(prev => prev.map(channel =>
      channel.id === channelId
        ? { ...channel, enabled: !channel.enabled }
        : channel
    ));
  };

  const handleNotificationTypeToggle = (typeId: string) => {
    setNotificationTypes(prev => prev.map(type =>
      type.id === typeId
        ? { ...type, enabled: !type.enabled }
        : type
    ));
  };

  const handleContinue = () => {
    const enabledChannels = channels.filter(c => c.enabled);
    const data = {
      email: channels.find(c => c.id === 'email')?.enabled || false,
      inApp: channels.find(c => c.id === 'inApp')?.enabled || false,
      slack: channels.find(c => c.id === 'slack')?.enabled || false,
      frequency,
      notificationTypes: notificationTypes.filter(t => t.enabled).map(t => t.id),
      quietHours,
    };
    
    onComplete(data);
    onNext();
  };

  const frequencyOptions = [
    {
      id: 'immediate',
      title: 'Immediate',
      description: 'Get notified as soon as events happen',
      icon: AlertTriangle,
    },
    {
      id: 'hourly',
      title: 'Hourly Digest',
      description: 'Receive a summary every hour',
      icon: Clock,
    },
    {
      id: 'daily',
      title: 'Daily Summary',
      description: 'Get a daily digest of all notifications',
      icon: CheckCircle,
    },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const enabledChannels = channels.filter(c => c.enabled);
  const hasEnabledChannels = enabledChannels.length > 0;

  return (
    <div className="notification-preferences-step">
      {/* Header */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start space-x-3">
          <Bell className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">
              Stay Informed, Stay Productive
            </h3>
            <p className="text-blue-800 text-sm">
              Configure how and when you want to receive productivity insights and alerts.
            </p>
          </div>
        </div>
      </div>

      {/* Notification Channels */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Notification channels
        </h3>
        <div className="space-y-4">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className={`p-4 rounded-lg border transition-colors ${
                channel.enabled
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    channel.enabled ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <channel.icon className={`w-5 h-5 ${
                      channel.enabled ? 'text-blue-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {channel.title}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {channel.description}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channel.enabled}
                    onChange={() => handleChannelToggle(channel.id)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notification Frequency */}
      {hasEnabledChannels && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Notification frequency
          </h3>
          <div className="space-y-3">
            {frequencyOptions.map((option) => (
              <label
                key={option.id}
                className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  frequency === option.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="frequency"
                  value={option.id}
                  checked={frequency === option.id}
                  onChange={(e) => setFrequency(e.target.value as 'immediate' | 'hourly' | 'daily')}
                  className="sr-only"
                />
                <div className={`p-2 rounded-lg ${
                  frequency === option.id ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <option.icon className={`w-5 h-5 ${
                    frequency === option.id ? 'text-blue-600' : 'text-gray-600'
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
      )}

      {/* Notification Types */}
      {hasEnabledChannels && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            What would you like to be notified about?
          </h3>
          <div className="space-y-4">
            {notificationTypes.map((type) => (
              <div
                key={type.id}
                className={`p-4 rounded-lg border transition-colors ${
                  type.enabled
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900">
                        {type.title}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(type.severity)}`}>
                        {type.severity} priority
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {type.description}
                    </p>
                    <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded italic">
                      Example: "{type.example}"
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={type.enabled}
                      onChange={() => handleNotificationTypeToggle(type.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quiet Hours */}
      {hasEnabledChannels && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quiet hours
          </h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-gray-900">Enable quiet hours</h4>
                <p className="text-sm text-gray-600">Pause non-urgent notifications during specified hours</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={quietHours.enabled}
                  onChange={(e) => setQuietHours(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            {quietHours.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start time
                  </label>
                  <input
                    type="time"
                    value={quietHours.start}
                    onChange={(e) => setQuietHours(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End time
                  </label>
                  <input
                    type="time"
                    value={quietHours.end}
                    onChange={(e) => setQuietHours(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Channels Warning */}
      {!hasEnabledChannels && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900 mb-1">
                No notification channels enabled
              </h4>
              <p className="text-yellow-800 text-sm">
                You won't receive any notifications. You can always enable them later in your settings.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-gray-900 mb-2">Notification summary:</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div>• Channels: {hasEnabledChannels ? enabledChannels.map(c => c.title).join(', ') : 'None'}</div>
          {hasEnabledChannels && (
            <>
              <div>• Frequency: {frequency}</div>
              <div>• Types: {notificationTypes.filter(t => t.enabled).length} enabled</div>
              <div>• Quiet hours: {quietHours.enabled ? `${quietHours.start} - ${quietHours.end}` : 'disabled'}</div>
            </>
          )}
        </div>
      </div>

      {/* Continue Button */}
      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default NotificationPreferencesStep;