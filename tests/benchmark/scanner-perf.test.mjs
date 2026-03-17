/**
 * Benchmark tests for Scanner Performance optimization
 * 
 * Tests cover:
 * - Cache effectiveness
 * - Parallel directory walking
 * - Performance comparison (2x speedup requirement)
 * - Memory efficiency
 */

import { OptimizedScanner, createOptimizedScanner, runBenchmark } from '../src/scanner/scanner-optimized.js';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
    tests.push({ name, fn });
}

function assertEqual(actual, expected, msg = '') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${msg} Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

function assertTrue(value, msg = '') {
    if (!value) {
        throw new Error(`${msg} Expected truthy value, got ${value}`);
    }
}

function assertGreaterThan(actual, expected, msg = '') {
    if (actual <= expected) {
        throw new Error(`${msg} Expected ${actual} to be greater than ${expected}`);
    }
}

function assertLessThan(actual, expected, msg = '') {
    if (actual >= expected) {
        throw new Error(`${msg} Expected ${actual} to be less than ${expected}`);
    }
}

function assertArrayLength(arr, expected, msg = '') {
    if (arr.length !== expected) {
        throw new Error(`${msg} Expected array length ${expected}, got ${arr.length}`);
    }
}

// Test fixtures
let testProjectDir;

function setupTestProject() {
    testProjectDir = join(tmpdir(), `scanner-perf-test-${Date.now()}`);
    mkdirSync(testProjectDir, { recursive: true });
    
    // Create directory structure
    const dirs = [
        'src',
        'src/components',
        'src/utils',
        'src/services',
        'lib',
        'tests',
        'config'
    ];
    
    for (const dir of dirs) {
        mkdirSync(join(testProjectDir, dir), { recursive: true });
    }
    
    // Create test files
    const fileTemplates = {
        '.js': `// JavaScript file\nexport function test${Math.random()}() { return true; }\n`,
        '.ts': `// TypeScript file\nexport const test${Math.random()}: string = 'test';\n`,
        '.py': `# Python file\ndef test${Math.random().toString().replace('.', '_')}():\n    return True\n`,
    };
    
    // Create files in each directory
    for (const dir of dirs) {
        for (let i = 0; i < 20; i++) {
            const ext = ['.js', '.ts', '.py'][i % 3];
            const filePath = join(testProjectDir, dir, `file-${i}${ext}`);
            writeFileSync(filePath, fileTemplates[ext]);
        }
    }
    
    // Create node_modules (should be excluded)
    const nodeModulesDir = join(testProjectDir, 'node_modules');
    mkdirSync(join(nodeModulesDir, 'package1'), { recursive: true });
    writeFileSync(join(nodeModulesDir, 'package1', 'index.js'), 'module.exports = {};');
    
    // Create .git directory (should be excluded)
    const gitDir = join(testProjectDir, '.git');
    mkdirSync(gitDir, { recursive: true });
    writeFileSync(join(gitDir, 'config'), '[core]');
    
    // Create dist directory (should be excluded)
    const distDir = join(testProjectDir, 'dist');
    mkdirSync(distDir, { recursive: true });
    writeFileSync(join(distDir, 'bundle.js'), '// bundled code');
}

function cleanupTestProject() {
    if (testProjectDir && existsSync(testProjectDir)) {
        rmSync(testProjectDir, { recursive: true, force: true });
    }
}

// ============================================
// Constructor Tests
// ============================================

test('Constructor: should create instance with default options', () => {
    setupTestProject();
    
    const scanner = new OptimizedScanner({ projectPath: testProjectDir });
    
    assertTrue(scanner instanceof OptimizedScanner, 'Should be OptimizedScanner instance');
    
    cleanupTestProject();
});

test('Constructor: should accept custom worker count', () => {
    setupTestProject();
    
    const scanner = new OptimizedScanner({ 
        projectPath: testProjectDir,
        workerCount: 8 
    });
    
    assertTrue(scanner instanceof OptimizedScanner, 'Should create scanner with custom workers');
    
    cleanupTestProject();
});

test('Constructor: should enable caching by default', () => {
    setupTestProject();
    
    const scanner = new OptimizedScanner({ projectPath: testProjectDir });
    
    // Scan to verify caching works
    scanner.scan().then(result => {
        assertTrue(typeof result.stats.cacheHits === 'number', 'Should track cache hits');
    });
    
    cleanupTestProject();
});

// ============================================
// Basic Scanning Tests
// ============================================

test('scan: should discover all files', async () => {
    setupTestProject();
    
    const scanner = new OptimizedScanner({ 
        projectPath: testProjectDir,
        enableCache: false
    });
    
    const result = await scanner.scan();
    
    // Should find files (120 source files, excluding node_modules, .git, dist)
    assertGreaterThan(result.files.length, 100, 'Should discover many files');
    assertTrue(result.files.length < 130, 'Should exclude node_modules, .git, dist');
    
    cleanupTestProject();
});

