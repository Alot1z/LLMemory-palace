/**
 * LLMemory-Palace - Refresh Module
 *
 * Provides incremental update capabilities for palace state.
 * Coordinates file changes with palace state updates using RefreshAnalyzer.
 *
 * @module refresh
 */

import { RefreshAnalyzer } from './refresh-analyzer.js';
import fs from 'fs';
import path from 'path';

/**
 * @typedef {Object} RefreshResult
 * @property {boolean} success - Whether the refresh operation succeeded
 * @property {string[]} updated - List of files that were updated
 * @property {string[]} skipped - List of files that were skipped
 * @property {Object[]} errors - List of errors encountered
 * @property {string} errors[].file - File where error occurred
 * @property {string} errors[].message - Error message
 * @property {string} errors[].stack - Stack trace (if available)
 */

/**
 * @typedef {Object} AnalyzeResult
 * @property {string} file - The analyzed file path
 * @property {string[]} changes - List of detected changes
 * @property {Object[]} rippleEffects - Ripple effects of changes
 * @property {string[]} impactedFiles - All impacted file paths
 */

/**
 * @typedef {Object} RefreshOptions
 * @property {boolean} [dryRun] - Simulate refresh without making changes
 * @property {boolean} [force] - Force refresh even if file unchanged
 * @property {number} [maxDepth] - Maximum depth for ripple effect traversal
 * @property {string[]} [excludePatterns] - Patterns to exclude from refresh
 * @property {Function} [onProgress] - Progress callback function
 */

/**
 * Refresh - Coordinates incremental updates for palace state
 *
 * @example
 * ```javascript
 * const palace = new Palace('/project');
 * const refresher = new Refresh(palace);
 *
 * const result = await refresher.refresh('/project/src/utils.js', {
 *   dryRun: false,
 *   onProgress: (file, status) => console.log(`${file}: ${status}`)
 * });
 *
 * console.log(result.updated); // ['src/main.js', 'src/app.js']
 * console.log(result.success); // true
 * ```
 */
export class Refresh {
    /**
     * Create a Refresh instance
     * @param {Palace} palace - Palace instance to refresh
     */
    constructor(palace) {
        this.palace = palace;
        this.analyzer = new RefreshAnalyzer({
            projectRoot: palace.projectPath,
            cacheResults: true,
        });
        
        // Initialize analyzer with palace file cache
        this._initializeAnalyzer();
    }

    /**
     * Initialize analyzer with existing palace file data
     * @private
     */
    _initializeAnalyzer() {
        if (this.palace.files && this.palace.files.size > 0) {
            // Populate analyzer cache from palace state
            for (const [filePath, fileData] of this.palace.files) {
                if (fileData && fileData.content) {
                    this.analyzer.parseFile(filePath, fileData.content);
                }
            }
        }
    }

    /**
     * Analyze a file for changes and ripple effects
     *
     * @param {string} filePath - Path to the file to analyze
     * @param {string} [content] - Optional file content (will be read if not provided)
     * @returns {AnalyzeResult} Analysis result with ripple effects
     */
    async analyze(filePath, content = null) {
        const normalizedPath = this._normalizePath(filePath);
        
        // Read content if not provided
        if (content === null) {
            try {
                content = await this._readFile(normalizedPath);
            } catch (error) {
                return {
                    file: normalizedPath,
                    changes: [],
                    rippleEffects: [],
                    impactedFiles: [],
                    error: error.message,
                };
            }
        }

        // Use analyzer to detect changes and ripple effects
        const analysis = this.analyzer.analyze(normalizedPath, content);
        
        return analysis;
    }

    /**
     * Refresh palace state based on file changes
     *
     * @param {string} filePath - Path to the changed file
     * @param {RefreshOptions} [options={}] - Refresh options
     * @returns {RefreshResult} Refresh result with updated/skipped files
     */
    async refresh(filePath, options = {}) {
        const {
            dryRun = false,
            force = false,
            maxDepth = 10,
            excludePatterns = [],
            onProgress = null,
        } = options;

        const result = {
            success: true,
            updated: [],
            skipped: [],
            errors: [],
        };

        try {
            // Normalize file path
            const normalizedPath = this._normalizePath(filePath);
            
            // Check if file should be excluded
            if (this._shouldExclude(normalizedPath, excludePatterns)) {
                result.skipped.push(normalizedPath);
                result.skipped.reason = 'excluded';
                return result;
            }

            // Read file content
            let content;
            try {
                content = await this._readFile(normalizedPath);
            } catch (error) {
                result.success = false;
                result.errors.push({
                    file: normalizedPath,
                    message: `Failed to read file: ${error.message}`,
                    stack: error.stack,
                });
                return result;
            }

            // Analyze the file
            const analysis = await this.analyze(normalizedPath, content);
            
            // Check if file has changed (unless forced)
            if (!force && !this._hasFileChanged(normalizedPath, content)) {
                result.skipped.push(normalizedPath);
                result.skipped.reason = 'unchanged';
                return result;
            }

            // Report progress
            if (onProgress) {
                onProgress(normalizedPath, 'analyzing');
            }

            // Get all files to update (source + impacted)
            const filesToUpdate = [normalizedPath, ...analysis.impactedFiles];
            
            // Update each file
            for (const fileToUpdate of filesToUpdate) {
                if (dryRun) {
                    // In dry-run mode, just track what would be updated
                    result.updated.push(fileToUpdate);
                    if (onProgress) {
                        onProgress(fileToUpdate, 'would-update');
                    }
                    continue;
                }

                try {
                    await this._updateFile(fileToUpdate, content);
                    result.updated.push(fileToUpdate);
                    
                    if (onProgress) {
                        onProgress(fileToUpdate, 'updated');
                    }
                } catch (error) {
                    result.success = false;
                    result.errors.push({
                        file: fileToUpdate,
                        message: error.message,
                        stack: error.stack,
                    });
                    
                    if (onProgress) {
                        onProgress(fileToUpdate, 'error');
                    }
                }
            }

            // Update palace state if not dry-run
            if (!dryRun && result.success) {
                await this._updatePalaceState(normalizedPath, analysis);
            }

        } catch (error) {
            result.success = false;
            result.errors.push({
                file: filePath,
                message: `Refresh failed: ${error.message}`,
                stack: error.stack,
            });
        }

        return result;
    }

