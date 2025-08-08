import { ChartData, ChartInstance, ChartAccessibilityInfo } from './types';

export class ChartAccessibility {
  /**
   * Generates comprehensive alternative text for charts
   */
  public static generateAltText(chart: ChartInstance): string {
    const { data, type } = chart;
    const dataCount = data.values.length;
    const xLabel = data.dimensions.x.label;
    const yLabel = data.dimensions.y.label;
    
    // Calculate basic statistics
    const yValues = data.values.map(d => d.y);
    const min = Math.min(...yValues);
    const max = Math.max(...yValues);
    const avg = yValues.reduce((sum, val) => sum + val, 0) / yValues.length;
    
    let altText = `${type} chart showing ${yLabel} by ${xLabel}. `;
    altText += `Contains ${dataCount} data points. `;
    altText += `${yLabel} ranges from ${min.toFixed(2)} to ${max.toFixed(2)}, `;
    altText += `with an average of ${avg.toFixed(2)}. `;
    
    // Add trend information
    const trend = this.calculateTrend(yValues);
    altText += `Overall trend is ${trend}. `;
    
    // Add notable patterns
    const patterns = this.identifyPatterns(data);
    if (patterns.length > 0) {
      altText += `Notable patterns: ${patterns.join(', ')}. `;
    }
    
    return altText.trim();
  }

  /**
   * Creates accessible data table representation
   */
  public static createDataTable(chart: ChartInstance): { headers: string[]; rows: string[][] } {
    const { data } = chart;
    const headers = [data.dimensions.x.label, data.dimensions.y.label];
    
    if (data.values.some(d => d.category)) {
      headers.push('Category');
    }
    
    const rows = data.values.map(point => {
      const row = [
        String(point.x),
        point.y.toString()
      ];
      
      if (point.category) {
        row.push(point.category);
      }
      
      return row;
    });
    
    return { headers, rows };
  }

