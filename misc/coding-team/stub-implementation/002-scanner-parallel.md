# Task: Implement ScannerParallel

**Context:** `lib/scanner-parallel.js` wraps single-threaded Scanner. No actual parallelism.

**Scope:** `lib/scanner-parallel.js`, `tests/unit/scanner-parallel.test.mjs`

**Objective:** Use Node.js `worker_threads` to scan files in parallel.

**Non-goals:** No external process spawning, no cluster mode.

**Acceptance:**
- Uses `worker_threads` with configurable `workerCount` (default: CPU cores - 1)
- Parallel `scanFiles(files)` splits work across workers
- Falls back gracefully if workers unavailable
- Unit test with 10+ files
