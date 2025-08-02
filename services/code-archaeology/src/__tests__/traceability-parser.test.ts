import { TraceabilityParser, RequirementReference, TraceabilityLink } from '../parsers/traceability-parser';
import { CodeArtifact } from '../types';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('TraceabilityParser', () => {
  let parser: TraceabilityParser;
  
  beforeEach(() => {
    parser = new TraceabilityParser({
      specsDirectory: '.kiro/specs',
      confidenceThreshold: 0.7
    });
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('parseSpecFile', () => {
    it('should extract requirements and task references from spec file', async () => {
      const mockContent = `# Implementation Plan

- [x] 1. Set up project foundation
  - Create monorepo structure
  - Configure Docker containers
  - _Requirements: RF-001, RN-006_

- [ ] 2. Implement data models
  - Create TypeScript interfaces
  - Write unit tests
  - _Requirements: RF-001, RF-003_

## Requirements

### RF-001
User story content here

### RN-006
Non-functional requirement content`;

      mockFs.readFileSync.mockReturnValue(mockContent);
      mockFs.existsSync.mockReturnValue(true);

      const result = await parser.parseSpecFile('/test/tasks.md');

      expect(result).toBeDefined();
      expect(result!.specFile).toBe('/test/tasks.md');
      expect(result!.requirements).toContain('RF-001');
      expect(result!.requirements).toContain('RN-006');
      expect(result!.requirements).toContain('RF-003');
      expect(result!.taskReferences).toHaveLength(4); // RF-001 appears twice, RN-006 once, RF-003 once
    });

    it('should handle file read errors gracefully', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = await parser.parseSpecFile('/nonexistent/file.md');

      expect(result).toBeNull();
    });

    it('should extract task descriptions correctly', async () => {
      const mockContent = `- [x] 1.1 Create authentication service
  - Implement JWT token handling
  - Build user session management
  - _Requirements: RF-003_

- [ ] 2.2 Build data validation system
  - Create input sanitization
  - _Requirements: RF-001, RN-005_`;

      mockFs.readFileSync.mockReturnValue(mockContent);
      mockFs.existsSync.mockReturnValue(true);

      const result = await parser.parseSpecFile('/test/tasks.md');

      expect(result!.taskReferences).toHaveLength(3);
      
      const authTask = result!.taskReferences.find(ref => ref.requirementId === 'RF-003');
      expect(authTask?.taskDescription).toBe('1.1 Create authentication service');
      expect(authTask?.taskId).toBe('1.1');
      
      const validationTasks = result!.taskReferences.filter(ref => 
        ref.taskDescription === '2.2 Build data validation system'
      );
      expect(validationTasks).toHaveLength(2); // RF-001 and RN-005
    });
  });

  describe('parseSpecFiles', () => {
    it('should parse multiple spec files in directory structure', async () => {
      // Mock directory structure
      mockFs.existsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return pathStr.includes('.kiro/specs') || 
               pathStr.includes('requirements.md') || 
               pathStr.includes('tasks.md');
      });

      mockFs.readdirSync.mockReturnValue([
        { name: 'project-a', isDirectory: () => true },
        { name: 'project-b', isDirectory: () => true }
      ] as any);

      mockFs.readFileSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('requirements.md')) {
          return '### RF-001\nRequirement content\n### RF-002\nAnother requirement';
        }
        if (pathStr.includes('tasks.md')) {
          return '- [x] Task 1\n  - _Requirements: RF-001_\n- [ ] Task 2\n  - _Requirements: RF-002_';
        }
        return '';
      });

      const results = await parser.parseSpecFiles('/test/repo');

      expect(results).toHaveLength(6); // 2 projects × 3 files each (requirements.md, design.md, tasks.md)
      // Some files may have empty requirements/taskReferences (like design.md), which is expected
      expect(results.some(r => r.requirements.length > 0)).toBe(true);
      expect(results.some(r => r.taskReferences.length > 0)).toBe(true);
    });

    it('should handle missing specs directory', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await expect(parser.parseSpecFiles('/test/repo')).rejects.toThrow('Specs directory not found');
    });
  });

  describe('parseTraceabilityMatrix', () => {
    it('should parse existing traceability matrix correctly', async () => {
      const mockContent = `# Requirements Traceability Matrix

| Requirement ID | Hook Name | Test Case |
|---------------|-----------|-----------|
| RF-001 | auth-hook | test-auth.js |
| RF-002 |  | validation-test.js |
| RN-001 | perf-hook |  |`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockContent);

      const result = await parser.parseTraceabilityMatrix('/test/traceability.md');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        requirementId: 'RF-001',
        hookName: 'auth-hook',
        testCase: 'test-auth.js',
        codeArtifacts: [],
        coverage: 0
      });
      expect(result[1]).toEqual({
        requirementId: 'RF-002',
        hookName: undefined,
        testCase: 'validation-test.js',
        codeArtifacts: [],
        coverage: 0
      });
    });

    it('should handle missing traceability file', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await parser.parseTraceabilityMatrix('/nonexistent/traceability.md');

      expect(result).toEqual([]);
    });
  });

  describe('linkRequirementsToCode', () => {
    it('should link requirements to related code artifacts', () => {
      const specResults = [{
        specFile: '/test/tasks.md',
        requirements: ['RF-001', 'RF-002'],
        taskReferences: [
          {
            requirementId: 'RF-001',
            taskId: '1.1',
            taskDescription: 'Create authentication service',
            confidence: 0.8
          },
          {
            requirementId: 'RF-002',
            taskId: '2.1',
            taskDescription: 'Build data parser',
            confidence: 0.9
          }
        ]
      }];

      const codeArtifacts: CodeArtifact[] = [
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
        },
        {
          id: 'data-parser-1',
          filePath: '/src/parsers/data-parser.ts',
          type: 'function',
          name: 'parseData',
          position3D: { x: 1, y: 0, z: 0 },
          complexity: 3,
          changeFrequency: 0.2,
          lastModified: new Date(),
          authors: ['dev2'],
          dependencies: [],
          startLine: 10,
          endLine: 30,
          size: 20,
          metadata: {}
        }
      ];

      const links = parser.linkRequirementsToCode(specResults, codeArtifacts);

      expect(links).toHaveLength(2);
      
      const authLink = links.find(l => l.requirementId === 'RF-001');
      expect(authLink).toBeDefined();
      expect(authLink!.codeArtifacts).toContain('auth-service-1');
      expect(authLink!.linkType).toBe('implements');
      expect(authLink!.confidence).toBeGreaterThan(0.7);

      const parserLink = links.find(l => l.requirementId === 'RF-002');
      expect(parserLink).toBeDefined();
      expect(parserLink!.codeArtifacts).toContain('data-parser-1');
    });

    it('should filter out low confidence links', () => {
      const specResults = [{
        specFile: '/test/tasks.md',
        requirements: ['RF-001'],
        taskReferences: [
          {
            requirementId: 'RF-001',
            taskId: '1.1',
            taskDescription: 'vague task',
            confidence: 0.3 // Low confidence
          }
        ]
      }];

      const codeArtifacts: CodeArtifact[] = [{
        id: 'unrelated-1',
        filePath: '/src/unrelated.ts',
        type: 'function',
        name: 'unrelatedFunction',
        position3D: { x: 0, y: 0, z: 0 },
        complexity: 1,
        changeFrequency: 0.1,
        lastModified: new Date(),
        authors: ['dev1'],
        dependencies: [],
        startLine: 1,
        endLine: 10,
        size: 10,
        metadata: {}
      }];

      const links = parser.linkRequirementsToCode(specResults, codeArtifacts);

      expect(links).toHaveLength(0); // Should be filtered out due to low confidence
    });
  });

  describe('calculateLinkConfidence', () => {
    it('should calculate higher confidence for clear task descriptions', () => {
      const taskRefs: RequirementReference[] = [
        {
          requirementId: 'RF-001',
          taskId: '1.1',
          taskDescription: 'Implement comprehensive authentication service with JWT token handling and user session management',
          confidence: 0.8
        }
      ];

      const artifacts: CodeArtifact[] = [{
        id: 'auth-1',
        filePath: '/src/auth/auth-service.ts',
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
      }];

      const confidence = parser.calculateLinkConfidence(taskRefs, artifacts);

      expect(confidence).toBeGreaterThan(0.8);
    });

    it('should calculate lower confidence for vague descriptions', () => {
      const taskRefs: RequirementReference[] = [
        {
          requirementId: 'RF-001',
          taskId: '1.1',
          taskDescription: 'Do stuff',
          confidence: 0.5
        }
      ];

      const artifacts: CodeArtifact[] = [];

      const confidence = parser.calculateLinkConfidence(taskRefs, artifacts);

      expect(confidence).toBeLessThan(0.6);
    });
  });

  describe('updateTraceabilityMatrix', () => {
    it('should update traceability matrix with new links', async () => {
      const existingContent = `
# Requirements Traceability Matrix

| Requirement ID | Hook Name | Test Case |
|---------------|-----------|-----------|
| RF-001 | | |
| RF-002 | | |
      `;

      const newLinks: TraceabilityLink[] = [
        {
          requirementId: 'RF-001',
          specFile: '/test/tasks.md',
          codeArtifacts: ['auth-service-1', 'auth-controller-1'],
          linkType: 'implements',
          confidence: 0.85,
          taskReferences: []
        }
      ];

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(existingContent);
      mockFs.writeFileSync.mockImplementation(() => {});

      await parser.updateTraceabilityMatrix('/test/traceability.md', newLinks);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/test/traceability.md',
        expect.stringContaining('auth-service-1'),
        'utf-8'
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/test/traceability.md',
        expect.stringContaining('40%'), // Coverage calculation (2 artifacts * 20% each)
        'utf-8'
      );
    });

    it('should handle write errors gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('');
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });

      const links: TraceabilityLink[] = [];

      await expect(parser.updateTraceabilityMatrix('/test/traceability.md', links))
        .rejects.toThrow('Write failed');
    });
  });

  describe('confidence scoring', () => {
    it('should boost confidence for implementation keywords', () => {
      const taskDescription = 'Implement user authentication service';
      const confidence = (parser as any).calculateTaskReferenceConfidence(taskDescription, 'RF-001');
      
      expect(confidence).toBeGreaterThan(0.7); // Should get boost for "implement"
    });

    it('should boost confidence for test-related tasks', () => {
      const taskDescription = 'Write unit tests for authentication service';
      const confidence = (parser as any).calculateTaskReferenceConfidence(taskDescription, 'RF-001');
      
      expect(confidence).toBeGreaterThan(0.6); // Should get boost for "test"
    });

    it('should boost confidence when requirement ID appears in description', () => {
      const taskDescription = 'Implement RF-001 authentication requirements';
      const confidence = (parser as any).calculateTaskReferenceConfidence(taskDescription, 'RF-001');
      
      expect(confidence).toBeGreaterThan(0.7); // Should get boost for requirement ID match
    });
  });
});