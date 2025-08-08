import { EventEmitter } from 'events';

export interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: ABVariant[];
  trafficAllocation: TrafficAllocation;
  targetingRules: TargetingRule[];
  metrics: ABMetric[];
  startDate: Date;
  endDate?: Date;
  sampleSize: number;
  confidenceLevel: number;
}

export interface ABVariant {
  id: string;
  name: string;
  description: string;
  weight: number; // Percentage of traffic (0-100)
  config: VariantConfig;
  isControl: boolean;
}

export interface VariantConfig {
  [key: string]: any; // Flexible configuration for different types of tests
}

export interface TrafficAllocation {
  percentage: number; // Percentage of total users to include in test
  method: 'random' | 'deterministic';
  seed?: string; // For deterministic allocation
}

export interface TargetingRule {
  id: string;
  type: 'user_property' | 'session_property' | 'custom';
  property: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface ABMetric {
  id: string;
  name: string;
  type: 'conversion' | 'numeric' | 'duration' | 'count';
  eventName: string;
  aggregation?: 'sum' | 'average' | 'count' | 'unique';
  isPrimary: boolean;
}

export interface ABTestResult {
  testId: string;
  variantId: string;
  userId: string;
  sessionId: string;
  timestamp: Date;
  metrics: MetricValue[];
  userProperties: Record<string, any>;
}

export interface MetricValue {
  metricId: string;
  value: number;
  timestamp: Date;
}

export interface ABTestAnalysis {
  testId: string;
  status: 'insufficient_data' | 'no_significant_difference' | 'significant_difference';
  confidenceLevel: number;
  results: VariantAnalysis[];
  recommendations: string[];
  statisticalSignificance: boolean;
}

export interface VariantAnalysis {
  variantId: string;
  variantName: string;
  sampleSize: number;
  conversionRate?: number;
  averageValue?: number;
  confidenceInterval: [number, number];
  pValue?: number;
  lift?: number; // Percentage improvement over control
}

export class ABTestingFramework extends EventEmitter {
  private tests: Map<string, ABTest> = new Map();
  private results: ABTestResult[] = [];
  private userAssignments: Map<string, Map<string, string>> = new Map(); // userId -> testId -> variantId

  constructor() {
    super();
  }

  // Test Management
  createTest(test: Omit<ABTest, 'status'>): ABTest {
    const newTest: ABTest = {
      ...test,
      status: 'draft'
    };

    // Validate test configuration
    this.validateTest(newTest);

    this.tests.set(test.id, newTest);
    this.emit('testCreated', newTest);
    
    return newTest;
  }

  startTest(testId: string): void {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    if (test.status !== 'draft' && test.status !== 'paused') {
      throw new Error(`Cannot start test in ${test.status} status`);
    }

    test.status = 'running';
    test.startDate = new Date();
    
    this.emit('testStarted', test);
  }

  pauseTest(testId: string): void {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    test.status = 'paused';
    this.emit('testPaused', test);
  }

  completeTest(testId: string): void {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    test.status = 'completed';
    test.endDate = new Date();
    
    this.emit('testCompleted', test);
  }

  // User Assignment
  assignUserToVariant(
    userId: string, 
    testId: string, 
    userProperties: Record<string, any> = {},
    sessionProperties: Record<string, any> = {}
  ): string | null {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') {
      return null;
    }

    // Check if user already assigned
    const userTests = this.userAssignments.get(userId);
    if (userTests?.has(testId)) {
      return userTests.get(testId)!;
    }

    // Check targeting rules
    if (!this.matchesTargetingRules(test.targetingRules, userProperties, sessionProperties)) {
      return null;
    }

    // Check traffic allocation
    if (!this.shouldIncludeInTest(userId, test.trafficAllocation)) {
      return null;
    }

    // Assign to variant
    const variantId = this.selectVariant(userId, test.variants);
    
    // Store assignment
    if (!this.userAssignments.has(userId)) {
      this.userAssignments.set(userId, new Map());
    }
    this.userAssignments.get(userId)!.set(testId, variantId);

