#!/usr/bin/env ts-node

/**
 * Example demonstrating how to use the enhanced Git history analyzer
 * with the CodeArchaeologyService to populate changeFrequency and authors fields
 */

import { CodeArchaeologyService, defaultConfig } from '../index';
import { GitCodeArchaeologyIntegration } from '../integrations/git-integration';

async function demonstrateGitIntegration() {
  // Example repository path - replace with actual repository path
  const repositoryPath = process.argv[2] || process.cwd();
  
  console.log(`Analyzing repository: ${repositoryPath}`);
  console.log('=' .repeat(60));

  try {
    // Initialize the CodeArchaeologyService
    const service = new CodeArchaeologyService(defaultConfig);
    
    // Perform enhanced analysis with Git history integration
    const enhancedAnalysis = await service.analyzeCodebaseWithGitHistory(repositoryPath, {
      maxCommits: 100, // Limit to last 100 commits for demo
      includePatterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
      excludePatterns: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.d.ts'
      ]
    });

    // Display basic analysis results
    console.log('\n📊 Codebase Analysis Results:');
    console.log(`  Total Files: ${enhancedAnalysis.totalFiles}`);
    console.log(`  Total Functions: ${enhancedAnalysis.totalFunctions}`);
    console.log(`  Total Classes: ${enhancedAnalysis.totalClasses}`);
    console.log(`  Total Interfaces: ${enhancedAnalysis.totalInterfaces}`);
    console.log(`  Total Artifacts: ${enhancedAnalysis.artifacts.length}`);

    // Display Git analysis results
    console.log('\n🔍 Git History Analysis:');
    console.log(`  Total Commits: ${enhancedAnalysis.gitAnalysis.totalCommits}`);
    console.log(`  Date Range: ${enhancedAnalysis.gitAnalysis.dateRange.earliest.toISOString().split('T')[0]} to ${enhancedAnalysis.gitAnalysis.dateRange.latest.toISOString().split('T')[0]}`);
    console.log(`  Authors: ${enhancedAnalysis.gitAnalysis.authorContributions.size}`);
    console.log(`  Files with Changes: ${enhancedAnalysis.gitAnalysis.fileChangeFrequencies.size}`);

    // Display top hotspot files
    console.log('\n🔥 Top Hotspot Files:');
    enhancedAnalysis.gitAnalysis.hotspotFiles.slice(0, 5).forEach((file, index) => {
      const freq = enhancedAnalysis.gitAnalysis.fileChangeFrequencies.get(file);
      if (freq) {
        console.log(`  ${index + 1}. ${file}`);
        console.log(`     Changes: ${freq.totalChanges}, Authors: ${freq.authors.size}, Score: ${freq.hotspotScore.toFixed(2)}`);
      }
    });

    // Display top hotspot artifacts (functions/classes with most changes)
    console.log('\n🎯 Top Hotspot Artifacts:');
    enhancedAnalysis.hotspotArtifacts.slice(0, 5).forEach((artifact, index) => {
      console.log(`  ${index + 1}. ${artifact.type}: ${artifact.name} (${artifact.filePath})`);
      console.log(`     Git Commits: ${artifact.gitMetadata.totalCommits}`);
      console.log(`     Authors: ${artifact.gitMetadata.authorList.join(', ')}`);
      console.log(`     Hotspot Score: ${artifact.gitMetadata.hotspotScore.toFixed(2)}`);
      console.log(`     Recent Activity: ${artifact.gitMetadata.recentActivity ? 'Yes' : 'No'}`);
    });

    // Display author contribution summary
    const integration = new GitCodeArchaeologyIntegration(repositoryPath);
    const authorSummary = integration.getAuthorContributionSummary(enhancedAnalysis.gitAnalysis);
    
    console.log('\n👥 Author Contributions:');
    console.log(`  Total Authors: ${authorSummary.totalAuthors}`);
    console.log(`  Active Authors (last 90 days): ${authorSummary.activeAuthors}`);
    console.log('\n  Top Contributors:');
    authorSummary.topContributors.slice(0, 5).forEach((contributor, index) => {
      console.log(`    ${index + 1}. ${contributor.author} <${contributor.email}>`);
      console.log(`       Commits: ${contributor.commits}, Files: ${contributor.filesModified}`);
      console.log(`       Lines: +${contributor.linesAdded}/-${contributor.linesDeleted}`);
    });

    // Display file change trends
    const trends = integration.getFileChangeTrends(enhancedAnalysis.gitAnalysis);
    
    console.log('\n📈 Recent Activity Trends:');
    const recentMonths = trends.monthlyActivity.slice(-6); // Last 6 months
    recentMonths.forEach(month => {
      console.log(`  ${month.month}: ${month.totalCommits} commits, ${month.filesChanged} files changed`);
    });

    console.log('\n📊 Trending Files (increasing activity):');
    trends.trendingFiles
      .filter(f => f.trend === 'increasing')
      .slice(0, 5)
      .forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.filePath} (${file.recentChanges} recent changes)`);
      });

    // Example: Find artifacts that need attention (high complexity + high change frequency)
    console.log('\n⚠️  Artifacts Needing Attention (High Complexity + High Change Frequency):');
    const needsAttention = enhancedAnalysis.artifacts
      .filter(artifact => 
        artifact.complexity > 10 && 
        artifact.gitMetadata.hotspotScore > 5 &&
        artifact.gitMetadata.recentActivity
      )
      .sort((a, b) => (b.complexity * b.gitMetadata.hotspotScore) - (a.complexity * a.gitMetadata.hotspotScore))
      .slice(0, 5);

    if (needsAttention.length > 0) {
      needsAttention.forEach((artifact, index) => {
        console.log(`  ${index + 1}. ${artifact.type}: ${artifact.name} (${artifact.filePath})`);
        console.log(`     Complexity: ${artifact.complexity}, Hotspot Score: ${artifact.gitMetadata.hotspotScore.toFixed(2)}`);
        console.log(`     Authors: ${artifact.gitMetadata.authorList.slice(0, 3).join(', ')}${artifact.gitMetadata.authorList.length > 3 ? '...' : ''}`);
      });
    } else {
      console.log('  No artifacts currently need immediate attention.');
    }

    console.log('\n✅ Analysis complete!');
    console.log('\nKey Benefits of Git Integration:');
    console.log('  • changeFrequency field populated with actual Git data');
    console.log('  • authors field contains real contributor information');
    console.log('  • Hotspot detection based on change patterns and recency');
    console.log('  • Line-level analysis for functions and classes');
    console.log('  • Author contribution tracking and trends');
    console.log('  • Identification of code that needs refactoring attention');

  } catch (error) {
    console.error('Error during analysis:', error);
    process.exit(1);
  }
}

// Run the demonstration
if (require.main === module) {
  demonstrateGitIntegration().catch(console.error);
}

export { demonstrateGitIntegration };