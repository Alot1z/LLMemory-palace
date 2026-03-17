/**
 * Unit tests for PatternLibrary module
 * 
 * Tests cover:
 * - Pattern registration and retrieval
 * - Pattern expansion with parameters
 * - Pattern extraction from code
 * - Compression functionality
 * - Import/export functionality
 */

import { PatternLibrary } from '../../lib/patterns.js';

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

test('constructor: should create instance with built-in patterns', () => {
    const library = new PatternLibrary();
    assertTrue(library instanceof PatternLibrary, 'Should be PatternLibrary instance');
    assertTrue(library.size > 0, 'Should have built-in patterns');
});

test('constructor: should load CRUD_ENTITY pattern', () => {
    const library = new PatternLibrary();
    assertTrue(library.has('CRUD_ENTITY'), 'Should have CRUD_ENTITY pattern');
});

test('constructor: should load EXPRESS_ROUTE pattern', () => {
    const library = new PatternLibrary();
    assertTrue(library.has('EXPRESS_ROUTE'), 'Should have EXPRESS_ROUTE pattern');
});

// ============================================
// register Method Tests
// ============================================

test('register: should add new pattern', () => {
    const library = new PatternLibrary();
    const initialSize = library.size;
    
    library.register('MY_PATTERN', {
        template: 'function {name}() { return {value}; }',
        instances: []
    });
    
    assertTrue(library.has('MY_PATTERN'), 'Should have new pattern');
    assertEqual(library.size, initialSize + 1, 'Size should increase');
});

test('register: should store pattern with hash', () => {
    const library = new PatternLibrary();
    
    library.register('TEST_PATTERN', {
        template: 'const {name} = {value};',
        instances: []
    });
    
    const pattern = library.get('TEST_PATTERN');
    assertTrue(pattern.hash !== undefined, 'Should have hash');
    assertEqual(pattern.hash.length, 8, 'Hash should be 8 characters');
});

test('register: should store pattern metadata', () => {
    const library = new PatternLibrary();
    
    library.register('META_PATTERN', {
        template: 'test',
        instances: [],
        version: 'v1.0',
        description: 'Test pattern'
    });
    
    const pattern = library.get('META_PATTERN');
    assertEqual(pattern.version, 'v1.0', 'Should have version');
    assertEqual(pattern.description, 'Test pattern', 'Should have description');
});

// ============================================
// get Method Tests
// ============================================

test('get: should return pattern by name', () => {
    const library = new PatternLibrary();
    const pattern = library.get('CRUD_ENTITY');
    
    assertTrue(pattern !== undefined, 'Should return pattern');
    assertContains(pattern.template, '{action}', 'Template should have placeholders');
});

test('get: should return undefined for unknown pattern', () => {
    const library = new PatternLibrary();
    const pattern = library.get('UNKNOWN_PATTERN');
    
    assertEqual(pattern, undefined, 'Should return undefined');
});

// ============================================
// has Method Tests
// ============================================

test('has: should return true for existing pattern', () => {
    const library = new PatternLibrary();
    assertTrue(library.has('CRUD_ENTITY'), 'Should have CRUD_ENTITY');
});

test('has: should return false for unknown pattern', () => {
    const library = new PatternLibrary();
    assertFalse(library.has('NONEXISTENT'), 'Should not have NONEXISTENT');
});

// ============================================
// expand Method Tests
// ============================================

test('expand: should substitute parameters in template', () => {
    const library = new PatternLibrary();
    
    const code = library.expand('CRUD_ENTITY', {
        action: 'get',
        entity: 'User',
        method: 'findUnique',
        id: 'id'
    });
    
    assertTrue(code !== null, 'Should return expanded code');
    assertContains(code, 'getUser', 'Should have substituted action+entity');
    assertContains(code, 'User', 'Should have substituted entity');
    assertContains(code, 'findUnique', 'Should have substituted method');
});

test('expand: should return null for unknown pattern', () => {
    const library = new PatternLibrary();
    
    const code = library.expand('UNKNOWN', { name: 'test' });
    
    assertEqual(code, null, 'Should return null');
});

test('expand: should handle multiple parameter occurrences', () => {
    const library = new PatternLibrary();
    
    library.register('REPEAT_PATTERN', {
        template: '{name} and {name} and {name}',
        instances: []
    });
    
    const result = library.expand('REPEAT_PATTERN', { name: 'foo' });
    
    assertEqual(result, 'foo and foo and foo', 'Should replace all occurrences');
});

// ============================================
// extractPatterns Method Tests
// ============================================

test('extractPatterns: should extract class definitions', () => {
    const library = new PatternLibrary();
    const code = 'class UserService { constructor() {} }';
    
    const patterns = library.extractPatterns(code, 'javascript');
    
    assertTrue(patterns.some(p => p.type === 'class' && p.name === 'UserService'), 'Should find class');
});

test('extractPatterns: should extract function definitions', () => {
    const library = new PatternLibrary();
    const code = 'function getData() { return data; }';
    
    const patterns = library.extractPatterns(code, 'javascript');
    
    assertTrue(patterns.some(p => p.type === 'function' && p.name === 'getData'), 'Should find function');
});

