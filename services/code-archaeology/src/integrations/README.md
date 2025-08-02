# Git Integration for Code Archaeology

This module provides enhanced Git history analysis capabilities for the Code Archaeology service, enabling detailed tracking of code changes, author contributions, and hotspot identification.

## Features

### 🔍 Git History Analysis
- **Commit-level tracking**: Detailed analysis of every commit with file changes
- **Line-by-line diff analysis**: Parse Git diffs to understand exact code changes
- **Author contribution tracking**: Track who contributed to which parts of the codebase
- **Change frequency calculation**: Identify files and code sections that change most often

### 🔥 Hotspot Detection
- **File-level hotspots**: Identify files that are changed frequently
- **Function/class-level hotspots**: Track changes to specific code artifacts
- **Recency weighting**: Recent changes are weighted more heavily
- **Author diversity factor**: Code touched by many authors gets higher hotspot scores

### 👥 Author Analytics
- **Contribution summaries**: Lines added/deleted, files modified, commit counts
- **Activity periods**: Track when authors were most active
- **Team collaboration patterns**: Understand how different authors work together

### 📈 Trend Analysis
- **Monthly activity trends**: Track repository activity over time
- **File change trends**: Identify files with increasing/decreasing activity
- **Seasonal patterns**: Understand development cycles and patterns

## Usage

### Basic Integration

```typescript
import { CodeArchaeologyService, defaultConfig } from '../index';

const service = new CodeArchaeologyService(defaultConfig);

// Analyze codebase with Git history integration
const enhancedAnalysis = await service.analyzeCodebaseWithGitHistory('/path/to/repo', {
  maxCommits: 100,
  includePatterns: ['**/*.ts', '**/*.js'],
  excludePatterns: ['node_modules/**', '**/*.test.*']
});

// Access enhanced artifacts with Git metadata
enhancedAnalysis.artifacts.forEach(artifact => {
  console.log(`${artifact.name}: ${artifact.changeFrequency} changes by ${artifact.authors.join(', ')}`);
  console.log(`Hotspot score: ${artifact.gitMetadata.hotspotScore}`);
  console.log(`Recent activity: ${artifact.gitMetadata.recentActivity}`);
});
```

### Advanced Analysis

```typescript
import { GitCodeArchaeologyIntegration } from './git-integration';

const integration = new GitCodeArchaeologyIntegration('/path/to/repo');
const enhancedAnalysis = await integration.enhanceCodebaseAnalysis(baseAnalysis);

// Get author contribution summary
const authorSummary = integration.getAuthorContributionSummary(enhancedAnalysis.gitAnalysis);
console.log(`Total authors: ${authorSummary.totalAuthors}`);
console.log(`Active authors: ${authorSummary.activeAuthors}`);

// Get file change trends
const trends = integration.getFileChangeTrends(enhancedAnalysis.gitAnalysis);
trends.monthlyActivity.forEach(month => {
  console.log(`${month.month}: ${month.totalCommits} commits`);
});
```

## Data Structures

### Enhanced Code Artifacts

Each code artifact is enhanced with Git metadata:

```typescript
interface EnhancedCodeArtifact extends CodeArtifact {
  changeFrequency: number;  // Populated from Git data
  authors: string[];        // Populated from Git data
  gitMetadata: {
    totalCommits: number;
    uniqueAuthors: number;
    firstCommit?: Date;
    lastCommit?: Date;
    averageLinesChanged: number;
    hotspotScore: number;
    recentActivity: boolean;
    authorList: string[];
  };
}
```

### Git History Analysis

Complete Git history analysis results:

```typescript
interface GitHistoryAnalysis {
  repositoryPath: string;
  analyzedAt: Date;
  totalCommits: number;
  dateRange: { earliest: Date; latest: Date };
  commits: GitCommitInfo[];
  authorContributions: Map<string, AuthorContribution>;
  fileChangeFrequencies: Map<string, FileChangeFrequency>;
  hotspotFiles: string[];
}
```

## Configuration Options

### Git Integration Config

```typescript
interface GitIntegrationConfig {
  maxCommits?: number;        // Limit number of commits to analyze
  since?: Date;              // Only analyze commits after this date
  until?: Date;              // Only analyze commits before this date
  includePatterns?: string[]; // File patterns to include
  excludePatterns?: string[]; // File patterns to exclude
}
```

### Default Patterns

The integration uses sensible defaults for TypeScript/JavaScript projects:

- **Include**: `**/*.ts`, `**/*.tsx`, `**/*.js`, `**/*.jsx`
- **Exclude**: `node_modules/**`, `dist/**`, `build/**`, `**/*.test.*`, `**/*.spec.*`, `**/*.d.ts`

## Hotspot Scoring Algorithm

The hotspot score is calculated using multiple factors:

```
hotspotScore = changeFrequency × recencyFactor × authorDiversityFactor
```

Where:
- **changeFrequency**: Number of times the code was changed
- **recencyFactor**: Weight based on how recently the code was changed (decays over 1 year)
- **authorDiversityFactor**: Bonus for code touched by multiple authors (up to 2x multiplier)

## Line-Level Analysis

For function and class artifacts, the integration performs line-level analysis:

1. **Overlap Detection**: Identifies commits that touched the artifact's line range
2. **Diff Analysis**: Parses Git diffs to understand exact changes
3. **Author Tracking**: Tracks which authors modified specific code sections
4. **Change Quantification**: Measures lines added/deleted within the artifact

## Performance Considerations

### Large Repositories

For large repositories, consider:

- **Limiting commits**: Use `maxCommits` to analyze recent history only
- **Date filtering**: Use `since`/`until` to focus on specific time periods
- **Pattern filtering**: Use `includePatterns`/`excludePatterns` to focus on relevant files

### Memory Usage

The analyzer uses several optimizations:

- **Streaming processing**: Processes commits one at a time
- **Efficient data structures**: Uses Maps and Sets for fast lookups
- **Configurable buffers**: Adjustable buffer sizes for Git commands

## Error Handling

The integration handles various error conditions gracefully:

- **Non-Git repositories**: Throws clear error messages
- **Empty repositories**: Returns empty analysis results
- **Corrupted Git history**: Skips problematic commits and continues
- **Large diffs**: Uses configurable buffer sizes to handle large changes

## Testing

Comprehensive test suite covers:

- **Git history parsing**: Accurate commit and diff parsing
- **Author contribution calculation**: Correct statistics computation
- **Hotspot detection**: Proper scoring and ranking
- **Line-level analysis**: Accurate artifact-level change tracking
- **Error handling**: Graceful handling of edge cases

Run tests with:

```bash
npm test -- --testPathPattern=git-integration.test.ts
```

## Examples

See `examples/git-integration-example.ts` for a complete demonstration of the Git integration capabilities.

## Requirements Fulfilled

This implementation fulfills the following task requirements:

✅ **Extend existing Git collector**: Enhanced with detailed file change analysis  
✅ **Commit-level tracking**: Line-by-line diff analysis implemented  
✅ **Author contribution tracking**: Complete author statistics and change frequency  
✅ **Integration with CodeArchaeologyService**: Populates `changeFrequency` and `authors` fields  
✅ **Integration tests**: Comprehensive test suite for accuracy validation  

The integration enables the Code Archaeology service to provide rich, Git-backed insights into codebase evolution and developer activity patterns.