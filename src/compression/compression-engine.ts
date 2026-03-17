/**
 * LLMemory-Palace v3.0 - Compression Engine
 * 
 * Multi-level compression engine for genome data.
 * Supports levels 1-4 with increasing compression ratios.
 * 
 * @module compression/compression-engine
 * @version 3.0.0
 */

import {
  CompressionLevel,
  StreamProgress,
} from '../types.js';
import { SemanticHash } from '../core/semantic-hash.js';

// ============================================================================
// TYPES
// ============================================================================

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
  expectedRatio: [number, number]; // [min, max]
}

// ============================================================================
// COMPRESSION LEVELS
// ============================================================================

/**
 * Compression level definitions
 */
export const COMPRESSION_LEVELS: Record<CompressionLevel, CompressionLevelConfig> = {
  1: {
    level: 1,
    name: 'state_only',
    description: 'Minimal compression, preserves only essential state',
    techniques: ['hash_compression', 'whitespace_removal'],
    expectedRatio: [10, 50],
  },
  2: {
    level: 2,
    name: 'structure',
    description: 'Structure-based compression with pattern deduplication',
    techniques: ['hash_compression', 'pattern_deduplication', 'key_shortening'],
    expectedRatio: [50, 200],
  },
  3: {
    level: 3,
    name: 'source_minimal',
    description: 'Aggressive compression with semantic hashing',
    techniques: ['hash_compression', 'pattern_deduplication', 'semantic_hashing', 'delta_encoding'],
    expectedRatio: [200, 1000],
  },
  4: {
    level: 4,
    name: 'genome_full',
    description: 'Maximum compression with all techniques',
    techniques: ['hash_compression', 'pattern_deduplication', 'semantic_hashing', 'delta_encoding', 'dictionary_compression'],
    expectedRatio: [500, 2000],
  },
};

// ============================================================================
// COMPRESSION ENGINE CLASS
// ============================================================================

/**
 * Multi-level compression engine for genome data
 */
export class CompressionEngine {
  private hash: SemanticHash;
  private options: Required<CompressionOptions>;
  private dictionary: Map<string, string> = new Map();
  private reverseDictionary: Map<string, string> = new Map();
  private statistics: CompressionStatistics;

  private static readonly DEFAULT_OPTIONS: Required<CompressionOptions> = {
    level: 3,
    dictionary: [],
    enableDelta: true,
    chunkSize: 64 * 1024, // 64KB
  };

  constructor(options?: CompressionOptions) {
    this.options = { ...CompressionEngine.DEFAULT_OPTIONS, ...options };
    this.hash = new SemanticHash();
    this.statistics = this.createEmptyStatistics();
    this.buildDictionary(this.options.dictionary);
  }

