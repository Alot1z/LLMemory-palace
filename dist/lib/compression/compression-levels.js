/**
 * LLMemory-Palace v3.0 - Compression Levels
 *
 * Definitions and utilities for compression levels.
 * Provides configuration and helpers for multi-level compression.
 *
 * @module compression/compression-levels
 * @version 3.0.0
 */
// ============================================================================
// COMPRESSION LEVEL DEFINITIONS
// ============================================================================
/**
 * All compression level configurations
 */
export const COMPRESSION_LEVELS = {
    1: {
        level: 1,
        name: 'state_only',
        description: 'Minimal compression preserving only essential state information',
        techniques: [
            {
                name: 'hash_compression',
                description: 'Replace long values with hash references',
                reversible: false,
                lossy: true,
            },
            {
                name: 'whitespace_removal',
                description: 'Remove unnecessary whitespace',
                reversible: true,
                lossy: false,
            },
        ],
        expectedRatio: [10, 50],
        useCases: [
            'Quick previews',
            'Memory-constrained environments',
            'Real-time compression',
            'State snapshots',
        ],
        performance: {
            speed: 'fast',
            memory: 'low',
        },
    },
    2: {
        level: 2,
        name: 'structure',
        description: 'Structure-based compression with pattern deduplication',
        techniques: [
            {
                name: 'hash_compression',
                description: 'Replace long values with hash references',
                reversible: false,
                lossy: true,
            },
            {
                name: 'pattern_deduplication',
                description: 'Identify and deduplicate repeated patterns',
                reversible: true,
                lossy: false,
            },
            {
                name: 'key_shortening',
                description: 'Shorten long key names',
                reversible: true,
                lossy: false,
            },
        ],
        expectedRatio: [50, 200],
        useCases: [
            'Code repositories',
            'Configuration files',
            'Medium-sized projects',
            'Development builds',
        ],
        performance: {
            speed: 'fast',
            memory: 'low',
        },
    },
    3: {
        level: 3,
        name: 'source_minimal',
        description: 'Aggressive compression with semantic hashing and delta encoding',
        techniques: [
            {
                name: 'hash_compression',
                description: 'Replace long values with hash references',
                reversible: false,
                lossy: true,
            },
            {
                name: 'pattern_deduplication',
                description: 'Identify and deduplicate repeated patterns',
                reversible: true,
                lossy: false,
            },
            {
                name: 'semantic_hashing',
                description: 'Replace semantic identifiers with hashes',
                reversible: true,
                lossy: false,
            },
            {
                name: 'delta_encoding',
                description: 'Encode differences between similar sequences',
                reversible: true,
                lossy: false,
            },
        ],
        expectedRatio: [200, 1000],
        useCases: [
            'Production builds',
            'Large codebases',
            'Distribution packages',
            'Archival storage',
        ],
        performance: {
            speed: 'medium',
            memory: 'medium',
        },
    },
    4: {
        level: 4,
        name: 'genome_full',
        description: 'Maximum compression using all available techniques',
        techniques: [
            {
                name: 'hash_compression',
                description: 'Replace long values with hash references',
                reversible: false,
                lossy: true,
            },
            {
                name: 'pattern_deduplication',
                description: 'Identify and deduplicate repeated patterns',
                reversible: true,
                lossy: false,
            },
            {
                name: 'semantic_hashing',
                description: 'Replace semantic identifiers with hashes',
                reversible: true,
                lossy: false,
            },
            {
                name: 'delta_encoding',
                description: 'Encode differences between similar sequences',
                reversible: true,
                lossy: false,
            },
            {
                name: 'dictionary_compression',
                description: 'Use predefined dictionary for common terms',
                reversible: true,
                lossy: false,
            },
        ],
        expectedRatio: [500, 2000],
        useCases: [
            'Ultra-compressed archives',
            'Long-term storage',
            'Bandwidth-constrained transfers',
            'Maximum compression needed',
        ],
        performance: {
            speed: 'slow',
            memory: 'high',
        },
    },
};
// ============================================================================
// COMPRESSION LEVEL UTILITIES
// ============================================================================
/**
 * Get compression level configuration
 */
export function getCompressionLevel(level) {
    return COMPRESSION_LEVELS[level];
}
/**
 * Get all compression levels
 */
export function getAllCompressionLevels() {
    return Object.values(COMPRESSION_LEVELS);
}
/**
 * Get compression level names
 */
export function getCompressionLevelNames() {
    return {
        1: COMPRESSION_LEVELS[1].name,
        2: COMPRESSION_LEVELS[2].name,
        3: COMPRESSION_LEVELS[3].name,
        4: COMPRESSION_LEVELS[4].name,
    };
}
/**
 * Parse compression level from string or number
 */
export function parseCompressionLevel(value) {
    if (value === undefined) {
        return 3; // Default
    }
    if (typeof value === 'number') {
        if (value >= 1 && value <= 4) {
            return Math.floor(value);
        }
        throw new Error(`Invalid compression level: ${value}. Must be 1-4.`);
    }
    // Parse string
    const normalized = value.toLowerCase().trim();
    // Check by number
    const numLevel = parseInt(normalized, 10);
    if (!isNaN(numLevel) && numLevel >= 1 && numLevel <= 4) {
        return numLevel;
    }
    // Check by name
    for (const [level, config] of Object.entries(COMPRESSION_LEVELS)) {
        if (config.name === normalized ||
            config.name.replace('_', '-') === normalized ||
            config.name.replace('_', ' ') === normalized) {
            return parseInt(level);
        }
    }
    throw new Error(`Invalid compression level: ${value}. Must be 1-4 or a valid level name.`);
}
/**
 * Select optimal compression level based on criteria
 */
