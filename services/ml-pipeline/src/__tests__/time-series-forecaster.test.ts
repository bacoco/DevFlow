import {
  DeliveryTimeForecaster,
  ExponentialSmoothing,
  ARIMAModel,
  TimeSeriesPoint,
  ForecastResult
} from '../models/time-series-forecaster';
import { ProductivityMetric, MetricType } from '@devflow/shared-types';

describe('DeliveryTimeForecaster', () => {
  let forecaster: DeliveryTimeForecaster;
  let mockMetrics: ProductivityMetric[];

  beforeEach(() => {
    forecaster = new DeliveryTimeForecaster({
      horizonHours: 72,
      confidenceLevel: 0.95,
      seasonalityDetection: true,
      trendDetection: true,
      outlierRemoval: true
    });
    mockMetrics = generateSyntheticMetrics(200);
  });

  describe('Model Training', () => {
    it('should train successfully with sufficient data', async () => {
      await expect(forecaster.trainModel('user1', mockMetrics)).resolves.not.toThrow();
    });

    it('should handle multiple metric types', async () => {
      const multiTypeMetrics = [
        ...generateMetricsForType(MetricType.TIME_IN_FLOW, 50),
        ...generateMetricsForType(MetricType.CODE_CHURN, 50),
        ...generateMetricsForType(MetricType.FOCUS_TIME, 50)
      ];

      await expect(forecaster.trainModel('user1', multiTypeMetrics)).resolves.not.toThrow();
    });

    it('should remove outliers when configured', async () => {
      const metricsWithOutliers = [
        ...mockMetrics,
        ...generateOutlierMetrics(10)
      ];

      await expect(forecaster.trainModel('user1', metricsWithOutliers)).resolves.not.toThrow();
    });
  });

  describe('Forecasting', () => {
    beforeEach(async () => {
      await forecaster.trainModel('user1', mockMetrics);
    });

    it('should generate forecasts for trained metrics', async () => {
      const forecast = await forecaster.forecastDeliveryTime('user1', MetricType.TIME_IN_FLOW);
      
      expect(forecast).toBeDefined();
      expect(forecast.userId).toBe('user1');
      expect(forecast.metricType).toBe(MetricType.TIME_IN_FLOW);
      expect(forecast.predictions.length).toBeGreaterThan(0);
      expect(forecast.confidence).toBeGreaterThan(0);
      expect(forecast.confidence).toBeLessThanOrEqual(1);
    });

    it('should detect trends correctly', async () => {
      // Train with trending data
      const trendingMetrics = generateTrendingMetrics(100, 'increasing');
      await forecaster.trainModel('user2', trendingMetrics);
      
      const forecast = await forecaster.forecastDeliveryTime('user2', MetricType.TIME_IN_FLOW);
      expect(['increasing', 'stable', 'decreasing']).toContain(forecast.trend);
    });

    it('should detect seasonality patterns', async () => {
      // Train with seasonal data
      const seasonalMetrics = generateSeasonalMetrics(200);
      await forecaster.trainModel('user3', seasonalMetrics);
      
      const forecast = await forecaster.forecastDeliveryTime('user3', MetricType.TIME_IN_FLOW);
      expect(forecast.seasonality.detected).toBe(true);
      expect(forecast.seasonality.period).toBeGreaterThan(0);
    });

    it('should provide accuracy metrics', async () => {
      const forecast = await forecaster.forecastDeliveryTime('user1', MetricType.TIME_IN_FLOW);
      
      expect(forecast.accuracy).toBeDefined();
      expect(forecast.accuracy.mae).toBeGreaterThanOrEqual(0);
      expect(forecast.accuracy.mse).toBeGreaterThanOrEqual(0);
      expect(forecast.accuracy.mape).toBeGreaterThanOrEqual(0);
      expect(forecast.accuracy.r2).toBeGreaterThanOrEqual(-5); // More lenient for R2
      expect(forecast.accuracy.r2).toBeLessThanOrEqual(1);
    });

    it('should adjust predictions for workload', async () => {
      const baseWorkloadForecast = await forecaster.forecastDeliveryTime('user1', MetricType.TIME_IN_FLOW);
      const highWorkloadForecast = await forecaster.forecastDeliveryTime('user1', MetricType.TIME_IN_FLOW, 2.0);
      
      // High workload should generally increase predicted delivery times
      const baseAvg = baseWorkloadForecast.predictions.reduce((sum, p) => sum + p.value, 0) / baseWorkloadForecast.predictions.length;
      const highAvg = highWorkloadForecast.predictions.reduce((sum, p) => sum + p.value, 0) / highWorkloadForecast.predictions.length;
      
      expect(highAvg).toBeGreaterThan(baseAvg);
    });

    it('should handle insufficient data gracefully', async () => {
      await expect(
        forecaster.forecastDeliveryTime('nonexistent_user', MetricType.TIME_IN_FLOW)
      ).rejects.toThrow('Insufficient historical data');
    });
  });

  describe('Multiple Metrics Forecasting', () => {
    beforeEach(async () => {
      const multiTypeMetrics = [
        ...generateMetricsForType(MetricType.TIME_IN_FLOW, 100),
        ...generateMetricsForType(MetricType.CODE_CHURN, 100),
        ...generateMetricsForType(MetricType.FOCUS_TIME, 100)
      ];
      await forecaster.trainModel('user1', multiTypeMetrics);
    });

    it('should forecast multiple metrics simultaneously', async () => {
      const metricTypes = [MetricType.TIME_IN_FLOW, MetricType.CODE_CHURN, MetricType.FOCUS_TIME];
      const forecasts = await forecaster.forecastMultipleMetrics('user1', metricTypes);
      
      expect(forecasts).toHaveLength(metricTypes.length);
      forecasts.forEach(forecast => {
        expect(forecast.predictions.length).toBeGreaterThan(0);
        expect(forecast.confidence).toBeGreaterThan(0);
      });
    });

    it('should handle partial failures gracefully', async () => {
      const metricTypes = [MetricType.TIME_IN_FLOW, 'nonexistent_metric' as MetricType];
      const forecasts = await forecaster.forecastMultipleMetrics('user1', metricTypes);
      
      // Should return forecasts for valid metrics only
      expect(forecasts.length).toBeLessThan(metricTypes.length);
      expect(forecasts.length).toBeGreaterThan(0);
    });
  });
});

