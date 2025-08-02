import React from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import {Card, Text} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {theme} from '@/theme';

interface MetricCardProps {
  title: string;
  value: number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  change?: number;
  style?: ViewStyle;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit = '',
  trend = 'stable',
  change = 0,
  style,
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      default:
        return 'trending-flat';
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return theme.colors.success;
      case 'down':
        return theme.colors.error;
      default:
        return theme.colors.disabled;
    }
  };

  const formatValue = (val: number): string => {
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1)}M`;
    }
    if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}K`;
    }
    return val.toFixed(val % 1 === 0 ? 0 : 1);
  };

  const formatChange = (changeVal: number): string => {
    const sign = changeVal > 0 ? '+' : '';
    return `${sign}${changeVal.toFixed(1)}%`;
  };

  return (
    <Card style={[styles.card, style]}>
      <Card.Content style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        
        <View style={styles.valueContainer}>
          <Text style={styles.value}>
            {formatValue(value)}
            {unit && <Text style={styles.unit}>{unit}</Text>}
          </Text>
        </View>
        
        {trend !== 'stable' && (
          <View style={styles.trendContainer}>
            <Icon
              name={getTrendIcon()}
              size={16}
              color={getTrendColor()}
              style={styles.trendIcon}
            />
            <Text style={[styles.trendText, {color: getTrendColor()}]}>
              {formatChange(change)}
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    elevation: 2,
    backgroundColor: theme.colors.surface,
  },
  content: {
    paddingVertical: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text,
    opacity: 0.7,
    marginBottom: theme.spacing.xs,
    lineHeight: 16,
  },
  valueContainer: {
    marginBottom: theme.spacing.xs,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    lineHeight: 28,
  },
  unit: {
    fontSize: 16,
    fontWeight: 'normal',
    color: theme.colors.text,
    opacity: 0.6,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendIcon: {
    marginRight: theme.spacing.xs,
  },
  trendText: {
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '600',
  },
});