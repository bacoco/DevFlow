import { ArchitecturalPatternService } from '../ArchitecturalPatternService';
import { CodeArtifact } from '../types';
import { Vector3 } from 'three';

describe('ArchitecturalPatternService', () => {
  let service: ArchitecturalPatternService;
  let mockArtifacts: CodeArtifact[];

  beforeEach(() => {
    service = new ArchitecturalPatternService();
    mockArtifacts = [
      {
        id: 'singleton-service',
        filePath: 'src/services/SingletonService.ts',
        type: 'class',
        name: 'SingletonService',
        position3D: new Vector3(10, 0, 0),
        complexity: 5,
        changeFrequency: 2,
        lastModified: new Date('2024-01-15T10:30:00Z'),
        authors: ['john.doe'],
        dependencies: ['logger'],
      },
      {
        id: 'user-factory',
        filePath: 'src/factories/UserFactory.ts',
        type: 'class',
        name: 'UserFactory',
        position3D: new Vector3(0, 10, 0),
        complexity: 3,
        changeFrequency: 1,
        lastModified: new Date('2024-01-20T14:15:00Z'),
        authors: ['jane.smith'],
        dependencies: ['user-model'],
      },
      {
        id: 'event-listener',
        filePath: 'src/events/EventListener.ts',
        type: 'class',
        name: 'EventListener',
        position3D: new Vector3(0, 0, 10),
        complexity: 4,
        changeFrequency: 3,
        lastModified: new Date('2024-01-25T09:45:00Z'),
        authors: ['bob.wilson'],
        dependencies: ['event-emitter'],
      },
      {
        id: 'user-model',
        filePath: 'src/models/UserModel.ts',
        type: 'class',
        name: 'UserModel',
        position3D: new Vector3(-10, 0, 0),
        complexity: 2,
        changeFrequency: 1,
        lastModified: new Date('2024-01-10T16:20:00Z'),
        authors: ['alice.brown'],
        dependencies: [],
      },
      {
        id: 'user-view',
        filePath: 'src/views/UserView.tsx',
        type: 'class',
        name: 'UserView',
        position3D: new Vector3(0, -10, 0),
        complexity: 6,
        changeFrequency: 4,
        lastModified: new Date('2024-01-30T11:10:00Z'),
        authors: ['charlie.davis'],
        dependencies: ['user-model', 'user-controller'],
      },
      {
        id: 'user-controller',
        filePath: 'src/controllers/UserController.ts',
        type: 'class',
        name: 'UserController',
        position3D: new Vector3(0, 0, -10),
        complexity: 8,
        changeFrequency: 5,
        lastModified: new Date('2024-02-01T13:30:00Z'),
        authors: ['eve.miller'],
        dependencies: ['user-model', 'user-service'],
      },
      {
        id: 'god-class',
        filePath: 'src/utils/GodClass.ts',
        type: 'class',
        name: 'GodClass',
        position3D: new Vector3(20, 20, 20),
        complexity: 25,
        changeFrequency: 10,
        lastModified: new Date('2024-02-05T08:15:00Z'),
        authors: ['frank.jones'],
        dependencies: ['everything'],
      },
      {
        id: 'dead-code',
        filePath: 'src/legacy/DeadCode.ts',
        type: 'class',
        name: 'DeadCode',
        position3D: new Vector3(-20, -20, -20),
        complexity: 1,
        changeFrequency: 0,
        lastModified: new Date('2023-10-01T12:00:00Z'),
        authors: ['old.developer'],
        dependencies: [],
      },
    ];
  });

  describe('Pattern Detection', () => {
    describe('Design Patterns', () => {
      it('detects singleton pattern', async () => {
        const patterns = await service.analyzePatterns(mockArtifacts);
        
        const singletonPattern = patterns.find(p => 
          p.name === 'Singleton Pattern' && p.artifacts.includes('singleton-service')
        );
        
        expect(singletonPattern).toBeDefined();
        expect(singletonPattern?.type).toBe('design_pattern');
        expect(singletonPattern?.confidence).toBe(0.7);
      });

      it('detects factory pattern', async () => {
        const patterns = await service.analyzePatterns(mockArtifacts);
        
        const factoryPattern = patterns.find(p => 
          p.name === 'Factory Pattern' && p.artifacts.includes('user-factory')
        );
        
        expect(factoryPattern).toBeDefined();
        expect(factoryPattern?.type).toBe('design_pattern');
        expect(factoryPattern?.confidence).toBe(0.8);
      });

      it('detects observer pattern', async () => {
        // Add more event-related artifacts to trigger observer pattern detection
        const eventArtifacts = [
          ...mockArtifacts,
          {
            id: 'event-emitter',
            filePath: 'src/events/EventEmitter.ts',
            type: 'class' as const,
            name: 'EventEmitter',
            position3D: new Vector3(5, 5, 5),
            complexity: 3,
            changeFrequency: 2,
            lastModified: new Date(),
            authors: ['dev'],
            dependencies: [],
          },
        ];

        const patterns = await service.analyzePatterns(eventArtifacts);
        
        const observerPattern = patterns.find(p => p.name === 'Observer Pattern');
        
        expect(observerPattern).toBeDefined();
        expect(observerPattern?.type).toBe('design_pattern');
        expect(observerPattern?.artifacts).toContain('event-listener');
      });
    });

    describe('Architectural Patterns', () => {
      it('detects MVC pattern', async () => {
        const patterns = await service.analyzePatterns(mockArtifacts);
        
        const mvcPattern = patterns.find(p => p.name === 'Model-View-Controller (MVC)');
        
        expect(mvcPattern).toBeDefined();
        expect(mvcPattern?.type).toBe('architectural_pattern');
        expect(mvcPattern?.artifacts).toContain('user-model');
        expect(mvcPattern?.artifacts).toContain('user-view');
        expect(mvcPattern?.artifacts).toContain('user-controller');
        expect(mvcPattern?.confidence).toBe(0.8);
      });

      it('detects layered architecture when sufficient layers exist', async () => {
        const layeredArtifacts = [
          ...mockArtifacts,
          {
            id: 'data-repository',
            filePath: 'src/data/UserRepository.ts',
            type: 'class',
            name: 'UserRepository',
            position3D: new Vector3(5, 5, 5),
            complexity: 3,
            changeFrequency: 2,
            lastModified: new Date(),
            authors: ['dev'],
            dependencies: [],
          },
          {
            id: 'business-service',
            filePath: 'src/services/BusinessService.ts',
            type: 'class',
            name: 'BusinessService',
            position3D: new Vector3(-5, -5, -5),
            complexity: 4,
            changeFrequency: 3,
            lastModified: new Date(),
            authors: ['dev'],
            dependencies: [],
          },
        ];

        const patterns = await service.analyzePatterns(layeredArtifacts);
        
        const layeredPattern = patterns.find(p => p.name === 'Layered Architecture');
        
        expect(layeredPattern).toBeDefined();
        expect(layeredPattern?.type).toBe('architectural_pattern');
        expect(layeredPattern?.confidence).toBe(0.9);
      });
    });

    describe('Anti-Patterns', () => {
      it('detects god class anti-pattern', async () => {
        const patterns = await service.analyzePatterns(mockArtifacts);
        
        const godClassPattern = patterns.find(p => 
          p.name === 'God Class Anti-Pattern' && p.artifacts.includes('god-class')
        );
        
        expect(godClassPattern).toBeDefined();
        expect(godClassPattern?.type).toBe('anti_pattern');
        expect(godClassPattern?.confidence).toBeGreaterThan(0.8);
      });

      it('detects dead code anti-pattern', async () => {
        const patterns = await service.analyzePatterns(mockArtifacts);
        
        const deadCodePattern = patterns.find(p => 
          p.name === 'Dead Code Anti-Pattern' && p.artifacts.includes('dead-code')
        );
        
        expect(deadCodePattern).toBeDefined();
        expect(deadCodePattern?.type).toBe('anti_pattern');
        expect(deadCodePattern?.confidence).toBe(0.6);
      });

      it('detects circular dependency anti-pattern', async () => {
        const circularArtifacts = [
          {
            id: 'a',
            filePath: 'src/A.ts',
            type: 'class' as const,
            name: 'A',
            position3D: new Vector3(0, 0, 0),
            complexity: 1,
            changeFrequency: 1,
            lastModified: new Date(),
            authors: ['dev'],
            dependencies: ['b'],
          },
          {
            id: 'b',
            filePath: 'src/B.ts',
            type: 'class' as const,
            name: 'B',
            position3D: new Vector3(1, 1, 1),
            complexity: 1,
            changeFrequency: 1,
            lastModified: new Date(),
            authors: ['dev'],
            dependencies: ['c'],
          },
          {
            id: 'c',
            filePath: 'src/C.ts',
            type: 'class' as const,
            name: 'C',
            position3D: new Vector3(2, 2, 2),
            complexity: 1,
            changeFrequency: 1,
            lastModified: new Date(),
            authors: ['dev'],
            dependencies: ['a'],
          },
        ];

        const patterns = await service.analyzePatterns(circularArtifacts);
        
        const circularPattern = patterns.find(p => 
          p.name === 'Circular Dependency Anti-Pattern'
        );
        
        expect(circularPattern).toBeDefined();
        expect(circularPattern?.type).toBe('anti_pattern');
        expect(circularPattern?.confidence).toBe(0.9);
        expect(circularPattern?.artifacts).toContain('a');
        expect(circularPattern?.artifacts).toContain('b');
        expect(circularPattern?.artifacts).toContain('c');
      });
    });
  });

  describe('Dependency Shift Analysis', () => {
    it('detects added dependencies', async () => {
      const previousArtifacts = [
        {
          ...mockArtifacts[0],
          dependencies: ['logger'],
        },
      ];

      const currentArtifacts = [
        {
          ...mockArtifacts[0],
          dependencies: ['logger', 'config'],
        },
      ];

      const shifts = await service.analyzeDependencyShifts(
        currentArtifacts,
        [previousArtifacts, currentArtifacts]
      );

      const addedShift = shifts.find(s => 
        s.shiftType === 'added' && s.toArtifact === 'config'
      );

      expect(addedShift).toBeDefined();
      expect(addedShift?.impact).toBe('medium');
      expect(addedShift?.reason).toBe('New dependency introduced');
    });

    it('detects removed dependencies', async () => {
      const previousArtifacts = [
        {
          ...mockArtifacts[0],
          dependencies: ['logger', 'config'],
        },
      ];

      const currentArtifacts = [
        {
          ...mockArtifacts[0],
          dependencies: ['logger'],
        },
      ];

      const shifts = await service.analyzeDependencyShifts(
        currentArtifacts,
        [previousArtifacts, currentArtifacts]
      );

      const removedShift = shifts.find(s => 
        s.shiftType === 'removed' && s.toArtifact === 'config'
      );

      expect(removedShift).toBeDefined();
      expect(removedShift?.impact).toBe('medium');
      expect(removedShift?.reason).toBe('Dependency removed');
    });
  });

  describe('Structural Evolution Analysis', () => {
    it('detects module additions', async () => {
      const previousSnapshot = {
        timestamp: new Date('2024-01-01'),
        artifacts: mockArtifacts.slice(0, 3),
      };

      const currentSnapshot = {
        timestamp: new Date('2024-01-02'),
        artifacts: mockArtifacts,
      };

      const evolution = await service.analyzeStructuralEvolution([
        previousSnapshot,
        currentSnapshot,
      ]);

      const moduleAddition = evolution.find(e => e.changeType === 'module_added');

      expect(moduleAddition).toBeDefined();
      expect(moduleAddition?.affectedArtifacts).toHaveLength(5);
      expect(moduleAddition?.description).toContain('5 new modules added');
    });

    it('detects module removals', async () => {
      const previousSnapshot = {
        timestamp: new Date('2024-01-01'),
        artifacts: mockArtifacts,
      };

      const currentSnapshot = {
        timestamp: new Date('2024-01-02'),
        artifacts: mockArtifacts.slice(0, 3),
      };

      const evolution = await service.analyzeStructuralEvolution([
        previousSnapshot,
        currentSnapshot,
      ]);

      const moduleRemoval = evolution.find(e => e.changeType === 'module_removed');

      expect(moduleRemoval).toBeDefined();
      expect(moduleRemoval?.affectedArtifacts).toHaveLength(5);
      expect(moduleRemoval?.description).toContain('5 modules removed');
    });
  });

  describe('Pattern Trends', () => {
    it('calculates pattern trends correctly', async () => {
      // First analyze patterns to populate the service
      await service.analyzePatterns(mockArtifacts);

      const trends = service.getPatternTrends();

      expect(trends).toBeInstanceOf(Array);
      expect(trends.length).toBeGreaterThan(0);

      trends.forEach(trend => {
        expect(trend).toHaveProperty('patternId');
        expect(trend).toHaveProperty('patternName');
        expect(trend).toHaveProperty('trend');
        expect(trend).toHaveProperty('impactScore');
        expect(trend).toHaveProperty('recommendation');
        expect(['emerging', 'stable', 'declining', 'disappeared']).toContain(trend.trend);
      });
    });

    it('sorts trends by impact score', async () => {
      await service.analyzePatterns(mockArtifacts);

      const trends = service.getPatternTrends();

      for (let i = 1; i < trends.length; i++) {
        expect(trends[i - 1].impactScore).toBeGreaterThanOrEqual(trends[i].impactScore);
      }
    });
  });

  describe('3D Visualization Data', () => {
    it('generates pattern nodes and connections', async () => {
      await service.analyzePatterns(mockArtifacts);

      const { patternNodes, patternConnections } = service.getPatternVisualizationData(mockArtifacts);

      expect(patternNodes).toBeInstanceOf(Array);
      expect(patternConnections).toBeInstanceOf(Array);

      patternNodes.forEach(node => {
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('name');
        expect(node).toHaveProperty('type');
        expect(node).toHaveProperty('position');
        expect(node).toHaveProperty('confidence');
        expect(node).toHaveProperty('size');
        expect(node).toHaveProperty('color');
        expect(node.position).toHaveProperty('x');
        expect(node.position).toHaveProperty('y');
        expect(node.position).toHaveProperty('z');
      });

      patternConnections.forEach(connection => {
        expect(connection).toHaveProperty('id');
        expect(connection).toHaveProperty('fromId');
        expect(connection).toHaveProperty('toId');
        expect(connection).toHaveProperty('strength');
        expect(connection).toHaveProperty('type');
      });
    });

    it('calculates pattern center positions correctly', async () => {
      await service.analyzePatterns(mockArtifacts);

      const { patternNodes } = service.getPatternVisualizationData(mockArtifacts);

      patternNodes.forEach(node => {
        expect(typeof node.position.x).toBe('number');
        expect(typeof node.position.y).toBe('number');
        expect(typeof node.position.z).toBe('number');
        expect(isFinite(node.position.x)).toBe(true);
        expect(isFinite(node.position.y)).toBe(true);
        expect(isFinite(node.position.z)).toBe(true);
      });
    });

    it('assigns appropriate colors to pattern types', async () => {
      await service.analyzePatterns(mockArtifacts);

      const { patternNodes } = service.getPatternVisualizationData(mockArtifacts);

      const designPatternNode = patternNodes.find(n => n.type === 'design_pattern');
      const architecturalPatternNode = patternNodes.find(n => n.type === 'architectural_pattern');
      const antiPatternNode = patternNodes.find(n => n.type === 'anti_pattern');

      if (designPatternNode) {
        expect(designPatternNode.color).toBe('#4CAF50');
      }
      if (architecturalPatternNode) {
        expect(architecturalPatternNode.color).toBe('#2196F3');
      }
      if (antiPatternNode) {
        expect(antiPatternNode.color).toBe('#F44336');
      }
    });
  });

  describe('Error Handling', () => {
    it('handles empty artifact arrays gracefully', async () => {
      const patterns = await service.analyzePatterns([]);

      expect(patterns).toBeInstanceOf(Array);
      expect(patterns).toHaveLength(0);
    });

    it('handles artifacts with missing dependencies', async () => {
      const artifactsWithMissingDeps = mockArtifacts.map(artifact => ({
        ...artifact,
        dependencies: undefined as any,
      }));

      expect(async () => {
        await service.analyzePatterns(artifactsWithMissingDeps);
      }).not.toThrow();
    });

    it('handles invalid artifact data gracefully', async () => {
      const invalidArtifacts = [
        {
          id: '',
          filePath: '',
          type: 'unknown' as any,
          name: '',
          position3D: new Vector3(NaN, NaN, NaN),
          complexity: -1,
          changeFrequency: -1,
          lastModified: new Date('invalid'),
          authors: [],
          dependencies: [],
        },
      ];

      expect(async () => {
        await service.analyzePatterns(invalidArtifacts);
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('handles large numbers of artifacts efficiently', async () => {
      const largeArtifactSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `artifact-${i}`,
        filePath: `src/components/Component${i}.ts`,
        type: 'class' as const,
        name: `Component${i}`,
        position3D: new Vector3(i % 100, Math.floor(i / 100), 0),
        complexity: Math.floor(Math.random() * 10) + 1,
        changeFrequency: Math.floor(Math.random() * 5),
        lastModified: new Date(),
        authors: ['dev'],
        dependencies: [],
      }));

      const startTime = Date.now();
      const patterns = await service.analyzePatterns(largeArtifactSet);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(patterns).toBeInstanceOf(Array);
    });
  });
});