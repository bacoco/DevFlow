import React, {useState} from 'react';
import {View, StyleSheet, ScrollView, FlatList} from 'react-native';
import {Text, Card, Switch, List, Button, Chip, Divider} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';

import {RootState, AppDispatch} from '@/store';
import {theme} from '@/theme';

interface WidgetType {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'productivity' | 'quality' | 'collaboration' | 'insights';
  enabled: boolean;
}

const availableWidgets: WidgetType[] = [
  {
    id: 'flow-time',
    name: 'Flow Time',
    description: 'Track your focused coding time',
    icon: 'timer',
    category: 'productivity',
    enabled: true,
  },
  {
    id: 'code-quality',
    name: 'Code Quality',
    description: 'Monitor code complexity and quality metrics',
    icon: 'code-tags',
    category: 'quality',
    enabled: true,
  },
  {
    id: 'commit-activity',
    name: 'Commit Activity',
    description: 'View your daily commit patterns',
    icon: 'source-commit',
    category: 'productivity',
    enabled: false,
  },
  {
    id: 'review-metrics',
    name: 'Review Metrics',
    description: 'Track code review participation',
    icon: 'account-group',
    category: 'collaboration',
    enabled: true,
  },
  {
    id: 'productivity-insights',
    name: 'AI Insights',
    description: 'Personalized productivity recommendations',
    icon: 'brain',
    category: 'insights',
    enabled: false,
  },
  {
    id: 'team-velocity',
    name: 'Team Velocity',
    description: 'Track team delivery speed',
    icon: 'speedometer',
    category: 'collaboration',
    enabled: true,
  },
];

export const WidgetConfigurationScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const [widgets, setWidgets] = useState<WidgetType[]>(availableWidgets);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    {id: 'all', label: 'All'},
    {id: 'productivity', label: 'Productivity'},
    {id: 'quality', label: 'Quality'},
    {id: 'collaboration', label: 'Collaboration'},
    {id: 'insights', label: 'Insights'},
  ];

  const handleWidgetToggle = (widgetId: string, enabled: boolean) => {
    setWidgets(prev => 
      prev.map(widget => 
        widget.id === widgetId ? {...widget, enabled} : widget
      )
    );
  };

  const handleSaveConfiguration = () => {
    // TODO: Save widget configuration to store
    const enabledWidgets = widgets.filter(w => w.enabled);
    console.log('Saving widget configuration:', enabledWidgets);
    navigation.goBack();
  };

  const filteredWidgets = selectedCategory === 'all' 
    ? widgets 
    : widgets.filter(w => w.category === selectedCategory);

  const renderWidget = ({item}: {item: WidgetType}) => (
    <Card style={styles.widgetCard}>
      <List.Item
        title={item.name}
        description={item.description}
        left={props => <List.Icon {...props} icon={item.icon} />}
        right={() => (
          <Switch
            value={item.enabled}
            onValueChange={(enabled) => handleWidgetToggle(item.id, enabled)}
          />
        )}
      />
    </Card>
  );

  const renderCategory = (category: {id: string; label: string}) => (
    <Chip
      key={category.id}
      selected={selectedCategory === category.id}
      onPress={() => setSelectedCategory(category.id)}
      style={[
        styles.categoryChip,
        selectedCategory === category.id && styles.selectedCategoryChip
      ]}>
      {category.label}
    </Chip>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Configure Widgets</Text>
          <Text style={styles.subtitle}>
            Choose which widgets to display on your dashboard
          </Text>
        </View>

        {/* Category Filter */}
        <View style={styles.categoriesContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContent}>
            {categories.map(renderCategory)}
          </ScrollView>
        </View>

        {/* Widget List */}
        <View style={styles.widgetsContainer}>
          <FlatList
            data={filteredWidgets}
            renderItem={renderWidget}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>

        {/* Summary */}
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.summaryTitle}>Summary</Text>
            <Text style={styles.summaryText}>
              {widgets.filter(w => w.enabled).length} of {widgets.length} widgets enabled
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}>
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleSaveConfiguration}
          style={styles.saveButton}>
          Save Configuration
        </Button>
      </View>
    </View>
  );
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
  title: {
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
  categoriesContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  categoriesContent: {
    paddingRight: theme.spacing.lg,
  },
  categoryChip: {
    marginRight: theme.spacing.sm,
  },
  selectedCategoryChip: {
    backgroundColor: theme.colors.primary,
  },
  widgetsContainer: {
    paddingHorizontal: theme.spacing.lg,
  },
  widgetCard: {
    elevation: 2,
  },
  separator: {
    height: theme.spacing.sm,
  },
  summaryCard: {
    margin: theme.spacing.lg,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  summaryText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
    opacity: 0.7,
  },
  actions: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});