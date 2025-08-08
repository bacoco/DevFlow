/**
 * Test Coverage Configuration
 * Defines coverage thresholds and quality gates for UI components
 */

module.exports = {
  // Global coverage thresholds
  global: {
    branches: 85,
    functions: 85,
    lines: 85,
    statements: 85,
  },

  // Component-specific thresholds
  './src/components/ui/': {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90,
  },

  // Critical components require higher coverage
  './src/components/ui/Button.tsx': {
    branches: 95,
    functions: 95,
    lines: 95,
    statements: 95,
  },

  './src/components/ui/Input.tsx': {
    branches: 95,
    functions: 95,
    lines: 95,
    statements: 95,
  },

  './src/components/ui/Modal.tsx': {
    branches: 95,
    functions: 95,
    lines: 95,
    statements: 95,
  },

  // Accessibility components require full coverage
  './src/components/ui/SkipLinks.tsx': {
    branches: 100,
    functions: 100,
    lines: 100,
    statements: 100,
  },

  './src/components/ui/AccessibilityPanel.tsx': {
    branches: 95,
    functions: 95,
    lines: 95,
    statements: 95,
  },

  // Files to exclude from coverage
  excludePatterns: [
    '**/*.stories.tsx',
    '**/*.example.tsx',
    '**/__tests__/**',
    '**/node_modules/**',
    '**/*.d.ts',
  ],

  // Coverage reporters
  reporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json-summary',
    'cobertura', // For CI/CD integration
  ],

  // Quality gates
  qualityGates: {
    // Fail build if coverage drops below these thresholds
    failOnCoverageDecrease: true,
    
    // Maximum allowed coverage decrease
    maxCoverageDecrease: 2,
    
    // Require tests for new files
    requireTestsForNewFiles: true,
    
    // Minimum test count per component
    minTestsPerComponent: 5,
    
    // Required test categories
    requiredTestCategories: [
      'rendering',
      'interactions',
      'accessibility',
      'error-handling',
      'edge-cases',
    ],
  },

  // Test categorization patterns
  testCategories: {
    rendering: /describe\(['"]Rendering['"]|it\(['"]renders/i,
    interactions: /describe\(['"]Interactions?['"]|it\(['"].*click|it\(['"].*hover|it\(['"].*focus/i,
    accessibility: /describe\(['"]Accessibility['"]|it\(['"].*a11y|it\(['"].*aria|it\(['"].*screen reader/i,
    errorHandling: /describe\(['"]Error|it\(['"].*error|it\(['"]handles.*error/i,
    edgeCases: /describe\(['"]Edge Cases?['"]|it\(['"]handles.*edge|it\(['"].*boundary/i,
    performance: /describe\(['"]Performance['"]|it\(['"].*performance|it\(['"].*render time/i,
    variants: /describe\(['"]Variants?['"]|it\(['"].*variant/i,
    states: /describe\(['"]States?['"]|it\(['"].*state/i,
  },

  // Coverage collection patterns
  collectCoverageFrom: [
    'src/components/ui/**/*.{ts,tsx}',
    '!src/components/ui/**/*.stories.{ts,tsx}',
    '!src/components/ui/**/*.example.{ts,tsx}',
    '!src/components/ui/**/__tests__/**',
    '!src/components/ui/**/index.{ts,tsx}',
    '!src/components/ui/**/*.d.ts',
  ],

  // Ignore patterns for coverage
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/stories/',
    '/examples/',
    '\\.stories\\.',
    '\\.example\\.',
  ],

  // Branch coverage configuration
  branchCoverage: {
    // Require coverage for all conditional branches
    requireAllBranches: true,
    
    // Include switch statements
    includeSwitchBranches: true,
    
    // Include ternary operators
    includeTernaryBranches: true,
    
    // Include logical operators (&&, ||)
    includeLogicalBranches: true,
  },

  // Function coverage configuration
  functionCoverage: {
    // Require coverage for all exported functions
    requireAllExports: true,
    
    // Include arrow functions
    includeArrowFunctions: true,
    
    // Include method definitions
    includeMethodDefinitions: true,
    
    // Include constructor functions
    includeConstructors: true,
  },

  // Line coverage configuration
  lineCoverage: {
    // Exclude empty lines
    excludeEmptyLines: true,
    
    // Exclude comment-only lines
    excludeCommentLines: true,
    
    // Include all executable lines
    includeAllExecutableLines: true,
  },

  // Statement coverage configuration
  statementCoverage: {
    // Include all statements
    includeAllStatements: true,
    
    // Include declarations
    includeDeclarations: true,
    
    // Include expressions
    includeExpressions: true,
  },
};