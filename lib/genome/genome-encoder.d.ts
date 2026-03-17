/**
 * LLMemory-Palace v3.0 - Genome Encoder
 *
 * Encodes code indexes into ultra-compressed genome format.
 * Adapted from genome.js with streaming and differential encoding support.
 *
 * @module genome/genome-encoder
 * @version 3.0.0
 */
import { CodeIndex, IndexedFile, GenomeChunk, ParsedGenome, CompressionLevel, StreamProgress, DifferentialGenome } from '../types.js';
/**
 * Encoding options
 */
export interface EncodingOptions {
    compressionLevel?: CompressionLevel;
    includeSource?: boolean;
    includeAST?: boolean;
    chunkSize?: number;
    generateDiffs?: boolean;
    metadata?: Record<string, unknown>;
}
/**
 * Encoding result
 */
export interface EncodingResult {
    genome: string;
    chunks: GenomeChunk[];
    statistics: EncodingStatistics;
    checksum: string;
}
/**
 * Encoding statistics
 */
export interface EncodingStatistics {
    totalFiles: number;
    totalPatterns: number;
    totalFlows: number;
    totalEntities: number;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    encodingTime: number;
    chunkCount: number;
}
/**
 * Differential encoding options
 */
export interface DifferentialOptions {
    baseGenome: ParsedGenome;
    includeAdditions?: boolean;
    includeDeletions?: boolean;
    includeModifications?: boolean;
}
/**
 * Incremental encoding result
 */
export interface IncrementalResult {
    chunk: GenomeChunk;
    statistics: {
        itemsProcessed: number;
        bytesEncoded: number;
    };
}
/**
 * Encodes code indexes into genome format
 */
export declare class GenomeEncoder {
    private hash;
    private options;
    private chunks;
    private currentOrder;
    private static readonly DEFAULT_OPTIONS;
    constructor(options?: EncodingOptions);
    /**
     * Encode complete code index to genome
     */
    encode(index: CodeIndex, progress?: (p: StreamProgress) => void): Promise<EncodingResult>;
    /**
     * Stream encode with async generator
     */
    encodeStream(files: IndexedFile[], progress?: (p: StreamProgress) => void): AsyncGenerator<GenomeChunk>;
    /**
     * Encode single file incrementally
     */
    encodeIncremental(file: IndexedFile): Promise<IncrementalResult>;
    /**
     * Encode with differential from previous genome
     */
    encodeWithDifferential(current: CodeIndex, previous: ParsedGenome, progress?: (p: StreamProgress) => void): Promise<{
        genome: string;
        diff: DifferentialGenome;
        statistics: EncodingStatistics;
    }>;
    /**
     * Encode patterns section
     */
    private encodePatterns;
    /**
     * Encode flows section
     */
    private encodeFlows;
    /**
     * Encode entities section
     */
    private encodeEntities;
    /**
     * Encode config section
     */
    private encodeConfig;
    /**
     * Build hash table from index
     */
    private buildHashTable;
    /**
     * Create genome header
     */
    private createHeader;
    /**
     * Calculate original size of index
     */
    private calculateOriginalSize;
    /**
     * Generate chunks from genome string
     */
    private generateChunks;
    /**
     * Create a single chunk
     */
    private createChunk;
    /**
     * Encode file incrementally
     */
    private encodeFileIncremental;
    /**
     * Compress file analysis for encoding
     */
    private compressAnalysis;
    /**
     * Merge multiple chunks into single genome
     */
    mergeChunks(chunks: GenomeChunk[]): string;
    /**
     * Validate chunks integrity
     */
    validateChunks(chunks: GenomeChunk[]): {
        valid: boolean;
        errors: string[];
    };
}
/**
 * Create a genome encoder instance
 */
export declare function createGenomeEncoder(options?: EncodingOptions): GenomeEncoder;
export default GenomeEncoder;
//# sourceMappingURL=genome-encoder.d.ts.map