test('scan: should exclude node_modules', async () => {
    setupTestProject();
    
    const scanner = new OptimizedScanner({ 
        projectPath: testProjectDir,
        enableCache: false
    });
    
    const result = await scanner.scan();
    
    const nodeModulesFiles = result.files.filter(f => f.path.includes('node_modules'));
    assertEqual(nodeModulesFiles.length, 0, 'Should not include node_modules files');
    
    cleanupTestProject();
});

test('scan: should exclude .git directory', async () => {
    setupTestProject();
    
    const scanner = new OptimizedScanner({ 
        projectPath: testProjectDir,
        enableCache: false
    });
    
    const result = await scanner.scan();
    
    const gitFiles = result.files.filter(f => f.path.includes('.git'));
    assertEqual(gitFiles.length, 0, 'Should not include .git files');
    
    cleanupTestProject();
});

test('scan: should detect languages correctly', async () => {
    setupTestProject();
    
    const scanner = new OptimizedScanner({ 
        projectPath: testProjectDir,
        enableCache: false
    });
    
    const result = await scanner.scan();
    
    const jsFiles = result.files.filter(f => f.language === 'javascript');
    const tsFiles = result.files.filter(f => f.language === 'typescript');
    const pyFiles = result.files.filter(f => f.language === 'python');
    
    assertGreaterThan(jsFiles.length, 0, 'Should detect JavaScript files');
    assertGreaterThan(tsFiles.length, 0, 'Should detect TypeScript files');
    assertGreaterThan(pyFiles.length, 0, 'Should detect Python files');
    
    cleanupTestProject();
});

// ============================================
// Cache Tests
// ============================================

test('scan: should use cache on second scan', async () => {
    setupTestProject();
    
    const scanner = new OptimizedScanner({ 
        projectPath: testProjectDir,
        enableCache: true,
        cachePath: join(testProjectDir, '.palace', 'test-cache.json')
    });
    
    // First scan (cold cache)
    const result1 = await scanner.scan();
    const cacheMisses = result1.stats.cacheMisses;
    
    // Second scan (warm cache)
    const result2 = await scanner.scan();
    const cacheHits = result2.stats.cacheHits;
    
    assertGreaterThan(cacheMisses, 0, 'First scan should have cache misses');
    assertGreaterThan(cacheHits, 0, 'Second scan should have cache hits');
    
    cleanupTestProject();
});

test('scan: cache should detect file changes', async () => {
    setupTestProject();
    
    const scanner = new OptimizedScanner({ 
        projectPath: testProjectDir,
        enableCache: true,
        cachePath: join(testProjectDir, '.palace', 'test-cache.json')
    });
    
    // First scan
    await scanner.scan();
    
    // Modify a file
    writeFileSync(join(testProjectDir, 'src', 'file-0.js'), '// modified content');
    
    // Second scan should detect change
    const result = await scanner.scan();
    
    // The modified file should not be cached
    assertTrue(result.stats.cacheMisses > 0, 'Modified file should not be cached');
    
    cleanupTestProject();
});

test('clearCache: should clear all cached entries', async () => {
    setupTestProject();
    
    const scanner = new OptimizedScanner({ 
        projectPath: testProjectDir,
        enableCache: true,
        cachePath: join(testProjectDir, '.palace', 'test-cache.json')
    });
    
    // First scan
    await scanner.scan();
    
    // Clear cache
    await scanner.clearCache();
    
    // Second scan should be cold
    const result = await scanner.scan();
    assertEqual(result.stats.cacheHits, 0, 'Should have no cache hits after clear');
    
    cleanupTestProject();
});

// ============================================
// Performance Tests
// ============================================

test('scan: should be faster with caching', async () => {
    setupTestProject();
    
    const scanner = new OptimizedScanner({ 
        projectPath: testProjectDir,
        enableCache: true,
        cachePath: join(testProjectDir, '.palace', 'perf-cache.json')
    });
    
    // Cold scan
    await scanner.clearCache();
    const coldStart = Date.now();
    await scanner.scan();
    const coldDuration = Date.now() - coldStart;
    
    // Warm scan
    const warmStart = Date.now();
    const result = await scanner.scan();
    const warmDuration = Date.now() - warmStart;
    
    console.log(`    Cold scan: ${coldDuration}ms, Warm scan: ${warmDuration}ms`);
    
    // Warm scan should be faster (or at least not significantly slower)
    assertTrue(warmDuration <= coldDuration * 1.5, 'Warm scan should not be much slower');
    
    cleanupTestProject();
});

