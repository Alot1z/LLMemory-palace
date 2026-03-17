/**
 * LLMemory-Palace v3.0 - Compression Levels
 *
 * Definitions and utilities for compression levels.
 * Provides configuration and helpers for multi-level compression.
 *
 * @module compression/compression-levels
 * @version 3.0.0
 */
import { CompressionLevel } from '../types.js';
/**
 * Compression level configuration
 */
export interface CompressionLevelConfig {
    level: CompressionLevel;
    name: string;
    description: string;
    techniques: CompressionTechnique[];
    expectedRatio: [number, number];
    useCases: string[];
    performance: {
        speed: 'fast' | 'medium' | 'slow';
        memory: 'low' | 'medium' | 'high';
    };
}
/**
 * Compression technique definition
 */
export interface CompressionTechnique {
    name: string;
    description: string;
    reversible: boolean;
    lossy: boolean;
}
/**
 * Level selection criteria
 */
export interface LevelSelectionCriteria {
    dataSize?: number;
    uniqueRatio?: number;
    timeConstraint?: 'fast' | 'balanced' | 'thorough';
    memoryConstraint?: 'low' | 'medium' | 'high';
    targetRatio?: number;
}
/**
 * All compression level configurations
 */
export declare const COMPRESSION_LEVELS: Record<CompressionLevel, CompressionLevelConfig>;
/**
 * Get compression level configuration
 */
export declare function getCompressionLevel(level: CompressionLevel): CompressionLevelConfig;
/**
 * Get all compression levels
 */
export declare function getAllCompressionLevels(): CompressionLevelConfig[];
/**
 * Get compression level names
 */
export declare function getCompressionLevelNames(): Record<CompressionLevel, string>;
/**
 * Parse compression level from string or number
 */
export declare function parseCompressionLevel(value: string | number | undefined): CompressionLevel;
/**
 * Select optimal compression level based on criteria
 */
export declare function selectOptimalLevel(criteria: LevelSelectionCriteria): CompressionLevel;
/**
 * Get techniques for a compression level
 */
export declare function getTechniquesForLevel(level: CompressionLevel): CompressionTechnique[];
/**
 * Check if technique is available for level
 */
export declare function hasTechnique(level: CompressionLevel, techniqueName: string): boolean;
/**
 * Get expected compression ratio range
 */
export declare function getExpectedRatio(level: CompressionLevel): [number, number];
/**
 * Estimate compression ratio based on data characteristics
 */
export declare function estimateRatio(level: CompressionLevel, dataSize: number, uniqueRatio: number): number;
/**
 * Compare compression levels
 */
export declare function compareLevels(level1: CompressionLevel, level2: CompressionLevel): {
    ratioImprovement: number;
    speedDifference: string;
    memoryDifference: string;
    techniquesAdded: string[];
    techniquesRemoved: string[];
};
/**
 * Get recommended level for use case
 */
export declare function getRecommendedLevel(useCase: string): CompressionLevel;
/**
 * Validate compression level
 */
export declare function isValidCompressionLevel(level: unknown): level is CompressionLevel;
/**
 * Create compression level summary
 */
export declare function createLevelSummary(level: CompressionLevel): string;
export default COMPRESSION_LEVELS;
//# sourceMappingURL=compression-levels.d.ts.map