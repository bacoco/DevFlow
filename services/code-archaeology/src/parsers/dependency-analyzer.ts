import { FileAnalysis, DependencyGraph, DependencyRelation, CodeArtifact } from '../types';
import * as path from 'path';

export class DependencyAnalyzer {
  
  analyzeDependencies(fileAnalyses: FileAnalysis[]): DependencyGraph {
    const artifacts = this.collectAllArtifacts(fileAnalyses);
    const relations = this.buildDependencyRelations(fileAnalyses, artifacts);

    return {
      artifacts,
      relations
    };
  }

  private collectAllArtifacts(fileAnalyses: FileAnalysis[]): CodeArtifact[] {
    const artifacts: CodeArtifact[] = [];

    for (const analysis of fileAnalyses) {
      artifacts.push(...analysis.artifacts);
    }

    return artifacts;
  }

  private buildDependencyRelations(fileAnalyses: FileAnalysis[], artifacts: CodeArtifact[]): DependencyRelation[] {
    const relations: DependencyRelation[] = [];
    const artifactMap = new Map<string, CodeArtifact>();

    // Create lookup map
    artifacts.forEach(artifact => {
      artifactMap.set(artifact.id, artifact);
      // Also index by name for easier lookup
      artifactMap.set(`${artifact.filePath}:${artifact.name}`, artifact);
    });

    for (const analysis of fileAnalyses) {
      // Import dependencies
      relations.push(...this.analyzeImportDependencies(analysis, artifactMap));
      
      // Function call dependencies
      relations.push(...this.analyzeFunctionCallDependencies(analysis, artifactMap));
      
      // Class inheritance dependencies
      relations.push(...this.analyzeInheritanceDependencies(analysis, artifactMap));
      
      // Interface implementation dependencies
      relations.push(...this.analyzeInterfaceDependencies(analysis, artifactMap));
    }

    return relations;
  }

  private analyzeImportDependencies(analysis: FileAnalysis, artifactMap: Map<string, CodeArtifact>): DependencyRelation[] {
    const relations: DependencyRelation[] = [];
    const fileArtifact = analysis.artifacts.find(a => a.type === 'file');
    
    if (!fileArtifact) return relations;

    for (const importInfo of analysis.imports) {
      // Try to resolve the import to an actual file
      const resolvedPath = this.resolveImportPath(importInfo.source, analysis.filePath);
      
      if (resolvedPath) {
        const targetFileArtifact = artifactMap.get(`${resolvedPath}:${path.basename(resolvedPath)}`);
        
        if (targetFileArtifact) {
          relations.push({
            fromArtifactId: fileArtifact.id,
            toArtifactId: targetFileArtifact.id,
            type: 'imports',
            strength: this.calculateImportStrength(importInfo.imports.length)
          });

          // Create specific dependencies for named imports
          for (const importedName of importInfo.imports) {
            const targetArtifact = artifactMap.get(`${resolvedPath}:${importedName}`);
            if (targetArtifact) {
              relations.push({
                fromArtifactId: fileArtifact.id,
                toArtifactId: targetArtifact.id,
                type: 'imports',
                strength: 0.8
              });
            }
          }
        }
      }
    }

    return relations;
  }

  private analyzeFunctionCallDependencies(analysis: FileAnalysis, artifactMap: Map<string, CodeArtifact>): DependencyRelation[] {
    const relations: DependencyRelation[] = [];

    for (const func of analysis.functions) {
      const functionArtifact = analysis.artifacts.find(a => 
        a.type === 'function' && a.name === func.name
      );
      
      if (!functionArtifact) continue;

      for (const calledFunction of func.calls) {
        // Look for the called function in the same file first
        let targetArtifact = analysis.artifacts.find(a => 
          a.type === 'function' && a.name === calledFunction
        );

        // If not found in same file, look in other files (simplified)
        if (!targetArtifact) {
          targetArtifact = Array.from(artifactMap.values()).find(a => 
            a.type === 'function' && a.name === calledFunction
          );
        }

        if (targetArtifact && targetArtifact.id !== functionArtifact.id) {
          relations.push({
            fromArtifactId: functionArtifact.id,
            toArtifactId: targetArtifact.id,
            type: 'calls',
            strength: this.calculateCallStrength(func.calls.filter(c => c === calledFunction).length)
          });
        }
      }
    }

    return relations;
  }

  private analyzeInheritanceDependencies(analysis: FileAnalysis, artifactMap: Map<string, CodeArtifact>): DependencyRelation[] {
    const relations: DependencyRelation[] = [];

    for (const cls of analysis.classes) {
      const classArtifact = analysis.artifacts.find(a => 
        a.type === 'class' && a.name === cls.name
      );
      
      if (!classArtifact || !cls.extends) continue;

      // Look for the parent class
      let parentArtifact = analysis.artifacts.find(a => 
        a.type === 'class' && a.name === cls.extends
      );

      // If not found in same file, look in other files
      if (!parentArtifact) {
        parentArtifact = Array.from(artifactMap.values()).find(a => 
          a.type === 'class' && a.name === cls.extends
        );
      }

      if (parentArtifact) {
        relations.push({
          fromArtifactId: classArtifact.id,
          toArtifactId: parentArtifact.id,
          type: 'extends',
          strength: 1.0 // Inheritance is a strong dependency
        });
      }
    }

    return relations;
  }

