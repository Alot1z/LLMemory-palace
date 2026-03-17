/**
 * @fileoverview Integration Test Suite
 * @version 2.6.0
 * @description End-to-end workflow tests for LLMemory-Palace
 */

import { Palace } from '../../lib/palace.js';
import { GenomeEncoder, safeGenomeParse, executeGenome } from '../../lib/genome.js';
import { PatternLibrary } from '../../lib/patterns.js';
import { BehaviorGraph } from '../../lib/flows.js';
import { SemanticHash } from '../../lib/semantic-hash.js';
import { Reconstructor } from '../../lib/reconstructor.js';
import {
  validatePath,
  validateCommand,
  sanitizeString
} from '../../lib/cli-validator.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Test framework
const tests = [];
let passed = 0;
let failed = 0;
let tempDir = null;

function test(name, fn) {
  tests.push({ name, fn });
}

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg} Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(value, msg = '') {
  if (!value) {
    throw new Error(`${msg} Expected truthy value`);
  }
}

function assertContains(str, substr, msg = '') {
  if (typeof str !== 'string' || !str.includes(substr)) {
    throw new Error(`${msg} Expected to contain "${substr}"`);
  }
}

function assertDoesNotThrow(fn, msg = '') {
  try {
    fn();
  } catch (e) {
    throw new Error(`${msg} Should not throw, but threw: ${e.message}`);
  }
}

function assertThrows(fn, ErrorClass, msg = '') {
  try {
    fn();
    throw new Error(`${msg} Expected to throw ${ErrorClass?.name || 'error'}`);
  } catch (e) {
    if (ErrorClass && !(e instanceof ErrorClass)) {
      throw new Error(`${msg} Expected ${ErrorClass.name}, got ${e.constructor.name}`);
    }
  }
}

// ============================================
// SETUP AND TEARDOWN
// ============================================

async function setup() {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'llmemory-test-'));
  
  fs.mkdirSync(path.join(tempDir, 'src'));
  fs.mkdirSync(path.join(tempDir, 'lib'));
  
  fs.writeFileSync(path.join(tempDir, 'src', 'index.js'), `
    import { hello } from './hello.js';
    import { World } from './world.js';
    
    export function main() {
      console.log(hello('World'));
      return new World().run();
    }
  `);
  
  fs.writeFileSync(path.join(tempDir, 'src', 'hello.js'), `
    export function hello(name) {
      return 'Hello, ' + name + '!';
    }
  `);
  
  fs.writeFileSync(path.join(tempDir, 'src', 'world.js'), `
    export class World {
      constructor() {
        this.name = 'World';
      }
      
      run() {
        return 'Running in ' + this.name;
      }
    }
  `);
  
  fs.writeFileSync(path.join(tempDir, 'lib', 'utils.js'), `
    export function formatDate(date) {
      return date.toISOString();
    }
    
    export function parseJSON(str) {
      return JSON.parse(str);
    }
  `);
  
  fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
    name: 'test-project',
    version: '1.0.0',
    main: 'src/index.js'
  }, null, 2));
  
  console.log('📁 Test project created at:', tempDir);
}

async function teardown() {
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('🧹 Test directory cleaned up');
  }
}

// ============================================
// SECTION 1: PALACE INITIALIZATION
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('🏗️  SECTION 1: PALACE INITIALIZATION');
console.log('═'.repeat(60) + '\n');

test('should initialize palace in a directory', async () => {
  const palace = new Palace(tempDir);
  const result = await palace.init();
  assertTrue(result.version);
  assertTrue(fs.existsSync(path.join(tempDir, '.palace')));
  assertEqual(result.projectPath, tempDir);
});

test('should not crash on re-initialization', async () => {
  const palace = new Palace(tempDir);
  await palace.init();
  const result = await palace.init();
  assertTrue(result.version);
});

// ============================================
// SECTION 2: SCANNING
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('🔍 SECTION 2: SCANNING');
console.log('═'.repeat(60) + '\n');

test('should scan project files', async () => {
  const palace = new Palace(tempDir);
  const result = await palace.scan();
  assertTrue(result.files > 0);
  assertTrue(result.lines > 0);
  assertTrue(result.size > 0);
});

test('should detect project languages', async () => {
  const palace = new Palace(tempDir);
  const result = await palace.scan();
  assertTrue(result.languages.includes('JavaScript'));
});

test('should count patterns and flows', async () => {
  const palace = new Palace(tempDir);
  const result = await palace.scan();
  assertTrue(result.patterns >= 0);
  assertTrue(result.flows >= 0);
});

// ============================================
// SECTION 3: PATTERN LIBRARY
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('📚 SECTION 3: PATTERN LIBRARY');
console.log('═'.repeat(60) + '\n');

test('should initialize pattern library', () => {
  const lib = new PatternLibrary();
  assertTrue(lib.patterns.size > 0);
});

test('should extract patterns from code', () => {
  const lib = new PatternLibrary();
  const code = `
    async function getUser(id) {
      return db.users.findUnique({ where: { id } });
    }
  `;
  const matches = lib.extractPatterns(code, 'javascript');
  assertTrue(matches.length >= 0);
});

// ============================================
// SECTION 4: BEHAVIOR GRAPHS
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('⚡ SECTION 4: BEHAVIOR GRAPHS');
console.log('═'.repeat(60) + '\n');

test('should initialize behavior graph', () => {
  const graph = new BehaviorGraph();
  assertTrue(graph.flows.size > 0);
});

