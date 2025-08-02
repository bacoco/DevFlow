import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface GitCommitInfo {
  hash: string;
  author: string;
  authorEmail: string;
  date: Date;
  message: string;
  parentHashes: string[];
  filesChanged: FileChangeInfo[];
}

export interface FileChangeInfo {
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted' | 'renamed';
  linesAdded: number;
  linesDeleted: number;
  oldFilePath?: string; // for renamed files
  diffHunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'added' | 'deleted' | 'context';
  content: string;
  lineNumber: number;
}

export interface AuthorContribution {
  author: string;
  email: string;
  totalCommits: number;
  totalLinesAdded: number;
  totalLinesDeleted: number;
  filesModified: Set<string>;
  firstCommit: Date;
  lastCommit: Date;
  commitsByMonth: Map<string, number>; // YYYY-MM -> count
}

export interface FileChangeFrequency {
  filePath: string;
  totalChanges: number;
  authors: Set<string>;
  firstChanged: Date;
  lastChanged: Date;
  changesByMonth: Map<string, number>; // YYYY-MM -> count
  averageLinesChanged: number;
  hotspotScore: number; // calculated based on frequency and recency
}

export interface GitHistoryAnalysis {
  repositoryPath: string;
  analyzedAt: Date;
  totalCommits: number;
  dateRange: {
    earliest: Date;
    latest: Date;
  };
  commits: GitCommitInfo[];
  authorContributions: Map<string, AuthorContribution>;
  fileChangeFrequencies: Map<string, FileChangeFrequency>;
  hotspotFiles: string[]; // top 20 most frequently changed files
}

export class GitHistoryAnalyzer {
  private repositoryPath: string;

  constructor(repositoryPath: string) {
    this.repositoryPath = repositoryPath;
    
    // Verify this is a git repository
    if (!this.isGitRepository()) {
      throw new Error(`Path ${repositoryPath} is not a git repository`);
    }
  }

  /**
   * Analyze the complete Git history of the repository
   */
  async analyzeHistory(options: {
    maxCommits?: number;
    since?: Date;
    until?: Date;
    includePatterns?: string[];
    excludePatterns?: string[];
  } = {}): Promise<GitHistoryAnalysis> {
    const startTime = Date.now();
    
    // Get commit history
    const commits = await this.getCommitHistory(options);
    
    // Calculate author contributions
    const authorContributions = this.calculateAuthorContributions(commits);
    
    // Calculate file change frequencies
    const fileChangeFrequencies = this.calculateFileChangeFrequencies(commits, options);
    
    // Identify hotspot files
    const hotspotFiles = this.identifyHotspotFiles(fileChangeFrequencies);
    
    // Determine date range
    const dates = commits.map(c => c.date).sort((a, b) => a.getTime() - b.getTime());
    const dateRange = {
      earliest: dates[0] || new Date(),
      latest: dates[dates.length - 1] || new Date()
    };

    console.log(`Git history analysis completed in ${Date.now() - startTime}ms`);
    
    return {
      repositoryPath: this.repositoryPath,
      analyzedAt: new Date(),
      totalCommits: commits.length,
      dateRange,
      commits,
      authorContributions,
      fileChangeFrequencies,
      hotspotFiles
    };
  }

  /**
   * Get detailed commit history with file changes
   */
  private async getCommitHistory(options: {
    maxCommits?: number;
    since?: Date;
    until?: Date;
  }): Promise<GitCommitInfo[]> {
    const commits: GitCommitInfo[] = [];
    
    // Build git log command
    let gitLogCmd = 'git log --pretty=format:"%H|%an|%ae|%ai|%P|%s" --numstat';
    
    if (options.maxCommits) {
      gitLogCmd += ` -n ${options.maxCommits}`;
    }
    
    if (options.since) {
      gitLogCmd += ` --since="${options.since.toISOString()}"`;
    }
    
    if (options.until) {
      gitLogCmd += ` --until="${options.until.toISOString()}"`;
    }

    try {
      const output = execSync(gitLogCmd, {
        cwd: this.repositoryPath,
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024 // 50MB buffer for large repositories
      });

      const lines = output.trim().split('\n');
      let i = 0;

      while (i < lines.length) {
        const line = lines[i];
        
        // Skip empty lines
        if (!line.trim()) {
          i++;
          continue;
        }

        // Parse commit info line
        const parts = line.split('|');
        if (parts.length < 6) {
          i++;
          continue;
        }

        const [hash, author, authorEmail, dateStr, parentHashesStr, message] = parts;
        const date = new Date(dateStr);
        const parentHashes = parentHashesStr ? parentHashesStr.split(' ') : [];

        // Parse file changes (numstat output)
        const filesChanged: FileChangeInfo[] = [];
        i++; // Move to next line

        while (i < lines.length && lines[i] && !lines[i].includes('|')) {
          const statLine = lines[i].trim();
          if (statLine) {
            const statParts = statLine.split('\t');
            if (statParts.length >= 3) {
              const [addedStr, deletedStr, filePath] = statParts;
              const linesAdded = addedStr === '-' ? 0 : parseInt(addedStr, 10) || 0;
              const linesDeleted = deletedStr === '-' ? 0 : parseInt(deletedStr, 10) || 0;
              
              // Determine change type
              let changeType: 'added' | 'modified' | 'deleted' | 'renamed' = 'modified';
              let oldFilePath: string | undefined;
              
              if (linesAdded > 0 && linesDeleted === 0) {
                changeType = 'added';
              } else if (linesAdded === 0 && linesDeleted > 0) {
                changeType = 'deleted';
              } else if (filePath.includes(' => ')) {
                changeType = 'renamed';
                const renameParts = filePath.split(' => ');
                oldFilePath = renameParts[0].replace(/^{|}$/g, '');
              }

              // Get detailed diff for this file
              const diffHunks = await this.getFileDiff(hash, filePath, parentHashes[0]);

              filesChanged.push({
                filePath: changeType === 'renamed' ? filePath.split(' => ')[1].replace(/^{|}$/g, '') : filePath,
                changeType,
                linesAdded,
                linesDeleted,
                oldFilePath,
                diffHunks
              });
            }
          }
          i++;
        }

        commits.push({
          hash,
          author,
          authorEmail,
          date,
          message,
          parentHashes,
          filesChanged
        });
      }

    } catch (error) {
      console.error('Error getting commit history:', error);
      throw new Error(`Failed to analyze git history: ${error}`);
    }

    return commits;
  }

