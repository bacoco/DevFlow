import { FeatureVector } from '../types/ml-types';
import { ProductivityMetric } from '@devflow/shared-types';
// Simple statistics functions
const ss = {
  mean: (values: number[]): number => values.reduce((sum, val) => sum + val, 0) / values.length,
  median: (values: number[]): number => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  },
  quantile: (values: number[], p: number): number => {
    const sorted = [...values].sort((a, b) => a - b);
    const index = p * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  },
  standardDeviation: (values: number[]): number => {
    const mean = ss.mean(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  },
  linearRegression: (points: [number, number][]): { m: number; b: number } => {
    const n = points.length;
    const sumX = points.reduce((sum, [x]) => sum + x, 0);
    const sumY = points.reduce((sum, [, y]) => sum + y, 0);
    const sumXY = points.reduce((sum, [x, y]) => sum + x * y, 0);
    const sumXX = points.reduce((sum, [x]) => sum + x * x, 0);
    
    const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const b = (sumY - m * sumX) / n;
    
    return { m, b };
  },
  linearRegressionLine: (regression: { m: number; b: number }) => {
    return (x: number) => regression.m * x + regression.b;
  },
  sum: (values: number[]): number => values.reduce((sum, val) => sum + val, 0)
};

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface ForecastResult {
  userId: string;
  metricType: string;
  predictions: TimeSeriesPoint[];
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonality: SeasonalityInfo;
  accuracy: ModelAccuracy;
}

export interface SeasonalityInfo {
  detected: boolean;
  period: number; // in hours
  strength: number; // 0-1
  pattern: 'daily' | 'weekly' | 'monthly' | 'none';
}

export interface ModelAccuracy {
  mae: number; // Mean Absolute Error
  mse: number; // Mean Squared Error
  mape: number; // Mean Absolute Percentage Error
  r2: number; // R-squared
}

export interface ForecastConfig {
  horizonHours: number;
  confidenceLevel: number;
  seasonalityDetection: boolean;
  trendDetection: boolean;
  outlierRemoval: boolean;
}

export class ExponentialSmoothing {
  private alpha: number; // level smoothing parameter
  private beta: number; // trend smoothing parameter
  private gamma: number; // seasonal smoothing parameter
  private seasonLength: number;
  private level: number = 0;
  private trend: number = 0;
  private seasonal: number[] = [];
  private fitted: boolean = false;

  constructor(
    alpha: number = 0.3,
    beta: number = 0.1,
    gamma: number = 0.1,
    seasonLength: number = 24 // 24 hours for daily seasonality
  ) {
    this.alpha = Math.max(0.01, Math.min(0.99, alpha));
    this.beta = Math.max(0.01, Math.min(0.99, beta));
    this.gamma = Math.max(0.01, Math.min(0.99, gamma));
    this.seasonLength = seasonLength;
  }

  fit(data: TimeSeriesPoint[]): void {
    if (data.length < this.seasonLength * 2) {
      throw new Error(`Insufficient data. Need at least ${this.seasonLength * 2} points for seasonal model.`);
    }

    const values = data.map(d => d.value);
    
    // Initialize level (average of first season)
    this.level = ss.mean(values.slice(0, this.seasonLength));
    
    // Initialize trend (difference between first and second season averages)
    const firstSeasonMean = ss.mean(values.slice(0, this.seasonLength));
    const secondSeasonMean = ss.mean(values.slice(this.seasonLength, this.seasonLength * 2));
    this.trend = (secondSeasonMean - firstSeasonMean) / this.seasonLength;
    
    // Initialize seasonal components
    this.seasonal = new Array(this.seasonLength).fill(0);
    for (let i = 0; i < this.seasonLength; i++) {
      const seasonalValues: number[] = [];
      for (let j = i; j < values.length; j += this.seasonLength) {
        seasonalValues.push(values[j]);
      }
      this.seasonal[i] = ss.mean(seasonalValues) - this.level;
    }

    // Apply Holt-Winters algorithm
    for (let t = 0; t < values.length; t++) {
      const seasonalIndex = t % this.seasonLength;
      const observation = values[t];
      
      // Update level
      const prevLevel = this.level;
      this.level = this.alpha * (observation - this.seasonal[seasonalIndex]) + 
                   (1 - this.alpha) * (this.level + this.trend);
      
      // Update trend
      this.trend = this.beta * (this.level - prevLevel) + (1 - this.beta) * this.trend;
      
      // Update seasonal component
      this.seasonal[seasonalIndex] = this.gamma * (observation - this.level) + 
                                     (1 - this.gamma) * this.seasonal[seasonalIndex];
    }

    this.fitted = true;
  }

