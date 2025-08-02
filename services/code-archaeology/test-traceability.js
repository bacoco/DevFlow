const { TraceabilityService } = require('./dist/services/traceability-service');
const { CodeArchaeologyService } = require('./dist/index');
const path = require('path');

async function testTraceability() {
  console.log('Testing traceability functionality...');
  
  const service = new CodeArchaeologyService({
    includePatterns: ['**/*.ts', '**/*.tsx'],
    excludePatterns: ['node_modules/**', '**/*.test.ts', '**/*.spec.ts', 'dist/**'],
    maxFileSize: 1024 * 1024,
    calculateComplexity: true,
    analyzeDependencies: true,
    includeComments: false
  });

  const traceabilityService = new TraceabilityService({
    confidenceThreshold: 0.5,
    autoUpdateMatrix: false
  });

  try {
    // Use the project root (go up from services/code-archaeology)
    const projectRoot = path.resolve(__dirname, '../..');
    const serviceRoot = path.resolve(__dirname);
    
    console.log('Analyzing codebase...');
    const codebaseAnalysis = await service.analyzeCodebase(serviceRoot);
    console.log(`Found ${codebaseAnalysis.artifacts.length} code artifacts`);
    
    console.log('Performing traceability analysis...');
    const traceabilityAnalysis = await traceabilityService.analyzeTraceability(
      projectRoot,
      codebaseAnalysis
    );
    
    console.log('\n=== Traceability Analysis Results ===');
    console.log(`Total Requirements: ${traceabilityAnalysis.coverage.totalRequirements}`);
    console.log(`Linked Requirements: ${traceabilityAnalysis.coverage.linkedRequirements}`);
    console.log(`Coverage: ${traceabilityAnalysis.coverage.coveragePercentage.toFixed(1)}%`);
    console.log(`Links Generated: ${traceabilityAnalysis.traceabilityLinks.length}`);
    
    if (traceabilityAnalysis.traceabilityLinks.length > 0) {
      console.log('\n=== High Confidence Links ===');
      const highConfidenceLinks = traceabilityAnalysis.traceabilityLinks
        .filter(link => link.confidence >= 0.7)
        .slice(0, 5);
        
      for (const link of highConfidenceLinks) {
        console.log(`- ${link.requirementId} (${(link.confidence * 100).toFixed(1)}% confidence)`);
        console.log(`  Artifacts: ${link.codeArtifacts.length}`);
        console.log(`  Type: ${link.linkType}`);
      }
    }
    
    if (traceabilityAnalysis.coverage.gapAnalysis.length > 0) {
      console.log('\n=== Implementation Gaps ===');
      traceabilityAnalysis.coverage.gapAnalysis.slice(0, 10).forEach(gap => {
        console.log(`- ${gap}`);
      });
    }
    
    console.log('\nTraceability test completed successfully!');
    
  } catch (error) {
    console.error('Error during traceability test:', error);
  }
}

testTraceability();