import { CodeArtifact, CodebaseAnalysis, ComplexityMetrics, DependencyGraph, DependencyRelation } from '../types';

export interface CodeHotspot {
  artifactId: string;
  artifact: CodeArtifact;
  changeFrequency: number;
  authorCount: number;
  complexityTrend: number[];
  riskScore: number;
  lastChanged: Date;
  hotspotType: 'change_frequency' | 'complexity' | 'author_churn' | 'combined';
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export interface HotspotAnalysis {
  hotspots: CodeHotspot[];
  summary: {
    totalHotspots: number;
    criticalHotspots: number;
    highRiskFiles: string[];
    averageRiskScore: number;
    topRiskFactors: string[];
  };
  trends: {
    complexityTrend: number[];
    changeFrequencyTrend: number[];
    authorChurnTrend: number[];
  };
}

export interface HotspotDetectorConfig {
  changeFrequencyThreshold: number;
  complexityThreshold: number;
  authorCountThreshold: number;
  riskScoreWeights: {
    changeFrequency: number;
    complexity: number;
    authorCount: number;
    recency: number;
  };
  severityThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export class HotspotDetector {
  private config: HotspotDetectorConfig;

  constructor(config: Partial<HotspotDetectorConfig> = {}) {
    this.config = {
      changeFrequencyThreshold: 10, // changes per month
      complexityThreshold: 15, // cyclomatic complexity
      authorCountThreshold: 5, // number of different authors
      riskScoreWeights: {
        changeFrequency: 0.3,
        complexity: 0.25,
        authorCount: 0.25,
        recency: 0.2
      },
      severityThresholds: {
        low: 0.3,
        medium: 0.5,
        high: 0.7,
        critical: 0.85
      },
      ...config
    };
  }

  /**
   * Analyze codebase to detect hotspots
   */
  analyzeHotspots(codebaseAnalysis: CodebaseAnalysis): HotspotAnalysis {
    console.log('Starting hotspot analysis...');

    const hotspots = this.detectHotspots(codebaseAnalysis.artifacts);
    const summary = this.generateSummary(hotspots);
    const trends = this.analyzeTrends(codebaseAnalysis.artifacts);

    console.log(`Detected ${hotspots.length} hotspots`);

    return {
      hotspots: hotspots.sort((a, b) => b.riskScore - a.riskScore),
      summary,
      trends
    };
  }

  /**
   * Detect hotspots based on change frequency analysis
   */
  private detectHotspots(artifacts: CodeArtifact[]): CodeHotspot[] {
    const hotspots: CodeHotspot[] = [];

    for (const artifact of artifacts) {
      // Skip test files and configuration files
      if (this.shouldSkipArtifact(artifact)) {
        continue;
      }

      const hotspot = this.analyzeArtifactHotspot(artifact);
      
      // Only include if it meets minimum risk threshold
      if (hotspot.riskScore >= this.config.severityThresholds.low) {
        hotspots.push(hotspot);
      }
    }

    return hotspots;
  }

  /**
   * Analyze individual artifact for hotspot characteristics
   */
  private analyzeArtifactHotspot(artifact: CodeArtifact): CodeHotspot {
    // Calculate normalized metrics (0-1 scale)
    const normalizedChangeFreq = this.normalizeChangeFrequency(artifact.changeFrequency);
    const normalizedComplexity = this.normalizeComplexity(artifact.complexity);
    const normalizedAuthorCount = this.normalizeAuthorCount(artifact.authors.length);
    const recencyScore = this.calculateRecencyScore(artifact.lastModified);

    // Calculate weighted risk score
    const riskScore = 
      (normalizedChangeFreq * this.config.riskScoreWeights.changeFrequency) +
      (normalizedComplexity * this.config.riskScoreWeights.complexity) +
      (normalizedAuthorCount * this.config.riskScoreWeights.authorCount) +
      (recencyScore * this.config.riskScoreWeights.recency);

    // Determine hotspot type based on dominant factor
    const hotspotType = this.determineHotspotType(
      normalizedChangeFreq,
      normalizedComplexity,
      normalizedAuthorCount
    );

    // Calculate severity
    const severity = this.calculateSeverity(riskScore);

    // Generate complexity trend (simulated for now - would come from historical data)
    const complexityTrend = this.generateComplexityTrend(artifact);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      artifact,
      hotspotType,
      severity,
      normalizedChangeFreq,
      normalizedComplexity,
      normalizedAuthorCount
    );

    return {
      artifactId: artifact.id,
      artifact,
      changeFrequency: artifact.changeFrequency,
      authorCount: artifact.authors.length,
      complexityTrend,
      riskScore: Math.min(1, Math.max(0, riskScore)), // Clamp to 0-1
      lastChanged: artifact.lastModified,
      hotspotType,
      severity,
      recommendations
    };
  }

