/**
 * LLMemory-Palace v3.0 - Compression Engine
 *
 * Multi-level compression engine for genome data.
 * Supports levels 1-4 with increasing compression ratios.
 *
 * @module compression/compression-engine
 * @version 3.0.0
 */
import { CompressionLevel, StreamProgress } from '../types.js';
/**
 * Compression options
 */
export interface CompressionOptions {
    level?: CompressionLevel;
    dictionary?: string[];
    enableDelta?: boolean;
    chunkSize?: number;
}
/**
 * Compression result
 */
export interface CompressionResult {
    data: string;
    originalSize: number;
    compressedSize: number;
    ratio: number;
    level: CompressionLevel;
    checksum: string;
    metadata: CompressionMetadata;
}
/**
 * Compression metadata
 */
export interface CompressionMetadata {
    algorithm: string;
    dictionaryUsed: boolean;
    deltaEnabled: boolean;
    chunkCount: number;
    compressionTime: number;
}
/**
 * Decompression options
 */
export interface DecompressionOptions {
    validateChecksum?: boolean;
    strictMode?: boolean;
}
/**
 * Compression statistics
 */
export interface CompressionStatistics {
    totalCompressed: number;
    totalOriginal: number;
    averageRatio: number;
    bestRatio: number;
    worstRatio: number;
    totalTime: number;
}
/**
 * Compression level configuration
 */
export interface CompressionLevelConfig {
    level: CompressionLevel;
    name: string;
    description: string;
    techniques: string[];
    expectedRatio: [number, number];
}
/**
 * Compression level definitions
 */
export declare const COMPRESSION_LEVELS: Record<CompressionLevel, CompressionLevelConfig>;
/**
 * Multi-level compression engine for genome data
 */
export declare class CompressionEngine {
    private hash;
    private options;
    private dictionary;
    private reverseDictionary;
    private statistics;
    private static readonly DEFAULT_OPTIONS;
    constructor(options?: CompressionOptions);
    /**
     * Compress data at configured level
     */
    compress(data: string, progress?: (p: StreamProgress) => void): Promise<CompressionResult>;
    /**
     * Decompress data
     */
    decompress(compressedData: string, options?: DecompressionOptions, progress?: (p: StreamProgress) => void): Promise<string>;
    /**
     * Compress with streaming for large data
     */
    compressStream(chunks: AsyncIterable<string>, progress?: (p: StreamProgress) => void): AsyncGenerator<{
        chunk: string;
        result: Partial<CompressionResult>;
    }>;
    /**
     * Get compression statistics
     */
    getStatistics(): CompressionStatistics;
    /**
     * Reset statistics
     */
    resetStatistics(): void;
    /**
     * Set compression level
     */
    setLevel(level: CompressionLevel): void;
    /**
     * Get current compression level
     */
    getLevel(): CompressionLevel;
    /**
     * Add dictionary entry
     */
    addDictionaryEntry(term: string, abbreviation: string): void;
    /**
     * Remove dictionary entry
     */
    removeDictionaryEntry(term: string): boolean;
    /**
     * Apply hash-based compression
     */
    private applyHashCompression;
    /**
     * Reverse hash-based compression
     */
    private reverseHashCompression;
    /**
     * Apply pattern deduplication
     */
    private applyPatternDeduplication;
    /**
     * Reverse pattern deduplication
     */
    private reversePatternDeduplication;
    /**
     * Apply semantic hashing
     */
    private applySemanticHashing;
    /**
     * Reverse semantic hashing
     */
    private reverseSemanticHashing;
    /**
     * Apply delta encoding
     */
    private applyDeltaEncoding;
    /**
     * Reverse delta encoding
     */
    private reverseDeltaEncoding;
    /**
     * Apply dictionary compression
     */
    private applyDictionaryCompression;
    /**
     * Reverse dictionary compression
     */
    private reverseDictionaryCompression;
    /**
     * Apply whitespace compression
     */
    private applyWhitespaceCompression;
    /**
     * Reverse whitespace compression
     */
    private reverseWhitespaceCompression;
    /**
     * Build dictionary from initial terms
     */
    private buildDictionary;
    /**
     * Create empty statistics object
     */
    private createEmptyStatistics;
    /**
     * Estimate compression ratio for data
     */
    estimateRatio(data: string): number;
    /**
     * Get optimal compression level for data
     */
    getOptimalLevel(data: string): CompressionLevel;
}
/**
 * Create a compression engine instance
 */
export declare function createCompressionEngine(options?: CompressionOptions): CompressionEngine;
/**
 * Quick compress data at specified level
 */
export declare function quickCompress(data: string, level?: CompressionLevel): Promise<string>;
/**
 * Quick decompress data
 */
export declare function quickDecompress(data: string, level?: CompressionLevel): Promise<string>;
/**
 * Get compression level info
 */
export declare function getCompressionLevelInfo(level: CompressionLevel): CompressionLevelConfig;
export default CompressionEngine;
//# sourceMappingURL=compression-engine.d.ts.map