export function selectOptimalLevel(criteria) {
    // Priority-based selection
    // Check time constraint first
    if (criteria.timeConstraint === 'fast') {
        if (criteria.dataSize && criteria.dataSize < 10000) {
            return 1;
        }
        return 2;
    }
    if (criteria.timeConstraint === 'thorough') {
        return 4;
    }
    // Check memory constraint
    if (criteria.memoryConstraint === 'low') {
        return criteria.dataSize && criteria.dataSize < 50000 ? 1 : 2;
    }
    // Check target ratio
    if (criteria.targetRatio) {
        if (criteria.targetRatio >= 500)
            return 4;
        if (criteria.targetRatio >= 200)
            return 3;
        if (criteria.targetRatio >= 50)
            return 2;
        return 1;
    }
    // Check data characteristics
    if (criteria.dataSize !== undefined && criteria.uniqueRatio !== undefined) {
        const { dataSize, uniqueRatio } = criteria;
        if (dataSize < 1000)
            return 1;
        if (dataSize < 10000) {
            return uniqueRatio > 0.7 ? 1 : 2;
        }
        if (dataSize < 100000) {
            return uniqueRatio > 0.5 ? 2 : 3;
        }
        if (dataSize < 1000000) {
            return uniqueRatio > 0.3 ? 3 : 4;
        }
        return 4;
    }
    // Default to level 3
    return 3;
}
/**
 * Get techniques for a compression level
 */
export function getTechniquesForLevel(level) {
    return COMPRESSION_LEVELS[level].techniques;
}
/**
 * Check if technique is available for level
 */
export function hasTechnique(level, techniqueName) {
    return COMPRESSION_LEVELS[level].techniques.some(t => t.name === techniqueName);
}
/**
 * Get expected compression ratio range
 */
export function getExpectedRatio(level) {
    return COMPRESSION_LEVELS[level].expectedRatio;
}
/**
 * Estimate compression ratio based on data characteristics
 */
export function estimateRatio(level, dataSize, uniqueRatio) {
    const [minRatio, maxRatio] = COMPRESSION_LEVELS[level].expectedRatio;
    // Simple heuristic based on data characteristics
    // Higher unique ratio = lower compression
    // Larger size = typically better compression
    let score = 1 - uniqueRatio; // Base score from uniqueness
    // Adjust based on size
    if (dataSize > 100000) {
        score += 0.1;
    }
    if (dataSize > 1000000) {
        score += 0.1;
    }
    // Clamp score
    score = Math.max(0, Math.min(1, score));
    // Interpolate between min and max
    return minRatio + (maxRatio - minRatio) * score;
}
/**
 * Compare compression levels
 */
export function compareLevels(level1, level2) {
    const config1 = COMPRESSION_LEVELS[level1];
    const config2 = COMPRESSION_LEVELS[level2];
    const avgRatio1 = (config1.expectedRatio[0] + config1.expectedRatio[1]) / 2;
    const avgRatio2 = (config2.expectedRatio[0] + config2.expectedRatio[1]) / 2;
    const techniques1 = new Set(config1.techniques.map(t => t.name));
    const techniques2 = new Set(config2.techniques.map(t => t.name));
    const techniquesAdded = [...techniques2].filter(t => !techniques1.has(t));
    const techniquesRemoved = [...techniques1].filter(t => !techniques2.has(t));
    return {
        ratioImprovement: avgRatio2 / avgRatio1,
        speedDifference: `${config1.performance.speed} -> ${config2.performance.speed}`,
        memoryDifference: `${config1.performance.memory} -> ${config2.performance.memory}`,
        techniquesAdded,
        techniquesRemoved,
    };
}
/**
 * Get recommended level for use case
 */
export function getRecommendedLevel(useCase) {
    const normalizedUseCase = useCase.toLowerCase().trim();
    for (const [level, config] of Object.entries(COMPRESSION_LEVELS)) {
        if (config.useCases.some(uc => uc.toLowerCase().includes(normalizedUseCase))) {
            return parseInt(level);
        }
    }
    // Default recommendations based on common terms
    if (normalizedUseCase.includes('fast') || normalizedUseCase.includes('quick')) {
        return 1;
    }
    if (normalizedUseCase.includes('dev') || normalizedUseCase.includes('test')) {
        return 2;
    }
    if (normalizedUseCase.includes('prod') || normalizedUseCase.includes('release')) {
        return 3;
    }
    if (normalizedUseCase.includes('archive') || normalizedUseCase.includes('maximum')) {
        return 4;
    }
    return 3; // Default
}
/**
 * Validate compression level
 */
export function isValidCompressionLevel(level) {
    return typeof level === 'number' && level >= 1 && level <= 4 && Number.isInteger(level);
}
/**
 * Create compression level summary
 */
export function createLevelSummary(level) {
    const config = COMPRESSION_LEVELS[level];
    const [minRatio, maxRatio] = config.expectedRatio;
    return [
        `Level ${level}: ${config.name}`,
        `- ${config.description}`,
        `- Expected ratio: ${minRatio}x - ${maxRatio}x`,
        `- Speed: ${config.performance.speed}, Memory: ${config.performance.memory}`,
        `- Techniques: ${config.techniques.map(t => t.name).join(', ')}`,
        `- Use cases: ${config.useCases.join(', ')}`,
    ].join('\n');
}
// ============================================================================
// EXPORTS
// ============================================================================
export default COMPRESSION_LEVELS;
//# sourceMappingURL=compression-levels.js.map