/**
 * LLMemory-Palace v3.0.0
 * TypeScript Definitions
 */

declare module 'llmemory-palace' {
  export class Palace {
    constructor(projectPath: string, options?: PalaceOptions);
    init(): Promise<InitResult>;
    scan(): Promise<ScanResult>;
    export(options?: ExportOptions): Promise<string>;
    generateGenome(): Promise<string>;
    compress(): Promise<CompressionResult>;
    createPack(): Promise<Pack>;
    mergePack(pack: Pack, outputDir: string): Promise<MergeResult>;
    query(queryString: string): Promise<string>;
    getStatus(): Promise<StatusResult>;
  }

  export interface PalaceOptions {
    exclude?: string[];
    maxFileSize?: number;
    patterns?: boolean;
    flows?: boolean;
    includeTests?: boolean;
    includeHidden?: boolean;
  }

  export interface ScanResult {
    files: number;
    lines: number;
    size: number;
    languages: string[];
    patterns: number;
    flows: number;
  }

  export interface ExportOptions {
    format?: 'cxml' | 'json' | 'genome';
    level?: number;
    compress?: boolean;
  }

  export interface CompressionResult {
    originalSize: number;
    compressedSize: number;
    ratio: string;
    content?: string;
  }

  export interface Pack {
    version: string;
    name: string;
    created: string;
    files: PackFile[];
    patterns: Pattern[];
    flows: Flow[];
  }

  export interface PackFile {
    path: string;
    content: string;
    language: string;
    lines: number;
    hash: string;
  }

  export interface Pattern {
    name: string;
    template: string;
    instances: Record<string, unknown>[];
  }

  export interface Flow {
    name: string;
    steps: string[];
  }

  export function safeGenomeParse(
    data: string | object | Buffer,
    options?: ParseOptions
  ): ValidatedGenome;

  export function executeGenome(
    genome: string | object,
    context?: ExecutionContext
  ): ExecutionResult;

  export function validatePath(
    path: string,
    options?: PathOptions
  ): string;

  export function validateCommand(
    command: string,
    options: Record<string, unknown>
  ): Record<string, unknown>;

  export function sanitizeString(
    input: string,
    options?: SanitizeOptions
  ): string;

  export class GenomeParseError extends Error {}
  export class GenomeValidationError extends Error {}
  export class SecurityError extends Error {}
  export class ValidationError extends Error {}
}

export default Palace;