    this.emit('userAssigned', { userId, testId, variantId });
    
    return variantId;
  }

  getVariantConfig(testId: string, variantId: string): VariantConfig | null {
    const test = this.tests.get(testId);
    if (!test) return null;

    const variant = test.variants.find(v => v.id === variantId);
    return variant?.config || null;
  }

  // Event Tracking
  trackEvent(
    userId: string,
    sessionId: string,
    eventName: string,
    value?: number,
    properties: Record<string, any> = {}
  ): void {
    const userTests = this.userAssignments.get(userId);
    if (!userTests) return;

    // Find tests that track this event
    for (const [testId, variantId] of userTests.entries()) {
      const test = this.tests.get(testId);
      if (!test || test.status !== 'running') continue;

      const relevantMetrics = test.metrics.filter(m => m.eventName === eventName);
      if (relevantMetrics.length === 0) continue;

      // Create result record
      const result: ABTestResult = {
        testId,
        variantId,
        userId,
        sessionId,
        timestamp: new Date(),
        metrics: relevantMetrics.map(metric => ({
          metricId: metric.id,
          value: this.calculateMetricValue(metric, value, properties),
          timestamp: new Date()
        })),
        userProperties: properties
      };

      this.results.push(result);
      this.emit('eventTracked', result);
    }
  }

  // Analysis
  analyzeTest(testId: string): ABTestAnalysis {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    const testResults = this.results.filter(r => r.testId === testId);
    
    if (testResults.length < test.sampleSize) {
      return {
        testId,
        status: 'insufficient_data',
        confidenceLevel: test.confidenceLevel,
        results: [],
        recommendations: ['Collect more data before drawing conclusions'],
        statisticalSignificance: false
      };
    }

    const variantAnalyses = test.variants.map(variant => 
      this.analyzeVariant(variant, testResults, test.metrics)
    );

    const controlAnalysis = variantAnalyses.find(va => 
      test.variants.find(v => v.id === va.variantId)?.isControl
    );

    // Calculate statistical significance
    const primaryMetric = test.metrics.find(m => m.isPrimary);
    let statisticalSignificance = false;
    
    if (primaryMetric && controlAnalysis) {
      statisticalSignificance = variantAnalyses.some(va => 
        va.variantId !== controlAnalysis.variantId && 
        (va.pValue || 1) < (1 - test.confidenceLevel / 100)
      );
    }

    return {
      testId,
      status: statisticalSignificance ? 'significant_difference' : 'no_significant_difference',
      confidenceLevel: test.confidenceLevel,
      results: variantAnalyses,
      recommendations: this.generateRecommendations(variantAnalyses, controlAnalysis),
      statisticalSignificance
    };
  }

  // Private Methods
  private validateTest(test: ABTest): void {
    // Validate variants
    if (test.variants.length < 2) {
      throw new Error('Test must have at least 2 variants');
    }

    const totalWeight = test.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error('Variant weights must sum to 100%');
    }

    const controlVariants = test.variants.filter(v => v.isControl);
    if (controlVariants.length !== 1) {
      throw new Error('Test must have exactly one control variant');
    }

