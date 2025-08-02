import React from 'react';
import {View, StyleSheet, ScrollView, Linking} from 'react-native';
import {Text, Card, List, Button, Divider} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';

import {theme} from '@/theme';

export const AboutScreen: React.FC = () => {
  const navigation = useNavigation();

  const handleOpenWebsite = () => {
    Linking.openURL('https://devflow.ai');
  };

  const handleOpenPrivacyPolicy = () => {
    Linking.openURL('https://devflow.ai/privacy');
  };

  const handleOpenTerms = () => {
    Linking.openURL('https://devflow.ai/terms');
  };

  const handleOpenLicenses = () => {
    // TODO: Navigate to licenses screen
    console.log('Open licenses screen');
  };

  return (
    <ScrollView style={styles.container}>
      {/* App Information */}
      <Card style={styles.card}>
        <Card.Content style={styles.appInfo}>
          <Text style={styles.appName}>DevFlow Intelligence</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
          <Text style={styles.buildNumber}>Build 2025.01.30</Text>
          <Text style={styles.description}>
            AI-powered developer productivity dashboard that helps teams optimize their 
            development workflows and improve code quality.
          </Text>
        </Card.Content>
      </Card>

      {/* Company Information */}
      <Card style={styles.card}>
        <List.Section>
          <List.Subheader>Company</List.Subheader>
          
          <List.Item
            title="DevFlow Technologies"
            description="Visit our website"
            left={props => <List.Icon {...props} icon="web" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleOpenWebsite}
          />
          
          <List.Item
            title="Privacy Policy"
            description="How we handle your data"
            left={props => <List.Icon {...props} icon="shield-check" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleOpenPrivacyPolicy}
          />
          
          <List.Item
            title="Terms of Service"
            description="Terms and conditions"
            left={props => <List.Icon {...props} icon="file-document" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleOpenTerms}
          />
          
          <List.Item
            title="Open Source Licenses"
            description="Third-party software licenses"
            left={props => <List.Icon {...props} icon="code-tags" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleOpenLicenses}
          />
        </List.Section>
      </Card>

      {/* Technical Information */}
      <Card style={styles.card}>
        <List.Section>
          <List.Subheader>Technical Information</List.Subheader>
          
          <List.Item
            title="React Native"
            description="0.72.6"
            left={props => <List.Icon {...props} icon="react" />}
          />
          
          <List.Item
            title="Platform"
            description="iOS & Android"
            left={props => <List.Icon {...props} icon="cellphone" />}
          />
        </List.Section>
      </Card>

      <View style={styles.footer}>
        <Text style={styles.copyright}>
          © 2025 DevFlow Technologies. All rights reserved.
        </Text>
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
  appInfo: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  appName: {
    fontSize: theme.typography.h1.fontSize,
    fontWeight: theme.typography.h1.fontWeight,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  version: {
    fontSize: theme.typography.h3.fontSize,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  buildNumber: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text,
    opacity: 0.6,
    marginBottom: theme.spacing.md,
  },
  description: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },
  footer: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  copyright: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  backButton: {
    minWidth: 200,
  },
});