  /**
   * Adds keyboard navigation support to charts
   */
  public static addKeyboardNavigation(chart: ChartInstance): void {
    const element = chart.element;
    
    // Make chart focusable
    element.setAttribute('tabindex', '0');
    element.setAttribute('role', 'img');
    element.setAttribute('aria-label', this.generateAltText(chart));
    
    // Add keyboard event listeners
    element.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'Enter':
        case ' ':
          this.announceChartSummary(chart);
          event.preventDefault();
          break;
        case 'ArrowRight':
          this.navigateToNextDataPoint(chart, 1);
          event.preventDefault();
          break;
        case 'ArrowLeft':
          this.navigateToNextDataPoint(chart, -1);
          event.preventDefault();
          break;
        case 'Home':
          this.navigateToDataPoint(chart, 0);
          event.preventDefault();
          break;
        case 'End':
          this.navigateToDataPoint(chart, chart.data.values.length - 1);
          event.preventDefault();
          break;
        case 'd':
          if (event.ctrlKey || event.metaKey) {
            this.announceDataTable(chart);
            event.preventDefault();
          }
          break;
      }
    });
  }

  /**
   * Announces data changes to screen readers
   */
  public static announceDataChanges(chart: ChartInstance, changes: any[]): void {
    const liveRegion = this.getOrCreateLiveRegion();
    
    let announcement = '';
    if (changes.length === 1) {
      announcement = `Chart updated: ${changes[0].description}`;
    } else {
      announcement = `Chart updated with ${changes.length} changes`;
    }
    
    liveRegion.textContent = announcement;
    
    // Clear after announcement
    setTimeout(() => {
      liveRegion.textContent = '';
    }, 1000);
  }

  /**
   * Creates comprehensive accessibility information
   */
  public static createAccessibilityInfo(chart: ChartInstance): ChartAccessibilityInfo {
    const altText = this.generateAltText(chart);
    const dataTable = this.createDataTable(chart);
    const summary = this.generateSummary(chart);
    const trends = this.identifyTrends(chart);
    
    return {
      altText,
      dataTable,
      summary,
      trends
    };
  }

  private static calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';
    
    let increases = 0;
    let decreases = 0;
    
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[i - 1]) increases++;
      else if (values[i] < values[i - 1]) decreases++;
    }
    
    const threshold = values.length * 0.6;
    if (increases > threshold) return 'increasing';
    if (decreases > threshold) return 'decreasing';
    return 'stable';
  }

  private static identifyPatterns(data: ChartData): string[] {
    const patterns: string[] = [];
    const yValues = data.values.map(d => d.y);
    
    if (yValues.length < 2) return patterns;
    
    // Check for outliers
    const mean = yValues.reduce((sum, val) => sum + val, 0) / yValues.length;
    const variance = yValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / yValues.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev > 0) {
      const outliers = yValues.filter(val => Math.abs(val - mean) > 2 * stdDev);
      if (outliers.length > 0) {
        patterns.push(`${outliers.length} outlier${outliers.length > 1 ? 's' : ''} detected`);
      }
    }
    
    // Check for seasonality (simplified)
    if (data.dimensions.x.type === 'temporal' && yValues.length > 12) {
      patterns.push('potential seasonal pattern');
    }
    
    return patterns;
  }

  private static generateSummary(chart: ChartInstance): string {
    const { data, type } = chart;
    const yValues = data.values.map(d => d.y);
    const min = Math.min(...yValues);
    const max = Math.max(...yValues);
    
    return `This ${type} chart displays ${data.values.length} data points. ` +
           `The highest value is ${max} and the lowest is ${min}.`;
  }

  private static identifyTrends(chart: ChartInstance): string[] {
    const trends: string[] = [];
    const yValues = chart.data.values.map(d => d.y);
    
    const overallTrend = this.calculateTrend(yValues);
    trends.push(`Overall trend: ${overallTrend}`);
    
    // Add more specific trend analysis
    const firstHalf = yValues.slice(0, Math.floor(yValues.length / 2));
    const secondHalf = yValues.slice(Math.floor(yValues.length / 2));
    
    if (firstHalf.length > 0 && secondHalf.length > 0) {
      const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
      
      if (secondAvg > firstAvg * 1.1) {
        trends.push('Strong increase in second half');
      } else if (secondAvg < firstAvg * 0.9) {
        trends.push('Strong decrease in second half');
      }
    }
    
    return trends;
  }

  private static announceChartSummary(chart: ChartInstance): void {
    const liveRegion = this.getOrCreateLiveRegion();
    liveRegion.textContent = this.generateSummary(chart);
  }

  private static navigateToNextDataPoint(chart: ChartInstance, direction: number): void {
    // Implementation would depend on the specific chart library
    // This is a placeholder for the navigation logic
    const liveRegion = this.getOrCreateLiveRegion();
    liveRegion.textContent = `Navigating to ${direction > 0 ? 'next' : 'previous'} data point`;
  }

  private static navigateToDataPoint(chart: ChartInstance, index: number): void {
    const dataPoint = chart.data.values[index];
    if (dataPoint) {
      const liveRegion = this.getOrCreateLiveRegion();
      liveRegion.textContent = `Data point ${index + 1}: ${dataPoint.x}, ${dataPoint.y}`;
    }
  }

  private static announceDataTable(chart: ChartInstance): void {
    const { headers, rows } = this.createDataTable(chart);
    const liveRegion = this.getOrCreateLiveRegion();
    
    let announcement = `Data table with ${headers.length} columns and ${rows.length} rows. `;
    announcement += `Columns: ${headers.join(', ')}`;
    
    liveRegion.textContent = announcement;
  }

  private static getOrCreateLiveRegion(): HTMLElement {
    let liveRegion = document.getElementById('chart-live-region');
    
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'chart-live-region';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      document.body.appendChild(liveRegion);
    }
    
    return liveRegion;
  }
}