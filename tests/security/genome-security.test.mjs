/**
 * @fileoverview Comprehensive Security Test Suite
 * @version 2.6.0
 * @description Tests for genome security, injection prevention, and safe parsing
 */

import { 
  safeGenomeParse, 
  executeGenome, 
  GenomeParseError, 
  GenomeValidationError,
  SecurityError,
  ALLOWED_OPERATIONS,
  validateGenomeString,
  getAllowedOperations,
  isOperationAllowed
} from '../lib/genome-safe.js';

// Test framework
const tests = [];
let passed = 0;
let failed = 0;
let skipped = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function skip(name, fn) {
  tests.push({ name, fn, skip: true });
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

function assertFalse(value, msg = '') {
  if (value) {
    throw new Error(`${msg} Expected falsy value`);
  }
}

function assertThrows(fn, ErrorClass, msg = '') {
  try {
    fn();
    throw new Error(`${msg} Expected to throw ${ErrorClass.name}`);
  } catch (e) {
    if (!(e instanceof ErrorClass)) {
      throw new Error(`${msg} Expected ${ErrorClass.name}, got ${e.constructor.name}: ${e.message}`);
    }
  }
}

function assertDoesNotThrow(fn, msg = '') {
  try {
    fn();
  } catch (e) {
    throw new Error(`${msg} Should not throw, but threw: ${e.message}`);
  }
}

function assertContains(str, substr, msg = '') {
  if (typeof str !== 'string' || !str.includes(substr)) {
    throw new Error(`${msg} Expected "${str}" to contain "${substr}"`);
  }
}

// ============================================
// SECTION 1: CODE INJECTION PREVENTION
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('🔒 SECTION 1: CODE INJECTION PREVENTION');
console.log('═'.repeat(60) + '\n');

test('should reject eval() attempts in genome data', () => {
  const maliciousGenome = JSON.stringify({
    version: '2.6.0',
    patterns: [{
      operation: 'extract',
      options: { code: 'eval("process.exit(1)")' }
    }]
  });
  assertThrows(() => safeGenomeParse(maliciousGenome), SecurityError);
});

test('should reject Function constructor attempts', () => {
  const maliciousGenome = JSON.stringify({
    version: '2.6.0',
    patterns: [{
      operation: 'analyze',
      options: { payload: 'new Function("return process")()' }
    }]
  });
  assertThrows(() => safeGenomeParse(maliciousGenome), SecurityError);
});

test('should reject require() attempts', () => {
  const maliciousGenome = JSON.stringify({
    version: '2.6.0',
    patterns: [{
      operation: 'transform',
      options: { module: "require('child_process').exec('rm -rf /')" }
    }]
  });
  assertThrows(() => safeGenomeParse(maliciousGenome), SecurityError);
});

test('should reject dynamic import attempts', () => {
  const maliciousGenome = JSON.stringify({
    version: '2.6.0',
    patterns: [{
      operation: 'extract',
      options: { code: 'import("fs").then(fs => fs.readFileSync("/etc/passwd"))' }
    }]
  });
  assertThrows(() => safeGenomeParse(maliciousGenome), SecurityError);
});

test('should reject child_process references', () => {
  const maliciousGenome = JSON.stringify({
    version: '2.6.0',
    metadata: { description: 'uses child_process module' }
  });
  assertThrows(() => safeGenomeParse(maliciousGenome), SecurityError);
});

test('should reject exec() calls', () => {
  const maliciousGenome = JSON.stringify({
    version: '2.6.0',
    patterns: [{
      operation: 'analyze',
      options: { cmd: 'exec("cat /etc/passwd")' }
    }]
  });
  assertThrows(() => safeGenomeParse(maliciousGenome), SecurityError);
});

test('should reject spawn() calls', () => {
  const maliciousGenome = JSON.stringify({
    version: '2.6.0',
    patterns: [{
      operation: 'extract',
      options: { proc: 'spawn("bash", ["-c", "id"])' }
    }]
  });
  assertThrows(() => safeGenomeParse(maliciousGenome), SecurityError);
});

// ============================================
// SECTION 2: SYSTEM ACCESS PREVENTION
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('🔒 SECTION 2: SYSTEM ACCESS PREVENTION');
console.log('═'.repeat(60) + '\n');

test('should reject process.env access', () => {
  const maliciousGenome = JSON.stringify({
    version: '2.6.0',
    metadata: { description: "process.env.SECRET_KEY" }
  });
  assertThrows(() => safeGenomeParse(maliciousGenome), SecurityError);
});

test('should reject process.exit access', () => {
  const maliciousGenome = JSON.stringify({
    version: '2.6.0',
    patterns: [{
      operation: 'analyze',
      options: { exit: 'process.exit(0)' }
    }]
  });
  assertThrows(() => safeGenomeParse(maliciousGenome), SecurityError);
});

test('should reject __dirname access', () => {
  const maliciousGenome = JSON.stringify({
    version: '2.6.0',
    patterns: [{
      operation: 'extract',
      options: { path: '__dirname + "/../../../etc/passwd"' }
    }]
  });
  assertThrows(() => safeGenomeParse(maliciousGenome), SecurityError);
});

test('should reject __filename access', () => {
  const maliciousGenome = JSON.stringify({
    version: '2.6.0',
    patterns: [{
      operation: 'extract',
      options: { file: '__filename' }
    }]
  });
  assertThrows(() => safeGenomeParse(maliciousGenome), SecurityError);
});

test('should reject global object access', () => {
  const maliciousGenome = JSON.stringify({
    version: '2.6.0',
    patterns: [{
      operation: 'analyze',
      options: { global: 'global.process' }
    }]
  });
  assertThrows(() => safeGenomeParse(maliciousGenome), SecurityError);
});

test('should reject globalThis access', () => {
  const maliciousGenome = JSON.stringify({
    version: '2.6.0',
    patterns: [{
      operation: 'transform',
      options: { ctx: 'globalThis.eval' }
    }]
  });
  assertThrows(() => safeGenomeParse(maliciousGenome), SecurityError);
});

// ============================================
// SECTION 3: PROTOTYPE POLLUTION PREVENTION
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('🔒 SECTION 3: PROTOTYPE POLLUTION PREVENTION');
console.log('═'.repeat(60) + '\n');

test('should reject __proto__ access', () => {
  const maliciousGenome = JSON.stringify({
    version: '2.6.0',
    patterns: [{
      operation: 'transform',
      options: { proto: '__proto__.polluted = true' }
    }]
  });
  assertThrows(() => safeGenomeParse(maliciousGenome), SecurityError);
});

test('should reject constructor access', () => {
  const maliciousGenome = JSON.stringify({
    version: '2.6.0',
    patterns: [{
      operation: 'analyze',
      options: { ctor: 'constructor.prototype' }
    }]
  });
  assertThrows(() => safeGenomeParse(maliciousGenome), SecurityError);
});

test('should reject prototype bracket access', () => {
  const maliciousGenome = JSON.stringify({
    version: '2.6.0',
    patterns: [{
      operation: 'extract',
      options: { proto: 'prototype["polluted"]' }
    }]
  });
  assertThrows(() => safeGenomeParse(maliciousGenome), SecurityError);
});

test('should reject Object.defineProperty', () => {
  const maliciousGenome = JSON.stringify({
    version: '2.6.0',
    patterns: [{
      operation: 'transform',
      options: { define: 'Object.defineProperty' }
    }]
  });
  assertThrows(() => safeGenomeParse(maliciousGenome), SecurityError);
});

test('should reject Proxy usage', () => {
  const maliciousGenome = JSON.stringify({
    version: '2.6.0',
    patterns: [{
      operation: 'analyze',
      options: { proxy: 'new Proxy({}, handler)' }
    }]
  });
  assertThrows(() => safeGenomeParse(maliciousGenome), SecurityError);
});

// ============================================
// SECTION 4: INPUT FORMAT VALIDATION
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('🔒 SECTION 4: INPUT FORMAT VALIDATION');
console.log('═'.repeat(60) + '\n');

test('should reject code strings (not JSON)', () => {
  const codeString = 'function() { return process.exit(1); }';
  assertThrows(() => safeGenomeParse(codeString), GenomeParseError);
});

test('should reject JavaScript expressions', () => {
  const expression = '2 + 2';
  assertThrows(() => safeGenomeParse(expression), GenomeParseError);
});

test('should reject function definitions', () => {
  const func = '(x) => x * 2';
  assertThrows(() => safeGenomeParse(func), GenomeParseError);
});

test('should reject array-only input', () => {
  const arr = '[1, 2, 3]';
  // Arrays are valid JSON but not valid genomes
  assertThrows(() => safeGenomeParse(arr), GenomeValidationError);
});

test('should accept valid JSON genome data', () => {
  const validGenome = JSON.stringify({
    version: '2.6.0',
    patterns: [
      { operation: 'extract', target: '*.js' },
      { operation: 'analyze', options: { depth: 3 } }
    ]
  });
  assertDoesNotThrow(() => safeGenomeParse(validGenome));
});

test('should validate version format (X.Y.Z)', () => {
  const invalidVersion = JSON.stringify({
    version: 'invalid',
    patterns: []
  });
  assertThrows(() => safeGenomeParse(invalidVersion), GenomeValidationError);
});

test('should reject version without patch number', () => {
  const invalidVersion = JSON.stringify({
    version: '2.6',
    patterns: []
  });
  assertThrows(() => safeGenomeParse(invalidVersion), GenomeValidationError);
});

test('should reject unknown operations', () => {
  const invalidOperation = JSON.stringify({
    version: '2.6.0',
    patterns: [{
      operation: 'malicious_operation'
    }]
  });
  assertThrows(() => safeGenomeParse(invalidOperation), GenomeValidationError);
});

// ============================================
// SECTION 5: DEEP INJECTION DETECTION
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('🔒 SECTION 5: DEEP INJECTION DETECTION');
console.log('═'.repeat(60) + '\n');

test('should detect deeply nested malicious content', () => {
  const maliciousDeep = {
    version: '2.6.0',
    patterns: [{
      operation: 'analyze',
      options: {
        level1: {
          level2: {
            level3: {
              payload: "require('fs').readFileSync('/etc/passwd')"
            }
          }
        }
      }
    }]
  };
  assertThrows(() => safeGenomeParse(maliciousDeep), SecurityError);
});

test('should detect malicious content in arrays', () => {
  const maliciousArray = JSON.stringify({
    version: '2.6.0',
    patterns: [{
      operation: 'extract',
      options: {
        files: ['safe.js', "require('child_process')", 'another.js']
      }
    }]
  });
  assertThrows(() => safeGenomeParse(maliciousArray), SecurityError);
});

test('should detect malicious content in metadata', () => {
  const maliciousMeta = JSON.stringify({
    version: '2.6.0',
    metadata: {
      author: 'Safe Author',
      description: 'Uses eval() for flexibility'
    }
  });
  assertThrows(() => safeGenomeParse(maliciousMeta), SecurityError);
});

test('should detect malicious content in flow steps', () => {
  const maliciousFlow = JSON.stringify({
    version: '2.6.0',
    flows: [{
      name: 'safe_flow',
      steps: [
        { operation: 'validate' },
        { operation: 'transform', params: { code: 'process.exit(1)' } }
      ]
    }]
  });
  assertThrows(() => safeGenomeParse(maliciousFlow), SecurityError);
});

// ============================================
// SECTION 6: EXECUTION SAFETY
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('🔒 SECTION 6: EXECUTION SAFETY');
console.log('═'.repeat(60) + '\n');

test('should safely execute valid genomes', () => {
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

test('should include execution metadata', () => {
  const genome = {
    version: '2.6.0',
    patterns: [{ operation: 'analyze' }]
  };
  const result = executeGenome(genome);
  assertTrue(result.executedAt);
  assertTrue(result.summary.duration !== undefined);
  assertTrue(result.genome._validated);
});

test('should handle execution errors gracefully', () => {
  const genome = {
    version: '2.6.0',
    patterns: [
      { operation: 'extract' },
      { operation: 'invalid_operation' }
    ]
  };
  // Should not throw in non-strict mode
  assertDoesNotThrow(() => executeGenome(genome, { strict: false }));
});

test('should stop on first error in strict mode', () => {
  const genome = {
    version: '2.6.0',
    patterns: [
      { operation: 'extract' },
      { operation: 'invalid_operation' },
      { operation: 'analyze' }
    ]
  };
  const result = executeGenome(genome, { strict: true });
  assertEqual(result.errors.length, 1);
  assertEqual(result.results.length, 1);
});

// ============================================
// SECTION 7: EDGE CASES
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('🔒 SECTION 7: EDGE CASES');
console.log('═'.repeat(60) + '\n');

test('should handle empty genome', () => {
  const emptyGenome = { version: '2.6.0' };
  const result = safeGenomeParse(emptyGenome);
  assertEqual(result.patterns.length, 0);
  assertEqual(result.flows.length, 0);
});

test('should handle Buffer input', () => {
  const genomeJson = JSON.stringify({ version: '2.6.0' });
  const buffer = Buffer.from(genomeJson);
  assertDoesNotThrow(() => safeGenomeParse(buffer));
});

test('should handle null input', () => {
  assertThrows(() => safeGenomeParse(null), GenomeParseError);
});

test('should handle undefined input', () => {
  assertThrows(() => safeGenomeParse(undefined), GenomeParseError);
});

test('should handle number input', () => {
  assertThrows(() => safeGenomeParse(123), GenomeParseError);
});

test('should handle boolean input', () => {
  assertThrows(() => safeGenomeParse(true), GenomeParseError);
});

test('should handle empty string', () => {
  assertThrows(() => safeGenomeParse(''), GenomeParseError);
});

test('should handle whitespace-only string', () => {
  assertThrows(() => safeGenomeParse('   '), GenomeParseError);
});

test('should handle deeply nested structures (depth limit)', () => {
  let deep = { version: '2.6.0' };
  let current = deep;
  for (let i = 0; i < 20; i++) {
    current.nested = {};
    current = current.nested;
  }
  assertThrows(() => safeGenomeParse(deep, { maxDepth: 10 }), GenomeValidationError);
});

// ============================================
// SECTION 8: UTILITY FUNCTIONS
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('🔒 SECTION 8: UTILITY FUNCTIONS');
console.log('═'.repeat(60) + '\n');

test('should validate genome strings correctly', () => {
  const validGenome = JSON.stringify({ version: '2.6.0' });
  const result = validateGenomeString(validGenome);
  assertTrue(result.safe);
  assertEqual(result.errors.length, 0);
});

test('should detect invalid genome strings', () => {
  const invalidGenome = 'not valid json';
  const result = validateGenomeString(invalidGenome);
  assertFalse(result.safe);
  assertTrue(result.errors.length > 0);
});

test('should return allowed operations', () => {
  const ops = getAllowedOperations();
  assertTrue(Array.isArray(ops));
  assertTrue(ops.includes('extract'));
  assertTrue(ops.includes('analyze'));
});

test('should check if operation is allowed', () => {
  assertTrue(isOperationAllowed('extract'));
  assertTrue(isOperationAllowed('analyze'));
  assertFalse(isOperationAllowed('eval'));
  assertFalse(isOperationAllowed('exec'));
});

// ============================================
// SECTION 9: OBFUSCATION DETECTION
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('🔒 SECTION 9: OBFUSCATION DETECTION');
console.log('═'.repeat(60) + '\n');

test('should reject atob usage (potential obfuscation)', () => {
  const maliciousGenome = JSON.stringify({
    version: '2.6.0',
    patterns: [{
      operation: 'extract',
      options: { data: 'atob(encodedPayload)' }
    }]
  });
  assertThrows(() => safeGenomeParse(maliciousGenome), SecurityError);
});

test('should reject btoa usage (potential obfuscation)', () => {
  const maliciousGenome = JSON.stringify({
    version: '2.6.0',
    patterns: [{
      operation: 'transform',
      options: { data: 'btoa(payload)' }
    }]
  });
  assertThrows(() => safeGenomeParse(maliciousGenome), SecurityError);
});

test('should reject Buffer.from usage', () => {
  const maliciousGenome = JSON.stringify({
    version: '2.6.0',
    patterns: [{
      operation: 'analyze',
      options: { data: 'Buffer.from(encoded)' }
    }]
  });
  assertThrows(() => safeGenomeParse(maliciousGenome), SecurityError);
});

// ============================================
// RUN ALL TESTS
// ============================================

async function runTests() {
  console.log('\n' + '═'.repeat(60));
  console.log('🔒 LLMemory-Palace Security Test Suite v2.6.0');
  console.log('═'.repeat(60) + '\n');
  
  for (const { name, fn, skip: isSkipped } of tests) {
    if (isSkipped) {
      console.log(`⊘ ${name} (skipped)`);
      skipped++;
      continue;
    }
    
    try {
      fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (e) {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${e.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log(`📊 Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log('═'.repeat(60));
  
  if (failed > 0) {
    console.log('\n❌ SECURITY TESTS FAILED - Please review and fix issues');
    process.exit(1);
  } else {
    console.log('\n✅ All security tests passed');
    process.exit(0);
  }
}

runTests();
