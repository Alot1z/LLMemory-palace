/**
 * @fileoverview CLI Validation Test Suite
 * @version 2.6.0
 * @description Tests for CLI input validation, sanitization, and path security
 */

import {
  validatePath,
  validateCommand,
  sanitizeString,
  sanitizeFilename,
  validateNumber,
  isPathSafe,
  ValidationError,
  PathSchema,
  ScanOptionsSchema,
  PackOptionsSchema,
  MergeOptionsSchema
} from '../lib/cli-validator.js';

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

// ============================================
// SECTION 1: PATH VALIDATION
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('📁 SECTION 1: PATH VALIDATION');
console.log('═'.repeat(60) + '\n');

test('should reject null bytes in paths', () => {
  assertThrows(() => validatePath('/home/user\u0000/file.txt'), ValidationError);
});

test('should reject path traversal attempts', () => {
  assertThrows(() => validatePath('../../../etc/passwd'), ValidationError);
});

test('should reject path traversal in middle of path', () => {
  assertThrows(() => validatePath('/home/../etc/passwd'), ValidationError);
});

test('should reject path traversal with encoded dots', () => {
  assertThrows(() => validatePath('/home/%2e%2e/etc/passwd'), ValidationError);
});

test('should reject system directory access /proc', () => {
  assertThrows(() => validatePath('/proc/self/environ'), ValidationError);
});

test('should reject system directory access /dev', () => {
  assertThrows(() => validatePath('/dev/null'), ValidationError);
});

