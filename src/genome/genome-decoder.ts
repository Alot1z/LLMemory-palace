/**
 * LLMemory-Palace v3.0 - Genome Decoder
 * 
 * Decodes genome format back to usable code index.
 * Supports streaming decoding and differential reconstruction.
 * 
 * @module genome/genome-decoder
 * @version 3.0.0
 */

import {
  GenomeChunk,
  ParsedGenome,
  CodeIndex,
  ExtractedPattern,
  ExtractedFlow,
  PatternInstance,
  StreamProgress,
  DifferentialGenome,
  ValidationResult,
} from '../types.js';
import { GenomeValidator } from './genome-validator.js';
import { SemanticHash } from '../core/semantic-hash.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Decoding options
 */
export interface DecodingOptions {
  validateChecksums?: boolean;
  strictMode?: boolean;
  maxMemory?: number; // Max memory in bytes
  progressInterval?: number; // Progress callback interval in ms
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

// ============================================================================
// GENOME DECODER CLASS
// ============================================================================

/**
 * Decodes genome format back to code index
 */
export class GenomeDecoder {
  private validator: GenomeValidator;
  private hash: SemanticHash;
  private options: Required<DecodingOptions>;
  private chunks: GenomeChunk[] = [];
  private memoryUsage: number = 0;

  private static readonly DEFAULT_OPTIONS: Required<DecodingOptions> = {
    validateChecksums: true,
    strictMode: true,
    maxMemory: 512 * 1024 * 1024, // 512MB
    progressInterval: 100, // 100ms
  };

  constructor(options?: DecodingOptions) {
    this.options = { ...GenomeDecoder.DEFAULT_OPTIONS, ...options };
    this.validator = new GenomeValidator({ strictMode: this.options.strictMode });
    this.hash = new SemanticHash();
  }

  /**
   * Decode genome string to code index
   */
  async decode(genomeString: string, progress?: (p: StreamProgress) => void): Promise<DecodingResult> {
    const startTime = Date.now();

    // Validate raw genome
    const rawValidation = this.validator.validateRawGenome(genomeString);
    if (!rawValidation.valid) {
      return {
        index: this.createEmptyIndex(),
        statistics: this.createEmptyStats(),
        validation: rawValidation,
      };
    }

    // Parse genome
    const { genome, validation } = this.validator.safeParse(genomeString);
    if (!genome || !validation.valid) {
      return {
        index: this.createEmptyIndex(),
        statistics: this.createEmptyStats(),
        validation,
      };
    }

    // Decode to index
    const index = await this.decodeToIndex(genome, progress);
    const decodingTime = Date.now() - startTime;

    return {
      index,
      statistics: {
        totalChunks: this.chunks.length,
        totalPatterns: index.patterns.length,
        totalFlows: index.flows.length,
        totalEntities: index.entities.size,
        decodedSize: genomeString.length,
        decodingTime,
        memoryPeak: this.memoryUsage,
      },
      validation: {
        valid: true,
        errors: [],
        warnings: validation.warnings,
      },
    };
  }

  /**
   * Stream decode from chunks
   */
  async *decodeStream(
    chunks: AsyncIterable<GenomeChunk>,
    progress?: (p: StreamProgress) => void
  ): AsyncGenerator<{ chunk: GenomeChunk; result: Partial<DecodingResult> }> {
    this.chunks = [];
    let order = 0;

    for await (const chunk of chunks) {
      // Validate chunk
      const chunkValidation = this.validator.validateChunk(chunk);
      if (!chunkValidation.valid) {
        yield {
          chunk,
          result: {
            index: this.createEmptyIndex(),
            statistics: this.createEmptyStats(),
            validation: chunkValidation,
          },
        };
        continue;
      }

      // Store chunk
      this.chunks.push(chunk);
      this.memoryUsage += JSON.stringify(chunk).length;

      // Check memory limit
      if (this.memoryUsage > this.options.maxMemory) {
        throw new Error(`Memory limit exceeded: ${this.memoryUsage} > ${this.options.maxMemory}`);
      }

      if (progress) {
        progress({
          phase: 'decoding',
          current: order,
          total: order + 1,
          percentage: 0,
          message: `Decoded chunk ${chunk.id}`,
        });
      }

      order++;

      yield {
        chunk,
        result: {
          statistics: {
            totalChunks: order,
            totalPatterns: 0,
            totalFlows: 0,
            totalEntities: 0,
            decodedSize: this.memoryUsage,
            decodingTime: 0,
            memoryPeak: this.memoryUsage,
          },
          validation: { valid: true, errors: [], warnings: [] },
        },
      };
    }
  }

