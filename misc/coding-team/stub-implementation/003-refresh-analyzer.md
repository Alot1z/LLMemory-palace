# Task: Implement RefreshAnalyzer

**Context:** `lib/refresh-analyzer.js` returns empty results. No dependency analysis.

**Scope:** `lib/refresh-analyzer.js`, `tests/unit/refresh-analyzer.test.mjs`

**Objective:** Analyze file changes and compute ripple effects via import graph.

**Acceptance:**
- `analyze(filePath)` returns: `{ file, changes, rippleEffects, impactedFiles }`
- `findRelated(filePath)` returns files that import the changed file
- Parses ES imports: `import`, `require`, `export from`
- Unit test with mock import graph