  forecast(steps: number): number[] {
    if (!this.fitted) {
      throw new Error('Model must be fitted before forecasting');
    }

    const forecasts: number[] = [];
    
    for (let h = 1; h <= steps; h++) {
      const seasonalIndex = (h - 1) % this.seasonLength;
      const forecast = this.level + h * this.trend + this.seasonal[seasonalIndex];
      forecasts.push(Math.max(0, forecast)); // Ensure non-negative values
    }

    return forecasts;
  }

  calculateAccuracy(actual: number[], predicted: number[]): ModelAccuracy {
    if (actual.length !== predicted.length) {
      throw new Error('Actual and predicted arrays must have the same length');
    }

    const n = actual.length;
    let mae = 0;
    let mse = 0;
    let mape = 0;

    for (let i = 0; i < n; i++) {
      const error = actual[i] - predicted[i];
      mae += Math.abs(error);
      mse += error * error;
      
      if (actual[i] !== 0) {
        mape += Math.abs(error / actual[i]);
      }
    }

    mae /= n;
    mse /= n;
    mape = (mape / n) * 100;

    // Calculate R-squared
    const actualMean = ss.mean(actual);
    let totalSumSquares = 0;
    let residualSumSquares = 0;

    for (let i = 0; i < n; i++) {
      totalSumSquares += Math.pow(actual[i] - actualMean, 2);
      residualSumSquares += Math.pow(actual[i] - predicted[i], 2);
    }

    const r2 = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;

    return { mae, mse, mape, r2 };
  }
}

export class ARIMAModel {
  private p: number; // autoregressive order
  private d: number; // differencing order
  private q: number; // moving average order
  private coefficients: number[] = [];
  private residuals: number[] = [];
  private fitted: boolean = false;

  constructor(p: number = 1, d: number = 1, q: number = 1) {
    this.p = p;
    this.d = d;
    this.q = q;
  }

  fit(data: TimeSeriesPoint[]): void {
    if (data.length < Math.max(this.p, this.q) + this.d + 10) {
      throw new Error('Insufficient data for ARIMA model');
    }

    let values = data.map(d => d.value);
    
    // Apply differencing
    for (let i = 0; i < this.d; i++) {
      values = this.difference(values);
    }

    // Simple AR(1) implementation for now
    if (this.p === 1 && this.q === 0) {
      this.coefficients = this.fitAR1(values);
    } else {
      // Fallback to simple moving average
      this.coefficients = [0.5];
    }

    this.fitted = true;
  }

  forecast(steps: number): number[] {
    if (!this.fitted) {
      throw new Error('Model must be fitted before forecasting');
    }

    const forecasts: number[] = [];
    
    // Simple AR(1) forecasting
    let lastValue = this.residuals.length > 0 ? 
      this.residuals[this.residuals.length - 1] : 0;

    for (let h = 0; h < steps; h++) {
      const forecast = this.coefficients[0] * lastValue;
      forecasts.push(Math.max(0, forecast));
      lastValue = forecast;
    }

    return forecasts;
  }

  private difference(values: number[]): number[] {
    const diff: number[] = [];
    for (let i = 1; i < values.length; i++) {
      diff.push(values[i] - values[i - 1]);
    }
    return diff;
  }

  private fitAR1(values: number[]): number[] {
    // Simple least squares estimation for AR(1)
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 1; i < values.length; i++) {
      sumXY += values[i - 1] * values[i];
      sumXX += values[i - 1] * values[i - 1];
    }

    const coefficient = sumXX > 0 ? sumXY / sumXX : 0;
    return [Math.max(-0.99, Math.min(0.99, coefficient))];
  }
}

export class DeliveryTimeForecaster {
  private exponentialSmoothing: ExponentialSmoothing;
  private arimaModel: ARIMAModel;
  private config: ForecastConfig;
  private historicalData: Map<string, TimeSeriesPoint[]> = new Map();

