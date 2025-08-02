import React from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Text, Card, Switch, List, Divider, Button} from 'react-native-paper';
import {useSelector, useDispatch} from 'react-redux';
import {useNavigation} from '@react-navigation/native';

import {RootState, AppDispatch} from '@/store';
import {updatePrivacySettings} from '@/store/slices/settingsSlice';
import {theme} from '@/theme';

export const PrivacySettingsScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const {privacy} = useSelector((state: RootState) => state.settings);

  const handlePrivacyToggle = (key: keyof typeof privacy, value: boolean) => {
    dispatch(updatePrivacySettings({[key]: value}));
  };

  const handleDataExport = () => {
    // TODO: Implement data export functionality
    console.log('Export data requested');
  };

  const handleDataDeletion = () => {
    // TODO: Implement data deletion functionality
    console.log('Data deletion requested');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Data Collection Settings */}
      <Card style={styles.card}>
        <List.Section>
          <List.Subheader>Data Collection</List.Subheader>
          
          <List.Item
            title="IDE Telemetry"
            description="Collect data about your coding patterns and productivity"
            right={() => (
              <Switch
                value={privacy.dataCollection}
                onValueChange={(value) => handlePrivacyToggle('dataCollection', value)}
              />
            )}
          />
          
          <List.Item
            title="Git Activity Tracking"
            description="Monitor commits, pull requests, and code changes"
            right={() => (
              <Switch
                value={privacy.gitTracking || false}
                onValueChange={(value) => 
                  dispatch(updatePrivacySettings({gitTracking: value}))
                }
              />
            )}
          />
          
          <List.Item
            title="Communication Data"
            description="Analyze team communication patterns and collaboration"
            right={() => (
              <Switch
                value={privacy.communicationTracking || false}
                onValueChange={(value) => 
                  dispatch(updatePrivacySettings({communicationTracking: value}))
                }
              />
            )}
          />
        </List.Section>
      </Card>

      {/* Analytics and Insights */}
      <Card style={styles.card}>
        <List.Section>
          <List.Subheader>Analytics & Insights</List.Subheader>
          
          <List.Item
            title="Anonymous Analytics"
            description="Help improve the app with anonymous usage data"
            right={() => (
              <Switch
                value={privacy.analytics}
                onValueChange={(value) => handlePrivacyToggle('analytics', value)}
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
          
          <List.Item
            title="Team Comparisons"
            description="Allow anonymous comparison with team metrics"
            right={() => (
              <Switch
                value={privacy.teamComparisons || false}
                onValueChange={(value) => 
                  dispatch(updatePrivacySettings({teamComparisons: value}))
                }
              />
            )}
          />
        </List.Section>
      </Card>

      {/* Data Management */}
      <Card style={styles.card}>
        <List.Section>
          <List.Subheader>Data Management</List.Subheader>
          
          <List.Item
            title="Data Retention Period"
            description="Data is automatically deleted after 2 years"
            left={props => <List.Icon {...props} icon="clock" />}
          />
          
          <List.Item
            title="Export My Data"
            description="Download all your personal data"
            left={props => <List.Icon {...props} icon="download" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleDataExport}
          />
          
          <Divider />
          
          <List.Item
            title="Delete All Data"
            description="Permanently delete all your data"
            left={props => <List.Icon {...props} icon="delete" color={theme.colors.error} />}
            titleStyle={{color: theme.colors.error}}
            onPress={handleDataDeletion}
          />
        </List.Section>
      </Card>

      {/* Privacy Information */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.infoTitle}>Your Privacy Matters</Text>
          <Text style={styles.infoText}>
            We are committed to protecting your privacy. All data is encrypted in transit and at rest. 
            You have full control over what data is collected and how it's used.
          </Text>
          <Text style={styles.infoText}>
            Individual contributions are anonymized in team metrics, and you can opt out of any 
            data collection at any time.
          </Text>
        </Card.Content>
      </Card>

      <View style={styles.footer}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          Back to Profile
        </Button>
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
  infoTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
    opacity: 0.8,
  },
  footer: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  backButton: {
    minWidth: 200,
  },
});