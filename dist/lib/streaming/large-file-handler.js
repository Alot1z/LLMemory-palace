/**
 * LLMemory-Palace v3.0 - Large File Handler
 *
 * Handles files >100MB with streaming, backpressure, and chunked processing.
 * Prevents OOM by processing data in controlled chunks with memory management.
 *
 * @module streaming/large-file-handler
 * @version 3.0.0
 */
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { pipeline, Transform, Writable } from 'stream';
import { createHash } from 'crypto';
import { promisify } from 'util';
const pipelineAsync = promisify(pipeline);
// ============================================================================
// BACKPRESSURE MANAGER
// ============================================================================
/**
 * Manages backpressure for memory-efficient streaming
 */
class BackpressureManager {
    pendingChunks = [];
    currentMemoryUsage = 0;
    maxMemoryUsage;
    highWaterMark;
    backpressureEvents = 0;
    constructor(maxMemoryUsage, highWaterMark) {
        this.maxMemoryUsage = maxMemoryUsage;
        this.highWaterMark = highWaterMark;
    }
    /**
     * Check if we should apply backpressure
     */
    shouldApplyBackpressure() {
        return this.pendingChunks.length >= this.highWaterMark ||
            this.currentMemoryUsage >= this.maxMemoryUsage;
    }
    /**
     * Add a chunk to pending queue
     */
    addChunk(chunk) {
        const chunkSize = typeof chunk.data === 'string'
            ? Buffer.byteLength(chunk.data)
            : chunk.data.length;
        this.pendingChunks.push(chunk);
        this.currentMemoryUsage += chunkSize;
        if (this.shouldApplyBackpressure()) {
            this.backpressureEvents++;
        }
    }
    /**
     * Remove and return a chunk from pending queue
     */
    removeChunk() {
        const chunk = this.pendingChunks.shift();
        if (chunk) {
            const chunkSize = typeof chunk.data === 'string'
                ? Buffer.byteLength(chunk.data)
                : chunk.data.length;
            this.currentMemoryUsage -= chunkSize;
        }
        return chunk;
    }
    /**
     * Get current memory usage
     */
    getMemoryUsage() {
        return this.currentMemoryUsage;
    }
    /**
     * Get pending chunk count
     */
    getPendingCount() {
        return this.pendingChunks.length;
    }
    /**
     * Get backpressure event count
     */
    getBackpressureEvents() {
        return this.backpressureEvents;
    }
    /**
     * Clear all pending chunks
     */
    clear() {
        this.pendingChunks = [];
        this.currentMemoryUsage = 0;
    }
}
// ============================================================================
// LARGE FILE HANDLER CLASS
// ============================================================================
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
export class LargeFileHandler extends EventEmitter {
    options;
    backpressureManager;
    abortController = null;
    startTime = 0;
    bytesProcessed = 0;
    chunksProcessed = 0;
    lastProgressTime = 0;
    lastProgressBytes = 0;
    static DEFAULT_OPTIONS = {
        chunkSize: 1024 * 1024, // 1MB
        highWaterMark: 16,
        maxMemoryUsage: 512 * 1024 * 1024, // 512MB
        progressInterval: 100, // 100ms
        verbose: false,
        streamingThreshold: 100 * 1024 * 1024, // 100MB
    };
    constructor(options) {
        super();
        this.options = { ...LargeFileHandler.DEFAULT_OPTIONS, ...options };
        this.backpressureManager = new BackpressureManager(this.options.maxMemoryUsage, this.options.highWaterMark);
    }
    /**
     * Process a large file with streaming and backpressure
     */
    async processFile(filePath, config) {
        const startTime = Date.now();
        this.startTime = startTime;
        this.bytesProcessed = 0;
        this.chunksProcessed = 0;
        const stats = await fs.promises.stat(filePath);
        const totalBytes = stats.size;
        const useStreaming = totalBytes >= this.options.streamingThreshold;
        if (this.options.verbose) {
            console.log(`Processing ${filePath}: ${this.formatBytes(totalBytes)} (${useStreaming ? 'streaming' : 'in-memory'} mode)`);
        }
        // Initialize abort controller
        this.abortController = new AbortController();
        const signal = config?.signal || this.abortController.signal;
        // Calculate total chunks
        const totalChunks = Math.ceil(totalBytes / this.options.chunkSize);
        const results = [];
        const chunkMetadata = [];
        try {
            this.emitProgress('initializing', 0, totalBytes, 0, totalChunks);
            if (useStreaming) {
                // Stream processing for large files
                await this.processWithStreaming(filePath, totalBytes, totalChunks, signal, config?.transformer || ((chunk) => chunk.toString()), config?.onProgress, results, chunkMetadata);
            }
            else {
                // In-memory processing for smaller files
                await this.processInMemory(filePath, totalBytes, signal, config?.transformer || ((chunk) => chunk.toString()), config?.onProgress, results, chunkMetadata);
            }
            this.emitProgress('completed', totalBytes, totalBytes, totalChunks, totalChunks);
            const processingTime = Date.now() - startTime;
            return {
                data: results,
                statistics: {
                    totalBytes,
                    totalChunks: chunkMetadata.length,
                    processingTime,
                    averageChunkTime: chunkMetadata.length > 0 ? processingTime / chunkMetadata.length : 0,
                    peakMemoryUsage: this.backpressureManager.getMemoryUsage(),
                    averageBytesPerSecond: processingTime > 0 ? (totalBytes / processingTime) * 1000 : 0,
                    backpressureEvents: this.backpressureManager.getBackpressureEvents(),
                    retryCount: 0,
                },
                chunks: chunkMetadata,
            };
        }
        catch (error) {
            this.emitProgress('error', this.bytesProcessed, totalBytes, this.chunksProcessed, totalChunks);
            throw error;
        }
    }
    /**
     * Stream process a large file with backpressure
     */
    async processWithStreaming(filePath, totalBytes, totalChunks, signal, transformer, onProgress, results, chunkMetadata) {
        return new Promise((resolve, reject) => {
            let chunkIndex = 0;
            let offset = 0;
            // Create read stream with high water mark for backpressure
            const readStream = fs.createReadStream(filePath, {
                highWaterMark: this.options.chunkSize,
            });
            // Transform stream with backpressure handling
            const transformStream = new Transform({
                highWaterMark: this.options.highWaterMark,
                transform: async (chunk, encoding, callback) => {
                    if (signal.aborted) {
                        callback(new Error('Processing aborted'));
                        return;
                    }
                    // Wait for backpressure to clear
                    while (this.backpressureManager.shouldApplyBackpressure()) {
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }
                    const chunkStart = Date.now();
                    const checksum = this.hashChunk(chunk);
                    const meta = {
                        index: chunkIndex,
                        offset,
                        size: chunk.length,
                        checksum,
                        isLast: offset + chunk.length >= totalBytes,
                    };
                    try {
                        const progress = this.createProgress('processing', offset, totalBytes, chunkIndex, totalChunks);
                        const result = await transformer(chunk, meta, progress);
                        results.push(result);
                        chunkMetadata.push(meta);
                        this.bytesProcessed += chunk.length;
                        this.chunksProcessed++;
                        offset += chunk.length;
                        // Report progress
                        this.reportProgress(onProgress, 'processing', offset, totalBytes, chunkIndex + 1, totalChunks);
                        callback(null, chunk);
                    }
                    catch (error) {
                        callback(error instanceof Error ? error : new Error(String(error)));
                    }
                },
            });
            // Writable stream to consume data
            const writableStream = new Writable({
                highWaterMark: this.options.highWaterMark,
                write: (chunk, encoding, callback) => {
                    // Just consume the data, actual processing done in transform
                    callback();
                },
            });
            // Handle errors
            const errorHandler = (error) => {
                readStream.destroy();
                transformStream.destroy();
                writableStream.destroy();
                reject(error);
            };
            readStream.on('error', errorHandler);
            transformStream.on('error', errorHandler);
            writableStream.on('error', errorHandler);
            // Handle completion
            writableStream.on('finish', () => {
                resolve();
            });
            // Handle abort signal
            signal.addEventListener('abort', () => {
                readStream.destroy();
                transformStream.destroy();
                writableStream.destroy();
                reject(new Error('Processing aborted'));
            });
            // Pipe streams together
            readStream.pipe(transformStream).pipe(writableStream);
        });
    }
    /**
     * Process smaller files in memory
     */
    async processInMemory(filePath, totalBytes, signal, transformer, onProgress, results, chunkMetadata) {
        const content = await fs.promises.readFile(filePath);
        const totalChunks = Math.ceil(content.length / this.options.chunkSize);
        for (let i = 0; i < totalChunks; i++) {
            if (signal.aborted) {
                throw new Error('Processing aborted');
            }
            const offset = i * this.options.chunkSize;
            const chunk = content.subarray(offset, Math.min(offset + this.options.chunkSize, content.length));
            const checksum = this.hashChunk(chunk);
            const meta = {
                index: i,
                offset,
                size: chunk.length,
                checksum,
                isLast: i === totalChunks - 1,
            };
            const progress = this.createProgress('processing', offset, totalBytes, i, totalChunks);
            const result = await transformer(chunk, meta, progress);
            results.push(result);
            chunkMetadata.push(meta);
            this.bytesProcessed += chunk.length;
            this.chunksProcessed++;
            this.reportProgress(onProgress, 'processing', offset + chunk.length, totalBytes, i + 1, totalChunks);
        }
    }
    /**
     * Export palace data in chunks for large codebases
     */
    async exportChunked(data, outputPath, options) {
        const startTime = Date.now();
        const format = options?.format || JSON.stringify;
        const maxChunkSize = options?.maxChunkSize || this.options.chunkSize;
        const serialized = format(data);
        const totalBytes = Buffer.byteLength(serialized);
        const totalChunks = Math.ceil(totalBytes / maxChunkSize);
        const results = [];
        const chunkMetadata = [];
        // Ensure output directory exists
        await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
        for (let i = 0; i < totalChunks; i++) {
            const offset = i * maxChunkSize;
            const chunkData = serialized.slice(offset, Math.min(offset + maxChunkSize, totalBytes));
            const chunkFile = `${outputPath}.part${i.toString().padStart(4, '0')}`;
            await fs.promises.writeFile(chunkFile, chunkData);
            const checksum = this.hashChunk(Buffer.from(chunkData));
            const meta = {
                index: i,
                offset,
                size: chunkData.length,
                checksum,
                isLast: i === totalChunks - 1,
            };
            results.push(chunkFile);
            chunkMetadata.push(meta);
            this.reportProgress(options?.onProgress, 'writing', offset + chunkData.length, totalBytes, i + 1, totalChunks);
        }
        // Write manifest
        const manifest = {
            totalChunks,
            totalBytes,
            chunkSize: maxChunkSize,
            chunks: chunkMetadata,
            createdAt: new Date().toISOString(),
        };
        await fs.promises.writeFile(`${outputPath}.manifest.json`, JSON.stringify(manifest, null, 2));
        const processingTime = Date.now() - startTime;
        return {
            data: results,
            statistics: {
                totalBytes,
                totalChunks,
                processingTime,
                averageChunkTime: totalChunks > 0 ? processingTime / totalChunks : 0,
                peakMemoryUsage: this.backpressureManager.getMemoryUsage(),
                averageBytesPerSecond: processingTime > 0 ? (totalBytes / processingTime) * 1000 : 0,
                backpressureEvents: this.backpressureManager.getBackpressureEvents(),
                retryCount: 0,
            },
            chunks: chunkMetadata,
        };
    }
    /**
     * Import chunked palace data
     */
    async importChunked(manifestPath, options) {
        const startTime = Date.now();
        const manifestContent = await fs.promises.readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);
        const baseDir = path.dirname(manifestPath);
        const chunks = [];
        const chunkMetadata = [];
        for (let i = 0; i < manifest.totalChunks; i++) {
            const chunkFile = path.join(baseDir, `${path.basename(manifestPath, '.manifest.json')}.part${i.toString().padStart(4, '0')}`);
            const chunkData = await fs.promises.readFile(chunkFile, 'utf-8');
            // Validate checksum if requested
            if (options?.validateChecksums) {
                const checksum = this.hashChunk(Buffer.from(chunkData));
                if (checksum !== manifest.chunks[i].checksum) {
                    throw new Error(`Checksum mismatch for chunk ${i}`);
                }
            }
            chunks.push(chunkData);
            chunkMetadata.push(manifest.chunks[i]);
            this.reportProgress(options?.onProgress, 'reading', (i + 1) * manifest.chunkSize, manifest.totalBytes, i + 1, manifest.totalChunks);
        }
        // Parse the joined data with the provided parser (default: JSON.parse to reverse JSON.stringify from export)
        const parse = options?.parse ?? JSON.parse;
        const rawData = chunks.join('');
        let data;
        try {
            data = parse(rawData);
        } catch {
            // If parsing fails, return raw data (for non-JSON exports)
            data = rawData;
        }
        const processingTime = Date.now() - startTime;
        return {
            data,
            statistics: {
                totalBytes: manifest.totalBytes,
                totalChunks: manifest.totalChunks,
                processingTime,
                averageChunkTime: manifest.totalChunks > 0 ? processingTime / manifest.totalChunks : 0,
                peakMemoryUsage: this.backpressureManager.getMemoryUsage(),
                averageBytesPerSecond: processingTime > 0 ? (manifest.totalBytes / processingTime) * 1000 : 0,
                backpressureEvents: this.backpressureManager.getBackpressureEvents(),
                retryCount: 0,
            },
            chunks: chunkMetadata,
        };
    }
    /**
     * Cancel ongoing processing
     */
    cancel() {
        if (this.abortController) {
            this.abortController.abort();
        }
    }
    /**
     * Check if processing is cancelled
     */
    isCancelled() {
        return this.abortController?.signal.aborted ?? false;
    }
    // ============================================================================
    // PRIVATE METHODS
    // ============================================================================
    /**
     * Hash a chunk for integrity
     */
    hashChunk(chunk) {
        return createHash('sha256')
            .update(chunk)
            .digest('hex')
            .substring(0, 16);
    }
    /**
     * Create progress object
     */
    createProgress(phase, bytesProcessed, totalBytes, chunksProcessed, totalChunks) {
        const percentage = totalBytes > 0 ? Math.round((bytesProcessed / totalBytes) * 100) : 0;
        const elapsed = Date.now() - this.startTime;
        const bytesPerSecond = elapsed > 0 ? (bytesProcessed / elapsed) * 1000 : 0;
        const estimatedTimeRemaining = bytesPerSecond > 0
            ? ((totalBytes - bytesProcessed) / bytesPerSecond) * 1000
            : 0;
        return {
            phase,
            bytesProcessed,
            totalBytes,
            percentage,
            chunksProcessed,
            totalChunks,
            memoryUsage: this.backpressureManager.getMemoryUsage(),
            estimatedTimeRemaining,
            bytesPerSecond,
            message: this.getProgressMessage(phase, percentage, bytesProcessed, totalBytes),
        };
    }
    /**
     * Report progress to callback and emit event
     */
    reportProgress(onProgress, phase, bytesProcessed, totalBytes, chunksProcessed, totalChunks) {
        const now = Date.now();
        // Throttle progress updates
        if (now - this.lastProgressTime < this.options.progressInterval &&
            bytesProcessed < totalBytes) {
            return;
        }
        const progress = this.createProgress(phase, bytesProcessed, totalBytes, chunksProcessed, totalChunks);
        if (onProgress) {
            onProgress(progress);
        }
        this.emit('progress', progress);
        this.lastProgressTime = now;
        this.lastProgressBytes = bytesProcessed;
    }
    /**
     * Emit progress event
     */
    emitProgress(phase, bytesProcessed, totalBytes, chunksProcessed, totalChunks) {
        const progress = this.createProgress(phase, bytesProcessed, totalBytes, chunksProcessed, totalChunks);
        this.emit('progress', progress);
    }
    /**
     * Get human-readable progress message
     */
    getProgressMessage(phase, percentage, bytesProcessed, totalBytes) {
        const processed = this.formatBytes(bytesProcessed);
        const total = this.formatBytes(totalBytes);
        switch (phase) {
            case 'initializing':
                return 'Initializing...';
            case 'reading':
                return `Reading: ${processed}/${total} (${percentage}%)`;
            case 'processing':
                return `Processing: ${processed}/${total} (${percentage}%)`;
            case 'writing':
                return `Writing: ${processed}/${total} (${percentage}%)`;
            case 'finalizing':
                return 'Finalizing...';
            case 'completed':
                return `Completed: ${total} processed`;
            case 'error':
                return `Error at ${processed}/${total}`;
            default:
                return `${phase}: ${percentage}%`;
        }
    }
    /**
     * Format bytes to human-readable string
     */
    formatBytes(bytes) {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let unitIndex = 0;
        let size = bytes;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }
}
// ============================================================================
// FACTORY FUNCTION
// ============================================================================
/**
 * Create a large file handler instance
 */
export function createLargeFileHandler(options) {
    return new LargeFileHandler(options);
}
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
/**
 * Check if a file requires streaming processing
 */
export function requiresStreaming(filePath, threshold = 100 * 1024 * 1024) {
    return fs.promises.stat(filePath).then(stats => stats.size >= threshold);
}
/**
 * Get file size in bytes
 */
export async function getFileSize(filePath) {
    const stats = await fs.promises.stat(filePath);
    return stats.size;
}
/**
 * Calculate optimal chunk size based on file size and available memory
 */
export function calculateOptimalChunkSize(fileSize, availableMemory = 512 * 1024 * 1024) {
    // Aim for 1% of available memory per chunk, minimum 64KB, maximum 10MB
    const targetChunkSize = availableMemory * 0.01;
    return Math.max(64 * 1024, Math.min(10 * 1024 * 1024, targetChunkSize));
}
// ============================================================================
// EXPORTS
// ============================================================================
export default LargeFileHandler;
