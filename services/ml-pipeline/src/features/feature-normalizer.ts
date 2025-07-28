import { mean, standardDeviation, median, quantile, min, max } from '../utils/statistics';
import { 
  FeatureNormalizer, 
  FeatureVector, 
  ScalingParameters,
  FeatureDefinition 
} from '../types/ml-types';

export class StandardFeatureNormalizer implements FeatureNormalizer {
  private scalingParams: ScalingParameters | null = null;
  private featureDefinitions: FeatureDefinition[];

  constructor(featureDefinitions: FeatureDefinition[]) {
    this.featureDefinitions = featureDefinitions;
  }

  fit(features: FeatureVector[]): void {
    if (features.length === 0) {
      throw new Error('Cannot fit normalizer with empty feature set');
    }

    const parameters: Record<string, any> = {};
    const featureNames = this.featureDefinitions.map(def => def.name);

    for (const featureName of featureNames) {
      const definition = this.featureDefinitions.find(def => def.name === featureName);
      if (!definition) continue;

      const values = features
        .map(f => f.features[featureName])
        .filter(v => v !== undefined && v !== null && isFinite(v));

      if (values.length === 0) {
        parameters[featureName] = this.getDefaultParameters(definition.normalizationMethod);
        continue;
      }

      switch (definition.normalizationMethod) {
        case 'minmax':
          parameters[featureName] = {
            min: min(values),
            max: max(values)
          };
          break;

        case 'zscore':
          parameters[featureName] = {
            mean: mean(values),
            std: standardDeviation(values)
          };
          break;

        case 'robust':
          const sortedValues = values.sort((a, b) => a - b);
          parameters[featureName] = {
            median: median(sortedValues),
            q25: quantile(sortedValues, 0.25),
            q75: quantile(sortedValues, 0.75)
          };
          break;

        case 'none':
          parameters[featureName] = {};
          break;

        default:
          throw new Error(`Unknown normalization method: ${definition.normalizationMethod}`);
      }
    }

    this.scalingParams = {
      method: 'mixed', // Mixed because different features use different methods
      parameters
    } as ScalingParameters;
  }

  transform(features: FeatureVector[]): FeatureVector[] {
    if (!this.scalingParams) {
      throw new Error('Normalizer must be fitted before transformation');
    }

    return features.map(featureVector => ({
      ...featureVector,
      features: this.transformFeatureSet(featureVector.features)
    }));
  }

  fitTransform(features: FeatureVector[]): FeatureVector[] {
    this.fit(features);
    return this.transform(features);
  }

  getScalingParameters(): ScalingParameters {
    if (!this.scalingParams) {
      throw new Error('Normalizer has not been fitted yet');
    }
    return { ...this.scalingParams };
  }

  setScalingParameters(params: ScalingParameters): void {
    this.scalingParams = { ...params };
  }

  private transformFeatureSet(features: Record<string, number>): Record<string, number> {
    const transformed: Record<string, number> = {};

    for (const [featureName, value] of Object.entries(features)) {
      const definition = this.featureDefinitions.find(def => def.name === featureName);
      if (!definition) {
        transformed[featureName] = value;
        continue;
      }

      const params = this.scalingParams!.parameters[featureName];
      if (!params) {
        transformed[featureName] = value;
        continue;
      }

      transformed[featureName] = this.normalizeValue(
        value, 
        definition.normalizationMethod, 
        params
      );
    }

    return transformed;
  }

  private normalizeValue(
    value: number, 
    method: 'minmax' | 'zscore' | 'robust' | 'none',
    params: any
  ): number {
    if (!isFinite(value)) {
      return 0;
    }

    switch (method) {
      case 'minmax':
        if (params.max === params.min) {
          return 0;
        }
        return (value - params.min) / (params.max - params.min);

      case 'zscore':
        if (params.std === 0) {
          return 0;
        }
        return (value - params.mean) / params.std;

      case 'robust':
        const iqr = params.q75 - params.q25;
        if (iqr === 0) {
          return 0;
        }
        return (value - params.median) / iqr;

      case 'none':
        return value;

      default:
        return value;
    }
  }

  private getDefaultParameters(method: 'minmax' | 'zscore' | 'robust' | 'none'): any {
    switch (method) {
      case 'minmax':
        return { min: 0, max: 1 };
      case 'zscore':
        return { mean: 0, std: 1 };
      case 'robust':
        return { median: 0, q25: -0.5, q75: 0.5 };
      case 'none':
        return {};
      default:
        return {};
    }
  }

  // Utility methods for feature analysis
  detectOutliers(features: FeatureVector[], threshold: number = 3): Record<string, number[]> {
    const outliers: Record<string, number[]> = {};
    
    for (const definition of this.featureDefinitions) {
      const featureName = definition.name;
      const values = features
        .map((f, index) => ({ value: f.features[featureName], index }))
        .filter(v => v.value !== undefined && v.value !== null && isFinite(v.value));

      if (values.length === 0) continue;

      const featureValues = values.map(v => v.value);
      const meanVal = mean(featureValues);
      const stdVal = standardDeviation(featureValues);

      outliers[featureName] = values
        .filter(v => Math.abs(v.value - meanVal) > threshold * stdVal)
        .map(v => v.index);
    }

    return outliers;
  }

  getFeatureStatistics(features: FeatureVector[]): Record<string, FeatureStatistics> {
    const stats: Record<string, FeatureStatistics> = {};

    for (const definition of this.featureDefinitions) {
      const featureName = definition.name;
      const values = features
        .map(f => f.features[featureName])
        .filter(v => v !== undefined && v !== null && isFinite(v));

      if (values.length === 0) {
        stats[featureName] = {
          count: 0,
          mean: 0,
          std: 0,
          min: 0,
          max: 0,
          median: 0,
          q25: 0,
          q75: 0,
          nullCount: features.length,
          nullPercentage: 100
        };
        continue;
      }

      const sortedValues = values.sort((a, b) => a - b);
      const nullCount = features.length - values.length;

      stats[featureName] = {
        count: values.length,
        mean: mean(values),
        std: standardDeviation(values),
        min: min(values),
        max: max(values),
        median: median(sortedValues),
        q25: quantile(sortedValues, 0.25),
        q75: quantile(sortedValues, 0.75),
        nullCount,
        nullPercentage: (nullCount / features.length) * 100
      };
    }

    return stats;
  }

  validateNormalizedFeatures(features: FeatureVector[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const featureVector of features) {
      for (const [featureName, value] of Object.entries(featureVector.features)) {
        const definition = this.featureDefinitions.find(def => def.name === featureName);
        if (!definition) continue;

        // Check for invalid values
        if (!isFinite(value)) {
          errors.push(`Feature ${featureName} has invalid value: ${value}`);
          continue;
        }

        // Check normalized ranges for minmax
        if (definition.normalizationMethod === 'minmax') {
          if (value < -0.1 || value > 1.1) {
            warnings.push(`Feature ${featureName} outside expected range [0,1]: ${value}`);
          }
        }

        // Check for extreme z-scores
        if (definition.normalizationMethod === 'zscore') {
          if (Math.abs(value) > 5) {
            warnings.push(`Feature ${featureName} has extreme z-score: ${value}`);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      featureCount: features.length,
      totalFeatures: this.featureDefinitions.length
    };
  }
}

interface FeatureStatistics {
  count: number;
  mean: number;
  std: number;
  min: number;
  max: number;
  median: number;
  q25: number;
  q75: number;
  nullCount: number;
  nullPercentage: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  featureCount: number;
  totalFeatures: number;
}