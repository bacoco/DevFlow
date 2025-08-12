import { Logger } from '../utils/logger';

export interface RefactoringOpportunity {
  id: string;
  type: 'code_smell' | 'duplication' | 'complexity' | 'coupling' | 'cohesion' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  filePath: string;
  startLine: number;
  endLine: number;
  confidence: number;
  estimatedEffort: 'low' | 'medium' | 'high';
  suggestedRefactoring: string;
  codeSnippet: string;
  metrics: RefactoringMetrics;
  relatedFiles?: string[];
}

export interface RefactoringMetrics {
  cyclomaticComplexity?: number;
  linesOfCode: number;
  duplicatedLines?: number;
  couplingScore?: number;
  cohesionScore?: number;
  maintainabilityIndex?: number;
}

export interface CodeAnalysisResult {
  filePath: string;
  opportunities: RefactoringOpportunity[];
  overallScore: number;
  metrics: FileMetrics;
}

export interface FileMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  technicalDebt: number;
  codeSmells: number;
}

export class RefactoringDetector {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async analyzeFile(filePath: string, content: string): Promise<CodeAnalysisResult> {
    try {
      const opportunities: RefactoringOpportunity[] = [];
      
      // Detect various refactoring opportunities
      opportunities.push(...this.detectCodeSmells(filePath, content));
      opportunities.push(...this.detectDuplication(filePath, content));
      opportunities.push(...this.detectComplexity(filePath, content));
      opportunities.push(...this.detectCoupling(filePath, content));
      
      const metrics = this.calculateFileMetrics(content);
      const overallScore = this.calculateOverallScore(opportunities, metrics);
      
      return {
        filePath,
        opportunities: opportunities.sort((a, b) => b.confidence - a.confidence),
        overallScore,
        metrics
      };
    } catch (error) {
      this.logger.error(`Failed to analyze file ${filePath}:`, error);
      throw error;
    }
  }
}  p
rivate detectCodeSmells(filePath: string, content: string): RefactoringOpportunity[] {
    const opportunities: RefactoringOpportunity[] = [];
    const lines = content.split('\n');
    
    // Long method detection
    const methods = this.extractMethods(content);
    methods.forEach(method => {
      if (method.lineCount > 50) {
        opportunities.push({
          id: `long-method-${method.name}`,
          type: 'code_smell',
          severity: method.lineCount > 100 ? 'high' : 'medium',
          title: 'Long Method',
          description: `Method '${method.name}' is too long (${method.lineCount} lines)`,
          filePath,
          startLine: method.startLine,
          endLine: method.endLine,
          confidence: 0.9,
          estimatedEffort: method.lineCount > 100 ? 'high' : 'medium',
          suggestedRefactoring: 'Extract smaller methods or break into multiple functions',
          codeSnippet: method.code,
          metrics: {
            linesOfCode: method.lineCount,
            cyclomaticComplexity: this.calculateCyclomaticComplexity(method.code)
          }
        });
      }
    });
    
    // Large class detection
    if (lines.length > 500) {
      opportunities.push({
        id: 'large-class',
        type: 'code_smell',
        severity: lines.length > 1000 ? 'high' : 'medium',
        title: 'Large Class',
        description: `File is too large (${lines.length} lines)`,
        filePath,
        startLine: 1,
        endLine: lines.length,
        confidence: 0.8,
        estimatedEffort: 'high',
        suggestedRefactoring: 'Split into multiple smaller classes or modules',
        codeSnippet: content.substring(0, 500) + '...',
        metrics: {
          linesOfCode: lines.length
        }
      });
    }
    
    return opportunities;
  }

  private detectDuplication(filePath: string, content: string): RefactoringOpportunity[] {
    const opportunities: RefactoringOpportunity[] = [];
    const lines = content.split('\n');
    const duplicates = this.findDuplicatedCode(lines);
    
    duplicates.forEach(duplicate => {
      if (duplicate.lineCount >= 5) {
        opportunities.push({
          id: `duplication-${duplicate.startLine}`,
          type: 'duplication',
          severity: duplicate.lineCount > 20 ? 'high' : 'medium',
          title: 'Code Duplication',
          description: `${duplicate.lineCount} lines of duplicated code found`,
          filePath,
          startLine: duplicate.startLine,
          endLine: duplicate.endLine,
          confidence: 0.85,
          estimatedEffort: 'medium',
          suggestedRefactoring: 'Extract common code into a shared function or method',
          codeSnippet: duplicate.code,
          metrics: {
            linesOfCode: duplicate.lineCount,
            duplicatedLines: duplicate.lineCount
          }
        });
      }
    });
    
    return opportunities;
  }

  private detectComplexity(filePath: string, content: string): RefactoringOpportunity[] {
    const opportunities: RefactoringOpportunity[] = [];
    const methods = this.extractMethods(content);
    
    methods.forEach(method => {
      const complexity = this.calculateCyclomaticComplexity(method.code);
      
      if (complexity > 10) {
        opportunities.push({
          id: `complexity-${method.name}`,
          type: 'complexity',
          severity: complexity > 20 ? 'high' : 'medium',
          title: 'High Cyclomatic Complexity',
          description: `Method '${method.name}' has high complexity (${complexity})`,
          filePath,
          startLine: method.startLine,
          endLine: method.endLine,
          confidence: 0.9,
          estimatedEffort: complexity > 20 ? 'high' : 'medium',
          suggestedRefactoring: 'Simplify conditional logic or extract complex conditions',
          codeSnippet: method.code,
          metrics: {
            linesOfCode: method.lineCount,
            cyclomaticComplexity: complexity
          }
        });
      }
    });
    
    return opportunities;
  }

  private detectCoupling(filePath: string, content: string): RefactoringOpportunity[] {
    const opportunities: RefactoringOpportunity[] = [];
    const imports = this.extractImports(content);
    
    if (imports.length > 20) {
      opportunities.push({
        id: 'high-coupling',
        type: 'coupling',
        severity: imports.length > 30 ? 'high' : 'medium',
        title: 'High Coupling',
        description: `File has too many dependencies (${imports.length} imports)`,
        filePath,
        startLine: 1,
        endLine: 10,
        confidence: 0.7,
        estimatedEffort: 'high',
        suggestedRefactoring: 'Reduce dependencies or use dependency injection',
        codeSnippet: imports.slice(0, 10).join('\n') + '...',
        metrics: {
          linesOfCode: imports.length,
          couplingScore: imports.length / 10
        }
      });
    }
    
    return opportunities;
  }
} 
 private extractMethods(content: string): Array<{name: string, code: string, startLine: number, endLine: number, lineCount: number}> {
    const methods = [];
    const lines = content.split('\n');
    
    // Simple method extraction (can be enhanced with proper AST parsing)
    const methodRegex = /(function\s+\w+|const\s+\w+\s*=|class\s+\w+|\w+\s*\([^)]*\)\s*{)/g;
    let match;
    
    while ((match = methodRegex.exec(content)) !== null) {
      const startIndex = match.index;
      const startLine = content.substring(0, startIndex).split('\n').length;
      
      // Find the end of the method by matching braces
      let braceCount = 0;
      let endIndex = startIndex;
      let inMethod = false;
      
      for (let i = startIndex; i < content.length; i++) {
        const char = content[i];
        if (char === '{') {
          braceCount++;
          inMethod = true;
        } else if (char === '}') {
          braceCount--;
          if (inMethod && braceCount === 0) {
            endIndex = i;
            break;
          }
        }
      }
      
      const methodCode = content.substring(startIndex, endIndex + 1);
      const endLine = content.substring(0, endIndex).split('\n').length;
      const lineCount = endLine - startLine + 1;
      
      methods.push({
        name: match[0].replace(/[{(].*/, '').trim(),
        code: methodCode,
        startLine,
        endLine,
        lineCount
      });
    }
    
    return methods;
  }

  private findDuplicatedCode(lines: string[]): Array<{code: string, startLine: number, endLine: number, lineCount: number}> {
    const duplicates = [];
    const minDuplicateLength = 5;
    
    for (let i = 0; i < lines.length - minDuplicateLength; i++) {
      for (let j = i + minDuplicateLength; j < lines.length - minDuplicateLength; j++) {
        let matchLength = 0;
        
        // Check how many consecutive lines match
        while (
          i + matchLength < lines.length &&
          j + matchLength < lines.length &&
          lines[i + matchLength].trim() === lines[j + matchLength].trim() &&
          lines[i + matchLength].trim() !== ''
        ) {
          matchLength++;
        }
        
        if (matchLength >= minDuplicateLength) {
          duplicates.push({
            code: lines.slice(i, i + matchLength).join('\n'),
            startLine: i + 1,
            endLine: i + matchLength,
            lineCount: matchLength
          });
          
          // Skip ahead to avoid overlapping duplicates
          i += matchLength - 1;
          break;
        }
      }
    }
    
    return duplicates;
  }

  private calculateCyclomaticComplexity(code: string): number {
    // Simple cyclomatic complexity calculation
    let complexity = 1; // Base complexity
    
    // Count decision points
    const decisionKeywords = ['if', 'else if', 'while', 'for', 'switch', 'case', 'catch', '&&', '||', '?'];
    
    decisionKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = code.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    });
    
    return complexity;
  }

  private extractImports(content: string): string[] {
    const imports = [];
    const lines = content.split('\n');
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('import ') || trimmed.startsWith('require(') || trimmed.startsWith('from ')) {
        imports.push(trimmed);
      }
    });
    
    return imports;
  }

  private calculateFileMetrics(content: string): FileMetrics {
    const lines = content.split('\n');
    const methods = this.extractMethods(content);
    
    const linesOfCode = lines.filter(line => line.trim() !== '' && !line.trim().startsWith('//')).length;
    const cyclomaticComplexity = methods.reduce((sum, method) => 
      sum + this.calculateCyclomaticComplexity(method.code), 0
    );
    
    const maintainabilityIndex = this.calculateMaintainabilityIndex(linesOfCode, cyclomaticComplexity);
    const technicalDebt = this.calculateTechnicalDebt(linesOfCode, cyclomaticComplexity);
    
    return {
      linesOfCode,
      cyclomaticComplexity,
      maintainabilityIndex,
      technicalDebt,
      codeSmells: Math.floor(cyclomaticComplexity / 10) + Math.floor(linesOfCode / 100)
    };
  }

  private calculateMaintainabilityIndex(loc: number, complexity: number): number {
    // Simplified maintainability index calculation
    const halsteadVolume = Math.log2(loc) * 10; // Simplified Halstead volume
    const maintainabilityIndex = Math.max(0, 
      171 - 5.2 * Math.log(halsteadVolume) - 0.23 * complexity - 16.2 * Math.log(loc)
    );
    
    return Math.round(maintainabilityIndex);
  }

  private calculateTechnicalDebt(loc: number, complexity: number): number {
    // Technical debt in hours (simplified calculation)
    const complexityDebt = Math.max(0, complexity - 10) * 0.5;
    const sizeDebt = Math.max(0, loc - 200) * 0.01;
    
    return Math.round((complexityDebt + sizeDebt) * 10) / 10;
  }

  private calculateOverallScore(opportunities: RefactoringOpportunity[], metrics: FileMetrics): number {
    let score = 100;
    
    // Deduct points for opportunities
    opportunities.forEach(opp => {
      const severityPenalty = {
        low: 2,
        medium: 5,
        high: 10,
        critical: 20
      };
      
      score -= severityPenalty[opp.severity] * opp.confidence;
    });
    
    // Deduct points for poor metrics
    if (metrics.maintainabilityIndex < 50) {
      score -= (50 - metrics.maintainabilityIndex) * 0.5;
    }
    
    if (metrics.technicalDebt > 10) {
      score -= metrics.technicalDebt;
    }
    
    return Math.max(0, Math.round(score));
  }

  async analyzeProject(projectPath: string): Promise<CodeAnalysisResult[]> {
    // This would analyze all files in a project
    // For now, return empty array as placeholder
    return [];
  }

  generateRefactoringReport(results: CodeAnalysisResult[]): string {
    let report = '# Refactoring Opportunities Report\n\n';
    
    const totalOpportunities = results.reduce((sum, result) => sum + result.opportunities.length, 0);
    const avgScore = results.reduce((sum, result) => sum + result.overallScore, 0) / results.length;
    
    report += `## Summary\n`;
    report += `- Files analyzed: ${results.length}\n`;
    report += `- Total opportunities: ${totalOpportunities}\n`;
    report += `- Average quality score: ${avgScore.toFixed(1)}/100\n\n`;
    
    // Group opportunities by severity
    const bySeverity = results.flatMap(r => r.opportunities).reduce((acc, opp) => {
      acc[opp.severity] = (acc[opp.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    report += `## Opportunities by Severity\n`;
    Object.entries(bySeverity).forEach(([severity, count]) => {
      report += `- ${severity}: ${count}\n`;
    });
    
    return report;
  }
}