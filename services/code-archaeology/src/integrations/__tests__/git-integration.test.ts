import { GitHistoryAnalyzer } from '../git-history-analyzer';
import { GitCodeArchaeologyIntegration } from '../git-integration';
import { CodebaseAnalysis, CodeArtifact } from '../../types';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('GitCodeArchaeologyIntegration', () => {
  let testRepoPath: string;
  let gitAnalyzer: GitHistoryAnalyzer;
  let integration: GitCodeArchaeologyIntegration;

  beforeAll(async () => {
    // Create a temporary test repository
    testRepoPath = path.join(__dirname, 'test-repo');
    await setupTestRepository(testRepoPath);
    
    gitAnalyzer = new GitHistoryAnalyzer(testRepoPath);
    integration = new GitCodeArchaeologyIntegration(testRepoPath);
  });

  afterAll(async () => {
    // Clean up test repository
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true, force: true });
    }
  });

  describe('GitHistoryAnalyzer', () => {
    it('should analyze git history correctly', async () => {
      const analysis = await gitAnalyzer.analyzeHistory({
        maxCommits: 10
      });

      expect(analysis).toBeDefined();
      expect(analysis.repositoryPath).toBe(testRepoPath);
      expect(analysis.totalCommits).toBeGreaterThan(0);
      expect(analysis.commits).toHaveLength(analysis.totalCommits);
      expect(analysis.authorContributions.size).toBeGreaterThan(0);
      expect(analysis.fileChangeFrequencies.size).toBeGreaterThan(0);
    });

    it('should calculate author contributions correctly', async () => {
      const analysis = await gitAnalyzer.analyzeHistory();
      
      const contributions = Array.from(analysis.authorContributions.values());
      expect(contributions.length).toBeGreaterThan(0);
      
      const firstContribution = contributions[0];
      expect(firstContribution.author).toBeDefined();
      expect(firstContribution.email).toBeDefined();
      expect(firstContribution.totalCommits).toBeGreaterThan(0);
      expect(firstContribution.filesModified.size).toBeGreaterThan(0);
      expect(firstContribution.firstCommit).toBeInstanceOf(Date);
      expect(firstContribution.lastCommit).toBeInstanceOf(Date);
    });

    it('should calculate file change frequencies correctly', async () => {
      const analysis = await gitAnalyzer.analyzeHistory({
        includePatterns: ['**/*.ts', '**/*.js']
      });
      
      const frequencies = Array.from(analysis.fileChangeFrequencies.values());
      expect(frequencies.length).toBeGreaterThan(0);
      
      const firstFrequency = frequencies[0];
      expect(firstFrequency.filePath).toBeDefined();
      expect(firstFrequency.totalChanges).toBeGreaterThan(0);
      expect(firstFrequency.authors.size).toBeGreaterThan(0);
      expect(firstFrequency.hotspotScore).toBeGreaterThanOrEqual(0);
    });

    it('should identify hotspot files', async () => {
      const analysis = await gitAnalyzer.analyzeHistory();
      
      expect(analysis.hotspotFiles).toBeDefined();
      expect(Array.isArray(analysis.hotspotFiles)).toBe(true);
      
      if (analysis.hotspotFiles.length > 0) {
        const hotspotFile = analysis.hotspotFiles[0];
        const frequency = analysis.fileChangeFrequencies.get(hotspotFile);
        expect(frequency).toBeDefined();
        expect(frequency!.hotspotScore).toBeGreaterThan(0);
      }
    });

    it('should parse diff hunks correctly', async () => {
      const analysis = await gitAnalyzer.analyzeHistory({ maxCommits: 5 });
      
      // Find a commit with file changes
      const commitWithChanges = analysis.commits.find(c => c.filesChanged.length > 0);
      expect(commitWithChanges).toBeDefined();
      
      if (commitWithChanges) {
        const fileChange = commitWithChanges.filesChanged[0];
        expect(fileChange.filePath).toBeDefined();
        expect(fileChange.changeType).toMatch(/^(added|modified|deleted|renamed)$/);
        expect(typeof fileChange.linesAdded).toBe('number');
        expect(typeof fileChange.linesDeleted).toBe('number');
        expect(Array.isArray(fileChange.diffHunks)).toBe(true);
      }
    });
  });

  describe('GitCodeArchaeologyIntegration', () => {
    let mockCodebaseAnalysis: CodebaseAnalysis;

    beforeEach(() => {
      // Create mock codebase analysis
      mockCodebaseAnalysis = {
        id: 'test-analysis',
        repositoryPath: testRepoPath,
        analyzedAt: new Date(),
        totalFiles: 2,
        totalFunctions: 3,
        totalClasses: 1,
        totalInterfaces: 1,
        artifacts: [
          {
            id: 'artifact-1',
            filePath: 'src/test.ts',
            type: 'function',
            name: 'testFunction',
            position3D: { x: 0, y: 0, z: 0 },
            complexity: 5,
            changeFrequency: 0, // Will be populated by integration
            lastModified: new Date(),
            authors: [], // Will be populated by integration
            dependencies: [],
            startLine: 1,
            endLine: 10,
            size: 10,
            metadata: {}
          },
          {
            id: 'artifact-2',
            filePath: 'src/utils.ts',
            type: 'class',
            name: 'TestClass',
            position3D: { x: 1, y: 0, z: 0 },
            complexity: 8,
            changeFrequency: 0, // Will be populated by integration
            lastModified: new Date(),
            authors: [], // Will be populated by integration
            dependencies: [],
            startLine: 15,
            endLine: 30,
            size: 16,
            metadata: {}
          }
        ],
        dependencies: {
          artifacts: [],
          relations: []
        },
        fileAnalyses: [],
        summary: {
          totalLinesOfCode: 100,
          averageComplexity: 6.5,
          mostComplexFiles: ['src/utils.ts'],
          dependencyHotspots: []
        }
      };
    });

    it('should enhance codebase analysis with git data', async () => {
      const enhanced = await integration.enhanceCodebaseAnalysis(mockCodebaseAnalysis);

      expect(enhanced).toBeDefined();
      expect(enhanced.gitAnalysis).toBeDefined();
      expect(enhanced.hotspotArtifacts).toBeDefined();
      expect(Array.isArray(enhanced.artifacts)).toBe(true);
      
      // Check that artifacts were enhanced
      const enhancedArtifact = enhanced.artifacts[0];
      expect(enhancedArtifact.gitMetadata).toBeDefined();
      expect(enhancedArtifact.gitMetadata.totalCommits).toBeGreaterThanOrEqual(0);
      expect(enhancedArtifact.gitMetadata.uniqueAuthors).toBeGreaterThanOrEqual(0);
      expect(typeof enhancedArtifact.gitMetadata.hotspotScore).toBe('number');
      expect(Array.isArray(enhancedArtifact.gitMetadata.authorList)).toBe(true);
    });

    it('should populate changeFrequency and authors fields', async () => {
      const enhanced = await integration.enhanceCodebaseAnalysis(mockCodebaseAnalysis);

      for (const artifact of enhanced.artifacts) {
        expect(typeof artifact.changeFrequency).toBe('number');
        expect(Array.isArray(artifact.authors)).toBe(true);
        
        // If the file exists in git history, these should be populated
        const fileFreq = enhanced.gitAnalysis.fileChangeFrequencies.get(artifact.filePath);
        if (fileFreq) {
          expect(artifact.changeFrequency).toBeGreaterThan(0);
          expect(artifact.authors.length).toBeGreaterThan(0);
        }
      }
    });

    it('should identify hotspot artifacts correctly', async () => {
      const enhanced = await integration.enhanceCodebaseAnalysis(mockCodebaseAnalysis);

      expect(Array.isArray(enhanced.hotspotArtifacts)).toBe(true);
      
      // Hotspot artifacts should be sorted by hotspot score
      for (let i = 1; i < enhanced.hotspotArtifacts.length; i++) {
        const current = enhanced.hotspotArtifacts[i];
        const previous = enhanced.hotspotArtifacts[i - 1];
        expect(current.gitMetadata.hotspotScore).toBeLessThanOrEqual(previous.gitMetadata.hotspotScore);
      }
    });

    it('should calculate line-based metadata for specific artifacts', async () => {
      const enhanced = await integration.enhanceCodebaseAnalysis(mockCodebaseAnalysis);

      const functionArtifact = enhanced.artifacts.find(a => a.type === 'function');
      if (functionArtifact) {
        expect(functionArtifact.gitMetadata).toBeDefined();
        expect(typeof functionArtifact.gitMetadata.totalCommits).toBe('number');
        expect(typeof functionArtifact.gitMetadata.averageLinesChanged).toBe('number');
        expect(typeof functionArtifact.gitMetadata.recentActivity).toBe('boolean');
      }
    });

    it('should provide author contribution summary', async () => {
      const enhanced = await integration.enhanceCodebaseAnalysis(mockCodebaseAnalysis);
      const summary = integration.getAuthorContributionSummary(enhanced.gitAnalysis);

      expect(summary).toBeDefined();
      expect(typeof summary.totalAuthors).toBe('number');
      expect(typeof summary.activeAuthors).toBe('number');
      expect(Array.isArray(summary.topContributors)).toBe(true);
      
      if (summary.topContributors.length > 0) {
        const topContributor = summary.topContributors[0];
        expect(topContributor.author).toBeDefined();
        expect(topContributor.email).toBeDefined();
        expect(typeof topContributor.commits).toBe('number');
        expect(typeof topContributor.linesAdded).toBe('number');
        expect(typeof topContributor.linesDeleted).toBe('number');
        expect(typeof topContributor.filesModified).toBe('number');
      }
    });

    it('should provide file change trends', async () => {
      const enhanced = await integration.enhanceCodebaseAnalysis(mockCodebaseAnalysis);
      const trends = integration.getFileChangeTrends(enhanced.gitAnalysis);

      expect(trends).toBeDefined();
      expect(Array.isArray(trends.monthlyActivity)).toBe(true);
      expect(Array.isArray(trends.trendingFiles)).toBe(true);
      
      if (trends.monthlyActivity.length > 0) {
        const monthData = trends.monthlyActivity[0];
        expect(monthData.month).toMatch(/^\d{4}-\d{2}$/);
        expect(typeof monthData.totalCommits).toBe('number');
        expect(typeof monthData.filesChanged).toBe('number');
        expect(typeof monthData.linesAdded).toBe('number');
        expect(typeof monthData.linesDeleted).toBe('number');
      }
    });
  });

  describe('Error handling', () => {
    it('should handle non-git repositories gracefully', () => {
      const nonGitPath = path.join(__dirname, 'non-git-repo');
      fs.mkdirSync(nonGitPath, { recursive: true });

      expect(() => {
        new GitHistoryAnalyzer(nonGitPath);
      }).toThrow('is not a git repository');

      fs.rmSync(nonGitPath, { recursive: true, force: true });
    });

    it('should handle empty repositories', async () => {
      const emptyRepoPath = path.join(__dirname, 'empty-repo');
      fs.mkdirSync(emptyRepoPath, { recursive: true });
      
      try {
        execSync('git init', { cwd: emptyRepoPath });
        execSync('git config user.email "test@example.com"', { cwd: emptyRepoPath });
        execSync('git config user.name "Test User"', { cwd: emptyRepoPath });

        const analyzer = new GitHistoryAnalyzer(emptyRepoPath);
        const analysis = await analyzer.analyzeHistory();

        expect(analysis.totalCommits).toBe(0);
        expect(analysis.commits).toHaveLength(0);
        expect(analysis.authorContributions.size).toBe(0);
        expect(analysis.fileChangeFrequencies.size).toBe(0);
      } finally {
        fs.rmSync(emptyRepoPath, { recursive: true, force: true });
      }
    });
  });
});