  constructor(config: Partial<ForecastConfig> = {}) {
    this.config = {
      horizonHours: config.horizonHours || 168, // 1 week
      confidenceLevel: config.confidenceLevel || 0.95,
      seasonalityDetection: config.seasonalityDetection ?? true,
      trendDetection: config.trendDetection ?? true,
      outlierRemoval: config.outlierRemoval ?? true
    };

    this.exponentialSmoothing = new ExponentialSmoothing();
    this.arimaModel = new ARIMAModel();
  }

  async trainModel(userId: string, metrics: ProductivityMetric[]): Promise<void> {
    // Group metrics by type
    const metricsByType = this.groupMetricsByType(metrics);

    for (const [metricType, metricData] of metricsByType.entries()) {
      const timeSeries = this.convertToTimeSeries(metricData);
      
      if (this.config.outlierRemoval) {
        this.removeOutliers(timeSeries);
      }

      this.historicalData.set(`${userId}:${metricType}`, timeSeries);
    }
  }

  async forecastDeliveryTime(
    userId: string, 
    metricType: string,
    currentWorkload?: number
  ): Promise<ForecastResult> {
    const key = `${userId}:${metricType}`;
    const historicalData = this.historicalData.get(key);

    if (!historicalData || historicalData.length < 24) {
      throw new Error('Insufficient historical data for forecasting');
    }

    // Detect seasonality
    const seasonality = this.detectSeasonality(historicalData);
    
    // Choose appropriate model based on data characteristics
    const model = seasonality.detected ? this.exponentialSmoothing : this.arimaModel;
    
    try {
      model.fit(historicalData);
      const predictions = model.forecast(this.config.horizonHours);
      
      // Convert predictions to time series points
      const forecastPoints = this.createForecastPoints(predictions, historicalData);
      
      // Calculate trend
      const trend = this.calculateTrend(historicalData);
      
      // Calculate model accuracy using cross-validation
      const accuracy = this.calculateModelAccuracy(model, historicalData);
      
      // Adjust predictions based on current workload
      if (currentWorkload) {
        this.adjustForWorkload(forecastPoints, currentWorkload);
      }

      return {
        userId,
        metricType,
        predictions: forecastPoints,
        confidence: this.calculateConfidence(accuracy, seasonality),
        trend,
        seasonality,
        accuracy
      };
    } catch (error) {
      throw new Error(`Forecasting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async forecastMultipleMetrics(
    userId: string,
    metricTypes: string[]
  ): Promise<ForecastResult[]> {
    const results: ForecastResult[] = [];

    for (const metricType of metricTypes) {
      try {
        const forecast = await this.forecastDeliveryTime(userId, metricType);
        results.push(forecast);
      } catch (error) {
        console.warn(`Failed to forecast ${metricType} for user ${userId}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return results;
  }

  private groupMetricsByType(metrics: ProductivityMetric[]): Map<string, ProductivityMetric[]> {
    const grouped = new Map<string, ProductivityMetric[]>();

    for (const metric of metrics) {
      const key = metric.metricType;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(metric);
    }

    return grouped;
  }

  private convertToTimeSeries(metrics: ProductivityMetric[]): TimeSeriesPoint[] {
    return metrics
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map(metric => ({
        timestamp: metric.timestamp,
        value: metric.value,
        metadata: metric.metadata
      }));
  }

  private removeOutliers(timeSeries: TimeSeriesPoint[]): void {
    const values = timeSeries.map(point => point.value);
    const q1 = ss.quantile(values, 0.25);
    const q3 = ss.quantile(values, 0.75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    // Replace outliers with median value
    const median = ss.median(values);
    
    for (const point of timeSeries) {
      if (point.value < lowerBound || point.value > upperBound) {
        point.value = median;
      }
    }
  }

  private detectSeasonality(timeSeries: TimeSeriesPoint[]): SeasonalityInfo {
    if (!this.config.seasonalityDetection || timeSeries.length < 48) {
      return { detected: false, period: 0, strength: 0, pattern: 'none' };
    }

    const values = timeSeries.map(point => point.value);
    
    // Test for daily seasonality (24 hours)
    const dailyCorrelation = this.calculateAutocorrelation(values, 24);
    
    // Test for weekly seasonality (168 hours)
    const weeklyCorrelation = this.calculateAutocorrelation(values, 168);

    const threshold = 0.3;
    
    if (weeklyCorrelation > threshold && weeklyCorrelation > dailyCorrelation) {
      return {
        detected: true,
        period: 168,
        strength: weeklyCorrelation,
        pattern: 'weekly'
      };
    } else if (dailyCorrelation > threshold) {
      return {
        detected: true,
        period: 24,
        strength: dailyCorrelation,
        pattern: 'daily'
      };
    }

    return { detected: false, period: 0, strength: 0, pattern: 'none' };
  }

  private calculateAutocorrelation(values: number[], lag: number): number {
    if (values.length <= lag) return 0;

    const n = values.length - lag;
    const mean = ss.mean(values);
    
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (values[i] - mean) * (values[i + lag] - mean);
    }

    for (let i = 0; i < values.length; i++) {
      denominator += Math.pow(values[i] - mean, 2);
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  private calculateTrend(timeSeries: TimeSeriesPoint[]): 'increasing' | 'decreasing' | 'stable' {
    if (timeSeries.length < 10) return 'stable';

    const values = timeSeries.map(point => point.value);
    const indices = Array.from({ length: values.length }, (_, i) => i);
    
    // Calculate linear regression slope
    const slope = ss.linearRegressionLine(ss.linearRegression(indices.map((x, i) => [x, values[i]])));
    const slopeValue = slope(1) - slope(0);

    const threshold = ss.standardDeviation(values) * 0.1;

    if (slopeValue > threshold) return 'increasing';
    if (slopeValue < -threshold) return 'decreasing';
    return 'stable';
  }

  private createForecastPoints(predictions: number[], historicalData: TimeSeriesPoint[]): TimeSeriesPoint[] {
    const lastTimestamp = historicalData[historicalData.length - 1].timestamp;
    const points: TimeSeriesPoint[] = [];

    for (let i = 0; i < predictions.length; i++) {
      const timestamp = new Date(lastTimestamp.getTime() + (i + 1) * 60 * 60 * 1000); // +1 hour
      points.push({
        timestamp,
        value: predictions[i],
        metadata: { forecasted: true }
      });
    }

    return points;
  }

  private calculateModelAccuracy(
    model: ExponentialSmoothing | ARIMAModel, 
    data: TimeSeriesPoint[]
  ): ModelAccuracy {
    // Use last 20% of data for validation
    const splitIndex = Math.floor(data.length * 0.8);
    const trainData = data.slice(0, splitIndex);
    const testData = data.slice(splitIndex);

    if (testData.length === 0) {
      return { mae: 0, mse: 0, mape: 0, r2: 0 };
    }

    try {
      model.fit(trainData);
      const predictions = model.forecast(testData.length);
      const actual = testData.map(point => point.value);

      if (model instanceof ExponentialSmoothing) {
        return model.calculateAccuracy(actual, predictions);
      } else {
        // Simple accuracy calculation for ARIMA
        const mae = ss.mean(actual.map((a, i) => Math.abs(a - predictions[i])));
        const mse = ss.mean(actual.map((a, i) => Math.pow(a - predictions[i], 2)));
        const mape = ss.mean(actual.map((a, i) => a !== 0 ? Math.abs((a - predictions[i]) / a) * 100 : 0));
        
        const actualMean = ss.mean(actual);
        const totalSumSquares = ss.sum(actual.map(a => Math.pow(a - actualMean, 2)));
        const residualSumSquares = ss.sum(actual.map((a, i) => Math.pow(a - predictions[i], 2)));
        const r2 = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;

        return { mae, mse, mape, r2 };
      }
    } catch (error) {
      return { mae: Infinity, mse: Infinity, mape: Infinity, r2: 0 };
    }
  }

  private calculateConfidence(accuracy: ModelAccuracy, seasonality: SeasonalityInfo): number {
    // Base confidence on R-squared
    let confidence = Math.max(0, accuracy.r2);
    
    // Boost confidence if seasonality is detected
    if (seasonality.detected) {
      confidence += seasonality.strength * 0.2;
    }
    
    // Penalize high error rates
    if (accuracy.mape > 50) {
      confidence *= 0.5;
    } else if (accuracy.mape > 20) {
      confidence *= 0.8;
    }

    return Math.min(1, confidence);
  }

  private adjustForWorkload(predictions: TimeSeriesPoint[], workloadFactor: number): void {
    // Adjust predictions based on current workload
    // Higher workload = longer delivery times
    const adjustmentFactor = Math.max(0.5, Math.min(2.0, workloadFactor));
    
    for (const point of predictions) {
      point.value *= adjustmentFactor;
    }
  }
}