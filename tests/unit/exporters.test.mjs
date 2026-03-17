/**
 * Unit tests for Exporters module (YAML and MessagePack)
 * Task 006: Export Formats
 * 
 * Tests cover:
 * - YAML export/import
 * - MessagePack export/import
 * - Format detection
 */

import { exportToYAML, importFromYAML, validatePalaceData } from '../../lib/exporters/yaml-exporter.js';
import { exportToMessagePack, importFromMessagePack, detectFormat } from '../../lib/exporters/messagepack-exporter.js';

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

function assertThrows(fn, msg = '') {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  if (!threw) {
    throw new Error(`${msg} Expected function to throw`);
  }
}

// Sample palace data for testing
const samplePalace = {
  version: '25.0.0',
  name: 'test-project',
  created: '2024-01-01T00:00:00.000Z',
  stats: {
    files: 10,
    lines: 1000,
    size: 50000
  },
  config: {
    compressionLevel: 3,
    framework: 'Express'
  },
  files: [
    {
      path: 'src/index.js',
      content: 'console.log("Hello");',
      language: 'JavaScript',
      lines: 1,
      hash: 'abc123'
    }
  ],
  patterns: [
    {
      name: 'CRUD_ENTITY',
      template: 'function {action}{entity}() {}',
      instances: []
    }
  ],
  flows: [
    {
      name: 'userAuth',
      steps: ['validate', 'authenticate', 'respond']
    }
  ],
  entities: [
    {
      name: 'User',
      type: 'model',
      file: 'models/user.js'
    }
  ]
};

// ============================================
// YAML Export Tests
// ============================================

test('YAML export: should export palace to YAML string', () => {
  const yaml = exportToYAML(samplePalace);
  
  assertTrue(typeof yaml === 'string', 'Should return string');
  assertContains(yaml, 'palace:', 'Should have palace key');
  assertContains(yaml, 'version:', 'Should have version');
  assertContains(yaml, 'test-project', 'Should have project name');
});

test('YAML export: should include all palace fields', () => {
  const yaml = exportToYAML(samplePalace);
  
  assertContains(yaml, 'files:', 'Should have files');
  assertContains(yaml, 'patterns:', 'Should have patterns');
  assertContains(yaml, 'flows:', 'Should have flows');
  assertContains(yaml, 'entities:', 'Should have entities');
  assertContains(yaml, 'stats:', 'Should have stats');
  assertContains(yaml, 'config:', 'Should have config');
});

test('YAML export: should handle empty palace', () => {
  const emptyPalace = {
    version: '25.0.0',
    name: 'empty',
    files: [],
    patterns: [],
    flows: [],
    entities: []
  };
  
  const yaml = exportToYAML(emptyPalace);
  
  assertTrue(typeof yaml === 'string', 'Should return string');
  assertContains(yaml, 'palace:', 'Should have palace key');
});

test('YAML export: should throw for invalid input', () => {
  assertThrows(() => exportToYAML(null), 'Should throw for null');
  assertThrows(() => exportToYAML('string'), 'Should throw for string');
  assertThrows(() => exportToYAML(123), 'Should throw for number');
});

test('YAML export: should include header comments', () => {
  const yaml = exportToYAML(samplePalace);
  
  assertContains(yaml, '# LLMemory-Palace', 'Should have header comment');
  assertContains(yaml, '# Generated:', 'Should have timestamp comment');
});

// ============================================
// YAML Import Tests
// ============================================

test('YAML import: should import palace from YAML string', () => {
  const yaml = exportToYAML(samplePalace);
  const imported = importFromYAML(yaml);
  
  assertEqual(imported.version, samplePalace.version, 'Version should match');
  assertEqual(imported.name, samplePalace.name, 'Name should match');
});

test('YAML import: should preserve arrays', () => {
  const yaml = exportToYAML(samplePalace);
  const imported = importFromYAML(yaml);
  
  assertTrue(Array.isArray(imported.files), 'Files should be array');
  assertTrue(Array.isArray(imported.patterns), 'Patterns should be array');
  assertTrue(Array.isArray(imported.flows), 'Flows should be array');
  assertTrue(Array.isArray(imported.entities), 'Entities should be array');
});

test('YAML import: should preserve nested objects', () => {
  const yaml = exportToYAML(samplePalace);
  const imported = importFromYAML(yaml);
  
  assertEqual(imported.stats.files, 10, 'Stats.files should match');
  assertEqual(imported.config.framework, 'Express', 'Config.framework should match');
});

test('YAML import: should throw for invalid input', () => {
  assertThrows(() => importFromYAML(null), 'Should throw for null');
  assertThrows(() => importFromYAML(123), 'Should throw for number');
  assertThrows(() => importFromYAML({}), 'Should throw for object');
});

test('YAML import: should handle empty YAML', () => {
  const imported = importFromYAML('palace:');
  
  assertTrue(typeof imported === 'object', 'Should return object');
  assertTrue(Array.isArray(imported.files), 'Should have files array');
});

// ============================================
// MessagePack Export Tests
// ============================================