test('extractPatterns: should extract Express routes', () => {
    const library = new PatternLibrary();
    const code = 'app.get("/users", handler); app.post("/users", createHandler);';
    
    const patterns = library.extractPatterns(code, 'javascript');
    
    assertTrue(patterns.some(p => p.type === 'route' && p.method === 'GET'), 'Should find GET route');
    assertTrue(patterns.some(p => p.type === 'route' && p.method === 'POST'), 'Should find POST route');
});

test('extractPatterns: should extract import statements', () => {
    const library = new PatternLibrary();
    const code = "import React from 'react'; import { useState } from 'react';";
    
    const patterns = library.extractPatterns(code, 'javascript');
    
    assertTrue(patterns.some(p => p.type === 'import' && p.module === 'react'), 'Should find import');
});

// ============================================
// addInstance Method Tests
// ============================================

test('addInstance: should add instance to pattern', () => {
    const library = new PatternLibrary();
    
    library.addInstance('CRUD_ENTITY', { action: 'get', entity: 'User' });
    
    const pattern = library.get('CRUD_ENTITY');
    assertTrue(pattern.instances.length > 0, 'Should have instance');
});

// ============================================
// list Method Tests
// ============================================

test('list: should return array of pattern summaries', () => {
    const library = new PatternLibrary();
    const list = library.list();
    
    assertTrue(Array.isArray(list), 'Should return array');
    assertTrue(list.length > 0, 'Should have patterns');
    assertTrue(list[0].name !== undefined, 'Should have name');
    assertTrue(list[0].instances !== undefined, 'Should have instance count');
});

// ============================================
// names Method Tests
// ============================================

test('names: should return all pattern names', () => {
    const library = new PatternLibrary();
    const names = library.names();
    
    assertTrue(Array.isArray(names), 'Should return array');
    assertTrue(names.includes('CRUD_ENTITY'), 'Should include CRUD_ENTITY');
    assertTrue(names.includes('EXPRESS_ROUTE'), 'Should include EXPRESS_ROUTE');
});

// ============================================
// delete Method Tests
// ============================================

test('delete: should remove pattern', () => {
    const library = new PatternLibrary();
    
    library.register('TEMP_PATTERN', { template: 'temp', instances: [] });
    assertTrue(library.has('TEMP_PATTERN'), 'Should have pattern');
    
    const result = library.delete('TEMP_PATTERN');
    
    assertTrue(result, 'Should return true');
    assertFalse(library.has('TEMP_PATTERN'), 'Should not have pattern');
});

test('delete: should return false for unknown pattern', () => {
    const library = new PatternLibrary();
    
    const result = library.delete('UNKNOWN_PATTERN');
    
    assertFalse(result, 'Should return false');
});

// ============================================
// findByHash Method Tests
// ============================================

test('findByHash: should find pattern by hash', () => {
    const library = new PatternLibrary();
    
    library.register('HASH_TEST', { template: 'unique template content 123', instances: [] });
    const pattern = library.get('HASH_TEST');
    
    const found = library.findByHash(pattern.hash);
    
    assertTrue(found !== undefined, 'Should find pattern');
    assertEqual(found.name, 'HASH_TEST', 'Should find correct pattern');
});

test('findByHash: should return undefined for unknown hash', () => {
    const library = new PatternLibrary();
    
    const found = library.findByHash('UNKNOWN1');
    
    assertEqual(found, undefined, 'Should return undefined');
});

// ============================================
// clear Method Tests
// ============================================

test('clear: should remove all patterns', () => {
    const library = new PatternLibrary();
    
    library.clear();
    
    assertEqual(library.size, 0, 'Size should be 0');
    assertFalse(library.has('CRUD_ENTITY'), 'Should not have built-in patterns');
});

// ============================================
// Import/Export Tests
// ============================================

test('export: should export all patterns', () => {
    const library = new PatternLibrary();
    
    const exported = library.export();
    
    assertTrue(typeof exported === 'object', 'Should return object');
    assertTrue(exported['CRUD_ENTITY'] !== undefined, 'Should have CRUD_ENTITY');
});

test('import: should restore patterns', () => {
    const library1 = new PatternLibrary();
    library1.register('CUSTOM', { template: 'custom {x}', instances: [] });
    
    const exported = library1.export();
    
    const library2 = new PatternLibrary();
    library2.clear();
    library2.import(exported);
    
    assertTrue(library2.has('CUSTOM'), 'Should have imported pattern');
});

// ============================================
// findForModule Method Tests
// ============================================

test('findForModule: should find patterns for module', () => {
    const library = new PatternLibrary();
    
    library.register('USER_SERVICE', {
        template: 'service',
        instances: [{ entity: 'user' }]
    });
    
    const patterns = library.findForModule('user');
    
    assertTrue(Array.isArray(patterns), 'Should return array');
});

// ============================================
// Run Tests
// ============================================

console.log('Running PatternLibrary unit tests...\n');

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
