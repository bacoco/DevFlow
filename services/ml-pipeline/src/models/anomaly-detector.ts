// Simple matrix implementation for isolation forest
class Matrix {
  private data: number[][];
  
  constructor(data: number[][]) {
    this.data = data;
  }
  
  get rows(): number {
    return this.data.length;
  }
  
  get columns(): number {
    return this.data.length > 0 ? this.data[0].length : 0;
  }
  
  getRow(index: number): number[] {
    return this.data[index];
  }
  
  getColumn(index: number): number[] {
    return this.data.map(row => row[index]);
  }
  
  get(row: number, col: number): number {
    return this.data[row][col];
  }
}
import { FeatureVector } from '../types/ml-types';

export interface AnomalyResult {
  userId: string;
  timestamp: Date;
  anomalyScore: number;
  isAnomaly: boolean;
  anomalyType: 'productivity_drop' | 'quality_degradation' | 'pattern_change' | 'outlier';
  confidence: number;
  context: AnomalyContext;
  recommendations: string[];
}

export interface AnomalyContext {
  affectedMetrics: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  duration: number; // in milliseconds
  historicalComparison: {
    currentValue: number;
    historicalMean: number;
    standardDeviations: number;
  };
}

export interface IsolationForestConfig {
  numTrees: number;
  subsampleSize: number;
  maxDepth: number;
  contamination: number; // Expected proportion of anomalies
}

export class IsolationForest {
  private trees: IsolationTree[] = [];
  private config: IsolationForestConfig;
  private featureNames: string[] = [];
  private trained: boolean = false;

  constructor(config: Partial<IsolationForestConfig> = {}) {
    this.config = {
      numTrees: config.numTrees || 100,
      subsampleSize: config.subsampleSize || 256,
      maxDepth: config.maxDepth || Math.ceil(Math.log2(256)),
      contamination: config.contamination || 0.1
    };
  }

  train(features: FeatureVector[]): void {
    if (features.length === 0) {
      throw new Error('Cannot train on empty dataset');
    }

    // Extract feature names from first sample
    this.featureNames = Object.keys(features[0].features);
    
    // Convert features to matrix
    const dataMatrix = this.featuresToMatrix(features);
    
    // Build isolation trees
    this.trees = [];
    for (let i = 0; i < this.config.numTrees; i++) {
      const tree = new IsolationTree(this.config.maxDepth);
      const subsample = this.subsample(dataMatrix, this.config.subsampleSize);
      tree.build(subsample);
      this.trees.push(tree);
    }

    this.trained = true;
  }

  predict(features: FeatureVector[]): number[] {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    const dataMatrix = this.featuresToMatrix(features);
    const scores: number[] = [];

    for (let i = 0; i < dataMatrix.rows; i++) {
      const sample = dataMatrix.getRow(i);
      let avgPathLength = 0;

      for (const tree of this.trees) {
        avgPathLength += tree.pathLength(sample);
      }

      avgPathLength /= this.trees.length;
      
      // Normalize score using expected path length
      const expectedPathLength = this.expectedPathLength(this.config.subsampleSize);
      const anomalyScore = Math.pow(2, -avgPathLength / expectedPathLength);
      
      scores.push(anomalyScore);
    }

    return scores;
  }

  getAnomalyThreshold(): number {
    // Threshold based on contamination rate
    return 0.5 + (this.config.contamination * 0.3);
  }

  private featuresToMatrix(features: FeatureVector[]): Matrix {
    const data: number[][] = [];
    
    for (const feature of features) {
      const row: number[] = [];
      for (const featureName of this.featureNames) {
        row.push(feature.features[featureName] || 0);
      }
      data.push(row);
    }

    return new Matrix(data);
  }

  private subsample(data: Matrix, size: number): Matrix {
    const indices = Array.from({ length: data.rows }, (_, i) => i);
    
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const subsampleSize = Math.min(size, data.rows);
    const subsampleIndices = indices.slice(0, subsampleSize);
    
    const subsampleData: number[][] = [];
    for (const index of subsampleIndices) {
      subsampleData.push(data.getRow(index));
    }

    return new Matrix(subsampleData);
  }

  private expectedPathLength(n: number): number {
    if (n <= 1) return 0;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
  }
}

class IsolationTree {
  private root: TreeNode | null = null;
  private maxDepth: number;

  constructor(maxDepth: number) {
    this.maxDepth = maxDepth;
  }

  build(data: Matrix): void {
    this.root = this.buildNode(data, 0);
  }

