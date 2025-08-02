import React from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Text, Card, Avatar, Button, List, Divider} from 'react-native-paper';
import {useSelector, useDispatch} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';

import {RootState, AppDispatch} from '@/store';
import {logout} from '@/store/slices/authSlice';
import {MainStackParamList} from '@/navigation/MainNavigator';
import {theme} from '@/theme';

type ProfileScreenNavigationProp = StackNavigationProp<MainStackParamList>;

export const ProfileScreen: React.FC = () => {
  const {user} = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<ProfileScreenNavigationProp>();

  const handleLogout = () => {
    dispatch(logout());
  };

  const navigateToSettings = () => {
    navigation.navigate('Settings');
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <Avatar.Text
            size={80}
            label={user?.name ? getInitials(user.name) : 'U'}
            style={styles.avatar}
          />
          <Text style={styles.name}>{user?.name || 'Unknown User'}</Text>
          <Text style={styles.email}>{user?.email || 'No email'}</Text>
          <Text style={styles.role}>{user?.role || 'Developer'}</Text>
        </Card.Content>
      </Card>

      <Card style={styles.menuCard}>
        <List.Section>
          <List.Subheader>Account</List.Subheader>
          
          <List.Item
            title="Settings"
            description="App preferences and configuration"
            left={props => <List.Icon {...props} icon="cog" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={navigateToSettings}
          />
          
          <List.Item
            title="Privacy Settings"
            description="Data collection and privacy controls"
            left={props => <List.Icon {...props} icon="shield-account" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              // TODO: Navigate to privacy settings
            }}
          />
          
          <Divider />
          
          <List.Subheader>Support</List.Subheader>
          
          <List.Item
            title="Help & Support"
            description="Get help and contact support"
            left={props => <List.Icon {...props} icon="help-circle" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              // TODO: Navigate to help
            }}
          />
          
          <List.Item
            title="About"
            description="App version and information"
            left={props => <List.Icon {...props} icon="information" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              // TODO: Navigate to about
            }}
          />
          
          <Divider />
          
          <List.Item
            title="Sign Out"
            description="Sign out of your account"
            left={props => <List.Icon {...props} icon="logout" color={theme.colors.error} />}
            titleStyle={{color: theme.colors.error}}
            onPress={handleLogout}
          />
        </List.Section>
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>DevFlow Intelligence v1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  profileCard: {
    margin: theme.spacing.lg,
    elevation: 4,
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  avatar: {
    backgroundColor: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  name: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  email: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
    opacity: 0.7,
    marginBottom: theme.spacing.xs,
  },
  role: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  menuCard: {
    margin: theme.spacing.lg,
    marginTop: 0,
    elevation: 2,
  },
  footer: {
    alignItems: 'center',
    padding: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  footerText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text,
    opacity: 0.5,
  },
});