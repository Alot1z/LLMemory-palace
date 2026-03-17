/**
 * LLMemory-Palace v3.0 - Main Entry Point
 * 
 * Complete implementation with all 4 phases.
 * 
 * @module llmemory-palace
 * @version 3.0.0
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export type {
  HashTable,
  ReverseTable,
  SimilarityResult,
  PatternInstance,
  Pattern,
  PatternRegistrationOptions,
  ExtractedPattern,
  FoundPatternInstance,
  PatternListItem,
  FlowStep,
  FlowError,
  Flow,
  FlowRegistrationOptions,
  ExtractedFlow,
  FlowListItem,
  Language,
  SymbolType,
  Symbol,
  Dependency,
  FileAnalysis,
  FileMetrics,
  GenomeVersion,
  CompressionLevel,
  GenomeHeader,
  ParsedGenome,
  GenomeConfig,
  GenomeChunk,
  DifferentialGenome,
  ScanOptions,
  DiscoveredFile,
  FileContent,
  ScanResult,
  ScanStats,
  ScanError,
  GraphNode,
  GraphEdge,
  DependencyGraph,
  Cycle,
  GraphBuildOptions,
  GraphStatistics,
  GraphBuildResult,
  ParsedFile,
  ImportedModule,
  ImportSpecifier,
  ExportedSymbol,
  ReconstructionOptions,
  GeneratedFile,
  ReconstructionError,
  PalaceOptions,
  PalaceEvent,
  PalaceState,
  CodeIndex,
  IndexedFile,
  IndexStats,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  SecurityCategory,
  SecurityPattern,
  SecurityScanResult,
  SecurityIssue,
  PalacePlugin,
  PluginContext,
  PluginHooks,
  ProgressCallback,
  StreamProgress,
  DeepPartial,
  RequireKeys
} from './types';

// ============================================================================
// PHASE 1: FOUNDATION LAYER
// ============================================================================

export { SemanticHash } from './core/semantic-hash';
export { PatternLibrary } from './patterns/pattern-library';
export { BehaviorGraph } from './flows/behavior-graph';

// ============================================================================
// PHASE 2: CORE LAYER
// ============================================================================

export { ASTParser } from './parser/ast-parser';
export { Scanner } from './scanner/scanner';
export { GraphBuilder } from './graph/graph-builder';

// ============================================================================
// PHASE 3: ENCODING LAYER
// ============================================================================

export { GenomeValidator, createGenomeValidator } from './genome/genome-validator';
export { GenomeEncoder, createGenomeEncoder } from './genome/genome-encoder';
export type { EncodingOptions, EncodingResult, EncodingStatistics } from './genome/genome-encoder';
export { GenomeDecoder, createGenomeDecoder, quickDecode, validateGenome, parseGenome } from './genome/genome-decoder';
export type { DecodingOptions, DecodingResult, DecodingStatistics } from './genome/genome-decoder';
export { CompressionEngine, createCompressionEngine, quickCompress, quickDecompress, getCompressionLevelInfo } from './compression/compression-engine';
export type { CompressionOptions, CompressionResult, CompressionMetadata } from './compression/compression-engine';
export { 
  COMPRESSION_LEVELS, 
  getCompressionLevel, 
  getAllCompressionLevels, 
  getCompressionLevelNames,
  parseCompressionLevel,
  selectOptimalLevel,
  isValidCompressionLevel 
} from './compression/compression-levels';
export type { CompressionLevelConfig, CompressionTechnique, LevelSelectionCriteria } from './compression/compression-levels';
export { StreamingLoader, createStreamingLoader, quickLoad, loadGenomeFromSource } from './streaming/streaming-loader';
export type { LoaderOptions, LoadResult, LoadStatistics, ChunkLoader, StreamReader } from './streaming/streaming-loader';
export { ChunkProcessor, createChunkProcessor, quickProcess, filterChunksByType, sortChunksByOrder, validateChunkIntegrity } from './streaming/chunk-processor';
export type { ProcessorOptions, ProcessingResult, ProcessingStatistics, ChunkTransformer, ChunkFilter, ChunkAggregator } from './streaming/chunk-processor';

// ============================================================================
// PHASE 4: RECONSTRUCTION LAYER
// ============================================================================

export { SourceReconstructor, createSourceReconstructor } from './reconstruction/source-reconstructor';
export type { ReconstructorConfig, ReconstructionResult as SourceReconstructionResult, TemplateContext } from './reconstruction/source-reconstructor';

export { TemplateEngine, createTemplateEngine } from './reconstruction/template-engine';
export type { TemplateConfig, CompiledTemplate, TemplateContext as TemplateCtx } from './reconstruction/template-engine';

export { FileWriter, createFileWriter } from './reconstruction/file-writer';
export type { WriterConfig, WriteResult, DirectoryStructure } from './reconstruction/file-writer';

// ============================================================================
// PHASE 4: PLUGIN SYSTEM
// ============================================================================

export { 
  PluginManager, 
  createPluginManager,
  getPluginManager
} from './plugins/plugin-manager';
export type { 
  Plugin, 
  PluginHook, 
  HookHandler,
  PluginContext as PluginCtx,
  PluginResult,
  CompressionPlugin,
  PatternPlugin,
  ValidatorPlugin
} from './plugins/plugin-manager';

// ============================================================================
// PHASE 4: BINARY FORMAT
// ============================================================================

export { BinaryFormat, createBinaryFormat, ChunkType } from './binary/binary-format';
export type { BinaryHeader, BinaryChunk, BinaryFormatConfig } from './binary/binary-format';

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

import { SemanticHash } from './core/semantic-hash';
import { PatternLibrary } from './patterns/pattern-library';
import { BehaviorGraph } from './flows/behavior-graph';
import { ASTParser } from './parser/ast-parser';
import { Scanner } from './scanner/scanner';
import { GraphBuilder } from './graph/graph-builder';
import { GenomeEncoder } from './genome/genome-encoder';
import { GenomeDecoder } from './genome/genome-decoder';
import { CompressionEngine } from './compression/compression-engine';
import { StreamingLoader } from './streaming/streaming-loader';
import { ChunkProcessor } from './streaming/chunk-processor';
import { SourceReconstructor } from './reconstruction/source-reconstructor';
import { TemplateEngine } from './reconstruction/template-engine';
import { FileWriter } from './reconstruction/file-writer';
import { PluginManager } from './plugins/plugin-manager';
import { BinaryFormat } from './binary/binary-format';

export function createSemanticHash(): SemanticHash { return new SemanticHash(); }
export function createPatternLibrary(): PatternLibrary { return new PatternLibrary(); }
export function createBehaviorGraph(): BehaviorGraph { return new BehaviorGraph(); }
export function createASTParser(): ASTParser { return new ASTParser(); }
export function createScanner(): Scanner { return new Scanner({ projectPath: process.cwd() }); }
export function createGraphBuilder(): GraphBuilder { return new GraphBuilder({}); }
export function createGenomeEncoderInstance(opts?: import('./genome/genome-encoder').EncodingOptions): GenomeEncoder { return new GenomeEncoder(opts); }
export function createGenomeDecoderInstance(opts?: import('./genome/genome-decoder').DecodingOptions): GenomeDecoder { return new GenomeDecoder(opts); }
export function createCompressionEngineInstance(opts?: import('./compression/compression-engine').CompressionOptions): CompressionEngine { return new CompressionEngine(opts); }
export function createStreamingLoaderInstance(opts?: import('./streaming/streaming-loader').LoaderOptions): StreamingLoader { return new StreamingLoader(opts); }
export function createChunkProcessorInstance(opts?: import('./streaming/chunk-processor').ProcessorOptions): ChunkProcessor { return new ChunkProcessor(opts); }
export function createSourceReconstructorInstance(opts?: import('./reconstruction/source-reconstructor').ReconstructorConfig): SourceReconstructor { return new SourceReconstructor(opts); }
export function createTemplateEngineInstance(opts?: import('./reconstruction/template-engine').TemplateConfig): TemplateEngine { return new TemplateEngine(opts); }
export function createFileWriterInstance(opts?: import('./reconstruction/file-writer').WriterConfig): FileWriter { return new FileWriter(opts); }
export function createPluginManagerInstance(): PluginManager { return new PluginManager(); }
export function createBinaryFormatInstance(opts?: import('./binary/binary-format').BinaryFormatConfig): BinaryFormat { return new BinaryFormat(opts); }

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export { SemanticHash as default } from './core/semantic-hash';
