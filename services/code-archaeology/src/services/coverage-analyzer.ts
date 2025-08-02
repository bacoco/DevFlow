import { TraceabilityAnalysis, TraceabilityService } from './traceability-service';
import { CodeArtifact, CodebaseAnalysis } from '../types';
import { TraceabilityLink, TraceabilityMatrix } from '../parsers/traceability-parser';

export interface CoverageMetrics {
  totalRequirements: number;
  implementedRequirements: number;
  testedRequirements: number;
  documentedRequirements: number;
  overallCoverage: number;
  implementationCoverage: number;
  testCoverage: number;
  documentationCoverage: number;
}

export interface GapAnalysis {
  missingImplementations: string[];
  missingTests: string[];
  missingDocumentation: string[];
  orphanedArtifacts: CodeArtifact[];
  lowConfidenceLinks: TraceabilityLink[];
}

export interface CoverageAnalysisResult {
  metrics: CoverageMetrics;
  gaps: GapAnalysis;
  recommendations: string[];
  visualIndicators: VisualIndicator[];
}

export interface VisualIndicator {
  id: string;
  type: 'gap' | 'orphan' | 'low-confidence' | 'complete';
  requirementId?: string;
  artifactId?: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  position?: { x: number; y: number; z: number };
}

export class CoverageAnalyzer {
  private traceabilityService: TraceabilityService;

  constructor(traceabilityService: TraceabilityService) {
    this.traceabilityService = traceabilityService;
  }

  /**
   * Perform comprehensive coverage analysis
   */
  async analyzeCoverage(
    repositoryPath: string,
    codebaseAnalysis: CodebaseAnalysis
  ): Promise<CoverageAnalysisResult> {
    // Get traceability analysis
    const traceabilityAnalysis = await this.traceabilityService.analyzeTraceability(
      repositoryPath,
      codebaseAnalysis
    );

    // Calculate detailed coverage metrics
    const metrics = this.calculateDetailedMetrics(traceabilityAnalysis);

    // Perform gap analysis
    const gaps = this.performGapAnalysis(traceabilityAnalysis, codebaseAnalysis);

    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics, gaps);

    // Create visual indicators
    const visualIndicators = this.createVisualIndicators(gaps, traceabilityAnalysis);

