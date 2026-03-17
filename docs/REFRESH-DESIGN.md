# Architecture Analysis & Refresh Command Design

## 1. Current Architecture Analysis

### File Structure
```
LLMemory-Palace-package/
├── bin/cli.js          (609 lines) - Command dispatcher
├── lib/
│   ├── palace.js       (980 lines) - Core orchestrator
│   ├── genome.js       (340 lines) - Encoder
│   ├── genome-safe.js  (633 lines) - Safe parser
│   ├── patterns.js     (345 lines) - Pattern library
│   ├── flows.js        (226 lines) - Behavior graphs
│   ├── semantic-hash.js(130 lines) - Fingerprinting
│   ├── reconstructor.js(150 lines) - Code rebuild
│   ├── cli-validator.js(471 lines) - Input security
│   └── index.js        (22 lines)  - Exports
└── config/
    ├── exclude.json    - File exclusions
    ├── patterns.json   - Built-in patterns
    └── settings.json   - Default settings
```

### Data Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   scan()    │ -> │  process()  │ -> │  genome()   │
│             │    │             │    │             │
│ - read files│    │ - patterns  │    │ - encode    │
│ - hash code │    │ - flows     │    │ - compress  │
│ - detect    │    │ - entities  │    │ - output    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                           │
                    ┌──────▼──────┐
                    │   State     │
                    │  .palace/   │
                    └─────────────┘
```

### Identified Bottlenecks

| Issue | Location | Impact |
|-------|----------|--------|
| Full rescan on every change | `palace.js:scan()` | O(n) file reads |
| No incremental state | State saved to JSON only | Can't diff changes |
| Single-threaded scan | `scanDir()` recursive | Slow on large repos |
| No dependency tracking | Missing module | Can't propagate changes |
| No semantic linking | `semantic-hash.js` isolated | Can't find twins |

---

## 2. Logic Integration Plan

### 2.1 From Rust_Search: Parallel String Matching

**Principle:** High-performance parallel indexing using worker threads.

**Target File:** `lib/scanner-parallel.js` (NEW)

```javascript
// lib/scanner-parallel.js
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { cpus } from 'os';

/**
 * Parallel file scanner inspired by Rust_Search concurrency model
 * Uses worker pool pattern for CPU-bound file processing
 */

export class ParallelScanner {
  constructor(poolSize = cpus().length) {
    this.poolSize = poolSize;
    this.workers = [];
    this.taskQueue = [];
    this.results = new Map();
  }

  async scanFiles(files, options = {}) {
    // Partition files across workers
    const chunks = this._partition(files, this.poolSize);
    
    // Create worker pool
    const workers = chunks.map((chunk, i) => 
      this._createWorker(chunk, options, i)
    );
    
    // Collect results
    const results = await Promise.all(workers.map(w => w.result));
    
    // Merge results
    return this._mergeResults(results);
  }

  _createWorker(files, options, workerId) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL('./scanner-worker.js', import.meta.url),
        { workerData: { files, options, workerId } }
      );
      
      worker.on('message', (result) => {
        this.results.set(workerId, result);
        resolve(result);
      });
      
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`Worker ${workerId} exited with ${code}`));
      });
    });
  }

  _partition(arr, n) {
    const chunkSize = Math.ceil(arr.length / n);
    return Array.from({ length: n }, (_, i) =>
      arr.slice(i * chunkSize, i * chunkSize + chunkSize)
    );
  }

  _mergeResults(results) {
    return {
      files: results.flatMap(r => r.files),
      patterns: this._mergeMaps(results.map(r => r.patterns)),
      flows: this._mergeMaps(results.map(r => r.flows)),
      entities: this._mergeMaps(results.map(r => r.entities)),
      hashes: this._mergeMaps(results.map(r => r.hashes))
    };
  }

  _mergeMaps(maps) {
    return maps.reduce((acc, map) => new Map([...acc, ...map]), new Map());
  }
}

