import { Node, SourceFile, SyntaxKind } from 'ts-morph';
import { ComplexityMetrics } from '../types';

export class ComplexityCalculator {
  
  calculateFileComplexity(sourceFile: SourceFile): ComplexityMetrics {
    let totalCyclomatic = 0;
    let totalCognitive = 0;
    let functionCount = 0;

    sourceFile.forEachDescendant((node) => {
      if (this.isFunctionLikeNode(node)) {
        const complexity = this.calculateFunctionComplexity(node);
        totalCyclomatic += complexity.cyclomaticComplexity;
        totalCognitive += complexity.cognitiveComplexity;
        functionCount++;
      }
    });

    const linesOfCode = this.countLinesOfCode(sourceFile);
    const maintainabilityIndex = this.calculateMaintainabilityIndex(
      totalCyclomatic / Math.max(functionCount, 1),
      linesOfCode
    );

    return {
      cyclomaticComplexity: totalCyclomatic,
      cognitiveComplexity: totalCognitive,
      linesOfCode,
      maintainabilityIndex
    };
  }

  calculateFunctionComplexity(node: Node): ComplexityMetrics {
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(node);
    const cognitiveComplexity = this.calculateCognitiveComplexity(node);
    const linesOfCode = this.countNodeLines(node);
    const maintainabilityIndex = this.calculateMaintainabilityIndex(cyclomaticComplexity, linesOfCode);

    return {
      cyclomaticComplexity,
      cognitiveComplexity,
      linesOfCode,
      maintainabilityIndex,
      halsteadMetrics: this.calculateHalsteadMetrics(node)
    };
  }

  private calculateCyclomaticComplexity(node: Node): number {
    let complexity = 1; // Base complexity

    node.forEachDescendant((descendant) => {
      switch (descendant.getKind()) {
        case SyntaxKind.IfStatement:
        case SyntaxKind.WhileStatement:
        case SyntaxKind.DoStatement:
        case SyntaxKind.ForStatement:
        case SyntaxKind.ForInStatement:
        case SyntaxKind.ForOfStatement:
        case SyntaxKind.SwitchStatement:
        case SyntaxKind.CatchClause:
        case SyntaxKind.ConditionalExpression:
          complexity++;
          break;
        case SyntaxKind.CaseClause:
          // Each case adds complexity except the first one
          complexity++;
          break;
        case SyntaxKind.BinaryExpression:
          const binaryExpr = descendant.asKindOrThrow(SyntaxKind.BinaryExpression);
          const operator = binaryExpr.getOperatorToken().getKind();
          if (operator === SyntaxKind.AmpersandAmpersandToken || 
              operator === SyntaxKind.BarBarToken) {
            complexity++;
          }
          break;
      }
    });

    return complexity;
  }

  private calculateCognitiveComplexity(node: Node): number {
    let complexity = 0;
    let nestingLevel = 0;

    const calculateForNode = (currentNode: Node, currentNesting: number) => {
      currentNode.getChildren().forEach(child => {
        let increment = 0;
        let newNesting = currentNesting;

        switch (child.getKind()) {
          case SyntaxKind.IfStatement:
          case SyntaxKind.SwitchStatement:
          case SyntaxKind.WhileStatement:
          case SyntaxKind.DoStatement:
          case SyntaxKind.ForStatement:
          case SyntaxKind.ForInStatement:
          case SyntaxKind.ForOfStatement:
            increment = 1 + currentNesting;
            newNesting = currentNesting + 1;
            break;
          case SyntaxKind.CatchClause:
            increment = 1 + currentNesting;
            newNesting = currentNesting + 1;
            break;
          case SyntaxKind.ConditionalExpression:
            increment = 1 + currentNesting;
            break;
          case SyntaxKind.BinaryExpression:
            const binaryExpr = child.asKindOrThrow(SyntaxKind.BinaryExpression);
            const operator = binaryExpr.getOperatorToken().getKind();
            if (operator === SyntaxKind.AmpersandAmpersandToken || 
                operator === SyntaxKind.BarBarToken) {
              increment = 1;
            }
            break;
          case SyntaxKind.BreakStatement:
          case SyntaxKind.ContinueStatement:
            increment = 1;
            break;
        }

        complexity += increment;
        calculateForNode(child, newNesting);
      });
    };

    calculateForNode(node, 0);
    return complexity;
  }

