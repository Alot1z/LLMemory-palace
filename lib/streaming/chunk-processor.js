/**
 * LLMemory-Palace v3.0 - Chunk Processor
 *
 * Processes genome chunks with parallel processing support.
 * Supports chunked processing, aggregation, and transformation.
 *
 * @module streaming/chunk-processor
 * @version 3.0.0
 */
import { GenomeValidator } from '../genome/genome-validator.js';
import { SemanticHash } from '../core/semantic-hash.js';
// ============================================================================
// CHUNK PROCESSOR CLASS
// ============================================================================
/**
 * Processes genome chunks with parallel support
 */
export class ChunkProcessor {
    validator;
    hash;
    options;
    context;
    static DEFAULT_OPTIONS = {
        maxConcurrency: 4,
        batchSize: 100,
        timeout: 30000,
        validateChunks: true,
        preserveOrder: true,
    };
    constructor(options) {
        this.options = { ...ChunkProcessor.DEFAULT_OPTIONS, ...options };
        this.validator = new GenomeValidator();
        this.hash = new SemanticHash();
        this.resetContext();
    }
    /**
     * Process chunks with transformer
     */
    async process(chunks, transformer, progress) {
        this.resetContext();
        const startTime = Date.now();
        const results = [];
        const errors = [];
        if (this.options.validateChunks) {
            this.context.phase = 'validating';
            const validationResults = await this.validateChunks(chunks, progress);
            const invalidChunks = validationResults.filter(v => !v.valid);
            if (invalidChunks.length > 0) {
                for (const invalid of invalidChunks) {
                    errors.push({
                        chunk: invalid.chunkId,
                        phase: 'validating',
                        error: invalid.errors.map(e => e.message).join('; '),
                        recoverable: true,
                    });
                }
            }
        }
        this.context.phase = 'transforming';
        const validChunks = chunks.filter(c => !errors.some(e => e.chunk === c.id && !e.recoverable));
        // Process in batches
        for (let i = 0; i < validChunks.length; i += this.options.batchSize) {
            const batch = validChunks.slice(i, i + this.options.batchSize);
            const batchResults = await this.processBatch(batch, transformer);
            for (const processed of batchResults) {
                if (processed.error) {
                    errors.push({
                        chunk: processed.chunk.id,
                        phase: 'transforming',
                        error: processed.error.message,
                        recoverable: true,
                    });
                }
                else {
                    results.push(processed.result);
                }
                this.context.chunksProcessed++;
            }
            if (progress) {
                progress({
                    phase: 'processing',
                    current: Math.min(i + this.options.batchSize, validChunks.length),
                    total: validChunks.length,
                    percentage: Math.round((Math.min(i + this.options.batchSize, validChunks.length) / validChunks.length) * 100),
                    message: `Processed ${Math.min(i + this.options.batchSize, validChunks.length)}/${validChunks.length} chunks`,
                });
            }
        }
        const processingTime = Date.now() - startTime;
        this.context.phase = 'finalizing';
        return {
            data: this.options.preserveOrder ? this.orderResults(results, chunks) : results,
            statistics: {
                chunksProcessed: this.context.chunksProcessed,
                itemsProcessed: results.length,
                bytesProcessed: chunks.reduce((sum, c) => sum + this.getChunkSize(c), 0),
                processingTime,
                averageChunkTime: this.context.chunksProcessed > 0
                    ? processingTime / this.context.chunksProcessed
                    : 0,
                errors,
            },
            validation: {
                valid: errors.filter(e => !e.recoverable).length === 0,
                errors: errors.map(e => ({
                    field: e.chunk,
                    message: e.error,
                    code: e.phase.toUpperCase(),
                })),
                warnings: [],
            },
        };
    }
    /**
     * Process chunks in parallel
     */
    async processParallel(chunks, transformer, progress) {
        this.resetContext();
        const startTime = Date.now();
        const results = [];
        const errors = [];
        const maxConcurrency = this.options.maxConcurrency;
        // Process in parallel batches
        for (let i = 0; i < chunks.length; i += maxConcurrency) {
            const batch = chunks.slice(i, i + maxConcurrency);
            const batchPromises = batch.map(async (chunk) => {
                const chunkStart = Date.now();
                try {
                    const result = await this.withTimeout(Promise.resolve(transformer(chunk)), this.options.timeout);
                    return {
                        chunk,
                        result,
                        time: Date.now() - chunkStart,
                    };
                }
                catch (error) {
                    return {
                        chunk,
                        result: null,
                        time: Date.now() - chunkStart,
                        error: error instanceof Error ? error : new Error(String(error)),
                    };
                }
            });
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            this.context.chunksProcessed += batch.length;
            if (progress) {
                progress({
                    phase: 'parallel',
                    current: Math.min(i + maxConcurrency, chunks.length),
                    total: chunks.length,
                    percentage: Math.round((Math.min(i + maxConcurrency, chunks.length) / chunks.length) * 100),
                    message: `Processed ${Math.min(i + maxConcurrency, chunks.length)}/${chunks.length} chunks in parallel`,
                });
            }
        }
        // Collect errors
        for (const processed of results) {
            if (processed.error) {
                errors.push({
                    chunk: processed.chunk.id,
                    phase: 'transforming',
                    error: processed.error.message,
                    recoverable: true,
                });
            }
        }
        const processingTime = Date.now() - startTime;
        // Order results if needed
        const orderedResults = this.options.preserveOrder
            ? results.sort((a, b) => a.chunk.order - b.chunk.order)
            : results;
        return {
            data: orderedResults.filter(r => !r.error).map(r => r.result),
            statistics: {
                chunksProcessed: this.context.chunksProcessed,
                itemsProcessed: results.filter(r => !r.error).length,
                bytesProcessed: chunks.reduce((sum, c) => sum + this.getChunkSize(c), 0),
                processingTime,
                averageChunkTime: this.context.chunksProcessed > 0
                    ? processingTime / this.context.chunksProcessed
                    : 0,
                errors,
            },
            validation: {
                valid: errors.filter(e => !e.recoverable).length === 0,
                errors: errors.map(e => ({
                    field: e.chunk,
                    message: e.error,
                    code: e.phase.toUpperCase(),
                })),
                warnings: [],
            },
        };
    }
    /**
     * Filter chunks
     */
    async filter(chunks, filter, progress) {
        const results = [];
        let processed = 0;
        for (const chunk of chunks) {
            if (filter(chunk)) {
                results.push(chunk);
            }
            processed++;
            if (progress && processed % 100 === 0) {
                progress({
                    phase: 'filtering',
                    current: processed,
                    total: chunks.length,
                    percentage: Math.round((processed / chunks.length) * 100),
                    message: `Filtered ${processed}/${chunks.length} chunks`,
                });
            }
        }
        return results;
    }
    /**
     * Aggregate chunks
     */
    async aggregate(chunks, transformer, aggregator, progress) {
        const processResult = await this.process(chunks, transformer, progress);
        this.context.phase = 'aggregating';
        const aggregated = aggregator(processResult.data);
        return {
            data: aggregated,
            statistics: processResult.statistics,
            validation: processResult.validation,
        };
    }
    /**
     * Extract patterns from chunks
     */
    async extractPatterns(chunks, progress) {
        const transformer = async (chunk) => {
            const patterns = [];
            if (chunk.type === 'patterns' && chunk.data) {
                try {
                    const data = typeof chunk.data === 'string'
                        ? JSON.parse(chunk.data)
                        : chunk.data;
                    if (typeof data === 'object' && data !== null) {
                        for (const [pattern, instances] of Object.entries(data)) {
                            if (Array.isArray(instances)) {
                                patterns.push({ pattern, instances });
                            }
                        }
                    }
                }
                catch {
                    // Invalid JSON, skip
                }
            }
            return patterns;
        };
        const aggregator = (results) => {
            const map = new Map();
            for (const patterns of results.flat()) {
                if (!map.has(patterns.pattern)) {
                    map.set(patterns.pattern, []);
                }
                map.get(patterns.pattern).push(...patterns.instances);
            }
            return map;
        };
        return this.aggregate(chunks, transformer, aggregator, progress);
    }
    /**
     * Merge multiple chunk processors
     */
    async merge(processors, progress) {
        const results = [];
        let totalProcessed = 0;
        const totalChunks = processors.reduce((sum, p) => sum + p.chunks.length, 0);
        for (const { chunks, transformer } of processors) {
            const result = await this.process(chunks, transformer);
            results.push(result.data);
            totalProcessed += chunks.length;
            if (progress) {
                progress({
                    phase: 'merging',
                    current: totalProcessed,
                    total: totalChunks,
                    percentage: Math.round((totalProcessed / totalChunks) * 100),
                    message: `Merged ${totalProcessed}/${totalChunks} chunks`,
                });
            }
        }
        return {
            data: results,
            statistics: {
                chunksProcessed: totalChunks,
                itemsProcessed: results.flat().length,
                bytesProcessed: 0,
                processingTime: 0,
                averageChunkTime: 0,
                errors: [],
            },
            validation: {
                valid: true,
                errors: [],
                warnings: [],
            },
        };
    }
    // ============================================================================
    // PRIVATE METHODS
    // ============================================================================
    /**
     * Process a batch of chunks
     */
    async processBatch(chunks, transformer) {
        const results = [];
        for (const chunk of chunks) {
            const start = Date.now();
            try {
                const result = await Promise.resolve(transformer(chunk));
                results.push({ chunk, result, time: Date.now() - start });
            }
            catch (error) {
                results.push({
                    chunk,
                    result: null,
                    time: Date.now() - start,
                    error: error instanceof Error ? error : new Error(String(error)),
                });
            }
        }
        return results;
    }
    /**
     * Validate chunks
     */
    async validateChunks(chunks, progress) {
        const results = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const validation = this.validator.validateChunk(chunk);
            results.push({
                chunkId: chunk.id,
                valid: validation.valid,
                errors: validation.errors,
            });
            if (progress && (i + 1) % 100 === 0) {
                progress({
                    phase: 'validating',
                    current: i + 1,
                    total: chunks.length,
                    percentage: Math.round(((i + 1) / chunks.length) * 100),
                    message: `Validated ${i + 1}/${chunks.length} chunks`,
                });
            }
        }
        return results;
    }
    /**
     * Order results by chunk order
     */
    orderResults(results, chunks) {
        if (results.length !== chunks.length) {
            return results;
        }
        const orderMap = new Map(chunks.map((c, i) => [c.order, i]));
        const ordered = new Array(results.length);
        for (let i = 0; i < results.length; i++) {
            const chunk = chunks[i];
            const targetIndex = orderMap.get(chunk.order);
            if (targetIndex !== undefined) {
                ordered[targetIndex] = results[i];
            }
        }
        return ordered;
    }
    /**
     * Get chunk size in bytes
     */
    getChunkSize(chunk) {
        if (typeof chunk.data === 'string') {
            return chunk.data.length;
        }
        return JSON.stringify(chunk.data).length;
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
     * Reset processing context
     */
    resetContext() {
        this.context = {
            phase: 'validating',
            startTime: Date.now(),
            chunksProcessed: 0,
            errors: [],
        };
    }
    /**
     * Get current processing context
     */
    getContext() {
        return { ...this.context };
    }
}
// ============================================================================
// FACTORY FUNCTION
// ============================================================================
/**
 * Create a chunk processor instance
 */
