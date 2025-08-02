import React from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Text, Card, Switch, List, Divider, SegmentedButtons} from 'react-native-paper';
import {useSelector, useDispatch} from 'react-redux';

import {RootState, AppDispatch} from '@/store';
import {
  updateNotificationSettings,
  updatePrivacySettings,
  updateDisplaySettings,
} from '@/store/slices/settingsSlice';
import {theme} from '@/theme';

export const SettingsScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {notifications, privacy, display} = useSelector((state: RootState) => state.settings);

  const handleNotificationToggle = (key: keyof typeof notifications, value: boolean) => {
    dispatch(updateNotificationSettings({[key]: value}));
  };

  const handlePrivacyToggle = (key: keyof typeof privacy, value: boolean) => {
    dispatch(updatePrivacySettings({[key]: value}));
  };

  const handleDisplaySetting = (key: keyof typeof display, value: any) => {
    dispatch(updateDisplaySettings({[key]: value}));
  };

  const themeOptions = [
    {value: 'light', label: 'Light'},
    {value: 'dark', label: 'Dark'},
    {value: 'auto', label: 'Auto'},
  ];

  const fontSizeOptions = [
    {value: 'small', label: 'Small'},
    {value: 'medium', label: 'Medium'},
    {value: 'large', label: 'Large'},
  ];

  const severityOptions = [
    {value: 'low', label: 'Low'},
    {value: 'medium', label: 'Medium'},
    {value: 'high', label: 'High'},
    {value: 'critical', label: 'Critical'},
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Notifications Settings */}
      <Card style={styles.card}>
        <List.Section>
          <List.Subheader>Notifications</List.Subheader>
          
          <List.Item
            title="Push Notifications"
            description="Receive push notifications on your device"
            right={() => (
              <Switch
                value={notifications.pushNotifications}
                onValueChange={(value) => handleNotificationToggle('pushNotifications', value)}
              />
            )}
          />
          
          <List.Item
            title="Email Notifications"
            description="Receive notifications via email"
            right={() => (
              <Switch
                value={notifications.emailNotifications}
                onValueChange={(value) => handleNotificationToggle('emailNotifications', value)}
              />
            )}
          />
          
          <View style={styles.segmentedContainer}>
            <Text style={styles.segmentedLabel}>Alert Severity Threshold</Text>
            <SegmentedButtons
              value={notifications.alertSeverityThreshold}
              onValueChange={(value) => 
                dispatch(updateNotificationSettings({
                  alertSeverityThreshold: value as 'low' | 'medium' | 'high' | 'critical'
                }))
              }
              buttons={severityOptions}
              style={styles.segmentedButtons}
            />
          </View>
          
          <List.Item
            title="Quiet Hours"
            description={
              notifications.quietHours.enabled
                ? `${notifications.quietHours.start} - ${notifications.quietHours.end}`
                : 'Disabled'
            }
            right={() => (
              <Switch
                value={notifications.quietHours.enabled}
                onValueChange={(value) => 
                  dispatch(updateNotificationSettings({
                    quietHours: {...notifications.quietHours, enabled: value}
                  }))
                }
              />
            )}
          />
        </List.Section>
      </Card>

      {/* Privacy Settings */}
      <Card style={styles.card}>
        <List.Section>
          <List.Subheader>Privacy & Data</List.Subheader>
          
          <List.Item
            title="Data Collection"
            description="Allow collection of usage data"
            right={() => (
              <Switch
                value={privacy.dataCollection}
                onValueChange={(value) => handlePrivacyToggle('dataCollection', value)}
              />
            )}
          />
          
          <List.Item
            title="Analytics"
            description="Help improve the app with anonymous analytics"
            right={() => (
              <Switch
                value={privacy.analytics}
                onValueChange={(value) => handlePrivacyToggle('analytics', value)}
              />
            )}
          />
          
          <List.Item
            title="Crash Reporting"
            description="Send crash reports to help fix issues"
            right={() => (
              <Switch
                value={privacy.crashReporting}
                onValueChange={(value) => handlePrivacyToggle('crashReporting', value)}
              />
            )}
          />
          
          <List.Item
            title="Personalized Insights"
            description="Enable AI-powered personalized recommendations"
            right={() => (
              <Switch
                value={privacy.personalizedInsights}
                onValueChange={(value) => handlePrivacyToggle('personalizedInsights', value)}
              />
            )}
          />
        </List.Section>
      </Card>

      {/* Display Settings */}
      <Card style={styles.card}>
        <List.Section>
          <List.Subheader>Display</List.Subheader>
          
          <View style={styles.segmentedContainer}>
            <Text style={styles.segmentedLabel}>Theme</Text>
            <SegmentedButtons
              value={display.theme}
              onValueChange={(value) => handleDisplaySetting('theme', value)}
              buttons={themeOptions}
              style={styles.segmentedButtons}
            />
          </View>
          
          <View style={styles.segmentedContainer}>
            <Text style={styles.segmentedLabel}>Font Size</Text>
            <SegmentedButtons
              value={display.fontSize}
              onValueChange={(value) => handleDisplaySetting('fontSize', value)}
              buttons={fontSizeOptions}
              style={styles.segmentedButtons}
            />
          </View>
          
          <List.Item
            title="Show Trends"
            description="Display trend indicators on metrics"
            right={() => (
              <Switch
                value={display.showTrends}
                onValueChange={(value) => handleDisplaySetting('showTrends', value)}
              />
            )}
          />
          
          <List.Item
            title="Auto Refresh"
            description={`Refresh data every ${display.refreshInterval} seconds`}
            onPress={() => {
              // TODO: Show refresh interval picker
            }}
          />
        </List.Section>
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Settings are automatically saved and synced across devices
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  card: {
    margin: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    elevation: 2,
  },
  segmentedContainer: {
    padding: theme.spacing.md,
  },
  segmentedLabel: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  segmentedButtons: {
    marginBottom: theme.spacing.sm,
  },
  footer: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text,
    opacity: 0.6,
    textAlign: 'center',
  },
});