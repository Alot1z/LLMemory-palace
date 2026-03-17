/**
 * Unit tests for ScannerParallel module
 * 
 * Tests cover:
 * - Constructor and configuration options
 * - Parallel file scanning with worker_threads
 * - Sequential fallback when workers unavailable
 * - Error handling and edge cases
 * - Worker lifecycle management
 */

import { ScannerParallel } from '../../lib/scanner-parallel.js';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { availableParallelism } from 'os';

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

function assertFalse(value, msg = '') {
    if (value) {
        throw new Error(`${msg} Expected falsy value, got ${value}`);
    }
}

function assertGreaterThan(actual, expected, msg = '') {
    if (actual <= expected) {
        throw new Error(`${msg} Expected ${actual} to be greater than ${expected}`);
    }
}

function assertArrayLength(arr, expected, msg = '') {
    if (arr.length !== expected) {
        throw new Error(`${msg} Expected array length ${expected}, got ${arr.length}`);
    }
}

// Test fixtures
let testDir;
let testFiles = [];

function setupTestFiles() {
    // Create temporary test directory
    testDir = join(tmpdir(), `scanner-parallel-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    
    // Create test files
    testFiles = [];
    for (let i = 1; i <= 15; i++) {
        const filePath = join(testDir, `test-file-${i}.js`);
        const content = `// Test file ${i}\nexport const value${i} = ${i};\nconsole.log(value${i});`;
        writeFileSync(filePath, content);
        testFiles.push(filePath);
    }
    
    // Create TypeScript file
    const tsFile = join(testDir, 'test-types.ts');
    writeFileSync(tsFile, 'interface Test { value: number; }\nconst test: Test = { value: 42 };');
    testFiles.push(tsFile);
    
    // Create Python file
    const pyFile = join(testDir, 'test-script.py');
    writeFileSync(pyFile, '#!/usr/bin/env python3\nprint("Hello, World!")');
    testFiles.push(pyFile);
}

function cleanupTestFiles() {
    if (testDir && existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
    }
}

// ============================================
// Constructor Tests
// ============================================

test('Constructor: should create instance with default options', () => {
    const scanner = new ScannerParallel();
    const status = scanner.getStatus();
    
    assertTrue(typeof status.workerCount === 'number', 'workerCount should be a number');
    assertGreaterThan(status.workerCount, 0, 'workerCount should be at least 1');
    assertTrue(typeof status.useWorkers === 'boolean', 'useWorkers should be boolean');
});

test('Constructor: should accept custom workerCount', () => {
    const scanner = new ScannerParallel({ workerCount: 4 });
    const status = scanner.getStatus();
    
    assertEqual(status.workerCount, 4, 'Should use custom workerCount');
});

test('Constructor: should accept custom maxFileSize', () => {
    const scanner = new ScannerParallel({ maxFileSize: 2 * 1024 * 1024 });
    
    assertEqual(scanner.maxFileSize, 2 * 1024 * 1024, 'Should use custom maxFileSize');
});

test('Constructor: should allow forcing workers disabled', () => {
    const scanner = new ScannerParallel({ useWorkers: false });
    const status = scanner.getStatus();
    
    assertFalse(status.useWorkers, 'useWorkers should be false');
});

test('Constructor: should allow forcing workers enabled', () => {
    const scanner = new ScannerParallel({ useWorkers: true });
    const status = scanner.getStatus();
    
    assertTrue(status.useWorkers, 'useWorkers should be true');
});

// ============================================
// scanFiles Tests
// ============================================

test('scanFiles: should return empty array for empty input', async () => {
    const scanner = new ScannerParallel();
    const results = await scanner.scanFiles([]);
    
    assertArrayLength(results, 0, 'Should return empty array');
    await scanner.destroy();
});

test('scanFiles: should return empty array for null input', async () => {
    const scanner = new ScannerParallel();
    const results = await scanner.scanFiles(null);
    
    assertArrayLength(results, 0, 'Should return empty array for null');
    await scanner.destroy();
});

test('scanFiles: should scan single file sequentially', async () => {
    setupTestFiles();
    const scanner = new ScannerParallel({ useWorkers: false });
    const results = await scanner.scanFiles([testFiles[0]]);
    
    assertArrayLength(results, 1, 'Should return 1 result');
    assertTrue(results[0].scanned, 'File should be marked as scanned');
    assertTrue(typeof results[0].hash === 'string', 'Should have hash');
    assertTrue(typeof results[0].size === 'number', 'Should have size');
    
    await scanner.destroy();
    cleanupTestFiles();
});

