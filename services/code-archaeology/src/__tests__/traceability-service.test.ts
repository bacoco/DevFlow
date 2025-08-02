import { TraceabilityService, TraceabilityAnalysis } from '../services/traceability-service';
import { TraceabilityParser } from '../parsers/traceability-parser';
import { CodebaseAnalysis, CodeArtifact } from '../types';

// Mock the TraceabilityParser
jest.mock('../parsers/traceability-parser');
const MockTraceabilityParser = TraceabilityParser as jest.MockedClass<typeof TraceabilityParser>;

describe('TraceabilityService', () => {
  let service: TraceabilityService;
  let mockParser: jest.Mocked<TraceabilityParser>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock parser instance
    mockParser = {
      parseSpecFiles: jest.fn(),
      linkRequirementsToCode: jest.fn(),
      parseTraceabilityMatrix: jest.fn(),
      updateTraceabilityMatrix: jest.fn(),
      calculateLinkConfidence: jest.fn()
    } as any;

    // Mock the constructor to return our mock instance
    MockTraceabilityParser.mockImplementation(() => mockParser);

    service = new TraceabilityService({
      confidenceThreshold: 0.7,
      autoUpdateMatrix: true
    });
  });

  describe('analyzeTraceability', () => {
    it('should perform complete traceability analysis', async () => {
      const mockCodebaseAnalysis: CodebaseAnalysis = {
        id: 'test-analysis',
        repositoryPath: '/test/repo',
        analyzedAt: new Date(),
        totalFiles: 2,
        totalFunctions: 5,
        totalClasses: 3,
        totalInterfaces: 1,
        artifacts: [
          {
            id: 'auth-service-1',
            filePath: '/src/services/auth-service.ts',
            type: 'class',
            name: 'AuthService',
            position3D: { x: 0, y: 0, z: 0 },
            complexity: 5,
            changeFrequency: 0.3,
            lastModified: new Date(),
            authors: ['dev1'],
            dependencies: [],
            startLine: 1,
            endLine: 50,
            size: 50,
            metadata: {}
          }
        ],
        dependencies: { artifacts: [], relations: [] },
        fileAnalyses: [],
        summary: {
          totalLinesOfCode: 100,
          averageComplexity: 3,
          mostComplexFiles: [],
          dependencyHotspots: []
        }
      };

      const mockSpecResults = [
        {
          specFile: '/test/tasks.md',
          requirements: ['RF-001', 'RF-002'],
          taskReferences: [
            {
              requirementId: 'RF-001',
              taskId: '1.1',
              taskDescription: 'Create authentication service',
              confidence: 0.8
            }
          ]
        }
      ];

      const mockTraceabilityLinks = [
        {
          requirementId: 'RF-001',
          specFile: '/test/tasks.md',
          codeArtifacts: ['auth-service-1'],
          linkType: 'implements' as const,
          confidence: 0.85,
          taskReferences: mockSpecResults[0].taskReferences
        }
      ];

      const mockMatrix = [
        {
          requirementId: 'RF-001',
          codeArtifacts: ['auth-service-1'],
          coverage: 0.2
        }
      ];

      // Setup mocks
      mockParser.parseSpecFiles.mockResolvedValue(mockSpecResults);
      mockParser.linkRequirementsToCode.mockReturnValue(mockTraceabilityLinks);
      mockParser.parseTraceabilityMatrix.mockResolvedValue(mockMatrix);
      mockParser.updateTraceabilityMatrix.mockResolvedValue();

      const result = await service.analyzeTraceability('/test/repo', mockCodebaseAnalysis);

      expect(result).toBeDefined();
      expect(result.specResults).toEqual(mockSpecResults);
      expect(result.traceabilityLinks).toEqual(mockTraceabilityLinks);
      expect(result.matrix).toEqual(mockMatrix);
      expect(result.coverage.totalRequirements).toBe(2);
      expect(result.coverage.linkedRequirements).toBe(1);
      expect(result.coverage.coveragePercentage).toBe(50);
      expect(result.coverage.gapAnalysis).toContain('RF-002');

      // Verify parser methods were called
      expect(mockParser.parseSpecFiles).toHaveBeenCalledWith('/test/repo');
      expect(mockParser.linkRequirementsToCode).toHaveBeenCalledWith(mockSpecResults, mockCodebaseAnalysis.artifacts);
      expect(mockParser.updateTraceabilityMatrix).toHaveBeenCalled();
    });

    it('should handle empty spec results', async () => {
      const mockCodebaseAnalysis: CodebaseAnalysis = {
        id: 'test-analysis',
        repositoryPath: '/test/repo',
        analyzedAt: new Date(),
        totalFiles: 0,
        totalFunctions: 0,
        totalClasses: 0,
        totalInterfaces: 0,
        artifacts: [],
        dependencies: { artifacts: [], relations: [] },
        fileAnalyses: [],
        summary: {
          totalLinesOfCode: 0,
          averageComplexity: 0,
          mostComplexFiles: [],
          dependencyHotspots: []
        }
      };

      mockParser.parseSpecFiles.mockResolvedValue([]);
      mockParser.linkRequirementsToCode.mockReturnValue([]);
      mockParser.parseTraceabilityMatrix.mockResolvedValue([]);
      mockParser.updateTraceabilityMatrix.mockResolvedValue();

      const result = await service.analyzeTraceability('/test/repo', mockCodebaseAnalysis);

      expect(result.coverage.totalRequirements).toBe(0);
      expect(result.coverage.linkedRequirements).toBe(0);
      expect(result.coverage.coveragePercentage).toBe(0);
      expect(result.coverage.gapAnalysis).toEqual([]);
    });
  });

  describe('findImplementationGaps', () => {
    it('should identify requirements without implementations', () => {
      const analysis: TraceabilityAnalysis = {
        specResults: [
          {
            specFile: '/test/requirements.md',
            requirements: ['RF-001', 'RF-002', 'RF-003'],
            taskReferences: []
          }
        ],
        traceabilityLinks: [
          {
            requirementId: 'RF-001',
            specFile: '/test/tasks.md',
            codeArtifacts: ['artifact-1'],
            linkType: 'implements',
            confidence: 0.8,
            taskReferences: []
          }
        ],
        matrix: [],
        coverage: {
          totalRequirements: 3,
          linkedRequirements: 1,
          coveragePercentage: 33.33,
          gapAnalysis: ['RF-002', 'RF-003']
        }
      };

      const gaps = service.findImplementationGaps(analysis);

      expect(gaps).toEqual(['RF-002', 'RF-003']);
    });

    it('should return empty array when all requirements are implemented', () => {
      const analysis: TraceabilityAnalysis = {
        specResults: [
          {
            specFile: '/test/requirements.md',
            requirements: ['RF-001'],
            taskReferences: []
          }
        ],
        traceabilityLinks: [
          {
            requirementId: 'RF-001',
            specFile: '/test/tasks.md',
            codeArtifacts: ['artifact-1'],
            linkType: 'implements',
            confidence: 0.8,
            taskReferences: []
          }
        ],
        matrix: [],
        coverage: {
          totalRequirements: 1,
          linkedRequirements: 1,
          coveragePercentage: 100,
          gapAnalysis: []
        }
      };

      const gaps = service.findImplementationGaps(analysis);

      expect(gaps).toEqual([]);
    });
  });

  describe('findOrphanedCode', () => {
    it('should identify code artifacts not linked to any requirements', () => {
      const codebaseAnalysis: CodebaseAnalysis = {
        id: 'test',
        repositoryPath: '/test',
        analyzedAt: new Date(),
        totalFiles: 3,
        totalFunctions: 6,
        totalClasses: 2,
        totalInterfaces: 1,
        artifacts: [
          {
            id: 'linked-artifact',
            filePath: '/src/linked.ts',
            type: 'function',
            name: 'linkedFunction',
            position3D: { x: 0, y: 0, z: 0 },
            complexity: 2,
            changeFrequency: 0.1,
            lastModified: new Date(),
            authors: ['dev1'],
            dependencies: [],
            startLine: 1,
            endLine: 10,
            size: 10,
            metadata: {}
          },
          {
            id: 'orphaned-artifact',
            filePath: '/src/orphaned.ts',
            type: 'class',
            name: 'OrphanedClass',
            position3D: { x: 1, y: 0, z: 0 },
            complexity: 3,
            changeFrequency: 0.2,
            lastModified: new Date(),
            authors: ['dev2'],
            dependencies: [],
            startLine: 1,
            endLine: 20,
            size: 20,
            metadata: {}
          },
          {
            id: 'test-artifact',
            filePath: '/src/__tests__/test.ts',
            type: 'function',
            name: 'testFunction',
            position3D: { x: 2, y: 0, z: 0 },
            complexity: 1,
            changeFrequency: 0.05,
            lastModified: new Date(),
            authors: ['dev1'],
            dependencies: [],
            startLine: 1,
            endLine: 5,
            size: 5,
            metadata: {}
          }
        ],
        dependencies: { artifacts: [], relations: [] },
        fileAnalyses: [],
        summary: {
          totalLinesOfCode: 35,
          averageComplexity: 2,
          mostComplexFiles: [],
          dependencyHotspots: []
        }
      };

      const traceabilityLinks = [
        {
          requirementId: 'RF-001',
          specFile: '/test/tasks.md',
          codeArtifacts: ['linked-artifact'],
          linkType: 'implements' as const,
          confidence: 0.8,
          taskReferences: []
        }
      ];

      const orphaned = service.findOrphanedCode(codebaseAnalysis, traceabilityLinks);

      expect(orphaned).toHaveLength(1);
      expect(orphaned[0].id).toBe('orphaned-artifact');
      // Test artifacts should be excluded
      expect(orphaned.find(a => a.id === 'test-artifact')).toBeUndefined();
    });
  });

  describe('generateTraceabilityReport', () => {
    it('should generate comprehensive traceability report', () => {
      const analysis: TraceabilityAnalysis = {
        specResults: [],
        traceabilityLinks: [
          {
            requirementId: 'RF-001',
            specFile: '/test/tasks.md',
            codeArtifacts: ['artifact-1', 'artifact-2'],
            linkType: 'implements',
            confidence: 0.85,
            taskReferences: []
          },
          {
            requirementId: 'RF-002',
            specFile: '/test/tasks.md',
            codeArtifacts: ['artifact-3'],
            linkType: 'tests',
            confidence: 0.75,
            taskReferences: []
          }
        ],
        matrix: [],
        coverage: {
          totalRequirements: 3,
          linkedRequirements: 2,
          coveragePercentage: 66.67,
          gapAnalysis: ['RF-003']
        }
      };

      const report = service.generateTraceabilityReport(analysis);

      expect(report).toContain('# Traceability Analysis Report');
      expect(report).toContain('**Total Requirements**: 3');
      expect(report).toContain('**Linked Requirements**: 2');
      expect(report).toContain('**Coverage Percentage**: 66.7%');
      expect(report).toContain('## High Confidence Links');
      expect(report).toContain('**RF-001** (85.0% confidence)');
      expect(report).toContain('## Implementation Gaps');
      expect(report).toContain('RF-003');
      expect(report).toContain('## Recommendations');
    });

    it('should include appropriate recommendations based on coverage', () => {
      const lowCoverageAnalysis: TraceabilityAnalysis = {
        specResults: [],
        traceabilityLinks: [
          {
            requirementId: 'RF-001',
            specFile: '/test/tasks.md',
            codeArtifacts: ['artifact-1'],
            linkType: 'implements',
            confidence: 0.6, // Low confidence
            taskReferences: []
          }
        ],
        matrix: [],
        coverage: {
          totalRequirements: 10,
          linkedRequirements: 1,
          coveragePercentage: 10, // Low coverage
          gapAnalysis: ['RF-002', 'RF-003', 'RF-004', 'RF-005', 'RF-006', 'RF-007', 'RF-008', 'RF-009', 'RF-010']
        }
      };

      const report = service.generateTraceabilityReport(lowCoverageAnalysis);

      expect(report).toContain('**Low Coverage**');
      expect(report).toContain('**Low Confidence**');
      expect(report).toContain('**Implementation Gaps**');
    });
  });

  describe('validateTraceabilityLinks', () => {
    it('should validate links and identify issues', () => {
      const links = [
        {
          requirementId: 'RF-001',
          specFile: '/test/tasks.md',
          codeArtifacts: ['artifact-1'],
          linkType: 'implements' as const,
          confidence: 0.85, // Good confidence
          taskReferences: []
        },
        {
          requirementId: 'INVALID-ID',
          specFile: '/test/tasks.md',
          codeArtifacts: ['artifact-2'],
          linkType: 'implements' as const,
          confidence: 0.9,
          taskReferences: []
        },
        {
          requirementId: 'RF-003',
          specFile: '/test/tasks.md',
          codeArtifacts: [],
          linkType: 'implements' as const,
          confidence: 0.8,
          taskReferences: []
        },
        {
          requirementId: 'RF-004',
          specFile: '/test/tasks.md',
          codeArtifacts: ['artifact-4'],
          linkType: 'implements' as const,
          confidence: 0.5, // Low confidence
          taskReferences: []
        }
      ];

      const result = service.validateTraceabilityLinks(links);

      expect(result.valid).toHaveLength(1);
      expect(result.valid[0].requirementId).toBe('RF-001');

      expect(result.issues).toHaveLength(3);
      expect(result.issues.find(i => i.issue.includes('Invalid requirement ID format'))).toBeDefined();
      expect(result.issues.find(i => i.issue.includes('No linked code artifacts found'))).toBeDefined();
      expect(result.issues.find(i => i.issue.includes('Low confidence score'))).toBeDefined();
    });

    it('should handle empty links array', () => {
      const result = service.validateTraceabilityLinks([]);

      expect(result.valid).toEqual([]);
      expect(result.issues).toEqual([]);
    });
  });
});