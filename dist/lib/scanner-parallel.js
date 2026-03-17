/**
 * LLMemory-Palace - Parallel Scanner Module
 *
 * Provides parallel file scanning using worker_threads for improved performance.
 *
 * @module scanner-parallel
 * @version 3.0.0
 */

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { availableParallelism } from 'os';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Extension to language mapping
 */
const EXTENSION_TO_LANGUAGE = {
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
 * Worker message types
 */
const WorkerMessageType = {
    SCAN_FILES: 'SCAN_FILES',
    SCAN_RESULT: 'SCAN_RESULT',
    SCAN_ERROR: 'SCAN_ERROR',
    WORKER_READY: 'WORKER_READY'
};

/**
 * Check if worker_threads are available
 * @returns {boolean}
 */
function areWorkersAvailable() {
    try {
        // Check if running in an environment that supports worker_threads
        return typeof Worker === 'function' && isMainThread !== undefined;
    } catch {
        return false;
    }
}

/**
 * Get default worker count based on CPU cores
 * @param {number} minWorkers - Minimum workers to use
 * @returns {number}
 */
function getDefaultWorkerCount(minWorkers = 1) {
    try {
        const cores = availableParallelism();
        return Math.max(minWorkers, cores - 1);
    } catch {
        return minWorkers;
    }
}

/**
 * Detect language from file extension
 * @param {string} filePath - File path
 * @returns {string}
 */
function detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return EXTENSION_TO_LANGUAGE[ext] || 'unknown';
}

/**
 * Hash file content
 * @param {string} content - File content
 * @returns {string}
 */
function hashContent(content) {
    return createHash('sha256')
        .update(content)
        .digest('hex')
        .substring(0, 16);
}

/**
 * Process a single file (used in worker and fallback)
 * @param {string} filePath - Full file path
 * @param {string} basePath - Base project path for relative paths
 * @param {number} maxFileSize - Maximum file size in bytes
 * @returns {Object|null} File info or null on error
 */
function processFile(filePath, basePath, maxFileSize = 1024 * 1024) {
    try {
        const stats = fs.statSync(filePath);
        
        if (stats.size > maxFileSize) {
            return {
                path: path.relative(basePath, filePath),
                error: `File too large: ${stats.size} bytes (max: ${maxFileSize})`,
                code: 'FILE_TOO_LARGE'
            };
        }
        
        const content = fs.readFileSync(filePath, 'utf-8');
        const relativePath = path.relative(basePath, filePath);
        
        return {
            path: relativePath,
            size: stats.size,
            modified: stats.mtime,
            language: detectLanguage(filePath),
            hash: hashContent(content),
            scanned: true
        };
    } catch (error) {
        return {
            path: path.relative(basePath, filePath),
            error: error.message,
            code: error.code || 'PROCESS_ERROR'
        };
    }
}

/**
 * Worker thread code - runs when not in main thread
 */
if (!isMainThread && parentPort) {
    // Worker thread implementation
    const { basePath, maxFileSize } = workerData;
    
    // Signal ready first
    parentPort.postMessage({
        type: WorkerMessageType.WORKER_READY,
        workerId: workerData.workerId
    });
    
    // Wait for file scan requests
    parentPort.on('message', (message) => {
        if (message.type === WorkerMessageType.SCAN_FILES) {
            const results = message.files.map(file => 
                processFile(file, basePath, maxFileSize)
            );
            parentPort.postMessage({
                type: WorkerMessageType.SCAN_RESULT,
                workerId: workerData.workerId,
                results
            });
        }
    });
}

/**
 * ScannerParallel - Parallel file scanning using worker_threads
 *
 * @example
 * ```javascript
 * const scanner = new ScannerParallel({
 *   workerCount: 4,
 *   maxFileSize: 1024 * 1024
 * });
 *
 * const results = await scanner.scanFiles(['/path/to/file1.js', '/path/to/file2.ts']);
 * console.log(`Scanned ${results.length} files`);
 * ```
 */