test('MessagePack export: should export palace to Buffer', () => {
  const buffer = exportToMessagePack(samplePalace);
  
  assertTrue(Buffer.isBuffer(buffer), 'Should return Buffer');
  assertTrue(buffer.length > 0, 'Buffer should not be empty');
});

test('MessagePack export: should produce consistent output', () => {
  const buffer1 = exportToMessagePack(samplePalace);
  const buffer2 = exportToMessagePack(samplePalace);
  
  assertEqual(buffer1.length, buffer2.length, 'Buffers should have same length');
});

test('MessagePack export: should handle empty palace', () => {
  const emptyPalace = {
    version: '25.0.0',
    name: 'empty',
    files: [],
    patterns: [],
    flows: [],
    entities: []
  };
  
  const buffer = exportToMessagePack(emptyPalace);
  
  assertTrue(Buffer.isBuffer(buffer), 'Should return Buffer');
  assertTrue(buffer.length > 0, 'Buffer should not be empty');
});

test('MessagePack export: should throw for invalid input', () => {
  assertThrows(() => exportToMessagePack(null), 'Should throw for null');
  assertThrows(() => exportToMessagePack('string'), 'Should throw for string');
  assertThrows(() => exportToMessagePack(123), 'Should throw for number');
});

test('MessagePack export: should handle special characters', () => {
  const specialPalace = {
    ...samplePalace,
    name: 'test-日本語-🎉',
    files: [{
      path: 'src/special.js',
      content: '// Unicode: 你好世界 🌍',
      language: 'JavaScript',
      lines: 1,
      hash: 'xyz789'
    }]
  };
  
  const buffer = exportToMessagePack(specialPalace);
  assertTrue(Buffer.isBuffer(buffer), 'Should handle special characters');
});

// ============================================
// MessagePack Import Tests
// ============================================

test('MessagePack import: should import palace from Buffer', () => {
  const buffer = exportToMessagePack(samplePalace);
  const imported = importFromMessagePack(buffer);
  
  assertEqual(imported.version, samplePalace.version, 'Version should match');
  assertEqual(imported.name, samplePalace.name, 'Name should match');
});

test('MessagePack import: should preserve arrays', () => {
  const buffer = exportToMessagePack(samplePalace);
  const imported = importFromMessagePack(buffer);
  
  assertTrue(Array.isArray(imported.files), 'Files should be array');
  assertTrue(Array.isArray(imported.patterns), 'Patterns should be array');
  assertTrue(Array.isArray(imported.flows), 'Flows should be array');
  assertTrue(Array.isArray(imported.entities), 'Entities should be array');
});

test('MessagePack import: should preserve nested objects', () => {
  const buffer = exportToMessagePack(samplePalace);
  const imported = importFromMessagePack(buffer);
  
  assertEqual(imported.stats.files, 10, 'Stats.files should match');
  assertEqual(imported.config.framework, 'Express', 'Config.framework should match');
});

test('MessagePack import: should throw for invalid input', () => {
  assertThrows(() => importFromMessagePack(null), 'Should throw for null');
  assertThrows(() => importFromMessagePack('string'), 'Should throw for string');
  assertThrows(() => importFromMessagePack({}), 'Should throw for object');
});

test('MessagePack import: should preserve special characters', () => {
  const specialPalace = {
    ...samplePalace,
    name: 'test-日本語-🎉'
  };
  
  const buffer = exportToMessagePack(specialPalace);
  const imported = importFromMessagePack(buffer);
  
  assertEqual(imported.name, 'test-日本語-🎉', 'Should preserve special characters');
});

// ============================================
// Format Detection Tests
// ============================================

test('Format detection: should detect YAML format', () => {
  const yaml = exportToYAML(samplePalace);
  const format = detectFormat(yaml);
  
  assertEqual(format, 'yaml', 'Should detect YAML format');
});

test('Format detection: should detect MessagePack format from Buffer', () => {
  const buffer = exportToMessagePack(samplePalace);
  const format = detectFormat(buffer);
  
  assertEqual(format, 'msgpack', 'Should detect MessagePack format');
});

test('Format detection: should detect JSON format', () => {
  const json = JSON.stringify(samplePalace);
  const format = detectFormat(json);
  
  assertEqual(format, 'json', 'Should detect JSON format');
});

test('Format detection: should return unknown for invalid input', () => {
  const format = detectFormat('not a valid format');
  
  assertEqual(format, 'unknown', 'Should return unknown');
});

test('Format detection: should handle Buffer with YAML content', () => {
  const yaml = exportToYAML(samplePalace);
  const buffer = Buffer.from(yaml, 'utf8');
  const format = detectFormat(buffer);
  
  assertEqual(format, 'yaml', 'Should detect YAML from Buffer');
});

test('Format detection: should handle Buffer with JSON content', () => {
  const json = JSON.stringify(samplePalace);
  const buffer = Buffer.from(json, 'utf8');
  const format = detectFormat(buffer);
  
  assertEqual(format, 'json', 'Should detect JSON from Buffer');
});

// ============================================
// Round-trip Tests
// ============================================

