import React, {useEffect, useState} from 'react';
import {View, StyleSheet, ScrollView, RefreshControl} from 'react-native';
import {Text, SegmentedButtons, Card} from 'react-native-paper';
import {useDispatch, useSelector} from 'react-redux';

import {AppDispatch, RootState} from '@/store';
import {fetchMetrics, setTimeRange} from '@/store/slices/metricsSlice';
import {theme} from '@/theme';
import {MetricCard} from '@/components/MetricCard';

export const MetricsScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {categories, selectedTimeRange, isLoading, refreshing, error} = useSelector(
    (state: RootState) => state.metrics
  );

  useEffect(() => {
    dispatch(fetchMetrics(selectedTimeRange));
  }, [dispatch, selectedTimeRange]);

  const handleTimeRangeChange = (value: string) => {
    dispatch(setTimeRange(value as '1h' | '24h' | '7d' | '30d'));
  };

  const handleRefresh = () => {
    dispatch(fetchMetrics(selectedTimeRange));
  };

  const timeRangeOptions = [
    {value: '1h', label: '1H'},
    {value: '24h', label: '24H'},
    {value: '7d', label: '7D'},
    {value: '30d', label: '30D'},
  ];

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load metrics</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Productivity Metrics</Text>
        <SegmentedButtons
          value={selectedTimeRange}
          onValueChange={handleTimeRangeChange}
          buttons={timeRangeOptions}
          style={styles.timeRangeSelector}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }>
        {categories.map((category) => (
          <View key={category.id} style={styles.categoryContainer}>
            <Text style={styles.categoryTitle}>{category.name}</Text>
            <View style={styles.metricsGrid}>
              {category.metrics.map((metric) => (
                <MetricCard
                  key={metric.id}
                  title={metric.name}
                  value={metric.value}
                  unit={metric.unit}
                  trend={metric.trend}
                  change={metric.change}
                  style={styles.metricCard}
                />
              ))}
            </View>
          </View>
        ))}

        {categories.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No metrics available</Text>
            <Text style={styles.emptyStateSubtext}>
              Metrics will appear here once data is collected
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    elevation: 2,
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  timeRangeSelector: {
    marginBottom: theme.spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  categoryContainer: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  categoryTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    marginBottom: theme.spacing.md,
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