export class ScannerParallel {
    /**
     * @param {Object} options - Scanner options
     * @param {number} [options.workerCount] - Number of workers (default: CPU cores - 1)
     * @param {number} [options.maxFileSize] - Max file size in bytes (default: 1MB)
     * @param {boolean} [options.useWorkers] - Force enable/disable workers
     * @param {number} [options.timeout] - Scan timeout in ms (default: 30000)
     */
    constructor(options = {}) {
        this.options = options;
        this.maxFileSize = options.maxFileSize || 1024 * 1024; // 1MB default
        this.workerCount = options.workerCount || getDefaultWorkerCount();
        this.useWorkers = options.useWorkers ?? areWorkersAvailable();
        this.timeout = options.timeout || 30000; // 30 seconds default
        this.workers = [];
        this.pendingResults = [];
        this.activeWorkers = 0;
        this.workerPath = join(__dirname, 'scanner-parallel-worker.js');
    }

    /**
     * Initialize workers for parallel processing
     * @private
     * @param {string} basePath - Base project path
     * @returns {Promise<void>}
     */
    async _initWorkers(basePath) {
        if (!this.useWorkers) {
            return;
        }

        const workersToCreate = Math.min(this.workerCount, availableParallelism());
        
        return new Promise((resolve, reject) => {
            let readyCount = 0;
            const timeout = setTimeout(() => {
                if (readyCount < workersToCreate) {
                    // Workers didn't initialize in time, fall back
                    this._terminateWorkers();
                    this.useWorkers = false;
                    resolve();
                }
            }, 5000);

            for (let i = 0; i < workersToCreate; i++) {
                try {
                    const worker = new Worker(__filename, {
                        workerData: {
                            workerId: i,
                            basePath,
                            maxFileSize: this.maxFileSize,
                            files: [] // No initial files
                        }
                    });

                    // Only handle WORKER_READY during initialization
                    const readyHandler = (message) => {
                        if (message.type === WorkerMessageType.WORKER_READY) {
                            readyCount++;
                            if (readyCount === workersToCreate) {
                                clearTimeout(timeout);
                                resolve();
                            }
                        }
                    };
                    worker.on('message', readyHandler);

                    worker.on('error', (error) => {
                        console.error(`Worker ${i} error:`, error);
                        this._terminateWorkers();
                        this.useWorkers = false;
                        clearTimeout(timeout);
                        resolve(); // Resolve anyway to allow fallback
                    });

                    worker.on('exit', (code) => {
                        if (code !== 0) {
                            console.error(`Worker ${i} exited with code ${code}`);
                        }
                        this.activeWorkers = Math.max(0, this.activeWorkers - 1);
                    });

                    this.workers.push(worker);
                    this.activeWorkers++;
                } catch (error) {
                    console.error(`Failed to create worker ${i}:`, error);
                    this._terminateWorkers();
                    this.useWorkers = false;
                    clearTimeout(timeout);
                    resolve();
                    return;
                }
            }
        });
    }

    /**
     * Terminate all workers
     * @private
     */
    _terminateWorkers() {
        for (const worker of this.workers) {
            try {
                worker.terminate();
            } catch (error) {
                // Ignore termination errors
            }
        }
        this.workers = [];
        this.activeWorkers = 0;
    }

    /**
     * Scan files in parallel using workers
     *
     * @param {string[]} files - Array of file paths to scan
     * @param {string} [basePath] - Base path for relative paths (defaults to cwd)
     * @returns {Promise<Array>} Array of scan results
     */
    async scanFiles(files, basePath = process.cwd()) {
        if (!files || files.length === 0) {
            return [];
        }

        // Fallback to sequential processing if workers unavailable
        if (!this.useWorkers) {
            return this._scanFilesSequential(files, basePath);
        }

        // Try to use workers
        try {
            await this._initWorkers(basePath);
            
            if (!this.useWorkers || this.workers.length === 0) {
                return this._scanFilesSequential(files, basePath);
            }

            return await this._scanFilesParallel(files, basePath);
        } catch (error) {
            console.error('Parallel scan failed, falling back to sequential:', error);
            this._terminateWorkers();
            return this._scanFilesSequential(files, basePath);
        }
    }

