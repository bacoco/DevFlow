import { CodeArtifact, CodebaseAnalysis } from '../types';
import { 
  GitHistoryAnalyzer, 
  GitHistoryAnalysis, 
  FileChangeFrequency,
  GitCommitInfo,
  AuthorContribution 
} from './git-history-analyzer';
import * as path from 'path';

export interface GitIntegrationConfig {
  maxCommits?: number;
  since?: Date;
  until?: Date;
  includePatterns?: string[];
  excludePatterns?: string[];
}

export interface EnhancedCodeArtifact extends CodeArtifact {
  gitMetadata: {
    totalCommits: number;
    uniqueAuthors: number;
    firstCommit?: Date;
    lastCommit?: Date;
    averageLinesChanged: number;
    hotspotScore: number;
    recentActivity: boolean; // changed in last 30 days
    authorList: string[];
  };
}

export interface EnhancedCodebaseAnalysis extends Omit<CodebaseAnalysis, 'artifacts'> {
  artifacts: EnhancedCodeArtifact[];
  gitAnalysis: GitHistoryAnalysis;
  hotspotArtifacts: EnhancedCodeArtifact[];
}

export class GitCodeArchaeologyIntegration {
  private gitAnalyzer: GitHistoryAnalyzer;
  private repositoryPath: string;

  constructor(repositoryPath: string) {
    this.repositoryPath = repositoryPath;
    this.gitAnalyzer = new GitHistoryAnalyzer(repositoryPath);
  }

  /**
   * Enhance a codebase analysis with Git history data
   */
  async enhanceCodebaseAnalysis(
    codebaseAnalysis: CodebaseAnalysis,
    config: GitIntegrationConfig = {}
  ): Promise<EnhancedCodebaseAnalysis> {
    console.log('Starting Git integration for code archaeology...');
    
    // Analyze Git history
    const gitAnalysis = await this.gitAnalyzer.analyzeHistory({
      maxCommits: config.maxCommits,
      since: config.since,
      until: config.until,
      includePatterns: config.includePatterns || [
        '**/*.ts',
        '**/*.tsx',
        '**/*.js',
        '**/*.jsx'
      ],
      excludePatterns: config.excludePatterns || [
        'node_modules/**',
        'dist/**',
        'build/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.d.ts'
      ]
    });

    // Enhance artifacts with Git data
    const enhancedArtifacts = this.enhanceArtifacts(codebaseAnalysis.artifacts, gitAnalysis);

    // Identify hotspot artifacts
    const hotspotArtifacts = this.identifyHotspotArtifacts(enhancedArtifacts);

    console.log(`Enhanced ${enhancedArtifacts.length} artifacts with Git history data`);
    console.log(`Identified ${hotspotArtifacts.length} hotspot artifacts`);

    return {
      ...codebaseAnalysis,
      artifacts: enhancedArtifacts,
      gitAnalysis,
      hotspotArtifacts
    };
  }

  /**
   * Enhance individual artifacts with Git history data
   */
  private enhanceArtifacts(
    artifacts: CodeArtifact[],
    gitAnalysis: GitHistoryAnalysis
  ): EnhancedCodeArtifact[] {
    const enhancedArtifacts: EnhancedCodeArtifact[] = [];

    for (const artifact of artifacts) {
      const gitMetadata = this.calculateArtifactGitMetadata(artifact, gitAnalysis);
      
      const enhancedArtifact: EnhancedCodeArtifact = {
        ...artifact,
        changeFrequency: gitMetadata.hotspotScore,
        authors: gitMetadata.authorList,
        lastModified: gitMetadata.lastCommit || artifact.lastModified,
        gitMetadata
      };

      enhancedArtifacts.push(enhancedArtifact);
    }

    return enhancedArtifacts;
  }

