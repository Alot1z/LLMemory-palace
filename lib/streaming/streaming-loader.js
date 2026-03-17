/**
 * LLMemory-Palace v3.0 - Streaming Loader
 *
 * Async streaming loader for large genome files.
 * Supports chunked loading with progress reporting and cancellation.
 *
 * @module streaming/streaming-loader
 * @version 3.0.0
 */
import { GenomeValidator } from '../genome/genome-validator.js';
import { SemanticHash } from '../core/semantic-hash.js';
// ============================================================================
// STREAMING LOADER CLASS
// ============================================================================
/**
 * Async streaming loader for large files
 */
export class StreamingLoader {
    validator;
    hash;
    options;
    abortController = null;
    loadedChunks = [];
    static DEFAULT_OPTIONS = {
        chunkSize: 64 * 1024, // 64KB
        maxConcurrentChunks: 4,
        timeout: 30000, // 30 seconds
        retries: 3,
        validateChunks: true,
    };
    constructor(options) {
        this.options = { ...StreamingLoader.DEFAULT_OPTIONS, ...options };
        this.validator = new GenomeValidator();
        this.hash = new SemanticHash();
    }
    /**
     * Load file with streaming
     */
    async *loadStream(source, progress) {
        const startTime = Date.now();
        this.abortController = new AbortController();
        if (typeof source === 'string') {
            // Load from string
            yield* this.loadFromString(source, progress);
        }
        else {
            // Load using chunk loader function
            yield* this.loadFromChunkLoader(source, progress);
        }
    }
    /**
     * Load complete file into memory
     */
    async loadComplete(source, progress) {
        const startTime = Date.now();
        const errors = [];
        let totalBytes = 0;
        let chunkCount = 0;
        const chunks = [];
        for await (const chunk of this.loadStream(source, progress)) {
            const data = typeof chunk.data === 'string' ? chunk.data : JSON.stringify(chunk.data);
            chunks.push(data);
            totalBytes += data.length;
            chunkCount++;
        }
        const data = chunks.join('');
        const loadTime = Date.now() - startTime;
        return {
            data,
            statistics: {
                totalChunks: chunkCount,
                totalBytes,
                loadTime,
                averageChunkTime: chunkCount > 0 ? loadTime / chunkCount : 0,
                errors,
            },
        };
    }
    /**
     * Load genome with streaming and validation
     */
    async loadGenome(source, progress) {
        const { data } = await this.loadComplete(source, progress);
        const { genome, validation } = this.validator.safeParse(data);
        if (!genome) {
            throw new Error(`Failed to parse genome: ${validation.errors.map(e => e.message).join(', ')}`);
        }
        return {
            data: genome,
            statistics: {
                totalChunks: this.loadedChunks.length,
                totalBytes: data.length,
                loadTime: 0,
                averageChunkTime: 0,
                errors: [],
            },
        };
    }
    /**
     * Cancel ongoing load operation
     */
    cancel() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }
    /**
     * Check if load is cancelled
     */
    isCancelled() {
        return this.abortController?.signal.aborted ?? false;
    }
    /**
     * Load chunks in parallel
     */
    async loadParallel(sources, progress) {
        const startTime = Date.now();
        const errors = [];
        const results = [];
        let totalBytes = 0;
        let totalChunks = 0;
        const maxConcurrent = this.options.maxConcurrentChunks;
        for (let i = 0; i < sources.length; i += maxConcurrent) {
            const batch = sources.slice(i, i + maxConcurrent);
            const batchResults = await Promise.all(batch.map(source => this.loadComplete(source)));
            for (const result of batchResults) {
                results.push(result.data);
                totalBytes += result.statistics.totalBytes;
                totalChunks += result.statistics.totalChunks;
                errors.push(...result.statistics.errors);
            }
            if (progress) {
                await progress({
                    phase: 'parallel',
                    current: Math.min(i + maxConcurrent, sources.length),
                    total: sources.length,
                    percentage: Math.round((Math.min(i + maxConcurrent, sources.length) / sources.length) * 100),
                    message: `Loaded batch ${Math.floor(i / maxConcurrent) + 1}`,
                });
            }
        }
        const loadTime = Date.now() - startTime;
        return {
            data: results,
            statistics: {
                totalChunks,
                totalBytes,
                loadTime,
                averageChunkTime: totalChunks > 0 ? loadTime / totalChunks : 0,
                errors,
            },
        };
    }
    /**
     * Create a readable stream from source
     */
    createStreamReader(source) {
        const generator = this.loadStream(source);
        let cancelled = false;
        return {
            read: async () => {
                if (cancelled) {
                    return { done: true, value: '' };
                }
                const result = await generator.next();
                if (result.done) {
                    return { done: true, value: '' };
                }
                return {
                    done: false,
                    value: typeof result.value.data === 'string'
                        ? result.value.data
                        : JSON.stringify(result.value.data),
                };
            },
            cancel: () => {
                cancelled = true;
                this.cancel();
            },
        };
    }
    // ============================================================================
    // PRIVATE METHODS
    // ============================================================================
    /**
     * Load from string with chunking
     */
    async *loadFromString(content, progress) {
        const chunkSize = this.options.chunkSize;
        const totalChunks = Math.ceil(content.length / chunkSize);
        let order = 0;
        for (let offset = 0; offset < content.length; offset += chunkSize) {
            if (this.isCancelled()) {
                break;
            }
            const data = content.slice(offset, offset + chunkSize);
            const checksum = this.hash.hash(data);
            const chunk = {
                id: `chunk-${order}`,
                type: this.getChunkType(order, totalChunks),
                data,
                checksum,
                order,
            };
            if (this.options.validateChunks) {
                const validation = this.validator.validateChunk(chunk);
                if (!validation.valid) {
                    console.warn(`Chunk ${order} validation failed:`, validation.errors);
                }
            }
            this.loadedChunks.push({
                id: chunk.id,
                data,
                offset,
                size: data.length,
                checksum,
            });
            if (progress) {
                progress({
                    phase: 'loading',
                    current: order + 1,
                    total: totalChunks,
                    percentage: Math.round(((order + 1) / totalChunks) * 100),
                    message: `Loaded chunk ${order + 1}/${totalChunks}`,
                });
            }
            yield chunk;
            order++;
        }
    }
    /**
     * Load using chunk loader function
     */
    async *loadFromChunkLoader(loader, progress) {
        let offset = 0;
        let order = 0;
        let hasMore = true;
        while (hasMore && !this.isCancelled()) {
            let data = null;
            let retryCount = 0;
            // Retry logic
            while (retryCount < this.options.retries) {
                try {
                    data = await this.withTimeout(loader(offset, this.options.chunkSize), this.options.timeout);
                    break;
                }
                catch (error) {
                    retryCount++;
                    if (retryCount >= this.options.retries) {
                        throw new Error(`Failed to load chunk at offset ${offset} after ${retryCount} retries`);
                    }
                    await this.delay(100 * retryCount); // Exponential backoff
                }
            }
            if (!data || data.length === 0) {
                hasMore = false;
                break;
            }
            const checksum = this.hash.hash(data);
            const chunk = {
                id: `chunk-${order}`,
                type: 'patterns', // Default type for loaded chunks
                data,
                checksum,
                order,
            };
            if (this.options.validateChunks) {
                const validation = this.validator.validateChunk(chunk);
                if (!validation.valid) {
                    console.warn(`Chunk ${order} validation failed:`, validation.errors);
                }
            }
            this.loadedChunks.push({
                id: chunk.id,
                data,
                offset,
                size: data.length,
                checksum,
            });
            if (progress) {
                progress({
                    phase: 'loading',
                    current: order + 1,
                    total: order + 2, // Unknown total, estimate
                    percentage: 0,
                    message: `Loaded chunk ${order + 1}`,
                });
            }
            yield chunk;
            offset += data.length;
            order++;
            // Check if we've reached the end
            if (data.length < this.options.chunkSize) {
                hasMore = false;
            }
        }
    }
    /**
     * Get chunk type based on position
     */
    getChunkType(order, total) {
        if (order === 0)
            return 'header';
        if (order === total - 1)
            return 'footer';
        return 'patterns';
    }
    /**
     * Wrap promise with timeout
     */
    async withTimeout(promise, timeout) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Operation timed out after ${timeout}ms`));
            }, timeout);
            promise
                .then(result => {
                clearTimeout(timer);
                resolve(result);
            })
                .catch(error => {
                clearTimeout(timer);
                reject(error);
            });
        });
    }
    /**
     * Delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Get loaded chunks
     */
    getLoadedChunks() {
        return [...this.loadedChunks];
    }
    /**
     * Clear loaded chunks
     */
    clearLoadedChunks() {
        this.loadedChunks = [];
    }
    /**
     * Get total bytes loaded
     */
    getTotalBytesLoaded() {
        return this.loadedChunks.reduce((sum, chunk) => sum + chunk.size, 0);
    }
}
// ============================================================================
// FACTORY FUNCTION
// ============================================================================
/**
 * Create a streaming loader instance
 */
export function createStreamingLoader(options) {
    return new StreamingLoader(options);
}
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
/**
 * Quick load file with streaming
 */
export async function quickLoad(source) {
    const loader = new StreamingLoader();
    const result = await loader.loadComplete(source);
    return result.data;
}
/**
 * Load genome from source
 */
export async function loadGenomeFromSource(source, progress) {
    const loader = new StreamingLoader();
    const result = await loader.loadGenome(source, progress);
    return result.data;
}
// ============================================================================
// EXPORTS
// ============================================================================
export default StreamingLoader;
//# sourceMappingURL=streaming-loader.js.map