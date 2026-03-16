/**
 * Atomic State Reducers - SpacetimeDB Pattern
 * Pure reducer functions for predictable state transitions
 */

import crypto from 'crypto';

/**
 * Hash content using SHA-256
 */
function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Initial state shape
 */
export const initialState = {
  version: '2.6.0',
  lastScan: null,
  files: new Map(),        // path -> FileEntry
  patterns: new Map(),      // id -> Pattern
  flows: new Map(),         // id -> Flow
  entities: new Map(),      // hash -> Entity
  dependencies: new Map(),  // file -> Set<file>
  semanticTwins: new Map()  // hash -> Set<path>
};

/**
 * Reducer: Apply file change
 * @param {object} state - Current state
 * @param {object} action - Change action
 * @returns {object} New state
 */
function reduceFileChange(state, action) {
  const { type, path, content, oldContent } = action;
  
  switch (type) {
    case 'FILE_ADDED':
      return {
        ...state,
        files: new Map(state.files).set(path, {
          path,
          hash: hashContent(content),
          lastModified: Date.now(),
          patterns: extractPatterns(content),
          flows: extractFlows(content)
        }),
        lastScan: Date.now()
      };
      
    case 'FILE_MODIFIED': {
      const oldEntry = state.files.get(path);
      const newHash = hashContent(content);
      const oldHash = oldEntry?.hash;
      
      // Detect what changed
      const diff = computeDiff(oldContent, content);
      
      const newState = {
        ...state,
        files: new Map(state.files).set(path, {
          ...oldEntry,
          hash: newHash,
          lastModified: Date.now(),
          patterns: extractPatterns(content),
          flows: extractFlows(content),
          diff
        }),
        lastScan: Date.now()
      };
      
      // Update semantic twins
      newState.semanticTwins = updateSemanticTwins(
        state.semanticTwins,
        path,
        oldHash,
        newHash
      );
      
      return newState;
    }
    
    case 'FILE_DELETED': {
      const newFiles = new Map(state.files);
      newFiles.delete(path);
      
      const newSemanticTwins = new Map(state.semanticTwins);
      // Remove from semantic twins
      newSemanticTwins.forEach((paths, hash) => {
        paths.delete(path);
        if (paths.size === 0) {
          newSemanticTwins.delete(hash);
        }
      });
      
      return {
        ...state,
        files: newFiles,
        semanticTwins: newSemanticTwins,
        lastScan: Date.now()
      };
    }
    
    case 'FILE_RIPPLE': {
      // Ripple update from another file's change
      const { sourcePath, changes } = action;
      const entry = state.files.get(path);
      
      if (!entry) return state;
      
      return {
        ...state,
        files: new Map(state.files).set(path, {
          ...entry,
          lastModified: Date.now(),
          rippleSource: sourcePath
        }),
        lastScan: Date.now()
      };
    }
    
    default:
      return state;
  }
}

/**
 * Reducer: Apply semantic ripple (parallel chain update)
 * @param {object} state - Current state
 * @param {string} sourcePath - Path of changed file
 * @param {object} changes - Changes to apply
 * @returns {object} New state
 */
function reduceSemanticRipple(state, sourcePath, changes) {
  const affectedFiles = findAffectedFiles(state, sourcePath);
  
  let newState = state;
  for (const affectedPath of affectedFiles) {
    newState = reduceFileChange(newState, {
      type: 'FILE_RIPPLE',
      path: affectedPath,
      sourcePath,
      changes
    });
  }
  
  return newState;
}

/**
 * Find files affected by a change (parallel chain logic)
 * @param {object} state - Current state
 * @param {string} sourcePath - Path of changed file
 * @returns {Set<string>} Affected file paths
 */
