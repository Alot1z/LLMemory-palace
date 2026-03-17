/**
 * Unit tests for BehaviorGraph (flows) module
 * 
 * Tests cover:
 * - Flow registration and retrieval
 * - Flow tracing and diagrams
 * - Code generation from flows
 * - Flow extraction from code
 * - Import/export functionality
 */

import { BehaviorGraph } from '../../lib/flows.js';

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

test('constructor: should create instance with built-in flows', () => {
    const graph = new BehaviorGraph();
    assertTrue(graph instanceof BehaviorGraph, 'Should be BehaviorGraph instance');
    assertTrue(graph.size > 0, 'Should have built-in flows');
});

test('constructor: should load AUTH_LOGIN flow', () => {
    const graph = new BehaviorGraph();
    assertTrue(graph.has('AUTH_LOGIN'), 'Should have AUTH_LOGIN flow');
});

test('constructor: should load CRUD flows', () => {
    const graph = new BehaviorGraph();
    assertTrue(graph.has('CRUD_CREATE'), 'Should have CRUD_CREATE flow');
    assertTrue(graph.has('CRUD_READ'), 'Should have CRUD_READ flow');
    assertTrue(graph.has('CRUD_UPDATE'), 'Should have CRUD_UPDATE flow');
    assertTrue(graph.has('CRUD_DELETE'), 'Should have CRUD_DELETE flow');
});

// ============================================
// register Method Tests
// ============================================

test('register: should add new flow', () => {
    const graph = new BehaviorGraph();
    const initialSize = graph.size;
    
    graph.register('MY_FLOW', {
        steps: ['step1', 'step2', 'step3'],
        returns: 'result'
    });
    
    assertTrue(graph.has('MY_FLOW'), 'Should have new flow');
    assertEqual(graph.size, initialSize + 1, 'Size should increase');
});

test('register: should store flow with hash', () => {
    const graph = new BehaviorGraph();
    
    graph.register('HASH_FLOW', {
        steps: ['a', 'b'],
        returns: 'value'
    });
    
    const flow = graph.get('HASH_FLOW');
    assertTrue(flow.hash !== undefined, 'Should have hash');
    assertEqual(flow.hash.length, 8, 'Hash should be 8 characters');
});

test('register: should store flow metadata', () => {
    const graph = new BehaviorGraph();
    
    graph.register('META_FLOW', {
        steps: ['validate', 'process'],
        returns: 'data',
        version: 'v1.0',
        description: 'Test flow',
        errors: {
            validation_failed: { status: 400, message: 'Invalid' }
        }
    });
    
    const flow = graph.get('META_FLOW');
    assertEqual(flow.version, 'v1.0', 'Should have version');
    assertEqual(flow.description, 'Test flow', 'Should have description');
    assertTrue(flow.errors !== undefined, 'Should have errors');
});

// ============================================
// get Method Tests
// ============================================

test('get: should return flow by name', () => {
    const graph = new BehaviorGraph();
    const flow = graph.get('AUTH_LOGIN');
    
    assertTrue(flow !== undefined, 'Should return flow');
    assertTrue(Array.isArray(flow.steps), 'Should have steps array');
    assertEqual(flow.steps.length, 5, 'AUTH_LOGIN should have 5 steps');
});

test('get: should return undefined for unknown flow', () => {
    const graph = new BehaviorGraph();
    const flow = graph.get('UNKNOWN_FLOW');
    
    assertEqual(flow, undefined, 'Should return undefined');
});

// ============================================
// has Method Tests
// ============================================

test('has: should return true for existing flow', () => {
    const graph = new BehaviorGraph();
    assertTrue(graph.has('AUTH_LOGIN'), 'Should have AUTH_LOGIN');
});

test('has: should return false for unknown flow', () => {
    const graph = new BehaviorGraph();
    assertFalse(graph.has('NONEXISTENT'), 'Should not have NONEXISTENT');
});

// ============================================
// trace Method Tests
// ============================================

