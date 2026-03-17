/**
 * LLMemory-Palace v3.0 - Genome Encoder
 * 
 * Encodes code indexes into ultra-compressed genome format.
 * Adapted from genome.js with streaming and differential encoding support.
 * 
 * @module genome/genome-encoder
 * @version 3.0.0
 */

import {
  CodeIndex,
  IndexedFile,
  ExtractedPattern,
  ExtractedFlow,
  PatternInstance,
  GenomeHeader,
  GenomeChunk,
  ParsedGenome,
  HashTable,
  GenomeConfig,
  CompressionLevel,
  StreamProgress,
  DifferentialGenome,
  FileAnalysis,
  Symbol,
} from '../types.js';
import { SemanticHash } from '../core/semantic-hash.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Encoding options
 */
export interface EncodingOptions {
  compressionLevel?: CompressionLevel;
  includeSource?: boolean;
  includeAST?: boolean;
  chunkSize?: number;
  generateDiffs?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Encoding result
 */
export interface EncodingResult {
  genome: string;
  chunks: GenomeChunk[];
  statistics: EncodingStatistics;
  checksum: string;
}

/**
 * Encoding statistics
 */
export interface EncodingStatistics {
  totalFiles: number;
  totalPatterns: number;
  totalFlows: number;
  totalEntities: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  encodingTime: number;
  chunkCount: number;
}

/**
 * Differential encoding options
 */
export interface DifferentialOptions {
  baseGenome: ParsedGenome;
  includeAdditions?: boolean;
  includeDeletions?: boolean;
  includeModifications?: boolean;
}

/**
 * Incremental encoding result
 */
export interface IncrementalResult {
  chunk: GenomeChunk;
  statistics: {
    itemsProcessed: number;
    bytesEncoded: number;
  };
}

// ============================================================================
// GENOME ENCODER CLASS
// ============================================================================

/**
 * Encodes code indexes into genome format
 */
export class GenomeEncoder {
  private hash: SemanticHash;
  private options: Required<EncodingOptions>;
  private chunks: GenomeChunk[] = [];
  private currentOrder: number = 0;

  private static readonly DEFAULT_OPTIONS: Required<EncodingOptions> = {
    compressionLevel: 3,
    includeSource: false,
    includeAST: false,
    chunkSize: 64 * 1024, // 64KB chunks
    generateDiffs: true,
    metadata: {},
  };

  constructor(options?: EncodingOptions) {
    this.options = { ...GenomeEncoder.DEFAULT_OPTIONS, ...options };
    this.hash = new SemanticHash();
  }

  /**
   * Encode complete code index to genome
   */
  async encode(index: CodeIndex, progress?: (p: StreamProgress) => void): Promise<EncodingResult> {
    const startTime = Date.now();
    this.chunks = [];
    this.currentOrder = 0;

    // Calculate original size
    const originalSize = this.calculateOriginalSize(index);

    // Build hash table
    const hashTable = this.buildHashTable(index);

    // Create header
    const header = this.createHeader(index);

    // Encode patterns
    const patterns = await this.encodePatterns(index.patterns, progress);

    // Encode flows
    const flows = await this.encodeFlows(index.flows, progress);

    // Encode entities
    const entities = await this.encodeEntities(Array.from(index.entities), progress);

    // Encode config
    const config = this.encodeConfig(index);

    // Build complete genome
    const genome: ParsedGenome = {
      header,
      patterns,
      flows,
      entities,
      config,
      hashTable,
    };

    // Generate chunks
    const genomeString = JSON.stringify(genome);
    this.chunks = this.generateChunks(genomeString);

    // Calculate checksum
    const checksum = this.hash.hash(genomeString);

    // Update header with checksum
    genome.header.checksum = checksum;

    const encodingTime = Date.now() - startTime;
    const compressedSize = genomeString.length;

    return {
      genome: JSON.stringify(genome),
      chunks: this.chunks,
      statistics: {
        totalFiles: index.files.length,
        totalPatterns: index.patterns.length,
        totalFlows: index.flows.length,
        totalEntities: index.entities.size,
        originalSize,
        compressedSize,
        compressionRatio: originalSize / compressedSize,
        encodingTime,
        chunkCount: this.chunks.length,
      },
      checksum,
    };
  }

