/**
 * Alert Preferences Component
 * Manages user alert preferences and notification settings
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  Mail,
  Smartphone,
  Webhook,
  Clock,
  Volume2,
  VolumeX,
  Settings,
  Save,
  RotateCcw,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';
import { Card } from './Card';
import { Input } from './Input';
import { 
  alertService, 
  UserAlertPreferences, 
  AlertSeverity, 
  AlertChannel 
} from '../../services/alertService';

const channelIcons = {
  'in-app': Bell,
  email: Mail,
  sms: Smartphone,
  push: Bell,
  webhook: Webhook,
};

const channelLabels = {
  'in-app': 'In-App Notifications',
  email: 'Email Notifications',
  sms: 'SMS Notifications',
  push: 'Push Notifications',
  webhook: 'Webhook Notifications',
};

const severityLabels = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const severityColors = {
  low: 'text-blue-600 dark:text-blue-400',
  medium: 'text-yellow-600 dark:text-yellow-400',
  high: 'text-orange-600 dark:text-orange-400',
  critical: 'text-red-600 dark:text-red-400',
};

interface ChannelPreferencesProps {
  channel: AlertChannel;
  preferences: UserAlertPreferences['channels'][AlertChannel];
  onChange: (channel: AlertChannel, preferences: UserAlertPreferences['channels'][AlertChannel]) => void;
}

const ChannelPreferences: React.FC<ChannelPreferencesProps> = ({
  channel,
  preferences,
  onChange,
}) => {
  const Icon = channelIcons[channel];
  const label = channelLabels[channel];

  const handleToggle = () => {
    onChange(channel, { ...preferences, enabled: !preferences.enabled });
  };

  const handleSeverityChange = (severity: AlertSeverity) => {
    onChange(channel, { ...preferences, severityThreshold: severity });
  };

  const handleFrequencyChange = (frequency: 'immediate' | 'batched' | 'digest') => {
    onChange(channel, { ...preferences, frequency });
  };

  const handleBatchIntervalChange = (interval: number) => {
    onChange(channel, { ...preferences, batchInterval: interval });
  };

  const handleQuietHoursChange = (quietHours: typeof preferences.quietHours) => {
    onChange(channel, { ...preferences, quietHours });
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{label}</h3>
          </div>
          
          <button
            onClick={handleToggle}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              preferences.enabled
                ? 'bg-blue-600'
                : 'bg-gray-200 dark:bg-gray-700'
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                preferences.enabled ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        </div>

        {preferences.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {/* Severity Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Minimum Severity
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['low', 'medium', 'high', 'critical'] as AlertSeverity[]).map((severity) => (
                  <button
                    key={severity}
                    onClick={() => handleSeverityChange(severity)}
                    className={cn(
                      'px-3 py-2 text-sm font-medium rounded-md border transition-colors',
                      preferences.severityThreshold === severity
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                    )}
                  >
                    <span className={severityColors[severity]}>
                      {severityLabels[severity]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Delivery Frequency
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['immediate', 'batched', 'digest'] as const).map((frequency) => (
                  <button
                    key={frequency}
                    onClick={() => handleFrequencyChange(frequency)}
                    className={cn(
                      'px-3 py-2 text-sm font-medium rounded-md border transition-colors',
                      preferences.frequency === frequency
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                    )}
                  >
                    {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Batch Interval */}
            {preferences.frequency === 'batched' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Batch Interval (minutes)
                </label>
                <Input
                  type="number"
                  value={preferences.batchInterval || 30}
                  onChange={(e) => handleBatchIntervalChange(parseInt(e.target.value))}
                  min={5}
                  max={1440}
                  className="w-32"
                />
              </div>
            )}

            {/* Quiet Hours */}
            {(channel === 'email' || channel === 'sms' || channel === 'push') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quiet Hours
                </label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm">From:</label>
                    <Input
                      type="time"
                      value={preferences.quietHours?.start || '22:00'}
                      onChange={(e) => handleQuietHoursChange({
                        ...preferences.quietHours,
                        start: e.target.value,
                        end: preferences.quietHours?.end || '08:00',
                        timezone: preferences.quietHours?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                      })}
                      className="w-32"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <label className="text-sm">To:</label>
                    <Input
                      type="time"
                      value={preferences.quietHours?.end || '08:00'}
                      onChange={(e) => handleQuietHoursChange({
                        ...preferences.quietHours,
                        start: preferences.quietHours?.start || '22:00',
                        end: e.target.value,
                        timezone: preferences.quietHours?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                      })}
                      className="w-32"
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </Card>
  );
};