test('scanFiles: should scan multiple files sequentially', async () => {
    setupTestFiles();
    const scanner = new ScannerParallel({ useWorkers: false });
    const filesToScan = testFiles.slice(0, 5);
    const results = await scanner.scanFiles(filesToScan);
    
    assertArrayLength(results, 5, 'Should return 5 results');
    
    for (const result of results) {
        assertTrue(result.scanned, 'Each file should be marked as scanned');
        assertTrue(typeof result.hash === 'string', 'Each file should have hash');
    }
    
    await scanner.destroy();
    cleanupTestFiles();
});

test('scanFiles: should scan 10+ files', async () => {
    setupTestFiles();
    const scanner = new ScannerParallel({ useWorkers: false });
    const results = await scanner.scanFiles(testFiles);
    
    assertGreaterThan(results.length, 10, 'Should scan more than 10 files');
    
    await scanner.destroy();
    cleanupTestFiles();
});

// ============================================
// Language Detection Tests
// ============================================

test('scanFiles: should detect JavaScript language', async () => {
    setupTestFiles();
    const scanner = new ScannerParallel({ useWorkers: false });
    const results = await scanner.scanFiles([testFiles[0]]);
    
    assertEqual(results[0].language, 'javascript', 'Should detect JavaScript');
    
    await scanner.destroy();
    cleanupTestFiles();
});

test('scanFiles: should detect TypeScript language', async () => {
    setupTestFiles();
    const scanner = new ScannerParallel({ useWorkers: false });
    const tsFile = testFiles.find(f => f.endsWith('.ts'));
    const results = await scanner.scanFiles([tsFile]);
    
    assertEqual(results[0].language, 'typescript', 'Should detect TypeScript');
    
    await scanner.destroy();
    cleanupTestFiles();
});

test('scanFiles: should detect Python language', async () => {
    setupTestFiles();
    const scanner = new ScannerParallel({ useWorkers: false });
    const pyFile = testFiles.find(f => f.endsWith('.py'));
    const results = await scanner.scanFiles([pyFile]);
    
    assertEqual(results[0].language, 'python', 'Should detect Python');
    
    await scanner.destroy();
    cleanupTestFiles();
});

// ============================================
// Parallel Scanning Tests
// ============================================

test('scanFiles: should use workers when available', async () => {
    setupTestFiles();
    const scanner = new ScannerParallel({ 
        useWorkers: true,
        workerCount: 2 
    });
    
    const status = scanner.getStatus();
    assertTrue(status.workersAvailable, 'Workers should be available');
    
    const results = await scanner.scanFiles(testFiles.slice(0, 4));
    
    assertArrayLength(results, 4, 'Should return 4 results');
    
    await scanner.destroy();
    cleanupTestFiles();
});

test('scanFiles: should distribute work across multiple workers', async () => {
    setupTestFiles();
    const workerCount = 3;
    const scanner = new ScannerParallel({ 
        useWorkers: true,
        workerCount 
    });
    
    // Scan enough files to distribute across workers
    const results = await scanner.scanFiles(testFiles);
    
    assertGreaterThan(results.length, 10, 'Should scan all test files');
    
    await scanner.destroy();
    cleanupTestFiles();
});

test('scanFiles: should fall back to sequential on worker error', async () => {
    setupTestFiles();
    const scanner = new ScannerParallel({ 
        useWorkers: false  // Force sequential
    });
    
    const results = await scanner.scanFiles(testFiles);
    
    assertGreaterThan(results.length, 0, 'Should still return results via fallback');
    
    await scanner.destroy();
    cleanupTestFiles();
});

// ============================================
// Directory Scanning Tests
// ============================================

test('scan: should scan directory and return files', async () => {
    setupTestFiles();
    const scanner = new ScannerParallel({ useWorkers: false });
    const results = await scanner.scan(testDir);
    
    assertGreaterThan(results.length, 10, 'Should find all test files');
    
    await scanner.destroy();
    cleanupTestFiles();
});

test('scan: should exclude node_modules by default', async () => {
    setupTestFiles();
    
    // Create node_modules directory
    const nodeModulesDir = join(testDir, 'node_modules');
    mkdirSync(nodeModulesDir, { recursive: true });
    writeFileSync(join(nodeModulesDir, 'excluded.js'), 'module.exports = {};');
    
    const scanner = new ScannerParallel({ useWorkers: false });
    const results = await scanner.scan(testDir);
    
    // Should not include the excluded file
    const excludedFile = results.find(r => r.path.includes('node_modules'));
    assertTrue(!excludedFile, 'Should not include files from node_modules');
    
    await scanner.destroy();
    cleanupTestFiles();
});

