// Export only types without implementation dependencies
export * from './types';

// Default configuration for the service
export const defaultConfig = {
  includePatterns: [
    '**/*.ts',
    '**/*.tsx', 
    '**/*.js',
    '**/*.jsx'
  ],
  excludePatterns: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '**/*.test.ts',
    '**/*.test.js',
    '**/*.spec.ts',
    '**/*.spec.js',
    '**/*.d.ts'
  ],
  maxFileSize: 1024 * 1024, // 1MB
  calculateComplexity: true,
  analyzeDependencies: true,
  includeComments: false
};