    // Validate metrics
    const primaryMetrics = test.metrics.filter(m => m.isPrimary);
    if (primaryMetrics.length !== 1) {
      throw new Error('Test must have exactly one primary metric');
    }
  }

  private matchesTargetingRules(
    rules: TargetingRule[],
    userProperties: Record<string, any>,
    sessionProperties: Record<string, any>
  ): boolean {
    return rules.every(rule => {
      const properties = rule.type === 'user_property' ? userProperties : sessionProperties;
      const value = properties[rule.property];

      switch (rule.operator) {
        case 'equals':
          return value === rule.value;
        case 'not_equals':
          return value !== rule.value;
        case 'contains':
          return String(value).includes(String(rule.value));
        case 'greater_than':
          return Number(value) > Number(rule.value);
        case 'less_than':
          return Number(value) < Number(rule.value);
        case 'in':
          return Array.isArray(rule.value) && rule.value.includes(value);
        case 'not_in':
          return Array.isArray(rule.value) && !rule.value.includes(value);
        default:
          return false;
      }
    });
  }

  private shouldIncludeInTest(userId: string, allocation: TrafficAllocation): boolean {
    if (allocation.method === 'random') {
      return Math.random() * 100 < allocation.percentage;
    } else {
      // Deterministic allocation based on user ID hash
      const hash = this.hashString(userId + (allocation.seed || ''));
      return (hash % 100) < allocation.percentage;
    }
  }

  private selectVariant(userId: string, variants: ABVariant[]): string {
    const hash = this.hashString(userId);
    const random = (hash % 10000) / 100; // 0-99.99

    let cumulativeWeight = 0;
    for (const variant of variants) {
      cumulativeWeight += variant.weight;
      if (random < cumulativeWeight) {
        return variant.id;
      }
    }

    // Fallback to last variant
    return variants[variants.length - 1].id;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private calculateMetricValue(
    metric: ABMetric,
    eventValue?: number,
    properties: Record<string, any> = {}
  ): number {
    switch (metric.type) {
      case 'conversion':
        return 1; // Binary conversion event
      case 'numeric':
        return eventValue || 0;
      case 'duration':
        return properties.duration || eventValue || 0;
      case 'count':
        return 1; // Count each occurrence
      default:
        return eventValue || 1;
    }
  }

  private analyzeVariant(
    variant: ABVariant,
    results: ABTestResult[],
    metrics: ABMetric[]
  ): VariantAnalysis {
    const variantResults = results.filter(r => r.variantId === variant.id);
    const sampleSize = new Set(variantResults.map(r => r.userId)).size;

    // Calculate primary metric
    const primaryMetric = metrics.find(m => m.isPrimary);
    let conversionRate: number | undefined;
    let averageValue: number | undefined;

    if (primaryMetric) {
      const metricValues = variantResults.flatMap(r => 
        r.metrics.filter(m => m.metricId === primaryMetric.id).map(m => m.value)
      );

      if (primaryMetric.type === 'conversion') {
        conversionRate = (metricValues.length / sampleSize) * 100;
      } else {
        averageValue = metricValues.reduce((sum, v) => sum + v, 0) / metricValues.length;
      }
    }

    // Calculate confidence interval (simplified)
    const value = conversionRate || averageValue || 0;
    const standardError = Math.sqrt((value * (100 - value)) / sampleSize) || 1;
    const marginOfError = 1.96 * standardError; // 95% confidence

    return {
      variantId: variant.id,
      variantName: variant.name,
      sampleSize,
      conversionRate,
      averageValue,
      confidenceInterval: [
        Math.max(0, value - marginOfError),
        Math.min(100, value + marginOfError)
      ],
      pValue: 0.05, // Simplified - would need proper statistical test
      lift: 0 // Will be calculated relative to control
    };
  }

  private generateRecommendations(
    analyses: VariantAnalysis[],
    control?: VariantAnalysis
  ): string[] {
    const recommendations: string[] = [];

    if (!control) {
      recommendations.push('No control variant found for comparison');
      return recommendations;
    }

    const winners = analyses.filter(a => 
      a.variantId !== control.variantId && 
      (a.conversionRate || a.averageValue || 0) > (control.conversionRate || control.averageValue || 0)
    );

    if (winners.length === 0) {
      recommendations.push('No variants performed better than control');
      recommendations.push('Consider testing more dramatic changes');
    } else if (winners.length === 1) {
      recommendations.push(`Variant "${winners[0].variantName}" shows promising results`);
      recommendations.push('Consider implementing this variant');
    } else {
      recommendations.push('Multiple variants show improvement');
      recommendations.push('Consider running follow-up tests to determine the best option');
    }

    // Sample size recommendations
    const minSampleSize = Math.min(...analyses.map(a => a.sampleSize));
    if (minSampleSize < 100) {
      recommendations.push('Increase sample size for more reliable results');
    }

    return recommendations;
  }
}