# Refresh Command

> Incremental update with parallel chain logic

## Overview

The `refresh` command provides incremental updates without full rescans. It uses:

1. **Parallel scanning** - Worker pool for CPU-bound file processing
2. **Atomic reducers** - Predictable state transitions (SpacetimeDB pattern)
3. **Metric-driven analysis** - Quality tracking before/after (prompt-optimizer pattern)

## Usage

```bash
# Basic refresh
npx palace refresh lib/palace.js

# Update related files (ripple effect)
npx palace refresh lib/palace.js --ripple

# Preview changes
npx palace refresh "src/api/*.ts" --dry-run

# Show metrics
npx palace refresh lib/genome.js --metrics

# Combined options
npx palace refresh src/auth.js --ripple --metrics --dry-run
```

## Options

| Flag | Short | Purpose |
|------|-------|---------|
| `--ripple` | `-r` | Update files affected by this change |
| `--dry-run` | `-d` | Preview changes without applying |
| `--metrics` | `-m` | Show quality metrics before/after |
| `--sequential` | | Disable parallel scanning |

## How It Works

### 1. Load State

Reads `.palace/state/current.json` containing:
- File hashes
- Pattern instances
- Flow definitions
- Semantic twins (files with identical content)

### 2. Diff Target

Compares target file with cached version:
- Detects: `ADDED`, `MODIFIED`, `DELETED`, `UNCHANGED`
- Extracts pattern/flow changes

### 3. Parallel Chain Analysis (with --ripple)

```
┌─────────────────────────────────────────┐
│  A. Dependency Chain                    │
│     target → imports → dependents        │
│                                         │
│  B. Semantic Twin Chain                 │
│     target.hash → twins → updates       │
│                                         │
│  C. Pattern Instance Chain              │
│     target.patterns → instances → ?     │
└─────────────────────────────────────────┘
```

### 4. Compute Patch

Generates minimal patch set:
- Only affected files
- Preserves unchanged areas
- Tracks semantic changes

### 5. Apply (if not --dry-run)

- Atomic update via reducers
- Incremental genome update
- State persistence

## Metrics Tracked

| Metric | Description |
|--------|-------------|
| `genomeSize` | Total genome bytes |
| `patternCoverage` | Files with patterns / total files |
| `flowCompleteness` | Files with flows / total files |
| `semanticDensity` | Unique hashes / total files |
| `twinRatio` | Semantic twins / total files |
| `dependencyCount` | Number of dependencies |

## Example Output

```
Refreshing: lib/palace.js
  Mode: Ripple (updating related files)

✓ Refresh complete
  Duration: 45ms
  Targets: 1
  Affected: 3 files
  Changes: 4

📊 Metrics:
  genomeSize: 122.00 → 87.00 ↓28.69%
  patternCoverage: 0.42 → 0.58 ↑38%
  flowCompleteness: 0.85 → 0.85 ↑0%
  semanticDensity: 0.91 → 0.95 ↑4%

💡 Recommendations:
  • New patterns detected - review pattern library for duplicates

🔗 Affected files (ripple):
  • lib/genome.js
  • lib/reconstructor.js
  • lib/index.js
```

## Architecture

The refresh system uses three design patterns:

### Rust_Search: Parallel Scanning

```javascript
const scanner = new ParallelScanner(poolSize);
await scanner.scanFiles(files, options);
```

### SpacetimeDB: Atomic Reducers

```javascript
const newState = reduceFileChange(state, {
  type: 'FILE_MODIFIED',
  path: '/src/api.js',
  content: newContent,
  oldContent: oldContent
});
```

### prompt-optimizer: Metric-Driven

```javascript
const analyzer = new RefreshAnalyzer(state);
const analysis = analyzer.analyze(target);
// Returns: metrics, recommendations, affectedFiles
```

## See Also

- [Palace](./Palace.md) - Main orchestrator
- [Scanner-Parallel](./Scanner-Parallel.md) - Parallel scanning
- [State-Reducer](./State-Reducer.md) - Atomic reducers