// Worker file: lib/scanner-worker.js
if (!isMainThread) {
  const { files, options, workerId } = workerData;
  
  const result = {
    files: [],
    patterns: new Map(),
    flows: new Map(),
    entities: new Map(),
    hashes: new Map()
  };
  
  for (const file of files) {
    // Process each file
    const content = fs.readFileSync(file, 'utf-8');
    result.files.push(file);
    result.hashes.set(file, hashContent(content));
    // ... pattern extraction, flow detection
  }
  
  parentPort.postMessage(result);
}
```

---

### 2.2 From SpacetimeDB: Atomic Reducers

**Principle:** Pure reducer functions for predictable state transitions.

**Target File:** `lib/state-reducer.js` (NEW)

```javascript
// lib/state-reducer.js

/**
 * Atomic state management inspired by SpacetimeDB reducers
 * All state changes go through pure functions
 */

// State shape
const initialState = {
  version: '1.0.0',
  lastScan: null,
  files: new Map(),        // path -> FileEntry
  patterns: new Map(),      // id -> Pattern
  flows: new Map(),         // id -> Flow
  entities: new Map(),      // hash -> Entity
  dependencies: new Map(),  // file -> Set<file>
  semanticTwins: new Map()  // hash -> Set<path>
};

// Reducer: Apply file change
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
      
      return {
        ...state,
        files: new Map(state.files).set(path, {
          ...oldEntry,
          hash: newHash,
          lastModified: Date.now(),
          patterns: extractPatterns(content),
          flows: extractFlows(content),
          diff
        }),
        lastScan: Date.now(),
        // Track semantic twins
        semanticTwins: updateSemanticTwins(
          state.semanticTwins, 
          path, 
          oldHash, 
          newHash
        )
      };
    }
    
    case 'FILE_DELETED': {
      const newFiles = new Map(state.files);
      newFiles.delete(path);
      return {
        ...state,
        files: newFiles,
        lastScan: Date.now()
      };
    }
    
    default:
      return state;
  }
}

// Reducer: Apply semantic ripple (parallel chain update)
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

// Find files affected by a change (parallel chain logic)
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
    if (pattern.instances.some(i => i.file === sourcePath)) {
      pattern.instances.forEach(i => {
        if (i.file !== sourcePath) affected.add(i.file);
      });
    }
  }
  
  return affected;
}

export {
  initialState,
  reduceFileChange,
  reduceSemanticRipple,
  findAffectedFiles
};
```

---

### 2.3 From prompt-optimizer: Metric-Driven Analysis

**Principle:** Iterative refinement with measurable quality metrics.

**Target File:** `lib/refresh-analyzer.js` (NEW)

```javascript
// lib/refresh-analyzer.js

/**
 * Metric-driven refresh analysis inspired by prompt-optimizer
 * Tracks quality metrics before/after refresh
 */

const METRICS = {
  genomeSize: (state) => JSON.stringify(state).length,
  patternCoverage: (state) => {
    const total = state.files.size;
    const covered = [...state.files.values()]
      .filter(f => f.patterns.length > 0).length;
    return total > 0 ? covered / total : 0;
  },
  flowCompleteness: (state) => {
    const expected = detectExpectedFlows(state);
    const found = state.flows.size;
    return expected > 0 ? found / expected : 1;
  },
  semanticDensity: (state) => {
    const unique = new Set([...state.files.values()].map(f => f.hash)).size;
    const total = state.files.size;
    return total > 0 ? unique / total : 0;
  },
  twinRatio: (state) => {
    let twins = 0;
    state.semanticTwins.forEach(set => twins += set.size);
    const total = state.files.size;
    return total > 0 ? twins / total : 0;
  }
};

class RefreshAnalyzer {
  constructor(state) {
    this.state = state;
    this.beforeMetrics = this._captureMetrics();
  }
  
  _captureMetrics() {
    const metrics = {};
    for (const [name, fn] of Object.entries(METRICS)) {
      metrics[name] = fn(this.state);
    }
    return metrics;
  }
  
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
      affectedFiles: findAffectedFiles(this.state, target)
    };
  }
  
  _simulateRefresh(target) {
    // Clone state and apply changes
    const newState = JSON.parse(JSON.stringify(this.state));
    // Apply refresh logic...
    return newState;
  }
  
  _generateRecommendation(delta) {
    const recommendations = [];
    
    if (delta.semanticDensity.percentChange < -5) {
      recommendations.push('Consider consolidating similar files');
    }
    
    if (delta.patternCoverage.change > 0.1) {
      recommendations.push('New patterns detected - review pattern library');
    }
    
    if (delta.twinRatio.change > 0.05) {
      recommendations.push('Semantic twins increased - check for code duplication');
    }
    
    return recommendations;
  }
}