test('should reject system directory access /sys', () => {
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

test('should reject whitespace-only paths', () => {
  assertThrows(() => validatePath('   '), ValidationError);
});

test('should reject overly long paths', () => {
  const longPath = '/a'.repeat(5000);
  assertThrows(() => validatePath(longPath), ValidationError);
});

test('should reject control characters in paths', () => {
  assertThrows(() => validatePath('/home/\x01user'), ValidationError);
  assertThrows(() => validatePath('/home/user\x1f'), ValidationError);
});

test('should reject shell metacharacters in paths', () => {
  assertThrows(() => validatePath('/home/user|cat'), ValidationError);
  assertThrows(() => validatePath('/home/user;ls'), ValidationError);
  assertThrows(() => validatePath('/home/user&whoami'), ValidationError);
});

test('should normalize paths', () => {
  const result = validatePath('/home/user/../project');
  assertTrue(result.includes('/home/project') || result.includes('/home/user'));
});

// ============================================
// SECTION 2: COMMAND VALIDATION
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('🖥️  SECTION 2: COMMAND VALIDATION');
console.log('═'.repeat(60) + '\n');

test('should validate scan command options', () => {
  const validOptions = {
    path: '/home/user/project',
    exclude: ['node_modules']
  };
  assertDoesNotThrow(() => validateCommand('scan', validOptions));
});

test('should reject invalid max file size (negative)', () => {
  const invalidOptions = {
    path: '/home/user',
    maxFileSize: -1
  };
  assertThrows(() => validateCommand('scan', invalidOptions), ValidationError);
});

test('should reject invalid max file size (too large)', () => {
  const invalidOptions = {
    path: '/home/user',
    maxFileSize: 1000 * 1024 * 1024 // 1GB > 100MB limit
  };
  assertThrows(() => validateCommand('scan', invalidOptions), ValidationError);
});

test('should reject unknown commands', () => {
  assertThrows(() => validateCommand('malicious', {}), ValidationError);
  assertThrows(() => validateCommand('eval', {}), ValidationError);
  assertThrows(() => validateCommand('exec', {}), ValidationError);
});

test('should validate pack command', () => {
  const validPack = {
    path: '/home/user/project',
    output: 'output.pack.json'
  };
  assertDoesNotThrow(() => validateCommand('pack', validPack));
});

test('should validate merge command', () => {
  const validMerge = {
    packFile: 'pack.json',
    output: '/home/user/output'
  };
  assertDoesNotThrow(() => validateCommand('merge', validMerge));
});

test('should reject merge without .json extension', () => {
  const invalidMerge = {
    packFile: 'pack.txt',
    output: '/home/user/output'
  };
  assertThrows(() => validateCommand('merge', invalidMerge), ValidationError);
});

test('should validate analyze command', () => {
  const validAnalyze = {
    path: '/home/user/project',
    type: 'security'
  };
  assertDoesNotThrow(() => validateCommand('analyze', validAnalyze));
});

test('should reject invalid analyze type', () => {
  const invalidAnalyze = {
    path: '/home/user/project',
    type: 'malicious_type'
  };
  assertThrows(() => validateCommand('analyze', invalidAnalyze), ValidationError);
});

// ============================================
// SECTION 3: STRING SANITIZATION
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('🔤 SECTION 3: STRING SANITIZATION');
console.log('═'.repeat(60) + '\n');

test('should remove null bytes', () => {
  const result = sanitizeString('hello\u0000world');
  assertEqual(result, 'helloworld');
});

test('should remove control characters', () => {
  const result = sanitizeString('hello\x01\x02world');
  assertEqual(result, 'helloworld');
});

test('should escape HTML by default', () => {
  const result = sanitizeString('<script>alert("xss")</script>');
  assertContains(result, '&lt;script&gt;');
});

test('should not escape HTML when allowed', () => {
  const result = sanitizeString('<b>bold</b>', { allowHtml: true });
  assertEqual(result, '<b>bold</b>');
});

test('should enforce max length', () => {
  const longString = 'a'.repeat(15000);
  assertThrows(() => sanitizeString(longString, { maxLength: 10000 }), ValidationError);
});

test('should allow custom max length', () => {
  const shortString = 'a'.repeat(100);
  assertDoesNotThrow(() => sanitizeString(shortString, { maxLength: 50 }));
});

test('should remove newlines when not allowed', () => {
  const result = sanitizeString('hello\nworld', { allowNewlines: false });
  assertEqual(result, 'helloworld');
});

test('should keep newlines when allowed', () => {
  const result = sanitizeString('hello\nworld', { allowNewlines: true });
  assertEqual(result, 'hello\nworld');
});

test('should remove special characters when not allowed', () => {
  const result = sanitizeString('hello@world!', { allowSpecialChars: false });
  assertEqual(result, 'helloworld');
});

test('should reject non-string input', () => {
  assertThrows(() => sanitizeString(123), ValidationError);
  assertThrows(() => sanitizeString(null), ValidationError);
  assertThrows(() => sanitizeString(undefined), ValidationError);
});

function assertContains(str, substr) {
  if (!str.includes(substr)) {
    throw new Error(`Expected "${str}" to contain "${substr}"`);
  }
}

// ============================================
// SECTION 4: FILENAME SANITIZATION
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('📄 SECTION 4: FILENAME SANITIZATION');
console.log('═'.repeat(60) + '\n');

test('should sanitize path separators', () => {
  const result = sanitizeFilename('path/to/file.txt');
  assertEqual(result.includes('/'), false);
  assertEqual(result.includes('\\'), false);
});

test('should sanitize dangerous characters', () => {
  const result = sanitizeFilename('file<>:"|?*.txt');
  assertEqual(result.includes('<'), false);
  assertEqual(result.includes('>'), false);
  assertEqual(result.includes(':'), false);
  assertEqual(result.includes('|'), false);
  assertEqual(result.includes('?'), false);
  assertEqual(result.includes('*'), false);
});

test('should sanitize path traversal', () => {
  const result = sanitizeFilename('../../../etc/passwd');
  assertEqual(result.includes('..'), false);
});

test('should remove control characters', () => {
  const result = sanitizeFilename('file\x01name.txt');
  assertEqual(result.includes('\x01'), false);
});

test('should handle non-string input', () => {
  assertEqual(sanitizeFilename(123), '');
  assertEqual(sanitizeFilename(null), '');
  assertEqual(sanitizeFilename(undefined), '');
});

test('should preserve valid filenames', () => {
  const result = sanitizeFilename('valid_file-name.txt');
  assertEqual(result, 'valid_file-name.txt');
});

// ============================================
// SECTION 5: NUMBER VALIDATION
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('🔢 SECTION 5: NUMBER VALIDATION');
console.log('═'.repeat(60) + '\n');

test('should validate number range', () => {
  assertDoesNotThrow(() => validateNumber(5, { min: 0, max: 10 }));
});

test('should reject number below minimum', () => {
  assertThrows(() => validateNumber(-1, { min: 0 }), ValidationError);
});

test('should reject number above maximum', () => {
  assertThrows(() => validateNumber(11, { max: 10 }), ValidationError);
});

test('should validate integer requirement', () => {
  assertDoesNotThrow(() => validateNumber(5, { integer: true }));
  assertThrows(() => validateNumber(5.5, { integer: true }), ValidationError);
});

test('should reject NaN', () => {
  assertThrows(() => validateNumber(NaN), ValidationError);
});

test('should reject non-numbers', () => {
  assertThrows(() => validateNumber('5'), ValidationError);
  assertThrows(() => validateNumber(null), ValidationError);
});

test('should accept valid negative numbers', () => {
  assertDoesNotThrow(() => validateNumber(-5, { min: -10 }));
});

// ============================================
// SECTION 6: PATH SAFETY UTILITY
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('🛡️  SECTION 6: PATH SAFETY UTILITY');
console.log('═'.repeat(60) + '\n');

test('should identify safe paths', () => {
  assertTrue(isPathSafe('/home/user/file.txt'));
  assertTrue(isPathSafe('./src/index.js'));
  assertTrue(isPathSafe('relative/path'));
});

test('should identify unsafe paths (traversal)', () => {
  assertFalse(isPathSafe('../../../etc/passwd'));
  assertFalse(isPathSafe('/home/../etc'));
});

test('should identify unsafe paths (null bytes)', () => {
  assertFalse(isPathSafe('/home/user\u0000/file'));
});

test('should identify unsafe paths (shell metacharacters)', () => {
  assertFalse(isPathSafe('/home/user|cat'));
  assertFalse(isPathSafe('/home/user;ls'));
  assertFalse(isPathSafe('/home/user&whoami'));
  assertFalse(isPathSafe('$(whoami)'));
  assertFalse(isPathSafe('`whoami`'));
});

test('should reject non-strings', () => {
  assertFalse(isPathSafe(123));
  assertFalse(isPathSafe(null));
  assertFalse(isPathSafe(undefined));
});

// ============================================
// SECTION 7: SCHEMA VALIDATION
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('📋 SECTION 7: SCHEMA VALIDATION');
console.log('═'.repeat(60) + '\n');

test('should validate path schema directly', () => {
  const result = PathSchema.safeParse('/home/user/file.txt');
  assertTrue(result.success);
});

test('should reject invalid path in schema', () => {
  const result = PathSchema.safeParse('../../../etc/passwd');
  assertFalse(result.success);
});

test('should validate scan options schema', () => {
  const valid = {
    path: '/home/user/project',
    exclude: ['node_modules'],
    maxFileSize: 10000000
  };
  const result = ScanOptionsSchema.safeParse(valid);
  assertTrue(result.success);
});

test('should reject invalid scan options', () => {
  const invalid = {
    path: '../../../etc',
    maxFileSize: -1
  };
  const result = ScanOptionsSchema.safeParse(invalid);
  assertFalse(result.success);
});

test('should validate pack options schema', () => {
  const valid = {
    path: '/home/user/project',
    output: 'output.pack.json',
    compress: true
  };
  const result = PackOptionsSchema.safeParse(valid);
  assertTrue(result.success);
});

test('should validate merge options schema', () => {
  const valid = {
    packFile: 'package.json',
    output: '/home/user/output',
    force: false
  };
  const result = MergeOptionsSchema.safeParse(valid);
  assertTrue(result.success);
});

// ============================================
// SECTION 8: ERROR HANDLING
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('⚠️  SECTION 8: ERROR HANDLING');
console.log('═'.repeat(60) + '\n');

test('should create ValidationError with message', () => {
  const error = new ValidationError('Test error');
  assertEqual(error.message, 'Test error');
  assertEqual(error.name, 'ValidationError');
  assertEqual(error.code, 'VALIDATION_ERROR');
});

test('should create ValidationError with details', () => {
  const details = [{ path: 'field', message: 'Invalid value' }];
  const error = new ValidationError('Test error', details);
  assertEqual(error.details.length, 1);
  assertEqual(error.details[0].path, 'field');
});

test('should serialize ValidationError to JSON', () => {
  const error = new ValidationError('Test error', [
    { path: 'field', message: 'Invalid' }
  ]);
  const json = error.toJSON();
  assertEqual(json.name, 'ValidationError');
  assertEqual(json.message, 'Test error');
  assertEqual(json.details.length, 1);
});

test('should format ValidationError as string', () => {
  const error = new ValidationError('Test error', [
    { path: 'field1', message: 'Invalid' },
    { path: 'field2', message: 'Required' }
  ]);
  const str = error.toString();
  assertContains(str, 'ValidationError');
  assertContains(str, 'field1');
  assertContains(str, 'field2');
});

// ============================================
// RUN ALL TESTS
// ============================================

async function runTests() {
  console.log('\n' + '═'.repeat(60));
  console.log('🧪 CLI Validation Test Suite v2.6.0');
  console.log('═'.repeat(60) + '\n');
  
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
  
  console.log('\n' + '═'.repeat(60));
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  console.log('═'.repeat(60));
  
  if (failed > 0) {
    console.log('\n❌ CLI VALIDATION TESTS FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ All CLI validation tests passed');
    process.exit(0);
  }
}

runTests();
