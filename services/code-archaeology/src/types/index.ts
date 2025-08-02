export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface CodeArtifact {
  id: string;
  filePath: string;
  type: 'file' | 'function' | 'class' | 'interface' | 'variable' | 'import';
  name: string;
  position3D: Vector3D;
  complexity: number;
  changeFrequency: number;
  lastModified: Date;
  authors: string[];
  dependencies: string[];
  startLine: number;
  endLine: number;
  size: number; // lines of code
  metadata: Record<string, any>;
}

export interface DependencyRelation {
  fromArtifactId: string;
  toArtifactId: string;
  type: 'imports' | 'calls' | 'extends' | 'implements' | 'uses';
  strength: number; // 0-1, how strong the dependency is
}

export interface DependencyGraph {
  artifacts: CodeArtifact[];
  relations: DependencyRelation[];
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  linesOfCode: number;
  maintainabilityIndex: number;
  halsteadMetrics?: {
    volume: number;
    difficulty: number;
    effort: number;
  };
}

export interface FunctionInfo {
  name: string;
  parameters: string[];
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
  complexity: ComplexityMetrics;
  startLine: number;
  endLine: number;
  calls: string[]; // functions this function calls
}

export interface ClassInfo {
  name: string;
  extends?: string;
  implements: string[];
  methods: FunctionInfo[];
  properties: PropertyInfo[];
  isExported: boolean;
  isAbstract: boolean;
  startLine: number;
  endLine: number;
}

export interface PropertyInfo {
  name: string;
  type?: string;
  isStatic: boolean;
  isPrivate: boolean;
  isReadonly: boolean;
}

export interface InterfaceInfo {
  name: string;
  extends: string[];
  methods: MethodSignature[];
  properties: PropertyInfo[];
  isExported: boolean;
  startLine: number;
  endLine: number;
}

export interface MethodSignature {
  name: string;
  parameters: string[];
  returnType?: string;
  isOptional: boolean;
}

export interface ImportInfo {
  source: string;
  imports: string[];
  isDefault: boolean;
  isNamespace: boolean;
  line: number;
}

export interface FileAnalysis {
  filePath: string;
  language: 'typescript' | 'javascript' | 'unknown';
  functions: FunctionInfo[];
  classes: ClassInfo[];
  interfaces: InterfaceInfo[];
  imports: ImportInfo[];
  exports: string[];
  complexity: ComplexityMetrics;
  linesOfCode: number;
  lastModified: Date;
  artifacts: CodeArtifact[];
}

export interface CodebaseAnalysis {
  id: string;
  repositoryPath: string;
  analyzedAt: Date;
  totalFiles: number;
  totalFunctions: number;
  totalClasses: number;
  totalInterfaces: number;
  artifacts: CodeArtifact[];
  dependencies: DependencyGraph;
  fileAnalyses: FileAnalysis[];
  summary: {
    totalLinesOfCode: number;
    averageComplexity: number;
    mostComplexFiles: string[];
    dependencyHotspots: string[];
  };
}

export interface ASTParserConfig {
  includePatterns: string[];
  excludePatterns: string[];
  maxFileSize: number; // in bytes
  calculateComplexity: boolean;
  analyzeDependencies: boolean;
  includeComments: boolean;
}

// Re-export traceability types for convenience
export interface TraceabilityLink {
  requirementId: string;
  specFile: string;
  codeArtifacts: string[];
  linkType: 'implements' | 'tests' | 'documents';
  confidence: number;
  taskReferences: RequirementReference[];
}

export interface RequirementReference {
  requirementId: string;
  taskId: string;
  taskDescription: string;
  confidence: number;
}

export interface TraceabilityMatrix {
  requirementId: string;
  hookName?: string;
  testCase?: string;
  codeArtifacts: string[];
  coverage: number; // 0-1, percentage of requirement implemented
}