    /**
     * Refresh multiple files
     *
     * @param {string[]} filePaths - Array of file paths to refresh
     * @param {RefreshOptions} [options={}] - Refresh options
     * @returns {RefreshResult} Combined refresh result
     */
    async refreshMultiple(filePaths, options = {}) {
        const combinedResult = {
            success: true,
            updated: [],
            skipped: [],
            errors: [],
        };

        for (const filePath of filePaths) {
            const result = await this.refresh(filePath, options);
            
            // Merge results
            combinedResult.updated.push(...result.updated);
            combinedResult.skipped.push(...result.skipped);
            combinedResult.errors.push(...result.errors);
            
            if (!result.success) {
                combinedResult.success = false;
            }
        }

        // Deduplicate
        combinedResult.updated = [...new Set(combinedResult.updated)];
        combinedResult.skipped = [...new Set(combinedResult.skipped)];

        return combinedResult;
    }

    /**
     * Check if a file should be excluded from refresh
     * @private
     */
    _shouldExclude(filePath, excludePatterns) {
        for (const pattern of excludePatterns) {
            if (typeof pattern === 'string') {
                if (filePath.includes(pattern)) {
                    return true;
                }
            } else if (pattern instanceof RegExp) {
                if (pattern.test(filePath)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Check if file content has changed
     * @private
     */
    _hasFileChanged(filePath, newContent) {
        const existingFile = this.palace.files?.get(filePath);
        
        if (!existingFile) {
            return true; // New file
        }

        const existingContent = existingFile.content || existingFile.raw;
        
        if (!existingContent) {
            return true;
        }

        // Simple content comparison
        return existingContent !== newContent;
    }

    /**
     * Update a file in palace state
     * @private
     */
    async _updateFile(filePath, content) {
        if (!this.palace.files) {
            this.palace.files = new Map();
        }

        // Update file in palace
        const fileData = {
            path: filePath,
            content: content,
            lastModified: new Date().toISOString(),
            size: content.length,
        };

        this.palace.files.set(filePath, fileData);

        // Update analyzer cache
        this.analyzer.parseFile(filePath, content);

        return fileData;
    }

    /**
     * Update palace state after refresh
     * @private
     */
    async _updatePalaceState(filePath, analysis) {
        // Update palace patterns if needed
        if (this.palace.patterns && analysis.changes.length > 0) {
            // Invalidate affected patterns
            for (const [patternId, pattern] of this.palace.patterns) {
                if (pattern.files && pattern.files.includes(filePath)) {
                    pattern.needsUpdate = true;
                }
            }
        }

        // Update palace flows if needed
        if (this.palace.flows && analysis.rippleEffects.length > 0) {
            // Mark affected flows for re-analysis
            for (const [flowId, flow] of this.palace.flows) {
                if (flow.files && flow.files.some(f => analysis.impactedFiles.includes(f))) {
                    flow.needsUpdate = true;
                }
            }
        }

        // Save palace state
        await this._savePalaceState();
    }

    /**
     * Save palace state to disk
     * @private
     */
    async _savePalaceState() {
        if (!this.palace.projectPath) {
            return;
        }

        const statePath = path.join(
            this.palace.projectPath,
            '.palace',
            'state',
            'current.json'
        );

        try {
            const state = {
                version: this.palace.version || '25.0.0',
                updated: new Date().toISOString(),
                projectPath: this.palace.projectPath,
                files: Array.from(this.palace.files.entries()),
                patterns: Array.from(this.palace.patterns?.entries() || []),
                flows: Array.from(this.palace.flows?.entries() || []),
                entities: Array.from(this.palace.entities?.entries() || []),
                config: this.palace.config || {},
            };

            // Ensure directory exists
            const stateDir = path.dirname(statePath);
            if (!fs.existsSync(stateDir)) {
                fs.mkdirSync(stateDir, { recursive: true });
            }

            fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
        } catch (error) {
            // Log error but don't fail
            console.error(`Failed to save palace state: ${error.message}`);
        }
    }

    /**
     * Read file content
     * @private
     */
    async _readFile(filePath) {
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, 'utf-8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    /**
     * Normalize a file path
     * @private
     */
    _normalizePath(filePath) {
        if (path.isAbsolute(filePath)) {
            return path.normalize(filePath);
        }
        
        // Make relative to project root
        return path.normalize(path.join(this.palace.projectPath, filePath));
    }

    /**
     * Get refresh statistics
     * @returns {Object} Statistics about the refresh state
     */
    getStats() {
        return {
            filesCached: this.analyzer.fileGraph.size,
            reverseDependencies: this.analyzer.reverseDependencies.size,
            palaceFiles: this.palace.files?.size || 0,
            palacePatterns: this.palace.patterns?.size || 0,
            palaceFlows: this.palace.flows?.size || 0,
        };
    }

    /**
     * Clear refresh cache
     */
    clearCache() {
        this.analyzer.clear();
    }
}

// Alias for backwards compatibility
export { Refresh as Refresher };

export default Refresh;
