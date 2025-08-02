import { CoverageAnalyzer } from '../services/coverage-analyzer';
import { TraceabilityService } from '../services/traceability-service';
import { CodebaseAnalysis, CodeArtifact } from '../types';
import { TraceabilityAnalysis } from '../services/traceability-service';

// Mock the TraceabilityService
jest.mock('../services/traceability-service');

describe('CoverageAnalyzer', () => {
  let coverageAnalyzer: CoverageAnalyzer;
  let mockTraceabilityService: jest.Mocked<TraceabilityService>;
  let mockCodebaseAnalysis: CodebaseAnalysis;
  let mockTraceabilityAnalysis: TraceabilityAnalysis;

  beforeEach(() => {
    mockTraceabilityService = new TraceabilityService() as jest.Mocked<TraceabilityService>;
    coverageAnalyzer = new CoverageAnalyzer(mockTraceabilityService);

    // Mock codebase analysis
    mockCodebaseAnalysis = {
      artifacts: [
        {
          id: 'artifact-1',
          filePath: 'src/components/Dashboard.tsx',
          type: 'file',
          name: 'Dashboard',
          position3D: { x: 0, y: 0, z: 0 } as any,
          complexity: 5,
          changeFrequency: 3,
          lastModified: new Date(),
          authors: ['dev1'],
          dependencies: []
        },
        {
          id: 'artifact-2',
          filePath: 'src/services/UserService.ts',
          type: 'file',
          name: 'UserService',
          position3D: { x: 1, y: 0, z: 0 } as any,
          complexity: 8,
          changeFrequency: 2,
          lastModified: new Date(),
          authors: ['dev2'],
          dependencies: []
        },
        {
          id: 'artifact-3',
          filePath: 'src/utils/helpers.ts',
          type: 'file',
          name: 'helpers',
          position3D: { x: 2, y: 0, z: 0 } as any,
          complexity: 2,
          changeFrequency: 1,
          lastModified: new Date(),
          authors: ['dev1'],
          dependencies: []
        }
      ] as CodeArtifact[],
      dependencies: [],
      metrics: {
        totalFiles: 3,
        totalLines: 1000,
        averageComplexity: 5,
        changeFrequency: 2
      }
    };

    // Mock traceability analysis
    mockTraceabilityAnalysis = {
      specResults: [
        {
          specFile: 'requirements.md',
          requirements: ['RF-001', 'RF-002', 'RN-001'],
          taskReferences: []
        }
      ],
      traceabilityLinks: [
        {
          id: 'link-1',
          requirementId: 'RF-001',
          specFile: 'requirements.md',
          codeArtifacts: ['artifact-1'],
          linkType: 'implements',
          confidence: 0.9,
          taskReferences: []
        },
        {
          id: 'link-2',
          requirementId: 'RF-001',
          specFile: 'requirements.md',
          codeArtifacts: ['artifact-1'],
          linkType: 'tests',
          confidence: 0.8,
          taskReferences: []
        },
        {
          id: 'link-3',
          requirementId: 'RF-002',
          specFile: 'requirements.md',
          codeArtifacts: ['artifact-2'],
          linkType: 'implements',
          confidence: 0.6,
          taskReferences: []
        }
      ],
      matrix: [],
      coverage: {
        totalRequirements: 3,
        linkedRequirements: 2,
        coveragePercentage: 66.7,
        gapAnalysis: ['RN-001']
      }
    };

    mockTraceabilityService.analyzeTraceability.mockResolvedValue(mockTraceabilityAnalysis);
    mockTraceabilityService.findOrphanedCode.mockReturnValue([mockCodebaseAnalysis.artifacts[2]]);
  });

  describe('analyzeCoverage', () => {
    it('should perform comprehensive coverage analysis', async () => {
      const result = await coverageAnalyzer.analyzeCoverage('/test/repo', mockCodebaseAnalysis);

      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('gaps');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('visualIndicators');

      expect(mockTraceabilityService.analyzeTraceability).toHaveBeenCalledWith('/test/repo', mockCodebaseAnalysis);
    });

    it('should calculate correct detailed metrics', async () => {
      const result = await coverageAnalyzer.analyzeCoverage('/test/repo', mockCodebaseAnalysis);

      expect(result.metrics).toEqual({
        totalRequirements: 3,
        implementedRequirements: 2, // RF-001, RF-002
        testedRequirements: 1, // RF-001
        documentedRequirements: 0,
        overallCoverage: 66.7, // 2 out of 3 requirements covered
        implementationCoverage: 66.7, // 2 out of 3 implemented
        testCoverage: 33.3, // 1 out of 3 tested
        documentationCoverage: 0
      });
    });

    it('should identify implementation gaps correctly', async () => {
      const result = await coverageAnalyzer.analyzeCoverage('/test/repo', mockCodebaseAnalysis);

      expect(result.gaps.missingImplementations).toEqual(['RN-001']);
      expect(result.gaps.missingTests).toEqual(['RF-002', 'RN-001']);
      expect(result.gaps.missingDocumentation).toEqual(['RF-001', 'RF-002', 'RN-001']);
      expect(result.gaps.orphanedArtifacts).toHaveLength(1);
      expect(result.gaps.orphanedArtifacts[0].id).toBe('artifact-3');
    });

    it('should identify low confidence links', async () => {
      const result = await coverageAnalyzer.analyzeCoverage('/test/repo', mockCodebaseAnalysis);

      expect(result.gaps.lowConfidenceLinks).toHaveLength(1);
      expect(result.gaps.lowConfidenceLinks[0].requirementId).toBe('RF-002');
      expect(result.gaps.lowConfidenceLinks[0].confidence).toBe(0.6);
    });

    it('should generate appropriate recommendations', async () => {
      const result = await coverageAnalyzer.analyzeCoverage('/test/repo', mockCodebaseAnalysis);

      expect(result.recommendations).toContain(
        expect.stringContaining('1 requirements lack implementation links')
      );
      expect(result.recommendations).toContain(
        expect.stringContaining('1 code artifacts are not linked to requirements')
      );
      expect(result.recommendations).toContain(
        expect.stringContaining('1 traceability links have low confidence')
      );
    });

    it('should create visual indicators for gaps and orphans', async () => {
      const result = await coverageAnalyzer.analyzeCoverage('/test/repo', mockCodebaseAnalysis);

      const gapIndicators = result.visualIndicators.filter(i => i.type === 'gap');
      const orphanIndicators = result.visualIndicators.filter(i => i.type === 'orphan');
      const lowConfidenceIndicators = result.visualIndicators.filter(i => i.type === 'low-confidence');

      expect(gapIndicators).toHaveLength(1);
      expect(gapIndicators[0].requirementId).toBe('RN-001');
      expect(gapIndicators[0].severity).toBe('medium'); // RN- requirements are medium priority

      expect(orphanIndicators).toHaveLength(1);
      expect(orphanIndicators[0].artifactId).toBe('artifact-3');

      expect(lowConfidenceIndicators).toHaveLength(1);
      expect(lowConfidenceIndicators[0].requirementId).toBe('RF-002');
    });
  });

  describe('generateCoverageReport', () => {
    it('should generate comprehensive coverage report', async () => {
      const result = await coverageAnalyzer.analyzeCoverage('/test/repo', mockCodebaseAnalysis);
      const report = coverageAnalyzer.generateCoverageReport(result);

      expect(report).toContain('# Coverage Analysis Report');
      expect(report).toContain('## Executive Summary');
      expect(report).toContain('Overall Coverage**: 66.7%');
      expect(report).toContain('Implementation Coverage**: 66.7%');
      expect(report).toContain('Test Coverage**: 33.3%');
      expect(report).toContain('## Gap Analysis');
      expect(report).toContain('Missing Implementations');
      expect(report).toContain('RN-001');
      expect(report).toContain('Orphaned Code Artifacts');
      expect(report).toContain('helpers');
    });

    it('should include recommendations in report', async () => {
      const result = await coverageAnalyzer.analyzeCoverage('/test/repo', mockCodebaseAnalysis);
      const report = coverageAnalyzer.generateCoverageReport(result);

      expect(report).toContain('## Recommendations');
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should include visual indicators summary', async () => {
      const result = await coverageAnalyzer.analyzeCoverage('/test/repo', mockCodebaseAnalysis);
      const report = coverageAnalyzer.generateCoverageReport(result);

      expect(report).toContain('## Visual Indicators');
      expect(report).toContain('gap');
      expect(report).toContain('orphan');
    });
  });

  describe('edge cases', () => {
    it('should handle empty requirements', async () => {
      mockTraceabilityAnalysis.specResults = [];
      mockTraceabilityAnalysis.traceabilityLinks = [];
      mockTraceabilityAnalysis.coverage.totalRequirements = 0;

      const result = await coverageAnalyzer.analyzeCoverage('/test/repo', mockCodebaseAnalysis);

      expect(result.metrics.totalRequirements).toBe(0);
      expect(result.metrics.overallCoverage).toBe(0);
      expect(result.gaps.missingImplementations).toHaveLength(0);
    });

    it('should handle perfect coverage scenario', async () => {
      mockTraceabilityAnalysis.traceabilityLinks = [
        {
          id: 'link-1',
          requirementId: 'RF-001',
          specFile: 'requirements.md',
          codeArtifacts: ['artifact-1'],
          linkType: 'implements',
          confidence: 0.9,
          taskReferences: []
        },
        {
          id: 'link-2',
          requirementId: 'RF-002',
          specFile: 'requirements.md',
          codeArtifacts: ['artifact-2'],
          linkType: 'implements',
          confidence: 0.9,
          taskReferences: []
        },
        {
          id: 'link-3',
          requirementId: 'RN-001',
          specFile: 'requirements.md',
          codeArtifacts: ['artifact-3'],
          linkType: 'implements',
          confidence: 0.9,
          taskReferences: []
        }
      ];
      mockTraceabilityService.findOrphanedCode.mockReturnValue([]);

      const result = await coverageAnalyzer.analyzeCoverage('/test/repo', mockCodebaseAnalysis);

      expect(result.metrics.overallCoverage).toBe(100);
      expect(result.gaps.missingImplementations).toHaveLength(0);
      expect(result.gaps.orphanedArtifacts).toHaveLength(0);
      expect(result.recommendations).not.toContain(
        expect.stringContaining('lack implementation links')
      );
    });

    it('should prioritize functional requirements in recommendations', async () => {
      mockTraceabilityAnalysis.specResults = [
        {
          specFile: 'requirements.md',
          requirements: ['RF-001', 'RF-002', 'RN-001', 'RN-002'],
          taskReferences: []
        }
      ];
      mockTraceabilityAnalysis.traceabilityLinks = [];
      mockTraceabilityAnalysis.coverage.gapAnalysis = ['RF-001', 'RF-002', 'RN-001', 'RN-002'];

      const result = await coverageAnalyzer.analyzeCoverage('/test/repo', mockCodebaseAnalysis);

      const highPriorityRec = result.recommendations.find(rec => 
        rec.includes('High priority') && rec.includes('RF-')
      );
      expect(highPriorityRec).toBeDefined();
      expect(highPriorityRec).toContain('RF-001');
    });
  });
});