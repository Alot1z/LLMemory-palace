/**
 * Unit tests for RefreshAnalyzer module
 * 
 * Tests cover:
 * - ES6 import parsing (import, import default, import namespace)
 * - CommonJS require parsing
 * - Export from parsing
 * - Dependency resolution
 * - Ripple effect computation
 * - findRelated method
 */

import { RefreshAnalyzer } from '../../lib/refresh-analyzer.js';

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

function assertContains(arr, item, msg = '') {
    if (!arr.includes(item)) {
        throw new Error(`${msg} Expected array to contain "${item}"`);
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

test('constructor: should create instance with default options', () => {
    const analyzer = new RefreshAnalyzer();
    assertTrue(analyzer instanceof RefreshAnalyzer, 'Should be RefreshAnalyzer instance');
    assertTrue(analyzer.fileGraph instanceof Map, 'Should have fileGraph Map');
    assertTrue(analyzer.reverseDependencies instanceof Map, 'Should have reverseDependencies Map');
});

test('constructor: should accept custom options', () => {
    const analyzer = new RefreshAnalyzer({
        projectRoot: '/custom/root',
        extensions: ['.js', '.ts'],
        maxDepth: 5,
    });
    assertEqual(analyzer.options.projectRoot, '/custom/root', 'Should use custom projectRoot');
    assertEqual(analyzer.options.extensions, ['.js', '.ts'], 'Should use custom extensions');
    assertEqual(analyzer.options.maxDepth, 5, 'Should use custom maxDepth');
});

test('constructor: should initialize from fileCache', () => {
    const fileCache = new Map([
        ['/src/a.js', { path: '/src/a.js', imports: [], exports: [], dependencies: ['/src/b.js'], dependents: [] }],
        ['/src/b.js', { path: '/src/b.js', imports: [], exports: [], dependencies: [], dependents: [] }],
    ]);
    
    const analyzer = new RefreshAnalyzer({ fileCache });
    assertEqual(analyzer.fileGraph.size, 2, 'Should have 2 files in cache');
});

// ============================================
// Import Parsing Tests - ES6 Imports
// ============================================

test('extractImports: should parse default import', () => {
    const analyzer = new RefreshAnalyzer();
    const content = `import React from 'react';`;
    const imports = analyzer.extractImports(content);
    
    assertArrayLength(imports, 1, 'Should find 1 import');
    assertEqual(imports[0].source, 'react', 'Source should be react');
    assertEqual(imports[0].isDefault, true, 'Should be default import');
    assertContains(imports[0].specifiers, 'React', 'Should have React specifier');
});

test('extractImports: should parse named imports', () => {
    const analyzer = new RefreshAnalyzer();
    const content = `import { useState, useEffect } from 'react';`;
    const imports = analyzer.extractImports(content);
    
    assertArrayLength(imports, 1, 'Should find 1 import');
    assertEqual(imports[0].source, 'react', 'Source should be react');
    assertEqual(imports[0].isDefault, false, 'Should not be default import');
    assertContains(imports[0].specifiers, 'useState', 'Should have useState specifier');
    assertContains(imports[0].specifiers, 'useEffect', 'Should have useEffect specifier');
});

test('extractImports: should parse namespace import', () => {
    const analyzer = new RefreshAnalyzer();
    const content = `import * as utils from './utils';`;
    const imports = analyzer.extractImports(content);
    
    assertArrayLength(imports, 1, 'Should find 1 import');
    assertEqual(imports[0].source, './utils', 'Source should be ./utils');
    assertEqual(imports[0].isNamespace, true, 'Should be namespace import');
    assertContains(imports[0].specifiers, 'utils', 'Should have utils specifier');
});

test('extractImports: should parse mixed default and named imports', () => {
    const analyzer = new RefreshAnalyzer();
    const content = `import React, { useState, useEffect } from 'react';`;
    const imports = analyzer.extractImports(content);
    
    assertArrayLength(imports, 1, 'Should find 1 import');
    assertEqual(imports[0].isDefault, true, 'Should have default import');
    assertContains(imports[0].specifiers, 'React', 'Should have React');
    assertContains(imports[0].specifiers, 'useState', 'Should have useState');
});

test('extractImports: should parse side-effect import', () => {
    const analyzer = new RefreshAnalyzer();
    const content = `import './styles.css';`;
    const imports = analyzer.extractImports(content);
    
    assertArrayLength(imports, 1, 'Should find 1 import');
    assertEqual(imports[0].source, './styles.css', 'Source should be ./styles.css');
    assertEqual(imports[0].specifiers.length, 0, 'Should have no specifiers');
});

test('extractImports: should parse dynamic import', () => {
    const analyzer = new RefreshAnalyzer();
    const content = `const module = import('./lazy-module');`;
    const imports = analyzer.extractImports(content);
    
    assertTrue(imports.some(imp => imp.source === './lazy-module'), 'Should find dynamic import');
});

// ============================================
// Import Parsing Tests - CommonJS
// ============================================

test('extractImports: should parse require statement', () => {
    const analyzer = new RefreshAnalyzer();
    const content = `const fs = require('fs');`;
    const imports = analyzer.extractImports(content);
    
    assertTrue(imports.some(imp => imp.source === 'fs'), 'Should find fs require');
    assertTrue(imports.some(imp => imp.specifiers.includes('fs')), 'Should have fs specifier');
});

test('extractImports: should parse destructured require', () => {
    const analyzer = new RefreshAnalyzer();
    const content = `const { readFileSync, writeFileSync } = require('fs');`;
    const imports = analyzer.extractImports(content);
    
    assertTrue(imports.some(imp => imp.source === 'fs'), 'Should find fs require');
    assertTrue(imports.some(imp => imp.specifiers.includes('readFileSync')), 'Should have readFileSync');
});

// ============================================
// Import Parsing Tests - Export From
// ============================================

test('extractImports: should parse export from', () => {
    const analyzer = new RefreshAnalyzer();
    const content = `export { foo, bar } from './module';`;
    const imports = analyzer.extractImports(content);
    
    assertTrue(imports.some(imp => imp.source === './module'), 'Should find export from import');
});

test('extractImports: should parse export * from', () => {
    const analyzer = new RefreshAnalyzer();
    const content = `export * from './utils';`;
    const imports = analyzer.extractImports(content);
    
    assertTrue(imports.some(imp => imp.source === './utils'), 'Should find re-export import');
});

// ============================================
// Export Parsing Tests
// ============================================

test('extractExports: should parse named function export', () => {
    const analyzer = new RefreshAnalyzer();
    const content = `export function myFunction() {}`;
    const exports = analyzer.extractExports(content);
    
    assertTrue(exports.some(exp => exp.name === 'myFunction' && exp.type === 'function'), 'Should find function export');
});

test('extractExports: should parse named class export', () => {
    const analyzer = new RefreshAnalyzer();
    const content = `export class MyClass {}`;
    const exports = analyzer.extractExports(content);
    
    assertTrue(exports.some(exp => exp.name === 'MyClass' && exp.type === 'class'), 'Should find class export');
});

test('extractExports: should parse named const export', () => {
    const analyzer = new RefreshAnalyzer();
    const content = `export const MY_CONSTANT = 42;`;
    const exports = analyzer.extractExports(content);
    
    assertTrue(exports.some(exp => exp.name === 'MY_CONSTANT' && exp.type === 'const'), 'Should find const export');
});

test('extractExports: should parse default export', () => {
    const analyzer = new RefreshAnalyzer();
    const content = `export default MyComponent;`;
    const exports = analyzer.extractExports(content);
    
    assertTrue(exports.some(exp => exp.isDefault === true), 'Should find default export');
});

test('extractExports: should parse export list', () => {
    const analyzer = new RefreshAnalyzer();
    const content = `export { foo, bar, baz };`;
    const exports = analyzer.extractExports(content);
    
    assertTrue(exports.some(exp => exp.name === 'foo'), 'Should find foo export');
    assertTrue(exports.some(exp => exp.name === 'bar'), 'Should find bar export');
    assertTrue(exports.some(exp => exp.name === 'baz'), 'Should find baz export');
});

// ============================================
// parseFile Tests
// ============================================

test('parseFile: should parse file content and add to graph', () => {
    const analyzer = new RefreshAnalyzer();
    const content = `
        import { foo } from './foo';
        export function bar() { return foo(); }
    `;
    
    const node = analyzer.parseFile('/src/bar.js', content);
    
    assertTrue(node !== null, 'Should return parsed node');
    assertTrue(node.imports.length > 0, 'Should have imports');
    assertTrue(node.exports.length > 0, 'Should have exports');
    assertTrue(analyzer.fileGraph.has('/src/bar.js'), 'Should be in graph');
});

test('parseFile: should return cached result when content is null', () => {
    const analyzer = new RefreshAnalyzer();
    analyzer.parseFile('/src/test.js', `import 'react';`);
    
    const cached = analyzer.parseFile('/src/test.js', null);
    
    assertTrue(cached !== null, 'Should return cached node');
    assertEqual(cached, analyzer.fileGraph.get('/src/test.js'), 'Should be same object');
});

// ============================================
// addFile Tests
// ============================================

test('addFile: should add pre-parsed file data to graph', () => {
    const analyzer = new RefreshAnalyzer();
    
    analyzer.addFile('/src/a.js', {
        imports: [{ source: './b', specifiers: ['foo'], isDefault: false, isNamespace: false, line: 1 }],
        exports: [{ name: 'bar', type: 'function', isDefault: false, line: 5 }],
        dependencies: ['/src/b.js'],
    });
    
    assertTrue(analyzer.fileGraph.has('/src/a.js'), 'Should have file in graph');
    
    const node = analyzer.fileGraph.get('/src/a.js');
    assertArrayLength(node.imports, 1, 'Should have 1 import');
    assertArrayLength(node.exports, 1, 'Should have 1 export');
});

// ============================================
// Dependency Resolution Tests
// ============================================

test('resolveImportPath: should resolve relative imports', () => {
    const analyzer = new RefreshAnalyzer();
    
    const resolved = analyzer.resolveImportPath('./utils', '/src/components/button.js');
    
    assertTrue(resolved.includes('utils'), 'Should resolve to utils path');
});

test('resolveImportPath: should handle parent directory imports', () => {
    const analyzer = new RefreshAnalyzer();
    
    const resolved = analyzer.resolveImportPath('../utils', '/src/components/button.js');
    
    assertTrue(resolved.includes('utils'), 'Should resolve parent directory');
});

test('isExternalDependency: should identify external packages', () => {
    const analyzer = new RefreshAnalyzer();
    
    assertTrue(analyzer.isExternalDependency('react'), 'react should be external');
    assertTrue(analyzer.isExternalDependency('lodash/get'), 'lodash/get should be external');
    assertFalse(analyzer.isExternalDependency('./utils'), './utils should not be external');
    assertFalse(analyzer.isExternalDependency('../config'), '../config should not be external');
});

// ============================================
// Reverse Dependencies Tests
// ============================================

test('addReverseDependency: should track reverse dependencies', () => {
    const analyzer = new RefreshAnalyzer();
    
    analyzer.addReverseDependency('/src/utils.js', '/src/a.js');
    analyzer.addReverseDependency('/src/utils.js', '/src/b.js');
    
    const dependents = analyzer.reverseDependencies.get('/src/utils.js');
    
    assertTrue(dependents.has('/src/a.js'), 'Should have a.js as dependent');
    assertTrue(dependents.has('/src/b.js'), 'Should have b.js as dependent');
});

// ============================================
// analyze Method Tests
// ============================================

test('analyze: should return analysis result with correct structure', () => {
    const analyzer = new RefreshAnalyzer();
    
    analyzer.addFile('/src/utils.js', {
        imports: [],
        exports: [{ name: 'helper', type: 'function', isDefault: false, line: 1 }],
        dependencies: [],
    });
    
    analyzer.addFile('/src/main.js', {
        imports: [{ source: './utils', specifiers: ['helper'], isDefault: false, isNamespace: false, line: 1 }],
        exports: [],
        dependencies: ['/src/utils.js'],
    });
    
    analyzer.buildReverseDependencies();
    
    const result = analyzer.analyze('/src/utils.js');
    
    assertContains(result.file, '/src/utils.js', 'Should have correct file path');
    assertTrue(Array.isArray(result.changes), 'Should have changes array');
    assertTrue(Array.isArray(result.rippleEffects), 'Should have rippleEffects array');
    assertTrue(Array.isArray(result.impactedFiles), 'Should have impactedFiles array');
});

test('analyze: should compute ripple effects for dependents', () => {
    const analyzer = new RefreshAnalyzer();
    
    // Set up dependency chain: utils <- main <- app
    analyzer.addFile('/src/utils.js', {
        imports: [],
        exports: [{ name: 'helper', type: 'function', isDefault: false, line: 1 }],
        dependencies: [],
    });
    
    analyzer.addFile('/src/main.js', {
        imports: [{ source: './utils', specifiers: ['helper'], isDefault: false, isNamespace: false, line: 1 }],
        exports: [{ name: 'main', type: 'function', isDefault: false, line: 5 }],
        dependencies: ['/src/utils.js'],
    });
    
    analyzer.addFile('/src/app.js', {
        imports: [{ source: './main', specifiers: ['main'], isDefault: false, isNamespace: false, line: 1 }],
        exports: [],
        dependencies: ['/src/main.js'],
    });
    
    analyzer.buildReverseDependencies();
    
    const result = analyzer.analyze('/src/utils.js');
    
    // main.js depends on utils.js
    assertTrue(result.impactedFiles.some(f => f.includes('main.js')), 'Should include main.js');
    // app.js depends on main.js which depends on utils.js (transitive)
    assertTrue(result.rippleEffects.some(r => r.depth === 2 && r.file.includes('app.js')), 'Should have transitive dependency on app.js');
});

test('analyze: should respect maxDepth option', () => {
    const analyzer = new RefreshAnalyzer({ maxDepth: 1 });
    
    // Set up deep chain: a <- b <- c
    analyzer.addFile('/src/a.js', { imports: [], exports: [], dependencies: [] });
    analyzer.addFile('/src/b.js', {
        imports: [{ source: './a', specifiers: [], isDefault: false, isNamespace: false, line: 1 }],
        exports: [],
        dependencies: ['/src/a.js'],
    });
    analyzer.addFile('/src/c.js', {
        imports: [{ source: './b', specifiers: [], isDefault: false, isNamespace: false, line: 1 }],
        exports: [],
        dependencies: ['/src/b.js'],
    });
    
    analyzer.buildReverseDependencies();
    
    const result = analyzer.analyze('/src/a.js');
    
    // Only b.js should be included (depth 1), c.js is depth 2
    assertTrue(result.impactedFiles.some(f => f.includes('b.js')), 'Should include b.js');
    assertFalse(result.impactedFiles.some(f => f.includes('c.js')), 'Should not include c.js due to maxDepth');
});

test('analyze: should parse content when provided', () => {
    const analyzer = new RefreshAnalyzer();
    
    const result = analyzer.analyze('/src/new.js', `export const foo = 42;`);
    
    assertContains(result.file, '/src/new.js', 'Should have correct file');
    assertTrue(analyzer.fileGraph.has('/src/new.js'), 'Should add file to graph');
});

// ============================================
// findRelated Method Tests
// ============================================

test('findRelated: should return files that import the given file', () => {
    const analyzer = new RefreshAnalyzer();
    
    analyzer.addFile('/src/utils.js', { imports: [], exports: [], dependencies: [] });
    analyzer.addFile('/src/a.js', {
        imports: [{ source: './utils', specifiers: [], isDefault: false, isNamespace: false, line: 1 }],
        exports: [],
        dependencies: ['/src/utils.js'],
    });
    analyzer.addFile('/src/b.js', {
        imports: [{ source: './utils', specifiers: [], isDefault: false, isNamespace: false, line: 1 }],
        exports: [],
        dependencies: ['/src/utils.js'],
    });
    
    analyzer.buildReverseDependencies();
    
    const related = analyzer.findRelated('/src/utils.js');
    
    assertArrayLength(related, 2, 'Should find 2 related files');
    assertTrue(related.some(f => f.includes('a.js')), 'Should include a.js');
    assertTrue(related.some(f => f.includes('b.js')), 'Should include b.js');
});

test('findRelated: should return empty array for files with no dependents', () => {
    const analyzer = new RefreshAnalyzer();
    
    analyzer.addFile('/src/isolated.js', { imports: [], exports: [], dependencies: [] });
    
    const related = analyzer.findRelated('/src/isolated.js');
    
    assertArrayLength(related, 0, 'Should find no related files');
});

test('findRelated: should return empty array for unknown files', () => {
    const analyzer = new RefreshAnalyzer();
    
    const related = analyzer.findRelated('/src/unknown.js');
    
    assertArrayLength(related, 0, 'Should find no related files for unknown');
});

// ============================================
// computeRippleEffects Tests
// ============================================

test('computeRippleEffects: should compute effects with correct depth', () => {
    const analyzer = new RefreshAnalyzer();
    
    analyzer.addFile('/src/base.js', { imports: [], exports: [], dependencies: [] });
    analyzer.addFile('/src/middle.js', {
        imports: [{ source: './base', specifiers: [], isDefault: false, isNamespace: false, line: 1 }],
        exports: [],
        dependencies: ['/src/base.js'],
    });
    analyzer.addFile('/src/top.js', {
        imports: [{ source: './middle', specifiers: [], isDefault: false, isNamespace: false, line: 1 }],
        exports: [],
        dependencies: ['/src/middle.js'],
    });
    
    analyzer.buildReverseDependencies();
    
    const effects = analyzer.computeRippleEffects('/src/base.js');
    
    assertArrayLength(effects, 2, 'Should have 2 ripple effects');
    assertTrue(effects[0].depth === 1, 'First effect should be depth 1');
    assertTrue(effects[1].depth === 2, 'Second effect should be depth 2');
});

test('computeRippleEffects: should include via path', () => {
    const analyzer = new RefreshAnalyzer();
    
    analyzer.addFile('/src/a.js', { imports: [], exports: [], dependencies: [] });
    analyzer.addFile('/src/b.js', {
        imports: [{ source: './a', specifiers: [], isDefault: false, isNamespace: false, line: 1 }],
        exports: [],
        dependencies: ['/src/a.js'],
    });
    analyzer.addFile('/src/c.js', {
        imports: [{ source: './b', specifiers: [], isDefault: false, isNamespace: false, line: 1 }],
        exports: [],
        dependencies: ['/src/b.js'],
    });
    
    analyzer.buildReverseDependencies();
    
    const effects = analyzer.computeRippleEffects('/src/a.js');
    
    const cEffect = effects.find(e => e.file.includes('c.js'));
    assertTrue(cEffect !== undefined, 'Should have effect on c.js');
    assertTrue(cEffect.via.some(v => v.includes('b.js')), 'Should have b.js in via path');
});

// ============================================
// Utility Method Tests
// ============================================

test('normalizePath: should normalize path separators', () => {
    const analyzer = new RefreshAnalyzer();
    
    assertEqual(analyzer.normalizePath('src\\components\\button.js'), 'src/components/button.js', 'Should convert backslashes');
    assertEqual(analyzer.normalizePath('src//components//button.js'), 'src/components/button.js', 'Should remove double slashes');
});

test('getStats: should return graph statistics', () => {
    const analyzer = new RefreshAnalyzer();
    
    analyzer.addFile('/src/a.js', {
        imports: [{ source: './b', specifiers: [], isDefault: false, isNamespace: false, line: 1 }],
        exports: [{ name: 'foo', type: 'function', isDefault: false, line: 5 }],
        dependencies: ['/src/b.js'],
    });
    analyzer.addFile('/src/b.js', {
        imports: [],
        exports: [{ name: 'bar', type: 'const', isDefault: false, line: 1 }],
        dependencies: [],
    });
    
    const stats = analyzer.getStats();
    
    assertEqual(stats.totalFiles, 2, 'Should have 2 files');
    assertEqual(stats.totalDependencies, 1, 'Should have 1 dependency');
    assertEqual(stats.totalExports, 2, 'Should have 2 exports');
});

test('clear: should clear all state', () => {
    const analyzer = new RefreshAnalyzer();
    
    analyzer.addFile('/src/test.js', { imports: [], exports: [], dependencies: [] });
    analyzer.addReverseDependency('/src/test.js', '/src/other.js');
    
    analyzer.clear();
    
    assertEqual(analyzer.fileGraph.size, 0, 'File graph should be empty');
    assertEqual(analyzer.reverseDependencies.size, 0, 'Reverse dependencies should be empty');
});

// ============================================
// Edge Cases
// ============================================

test('analyze: should handle empty content', () => {
    const analyzer = new RefreshAnalyzer();
    
    const result = analyzer.analyze('/src/empty.js', '');
    
    assertTrue(Array.isArray(result.changes), 'Should return valid result');
    assertArrayLength(result.rippleEffects, 0, 'Should have no ripple effects');
});

test('analyze: should handle file not in cache', () => {
    const analyzer = new RefreshAnalyzer();
    
    const result = analyzer.analyze('/src/unknown.js');
    
    assertEqual(result.file, '/src/unknown.js', 'Should return file path');
    assertArrayLength(result.impactedFiles, 0, 'Should have no impacted files');
});

test('extractImports: should handle multiple imports on same line', () => {
    const analyzer = new RefreshAnalyzer();
    const content = `import a from 'a'; import b from 'b';`;
    const imports = analyzer.extractImports(content);
    
    assertTrue(imports.length >= 2, 'Should find multiple imports');
});

// ============================================
// Run Tests
// ============================================

console.log('Running RefreshAnalyzer unit tests...\n');

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
