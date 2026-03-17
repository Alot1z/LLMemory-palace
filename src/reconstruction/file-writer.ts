/**
 * File Writer - File structure recreation
 * Phase 4: Reconstruction Layer
 */

import type { CodeIndex, FileInfo, IndexedFile } from '../types.js';

export interface WriterConfig {
  outputDir: string;
  preserveStructure: boolean;
  createDirectories: boolean;
  overwrite: boolean;
  dryRun: boolean;
  encoding: BufferEncoding;
  lineEnding: 'lf' | 'crlf';
}

export interface WriteResult {
  path: string;
  success: boolean;
  bytesWritten: number;
  error?: string;
}

export interface DirectoryStructure {
  path: string;
  type: 'file' | 'directory';
  children?: DirectoryStructure[];
}

const DEFAULT_CONFIG: WriterConfig = {
  outputDir: './output',
  preserveStructure: true,
  createDirectories: true,
  overwrite: false,
  dryRun: false,
  encoding: 'utf-8',
  lineEnding: 'lf'
};

export class FileWriter {
  private config: WriterConfig;
  private written: Map<string, WriteResult>;
  private pending: Map<string, string>;

  constructor(config: Partial<WriterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.written = new Map();
    this.pending = new Map();
  }

  queue(path: string, content: string): void {
    const normalizedPath = this.normalizePath(path);
    this.pending.set(normalizedPath, content);
  }

  async writeAll(): Promise<WriteResult[]> {
    const results: WriteResult[] = [];

    for (const [path, content] of this.pending) {
      const result = await this.writeFile(path, content);
      results.push(result);
      this.written.set(path, result);
    }

    this.pending.clear();
    return results;
  }

  async writeFile(path: string, content: string): Promise<WriteResult> {
    const fullPath = this.resolvePath(path);
    const normalizedContent = this.normalizeLineEndings(content);

    if (this.config.dryRun) {
      return {
        path: fullPath,
        success: true,
        bytesWritten: Buffer.byteLength(normalizedContent, this.config.encoding)
      };
    }

    try {
      // In a real implementation, this would use fs.writeFileSync
      // For now, we simulate the write operation
      const bytesWritten = Buffer.byteLength(normalizedContent, this.config.encoding);
      
      return {
        path: fullPath,
        success: true,
        bytesWritten
      };
    } catch (error) {
      return {
        path: fullPath,
        success: false,
        bytesWritten: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async writeFromIndex(index: CodeIndex): Promise<WriteResult[]> {
    const results: WriteResult[] = [];

    for (const fileInfo of index.files) {
      const content = await this.generateFileContent(fileInfo);
      const result = await this.writeFile(fileInfo.path, content);
      results.push(result);
    }

    return results;
  }

  private async generateFileContent(fileInfo: IndexedFile): Promise<string> {
    const lines: string[] = [];

    // Header
    lines.push(`// File: ${fileInfo.path}`);
    lines.push(`// Hash: ${fileInfo.hash}`);
    lines.push('');

    // Imports from analysis
    if (fileInfo.analysis.dependencies.length > 0) {
      for (const dep of fileInfo.analysis.dependencies) {
        lines.push(`import ... from '${dep.to}';`);
      }
      lines.push('');
    }

    // Symbols from analysis
    for (const symbol of fileInfo.analysis.symbols) {
      lines.push(`// Symbol: ${symbol.name} (${symbol.type})`);
      lines.push(`// Signature: ${symbol.signature || 'N/A'}`);
      lines.push('');
    }

    // Exports from analysis
    if (fileInfo.analysis.exports.length > 0) {
      lines.push('export {');
      for (const exp of fileInfo.analysis.exports) {
        lines.push(`  ${exp.name},`);
      }
      lines.push('};');
    }

    return lines.join('\n');
  }

  analyzeStructure(index: CodeIndex): DirectoryStructure {
    const root: DirectoryStructure = {
      path: this.config.outputDir,
      type: 'directory',
      children: []
    };

    const directories = new Map<string, DirectoryStructure>();

    for (const fileInfo of index.files) {
      const parts = fileInfo.path.split('/').filter(Boolean);
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;

        if (isFile) {
          current.children = current.children || [];
          current.children.push({
            path: part,
            type: 'file'
          });
        } else {
          const dirPath = parts.slice(0, i + 1).join('/');
          
          if (!directories.has(dirPath)) {
            const dir: DirectoryStructure = {
              path: part,
              type: 'directory',
              children: []
            };
            directories.set(dirPath, dir);
            current.children = current.children || [];
            current.children.push(dir);
          }
          
          current = directories.get(dirPath)!;
        }
      }
    }

    return root;
  }

  private normalizePath(path: string): string {
    return path.replace(/\\/g, '/').replace(/\/+/g, '/');
  }

  private resolvePath(path: string): string {
    if (path.startsWith('/')) {
      return path;
    }
    return `${this.config.outputDir}/${path}`;
  }

  private normalizeLineEndings(content: string): string {
    if (this.config.lineEnding === 'crlf') {
      return content.replace(/\n/g, '\r\n');
    }
    return content.replace(/\r\n/g, '\n');
  }

  getStats(): { total: number; success: number; failed: number; bytes: number } {
    let success = 0;
    let failed = 0;
    let bytes = 0;

    for (const result of this.written.values()) {
      if (result.success) {
        success++;
        bytes += result.bytesWritten;
      } else {
        failed++;
      }
    }

    return {
      total: this.written.size,
      success,
      failed,
      bytes
    };
  }

  clear(): void {
    this.written.clear();
    this.pending.clear();
  }
}

export function createFileWriter(config?: Partial<WriterConfig>): FileWriter {
  return new FileWriter(config);
}
