import { CodeArchaeologyService, defaultConfig } from '../index';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock ts-morph since it's not available in the test environment
jest.mock('ts-morph', () => ({
  Project: jest.fn().mockImplementation(() => ({
    createSourceFile: jest.fn().mockReturnValue({
      getFullText: () => 'function test() { return 42; }',
      getFunctions: () => [{
        getName: () => 'test',
        getParameters: () => [],
        getReturnTypeNode: () => null,
        isAsync: () => false,
        isExported: () => true,
        getStartLineNumber: () => 1,
        getEndLineNumber: () => 3,
        forEachDescendant: jest.fn()
      }],
      getClasses: () => [],
      getInterfaces: () => [],
      getImportDeclarations: () => [],
      getExportDeclarations: () => [],
      getExportAssignments: () => [],
      forEachDescendant: jest.fn()
    })
  })),
  Node: {
    isFunctionDeclaration: () => true,
    isArrowFunction: () => false,
    isFunctionExpression: () => false,
    isCallExpression: () => false,
    isIdentifier: () => false,
    isPropertyAccessExpression: () => false,
    isClassDeclaration: () => false,
    isInterfaceDeclaration: () => false,
    isImportDeclaration: () => false,
    isExportDeclaration: () => false,
    isVariableDeclaration: () => false,
    isBinaryExpression: () => false,
    isMethodDeclaration: () => false,
    isGetAccessorDeclaration: () => false,
    isSetAccessorDeclaration: () => false
  },
  SyntaxKind: {
    IfStatement: 'IfStatement',
    WhileStatement: 'WhileStatement',
    ForStatement: 'ForStatement',
    SwitchStatement: 'SwitchStatement',
    CaseClause: 'CaseClause',
    BinaryExpression: 'BinaryExpression',
    ConditionalExpression: 'ConditionalExpression',
    CatchClause: 'CatchClause',
    DoStatement: 'DoStatement',
    ForInStatement: 'ForInStatement',
    ForOfStatement: 'ForOfStatement',
    AmpersandAmpersandToken: '&&',
    BarBarToken: '||',
    PrivateKeyword: 'private',
    MethodSignature: 'MethodSignature'
  }
}));

describe('CodeArchaeologyService Integration', () => {
  let service: CodeArchaeologyService;
  let tempDir: string;

  beforeEach(() => {
    service = new CodeArchaeologyService(defaultConfig);
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'archaeology-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('service initialization', () => {
    it('should create service with default config', () => {
      expect(service).toBeDefined();
      expect(defaultConfig.includePatterns).toContain('**/*.ts');
      expect(defaultConfig.excludePatterns).toContain('node_modules/**');
      expect(defaultConfig.calculateComplexity).toBe(true);
      expect(defaultConfig.analyzeDependencies).toBe(true);
    });

    it('should create service with custom config', () => {
      const customConfig = {
        ...defaultConfig,
        maxFileSize: 500000,
        calculateComplexity: false
      };
      
      const customService = new CodeArchaeologyService(customConfig);
      expect(customService).toBeDefined();
    });
  });

  describe('analyzeCodebase', () => {
    it('should analyze a simple codebase', async () => {
      // Create test files
      const testFile1 = path.join(tempDir, 'file1.ts');
      const testFile2 = path.join(tempDir, 'file2.js');
      
      fs.writeFileSync(testFile1, `
        export function hello(name: string): string {
          return \`Hello, \${name}!\`;
        }
      `);
      
      fs.writeFileSync(testFile2, `
        function world() {
          return 'World';
        }
        module.exports = { world };
      `);

      const analysis = await service.analyzeCodebase(tempDir);

      expect(analysis).toBeDefined();
      expect(analysis.id).toBeDefined();
      expect(analysis.repositoryPath).toBe(tempDir);
      expect(analysis.analyzedAt).toBeInstanceOf(Date);
      expect(analysis.totalFiles).toBeGreaterThan(0);
      expect(analysis.artifacts).toBeDefined();
      expect(analysis.dependencies).toBeDefined();
      expect(analysis.summary).toBeDefined();
      expect(analysis.summary.totalLinesOfCode).toBeGreaterThan(0);
    });

    it('should handle empty directory', async () => {
      const analysis = await service.analyzeCodebase(tempDir);

      expect(analysis.totalFiles).toBe(0);
      expect(analysis.totalFunctions).toBe(0);
      expect(analysis.totalClasses).toBe(0);
      expect(analysis.totalInterfaces).toBe(0);
      expect(analysis.artifacts).toHaveLength(0);
    });
  });

  describe('analyzeFile', () => {
    it('should analyze a single TypeScript file', async () => {
      const testFile = path.join(tempDir, 'test.ts');
      fs.writeFileSync(testFile, `
        export interface User {
          id: string;
          name: string;
        }

        export function createUser(name: string): User {
          return {
            id: Math.random().toString(36),
            name
          };
        }
      `);

      const analysis = await service.analyzeFile(testFile);

      expect(analysis).toBeDefined();
      expect(analysis!.filePath).toBe(testFile);
      expect(analysis!.language).toBe('typescript');
      expect(analysis!.artifacts).toBeDefined();
    });

    it('should return null for non-source files', async () => {
      const testFile = path.join(tempDir, 'readme.txt');
      fs.writeFileSync(testFile, 'This is not a source file');

      const analysis = await service.analyzeFile(testFile);
      expect(analysis).toBeNull();
    });
  });

  describe('configuration validation', () => {
    it('should use default patterns correctly', () => {
      expect(defaultConfig.includePatterns).toEqual([
        '**/*.ts',
        '**/*.tsx', 
        '**/*.js',
        '**/*.jsx'
      ]);

      expect(defaultConfig.excludePatterns).toContain('node_modules/**');
      expect(defaultConfig.excludePatterns).toContain('**/*.test.ts');
      expect(defaultConfig.excludePatterns).toContain('**/*.d.ts');
    });

    it('should have reasonable default limits', () => {
      expect(defaultConfig.maxFileSize).toBe(1024 * 1024); // 1MB
      expect(defaultConfig.calculateComplexity).toBe(true);
      expect(defaultConfig.analyzeDependencies).toBe(true);
      expect(defaultConfig.includeComments).toBe(false);
    });
  });
});