test('trace: should return human-readable trace', () => {
    const graph = new BehaviorGraph();
    const trace = graph.trace('AUTH_LOGIN');
    
    assertContains(trace, 'AUTH_LOGIN', 'Should contain flow name');
    assertContains(trace, 'Hash:', 'Should show hash');
    assertContains(trace, 'Steps:', 'Should show steps');
});

test('trace: should show step numbers', () => {
    const graph = new BehaviorGraph();
    const trace = graph.trace('AUTH_LOGIN');
    
    assertContains(trace, '1.', 'Should have step 1');
    assertContains(trace, '2.', 'Should have step 2');
});

test('trace: should show errors if present', () => {
    const graph = new BehaviorGraph();
    const trace = graph.trace('AUTH_LOGIN');
    
    assertContains(trace, 'Errors:', 'Should show errors section');
});

test('trace: should handle unknown flow gracefully', () => {
    const graph = new BehaviorGraph();
    const trace = graph.trace('UNKNOWN_FLOW');
    
    assertContains(trace, 'not found', 'Should indicate flow not found');
});

// ============================================
// diagram Method Tests
// ============================================

test('diagram: should generate ASCII diagram', () => {
    const graph = new BehaviorGraph();
    const diagram = graph.diagram('AUTH_LOGIN');
    
    assertTrue(diagram !== null, 'Should return diagram');
    assertContains(diagram, 'AUTH_LOGIN', 'Should contain flow name');
    assertContains(diagram, '┌', 'Should have box characters');
    assertContains(diagram, '│', 'Should have box characters');
    assertContains(diagram, '↓', 'Should have arrows');
});

test('diagram: should show all steps', () => {
    const graph = new BehaviorGraph();
    
    graph.register('DIAGRAM_TEST', {
        steps: ['first', 'second', 'third'],
        returns: 'done'
    });
    
    const diagram = graph.diagram('DIAGRAM_TEST');
    
    assertContains(diagram, 'first', 'Should show first step');
    assertContains(diagram, 'second', 'Should show second step');
    assertContains(diagram, 'third', 'Should show third step');
});

test('diagram: should show return value', () => {
    const graph = new BehaviorGraph();
    const diagram = graph.diagram('AUTH_LOGIN');
    
    assertContains(diagram, '→', 'Should have return arrow');
    assertContains(diagram, 'token', 'Should show return value');
});

test('diagram: should return null for unknown flow', () => {
    const graph = new BehaviorGraph();
    const diagram = graph.diagram('UNKNOWN_FLOW');
    
    assertEqual(diagram, null, 'Should return null');
});

// ============================================
// generateCode Method Tests
// ============================================

test('generateCode: should generate async function', () => {
    const graph = new BehaviorGraph();
    const code = graph.generateCode('AUTH_LOGIN');
    
    assertTrue(code !== null, 'Should return code');
    assertContains(code, 'async function', 'Should be async function');
});

test('generateCode: should include all steps', () => {
    const graph = new BehaviorGraph();
    
    graph.register('CODE_TEST', {
        steps: ['validate', 'process', 'save'],
        returns: 'result'
    });
    
    const code = graph.generateCode('CODE_TEST');
    
    assertContains(code, 'validate', 'Should include validate step');
    assertContains(code, 'process', 'Should include process step');
    assertContains(code, 'save', 'Should include save step');
});

test('generateCode: should include return statement', () => {
    const graph = new BehaviorGraph();
    const code = graph.generateCode('AUTH_LOGIN');
    
    assertContains(code, 'return', 'Should have return statement');
    assertContains(code, 'token', 'Should return token');
});

test('generateCode: should return null for unknown flow', () => {
    const graph = new BehaviorGraph();
    const code = graph.generateCode('UNKNOWN_FLOW');
    
    assertEqual(code, null, 'Should return null');
});

// ============================================
// extractFlows Method Tests
// ============================================

