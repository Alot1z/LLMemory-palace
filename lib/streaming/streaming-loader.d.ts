/**
 * LLMemory-Palace v3.0 - Streaming Loader
 *
 * Async streaming loader for large genome files.
 * Supports chunked loading with progress reporting and cancellation.
 *
 * @module streaming/streaming-loader
 * @version 3.0.0
 */
import { GenomeChunk, StreamProgress, ParsedGenome } from '../types.js';
/**
 * Loader options
 */
export interface LoaderOptions {
    chunkSize?: number;
    maxConcurrentChunks?: number;
    timeout?: number;
    retries?: number;
    validateChunks?: boolean;
}
/**
 * Load result
 */
export interface LoadResult<T> {
    data: T;
    statistics: LoadStatistics;
}
/**
 * Load statistics
 */
export interface LoadStatistics {
    totalChunks: number;
    totalBytes: number;
    loadTime: number;
    averageChunkTime: number;
    errors: LoadError[];
}
/**
 * Load error
 */
export interface LoadError {
    chunk: string;
    error: string;
    retryCount: number;
}
/**
 * Chunk loader function type
 */
export type ChunkLoader = (offset: number, size: number) => Promise<string>;
/**
 * Stream reader interface
 */
export interface StreamReader {
    read(): Promise<{
        done: boolean;
        value: string;
    }>;
    cancel(): void;
}
/**
 * Buffered chunk for internal processing
 */
interface BufferedChunk {
    id: string;
    data: string;
    offset: number;
    size: number;
    checksum: string;
}
/**
 * Async streaming loader for large files
 */
export declare class StreamingLoader {
    private validator;
    private hash;
    private options;
    private abortController;
    private loadedChunks;
    private static readonly DEFAULT_OPTIONS;
    constructor(options?: LoaderOptions);
    /**
     * Load file with streaming
     */
    loadStream(source: string | ChunkLoader, progress?: (p: StreamProgress) => void): AsyncGenerator<GenomeChunk>;
    /**
     * Load complete file into memory
     */
    loadComplete(source: string | ChunkLoader, progress?: (p: StreamProgress) => void): Promise<LoadResult<string>>;
    /**
     * Load genome with streaming and validation
     */
    loadGenome(source: string | ChunkLoader, progress?: (p: StreamProgress) => void): Promise<LoadResult<ParsedGenome>>;
    /**
     * Cancel ongoing load operation
     */
    cancel(): void;
    /**
     * Check if load is cancelled
     */
    isCancelled(): boolean;
    /**
     * Load chunks in parallel
     */
    loadParallel(sources: Array<string | ChunkLoader>, progress?: (p: StreamProgress) => Promise<void>): Promise<LoadResult<string[]>>;
    /**
     * Create a readable stream from source
     */
    createStreamReader(source: string | ChunkLoader): StreamReader;
    /**
     * Load from string with chunking
     */
    private loadFromString;
    /**
     * Load using chunk loader function
     */
    private loadFromChunkLoader;
    /**
     * Get chunk type based on position
     */
    private getChunkType;
    /**
     * Wrap promise with timeout
     */
    private withTimeout;
    /**
     * Delay helper
     */
    private delay;
    /**
     * Get loaded chunks
     */
    getLoadedChunks(): BufferedChunk[];
    /**
     * Clear loaded chunks
     */
    clearLoadedChunks(): void;
    /**
     * Get total bytes loaded
     */
    getTotalBytesLoaded(): number;
}
/**
 * Create a streaming loader instance
 */
export declare function createStreamingLoader(options?: LoaderOptions): StreamingLoader;
/**
 * Quick load file with streaming
 */
export declare function quickLoad(source: string): Promise<string>;
/**
 * Load genome from source
 */
export declare function loadGenomeFromSource(source: string | ChunkLoader, progress?: (p: StreamProgress) => void): Promise<ParsedGenome>;
export default StreamingLoader;
//# sourceMappingURL=streaming-loader.d.ts.map