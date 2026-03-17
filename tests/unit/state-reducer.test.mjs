/**
 * Unit tests for StateReducer module
 * 
 * Tests cover:
 * - createReducer factory function
 * - All action handlers (SCAN_START, SCAN_COMPLETE, FILE_ADD, FILE_CHANGE, FILE_REMOVE, PATTERN_REGISTER, FLOW_REGISTER, STATE_RESET)
 * - Immutable state updates
 * - StateReducer class interface
 */

import {
    StateReducer,
    createReducer,
    ActionTypes
} from '../../lib/state-reducer.js';

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

function assertContains(obj, key, msg = '') {
    if (!(key in obj)) {
        throw new Error(`${msg} Expected object to contain key "${key}"`);
    }
}

// ============================================
// createReducer Factory Tests
// ============================================

test('createReducer: should create a reducer function', () => {
    const reducer = createReducer();
    assertTrue(typeof reducer === 'function', 'createReducer should return a function');
});

test('createReducer: should return initial state for undefined action', () => {
    const customInitialState = { isScanning: false, files: {}, patterns: {} };
    const reducer = createReducer(customInitialState);
    const state = reducer(undefined, {});
    assertEqual(state.isScanning, false, 'Initial state should have isScanning false');
});

test('createReducer: should return current state for unknown action type', () => {
    const reducer = createReducer();
    const initialState = reducer(undefined, {});
    const newState = reducer(initialState, { type: 'UNKNOWN_ACTION' });
    assertEqual(newState, initialState, 'Unknown action should return unchanged state');
});

// ============================================
// SCAN_START Action Tests
// ============================================

test('SCAN_START: should set isScanning to true', () => {
    const reducer = createReducer();
    const state = reducer(undefined, { type: ActionTypes.SCAN_START });
    assertTrue(state.isScanning, 'isScanning should be true');
});

test('SCAN_START: should set scanStartTime', () => {
    const reducer = createReducer();
    const state = reducer(undefined, { type: ActionTypes.SCAN_START });
    assertTrue(typeof state.scanStartTime === 'number', 'scanStartTime should be a number');
});

test('SCAN_START: should use provided startTime from payload', () => {
    const customTime = 1234567890;
    const reducer = createReducer();
    const state = reducer(undefined, { 
        type: ActionTypes.SCAN_START, 
        payload: { startTime: customTime } 
    });
    assertEqual(state.scanStartTime, customTime, 'Should use provided startTime');
});

test('SCAN_START: should reset scanEndTime and lastScanDuration', () => {
    const reducer = createReducer({ 
        scanEndTime: 1000, 
        lastScanDuration: 500 
    });
    const state = reducer(undefined, { type: ActionTypes.SCAN_START });
    assertEqual(state.scanEndTime, null, 'scanEndTime should be null');
    assertEqual(state.lastScanDuration, null, 'lastScanDuration should be null');
});

// ============================================
// SCAN_COMPLETE Action Tests
// ============================================

test('SCAN_COMPLETE: should set isScanning to false', () => {
    const reducer = createReducer({ isScanning: true, scanStartTime: Date.now() - 1000 });
    const state = reducer(undefined, { type: ActionTypes.SCAN_COMPLETE });
    assertFalse(state.isScanning, 'isScanning should be false');
});

test('SCAN_COMPLETE: should calculate lastScanDuration', () => {
    const startTime = Date.now() - 1000;
    const reducer = createReducer({ isScanning: true, scanStartTime: startTime });
    const state = reducer(undefined, { type: ActionTypes.SCAN_COMPLETE });
    assertTrue(state.lastScanDuration > 0, 'lastScanDuration should be positive');
});

test('SCAN_COMPLETE: should use provided endTime from payload', () => {
    const startTime = 1000;
    const endTime = 2000;
    const reducer = createReducer({ isScanning: true, scanStartTime: startTime });
    const state = reducer(undefined, { 
        type: ActionTypes.SCAN_COMPLETE, 
        payload: { endTime } 
    });
    assertEqual(state.scanEndTime, endTime, 'Should use provided endTime');
    assertEqual(state.lastScanDuration, 1000, 'Duration should be endTime - startTime');
});

// ============================================
// FILE_ADD Action Tests
// ============================================

test('FILE_ADD: should add file to state', () => {
    const reducer = createReducer();
    const state = reducer(undefined, { 
        type: ActionTypes.FILE_ADD, 
        payload: { path: '/src/index.js', content: 'console.log(1)' } 
    });
    assertContains(state.files, '/src/index.js', 'Files should contain added file');
    assertEqual(state.files['/src/index.js'].status, 'added', 'File status should be added');
});