  /**
   * Normalize change frequency to 0-1 scale
   */
  private normalizeChangeFrequency(changeFreq: number): number {
    // Use logarithmic scaling for change frequency
    const logFreq = Math.log(changeFreq + 1);
    const logThreshold = Math.log(this.config.changeFrequencyThreshold + 1);
    return Math.min(1, logFreq / logThreshold);
  }

  /**
   * Normalize complexity to 0-1 scale
   */
  private normalizeComplexity(complexity: number): number {
    return Math.min(1, complexity / this.config.complexityThreshold);
  }

  /**
   * Normalize author count to 0-1 scale
   */
  private normalizeAuthorCount(authorCount: number): number {
    return Math.min(1, authorCount / this.config.authorCountThreshold);
  }

  /**
   * Calculate recency score (more recent changes = higher risk)
   */
  private calculateRecencyScore(lastModified: Date): number {
    const now = new Date();
    const daysSinceModified = (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
    
    // Exponential decay - recent changes are more risky
    // Score approaches 1 for very recent changes, 0 for old changes
    return Math.exp(-daysSinceModified / 30); // 30-day half-life
  }

  /**
   * Determine primary hotspot type based on dominant risk factor
   */
  private determineHotspotType(
    changeFreq: number,
    complexity: number,
    authorCount: number
  ): CodeHotspot['hotspotType'] {
    const maxScore = Math.max(changeFreq, complexity, authorCount);
    
    if (changeFreq === maxScore && changeFreq > 0.6) {
      return 'change_frequency';
    } else if (complexity === maxScore && complexity > 0.6) {
      return 'complexity';
    } else if (authorCount === maxScore && authorCount > 0.6) {
      return 'author_churn';
    } else {
      return 'combined';
    }
  }

  /**
   * Calculate severity level based on risk score
   */
  private calculateSeverity(riskScore: number): CodeHotspot['severity'] {
    if (riskScore >= this.config.severityThresholds.critical) {
      return 'critical';
    } else if (riskScore >= this.config.severityThresholds.high) {
      return 'high';
    } else if (riskScore >= this.config.severityThresholds.medium) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate complexity trend (simulated - would use historical data in real implementation)
   */
  private generateComplexityTrend(artifact: CodeArtifact): number[] {
    // Simulate complexity trend over last 12 months
    const trend: number[] = [];
    const baseComplexity = artifact.complexity;
    
    for (let i = 0; i < 12; i++) {
      // Add some realistic variation
      const variation = (Math.random() - 0.5) * 0.2 * baseComplexity;
      const monthComplexity = Math.max(1, baseComplexity + variation);
      trend.push(Math.round(monthComplexity * 100) / 100);
    }
    
    return trend;
  }

  /**
   * Generate actionable recommendations based on hotspot analysis
   */
  private generateRecommendations(
    artifact: CodeArtifact,
    hotspotType: CodeHotspot['hotspotType'],
    severity: CodeHotspot['severity'],
    changeFreq: number,
    complexity: number,
    authorCount: number
  ): string[] {
    const recommendations: string[] = [];

    // Severity-based recommendations
    if (severity === 'critical') {
      recommendations.push('🚨 CRITICAL: Immediate refactoring required to reduce technical debt');
      recommendations.push('Consider breaking this component into smaller, more focused modules');
    } else if (severity === 'high') {
      recommendations.push('⚠️ HIGH PRIORITY: Schedule refactoring in next sprint');
    }

    // Type-specific recommendations
    switch (hotspotType) {
      case 'change_frequency':
        recommendations.push('📈 High change frequency detected - consider stabilizing the API');
        recommendations.push('Add comprehensive unit tests to prevent regression');
        if (changeFreq > 0.8) {
          recommendations.push('Investigate why this code changes so frequently');
        }
        break;

      case 'complexity':
        recommendations.push('🧩 High complexity detected - consider refactoring into smaller functions');
        recommendations.push('Apply Single Responsibility Principle');
        if (complexity > 0.8) {
          recommendations.push('Consider using design patterns to reduce complexity');
        }
        break;

      case 'author_churn':
        recommendations.push('👥 Multiple authors detected - ensure consistent coding standards');
        recommendations.push('Consider code ownership assignment');
        recommendations.push('Add detailed documentation for future contributors');
        break;

      case 'combined':
        recommendations.push('⚡ Multiple risk factors detected - comprehensive review needed');
        recommendations.push('Consider architectural review with senior developers');
        break;
    }

    // File-type specific recommendations
    if (artifact.type === 'class' && complexity > 0.7) {
      recommendations.push('Consider extracting methods or using composition over inheritance');
    }

    if (artifact.type === 'function' && complexity > 0.6) {
      recommendations.push('Break down into smaller, more focused functions');
    }

    // Add monitoring recommendation for high-risk items
    if (severity === 'high' || severity === 'critical') {
      recommendations.push('📊 Add monitoring and alerting for this component');
    }

    return recommendations;
  }

  /**
   * Generate summary statistics for hotspot analysis
   */
  private generateSummary(hotspots: CodeHotspot[]): HotspotAnalysis['summary'] {
    const criticalHotspots = hotspots.filter(h => h.severity === 'critical').length;
    const highRiskFiles = hotspots
      .filter(h => h.severity === 'high' || h.severity === 'critical')
      .map(h => h.artifact.filePath)
      .slice(0, 10); // Top 10

    const averageRiskScore = hotspots.length > 0 
      ? hotspots.reduce((sum, h) => sum + h.riskScore, 0) / hotspots.length 
      : 0;

    // Analyze top risk factors
    const riskFactors = new Map<string, number>();
    for (const hotspot of hotspots) {
      riskFactors.set(hotspot.hotspotType, (riskFactors.get(hotspot.hotspotType) || 0) + 1);
    }

    const topRiskFactors = Array.from(riskFactors.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([factor]) => factor)
      .slice(0, 3);

    return {
      totalHotspots: hotspots.length,
      criticalHotspots,
      highRiskFiles,
      averageRiskScore: Math.round(averageRiskScore * 1000) / 1000,
      topRiskFactors
    };
  }

  /**
   * Analyze trends across all artifacts
   */
  private analyzeTrends(artifacts: CodeArtifact[]): HotspotAnalysis['trends'] {
    // Simulate trend analysis (would use historical data in real implementation)
    const complexityTrend = this.calculateAverageComplexityTrend(artifacts);
    const changeFrequencyTrend = this.calculateAverageChangeFrequencyTrend(artifacts);
    const authorChurnTrend = this.calculateAverageAuthorChurnTrend(artifacts);

    return {
      complexityTrend,
      changeFrequencyTrend,
      authorChurnTrend
    };
  }

  /**
   * Calculate average complexity trend across codebase
   */
  private calculateAverageComplexityTrend(artifacts: CodeArtifact[]): number[] {
    const trend: number[] = [];
    
    for (let month = 0; month < 12; month++) {
      const monthlyComplexities = artifacts.map(artifact => {
        // Simulate historical complexity (would come from actual data)
        const baseComplexity = artifact.complexity;
        const variation = (Math.random() - 0.5) * 0.1 * baseComplexity;
        return Math.max(1, baseComplexity + variation);
      });

      const averageComplexity = monthlyComplexities.reduce((sum, c) => sum + c, 0) / monthlyComplexities.length;
      trend.push(Math.round(averageComplexity * 100) / 100);
    }

    return trend;
  }

  /**
   * Calculate average change frequency trend
   */
  private calculateAverageChangeFrequencyTrend(artifacts: CodeArtifact[]): number[] {
    const trend: number[] = [];
    
    for (let month = 0; month < 12; month++) {
      const monthlyChanges = artifacts.map(artifact => {
        // Simulate historical change frequency
        const baseFreq = artifact.changeFrequency;
        const variation = (Math.random() - 0.5) * 0.3 * baseFreq;
        return Math.max(0, baseFreq + variation);
      });

      const averageFreq = monthlyChanges.reduce((sum, f) => sum + f, 0) / monthlyChanges.length;
      trend.push(Math.round(averageFreq * 100) / 100);
    }

    return trend;
  }

  /**
   * Calculate average author churn trend
   */
  private calculateAverageAuthorChurnTrend(artifacts: CodeArtifact[]): number[] {
    const trend: number[] = [];
    
    for (let month = 0; month < 12; month++) {
      const monthlyAuthorCounts = artifacts.map(artifact => {
        // Simulate historical author count variation
        const baseCount = artifact.authors.length;
        const variation = Math.floor((Math.random() - 0.5) * 2);
        return Math.max(1, baseCount + variation);
      });

      const averageAuthorCount = monthlyAuthorCounts.reduce((sum, c) => sum + c, 0) / monthlyAuthorCounts.length;
      trend.push(Math.round(averageAuthorCount * 100) / 100);
    }

    return trend;
  }

  /**
   * Check if artifact should be skipped in hotspot analysis
   */
  private shouldSkipArtifact(artifact: CodeArtifact): boolean {
    const skipPatterns = [
      /test/i,
      /spec/i,
      /__tests__/,
      /\.config\./,
      /\.d\.ts$/,
      /node_modules/,
      /dist/,
      /build/,
      /coverage/
    ];

    return skipPatterns.some(pattern => 
      pattern.test(artifact.filePath) || 
      pattern.test(artifact.name)
    );
  }

  /**
   * Get hotspots by severity level
   */
  getHotspotsBySeverity(
    hotspots: CodeHotspot[], 
    severity: CodeHotspot['severity']
  ): CodeHotspot[] {
    return hotspots.filter(h => h.severity === severity);
  }

  /**
   * Get hotspots by type
   */
  getHotspotsByType(
    hotspots: CodeHotspot[], 
    type: CodeHotspot['hotspotType']
  ): CodeHotspot[] {
    return hotspots.filter(h => h.hotspotType === type);
  }

  /**
   * Get top N hotspots by risk score
   */
  getTopHotspots(hotspots: CodeHotspot[], limit: number = 10): CodeHotspot[] {
    return hotspots
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, limit);
  }
}