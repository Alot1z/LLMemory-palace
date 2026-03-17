/**
 * LLMemory-Palace v3.0 - Main Entry Point
 *
 * Complete implementation with all 4 phases.
 *
 * @module llmemory-palace
 * @version 3.0.0
 */

// ============================================================================
// PHASE 1: FOUNDATION LAYER
// ============================================================================
export { SemanticHash } from './core/semantic-hash.js';
export { PatternLibrary } from './patterns/pattern-library.js';
export { BehaviorGraph } from './flows/behavior-graph.js';

// ============================================================================
// PHASE 2: CORE LAYER
// ============================================================================
export { ASTParser } from './parser/ast-parser.js';
export { Scanner } from './scanner/scanner.js';
export { GraphBuilder } from './graph/graph-builder.js';

// ============================================================================
// PHASE 3: ENCODING LAYER
// ============================================================================
export { GenomeValidator, createGenomeValidator } from './genome/genome-validator.js';
export { GenomeEncoder, createGenomeEncoder } from './genome/genome-encoder.js';
export { GenomeDecoder, createGenomeDecoder, quickDecode, validateGenome, parseGenome } from './genome/genome-decoder.js';
export { CompressionEngine, createCompressionEngine, quickCompress, quickDecompress, getCompressionLevelInfo } from './compression/compression-engine.js';
export { COMPRESSION_LEVELS, getCompressionLevel, getAllCompressionLevels, getCompressionLevelNames, parseCompressionLevel, selectOptimalLevel, isValidCompressionLevel } from './compression/compression-levels.js';
export { StreamingLoader, createStreamingLoader, quickLoad, loadGenomeFromSource } from './streaming/streaming-loader.js';
export { ChunkProcessor, createChunkProcessor, quickProcess, filterChunksByType, sortChunksByOrder, validateChunkIntegrity } from './streaming/chunk-processor.js';

// ============================================================================
// RECONSTRUCTION LAYER - Use wrapper files
// ============================================================================
export { Reconstructor } from './reconstructor.js';

// ============================================================================
// VERSION INFO
// ============================================================================
export const VERSION = '3.0.0';
export const PHASE = 'RECONSTRUCTION_LAYER';
export const PHASE_NUMBER = 4;
export const BUILD_DATE = '2026-03-15';

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================
import { SemanticHash } from './core/semantic-hash.js';
import { PatternLibrary } from './patterns/pattern-library.js';
import { BehaviorGraph } from './flows/behavior-graph.js';
import { ASTParser } from './parser/ast-parser.js';
import { Scanner } from './scanner/scanner.js';
import { GraphBuilder } from './graph/graph-builder.js';
import { GenomeEncoder } from './genome/genome-encoder.js';
import { GenomeDecoder } from './genome/genome-decoder.js';
import { CompressionEngine } from './compression/compression-engine.js';
import { StreamingLoader } from './streaming/streaming-loader.js';
import { ChunkProcessor } from './streaming/chunk-processor.js';

export function createSemanticHash() { return new SemanticHash(); }
export function createPatternLibrary() { return new PatternLibrary(); }
export function createBehaviorGraph() { return new BehaviorGraph(); }
export function createASTParser() { return new ASTParser(); }
export function createScanner() { return new Scanner({ projectPath: process.cwd() }); }
export function createGraphBuilder() { return new GraphBuilder({}); }
export function createGenomeEncoderInstance(opts) { return new GenomeEncoder(opts); }
export function createGenomeDecoderInstance(opts) { return new GenomeDecoder(opts); }
export function createCompressionEngineInstance(opts) { return new CompressionEngine(opts); }
export function createStreamingLoaderInstance(opts) { return new StreamingLoader(opts); }
export function createChunkProcessorInstance(opts) { return new ChunkProcessor(opts); }

// ============================================================================
// DEFAULT EXPORT
// ============================================================================
export { SemanticHash as default } from './core/semantic-hash.js';
//# sourceMappingURL=index.js.map
