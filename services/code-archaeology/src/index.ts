export { ASTParser } from './parsers/ast-parser';
export { ComplexityCalculator } from './parsers/complexity-calculator';
export { DependencyAnalyzer } from './parsers/dependency-analyzer';
export { TraceabilityParser } from './parsers/traceability-parser';
export { GitCodeArchaeologyIntegration } from './integrations/git-integration';
export { TraceabilityService } from './services/traceability-service';

export * from './types';

// Main service class that orchestrates AST parsing and analysis
import { ASTParser } from './parsers/ast-parser';
import { DependencyAnalyzer } from './parsers/dependency-analyzer';
import { GitCodeArchaeologyIntegration, GitIntegrationConfig, EnhancedCodebaseAnalysis } from './integrations/git-integration';
import { TraceabilityService, TraceabilityAnalysis } from './services/traceability-service';
import { 
  ASTParserConfig, 
  CodebaseAnalysis, 
  FileAnalysis, 
  DependencyGraph,
  CodeArtifact 
} from './types';

export class CodeArchaeologyService {
  private astParser: ASTParser;
  private dependencyAnalyzer: DependencyAnalyzer;
  private gitIntegration?: GitCodeArchaeologyIntegration;
  private traceabilityService: TraceabilityService;

  constructor(config: ASTParserConfig) {
    this.astParser = new ASTParser(config);
    this.dependencyAnalyzer = new DependencyAnalyzer();
    this.traceabilityService = new TraceabilityService();
  }

  /**
   * Initialize Git integration for enhanced analysis
   */
  initializeGitIntegration(repositoryPath: string): void {
    try {
      this.gitIntegration = new GitCodeArchaeologyIntegration(repositoryPath);
      console.log('Git integration initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize Git integration:', error);
      this.gitIntegration = undefined;
    }
  }