export { RefreshAnalyzer, METRICS };
```

---

## 3. CLI Enhancement: The `refresh` Command

### Usage

```bash
# Refresh specific file
npx palace refresh src/auth/login.js

# Refresh by pattern
npx palace refresh "src/api/*.ts"

# Refresh with ripple (update related files)
npx palace refresh src/auth/login.js --ripple

# Dry run (show what would change)
npx palace refresh src/auth/login.js --dry-run

# Refresh with metrics
npx palace refresh src/auth/login.js --metrics
```

### Algorithm: Parallel Chain Logic

```
┌─────────────────────────────────────────────────────────────┐
│                    REFRESH ALGORITHM                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. LOAD STATE                                              │
│     └─> Read .palace/state/current.json                     │
│                                                             │
│  2. DIFF TARGET                                             │
│     └─> Compare target file with cached version             │
│     └─> Extract: +patterns, -patterns, ~patterns           │
│                                                             │
│  3. PARALLEL CHAIN ANALYSIS                                 │
│     ┌─────────────────────────────────────────┐             │
│     │  A. Dependency Chain                    │             │
│     │     target -> imports -> dependents     │             │
│     │                                         │             │
│     │  B. Semantic Twin Chain                 │             │
│     │     target.hash -> twins -> updates     │             │
│     │                                         │             │
│     │  C. Pattern Instance Chain              │             │
│     │     target.patterns -> instances -> ?   │             │
│     └─────────────────────────────────────────┘             │
│                                                             │
│  4. COMPUTE PATCH                                           │
│     └─> Generate minimal patch set                          │
│     └─> Preserve unchanged areas                            │
│                                                             │
│  5. APPLY (if not --dry-run)                                │
│     └─> Atomic update via reducers                          │
│     └─> Update genome incrementally                         │
│                                                             │
│  6. REPORT                                                  │
│     └─> Show metrics, affected files, recommendations       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Implementation: `lib/refresh.js`

```javascript
// lib/refresh.js
import { ParallelScanner } from './scanner-parallel.js';
import { 
  reduceFileChange, 
  reduceSemanticRipple, 
  findAffectedFiles 
} from './state-reducer.js';
import { RefreshAnalyzer } from './refresh-analyzer.js';

export class Refresher {
  constructor(palace) {
    this.palace = palace;
    this.state = null;
  }
  
  async refresh(target, options = {}) {
    const { ripple = false, dryRun = false, metrics = false } = options;
    
    // 1. Load current state
    this.state = await this._loadState();
    
    // 2. Resolve target (file or pattern)
    const targets = await this._resolveTarget(target);
    
    // 3. Diff each target
    const diffs = [];
    for (const file of targets) {
      const diff = await this._diffFile(file);
      diffs.push(diff);
    }
    
    // 4. Parallel chain analysis
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
      targets: targets.length,
      affected: affectedFiles.size,
      changes: patch.changes.length,
      dryRun,
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
  
  async _diffFile(filePath) {
    const cached = this.state.files.get(filePath);
    const current = await this._readFile(filePath);
    
    if (!cached) {
      return { type: 'ADDED', path: filePath, content: current };
    }
    
    if (!current) {
      return { type: 'DELETED', path: filePath };
    }
    
    const currentHash = hashContent(current);
    if (currentHash === cached.hash) {
      return { type: 'UNCHANGED', path: filePath };
    }
    
    return {
      type: 'MODIFIED',
      path: filePath,
      oldContent: cached.content,
      newContent: current,
      oldHash: cached.hash,
      newHash: currentHash,
      patternDiff: this._diffPatterns(cached.patterns, extractPatterns(current)),
      flowDiff: this._diffFlows(cached.flows, extractFlows(current))
    };
  }
  
  _computePatch(diffs, affectedFiles) {
    const changes = [];
    
    for (const diff of diffs) {
      if (diff.type === 'UNCHANGED') continue;
      
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
        reducer: (state) => reduceSemanticRipple(state, diffs[0]?.path, changes)
      });
    }
    
    return { changes, affectedFiles };
  }
  
  _applyPatch(patch) {
    let state = this.state;
    for (const change of patch.changes) {
      state = change.reducer(state);
    }
    return state;
  }
}
```