test('FILE_ADD: should increment totalFiles count', () => {
    const reducer = createReducer();
    const state = reducer(undefined, { 
        type: ActionTypes.FILE_ADD, 
        payload: { path: '/src/new.js' } 
    });
    assertEqual(state.metadata.totalFiles, 1, 'totalFiles should be 1');
});

test('FILE_ADD: should not increment totalFiles for existing file', () => {
    const reducer = createReducer({
        files: { '/src/existing.js': { status: 'added' } },
        metadata: { totalFiles: 1 }
    });
    const state = reducer(undefined, { 
        type: ActionTypes.FILE_ADD, 
        payload: { path: '/src/existing.js' } 
    });
    assertEqual(state.metadata.totalFiles, 1, 'totalFiles should remain 1');
});

test('FILE_ADD: should add error for missing path', () => {
    const reducer = createReducer();
    const state = reducer(undefined, { 
        type: ActionTypes.FILE_ADD, 
        payload: { content: 'test' } 
    });
    assertEqual(state.errors.length, 1, 'Should have one error');
    assertContains(state.errors[0], 'message', 'Error should have message');
});

// ============================================
// FILE_CHANGE Action Tests
// ============================================

test('FILE_CHANGE: should update existing file', () => {
    const reducer = createReducer({
        files: { '/src/index.js': { content: 'old', status: 'added' } }
    });
    const state = reducer(undefined, { 
        type: ActionTypes.FILE_CHANGE, 
        payload: { path: '/src/index.js', content: 'new' } 
    });
    assertEqual(state.files['/src/index.js'].content, 'new', 'Content should be updated');
    assertEqual(state.files['/src/index.js'].status, 'modified', 'Status should be modified');
});

test('FILE_CHANGE: should set modifiedAt timestamp', () => {
    const reducer = createReducer({
        files: { '/src/index.js': { content: 'old' } }
    });
    const state = reducer(undefined, { 
        type: ActionTypes.FILE_CHANGE, 
        payload: { path: '/src/index.js' } 
    });
    assertTrue(typeof state.files['/src/index.js'].modifiedAt === 'number', 'modifiedAt should be a number');
});

// ============================================
// FILE_REMOVE Action Tests
// ============================================

test('FILE_REMOVE: should remove file from state', () => {
    const reducer = createReducer({
        files: { '/src/index.js': { status: 'added' }, '/src/other.js': { status: 'added' } }
    });
    const state = reducer(undefined, { 
        type: ActionTypes.FILE_REMOVE, 
        payload: { path: '/src/index.js' } 
    });
    assertFalse('/src/index.js' in state.files, 'File should be removed');
    assertTrue('/src/other.js' in state.files, 'Other files should remain');
});

test('FILE_REMOVE: should decrement totalFiles count', () => {
    const reducer = createReducer({
        files: { '/src/index.js': { status: 'added' } },
        metadata: { totalFiles: 1 }
    });
    const state = reducer(undefined, { 
        type: ActionTypes.FILE_REMOVE, 
        payload: { path: '/src/index.js' } 
    });
    assertEqual(state.metadata.totalFiles, 0, 'totalFiles should be 0');
});

// ============================================
// PATTERN_REGISTER Action Tests
// ============================================

test('PATTERN_REGISTER: should register pattern with id', () => {
    const reducer = createReducer();
    const state = reducer(undefined, { 
        type: ActionTypes.PATTERN_REGISTER, 
        payload: { id: 'singleton', type: 'creational' } 
    });
    assertContains(state.patterns, 'singleton', 'Patterns should contain registered pattern');
    assertEqual(state.patterns.singleton.type, 'creational', 'Pattern should have correct type');
});

test('PATTERN_REGISTER: should register pattern with name if no id', () => {
    const reducer = createReducer();
    const state = reducer(undefined, { 
        type: ActionTypes.PATTERN_REGISTER, 
        payload: { name: 'factory', type: 'creational' } 
    });
    assertContains(state.patterns, 'factory', 'Patterns should use name as key');
});

test('PATTERN_REGISTER: should increment totalPatterns', () => {
    const reducer = createReducer();
    const state = reducer(undefined, { 
        type: ActionTypes.PATTERN_REGISTER, 
        payload: { id: 'observer' } 
    });
    assertEqual(state.metadata.totalPatterns, 1, 'totalPatterns should be 1');
});

// ============================================
// FLOW_REGISTER Action Tests
// ============================================

test('FLOW_REGISTER: should register flow with id', () => {
    const reducer = createReducer();
    const state = reducer(undefined, { 
        type: ActionTypes.FLOW_REGISTER, 
        payload: { id: 'auth-flow', steps: ['login', 'verify'] } 
    });
    assertContains(state.flows, 'auth-flow', 'Flows should contain registered flow');
    assertEqual(state.flows['auth-flow'].steps.length, 2, 'Flow should have correct steps');
});

