import { CodeArchaeologyService } from '../index';
import { TraceabilityService } from '../services/traceability-service';
import * as path from 'path';
import * as fs from 'fs';

describe('Traceability Integration', () => {
  let service: CodeArchaeologyService;
  let traceabilityService: TraceabilityService;

  beforeEach(() => {
    service = new CodeArchaeologyService({
      includePatterns: ['**/*.ts', '**/*.tsx'],
      excludePatterns: ['node_modules/**', '**/*.test.ts', '**/*.spec.ts'],
      maxFileSize: 1024 * 1024,
      calculateComplexity: true,
      analyzeDependencies: true,
      includeComments: false
    });

    traceabilityService = new TraceabilityService({
      confidenceThreshold: 0.5, // Lower threshold for testing
      autoUpdateMatrix: false // Don't auto-update during tests
    });
  });

  describe('Real spec file parsing', () => {
    it('should parse actual spec files from the project', async () => {
      // Use the actual project root (go up from services/code-archaeology)
      const projectRoot = path.resolve(__dirname, '../../../..');
      const specsPath = path.join(projectRoot, '.kiro/specs/developer-productivity-dashboard');
      
      // Check if spec files exist
      const tasksPath = path.join(specsPath, 'tasks.md');
      const requirementsPath = path.join(specsPath, 'requirements.md');
      
      if (!fs.existsSync(tasksPath) || !fs.existsSync(requirementsPath)) {
        console.log('Spec files not found, skipping integration test');
        return;
      }

      // Parse the actual spec files
      const specResults = await traceabilityService['parser'].parseSpecFiles(projectRoot);
      
      expect(specResults.length).toBeGreaterThan(0);
      
      // Should find requirements in the spec files
      const allRequirements = specResults.flatMap(r => r.requirements);
      expect(allRequirements).toContain('RF-001');
      expect(allRequirements).toContain('RF-014'); // The requirement this task implements
      
      // Should find task references
      const allTaskRefs = specResults.flatMap(r => r.taskReferences);
      expect(allTaskRefs.length).toBeGreaterThan(0);
      
      // Should find the specific task we're implementing
      const traceabilityTask = allTaskRefs.find(ref => 
        ref.taskDescription.toLowerCase().includes('traceability') &&
        ref.requirementId === 'RF-014'
      );
      expect(traceabilityTask).toBeDefined();
    });

    it('should link traceability parser code to RF-014 requirement', async () => {
      const projectRoot = path.resolve(__dirname, '../../../..');
      
      // Analyze the code archaeology service itself
      const codebaseAnalysis = await service.analyzeCodebase(path.join(projectRoot, 'services/code-archaeology'));
      
      // Should find traceability-related artifacts
      const traceabilityArtifacts = codebaseAnalysis.artifacts.filter(artifact =>
        artifact.name.toLowerCase().includes('traceability') ||
        artifact.filePath.toLowerCase().includes('traceability')
      );
      
      expect(traceabilityArtifacts.length).toBeGreaterThan(0);
      
      // Should find the TraceabilityParser class
      const parserArtifact = traceabilityArtifacts.find(artifact =>
        artifact.name === 'TraceabilityParser'
      );
      expect(parserArtifact).toBeDefined();
      
      // Should find the TraceabilityService class
      const serviceArtifact = traceabilityArtifacts.find(artifact =>
        artifact.name === 'TraceabilityService'
      );
      expect(serviceArtifact).toBeDefined();
    });
  });

  describe('End-to-end traceability analysis', () => {
    it('should perform complete traceability analysis on code archaeology service', async () => {
      const projectRoot = path.resolve(__dirname, '../../../..');
      const serviceRoot = path.join(projectRoot, 'services/code-archaeology');
      
      // Perform codebase analysis
      const codebaseAnalysis = await service.analyzeCodebase(serviceRoot);
      expect(codebaseAnalysis.artifacts.length).toBeGreaterThan(0);
      
      // Perform traceability analysis
      const traceabilityAnalysis = await traceabilityService.analyzeTraceability(
        projectRoot, // Use project root to find specs
        codebaseAnalysis
      );
      
      expect(traceabilityAnalysis.specResults.length).toBeGreaterThan(0);
      expect(traceabilityAnalysis.coverage.totalRequirements).toBeGreaterThan(0);
      
      // Generate report
      const report = traceabilityService.generateTraceabilityReport(traceabilityAnalysis);
      expect(report).toContain('# Traceability Analysis Report');
      expect(report).toContain('Coverage Summary');
      
      console.log('Traceability Analysis Summary:');
      console.log(`- Total Requirements: ${traceabilityAnalysis.coverage.totalRequirements}`);
      console.log(`- Linked Requirements: ${traceabilityAnalysis.coverage.linkedRequirements}`);
      console.log(`- Coverage: ${traceabilityAnalysis.coverage.coveragePercentage.toFixed(1)}%`);
      console.log(`- Links Generated: ${traceabilityAnalysis.traceabilityLinks.length}`);
    });
  });

  describe('Confidence scoring validation', () => {
    it('should assign appropriate confidence scores to different task types', () => {
      const parser = traceabilityService['parser'];
      
      // High confidence: implementation task with clear description
      const implConfidence = (parser as any).calculateTaskReferenceConfidence(
        'Implement traceability parser for spec-code linking with comprehensive unit tests',
        'RF-014'
      );
      expect(implConfidence).toBeGreaterThan(0.8);
      
      // Medium confidence: test task
      const testConfidence = (parser as any).calculateTaskReferenceConfidence(
        'Write unit tests for traceability parsing',
        'RF-014'
      );
      expect(testConfidence).toBeGreaterThan(0.6);
      expect(testConfidence).toBeLessThan(0.9);
      
      // Low confidence: vague task
      const vagueConfidence = (parser as any).calculateTaskReferenceConfidence(
        'Do stuff',
        'RF-014'
      );
      expect(vagueConfidence).toBeLessThan(0.6);
    });
  });
});