### CLI Integration: `bin/cli.js`

```javascript
// Add to bin/cli.js commands object

refresh: async () => {
  if (!args.includes('--quiet')) console.log(BANNER);
  
  try {
    const target = args.find(a => !a.startsWith('--') && a !== 'refresh');
    
    if (!target) {
      console.log(chalk.red('Error: Specify target file or pattern'));
      console.log(chalk.gray('Usage: palace refresh <file|pattern> [--ripple] [--dry-run] [--metrics]'));
      process.exit(1);
    }
    
    const options = validateCommand('refresh', {
      target,
      ripple: args.includes('--ripple') || args.includes('-r'),
      dryRun: args.includes('--dry-run') || args.includes('-d'),
      metrics: args.includes('--metrics') || args.includes('-m'),
      parallel: !args.includes('--sequential')
    });
    
    const palace = new Palace(process.cwd());
    const refresher = new Refresher(palace);
    
    console.log(chalk.blue('Refreshing:'), options.target);
    
    const startTime = Date.now();
    const result = await refresher.refresh(options.target, options);
    const duration = Date.now() - startTime;
    
    // Output report
    console.log(chalk.green('\n✓ Refresh complete'));
    console.log(chalk.gray(`  Duration: ${duration}ms`));
    console.log(chalk.gray(`  Targets: ${result.targets}`));
    console.log(chalk.gray(`  Affected: ${result.affected} files`));
    console.log(chalk.gray(`  Changes: ${result.changes}`));
    
    if (options.dryRun) {
      console.log(chalk.yellow('\n⚠ DRY RUN - No changes applied'));
    }
    
    if (result.metrics) {
      console.log(chalk.cyan('\n📊 Metrics:'));
      for (const [name, data] of Object.entries(result.metrics)) {
        const arrow = data.change >= 0 ? '↑' : '↓';
        console.log(chalk.gray(`  ${name}: ${data.before.toFixed(2)} → ${data.after.toFixed(2)} ${arrow}${data.percentChange}%`));
      }
    }
    
    if (result.recommendations?.length > 0) {
      console.log(chalk.yellow('\n💡 Recommendations:'));
      result.recommendations.forEach(r => console.log(chalk.gray(`  • ${r}`)));
    }
    
  } catch (error) {
    handleError(error);
  }
}
```

---

## 4. File Modification Summary

| File | Action | Lines Added |
|------|--------|-------------|
| `lib/scanner-parallel.js` | CREATE | ~120 |
| `lib/scanner-worker.js` | CREATE | ~60 |
| `lib/state-reducer.js` | CREATE | ~150 |
| `lib/refresh-analyzer.js` | CREATE | ~100 |
| `lib/refresh.js` | CREATE | ~180 |
| `lib/palace.js` | MODIFY | +30 (add refresher import) |
| `bin/cli.js` | MODIFY | +50 (add refresh command) |

**Total: ~690 new lines**

---

## 5. Testing Strategy

```javascript
// tests/refresh.test.js

describe('Refresher', () => {
  test('detects file addition', async () => {
    const refresher = new Refresher(mockPalace);
    const result = await refresher.refresh('new-file.js');
    expect(result.changes).toBe(1);
  });
  
  test('ripple updates semantic twins', async () => {
    // Create two files with identical code
    const refresher = new Refresher(palace);
    await refresher.refresh('file-a.js', { ripple: true });
    
    const state = palace.getState();
    expect(state.files.get('file-b.js').lastModified).toBeGreaterThan(0);
  });
  
  test('dry-run makes no changes', async () => {
    const before = palace.getState();
    await refresher.refresh('file.js', { dryRun: true });
    const after = palace.getState();
    expect(before).toEqual(after);
  });
  
  test('metrics track changes', async () => {
    const result = await refresher.refresh('file.js', { metrics: true });
    expect(result.metrics.patternCoverage).toBeDefined();
  });
});
```

---

## 6. Migration Path

1. **Phase 1**: Add new files (no breaking changes)
2. **Phase 2**: Add `refresh` command to CLI
3. **Phase 3**: Enable parallel scanning (behind flag)
4. **Phase 4**: Make parallel default, add state migration
5. **Phase 5**: Enable semantic twins tracking