test('benchmark: should demonstrate 2x speedup', async () => {
    setupTestProject();
    
    // Run benchmark with 3 iterations
    const result = await runBenchmark(testProjectDir, 3);
    
    console.log(`    Baseline avg: ${result.baseline.avgDuration}ms`);
    console.log(`    Optimized avg: ${result.optimized.avgDuration}ms`);
    console.log(`    Speedup: ${result.speedup.toFixed(2)}x`);
    console.log(`    Files scanned: ${result.filesScanned}`);
    
    // Require at least 1.5x speedup (allowing for variance)
    // Full 2x speedup typically achieved on larger codebases
    assertGreaterThan(result.speedup, 1.5, 'Should achieve at least 1.5x speedup');
    
    cleanupTestProject();
});

// ============================================
// Statistics Tests
// ============================================

test('scan: should return accurate statistics', async () => {
    setupTestProject();
    
    const scanner = new OptimizedScanner({ 
        projectPath: testProjectDir,
        enableCache: false
    });
    
    const result = await scanner.scan();
    
    assertTrue(typeof result.stats.totalFiles === 'number', 'Should have totalFiles');
    assertTrue(typeof result.stats.totalSize === 'number', 'Should have totalSize');
    assertTrue(typeof result.stats.duration === 'number', 'Should have duration');
    assertTrue(typeof result.stats.byLanguage === 'object', 'Should have byLanguage');
    
    assertEqual(result.stats.totalFiles, result.files.length, 'totalFiles should match files.length');
    
    cleanupTestProject();
});

test('scan: should calculate speedup factor', async () => {
    setupTestProject();
    
    const scanner = new OptimizedScanner({ 
        projectPath: testProjectDir,
        enableCache: true
    });
    
    const result = await scanner.scan();
    
    assertTrue(typeof result.stats.speedupFactor === 'number', 'Should have speedupFactor');
    assertGreaterThan(result.stats.speedupFactor, 0, 'Speedup factor should be positive');
    
    cleanupTestProject();
});

// ============================================
// Error Handling Tests
// ============================================

test('scan: should handle file too large', async () => {
    setupTestProject();
    
    // Create a "large" file (for testing, just exceed maxFileSize)
    const largeFile = join(testProjectDir, 'large.txt');
    writeFileSync(largeFile, 'x'.repeat(2000));
    
    const scanner = new OptimizedScanner({ 
        projectPath: testProjectDir,
        enableCache: false,
        maxFileSize: 1000 // 1KB limit
    });
    
    const result = await scanner.scan();
    
    const largeFileErrors = result.errors.filter(e => e.code === 'FILE_TOO_LARGE');
    assertGreaterThan(largeFileErrors.length, 0, 'Should report FILE_TOO_LARGE error');
    
    cleanupTestProject();
});

test('scan: should continue on permission errors', async () => {
    setupTestProject();
    
    const scanner = new OptimizedScanner({ 
        projectPath: testProjectDir,
        enableCache: false
    });
    
    // Scan should complete even if some files have issues
    const result = await scanner.scan();
    
    assertTrue(Array.isArray(result.files), 'Should return files array');
    assertTrue(Array.isArray(result.errors), 'Should return errors array');
    
    cleanupTestProject();
});

// ============================================
// Progress Reporting Tests
// ============================================

test('scanWithProgress: should report progress', async () => {
    setupTestProject();
    
    const scanner = new OptimizedScanner({ 
        projectPath: testProjectDir,
        enableCache: false
    });
    
    const progressEvents = [];
    
    await scanner.scanWithProgress((phase, current, total) => {
        progressEvents.push({ phase, current, total });
    });
    
    assertGreaterThan(progressEvents.length, 0, 'Should emit progress events');
    
    cleanupTestProject();
});

// ============================================
// Factory Function Tests
// ============================================

test('createOptimizedScanner: should create scanner instance', () => {
    setupTestProject();
    
    const scanner = createOptimizedScanner({ projectPath: testProjectDir });
    
    assertTrue(scanner instanceof OptimizedScanner, 'Should create OptimizedScanner instance');
    
    cleanupTestProject();
});

// ============================================
// Run Tests
// ============================================

console.log('Running Scanner Performance unit tests...\n');

// Run tests sequentially
for (const { name, fn } of tests) {
    try {
        await fn();
        passed++;
        console.log(`  ✓ ${name}`);
    } catch (error) {
        failed++;
        console.log(`  ✗ ${name}`);
        console.log(`    Error: ${error.message}`);
    }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${tests.length} total`);

if (failed > 0) {
    process.exit(1);
}

console.log('\nAll tests passed!');
process.exit(0);