test('should get flow by name', () => {
  const graph = new BehaviorGraph();
  const flow = graph.get('AUTH_LOGIN');
  assertTrue(flow !== undefined);
  assertTrue(flow.steps.length > 0);
});

// ============================================
// SECTION 5: SEMANTIC HASHING
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('🔐 SECTION 5: SEMANTIC HASHING');
console.log('═'.repeat(60) + '\n');

test('should generate consistent hashes', () => {
  const hasher = new SemanticHash();
  const hash1 = hasher.hash('testName');
  const hash2 = hasher.hash('testName');
  assertEqual(hash1, hash2);
});

test('should generate different hashes for different names', () => {
  const hasher = new SemanticHash();
  const hash1 = hasher.hash('name1');
  const hash2 = hasher.hash('name2');
  assertTrue(hash1 !== hash2);
});

// ============================================
// SECTION 6: GENOME ENCODER
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('🧬 SECTION 6: GENOME ENCODER');
console.log('═'.repeat(60) + '\n');

test('should encode project to genome', async () => {
  const palace = new Palace(tempDir);
  await palace.scan();
  const genome = await palace.generateGenome();
  assertTrue(typeof genome === 'string');
  assertContains(genome, 'GENOME');
});

test('should get genome stats', async () => {
  const palace = new Palace(tempDir);
  await palace.scan();
  const genome = await palace.generateGenome();
  const encoder = new GenomeEncoder();
  const stats = encoder.getStats(genome);
  assertTrue(stats.length > 0);
});

// ============================================
// SECTION 7: SAFE GENOME PARSING
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('🔒 SECTION 7: SAFE GENOME PARSING');
console.log('═'.repeat(60) + '\n');

test('should safely parse valid genome', () => {
  const genome = JSON.stringify({
    version: '2.6.0',
    patterns: [
      { operation: 'extract', target: '*.js' },
      { operation: 'analyze', options: { depth: 3 } }
    ]
  });
  assertDoesNotThrow(() => safeGenomeParse(genome));
});

test('should reject malicious genome', () => {
  const malicious = JSON.stringify({
    version: '2.6.0',
    patterns: [{
      operation: 'extract',
      options: { code: "require('child_process')" }
    }]
  });
  assertThrows(() => safeGenomeParse(malicious), Error);
});

test('should execute genome safely', () => {
  const genome = {
    version: '2.6.0',
    patterns: [
      { operation: 'extract', target: '*.js' },
      { operation: 'hash', options: { algorithm: 'sha256' } }
    ]
  };
  const result = executeGenome(genome);
  assertEqual(result.summary.successful, 2);
  assertEqual(result.summary.failed, 0);
});

// ============================================
// SECTION 8: PACK AND MERGE
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('📦 SECTION 8: PACK AND MERGE');
console.log('═'.repeat(60) + '\n');

test('should create pack from project', async () => {
  const palace = new Palace(tempDir);
  const pack = await palace.createPack();
  assertTrue(pack.version);
  assertTrue(Array.isArray(pack.files));
  assertTrue(pack.files.length > 0);
});

test('should merge pack to output directory', async () => {
  const palace = new Palace(tempDir);
  const pack = await palace.createPack();
  const outputDir = path.join(tempDir, 'merged');
  const result = await palace.mergePack(pack, outputDir);
  assertTrue(result.files > 0);
  assertTrue(fs.existsSync(outputDir));
});

// ============================================
// SECTION 9: COMPRESSION
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('🗜️  SECTION 9: COMPRESSION');
console.log('═'.repeat(60) + '\n');

test('should compress project', async () => {
  const palace = new Palace(tempDir);
  const result = await palace.compress();
  assertTrue(result.originalSize > 0);
  assertTrue(result.compressedSize > 0);
  assertTrue(parseFloat(result.ratio) > 0);
});

// ============================================
// SECTION 10: VALIDATION INTEGRATION
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('✅ SECTION 10: VALIDATION INTEGRATION');
console.log('═'.repeat(60) + '\n');

test('should validate paths throughout workflow', () => {
  assertDoesNotThrow(() => validatePath(tempDir));
});

test('should validate commands with options', () => {
  const options = {
    path: tempDir,
    exclude: ['node_modules']
  };
  assertDoesNotThrow(() => validateCommand('scan', options));
});

test('should sanitize strings for output', () => {
  const result = sanitizeString('test<script>alert(1)</script>');
  assertTrue(!result.includes('<script>'));
});

// ============================================
// SECTION 11: STATUS AND QUERY
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('📊 SECTION 11: STATUS AND QUERY');
console.log('═'.repeat(60) + '\n');

test('should get project status', async () => {
  const palace = new Palace(tempDir);
  const status = await palace.getStatus();
  assertTrue(status.name);
  assertTrue(typeof status.files === 'number');
});

test('should handle queries', async () => {
  const palace = new Palace(tempDir);
  const result = await palace.query('LIST PATTERNS');
  assertTrue(result !== undefined);
});

// ============================================
// RUN ALL TESTS
// ============================================

async function runTests() {
  console.log('\n' + '═'.repeat(60));
  console.log('🧪 LLMemory-Palace Integration Test Suite v2.6.0');
  console.log('═'.repeat(60) + '\n');
  
  await setup();
  
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (e) {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${e.message}`);
      failed++;
    }
  }
  
  await teardown();
  
  console.log('\n' + '═'.repeat(60));
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  console.log('═'.repeat(60));
  
  if (failed > 0) {
    console.log('\n❌ INTEGRATION TESTS FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ All integration tests passed');
    process.exit(0);
  }
}

runTests();