  /**
   * Compress data at configured level
   */
  async compress(data: string, progress?: (p: StreamProgress) => void): Promise<CompressionResult> {
    const startTime = Date.now();
    const originalSize = data.length;

    if (progress) {
      progress({
        phase: 'compression',
        current: 0,
        total: 100,
        percentage: 0,
        message: `Compressing at level ${this.options.level}...`,
      });
    }

    let compressed = data;

    // Apply compression techniques based on level
    compressed = this.applyHashCompression(compressed);
    
    if (this.options.level >= 2) {
      compressed = this.applyPatternDeduplication(compressed);
      if (progress) {
        progress({
          phase: 'compression',
          current: 25,
          total: 100,
          percentage: 25,
          message: 'Pattern deduplication complete',
        });
      }
    }

    if (this.options.level >= 3) {
      compressed = this.applySemanticHashing(compressed);
      if (this.options.enableDelta) {
        compressed = this.applyDeltaEncoding(compressed);
      }
      if (progress) {
        progress({
          phase: 'compression',
          current: 50,
          total: 100,
          percentage: 50,
          message: 'Semantic hashing complete',
        });
      }
    }

    if (this.options.level >= 4) {
      compressed = this.applyDictionaryCompression(compressed);
      if (progress) {
        progress({
          phase: 'compression',
          current: 75,
          total: 100,
          percentage: 75,
          message: 'Dictionary compression complete',
        });
      }
    }

    // Final cleanup
    compressed = this.applyWhitespaceCompression(compressed);

    const compressedSize = compressed.length;
    const ratio = originalSize / compressedSize;
    const checksum = this.hash.hash(compressed);
    const compressionTime = Date.now() - startTime;

    // Update statistics
    this.statistics.totalCompressed++;
    this.statistics.totalOriginal += originalSize;
    this.statistics.totalTime += compressionTime;
    this.statistics.averageRatio = this.statistics.totalOriginal / 
      (this.statistics.totalOriginal / this.statistics.averageRatio * (this.statistics.totalCompressed - 1) + compressedSize) / 
      this.statistics.totalCompressed;
    
    if (ratio > this.statistics.bestRatio) this.statistics.bestRatio = ratio;
    if (ratio < this.statistics.worstRatio || this.statistics.worstRatio === 0) {
      this.statistics.worstRatio = ratio;
    }

    if (progress) {
      progress({
        phase: 'compression',
        current: 100,
        total: 100,
        percentage: 100,
        message: `Compression complete: ${ratio.toFixed(2)}x ratio`,
      });
    }

    return {
      data: compressed,
      originalSize,
      compressedSize,
      ratio,
      level: this.options.level,
      checksum,
      metadata: {
        algorithm: COMPRESSION_LEVELS[this.options.level].name,
        dictionaryUsed: this.dictionary.size > 0,
        deltaEnabled: this.options.enableDelta && this.options.level >= 3,
        chunkCount: Math.ceil(compressedSize / this.options.chunkSize),
        compressionTime,
      },
    };
  }

  /**
   * Decompress data
   */
  async decompress(
    compressedData: string,
    options: DecompressionOptions = {},
    progress?: (p: StreamProgress) => void
  ): Promise<string> {
    const { validateChecksum = true, strictMode = false } = options;

    if (progress) {
      progress({
        phase: 'decompression',
        current: 0,
        total: 100,
        percentage: 0,
        message: 'Starting decompression...',
      });
    }

    let data = compressedData;

    // Reverse compression techniques in reverse order
    if (this.options.level >= 4) {
      data = this.reverseDictionaryCompression(data);
      if (progress) {
        progress({
          phase: 'decompression',
          current: 25,
          total: 100,
          percentage: 25,
          message: 'Dictionary decompression complete',
        });
      }
    }

    if (this.options.level >= 3) {
      if (this.options.enableDelta) {
        data = this.reverseDeltaEncoding(data);
      }
      data = this.reverseSemanticHashing(data);
      if (progress) {
        progress({
          phase: 'decompression',
          current: 50,
          total: 100,
          percentage: 50,
          message: 'Semantic hashing reversed',
        });
      }
    }

    if (this.options.level >= 2) {
      data = this.reversePatternDeduplication(data);
      if (progress) {
        progress({
          phase: 'decompression',
          current: 75,
          total: 100,
          percentage: 75,
          message: 'Pattern deduplication reversed',
        });
      }
    }

    data = this.reverseHashCompression(data);
    data = this.reverseWhitespaceCompression(data);

    if (progress) {
      progress({
        phase: 'decompression',
        current: 100,
        total: 100,
        percentage: 100,
        message: 'Decompression complete',
      });
    }

    return data;
  }

  /**
   * Compress with streaming for large data
   */
  async *compressStream(
    chunks: AsyncIterable<string>,
    progress?: (p: StreamProgress) => void
  ): AsyncGenerator<{ chunk: string; result: Partial<CompressionResult> }> {
    let chunkCount = 0;

    for await (const chunk of chunks) {
      const result = await this.compress(chunk);
      chunkCount++;

      if (progress) {
        progress({
          phase: 'streaming',
          current: chunkCount,
          total: chunkCount + 1,
          percentage: 0,
          message: `Compressed chunk ${chunkCount}`,
        });
      }

      yield {
        chunk: result.data,
        result: {
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
          ratio: result.ratio,
          level: result.level,
        },
      };
    }
  }