test('FLOW_REGISTER: should register flow with name if no id', () => {
    const reducer = createReducer();
    const state = reducer(undefined, { 
        type: ActionTypes.FLOW_REGISTER, 
        payload: { name: 'checkout-flow', steps: ['cart', 'payment'] } 
    });
    assertContains(state.flows, 'checkout-flow', 'Flows should use name as key');
});

test('FLOW_REGISTER: should increment totalFlows', () => {
    const reducer = createReducer();
    const state = reducer(undefined, { 
        type: ActionTypes.FLOW_REGISTER, 
        payload: { id: 'data-flow' } 
    });
    assertEqual(state.metadata.totalFlows, 1, 'totalFlows should be 1');
});

// ============================================
// STATE_RESET Action Tests
// ============================================

test('STATE_RESET: should reset state to initial state', () => {
    const customInitialState = { 
        isScanning: false, 
        files: {}, 
        patterns: {}, 
        flows: {},
        metadata: { totalFiles: 0 }
    };
    const reducer = createReducer(customInitialState);
    
    // Modify state
    let state = reducer(undefined, { type: ActionTypes.FILE_ADD, payload: { path: '/test.js' } });
    assertTrue(state.metadata.totalFiles === 1, 'State should be modified');
    
    // Reset
    state = reducer(state, { type: ActionTypes.STATE_RESET });
    assertEqual(state.metadata.totalFiles, 0, 'State should be reset to initial');
});

test('STATE_RESET: should merge partial state after reset', () => {
    const reducer = createReducer();
    
    // Modify state
    let state = reducer(undefined, { type: ActionTypes.FILE_ADD, payload: { path: '/test.js' } });
    
    // Reset with partial state
    state = reducer(state, { 
        type: ActionTypes.STATE_RESET, 
        payload: { partialState: { isScanning: true } } 
    });
    assertTrue(state.isScanning, 'Partial state should be merged');
    assertEqual(Object.keys(state.files).length, 0, 'Files should be empty after reset');
});

// ============================================
// Immutability Tests
// ============================================

test('Immutability: should not mutate original state', () => {
    const reducer = createReducer();
    const state1 = reducer(undefined, { type: ActionTypes.FILE_ADD, payload: { path: '/a.js' } });
    const state1Copy = JSON.parse(JSON.stringify(state1));
    
    reducer(state1, { type: ActionTypes.FILE_ADD, payload: { path: '/b.js' } });
    
    assertEqual(state1.files, state1Copy.files, 'Original state should not be mutated');
});

test('Immutability: should create new state object on each action', () => {
    const reducer = createReducer();
    const state1 = reducer(undefined, { type: ActionTypes.SCAN_START });
    const state2 = reducer(state1, { type: ActionTypes.SCAN_COMPLETE });
    
    assertTrue(state1 !== state2, 'State should be a new object');
});

// ============================================
// StateReducer Class Tests
// ============================================

test('StateReducer class: should create instance with getState', () => {
    const reducer = new StateReducer();
    const state = reducer.getState();
    assertTrue(typeof state === 'object', 'getState should return an object');
});

test('StateReducer class: should handle reduce action', () => {
    const reducer = new StateReducer();
    reducer.reduce({ type: ActionTypes.SCAN_START });
    const state = reducer.getState();
    assertTrue(state.isScanning, 'State should reflect SCAN_START action');
});

test('StateReducer class: should handle setState merge', () => {
    const reducer = new StateReducer();
    reducer.setState({ customField: 'value' });
    const state = reducer.getState();
    assertEqual(state.customField, 'value', 'setState should merge state');
});

test('StateReducer class: should reset to initial state', () => {
    const reducer = new StateReducer();
    reducer.reduce({ type: ActionTypes.FILE_ADD, payload: { path: '/test.js' } });
    reducer.reset();
    const state = reducer.getState();
    assertEqual(Object.keys(state.files).length, 0, 'reset should clear files');
});

test('StateReducer class: dispatch should work as alias for reduce', () => {
    const reducer = new StateReducer();
    reducer.dispatch({ type: ActionTypes.SCAN_START });
    const state = reducer.getState();
    assertTrue(state.isScanning, 'dispatch should trigger action');
});

test('StateReducer class: getInitialState should return initial state', () => {
    const customState = { customValue: 42 };
    const reducer = new StateReducer(customState);
    const initial = reducer.getInitialState();
    assertEqual(initial.customValue, 42, 'getInitialState should return custom initial state');
});

// ============================================
// Run Tests
// ============================================

console.log('Running StateReducer unit tests...\n');

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