interface CategoryPreferencesProps {
  categories: UserAlertPreferences['categories'];
  onChange: (categories: UserAlertPreferences['categories']) => void;
}

const CategoryPreferences: React.FC<CategoryPreferencesProps> = ({
  categories,
  onChange,
}) => {
  const [newCategory, setNewCategory] = useState('');

  const commonCategories = [
    'system',
    'security',
    'performance',
    'deployment',
    'monitoring',
    'backup',
    'network',
    'database',
  ];

  const handleCategoryToggle = (category: string) => {
    const updated = { ...categories };
    if (updated[category]) {
      updated[category] = {
        ...updated[category],
        enabled: !updated[category].enabled,
      };
    } else {
      updated[category] = {
        enabled: true,
        channels: ['in-app'],
      };
    }
    onChange(updated);
  };

  const handleChannelToggle = (category: string, channel: AlertChannel) => {
    const updated = { ...categories };
    if (!updated[category]) {
      updated[category] = { enabled: true, channels: [] };
    }
    
    const channels = updated[category].channels;
    const index = channels.indexOf(channel);
    
    if (index > -1) {
      channels.splice(index, 1);
    } else {
      channels.push(channel);
    }
    
    onChange(updated);
  };

  const addCategory = () => {
    if (newCategory && !categories[newCategory]) {
      onChange({
        ...categories,
        [newCategory]: {
          enabled: true,
          channels: ['in-app'],
        },
      });
      setNewCategory('');
    }
  };

  const removeCategory = (category: string) => {
    const updated = { ...categories };
    delete updated[category];
    onChange(updated);
  };

  const allCategories = [...new Set([...commonCategories, ...Object.keys(categories)])];

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">Category Preferences</h3>
          
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Add category..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCategory()}
              className="w-40"
            />
            <Button size="sm" onClick={addCategory}>
              Add
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {allCategories.map((category) => {
            const prefs = categories[category] || { enabled: false, channels: [] };
            
            return (
              <div
                key={category}
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleCategoryToggle(category)}
                    className={cn(
                      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                      prefs.enabled
                        ? 'bg-blue-600'
                        : 'bg-gray-200 dark:bg-gray-700'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
                        prefs.enabled ? 'translate-x-5' : 'translate-x-1'
                      )}
                    />
                  </button>
                  
                  <span className="font-medium capitalize">{category}</span>
                </div>

                {prefs.enabled && (
                  <div className="flex items-center space-x-2">
                    {(['in-app', 'email', 'push'] as AlertChannel[]).map((channel) => {
                      const Icon = channelIcons[channel];
                      const isEnabled = prefs.channels.includes(channel);
                      
                      return (
                        <button
                          key={channel}
                          onClick={() => handleChannelToggle(category, channel)}
                          className={cn(
                            'p-2 rounded-md transition-colors',
                            isEnabled
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                          )}
                          title={channelLabels[channel]}
                        >
                          <Icon size={16} />
                        </button>
                      );
                    })}
                    
                    {!commonCategories.includes(category) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeCategory(category)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

interface AlertPreferencesProps {
  userId?: string;
  className?: string;
}

export const AlertPreferences: React.FC<AlertPreferencesProps> = ({
  userId = 'current-user',
  className,
}) => {
  const [preferences, setPreferences] = useState<UserAlertPreferences | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load user preferences
    const userPrefs = alertService.getUserPreferences(userId);
    setPreferences(userPrefs);
  }, [userId]);

  const handleChannelChange = (channel: AlertChannel, channelPrefs: UserAlertPreferences['channels'][AlertChannel]) => {
    if (!preferences) return;
    
    const updated = {
      ...preferences,
      channels: {
        ...preferences.channels,
        [channel]: channelPrefs,
      },
    };
    
    setPreferences(updated);
    setHasChanges(true);
  };

  const handleCategoryChange = (categories: UserAlertPreferences['categories']) => {
    if (!preferences) return;
    
    const updated = {
      ...preferences,
      categories,
    };
    
    setPreferences(updated);
    setHasChanges(true);
  };

  const handleEscalationChange = (escalationSettings: UserAlertPreferences['escalationSettings']) => {
    if (!preferences) return;
    
    const updated = {
      ...preferences,
      escalationSettings,
    };
    
    setPreferences(updated);
    setHasChanges(true);
  };

  const handleSnoozeChange = (snoozeSettings: UserAlertPreferences['snoozeSettings']) => {
    if (!preferences) return;
    
    const updated = {
      ...preferences,
      snoozeSettings,
    };
    
    setPreferences(updated);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!preferences) return;
    
    setIsSaving(true);
    try {
      alertService.updateUserPreferences(userId, preferences);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const defaultPrefs = alertService.getUserPreferences(userId);
    setPreferences(defaultPrefs);
    setHasChanges(false);
  };

  if (!preferences) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Settings className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Alert Preferences
          </h2>
        </div>
        
        <div className="flex items-center space-x-3">
          {hasChanges && (
            <Button
              variant="ghost"
              onClick={handleReset}
              disabled={isSaving}
            >
              <RotateCcw size={16} />
              Reset
            </Button>
          )}
          
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            loading={isSaving}
          >
            <Save size={16} />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Channel Preferences */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Notification Channels
        </h3>
        
        <div className="grid gap-4 md:grid-cols-2">
          {(Object.keys(preferences.channels) as AlertChannel[]).map((channel) => (
            <ChannelPreferences
              key={channel}
              channel={channel}
              preferences={preferences.channels[channel]}
              onChange={handleChannelChange}
            />
          ))}
        </div>
      </div>

      {/* Category Preferences */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Category Settings
        </h3>
        
        <CategoryPreferences
          categories={preferences.categories}
          onChange={handleCategoryChange}
        />
      </div>

      {/* Escalation Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Escalation Settings
        </h3>
        
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium">Auto-escalation</label>
                <p className="text-sm text-gray-500">Automatically escalate unacknowledged alerts</p>
              </div>
              <button
                onClick={() => handleEscalationChange({
                  ...preferences.escalationSettings,
                  autoEscalate: !preferences.escalationSettings.autoEscalate,
                })}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  preferences.escalationSettings.autoEscalate
                    ? 'bg-blue-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    preferences.escalationSettings.autoEscalate ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            {preferences.escalationSettings.autoEscalate && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Escalation Delay (minutes)
                  </label>
                  <Input
                    type="number"
                    value={preferences.escalationSettings.escalationDelay}
                    onChange={(e) => handleEscalationChange({
                      ...preferences.escalationSettings,
                      escalationDelay: parseInt(e.target.value),
                    })}
                    min={1}
                    max={1440}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Escalation Level
                  </label>
                  <Input
                    type="number"
                    value={preferences.escalationSettings.maxEscalationLevel}
                    onChange={(e) => handleEscalationChange({
                      ...preferences.escalationSettings,
                      maxEscalationLevel: parseInt(e.target.value),
                    })}
                    min={1}
                    max={10}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Snooze Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Snooze Settings
        </h3>
        
        <Card className="p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default Duration (minutes)
                </label>
                <Input
                  type="number"
                  value={preferences.snoozeSettings.defaultDuration}
                  onChange={(e) => handleSnoozeChange({
                    ...preferences.snoozeSettings,
                    defaultDuration: parseInt(e.target.value),
                  })}
                  min={5}
                  max={1440}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Duration (minutes)
                </label>
                <Input
                  type="number"
                  value={preferences.snoozeSettings.maxDuration}
                  onChange={(e) => handleSnoozeChange({
                    ...preferences.snoozeSettings,
                    maxDuration: parseInt(e.target.value),
                  })}
                  min={5}
                  max={1440}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Allowed Severities for Snoozing
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['low', 'medium', 'high', 'critical'] as AlertSeverity[]).map((severity) => (
                  <button
                    key={severity}
                    onClick={() => {
                      const allowed = preferences.snoozeSettings.allowedSeverities;
                      const index = allowed.indexOf(severity);
                      const updated = [...allowed];
                      
                      if (index > -1) {
                        updated.splice(index, 1);
                      } else {
                        updated.push(severity);
                      }
                      
                      handleSnoozeChange({
                        ...preferences.snoozeSettings,
                        allowedSeverities: updated,
                      });
                    }}
                    className={cn(
                      'px-3 py-2 text-sm font-medium rounded-md border transition-colors',
                      preferences.snoozeSettings.allowedSeverities.includes(severity)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                    )}
                  >
                    <span className={severityColors[severity]}>
                      {severityLabels[severity]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AlertPreferences;