/**
 * LLMemory-Palace - Refresh Analyzer Module
 *
 * Analyzes file changes and their ripple effects via import graph.
 * Parses ES imports (import, require, export from) and computes
 * which files are impacted by changes.
 *
 * @module refresh-analyzer
 */

/**
 * @typedef {Object} ImportInfo
 * @property {string} source - Import source path
 * @property {string[]} specifiers - Imported names
 * @property {boolean} isDefault - Is default import
 * @property {boolean} isNamespace - Is namespace import (import *)
 * @property {number} line - Line number
 */

/**
 * @typedef {Object} ExportInfo
 * @property {string} name - Export name
 * @property {string} type - Export type (function, class, variable, etc.)
 * @property {boolean} isDefault - Is default export
 * @property {number} line - Line number
 */

/**
 * @typedef {Object} FileNode
 * @property {string} path - File path
 * @property {ImportInfo[]} imports - Import declarations
 * @property {ExportInfo[]} exports - Export declarations
 * @property {string[]} dependencies - Resolved dependency paths
 * @property {string[]} dependents - Files that depend on this file
 */

/**
 * @typedef {Object} RippleEffect
 * @property {string} file - Affected file path
 * @property {number} depth - Distance from changed file
 * @property {string[]} via - Path of files that propagate the change
 * @property {string} reason - Why this file is affected
 */

/**
 * @typedef {Object} AnalysisResult
 * @property {string} file - The analyzed file path
 * @property {string[]} changes - List of detected changes
 * @property {RippleEffect[]} rippleEffects - Ripple effects of changes
 * @property {string[]} impactedFiles - All impacted file paths
 */

/**
 * Regular expressions for parsing imports and exports
 */
const IMPORT_PATTERNS = {
    // ES6 imports: import x from 'y', import { x } from 'y', import * as x from 'y'
    esImport: /import\s+(?:(\w+)|\{([^}]+)\}|\*\s+as\s+(\w+))\s+from\s+['"]([^'"]+)['"]/g,
    // Side-effect import: import 'module'
    sideEffectImport: /import\s+['"]([^'"]+)['"]/g,
    // Dynamic import: import('module')
    dynamicImport: /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    // CommonJS require: require('module')
    require: /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    // Export from: export { x } from 'y', export * from 'y'
    exportFrom: /export\s+(?:\*|\{[^}]+\})\s+from\s+['"]([^'"]+)['"]/g,
};

const EXPORT_PATTERNS = {
    // Named exports: export const x = ..., export function x() {}, export class X {}
    namedExport: /export\s+(?:const|let|var|function|class|async\s+function)\s+(\w+)/g,
    // Default export: export default x
    defaultExport: /export\s+default\s+(\w+)?/g,
    // Export list: export { x, y, z }
    exportList: /export\s+\{([^}]+)\}/g,
    // Re-export: export { x } from 'y'
    reExport: /export\s+\{[^}]+\}\s+from\s+['"]/g,
};

/**
 * RefreshAnalyzer - Analyzes file changes and computes ripple effects
 *
 * @example
 * ```javascript
 * const analyzer = new RefreshAnalyzer({
 *     projectRoot: '/project',
 *     fileCache: new Map()
 * });
 *
 * const result = analyzer.analyze('/project/src/utils.js');
 * console.log(result.impactedFiles); // ['src/main.js', 'src/app.js']
 * console.log(result.rippleEffects); // [{ file: 'src/main.js', depth: 1, ... }]
 * ```
 */
export class RefreshAnalyzer {
    /**
     * @type {Map<string, FileNode>}
     */
    fileGraph = new Map();

    /**
     * @type {Map<string, Set<string>>}
     */
    reverseDependencies = new Map();

    options;

    /**
     * Default analyzer options
     */
    static DEFAULT_OPTIONS = {
        projectRoot: process.cwd(),
        extensions: ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx'],
        includeExternal: false,
        maxDepth: 10,
        cacheResults: true,
    };

