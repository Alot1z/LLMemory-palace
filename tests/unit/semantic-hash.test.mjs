/**
 * Unit tests for SemanticHash module
 * 
 * Tests cover:
 * - Hash generation and caching
 * - Hash resolution
 * - Compression/decompression
 * - Similarity finding
 * - Import/export functionality
 */

import { SemanticHash } from '../../lib/semantic-hash.js';

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

function assertContains(str, substr, msg = '') {
    if (typeof str !== 'string' || !str.includes(substr)) {
        throw new Error(`${msg} Expected "${str}" to contain "${substr}"`);
    }
}

function assertArrayLength(arr, expectedLength, msg = '') {
    if (arr.length !== expectedLength) {
        throw new Error(`${msg} Expected array length ${expectedLength}, got ${arr.length}`);
    }
}

// ============================================
// Constructor Tests
// ============================================

test('constructor: should create empty hash tables', () => {
    const hasher = new SemanticHash();
    assertTrue(hasher instanceof SemanticHash, 'Should be SemanticHash instance');
    assertEqual(hasher.size, 0, 'Should start with no hashes');
});

// ============================================
// hash Method Tests
// ============================================

test('hash: should generate 8-character uppercase hex hash', () => {
    const hasher = new SemanticHash();
    const hash = hasher.hash('UserService');
    
    assertEqual(hash.length, 8, 'Hash should be 8 characters');
    assertTrue(/^[A-F0-9]{8}$/.test(hash), 'Hash should be uppercase hex');
});

test('hash: should return same hash for same name (caching)', () => {
    const hasher = new SemanticHash();
    const hash1 = hasher.hash('UserService');
    const hash2 = hasher.hash('UserService');
    
    assertEqual(hash1, hash2, 'Same name should return same hash');
});

test('hash: should generate different hashes for different names', () => {
    const hasher = new SemanticHash();
    const hash1 = hasher.hash('UserService');
    const hash2 = hasher.hash('OrderService');
    
    assertTrue(hash1 !== hash2, 'Different names should have different hashes');
});

test('hash: should add name to hash table', () => {
    const hasher = new SemanticHash();
    hasher.hash('TestService');
    
    assertTrue(hasher.hasName('TestService'), 'Should have name in table');
    assertEqual(hasher.size, 1, 'Size should be 1');
});

// ============================================
// resolve Method Tests
// ============================================

test('resolve: should return original name for known hash', () => {
    const hasher = new SemanticHash();
    const hash = hasher.hash('MyClass');
    const resolved = hasher.resolve(hash);
    
    assertEqual(resolved, 'MyClass', 'Should resolve to original name');
});

test('resolve: should return null for unknown hash', () => {
    const hasher = new SemanticHash();
    const resolved = hasher.resolve('A1B2C3D4');
    
    assertEqual(resolved, null, 'Should return null for unknown hash');
});

test('resolve: should work after multiple hashes', () => {
    const hasher = new SemanticHash();
    const hash1 = hasher.hash('ServiceA');
    const hash2 = hasher.hash('ServiceB');
    const hash3 = hasher.hash('ServiceC');
    
    assertEqual(hasher.resolve(hash1), 'ServiceA', 'Should resolve ServiceA');
    assertEqual(hasher.resolve(hash2), 'ServiceB', 'Should resolve ServiceB');
    assertEqual(hasher.resolve(hash3), 'ServiceC', 'Should resolve ServiceC');
});

// ============================================
// compress Method Tests
// ============================================

test('compress: should replace long identifiers with hash references', () => {
    const hasher = new SemanticHash();
    const content = 'UserService.getUser()';
    const compressed = hasher.compress(content);
    
    assertContains(compressed, '#', 'Should contain hash reference');
});

test('compress: should skip short identifiers (<=3 chars)', () => {
    const hasher = new SemanticHash();
    const content = 'ABC.get()';
    const compressed = hasher.compress(content);
    
    // ABC is 3 chars, should not be replaced
    assertContains(compressed, 'ABC', 'Short identifiers should not be replaced');
});

