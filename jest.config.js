/**
 * @fileoverview Jest configuration for LLMemory-Palace v2.6.0
 * @description Test runner configuration with coverage and security test support
 */

export default {
  // Test environment
  testEnvironment: 'node',
  
  // Module type
  moduleFileExtensions: ['js', 'mjs', 'json', 'node'],
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.mjs',
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.mjs',
    '**/tests/**/*.spec.js',
    '**/__tests__/**/*.js'
  ],
  
  // Transform configuration (no transform for ESM)
  transform: {},
  
  // Module name mapper for ESM support
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'lib/**/*.js',
    '!lib/**/*.test.js',
    '!lib/__mocks__/**',
    '!**/node_modules/**'
  ],
  
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/tests/',
    '/scripts/'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  
  // Coverage output directory
  coverageDirectory: 'coverage',
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Reset modules between tests
  resetModules: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Global setup (if needed)
  // globalSetup: './tests/setup.js',
  
  // Global teardown (if needed)
  // globalTeardown: './tests/teardown.js',
  
  // Root directory
  rootDir: '.',
  
  // Roots for test lookup
  roots: ['<rootDir>'],
  
  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/reconstructed/'
  ],
  
  // Watch plugins
  watchPlugins: [],
  
  // Snapshot serializers
  snapshotSerializers: [],
  
  // Error on deprecated features
  errorOnDeprecated: true,
  
  // Inject globals
  injectGlobals: true,
  
  // Custom test sequencing (run security tests first)
  sequencer: './tests/sequencer.js'
};