    /**
     * Create a RefreshAnalyzer instance
     * @param {Object} options - Configuration options
     * @param {string} [options.projectRoot] - Project root directory
     * @param {string[]} [options.extensions] - File extensions to analyze
     * @param {boolean} [options.includeExternal] - Include node_modules dependencies
     * @param {number} [options.maxDepth] - Maximum depth for ripple effect traversal
     * @param {Map<string, FileNode>} [options.fileCache] - Pre-populated file cache
     */
    constructor(options = {}) {
        this.options = { ...RefreshAnalyzer.DEFAULT_OPTIONS, ...options };
        
        // Initialize from cache if provided
        if (options.fileCache instanceof Map) {
            this.fileGraph = new Map(options.fileCache);
            this.buildReverseDependencies();
        }
    }

    /**
     * Analyze a file and compute ripple effects
     *
     * @param {string} filePath - Path to the file to analyze
     * @param {string} [content] - Optional file content (will be read if not provided)
     * @returns {AnalysisResult} Analysis result with ripple effects
     */
    analyze(filePath, content = null) {
        const normalizedPath = this.normalizePath(filePath);
        
        // Parse the file if not in cache or content provided
        if (content !== null || !this.fileGraph.has(normalizedPath)) {
            this.parseFile(normalizedPath, content);
        }

        const fileNode = this.fileGraph.get(normalizedPath);
        
        if (!fileNode) {
            return {
                file: normalizedPath,
                changes: [],
                rippleEffects: [],
                impactedFiles: [],
            };
        }

        // Find all impacted files via reverse dependency traversal
        const rippleEffects = this.computeRippleEffects(normalizedPath);
        const impactedFiles = rippleEffects.map(r => r.file);

        return {
            file: normalizedPath,
            changes: this.detectChanges(fileNode),
            rippleEffects,
            impactedFiles,
        };
    }

    /**
     * Find all files that import the given file
     *
     * @param {string} filePath - Path to the file
     * @returns {string[]} Array of file paths that import this file
     */
    findRelated(filePath) {
        const normalizedPath = this.normalizePath(filePath);
        const dependents = this.reverseDependencies.get(normalizedPath);
        
        if (!dependents) {
            return [];
        }
        
        return Array.from(dependents);
    }

    /**
     * Parse a file and extract imports/exports
     *
     * @param {string} filePath - File path to parse
     * @param {string|null} content - File content (null to skip reading)
     * @returns {FileNode|null} Parsed file node
     */
    parseFile(filePath, content = null) {
        const normalizedPath = this.normalizePath(filePath);
        
        // If content is provided, use it; otherwise return cached or null
        if (content === null) {
            return this.fileGraph.get(normalizedPath) || null;
        }

        const imports = this.extractImports(content);
        const exports = this.extractExports(content);
        const dependencies = this.resolveDependencies(imports, normalizedPath);

        const fileNode = {
            path: normalizedPath,
            imports,
            exports,
            dependencies,
            dependents: [],
        };

        // Update cache
        this.fileGraph.set(normalizedPath, fileNode);
        
        // Update reverse dependencies
        for (const dep of dependencies) {
            this.addReverseDependency(dep, normalizedPath);
        }

        return fileNode;
    }

    /**
     * Add a file to the graph with pre-parsed data
     *
     * @param {string} filePath - File path
     * @param {Object} data - Pre-parsed file data
     */
    addFile(filePath, data) {
        const normalizedPath = this.normalizePath(filePath);
        
        const fileNode = {
            path: normalizedPath,
            imports: data.imports || [],
            exports: data.exports || [],
            dependencies: data.dependencies || [],
            dependents: [],
        };

        this.fileGraph.set(normalizedPath, fileNode);
        
        // Update reverse dependencies
        for (const dep of fileNode.dependencies) {
            this.addReverseDependency(dep, normalizedPath);
        }
    }

