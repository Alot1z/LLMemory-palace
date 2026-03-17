# Task: Streaming/Chunking

**Scope:**
- `lib/streaming/large-file-handler.js`
- `lib/streaming/chunk-processor.js` (enhance existing)
- `tests/unit/streaming.test.mjs`

**Acceptance:**
- Handle files >100MB without OOM
- Stream processing with backpressure
- Chunked palace export for large codebases
- Progress callbacks
