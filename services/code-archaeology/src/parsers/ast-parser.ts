import { Project, SourceFile, Node, SyntaxKind, FunctionDeclaration, ClassDeclaration, InterfaceDeclaration, ImportDeclaration, ExportDeclaration } from 'ts-morph';
import { glob } from 'glob';
import * as path from 'path';
import * as fs from 'fs';
import { 
  ASTParserConfig, 
  FileAnalysis, 
  FunctionInfo, 
  ClassInfo, 
  InterfaceInfo, 
  ImportInfo, 
  ComplexityMetrics,
  CodeArtifact,
  PropertyInfo,
  MethodSignature
} from '../types';
import { ComplexityCalculator } from './complexity-calculator';
import { DependencyAnalyzer } from './dependency-analyzer';

export class ASTParser {
  private project: Project;
  private complexityCalculator: ComplexityCalculator;
  private dependencyAnalyzer: DependencyAnalyzer;

  constructor(private config: ASTParserConfig) {
    this.project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: 99, // Latest
        allowJs: true,
        checkJs: false,
        skipLibCheck: true,
        skipDefaultLibCheck: true
      }
    });
    this.complexityCalculator = new ComplexityCalculator();
    this.dependencyAnalyzer = new DependencyAnalyzer();
  }

  async analyzeDirectory(directoryPath: string): Promise<FileAnalysis[]> {
    const files = await this.findSourceFiles(directoryPath);
    const analyses: FileAnalysis[] = [];

    for (const filePath of files) {
      try {
        const analysis = await this.analyzeFile(filePath);
        if (analysis) {
          analyses.push(analysis);
        }
      } catch (error) {
        console.warn(`Failed to analyze file ${filePath}:`, error);
      }
    }

    return analyses;
  }

  async analyzeFile(filePath: string): Promise<FileAnalysis | null> {
    if (!this.shouldAnalyzeFile(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = this.project.createSourceFile(filePath, content, { overwrite: true });
    
    const language = this.detectLanguage(filePath);
    const stats = fs.statSync(filePath);

    const functions = this.extractFunctions(sourceFile);
    const classes = this.extractClasses(sourceFile);
    const interfaces = this.extractInterfaces(sourceFile);
    const imports = this.extractImports(sourceFile);
    const exports = this.extractExports(sourceFile);

    const complexity = this.config.calculateComplexity 
      ? this.complexityCalculator.calculateFileComplexity(sourceFile)
      : this.getDefaultComplexity();

    const linesOfCode = sourceFile.getFullText().split('\n').length;

    // Create artifacts for each code element
    const artifacts = this.createArtifacts(filePath, functions, classes, interfaces);

    return {
      filePath,
      language,
      functions,
      classes,
      interfaces,
      imports,
      exports,
      complexity,
      linesOfCode,
      lastModified: stats.mtime,
      artifacts
    };
  }

  private async findSourceFiles(directoryPath: string): Promise<string[]> {
    const patterns = this.config.includePatterns.map(pattern => 
      path.join(directoryPath, pattern)
    );

    let files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { 
        ignore: this.config.excludePatterns.map(exclude => 
          path.join(directoryPath, exclude)
        )
      });
      files = files.concat(matches);
    }

    // Filter by file size
    return files.filter(file => {
      try {
        const stats = fs.statSync(file);
        return stats.size <= this.config.maxFileSize;
      } catch {
        return false;
      }
    });
  }

  private shouldAnalyzeFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.ts', '.tsx', '.js', '.jsx'].includes(ext);
  }

  private detectLanguage(filePath: string): 'typescript' | 'javascript' | 'unknown' {
    const ext = path.extname(filePath).toLowerCase();
    if (['.ts', '.tsx'].includes(ext)) return 'typescript';
    if (['.js', '.jsx'].includes(ext)) return 'javascript';
    return 'unknown';
  }

  private extractFunctions(sourceFile: SourceFile): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    sourceFile.forEachDescendant((node) => {
      if (Node.isFunctionDeclaration(node) || Node.isArrowFunction(node) || Node.isFunctionExpression(node)) {
        const functionInfo = this.analyzeFunctionNode(node);
        if (functionInfo) {
          functions.push(functionInfo);
        }
      }
    });

    return functions;
  }

  private analyzeFunctionNode(node: Node): FunctionInfo | null {
    let name = 'anonymous';
    let parameters: string[] = [];
    let returnType: string | undefined;
    let isAsync = false;
    let isExported = false;

    if (Node.isFunctionDeclaration(node)) {
      name = node.getName() || 'anonymous';
      parameters = node.getParameters().map(p => p.getName());
      returnType = node.getReturnTypeNode()?.getText();
      isAsync = node.isAsync();
      isExported = node.isExported();
    } else if (Node.isArrowFunction(node) || Node.isFunctionExpression(node)) {
      parameters = node.getParameters().map(p => p.getName());
      returnType = node.getReturnTypeNode()?.getText();
      isAsync = node.isAsync();
      
      // Try to get name from variable declaration
      const parent = node.getParent();
      if (Node.isVariableDeclaration(parent)) {
        name = parent.getName();
      }
    }

    const startLine = node.getStartLineNumber();
    const endLine = node.getEndLineNumber();
    const calls = this.extractFunctionCalls(node);
    
    const complexity = this.config.calculateComplexity
      ? this.complexityCalculator.calculateFunctionComplexity(node)
      : this.getDefaultComplexity();

    return {
      name,
      parameters,
      returnType,
      isAsync,
      isExported,
      complexity,
      startLine,
      endLine,
      calls
    };
  }

  private extractFunctionCalls(node: Node): string[] {
    const calls: string[] = [];
    
    node.forEachDescendant((descendant) => {
      if (Node.isCallExpression(descendant)) {
        const expression = descendant.getExpression();
        if (Node.isIdentifier(expression)) {
          calls.push(expression.getText());
        } else if (Node.isPropertyAccessExpression(expression)) {
          calls.push(expression.getName());
        }
      }
    });

    return [...new Set(calls)]; // Remove duplicates
  }

  private extractClasses(sourceFile: SourceFile): ClassInfo[] {
    return sourceFile.getClasses().map(classDecl => this.analyzeClassNode(classDecl));
  }

  private analyzeClassNode(classDecl: ClassDeclaration): ClassInfo {
    const name = classDecl.getName() || 'anonymous';
    const extendsClause = classDecl.getExtends()?.getText();
    const implementsClauses = classDecl.getImplements().map(impl => impl.getText());
    
    const methods = classDecl.getMethods().map(method => this.analyzeMethodNode(method));
    const properties = classDecl.getProperties().map(prop => this.analyzePropertyNode(prop));
    
    return {
      name,
      extends: extendsClause,
      implements: implementsClauses,
      methods,
      properties,
      isExported: classDecl.isExported(),
      isAbstract: classDecl.isAbstract(),
      startLine: classDecl.getStartLineNumber(),
      endLine: classDecl.getEndLineNumber()
    };
  }

  private analyzeMethodNode(method: any): FunctionInfo {
    const name = method.getName();
    const parameters = method.getParameters().map((p: any) => p.getName());
    const returnType = method.getReturnTypeNode()?.getText();
    const isAsync = method.isAsync();
    const calls = this.extractFunctionCalls(method);
    
    const complexity = this.config.calculateComplexity
      ? this.complexityCalculator.calculateFunctionComplexity(method)
      : this.getDefaultComplexity();

    return {
      name,
      parameters,
      returnType,
      isAsync,
      isExported: false, // Methods are not directly exported
      complexity,
      startLine: method.getStartLineNumber(),
      endLine: method.getEndLineNumber(),
      calls
    };
  }

  private analyzePropertyNode(property: any): PropertyInfo {
    return {
      name: property.getName(),
      type: property.getTypeNode()?.getText(),
      isStatic: property.isStatic(),
      isPrivate: property.hasModifier(SyntaxKind.PrivateKeyword),
      isReadonly: property.isReadonly()
    };
  }

  private extractInterfaces(sourceFile: SourceFile): InterfaceInfo[] {
    return sourceFile.getInterfaces().map(interfaceDecl => this.analyzeInterfaceNode(interfaceDecl));
  }

  private analyzeInterfaceNode(interfaceDecl: InterfaceDeclaration): InterfaceInfo {
    const name = interfaceDecl.getName();
    const extendsClauses = interfaceDecl.getExtends().map(ext => ext.getText());
    
    const methods: MethodSignature[] = [];
    const properties: PropertyInfo[] = [];

    interfaceDecl.getProperties().forEach(prop => {
      if (prop.getKind() === SyntaxKind.MethodSignature) {
        methods.push({
          name: prop.getName(),
          parameters: (prop as any).getParameters?.()?.map((p: any) => p.getName()) || [],
          returnType: (prop as any).getReturnTypeNode?.()?.getText(),
          isOptional: prop.hasQuestionToken()
        });
      } else {
        properties.push({
          name: prop.getName(),
          type: prop.getTypeNode()?.getText(),
          isStatic: false,
          isPrivate: false,
          isReadonly: prop.isReadonly()
        });
      }
    });

    return {
      name,
      extends: extendsClauses,
      methods,
      properties,
      isExported: interfaceDecl.isExported(),
      startLine: interfaceDecl.getStartLineNumber(),
      endLine: interfaceDecl.getEndLineNumber()
    };
  }

  private extractImports(sourceFile: SourceFile): ImportInfo[] {
    return sourceFile.getImportDeclarations().map(importDecl => this.analyzeImportNode(importDecl));
  }

  private analyzeImportNode(importDecl: ImportDeclaration): ImportInfo {
    const source = importDecl.getModuleSpecifierValue();
    const importClause = importDecl.getImportClause();
    
    let imports: string[] = [];
    let isDefault = false;
    let isNamespace = false;

    if (importClause) {
      const defaultImport = importClause.getDefaultImport();
      if (defaultImport) {
        imports.push(defaultImport.getText());
        isDefault = true;
      }

      const namedImports = importClause.getNamedImports();
      if (namedImports) {
        imports = imports.concat(namedImports.getElements().map(el => el.getName()));
      }

      const namespaceImport = importClause.getNamespaceImport();
      if (namespaceImport) {
        imports.push(namespaceImport.getName());
        isNamespace = true;
      }
    }

    return {
      source,
      imports,
      isDefault,
      isNamespace,
      line: importDecl.getStartLineNumber()
    };
  }

  private extractExports(sourceFile: SourceFile): string[] {
    const exports: string[] = [];

    // Named exports
    sourceFile.getExportDeclarations().forEach(exportDecl => {
      const namedExports = exportDecl.getNamedExports();
      namedExports.forEach(namedExport => {
        exports.push(namedExport.getName());
      });
    });

    // Export assignments
    sourceFile.getExportAssignments().forEach(exportAssign => {
      if (exportAssign.isExportEquals()) {
        exports.push('default');
      }
    });

    // Exported declarations
    sourceFile.getFunctions().forEach(func => {
      if (func.isExported()) {
        exports.push(func.getName() || 'anonymous');
      }
    });

    sourceFile.getClasses().forEach(cls => {
      if (cls.isExported()) {
        exports.push(cls.getName() || 'anonymous');
      }
    });

    sourceFile.getInterfaces().forEach(iface => {
      if (iface.isExported()) {
        exports.push(iface.getName());
      }
    });

    return [...new Set(exports)]; // Remove duplicates
  }

  private createArtifacts(filePath: string, functions: FunctionInfo[], classes: ClassInfo[], interfaces: InterfaceInfo[]): CodeArtifact[] {
    const artifacts: CodeArtifact[] = [];
    let artifactId = 0;

    // File artifact
    artifacts.push({
      id: `${filePath}_file_${artifactId++}`,
      filePath,
      type: 'file',
      name: path.basename(filePath),
      position3D: { x: 0, y: 0, z: 0 }, // Will be calculated later
      complexity: 0, // Will be calculated from contents
      changeFrequency: 0, // Will be filled by Git analyzer
      lastModified: new Date(),
      authors: [],
      dependencies: [],
      startLine: 1,
      endLine: 1000, // Placeholder
      size: functions.length + classes.length + interfaces.length,
      metadata: {}
    });

    // Function artifacts
    functions.forEach(func => {
      artifacts.push({
        id: `${filePath}_function_${func.name}_${artifactId++}`,
        filePath,
        type: 'function',
        name: func.name,
        position3D: { x: 0, y: 0, z: 0 },
        complexity: func.complexity.cyclomaticComplexity,
        changeFrequency: 0,
        lastModified: new Date(),
        authors: [],
        dependencies: func.calls,
        startLine: func.startLine,
        endLine: func.endLine,
        size: func.endLine - func.startLine + 1,
        metadata: {
          parameters: func.parameters,
          returnType: func.returnType,
          isAsync: func.isAsync,
          isExported: func.isExported,
          calls: func.calls
        }
      });
    });

    // Class artifacts
    classes.forEach(cls => {
      artifacts.push({
        id: `${filePath}_class_${cls.name}_${artifactId++}`,
        filePath,
        type: 'class',
        name: cls.name,
        position3D: { x: 0, y: 0, z: 0 },
        complexity: cls.methods.reduce((sum, method) => sum + method.complexity.cyclomaticComplexity, 0),
        changeFrequency: 0,
        lastModified: new Date(),
        authors: [],
        dependencies: cls.extends ? [cls.extends] : [],
        startLine: cls.startLine,
        endLine: cls.endLine,
        size: cls.endLine - cls.startLine + 1,
        metadata: {
          extends: cls.extends,
          implements: cls.implements,
          methods: cls.methods.map(m => m.name),
          properties: cls.properties.map(p => p.name),
          isAbstract: cls.isAbstract
        }
      });
    });

    // Interface artifacts
    interfaces.forEach(iface => {
      artifacts.push({
        id: `${filePath}_interface_${iface.name}_${artifactId++}`,
        filePath,
        type: 'interface',
        name: iface.name,
        position3D: { x: 0, y: 0, z: 0 },
        complexity: iface.methods.length + iface.properties.length,
        changeFrequency: 0,
        lastModified: new Date(),
        authors: [],
        dependencies: iface.extends,
        startLine: iface.startLine,
        endLine: iface.endLine,
        size: iface.endLine - iface.startLine + 1,
        metadata: {
          extends: iface.extends,
          methods: iface.methods.map(m => m.name),
          properties: iface.properties.map(p => p.name)
        }
      });
    });

    return artifacts;
  }

  private getDefaultComplexity(): ComplexityMetrics {
    return {
      cyclomaticComplexity: 1,
      cognitiveComplexity: 1,
      linesOfCode: 0,
      maintainabilityIndex: 100
    };
  }
}