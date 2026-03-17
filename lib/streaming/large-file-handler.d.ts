/**
 * LLMemory-Palace v3.0 - Large File Handler
 *
 * Handles files >100MB with streaming, backpressure, and chunked processing.
 * Prevents OOM by processing data in controlled chunks with memory management.
 *
 * @module streaming/large-file-handler
 * @version 3.0.0
 */
import { EventEmitter } from 'events';
/**
 * Large file handler options
 */
export interface LargeFileHandlerOptions {
    /** Chunk size in bytes (default: 1MB) */
    chunkSize?: number;
    /** High water mark for backpressure (default: 16 chunks) */
    highWaterMark?: number;
    /** Maximum memory usage in bytes (default: 512MB) */
    maxMemoryUsage?: number;
    /** Progress callback interval in ms (default: 100ms) */
    progressInterval?: number;
    /** Enable verbose logging */
    verbose?: boolean;
    /** File size threshold for streaming mode (default: 100MB) */
    streamingThreshold?: number;
}
/**
 * Processing progress information
 */
export interface LargeFileProgress {
    /** Current phase of processing */
    phase: LargeFilePhase;
    /** Bytes processed so far */
    bytesProcessed: number;
    /** Total bytes to process */
    totalBytes: number;
    /** Percentage complete (0-100) */
    percentage: number;
    /** Number of chunks processed */
    chunksProcessed: number;
    /** Total number of chunks */
    totalChunks: number;
    /** Current memory usage in bytes */
    memoryUsage: number;
    /** Estimated time remaining in ms */
    estimatedTimeRemaining: number;
    /** Processing rate in bytes/second */
    bytesPerSecond: number;
    /** Human-readable message */
    message: string;
}
/**
 * Processing phases
 */
export type LargeFilePhase = 'initializing' | 'reading' | 'processing' | 'writing' | 'finalizing' | 'completed' | 'error';
/**
 * Chunk metadata
 */
export interface ChunkMetadata {
    /** Chunk index */
    index: number;
    /** Byte offset in file */
    offset: number;
    /** Chunk size in bytes */
    size: number;
    /** Checksum for integrity */
    checksum: string;
    /** Is this the last chunk */
    isLast: boolean;
}
/**
 * Processed chunk result
 */
export interface ProcessedChunk {
    /** Chunk metadata */
    metadata: ChunkMetadata;
    /** Processed data */
    data: string | Buffer;
    /** Processing time in ms */
    processingTime: number;
}
/**
 * Large file processing result
 */
export interface LargeFileResult<T = unknown> {
    /** Final processed data */
    data: T;
    /** Processing statistics */
    statistics: LargeFileStatistics;
    /** All chunk metadata */
    chunks: ChunkMetadata[];
}
/**
 * Processing statistics
 */
export interface LargeFileStatistics {
    /** Total bytes processed */
    totalBytes: number;
    /** Total chunks processed */
    totalChunks: number;
    /** Total processing time in ms */
    processingTime: number;
    /** Average chunk processing time in ms */
    averageChunkTime: number;
    /** Peak memory usage in bytes */
    peakMemoryUsage: number;
    /** Average processing rate in bytes/second */
    averageBytesPerSecond: number;
    /** Number of backpressure events */
    backpressureEvents: number;
    /** Number of chunks retried */
    retryCount: number;
}
/**
 * Chunk transformer function
 */
export type ChunkTransformer<T = unknown> = (chunk: Buffer, metadata: ChunkMetadata, progress: LargeFileProgress) => Promise<T> | T;
/**
 * Progress callback function
 */
export type ProgressCallback = (progress: LargeFileProgress) => void;
/**
 * Handles large files (>100MB) with streaming, backpressure, and progress tracking
 *
 * @example
 * ```typescript
 * const handler = new LargeFileHandler({
 *   chunkSize: 1024 * 1024, // 1MB chunks
 *   maxMemoryUsage: 512 * 1024 * 1024, // 512MB max memory
 *   streamingThreshold: 100 * 1024 * 1024 // 100MB threshold
 * });
 *
 * const result = await handler.processFile('/path/to/large/file.txt', {
 *   onProgress: (progress) => console.log(`${progress.percentage}% complete`),
 *   transformer: async (chunk, meta) => chunk.toString().toUpperCase()
 * });
 * ```
 */
export declare class LargeFileHandler extends EventEmitter {
    private options;
    private backpressureManager;
    private abortController;
    private startTime;
    private bytesProcessed;
    private chunksProcessed;
    private lastProgressTime;
    private lastProgressBytes;
    private static readonly DEFAULT_OPTIONS;
    constructor(options?: LargeFileHandlerOptions);
    /**
     * Process a large file with streaming and backpressure
     */
    processFile<T = string>(filePath: string, config?: {
        transformer?: ChunkTransformer<T>;
        onProgress?: ProgressCallback;
        signal?: AbortSignal;
    }): Promise<LargeFileResult<T[]>>;
    /**
     * Stream process a large file with backpressure
     */
    private processWithStreaming;
    /**
     * Process smaller files in memory
     */
    private processInMemory;
    /**
     * Export palace data in chunks for large codebases
     */
    exportChunked(data: unknown, outputPath: string, options?: {
        maxChunkSize?: number;
        onProgress?: ProgressCallback;
        format?: (data: unknown) => string;
    }): Promise<LargeFileResult<string[]>>;
    /**
     * Import chunked palace data
     */
    importChunked(manifestPath: string, options?: {
        onProgress?: ProgressCallback;
        validateChecksums?: boolean;
    }): Promise<LargeFileResult<string>>;
    /**
     * Cancel ongoing processing
     */
    cancel(): void;
    /**
     * Check if processing is cancelled
     */
    isCancelled(): boolean;
    /**
     * Hash a chunk for integrity
     */
    private hashChunk;
    /**
     * Create progress object
     */
    private createProgress;
    /**
     * Report progress to callback and emit event
     */
    private reportProgress;
    /**
     * Emit progress event
     */
    private emitProgress;
    /**
     * Get human-readable progress message
     */
    private getProgressMessage;
    /**
     * Format bytes to human-readable string
     */
    private formatBytes;
}
/**
 * Create a large file handler instance
 */
export declare function createLargeFileHandler(options?: LargeFileHandlerOptions): LargeFileHandler;
/**
 * Check if a file requires streaming processing
 */
export declare function requiresStreaming(filePath: string, threshold?: number): Promise<boolean>;
/**
 * Get file size in bytes
 */
export declare function getFileSize(filePath: string): Promise<number>;
/**
 * Calculate optimal chunk size based on file size and available memory
 */
export declare function calculateOptimalChunkSize(fileSize: number, availableMemory?: number): number;
export default LargeFileHandler;
