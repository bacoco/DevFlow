import { DependencyAnalyzer } from '../parsers/dependency-analyzer';
import { FileAnalysis, CodeArtifact, ImportInfo, FunctionInfo, ClassInfo, InterfaceInfo } from '../types';

describe('DependencyAnalyzer', () => {
  let analyzer: DependencyAnalyzer;

  beforeEach(() => {
    analyzer = new DependencyAnalyzer();
  });

  const createMockFileAnalysis = (
    filePath: string,
    overrides: Partial<FileAnalysis> = {}
  ): FileAnalysis => ({
    filePath,
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
    artifacts: [],
    ...overrides
  });

  const createMockArtifact = (
    id: string,
    name: string,
    type: CodeArtifact['type'],
    filePath: string
  ): CodeArtifact => ({
    id,
    filePath,
    type,
    name,
    position3D: { x: 0, y: 0, z: 0 },
    complexity: 1,
    changeFrequency: 0,
    lastModified: new Date(),
    authors: [],
    dependencies: [],
    startLine: 1,
    endLine: 10,
    size: 10,
    metadata: {}
  });

  describe('analyzeDependencies', () => {
    it('should create dependency graph from file analyses', () => {
      const file1Artifact = createMockArtifact('file1_file_0', 'file1.ts', 'file', '/src/file1.ts');
      const file2Artifact = createMockArtifact('file2_file_0', 'file2.ts', 'file', '/src/file2.ts');

      const file1: FileAnalysis = createMockFileAnalysis('/src/file1.ts', {
        artifacts: [file1Artifact],
        imports: [{
          source: './file2',
          imports: ['helper'],
          isDefault: false,
          isNamespace: false,
          line: 1
        }]
      });

      const file2: FileAnalysis = createMockFileAnalysis('/src/file2.ts', {
        artifacts: [file2Artifact]
      });

      const graph = analyzer.analyzeDependencies([file1, file2]);

      expect(graph.artifacts).toHaveLength(2);
      expect(graph.relations).toHaveLength(0); // No relations without proper resolution
    });

    it('should analyze function call dependencies', () => {
      const func1Artifact = createMockArtifact('func1', 'func1', 'function', '/src/test.ts');
      const func2Artifact = createMockArtifact('func2', 'func2', 'function', '/src/test.ts');

      const func1: FunctionInfo = {
        name: 'func1',
        parameters: [],
        isAsync: false,
        isExported: false,
        complexity: {
          cyclomaticComplexity: 1,
          cognitiveComplexity: 1,
          linesOfCode: 5,
          maintainabilityIndex: 100
        },
        startLine: 1,
        endLine: 5,
        calls: ['func2']
      };

      const func2: FunctionInfo = {
        name: 'func2',
        parameters: [],
        isAsync: false,
        isExported: false,
        complexity: {
          cyclomaticComplexity: 1,
          cognitiveComplexity: 1,
          linesOfCode: 3,
          maintainabilityIndex: 100
        },
        startLine: 7,
        endLine: 9,
        calls: []
      };

      const analysis: FileAnalysis = createMockFileAnalysis('/src/test.ts', {
        functions: [func1, func2],
        artifacts: [func1Artifact, func2Artifact]
      });

      const graph = analyzer.analyzeDependencies([analysis]);

      expect(graph.relations).toHaveLength(1);
      expect(graph.relations[0].fromArtifactId).toBe('func1');
      expect(graph.relations[0].toArtifactId).toBe('func2');
      expect(graph.relations[0].type).toBe('calls');
    });

    it('should analyze class inheritance dependencies', () => {
      const baseClassArtifact = createMockArtifact('base', 'BaseClass', 'class', '/src/test.ts');
      const derivedClassArtifact = createMockArtifact('derived', 'DerivedClass', 'class', '/src/test.ts');

      const baseClass: ClassInfo = {
        name: 'BaseClass',
        methods: [],
        properties: [],
        isExported: true,
        isAbstract: false,
        startLine: 1,
        endLine: 5,
        implements: []
      };

      const derivedClass: ClassInfo = {
        name: 'DerivedClass',
        extends: 'BaseClass',
        methods: [],
        properties: [],
        isExported: true,
        isAbstract: false,
        startLine: 7,
        endLine: 12,
        implements: []
      };

      const analysis: FileAnalysis = createMockFileAnalysis('/src/test.ts', {
        classes: [baseClass, derivedClass],
        artifacts: [baseClassArtifact, derivedClassArtifact]
      });

      const graph = analyzer.analyzeDependencies([analysis]);

      expect(graph.relations).toHaveLength(1);
      expect(graph.relations[0].fromArtifactId).toBe('derived');
      expect(graph.relations[0].toArtifactId).toBe('base');
      expect(graph.relations[0].type).toBe('extends');
      expect(graph.relations[0].strength).toBe(1.0);
    });

    it('should analyze interface implementation dependencies', () => {
      const interfaceArtifact = createMockArtifact('interface', 'TestInterface', 'interface', '/src/test.ts');
      const classArtifact = createMockArtifact('class', 'TestClass', 'class', '/src/test.ts');

      const testInterface: InterfaceInfo = {
        name: 'TestInterface',
        extends: [],
        methods: [],
        properties: [],
        isExported: true,
        startLine: 1,
        endLine: 3
      };

      const testClass: ClassInfo = {
        name: 'TestClass',
        implements: ['TestInterface'],
        methods: [],
        properties: [],
        isExported: true,
        isAbstract: false,
        startLine: 5,
        endLine: 10
      };

      const analysis: FileAnalysis = createMockFileAnalysis('/src/test.ts', {
        interfaces: [testInterface],
        classes: [testClass],
        artifacts: [interfaceArtifact, classArtifact]
      });

      const graph = analyzer.analyzeDependencies([analysis]);

      expect(graph.relations).toHaveLength(1);
      expect(graph.relations[0].fromArtifactId).toBe('class');
      expect(graph.relations[0].toArtifactId).toBe('interface');
      expect(graph.relations[0].type).toBe('implements');
      expect(graph.relations[0].strength).toBe(0.8);
    });

    it('should analyze interface extension dependencies', () => {
      const baseInterfaceArtifact = createMockArtifact('base', 'BaseInterface', 'interface', '/src/test.ts');
      const extendedInterfaceArtifact = createMockArtifact('extended', 'ExtendedInterface', 'interface', '/src/test.ts');

      const baseInterface: InterfaceInfo = {
        name: 'BaseInterface',
        extends: [],
        methods: [],
        properties: [],
        isExported: true,
        startLine: 1,
        endLine: 3
      };

      const extendedInterface: InterfaceInfo = {
        name: 'ExtendedInterface',
        extends: ['BaseInterface'],
        methods: [],
        properties: [],
        isExported: true,
        startLine: 5,
        endLine: 8
      };

      const analysis: FileAnalysis = createMockFileAnalysis('/src/test.ts', {
        interfaces: [baseInterface, extendedInterface],
        artifacts: [baseInterfaceArtifact, extendedInterfaceArtifact]
      });

      const graph = analyzer.analyzeDependencies([analysis]);

      expect(graph.relations).toHaveLength(1);
      expect(graph.relations[0].fromArtifactId).toBe('extended');
      expect(graph.relations[0].toArtifactId).toBe('base');
      expect(graph.relations[0].type).toBe('extends');
      expect(graph.relations[0].strength).toBe(0.9);
    });
  });

  describe('detectCircularDependencies', () => {
    it('should detect simple circular dependency', () => {
      const artifact1 = createMockArtifact('1', 'A', 'function', '/src/test.ts');
      const artifact2 = createMockArtifact('2', 'B', 'function', '/src/test.ts');

      const graph = {
        artifacts: [artifact1, artifact2],
        relations: [
          {
            fromArtifactId: '1',
            toArtifactId: '2',
            type: 'calls' as const,
            strength: 0.5
          },
          {
            fromArtifactId: '2',
            toArtifactId: '1',
            type: 'calls' as const,
            strength: 0.5
          }
        ]
      };

      const cycles = analyzer.detectCircularDependencies(graph);

      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0]).toContain('1');
      expect(cycles[0]).toContain('2');
    });

    it('should detect no cycles in acyclic graph', () => {
      const artifact1 = createMockArtifact('1', 'A', 'function', '/src/test.ts');
      const artifact2 = createMockArtifact('2', 'B', 'function', '/src/test.ts');
      const artifact3 = createMockArtifact('3', 'C', 'function', '/src/test.ts');

      const graph = {
        artifacts: [artifact1, artifact2, artifact3],
        relations: [
          {
            fromArtifactId: '1',
            toArtifactId: '2',
            type: 'calls' as const,
            strength: 0.5
          },
          {
            fromArtifactId: '2',
            toArtifactId: '3',
            type: 'calls' as const,
            strength: 0.5
          }
        ]
      };

      const cycles = analyzer.detectCircularDependencies(graph);

      expect(cycles).toHaveLength(0);
    });
  });

  describe('calculateDependencyMetrics', () => {
    it('should calculate dependency metrics', () => {
      const artifacts = [
        createMockArtifact('1', 'A', 'function', '/src/test.ts'),
        createMockArtifact('2', 'B', 'function', '/src/test.ts'),
        createMockArtifact('3', 'C', 'function', '/src/test.ts')
      ];

      const relations = [
        {
          fromArtifactId: '1',
          toArtifactId: '2',
          type: 'calls' as const,
          strength: 0.5
        },
        {
          fromArtifactId: '1',
          toArtifactId: '3',
          type: 'calls' as const,
          strength: 0.3
        },
        {
          fromArtifactId: '2',
          toArtifactId: '3',
          type: 'calls' as const,
          strength: 0.7
        }
      ];

      const graph = { artifacts, relations };
      const metrics = analyzer.calculateDependencyMetrics(graph);

      expect(metrics.totalDependencies).toBe(3);
      expect(metrics.averageDependenciesPerArtifact).toBe(1);
      expect(metrics.maxDependencies).toBe(2); // Artifact '1' has 2 dependencies
      expect(metrics.circularDependencies).toBe(0);
    });

    it('should handle empty graph', () => {
      const graph = { artifacts: [], relations: [] };
      const metrics = analyzer.calculateDependencyMetrics(graph);

      expect(metrics.totalDependencies).toBe(0);
      expect(metrics.averageDependenciesPerArtifact).toBe(0);
      expect(metrics.maxDependencies).toBe(0);
      expect(metrics.circularDependencies).toBe(0);
    });
  });
});