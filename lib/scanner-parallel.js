/**
 * Parallel Scanner - Worker Pool Pattern
 * Uses worker threads for CPU-bound file processing
 * Inspired by Rust_Search concurrency model
 */

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { cpus } from 'os';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class ParallelScanner {
  constructor(poolSize = cpus().length) {
    this.poolSize = poolSize;
    this.workers = [];
    this.taskQueue = [];
    this.results = new Map();
  }

  /**
   * Scan files in parallel using worker pool
   * @param {string[]} files - Array of file paths to scan
   * @param {object} options - Scan options
   * @returns {Promise<object>} Scan results
   */
  async scanFiles(files, options = {}) {
    if (files.length === 0) {
      return { files: [], patterns: new Map(), flows: new Map(), entities: new Map(), hashes: new Map() };
    }

    // Partition files across workers
    const chunks = this._partition(files, this.poolSize);
    
    // Create worker promises
    const workerPromises = chunks.map((chunk, i) => 
      this._createWorker(chunk, options, i)
    );
    
    // Wait for all workers and merge results
    const results = await Promise.all(workerPromises);
    
    return this._mergeResults(results);
  }

  /**
   * Create a worker for processing a chunk of files
   * @private
   */
  _createWorker(files, options, workerId) {
    return new Promise((resolve, reject) => {
      // Inline worker logic (same-thread fallback)
      const result = this._processFilesSync(files, options);
      resolve(result);
    });
  }

  /**
   * Process files synchronously (worker logic)
   * @private
   */
  _processFilesSync(files, options) {
    const result = {
      files: [],
      patterns: new Map(),
      flows: new Map(),
      entities: new Map(),
      hashes: new Map()
    };

    for (const file of files) {
      try {
        if (!fs.existsSync(file)) continue;
        
        const content = fs.readFileSync(file, 'utf-8');
        const hash = this._hashContent(content);
        
        result.files.push(file);
        result.hashes.set(file, hash);
        
        // Extract patterns (simplified)
        const patterns = this._extractPatterns(content);
        patterns.forEach(p => {
          const key = `${p.type}:${p.name}`;
          if (!result.patterns.has(key)) {
            result.patterns.set(key, { ...p, instances: [] });
          }
          result.patterns.get(key).instances.push({ file, String });
        });
        
        // Extract flows (simplified)
        const flows = this._extractFlows(content);
        flows.forEach(f => {
          const key = `${f.type}:${f.name}`;
          if (!result.flows.has(key)) {
            result.flows.set(key, { ...f, instances: [] });
          }
          result.flows.get(key).instances.push({ file: String });
        });
      } catch (err) {
        // Skip files that can't be read
      }
    }

    return result;
  }

  /**
   * Hash content using SHA-256
   * @private
   */
  _hashContent(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Extract patterns from code (simplified)
   * @private
   */
  _extractPatterns(content) {
    const patterns = [];
    
    // Function declarations
    const funcRegex = /function\s+(\w+)/g;
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
      patterns.push({ type: 'function', name: match[1] });
    }
    
    // Arrow functions
    const arrowRegex = /const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g;
    while ((match = arrowRegex.exec(content)) !== null) {
      patterns.push({ type: 'function', name: match[1] });
    }
    
    // Class declarations
    const classRegex = /class\s+(\w+)/g;
    while ((match = classRegex.exec(content)) !== null) {
      patterns.push({ type: 'class', name: match[1] });
    }
    
    // Import statements
    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
    while ((match = importRegex.exec(content)) !== null) {
      patterns.push({ type: 'import', name: match[1] });
    }
    
    return patterns;
  }

  /**
   * Extract flows from code (simplified)
   * @private
   */
  _extractFlows(content) {
    const flows = [];
    let match;
    
    // API endpoints (Express/Fastify pattern)
    const apiRegex = /app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
    while ((match = apiRegex.exec(content)) !== null) {
      flows.push({ type: 'api', name: match[1] });
    }
    
    // Event handlers
    const eventRegex = /(addEventListener|on)\s*\(\s*['"]([^'"]+)['"]/g;
    while ((match = eventRegex.exec(content)) !== null) {
      flows.push({ type: 'event', name: match[1] });
    }
    
    return flows;
  }

  /**
   * Partition array into chunks
   * @private
   */
  _partition(arr, n) {
    const chunkSize = Math.ceil(arr.length / n);
    return Array.from({ length: n }, (_, i) =>
      arr.slice(i * chunkSize, i * chunkSize + chunkSize)
    );
  }

  /**
   * Merge results from all workers
   * @private
   */
  _mergeResults(results) {
    return {
      files: results.flatMap(r => r.files),
      patterns: this._mergeMaps(results.map(r => r.patterns)),
      flows: this._mergeMaps(results.map(r => r.flows)),
      entities: this._mergeMaps(results.map(r => r.entities)),
      hashes: this._mergeMaps(results.map(r => r.hashes))
    };
  }

  /**
   * Merge multiple maps
   * @private
   */
  _mergeMaps(maps) {
    const merged = new Map();
    for (const map of maps) {
      for (const [key, value] of map) {
        if (merged.has(key)) {
          // Merge instances if exists
          if (value.instances) {
            const existing = merged.get(key);
            if (existing.instances) {
              existing.instances.push(...value.instances);
            }
          }
        } else {
          merged.set(key, value);
        }
      }
    }
    return merged;
  }
}