test('extractFlows: should extract async function flows', () => {
    const graph = new BehaviorGraph();
    const code = `
        async function processData() {
            await validate();
            await transform();
            await save();
        }
    `;
    
    const flows = graph.extractFlows(code, 'javascript');
    
    assertTrue(flows.some(f => f.name === 'processData'), 'Should find processData flow');
});

test('extractFlows: should extract steps from function body', () => {
    const graph = new BehaviorGraph();
    const code = `
        async function myFlow() {
            await step1();
            await step2();
            await step3();
        }
    `;
    
    const flows = graph.extractFlows(code, 'javascript');
    const flow = flows.find(f => f.name === 'myFlow');
    
    assertTrue(flow !== undefined, 'Should find flow');
    assertTrue(flow.steps.includes('step1'), 'Should have step1');
    assertTrue(flow.steps.includes('step2'), 'Should have step2');
    assertTrue(flow.steps.includes('step3'), 'Should have step3');
});

// ============================================
// list Method Tests
// ============================================

test('list: should return array of flow summaries', () => {
    const graph = new BehaviorGraph();
    const list = graph.list();
    
    assertTrue(Array.isArray(list), 'Should return array');
    assertTrue(list.length > 0, 'Should have flows');
    assertTrue(list[0].name !== undefined, 'Should have name');
    assertTrue(list[0].steps !== undefined, 'Should have step count');
    assertTrue(list[0].returns !== undefined, 'Should have returns');
});

// ============================================
// names Method Tests
// ============================================

test('names: should return all flow names', () => {
    const graph = new BehaviorGraph();
    const names = graph.names();
    
    assertTrue(Array.isArray(names), 'Should return array');
    assertTrue(names.includes('AUTH_LOGIN'), 'Should include AUTH_LOGIN');
    assertTrue(names.includes('CRUD_CREATE'), 'Should include CRUD_CREATE');
});

// ============================================
// delete Method Tests
// ============================================

test('delete: should remove flow', () => {
    const graph = new BehaviorGraph();
    
    graph.register('TEMP_FLOW', { steps: ['a'], returns: 'x' });
    assertTrue(graph.has('TEMP_FLOW'), 'Should have flow');
    
    const result = graph.delete('TEMP_FLOW');
    
    assertTrue(result, 'Should return true');
    assertFalse(graph.has('TEMP_FLOW'), 'Should not have flow');
});

test('delete: should return false for unknown flow', () => {
    const graph = new BehaviorGraph();
    
    const result = graph.delete('UNKNOWN_FLOW');
    
    assertFalse(result, 'Should return false');
});

// ============================================
// clear Method Tests
// ============================================

test('clear: should remove all flows', () => {
    const graph = new BehaviorGraph();
    
    graph.clear();
    
    assertEqual(graph.size, 0, 'Size should be 0');
    assertFalse(graph.has('AUTH_LOGIN'), 'Should not have built-in flows');
});

// ============================================
// Import/Export Tests
// ============================================

test('export: should export all flows', () => {
    const graph = new BehaviorGraph();
    
    const exported = graph.export();
    
    assertTrue(typeof exported === 'object', 'Should return object');
    assertTrue(exported['AUTH_LOGIN'] !== undefined, 'Should have AUTH_LOGIN');
});

test('import: should restore flows', () => {
    const graph1 = new BehaviorGraph();
    graph1.register('CUSTOM', { steps: ['a', 'b'], returns: 'x' });
    
    const exported = graph1.export();
    
    const graph2 = new BehaviorGraph();
    graph2.clear();
    graph2.import(exported);
    
    assertTrue(graph2.has('CUSTOM'), 'Should have imported flow');
});

// ============================================
// findForModule Method Tests
// ============================================

test('findForModule: should find flows for module', () => {
    const graph = new BehaviorGraph();
    
    const flows = graph.findForModule('auth');
    
    assertTrue(Array.isArray(flows), 'Should return array');
    assertTrue(flows.some(f => f.name.includes('AUTH')), 'Should find AUTH flows');
});

// ============================================
// Run Tests
// ============================================

console.log('Running BehaviorGraph (flows) unit tests...\n');

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
