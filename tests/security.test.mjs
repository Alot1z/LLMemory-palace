/**
 * @fileoverview Security tests for genome parsing
 * @version 25.1.0
 */

import { 
  safeGenomeParse, 
  executeGenome, 
  GenomeParseError, 
  GenomeValidationError,
  SecurityError,
  ALLOWED_OPERATIONS 
} from '../lib/genome-safe.js';

import { 
  validatePath, 
  validateCommand, 
  sanitizeString,
  ValidationError 
} from '../lib/cli-validator.js';
import { z } from 'zod';

// Test framework
const tests = [];
let passed = 0;
let failed = 0;

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

// ============================================
// GENOME SECURITY TESTS
// ============================================

test('should reject eval() attempts in genome data', () => {
  const maliciousGenome = JSON.stringify({
    version: '25.0.0',
    patterns: [{
      operation: 'extract',
      options: { code: 'eval("process.exit(1)")' }
    }]
  });
  assertThrows(() => safeGenomeParse(maliciousGenome), SecurityError);
});

test('should reject Function constructor attempts', () => {
  const maliciousGenome = JSON.stringify({
    version: '25.0.0',
    patterns: [{
      operation: 'analyze',
      options: { payload: 'new Function("return process")()' }
    }]
  });
  assertThrows(() => safeGenomeParse(maliciousGenome), SecurityError);
});

test('should reject require() attempts', () => {
  const maliciousGenome = JSON.stringify({
    version: '25.0.0',
    patterns: [{
      operation: 'transform',
      options: { module: "require('child_process').exec('rm -rf /')" }
    }]
  });
  assertThrows(() => safeGenomeParse(maliciousGenome), SecurityError);
});

test('should reject process.env access attempts', () => {
  const maliciousGenome = JSON.stringify({
    version: '25.0.0',
    metadata: {
      description: "process.env.SECRET_KEY"
    }
  });
  assertThrows(() => safeGenomeParse(maliciousGenome), SecurityError);
});

test('should reject code strings (not JSON objects)', () => {
  const codeString = 'function() { return process.exit(1); }';
  assertThrows(() => safeGenomeParse(codeString), GenomeParseError);
});

test('should accept valid JSON genome data', () => {
  const validGenome = JSON.stringify({
    version: '25.1.0',
    patterns: [
      { operation: 'extract', target: '*.js' },
      { operation: 'analyze', options: { depth: 3 } }
    ]
  });
  assertDoesNotThrow(() => safeGenomeParse(validGenome));
});

test('should validate version format', () => {
  const invalidVersion = JSON.stringify({
    version: 'invalid',
    patterns: []
  });
  assertThrows(() => safeGenomeParse(invalidVersion), GenomeValidationError);
});

test('should reject unknown operations', () => {
  const invalidOperation = JSON.stringify({
    version: '25.1.0',
    patterns: [{
      operation: 'malicious_operation'
    }]
  });
  assertThrows(() => safeGenomeParse(invalidOperation), GenomeValidationError);
});

test('should safely execute valid genomes', () => {
  const genome = {
    version: '25.1.0',
    patterns: [
      { operation: 'extract', target: '*.js' },
      { operation: 'hash', options: { algorithm: 'sha256' } }
    ]
  };
  const result = executeGenome(genome);
  assertEqual(result.summary.successful, 2);
  assertEqual(result.summary.failed, 0);
});

test('should handle Buffer input', () => {
  const genomeJson = JSON.stringify({ version: '25.1.0' });
  const buffer = Buffer.from(genomeJson);
  assertDoesNotThrow(() => safeGenomeParse(buffer));
});

test('should handle null input', () => {
  assertThrows(() => safeGenomeParse(null), GenomeParseError);
});

test('should handle undefined input', () => {
  assertThrows(() => safeGenomeParse(undefined), GenomeParseError);
});

test('should reject deeply nested malicious content', () => {
  const maliciousDeep = {
    version: '25.1.0',
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

test('should reject __dirname access', () => {
  const malicious = JSON.stringify({
    version: '25.1.0',
    patterns: [{
      operation: 'extract',
      options: { path: '__dirname + "/../../../etc/passwd"' }
    }]
  });
  assertThrows(() => safeGenomeParse(malicious), SecurityError);
});

test('should reject child_process references', () => {
  const malicious = JSON.stringify({
    version: '25.1.0',
    metadata: { description: 'uses child_process' }
  });
  assertThrows(() => safeGenomeParse(malicious), SecurityError);
});

// ============================================
// CLI VALIDATION TESTS
// ============================================

test('should reject null bytes in paths', () => {
  assertThrows(() => validatePath('/home/user\u0000/file.txt'), ValidationError);
});

test('should reject path traversal attempts', () => {
  assertThrows(() => validatePath('../../../etc/passwd'), ValidationError);
});

test('should reject system directory access', () => {
  assertThrows(() => validatePath('/proc/self/environ'), ValidationError);
  assertThrows(() => validatePath('/dev/null'), ValidationError);
  assertThrows(() => validatePath('/sys/kernel'), ValidationError);
});

test('should accept valid paths', () => {
  assertDoesNotThrow(() => validatePath('/home/user/project'));
  assertDoesNotThrow(() => validatePath('./src/lib'));
  assertDoesNotThrow(() => validatePath('src/index.js'));
});

test('should reject empty paths', () => {
  assertThrows(() => validatePath(''), ValidationError);
});

test('should reject overly long paths', () => {
  const longPath = '/a'.repeat(5000);
  assertThrows(() => validatePath(longPath), ValidationError);
});

test('should validate scan command options', () => {
  const validOptions = {
    path: '/home/user/project',
    exclude: ['node_modules']
  };
  assertDoesNotThrow(() => validateCommand('scan', validOptions));
});

test('should reject invalid max file size', () => {
  const invalidOptions = {
    path: '/home/user',
    maxFileSize: -1
  };
  assertThrows(() => validateCommand('scan', invalidOptions), ValidationError);
});

test('should reject unknown commands', () => {
  assertThrows(() => validateCommand('malicious', {}), ValidationError);
});

test('should sanitize strings - remove null bytes', () => {
  const result = sanitizeString('hello\u0000world');
  assertEqual(result, 'helloworld');
});

test('should sanitize strings - remove control characters', () => {
  const result = sanitizeString('hello\x01\x02world');
  assertEqual(result, 'helloworld');
});

test('should escape HTML by default', () => {
  const result = sanitizeString('<script>alert("xss")</script>');
  assertEqual(result, '&lt;script&gt;alert("xss")&lt;/script&gt;');
});

test('should enforce max length', () => {
  const longString = 'a'.repeat(15000);
  assertThrows(() => sanitizeString(longString, { maxLength: 10000 }), ValidationError);
});

// ============================================
// RUN TESTS
// ============================================

async function runTests() {
  console.log('🔒 LLMemory-Palace Security Test Suite v25.1.0\n');
  console.log('═'.repeat(60));
  console.log('');
  
  for (const { name, fn } of tests) {
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
  
  console.log('');
  console.log('═'.repeat(60));
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  console.log('═'.repeat(60));
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
