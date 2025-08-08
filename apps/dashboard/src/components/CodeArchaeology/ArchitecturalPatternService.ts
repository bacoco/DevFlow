import { CodeArtifact } from './types';

export interface ArchitecturalPattern {
  id: string;
  name: string;
  type: 'design_pattern' | 'architectural_pattern' | 'anti_pattern';
  description: string;
  confidence: number;
  artifacts: string[];
  detectedAt: Date;
  evolution: PatternEvolution[];
}

export interface PatternEvolution {
  timestamp: Date;
  changeType: 'introduced' | 'strengthened' | 'weakened' | 'removed';
  confidence: number;
  affectedArtifacts: string[];
  description: string;
}

export interface DependencyShift {
  id: string;
  fromArtifact: string;
  toArtifact: string;
  shiftType: 'added' | 'removed' | 'strengthened' | 'weakened';
  timestamp: Date;
  impact: 'low' | 'medium' | 'high';
  reason: string;
}

export interface StructuralEvolution {
  timestamp: Date;
  changeType: 'module_added' | 'module_removed' | 'layer_introduced' | 'coupling_increased' | 'coupling_decreased';
  description: string;
  affectedArtifacts: string[];
  impact: number; // 0-1 scale
}

export interface PatternTrend {
  patternId: string;
  patternName: string;
  trend: 'emerging' | 'stable' | 'declining' | 'disappeared';
  confidenceOverTime: { timestamp: Date; confidence: number }[];
  impactScore: number;
  recommendation: string;
}

export class ArchitecturalPatternService {
  private patterns: Map<string, ArchitecturalPattern> = new Map();
  private dependencyShifts: DependencyShift[] = [];
  private structuralEvolution: StructuralEvolution[] = [];

  /**
   * Analyze code artifacts to detect architectural patterns
   */
  async analyzePatterns(artifacts: CodeArtifact[]): Promise<ArchitecturalPattern[]> {
    const detectedPatterns: ArchitecturalPattern[] = [];

    // Detect common design patterns
    detectedPatterns.push(...this.detectDesignPatterns(artifacts));
    
    // Detect architectural patterns
    detectedPatterns.push(...this.detectArchitecturalPatterns(artifacts));
    
    // Detect anti-patterns
    detectedPatterns.push(...this.detectAntiPatterns(artifacts));

    // Store patterns for trend analysis
    detectedPatterns.forEach(pattern => {
      this.patterns.set(pattern.id, pattern);
    });

    return detectedPatterns;
  }

  /**
   * Analyze dependency shifts over time
   */
  async analyzeDependencyShifts(
    currentArtifacts: CodeArtifact[],
    historicalArtifacts: CodeArtifact[][]
  ): Promise<DependencyShift[]> {
    const shifts: DependencyShift[] = [];

    // Compare current dependencies with historical data
    for (let i = 1; i < historicalArtifacts.length; i++) {
      const previous = historicalArtifacts[i - 1];
      const current = historicalArtifacts[i];
      
      shifts.push(...this.compareDependencies(previous, current, new Date()));
    }

    this.dependencyShifts = shifts;
    return shifts;
  }

  /**
   * Track structural evolution patterns
   */
  async analyzeStructuralEvolution(
    artifactHistory: { timestamp: Date; artifacts: CodeArtifact[] }[]
  ): Promise<StructuralEvolution[]> {
    const evolution: StructuralEvolution[] = [];

    for (let i = 1; i < artifactHistory.length; i++) {
      const previous = artifactHistory[i - 1];
      const current = artifactHistory[i];
      
      evolution.push(...this.detectStructuralChanges(previous, current));
    }

    this.structuralEvolution = evolution;
    return evolution;
  }

  /**
   * Generate pattern trends for visualization
   */
  getPatternTrends(): PatternTrend[] {
    const trends: PatternTrend[] = [];

    this.patterns.forEach(pattern => {
      const trend = this.calculatePatternTrend(pattern);
      trends.push(trend);
    });

    return trends.sort((a, b) => b.impactScore - a.impactScore);
  }