  /**
   * Decode chunks to complete index
   */
  async decodeChunks(chunks: GenomeChunk[], progress?: (p: StreamProgress) => void): Promise<DecodingResult> {
    // Validate all chunks first
    for (const chunk of chunks) {
      const validation = this.validator.validateChunk(chunk);
      if (!validation.valid) {
        return {
          index: this.createEmptyIndex(),
          statistics: this.createEmptyStats(),
          validation,
        };
      }
    }

    // Sort chunks by order
    const sorted = [...chunks].sort((a, b) => a.order - b.order);

    // Reconstruct genome string from chunks
    let genomeString = '';
    for (const chunk of sorted) {
      if (typeof chunk.data === 'string') {
        genomeString += chunk.data;
      } else {
        genomeString += JSON.stringify(chunk.data);
      }
    }

    return this.decode(genomeString, progress);
  }

  /**
   * Apply differential to base genome
   */
  async applyDifferential(
    base: ParsedGenome,
    diff: DifferentialGenome,
    progress?: (p: StreamProgress) => void
  ): Promise<{ genome: ParsedGenome; statistics: { additions: number; deletions: number; modifications: number } }> {
    const result: ParsedGenome = JSON.parse(JSON.stringify(base)); // Deep clone

    // Apply deletions
    for (const deletionId of diff.deletions) {
      for (const [patternName, instances] of Object.entries(result.patterns)) {
        const filtered = instances.filter(inst => {
          const id = this.hash.hash(JSON.stringify(inst));
          return id !== deletionId;
        });
        if (filtered.length === 0) {
          delete result.patterns[patternName];
        } else {
          result.patterns[patternName] = filtered;
        }
      }
    }

    // Apply additions
    for (const addition of diff.additions) {
      const patternName = (addition as PatternInstance & { _pattern?: string })._pattern || 'unknown';
      if (!result.patterns[patternName]) {
        result.patterns[patternName] = [];
      }
      const { _pattern, ...instance } = addition as PatternInstance & { _pattern?: string };
      result.patterns[patternName].push(instance as PatternInstance);
    }

    // Apply modifications
    for (const mod of diff.modifications) {
      if (result.patterns[mod.id]) {
        result.patterns[mod.id] = mod.after as PatternInstance[];
      }
    }

    // Update hash table
    this.updateHashTable(result);

    return {
      genome: result,
      statistics: {
        additions: diff.additions.length,
        deletions: diff.deletions.length,
        modifications: diff.modifications.length,
      },
    };
  }

