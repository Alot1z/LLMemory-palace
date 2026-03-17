/**
 * File Writer - File structure recreation
 * Phase 4: Reconstruction Layer
 */
import type { CodeIndex } from '../types.js';
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
export declare class FileWriter {
    private config;
    private written;
    private pending;
    constructor(config?: Partial<WriterConfig>);
    queue(path: string, content: string): void;
    writeAll(): Promise<WriteResult[]>;
    writeFile(path: string, content: string): Promise<WriteResult>;
    writeFromIndex(index: CodeIndex): Promise<WriteResult[]>;
    private generateFileContent;
    analyzeStructure(index: CodeIndex): DirectoryStructure;
    private normalizePath;
    private resolvePath;
    private normalizeLineEndings;
    getStats(): {
        total: number;
        success: number;
        failed: number;
        bytes: number;
    };
    clear(): void;
}
export declare function createFileWriter(config?: Partial<WriterConfig>): FileWriter;
//# sourceMappingURL=file-writer.d.ts.map