    /**
     * Extract import declarations from code
     *
     * @param {string} content - Source code content
     * @returns {ImportInfo[]} Array of import info objects
     */
    extractImports(content) {
        const imports = [];
        const seen = new Set();
        let match;

        // ES6 default import: import React from 'react'
        const defaultImportRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
        while ((match = defaultImportRegex.exec(content)) !== null) {
            const source = match[2];
            const specifier = match[1];
            const key = `es-default:${source}:${specifier}`;
            
            if (!seen.has(key)) {
                seen.add(key);
                imports.push({
                    source,
                    specifiers: [specifier],
                    isDefault: true,
                    isNamespace: false,
                    line: this.getLineNumber(content, match.index),
                });
            }
        }

        // ES6 named imports: import { x, y } from 'module'
        const namedImportRegex = /import\s+\{([^}]*)\}\s+from\s+['"]([^'"]+)['"]/g;
        while ((match = namedImportRegex.exec(content)) !== null) {
            const source = match[2];
            const namedSpecifiers = match[1].split(',')
                .map(s => s.trim().split(/\s+as\s+/)[0].trim())
                .filter(Boolean);
            
            for (const spec of namedSpecifiers) {
                const key = `es-named:${source}:${spec}`;
                if (!seen.has(key)) {
                    seen.add(key);
                }
            }
            
            const key = `es-named-group:${source}`;
            if (!seen.has(key)) {
                seen.add(key);
                imports.push({
                    source,
                    specifiers: namedSpecifiers,
                    isDefault: false,
                    isNamespace: false,
                    line: this.getLineNumber(content, match.index),
                });
            }
        }

