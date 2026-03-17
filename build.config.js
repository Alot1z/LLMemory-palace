/**
 * @fileoverview Build configuration for LLMemory-Palace v2.6.0
 * @description ESBuild configuration for bundling and distribution
 */

export default {
  // Entry points
  entry: {
    'palace': './lib/palace.js',
    'patterns': './lib/patterns.js',
    'flows': './lib/flows.js',
    'genome': './lib/genome.js',
    'genome-safe': './lib/genome-safe.js',
    'cli-validator': './lib/cli-validator.js',
    'semantic-hash': './lib/semantic-hash.js',
    'reconstructor': './lib/reconstructor.js',
    'index': './lib/index.js'
  },
  
  // Output configuration
  output: {
    dir: './dist',
    format: 'esm',
    sourcemap: true,
    declarations: true,
    clean: true
  },
  
  // External dependencies (not bundled)
  external: [
    'fs',
    'path',
    'crypto',
    'os',
    'util',
    'events',
    'stream',
    'buffer',
    'zod',
    'chalk',
    'commander',
    'glob',
    'minimatch'
  ],
  
  // Build options
  options: {
    minify: false, // Keep readable for debugging
    target: 'node18',
    platform: 'node',
    bundle: false, // Keep modules separate
    splitting: false,
    treeShaking: true,
    metafile: true
  },
  
  // TypeScript declaration generation
  typescript: {
    enabled: true,
    input: './lib/**/*.js',
    output: './dist/types',
    compilerOptions: {
      declaration: true,
      emitDeclarationOnly: true,
      allowJs: true,
      checkJs: false
    }
  },
  
  // Copy additional files
  copy: [
    { from: './config', to: './config' },
    { from: './README.md', to: './README.md' },
    { from: './LICENSE', to: './LICENSE' },
    { from: './CHANGELOG.md', to: './CHANGELOG.md' }
  ],
  
  // Build hooks
  hooks: {
    preBuild: async () => {
      console.log('🔨 Starting build...');
      console.log('📦 Version: 2.6.0');
      console.log('🔒 Security: Enhanced');
    },
    
    postBuild: async (result) => {
      console.log('✅ Build complete');
      console.log(`📊 ${result.modules.length} modules built`);
      console.log(`📏 ${result.totalSize} bytes output`);
    }
  }
};