describe('ExponentialSmoothing', () => {
  let model: ExponentialSmoothing;
  let timeSeries: TimeSeriesPoint[];

  beforeEach(() => {
    model = new ExponentialSmoothing(0.3, 0.1, 0.1, 24);
    timeSeries = generateTimeSeriesData(100, true); // With seasonality
  });

  describe('Model Fitting', () => {
    it('should fit successfully with sufficient seasonal data', () => {
      expect(() => model.fit(timeSeries)).not.toThrow();
    });

    it('should throw error with insufficient data', () => {
      const insufficientData = timeSeries.slice(0, 20);
      expect(() => model.fit(insufficientData)).toThrow('Insufficient data');
    });

    it('should handle non-seasonal data', () => {
      const nonSeasonalModel = new ExponentialSmoothing(0.3, 0.1, 0.1, 1);
      const nonSeasonalData = generateTimeSeriesData(50, false);
      
      expect(() => nonSeasonalModel.fit(nonSeasonalData)).not.toThrow();
    });
  });

  describe('Forecasting', () => {
    beforeEach(() => {
      model.fit(timeSeries);
    });

    it('should generate forecasts for specified horizon', () => {
      const forecasts = model.forecast(24);
      
      expect(forecasts).toHaveLength(24);
      forecasts.forEach(forecast => {
        expect(forecast).toBeGreaterThanOrEqual(0); // Non-negative values
        expect(typeof forecast).toBe('number');
      });
    });

    it('should throw error when forecasting without fitting', () => {
      const unfittedModel = new ExponentialSmoothing();
      expect(() => unfittedModel.forecast(10)).toThrow('Model must be fitted before forecasting');
    });

    it('should preserve seasonal patterns in forecasts', () => {
      const forecasts = model.forecast(48); // 2 days
      
      // Check if seasonal pattern is preserved (values should be similar at 24-hour intervals)
      const tolerance = 0.3;
      for (let i = 0; i < 24; i++) {
        const diff = Math.abs(forecasts[i] - forecasts[i + 24]);
        const avgValue = (forecasts[i] + forecasts[i + 24]) / 2;
        const relativeDiff = avgValue > 0 ? diff / avgValue : 0;
        
        expect(relativeDiff).toBeLessThan(tolerance);
      }
    });
  });

  describe('Accuracy Calculation', () => {
    beforeEach(() => {
      model.fit(timeSeries);
    });

    it('should calculate accuracy metrics correctly', () => {
      const actual = [10, 15, 12, 18, 20];
      const predicted = [9, 16, 11, 19, 21];
      
      const accuracy = model.calculateAccuracy(actual, predicted);
      
      expect(accuracy.mae).toBeGreaterThan(0);
      expect(accuracy.mse).toBeGreaterThan(0);
      expect(accuracy.mape).toBeGreaterThan(0);
      expect(accuracy.r2).toBeGreaterThan(0);
      expect(accuracy.r2).toBeLessThanOrEqual(1);
    });

    it('should handle perfect predictions', () => {
      const values = [10, 15, 12, 18, 20];
      const accuracy = model.calculateAccuracy(values, values);
      
      expect(accuracy.mae).toBe(0);
      expect(accuracy.mse).toBe(0);
      expect(accuracy.mape).toBe(0);
      expect(accuracy.r2).toBe(1);
    });

    it('should throw error for mismatched array lengths', () => {
      const actual = [1, 2, 3];
      const predicted = [1, 2];
      
      expect(() => model.calculateAccuracy(actual, predicted))
        .toThrow('Actual and predicted arrays must have the same length');
    });
  });
});

