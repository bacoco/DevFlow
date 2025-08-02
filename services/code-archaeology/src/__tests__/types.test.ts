import {
  CodeArtifact,
  DependencyGraph,
  DependencyRelation,
  ComplexityMetrics,
  FileAnalysis,
  CodebaseAnalysis,
  ASTParserConfig,
  defaultConfig
} from '../types-only';

describe('Code Archaeology Types', () => {
  describe('CodeArtifact', () => {
    it('should have correct structure', () => {
      const artifact: CodeArtifact = {
        id: 'test-id',
        filePath: '/src/test.ts',
        type: 'function',
        name: 'testFunction',
        position3D: { x: 0, y: 0, z: 0 },
        complexity: 5,
        changeFrequency: 0.8,
        lastModified: new Date(),
        authors: ['author1', 'author2'],
        dependencies: ['dependency1'],
        startLine: 1,
        endLine: 10,
        size: 10,
        metadata: { isExported: true }
      };

      expect(artifact.id).toBe('test-id');
      expect(artifact.type).toBe('function');
      expect(artifact.position3D).toEqual({ x: 0, y: 0, z: 0 });
      expect(artifact.dependencies).toContain('dependency1');
    });

    it('should support different artifact types', () => {
      const types: CodeArtifact['type'][] = ['file', 'function', 'class', 'interface', 'variable', 'import'];
      
      types.forEach(type => {
        const artifact: Partial<CodeArtifact> = { type };
        expect(artifact.type).toBe(type);
      });
    });
  });

  describe('DependencyGraph', () => {
    it('should contain artifacts and relations', () => {
      const artifact1: CodeArtifact = {
        id: '1',
        filePath: '/test.ts',
        type: 'function',
        name: 'func1',
        position3D: { x: 0, y: 0, z: 0 },
        complexity: 1,
        changeFrequency: 0,
        lastModified: new Date(),
        authors: [],
        dependencies: [],
        startLine: 1,
        endLine: 5,
        size: 5,
        metadata: {}
      };

      const relation: DependencyRelation = {
        fromArtifactId: '1',
        toArtifactId: '2',
        type: 'calls',
        strength: 0.8
      };

      const graph: DependencyGraph = {
        artifacts: [artifact1],
        relations: [relation]
      };

      expect(graph.artifacts).toHaveLength(1);
      expect(graph.relations).toHaveLength(1);
      expect(graph.relations[0].type).toBe('calls');
    });

    it('should support different relation types', () => {
      const relationTypes: DependencyRelation['type'][] = ['imports', 'calls', 'extends', 'implements', 'uses'];
      
      relationTypes.forEach(type => {
        const relation: DependencyRelation = {
          fromArtifactId: '1',
          toArtifactId: '2',
          type,
          strength: 0.5
        };
        expect(relation.type).toBe(type);
      });
    });
  });

  describe('ComplexityMetrics', () => {
    it('should have required complexity fields', () => {
      const metrics: ComplexityMetrics = {
        cyclomaticComplexity: 5,
        cognitiveComplexity: 3,
        linesOfCode: 20,
        maintainabilityIndex: 85
      };

      expect(metrics.cyclomaticComplexity).toBe(5);
      expect(metrics.cognitiveComplexity).toBe(3);
      expect(metrics.linesOfCode).toBe(20);
      expect(metrics.maintainabilityIndex).toBe(85);
    });

    it('should support optional Halstead metrics', () => {
      const metrics: ComplexityMetrics = {
        cyclomaticComplexity: 5,
        cognitiveComplexity: 3,
        linesOfCode: 20,
        maintainabilityIndex: 85,
        halsteadMetrics: {
          volume: 100,
          difficulty: 10,
          effort: 1000
        }
      };

      expect(metrics.halsteadMetrics).toBeDefined();
      expect(metrics.halsteadMetrics!.volume).toBe(100);
    });
  });

  describe('FileAnalysis', () => {
    it('should contain all required analysis data', () => {
      const analysis: FileAnalysis = {
        filePath: '/src/test.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        interfaces: [],
        imports: [],
        exports: [],
        complexity: {
          cyclomaticComplexity: 1,
          cognitiveComplexity: 1,
          linesOfCode: 10,
          maintainabilityIndex: 100
        },
        linesOfCode: 10,
        lastModified: new Date(),
        artifacts: []
      };

      expect(analysis.language).toBe('typescript');
      expect(analysis.complexity).toBeDefined();
      expect(analysis.artifacts).toEqual([]);
    });

    it('should support different languages', () => {
      const languages: FileAnalysis['language'][] = ['typescript', 'javascript', 'unknown'];
      
      languages.forEach(language => {
        const analysis: Partial<FileAnalysis> = { language };
        expect(analysis.language).toBe(language);
      });
    });
  });

  describe('CodebaseAnalysis', () => {
    it('should contain comprehensive codebase information', () => {
      const analysis: CodebaseAnalysis = {
        id: 'analysis-123',
        repositoryPath: '/repo',
        analyzedAt: new Date(),
        totalFiles: 10,
        totalFunctions: 50,
        totalClasses: 15,
        totalInterfaces: 8,
        artifacts: [],
        dependencies: { artifacts: [], relations: [] },
        fileAnalyses: [],
        summary: {
          totalLinesOfCode: 1000,
          averageComplexity: 3.5,
          mostComplexFiles: ['/complex1.ts', '/complex2.ts'],
          dependencyHotspots: ['hotspot1', 'hotspot2']
        }
      };

      expect(analysis.id).toBe('analysis-123');
      expect(analysis.totalFiles).toBe(10);
      expect(analysis.summary.totalLinesOfCode).toBe(1000);
      expect(analysis.summary.mostComplexFiles).toHaveLength(2);
    });
  });

  describe('ASTParserConfig', () => {
    it('should have correct configuration structure', () => {
      const config: ASTParserConfig = {
        includePatterns: ['**/*.ts'],
        excludePatterns: ['node_modules/**'],
        maxFileSize: 1024000,
        calculateComplexity: true,
        analyzeDependencies: true,
        includeComments: false
      };

      expect(config.includePatterns).toContain('**/*.ts');
      expect(config.maxFileSize).toBe(1024000);
      expect(config.calculateComplexity).toBe(true);
    });
  });

  describe('defaultConfig', () => {
    it('should have sensible defaults', () => {
      expect(defaultConfig.includePatterns).toEqual([
        '**/*.ts',
        '**/*.tsx', 
        '**/*.js',
        '**/*.jsx'
      ]);

      expect(defaultConfig.excludePatterns).toContain('node_modules/**');
      expect(defaultConfig.excludePatterns).toContain('**/*.test.ts');
      expect(defaultConfig.excludePatterns).toContain('**/*.d.ts');
      
      expect(defaultConfig.maxFileSize).toBe(1024 * 1024);
      expect(defaultConfig.calculateComplexity).toBe(true);
      expect(defaultConfig.analyzeDependencies).toBe(true);
      expect(defaultConfig.includeComments).toBe(false);
    });

    it('should exclude common non-source directories', () => {
      expect(defaultConfig.excludePatterns).toContain('node_modules/**');
      expect(defaultConfig.excludePatterns).toContain('dist/**');
      expect(defaultConfig.excludePatterns).toContain('build/**');
    });

    it('should exclude test files', () => {
      expect(defaultConfig.excludePatterns).toContain('**/*.test.ts');
      expect(defaultConfig.excludePatterns).toContain('**/*.test.js');
      expect(defaultConfig.excludePatterns).toContain('**/*.spec.ts');
      expect(defaultConfig.excludePatterns).toContain('**/*.spec.js');
    });

    it('should exclude TypeScript declaration files', () => {
      expect(defaultConfig.excludePatterns).toContain('**/*.d.ts');
    });
  });

  describe('Vector3D and supporting types', () => {
    it('should support 3D positioning', () => {
      const position = { x: 10, y: 20, z: 30 };
      expect(position.x).toBe(10);
      expect(position.y).toBe(20);
      expect(position.z).toBe(30);
    });

    it('should support color representation', () => {
      const color = { r: 255, g: 128, b: 0, a: 0.8 };
      expect(color.r).toBe(255);
      expect(color.a).toBe(0.8);
    });

    it('should support time ranges', () => {
      const start = new Date('2023-01-01');
      const end = new Date('2023-12-31');
      const timeRange = { start, end };
      
      expect(timeRange.start).toBe(start);
      expect(timeRange.end).toBe(end);
    });
  });
});