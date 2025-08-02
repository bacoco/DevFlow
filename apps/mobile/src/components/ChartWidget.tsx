import React, {useState, useEffect} from 'react';
import {View, StyleSheet, Dimensions, ScrollView} from 'react-native';
import {Card, Text, IconButton, Menu} from 'react-native-paper';
import {LineChart, BarChart, PieChart} from 'react-native-chart-kit';
import {theme} from '@/theme';

interface ChartWidgetProps {
  title: string;
  data: any;
  config: {
    type: 'line' | 'bar' | 'pie';
    height?: number;
    showLegend?: boolean;
    showValues?: boolean;
    interactive?: boolean;
    zoomable?: boolean;
  };
}

const screenWidth = Dimensions.get('window').width;

export const ChartWidget: React.FC<ChartWidgetProps> = ({
  title,
  data,
  config,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [chartType, setChartType] = useState(config.type);
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const updateLayout = () => {
      const {width, height} = Dimensions.get('window');
      setIsLandscape(width > height);
    };

    const subscription = Dimensions.addEventListener('change', updateLayout);
    updateLayout();

    return () => subscription?.remove();
  }, []);

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity * 0.7})`,
    style: {
      borderRadius: theme.borderRadius.md,
    },
    propsForDots: {
      r: '3',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: theme.colors.disabled,
      strokeOpacity: 0.3,
    },
    fillShadowGradient: theme.colors.primary,
    fillShadowGradientOpacity: 0.1,
  };

  const getChartDimensions = () => {
    const padding = theme.spacing.lg * 2 + theme.spacing.md * 2;
    const width = screenWidth - padding;
    const height = config.height || (isLandscape ? 150 : 200);
    return {width, height};
  };

  const {width: chartWidth, height: chartHeight} = getChartDimensions();

  const renderChart = () => {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return (
        <View style={[styles.chart, {height: chartHeight}]}>
          <Text style={styles.errorText}>No data available</Text>
        </View>
      );
    }

    const chartProps = {
      data,
      width: chartWidth,
      height: chartHeight,
      chartConfig,
      style: styles.chart,
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart
            {...chartProps}
            bezier={!config.interactive} // Disable bezier for better performance on interactive charts
            withDots={!isLandscape} // Hide dots on landscape for cleaner look
            withShadow={false}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            withInnerLines={false}
            withOuterLines={false}
            onDataPointClick={config.interactive ? handleDataPointClick : undefined}
          />
        );
      
      case 'bar':
        return (
          <BarChart
            {...chartProps}
            showValuesOnTopOfBars={config.showValues && !isLandscape}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            fromZero={true}
          />
        );
      
      case 'pie':
        return (
          <PieChart
            {...chartProps}
            accessor="value"
            backgroundColor="transparent"
            paddingLeft="15"
            hasLegend={config.showLegend && !isLandscape}
            absolute={config.showValues}
          />
        );
      
      default:
        return (
          <View style={[styles.chart, {height: chartHeight}]}>
            <Text style={styles.errorText}>Unsupported chart type</Text>
          </View>
        );
    }
  };

  const handleDataPointClick = (data: any) => {
    console.log('Data point clicked:', data);
    // TODO: Show detailed view or tooltip
  };

  const handleChartTypeChange = (type: 'line' | 'bar' | 'pie') => {
    setChartType(type);
    setMenuVisible(false);
  };

  const ChartContent = () => (
    <View style={styles.chartContainer}>
      {config.zoomable ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {renderChart()}
        </ScrollView>
      ) : (
        renderChart()
      )}
    </View>
  );

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={isLandscape ? 1 : 2}>
            {title}
          </Text>
          
          {config.interactive && (
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  size={20}
                  onPress={() => setMenuVisible(true)}
                />
              }>
              <Menu.Item
                onPress={() => handleChartTypeChange('line')}
                title="Line Chart"
                leadingIcon="chart-line"
              />
              <Menu.Item
                onPress={() => handleChartTypeChange('bar')}
                title="Bar Chart"
                leadingIcon="chart-bar"
              />
              <Menu.Item
                onPress={() => handleChartTypeChange('pie')}
                title="Pie Chart"
                leadingIcon="chart-pie"
              />
            </Menu>
          )}
        </View>
        
        <ChartContent />
        
        {config.zoomable && (
          <Text style={styles.zoomHint}>
            Swipe horizontally to explore data
          </Text>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.md,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.text,
    flex: 1,
  },
  chartContainer: {
    alignItems: 'center',
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.sm,
  },
  chart: {
    borderRadius: theme.borderRadius.md,
    marginVertical: theme.spacing.xs,
  },
  errorText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
  zoomHint: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
});