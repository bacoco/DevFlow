import React from 'react';
import {View, StyleSheet, ScrollView, Linking} from 'react-native';
import {Text, Card, List, Button, Divider} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';

import {theme} from '@/theme';

export const HelpScreen: React.FC = () => {
  const navigation = useNavigation();

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@devflow.ai?subject=Mobile App Support');
  };

  const handleOpenDocs = () => {
    Linking.openURL('https://docs.devflow.ai');
  };

  const handleOpenFAQ = () => {
    Linking.openURL('https://devflow.ai/faq');
  };

  const handleReportBug = () => {
    Linking.openURL('https://github.com/devflow/mobile/issues/new');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Quick Help */}
      <Card style={styles.card}>
        <List.Section>
          <List.Subheader>Quick Help</List.Subheader>
          
          <List.Item
            title="Getting Started"
            description="Learn how to set up and use DevFlow Intelligence"
            left={props => <List.Icon {...props} icon="play-circle" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleOpenDocs}
          />
          
          <List.Item
            title="Frequently Asked Questions"
            description="Find answers to common questions"
            left={props => <List.Icon {...props} icon="help-circle" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleOpenFAQ}
          />
          
          <List.Item
            title="Documentation"
            description="Complete user guide and API documentation"
            left={props => <List.Icon {...props} icon="book-open" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleOpenDocs}
          />
        </List.Section>
      </Card>

      {/* Support */}
      <Card style={styles.card}>
        <List.Section>
          <List.Subheader>Support</List.Subheader>
          
          <List.Item
            title="Contact Support"
            description="Get help from our support team"
            left={props => <List.Icon {...props} icon="email" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleContactSupport}
          />
          
          <List.Item
            title="Report a Bug"
            description="Help us improve by reporting issues"
            left={props => <List.Icon {...props} icon="bug" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleReportBug}
          />
        </List.Section>
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
  footer: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  backButton: {
    minWidth: 200,
  },
});