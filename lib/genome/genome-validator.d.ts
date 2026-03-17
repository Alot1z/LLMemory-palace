/**
 * LLMemory-Palace v3.0 - Genome Validator (Security Layer)
 *
 * Provides safe parsing and validation of genome data.
 * Adapted from genome-safe.js for TypeScript with enhanced security.
 *
 * @module genome/genome-validator
 * @version 3.0.0
 */
import { ValidationResult, ParsedGenome, SecurityPattern, SecurityScanResult } from '../types.js';
/**
 * Security-focused genome validator
 */
export declare class GenomeValidator {
    private customPatterns;
    private strictMode;
    private maxDepth;
    constructor(options?: {
        strictMode?: boolean;
        maxDepth?: number;
    });
    /**
     * Scan content for security issues
     */
    scan(content: string): SecurityScanResult;
    /**
     * Validate genome header
     */
    validateHeader(header: unknown): ValidationResult;
    /**
     * Validate genome chunk
     */
    validateChunk(chunk: unknown): ValidationResult;
    /**
     * Validate hash table
     */
    validateHashTable(table: unknown): ValidationResult;
    /**
     * Validate patterns object
     */
    validatePatterns(patterns: unknown): ValidationResult;
    /**
     * Validate flows object
     */
    validateFlows(flows: unknown): ValidationResult;
    /**
     * Validate entities array
     */
    validateEntities(entities: unknown): ValidationResult;
    /**
     * Validate config object
     */
    validateConfig(config: unknown): ValidationResult;
    /**
     * Validate complete parsed genome
     */
    validateGenome(genome: unknown): ValidationResult;
    /**
     * Validate raw genome string before parsing
     */
    validateRawGenome(content: string): ValidationResult;
    /**
     * Safe parse genome with validation
     */
    safeParse(content: string): {
        genome: ParsedGenome | null;
        validation: ValidationResult;
    };
    /**
     * Add custom security pattern
     */
    addSecurityPattern(pattern: SecurityPattern): void;
    /**
     * Remove custom security pattern
     */
    removeSecurityPattern(patternRegex: string): boolean;
    /**
     * Check if ISO date string is valid
     */
    private isValidISODate;
    /**
     * Deep validate object for circular references
     */
    detectCircularRefs(obj: unknown, path?: string[], seen?: WeakMap<object, string[]>): string[] | null;
}
/**
 * Create a genome validator instance
 */
export declare function createGenomeValidator(options?: {
    strictMode?: boolean;
    maxDepth?: number;
}): GenomeValidator;
export default GenomeValidator;
//# sourceMappingURL=genome-validator.d.ts.map