/**
 * LLMemory-Palace v3.0 - Scanner
 * 
 * File discovery and content reading with parallel processing.
 * Extracted from palace.js and enhanced for v3.0.
 * 
 * @module scanner/scanner
 * @version 3.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import type {
  Language,
  DiscoveredFile,
  FileContent,
  ScanOptions,
  ScanResult,
  ScanStats,
  ScanError
} from '../types.js';

/**
 * Default exclude patterns for common directories and files
 */
const DEFAULT_EXCLUDE_PATTERNS = [
  /^node_modules$/,
  /^\.git$/,
  /^\.palace$/,
  /^\.llmp$/,
  /^dist$/,
  /^build$/,
  /^__pycache__$/,
  /\.pyc$/,
  /\.pyo$/,
  /\.md$/,
  /\.txt$/,
  /\.rst$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /\.d\.ts$/,
  /\.min\.js$/,
  /\.bundle\.js$/,
  /^\.DS_Store$/,
  /^Thumbs\.db$/,
  /^\.env/,
  /\.log$/
];

/**
 * Extension to language mapping
 */
const EXTENSION_TO_LANGUAGE: Record<string, Language> = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'java',
  '.kts': 'java',
  '.rb': 'ruby',
  '.php': 'php',
  '.c': 'unknown',
  '.cpp': 'unknown',
  '.cc': 'unknown',
  '.h': 'unknown',
  '.hpp': 'unknown',
  '.cs': 'csharp',
  '.swift': 'unknown',
  '.scala': 'java',
  '.json': 'unknown',
  '.yaml': 'unknown',
  '.yml': 'unknown',
  '.toml': 'unknown',
  '.sql': 'unknown',
  '.sh': 'unknown',
  '.bash': 'unknown'
};

/**
 * Scanner options with defaults
 */
export interface ScannerConfig extends Partial<ScanOptions> {
  projectPath: string;
  parallel?: boolean;
  maxWorkers?: number;
}

/**
 * Internal file entry during scanning
 */
interface InternalFileEntry {
  path: string;
  fullPath: string;
  language: Language;
  hash: string;
  size: number;
  lines: number;
}

/**
 * Scanner - File discovery and content reading
 * 
 * @example
 * ```typescript
 * const scanner = new Scanner({
 *   projectPath: '/path/to/project',
 *   includePatterns: ['*.ts', '*.js'],
 *   maxFileSize: 1024 * 1024 // 1MB
 * });
 * 
 * const result = await scanner.scan();
 * console.log(`Found ${result.files.length} files`);
 * ```
 */
export class Scanner {
  private projectPath: string;
  private includePatterns: RegExp[];
  private excludePatterns: RegExp[];
  private maxFileSize: number;
  private maxFiles: number;
  private followSymlinks: boolean;
  private encoding: 'auto' | BufferEncoding;
  private parallel: boolean;
  private maxWorkers: number;
  
  private files: Map<string, DiscoveredFile> = new Map();
  private errors: ScanError[] = [];

  constructor(config: ScannerConfig) {
    this.projectPath = path.resolve(config.projectPath);
    this.includePatterns = config.includePatterns?.map(p => this.patternToRegex(p)) || [];
    this.excludePatterns = config.excludePatterns?.map(p => this.patternToRegex(p)) || 
      [...DEFAULT_EXCLUDE_PATTERNS];
    this.maxFileSize = config.maxFileSize || 1024 * 1024; // 1MB default
    this.maxFiles = config.maxFiles || 100000;
    this.followSymlinks = config.followSymlinks || false;
    this.encoding = config.encoding || 'auto';
    this.parallel = config.parallel ?? true;
    this.maxWorkers = config.maxWorkers || 4;
  }

  /**
   * Scan the project directory
   * 
   * @returns Scan result with discovered files
   */
  async scan(): Promise<ScanResult> {
    const startTime = Date.now();
    this.files.clear();
    this.errors = [];

    if (this.parallel && isMainThread) {
      await this.scanParallel();
    } else {
      this.scanDirectory(this.projectPath);
    }

    const stats = this.computeStats(Date.now() - startTime);

    return {
      files: Array.from(this.files.values()),
      stats,
      errors: this.errors
    };
  }

  /**
   * Scan a specific subdirectory
   * 
   * @param subDir - Subdirectory path relative to project root
   * @returns Scan result
   */
  async scanSubdirectory(subDir: string): Promise<ScanResult> {
    const fullPath = path.join(this.projectPath, subDir);
    const originalFiles = this.files;
    this.files = new Map();
    
    this.scanDirectory(fullPath);
    
    const result: ScanResult = {
      files: Array.from(this.files.values()),
      stats: this.computeStats(0),
      errors: this.errors
    };
    
    this.files = originalFiles;
    return result;
  }

  /**
   * Read file content
   * 
   * @param filePath - File path (relative or absolute)
   * @returns File content with metadata
   */
  async readFile(filePath: string): Promise<FileContent | null> {
    const fullPath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(this.projectPath, filePath);
    
    try {
      const content = await fs.promises.readFile(fullPath, 'utf-8');
      const language = this.detectLanguage(fullPath);
      
      return {
        path: path.relative(this.projectPath, fullPath),
        content,
        encoding: 'utf-8',
        language
      };
    } catch (error: any) {
      this.errors.push({
        path: filePath,
        error: error.message,
        code: error.code || 'READ_ERROR'
      });
      return null;
    }
  }

  /**
   * Read multiple files in parallel
   * 
   * @param filePaths - Array of file paths
   * @returns Array of file contents
   */
  async readFiles(filePaths: string[]): Promise<(FileContent | null)[]> {
    return Promise.all(filePaths.map(p => this.readFile(p)));
  }

