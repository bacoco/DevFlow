import React, {useEffect} from 'react';
import {View, StyleSheet, FlatList, RefreshControl} from 'react-native';
import {Text, Card, Chip, IconButton, Badge} from 'react-native-paper';
import {useDispatch, useSelector} from 'react-redux';

import {AppDispatch, RootState} from '@/store';
import {fetchAlerts, markAsRead, dismissAlert} from '@/store/slices/alertsSlice';
import {Alert} from '@/store/slices/alertsSlice';
import {theme} from '@/theme';

export const AlertsScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {alerts, unreadCount, isLoading, error} = useSelector(
    (state: RootState) => state.alerts
  );

  useEffect(() => {
    dispatch(fetchAlerts());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchAlerts());
  };

  const handleMarkAsRead = (alertId: string) => {
    dispatch(markAsRead(alertId));
  };

  const handleDismiss = (alertId: string) => {
    dispatch(dismissAlert(alertId));
  };

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return theme.colors.error;
      case 'high':
        return '#FF5722';
      case 'medium':
        return theme.colors.warning;
      case 'low':
        return theme.colors.info;
      default:
        return theme.colors.disabled;
    }
  };

  const getCategoryIcon = (category: Alert['category']) => {
    switch (category) {
      case 'productivity':
        return 'trending-up';
      case 'quality':
        return 'code-tags';
      case 'security':
        return 'shield-alert';
      case 'system':
        return 'server';
      default:
        return 'information';
    }
  };

  const renderAlert = ({item}: {item: Alert}) => (
    <Card
      style={[
        styles.alertCard,
        !item.isRead && styles.unreadAlert,
      ]}
      onPress={() => !item.isRead && handleMarkAsRead(item.id)}>
      <Card.Content>
        <View style={styles.alertHeader}>
          <View style={styles.alertInfo}>
            <View style={styles.alertTitleRow}>
              <Text style={styles.alertTitle} numberOfLines={1}>
                {item.title}
              </Text>
              {!item.isRead && <Badge size={8} style={styles.unreadBadge} />}
            </View>
            <View style={styles.alertMeta}>
              <Chip
                icon={getCategoryIcon(item.category)}
                style={[
                  styles.severityChip,
                  {backgroundColor: getSeverityColor(item.severity)},
                ]}
                textStyle={styles.chipText}
                compact>
                {item.severity.toUpperCase()}
              </Chip>
              <Text style={styles.timestamp}>
                {formatTimestamp(item.timestamp)}
              </Text>
            </View>
          </View>
          <IconButton
            icon="close"
            size={20}
            onPress={() => handleDismiss(item.id)}
            style={styles.dismissButton}
          />
        </View>

        <Text style={styles.alertMessage} numberOfLines={3}>
          {item.message}
        </Text>

        {item.actions && item.actions.length > 0 && (
          <View style={styles.actionsContainer}>
            {item.actions.map((action) => (
              <Chip
                key={action.id}
                mode={action.type === 'primary' ? 'flat' : 'outlined'}
                onPress={() => {
                  // TODO: Handle action execution
                }}
                style={styles.actionChip}>
                {action.label}
              </Chip>
            ))}
          </View>
        )}
      </Card.Content>
    </Card>
  );

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load alerts</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Alerts</Text>
        {unreadCount > 0 && (
          <Badge style={styles.headerBadge}>{unreadCount}</Badge>
        )}
      </View>

      <FlatList
        data={alerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item.id}
        style={styles.alertsList}
        contentContainerStyle={styles.alertsListContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No alerts</Text>
              <Text style={styles.emptyStateSubtext}>
                You're all caught up! New alerts will appear here.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    elevation: 2,
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.text,
    flex: 1,
  },
  headerBadge: {
    backgroundColor: theme.colors.error,
  },
  alertsList: {
    flex: 1,
  },
  alertsListContent: {
    padding: theme.spacing.md,
  },
  alertCard: {
    marginBottom: theme.spacing.md,
    elevation: 2,
  },
  unreadAlert: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  alertInfo: {
    flex: 1,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  alertTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.text,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
  alertMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  severityChip: {
    marginRight: theme.spacing.sm,
  },
  chipText: {
    color: theme.colors.surface,
    fontSize: 10,
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text,
    opacity: 0.6,
  },
  dismissButton: {
    margin: 0,
  },
  alertMessage: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.sm,
  },
  actionChip: {
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  errorText: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  errorSubtext: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
    textAlign: 'center',
    opacity: 0.7,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    marginTop: theme.spacing.xl,
  },
  emptyStateText: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
    textAlign: 'center',
    opacity: 0.7,
  },
});