/**
 * LLMemory-Palace v3.0 - Chunk Processor
 *
 * Processes genome chunks with parallel processing support.
 * Supports chunked processing, aggregation, and transformation.
 *
 * @module streaming/chunk-processor
 * @version 3.0.0
 */
import { GenomeChunk, StreamProgress, PatternInstance, ValidationResult } from '../types.js';
/**
 * Processor options
 */
export interface ProcessorOptions {
    maxConcurrency?: number;
    batchSize?: number;
    timeout?: number;
    validateChunks?: boolean;
    preserveOrder?: boolean;
}
/**
 * Processing result
 */
export interface ProcessingResult<T = unknown> {
    data: T;
    statistics: ProcessingStatistics;
    validation: ValidationResult;
}
/**
 * Processing statistics
 */
export interface ProcessingStatistics {
    chunksProcessed: number;
    itemsProcessed: number;
    bytesProcessed: number;
    processingTime: number;
    averageChunkTime: number;
    errors: ProcessingError[];
}
/**
 * Processing error
 */
export interface ProcessingError {
    chunk: string;
    phase: string;
    error: string;
    recoverable: boolean;
}
/**
 * Chunk transformer function type
 */
export type ChunkTransformer<T = unknown> = (chunk: GenomeChunk) => Promise<T> | T;
/**
 * Chunk filter function type
 */
export type ChunkFilter = (chunk: GenomeChunk) => boolean;
/**
 * Chunk aggregator function type
 */
export type ChunkAggregator<T, R = T> = (results: T[]) => R;
/**
 * Processing phase
 */
export type ProcessingPhase = 'validating' | 'extracting' | 'transforming' | 'aggregating' | 'finalizing';
/**
 * Processing context
 */
export interface ProcessingContext {
    phase: ProcessingPhase;
    startTime: number;
    chunksProcessed: number;
    errors: ProcessingError[];
}
/**
 * Processes genome chunks with parallel support
 */
export declare class ChunkProcessor {
    private validator;
    private hash;
    private options;
    private context;
    private static readonly DEFAULT_OPTIONS;
    constructor(options?: ProcessorOptions);
    /**
     * Process chunks with transformer
     */
    process<T>(chunks: GenomeChunk[], transformer: ChunkTransformer<T>, progress?: (p: StreamProgress) => void): Promise<ProcessingResult<T[]>>;
    /**
     * Process chunks in parallel
     */
    processParallel<T>(chunks: GenomeChunk[], transformer: ChunkTransformer<T>, progress?: (p: StreamProgress) => void): Promise<ProcessingResult<T[]>>;
    /**
     * Filter chunks
     */
    filter(chunks: GenomeChunk[], filter: ChunkFilter, progress?: (p: StreamProgress) => void): Promise<GenomeChunk[]>;
    /**
     * Aggregate chunks
     */
    aggregate<T, R>(chunks: GenomeChunk[], transformer: ChunkTransformer<T>, aggregator: ChunkAggregator<T, R>, progress?: (p: StreamProgress) => void): Promise<ProcessingResult<R>>;
    /**
     * Extract patterns from chunks
     */
    extractPatterns(chunks: GenomeChunk[], progress?: (p: StreamProgress) => void): Promise<ProcessingResult<Map<string, PatternInstance[]>>>;
    /**
     * Merge multiple chunk processors
     */
    merge(processors: Array<{
        chunks: GenomeChunk[];
        transformer: ChunkTransformer;
    }>, progress?: (p: StreamProgress) => void): Promise<ProcessingResult<unknown[][]>>;
    /**
     * Process a batch of chunks
     */
    private processBatch;
    /**
     * Validate chunks
     */
    private validateChunks;
    /**
     * Order results by chunk order
     */
    private orderResults;
    /**
     * Get chunk size in bytes
     */
    private getChunkSize;
    /**
     * Wrap promise with timeout
     */
    private withTimeout;
    /**
     * Reset processing context
     */
    private resetContext;
    /**
     * Get current processing context
     */
    getContext(): ProcessingContext;
}
/**
 * Create a chunk processor instance
 */
export declare function createChunkProcessor(options?: ProcessorOptions): ChunkProcessor;
/**
 * Quick process chunks
 */
export declare function quickProcess<T>(chunks: GenomeChunk[], transformer: ChunkTransformer<T>): Promise<T[]>;
/**
 * Filter chunks by type
 */
export declare function filterChunksByType(chunks: GenomeChunk[], type: GenomeChunk['type']): GenomeChunk[];
/**
 * Sort chunks by order
 */
export declare function sortChunksByOrder(chunks: GenomeChunk[]): GenomeChunk[];
/**
 * Validate chunk integrity
 */
export declare function validateChunkIntegrity(chunks: GenomeChunk[]): Promise<{
    valid: boolean;
    errors: string[];
}>;
export default ChunkProcessor;
//# sourceMappingURL=chunk-processor.d.ts.map