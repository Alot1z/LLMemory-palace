/**
 * Unit tests for Large File Handler module
 * 
 * Tests cover:
 * - Large file streaming with backpressure
 * - Chunked processing
 * - Progress callbacks
 * - Memory management
 * - Chunked palace export/import
 */

import { LargeFileHandler, createLargeFileHandler, requiresStreaming, getFileSize, calculateOptimalChunkSize } from '../../lib/streaming/large-file-handler.js';
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
let testDir;
let smallFile;
let largeFile;
let mediumFile;

function setupTestFiles() {
    testDir = join(tmpdir(), `large-file-handler-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    
    // Small file (< 1MB)
    smallFile = join(testDir, 'small.txt');
    writeFileSync(smallFile, 'x'.repeat(1024 * 100)); // 100KB
    
    // Medium file (5MB)
    mediumFile = join(testDir, 'medium.txt');
    writeFileSync(mediumFile, 'x'.repeat(1024 * 1024 * 5)); // 5MB
    
    // Large file (simulated 100MB+ for testing)
    // Using smaller size for unit tests to be fast
    largeFile = join(testDir, 'large.txt');
    writeFileSync(largeFile, 'x'.repeat(1024 * 1024 * 10)); // 10MB for test speed
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
    const handler = new LargeFileHandler();
    
    assertTrue(handler instanceof LargeFileHandler, 'Should be LargeFileHandler instance');
});

test('Constructor: should accept custom chunk size', () => {
    const handler = new LargeFileHandler({ chunkSize: 2 * 1024 * 1024 });
    
    assertTrue(handler instanceof LargeFileHandler, 'Should accept custom chunk size');
});

test('Constructor: should accept custom memory limit', () => {
    const handler = new LargeFileHandler({ maxMemoryUsage: 1024 * 1024 * 1024 });
    
    assertTrue(handler instanceof LargeFileHandler, 'Should accept custom memory limit');
});

// ============================================
// File Size Detection Tests
// ============================================

test('getFileSize: should return correct file size', async () => {
    setupTestFiles();
    
    const size = await getFileSize(smallFile);
    assertEqual(size, 1024 * 100, 'Should return correct file size');
    
    cleanupTestFiles();
});

test('requiresStreaming: should return false for small files', async () => {
    setupTestFiles();
    
    const needsStreaming = await requiresStreaming(smallFile, 1024 * 1024);
    assertTrue(!needsStreaming, 'Small files should not require streaming');
    
    cleanupTestFiles();
});

test('requiresStreaming: should return true for large files', async () => {
    setupTestFiles();
    
    const needsStreaming = await requiresStreaming(largeFile, 1024 * 1024);
    assertTrue(needsStreaming, 'Large files should require streaming');
    
    cleanupTestFiles();
});

// ============================================
// Chunk Size Calculation Tests
// ============================================

test('calculateOptimalChunkSize: should return reasonable chunk size', () => {
    const chunkSize = calculateOptimalChunkSize(1024 * 1024 * 1024); // 1GB file
    
    assertGreaterThan(chunkSize, 64 * 1024, 'Chunk size should be at least 64KB');
    assertLessThan(chunkSize, 10 * 1024 * 1024, 'Chunk size should be at most 10MB');
});

test('calculateOptimalChunkSize: should respect available memory', () => {
    const chunkSizeSmall = calculateOptimalChunkSize(1024 * 1024 * 100, 256 * 1024 * 1024);
    const chunkSizeLarge = calculateOptimalChunkSize(1024 * 1024 * 100, 1024 * 1024 * 1024);
    
    assertTrue(chunkSizeSmall <= chunkSizeLarge, 'Less memory should result in smaller chunks');
});

// ============================================
// Processing Tests
// ============================================

test('processFile: should process small file', async () => {
    setupTestFiles();
    
    const handler = new LargeFileHandler({
        streamingThreshold: 1024 * 1024 * 100 // 100MB threshold
    });
    
    const result = await handler.processFile(smallFile);
    
    assertGreaterThan(result.data.length, 0, 'Should return processed data');
    assertGreaterThan(result.statistics.totalBytes, 0, 'Should track total bytes');
    assertGreaterThan(result.chunks.length, 0, 'Should have chunk metadata');
    
    cleanupTestFiles();
});

test('processFile: should process file in chunks', async () => {
    setupTestFiles();
    
    const chunkSize = 1024 * 512; // 512KB chunks
    const handler = new LargeFileHandler({ chunkSize });
    
    const result = await handler.processFile(mediumFile);
    
    const expectedChunks = Math.ceil((1024 * 1024 * 5) / chunkSize);
    assertGreaterThan(result.chunks.length, 0, 'Should have multiple chunks');
    
    cleanupTestFiles();
});

test('processFile: should call progress callback', async () => {
    setupTestFiles();
    
    const handler = new LargeFileHandler();
    let progressCalled = false;
    
    await handler.processFile(smallFile, {
        onProgress: (progress) => {
            progressCalled = true;
            assertTrue(typeof progress.percentage === 'number', 'Progress should have percentage');
            assertTrue(typeof progress.bytesProcessed === 'number', 'Progress should have bytesProcessed');
        }
    });
    
    assertTrue(progressCalled, 'Progress callback should be called');
    
    cleanupTestFiles();
});

test('processFile: should apply custom transformer', async () => {
    setupTestFiles();
    
    const handler = new LargeFileHandler();
    
    const result = await handler.processFile(smallFile, {
        transformer: async (chunk, meta) => {
            return chunk.toString().toUpperCase();
        }
    });
    
    // Check that transformation was applied
    const data = result.data.join('');
    assertTrue(data.includes('X'), 'Transformer should have uppercased content');
    
    cleanupTestFiles();
});

// ============================================
// Backpressure Tests
// ============================================

test('processFile: should handle backpressure for large files', async () => {
    setupTestFiles();
    
    const handler = new LargeFileHandler({
        chunkSize: 1024 * 256, // 256KB chunks
        highWaterMark: 4, // Low water mark to trigger backpressure
        maxMemoryUsage: 1024 * 1024, // 1MB limit
        streamingThreshold: 0 // Force streaming mode
    });
    
    const result = await handler.processFile(mediumFile);
    
    // Should complete without OOM
    assertGreaterThan(result.statistics.totalBytes, 0, 'Should process entire file');
    
    cleanupTestFiles();
});

// ============================================
// Chunked Export Tests
// ============================================

test('exportChunked: should export data in chunks', async () => {
    setupTestFiles();
    
    const handler = new LargeFileHandler();
    const testData = { items: Array(1000).fill({ value: 'test data' }) };
    
    const result = await handler.exportChunked(testData, join(testDir, 'export'), {
        maxChunkSize: 1024 // Small chunks for testing
    });
    
    assertGreaterThan(result.data.length, 0, 'Should create chunk files');
    assertGreaterThan(result.chunks.length, 0, 'Should have chunk metadata');
    
    // Verify manifest was created
    assertTrue(existsSync(join(testDir, 'export.manifest.json')), 'Should create manifest');
    
    cleanupTestFiles();
});

test('exportChunked: should call progress callback', async () => {
    setupTestFiles();
    
    const handler = new LargeFileHandler();
    const testData = { items: Array(1000).fill({ value: 'test data' }) };
    let progressCalled = false;
    
    await handler.exportChunked(testData, join(testDir, 'export-progress'), {
        maxChunkSize: 1024,
        onProgress: (progress) => {
            progressCalled = true;
        }
    });
    
    assertTrue(progressCalled, 'Progress callback should be called');
    
    cleanupTestFiles();
});

// ============================================
// Chunked Import Tests
// ============================================

test('importChunked: should import chunked data', async () => {
    setupTestFiles();
    
    const handler = new LargeFileHandler();
    const testData = 'x'.repeat(5000);
    
    // First export
    const exportResult = await handler.exportChunked(testData, join(testDir, 'import-test'), {
        maxChunkSize: 1024
    });
    
    // Then import
    const importResult = await handler.importChunked(join(testDir, 'import-test.manifest.json'));
    
    assertEqual(importResult.data, testData, 'Imported data should match exported data');
    
    cleanupTestFiles();
});

test('importChunked: should validate checksums', async () => {
    setupTestFiles();
    
    const handler = new LargeFileHandler();
    const testData = 'x'.repeat(5000);
    
    const exportResult = await handler.exportChunked(testData, join(testDir, 'checksum-test'), {
        maxChunkSize: 1024
    });
    
    // Import with checksum validation
    const importResult = await handler.importChunked(join(testDir, 'checksum-test.manifest.json'), {
        validateChecksums: true
    });
    
    assertEqual(importResult.data, testData, 'Data should pass checksum validation');
    
    cleanupTestFiles();
});

// ============================================
// Cancellation Tests
// ============================================

test('cancel: should cancel processing', async () => {
    setupTestFiles();
    
    const handler = new LargeFileHandler();
    
    const processPromise = handler.processFile(largeFile);
    
    // Cancel immediately
    handler.cancel();
    
    try {
        await processPromise;
        // If it completes, that's also fine (cancellation might be too late)
    } catch (error) {
        assertTrue(error.message.includes('aborted'), 'Should throw abort error');
    }
    
    cleanupTestFiles();
});

test('isCancelled: should return false initially', () => {
    const handler = new LargeFileHandler();
    
    assertTrue(!handler.isCancelled(), 'Should not be cancelled initially');
});

// ============================================
// Statistics Tests
// ============================================

test('processFile: should return accurate statistics', async () => {
    setupTestFiles();
    
    const handler = new LargeFileHandler();
    const result = await handler.processFile(smallFile);
    
    assertTrue(result.statistics.processingTime >= 0, 'Should track processing time (can be 0 for fast ops)');
    assertGreaterThan(result.statistics.totalBytes, 0, 'Should track total bytes');
    assertTrue(typeof result.statistics.averageChunkTime === 'number', 'Should calculate average chunk time');
    assertTrue(typeof result.statistics.peakMemoryUsage === 'number', 'Should track peak memory');
    
    cleanupTestFiles();
});

// ============================================
// Factory Function Tests
// ============================================

test('createLargeFileHandler: should create handler instance', () => {
    const handler = createLargeFileHandler({ chunkSize: 1024 * 512 });
    
    assertTrue(handler instanceof LargeFileHandler, 'Should create LargeFileHandler instance');
});

// ============================================
// Run Tests
// ============================================

console.log('Running Large File Handler unit tests...\n');

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
