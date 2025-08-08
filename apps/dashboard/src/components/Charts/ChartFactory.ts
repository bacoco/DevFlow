import { ChartData, ChartType, ChartConfig, ChartSuggestion, ChartInstance } from './types';
import { LineChart } from './implementations/LineChart';
import { BarChart } from './implementations/BarChart';
import { ScatterChart } from './implementations/ScatterChart';
import { AreaChart } from './implementations/AreaChart';
import { HeatmapChart } from './implementations/HeatmapChart';

export class ChartFactory {
  private static instance: ChartFactory;
  private chartImplementations: Map<ChartType, any> = new Map();

  private constructor() {
    this.registerChartTypes();
  }

  public static getInstance(): ChartFactory {
    if (!ChartFactory.instance) {
      ChartFactory.instance = new ChartFactory();
    }
    return ChartFactory.instance;
  }

  private registerChartTypes(): void {
    this.chartImplementations.set('line', LineChart);
    this.chartImplementations.set('bar', BarChart);
    this.chartImplementations.set('scatter', ScatterChart);
    this.chartImplementations.set('area', AreaChart);
    this.chartImplementations.set('heatmap', HeatmapChart);
  }

  /**
   * Analyzes data characteristics and suggests optimal chart types
   */
  public suggestChartType(data: ChartData): ChartSuggestion[] {
    const suggestions: ChartSuggestion[] = [];
    const dataSize = data.values.length;
    const hasCategories = data.values.some(d => d.category);
    const xType = data.dimensions.x.type;
    const uniqueXValues = new Set(data.values.map(d => d.x)).size;
    const yVariance = this.calculateVariance(data.values.map(d => d.y));

    // Line chart suggestions
    if (xType === 'temporal' || (xType === 'numeric' && uniqueXValues > 10)) {
      suggestions.push({
        type: 'line',
        confidence: 0.9,
        reasoning: 'Temporal or continuous numeric data is ideal for line charts',
        suitability: {
          dataSize: Math.min(dataSize / 1000, 1),
          complexity: 0.3,
          readability: 0.9
        }
      });
    }

    // Bar chart suggestions
    if (xType === 'categorical' || uniqueXValues <= 20) {
      suggestions.push({
        type: 'bar',
        confidence: 0.8,
        reasoning: 'Categorical data or limited discrete values work well with bar charts',
        suitability: {
          dataSize: Math.min(20 / uniqueXValues, 1),
          complexity: 0.2,
          readability: 0.95
        }
      });
    }

    // Scatter plot suggestions
    if (xType === 'numeric' && yVariance > 0.1) {
      suggestions.push({
        type: 'scatter',
        confidence: 0.7,
        reasoning: 'Numeric data with high variance shows relationships well in scatter plots',
        suitability: {
          dataSize: Math.min(dataSize / 500, 1),
          complexity: 0.4,
          readability: 0.7
        }
      });
    }

    // Area chart suggestions
    if (xType === 'temporal' && hasCategories) {
      suggestions.push({
        type: 'area',
        confidence: 0.75,
        reasoning: 'Temporal data with categories shows composition over time',
        suitability: {
          dataSize: Math.min(dataSize / 800, 1),
          complexity: 0.5,
          readability: 0.8
        }
      });
    }

    // Heatmap suggestions
    if (hasCategories && uniqueXValues > 5) {
      suggestions.push({
        type: 'heatmap',
        confidence: 0.6,
        reasoning: 'Multiple categories and dimensions work well in heatmaps',
        suitability: {
          dataSize: Math.min(dataSize / 200, 1),
          complexity: 0.7,
          readability: 0.6
        }
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Creates a chart instance with the specified configuration
   */
  public createChart(data: ChartData, config: ChartConfig): ChartInstance {
    const ChartImplementation = this.chartImplementations.get(config.type);
    
    if (!ChartImplementation) {
      throw new Error(`Chart type "${config.type}" is not supported`);
    }

    return new ChartImplementation(data, config);
  }

  /**
   * Optimizes chart configuration for mobile devices
   */
  public optimizeForMobile(chart: ChartInstance): ChartInstance {
    const mobileConfig: Partial<ChartConfig> = {
      width: Math.min(chart.config.width || 400, 350),
      height: Math.min(chart.config.height || 300, 250),
      interactions: {
        ...chart.config.interactions,
        zoom: true, // Enable touch zoom
        pan: true,  // Enable touch pan
        tooltip: true // Simplified tooltips
      }
    };

    return this.createChart(chart.data, { ...chart.config, ...mobileConfig });
  }

  /**
   * Adds interactive capabilities to an existing chart
   */
  public addInteractivity(chart: ChartInstance, interactions: string[]): ChartInstance {
    const interactiveConfig: Partial<ChartConfig> = {
      interactions: {
        ...chart.config.interactions,
        zoom: interactions.includes('zoom'),
        pan: interactions.includes('pan'),
        brush: interactions.includes('brush'),
        tooltip: interactions.includes('tooltip'),
        drillDown: interactions.includes('drillDown')
      }
    };

    return this.createChart(chart.data, { ...chart.config, ...interactiveConfig });
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }
}

export const chartFactory = ChartFactory.getInstance();