    return {
      metrics,
      gaps,
      recommendations,
      visualIndicators
    };
  }

  /**
   * Calculate detailed coverage metrics by requirement type
   */
  private calculateDetailedMetrics(analysis: TraceabilityAnalysis): CoverageMetrics {
    const allRequirements = new Set<string>();
    const implementedRequirements = new Set<string>();
    const testedRequirements = new Set<string>();
    const documentedRequirements = new Set<string>();

    // Collect all requirements
    for (const specResult of analysis.specResults) {
      for (const req of specResult.requirements) {
        allRequirements.add(req);
      }
    }

    // Categorize linked requirements by type
    for (const link of analysis.traceabilityLinks) {
      switch (link.linkType) {
        case 'implements':
          implementedRequirements.add(link.requirementId);
          break;
        case 'tests':
          testedRequirements.add(link.requirementId);
          break;
        case 'documents':
          documentedRequirements.add(link.requirementId);
          break;
      }
    }

    const totalRequirements = allRequirements.size;
    const implementedCount = implementedRequirements.size;
    const testedCount = testedRequirements.size;
    const documentedCount = documentedRequirements.size;

    // Calculate coverage percentages
    const implementationCoverage = totalRequirements > 0 ? (implementedCount / totalRequirements) * 100 : 0;
    const testCoverage = totalRequirements > 0 ? (testedCount / totalRequirements) * 100 : 0;
    const documentationCoverage = totalRequirements > 0 ? (documentedCount / totalRequirements) * 100 : 0;

    // Overall coverage considers a requirement covered if it has any type of link
    const coveredRequirements = new Set([
      ...implementedRequirements,
      ...testedRequirements,
      ...documentedRequirements
    ]);
    const overallCoverage = totalRequirements > 0 ? (coveredRequirements.size / totalRequirements) * 100 : 0;

    return {
      totalRequirements,
      implementedRequirements: implementedCount,
      testedRequirements: testedCount,
      documentedRequirements: documentedCount,
      overallCoverage,
      implementationCoverage,
      testCoverage,
      documentationCoverage
    };
  }

  /**
   * Perform detailed gap analysis
   */
  private performGapAnalysis(
    analysis: TraceabilityAnalysis,
    codebaseAnalysis: CodebaseAnalysis
  ): GapAnalysis {
    const allRequirements = new Set<string>();
    const implementedRequirements = new Set<string>();
    const testedRequirements = new Set<string>();
    const documentedRequirements = new Set<string>();

    // Collect all requirements and categorize linked ones
    for (const specResult of analysis.specResults) {
      for (const req of specResult.requirements) {
        allRequirements.add(req);
      }
    }

    for (const link of analysis.traceabilityLinks) {
      switch (link.linkType) {
        case 'implements':
          implementedRequirements.add(link.requirementId);
          break;
        case 'tests':
          testedRequirements.add(link.requirementId);
          break;
        case 'documents':
          documentedRequirements.add(link.requirementId);
          break;
      }
    }

    // Find gaps
    const missingImplementations: string[] = [];
    const missingTests: string[] = [];
    const missingDocumentation: string[] = [];

    for (const req of allRequirements) {
      if (!implementedRequirements.has(req)) {
        missingImplementations.push(req);
      }
      if (!testedRequirements.has(req)) {
        missingTests.push(req);
      }
      if (!documentedRequirements.has(req)) {
        missingDocumentation.push(req);
      }
    }

    // Find orphaned artifacts
    const orphanedArtifacts = this.traceabilityService.findOrphanedCode(
      codebaseAnalysis,
      analysis.traceabilityLinks
    );

    // Find low confidence links
    const lowConfidenceLinks = analysis.traceabilityLinks.filter(
      link => link.confidence < 0.7
    );

    return {
      missingImplementations: missingImplementations.sort(),
      missingTests: missingTests.sort(),
      missingDocumentation: missingDocumentation.sort(),
      orphanedArtifacts,
      lowConfidenceLinks
    };
  }

  /**
   * Generate actionable recommendations based on analysis
   */
  private generateRecommendations(metrics: CoverageMetrics, gaps: GapAnalysis): string[] {
    const recommendations: string[] = [];

    // Coverage-based recommendations
    if (metrics.overallCoverage < 50) {
      recommendations.push('Critical: Overall coverage is below 50%. Review task descriptions for clearer requirement references.');
    } else if (metrics.overallCoverage < 70) {
      recommendations.push('Warning: Overall coverage is below 70%. Consider improving traceability documentation.');
    }

    if (metrics.implementationCoverage < 60) {
      recommendations.push('Focus on implementing missing requirements or updating traceability links for existing implementations.');
    }

    if (metrics.testCoverage < 40) {
      recommendations.push('Test coverage is low. Consider adding tests that reference specific requirements.');
    }

    // Gap-based recommendations
    if (gaps.missingImplementations.length > 0) {
      const count = gaps.missingImplementations.length;
      recommendations.push(`${count} requirements lack implementation links. Review: ${gaps.missingImplementations.slice(0, 3).join(', ')}${count > 3 ? '...' : ''}`);
    }

    if (gaps.orphanedArtifacts.length > 0) {
      const count = gaps.orphanedArtifacts.length;
      recommendations.push(`${count} code artifacts are not linked to requirements. Consider refactoring or adding traceability.`);
    }

    if (gaps.lowConfidenceLinks.length > 0) {
      const count = gaps.lowConfidenceLinks.length;
      recommendations.push(`${count} traceability links have low confidence. Manual review recommended.`);
    }

    // Specific actionable items
    if (gaps.missingImplementations.length > 0) {
      const highPriorityReqs = gaps.missingImplementations.filter(req => req.includes('RF-'));
      if (highPriorityReqs.length > 0) {
        recommendations.push(`High priority: Implement functional requirements ${highPriorityReqs.slice(0, 2).join(', ')}`);
      }
    }

    return recommendations;
  }

  /**
   * Create visual indicators for the 3D visualization
   */
  private createVisualIndicators(
    gaps: GapAnalysis,
    analysis: TraceabilityAnalysis
  ): VisualIndicator[] {
    const indicators: VisualIndicator[] = [];

    // Create indicators for missing implementations
    gaps.missingImplementations.forEach((reqId, index) => {
      indicators.push({
        id: `gap-${reqId}`,
        type: 'gap',
        requirementId: reqId,
        severity: reqId.includes('RF-') ? 'high' : 'medium',
        message: `Requirement ${reqId} lacks implementation`,
        position: { x: -10 + (index % 5) * 2, y: 5, z: -5 }
      });
    });

    // Create indicators for orphaned artifacts
    gaps.orphanedArtifacts.forEach((artifact, index) => {
      indicators.push({
        id: `orphan-${artifact.id}`,
        type: 'orphan',
        artifactId: artifact.id,
        severity: artifact.complexity > 10 ? 'high' : 'low',
        message: `Orphaned code: ${artifact.name}`,
        position: artifact.position3D
      });
    });

    // Create indicators for low confidence links
    gaps.lowConfidenceLinks.forEach((link, index) => {
      indicators.push({
        id: `low-conf-${link.requirementId}`,
        type: 'low-confidence',
        requirementId: link.requirementId,
        severity: link.confidence < 0.5 ? 'high' : 'medium',
        message: `Low confidence link: ${link.requirementId} (${Math.round(link.confidence * 100)}%)`,
        position: { x: 10 + (index % 3) * 2, y: 3, z: 5 }
      });
    });

    // Create indicators for well-covered requirements
    const wellCoveredLinks = analysis.traceabilityLinks.filter(
      link => link.confidence >= 0.8 && link.codeArtifacts.length >= 2
    );

    wellCoveredLinks.slice(0, 5).forEach((link, index) => {
      indicators.push({
        id: `complete-${link.requirementId}`,
        type: 'complete',
        requirementId: link.requirementId,
        severity: 'low',
        message: `Well covered: ${link.requirementId}`,
        position: { x: (index % 3) * 3, y: 8, z: 0 }
      });
    });

    return indicators;
  }

  /**
   * Generate coverage report with detailed metrics
   */
  generateCoverageReport(result: CoverageAnalysisResult): string {
    const { metrics, gaps, recommendations } = result;

    let report = '# Coverage Analysis Report\n\n';

    // Executive Summary
    report += '## Executive Summary\n\n';
    report += `- **Overall Coverage**: ${metrics.overallCoverage.toFixed(1)}%\n`;
    report += `- **Implementation Coverage**: ${metrics.implementationCoverage.toFixed(1)}%\n`;
    report += `- **Test Coverage**: ${metrics.testCoverage.toFixed(1)}%\n`;
    report += `- **Documentation Coverage**: ${metrics.documentationCoverage.toFixed(1)}%\n\n`;

    // Detailed Metrics
    report += '## Detailed Metrics\n\n';
    report += `- **Total Requirements**: ${metrics.totalRequirements}\n`;
    report += `- **Implemented**: ${metrics.implementedRequirements}\n`;
    report += `- **Tested**: ${metrics.testedRequirements}\n`;
    report += `- **Documented**: ${metrics.documentedRequirements}\n\n`;

    // Gap Analysis
    report += '## Gap Analysis\n\n';
    
    if (gaps.missingImplementations.length > 0) {
      report += `### Missing Implementations (${gaps.missingImplementations.length})\n\n`;
      gaps.missingImplementations.slice(0, 10).forEach(req => {
        report += `- ${req}\n`;
      });
      if (gaps.missingImplementations.length > 10) {
        report += `\n... and ${gaps.missingImplementations.length - 10} more\n`;
      }
      report += '\n';
    }

    if (gaps.orphanedArtifacts.length > 0) {
      report += `### Orphaned Code Artifacts (${gaps.orphanedArtifacts.length})\n\n`;
      gaps.orphanedArtifacts.slice(0, 10).forEach(artifact => {
        report += `- ${artifact.name} (${artifact.filePath})\n`;
      });
      if (gaps.orphanedArtifacts.length > 10) {
        report += `\n... and ${gaps.orphanedArtifacts.length - 10} more\n`;
      }
      report += '\n';
    }

    // Recommendations
    if (recommendations.length > 0) {
      report += '## Recommendations\n\n';
      recommendations.forEach(rec => {
        report += `- ${rec}\n`;
      });
      report += '\n';
    }

    // Visual Indicators Summary
    const indicatorCounts = result.visualIndicators.reduce((acc, indicator) => {
      acc[indicator.type] = (acc[indicator.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    report += '## Visual Indicators\n\n';
    Object.entries(indicatorCounts).forEach(([type, count]) => {
      report += `- **${type}**: ${count}\n`;
    });

    return report;
  }
}