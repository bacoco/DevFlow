import { HotspotDetector, CodeHotspot, HotspotAnalysis } from '../services/hotspot-detector';
import { CodeArtifact, CodebaseAnalysis } from '../types';

describe('HotspotDetector', () => {
  let detector: HotspotDetector;
  let mockCodebaseAnalysis: CodebaseAnalysis;

  beforeEach(() => {
    detector = new HotspotDetector();
    
    // Create mock codebase analysis with various artifacts
    mockCodebaseAnalysis = {
      id: 'test-analysis',
      repositoryPath: '/test/repo',
      analyzedAt: new Date(),
      totalFiles: 5,
      totalFunctions: 10,
      totalClasses: 3,
      totalInterfaces: 2,
      artifacts: [
        // High change frequency artifact
        {
          id: 'high-change-freq',
          filePath: 'src/services/user-service.ts',
          type: 'class',
          name: 'UserService',
          position3D: { x: 0, y: 0, z: 0 },
          complexity: 8,
          changeFrequency: 25, // High change frequency
          lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          authors: ['alice', 'bob', 'charlie'],
          dependencies: ['database', 'auth'],
          startLine: 1,
          endLine: 100,
          size: 100,
          metadata: {}
        },
        // High complexity artifact
        {
          id: 'high-complexity',
          filePath: 'src/utils/complex-calculator.ts',
          type: 'function',
          name: 'complexCalculation',
          position3D: { x: 1, y: 0, z: 0 },
          complexity: 20, // High complexity
          changeFrequency: 5,
          lastModified: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
          authors: ['alice'],
          dependencies: ['math-utils'],
          startLine: 50,
          endLine: 150,
          size: 100,
          metadata: {}
        },
        // High author churn artifact
        {
          id: 'high-author-churn',
          filePath: 'src/components/shared-component.tsx',
          type: 'class',
          name: 'SharedComponent',
          position3D: { x: 2, y: 0, z: 0 },
          complexity: 6,
          changeFrequency: 8,
          lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          authors: ['alice', 'bob', 'charlie', 'david', 'eve', 'frank'], // Many authors
          dependencies: ['react', 'utils'],
          startLine: 1,
          endLine: 80,
          size: 80,
          metadata: {}
        },
        // Low risk artifact
        {
          id: 'low-risk',
          filePath: 'src/constants/app-constants.ts',
          type: 'variable',
          name: 'APP_CONSTANTS',
          position3D: { x: 3, y: 0, z: 0 },
          complexity: 1,
          changeFrequency: 1,
          lastModified: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          authors: ['alice'],
          dependencies: [],
          startLine: 1,
          endLine: 20,
          size: 20,
          metadata: {}
        },
        // Test file (should be skipped)
        {
          id: 'test-file',
          filePath: 'src/__tests__/user-service.test.ts',
          type: 'function',
          name: 'testUserService',
          position3D: { x: 4, y: 0, z: 0 },
          complexity: 15,
          changeFrequency: 20,
          lastModified: new Date(),
          authors: ['alice', 'bob'],
          dependencies: ['jest'],
          startLine: 1,
          endLine: 200,
          size: 200,
          metadata: {}
        }
      ],
      dependencies: { artifacts: [], relations: [] },
      fileAnalyses: [],
      summary: {
        totalLinesOfCode: 500,
        averageComplexity: 10,
        mostComplexFiles: [],
        dependencyHotspots: []
      }
    };
  });

  describe('analyzeHotspots', () => {
    it('should detect hotspots correctly', () => {
      const analysis = detector.analyzeHotspots(mockCodebaseAnalysis);

      expect(analysis.hotspots).toBeDefined();
      expect(analysis.summary).toBeDefined();
      expect(analysis.trends).toBeDefined();
      
      // Should detect hotspots but skip test files
      expect(analysis.hotspots.length).toBeGreaterThan(0);
      expect(analysis.hotspots.length).toBeLessThan(mockCodebaseAnalysis.artifacts.length);
      
      // Should not include test files
      const testFileHotspot = analysis.hotspots.find(h => h.artifactId === 'test-file');
      expect(testFileHotspot).toBeUndefined();
    });

    it('should sort hotspots by risk score in descending order', () => {
      const analysis = detector.analyzeHotspots(mockCodebaseAnalysis);

      for (let i = 1; i < analysis.hotspots.length; i++) {
        expect(analysis.hotspots[i - 1].riskScore).toBeGreaterThanOrEqual(
          analysis.hotspots[i].riskScore
        );
      }
    });

    it('should calculate risk scores within valid range', () => {
      const analysis = detector.analyzeHotspots(mockCodebaseAnalysis);

      for (const hotspot of analysis.hotspots) {
        expect(hotspot.riskScore).toBeGreaterThanOrEqual(0);
        expect(hotspot.riskScore).toBeLessThanOrEqual(1);
      }
    });

    it('should assign appropriate severity levels', () => {
      const analysis = detector.analyzeHotspots(mockCodebaseAnalysis);

      const severityLevels = ['low', 'medium', 'high', 'critical'];
      for (const hotspot of analysis.hotspots) {
        expect(severityLevels).toContain(hotspot.severity);
      }
    });

    it('should identify different hotspot types', () => {
      const analysis = detector.analyzeHotspots(mockCodebaseAnalysis);

      const hotspotTypes = analysis.hotspots.map(h => h.hotspotType);
      const uniqueTypes = new Set(hotspotTypes);
      
      // Should detect multiple types of hotspots
      expect(uniqueTypes.size).toBeGreaterThan(1);
      
      const validTypes = ['change_frequency', 'complexity', 'author_churn', 'combined'];
      for (const type of uniqueTypes) {
        expect(validTypes).toContain(type);
      }
    });

    it('should generate appropriate recommendations', () => {
      const analysis = detector.analyzeHotspots(mockCodebaseAnalysis);

      for (const hotspot of analysis.hotspots) {
        expect(hotspot.recommendations).toBeDefined();
        expect(hotspot.recommendations.length).toBeGreaterThan(0);
        
        // Each recommendation should be a non-empty string
        for (const recommendation of hotspot.recommendations) {
          expect(typeof recommendation).toBe('string');
          expect(recommendation.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('hotspot type detection', () => {
    it('should detect change frequency hotspots', () => {
      const analysis = detector.analyzeHotspots(mockCodebaseAnalysis);
      
      const changeFreqHotspot = analysis.hotspots.find(h => h.artifactId === 'high-change-freq');
      expect(changeFreqHotspot).toBeDefined();
      expect(changeFreqHotspot!.hotspotType).toBe('change_frequency');
    });

    it('should detect complexity hotspots', () => {
      const analysis = detector.analyzeHotspots(mockCodebaseAnalysis);
      
      const complexityHotspot = analysis.hotspots.find(h => h.artifactId === 'high-complexity');
      expect(complexityHotspot).toBeDefined();
      expect(complexityHotspot!.hotspotType).toBe('complexity');
    });

    it('should detect author churn hotspots', () => {
      const analysis = detector.analyzeHotspots(mockCodebaseAnalysis);
      
      const authorChurnHotspot = analysis.hotspots.find(h => h.artifactId === 'high-author-churn');
      expect(authorChurnHotspot).toBeDefined();
      expect(authorChurnHotspot!.hotspotType).toBe('author_churn');
    });
  });

  describe('summary generation', () => {
    it('should generate accurate summary statistics', () => {
      const analysis = detector.analyzeHotspots(mockCodebaseAnalysis);

      expect(analysis.summary.totalHotspots).toBe(analysis.hotspots.length);
      expect(analysis.summary.averageRiskScore).toBeGreaterThan(0);
      expect(analysis.summary.averageRiskScore).toBeLessThanOrEqual(1);
      
      const criticalCount = analysis.hotspots.filter(h => h.severity === 'critical').length;
      expect(analysis.summary.criticalHotspots).toBe(criticalCount);
      
      expect(Array.isArray(analysis.summary.highRiskFiles)).toBe(true);
      expect(Array.isArray(analysis.summary.topRiskFactors)).toBe(true);
    });
  });

  describe('trend analysis', () => {
    it('should generate trend data', () => {
      const analysis = detector.analyzeHotspots(mockCodebaseAnalysis);

      expect(analysis.trends.complexityTrend).toBeDefined();
      expect(analysis.trends.changeFrequencyTrend).toBeDefined();
      expect(analysis.trends.authorChurnTrend).toBeDefined();
      
      // Each trend should have 12 months of data
      expect(analysis.trends.complexityTrend.length).toBe(12);
      expect(analysis.trends.changeFrequencyTrend.length).toBe(12);
      expect(analysis.trends.authorChurnTrend.length).toBe(12);
      
      // All trend values should be positive numbers
      for (const value of analysis.trends.complexityTrend) {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThan(0);
      }
    });
  });

  describe('utility methods', () => {
    let analysis: HotspotAnalysis;

    beforeEach(() => {
      analysis = detector.analyzeHotspots(mockCodebaseAnalysis);
    });

    it('should filter hotspots by severity', () => {
      const criticalHotspots = detector.getHotspotsBySeverity(analysis.hotspots, 'critical');
      const highHotspots = detector.getHotspotsBySeverity(analysis.hotspots, 'high');
      
      for (const hotspot of criticalHotspots) {
        expect(hotspot.severity).toBe('critical');
      }
      
      for (const hotspot of highHotspots) {
        expect(hotspot.severity).toBe('high');
      }
    });

    it('should filter hotspots by type', () => {
      const complexityHotspots = detector.getHotspotsByType(analysis.hotspots, 'complexity');
      const changeFreqHotspots = detector.getHotspotsByType(analysis.hotspots, 'change_frequency');
      
      for (const hotspot of complexityHotspots) {
        expect(hotspot.hotspotType).toBe('complexity');
      }
      
      for (const hotspot of changeFreqHotspots) {
        expect(hotspot.hotspotType).toBe('change_frequency');
      }
    });

    it('should return top N hotspots', () => {
      const top3 = detector.getTopHotspots(analysis.hotspots, 3);
      
      expect(top3.length).toBeLessThanOrEqual(3);
      expect(top3.length).toBeLessThanOrEqual(analysis.hotspots.length);
      
      // Should be sorted by risk score descending
      for (let i = 1; i < top3.length; i++) {
        expect(top3[i - 1].riskScore).toBeGreaterThanOrEqual(top3[i].riskScore);
      }
    });
  });

  describe('configuration', () => {
    it('should use custom configuration', () => {
      const customDetector = new HotspotDetector({
        changeFrequencyThreshold: 5,
        complexityThreshold: 10,
        riskScoreWeights: {
          changeFrequency: 0.5,
          complexity: 0.3,
          authorCount: 0.1,
          recency: 0.1
        }
      });

      const analysis = customDetector.analyzeHotspots(mockCodebaseAnalysis);
      expect(analysis.hotspots).toBeDefined();
      
      // With different weights, risk scores should be different
      const defaultAnalysis = detector.analyzeHotspots(mockCodebaseAnalysis);
      
      // At least some hotspots should have different risk scores
      let foundDifference = false;
      for (let i = 0; i < Math.min(analysis.hotspots.length, defaultAnalysis.hotspots.length); i++) {
        if (Math.abs(analysis.hotspots[i].riskScore - defaultAnalysis.hotspots[i].riskScore) > 0.01) {
          foundDifference = true;
          break;
        }
      }
      
      expect(foundDifference).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty artifact list', () => {
      const emptyAnalysis: CodebaseAnalysis = {
        ...mockCodebaseAnalysis,
        artifacts: []
      };

      const analysis = detector.analyzeHotspots(emptyAnalysis);
      
      expect(analysis.hotspots).toEqual([]);
      expect(analysis.summary.totalHotspots).toBe(0);
      expect(analysis.summary.averageRiskScore).toBe(0);
    });

    it('should handle artifacts with zero values', () => {
      const zeroValueArtifact: CodeArtifact = {
        id: 'zero-values',
        filePath: 'src/empty.ts',
        type: 'file',
        name: 'empty',
        position3D: { x: 0, y: 0, z: 0 },
        complexity: 0,
        changeFrequency: 0,
        lastModified: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        authors: [],
        dependencies: [],
        startLine: 1,
        endLine: 1,
        size: 0,
        metadata: {}
      };

      const analysisWithZeros: CodebaseAnalysis = {
        ...mockCodebaseAnalysis,
        artifacts: [zeroValueArtifact]
      };

      const analysis = detector.analyzeHotspots(analysisWithZeros);
      
      // Should handle zero values gracefully
      expect(analysis.hotspots.length).toBeGreaterThanOrEqual(0);
      
      if (analysis.hotspots.length > 0) {
        const zeroHotspot = analysis.hotspots.find(h => h.artifactId === 'zero-values');
        if (zeroHotspot) {
          expect(zeroHotspot.riskScore).toBeGreaterThanOrEqual(0);
          expect(zeroHotspot.riskScore).toBeLessThanOrEqual(1);
        }
      }
    });
  });
});