import React, {useEffect, useCallback} from 'react';
import {View, StyleSheet, ScrollView, RefreshControl} from 'react-native';
import {Text, Card, FAB} from 'react-native-paper';
import {useDispatch, useSelector} from 'react-redux';

import {AppDispatch, RootState} from '@/store';
import {fetchDashboard, refreshDashboard} from '@/store/slices/dashboardSlice';
import {theme} from '@/theme';
import {MetricCard} from '@/components/MetricCard';
import {ChartWidget} from '@/components/ChartWidget';

export const DashboardScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {data, isLoading, refreshing, error} = useSelector((state: RootState) => state.dashboard);
  const {user} = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(fetchDashboard());
  }, [dispatch]);

  const handleRefresh = useCallback(() => {
    dispatch(refreshDashboard());
  }, [dispatch]);

  const renderWidget = (widget: any) => {
    switch (widget.type) {
      case 'metric':
        return (
          <MetricCard
            key={widget.id}
            title={widget.title}
            value={widget.data.value}
            unit={widget.data.unit}
            trend={widget.data.trend}
            change={widget.data.change}
          />
        );
      case 'chart':
        return (
          <ChartWidget
            key={widget.id}
            title={widget.title}
            data={widget.data}
            config={widget.config}
          />
        );
      default:
        return (
          <Card key={widget.id} style={styles.card}>
            <Card.Content>
              <Text>{widget.title}</Text>
            </Card.Content>
          </Card>
        );
    }
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load dashboard</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }>
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Good {getTimeOfDayGreeting()}, {user?.name || 'Developer'}!
          </Text>
          <Text style={styles.subtitle}>Here's your productivity overview</Text>
        </View>

        <View style={styles.widgetsContainer}>
          {data?.widgets.map(renderWidget)}
        </View>

        {(!data || data.widgets.length === 0) && !isLoading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No widgets configured</Text>
            <Text style={styles.emptyStateSubtext}>
              Add widgets to customize your dashboard
            </Text>
          </View>
        )}
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => {
          // TODO: Navigate to widget configuration
        }}
      />
    </View>
  );
};

const getTimeOfDayGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  greeting: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
    opacity: 0.7,
  },
  widgetsContainer: {
    padding: theme.spacing.md,
    paddingTop: 0,
  },
  card: {
    marginBottom: theme.spacing.md,
    elevation: 2,
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
  fab: {
    position: 'absolute',
    margin: theme.spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
});