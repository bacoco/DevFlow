import * as path from 'path';
import { TraceabilityParser, TraceabilityLink, SpecParsingResult, TraceabilityMatrix } from '../parsers/traceability-parser';
import { CodeArtifact, CodebaseAnalysis } from '../types';

export interface TraceabilityAnalysis {
  specResults: SpecParsingResult[];
  traceabilityLinks: TraceabilityLink[];
  matrix: TraceabilityMatrix[];
  coverage: {
    totalRequirements: number;
    linkedRequirements: number;
    coveragePercentage: number;
    gapAnalysis: string[];
  };
}

export interface TraceabilityServiceConfig {
  specsDirectory?: string;
  confidenceThreshold?: number;
  autoUpdateMatrix?: boolean;
}

export class TraceabilityService {
  private parser: TraceabilityParser;
  private config: TraceabilityServiceConfig;

  constructor(config: TraceabilityServiceConfig = {}) {
    this.config = {
      specsDirectory: '.kiro/specs',
      confidenceThreshold: 0.7,
      autoUpdateMatrix: true,
      ...config
    };

    this.parser = new TraceabilityParser({
      specsDirectory: this.config.specsDirectory,
      confidenceThreshold: this.config.confidenceThreshold
    });
  }

  /**
   * Perform complete traceability analysis linking specs to code
   */
  async analyzeTraceability(
    repositoryPath: string,
    codebaseAnalysis: CodebaseAnalysis
  ): Promise<TraceabilityAnalysis> {
    console.log('Starting traceability analysis...');

    // Parse spec files to extract requirements and task references
    const specResults = await this.parser.parseSpecFiles(repositoryPath);
    console.log(`Parsed ${specResults.length} spec files`);

    // Link requirements to code artifacts
    const traceabilityLinks = this.parser.linkRequirementsToCode(
      specResults,
      codebaseAnalysis.artifacts
    );
    console.log(`Generated ${traceabilityLinks.length} traceability links`);

    // Parse existing traceability matrix
    const traceabilityPath = path.join(repositoryPath, this.config.specsDirectory!, 'developer-productivity-dashboard', 'traceability.md');
    const existingMatrix = await this.parser.parseTraceabilityMatrix(traceabilityPath);

    // Update matrix with new links if auto-update is enabled
    if (this.config.autoUpdateMatrix) {
      await this.parser.updateTraceabilityMatrix(traceabilityPath, traceabilityLinks);
    }

    // Parse updated matrix
    const updatedMatrix = await this.parser.parseTraceabilityMatrix(traceabilityPath);

    // Calculate coverage metrics
    const coverage = this.calculateCoverage(specResults, traceabilityLinks, updatedMatrix);

    return {
      specResults,
      traceabilityLinks,
      matrix: updatedMatrix,
      coverage
    };
  }

  /**
   * Find requirements without corresponding code implementations
   */
  findImplementationGaps(analysis: TraceabilityAnalysis): string[] {
    const allRequirements = new Set<string>();
    const linkedRequirements = new Set<string>();

    // Collect all requirements from spec files
    for (const specResult of analysis.specResults) {
      for (const req of specResult.requirements) {
        allRequirements.add(req);
      }
    }

    // Collect linked requirements
    for (const link of analysis.traceabilityLinks) {
      linkedRequirements.add(link.requirementId);
    }

    // Find gaps
    const gaps: string[] = [];
    for (const req of allRequirements) {
      if (!linkedRequirements.has(req)) {
        gaps.push(req);
      }
    }

    return gaps.sort();
  }

  /**
   * Find code artifacts that don't trace back to any requirements (orphaned code)
   */
  findOrphanedCode(
    codebaseAnalysis: CodebaseAnalysis,
    traceabilityLinks: TraceabilityLink[]
  ): CodeArtifact[] {
    const linkedArtifactIds = new Set<string>();
    
    for (const link of traceabilityLinks) {
      for (const artifactId of link.codeArtifacts) {
        linkedArtifactIds.add(artifactId);
      }
    }

    return codebaseAnalysis.artifacts.filter(artifact => 
      !linkedArtifactIds.has(artifact.id) && 
      artifact.type !== 'import' && // Exclude imports as they're usually not directly traceable
      !artifact.filePath.includes('test') && // Exclude test files
      !artifact.filePath.includes('spec') &&
      !artifact.filePath.includes('__tests__')
    );
  }