        // ES6 mixed import: import React, { useState } from 'react'
        const mixedImportRegex = /import\s+(\w+)\s*,\s*\{([^}]*)\}\s+from\s+['"]([^'"]+)['"]/g;
        while ((match = mixedImportRegex.exec(content)) !== null) {
            const source = match[3];
            const defaultSpecifier = match[1];
            const namedSpecifiers = match[2].split(',')
                .map(s => s.trim().split(/\s+as\s+/)[0].trim())
                .filter(Boolean);
            
            const key = `es-mixed:${source}`;
            if (!seen.has(key)) {
                seen.add(key);
                imports.push({
                    source,
                    specifiers: [defaultSpecifier, ...namedSpecifiers],
                    isDefault: true,
                    isNamespace: false,
                    line: this.getLineNumber(content, match.index),
                });
            }
        }

        // ES6 namespace import: import * as utils from './utils'
        const namespaceImportRegex = /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
        while ((match = namespaceImportRegex.exec(content)) !== null) {
            const source = match[2];
            const specifier = match[1];
            const key = `es-namespace:${source}`;
            
            if (!seen.has(key)) {
                seen.add(key);
                imports.push({
                    source,
                    specifiers: [specifier],
                    isDefault: false,
                    isNamespace: true,
                    line: this.getLineNumber(content, match.index),
                });
            }
        }

        // Side-effect import: import 'module'
        const sideEffectRegex = /import\s+['"]([^'"]+)['"]/g;
        while ((match = sideEffectRegex.exec(content)) !== null) {
            const source = match[1];
            const key = `side:${source}`;
            
            if (!seen.has(key)) {
                seen.add(key);
                imports.push({
                    source,
                    specifiers: [],
                    isDefault: false,
                    isNamespace: false,
                    line: this.getLineNumber(content, match.index),
                });
            }
        }

        // Dynamic import: import('module')
        const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        while ((match = dynamicImportRegex.exec(content)) !== null) {
            const source = match[1];
            const key = `dyn:${source}`;
            
            if (!seen.has(key)) {
                seen.add(key);
                imports.push({
                    source,
                    specifiers: [],
                    isDefault: false,
                    isNamespace: false,
                    line: this.getLineNumber(content, match.index),
                });
            }
        }

        // CommonJS require: const x = require('module')
        const requireRegex = /(?:const|let|var)\s+(\w+)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        while ((match = requireRegex.exec(content)) !== null) {
            const source = match[2];
            const specifier = match[1];
            const key = `req-default:${source}`;
            
            if (!seen.has(key)) {
                seen.add(key);
                imports.push({
                    source,
                    specifiers: [specifier],
                    isDefault: true,
                    isNamespace: false,
                    line: this.getLineNumber(content, match.index),
                });
            }
        }

        // CommonJS destructured require: const { a, b } = require('module')
        const destructuredRequireRegex = /(?:const|let|var)\s+\{([^}]*)\}\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        while ((match = destructuredRequireRegex.exec(content)) !== null) {
            const source = match[2];
            const namedSpecifiers = match[1].split(',')
                .map(s => s.trim().split(':')[0].trim())
                .filter(Boolean);
            
            const key = `req-destructured:${source}`;
            if (!seen.has(key)) {
                seen.add(key);
                imports.push({
                    source,
                    specifiers: namedSpecifiers,
                    isDefault: false,
                    isNamespace: false,
                    line: this.getLineNumber(content, match.index),
                });
            }
        }

        // Export from: export { x } from 'y'
        const exportFromRegex = /export\s+\{[^}]*\}\s+from\s+['"]([^'"]+)['"]/g;
        while ((match = exportFromRegex.exec(content)) !== null) {
            const source = match[1];
            const key = `exp-from:${source}`;
            
            if (!seen.has(key)) {
                seen.add(key);
                imports.push({
                    source,
                    specifiers: [],
                    isDefault: false,
                    isNamespace: false,
                    line: this.getLineNumber(content, match.index),
                });
            }
        }

        // Export * from: export * from 'y'
        const exportAllFromRegex = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g;
        while ((match = exportAllFromRegex.exec(content)) !== null) {
            const source = match[1];
            const key = `exp-all:${source}`;
            
            if (!seen.has(key)) {
                seen.add(key);
                imports.push({
                    source,
                    specifiers: [],
                    isDefault: false,
                    isNamespace: true,
                    line: this.getLineNumber(content, match.index),
                });
            }
        }

        return imports;
    }

    /**
     * Extract export declarations from code
     *
     * @param {string} content - Source code content
     * @returns {ExportInfo[]} Array of export info objects
     */
    extractExports(content) {
        const exports = [];
        const seen = new Set();

        // Named exports: export const/function/class x
        let match;
        const namedExportRegex = /export\s+(?:async\s+)?(?:const|let|var|function|class)\s+(\w+)/g;
        while ((match = namedExportRegex.exec(content)) !== null) {
            const name = match[1];
            if (!seen.has(name)) {
                seen.add(name);
                const type = this.detectExportType(match[0]);
                exports.push({
                    name,
                    type,
                    isDefault: false,
                    line: this.getLineNumber(content, match.index),
                });
            }
        }

        // Export list: export { x, y }
        const exportListRegex = /export\s+\{([^}]+)\}/g;
        while ((match = exportListRegex.exec(content)) !== null) {
            const names = match[1].split(',')
                .map(s => s.trim().split(/\s+as\s+/)[0].trim())
                .filter(Boolean);
            
            for (const name of names) {
                if (!seen.has(name)) {
                    seen.add(name);
                    exports.push({
                        name,
                        type: 'variable',
                        isDefault: false,
                        line: this.getLineNumber(content, match.index),
                    });
                }
            }
        }

        // Default export: export default x
        const defaultExportRegex = /export\s+default\s+(\w+)?/g;
        while ((match = defaultExportRegex.exec(content)) !== null) {
            const name = match[1] || 'default';
            if (!seen.has(`default:${name}`)) {
                seen.add(`default:${name}`);
                exports.push({
                    name,
                    type: this.detectExportType(match[0]),
                    isDefault: true,
                    line: this.getLineNumber(content, match.index),
                });
            }
        }

        return exports;
    }

    /**
     * Detect the type of export from the export statement
     *
     * @param {string} statement - Export statement
     * @returns {string} Export type
     */
    detectExportType(statement) {
        if (/class\b/.test(statement)) return 'class';
        if (/function\b/.test(statement)) return 'function';
        if (/async\s+function\b/.test(statement)) return 'async_function';
        if (/const\b/.test(statement)) return 'const';
        if (/let\b/.test(statement)) return 'let';
        if (/var\b/.test(statement)) return 'var';
        return 'unknown';
    }

    /**
     * Resolve import sources to file paths
     *
     * @param {ImportInfo[]} imports - Import declarations
     * @param {string} fromPath - Path of the file containing imports
     * @returns {string[]} Resolved dependency paths
     */
    resolveDependencies(imports, fromPath) {
        const dependencies = [];
        const seen = new Set();

        for (const imp of imports) {
            const resolved = this.resolveImportPath(imp.source, fromPath);
            
            if (resolved && !seen.has(resolved)) {
                seen.add(resolved);
                
                // Skip external dependencies unless includeExternal is true
                if (!this.options.includeExternal && this.isExternalDependency(imp.source)) {
                    continue;
                }
                
                dependencies.push(resolved);
            }
        }

        return dependencies;
    }

    /**
     * Resolve an import path relative to the importing file
     *
     * @param {string} importPath - Import path from the import statement
     * @param {string} fromPath - Path of the importing file
     * @returns {string|null} Resolved path or null
     */
    resolveImportPath(importPath, fromPath) {
        // Handle relative imports
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
            const fromDir = fromPath.substring(0, fromPath.lastIndexOf('/'));
            const resolved = this.normalizePath(`${fromDir}/${importPath}`);
            
            // Try with extensions
            for (const ext of this.options.extensions) {
                const withExt = resolved.endsWith(ext) ? resolved : `${resolved}${ext}`;
                if (this.fileGraph.has(withExt)) {
                    return withExt;
                }
            }
            
            // Try index files
            for (const ext of this.options.extensions) {
                const indexPath = `${resolved}/index${ext}`;
                if (this.fileGraph.has(indexPath)) {
                    return indexPath;
                }
            }
            
            return resolved;
        }

        // Handle absolute imports (project-relative)
        if (importPath.startsWith('/')) {
            return this.normalizePath(importPath);
        }

        // Handle package imports (node_modules or aliases)
        if (!this.options.includeExternal) {
            return null;
        }
        
        return `node_modules/${importPath}`;
    }

    /**
     * Check if an import is external (node_modules)
     *
     * @param {string} importPath - Import path
     * @returns {boolean} True if external
     */
    isExternalDependency(importPath) {
        return !importPath.startsWith('./') &&
               !importPath.startsWith('../') &&
               !importPath.startsWith('/') &&
               !importPath.startsWith('#'); // Node.js subpath imports
    }

    /**
     * Compute ripple effects from a changed file
     *
     * @param {string} filePath - Path of the changed file
     * @param {number} maxDepth - Maximum traversal depth
     * @returns {RippleEffect[]} Array of ripple effects
     */
    computeRippleEffects(filePath, maxDepth = this.options.maxDepth) {
        const effects = [];
        const visited = new Set();
        const queue = [{ file: filePath, depth: 0, via: [], reason: 'source' }];

        while (queue.length > 0) {
            const { file, depth, via, reason } = queue.shift();

            if (visited.has(file)) {
                continue;
            }

            visited.add(file);

            // Get dependents (files that import this file)
            const dependents = this.reverseDependencies.get(file) || new Set();

            for (const dependent of dependents) {
                const newDepth = depth + 1;
                
                // Check depth limit before adding to effects
                if (newDepth > maxDepth) {
                    continue;
                }
                
                if (!visited.has(dependent)) {
                    const effect = {
                        file: dependent,
                        depth: newDepth,
                        via: [...via, file],
                        reason: this.getRippleReason(file, dependent),
                    };
                    
                    effects.push(effect);
                    
                    queue.push({
                        file: dependent,
                        depth: newDepth,
                        via: [...via, file],
                        reason: 'transitive',
                    });
                }
            }
        }

        // Sort by depth
        effects.sort((a, b) => a.depth - b.depth);

        return effects;
    }

    /**
     * Get the reason for a ripple effect between two files
     *
     * @param {string} from - Source file
     * @param {string} to - Dependent file
     * @returns {string} Reason description
     */
    getRippleReason(from, to) {
        const toNode = this.fileGraph.get(to);
        
        if (!toNode) {
            return 'unknown';
        }

        const importInfo = toNode.imports.find(imp => {
            const resolved = this.resolveImportPath(imp.source, to);
            return resolved === from;
        });

        if (!importInfo) {
            return 'dependency';
        }

        if (importInfo.specifiers.length === 0) {
            return 'side-effect';
        }

        return `imports: ${importInfo.specifiers.join(', ')}`;
    }

    /**
     * Detect changes in a file node
     *
     * @param {FileNode} fileNode - File node to analyze
     * @returns {string[]} List of detected changes
     */
    detectChanges(fileNode) {
        const changes = [];

        if (fileNode.exports.length > 0) {
            changes.push(`exports: ${fileNode.exports.map(e => e.name).join(', ')}`);
        }

        if (fileNode.imports.length > 0) {
            changes.push(`imports: ${fileNode.imports.map(i => i.source).join(', ')}`);
        }

        return changes;
    }

    /**
     * Add a reverse dependency mapping
     *
     * @param {string} dependency - The file being imported
     * @param {string} dependent - The file that imports it
     */
    addReverseDependency(dependency, dependent) {
        if (!this.reverseDependencies.has(dependency)) {
            this.reverseDependencies.set(dependency, new Set());
        }
        this.reverseDependencies.get(dependency).add(dependent);
    }

    /**
     * Build reverse dependencies from current file graph
     */
    buildReverseDependencies() {
        this.reverseDependencies.clear();
        
        for (const [path, node] of this.fileGraph) {
            for (const dep of node.dependencies) {
                this.addReverseDependency(dep, path);
            }
        }
    }

    /**
     * Get line number from character index
     *
     * @param {string} content - Source content
     * @param {number} index - Character index
     * @returns {number} Line number (1-based)
     */
    getLineNumber(content, index) {
        const lines = content.substring(0, index).split('\n');
        return lines.length;
    }

    /**
     * Normalize a file path
     *
     * @param {string} path - Path to normalize
     * @returns {string} Normalized path
     */
    normalizePath(path) {
        return path
            .replace(/\\/g, '/')
            .replace(/\/+/g, '/')
            .replace(/\/\.\//g, '/')
            .replace(/\/\.$/, '')
            .replace(/\/$/, '');
    }

    /**
     * Get the current file graph
     *
     * @returns {Map<string, FileNode>} File graph
     */
    getGraph() {
        return new Map(this.fileGraph);
    }

    /**
     * Get statistics about the current graph
     *
     * @returns {Object} Graph statistics
     */
    getStats() {
        return {
            totalFiles: this.fileGraph.size,
            totalDependencies: Array.from(this.fileGraph.values())
                .reduce((sum, node) => sum + node.dependencies.length, 0),
            totalExports: Array.from(this.fileGraph.values())
                .reduce((sum, node) => sum + node.exports.length, 0),
            totalImports: Array.from(this.fileGraph.values())
                .reduce((sum, node) => sum + node.imports.length, 0),
        };
    }

    /**
     * Clear the analyzer state
     */
    clear() {
        this.fileGraph.clear();
        this.reverseDependencies.clear();
    }
}

export default RefreshAnalyzer;