  private analyzeInterfaceDependencies(analysis: FileAnalysis, artifactMap: Map<string, CodeArtifact>): DependencyRelation[] {
    const relations: DependencyRelation[] = [];

    // Interface extends interface
    for (const iface of analysis.interfaces) {
      const interfaceArtifact = analysis.artifacts.find(a => 
        a.type === 'interface' && a.name === iface.name
      );
      
      if (!interfaceArtifact) continue;

      for (const extendedInterface of iface.extends) {
        let targetArtifact = analysis.artifacts.find(a => 
          a.type === 'interface' && a.name === extendedInterface
        );

        if (!targetArtifact) {
          targetArtifact = Array.from(artifactMap.values()).find(a => 
            a.type === 'interface' && a.name === extendedInterface
          );
        }

        if (targetArtifact) {
          relations.push({
            fromArtifactId: interfaceArtifact.id,
            toArtifactId: targetArtifact.id,
            type: 'extends',
            strength: 0.9
          });
        }
      }
    }

    // Class implements interface
    for (const cls of analysis.classes) {
      const classArtifact = analysis.artifacts.find(a => 
        a.type === 'class' && a.name === cls.name
      );
      
      if (!classArtifact) continue;

      for (const implementedInterface of cls.implements) {
        let targetArtifact = analysis.artifacts.find(a => 
          a.type === 'interface' && a.name === implementedInterface
        );

        if (!targetArtifact) {
          targetArtifact = Array.from(artifactMap.values()).find(a => 
            a.type === 'interface' && a.name === implementedInterface
          );
        }

        if (targetArtifact) {
          relations.push({
            fromArtifactId: classArtifact.id,
            toArtifactId: targetArtifact.id,
            type: 'implements',
            strength: 0.8
          });
        }
      }
    }

    return relations;
  }

  private resolveImportPath(importSource: string, currentFilePath: string): string | null {
    // Simplified import resolution
    if (importSource.startsWith('.')) {
      // Relative import
      const currentDir = path.dirname(currentFilePath);
      let resolvedPath = path.resolve(currentDir, importSource);
      
      // Try different extensions
      const extensions = ['.ts', '.tsx', '.js', '.jsx'];
      for (const ext of extensions) {
        const pathWithExt = resolvedPath + ext;
        // In a real implementation, you'd check if the file exists
        // For now, we'll assume it exists if it's a relative import
        return pathWithExt;
      }
      
      // Try index files
      for (const ext of extensions) {
        const indexPath = path.join(resolvedPath, 'index' + ext);
        return indexPath;
      }
    } else if (!importSource.startsWith('@') && !importSource.includes('/')) {
      // Could be a local module, but we'll skip node_modules for now
      return null;
    }

    return null;
  }

  private calculateImportStrength(importCount: number): number {
    // More imports = stronger dependency
    return Math.min(1.0, 0.3 + (importCount * 0.1));
  }

  private calculateCallStrength(callCount: number): number {
    // More calls = stronger dependency
    return Math.min(1.0, 0.2 + (callCount * 0.1));
  }

  /**
   * Detect circular dependencies in the dependency graph
   */
  detectCircularDependencies(graph: DependencyGraph): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (artifactId: string, path: string[]): void => {
      if (recursionStack.has(artifactId)) {
        // Found a cycle
        const cycleStart = path.indexOf(artifactId);
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart));
        }
        return;
      }

      if (visited.has(artifactId)) {
        return;
      }

      visited.add(artifactId);
      recursionStack.add(artifactId);
      path.push(artifactId);

      // Find all dependencies of this artifact
      const dependencies = graph.relations
        .filter(rel => rel.fromArtifactId === artifactId)
        .map(rel => rel.toArtifactId);

      for (const depId of dependencies) {
        dfs(depId, [...path]);
      }

      recursionStack.delete(artifactId);
    };

    // Start DFS from each artifact
    for (const artifact of graph.artifacts) {
      if (!visited.has(artifact.id)) {
        dfs(artifact.id, []);
      }
    }

    return cycles;
  }

  /**
   * Calculate dependency metrics for the graph
   */
  calculateDependencyMetrics(graph: DependencyGraph): {
    totalDependencies: number;
    averageDependenciesPerArtifact: number;
    maxDependencies: number;
    circularDependencies: number;
    stronglyConnectedComponents: number;
  } {
    const dependencyCount = new Map<string, number>();
    
    // Count dependencies for each artifact
    for (const relation of graph.relations) {
      const count = dependencyCount.get(relation.fromArtifactId) || 0;
      dependencyCount.set(relation.fromArtifactId, count + 1);
    }

    const counts = Array.from(dependencyCount.values());
    const totalDependencies = graph.relations.length;
    const averageDependenciesPerArtifact = totalDependencies / graph.artifacts.length;
    const maxDependencies = Math.max(...counts, 0);
    
    const cycles = this.detectCircularDependencies(graph);
    const circularDependencies = cycles.length;

    return {
      totalDependencies,
      averageDependenciesPerArtifact,
      maxDependencies,
      circularDependencies,
      stronglyConnectedComponents: 0 // Simplified - would need Tarjan's algorithm
    };
  }
}