  /**
   * Stream encode with async generator
   */
  async *encodeStream(
    files: IndexedFile[],
    progress?: (p: StreamProgress) => void
  ): AsyncGenerator<GenomeChunk> {
    const total = files.length;
    let current = 0;

    // Yield header chunk first
    const header: GenomeHeader = {
      version: 'v30',
      timestamp: new Date().toISOString(),
      compressionLevel: this.options.compressionLevel,
      checksum: '', // Will be updated at end
      metadata: this.options.metadata,
    };

    yield this.createChunk('header', header);
    current++;

    // Process files in batches
    for (const file of files) {
      const fileChunk = await this.encodeFileIncremental(file);
      yield fileChunk;

      current++;
      if (progress) {
        progress({
          phase: 'encoding',
          current,
          total,
          percentage: Math.round((current / total) * 100),
          message: `Encoded ${file.path}`,
        });
      }
    }

    // Yield footer chunk
    yield this.createChunk('footer', {
      totalFiles: files.length,
      encodingComplete: true,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Encode single file incrementally
   */
  async encodeIncremental(file: IndexedFile): Promise<IncrementalResult> {
    const chunk = await this.encodeFileIncremental(file);
    return {
      chunk,
      statistics: {
        itemsProcessed: 1,
        bytesEncoded: JSON.stringify(chunk).length,
      },
    };
  }

  /**
   * Encode with differential from previous genome
   */
  async encodeWithDifferential(
    current: CodeIndex,
    previous: ParsedGenome,
    progress?: (p: StreamProgress) => void
  ): Promise<{ genome: string; diff: DifferentialGenome; statistics: EncodingStatistics }> {
    const currentResult = await this.encode(current, progress);
    const currentGenome = JSON.parse(currentResult.genome) as ParsedGenome;

    // Calculate additions
    const additions: PatternInstance[] = [];
    for (const [patternName, instances] of Object.entries(currentGenome.patterns)) {
      const prevInstances = previous.patterns[patternName] || [];
      for (const instance of instances) {
        if (!prevInstances.some(p => JSON.stringify(p) === JSON.stringify(instance))) {
          additions.push({ ...instance, _pattern: patternName });
        }
      }
    }

    // Calculate deletions
    const deletions: string[] = [];
    for (const [patternName, instances] of Object.entries(previous.patterns)) {
      const currInstances = currentGenome.patterns[patternName] || [];
      for (const instance of instances) {
        if (!currInstances.some(c => JSON.stringify(c) === JSON.stringify(instance))) {
          const id = this.hash.hash(JSON.stringify(instance));
          deletions.push(id);
        }
      }
    }

    // Calculate modifications
    const modifications: DifferentialGenome['modifications'] = [];
    // Simplified modification detection
    for (const patternName of Object.keys(currentGenome.patterns)) {
      if (previous.patterns[patternName] && currentGenome.patterns[patternName]) {
        const prevHash = this.hash.hash(JSON.stringify(previous.patterns[patternName]));
        const currHash = this.hash.hash(JSON.stringify(currentGenome.patterns[patternName]));
        if (prevHash !== currHash) {
          modifications.push({
            id: patternName,
            before: previous.patterns[patternName],
            after: currentGenome.patterns[patternName],
          });
        }
      }
    }

    const diff: DifferentialGenome = {
      baseHash: previous.header.checksum,
      additions,
      deletions,
      modifications,
    };

    return {
      genome: currentResult.genome,
      diff,
      statistics: currentResult.statistics,
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Encode patterns section
   */
  private async encodePatterns(
    patterns: ExtractedPattern[],
    progress?: (p: StreamProgress) => void
  ): Promise<Record<string, PatternInstance[]>> {
    const result: Record<string, PatternInstance[]> = {};
    const total = patterns.length;
    let current = 0;

    for (const pattern of patterns) {
      const patternName = pattern.name;
      if (!result[patternName]) {
        result[patternName] = [];
      }

      // Convert ExtractedPattern to PatternInstance
      const instance: PatternInstance = {
        type: pattern.type,
        name: pattern.name,
        pattern: pattern.pattern,
      };

      if (pattern.extends) {
        instance.extends = pattern.extends;
      }
      if (pattern.method) {
        instance.method = pattern.method;
      }
      if (pattern.path) {
        instance.path = pattern.path;
      }
      if (pattern.module) {
        instance.module = pattern.module;
      }

      result[patternName].push(instance);
      current++;

      if (progress && current % 100 === 0) {
        progress({
          phase: 'patterns',
          current,
          total,
          percentage: Math.round((current / total) * 100),
          message: `Encoded pattern: ${patternName}`,
        });
      }
    }

    return result;
  }

  /**
   * Encode flows section
   */
  private async encodeFlows(
    flows: ExtractedFlow[],
    progress?: (p: StreamProgress) => void
  ): Promise<Record<string, string[]>> {
    const result: Record<string, string[]> = {};
    const total = flows.length;
    let current = 0;

    for (const flow of flows) {
      result[flow.name] = flow.steps;
      current++;

      if (progress && current % 50 === 0) {
        progress({
          phase: 'flows',
          current,
          total,
          percentage: Math.round((current / total) * 100),
          message: `Encoded flow: ${flow.name}`,
        });
      }
    }

    return result;
  }

  /**
   * Encode entities section
   */
  private async encodeEntities(
    entities: string[],
    progress?: (p: StreamProgress) => void
  ): Promise<string[]> {
    if (progress) {
      progress({
        phase: 'entities',
        current: 0,
        total: entities.length,
        percentage: 0,
        message: 'Encoding entities...',
      });
    }

    // Sort and deduplicate entities
    return [...new Set(entities)].sort();
  }

  /**
   * Encode config section
   */
  private encodeConfig(index: CodeIndex): GenomeConfig {
    const config: GenomeConfig = {};

    // Extract config from patterns if available
    for (const pattern of index.patterns) {
      if (pattern.type === 'class' && pattern.name.includes('Config')) {
        // Extract config-like patterns
        config[pattern.name] = pattern.pattern;
      }
    }

    // Add default config
    config.version = '3.0.0';
    config.encoding = 'utf-8';

    return config;
  }

  /**
   * Build hash table from index
   */
  private buildHashTable(index: CodeIndex): HashTable {
    const table: HashTable = {};

    // Hash patterns
    for (const pattern of index.patterns) {
      const hash = this.hash.hash(pattern.name);
      table[pattern.name] = hash;
    }

    // Hash flows
    for (const flow of index.flows) {
      const hash = this.hash.hash(flow.name);
      table[flow.name] = hash;
    }

    // Hash entities
    for (const entity of index.entities) {
      const hash = this.hash.hash(entity);
      table[entity] = hash;
    }

    // Hash files
    for (const file of index.files) {
      const hash = this.hash.hash(file.path);
      table[file.path] = hash;
    }

    return table;
  }

  /**
   * Create genome header
   */
  private createHeader(index: CodeIndex): GenomeHeader {
    return {
      version: 'v30',
      timestamp: new Date().toISOString(),
      compressionLevel: this.options.compressionLevel,
      checksum: '', // Will be updated after encoding
      metadata: {
        fileCount: index.files.length,
        patternCount: index.patterns.length,
        flowCount: index.flows.length,
        entityCount: index.entities.size,
        ...this.options.metadata,
      },
    };
  }

  /**
   * Calculate original size of index
   */
  private calculateOriginalSize(index: CodeIndex): number {
    let size = 0;

    for (const file of index.files) {
      size += file.content.length;
    }

    for (const pattern of index.patterns) {
      size += JSON.stringify(pattern).length;
    }

    for (const flow of index.flows) {
      size += JSON.stringify(flow).length;
    }

    size += JSON.stringify(Array.from(index.entities)).length;

    return size;
  }

  /**
   * Generate chunks from genome string
   */
  private generateChunks(genomeString: string): GenomeChunk[] {
    const chunks: GenomeChunk[] = [];
    const chunkSize = this.options.chunkSize;
    let order = 0;

    for (let i = 0; i < genomeString.length; i += chunkSize) {
      const data = genomeString.slice(i, i + chunkSize);
      chunks.push({
        id: `chunk-${order}`,
        type: order === 0 ? 'header' : order === Math.ceil(genomeString.length / chunkSize) - 1 ? 'footer' : 'patterns',
        data,
        checksum: this.hash.hash(data),
        order: order++,
      });
    }

    return chunks;
  }

  /**
   * Create a single chunk
   */
  private createChunk(type: GenomeChunk['type'], data: unknown): GenomeChunk {
    return {
      id: `chunk-${this.currentOrder++}`,
      type,
      data,
      checksum: this.hash.hash(JSON.stringify(data)),
      order: this.currentOrder - 1,
    };
  }

  /**
   * Encode file incrementally
   */
  private async encodeFileIncremental(file: IndexedFile): Promise<GenomeChunk> {
    const encoded = {
      path: file.path,
      hash: file.hash,
      analysis: this.compressAnalysis(file.analysis),
    };

    return this.createChunk('patterns', encoded);
  }

  /**
   * Compress file analysis for encoding
   */
  private compressAnalysis(analysis: FileAnalysis): Record<string, unknown> {
    const compressed: Record<string, unknown> = {
      lang: analysis.language,
      symCount: analysis.symbols.length,
      depCount: analysis.dependencies.length,
    };

    if (analysis.patterns.length > 0) {
      compressed.patCount = analysis.patterns.length;
    }

    if (analysis.flows.length > 0) {
      compressed.flowCount = analysis.flows.length;
    }

    if (analysis.metrics) {
      compressed.lines = analysis.metrics.lines;
      compressed.chars = analysis.metrics.characters;
    }

    return compressed;
  }

  /**
   * Merge multiple chunks into single genome
   */
  mergeChunks(chunks: GenomeChunk[]): string {
    // Sort by order
    const sorted = [...chunks].sort((a, b) => a.order - b.order);

    // Combine data
    let combined = '';
    for (const chunk of sorted) {
      if (typeof chunk.data === 'string') {
        combined += chunk.data;
      } else {
        combined += JSON.stringify(chunk.data);
      }
    }

    return combined;
  }

  /**
   * Validate chunks integrity
   */
  validateChunks(chunks: GenomeChunk[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for duplicate orders
    const orders = new Set<number>();
    for (const chunk of chunks) {
      if (orders.has(chunk.order)) {
        errors.push(`Duplicate chunk order: ${chunk.order}`);
      }
      orders.add(chunk.order);
    }

    // Check for gaps
    const sortedOrders = [...orders].sort((a, b) => a - b);
    for (let i = 0; i < sortedOrders.length - 1; i++) {
      if (sortedOrders[i + 1] - sortedOrders[i] > 1) {
        errors.push(`Gap in chunk order between ${sortedOrders[i]} and ${sortedOrders[i + 1]}`);
      }
    }

    // Verify checksums
    for (const chunk of chunks) {
      const data = typeof chunk.data === 'string' ? chunk.data : JSON.stringify(chunk.data);
      const expectedChecksum = this.hash.hash(data);
      if (chunk.checksum !== expectedChecksum) {
        errors.push(`Checksum mismatch for chunk ${chunk.id}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a genome encoder instance
 */
export function createGenomeEncoder(options?: EncodingOptions): GenomeEncoder {
  return new GenomeEncoder(options);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default GenomeEncoder;