/**
 * Set up a test Git repository with some commits for testing
 */
async function setupTestRepository(repoPath: string): Promise<void> {
  // Clean up if exists
  if (fs.existsSync(repoPath)) {
    fs.rmSync(repoPath, { recursive: true, force: true });
  }

  // Create directory structure
  fs.mkdirSync(repoPath, { recursive: true });
  fs.mkdirSync(path.join(repoPath, 'src'), { recursive: true });

  // Initialize git repository
  execSync('git init', { cwd: repoPath });
  execSync('git config user.email "test@example.com"', { cwd: repoPath });
  execSync('git config user.name "Test User"', { cwd: repoPath });

  // Create initial files
  fs.writeFileSync(
    path.join(repoPath, 'src', 'test.ts'),
    `export function testFunction(): string {
  return 'hello world';
}

export function anotherFunction(param: number): number {
  return param * 2;
}
`
  );

  fs.writeFileSync(
    path.join(repoPath, 'src', 'utils.ts'),
    `export class TestClass {
  private value: number;

  constructor(value: number) {
    this.value = value;
  }

  getValue(): number {
    return this.value;
  }

  setValue(value: number): void {
    this.value = value;
  }
}

export interface TestInterface {
  id: string;
  name: string;
}
`
  );

  fs.writeFileSync(
    path.join(repoPath, 'README.md'),
    '# Test Repository\n\nThis is a test repository for Git integration tests.\n'
  );

  // Create initial commit
  execSync('git add .', { cwd: repoPath });
  execSync('git commit -m "Initial commit"', { cwd: repoPath });

  // Make some changes and additional commits
  fs.appendFileSync(
    path.join(repoPath, 'src', 'test.ts'),
    `
export function thirdFunction(): boolean {
  return true;
}
`
  );

  execSync('git add src/test.ts', { cwd: repoPath });
  execSync('git commit -m "Add third function"', { cwd: repoPath });

  // Modify existing function
  fs.writeFileSync(
    path.join(repoPath, 'src', 'test.ts'),
    `export function testFunction(): string {
  console.log('Modified function');
  return 'hello world modified';
}

export function anotherFunction(param: number): number {
  return param * 2;
}

export function thirdFunction(): boolean {
  return true;
}
`
  );

  execSync('git add src/test.ts', { cwd: repoPath });
  execSync('git commit -m "Modify testFunction"', { cwd: repoPath });

  // Add new method to class
  fs.writeFileSync(
    path.join(repoPath, 'src', 'utils.ts'),
    `export class TestClass {
  private value: number;

  constructor(value: number) {
    this.value = value;
  }

  getValue(): number {
    return this.value;
  }

  setValue(value: number): void {
    this.value = value;
  }

  doubleValue(): number {
    return this.value * 2;
  }
}

export interface TestInterface {
  id: string;
  name: string;
  description?: string;
}
`
  );

  execSync('git add src/utils.ts', { cwd: repoPath });
  execSync('git commit -m "Add doubleValue method and optional description field"', { cwd: repoPath });

  // Update README
  fs.writeFileSync(
    path.join(repoPath, 'README.md'),
    `# Test Repository

This is a test repository for Git integration tests.

## Features

- TypeScript support
- Test functions and classes
- Git history analysis
`
  );

  execSync('git add README.md', { cwd: repoPath });
  execSync('git commit -m "Update README with features"', { cwd: repoPath });
}