  /**
   * Get detailed diff information for a specific file in a commit
   */
  private async getFileDiff(commitHash: string, filePath: string, parentHash?: string): Promise<DiffHunk[]> {
    if (!parentHash) {
      return []; // Initial commit, no diff available
    }

    try {
      const diffCmd = `git diff ${parentHash} ${commitHash} -- "${filePath}"`;
      const diffOutput = execSync(diffCmd, {
        cwd: this.repositoryPath,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large diffs
      });

      return this.parseDiffOutput(diffOutput);
    } catch (error) {
      // File might not exist in parent commit or other issues
      return [];
    }
  }

  /**
   * Parse git diff output into structured diff hunks
   */
  private parseDiffOutput(diffOutput: string): DiffHunk[] {
    const hunks: DiffHunk[] = [];
    const lines = diffOutput.split('\n');
    
    let currentHunk: DiffHunk | null = null;
    let oldLineNumber = 0;
    let newLineNumber = 0;

    for (const line of lines) {
      // Parse hunk header (e.g., @@ -1,4 +1,6 @@)
      const hunkMatch = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
      if (hunkMatch) {
        // Save previous hunk if exists
        if (currentHunk) {
          hunks.push(currentHunk);
        }

        const oldStart = parseInt(hunkMatch[1], 10);
        const oldLines = parseInt(hunkMatch[2] || '1', 10);
        const newStart = parseInt(hunkMatch[3], 10);
        const newLines = parseInt(hunkMatch[4] || '1', 10);

        currentHunk = {
          oldStart,
          oldLines,
          newStart,
          newLines,
          lines: []
        };

        oldLineNumber = oldStart;
        newLineNumber = newStart;
        continue;
      }

      // Parse diff lines
      if (currentHunk && (line.startsWith('+') || line.startsWith('-') || line.startsWith(' '))) {
        const type = line.startsWith('+') ? 'added' : 
                    line.startsWith('-') ? 'deleted' : 'context';
        
        const content = line.substring(1); // Remove +, -, or space prefix
        
        let lineNumber: number;
        if (type === 'added') {
          lineNumber = newLineNumber++;
          if (line.startsWith(' ')) oldLineNumber++; // Context lines increment both
        } else if (type === 'deleted') {
          lineNumber = oldLineNumber++;
          if (line.startsWith(' ')) newLineNumber++; // Context lines increment both
        } else {
          lineNumber = newLineNumber++;
          oldLineNumber++;
        }

        currentHunk.lines.push({
          type,
          content,
          lineNumber
        });
      }
    }

    // Add the last hunk
    if (currentHunk) {
      hunks.push(currentHunk);
    }

    return hunks;
  }

  /**
   * Calculate author contribution statistics
   */
  private calculateAuthorContributions(commits: GitCommitInfo[]): Map<string, AuthorContribution> {
    const contributions = new Map<string, AuthorContribution>();

    for (const commit of commits) {
      const key = `${commit.author} <${commit.authorEmail}>`;
      
      let contribution = contributions.get(key);
      if (!contribution) {
        contribution = {
          author: commit.author,
          email: commit.authorEmail,
          totalCommits: 0,
          totalLinesAdded: 0,
          totalLinesDeleted: 0,
          filesModified: new Set<string>(),
          firstCommit: commit.date,
          lastCommit: commit.date,
          commitsByMonth: new Map<string, number>()
        };
        contributions.set(key, contribution);
      }

      // Update statistics
      contribution.totalCommits++;
      
      if (commit.date < contribution.firstCommit) {
        contribution.firstCommit = commit.date;
      }
      if (commit.date > contribution.lastCommit) {
        contribution.lastCommit = commit.date;
      }

      // Update monthly commit count
      const monthKey = `${commit.date.getFullYear()}-${String(commit.date.getMonth() + 1).padStart(2, '0')}`;
      contribution.commitsByMonth.set(monthKey, (contribution.commitsByMonth.get(monthKey) || 0) + 1);

      // Process file changes
      for (const fileChange of commit.filesChanged) {
        contribution.totalLinesAdded += fileChange.linesAdded;
        contribution.totalLinesDeleted += fileChange.linesDeleted;
        contribution.filesModified.add(fileChange.filePath);
      }
    }

    return contributions;
  }