function findAffectedFiles(state, sourcePath) {
  const affected = new Set();
  
  // 1. Direct dependencies
  const deps = state.dependencies.get(sourcePath) || new Set();
  deps.forEach(d => affected.add(d));
  
  // 2. Semantic twins (similar code elsewhere)
  const entry = state.files.get(sourcePath);
  if (entry) {
    const twins = state.semanticTwins.get(entry.hash) || new Set();
    twins.forEach(t => {
      if (t !== sourcePath) affected.add(t);
    });
  }
  
  // 3. Pattern instances (files using same patterns)
  for (const [patternId, pattern] of state.patterns) {
    if (pattern.instances && pattern.instances.some(i => i.file === sourcePath)) {
      pattern.instances.forEach(i => {
        if (i.file !== sourcePath) affected.add(i.file);
      });
    }
  }
  
  return affected;
}

/**
 * Compute diff between old and new content
 * @private
 */
function computeDiff(oldContent, newContent) {
  const oldLines = (oldContent || '').split('\n');
  const newLines = newContent.split('\n');
  
  const added = [];
  const removed = [];
  const modified = [];
  
  const maxLines = Math.max(oldLines.length, newLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];
    
    if (oldLine === undefined) {
      added.push({ line: i + 1, content: newLine });
    } else if (newLine === undefined) {
      removed.push({ line: i + 1, content: oldLine });
    } else if (oldLine !== newLine) {
      modified.push({ 
        line: i + 1, 
        old: oldLine, 
        new: newLine 
      });
    }
  }
  
  return { added, removed, modified };
}

/**
 * Extract patterns from code
 * @private
 */
function extractPatterns(content) {
  const patterns = [];
  
  // Function declarations
  const funcRegex = /function\s+(\w+)/g;
  let match;
  while ((match = funcRegex.exec(content)) !== null) {
    patterns.push({ type: 'function', name: match[1] });
  }
  
  // Arrow functions - simplified pattern
  const arrowRegex = /const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g;
  while ((match = arrowRegex.exec(content)) !== null) {
    patterns.push({ type: 'function', name: match[1] });
  }
  
  // Class declarations
  const classRegex = /class\s+(\w+)/g;
  while ((match = classRegex.exec(content)) !== null) {
    patterns.push({ type: 'class', name: match[1] });
  }
  
  return patterns;
}

/**
 * Extract flows from code
 * @private
 */
function extractFlows(content) {
  const flows = [];
  
  // API endpoints - fixed regex
  const apiRegex = /(app|router)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = apiRegex.exec(content)) !== null) {
    flows.push({ type: 'api', method: match[2], path: match[3] });
  }
  
  return flows;
}

/**
 * Update semantic twins map
 * @private
 */
function updateSemanticTwins(twins, path, oldHash, newHash) {
  const newTwins = new Map(twins);
  
  // Remove from old hash
  if (oldHash && newTwins.has(oldHash)) {
    newTwins.get(oldHash).delete(path);
    if (newTwins.get(oldHash).size === 0) {
      newTwins.delete(oldHash);
    }
  }
  
  // Add to new hash
  if (newHash) {
    if (!newTwins.has(newHash)) {
      newTwins.set(newHash, new Set());
    }
    newTwins.get(newHash).add(path);
  }
  
  return newTwins;
}

/**
 * Create state from scan results
 */
function createFromScanResults(results) {
  const state = { ...initialState };
  
  for (const file of results.files) {
    const hash = results.hashes.get(file);
    state.files.set(file, {
      path: file,
      hash,
      lastModified: Date.now(),
      patterns: results.patterns.get(file) || [],
      flows: results.flows.get(file) || []
    });
    
    // Track semantic twins
    if (hash) {
      if (!state.semanticTwins.has(hash)) {
        state.semanticTwins.set(hash, new Set());
      }
      state.semanticTwins.get(hash).add(file);
    }
  }
  
  state.lastScan = Date.now();
  return state;
}

export {
  reduceFileChange,
  reduceSemanticRipple,
  findAffectedFiles,
  hashContent,
  createFromScanResults
};