  /**
   * Get 3D visualization data for patterns
   */
  getPatternVisualizationData(artifacts: CodeArtifact[]): {
    patternNodes: PatternNode3D[];
    patternConnections: PatternConnection3D[];
  } {
    const patternNodes: PatternNode3D[] = [];
    const patternConnections: PatternConnection3D[] = [];

    this.patterns.forEach(pattern => {
      // Create pattern node
      const centerPosition = this.calculatePatternCenter(pattern.artifacts, artifacts);
      patternNodes.push({
        id: pattern.id,
        name: pattern.name,
        type: pattern.type,
        position: centerPosition,
        confidence: pattern.confidence,
        size: Math.max(5, pattern.artifacts.length * 2),
        color: this.getPatternColor(pattern.type),
      });

      // Create connections to involved artifacts
      pattern.artifacts.forEach(artifactId => {
        const artifact = artifacts.find(a => a.id === artifactId);
        if (artifact) {
          patternConnections.push({
            id: `${pattern.id}-${artifactId}`,
            fromId: pattern.id,
            toId: artifactId,
            strength: pattern.confidence,
            type: 'pattern_involvement',
          });
        }
      });
    });

    return { patternNodes, patternConnections };
  }

  private detectDesignPatterns(artifacts: CodeArtifact[]): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];

    // Singleton pattern detection
    patterns.push(...this.detectSingletonPattern(artifacts));
    
    // Factory pattern detection
    patterns.push(...this.detectFactoryPattern(artifacts));
    
    // Observer pattern detection
    patterns.push(...this.detectObserverPattern(artifacts));
    
    // Strategy pattern detection
    patterns.push(...this.detectStrategyPattern(artifacts));

    return patterns;
  }

  private detectArchitecturalPatterns(artifacts: CodeArtifact[]): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];

    // MVC pattern detection
    patterns.push(...this.detectMVCPattern(artifacts));
    
    // Layered architecture detection
    patterns.push(...this.detectLayeredArchitecture(artifacts));
    
    // Microservices pattern detection
    patterns.push(...this.detectMicroservicesPattern(artifacts));

    return patterns;
  }

  private detectAntiPatterns(artifacts: CodeArtifact[]): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];

    // God class anti-pattern
    patterns.push(...this.detectGodClassAntiPattern(artifacts));
    
    // Circular dependency anti-pattern
    patterns.push(...this.detectCircularDependencyAntiPattern(artifacts));
    
    // Dead code anti-pattern
    patterns.push(...this.detectDeadCodeAntiPattern(artifacts));

    return patterns;
  }

  private detectSingletonPattern(artifacts: CodeArtifact[]): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];

    artifacts.forEach(artifact => {
      if (artifact.type === 'class') {
        // Simple heuristic: look for classes with "Singleton" in name or single instance patterns
        const isSingleton = artifact.name.toLowerCase().includes('singleton') ||
                           artifact.name.toLowerCase().includes('instance') ||
                           artifact.name.toLowerCase().includes('manager');

        if (isSingleton) {
          patterns.push({
            id: `singleton-${artifact.id}`,
            name: 'Singleton Pattern',
            type: 'design_pattern',
            description: `Singleton pattern detected in ${artifact.name}`,
            confidence: 0.7,
            artifacts: [artifact.id],
            detectedAt: new Date(),
            evolution: [],
          });
        }
      }
    });

    return patterns;
  }

  private detectFactoryPattern(artifacts: CodeArtifact[]): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];

    artifacts.forEach(artifact => {
      if (artifact.type === 'class' || artifact.type === 'function') {
        const isFactory = artifact.name.toLowerCase().includes('factory') ||
                         artifact.name.toLowerCase().includes('builder') ||
                         artifact.name.toLowerCase().includes('creator');

        if (isFactory) {
          patterns.push({
            id: `factory-${artifact.id}`,
            name: 'Factory Pattern',
            type: 'design_pattern',
            description: `Factory pattern detected in ${artifact.name}`,
            confidence: 0.8,
            artifacts: [artifact.id],
            detectedAt: new Date(),
            evolution: [],
          });
        }
      }
    });

    return patterns;
  }

  private detectObserverPattern(artifacts: CodeArtifact[]): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];

    // Look for event-related artifacts that might indicate observer pattern
    const eventArtifacts = artifacts.filter(artifact => 
      artifact.name.toLowerCase().includes('event') ||
      artifact.name.toLowerCase().includes('listener') ||
      artifact.name.toLowerCase().includes('observer') ||
      artifact.name.toLowerCase().includes('subscriber')
    );

    if (eventArtifacts.length >= 2) {
      patterns.push({
        id: 'observer-pattern',
        name: 'Observer Pattern',
        type: 'design_pattern',
        description: 'Observer pattern detected through event-related components',
        confidence: 0.6,
        artifacts: eventArtifacts.map(a => a.id),
        detectedAt: new Date(),
        evolution: [],
      });
    }

    return patterns;
  }

  private detectStrategyPattern(artifacts: CodeArtifact[]): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];

    // Look for strategy-related naming patterns
    const strategyArtifacts = artifacts.filter(artifact =>
      artifact.name.toLowerCase().includes('strategy') ||
      artifact.name.toLowerCase().includes('algorithm') ||
      artifact.name.toLowerCase().includes('policy')
    );

    if (strategyArtifacts.length >= 2) {
      patterns.push({
        id: 'strategy-pattern',
        name: 'Strategy Pattern',
        type: 'design_pattern',
        description: 'Strategy pattern detected through naming conventions',
        confidence: 0.7,
        artifacts: strategyArtifacts.map(a => a.id),
        detectedAt: new Date(),
        evolution: [],
      });
    }

    return patterns;
  }

  private detectMVCPattern(artifacts: CodeArtifact[]): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];

    const models = artifacts.filter(a => 
      a.filePath.includes('/models/') || a.name.toLowerCase().includes('model')
    );
    const views = artifacts.filter(a => 
      a.filePath.includes('/views/') || a.filePath.includes('/components/') || 
      a.name.toLowerCase().includes('view') || a.name.toLowerCase().includes('component')
    );
    const controllers = artifacts.filter(a => 
      a.filePath.includes('/controllers/') || a.name.toLowerCase().includes('controller')
    );

    if (models.length > 0 && views.length > 0 && controllers.length > 0) {
      patterns.push({
        id: 'mvc-pattern',
        name: 'Model-View-Controller (MVC)',
        type: 'architectural_pattern',
        description: 'MVC architectural pattern detected',
        confidence: 0.8,
        artifacts: [...models, ...views, ...controllers].map(a => a.id),
        detectedAt: new Date(),
        evolution: [],
      });
    }

    return patterns;
  }

  private detectLayeredArchitecture(artifacts: CodeArtifact[]): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];

    // Detect common layer patterns
    const layers = {
      presentation: artifacts.filter(a => 
        a.filePath.includes('/ui/') || a.filePath.includes('/components/') ||
        a.filePath.includes('/views/')
      ),
      business: artifacts.filter(a => 
        a.filePath.includes('/services/') || a.filePath.includes('/business/') ||
        a.filePath.includes('/logic/')
      ),
      data: artifacts.filter(a => 
        a.filePath.includes('/data/') || a.filePath.includes('/repositories/') ||
        a.filePath.includes('/models/')
      ),
    };

    const layerCount = Object.values(layers).filter(layer => layer.length > 0).length;

    if (layerCount >= 3) {
      patterns.push({
        id: 'layered-architecture',
        name: 'Layered Architecture',
        type: 'architectural_pattern',
        description: `${layerCount}-layer architecture detected`,
        confidence: 0.9,
        artifacts: Object.values(layers).flat().map(a => a.id),
        detectedAt: new Date(),
        evolution: [],
      });
    }

    return patterns;
  }

  private detectMicroservicesPattern(artifacts: CodeArtifact[]): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];

    // Look for service-oriented structure
    const services = artifacts.filter(a => 
      a.filePath.includes('/services/') && a.type === 'file'
    );

    if (services.length >= 3) {
      patterns.push({
        id: 'microservices-pattern',
        name: 'Microservices Architecture',
        type: 'architectural_pattern',
        description: 'Microservices pattern detected through service structure',
        confidence: 0.7,
        artifacts: services.map(a => a.id),
        detectedAt: new Date(),
        evolution: [],
      });
    }

    return patterns;
  }

  private detectGodClassAntiPattern(artifacts: CodeArtifact[]): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];

    artifacts.forEach(artifact => {
      if (artifact.type === 'class' && artifact.complexity > 15) {
        patterns.push({
          id: `god-class-${artifact.id}`,
          name: 'God Class Anti-Pattern',
          type: 'anti_pattern',
          description: `God class anti-pattern detected in ${artifact.name} (complexity: ${artifact.complexity})`,
          confidence: Math.min(0.9, artifact.complexity / 20),
          artifacts: [artifact.id],
          detectedAt: new Date(),
          evolution: [],
        });
      }
    });

    return patterns;
  }

  private detectCircularDependencyAntiPattern(artifacts: CodeArtifact[]): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];

    // Simple circular dependency detection
    const dependencyGraph = new Map<string, Set<string>>();
    
    artifacts.forEach(artifact => {
      dependencyGraph.set(artifact.id, new Set(artifact.dependencies));
    });

    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): string[] | null => {
      if (recursionStack.has(nodeId)) {
        return [nodeId];
      }
      if (visited.has(nodeId)) {
        return null;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const dependencies = dependencyGraph.get(nodeId) || new Set();
      for (const depId of dependencies) {
        const cycle = hasCycle(depId);
        if (cycle) {
          return [nodeId, ...cycle];
        }
      }

      recursionStack.delete(nodeId);
      return null;
    };

    for (const artifactId of dependencyGraph.keys()) {
      if (!visited.has(artifactId)) {
        const cycle = hasCycle(artifactId);
        if (cycle) {
          patterns.push({
            id: `circular-dependency-${cycle.join('-')}`,
            name: 'Circular Dependency Anti-Pattern',
            type: 'anti_pattern',
            description: `Circular dependency detected: ${cycle.join(' → ')}`,
            confidence: 0.9,
            artifacts: cycle,
            detectedAt: new Date(),
            evolution: [],
          });
        }
      }
    }

    return patterns;
  }

  private detectDeadCodeAntiPattern(artifacts: CodeArtifact[]): ArchitecturalPattern[] {
    const patterns: ArchitecturalPattern[] = [];

    // Simple dead code detection based on change frequency
    artifacts.forEach(artifact => {
      if (artifact.changeFrequency === 0 && 
          artifact.lastModified < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) {
        patterns.push({
          id: `dead-code-${artifact.id}`,
          name: 'Dead Code Anti-Pattern',
          type: 'anti_pattern',
          description: `Potential dead code detected in ${artifact.name}`,
          confidence: 0.6,
          artifacts: [artifact.id],
          detectedAt: new Date(),
          evolution: [],
        });
      }
    });

    return patterns;
  }

  private compareDependencies(
    previous: CodeArtifact[],
    current: CodeArtifact[],
    timestamp: Date
  ): DependencyShift[] {
    const shifts: DependencyShift[] = [];

    current.forEach(currentArtifact => {
      const previousArtifact = previous.find(p => p.id === currentArtifact.id);
      
      if (previousArtifact) {
        // Compare dependencies
        const prevDeps = new Set(previousArtifact.dependencies);
        const currDeps = new Set(currentArtifact.dependencies);

        // Added dependencies
        currDeps.forEach(dep => {
          if (!prevDeps.has(dep)) {
            shifts.push({
              id: `${currentArtifact.id}-${dep}-added`,
              fromArtifact: currentArtifact.id,
              toArtifact: dep,
              shiftType: 'added',
              timestamp,
              impact: 'medium',
              reason: 'New dependency introduced',
            });
          }
        });

        // Removed dependencies
        prevDeps.forEach(dep => {
          if (!currDeps.has(dep)) {
            shifts.push({
              id: `${currentArtifact.id}-${dep}-removed`,
              fromArtifact: currentArtifact.id,
              toArtifact: dep,
              shiftType: 'removed',
              timestamp,
              impact: 'medium',
              reason: 'Dependency removed',
            });
          }
        });
      }
    });

    return shifts;
  }

  private detectStructuralChanges(
    previous: { timestamp: Date; artifacts: CodeArtifact[] },
    current: { timestamp: Date; artifacts: CodeArtifact[] }
  ): StructuralEvolution[] {
    const evolution: StructuralEvolution[] = [];

    // Detect new modules/files
    const prevIds = new Set(previous.artifacts.map(a => a.id));
    const currIds = new Set(current.artifacts.map(a => a.id));

    const addedArtifacts = current.artifacts.filter(a => !prevIds.has(a.id));
    const removedArtifacts = previous.artifacts.filter(a => !currIds.has(a.id));

    if (addedArtifacts.length > 0) {
      evolution.push({
        timestamp: current.timestamp,
        changeType: 'module_added',
        description: `${addedArtifacts.length} new modules added`,
        affectedArtifacts: addedArtifacts.map(a => a.id),
        impact: addedArtifacts.length / current.artifacts.length,
      });
    }

    if (removedArtifacts.length > 0) {
      evolution.push({
        timestamp: current.timestamp,
        changeType: 'module_removed',
        description: `${removedArtifacts.length} modules removed`,
        affectedArtifacts: removedArtifacts.map(a => a.id),
        impact: removedArtifacts.length / previous.artifacts.length,
      });
    }

    return evolution;
  }

  private calculatePatternTrend(pattern: ArchitecturalPattern): PatternTrend {
    // Simple trend calculation based on pattern evolution
    let trend: 'emerging' | 'stable' | 'declining' | 'disappeared' = 'stable';
    
    if (pattern.evolution.length > 0) {
      const recentChanges = pattern.evolution.slice(-3);
      const strengthening = recentChanges.filter(e => e.changeType === 'strengthened').length;
      const weakening = recentChanges.filter(e => e.changeType === 'weakened').length;
      
      if (strengthening > weakening) {
        trend = 'emerging';
      } else if (weakening > strengthening) {
        trend = 'declining';
      }
    }

    return {
      patternId: pattern.id,
      patternName: pattern.name,
      trend,
      confidenceOverTime: pattern.evolution.map(e => ({
        timestamp: e.timestamp,
        confidence: e.confidence,
      })),
      impactScore: pattern.confidence * pattern.artifacts.length,
      recommendation: this.generatePatternRecommendation(pattern, trend),
    };
  }

  private generatePatternRecommendation(
    pattern: ArchitecturalPattern,
    trend: string
  ): string {
    if (pattern.type === 'anti_pattern') {
      return `Consider refactoring to eliminate this anti-pattern. Impact: ${trend}`;
    }
    
    if (trend === 'declining') {
      return `Monitor this pattern as it may be becoming less relevant to the architecture`;
    }
    
    if (trend === 'emerging') {
      return `This pattern is strengthening - consider leveraging it more broadly`;
    }
    
    return `This pattern is stable and well-established in the codebase`;
  }

  private calculatePatternCenter(
    artifactIds: string[],
    artifacts: CodeArtifact[]
  ): { x: number; y: number; z: number } {
    const involvedArtifacts = artifacts.filter(a => artifactIds.includes(a.id));
    
    if (involvedArtifacts.length === 0) {
      return { x: 0, y: 0, z: 0 };
    }

    const sum = involvedArtifacts.reduce(
      (acc, artifact) => ({
        x: acc.x + artifact.position3D.x,
        y: acc.y + artifact.position3D.y,
        z: acc.z + artifact.position3D.z,
      }),
      { x: 0, y: 0, z: 0 }
    );

    return {
      x: sum.x / involvedArtifacts.length,
      y: sum.y / involvedArtifacts.length,
      z: sum.z / involvedArtifacts.length,
    };
  }

  private getPatternColor(type: string): string {
    const colors = {
      design_pattern: '#4CAF50',
      architectural_pattern: '#2196F3',
      anti_pattern: '#F44336',
    };
    return colors[type as keyof typeof colors] || '#757575';
  }
}

export interface PatternNode3D {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number; z: number };
  confidence: number;
  size: number;
  color: string;
}

export interface PatternConnection3D {
  id: string;
  fromId: string;
  toId: string;
  strength: number;
  type: string;
}

export default ArchitecturalPatternService;