export function createChunkProcessor(options) {
    return new ChunkProcessor(options);
}
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
/**
 * Quick process chunks
 */
export async function quickProcess(chunks, transformer) {
    const processor = new ChunkProcessor();
    const result = await processor.process(chunks, transformer);
    return result.data;
}
/**
 * Filter chunks by type
 */
export function filterChunksByType(chunks, type) {
    return chunks.filter(c => c.type === type);
}
/**
 * Sort chunks by order
 */
export function sortChunksByOrder(chunks) {
    return [...chunks].sort((a, b) => a.order - b.order);
}
/**
 * Validate chunk integrity
 */
export async function validateChunkIntegrity(chunks) {
    const errors = [];
    const orders = new Set();
    for (const chunk of chunks) {
        // Check for duplicate orders
        if (orders.has(chunk.order)) {
            errors.push(`Duplicate chunk order: ${chunk.order}`);
        }
        orders.add(chunk.order);
        // Check for gaps
        if (chunk.order < 0) {
            errors.push(`Invalid chunk order: ${chunk.order}`);
        }
    }
    // Check for gaps in sequence
    const sortedOrders = [...orders].sort((a, b) => a - b);
    for (let i = 0; i < sortedOrders.length - 1; i++) {
        if (sortedOrders[i + 1] - sortedOrders[i] > 1) {
            errors.push(`Gap in chunk sequence between ${sortedOrders[i]} and ${sortedOrders[i + 1]}`);
        }
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
// ============================================================================
// EXPORTS
// ============================================================================
export default ChunkProcessor;
//# sourceMappingURL=chunk-processor.js.map