    /**
     * Scan files sequentially (fallback)
     * @private
     * @param {string[]} files - Files to scan
     * @param {string} basePath - Base path
     * @returns {Promise<Array>}
     */
    async _scanFilesSequential(files, basePath) {
        const results = [];
        for (const file of files) {
            const result = processFile(file, basePath, this.maxFileSize);
            if (result) {
                results.push(result);
            }
        }
        return results;
    }

    /**
     * Scan files using worker threads
     * @private
     * @param {string[]} files - Files to scan
     * @param {string} basePath - Base path
     * @returns {Promise<Array>}
     */
    async _scanFilesParallel(files, basePath) {
        return new Promise((resolve, reject) => {
            const allResults = [];
            let completedWorkers = 0;
            const totalWorkers = this.workers.length;
            const timeout = setTimeout(() => {
                this._terminateWorkers();
                reject(new Error('Parallel scan timeout'));
            }, this.timeout);

            // Split files among workers
            const chunkSize = Math.ceil(files.length / totalWorkers);
            
            for (let i = 0; i < totalWorkers; i++) {
                const start = i * chunkSize;
                const end = Math.min(start + chunkSize, files.length);
                const workerFiles = files.slice(start, end);

                if (workerFiles.length === 0) {
                    completedWorkers++;
                    if (completedWorkers === totalWorkers) {
                        clearTimeout(timeout);
                        this._terminateWorkers();
                        resolve(allResults);
                    }
                    continue;
                }

                const worker = this.workers[i];
                
                const messageHandler = (message) => {
                    if (message.type === WorkerMessageType.SCAN_RESULT) {
                        worker.off('message', messageHandler);
                        completedWorkers++;
                        
                        if (message.results) {
                            allResults.push(...message.results);
                        }

                        if (completedWorkers === totalWorkers) {
                            clearTimeout(timeout);
                            this._terminateWorkers();
                            resolve(allResults);
                        }
                    }
                };

                worker.on('message', messageHandler);
                worker.postMessage({
                    type: WorkerMessageType.SCAN_FILES,
                    files: workerFiles
                });
            }
        });
    }

    /**
     * Scan a directory recursively and return all files
     *
     * @param {string} directory - Directory to scan
     * @param {Object} [options] - Scan options
     * @param {string[]} [options.exclude] - Patterns to exclude
     * @returns {Promise<Array>}
     */
    async scan(directory, options = {}) {
        const basePath = path.resolve(directory);
        const excludePatterns = options.exclude || [
            'node_modules', '.git', '.palace', '.llmp', 'dist', 'build'
        ];
        
        const files = await this._collectFiles(basePath, excludePatterns);
        return this.scanFiles(files, basePath);
    }

    /**
     * Collect files from directory recursively
     * @private
     * @param {string} dir - Directory
     * @param {string[]} excludePatterns - Patterns to exclude
     * @returns {Promise<string[]>}
     */
    async _collectFiles(dir, excludePatterns) {
        const files = [];
        
        const scan = async (currentDir) => {
            try {
                const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(currentDir, entry.name);
                    
                    // Check exclusion
                    if (excludePatterns.some(pattern => entry.name.includes(pattern) || entry.name === pattern)) {
                        continue;
                    }
                    
                    if (entry.isDirectory()) {
                        await scan(fullPath);
                    } else if (entry.isFile()) {
                        files.push(fullPath);
                    }
                }
            } catch (error) {
                // Ignore permission errors, etc.
            }
        };
        
        await scan(dir);
        return files;
    }

    /**
     * Get worker status
     * @returns {Object}
     */
    getStatus() {
        return {
            workerCount: this.workerCount,
            useWorkers: this.useWorkers,
            activeWorkers: this.activeWorkers,
            workersAvailable: areWorkersAvailable()
        };
    }

    /**
     * Cleanup resources
     */
    async destroy() {
        this._terminateWorkers();
    }
}

export default ScannerParallel;
