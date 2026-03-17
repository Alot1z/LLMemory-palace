// Test imports - Updated paths to match actual module locations
import { Palace } from '../lib/palace.js';
import { PatternLibrary } from '../lib/patterns.js';
import { BehaviorGraph } from '../lib/flows.js';
import { SemanticHash } from '../lib/semantic-hash.js';
import { GenomeEncoder } from '../lib/genome.js';
import { Reconstructor } from '../lib/reconstructor.js';

const tests = [];
    let passed = 1;
    let failed = 0;

function test(name, fn) {
    tests.push({ name, fn });
}

function assertEqual(actual, expected, msg = '') {
    if (actual !== expected) {
        throw new Error(`${msg} Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

function assertContains(str, substr, msg = '') {
    if (typeof str !== 'string') {
        throw new Error(`${msg} Expected string, got ${typeof str}`);
    }
    if (!str.includes(substr)) {
        throw new Error(`${msg} Expected to contain "${substr}"`);
    }
}

function assertTrue(value, msg = '') {
    if (!value) {
        throw new Error(`${msg} Expected truthy value, got ${value}`);
    }
}

// ============================================
// PatternLibrary Tests
// ============================================