  async analyzeCodebase(repositoryPath: string): Promise<CodebaseAnalysis> {
    const startTime = Date.now();
    
    // Initialize Git integration if not already done
    if (!this.gitIntegration) {
      this.initializeGitIntegration(repositoryPath);
    }
    
    // Parse all files in the repository
    const fileAnalyses = await this.astParser.analyzeDirectory(repositoryPath);
    
    // Build dependency graph
    const dependencies = this.dependencyAnalyzer.analyzeDependencies(fileAnalyses);
    
    // Collect all artifacts
    const artifacts = this.collectAllArtifacts(fileAnalyses);
    
    // Calculate summary statistics
    const summary = this.calculateSummary(fileAnalyses, dependencies);
    
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: analysisId,
      repositoryPath,
      analyzedAt: new Date(),
      totalFiles: fileAnalyses.length,
      totalFunctions: fileAnalyses.reduce((sum, f) => sum + f.functions.length, 0),
      totalClasses: fileAnalyses.reduce((sum, f) => sum + f.classes.length, 0),
      totalInterfaces: fileAnalyses.reduce((sum, f) => sum + f.interfaces.length, 0),
      artifacts,
      dependencies,
      fileAnalyses,
      summary
    };
  }

  /**
   * Analyze codebase with enhanced Git history integration
   */
  async analyzeCodebaseWithGitHistory(
    repositoryPath: string, 
    gitConfig: GitIntegrationConfig = {}
  ): Promise<EnhancedCodebaseAnalysis> {
    // First perform standard codebase analysis
    const baseAnalysis = await this.analyzeCodebase(repositoryPath);
    
    // If Git integration is available, enhance with Git data
    if (this.gitIntegration) {
      console.log('Enhancing analysis with Git history data...');
      return await this.gitIntegration.enhanceCodebaseAnalysis(baseAnalysis, gitConfig);
    } else {
      console.warn('Git integration not available, returning base analysis');
      // Return base analysis with empty Git data
      const enhancedArtifacts = baseAnalysis.artifacts.map(artifact => ({
        ...artifact,
        gitMetadata: {
          totalCommits: 0,
          uniqueAuthors: 0,
          firstCommit: undefined,
          lastCommit: artifact.lastModified,
          averageLinesChanged: 0,
          hotspotScore: 0,
          recentActivity: false,
          authorList: []
        }
      }));
      
      return {
        ...baseAnalysis,
        artifacts: enhancedArtifacts,
        gitAnalysis: {
          repositoryPath,
          analyzedAt: new Date(),
          totalCommits: 0,
          dateRange: { earliest: new Date(), latest: new Date() },
          commits: [],
          authorContributions: new Map(),
          fileChangeFrequencies: new Map(),
          hotspotFiles: []
        },
        hotspotArtifacts: []
      } as EnhancedCodebaseAnalysis;
    }
  }

  async analyzeFile(filePath: string): Promise<FileAnalysis | null> {
    return this.astParser.analyzeFile(filePath);
  }

  /**
   * Analyze traceability between requirements and code implementations
   */
  async analyzeTraceability(repositoryPath: string): Promise<TraceabilityAnalysis> {
    // First perform codebase analysis to get artifacts
    const codebaseAnalysis = await this.analyzeCodebase(repositoryPath);
    
    // Then perform traceability analysis
    return this.traceabilityService.analyzeTraceability(repositoryPath, codebaseAnalysis);
  }

  /**
   * Generate comprehensive traceability report
   */
  async generateTraceabilityReport(repositoryPath: string): Promise<string> {
    const analysis = await this.analyzeTraceability(repositoryPath);
    return this.traceabilityService.generateTraceabilityReport(analysis);
  }

  private collectAllArtifacts(fileAnalyses: FileAnalysis[]): CodeArtifact[] {
    const artifacts: CodeArtifact[] = [];
    
    for (const analysis of fileAnalyses) {
      artifacts.push(...analysis.artifacts);
    }
    
    return artifacts;
  }

  private calculateSummary(fileAnalyses: FileAnalysis[], dependencies: DependencyGraph) {
    const totalLinesOfCode = fileAnalyses.reduce((sum, f) => sum + f.linesOfCode, 0);
    
    const complexities = fileAnalyses.map(f => f.complexity.cyclomaticComplexity);
    const averageComplexity = complexities.length > 0 
      ? complexities.reduce((sum, c) => sum + c, 0) / complexities.length 
      : 0;
    
    // Find most complex files
    const fileComplexities = fileAnalyses.map(f => ({
      filePath: f.filePath,
      complexity: f.complexity.cyclomaticComplexity
    }));
    fileComplexities.sort((a, b) => b.complexity - a.complexity);
    const mostComplexFiles = fileComplexities.slice(0, 5).map(f => f.filePath);
    
    // Find dependency hotspots (artifacts with most dependencies)
    const dependencyCount = new Map<string, number>();
    for (const relation of dependencies.relations) {
      const count = dependencyCount.get(relation.fromArtifactId) || 0;
      dependencyCount.set(relation.fromArtifactId, count + 1);
    }
    
    const hotspots = Array.from(dependencyCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([artifactId]) => {
        const artifact = dependencies.artifacts.find(a => a.id === artifactId);
        return artifact ? `${artifact.filePath}:${artifact.name}` : artifactId;
      });
    
    return {
      totalLinesOfCode,
      averageComplexity,
      mostComplexFiles,
      dependencyHotspots: hotspots
    };
  }
}

// Default configuration for the service
export const defaultConfig: ASTParserConfig = {
  includePatterns: [
    '**/*.ts',
    '**/*.tsx', 
    '**/*.js',
    '**/*.jsx'
  ],
  excludePatterns: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '**/*.test.ts',
    '**/*.test.js',
    '**/*.spec.ts',
    '**/*.spec.js',
    '**/*.d.ts'
  ],
  maxFileSize: 1024 * 1024, // 1MB
  calculateComplexity: true,
  analyzeDependencies: true,
  includeComments: false
};