  /**
   * Generate traceability report with insights and recommendations
   */
  generateTraceabilityReport(analysis: TraceabilityAnalysis): string {
    const { coverage, traceabilityLinks } = analysis;
    
    let report = '# Traceability Analysis Report\n\n';
    
    // Coverage summary
    report += '## Coverage Summary\n\n';
    report += `- **Total Requirements**: ${coverage.totalRequirements}\n`;
    report += `- **Linked Requirements**: ${coverage.linkedRequirements}\n`;
    report += `- **Coverage Percentage**: ${coverage.coveragePercentage.toFixed(1)}%\n\n`;

    // High confidence links
    const highConfidenceLinks = traceabilityLinks.filter(link => link.confidence >= 0.8);
    report += `## High Confidence Links (${highConfidenceLinks.length})\n\n`;
    
    for (const link of highConfidenceLinks.slice(0, 10)) { // Show top 10
      report += `- **${link.requirementId}** (${(link.confidence * 100).toFixed(1)}% confidence)\n`;
      report += `  - Artifacts: ${link.codeArtifacts.length}\n`;
      report += `  - Type: ${link.linkType}\n\n`;
    }

    // Implementation gaps
    if (coverage.gapAnalysis.length > 0) {
      report += `## Implementation Gaps (${coverage.gapAnalysis.length})\n\n`;
      report += 'Requirements without linked implementations:\n\n';
      
      for (const gap of coverage.gapAnalysis.slice(0, 10)) {
        report += `- ${gap}\n`;
      }
      
      if (coverage.gapAnalysis.length > 10) {
        report += `\n... and ${coverage.gapAnalysis.length - 10} more\n`;
      }
      report += '\n';
    }

    // Recommendations
    report += '## Recommendations\n\n';
    
    if (coverage.coveragePercentage < 70) {
      report += '- **Low Coverage**: Consider reviewing task descriptions for clearer requirement references\n';
    }
    
    if (highConfidenceLinks.length < traceabilityLinks.length * 0.5) {
      report += '- **Low Confidence**: Many links have low confidence scores - manual review recommended\n';
    }
    
    if (coverage.gapAnalysis.length > 0) {
      report += '- **Implementation Gaps**: Focus on implementing missing requirements or updating traceability\n';
    }

    return report;
  }

  /**
   * Validate traceability links and identify potential issues
   */
  validateTraceabilityLinks(links: TraceabilityLink[]): {
    valid: TraceabilityLink[];
    issues: { link: TraceabilityLink; issue: string }[];
  } {
    const valid: TraceabilityLink[] = [];
    const issues: { link: TraceabilityLink; issue: string }[] = [];

    for (const link of links) {
      // Check confidence threshold
      if (link.confidence < this.config.confidenceThreshold!) {
        issues.push({
          link,
          issue: `Low confidence score: ${(link.confidence * 100).toFixed(1)}%`
        });
        continue;
      }

      // Check if artifacts exist
      if (link.codeArtifacts.length === 0) {
        issues.push({
          link,
          issue: 'No linked code artifacts found'
        });
        continue;
      }

      // Check requirement ID format
      if (!link.requirementId.match(/^(RF|RN)-\d+[a-z]?$/)) {
        issues.push({
          link,
          issue: 'Invalid requirement ID format'
        });
        continue;
      }

      valid.push(link);
    }

    return { valid, issues };
  }

  private calculateCoverage(
    specResults: SpecParsingResult[],
    traceabilityLinks: TraceabilityLink[],
    matrix: TraceabilityMatrix[]
  ): TraceabilityAnalysis['coverage'] {
    // Collect all unique requirements
    const allRequirements = new Set<string>();
    for (const specResult of specResults) {
      for (const req of specResult.requirements) {
        allRequirements.add(req);
      }
    }

    // Count linked requirements
    const linkedRequirements = new Set<string>();
    for (const link of traceabilityLinks) {
      linkedRequirements.add(link.requirementId);
    }

    // Find gaps
    const gapAnalysis: string[] = [];
    for (const req of allRequirements) {
      if (!linkedRequirements.has(req)) {
        gapAnalysis.push(req);
      }
    }

    const totalRequirements = allRequirements.size;
    const linkedCount = linkedRequirements.size;
    const coveragePercentage = totalRequirements > 0 ? (linkedCount / totalRequirements) * 100 : 0;

    return {
      totalRequirements,
      linkedRequirements: linkedCount,
      coveragePercentage,
      gapAnalysis: gapAnalysis.sort()
    };
  }
}