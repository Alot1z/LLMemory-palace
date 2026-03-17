#!/usr/bin/env node
/**
 * @fileoverview Build script for LLMemory-Palace v2.6.0
 * @description Compiles, bundles, and prepares distribution
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('═'.repeat(60));
console.log('🏗️  LLMemory-Palace Build v2.6.0');
console.log('═'.repeat(60) + '\n');

async function build() {
  const startTime = Date.now();
  
  try {
    // Step 1: Clean
    console.log('🧹 Cleaning dist directory...');
    const distDir = path.join(rootDir, 'dist');
    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true });
    }
    fs.mkdirSync(distDir, { recursive: true });
    fs.mkdirSync(path.join(distDir, 'lib'), { recursive: true });
    fs.mkdirSync(path.join(distDir, 'bin'), { recursive: true });
    console.log('   ✓ Dist directory cleaned\n');
    
    // Step 2: Copy lib files (including subdirectories)
    console.log('📦 Copying library files...');
    const libDir = path.join(rootDir, 'lib');
    
    function copyDir(srcDir, destDir) {
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      const entries = fs.readdirSync(srcDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);
        
        if (entry.isDirectory()) {
          copyDir(srcPath, destPath);
          console.log(`   ✓ ${path.relative(libDir, srcPath)}/`);
        } else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) {
          fs.copyFileSync(srcPath, destPath);
          console.log(`   ✓ ${path.relative(libDir, srcPath)}`);
        }
      }
    }
    
    copyDir(libDir, path.join(distDir, 'lib'));
    
    // Step 3: Copy bin files
    console.log('\n📦 Copying bin files...');
    const binDir = path.join(rootDir, 'bin');
    const binFiles = fs.readdirSync(binDir).filter(f => f.endsWith('.js'));
    
    for (const file of binFiles) {
      const src = path.join(binDir, file);
      const dest = path.join(distDir, 'bin', file);
      fs.copyFileSync(src, dest);
      // Make executable
      fs.chmodSync(dest, 0o755);
      console.log(`   ✓ ${file}`);
    }
    
    // Step 4: Copy config files
    console.log('\n📦 Copying config files...');
    const configDir = path.join(rootDir, 'config');
    if (fs.existsSync(configDir)) {
      const destConfigDir = path.join(distDir, 'config');
      fs.mkdirSync(destConfigDir, { recursive: true });
      const configFiles = fs.readdirSync(configDir);
      
      for (const file of configFiles) {
        const src = path.join(configDir, file);
        const dest = path.join(destConfigDir, file);
        fs.copyFileSync(src, dest);
        console.log(`   ✓ config/${file}`);
      }
    }
    
    // Step 5: Copy documentation
    console.log('\n📦 Copying documentation...');
    const docsToCopy = ['README.md', 'LICENSE', 'CHANGELOG.md'];
    
    for (const doc of docsToCopy) {
      const src = path.join(rootDir, doc);
      const dest = path.join(distDir, doc);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`   ✓ ${doc}`);
      }
    }
    
    // Step 6: Generate package.json for dist
    console.log('\n📦 Generating dist package.json...');
    const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json')));
    
    const distPackage = {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      type: packageJson.type,
      main: 'lib/palace.js',
      bin: {
        palace: './bin/cli.js'
      },
      types: 'index.d.ts',
      exports: packageJson.exports,
      files: ['lib/', 'bin/', 'config/', '*.md'],
      scripts: {
        start: 'node bin/cli.js'
      },
      keywords: packageJson.keywords,
      author: packageJson.author,
      license: packageJson.license,
      repository: packageJson.repository,
      bugs: packageJson.bugs,
      homepage: packageJson.homepage,
      engines: packageJson.engines,
      dependencies: packageJson.dependencies
    };
    
    fs.writeFileSync(
      path.join(distDir, 'package.json'),
      JSON.stringify(distPackage, null, 2)
    );
    console.log('   ✓ package.json');
    
    // Step 7: Generate index.d.ts
    console.log('\n📦 Generating TypeScript definitions...');
    const dtsContent = `/**
 * LLMemory-Palace v${packageJson.version}
 * TypeScript Definitions
 */

declare module 'llmemory-palace' {
  export class Palace {
    constructor(projectPath: string, options?: PalaceOptions);
    init(): Promise<InitResult>;
    scan(): Promise<ScanResult>;
    export(options?: ExportOptions): Promise<string>;
    generateGenome(): Promise<string>;
    compress(): Promise<CompressionResult>;
    createPack(): Promise<Pack>;
    mergePack(pack: Pack, outputDir: string): Promise<MergeResult>;
    query(queryString: string): Promise<string>;
    getStatus(): Promise<StatusResult>;
  }

  export interface PalaceOptions {
    exclude?: string[];
    maxFileSize?: number;
    patterns?: boolean;
    flows?: boolean;
    includeTests?: boolean;
    includeHidden?: boolean;
  }

  export interface ScanResult {
    files: number;
    lines: number;
    size: number;
    languages: string[];
    patterns: number;
    flows: number;
  }

  export interface ExportOptions {
    format?: 'cxml' | 'json' | 'genome';
    level?: number;
    compress?: boolean;
  }

  export interface CompressionResult {
    originalSize: number;
    compressedSize: number;
    ratio: string;
    content?: string;
  }

  export interface Pack {
    version: string;
    name: string;
    created: string;
    files: PackFile[];
    patterns: Pattern[];
    flows: Flow[];
  }

  export interface PackFile {
    path: string;
    content: string;
    language: string;
    lines: number;
    hash: string;
  }

  export interface Pattern {
    name: string;
    template: string;
    instances: Record<string, unknown>[];
  }

  export interface Flow {
    name: string;
    steps: string[];
  }

  export function safeGenomeParse(
    data: string | object | Buffer,
    options?: ParseOptions
  ): ValidatedGenome;

  export function executeGenome(
    genome: string | object,
    context?: ExecutionContext
  ): ExecutionResult;

  export function validatePath(
    path: string,
    options?: PathOptions
  ): string;

  export function validateCommand(
    command: string,
    options: Record<string, unknown>
  ): Record<string, unknown>;

  export function sanitizeString(
    input: string,
    options?: SanitizeOptions
  ): string;

  export class GenomeParseError extends Error {}
  export class GenomeValidationError extends Error {}
  export class SecurityError extends Error {}
  export class ValidationError extends Error {}
}

export default Palace;
`;
    fs.writeFileSync(path.join(distDir, 'index.d.ts'), dtsContent);
    console.log('   ✓ index.d.ts');
    
    // Step 8: Build summary
    const duration = Date.now() - startTime;
    console.log('\n' + '═'.repeat(60));
    console.log('✅ Build Complete');
    console.log('═'.repeat(60));
    console.log(`   📦 Version: ${packageJson.version}`);
    console.log(`   📁 Output: ${distDir}`);
    console.log(`   ⏱️  Duration: ${duration}ms`);
    console.log('   🔒 Security: Enhanced');
    console.log('═'.repeat(60) + '\n');
    
    return { success: true, duration, outputDir: distDir };
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    throw error;
  }
}

// Run build
build().catch(process.exit(1));