  /**
   * Reconstruct source files from genome
   */
  async reconstruct(
    genome: ParsedGenome,
    options: ReconstructionOptions = {}
  ): Promise<ReconstructionResult> {
    const startTime = Date.now();
    const files = new Map<string, string>();

    // Reconstruct patterns to files
    for (const [patternName, instances] of Object.entries(genome.patterns)) {
      const content = this.reconstructPattern(patternName, instances);
      const filePath = `${options.outputDir || '.'}/patterns/${patternName}.ts`;
      files.set(filePath, content);
    }

    // Reconstruct flows to files
    for (const [flowName, steps] of Object.entries(genome.flows)) {
      const content = this.reconstructFlow(flowName, steps);
      const filePath = `${options.outputDir || '.'}/flows/${flowName}.ts`;
      files.set(filePath, content);
    }

    // Reconstruct entities
    const entitiesContent = this.reconstructEntities(genome.entities);
    files.set(`${options.outputDir || '.'}/entities/index.ts`, entitiesContent);

    return {
      files,
      statistics: {
        filesGenerated: files.size,
        totalLines: Array.from(files.values()).reduce((sum, content) => sum + content.split('\n').length, 0),
        reconstructionTime: Date.now() - startTime,
      },
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Decode parsed genome to code index
   */
  private async decodeToIndex(genome: ParsedGenome, progress?: (p: StreamProgress) => void): Promise<CodeIndex> {
    const index = this.createEmptyIndex();

    // Decode patterns
    if (progress) {
      progress({
        phase: 'patterns',
        current: 0,
        total: Object.keys(genome.patterns).length,
        percentage: 0,
        message: 'Decoding patterns...',
      });
    }

    let patternCount = 0;
    for (const [patternName, instances] of Object.entries(genome.patterns)) {
      for (const instance of instances) {
        const inst = instance as PatternInstance & { 
          type?: string; 
          name?: string; 
          pattern?: string;
          extends?: string;
          method?: string;
          path?: string;
          module?: string;
        };
        const pattern: ExtractedPattern = {
          type: (inst.type || 'function') as ExtractedPattern['type'],
          name: inst.name || patternName,
          pattern: inst.pattern || '',
          extends: inst.extends,
          method: inst.method,
          path: inst.path,
          module: inst.module,
        };
        index.patterns.push(pattern);
        patternCount++;
      }
    }

    // Decode flows
    if (progress) {
      progress({
        phase: 'flows',
        current: 0,
        total: Object.keys(genome.flows).length,
        percentage: 50,
        message: 'Decoding flows...',
      });
    }

    for (const [flowName, steps] of Object.entries(genome.flows)) {
      const flow: ExtractedFlow = {
        name: flowName,
        steps: steps,
        returns: 'void', // Default
      };
      index.flows.push(flow);
    }

    // Decode entities
    for (const entity of genome.entities) {
      index.entities.add(entity);
    }

    // Update statistics
    index.stats = {
      totalFiles: 0,
      totalPatterns: patternCount,
      totalFlows: index.flows.length,
      totalEntities: index.entities.size,
      totalSymbols: 0,
      totalDependencies: 0,
    };

    return index;
  }

  /**
   * Update hash table after modifications
   */
  private updateHashTable(genome: ParsedGenome): void {
    genome.hashTable = {};

    for (const [patternName, instances] of Object.entries(genome.patterns)) {
      genome.hashTable[patternName] = this.hash.hash(patternName);
      for (const instance of instances) {
        const id = this.hash.hash(JSON.stringify(instance));
        genome.hashTable[`${patternName}:${id}`] = id;
      }
    }

    for (const flowName of Object.keys(genome.flows)) {
      genome.hashTable[flowName] = this.hash.hash(flowName);
    }

    for (const entity of genome.entities) {
      genome.hashTable[entity] = this.hash.hash(entity);
    }
  }

  /**
   * Reconstruct pattern to source code
   */
  private reconstructPattern(name: string, instances: PatternInstance[]): string {
    const lines: string[] = [`// Pattern: ${name}`, `// Instances: ${instances.length}`, ''];

    for (const instance of instances) {
      if (instance.type === 'class') {
        lines.push(`class ${instance.name || name} {`);
        if (instance.extends) {
          lines.push(`  // extends: ${instance.extends}`);
        }
        if (instance.method) {
          lines.push(`  ${instance.method}() {}`);
        }
        lines.push('}', '');
      } else if (instance.type === 'function') {
        lines.push(`function ${instance.name || name}() {`);
        lines.push(`  // pattern: ${instance.pattern}`);
        lines.push('}', '');
      } else {
        lines.push(`// ${instance.type}: ${instance.name || name}`);
        lines.push(`// pattern: ${instance.pattern}`, '');
      }
    }

    return lines.join('\n');
  }

  /**
   * Reconstruct flow to source code
   */
  private reconstructFlow(name: string, steps: string[]): string {
    const lines: string[] = [`// Flow: ${name}`, `// Steps: ${steps.length}`, ''];

    lines.push(`async function ${name}() {`);
    for (let i = 0; i < steps.length; i++) {
      lines.push(`  // Step ${i + 1}: ${steps[i]}`);
    }
    lines.push('}', '');

    return lines.join('\n');
  }

  /**
   * Reconstruct entities to source code
   */
  private reconstructEntities(entities: string[]): string {
    const lines: string[] = ['// Entities', ''];

    for (const entity of entities) {
      lines.push(`export const ${entity} = Symbol('${entity}');`);
    }

    return lines.join('\n');
  }

  /**
   * Create empty code index
   */
  private createEmptyIndex(): CodeIndex {
    return {
      files: [],
      patterns: [],
      flows: [],
      entities: new Set(),
      dependencies: new Map(),
      symbols: new Map(),
      stats: {
        totalFiles: 0,
        totalPatterns: 0,
        totalFlows: 0,
        totalEntities: 0,
        totalSymbols: 0,
        totalDependencies: 0,
      },
    };
  }

  /**
   * Create empty statistics
   */
  private createEmptyStats(): DecodingStatistics {
    return {
      totalChunks: 0,
      totalPatterns: 0,
      totalFlows: 0,
      totalEntities: 0,
      decodedSize: 0,
      decodingTime: 0,
      memoryPeak: 0,
    };
  }

  /**
   * Get chunk by ID
   */
  getChunk(id: string): GenomeChunk | undefined {
    return this.chunks.find(c => c.id === id);
  }

  /**
   * Get all chunks
   */
  getChunks(): GenomeChunk[] {
    return [...this.chunks];
  }

  /**
   * Clear internal state
   */
  reset(): void {
    this.chunks = [];
    this.memoryUsage = 0;
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): number {
    return this.memoryUsage;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a genome decoder instance
 */
export function createGenomeDecoder(options?: DecodingOptions): GenomeDecoder {
  return new GenomeDecoder(options);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Quick decode genome string
 */
export async function quickDecode(genomeString: string): Promise<CodeIndex> {
  const decoder = new GenomeDecoder();
  const result = await decoder.decode(genomeString);
  return result.index;
}

/**
 * Validate genome string
 */
export function validateGenome(genomeString: string): ValidationResult {
  const validator = new GenomeValidator();
  return validator.validateRawGenome(genomeString);
}

/**
 * Parse genome string without full validation
 */
export function parseGenome(genomeString: string): ParsedGenome | null {
  const validator = new GenomeValidator({ strictMode: false });
  const { genome } = validator.safeParse(genomeString);
  return genome;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default GenomeDecoder;