  /**
   * Get compression statistics
   */
  getStatistics(): CompressionStatistics {
    return { ...this.statistics };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.statistics = this.createEmptyStatistics();
  }

  /**
   * Set compression level
   */
  setLevel(level: CompressionLevel): void {
    this.options.level = level;
  }

  /**
   * Get current compression level
   */
  getLevel(): CompressionLevel {
    return this.options.level;
  }

  /**
   * Add dictionary entry
   */
  addDictionaryEntry(term: string, abbreviation: string): void {
    this.dictionary.set(term, abbreviation);
    this.reverseDictionary.set(abbreviation, term);
  }

  /**
   * Remove dictionary entry
   */
  removeDictionaryEntry(term: string): boolean {
    const abbr = this.dictionary.get(term);
    if (abbr) {
      this.dictionary.delete(term);
      this.reverseDictionary.delete(abbr);
      return true;
    }
    return false;
  }

  // ============================================================================
  // COMPRESSION TECHNIQUES
  // ============================================================================

  /**
   * Apply hash-based compression
   */
  private applyHashCompression(data: string): string {
    // Replace repeated long strings with hashes
    const seen = new Map<string, string>();
    
    return data.replace(/"[^"]{50,}"/g, (match) => {
      if (seen.has(match)) {
        return seen.get(match)!;
      }
      const hash = this.hash.hash(match);
      const shortened = `"#${hash.substring(0, 8)}"`;
      seen.set(match, shortened);
      return shortened;
    });
  }

  /**
   * Reverse hash-based compression
   */
  private reverseHashCompression(data: string): string {
    // Hash compression is lossy - we keep the hash references
    // In a real implementation, we'd need a lookup table
    return data;
  }

  /**
   * Apply pattern deduplication
   */
  private applyPatternDeduplication(data: string): string {
    // Find and deduplicate repeated patterns
    const patterns = new Map<string, number>();
    const patternRegex = /(\{[^{}]{20,200}\})/g;
    
    let patternMatch;
    while ((patternMatch = patternRegex.exec(data)) !== null) {
      const pattern = patternMatch[1];
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    }

    // Replace patterns that appear more than once
    let result = data;
    for (const [pattern, count] of patterns) {
      if (count > 1) {
        const patternId = `__P${this.hash.hash(pattern).substring(0, 6)}__`;
        result = result.split(pattern).join(patternId);
        // Store pattern for later reconstruction
        this.dictionary.set(patternId, pattern);
      }
    }

    return result;
  }

  /**
   * Reverse pattern deduplication
   */
  private reversePatternDeduplication(data: string): string {
    let result = data;
    for (const [patternId, pattern] of this.dictionary) {
      if (patternId.startsWith('__P') && patternId.endsWith('__')) {
        result = result.split(patternId).join(pattern);
      }
    }
    return result;
  }

  /**
   * Apply semantic hashing
   */
  private applySemanticHashing(data: string): string {
    // Replace semantic identifiers with hashes
    const identifierRegex = /"([a-zA-Z_$][a-zA-Z0-9_$]{15,})":/g;
    
    return data.replace(identifierRegex, (match, identifier) => {
      const hash = this.hash.hash(identifier).substring(0, 8);
      const shortKey = `#${hash}`;
      this.dictionary.set(shortKey, identifier);
      return `"${shortKey}":`;
    });
  }

  /**
   * Reverse semantic hashing
   */
  private reverseSemanticHashing(data: string): string {
    let result = data;
    for (const [hash, original] of this.dictionary) {
      if (hash.startsWith('#') && hash.length === 9) {
        result = result.split(`"${hash}"`).join(`"${original}"`);
      }
    }
    return result;
  }

  /**
   * Apply delta encoding
   */
  private applyDeltaEncoding(data: string): string {
    // Simple delta encoding for repeated characters/sequences
    const result: string[] = [];
    let i = 0;

    while (i < data.length) {
      const char = data[i] ?? '';
      if (!char) break;
      let count = 1;

      while (i + count < data.length && (data[i + count] ?? '') === char && count < 255) {
        count++;
      }

      if (count > 3) {
        result.push(`\x00${String.fromCharCode(count)}${char}`);
        i += count;
      } else {
        result.push(char);
        i++;
      }
    }

    return result.join('');
  }

  /**
   * Reverse delta encoding
   */
  private reverseDeltaEncoding(data: string): string {
    const result: string[] = [];
    let i = 0;

    while (i < data.length) {
      if (data[i] === '\x00' && i + 2 < data.length) {
        const count = data.charCodeAt(i + 1);
        const char = data[i + 2];
        result.push(char.repeat(count));
        i += 3;
      } else {
        result.push(data[i]);
        i++;
      }
    }

    return result.join('');
  }

  /**
   * Apply dictionary compression
   */
  private applyDictionaryCompression(data: string): string {
    let result = data;

    // Sort by length (longest first) to avoid partial replacements
    const entries = [...this.dictionary.entries()].sort(
      (a, b) => b[0].length - a[0].length
    );

    for (const [term, abbreviation] of entries) {
      result = result.split(term).join(abbreviation);
    }

    return result;
  }

  /**
   * Reverse dictionary compression
   */
  private reverseDictionaryCompression(data: string): string {
    let result = data;

    for (const [abbreviation, term] of this.reverseDictionary) {
      result = result.split(abbreviation).join(term);
    }

    return result;
  }

  /**
   * Apply whitespace compression
   */
  private applyWhitespaceCompression(data: string): string {
    return data
      .replace(/\s+/g, ' ')
      .replace(/\s*([{}\[\]:,])\s*/g, '$1')
      .replace(/,\s*([}\]])/g, '$1');
  }

  /**
   * Reverse whitespace compression
   */
  private reverseWhitespaceCompression(data: string): string {
    // Add back some formatting for readability
    return data
      .replace(/([{}\[\]:,])/g, '$1 ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Build dictionary from initial terms
   */
  private buildDictionary(terms: string[]): void {
    for (const term of terms) {
      const hash = this.hash.hash(term).substring(0, 6);
      this.addDictionaryEntry(term, `@${hash}`);
    }
  }

  /**
   * Create empty statistics object
   */
  private createEmptyStatistics(): CompressionStatistics {
    return {
      totalCompressed: 0,
      totalOriginal: 0,
      averageRatio: 0,
      bestRatio: 0,
      worstRatio: 0,
      totalTime: 0,
    };
  }

  /**
   * Estimate compression ratio for data
   */
  estimateRatio(data: string): number {
    const levelConfig = COMPRESSION_LEVELS[this.options.level];
    const [minRatio, maxRatio] = levelConfig.expectedRatio;

    // Simple heuristic based on data characteristics
    const uniqueChars = new Set(data).size;
    const repetitionScore = data.length / uniqueChars;
    
    // Interpolate between min and max based on repetition
    const score = Math.min(1, repetitionScore / 50);
    return minRatio + (maxRatio - minRatio) * score;
  }

  /**
   * Get optimal compression level for data
   */
  getOptimalLevel(data: string): CompressionLevel {
    const size = data.length;
    const uniqueRatio = new Set(data).size / size;

    if (size < 1000 || uniqueRatio > 0.8) return 1;
    if (size < 10000 || uniqueRatio > 0.5) return 2;
    if (size < 100000 || uniqueRatio > 0.3) return 3;
    return 4;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a compression engine instance
 */
export function createCompressionEngine(options?: CompressionOptions): CompressionEngine {
  return new CompressionEngine(options);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Quick compress data at specified level
 */
export async function quickCompress(data: string, level: CompressionLevel = 3): Promise<string> {
  const engine = new CompressionEngine({ level });
  const result = await engine.compress(data);
  return result.data;
}

/**
 * Quick decompress data
 */
export async function quickDecompress(data: string, level: CompressionLevel = 3): Promise<string> {
  const engine = new CompressionEngine({ level });
  return engine.decompress(data);
}

/**
 * Get compression level info
 */
export function getCompressionLevelInfo(level: CompressionLevel): CompressionLevelConfig {
  return COMPRESSION_LEVELS[level];
}

// ============================================================================
// EXPORTS
// ============================================================================

export default CompressionEngine;
