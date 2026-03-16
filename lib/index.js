/**
 * LLMemory-Palace v25.0
 * Main package exports
 * 
 * Ultra-compressed code genome system for LLM context transfer.
 * 500-2000x compression with full reconstruction.
 */

// Core classes
export { Palace } from './palace.js';
export { PatternLibrary } from './patterns.js';
export { BehaviorGraph } from './flows.js';
export { SemanticHash } from './semantic-hash.js';
export { GenomeEncoder } from './genome.js';
export { Reconstructor } from './reconstructor.js';

// Version info
export const VERSION = '25.0.0';
export const NAME = 'llmemory-palace';

// Default export
export default Palace;
