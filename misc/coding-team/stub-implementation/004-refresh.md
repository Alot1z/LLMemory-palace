# Task: Implement Refresh Module

**Context:** `lib/refresh.js` is a stub. Needs to coordinate incremental updates.

**Scope:** `lib/refresh.js`, `tests/unit/refresh.test.mjs`

**Dependencies:** Uses `RefreshAnalyzer` from task 003.

**Acceptance:**
- `refresh(filePath, options)` analyzes and updates affected files
- `analyze(filePath)` delegates to RefreshAnalyzer
- Returns `{ success, updated, skipped, errors }`
- Unit test with mock palace
