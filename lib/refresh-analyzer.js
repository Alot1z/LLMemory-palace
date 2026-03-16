/**
 * Refresh Analyzer - Metric-driven analysis
 * Tracks quality metrics before/after refresh
 * Inspired by prompt-optimizer iterative refinement
 */

/**
 * Calculate genome size
 */
function genomeSize(state) {
  try {
    return JSON.stringify(state).length;
  } catch {
    return 0;
  }
}

/**
 * Calculate pattern coverage
 */
function patternCoverage(state) {
  const total = state.files?.size || 0;
  if (total === 0) return 0;
  const covered = [...(state.files?.values() || [])]
    .filter(f => f.patterns?.length > 0).length;
  return covered / total;
}

/**
 * Calculate flow completeness
 */
function flowCompleteness(state) {
  const total = state.files?.size || 0;
  if (total === 0) return 1;
  const withFlows = [...(state.files?.values() || [])]
    .filter(f => f.flows?.length > 0).length;
  return withFlows / total;
}

/**
 * Calculate semantic density
 */
function semanticDensity(state) {
  const files = state.files;
  if (!files || files.size === 0) return 0;
  const unique = new Set([...files.values()].map(f => f.hash)).size;
  return unique / files.size;
}

/**
 * Calculate twin ratio
 */
function twinRatio(state) {
  const files = state.files;
  if (!files || files.size === 0) return 0;
  let twins = 0;
  (state.semanticTwins?.values() || []).forEach(set => {
    twins += set.size;
  });
  return files.size > 0 ? twins / files.size : 0;
}

/**
 * Calculate dependency count
 */
function dependencyCount(state) {
  return state.dependencies?.size || 0;
}

/**
 * All available metrics
 */
export const METRICS = {
  genomeSize,
  patternCoverage,
  flowCompleteness,
  semanticDensity,
  twinRatio,
  dependencyCount
};

/**
 * Refresh Analyzer class
 */
class RefreshAnalyzer {
  constructor(state) {
    this.state = state;
    this.beforeMetrics = this._captureMetrics();
  }
  
  /**
   * Capture current metrics
   * @private
   */
  _captureMetrics() {
    const metrics = {};
    for (const [name, fn] of Object.entries(METRICS)) {
      try {
        metrics[name] = fn(this.state);
      } catch {
        metrics[name] = 0;
      }
    }
    return metrics;
  }
  
  /**
   * Analyze what would change if target is refreshed
   * @param {string} target - File or pattern to analyze
   * @returns {object} Analysis result
   */
  analyze(target) {
    const before = this.beforeMetrics;
    
    // Simulate refresh and capture after metrics
    const afterState = this._simulateRefresh(target);
    const after = this._captureMetricsFor(afterState);
    
    // Calculate delta
    const delta = {};
    for (const key of Object.keys(before)) {
      delta[key] = {
        before: before[key],
        after: after[key],
        change: after[key] - before[key],
        percentChange: before[key] !== 0 
          ? ((after[key] - before[key]) / before[key] * 100).toFixed(2)
          : 0
      };
    }
    
    return {
      target,
      metrics: delta,
      recommendation: this._generateRecommendation(delta),
      affectedFiles: this._findAffectedFiles(target)
    };
  }
  
  /**
   * Simulate refresh on target
   * @private
   */
  _simulateRefresh(target) {
    // Deep clone state
    const newState = JSON.parse(JSON.stringify(this._serializeState()));
    
    // Find matching files
    const matchingFiles = this._findMatchingFiles(target);
    
    // Mark them as needing refresh
    for (const file of matchingFiles) {
      if (newState.files[file]) {
        newState.files[file].needsRefresh = true;
        newState.files[file].lastModified = Date.now();
      }
    }
    
    return newState;
  }
  
  /**
   * Serialize state for comparison
   * @private
   */
  _serializeState() {
    return {
      version: this.state.version,
      lastScan: this.state.lastScan,
      files: Object.fromEntries(
        [...(this.state.files?.entries() || [])].map(([k, v]) => [k, {
          ...v,
          patterns: v.patterns?.length || 0,
          flows: v.flows?.length || 0
        }])
      ),
      patterns: this.state.patterns?.size || 0,
      flows: this.state.flows?.size || 0,
      semanticTwins: this.state.semanticTwins?.size || 0
    };
  }
  
  /**
   * Capture metrics for a state
   * @private
   */
  _captureMetricsFor(state) {
    const metrics = {};
    for (const [name, fn] of Object.entries(METRICS)) {
      try {
        metrics[name] = fn(state);
      } catch {
        metrics[name] = 0;
      }
    }
    return metrics;
  }
  
  /**
   * Find files matching target pattern
   * @private
   */
  _findMatchingFiles(target) {
    const files = [];
    const pattern = target.includes('*') 
      ? new RegExp('^' + target.replace(/\*/g, '.*') + '$')
      : new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    
    for (const [path] of (this.state.files?.entries() || [])) {
      if (pattern.test(path)) {
        files.push(path);
      }
    }
    
    return files;
  }
  
  /**
   * Find files affected by a change
   * @private
   */
  _findAffectedFiles(target) {
    const affected = new Set();
    
    const entry = this.state.files?.get(target);
    if (!entry) return [...affected];
    
    // Check for semantic twins
    if (this.state.semanticTwins?.has(entry.hash)) {
      const twins = this.state.semanticTwins.get(entry.hash);
      twins.forEach(t => {
        if (t !== target) affected.add(t);
      });
    }
    
    // Check for pattern instances
    for (const [id, pattern] of (this.state.patterns?.entries() || [])) {
      if (pattern.instances?.some(i => i.file === target)) {
        pattern.instances.forEach(i => {
          if (i.file !== target) affected.add(i.file);
        });
      }
    }
    
    // Check for flow instances
    for (const [id, flow] of (this.state.flows?.entries() || [])) {
      if (flow.instances?.some(i => i.file === target)) {
        flow.instances.forEach(i => {
          if (i.file !== target) affected.add(i.file);
        });
      }
    }
    
    return [...affected];
  }
  
  /**
   * Generate recommendations based on metric changes
   * @private
   */
  _generateRecommendation(delta) {
    const recommendations = [];
    
    if (delta.semanticDensity?.percentChange < -5) {
      recommendations.push('Semantic density decreased - consider consolidating similar files');
    }
    
    if (delta.patternCoverage?.change > 0.1) {
      recommendations.push('New patterns detected - review pattern library for duplicates');
    }
    
    if (delta.twinRatio?.change > 0.05) {
      recommendations.push('Semantic twins increased - check for code duplication');
    }
    
    if (delta.flowCompleteness?.percentChange < -10) {
      recommendations.push('Flow coverage dropped - check for incomplete refactoring');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('No issues detected - state is healthy');
    }
    
    return recommendations;
  }
}

export { RefreshAnalyzer };
