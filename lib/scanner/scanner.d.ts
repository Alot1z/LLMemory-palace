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
import type { Language, DiscoveredFile, FileContent, ScanOptions, ScanResult } from '../types.js';
/**
 * Scanner options with defaults
 */
export interface ScannerConfig extends Partial<ScanOptions> {
    projectPath: string;
    parallel?: boolean;
    maxWorkers?: number;
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
export declare class Scanner {
    private projectPath;
    private includePatterns;
    private excludePatterns;
    private maxFileSize;
    private maxFiles;
    private followSymlinks;
    private encoding;
    private parallel;
    private maxWorkers;
    private files;
    private errors;
    constructor(config: ScannerConfig);
    /**
     * Scan the project directory
     *
     * @returns Scan result with discovered files
     */
    scan(): Promise<ScanResult>;
    /**
     * Scan a specific subdirectory
     *
     * @param subDir - Subdirectory path relative to project root
     * @returns Scan result
     */
    scanSubdirectory(subDir: string): Promise<ScanResult>;
    /**
     * Read file content
     *
     * @param filePath - File path (relative or absolute)
     * @returns File content with metadata
     */
    readFile(filePath: string): Promise<FileContent | null>;
    /**
     * Read multiple files in parallel
     *
     * @param filePaths - Array of file paths
     * @returns Array of file contents
     */
    readFiles(filePaths: string[]): Promise<(FileContent | null)[]>;
    /**
     * Scan for changes since a given date
     *
     * @param since - Date to check changes since
     * @returns Array of changed files
     */
    scanChanges(since: Date): Promise<DiscoveredFile[]>;
    /**
     * Get file statistics
     *
     * @param filePath - File path
     * @returns File stats or null
     */
    getStats(filePath: string): Promise<fs.Stats | null>;
    /**
     * Scan directory recursively (synchronous)
     * @private
     */
    private scanDirectory;
    /**
     * Scan using worker threads for parallel processing
     * @private
     */
    private scanParallel;
    /**
     * Get all subdirectories
     * @private
     */
    private getDirectories;
    /**
     * Process a single file
     * @private
     */
    private processFile;
    /**
     * Detect language from file extension
     * @private
     */
    private detectLanguage;
    /**
     * Hash file content
     * @private
     */
    private hashContent;
    /**
     * Check if path should be excluded
     * @private
     */
    private shouldExclude;
    /**
     * Check if path should be included
     * @private
     */
    private shouldInclude;
    /**
     * Convert glob pattern to regex
     * @private
     */
    private patternToRegex;
    /**
     * Compute scan statistics
     * @private
     */
    private computeStats;
    /**
     * Get the project path
     */
    getProjectPath(): string;
    /**
     * Get the number of discovered files
     */
    get fileCount(): number;
    /**
     * Get all discovered files
     */
    getFiles(): DiscoveredFile[];
    /**
     * Get files by language
     */
    getFilesByLanguage(language: Language): DiscoveredFile[];
    /**
     * Clear all cached data
     */
    clear(): void;
}
export default Scanner;
//# sourceMappingURL=scanner.d.ts.map