  pathLength(sample: number[]): number {
    return this.getPathLength(this.root, sample, 0);
  }

  private buildNode(data: Matrix, depth: number): TreeNode {
    if (depth >= this.maxDepth || data.rows <= 1) {
      return { isLeaf: true, size: data.rows };
    }

    // Randomly select feature and split point
    const featureIndex = Math.floor(Math.random() * data.columns);
    const column = data.getColumn(featureIndex);
    const minVal = Math.min(...column);
    const maxVal = Math.max(...column);

    if (minVal === maxVal) {
      return { isLeaf: true, size: data.rows };
    }

    const splitValue = Math.random() * (maxVal - minVal) + minVal;

    // Split data
    const leftIndices: number[] = [];
    const rightIndices: number[] = [];

    for (let i = 0; i < data.rows; i++) {
      if (data.get(i, featureIndex) < splitValue) {
        leftIndices.push(i);
      } else {
        rightIndices.push(i);
      }
    }

    if (leftIndices.length === 0 || rightIndices.length === 0) {
      return { isLeaf: true, size: data.rows };
    }

    const leftData = this.selectRows(data, leftIndices);
    const rightData = this.selectRows(data, rightIndices);

    return {
      isLeaf: false,
      featureIndex,
      splitValue,
      left: this.buildNode(leftData, depth + 1),
      right: this.buildNode(rightData, depth + 1)
    };
  }

  private getPathLength(node: TreeNode | null, sample: number[], depth: number): number {
    if (!node || node.isLeaf) {
      return depth + (node ? this.expectedPathLength(node.size || 0) : 0);
    }

    if (sample[node.featureIndex!] < node.splitValue!) {
      return this.getPathLength(node.left!, sample, depth + 1);
    } else {
      return this.getPathLength(node.right!, sample, depth + 1);
    }
  }

  private selectRows(data: Matrix, indices: number[]): Matrix {
    const selectedData: number[][] = [];
    for (const index of indices) {
      selectedData.push(data.getRow(index));
    }
    return new Matrix(selectedData);
  }

  private expectedPathLength(n: number): number {
    if (n <= 1) return 0;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
  }
}

interface TreeNode {
  isLeaf: boolean;
  size?: number;
  featureIndex?: number;
  splitValue?: number;
  left?: TreeNode;
  right?: TreeNode;
}

export class ProductivityAnomalyDetector {
  private isolationForest: IsolationForest;
  private historicalStats: Map<string, FeatureStatistics> = new Map();
  private anomalyThreshold: number;

  constructor(config: Partial<IsolationForestConfig> = {}) {
    this.isolationForest = new IsolationForest(config);
    this.anomalyThreshold = 0.6; // Default threshold
  }

  async train(features: FeatureVector[]): Promise<void> {
    if (features.length < 10) {
      throw new Error('Insufficient training data. Need at least 10 samples.');
    }

    // Calculate historical statistics for each feature
    this.calculateHistoricalStats(features);

    // Train isolation forest
    this.isolationForest.train(features);
    this.anomalyThreshold = this.isolationForest.getAnomalyThreshold();
  }

  async detectAnomalies(features: FeatureVector[]): Promise<AnomalyResult[]> {
    const anomalyScores = this.isolationForest.predict(features);
    const results: AnomalyResult[] = [];

    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      const score = anomalyScores[i];
      const isAnomaly = score > this.anomalyThreshold;

      if (isAnomaly) {
        const anomalyResult = await this.analyzeAnomaly(feature, score);
        results.push(anomalyResult);
      }
    }

