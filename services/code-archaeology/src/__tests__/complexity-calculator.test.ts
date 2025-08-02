import { ComplexityCalculator } from '../parsers/complexity-calculator';
import { Project } from 'ts-morph';

describe('ComplexityCalculator', () => {
  let calculator: ComplexityCalculator;
  let project: Project;

  beforeEach(() => {
    calculator = new ComplexityCalculator();
    project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: 99,
        allowJs: true
      }
    });
  });

  describe('calculateCyclomaticComplexity', () => {
    it('should calculate complexity for simple function', () => {
      const sourceFile = project.createSourceFile('test.ts', `
        function simple() {
          return 42;
        }
      `);

      const func = sourceFile.getFunctions()[0];
      const complexity = calculator.calculateFunctionComplexity(func);

      expect(complexity.cyclomaticComplexity).toBe(1); // Base complexity
    });

    it('should calculate complexity for function with if statement', () => {
      const sourceFile = project.createSourceFile('test.ts', `
        function withIf(x: number) {
          if (x > 0) {
            return x;
          }
          return 0;
        }
      `);

      const func = sourceFile.getFunctions()[0];
      const complexity = calculator.calculateFunctionComplexity(func);

      expect(complexity.cyclomaticComplexity).toBe(2); // Base + if
    });

    it('should calculate complexity for function with multiple conditions', () => {
      const sourceFile = project.createSourceFile('test.ts', `
        function complex(x: number, y: number) {
          if (x > 0 && y > 0) {
            for (let i = 0; i < x; i++) {
              if (i % 2 === 0) {
                continue;
              }
            }
          } else if (x < 0) {
            while (y > 0) {
              y--;
            }
          }
          
          switch (x) {
            case 1:
              return 1;
            case 2:
              return 2;
            default:
              return 0;
          }
        }
      `);

      const func = sourceFile.getFunctions()[0];
      const complexity = calculator.calculateFunctionComplexity(func);

      // Base(1) + if(1) + &&(1) + for(1) + if(1) + else if(1) + while(1) + switch(1) + case(1) + case(1)
      expect(complexity.cyclomaticComplexity).toBeGreaterThanOrEqual(8);
    });

    it('should handle ternary operators', () => {
      const sourceFile = project.createSourceFile('test.ts', `
        function withTernary(x: number) {
          return x > 0 ? x : -x;
        }
      `);

      const func = sourceFile.getFunctions()[0];
      const complexity = calculator.calculateFunctionComplexity(func);

      expect(complexity.cyclomaticComplexity).toBe(2); // Base + ternary
    });

    it('should handle logical operators', () => {
      const sourceFile = project.createSourceFile('test.ts', `
        function withLogical(a: boolean, b: boolean, c: boolean) {
          return a && b || c;
        }
      `);

      const func = sourceFile.getFunctions()[0];
      const complexity = calculator.calculateFunctionComplexity(func);

      expect(complexity.cyclomaticComplexity).toBe(3); // Base + && + ||
    });
  });

  describe('calculateCognitiveComplexity', () => {
    it('should calculate cognitive complexity with nesting', () => {
      const sourceFile = project.createSourceFile('test.ts', `
        function nested(x: number) {
          if (x > 0) {          // +1
            if (x > 10) {       // +2 (nested)
              for (let i = 0; i < x; i++) {  // +3 (nested)
                if (i % 2 === 0) {           // +4 (nested)
                  continue;                  // +1
                }
              }
            }
          }
        }
      `);

      const func = sourceFile.getFunctions()[0];
      const complexity = calculator.calculateFunctionComplexity(func);

      expect(complexity.cognitiveComplexity).toBeGreaterThan(5);
    });

    it('should not increase nesting for else if', () => {
      const sourceFile = project.createSourceFile('test.ts', `
        function elseIf(x: number) {
          if (x === 1) {
            return 1;
          } else if (x === 2) {
            return 2;
          } else if (x === 3) {
            return 3;
          }
          return 0;
        }
      `);

      const func = sourceFile.getFunctions()[0];
      const complexity = calculator.calculateFunctionComplexity(func);

      // Should be lower than deeply nested conditions
      expect(complexity.cognitiveComplexity).toBeLessThan(10);
    });
  });

  describe('calculateHalsteadMetrics', () => {
    it('should calculate Halstead metrics', () => {
      const sourceFile = project.createSourceFile('test.ts', `
        function calculate(a: number, b: number) {
          const sum = a + b;
          const product = a * b;
          if (sum > product) {
            return sum;
          } else {
            return product;
          }
        }
      `);

      const func = sourceFile.getFunctions()[0];
      const complexity = calculator.calculateFunctionComplexity(func);

      expect(complexity.halsteadMetrics).toBeDefined();
      expect(complexity.halsteadMetrics!.volume).toBeGreaterThan(0);
      expect(complexity.halsteadMetrics!.difficulty).toBeGreaterThan(0);
      expect(complexity.halsteadMetrics!.effort).toBeGreaterThan(0);
    });

    it('should handle empty function', () => {
      const sourceFile = project.createSourceFile('test.ts', `
        function empty() {
        }
      `);

      const func = sourceFile.getFunctions()[0];
      const complexity = calculator.calculateFunctionComplexity(func);

      expect(complexity.halsteadMetrics!.volume).toBe(0);
      expect(complexity.halsteadMetrics!.difficulty).toBe(0);
      expect(complexity.halsteadMetrics!.effort).toBe(0);
    });
  });

  describe('calculateFileComplexity', () => {
    it('should calculate complexity for entire file', () => {
      const sourceFile = project.createSourceFile('test.ts', `
        function func1(x: number) {
          if (x > 0) {
            return x;
          }
          return 0;
        }

        function func2(y: number) {
          for (let i = 0; i < y; i++) {
            if (i % 2 === 0) {
              continue;
            }
          }
        }

        class TestClass {
          method1() {
            return true;
          }

          method2(z: number) {
            while (z > 0) {
              z--;
            }
          }
        }
      `);

      const complexity = calculator.calculateFileComplexity(sourceFile);

      expect(complexity.cyclomaticComplexity).toBeGreaterThan(4);
      expect(complexity.linesOfCode).toBeGreaterThan(10);
      expect(complexity.maintainabilityIndex).toBeLessThan(100);
    });

    it('should count lines of code correctly', () => {
      const sourceFile = project.createSourceFile('test.ts', `
        // This is a comment
        function test() {
          /* Block comment */
          const x = 1;
          
          // Another comment
          return x;
        }
        
        // Final comment
      `);

      const complexity = calculator.calculateFileComplexity(sourceFile);

      // Should count only non-comment, non-empty lines
      expect(complexity.linesOfCode).toBe(4); // function, const, return, closing brace
    });
  });

  describe('maintainabilityIndex', () => {
    it('should calculate maintainability index', () => {
      const sourceFile = project.createSourceFile('test.ts', `
        function simple() {
          return 42;
        }
      `);

      const func = sourceFile.getFunctions()[0];
      const complexity = calculator.calculateFunctionComplexity(func);

      expect(complexity.maintainabilityIndex).toBeGreaterThan(0);
      expect(complexity.maintainabilityIndex).toBeLessThanOrEqual(100);
    });

    it('should give lower maintainability for complex functions', () => {
      const simpleFile = project.createSourceFile('simple.ts', `
        function simple() {
          return 42;
        }
      `);

      const complexFile = project.createSourceFile('complex.ts', `
        function complex(x: number, y: number, z: number) {
          if (x > 0) {
            for (let i = 0; i < x; i++) {
              if (i % 2 === 0) {
                for (let j = 0; j < y; j++) {
                  if (j % 3 === 0) {
                    while (z > 0) {
                      z--;
                      if (z % 5 === 0) {
                        break;
                      }
                    }
                  }
                }
              }
            }
          }
          return x + y + z;
        }
      `);

      const simpleFunc = simpleFile.getFunctions()[0];
      const complexFunc = complexFile.getFunctions()[0];

      const simpleComplexity = calculator.calculateFunctionComplexity(simpleFunc);
      const complexComplexity = calculator.calculateFunctionComplexity(complexFunc);

      expect(simpleComplexity.maintainabilityIndex).toBeGreaterThan(
        complexComplexity.maintainabilityIndex
      );
    });
  });
});