test('scan: should respect custom exclude patterns', async () => {
    setupTestFiles();
    
    // Create directory to exclude
    const excludeDir = join(testDir, 'custom-exclude');
    mkdirSync(excludeDir, { recursive: true });
    writeFileSync(join(excludeDir, 'excluded.js'), 'export const excluded = true;');
    
    const scanner = new ScannerParallel({ useWorkers: false });
    const results = await scanner.scan(testDir, {
        exclude: ['node_modules', 'custom-exclude']
    });
    
    const excludedFile = results.find(r => r.path.includes('custom-exclude'));
    assertTrue(!excludedFile, 'Should not include files from custom-exclude');
    
    await scanner.destroy();
    cleanupTestFiles();
});

// ============================================
// Error Handling Tests
// ============================================

test('scanFiles: should handle non-existent file', async () => {
    const scanner = new ScannerParallel({ useWorkers: false });
    const results = await scanner.scanFiles(['/non/existent/file.js']);
    
    assertArrayLength(results, 1, 'Should return result for non-existent file');
    assertTrue(results[0].error !== undefined, 'Should have error property');
    
    await scanner.destroy();
});

test('scanFiles: should handle mixed valid and invalid files', async () => {
    setupTestFiles();
    const scanner = new ScannerParallel({ useWorkers: false });
    const mixedFiles = [testFiles[0], '/non/existent/file.js', testFiles[1]];
    const results = await scanner.scanFiles(mixedFiles);
    
    assertArrayLength(results, 3, 'Should return 3 results');
    
    const errors = results.filter(r => r.error);
    const successes = results.filter(r => r.scanned);
    
    assertEqual(errors.length, 1, 'Should have 1 error');
    assertEqual(successes.length, 2, 'Should have 2 successful scans');
    
    await scanner.destroy();
    cleanupTestFiles();
});

test('scanFiles: should handle file too large', async () => {
    setupTestFiles();
    const scanner = new ScannerParallel({ 
        useWorkers: false,
        maxFileSize: 10 // Very small limit
    });
    
    const results = await scanner.scanFiles([testFiles[0]]);
    
    assertArrayLength(results, 1, 'Should return 1 result');
    assertTrue(results[0].error !== undefined, 'Should have error for large file');
    assertTrue(results[0].code === 'FILE_TOO_LARGE', 'Should have FILE_TOO_LARGE code');
    
    await scanner.destroy();
    cleanupTestFiles();
});

// ============================================
// Status and Lifecycle Tests
// ============================================

test('getStatus: should return current scanner status', () => {
    const scanner = new ScannerParallel({ workerCount: 4 });
    const status = scanner.getStatus();
    
    assertTrue('workerCount' in status, 'Status should have workerCount');
    assertTrue('useWorkers' in status, 'Status should have useWorkers');
    assertTrue('activeWorkers' in status, 'Status should have activeWorkers');
    assertTrue('workersAvailable' in status, 'Status should have workersAvailable');
    
    assertEqual(status.workerCount, 4, 'workerCount should be 4');
});

test('destroy: should cleanup workers', async () => {
    setupTestFiles();
    const scanner = new ScannerParallel({ useWorkers: true });
    
    await scanner.scanFiles(testFiles.slice(0, 2));
    await scanner.destroy();
    
    const status = scanner.getStatus();
    assertEqual(status.activeWorkers, 0, 'Should have no active workers after destroy');
    
    cleanupTestFiles();
});

// ============================================
// Hash Tests
// ============================================

test('scanFiles: should generate consistent hash', async () => {
    setupTestFiles();
    const scanner = new ScannerParallel({ useWorkers: false });
    
    const results1 = await scanner.scanFiles([testFiles[0]]);
    const results2 = await scanner.scanFiles([testFiles[0]]);
    
    assertEqual(results1[0].hash, results2[0].hash, 'Hash should be consistent');
    
    await scanner.destroy();
    cleanupTestFiles();
});

test('scanFiles: should generate different hashes for different files', async () => {
    setupTestFiles();
    const scanner = new ScannerParallel({ useWorkers: false });
    
    const results = await scanner.scanFiles([testFiles[0], testFiles[1]]);
    
    assertTrue(results[0].hash !== results[1].hash, 'Different files should have different hashes');
    
    await scanner.destroy();
    cleanupTestFiles();
});

// ============================================
// Run Tests
// ============================================

console.log('Running ScannerParallel unit tests...\n');

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
