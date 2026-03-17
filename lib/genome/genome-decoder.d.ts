/**
 * LLMemory-Palace v3.0 - Genome Decoder
 *
 * Decodes genome format back to usable code index.
 * Supports streaming decoding and differential reconstruction.
 *
 * @module genome/genome-decoder
 * @version 3.0.0
 */
import { GenomeChunk, ParsedGenome, CodeIndex, StreamProgress, DifferentialGenome, ValidationResult } from '../types.js';
/**
 * Decoding options
 */
export interface DecodingOptions {
    validateChecksums?: boolean;
    strictMode?: boolean;
    maxMemory?: number;
    progressInterval?: number;
}
/**
 * Decoding result
 */
export interface DecodingResult {
    index: CodeIndex;
    statistics: DecodingStatistics;
    validation: ValidationResult;
}
/**
 * Decoding statistics
 */
export interface DecodingStatistics {
    totalChunks: number;
    totalPatterns: number;
    totalFlows: number;
    totalEntities: number;
    decodedSize: number;
    decodingTime: number;
    memoryPeak: number;
}
/**
 * Reconstruction options
 */
export interface ReconstructionOptions {
    outputDir?: string;
    generateFiles?: boolean;
    preserveStructure?: boolean;
    formatCode?: boolean;
}
/**
 * Reconstruction result
 */
export interface ReconstructionResult {
    files: Map<string, string>;
    statistics: {
        filesGenerated: number;
        totalLines: number;
        reconstructionTime: number;
    };
}
/**
 * Decodes genome format back to code index
 */
export declare class GenomeDecoder {
    private validator;
    private hash;
    private options;
    private chunks;
    private memoryUsage;
    private static readonly DEFAULT_OPTIONS;
    constructor(options?: DecodingOptions);
    /**
     * Decode genome string to code index
     */
    decode(genomeString: string, progress?: (p: StreamProgress) => void): Promise<DecodingResult>;
    /**
     * Stream decode from chunks
     */
    decodeStream(chunks: AsyncIterable<GenomeChunk>, progress?: (p: StreamProgress) => void): AsyncGenerator<{
        chunk: GenomeChunk;
        result: Partial<DecodingResult>;
    }>;
    /**
     * Decode chunks to complete index
     */
    decodeChunks(chunks: GenomeChunk[], progress?: (p: StreamProgress) => void): Promise<DecodingResult>;
    /**
     * Apply differential to base genome
     */
    applyDifferential(base: ParsedGenome, diff: DifferentialGenome, progress?: (p: StreamProgress) => void): Promise<{
        genome: ParsedGenome;
        statistics: {
            additions: number;
            deletions: number;
            modifications: number;
        };
    }>;
    /**
     * Reconstruct source files from genome
     */
    reconstruct(genome: ParsedGenome, options?: ReconstructionOptions): Promise<ReconstructionResult>;
    /**
     * Decode parsed genome to code index
     */
    private decodeToIndex;
    /**
     * Update hash table after modifications
     */
    private updateHashTable;
    /**
     * Reconstruct pattern to source code
     */
    private reconstructPattern;
    /**
     * Reconstruct flow to source code
     */
    private reconstructFlow;
    /**
     * Reconstruct entities to source code
     */
    private reconstructEntities;
    /**
     * Create empty code index
     */
    private createEmptyIndex;
    /**
     * Create empty statistics
     */
    private createEmptyStats;
    /**
     * Get chunk by ID
     */
    getChunk(id: string): GenomeChunk | undefined;
    /**
     * Get all chunks
     */
    getChunks(): GenomeChunk[];
    /**
     * Clear internal state
     */
    reset(): void;
    /**
     * Get current memory usage
     */
    getMemoryUsage(): number;
}
/**
 * Create a genome decoder instance
 */
export declare function createGenomeDecoder(options?: DecodingOptions): GenomeDecoder;
/**
 * Quick decode genome string
 */
export declare function quickDecode(genomeString: string): Promise<CodeIndex>;
/**
 * Validate genome string
 */
export declare function validateGenome(genomeString: string): ValidationResult;
/**
 * Parse genome string without full validation
 */
export declare function parseGenome(genomeString: string): ParsedGenome | null;
export default GenomeDecoder;
//# sourceMappingURL=genome-decoder.d.ts.map