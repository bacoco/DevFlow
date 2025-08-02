import { ASTParser } from '../parsers/ast-parser';
import { ASTParserConfig } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ASTParser', () => {
  let parser: ASTParser;
  let tempDir: string;
  let config: ASTParserConfig;

  beforeEach(() => {
    config = {
      includePatterns: ['**/*.ts', '**/*.js'],
      excludePatterns: ['node_modules/**', '**/*.test.ts'],
      maxFileSize: 1024 * 1024, // 1MB
      calculateComplexity: true,
      analyzeDependencies: true,
      includeComments: false
    };
    parser = new ASTParser(config);
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ast-parser-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('analyzeFile', () => {
    it('should analyze a simple TypeScript file', async () => {
      const testFile = path.join(tempDir, 'test.ts');
      const content = `
export interface User {
  id: string;
  name: string;
}

export class UserService {
  private users: User[] = [];

  async getUser(id: string): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }

  addUser(user: User): void {
    this.users.push(user);
  }
}

export function validateUser(user: User): boolean {
  return user.id.length > 0 && user.name.length > 0;
}
`;
      fs.writeFileSync(testFile, content);

      const analysis = await parser.analyzeFile(testFile);

      expect(analysis).toBeDefined();
      expect(analysis!.language).toBe('typescript');
      expect(analysis!.functions).toHaveLength(1);
      expect(analysis!.classes).toHaveLength(1);
      expect(analysis!.interfaces).toHaveLength(1);
      expect(analysis!.artifacts).toHaveLength(4); // file + function + class + interface

      // Check function analysis
      const validateUserFunc = analysis!.functions.find(f => f.name === 'validateUser');
      expect(validateUserFunc).toBeDefined();
      expect(validateUserFunc!.parameters).toEqual(['user']);
      expect(validateUserFunc!.isExported).toBe(true);
      expect(validateUserFunc!.complexity.cyclomaticComplexity).toBeGreaterThan(1);

      // Check class analysis
      const userServiceClass = analysis!.classes.find(c => c.name === 'UserService');
      expect(userServiceClass).toBeDefined();
      expect(userServiceClass!.methods).toHaveLength(2);
      expect(userServiceClass!.properties).toHaveLength(1);

      // Check interface analysis
      const userInterface = analysis!.interfaces.find(i => i.name === 'User');
      expect(userInterface).toBeDefined();
      expect(userInterface!.properties).toHaveLength(2);
    });

    it('should handle JavaScript files', async () => {
      const testFile = path.join(tempDir, 'test.js');
      const content = `
function calculateSum(a, b) {
  if (a < 0 || b < 0) {
    throw new Error('Negative numbers not allowed');
  }
  return a + b;
}

class Calculator {
  add(a, b) {
    return calculateSum(a, b);
  }
}

module.exports = { Calculator, calculateSum };
`;
      fs.writeFileSync(testFile, content);

      const analysis = await parser.analyzeFile(testFile);

      expect(analysis).toBeDefined();
      expect(analysis!.language).toBe('javascript');
      expect(analysis!.functions).toHaveLength(1);
      expect(analysis!.classes).toHaveLength(1);

      const calcSumFunc = analysis!.functions.find(f => f.name === 'calculateSum');
      expect(calcSumFunc).toBeDefined();
      expect(calcSumFunc!.complexity.cyclomaticComplexity).toBe(2); // Base + if condition
    });

    it('should calculate complexity metrics correctly', async () => {
      const testFile = path.join(tempDir, 'complex.ts');
      const content = `
function complexFunction(x: number, y: number): number {
  let result = 0;
  
  if (x > 0) {
    for (let i = 0; i < x; i++) {
      if (i % 2 === 0) {
        result += i;
      } else {
        result -= i;
      }
    }
  } else if (x < 0) {
    while (y > 0) {
      result += y;
      y--;
    }
  }
  
  switch (result % 3) {
    case 0:
      return result * 2;
    case 1:
      return result + 1;
    default:
      return result;
  }
}
`;
      fs.writeFileSync(testFile, content);

      const analysis = await parser.analyzeFile(testFile);
      const func = analysis!.functions[0];

      expect(func.complexity.cyclomaticComplexity).toBeGreaterThan(5);
      expect(func.complexity.cognitiveComplexity).toBeGreaterThan(0);
      expect(func.complexity.linesOfCode).toBeGreaterThan(10);
      expect(func.complexity.maintainabilityIndex).toBeLessThan(100);
    });

    it('should extract function calls correctly', async () => {
      const testFile = path.join(tempDir, 'calls.ts');
      const content = `
function helper1() {
  return 'helper1';
}

function helper2() {
  return 'helper2';
}

function mainFunction() {
  const result1 = helper1();
  const result2 = helper2();
  console.log(result1, result2);
  return result1 + result2;
}
`;
      fs.writeFileSync(testFile, content);

      const analysis = await parser.analyzeFile(testFile);
      const mainFunc = analysis!.functions.find(f => f.name === 'mainFunction');

      expect(mainFunc).toBeDefined();
      expect(mainFunc!.calls).toContain('helper1');
      expect(mainFunc!.calls).toContain('helper2');
      expect(mainFunc!.calls).toContain('log'); // console.log
    });

    it('should handle class inheritance and interfaces', async () => {
      const testFile = path.join(tempDir, 'inheritance.ts');
      const content = `
interface Drawable {
  draw(): void;
}

interface Movable {
  move(x: number, y: number): void;
}

abstract class Shape implements Drawable {
  abstract draw(): void;
  
  getArea(): number {
    return 0;
  }
}

class Circle extends Shape implements Movable {
  constructor(private radius: number) {
    super();
  }
  
  draw(): void {
    console.log('Drawing circle');
  }
  
  move(x: number, y: number): void {
    console.log(\`Moving to \${x}, \${y}\`);
  }
}
`;
      fs.writeFileSync(testFile, content);

      const analysis = await parser.analyzeFile(testFile);

      const drawableInterface = analysis!.interfaces.find(i => i.name === 'Drawable');
      expect(drawableInterface).toBeDefined();
      expect(drawableInterface!.methods).toHaveLength(1);

      const shapeClass = analysis!.classes.find(c => c.name === 'Shape');
      expect(shapeClass).toBeDefined();
      expect(shapeClass!.implements).toContain('Drawable');
      expect(shapeClass!.isAbstract).toBe(true);

      const circleClass = analysis!.classes.find(c => c.name === 'Circle');
      expect(circleClass).toBeDefined();
      expect(circleClass!.extends).toBe('Shape');
      expect(circleClass!.implements).toContain('Movable');
    });

    it('should extract imports and exports correctly', async () => {
      const testFile = path.join(tempDir, 'imports.ts');
      const content = `
import { readFile } from 'fs';
import * as path from 'path';
import React, { useState } from 'react';
import './styles.css';

export const API_URL = 'https://api.example.com';

export function processFile(filePath: string) {
  const fullPath = path.resolve(filePath);
  return readFile(fullPath);
}

export default class FileProcessor {
  process() {
    return processFile('test.txt');
  }
}
`;
      fs.writeFileSync(testFile, content);

      const analysis = await parser.analyzeFile(testFile);

      expect(analysis!.imports).toHaveLength(4);
      
      const fsImport = analysis!.imports.find(i => i.source === 'fs');
      expect(fsImport).toBeDefined();
      expect(fsImport!.imports).toContain('readFile');
      expect(fsImport!.isDefault).toBe(false);

      const pathImport = analysis!.imports.find(i => i.source === 'path');
      expect(pathImport).toBeDefined();
      expect(pathImport!.isNamespace).toBe(true);

      const reactImport = analysis!.imports.find(i => i.source === 'react');
      expect(reactImport).toBeDefined();
      expect(reactImport!.imports).toContain('React');
      expect(reactImport!.imports).toContain('useState');
      expect(reactImport!.isDefault).toBe(true);

      expect(analysis!.exports).toContain('API_URL');
      expect(analysis!.exports).toContain('processFile');
      expect(analysis!.exports).toContain('FileProcessor');
    });

    it('should return null for non-source files', async () => {
      const testFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(testFile, 'This is not a source file');

      const analysis = await parser.analyzeFile(testFile);
      expect(analysis).toBeNull();
    });

    it('should handle files that exceed size limit', async () => {
      const smallConfig: ASTParserConfig = {
        ...config,
        maxFileSize: 100 // Very small limit
      };
      const smallParser = new ASTParser(smallConfig);

      const testFile = path.join(tempDir, 'large.ts');
      const content = 'function test() { return "x".repeat(1000); }';
      fs.writeFileSync(testFile, content);

      const analysis = await smallParser.analyzeFile(testFile);
      expect(analysis).toBeNull();
    });
  });

  describe('analyzeDirectory', () => {
    it('should analyze all files in a directory', async () => {
      // Create test files
      const file1 = path.join(tempDir, 'file1.ts');
      const file2 = path.join(tempDir, 'file2.js');
      const subDir = path.join(tempDir, 'subdir');
      fs.mkdirSync(subDir);
      const file3 = path.join(subDir, 'file3.ts');

      fs.writeFileSync(file1, 'export function func1() {}');
      fs.writeFileSync(file2, 'function func2() {}');
      fs.writeFileSync(file3, 'export class Class3 {}');

      const analyses = await parser.analyzeDirectory(tempDir);

      expect(analyses).toHaveLength(3);
      expect(analyses.some(a => a.filePath.endsWith('file1.ts'))).toBe(true);
      expect(analyses.some(a => a.filePath.endsWith('file2.js'))).toBe(true);
      expect(analyses.some(a => a.filePath.endsWith('file3.ts'))).toBe(true);
    });

    it('should respect exclude patterns', async () => {
      const excludeConfig: ASTParserConfig = {
        ...config,
        excludePatterns: ['**/excluded/**']
      };
      const excludeParser = new ASTParser(excludeConfig);

      const includedFile = path.join(tempDir, 'included.ts');
      const excludedDir = path.join(tempDir, 'excluded');
      fs.mkdirSync(excludedDir);
      const excludedFile = path.join(excludedDir, 'excluded.ts');

      fs.writeFileSync(includedFile, 'export function included() {}');
      fs.writeFileSync(excludedFile, 'export function excluded() {}');

      const analyses = await excludeParser.analyzeDirectory(tempDir);

      expect(analyses).toHaveLength(1);
      expect(analyses[0].filePath).toBe(includedFile);
    });
  });

  describe('artifact creation', () => {
    it('should create artifacts for all code elements', async () => {
      const testFile = path.join(tempDir, 'artifacts.ts');
      const content = `
export interface Config {
  apiUrl: string;
}

export class Service {
  constructor(private config: Config) {}
  
  async getData(): Promise<any> {
    return fetch(this.config.apiUrl);
  }
}

export function createService(config: Config): Service {
  return new Service(config);
}
`;
      fs.writeFileSync(testFile, content);

      const analysis = await parser.analyzeFile(testFile);
      const artifacts = analysis!.artifacts;

      expect(artifacts).toHaveLength(4); // file + interface + class + function

      const fileArtifact = artifacts.find(a => a.type === 'file');
      expect(fileArtifact).toBeDefined();
      expect(fileArtifact!.name).toBe('artifacts.ts');

      const interfaceArtifact = artifacts.find(a => a.type === 'interface');
      expect(interfaceArtifact).toBeDefined();
      expect(interfaceArtifact!.name).toBe('Config');

      const classArtifact = artifacts.find(a => a.type === 'class');
      expect(classArtifact).toBeDefined();
      expect(classArtifact!.name).toBe('Service');
      expect(classArtifact!.metadata.methods).toContain('getData');

      const functionArtifact = artifacts.find(a => a.type === 'function');
      expect(functionArtifact).toBeDefined();
      expect(functionArtifact!.name).toBe('createService');
      expect(functionArtifact!.dependencies).toContain('Service');
    });
  });
});