test('compress: should handle multiple identifiers', () => {
    const hasher = new SemanticHash();
    const content = 'UserService calls OrderService and PaymentService';
    const compressed = hasher.compress(content);
    
    // All three services should be replaced
    const hashCount = (compressed.match(/#/g) || []).length;
    assertTrue(hashCount >= 3, 'Should have at least 3 hash references');
});

test('compress: should find PascalCase identifiers', () => {
    const hasher = new SemanticHash();
    const content = 'const service = new MyVeryLongClassName()';
    const compressed = hasher.compress(content);
    
    assertContains(compressed, '#', 'Should replace PascalCase identifier');
});

// ============================================
// decompress Method Tests
// ============================================

test('decompress: should restore original content', () => {
    const hasher = new SemanticHash();
    const original = 'UserService.getUser()';
    const compressed = hasher.compress(original);
    const decompressed = hasher.decompress(compressed);
    
    assertEqual(decompressed, original, 'Should restore original content');
});

test('decompress: should handle multiple hash references', () => {
    const hasher = new SemanticHash();
    const original = 'UserService and OrderService and PaymentService';
    const compressed = hasher.compress(original);
    const decompressed = hasher.decompress(compressed);
    
    assertEqual(decompressed, original, 'Should restore all services');
});

test('decompress: should leave unknown hashes as-is', () => {
    const hasher = new SemanticHash();
    const content = '#UNKNOWN1 and #UNKNOWN2';
    const decompressed = hasher.decompress(content);
    
    // Unknown hashes should remain
    assertContains(decompressed, '#UNKNOWN1', 'Unknown hash should remain');
    assertContains(decompressed, '#UNKNOWN2', 'Unknown hash should remain');
});

// ============================================
// findSimilar Method Tests
// ============================================

test('findSimilar: should find similar names by hash prefix', () => {
    const hasher = new SemanticHash();
    hasher.hash('UserService');
    hasher.hash('UserController');
    hasher.hash('OrderService');
    
    const similar = hasher.findSimilar('UserService', 2);
    
    assertTrue(Array.isArray(similar), 'Should return array');
});

test('findSimilar: should exclude the queried name', () => {
    const hasher = new SemanticHash();
    hasher.hash('UserService');
    hasher.hash('OrderService');
    
    const similar = hasher.findSimilar('UserService', 1);
    
    assertTrue(!similar.some(s => s.name === 'UserService'), 'Should not include queried name');
});

test('findSimilar: should sort by similarity', () => {
    const hasher = new SemanticHash();
    hasher.hash('UserService');
    hasher.hash('OrderService');
    hasher.hash('PaymentService');
    
    const similar = hasher.findSimilar('UserService', 1);
    
    // Should be sorted by similarity descending
    for (let i = 1; i < similar.length; i++) {
        assertTrue(similar[i - 1].similarity >= similar[i].similarity, 'Should be sorted by similarity');
    }
});

// ============================================
// hasHash and hasName Tests
// ============================================

test('hasHash: should return true for known hash', () => {
    const hasher = new SemanticHash();
    const hash = hasher.hash('TestService');
    
    assertTrue(hasher.hasHash(hash), 'Should have hash');
});

test('hasHash: should return false for unknown hash', () => {
    const hasher = new SemanticHash();
    
    assertFalse(hasher.hasHash('A1B2C3D4'), 'Should not have unknown hash');
});

test('hasName: should return true for known name', () => {
    const hasher = new SemanticHash();
    hasher.hash('TestService');
    
    assertTrue(hasher.hasName('TestService'), 'Should have name');
});

test('hasName: should return false for unknown name', () => {
    const hasher = new SemanticHash();
    
    assertFalse(hasher.hasName('UnknownService'), 'Should not have unknown name');
});

// ============================================
// Import/Export Tests
// ============================================

test('export: should export both tables', () => {
    const hasher = new SemanticHash();
    hasher.hash('ServiceA');
    hasher.hash('ServiceB');
    
    const exported = hasher.export();
    
    assertTrue(exported.hashTable !== undefined, 'Should have hashTable');
    assertTrue(exported.reverseTable !== undefined, 'Should have reverseTable');
});

test('import: should restore state from export', () => {
    const hasher1 = new SemanticHash();
    hasher1.hash('ServiceA');
    hasher1.hash('ServiceB');
    
    const exported = hasher1.export();
    
    const hasher2 = new SemanticHash();
    hasher2.import(exported);
    
    assertEqual(hasher2.resolve(hasher1.hash('ServiceA')), 'ServiceA', 'Should restore ServiceA');
    assertEqual(hasher2.resolve(hasher1.hash('ServiceB')), 'ServiceB', 'Should restore ServiceB');
});

test('import: should work with loadHashTable', () => {
    const hasher = new SemanticHash();
    const table = { 'TestService': 'ABCD1234' };
    
    hasher.loadHashTable(table);
    
    assertEqual(hasher.hash('TestService'), 'ABCD1234', 'Should use loaded hash');
    assertEqual(hasher.resolve('ABCD1234'), 'TestService', 'Should resolve loaded hash');
});

// ============================================
// Batch Operations Tests
// ============================================

test('batchHash: should hash multiple names', () => {
    const hasher = new SemanticHash();
    const names = ['ServiceA', 'ServiceB', 'ServiceC'];
    
    const results = hasher.batchHash(names);
    
    assertEqual(results.size, 3, 'Should have 3 hashes');
    assertTrue(results.has('ServiceA'), 'Should have ServiceA hash');
    assertTrue(results.has('ServiceB'), 'Should have ServiceB hash');
    assertTrue(results.has('ServiceC'), 'Should have ServiceC hash');
});

test('batchResolve: should resolve multiple hashes', () => {
    const hasher = new SemanticHash();
    const hash1 = hasher.hash('ServiceA');
    const hash2 = hasher.hash('ServiceB');
    
    const results = hasher.batchResolve([hash1, hash2, 'UNKNOWN99']);
    
    assertEqual(results.size, 3, 'Should have 3 results');
    assertEqual(results.get(hash1), 'ServiceA', 'Should resolve ServiceA');
    assertEqual(results.get(hash2), 'ServiceB', 'Should resolve ServiceB');
    assertEqual(results.get('UNKNOWN99'), null, 'Should return null for unknown');
});

// ============================================
// clear Method Tests
// ============================================

test('clear: should remove all entries', () => {
    const hasher = new SemanticHash();
    hasher.hash('ServiceA');
    hasher.hash('ServiceB');
    
    hasher.clear();
    
    assertEqual(hasher.size, 0, 'Size should be 0');
    assertFalse(hasher.hasName('ServiceA'), 'Should not have ServiceA');
    assertFalse(hasher.hasName('ServiceB'), 'Should not have ServiceB');
});

// ============================================
// Run Tests
// ============================================

console.log('Running SemanticHash unit tests...\n');

for (const { name, fn } of tests) {
    try {
        fn();
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