    return results;
  }

  private async analyzeAnomaly(feature: FeatureVector, score: number): Promise<AnomalyResult> {
    const affectedMetrics = this.identifyAffectedMetrics(feature);
    const anomalyType = this.classifyAnomalyType(feature, affectedMetrics);
    const severity = this.calculateSeverity(score, affectedMetrics);
    const recommendations = this.generateRecommendations(anomalyType, affectedMetrics);

    // Calculate historical comparison for the most affected metric
    const primaryMetric = affectedMetrics[0];
    const historicalComparison = this.getHistoricalComparison(
      feature.features[primaryMetric],
      primaryMetric
    );

    return {
      userId: feature.userId,
      timestamp: feature.timestamp,
      anomalyScore: score,
      isAnomaly: true,
      anomalyType,
      confidence: Math.min(score * 1.5, 1.0),
      context: {
        affectedMetrics,
        severity,
        duration: 0, // Would need temporal analysis
        historicalComparison
      },
      recommendations
    };
  }

  private identifyAffectedMetrics(feature: FeatureVector): string[] {
    const affectedMetrics: Array<{ name: string; deviation: number }> = [];

    for (const [metricName, value] of Object.entries(feature.features)) {
      const stats = this.historicalStats.get(metricName);
      if (stats) {
        const deviation = Math.abs(value - stats.mean) / stats.std;
        if (deviation > 2) { // More than 2 standard deviations
          affectedMetrics.push({ name: metricName, deviation });
        }
      }
    }

    // Sort by deviation and return top metrics
    return affectedMetrics
      .sort((a, b) => b.deviation - a.deviation)
      .slice(0, 3)
      .map(m => m.name);
  }

  private classifyAnomalyType(
    feature: FeatureVector, 
    affectedMetrics: string[]
  ): AnomalyResult['anomalyType'] {
    // Simple rule-based classification
    const productivityMetrics = ['commits_per_day', 'lines_added_per_commit', 'pr_creation_rate'];
    const qualityMetrics = ['review_cycle_time_hours', 'refactoring_ratio', 'bug_fix_ratio'];
    const focusMetrics = ['total_focus_time_hours', 'interruption_rate_per_hour'];

    const hasProductivityIssue = affectedMetrics.some(m => productivityMetrics.includes(m));
    const hasQualityIssue = affectedMetrics.some(m => qualityMetrics.includes(m));
    const hasFocusIssue = affectedMetrics.some(m => focusMetrics.includes(m));

    if (hasProductivityIssue && hasFocusIssue) {
      return 'productivity_drop';
    } else if (hasQualityIssue) {
      return 'quality_degradation';
    } else if (hasFocusIssue) {
      return 'pattern_change';
    } else {
      return 'outlier';
    }
  }

  private calculateSeverity(
    score: number, 
    affectedMetrics: string[]
  ): AnomalyContext['severity'] {
    const severityScore = score * affectedMetrics.length;

    if (severityScore > 0.9) return 'critical';
    if (severityScore > 0.7) return 'high';
    if (severityScore > 0.5) return 'medium';
    return 'low';
  }

  private generateRecommendations(
    anomalyType: AnomalyResult['anomalyType'],
    affectedMetrics: string[]
  ): string[] {
    const recommendations: string[] = [];

    switch (anomalyType) {
      case 'productivity_drop':
        recommendations.push(
          'Consider reviewing your work schedule and identifying potential distractions',
          'Take breaks to maintain focus and avoid burnout',
          'Review recent changes in tools or processes that might affect productivity'
        );
        break;

      case 'quality_degradation':
        recommendations.push(
          'Increase code review thoroughness and peer feedback',
          'Consider refactoring complex code sections',
          'Review testing practices and coverage'
        );
        break;

      case 'pattern_change':
        recommendations.push(
          'Analyze recent changes in work patterns or environment',
          'Consider adjusting work schedule to match natural productivity rhythms',
          'Evaluate the impact of meetings and interruptions on focus time'
        );
        break;

      case 'outlier':
        recommendations.push(
          'Monitor the situation for consistency',
          'Consider if this represents a positive change or temporary variation',
          'Review recent changes in work approach or tools'
        );
        break;
    }

    // Add metric-specific recommendations
    if (affectedMetrics.includes('interruption_rate_per_hour')) {
      recommendations.push('Consider using focus time blocks or notification management');
    }

    if (affectedMetrics.includes('review_cycle_time_hours')) {
      recommendations.push('Review code review processes and reviewer availability');
    }

    return recommendations;
  }

  private getHistoricalComparison(
    currentValue: number,
    metricName: string
  ): AnomalyContext['historicalComparison'] {
    const stats = this.historicalStats.get(metricName);
    
    if (!stats) {
      return {
        currentValue,
        historicalMean: currentValue,
        standardDeviations: 0
      };
    }

    const standardDeviations = stats.std > 0 ? 
      (currentValue - stats.mean) / stats.std : 0;

    return {
      currentValue,
      historicalMean: stats.mean,
      standardDeviations
    };
  }

  private calculateHistoricalStats(features: FeatureVector[]): void {
    const featureNames = Object.keys(features[0].features);
    
    for (const featureName of featureNames) {
      const values = features.map(f => f.features[featureName]).filter(v => v !== undefined);
      
      if (values.length > 0) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const std = Math.sqrt(variance);
        
        this.historicalStats.set(featureName, {
          mean,
          std,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        });
      }
    }
  }
}

interface FeatureStatistics {
  mean: number;
  std: number;
  min: number;
  max: number;
  count: number;
}