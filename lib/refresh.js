/**
 * Refresher - Incremental update engine
 * Implements the `refresh` command with parallel chain logic
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ParallelScanner } from './scanner-parallel.js';
import { 
  reduceFileChange, 
  reduceSemanticRipple, 
  findAffectedFiles,
  initialState
} from './state-reducer.js';
import { RefreshAnalyzer } from './refresh-analyzer.js';

/**
 * Hash content using SHA-256
 */
function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Extract patterns from code (simplified)
 */
function extractPatterns(content) {
  const patterns = [];
  const funcRegex = /(?:function\s+(\w+)|(?:const\s+\w+\s*=\s*(?:async\s+)?function))/g;
  let match;
  while ((match = funcRegex.exec(content)) !== null) {
    patterns.push({ type: 'function', name: match[1] || 'anonymous' });
  }
  
  const classRegex = /class\s+(\w+)/g;
  while ((match = classRegex.exec(content)) !== null) {
    patterns.push({ type: 'class', name: match[1] });
  }
  
  return patterns;
}

/**
 * Extract flows from code (simplified)
 */
function extractFlows(content) {
  const flows = [];
  const apiRegex = /(?:app\.(?:get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"])/g;
  let match;
  while ((match = apiRegex.exec(content)) !== null) {
    flows.push({ type: 'api', name: match[1] });
  }
  return flows;
}

/**
 * Compute diff between old and new content
 */
function computeDiff(oldContent, newContent) {
  const oldLines = (oldContent || '').split('\n');
  const newLines = (newContent || '').split('\n');
  
  return {
    added: Math.max(0, newLines.length - oldLines.length),
    removed: Math.max(0, oldLines.length - newLines.length),
    changed: oldLines.filter((line, i) => newLines[i] !== line).length
  };
}

/**
 * Refresher class for incremental updates
 */
export class Refresher {
  constructor(palace) {
    this.palace = palace;
    this.state = null;
    this.statePath = path.join(palace.projectPath, '.palace', 'state', 'current.json');
  }
  
  /**
   * Refresh target file(s) with optional ripple effect
   * @param {string} target - File path or glob pattern
   * @param {object} options - Refresh options
   * @returns {Promise<object>} Refresh report
   */
  async refresh(target, options = {}) {
    const { 
      ripple = false, 
      dryRun = false, 
      metrics = false,
      parallel = true 
    } = options;
    
    // 1. Load current state
    this.state = await this._loadState();
    
    // 2. Resolve target (file or pattern)
    const targets = await this._resolveTarget(target);
    
    if (targets.length === 0) {
      return {
        success: false,
        error: 'No matching files found',
        target
      };
    }
    
    // 3. Diff each target
    const diffs = [];
    for (const file of targets) {
      const diff = await this._diffFile(file);
      diffs.push(diff);
    }
    
    // 4. Parallel chain analysis (if ripple enabled)
    const affectedFiles = new Set();
    if (ripple) {
      for (const file of targets) {
        const affected = findAffectedFiles(this.state, file);
        affected.forEach(f => affectedFiles.add(f));
      }
    }
    
    // 5. Compute patch
    const patch = this._computePatch(diffs, affectedFiles);
    
    // 6. Apply or preview
    if (!dryRun) {
      this.state = this._applyPatch(patch);
      await this._saveState();
    }
    
    // 7. Generate report
    const report = {
      success: true,
      targets: targets.length,
      affected: affectedFiles.size,
      changes: patch.changes.length,
      dryRun,
      files: {
        scanned: targets,
        affected: [...affectedFiles]
      },
      recommendations: []
    };
    
    if (metrics) {
      const analyzer = new RefreshAnalyzer(this.state);
      const analysis = analyzer.analyze(targets[0]);
      report.metrics = analysis.metrics;
      report.recommendations = analysis.recommendation;
    }
    
    return report;
  }
  
  /**
   * Load current state from disk
   * @private
   */
  async _loadState() {
    try {
      if (fs.existsSync(this.statePath)) {
        const data = JSON.parse(fs.readFileSync(this.statePath, 'utf-8'));
        // Convert plain objects back to Maps
        return {
          ...initialState,
          ...data,
          files: new Map(Object.entries(data.files || {})),
          patterns: new Map(Object.entries(data.patterns || {})),
          flows: new Map(Object.entries(data.flows || {})),
          entities: new Map(Object.entries(data.entities || {})),
          dependencies: new Map(Object.entries(data.dependencies || {})),
          semanticTwins: new Map(Object.entries(data.semanticTwins || {}))
        };
      }
    } catch (err) {
      // Return initial state if load fails
    }
    return { ...initialState };
  }
  
  /**
   * Save state to disk
   * @private
   */
  async _saveState() {
    const dir = path.dirname(this.statePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Convert Maps to plain objects for JSON serialization
    const data = {
      ...this.state,
      files: Object.fromEntries(this.state.files),
      patterns: Object.fromEntries(this.state.patterns),
      flows: Object.fromEntries(this.state.flows),
      entities: Object.fromEntries(this.state.entities),
      dependencies: Object.fromEntries(
        [...this.state.dependencies.entries()].map(([k, v]) => [k, [...v]])
      ),
      semanticTwins: Object.fromEntries(
        [...this.state.semanticTwins.entries()].map(([k, v]) => [k, [...v]])
      )
    };
    
    fs.writeFileSync(this.statePath, JSON.stringify(data, null, 2));
  }
  
  /**
   * Resolve target pattern to file list
   * @private
   */
  async _resolveTarget(target) {
    // Check if it's a glob pattern
    if (target.includes('*')) {
      const files = [];
      const pattern = new RegExp('^' + target.replace(/\*/g, '.*') + '$');
      
      for (const [filePath] of this.state.files.entries()) {
        if (pattern.test(filePath)) {
          files.push(filePath);
        }
      }
      return files;
    }
    
    // Check if it's a direct path
    if (this.state.files.has(target)) {
      return [target];
    }
    
    // Try to find by relative path
    const fullPath = path.resolve(this.palace.projectPath, target);
    if (this.state.files.has(fullPath)) {
      return [fullPath];
    }
    
    // Check if file exists on disk but not in state
    if (fs.existsSync(fullPath)) {
      return [fullPath];
    }
    
    return [];
  }
  
  /**
   * Diff a single file against cached version
   * @private
   */
  async _diffFile(filePath) {
    const cached = this.state.files.get(filePath);
    let current = null;
    
    try {
      current = fs.readFileSync(filePath, 'utf-8');
    } catch {
      // File doesn't exist
      if (cached) {
        return { type: 'DELETED', path: filePath };
      }
      return { type: 'NOT_FOUND', path: filePath };
    }
    
    if (!cached) {
      return { 
        type: 'ADDED', 
        path: filePath, 
        content: current 
      };
    }
    
    const currentHash = hashContent(current);
    if (currentHash === cached.hash) {
      return { type: 'UNCHANGED', path: filePath };
    }
    
    const oldContent = await this._readCachedContent(filePath);
    
    return {
      type: 'MODIFIED',
      path: filePath,
      oldContent,
      newContent: current,
      oldHash: cached.hash,
      newHash: currentHash,
      patternDiff: {
        added: extractPatterns(current).filter(p => 
          !cached.patterns?.some(cp => cp.name === p.name)
        ),
        removed: cached.patterns?.filter(p => 
          !extractPatterns(current).some(cp => cp.name === p.name)
        ) || []
      },
      flowDiff: {
        added: extractFlows(current).filter(f => 
          !cached.flows?.some(cf => cf.name === f.name)
        ),
        removed: cached.flows?.filter(f => 
          !extractFlows(current).some(cf => cf.name === f.name)
        ) || []
      }
    };
  }
  
  /**
   * Read cached content (from original file)
   * @private
   */
  async _readCachedContent(filePath) {
    try {
      // Try to read from .palace/cache if available
      const cachePath = path.join(
        this.palace.projectPath, 
        '.palace', 
        'cache', 
        path.relative(this.palace.projectPath, filePath)
      );
      if (fs.existsSync(cachePath)) {
        return fs.readFileSync(cachePath, 'utf-8');
      }
      // Fallback: read from source (but this won't be the "old" version)
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return '';
    }
  }
  
  /**
   * Compute patch from diffs
   * @private
   */
  _computePatch(diffs, affectedFiles) {
    const changes = [];
    
    for (const diff of diffs) {
      if (diff.type === 'UNCHANGED' || diff.type === 'NOT_FOUND') continue;
      
      changes.push({
        type: diff.type,
        path: diff.path,
        reducer: (state) => reduceFileChange(state, {
          type: `FILE_${diff.type}`,
          path: diff.path,
          content: diff.newContent || diff.content,
          oldContent: diff.oldContent
        })
      });
    }
    
    // Add ripple changes
    if (affectedFiles.size > 0) {
      changes.push({
        type: 'RIPPLE',
        paths: [...affectedFiles],
        reducer: (state) => reduceSemanticRipple(
          state, 
          diffs.find(d => d.type === 'MODIFIED')?.path,
          changes
        )
      });
    }
    
    return { changes, affectedFiles };
  }
  
  /**
   * Apply patch to state
   * @private
   */
  _applyPatch(patch) {
    let state = this.state;
    for (const change of patch.changes) {
      if (change.reducer) {
        state = change.reducer(state);
      }
    }
    return state;
  }
}