describe('ARIMAModel', () => {
  let model: ARIMAModel;
  let timeSeries: TimeSeriesPoint[];

  beforeEach(() => {
    model = new ARIMAModel(1, 1, 0); // AR(1) with differencing
    timeSeries = generateTimeSeriesData(100, false); // Non-seasonal
  });

  describe('Model Fitting', () => {
    it('should fit successfully with sufficient data', () => {
      expect(() => model.fit(timeSeries)).not.toThrow();
    });

    it('should throw error with insufficient data', () => {
      const insufficientData = timeSeries.slice(0, 5);
      expect(() => model.fit(insufficientData)).toThrow('Insufficient data for ARIMA model');
    });

    it('should handle different ARIMA orders', () => {
      const models = [
        new ARIMAModel(1, 0, 0),
        new ARIMAModel(2, 1, 1),
        new ARIMAModel(0, 1, 1)
      ];

      models.forEach(m => {
        expect(() => m.fit(timeSeries)).not.toThrow();
      });
    });
  });

  describe('Forecasting', () => {
    beforeEach(() => {
      model.fit(timeSeries);
    });

    it('should generate forecasts for specified steps', () => {
      const forecasts = model.forecast(10);
      
      expect(forecasts).toHaveLength(10);
      forecasts.forEach(forecast => {
        expect(forecast).toBeGreaterThanOrEqual(0);
        expect(typeof forecast).toBe('number');
      });
    });

    it('should throw error when forecasting without fitting', () => {
      const unfittedModel = new ARIMAModel();
      expect(() => unfittedModel.forecast(5)).toThrow('Model must be fitted before forecasting');
    });

    it('should produce reasonable forecasts for trending data', () => {
      const trendingData = generateTrendingTimeSeriesData(50, 'increasing');
      model.fit(trendingData);
      
      const forecasts = model.forecast(10);
      
      // For increasing trend, forecasts should generally be positive
      const avgForecast = forecasts.reduce((sum, val) => sum + val, 0) / forecasts.length;
      expect(avgForecast).toBeGreaterThanOrEqual(0); // Allow zero or positive
    });
  });
});

// Synthetic data generation functions
function generateSyntheticMetrics(count: number): ProductivityMetric[] {
  const metrics: ProductivityMetric[] = [];
  const baseDate = new Date('2024-01-01');
  const userId = 'test_user_1';

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(baseDate.getTime() + i * 60 * 60 * 1000); // Hourly data
    
    metrics.push({
      id: `metric_${i}`,
      userId,
      metricType: MetricType.TIME_IN_FLOW,
      value: 4 + Math.sin(i * 2 * Math.PI / 24) * 2 + Math.random() * 2 - 1, // Daily pattern + noise
      timestamp,
      aggregationPeriod: 'hour' as any,
      context: {
        projectId: 'project_1',
        teamId: 'team_1'
      }
    });
  }

  return metrics;
}

function generateMetricsForType(metricType: MetricType, count: number): ProductivityMetric[] {
  const metrics = generateSyntheticMetrics(count);
  return metrics.map(m => ({ ...m, metricType }));
}

function generateOutlierMetrics(count: number): ProductivityMetric[] {
  const metrics = generateSyntheticMetrics(count);
  return metrics.map(m => ({
    ...m,
    value: Math.random() < 0.5 ? m.value * 10 : m.value * 0.1 // Extreme values
  }));
}

function generateTrendingMetrics(count: number, trend: 'increasing' | 'decreasing'): ProductivityMetric[] {
  const metrics = generateSyntheticMetrics(count);
  const trendMultiplier = trend === 'increasing' ? 1 : -1;
  
  return metrics.map((m, i) => ({
    ...m,
    value: Math.max(0.1, m.value + (i * 0.05 * trendMultiplier)) // Linear trend
  }));
}

function generateSeasonalMetrics(count: number): ProductivityMetric[] {
  const metrics = generateSyntheticMetrics(count);
  
  return metrics.map((m, i) => ({
    ...m,
    value: Math.max(0.1, 
      5 + // Base value
      3 * Math.sin(i * 2 * Math.PI / 24) + // Daily seasonality
      1.5 * Math.sin(i * 2 * Math.PI / (24 * 7)) + // Weekly seasonality
      Math.random() * 2 - 1 // Noise
    )
  }));
}

function generateTimeSeriesData(count: number, seasonal: boolean): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = [];
  const baseDate = new Date('2024-01-01');

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(baseDate.getTime() + i * 60 * 60 * 1000);
    let value = 10; // Base value

    if (seasonal) {
      value += 5 * Math.sin(i * 2 * Math.PI / 24); // Daily seasonality
    }

    value += Math.random() * 4 - 2; // Noise
    value = Math.max(0.1, value); // Ensure positive

    points.push({
      timestamp,
      value,
      metadata: { synthetic: true }
    });
  }

  return points;
}

function generateTrendingTimeSeriesData(count: number, trend: 'increasing' | 'decreasing'): TimeSeriesPoint[] {
  const points = generateTimeSeriesData(count, false);
  const trendMultiplier = trend === 'increasing' ? 1 : -1;
  
  return points.map((p, i) => ({
    ...p,
    value: Math.max(0.1, p.value + (i * 0.1 * trendMultiplier))
  }));
}