test('Round-trip: YAML export then import should preserve data', () => {
  const yaml = exportToYAML(samplePalace);
  const imported = importFromYAML(yaml);
  
  assertEqual(imported.version, samplePalace.version, 'Version should match');
  assertEqual(imported.name, samplePalace.name, 'Name should match');
  assertEqual(imported.files.length, samplePalace.files.length, 'Files length should match');
  assertEqual(imported.patterns.length, samplePalace.patterns.length, 'Patterns length should match');
});

test('Round-trip: MessagePack export then import should preserve data', () => {
  const buffer = exportToMessagePack(samplePalace);
  const imported = importFromMessagePack(buffer);
  
  assertEqual(imported.version, samplePalace.version, 'Version should match');
  assertEqual(imported.name, samplePalace.name, 'Name should match');
  assertEqual(imported.files.length, samplePalace.files.length, 'Files length should match');
  assertEqual(imported.patterns.length, samplePalace.patterns.length, 'Patterns length should match');
});

test('Round-trip: should preserve numbers', () => {
  const palace = {
    ...samplePalace,
    stats: {
      files: 42,
      lines: 123456,
      size: 9876543210,
      ratio: 3.14159
    }
  };
  
  // YAML round-trip
  const yamlImported = importFromYAML(exportToYAML(palace));
  assertEqual(yamlImported.stats.files, 42, 'YAML should preserve small integer');
  assertEqual(yamlImported.stats.lines, 123456, 'YAML should preserve large integer');
  
  // MessagePack round-trip
  const msgpackImported = importFromMessagePack(exportToMessagePack(palace));
  assertEqual(msgpackImported.stats.files, 42, 'MessagePack should preserve small integer');
  assertEqual(msgpackImported.stats.lines, 123456, 'MessagePack should preserve large integer');
  assertEqual(msgpackImported.stats.ratio, 3.14159, 'MessagePack should preserve float');
});

test('Round-trip: should preserve booleans and nulls', () => {
  const palace = {
    ...samplePalace,
    config: {
      enabled: true,
      disabled: false,
      nullable: null
    }
  };
  
  // MessagePack round-trip (better for primitives)
  const imported = importFromMessagePack(exportToMessagePack(palace));
  assertEqual(imported.config.enabled, true, 'Should preserve true');
  assertEqual(imported.config.disabled, false, 'Should preserve false');
  assertEqual(imported.config.nullable, null, 'Should preserve null');
});

// ============================================
// Validation Tests
// ============================================

test('Validation: should validate correct palace data', () => {
  assertTrue(validatePalaceData(samplePalace), 'Should validate sample palace');
});

test('Validation: should reject null', () => {
  assertFalse(validatePalaceData(null), 'Should reject null');
});

test('Validation: should reject non-objects', () => {
  assertFalse(validatePalaceData('string'), 'Should reject string');
  assertFalse(validatePalaceData(123), 'Should reject number');
  assertFalse(validatePalaceData([]), 'Should reject array');
});

test('Validation: should reject missing version', () => {
  const invalid = { ...samplePalace, version: null };
  assertFalse(validatePalaceData(invalid), 'Should reject missing version');
});

test('Validation: should reject missing name', () => {
  const invalid = { ...samplePalace, name: null };
  assertFalse(validatePalaceData(invalid), 'Should reject missing name');
});

test('Validation: should reject missing files array', () => {
  const invalid = { ...samplePalace, files: null };
  assertFalse(validatePalaceData(invalid), 'Should reject missing files');
});

// ============================================
// Performance Tests
// ============================================

test('Performance: YAML export should handle large data', () => {
  const largePalace = {
    version: '25.0.0',
    name: 'large-project',
    files: Array(100).fill(null).map((_, i) => ({
      path: `src/file${i}.js`,
      content: `// File ${i}\nconsole.log("Content ${i}");`,
      language: 'JavaScript',
      lines: 2,
      hash: `hash${i}`
    })),
    patterns: [],
    flows: [],
    entities: []
  };
  
  const start = Date.now();
  const yaml = exportToYAML(largePalace);
  const elapsed = Date.now() - start;
  
  assertTrue(typeof yaml === 'string', 'Should produce YAML');
  assertTrue(elapsed < 1000, 'Should complete in under 1 second');
});

test('Performance: MessagePack export should handle large data', () => {
  const largePalace = {
    version: '25.0.0',
    name: 'large-project',
    files: Array(100).fill(null).map((_, i) => ({
      path: `src/file${i}.js`,
      content: `// File ${i}\nconsole.log("Content ${i}");`,
      language: 'JavaScript',
      lines: 2,
      hash: `hash${i}`
    })),
    patterns: [],
    flows: [],
    entities: []
  };
  
  const start = Date.now();
  const buffer = exportToMessagePack(largePalace);
  const elapsed = Date.now() - start;
  
  assertTrue(Buffer.isBuffer(buffer), 'Should produce Buffer');
  assertTrue(elapsed < 1000, 'Should complete in under 1 second');
});

// ============================================
// Run Tests
// ============================================

console.log('Running Exporters unit tests...\n');

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
