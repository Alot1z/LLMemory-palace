/**
 * LLMemory-Palace v1.0.8
 * Main package exports
 * 
 * Ultra-compressed code genome system for LLM context transfer.
 * Now with parallel chain refresh support.
 */

// Core classes
export { Palace } from './palace.js';
export { PatternLibrary } from './patterns.js';
export { BehaviorGraph } from './flows.js';
export { SemanticHash } from './semantic-hash.js';
export { GenomeEncoder } from './genome.js';
export { Reconstructor } from './reconstructor.js';

// Refresh system (v1.0.8)
export { Refresher } from './refresh.js';
export { ParallelScanner } from './scanner-parallel.js';
export { RefreshAnalyzer } from './refresh-analyzer.js';
export {
  initialState,
  reduceFileChange,
  reduceSemanticRipple,
  findAffectedFiles,
  createFromScanResults
} from './state-reducer.js';

// Version info
export const VERSION = '1.0.8';
export const NAME = 'llmemory-palace';

// Default export
export default Palace;