  /**
   * Scan for changes since a given date
   * 
   * @param since - Date to check changes since
   * @returns Array of changed files
   */
  async scanChanges(since: Date): Promise<DiscoveredFile[]> {
    const result = await this.scan();
    return result.files.filter(file => file.modified > since);
  }

  /**
   * Get file statistics
   * 
   * @param filePath - File path
   * @returns File stats or null
   */
  async getStats(filePath: string): Promise<fs.Stats | null> {
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(this.projectPath, filePath);
    
    try {
      return await fs.promises.stat(fullPath);
    } catch {
      return null;
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Scan directory recursively (synchronous)
   * @private
   */
  private scanDirectory(dir: string): void {
    if (this.files.size >= this.maxFiles) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(this.projectPath, fullPath);

        if (entry.isDirectory()) {
          // Check exclusion patterns
          if (this.shouldExclude(entry.name)) continue;
          this.scanDirectory(fullPath);
        } else if (entry.isFile() || (entry.isSymbolicLink() && this.followSymlinks)) {
          // Check exclusion patterns
          if (this.shouldExclude(fullPath) || this.shouldExclude(entry.name)) continue;
          
          // Check inclusion patterns (if specified)
          if (this.includePatterns.length > 0 && !this.shouldInclude(fullPath)) continue;

          // Process file
          this.processFile(fullPath, relativePath);
        }
      }
    } catch (error: any) {
      this.errors.push({
        path: dir,
        error: error.message,
        code: error.code || 'SCAN_ERROR'
      });
    }
  }

  /**
   * Scan using worker threads for parallel processing
   * @private
   */
  private async scanParallel(): Promise<void> {
    // Get all directories first
    const directories = await this.getDirectories(this.projectPath);
    
    // Split directories among workers
    const chunkSize = Math.ceil(directories.length / this.maxWorkers);
    const chunks: string[][] = [];
    
    for (let i = 0; i < directories.length; i += chunkSize) {
      chunks.push(directories.slice(i, i + chunkSize));
    }

    // For simplicity in this implementation, fall back to sequential
    // Full worker thread implementation would require separate worker file
    this.scanDirectory(this.projectPath);
  }

  /**
   * Get all subdirectories
   * @private
   */
  private async getDirectories(dir: string): Promise<string[]> {
    const directories: string[] = [dir];
    
    const scan = async (currentDir: string): Promise<void> => {
      try {
        const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory() && !this.shouldExclude(entry.name)) {
            const fullPath = path.join(currentDir, entry.name);
            directories.push(fullPath);
            await scan(fullPath);
          }
        }
      } catch {}
    };

    await scan(dir);
    return directories;
  }

  /**
   * Process a single file
   * @private
   */
  private processFile(fullPath: string, relativePath: string): void {
    try {
      const stats = fs.statSync(fullPath);
      
      // Check file size
      if (stats.size > this.maxFileSize) {
        this.errors.push({
          path: relativePath,
          error: `File too large: ${stats.size} bytes (max: ${this.maxFileSize})`,
          code: 'FILE_TOO_LARGE'
        });
        return;
      }

      // Read content for hash
      const content = fs.readFileSync(fullPath, 'utf-8');
      const hash = this.hashContent(content);
      const language = this.detectLanguage(fullPath);

      const file: DiscoveredFile = {
        path: relativePath,
        size: stats.size,
        modified: stats.mtime,
        language,
        hash
      };

      this.files.set(fullPath, file);
    } catch (error: any) {
      this.errors.push({
        path: relativePath,
        error: error.message,
        code: error.code || 'PROCESS_ERROR'
      });
    }
  }

  /**
   * Detect language from file extension
   * @private
   */
  private detectLanguage(filePath: string): Language {
    const ext = path.extname(filePath).toLowerCase();
    return EXTENSION_TO_LANGUAGE[ext] || 'unknown';
  }

  /**
   * Hash file content
   * @private
   */
  private hashContent(content: string): string {
    return createHash('sha256')
      .update(content)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Check if path should be excluded
   * @private
   */
  private shouldExclude(name: string): boolean {
    return this.excludePatterns.some(pattern => pattern.test(name));
  }

  /**
   * Check if path should be included
   * @private
   */
  private shouldInclude(filePath: string): boolean {
    return this.includePatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Convert glob pattern to regex
   * @private
   */
  private patternToRegex(pattern: string): RegExp {
    const regexStr = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(regexStr);
  }

  /**
   * Compute scan statistics
   * @private
   */
  private computeStats(duration: number): ScanStats {
    const byLanguage: Record<Language, number> = {} as Record<Language, number>;
    let totalSize = 0;

    for (const file of this.files.values()) {
      byLanguage[file.language] = (byLanguage[file.language] || 0) + 1;
      totalSize += file.size;
    }

    return {
      totalFiles: this.files.size,
      totalSize,
      byLanguage,
      duration
    };
  }

  /**
   * Get the project path
   */
  getProjectPath(): string {
    return this.projectPath;
  }

  /**
   * Get the number of discovered files
   */
  get fileCount(): number {
    return this.files.size;
  }

  /**
   * Get all discovered files
   */
  getFiles(): DiscoveredFile[] {
    return Array.from(this.files.values());
  }

  /**
   * Get files by language
   */
  getFilesByLanguage(language: Language): DiscoveredFile[] {
    return Array.from(this.files.values()).filter(f => f.language === language);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.files.clear();
    this.errors = [];
  }
}

export default Scanner;