  /**
   * Calculate Git metadata for a specific artifact
   */
  private calculateArtifactGitMetadata(
    artifact: CodeArtifact,
    gitAnalysis: GitHistoryAnalysis
  ): EnhancedCodeArtifact['gitMetadata'] {
    // Get file-level change frequency data
    const fileFrequency = gitAnalysis.fileChangeFrequencies.get(artifact.filePath);
    
    if (!fileFrequency) {
      // No Git history for this file
      return {
        totalCommits: 0,
        uniqueAuthors: 0,
        averageLinesChanged: 0,
        hotspotScore: 0,
        recentActivity: false,
        authorList: []
      };
    }

    // For function/class/interface artifacts, we need to analyze line-level changes
    const lineBasedMetadata = this.calculateLineBasedMetadata(artifact, gitAnalysis);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentActivity = fileFrequency.lastChanged > thirtyDaysAgo;

    return {
      totalCommits: lineBasedMetadata.totalCommits || fileFrequency.totalChanges,
      uniqueAuthors: lineBasedMetadata.uniqueAuthors || fileFrequency.authors.size,
      firstCommit: fileFrequency.firstChanged,
      lastCommit: fileFrequency.lastChanged,
      averageLinesChanged: lineBasedMetadata.averageLinesChanged || fileFrequency.averageLinesChanged,
      hotspotScore: lineBasedMetadata.hotspotScore || fileFrequency.hotspotScore,
      recentActivity,
      authorList: lineBasedMetadata.authorList || Array.from(fileFrequency.authors)
    };
  }

  /**
   * Calculate line-based metadata for artifacts that represent specific code sections
   */
  private calculateLineBasedMetadata(
    artifact: CodeArtifact,
    gitAnalysis: GitHistoryAnalysis
  ): {
    totalCommits: number;
    uniqueAuthors: number;
    averageLinesChanged: number;
    hotspotScore: number;
    authorList: string[];
  } {
    // For file-level artifacts, use file-level data
    if (artifact.type === 'file') {
      const fileFreq = gitAnalysis.fileChangeFrequencies.get(artifact.filePath);
      if (fileFreq) {
        return {
          totalCommits: fileFreq.totalChanges,
          uniqueAuthors: fileFreq.authors.size,
          averageLinesChanged: fileFreq.averageLinesChanged,
          hotspotScore: fileFreq.hotspotScore,
          authorList: Array.from(fileFreq.authors)
        };
      }
    }

    // For function/class/interface artifacts, analyze commits that touched their lines
    const relevantCommits = gitAnalysis.commits.filter(commit => {
      return commit.filesChanged.some(fileChange => {
        if (fileChange.filePath !== artifact.filePath) {
          return false;
        }

        // Check if any diff hunks overlap with the artifact's line range
        return fileChange.diffHunks.some(hunk => {
          const hunkStart = Math.min(hunk.oldStart, hunk.newStart);
          const hunkEnd = Math.max(
            hunk.oldStart + hunk.oldLines,
            hunk.newStart + hunk.newLines
          );

          // Check for overlap with artifact's line range
          return !(hunkEnd < artifact.startLine || hunkStart > artifact.endLine);
        });
      });
    });

    const authors = new Set<string>();
    let totalLinesChanged = 0;

    for (const commit of relevantCommits) {
      authors.add(commit.author);
      
      // Calculate lines changed within the artifact's range
      const fileChange = commit.filesChanged.find(fc => fc.filePath === artifact.filePath);
      if (fileChange) {
        for (const hunk of fileChange.diffHunks) {
          const relevantLines = hunk.lines.filter(line => {
            return line.lineNumber >= artifact.startLine && line.lineNumber <= artifact.endLine;
          });
          totalLinesChanged += relevantLines.length;
        }
      }
    }

    const averageLinesChanged = relevantCommits.length > 0 ? totalLinesChanged / relevantCommits.length : 0;
    
    // Calculate hotspot score for this specific artifact
    const daysSinceLastChange = relevantCommits.length > 0 
      ? (Date.now() - Math.max(...relevantCommits.map(c => c.date.getTime()))) / (1000 * 60 * 60 * 24)
      : 365;
    
    const recencyFactor = Math.max(0.1, 1 - (daysSinceLastChange / 365));
    const authorDiversityFactor = Math.min(2, authors.size / 3);
    const hotspotScore = relevantCommits.length * recencyFactor * authorDiversityFactor;

    return {
      totalCommits: relevantCommits.length,
      uniqueAuthors: authors.size,
      averageLinesChanged,
      hotspotScore,
      authorList: Array.from(authors)
    };
  }