  private calculateHalsteadMetrics(node: Node): {
    volume: number;
    difficulty: number;
    effort: number;
  } {
    const operators = new Set<string>();
    const operands = new Set<string>();
    let operatorCount = 0;
    let operandCount = 0;

    node.forEachDescendant((descendant) => {
      const kind = descendant.getKind();
      const text = descendant.getText();

      // Count operators
      if (this.isOperator(kind)) {
        operators.add(text);
        operatorCount++;
      }
      // Count operands (identifiers, literals)
      else if (this.isOperand(kind)) {
        operands.add(text);
        operandCount++;
      }
    });

    const n1 = operators.size; // Unique operators
    const n2 = operands.size;  // Unique operands
    const N1 = operatorCount;  // Total operators
    const N2 = operandCount;   // Total operands

    const vocabulary = n1 + n2;
    const length = N1 + N2;
    const volume = length * Math.log2(vocabulary || 1);
    const difficulty = (n1 / 2) * (N2 / (n2 || 1));
    const effort = difficulty * volume;

    return {
      volume: isNaN(volume) ? 0 : volume,
      difficulty: isNaN(difficulty) ? 0 : difficulty,
      effort: isNaN(effort) ? 0 : effort
    };
  }

  private isOperator(kind: SyntaxKind): boolean {
    return [
      SyntaxKind.PlusToken,
      SyntaxKind.MinusToken,
      SyntaxKind.AsteriskToken,
      SyntaxKind.SlashToken,
      SyntaxKind.PercentToken,
      SyntaxKind.EqualsEqualsToken,
      SyntaxKind.ExclamationEqualsToken,
      SyntaxKind.LessThanToken,
      SyntaxKind.GreaterThanToken,
      SyntaxKind.LessThanEqualsToken,
      SyntaxKind.GreaterThanEqualsToken,
      SyntaxKind.AmpersandAmpersandToken,
      SyntaxKind.BarBarToken,
      SyntaxKind.ExclamationToken,
      SyntaxKind.EqualsToken,
      SyntaxKind.PlusEqualsToken,
      SyntaxKind.MinusEqualsToken,
      SyntaxKind.AsteriskEqualsToken,
      SyntaxKind.SlashEqualsToken,
      SyntaxKind.IfKeyword,
      SyntaxKind.ElseKeyword,
      SyntaxKind.WhileKeyword,
      SyntaxKind.ForKeyword,
      SyntaxKind.SwitchKeyword,
      SyntaxKind.CaseKeyword,
      SyntaxKind.ReturnKeyword,
      SyntaxKind.BreakKeyword,
      SyntaxKind.ContinueKeyword
    ].includes(kind);
  }

  private isOperand(kind: SyntaxKind): boolean {
    return [
      SyntaxKind.Identifier,
      SyntaxKind.NumericLiteral,
      SyntaxKind.StringLiteral,
      SyntaxKind.TrueKeyword,
      SyntaxKind.FalseKeyword,
      SyntaxKind.NullKeyword,
      SyntaxKind.UndefinedKeyword
    ].includes(kind);
  }

  private calculateMaintainabilityIndex(cyclomaticComplexity: number, linesOfCode: number): number {
    // Simplified maintainability index calculation
    // MI = 171 - 5.2 * ln(Halstead Volume) - 0.23 * (Cyclomatic Complexity) - 16.2 * ln(Lines of Code)
    // Simplified version without Halstead volume
    const mi = 171 - 0.23 * cyclomaticComplexity - 16.2 * Math.log(linesOfCode || 1);
    return Math.max(0, Math.min(100, mi)); // Clamp between 0 and 100
  }

  private countLinesOfCode(sourceFile: SourceFile): number {
    const text = sourceFile.getFullText();
    const lines = text.split('\n');
    
    // Count non-empty, non-comment lines
    let loc = 0;
    let inBlockComment = false;

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed === '') continue;
      
      // Handle block comments
      if (trimmed.includes('/*')) {
        inBlockComment = true;
      }
      if (trimmed.includes('*/')) {
        inBlockComment = false;
        continue;
      }
      if (inBlockComment) continue;
      
      // Skip single line comments
      if (trimmed.startsWith('//')) continue;
      
      loc++;
    }

    return loc;
  }

  private countNodeLines(node: Node): number {
    const startLine = node.getStartLineNumber();
    const endLine = node.getEndLineNumber();
    return endLine - startLine + 1;
  }

  private isFunctionLikeNode(node: Node): boolean {
    return Node.isFunctionDeclaration(node) ||
           Node.isArrowFunction(node) ||
           Node.isFunctionExpression(node) ||
           Node.isMethodDeclaration(node) ||
           Node.isGetAccessorDeclaration(node) ||
           Node.isSetAccessorDeclaration(node);
  }
}