  /**
   * Calculate file change frequency statistics
   */
  private calculateFileChangeFrequencies(
    commits: GitCommitInfo[], 
    options: { includePatterns?: string[]; excludePatterns?: string[] }
  ): Map<string, FileChangeFrequency> {
    const frequencies = new Map<string, FileChangeFrequency>();

    for (const commit of commits) {
      for (const fileChange of commit.filesChanged) {
        const filePath = fileChange.filePath;
        
        // Apply include/exclude patterns
        if (options.includePatterns && !this.matchesPatterns(filePath, options.includePatterns)) {
          continue;
        }
        if (options.excludePatterns && this.matchesPatterns(filePath, options.excludePatterns)) {
          continue;
        }

        let frequency = frequencies.get(filePath);
        if (!frequency) {
          frequency = {
            filePath,
            totalChanges: 0,
            authors: new Set<string>(),
            firstChanged: commit.date,
            lastChanged: commit.date,
            changesByMonth: new Map<string, number>(),
            averageLinesChanged: 0,
            hotspotScore: 0
          };
          frequencies.set(filePath, frequency);
        }

        // Update statistics
        frequency.totalChanges++;
        frequency.authors.add(commit.author);
        
        if (commit.date < frequency.firstChanged) {
          frequency.firstChanged = commit.date;
        }
        if (commit.date > frequency.lastChanged) {
          frequency.lastChanged = commit.date;
        }

        // Update monthly change count
        const monthKey = `${commit.date.getFullYear()}-${String(commit.date.getMonth() + 1).padStart(2, '0')}`;
        frequency.changesByMonth.set(monthKey, (frequency.changesByMonth.get(monthKey) || 0) + 1);
      }
    }

    // Calculate derived metrics
    for (const frequency of frequencies.values()) {
      // Calculate average lines changed
      let totalLinesChanged = 0;
      let changeCount = 0;
      
      for (const commit of commits) {
        for (const fileChange of commit.filesChanged) {
          if (fileChange.filePath === frequency.filePath) {
            totalLinesChanged += fileChange.linesAdded + fileChange.linesDeleted;
            changeCount++;
          }
        }
      }
      
      frequency.averageLinesChanged = changeCount > 0 ? totalLinesChanged / changeCount : 0;
      
      // Calculate hotspot score (frequency * recency factor * author diversity)
      const daysSinceLastChange = (Date.now() - frequency.lastChanged.getTime()) / (1000 * 60 * 60 * 24);
      const recencyFactor = Math.max(0.1, 1 - (daysSinceLastChange / 365)); // Decay over a year
      const authorDiversityFactor = Math.min(2, frequency.authors.size / 3); // More authors = higher score
      
      frequency.hotspotScore = frequency.totalChanges * recencyFactor * authorDiversityFactor;
    }

    return frequencies;
  }

  /**
   * Identify hotspot files based on change frequency and other factors
   */
  private identifyHotspotFiles(frequencies: Map<string, FileChangeFrequency>): string[] {
    const sortedFiles = Array.from(frequencies.values())
      .sort((a, b) => b.hotspotScore - a.hotspotScore)
      .slice(0, 20) // Top 20 hotspots
      .map(f => f.filePath);

    return sortedFiles;
  }

  /**
   * Check if a file path matches any of the given patterns
   */
  private matchesPatterns(filePath: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      // Simple glob pattern matching
      const regex = new RegExp(
        pattern
          .replace(/\*\*/g, '.*')
          .replace(/\*/g, '[^/]*')
          .replace(/\?/g, '[^/]')
      );
      return regex.test(filePath);
    });
  }

  /**
   * Check if the given path is a git repository
   */
  private isGitRepository(): boolean {
    try {
      const gitDir = path.join(this.repositoryPath, '.git');
      return fs.existsSync(gitDir);
    } catch {
      return false;
    }
  }

  /**
   * Get the current branch name
   */
  getCurrentBranch(): string {
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: this.repositoryPath,
        encoding: 'utf8'
      }).trim();
      return branch;
    } catch {
      return 'main';
    }
  }

  /**
   * Get list of all branches
   */
  getAllBranches(): string[] {
    try {
      const output = execSync('git branch -a', {
        cwd: this.repositoryPath,
        encoding: 'utf8'
      });
      
      return output
        .split('\n')
        .map(line => line.trim().replace(/^\*\s*/, '').replace(/^remotes\/origin\//, ''))
        .filter(line => line && !line.includes('HEAD ->'))
        .filter((branch, index, arr) => arr.indexOf(branch) === index); // Remove duplicates
    } catch {
      return ['main'];
    }
  }
}