  /**
   * Identify artifacts that are hotspots based on Git activity
   */
  private identifyHotspotArtifacts(artifacts: EnhancedCodeArtifact[]): EnhancedCodeArtifact[] {
    return artifacts
      .filter(artifact => artifact.gitMetadata.hotspotScore > 0)
      .sort((a, b) => b.gitMetadata.hotspotScore - a.gitMetadata.hotspotScore)
      .slice(0, 50); // Top 50 hotspots
  }

  /**
   * Get author contribution summary for the codebase
   */
  getAuthorContributionSummary(gitAnalysis: GitHistoryAnalysis): {
    topContributors: Array<{
      author: string;
      email: string;
      commits: number;
      linesAdded: number;
      linesDeleted: number;
      filesModified: number;
      activityPeriod: string;
    }>;
    totalAuthors: number;
    activeAuthors: number; // authors with commits in last 90 days
  } {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const contributorData = Array.from(gitAnalysis.authorContributions.values())
      .map(contrib => ({
        author: contrib.author,
        email: contrib.email,
        commits: contrib.totalCommits,
        linesAdded: contrib.totalLinesAdded,
        linesDeleted: contrib.totalLinesDeleted,
        filesModified: contrib.filesModified.size,
        activityPeriod: `${contrib.firstCommit.toISOString().split('T')[0]} to ${contrib.lastCommit.toISOString().split('T')[0]}`,
        isActive: contrib.lastCommit > ninetyDaysAgo
      }))
      .sort((a, b) => b.commits - a.commits);

    return {
      topContributors: contributorData.slice(0, 10),
      totalAuthors: contributorData.length,
      activeAuthors: contributorData.filter(c => c.isActive).length
    };
  }

  /**
   * Get file change trends over time
   */
  getFileChangeTrends(gitAnalysis: GitHistoryAnalysis): {
    monthlyActivity: Array<{
      month: string;
      totalCommits: number;
      filesChanged: number;
      linesAdded: number;
      linesDeleted: number;
    }>;
    trendingFiles: Array<{
      filePath: string;
      recentChanges: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    }>;
  } {
    // Calculate monthly activity
    const monthlyData = new Map<string, {
      commits: number;
      files: Set<string>;
      linesAdded: number;
      linesDeleted: number;
    }>();

    for (const commit of gitAnalysis.commits) {
      const monthKey = `${commit.date.getFullYear()}-${String(commit.date.getMonth() + 1).padStart(2, '0')}`;
      
      let monthData = monthlyData.get(monthKey);
      if (!monthData) {
        monthData = {
          commits: 0,
          files: new Set<string>(),
          linesAdded: 0,
          linesDeleted: 0
        };
        monthlyData.set(monthKey, monthData);
      }

      monthData.commits++;
      for (const fileChange of commit.filesChanged) {
        monthData.files.add(fileChange.filePath);
        monthData.linesAdded += fileChange.linesAdded;
        monthData.linesDeleted += fileChange.linesDeleted;
      }
    }

    const monthlyActivity = Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        totalCommits: data.commits,
        filesChanged: data.files.size,
        linesAdded: data.linesAdded,
        linesDeleted: data.linesDeleted
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Calculate trending files (files with increasing change frequency)
    const trendingFiles = Array.from(gitAnalysis.fileChangeFrequencies.values())
      .map(freq => {
        const recentMonths = Array.from(freq.changesByMonth.entries())
          .sort((a, b) => b[0].localeCompare(a[0]))
          .slice(0, 3);

        const recentChanges = recentMonths.reduce((sum, [, count]) => sum + count, 0);
        
        // Simple trend calculation based on recent vs older activity
        const olderMonths = Array.from(freq.changesByMonth.entries())
          .sort((a, b) => b[0].localeCompare(a[0]))
          .slice(3, 6);
        
        const olderChanges = olderMonths.reduce((sum, [, count]) => sum + count, 0);
        
        let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        if (recentChanges > olderChanges * 1.2) {
          trend = 'increasing';
        } else if (recentChanges < olderChanges * 0.8) {
          trend = 'decreasing';
        }

        return {
          filePath: freq.filePath,
          recentChanges,
          trend
        };
      })
      .filter(f => f.recentChanges > 0)
      .sort((a, b) => b.recentChanges - a.recentChanges)
      .slice(0, 20);

    return {
      monthlyActivity,
      trendingFiles
    };
  }
}